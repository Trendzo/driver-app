// Maps a backend delivery payload (/driver/deliveries) to the app's `Order` shape.
// Money is converted paise → whole rupees here so the existing screens (which render
// `₹{codAmount}`) need no change. Coordinates fall back to {0,0}; screens use the address
// string for the maps deep-link when coords are missing.
import type { BackendDelivery, BackendReversePickup } from './index';
import type { DeliveryMethod, ItemPolicy, Order, OrderState } from '../data/mockData';

const METHOD: Record<string, DeliveryMethod> = {
  express: 'EXPRESS',
  standard: 'STANDARD',
  try_and_buy: 'TRY_AND_BUY',
};

const POLICY: Record<string, ItemPolicy> = {
  return: 'RETURN',
  replace: 'REPLACE',
  final_sale: 'FINAL',
};

const TARGET_MIN: Record<DeliveryMethod, number> = {
  EXPRESS: 60,
  STANDARD: 240,
  TRY_AND_BUY: 30,
  REVERSE_PICKUP: 45,
};

function joinAddr(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(', ');
}

export function toOrder(d: BackendDelivery): Order {
  const method: DeliveryMethod = METHOD[d.deliveryMethod] ?? 'STANDARD';
  const isCod = d.paymentMethod === 'cod';
  const codPaise = d.codCollectedPaise > 0 ? d.codCollectedPaise : isCod ? d.grandTotalPaise : 0;

  return {
    id: d.id,
    method,
    state: d.status as OrderState,
    payment: isCod ? 'COD' : 'PREPAID',
    codAmount: Math.round(codPaise / 100),
    targetMin: TARGET_MIN[method],
    placedAt: d.placedAt,
    store: {
      name: d.storeNameSnap,
      addr: d.storeAddressSnap ?? '',
      phone: d.store?.contactPhone ?? '',
      coord: { latitude: d.store?.lat ?? 0, longitude: d.store?.lng ?? 0 },
      distanceKm: 0,
    },
    customer: {
      name: d.consumerNameSnap,
      addr: joinAddr(d.addressLine1Snap, d.addressLine2Snap, d.addressCitySnap, d.addressPincodeSnap),
      phone: d.consumerPhoneSnap,
      coord: { latitude: d.addressLatSnap ?? 0, longitude: d.addressLngSnap ?? 0 },
      distanceKm: 0,
    },
    items: d.items.map((it) => ({
      id: it.id,
      name: it.listingNameSnap,
      qty: it.qty,
      note: it.attributesLabelSnap ?? undefined,
      policy: POLICY[it.listingPolicySnap] ?? 'RETURN',
    })),
  };
}

/** The store→driver handoff code to display while `packed` (not part of the Order shape). */
export function handoffCodeOf(d: BackendDelivery): string | null {
  return d.agentHandoffCode ?? null;
}

// Reverse task lifecycle → the app's REVERSE_PICKUP track states
// (out_for_delivery = heading to the customer, returning_to_store = goods
// collected and riding back, returned_to_store = handed to the store).
const REVERSE_STATE: Record<string, OrderState> = {
  pending: 'out_for_delivery',
  assigned: 'out_for_delivery',
  collected: 'returning_to_store',
  delivered_to_store: 'returned_to_store',
};

/** Maps a reverse-pickup task to the app's `Order` shape (Returns tab). */
export function toReverseOrder(t: BackendReversePickup): Order {
  return {
    id: t.id,
    method: 'REVERSE_PICKUP',
    state: REVERSE_STATE[t.status] ?? 'out_for_delivery',
    payment: 'PREPAID',
    codAmount: 0,
    targetMin: TARGET_MIN.REVERSE_PICKUP,
    placedAt: t.createdAt,
    pickupItem: t.itemsLabel,
    store: {
      name: t.order.storeNameSnap,
      addr: t.order.storeAddressSnap ?? '',
      phone: t.order.store?.contactPhone ?? '',
      coord: { latitude: t.order.store?.lat ?? 0, longitude: t.order.store?.lng ?? 0 },
      distanceKm: 0,
    },
    customer: {
      name: t.order.consumerNameSnap,
      addr: joinAddr(t.addressLine1, t.addressLine2, t.addressCity, t.addressPincode),
      phone: t.order.consumerPhoneSnap,
      coord: { latitude: t.addressLat ?? 0, longitude: t.addressLng ?? 0 },
      distanceKm: 0,
    },
    items: [{ id: t.returnIds[0] ?? 'return', name: t.itemsLabel, qty: 1, policy: 'RETURN' }],
  };
}

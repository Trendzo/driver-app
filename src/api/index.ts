// Typed endpoint functions for the ClosetX driver backend (/driver/*, /auth/driver/*).
import { API_URL } from '../config/env';
import { apiGet, apiPatch, apiPost, apiUpload } from './client';

export type BackendDeliveryItem = {
  id: string;
  listingNameSnap: string;
  attributesLabelSnap: string | null;
  qty: number;
  listingId: string;
  listingPolicySnap: 'return' | 'replace' | 'final_sale' | string;
};

export type BackendDelivery = {
  id: string;
  status: string;
  deliveryMethod: 'express' | 'standard' | 'pickup' | 'try_and_buy' | string;
  paymentMethod: string;
  grandTotalPaise: number;
  codCollectedPaise: number;
  storeNameSnap: string;
  storeAddressSnap: string | null;
  consumerNameSnap: string;
  consumerPhoneSnap: string;
  addressLine1Snap: string | null;
  addressLine2Snap: string | null;
  addressCitySnap: string | null;
  addressPincodeSnap: string | null;
  addressLatSnap: number | null;
  addressLngSnap: number | null;
  doorWindowExpiresAt: string | null;
  placedAt: string;
  agentHandoffCode: string | null;
  store: { lat: number | null; lng: number | null; contactPhone: string | null } | null;
  items: BackendDeliveryItem[];
};

export type DriverProfile = {
  id: string;
  phone: string;
  name: string | null;
  avatarUrl: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  city: string | null;
  status: string;
  createdAt?: string;
  profileComplete?: boolean;
};

export type EarningsSummary = {
  today: { earningsPaise: number; deliveries: number; codCollectedPaise: number };
  week: { earningsPaise: number; deliveries: number; days: number };
};

/** Reverse pickup task — collect a consumer's return from home, bring to store. */
export type BackendReversePickup = {
  id: string;
  orderId: string;
  returnIds: string[];
  status: 'pending' | 'assigned' | 'collected' | 'delivered_to_store' | 'cancelled' | string;
  addressLine1: string;
  addressLine2: string | null;
  addressCity: string | null;
  addressPincode: string | null;
  addressLat: number | null;
  addressLng: number | null;
  itemsLabel: string;
  collectedPhotos: string[];
  createdAt: string;
  assignedAt: string | null;
  collectedAt: string | null;
  deliveredAt: string | null;
  order: {
    consumerNameSnap: string;
    consumerPhoneSnap: string;
    storeNameSnap: string;
    storeAddressSnap: string | null;
    store: { lat: number | null; lng: number | null; contactPhone: string | null } | null;
  };
};

export type DoorItemDecision = {
  orderItemId: string;
  decision: 'kept' | 'returned' | 'refused' | 'return_rejected';
  reason?: string;
  photos?: string[];
};

/* ── Auth ─────────────────────────────────────────────────────────────── */
export function driverOtpLogin(accessToken: string) {
  return apiPost<{ token: string; driver: DriverProfile; isNew: boolean }>(
    '/auth/driver/otp/msg91',
    { accessToken },
  );
}

/* ── Broadcast offers ─────────────────────────────────────────────────── */
export const listOffers = () => apiGet<BackendDelivery[]>('/driver/offers');
/** Long-poll — the request parks server-side until an offer appears or `waitMs` elapse. */
export const longPollOffers = (waitMs = 25000) =>
  apiGet<BackendDelivery[]>(`/driver/offers/long-poll?wait=${waitMs}`);
export const acceptOffer = (id: string) =>
  apiPost<{ orderId: string; accepted: boolean }>(`/driver/offers/${id}/accept`);
export const rejectOffer = (id: string) =>
  apiPost<{ orderId: string; rejected: boolean }>(`/driver/offers/${id}/reject`);

/* ── Deliveries ───────────────────────────────────────────────────────── */
export const listDeliveries = () => apiGet<BackendDelivery[]>('/driver/deliveries');
export const getDelivery = (id: string) => apiGet<BackendDelivery>(`/driver/deliveries/${id}`);
export const departDelivery = (id: string) => apiPost(`/driver/deliveries/${id}/depart`);
export const deliverOrder = (
  id: string,
  body: { otp?: string; note?: string; proofPhotos?: string[]; signatureUrl?: string; codCollectedPaise?: number },
) => apiPost(`/driver/deliveries/${id}/deliver`, body);
export const doorOpen = (id: string) => apiPost(`/driver/deliveries/${id}/door/open`);
export const doorExtend = (id: string, reason?: string) =>
  apiPost(`/driver/deliveries/${id}/door/extend`, reason ? { reason } : {});
export const doorClose = (id: string, items: DoorItemDecision[], otp?: string) =>
  apiPost(`/driver/deliveries/${id}/door/close`, otp ? { items, otp } : { items });
export const markUndelivered = (id: string, reason: string, photos?: string[]) =>
  apiPost(`/driver/deliveries/${id}/undelivered`, photos ? { reason, photos } : { reason });
export const returnToStore = (id: string) => apiPost(`/driver/deliveries/${id}/return`);
export const markReturned = (id: string) => apiPost(`/driver/deliveries/${id}/returned`);

/* ── Reverse pickups (collect a return from the customer's home) ──────── */
/** Tasks assigned to me that are still in motion (assigned | collected). */
export const listReversePickups = () => apiGet<BackendReversePickup[]>('/driver/reverse-pickups');
/** Broadcast pool — pending, unassigned tasks any driver can claim. */
export const listReversePickupOffers = () =>
  apiGet<BackendReversePickup[]>('/driver/reverse-pickups/offers');
export const acceptReversePickup = (id: string) =>
  apiPost<{ reversePickupId: string; accepted: boolean }>(`/driver/reverse-pickups/${id}/accept`);
export const rejectReversePickup = (id: string) =>
  apiPost<{ reversePickupId: string; rejected: boolean }>(`/driver/reverse-pickups/${id}/reject`);
/** Collected at the door — consumer-spoken OTP + ≥1 photo of the goods. */
export const collectReversePickup = (
  id: string,
  body: { otp?: string; photos: string[]; note?: string },
) => apiPost(`/driver/reverse-pickups/${id}/collect`, body);
/** Handed to the store — starts the store's verification window. */
export const deliverReversePickupToStore = (id: string) =>
  apiPost(`/driver/reverse-pickups/${id}/deliver-to-store`);

/* ── Location / earnings / profile ────────────────────────────────────── */
export const pingLocation = (lat: number, lng: number) => apiPost('/driver/location', { lat, lng });
export const earningsSummary = () => apiGet<EarningsSummary>('/driver/earnings/summary');
export const getProfile = () => apiGet<DriverProfile>('/driver/profile');
export const updateProfile = (patch: Partial<Omit<DriverProfile, 'id' | 'phone' | 'status'>>) =>
  apiPatch<DriverProfile>('/driver/profile', patch);

/* ── Media ────────────────────────────────────────────────────────────── */
/** Upload a captured photo (RN file uri) to Cloudinary; returns the hosted URL. */
export async function uploadPhoto(uri: string, folder = 'driver-proofs'): Promise<string> {
  const form = new FormData();
  const name = uri.split('/').pop() || 'photo.jpg';
  // RN FormData file shape.
  form.append('file', { uri, name, type: 'image/jpeg' } as unknown as Blob);
  const res = await apiUpload<{ url: string }>(`/uploads?folder=${encodeURIComponent(folder)}`, form);
  return res.url;
}

export { API_URL };

// Trendzo Delivery (Agent App) — mock data.
// In production these come from the Trendzo dispatch backend. Here they drive a
// fully clickable demo of every delivery method + flow described in the spec.
//
// The agent is IN-HOUSE and EMPLOYED — there is no "go online" / accept / reject.
// Orders are ASSIGNED to the agent (zone-based) and simply appear in the queue.

export type LatLng = { latitude: number; longitude: number };

// ─── DELIVERY METHODS ──────────────────────────────────────
// The agent handles 3 forward methods + reverse pickups. (Pickup — customer
// collects from store — is NOT an agent job and never appears here.)
export type DeliveryMethod = 'EXPRESS' | 'STANDARD' | 'TRY_AND_BUY' | 'REVERSE_PICKUP';

export const METHOD_LABEL: Record<DeliveryMethod, string> = {
  EXPRESS: 'Express',
  STANDARD: 'Standard',
  TRY_AND_BUY: 'Try & Buy',
  REVERSE_PICKUP: 'Reverse Pickup',
};

// Short tag shown on the delivery card badge.
export const METHOD_TAG: Record<DeliveryMethod, string> = {
  EXPRESS: 'EXPRESS · 60 MIN',
  STANDARD: 'STANDARD',
  TRY_AND_BUY: 'TRY & BUY · PREPAID',
  REVERSE_PICKUP: 'RETURN PICKUP',
};

// ─── ORDER STATES (the real Trendzo underlying states) ─────
export type OrderState =
  | 'packed'              // Ready for pickup at store
  | 'picked_up'           // Picked up
  | 'out_for_delivery'    // Out for delivery
  | 'at_door'             // At customer's door (Try-and-Buy)
  | 'delivered'           // Delivered ✓
  | 'undelivered'         // Couldn't deliver — retry
  | 'returning_to_store'  // Returning to store
  | 'returned_to_store';  // Handed back to store ✓

// Plain-language labels shown to the agent (never the raw state).
export const STATE_LABEL: Record<OrderState, string> = {
  packed: 'Ready for pickup at store',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  at_door: "At customer's door",
  delivered: 'Delivered',
  undelivered: "Couldn't deliver — retry",
  returning_to_store: 'Returning to store',
  returned_to_store: 'Handed back to store',
};

// ─── ITEM POLICY BADGES (read BEFORE deciding a return) ────
export type ItemPolicy = 'RETURN' | 'REPLACE' | 'FINAL';
export const POLICY_LABEL: Record<ItemPolicy, string> = {
  RETURN: 'Return ok',
  REPLACE: 'Replace only',
  FINAL: 'Final sale',
};

// Per-item decision made at the Try-and-Buy door.
export type DoorDecision = 'pending' | 'kept' | 'returned' | 'refused' | 'store_decides';

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  note?: string;
  policy: ItemPolicy;
};

export type Payment = 'PREPAID' | 'COD';

export type Order = {
  id: string;
  method: DeliveryMethod;
  state: OrderState;
  payment: Payment;
  codAmount: number;        // cash to collect if COD, else 0 (always 0 for Try-and-Buy)
  store: { name: string; addr: string; phone: string; coord: LatLng; distanceKm: number };
  customer: { name: string; addr: string; landmark?: string; phone: string; coord: LatLng; distanceKm: number };
  items: OrderItem[];
  // For REVERSE_PICKUP: the single item to collect from the customer.
  pickupItem?: string;
  // minutes target for the headline timer on the delivery card
  targetMin: number;
  // ISO timestamp the order was placed — used to sort the deliveries list (newest first).
  placedAt?: string;
};

// ─── TRACK POINTS — progress steps differ PER delivery method ──
// Drives the progress tracker on each active-delivery card.
export const TRACK_POINTS: Record<DeliveryMethod, { state: OrderState; label: string }[]> = {
  EXPRESS: [
    { state: 'packed', label: 'Pickup' },
    { state: 'picked_up', label: 'Picked' },
    { state: 'out_for_delivery', label: 'On way' },
    { state: 'delivered', label: 'Delivered' },
  ],
  STANDARD: [
    { state: 'packed', label: 'Pickup' },
    { state: 'picked_up', label: 'Picked' },
    { state: 'out_for_delivery', label: 'On way' },
    { state: 'delivered', label: 'Delivered' },
  ],
  TRY_AND_BUY: [
    { state: 'packed', label: 'Pickup' },
    { state: 'picked_up', label: 'Picked' },
    { state: 'out_for_delivery', label: 'On way' },
    { state: 'at_door', label: 'At door' },
    { state: 'delivered', label: 'Closed' },
  ],
  REVERSE_PICKUP: [
    { state: 'out_for_delivery', label: 'To customer' },
    { state: 'returning_to_store', label: 'Collected' },
    { state: 'returned_to_store', label: 'Handed back' },
  ],
};

// Reason pick-lists (no free text — principle #2 in the spec).
export const UNDELIVERED_REASONS = [
  'Customer not answering',
  'Customer not at address',
  'Wrong / incomplete address',
  'Customer asked to reschedule',
  'Area not reachable',
];
export const RETURN_INSPECT_REASONS = [
  'Looks worn / soiled',
  'Tag missing / tampered',
  'Different item (possible swap)',
  'Damaged / defective',
  'Replace-only — no door return',
];

// ─── AGENT (the logged-in delivery person) ─────────────────
export const AGENT = {
  name: 'Ravi Kumar',
  phone: '+91 98200 12345',
  id: 'TZ-AGENT-204',
  zone: 'Vijay Nagar Zone',
  shift: '11:00 AM – 7:00 PM',
  vehicle: 'Honda Activa · MP 09 BK 4471',
  joinedOn: 'Aug 2024',
  docsVerified: true,
  rating: 4.9,
  ratingCount: 1284,
  tripsAllTime: 3120,
};

// ─── TODAY (read-only counters shown on Home / Profile) ────
export const TODAY = {
  delivered: 6,
  pending: 3,
  kmLogged: 24.6,
  codCollected: 0,   // running total starts at 0; grows as COD orders close
  earnings: 742,     // ₹ earned today (base + incentives)
  tips: 60,          // ₹ tips today
  onTimePct: 96,
  acceptancePct: 98,
  hoursOnline: 5.4,
};

// ─── THIS WEEK (rolling 7-day summary) ─────────────────────
export const WEEK = {
  earnings: 4820,
  deliveries: 41,
  days: 6,
};

// ─── ASSIGNED ORDERS (the agent's queue for today) ─────────
// A live mix: forward deliveries (Express / Standard / Try-and-Buy) shown on the
// Deliveries tab, and reverse pickups shown on the Returns tab.
export const ASSIGNED_ORDERS: Order[] = [
  {
    id: 'TZ58420',
    method: 'EXPRESS',
    state: 'packed',
    payment: 'COD',
    codAmount: 1840,
    targetMin: 60,
    store: { name: 'H&M · Phoenix Citadel', addr: 'Phoenix Citadel Mall, Vijay Nagar', phone: '+919000011111', distanceKm: 1.2, coord: { latitude: 22.7515, longitude: 75.8950 } },
    customer: { name: 'Aarav Sharma', addr: 'B-1204, Silver Springs, Scheme 54', landmark: 'Near Satya Sai Square', phone: '+919876543210', distanceKm: 2.2, coord: { latitude: 22.7560, longitude: 75.8985 } },
    items: [
      { id: 'i1', name: 'Oversized Cotton Tee', qty: 2, note: 'Black · L', policy: 'RETURN' },
      { id: 'i2', name: 'Slim Fit Jeans', qty: 1, note: 'Indigo · 32', policy: 'RETURN' },
      { id: 'i3', name: 'Crew Socks (3-pack)', qty: 1, policy: 'FINAL' },
    ],
  },
  {
    id: 'TZ58517',
    method: 'TRY_AND_BUY',
    state: 'packed',
    payment: 'PREPAID',
    codAmount: 0,
    targetMin: 30,
    store: { name: 'Zara · Treasure Island', addr: 'Treasure Island Mall, MG Road', phone: '+919000022222', distanceKm: 0.9, coord: { latitude: 22.7240, longitude: 75.8830 } },
    customer: { name: 'Neha Gupta', addr: 'A-302, Sapphire Park, Bhawarkua', landmark: 'Near Bhawarkua Square', phone: '+919876511111', distanceKm: 1.6, coord: { latitude: 22.6855, longitude: 75.8700 } },
    items: [
      { id: 'i1', name: 'Floral Wrap Dress', qty: 1, note: 'Maroon · M', policy: 'RETURN' },
      { id: 'i2', name: 'High-Rise Trousers', qty: 1, note: 'Beige · 28', policy: 'RETURN' },
      { id: 'i3', name: 'Knit Crop Top', qty: 1, note: 'Olive · S', policy: 'REPLACE' },
      { id: 'i4', name: 'Embellished Heels', qty: 1, note: 'Gold · UK 5', policy: 'FINAL' },
    ],
  },
  {
    id: 'TZ58492',
    method: 'STANDARD',
    state: 'packed',
    payment: 'PREPAID',
    codAmount: 0,
    targetMin: 240,
    store: { name: 'Max · C21 Mall', addr: 'C21 Mall, AB Road', phone: '+919000033333', distanceKm: 2.0, coord: { latitude: 22.6935, longitude: 75.8650 } },
    customer: { name: 'Imran Khan', addr: 'C-77, Pearl Residency, Palasia', landmark: 'Above HDFC Bank', phone: '+919876522222', distanceKm: 1.1, coord: { latitude: 22.7280, longitude: 75.8810 } },
    items: [
      { id: 'i1', name: 'Formal Cotton Shirt', qty: 2, note: 'Sky blue · 40', policy: 'RETURN' },
      { id: 'i2', name: 'Chino Trousers', qty: 1, note: 'Khaki · 34', policy: 'RETURN' },
    ],
  },
  // ── Reverse pickups (Returns tab) ──
  {
    id: 'TZ58360',
    method: 'REVERSE_PICKUP',
    state: 'out_for_delivery',
    payment: 'PREPAID',
    codAmount: 0,
    targetMin: 45,
    pickupItem: 'Denim Jacket · Washed blue · L',
    store: { name: 'Nike · C21 Mall', addr: 'C21 Mall, AB Road', phone: '+919000044444', distanceKm: 2.4, coord: { latitude: 22.6935, longitude: 75.8650 } },
    customer: { name: 'Sara Mathew', addr: 'D-12, Rose Villa, South Tukoganj', landmark: 'Near Sapna Sangeeta', phone: '+919876533333', distanceKm: 1.8, coord: { latitude: 22.7050, longitude: 75.8770 } },
    items: [
      { id: 'i1', name: 'Denim Jacket', qty: 1, note: 'Washed blue · L · RETURN', policy: 'RETURN' },
    ],
  },
];

// ─── HELP / FAQ (Profile) ──────────────────────────────────
export type Faq = { q: string; a: string };
export const FAQS: Faq[] = [
  { q: 'How do I get my orders?', a: 'Orders for your assigned zone appear automatically on the Deliveries tab. You do not accept or reject — every order in your queue is yours to complete.' },
  { q: 'Can I collect cash on a Try & Buy order?', a: 'No. Try & Buy is always prepaid. The app will never ask you for cash on these orders. Only Express and Standard can be COD.' },
  { q: 'What if the customer is not home?', a: 'Tap "Call customer". If still no answer, tap "Couldn\'t deliver", take a photo of the location, and the order is logged as undelivered. You get one retry.' },
  { q: 'Who decides refunds on returns?', a: 'The store does. You only record what came back at the door and bring the items in. Never tell a customer they are refunded.' },
  { q: 'When do I deposit COD cash?', a: 'At the end of your shift (7 PM), go to the Trendzo office and tap "Deposit cash" on your Profile. No cash stays with you overnight.' },
];

export const ESCALATION = [
  { icon: 'phone-call', label: 'Dispatch / Ops desk', sub: 'Order & routing help', tel: '+918000000111' },
  { icon: 'alert-triangle', label: 'Report a problem', sub: 'Damage, dispute, accident', tel: '+918000000222' },
  { icon: 'shield', label: 'Trendzo Safety', sub: '24×7 helpline', tel: '+918000000333' },
];

// ─── DOCUMENTS (Profile) ───────────────────────────────────
export type DocItem = { icon: any; name: string; sub: string; status: 'VERIFIED' | 'EXPIRING' | 'PENDING' };
export const DOCUMENTS: DocItem[] = [
  { icon: 'credit-card', name: 'Driving Licence', sub: 'MP09 2019 0034 2211', status: 'VERIFIED' },
  { icon: 'file-text', name: 'Vehicle RC', sub: 'MP 09 BK 4471', status: 'VERIFIED' },
  { icon: 'shield', name: 'Insurance', sub: 'Expires 12 Aug 2026', status: 'EXPIRING' },
  { icon: 'check-square', name: 'Aadhaar', sub: 'XXXX XXXX 4471', status: 'VERIFIED' },
];

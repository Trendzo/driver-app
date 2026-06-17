// Mock data for the Trendzo Partner (rider) app.
// In production these come from the dispatch backend; here they drive a fully
// clickable demo of the delivery lifecycle.

export type OrderItem = { name: string; qty: number; note?: string };

export type LatLng = { latitude: number; longitude: number };

export type DeliveryOrder = {
  id: string;
  // money the rider earns for THIS trip (not the order value)
  payout: number;
  tip: number;
  distanceKm: number;        // total trip distance
  etaMin: number;            // estimated minutes for the whole trip
  // rider's current position when the order is offered (for the map)
  rider: LatLng;
  // pickup (store / restaurant / dark store)
  store: {
    name: string;
    addr: string;
    phone: string;
    distanceKm: number;      // rider -> store
    coord: LatLng;
  };
  // drop (customer)
  customer: {
    name: string;
    addr: string;
    landmark?: string;
    phone: string;
    distanceKm: number;      // store -> customer
    coord: LatLng;
  };
  items: OrderItem[];
  // how the customer pays — COD means rider collects cash
  payment: 'PREPAID' | 'COD';
  codAmount: number;         // cash to collect if COD, else 0
  // 4-digit code the customer reads out to confirm handover
  otp: string;
};

// The order that pops as an incoming request on the Home screen.
export const INCOMING_ORDER: DeliveryOrder = {
  id: 'TZ58420',
  payout: 48,
  tip: 20,
  distanceKm: 3.4,
  etaMin: 22,
  rider: { latitude: 22.7250, longitude: 75.8890 },
  store: {
    name: 'H&M · Phoenix Citadel',
    addr: 'Phoenix Citadel Mall, Vijay Nagar, Indore',
    phone: '+91 90000 11111',
    distanceKm: 1.2,
    coord: { latitude: 22.7515, longitude: 75.8950 },
  },
  customer: {
    name: 'Aarav Sharma',
    addr: 'B-1204, Silver Springs, Scheme 54, Indore',
    landmark: 'Near Satya Sai Square',
    phone: '+91 98765 43210',
    distanceKm: 2.2,
    coord: { latitude: 22.7560, longitude: 75.8985 },
  },
  items: [
    { name: 'Oversized Cotton Tee', qty: 2, note: 'Black · size L' },
    { name: 'Slim Fit Jeans', qty: 1, note: 'Indigo · 32' },
    { name: 'Linen Casual Shirt', qty: 1, note: 'White · size M' },
    { name: 'Knit Pullover Hoodie', qty: 1, note: 'Grey · size L' },
    { name: 'Crew Socks (3-pack)', qty: 1 },
  ],
  payment: 'COD',
  codAmount: 1840,
  otp: '4827',
};

// A queue of follow-up orders so "go online" keeps feeling alive.
export const ORDER_QUEUE: DeliveryOrder[] = [
  INCOMING_ORDER,
  {
    id: 'TZ58517',
    payout: 36,
    tip: 0,
    distanceKm: 2.1,
    etaMin: 16,
    rider: { latitude: 22.6980, longitude: 75.8660 },
    store: { name: 'Nike · C21 Mall', addr: 'C21 Mall, AB Road, Indore', phone: '+91 90000 22222', distanceKm: 0.8, coord: { latitude: 22.6935, longitude: 75.8650 } },
    customer: { name: 'Neha Gupta', addr: 'A-302, Sapphire Park, Bhawarkua, Indore', landmark: 'Near Bhawarkua Square', phone: '+91 98765 11111', distanceKm: 1.3, coord: { latitude: 22.6855, longitude: 75.8700 } },
    items: [
      { name: 'Graphic Print T-Shirt', qty: 2, note: 'White · size M' },
      { name: 'Denim Jacket', qty: 1, note: 'Washed blue · size L' },
      { name: 'Canvas Sneakers', qty: 1, note: 'UK 9' },
    ],
    payment: 'PREPAID',
    codAmount: 0,
    otp: '7193',
  },
];

// ─── EARNINGS ──────────────────────────────────────────────
export type DayEarning = { day: string; trips: number; amount: number };

export const TODAY = {
  earnings: 642,
  trips: 11,
  onlineHours: 5.5,
  distanceKm: 38.4,
  acceptanceRate: 92,
  rating: 4.8,
};

export const WEEK_EARNINGS: DayEarning[] = [
  { day: 'MON', trips: 14, amount: 760 },
  { day: 'TUE', trips: 9, amount: 510 },
  { day: 'WED', trips: 16, amount: 880 },
  { day: 'THU', trips: 12, amount: 690 },
  { day: 'FRI', trips: 18, amount: 1020 },
  { day: 'SAT', trips: 21, amount: 1240 },
  { day: 'SUN', trips: 11, amount: 642 },
];

// Per-trip payout history.
export type TripRecord = { id: string; time: string; area: string; payout: number; tip: number; km: number };
export const RECENT_TRIPS: TripRecord[] = [
  { id: 'TZ58390', time: '2:14 PM', area: 'Vijay Nagar → Scheme 54', payout: 48, tip: 20, km: 3.4 },
  { id: 'TZ58361', time: '1:38 PM', area: 'C21 Mall → Bhawarkua', payout: 36, tip: 0, km: 2.1 },
  { id: 'TZ58344', time: '1:02 PM', area: 'Treasure Island → MG Road', payout: 52, tip: 15, km: 4.0 },
  { id: 'TZ58319', time: '12:25 PM', area: 'Rajwada → Sapna Sangeeta', payout: 61, tip: 30, km: 5.2 },
  { id: 'TZ58288', time: '11:47 AM', area: 'Palasia → Geeta Bhawan', payout: 33, tip: 0, km: 1.8 },
];

// Incentive / bonus targets — a core motivator in rider apps.
export type Incentive = { title: string; done: number; target: number; reward: number };
export const INCENTIVES: Incentive[] = [
  { title: 'Complete 15 trips today', done: 11, target: 15, reward: 120 },
  { title: 'Stay online 7 hours', done: 5, target: 7, reward: 80 },
  { title: 'Weekend warrior · 40 trips', done: 32, target: 40, reward: 300 },
];

// ─── RIDER PROFILE ─────────────────────────────────────────
export const RIDER = {
  name: 'Ravi Kumar',
  phone: '+91 98200 12345',
  id: 'TZ-RIDER-2048',
  vehicle: 'Honda Activa · MP 09 BK 4471',
  zone: 'Vijay Nagar – Palasia Zone',
  rating: 4.8,
  totalTrips: 1284,
  joinedOn: 'Aug 2024',
  docsVerified: true,
};

// ─── CHAT ──────────────────────────────────────────────────
export type ChatMsg = { id: string; from: 'rider' | 'them'; text: string; time: string };

// Seed conversation the customer "sent" before the rider opens chat.
export const CHAT_SEED: ChatMsg[] = [
  { id: 'c1', from: 'them', text: 'Hi, please call when you reach the gate', time: '2:02 PM' },
  { id: 'c2', from: 'them', text: 'Security will let you in, building B', time: '2:02 PM' },
];

// One-tap canned replies — riders rarely type while riding.
export const QUICK_REPLIES = [
  "I'm on the way",
  'Reaching in 5 minutes',
  "I'm at your location",
  'Please share exact address',
  'Order is picked up',
];

// Auto-reply the "customer" sends back, keyed loosely by what the rider taps.
export const AUTO_REPLY: Record<string, string> = {
  "I'm on the way": 'Great, thank you',
  'Reaching in 5 minutes': 'Okay, I am waiting downstairs',
  "I'm at your location": 'Coming out now',
  'Please share exact address': 'B-1204, Tower B, near the lift lobby',
  'Order is picked up': 'Perfect, see you soon',
};

// ─── SAFETY / SOS ──────────────────────────────────────────
export const SOS_ACTIONS = [
  { icon: 'phone-call', label: 'Call Police (100)', sub: 'Emergency helpline', tel: '100' },
  { icon: 'shield', label: 'Trendzo Safety Team', sub: '24×7 rider helpline', tel: '+918000000111' },
  { icon: 'alert-triangle', label: 'Report an accident', sub: 'Insurance & assistance', tel: '+918000000222' },
  { icon: 'user', label: 'Call emergency contact', sub: 'Priya (wife)', tel: '+919820011111' },
] as const;

// ─── VEHICLE ───────────────────────────────────────────────
export const VEHICLE = {
  type: 'Two-wheeler · Scooter',
  model: 'Honda Activa 6G',
  plate: 'MP 09 BK 4471',
  color: 'Black',
  year: '2022',
  fuel: 'Petrol',
  rcVerified: true,
};

// ─── DOCUMENTS ─────────────────────────────────────────────
export type DocItem = { icon: any; name: string; sub: string; status: 'VERIFIED' | 'EXPIRING' | 'PENDING' };
export const DOCUMENTS: DocItem[] = [
  { icon: 'credit-card', name: 'Driving Licence', sub: 'MP09 2019 0034 2211 · valid till 2032', status: 'VERIFIED' },
  { icon: 'file-text', name: 'Vehicle RC', sub: 'MP 09 BK 4471', status: 'VERIFIED' },
  { icon: 'shield', name: 'Insurance', sub: 'Expires 12 Aug 2026', status: 'EXPIRING' },
  { icon: 'user', name: 'PAN Card', sub: 'ABCXX1234X', status: 'VERIFIED' },
  { icon: 'check-square', name: 'Aadhaar', sub: 'XXXX XXXX 4471', status: 'VERIFIED' },
];

// ─── BANK / PAYOUTS ────────────────────────────────────────
export const BANK = {
  holder: 'Ravi Kumar',
  bank: 'HDFC Bank',
  account: 'XXXX XXXX 4471',
  ifsc: 'HDFC0001234',
  upi: 'ravikumar@okhdfc',
  schedule: 'Daily · before 11:00 AM',
  available: 1662,
};

// ─── HELP / FAQ ────────────────────────────────────────────
export type Faq = { q: string; a: string };
export const FAQS: Faq[] = [
  { q: 'How do I start getting orders?', a: 'Tap GO ONLINE on the home screen. Orders near you will arrive automatically. Make sure your location and internet are on.' },
  { q: 'When do I get paid?', a: 'Your earnings (base + tips + bonus) are paid to your bank account daily, before 11 AM the next day. You can also withdraw anytime from the Earn tab.' },
  { q: 'What if the customer is not reachable?', a: 'Call and chat from the delivery screen. If still unreachable after waiting, contact support from the SOS button and we will guide you.' },
  { q: 'How is the delivery fee calculated?', a: 'You earn a base amount per trip plus distance pay. 100% of customer tips are yours. Bonus targets add extra on top.' },
  { q: 'What if items are missing at the store?', a: 'Mark only the items you collected. Use chat to inform the customer, then contact store staff or support.' },
];

// ─── WORK ZONE HOTSPOTS ────────────────────────────────────
export const HOTSPOTS = [
  { name: 'Phoenix Citadel Mall', area: 'Vijay Nagar', demand: 'HIGH' },
  { name: 'C21 Mall', area: 'AB Road', demand: 'HIGH' },
  { name: 'Treasure Island Mall', area: 'MG Road', demand: 'MEDIUM' },
  { name: 'Sitlamata Bazaar', area: 'Rajwada', demand: 'MEDIUM' },
  { name: 'Sapna Sangeeta', area: 'South Tukoganj', demand: 'LOW' },
] as const;

// ─── HOW IT WORKS — steps ──────────────────────────────────
export const HOW_STEPS = [
  { icon: 'power', title: 'Go online', body: 'Tap the big GO ONLINE button. We start sending you nearby orders.' },
  { icon: 'check', title: 'Accept the order', body: 'See the payout, distance and pickup store. Slide to accept within 30 seconds.' },
  { icon: 'shopping-bag', title: 'Pick up the clothes', body: 'Ride to the store (H&M, Zara, Nike, local markets). Tick each item as you collect it.' },
  { icon: 'map-pin', title: 'Deliver to customer', body: 'Ride to the drop, collect cash if COD, take the OTP and a proof photo.' },
  { icon: 'credit-card', title: 'Get paid', body: 'Earnings add up instantly. Base + tips + bonuses are paid to your bank daily.' },
] as const;

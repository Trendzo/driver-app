// Backend base URL. Expo inlines EXPO_PUBLIC_* at build time; falls back to the shared
// hosted backend (same instance the retailer app points at).
export const API_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined)?.replace(/\/+$/, '') ??
  'https://backend-qpmx.onrender.com/api/v1';

// MSG91 phone-OTP widget. Reuses the SAME widget/account as the retailer app (identical
// WIDGET_ID + TOKEN_AUTH), so the backend verifies driver OTP tokens against the retailer
// MSG91 authkey. These are client-side widget identifiers (shipped in the bundle), not the
// server secret. Override per build via EXPO_PUBLIC_MSG91_* if a dedicated driver widget
// is provisioned later.
export const MSG91_WIDGET_ID =
  (process.env.EXPO_PUBLIC_MSG91_WIDGET_ID as string | undefined) ?? '3667636f3464353730373939';
export const MSG91_TOKEN_AUTH =
  (process.env.EXPO_PUBLIC_MSG91_TOKEN_AUTH as string | undefined) ?? '547225TSvi20QFa026a47d90aP1';

export const OTP_LENGTH = 4;

// Offers delivery: long-poll is primary for now. Flip to true (after an FCM-enabled build +
// the backend FIREBASE_SERVICE_ACCOUNT) to prefer push, with long-poll as the fallback.
export const USE_FCM_OFFERS = false;

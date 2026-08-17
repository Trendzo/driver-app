// Firebase Cloud Messaging for the driver app. Subscribes to the `driver-offers` topic;
// a data push from the backend fires `onOffersChanged` so the offers feed refreshes instantly.
//
// The native module is LAZY-loaded (require inside the functions, not a top-level import) so a
// build WITHOUT @react-native-firebase linked — Expo Go, or any build made before FCM was added —
// doesn't crash at startup. When FCM is unavailable, initFcm returns false → caller uses long-poll.

const OFFERS_TOPIC = 'driver-offers';
let unsubscribeOnMessage: (() => void) | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: any = undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMessaging(): any | null {
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      cached = require('@react-native-firebase/messaging').default;
    } catch {
      cached = null; // native module not in this build
    }
  }
  return cached;
}

/** Returns true if FCM is active (permission granted, token obtained, topic subscribed). */
export async function initFcm(onOffersChanged: () => void): Promise<boolean> {
  const messaging = getMessaging();
  if (!messaging) return false;
  try {
    const status = await messaging().requestPermission();
    const granted =
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL;
    if (!granted) return false;

    const token = await messaging().getToken();
    if (!token) return false;

    await messaging().subscribeToTopic(OFFERS_TOPIC);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unsubscribeOnMessage = messaging().onMessage(async (msg: any) => {
      if (msg?.data?.type === 'offers_changed') onOffersChanged();
    });
    return true;
  } catch {
    return false; // FCM unavailable → caller uses long-poll
  }
}

export async function teardownFcm(): Promise<void> {
  const messaging = getMessaging();
  try {
    if (unsubscribeOnMessage) {
      unsubscribeOnMessage();
      unsubscribeOnMessage = null;
    }
    if (messaging) await messaging().unsubscribeFromTopic(OFFERS_TOPIC);
  } catch {
    // ignore
  }
}

/**
 * Register this device's FCM token with the backend so it can receive TARGETED push
 * (e.g. a customer requested a return). Safe no-op when the native messaging module is
 * absent (Expo Go / a build without Firebase, like the current iOS build) or permission
 * is denied — the app still works via faster polling.
 */
export async function registerPushWithBackend(): Promise<void> {
  const messaging = getMessaging();
  if (!messaging) return;
  try {
    const status = await messaging().requestPermission();
    const granted =
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL;
    if (!granted) return;
    const token = await messaging().getToken();
    if (!token) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require('react-native');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const api = require('./api');
    await api.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android').catch(() => {});
  } catch {
    // messaging unavailable / not configured → no-op
  }
}

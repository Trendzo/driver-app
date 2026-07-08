import { registerRootComponent } from 'expo';

import App from './App';

// FCM background/quit-state data-message handler must be registered at the top level, before
// the app renders. Data-only "offers_changed" pings just wake the app; the offers feed is
// refreshed when it next foregrounds (safety poll) — so this handler only needs to resolve.
// Guarded so a non-FCM build (native module absent) doesn't crash at startup.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {});
} catch {
  // FCM not available in this build — long-poll fallback handles offers.
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

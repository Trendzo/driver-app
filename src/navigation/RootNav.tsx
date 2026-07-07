import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, BackHandler, ToastAndroid } from 'react-native';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme/brutal';
import { BrutalToast, BrutalConfirm } from '../components/Brutal';
import { useApp, isActive } from '../state/AppState';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen, { CompleteProfileScreen } from '../screens/AuthScreens';
import HomeScreen from '../screens/HomeScreen';
import DeliveriesScreen from '../screens/DeliveriesScreen';
import ReturnsScreen from '../screens/ReturnsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import DoorScreen from '../screens/DoorScreen';
import StoreHandoffScreen from '../screens/StoreHandoffScreen';
import ProofCameraScreen from '../screens/ProofCameraScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── FLOATING PILL TAB BAR — 3 tabs, sliding indicator (mockup style) ──
function PartnerTabBar({ state, navigation }: BottomTabBarProps) {
  const items: { name: string; label: string; icon: any }[] = [
    { name: 'HomeTab', label: 'Home', icon: 'home' },
    { name: 'DeliveriesTab', label: 'Deliveries', icon: 'package' },
    { name: 'ReturnsTab', label: 'Returns', icon: 'corner-up-left' },
    { name: 'ProfileTab', label: 'Profile', icon: 'user' },
  ];
  const insets = useSafeAreaInsets();
  const { orders } = useApp();
  const activeCount = orders.filter(o => o.method !== 'REVERSE_PICKUP' && isActive(o)).length;
  const returnCount = orders.filter(o => (o.method === 'REVERSE_PICKUP' && isActive(o)) || o.state === 'returning_to_store').length;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: (insets.bottom > 0 ? insets.bottom : 10) + 8 }]}>
      <View style={styles.bar}>
        {items.map((it, i) => {
          const active = state.index === i;
          const tint = active ? C.ink : C.faint;
          const badge = it.name === 'DeliveriesTab' ? activeCount : it.name === 'ReturnsTab' ? returnCount : 0;
          return (
            <Pressable key={it.name} onPress={() => navigation.navigate(it.name)} style={styles.btn}>
              <View style={styles.iconWrap}>
                <Feather name={it.icon} size={20} color={tint} />
                {badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={{ color: C.white, fontFamily: 'Inter_700Bold', fontSize: 10 }}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.lbl, { color: tint }]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 3 },
  iconWrap: { width: 36, height: 24, alignItems: 'center', justifyContent: 'center' },
  lbl: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  badge: { position: 'absolute', top: -4, right: 0, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink },
});

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <PartnerTabBar {...props} />} screenOptions={{ headerShown: false }} backBehavior="initialRoute">
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="DeliveriesTab" component={DeliveriesScreen} />
      <Tab.Screen name="ReturnsTab" component={ReturnsScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const navigationRef = createNavigationContainerRef<any>();

type Phase = 'splash' | 'onboarding' | 'main';

export default function RootNav() {
  const [phase, setPhase] = useState<Phase>('splash');
  const { token, signupMode, onboarded, setOnboarded, toast, hideToast, confirm, hideConfirm, night } = useApp();
  const lastBack = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const nav = navigationRef.current;
      if (!nav || !nav.isReady()) return false;
      if (nav.canGoBack()) { nav.goBack(); return true; }
      const now = Date.now();
      if (now - lastBack.current < 2000) return false;
      lastBack.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, []);

  if (phase === 'splash') {
    return <SplashScreen onDone={() => setPhase(onboarded ? 'main' : 'onboarding')} />;
  }
  if (phase === 'onboarding') {
    return <OnboardingScreen onDone={() => { setOnboarded(true); setPhase('main'); }} />;
  }
  if (!token) {
    return (
      <View key={night ? 'd' : 'l'} style={{ flex: 1, backgroundColor: C.bg }}>
        <AuthScreen />
        <BrutalToast toast={toast} onHide={hideToast} />
        <BrutalConfirm confirm={confirm} onHide={hideConfirm} />
      </View>
    );
  }
  // Signed in but brand-new account → complete the signup profile before the app.
  if (signupMode) {
    return (
      <View key={night ? 'd' : 'l'} style={{ flex: 1, backgroundColor: C.bg }}>
        <CompleteProfileScreen />
        <BrutalToast toast={toast} onHide={hideToast} />
        <BrutalConfirm confirm={confirm} onHide={hideConfirm} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <NavigationContainer ref={navigationRef} theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, card: C.bg, text: C.ink, border: C.hairline } }}>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="Tabs" component={MainTabs} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="Door" component={DoorScreen} options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="StoreHandoff" component={StoreHandoffScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="ProofCamera" component={ProofCameraScreen} options={{ animation: 'slide_from_bottom' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <BrutalToast toast={toast} onHide={hideToast} />
      <BrutalConfirm confirm={confirm} onHide={hideConfirm} />
    </View>
  );
}

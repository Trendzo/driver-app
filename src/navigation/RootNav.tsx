import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, BackHandler, ToastAndroid, LayoutChangeEvent } from 'react-native';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence } from 'react-native-reanimated';
import { C } from '../theme/brutal';
import { BrutalToast, BrutalConfirm } from '../components/Brutal';
import { useApp, isActive } from '../state/AppState';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreens';
import DeliveriesScreen from '../screens/DeliveriesScreen';
import ReturnsScreen from '../screens/ReturnsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import DoorScreen from '../screens/DoorScreen';
import StoreHandoffScreen from '../screens/StoreHandoffScreen';
import ProofCameraScreen from '../screens/ProofCameraScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── COMPACT TAB BAR — 3 tabs, sliding blob indicator (matches consumer app) ──
function PartnerTabBar({ state, navigation }: BottomTabBarProps) {
  const items: { name: string; label: string; icon: any }[] = [
    { name: 'DeliveriesTab', label: 'DELIVERIES', icon: 'package' },
    { name: 'ReturnsTab', label: 'RETURNS', icon: 'corner-up-left' },
    { name: 'ProfileTab', label: 'PROFILE', icon: 'user' },
  ];
  const insets = useSafeAreaInsets();
  const { orders } = useApp();
  // count of in-progress forward deliveries (badge on the Deliveries tab)
  const activeCount = orders.filter(o => o.method !== 'REVERSE_PICKUP' && isActive(o)).length;
  const returnCount = orders.filter(o => (o.method === 'REVERSE_PICKUP' && isActive(o)) || o.state === 'returning_to_store').length;

  const PILL_W = 60, PILL_H = 44, H_PAD = 6;
  const [innerW, setInnerW] = useState(0);
  const itemW = innerW > 0 ? (innerW - H_PAD * 2) / items.length : 0;
  const tx = useSharedValue(0);
  const sx = useSharedValue(1);

  useEffect(() => {
    if (!itemW) return;
    const target = H_PAD + itemW * state.index + (itemW - PILL_W) / 2;
    sx.value = withSequence(withTiming(1.6, { duration: 140 }), withSpring(1, { damping: 12, stiffness: 180 }));
    tx.value = withSpring(target, { damping: 15, stiffness: 130 });
  }, [state.index, itemW]);

  const blobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { scaleX: sx.value }] }));

  return (
    <View style={[styles.wrap, { backgroundColor: C.white, paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
      <View style={{ height: 1, backgroundColor: C.ink }} />
      <View style={styles.inner} onLayout={(e: LayoutChangeEvent) => setInnerW(e.nativeEvent.layout.width)}>
        {innerW > 0 && (
          <Animated.View pointerEvents="none" style={[styles.blob, { width: PILL_W, height: PILL_H, backgroundColor: C.ink }, blobStyle]} />
        )}
        {items.map((it, i) => {
          const active = state.index === i;
          const badge = it.name === 'DeliveriesTab' ? activeCount : it.name === 'ReturnsTab' ? returnCount : 0;
          return (
            <Pressable key={it.name} onPress={() => navigation.navigate(it.name)} style={styles.btn}>
              <View style={styles.iconWrap}>
                <Feather name={it.icon} size={20} color={active ? C.white : C.ink} />
                {badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: active ? C.white : C.ink, borderColor: active ? C.ink : C.white }]}>
                    <Text style={{ color: active ? C.ink : C.white, fontFamily: 'Inter_900Black', fontSize: 11 }}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.lbl, { color: active ? C.white : C.dim, fontFamily: active ? 'Inter_900Black' : 'SpaceMono_700Bold' }]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  inner: { flexDirection: 'row', paddingTop: 8, paddingHorizontal: 6, position: 'relative' },
  blob: { position: 'absolute', top: 4, left: 0 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 3 },
  iconWrap: { width: 36, height: 30, alignItems: 'center', justifyContent: 'center' },
  lbl: { fontSize: 11, letterSpacing: 0.5 },
  badge: { position: 'absolute', top: -2, right: 2, minWidth: 14, height: 14, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <PartnerTabBar {...props} />} screenOptions={{ headerShown: false }} backBehavior="initialRoute">
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
  const { phone, onboarded, setOnboarded, toast, hideToast, confirm, hideConfirm, night } = useApp();
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
  if (!phone) {
    return (
      <View key={night ? 'd' : 'l'} style={{ flex: 1, backgroundColor: C.bg }}>
        <AuthScreen />
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

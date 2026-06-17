import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, BackHandler, ToastAndroid } from 'react-native';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme/brutal';
import { BrutalToast, BrutalConfirm } from '../components/Brutal';
import { useApp } from '../state/AppState';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreens';
import HomeScreen from '../screens/HomeScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ActiveDeliveryScreen from '../screens/ActiveDeliveryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChatScreen from '../screens/ChatScreen';
import ProofCameraScreen from '../screens/ProofCameraScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SafetyScreen from '../screens/SafetyScreen';
import {
  VehicleScreen, DocumentsScreen, PayoutsScreen, WorkZoneScreen,
  HelpScreen, HowItWorksScreen, RateScreen, IdVerificationScreen,
} from '../screens/ProfileDetailScreens';
import WithdrawScreen from '../screens/WithdrawScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── BOTTOM TAB BAR — only 3 tabs, big targets ─────────────
function PartnerTabBar({ state, navigation }: BottomTabBarProps) {
  const items: { name: string; label: string; icon: any }[] = [
    { name: 'HomeTab', label: 'HOME', icon: 'home' },
    { name: 'EarningsTab', label: 'EARN', icon: 'credit-card' },
    { name: 'ProfileTab', label: 'ME', icon: 'user' },
  ];
  const insets = useSafeAreaInsets();
  const { online } = useApp();

  return (
    <View style={[styles.wrap, { backgroundColor: C.white, paddingBottom: insets.bottom > 0 ? insets.bottom : 14 }]}>
      <View style={{ height: 1, backgroundColor: C.ink }} />
      <View style={styles.inner}>
        {items.map((it, i) => {
          const active = state.index === i;
          return (
            <Pressable key={it.name} onPress={() => navigation.navigate(it.name)} style={styles.btn}>
              <View style={[styles.iconWrap, { borderColor: C.ink, backgroundColor: active ? C.ink : 'transparent' }]}>
                <Feather name={it.icon} size={20} color={active ? C.white : C.ink} />
                {it.name === 'HomeTab' && online && (
                  <View style={[styles.dot, { backgroundColor: active ? C.white : C.ink, borderColor: active ? C.ink : C.white }]} />
                )}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.lbl, { color: active ? C.ink : C.dim, fontFamily: active ? 'Inter_900Black' : 'SpaceMono_700Bold', letterSpacing: active ? 0.5 : 1 }]}
              >
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  inner: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 10, paddingHorizontal: 8 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  iconWrap: { width: 52, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  dot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderWidth: 1 },
  lbl: { fontSize: 9, marginTop: 6, textAlign: 'center' },
});

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <PartnerTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      backBehavior="initialRoute"
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="EarningsTab" component={EarningsScreen} />
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

  // Android hardware back: pop the stack → go to Home tab → double-press to exit.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const nav = navigationRef.current;
      if (!nav || !nav.isReady()) return false;
      if (nav.canGoBack()) { nav.goBack(); return true; }
      // at root → require a second press within 2s to exit
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

  // Not logged in → auth gate.
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
          <Stack.Screen name="ActiveDelivery" component={ActiveDeliveryScreen} options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="ProofCamera" component={ProofCameraScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Safety" component={SafetyScreen} />
          <Stack.Screen name="Vehicle" component={VehicleScreen} />
          <Stack.Screen name="Documents" component={DocumentsScreen} />
          <Stack.Screen name="Payouts" component={PayoutsScreen} />
          <Stack.Screen name="WorkZone" component={WorkZoneScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
          <Stack.Screen name="Rate" component={RateScreen} />
          <Stack.Screen name="IdVerification" component={IdVerificationScreen} />
          <Stack.Screen name="Withdraw" component={WithdrawScreen} options={{ animation: 'slide_from_bottom' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <BrutalToast toast={toast} onHide={hideToast} />
      <BrutalConfirm confirm={confirm} onHide={hideConfirm} />
    </View>
  );
}

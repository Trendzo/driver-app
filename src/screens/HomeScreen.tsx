import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Modal, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, AsciiDivider, StatTile, BrutalButton, SwipeToConfirm, MapPanel } from '../components/Brutal';
import { useApp } from '../state/AppState';
import { TODAY, INCENTIVES } from '../data/mockData';

// ─── DUTY TOGGLE — the single most important control in the app ──
function DutyToggle() {
  const { online, toggleOnline } = useApp();
  const anim = useRef(new Animated.Value(online ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: online ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [online]);

  return (
    <Pressable onPress={toggleOnline}>
      <View style={[{ backgroundColor: online ? C.ink : C.white, padding: SP.l }, BORDER(2)]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 2, color: online ? C.white : C.dim }}>
              {online ? '● LIVE · TAKING ORDERS' : '○ YOU ARE OFFLINE'}
            </Text>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 30, letterSpacing: -1, color: online ? C.white : C.ink, marginTop: 4 }}>
              {online ? 'ONLINE' : 'GO ONLINE'}
            </Text>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: online ? C.white : C.dim, marginTop: 2 }}>
              {online ? 'Tap to stop receiving orders' : 'Tap to start earning now'}
            </Text>
          </View>

          {/* physical-looking toggle track */}
          <View style={[{ width: 72, height: 110, justifyContent: online ? 'flex-start' : 'flex-end', padding: 6, backgroundColor: online ? C.white : C.mute }, BORDER(2)]}>
            <Animated.View
              style={{
                width: 56, height: 50,
                backgroundColor: online ? C.ink : C.faint,
                alignItems: 'center', justifyContent: 'center',
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0] }) }],
              }}
            >
              <Feather name={online ? 'zap' : 'power'} size={24} color={C.white} />
            </Animated.View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── ACTIVE DELIVERY BANNER — resume the trip in progress ──
function ActiveBanner() {
  const nav = useNavigation<any>();
  const { activeOrder, stage } = useApp();
  if (!activeOrder) return null;
  const label =
    stage === 'assigned' ? 'HEAD TO STORE' :
    stage === 'at_store' ? 'PICK UP ITEMS' :
    stage === 'picked_up' ? 'GO TO CUSTOMER' :
    stage === 'at_customer' ? 'HAND OVER ORDER' : 'FINISHING';
  return (
    <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 260 }} style={{ marginTop: SP.l }}>
      <Pressable onPress={() => nav.navigate('ActiveDelivery')}>
        <View style={[{ backgroundColor: C.ink, padding: SP.l }, BORDER(2)]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MotiView from={{ opacity: 0.3 }} animate={{ opacity: 1 }} transition={{ loop: true, type: 'timing', duration: 700 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.white }} />
            </MotiView>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: C.white }}>ACTIVE DELIVERY · #{activeOrder.id}</Text>
          </View>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 26, letterSpacing: -0.5, color: C.white, marginTop: 8 }}>{label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SP.m }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.white }}>₹{activeOrder.payout + activeOrder.tip} · {activeOrder.distanceKm} km</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 13, color: C.white, letterSpacing: 1 }}>RESUME</Text>
              <Feather name="arrow-right" size={18} color={C.white} />
            </View>
          </View>
        </View>
      </Pressable>
    </MotiView>
  );
}

// ─── INCOMING ORDER REQUEST — the accept/reject modal ──────
function OrderRequestModal() {
  const { incoming, acceptOrder, rejectOrder } = useApp();
  const nav = useNavigation<any>();
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (!incoming) { setSeconds(30); return; }
    setSeconds(30);
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(t); rejectOrder(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [incoming]);

  if (!incoming) return null;
  const o = incoming;

  const accept = () => { acceptOrder(o); nav.navigate('ActiveDelivery'); };

  return (
    <Modal transparent visible={!!incoming} animationType="fade" statusBarTranslucent onRequestClose={rejectOrder}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <MotiView
          from={{ translateY: 60 }}
          animate={{ translateY: 0 }}
          transition={{ type: 'timing', duration: 260 }}
          style={[{ backgroundColor: C.white }, BORDER(2), { borderBottomWidth: 0 }]}
        >
          {/* header — countdown */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SP.m, backgroundColor: C.ink }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MotiView from={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ loop: true, type: 'timing', duration: 600 }}>
                <Feather name="bell" size={16} color={C.white} />
              </MotiView>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 13, letterSpacing: 1, color: C.white }}>NEW ORDER</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="clock" size={14} color={C.white} />
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 16, color: C.white }}>{seconds}s</Text>
            </View>
          </View>
          {/* countdown bar */}
          <View style={{ height: 4, backgroundColor: C.hairline }}>
            <View style={{ height: 4, backgroundColor: C.ink, width: `${(seconds / 30) * 100}%` }} />
          </View>

          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: SP.l }}>
            {/* payout headline */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: C.dim }}>YOU EARN</Text>
                <Text style={{ fontFamily: 'Inter_900Black', fontSize: 44, letterSpacing: -2, color: C.ink, lineHeight: 46 }}>₹{o.payout + o.tip}</Text>
                {o.tip > 0 && <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: C.dim }}>Incl. ₹{o.tip} tip</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[{ paddingHorizontal: 10, paddingVertical: 6 }, BORDER(1)]}>
                  <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink }}>{o.distanceKm} km</Text>
                </View>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: C.dim, marginTop: 4 }}>~{o.etaMin} MIN</Text>
              </View>
            </View>

            {/* payment chip */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: SP.m }}>
              <View style={[{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: o.payment === 'COD' ? C.ink : C.white }, BORDER(1)]}>
                <Text style={{ fontFamily: 'Inter_900Black', fontSize: 11, letterSpacing: 0.5, color: o.payment === 'COD' ? C.white : C.ink }}>
                  {o.payment === 'COD' ? `COLLECT ₹${o.codAmount} CASH` : 'PREPAID · NO CASH'}
                </Text>
              </View>
              <View style={[{ paddingHorizontal: 10, paddingVertical: 5 }, BORDER(1)]}>
                <Text style={{ fontFamily: 'Inter_900Black', fontSize: 11, color: C.ink }}>{o.items.length} ITEMS</Text>
              </View>
            </View>

            <AsciiDivider style={{ marginTop: SP.l }} />

            {/* pickup → drop */}
            <LocLine tag="PICKUP" title={o.store.name} sub={o.store.addr} km={`${o.store.distanceKm} km away`} />
            <View style={{ marginLeft: 13, height: 18, width: 2, backgroundColor: C.ink }} />
            <LocLine tag="DROP" title={o.customer.name} sub={`${o.customer.addr}${o.customer.landmark ? ' · ' + o.customer.landmark : ''}`} km={`${o.customer.distanceKm} km drop`} solid />
          </ScrollView>

          {/* actions */}
          <View style={{ padding: SP.l, paddingBottom: SP.xl, borderTopWidth: 1, borderColor: C.ink }}>
            <SwipeToConfirm label={`Accept · ₹${o.payout + o.tip}`} icon="check" onConfirm={accept} />
            <Pressable onPress={rejectOrder} style={{ alignItems: 'center', marginTop: SP.m }} hitSlop={8}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.dim, textDecorationLine: 'underline' }}>Pass this order</Text>
            </Pressable>
          </View>
        </MotiView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function LocLine({ tag, title, sub, km, solid }: { tag: string; title: string; sub: string; km: string; solid?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={[{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: solid ? C.ink : C.white }, BORDER(1)]}>
        <Feather name={solid ? 'map-pin' : 'shopping-bag'} size={14} color={solid ? C.white : C.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 1.5, color: C.dim }}>{tag} · {km.toUpperCase()}</Text>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.ink, marginTop: 2 }}>{title}</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.dim, marginTop: 1 }}>{sub}</Text>
      </View>
    </View>
  );
}

// ─── HOME ──────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { online, todayEarnings, todayTrips, showToast } = useApp();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScrollView contentContainerStyle={{ paddingHorizontal: SP.l, paddingTop: insets.top + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: C.dim }}>{'> TRENDZO PARTNER'}</Text>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 22, letterSpacing: -0.5, color: C.ink, marginTop: 2 }}>Hi, Ravi</Text>
          </View>
          <Pressable onPress={() => nav.navigate('Notifications')} style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
            <Feather name="bell" size={20} color={C.ink} />
            <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, backgroundColor: C.ink, borderWidth: 1, borderColor: C.white }} />
          </Pressable>
        </View>

        {/* duty toggle */}
        <View style={{ marginTop: SP.l }}>
          <DutyToggle />
        </View>

        {/* active delivery resume */}
        <ActiveBanner />

        {/* searching shimmer when online & idle */}
        {online && (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 220 }} style={{ marginTop: SP.l }}>
            <View style={[{ padding: SP.m, flexDirection: 'row', alignItems: 'center', gap: 10 }, BORDER(1)]}>
              <MotiView from={{ rotate: '0deg' }} animate={{ rotate: '360deg' }} transition={{ loop: true, type: 'timing', duration: 1400 }}>
                <Feather name="loader" size={16} color={C.ink} />
              </MotiView>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.ink, letterSpacing: 0.5 }}>SEARCHING FOR ORDERS NEAR YOU…</Text>
            </View>
          </MotiView>
        )}

        {/* today stats */}
        <View style={{ marginTop: SP.xl }}>
          <AsciiDivider />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 20, color: C.ink, letterSpacing: -0.5 }}>{ASCII.caret} TODAY</Text>
            <Pressable onPress={() => nav.navigate('EarningsTab')} hitSlop={8}>
              <Text style={[T.monoB, { fontSize: 11 }]}>{'[ DETAILS ]'}</Text>
            </Pressable>
          </View>
          <AsciiDivider faint style={{ marginTop: 4 }} />
        </View>

        <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.m }}>
          <StatTile label="Earnings" value={`₹${todayEarnings}`} sub={`${todayTrips} trips`} solid style={{ flex: 1 }} />
          <StatTile label="Online" value={`${TODAY.onlineHours}h`} sub="today" style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.s }}>
          <StatTile label="Distance" value={`${TODAY.distanceKm}`} sub="km ridden" style={{ flex: 1 }} />
          <StatTile label="Rating" value={`${TODAY.rating}★`} sub={`${TODAY.acceptanceRate}% accept`} style={{ flex: 1 }} />
        </View>

        {/* incentives */}
        <View style={{ marginTop: SP.xl }}>
          <AsciiDivider />
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 20, color: C.ink, letterSpacing: -0.5, marginTop: 6 }}>{ASCII.caret} BONUS TARGETS</Text>
          <AsciiDivider faint style={{ marginTop: 4 }} />
        </View>
        {INCENTIVES.map((inc, i) => {
          const pct = Math.min(100, Math.round((inc.done / inc.target) * 100));
          const left = inc.target - inc.done;
          return (
            <Pressable key={i} onPress={() => showToast(`+₹${inc.reward} bonus`, left > 0 ? `${left} more to unlock` : 'Target complete!', 'gift')} style={[{ padding: SP.m, marginTop: SP.m }, BORDER(1)]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.ink, flex: 1 }}>{inc.title}</Text>
                <View style={[{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: C.ink }]}>
                  <Text style={{ fontFamily: 'Inter_900Black', fontSize: 12, color: C.white }}>+₹{inc.reward}</Text>
                </View>
              </View>
              <View style={{ height: 8, backgroundColor: C.hairline, marginTop: 10 }}>
                <View style={{ height: 8, backgroundColor: C.ink, width: `${pct}%` }} />
              </View>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: C.dim, marginTop: 6 }}>{inc.done}/{inc.target} DONE · {pct}%</Text>
            </Pressable>
          );
        })}

        {/* offline hint */}
        {!online && (
          <View style={[{ marginTop: SP.xl, padding: SP.l, alignItems: 'center' }, BORDER(1)]}>
            <Feather name="power" size={28} color={C.dim} />
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.ink, marginTop: 10, textAlign: 'center' }}>YOU'RE OFFLINE</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.dim, marginTop: 4, textAlign: 'center' }}>Tap GO ONLINE above to start receiving delivery orders.</Text>
          </View>
        )}
      </ScrollView>

      {/* incoming order modal lives at screen root */}
      <OrderRequestModal />
    </View>
  );
}

const styles = StyleSheet.create({});

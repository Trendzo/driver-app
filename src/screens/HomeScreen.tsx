// Home dashboard — the rider's day at a glance, backend-only data: earnings,
// deliveries, COD to deposit, active jobs, and this week's summary.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, SP } from '../theme/brutal';
import { BrutalStatusBar, BrutalCard, BrutalButton, SectionHead, StatTile } from '../components/Brutal';
import { MethodBadge } from '../components/DeliveryBits';
import { useApp, isActive } from '../state/AppState';
import { STATE_LABEL } from '../data/mockData';
import { earningsSummary, type EarningsSummary } from '../api';

const rupee = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const rupeeP = (paise: number) => rupee(paise / 100);

function Chip({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 1 }}>
      <Feather name={icon} size={12} color={C.dim} />
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.dim }} numberOfLines={1}>{text}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { driver, orders, deliveredToday, codCollected, cashPendingDeposit, depositCash, showConfirm } = useApp();
  const [earn, setEarn] = useState<EarningsSummary | null>(null);
  // Refetch every time Home regains focus (it's a kept-alive tab) so a delivery completed
  // on another screen shows up immediately — the old single mount-fetch never updated.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      earningsSummary().then((e) => { if (alive) setEarn(e); }).catch(() => {});
      return () => { alive = false; };
    }, []),
  );
  // Backend is the source of truth, but never regress below the live local counters the
  // optimistic transitions bumped (the API can briefly lag a just-completed delivery).
  const todayEarnings = earn ? rupeeP(earn.today.earningsPaise) : '₹—';
  const todayDelivered = Math.max(earn?.today.deliveries ?? 0, deliveredToday);
  const todayCod = earn ? rupeeP(earn.today.codCollectedPaise) : rupee(codCollected);

  const active = orders.filter((o) => o.method !== 'REVERSE_PICKUP' && isActive(o));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const initial = (driver?.name || 'D').trim().charAt(0).toUpperCase();

  const deposit = () =>
    showConfirm({
      title: 'Deposit cash?',
      msg: `Declare ${rupee(codCollected)} at the ops desk. The balance clears once ops confirms receipt.`,
      confirmLabel: 'Request deposit',
      icon: 'credit-card',
      onConfirm: depositCash,
    });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + SP.m, paddingHorizontal: SP.l, paddingBottom: insets.bottom + 120 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: C.white }}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={T.label}>{greeting}</Text>
            {/* Signed-in driver only — never demo data. */}
            <Text style={[T.h2, { marginTop: 2 }]} numberOfLines={1}>{driver?.name || 'Partner'}</Text>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="bell" size={20} color={C.ink} />
          </View>
        </View>

        {/* City chip — only when the profile actually has one (no demo zone/shift). */}
        {!!driver?.city && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: SP.m }}>
            <Chip icon="map-pin" text={driver.city} />
          </View>
        )}

        {/* Earnings hero */}
        <BrutalCard solid style={{ marginTop: SP.l }}>
          <Text style={[T.label, { color: 'rgba(255,255,255,0.65)' }]}>Today's earnings</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: 'Inter_700Bold', fontSize: 44, color: C.white, letterSpacing: -1.5, marginTop: 4 }}>
            {todayEarnings}
          </Text>
        </BrutalCard>

        {/* Stats — backend-backed only (rating / km / on-time have no API yet). */}
        <View style={{ flexDirection: 'row', gap: SP.m, marginTop: SP.m }}>
          <StatTile style={{ flex: 1 }} label="Delivered" value={String(todayDelivered)} sub="today" />
          <StatTile style={{ flex: 1 }} label="COD taken" value={todayCod} sub="today" />
        </View>

        {/* COD outstanding (ledger-backed) */}
        <BrutalCard style={{ marginTop: SP.m, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.mute, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="currency-inr" size={20} color={C.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={T.label}>COD cash with you</Text>
            <Text style={[T.h2, { marginTop: 2 }]}>{rupee(codCollected)}</Text>
            {cashPendingDeposit > 0 && (
              <Text style={T.caption}>{rupee(cashPendingDeposit)} awaiting ops confirmation</Text>
            )}
          </View>
          <BrutalButton
            label={cashPendingDeposit > 0 ? 'Pending' : 'Deposit'}
            small
            disabled={codCollected <= 0 || cashPendingDeposit > 0}
            onPress={deposit}
          />
        </BrutalCard>

        {/* Active now */}
        <SectionHead
          title="Active now"
          action={active.length ? 'View all' : undefined}
          onAction={() => navigation.navigate('DeliveriesTab')}
        />
        {active.length === 0 ? (
          <BrutalCard style={{ alignItems: 'center', paddingVertical: SP.xl }}>
            <Feather name="check-circle" size={28} color={C.faint} />
            <Text style={[T.bodyB, { marginTop: 8 }]}>All clear</Text>
            <Text style={[T.caption, { marginTop: 2 }]}>No active deliveries right now.</Text>
          </BrutalCard>
        ) : (
          active.slice(0, 3).map((o) => (
            <Pressable key={o.id} onPress={() => navigation.navigate('OrderDetail', { id: o.id })} style={{ marginBottom: SP.s }}>
              <BrutalCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MethodBadge method={o.method} />
                    <Text numberOfLines={1} style={[T.caption, { flexShrink: 1 }]}>#{o.id.replace(/^ord_/, '').slice(0, 8)}</Text>
                  </View>
                  <Text style={[T.bodyB, { marginTop: 6 }]} numberOfLines={1}>{o.customer.name}</Text>
                  <Text style={T.caption} numberOfLines={1}>{STATE_LABEL[o.state]}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={C.faint} />
              </BrutalCard>
            </Pressable>
          ))
        )}

        {/* This week */}
        <SectionHead title="This week" />
        <BrutalCard style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={T.label} numberOfLines={1}>Earnings</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[T.h2, { marginTop: 2 }]}>{earn ? rupeeP(earn.week.earningsPaise) : '₹—'}</Text>
          </View>
          <View style={{ width: 1, height: 36, backgroundColor: C.hairline, marginHorizontal: SP.m }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={T.label} numberOfLines={1}>Deliveries</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[T.h2, { marginTop: 2 }]}>{earn ? earn.week.deliveries : '—'}</Text>
          </View>
          <View style={{ width: 1, height: 36, backgroundColor: C.hairline, marginHorizontal: SP.m }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={T.label} numberOfLines={1}>Days</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[T.h2, { marginTop: 2 }]}>{earn ? earn.week.days : '—'}</Text>
          </View>
        </BrutalCard>
      </ScrollView>
    </View>
  );
}

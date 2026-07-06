// Home dashboard — the rider's day at a glance: earnings, rating, deliveries,
// distance, COD to deposit, active jobs, and this week's summary.
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, SP } from '../theme/brutal';
import { BrutalStatusBar, BrutalCard, BrutalButton, SectionHead, StatTile } from '../components/Brutal';
import { MethodBadge } from '../components/DeliveryBits';
import { useApp, isActive } from '../state/AppState';
import { AGENT, TODAY, WEEK, STATE_LABEL } from '../data/mockData';

const rupee = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function Chip({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 1 }}>
      <Feather name={icon} size={12} color={C.dim} />
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.dim }} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function MiniStat({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Feather name={icon} size={13} color="rgba(255,255,255,0.7)" />
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{label}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { agent, orders, deliveredToday, codCollected, depositCash, showConfirm } = useApp();

  const active = orders.filter((o) => o.method !== 'REVERSE_PICKUP' && isActive(o));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const initial = (agent?.name ?? 'R').trim().charAt(0).toUpperCase();

  const deposit = () =>
    showConfirm({
      title: 'Deposit cash?',
      msg: `Hand ${rupee(codCollected)} to the store cashier, then confirm.`,
      confirmLabel: 'Deposited',
      icon: 'credit-card',
      onConfirm: depositCash,
    });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + SP.m, paddingHorizontal: SP.l, paddingBottom: 130 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: C.white }}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={T.label}>{greeting}</Text>
            <Text style={[T.h2, { marginTop: 2 }]} numberOfLines={1}>{agent?.name ?? 'Partner'}</Text>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="bell" size={20} color={C.ink} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: SP.m }}>
          <Chip icon="map-pin" text={agent?.zone ?? ''} />
          <Chip icon="clock" text={agent?.shift ?? ''} />
        </View>

        {/* Earnings hero */}
        <BrutalCard solid style={{ marginTop: SP.l }}>
          <Text style={[T.label, { color: 'rgba(255,255,255,0.65)' }]}>Today's earnings</Text>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 44, color: C.white, letterSpacing: -1.5, marginTop: 4 }}>
            {rupee(TODAY.earnings)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
            <MiniStat icon="trending-up" label={`+${rupee(TODAY.tips)} tips`} />
            <MiniStat icon="clock" label={`${TODAY.hoursOnline} hrs online`} />
          </View>
        </BrutalCard>

        {/* Stats grid */}
        <View style={{ flexDirection: 'row', gap: SP.m, marginTop: SP.m }}>
          <StatTile style={{ flex: 1 }} label="Delivered" value={String(deliveredToday)} sub="today" />
          <StatTile style={{ flex: 1 }} label="Rating" value={`${agent?.rating ?? 4.9}★`} sub={`${(agent?.ratingCount ?? 0).toLocaleString('en-IN')} trips`} />
        </View>
        <View style={{ flexDirection: 'row', gap: SP.m, marginTop: SP.m }}>
          <StatTile style={{ flex: 1 }} label="Distance" value={`${TODAY.kmLogged}`} sub="km today" />
          <StatTile style={{ flex: 1 }} label="On-time" value={`${TODAY.onTimePct}%`} sub={`${TODAY.acceptancePct}% accepted`} />
        </View>

        {/* COD to deposit */}
        <BrutalCard style={{ marginTop: SP.m, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.mute, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="currency-inr" size={20} color={C.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={T.label}>Cash to deposit</Text>
            <Text style={[T.h2, { marginTop: 2 }]}>{rupee(codCollected)}</Text>
          </View>
          <BrutalButton label="Deposit" small disabled={codCollected <= 0} onPress={deposit} />
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
                    <Text style={T.caption}>#{o.id}</Text>
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
          <View style={{ flex: 1 }}>
            <Text style={T.label}>Earnings</Text>
            <Text style={[T.h2, { marginTop: 2 }]}>{rupee(WEEK.earnings)}</Text>
          </View>
          <View style={{ width: 1, height: 36, backgroundColor: C.hairline, marginHorizontal: SP.m }} />
          <View style={{ flex: 1 }}>
            <Text style={T.label}>Deliveries</Text>
            <Text style={[T.h2, { marginTop: 2 }]}>{WEEK.deliveries}</Text>
          </View>
          <View style={{ width: 1, height: 36, backgroundColor: C.hairline, marginHorizontal: SP.m }} />
          <View style={{ flex: 1 }}>
            <Text style={T.label}>Days</Text>
            <Text style={[T.h2, { marginTop: 2 }]}>{WEEK.days}</Text>
          </View>
        </BrutalCard>
      </ScrollView>
    </View>
  );
}

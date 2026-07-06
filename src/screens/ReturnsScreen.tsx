// RETURNS. Two kinds of work:
//  1. Reverse pickups — go to a customer, collect an Express/Standard return,
//     bring it to the store.
//  2. Return-to-store handoffs — any order now in `returning_to_store`
//     (Try-and-Buy full reject, aborted, or twice-failed delivery) that the
//     agent is carrying back and must hand over item-by-item.
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, AsciiDivider } from '../components/Brutal';
import { MethodBadge, ProgressTrack } from '../components/DeliveryBits';
import { useApp, isActive } from '../state/AppState';
import { Order, STATE_LABEL } from '../data/mockData';

function ReturnCard({ o, kind }: { o: Order; kind: 'pickup' | 'handoff' }) {
  const nav = useNavigation<any>();
  const go = () => kind === 'handoff' ? nav.navigate('StoreHandoff', { id: o.id }) : nav.navigate('OrderDetail', { id: o.id });
  const place = kind === 'handoff' ? o.store : o.customer;
  return (
    <Pressable onPress={go} style={[{ backgroundColor: C.white, marginBottom: SP.m }, BORDER(1)]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SP.m }}>
        <MethodBadge method={o.method} />
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.dim }}>#{o.id}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: C.hairline }} />
      <View style={{ paddingHorizontal: SP.m, paddingTop: SP.m }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.dim, letterSpacing: 0.8, textTransform: 'uppercase' }}>{kind === 'handoff' ? 'Take to store' : 'Collect from'}</Text>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: C.ink, marginTop: 3 }}>{place.name}</Text>
        <Text numberOfLines={1} style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.dim, marginTop: 2 }}>{place.addr}</Text>
        {o.pickupItem && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Feather name="package" size={13} color={C.ink} />
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink }}>{o.pickupItem}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.ink }} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.ink }}>{STATE_LABEL[o.state]}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: SP.m, paddingTop: SP.m }}>
        <ProgressTrack method={o.method} state={o.state} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: SP.m, marginTop: SP.s, borderTopWidth: 1, borderColor: C.hairline }}>
        <Feather name="arrow-right-circle" size={16} color={C.ink} />
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink, flex: 1 }}>
          {kind === 'handoff' ? 'Open bag with store staff' : 'Collect item + photo'}
        </Text>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.ink }}>OPEN →</Text>
      </View>
    </Pressable>
  );
}

function Section({ title }: { title: string }) {
  return (
    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.dim, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: SP.m, marginTop: SP.m }}>{title}</Text>
  );
}

export default function ReturnsScreen() {
  const insets = useSafeAreaInsets();
  const { orders } = useApp();
  const pickups = orders.filter(o => o.method === 'REVERSE_PICKUP' && isActive(o) && o.state !== 'returning_to_store');
  const handoffs = orders.filter(o => o.state === 'returning_to_store');
  const empty = pickups.length === 0 && handoffs.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: SP.l, paddingBottom: SP.s }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: C.ink, letterSpacing: -0.5 }}>Returns</Text>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.dim, marginTop: 2 }}>Reverse pickups + bags going back to store</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>
        {empty ? (
          <View style={{ alignItems: 'center', paddingVertical: 80 }}>
            <Feather name="corner-up-left" size={44} color={C.faint} />
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 19, color: C.ink, marginTop: 16 }}>Nothing to return</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: C.dim, marginTop: 4, textAlign: 'center' }}>Reverse pickups and store handoffs{'\n'}will show up here.</Text>
          </View>
        ) : (
          <>
            {handoffs.length > 0 && <Section title="RETURN TO STORE" />}
            {handoffs.map(o => <ReturnCard key={o.id} o={o} kind="handoff" />)}
            {pickups.length > 0 && <Section title="REVERSE PICKUPS" />}
            {pickups.map(o => <ReturnCard key={o.id} o={o} kind="pickup" />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// DELIVERIES (home). Employed agent — no online/offline, no accept/reject.
// Shows ONLY the agent's active forward deliveries (there can be several at
// once). Each card: delivery type, timer, and a per-type progress track.
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, AsciiDivider } from '../components/Brutal';
import { MethodBadge, Countdown, TargetChip, ProgressTrack } from '../components/DeliveryBits';
import { useApp, isActive } from '../state/AppState';
import { Order, STATE_LABEL, METHOD_LABEL } from '../data/mockData';

// What the agent should do next, per state — drives the card's footer hint.
function nextAction(o: Order): string {
  switch (o.state) {
    case 'packed': return 'Go to store · collect bag';
    case 'picked_up': return 'Start delivery to customer';
    case 'out_for_delivery': return o.method === 'TRY_AND_BUY' ? 'Tap when you arrive' : 'Hand over · take proof';
    case 'at_door': return 'Run the try-on at the door';
    case 'undelivered': return 'Retry or return to store';
    default: return 'Continue';
  }
}

function DeliveryCard({ o }: { o: Order }) {
  const nav = useNavigation<any>();
  const { door } = useApp();
  const doorState = door[o.id];
  const open = () => {
    if (o.method === 'TRY_AND_BUY' && o.state === 'at_door') nav.navigate('Door', { id: o.id });
    else nav.navigate('OrderDetail', { id: o.id });
  };
  return (
    <Pressable onPress={open} style={[{ backgroundColor: C.white, marginBottom: SP.m }, BORDER(1)]}>
      {/* top row: id + method + timer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SP.m, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <MethodBadge method={o.method} />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.dim }}>#{o.id}</Text>
        </View>
        {o.state === 'at_door' && doorState ? <Countdown endsAt={doorState.endsAt} /> : <TargetChip minutes={o.targetMin} />}
      </View>
      <View style={{ height: 1, backgroundColor: C.hairline }} />

      {/* customer + status */}
      <View style={{ paddingHorizontal: SP.m, paddingTop: SP.m }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: C.ink, letterSpacing: -0.3 }}>{o.customer.name}</Text>
        <Text numberOfLines={1} style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.dim, marginTop: 2 }}>{o.customer.addr}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.ink }} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.ink }}>{STATE_LABEL[o.state]}</Text>
          {o.payment === 'COD' && (
            <View style={{ marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 3, backgroundColor: C.ink, borderRadius: 999 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.white }}>COD ₹{o.codAmount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* progress track */}
      <View style={{ paddingHorizontal: SP.m, paddingTop: SP.m }}>
        <ProgressTrack method={o.method} state={o.state} />
      </View>

      {/* footer: next action */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: SP.m, marginTop: SP.s, borderTopWidth: 1, borderColor: C.hairline }}>
        <Feather name="arrow-right-circle" size={16} color={C.ink} />
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink, flex: 1 }}>{nextAction(o)}</Text>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.ink, letterSpacing: 0.5 }}>CONTINUE →</Text>
      </View>
    </Pressable>
  );
}

export default function DeliveriesScreen() {
  const insets = useSafeAreaInsets();
  const { agent, orders } = useApp();
  // forward deliveries only (reverse pickups live on the Returns tab)
  const active = orders.filter(o => o.method !== 'REVERSE_PICKUP' && isActive(o));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      {/* header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: SP.l, paddingBottom: SP.s }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: C.ink, letterSpacing: -0.5 }}>Deliveries</Text>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.dim, marginTop: 2 }}>{agent.zone} · {agent.shift}</Text>
          </View>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.ink, borderRadius: 999, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: C.white }}>{active.length}</Text>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 }}>ACTIVE</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>
        {active.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 80 }}>
            <Feather name="check-circle" size={44} color={C.faint} />
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 19, color: C.ink, marginTop: 16 }}>All clear</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: C.dim, marginTop: 4, textAlign: 'center' }}>No active deliveries right now.{'\n'}New orders for your zone appear here.</Text>
          </View>
        ) : (
          <>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.dim, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: SP.m }}>Active now</Text>
            {active.map(o => <DeliveryCard key={o.id} o={o} />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

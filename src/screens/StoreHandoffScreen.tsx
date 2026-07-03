// STORE HANDOFF (Flow D). The agent is back at the store carrying returned /
// collected items. Staff and agent open the bag TOGETHER — each item is checked
// against the agent's record and acknowledged by the store. The agent is
// released (order → returned_to_store) only after every item is acknowledged.
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SP, BORDER } from '../theme/brutal';
import { BrutalStatusBar, ScreenHeader, SwipeToConfirm } from '../components/Brutal';
import { Countdown, MethodBadge } from '../components/DeliveryBits';
import { useApp } from '../state/AppState';

export default function StoreHandoffScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params;
  const { getOrder, handedBack } = useApp();
  const o = getOrder(id);
  // 30-minute target to reach + close out the store handoff
  const endsAt = useRef(Date.now() + 30 * 60 * 1000).current;
  const [acked, setAcked] = useState<Set<string>>(new Set());

  if (!o) return <View style={{ flex: 1, backgroundColor: C.bg }}><ScreenHeader title="Handoff" onBack={() => nav.goBack()} /></View>;

  const toggle = (itemId: string) => setAcked(prev => {
    const next = new Set(prev);
    next.has(itemId) ? next.delete(itemId) : next.add(itemId);
    return next;
  });
  const allAcked = o.items.every(it => acked.has(it.id));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScreenHeader title="Return to store" onBack={() => nav.goBack()} />

      <View style={{ paddingHorizontal: SP.l, paddingTop: SP.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MethodBadge method={o.method} />
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 14, color: C.dim }}>#{o.id}</Text>
        </View>
        <Countdown endsAt={endsAt} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={[{ padding: SP.m, backgroundColor: C.white, marginBottom: SP.l }, BORDER(1)]}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: C.dim, letterSpacing: 1 }}>HAND OVER AT</Text>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 19, color: C.ink, marginTop: 2 }}>{o.store.name}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginTop: 1 }}>{o.store.addr}</Text>
        </View>

        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: SP.m, backgroundColor: C.mute, marginBottom: SP.l }, BORDER(1)]}>
          <Feather name="users" size={15} color={C.ink} />
          <Text style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink }}>Open the bag with store staff. They confirm each item — no drop-and-go.</Text>
        </View>

        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.ink, marginBottom: SP.s }}>
          ITEMS ACKNOWLEDGED · {acked.size}/{o.items.length}
        </Text>
        {o.items.map(it => {
          const ok = acked.has(it.id);
          return (
            <Pressable key={it.id} onPress={() => toggle(it.id)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.m, marginBottom: SP.s, backgroundColor: ok ? C.ink : C.white }, BORDER(1)]}>
              <View style={[{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: ok ? C.white : C.white }, BORDER(1)]}>
                {ok && <Feather name="check" size={14} color={C.ink} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: ok ? C.white : C.ink }}>{it.name}</Text>
                {it.note && <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: ok ? C.white : C.dim }}>{it.note}</Text>}
              </View>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: ok ? C.white : C.dim }}>{ok ? 'STORE OK' : 'TAP TO CONFIRM'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ padding: SP.l, paddingBottom: insets.bottom + 14, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.ink }}>
        {!allAcked && (
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 13, color: C.dim, textAlign: 'center', marginBottom: SP.s }}>
            All items must be acknowledged before you're released
          </Text>
        )}
        <SwipeToConfirm label="Handed back · release me" icon="check-circle" disabled={!allAcked} onConfirm={() => { handedBack(o.id); nav.goBack(); }} />
      </View>
    </View>
  );
}

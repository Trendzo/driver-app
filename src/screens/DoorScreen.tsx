// DOOR (Try-and-Buy) — the most important flow.
// 30-min countdown, per-item Keep/Return, inspection with Accept / Refuse /
// Store-decides, one +5 min extension, and the close-door rules. The agent only
// RECORDS what happened — never cash, never a refund decision at the door.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SP, BORDER } from '../theme/brutal';
import { BrutalStatusBar, BrutalButton } from '../components/Brutal';
import { Countdown, PolicyBadge } from '../components/DeliveryBits';
import { useApp } from '../state/AppState';
import { DoorDecision, RETURN_INSPECT_REASONS } from '../data/mockData';

const DECISION_CHIP: Record<Exclude<DoorDecision, 'pending'>, { label: string; solid: boolean }> = {
  kept: { label: 'Kept', solid: false },
  returned: { label: 'Returned · in bag', solid: true },
  refused: { label: 'Refused · stays', solid: false },
  store_decides: { label: 'In bag · store decides', solid: true },
};

export default function DoorScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params;
  const { getOrder, door, arriveAtDoor, decideItem, addExtension, closeDoor, proofPhoto, setProofPhoto } = useApp();
  const o = getOrder(id);
  const st = door[id];

  // make sure a timer exists if we arrived here directly
  useEffect(() => { if (o && !door[id]) arriveAtDoor(id); }, [id]);
  useEffect(() => { setProofPhoto(null); }, [id]);

  const [inspect, setInspect] = useState<string | null>(null);   // itemId under inspection
  const [reasonFor, setReasonFor] = useState<{ itemId: string; decision: DoorDecision } | null>(null);
  // a decision waiting on its mandatory photo
  const [pending, setPending] = useState<{ itemId: string; decision: DoorDecision; needsReason: boolean } | null>(null);
  const [closing, setClosing] = useState(false);

  // when a photo comes back, advance the pending decision
  useEffect(() => {
    if (!proofPhoto) return;
    if (closing) { setClosing(false); setProofPhoto(null); closeDoor(id); nav.goBack(); return; }
    if (pending) {
      const p = pending; setPending(null); setProofPhoto(null);
      if (p.needsReason) setReasonFor({ itemId: p.itemId, decision: p.decision });
      else decideItem(id, p.itemId, p.decision);
    }
  }, [proofPhoto]);

  if (!o || !st) return <View style={{ flex: 1, backgroundColor: C.bg }}><BrutalStatusBar /></View>;

  const decided = (itemId: string) => st.decisions[itemId] ?? 'pending';
  const camera = (title: string, hint: string) => nav.navigate('ProofCamera', { title, hint });

  // Keep — no photo.
  const keep = (itemId: string) => decideItem(id, itemId, 'kept');
  // Accept return — photo, no reason.
  const acceptReturn = (itemId: string) => { setInspect(null); setPending({ itemId, decision: 'returned', needsReason: false }); camera('Return item', 'Photograph the returned item'); };
  // Refuse / store-decides — photo + reason.
  const refuse = (itemId: string) => { setInspect(null); setPending({ itemId, decision: 'refused', needsReason: true }); camera('Refused item', 'Photograph the refused item'); };
  const storeDecides = (itemId: string) => { setInspect(null); setPending({ itemId, decision: 'store_decides', needsReason: true }); camera('Into bag', 'Photograph the item going back'); };

  // close-door rule: if every item ends up returned/store_decides → full reject.
  const effective = o.items.map(it => { const d = decided(it.id); return d === 'pending' ? 'kept' : d; });
  const allReturned = effective.every(d => d === 'returned' || d === 'store_decides');
  const onClose = () => {
    if (allReturned) { setClosing(true); camera('Full return', 'Photograph the whole bag before leaving'); }
    else { closeDoor(id); nav.goBack(); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      {/* timer header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: SP.l, paddingBottom: SP.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: C.ink, letterSpacing: -0.5 }}>At the door</Text>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.dim }}>{o.customer.name} · Try & Buy</Text>
          </View>
          <Countdown endsAt={st.endsAt} big />
        </View>
        <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.m }}>
          <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: SP.s + 2, backgroundColor: C.mute }, BORDER(1)]}>
            <Feather name="alert-circle" size={13} color={C.ink} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.ink, flex: 1 }}>Prepaid · never collect cash</Text>
          </View>
          <BrutalButton label={st.extensionUsed ? '+5 used' : '+5 min'} variant="outline" small icon="clock" disabled={st.extensionUsed} onPress={() => addExtension(id)} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginBottom: SP.m }}>
          Read each item's policy, then record what the customer kept or returned. Refunds are decided later by the store.
        </Text>

        {o.items.map(it => {
          const d = decided(it.id);
          return (
            <View key={it.id} style={[{ marginBottom: SP.m, backgroundColor: C.white, overflow: 'hidden' }, BORDER(1)]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.m }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: C.ink }}>{it.name}</Text>
                  {it.note && <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.dim, marginTop: 1 }}>{it.note}</Text>}
                </View>
                <PolicyBadge policy={it.policy} />
              </View>
              <View style={{ height: 1, backgroundColor: C.hairline }} />
              {d === 'pending' ? (
                <View style={{ flexDirection: 'row' }}>
                  <Pressable onPress={() => keep(it.id)} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: C.white, borderRightWidth: 1, borderColor: C.hairline }}>
                    <Feather name="user-check" size={16} color={C.ink} />
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink, marginTop: 3 }}>Keep</Text>
                  </Pressable>
                  <Pressable onPress={() => setInspect(it.id)} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: C.ink }}>
                    <Feather name="corner-up-left" size={16} color={C.white} />
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.white, marginTop: 3 }}>Return</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => decideItem(id, it.id, 'pending')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: SP.m, backgroundColor: DECISION_CHIP[d].solid ? C.ink : C.mute }}>
                  <Feather name={d === 'kept' ? 'user-check' : d === 'refused' ? 'slash' : 'package'} size={15} color={DECISION_CHIP[d].solid ? C.white : C.ink} />
                  <Text style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 15, color: DECISION_CHIP[d].solid ? C.white : C.ink, letterSpacing: 0.5 }}>{DECISION_CHIP[d].label}</Text>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: DECISION_CHIP[d].solid ? C.white : C.dim }}>Change</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* close door */}
      <View style={{ padding: SP.l, paddingBottom: insets.bottom + 14, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.hairline }}>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.dim, textAlign: 'center', marginBottom: SP.s }}>
          {allReturned ? 'Full return → bag photo, then back to store' : 'Undecided items are kept · at least one kept = delivered'}
        </Text>
        <BrutalButton label="Close door" icon="check-square" big block onPress={onClose} />
      </View>

      {/* inspection sheet */}
      <Modal transparent visible={!!inspect} animationType="fade" onRequestClose={() => setInspect(null)}>
        <Pressable onPress={() => setInspect(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={[{ backgroundColor: C.bg, padding: SP.l, paddingBottom: insets.bottom + 20 }, BORDER(2)]}>
            {(() => {
              const item = o.items.find(i => i.id === inspect);
              if (!item) return null;
              const doorReturnOk = item.policy === 'RETURN';
              return (
                <>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: C.ink }}>Inspect return</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: SP.m }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: C.ink, flex: 1 }}>{item.name}</Text>
                    <PolicyBadge policy={item.policy} />
                  </View>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginBottom: SP.m }}>
                    Check for defect, wrong item, soiling, tamper or swap. Then choose:
                  </Text>
                  {doorReturnOk ? (
                    <BrutalButton label="Accept return · into bag" icon="check" big block onPress={() => acceptReturn(item.id)} />
                  ) : (
                    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: SP.m, backgroundColor: C.mute }, BORDER(1)]}>
                      <Feather name="lock" size={14} color={C.ink} />
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.ink, flex: 1 }}>No door return — replace / final only</Text>
                    </View>
                  )}
                  <View style={{ height: SP.s }} />
                  <BrutalButton label="Accept into bag · store decides" variant="outline" icon="package" block onPress={() => storeDecides(item.id)} />
                  <View style={{ height: SP.s }} />
                  <BrutalButton label="Refuse · stays with customer" variant="outline" icon="slash" block onPress={() => refuse(item.id)} />
                  <View style={{ height: SP.s }} />
                  <BrutalButton label="Cancel" variant="ghost" block onPress={() => setInspect(null)} />
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* reason picker (refuse / store-decides) */}
      <Modal transparent visible={!!reasonFor} animationType="fade" onRequestClose={() => setReasonFor(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={[{ backgroundColor: C.bg, padding: SP.l, paddingBottom: insets.bottom + 20 }, BORDER(2)]}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: C.ink, marginBottom: 4 }}>Pick a reason</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginBottom: SP.m }}>Photo attached. Why this decision?</Text>
            {RETURN_INSPECT_REASONS.map(r => (
              <Pressable key={r} onPress={() => { if (reasonFor) decideItem(id, reasonFor.itemId, reasonFor.decision); setReasonFor(null); }} style={[{ padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: C.ink }}>{r}</Text>
              </Pressable>
            ))}
            <BrutalButton label="Cancel" variant="ghost" block onPress={() => setReasonFor(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

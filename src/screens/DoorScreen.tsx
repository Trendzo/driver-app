// DOOR (Try-and-Buy) — customer-driven.
// The customer entered the try-on the moment the driver keyed the handover OTP (that
// opened the door + started the server timer). Here the DRIVER only WAITS on the customer,
// who taps Keep/Return per item in their own app. When the customer requests a return, the
// driver Accepts it or Inspects & rejects it (with a photo + reason). On expiry the driver
// finishes the visit (undecided items count as kept). No OTP here — it proved handover at open.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SP, BORDER } from '../theme/brutal';
import { BrutalStatusBar, BrutalButton } from '../components/Brutal';
import { Countdown, PolicyBadge } from '../components/DeliveryBits';
import { useApp } from '../state/AppState';
import { DoorItemState, RETURN_INSPECT_REASONS, UNDELIVERED_REASONS } from '../data/mockData';

// Per-state chip copy for a resolved item.
const STATE_CHIP: Record<Exclude<DoorItemState, 'undecided' | 'return_requested'>, { label: string; solid: boolean; icon: any }> = {
  kept: { label: 'Customer kept', solid: false, icon: 'user-check' },
  return_accepted: { label: 'Return accepted · in bag', solid: true, icon: 'corner-up-left' },
  return_rejected: { label: 'Return rejected · stays', solid: false, icon: 'slash' },
};

export default function DoorScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params;
  const { getOrder, refresh, acceptReturn, rejectReturn, addExtension, finishDoor, markUndelivered, proofPhoto, setProofPhoto } = useApp();
  const o = getOrder(id);
  const oRef = useRef(o);
  oRef.current = o;

  // A return awaiting its mandatory reject photo, then its reason.
  const [rejecting, setRejecting] = useState<string | null>(null);   // itemId mid-reject (photo pending)
  const [reasonFor, setReasonFor] = useState<string | null>(null);   // itemId at the reason step
  const rejectPhoto = useRef<string | null>(null);                    // the uploaded evidence URL
  const [undelivModal, setUndelivModal] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setProofPhoto(null); }, [id]);

  // Poll a little faster than the global 8s while the customer is deciding at the door.
  // Stop once the order leaves the active list (visit finished) — no point hammering the
  // API behind the "complete" screen.
  useEffect(() => {
    const t = setInterval(() => { if (oRef.current) refresh(); }, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  // A reject's photo came back → keep its URL and move to the reason step.
  useEffect(() => {
    if (!proofPhoto || !rejecting) return;
    const itemId = rejecting;
    rejectPhoto.current = proofPhoto;
    setRejecting(null);
    setProofPhoto(null);
    setReasonFor(itemId);
  }, [proofPhoto, rejecting]);

  // The order left the active list — the customer finished the try-on (kept everything or
  // the visit auto-closed). Show a done state instead of a blank screen.
  if (!o) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <BrutalStatusBar />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SP.l, gap: 6 }}>
          <Feather name="check-circle" size={44} color={C.faint} />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 19, color: C.ink, marginTop: 10 }}>Try-on complete</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, textAlign: 'center' }}>The customer finished the try-on. If you're carrying any returns, drop them at the store.</Text>
          <View style={{ height: SP.m }} />
          <BrutalButton label="Back to deliveries" icon="arrow-left" onPress={() => nav.popToTop()} />
        </View>
      </View>
    );
  }

  // The server clock is authoritative. Until the window timestamp is known (the brief
  // moment right after opening), treat it as "starting", NOT expired — a null window must
  // never read as "time up" and let the driver close a visit that just began.
  const parsed = o.doorWindowExpiresAt ? Date.parse(o.doorWindowExpiresAt) : NaN;
  const windowKnown = Number.isFinite(parsed);
  const endsAt = windowKnown ? parsed : Date.now();
  const expired = windowKnown && endsAt <= Date.now();
  const pendingReturns = o.items.filter(it => it.doorState === 'return_requested').length;
  const undecidedCount = o.items.filter(it => (it.doorState ?? 'undecided') === 'undecided').length;
  // The driver may finish only once the window is known AND every requested return is
  // resolved AND either the window has expired or the customer has decided every item —
  // finishing early would silently mark the customer's still-being-tried items as kept.
  const canFinish = windowKnown && pendingReturns === 0 && (expired || undecidedCount === 0);

  const camera = (title: string, hint: string) => nav.navigate('ProofCamera', { title, hint });
  const startReject = (itemId: string) => { setRejecting(itemId); camera('Rejected item', 'Photograph the item you are refusing to take back'); };
  const doAccept = async (itemId: string) => { setBusy(true); await acceptReturn(id, itemId); setBusy(false); };
  const pickReason = async (reason: string) => {
    const itemId = reasonFor;
    const photo = rejectPhoto.current;
    setReasonFor(null);
    if (!itemId) return;
    setBusy(true);
    await rejectReturn(id, itemId, reason, photo ? [photo] : []);
    rejectPhoto.current = null;
    setBusy(false);
  };
  const finish = async () => { setBusy(true); const ok = await finishDoor(id); setBusy(false); if (ok) nav.popToTop(); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      {/* timer header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: SP.l, paddingBottom: SP.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.s }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: C.ink, letterSpacing: -0.5 }}>At the door</Text>
            <Text numberOfLines={1} style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.dim }}>{o.customer.name} · Try & Buy</Text>
          </View>
          {windowKnown ? (
            <Countdown endsAt={endsAt} big />
          ) : (
            <View style={[{ paddingHorizontal: SP.m, paddingVertical: SP.s }, BORDER(1)]}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.dim }}>Starting…</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.m }}>
          <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: SP.s + 2, backgroundColor: C.mute }, BORDER(1)]}>
            <Feather name="smartphone" size={13} color={C.ink} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.ink, flex: 1 }}>Customer chooses in their app</Text>
          </View>
          <BrutalButton label="+5 min" variant="outline" small icon="clock" onPress={() => addExtension(id)} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginBottom: SP.m }}>
          {!windowKnown
            ? 'Starting the try-on…'
            : expired
            ? 'The window has ended. Finish the visit — anything the customer didn’t return counts as kept.'
            : 'Wait while the customer tries each item. When they ask to return one, accept it or inspect and reject it.'}
        </Text>

        {o.items.map(it => {
          const state = (it.doorState ?? 'undecided') as DoorItemState;
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

              {state === 'undecided' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: SP.m }}>
                  <Feather name="clock" size={15} color={C.dim} />
                  <Text style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14, color: C.dim }}>Waiting for the customer…</Text>
                </View>
              ) : state === 'return_requested' ? (
                <View style={{ flexDirection: 'row' }}>
                  <Pressable disabled={busy} onPress={() => doAccept(it.id)} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: C.ink, borderRightWidth: 1, borderColor: C.hairline }}>
                    <Feather name="check" size={16} color={C.white} />
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.white, marginTop: 3 }}>Accept return</Text>
                  </Pressable>
                  <Pressable disabled={busy} onPress={() => startReject(it.id)} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: C.white }}>
                    <Feather name="search" size={16} color={C.ink} />
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink, marginTop: 3 }}>Inspect · reject</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: SP.m, backgroundColor: STATE_CHIP[state].solid ? C.ink : C.mute }}>
                  <Feather name={STATE_CHIP[state].icon} size={15} color={STATE_CHIP[state].solid ? C.white : C.ink} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: STATE_CHIP[state].solid ? C.white : C.ink, letterSpacing: 0.3 }}>{STATE_CHIP[state].label}</Text>
                    {state === 'return_rejected' && !!it.agentReturnReason && (
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: STATE_CHIP[state].solid ? C.white : C.dim, marginTop: 1 }}>{it.agentReturnReason}</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* finish */}
      <View style={{ padding: SP.l, paddingBottom: insets.bottom + 14, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.hairline }}>
        {!canFinish && (
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.dim, textAlign: 'center', marginBottom: SP.s }}>
            {pendingReturns > 0
              ? `Respond to ${pendingReturns} pending ${pendingReturns === 1 ? 'return' : 'returns'} before finishing`
              : `Waiting on the customer to choose ${undecidedCount} ${undecidedCount === 1 ? 'item' : 'items'}`}
          </Text>
        )}
        <BrutalButton label={expired ? 'Finish · mark remaining kept' : 'Finish visit'} icon="check-square" big block disabled={busy || !canFinish} onPress={finish} />
        <View style={{ height: SP.s }} />
        <BrutalButton label="Couldn't deliver" variant="outline" icon="phone-off" block onPress={() => setUndelivModal(true)} />
      </View>

      {/* reason picker (reject) */}
      <Modal transparent visible={!!reasonFor} animationType="fade" onRequestClose={() => setReasonFor(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={[{ backgroundColor: C.bg, maxHeight: '85%', width: '100%', maxWidth: 560, alignSelf: 'center' }, BORDER(2)]}>
            <ScrollView bounces={false} contentContainerStyle={{ padding: SP.l, paddingBottom: insets.bottom + 20 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: C.ink, marginBottom: 4 }}>Why reject this return?</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginBottom: SP.m }}>Photo attached. The item stays with the customer.</Text>
              {RETURN_INSPECT_REASONS.map(r => (
                <Pressable key={r} disabled={busy} onPress={() => pickReason(r)} style={[{ padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: C.ink }}>{r}</Text>
                </Pressable>
              ))}
              <BrutalButton label="Cancel" variant="ghost" block onPress={() => setReasonFor(null)} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* couldn't deliver */}
      <Modal transparent visible={undelivModal} animationType="fade" onRequestClose={() => setUndelivModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={[{ backgroundColor: C.bg, maxHeight: '85%', width: '100%', maxWidth: 560, alignSelf: 'center' }, BORDER(2)]}>
            <ScrollView bounces={false} contentContainerStyle={{ padding: SP.l, paddingBottom: insets.bottom + 20 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: C.ink, marginBottom: 4 }}>Couldn't deliver</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginBottom: SP.m }}>Why? The order is logged as undelivered.</Text>
              {UNDELIVERED_REASONS.map(r => (
                <Pressable key={r} onPress={() => { setUndelivModal(false); markUndelivered(id, r); nav.popToTop(); }} style={[{ padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: C.ink }}>{r}</Text>
                </Pressable>
              ))}
              <BrutalButton label="Cancel" variant="ghost" block onPress={() => setUndelivModal(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

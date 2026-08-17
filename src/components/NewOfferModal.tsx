// Global "new order arrived" modal. Mounts once at the app root (a sibling of the
// navigator) so it can appear over ANY screen — and re-appears when the app is reopened
// while an unclaimed offer is waiting. Driven by the live offers feed in AppState (push
// wakes it instantly when FCM is configured; otherwise the long-poll surfaces it). Accept
// claims the order; the top-right ✕ dismisses just this offer. Auto-dismisses if another
// driver claims it first. Vibrates on arrival (OS push carries the sound when enabled).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, Vibration, AppState as RNAppState } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, SP, RADIUS } from '../theme/brutal';
import { BrutalButton } from './Brutal';
import { useApp } from '../state/AppState';
import { METHOD_LABEL } from '../data/mockData';

export function NewOfferModal({ onAccepted }: { onAccepted?: () => void }) {
  const { offers, acceptOffer } = useApp();
  const [shownId, setShownId] = useState<string | null>(null);
  const dismissed = useRef<Set<string>>(new Set());

  // Surface the newest offer we haven't already shown or dismissed.
  useEffect(() => {
    if (shownId && !offers.some((o) => o.id === shownId)) setShownId(null); // claimed by someone else
    if (shownId) return;
    const next = offers.find((o) => !dismissed.current.has(o.id));
    if (next) {
      setShownId(next.id);
      Vibration.vibrate(Platform_OS_pattern());
    }
  }, [offers, shownId]);

  // Re-check the queue when the app returns to the foreground (an offer may have arrived
  // via a silent data push while backgrounded).
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active' && !shownId) {
        const next = offers.find((o) => !dismissed.current.has(o.id));
        if (next) { setShownId(next.id); Vibration.vibrate(Platform_OS_pattern()); }
      }
    });
    return () => sub.remove();
  }, [offers, shownId]);

  const [accepting, setAccepting] = useState(false);
  const offer = offers.find((o) => o.id === shownId) ?? null;
  if (!offer) return null;

  // Keep the dismissed set from growing without bound over a long shift.
  const remember = (offerId: string) => {
    dismissed.current.add(offerId);
    if (dismissed.current.size > 200) {
      dismissed.current.delete(dismissed.current.values().next().value as string);
    }
  };
  const close = () => { remember(offer.id); setShownId(null); };
  // Non-optimistic: only dismiss + navigate once THIS driver actually won the claim. On a
  // lost race acceptOffer surfaces "Already taken" and the offer drops from the feed.
  const accept = async () => {
    setAccepting(true);
    const won = await acceptOffer(offer.id);
    setAccepting(false);
    remember(offer.id);
    setShownId(null);
    if (won) onAccepted?.();
  };
  const isReverse = offer.method === 'REVERSE_PICKUP';

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,10,10,0.55)', alignItems: 'center', justifyContent: 'center', padding: SP.l }}>
        <View style={{ width: '100%', maxWidth: 420, backgroundColor: C.white, borderRadius: RADIUS.lg, padding: SP.l, gap: SP.m }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={isReverse ? 'corner-up-left' : 'package'} size={20} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.8, color: C.dim, textTransform: 'uppercase' }}>New {isReverse ? 'pickup' : 'order'}</Text>
              <Text numberOfLines={2} style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: C.ink, marginTop: 1 }}>{METHOD_LABEL[offer.method]}</Text>
            </View>
            <Pressable onPress={close} hitSlop={10} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.mute, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.ink} />
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="shopping-bag" size={14} color={C.dim} />
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14, color: C.ink }}>{offer.store.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="map-pin" size={14} color={C.dim} />
              <Text numberOfLines={2} style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: C.dim }}>{offer.customer.addr || offer.customer.name}</Text>
            </View>
            {offer.payment === 'COD' && (
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.ink, borderRadius: 999 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.white }}>COD ₹{offer.codAmount}</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.xs }}>
            <View style={{ flex: 1 }}>
              <BrutalButton label="Dismiss" variant="outline" block disabled={accepting} onPress={close} />
            </View>
            <View style={{ flex: 2 }}>
              <BrutalButton label={accepting ? 'Accepting…' : isReverse ? 'Accept pickup' : 'Accept order'} icon="check" block disabled={accepting} onPress={accept} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// A short double-buzz on arrival.
function Platform_OS_pattern(): number[] {
  return [0, 220, 120, 220];
}

// Shared delivery UI atoms: method badge, item policy badge, live countdown,
// and the per-method progress track. Kept here so the Deliveries card, Order
// detail, Door and Returns screens all render identical pieces.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, BORDER } from '../theme/brutal';
import {
  DeliveryMethod, METHOD_TAG, ItemPolicy, POLICY_LABEL, OrderState, TRACK_POINTS,
} from '../data/mockData';

// ─── METHOD BADGE ──────────────────────────────────────────
export function MethodBadge({ method }: { method: DeliveryMethod }) {
  const solid = method === 'TRY_AND_BUY';
  return (
    <View style={[{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: solid ? C.ink : C.white }, BORDER(1)]}>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 1, color: solid ? C.white : C.ink }}>
        {METHOD_TAG[method]}
      </Text>
    </View>
  );
}

// ─── POLICY BADGE — Return (outline) / Replace (mute) / Final (solid) ──
const POLICY_ICON: Record<ItemPolicy, keyof typeof Feather.glyphMap> = {
  RETURN: 'rotate-ccw', REPLACE: 'repeat', FINAL: 'lock',
};
export function PolicyBadge({ policy }: { policy: ItemPolicy }) {
  const bg = policy === 'FINAL' ? C.ink : policy === 'REPLACE' ? C.mute : C.white;
  const fg = policy === 'FINAL' ? C.white : C.ink;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: bg }, BORDER(1)]}>
      <Feather name={POLICY_ICON[policy]} size={9} color={fg} />
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.5, color: fg }}>{POLICY_LABEL[policy].toUpperCase()}</Text>
    </View>
  );
}

// ─── LIVE COUNTDOWN — ticks every second, shows MM:SS ──────
export function Countdown({ endsAt, big }: { endsAt: number; big?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<any>(null);
  useEffect(() => {
    timer.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer.current);
  }, []);
  const remain = Math.max(0, endsAt - now);
  const m = Math.floor(remain / 60000);
  const s = Math.floor((remain % 60000) / 1000);
  const over = remain <= 0;
  const low = remain > 0 && remain < 5 * 60 * 1000;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: big ? 12 : 7, paddingVertical: big ? 8 : 4, backgroundColor: over || low ? C.ink : C.white }, BORDER(1)]}>
      <Feather name="clock" size={big ? 16 : 10} color={over || low ? C.white : C.ink} />
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: big ? 18 : 11, letterSpacing: 1, color: over || low ? C.white : C.ink }}>
        {over ? 'TIME UP' : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`}
      </Text>
    </View>
  );
}

// Static target chip (e.g. "60 MIN") for orders not yet on a live timer.
export function TargetChip({ minutes }: { minutes: number }) {
  const label = minutes >= 120 ? `${Math.round(minutes / 60)} HR` : `${minutes} MIN`;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: C.white }, BORDER(1)]}>
      <Feather name="target" size={10} color={C.dim} />
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 14, letterSpacing: 1, color: C.dim }}>{label}</Text>
    </View>
  );
}

// ─── PROGRESS TRACK — steps differ per delivery method ─────
export function ProgressTrack({ method, state }: { method: DeliveryMethod; state: OrderState }) {
  const points = TRACK_POINTS[method];
  // current index: highest point whose state has been reached.
  const order: OrderState[] = ['packed', 'picked_up', 'out_for_delivery', 'at_door', 'delivered', 'returning_to_store', 'returned_to_store'];
  // `undelivered` is a stall AT the out-for-delivery step, not progress past it.
  const reachedIdx = state === 'undelivered' ? order.indexOf('out_for_delivery') : order.indexOf(state);
  const curIdx = points.reduce((acc, p, i) => (order.indexOf(p.state) <= reachedIdx ? i : acc), 0);
  const done = (i: number) => {
    // a step is "done" if its state index <= reached and it's not the current frontier
    return order.indexOf(points[i].state) < reachedIdx || (i < curIdx);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
      {points.map((p, i) => {
        const isDone = done(i);
        const isCur = i === curIdx;
        const filled = isDone || isCur;
        return (
          <View key={p.state + i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? 'transparent' : (isDone || isCur ? C.ink : C.faint) }} />
              <View style={[{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? C.ink : C.white }, BORDER(1)]}>
                {isDone ? <Feather name="check" size={9} color={C.white} /> : <View style={{ width: 5, height: 5, backgroundColor: isCur ? C.white : C.faint }} />}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: i === points.length - 1 ? 'transparent' : (isDone ? C.ink : C.faint) }} />
            </View>
            <Text numberOfLines={1} style={{ fontFamily: isCur ? 'Inter_900Black' : 'SpaceMono_400Regular', fontSize: 11, letterSpacing: 0.3, color: filled ? C.ink : C.dim, marginTop: 4 }}>
              {p.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

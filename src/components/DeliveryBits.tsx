// Shared delivery UI atoms: method badge, item policy badge, live countdown,
// and the per-method progress track — restyled to the Trenzo design system.
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Icon, IconName, colors, radii, spacing } from '../ui';
import {
  DeliveryMethod,
  METHOD_TAG,
  ItemPolicy,
  POLICY_LABEL,
  OrderState,
  TRACK_POINTS,
} from '../data/mockData';

// ─── METHOD BADGE ──────────────────────────────────────────
export function MethodBadge({ method }: { method: DeliveryMethod }) {
  const solid = method === 'TRY_AND_BUY';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: solid ? colors.ink : colors.surface, borderColor: solid ? colors.ink : colors.hairline },
      ]}
    >
      <AppText variant="meta" color={solid ? colors.accentInk : colors.ink} style={styles.caps}>
        {METHOD_TAG[method]}
      </AppText>
    </View>
  );
}

// ─── POLICY BADGE ──────────────────────────────────────────
const POLICY_ICON: Record<ItemPolicy, IconName> = {
  RETURN: 'arrow-undo-outline',
  REPLACE: 'swap-horizontal',
  FINAL: 'lock-closed',
};
export function PolicyBadge({ policy }: { policy: ItemPolicy }) {
  const solid = policy === 'FINAL';
  const bg = solid ? colors.ink : policy === 'REPLACE' ? colors.canvas : colors.surface;
  const fg = solid ? colors.accentInk : colors.ink;
  return (
    <View style={[styles.badge, styles.row, { backgroundColor: bg, borderColor: solid ? colors.ink : colors.hairline }]}>
      <Icon name={POLICY_ICON[policy]} size={11} color={fg} />
      <AppText variant="meta" color={fg} style={styles.caps}>
        {POLICY_LABEL[policy]}
      </AppText>
    </View>
  );
}

// ─── LIVE COUNTDOWN ────────────────────────────────────────
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
  const hot = over || low;
  return (
    <View
      style={[
        styles.badge,
        styles.row,
        big && styles.big,
        { backgroundColor: hot ? colors.ink : colors.surface, borderColor: hot ? colors.ink : colors.hairline },
      ]}
    >
      <Icon name="time-outline" size={big ? 16 : 12} color={hot ? colors.accentInk : colors.ink} />
      <AppText variant={big ? 'cardTitle' : 'meta'} color={hot ? colors.accentInk : colors.ink}>
        {over ? 'Time up' : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`}
      </AppText>
    </View>
  );
}

// Static target chip (e.g. "60 min").
export function TargetChip({ minutes }: { minutes: number }) {
  const label = minutes >= 120 ? `${Math.round(minutes / 60)} hr` : `${minutes} min`;
  return (
    <View style={[styles.badge, styles.row, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <Icon name="timer-outline" size={12} color={colors.meta} />
      <AppText variant="meta" color={colors.meta}>
        {label}
      </AppText>
    </View>
  );
}

// ─── PROGRESS TRACK ────────────────────────────────────────
export function ProgressTrack({ method, state }: { method: DeliveryMethod; state: OrderState }) {
  const points = TRACK_POINTS[method];
  const order: OrderState[] = [
    'packed', 'picked_up', 'out_for_delivery', 'at_door', 'delivered', 'returning_to_store', 'returned_to_store',
  ];
  const reachedIdx =
    state === 'undelivered' ? order.indexOf('out_for_delivery') : order.indexOf(state);
  const curIdx = points.reduce((acc, p, i) => (order.indexOf(p.state) <= reachedIdx ? i : acc), 0);
  const done = (i: number) => order.indexOf(points[i].state) < reachedIdx || i < curIdx;
  return (
    <View style={styles.track}>
      {points.map((p, i) => {
        const isDone = done(i);
        const isCur = i === curIdx;
        const filled = isDone || isCur;
        return (
          <View key={p.state + i} style={styles.step}>
            <View style={styles.lineRow}>
              <View
                style={[styles.line, { backgroundColor: i === 0 ? 'transparent' : filled ? colors.ink : colors.hairline }]}
              />
              <View
                style={[
                  styles.dot,
                  { backgroundColor: filled ? colors.ink : colors.surface, borderColor: filled ? colors.ink : colors.hairline },
                ]}
              >
                {isDone ? (
                  <Icon name="checkmark" size={10} color={colors.accentInk} />
                ) : (
                  <View style={[styles.dotInner, { backgroundColor: isCur ? colors.accentInk : colors.inkMuted }]} />
                )}
              </View>
              <View
                style={[styles.line, { backgroundColor: i === points.length - 1 ? 'transparent' : isDone ? colors.ink : colors.hairline }]}
              />
            </View>
            <AppText variant="meta" color={filled ? colors.ink : colors.meta} numberOfLines={1} style={styles.stepLabel}>
              {p.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 1 },
  big: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  caps: { textTransform: 'uppercase', letterSpacing: 0.4 },
  track: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs },
  step: { flex: 1, alignItems: 'center' },
  lineRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  line: { flex: 1, height: 2 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: { width: 6, height: 6, borderRadius: 3 },
  stepLabel: { marginTop: spacing.xs, fontSize: 10 },
});

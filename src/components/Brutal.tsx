// Trendzo Partner — brutalism primitives, driver-tuned.
// Ported from ClosetX. Everything here is BIG, high-contrast, and single-tap
// because the user is a rider holding a phone in one hand. The headline
// component is <SwipeToConfirm> — the slide-to-act gesture every food/grocery
// rider app uses so deliveries can't be confirmed by an accidental tap.
import React, { ReactNode, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, TextInput, StatusBar, StyleSheet, ViewStyle, TextStyle,
  Animated, Modal, LayoutChangeEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue, useAnimatedStyle,
  withTiming, runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { C, T, BORDER, SP, ASCII, isNight } from '../theme/brutal';

const AReanimated = Reanimated.View;

// ─── STATUS BAR ────────────────────────────────────────────
export function BrutalStatusBar({ light }: { light?: boolean }) {
  return <StatusBar barStyle={light || isNight() ? 'light-content' : 'dark-content'} />;
}

// ─── BUTTON ────────────────────────────────────────────────
type BtnProps = {
  label: string;
  onPress?: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
  icon?: keyof typeof Feather.glyphMap;
  iconRight?: keyof typeof Feather.glyphMap;
  block?: boolean;
  small?: boolean;
  big?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};
export function BrutalButton({ label, onPress, variant = 'solid', icon, iconRight, block, small, big, disabled, style }: BtnProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.timing(scale, { toValue: 0.97, duration: 90, useNativeDriver: true }).start();
  const onOut = () => Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  const isSolid = variant === 'solid';
  const bg = disabled ? C.faint : isSolid ? C.ink : variant === 'ghost' ? 'transparent' : C.white;
  const fg = isSolid ? C.white : C.ink;
  const padV = big ? 18 : small ? SP.s : SP.m;
  const fontSize = big ? 18 : small ? 14 : 16;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, block && { alignSelf: 'stretch' }, style]}>
      <View style={[{ backgroundColor: bg }, variant !== 'ghost' && BORDER(1)]}>
        <Pressable
          disabled={disabled}
          onPressIn={onIn}
          onPressOut={onOut}
          onPress={onPress}
          style={{ paddingHorizontal: SP.l, paddingVertical: padV, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {icon && <Feather name={icon} size={big ? 18 : small ? 14 : 16} color={fg} />}
          <Text style={{ fontFamily: 'Inter_900Black', fontSize, color: fg, letterSpacing: 0.5 }}>
            {label.toUpperCase()}
          </Text>
          {iconRight && <Feather name={iconRight} size={big ? 18 : small ? 14 : 16} color={fg} />}
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── ICON BUTTON ───────────────────────────────────────────
export function BrutalIconBtn({ icon, onPress, size = 44, active }: { icon: keyof typeof Feather.glyphMap; onPress?: () => void; size?: number; active?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={[{ width: size, height: size, backgroundColor: active ? C.ink : C.white }, BORDER(1)]}>
        <Pressable
          onPressIn={() => Animated.timing(scale, { toValue: 0.92, duration: 90, useNativeDriver: true }).start()}
          onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start()}
          onPress={onPress}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name={icon} size={size * 0.45} color={active ? C.white : C.ink} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── CARD / BOX ────────────────────────────────────────────
export function BrutalCard({ children, style, padded = true, solid }: { children: ReactNode; style?: ViewStyle; padded?: boolean; solid?: boolean }) {
  return <View style={[{ backgroundColor: solid ? C.ink : C.white, padding: padded ? SP.l : 0 }, BORDER(1), style]}>{children}</View>;
}

// ─── INPUT ─────────────────────────────────────────────────
type InputProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  label?: string;
  secureTextEntry?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  keyboardType?: any;
  autoCapitalize?: any;
  maxLength?: number;
};
export function BrutalInput({ value, onChangeText, placeholder, label, secureTextEntry, icon, keyboardType, autoCapitalize, maxLength }: InputProps) {
  return (
    <View style={{ marginBottom: SP.l }}>
      {label && <Text style={[T.label, { marginBottom: 6 }]}>{`> ${label.toUpperCase()}`}</Text>}
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SP.m, paddingVertical: 16 }, BORDER(1)]}>
        {icon && <Feather name={icon} size={18} color={C.ink} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.dim}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 19, color: C.ink, padding: 0 }}
        />
      </View>
    </View>
  );
}

// ─── ASCII DIVIDER ─────────────────────────────────────────
export function AsciiDivider({ faint, style }: { faint?: boolean; style?: TextStyle }) {
  return <Text numberOfLines={1} style={[{ fontFamily: 'SpaceMono_400Regular', fontSize: 13, color: faint ? C.dim : C.ink }, style]}>{faint ? ASCII.hrFaint : ASCII.hr}</Text>;
}

export function DottedRule() {
  return <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 13, color: C.dim }}>{ASCII.hrDot}</Text>;
}

// ─── SCREEN HEADER ─────────────────────────────────────────
export function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SP.l, paddingTop: 56, paddingBottom: SP.m, backgroundColor: C.white }}>
        {onBack ? <BrutalIconBtn icon="arrow-left" onPress={onBack} size={40} /> : <View style={{ width: 40 }} />}
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 19, color: C.ink, letterSpacing: 1 }}>{title.toUpperCase()}</Text>
        {right ?? <View style={{ width: 40 }} />}
      </View>
      <View style={{ height: 1, backgroundColor: C.ink }} />
    </View>
  );
}

// ─── SECTION HEAD ─────────────────────────────────────────
export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ marginTop: SP.xl, marginBottom: SP.m }}>
      <AsciiDivider />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 22, color: C.ink, letterSpacing: -0.5 }}>
          {ASCII.caret} {title}
        </Text>
        {action && (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={[T.monoB, { fontSize: 14 }]}>{`[ ${action} ]`}</Text>
          </Pressable>
        )}
      </View>
      <AsciiDivider faint style={{ marginTop: 4 }} />
    </View>
  );
}

// ─── STAT TILE — big number + label, for earnings/stats grids ──
export function StatTile({ label, value, sub, solid, style }: { label: string; value: string; sub?: string; solid?: boolean; style?: ViewStyle }) {
  return (
    <View style={[{ padding: SP.m, backgroundColor: solid ? C.ink : C.white, minWidth: 0 }, BORDER(1), style]}>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 1, color: solid ? C.white : C.dim }}>{label.toUpperCase()}</Text>
      <Text style={{ fontFamily: 'Inter_900Black', fontSize: 26, letterSpacing: -1, color: solid ? C.white : C.ink, marginTop: 4 }}>{value}</Text>
      {sub && <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: solid ? C.white : C.dim, marginTop: 1 }}>{sub}</Text>}
    </View>
  );
}

// ─── ROW — label/value line used across detail screens ─────
export function InfoRow({ label, value, icon, onPress }: { label: string; value: string; icon?: keyof typeof Feather.glyphMap; onPress?: () => void }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
      {icon && (
        <View style={[{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
          <Feather name={icon} size={16} color={C.ink} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 1, color: C.dim }}>{label.toUpperCase()}</Text>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: C.ink, marginTop: 2 }}>{value}</Text>
      </View>
      {onPress && <Feather name="chevron-right" size={20} color={C.ink} />}
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{body}</Pressable>;
  return body;
}

// ─── FADE IN UP ────────────────────────────────────────────
export function FadeInUp({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: ViewStyle }) {
  const o = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 360, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity: o, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
}

// ─── MAP PLACEHOLDER — faux navigation panel ───────────────
// A real build drops a MapView here. For now a brutalist grid + route line so
// the rider sees a clear "navigation" surface without a maps SDK/key.
export function MapPanel({ height = 200, label = 'LIVE NAVIGATION', from = 'YOU', to = 'STORE' }: { height?: number; label?: string; from?: string; to?: string }) {
  return (
    <View style={[{ height, backgroundColor: C.mute, overflow: 'hidden' }, BORDER(1)]}>
      {/* grid */}
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={'h' + i} style={{ position: 'absolute', left: 0, right: 0, top: (i + 1) * (height / 9), height: 1, backgroundColor: C.hairline }} />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={'v' + i} style={{ position: 'absolute', top: 0, bottom: 0, left: (i + 1) * 56, width: 1, backgroundColor: C.hairline }} />
      ))}
      {/* diagonal route */}
      <View style={{ position: 'absolute', top: height * 0.7, left: 24, width: 24, height: 24, borderRadius: 12, backgroundColor: C.white, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink }} />
      </View>
      <View style={{ position: 'absolute', top: 24, right: 24, width: 28, height: 28, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="map-pin" size={14} color={C.white} />
      </View>
      <View style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.ink }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: C.white, letterSpacing: 1 }}>{label}</Text>
      </View>
      <View style={{ position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', gap: 6 }}>
        <View style={{ paddingHorizontal: 6, paddingVertical: 3, backgroundColor: C.white, borderWidth: 1, borderColor: C.ink }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.ink }}>{from}</Text>
        </View>
        <Feather name="arrow-right" size={12} color={C.ink} style={{ alignSelf: 'center' }} />
        <View style={{ paddingHorizontal: 6, paddingVertical: 3, backgroundColor: C.ink }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.white }}>{to}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── SWIPE TO CONFIRM ──────────────────────────────────────
// The rider drags the knob fully to the right to commit an irreversible step
// (arrived / picked up / delivered). Slides straight back if released early —
// no bounce. At rest the bar is all white with the black knob flush left, so
// nothing "peeks" out of the track.
const TRACK_H = 60;     // track height
const PAD = 4;          // inner padding between knob and border
const KNOB = TRACK_H - PAD * 2;  // knob is the track height minus padding
export function SwipeToConfirm({ label, onConfirm, icon = 'chevrons-right', disabled }: { label: string; onConfirm: () => void; icon?: keyof typeof Feather.glyphMap; disabled?: boolean }) {
  const x = useSharedValue(0);
  const trackW = useSharedValue(0);
  const start = useSharedValue(0);

  // Latest onConfirm via ref so the gesture (memoized below) always calls the
  // current handler without being recreated on every parent re-render.
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;
  const fire = () => { onConfirmRef.current?.(); };
  const onLayout = (e: LayoutChangeEvent) => { trackW.value = e.nativeEvent.layout.width; };

  // Memoize the gesture — recreating it mid-drag (e.g. the order countdown
  // ticking once a second) CANCELS the swipe on Android, making it snap back.
  // Only rebuild when `disabled` flips, which never happens during a drag.
  const gesture = useMemo(() =>
    Gesture.Pan()
      .enabled(!disabled)
      .activeOffsetX([-8, 8])
      .onBegin(() => { start.value = x.value; })
      .onUpdate((e) => {
        const max = trackW.value - KNOB - PAD * 2;
        let nx = start.value + e.translationX;
        if (nx < 0) nx = 0;
        else if (nx > max) nx = max;
        x.value = nx;
      })
      .onEnd(() => {
        const max = trackW.value - KNOB - PAD * 2;
        if (max > 0 && x.value >= max * 0.78) {
          runOnJS(fire)();              // commit
          x.value = withTiming(0, { duration: 220 });  // re-arm
        } else {
          x.value = withTiming(0, { duration: 160 });   // snap back
        }
      }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [disabled]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // Black trail sits exactly under + behind the knob (knob right edge = fill right edge), so it never peeks at rest.
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + KNOB + PAD }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, Math.max(1, (trackW.value - KNOB) * 0.45)], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View
      onLayout={onLayout}
      style={[{ height: TRACK_H, backgroundColor: disabled ? C.mute : C.white, justifyContent: 'center', overflow: 'hidden' }, BORDER(2)]}
    >
      {/* black trail that grows from the left, capped under the knob */}
      <AReanimated style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: disabled ? C.faint : C.ink }, fillStyle]} />
      <AReanimated style={[{ position: 'absolute', left: KNOB + PAD, right: SP.m, alignItems: 'center' }, labelStyle]} pointerEvents="none">
        <Text numberOfLines={1} style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: disabled ? C.dim : C.ink, letterSpacing: 1 }}>{label.toUpperCase()}</Text>
      </AReanimated>
      <GestureDetector gesture={gesture}>
        <AReanimated style={[{ width: KNOB, height: KNOB, marginLeft: PAD, backgroundColor: disabled ? C.dim : C.ink, alignItems: 'center', justifyContent: 'center' }, knobStyle]}>
          <Feather name={icon} size={24} color={C.white} />
        </AReanimated>
      </GestureDetector>
    </View>
  );
}

// ─── TOAST ─────────────────────────────────────────────────
export function BrutalToast({ toast, onHide }: { toast: { title: string; msg?: string; icon?: string } | null; onHide: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: toast ? 1 : 0, duration: 240, useNativeDriver: true }).start();
  }, [toast]);
  if (!toast) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 110, alignItems: 'center', zIndex: 9999, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }], opacity: anim }}
    >
      <Pressable onPress={onHide} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SP.m, paddingVertical: 12, backgroundColor: C.ink, maxWidth: '92%' }, BORDER(1)]}>
        <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
          <Feather name={(toast.icon as any) || 'check'} size={14} color={C.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 15, color: C.white, letterSpacing: 0.5 }}>{toast.title.toUpperCase()}</Text>
          {toast.msg && <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: C.white, opacity: 0.75, marginTop: 1 }} numberOfLines={1}>{toast.msg}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── CONFIRM MODAL ─────────────────────────────────────────
export function BrutalConfirm({ confirm, onHide }: { confirm: { title: string; msg?: string; confirmLabel?: string; cancelLabel?: string; onConfirm?: () => void; danger?: boolean; icon?: string } | null; onHide: () => void }) {
  if (!confirm) return null;
  const danger = !!confirm.danger;
  return (
    <Modal transparent visible={!!confirm} animationType="fade" onRequestClose={onHide}>
      <Pressable onPress={onHide} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SP.l }}>
        <View onStartShouldSetResponder={() => true} style={[{ width: '100%', maxWidth: 400, backgroundColor: C.white }, BORDER(2)]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.m, backgroundColor: C.ink }}>
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
              <Feather name={(confirm.icon as any) || (danger ? 'alert-triangle' : 'info')} size={14} color={C.ink} />
            </View>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 15, color: C.white, letterSpacing: 1, flex: 1 }}>{confirm.title.toUpperCase()}</Text>
          </View>
          {confirm.msg && (
            <View style={{ padding: SP.l }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 17, color: C.ink, lineHeight: 23 }}>{confirm.msg}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: C.ink }}>
            <Pressable onPress={onHide} style={{ flex: 1, padding: SP.m, alignItems: 'center', backgroundColor: C.white, borderRightWidth: 1, borderColor: C.ink }}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.ink, letterSpacing: 0.5 }}>{(confirm.cancelLabel || 'CANCEL').toUpperCase()}</Text>
            </Pressable>
            <Pressable onPress={() => { confirm.onConfirm?.(); onHide(); }} style={{ flex: 1, padding: SP.m, alignItems: 'center', backgroundColor: C.ink }}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.white, letterSpacing: 0.5 }}>{(confirm.confirmLabel || (danger ? 'CONFIRM' : 'OK')).toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export const styles = StyleSheet.create({});

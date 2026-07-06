// Trendzo Partner — shared primitives, restyled to the Trenzo mockup system.
// Same component names + props as before (so every screen keeps working); only
// the visuals change: monochrome, warm-gray canvas, white rounded cards, pill
// CTAs, Inter type. <SwipeToConfirm> keeps its exact gesture logic.
import React, { ReactNode, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, TextInput, StatusBar, StyleSheet, ViewStyle,
  Animated, Modal, LayoutChangeEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { C, T, BORDER, SP, RADIUS } from '../theme/brutal';

const AReanimated = Reanimated.View;

// ─── STATUS BAR ────────────────────────────────────────────
export function BrutalStatusBar({ light }: { light?: boolean }) {
  return <StatusBar barStyle={light ? 'light-content' : 'dark-content'} />;
}

// ─── BUTTON (pill CTA) ─────────────────────────────────────
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
  const fg = disabled ? C.white : isSolid ? C.white : C.ink;
  const bordered = variant !== 'solid';
  const padV = big ? 17 : small ? 10 : 15;
  const fontSize = big ? 17 : small ? 14 : 16;
  const iconSize = big ? 18 : small ? 14 : 16;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, block && { alignSelf: 'stretch' }, style]}>
      <Pressable
        disabled={disabled}
        onPressIn={onIn}
        onPressOut={onOut}
        onPress={onPress}
        style={{
          backgroundColor: bg,
          borderRadius: RADIUS.pill,
          borderWidth: bordered ? 1.5 : 0,
          borderColor: variant === 'ghost' ? C.ink : C.hairline,
          paddingHorizontal: SP.l,
          paddingVertical: padV,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {icon && <Feather name={icon} size={iconSize} color={fg} />}
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize, color: fg, letterSpacing: 0.2 }}>{label}</Text>
        {iconRight && <Feather name={iconRight} size={iconSize} color={fg} />}
      </Pressable>
    </Animated.View>
  );
}

// ─── ICON BUTTON ───────────────────────────────────────────
export function BrutalIconBtn({ icon, onPress, size = 44, active }: { icon: keyof typeof Feather.glyphMap; onPress?: () => void; size?: number; active?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={() => Animated.timing(scale, { toValue: 0.92, duration: 90, useNativeDriver: true }).start()}
        onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start()}
        onPress={onPress}
        style={{
          width: size,
          height: size,
          borderRadius: RADIUS.pill,
          backgroundColor: active ? C.ink : C.white,
          borderWidth: active ? 0 : 1,
          borderColor: C.hairline,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name={icon} size={size * 0.44} color={active ? C.white : C.ink} />
      </Pressable>
    </Animated.View>
  );
}

// ─── CARD ──────────────────────────────────────────────────
export function BrutalCard({ children, style, padded = true, solid }: { children: ReactNode; style?: ViewStyle; padded?: boolean; solid?: boolean }) {
  return (
    <View style={[{ backgroundColor: solid ? C.ink : C.white, padding: padded ? SP.l : 0, borderRadius: RADIUS.lg }, style]}>
      {children}
    </View>
  );
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
      {label && <Text style={[T.label, { marginBottom: 8, marginLeft: 2 }]}>{label}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SP.m, backgroundColor: C.white, borderRadius: RADIUS.sm + 4, borderWidth: 1.5, borderColor: C.hairline }}>
        {icon && <Feather name={icon} size={18} color={C.dim} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.faint}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 16, color: C.ink, paddingVertical: 15 }}
        />
      </View>
    </View>
  );
}

// ─── DIVIDERS (now thin hairlines) ─────────────────────────
export function AsciiDivider({ faint, style }: { faint?: boolean; style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: C.hairline, opacity: faint ? 0.6 : 1 }, style]} />;
}
export function DottedRule() {
  return <View style={{ height: 1, backgroundColor: C.hairline }} />;
}

// ─── SCREEN HEADER ─────────────────────────────────────────
export function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SP.l, paddingTop: 54, paddingBottom: SP.m, backgroundColor: C.bg, gap: SP.m }}>
      {onBack ? <BrutalIconBtn icon="chevron-left" onPress={onBack} size={40} /> : null}
      <Text numberOfLines={1} style={[T.h2, { flex: 1 }]}>{title}</Text>
      {right ?? null}
    </View>
  );
}

// ─── SECTION HEAD ─────────────────────────────────────────
export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ marginTop: SP.xl, marginBottom: SP.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={T.label}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.ink }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── STAT TILE ─────────────────────────────────────────────
export function StatTile({ label, value, sub, solid, style }: { label: string; value: string; sub?: string; solid?: boolean; style?: ViewStyle }) {
  const onDark = solid ? '#FFFFFF' : C.ink;
  const onDarkDim = solid ? 'rgba(255,255,255,0.65)' : C.dim;
  return (
    <View style={[{ padding: SP.l, backgroundColor: solid ? C.ink : C.white, borderRadius: RADIUS.lg, minWidth: 0 }, style]}>
      <Text style={[T.label, { color: onDarkDim }]}>{label}</Text>
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8, color: onDark, marginTop: 6 }}>{value}</Text>
      {sub && <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: onDarkDim, marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

// ─── INFO ROW ──────────────────────────────────────────────
export function InfoRow({ label, value, icon, onPress }: { label: string; value: string; icon?: keyof typeof Feather.glyphMap; onPress?: () => void }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
      {icon && (
        <View style={{ width: 38, height: 38, borderRadius: RADIUS.sm + 2, backgroundColor: C.mute, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={16} color={C.ink} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={T.label}>{label}</Text>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: C.ink, marginTop: 3, letterSpacing: -0.2 }}>{value}</Text>
      </View>
      {onPress && <Feather name="chevron-right" size={20} color={C.faint} />}
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

// ─── MAP PLACEHOLDER ───────────────────────────────────────
export function MapPanel({ height = 200, label = 'Live navigation', from = 'You', to = 'Store' }: { height?: number; label?: string; from?: string; to?: string }) {
  return (
    <View style={{ height, backgroundColor: C.mute, overflow: 'hidden', borderRadius: RADIUS.lg }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={'h' + i} style={{ position: 'absolute', left: 0, right: 0, top: (i + 1) * (height / 9), height: 1, backgroundColor: C.hairline }} />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={'v' + i} style={{ position: 'absolute', top: 0, bottom: 0, left: (i + 1) * 56, width: 1, backgroundColor: C.hairline }} />
      ))}
      <View style={{ position: 'absolute', top: height * 0.7, left: 24, width: 24, height: 24, borderRadius: 12, backgroundColor: C.white, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink }} />
      </View>
      <View style={{ position: 'absolute', top: 24, right: 24, width: 30, height: 30, borderRadius: 15, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="map-pin" size={14} color={C.white} />
      </View>
      <View style={{ position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.ink, borderRadius: RADIUS.pill }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.white, letterSpacing: 0.4 }}>{label}</Text>
      </View>
      <View style={{ position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.white, borderRadius: RADIUS.pill }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.ink }}>{from}</Text>
        </View>
        <Feather name="arrow-right" size={12} color={C.dim} />
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.ink, borderRadius: RADIUS.pill }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.white }}>{to}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── SWIPE TO CONFIRM (gesture logic unchanged; visuals restyled) ──
const TRACK_H = 60;
const PAD = 5;
const KNOB = TRACK_H - PAD * 2;
export function SwipeToConfirm({ label, onConfirm, icon = 'chevrons-right', disabled }: { label: string; onConfirm: () => void; icon?: keyof typeof Feather.glyphMap; disabled?: boolean }) {
  const x = useSharedValue(0);
  const trackW = useSharedValue(0);
  const start = useSharedValue(0);

  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;
  const fire = () => { onConfirmRef.current?.(); };
  const onLayout = (e: LayoutChangeEvent) => { trackW.value = e.nativeEvent.layout.width; };

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
          runOnJS(fire)();
          x.value = withTiming(0, { duration: 220 });
        } else {
          x.value = withTiming(0, { duration: 160 });
        }
      }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [disabled]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + KNOB + PAD }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, Math.max(1, (trackW.value - KNOB) * 0.45)], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View
      onLayout={onLayout}
      style={{ height: TRACK_H, borderRadius: RADIUS.pill, backgroundColor: disabled ? C.mute : C.white, borderWidth: 1.5, borderColor: C.hairline, justifyContent: 'center', overflow: 'hidden' }}
    >
      <AReanimated style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: disabled ? C.faint : C.ink, borderRadius: RADIUS.pill }, fillStyle]} />
      <AReanimated style={[{ position: 'absolute', left: KNOB + PAD, right: SP.m, alignItems: 'center' }, labelStyle]} pointerEvents="none">
        <Text numberOfLines={1} style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: disabled ? C.dim : C.ink, letterSpacing: 0.2 }}>{label}</Text>
      </AReanimated>
      <GestureDetector gesture={gesture}>
        <AReanimated style={[{ width: KNOB, height: KNOB, borderRadius: KNOB / 2, marginLeft: PAD, backgroundColor: disabled ? C.dim : C.ink, alignItems: 'center', justifyContent: 'center' }, knobStyle]}>
          <Feather name={icon} size={22} color={C.white} />
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
      <Pressable onPress={onHide} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SP.m, paddingVertical: 12, backgroundColor: C.ink, maxWidth: '92%', borderRadius: RADIUS.pill }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' }}>
          <Feather name={(toast.icon as any) || 'check'} size={14} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' }}>{toast.title}</Text>
          {toast.msg && <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }} numberOfLines={1}>{toast.msg}</Text>}
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
      <Pressable onPress={onHide} style={{ flex: 1, backgroundColor: 'rgba(10,10,10,0.55)', alignItems: 'center', justifyContent: 'center', padding: SP.l }}>
        <View onStartShouldSetResponder={() => true} style={{ width: '100%', maxWidth: 400, backgroundColor: C.white, borderRadius: RADIUS.lg, padding: SP.l, gap: SP.m }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? '#E5484D' : C.mute }}>
              <Feather name={(confirm.icon as any) || (danger ? 'alert-triangle' : 'info')} size={18} color={danger ? '#fff' : C.ink} />
            </View>
            <Text style={[T.h3, { flex: 1 }]}>{confirm.title}</Text>
          </View>
          {confirm.msg && <Text style={[T.body, { color: C.dim }]}>{confirm.msg}</Text>}
          <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.xs }}>
            <View style={{ flex: 1 }}>
              <BrutalButton label={confirm.cancelLabel || 'Cancel'} variant="outline" block onPress={onHide} />
            </View>
            <View style={{ flex: 1 }}>
              <BrutalButton
                label={confirm.confirmLabel || (danger ? 'Confirm' : 'OK')}
                block
                onPress={() => { confirm.onConfirm?.(); onHide(); }}
              />
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export const styles = StyleSheet.create({});

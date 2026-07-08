import React, { useEffect, useRef } from 'react';
import { Dimensions, StatusBar, StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, colors, radii, spacing } from '../ui';

const { width } = Dimensions.get('window');
const ICON = 28;

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const barW = width - spacing.screenH * 2;

  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.cubic) });
  }, []);
  const riderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: p.value * (barW - ICON) }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ width: p.value * barW }));

  // Fire exactly once — `onDone` is a new closure each render, so keep it in a ref and give
  // the effect empty deps. Otherwise any re-render (auth hydrate, offers poll, toasts…) would
  // reset the timer and the splash would never advance.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <StatusBar barStyle="dark-content" />

      <MotiView
        from={{ opacity: 0, translateY: -6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.topRow}
      >
        <View style={styles.dot} />
        <AppText variant="sectionLabel" color={colors.meta}>
          Trendzo · Partner
        </AppText>
      </MotiView>

      <View style={styles.hero}>
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 560, delay: 150, easing: Easing.out(Easing.cubic) }}
        >
          <AppText variant="display" color={colors.ink} style={styles.word}>
            TRENDZO
          </AppText>
        </MotiView>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 480, type: 'timing', duration: 400 }}
          style={styles.badge}
        >
          <MaterialCommunityIcons name="moped" size={16} color={colors.accentInk} />
          <AppText variant="meta" color={colors.accentInk} style={styles.badgeText}>
            Delivery Partner
          </AppText>
        </MotiView>
      </View>

      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 300, type: 'timing', duration: 400 }}
        style={styles.bottom}
      >
        <View style={styles.riderTrack} pointerEvents="none">
          <Animated.View style={[styles.rider, riderStyle]}>
            <MaterialCommunityIcons name="moped" size={ICON} color={colors.ink} />
          </Animated.View>
        </View>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, fillStyle]} />
        </View>
        <AppText variant="meta" color={colors.meta} style={styles.caption}>
          Connecting to dispatch…
        </AppText>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.screenH },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  word: { fontSize: 56, lineHeight: 60, letterSpacing: -2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  badgeText: { textTransform: 'uppercase', letterSpacing: 0.6 },
  bottom: { width: '100%' },
  riderTrack: { height: 32, justifyContent: 'flex-end' },
  rider: { position: 'absolute', left: 0, bottom: 0 },
  barTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.hairline,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  barFill: { height: 3, backgroundColor: colors.ink },
  caption: { marginTop: spacing.md, textAlign: 'center' },
});

import React, { useEffect } from 'react';
import { View, Text, StatusBar, StyleSheet, Dimensions } from 'react-native';
import { MotiView, MotiText } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const BAR_W = width - 48;   // loading bar width (screen minus root padding)
const ICON = 30;            // scooter glyph size

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  // One value drives BOTH the scooter and the loading line, so the line's tip
  // always sits under the scooter as it crosses left → right, exactly once.
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.cubic) });
  }, []);
  const riderStyle = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * BAR_W - ICON }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: p.value * BAR_W }));

  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* scan grid */}
      <View style={styles.gridWrap} pointerEvents="none">
        {Array.from({ length: 24 }).map((_, i) => (
          <View key={i} style={[styles.gridLine, { top: i * 40 }]} />
        ))}
      </View>

      {/* top status */}
      <MotiView from={{ opacity: 0, translateY: -8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }} style={styles.topRow}>
        <View style={styles.topDot} />
        <Text style={styles.topMono}>TRENDZO · PARTNER OS</Text>
        <Text style={[styles.topMono, { opacity: 0.5 }]}>v1.0</Text>
      </MotiView>

      {/* hero wordmark */}
      <View style={styles.heroWrap}>
        <View style={styles.maskRow}>
          <MotiView from={{ translateY: 80 }} animate={{ translateY: 0 }} transition={{ type: 'timing', duration: 640, delay: 200, easing: Easing.out(Easing.cubic) }}>
            <Text style={styles.letter}>TRENDZO</Text>
          </MotiView>
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 520, type: 'timing', duration: 380 }}
          style={styles.badge}
        >
          <MaterialCommunityIcons name="moped" size={18} color="#000" />
          <Text style={styles.badgeText}>DELIVERY PARTNER</Text>
        </MotiView>

        <MotiText from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 760, type: 'timing', duration: 460 }} style={styles.tagline}>
          RIDE · DELIVER · EARN
        </MotiText>
      </View>

      {/* bottom meta — scooty rides across the loading bar */}
      <View style={styles.bottomWrap}>
        {/* scooty driving in from off-screen left, out to the right, on a dashed road */}
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 300, type: 'timing', duration: 400 }} style={{ width: '100%' }}>
          {/* scooter rides across once; the loading line fills behind it */}
          <View style={styles.riderTrack} pointerEvents="none">
            <Animated.View style={[styles.rider, riderStyle]}>
              <MaterialCommunityIcons name="moped" size={ICON} color="#fff" />
            </Animated.View>
          </View>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, fillStyle]} />
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaMono}>{'> CONNECTING_DISPATCH'}</Text>
            <MotiText from={{ opacity: 0.3 }} animate={{ opacity: 1 }} transition={{ loop: true, type: 'timing', duration: 600 }} style={styles.metaMono}>░▒▓█▓▒░</MotiText>
          </View>
          <View style={[styles.metaRow, { marginTop: 6 }]}>
            <Text style={[styles.metaMono, { opacity: 0.5 }]}>ZONE · INDORE</Text>
            <Text style={[styles.metaMono, { opacity: 0.5 }]}>GPS · LOCKED</Text>
            <Text style={[styles.metaMono, { opacity: 0.5 }]}>SECURE</Text>
          </View>
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24, paddingTop: 70, paddingBottom: 50 },
  gridWrap: { ...StyleSheet.absoluteFillObject, opacity: 0.06 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#fff' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topDot: { width: 6, height: 6, backgroundColor: '#fff' },
  topMono: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#fff', letterSpacing: 1.5 },
  heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  maskRow: { overflow: 'hidden' },
  letter: { fontFamily: 'Inter_900Black', fontSize: 54, color: '#fff', letterSpacing: -3, lineHeight: 58 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, marginTop: 18 },
  badgeText: { fontFamily: 'Inter_900Black', fontSize: 12, color: '#000', letterSpacing: 1 },
  tagline: { fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: '#fff', letterSpacing: 3, marginTop: 16 },
  // strip directly above the loading bar (same width as the bar); the scooter
  // emerges from the left edge and rides to the right edge once
  riderTrack: { height: 32, justifyContent: 'flex-end', overflow: 'hidden' },
  rider: { position: 'absolute', left: 0, bottom: 0 },
  bottomWrap: { width: '100%' },
  barTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: 12 },
  barFill: { height: 3, backgroundColor: '#fff' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaMono: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: '#fff', letterSpacing: 1 },
});

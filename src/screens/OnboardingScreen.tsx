import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Pressable, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, SP, BORDER } from '../theme/brutal';
import { BrutalButton, BrutalStatusBar, AsciiDivider } from '../components/Brutal';

const { width } = Dimensions.get('window');

// Three dead-simple promises. Big icon, big words — readable for a rider who
// just wants to start earning.
const SLIDES = [
  { icon: 'package', kicker: 'STEP 01', title: 'YOUR ORDERS,\nALREADY HERE', body: 'Orders for your zone are assigned to you and appear on the Deliveries tab. Nothing to accept — just start the next one.' },
  { icon: 'navigation', kicker: 'STEP 02', title: 'PICK UP,\nTHEN DROP', body: 'Collect clothes from the store, then deliver. Express, Standard or Try & Buy — the app shows the one big button for each step.' },
  { icon: 'camera', kicker: 'STEP 03', title: 'RECORD\nEVERY DOOR', body: 'A photo at every handover and return. You record the facts — the store decides refunds. Never collect cash on Try & Buy.' },
] as const;

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    } else {
      onDone();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />

      {/* top bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SP.l, paddingTop: insets.top + 12 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 14, letterSpacing: 1.5, color: C.ink }}>{'> TRENDZO DELIVERY'}</Text>
        <Pressable onPress={onDone} hitSlop={12}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 14, letterSpacing: 1, color: C.dim }}>SKIP</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={{ width, paddingHorizontal: SP.l, justifyContent: 'center' }}>
            <View style={[{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink, marginBottom: SP.xl }, BORDER(2)]}>
              <Feather name={s.icon as any} size={44} color={C.white} />
            </View>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 14, letterSpacing: 2, color: C.dim, marginBottom: 10 }}>{s.kicker}</Text>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 40, letterSpacing: -1.5, lineHeight: 46, color: C.ink }}>{s.title}</Text>
            <AsciiDivider style={{ marginTop: SP.l }} />
            <Text style={[T.body, { color: C.dim, marginTop: SP.l, fontSize: 19, lineHeight: 27, paddingRight: SP.l }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* bottom controls */}
      <View style={{ paddingHorizontal: SP.l, paddingBottom: insets.bottom + SP.l }}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: SP.l }}>
          {SLIDES.map((_, i) => (
            <View key={i} style={{ height: 4, flex: 1, backgroundColor: i <= index ? C.ink : C.hairline }} />
          ))}
        </View>
        <BrutalButton
          label={index === SLIDES.length - 1 ? "Let's start" : 'Next'}
          iconRight="arrow-right"
          onPress={next}
          block
          big
        />
      </View>
    </View>
  );
}

// PROFILE (Me). Read-only at launch: today's counts + km, the COD running total
// with the end-of-shift deposit, escalation contacts, help, documents, and
// agent details. No earnings/wallet — per-km pay is owned by Finance.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, AsciiDivider, StatTile, BrutalButton } from '../components/Brutal';
import { useApp } from '../state/AppState';
import { AGENT, TODAY, FAQS, ESCALATION, DOCUMENTS } from '../data/mockData';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { phone, signOut, showConfirm, codCollected, depositCash, deliveredToday, orders } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const pending = orders.filter(o => !['delivered', 'returned_to_store'].includes(o.state)).length;

  const deposit = () => showConfirm({
    title: 'Deposit cash?', icon: 'download',
    msg: `Hand ₹${codCollected} to the ops desk. The app total will reset to zero after reconciliation.`,
    confirmLabel: 'Deposit', onConfirm: depositCash,
  });
  const doSignOut = () => showConfirm({
    title: 'Sign out?', danger: true, icon: 'log-out',
    msg: 'You will need to log in again to see your assigned orders.',
    confirmLabel: 'Sign out', onConfirm: signOut,
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={{ paddingTop: insets.top + 14, paddingHorizontal: SP.l, paddingBottom: SP.l }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: C.white }}>{AGENT.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: C.ink, letterSpacing: -0.4 }}>{AGENT.name}</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: C.dim, marginTop: 1 }}>{AGENT.id} · {phone || AGENT.phone}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <Feather name="check-circle" size={11} color={C.ink} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.ink }}>Verified agent</Text>
              </View>
            </View>
          </View>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SP.m, padding: SP.s, backgroundColor: C.mute }, BORDER(1)]}>
            <Feather name="map" size={13} color={C.ink} />
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink, flex: 1 }}>{AGENT.zone}</Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.dim }}>{AGENT.shift}</Text>
          </View>
        </View>
        <View style={{ padding: SP.l }}>
          {/* agent details */}
          <Section title="DETAILS" />
          <Detail icon="truck" label="Vehicle" value={AGENT.vehicle} />
          <Detail icon="calendar" label="Joined" value={AGENT.joinedOn} />
          {DOCUMENTS.map(d => (
            <Detail key={d.name} icon={d.icon} label={d.name} value={d.sub} tag={d.status} />
          ))}

          {/* help / FAQ */}
          <Section title="HELP" />
          {FAQS.map((f, i) => (
            <Animated.View
              key={i}
              layout={LinearTransition.duration(220)}
              style={[{ padding: SP.m, marginBottom: SP.s, backgroundColor: C.white, overflow: 'hidden' }, BORDER(1)]}
            >
              <Pressable onPress={() => setOpenFaq(openFaq === i ? null : i)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 16, color: C.ink }}>{f.q}</Text>
                  <Feather name={openFaq === i ? 'minus' : 'plus'} size={16} color={C.ink} />
                </View>
              </Pressable>
              {openFaq === i && (
                <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: C.dim, marginTop: 8, lineHeight: 22 }}>{f.a}</Text>
                </Animated.View>
              )}
            </Animated.View>
          ))}

          {/* escalation */}
          <Section title="ESCALATION" />
          {ESCALATION.map(e => (
            <Pressable key={e.label} onPress={() => Linking.openURL(`tel:${e.tel}`).catch(() => {})} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
              <View style={{ width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }}>
                <Feather name={e.icon as any} size={16} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: C.ink }}>{e.label}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.dim }}>{e.sub}</Text>
              </View>
              <Feather name="phone" size={18} color={C.ink} />
            </Pressable>
          ))}

          <View style={{ marginTop: SP.xl }}>
            <BrutalButton label="Sign out" variant="outline" icon="log-out" block onPress={doSignOut} />
          </View>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.dim, textAlign: 'center', marginTop: SP.l }}>TRENDZO DELIVERY · AGENT APP · v1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return (
    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.dim, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: SP.xl, marginBottom: SP.m }}>{title}</Text>
  );
}

function Detail({ icon, label, value, tag }: { icon: any; label: string; value: string; tag?: string }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
      <View style={[{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
        <Feather name={icon} size={15} color={C.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: C.dim, letterSpacing: 1 }}>{label.toUpperCase()}</Text>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: C.ink, marginTop: 1 }}>{value}</Text>
      </View>
      {tag && (
        <View style={[{ paddingHorizontal: 6, paddingVertical: 3, backgroundColor: tag === 'VERIFIED' ? C.ink : C.white }, BORDER(1)]}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: tag === 'VERIFIED' ? C.white : C.ink }}>{tag}</Text>
        </View>
      )}
    </View>
  );
}

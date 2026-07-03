// PROFILE (Me). Read-only at launch: today's counts + km, the COD running total
// with the end-of-shift deposit, escalation contacts, help, documents, and
// agent details. No earnings/wallet — per-km pay is owned by Finance.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, AsciiDivider, StatTile, BrutalButton } from '../components/Brutal';
import { useApp } from '../state/AppState';
import { AGENT, TODAY, FAQS, ESCALATION, DOCUMENTS } from '../data/mockData';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { phone, signOut, showConfirm, night, toggleNight, codCollected, depositCash, deliveredToday, orders } = useApp();
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
        <View style={{ paddingTop: insets.top + 14, paddingHorizontal: SP.l, paddingBottom: SP.l, backgroundColor: C.white }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={[{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }, BORDER(2)]}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 26, color: C.white }}>{AGENT.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 24, color: C.ink, letterSpacing: -0.6 }}>{AGENT.name}</Text>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 14, color: C.dim, marginTop: 1 }}>{AGENT.id} · {phone || AGENT.phone}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <Feather name="check-circle" size={11} color={C.ink} />
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.ink }}>Verified agent</Text>
              </View>
            </View>
            <Pressable onPress={toggleNight} style={[{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: night ? C.ink : C.white }, BORDER(1)]}>
              <Feather name={night ? 'sun' : 'moon'} size={18} color={night ? C.white : C.ink} />
            </Pressable>
          </View>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SP.m, padding: SP.s, backgroundColor: C.mute }, BORDER(1)]}>
            <Feather name="map" size={13} color={C.ink} />
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink, flex: 1 }}>{AGENT.zone}</Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: C.dim }}>{AGENT.shift}</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: C.ink }} />

        <View style={{ padding: SP.l }}>
          {/* today counts (read-only) */}
          <View style={{ flexDirection: 'row', gap: SP.s }}>
            <StatTile label="Delivered" value={String(deliveredToday)} sub="today" style={{ flex: 1 }} solid />
            <StatTile label="Pending" value={String(pending)} sub="in queue" style={{ flex: 1 }} />
            <StatTile label="Km logged" value={String(TODAY.kmLogged)} sub="today" style={{ flex: 1 }} />
          </View>

          {/* COD running total + deposit */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SP.xl, marginBottom: SP.m }}>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 17, color: C.ink }}>{ASCII.caret} COD CASH</Text>
            <View style={{ flex: 1 }}><AsciiDivider faint /></View>
          </View>
          <View style={[{ padding: SP.l, backgroundColor: C.ink }, BORDER(1)]}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: C.white, letterSpacing: 1 }}>COLLECTED THIS SHIFT</Text>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 40, color: C.white, letterSpacing: -2, marginTop: 2 }}>₹{codCollected}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.white, opacity: 0.7, marginTop: 2 }}>Deposit at the office by 7 PM. No cash stays overnight.</Text>
            <View style={{ marginTop: SP.m }}>
              <BrutalButton label={codCollected > 0 ? `Deposit ₹${codCollected}` : 'Nothing to deposit'} icon="download" block disabled={codCollected === 0} onPress={deposit} />
            </View>
          </View>

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
            <Pressable key={i} onPress={() => setOpenFaq(openFaq === i ? null : i)} style={[{ padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 16, color: C.ink }}>{f.q}</Text>
                <Feather name={openFaq === i ? 'minus' : 'plus'} size={16} color={C.ink} />
              </View>
              {openFaq === i && <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: C.dim, marginTop: 8, lineHeight: 22 }}>{f.a}</Text>}
            </Pressable>
          ))}

          {/* escalation */}
          <Section title="ESCALATION" />
          {ESCALATION.map(e => (
            <Pressable key={e.label} onPress={() => Linking.openURL(`tel:${e.tel}`).catch(() => {})} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
              <View style={[{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }]}>
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
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: C.dim, textAlign: 'center', marginTop: SP.l }}>TRENDZO DELIVERY · AGENT APP · v1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SP.xl, marginBottom: SP.m }}>
      <Text style={{ fontFamily: 'Inter_900Black', fontSize: 17, color: C.ink }}>{ASCII.caret} {title}</Text>
      <View style={{ flex: 1 }}><AsciiDivider faint /></View>
    </View>
  );
}

function Detail({ icon, label, value, tag }: { icon: any; label: string; value: string; tag?: string }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
      <View style={[{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
        <Feather name={icon} size={15} color={C.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: C.dim, letterSpacing: 1 }}>{label.toUpperCase()}</Text>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: C.ink, marginTop: 1 }}>{value}</Text>
      </View>
      {tag && (
        <View style={[{ paddingHorizontal: 6, paddingVertical: 3, backgroundColor: tag === 'VERIFIED' ? C.ink : C.white }, BORDER(1)]}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: tag === 'VERIFIED' ? C.white : C.ink }}>{tag}</Text>
        </View>
      )}
    </View>
  );
}

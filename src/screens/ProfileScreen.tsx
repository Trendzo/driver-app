import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, AsciiDivider, StatTile, InfoRow } from '../components/Brutal';
import { useApp } from '../state/AppState';
import { RIDER } from '../data/mockData';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { phone, signOut, showConfirm, showToast, night, toggleNight } = useApp();

  const menu: { icon: any; label: string; value: string; onPress: () => void }[] = [
    { icon: 'shield', label: 'ID verification', value: RIDER.docsVerified ? 'Verified' : 'Pending', onPress: () => nav.navigate('IdVerification') },
    { icon: 'truck', label: 'Vehicle', value: RIDER.vehicle, onPress: () => nav.navigate('Vehicle') },
    { icon: 'map', label: 'Work zone', value: RIDER.zone, onPress: () => nav.navigate('WorkZone') },
    { icon: 'file-text', label: 'Documents', value: '5 on file', onPress: () => nav.navigate('Documents') },
    { icon: 'credit-card', label: 'Bank & payouts', value: 'HDFC ••• 4471', onPress: () => nav.navigate('Payouts') },
  ];

  const support: { icon: any; label: string; onPress: () => void }[] = [
    { icon: 'clock', label: 'Trip history', onPress: () => nav.navigate('History') },
    { icon: 'shield', label: 'Safety & SOS', onPress: () => nav.navigate('Safety') },
    { icon: 'help-circle', label: 'Help & Support', onPress: () => nav.navigate('Help') },
    { icon: 'book-open', label: 'How Trendzo works', onPress: () => nav.navigate('HowItWorks') },
    { icon: 'star', label: 'Rate the app', onPress: () => nav.navigate('Rate') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScrollView contentContainerStyle={{ paddingHorizontal: SP.l, paddingTop: insets.top + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* identity card */}
        <View style={[{ padding: SP.l, backgroundColor: C.ink }, BORDER(2)]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.m }}>
            <View style={[{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }, BORDER(1)]}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 28, color: C.ink }}>{RIDER.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 22, color: C.white, letterSpacing: -0.5 }}>{RIDER.name}</Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: C.white, opacity: 0.7, marginTop: 2 }}>{phone || RIDER.phone}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: C.white }}>
                  <Text style={{ fontFamily: 'Inter_900Black', fontSize: 10, color: C.ink }}>{RIDER.rating}★ RATING</Text>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.white }}>
                  <Text style={{ fontFamily: 'Inter_900Black', fontSize: 10, color: C.white }}>ID {RIDER.id.split('-').pop()}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* lifetime stats */}
        <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.l }}>
          <StatTile label="Total trips" value={`${RIDER.totalTrips}`} style={{ flex: 1 }} />
          <StatTile label="Rating" value={`${RIDER.rating}★`} style={{ flex: 1 }} />
          <StatTile label="Partner since" value={RIDER.joinedOn.split(' ')[0]} sub={RIDER.joinedOn.split(' ')[1]} style={{ flex: 1 }} />
        </View>

        {/* account */}
        <View style={{ marginTop: SP.xl }}>
          <AsciiDivider />
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} ACCOUNT</Text>
          <AsciiDivider faint style={{ marginTop: 4 }} />
        </View>
        <View style={[{ paddingHorizontal: SP.m, marginTop: SP.s }, BORDER(1)]}>
          {menu.map((m, i) => (
            <View key={m.label}>
              <InfoRow icon={m.icon} label={m.label} value={m.value} onPress={m.onPress} />
              {i < menu.length - 1 && <View style={{ height: 1, backgroundColor: C.hairline }} />}
            </View>
          ))}
        </View>

        {/* appearance */}
        <View style={{ marginTop: SP.xl }}>
          <AsciiDivider />
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} APPEARANCE</Text>
          <AsciiDivider faint style={{ marginTop: 4 }} />
        </View>
        <Pressable onPress={toggleNight} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginTop: SP.s }, BORDER(1)]}>
          <View style={[{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: night ? C.ink : C.white }, BORDER(1)]}>
            <Feather name={night ? 'moon' : 'sun'} size={18} color={night ? C.white : C.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink }}>Dark mode</Text>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: C.dim, marginTop: 1 }}>{night ? 'NIGHT THEME ON' : 'LIGHT THEME ON'}</Text>
          </View>
          {/* brutalist switch */}
          <View style={[{ width: 56, height: 30, padding: 3, justifyContent: 'center', alignItems: night ? 'flex-end' : 'flex-start', backgroundColor: night ? C.ink : C.mute }, BORDER(1)]}>
            <View style={{ width: 22, height: 22, backgroundColor: night ? C.white : C.ink }} />
          </View>
        </Pressable>

        {/* support */}
        <View style={{ marginTop: SP.xl }}>
          <AsciiDivider />
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} HELP & MORE</Text>
          <AsciiDivider faint style={{ marginTop: 4 }} />
        </View>
        {support.map((s) => (
          <Pressable key={s.label} onPress={s.onPress} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginTop: SP.s }, BORDER(1)]}>
            <View style={[{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
              <Feather name={s.icon} size={18} color={C.ink} />
            </View>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink, flex: 1 }}>{s.label}</Text>
            <Feather name="chevron-right" size={20} color={C.ink} />
          </Pressable>
        ))}

        {/* logout */}
        <Pressable
          onPress={() => showConfirm({ title: 'Log out?', msg: 'You will stop receiving orders and need to log in again.', confirmLabel: 'Log out', danger: true, icon: 'log-out', onConfirm: signOut })}
          style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: SP.m, marginTop: SP.xl }, BORDER(2)]}
        >
          <Feather name="log-out" size={18} color={C.ink} />
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 14, color: C.ink, letterSpacing: 0.5 }}>LOG OUT</Text>
        </Pressable>

        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: C.dim, textAlign: 'center', marginTop: SP.l, letterSpacing: 1 }}>
          TRENDZO PARTNER · v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});

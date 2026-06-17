// SOS / safety toolkit. Big tappable emergency actions, reachable from the
// active delivery screen. Every row dials a real number.
import React from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, ScreenHeader, AsciiDivider } from '../components/Brutal';
import { useApp } from '../state/AppState';
import { SOS_ACTIONS } from '../data/mockData';

export default function SafetyScreen() {
  const nav = useNavigation<any>();
  const { showToast } = useApp();
  const dial = (tel: string) => Linking.openURL(`tel:${tel}`).catch(() => showToast('Cannot call', 'Dialer unavailable', 'phone-off'));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScreenHeader title="Safety" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: 40 }}>

        {/* big SOS */}
        <Pressable
          onPress={() => dial('100')}
          style={[{ padding: SP.xl, backgroundColor: C.ink, alignItems: 'center' }, BORDER(2)]}
        >
          <View style={[{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }]}>
            <Feather name="alert-octagon" size={36} color={C.ink} />
          </View>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 32, color: C.white, letterSpacing: 2, marginTop: SP.m }}>SOS</Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.white, opacity: 0.8, marginTop: 2 }}>Tap to call emergency services</Text>
        </Pressable>

        <View style={{ marginTop: SP.xl }}>
          <AsciiDivider />
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} GET HELP FAST</Text>
          <AsciiDivider faint style={{ marginTop: 4 }} />
        </View>

        {SOS_ACTIONS.map((a) => (
          <Pressable key={a.label} onPress={() => dial(a.tel)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginTop: SP.s }, BORDER(1)]}>
            <View style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }, BORDER(1)]}>
              <Feather name={a.icon as any} size={20} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 15, color: C.ink }}>{a.label}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: C.dim, marginTop: 1 }}>{a.sub}</Text>
            </View>
            <Feather name="phone" size={20} color={C.ink} />
          </Pressable>
        ))}

        <View style={[{ marginTop: SP.xl, padding: SP.l, alignItems: 'center' }, BORDER(1)]}>
          <Feather name="shield" size={26} color={C.ink} />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.ink, marginTop: 8, textAlign: 'center' }}>Your live location is shared with the Trendzo Safety Team during every trip.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

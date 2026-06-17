// Full trip history — every completed delivery with payout, tip and route.
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, ScreenHeader, AsciiDivider, StatTile } from '../components/Brutal';
import { RECENT_TRIPS, WEEK_EARNINGS } from '../data/mockData';

export default function HistoryScreen() {
  const nav = useNavigation<any>();
  const totalTrips = WEEK_EARNINGS.reduce((s, d) => s + d.trips, 0);
  const totalEarned = WEEK_EARNINGS.reduce((s, d) => s + d.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScreenHeader title="Trip History" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', gap: SP.s }}>
          <StatTile label="This week" value={`${totalTrips}`} sub="trips" solid style={{ flex: 1 }} />
          <StatTile label="Earned" value={`₹${totalEarned}`} sub="this week" style={{ flex: 1 }} />
        </View>

        <View style={{ marginTop: SP.xl }}>
          <AsciiDivider />
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} TODAY</Text>
          <AsciiDivider faint style={{ marginTop: 4 }} />
        </View>

        {RECENT_TRIPS.map((t) => (
          <View key={t.id} style={[{ padding: SP.m, marginTop: SP.s }, BORDER(1)]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
                  <Feather name="check" size={16} color={C.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.ink }}>{t.area}</Text>
                  <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: C.dim, marginTop: 1 }}>#{t.id} · {t.time}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink }}>₹{t.payout + t.tip}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: C.hairline, marginVertical: SP.s }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim }}>BASE ₹{t.payout}</Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim }}>TIP ₹{t.tip}</Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim }}>{t.km} KM</Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim }}>DELIVERED ✓</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

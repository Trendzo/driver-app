import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, AsciiDivider, StatTile, FadeInUp, BrutalButton } from '../components/Brutal';
import { useApp } from '../state/AppState';
import { WEEK_EARNINGS, RECENT_TRIPS, TODAY } from '../data/mockData';

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { todayEarnings, todayTrips, balance, showToast } = useApp();
  const [tab, setTab] = useState<'today' | 'week'>('today');

  const weekTotal = WEEK_EARNINGS.reduce((s, d) => s + d.amount, 0);
  const weekTrips = WEEK_EARNINGS.reduce((s, d) => s + d.trips, 0);
  const maxDay = Math.max(...WEEK_EARNINGS.map(d => d.amount));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScrollView contentContainerStyle={{ paddingHorizontal: SP.l, paddingTop: insets.top + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: C.dim }}>{'> YOUR MONEY'}</Text>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 30, letterSpacing: -1, color: C.ink, marginTop: 2 }}>EARNINGS</Text>

        {/* tab switch */}
        <View style={{ flexDirection: 'row', marginTop: SP.l }}>
          {(['today', 'week'] as const).map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={[{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: tab === t ? C.ink : C.white }, BORDER(1)]}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 13, letterSpacing: 1, color: tab === t ? C.white : C.ink }}>{t === 'today' ? 'TODAY' : 'THIS WEEK'}</Text>
            </Pressable>
          ))}
        </View>

        {/* big total */}
        <View style={[{ marginTop: SP.l, padding: SP.l, backgroundColor: C.ink }, BORDER(2)]}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: C.white, opacity: 0.7 }}>
            {tab === 'today' ? 'EARNED TODAY' : 'EARNED THIS WEEK'}
          </Text>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 56, letterSpacing: -3, color: C.white, lineHeight: 58, marginTop: 4 }}>
            ₹{tab === 'today' ? todayEarnings : weekTotal}
          </Text>
          <View style={{ flexDirection: 'row', gap: SP.l, marginTop: SP.s }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.white }}>{tab === 'today' ? todayTrips : weekTrips} trips</Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.white, opacity: 0.7 }}>
              {tab === 'today' ? `${TODAY.distanceKm} km` : `${WEEK_EARNINGS.length} days`}
            </Text>
          </View>
        </View>

        {tab === 'week' ? (
          <>
            {/* bar chart */}
            <View style={{ marginTop: SP.xl }}>
              <AsciiDivider />
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} DAILY BREAKDOWN</Text>
              <AsciiDivider faint style={{ marginTop: 4 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 180, marginTop: SP.l }}>
              {WEEK_EARNINGS.map((d, i) => {
                const h = Math.max(12, (d.amount / maxDay) * 150);
                const best = d.amount === maxDay;
                return (
                  <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, color: C.dim, marginBottom: 4 }}>{d.amount}</Text>
                    <FadeInUp delay={i * 60}>
                      <View style={[{ width: 26, height: h, backgroundColor: best ? C.ink : C.white }, BORDER(1)]} />
                    </FadeInUp>
                    <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.ink, marginTop: 6 }}>{d.day}</Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* today stat grid */}
            <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.l }}>
              <StatTile label="Base pay" value={`₹${Math.round(todayEarnings * 0.8)}`} style={{ flex: 1 }} />
              <StatTile label="Tips" value={`₹${Math.round(todayEarnings * 0.12)}`} style={{ flex: 1 }} />
              <StatTile label="Bonus" value={`₹${Math.round(todayEarnings * 0.08)}`} style={{ flex: 1 }} />
            </View>
          </>
        )}

        {/* payout card */}
        <View style={[{ marginTop: SP.xl, padding: SP.l }, BORDER(1)]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1, color: C.dim }}>AVAILABLE TO WITHDRAW</Text>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 28, color: C.ink, letterSpacing: -1, marginTop: 2 }}>₹{balance}</Text>
            </View>
            <Feather name="credit-card" size={28} color={C.ink} />
          </View>
          <BrutalButton label="Withdraw to bank" icon="download" block big style={{ marginTop: SP.m }} onPress={() => nav.navigate('Withdraw')} />
        </View>

        {/* recent trips */}
        <View style={{ marginTop: SP.xl }}>
          <AsciiDivider />
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} RECENT TRIPS</Text>
          <AsciiDivider faint style={{ marginTop: 4 }} />
        </View>
        {RECENT_TRIPS.map((t) => (
          <Pressable key={t.id} onPress={() => showToast(`Trip #${t.id}`, `${t.area} · ${t.km} km · ₹${t.payout} + ₹${t.tip} tip`, 'check-circle')} style={[{ flexDirection: 'row', alignItems: 'center', padding: SP.m, marginTop: SP.s, gap: 12 }, BORDER(1)]}>
            <View style={[{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
              <Feather name="check" size={16} color={C.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.ink }}>{t.area}</Text>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: C.dim, marginTop: 1 }}>#{t.id} · {t.time} · {t.km} km</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.ink }}>₹{t.payout + t.tip}</Text>
              {t.tip > 0 && <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim }}>+₹{t.tip} TIP</Text>}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});

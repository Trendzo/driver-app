import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, SP, BORDER } from '../theme/brutal';
import { BrutalStatusBar, ScreenHeader } from '../components/Brutal';

const NOTIFS: { icon: any; title: string; body: string; time: string; unread?: boolean }[] = [
  { icon: 'gift', title: 'Weekend bonus unlocked', body: 'Complete 40 trips this weekend to earn ₹300 extra.', time: '10 min ago', unread: true },
  { icon: 'trending-up', title: 'Surge in your zone', body: 'High demand near Phoenix Citadel & Vijay Nagar. Go online to earn more.', time: '32 min ago', unread: true },
  { icon: 'check-circle', title: 'Payout successful', body: '₹4,320 was sent to your HDFC account ••• 4471.', time: '2 hours ago' },
  { icon: 'star', title: 'You got a 5★ rating', body: 'Aarav rated your delivery 5 stars. Keep it up!', time: 'Yesterday' },
  { icon: 'shield', title: 'Document reminder', body: 'Your insurance is valid. No action needed.', time: '2 days ago' },
];

export default function NotificationsScreen() {
  const nav = useNavigation<any>();
  // Tap a notification to mark it read (clears its unread dot/highlight).
  const [readIdx, setReadIdx] = useState<Set<number>>(new Set());
  const markRead = (i: number) => setReadIdx(prev => { const n = new Set(prev); n.add(i); return n; });
  const allRead = () => setReadIdx(new Set(NOTIFS.map((_, i) => i)));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScreenHeader
        title="Alerts"
        onBack={() => nav.goBack()}
        right={<Pressable onPress={allRead} hitSlop={8} style={{ paddingHorizontal: 6, paddingVertical: 4 }}><Feather name="check-circle" size={20} color={C.ink} /></Pressable>}
      />
      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: 40 }}>
        {NOTIFS.map((n, i) => {
          const unread = n.unread && !readIdx.has(i);
          return (
            <Pressable key={i} onPress={() => markRead(i)} style={[{ flexDirection: 'row', gap: 12, padding: SP.m, marginBottom: SP.s, backgroundColor: unread ? C.white : C.bg }, BORDER(1)]}>
              <View style={[{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: unread ? C.ink : C.white }, BORDER(1)]}>
                <Feather name={n.icon} size={18} color={unread ? C.white : C.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontFamily: 'Inter_900Black', fontSize: 14, color: C.ink, flex: 1 }}>{n.title}</Text>
                  {unread && <View style={{ width: 8, height: 8, backgroundColor: C.ink }} />}
                </View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.dim, marginTop: 3, lineHeight: 18 }}>{n.body}</Text>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim, marginTop: 6, letterSpacing: 1 }}>{n.time.toUpperCase()}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

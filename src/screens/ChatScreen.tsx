// In-app chat with the customer (or store). Built for one-handed use: big
// quick-reply chips so the rider rarely types, plus a normal input. The other
// party sends a canned auto-reply so the demo conversation feels alive.
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SP, BORDER } from '../theme/brutal';
import { BrutalStatusBar } from '../components/Brutal';
import { useApp } from '../state/AppState';
import { ChatMsg, CHAT_SEED, QUICK_REPLIES, AUTO_REPLY } from '../data/mockData';

let seq = 100;
const now = () => { const d = new Date(); return d.getHours() % 12 + ':' + String(d.getMinutes()).padStart(2, '0') + (d.getHours() >= 12 ? ' PM' : ' AM'); };

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { activeOrder } = useApp();
  const party = route.params?.party === 'store' ? 'store' : 'customer';
  const name = party === 'store' ? (activeOrder?.store.name || 'Store') : (activeOrder?.customer.name || 'Customer');
  const phone = party === 'store' ? activeOrder?.store.phone : activeOrder?.customer.phone;

  const [msgs, setMsgs] = useState<ChatMsg[]>(party === 'customer' ? CHAT_SEED : []);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80); }, [msgs]);

  const send = (body: string) => {
    const t = body.trim();
    if (!t) return;
    const mine: ChatMsg = { id: 'm' + seq++, from: 'rider', text: t, time: now() };
    setMsgs(prev => [...prev, mine]);
    setText('');
    // auto-reply
    const reply = AUTO_REPLY[t] || 'Okay';
    setTimeout(() => {
      setMsgs(prev => [...prev, { id: 'm' + seq++, from: 'them', text: reply, time: now() }]);
    }, 900);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />

      {/* header */}
      <View style={{ paddingTop: insets.top + 8, backgroundColor: C.white }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SP.l, paddingBottom: SP.m }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={10} style={[{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
            <Feather name="arrow-left" size={20} color={C.ink} />
          </Pressable>
          <View style={[{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }, BORDER(1)]}>
            <Feather name={party === 'store' ? 'shopping-bag' : 'user'} size={18} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.ink, letterSpacing: -0.3 }} numberOfLines={1}>{name}</Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim, letterSpacing: 1 }}>{party === 'store' ? 'PICKUP STORE' : 'CUSTOMER'} · ONLINE</Text>
          </View>
          <Pressable onPress={() => phone && Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)} hitSlop={10} style={[{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }, BORDER(1)]}>
            <Feather name="phone" size={18} color={C.white} />
          </Pressable>
        </View>
        <View style={{ height: 1, backgroundColor: C.ink }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: SP.l, paddingBottom: SP.l }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim, textAlign: 'center', letterSpacing: 1, marginBottom: SP.m }}>
            MESSAGES ARE RECORDED FOR SAFETY
          </Text>
          {msgs.map(m => {
            const mine = m.from === 'rider';
            return (
              <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: SP.s }}>
                <View style={[{ maxWidth: '82%', paddingHorizontal: SP.m, paddingVertical: 10, backgroundColor: mine ? C.ink : C.white }, BORDER(1)]}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: mine ? C.white : C.ink, lineHeight: 19 }}>{m.text}</Text>
                </View>
                <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, color: C.dim, marginTop: 2 }}>{m.time}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* quick replies */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SP.l, gap: 8, paddingVertical: SP.s }} style={{ maxHeight: 56 }}>
          {QUICK_REPLIES.map(q => (
            <Pressable key={q} onPress={() => send(q)} style={[{ paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.white }, BORDER(1)]}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.ink }}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* input bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SP.l, paddingTop: SP.s, paddingBottom: insets.bottom + SP.s, borderTopWidth: 1, borderColor: C.ink }}>
          <View style={[{ flex: 1, paddingHorizontal: SP.m, paddingVertical: Platform.OS === 'ios' ? 12 : 4 }, BORDER(1)]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message…"
              placeholderTextColor={C.dim}
              style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: C.ink, padding: 0 }}
              onSubmitEditing={() => send(text)}
              returnKeyType="send"
            />
          </View>
          <Pressable onPress={() => send(text)} style={[{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }, BORDER(1)]}>
            <Feather name="send" size={20} color={C.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

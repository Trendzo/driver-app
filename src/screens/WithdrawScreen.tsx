// Full withdrawal flow — amount → choose destination → review → processing →
// success. Deducts from the rider's wallet balance in AppState.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';
import { C, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, ScreenHeader, AsciiDivider, BrutalButton } from '../components/Brutal';
import { useApp } from '../state/AppState';
import { BANK } from '../data/mockData';

type Step = 'amount' | 'review' | 'processing' | 'success';

const DESTS = [
  { key: 'bank', icon: 'credit-card' as const, title: BANK.bank, sub: `Account ${BANK.account}`, eta: 'Within 24 hours', fee: 0 },
  { key: 'upi', icon: 'smartphone' as const, title: 'UPI · Instant', sub: BANK.upi, eta: 'Instant · ₹5 fee', fee: 5 },
];

export default function WithdrawScreen() {
  const nav = useNavigation<any>();
  const { balance, withdraw, showToast } = useApp();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [destKey, setDestKey] = useState('bank');
  const [ref] = useState(() => 'TZW' + Math.floor((balance * 97 % 900000) + 100000));

  const dest = DESTS.find(d => d.key === destKey)!;
  const amt = parseInt(amount || '0', 10) || 0;
  const valid = amt >= 100 && amt <= balance;
  const receive = Math.max(0, amt - dest.fee);

  const chips = [500, 1000, 2000].filter(v => v <= balance);

  // processing → success
  useEffect(() => {
    if (step !== 'processing') return;
    const t = setTimeout(() => { withdraw(amt); setStep('success'); }, 1900);
    return () => clearTimeout(t);
  }, [step]);

  // ── SUCCESS ──
  if (step === 'success') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: SP.l }}>
        <BrutalStatusBar />
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 68, color: C.ink }}>{ASCII.check}</Text>
        </MotiView>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 30, color: C.ink, marginTop: 12, textAlign: 'center', letterSpacing: -1 }}>WITHDRAWAL{'\n'}STARTED</Text>
        <View style={[{ marginTop: SP.l, padding: SP.l, width: '100%', alignItems: 'center' }, BORDER(2)]}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: C.dim, letterSpacing: 1.5 }}>SENT TO {dest.title.toUpperCase()}</Text>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 44, color: C.ink, letterSpacing: -2, marginTop: 2 }}>₹{receive}</Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.dim }}>{dest.eta}</Text>
          <AsciiDivider faint style={{ marginTop: SP.m }} />
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.ink, marginTop: SP.m }}>REF · {ref}</Text>
        </View>
        <View style={{ width: '100%', marginTop: SP.xl }}>
          <BrutalButton label="Done" icon="check" big block onPress={() => nav.goBack()} />
        </View>
      </View>
    );
  }

  // ── PROCESSING ──
  if (step === 'processing') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: SP.l }}>
        <BrutalStatusBar />
        <MotiView from={{ rotate: '0deg' }} animate={{ rotate: '360deg' }} transition={{ loop: true, type: 'timing', duration: 1000 }}>
          <Feather name="loader" size={48} color={C.ink} />
        </MotiView>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 22, color: C.ink, marginTop: SP.l, letterSpacing: -0.5 }}>PROCESSING…</Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.dim, marginTop: 6, letterSpacing: 1 }}>SENDING ₹{receive} TO YOUR {destKey === 'upi' ? 'UPI' : 'BANK'}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScreenHeader title="Withdraw" onBack={() => (step === 'review' ? setStep('amount') : nav.goBack())} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* balance */}
          <View style={[{ padding: SP.l, backgroundColor: C.ink }, BORDER(2)]}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: C.white, opacity: 0.7 }}>AVAILABLE BALANCE</Text>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 40, color: C.white, letterSpacing: -2, marginTop: 2 }}>₹{balance}</Text>
          </View>

          {step === 'amount' ? (
            <>
              {/* amount input */}
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 11, color: C.ink, letterSpacing: 1, marginTop: SP.xl, marginBottom: 6 }}>{'> ENTER AMOUNT'}</Text>
              <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SP.m }, BORDER(2)]}>
                <Text style={{ fontFamily: 'Inter_900Black', fontSize: 32, color: C.ink }}>₹</Text>
                <TextInput
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="0"
                  placeholderTextColor={C.faint}
                  keyboardType="number-pad"
                  style={{ flex: 1, fontFamily: 'Inter_900Black', fontSize: 32, color: C.ink, paddingVertical: 14, paddingHorizontal: 8 }}
                />
              </View>
              {amt > balance && <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.ink, marginTop: 6 }}>⚠ MORE THAN YOUR BALANCE</Text>}
              {amt > 0 && amt < 100 && <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.dim, marginTop: 6 }}>MINIMUM WITHDRAWAL IS ₹100</Text>}

              {/* quick chips */}
              <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.m }}>
                {chips.map(v => (
                  <Pressable key={v} onPress={() => setAmount(String(v))} style={[{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: amt === v ? C.ink : C.white }, BORDER(1)]}>
                    <Text style={{ fontFamily: 'Inter_900Black', fontSize: 13, color: amt === v ? C.white : C.ink }}>₹{v}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setAmount(String(balance))} style={[{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: amt === balance ? C.ink : C.white }, BORDER(1)]}>
                  <Text style={{ fontFamily: 'Inter_900Black', fontSize: 13, color: amt === balance ? C.white : C.ink }}>MAX</Text>
                </Pressable>
              </View>

              {/* destination */}
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 11, color: C.ink, letterSpacing: 1, marginTop: SP.xl, marginBottom: 6 }}>{'> SEND TO'}</Text>
              {DESTS.map(d => {
                const sel = destKey === d.key;
                return (
                  <Pressable key={d.key} onPress={() => setDestKey(d.key)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginBottom: SP.s, backgroundColor: sel ? C.ink : C.white }, BORDER(sel ? 2 : 1)]}>
                    <View style={[{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }, BORDER(1)]}>
                      <Feather name={d.icon} size={18} color={C.ink} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: sel ? C.white : C.ink }}>{d.title}</Text>
                      <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: sel ? C.white : C.dim, marginTop: 1, opacity: sel ? 0.8 : 1 }}>{d.sub} · {d.eta}</Text>
                    </View>
                    <View style={[{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? C.white : 'transparent' }, BORDER(1)]}>
                      {sel && <Feather name="check" size={14} color={C.ink} />}
                    </View>
                  </Pressable>
                );
              })}

              <BrutalButton label="Continue" iconRight="arrow-right" big block disabled={!valid} style={{ marginTop: SP.l }} onPress={() => setStep('review')} />
            </>
          ) : (
            <>
              {/* REVIEW */}
              <View style={{ marginTop: SP.xl }}>
                <AsciiDivider />
                <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} REVIEW</Text>
                <AsciiDivider faint style={{ marginTop: 4 }} />
              </View>
              <View style={[{ paddingHorizontal: SP.m, marginTop: SP.m }, BORDER(1)]}>
                {[
                  ['Amount', `₹${amt}`],
                  ['Processing fee', dest.fee ? `₹${dest.fee}` : 'FREE'],
                  ['You receive', `₹${receive}`],
                  ['To', dest.title],
                  ['Account', dest.key === 'upi' ? BANK.upi : BANK.account],
                  ['Arrives', dest.eta],
                ].map((r, i, arr) => (
                  <View key={r[0]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 }}>
                      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: C.dim, letterSpacing: 1 }}>{r[0].toUpperCase()}</Text>
                      <Text style={{ fontFamily: i === 2 ? 'Inter_900Black' : 'Inter_700Bold', fontSize: i === 2 ? 18 : 14, color: C.ink }}>{r[1]}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: C.hairline }} />}
                  </View>
                ))}
              </View>
              <BrutalButton label={`Confirm · ₹${receive}`} icon="check" big block style={{ marginTop: SP.l }} onPress={() => setStep('processing')} />
              <Pressable onPress={() => setStep('amount')} style={{ alignItems: 'center', marginTop: SP.m }} hitSlop={8}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.dim, textDecorationLine: 'underline' }}>Edit amount</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

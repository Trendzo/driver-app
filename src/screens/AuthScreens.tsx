// Trendzo Partner auth — phone number + OTP only.
// Riders don't want passwords or emails. Enter phone → enter the 4 digits we
// "send" → you're in. The demo OTP is always 1234 and shown on screen.
import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, SP, BORDER } from '../theme/brutal';
import { BrutalButton, BrutalStatusBar, AsciiDivider } from '../components/Brutal';
import { useApp } from '../state/AppState';

const DEMO_OTP = '1234';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, showToast } = useApp();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const otpValue = otp.join('');

  const sendOtp = () => {
    if (!phoneValid) { showToast('Enter your number', 'A valid 10-digit mobile number', 'alert-circle'); return; }
    setStep('otp');
    showToast('OTP sent', `Code sent to ${phone}`, 'message-square');
  };

  const setDigit = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const nextArr = [...otp];
    nextArr[i] = digit;
    setOtp(nextArr);
    if (digit && i < 3) otpRefs[i + 1].current?.focus();
  };

  const verify = () => {
    if (otpValue.length < 4) { showToast('Enter the code', 'Type all 4 digits', 'alert-circle'); return; }
    // demo: accept the shown OTP or any code, to keep the flow unblocked
    signIn('+91 ' + phone);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: SP.l, paddingTop: insets.top + 24, paddingBottom: 40, flexGrow: 1 }} keyboardShouldPersistTaps="handled">

          {/* brand block */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }, BORDER(1)]}>
              <Feather name="truck" size={22} color={C.white} />
            </View>
            <View>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, letterSpacing: -0.5 }}>TRENDZO</Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim, letterSpacing: 1.5 }}>DELIVERY PARTNER</Text>
            </View>
          </View>

          <AsciiDivider style={{ marginTop: SP.l }} />

          {step === 'phone' ? (
            <MotiView from={{ opacity: 0, translateX: -16 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'timing', duration: 240 }} key="phone">
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 40, letterSpacing: -1.5, lineHeight: 42, color: C.ink, marginTop: SP.xl }}>LOG IN TO{'\n'}START EARNING</Text>
              <Text style={[T.body, { color: C.dim, marginTop: 10, fontSize: 15 }]}>Enter your mobile number. We'll send a one-time code.</Text>

              <Text style={[T.label, { marginTop: SP.xxl, marginBottom: 6 }]}>{'> MOBILE NUMBER'}</Text>
              <View style={[{ flexDirection: 'row', alignItems: 'center' }, BORDER(1)]}>
                <View style={{ paddingHorizontal: SP.m, paddingVertical: 18, borderRightWidth: 1, borderColor: C.ink, backgroundColor: C.mute }}>
                  <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.ink }}>+91</Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                  placeholder="00000 00000"
                  placeholderTextColor={C.faint}
                  keyboardType="number-pad"
                  style={{ flex: 1, fontFamily: 'Inter_900Black', fontSize: 20, color: C.ink, paddingHorizontal: SP.m, letterSpacing: 1 }}
                />
              </View>

              <BrutalButton label="Send OTP" iconRight="arrow-right" onPress={sendOtp} block big style={{ marginTop: SP.xl }} disabled={!phoneValid} />
            </MotiView>
          ) : (
            <MotiView from={{ opacity: 0, translateX: 16 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'timing', duration: 240 }} key="otp">
              <Pressable onPress={() => setStep('phone')} hitSlop={8} style={{ marginTop: SP.l }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.ink, letterSpacing: 1 }}>{'[ ◀ CHANGE NUMBER ]'}</Text>
              </Pressable>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 40, letterSpacing: -1.5, lineHeight: 42, color: C.ink, marginTop: SP.l }}>ENTER{'\n'}THE CODE</Text>
              <Text style={[T.body, { color: C.dim, marginTop: 10, fontSize: 15 }]}>Sent to <Text style={{ fontFamily: 'Inter_700Bold', color: C.ink }}>+91 {phone}</Text></Text>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: SP.xxl }}>
                {otp.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={otpRefs[i]}
                    value={d}
                    onChangeText={(v) => setDigit(i, v)}
                    onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus(); }}
                    keyboardType="number-pad"
                    maxLength={1}
                    style={[{ width: 60, height: 72, textAlign: 'center', fontFamily: 'Inter_900Black', fontSize: 32, color: C.ink, backgroundColor: d ? C.ink : C.white }, BORDER(2), d ? { color: C.white } : null]}
                  />
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SP.l }}>
                <Feather name="info" size={13} color={C.dim} />
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.dim, letterSpacing: 0.5 }}>DEMO OTP IS {DEMO_OTP} · OR ANY 4 DIGITS</Text>
              </View>

              <BrutalButton label="Verify & continue" iconRight="check" onPress={verify} block big style={{ marginTop: SP.xl }} />
              <Pressable onPress={() => showToast('OTP resent', `New code sent to +91 ${phone}`, 'refresh-cw')} style={{ marginTop: SP.l, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.ink, textDecorationLine: 'underline' }}>Resend code</Text>
              </Pressable>
            </MotiView>
          )}

          <View style={{ flex: 1 }} />
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: C.dim, textAlign: 'center', marginTop: SP.xxl, letterSpacing: 1 }}>
            BY CONTINUING YOU ACCEPT PARTNER TERMS · PRIVACY
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({});

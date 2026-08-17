// Trendzo Partner auth — phone-OTP login (MSG91). First OTP verify creates the driver
// account server-side (instant-active). Email/signup are not backed — phone OTP only.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  Button,
  Field,
  Icon,
  Screen,
  colors,
  fonts,
  radii,
  spacing,
} from '../ui';
import { useApp } from '../state/AppState';
import { driverOtpLogin } from '../api';
import { isApiError } from '../api/errors';
import { MSG91_WIDGET_ID, MSG91_TOKEN_AUTH } from '../config/env';

const VEHICLES = ['Bike', 'Scooter', 'Car', 'Bicycle'];

export default function AuthScreen() {
  const [screen, setScreen] = useState<'login' | 'signup'>('login');
  return screen === 'signup' ? (
    <SignupView onLogin={() => setScreen('login')} />
  ) : (
    <LoginView onSignup={() => setScreen('signup')} />
  );
}

/* ─── Brand header ─────────────────────────────────────────── */
function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}>
        <Icon name="bicycle" size={22} color={colors.accentInk} />
      </View>
      <View>
        <AppText variant="cardTitle" color={colors.ink}>Trendzo</AppText>
        <AppText variant="sectionLabel" color={colors.meta}>Delivery Partner</AppText>
      </View>
    </View>
  );
}

/* ─── LOGIN ─────────────────────────────────────────────────── */
function LoginView({ onSignup }: { onSignup: () => void }) {
  const insets = useSafeAreaInsets();
  const { signIn, showToast } = useApp();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [reqId, setReqId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Resend cooldown (seconds). Blocks rapid re-taps from firing multiple OTP SMSes.
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  const phoneValid = phone.replace(/\D/g, '').length === 10;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    try {
      OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH);
    } catch {
      // Native module not linked (pre dev-client rebuild) — sendOtp will surface a clear error.
    }
  }, []);

  const sendOtp = async () => {
    // Double-tap / spam guard: one in-flight request at a time, then a 30s cooldown
    // before another SMS can be requested for this number.
    if (busy) return;
    if (cooldown > 0) return showToast('Please wait', `You can resend in ${cooldown}s`, 'clock');
    if (!phoneValid) return showToast('Enter your number', 'A valid 10-digit mobile number', 'alert-circle');
    if (!MSG91_WIDGET_ID) return showToast('OTP not configured', 'Set the MSG91 driver widget', 'alert-circle');
    setBusy(true);
    try {
      const res: any = await OTPWidget.sendOTP({ identifier: `91${phone.replace(/\D/g, '')}` });
      if (res?.type === 'error') throw new Error(res?.message || 'Could not send OTP');
      const rid = typeof res === 'string' ? res : res?.message;
      if (!rid) throw new Error('Could not send OTP');
      setReqId(String(rid));
      setOtp(['', '', '', '']);
      setStep('otp');
      setCooldown(30);
      showToast('OTP sent', `Code sent to +91 ${phone}`, 'message-square');
    } catch (e: any) {
      showToast('Could not send OTP', e?.message ?? 'Try again', 'alert-circle');
    } finally {
      setBusy(false);
    }
  };
  const setDigit = (i: number, v: string) => {
    const digits = v.replace(/\D/g, '');
    // 3+ digits at once = SMS autofill or paste — spread the code across all
    // boxes (each box previously took only its own keystroke, so autofill
    // filled just one field). A complete code verifies automatically.
    if (digits.length >= 3) {
      const next = ['', '', '', ''];
      for (let k = 0; k < 4 && k < digits.length; k++) next[k] = digits[k];
      setOtp(next);
      otpRefs[Math.min(3, digits.length - 1)].current?.focus();
      if (digits.length >= 4) void verifyCode(next.join(''));
      return;
    }
    const d = digits.slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 3) otpRefs[i + 1].current?.focus();
  };
  const verifyCode = async (raw: string) => {
    const code = raw.replace(/\D/g, '');
    if (code.length < 4 || !reqId) return showToast('Enter the code', 'Type all 4 digits', 'alert-circle');
    if (busy) return;
    setBusy(true);
    try {
      const vr: any = await OTPWidget.verifyOTP({ reqId, otp: code });
      if (vr?.type === 'error') throw new Error(vr?.message || 'Invalid OTP');
      const accessToken = typeof vr === 'string' ? vr : vr?.message;
      if (!accessToken) throw new Error('Verification failed');
      const { token, driver, isNew } = await driverOtpLogin(String(accessToken));
      signIn({ token, phone: `+91 ${phone}`, driver, isNew });
    } catch (e: any) {
      showToast('Sign-in failed', isApiError(e) ? e.message : (e?.message ?? 'Invalid OTP'), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };
  const verify = () => verifyCode(otp.join(''));

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Brand />

          <AppText variant="display" color={colors.ink} style={styles.headline}>
            {step === 'otp' ? 'Enter\nthe code' : 'Log in to\nstart earning'}
          </AppText>

          {/* Phone OTP only — the backend has no email login. */}
          {step === 'phone' ? (
              <View style={styles.form}>
                <Field label="Mobile number" required prefix="+91" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))} placeholder="00000 00000" keyboardType="number-pad" maxLength={10} />
                <Button label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Send OTP'} tone="accent" disabled={!phoneValid || cooldown > 0} loading={busy} onPress={sendOtp} icon={<Icon name="arrow-forward" size={18} color={colors.accentInk} />} />
              </View>
            ) : (
              <View style={styles.form}>
                <Pressable onPress={() => setStep('phone')} hitSlop={8} style={styles.editRow}>
                  <Icon name="chevron-back" size={16} color={colors.ink} />
                  <AppText variant="bodyMedium" color={colors.ink}>Change number</AppText>
                </Pressable>
                <AppText variant="body" color={colors.meta}>
                  Sent to <AppText variant="bodyMedium" color={colors.ink}>+91 {phone}</AppText>
                </AppText>
                <View style={styles.otpRow}>
                  {otp.map((d, i) => (
                    <TextInput
                      key={i}
                      ref={otpRefs[i]}
                      value={d}
                      onChangeText={(v) => setDigit(i, v)}
                      onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus(); }}
                      keyboardType="number-pad"
                      // maxLength 4 (not 1) so iOS keyboard OTP suggestions and Android
                      // SMS autofill can inject the whole code; setDigit spreads it out.
                      maxLength={4}
                      textContentType="oneTimeCode"
                      autoComplete={i === 0 ? 'sms-otp' : 'off'}
                      maxFontSizeMultiplier={1.2}
                      style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
                    />
                  ))}
                </View>
                <View style={styles.hintRow}>
                  <Icon name="information-circle-outline" size={15} color={colors.meta} />
                  <AppText variant="meta" color={colors.meta}>Enter the 4-digit code we texted you</AppText>
                </View>
                <Button label="Verify & continue" tone="accent" loading={busy} onPress={verify} icon={<Icon name="checkmark" size={18} color={colors.accentInk} />} />
                {/* Real resend (it previously only showed a toast without sending
                    anything) — goes through sendOtp, so the cooldown applies. */}
                <Pressable disabled={busy || cooldown > 0} onPress={sendOtp} style={styles.center}>
                  {cooldown > 0 ? (
                    <AppText variant="bodyMedium" color={colors.meta}>Resend code in {cooldown}s</AppText>
                  ) : (
                    <AppText variant="bodyMedium" color={colors.meta}>Didn't get it? <AppText variant="bodyMedium" color={colors.ink}>Resend code</AppText></AppText>
                  )}
                </Pressable>
              </View>
          )}

          <View style={styles.flex} />
          <Pressable onPress={onSignup} style={styles.center}>
            <AppText variant="body" color={colors.meta}>New partner? <AppText variant="bodyMedium" color={colors.ink}>Create an account</AppText></AppText>
          </Pressable>
          <AppText variant="meta" color={colors.meta} style={styles.terms}>By continuing you accept the Partner Terms · Privacy</AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/* ─── SIGNUP ────────────────────────────────────────────────── */
function SignupView({ onLogin }: { onLogin: () => void }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [city, setCity] = useState('');

  const create = () => {
    if (name.trim().length < 2) return showToast('Enter your name', 'Your full name', 'alert-circle');
    if (phone.replace(/\D/g, '').length !== 10) return showToast('Check mobile', 'A valid 10-digit number', 'alert-circle');
    if (!vehicle) return showToast('Pick a vehicle', 'Select your delivery vehicle', 'alert-circle');
    if (vehicleNo.trim().length < 4 && vehicle !== 'Bicycle') return showToast('Vehicle number', 'Enter your vehicle number', 'alert-circle');
    if (city.trim().length < 2) return showToast('Enter city', 'Where do you deliver?', 'alert-circle');
    // Accounts are created automatically on first phone-OTP sign-in (no separate signup).
    showToast('Just sign in', 'Your account is created when you verify your phone', 'smartphone');
    onLogin();
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Brand />
          <AppText variant="display" color={colors.ink} style={styles.headline}>Become a{'\n'}partner</AppText>
          <AppText variant="body" color={colors.meta} style={styles.sub}>Tell us a bit about you and your vehicle.</AppText>

          <View style={styles.form}>
            <Field label="Full name" required value={name} onChangeText={setName} placeholder="e.g. Ravi Kumar" autoCapitalize="words" />
            <Field label="Mobile number" required prefix="+91" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))} placeholder="00000 00000" keyboardType="number-pad" maxLength={10} />

            <View style={styles.block}>
              <AppText variant="sectionLabel" color={colors.meta} style={styles.blockLabel}>Vehicle *</AppText>
              <View style={styles.chips}>
                {VEHICLES.map((v) => {
                  const on = vehicle === v;
                  return (
                    <Pressable key={v} onPress={() => setVehicle(v)} style={[styles.chip, on && styles.chipOn]}>
                      <AppText variant="bodyMedium" color={on ? colors.accentInk : colors.ink}>{v}</AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Field label="Vehicle number" value={vehicleNo} onChangeText={(t) => setVehicleNo(t.toUpperCase())} placeholder="MP 09 AB 1234" autoCapitalize="characters" autoCorrect={false} />
            <Field label="City / zone" required value={city} onChangeText={setCity} placeholder="e.g. Indore" autoCapitalize="words" />

            <Button label="Create account" tone="accent" onPress={create} icon={<Icon name="checkmark" size={18} color={colors.accentInk} />} />
          </View>

          <Pressable onPress={onLogin} style={[styles.center, { marginTop: spacing.lg }]}>
            <AppText variant="body" color={colors.meta}>Already a partner? <AppText variant="bodyMedium" color={colors.ink}>Log in</AppText></AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/* ─── COMPLETE PROFILE (new drivers, post-OTP) ──────────────────── */
export function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const { phone, completeProfile, signOut, showToast } = useApp();
  const [name, setName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    if (name.trim().length < 2) return showToast('Enter your name', 'Your full name', 'alert-circle');
    if (!vehicle) return showToast('Pick a vehicle', 'Select your delivery vehicle', 'alert-circle');
    if (vehicleNo.trim().length < 4 && vehicle !== 'Bicycle') return showToast('Vehicle number', 'Enter your vehicle number', 'alert-circle');
    if (city.trim().length < 2) return showToast('Enter city', 'Where do you deliver?', 'alert-circle');
    setBusy(true);
    try {
      await completeProfile({
        name: name.trim(),
        vehicleType: vehicle,
        ...(vehicleNo.trim() ? { vehicleNumber: vehicleNo.trim() } : {}),
        city: city.trim(),
      });
    } catch {
      showToast('Could not save', 'Please try again', 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Brand />
          <AppText variant="display" color={colors.ink} style={styles.headline}>Set up{'\n'}your profile</AppText>
          <AppText variant="body" color={colors.meta} style={styles.sub}>
            You're verified as <AppText variant="bodyMedium" color={colors.ink}>{phone ?? 'your number'}</AppText>. Add a few details to start delivering.
          </AppText>

          <View style={styles.form}>
            <Field label="Full name" required value={name} onChangeText={setName} placeholder="e.g. Ravi Kumar" autoCapitalize="words" />

            <View style={styles.block}>
              <AppText variant="sectionLabel" color={colors.meta} style={styles.blockLabel}>Vehicle *</AppText>
              <View style={styles.chips}>
                {VEHICLES.map((v) => {
                  const on = vehicle === v;
                  return (
                    <Pressable key={v} onPress={() => setVehicle(v)} style={[styles.chip, on && styles.chipOn]}>
                      <AppText variant="bodyMedium" color={on ? colors.accentInk : colors.ink}>{v}</AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Field label="Vehicle number" value={vehicleNo} onChangeText={(t) => setVehicleNo(t.toUpperCase())} placeholder="MP 09 AB 1234" autoCapitalize="characters" autoCorrect={false} />
            <Field label="City / zone" required value={city} onChangeText={setCity} placeholder="e.g. Indore" autoCapitalize="words" />

            <Button label={busy ? 'Saving…' : 'Start delivering'} tone="accent" disabled={busy} onPress={finish} icon={<Icon name="checkmark" size={18} color={colors.accentInk} />} />
          </View>

          <Pressable onPress={signOut} style={[styles.center, { marginTop: spacing.lg }]}>
            <AppText variant="body" color={colors.meta}>Wrong number? <AppText variant="bodyMedium" color={colors.ink}>Sign out</AppText></AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // maxWidth + centering keeps the form a comfortable column on tablets/landscape
  // instead of stretching edge-to-edge; phones are unaffected.
  content: { paddingHorizontal: spacing.screenH, paddingBottom: spacing.xl, flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  brandMark: { width: 44, height: 44, borderRadius: radii.sm + 4, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  headline: { fontSize: 36, lineHeight: 40, marginTop: spacing.xl },
  sub: { marginTop: spacing.sm },
  form: { marginTop: spacing.lg, gap: spacing.lg },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  otpRow: { flexDirection: 'row', gap: spacing.sm + 4 },
  // flex + maxWidth (was a fixed 62px): 4 fixed boxes + gaps + screen padding
  // overflowed 320dp screens; now the boxes shrink together and never spill.
  otpBox: { flex: 1, maxWidth: 62, height: 66, borderRadius: radii.sm + 4, borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.surface, textAlign: 'center', fontFamily: fonts.black, fontSize: 26, color: colors.ink },
  otpBoxFilled: { backgroundColor: colors.ink, borderColor: colors.ink, color: colors.surface },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  center: { alignItems: 'center' },
  terms: { textAlign: 'center', marginTop: spacing.lg },
  block: { gap: spacing.sm },
  blockLabel: { marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.hairline },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
});

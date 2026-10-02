// Trendzo Partner auth — phone-OTP login (MSG91 or Slide, per the backend). First OTP verify creates the driver
// account server-side (instant-active), so this is the only sign-in surface: there is no
// email login and no separate signup form.
import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
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
import { driverOtpLogin, fetchOtpConfig } from '../api';
import { isApiError } from '../api/errors';
import { useOtp } from '../services/otp';

const VEHICLES = ['Bike', 'Scooter', 'Car', 'Bicycle'];

export default function AuthScreen() {
  // Phone OTP is the only sign-in the backend supports, and it creates the driver
  // account on first verify — so there is no separate signup and no email path.
  return <LoginView />;
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
function LoginView() {
  const insets = useSafeAreaInsets();
  const { signIn, showToast } = useApp();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  // Phone OTP provider (MSG91 or Slide) as selected by the backend; see services/otp. The
  // code length follows the provider, so the digit boxes are sized from it.
  const otpClient = useOtp(fetchOtpConfig);
  const otpLength = otpClient.otpLength;
  const [otp, setOtp] = useState<string[]>(() => Array(otpLength).fill(''));
  const [busy, setBusy] = useState(false);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const phoneValid = phone.replace(/\D/g, '').length === 10;

  // The config can land after the first render (and change the length): keep the boxes in step.
  useEffect(() => {
    setOtp((cur) => (cur.length === otpLength ? cur : Array(otpLength).fill('')));
  }, [otpLength]);

  const sendOtp = async () => {
    if (busy) return;
    if (!phoneValid) return showToast('Enter your number', 'A valid 10-digit mobile number', 'alert-circle');
    Keyboard.dismiss();
    setBusy(true);
    try {
      await otpClient.send('91', phone.replace(/\D/g, ''));
      setOtp(Array(otpClient.otpLength).fill(''));
      setStep('otp');
      showToast('OTP sent', `Code sent to +91 ${phone}`, 'message-square');
    } catch (e: any) {
      showToast('Could not send OTP', e?.message ?? 'Try again', 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await otpClient.resend();
      setOtp(Array(otpLength).fill(''));
      otpRefs.current[0]?.focus();
      showToast('OTP resent', `New code sent to +91 ${phone}`, 'refresh-cw');
    } catch (e: any) {
      showToast('Could not resend', e?.message ?? 'Try again', 'alert-circle');
    } finally {
      setBusy(false);
    }
  };
  const setDigit = (i: number, v: string) => {
    const digits = v.replace(/\D/g, '');
    // iOS one-time-code autofill (and paste) drops the whole code into a single box —
    // taking only the last character silently threw away all but one digit. Only a full
    // code claims every box; anything shorter is ordinary typing into one box.
    if (digits.length >= otpLength) {
      const next = digits.slice(-otpLength).split('');
      setOtp(next);
      otpRefs.current[otpLength - 1]?.focus();
      Keyboard.dismiss();
      return;
    }
    const d = digits.slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < otpLength - 1) otpRefs.current[i + 1]?.focus();
  };
  const verify = async () => {
    if (busy) return;
    const code = otp.join('').replace(/\D/g, '');
    // Dismiss first: on a tablet the keyboard covers the lower third of the screen, and
    // every outcome of this call reports itself down there.
    Keyboard.dismiss();
    if (code.length < otpLength) return showToast('Enter the code', `Type all ${otpLength} digits`, 'alert-circle');
    setBusy(true);
    try {
      const { accessToken, provider } = await otpClient.verify(code);
      const { token, driver, isNew } = await driverOtpLogin(accessToken, provider);
      signIn({ token, phone: `+91 ${phone}`, driver, isNew });
    } catch (e: any) {
      showToast('Sign-in failed', isApiError(e) ? e.message : (e?.message ?? 'Invalid OTP'), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Brand />

          <AppText variant="display" color={colors.ink} style={styles.headline}>
            {step === 'otp' ? 'Enter\nthe code' : 'Log in to\nstart earning'}
          </AppText>

          {step === 'phone' ? (
            <View style={styles.form}>
              <Field label="Mobile number" required prefix="+91" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))} placeholder="00000 00000" keyboardType="number-pad" maxLength={10} />
              <Button label={busy ? 'Sending…' : 'Send OTP'} tone="accent" loading={busy} disabled={!phoneValid || busy} onPress={sendOtp} icon={<Icon name="arrow-forward" size={18} color={colors.accentInk} />} />
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
                    ref={(r) => { otpRefs.current[i] = r; }}
                    value={d}
                    onChangeText={(v) => setDigit(i, v)}
                    onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={i === 0 ? otpLength : 1}
                    style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
                  />
                ))}
              </View>
              <View style={styles.hintRow}>
                <Icon name="information-circle-outline" size={15} color={colors.meta} />
                <AppText variant="meta" color={colors.meta}>Enter the {otpLength}-digit code we texted you</AppText>
              </View>
              <Button label={busy ? 'Verifying…' : 'Verify & continue'} tone="accent" loading={busy} disabled={busy} onPress={verify} icon={<Icon name="checkmark" size={18} color={colors.accentInk} />} />
              <Pressable onPress={resendOtp} disabled={busy} style={styles.center}>
                <AppText variant="bodyMedium" color={colors.meta}>Didn't get it? <AppText variant="bodyMedium" color={colors.ink}>Resend code</AppText></AppText>
              </Pressable>
            </View>
          )}

          <View style={styles.flex} />
          <AppText variant="meta" color={colors.meta} style={styles.terms}>By continuing you accept the Partner Terms · Privacy</AppText>
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
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
  content: { paddingHorizontal: spacing.screenH, paddingBottom: spacing.xl, flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  brandMark: { width: 44, height: 44, borderRadius: radii.sm + 4, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  headline: { fontSize: 36, lineHeight: 40, marginTop: spacing.xl },
  sub: { marginTop: spacing.sm },
  form: { marginTop: spacing.lg, gap: spacing.lg },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  otpRow: { flexDirection: 'row', gap: spacing.md },
  otpBox: { width: 62, height: 66, borderRadius: radii.sm + 4, borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.surface, textAlign: 'center', fontFamily: fonts.black, fontSize: 26, color: colors.ink },
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

// Trendzo Partner auth — login (phone OTP or email) + create account.
// Demo only: OTP is 1234 / any 4 digits; signup just needs valid-looking fields.
import React, { useMemo, useRef, useState } from 'react';
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

const DEMO_OTP = '1234';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  const phoneValid = phone.replace(/\D/g, '').length === 10;

  const sendOtp = () => {
    if (!phoneValid) return showToast('Enter your number', 'A valid 10-digit mobile number', 'alert-circle');
    setStep('otp');
    showToast('OTP sent', `Code sent to +91 ${phone}`, 'message-square');
  };
  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 3) otpRefs[i + 1].current?.focus();
  };
  const verify = () => {
    if (otp.join('').length < 4) return showToast('Enter the code', 'Type all 4 digits', 'alert-circle');
    signIn('+91 ' + phone);
  };
  const emailLogin = () => {
    if (!EMAIL_RE.test(email.trim())) return showToast('Invalid email', 'Enter a valid email address', 'alert-circle');
    if (password.length < 6) return showToast('Check password', 'At least 6 characters', 'alert-circle');
    signIn(email.trim());
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Brand />

          <AppText variant="display" color={colors.ink} style={styles.headline}>
            {method === 'phone' && step === 'otp' ? 'Enter\nthe code' : 'Log in to\nstart earning'}
          </AppText>

          {/* method toggle */}
          {step === 'phone' && (
            <View style={styles.toggle}>
              <ToggleBtn label="Phone OTP" active={method === 'phone'} onPress={() => setMethod('phone')} />
              <ToggleBtn label="Email" active={method === 'email'} onPress={() => setMethod('email')} />
            </View>
          )}

          {method === 'phone' ? (
            step === 'phone' ? (
              <View style={styles.form}>
                <Field label="Mobile number" required prefix="+91" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))} placeholder="00000 00000" keyboardType="number-pad" maxLength={10} />
                <Button label="Send OTP" tone="accent" disabled={!phoneValid} onPress={sendOtp} icon={<Icon name="arrow-forward" size={18} color={colors.accentInk} />} />
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
                      maxLength={1}
                      style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
                    />
                  ))}
                </View>
                <View style={styles.hintRow}>
                  <Icon name="information-circle-outline" size={15} color={colors.meta} />
                  <AppText variant="meta" color={colors.meta}>Demo OTP is {DEMO_OTP} · or any 4 digits</AppText>
                </View>
                <Button label="Verify & continue" tone="accent" onPress={verify} icon={<Icon name="checkmark" size={18} color={colors.accentInk} />} />
                <Pressable onPress={() => showToast('OTP resent', `New code sent to +91 ${phone}`, 'refresh-cw')} style={styles.center}>
                  <AppText variant="bodyMedium" color={colors.meta}>Didn't get it? <AppText variant="bodyMedium" color={colors.ink}>Resend code</AppText></AppText>
                </Pressable>
              </View>
            )
          ) : (
            <View style={styles.form}>
              <Field label="Email" required value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <Field label="Password" required value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry autoCapitalize="none" />
              <Button label="Log in" tone="accent" onPress={emailLogin} />
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
  const { signIn, showToast } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [city, setCity] = useState('');

  const create = () => {
    if (name.trim().length < 2) return showToast('Enter your name', 'Your full name', 'alert-circle');
    if (phone.replace(/\D/g, '').length !== 10) return showToast('Check mobile', 'A valid 10-digit number', 'alert-circle');
    if (!EMAIL_RE.test(email.trim())) return showToast('Check email', 'Enter a valid email', 'alert-circle');
    if (password.length < 6) return showToast('Weak password', 'At least 6 characters', 'alert-circle');
    if (!vehicle) return showToast('Pick a vehicle', 'Select your delivery vehicle', 'alert-circle');
    if (vehicleNo.trim().length < 4 && vehicle !== 'Bicycle') return showToast('Vehicle number', 'Enter your vehicle number', 'alert-circle');
    if (city.trim().length < 2) return showToast('Enter city', 'Where do you deliver?', 'alert-circle');
    showToast('Account created', 'Welcome to Trendzo Partner', 'check-circle');
    signIn('+91 ' + phone);
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Brand />
          <AppText variant="display" color={colors.ink} style={styles.headline}>Become a{'\n'}partner</AppText>
          <AppText variant="body" color={colors.meta} style={styles.sub}>Tell us a bit about you and your vehicle.</AppText>

          <View style={styles.form}>
            <Field label="Full name" required value={name} onChangeText={setName} placeholder="e.g. Ravi Kumar" autoCapitalize="words" />
            <Field label="Mobile number" required prefix="+91" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))} placeholder="00000 00000" keyboardType="number-pad" maxLength={10} />
            <Field label="Email" required value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Field label="Password" required value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry autoCapitalize="none" />

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

function ToggleBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggleBtn, active && styles.toggleBtnOn]}>
      <AppText variant="bodyMedium" color={active ? colors.accentInk : colors.meta}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.screenH, paddingBottom: spacing.xl, flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  brandMark: { width: 44, height: 44, borderRadius: radii.sm + 4, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  headline: { fontSize: 36, lineHeight: 40, marginTop: spacing.xl },
  sub: { marginTop: spacing.sm },
  toggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.pill, padding: 4, marginTop: spacing.lg, gap: 4 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radii.pill },
  toggleBtnOn: { backgroundColor: colors.ink },
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

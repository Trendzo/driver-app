// Real detail pages for every Profile menu item (no more toasts).
// Each is a full screen with a back header, built from the brutalist kit.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, ScreenHeader, AsciiDivider, BrutalButton, StatTile, InfoRow, MapPanel } from '../components/Brutal';
import { useApp } from '../state/AppState';
import { VEHICLE, DOCUMENTS, BANK, FAQS, HOTSPOTS, HOW_STEPS, RIDER } from '../data/mockData';

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  const nav = useNavigation<any>();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScreenHeader title={title} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

function Hero({ icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <View style={[{ padding: SP.l, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: SP.m }, BORDER(2)]}>
      <View style={[{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }, BORDER(1)]}>
        <Feather name={icon} size={26} color={C.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 22, color: C.white, letterSpacing: -0.5 }}>{title}</Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: C.white, opacity: 0.7, marginTop: 2, letterSpacing: 1 }}>{sub.toUpperCase()}</Text>
      </View>
    </View>
  );
}

function StatusChip({ status }: { status: 'VERIFIED' | 'EXPIRING' | 'PENDING' }) {
  const solid = status === 'VERIFIED';
  return (
    <View style={[{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: solid ? C.ink : C.white }, BORDER(1)]}>
      <Text style={{ fontFamily: 'Inter_900Black', fontSize: 9, letterSpacing: 0.5, color: solid ? C.white : C.ink }}>{status}</Text>
    </View>
  );
}

// ─── VEHICLE ───────────────────────────────────────────────
export function VehicleScreen() {
  const { showToast } = useApp();
  const rows: [string, string][] = [
    ['Type', VEHICLE.type], ['Model', VEHICLE.model], ['Number plate', VEHICLE.plate],
    ['Colour', VEHICLE.color], ['Year', VEHICLE.year], ['Fuel', VEHICLE.fuel],
  ];
  return (
    <Page title="Vehicle">
      <Hero icon="truck" title={VEHICLE.model} sub={VEHICLE.plate} />
      <View style={[{ paddingHorizontal: SP.m, marginTop: SP.l }, BORDER(1)]}>
        {rows.map((r, i) => (
          <View key={r[0]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: C.dim, letterSpacing: 1 }}>{r[0].toUpperCase()}</Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink }}>{r[1]}</Text>
            </View>
            {i < rows.length - 1 && <View style={{ height: 1, backgroundColor: C.hairline }} />}
          </View>
        ))}
      </View>
      <BrutalButton label="Request vehicle change" icon="edit-2" variant="outline" block style={{ marginTop: SP.l }} onPress={() => showToast('Request sent', 'Support will verify new vehicle docs', 'truck')} />
    </Page>
  );
}

// ─── DOCUMENTS ─────────────────────────────────────────────
export function DocumentsScreen() {
  const { showToast } = useApp();
  return (
    <Page title="Documents">
      <Hero icon="file-text" title="All verified" sub="5 documents on file" />
      <View style={{ marginTop: SP.l }}>
        {DOCUMENTS.map((d) => (
          <Pressable key={d.name} onPress={() => showToast(d.name, d.status === 'EXPIRING' ? 'Renew before expiry to keep riding' : 'Document verified', 'file-text')} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginBottom: SP.s }, BORDER(1)]}>
            <View style={[{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
              <Feather name={d.icon} size={18} color={C.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink }}>{d.name}</Text>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: C.dim, marginTop: 1 }}>{d.sub}</Text>
            </View>
            <StatusChip status={d.status} />
          </Pressable>
        ))}
      </View>
      <BrutalButton label="Upload a document" icon="upload" variant="outline" block style={{ marginTop: SP.s }} onPress={() => showToast('Upload', 'Choose a document to upload', 'upload')} />
    </Page>
  );
}

// ─── BANK / PAYOUTS ────────────────────────────────────────
export function PayoutsScreen() {
  const { showToast, balance } = useApp();
  const nav = useNavigation<any>();
  const rows: [string, string][] = [
    ['Account holder', BANK.holder], ['Bank', BANK.bank], ['Account', BANK.account],
    ['IFSC', BANK.ifsc], ['UPI', BANK.upi], ['Payout schedule', BANK.schedule],
  ];
  return (
    <Page title="Bank & Payouts">
      <View style={[{ padding: SP.l, backgroundColor: C.ink }, BORDER(2)]}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: C.white, opacity: 0.7 }}>AVAILABLE TO WITHDRAW</Text>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 44, color: C.white, letterSpacing: -2, marginTop: 2 }}>₹{balance}</Text>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.white, opacity: 0.7 }}>{BANK.bank} · {BANK.account}</Text>
      </View>
      <BrutalButton label="Withdraw to bank" icon="download" big block style={{ marginTop: SP.l }} onPress={() => nav.navigate('Withdraw')} />
      <View style={[{ paddingHorizontal: SP.m, marginTop: SP.l }, BORDER(1)]}>
        {rows.map((r, i) => (
          <View key={r[0]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: C.dim, letterSpacing: 1 }}>{r[0].toUpperCase()}</Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.ink }}>{r[1]}</Text>
            </View>
            {i < rows.length - 1 && <View style={{ height: 1, backgroundColor: C.hairline }} />}
          </View>
        ))}
      </View>
      <BrutalButton label="Change bank account" icon="edit-2" variant="outline" block style={{ marginTop: SP.l }} onPress={() => showToast('Verify to change', 'A new bank account needs OTP verification', 'credit-card')} />
    </Page>
  );
}

// ─── WORK ZONE ─────────────────────────────────────────────
export function WorkZoneScreen() {
  return (
    <Page title="Work Zone">
      <Hero icon="map" title={RIDER.zone} sub="Indore, Madhya Pradesh" />
      <View style={{ marginTop: SP.l }}>
        <MapPanel height={170} label="YOUR ZONE" from="HOME" to="ZONE" />
      </View>
      <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.l }}>
        <StatTile label="Operating" value="6 AM" sub="to 12 AM" style={{ flex: 1 }} />
        <StatTile label="Hotspots" value={`${HOTSPOTS.length}`} sub="nearby" style={{ flex: 1 }} />
      </View>
      <View style={{ marginTop: SP.xl }}>
        <AsciiDivider />
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} DEMAND HOTSPOTS</Text>
        <AsciiDivider faint style={{ marginTop: 4 }} />
      </View>
      {HOTSPOTS.map((h) => (
        <View key={h.name} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginTop: SP.s }, BORDER(1)]}>
          <View style={[{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
            <Feather name="map-pin" size={16} color={C.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.ink }}>{h.name}</Text>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: C.dim, marginTop: 1 }}>{h.area}</Text>
          </View>
          <View style={[{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: h.demand === 'HIGH' ? C.ink : C.white }, BORDER(1)]}>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 9, color: h.demand === 'HIGH' ? C.white : C.ink }}>{h.demand}</Text>
          </View>
        </View>
      ))}
    </Page>
  );
}

// ─── HELP & SUPPORT ────────────────────────────────────────
export function HelpScreen() {
  const { showToast } = useApp();
  const nav = useNavigation<any>();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Page title="Help & Support">
      <Hero icon="help-circle" title="We're here 24×7" sub="Average reply · 2 min" />
      <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.l }}>
        <Pressable onPress={() => Linking.openURL('tel:+918000000000').catch(() => showToast('Support', 'Call 1800-TRENDZO', 'phone'))} style={[{ flex: 1, alignItems: 'center', paddingVertical: SP.l, backgroundColor: C.ink }, BORDER(1)]}>
          <Feather name="phone" size={22} color={C.white} />
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 13, color: C.white, marginTop: 8, letterSpacing: 0.5 }}>CALL US</Text>
        </Pressable>
        <Pressable onPress={() => showToast('Chat support', 'A support agent will join shortly', 'message-circle')} style={[{ flex: 1, alignItems: 'center', paddingVertical: SP.l }, BORDER(1)]}>
          <Feather name="message-circle" size={22} color={C.ink} />
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 13, color: C.ink, marginTop: 8, letterSpacing: 0.5 }}>CHAT</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: SP.xl }}>
        <AsciiDivider />
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} COMMON QUESTIONS</Text>
        <AsciiDivider faint style={{ marginTop: 4 }} />
      </View>
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <Pressable key={i} onPress={() => setOpen(isOpen ? null : i)} style={[{ padding: SP.m, marginTop: SP.s }, BORDER(1)]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: C.ink, flex: 1 }}>{f.q}</Text>
              <Feather name={isOpen ? 'minus' : 'plus'} size={18} color={C.ink} />
            </View>
            {isOpen && <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.dim, marginTop: 8, lineHeight: 19 }}>{f.a}</Text>}
          </Pressable>
        );
      })}

      <BrutalButton label="Raise a ticket" icon="alert-circle" variant="outline" block style={{ marginTop: SP.l }} onPress={() => showToast('Ticket raised', 'We will get back within 24h', 'check')} />
      <BrutalButton label="Emergency · Safety SOS" icon="alert-octagon" block style={{ marginTop: SP.s }} onPress={() => nav.navigate('Safety')} />
    </Page>
  );
}

// ─── HOW TRENDZO WORKS ─────────────────────────────────────
export function HowItWorksScreen() {
  return (
    <Page title="How it works">
      <Hero icon="book-open" title="5 simple steps" sub="Ride · Deliver · Earn" />
      <View style={{ marginTop: SP.l }}>
        {HOW_STEPS.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: SP.m }}>
            <View style={{ alignItems: 'center', width: 44 }}>
              <View style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }, BORDER(1)]}>
                <Feather name={s.icon} size={18} color={C.white} />
              </View>
              {i < HOW_STEPS.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: C.hairline, marginTop: 2, minHeight: 18 }} />}
            </View>
            <View style={[{ flex: 1, padding: SP.m, marginBottom: 2 }, BORDER(1)]}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim, letterSpacing: 1 }}>STEP {i + 1}</Text>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.ink, marginTop: 2 }}>{s.title}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.dim, marginTop: 3, lineHeight: 19 }}>{s.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </Page>
  );
}

// ─── ID VERIFICATION (KYC) ─────────────────────────────────
type VStatus = 'todo' | 'verifying' | 'done';
export function IdVerificationScreen() {
  const { showToast } = useApp();
  const nav = useNavigation<any>();
  const STEPS = [
    { key: 'aadhaar', icon: 'credit-card', name: 'Aadhaar card', sub: 'Verify with OTP on your linked mobile' },
    { key: 'pan', icon: 'file-text', name: 'PAN card', sub: 'Confirm your PAN details' },
    { key: 'selfie', icon: 'camera', name: 'Live selfie', sub: 'Match your face to your documents' },
  ] as const;
  // aadhaar starts done (from onboarding); others to-do.
  const [status, setStatus] = useState<Record<string, VStatus>>({ aadhaar: 'done', pan: 'todo', selfie: 'todo' });

  const verify = (key: string, name: string) => {
    if (status[key] === 'done') return;
    setStatus(s => ({ ...s, [key]: 'verifying' }));
    showToast('Verifying…', `${name} is being checked`, 'loader');
    setTimeout(() => {
      setStatus(s => ({ ...s, [key]: 'done' }));
      showToast('Verified', `${name} verified successfully`, 'check-circle');
    }, 1600);
  };

  const doneCount = Object.values(status).filter(v => v === 'done').length;
  const allDone = doneCount === STEPS.length;

  return (
    <Page title="ID Verification">
      <View style={[{ padding: SP.l, backgroundColor: allDone ? C.ink : C.white }, BORDER(2)]}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: allDone ? C.white : C.dim }}>KYC STATUS</Text>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 26, letterSpacing: -0.8, color: allDone ? C.white : C.ink, marginTop: 4 }}>
          {allDone ? 'FULLY VERIFIED' : `${doneCount} OF ${STEPS.length} DONE`}
        </Text>
        <View style={{ height: 8, backgroundColor: allDone ? C.white : C.hairline, marginTop: SP.m }}>
          <View style={{ height: 8, backgroundColor: C.ink, width: `${(doneCount / STEPS.length) * 100}%` }} />
        </View>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: allDone ? C.white : C.dim, marginTop: SP.s }}>
          {allDone ? 'You are fully verified and can take orders.' : 'Complete all steps to keep your account active.'}
        </Text>
      </View>

      <View style={{ marginTop: SP.xl }}>
        <AsciiDivider />
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} VERIFICATION STEPS</Text>
        <AsciiDivider faint style={{ marginTop: 4 }} />
      </View>

      {STEPS.map((st) => {
        const s = status[st.key];
        return (
          <View key={st.key} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginTop: SP.s, backgroundColor: s === 'done' ? C.ink : C.white }, BORDER(1)]}>
            <View style={[{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: s === 'done' ? C.white : C.white }, BORDER(1)]}>
              <Feather name={s === 'done' ? 'check' : (st.icon as any)} size={18} color={C.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: s === 'done' ? C.white : C.ink }}>{st.name}</Text>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: s === 'done' ? C.white : C.dim, marginTop: 1, opacity: s === 'done' ? 0.7 : 1 }}>{st.sub}</Text>
            </View>
            {s === 'done' ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.white }}>
                <Text style={{ fontFamily: 'Inter_900Black', fontSize: 9, color: C.ink }}>VERIFIED</Text>
              </View>
            ) : s === 'verifying' ? (
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: C.dim }}>CHECKING…</Text>
            ) : (
              <Pressable onPress={() => verify(st.key, st.name)} style={[{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.ink }, BORDER(1)]}>
                <Text style={{ fontFamily: 'Inter_900Black', fontSize: 11, color: C.white, letterSpacing: 0.5 }}>VERIFY</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: C.dim, marginTop: SP.l, lineHeight: 16 }}>
        Your documents are encrypted and used only for identity verification as per Trendzo's partner policy.
      </Text>

      {allDone && (
        <BrutalButton label="Done" icon="check" big block style={{ marginTop: SP.l }} onPress={() => nav.goBack()} />
      )}
    </Page>
  );
}

// ─── RATE THE APP ──────────────────────────────────────────
export function RateScreen() {
  const { showToast } = useApp();
  const nav = useNavigation<any>();
  const [stars, setStars] = useState(0);
  return (
    <Page title="Rate the app">
      <View style={{ alignItems: 'center', marginTop: SP.l }}>
        <View style={[{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }, BORDER(2)]}>
          <Feather name="star" size={40} color={C.white} />
        </View>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 24, color: C.ink, marginTop: SP.l, textAlign: 'center', letterSpacing: -0.5 }}>ENJOYING TRENDZO?</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.dim, marginTop: 6, textAlign: 'center' }}>Tap the stars to rate your experience.</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: SP.xl }}>
          {[1, 2, 3, 4, 5].map(n => (
            <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}>
              <Feather name="star" size={40} color={n <= stars ? C.ink : C.faint} />
            </Pressable>
          ))}
        </View>
      </View>
      <BrutalButton
        label="Submit rating"
        icon="send"
        big block
        disabled={stars === 0}
        style={{ marginTop: SP.xxl }}
        onPress={() => { showToast('Thank you', stars >= 4 ? 'Glad you ride with Trendzo!' : 'We will keep improving', 'star'); nav.goBack(); }}
      />
    </Page>
  );
}

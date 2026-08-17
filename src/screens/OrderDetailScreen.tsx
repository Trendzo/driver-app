// ORDER DETAIL — drives Flow A (Standard / Express), reverse-pickup collect,
// the not-home / undelivered path, abort, and the pre-door steps of Try-and-Buy
// (then hands off to the Door screen). One obvious action per state.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Modal, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { C, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, ScreenHeader, SwipeToConfirm, BrutalButton, MapPanel, BrutalInput, AsciiDivider } from '../components/Brutal';
import { MethodBadge, PolicyBadge } from '../components/DeliveryBits';
import { useApp } from '../state/AppState';
import { formatPaise } from '../utils/money';
import { STATE_LABEL, METHOD_LABEL, UNDELIVERED_REASONS } from '../data/mockData';

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params;
  const {
    getOrder, proofPhoto, setProofPhoto, showConfirm, handoffCodeFor,
    startDelivery, markDelivered, markUndelivered, retryDelivery,
    returnToStore, abort, collectReverse, openDoorHandover,
  } = useApp();
  const o = getOrder(id);

  const [captureFor, setCaptureFor] = useState<null | 'proof' | 'location' | 'reverse'>(null);
  const [codModal, setCodModal] = useState(false);
  const [reasonModal, setReasonModal] = useState(false);
  const [startedModal, setStartedModal] = useState(false); // "delivery started" confirmation
  const [cod, setCod] = useState('');
  const [otp, setOtp] = useState(''); // consumer delivery OTP (door deliveries carry one)
  const [busy, setBusy] = useState(false);
  // Cash-refund handover ack (COD reverse pickups). Reset per order alongside the photo.
  const [cashAcked, setCashAcked] = useState(false);

  // fresh photo gate every time we open a delivery
  useEffect(() => { setProofPhoto(null); setCashAcked(false); }, [id]);
  // returning from the location photo → ask for the not-home reason
  useEffect(() => {
    if (proofPhoto && captureFor === 'location') { setReasonModal(true); }
  }, [proofPhoto, captureFor]);

  if (!o) {
    // The order left the active list (delivered / returned) — show a done state, not a blank page.
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScreenHeader title="Order" onBack={() => nav.popToTop()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SP.l, gap: 6 }}>
          <Feather name="check-circle" size={44} color={C.faint} />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 19, color: C.ink, marginTop: 10 }}>Order completed</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, textAlign: 'center' }}>This order is no longer active.</Text>
          <View style={{ height: SP.m }} />
          <BrutalButton label="Back to deliveries" icon="arrow-left" onPress={() => nav.popToTop()} />
        </View>
      </View>
    );
  }

  const isReverse = o.method === 'REVERSE_PICKUP';
  const isTryBuy = o.method === 'TRY_AND_BUY';
  // Where is the agent headed right now?
  const goingToStore = o.state === 'packed';
  const place = goingToStore ? o.store : o.customer;

  const openCamera = (kind: 'proof' | 'location' | 'reverse') => {
    setCaptureFor(kind);
    const cfg = {
      proof: { title: 'Delivery proof', hint: 'Show the order at the doorstep' },
      location: { title: 'Location photo', hint: 'Photograph the address / door' },
      reverse: { title: 'Return item', hint: 'Photograph the item you are collecting' },
    }[kind];
    nav.navigate('ProofCamera', cfg);
  };

  const call = () => Linking.openURL(`tel:${place.phone}`).catch(() => {});
  const openMap = () => {
    const { latitude, longitude } = place.coord;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`).catch(() => {});
  };

  const finalizeDelivered = () => {
    if (o.payment === 'COD') { setCod(String(o.codAmount)); setCodModal(true); }
    else { markDelivered(o.id, { otp: otp.trim() || undefined }); nav.goBack(); }
  };
  const confirmCod = () => {
    setCodModal(false);
    markDelivered(o.id, { cod: Number(cod) || o.codAmount, otp: otp.trim() || undefined });
    nav.goBack();
  };
  const pickReason = (reason: string) => {
    setReasonModal(false);
    setCaptureFor(null);
    markUndelivered(o.id, reason);
    nav.goBack();
  };
  const doAbort = () => showConfirm({
    title: 'Abort delivery?', danger: true, icon: 'x-octagon',
    msg: 'You will carry the bag back to the store. Use this only for illness, breakdown or accident.',
    confirmLabel: 'Abort', onConfirm: () => { abort(o.id); nav.goBack(); },
  });

  // ─── the single primary action, by state ───
  const renderAction = () => {
    if (isReverse) {
      if (o.state === 'out_for_delivery') {
        // Backend proof: ≥1 photo of the goods + the customer's return OTP. And when the
        // order was cash-on-delivery, the refund is paid back in CASH at this same visit
        // — hand it over before you take the items.
        const cashDue = o.cashRefundDuePaise ?? 0;
        const ready = !!proofPhoto && otp.trim().length > 0 && (cashDue === 0 || cashAcked);
        return (
          <>
            {cashDue > 0 && (
              <>
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginBottom: SP.s, backgroundColor: C.ink }, BORDER(1)]}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: C.white }}>₹</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: C.white }}>
                      {`Hand back ${formatPaise(cashDue)} cash`}
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.white, opacity: 0.8 }}>
                      This was a cash order — give the refund before you take the items
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setCashAcked(v => !v)}
                  style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.m, marginBottom: SP.s, backgroundColor: cashAcked ? C.ink : C.white }, BORDER(1)]}
                >
                  <View style={[{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }, BORDER(1)]}>
                    {cashAcked && <Feather name="check" size={14} color={C.ink} />}
                  </View>
                  <Text style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 15, color: cashAcked ? C.white : C.ink }}>
                    {`I handed ${formatPaise(cashDue)} in cash to the customer`}
                  </Text>
                </Pressable>
              </>
            )}
            <PhotoRow photo={proofPhoto} label="Item photo (required)" onTake={() => openCamera('reverse')} />
            <View style={{ marginBottom: SP.s }}>
              <BrutalInput value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 8))} label="Customer's return OTP" placeholder="Ask the customer" keyboardType="number-pad" />
            </View>
            {cashDue > 0 && !cashAcked && (
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: C.dim, textAlign: 'center', marginBottom: SP.s }}>
                Confirm the cash handover before you collect
              </Text>
            )}
            <SwipeToConfirm
              label={cashDue > 0 ? `Hand ${formatPaise(cashDue)} + collect` : 'Confirm pickup'}
              icon="package"
              disabled={!ready}
              onConfirm={async () => {
                // Only leave the screen if the server accepted it. A rejected cash amount
                // has to stay readable and retryable — the driver is holding the money.
                const done = await collectReverse(o.id, otp.trim(), cashDue > 0 ? cashDue : undefined);
                if (done) nav.goBack();
              }}
            />
          </>
        );
      }
      if (o.state === 'returning_to_store') {
        return <BrutalButton label="Hand over at the store" icon="corner-up-left" big block onPress={() => nav.navigate('StoreHandoff', { id: o.id })} />;
      }
      return <DoneBanner label={STATE_LABEL[o.state]} />;
    }
    switch (o.state) {
      case 'packed': {
        // The STORE releases the parcel by verifying this code — the driver only shows it.
        // The list poll flips the order to `picked_up` once the store confirms.
        const code = handoffCodeFor(o.id);
        return (
          <View style={{ ...BORDER(), backgroundColor: C.white, padding: SP.l, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, letterSpacing: 1, color: C.dim, textTransform: 'uppercase' }}>
              Show this code to the store
            </Text>
            <Text style={{ fontSize: 34, fontWeight: '900', letterSpacing: 8, color: C.ink, marginTop: SP.s }}>
              {code ?? '· · · ·'}
            </Text>
            <Text style={{ fontSize: 12, color: C.dim, marginTop: SP.s, textAlign: 'center' }}>
              The store verifies it, then hands you the parcel.
            </Text>
          </View>
        );
      }
      case 'picked_up':
        // Confirm → show a clear "Delivery started" step with an Open-map CTA, instead of
        // silently swapping the footer.
        return <SwipeToConfirm label="Start delivery" icon="navigation" onConfirm={() => { startDelivery(o.id); setStartedModal(true); }} />;
      case 'out_for_delivery':
        if (isTryBuy) {
          // Handover: enter the OTP the customer reads out. Verifying it OPENS the door and
          // starts the try-on timer (the customer then chooses keep/return per item).
          return (
            <>
              <View style={{ marginBottom: SP.s }}>
                <BrutalInput value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 8))} label="Customer's handover OTP" placeholder="Ask the customer" keyboardType="number-pad" />
              </View>
              <SwipeToConfirm
                label="Hand over · start try-on"
                icon="unlock"
                disabled={otp.trim().length === 0 || busy}
                onConfirm={async () => {
                  setBusy(true);
                  const ok = await openDoorHandover(o.id, otp.trim());
                  setBusy(false);
                  if (ok) nav.navigate('Door', { id: o.id });
                }}
              />
              <View style={{ height: SP.s }} />
              <BrutalButton label="Couldn't deliver" variant="outline" icon="phone-off" block onPress={() => openCamera('location')} />
            </>
          );
        }
        return (
          <>
            <PhotoRow photo={proofPhoto} label="Proof-of-delivery photo (required)" onTake={() => openCamera('proof')} />
            <View style={{ marginBottom: SP.s }}>
              <BrutalInput value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 8))} label="Customer's delivery OTP" placeholder="Ask the customer" keyboardType="number-pad" />
            </View>
            <SwipeToConfirm label={o.payment === 'COD' ? `Collect ₹${o.codAmount} + deliver` : 'Mark delivered'} icon="check" disabled={!proofPhoto || otp.trim().length === 0} onConfirm={finalizeDelivered} />
            <View style={{ height: SP.s }} />
            <BrutalButton label="Couldn't deliver" variant="outline" icon="phone-off" block onPress={() => openCamera('location')} />
          </>
        );
      case 'at_door':
        return <BrutalButton label="Continue try-on" icon="maximize" big block onPress={() => nav.navigate('Door', { id: o.id })} />;
      case 'undelivered':
        return (
          <>
            <BrutalButton label="Retry delivery" icon="rotate-ccw" big block onPress={() => { retryDelivery(o.id); nav.goBack(); }} />
            <View style={{ height: SP.s }} />
            <BrutalButton label="Return to store" variant="outline" icon="corner-up-left" block onPress={() => { returnToStore(o.id); nav.goBack(); }} />
          </>
        );
      default:
        return <DoneBanner label={STATE_LABEL[o.state]} />;
    }
  };

  const canAbort = ['picked_up', 'out_for_delivery'].includes(o.state) && !isReverse;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />
      <ScreenHeader title={`#${o.id.replace(/^(ord_|rpk_)/, '').slice(0, 8).toUpperCase()}`} onBack={() => nav.goBack()} />

      {/* KeyboardAvoidingView: the OTP input lives in the sticky footer — without
          this the iOS keyboard covers it entirely. Android resizes natively. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* method + status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SP.m }}>
          <MethodBadge method={o.method} />
          <View style={{ flex: 1 }} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.dim }}>{STATE_LABEL[o.state]}</Text>
        </View>

        {/* map + navigate / call */}
        <MapPanel height={150} from={goingToStore ? 'YOU' : 'STORE'} to={goingToStore ? 'STORE' : 'DROP'} label={goingToStore ? 'TO STORE' : 'TO CUSTOMER'} />
        <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.s }}>
          <View style={{ flex: 1 }}><BrutalButton label="Open map" variant="outline" icon="map" small block onPress={openMap} /></View>
          <View style={{ flex: 1 }}><BrutalButton label={goingToStore ? 'Call store' : 'Call customer'} variant="outline" icon="phone" small block onPress={call} /></View>
        </View>

        {/* destination */}
        <View style={[{ marginTop: SP.l, padding: SP.m, backgroundColor: C.white }, BORDER(1)]}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: C.dim, letterSpacing: 1 }}>{goingToStore ? 'PICKUP STORE' : (isReverse ? 'COLLECT FROM' : 'DELIVER TO')}</Text>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: C.ink, marginTop: 2 }}>{place.name}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: C.dim, marginTop: 2 }}>{place.addr}</Text>
          {'landmark' in place && (place as any).landmark && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginTop: 2 }}>↳ {(place as any).landmark}</Text>
          )}
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.ink, marginTop: 6 }}>{place.distanceKm} km away</Text>
        </View>

        {/* payment */}
        <View style={[{ marginTop: SP.m, padding: SP.m, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: o.payment === 'COD' ? C.ink : C.white }, BORDER(1)]}>
          {o.payment === 'COD'
            ? <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: C.white }}>₹</Text>
            : <Feather name="check-circle" size={18} color={C.ink} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: o.payment === 'COD' ? C.white : C.ink }}>
              {o.payment === 'COD' ? `Collect ₹${o.codAmount} cash` : 'Prepaid · no cash'}
            </Text>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: o.payment === 'COD' ? C.white : C.dim, marginTop: 1 }}>
              {isTryBuy ? 'Try & Buy is always prepaid' : o.payment === 'COD' ? 'Collect before marking delivered' : 'Do not collect any cash'}
            </Text>
          </View>
        </View>

        {/* items */}
        {!isReverse && (
          <>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.dim, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: SP.l, marginBottom: SP.s }}>Items ({o.items.length})</Text>
            {o.items.map(it => (
              <View key={it.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
                <View style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.white }}>{it.qty}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: C.ink }}>{it.name}</Text>
                  {it.note && <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.dim }}>{it.note}</Text>}
                </View>
                {isTryBuy && <PolicyBadge policy={it.policy} />}
              </View>
            ))}
          </>
        )}

        {canAbort && (
          <Pressable onPress={doAbort} style={{ alignItems: 'center', marginTop: SP.l }} hitSlop={8}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.dim, textDecorationLine: 'underline' }}>Can't complete? Abort delivery</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* sticky action footer — the reverse-pickup stack (cash banner + checkbox +
          photo row + OTP + swipe) can outgrow a 320×568 screen, so the footer is
          height-capped and scrolls internally instead of squeezing the content area
          to nothing. Scrolling only engages when the content is actually taller. */}
      <View style={{ paddingBottom: insets.bottom + 14, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.hairline, maxHeight: Math.max(260, winH * 0.55) }}>
        <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SP.l, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
          {renderAction()}
        </ScrollView>
      </View>
      </KeyboardAvoidingView>

      {/* COD entry modal — keyboard-aware, height-capped, tablet-centred sheet. */}
      <Modal transparent visible={codModal} animationType="fade" onRequestClose={() => setCodModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={[{ backgroundColor: C.bg, maxHeight: '85%', width: '100%', maxWidth: 560, alignSelf: 'center' }, BORDER(2)]}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SP.l, paddingBottom: insets.bottom + 20 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: C.ink, marginBottom: 4 }}>Cash collected</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: C.dim, marginBottom: SP.l }}>Enter the amount you collected from the customer.</Text>
              <BrutalInput value={cod} onChangeText={setCod} label="Amount (₹)" keyboardType="number-pad" />
              <BrutalButton label="Confirm & mark delivered" icon="check" big block onPress={confirmCod} />
              <View style={{ height: SP.s }} />
              <BrutalButton label="Cancel" variant="ghost" block onPress={() => setCodModal(false)} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* not-home reason picker — the reason list scrolls inside a capped sheet
          so it can never run past the viewport on short/landscape screens. */}
      <Modal transparent visible={reasonModal} animationType="fade" onRequestClose={() => { setReasonModal(false); setCaptureFor(null); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={[{ backgroundColor: C.bg, maxHeight: '85%', width: '100%', maxWidth: 560, alignSelf: 'center' }, BORDER(2)]}>
            <ScrollView bounces={false} contentContainerStyle={{ padding: SP.l, paddingBottom: insets.bottom + 20 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: C.ink, marginBottom: 4 }}>Why couldn't you deliver?</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginBottom: SP.m }}>Photo attached. Pick a reason — the customer is notified.</Text>
              {UNDELIVERED_REASONS.map(r => (
                <Pressable key={r} onPress={() => pickReason(r)} style={[{ padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: C.ink }}>{r}</Text>
                </Pressable>
              ))}
              <BrutalButton label="Cancel" variant="ghost" block onPress={() => { setReasonModal(false); setCaptureFor(null); }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* "Delivery started" — clear next step after the start-delivery swipe */}
      <Modal transparent visible={startedModal} animationType="fade" onRequestClose={() => setStartedModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: SP.l }}>
          <View style={{ width: '100%', maxWidth: 420, backgroundColor: C.white, borderRadius: 18, padding: SP.l, gap: SP.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="navigation" size={20} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: C.ink }}>Delivery started</Text>
                <Text numberOfLines={2} style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.dim, marginTop: 1 }}>Head to {o.customer.name}. Open the map to navigate.</Text>
              </View>
            </View>
            <BrutalButton label="Open map" icon="map" big block onPress={() => { setStartedModal(false); openMap(); }} />
            <BrutalButton label="Continue" variant="ghost" block onPress={() => setStartedModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// photo capture row used in the action footer
function PhotoRow({ photo, label, onTake }: { photo: string | null; label: string; onTake: () => void }) {
  return (
    <Pressable onPress={onTake} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.m, marginBottom: SP.m, backgroundColor: photo ? C.ink : C.white }, BORDER(1)]}>
      <Feather name={photo ? 'check-circle' : 'camera'} size={18} color={photo ? C.white : C.ink} />
      <Text style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 16, color: photo ? C.white : C.ink }}>{photo ? 'Photo attached · tap to retake' : label}</Text>
      <Feather name="chevron-right" size={18} color={photo ? C.white : C.ink} />
    </Pressable>
  );
}

function DoneBanner({ label }: { label: string }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: SP.l, backgroundColor: C.ink }, BORDER(1)]}>
      <Feather name="check-circle" size={20} color={C.white} />
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: C.white }}>{label}</Text>
    </View>
  );
}

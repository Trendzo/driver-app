// ORDER DETAIL — drives Flow A (Standard / Express), reverse-pickup collect,
// the not-home / undelivered path, abort, and the pre-door steps of Try-and-Buy
// (then hands off to the Door screen). One obvious action per state.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { C, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, ScreenHeader, SwipeToConfirm, BrutalButton, MapPanel, BrutalInput, AsciiDivider } from '../components/Brutal';
import { MethodBadge, PolicyBadge } from '../components/DeliveryBits';
import { useApp } from '../state/AppState';
import { STATE_LABEL, METHOD_LABEL, UNDELIVERED_REASONS } from '../data/mockData';

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params;
  const {
    getOrder, proofPhoto, setProofPhoto, showConfirm,
    pickUp, startDelivery, markDelivered, markUndelivered, retryDelivery,
    returnToStore, abort, collectReverse, arriveAtDoor,
  } = useApp();
  const o = getOrder(id);

  const [captureFor, setCaptureFor] = useState<null | 'proof' | 'location' | 'reverse'>(null);
  const [codModal, setCodModal] = useState(false);
  const [reasonModal, setReasonModal] = useState(false);
  const [cod, setCod] = useState('');

  // fresh photo gate every time we open a delivery
  useEffect(() => { setProofPhoto(null); }, [id]);
  // returning from the location photo → ask for the not-home reason
  useEffect(() => {
    if (proofPhoto && captureFor === 'location') { setReasonModal(true); }
  }, [proofPhoto, captureFor]);

  if (!o) {
    return <View style={{ flex: 1, backgroundColor: C.bg }}><ScreenHeader title="Order" onBack={() => nav.goBack()} /></View>;
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
    else { markDelivered(o.id); nav.goBack(); }
  };
  const confirmCod = () => {
    setCodModal(false);
    markDelivered(o.id, { cod: Number(cod) || o.codAmount });
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
        return (
          <>
            <PhotoRow photo={proofPhoto} label="Item photo (recommended)" onTake={() => openCamera('reverse')} />
            <SwipeToConfirm label="Confirm pickup" icon="package" onConfirm={() => { collectReverse(o.id); nav.goBack(); }} />
          </>
        );
      }
      return <DoneBanner label={STATE_LABEL[o.state]} />;
    }
    switch (o.state) {
      case 'packed':
        return <SwipeToConfirm label="Picked up · bag collected" icon="shopping-bag" onConfirm={() => pickUp(o.id)} />;
      case 'picked_up':
        return <SwipeToConfirm label="Start delivery" icon="navigation" onConfirm={() => startDelivery(o.id)} />;
      case 'out_for_delivery':
        if (isTryBuy) {
          return <SwipeToConfirm label="I've arrived" icon="map-pin" onConfirm={() => { arriveAtDoor(o.id); nav.navigate('Door', { id: o.id }); }} />;
        }
        return (
          <>
            <PhotoRow photo={proofPhoto} label="Proof-of-delivery photo (required)" onTake={() => openCamera('proof')} />
            <SwipeToConfirm label={o.payment === 'COD' ? `Collect ₹${o.codAmount} + deliver` : 'Mark delivered'} icon="check" disabled={!proofPhoto} onConfirm={finalizeDelivered} />
            <View style={{ height: SP.s }} />
            <BrutalButton label="Couldn't deliver" variant="outline" icon="phone-off" block onPress={() => openCamera('location')} />
          </>
        );
      case 'at_door':
        return <BrutalButton label="Open the door flow" icon="maximize" big block onPress={() => nav.navigate('Door', { id: o.id })} />;
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
      <ScreenHeader title={`#${o.id}`} onBack={() => nav.goBack()} />

      <ScrollView contentContainerStyle={{ padding: SP.l, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* method + status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SP.m }}>
          <MethodBadge method={o.method} />
          <View style={{ flex: 1 }} />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: C.ink, letterSpacing: 0.3 }}>{STATE_LABEL[o.state].toUpperCase()}</Text>
        </View>

        {/* map + navigate / call */}
        <MapPanel height={150} from={goingToStore ? 'YOU' : 'STORE'} to={goingToStore ? 'STORE' : 'DROP'} label={goingToStore ? 'TO STORE' : 'TO CUSTOMER'} />
        <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.s }}>
          <View style={{ flex: 1 }}><BrutalButton label="Open map" variant="outline" icon="map" small block onPress={openMap} /></View>
          <View style={{ flex: 1 }}><BrutalButton label={goingToStore ? 'Call store' : 'Call customer'} variant="outline" icon="phone" small block onPress={call} /></View>
        </View>

        {/* destination */}
        <View style={[{ marginTop: SP.l, padding: SP.m, backgroundColor: C.white }, BORDER(1)]}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: C.dim, letterSpacing: 1 }}>{goingToStore ? 'PICKUP STORE' : (isReverse ? 'COLLECT FROM' : 'DELIVER TO')}</Text>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 20, color: C.ink, marginTop: 2 }}>{place.name}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: C.dim, marginTop: 2 }}>{place.addr}</Text>
          {'landmark' in place && (place as any).landmark && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginTop: 2 }}>↳ {(place as any).landmark}</Text>
          )}
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: C.ink, marginTop: 6 }}>{place.distanceKm} km away</Text>
        </View>

        {/* payment */}
        <View style={[{ marginTop: SP.m, padding: SP.m, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: o.payment === 'COD' ? C.ink : C.white }, BORDER(1)]}>
          {o.payment === 'COD'
            ? <Text style={{ fontFamily: 'Inter_900Black', fontSize: 20, color: C.white }}>₹</Text>
            : <Feather name="check-circle" size={18} color={C.ink} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: o.payment === 'COD' ? C.white : C.ink }}>
              {o.payment === 'COD' ? `COLLECT ₹${o.codAmount} CASH` : 'PREPAID · NO CASH'}
            </Text>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: o.payment === 'COD' ? C.white : C.dim, marginTop: 1 }}>
              {isTryBuy ? 'Try & Buy is always prepaid' : o.payment === 'COD' ? 'Collect before marking delivered' : 'Do not collect any cash'}
            </Text>
          </View>
        </View>

        {/* items */}
        {!isReverse && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SP.l, marginBottom: SP.s }}>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.ink }}>{ASCII.caret} ITEMS ({o.items.length})</Text>
              <View style={{ flex: 1 }}><AsciiDivider faint /></View>
            </View>
            {o.items.map(it => (
              <View key={it.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
                <View style={[{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }]}>
                  <Text style={{ fontFamily: 'Inter_900Black', fontSize: 16, color: C.white }}>{it.qty}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: C.ink }}>{it.name}</Text>
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

      {/* sticky action footer */}
      <View style={{ padding: SP.l, paddingBottom: insets.bottom + 14, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.ink }}>
        {renderAction()}
      </View>

      {/* COD entry modal */}
      <Modal transparent visible={codModal} animationType="fade" onRequestClose={() => setCodModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={[{ backgroundColor: C.bg, padding: SP.l, paddingBottom: insets.bottom + 20 }, BORDER(2)]}>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 20, color: C.ink, marginBottom: 4 }}>CASH COLLECTED</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: C.dim, marginBottom: SP.l }}>Enter the amount you collected from the customer.</Text>
            <BrutalInput value={cod} onChangeText={setCod} label="Amount (₹)" keyboardType="number-pad" />
            <BrutalButton label="Confirm & mark delivered" icon="check" big block onPress={confirmCod} />
            <View style={{ height: SP.s }} />
            <BrutalButton label="Cancel" variant="ghost" block onPress={() => setCodModal(false)} />
          </View>
        </View>
      </Modal>

      {/* not-home reason picker */}
      <Modal transparent visible={reasonModal} animationType="fade" onRequestClose={() => { setReasonModal(false); setCaptureFor(null); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={[{ backgroundColor: C.bg, padding: SP.l, paddingBottom: insets.bottom + 20 }, BORDER(2)]}>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 20, color: C.ink, marginBottom: 4 }}>WHY COULDN'T YOU DELIVER?</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: C.dim, marginBottom: SP.m }}>Photo attached. Pick a reason — the customer is notified.</Text>
            {UNDELIVERED_REASONS.map(r => (
              <Pressable key={r} onPress={() => pickReason(r)} style={[{ padding: SP.m, marginBottom: SP.s, backgroundColor: C.white }, BORDER(1)]}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: C.ink }}>{r}</Text>
              </Pressable>
            ))}
            <BrutalButton label="Cancel" variant="ghost" block onPress={() => { setReasonModal(false); setCaptureFor(null); }} />
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
      <Text style={{ fontFamily: 'Inter_900Black', fontSize: 17, color: C.white, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
    </View>
  );
}

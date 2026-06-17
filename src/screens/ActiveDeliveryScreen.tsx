// The heart of the rider app. A strict, forward-only state machine with
// exactly ONE primary action on screen at any moment, confirmed by a
// slide-to-act gesture so it can't fire by accident. Stages:
//   assigned   → ride to store        → [slide] Arrived at store
//   at_store   → tick off items       → [slide] Picked up order
//   picked_up  → ride to customer     → [slide] Reached customer
//   at_customer→ verify OTP / cash    → [slide] Delivered
//   delivered  → success → home
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, TextInput, StyleSheet, Dimensions, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, SP, BORDER, ASCII } from '../theme/brutal';
import { BrutalStatusBar, AsciiDivider, SwipeToConfirm, BrutalButton } from '../components/Brutal';
import { LiveMap } from '../components/LiveMap';
import { useApp, STAGE_ORDER } from '../state/AppState';

const { width } = Dimensions.get('window');

export default function ActiveDeliveryScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { activeOrder, stage, advanceStage, completeDelivery, showConfirm, showToast, proofPhoto } = useApp();

  const [picked, setPicked] = useState<boolean[]>([]);
  const [otp, setOtp] = useState('');
  const [cashTaken, setCashTaken] = useState(false);

  useEffect(() => {
    if (activeOrder) setPicked(activeOrder.items.map(() => false));
  }, [activeOrder?.id]);

  // Keep a snapshot of the order so the "DELIVERED" success screen keeps
  // rendering even after completeDelivery() clears the live activeOrder.
  const [snapshot, setSnapshot] = useState<typeof activeOrder>(null);
  useEffect(() => {
    if (activeOrder) setSnapshot(activeOrder);
  }, [activeOrder?.id]);

  // True from the moment the rider taps "Back to home" until this screen pops,
  // so the success view stays put instead of flashing an earlier stage.
  const [finishing, setFinishing] = useState(false);

  const o = activeOrder || snapshot;
  if (!o) return null;

  const call = (phone: string) => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() => showToast('Cannot call', 'Dialer unavailable', 'phone-off'));

  const stageIndex = STAGE_ORDER.indexOf(stage);
  const allPicked = picked.length > 0 && picked.every(Boolean);
  const otpOk = otp.length === 4;

  // ── per-stage map / header copy ──
  const header =
    stage === 'assigned' ? { kicker: 'STEP 1 OF 4 · GO TO STORE', title: 'RIDE TO PICKUP', to: 'STORE' } :
    stage === 'at_store' ? { kicker: 'STEP 2 OF 4 · COLLECT', title: 'PICK UP THE ORDER', to: 'STORE' } :
    stage === 'picked_up' ? { kicker: 'STEP 3 OF 4 · GO TO CUSTOMER', title: 'RIDE TO DROP', to: 'DROP' } :
    { kicker: 'STEP 4 OF 4 · HAND OVER', title: 'DELIVER THE ORDER', to: 'DROP' };

  // success state
  if (stage === 'delivered' || finishing) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: SP.l }}>
        <BrutalStatusBar />
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 72, color: C.ink }}>{ASCII.check}</Text>
        </MotiView>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 34, color: C.ink, marginTop: 16, textAlign: 'center', letterSpacing: -1 }}>DELIVERED!</Text>
        <AsciiDivider style={{ marginTop: SP.l }} />
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: C.ink, marginTop: SP.m }}>{`> ORDER #${o.id} COMPLETE`}</Text>
        <View style={[{ marginTop: SP.l, padding: SP.l, alignItems: 'center', width: '100%' }, BORDER(2)]}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: C.dim }}>YOU EARNED</Text>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 48, color: C.ink, letterSpacing: -2 }}>₹{o.payout + o.tip}</Text>
          {o.tip > 0 && <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.dim }}>Includes ₹{o.tip} customer tip</Text>}
        </View>
        <View style={{ width: '100%', marginTop: SP.xl }}>
          <BrutalButton label="Back to home" iconRight="home" big block onPress={() => { setFinishing(true); nav.navigate('Tabs', { screen: 'HomeTab' }); completeDelivery(); }} />
        </View>
      </View>
    );
  }

  const goingToStore = stage === 'assigned';
  const target = goingToStore || stage === 'at_store' ? o.store : o.customer;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BrutalStatusBar />

      {/* top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SP.l, paddingTop: insets.top + 8, paddingBottom: SP.s }}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10} style={[{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, BORDER(1)]}>
          <Feather name="arrow-left" size={20} color={C.ink} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: C.dim }}>ORDER #{o.id}</Text>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 14, color: C.ink, letterSpacing: 0.5 }}>₹{o.payout + o.tip} · {o.distanceKm} km</Text>
        </View>
        <Pressable onPress={() => nav.navigate('Safety')} hitSlop={10} style={[{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }, BORDER(1)]}>
          <Feather name="alert-octagon" size={20} color={C.white} />
        </Pressable>
      </View>

      {/* progress steps bar */}
      <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: SP.l, marginBottom: SP.s }}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={{ flex: 1, height: 5, backgroundColor: i <= stageIndex - (goingToStore ? 1 : 0) ? C.ink : C.hairline }} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: SP.l, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 1.5, color: C.dim, marginTop: SP.s }}>{header.kicker}</Text>
        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 28, letterSpacing: -1, color: C.ink, marginTop: 4 }}>{header.title}</Text>

        {/* MAP — shown when riding (assigned / picked_up) */}
        {(stage === 'assigned' || stage === 'picked_up') && (
          <View style={{ marginTop: SP.m }}>
            <LiveMap
              origin={stage === 'assigned' ? o.rider : o.store.coord}
              destination={stage === 'assigned' ? o.store.coord : o.customer.coord}
              height={190}
              label="LIVE NAVIGATION"
              toTag={header.to}
            />
            <BrutalButton
              label="Open in Maps"
              icon="navigation"
              variant="outline"
              block
              style={{ marginTop: SP.s }}
              onPress={() => {
                const q = encodeURIComponent(target.addr);
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => showToast('Maps unavailable', undefined, 'map'));
              }}
            />
          </View>
        )}

        {/* DESTINATION CARD */}
        <View style={[{ marginTop: SP.m, padding: SP.l }, BORDER(2)]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink }}>
              <Feather name={goingToStore || stage === 'at_store' ? 'shopping-bag' : 'map-pin'} size={14} color={C.white} />
            </View>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: C.dim }}>
              {goingToStore || stage === 'at_store' ? 'PICKUP LOCATION' : 'DROP LOCATION'}
            </Text>
          </View>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: 20, color: C.ink, marginTop: 8, letterSpacing: -0.3 }}>{target.name}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: C.dim, marginTop: 2, lineHeight: 20 }}>{target.addr}</Text>
          {'landmark' in target && (target as any).landmark ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Feather name="map-pin" size={13} color={C.ink} />
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.ink }}>{(target as any).landmark}</Text>
            </View>
          ) : null}
          <View style={{ height: 1, backgroundColor: C.hairline, marginVertical: SP.m }} />
          <View style={{ flexDirection: 'row', gap: SP.s }}>
            <Pressable onPress={() => call(target.phone)} style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, backgroundColor: C.ink }, BORDER(1)]}>
              <Feather name="phone" size={18} color={C.white} />
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 13, color: C.white, letterSpacing: 0.5 }}>CALL</Text>
            </Pressable>
            <Pressable onPress={() => nav.navigate('Chat', { party: goingToStore || stage === 'at_store' ? 'store' : 'customer' })} style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, backgroundColor: C.white }, BORDER(1)]}>
              <Feather name="message-circle" size={18} color={C.ink} />
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 13, color: C.ink, letterSpacing: 0.5 }}>CHAT</Text>
            </Pressable>
          </View>
        </View>

        {/* STAGE-SPECIFIC BODY */}

        {/* at_store: item checklist */}
        {stage === 'at_store' && (
          <View style={{ marginTop: SP.l }}>
            <AsciiDivider />
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} COLLECT {o.items.length} ITEMS</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.dim, marginTop: 2 }}>Tap each item as you pack it.</Text>
            <View style={{ marginTop: SP.m }}>
              {o.items.map((it, i) => {
                const on = picked[i];
                return (
                  <Pressable key={i} onPress={() => setPicked(p => p.map((v, j) => (j === i ? !v : v)))}>
                    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.m, marginBottom: SP.s, backgroundColor: on ? C.ink : C.white }, BORDER(1)]}>
                      <View style={[{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.white : C.white }, BORDER(1)]}>
                        {on && <Feather name="check" size={16} color={C.ink} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: on ? C.white : C.ink, textDecorationLine: on ? 'line-through' : 'none' }}>{it.name}</Text>
                        {it.note && <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: on ? C.white : C.dim, marginTop: 1 }}>Note: {it.note}</Text>}
                      </View>
                      <View style={[{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: on ? C.white : C.ink }]}>
                        <Text style={{ fontFamily: 'Inter_900Black', fontSize: 14, color: on ? C.ink : C.white }}>×{it.qty}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.dim, textAlign: 'center', marginTop: 4 }}>
              {picked.filter(Boolean).length}/{o.items.length} PACKED
            </Text>
          </View>
        )}

        {/* at_customer: payment + OTP */}
        {stage === 'at_customer' && (
          <View style={{ marginTop: SP.l }}>
            {/* COD cash */}
            {o.payment === 'COD' && (
              <View style={[{ padding: SP.l, marginBottom: SP.m, backgroundColor: cashTaken ? C.ink : C.white }, BORDER(2)]}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.5, color: cashTaken ? C.white : C.dim }}>CASH ON DELIVERY</Text>
                <Text style={{ fontFamily: 'Inter_900Black', fontSize: 36, color: cashTaken ? C.white : C.ink, letterSpacing: -1.5, marginTop: 2 }}>COLLECT ₹{o.codAmount}</Text>
                <Pressable onPress={() => setCashTaken(c => !c)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: SP.m }}>
                  <View style={[{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }, BORDER(1)]}>
                    {cashTaken && <Feather name="check" size={16} color={C.ink} />}
                  </View>
                  <Text style={{ fontFamily: 'Inter_900Black', fontSize: 14, color: cashTaken ? C.white : C.ink }}>I HAVE COLLECTED THE CASH</Text>
                </Pressable>
              </View>
            )}

            {/* OTP */}
            <AsciiDivider />
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} CONFIRM WITH OTP</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.dim, marginTop: 2 }}>Ask the customer for their 4-digit code.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: SP.m }}>
              <TextInput
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                placeholderTextColor={C.faint}
                keyboardType="number-pad"
                maxLength={4}
                style={[{ flex: 1, height: 64, textAlign: 'center', fontFamily: 'Inter_900Black', fontSize: 32, letterSpacing: 12, color: C.ink }, BORDER(2)]}
              />
              <Pressable onPress={() => { setOtp(o.otp); showToast('Customer OTP', `It is ${o.otp}`, 'eye'); }} style={[{ paddingHorizontal: 14, height: 64, alignItems: 'center', justifyContent: 'center' }, BORDER(2)]}>
                <Feather name="eye" size={18} color={C.ink} />
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, color: C.dim, marginTop: 2 }}>SHOW</Text>
              </Pressable>
            </View>
            {otpOk && otp !== o.otp && (
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.ink, marginTop: 8 }}>⚠ CODE DOESN'T MATCH — ASK AGAIN</Text>
            )}

            {/* delivery proof photo */}
            <AsciiDivider style={{ marginTop: SP.l }} />
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: 18, color: C.ink, marginTop: 6 }}>{ASCII.caret} DELIVERY PROOF</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.dim, marginTop: 2 }}>Optional · take a photo of the handed-over order.</Text>
            {proofPhoto ? (
              <View style={[{ marginTop: SP.m, flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.s }, BORDER(1)]}>
                <Image source={{ uri: proofPhoto }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_900Black', fontSize: 14, color: C.ink }}>PHOTO ATTACHED ✓</Text>
                  <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: C.dim, marginTop: 1 }}>Saved as delivery proof</Text>
                </View>
                <Pressable onPress={() => nav.navigate('ProofCamera')} hitSlop={8} style={[{ paddingHorizontal: 10, paddingVertical: 8 }, BORDER(1)]}>
                  <Feather name="refresh-cw" size={16} color={C.ink} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => nav.navigate('ProofCamera')} style={[{ marginTop: SP.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 }, BORDER(1)]}>
                <Feather name="camera" size={20} color={C.ink} />
                <Text style={{ fontFamily: 'Inter_900Black', fontSize: 14, color: C.ink, letterSpacing: 0.5 }}>TAKE DELIVERY PHOTO</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* assigned / picked_up: order summary peek */}
        {(stage === 'assigned' || stage === 'picked_up') && (
          <View style={[{ marginTop: SP.l, padding: SP.m }, BORDER(1)]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1, color: C.dim }}>ORDER · {o.items.length} ITEMS</Text>
              <Text style={{ fontFamily: 'Inter_900Black', fontSize: 12, color: C.ink }}>{o.payment === 'COD' ? `COLLECT ₹${o.codAmount}` : 'PREPAID'}</Text>
            </View>
            {o.items.slice(0, 3).map((it, i) => (
              <Text key={i} style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: C.ink, marginTop: 6 }}>• {it.qty}× {it.name}</Text>
            ))}
            {o.items.length > 3 && <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: C.dim, marginTop: 6 }}>+ {o.items.length - 3} more</Text>}
          </View>
        )}
      </ScrollView>

      {/* STICKY BOTTOM ACTION */}
      <View style={{ paddingHorizontal: SP.l, paddingTop: SP.m, paddingBottom: insets.bottom + SP.m, borderTopWidth: 1, borderColor: C.ink, backgroundColor: C.white }}>
        {stage === 'assigned' && (
          <SwipeToConfirm label="Arrived at store" icon="check" onConfirm={advanceStage} />
        )}
        {stage === 'at_store' && (
          <SwipeToConfirm label="Picked up order" icon="package" disabled={!allPicked} onConfirm={() => { if (allPicked) advanceStage(); }} />
        )}
        {stage === 'picked_up' && (
          <SwipeToConfirm label="Reached customer" icon="check" onConfirm={advanceStage} />
        )}
        {stage === 'at_customer' && (
          <SwipeToConfirm
            label="Mark delivered"
            icon="check-circle"
            disabled={!otpOk || (o.payment === 'COD' && !cashTaken)}
            onConfirm={() => {
              if (!otpOk) return;
              if (o.payment === 'COD' && !cashTaken) return;
              advanceStage(); // -> delivered
            }}
          />
        )}
        {stage === 'at_store' && !allPicked && (
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: C.dim, textAlign: 'center', marginTop: 8 }}>TICK ALL ITEMS TO CONTINUE</Text>
        )}
        {stage === 'at_customer' && (!otpOk || (o.payment === 'COD' && !cashTaken)) && (
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: C.dim, textAlign: 'center', marginTop: 8 }}>
            {o.payment === 'COD' && !cashTaken ? 'COLLECT CASH + ENTER OTP TO FINISH' : 'ENTER THE 4-DIGIT OTP TO FINISH'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({});

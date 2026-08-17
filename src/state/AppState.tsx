// Trendzo Delivery (Agent App) — global state.
//
// Model the spec exactly:
//  • The agent is EMPLOYED. No online/offline, no accept/reject. Orders are
//    ASSIGNED and simply live in `orders`.
//  • The agent can have MULTIPLE active deliveries at once.
//  • Each order is a small forward-only state machine. Every transition is a
//    single function call so it can later be wired to the real backend.
//  • The agent RECORDS facts (kept/returned/refused + photo, cash collected).
//    The store DECIDES refunds — never modelled here.
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Order, OrderState, AGENT,
} from '../data/mockData';
import { setNight as applyNight } from '../theme/brutal';
import { setAuthToken, setOnUnauthorized } from '../api/session';
import { isApiError } from '../api/errors';
import { toOrder, toReverseOrder } from '../api/adapter';
import * as Location from 'expo-location';
import { initFcm, teardownFcm, registerPushWithBackend } from '../fcm';
import { USE_FCM_OFFERS } from '../config/env';
import * as api from '../api';
import type { DriverProfile } from '../api';

const AUTH_KEY = '@trendzo/phone';
const TOKEN_KEY = '@trendzo/token';
const PROFILE_KEY = '@trendzo/profile';
const ONBOARD_KEY = '@trendzo/onboarded';
const NIGHT_KEY = '@trendzo/night';

// An event written on every status change (agent_id attached automatically).
export type OrderEvent = { orderId: string; type: string; ts: number; reason?: string; photo?: string };

type Toast = { title: string; msg?: string; icon?: string } | null;
type Confirm = { title: string; msg?: string; confirmLabel?: string; cancelLabel?: string; onConfirm?: () => void; danger?: boolean; icon?: string } | null;

// Active = anything still in the agent's hands (not a terminal state).
const TERMINAL: OrderState[] = ['delivered', 'returned_to_store'];
export const isActive = (o: Order) => !TERMINAL.includes(o.state);

type AppCtx = {
  phone: string | null;
  token: string | null;
  driver: DriverProfile | null;
  signupMode: boolean;
  signIn: (args: { token: string; phone: string; driver: DriverProfile; isNew?: boolean }) => void;
  signOut: () => void;
  completeProfile: (patch: { name: string; vehicleType?: string; vehicleNumber?: string; city?: string }) => Promise<void>;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;

  agent: typeof AGENT;
  orders: Order[];
  getOrder: (id: string) => Order | undefined;
  refresh: () => void;
  /** Store→driver handoff code to display while `packed` (the store verifies it). */
  handoffCodeFor: (id: string) => string | null;

  // ── broadcast offers: packed forward orders + pending reverse pickups,
  //    offered to all drivers (accept = atomic claim, reject = dismiss) ──
  offers: Order[];
  /** Awaitable: resolves true only when THIS driver won the first-wins claim. */
  acceptOffer: (id: string) => Promise<boolean>;
  rejectOffer: (id: string) => void;

  // ── forward-delivery transitions (Express / Standard). Pickup is store-driven
  //    (the store verifies the handoff code) — there is no driver "picked up" action. ──
  startDelivery: (id: string) => void;       // picked_up -> out_for_delivery
  markDelivered: (id: string, opts?: { cod?: number; otp?: string }) => void;  // -> delivered
  markUndelivered: (id: string, reason: string) => void;          // -> undelivered
  retryDelivery: (id: string) => void;        // undelivered -> out_for_delivery
  returnToStore: (id: string) => void;        // -> returning_to_store
  handedBack: (id: string) => void;           // returning_to_store -> returned_to_store
  abort: (id: string) => void;                // mid-delivery -> returning_to_store

  // ── reverse pickup (OTP + item photo proof; photo comes from proofPhoto) ──
  /** assigned -> collected. Awaitable: resolves false when the server rejected it. */
  collectReverse: (id: string, otp?: string, cashHandedPaise?: number) => Promise<boolean>;

  // ── Try-and-Buy door (customer-driven) ──
  // Handover: verify the customer's OTP → opens the door + starts the server timer.
  // Awaitable, non-optimistic: resolves false if the OTP was rejected.
  openDoorHandover: (id: string, otp: string) => Promise<boolean>;
  // Driver responds to a customer-requested return.
  acceptReturn: (id: string, itemId: string) => Promise<boolean>;
  rejectReturn: (id: string, itemId: string, reason: string, photos: string[]) => Promise<boolean>;
  addExtension: (id: string) => void;
  // Driver finishes the visit (undecided → kept). Rejected by the server if a customer
  // return is still awaiting the driver's response.
  finishDoor: (id: string) => Promise<boolean>;

  // ── COD cash (ledger-backed): outstanding in ₹ + a pending desk deposit ──
  codCollected: number;
  cashPendingDeposit: number;
  depositCash: () => void;

  // ── mandatory-photo capture (camera returns here) ──
  proofPhoto: string | null;
  setProofPhoto: (uri: string | null) => void;

  // counters (read-only)
  deliveredToday: number;

  // theme
  night: boolean;
  toggleNight: () => void;

  // toast + confirm
  toast: Toast;
  showToast: (title: string, msg?: string, icon?: string) => void;
  hideToast: () => void;
  confirm: Confirm;
  showConfirm: (c: NonNullable<Confirm>) => void;
  hideConfirm: () => void;
};

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  // New accounts (no prior signup) route through the profile-completion (signup) screen.
  const [signupMode, setSignupMode] = useState(false);
  const [onboarded, setOnboardedState] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Order[]>([]);
  const [handoffCodes, setHandoffCodes] = useState<Record<string, string | null>>({});
  // Start at 0 — real values come from the backend (cash ledger + earnings
  // summary). Never seed with demo numbers.
  const [codCollected, setCodCollected] = useState(0);
  const [cashPendingDeposit, setCashPendingDeposit] = useState(0);
  const [deliveredToday, setDeliveredToday] = useState(0);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [night, setNightState] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const events = useRef<OrderEvent[]>([]);
  const toastTimer = useRef<any>(null);

  // ── hydrate persisted auth / onboarding / theme ──
  useEffect(() => {
    AsyncStorage.multiGet([AUTH_KEY, TOKEN_KEY, PROFILE_KEY, ONBOARD_KEY, NIGHT_KEY]).then(pairs => {
      const map = Object.fromEntries(pairs);
      if (map[TOKEN_KEY]) { setToken(map[TOKEN_KEY]); setAuthToken(map[TOKEN_KEY]); }
      if (map[AUTH_KEY]) setPhone(map[AUTH_KEY]);
      if (map[PROFILE_KEY]) { try { setDriver(JSON.parse(map[PROFILE_KEY])); } catch { /* ignore */ } }
      if (map[ONBOARD_KEY] === '1') setOnboardedState(true);
      if (map[NIGHT_KEY] === '1') { applyNight(true); setNightState(true); }
    }).catch(() => {});
  }, []);

  const showToast = useCallback((title: string, msg?: string, icon?: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ title, msg, icon });
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);
  const hideToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const logEvent = useCallback((orderId: string, type: string, reason?: string, photo?: string) => {
    events.current.push({ orderId, type, ts: Date.now(), reason, photo });
  }, []);

  // helper: mutate one order's state
  const setOrderState = useCallback((id: string, state: OrderState) => {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, state } : o)));
  }, []);

  const toggleNight = useCallback(() => {
    setNightState(n => {
      const next = !n;
      applyNight(next);
      AsyncStorage.setItem(NIGHT_KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, []);

  const signIn = useCallback(
    (args: { token: string; phone: string; driver: DriverProfile; isNew?: boolean }) => {
      setToken(args.token);
      setAuthToken(args.token);
      setPhone(args.phone);
      setDriver(args.driver);
      setSignupMode(!!args.isNew); // new account → complete-profile screen before the app
      AsyncStorage.multiSet([
        [TOKEN_KEY, args.token],
        [AUTH_KEY, args.phone],
        [PROFILE_KEY, JSON.stringify(args.driver)],
      ]).catch(() => {});
    },
    [],
  );
  const signOut = useCallback(() => {
    setToken(null);
    setAuthToken(null);
    setPhone(null);
    setDriver(null);
    setSignupMode(false);
    AsyncStorage.multiRemove([TOKEN_KEY, AUTH_KEY, PROFILE_KEY]).catch(() => {});
  }, []);

  // Finish signup: save the new driver's name/vehicle/city, then drop into the app.
  const completeProfile = useCallback(
    async (patch: { name: string; vehicleType?: string; vehicleNumber?: string; city?: string }) => {
      const updated = await api.updateProfile(patch);
      setDriver(updated);
      setSignupMode(false);
      AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated)).catch(() => {});
    },
    [],
  );

  // A 401 from any API call (expired/invalidated token) drops us back to the login gate.
  useEffect(() => {
    setOnUnauthorized(() => signOut());
    return () => setOnUnauthorized(null);
  }, [signOut]);
  const setOnboarded = useCallback((v: boolean) => {
    setOnboardedState(v);
    AsyncStorage.setItem(ONBOARD_KEY, v ? '1' : '0').catch(() => {});
  }, []);

  const getOrder = useCallback((id: string) => orders.find(o => o.id === id), [orders]);

  // Ledger truth for the cash tiles: outstanding = collected − confirmed deposits.
  const refreshCash = useCallback(async () => {
    try {
      const b = await api.cashBalance();
      setCodCollected(Math.round(b.outstandingPaise / 100));
      setCashPendingDeposit(Math.round(b.pendingDepositPaise / 100));
    } catch {
      // transient — keep the last snapshot
    }
  }, []);

  // ── Fetch assigned work from the backend (periodic + after mutations):
  //    forward deliveries + reverse-pickup tasks, merged into one queue. ──
  const refresh = useCallback(async () => {
    try {
      const [rows, tasks] = await Promise.all([
        api.listDeliveries(),
        api.listReversePickups().catch(() => [] as api.BackendReversePickup[]),
      ]);
      setOrders([...rows.map(toOrder), ...tasks.map(toReverseOrder)]);
      const codes: Record<string, string | null> = {};
      for (const r of rows) codes[r.id] = r.agentHandoffCode ?? null;
      setHandoffCodes(codes);
    } catch {
      // Transient (offline / expired) — keep the last snapshot; a 401 already signs out.
    }
    void refreshCash();
  }, [refreshCash]);

  // Register this device for targeted push once signed in (safe no-op without Firebase).
  useEffect(() => {
    if (!token) return;
    void registerPushWithBackend();
  }, [token]);

  useEffect(() => {
    if (!token) { setOrders([]); setHandoffCodes({}); return; }
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [token, refresh]);

  // ── Broadcast offers: FCM push preferred (instant, no held connection); LONG-POLL is the
  //    fallback when FCM is unavailable (no Play services / denied / non-FCM build). ──
  useEffect(() => {
    if (!token) { setOffers([]); return; }
    let cancelled = false;
    let stop = () => {};

    // Both offer pools ride the same server-side bus, so one wake refetches both.
    const refreshOffers = async () => {
      try {
        const [rows, tasks] = await Promise.all([
          api.listOffers(),
          api.listReversePickupOffers().catch(() => [] as api.BackendReversePickup[]),
        ]);
        if (!cancelled) setOffers([...rows.map(toOrder), ...tasks.map(toReverseOrder)]);
      } catch {
        // transient; a 401 already signs out
      }
    };

    (async () => {
      const fcmActive = USE_FCM_OFFERS ? await initFcm(refreshOffers) : false;
      if (cancelled) { void teardownFcm(); return; }
      if (fcmActive) {
        // Push drives updates; a slow safety refresh catches any missed push.
        await refreshOffers();
        const t = setInterval(refreshOffers, 45000);
        stop = () => clearInterval(t);
      } else {
        // Long-poll fallback: park on the server until the pool changes, then
        // refetch BOTH feeds (reverse tasks fire the same bus, so the forward
        // long-poll wake covers them too).
        let loopCancelled = false;
        (async function loop() {
          while (!loopCancelled) {
            try {
              const rows = await api.longPollOffers(25000);
              const tasks = await api.listReversePickupOffers().catch(
                () => [] as api.BackendReversePickup[],
              );
              if (!loopCancelled) setOffers([...rows.map(toOrder), ...tasks.map(toReverseOrder)]);
            } catch {
              if (loopCancelled) break;
              await new Promise((r) => setTimeout(r, 3000));
            }
          }
        })();
        stop = () => { loopCancelled = true; };
      }
    })();

    return () => { cancelled = true; stop(); void teardownFcm(); };
  }, [token]);

  // ── Live location: ping the backend while on shift so the admin dispatch map is current. ──
  useEffect(() => {
    if (!token) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 100 },
          (pos) => { void api.pingLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {}); },
        );
      } catch {
        // permission denied / location off → admin map just shows no last-known point
      }
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [token]);

  const handoffCodeFor = useCallback((id: string) => handoffCodes[id] ?? null, [handoffCodes]);

  // Fire a backend mutation, then re-sync from the server (which is authoritative on state).
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      showToast('Action failed', isApiError(e) ? e.message : 'Please try again', 'alert-circle');
    } finally {
      refresh();
    }
  }, [refresh, showToast]);

  // ── broadcast offers: accept (atomic claim) / reject (dismiss). Reverse-pickup
  //    tasks share the feed and are routed by their id prefix (rpk_). ──
  // Awaitable + non-optimistic: the claim is a first-wins race, so callers (e.g. the
  // global new-order modal) must know whether THIS driver actually won before navigating.
  const acceptOffer = useCallback(async (id: string): Promise<boolean> => {
    const isReverse = id.startsWith('rpk_');
    try {
      await (isReverse ? api.acceptReversePickup(id) : api.acceptOffer(id));
    } catch (e) {
      // Lost the race (or transient) — drop it from the feed and tell the driver plainly.
      setOffers(prev => prev.filter(o => o.id !== id));
      showToast('Already taken', isApiError(e) ? e.message : 'Another rider claimed this order', 'x-circle');
      refresh();
      return false;
    }
    setOffers(prev => prev.filter(o => o.id !== id));
    showToast(
      isReverse ? 'Pickup accepted' : 'Order accepted',
      isReverse ? 'Head to the customer to collect' : 'Head to the store to collect',
      'check-circle',
    );
    refresh();
    return true;
  }, [refresh, showToast]);

  const rejectOffer = useCallback((id: string) => {
    setOffers(prev => prev.filter(o => o.id !== id));
    run(() => (id.startsWith('rpk_') ? api.rejectReversePickup(id) : api.rejectOffer(id)));
  }, [run]);

  // ── forward transitions (optimistic UI + backend, then re-sync) ──
  const startDelivery = useCallback((id: string) => {
    setOrderState(id, 'out_for_delivery');
    showToast('Out for delivery', 'Navigate to the customer', 'navigation');
    run(() => api.departDelivery(id));
  }, [setOrderState, showToast, run]);

  const markDelivered = useCallback((id: string, opts?: { cod?: number; otp?: string }) => {
    setOrderState(id, 'delivered');
    setDeliveredToday(n => n + 1);
    if (opts?.cod && opts.cod > 0) setCodCollected(c => c + opts.cod!);
    const photo = proofPhoto;
    setProofPhoto(null);
    showToast('Delivered', 'Order closed successfully', 'check-circle');
    run(() => api.deliverOrder(id, {
      ...(opts?.cod && opts.cod > 0 ? { codCollectedPaise: Math.round(opts.cod * 100) } : {}),
      ...(opts?.otp ? { otp: opts.otp } : {}),
      ...(photo ? { proofPhotos: [photo] } : {}),
    }));
  }, [setOrderState, showToast, run, proofPhoto]);

  const markUndelivered = useCallback((id: string, reason: string) => {
    setOrderState(id, 'undelivered');
    const photo = proofPhoto;
    setProofPhoto(null);
    showToast("Couldn't deliver", 'Logged · customer notified', 'alert-triangle');
    run(() => api.markUndelivered(id, reason, photo ? [photo] : undefined));
  }, [setOrderState, showToast, run, proofPhoto]);

  const retryDelivery = useCallback((id: string) => {
    setOrderState(id, 'out_for_delivery');
    showToast('Retrying delivery', 'One more attempt', 'rotate-ccw');
    run(() => api.departDelivery(id));
  }, [setOrderState, showToast, run]);

  const returnToStore = useCallback((id: string) => {
    setOrderState(id, 'returning_to_store');
    showToast('Returning to store', 'Reach the store within 30 min', 'corner-up-left');
    run(() => api.returnToStore(id));
  }, [setOrderState, showToast, run]);

  const handedBack = useCallback((id: string) => {
    setOrderState(id, 'returned_to_store');
    showToast('Handed back to store', 'All items acknowledged', 'check-circle');
    // Reverse-pickup handoff starts the store's verification window; forward
    // returns finalize the order (auto-accepting door returns on arrival).
    run(() => (id.startsWith('rpk_') ? api.deliverReversePickupToStore(id) : api.markReturned(id)));
  }, [setOrderState, showToast, run]);

  const abort = useCallback((id: string) => {
    setOrderState(id, 'returning_to_store');
    showToast('Delivery aborted', 'Bring the bag back to the store', 'x-octagon');
    run(() => api.returnToStore(id));
  }, [setOrderState, showToast, run]);

  /**
   * Collect a return at the customer's door.
   *
   * AWAITABLE and non-optimistic, unlike the other actions here. Cash may change hands
   * on this call: a COD return is refunded as physical notes handed over at collection,
   * and the server rejects any amount that isn't an exact match. If we flipped state and
   * navigated away first, a rejection would land as a 2.4s truncated toast on a screen
   * the driver had already left, with the optimistic flip silently reverted — the driver
   * would believe the pickup succeeded. So: call first, and only claim success on success.
   *
   * Returns true when the server accepted it.
   */
  const collectReverse = useCallback(async (
    id: string,
    otp?: string,
    cashHandedPaise?: number,
  ): Promise<boolean> => {
    const photo = proofPhoto;
    // The server requires at least one photo; the screen's disabled prop was the only
    // thing preventing a guaranteed 422. Guard here too, where the payload is built.
    if (!photo) {
      showToast('Photo required', 'Take a photo of the items you are collecting', 'camera');
      return false;
    }
    try {
      await api.collectReversePickup(id, {
        photos: [photo],
        ...(otp ? { otp } : {}),
        ...(cashHandedPaise ? { cashHandedPaise } : {}),
      });
    } catch (e) {
      // Stay on the screen so the driver can fix it and retry.
      showToast('Could not collect', isApiError(e) ? e.message : 'Please try again', 'alert-circle');
      refresh();
      return false;
    }
    setProofPhoto(null);
    setOrderState(id, 'returning_to_store');
    logEvent(id, 'reverse_collected');
    showToast(
      cashHandedPaise ? 'Cash handed · item collected' : 'Item collected',
      'Bring it to the store',
      'package',
    );
    refresh();
    return true;
  }, [proofPhoto, setOrderState, logEvent, showToast, refresh]);

  // ── Try-and-Buy door (customer-driven) ──
  // Handover: the driver enters the customer's OTP. Verifying it opens the door and starts
  // the server timer. Non-optimistic — only flip to at_door if the server accepted the OTP.
  const openDoorHandover = useCallback(async (id: string, otp: string): Promise<boolean> => {
    try {
      await api.doorOpen(id, otp);
    } catch (e) {
      showToast('Could not start try-on', isApiError(e) ? e.message : 'Check the OTP and try again', 'alert-circle');
      return false;
    }
    setOrderState(id, 'at_door');
    showToast('Try-on started', 'The customer can now choose keep or return', 'clock');
    // Await the re-sync so the order carries the server's doorWindowExpiresAt BEFORE we
    // return (the caller navigates to the Door screen on true). Without this the Door
    // screen briefly reads a null window as "expired".
    await refresh();
    return true;
  }, [setOrderState, showToast, refresh]);

  const acceptReturn = useCallback(async (id: string, itemId: string): Promise<boolean> => {
    try {
      await api.acceptReturn(id, itemId);
    } catch (e) {
      showToast('Could not accept', isApiError(e) ? e.message : 'Please try again', 'alert-circle');
      refresh();
      return false;
    }
    showToast('Return accepted', 'Into the bag — bring it back to the store', 'corner-up-left');
    refresh();
    return true;
  }, [showToast, refresh]);

  const rejectReturn = useCallback(async (id: string, itemId: string, reason: string, photos: string[]): Promise<boolean> => {
    try {
      await api.rejectReturn(id, itemId, reason, photos);
    } catch (e) {
      showToast('Could not reject', isApiError(e) ? e.message : 'Please try again', 'alert-circle');
      refresh();
      return false;
    }
    showToast('Return rejected', 'The item stays with the customer', 'slash');
    refresh();
    return true;
  }, [showToast, refresh]);

  // Non-optimistic: the +5 is one-shot, so confirm the server granted it before claiming
  // success (otherwise a rejected second tap shows a contradictory "added" + "failed" pair).
  const addExtension = useCallback(async (id: string) => {
    try {
      await api.doorExtend(id);
    } catch (e) {
      showToast("Can't extend", isApiError(e) ? e.message : 'The extension is already used', 'clock');
      refresh();
      return;
    }
    showToast('+5 minutes added', 'One extension used', 'clock');
    refresh();
  }, [showToast, refresh]);

  // Driver finishes the visit (undecided → kept). The server rejects this while a customer
  // return still awaits the driver's accept/reject.
  const finishDoor = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.doorClose(id);  // empty body → driver_finish
    } catch (e) {
      showToast("Can't finish yet", isApiError(e) ? e.message : 'Resolve pending returns first', 'alert-circle');
      refresh();
      return false;
    }
    showToast('Door closed', 'Visit complete', 'check-circle');
    refresh();
    return true;
  }, [showToast, refresh]);

  // Declare the deposit at the ops desk. The outstanding amount stays until an
  // admin confirms receipt of the physical cash — only then the ledger moves.
  const depositCash = useCallback(() => {
    logEvent('—', 'cash_deposit_requested');
    run(() => api.requestCashDeposit().then((r) => {
      setCashPendingDeposit(Math.round(r.amountPaise / 100));
      showToast('Deposit requested', 'Hand the cash to the ops desk for confirmation', 'clock');
    }));
  }, [logEvent, run, showToast]);

  const showConfirm = useCallback((c: NonNullable<Confirm>) => setConfirm(c), []);
  const hideConfirm = useCallback(() => setConfirm(null), []);

  const value = useMemo<AppCtx>(() => ({
    phone, token, driver, signupMode, signIn, signOut, completeProfile,
    onboarded, setOnboarded,
    agent: AGENT, orders, getOrder, refresh, handoffCodeFor,
    offers, acceptOffer, rejectOffer,
    startDelivery, markDelivered, markUndelivered, retryDelivery,
    returnToStore, handedBack, abort, collectReverse,
    openDoorHandover, acceptReturn, rejectReturn, addExtension, finishDoor,
    codCollected, cashPendingDeposit, depositCash,
    proofPhoto, setProofPhoto,
    deliveredToday,
    night, toggleNight,
    toast, showToast, hideToast,
    confirm, showConfirm, hideConfirm,
  }), [phone, token, driver, signupMode, signIn, signOut, completeProfile, onboarded, setOnboarded, orders, getOrder, refresh, handoffCodeFor, offers, acceptOffer, rejectOffer, startDelivery, markDelivered, markUndelivered, retryDelivery, returnToStore, handedBack, abort, collectReverse, openDoorHandover, acceptReturn, rejectReturn, addExtension, finishDoor, codCollected, cashPendingDeposit, depositCash, proofPhoto, deliveredToday, night, toggleNight, toast, showToast, hideToast, confirm, showConfirm, hideConfirm]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be inside AppProvider');
  return c;
}

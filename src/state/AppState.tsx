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
  Order, OrderState, DoorDecision, AGENT, TODAY,
} from '../data/mockData';
import { setNight as applyNight } from '../theme/brutal';
import { setAuthToken, setOnUnauthorized } from '../api/session';
import { isApiError } from '../api/errors';
import { toOrder } from '../api/adapter';
import * as api from '../api';
import type { DriverProfile, DoorItemDecision } from '../api';

const AUTH_KEY = '@trendzo/phone';
const TOKEN_KEY = '@trendzo/token';
const PROFILE_KEY = '@trendzo/profile';
const ONBOARD_KEY = '@trendzo/onboarded';
const NIGHT_KEY = '@trendzo/night';

// An event written on every status change (agent_id attached automatically).
export type OrderEvent = { orderId: string; type: string; ts: number; reason?: string; photo?: string };

// Per-order door bookkeeping for Try-and-Buy.
export type DoorState = {
  endsAt: number;            // epoch ms when the 30-min countdown ends
  extensionUsed: boolean;    // the one +5 min has been used
  decisions: Record<string, DoorDecision>;  // itemId -> decision
  closed: boolean;
};

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

  // ── broadcast offers (packed, unassigned orders offered to all drivers) ──
  offers: Order[];
  acceptOffer: (id: string) => void;
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

  // ── reverse pickup ──
  collectReverse: (id: string) => void;       // out_for_delivery -> returning_to_store

  // ── Try-and-Buy door ──
  door: Record<string, DoorState>;
  arriveAtDoor: (id: string) => void;         // out_for_delivery -> at_door, start timer
  decideItem: (id: string, itemId: string, d: DoorDecision) => void;
  addExtension: (id: string) => void;
  closeDoor: (id: string, otp?: string) => void;  // apply close rules -> delivered | returning_to_store

  // ── COD running total ──
  codCollected: number;
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
  const [door, setDoor] = useState<Record<string, DoorState>>({});
  const [codCollected, setCodCollected] = useState(TODAY.codCollected);
  const [deliveredToday, setDeliveredToday] = useState(TODAY.delivered);
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

  // ── Fetch assigned deliveries from the backend (periodic + after mutations) ──
  const refresh = useCallback(async () => {
    try {
      const rows = await api.listDeliveries();
      setOrders(rows.map(toOrder));
      const codes: Record<string, string | null> = {};
      for (const r of rows) codes[r.id] = r.agentHandoffCode ?? null;
      setHandoffCodes(codes);
    } catch {
      // Transient (offline / expired) — keep the last snapshot; a 401 already signs out.
    }
  }, []);

  useEffect(() => {
    if (!token) { setOrders([]); setHandoffCodes({}); return; }
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [token, refresh]);

  // ── Broadcast offers via LONG-POLL: the request parks on the server until an offer
  //    appears (or ~25s), then we apply it and immediately re-request — near-instant. ──
  useEffect(() => {
    if (!token) { setOffers([]); return; }
    let cancelled = false;
    (async function loop() {
      while (!cancelled) {
        try {
          const rows = await api.longPollOffers(25000);
          if (!cancelled) setOffers(rows.map(toOrder));
        } catch {
          if (cancelled) break;
          await new Promise((r) => setTimeout(r, 3000)); // backoff on network error
        }
      }
    })();
    return () => { cancelled = true; };
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

  // ── broadcast offers: accept (atomic claim) / reject (dismiss) ──
  const acceptOffer = useCallback((id: string) => {
    setOffers(prev => prev.filter(o => o.id !== id));
    run(() => api.acceptOffer(id).then(() => {
      showToast('Order accepted', 'Head to the store to collect', 'check-circle');
    }));
  }, [run, showToast]);

  const rejectOffer = useCallback((id: string) => {
    setOffers(prev => prev.filter(o => o.id !== id));
    run(() => api.rejectOffer(id));
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
    run(() => api.markReturned(id));
  }, [setOrderState, showToast, run]);

  const abort = useCallback((id: string) => {
    setOrderState(id, 'returning_to_store');
    showToast('Delivery aborted', 'Bring the bag back to the store', 'x-octagon');
    run(() => api.returnToStore(id));
  }, [setOrderState, showToast, run]);

  const collectReverse = useCallback((id: string) => {
    // Reverse pickup is not wired to the backend yet (needs the reverse-pickup domain).
    setOrderState(id, 'returning_to_store'); logEvent(id, 'reverse_collected');
    setProofPhoto(null);
    showToast('Item collected', 'Bring it to the store', 'package');
  }, [setOrderState, logEvent, showToast]);

  // ── Try-and-Buy door ──
  const arriveAtDoor = useCallback((id: string) => {
    setOrderState(id, 'at_door');
    setDoor(prev => {
      if (prev[id]) return prev;  // keep an existing timer if re-entering
      const order = orders.find(o => o.id === id);
      const decisions: Record<string, DoorDecision> = {};
      order?.items.forEach(it => { decisions[it.id] = 'pending'; });
      return { ...prev, [id]: { endsAt: Date.now() + 30 * 60 * 1000, extensionUsed: false, decisions, closed: false } };
    });
    run(() => api.doorOpen(id));
  }, [orders, setOrderState, run]);

  const decideItem = useCallback((id: string, itemId: string, d: DoorDecision) => {
    setDoor(prev => {
      const st = prev[id]; if (!st) return prev;
      return { ...prev, [id]: { ...st, decisions: { ...st.decisions, [itemId]: d } } };
    });
  }, []);

  const addExtension = useCallback((id: string) => {
    setDoor(prev => {
      const st = prev[id]; if (!st || st.extensionUsed) return prev;
      return { ...prev, [id]: { ...st, endsAt: st.endsAt + 5 * 60 * 1000, extensionUsed: true } };
    });
    showToast('+5 minutes added', 'One extension used', 'clock');
    run(() => api.doorExtend(id));
  }, [showToast, run]);

  // App door decisions → backend door-close decisions.
  const DOOR_DECISION: Record<DoorDecision, DoorItemDecision['decision']> = {
    pending: 'kept',
    kept: 'kept',
    returned: 'returned',
    store_decides: 'returned',
    refused: 'return_rejected',
  };

  const closeDoor = useCallback((id: string, otp?: string) => {
    const order = orders.find(o => o.id === id);
    const st = door[id];
    if (!order || !st) return;
    // Undecided items default to KEPT.
    const decisions = { ...st.decisions };
    order.items.forEach(it => { if (decisions[it.id] === 'pending') decisions[it.id] = 'kept'; });
    setDoor(prev => ({ ...prev, [id]: { ...prev[id], decisions, closed: true } }));
    const items: DoorItemDecision[] = order.items.map(it => ({
      orderItemId: it.id,
      decision: DOOR_DECISION[decisions[it.id]] ?? 'kept',
    }));
    const ridingBack = order.items.filter(it => ['returned', 'store_decides'].includes(decisions[it.id]));
    const allReturned = ridingBack.length === order.items.length;
    if (allReturned) {
      setOrderState(id, 'returning_to_store');
      showToast('Full return', 'Bring the bag back to the store', 'corner-up-left');
    } else {
      setOrderState(id, 'delivered');
      setDeliveredToday(n => n + 1);
      showToast('Door closed', 'Kept items locked in · delivered', 'check-circle');
    }
    run(() => api.doorClose(id, items, otp));
  }, [orders, door, setOrderState, showToast, run]);

  const depositCash = useCallback(() => {
    setCodCollected(0);
    logEvent('—', 'cash_deposited');
    showToast('Cash deposited', 'Reconciled with ops', 'check-circle');
  }, [logEvent, showToast]);

  const showConfirm = useCallback((c: NonNullable<Confirm>) => setConfirm(c), []);
  const hideConfirm = useCallback(() => setConfirm(null), []);

  const value = useMemo<AppCtx>(() => ({
    phone, token, driver, signupMode, signIn, signOut, completeProfile,
    onboarded, setOnboarded,
    agent: AGENT, orders, getOrder, refresh, handoffCodeFor,
    offers, acceptOffer, rejectOffer,
    startDelivery, markDelivered, markUndelivered, retryDelivery,
    returnToStore, handedBack, abort, collectReverse,
    door, arriveAtDoor, decideItem, addExtension, closeDoor,
    codCollected, depositCash,
    proofPhoto, setProofPhoto,
    deliveredToday,
    night, toggleNight,
    toast, showToast, hideToast,
    confirm, showConfirm, hideConfirm,
  }), [phone, token, driver, signupMode, signIn, signOut, completeProfile, onboarded, setOnboarded, orders, getOrder, refresh, handoffCodeFor, offers, acceptOffer, rejectOffer, startDelivery, markDelivered, markUndelivered, retryDelivery, returnToStore, handedBack, abort, collectReverse, door, arriveAtDoor, decideItem, addExtension, closeDoor, codCollected, depositCash, proofPhoto, deliveredToday, night, toggleNight, toast, showToast, hideToast, confirm, showConfirm, hideConfirm]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be inside AppProvider');
  return c;
}

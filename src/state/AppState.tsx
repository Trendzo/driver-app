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
  Order, OrderState, DoorDecision, ASSIGNED_ORDERS, AGENT, TODAY,
} from '../data/mockData';
import { setNight as applyNight } from '../theme/brutal';

const AUTH_KEY = '@trendzo/phone';
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
  signIn: (phone: string) => void;
  signOut: () => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;

  agent: typeof AGENT;
  orders: Order[];
  getOrder: (id: string) => Order | undefined;

  // ── forward-delivery transitions (Express / Standard) ──
  pickUp: (id: string) => void;              // packed -> picked_up (store handover)
  startDelivery: (id: string) => void;       // picked_up -> out_for_delivery
  markDelivered: (id: string, opts?: { cod?: number }) => void;  // -> delivered
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
  closeDoor: (id: string) => void;            // apply close rules -> delivered | returning_to_store

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
  const [onboarded, setOnboardedState] = useState(false);
  const [orders, setOrders] = useState<Order[]>(() => ASSIGNED_ORDERS.map(o => ({ ...o })));
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
    AsyncStorage.multiGet([AUTH_KEY, ONBOARD_KEY, NIGHT_KEY]).then(pairs => {
      const map = Object.fromEntries(pairs);
      if (map[AUTH_KEY]) setPhone(map[AUTH_KEY]);
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

  const signIn = useCallback((p: string) => { setPhone(p); AsyncStorage.setItem(AUTH_KEY, p).catch(() => {}); }, []);
  const signOut = useCallback(() => { setPhone(null); AsyncStorage.removeItem(AUTH_KEY).catch(() => {}); }, []);
  const setOnboarded = useCallback((v: boolean) => {
    setOnboardedState(v);
    AsyncStorage.setItem(ONBOARD_KEY, v ? '1' : '0').catch(() => {});
  }, []);

  const getOrder = useCallback((id: string) => orders.find(o => o.id === id), [orders]);

  // ── forward transitions ──
  const pickUp = useCallback((id: string) => {
    setOrderState(id, 'picked_up'); logEvent(id, 'picked_up');
    showToast('Picked up', 'Bag collected from store', 'shopping-bag');
  }, [setOrderState, logEvent, showToast]);

  const startDelivery = useCallback((id: string) => {
    setOrderState(id, 'out_for_delivery'); logEvent(id, 'out_for_delivery');
    showToast('Out for delivery', 'Navigate to the customer', 'navigation');
  }, [setOrderState, logEvent, showToast]);

  const markDelivered = useCallback((id: string, opts?: { cod?: number }) => {
    setOrderState(id, 'delivered');
    logEvent(id, 'delivered');
    setDeliveredToday(n => n + 1);
    if (opts?.cod && opts.cod > 0) {
      setCodCollected(c => c + opts.cod!);
      logEvent(id, 'cod_collected', `₹${opts.cod}`);
    }
    setProofPhoto(null);
    showToast('Delivered', 'Order closed successfully', 'check-circle');
  }, [setOrderState, logEvent, showToast]);

  const markUndelivered = useCallback((id: string, reason: string) => {
    setOrderState(id, 'undelivered'); logEvent(id, 'undelivered', reason);
    setProofPhoto(null);
    showToast("Couldn't deliver", 'Customer notified · 1 retry left', 'alert-triangle');
  }, [setOrderState, logEvent, showToast]);

  const retryDelivery = useCallback((id: string) => {
    setOrderState(id, 'out_for_delivery'); logEvent(id, 'retry');
    showToast('Retrying delivery', 'One more attempt', 'rotate-ccw');
  }, [setOrderState, logEvent, showToast]);

  const returnToStore = useCallback((id: string) => {
    setOrderState(id, 'returning_to_store'); logEvent(id, 'returning_to_store');
    showToast('Returning to store', 'Reach the store within 30 min', 'corner-up-left');
  }, [setOrderState, logEvent, showToast]);

  const handedBack = useCallback((id: string) => {
    setOrderState(id, 'returned_to_store'); logEvent(id, 'returned_to_store');
    showToast('Handed back to store', 'All items acknowledged', 'check-circle');
  }, [setOrderState, logEvent, showToast]);

  const abort = useCallback((id: string) => {
    setOrderState(id, 'returning_to_store'); logEvent(id, 'aborted');
    showToast('Delivery aborted', 'Bring the bag back to the store', 'x-octagon');
  }, [setOrderState, logEvent, showToast]);

  const collectReverse = useCallback((id: string) => {
    setOrderState(id, 'returning_to_store'); logEvent(id, 'reverse_collected');
    setProofPhoto(null);
    showToast('Item collected', 'Bring it to the store', 'package');
  }, [setOrderState, logEvent, showToast]);

  // ── Try-and-Buy door ──
  const arriveAtDoor = useCallback((id: string) => {
    setOrderState(id, 'at_door'); logEvent(id, 'at_door');
    setDoor(prev => {
      if (prev[id]) return prev;  // keep an existing timer if re-entering
      const order = orders.find(o => o.id === id);
      const decisions: Record<string, DoorDecision> = {};
      order?.items.forEach(it => { decisions[it.id] = 'pending'; });
      return { ...prev, [id]: { endsAt: Date.now() + 30 * 60 * 1000, extensionUsed: false, decisions, closed: false } };
    });
  }, [orders, setOrderState, logEvent]);

  const decideItem = useCallback((id: string, itemId: string, d: DoorDecision) => {
    setDoor(prev => {
      const st = prev[id]; if (!st) return prev;
      return { ...prev, [id]: { ...st, decisions: { ...st.decisions, [itemId]: d } } };
    });
    logEvent(id, `item_${d}`, itemId);
  }, [logEvent]);

  const addExtension = useCallback((id: string) => {
    setDoor(prev => {
      const st = prev[id]; if (!st || st.extensionUsed) return prev;
      return { ...prev, [id]: { ...st, endsAt: st.endsAt + 5 * 60 * 1000, extensionUsed: true } };
    });
    showToast('+5 minutes added', 'One extension used', 'clock');
  }, [showToast]);

  const closeDoor = useCallback((id: string) => {
    const order = orders.find(o => o.id === id);
    const st = door[id];
    if (!order || !st) return;
    // Undecided items default to KEPT.
    const decisions = { ...st.decisions };
    order.items.forEach(it => { if (decisions[it.id] === 'pending') decisions[it.id] = 'kept'; });
    setDoor(prev => ({ ...prev, [id]: { ...prev[id], decisions, closed: true } }));
    // Returned / store_decides ride back; refused / kept stay with the customer.
    const ridingBack = order.items.filter(it => ['returned', 'store_decides'].includes(decisions[it.id]));
    const allReturned = ridingBack.length === order.items.length;
    if (allReturned) {
      setOrderState(id, 'returning_to_store'); logEvent(id, 'door_full_reject');
      showToast('Full return', 'Bring the bag back to the store', 'corner-up-left');
    } else {
      setOrderState(id, 'delivered'); logEvent(id, 'door_delivered');
      setDeliveredToday(n => n + 1);
      showToast('Door closed', 'Kept items locked in · delivered', 'check-circle');
    }
  }, [orders, door, setOrderState, logEvent, showToast]);

  const depositCash = useCallback(() => {
    setCodCollected(0);
    logEvent('—', 'cash_deposited');
    showToast('Cash deposited', 'Reconciled with ops', 'check-circle');
  }, [logEvent, showToast]);

  const showConfirm = useCallback((c: NonNullable<Confirm>) => setConfirm(c), []);
  const hideConfirm = useCallback(() => setConfirm(null), []);

  const value = useMemo<AppCtx>(() => ({
    phone, signIn, signOut,
    onboarded, setOnboarded,
    agent: AGENT, orders, getOrder,
    pickUp, startDelivery, markDelivered, markUndelivered, retryDelivery,
    returnToStore, handedBack, abort, collectReverse,
    door, arriveAtDoor, decideItem, addExtension, closeDoor,
    codCollected, depositCash,
    proofPhoto, setProofPhoto,
    deliveredToday,
    night, toggleNight,
    toast, showToast, hideToast,
    confirm, showConfirm, hideConfirm,
  }), [phone, signIn, signOut, onboarded, setOnboarded, orders, getOrder, pickUp, startDelivery, markDelivered, markUndelivered, retryDelivery, returnToStore, handedBack, abort, collectReverse, door, arriveAtDoor, decideItem, addExtension, closeDoor, codCollected, depositCash, proofPhoto, deliveredToday, night, toggleNight, toast, showToast, hideToast, confirm, showConfirm, hideConfirm]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be inside AppProvider');
  return c;
}

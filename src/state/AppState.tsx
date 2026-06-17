// Trendzo Partner — global driver state.
// Far simpler than the shopper app: a rider only ever cares about
//   1. am I ONLINE or OFFLINE?
//   2. do I have an active delivery, and what stage is it at?
//   3. how much have I earned today?
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeliveryOrder, ORDER_QUEUE, TODAY } from '../data/mockData';
import { setNight as applyNight } from '../theme/brutal';

const AUTH_KEY = '@trendzo/phone';
const ONBOARD_KEY = '@trendzo/onboarded';
const NIGHT_KEY = '@trendzo/night';

// The delivery lifecycle — a strict forward-only machine. Keeping it linear is
// what makes the rider UI foolproof: there's always exactly ONE next action.
export type DeliveryStage =
  | 'assigned'        // accepted, heading to store
  | 'at_store'        // arrived at store, collecting items
  | 'picked_up'       // items collected, heading to customer
  | 'at_customer'     // arrived at customer, confirming handover
  | 'delivered';      // done

export const STAGE_ORDER: DeliveryStage[] = ['assigned', 'at_store', 'picked_up', 'at_customer', 'delivered'];

type Toast = { title: string; msg?: string; icon?: string } | null;
type Confirm = { title: string; msg?: string; confirmLabel?: string; cancelLabel?: string; onConfirm?: () => void; danger?: boolean; icon?: string } | null;

type AppCtx = {
  // auth
  phone: string | null;
  signIn: (phone: string) => void;
  signOut: () => void;
  // onboarding
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  // duty
  online: boolean;
  setOnline: (v: boolean) => void;
  toggleOnline: () => void;
  // incoming order request (shown as modal when online & idle)
  incoming: DeliveryOrder | null;
  // active delivery
  activeOrder: DeliveryOrder | null;
  stage: DeliveryStage;
  acceptOrder: (o: DeliveryOrder) => void;
  rejectOrder: () => void;
  advanceStage: () => void;     // move to the next stage
  completeDelivery: () => void; // finalize, add earnings, clear
  // delivery-proof photo captured at the customer's door
  proofPhoto: string | null;
  setProofPhoto: (uri: string | null) => void;
  // theme
  night: boolean;
  toggleNight: () => void;
  // withdrawable wallet balance (rupees)
  balance: number;
  withdraw: (amount: number) => void;
  // earnings (today) — grows as deliveries complete
  todayEarnings: number;
  todayTrips: number;
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
  const [online, setOnlineState] = useState(false);
  const [incoming, setIncoming] = useState<DeliveryOrder | null>(null);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const [stage, setStage] = useState<DeliveryStage>('assigned');
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [night, setNightState] = useState(false);
  const [balance, setBalance] = useState(5642);
  const [todayEarnings, setTodayEarnings] = useState(TODAY.earnings);
  const [todayTrips, setTodayTrips] = useState(TODAY.trips);
  const [toast, setToast] = useState<Toast>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const queueIdx = useRef(0);
  const toastTimer = useRef<any>(null);
  const requestTimer = useRef<any>(null);

  // ── hydrate persisted auth / onboarding / theme ──
  useEffect(() => {
    AsyncStorage.multiGet([AUTH_KEY, ONBOARD_KEY, NIGHT_KEY]).then(pairs => {
      const map = Object.fromEntries(pairs);
      if (map[AUTH_KEY]) setPhone(map[AUTH_KEY]);
      if (map[ONBOARD_KEY] === '1') setOnboardedState(true);
      if (map[NIGHT_KEY] === '1') { applyNight(true); setNightState(true); }
    }).catch(() => {});
  }, []);

  const toggleNight = useCallback(() => {
    setNightState(n => {
      const next = !n;
      applyNight(next);
      AsyncStorage.setItem(NIGHT_KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, []);

  const withdraw = useCallback((amount: number) => {
    setBalance(b => Math.max(0, b - amount));
  }, []);

  const signIn = useCallback((p: string) => {
    setPhone(p);
    AsyncStorage.setItem(AUTH_KEY, p).catch(() => {});
  }, []);
  const signOut = useCallback(() => {
    setPhone(null);
    setOnlineState(false);
    setActiveOrder(null);
    setIncoming(null);
    AsyncStorage.removeItem(AUTH_KEY).catch(() => {});
  }, []);

  const setOnboarded = useCallback((v: boolean) => {
    setOnboardedState(v);
    AsyncStorage.setItem(ONBOARD_KEY, v ? '1' : '0').catch(() => {});
  }, []);

  // ── duty: going online schedules a fake incoming order so the demo is
  //    immediately alive. Going offline clears any pending request. ──
  const showToast = useCallback((title: string, msg?: string, icon?: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ title, msg, icon });
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);
  const hideToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const scheduleIncoming = useCallback(() => {
    if (requestTimer.current) clearTimeout(requestTimer.current);
    requestTimer.current = setTimeout(() => {
      // only ping if still online and not already busy
      setOnlineState(on => {
        setActiveOrder(active => {
          setIncoming(inc => {
            if (on && !active && !inc) {
              const next = ORDER_QUEUE[queueIdx.current % ORDER_QUEUE.length];
              return next;
            }
            return inc;
          });
          return active;
        });
        return on;
      });
    }, 2600);
  }, []);

  const setOnline = useCallback((v: boolean) => {
    setOnlineState(v);
    if (v) {
      showToast('You are online', 'Looking for orders near you', 'zap');
      scheduleIncoming();
    } else {
      setIncoming(null);
      if (requestTimer.current) clearTimeout(requestTimer.current);
      showToast('You are offline', 'You will not receive orders', 'moon');
    }
  }, [showToast, scheduleIncoming]);

  const toggleOnline = useCallback(() => setOnline(!online), [online, setOnline]);

  // ── order accept / reject ──
  const acceptOrder = useCallback((o: DeliveryOrder) => {
    setIncoming(null);
    setActiveOrder(o);
    setStage('assigned');
    setProofPhoto(null);
    queueIdx.current += 1;
    showToast('Order accepted', `Head to ${o.store.name}`, 'check');
  }, [showToast]);

  const rejectOrder = useCallback(() => {
    setIncoming(null);
    queueIdx.current += 1;
    showToast('Order passed', 'Finding you another order', 'x');
    scheduleIncoming();
  }, [showToast, scheduleIncoming]);

  const advanceStage = useCallback(() => {
    setStage(s => {
      const i = STAGE_ORDER.indexOf(s);
      return STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, i + 1)];
    });
  }, []);

  const completeDelivery = useCallback(() => {
    setActiveOrder(o => {
      if (o) {
        setTodayEarnings(e => e + o.payout + o.tip);
        setTodayTrips(t => t + 1);
      }
      return null;
    });
    setStage('assigned');
    setProofPhoto(null);
    showToast('Delivery complete', 'Earnings added to today', 'check-circle');
    scheduleIncoming();
  }, [showToast, scheduleIncoming]);

  const showConfirm = useCallback((c: NonNullable<Confirm>) => setConfirm(c), []);
  const hideConfirm = useCallback(() => setConfirm(null), []);

  const value = useMemo<AppCtx>(() => ({
    phone, signIn, signOut,
    onboarded, setOnboarded,
    online, setOnline, toggleOnline,
    incoming, activeOrder, stage,
    acceptOrder, rejectOrder, advanceStage, completeDelivery,
    proofPhoto, setProofPhoto,
    night, toggleNight,
    balance, withdraw,
    todayEarnings, todayTrips,
    toast, showToast, hideToast,
    confirm, showConfirm, hideConfirm,
  }), [phone, signIn, signOut, onboarded, setOnboarded, online, setOnline, toggleOnline, incoming, activeOrder, stage, acceptOrder, rejectOrder, advanceStage, completeDelivery, proofPhoto, night, toggleNight, balance, withdraw, todayEarnings, todayTrips, toast, showToast, hideToast, confirm, showConfirm, hideConfirm]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be inside AppProvider');
  return c;
}

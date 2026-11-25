import { router, useRootNavigationState } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { listenDeviceNotifications, registerDeviceNotifications, type PushStatus, type ReceivedPush } from '@/services/notification-device';
import { notificationTarget } from '@/utils/notification-routing';

type Value = { status: PushStatus; lastReceived: ReceivedPush | null; busy: boolean; request: () => void; refresh: () => void };
const Context = createContext<Value | null>(null);
const initial: PushStatus = { phase: 'not-requested', message: 'Memeriksa dukungan dan izin notifikasi perangkat.' };

export function NotificationProvider({ children }: PropsWithChildren) {
  const { profile: rawProfile, firebaseUser, loading } = useAuth();
  const profile = rawProfile?.uid === firebaseUser?.uid ? rawProfile : null;
  const navigation = useRootNavigationState();
  const profileRef = useRef(profile);
  const readyRef = useRef(false);
  const pending = useRef<ReceivedPush | null>(null);
  const handled = useRef(new Set<string>());
  const inFlight = useRef<{ uid: string; promise: Promise<void> } | null>(null);
  const alive = useRef(true);
  const [state, setState] = useState<{ uid?: string; status: PushStatus; received: ReceivedPush | null }>({ status: initial, received: null });
  const [busyUid, setBusyUid] = useState<string | null>(null);
  useEffect(() => { profileRef.current = profile; readyRef.current = !loading && !!navigation?.key; }, [profile, loading, navigation?.key]);

  const refresh = useCallback(function refreshDevice(ask = false): Promise<void> {
    const uid = profileRef.current?.uid;
    if (!uid) return Promise.resolve();
    if (inFlight.current?.uid === uid) {
      return ask ? inFlight.current.promise.then(() => refreshDevice(true)) : inFlight.current.promise;
    }
    const operation = (async () => {
      const status = await registerDeviceNotifications(uid, ask);
      if (alive.current && profileRef.current?.uid === uid) {
        setState(previous => ({ uid, status, received: previous.uid === uid ? previous.received : null }));
      }
    })();
    inFlight.current = { uid, promise: operation };
    void operation.finally(() => { if (inFlight.current?.promise === operation) inFlight.current = null; });
    return operation;
  }, []);

  const openPending = useCallback(() => {
    const push = pending.current;
    const account = profileRef.current;
    if (!push || !account || !readyRef.current) return;
    pending.current = null;
    const target = notificationTarget(push.data, account.uid);
    if (!target || handled.current.has(push.id)) return;
    handled.current.add(push.id);
    if (handled.current.size > 100) handled.current.delete(handled.current.values().next().value!);
    router.push(account.role === 'praktikan' ? target : '/home');
  }, []);

  useEffect(() => {
    alive.current = true;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void listenDeviceNotifications(push => {
      if (cancelled) return;
      const uid = profileRef.current?.uid;
      if (!uid || !notificationTarget(push.data, uid)) return;
      setState(previous => ({ uid, status: previous.uid === uid ? previous.status : initial, received: push }));
    }, push => { if (!cancelled) { pending.current = push; openPending(); } }, () => { if (!cancelled) void refresh(); })
      .then(cleanup => { if (cancelled) cleanup(); else stop = cleanup; })
      .catch(() => {
        const uid = profileRef.current?.uid;
        if (!cancelled && uid) setState({ uid, received: null, status: { phase: 'error', message: 'Penerima notifikasi belum tersedia. Pasang development build terbaru lalu periksa kembali.' } });
      });
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') void refresh(); });
    return () => { alive.current = false; cancelled = true; stop?.(); subscription.remove(); };
  }, [openPending, refresh]);

  useEffect(() => { if (profile?.uid) void refresh(); }, [profile?.uid, refresh]);
  useEffect(() => { openPending(); }, [profile?.uid, loading, navigation?.key, openPending]);

  const request = useCallback(() => {
    const uid = profileRef.current?.uid;
    if (!uid) return;
    setBusyUid(uid);
    void refresh(true).finally(() => { if (alive.current) setBusyUid(current => current === uid ? null : current); });
  }, [refresh]);
  const value = useMemo<Value>(() => ({
    status: state.uid === profile?.uid ? state.status : initial,
    lastReceived: state.uid === profile?.uid ? state.received : null,
    busy: !!profile && busyUid === profile.uid,
    request, refresh: () => { void refresh(); },
  }), [state, profile, busyUid, request, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error('useNotifications harus digunakan dalam NotificationProvider.');
  return value;
}

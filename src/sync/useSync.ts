import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoreApi } from '@/hooks/useStore';
import { supabase, TABLE } from './client';
import { applyDoc, docKey, mergeDocs, toDoc, type SyncDoc } from './merge';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncUser {
  id: string;
  email: string;
}

/** Синхронизация задач через Supabase: вход по коду из письма, слияние версий, живые обновления */
export function useSync(api: StoreApi) {
  const [user, setUser] = useState<SyncUser | null>(null);
  const [status, setStatus] = useState<SyncStatus>(supabase ? 'idle' : 'off');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const syncedKey = useRef(''); // версия, которая точно совпадает с облаком
  const busy = useRef(false);
  const again = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    const toUser = (u?: { id: string; email?: string } | null) => (u ? { id: u.id, email: u.email ?? '' } : null);
    supabase.auth.getSession().then(({ data }) => setUser(toUser(data.session?.user)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser((prev) => {
        const next = toUser(session?.user);
        return prev?.id === next?.id ? prev : next;
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const sync = useCallback(async () => {
    if (!supabase || !user) return;
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    setStatus('syncing');
    try {
      const { data, error } = await supabase.from(TABLE).select('data').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      const remote = (data?.data ?? null) as SyncDoc | null;
      const local = toDoc(api.snapshot());
      const merged = remote ? mergeDocs(local, remote) : local;
      const mk = docKey(merged);
      if (mk !== docKey(local)) {
        // пока шёл запрос, могли появиться новые правки — сливаем ещё раз с текущим состоянием
        api.replace((cur) => applyDoc(cur, mergeDocs(toDoc(cur), merged)));
      }
      syncedKey.current = mk;
      if (!remote || mk !== docKey(remote)) {
        const { error: upErr } = await supabase
          .from(TABLE)
          .upsert({ user_id: user.id, data: merged, updated_at: new Date().toISOString() });
        if (upErr) throw upErr;
      }
      setStatus('synced');
      setLastSync(Date.now());
    } catch (e) {
      console.warn('sync failed', e);
      syncedKey.current = '';
      setStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        void sync();
      }
    }
  }, [user, api]);

  // сразу после входа
  useEffect(() => {
    if (user) void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // после локальных правок, с небольшой задержкой
  const localKey = useMemo(() => (user ? docKey(toDoc(api.store)) : ''), [api.store, user]);
  useEffect(() => {
    if (!user || localKey === syncedKey.current) return;
    const t = window.setTimeout(() => void sync(), 1200);
    return () => window.clearTimeout(t);
  }, [localKey, user, sync]);

  // изменения с другого устройства приходят сразу
  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;
    const channel = client
      .channel(`planner-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${user.id}` }, (payload) => {
        const doc = (payload.new as { data?: SyncDoc } | null)?.data;
        if (!doc) return;
        const k = docKey(doc);
        if (k === syncedKey.current) return;
        syncedKey.current = k;
        api.replace((cur) => applyDoc(cur, mergeDocs(toDoc(cur), doc)));
        setLastSync(Date.now());
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [user, api]);

  // вернулись во вкладку или появился интернет — подтягиваем свежее
  useEffect(() => {
    if (!user) return;
    const onWake = () => document.visibilityState === 'visible' && void sync();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    const id = window.setInterval(onWake, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
      window.clearInterval(id);
    };
  }, [user, sync]);

  const sendCode = useCallback(async (email: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw error;
  }, []);

  const signInPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  /** Регистрация. Возвращает true, если нужно подтвердить почту по ссылке из письма */
  const signUpPassword = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!supabase) return false;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw error;
    return !data.session;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    syncedKey.current = '';
    setStatus('idle');
    setLastSync(null);
  }, []);

  return { enabled: !!supabase, user, status, lastSync, sync, sendCode, signInPassword, signUpPassword, signOut };
}

export type SyncApi = ReturnType<typeof useSync>;

/** Понятный текст ошибки входа */
export function authErrorText(e: unknown): string {
  const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
  if (msg.includes('rate') || msg.includes('seconds')) return 'Слишком много писем подряд. Подожди минуту и попробуй снова.';
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) return 'Неверная почта или пароль.';
  if (msg.includes('not confirmed')) return 'Почта ещё не подтверждена. Открой письмо от Supabase и нажми ссылку.';
  if (msg.includes('already registered') || msg.includes('already exists')) return 'Такой аккаунт уже есть. Войди с паролем или по ссылке.';
  if (msg.includes('password')) return 'Пароль должен быть не короче 6 символов.';
  if (msg.includes('expired') || msg.includes('invalid')) return 'Ссылка устарела. Запроси новую.';
  if (msg.includes('email')) return 'Проверь адрес почты.';
  if (msg.includes('fetch') || msg.includes('network')) return 'Нет связи с сервером. Проверь интернет.';
  return 'Не получилось. Попробуй ещё раз.';
}

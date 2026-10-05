import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/*
 * Адрес проекта и публичный ключ Supabase. Публичный (anon / publishable) ключ можно
 * хранить в коде: доступ к данным ограничен правилами RLS, каждый видит только свои задачи.
 * Значения можно переопределить переменными VITE_SUPABASE_URL и VITE_SUPABASE_KEY.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bhawjevrrqvdflezpyev.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_CcJH6PNMPYeFteqeWeGPRQ_NNM7GAQB';

export const TABLE = 'planner_state';

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'planner:auth' },
      })
    : null;

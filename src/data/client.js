import { createClient } from '@supabase/supabase-js';
import { config, isConfigured } from '../config.js';

// عميل واحد لكل التطبيق. الجلسة تُحفظ وتُجدَّد تلقائياً من المكتبة.
export const supabase = isConfigured
  ? createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

export function db() {
  if (!supabase) throw new Error('config_missing');
  return supabase;
}

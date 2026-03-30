import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Supabase client — will be null if env vars are not configured.
 * The app works in offline/local mode when Supabase is not configured.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: { eventsPerSecond: 10 },
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);

/**
 * Test the Supabase connection
 * @returns {{ ok: boolean, error?: string }}
 */
export async function testConnection() {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado. Revisa las variables de entorno.' };
  try {
    const { error } = await supabase.from('crm_companies').select('id').limit(1);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

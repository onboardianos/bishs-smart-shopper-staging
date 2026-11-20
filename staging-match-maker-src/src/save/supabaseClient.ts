// Shared Browser client for Save Progress. Session lives in sessionStorage under bishs.os.sb.auth (7A).
import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import { SaveAuthError } from './authErrors';

export const AUTH_STORAGE_KEY = 'bishs.os.sb.auth';

function sessionStorageAdapter(): SupportedStorage {
  return {
    getItem: (key) => (typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key)),
    setItem: (key, value) => { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, value); },
    removeItem: (key) => { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key); },
  };
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new SaveAuthError('missing_setup', 'This page is missing its sign-in setup.');
  }
  client = createClient(url, key, {
    auth: {
      storage: sessionStorageAdapter(),
      storageKey: AUTH_STORAGE_KEY,
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
    },
  });
  return client;
}

/** Test hook — do not call from UI. */
export function resetSupabaseClient() {
  client = null;
}

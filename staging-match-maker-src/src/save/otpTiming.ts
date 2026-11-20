export const RESEND_SECONDS = 60;
export const MAX_WRONG_TRIES = 5;
export const RESEND_AT_KEY = 'ss-otp-resend-at';
export const TRIES_KEY = 'ss-otp-wrong-tries';

export type Kv = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };

function store(storage?: Kv): Kv {
  if (storage) return storage;
  if (typeof sessionStorage !== 'undefined') return sessionStorage;
  throw new Error('sessionStorage is not available');
}

export function resendWaitSeconds(now = Date.now(), storage?: Kv): number {
  const at = Number(store(storage).getItem(RESEND_AT_KEY) || 0);
  if (!at) return 0;
  return Math.max(0, Math.ceil((at + RESEND_SECONDS * 1000 - now) / 1000));
}

export function markCodeSent(now = Date.now(), storage?: Kv): void {
  const s = store(storage);
  s.setItem(RESEND_AT_KEY, String(now));
  s.removeItem(TRIES_KEY);
}

export function wrongTries(storage?: Kv): number {
  return Number(store(storage).getItem(TRIES_KEY) || 0);
}

export function recordWrongTry(storage?: Kv): number {
  const s = store(storage);
  const n = wrongTries(s) + 1;
  s.setItem(TRIES_KEY, String(n));
  return n;
}

export function resetTries(storage?: Kv): void {
  store(storage).removeItem(TRIES_KEY);
}

export function triesLocked(storage?: Kv): boolean {
  return wrongTries(storage) >= MAX_WRONG_TRIES;
}

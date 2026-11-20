// Matches stay locked until the shopper verifies a 6-digit code or the save-link confirm button.
export const UNLOCK_KEY = 'ss-matches-unlocked-v1';
export const PENDING_MATCHES_KEY = 'ss-pending-matches-url';
export const SS_COMPLETED_KEY = 'ss-smart-shopper-completed-v1';

export function matchesUnlocked(): boolean {
  try {
    if (sessionStorage.getItem(UNLOCK_KEY) === '1') return true;
    // Local-only preview harness for screenshots and layout review. Never used in production mail.
    const q = new URLSearchParams(location.search);
    return q.get('preview') === '1';
  } catch {
    return false;
  }
}

export function markMatchesUnlocked(): void {
  try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch { /* private mode */ }
}

export function clearMatchesUnlock(): void {
  try { sessionStorage.removeItem(UNLOCK_KEY); } catch { /* private mode */ }
}

export function setPendingMatchesUrl(url: string): void {
  try { sessionStorage.setItem(PENDING_MATCHES_KEY, url); } catch { /* private mode */ }
}

export function pendingMatchesUrl(fallback = '?state=results'): string {
  try { return sessionStorage.getItem(PENDING_MATCHES_KEY) || fallback; } catch { return fallback; }
}

export function welcomeHeading(firstName?: string | null): string {
  const name = (firstName || '').trim();
  return name ? `Welcome, ${name}.` : 'Welcome.';
}

export function accountInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  if (first && last) return (first[0] + last[0]).toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  const local = (email || '').trim().split('@')[0] || '';
  return local ? local.slice(0, 1).toUpperCase() : '';
}

export function formatMatchCount(total: number): string {
  return total.toLocaleString('en-US');
}

export function matchCountLabel(total: number): string {
  return `${formatMatchCount(total)} ${total === 1 ? 'matching unit' : 'matching units'}`;
}

export function markSmartShopperCompleted(): void {
  try { sessionStorage.setItem(SS_COMPLETED_KEY, '1'); } catch { /* private mode */ }
}

export function clearSmartShopperCompleted(): void {
  try { sessionStorage.removeItem(SS_COMPLETED_KEY); } catch { /* private mode */ }
}

/** True when the shopper finished Smart Shopper (submitted for matches, or budget/summary is in the case). */
export function completedSmartShopper(answers?: { done?: string[] } | null): boolean {
  try {
    if (sessionStorage.getItem(SS_COMPLETED_KEY) === '1') return true;
  } catch { /* private mode */ }
  const done = answers?.done || [];
  return done.includes('budget') || done.includes('summary');
}

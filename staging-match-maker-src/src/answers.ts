// One shopper case for every screen (questions → summary → loading → results). Stored in sessionStorage so a refresh keeps it.
// Field names follow the live bishsos.com/smart-shopper state (S) so buildSession() in session.ts is a straight port.
export type Trade = { year: string; mfr: string; make: string; model: string; changes: string[]; text: string };
export type Answers = {
  stores: string[] | null;
  classes: string[];
  // Steps 2–4 (Bishified path / hitch / bumper-pull type); kept so the summary and case rail can show them
  path: string[]; hitch: string[]; sub: string[]; motor: string[];
  // Camping today, trade-in (Q5 / Q6), camping style, activities: recorded for the outfitter, no effect on matching (live rule)
  camping: string | null; trade: Trade | null; campStyle: string[]; activities: string[]; activitiesOther: string;
  // Sleeping
  adults: number; children: number; pets: number; childSetup: string | null;
  bedroom: string | null;
  // Towing (90% safety margin by default)
  tow: string | null; towRating: number | null; towMode: 'derived' | 'raw'; towLabel: string;
  towYr: string; towMk: string; towMd: string; towEn: string; towIdx: number | null;
  // Length, garage (Q13)
  lengthMode: string | null; lengthFt: number; garageFt: number | null; garageAny: boolean;
  bath: string[]; bathMust: string[]; inside: string[]; insideMust: string[]; outside: string[]; outsideMust: string[];
  size: string | null; build: string | null; buildMust: boolean;
  // Budget (matches on the snapshot price = sale price, DSRP fallback; never MSRP)
  budgetMode: 'cash' | 'finance' | null; maxSpend: number; payment: number; down: number; tier: string | null; store: string;
  // legacy (results filters read it): sleepers needed
  sleepsMin: number;
  done: string[]; // step ids the shopper has answered
};
const KEY = 'ss-case-v2';
export const DEFAULTS: Answers = {
  stores: null, classes: ['TT', 'FW', 'TTTH', 'FWTH', 'TC', 'FD', 'AT', 'HTT'],
  path: [], hitch: [], sub: [], motor: [],
  camping: null, trade: null, campStyle: [], activities: [], activitiesOther: '',
  adults: 2, children: 0, pets: 0, childSetup: null, bedroom: null,
  tow: null, towRating: null, towMode: 'derived', towLabel: '', towYr: '', towMk: '', towMd: '', towEn: '', towIdx: null,
  lengthMode: null, lengthFt: 30, garageFt: null, garageAny: false,
  bath: [], bathMust: [], inside: [], insideMust: [], outside: [], outsideMust: [],
  size: null, build: null, buildMust: false,
  budgetMode: null, maxSpend: 0, payment: 750, down: 5500, tier: null, store: '',
  sleepsMin: 2, done: [],
};
export function loadAnswers(): Answers {
  try { return { ...DEFAULTS, ...JSON.parse(sessionStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}
export function saveAnswers(patch: Partial<Answers>) {
  const cur = loadAnswers();
  const next = { ...cur, ...patch };
  next.sleepsMin = Math.max(1, (next.adults || 0) + (next.children || 0));
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
export function markDone(id: string, patch: Partial<Answers> = {}) {
  const cur = loadAnswers();
  return saveAnswers({ ...patch, done: cur.done.includes(id) ? cur.done : [...cur.done, id] });
}
export function resetAnswers() { sessionStorage.removeItem(KEY); }
export function onPurchase() {
  if (new URLSearchParams(location.search).get('role') === 'outfitter') return;
  document.getElementById('mm-perm')?.remove();
  const el = document.createElement('div');
  el.id = 'mm-perm';
  el.className = 'mm-state';
  el.setAttribute('data-state', 'permission');
  el.setAttribute('data-spec-id', 'card-state-permission');
  el.setAttribute('role', 'alert');
  el.innerHTML = '<span id="mm-perm-in"><strong class="mm-state-title" id="mm-perm-title">An outfitter sends this</strong><span class="mm-state-body" id="mm-perm-body">Purchase options uses match.send. Browsing uses discovery.navigate and discovery.advance. A customer can look. An outfitter sends.</span></span>';
  document.body.appendChild(el);
}
/** Replace the URL query and drop any hash, so a leftover #unit-… cannot disagree with ?unit=. */
export function navigate(query: string) {
  const q = query.startsWith('?') ? query : `?${query}`;
  location.href = `${location.pathname}${q}`;
}
export function go(screen: string, extra = '') {
  const a = loadAnswers();
  const stores = a.stores ? `&stores=${a.stores.join(',')}` : '';
  navigate(`?screen=${screen}${stores}${extra}`);
}

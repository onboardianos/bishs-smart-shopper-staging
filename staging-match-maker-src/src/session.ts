// Engine glue for the Bishified questions. Straight port of the live bishsos.com/smart-shopper buildSession(),
// option catalogue (O), skip rules and live counts, against the same window.Engine + window.BISH_SNAPSHOT.
import type { Answers } from './answers';

type U = { stocknumber: string; class: string; location: string; price: number | null; gvwr: number | null; lengthIn: number | null; sleeps: number | null; slides: number | null; sidewallConstruction?: string; garageLength?: number | null; manufacturer: string; make: string; model: string; year: number };
type Sess = { gates: Record<string, any>; prefs: any[]; avoids: any[]; numericPriorities: Record<string, boolean>; sidewallPref: string | null; lifestylePaths: string[]; sleepers: any; tow: any; budget: any };
type Eng = {
  IDS: Record<string, number>; BUNK_IDS: number[]; SLIDE_IDS: number[]; TOY_BED_IDS: number[]; SCORING_VERSION: string;
  newSession: (s: unknown) => Sess; candidates: (u: U[], g: unknown) => { verified: U[]; probable: U[] };
  previewGate: (u: U[], g: unknown, p: unknown) => { counts: { total: number; probable: number } }; previewBoost: (u: U[], ids: number[]) => number;
  rankResults: (u: U[], s: unknown) => { all: any[] }; cashCeiling: (n: number) => { valid: boolean; ceiling: number };
  solveFinanceCeiling: (o: unknown) => { valid: boolean; ceiling: number; message?: string; apr?: number; termMonths?: number }; money: (n: number) => string;
};
export const E = () => (window as any).Engine as Eng;
export const SNAP = () => (window as any).BISH_SNAPSHOT as { units: U[]; meta: any; lookups: { rooftops: Record<string, { storeName?: string; salesTaxRate?: number; location: string }>; classes: Record<string, { description?: string }> } };
export const n = (v: number) => Number(v).toLocaleString('en-US');
export const TOY = ['TTTH', 'FWTH'];
export const MOTOR = ['AG', 'AD', 'B', 'C', 'CD'];
export const TOWABLE = ['TT', 'FW', 'TTTH', 'FWTH', 'HTT', 'FD', 'AT', 'TC', 'DT'];
export const isToy = (a: Answers) => a.classes.some((c) => TOY.includes(c));
export const isMotorOnly = (a: Answers) => a.classes.length > 0 && a.classes.every((c) => MOTOR.includes(c));
export const isB = (a: Answers) => a.classes.length === 1 && a.classes[0] === 'B';
export const anyTowable = (a: Answers) => a.classes.some((c) => TOWABLE.includes(c));
export const APR: Record<string, string> = { veryGood: '6.99%', good: '9%', fair: '12%', poor: '15%' };

export type Opt = { id: string; title: string; img?: string; icon?: string; kind: 'gate' | 'rank' | 'avoid' | 'prio' | 'sidewall' | 'open' | 'info'; patch?: any; concept?: string; ids?: number[]; strength?: string; avoid?: any; must?: any; priority?: string | string[]; sidewall?: string; group?: string };
const im = (f: string) => `img/${f}`;
// Live image map (bishsos.com/tools/wayfinder img/) → same files ship in this bundle's img/
const IMG = {
  bunks: im('sleeping-bunk-beds-e20430d7.jpg'), booth: im('sitting-booth-dinette-d47a12fa.jpg'), convertible: im('sleeping-convertible-a6fdc22e.jpg'),
  queen: im('sleeping-queen-bed-fa3b06df.jpg'), sleepOther: im('sleeping-other-d48d1117.jpg'), jack: im('sitting-jack-knife-sofa-156dfe65.jpg'), trifold: im('sitting-tri-fold-sofa-9b8080fe.jpg'),
  rearBath: im('bathroom-rear-bathroom-e1f329c6.jpg'), halfBath: im('bathroom-half-bathroom-564e38d3.jpg'), splitBath: im('bathroom-split-bathroom-bbfbd3b4.jpg'), wetBath: im('bathroom-wet-bath-6682a2d1.jpg'),
  island: im('kitchen-kitchen-island-7b5495bb.jpg'), rearKitchen: im('kitchen-rear-kitchen-1b0de3f9.jpg'),
  bedroom: im('bedroom-img-4eacad58.webp'), dualentry: im('dualentry-img-22628055.webp'), cookout: im('cookout-img-28bda55b.webp'),
  slides: im('slides-img-014047e7.webp'), noslides: im('noslides-img-08987c00.webp'), laminate: im('laminate-fb2dd1a5.jpg'), stt: im('stt-c7d11842.jpg'),
  towv: im('towv-img-b88c6930.webp'), delivery: im('delivery-img-885cb87a.webp'),
  first: im('first-18aee14e.png'), current: im('current-c7e46da7.webp'), experienced: im('experienced-7a0c02f9.png'),
};
export const CAMPING_IMG = { first: IMG.first, current: IMG.current, experienced: IMG.experienced };
export const TOW_IMG = { yes: IMG.towv, delivery: IMG.delivery };

export function catalogue() {
  const e = E(); const I = e.IDS;
  return {
    bunksMust: { id: 'must', title: 'Bunks required', img: IMG.bunks, kind: 'gate', patch: { requiredAnyOf: [e.BUNK_IDS] } },
    bunksPref: { id: 'prefer', title: 'Prefer bunks, flexible is okay', img: IMG.booth, kind: 'rank', concept: 'child_sleep', ids: e.BUNK_IDS, strength: 'flexible' },
    flex: { id: 'flex', title: 'Flexible sleeping is fine', img: IMG.convertible, kind: 'rank', concept: 'child_sleep', ids: [I.LOFT, I.TWIN_CONV, I.MURPHY, I.DUAL_QUEEN], strength: 'nice', priority: 'sleepFlex' },
    loft: { id: 'loft', title: 'Cab-over bunk or loft', img: IMG.bunks, kind: 'rank', concept: 'child_sleep', ids: [I.LOFT, I.SINGLE_BUNKS], strength: 'prefer' },
    convert: { id: 'convert', title: 'Convertible beds are fine', img: IMG.convertible, kind: 'rank', concept: 'child_sleep', ids: [I.TWIN_CONV, I.DUAL_QUEEN], strength: 'nice', priority: 'sleepFlex' },
    pmMust: { id: 'must', title: 'Must have a private bedroom', img: IMG.bedroom, kind: 'gate', patch: { requiredChars: [I.PRIVATE_MASTER] } },
    pmPref: { id: 'prefer', title: 'Prefer a private bedroom', img: IMG.queen, kind: 'rank', concept: 'adult_privacy', ids: [I.PRIVATE_MASTER], strength: 'flexible', avoid: { concept: 'murphy', ids: [I.MURPHY], strength: 'avoid' } },
    openSpace: { id: 'space', title: 'Prefer open living space', img: IMG.jack, kind: 'rank', concept: 'adult_privacy', ids: [I.MURPHY, I.REAR_LIVING, I.FRONT_LIVING], strength: 'prefer' },
    anyBed: { id: 'open', title: 'No preference', img: IMG.sleepOther, kind: 'open' },
    bigger: { id: 'bigger', title: 'Bigger, more private bath', img: IMG.rearBath, kind: 'rank', concept: 'bath', ids: [I.REAR_BATH, I.DUAL_VANITY, I.FRONT_BATH], strength: 'prefer' },
    two: { id: 'two', title: 'Two bathrooms', img: IMG.halfBath, kind: 'rank', concept: 'bath_second', ids: [I.DOUBLE_BATH], strength: 'prefer', must: { requiredChars: [I.DOUBLE_BATH] } },
    dual: { id: 'dual', title: 'Easy in and out for kids or pets', img: IMG.dualentry, kind: 'rank', concept: 'traffic', ids: [I.DUAL_ENTRY], strength: 'prefer' },
    walk: { id: 'walk', title: 'Not a pass-through bath', img: IMG.splitBath, kind: 'avoid', concept: 'bath_walkthru', ids: [I.WALK_THRU], strength: 'avoid' },
    compact: { id: 'compact', title: 'A compact bath is fine', img: IMG.wetBath, kind: 'rank', concept: 'bath_compact', ids: [I.WETBATH], strength: 'nice' },
    cook: { id: 'cook', group: 'Kitchen', title: 'I cook inside often', img: IMG.island, kind: 'rank', concept: 'kitchen', ids: [I.ISLAND_KITCHEN, I.U_KITCHEN, I.L_KITCHEN, I.FRONT_KITCHEN], strength: 'prefer' },
    living: { id: 'living', group: 'Living room', title: 'An open living room', img: IMG.trifold, kind: 'rank', concept: 'living', ids: [I.REAR_LIVING, I.FRONT_LIVING, I.FRONT_CAP_WINDOW], strength: 'prefer' },
    bedslide: { id: 'bedslide', group: 'Bedroom', title: 'Walk-around bedroom', img: IMG.queen, kind: 'rank', concept: 'slide_bed', ids: [I.BED_SLIDE], strength: 'prefer' },
    murphy: { id: 'murphy', group: 'Bedroom', title: 'Fold-away bed for daytime space', img: IMG.jack, kind: 'rank', concept: 'murphy', ids: [I.MURPHY], strength: 'prefer' },
    wd: { id: 'wd', group: 'Laundry', title: 'Washer / dryer prep', icon: 'warehouse', kind: 'rank', concept: 'amenity_wd', ids: [I.WASH], strength: 'strongly', must: { requiredChars: [I.WASH] } },
    gsleep: { id: 'gsleep', group: 'Bedroom', title: 'The garage sleeps people too', img: IMG.bunks, kind: 'rank', concept: 'garage_sleep', ids: e.TOY_BED_IDS, strength: 'prefer' },
    cookout: { id: 'cookout', title: 'I cook outside often', img: IMG.cookout, kind: 'rank', concept: 'outdoor', ids: [I.OUTSIDE_KITCHEN], strength: 'prefer' },
    rearkit: { id: 'rearkit', title: 'Kitchen near the outdoor action', img: IMG.rearKitchen, kind: 'rank', concept: 'kitchen_outdoor', ids: [I.REAR_KITCHEN], strength: 'prefer' },
    patio: { id: 'patio', title: 'Outdoor hangout or patio', icon: 'sun', kind: 'rank', concept: 'outdoor_patio', ids: [I.REAR_PATIO, I.SIDE_PATIO], strength: 'prefer' },
    rearpatio: { id: 'rearpatio', title: 'Rear patio', icon: 'sun', kind: 'rank', concept: 'rear_patio', ids: [I.REAR_PATIO], strength: 'prefer' },
    space: { id: 'space', title: 'More room — slide-outs welcome', img: IMG.slides, kind: 'rank', concept: 'space', ids: e.SLIDE_IDS, strength: 'prefer', priority: 'space' },
    balanced: { id: 'balanced', title: 'Open to either', icon: 'repeat', kind: 'open' },
    simple: { id: 'simple', title: 'Lighter and simpler — fewer slides', img: IMG.noslides, kind: 'prio', priority: ['simple', 'lightweight', 'compact'] },
    laminate: { id: 'laminate', title: 'Laminate / fiberglass', img: IMG.laminate, kind: 'sidewall', sidewall: 'laminate' },
    value: { id: 'value', title: 'Stick and tin / aluminum', img: IMG.stt, kind: 'sidewall', sidewall: 'value', priority: 'value' },
    either: { id: 'either', title: 'No preference', icon: 'repeat', kind: 'open' },
  } as Record<string, Opt>;
}
export const OPEN = (t?: string): Opt => ({ id: 'open', title: t || 'Open / no preference', icon: 'circle-help', kind: 'open' });

export function multiOptsAll(key: string, a: Answers): Opt[] {
  const O = catalogue();
  if (key === 'bath') return [O.bigger, O.two, O.dual, O.walk, O.compact];
  if (key === 'inside') return [O.cook, O.living, O.bedslide, ...(isMotorOnly(a) ? [O.murphy] : []), ...(isToy(a) ? [O.gsleep] : []), O.wd];
  return isToy(a) ? [O.cookout, O.rearkit, O.rearpatio] : [O.cookout, O.rearkit, O.patio];
}
export const childOpts = (a: Answers) => { const O = catalogue(); return isMotorOnly(a) ? [O.loft, O.convert] : [O.bunksMust, O.bunksPref, O.flex]; };
export const bedroomOpts = (a: Answers) => { const O = catalogue(); return isMotorOnly(a) ? [O.pmMust, O.pmPref, O.anyBed] : [O.pmMust, O.pmPref, O.openSpace, O.anyBed]; };

function applyPatch(s: Sess, patch: any) {
  Object.keys(patch).forEach((k) => {
    if (k === 'requiredChars') patch[k].forEach((id: number) => { if (!s.gates.requiredChars.includes(id)) s.gates.requiredChars.push(id); });
    else if (k === 'requiredAnyOf') s.gates.requiredAnyOf.push(...patch[k]);
    else s.gates[k] = patch[k];
  });
}
export function financeOf(a: Answers) {
  if (a.budgetMode !== 'finance' || !a.tier || !(a.payment > 0)) return null;
  const roof = a.store ? SNAP().lookups.rooftops[a.store] : null;
  const tax = roof && roof.salesTaxRate != null ? roof.salesTaxRate : null;
  return E().solveFinanceCeiling({ monthlyPayment: a.payment, downPayment: a.down || 0, creditTier: a.tier, ...(tax != null ? { taxRate: tax } : {}) });
}
export function ceilingOf(a: Answers): number | null {
  if (a.budgetMode === 'cash' && a.maxSpend > 0) { const r = E().cashCeiling(a.maxSpend); return r.valid ? r.ceiling : null; }
  const f = financeOf(a); return f && f.valid ? f.ceiling : null;
}
export function gvwrOf(a: Answers) {
  if (!anyTowable(a) || a.tow !== 'yes' || !(Number(a.towRating) > 0) || !a.towMode) return null;
  return Math.round(a.towMode === 'raw' ? Number(a.towRating) : Number(a.towRating) * 0.9);
}
export function buildSession(a: Answers): Sess {
  const e = E(); const s = e.newSession(SNAP());
  s.gates.classes = a.classes;
  const ceil = ceilingOf(a);
  if (ceil) { s.gates.priceMax = ceil; s.budget.priceCeiling = ceil; s.budget.mode = a.budgetMode; }
  const g = gvwrOf(a);
  if (g) { s.tow = { applies: true, rating: Number(a.towRating), mode: a.towMode }; s.gates.gvwrMax = g; }
  s.sleepers = { adults: a.picked.includes('adults') ? a.adults : 0, children: a.picked.includes('children') ? a.children : 0 };
  const total = s.sleepers.adults + s.sleepers.children; if (total > 0) s.gates.sleepsMin = total;
  if (a.picked.includes('children') && a.children > 0) s.lifestylePaths.push('family');
  else if (a.picked.includes('adults') && a.adults <= 2 && a.adults > 0) s.lifestylePaths.push('couple');
  const push = (o: Opt | undefined, qid: string) => {
    if (!o) return;
    if (o.kind === 'gate') applyPatch(s, o.patch);
    else if (o.kind === 'rank') { s.prefs.push({ key: `${qid}:${o.id}`, source: qid, concept: o.concept, label: o.title, ids: o.ids, strength: o.strength }); if (o.avoid) s.avoids.push({ key: `${qid}:${o.id}:avoid`, source: qid, concept: o.avoid.concept, label: 'Murphy bed', ids: o.avoid.ids, strength: o.avoid.strength }); }
    else if (o.kind === 'avoid') s.avoids.push({ key: `${qid}:${o.id}`, source: qid, concept: o.concept, label: o.title, ids: o.ids, strength: o.strength });
    else if (o.kind === 'sidewall') s.sidewallPref = o.sidewall || null;
    if (o.priority) (Array.isArray(o.priority) ? o.priority : [o.priority]).forEach((p) => { s.numericPriorities[p] = true; });
  };
  if (a.children > 0) push(childOpts(a).find((o) => o.id === a.childSetup), 'sleep');
  push(bedroomOpts(a).find((o) => o.id === a.bedroom), 'bedroom');
  if (a.lengthMode === 'hard' && a.lengthFt > 0 && a.lengthFt < 41) s.gates.lengthMaxFt = Math.floor(a.lengthFt);
  if (a.lengthMode === 'soft') s.numericPriorities.compact = true;
  for (const key of ['bath', 'inside', 'outside'] as const) {
    const opts = multiOptsAll(key, a); const must = a[`${key}Must` as 'bathMust'];
    a[key].forEach((id) => { const o = opts.find((x) => x.id === id); if (!o) return; if (must.includes(id) && o.must) applyPatch(s, o.must); else push(o, key); });
  }
  const O = catalogue();
  push([O.space, O.balanced, O.simple].find((o) => o.id === a.size), 'size');
  if (a.build && a.build !== 'either') { if (a.buildMust) s.gates.sidewall = a.build === 'laminate' ? 'LAMINATE' : 'STT'; else push(O[a.build], 'build'); }
  return s;
}
export function unitsFor(a: Answers): U[] {
  let list = SNAP().units;
  if (a.stores && a.stores.length) list = list.filter((u) => a.stores!.includes(u.location));
  // Garage length (Q13 / Step 4 overlay): live applies it as a pre-filter on toy haulers only; unknown garage lengths stay in
  const ft = !a.garageAny && a.garageFt ? a.garageFt : 0;
  if (ft > 0 && isToy(a)) list = list.filter((u) => !TOY.includes(u.class) || u.garageLength == null || u.garageLength >= ft * 12);
  return list;
}
export function poolOf(a: Answers) {
  const s = buildSession(a); const c = E().candidates(unitsFor(a), s.gates);
  return { session: s, verified: c.verified, probable: c.probable, pool: c.verified.concat(c.probable) };
}
export const shareOf = (pool: U[], ids: number[]) => (pool.length ? E().previewBoost(pool, ids) / pool.length : 0);
export const splits = (pool: U[], o: Opt) => { if (!o.ids) return true; const sh = shareOf(pool, o.ids); return sh >= 0.05 && sh <= 0.95; };
export function multiOpts(key: string, a: Answers, pool: U[]) {
  return multiOptsAll(key, a).filter((o) => splits(pool, o)).concat([OPEN(key === 'bath' ? 'Open to any bathroom' : undefined)]);
}
// Same wording as the live per-option count line
export function liveText(o: Opt, a: Answers, P: ReturnType<typeof poolOf>) {
  const e = E(); const pool = P.pool;
  if (o.kind === 'gate') { const c = e.previewGate(unitsFor(a), P.session.gates, o.patch).counts; return `${n(c.total)} campers fit${c.probable ? ` · ${n(c.probable)} need a check` : ''}`; }
  if (o.kind === 'rank') return `${n(e.previewBoost(pool, o.ids!))} rank higher`;
  if (o.kind === 'avoid') return `${n(e.previewBoost(pool, o.ids!))} have this · shown lower`;
  if (o.kind === 'sidewall') { const k = o.sidewall === 'laminate' ? 'LAMINATE' : 'STT'; return `${n(pool.filter((u) => u.sidewallConstruction === k).length)} built this way`; }
  if (o.kind === 'prio') return 'Sorts by size and weight';
  if (o.kind === 'info') return 'For your outfitter';
  return `Keeps all ${n(pool.length)}`;
}

// Results-pool filters. Same rules as the live Match Maker desk (desk.js deskSession + togglePass + compute):
// the engine ranks on sale price / DSRP (never MSRP), tow stays at 90% unless the slider moves the gate,
// and the four toggles replace the matching answer gates. Filters do not write back to the shopper's answers.
import type { Answers } from './answers';
import { applyGarageBoost, buildSession, gvwrOf, isMotorOnly, SNAP } from './session';
import { toUnit, type LiveMatch } from './liveRank';
import { BUCKETS } from './steps/inventory';

type SnapUnit = {
  stocknumber: string; year: number; manufacturer: string; make: string; model: string;
  class: string; location: string; price: number | null; lengthIn: number | null;
  sleeps: number | null; slides: number | null; gvwr?: number | null;
  sidewallConstruction?: string; characteristicTypeIds?: number[]; garageLength?: number | null; isLStock?: boolean;
};
type Eng = {
  IDS: { PRIVATE_MASTER: number }; BUNK_IDS: number[];
  cashCeiling: (n: number) => { valid: boolean; ceiling: number };
  solveFinanceCeiling: (o: unknown) => { valid: boolean; ceiling: number };
  rankResults: (u: SnapUnit[], s: unknown) => { all: { unit: SnapUnit; score: { display: number; reasons: string[]; hits: string[] } }[] };
};
const E = () => (window as unknown as { Engine: Eng }).Engine;

export type Toggle = { bunks: 'Yes' | 'No' | null; slides: 'Yes' | 'No' | null; bedroom: 'Private' | 'Open' | null; build: 'Fiber' | 'Alum' | null };
export type Ranges = { lenMin: number; lenMax: number; towMin: number; towMax: number; sleepMin: number; sleepMax: number; garMin: number; garMax: number };
/** Live desk.js `conds`: On the lot (physical units) and Floorplan examples (L-stock). At least one stays on. */
export type Conds = { lot: boolean; ex: boolean };
export type Desk = {
  method: 'Cash' | 'Finance';
  payment: number; down: number; cash: number; tier: string;
  unitType: string; lenMax: number; towMax: number; sleepMin: number; garageMin: number;
  toggle: Toggle; conds: Conds;
  /** '' = all locations, a store code, or MINE = the stores the shopper picked before the questions (more than one) */
  location: string; search: string; R: Ranges;
};
export const MINE = '@mine';
export const TOY_CLASSES = ['TTTH', 'FWTH'];
export const isHauler = (d: Desk) => TOY_CLASSES.includes(d.unitType);

// Live Match Maker unit-type labels and order (index.html TOWABLE_TILES / MOTOR_TILES), used by the desk's Unit type select.
const TOWABLE_TILES: [string, string][] = [['TT', 'Travel Trailer'], ['FW', 'Fifth Wheel'], ['TTTH', 'TT Toy Hauler'], ['FWTH', 'FW Toy Hauler'], ['TC', 'Truck Camper'], ['DT', 'Destination Trailer'], ['HTT', 'Hybrid Trailer'], ['FD', 'Pop-up / Fold-down'], ['AT', 'Adventure Trailer']];
const MOTOR_TILES: [string, string][] = [['AG', 'Class A gas'], ['AD', 'Class A diesel'], ['B', 'Class B van'], ['C', 'Class C'], ['CD', 'Class C diesel']];

const ft = (u: SnapUnit) => (u.lengthIn ? Math.round(u.lengthIn / 12) : null);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export type StoreOpt = { code: string; name: string; units: number };

/** Live desk.js store list: every named store that has units in the snapshot. Counts are the full snapshot, not a sample. */
export function locationsOf(): StoreOpt[] {
  const snap = SNAP() as { units: SnapUnit[]; lookups: { rooftops?: Record<string, { storeName?: string }> } };
  const counts: Record<string, number> = {};
  for (const u of snap.units) counts[u.location] = (counts[u.location] || 0) + 1;
  const roofs = snap.lookups.rooftops || {};
  const out: StoreOpt[] = [];
  for (const code of Object.keys(roofs)) {
    const name = roofs[code]?.storeName;
    const units = counts[code] || 0;
    if (!name || !units) continue;
    out.push({ code, name, units });
  }
  out.sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
  return out;
}

/** The location the desk starts on: the ?loc= the shopper last picked here, else the store(s) chosen before the questions. */
export function seedLocation(a: Answers, fromUrl: string | null): string {
  if (fromUrl != null) return fromUrl === MINE && !(a.stores && a.stores.length > 1) ? '' : fromUrl;
  if (a.stores && a.stores.length === 1) return a.stores[0];
  if (a.stores && a.stores.length > 1) return MINE;
  return '';
}

export function snapshotUnitCount() { return (SNAP().units as SnapUnit[]).length; }

function inScopeClasses() {
  return [...new Set((SNAP().units as SnapUnit[]).map((u) => u.class))];
}

/** Live pathClasses(): the classes on the shopper's path (Towable, Motorhome, Destination) that are in the snapshot. No path yet = every class. */
export function pathClasses(a: Answers) {
  const present = new Set(inScopeClasses());
  if (!a.path.length) return [...present];
  const want = new Set(a.path.flatMap((p) => BUCKETS[p] || []));
  return [...present].filter((c) => want.has(c));
}
/** Live hides the Tow limit slider on the motorhome path (motorhomes are driven). */
export const motorPath = (a: Answers) => a.path.length > 0 && a.path.every((p) => p === 'motorhome');

/** Live unitTypeOptions(): All types, then the live tile labels for the classes on the shopper's path. */
export function unitTypeOptions(a: Answers): [string, string][] {
  const on = new Set(pathClasses(a));
  return [['ALL', 'All types'] as [string, string]].concat([...TOWABLE_TILES, ...MOTOR_TILES].filter(([c]) => on.has(c)));
}

export function rangesOf(a: Answers): Ranges {
  const cl = new Set(pathClasses(a));
  const us = (SNAP().units as SnapUnit[]).filter((u) => cl.has(u.class));
  const L = us.map(ft).filter((v): v is number => v != null);
  const W = us.map((u) => u.gvwr || 0).filter((v) => v > 0);
  const SL = us.map((u) => u.sleeps || 0).filter((v) => v > 0);
  const G = us.map((u) => u.garageLength || 0).filter((v) => v > 0);
  const lo = (xs: number[]) => (xs.length ? Math.min(...xs) : 0);
  const hi = (xs: number[]) => (xs.length ? Math.max(...xs) : 0);
  return {
    lenMin: Math.max(10, Math.floor(lo(L) || 10)),
    lenMax: Math.ceil(hi(L) || 40),
    towMin: Math.floor(lo(W) / 250) * 250 || 6000,
    towMax: Math.ceil(hi(W) / 250) * 250 || 13000,
    sleepMin: Math.min(2, lo(SL) || 2),
    sleepMax: Math.min(12, Math.max(hi(SL), (a.adults || 0) + (a.children || 0), 4)),
    garMin: Math.floor(lo(G) / 12) || 6,
    garMax: Math.ceil(hi(G) / 12) || 16,
  };
}

export function seedDesk(a: Answers, locFromUrl: string | null = null): Desk {
  const R = rangesOf(a);
  const session = buildSession(a);
  const g = session.gates as { lengthMaxFt?: number | null; gvwrMax?: number | null; sleepsMin?: number | null };
  const motor = isMotorOnly(a);
  const d: Desk = {
    method: a.budgetMode === 'finance' ? 'Finance' : 'Cash',
    payment: a.payment || 0,
    down: a.down || 0,
    cash: a.maxSpend || 0,
    tier: a.tier || 'good',
    // Live seed: the shopper's own type when they picked exactly one; otherwise All types
    unitType: a.classes.length === 1 && a.classes[0] !== 'ZZ' && pathClasses(a).includes(a.classes[0]) ? a.classes[0] : 'ALL',
    lenMax: g.lengthMaxFt ? clamp(g.lengthMaxFt, R.lenMin, R.lenMax) : R.lenMax,
    towMax: g.gvwrMax ? clamp(Math.floor(g.gvwrMax / 250) * 250, R.towMin, R.towMax) : R.towMax,
    sleepMin: g.sleepsMin ? clamp(g.sleepsMin, R.sleepMin, R.sleepMax) : R.sleepMin,
    // Garage length filter starts open: the shopper's garage picks are a +5 ranking boost (applyGarageBoost), never a hidden gate.
    garageMin: R.garMin,
    toggle: {
      bunks: !motor && a.children > 0 && a.childSetup === 'must' ? 'Yes' : null,
      slides: a.size === 'space' ? 'Yes' : a.size === 'simple' ? 'No' : null,
      bedroom: a.bedroom === 'must' ? 'Private' : a.bedroom === 'space' ? 'Open' : null,
      build: a.build === 'laminate' ? 'Fiber' : a.build === 'value' ? 'Alum' : null,
    },
    conds: { lot: true, ex: true },
    location: seedLocation(a, locFromUrl),
    search: '',
    R,
  };
  const soft: [keyof Toggle, boolean][] = [['slides', true], ['build', !a.buildMust], ['bedroom', a.bedroom !== 'must']];
  for (const [key, isSoft] of soft) {
    if (!d.toggle[key] || !isSoft) continue;
    if (rankDesk(a, d, 1).total) break;
    d.toggle[key] = null;
  }
  return d;
}

function deskSession(a: Answers, d: Desk) {
  const e = E();
  const s = buildSession(a);
  const g = s.gates as {
    classes: string[]; priceMax: number | null; gvwrMax: number | null; lengthMaxFt: number | null;
    sleepsMin: number | null; sidewall: string | null; requiredAnyOf: number[][]; requiredChars: number[]; garageMinFt: number | null;
  };
  g.classes = a.classes.length === 1 && a.classes[0] === 'ZZ' ? ['ZZ'] : d.unitType === 'ALL' ? pathClasses(a) : [d.unitType];
  g.priceMax = null; g.gvwrMax = null; g.lengthMaxFt = null; g.sleepsMin = null; g.sidewall = null; g.garageMinFt = null;
  g.requiredAnyOf = (g.requiredAnyOf || []).filter((list) => !(list.length === e.BUNK_IDS.length && list.every((id) => e.BUNK_IDS.indexOf(id) !== -1)));
  if (a.bedroom === 'must') g.requiredChars = (g.requiredChars || []).filter((id) => id !== e.IDS.PRIVATE_MASTER);
  if (d.method === 'Cash') {
    if (d.cash > 0) { const r = e.cashCeiling(d.cash); if (r.valid) g.priceMax = r.ceiling; }
  } else if (d.payment > 0) {
    const roof = a.store ? SNAP().lookups.rooftops[a.store] : null;
    const tax = roof && roof.salesTaxRate != null ? roof.salesTaxRate : null;
    const r = e.solveFinanceCeiling({ monthlyPayment: d.payment, downPayment: d.down || 0, creditTier: d.tier || 'good', ...(tax != null ? { taxRate: tax } : {}) });
    if (r.valid) g.priceMax = r.ceiling;
  }
  if (!isMotorOnly(a) && !motorPath(a) && d.towMax < d.R.towMax) g.gvwrMax = d.towMax;
  if (isHauler(d) && d.garageMin > d.R.garMin) g.garageMinFt = d.garageMin;
  if (d.lenMax < d.R.lenMax) g.lengthMaxFt = d.lenMax;
  if (d.sleepMin > d.R.sleepMin) g.sleepsMin = d.sleepMin;
  if (d.toggle.bunks === 'Yes') g.requiredAnyOf.push(e.BUNK_IDS.slice());
  if (d.toggle.bedroom === 'Private' && g.requiredChars.indexOf(e.IDS.PRIVATE_MASTER) === -1) g.requiredChars.push(e.IDS.PRIVATE_MASTER);
  if (d.toggle.build) g.sidewall = d.toggle.build === 'Fiber' ? 'LAMINATE' : 'STT';
  return s;
}

function togglePass(u: SnapUnit, d: Desk) {
  const e = E();
  const chars = u.characteristicTypeIds || [];
  const has = (ids: number[]) => chars.some((id) => ids.indexOf(id) !== -1);
  const t = d.toggle;
  if (t.bunks === 'No' && !(chars.length && !has(e.BUNK_IDS))) return false;
  if (t.slides === 'Yes' && !(Number(u.slides) > 0)) return false;
  if (t.slides === 'No' && u.slides !== 0) return false;
  if (t.bedroom === 'Open' && !(chars.length && chars.indexOf(e.IDS.PRIVATE_MASTER) === -1)) return false;
  return true;
}

function moneyText(n: number | null) { return n == null || n <= 0 ? 'Price pending' : `$${Math.round(n).toLocaleString('en-US')}`; }

export function rankDesk(a: Answers, d: Desk, limit = 80): { matches: LiveMatch[]; total: number; ceiling: number | null } {
  let units = SNAP().units as SnapUnit[];
  if (!(a.classes.length === 1 && a.classes[0] === 'ZZ')) {
    if (d.unitType !== 'ALL') units = units.filter((u) => u.class === d.unitType);
  }
  if (d.location === MINE) { const mine = a.stores || []; if (mine.length) units = units.filter((u) => mine.includes(u.location)); }
  else if (d.location) units = units.filter((u) => u.location === d.location);
  units = units.filter((u) => (u.isLStock ? d.conds.ex : d.conds.lot));
  // Garage: only the desk's own Garage length slider (toy-hauler unit types, user-controlled, starts open) filters. The Garage question answer
  // never removes units; it adds +5 to matching garages below (applyGarageBoost).
  const session = deskSession(a, d);
  const ceiling = (session.gates.priceMax as number | null) || null;
  const ranked = E().rankResults(units, session);
  let list = applyGarageBoost(ranked.all as unknown as Parameters<typeof applyGarageBoost>[0], a) as unknown as typeof ranked.all;
  list = list.filter((row) => togglePass(row.unit, d));
  const q = d.search.trim().toLowerCase();
  if (q) list = list.filter((row) => `${row.unit.year} ${row.unit.manufacturer} ${row.unit.make} ${row.unit.model} ${row.unit.stocknumber}`.toLowerCase().includes(q));
  const matches = list.slice(0, limit).map((row) => {
    const unit = toUnit(row.unit as never);
    const price = unit.price;
    const diff = ceiling && price && price > 0 ? ceiling - price : null;
    return {
      unit, score: row.score.display,
      reasons: (row.score.reasons && row.score.reasons.length ? row.score.reasons : ['Fits these filters']).slice(0, 4),
      tags: [unit.className.toUpperCase()],
      priceText: moneyText(price),
      delta: diff == null ? '' : `${diff >= 0 ? '−' : '+'}${moneyText(Math.abs(diff))}`,
      fits: diff == null ? null : diff >= 0,
    };
  });
  return { matches, total: list.length, ceiling };
}

export const gvwrGate = gvwrOf;

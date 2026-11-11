// Results-pool filters. Same rules as the live Match Maker desk (desk.js deskSession + togglePass + compute):
// the engine ranks on sale price / DSRP (never MSRP), tow stays at 90% unless the slider moves the gate,
// and the four toggles replace the matching answer gates. Filters do not write back to the shopper's answers.
import type { Answers } from './answers';
import { buildSession, gvwrOf, isMotorOnly, SNAP } from './session';
import { toUnit, type LiveMatch } from './liveRank';

type SnapUnit = {
  stocknumber: string; year: number; manufacturer: string; make: string; model: string;
  class: string; location: string; price: number | null; lengthIn: number | null;
  sleeps: number | null; slides: number | null; gvwr?: number | null;
  sidewallConstruction?: string; characteristicTypeIds?: number[]; garageLength?: number | null;
};
type Eng = {
  IDS: { PRIVATE_MASTER: number }; BUNK_IDS: number[];
  cashCeiling: (n: number) => { valid: boolean; ceiling: number };
  solveFinanceCeiling: (o: unknown) => { valid: boolean; ceiling: number };
  rankResults: (u: SnapUnit[], s: unknown) => { all: { unit: SnapUnit; score: { display: number; reasons: string[]; hits: string[] } }[] };
};
const E = () => (window as unknown as { Engine: Eng }).Engine;

export type Toggle = { bunks: 'Yes' | 'No' | null; slides: 'Yes' | 'No' | null; bedroom: 'Private' | 'Open' | null; build: 'Fiber' | 'Alum' | null };
export type Ranges = { lenMin: number; lenMax: number; towMin: number; towMax: number; sleepMin: number; sleepMax: number };
export type Desk = {
  method: 'Cash' | 'Finance';
  payment: number; down: number; cash: number; tier: string;
  unitType: string; lenMax: number; towMax: number; sleepMin: number;
  toggle: Toggle; location: string; search: string; R: Ranges;
};

const ft = (u: SnapUnit) => (u.lengthIn ? Math.round(u.lengthIn / 12) : null);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export type StoreOpt = { code: string; name: string; units: number };

/** Every named store, plus any location that actually has units (POC has stock and no rooftop row). Counts are the full snapshot, not a sample. */
export function locationsOf(): StoreOpt[] {
  const snap = SNAP() as { units: SnapUnit[]; lookups: { rooftops?: Record<string, { storeName?: string }> } };
  const counts: Record<string, number> = {};
  for (const u of snap.units) counts[u.location] = (counts[u.location] || 0) + 1;
  const roofs = snap.lookups.rooftops || {};
  const codes = new Set<string>([...Object.keys(roofs), ...Object.keys(counts)]);
  const out: StoreOpt[] = [];
  for (const code of codes) {
    const name = roofs[code]?.storeName;
    const units = counts[code] || 0;
    if (!name && !units) continue;
    out.push({ code, name: name || code, units });
  }
  out.sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
  return out;
}

export function snapshotUnitCount() { return (SNAP().units as SnapUnit[]).length; }

function inScopeClasses() {
  return [...new Set((SNAP().units as SnapUnit[]).map((u) => u.class))];
}

export function rangesOf(a: Answers): Ranges {
  const us = SNAP().units as SnapUnit[];
  const L = us.map(ft).filter((v): v is number => v != null);
  const W = us.map((u) => u.gvwr || 0).filter((v) => v > 0);
  const SL = us.map((u) => u.sleeps || 0).filter((v) => v > 0);
  const lo = (xs: number[]) => (xs.length ? Math.min(...xs) : 0);
  const hi = (xs: number[]) => (xs.length ? Math.max(...xs) : 0);
  return {
    lenMin: Math.max(10, Math.floor(lo(L) || 10)),
    lenMax: Math.ceil(hi(L) || 45),
    towMin: Math.floor(lo(W) / 250) * 250 || 1000,
    towMax: Math.ceil(hi(W) / 250) * 250 || 20000,
    sleepMin: Math.min(2, lo(SL) || 2),
    sleepMax: Math.min(12, Math.max(hi(SL), (a.adults || 0) + (a.children || 0), 4)),
  };
}

export function seedDesk(a: Answers): Desk {
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
    unitType: 'ALL',
    lenMax: g.lengthMaxFt ? clamp(g.lengthMaxFt, R.lenMin, R.lenMax) : R.lenMax,
    towMax: g.gvwrMax ? clamp(Math.floor(g.gvwrMax / 250) * 250, R.towMin, R.towMax) : R.towMax,
    sleepMin: g.sleepsMin ? clamp(g.sleepsMin, R.sleepMin, R.sleepMax) : R.sleepMin,
    toggle: {
      bunks: !motor && a.children > 0 && a.childSetup === 'must' ? 'Yes' : null,
      slides: a.size === 'space' ? 'Yes' : a.size === 'simple' ? 'No' : null,
      bedroom: a.bedroom === 'must' ? 'Private' : a.bedroom === 'space' ? 'Open' : null,
      build: a.build === 'laminate' ? 'Fiber' : a.build === 'value' ? 'Alum' : null,
    },
    location: '',
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
    sleepsMin: number | null; sidewall: string | null; requiredAnyOf: number[][]; requiredChars: number[];
  };
  g.classes = a.classes.length === 1 && a.classes[0] === 'ZZ' ? ['ZZ'] : d.unitType === 'ALL' ? inScopeClasses() : [d.unitType];
  g.priceMax = null; g.gvwrMax = null; g.lengthMaxFt = null; g.sleepsMin = null; g.sidewall = null;
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
  if (!isMotorOnly(a) && d.towMax < d.R.towMax) g.gvwrMax = d.towMax;
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
  if (d.location) units = units.filter((u) => u.location === d.location);
  const gar = !a.garageAny && a.garageFt ? a.garageFt : 0;
  if (gar > 0) units = units.filter((u) => (u.class !== 'TTTH' && u.class !== 'FWTH') || u.garageLength == null || u.garageLength >= gar * 12);
  const session = deskSession(a, d);
  const ceiling = (session.gates.priceMax as number | null) || null;
  const ranked = E().rankResults(units, session);
  let list = ranked.all.filter((row) => togglePass(row.unit, d));
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

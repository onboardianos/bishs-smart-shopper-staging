import { loadAnswers, type Answers } from './answers';
import { buildSession, ceilingOf as ceil, unitsFor } from './session';

type SnapUnit = {
  stocknumber: string; year: number; manufacturer: string; make: string; model: string;
  class: string; location: string; price: number | null; lengthIn: number | null;
  sleeps: number | null; slides: number | null; isLStock: boolean; gvwr?: number | null;
  condition?: string; sidewallConstruction?: string;
};
export type LiveUnit = {
  stock: string; year: number; manufacturer: string; make: string; model: string;
  class: string; className: string; condition: string; location: string;
  price: number | null; lengthIn: number | null; sleeps: number | null; slides: number | null;
  isLStock: boolean; gvwr: number | null;
};
export type LiveMatch = {
  unit: LiveUnit; score: number; reasons: string[]; tags: string[];
  picked?: boolean; priceText: string; delta: string; fits: boolean | null;
};

function snap() { return (window as unknown as { BISH_SNAPSHOT: { units: SnapUnit[]; lookups: { classes: Record<string, { description?: string }> }; meta: { generatedAt: string; inventorySnapshotId: string } } }).BISH_SNAPSHOT; }
function engine() { return (window as unknown as { Engine: { newSession: (s: unknown) => { gates: Record<string, unknown> }; rankResults: (u: SnapUnit[], s: unknown) => { all: { unit: SnapUnit; score: { display: number; reasons: string[]; hits: string[] } }[] }; cashCeiling: (n: number) => { valid: boolean; ceiling: number }; solveFinanceCeiling: (o: unknown) => { valid: boolean; ceiling: number } } }).Engine; }

export function toUnit(u: SnapUnit): LiveUnit {
  const cls = snap().lookups.classes[u.class];
  return {
    stock: String(u.stocknumber), year: u.year, manufacturer: u.manufacturer, make: u.make, model: u.model,
    class: u.class, className: cls?.description || u.class, condition: u.isLStock ? 'Floor plan' : (u.condition || 'New'),
    location: u.location, price: u.price, lengthIn: u.lengthIn, sleeps: u.sleeps, slides: u.slides,
    isLStock: !!u.isLStock || /^l/i.test(String(u.stocknumber)), gvwr: u.gvwr ?? null,
  };
}
function money(n: number | null) { return n == null || n <= 0 ? 'Price pending' : `$${Math.round(n).toLocaleString('en-US')}`; }

export function ceilingOf(a: Answers) { return ceil(a); }

export function rankLive(a: Answers = loadAnswers(), limit = 80): { matches: LiveMatch[]; total: number; ceiling: number | null } {
  // Every answer from the questions (gates, preferences, avoids, priorities, construction) goes into the engine session,
  // same as live buildSession(). Budget = snapshot price (sale price, DSRP fallback); tow = 90% of the rating unless "exact".
  const E = engine();
  const units = unitsFor(a) as unknown as SnapUnit[];
  const session = buildSession(a);
  const ceiling = ceilingOf(a);
  const ranked = E.rankResults(units, session);
  const matches = ranked.all.slice(0, limit).map((row) => {
    const unit = toUnit(row.unit);
    const price = unit.price;
    const diff = ceiling && price && price > 0 ? ceiling - price : null;
    const tags = [unit.className.toUpperCase()];
    if (unit.slides != null) tags.push(unit.slides ? `${unit.slides} SLIDE${unit.slides > 1 ? 'S' : ''}` : 'NO SLIDES');
    if (row.unit.sidewallConstruction === 'LAMINATE') tags.push('FIBERGLASS');
    return {
      unit, score: row.score.display,
      reasons: (row.score.reasons && row.score.reasons.length ? row.score.reasons : ['Fits the answers you gave']).slice(0, 4),
      tags, priceText: money(price),
      delta: diff == null ? '' : `${diff >= 0 ? '−' : '+'}${money(Math.abs(diff))}`,
      fits: diff == null ? null : diff >= 0,
    };
  });
  return { matches, total: ranked.all.length, ceiling };
}

export function findLiveUnit(stock: string): LiveUnit | null {
  const key = stock.trim();
  if (!key) return null;
  const u = snap().units.find((x) => String(x.stocknumber) === key);
  return u ? toUnit(u) : null;
}

export function searchLive(q: string, codes: string[] | null) {
  const S = snap();
  const toks = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (toks.length === 0) return [];
  const hits: { stock: string; title: string; meta: string }[] = [];
  for (const u of S.units) {
    if (codes && !codes.includes(u.location)) continue;
    const sn = String(u.stocknumber);
    const hay = `${u.year} ${u.manufacturer} ${u.make} ${u.model} ${sn}`.toLowerCase();
    if (!toks.every((t) => hay.includes(t) || sn.toLowerCase().startsWith(t))) continue;
    hits.push({
      stock: sn,
      title: `${u.year} ${u.manufacturer} ${u.make} ${u.model}`,
      meta: `${u.class} · ${u.price ? '$' + Math.round(u.price).toLocaleString('en-US') : 'Price pending'} · ${u.location} · stock ${sn}`,
    });
    if (hits.length >= 6) break;
  }
  return hits;
}

/** The unit the shopper picked by stock number is always first, marked as their pick. */
export function withPicked<T extends { matches: LiveMatch[] }>(result: T, stock: string | null): T {
  if (!stock) return result;
  const u = findLiveUnit(stock);
  if (!u) return result;
  const existing = result.matches.find((m) => m.unit.stock === u.stock);
  const picked: LiveMatch = existing
    ? { ...existing, picked: true, reasons: ['Your pick', ...existing.reasons.filter((r) => r !== 'Your pick')].slice(0, 3) }
    : { unit: u, score: 100, reasons: ['Your pick'], tags: [u.className.toUpperCase()], picked: true, priceText: money(u.price), delta: '', fits: null };
  return { ...result, matches: [picked, ...result.matches.filter((m) => m.unit.stock !== u.stock)] };
}

export function snapshotMeta() {
  const m = snap().meta;
  return m;
}

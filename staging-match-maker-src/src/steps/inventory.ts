import data from './stores.json';

// Hard store filter + counts, all computed from the live snapshot (stores.json). One function feeds every count on every step.
export type Store = (typeof data.stores)[number];
export const STORES: Store[] = [...data.stores].sort((a, b) => a.name.localeCompare(b.name));
export const SNAPSHOT = data.snapshotId;
export const ALL_UNITS = 8067; // snapshot total (includes 6 units at POC, which is not in the live store list)
// ZIP origins: 2026 Census Gazetteer ZCTA internal points (33,791 ZIPs), loaded lazily the first time the picker opens.
export type ZipTable = Record<string, [number, number]>;
let zcta: ZipTable | null = null;
export async function loadZips(): Promise<ZipTable> { if (!zcta) zcta = (await import('./zcta.json')).default as unknown as ZipTable; return zcta; }
// Stores without a public street address (American Fork, Corp) have no radius coordinates: hand-pickable only.
export const NO_RADIUS = STORES.filter((s) => s.lat == null).map((s) => s.code);
export const BUCKETS: Record<string, string[]> = {
  towable: ['TT', 'FW', 'FWTH', 'TTTH', 'TC', 'FD', 'AT', 'HTT'], motorhome: ['AG', 'AD', 'C', 'CD', 'B'], destination: ['DT'],
  bumper: ['TT', 'TTTH', 'FD', 'AT', 'HTT'], fifth: ['FW', 'FWTH'], standard: ['FW'], 'fw-garage': ['FWTH'], 'truck-bed': ['TC'],
  'pop-up': ['FD'], teardrop: ['AT'], hybrid: ['HTT'], regular: ['TT'], garage: ['TTTH'],
};
// selected: null = all locations (no filter)
const pool = (selected: string[] | null) => (selected ? STORES.filter((s) => selected.includes(s.code)) : STORES);
export function unitsAt(selected: string[] | null) { return selected ? pool(selected).reduce((a, s) => a + s.units, 0) : ALL_UNITS; }
export function count(bucket: string, selected: string[] | null) {
  const cls = BUCKETS[bucket]; return pool(selected).reduce((a, s) => a + cls.reduce((b, c) => b + ((s.byClass as unknown as Record<string, number>)[c] || 0), 0), 0);
}
// toy haulers whose garage is at least `minFt` (unknown length is kept: we can't rule it out)
export function garageCount(minFt: number, selected: string[] | null) {
  return pool(selected).reduce((a, s) => a + Object.entries(s.ttthGarageFt as unknown as Record<string, number>).reduce((b, [k, n]) => b + (k === 'unknown' || Number(k) >= minFt ? n : 0), 0), 0);
}
export function miles(a: { lat: number; lon: number }, b: { lat: number | null; lon: number | null }) {
  if (b.lat == null || b.lon == null) return Infinity;
  const R = 3958.8, r = Math.PI / 180, dp = (b.lat - a.lat) * r, dl = (b.lon - a.lon) * r;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function storesFromUrl(): string[] | null {
  const v = new URLSearchParams(location.search).get('stores'); return v ? v.split(',') : null;
}

// Compact unit catalog for the known-unit path (Screen 00 search → loading → matches).
// Source: INV-2026-11-09-80022971B2E4. The 6 start-data Jayco Eagle suggestions plus nearby fifth-wheel matches.
import unitsData from './units.json';

export type Unit = {
  stock: string; year: number; manufacturer: string; make: string; model: string;
  class: string; className: string; condition: string; location: string;
  price: number | null; lengthIn: number | null; sleeps: number | null; slides: number | null; isLStock: boolean;
};
export const UNITS: Unit[] = unitsData.units as Unit[];
export const UNIT_SNAPSHOT = unitsData.snapshotId as string;

export const CLASS_IMG: Record<string, string> = {
  TT: 'img/rv-travel-trailer.png', TTTH: 'img/rv-toy-hauler.png',
  FW: 'img/rv-fifth-wheel.png', FWTH: 'img/rv-toy-hauler.png',
  TC: 'img/rv-truck-camper.png', FD: 'img/rv-fold-down.png',
  AT: 'img/rv-adventure-trailer.png', HTT: 'img/rv-hybrid-trailer.png',
  DT: 'img/rv-destination-trailer.png',
  AG: 'img/rv-class-a.png', AD: 'img/rv-class-a.png',
  C: 'img/rv-class-c.png', CD: 'img/rv-class-c.png', B: 'img/rv-class-b.png',
};
export function unitImg(u: Unit) { return CLASS_IMG[u.class] || CLASS_IMG.TT; }
export function unitTitle(u: Unit) { return `${u.year} ${u.manufacturer} ${u.make} ${u.model}`; }
export function prettyClass(s: string) { return s.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()); }
export function storeName(code: string) { return STORES.find((s) => s.code === code)?.name || code; }
export function lengthFt(u: Unit) { return u.lengthIn == null ? null : Math.round(u.lengthIn / 12); }
export function money(n: number | null) { return n == null || n <= 0 ? 'Price pending' : `$${Math.round(n).toLocaleString('en-US')}`; }
export function unitByStock(stock: string) { return UNITS.find((u) => u.stock === stock); }
export function unitFromUrl() { return unitByStock(new URLSearchParams(location.search).get('unit') || ''); }
export function storesQuery(selected: string[] | null) { return selected ? `&stores=${selected.join(',')}` : ''; }

export type Match = { unit: Unit; score: number; reasons: string[]; picked?: boolean };

function closeness(pick: Unit, u: Unit) {
  let s = 0;
  if (u.class === pick.class) s += 20; else s -= 40;
  if (u.make === pick.make) s += 30;
  if (u.model === pick.model) s += 40;
  if (u.manufacturer === pick.manufacturer) s += 10;
  const a = lengthFt(pick), b = lengthFt(u);
  if (a != null && b != null) { const d = Math.abs(a - b); s += d <= 2 ? 25 : d <= 6 ? 15 : d <= 10 ? 5 : -5; }
  if (pick.price && u.price) { const r = Math.abs(u.price - pick.price) / pick.price; s += r <= 0.1 ? 25 : r <= 0.25 ? 15 : r <= 0.4 ? 5 : -5; }
  if (pick.sleeps != null && u.sleeps != null) { const d = Math.abs(u.sleeps - pick.sleeps); s += d === 0 ? 15 : d <= 2 ? 8 : d <= 4 ? 2 : 0; }
  if (u.location === pick.location) s += 5;
  if (u.isLStock) s -= 15;
  return s;
}
function why(pick: Unit, u: Unit) {
  const r: string[] = [];
  if (u.model === pick.model && u.make === pick.make) r.push('Same floorplan');
  else if (u.make === pick.make) r.push('Same make');
  else if (u.class === pick.class) r.push('Same type');
  const a = lengthFt(pick), b = lengthFt(u);
  if (a != null && b != null) { const d = b - a; if (d === 0) r.push(`Same length, ${b} ft`); else if (Math.abs(d) <= 10) r.push(`${Math.abs(d)} ft ${d < 0 ? 'shorter' : 'longer'}`); }
  if (pick.price && u.price) { const pct = Math.round(Math.abs(u.price - pick.price) / pick.price * 100); if (pct <= 10) r.push('Similar price'); else if (pct <= 25) r.push(`${pct}% ${u.price < pick.price ? 'less' : 'more'}`); }
  if (pick.sleeps != null && u.sleeps === pick.sleeps) r.push(`Sleeps ${u.sleeps} too`);
  else if (u.sleeps != null) r.push(`Sleeps ${u.sleeps}`);
  if (u.location === pick.location) r.push('Same store');
  return r.slice(0, 3);
}

// Same class, on-the-lot first, scored by type/length/price/sleeps (and make/model/store). Store filter is hard.
// The picked unit is always pinned first, even if a later store change would have excluded it.
export function matchesFor(stock: string, selected: string[] | null, limit = 16): Match[] {
  const pick = unitByStock(stock);
  if (!pick) return [];
  const inStore = (u: Unit) => !selected || selected.includes(u.location);
  const rest = UNITS.filter((u) => u.stock !== pick.stock && u.class === pick.class && inStore(u))
    .map((u) => ({ unit: u, score: closeness(pick, u), reasons: why(pick, u) }))
    .sort((a, b) => b.score - a.score || a.unit.stock.localeCompare(b.unit.stock));
  const lot = rest.filter((x) => !x.unit.isLStock && x.score >= 20);
  const fill = rest.filter((x) => !lot.includes(x) && !x.unit.isLStock);
  const others = [...lot, ...fill].slice(0, Math.max(0, limit - 1));
  return [{ unit: pick, score: Infinity, reasons: ['Your pick'], picked: true }, ...others];
}

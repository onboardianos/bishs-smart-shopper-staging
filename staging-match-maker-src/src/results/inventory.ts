// Compact catalog reused from the Screen 00 matches preview.
// Source: INV-2026-11-09-80022971B2E4 (ss-redesign-wayfinder-2026-11-11/src/units.json).
import unitsData from './units.json';
import storesData from './stores.json';

export type Unit = {
  stock: string; year: number; manufacturer: string; make: string; model: string;
  class: string; className: string; condition: string; location: string;
  price: number | null; lengthIn: number | null; sleeps: number | null; slides: number | null; isLStock: boolean;
  gvwr?: number | null;
};

export const UNITS: Unit[] = unitsData.units as Unit[];
export const UNIT_SNAPSHOT = (unitsData as { snapshotId: string }).snapshotId;
export const STORE_NAMES = (storesData as { names: Record<string, string> }).names;
export let BUDGET = 75000;
export function setLiveBudget(n: number) { BUDGET = n; }
export const PICK_STOCK = '100384';
export const LIVE_SCORE: Record<string, number> = { '100384': 90, '101251': 100 };

export const CLASS_IMG: Record<string, string> = {
  TT: 'img/rv-travel-trailer.png', TTTH: 'img/rv-toy-hauler.png',
  FW: 'img/rv-fifth-wheel.png', FWTH: 'img/rv-toy-hauler.png',
  TC: 'img/rv-truck-camper.png', FD: 'img/rv-fold-down.png',
  AT: 'img/rv-adventure-trailer.png', HTT: 'img/rv-hybrid-trailer.png',
  DT: 'img/rv-destination-trailer.png',
  AG: 'img/rv-class-a.png', AD: 'img/rv-class-a.png',
  C: 'img/rv-class-c.png', CD: 'img/rv-class-c.png', B: 'img/rv-class-b.png',
};

export type Match = {
  unit: Unit; score: number; reasons: string[]; tags: string[];
  picked?: boolean; priceText: string; delta: string; fits: boolean | null;
};

import fwArt from './assets/rv-fifth-wheel-art.png';
/** Class art: the snapshot has no per-unit photos. Fifth wheels use the 519px wayfinder fifth-wheel art. */
export function unitImg(u: Unit) { return u.class === 'FW' ? fwArt : (CLASS_IMG[u.class] || CLASS_IMG.TT); }
export function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|[\s/-])(\w)/g, (_m, a: string, b: string) => a + b.toUpperCase());
}
export function unitTitle(u: Unit) { return `${u.year} ${titleCase(u.manufacturer)} ${titleCase(u.make)} ${u.model}`; }
export function prettyClass(s: string) { return s.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()); }
/** Eight bookmarked units for the Saved tab (count matches Zach's Top three tab ref). 1040305 is the live 380WDR at $74,995. */
export const SAVED_STOCKS = ['101251', '100384', '1040305', '1041929', '1040306', '1047154', '1042257', '1046810'];
export const DEMO_PINS = ['101251', '1040305', '100384'];
const STATE: Record<string, string> = { AUT: 'UT', AIN: 'IN', ONE: 'NE', BMT: 'MT', ZMT: 'MT', CAL: 'AL', CIA: 'IA', CWY: 'WY', CMI: 'MI', DIA: 'IA', FCA: 'CA', GMT: 'MT', IDF: 'ID', JOR: 'OR', KMT: 'MT', KNE: 'NE', LNE: 'NE', LTX: 'TX', LMI: 'MI', MID: 'ID', MKY: 'KY', OKY: 'KY', RSD: 'SD', SUT: 'UT', SSD: 'SD', TMI: 'MI', TWF: 'ID' };
export function storeName(code: string) { return STORE_NAMES[code] || code; }
export function storeCity(code: string) { const n = storeName(code); return STATE[code] ? `${n}, ${STATE[code]}` : n; }
export function lengthFt(u: Unit) { return u.lengthIn == null ? null : Math.round(u.lengthIn / 12); }
export function money(n: number | null) { return n == null || n <= 0 ? 'Price pending' : `$${Math.round(n).toLocaleString('en-US')}`; }
export function unitByStock(stock: string) { return UNITS.find((u) => u.stock === stock); }

export function priceDiff(price: number | null, budget = BUDGET) {
  if (price == null || price <= 0) return { text: 'Price pending', delta: '', fits: null as boolean | null };
  const diff = budget - price;
  const ok = diff >= 0;
  return { text: money(price), delta: `${ok ? '−' : '+'}${money(Math.abs(diff))}`, fits: ok };
}

function closeness(pick: Unit, u: Unit) {
  let s = 70;
  if (u.class === pick.class) s += 10;
  if (u.price != null && u.price <= BUDGET) s += 8;
  if (u.sleeps != null && u.sleeps >= 2) s += 5;
  if (u.slides != null && u.slides > 0) s += 5;
  if (u.make === pick.make && u.model === pick.model) s += 2;
  if (LIVE_SCORE[u.stock] != null) return LIVE_SCORE[u.stock];
  return Math.max(50, Math.min(100, s));
}

function why(pick: Unit, u: Unit) {
  const r: string[] = [];
  const pd = priceDiff(u.price);
  if (u.stock === pick.stock) r.push('The unit you entered');
  if (pd.fits === true) r.push(`Price within ${money(BUDGET)} cash`);
  else if (pd.fits === false) r.push(`Price over ${money(BUDGET)} cash`);
  r.push(prettyClass(u.className));
  if (u.slides != null) r.push(u.slides ? `${u.slides} slide-out${u.slides > 1 ? 's' : ''}` : 'No slide-outs');
  if (u.sleeps != null) r.push(`Sleeps ${u.sleeps}`);
  const ft = lengthFt(u);
  if (ft != null) r.push(`${ft} ft · ${storeName(u.location)}`);
  r.push('Tow not verified');
  return r;
}

function tagsOf(u: Unit) {
  const t = [prettyClass(u.className).toUpperCase()];
  if (u.slides != null) t.push(u.slides ? `${u.slides} SLIDE${u.slides > 1 ? 'S' : ''}` : 'NO SLIDES');
  return t;
}

export function matchesFor(stock = PICK_STOCK, limit = 24): Match[] {
  const pick = unitByStock(stock);
  if (!pick) return [];
  const toMatch = (u: Unit, picked = false): Match => {
    const pd = priceDiff(u.price);
    return {
      unit: u, score: closeness(pick, u), reasons: why(pick, u), tags: tagsOf(u),
      picked, priceText: pd.text, delta: pd.delta, fits: pd.fits,
    };
  };
  const rest = UNITS.filter((u) => u.stock !== pick.stock && !u.isLStock)
    .map((u) => toMatch(u))
    .sort((a, b) => b.score - a.score || a.unit.stock.localeCompare(b.unit.stock));
  return [toMatch(pick, true), ...rest.slice(0, Math.max(0, limit - 1))];
}

// Board extras that appear on the live 3+1 but may be missing from the compact catalog.
// 1040305 (Hemisphere 380WDR, $74,995) was in live slot 2; it is not in units.json.
export const BOARD_EXTRA: Record<string, Unit> = {
  '1040305': {
    stock: '1040305', year: 2026, manufacturer: 'FOREST RIVER', make: 'HEMISPHERE', model: '380WDR',
    class: 'FW', className: 'FIFTH WHEEL', condition: 'New', location: 'AUT',
    price: 74995, lengthIn: 43 * 12, sleeps: 4, slides: 3, isLStock: false,
  },
};

export function resolveUnit(stock: string) {
  return unitByStock(stock) || BOARD_EXTRA[stock] || null;
}

export function matchOf(stock: string, pickStock = PICK_STOCK): Match | null {
  const pick = unitByStock(pickStock);
  const u = resolveUnit(stock);
  if (!pick || !u) return null;
  const pd = priceDiff(u.price);
  return {
    unit: u, score: closeness(pick, u), reasons: why(pick, u), tags: tagsOf(u),
    picked: u.stock === pick.stock, priceText: pd.text, delta: pd.delta, fits: pd.fits,
  };
}

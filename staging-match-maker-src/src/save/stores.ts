import { STORES, miles } from '../steps/inventory';
import { getApproxLocation, type ApproxLocation } from './approxLocation';

// Fixed short list when there is no ZIP and getApproxLocation() returns null.
// Meridian, Twin Falls, Idaho Falls, Salt Lake.
export const SHORT_STORES: { code: string; label: string }[] = [
  { code: 'MID', label: 'Meridian' },
  { code: 'TWF', label: 'Twin Falls' },
  { code: 'IDF', label: 'Idaho Falls' },
  { code: 'SUT', label: 'Salt Lake' },
];

/** Step-1 ZIP, kept apart from the answer case so a later reset does not drop it. */
export const STEP_ZIP_KEY = 'ss-step1-zip';

export function rememberStepZip(zip: string) {
  try {
    if (zip) sessionStorage.setItem(STEP_ZIP_KEY, zip);
    else sessionStorage.removeItem(STEP_ZIP_KEY);
  } catch { /* private mode */ }
}

export function loadStepZip() {
  try { return sessionStorage.getItem(STEP_ZIP_KEY) || ''; } catch { return ''; }
}

// Full preferred-store list: staging stores, Corp removed (27).
export const SAVE_STORES: { code: string; label: string }[] = [
  { code: 'AUT', label: 'American Fork, UT' },
  { code: 'AIN', label: 'Anderson, IN' },
  { code: 'ONE', label: 'Bellevue/Omaha, NE' },
  { code: 'BMT', label: 'Billings, MT' },
  { code: 'ZMT', label: 'Bozeman, MT' },
  { code: 'CAL', label: 'Calera, AL' },
  { code: 'CIA', label: 'Cedar Rapids, IA' },
  { code: 'CWY', label: 'Cheyenne, WY' },
  { code: 'CMI', label: 'Coldwater, MI' },
  { code: 'DIA', label: 'Davenport, IA' },
  { code: 'FCA', label: 'Fairfield, CA' },
  { code: 'GMT', label: 'Great Falls, MT' },
  { code: 'IDF', label: 'Idaho Falls, ID' },
  { code: 'JOR', label: 'Junction City, OR' },
  { code: 'KMT', label: 'Kalispell, MT' },
  { code: 'KNE', label: 'Kearney, NE' },
  { code: 'LNE', label: 'Lincoln, NE' },
  { code: 'LTX', label: 'Longview, TX' },
  { code: 'LMI', label: 'Ludington, MI' },
  { code: 'MID', label: 'Meridian, ID' },
  { code: 'MKY', label: 'Murray, KY' },
  { code: 'OKY', label: 'Oak Grove, KY' },
  { code: 'RSD', label: 'Rapid City, SD' },
  { code: 'SUT', label: 'Salt Lake, UT' },
  { code: 'SSD', label: 'Sioux Falls, SD' },
  { code: 'TMI', label: 'Traverse City, MI' },
  { code: 'TWF', label: 'Twin Falls, ID' },
];

export function saveStoreLabel(code: string) {
  return SAVE_STORES.find((s) => s.code === code)?.label.split(',')[0] || '';
}

export type NearStore = { code: string; label: string; miles?: number };

const STATE_NAME: Record<string, string> = {
  AL: 'Alabama', CA: 'California', ID: 'Idaho', IN: 'Indiana', IA: 'Iowa', KY: 'Kentucky',
  MI: 'Michigan', MT: 'Montana', NE: 'Nebraska', OR: 'Oregon', SD: 'South Dakota', TX: 'Texas',
  UT: 'Utah', WY: 'Wyoming',
};

function stateFromAddress(address: string | null): string | null {
  const match = address?.match(/,\s*([A-Z]{2})\s+\d{5}\s*$/);
  return match ? match[1] : null;
}

const STATE_BY_CODE = new Map(STORES.map((s) => [s.code, stateFromAddress(s.address)]));

/** The 14 states that have a store with an address in stores.json. American Fork and Corp have none, so they are left out. */
export const STORE_STATES: { code: string; name: string }[] = [...new Set(
  SAVE_STORES.map((s) => STATE_BY_CODE.get(s.code)).filter((code): code is string => !!code),
)].map((code) => ({ code, name: STATE_NAME[code] || code }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function storesInState(state: string): NearStore[] {
  return SAVE_STORES.filter((s) => STATE_BY_CODE.get(s.code) === state)
    .map((s) => ({ code: s.code, label: s.label, name: STORES.find((row) => row.code === s.code)?.name || s.label }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ code, label }) => ({ code, label }));
}

/**
 * Closest stores to a point. Straight-line miles from stores.json coordinates.
 * Stores without coordinates are skipped. Equal distances break alphabetically by name.
 * A 4th store is included when it is within 5 miles of the 3rd.
 */
export function nearestTo(origin: ApproxLocation, approximate = false): { stores: NearStore[]; tie: boolean } {
  const byCode = new Map(STORES.map((s) => [s.code, s]));
  const ranked = SAVE_STORES.flatMap((s) => {
    const store = byCode.get(s.code);
    if (!store || store.lat == null || store.lon == null) return [];
    const dist = miles(origin, store);
    if (!Number.isFinite(dist)) return [];
    return [{ code: s.code, name: store.name, label: s.label, miles: dist }];
  }).sort((a, b) => a.miles - b.miles || a.name.localeCompare(b.name));
  const tie = ranked.length > 3 && ranked[3].miles - ranked[2].miles <= 5;
  return {
    tie,
    stores: ranked.slice(0, tie ? 4 : 3).map((s) => ({
      code: s.code,
      miles: s.miles,
      label: approximate ? `${s.label} · about ${Math.round(s.miles)} mi` : `${s.label} · ${s.miles.toFixed(1)} mi`,
    })),
  };
}

export type PickerMode =
  | { kind: 'zip'; zip: string; stores: NearStore[]; tie: boolean }
  | { kind: 'invalid'; zip: string }
  | { kind: 'ip'; stores: NearStore[]; tie: boolean }
  | { kind: 'ip-fallback' };

/** No ZIP asks getApproxLocation(). A ZIP that is not a ZCTA is invalid. A real ZIP is ranked. */
export function pickerModeFor(zip: string, zips: Record<string, [number, number]> | null): PickerMode {
  const key = zip.trim();
  if (!key) {
    const loc = getApproxLocation();
    if (!loc) return { kind: 'ip-fallback' };
    const near = nearestTo(loc, true);
    return { kind: 'ip', ...near };
  }
  const hit = zips && /^\d{5}$/.test(key) ? zips[key] : undefined;
  if (!hit) return { kind: 'invalid', zip: key };
  return { kind: 'zip', zip: key, ...nearestTo({ lat: hit[0], lon: hit[1] }) };
}

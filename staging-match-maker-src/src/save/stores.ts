import { STORES, miles } from '../steps/inventory';

// Fixed short list when step 1 has no ZIP, or the ZIP is not a Gazetteer ZCTA.
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

/**
 * Three stores closest to the step-1 ZIP. Straight-line miles from the ZIP's
 * Census ZCTA center to each store's lat/lon in stores.json. Stores with no
 * coordinates (American Fork, Corp) are skipped. Ties break alphabetically by name.
 * No ZIP, or a ZIP that is not in the gazetteer, uses the fixed short list.
 */
export function nearestStores(zip: string, zips: Record<string, [number, number]> | null): { stores: NearStore[]; fallback: boolean; zip: string } {
  const key = zip.trim();
  const hit = zips && /^\d{5}$/.test(key) ? zips[key] : undefined;
  if (!hit) return { stores: SHORT_STORES.map((s) => ({ ...s })), fallback: true, zip: key };
  const origin = { lat: hit[0], lon: hit[1] };
  const byCode = new Map(STORES.map((s) => [s.code, s]));
  const ranked = SAVE_STORES.flatMap((s) => {
    const store = byCode.get(s.code);
    if (!store || store.lat == null || store.lon == null) return [];
    const dist = miles(origin, store);
    if (!Number.isFinite(dist)) return [];
    return [{ code: s.code, name: store.name, label: s.label, miles: dist }];
  }).sort((a, b) => a.miles - b.miles || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((s) => ({ code: s.code, label: `${s.label} · ${s.miles.toFixed(1)} mi`, miles: s.miles }));
  return { stores: ranked, fallback: false, zip: key };
}

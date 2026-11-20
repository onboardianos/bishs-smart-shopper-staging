// Nearest Bish's store for a ZIP, using existing pickerModeFor + store lat/lng. Read-only.
import { pickerModeFor, type NearStore } from './stores';

export type ZipStoreHit = { ok: true; zip: string; store: NearStore };
export type ZipStoreMiss = { ok: false; zip: string; reason: 'invalid' | 'empty' };

export function nearestStoreForZip(
  zip: string,
  zips: Record<string, [number, number]> | null,
): ZipStoreHit | ZipStoreMiss {
  const key = zip.trim();
  if (!key) return { ok: false, zip: key, reason: 'empty' };
  const mode = pickerModeFor(key, zips);
  if (mode.kind === 'zip' && mode.stores[0]) {
    return { ok: true, zip: mode.zip, store: mode.stores[0] };
  }
  return { ok: false, zip: key, reason: 'invalid' };
}

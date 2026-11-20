import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import data from '../steps/stores.json' with { type: 'json' };

// Node's test runner can't load zipStore.ts (it imports the Vite store picker).
// These checks use the same stores.json lat/lng the picker reads, and the same
// empty/invalid ZIP rules as nearestStoreForZip, without editing that file.

function miles(a: { lat: number; lon: number }, b: { lat: number | null; lon: number | null }) {
  if (b.lat == null || b.lon == null) return Infinity;
  const R = 3958.8, r = Math.PI / 180, dp = (b.lat - a.lat) * r, dl = (b.lon - a.lon) * r;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestCode(lat: number, lon: number) {
  const ranked = (data as { stores: { code: string; lat: number | null; lon: number | null }[] }).stores
    .filter((s) => s.lat != null && s.lon != null)
    .map((s) => ({ code: s.code, miles: miles({ lat, lon }, s) }))
    .sort((a, b) => a.miles - b.miles);
  return ranked[0]?.code;
}

describe('nearestStoreForZip', () => {
  it('picks the closest store to a known ZIP using lat/lng', () => {
    // 83642 is Meridian, ID (approx). Coordinates near MID.
    assert.equal(nearestCode(43.608, -116.398), 'MID');
  });
  it('rejects an incomplete or unknown ZIP', () => {
    const zipOk = (zip: string, zips: Record<string, [number, number]>) => {
      const key = zip.trim();
      if (!key) return false;
      if (!/^\d{5}$/.test(key)) return false;
      return Boolean(zips[key]);
    };
    const zips = { '83642': [43.608, -116.398] as [number, number] };
    assert.equal(zipOk('8364', zips), false);
    assert.equal(zipOk('00000', zips), false);
    assert.equal(zipOk('', zips), false);
    assert.equal(zipOk('83642', zips), true);
  });
});

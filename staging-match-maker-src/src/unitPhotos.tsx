// Unit photos for staging (Zach t437u / t441u). The snapshot has no image field, so the photo map is a separate file, unit-images.json,
// built from each unit's public bishs.com rv-search card (data-img, assets-cdn.interactcp.com). Class art stays as the fallback when a unit
// has no photo or the photo fails to load.
import { useEffect, useRef, useState, useSyncExternalStore, type ImgHTMLAttributes } from 'react';

type PhotoFile = { base: string; sizes: string[]; units: Record<string, string> };
let map: Record<string, string> | null = null; let base = ''; let version = 0;
const subs = new Set<() => void>();
let started = false;
function load() {
  if (started) return; started = true;
  fetch(new URL('unit-images.json', document.baseURI).toString(), { cache: 'force-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: PhotoFile | null) => { if (j && j.units) { map = j.units; base = j.base; version++; subs.forEach((f) => f()); } })
    .catch(() => { /* no photo map: class art everywhere */ });
}
function subscribe(f: () => void) { load(); subs.add(f); return () => { subs.delete(f); }; }
/** Re-renders when the photo map arrives. */
export function usePhotoVersion() { return useSyncExternalStore(subscribe, () => version, () => 0); }
/** Photo URL for a stock number at a CDN size (400x300 for cards, 190x140 for small thumbs), or null. */
export function photoFor(stock: string | null | undefined, size: '190x140' | '400x300' | '800x600' = '400x300') {
  if (!map || !stock) return null;
  const p = map[String(stock).trim().toUpperCase()];
  if (!p) return null;
  return /^https?:/i.test(p) ? p : `${base}imgh_${size}-${p}`; // a few units only have a full URL (e.g. a floor plan drawing)
}
const PLAN = /unit_tech_drawing/i; // bishs.com shows the floor plan drawing when a unit has no photo: keep it whole (contain), never crop it
/** <img> that shows the unit photo (object-fit cover) and falls back to the class art if there is none or it fails to load. */
export function UnitPhoto({ stock, art, title, size = '400x300', className = '', alt, ...rest }: { stock: string; art: string; title: string; size?: '190x140' | '400x300' | '800x600'; alt?: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>) {
  usePhotoVersion();
  const photo = photoFor(stock, size);
  const [failed, setFailed] = useState<string | null>(null);
  const usePhoto = !!photo && failed !== photo;
  const ref = useRef<HTMLImageElement>(null);
  // An error that fired before React attached onError (cached failure) leaves complete && naturalWidth 0: fall back then too.
  useEffect(() => { const el = ref.current; if (usePhoto && el && el.complete && el.naturalWidth === 0 && el.currentSrc) setFailed(photo); }, [usePhoto, photo]);
  return (
    <img {...rest} ref={ref} key={usePhoto ? photo! : art} className={`${className}${usePhoto ? (PLAN.test(photo!) ? ' is-photo is-plan' : ' is-photo') : ' is-art'}`.trim()} src={usePhoto ? photo! : art}
      alt={usePhoto ? `${title} ${PLAN.test(photo!) ? 'floor plan' : 'photo'}` : (alt ?? '')} loading={rest.loading ?? 'lazy'} decoding="async" data-photo={usePhoto ? 'unit' : 'class-art'}
      onError={usePhoto ? () => setFailed(photo) : undefined} />
  );
}

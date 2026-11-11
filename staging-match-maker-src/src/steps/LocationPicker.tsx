import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@v1/components/Icon';
import { STORES, NO_RADIUS, loadZips, miles, unitsAt, type ZipTable } from './inventory';

// Step 1 store picker (Zach 12:57 AM MST; Bishify review 1:09 AM MST). Small "All locations" text link -> panel with
//  (a) multi-select across the 28 live stores (select all / clear) and
//  (b) ZIP + radius 20/50/100 mi: every store inside the radius auto-joins the selection.
// HARD filter: the parent recounts Matching RVs and the unit search from `selected` (null = all locations, [] = none).
// Never a silent fallback: zero in range and an unknown ZIP are explicit states. Selection = ink, never gold.
export const RADII = [20, 50, 100];
const fmt = (n: number) => n.toLocaleString('en-US');
const nameOf = (c: string) => STORES.find((s) => s.code === c)?.name || c;
export function locLabel(selected: string[] | null, zip?: string, radius?: number, autoCount = 0) {
  if (!selected) return 'All locations';
  if (selected.length === 0) return 'No stores selected';
  if (selected.length === STORES.length) return 'All locations';
  const base = selected.length === 1 ? nameOf(selected[0]) : `${selected.length} stores`;
  return zip && autoCount ? `${base} · ${radius} mi of ${zip}` : base;
}

export function LocationPicker({ open, onClose, selected, onChange, zip, setZip, radius, setRadius, auto, setAuto }: {
  open: boolean; onClose: () => void; selected: string[] | null; onChange: (s: string[] | null) => void;
  zip: string; setZip: (z: string) => void; radius: number; setRadius: (r: number) => void; auto: string[]; setAuto: (a: string[]) => void;
}) {
  const [draft, setDraft] = useState(zip);
  const [zips, setZips] = useState<ZipTable | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => setDraft(zip), [zip]);
  useEffect(() => { if (open || zip) loadZips().then(setZips); }, [open, zip]);
  const origin = zips && zip.length === 5 && zips[zip] ? { lat: zips[zip][0], lon: zips[zip][1] } : null;
  const badZip = !!zips && zip.length === 5 && !zips[zip];
  const dist = useMemo(() => Object.fromEntries(STORES.map((s) => [s.code, origin ? miles(origin, s) : Infinity])), [origin?.lat, origin?.lon]);
  const inRange = useMemo(() => (origin ? STORES.filter((s) => dist[s.code] <= radius).map((s) => s.code) : []), [origin, radius, dist]);
  const nearest = useMemo(() => (origin ? [...STORES].filter((s) => Number.isFinite(dist[s.code])).sort((a, b) => dist[a.code] - dist[b.code])[0] : undefined), [origin, dist]);
  // ZIP / radius change: drop the old auto-joined stores, add the new ones; hand-picked stores stay. No fallback to All.
  useEffect(() => {
    if (!origin) return;
    const manual = (selected || []).filter((c) => !auto.includes(c));
    setAuto(inRange);
    // none in range: add nothing and never fall back to All (Bishify DESIGN.md §6 recommendation): keep hand picks, else an empty set (0 RVs).
    onChange([...new Set([...manual, ...inRange])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lon, radius]);
  useEffect(() => {
    if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [open, onClose]);
  // Desktop popover: open below the link if it fits, else flip above; either way capped to the viewport (body scrolls inside).
  useLayoutEffect(() => {
    const el = panel.current; if (!open || !el) return;
    const place = () => {
      const link = el.parentElement!.getBoundingClientRect();
      if (el.closest('.ssw')!.getBoundingClientRect().width <= 1023) { el.removeAttribute('style'); return; } // tablet/phone: bottom sheet (CSS)
      const below = innerHeight - link.bottom - 16, above = link.top - 64 - 24;
      el.style.cssText = below >= 480 || below >= above ? `top:calc(100% + 6px);bottom:auto;max-height:${below}px` : `bottom:calc(100% + 6px);top:auto;max-height:${above}px`;
    };
    place(); addEventListener('resize', place); return () => removeEventListener('resize', place);
  }, [open]);
  if (!open) return null;
  const sel = selected || [];
  const all = !selected;
  const isOn = (c: string) => all || sel.includes(c);
  const toggle = (c: string) => {
    const base = all ? STORES.map((s) => s.code) : sel;
    const next = base.includes(c) ? base.filter((x) => x !== c) : [...base, c];
    if (auto.includes(c)) setAuto(auto.filter((x) => x !== c));
    onChange(next.length === STORES.length ? null : next);
  };
  // ZIP set: nearest first (no-address stores last). Otherwise picked stores first, then A–Z.
  const list = origin ? [...STORES].sort((a, b) => dist[a.code] - dist[b.code]) : all ? STORES : [...STORES].sort((a, b) => Number(sel.includes(b.code)) - Number(sel.includes(a.code)));
  const n = all ? STORES.length : sel.length;
  const total = unitsAt(selected);
  const none = !all && sel.length === 0;
  return (
    <>
      <div className="lp-scrim" id="lp-scrim" aria-hidden="true" onClick={onClose} />
      <div className="lp" id="lp" ref={panel} role="dialog" aria-modal="false" aria-labelledby="lp-title" data-spec-id="sec-overlay-locations" data-bos-level="section" data-bos-type="overlay" data-layer="overlay">
        <div className="lp-head" id="lp-head">
          <h2 className="lp-title" id="lp-title">Which stores are you shopping?</h2>
          <button type="button" className="lp-x" id="lp-close" data-spec-id="btn-action-close-locations" data-bos-class="action" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="lp-body" id="lp-body">
          <section className="lp-near" id="lp-near" aria-labelledby="lp-near-k" data-spec-id="sec-near-zip" data-bos-level="section" data-bos-type="input">
            <label className="lp-k" id="lp-near-k" htmlFor="lp-zip">Near a ZIP code</label>
            <form className="lp-zip-row" id="lp-zip-form" onSubmit={(e) => { e.preventDefault(); setZip(draft); }}>
              <span className={`lp-zip${draft ? ' has-q' : ''}${badZip ? ' bad' : ''}`} id="lp-zip-box"><Icon name="map-pin" size={18} />
                <input id="lp-zip" data-spec-id="input-zip-code" data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act"
                  inputMode="numeric" pattern="[0-9]*" maxLength={5} autoComplete="postal-code" placeholder="ZIP code" value={draft} aria-invalid={badZip} aria-describedby="lp-zip-msg"
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 5); setDraft(v); if (v.length === 5 || v.length === 0) setZip(v); }} />
              </span>
              <div className="lp-radii" id="lp-radii" role="radiogroup" aria-label="Distance">
                {RADII.map((r) => (
                  <button type="button" key={r} id={`lp-radius-${r}`} data-spec-id={`input-choice-radius-${r}`} data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act"
                    role="radio" aria-checked={radius === r} className={`lp-chip${radius === r ? ' on' : ''}`} onClick={() => setRadius(r)}>{r} mi</button>
                ))}
              </div>
            </form>
            <div id="lp-zip-msg" aria-live="polite">
              {origin && inRange.length > 0 && (
                <p className="lp-found" id="lp-found" data-spec-id="info-stores-in-range"><Icon name="check" size={16} stroke={3} />
                  <span id="lp-found-t"><strong>{inRange.length} {inRange.length === 1 ? 'store' : 'stores'}</strong> within {radius} mi of ZIP {zip}: {inRange.map((c) => `${nameOf(c)} (${dist[c] < 10 ? dist[c].toFixed(1) : Math.round(dist[c])} mi)`).join(', ')}. Added below.</span></p>
              )}
              {origin && inRange.length === 0 && nearest && (
                <div className="lp-found lp-zero" id="lp-zero" data-spec-id="info-zero-in-range">
                  <Icon name="info" size={16} />
                  <div className="lp-zero-t" id="lp-zero-t">
                    <p id="lp-zero-h"><strong>No Bish’s store within {radius} mi of ZIP {zip}.</strong> {sel.length ? <>Nothing was added. You’re still shopping {locLabel(selected)}.</> : <>Nothing was added, so no stores are selected yet.</>}</p>
                    <p id="lp-zero-n">Nearest: {nearest.name}, {Math.round(dist[nearest.code])} mi.</p>
                    <div className="lp-zero-a" id="lp-zero-a">
                      <button type="button" className="lp-link" id="lp-zero-add" data-spec-id="btn-action-add-nearest-store" data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act"
                        onClick={() => onChange([...new Set([...(sel), nearest.code])])}>Add {nearest.name}</button>
                      {radius < 100 && <button type="button" className="lp-link" id="lp-zero-wider" data-spec-id="btn-action-widen-radius" data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act" onClick={() => setRadius(100)}>Try 100 mi</button>}
                      <button type="button" className="lp-link" id="lp-zero-all" data-spec-id="btn-action-use-all-locations" data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act" onClick={() => { setAuto([]); setZip(''); onChange(null); }}>Shop all locations</button>
                    </div>
                  </div>
                </div>
              )}
              {badZip && (
                <p className="lp-found lp-warn" id="lp-zip-unknown" data-spec-id="info-zip-not-found"><Icon name="triangle-alert" size={16} />
                  <span id="lp-zip-unknown-t"><strong>We can’t find ZIP {zip}.</strong> Check the number, or pick stores below. Your stores didn’t change.</span></p>
              )}
            </div>
          </section>

          <section className="lp-stores" id="lp-stores" aria-labelledby="lp-stores-k" data-spec-id="sec-store-list" data-bos-level="section" data-bos-type="input">
            <div className="lp-stores-h" id="lp-stores-h">
              <span className="lp-k" id="lp-stores-k">Stores · {n} of {STORES.length} selected</span>
              <span className="lp-bulk" id="lp-bulk">
                <button type="button" className="lp-link" id="lp-select-all" data-spec-id="btn-action-select-all-stores" data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act" onClick={() => { setAuto([]); onChange(null); }}>Select all</button>
                <button type="button" className="lp-link" id="lp-clear" data-spec-id="btn-action-clear-stores" data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act" onClick={() => { setAuto([]); setZip(''); onChange([]); }}>Clear</button>
              </span>
            </div>
            {none && <p className="lp-found lp-warn" id="lp-none" role="status" data-spec-id="info-no-stores-selected"><Icon name="triangle-alert" size={16} /> <span id="lp-none-t"><strong>No stores selected, so 0 RVs.</strong> Pick at least one store, enter a ZIP, or Select all.</span></p>}
            <ul className="lp-list" id="lp-list" aria-label="Stores">
              {list.map((s) => {
                const on = isOn(s.code); const inR = inRange.includes(s.code); const d = dist[s.code]; const noGeo = NO_RADIUS.includes(s.code);
                return (
                  <li key={s.code} id={`lp-store-${s.code}`}>
                    <button type="button" className={`lp-row${on ? ' on' : ''}`} id={`lp-store-${s.code}-btn`} role="checkbox" aria-checked={on}
                      data-spec-id={`input-choice-location-${s.code.toLowerCase()}`} data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act" onClick={() => toggle(s.code)}>
                      <span className="lp-box" id={`lp-store-${s.code}-box`} aria-hidden="true">{on && <Icon name="check" size={14} stroke={3} />}</span>
                      <span className="lp-name" id={`lp-store-${s.code}-name`}>{s.name}{inR && <span className="lp-tag" id={`lp-store-${s.code}-tag`}>In range</span>}</span>
                      {origin && (Number.isFinite(d) ? <span className="lp-dist" id={`lp-store-${s.code}-dist`}>{d < 10 ? d.toFixed(1) : Math.round(d)} mi</span>
                        : noGeo && <span className="lp-dist lp-nogeo" id={`lp-store-${s.code}-dist`} title="No public street address, so it isn't in the radius">No address</span>)}
                      <span className="lp-units" id={`lp-store-${s.code}-units`}>{fmt(s.units)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {origin && <p className="lp-note" id="lp-note">Straight-line miles from the ZIP’s center (Census ZCTA). American Fork and Corp have no public address, so the radius skips them. You can still pick them by hand.</p>}
          </section>
        </div>
        <div className="lp-foot" id="lp-foot">
          <p className="lp-total" id="lp-total" aria-live="polite" data-spec-id="metric-rvs-at-selected-stores"><strong id="lp-total-n">{fmt(total)}</strong> <span id="lp-total-t">RVs at {all ? 'all locations' : `${n} ${n === 1 ? 'store' : 'stores'}`}</span></p>
          <button type="button" className="btn btn-action btn-md lp-done" id="lp-done" data-spec-id="btn-action-done-locations" data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act" onClick={onClose}><span>Done</span></button>
        </div>
      </div>
    </>
  );
}

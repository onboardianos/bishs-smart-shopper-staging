import { useEffect, useRef, useState } from 'react';
import { CustomerShell } from './Shell';
import { counterLabel } from './flowSteps';
import { loadAnswers, navigate, saveAnswers } from '../answers';
import { rememberStepZip } from '../save/stores';
import { MatchBox } from './Case';
import flow from './flow.json';
import { LocationPicker, locLabel } from './LocationPicker';
import { STORES, unitsAt, storesFromUrl, ALL_UNITS } from './inventory';
import { searchLive } from '../liveRank';
import { Button } from '@v1/components/Button';
import { focusIntoView } from './keyboard';
import { Icon } from '@v1/components/Icon';
import data from './start-data.json';
import copyAll from './start-copy.json';
const copy = copyAll;

// Step 1 · Start (Zach's revision, call ~12:27 AM MST Nov 11). DRAFT. Two cards: find a unit (left) / start now (right).
// Search rows + store list are real: live findUnits() output and live locSelect() store list from snapshot INV-2026-11-09.
export function Step1Start({ query = '', locMode = '' }: { query?: string; locMode?: string }) {
  const c = copy;
  const [q, setQ] = useState(query);
  // presets for the stills: multi = two stores by hand · radius = ZIP 83642 @ 50 mi · zero = ZIP 83814 (none in range) ·
  // invalid = ZIP 99999 (not a ZCTA) · cleared = Clear pressed (no stores)
  const P: Record<string, { sel: string[] | null; zip: string }> = { multi: { sel: ['MID', 'TWF'], zip: '' }, radius: { sel: null, zip: '83642' },
    zero: { sel: null, zip: '83814' }, invalid: { sel: ['MID', 'TWF'], zip: '99999' }, cleared: { sel: [], zip: '' } };
  const [selected, setSelected] = useState<string[] | null>(P[locMode]?.sel ?? storesFromUrl());
  const [zip, setZipState] = useState(P[locMode]?.zip ?? '');
  const setZip = (z: string) => { setZipState(z); rememberStepZip(z); };
  useEffect(() => { if (zip) rememberStepZip(zip); }, []);
  const [radius, setRadius] = useState(50);
  const [auto, setAuto] = useState<string[]>([]);
  const [open, setOpen] = useState(!!locMode);
  const pop = useRef<HTMLDivElement>(null);
  const storeCount = unitsAt(selected);
  const label = locLabel(selected, zip, radius, auto.length);
  const results = q.trim().length >= 1 ? searchLive(q, selected) : [];
  return (
    <CustomerShell store={label}>
      <div className="ssw st" id="s01-root" data-layer="canvas" data-bos-level="screen" data-bos-screen="s01">
      <div className="ssw-in ssw-wide" id="s01-in">
        <nav className="ssq-prog" id="s01-progress" data-spec-id="nav-progress" data-bos-level="section" data-bos-type="nav" aria-label={counterLabel('01', loadAnswers())}>
          <div className="ssq-track" id="s01-track"><span id="s01-track-fill" style={{ width: '0%' }} /></div>
          <span className="ssq-prog-t" id="s01-progress-label" data-spec-id="label-step-counter" hidden>{counterLabel('01', loadAnswers())}</span>
        </nav>
        <div className="st-grid" id="s01-grid">
          {/* LEFT: welcome + unit search */}
          <section className="tone-card st-card" id="s01-find" data-spec-id="sec-find-a-unit" data-bos-level="section" data-bos-type="card" aria-labelledby="s01-title">
            <div className="overline" id="s01-overline" data-spec-id="label-step">{c.overline}</div>
            <h1 className="t-title st-title" id="s01-title" data-spec-id="label-welcome">{c.welcome}</h1>
            <p className="st-question" id="s01-question" data-spec-id="label-question">{c.question}</p>
            <div className="st-search card" id="s01-search" data-spec-id="sec-unit-search" data-bos-level="section" data-bos-type="input" role="search">
              <label className="st-label" id="s01-search-label" htmlFor="s01-search-input">{c.searchLabel}</label>
              <div className={`st-input${q ? ' has-q' : ''}`} id="s01-search-box">
                <Icon name="search" size={20} />
                <input id="s01-search-input" data-spec-id="input-unit-search" data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act"
                  type="search" inputMode="search" autoComplete="off" enterKeyHint="search" placeholder={c.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)}
                  onFocus={(e) => focusIntoView(e.currentTarget)}
                  role="combobox" aria-expanded={results.length > 0} aria-controls="s01-results" aria-autocomplete="list" />
                {q && <button type="button" className="st-clear" id="s01-search-clear" data-spec-id="btn-action-clear-search" data-bos-class="action" aria-label="Clear search" onClick={() => setQ('')}><Icon name="x" size={18} /></button>}
              </div>
              <p className="st-hint" id="s01-search-hint" data-spec-id="info-search-hint">{c.searchHint}</p>
              {results.length > 0 && (
                <ul className="st-results" id="s01-results" role="listbox" aria-label="Matching units" data-spec-id="list-unit-suggestions">
                  {results.map((r) => (
                    <li key={r.stock} id={`s01-result-${r.stock}`} role="option" aria-selected={false}>
                      <button type="button" className="st-row" id={`s01-result-${r.stock}-btn`} data-spec-id={`btn-action-pick-unit#${r.stock}`} data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act">
                        <span className="st-row-t" id={`s01-result-${r.stock}-t`}><strong id={`s01-result-${r.stock}-name`}>{r.title}</strong><small id={`s01-result-${r.stock}-meta`}>{r.meta}</small></span>
                        <span className="st-row-a" id={`s01-result-${r.stock}-pick`}>{c.pick} <Icon name="chevron-right" size={16} /></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q.trim().length >= 1 && results.length === 0 && <p className="st-hint" id="s01-no-match" data-spec-id="info-no-match" role="status">{c.noMatch}</p>}
              {results.length > 0 && <p className="st-src" id="s01-results-src" data-spec-id="info-data-source">{c.resultsSource.replace('{id}', data.snapshotId)}</p>}
            </div>
          </section>

          {/* RIGHT: start now (the one gold CTA) + placeholder option */}
          <section className="tone-card st-card st-right" id="s01-start" data-spec-id="sec-start-now" data-bos-level="section" data-bos-type="card" aria-labelledby="s01-start-title">
            <div className="overline" id="s01-start-overline" data-spec-id="label-or">{c.rightOverline}</div>
            <h2 className="t-title t-title-2" id="s01-start-title" data-spec-id="label-start-title">{c.rightTitle}</h2>
            <MatchBox id="s01-match" base={ALL_UNITS} count={storeCount} where={selected ? (selected.length === 0 ? 'no stores' : selected.length === 1 ? names![0] : `${selected.length} stores`) : undefined} />
            {storeCount === 0 && <p className="st-nostore" id="s01-no-stores" role="status" data-spec-id="info-no-stores-selected"><Icon name="triangle-alert" size={16} /> <span id="s01-no-stores-t">No stores selected. Pick a store under the store link below to start.</span></p>}
            <div className="st-choices" id="s01-choices">
              <Button kind="commit" id="s01-start-now" data-spec-id="btn-commit-start-smart-shopper" perm="discovery.navigate" size="lg" block trailingIcon="arrow-right" disabled={storeCount === 0} aria-describedby={storeCount === 0 ? 's01-no-stores' : undefined} onClick={() => { navigate('?screen=02'); }}>{c.startNow}</Button>
              <button type="button" className="st-placeholder" id="s01-option-tbd" data-spec-id="btn-action-option-2-placeholder" data-bos-class="action" data-bos-access="disabled" aria-disabled="true" disabled>
                <span className="chip chip-neutral" id="s01-option-tbd-chip">{c.placeholderChip}</span>
                <span className="st-ph-t" id="s01-option-tbd-t">{c.placeholderText}</span>
              </button>
            </div>
          </section>
        </div>

        {/* Below both cards: trade-in (left) · All locations link (far right, under the right card) */}
        <div className="st-below" id="s01-below">
          <button type="button" className="ssq-trade" id="s01-trade-in" data-spec-id="btn-action-have-a-trade-in" data-bos-class="action" onClick={() => { saveAnswers({ camping: 'current' }); navigate('?screen=trade-now&ret=01'); }}>{c.tradeIn}</button>
          <div className="st-loc" id="s01-loc" ref={pop}>
            <button type="button" className="st-loc-link" id="s01-loc-link" data-spec-id="btn-action-choose-location" data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act"
              aria-haspopup="dialog" aria-expanded={open} aria-controls="lp" onClick={() => setOpen((o) => !o)}>
              <Icon name="map-pin" size={16} /><span id="s01-loc-link-t">{label}</span><Icon name="chevron-down" size={16} className={open ? 'st-flip' : undefined} />
            </button>
            <LocationPicker open={open} onClose={() => setOpen(false)} selected={selected} onChange={setSelected} zip={zip} setZip={setZip} radius={radius} setRadius={setRadius} auto={auto} setAuto={setAuto} />
          </div>
        </div>
      </div>
      </div>
    </CustomerShell>
  );
}

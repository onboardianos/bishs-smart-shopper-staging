import { useEffect, useState } from 'react';
import { Button } from '@v1/components/Button';
import { Icon } from '@v1/components/Icon';
import c from './landing-copy.json';
import data from './start-data.json';
import start from './start-copy.json';
import { LocationPicker, locLabel } from './LocationPicker';
import { storesFromUrl } from './inventory';
import { searchLive } from '../liveRank';
import trailer from './assets/landing-trailer.png';
import { SiteHeader } from './SiteHeader';
import { navigate, resetAnswers } from '../answers';
import { rememberStepZip } from '../save/stores';
import { focusIntoView } from './keyboard';

// Screen 00 · public landing (Zach's reference, 1:32 AM MST). Shown BEFORE Step 1, the customer AppShell and the Your case rail:
// no login, no side panel. Simple website top bar, hero, two equal choice cards, footer divider.
// Gold only on Shop Smart now (commit) and the card hover hairline. Container-driven (.ld is the container): stacked ≤719, side by side ≥720.
export function Landing({ query = '', locOpen = false }: { query?: string; locOpen?: boolean }) {
  const [q, setQ] = useState(query);
  const [selected, setSelected] = useState<string[] | null>(storesFromUrl());
  const [zip, setZipState] = useState('');
  const setZip = (z: string) => { setZipState(z); rememberStepZip(z); };
  const [radius, setRadius] = useState(50);
  const [auto, setAuto] = useState<string[]>([]);
  const [open, setOpen] = useState(locOpen);
  const results = q.trim().length >= 1 ? searchLive(q, selected) : [];
  const label = locLabel(selected, zip, radius, auto.length);
  const carry = selected ? `&stores=${selected.join(',')}` : '';
  useEffect(() => { document.title = "Smart Shopper · Bish's RV"; }, []);
  return (
    <>
    <SiteHeader prefix="s00" current="landing" />
    <div className="ssw ld" id="s00-root" data-layer="canvas" data-bos-level="screen" data-bos-screen="s00">
      <main className="ld-main" id="s00-main">
        <section className="ld-hero" id="s00-hero" data-spec-id="sec-hero" data-bos-level="section" data-bos-type="hero" aria-labelledby="s00-title">
          <h1 className="ld-title" id="s00-title" data-spec-id="label-hero-title">{c.title}</h1>
          <p className="ld-sub" id="s00-sub" data-spec-id="info-hero-subtitle">{c.sub}</p>
          <img className="ld-trailer" id="s00-trailer" data-spec-id="media-hero-trailer" src={trailer} alt={c.trailerAlt} width={597} height={298} />
        </section>

        <div className="ld-cards" id="s00-cards">
          <section className="ld-card" id="s00-help" data-spec-id="sec-help-me-choose" data-bos-level="section" data-bos-type="card" aria-labelledby="s00-help-title">
            <h2 className="ld-card-t" id="s00-help-title" data-spec-id="label-card-title">{c.helpTitle}</h2>
            <p className="ld-card-s" id="s00-help-sub" data-spec-id="info-card-subtitle">{c.helpSub}</p>
            <Button kind="commit" id="s00-shop-smart-now" data-spec-id="btn-commit-shop-smart-now" perm="discovery.navigate" size="lg" block trailingIcon="arrow-right" className="ld-cta"
              onClick={() => { resetAnswers(); navigate(`?screen=02${carry}`); }}>{c.helpCta}</Button>
          </section>

          <section className="ld-card" id="s00-have" data-spec-id="sec-have-one-in-mind" data-bos-level="section" data-bos-type="card" aria-labelledby="s00-have-title">
            <h2 className="ld-card-t" id="s00-have-title" data-spec-id="label-card-title">{c.haveTitle}</h2>
            <p className="ld-card-s" id="s00-have-sub" data-spec-id="info-card-subtitle">{c.haveSub}</p>
            <div className="ld-search" id="s00-search" role="search" data-spec-id="sec-unit-search" data-bos-level="section" data-bos-type="input">
              <label className="ld-input" id="s00-search-box">
                <Icon name="search" size={18} />
                <input id="s00-search-input" data-spec-id="input-unit-search" data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act"
                  type="search" inputMode="search" autoComplete="off" enterKeyHint="search" placeholder={c.havePlaceholder} aria-label={c.havePlaceholder} value={q} onChange={(e) => setQ(e.target.value)}
                  onFocus={(e) => focusIntoView(e.currentTarget)}
                  role="combobox" aria-expanded={results.length > 0} aria-controls="s00-results" aria-autocomplete="list" />
                {q && <button type="button" className="ld-clear" id="s00-search-clear" data-spec-id="btn-action-clear-search" data-bos-class="action" aria-label="Clear search" onClick={() => setQ('')}><Icon name="x" size={16} /></button>}
              </label>
              {results.length > 0 && (
                <div className="ld-pop" id="s00-results-pop">
                  <ul className="st-results ld-results" id="s00-results" role="listbox" aria-label="Matching units" data-spec-id="list-unit-suggestions">
                    {results.map((r) => (
                      <li key={r.stock} id={`s00-result-${r.stock}`} role="option" aria-selected={false}>
                        <button type="button" className="st-row" id={`s00-result-${r.stock}-btn`} data-stock={r.stock} data-spec-id={`btn-action-pick-unit#${r.stock}`} data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act"
                          onClick={() => { navigate(`?screen=loading&unit=${encodeURIComponent(r.stock)}${carry}`); }}>
                          <span className="st-row-t" id={`s00-result-${r.stock}-t`}><strong id={`s00-result-${r.stock}-name`}>{r.title}</strong><small id={`s00-result-${r.stock}-meta`}>{r.meta}</small></span>
                          <span className="st-row-a" id={`s00-result-${r.stock}-pick`}>{start.pick} <Icon name="chevron-right" size={16} /></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="st-src ld-src" id="s00-results-src" data-spec-id="info-data-source">{start.resultsSource.replace('{id}', data.snapshotId)}</p>
                </div>
              )}
              {q.trim().length >= 1 && results.length === 0 && <p className="ld-nomatch" id="s00-no-match" role="status" data-spec-id="info-no-match">No unit matches that yet. Keep typing, or try Shop Smart now.</p>}
            </div>
            <div className="ld-links" id="s00-links">
              <a className="ld-browse" id="s00-browse" data-spec-id="btn-action-browse-all-rvs" data-bos-class="action" href="https://www.bishs.com/inventory">{c.browse}</a>
              <div className="st-loc ld-loc" id="s00-loc">
                <button type="button" className="st-loc-link ld-loc-link" id="s00-loc-link" data-spec-id="btn-action-choose-location" data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act"
                  aria-haspopup="dialog" aria-expanded={open} aria-controls="lp" onClick={() => setOpen((o) => !o)}>
                  <Icon name="map-pin" size={18} /><span id="s00-loc-link-t">{label}</span><Icon name="chevron-down" size={16} className={open ? 'st-flip' : undefined} />
                </button>
                <LocationPicker open={open} onClose={() => setOpen(false)} selected={selected} onChange={setSelected} zip={zip} setZip={setZip} radius={radius} setRadius={setRadius} auto={auto} setAuto={setAuto} />
              </div>
            </div>
          </section>
        </div>

        <footer className="ld-foot" id="s00-foot" data-spec-id="label-tagline" aria-label={c.footer}><span id="s00-foot-t">{c.footer}</span></footer>
      </main>
    </div>
    </>
  );
}

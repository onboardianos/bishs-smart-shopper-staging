import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from './SiteHeader';
import { loadAnswers, go } from '../answers';
import { poolOf, E, SNAP, n } from '../session';

// Question-path loading screen (after Summary → Submit). Title "Getting your matches" (Zach's wording for this screen).
// Stages are the live bishsos.com/smart-shopper loading stages, filled from this shopper's answers. Ink progress only, no gold.
// Auto-advances to results after ~2.6 s; ?freeze=1 holds it for stills; reduced motion shortens the wait and drops the animation.
export function QLoading() {
  const a = useMemo(loadAnswers, []);
  const P = useMemo(() => poolOf(a), [a]);
  const np = P.session.prefs.length;
  const stages = [`Checking the ${n(P.pool.length)} campers that fit today`, np ? `Scoring your ${np} preference${np > 1 ? 's' : ''}` : 'Scoring how each one fits', 'Ranking your matches'];
  const frozen = new URLSearchParams(location.search).get('freeze') === '1';
  const [step, setStep] = useState(frozen ? 1 : 0);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    document.title = "Getting your matches · Smart Shopper · Bish's RV";
    if (frozen) return;
    const t = reduce ? 350 : 800;
    const ids = [1, 2, 3].map((k) => window.setTimeout(() => setStep(k), t * k));
    const done = window.setTimeout(() => go('results'), t * 3 + (reduce ? 150 : 300));
    return () => { ids.forEach(clearTimeout); clearTimeout(done); };
  }, [frozen, reduce]);
  const pct = Math.min(100, Math.round(((step + 1) / 3) * 100));
  return (
    <div className="load-page" id="sl-screen">
      <SiteHeader prefix="sq" />
      <div className="load-stage" id="sl-root" data-layer="canvas" data-bos-level="screen" data-bos-screen="loading-matches">
        <section className="sl-card" id="sl-card" data-spec-id="sec-loading-matches" data-bos-level="section" data-bos-type="card" aria-labelledby="sl-title" aria-live="polite">
          <p className="overline sl-over" id="sl-over" data-spec-id="label-loading-context">Smart Shopper</p>
          <h1 className="sl-title" id="sl-title" data-spec-id="label-loading-title">Getting your matches</h1>
          <p className="sl-name" id="sl-name" data-spec-id="label-loading-sub">Everything you told us, checked against today’s lot.</p>
          <div className="sl-track" id="sl-track" data-spec-id="metric-loading-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Getting your matches">
            <span className="load-fill sl-fill-hold" id="sl-fill" style={{ width: `${pct}%`, transition: reduce ? 'none' : 'width .6s ease' }} />
          </div>
          <ul className="sl-steps" id="sl-steps" data-spec-id="list-loading-steps">
            {stages.map((label, i) => (
              <li key={label} className={`sl-step${i < step ? ' is-done' : i === step ? ' is-on' : ''}`} id={`sl-step-${i}`}>
                <span className="sl-dot" id={`sl-step-${i}-dot`} aria-hidden="true">{i < step ? '✓' : ''}</span>
                <span className="sl-step-t" id={`sl-step-${i}-t`}>{label}</span>
              </li>
            ))}
          </ul>
          <p className="sl-src" id="sl-src" data-spec-id="info-data-source">Engine {E().SCORING_VERSION} · snapshot {SNAP().meta.inventorySnapshotId}</p>
        </section>
      </div>
    </div>
  );
}

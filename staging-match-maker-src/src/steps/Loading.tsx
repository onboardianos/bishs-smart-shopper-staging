import { useEffect, useState } from 'react';
import { SiteHeader } from './SiteHeader';
import { navigate } from '../answers';
import { findLiveUnit, snapshotMeta } from '../liveRank';
import { lengthFt, money, prettyClass, storeName, storesFromUrl, unitImg } from './inventory';

// Known-unit loading screen. Shown after a landing search suggestion is picked.
// The header sits outside this stage (sticky, full width). The card is centered in the space under it.
// Lookup uses the same snapshot and the same stock number the dropdown put in ?unit=.
const STEPS = ['Looking up this unit', 'Finding similar campers', 'Lining up your matches'];
const DURATION = 2600;

export function Loading() {
  const stock = new URLSearchParams(location.search).get('unit') || '';
  const unit = findLiveUnit(stock);
  const stores = storesFromUrl();
  const frozen = new URLSearchParams(location.search).get('freeze') === '1';
  const [step, setStep] = useState(frozen ? 1 : 0);
  const [reduce, setReduce] = useState(false);
  const storeQ = stores ? `&stores=${stores.join(',')}` : '';

  useEffect(() => {
    document.title = "Getting matches to this unit · Smart Shopper · Bish's RV";
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    if (frozen) return;
    const found = findLiveUnit(stock);
    const t1 = window.setTimeout(() => setStep(1), 800);
    const t2 = window.setTimeout(() => setStep(2), 1700);
    const next = found
      ? `?screen=matches&unit=${encodeURIComponent(found.stock)}${storeQ}`
      : `?screen=00&q=${encodeURIComponent(stock)}`;
    const t3 = window.setTimeout(() => { navigate(next); }, DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [frozen, storeQ, stock]);

  const meta = unit
    ? [prettyClass(unit.className), money(unit.price), lengthFt(unit) != null ? `${lengthFt(unit)} ft` : null, unit.sleeps != null ? `Sleeps ${unit.sleeps}` : null, storeName(unit.location), `stock ${unit.stock}`].filter(Boolean).join(' · ')
    : 'We could not find that stock number in this preview catalog.';
  const fill = frozen || reduce ? 72 : undefined;
  const snap = snapshotMeta();

  return (
    <div className="load-page" id="sl-screen">
      <SiteHeader prefix="sl" />
      <div className="load-stage" id="sl-root" data-layer="canvas" data-bos-level="screen" data-bos-screen="loading">
        <section className="sl-card" id="sl-card" data-spec-id="sec-loading-matches" data-bos-level="section" data-bos-type="card" aria-labelledby="sl-title" aria-live="polite">
          {unit && (
            <div className="sl-media" id="sl-media" data-spec-id="media-loading-unit">
              <img className="sl-img" id="sl-img" src={unitImg(unit)} alt="" width={480} height={240} />
            </div>
          )}
          <p className="overline sl-over" id="sl-over" data-spec-id="label-loading-context">Smart Shopper</p>
          <h1 className="sl-title" id="sl-title" data-spec-id="label-loading-title">Getting matches to this unit</h1>
          <p className="sl-name" id="sl-name" data-spec-id="label-loading-unit">{unit ? `${unit.year} ${unit.manufacturer} ${unit.make} ${unit.model}` : 'Unit not in this catalog'}</p>
          <p className="sl-meta" id="sl-meta" data-spec-id="info-loading-unit-meta">{meta}</p>
          <div className="sl-track" id="sl-track" data-spec-id="metric-loading-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={frozen || reduce ? 72 : Math.round(((step + 1) / STEPS.length) * 100)} aria-label="Finding matches">
            <span className={`load-fill${frozen || reduce ? ' sl-fill-hold' : ''}`} id="sl-fill" style={fill != null ? { width: `${fill}%` } : undefined} />
          </div>
          <ul className="sl-steps" id="sl-steps" data-spec-id="list-loading-steps">
            {STEPS.map((label, i) => (
              <li key={label} className={`sl-step${i < step ? ' is-done' : i === step ? ' is-on' : ''}`} id={`sl-step-${i}`}>
                <span className="sl-dot" id={`sl-step-${i}-dot`} aria-hidden="true">{i < step ? '✓' : ''}</span>
                <span className="sl-step-t" id={`sl-step-${i}-t`}>{label}</span>
              </li>
            ))}
          </ul>
          <p className="sl-src" id="sl-src" data-spec-id="info-data-source">Live inventory snapshot {snap.inventorySnapshotId}</p>
        </section>
      </div>
    </div>
  );
}

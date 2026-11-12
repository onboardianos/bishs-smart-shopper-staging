import { useEffect, useState } from 'react';
import { Icon } from '@v1/components/Icon';
import { SiteBar } from './SiteBar';
import {
  lengthFt, matchesFor, money, storeName, storesFromUrl, storesQuery,
  unitFromUrl, prettyClass, unitImg, unitTitle, UNIT_SNAPSHOT, type Match,
} from './inventory';

// Matches results ("MCP screen") in TILE VIEW. The unit picked on the landing is pinned top-left
// with a "Your pick" badge and a 2px ink border (DS selected rule — not gold). Similar units
// follow, scored on type / length / price / sleeps and limited to the store filter.
export function Matches() {
  const pick = unitFromUrl();
  const stores = storesFromUrl();
  const wantList = new URLSearchParams(location.search).get('view') === 'list';
  const [view, setView] = useState<'tile' | 'list'>(wantList ? 'list' : 'tile');
  const rows: Match[] = pick ? matchesFor(pick.stock, stores) : [];
  const carry = (pick ? `&unit=${pick.stock}` : '') + storesQuery(stores);
  const where = stores ? (stores.length === 1 ? storeName(stores[0]) : `${stores.length} stores`) : 'All locations';

  useEffect(() => { document.title = "Your matches · Smart Shopper · Bish's RV"; }, []);

  const go = (v: 'tile' | 'list') => {
    setView(v);
    const q = new URLSearchParams(location.search);
    if (v === 'tile') q.delete('view'); else q.set('view', 'list');
    history.replaceState(null, '', `${location.pathname}?${q.toString()}`);
  };

  return (
    <div className="ssw ld sm" id="sm-root" data-layer="canvas" data-bos-level="screen" data-bos-screen="matches">
      <SiteBar prefix="sm" />
      <main className="ld-main sm-main" id="sm-main">
        <header className="sm-head" id="sm-head" data-spec-id="sec-matches-head" data-bos-level="section" data-bos-type="header">
          <p className="overline sm-over" id="sm-over" data-spec-id="label-matches-context">Smart Shopper · Matches</p>
          <div className="sm-title-row" id="sm-title-row">
            <h1 className="sm-title" id="sm-title" data-spec-id="label-matches-title">Your matches</h1>
            <p className="sm-count" id="sm-count" data-spec-id="metric-matches-count">
              <strong id="sm-count-n">{rows.length.toLocaleString('en-US')}</strong>
              <span id="sm-count-t"> {rows.length === 1 ? 'camper' : 'campers'}{pick ? ', including your pick' : ''}</span>
            </p>
          </div>
          <p className="sm-sub" id="sm-sub" data-spec-id="info-matches-subtitle">
            {pick ? `Similar campers to ${unitTitle(pick)}, matched by type, length, price and who it sleeps.` : 'Pick a unit from search to see matches here.'}
          </p>
        </header>

        <div className="sm-toolbar" id="sm-toolbar" data-spec-id="sec-matches-toolbar" data-bos-level="section" data-bos-type="toolbar">
          <a className="sm-back" id="sm-back" href="?screen=00" data-spec-id="btn-action-back-to-search" data-bos-class="action">← Back to search</a>
          <span className="sm-where" id="sm-where" data-spec-id="info-matches-location"><Icon name="map-pin" size={16} /><span id="sm-where-t">{where}</span></span>
          <div className="sm-views" id="sm-views" role="radiogroup" aria-label="View" data-spec-id="input-matches-view">
            <button type="button" className={`sm-view${view === 'list' ? ' is-on' : ''}`} id="sm-view-list" data-spec-id="input-choice-view-list" data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act" role="radio" aria-checked={view === 'list'} aria-label="List view" title="List view" onClick={() => go('list')}>
              <ViewGlyph kind="list" />
            </button>
            <button type="button" className={`sm-view${view === 'tile' ? ' is-on' : ''}`} id="sm-view-tile" data-spec-id="input-choice-view-tile" data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act" role="radio" aria-checked={view === 'tile'} aria-label="Tile view" title="Tile view" onClick={() => go('tile')}>
              <ViewGlyph kind="tile" />
            </button>
          </div>
        </div>

        {rows.length === 0 && (
          <p className="sm-empty" id="sm-empty" role="status" data-spec-id="info-no-matches">No matches to show for that unit in this preview catalog.</p>
        )}

        {view === 'tile' && rows.length > 0 && (
          <ul className="sm-grid" id="sm-grid" data-spec-id="list-matches-tiles" data-bos-level="section" data-bos-type="list">
            {rows.map((m) => <Tile key={m.unit.stock} m={m} />)}
          </ul>
        )}

        {view === 'list' && rows.length > 0 && (
          <ul className="sm-list" id="sm-list" data-spec-id="list-matches-rows" data-bos-level="section" data-bos-type="list">
            {rows.map((m) => <Row key={m.unit.stock} m={m} />)}
          </ul>
        )}

        <p className="sm-src" id="sm-src" data-spec-id="info-data-source">Live inventory snapshot {UNIT_SNAPSHOT}{carry.includes('stores') ? ` · ${where}` : ''}</p>
      </main>
    </div>
  );
}

function specs(m: Match) {
  const u = m.unit;
  return [money(u.price), lengthFt(u) != null ? `${lengthFt(u)} ft` : null, u.sleeps != null ? `Sleeps ${u.sleeps}` : null, storeName(u.location)].filter(Boolean) as string[];
}

function Tile({ m }: { m: Match }) {
  const u = m.unit;
  const id = `sm-tile-${u.stock}`;
  const picked = !!m.picked;
  return (
    <li className={`sm-tile${picked ? ' is-pick' : ''}`} id={`${id}-wrap`} data-spec-id={`card-match#${u.stock}`} data-bos-type="card">
      <article className="sm-tile-in" id={id} aria-labelledby={`${id}-name`}>
        <div className="sm-tile-media" id={`${id}-media`} data-spec-id={`media-match#${u.stock}`}>
          <img className="sm-tile-img" id={`${id}-img`} src={unitImg(u)} alt="" width={320} height={160} />
          {picked && <span className="sm-badge" id={`${id}-badge`} data-spec-id={`badge-your-pick#${u.stock}`}>Your pick</span>}
          {picked && <span className="sm-check" id={`${id}-check`} aria-hidden="true"><Icon name="check" size={14} stroke={3} /></span>}
          {u.isLStock && !picked && <span className="sm-badge sm-badge-alt" id={`${id}-badge`} data-spec-id={`badge-floorplan#${u.stock}`}>Floor plan</span>}
        </div>
        <div className="sm-tile-body" id={`${id}-body`}>
          <h2 className="sm-tile-name" id={`${id}-name`} data-spec-id={`label-match-title#${u.stock}`}>{unitTitle(u)}</h2>
          <p className="sm-tile-kicker" id={`${id}-kicker`} data-spec-id={`info-match-kicker#${u.stock}`}>{prettyClass(u.className)} · stock {u.stock}</p>
          <p className="sm-tile-specs" id={`${id}-specs`}>
            {specs(m).map((s, i) => <span key={s} className="sm-spec" id={`${id}-spec-${i}`}>{s}</span>)}
          </p>
          <p className="sm-why" id={`${id}-why`} data-spec-id={`info-why-it-matches#${u.stock}`}>{m.reasons.join(' · ')}</p>
        </div>
      </article>
    </li>
  );
}

function Row({ m }: { m: Match }) {
  const u = m.unit;
  const id = `sm-row-${u.stock}`;
  const picked = !!m.picked;
  return (
    <li className={`sm-row${picked ? ' is-pick' : ''}`} id={`${id}-wrap`} data-spec-id={`card-match-row#${u.stock}`} data-bos-type="card">
      <div className="sm-row-media" id={`${id}-media`} data-spec-id={`media-match#${u.stock}`}>
        <img className="sm-row-img" id={`${id}-img`} src={unitImg(u)} alt="" width={120} height={60} />
      </div>
      <div className="sm-row-body" id={`${id}-body`}>
        <div className="sm-row-top" id={`${id}-top`}>
          {picked && <span className="sm-badge" id={`${id}-badge`} data-spec-id={`badge-your-pick#${u.stock}`}>Your pick</span>}
          <h2 className="sm-row-name" id={`${id}-name`} data-spec-id={`label-match-title#${u.stock}`}>{unitTitle(u)}</h2>
        </div>
        <p className="sm-row-meta" id={`${id}-meta`} data-spec-id={`info-match-meta#${u.stock}`}>{prettyClass(u.className)} · {specs(m).join(' · ')} · stock {u.stock}</p>
        <p className="sm-why" id={`${id}-why`} data-spec-id={`info-why-it-matches#${u.stock}`}>{m.reasons.join(' · ')}</p>
      </div>
    </li>
  );
}

// Lucide list / layout-grid paths (not in the v1 Icon set). Inline so we do not edit bishs-os-v1.
function ViewGlyph({ kind }: { kind: 'list' | 'tile' }) {
  return (
    <svg id={`sm-view-${kind}-icon`} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'list'
        ? <><path id="sm-view-list-p1" d="M8 6h13" /><path id="sm-view-list-p2" d="M8 12h13" /><path id="sm-view-list-p3" d="M8 18h13" /><path id="sm-view-list-p4" d="M3 6h.01" /><path id="sm-view-list-p5" d="M3 12h.01" /><path id="sm-view-list-p6" d="M3 18h.01" /></>
        : <><rect id="sm-view-tile-r1" x="3" y="3" width="7" height="7" rx="1" /><rect id="sm-view-tile-r2" x="14" y="3" width="7" height="7" rx="1" /><rect id="sm-view-tile-r3" x="14" y="14" width="7" height="7" rx="1" /><rect id="sm-view-tile-r4" x="3" y="14" width="7" height="7" rx="1" /></>}
    </svg>
  );
}

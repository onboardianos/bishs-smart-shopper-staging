import { useEffect, useLayoutEffect, useRef, useState, type DragEvent } from 'react';
import { UnitPhoto } from '../unitPhotos';
import { GridGlyph, Grip, I, ListGlyph, Svg } from './icons';
import { BUDGET, countNoun, lengthFt, money, storeCity, titleCase, unitImg, unitTitle, type Match } from './inventory';
import { QuickView } from './QuickView';

// Grid view = one-row ranked carousel. List view = one ranked table. All inventory is a single score-ranked list —
// no pinned top-three tray and no empty placeholder slots on this view (t483u).

export type View = 'grid' | 'list';
type DragFns = { onDragStart: (stock: string, e: DragEvent) => void; onDragOver: (i: number | null) => void; onDrop: (i: number, e: DragEvent) => void };
type Common = { pins: string[]; saved: string[]; onPin: (s: string) => void; onSave: (s: string) => void; drag: DragFns };

export function InvTools({ view, onView, search, onSearch, location, onLocation, stores, mine = 0 }: {
  view: View; onView: (v: View) => void; search: string; onSearch: (q: string) => void; location: string; onLocation: (code: string) => void;
  stores: { code: string; name: string; units: number }[]; mine?: number;
}) {
  // Live desk.js location select: All locations, then each named store with units. MINE ('@mine') = the stores picked before the questions.
  const face = location === '@mine' ? `Your ${mine} stores` : location ? (stores.find((s) => s.code === location)?.name || 'Store') : 'All stores';
  return (
    <div className="inv-tools" id="mm-inv-tools">
      <label className="search" id="mm-search-wrap">
        <Svg id="mm-search-i" d={I.search} size={16} />
        <input id="mm-search" placeholder="Search" aria-label="Search inventory" data-spec-id="input-search-inventory" data-bos-class="input" value={search} onChange={(e) => onSearch(e.target.value)} />
      </label>
      <div className="views" id="mm-views" role="radiogroup" aria-label="View">
        <button type="button" role="radio" aria-checked={view === 'grid'} className={`view-b${view === 'grid' ? ' is-on' : ''}`} id="mm-view-grid" data-spec-id="input-choice-view-grid" data-bos-class="input" aria-label="Grid view" title="Grid view" onClick={() => onView('grid')}><GridGlyph id="mm-view-grid-i" /></button>
        <button type="button" role="radio" aria-checked={view === 'list'} className={`view-b${view === 'list' ? ' is-on' : ''}`} id="mm-view-list" data-spec-id="input-choice-view-list" data-bos-class="input" aria-label="List view" title="List view" onClick={() => onView('list')}><ListGlyph id="mm-view-list-i" /></button>
      </div>
      <div className="sel sel-sm" id="mm-loc-wrap">
        <Svg id="mm-loc-pin" d={I.mapPin} size={16} className="sel-lead" />
        <span className="loc-face" id="mm-loc-face"><Svg id="mm-loc-face-pin" d={I.mapPin} size={14} /><span>{face}</span></span>
        <select className="sel-in" id="mm-loc" data-spec-id="input-location" data-bos-class="input" value={location} aria-label="Location" onChange={(e) => onLocation(e.target.value)}>
          <option id="mm-loc-all" value="">All locations</option>
          {mine > 1 && <option id="mm-loc-mine" value="@mine">Your {mine} stores</option>}
          {stores.map((s) => <option key={s.code} id={`mm-loc-${s.code}`} value={s.code}>{s.name}</option>)}
        </select>
        <Svg id="mm-loc-caret" d={I.chevronDown} size={16} className="sel-caret" />
      </div>
    </div>
  );
}

/* ───────── Grid view: carousel ───────── */

export function Carousel({ others, total, onList, ...c }: Common & { others: Match[]; total: number; onList: () => void }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const sync = () => {
    const el = ref.current; if (!el) return;
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const x = Number(new URLSearchParams(location.search).get('cx') || 0);
    if (x) el.scrollLeft = x;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    return () => { el.removeEventListener('scroll', sync); removeEventListener('resize', sync); };
  }, []);
  const page = (dir: 1 | -1) => {
    const el = ref.current; if (!el) return;
    const t = el.querySelector('li'); const w = t ? t.getBoundingClientRect().width + 16 : 220;
    el.scrollBy({ left: dir * w * Math.max(1, Math.floor((el.clientWidth - 40) / w) - 1), behavior: 'smooth' });
  };
  const left = Math.max(0, total - others.length);
  return (
    <section className="car" id="mm-inv" data-spec-id="sec-all-inventory" data-bos-level="section" data-bos-type="carousel" aria-roledescription="carousel" aria-label="All inventory">
      <div className="car-h" id="mm-car-h">
        <div className="car-h-l" id="mm-car-h-l">
          <h2 className="inv-t" id="mm-inv-t" data-spec-id="label-all-inventory">All inventory</h2>
          <span className="inv-s" id="mm-inv-s" data-spec-id="info-illustrative">{countNoun(total, 'match', 'matches')} · unit photos where available</span>
        </div>
        <div className="car-arrows" id="mm-car-arrows">
          <button type="button" className="arrow-b" id="mm-car-prev" data-spec-id="btn-action-carousel-prev" data-bos-class="action" aria-label="Previous RVs" aria-controls="mm-grid" disabled={edge.start} onClick={() => page(-1)}><Svg id="mm-car-prev-i" d={I.chevronLeft} size={20} stroke={2} /></button>
          <button type="button" className="arrow-b" id="mm-car-next" data-spec-id="btn-action-carousel-next" data-bos-class="action" aria-label="Next RVs" aria-controls="mm-grid" disabled={edge.end} onClick={() => page(1)}><Svg id="mm-car-next-i" d={I.chevronRight} size={20} stroke={2} /></button>
        </div>
      </div>
      <ul className="car-track" id="mm-grid" ref={ref} data-spec-id="list-inventory-carousel" tabIndex={0} aria-label="Inventory, scroll sideways">
        {others.map((m) => <CarTile key={m.unit.stock} m={m} {...c} />)}
        <li className="car-end" id="mm-car-end" data-spec-id="card-carousel-end">
          {left > 0 && <p className="car-end-n" id="mm-car-end-n">{countNoun(left, 'more match', 'more matches')}</p>}
          <p className="car-end-t" id="mm-car-end-t">See every match in a sortable table.</p>
          <button type="button" className="btn-line" id="mm-car-end-b" data-spec-id="btn-action-open-list-view" data-bos-class="action" onClick={onList}>Open list view</button>
        </li>
      </ul>
    </section>
  );
}

function CarTile({ m, pins, saved, onPin, onSave, drag }: Common & { m: Match }) {
  const u = m.unit;
  const id = `mm-tile-${u.stock}`;
  const slot = pins.indexOf(u.stock);
  const full = pins.every(Boolean);
  const isSaved = saved.includes(u.stock);
  return (
    <li className={`tile car-tile${m.picked ? ' is-pick' : ''}`} id={`${id}-wrap`} data-spec-id={`card-inventory#${u.stock}`} data-bos-type="card" draggable onDragStart={(e) => drag.onDragStart(u.stock, e)}>
      <article className="card" id={id} aria-labelledby={`${id}-name`}>
        <div className="ph-media" id={`${id}-media`} data-spec-id={`media-inventory#${u.stock}`}>
          <UnitPhoto className="ph-img" id={`${id}-img`} stock={u.stock} art={unitImg(u)} title={unitTitle(u)} draggable={false} />
          {m.picked
            ? <span className="badge-pick" id={`${id}-pick`} data-spec-id={`badge-your-pick#${u.stock}`}>Your pick</span>
            : (u.isLStock ? <span className="badge-fp" id={`${id}-fp`} data-spec-id={`badge-floorplan-example#${u.stock}`}>Floor plan</span> : null)}
          <span className="score score-on-photo" id={`${id}-score`} data-spec-id={`info-score#${u.stock}`} aria-label={`Match score ${m.score}`}>{m.score}</span>
        </div>
        {slot >= 0
          ? <span className="pin-on" id={`${id}-pinned`} data-spec-id={`info-pinned#${u.stock}`}>#{slot + 1}</span>
          : <button type="button" className="pin-b" id={`${id}-pin`} data-spec-id={`btn-action-pin#${u.stock}`} data-bos-class="action" disabled={full} aria-label={full ? 'Top three is full' : 'Pin to your top three'} title={full ? 'Top three is full' : 'Pin to your top three'} onClick={() => onPin(u.stock)}><Svg id={`${id}-pin-i`} d={I.pin} size={16} /></button>}
        <div className="card-b" id={`${id}-body`}>
          <a className="c-name c-name-a" id={`${id}-name`} href={`#unit-${u.stock}`} data-spec-id={`btn-action-view-details#${u.stock}`} data-bos-class="action">{unitTitle(u)}</a>
          <div className="c-prow" id={`${id}-prow`}>
            <p className="c-price" id={`${id}-price`}>{m.priceText}</p>
            <button type="button" className={`save-b${isSaved ? ' is-on' : ''}`} id={`${id}-save`} aria-pressed={isSaved} data-spec-id={`btn-action-save#${u.stock}`} data-bos-class="action" onClick={() => onSave(u.stock)}>{isSaved ? 'Saved' : 'Save'}</button>
          </div>
          <p className="c-meta c-meta-line" id={`${id}-meta`}>{storeCity(u.location)} · Sleeps {u.sleeps ?? '—'}</p>
          <p className="c-meta c-meta-line c-meta-phone" id={`${id}-meta-phone`}>Sleeps {u.sleeps ?? '—'} · {lengthFt(u)} ft · {storeCity(u.location)}</p>
        </div>
      </article>
    </li>
  );
}

/* ───────── List view: table ───────── */

function diffOf(m: Match) {
  if (m.unit.price == null) return { t: '', cls: '' };
  const d = BUDGET - m.unit.price;
  return { t: `${d >= 0 ? '−' : '+'}${money(Math.abs(d))}`, cls: d >= 0 ? 'is-under' : 'is-over' };
}

function Cols({ p }: { p: string }) {
  return (
    <colgroup id={`${p}-cols`}>
      {['thumb', 'score', 'unit', 'stock', 'dsrp', 'price', 'act'].map((k) => <col key={k} className={`c-th-${k}`} id={`${p}-col-${k}`} />)}
    </colgroup>
  );
}

function shortName(m: Match) { return `${titleCase(m.unit.make)} ${m.unit.model}`; }

export function InvTable({ others, total, ...c }: Common & { others: Match[]; total: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | undefined>(undefined);
  const [why, setWhy] = useState<string | null>(null);
  const [qv, setQv] = useState<string | null>(() => new URLSearchParams(location.search).get('qv'));
  useLayoutEffect(() => {
    const fit = () => {
      const el = wrap.current; if (!el) return;
      const top = el.getBoundingClientRect().top + scrollY;
      const room = innerHeight - top - 14;
      setH(innerWidth <= 700 ? Math.max(room, Math.round(innerHeight * 0.72)) : room >= 340 ? room : Math.round(innerHeight * 0.72));
    };
    fit();
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, []);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const y = Number(new URLSearchParams(location.search).get('ty') || 0);
    if (y) el.scrollTop = y;
  }, [h]);
  const qvMatch = qv ? others.find((m) => m.unit.stock === qv) || null : null;
  const left = Math.max(0, total - others.length);
  const [phone, setPhone] = useState(() => typeof matchMedia === 'function' && matchMedia('(max-width: 719px)').matches);
  useEffect(() => {
    const mq = matchMedia('(max-width: 719px)');
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  const moreLabel = `Show ${Math.min(24, left).toLocaleString('en-US')} more · ${left.toLocaleString('en-US')} left`;
  return (
    <section className={`tblsec${phone ? ' is-phone' : ''}`} id="mm-inv" data-spec-id="sec-inventory-table" data-bos-level="section" data-bos-type="table">
      {phone ? (
        <ul className="phone-rows" id="mm-phone-rows">
          {others.map((m) => <CarTile key={m.unit.stock} m={m} {...c} />)}
          {left > 0 && <li className="phone-more" id="mm-phone-more"><button type="button" className="btn-line" id="mm-more-btn" data-spec-id="btn-action-show-more" data-bos-class="action">{moreLabel}</button></li>}
        </ul>
      ) : (
      <div className="tbl-wrap" id="mm-tbl-wrap" ref={wrap} style={{ height: h }} tabIndex={0} aria-label="Inventory table">
        <table className="tbl" id="mm-tbl" data-spec-id="table-inventory">
          <Cols p="mm-tbl" />
          <thead id="mm-tbl-head">
            <tr id="mm-tbl-hr">
              <th className="c-th-thumb" id="mm-th-thumb" scope="col">Thumbnail</th>
              <th className="c-th-score" id="mm-th-score" scope="col">Score <Svg id="mm-th-score-i" d={I.chevronDown} size={14} /></th>
              <th className="c-th-unit" id="mm-th-unit" scope="col">Year / Manufacturer / Brand / Model</th>
              <th className="c-th-stock" id="mm-th-stock" scope="col">Stock #</th>
              <th className="c-th-dsrp" id="mm-th-dsrp" scope="col">DSRP</th>
              <th className="c-th-price" id="mm-th-price" scope="col">Price / Difference</th>
              <th className="c-th-act" id="mm-th-act" scope="col"><span className="sr" id="mm-th-act-t">Actions</span></th>
            </tr>
          </thead>
          <tbody id="mm-tbl-body" data-spec-id="list-inventory-rows">
            {others.map((m) => <TRow key={m.unit.stock} m={m} why={why} onWhy={setWhy} onOpen={setQv} {...c} />)}
            {left > 0 && (
              <tr className="tr-more" id="mm-tbl-more-r">
                <td colSpan={7} id="mm-tbl-more-td"><button type="button" className="btn-line" id="mm-more-btn" data-spec-id="btn-action-show-more" data-bos-class="action">{moreLabel}</button></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
      {qvMatch && (
        <QuickView m={qvMatch} slot={-1} list={others} pins={c.pins} saved={c.saved} onClose={() => setQv(null)} onNav={setQv}
          onPin={c.onPin} onSave={c.onSave} onUnpin={() => {}} />
      )}
    </section>
  );
}

function TRow({ m, pins, saved, onPin, onSave, drag, why, onWhy, onOpen }: Common & { m: Match; why: string | null; onWhy: (s: string | null) => void; onOpen: (s: string) => void }) {
  const u = m.unit;
  const id = `mm-tr-${u.stock}`;
  const isSaved = saved.includes(u.stock);
  const full = pins.every(Boolean);
  const d = diffOf(m);
  const open = why === id;
  return (
    <tr className={`tr${m.picked ? ' is-pick' : ''}`} id={id} data-spec-id={`row-inventory#${u.stock}`}
      draggable onDragStart={(e) => drag.onDragStart(u.stock, e)}>
      <td className="td-thumb" id={`${id}-thumb`}>
        <span className="td-thumb-in" id={`${id}-thumb-in`}>
          <span className="tgrip" id={`${id}-grip`} aria-hidden="true"><Grip id={`${id}-grip-i`} size={16} /></span>
          <span className="tthumb" id={`${id}-tthumb`}><UnitPhoto id={`${id}-img`} stock={u.stock} art={unitImg(u)} title={unitTitle(u)} size="190x140" draggable={false} /></span>
        </span>
      </td>
      <td className="td-score" id={`${id}-score`}><span className="score" id={`${id}-score-v`} data-spec-id={`info-score#${u.stock}`}>{m.score}</span></td>
      <td className="td-unit" id={`${id}-unit`}>
        <button type="button" className="t-name" id={`${id}-name`} data-spec-id={`btn-action-open-quick-view-row#${u.stock}`} data-bos-class="action" aria-haspopup="dialog" onClick={() => onOpen(u.stock)}>{unitTitle(u)}</button>
        <span className="t-sub" id={`${id}-sub`}>
          {m.picked && <span className="t-pick" id={`${id}-pick`}>Your pick</span>}
          {u.isLStock && <span className="badge-fp" id={`${id}-fp`} data-spec-id={`badge-floorplan-example-row#${u.stock}`}>Floor plan</span>}
          <button type="button" className="why-l" id={`${id}-why`} aria-expanded={open} data-spec-id={`btn-action-why-it-ranks#${u.stock}`} data-bos-class="action" onClick={() => onWhy(open ? null : id)}>
            <Svg id={`${id}-why-i`} d={I.info} size={14} /> Why it ranks
          </button>
          <span className="t-stock-m" id={`${id}-stock-m`}>#{u.stock} · {storeCity(u.location)}</span>
        </span>
        {open && (
          <span className="why-pop" id={`${id}-why-pop`} role="note" data-spec-id={`info-why-it-ranks#${u.stock}`}>
            {m.reasons.map((r, k) => <span key={r} className={`why-chip${r.includes('not verified') || r.startsWith('Price over') ? ' is-bad' : r.startsWith('Price within') ? ' is-ok' : ''}`} id={`${id}-why-${k}`}>{r}</span>)}
          </span>
        )}
      </td>
      <td className="td-stock" id={`${id}-stock`}>#{u.stock}</td>
      <td className="td-dsrp" id={`${id}-dsrp`}>{money(u.price)}</td>
      <td className="td-price" id={`${id}-price`}><button type="button" className="t-price-b" id={`${id}-price-b`} data-spec-id={`btn-action-open-quick-view-price#${u.stock}`} data-bos-class="action" aria-haspopup="dialog" aria-label={`${m.priceText}, open quick view`} onClick={() => onOpen(u.stock)}><b id={`${id}-price-v`}>{m.priceText}</b></button> <span className={`t-diff ${d.cls}`} id={`${id}-diff`}>{d.t}</span></td>
      <td className="td-act" id={`${id}-act`}>
        <span className="t-acts" id={`${id}-acts`}>
          <button type="button" className="t-btn t-pin" id={`${id}-pin`} data-spec-id={`btn-action-pin-row#${u.stock}`} data-bos-class="action" disabled={full} aria-label={full ? 'Top three is full' : 'Pin to your top three'} title={full ? 'Top three is full' : 'Pin to your top three'} onClick={() => onPin(u.stock)}><Svg id={`${id}-pin-i`} d={I.pin} size={16} /><span className="t-btn-t" id={`${id}-pin-t`}>Pin</span></button>
          <button type="button" className={`t-btn t-save${isSaved ? ' is-on' : ''}`} id={`${id}-save`} aria-pressed={isSaved} data-spec-id={`btn-action-save-row#${u.stock}`} data-bos-class="action" aria-label={isSaved ? 'Saved' : 'Save'} title={isSaved ? 'Saved' : 'Save'} onClick={() => onSave(u.stock)}><Svg id={`${id}-save-i`} d={I.bookmark} size={16} /></button>
        </span>
      </td>
    </tr>
  );
}

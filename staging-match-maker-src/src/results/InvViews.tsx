import { useEffect, useLayoutEffect, useRef, useState, type DragEvent } from 'react';
import { GridGlyph, Grip, I, ListGlyph, Svg } from './icons';
import { BUDGET, lengthFt, money, storeCity, unitImg, unitTitle, type Match } from './inventory';
import { QuickView } from './QuickView';

// DESIGN PREVIEW ONLY (t149u). Grid view = one-row carousel that bleeds off the right edge; List view = inventory table
// with the top three pinned as sticky first rows (like the live Match Maker list, restyled to the surface rules).

export type View = 'grid' | 'list';
type DragFns = { onDragStart: (stock: string, e: DragEvent) => void; onDragOver: (i: number | null) => void; onDrop: (i: number, e: DragEvent) => void };
type Common = { pins: string[]; saved: string[]; onPin: (s: string) => void; onSave: (s: string) => void; drag: DragFns };

export function InvTools({ view, onView, search, onSearch, location, onLocation, stores, total }: {
  view: View; onView: (v: View) => void; search: string; onSearch: (q: string) => void; location: string; onLocation: (code: string) => void;
  stores: { code: string; name: string; units: number }[]; total: number;
}) {
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
        <span className="loc-face" id="mm-loc-face"><Svg id="mm-loc-face-pin" d={I.mapPin} size={14} /><span>{location ? (stores.find((s) => s.code === location)?.name || 'Store') : 'All stores'}</span></span>
        <select className="sel-in" id="mm-loc" data-spec-id="input-location" data-bos-class="input" value={location} aria-label="Location" onChange={(e) => onLocation(e.target.value)}>
          <option id="mm-loc-all" value="">All locations ({total.toLocaleString('en-US')})</option>
          {stores.map((s) => <option key={s.code} id={`mm-loc-${s.code}`} value={s.code}>{s.name} ({s.units.toLocaleString('en-US')})</option>)}
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
  const left = total - others.length;
  return (
    <section className="car" id="mm-inv" data-spec-id="sec-all-other-inventory" data-bos-level="section" data-bos-type="carousel" aria-roledescription="carousel" aria-label="All other inventory">
      <div className="car-h" id="mm-car-h">
        <div className="car-h-l" id="mm-car-h-l">
          <h2 className="inv-t" id="mm-inv-t" data-spec-id="label-all-other-inventory">All other inventory</h2>
          <span className="inv-s" id="mm-inv-s" data-spec-id="info-illustrative">{total.toLocaleString('en-US')} matches · class art, not unit photos</span>
        </div>
        <div className="car-arrows" id="mm-car-arrows">
          <button type="button" className="arrow-b" id="mm-car-prev" data-spec-id="btn-action-carousel-prev" data-bos-class="action" aria-label="Previous RVs" aria-controls="mm-grid" disabled={edge.start} onClick={() => page(-1)}><Svg id="mm-car-prev-i" d={I.chevronLeft} size={20} stroke={2} /></button>
          <button type="button" className="arrow-b" id="mm-car-next" data-spec-id="btn-action-carousel-next" data-bos-class="action" aria-label="Next RVs" aria-controls="mm-grid" disabled={edge.end} onClick={() => page(1)}><Svg id="mm-car-next-i" d={I.chevronRight} size={20} stroke={2} /></button>
        </div>
      </div>
      <ul className="car-track" id="mm-grid" ref={ref} data-spec-id="list-inventory-carousel" tabIndex={0} aria-label="Inventory, scroll sideways">
        {others.map((m) => <CarTile key={m.unit.stock} m={m} {...c} />)}
        <li className="car-end" id="mm-car-end" data-spec-id="card-carousel-end">
          <p className="car-end-n" id="mm-car-end-n">{left.toLocaleString('en-US')} more</p>
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
          <img className="ph-img" id={`${id}-img`} src={unitImg(u)} alt="" loading="lazy" draggable={false} />
          {m.picked
            ? <span className="badge-pick" id={`${id}-pick`} data-spec-id={`badge-your-pick#${u.stock}`}>Your pick</span>
            : (u.isLStock ? <span className="badge-fp" id={`${id}-fp`} data-spec-id={`badge-floorplan-example#${u.stock}`}>Floor plan example</span> : null)}
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

type Mode = 'inline' | 'bar' | 'open';
// t151u: symmetric "two deliberate scroll steps" rule. A step is one scroll gesture (events with no gap longer than
// GAP ms) that travels at least STEP px in one direction. A gesture counts once however far it flings.
// Two steps up in bar mode open the dropdown; two steps down in open mode close it. Smaller moves are ignored.
export const T3 = { STEP_FINE: 80, STEP_TOUCH: 160, GAP_FINE: 160, GAP_TOUCH: 200, STEPS: 2 };
const isTouchy = () => matchMedia('(pointer: coarse)').matches || innerWidth <= 700;

function Cols({ p }: { p: string }) {
  return (
    <colgroup id={`${p}-cols`}>
      {['thumb', 'score', 'unit', 'stock', 'dsrp', 'price', 'act'].map((k) => <col key={k} className={`c-th-${k}`} id={`${p}-col-${k}`} />)}
    </colgroup>
  );
}

function shortName(m: Match) { return `${m.unit.make.charAt(0)}${m.unit.make.slice(1).toLowerCase()} ${m.unit.model}`; }

export function InvTable({ slots, others, total, onRemove, ...c }: Common & { slots: (Match | null)[]; others: Match[]; total: number; onRemove: (i: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | undefined>(undefined);
  const [why, setWhy] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('inline');
  const modeRef = useRef<Mode>('inline');
  const g = useRef({ last: 0, dir: 0, dist: 0, counted: false, timer: 0, steps: 0, stepDir: 0 });
  const [steps, setSteps] = useState(0);
  const [qv, setQv] = useState<string | null>(() => new URLSearchParams(location.search).get('qv'));
  const set = (m: Mode) => { if (modeRef.current !== m) { modeRef.current = m; setMode(m); } };
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
    const a = g.current;
    const endGesture = () => { a.dir = 0; a.dist = 0; a.counted = false; };
    const resetSteps = () => { a.steps = 0; a.stepDir = 0; setSteps(0); };
    const onScroll = () => {
      const top = el.scrollTop;
      const d = top - a.last; a.last = top;
      const last = document.getElementById('mm-tr-slot-3');
      const th = document.getElementById('mm-tbl-hr');
      const past = !!last && top > last.offsetTop + last.offsetHeight - (th ? th.offsetHeight : 40);
      if (!past) { endGesture(); resetSteps(); set('inline'); return; }
      if (modeRef.current === 'inline') { endGesture(); resetSteps(); set('bar'); return; }
      if (!d) return;
      const touchy = isTouchy();
      const dir = d > 0 ? 1 : -1;
      if (a.dir !== dir) { a.dir = dir; a.dist = 0; a.counted = false; }
      a.dist += Math.abs(d);
      clearTimeout(a.timer);
      a.timer = window.setTimeout(endGesture, touchy ? T3.GAP_TOUCH : T3.GAP_FINE);
      if (a.counted || a.dist < (touchy ? T3.STEP_TOUCH : T3.STEP_FINE)) return;
      a.counted = true;
      if (a.stepDir === dir) a.steps += 1; else { a.stepDir = dir; a.steps = 1; }
      setSteps(a.steps * dir);
      if (a.steps >= T3.STEPS) {
        const m = modeRef.current;
        if (dir < 0 && m === 'bar') set('open');
        else if (dir > 0 && m === 'open') set('bar');
        resetSteps();
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchstart', endGesture, { passive: true });
    const y = Number(new URLSearchParams(location.search).get('ty') || 0);
    if (y) el.scrollTop = y;
    return () => { el.removeEventListener('scroll', onScroll); el.removeEventListener('touchstart', endGesture); clearTimeout(a.timer); };
  }, [h]);
  const toggle = () => { g.current.steps = 0; g.current.stepDir = 0; setSteps(0); set(modeRef.current === 'open' ? 'bar' : 'open'); };
  const filledSlots = slots.filter(Boolean) as Match[];
  const qvMatch = qv ? filledSlots.find((m) => m.unit.stock === qv) || others.find((m) => m.unit.stock === qv) || null : null;
  const qvList = qvMatch && filledSlots.includes(qvMatch) ? filledSlots : others;
  const qvSlot = qvMatch ? slots.indexOf(qvMatch) : -1;
  const left = total - others.length - slots.filter(Boolean).length;
  const filled = slots.filter(Boolean).length;
  const collapsed = mode !== 'inline';
  return (
    <section className={`tblsec is-${mode}`} id="mm-inv" data-spec-id="sec-inventory-table" data-bos-level="section" data-bos-type="table" data-t3-mode={mode} data-t3-steps={steps}>
      <div className="t3bar" id="mm-t3bar" data-spec-id="bar-top3-collapsed" aria-hidden={!collapsed} role="region" aria-label="Your top three, collapsed" onClick={toggle}>
        <button type="button" className="t3bar-tg" id="mm-t3bar-toggle" data-spec-id="btn-action-toggle-top3-bar" data-bos-class="action" aria-expanded={mode === 'open'} aria-controls="mm-t3drop" tabIndex={collapsed ? 0 : -1} onClick={(e) => { e.stopPropagation(); toggle(); }}>
          <Svg id="mm-t3bar-pin" d={I.pin} size={14} /><b id="mm-t3bar-tb">Your top three</b>
        </button>
        <span className="t3bar-items" id="mm-t3bar-items">
          {slots.map((m, i) => m ? (
            <button type="button" className="t3bar-it" id={`mm-t3bar-it-${i + 1}`} key={i} data-spec-id={`btn-action-open-quick-view-bar#${i + 1}`} data-bos-class="action" tabIndex={collapsed ? 0 : -1} aria-haspopup="dialog"
              aria-label={`${unitTitle(m.unit)}, ${m.priceText}. Open quick view`} onClick={(e) => { e.stopPropagation(); setQv(m.unit.stock); }}>
              <span className="num num-xs" id={`mm-t3bar-num-${i + 1}`}>{i + 1}</span>
              <span className="t3bar-n" id={`mm-t3bar-n-${i + 1}`} data-spec-id="text-top3-bar-item-name"><span className="t3bar-mk" id={`mm-t3bar-mk-${i + 1}`} data-spec-id="text-top3-bar-item-make">{shortName(m).replace(' ' + m.unit.model, '')} </span><span className="t3bar-md" id={`mm-t3bar-md-${i + 1}`} data-spec-id="text-top3-bar-item-model">{m.unit.model}</span></span>
              <b className="t3bar-p" id={`mm-t3bar-p-${i + 1}`} data-spec-id="text-top3-bar-item-price">{m.priceText}</b>
            </button>
          ) : (
            <span className="t3bar-it is-empty" id={`mm-t3bar-it-${i + 1}`} key={i}>
              <span className="num num-xs num-ghost" id={`mm-t3bar-num-${i + 1}`}>{i + 1}</span>
              <span className="t3bar-n" id={`mm-t3bar-n-${i + 1}`} data-spec-id="text-top3-bar-item-name">Open slot</span>
            </span>
          ))}
        </span>
        <button type="button" className="t3bar-c" id="mm-t3bar-chevbtn" data-spec-id="btn-action-toggle-top3-bar-chevron" data-bos-class="action" aria-expanded={mode === 'open'} aria-controls="mm-t3drop" aria-label={mode === 'open' ? 'Hide your top three' : 'Show your top three'} tabIndex={collapsed ? 0 : -1} onClick={(e) => { e.stopPropagation(); toggle(); }}>
          <span className="t3bar-ct" id="mm-t3bar-ct">{mode === 'open' ? 'Hide' : `Show ${filled}`}</span>
          <Svg id="mm-t3bar-chev" d={I.chevronDown} size={16} stroke={2} className="t3bar-chev" />
        </button>
      </div>
      <div className="t3drop" id="mm-t3drop" data-spec-id="dropdown-top3-rows" aria-hidden={mode !== 'open'}>
        <div className="t3drop-in" id="mm-t3drop-in">
          <table className="tbl tbl-drop" id="mm-t3drop-tbl" data-spec-id="table-top3-dropdown">
            <Cols p="mm-t3drop" />
            <tbody id="mm-t3drop-body">
              {slots.map((m, i) => <TRow key={`d${i}`} m={m} i={i} pfx="mm-dd" why={why} onWhy={setWhy} onRemove={onRemove} onOpen={setQv} {...c} />)}
            </tbody>
          </table>
        </div>
      </div>
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
            {slots.map((m, i) => (
              <TRow key={`p${i}`} m={m} i={i} why={why} onWhy={setWhy} onRemove={onRemove} onOpen={setQv} {...c} />
            ))}
            {others.map((m) => <TRow key={m.unit.stock} m={m} why={why} onWhy={setWhy} onRemove={onRemove} onOpen={setQv} {...c} />)}
            <tr className="tr-more" id="mm-tbl-more-r">
              <td colSpan={7} id="mm-tbl-more-td"><button type="button" className="btn-line" id="mm-more-btn" data-spec-id="btn-action-show-more" data-bos-class="action">Show 24 more · {left.toLocaleString('en-US')} left</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      {qvMatch && (
        <QuickView m={qvMatch} slot={qvSlot} list={qvList} pins={c.pins} saved={c.saved} onClose={() => setQv(null)} onNav={setQv}
          onPin={c.onPin} onSave={c.onSave} onUnpin={() => onRemove(qvSlot)} />
      )}
    </section>
  );
}

function TRow({ m, i, pfx = 'mm-tr', pins, saved, onPin, onSave, drag, why, onWhy, onRemove, onOpen }: Common & { m: Match | null; i?: number; pfx?: string; why: string | null; onWhy: (s: string | null) => void; onRemove: (i: number) => void; onOpen: (s: string) => void }) {
  const pinned = i != null;
  const n = (i ?? 0) + 1;
  const dd = pfx !== 'mm-tr' ? '-dropdown' : '';
  if (pinned && !m) {
    const id = `${pfx}-slot-${n}`;
    return (
      <tr className="tr tr-pin tr-empty" id={id} data-spec-id={`row-top3-slot#${n}${dd}`} style={{ ['--i' as string]: i }}
        onDragOver={(e) => { e.preventDefault(); drag.onDragOver(i!); }} onDragLeave={() => drag.onDragOver(null)} onDrop={(e) => drag.onDrop(i!, e)}>
        <td colSpan={7} id={`${id}-td`}>
          <span className="tr-empty-in" id={`${id}-in`}>
            <span className="num num-ghost" id={`${id}-num`}>{n}</span>
            <span id={`${id}-t`}>Top three slot {n} is open. Pin an RV below or drag a row here.</span>
          </span>
        </td>
      </tr>
    );
  }
  const mm = m!;
  const u = mm.unit;
  const id = pinned ? `${pfx}-slot-${n}` : `${pfx}-${u.stock}`;
  const sfx = pinned ? `-slot${n}${dd}` : '';
  const isSaved = saved.includes(u.stock);
  const full = pins.every(Boolean);
  const d = diffOf(mm);
  const open = why === id;
  return (
    <tr className={`tr${pinned ? ' tr-pin' : ''}${mm.picked ? ' is-pick' : ''}`} id={id} data-spec-id={pinned ? `row-top3-slot#${n}${dd}` : `row-inventory#${u.stock}`} style={pinned ? { ['--i' as string]: i } : undefined}
      draggable onDragStart={(e) => drag.onDragStart(u.stock, e)}
      onDragOver={pinned ? (e) => { e.preventDefault(); drag.onDragOver(i!); } : undefined} onDragLeave={pinned ? () => drag.onDragOver(null) : undefined} onDrop={pinned ? (e) => drag.onDrop(i!, e) : undefined}>
      <td className="td-thumb" id={`${id}-thumb`}>
        <span className="td-thumb-in" id={`${id}-thumb-in`}>
          {pinned ? <span className="num" id={`${id}-num`} data-spec-id={`badge-top3-number-row#${n}${dd}`}>{n}</span> : <span className="tgrip" id={`${id}-grip`} aria-hidden="true"><Grip id={`${id}-grip-i`} size={16} /></span>}
          <span className="tthumb" id={`${id}-tthumb`}><img id={`${id}-img`} src={unitImg(u)} alt="" draggable={false} /></span>
        </span>
      </td>
      <td className="td-score" id={`${id}-score`}><span className="score" id={`${id}-score-v`} data-spec-id={`info-score#${u.stock}${sfx}`}>{mm.score}</span></td>
      <td className="td-unit" id={`${id}-unit`}>
        <button type="button" className="t-name" id={`${id}-name`} data-spec-id={`btn-action-open-quick-view-row#${u.stock}${sfx}`} data-bos-class="action" aria-haspopup="dialog" onClick={() => onOpen(u.stock)}>{unitTitle(u)}</button>
        <span className="t-sub" id={`${id}-sub`}>
          {mm.picked && <span className="t-pick" id={`${id}-pick`}>Your pick</span>}
          <button type="button" className="why-l" id={`${id}-why`} aria-expanded={open} data-spec-id={`btn-action-why-it-ranks#${u.stock}${sfx}`} data-bos-class="action" onClick={() => onWhy(open ? null : id)}>
            <Svg id={`${id}-why-i`} d={I.info} size={14} /> Why it ranks
          </button>
          <span className="t-stock-m" id={`${id}-stock-m`}>#{u.stock} · {storeCity(u.location)}</span>
        </span>
        {open && (
          <span className="why-pop" id={`${id}-why-pop`} role="note" data-spec-id={`info-why-it-ranks#${u.stock}${sfx}`}>
            {mm.reasons.map((r, k) => <span key={r} className={`why-chip${r.includes('not verified') || r.startsWith('Price over') ? ' is-bad' : r.startsWith('Price within') ? ' is-ok' : ''}`} id={`${id}-why-${k}`}>{r}</span>)}
          </span>
        )}
      </td>
      <td className="td-stock" id={`${id}-stock`}>#{u.stock}</td>
      <td className="td-dsrp" id={`${id}-dsrp`}>{money(u.price)}</td>
      <td className="td-price" id={`${id}-price`}><button type="button" className="t-price-b" id={`${id}-price-b`} data-spec-id={`btn-action-open-quick-view-price#${u.stock}${sfx}`} data-bos-class="action" aria-haspopup="dialog" aria-label={`${mm.priceText}, open quick view`} onClick={() => onOpen(u.stock)}><b id={`${id}-price-v`}>{mm.priceText}</b></button> <span className={`t-diff ${d.cls}`} id={`${id}-diff`}>{d.t}</span></td>
      <td className="td-act" id={`${id}-act`}>
        <span className="t-acts" id={`${id}-acts`}>
          {pinned
            ? <button type="button" className="t-btn" id={`${id}-remove`} data-spec-id={`btn-action-remove-row#${n}${dd}`} data-bos-class="action" aria-label={`Remove from top three slot ${n}`} title="Remove from top three" onClick={() => onRemove(i!)}><Svg id={`${id}-remove-i`} d={I.x} size={16} stroke={2} /></button>
            : <button type="button" className="t-btn t-pin" id={`${id}-pin`} data-spec-id={`btn-action-pin-row#${u.stock}`} data-bos-class="action" disabled={full} aria-label={full ? 'Top three is full' : 'Pin to your top three'} title={full ? 'Top three is full' : 'Pin to your top three'} onClick={() => onPin(u.stock)}><Svg id={`${id}-pin-i`} d={I.pin} size={16} /><span className="t-btn-t" id={`${id}-pin-t`}>Pin</span></button>}
          <button type="button" className={`t-btn t-save${isSaved ? ' is-on' : ''}`} id={`${id}-save`} aria-pressed={isSaved} data-spec-id={`btn-action-save-row#${u.stock}${sfx}`} data-bos-class="action" aria-label={isSaved ? 'Saved' : 'Save'} title={isSaved ? 'Saved' : 'Save'} onClick={() => onSave(u.stock)}><Svg id={`${id}-save-i`} d={I.bookmark} size={16} /></button>
        </span>
      </td>
    </tr>
  );
}

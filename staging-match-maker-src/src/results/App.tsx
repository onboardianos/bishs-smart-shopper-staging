import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { GridGlyph, Grip, I, ListGlyph, Svg } from './icons';
import logo from './assets/logo-bishs-rv-black-gold.png';
import { Carousel, InvTable, InvTools, type View } from './InvViews';
import {
  matchOf, money, storeCity,
  unitImg, unitTitle, lengthFt, type Match,
} from './inventory';
import { loadAnswers, saveAnswers, onPurchase, type Answers } from '../answers';
import { snapshotMeta, withPicked } from '../liveRank';
import { locationsOf, rankDesk, seedDesk, snapshotUnitCount, type Desk, type Toggle } from '../deskRank';
import { SiteHeader } from '../steps/SiteHeader';
import { buildSession, gvwrOf } from '../session';
import { budgetText, budgetRows, people, answerText } from '../steps/answersText';
import { resetAnswers, go } from '../answers';
import { setLiveBudget } from './inventory';
import TOW from '../tow.json';

// DESIGN PREVIEW ONLY. Rebuild of the Match Maker results as two full-width pages (Zach refs A + B, t147u/t148u).
// Gold only where Zach's refs put it; each such element carries (or "cta") so checks can audit it.

const PAGE = 24;
const POOL = PAGE + 3;
type Tab = 'top3' | 'saved' | 'inventory';
type DragFns = { onDragStart: (stock: string, e: DragEvent) => void; onDragOver: (i: number | null) => void; onDrop: (i: number, e: DragEvent) => void };

const q = () => new URLSearchParams(location.search);
function pinsFromUrl(): string[] {
  const unit = q().get('unit');
  const raw = q().get('pins');
  if (raw == null) return unit ? [unit, '', ''] : ['', '', ''];
  const p = raw.split(',').map((s) => s.trim());
  return [p[0] || '', p[1] || '', p[2] || ''];
}
function tabFromUrl(): Tab { const t = q().get('tab'); return t === 'top3' || t === 'saved' ? t : 'inventory'; }
function writeQuery(pins: string[], tab: Tab, drawer: boolean, view: string) {
  const s = q();
  if (view === 'list') s.set('view', 'list'); else s.delete('view');
  if (pins.every((x) => !x)) s.delete('pins'); else s.set('pins', pins.join(','));
  if (tab === 'inventory') s.delete('tab'); else s.set('tab', tab);
  if (drawer) s.set('drawer', '1'); else s.delete('drawer');
  const str = s.toString();
  history.replaceState(null, '', `${location.pathname}${str ? `?${str}` : ''}`);
}

export function App() {
  const [answers, setAnswers] = useState<Answers>(() => {
    const a = loadAnswers();
    const stores = q().get('stores');
    if (stores) a.stores = stores.split(',').filter(Boolean);
    const stock = q().get('unit');
    if (stock && q().get('screen') === 'matches') {
      const units = (window as unknown as { BISH_SNAPSHOT?: { units: { stocknumber: string; class: string }[] } }).BISH_SNAPSHOT?.units || [];
      const u = units.find((x) => String(x.stocknumber) === stock);
      if (u) a.classes = [u.class];
    }
    if (q().get('state') === 'empty') a.classes = ['ZZ'];
    return a;
  });
  const [towOpen, setTowOpen] = useState(false);
  const [desk, setDesk] = useState<Desk>(() => seedDesk(answers));
  const live = useMemo(() => { const r = withPicked(rankDesk(answers, desk, 120), q().get('unit')); if (r.ceiling) setLiveBudget(r.ceiling); return r; }, [answers, desk]);
  const rows = live.matches as Match[];
  const patch = (p: Partial<Answers>) => setAnswers(saveAnswers(p));
  const [pins, setPins] = useState<string[]>(pinsFromUrl);
  const [tab, setTab] = useState<Tab>(tabFromUrl);
  const [drawer, setDrawer] = useState(() => q().get('drawer') === '1');
  const [filtOpen, setFiltOpen] = useState(() => q().get('filters') === '1');
  const [savedSet, setSavedSet] = useState<string[]>([]);
  const saved = useMemo(() => rows.filter((m) => savedSet.includes(m.unit.stock)), [rows, savedSet]);
  const [dragStock, setDragStock] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [view, setView] = useState<View>(() => (q().get('view') === 'list' ? 'list' : 'grid'));

  useEffect(() => {
    document.title = tab === 'top3' ? "Your top three · Smart Shopper · Bish's RV" : "Find your next getaway · Smart Shopper · Bish's RV";
  }, [tab]);
  useLayoutEffect(() => {
    if (tab !== 'inventory' || view !== 'grid') return;
    const slot = document.getElementById('mm-slot-1');
    const root = document.getElementById('mm-root');
    if (!slot || !root) return;
    const set = () => root.style.setProperty('--tile-w', `${slot.getBoundingClientRect().width}px`);
    set();
    const ro = new ResizeObserver(set); ro.observe(slot);
    return () => ro.disconnect();
  }, [tab, view]);
  useEffect(() => { writeQuery(pins, tab, drawer, view); }, [pins, tab, drawer, view]);
  useEffect(() => {
    if (!drawer) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [drawer]);

  const pinCache = useRef<Record<string, Match>>({});
  rows.forEach((m) => { pinCache.current[m.unit.stock] = m; });
  const slots = pins.map((s) => (s ? (rows.find((m) => m.unit.stock === s) || pinCache.current[s] || matchOf(s)) : null));
  const seededPins = useRef(pins.some(Boolean));
  useEffect(() => {
    if (seededPins.current || !rows.length) return;
    seededPins.current = true;
    setPins([rows[0]?.unit.stock || '', rows[1]?.unit.stock || '', rows[2]?.unit.stock || '']);
  }, [rows]);
  const others = rows.filter((m) => !pins.includes(m.unit.stock)).slice(0, PAGE);
  const fit = tab === 'inventory';
  const setSlots = (next: string[]) => setPins([next[0] || '', next[1] || '', next[2] || '']);
  const pin = (stock: string) => {
    if (pins.includes(stock)) return;
    const i = pins.findIndex((s) => !s);
    if (i < 0) return;
    const n = pins.slice(); n[i] = stock; setSlots(n);
  };
  const unpin = (i: number) => { const n = pins.slice(); n[i] = ''; setSlots(n); };
  const place = (i: number, stock: string) => {
    if (!stock) return;
    const n = pins.slice();
    const from = n.indexOf(stock);
    if (from === i) return;
    if (from >= 0) { n[from] = n[i]; n[i] = stock; } else n[i] = stock;
    setSlots(n);
  };
  const toggleSave = (stock: string) => setSavedSet((s) => (s.includes(stock) ? s.filter((x) => x !== stock) : [...s, stock]));
  const drag: DragFns = {
    onDragStart: (stock, e) => { e.dataTransfer.setData('text/plain', stock); e.dataTransfer.effectAllowed = 'move'; setDragStock(stock); },
    onDragOver: setOver,
    onDrop: (i, e) => { e.preventDefault(); place(i, e.dataTransfer.getData('text/plain') || dragStock || ''); setDragStock(null); setOver(null); },
  };
  const tileProps = { pins, saved: savedSet, onPin: pin, onSave: toggleSave, drag };

  return (
    <div className={`ss${fit ? ` is-fit is-${view}` : ''}`} id="mm-root" data-bos-level="screen" data-bos-screen={`smart-shopper-${tab}${fit ? `-${view}` : ''}`}>
      <TopBar />
      <main className="pg" id="mm-main">
        {tab === 'inventory' && (
          <>
            <PageHead id="mm-inv-head" title="Find your next getaway." sub={`${live.total.toLocaleString('en-US')} matching units`} onAnswers={() => setDrawer(true)} extra={<Notice label={desk.towMax < desk.R.towMax ? `${desk.towMax.toLocaleString('en-US')} lbs` : ''} onAdd={() => setTowOpen(true)} />} budget={answers} />
            <button type="button" className="filt-toggle" id="mm-filt-toggle" data-spec-id="btn-action-toggle-filters" data-bos-class="action" aria-expanded={filtOpen} aria-controls="mm-filt" onClick={() => setFiltOpen((v) => !v)}>
              <Svg id="mm-filt-toggle-icon" d={I.sliders} size={18} />
              <span id="mm-filt-toggle-t">Filters</span>
              <span className="filt-toggle-n" id="mm-filt-toggle-n">{activeFilters(desk) ? `${activeFilters(desk)} set` : 'Any'}</span>
              <Svg id="mm-filt-toggle-caret" d={I.chevronDown} size={16} className={filtOpen ? 'is-up' : ''} />
            </button>
            <Filters open={filtOpen} desk={desk} onChange={setDesk} />
            <TabsRow tab={tab} onTab={setTab} savedN={savedSet.length} tools={<InvTools view={view} onView={setView} search={desk.search} onSearch={(search) => setDesk((d) => ({ ...d, search }))} location={desk.location} onLocation={(location) => setDesk((d) => ({ ...d, location }))} stores={locationsOf()} total={snapshotUnitCount()} />} />
            {view === 'grid' ? (
              <>
                <TopStrip slots={slots} over={over} drag={drag} onRemove={unpin} onOpen={() => setTab('top3')} />
                <Carousel others={others} total={live.total} onList={() => setView('list')} {...tileProps} />
              </>
            ) : (
              <InvTable slots={slots} others={rows.filter((m) => !pins.includes(m.unit.stock))} total={live.total} onRemove={unpin} {...tileProps} />
            )}
          </>
        )}
        {tab === 'top3' && (
          <>
            <PageHead id="mm-tt-head" title="Your top three." sub="Choose your favorite to explore purchase options." onAnswers={() => setDrawer(true)} />
            <TabsRow tab={tab} onTab={setTab} savedN={savedSet.length} />
            <TopThreeBoard slots={slots} over={over} drag={drag} onRemove={unpin} onBrowse={() => setTab('inventory')} />
          </>
        )}
        {tab === 'saved' && (
          <>
            <PageHead id="mm-sv-head" title="Saved." sub={`${savedSet.length} RVs you saved. Pin any of them into your top three.`} onAnswers={() => setDrawer(true)} />
            <TabsRow tab={tab} onTab={setTab} savedN={savedSet.length} />
            <ul className="grid grid-saved" id="mm-saved-grid" data-spec-id="list-saved-tiles">
              {saved.filter((m) => savedSet.includes(m.unit.stock)).map((m) => <Tile key={m.unit.stock} m={m} {...tileProps} prefix="mm-sv" />)}
            </ul>
          </>
        )}
      </main>
      {!fit && (
        <footer className="pg-foot" id="mm-foot" data-spec-id="info-preview-footer">
          <span id="mm-foot-t">Snapshot {snapshotMeta().inventorySnapshotId} · {snapshotUnitCount().toLocaleString('en-US')} units · {locationsOf().length} locations · class art, not unit photos</span>
        </footer>
      )}
      {drawer && <AnswersDrawer onClose={() => setDrawer(false)} answers={answers} onTow={() => { setDrawer(false); setTowOpen(true); }} />}
      {towOpen && <TowSheet answers={answers} onClose={() => setTowOpen(false)} onSave={(towRating, towLabel) => { patch({ towRating, towLabel, tow: 'yes', towMode: 'derived' }); setDesk((d) => ({ ...d, towMax: Math.min(d.R.towMax, Math.round(towRating * 0.9)) })); setTowOpen(false); }} />}
      {rows.length === 0 && <p className="mm-state" data-state="empty" data-spec-id="card-state-empty" role="status"><span><strong className="mm-state-title">No matching units</strong><span className="mm-state-body">Nothing on the lot fits these answers. Widen the budget, the tow rating, or the stores.</span></span></p>}
    </div>
  );
}

/* ─────────── chrome ─────────── */

function TopBar() {
  // One Bish's RV header across landing, questions and results (steps/SiteHeader.tsx)
  return <SiteHeader prefix="mm" />;
}

function PageHead({ id, title, sub, onAnswers, extra, budget }: { id: string; title: string; sub: string; onAnswers: () => void; extra?: ReactNode; budget?: Answers }) {
  return (
    <header className="ph" id={id} data-spec-id="sec-page-heading">
      <div className="ph-txt" id={`${id}-txt`}>
        <h1 className="ph-t" id={`${id}-t`} data-spec-id="label-page-title">{title}</h1>
        <p className="ph-s" id={`${id}-s`} data-spec-id="info-page-subtitle">{sub}</p>
      </div>
      <div className="ph-r" id={`${id}-r`}>
      {extra}
      <button type="button" className="answers-btn" id={`${id}-answers`} data-spec-id="btn-action-open-your-answers" data-bos-class="action" aria-haspopup="dialog" onClick={onAnswers}>
        <Svg id={`${id}-answers-icon`} d={I.user} size={18} />
        <span id={`${id}-answers-t`}>Your answers</span>
        <span className="answers-sum" id={`${id}-answers-sum`}>{budget ? `${budgetText(budget)} · sleeps ${budget.adults + budget.children}` : ''}</span>
      </button>
      </div>
    </header>
  );
}

/* ─────────── filters ─────────── */

function Seg<K extends keyof Toggle>({ id, label, opts, value, onPick }: { id: string; label: string; opts: string[]; value: string | null; onPick: (v: Toggle[K] | null) => void }) {
  return (
    <div className="f-cell" id={id}>
      <span className="f-l" id={`${id}-l`}>{label}</span>
      <div className="seg" id={`${id}-seg`} role="radiogroup" aria-labelledby={`${id}-l`} data-spec-id={`input-filter-${id.replace('mm-f-', '')}`}>
        {opts.map((o) => {
          const on = value === o;
          return (
            <button key={o} type="button" role="radio" aria-checked={on} className={`seg-b${on ? ' is-on' : ''}`} id={`${id}-${o.toLowerCase()}`} data-spec-id={`input-choice-${id.replace('mm-f-', '')}-${o.toLowerCase()}`} data-bos-class="input"
              onClick={() => onPick((on ? null : o) as Toggle[K] | null)}>
              {on && <Svg id={`${id}-${o.toLowerCase()}-chk`} d={I.check} size={14} stroke={3} />}
              <span id={`${id}-${o.toLowerCase()}-t`}>{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Slider({ id, label, min, max, step, value, dir, minL, maxL, valL, any, onChange }: {
  id: string; label: string; min: number; max: number; step?: number; value: number; dir: 'max' | 'min'; minL: string; maxL: string; valL: string; any: string; onChange: (n: number) => void;
}) {
  const span = Math.max(1, max - min);
  const pct = ((value - min) / span) * 100;
  return (
    <div className="f-cell f-slider" id={id}>
      <div className="f-lrow" id={`${id}-lrow`}>
        <span className="f-l" id={`${id}-l`}>{label}</span>
        <span className="f-any" id={`${id}-any`}>{any}{valL && <b className="f-val" id={`${id}-val`}>{valL}</b>}</span>
      </div>
      <div className="sl" id={`${id}-wrap`}>
        <span className="sl-rail" id={`${id}-rail`} />
        <span className="sl-fill" id={`${id}-fill`} style={dir === 'max' ? { left: 0, width: `${pct}%` } : { left: `${pct}%`, right: 0 }} />
        <input className="sl-in" id={`${id}-in`} type="range" min={min} max={max} step={step || 1} value={value} aria-label={label} aria-valuetext={valL || any} data-spec-id={`input-${id.replace('mm-f-', 'filter-')}`} data-bos-class="input" onChange={(e) => onChange(Number(e.target.value))} />
      </div>
      <div className="sl-ends" id={`${id}-ends`}><span id={`${id}-min`}>{minL}</span><span id={`${id}-max`}>{maxL}</span></div>
    </div>
  );
}

function classOptions() {
  const snap = (window as unknown as { BISH_SNAPSHOT?: { units: { class: string }[]; lookups?: { classes?: Record<string, { description?: string }> } } }).BISH_SNAPSHOT;
  const counts: Record<string, number> = {};
  for (const u of snap?.units || []) counts[u.class] = (counts[u.class] || 0) + 1;
  return Object.keys(counts).sort().map((code) => ({ code, name: snap?.lookups?.classes?.[code]?.description || code, units: counts[code] }));
}

function activeFilters(d: Desk) {
  let n = 0;
  if (d.method === 'Cash' ? d.cash > 0 : d.payment > 0) n += 1;
  if (d.toggle.bunks) n += 1;
  if (d.toggle.slides) n += 1;
  if (d.toggle.bedroom) n += 1;
  if (d.toggle.build) n += 1;
  if (d.lenMax < d.R.lenMax) n += 1;
  if (d.towMax < d.R.towMax) n += 1;
  if (d.sleepMin > d.R.sleepMin) n += 1;
  if (d.unitType !== 'ALL') n += 1;
  if (d.location) n += 1;
  if (d.search.trim()) n += 1;
  return n;
}

function Filters({ open, desk, onChange }: { open: boolean; desk: Desk; onChange: (fn: (d: Desk) => Desk) => void }) {
  const finance = desk.method === 'Finance';
  const shown = finance ? String(desk.payment || '') : desk.cash > 0 ? String(desk.cash) : '';
  const setToggle = <K extends keyof Toggle>(key: K, v: Toggle[K] | null) => onChange((d) => ({ ...d, toggle: { ...d.toggle, [key]: v } }));
  const types = classOptions();
  return (
    <section className={`filt${open ? ' is-open' : ''}`} id="mm-filt" data-spec-id="sec-filters" data-bos-level="section" data-bos-type="toolbar" aria-label="Filters">
      <div className="f-row f-row-1" id="mm-filt-r1">
        <div className="f-cell" id="mm-f-price">
          <label className="f-l" id="mm-f-price-l" htmlFor="mm-f-price-in">{finance ? 'Payment ($/mo)' : 'Sales price ($)'}</label>
          <div className="step" id="mm-f-price-box">
            <button type="button" className="step-b" id="mm-f-price-mode" data-spec-id="btn-action-budget-mode" data-bos-perm="discovery.navigate" aria-pressed={finance} onClick={() => onChange((d) => ({ ...d, method: finance ? 'Cash' : 'Finance' }))}>{finance ? '/mo' : 'Cash'}</button>
            <button type="button" className="step-b" id="mm-f-price-dec" data-spec-id="btn-action-price-dec" data-bos-class="action" aria-label="Lower price" onClick={() => onChange((d) => finance ? { ...d, payment: Math.max(0, d.payment - 50) } : { ...d, cash: Math.max(0, d.cash - 500) })}><Svg id="mm-f-price-dec-i" d={I.minus} size={16} stroke={2} /></button>
            <input className="step-in" id="mm-f-price-in" data-spec-id="input-filter-price" data-bos-class="input" value={shown} placeholder="Any" inputMode="numeric" aria-label={finance ? 'Monthly payment' : 'Maximum sales price'} onChange={(e) => { const n = Number(e.target.value.replace(/[^0-9]/g, '')) || 0; onChange((d) => finance ? { ...d, payment: n } : { ...d, cash: n }); }} />
            <button type="button" className="step-b" id="mm-f-price-inc" data-spec-id="btn-action-price-inc" data-bos-class="action" aria-label="Raise price" onClick={() => onChange((d) => finance ? { ...d, payment: d.payment + 50 } : { ...d, cash: d.cash + 500 })}><Svg id="mm-f-price-inc-i" d={I.plus} size={16} stroke={2} /></button>
          </div>
        </div>
        <Seg id="mm-f-bunks" label="Bunks" opts={['Yes', 'No']} value={desk.toggle.bunks} onPick={(v) => setToggle('bunks', v)} />
        <Seg id="mm-f-slides" label="Slides" opts={['Yes', 'No']} value={desk.toggle.slides} onPick={(v) => setToggle('slides', v)} />
        <Seg id="mm-f-bedroom" label="Bedroom" opts={['Private', 'Open']} value={desk.toggle.bedroom} onPick={(v) => setToggle('bedroom', v)} />
        <Seg id="mm-f-build" label="Build" opts={['Fiber', 'Alum']} value={desk.toggle.build} onPick={(v) => setToggle('build', v)} />
      </div>
      <div className="f-row f-row-2" id="mm-filt-r2">
        <Slider id="mm-f-length" label="Length (max)" min={desk.R.lenMin} max={desk.R.lenMax} value={desk.lenMax} dir="max" minL={`${desk.R.lenMin} ft`} maxL={`${desk.R.lenMax} ft`} valL={`${desk.lenMax} ft`} any={desk.lenMax < desk.R.lenMax ? 'Up to' : 'Any'} onChange={(n) => onChange((d) => ({ ...d, lenMax: n }))} />
        <Slider id="mm-f-tow" label="Tow limit" min={desk.R.towMin} max={desk.R.towMax} step={250} value={desk.towMax} dir="max" minL={`${(desk.R.towMin / 1000).toFixed(2).replace(/0$/, '')}K`} maxL={`${(desk.R.towMax / 1000).toFixed(2).replace(/0$/, '')}K`} valL={`${(desk.towMax / 1000).toFixed(2)}K lbs`} any={desk.towMax < desk.R.towMax ? 'Up to' : 'Any'} onChange={(n) => onChange((d) => ({ ...d, towMax: n }))} />
        <Slider id="mm-f-sleeps" label="Sleeps" min={desk.R.sleepMin} max={desk.R.sleepMax} value={desk.sleepMin} dir="min" minL={`${desk.R.sleepMin}`} maxL={`${desk.R.sleepMax}+`} valL={`${desk.sleepMin}+`} any={desk.sleepMin > desk.R.sleepMin ? 'At least' : 'Any'} onChange={(n) => onChange((d) => ({ ...d, sleepMin: n }))} />
        <div className="f-cell" id="mm-f-type">
          <label className="f-l" id="mm-f-type-l" htmlFor="mm-f-type-sel">Unit type</label>
          <div className="sel" id="mm-f-type-wrap">
            <select className="sel-in" id="mm-f-type-sel" data-spec-id="input-filter-unit-type" data-bos-class="input" value={desk.unitType} onChange={(e) => onChange((d) => ({ ...d, unitType: e.target.value }))}>
              <option id="mm-f-type-all" value="ALL">All types ({snapshotUnitCount().toLocaleString('en-US')})</option>
              {types.map((c) => <option key={c.code} id={`mm-f-type-${c.code}`} value={c.code}>{c.name} ({c.units.toLocaleString('en-US')})</option>)}
            </select>
            <Svg id="mm-f-type-caret" d={I.chevronDown} size={18} className="sel-caret" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Notice({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="note" id="mm-note" data-spec-id="alert-tow-not-checked" role="status">
      <Svg id="mm-note-icon" d={I.truck} size={20} />
      <span id="mm-note-t">{label ? `Towing up to ${label}` : 'Towing compatibility not checked'}</span>
      <span className="note-dot" id="mm-note-dot">·</span>
      <button type="button" className="note-a" id="mm-note-a" data-spec-id="btn-action-add-vehicle" data-bos-class="action" data-bos-perm="discovery.navigate" onClick={onAdd}>{label ? 'Change vehicle' : 'Add your vehicle'}</button>
    </div>
  );
}

function TowSheet({ onClose, onSave }: { answers: Answers; onClose: () => void; onSave: (rating: number, label: string) => void }) {
  const rows = TOW as [string, string, string, number, string][];
  const makes = useMemo(() => [...new Set(rows.map((r) => r[0]))], [rows]);
  const [make, setMake] = useState('Honda');
  const models = useMemo(() => [...new Set(rows.filter((r) => r[0] === make).map((r) => r[1]))], [rows, make]);
  const [model, setModel] = useState('Pilot 2WD');
  const engines = rows.filter((r) => r[0] === make && r[1] === model);
  const [eng, setEng] = useState('');
  const hit = engines.find((r) => r[2] === eng) || engines[0];
  return (
    <div className="dr-wrap" id="mm-tow-wrap">
      <button type="button" className="dr-scrim" id="mm-tow-scrim" aria-label="Close add your vehicle" onClick={onClose} />
      <aside className="dr" id="mm-tow" role="dialog" aria-modal="true" aria-labelledby="mm-tow-title" data-spec-id="drawer-tow">
        <header className="dr-h" id="mm-tow-h">
          <h2 className="dr-t" id="mm-tow-title">Add your vehicle</h2>
          <button type="button" className="dr-x" id="mm-tow-x" data-spec-id="btn-action-close-tow" aria-label="Close" onClick={onClose}><Svg id="mm-tow-x-i" d={I.x} size={20} /></button>
        </header>
        <div className="dr-body" id="mm-tow-b">
          <label className="f-l" htmlFor="tow-mk">Make</label>
          <select id="tow-mk" data-spec-id="input-tow-make" value={make} onChange={(e) => { setMake(e.target.value); setModel(''); setEng(''); }}>{makes.map((m) => <option key={m}>{m}</option>)}</select>
          <label className="f-l" htmlFor="tow-md">Model</label>
          <select id="tow-md" data-spec-id="input-tow-model" value={model} onChange={(e) => { setModel(e.target.value); setEng(''); }}>{models.map((m) => <option key={m}>{m}</option>)}</select>
          <label className="f-l" htmlFor="tow-en">Engine</label>
          <select id="tow-en" data-spec-id="input-tow-engine" value={hit?.[2] || ''} onChange={(e) => setEng(e.target.value)}>{engines.map((r) => <option key={r[2]} value={r[2]}>{r[2]} · {r[3].toLocaleString()} lb</option>)}</select>
          <p id="mm-tow-margin">90% working margin · gate {hit ? Math.round(hit[3] * 0.9).toLocaleString() : '—'} lb GVWR</p>
        </div>
        <footer className="dr-f" id="mm-tow-f">
          <button type="button" className="btn-gold" id="mm-tow-save" data-spec-id="btn-commit-save-vehicle" data-bos-perm="discovery.advance" disabled={!hit} onClick={() => hit && onSave(hit[3], `${hit[3].toLocaleString()} lb · ${make} ${model}`)}>Use this vehicle</button>
        </footer>
      </aside>
    </div>
  );
}

function TabsRow({ tab, onTab, savedN, tools }: { tab: Tab; onTab: (t: Tab) => void; savedN: number; tools?: ReactNode }) {
  const items: [Tab, string, string?][] = [['top3', 'Top three'], ['saved', 'Saved', `· ${savedN}`], ['inventory', 'All inventory']];
  return (
    <div className="tabs" id={`mm-tabs-${tab}`} data-spec-id="sec-view-tabs">
      <div className="tabs-l" id={`mm-tabs-${tab}-l`} role="tablist" aria-label="Views">
        {items.map(([k, l, n]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`tab${tab === k ? ' is-on' : ''}`} id={`mm-tab-${k}`} data-spec-id={`input-choice-tab-${k}`} data-bos-class="input" onClick={() => onTab(k)}>
            <span id={`mm-tab-${k}-t`}>{l}</span>
            {n && <span className="tab-n" id={`mm-tab-${k}-n`}>{n}</span>}
          </button>
        ))}
      </div>
      {tools}
    </div>
  );
}

/* ─────────── All inventory: sticky top three ─────────── */

function TopStrip({ slots, over, drag, onRemove, onOpen }: { slots: (Match | null)[]; over: number | null; drag: DragFns; onRemove: (i: number) => void; onOpen: () => void }) {
  const n = slots.filter(Boolean).length;
  return (
    <section className="t3" id="mm-sticky" data-spec-id="sec-top3-pinned" aria-label="Your top three, pinned">
      <div className="t3-h" id="mm-t3-h">
        <span className="t3-pill" id="mm-t3-pill" data-spec-id="label-top3-pinned">
          <Svg id="mm-t3-pill-icon" d={I.pin} size={15} />
          <b id="mm-t3-pill-b">Your top three</b>
          <span id="mm-t3-pill-s">· Pinned</span>
        </span>
        <span className="t3-count" id="mm-t3-count" data-spec-id="info-top3-count">{n} of 3</span>
      </div>
      <div className="t3-grid" id="mm-t3-grid">
        <ol className="t3-slots" id="mm-pin-row" data-spec-id="list-top3-slots">
          {slots.map((m, i) => <PinSlot key={i} i={i} m={m} over={over === i} drag={drag} onRemove={onRemove} />)}
        </ol>
        <div className="t3-aside" id="mm-t3-aside">
          <p className="t3-foot" id="mm-t3-foot" data-spec-id="info-top3-drag-hint">
            <Grip id="mm-t3-foot-grip" size={16} />
            <span id="mm-t3-foot-t">Drag an RV into a top-three slot.</span>
          </p>
          <p className="t3-aside-s" id="mm-t3-aside-s">Or tap the pin on any RV. Your top three stay right here while you browse.</p>
          <button type="button" className="t3-open" id="mm-t3-open" data-spec-id="btn-action-open-top-three" data-bos-class="action" onClick={onOpen} disabled={!n}>
            Compare your top three →
          </button>
        </div>
      </div>
    </section>
  );
}

function reasonLine(m: Match) {
  if (m.picked) return 'The RV you searched for.';
  const ft = lengthFt(m.unit);
  if (m.fits) return ft && ft <= 36 ? 'Private bedroom with room in your budget.' : 'More room, still in your budget.';
  if (m.fits === false) return 'A little over budget, more space.';
  return 'A close match for you.';
}

function PinSlot({ i, m, over, drag, onRemove }: { i: number; m: Match | null; over: boolean; drag: DragFns; onRemove: (i: number) => void }) {
  const n = i + 1;
  const id = `mm-slot-${n}`;
  return (
    <li className={`slot${m ? ' is-filled' : ' is-empty'}${over ? ' is-over' : ''}`} id={id} data-spec-id={`card-top3-slot#${n}`} data-bos-type="card"
      onDragOver={(e) => { e.preventDefault(); drag.onDragOver(i); }} onDragLeave={() => drag.onDragOver(null)} onDrop={(e) => drag.onDrop(i, e)}>
      {m ? (
        <article className="card slot-card" id={`${id}-card`} aria-labelledby={`${id}-name`} draggable onDragStart={(e) => drag.onDragStart(m.unit.stock, e)}>
          <div className="ph-media" id={`${id}-media`} data-spec-id={`media-top3-slot#${n}`}>
            <img className="ph-img" id={`${id}-img`} src={unitImg(m.unit)} alt="" />
            <span className="num" id={`${id}-num`} data-spec-id={`badge-top3-number#${n}`}>{n}</span>
            {m.picked && <span className="badge-pick" id={`${id}-pick`} data-spec-id={`badge-your-pick-slot#${n}`}>Your pick</span>}
            <span className="slot-tools" id={`${id}-tools`}>
              <button type="button" className="tool-b" id={`${id}-remove`} data-spec-id={`btn-action-remove-slot#${n}`} data-bos-class="action" aria-label={`Remove from slot ${n}`} title="Remove" onClick={() => onRemove(i)}><Svg id={`${id}-remove-i`} d={I.x} size={14} stroke={2} /></button>
              <button type="button" className="tool-b grip" id={`${id}-grip`} data-spec-id={`btn-action-drag-slot#${n}`} data-bos-class="action" aria-label={`Drag to reorder slot ${n}`} title="Drag"><Grip id={`${id}-grip-i`} size={16} /></button>
            </span>
          </div>
          <div className="card-b" id={`${id}-body`}>
            <h3 className="c-name" id={`${id}-name`} data-spec-id={`label-top3-slot-title#${n}`}>{unitTitle(m.unit)}</h3>
            <p className="c-price" id={`${id}-price`}>{m.priceText}</p>
            <p className="c-meta c-meta-line" id={`${id}-meta`}>Sleeps {m.unit.sleeps ?? '—'} · {lengthFt(m.unit)} ft · {storeCity(m.unit.location)}</p>
            <p className="c-reason" id={`${id}-reason`}>{reasonLine(m)}</p>
          </div>
        </article>
      ) : (
        <div className="slot-empty slot-ghost" id={`${id}-empty`}>
          <span className="ghost-media" id={`${id}-ghost-media`}><span className="slot-empty-n" id={`${id}-empty-n`}>#{n}</span></span>
          <span className="ghost-body" id={`${id}-ghost-body`}><span className="slot-empty-t" id={`${id}-empty-t`}>Pin an RV here</span></span>
        </div>
      )}
    </li>
  );
}

function Tile({ m, pins, saved, onPin, onSave, drag, prefix = 'mm-tile' }: {
  m: Match; pins: string[]; saved: string[]; onPin: (s: string) => void; onSave: (s: string) => void; drag: DragFns; prefix?: string;
}) {
  const u = m.unit;
  const id = `${prefix}-${u.stock}`;
  const sfx = prefix === 'mm-tile' ? '' : '-saved';
  const slot = pins.indexOf(u.stock);
  const full = pins.every(Boolean);
  const isSaved = saved.includes(u.stock);
  return (
    <li className={`tile${m.picked ? ' is-pick' : ''}`} id={`${id}-wrap`} data-spec-id={`card-inventory#${u.stock}${sfx}`} data-bos-type="card" draggable onDragStart={(e) => drag.onDragStart(u.stock, e)}>
      <article className="card" id={id} aria-labelledby={`${id}-name`}>
        <div className="ph-media" id={`${id}-media`} data-spec-id={`media-inventory#${u.stock}${sfx}`}>
          <img className="ph-img" id={`${id}-img`} src={unitImg(u)} alt="" loading="lazy" />
          {m.picked
            ? <span className="badge-pick" id={`${id}-pick`} data-spec-id={`badge-your-pick#${u.stock}${sfx}`}>Your pick</span>
            : (u.isLStock ? <span className="badge-fp" id={`${id}-fp`} data-spec-id={`badge-floorplan-example#${u.stock}${sfx}`}>Floor plan example</span> : null)}
          {slot >= 0
            ? <span className="pin-on" id={`${id}-pinned`} data-spec-id={`info-pinned#${u.stock}${sfx}`}>#{slot + 1}</span>
            : (
              <button type="button" className="pin-b" id={`${id}-pin`} data-spec-id={`btn-action-pin#${u.stock}${sfx}`} data-bos-class="action" disabled={full} aria-label={full ? 'Top three is full' : 'Pin to your top three'} title={full ? 'Top three is full' : 'Pin to your top three'} onClick={() => onPin(u.stock)}>
                <Svg id={`${id}-pin-i`} d={I.pin} size={16} />
              </button>
            )}
        </div>
        <div className="card-b" id={`${id}-body`}>
          <h3 className="c-name" id={`${id}-name`} data-spec-id={`label-inventory-title#${u.stock}${sfx}`}>{unitTitle(u)}</h3>
          <p className="c-price" id={`${id}-price`}>{m.priceText}</p>
          <p className="c-meta" id={`${id}-meta`}>
            <span id={`${id}-sleeps`}><Svg id={`${id}-sleeps-i`} d={I.bed} size={14} />Sleeps {u.sleeps ?? '—'}</span>
            <span id={`${id}-len`}><Svg id={`${id}-len-i`} d={I.ruler} size={14} />{lengthFt(u)} ft</span>
          </p>
          <p className="chips" id={`${id}-chips`}>
            <span className="chip" id={`${id}-chip-0`}>Fifth wheel</span>
            <span className="chip" id={`${id}-chip-1`}>Fiberglass</span>
            {u.slides != null && <span className="chip" id={`${id}-chip-2`}>{u.slides ? `${u.slides} slide${u.slides > 1 ? 's' : ''}` : 'No slides'}</span>}
          </p>
          <div className="c-foot" id={`${id}-foot`}>
            <a className="c-link" id={`${id}-details`} href={`#unit-${u.stock}`} data-spec-id={`btn-action-view-details#${u.stock}${sfx}`} data-bos-class="action">View details →</a>
            <button type="button" className={`save-b${isSaved ? ' is-on' : ''}`} id={`${id}-save`} aria-pressed={isSaved} data-spec-id={`btn-action-save#${u.stock}${sfx}`} data-bos-class="action" onClick={() => onSave(u.stock)}>
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}

/* ─────────── Top three tab ─────────── */

function TopThreeBoard({ slots, over, drag, onRemove, onBrowse }: { slots: (Match | null)[]; over: number | null; drag: DragFns; onRemove: (i: number) => void; onBrowse: () => void }) {
  const top = slots[0];
  return (
    <section className="tt" id="mm-tt" data-spec-id="sec-top-three-tab">
      <div className="tt-board" id="mm-tt-board">
        <article className={`tt-pick${top ? ' is-filled' : ' is-empty'}${over === 0 ? ' is-over' : ''}`} id="mm-ttpick" data-spec-id="card-your-top-pick" data-bos-type="card"
          aria-labelledby={top ? 'mm-ttpick-name' : 'mm-ttpick-empty-t'}
          onDragOver={(e) => { e.preventDefault(); drag.onDragOver(0); }} onDragLeave={() => drag.onDragOver(null)} onDrop={(e) => drag.onDrop(0, e)}>
          {top ? (
            <>
              <div className="tt-media" id="mm-ttpick-media" data-spec-id="media-your-top-pick">
                <img className="ph-img" id="mm-ttpick-img" src={unitImg(top.unit)} alt="" />
              </div>
              <div className="tt-body" id="mm-ttpick-body">
                <span className="tt-kick" id="mm-ttpick-kick" data-spec-id="label-your-top-pick">1 · Your top pick</span>
                <h2 className="tt-name" id="mm-ttpick-name" data-spec-id="label-your-top-pick-title">{unitTitle(top.unit)}</h2>
                <p className="tt-price" id="mm-ttpick-price" data-spec-id="info-your-top-pick-price">{top.priceText}</p>
                <p className="tt-meta" id="mm-ttpick-meta">Sleeps {top.unit.sleeps} · {lengthFt(top.unit)} ft · {storeCity(top.unit.location)}</p>
                <p className="tt-reason" id="mm-ttpick-reason">{reasonLine(top)}</p>
                <p className="tt-tow" id="mm-ttpick-tow" data-spec-id="alert-top-pick-tow" role="status">Towing compatibility not checked</p>
                <button type="button" className="btn-gold" id="mm-purchase" data-gold="cta" data-spec-id="btn-commit-purchase-options" data-bos-class="commit" data-bos-perm="match.send" onClick={onPurchase}>Purchase options →</button>
                <button type="button" className="c-link tt-remove" id="mm-ttpick-remove" data-spec-id="btn-action-remove-top-pick" data-bos-class="action" onClick={() => onRemove(0)}>Remove from top three</button>
              </div>
            </>
          ) : (
            <div className="tt-empty" id="mm-ttpick-empty">
              <span className="slot-empty-n" id="mm-ttpick-empty-n">#1</span>
              <p className="tt-empty-t" id="mm-ttpick-empty-t">Drag an RV into the top spot</p>
              <button type="button" className="btn-line" id="mm-ttpick-browse" data-spec-id="btn-action-browse-inventory" data-bos-class="action" onClick={onBrowse}>Browse all inventory</button>
            </div>
          )}
        </article>
        <ol className="tt-side" id="mm-tt-side">
          {[1, 2].map((i) => <RailCard key={i} i={i} m={slots[i]} over={over === i} drag={drag} onRemove={onRemove} />)}
        </ol>
      </div>
      <div className="tt-foot" id="mm-tt-foot">
        <p className="tt-hint" id="mm-tt-hint" data-spec-id="info-top-three-drag-hint">Drag an RV into the top spot to explore its purchase options.</p>
        <span className="inv-s" id="mm-tt-illus" data-spec-id="info-illustrative-top3">Illustrative inventory</span>
      </div>
    </section>
  );
}

function RailCard({ i, m, over, drag, onRemove }: { i: number; m: Match | null; over: boolean; drag: DragFns; onRemove: (i: number) => void }) {
  const n = i + 1;
  const id = `mm-rail-${n}`;
  return (
    <li className={`rail${m ? ' is-filled' : ' is-empty'}${over ? ' is-over' : ''}`} id={id} data-spec-id={`card-top3-rail#${n}`} data-bos-type="card"
      onDragOver={(e) => { e.preventDefault(); drag.onDragOver(i); }} onDragLeave={() => drag.onDragOver(null)} onDrop={(e) => drag.onDrop(i, e)}>
      {m ? (
        <article className="rail-in" id={`${id}-in`} aria-labelledby={`${id}-name`} draggable onDragStart={(e) => drag.onDragStart(m.unit.stock, e)}>
          <div className="rail-media" id={`${id}-media`} data-spec-id={`media-top3-rail#${n}`}>
            <img className="ph-img" id={`${id}-img`} src={unitImg(m.unit)} alt="" />
          </div>
          <div className="rail-body" id={`${id}-body`}>
            <div className="rail-top" id={`${id}-top`}>
              <button type="button" className="grip grip-inline" id={`${id}-grip`} data-spec-id={`btn-action-drag-rail#${n}`} data-bos-class="action" aria-label={`Drag slot ${n}`}><Grip id={`${id}-grip-i`} size={18} /></button>
              <h3 className="rail-name" id={`${id}-name`} data-spec-id={`label-top3-rail-title#${n}`}><span className="rail-n" id={`${id}-n`}>{n} ·</span> {`${m.unit.make.charAt(0)}${m.unit.make.slice(1).toLowerCase()} ${m.unit.model}`}</h3>
            </div>
            <p className="rail-full" id={`${id}-full`}>{unitTitle(m.unit)}</p>
            <p className="rail-price" id={`${id}-price`}>{m.priceText}</p>
            <p className="rail-meta" id={`${id}-meta`}>Sleeps {m.unit.sleeps} · {lengthFt(m.unit)} ft · {storeCity(m.unit.location)}</p>
            <p className="rail-reason" id={`${id}-reason`}>{reasonLine(m)}</p>
            <button type="button" className="c-link" id={`${id}-remove`} data-spec-id={`btn-action-remove-rail#${n}`} data-bos-class="action" onClick={() => onRemove(i)}>Remove</button>
          </div>
        </article>
      ) : (
        <div className="slot-empty" id={`${id}-empty`}>
          <span className="slot-empty-n" id={`${id}-empty-n`}>#{n}</span>
          <span className="slot-empty-t" id={`${id}-empty-t`}>Pin an RV here</span>
        </div>
      )}
    </li>
  );
}

/* ─────────── Your answers drawer ─────────── */

function Row({ id, k, v }: { id: string; k: string; v: ReactNode }) {
  return <div className="dr-row" id={id}><dt id={`${id}-k`}>{k}</dt><dd id={`${id}-v`}>{v}</dd></div>;
}

function AnswersDrawer({ onClose, answers, onTow }: { onClose: () => void; answers: Answers; onTow: () => void }) {
  // Built from the same engine session the ranking uses (session.ts buildSession), so it shows what is really being matched.
  const sess = useMemo(() => buildSession(answers), [answers]);
  const g = sess.gates;
  const must: string[] = [answerText('02', answers), ...(answers.hitch.length ? [answerText('03', answers)] : []), ...(answers.sub.length ? [answerText('04', answers)] : [])].filter((x) => x && x !== '—');
  if (g.sleepsMin) must.push(`Sleeps at least ${g.sleepsMin}`);
  if (g.priceMax) must.push(`Sale price up to ${money(g.priceMax)}`);
  if (g.gvwrMax) must.push(`GVWR up to ${g.gvwrMax.toLocaleString('en-US')} lbs`);
  if (g.lengthMaxFt) must.push(`Up to ${g.lengthMaxFt} ft long`);
  if (answers.garageFt && !answers.garageAny && answers.classes.some((c) => c === 'TTTH' || c === 'FWTH')) must.push(`Toy-hauler garage ${answers.garageFt} ft or longer`);
  if (g.sidewall) must.push(g.sidewall === 'LAMINATE' ? 'Laminate / fiberglass walls only' : 'Stick and tin only');
  (g.requiredAnyOf || []).forEach(() => must.push('Dedicated bunks'));
  (g.requiredChars || []).forEach((id: number) => must.push(id === 15 ? 'Private bedroom' : id === 3 ? 'Two bathrooms' : id === 2 ? 'Washer / dryer prep' : `Feature ${id}`));
  const prefs: string[] = sess.prefs.map((p: { label: string }) => p.label);
  const pri = sess.numericPriorities as Record<string, boolean>;
  if (pri.compact && answers.lengthMode === 'soft') prefs.push('Shorter is better');
  if (answers.size === 'simple') prefs.push('Lighter and simpler — fewer slides');
  if (sess.sidewallPref) prefs.push(sess.sidewallPref === 'laminate' ? 'Laminate / fiberglass walls' : 'Stick and tin / aluminum (value)');
  const avoid: string[] = sess.avoids.map((x: { label: string }) => x.label);
  const tow = gvwrOf(answers);
  return (
    <div className="dr-wrap" id="mm-drawer-wrap">
      <button type="button" className="dr-scrim" id="mm-drawer-scrim" data-spec-id="btn-action-close-drawer-scrim" data-bos-class="action" aria-label="Close your answers" onClick={onClose} />
      <aside className="dr" id="mm-drawer" role="dialog" aria-modal="true" aria-labelledby="mm-drawer-t" data-spec-id="sec-your-answers-drawer" data-bos-level="section" data-bos-type="drawer">
        <header className="dr-h" id="mm-drawer-h">
          <div id="mm-drawer-h-txt">
            <h2 className="dr-t" id="mm-drawer-t">Your answers</h2>
            <p className="dr-s" id="mm-drawer-s">What we're matching RVs to. Change anything and your matches update.</p>
          </div>
          <button type="button" className="dr-x" id="mm-drawer-x" data-spec-id="btn-action-close-drawer" data-bos-class="action" aria-label="Close" onClick={onClose}><Svg id="mm-drawer-x-i" d={I.x} size={20} /></button>
        </header>
        <div className="dr-body" id="mm-drawer-body">
          <section className="dr-sec" id="mm-dr-money" data-spec-id="sec-your-answers-money">
            <h3 className="dr-sh" id="mm-dr-money-h">Budget</h3>
            <dl className="dr-dl" id="mm-dr-money-dl">
              {budgetRows(answers).map(([k, v], i) => <Row key={k} id={`mm-dr-budget-${i}`} k={k} v={v} />)}
            </dl>
          </section>
          <section className="dr-sec" id="mm-dr-people" data-spec-id="sec-your-answers-people">
            <h3 className="dr-sh" id="mm-dr-people-h">Who's coming</h3>
            <dl className="dr-dl" id="mm-dr-people-dl">
              <Row id="mm-dr-adults" k="Adults" v={String(answers.adults)} />
              <Row id="mm-dr-kids" k="Kids or guests" v={String(answers.children)} />
              <Row id="mm-dr-pets" k="Pets" v={String(answers.pets)} />
            </dl>
          </section>
          <section className="dr-sec" id="mm-dr-need" data-spec-id="sec-your-answers-need">
            <h3 className="dr-sh" id="mm-dr-need-h">Must have</h3>
            <ul className="dr-ul" id="mm-dr-need-ul">{must.map((m, i) => <li key={m + i} id={`mm-dr-need-${i}`}>{m}</li>)}</ul>
          </section>
          <section className="dr-sec" id="mm-dr-pref" data-spec-id="sec-your-answers-pref">
            <h3 className="dr-sh" id="mm-dr-pref-h">Nice to have</h3>
            {prefs.length ? <ol className="dr-ol" id="mm-dr-pref-ol">{prefs.map((p, i) => <li key={p + i} id={`mm-dr-pref-${i}`}>{p}</li>)}</ol> : <p id="mm-dr-pref-none">No preferences yet. Matches rank on your must-haves and lifestyle.</p>}
            {avoid.length > 0 && <p className="dr-avoid" id="mm-dr-avoid"><b id="mm-dr-avoid-b">Avoid:</b> {avoid.join(' · ')}</p>}
          </section>
          <section className={`dr-sec${tow ? '' : ' dr-tow'}`} id="mm-dr-tow" data-spec-id={tow ? 'info-tow-checked' : 'alert-tow-missing'}>
            <h3 className="dr-sh" id="mm-dr-tow-h"><Svg id="mm-dr-tow-i" d={I.truck} size={18} />{tow ? `Towing up to ${tow.toLocaleString('en-US')} lbs` : 'Towing not checked yet'}</h3>
            <p id="mm-dr-tow-p">{tow ? `${answers.towMode === 'raw' ? 'Your exact rating' : '90% of your rating, as a safety margin'}${answers.towLabel ? ` · ${answers.towLabel}` : ''}.` : "Add your tow vehicle so we can confirm which RVs it can safely pull. Dry weight alone isn't a towing approval."}</p>
            <button type="button" className="c-link" id="mm-dr-tow-a" data-spec-id="btn-action-drawer-add-vehicle" data-bos-class="action" data-bos-perm="discovery.navigate" onClick={onTow}>{tow ? 'Change vehicle' : 'Add your vehicle'}</button>
          </section>
        </div>
        <footer className="dr-f" id="mm-drawer-f">
          <button type="button" className="btn-line" id="mm-dr-edit" data-spec-id="btn-action-edit-answers" data-bos-class="action" onClick={() => go('summary')}>Edit answers</button>
          <button type="button" className="c-link" id="mm-dr-restart" data-spec-id="btn-action-start-over" data-bos-class="action" onClick={() => { resetAnswers(); go('00'); }}>Start over</button>
        </footer>
      </aside>
    </div>
  );
}

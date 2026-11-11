import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { I, Svg } from './icons';
import { BUDGET, lengthFt, money, storeCity, titleCase, unitImg, unitTitle, type Match } from './inventory';
import { onPurchase } from '../answers';

// DESIGN PREVIEW ONLY (t151u). Unit quick view. Price leads. Right-side drawer at ≥701px, bottom sheet on phone.
// Close: X, Esc, backdrop click, swipe down (phone). Prev/next cycles the list it was opened from (top three or inventory).

type Props = {
  m: Match; slot: number; list: Match[]; pins: string[]; saved: string[];
  onClose: () => void; onNav: (stock: string) => void; onPin: (s: string) => void; onSave: (s: string) => void; onUnpin: () => void;
};

const OUT_MS = 240;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function QuickView({ m, slot, list, pins, saved, onClose, onNav, onPin, onSave, onUnpin }: Props) {
  const u = m.unit;
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const xBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const idx = list.findIndex((x) => x.unit.stock === u.stock);
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  const inTop = slot >= 0;
  const pinned = pins.includes(u.stock);
  const full = pins.every(Boolean);
  const isSaved = saved.includes(u.stock);
  const diff = u.price == null ? null : BUDGET - u.price;

  const close = () => {
    if (closing) return;
    if (reduced()) { onClose(); return; }
    setClosing(true);
    setTimeout(onClose, OUT_MS);
  };
  useEffect(() => {
    opener.current = document.activeElement;
    xBtn.current?.focus({ preventScroll: true });
    const root = document.documentElement; const prevOv = root.style.overflow; root.style.overflow = 'hidden';
    return () => { root.style.overflow = prevOv; (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft' && prev) onNav(prev.unit.stock);
      else if (e.key === 'ArrowRight' && next) onNav(next.unit.stock);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [u.stock]);

  // swipe down to close (phone bottom sheet); only when the sheet content is scrolled to the top
  const onTS = (e: TouchEvent) => { if ((body.current?.scrollTop ?? 0) <= 0) start.current = e.touches[0].clientY; };
  const onTM = (e: TouchEvent) => { if (start.current != null) setDrag(Math.max(0, e.touches[0].clientY - start.current)); };
  const onTE = () => { if (start.current == null) return; start.current = null; if (drag > 96) close(); setDrag(0); };

  const pos = idx >= 0 ? `${idx + 1} of ${list.length}` : '';
  return (
    <div className={`qv-wrap${closing ? ' is-out' : ''}`} id="mm-qv-wrap" data-spec-id="overlay-unit-quick-view" data-bos-level="overlay">
      <button type="button" className="qv-scrim" id="mm-qv-scrim" data-spec-id="btn-action-close-quick-view-backdrop" data-bos-class="action" aria-label="Close quick view" tabIndex={-1} onClick={close} />
      <aside className="qv" id="mm-qv" role="dialog" aria-modal="true" aria-labelledby="mm-qv-title" aria-describedby="mm-qv-price"
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
        <span className="qv-grab" id="mm-qv-grab" aria-hidden="true" />
        <header className="qv-h" id="mm-qv-h">
          <span className="qv-kick" id="mm-qv-kick" data-spec-id="label-quick-view-context">
            {inTop ? <><span className="num num-xs" id="mm-qv-num">{slot + 1}</span>Your top three · {pos}</> : <>Inventory · {pos}</>}
          </span>
          <span className="qv-nav" id="mm-qv-nav">
            <button type="button" className="qv-ib" id="mm-qv-prev" data-spec-id="btn-action-quick-view-prev" data-bos-class="action" disabled={!prev} aria-label={prev ? `Previous: ${unitTitle(prev.unit)}` : 'No previous unit'} onClick={() => prev && onNav(prev.unit.stock)}><Svg id="mm-qv-prev-i" d={I.chevronLeft} size={18} stroke={2} /></button>
            <button type="button" className="qv-ib" id="mm-qv-next" data-spec-id="btn-action-quick-view-next" data-bos-class="action" disabled={!next} aria-label={next ? `Next: ${unitTitle(next.unit)}` : 'No next unit'} onClick={() => next && onNav(next.unit.stock)}><Svg id="mm-qv-next-i" d={I.chevronRight} size={18} stroke={2} /></button>
            <button type="button" className="qv-ib qv-x" id="mm-qv-close" ref={xBtn} data-spec-id="btn-action-close-quick-view" data-bos-class="action" aria-label="Close quick view" onClick={close}><Svg id="mm-qv-close-i" d={I.x} size={18} stroke={2} /></button>
          </span>
        </header>
        <div className="qv-body" id="mm-qv-body" ref={body}>
          <section className="qv-price" id="mm-qv-price-sec" data-spec-id="sec-quick-view-price">
            <span className="qv-pl" id="mm-qv-pl">Price</span>
            <p className="qv-pv" id="mm-qv-price" data-spec-id="info-quick-view-price">{m.priceText}</p>
            {diff != null && (
              <p className={`qv-pd ${diff >= 0 ? 'is-under' : 'is-over'}`} id="mm-qv-pd" data-spec-id="info-quick-view-budget-diff">
                {money(Math.abs(diff))} {diff >= 0 ? 'under' : 'over'} your {money(BUDGET)} budget
              </p>
            )}
          </section>
          <h2 className="qv-t" id="mm-qv-title" data-spec-id="label-quick-view-title">{unitTitle(u)}</h2>
          <p className="qv-s" id="mm-qv-sub" data-spec-id="info-quick-view-stock-location">Stock #{u.stock} · {storeCity(u.location)}</p>
          <div className="qv-media" id="mm-qv-media" data-spec-id="media-quick-view"><img id="mm-qv-img" src={unitImg(u)} alt={`${titleCase(u.className)} class art`} /></div>
          <dl className="qv-facts" id="mm-qv-facts" data-spec-id="list-quick-view-facts">
            {[
              ['class', 'Class', titleCase(u.className)],
              ['length', 'Length', lengthFt(u) != null ? `${lengthFt(u)} ft` : 'Not listed'],
              ['weight', 'Weight', u.gvwr ? `${Math.round(u.gvwr).toLocaleString('en-US')} lb GVWR` : 'Not in feed'],
              ['sleeps', 'Sleeps', u.sleeps ?? 'Not listed'],
              ['slides', 'Slides', u.slides ?? 'Not listed'],
              ['cond', 'Condition', u.condition],
            ].map(([k, l, v]) => (
              <div className="qv-f" id={`mm-qv-f-${k}`} key={k as string}>
                <dt id={`mm-qv-f-${k}-l`}>{l}</dt><dd id={`mm-qv-f-${k}-v`} className={v === 'Not in feed' ? 'is-na' : undefined}>{v}</dd>
              </div>
            ))}
          </dl>
          <section className="qv-match" id="mm-qv-match" data-spec-id="sec-quick-view-match">
            <h3 className="qv-mh" id="mm-qv-mh"><span className="score" id="mm-qv-score" data-spec-id="info-quick-view-score">{m.score}</span> Match score · why it ranks</h3>
            <span className="qv-why" id="mm-qv-why" data-spec-id="info-quick-view-why">
              {m.reasons.map((r, k) => <span key={r} className={`why-chip${r.includes('not verified') || r.startsWith('Price over') ? ' is-bad' : r.startsWith('Price within') ? ' is-ok' : ''}`} id={`mm-qv-why-${k}`}>{r}</span>)}
            </span>
          </section>
          <a className="c-link qv-full" id="mm-qv-full" href={`#unit-${u.stock}`} data-spec-id="btn-action-view-full-details" data-bos-class="action">View full details →</a>
        </div>
        <footer className="qv-f-bar" id="mm-qv-foot">
          {inTop || pinned
            ? <button type="button" className="btn-line qv-sec" id="mm-qv-unpin" data-spec-id="btn-action-quick-view-unpin" data-bos-class="action" onClick={onUnpin}><Svg id="mm-qv-unpin-i" d={I.x} size={16} stroke={2} />Unpin</button>
            : <button type="button" className="btn-line qv-sec" id="mm-qv-pin" data-spec-id="btn-action-quick-view-pin" data-bos-class="action" disabled={full} title={full ? 'Top three is full' : undefined} onClick={() => onPin(u.stock)}><Svg id="mm-qv-pin-i" d={I.pin} size={16} />{full ? 'Top three full' : 'Pin'}</button>}
          <button type="button" className={`qv-ib qv-save${isSaved ? ' is-on' : ''}`} id="mm-qv-save" data-spec-id="btn-action-quick-view-save" data-bos-class="action" aria-pressed={isSaved} aria-label={isSaved ? 'Saved' : 'Save'} onClick={() => onSave(u.stock)}><Svg id="mm-qv-save-i" d={I.bookmark} size={18} /></button>
          <button type="button" className="btn-gold qv-cta" id="mm-qv-cta" data-gold="cta" data-spec-id="btn-commit-quick-view-purchase-options" data-bos-class="commit" data-bos-perm="match.send" onClick={onPurchase}>Purchase options →</button>
        </footer>
      </aside>
    </div>
  );
}

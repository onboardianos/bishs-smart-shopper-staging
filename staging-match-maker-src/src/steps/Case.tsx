import { Icon } from '@v1/components/Icon';
import flow from './flow.json';
import { ALL_UNITS, storesFromUrl, unitsAt } from './inventory';
const SEL = storesFromUrl();

// "Your case" — Wayfinder-inspired (Figma MVP GetFit 05 · Tow "YOUR FIT PROFILE" rail 14:28644 + Trade Value 13 · Review
// "YOUR PROGRESS"/EDIT rows 298:61478), rebuilt on DS tokens: Card (light) + definition rows, ink only, no gold (selection is state).
export interface CaseRow { step: string; label: string; value: string; icon: string; current?: boolean }
const fmt = (n: number) => n.toLocaleString('en-US');

// The live count indicator. L05: never a naked number — shows the share of in-stock inventory and the change from the last answer.
export function MatchBox({ id, count, prev, example, compact, where, base = unitsAt(SEL) }: { id: string; count: number; prev?: number; example?: boolean; compact?: boolean; where?: string; base?: number }) {
  const pct = Math.max(1.5, Math.min(100, (count / base) * 100));
  // Start screen with a store picked: bar shows that store's share of all stock
  const delta = prev !== undefined ? count - prev : 0;
  return (
    <section className={`mb${compact ? ' mb-compact' : ''}`} id={id} data-spec-id={`metric-matching-rvs#${id}`} data-bos-level="section" data-bos-type="metric" aria-live="polite" aria-label={`${fmt(count)} RVs match`}>
      <div className="mb-top" id={`${id}-top`}>
        <span className="mb-k" id={`${id}-k`}>Matching RVs</span>
        {example && <span className="chip chip-neutral mb-ex" id={`${id}-example`} data-spec-id="label-example-data">Example</span>}
      </div>
      <div className="mb-row" id={`${id}-row`}>
        <strong className="mb-n" id={`${id}-n`}>{fmt(count)}</strong>
        <span className="mb-of" id={`${id}-of`}>{where ? `in stock at ${where}` : count === ALL_UNITS ? 'in stock · all locations' : `of ${fmt(base)} in stock${SEL ? ` at ${SEL.length === 1 ? '1 store' : `${SEL.length} stores`}` : ''}`}</span>
      </div>
      <div className="mb-bar" id={`${id}-bar`} aria-hidden="true"><span id={`${id}-bar-fill`} style={{ width: `${pct}%` }} /></div>
      {!compact && (
        <p className="mb-delta" id={`${id}-delta`}>
          {prev === undefined || delta === 0 ? 'Every answer narrows this down.' : <><Icon name="chevron-down" size={14} stroke={2.5} /> {fmt(Math.abs(delta))} fewer after your last answer</>}
        </p>
      )}
    </section>
  );
}

export function CaseList({ id, rows, answered, total = flow.totalSteps, upcoming = flow.upcoming, onEdit }: { id: string; rows: CaseRow[]; answered: number; total?: number; upcoming?: string[]; onEdit?: (step: string) => void }) {
  return (
    <>
      <ol className="cs-list" id={`${id}-list`}>
        {rows.map((r, i) => (
          <li className={`cs-row${r.current ? ' cs-cur' : ''}`} key={r.step} id={`${id}-row-${r.step}`}>
            <span className="cs-ic" id={`${id}-row-${r.step}-ic`}><Icon name={r.current ? r.icon : 'check'} size={16} stroke={r.current ? 2 : 3} /></span>
            <span className="cs-t" id={`${id}-row-${r.step}-t`}>
              <span className="cs-k" id={`${id}-row-${r.step}-k`}>{r.label}{r.current ? ' · picking now' : ''}</span>
              <span className="cs-v" id={`${id}-row-${r.step}-v`}>{r.value}</span>
            </span>
            {!r.current && <button type="button" className="cs-edit" id={`${id}-row-${r.step}-edit`} data-spec-id={`btn-action-edit-answer#${r.step}`} data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act" aria-label={`Edit ${r.label}`} onClick={() => onEdit?.(r.step)}>Edit</button>}
          </li>
        ))}
        {upcoming.slice(0, 2).map((u, i) => (
          <li className="cs-row cs-next" key={u} id={`${id}-next-${i}`}>
            <span className="cs-ic" id={`${id}-next-${i}-ic`}>{answered + rows.filter(r => r.current).length + i + 1}</span>
            <span className="cs-t" id={`${id}-next-${i}-t`}><span className="cs-k" id={`${id}-next-${i}-k`}>{i === 0 ? flow.case.next : 'Then'}</span><span className="cs-v" id={`${id}-next-${i}-v`}>{u}</span></span>
          </li>
        ))}
      </ol>
      <div className="cs-foot" id={`${id}-foot`}>
        <span id={`${id}-foot-t`}>{answered} of {total} answered</span>
        <span className="cs-dots" id={`${id}-dots`} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} id={`${id}-dot-${i}`} className={i < Math.round((answered / total) * 9) ? 'on' : ''} />)}</span>
      </div>
    </>
  );
}

// Desktop (≥1024 container): persistent rail beside the question.
export function CasePanel({ rows, answered, total, upcoming, onEdit, count, prev, example }: { rows: CaseRow[]; answered: number; total?: number; upcoming?: string[]; onEdit?: (step: string) => void; count: number; prev?: number; example?: boolean }) {
  return (
    <aside className="cs" id="case-panel" data-spec-id="sec-your-case" data-bos-level="section" data-bos-type="aside" aria-labelledby="case-title">
      <MatchBox id="case-match" count={count} prev={prev} example={example} />
      <div className="cs-card" id="case-card">
        <div className="cs-head" id="case-head">
          <h2 className="cs-title" id="case-title"><Icon name="folder" size={16} /> {flow.case.title}</h2>
          <p className="cs-sub" id="case-sub">{flow.case.sub}</p>
        </div>
        <CaseList id="case" rows={rows} answered={answered} total={total} upcoming={upcoming} onEdit={onEdit} />
      </div>
      <p className="cs-note" id="case-note"><Icon name="users" size={16} /> <span id="case-note-t">{flow.case.outfitter}</span></p>
    </aside>
  );
}

// Tablet / phone (<1024 container): the same case, collapsed into one bar in the thumb zone; taps open a bottom sheet.
export function CaseBar({ rows, count, example, open, onOpen }: { rows: CaseRow[]; count: number; example?: boolean; open: boolean; onOpen: () => void }) {
  const done = rows.filter((r) => !r.current);
  return (
    <button type="button" className="cb" id="case-bar" data-spec-id="btn-action-open-your-case" data-bos-class="action" data-bos-perm="case.read" data-bos-access="read" aria-expanded={open} aria-controls="case-sheet" onClick={onOpen}>
      <span className="cb-n" id="case-bar-n"><strong id="case-bar-count">{fmt(count)}</strong> <span id="case-bar-count-k">RVs match{example ? ' · example' : ''}</span></span>
      <span className="cb-sep" id="case-bar-sep" aria-hidden="true" />
      <span className="cb-case" id="case-bar-case"><Icon name="folder" size={16} /> <span id="case-bar-case-t">{flow.case.title} · {done.length}</span></span>
      <span className="cb-up" id="case-bar-up"><Icon name="chevron-down" size={18} /></span>
    </button>
  );
}

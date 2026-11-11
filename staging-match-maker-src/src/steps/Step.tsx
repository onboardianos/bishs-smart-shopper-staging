import { useState, type ReactNode } from 'react';
import { Button } from '@v1/components/Button';
import { Icon } from '@v1/components/Icon';
import { Modal } from '@v1/components/Modal';
import { CustomerShell } from './Shell';
import { CasePanel, CaseBar, CaseList, MatchBox, type CaseRow } from './Case';
import flow from './flow.json';
import { storesFromUrl } from './inventory';
import { locLabel } from './LocationPicker';
import { posOf, goEdit, goNext } from './flowSteps';
import { go, saveAnswers } from '../answers';

// ONE question frame for every Smart Shopper step. Screens only pass data (title, options, case rows, count).
// Centered auto layout: a max-width container, centered in the AppShell main area at every width.
//   ≥1024 container: question column + persistent "Your case" rail (Wayfinder "Your fit profile").
//   641–1023: one centered 720px column; case collapses into a bar in the sticky action dock; tap = bottom sheet.
//   ≤640: same as tablet, phone padding, single thumb zone.
const STEP_OF: Record<string, string> = { s02: '02', s03: '03', s04: '04', smh: 'mh' };
export function StepFrame({ id, stepId, overline, title, hint, helper, multi, rows, count, prev, example, ctaOn = true, ctaLabel, disabledWhy, sheetOpen = false, children, overlay, onContinue, onBack }: {
  id: string; stepId?: string; pos?: number; overline: string; title: string; hint?: string; helper?: string; multi?: boolean; rows: CaseRow[]; answered?: number;
  count: number; prev?: number; example?: boolean; ctaOn?: boolean; ctaLabel?: string; disabledWhy?: string; sheetOpen?: boolean; children: ReactNode; overlay?: ReactNode;
  onContinue?: () => void; onBack?: () => void;
}) {
  const [sheet, setSheet] = useState(sheetOpen);
  const sid = stepId || STEP_OF[id] || id;
  const P = posOf(sid);
  const pos = P.pos, total = P.total, answered = Math.max(0, pos - 1);
  const pct = total > 1 ? ((pos - 1) / (total - 1)) * 100 : 0;
  const ret = new URLSearchParams(location.search).get('ret');
  const onEdit = (step: string) => goEdit(step, sid);
  // "Have a trade in" → the trade-in questions (Q5 · Your camper, Q6 · What to change), then back to this step
  const onTrade = () => { saveAnswers({ camping: 'current' }); go('trade-now', sid === 'trade-now' || sid === 'trade-why' ? '' : `&ret=${sid}`); };
  const overlineText = overline.replace(/^Step \d+/, `Step ${pos}`);
  return (
    <CustomerShell store={locLabel(storesFromUrl())}>
      <div className="ssw" id={`${id}-root`} data-layer="canvas" data-bos-level="screen" data-bos-screen={id}>
        <div className="ssw-in ssw-rail" id={`${id}-in`}>
          <div className="ssw-main" id={`${id}-main`}>
            <nav className="ssq-prog" id={`${id}-progress`} data-spec-id="nav-progress" data-bos-level="section" data-bos-type="nav" aria-label={`Step ${pos} of ${total}`}>
              <div className="ssq-track" id={`${id}-track`}><span id={`${id}-track-fill`} style={{ width: `${pct}%` }} /></div>
              <span className="ssq-prog-t" id={`${id}-progress-label`} data-spec-id="label-step-counter">Step {pos} of {total}</span>
            </nav>
            <section className="tone-card ssw-card" id={`${id}-question`} data-spec-id="sec-question" data-bos-level="section" data-bos-type="question" aria-labelledby={`${id}-title`}>
              <div className="overline" id={`${id}-overline`} data-spec-id="label-step">{overlineText}</div>
              <h1 className="t-title ssw-title" id={`${id}-title`} data-spec-id="label-question">{title}</h1>
              {hint && <p className="t-subtitle ssw-hint" id={`${id}-hint`} data-spec-id="info-question-hint">{hint}</p>}
              {helper && <p className="ssw-helper" id={`${id}-helper`} data-spec-id="info-multi-select-helper"><Icon name="info" size={16} /> <span id={`${id}-helper-t`}>{helper}</span></p>}
              <div className="ssw-answers" id={`${id}-answers`} data-spec-id="sec-answers" role={multi ? 'group' : 'radiogroup'} aria-labelledby={`${id}-title`}>{children}</div>
            </section>
            <div className="ssw-act" id={`${id}-act`} data-spec-id="sec-step-footer" data-bos-level="section" data-bos-type="footer">
              <CaseBar rows={rows} count={count} example={example} open={sheet} onOpen={() => setSheet(true)} />
              <div className="ssw-btns" id={`${id}-btns`}>
                <Button kind="action" id={`${id}-prev`} data-spec-id="btn-action-previous" aria-label="Previous" className="ssw-prev" onClick={onBack || (() => go(P.prev))}>
                  <Icon name="chevrons-left" size={18} /><span className="ssw-prev-t">Previous</span>
                </Button>
                <button type="button" className="ssw-trade" id={`${id}-trade-in`} data-spec-id="btn-action-have-a-trade-in" data-bos-class="action" onClick={onTrade}>{loadTradeLabel()}</button>
                <div className="ssw-go" id={`${id}-go`}>
                  <Button kind="commit" id={`${id}-continue`} data-spec-id="btn-commit-continue" size="lg" trailingIcon="arrow-right" className="ssw-cta" disabled={!ctaOn} aria-disabled={!ctaOn} onClick={onContinue || (() => goNext(sid))}>{ctaLabel || (ret === 'summary' ? 'Back to summary' : flow.cta)}</Button>
                  {!ctaOn && disabledWhy && <p className="ssw-why" id={`${id}-why`} data-spec-id="info-commit-disabled-reason" role="status">{disabledWhy}</p>}
                </div>
              </div>
            </div>
          </div>
          <CasePanel rows={rows} answered={answered} total={total} upcoming={P.upcoming} onEdit={onEdit} count={count} prev={prev} example={example} />
        </div>
      </div>
      <Modal id="case-sheet" open={sheet} onDismiss={() => setSheet(false)} labelledBy="case-sheet-title">
        <div className="cs-sheet" id="case-sheet-body" data-spec-id="sec-overlay-your-case" data-bos-level="section" data-bos-type="overlay" data-layer="overlay">
          <span className="cs-grab" id="case-sheet-grab" aria-hidden="true" />
          <h2 className="cs-title" id="case-sheet-title"><Icon name="folder" size={16} /> {flow.case.title}</h2>
          <p className="cs-sub" id="case-sheet-sub">{flow.case.sub}</p>
          <MatchBox id="case-sheet-match" count={count} prev={prev} example={example} />
          <CaseList id="case-sheet" rows={rows} answered={answered} total={total} upcoming={P.upcoming} onEdit={onEdit} />
        </div>
      </Modal>
      {overlay}
    </CustomerShell>
  );
}

function loadTradeLabel() {
  try { const a = JSON.parse(sessionStorage.getItem('ss-case-v2') || '{}'); const t = a.trade; return t && (t.year || t.mfr || t.make || t.model || (t.changes && t.changes.length) || t.text) ? 'Trade-in added' : 'Have a trade in'; } catch { return 'Have a trade in'; }
}

// Bishified Smart Shopper questions after Step 4: Camping today → Summary. Question text and options are the live
// bishsos.com/smart-shopper wording; every answer feeds the engine session (session.ts buildSession) or, where live says so,
// is recorded for the outfitter only. One StepFrame, DS ChoiceTile, ink selection, gold only on the Continue / Submit COMMIT.
import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@v1/components/Icon';
import { Button } from '@v1/components/Button';
import { ChoiceTile } from './ChoiceTile';
import { StepFrame } from './Step';
import type { CaseRow } from './Case';
import { SiteHeader } from './SiteHeader';
import { posOf, goNext, goEdit, visibleSteps, navOf } from './flowSteps';
import { loadAnswers, markDone, go, type Answers, type Trade } from '../answers';
import { unitsFor, poolOf, liveText, childOpts, bedroomOpts, multiOpts, catalogue, gvwrOf, ceilingOf, financeOf, splits, CAMPING_IMG, TOW_IMG, n, APR, SNAP, E, isMotorOnly, type Opt } from '../session';
import { answerText, budgetRows, CAMPING, CAMP_STYLE, ACTIVITIES, TRADE_CHANGES, TOW_OPTS, LENGTH_OPTS, TIERS, STEP_ICON, INERT, money, tradeLabel } from './answersText';
import TOW from '../tow.json';

const TOW_ROWS = TOW as [string, string, string, number, string][];
const TOW_SRC = { modelYear: 2026, source: 'RV LIFE 2026 Trailer Towing Guide' };

/* ───────── shared bits ───────── */
function useDraft(stepId: string) {
  const saved = useMemo(loadAnswers, []);
  const [a, setA] = useState<Answers>(saved);
  const set = (p: Partial<Answers>) => setA((x) => ({ ...x, ...p, sleepsMin: Math.max(1, (p.adults ?? x.adults) + (p.children ?? x.children)) }));
  const P = useMemo(() => poolOf(a), [a]);
  const P0 = useMemo(() => poolOf(saved), [saved]);
  const rows = caseRows(a, stepId);
  const next = () => { markDone(stepId, a); goNext(stepId); };
  return { a, set, P, prev: P0.pool.length, rows, next };
}
export function caseRows(a: Answers, cur: string): CaseRow[] {
  const vis = visibleSteps(a);
  const out: CaseRow[] = [];
  for (const s of vis) {
    if (s.id === cur) { out.push({ step: s.id, label: s.nav, value: answerText(s.id, a) || '—', icon: STEP_ICON[s.id] || 'check', current: true }); break; }
    out.push({ step: s.id, label: s.nav, value: answerText(s.id, a) || '—', icon: STEP_ICON[s.id] || 'check' });
  }
  return out;
}
const Note = ({ id, spec, children, tone }: { id: string; spec: string; children: ReactNode; tone?: 'warn' }) => (
  <p className={`mq-note${tone ? ` mq-note-${tone}` : ''}`} id={id} data-spec-id={spec} role="status"><Icon name="info" size={16} /> <span id={`${id}-t`}>{children}</span></p>
);
const Art = ({ id, icon }: { id: string; icon: string }) => <span className="mq-art" id={id}><Icon name={icon} size={44} stroke={1.6} /></span>;
const Group = ({ id, label, children }: { id: string; label?: string; children: ReactNode }) => (
  <div className="mq-group" id={id} data-spec-id={`sec-${id.replace(/^s-/, '')}`} data-bos-level="layer">
    {label && <span className="mq-group-l" id={`${id}-l`}>{label}</span>}
    {children}
  </div>
);
function Tiles({ sid, opts, sel, multi, onPick, hint, cols = 3 }: { sid: string; opts: { id: string; label: string; img?: string; icon?: string }[]; sel: string[]; multi?: boolean; onPick: (id: string) => void; hint?: (id: string) => string | undefined; cols?: number }) {
  return (
    <div className={`ct-grid mq-grid c${cols}`} id={`s-${sid}-grid`}>
      {opts.map((o) => (
        <ChoiceTile key={o.id} id={`s-${sid}-${o.id}`} specId={`input-choice-tile-${o.id}#${sid}`} label={o.label} hint={hint?.(o.id)} multi={multi}
          image={o.img} art={o.img ? undefined : <Art id={`s-${sid}-${o.id}-art`} icon={o.icon || 'circle-help'} />} selected={sel.includes(o.id)} onClick={() => onPick(o.id)} />
      ))}
    </div>
  );
}
function Chips({ sid, opts, sel, multi, onPick, dim }: { sid: string; opts: { id: string; label: string; icon?: string }[]; sel: string[]; multi?: boolean; onPick: (id: string) => void; dim?: boolean }) {
  return (
    <div className="mq-chips" id={`s-${sid}-chips`} role={multi ? 'group' : 'radiogroup'}>
      {opts.map((o) => {
        const on = sel.includes(o.id);
        return (
          <button type="button" key={o.id} id={`s-${sid}-${o.id}`} data-spec-id={`input-choice-chip-${o.id}#${sid}`} data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act"
            role={multi ? 'checkbox' : 'radio'} aria-checked={on} disabled={dim} className={`mq-chip${on ? ' on' : ''}`} onClick={() => onPick(o.id)}>
            {o.icon && <Icon name={o.icon} size={20} />}
            <span id={`s-${sid}-${o.id}-t`}>{o.label}</span>
            {on && <span className="mq-chip-ck" id={`s-${sid}-${o.id}-ck`} aria-hidden="true"><Icon name="check" size={14} stroke={3} /></span>}
          </button>
        );
      })}
    </div>
  );
}
function Stepper({ sid, k, label, value, min, max, onChange }: { sid: string; k: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = `s-${sid}-${k}`;
  return (
    <div className="mq-stepper" id={id} data-spec-id={`input-stepper-${k}#${sid}`} data-bos-class="input">
      <span className="mq-stepper-l" id={`${id}-l`}>{label}</span>
      <div className="mq-stepper-c" id={`${id}-c`} role="group" aria-labelledby={`${id}-l`}>
        <button type="button" id={`${id}-dec`} data-spec-id={`btn-action-${k}-minus#${sid}`} data-bos-class="action" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Icon name="minus" size={18} /></button>
        <output id={`${id}-v`} aria-live="polite">{value}</output>
        <button type="button" id={`${id}-inc`} data-spec-id={`btn-action-${k}-plus#${sid}`} data-bos-class="action" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Icon name="plus" size={18} /></button>
      </div>
    </div>
  );
}
function Range({ sid, k, label, value, min, max, step, fmt, ends, onChange, extra, disabled }: { sid: string; k: string; label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; ends: [string, string]; onChange: (v: number) => void; extra?: ReactNode; disabled?: boolean }) {
  const id = `s-${sid}-${k}`;
  return (
    <div className={`mq-range${disabled ? ' off' : ''}`} id={id}>
      <div className="mq-range-h" id={`${id}-h`}><label className="mq-group-l" id={`${id}-l`} htmlFor={`${id}-in`}>{label}</label><strong className="mq-range-v" id={`${id}-v`}>{fmt(value)}</strong></div>
      {extra}
      <input type="range" id={`${id}-in`} data-spec-id={`input-range-${k}#${sid}`} data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act" min={min} max={max} step={step} value={value} disabled={disabled}
        style={{ ['--p' as string]: `${((value - min) / (max - min)) * 100}%` }} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={fmt(value)} />
      <div className="mq-range-ends" id={`${id}-ends`}><span id={`${id}-min`}>{ends[0]}</span><span id={`${id}-max`}>{ends[1]}</span></div>
    </div>
  );
}
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <label className="mq-field" id={id} htmlFor={`${id}-in`}><span className="mq-group-l" id={`${id}-l`}>{label}</span>{children}</label>;
}
function Check({ id, spec, label, on, onChange }: { id: string; spec: string; label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mq-check" id={id}>
      <input type="checkbox" id={`${id}-in`} data-spec-id={spec} data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span id={`${id}-t`}>{label}</span>
    </label>
  );
}
const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const RECORDED = 'Recorded for your outfitter — no effect on matching.';
const fit = (P: ReturnType<typeof poolOf>) => P.pool.length;
const optHint = (a: Answers, P: ReturnType<typeof poolOf>) => (o: Opt) => liveText(o, a, P);

/* ───────── Camping today ───────── */
export function StepCamping() {
  const { a, set, P, prev, rows, next } = useDraft('camping');
  const opts = CAMPING.map((o) => ({ ...o, img: CAMPING_IMG[o.id as keyof typeof CAMPING_IMG] }));
  return (
    <StepFrame id="s-camping" stepId="camping" overline="Step 5 · Camping today" title="How are you camping today?" hint="Just so we know where you’re starting from." rows={rows} count={fit(P)} prev={prev}
      ctaOn={!!a.camping} disabledWhy="Pick one to continue" onContinue={next}>
      <Tiles sid="camping" opts={opts} sel={a.camping ? [a.camping] : []} onPick={(id) => set({ camping: id })} hint={(id) => opts.find((o) => o.id === id)?.hint} />
      <Note id="s-camping-note" spec="info-recorded-for-outfitter#camping">{RECORDED}</Note>
    </StepFrame>
  );
}

/* ───────── Q5 · Your camper (trade-in) ───────── */
const emptyTrade = (): Trade => ({ year: '', mfr: '', make: '', model: '', changes: [], text: '' });
const uniq = (x: string[]) => [...new Set(x.filter(Boolean))].sort();
export function StepTradeNow() {
  const { a, set, P, prev, rows, next } = useDraft('trade-now');
  const t = a.trade || emptyTrade();
  const put = (p: Partial<Trade>) => set({ trade: { ...t, ...p } });
  const units = SNAP().units;
  const mfrs = useMemo(() => uniq(units.map((u) => u.manufacturer)), [units]);
  const mfrHit = mfrs.find((m) => m.toUpperCase() === t.mfr.trim().toUpperCase());
  const makes = uniq(units.filter((u) => !mfrHit || u.manufacturer === mfrHit).map((u) => u.make));
  const models = uniq(units.filter((u) => (!mfrHit || u.manufacturer === mfrHit) && (!t.make || u.make.toUpperCase() === t.make.toUpperCase())).map((u) => u.model)).slice(0, 400);
  const years = Array.from({ length: 33 }, (_, i) => String(2027 - i));
  const combo = (f: keyof Trade, label: string, list: string[], ph: string, mode: 'text' | 'numeric' = 'text') => (
    <Field id={`s-trade-now-${f}`} label={label}>
      <input className="mq-input" id={`s-trade-now-${f}-in`} data-spec-id={`input-trade-${f}#trade-now`} data-bos-class="input" data-bos-perm="case.write" data-bos-access="act" type="text" inputMode={mode} autoComplete="off" list={`s-trade-now-${f}-dl`}
        value={t[f] as string} placeholder={ph} onChange={(e) => put(f === 'mfr' ? { mfr: e.target.value, make: '', model: '' } : f === 'make' ? { make: e.target.value, model: '' } : { [f]: e.target.value } as Partial<Trade>)} />
      <datalist id={`s-trade-now-${f}-dl`}>{list.map((v) => <option key={v} value={v} />)}</datalist>
    </Field>
  );
  return (
    <StepFrame id="s-trade-now" stepId="trade-now" overline="Step 6 · Your camper" title="What are you camping in now?" hint="Year, manufacturer, brand and model — pick from today’s lot or type it in." rows={rows} count={fit(P)} prev={prev} onContinue={next}>
      <Group id="s-trade-now-fields" label="Your current camper">
        <div className="mq-form4" id="s-trade-now-form">
          {combo('year', 'Year', years, 'e.g. 2018', 'numeric')}
          {combo('mfr', 'Manufacturer', mfrs, 'Pick or type')}
          {combo('make', 'Brand', makes, 'Pick or type')}
          {combo('model', 'Model / floorplan', models, 'Pick or type')}
        </div>
      </Group>
      <Note id="s-trade-now-note" spec="info-trade-lists-source#trade-now">The lists are the manufacturers, brands and models on our lot today — type yours in if it isn’t there.</Note>
      <Note id="s-trade-now-rec" spec="info-recorded-for-outfitter#trade-now">Trade-in record for your outfitter — no effect on matching.</Note>
    </StepFrame>
  );
}

/* ───────── Q6 · What to change ───────── */
export function StepTradeWhy() {
  const { a, set, P, prev, rows, next } = useDraft('trade-why');
  const t = a.trade || emptyTrade();
  const put = (p: Partial<Trade>) => set({ trade: { ...t, ...p } });
  return (
    <StepFrame id="s-trade-why" stepId="trade-why" overline="Step 7 · What to change" title="What would you change about your current camper?" hint="Pick anything that fits, or add a note." helper="Select all that apply." multi rows={rows} count={fit(P)} prev={prev} onContinue={next}>
      <Chips sid="trade-why" opts={TRADE_CHANGES} sel={t.changes} multi onPick={(id) => put({ changes: toggle(t.changes, id) })} />
      <Field id="s-trade-why-text" label="In your own words (optional)">
        <textarea className="mq-textarea" id="s-trade-why-text-in" data-spec-id="input-trade-notes#trade-why" data-bos-class="input" data-bos-perm="case.write" data-bos-access="act" maxLength={600} rows={3}
          placeholder="What’s working, what isn’t, what you’d want next time" value={t.text} onChange={(e) => put({ text: e.target.value })} />
      </Field>
      <Note id="s-trade-why-rec" spec="info-recorded-for-outfitter#trade-why">Trade-in record for your outfitter — no effect on matching.</Note>
    </StepFrame>
  );
}

/* ───────── Camping style ───────── */
export function StepCampStyle() {
  const { a, set, P, prev, rows, next } = useDraft('camp-style');
  return (
    <StepFrame id="s-camp-style" stepId="camp-style" overline="Step 8 · Camping style" title="What type of camping do you see yourself doing?" helper="Select all that apply." multi rows={rows} count={fit(P)} prev={prev} onContinue={next}>
      <Tiles sid="camp-style" cols={2} opts={CAMP_STYLE} sel={a.campStyle} multi onPick={(id) => set({ campStyle: toggle(a.campStyle, id) })} />
      <Note id="s-camp-style-note" spec="info-recorded-for-outfitter#camp-style">{RECORDED}</Note>
    </StepFrame>
  );
}

/* ───────── Activities ───────── */
export function StepActivities() {
  const { a, set, P, prev, rows, next } = useDraft('activities');
  return (
    <StepFrame id="s-activities" stepId="activities" overline="Step 9 · Activities" title="What activities do you see yourself doing with your RV?" helper="Select all that apply." multi rows={rows} count={fit(P)} prev={prev} onContinue={next}>
      <Chips sid="activities" opts={ACTIVITIES} sel={a.activities} multi onPick={(id) => set({ activities: toggle(a.activities, id) })} />
      <Field id="s-activities-other" label="Other">
        <input className="mq-input" id="s-activities-other-in" data-spec-id="input-other-activity#activities" data-bos-class="input" data-bos-perm="case.write" data-bos-access="act" type="text" placeholder="Other…" value={a.activitiesOther} onChange={(e) => set({ activitiesOther: e.target.value })} />
      </Field>
      <Note id="s-activities-note" spec="info-recorded-for-outfitter#activities">{RECORDED}</Note>
    </StepFrame>
  );
}

/* ───────── Sleeping (Who's coming) ───────── */
export function StepSleep() {
  const { a, set, P, prev, rows, next } = useDraft('sleep');
  const opts = childOpts(a).filter((o) => o.kind === 'gate' || splits(P.pool, o));
  const needKids = a.children > 0 && opts.length > 0;
  const miss = P.pool.filter((u) => u.sleeps == null).length;
  return (
    <StepFrame id="s-sleep" stepId="sleep" overline="Step 10 · Sleeping" title="How many people will you regularly be camping with?" hint="Everyone who needs a bed on a normal trip." rows={rows} count={fit(P)} prev={prev}
      ctaOn={!needKids || !!a.childSetup} disabledWhy="Pick a sleeping setup for the children or guests" onContinue={next}>
      <div className="mq-steppers" id="s-sleep-steppers">
        <Stepper sid="sleep" k="adults" label="Adults" value={a.adults} min={0} max={8} onChange={(v) => set({ adults: v })} />
        <Stepper sid="sleep" k="children" label="Children or guests" value={a.children} min={0} max={8} onChange={(v) => set({ children: v, ...(v === 0 ? { childSetup: null } : {}) })} />
        <Stepper sid="sleep" k="pets" label="Pets" value={a.pets} min={0} max={8} onChange={(v) => set({ pets: v })} />
      </div>
      <p className="mq-line" id="s-sleep-line" data-spec-id="metric-sleeps-fit" aria-live="polite">Sleeps <b id="s-sleep-line-n">{a.adults + a.children}</b> · {n(P.verified.length)} campers fit, {n(P.probable.length)} need a quick check</p>
      {needKids && (
        <Group id="s-sleep-kids" label={isMotorOnly(a) ? 'Where do the kids sleep?' : 'For the children or guests, what sleeping setup works?'}>
          <Tiles sid="sleep" opts={opts.map((o) => ({ id: o.id, label: o.title, img: o.img, icon: o.icon }))} sel={a.childSetup ? [a.childSetup] : []} onPick={(id) => set({ childSetup: id })} hint={(id) => optHint(a, P)(opts.find((o) => o.id === id)!)} />
        </Group>
      )}
      {P.pool.length > 0 && <Note id="s-sleep-good" spec="info-good-to-know#sleep">{miss > 0 ? <><b>Good to know.</b> {n(miss)} of the {n(P.pool.length)} campers in the running don’t list a sleep count yet, so they show as “need a quick check” instead of dropping out.</> : <><b>Good to know.</b> Every one of the {n(P.pool.length)} campers in the running lists a sleep count.</>}</Note>}
    </StepFrame>
  );
}

/* ───────── Bedroom ───────── */
export function StepBedroom() {
  const { a, set, P, prev, rows, next } = useDraft('bedroom');
  const opts = bedroomOpts(a).filter((o) => o.kind !== 'rank' || splits(P.pool, o));
  return (
    <StepFrame id="s-bedroom" stepId="bedroom" overline="Step 11 · Bedroom" title="Do you need a private bedroom?" hint="Some couples want a door; some want the space." rows={rows} count={fit(P)} prev={prev}
      ctaOn={!!a.bedroom} disabledWhy="Pick one to continue" onContinue={next}>
      <Tiles sid="bedroom" cols={opts.length} opts={opts.map((o) => ({ id: o.id, label: o.title, img: o.img, icon: o.icon }))} sel={a.bedroom ? [a.bedroom] : []} onPick={(id) => set({ bedroom: id })} hint={(id) => optHint(a, P)(opts.find((o) => o.id === id)!)} />
    </StepFrame>
  );
}

/* ───────── Towing ───────── */
export function StepTow() {
  const { a, set, P, prev, rows, next } = useDraft('tow');
  const makes = useMemo(() => uniq(TOW_ROWS.map((r) => r[0])), []);
  const models = a.towMk ? uniq(TOW_ROWS.filter((r) => r[0] === a.towMk).map((r) => r[1])) : [];
  const engines = a.towMk && a.towMd ? uniq(TOW_ROWS.filter((r) => r[0] === a.towMk && r[1] === a.towMd).map((r) => r[2])) : [];
  const matches = a.towMk && a.towMd && a.towEn ? TOW_ROWS.filter((r) => r[0] === a.towMk && r[1] === a.towMd && r[2] === a.towEn) : [];
  const ready = !!(a.towYr && a.towMk && a.towMd && a.towEn && a.towIdx != null);
  const [manual, setManual] = useState(!!a.towRating && !ready);
  const years = Array.from({ length: TOW_SRC.modelYear + 2 - 2000 }, (_, i) => String(TOW_SRC.modelYear + 1 - i));
  const pick = (f: 'towYr' | 'towMk' | 'towMd' | 'towEn', v: string) => {
    const nx = { ...a, [f]: v } as Answers;
    if (f === 'towMk') { nx.towMd = ''; nx.towEn = ''; }
    if (f === 'towMd') nx.towEn = '';
    let p: Partial<Answers> = { [f]: v, towMd: nx.towMd, towEn: nx.towEn };
    if (f !== 'towYr') {
      const m = nx.towMk && nx.towMd && nx.towEn ? TOW_ROWS.filter((r) => r[0] === nx.towMk && r[1] === nx.towMd && r[2] === nx.towEn) : [];
      p = { ...p, towIdx: m.length === 1 ? 0 : null, ...(m.length === 1 ? { towRating: m[0][3] } : {}) };
    }
    set({ ...p, towLabel: [nx.towYr, nx.towMk, nx.towMd].filter(Boolean).join(' ') });
  };
  const sel = (f: 'towYr' | 'towMk' | 'towMd' | 'towEn', label: string, list: string[]) => (
    <Field id={`s-tow-${f}`} label={label}>
      <select className="mq-select" id={`s-tow-${f}-in`} data-spec-id={`input-tow-${f.slice(3).toLowerCase()}#tow`} data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act" value={a[f]} disabled={!list.length} onChange={(e) => pick(f, e.target.value)}>
        <option value="">{label}</option>{list.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    </Field>
  );
  const g = gvwrOf(a);
  const opts = TOW_OPTS.map((o) => ({ ...o, img: TOW_IMG[o.id as 'yes' | 'delivery'], icon: 'circle-help' }));
  return (
    <StepFrame id="s-tow" stepId="tow" overline="Step 12 · Towing" title="How will you get your new RV home?" hint="If you’re towing it, we’ll keep you inside what your vehicle can pull." rows={rows} count={fit(P)} prev={prev}
      ctaOn={!!a.tow} disabledWhy="Pick one to continue" onContinue={next}>
      <Tiles sid="tow" opts={opts} sel={a.tow ? [a.tow] : []} onPick={(id) => set({ tow: id })}
        hint={(id) => (id === 'yes' ? 'Heavier campers drop out' : id === 'no' ? 'No weight limit yet' : 'No tow vehicle needed')} />
      {a.tow === 'yes' && (
        <Group id="s-tow-vehicle" label="What are you going to tow with?">
          <div className="mq-form4" id="s-tow-form">
            {sel('towYr', 'Year', years)}{sel('towMk', 'Make', makes)}{sel('towMd', 'Model', models)}{sel('towEn', 'Engine', engines)}
          </div>
          {matches.length === 1 && a.towIdx === 0 && <p className="mq-ok" id="s-tow-match" data-spec-id="info-tow-rating-found"><Icon name="check" size={16} stroke={3} /> Rated to tow {n(matches[0][3])} lbs{matches[0][4] ? ` — ${matches[0][4]}` : ''}</p>}
          {matches.length > 1 && (
            <>
              <Note id="s-tow-multi" spec="info-tow-multiple-ratings">This configuration has more than one published rating — pick the one that matches your truck:</Note>
              <Chips sid="tow-rating" opts={matches.map((r, i) => ({ id: String(i), label: `${n(r[3])} lbs${r[4] ? ` · ${r[4]}` : ''}` }))} sel={a.towIdx == null ? [] : [String(a.towIdx)]} onPick={(id) => set({ towIdx: Number(id), towRating: matches[Number(id)][3] })} />
            </>
          )}
          {a.towYr && Number(a.towYr) !== TOW_SRC.modelYear && <Note id="s-tow-year" spec="info-tow-model-year">These ratings are published for the {TOW_SRC.modelYear} model year. Use them as a guide for your {a.towYr} and confirm the number on your door-jamb sticker or owner’s manual.</Note>}
          {(ready || manual) ? (
            <>
              <Range sid="tow" k="rating" label={manual && !ready ? 'Set it yourself' : 'Adjust the number if you need to'} value={Number(a.towRating) || 7500} min={1000} max={30000} step={100} fmt={(v) => `${n(v)} lbs`} ends={['1,000 lbs', '30,000 lbs']}
                onChange={(v) => set({ towRating: v, towIdx: null })} />
              <Group id="s-tow-margin" label="Safety margin">
                <Chips sid="tow-margin" opts={[{ id: 'derived', label: 'Leave 10% headroom' }, { id: 'raw', label: 'Use the exact number' }]} sel={[a.towMode]} onPick={(id) => set({ towMode: id as 'derived' | 'raw' })} />
              </Group>
              {g && <Note id="s-tow-limit" spec="info-tow-limit">We’ll show campers up to <b>{n(g)} lbs</b>{a.towMode === 'derived' ? ' — 90% of your rating as a safety margin' : ''}. Heavier ones drop out; unknown weights get a quick check.</Note>}
            </>
          ) : (
            <>
              <Note id="s-tow-none" spec="info-tow-no-limit-yet">No weight limit yet — pick your year, make, model and engine above and we’ll set it from the published rating.</Note>
              <button type="button" className="mq-link" id="s-tow-manual" data-spec-id="btn-action-set-tow-rating-myself" data-bos-class="action" onClick={() => { setManual(true); if (!a.towRating) set({ towRating: 7500 }); }}>My vehicle isn’t listed — set the number myself</button>
            </>
          )}
          <p className="mq-src" id="s-tow-src" data-spec-id="info-data-source#tow">Source: {TOW_SRC.source} · {TOW_SRC.modelYear} model year.</p>
        </Group>
      )}
    </StepFrame>
  );
}

/* ───────── Length ───────── */
export function StepLength() {
  const { a, set, P, prev, rows, next } = useDraft('length');
  const mode = a.lengthMode || 'none';
  const base = useMemo(() => { const c = E().candidates(unitsFor(a) as never, { ...P.session.gates, lengthMaxFt: null }); return c.verified.concat(c.probable); }, [P]);
  const atLen = (ft: number) => { const cap = ft >= 41 ? Infinity : ft * 12; let fitN = 0, unk = 0; base.forEach((u) => { if (u.lengthIn == null) unk++; else if (u.lengthIn <= cap) fitN++; }); return `${n(fitN + unk)} campers fit at this length${unk ? ` · ${n(unk)} don’t list a length` : ''}`; };
  const r = P.pool.map((u) => u.lengthIn).filter((v): v is number => v != null);
  return (
    <StepFrame id="s-length" stepId="length" overline="Step 13 · Length" title="Do you have a hard length limit?" hint="Storage spot, driveway or favorite campsite — anything with a limit." rows={rows} count={fit(P)} prev={prev} onContinue={next}>
      <Tiles sid="length" opts={LENGTH_OPTS} sel={[mode]} onPick={(id) => set({ lengthMode: id, ...(id === 'hard' && !(a.lengthFt > 0) ? { lengthFt: 30 } : {}) })}
        hint={(id) => (id === 'hard' ? 'Longer units drop out' : id === 'soft' ? 'Shorter units rank higher' : 'Every length stays in')} />
      {mode === 'hard' && <Range sid="length" k="max" label="Maximum length" value={a.lengthFt || 30} min={16} max={41} step={1} fmt={(v) => (v >= 41 ? '40+ ft · no limit' : `${v} ft`)} ends={['16 ft', '40+ ft']} onChange={(v) => set({ lengthFt: v })}
        extra={<span className="mq-live" id="s-length-live" data-spec-id="metric-length-fit" aria-live="polite">{atLen(a.lengthFt || 30)}</span>} />}
      {r.length > 0 && <Note id="s-length-range" spec="info-length-range">Campers in the running right now run {Math.round(Math.min(...r) / 12)}–{Math.round(Math.max(...r) / 12)} ft{P.pool.length - r.length > 0 ? `, and ${n(P.pool.length - r.length)} don’t list a length` : ''}.</Note>}
    </StepFrame>
  );
}

/* ───────── Q13 · Garage ───────── */
export function StepGarage() {
  const { a, set, P, prev, rows, next } = useDraft('garage');
  const mode = a.garageAny ? 'any' : a.garageFt ? 'need' : null;
  return (
    <StepFrame id="s-garage" stepId="garage" overline="Step 14 · Garage" title="How long does the garage need to be?" hint="Measure your longest toy — we’ll skip garages that are shorter." rows={rows} count={fit(P)} prev={prev}
      ctaOn={!!mode && (mode === 'any' || !!a.garageFt)} disabledWhy="Pick one, or enter your length" onContinue={next}>
      <Tiles sid="garage" cols={2} opts={[{ id: 'need', label: 'I know my length', icon: 'ruler' }, { id: 'any', label: 'Any garage is fine', icon: 'warehouse' }]} sel={mode ? [mode] : []}
        onPick={(id) => set(id === 'any' ? { garageAny: true, garageFt: null } : { garageAny: false, garageFt: a.garageFt || 12 })} hint={(id) => (id === 'need' ? 'Shorter garages drop out' : 'Garage length shows on every result')} />
      {mode === 'need' && (
        <Field id="s-garage-ft" label="Garage length needed">
          <span className="mq-input-row" id="s-garage-ft-row">
            <input className="mq-input" id="s-garage-ft-in" data-spec-id="input-garage-length-feet#garage" data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act" type="text" inputMode="numeric" placeholder="12"
              value={a.garageFt || ''} onChange={(e) => set({ garageFt: Number(e.target.value.replace(/[^0-9]/g, '')) || null })} />
            <span className="mq-suffix" id="s-garage-ft-suffix">feet</span>
          </span>
        </Field>
      )}
      <p className="mq-line" id="s-garage-line" data-spec-id="metric-garage-fit" aria-live="polite"><b id="s-garage-line-n">{n(P.pool.length)}</b> campers fit</p>
      {a.sub.includes('garage') && <Note id="s-garage-from4" spec="info-garage-from-step-4">You set this in Step 4 (With garage). Change it here and both stay in step.</Note>}
    </StepFrame>
  );
}

/* ───────── Bathroom / Inside / Outside (multi, ranking; "must" cards become hard gates) ───────── */
const MULTI = {
  bath: { title: 'What matters in the bathroom?', nav: 'Bathroom', pos: 15 },
  inside: { title: 'Inside the camper, what matters most?', nav: 'Inside', pos: 16 },
  outside: { title: 'Outside the camper, what matters?', nav: 'Outside', pos: 17 },
};
export function StepMulti({ k }: { k: 'bath' | 'inside' | 'outside' }) {
  const { a, set, P, prev, rows, next } = useDraft(k);
  const cfg = MULTI[k];
  const opts = multiOpts(k, a, P.pool);
  const sel = a[k];
  const mustKey = `${k}Must` as 'bathMust';
  const pickOne = (id: string) => {
    if (id === 'open') return set({ [k]: [], [mustKey]: [] } as Partial<Answers>);
    const nx = toggle(sel, id); set({ [k]: nx, [mustKey]: a[mustKey].filter((x) => nx.includes(x)) } as Partial<Answers>);
  };
  const shown = sel.length ? sel : ['open'];
  const mustable = opts.filter((o) => o.must && sel.includes(o.id));
  return (
    <StepFrame id={`s-${k}`} stepId={k} overline={`Step ${cfg.pos} · ${cfg.nav}`} title={cfg.title} helper="Select all that apply." multi rows={rows} count={fit(P)} prev={prev} onContinue={next}>
      <Tiles sid={k} cols={Math.min(opts.length, 4)} opts={opts.map((o) => ({ id: o.id, label: o.title, img: o.img, icon: o.icon }))} sel={shown} multi onPick={pickOne} hint={(id) => optHint(a, P)(opts.find((o) => o.id === id)!)} />
      {mustable.map((o) => (
        <Check key={o.id} id={`s-${k}-must-${o.id}`} spec={`input-must-have-${o.id}#${k}`} label={`Must have: ${o.title.toLowerCase()} (campers without it drop out)`} on={a[mustKey].includes(o.id)}
          onChange={(v) => set({ [mustKey]: v ? [...a[mustKey], o.id] : a[mustKey].filter((x) => x !== o.id) } as Partial<Answers>)} />
      ))}
      <Note id={`s-${k}-note`} spec={`info-ranking-preference#${k}`}>These rank matching campers higher. Nothing drops out unless you mark it a must.</Note>
    </StepFrame>
  );
}

/* ───────── Slide-outs ───────── */
export function StepSize() {
  const { a, set, P, prev, rows, next } = useDraft('size');
  const O = catalogue(); const opts = [O.space, O.balanced, O.simple];
  return (
    <StepFrame id="s-size" stepId="size" overline="Step 18 · Slide-outs" title="More room with slide-outs, or lighter and simpler?" hint="Slide-outs add space when you’re parked, and weight on the road." rows={rows} count={fit(P)} prev={prev}
      ctaOn={!!a.size} disabledWhy="Pick one to continue" onContinue={next}>
      <Tiles sid="size" opts={opts.map((o) => ({ id: o.id, label: o.title, img: o.img, icon: o.icon }))} sel={a.size ? [a.size] : []} onPick={(id) => set({ size: id })} hint={(id) => optHint(a, P)(opts.find((o) => o.id === id)!)} />
    </StepFrame>
  );
}

/* ───────── Build ───────── */
export function StepBuild() {
  const { a, set, P, prev, rows, next } = useDraft('build');
  const O = catalogue(); const opts = [O.laminate, O.value, O.either];
  return (
    <StepFrame id="s-build" stepId="build" overline="Step 19 · Build" title="How should the walls be built?" hint="Would you pay more for fiberglass walls, or go for the most camper per dollar?" rows={rows} count={fit(P)} prev={prev}
      ctaOn={!!a.build} disabledWhy="Pick one to continue" onContinue={next}>
      <Tiles sid="build" opts={opts.map((o) => ({ id: o.id, label: o.title, img: o.img, icon: o.icon }))} sel={a.build ? [a.build] : []} onPick={(id) => set({ build: id, ...(id === 'either' ? { buildMust: false } : {}) })} hint={(id) => optHint(a, P)(opts.find((o) => o.id === id)!)} />
      {a.build && a.build !== 'either' && <Check id="s-build-must" spec="input-only-this-construction#build" label="Only show me this construction" on={a.buildMust} onChange={(v) => set({ buildMust: v })} />}
    </StepFrame>
  );
}

/* ───────── Budget ───────── */
export function StepBudget() {
  const { a, set, P, prev, rows, next } = useDraft('budget');
  const c = ceilingOf(a); const f = financeOf(a);
  const stores = Object.values(SNAP().lookups.rooftops || {}).filter((r) => r.storeName && !['CRD', 'MSV', 'LIN'].includes(r.location)).sort((x, y) => (x.storeName || '').localeCompare(y.storeName || ''));
  return (
    <StepFrame id="s-budget" stepId="budget" overline="Step 20 · Budget" title="How do you want to set your budget?" hint="Tell us a cash ceiling or a monthly payment and we’ll stay inside it." rows={rows} count={fit(P)} prev={prev}
      ctaOn={!!a.budgetMode} disabledWhy="Pick cash or monthly payment to continue" onContinue={next}>
      <Tiles sid="budget" cols={2} opts={[{ id: 'cash', label: 'Paying cash', icon: 'banknote' }, { id: 'finance', label: 'Monthly payment', icon: 'credit-card' }]} sel={a.budgetMode ? [a.budgetMode] : []}
        onPick={(id) => set({ budgetMode: id as 'cash' | 'finance', ...(id === 'finance' ? { payment: a.payment > 0 ? a.payment : 750, down: a.down > 0 ? a.down : 5500 } : {}) })} hint={(id) => (id === 'cash' ? 'Your maximum becomes the price ceiling' : 'Payment, down and credit solve to a price')} />
      {a.budgetMode === 'cash' && (
        <>
          <Field id="s-budget-cash" label="Maximum you would spend">
            <span className="mq-input-row" id="s-budget-cash-row">
              <span className="mq-prefix" id="s-budget-cash-prefix">$</span>
              <input className="mq-input" id="s-budget-cash-in" data-spec-id="input-max-spend#budget" data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act" type="text" inputMode="numeric" placeholder="45,000"
                value={a.maxSpend ? a.maxSpend.toLocaleString('en-US') : ''} onChange={(e) => set({ maxSpend: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })} />
              <span className="mq-suffix" id="s-budget-cash-suffix">USD</span>
            </span>
          </Field>
          {c ? <Note id="s-budget-cash-note" spec="info-price-ceiling">We’ll show campers up to <b>{money(c)}</b> (sale price, rounded to the nearest $500). Ones without a listed price get a quick check.</Note>
            : <Note id="s-budget-cash-note" spec="info-price-ceiling">The average camper sells for about $47,653. Enter your own maximum to set the ceiling.</Note>}
        </>
      )}
      {a.budgetMode === 'finance' && (
        <>
          <Group id="s-budget-credit" label="First, how would you rate your credit?">
            <Chips sid="budget-tier" opts={TIERS} sel={a.tier ? [a.tier] : []} onPick={(id) => set({ tier: id })} />
          </Group>
          <Note id="s-budget-apr" spec="info-apr-estimate">{a.tier ? `We estimate with ${APR[a.tier]} APR for that tier.` : 'Pick a tier to unlock the payment and down-payment sliders.'}</Note>
          <Range sid="budget" k="payment" label="Monthly payment" value={a.payment || 750} min={150} max={1350} step={25} fmt={(v) => `${money(v)}${v >= 1350 ? '+' : ''} a month`} ends={['$150', '$1,350+']} disabled={!a.tier} onChange={(v) => set({ payment: v })}
            extra={<span className="mq-live" id="s-budget-payment-avg" data-spec-id="info-average-payment">The average camper payment is about $436 a month.</span>} />
          <Range sid="budget" k="down" label="Down payment" value={a.down} min={1000} max={10000} step={500} fmt={(v) => `${money(v)}${v >= 10000 ? '+' : ''}`} ends={['$1,000', '$10,000+']} disabled={!a.tier} onChange={(v) => set({ down: v })} />
          <Field id="s-budget-store" label="Closest Bish’s store">
            <select className="mq-select" id="s-budget-store-in" data-spec-id="input-closest-store#budget" data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act" value={a.store} onChange={(e) => set({ store: e.target.value })}>
              <option value="">Not sure yet · 6% tax estimate</option>
              {stores.map((r) => <option key={r.location} value={r.location}>{r.storeName}</option>)}
            </select>
          </Field>
          {a.tier && <Note id="s-budget-reach" spec="info-payment-reaches">{f ? (f.valid ? <>That payment reaches campers up to <b>{money(f.ceiling)}</b> (sale price). Your closest store sets the tax rate.</> : f.message) : 'Slide to a monthly payment to see the price range it supports.'}</Note>}
        </>
      )}
    </StepFrame>
  );
}

/* ───────── Summary ───────── */
export function StepSummary() {
  const a = useMemo(loadAnswers, []);
  const P = useMemo(() => poolOf(a), [a]);
  const pos = posOf('summary', a);
  const vis = pos.vis.filter((s) => s.id !== 'summary');
  const missing = vis.filter((s) => s.id !== '01' && !a.done.includes(s.id) && !INERT.includes(s.id));
  const ready = missing.length === 0;
  const pct = 100;
  return (
    <div className="ss-frame" id="ss-frame" data-spec-id="frame-smart-shopper" data-bos-level="frame">
      <SiteHeader prefix="sq" />
      <div className="ssw" id="s-summary-root" data-layer="canvas" data-bos-level="screen" data-bos-screen="summary">
        <div className="ssw-in mq-sum-in" id="s-summary-in">
          <div className="ssw-main" id="s-summary-main">
            <nav className="ssq-prog" id="s-summary-progress" data-spec-id="nav-progress" data-bos-level="section" data-bos-type="nav" aria-label={`Step ${pos.pos} of ${pos.total}`}>
              <div className="ssq-track" id="s-summary-track"><span id="s-summary-track-fill" style={{ width: `${pct}%` }} /></div>
              <span className="ssq-prog-t" id="s-summary-progress-label" data-spec-id="label-step-counter">Step {pos.pos} of {pos.total}</span>
            </nav>
            <section className="tone-card ssw-card" id="s-summary-question" data-spec-id="sec-summary" data-bos-level="section" data-bos-type="question" aria-labelledby="s-summary-title">
              <div className="overline" id="s-summary-overline" data-spec-id="label-step">Step {pos.pos} · Summary</div>
              <h1 className="t-title ssw-title" id="s-summary-title" data-spec-id="label-question">Everything you told us</h1>
              <p className="t-subtitle ssw-hint" id="s-summary-hint" data-spec-id="info-question-hint">Check it over and edit anything that isn’t right. Then submit, and we’ll match you against the <b id="s-summary-fit">{n(P.pool.length)}</b> campers that fit today.</p>
              <ol className="mq-sum" id="s-summary-list" data-spec-id="list-summary-answers">
                {vis.map((s) => {
                  const rowsKV: [string, string][] = s.id === 'budget' ? budgetRows(a) : [[navOf(s.id), answerText(s.id, a) || '—']];
                  const miss = missing.some((m) => m.id === s.id);
                  return (
                    <li key={s.id} className={`mq-sum-g${miss ? ' miss' : ''}`} id={`s-summary-g-${s.id}`} data-spec-id={`card-summary-group#${s.id}`}>
                      <span className="mq-sum-ic" id={`s-summary-g-${s.id}-ic`}><Icon name={STEP_ICON[s.id] || 'check'} size={18} /></span>
                      <div className="mq-sum-b" id={`s-summary-g-${s.id}-b`}>
                        <div className="mq-sum-h" id={`s-summary-g-${s.id}-h`}>
                          <span className="mq-sum-l" id={`s-summary-g-${s.id}-l`}>{s.nav}</span>
                          {INERT.includes(s.id) && <span className="chip chip-neutral" id={`s-summary-g-${s.id}-inert`} data-spec-id="label-recorded-for-outfitter">For your outfitter</span>}
                          {miss && <span className="chip mq-chip-bad" id={`s-summary-g-${s.id}-miss`} data-spec-id="label-needs-an-answer">Needs an answer</span>}
                        </div>
                        <dl className="mq-sum-dl" id={`s-summary-g-${s.id}-dl`}>
                          {rowsKV.map(([k, v], i) => (
                            <div className="mq-sum-row" key={k} id={`s-summary-g-${s.id}-r${i}`}><dt id={`s-summary-g-${s.id}-r${i}-k`}>{k}</dt><dd id={`s-summary-g-${s.id}-r${i}-v`}>{v}</dd></div>
                          ))}
                        </dl>
                      </div>
                      {s.id !== '01' && <button type="button" className="cs-edit mq-sum-edit" id={`s-summary-g-${s.id}-edit`} data-spec-id={`btn-action-edit-answer#${s.id}`} data-bos-class="action" data-bos-perm="discovery.navigate" data-bos-access="act" aria-label={`Edit ${s.nav}`} onClick={() => goEdit(s.id, 'summary')}>Edit</button>}
                    </li>
                  );
                })}
              </ol>
              {!ready && <Note id="s-summary-missing" spec="info-summary-missing" tone="warn"><b>{missing.length} question{missing.length > 1 ? 's' : ''} still need{missing.length > 1 ? '' : 's'} an answer</b> — tap Edit on the highlighted group to finish.</Note>}
            </section>
            <div className="ssw-act mq-sum-act" id="s-summary-act" data-spec-id="sec-step-footer" data-bos-level="section" data-bos-type="footer">
              <div className="ssw-btns" id="s-summary-btns">
                <Button kind="action" id="s-summary-prev" data-spec-id="btn-action-previous" aria-label="Previous" className="ssw-prev" onClick={() => go(pos.prev)}>
                  <Icon name="chevrons-left" size={18} /><span className="ssw-prev-t">Previous</span>
                </Button>
                <button type="button" className="ssw-trade" id="s-summary-trade-in" data-spec-id="btn-action-have-a-trade-in" data-bos-class="action" onClick={() => go('trade-now', '&ret=summary')}>{tradeLabel(a) ? 'Trade-in added' : 'Have a trade in'}</button>
                <Button kind="commit" id="s-summary-submit" data-spec-id="btn-commit-submit-for-matches" size="lg" trailingIcon="arrow-right" className="ssw-cta" disabled={!ready} aria-disabled={!ready} onClick={() => go('qload')}>Submit for your Smart Shopper Unit Matches</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

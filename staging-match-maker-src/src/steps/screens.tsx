import { useState } from 'react';
import { ChoiceTile } from './ChoiceTile';
import { BumperHitchArt, FifthWheelHitchArt } from './HitchArt';
import { StepFrame } from './Step';
import type { CaseRow } from './Case';
import flow from './flow.json';
import { count as cnt, storesFromUrl, unitsAt, STORES, BUCKETS } from './inventory';
import { go, markDone, loadAnswers } from '../answers';
import { goNext } from './flowSteps';
const A0 = loadAnswers();
const withOther = (own: string[], keepBuckets: string[]) => [...new Set([...own, ...keepBuckets.flatMap((b) => BUCKETS[b] || [])])];

const classesFor = (ids: string[]) => [...new Set(ids.flatMap((id) => BUCKETS[id] || []))];

const SEL = storesFromUrl(); // hard store filter carried from Step 1 (?stores=MID,CRD); null = all locations
const live = <T extends { id: string }>(opts: T[]) => opts.map((o) => ({ ...o, count: cnt(o.id, SEL) }));
const whereLabel = SEL ? (SEL.length === 1 ? STORES.find((x) => x.code === SEL[0])?.name || '1 store' : `${SEL.length} stores`) : 'All locations';

const img = (f: string) => `img/${f}`;
const fmt = (n: number) => `${n.toLocaleString('en-US')} campers fit`;
const S = flow.steps;
type Opt = { id: string; label: string; count: number; img?: string; art?: string };
const sum = (opts: Opt[], sel: string[]) => opts.filter((o) => sel.includes(o.id)).reduce((a, o) => a + o.count, 0);
const names = (opts: Opt[], sel: string[]) => opts.filter((o) => sel.includes(o.id)).map((o) => o.label).join(', ') || '—';
const startRow: CaseRow = { step: '01', label: 'Start', value: `No unit in mind · ${whereLabel}`, icon: 'map-pin' };

function useMulti(init: string[]) {
  const [sel, setSel] = useState<string[]>(init);
  return [sel, (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))] as const;
}

export function Step2Path({ sheet }: { sheet?: boolean }) {
  const c = { ...S['02'], options: live(S['02'].options) }; const [sel, toggle] = useMulti(A0.path);
  const rows: CaseRow[] = [startRow, { step: '02', label: c.caseLabel, value: names(c.options, sel), icon: c.icon, current: true }];
  return (
    <StepFrame id="s02" pos={2} overline={c.overline} title={c.title} hint={c.hint} helper={flow.multiHelper} multi rows={rows} answered={1}
      count={sel.length ? sum(c.options, sel) : unitsAt(SEL)} prev={unitsAt(SEL)} ctaOn={sel.length > 0} disabledWhy="Pick one to continue" sheetOpen={sheet}
      answersForCounter={{ ...loadAnswers(), path: sel, classes: sel.length ? classesFor(sel) : [], hitch: sel.includes('towable') ? loadAnswers().hitch : [], sub: sel.includes('towable') ? loadAnswers().sub : [], fifthSub: sel.includes('towable') ? loadAnswers().fifthSub : [], motor: sel.includes('motorhome') ? loadAnswers().motor : [] }}
      onBack={() => go('01')}
      onContinue={() => { markDone('02', { stores: SEL, classes: classesFor(sel), path: sel, ...(sel.includes('towable') ? {} : { hitch: [], sub: [], fifthSub: [] }), ...(sel.includes('motorhome') ? {} : { motor: [] }) }); goNext('02'); }}>
      <div className="ct-grid g3" id="s02-grid">
        {c.options.map((o) => <ChoiceTile key={o.id} id={`s02-${o.id}`} specId={`input-choice-tile-${o.id}#02`} label={o.label} hint={fmt(o.count)} image={img(o.img)} multi selected={sel.includes(o.id)} disabled={o.count === 0} onClick={() => toggle(o.id)} />)}
      </div>
    </StepFrame>
  );
}

export function Step3Type({ sheet }: { sheet?: boolean }) {
  const c = { ...S['03'], options: live(S['03'].options as Opt[]) }; const [sel, toggle] = useMulti(A0.hitch);
  const art = (a?: string) => a === 'bumper' ? <BumperHitchArt id="s03-bumper-art" /> : a === 'fifth' ? <FifthWheelHitchArt id="s03-fifth-art" /> : undefined;
  const rows: CaseRow[] = [startRow, { step: '02', label: S['02'].caseLabel, value: 'Towable', icon: 'compass' }, { step: '03', label: c.caseLabel, value: names(c.options, sel), icon: c.icon, current: true }];
  const towableCount = cnt('towable', SEL);
  return (
    <StepFrame id="s03" pos={3} overline={c.overline} title={c.title} hint={c.hint} helper={flow.multiHelper} multi rows={rows} answered={2}
      count={sel.length ? sum(c.options as Opt[], sel) : towableCount} prev={cnt('towable', SEL)} ctaOn={sel.length > 0} sheetOpen={sheet}
      answersForCounter={{ ...loadAnswers(), hitch: sel, ...(sel.includes('bumper') ? {} : { sub: [] }), ...(sel.includes('fifth') ? {} : { fifthSub: [] }) }}
      onBack={() => go('02')}
      onContinue={() => { markDone('03', { stores: SEL, classes: withOther(classesFor(sel), A0.path.filter((x) => x !== 'towable')), hitch: sel, ...(sel.includes('bumper') ? {} : { sub: [] }), ...(sel.includes('fifth') ? {} : { fifthSub: [] }) }); goNext('03'); }}>
      <div className="ct-grid g3 hitch" id="s03-grid">
        {(c.options as Opt[]).map((o) => <ChoiceTile key={o.id} id={`s03-${o.id}`} specId={`input-choice-tile-${o.id}#03`} label={o.label} hint={fmt(o.count)}
          image={o.img ? img(o.img) : undefined} art={art(o.art)} multi selected={sel.includes(o.id)} disabled={o.count === 0} onClick={() => toggle(o.id)} />)}
      </div>
    </StepFrame>
  );
}

// Step 4 · Bumper pull. "With garage" is a normal card: the garage length is asked once, on the Garage question
// (live Q13 wording, also asked for fifth-wheel toy haulers), so Step 4 no longer opens its own garage-length sheet.
export function Step4Bumper({ sheet }: { sheet?: boolean }) {
  const c = { ...S['04'], options: live(S['04'].options) };
  const [sel, toggle] = useMulti(A0.sub);
  const count = sum(c.options, sel);
  const rows: CaseRow[] = [startRow, { step: '02', label: 'Path', value: 'Towable', icon: 'compass' }, { step: '03', label: 'Towable type', value: 'Bumper pull', icon: 'truck' },
    { step: '04', label: c.caseLabel, value: names(c.options, sel), icon: c.icon, current: true }];
  const classes = () => withOther(classesFor(sel.length ? sel : ['bumper']), [...A0.hitch.filter((x) => x !== 'bumper'), ...A0.path.filter((x) => x !== 'towable')]);
  return (
    <StepFrame id="s04" pos={4} overline={c.overline} title={c.title} helper={flow.multiHelper} multi rows={rows} answered={3}
      count={sel.length ? count : cnt('bumper', SEL)} prev={cnt('bumper', SEL)} ctaOn={sel.length > 0} disabledWhy="Pick one to continue" sheetOpen={sheet}
      answersForCounter={{ ...loadAnswers(), sub: sel, classes: classes() }}
      onBack={() => go('03')}
      onContinue={() => {
        const cls = classes();
        // Keep the Garage answer while a toy hauler is still in play; clear it when none is.
        const toy = cls.some((x) => x === 'TTTH' || x === 'FWTH');
        markDone('04', { stores: SEL, classes: cls, sub: sel, ...(toy ? {} : { garageFt: null, garageFts: [], garageAny: false }) });
        goNext('04');
      }}>
      <div className="ct-grid g5" id="s04-grid">
        {c.options.map((o) => <ChoiceTile key={o.id} id={`s04-${o.id}`} specId={`input-choice-tile-${o.id}#04`} label={o.label} hint={fmt(o.count)} image={img(o.img)} multi
          selected={sel.includes(o.id)} disabled={o.count === 0} onClick={() => toggle(o.id)} />)}
      </div>
    </StepFrame>
  );
}

export function StepFifth({ sheet }: { sheet?: boolean }) {
  const c = { ...S.fw, options: live(S.fw.options as Opt[]) };
  const [sel, toggle] = useMulti(A0.fifthSub || []);
  const art = (a?: string) => a === 'fifth' ? <FifthWheelHitchArt id="sfw-standard-art" /> : undefined;
  const rows: CaseRow[] = [startRow, { step: '02', label: 'Path', value: 'Towable', icon: 'compass' }, { step: '03', label: 'Towable type', value: 'Fifth wheel', icon: 'truck' },
    { step: 'fw', label: c.caseLabel, value: names(c.options, sel), icon: c.icon, current: true }];
  const all = cnt('fifth', SEL);
  return (
    <StepFrame id="sfw" stepId="fw" overline={c.overline} title={c.title} hint={c.hint} helper={flow.multiHelper} multi rows={rows} answered={3}
      count={sel.length ? sum(c.options, sel) : all} prev={all} ctaOn={sel.length > 0} sheetOpen={sheet}
      answersForCounter={{ ...loadAnswers(), fifthSub: sel, classes: [...new Set([...A0.classes.filter((code) => code !== 'FW' && code !== 'FWTH'), ...classesFor(sel.length ? sel : ['fifth'])])] }}
      onBack={() => go('03')}
      onContinue={() => {
        const fifthClasses = classesFor(sel);
        const keep = A0.classes.filter((code) => code !== 'FW' && code !== 'FWTH');
        markDone('fw', { stores: SEL, fifthSub: sel, classes: [...new Set([...keep, ...fifthClasses])] });
        goNext('fw');
      }}>
      <div className="ct-grid hitch" id="sfw-grid">
        {c.options.map((o) => <ChoiceTile key={o.id} id={`sfw-${o.id}`} specId={`input-choice-tile-${o.id}#fw`} label={o.label} hint={fmt(o.count)}
          image={o.img ? img(o.img) : undefined} art={art(o.art)} multi selected={sel.includes(o.id)} disabled={o.count === 0} onClick={() => toggle(o.id)} />)}
      </div>
    </StepFrame>
  );
}

const MOTOR_CODES = ['AG', 'AD', 'B', 'C', 'CD'];
const MH = [
  { id: 'ag', label: 'Class A gas', classes: ['AG'], img: 'rv-class-a.png' },
  { id: 'ad', label: 'Class A diesel', classes: ['AD'], img: 'rv-class-a.png' },
  { id: 'b', label: 'Class B van', classes: ['B'], img: 'rv-class-b.png' },
  { id: 'c', label: 'Class C', classes: ['C'], img: 'rv-class-c.png' },
  { id: 'cd', label: 'Class C diesel', classes: ['CD'], img: 'rv-class-c.png' },
  { id: 'any', label: 'Any motorhome', classes: MOTOR_CODES, img: 'rv-class-a.png' },
];
function classCount(codes: string[]) {
  const pool = SEL ? STORES.filter((s) => SEL.includes(s.code)) : STORES;
  return pool.reduce((a, s) => a + codes.reduce((b, c) => b + (((s.byClass as unknown) as Record<string, number>)[c] || 0), 0), 0);
}
export function StepMotorhome({ sheet }: { sheet?: boolean }) {
  const [sel, toggle] = useMulti(A0.motor);
  const opts = MH.map((o) => ({ ...o, count: classCount(o.classes) }));
  const rows: CaseRow[] = [startRow, { step: '02', label: 'Path', value: 'Motorhome', icon: 'compass' }, { step: '03', label: 'Motorhome class', value: names(opts, sel), icon: 'truck', current: true }];
  const motorClasses = sel.length && !sel.includes('any')
    ? sel.flatMap((id) => MH.find((o) => o.id === id)?.classes || [])
    : classesFor(A0.path.includes('motorhome') ? ['motorhome'] : []);
  const motorAnswers = { ...loadAnswers(), motor: sel.includes('any') ? ['any'] : sel, classes: [...new Set([...A0.classes.filter((c) => !MOTOR_CODES.includes(c)), ...motorClasses])] };
  return (
    <StepFrame id="smh" pos={3} overline="Step 3 · Class" title="Which kind of motorhome?" hint="Pick a class, or keep every motorhome in the running." helper={flow.multiHelper} multi rows={rows} answered={2}
      count={sel.length ? (opts.filter((o) => sel.includes(o.id) && o.id !== 'any').reduce((a, o) => a + o.count, 0) || (sel.includes('any') ? opts.filter((o) => o.id !== 'any').reduce((a, o) => a + o.count, 0) : 0)) : cnt('motorhome', SEL)} prev={cnt('motorhome', SEL)} ctaOn={sel.length > 0} disabledWhy="Pick one to continue" sheetOpen={sheet}
      answersForCounter={motorAnswers}
      onBack={() => go('02')}
      onContinue={() => {
        const picked = sel.includes('any') ? opts.filter((o) => o.id !== 'any') : opts.filter((o) => sel.includes(o.id));
        const motorClasses = [...new Set(picked.flatMap((o) => o.classes))];
        const keep = A0.classes.filter((c) => !MOTOR_CODES.includes(c));
        markDone('mh', { stores: SEL, motor: sel.includes('any') ? ['any'] : sel, classes: [...new Set([...keep, ...motorClasses])] });
        goNext('mh');
      }}>
      <div className="ct-grid g3" id="smh-grid">
        {opts.map((o) => <ChoiceTile key={o.id} id={`smh-${o.id}`} specId={`input-choice-tile-${o.id}#mh`} label={o.label} hint={fmt(o.count)} image={img(o.img)} multi selected={sel.includes(o.id)} disabled={o.count === 0} onClick={() => toggle(o.id)} />)}
      </div>
    </StepFrame>
  );
}

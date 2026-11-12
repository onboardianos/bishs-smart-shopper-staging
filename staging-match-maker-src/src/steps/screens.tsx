import { useState } from 'react';
import { Button } from '@v1/components/Button';
import { Icon } from '@v1/components/Icon';
import { Modal } from '@v1/components/Modal';
import { ChoiceTile } from './ChoiceTile';
import { BumperHitchArt, FifthWheelHitchArt } from './HitchArt';
import { StepFrame } from './Step';
import type { CaseRow } from './Case';
import flow from './flow.json';
import { count as cnt, garageCount, storesFromUrl, unitsAt, STORES, BUCKETS } from './inventory';
import { go, saveAnswers, markDone, loadAnswers } from '../answers';
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
      onBack={() => go('01')}
      onContinue={() => { markDone('02', { stores: SEL, classes: classesFor(sel), path: sel, ...(sel.includes('towable') ? {} : { hitch: [], sub: [] }) }); goNext('02'); }}>
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
      onBack={() => go('02')}
      onContinue={() => { markDone('03', { stores: SEL, classes: withOther(classesFor(sel), A0.path.filter((x) => x !== 'towable')), hitch: sel, ...(sel.includes('bumper') ? {} : { sub: [] }), ...(sel.includes('fifth') ? {} : { fifthSub: [] }) }); goNext('03'); }}>
      <div className="ct-grid g3 hitch" id="s03-grid">
        {(c.options as Opt[]).map((o) => <ChoiceTile key={o.id} id={`s03-${o.id}`} specId={`input-choice-tile-${o.id}#03`} label={o.label} hint={fmt(o.count)}
          image={o.img ? img(o.img) : undefined} art={art(o.art)} multi selected={sel.includes(o.id)} disabled={o.count === 0} onClick={() => toggle(o.id)} />)}
      </div>
    </StepFrame>
  );
}

export function Step4Bumper({ garageOpen, sheet }: { garageOpen?: boolean; sheet?: boolean }) {
  const c = { ...S['04'], options: live(S['04'].options) }; const g = S.garage;
  const [sel, toggle] = useMulti(A0.sub);
  const [open, setOpen] = useState(!!garageOpen);
  const [lens, setLens] = useState<string[]>(() => {
    if (!A0.sub.includes('garage')) return [];
    if (A0.garageAny) return [...g.lengths];
    if (A0.garageFt) return g.lengths.filter((l) => Number(String(l).replace('+', '')) >= A0.garageFt!);
    return [];
  });
  const toggleLen = (l: string) => setLens((s) => (s.includes(l) ? s.filter((x) => x !== l) : [...s, l]));
  const trimmed = lens.length > 0 && lens.length < g.lengths.length;
  const shortest = lens.length ? g.lengths.find((l) => lens.includes(l)) : undefined;
  const minFt = shortest ? Number(shortest.replace('+', '')) : 0;
  const gCount = trimmed ? garageCount(minFt, SEL) : cnt('garage', SEL);
  const count = sum(c.options, sel.filter((x) => x !== 'garage')) + (sel.includes('garage') ? gCount : 0);
  const removed = shortest && shortest !== g.lengths[0] ? shortest.replace('+', '') : null;
  const rows: CaseRow[] = [startRow, { step: '02', label: 'Path', value: 'Towable', icon: 'compass' }, { step: '03', label: 'Towable type', value: 'Bumper pull', icon: 'truck' },
    { step: '04', label: c.caseLabel, value: names(c.options, sel), icon: c.icon, current: !sel.includes('garage') }];
  if (sel.includes('garage')) rows.push({ step: '04g', label: g.caseLabel, value: !lens.length ? '—' : trimmed ? `${shortest} ft and longer` : 'Any length', icon: g.icon, current: true });
  const overlay = (
    <Modal id="s04-garage-sheet" open={open} onDismiss={() => setOpen(false)} labelledBy="s04-garage-title">
      <div className="gl" id="s04-garage-body" data-spec-id="sec-overlay-garage-lengths" data-bos-level="section" data-bos-type="overlay" data-layer="overlay">
        <div className="overline" id="s04-garage-overline" data-spec-id="label-overlay-context"><Icon name="check" size={14} stroke={3} /> {g.context}</div>
        <h2 className="t-title t-title-2" id="s04-garage-title" data-spec-id="label-overlay-title">{g.title}</h2>
        <p className="t-subtitle" id="s04-garage-hint" data-spec-id="info-garage-hint">{g.hint}</p>
        <div className="gl-chips" id="s04-garage-chips" role="group" aria-labelledby="s04-garage-title">
          {g.lengths.map((l) => (
            <button type="button" key={l} id={`s04-garage-len-${l.replace('+', 'plus')}`} data-spec-id={`input-choice-garage-length-${l.replace('+', 'plus')}#04`}
              data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access="act" role="checkbox" aria-checked={lens.includes(l)}
              className={`gl-chip${lens.includes(l) ? ' on' : ''}`} onClick={() => toggleLen(l)}>
              {lens.includes(l) && <Icon name="check" size={16} stroke={3} />}<span>{l} ft</span>
            </button>
          ))}
        </div>
        {removed
          ? <p className="gl-note" id="s04-garage-note" data-spec-id="info-garage-eliminates" role="status"><Icon name="info" size={16} /> <span id="s04-garage-note-t">{g.noteTemplate.replace('{len}', removed)}</span></p>
          : <p className="gl-note gl-note-n" id="s04-garage-note" data-spec-id="info-garage-keeps-all" role="status"><Icon name="info" size={16} /> <span id="s04-garage-note-t">{g.allKept}</span></p>}
        <p className="gl-count" id="s04-garage-count" data-spec-id="metric-garage-campers-fit" aria-live="polite"><strong id="s04-garage-count-n">{gCount.toLocaleString('en-US')}</strong> toy haulers keep</p>
        <div className="gl-actions" id="s04-garage-actions">
          <Button kind="commit" id="s04-garage-continue" data-spec-id="btn-commit-continue#garage-overlay" perm="discovery.navigate" size="lg" block trailingIcon="arrow-right" className="btn-pulse" disabled={lens.length === 0} onClick={() => setOpen(false)}>{flow.cta}</Button>
        </div>
      </div>
    </Modal>
  );
  return (
    <StepFrame id="s04" pos={4} overline={c.overline} title={c.title} helper={flow.multiHelper} multi rows={rows} answered={3}
      count={sel.length ? count : cnt('bumper', SEL)} prev={cnt('bumper', SEL)} ctaOn={sel.length > 0 && (!sel.includes('garage') || lens.length > 0)} disabledWhy={sel.includes('garage') && lens.length === 0 ? 'Choose a garage length' : 'Pick one to continue'} sheetOpen={sheet} overlay={overlay}
      onBack={() => go('03')}
      onContinue={() => { markDone('04', { stores: SEL, classes: withOther(classesFor(sel.length ? sel : ['bumper']), [...A0.hitch.filter((x) => x !== 'bumper'), ...A0.path.filter((x) => x !== 'towable')]), sub: sel, garageFt: sel.includes('garage') && trimmed ? minFt : null, garageAny: sel.includes('garage') && !trimmed }); goNext('04'); }}>
      <div className="ct-grid g5" id="s04-grid">
        {c.options.map((o) => <ChoiceTile key={o.id} id={`s04-${o.id}`} specId={`input-choice-tile-${o.id}#04`} label={o.label} hint={fmt(o.count)} image={img(o.img)} multi
          selected={sel.includes(o.id)} disabled={o.count === 0} onClick={() => { toggle(o.id); if (o.id === 'garage' && !sel.includes('garage')) setOpen(true); }} />)}
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
  return (
    <StepFrame id="smh" pos={3} overline="Step 3 · Class" title="Which kind of motorhome?" hint="Pick a class, or keep every motorhome in the running." helper={flow.multiHelper} multi rows={rows} answered={2}
      count={sel.length ? (opts.filter((o) => sel.includes(o.id) && o.id !== 'any').reduce((a, o) => a + o.count, 0) || (sel.includes('any') ? opts.filter((o) => o.id !== 'any').reduce((a, o) => a + o.count, 0) : 0)) : cnt('motorhome', SEL)} prev={cnt('motorhome', SEL)} ctaOn={sel.length > 0} disabledWhy="Pick one to continue" sheetOpen={sheet}
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

// The Smart Shopper question order (live bishsos.com/smart-shopper order, with the Bishified Step 3/4 split of the live "type" screen).
// Which steps show depends on the answers (same skip rules as live), so "Step n of N" is always the real count for this shopper.
import { loadAnswers, type Answers } from '../answers';
import { poolOf, multiOpts, shareOf, isB, isToy, isMotorOnly, anyTowable, E } from '../session';

export type StepDef = { id: string; nav: string; skip?: (a: Answers, P: () => ReturnType<typeof poolOf>) => string | null };
export const STEPS: StepDef[] = [
  { id: '01', nav: 'Start' },
  { id: '02', nav: 'Path' },
  { id: '03', nav: 'Towable type', skip: (a) => (a.path.length && !a.path.includes('towable') ? 'Not towable' : null) },
  { id: 'mh', nav: 'Motorhome class', skip: (a) => (a.path.includes('motorhome') ? null : 'Not a motorhome') },
  { id: '04', nav: 'Bumper pull', skip: (a) => ((a.path.length && !a.path.includes('towable')) || (a.hitch.length && !a.hitch.includes('bumper')) ? 'Not bumper pull' : null) },
  { id: 'fw', nav: 'Fifth wheel', skip: (a) => ((a.path.length && !a.path.includes('towable')) || (a.hitch.length && !a.hitch.includes('fifth')) ? 'Not a fifth wheel' : null) },
  { id: 'camping', nav: 'Camping today' },
  { id: 'trade-now', nav: 'Your camper', skip: (a) => (a.camping !== 'current' ? 'No current camper' : null) },
  { id: 'trade-why', nav: 'What to change', skip: (a) => (a.camping !== 'current' ? 'No current camper' : null) },
  { id: 'camp-style', nav: 'Camping style' },
  { id: 'activities', nav: 'Activities' },
  { id: 'sleep', nav: 'Sleeping' },
  { id: 'bedroom', nav: 'Bedroom', skip: (a, P) => { if (isB(a)) return 'Class B has no separate bedroom'; const sh = shareOf(P().pool, [E().IDS.PRIVATE_MASTER]); if (sh >= 0.95) return 'Nearly every unit has one'; if (sh <= 0.05) return 'Almost none have one'; return null; } },
  { id: 'tow', nav: 'Towing', skip: (a) => (!anyTowable(a) || isMotorOnly(a) ? 'Motorhomes are driven' : null) },
  { id: 'length', nav: 'Length' },
  { id: 'garage', nav: 'Garage', skip: (a) => (!isToy(a) ? 'Toy haulers only' : null) },
  { id: 'bath', nav: 'Bathroom', skip: (a, P) => (multiOpts('bath', a, P().pool).length <= 1 ? 'Nothing left to split' : null) },
  { id: 'inside', nav: 'Inside', skip: (a, P) => (multiOpts('inside', a, P().pool).length <= 1 ? 'Nothing left to split' : null) },
  { id: 'outside', nav: 'Outside', skip: (a, P) => (multiOpts('outside', a, P().pool).length <= 1 ? 'Nothing left to split' : null) },
  { id: 'size', nav: 'Slide-outs', skip: (_a, P) => (new Set(P().pool.map((u) => u.slides).filter((v) => v != null)).size <= 1 ? 'Slide counts do not vary' : null) },
  { id: 'build', nav: 'Build', skip: (_a, P) => { const sw = new Set(P().pool.map((u) => u.sidewallConstruction).filter((v) => v && v !== 'UNKNOWN')); return sw.size <= 1 ? 'No construction choice' : null; } },
  { id: 'budget', nav: 'Budget' },
  { id: 'summary', nav: 'Summary' },
];

export function visibleSteps(a: Answers = loadAnswers()) {
  let cache: ReturnType<typeof poolOf> | null = null;
  const P = () => (cache ||= poolOf(a));
  const DATA = ['bedroom', 'bath', 'inside', 'outside', 'size', 'build'];
  return STEPS.filter((s) => !s.skip || (DATA.includes(s.id) && a.done.includes(s.id)) || !s.skip(a, P));
}
export function posOf(id: string, a: Answers = loadAnswers()) {
  const vis = visibleSteps(a);
  const i = vis.findIndex((s) => s.id === id);
  return { pos: i + 1, total: vis.length, vis, next: vis[i + 1]?.id || 'qload', prev: vis[i - 1]?.id || '00', upcoming: vis.slice(i + 1).map((s) => s.nav) };
}
export function navOf(id: string) { return STEPS.find((s) => s.id === id)?.nav || id; }

// Navigation. `ret` (e.g. ret=summary from an Edit button, or the step a "Have a trade in" tap came from) sends the shopper back.
import { go } from '../answers';
const retParam = () => new URLSearchParams(location.search).get('ret');
export function goNext(id: string) {
  const a = loadAnswers();
  const ret = retParam();
  if (ret) {
    if (id === 'trade-now' && a.camping === 'current') return go('trade-why', `&ret=${ret}`);
    if (id === 'camping' && a.camping === 'current') return go('trade-now', `&ret=${ret}`);
    if (ret !== id) return go(ret);
  }
  go(posOf(id, a).next);
}
export function goPrev(id: string) { go(posOf(id).prev); }
export function goEdit(stepId: string, from: string) {
  const target = stepId === '04g' ? '04' : stepId;
  go(target, `&ret=${from}${stepId === '04g' ? '&garage=1' : ''}`);
}

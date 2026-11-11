// Plain-words answer text for the case rail, the summary and the results drawer. Option labels are the live wording.
import type { Answers } from '../answers';
import flow from './flow.json';
import { STORES } from './inventory';
import { catalogue, childOpts, bedroomOpts, multiOptsAll, gvwrOf, ceilingOf, financeOf, n, APR, SNAP } from '../session';

export const CAMPING = [
  { id: 'first', label: 'First-time buyer', hint: 'New to RVing' },
  { id: 'current', label: 'I have one now', hint: 'Tell us about it next' },
  { id: 'experienced', label: 'We’ve had one before', hint: 'You know what you want' },
];
export const CAMP_STYLE = [{ id: 'boondocking', label: 'Boondocking / off-grid', icon: 'mountain' }, { id: 'pad', label: 'Pad camping (hookups)', icon: 'plug' }];
export const ACTIVITIES = [
  { id: 'beaches', label: 'Beaches', icon: 'sun' }, { id: 'paddle', label: 'Paddle boarding / kayaking', icon: 'sailboat' }, { id: 'tailgating', label: 'Tailgating', icon: 'car' },
  { id: 'entertaining', label: 'Entertaining', icon: 'party-popper' }, { id: 'remotework', label: 'Remote working', icon: 'laptop' }, { id: 'crafting', label: 'Crafting / sewing', icon: 'scissors' },
  { id: 'hiking', label: 'Hiking / climbing', icon: 'mountain' }, { id: 'relaxing', label: 'Relaxing', icon: 'sofa' }, { id: 'skiing', label: 'Skiing', icon: 'snowflake' },
  { id: 'swimming', label: 'Swimming', icon: 'waves' }, { id: 'biking', label: 'Biking', icon: 'bike' }, { id: 'powersports', label: 'Powersports', icon: 'gauge' },
  { id: 'fishing', label: 'Fishing', icon: 'fish' }, { id: 'hunting', label: 'Hunting', icon: 'crosshair' },
];
export const TRADE_CHANGES = [
  { id: 'space', label: 'Need more living space to enjoy it' }, { id: 'bedroom', label: 'Bedroom set-up just doesn’t work' }, { id: 'bath', label: 'Bigger / more private bathroom' },
  { id: 'storage', label: 'More storage' }, { id: 'amenities', label: 'Ready to upgrade with more amenities' }, { id: 'tow', label: 'Tow capacity / easier to tow' },
  { id: 'longer', label: 'We camp more or longer than it was built for' }, { id: 'simpler', label: 'Want something simpler to set up' },
];
export const TOW_OPTS = [{ id: 'yes', label: 'Yes, with my own vehicle' }, { id: 'no', label: 'Not sure yet' }, { id: 'delivery', label: 'I need it delivered' }];
export const LENGTH_OPTS = [{ id: 'hard', label: 'Hard limit', icon: 'ruler' }, { id: 'soft', label: 'Shorter is better', icon: 'minus' }, { id: 'none', label: 'Not a concern', icon: 'circle-help' }];
export const TIERS = [{ id: 'veryGood', label: 'Very good · 740–799' }, { id: 'good', label: 'Good · 670–739' }, { id: 'fair', label: 'Fair · 580–669' }, { id: 'poor', label: 'Poor · 300–579' }];
const MH: Record<string, string> = { ag: 'Class A gas', ad: 'Class A diesel', b: 'Class B van', c: 'Class C', cd: 'Class C diesel', any: 'Any motorhome' };
const S = flow.steps as any;
const lab = (opts: { id: string; label: string }[], ids: string[]) => opts.filter((o) => ids.includes(o.id)).map((o) => o.label).join(', ');
export const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
export const people = (a: Answers) => `${a.adults} adult${a.adults === 1 ? '' : 's'} · ${a.children} ${a.children === 1 ? 'child or guest' : 'children or guests'} · ${a.pets} pet${a.pets === 1 ? '' : 's'}`;
export const tradeLabel = (a: Answers) => { const t = a.trade; if (!t) return ''; const p = [t.year, t.mfr, t.make, t.model].filter(Boolean); return p.length ? p.join(' ') : t.text ? 'Notes saved' : ''; };
export function budgetText(a: Answers) {
  const c = ceilingOf(a);
  if (a.budgetMode === 'cash') return a.maxSpend > 0 ? `Cash · up to ${money(c || a.maxSpend)}` : 'Cash · no amount yet';
  if (a.budgetMode === 'finance') return a.tier ? `${money(a.payment)}/mo · ${money(a.down)} down${c ? ` · up to ${money(c)}` : ''}` : 'Monthly payment · credit not picked';
  return 'No budget set';
}
export function towText(a: Answers) {
  if (a.tow === 'yes') { const g = gvwrOf(a); const veh = [a.towYr, a.towMk, a.towMd].filter(Boolean).join(' '); return g ? `Up to ${n(g)} lbs${veh ? ` · ${veh}` : ''}` : 'Own vehicle · rating not set'; }
  return lab(TOW_OPTS, a.tow ? [a.tow] : []);
}
const titles = (key: string, a: Answers, ids: string[]) => multiOptsAll(key, a).filter((o) => ids.includes(o.id)).map((o) => o.title);
export function answerText(id: string, a: Answers): string {
  const O = catalogue();
  switch (id) {
    case '01': return `No unit in mind · ${a.stores ? (a.stores.length === 1 ? STORES.find((x) => x.code === a.stores![0])?.name || '1 store' : `${a.stores.length} stores`) : 'All locations'}`;
    case '02': return lab(S['02'].options, a.path) || '—';
    case '03': return lab(S['03'].options, a.hitch) || '—';
    case 'mh': return a.motor.map((m) => MH[m]).join(', ') || '—';
    case '04': return [lab(S['04'].options, a.sub), a.sub.includes('garage') ? (a.garageFt ? `garage ${a.garageFt} ft+` : 'any garage') : ''].filter(Boolean).join(' · ') || '—';
    case 'fw': return lab(S.fw.options, a.fifthSub || []) || '—';
    case 'camping': return lab(CAMPING, a.camping ? [a.camping] : []) || '—';
    case 'trade-now': return tradeLabel(a) || 'Not filled in';
    case 'trade-why': { const t = a.trade; const k = t ? t.changes.length : 0; return k ? lab(TRADE_CHANGES, t!.changes) : t?.text ? 'Note added' : 'Nothing picked'; }
    case 'camp-style': return lab(CAMP_STYLE, a.campStyle) || 'None picked';
    case 'activities': return [lab(ACTIVITIES, a.activities), a.activitiesOther].filter(Boolean).join(', ') || 'None picked';
    case 'sleep': return `${people(a)}${a.children > 0 && a.childSetup ? ` · ${childOpts(a).find((o) => o.id === a.childSetup)?.title || ''}` : ''}`;
    case 'bedroom': return bedroomOpts(a).find((o) => o.id === a.bedroom)?.title || '—';
    case 'tow': return towText(a) || '—';
    case 'length': return a.lengthMode === 'hard' ? (a.lengthFt >= 41 ? '40+ ft · no limit' : `Up to ${a.lengthFt} ft`) : lab(LENGTH_OPTS, a.lengthMode ? [a.lengthMode] : []) || '—';
    case 'garage': return a.garageAny ? 'Any garage is fine' : a.garageFt ? `${a.garageFt} ft and longer` : '—';
    case 'bath': case 'inside': case 'outside': { const t = titles(id, a, a[id]); const must = a[`${id}Must` as 'bathMust']; return t.length ? t.map((x, i) => (must.includes(a[id][i]) ? `${x} (must)` : x)).join(', ') : 'Open / no preference'; }
    case 'size': return [O.space, O.balanced, O.simple].find((o) => o.id === a.size)?.title || '—';
    case 'build': return `${[O.laminate, O.value, O.either].find((o) => o.id === a.build)?.title || '—'}${a.buildMust ? ' · only this' : ''}`;
    case 'budget': return budgetText(a);
    default: return '';
  }
}
export function budgetRows(a: Answers): [string, string][] {
  if (a.budgetMode === 'finance') {
    const f = financeOf(a); const store = a.store ? SNAP().lookups.rooftops[a.store]?.storeName || a.store : 'Not picked · 6% tax estimate';
    return [['Paying with', 'Monthly payment'], ['Credit', TIERS.find((t) => t.id === a.tier)?.label || 'Not picked'], ['Payment', `${money(a.payment)} a month${a.tier ? ` · ${APR[a.tier]} APR estimate` : ''}`], ['Down payment', money(a.down)], ['Closest store', store], ['Reaches campers up to', f && f.valid ? money(f.ceiling) : '—']];
  }
  if (a.budgetMode === 'cash') return [['Paying with', 'Cash'], ['Maximum', a.maxSpend > 0 ? money(ceilingOf(a) || a.maxSpend) : 'Not set']];
  return [['Budget', 'Not set']];
}
export const STEP_ICON: Record<string, string> = {
  '01': 'map-pin', '02': 'compass', '03': 'truck', mh: 'truck', '04': 'list-ordered', fw: 'truck', camping: 'tent', 'trade-now': 'caravan', 'trade-why': 'pencil', 'camp-style': 'mountain', activities: 'bike',
  sleep: 'bed-double', bedroom: 'door-closed', tow: 'truck', length: 'ruler', garage: 'warehouse', bath: 'shower-head', inside: 'sofa', outside: 'sun', size: 'layers', build: 'brick-wall', budget: 'wallet', summary: 'list-checks',
};
export const INERT = ['camping', 'trade-now', 'trade-why', 'camp-style', 'activities'];

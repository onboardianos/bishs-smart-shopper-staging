// Signed-in customer portal in the real DS AppShell. Overlays portal to document.body.
import { useEffect, useRef, useState } from 'react';
import { Action, Banner, Commit, Dialog, Field, Section, SelectField, Tag, VIcon, ds, slug } from './v5ui';
import { loadZips } from '../steps/inventory';
import { SAVE_STORES, SHORT_LIST_HINT, SHORT_STORES, STORE_STATES, loadStepZip, pickerModeFor, storesInState } from './stores';

const CUSTOMER = { first: 'Robert', last: 'Jackson', email: 'robert.jackson@example.com' };
const UNITS = [
  { id: 'avenue-26rd', name: '2026 Avenue 26RD', price: '$57,495', sleeps: 4, len: '29 ft', store: 'Meridian', rank: 1, saved: true },
  { id: 'reflection-24rl', name: '2026 Reflection 24RL', price: '$44,411', sleeps: 4, len: '30 ft', store: 'Twin Falls', rank: 2, saved: true },
  { id: 'eagle-28crt', name: '2026 Eagle 28CRT', price: '$59,995', sleeps: 4, len: '33 ft', store: 'Twin Falls', rank: 3, saved: false },
];
const ANSWERS = [['Looking for', 'Fifth wheel'], ['Sleeps', '4'], ['Budget', 'Around $750 a month'], ['Tow rating', '10,000 lbs'], ['Stores', 'Meridian, Twin Falls']];
const ALERTS = [
  { id: 'new-unit', eyebrow: 'New unit', from: 'Twin Falls', title: 'New unit that fits your search', body: 'A 2026 Reflection 22RK arrived at Twin Falls in your budget.', cta: 'View unit', go: 'results' },
  { id: 'worksheet', eyebrow: 'Worksheet', from: 'your outfitter', title: 'Your payment worksheet is ready', body: 'Your outfitter sent a worksheet for the 2026 Avenue 26RD.', cta: 'Open worksheet', go: 'my-deal' },
  { id: 'message', eyebrow: 'Message', from: 'your outfitter', title: 'New message from your outfitter', body: '“The Avenue 26RD is on the lot at Meridian if you want a walk-through.”', cta: 'Open messages', go: 'outfitter' },
];
const NOTES = [
  { id: 'avenue-26rd', unit: '2026 Avenue 26RD', when: 'November 9 · 2:10 PM · Meridian', text: 'Loved the kitchen island. Bunk room is big enough for both kids.', tags: ['Loved the kitchen', 'Kids bunks'] },
  { id: 'reflection-24rl', unit: '2026 Reflection 24RL', when: 'November 8 · 6:42 PM · Twin Falls', text: 'Storage looks tight. Ask about the pass-through.', tags: ['Storage'] },
  { id: 'eagle-28crt', unit: '2026 Eagle 28CRT', when: 'November 8 · 6:15 PM · Twin Falls', text: 'Rear bath feels roomy. Price a bit high.', tags: ['Roomy bath', 'Too pricey'] },
];
const QUESTIONS = ['Does the Avenue 26RD come with the outdoor kitchen option?', 'Is there a pass-through on the Reflection 24RL?'];
const TABS = [['overview', 'Overview'], ['trade', 'My trade'], ['notes', 'Notes'], ['outfitter', 'Outfitter']] as const;
const SLOTS = ['10:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'];

export const PORTAL_STATES = [
  'portal', 'portal-loading', 'portal-empty', 'portal-error', 'portal-partial', 'portal-stale', 'portal-permission-denied',
  'portal-alerts', 'portal-nav', 'portal-trade', 'portal-notes', 'portal-outfitter', 'portal-saved-units', 'portal-my-deal',
  'book-visit', 'book-visit-confirm', 'book-visit-success',
] as const;

function go(state: string) {
  location.href = `${location.pathname}?state=${state}`;
}

function fromState(state: string) {
  const data = state === 'portal-loading' ? 'loading' : state === 'portal-empty' ? 'empty' : state === 'portal-error' ? 'error' : state === 'portal-partial' ? 'partial' : state === 'portal-stale' ? 'stale' : state === 'portal-permission-denied' ? 'denied' : 'ok';
  const tab = state === 'portal-trade' ? 'trade' : state === 'portal-notes' ? 'notes' : state === 'portal-outfitter' ? 'outfitter' : 'overview';
  const nav = state === 'portal-saved-units' ? 'saved-units' : state === 'portal-my-deal' ? 'my-deal' : 'my-case';
  const overlay = state === 'portal-alerts' ? 'alerts' : state === 'book-visit' ? 'book' : state === 'book-visit-confirm' ? 'book-confirm' : state === 'book-visit-success' ? 'book-success' : '';
  return { data, tab, nav, overlay, openNav: state === 'portal-nav' };
}

function UnitCard({ u, ctx, stale }: { u: typeof UNITS[number]; ctx: string; stale?: boolean }) {
  const NS = ds();
  const inst = `${u.id}${ctx ? '-' + ctx : ''}`;
  return (
    <div className="ss-unit">
      <NS.Card theme="light" specId={`card-unit#${inst}`} title={u.name} subtitle={u.rank ? `#${u.rank} · ${u.store}` : u.store}
        footer={<>
          <Action specId={`btn-action-view-details#${inst}`} target="screen:unit-details (out of scope)">View details</Action>
          <Action specId={`btn-action-save-unit#${inst}`} quiet pressed={u.saved} label={`${u.saved ? 'Saved' : 'Save'} ${u.name}`}><VIcon name="heart" size={18} />{u.saved ? 'Saved' : 'Save'}</Action>
        </>}>
        <img className="ss-unit-art" src="img/rv-fifth-wheel.png" alt="" width={320} height={180} />
        <p className="ss-unit-price" data-spec-id={`metric-price#${inst}`}>{u.price}{stale && <span className="ss-unit-asof"> · as of Nov 9</span>}</p>
        <p className="ss-unit-specs">Sleeps {u.sleeps} · {u.len} · {u.store}</p>
      </NS.Card>
    </div>
  );
}

function Skeleton({ id, lines = 3 }: { id: string; lines?: number }) {
  return <div className="ss-skel" data-spec-id={`info-loading#${id}`} aria-hidden="true">{Array.from({ length: lines }).map((_, i) => <span key={i} style={{ width: `${90 - i * 18}%` }} />)}</div>;
}

function Overview({ data }: { data: string }) {
  const NS = ds();
  const stale = data === 'stale';
  if (data === 'loading') {
    return (
      <Section id="sec-portal-overview" sec="S04" label="Overview">
        <div className="ss-portal-grid" aria-busy="true">
          <p className="ss-sr" role="status" data-spec-id="info-portal-loading">Loading your portal…</p>
          {['next-step', 'trade', 'notes', 'outfitter', 'answers', 'top-three'].map((k) => <div key={k} className="ss-panel"><Skeleton id={k} lines={k === 'top-three' ? 4 : 3} /></div>)}
          <Tag kind="rule" q="Q1" id="portal-load-timing">load source + timing</Tag>
        </div>
      </Section>
    );
  }
  if (data === 'error') {
    return (
      <Section id="sec-portal-overview" sec="S04" label="Overview">
        <div className="ss-state-block" data-spec-id="info-portal-error">
          <Banner specId="info-portal-error-banner" icon="wifi-off" title="Your portal didn't load." action={<Action specId="btn-action-retry-portal" onClick={() => go('portal')}>Try again</Action>}>Your saved search is safe. Check your connection, then try again.</Banner>
          <Tag kind="rule" q="Q34" id="portal-error">error + retry copy</Tag>
        </div>
      </Section>
    );
  }
  if (data === 'empty') {
    return (
      <Section id="sec-portal-overview" sec="S04" label="Overview">
        <div className="ss-state-block ss-empty" data-spec-id="info-portal-empty">
          <span className="ss-empty-i"><VIcon name="folder-open" size={32} /></span>
          <h2 className="ss-h2">Nothing saved yet</h2>
          <p className="ss-body">Answer a few Smart Shopper questions and your top three, saved RVs and notes will show up here.</p>
          <Commit specId="btn-commit-start-smart-shopper" perm="portal.view" target="screen:results" onClick={() => go('results')}>Start Smart Shopper</Commit>
          <Tag kind="rule" q="Q35" id="portal-empty">can a profile exist with nothing saved? copy</Tag>
        </div>
      </Section>
    );
  }
  if (data === 'denied') {
    return (
      <Section id="sec-portal-overview" sec="S04" label="Overview">
        <div className="ss-state-block ss-empty" data-spec-id="info-portal-permission-denied" data-bos-access="read">
          <span className="ss-empty-i"><VIcon name="lock" size={32} /></span>
          <h2 className="ss-h2">This saved search isn't on your profile</h2>
          <p className="ss-body">You're signed in as <b data-example="true">{CUSTOMER.first} {CUSTOMER.last}</b>. This link belongs to a different customer profile, so it can't be opened here. Sign in with the email it was saved under, or go to your own portal.</p>
          <div className="ss-bar-btns ss-left">
            <Commit specId="btn-commit-go-to-my-portal" perm="portal.view" target="screen:portal" onClick={() => go('portal')}>Go to my portal</Commit>
            <Action specId="btn-action-sign-in-other" quiet target="frame-save-progress-code" onClick={() => go('results')}>Sign in with another email</Action>
          </div>
          <Tag kind="rule" q="Q32" id="permission-denied">when access is denied, who can share a portal, what the shopper sees</Tag>
        </div>
      </Section>
    );
  }
  return (
    <Section id="sec-portal-overview" sec="S04" label="Overview">
      <div className="ss-portal-grid">
        {stale && (
          <Banner tone="warning" icon="clock" specId="info-portal-stale" title="Prices and availability as of November 9, 2026 · 2:10 PM." action={<Action specId="btn-action-refresh-snapshot" onClick={() => go('portal')}><VIcon name="refresh-cw" size={18} />Refresh</Action>}>
            Some units may have sold or changed price since then.<br /><Tag kind="rule" q="Q31" id="stale-threshold">when a snapshot counts as stale; snapshot source</Tag>
          </Banner>
        )}
        <div className="ss-next" data-spec-id="card-next-step" data-bos-level="layer" data-bos-layer="L01">
          <p className="ss-overline-hi">Next step</p>
          <h2 className="ss-next-t">Walk through your #1 at Meridian</h2>
          <p className="ss-next-b">See the 2026 Avenue 26RD in person. No pressure — just a look at the floorplan that rose to the top of your search.</p>
          <div className="ss-bar-btns ss-left">
            <Commit specId="btn-commit-book-visit" perm="visit.book" target="frame-book-visit" onClick={() => go('book-visit')}>Book a visit</Commit>
            <span className="ss-on-ink"><Action dark specId="btn-action-view-top-match" target="screen:unit-details (out of scope)">View your top match</Action></span>
          </div>
          <Tag kind="rule" q="Q19" id="booking-backend">booking backend</Tag>
        </div>
        <div className="ss-mods">
          {data === 'partial' ? (
            <div className="ss-mod">
              <NS.Card theme="light" title="Your trade" subtitle="Unavailable" specId="card-trade-unavailable">
                <Banner tone="warning" icon="triangle-alert" specId="info-trade-partial" title="Your trade estimate isn't available right now." action={<Action specId="btn-action-retry-trade" onClick={() => go('portal')}>Try again</Action>}>Everything else on this page is up to date.</Banner>
                <Tag kind="rule" q="Q20" id="trade-partial">trade estimate source + failure copy</Tag>
              </NS.Card>
            </div>
          ) : (
            <div className="ss-mod">
              <NS.Card theme="light" title="Your trade" subtitle="Estimate" specId="card-trade-summary" footer={<Action specId="btn-action-view-trade" perm="trade.view" target="sec-portal-trade" onClick={() => go('portal-trade')}>View trade</Action>}>
                <p className="ss-big" data-spec-id="metric-trade-range" data-example="true">$10,200 – $12,600</p>
                <p className="ss-small">Estimate, not a quote · 2019 Flagstaff Super Lite</p>
              </NS.Card>
            </div>
          )}
          <div className="ss-mod">
            <NS.Card theme="light" title="Notes" subtitle="3 notes" specId="card-notes-summary" footer={<Action specId="btn-action-open-notes" target="sec-portal-notes" onClick={() => go('portal-notes')}>Open notes</Action>}>
              <p className="ss-small" data-example="true">Latest: “Loved the kitchen island. Bunk room is big enough for both kids.”</p>
            </NS.Card>
          </div>
          <div className="ss-mod">
            <NS.Card theme="light" title="Your outfitter" subtitle="Bish's RV Meridian, ID" specId="card-outfitter-summary" footer={<Action specId="btn-action-view-outfitter" target="sec-portal-outfitter" onClick={() => go('portal-outfitter')}>View outfitter</Action>}>
              <div className="ss-who"><NS.Avatar initials="ON" name="Outfitter name" theme="light" size="lg" specId="info-avatar-outfitter" /><div><p className="ss-who-n" data-needs-rule="Q18">Outfitter name</p><p className="ss-small">Ready to walk you through your #1.</p></div></div>
            </NS.Card>
          </div>
        </div>
        <Tag kind="rule" q="Q20" id="module-sources">trade + notes + outfitter data sources</Tag>
        <div className="ss-sec" data-spec-id="card-portal-answers" data-bos-level="layer" data-bos-layer="L02" aria-label="Your Smart Shopper answers">
          <div className="ss-sec-head"><h2 className="ss-h2">Your Smart Shopper answers</h2><Action specId="btn-action-edit-answers" perm="search.edit" target="screen:results" onClick={() => go('results')}><VIcon name="pencil" size={18} />Edit answers</Action></div>
          <dl className="ss-answers-dl" data-spec-id="list-smart-shopper-answers">{ANSWERS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd data-example="true">{v}</dd></div>)}</dl>
        </div>
        <div className="ss-sec" data-spec-id="list-portal-top-three" data-bos-level="layer" data-bos-layer="L03" aria-label="Your top three">
          <div className="ss-sec-head"><h2 className="ss-h2">Your top three</h2><Action specId="btn-action-adjust-top-three" quiet target="screen:results" onClick={() => go('results')}>Adjust your top three</Action></div>
          <div className="ss-grid">{UNITS.filter((u) => u.rank).map((u) => <UnitCard key={u.id} u={u} ctx="portal" stale={stale} />)}</div>
        </div>
      </div>
    </Section>
  );
}

function Trade() {
  const NS = ds();
  return (
    <Section id="sec-portal-trade" sec="S07" label="My trade">
      <p className="ss-overline">My trade</p><h2 className="ss-h2">Your trade estimate</h2>
      <p className="ss-body">This is an estimate, not a quote. Your outfitter can walk you through an appraisal in person.</p>
      <Tag kind="rule" q="Q20" id="trade-source">trade estimate source + "estimate, not a quote" wording</Tag>
      <div className="ss-two">
        <NS.Card theme="light" title="Estimated range" subtitle="Estimate, not a quote" specId="card-trade-estimate" footer={<Action specId="btn-action-view-appraisal" perm="trade.view" target="needs-rule:Q20">View appraisal</Action>}>
          <p className="ss-big" data-spec-id="metric-trade-estimate" data-example="true">$10,200 – $12,600</p>
          <p className="ss-small">2019 Flagstaff Super Lite · 26FKBS</p>
          <span className="ss-tag"><NS.Badge type="success" theme="light" specId="badge-inspection-scheduled">Inspection scheduled</NS.Badge></span>
        </NS.Card>
        <NS.Card theme="light" title="Next up · Trade inspection" subtitle="In 6 days" specId="card-trade-inspection" footer={<><Action specId="btn-action-what-to-expect" target="needs-rule:Q20">What to expect</Action><Action specId="btn-action-directions" quiet target="external:maps">Directions</Action></>}>
          <p className="ss-v" data-example="true"><VIcon name="calendar" size={18} />Tuesday, November 17 · 11:00 AM</p>
          <p className="ss-small">Bish's RV Meridian, ID. Your outfitter will meet you there.</p>
        </NS.Card>
      </div>
      <Tag kind="rule" q="Q20" id="inspection-bookable">is an inspection bookable here?</Tag>
    </Section>
  );
}

function Notes() {
  const NS = ds();
  return (
    <Section id="sec-portal-notes" sec="S08" label="Notes">
      <p className="ss-overline">Notes</p><h2 className="ss-h2">Your notes</h2>
      <p className="ss-body">Everything you wrote on your saved RVs, plus questions for your outfitter.</p>
      <div className="ss-notes">
        {NOTES.map((n) => (
          <NS.Card key={n.id} theme="light" title={n.unit} subtitle={n.when} specId={`card-note#${n.id}`} footer={<Action specId={`btn-action-edit-note#${n.id}`} perm="notes.edit" quiet target="needs-rule:Q21"><VIcon name="pencil" size={18} />Edit</Action>}>
            <p className="ss-note-t" data-example="true">{n.text}</p>
            <div className="ss-tags">{n.tags.map((t) => <NS.Badge key={t} type="neutral" theme="light" specId={`badge-note-tag#${n.id}-${slug(t)}`}>{t}</NS.Badge>)}</div>
          </NS.Card>
        ))}
      </div>
      <NS.Card theme="light" title="Open questions for your outfitter · 2" specId="card-open-questions">
        <ul className="ss-q">{QUESTIONS.map((q) => <li key={q} data-example="true">{q}</li>)}</ul>
      </NS.Card>
      <Tag kind="rule" q="Q21" id="notes-store">where notes live; how "Send" reaches the outfitter</Tag>
      <div className="ss-bar-btns ss-left"><Commit specId="btn-commit-send-questions" perm="notes.send" target="needs-rule:Q21"><VIcon name="send" size={18} />Send to your outfitter</Commit></div>
    </Section>
  );
}

function Outfitter() {
  const NS = ds();
  return (
    <Section id="sec-portal-outfitter" sec="S09" label="Outfitter">
      <p className="ss-overline">Outfitter</p><h2 className="ss-h2">Your outfitter</h2>
      <p className="ss-body">Your outfitter is your person at Bish's RV Meridian, ID.</p>
      <NS.Card theme="light" title="Outfitter name" subtitle="Bish's RV Meridian, ID" specId="card-outfitter">
        <div className="ss-who"><NS.Avatar initials="ON" name="Outfitter name" theme="light" size="lg" specId="info-avatar-outfitter-page" /><p className="ss-small">Your outfitter can walk you through your top three, answer the questions on your notes, and meet you for a trade inspection or a visit on the lot.</p></div>
        <Tag kind="rule" q="Q18" id="outfitter-name">outfitter name + photo come from assignment</Tag>
      </NS.Card>
      <div className="ss-bar-btns ss-left">
        <Commit specId="btn-commit-text-outfitter-page" perm="outfitter.contact" target="needs-rule:Q18"><VIcon name="message-circle" size={18} />Text your outfitter</Commit>
        <Action specId="btn-action-call-outfitter-page" perm="outfitter.contact" target="external:tel"><VIcon name="phone" size={18} />Call</Action>
        <Action specId="btn-action-book-visit-outfitter" perm="visit.book" target="frame-book-visit" onClick={() => go('book-visit')}>Book a visit</Action>
      </div>
      <Tag kind="rule" q="Q18" id="outfitter-channels">who is assigned, what the shopper sees, text/call channels</Tag>
      <Tag kind="pdb" q="Q18" id="outfitter-meridian">outfitter at Meridian, 2:54 PM</Tag>
    </Section>
  );
}

function Alerts() {
  const NS = ds();
  return (
    <Dialog frame="sec-alerts-panel" overline="" title={`Alerts · ${ALERTS.length}`} onClose={() => go('portal')} closeLabel="Close alerts">
      <Tag kind="rule" q="Q17" id="alerts">alert sources, count, read/unread</Tag>
      <Tag kind="interp" q="Q17" id="alert-timer">PhaseAlert has no timer-less variant; the timer shows time since the alert (DSG-01)</Tag>
      {ALERTS.map((a, i) => (
        <NS.PhaseAlert key={a.id} instance={a.id} eyebrow={a.eyebrow} from={a.from} title={a.title} people={[]} live={false} waitSeconds={[9 * 60 + 14, 26 * 60, 41 * 60][i]}
          ctaLabel={a.cta} onCommit={() => go(a.go === 'results' ? 'results' : a.go === 'my-deal' ? 'portal-my-deal' : 'portal-outfitter')} onDismiss={() => go('portal')} specId={`frame-alert#${a.id}`} />
      ))}
    </Dialog>
  );
}

function Book() {
  const [store, setStore] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [all, setAll] = useState(false);
  const [stateCode, setStateCode] = useState('');
  const [options, setOptions] = useState<{ code: string; label: string }[]>([]);
  const [group, setGroup] = useState('');
  const [hint, setHint] = useState('');
  const [warn, setWarn] = useState(false);
  const [stateNeeded, setStateNeeded] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const NS = ds();
  useEffect(() => {
    let live = true;
    (async () => {
      if (all) {
        if (!live) return;
        setDisabled(false); setGroup('All stores');
        setOptions([...SAVE_STORES].sort((a, b) => a.label.localeCompare(b.label)));
        setHint(`All ${SAVE_STORES.length} stores, A to Z.`); setWarn(false);
        return;
      }
      const table = await loadZips();
      if (!live) return;
      const mode = pickerModeFor(loadStepZip(), table);
      if (mode.kind === 'ip-fallback') {
        setStateNeeded(false); setDisabled(false); setWarn(false); setGroup('');
        setOptions(SHORT_STORES);
        setHint(SHORT_LIST_HINT);
        return;
      }
      if (mode.kind === 'invalid') {
        const lead = `We couldn't find ZIP ${mode.zip}.`;
        setStateNeeded(true);
        if (!stateCode) { setDisabled(true); setOptions([]); setHint(`${lead} Choose your state to see its stores.`); setWarn(true); return; }
        const name = STORE_STATES.find((s) => s.code === stateCode)?.name || stateCode;
        setDisabled(false); setGroup(`Stores in ${name}`); setOptions(storesInState(stateCode));
        setHint(`${lead} Showing stores in ${name}.`); setWarn(true);
        return;
      }
      setStateNeeded(false); setDisabled(false); setWarn(false);
      setGroup(mode.kind === 'zip' ? `Closest to ${mode.zip}` : 'Closest to your area');
      setOptions(mode.stores);
      setHint(mode.kind === 'zip' ? `Closest ${mode.stores.length} to ZIP ${mode.zip} from step 1. Straight-line miles.` : 'No ZIP yet, so this is the fixed short list until an approximate location is available.');
    })();
    return () => { live = false; };
  }, [all, stateCode]);
  const ok = store && /^\d{4}-\d{2}-\d{2}$/.test(date) && slot;
  return (
    <Dialog frame="frame-book-visit" overline="Book a visit" title="Walk through your #1" onClose={() => go('portal')} closeLabel="Close Book a visit"
      bar={<>
        {!ok && <p id="book-reason" className="ss-reason" data-spec-id="info-book-reason">Pick a store, a date and a time to continue.</p>}
        <div className="ss-bar-btns"><Commit specId="btn-commit-review-visit" perm="visit.book" target="frame-book-visit-confirm" disabled={!ok} reason="book-reason" onClick={() => go('book-visit-confirm')}>Review visit</Commit><Action specId="btn-action-book-not-now" quiet onClick={() => go('portal')}>Not now</Action></div>
      </>}>
      <p className="ss-body">Pick a store, a day, and a time. Your outfitter will meet you at the 2026 Avenue 26RD. No pressure.</p>
      {stateNeeded && <SelectField id="sp-book-state" label="State" value={stateCode} placeholder="Choose a state" options={STORE_STATES.map((s) => ({ code: s.code, label: s.name }))} onChange={(v) => { setStore(''); setAll(false); setStateCode(v); }} />}
      <SelectField id="sp-book-store" label="Store" value={store} onChange={setStore} group={group} options={options} disabled={disabled} placeholder={disabled ? 'Choose a state first' : 'Choose a store'} hint={hint} warn={warn}>
        {!all && !stateNeeded && <div className="ss-inline"><Action specId="btn-action-book-show-all-stores" quiet onClick={() => { setStore(''); setAll(true); }}>Show all stores</Action></div>}
        <div className="ss-tags"><Tag kind="zach" id="book-top3">top 3 closest to the ZIP, 3:05 PM</Tag><Tag kind="pdb" q="Q8" id="book-show-all">"Show all stores" lists all 27</Tag></div>
      </SelectField>
      <Field id="sp-book-date" label="Date" type="date" value={date} onChange={setDate} helper="Pick a date." />
      <NS.ChoiceGroup label="Time slot" density="compact">
        {SLOTS.map((s) => <NS.ChoiceChip key={s} label={s} size="md" selected={slot === s} onClick={() => setSlot(s)} specId={`input-choice-slot#${s.replace(/[^0-9apm]/gi, '').toLowerCase()}`} />)}
      </NS.ChoiceGroup>
      <Tag kind="rule" q="Q19" id="slots">real slots: store hours, lead time, who confirms</Tag>
    </Dialog>
  );
}

function BookConfirm() {
  return (
    <Dialog frame="frame-book-visit-confirm" overline="Book a visit" title="Confirm your visit" onClose={() => go('portal')} closeLabel="Close Book a visit"
      bar={<div className="ss-bar-btns"><Commit specId="btn-commit-confirm-visit" perm="visit.book" target="frame-book-visit-success" onClick={() => go('book-visit-success')}>Confirm visit</Commit><Action specId="btn-action-change-date" quiet target="frame-book-visit" onClick={() => go('book-visit')}>Change date or time</Action></div>}>
      <p className="ss-body">We'll tell your outfitter you're coming. You can change this later.</p>
      <Tag kind="rule" q="Q19" id="confirm-sends">what "tell your outfitter" sends; can they change it later?</Tag>
      <dl className="ss-kept ss-summary" data-spec-id="list-visit-summary">
        <div><dt>Unit</dt><dd>2026 Avenue 26RD</dd></div>
        <div><dt>Store</dt><dd data-example="true">Bish's RV Meridian, ID</dd></div>
        <div><dt>When</dt><dd data-example="true">Tuesday, November 17, 2026 · 11:00 AM</dd></div>
        <div><dt>With</dt><dd data-needs-rule="Q18">Outfitter name</dd></div>
      </dl>
    </Dialog>
  );
}

function BookSuccess() {
  return (
    <Dialog frame="frame-book-visit-success" overline="Book a visit" title="You're booked" onClose={() => go('portal')} closeLabel="Close"
      bar={<div className="ss-bar-btns"><Commit specId="btn-commit-back-to-portal" perm="portal.view" target="screen:portal" onClick={() => go('portal')}>Back to my portal</Commit></div>}>
      <div className="ss-ok"><VIcon name="circle-check" size={28} /></div>
      <p className="ss-body">Your outfitter will meet you at the 2026 Avenue 26RD at <b data-example="true">Bish's RV Meridian, ID</b> on <b data-example="true">Tuesday, November 17, 2026 · 11:00 AM</b>.</p>
    </Dialog>
  );
}

export function CustomerPortal({ state }: { state: string }) {
  const st = fromState(state);
  const ref = useRef<HTMLDivElement>(null);
  const NS = ds();
  useEffect(() => {
    document.body.classList.add('is-portal');
    return () => document.body.classList.remove('is-portal');
  }, []);
  useEffect(() => {
    if (!st.openNav || !ref.current) return;
    const t = setTimeout(() => {
      const b = ref.current?.querySelector('[data-spec-id="btn-nav-open-drawer"],[data-spec-id="btn-nav-open-menu"]') as HTMLButtonElement | null;
      b?.click();
    }, 80);
    return () => clearTimeout(t);
  }, [st.openNav]);
  const dataOk = st.data === 'ok' || st.data === 'stale' || st.data === 'partial';
  const tabLabel = (TABS.find((t) => t[0] === st.tab) || TABS[0])[1];
  const onNavigate = (id: string) => {
    if (id === 'alerts') return go('portal-alerts');
    if (id === 'messenger') return go('portal-outfitter');
    if (id === 'tours') return go('book-visit');
    if (id === 'saved-units') return go('portal-saved-units');
    if (id === 'my-deal') return go('portal-my-deal');
    go('portal');
  };
  const overlay = st.overlay === 'alerts' ? <Alerts /> : st.overlay === 'book' ? <Book /> : st.overlay === 'book-confirm' ? <BookConfirm /> : st.overlay === 'book-success' ? <BookSuccess /> : null;
  let body;
  if (st.nav === 'saved-units') {
    body = (
      <Section id="sec-portal-saved-units" sec="S10" type="list" label="Saved units">
        <div className="ss-sec-head"><h2 className="ss-h2">Saved units</h2><span className="ss-count">2 saved</span></div>
        <div className="ss-grid">{UNITS.filter((u) => u.saved).map((u) => <UnitCard key={u.id} u={u} ctx="saved" />)}</div>
      </Section>
    );
  } else if (st.nav === 'my-deal') {
    body = (
      <Section id="sec-portal-my-deal" sec="S11" label="My deal">
        <p className="ss-overline">My deal</p><h2 className="ss-h2">Your payment worksheet</h2>
        <p className="ss-body">Your outfitter sent a worksheet for the 2026 Avenue 26RD.</p>
        <NS.Card theme="light" title="Worksheet" subtitle="Not designed in the source" specId="card-worksheet-placeholder"><p className="ss-small">The worksheet view goes here.</p><Tag kind="rule" q="Q33" id="worksheet">what the customer worksheet shows; in scope for Save Progress?</Tag></NS.Card>
      </Section>
    );
  } else {
    body = (
      <>
        <Section id="sec-portal-header" sec="S02" type="header" label="Customer portal">
          <p className="ss-overline">Customer portal</p>
          <h1 className="ss-h1">{st.data === 'denied' ? 'Customer portal' : `Welcome, ${CUSTOMER.first}.`}</h1>
          {st.data !== 'denied' && <p className="ss-lede">Your Smart Shopper answers, top three, saved RVs, trade, and notes are here. You can pick up right where you left off.</p>}
          <Tag kind="rule" q="Q2" id="portal-login">is the portal a login, and how do they get back in</Tag>
        </Section>
        {dataOk && (
          <Section id="sec-portal-tabs" sec="S03" type="nav" label="My case">
            <NS.TabBar theme="light" tabs={TABS.map((t) => t[1])} active={tabLabel} onChange={(label: string) => go(TABS.find((t) => t[1] === label)?.[0] === 'overview' ? 'portal' : `portal-${TABS.find((t) => t[1] === label)?.[0]}`)} specId="nav-my-case-tabs" />
          </Section>
        )}
        {(st.tab === 'overview' || !dataOk) && <Overview data={st.data} />}
        {dataOk && st.tab === 'trade' && <Trade />}
        {dataOk && st.tab === 'notes' && <Notes />}
        {dataOk && st.tab === 'outfitter' && <Outfitter />}
      </>
    );
  }
  return (
    <div ref={ref} className="ss-shell-host" data-bos-role="customer" inert={overlay ? true : undefined}>
      <NS.AppShell role="customer" activeId={st.nav} theme="light" height="100%" alerts={st.data === 'denied' ? 0 : 3}
        logoSrc="vendor/logo-bishs-os.png" logoSrcDark="vendor/logo-bishs-os-white.png" onNavigate={onNavigate}>
        <div className="ss-app"><div className="ss-page ss-portal">{body}</div></div>
      </NS.AppShell>
      {overlay}
    </div>
  );
}

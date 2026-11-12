// Save Progress overlays (v5 frames). The store list still comes from the staging picker rules.
import { useEffect, useState } from 'react';
import { loadAnswers } from '../answers';
import { loadZips } from '../steps/inventory';
import { confirmSignInCode, submitCustomerProfile } from './submitProfile';
import { loadProfile } from './profile';
import {
  SAVE_STORES, SHORT_LIST_HINT, SHORT_STORES, STORE_STATES, loadStepZip, pickerModeFor, storesInState, type NearStore,
} from './stores';
import { Action, Banner, CheckField, Commit, Dialog, Field, SelectField, Tag, VIcon } from './v5ui';
import type { SavePhase } from './SaveFlow';

const CUSTOMER = { first: 'Robert', last: 'Jackson', email: 'robert.jackson@example.com', phone: '(208) 555-0142' };
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const phoneOk = (v: string) => !v || v.replace(/\D/g, '').length === 10;

type Force =
  | { kind: 'live' }
  | { kind: 'ip' }
  | { kind: 'ip-failed'; state?: string }
  | { kind: 'invalid'; zip: string; state?: string }
  | { kind: 'zip'; zip: string };

function forceFor(phase: SavePhase): Force {
  if (phase === 'save-ip') return { kind: 'ip' };
  if (phase === 'save-ip-failed') return { kind: 'ip-failed' };
  if (phase === 'save-zip-invalid') return { kind: 'invalid', zip: '8364' };
  if (phase === 'save-zip-state') return { kind: 'invalid', zip: '8364', state: 'ID' };
  if (phase === 'save-tie') return { kind: 'zip', zip: '42262' };
  return { kind: 'live' };
}

function useStorePick(phase: SavePhase) {
  const force = forceFor(phase);
  const [ready, setReady] = useState(force.kind === 'ip' || force.kind === 'ip-failed');
  const [options, setOptions] = useState<NearStore[]>([]);
  const [group, setGroup] = useState('');
  const [hint, setHint] = useState('');
  const [warn, setWarn] = useState(false);
  const [tie, setTie] = useState(false);
  const [stateNeeded, setStateNeeded] = useState(force.kind === 'ip-failed' || force.kind === 'invalid');
  const [disabled, setDisabled] = useState(force.kind === 'ip-failed' || (force.kind === 'invalid' && !force.state));
  const [all, setAll] = useState(false);
  const [stateCode, setStateCode] = useState(force.kind === 'invalid' ? force.state || '' : force.kind === 'ip-failed' ? force.state || '' : '');
  const [show, setShow] = useState(force.kind);

  useEffect(() => {
    let live = true;
    const applyState = (zipLabel: string, lead: string) => {
      if (!stateCode) {
        setStateNeeded(true); setDisabled(true); setOptions([]); setGroup('');
        setHint(`${lead} Choose your state to see its stores.`); setWarn(true); setTie(false);
        return;
      }
      const name = STORE_STATES.find((s) => s.code === stateCode)?.name || stateCode;
      setStateNeeded(true); setDisabled(false); setGroup(`Stores in ${name}`);
      setOptions(storesInState(stateCode));
      setHint(`${lead} Showing stores in ${name}.`); setWarn(true); setTie(false);
      void zipLabel;
    };
    (async () => {
      if (all) {
        if (!live) return;
        setDisabled(false); setGroup('All stores');
        setOptions([...SAVE_STORES].sort((a, b) => a.label.localeCompare(b.label)));
        setHint(`All ${SAVE_STORES.length} stores, A to Z.`); setWarn(false);
        return;
      }
      if (force.kind === 'ip-failed') { if (live) applyState('', "We couldn't tell your area."); return; }
      if (force.kind === 'invalid') { if (live) applyState(force.zip, `We couldn't find ZIP ${force.zip}.`); return; }
      const table = await loadZips();
      if (!live) return;
      const zip = force.kind === 'zip' ? force.zip : force.kind === 'live' ? loadStepZip() : '';
      const mode = force.kind === 'ip' || (force.kind === 'live' && !zip.trim())
        ? pickerModeFor('', null)
        : pickerModeFor(zip, table);
      if (mode.kind === 'invalid') { applyState(mode.zip, `We couldn't find ZIP ${mode.zip}.`); setShow('invalid'); return; }
      if (mode.kind === 'ip-fallback') {
        setShow('ip'); setStateNeeded(false); setDisabled(false); setGroup(''); setTie(false); setWarn(false);
        setOptions(SHORT_STORES);
        setHint(SHORT_LIST_HINT);
        return;
      }
      if (mode.kind === 'zip') {
        setShow(mode.tie ? 'zip4' : 'zip'); setStateNeeded(false); setDisabled(false); setWarn(false); setTie(mode.tie);
        setGroup(`Closest to ${mode.zip}`); setOptions(mode.stores);
        const names = mode.stores.map((s) => s.label.split(',')[0].replace(/ ·.*/, '')).join(', ');
        setHint(mode.tie
          ? `Closest 4 to ZIP ${mode.zip} from step 1: ${names}. The 3rd and 4th are within 5 miles of each other. Straight-line miles.`
          : `Closest ${mode.stores.length} to ZIP ${mode.zip} from step 1: ${names}. Straight-line miles.`);
        return;
      }
      if (mode.kind === 'ip') {
        setShow('ip'); setStateNeeded(false); setDisabled(false); setWarn(false); setTie(mode.tie);
        setGroup('Closest to your area'); setOptions(mode.stores);
        setHint('No ZIP yet, so these are the stores closest to your area, based on your approximate location. Straight-line miles.');
      }
    })();
    return () => { live = false; };
  }, [phase, all, stateCode]);

  return { ready, options, group, hint, warn, tie, stateNeeded, disabled, all, setAll, stateCode, setStateCode, show, setReady };
}

export function V5Save({ phase, pins, saved, onPhase }: { phase: SavePhase; pins: string[]; saved: string[]; onPhase: (p: SavePhase) => void }) {
  if (!phase) return null;
  if (phase === 'save-loading') return <SaveLoading />;
  if (phase === 'save-code' || phase === 'save-code-wrong' || phase === 'save-code-expired') return <SaveCode phase={phase} onPhase={onPhase} />;
  if (phase === 'save-merge') return <SaveMerge onPhase={onPhase} />;
  if (phase === 'save-success') return <SaveSuccess onPhase={onPhase} />;
  return <SaveForm phase={phase} pins={pins} saved={saved} onPhase={onPhase} />;
}

function closeToResults(onPhase: (p: SavePhase) => void) {
  const s = new URLSearchParams(location.search);
  s.set('screen', s.get('screen') || 'results');
  s.delete('save');
  s.delete('state');
  const str = s.toString();
  history.pushState(null, '', `${location.pathname}${str ? `?${str}` : ''}`);
  onPhase('');
}

function go(phase: SavePhase, onPhase: (p: SavePhase) => void) {
  const s = new URLSearchParams(location.search);
  s.set('screen', s.get('screen') || 'results');
  s.set('state', phase);
  history.pushState(null, '', `${location.pathname}?${s.toString()}`);
  onPhase(phase);
}

function SaveForm({ phase, pins, saved, onPhase }: { phase: SavePhase; pins: string[]; saved: string[]; onPhase: (p: SavePhase) => void }) {
  const preset = phase === 'save-error'
    ? { first: 'Robert', last: 'Jackson', email: 'robert.jackson@exa', phone: '208555', consent: false }
    : phase === 'save-network-error'
      ? { first: CUSTOMER.first, last: CUSTOMER.last, email: CUSTOMER.email, phone: CUSTOMER.phone, consent: true }
      : { first: '', last: '', email: '', phone: '', consent: false };
  const [f, setF] = useState(preset);
  const [touched, setTouched] = useState(phase === 'save-error');
  const [store, setStore] = useState('');
  const [net, setNet] = useState(phase === 'save-network-error');
  const [busy, setBusy] = useState(false);
  const pick = useStorePick(phase);
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const errs = {
    first: !f.first.trim() && 'Enter your first name.',
    last: !f.last.trim() && 'Enter your last name.',
    email: !f.email.trim() ? 'Enter your email.' : !emailOk(f.email) && 'That email looks incomplete. Try name@example.com.',
    phone: !phoneOk(f.phone) && 'Enter a 10-digit mobile number.',
    consent: !f.consent && 'Check this box so we can send your sign-in code.',
  };
  const nErr = Object.values(errs).filter(Boolean).length;
  const valid = nErr === 0;
  const show = (k: keyof typeof errs) => (touched ? errs[k] || null : null);
  const pinN = pins.filter(Boolean).length;
  const submit = async () => {
    if (!valid) { setTouched(true); return; }
    setNet(false);
    setBusy(true);
    go('save-loading', onPhase);
    await submitCustomerProfile({
      firstName: f.first.trim(), lastName: f.last.trim(), email: f.email.trim(), phone: f.phone.trim(),
      store, consent: f.consent, answers: loadAnswers(), pins, saved,
    });
    go('save-code', onPhase);
  };
  return (
    <Dialog frame="frame-save-progress" overline="Save Progress" title="Create your customer profile" onClose={() => closeToResults(onPhase)} closeLabel="Close Save Progress"
      bar={<>
        {!valid && <p id="save-reason" className="ss-reason" data-spec-id="info-save-reason">Add your first name, last name and email, and check the box, to save.</p>}
        <div className="ss-bar-btns">
          <Commit specId="btn-commit-save-progress" perm="profile.create" target="frame-save-progress-loading" disabled={!valid || busy} reason="save-reason" onClick={submit}>{net ? 'Try again' : 'Save my progress'}</Commit>
          <Action specId="btn-action-not-now" quiet onClick={() => closeToResults(onPhase)}>Not now</Action>
        </div>
      </>}>
      <p className="ss-body">We'll keep your Smart Shopper answers, your top three, and any RVs you saved. We'll email you a sign-in code — no password to make up.</p>
      <Tag kind="pdb" q="Q3" id="code-first">code first, link fallback</Tag>
      {net && <Banner specId="info-save-network-error" icon="wifi-off" title="Your progress isn't saved yet.">The connection dropped before your profile was created. Your answers are still here. Check your connection, then try again.<br /><Tag kind="rule" q="Q34" id="network-retry">retry policy + offline copy</Tag></Banner>}
      {touched && nErr > 0 && <Banner specId="info-save-error-summary" title={`Fix ${nErr} ${nErr === 1 ? 'thing' : 'things'} to continue.`} />}
      <dl className="ss-kept" data-spec-id="list-kept-items">
        <div><dt>Smart Shopper answers</dt><dd>Kept</dd></div>
        <div><dt>Your top three</dt><dd>{pinN} {pinN === 1 ? 'match' : 'matches'}</dd></div>
        <div><dt>Saved RVs</dt><dd>{saved.length} {saved.length === 1 ? 'unit' : 'units'}</dd></div>
      </dl>
      <Tag kind="rule" q="Q4" id="required-fields">which fields are required</Tag>
      <div className="ss-form-grid">
        <Field id="sp-first" label="First name" value={f.first} onChange={set('first') as (v: string) => void} error={show('first')} autoComplete="given-name" required />
        <Field id="sp-last" label="Last name" value={f.last} onChange={set('last') as (v: string) => void} error={show('last')} autoComplete="family-name" required />
        <Field id="sp-email" label="Email" type="email" value={f.email} onChange={set('email') as (v: string) => void} error={show('email')} helper="We'll send a 4-digit sign-in code here." autoComplete="email" inputMode="email" required />
        <Field id="sp-phone" label="Mobile phone" type="tel" value={f.phone} onChange={set('phone') as (v: string) => void} error={show('phone')} helper="Optional." autoComplete="tel" inputMode="tel" />
      </div>
      <Tag kind="rule" q="Q24" id="sms-code">text the code too?</Tag>
      <div className="ss-store" data-picker-mode={pick.show} data-spec-id="sec-store-picker" data-bos-level="layer" data-bos-layer="L01">
        {pick.stateNeeded && (
          <SelectField id="sp-field-state" label="State" value={pick.stateCode} placeholder="Choose a state" options={STORE_STATES.map((s) => ({ code: s.code, label: s.name }))}
            onChange={(v) => { setStore(''); pick.setAll(false); pick.setStateCode(v); }} />
        )}
        <SelectField id="sp-field-store" label="Preferred store" optional value={store} onChange={setStore} group={pick.group} options={pick.options} disabled={pick.disabled}
          placeholder={pick.disabled ? 'Choose a state first' : 'Choose a store'} hint={pick.hint} warn={pick.warn}>
          {!pick.all && !pick.stateNeeded && <div className="ss-inline"><Action specId="btn-action-show-all-stores" quiet onClick={() => { setStore(''); pick.setAll(true); }}>Show all stores</Action></div>}
          <div className="ss-tags">
            <Tag kind="zach" id="top3-by-zip">top 3 closest to the ZIP, 3:05 PM</Tag>
            <Tag kind="pdb" q="Q8" id="show-all-stores">"Show all stores" lists all 27, 2:54 PM</Tag>
            {pick.show === 'ip' && <><Tag kind="zach" id="ip-fallback">no ZIP → closest to approximate location, 3:13 PM</Tag><Tag kind="rule" q="Q28" id="ip-provider">IP geolocation provider</Tag></>}
            {(phase === 'save-ip-failed' || pick.show === 'ip-failed') && <><Tag kind="interp" q="Q30" id="ip-failed">IP lookup failed → same state picker as an invalid ZIP</Tag><Tag kind="rule" q="Q28" id="ip-provider-failed">IP geolocation provider</Tag><Tag kind="rule" q="Q29" id="american-fork">American Fork has no address, so it is in no state list</Tag></>}
            {(pick.show === 'invalid' || phase === 'save-zip-invalid' || phase === 'save-zip-state') && <Tag kind="zach" id="state-picker">invalid ZIP → state picker, nothing preselected, 3:13 PM</Tag>}
            {pick.tie && <Tag kind="interp" q="Q27" id="tie-rule">4th shown when within 5 mi of the 3rd (Zach 3:13 PM)</Tag>}
          </div>
        </SelectField>
      </div>
      <CheckField id="sp-consent" checked={f.consent} onChange={(v) => setF((x) => ({ ...x, consent: v }))} error={show('consent')}>It's okay for Bish's RV to contact me by email or text about my saved RVs and this search. Message and data rates may apply.</CheckField>
      <Tag kind="pdb" q="Q5" id="consent-required">required to save; wording needs legal sign-off</Tag>
      <p className="ss-fine" data-spec-id="info-terms-placeholder">Terms and privacy line goes here.</p>
      <Tag kind="rule" q="Q6" id="legal-copy">legal copy and links</Tag>
    </Dialog>
  );
}

function SaveLoading() {
  return (
    <Dialog frame="frame-save-progress-loading" overline="Save Progress" title="Saving your progress" busy>
      <div className="ss-progress" role="progressbar" aria-label="Saving your progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={60} data-spec-id="info-save-progress-bar"><span style={{ width: '60%' }} /></div>
      <p className="ss-body">Hang tight — we're creating your customer profile and sending a sign-in code.</p>
      <Tag kind="rule" q="Q1" id="save-backend">save backend + timing</Tag>
    </Dialog>
  );
}

function SaveCode({ phase, onPhase }: { phase: SavePhase; onPhase: (p: SavePhase) => void }) {
  const wrong = phase === 'save-code-wrong';
  const expired = phase === 'save-code-expired';
  const [d, setD] = useState(wrong ? ['4', '8', '2', '1'] : ['', '', '', '']);
  const [state, setState] = useState(wrong ? 'wrong' : expired ? 'expired' : '');
  const profile = loadProfile();
  const email = profile?.email || CUSTOMER.email;
  const phone = profile?.phone || CUSTOMER.phone;
  const full = d.every((x) => /^\d$/.test(x));
  const setDigit = (i: number) => (v: string) => {
    const n = d.slice();
    n[i] = v.replace(/\D/g, '').slice(-1);
    setD(n);
    if (state === 'wrong') setState('');
  };
  const err = state === 'wrong' ? "That code doesn't match. Check the newest email from Bish's RV and try again." : null;
  const verify = () => {
    if (confirmSignInCode(d.join(''))) go('save-merge', onPhase);
    else setState('wrong');
  };
  return (
    <Dialog frame="frame-save-progress-code" overline="Save Progress" title={state === 'expired' ? 'This code expired' : 'Enter your sign-in code'} onClose={() => closeToResults(onPhase)} closeLabel="Close Save Progress"
      bar={<>
        {state !== 'expired' && !full && <p id="code-reason" className="ss-reason" data-spec-id="info-code-reason">Enter all 4 digits to continue.</p>}
        <div className="ss-bar-btns">
          {state === 'expired'
            ? <Commit specId="btn-commit-send-new-code" perm="session.verify" target="frame-save-progress-code" onClick={() => { setState(''); setD(['', '', '', '']); go('save-code', onPhase); }}>Send a new code</Commit>
            : <Commit specId="btn-commit-verify-code" perm="session.verify" target="frame-save-progress-merge" disabled={!full} reason="code-reason" onClick={verify}>Verify and save</Commit>}
          <Action specId="btn-action-use-email-link" quiet target="external:magic-link email" onClick={() => go('save-merge', onPhase)}>Or use the link we emailed</Action>
          {state !== 'expired' && <Action specId="btn-action-resend-code" quiet onClick={() => { setState(''); setD(['', '', '', '']); }}>Resend code</Action>}
        </div>
      </>}>
      {state === 'expired'
        ? <Banner tone="warning" icon="clock" specId="info-code-expired" title="Send a new code to keep going.">Your answers and top three are still here. The new code goes to {email}.</Banner>
        : <p className="ss-body">We sent a 4-digit code to <b data-example="true">{email}</b> and <b data-example="true">{phone}</b>.</p>}
      {state !== 'expired' && (
        <fieldset className="ss-code" aria-describedby={err ? 'code-msg' : undefined}>
          <legend className="ss-label">4-digit code</legend>
          <div className="ss-code-row">{d.map((v, i) => <Field key={i} id={`sp-code-${i + 1}`} label="" ariaLabel={`Digit ${i + 1} of 4`} value={v} onChange={setDigit(i)} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1} />)}</div>
          {err && <p id="code-msg" className="ss-err" role="alert" data-spec-id="info-code-error">{err}</p>}
        </fieldset>
      )}
      <p className="ss-fine" data-spec-id="info-code-expiry-placeholder">Code and link expiry go here.</p>
      <Tag kind="rule" q="Q3" id="code-expiry">code + link expiry, resend limit, attempt limit</Tag>
    </Dialog>
  );
}

function SaveMerge({ onPhase }: { onPhase: (p: SavePhase) => void }) {
  const email = loadProfile()?.email || CUSTOMER.email;
  return (
    <Dialog frame="frame-save-progress-merge" overline="Save Progress" title="We found your profile" onClose={() => closeToResults(onPhase)} closeLabel="Close Save Progress"
      bar={<div className="ss-bar-btns"><Commit specId="btn-commit-add-search" perm="profile.merge" target="frame-save-progress-success" onClick={() => go('save-success', onPhase)}>Add this search</Commit><Action specId="btn-action-not-me" quiet target="needs-rule:Q22" onClick={() => go('save', onPhase)}>This isn't me</Action></div>}>
      <p className="ss-body">We'll add this search to it. Your Smart Shopper answers, top three, and saved RVs will join the ones already in <b data-example="true">{email}</b>'s portal.</p>
      <Tag kind="pdb" q="Q7" id="merge">existing email merges</Tag>
      <dl className="ss-kept" data-spec-id="list-merge-items">
        <div><dt>This search's answers</dt><dd>Added</dd></div>
        <div><dt>This search's top three</dt><dd>Merged</dd></div>
        <div><dt>This search's saved RVs</dt><dd>Added</dd></div>
      </dl>
      <Tag kind="rule" q="Q22" id="merge-rules">how top three / saved merge; "This isn't me" path</Tag>
    </Dialog>
  );
}

function SaveSuccess({ onPhase }: { onPhase: (p: SavePhase) => void }) {
  const profile = loadProfile();
  const name = profile ? `${profile.firstName} ${profile.lastName}` : `${CUSTOMER.first} ${CUSTOMER.last}`;
  return (
    <Dialog frame="frame-save-progress-success" overline="Save Progress" title="Your progress is saved" onClose={() => closeToResults(onPhase)} closeLabel="Close"
      bar={<div className="ss-bar-btns"><Commit specId="btn-commit-go-to-portal" perm="portal.view" target="screen:portal" onClick={() => { location.href = `${location.pathname}?state=portal`; }}>Go to my portal</Commit><Action specId="btn-action-keep-shopping" quiet target="screen:results" onClick={() => closeToResults(onPhase)}>Keep shopping</Action></div>}>
      <div className="ss-ok"><VIcon name="circle-check" size={28} /></div>
      <p className="ss-body">Your Smart Shopper answers, top three, and saved RVs are in your customer portal. You're signed in as <b data-example="true">{name}</b>.</p>
      <Tag kind="pdb" q="Q23" id="after-success">after success → portal</Tag>
    </Dialog>
  );
}

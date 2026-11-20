// Save Progress overlays (v5 frames). The store list still comes from the staging picker rules.
import { useEffect, useState, type ClipboardEvent, type FocusEvent, type KeyboardEvent } from 'react';
import { loadAnswers } from '../answers';
import { loadZips } from '../steps/inventory';
import { confirmEmailLink, confirmSignInCode, resendSignInCode, signOutShopper, submitCustomerProfile, asSaveAuthError } from './submitProfile';
import { loadProfile } from './profile';
import { hasConfirmableLink, parseLinkParams } from './linkParams';
import { MAX_WRONG_TRIES, recordWrongTry, resendWaitSeconds, triesLocked } from './otpTiming';
import { loadStepZip, rememberStepZip } from './stores';
import { nearestStoreForZip } from './zipStore';
import { Action, Banner, Commit, Dialog, Field, Tag, VIcon } from './v5ui';
import type { SavePhase } from './SaveFlow';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export function V5Save({ phase, pins, saved, onPhase }: { phase: SavePhase; pins: string[]; saved: string[]; onPhase: (p: SavePhase) => void }) {
  if (!phase) return null;
  if (phase === 'save-loading') return <SaveLoading />;
  if (phase === 'save-link') return <SaveLink onPhase={onPhase} />;
  if (phase === 'save-code' || phase === 'save-code-wrong' || phase === 'save-code-expired') return <SaveCode phase={phase} onPhase={onPhase} />;
  if (phase === 'save-merge') return <SaveMerge onPhase={onPhase} />;
  if (phase === 'save-success') return <SaveSuccess onPhase={onPhase} />;
  return <SaveForm phase={phase} pins={pins} saved={saved} onPhase={onPhase} />;
}

function closeToResults(_onPhase: (p: SavePhase) => void) {
  location.href = location.pathname;
}

function goWelcome() {
  location.href = `${location.pathname}?state=welcome`;
}

function go(phase: SavePhase, onPhase: (p: SavePhase) => void) {
  const s = new URLSearchParams(location.search);
  s.set('screen', 'unlock');
  s.set('state', phase);
  history.pushState(null, '', `${location.pathname}?${s.toString()}`);
  onPhase(phase);
}

const FORM_MSG_KEY = 'ss-save-form-msg';

function readFormMsg(): { net: boolean; msg: string } {
  try {
    const raw = sessionStorage.getItem(FORM_MSG_KEY);
    if (!raw) return { net: false, msg: '' };
    sessionStorage.removeItem(FORM_MSG_KEY);
    const parsed = JSON.parse(raw) as { net?: boolean; msg?: string };
    return { net: Boolean(parsed.net), msg: String(parsed.msg || '') };
  } catch {
    return { net: false, msg: '' };
  }
}

function writeFormMsg(net: boolean, msg: string) {
  sessionStorage.setItem(FORM_MSG_KEY, JSON.stringify({ net, msg }));
}

function SaveForm({ phase, pins, saved, onPhase }: { phase: SavePhase; pins: string[]; saved: string[]; onPhase: (p: SavePhase) => void }) {
  const existing = loadProfile();
  const [held] = useState(() => readFormMsg());
  const [email, setEmail] = useState(existing?.email || '');
  const [zip, setZip] = useState(existing?.zip || loadStepZip() || '');
  const [store, setStore] = useState(existing?.store || '');
  const [storeHint, setStoreHint] = useState('');
  const [touched, setTouched] = useState(phase === 'save-error');
  const [net, setNet] = useState(phase === 'save-network-error' || held.net);
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState(held.msg);
  const [zipTable, setZipTable] = useState<Record<string, [number, number]> | null>(null);

  useEffect(() => {
    let live = true;
    loadZips().then((table) => { if (live) setZipTable(table); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const hit = nearestStoreForZip(zip, zipTable);
    if (hit.ok) {
      setStore(hit.store.code);
      const city = hit.store.label.split('·')[0].trim();
      setStoreHint(`We'll show inventory closest to ${city}.`);
    } else {
      setStore('');
      setStoreHint('');
    }
  }, [zip, zipTable]);

  const emailErr = !email.trim() ? 'Enter your email.' : !emailOk(email) && 'That email looks incomplete. Try name@example.com.';
  const zipErr = !zip.trim()
    ? 'Enter your ZIP code.'
    : !/^\d{5}$/.test(zip.trim())
      ? 'Enter a 5-digit ZIP code.'
      : (zipTable && !nearestStoreForZip(zip, zipTable).ok) ? "We couldn't find that ZIP. Try a nearby ZIP code." : '';
  const errs = { email: emailErr, zip: zipErr };
  const nErr = Object.values(errs).filter(Boolean).length;
  const valid = nErr === 0 && Boolean(store);
  const show = (k: keyof typeof errs) => (touched ? errs[k] || null : null);

  const submit = async () => {
    if (!valid) { setTouched(true); return; }
    setNet(false);
    setFormMsg('');
    setBusy(true);
    rememberStepZip(zip.trim());
    go('save-loading', onPhase);
    try {
      await submitCustomerProfile({
        firstName: existing?.firstName || '',
        lastName: existing?.lastName || '',
        email: email.trim(),
        phone: existing?.phone || '',
        store,
        zip: zip.trim(),
        consent: existing?.consent || false,
        answers: loadAnswers(),
        pins,
        saved,
      });
      go('save-code', onPhase);
    } catch (err) {
      const e = asSaveAuthError(err);
      const isNet = e.code !== 'rate_limited' && e.code !== 'store';
      writeFormMsg(isNet, e.message);
      setBusy(false);
      if (e.code === 'rate_limited') setFormMsg(e.message);
      else { setNet(true); setFormMsg(e.message); }
      go('unlock', onPhase);
    }
  };

  return (
    <Dialog frame="frame-unlock-matches" overline="Smart Shopper" title="Enter your ZIP code so we can show you inventory closest to you" onClose={() => closeToResults(onPhase)} closeLabel="Close">
      <p className="ss-body">We'll email you a 6-digit sign-in code. After you enter it, your matches unlock. No password to make up.</p>
      {net && <Banner specId="info-unlock-network-error" icon="wifi-off" title="We couldn't send a code just now.">{formMsg || 'Check your connection, then try again.'}</Banner>}
      {!net && formMsg && <Banner specId="info-unlock-send-error" title="We couldn't send a code just now.">{formMsg}</Banner>}
      {touched && nErr > 0 && <Banner specId="info-unlock-error-summary" title={`Fix ${nErr} ${nErr === 1 ? 'thing' : 'things'} to continue.`} />}
      <div className="ss-form-grid ss-form-grid-unlock">
        <Field id="sp-zip" label="ZIP code" value={zip} onChange={setZip} error={show('zip')} helper={storeHint || '5-digit U.S. ZIP.'} autoComplete="postal-code" inputMode="numeric" maxLength={5} required />
        <Field id="sp-email" label="Email" type="email" value={email} onChange={setEmail} error={show('email')} helper="We'll send a 6-digit sign-in code here." autoComplete="email" inputMode="email" required />
      </div>
      {!valid && <p id="unlock-reason" className="ss-reason" data-spec-id="info-unlock-reason">Add your ZIP code and email to get your code.</p>}
      <div className="ss-bar-btns">
        <Commit specId="btn-commit-unlock-matches" perm="profile.create" target="frame-save-progress-loading" disabled={!valid || busy} reason="unlock-reason" onClick={submit}>{busy ? 'Sending…' : net ? 'Try again' : 'Send my sign-in code'}</Commit>
      </div>
    </Dialog>
  );
}

function SaveLoading() {
  return (
    <Dialog frame="frame-save-progress-loading" overline="Save Progress" title="Saving your progress" busy>
      <div className="ss-progress" role="progressbar" aria-label="Saving your progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={60} data-spec-id="info-save-progress-bar"><span style={{ width: '60%' }} /></div>
      <p className="ss-body">Hang tight — we're emailing your sign-in code.</p>
      <Tag kind="rule" q="Q1" id="save-backend">save backend + timing</Tag>
    </Dialog>
  );
}

function emptyCode() { return ['', '', '', '', '', '']; }

function SaveCode({ phase, onPhase }: { phase: SavePhase; onPhase: (p: SavePhase) => void }) {
  const wrong = phase === 'save-code-wrong';
  const expiredPreset = phase === 'save-code-expired';
  const [d, setD] = useState(wrong ? ['4', '8', '2', '1', '0', '0'] : emptyCode());
  const [state, setState] = useState<'wrong' | 'expired' | 'locked' | 'rate' | ''>(wrong ? 'wrong' : expiredPreset ? 'expired' : triesLocked() ? 'locked' : '');
  const [msg, setMsg] = useState(wrong ? "That code doesn't match. Check the newest email from Bish's RV and try again." : '');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(resendWaitSeconds());
  const profile = loadProfile();
  const email = profile?.email || 'your email';
  const full = d.every((x) => /^\d$/.test(x));

  useEffect(() => {
    const t = setInterval(() => setWait(resendWaitSeconds()), 500);
    return () => clearInterval(t);
  }, []);

  const codeIndex = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return 0;
    const m = /^sp-code-(\d)$/.exec(target.id);
    return m ? Math.max(0, Math.min(5, Number(m[1]) - 1)) : 0;
  };

  const focusBox = (idx: number) => {
    const el = document.getElementById(`sp-code-${Math.max(1, Math.min(6, idx + 1))}`);
    if (el instanceof HTMLInputElement) el.focus();
  };

  const setDigit = (i: number) => (v: string) => {
    const digits = v.replace(/\D/g, '');
    if (digits.length >= 3 || (digits.length === 2 && !d[i])) {
      const start = digits.length >= 6 || i === 0 ? 0 : i;
      const n = start === 0 ? emptyCode() : d.slice();
      digits.slice(0, 6 - start).split('').forEach((ch, off) => { n[start + off] = ch; });
      setD(n);
      if (state === 'wrong') { setState(''); setMsg(''); }
      focusBox(Math.min(5, start + digits.length));
      return;
    }
    const ch = digits.length === 2 && d[i]
      ? (digits[0] === d[i] ? digits[1] : digits[1] === d[i] ? digits[0] : digits.slice(-1))
      : digits.slice(-1);
    const n = d.slice();
    n[i] = ch;
    setD(n);
    if (state === 'wrong') { setState(''); setMsg(''); }
    if (ch && i < 5) focusBox(i + 1);
  };

  const onPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length < 2) return;
    e.preventDefault();
    const idx = codeIndex(e.target);
    const start = text.length >= 6 || idx === 0 ? 0 : idx;
    const n = start === 0 ? emptyCode() : d.slice();
    text.slice(0, 6 - start).split('').forEach((ch, off) => { n[start + off] = ch; });
    setD(n);
    if (state === 'wrong') { setState(''); setMsg(''); }
    focusBox(Math.min(5, start + text.length));
  };

  const onCodeKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = codeIndex(e.target);
    if (e.key === 'Backspace' && !d[idx] && idx > 0) {
      e.preventDefault();
      const n = d.slice();
      n[idx - 1] = '';
      setD(n);
      focusBox(idx - 1);
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      focusBox(idx - 1);
    } else if (e.key === 'ArrowRight' && idx < 5) {
      e.preventDefault();
      focusBox(idx + 1);
    }
  };

  const onCodeFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement) e.target.select();
  };

  const verify = async () => {
    if (!full || busy) return;
    if (triesLocked()) { setState('locked'); return; }
    setBusy(true);
    setMsg('');
    try {
      const result = await confirmSignInCode(d.join(''));
      goWelcome();
    } catch (err) {
      const e = asSaveAuthError(err);
      if (e.code === 'expired') { setState('expired'); setMsg(e.message); }
      else if (e.code === 'rate_limited') { setState('rate'); setMsg(e.message); }
      else {
        const n = recordWrongTry();
        if (n >= MAX_WRONG_TRIES) setState('locked');
        else { setState('wrong'); setMsg(e.message); }
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (wait > 0 || busy) return;
    setBusy(true);
    setMsg('');
    try {
      await resendSignInCode(email);
      setState('');
      setD(emptyCode());
      setWait(resendWaitSeconds());
    } catch (err) {
      const e = asSaveAuthError(err);
      if (e.code === 'rate_limited') setState('rate');
      else if (e.code === 'expired') setState('expired');
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const locked = state === 'locked' || state === 'expired';
  const title = state === 'expired' ? 'This code expired' : state === 'locked' ? "That's 5 tries" : 'Enter your sign-in code';
  const err = state === 'wrong' ? (msg || "That code doesn't match. Check the newest email from Bish's RV and try again.") : null;

  return (
    <Dialog frame="frame-save-progress-code" overline="Save Progress" title={title} onClose={() => closeToResults(onPhase)} closeLabel="Close Save Progress"
      bar={<>
        {!locked && !full && <p id="code-reason" className="ss-reason" data-spec-id="info-code-reason">Enter all 6 digits to continue.</p>}
        <div className="ss-bar-btns">
          {locked
            ? <Commit specId="btn-commit-send-new-code" perm="session.verify" target="frame-save-progress-code" disabled={busy || wait > 0} onClick={resend}>{wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}</Commit>
            : <Commit specId="btn-commit-verify-code" perm="session.verify" target="frame-save-progress-merge" disabled={!full || busy} reason="code-reason" onClick={verify}>{busy ? 'Verifying…' : 'Verify and save'}</Commit>}
          {!locked && <Action specId="btn-action-resend-code" quiet disabled={busy || wait > 0} onClick={resend}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</Action>}
        </div>
      </>}>
      {state === 'expired'
        ? <Banner tone="warning" icon="clock" specId="info-code-expired" title="Send a new code to keep going.">Your answers and top three are still here. The new code goes to {email}. {msg}</Banner>
        : state === 'locked'
          ? <Banner tone="warning" icon="clock" specId="info-code-locked" title="That's 5 tries. Send a new code to keep going.">Your answers and top three are still here. The new code goes to {email}.</Banner>
          : state === 'rate'
            ? <Banner tone="warning" icon="clock" specId="info-code-rate" title="Please wait before sending another code.">{msg || "We've sent several codes already. Wait a minute, then try again."}</Banner>
            : <p className="ss-body">We sent a 6-digit code to <b data-example="true">{email}</b>.</p>}
      {!locked && (
        <fieldset className="ss-code" aria-describedby={err ? 'code-msg' : undefined} onPaste={onPaste}>
          <legend className="ss-label">6-digit code</legend>
          <div className="ss-code-row" onKeyDown={onCodeKeyDown} onFocusCapture={onCodeFocus}>{d.map((v, i) => <Field key={i} id={`sp-code-${i + 1}`} label="" ariaLabel={`Digit ${i + 1} of 6`} value={v} onChange={setDigit(i)} inputMode="numeric" pattern="[0-9]*" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6} />)}</div>
          {err && <p id="code-msg" className="ss-err" role="alert" data-spec-id="info-code-error">{err}</p>}
        </fieldset>
      )}
      <p className="ss-fine" data-spec-id="info-code-expiry">This code works for 10 minutes. You can request a new one after 60 seconds. After 5 wrong tries, we'll ask you to send a new code. Or open the email and tap Sign in to Bish's — that link only works after you confirm on the next screen, so a mail scanner can't use it up.</p>
      <Tag kind="rule" q="Q3" id="code-expiry">code + link expiry, resend limit, attempt limit</Tag>
    </Dialog>
  );
}

function SaveLink({ onPhase }: { onPhase: (p: SavePhase) => void }) {
  const params = parseLinkParams(location.search, location.hash);
  const ready = hasConfirmableLink(params);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const confirm = async () => {
    if (!ready) { setErr('This sign-in link is missing details. Request a new code from Save Progress.'); return; }
    setBusy(true);
    setErr('');
    try {
      const result = await confirmEmailLink(params.tokenHash, params.type);
      if (result.signedInOnly) {
        goWelcome();
        return;
      }
      goWelcome();
    } catch (e) {
      setErr(asSaveAuthError(e).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog frame="frame-save-progress-link" overline="Save Progress" title="Sign in to Bish's" onClose={() => closeToResults(onPhase)} closeLabel="Close Save Progress"
      bar={<div className="ss-bar-btns">
        <Commit specId="btn-commit-confirm-email-link" perm="session.verify" target="frame-save-progress-success" disabled={busy} onClick={confirm}>{busy ? 'Signing in…' : "Sign in to Bish's"}</Commit>
        <Action specId="btn-action-link-not-now" quiet onClick={() => closeToResults(onPhase)}>Not now</Action>
      </div>}>
      <p className="ss-body">This confirms it's you. We won't sign you in until you tap the button — that way a mail scanner can't use up your link.</p>
      {err && <Banner specId="info-save-link-error" title="We couldn't sign you in.">{err}</Banner>}
      {!ready && <Banner tone="warning" specId="info-save-link-missing" title="This link is missing its sign-in details.">Request a new code from Save Progress, then use the newest email from Bish's RV.</Banner>}
    </Dialog>
  );
}

function SaveMerge({ onPhase }: { onPhase: (p: SavePhase) => void }) {
  const email = loadProfile()?.email || 'your email';
  return (
    <Dialog frame="frame-save-progress-merge" overline="Save Progress" title="We found your profile" onClose={() => closeToResults(onPhase)} closeLabel="Close Save Progress"
      bar={<div className="ss-bar-btns"><Commit specId="btn-commit-add-search" perm="profile.merge" target="frame-save-progress-success" onClick={() => go('save-success', onPhase)}>Add this search</Commit><Action specId="btn-action-not-me" quiet target="needs-rule:Q22" onClick={() => { void signOutShopper(); go('save', onPhase); }}>This isn't me</Action></div>}>
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
  const name = profile && (profile.firstName || profile.lastName) ? `${profile.firstName} ${profile.lastName}`.trim() : 'your account';
  return (
    <Dialog frame="frame-save-progress-success" overline="Save Progress" title="Your progress is saved" onClose={() => closeToResults(onPhase)} closeLabel="Close"
      bar={<div className="ss-bar-btns"><Commit specId="btn-commit-go-to-portal" perm="portal.view" target="screen:portal" onClick={() => { goWelcome(); }}>Go to my portal</Commit><Action specId="btn-action-keep-shopping" quiet target="screen:results" onClick={() => closeToResults(onPhase)}>Keep shopping</Action></div>}>
      <div className="ss-ok"><VIcon name="circle-check" size={28} /></div>
      <p className="ss-body">Your Smart Shopper answers, top three, and saved RVs are in your customer portal. You're signed in as <b data-example="true">{name}</b>.</p>
      <Tag kind="pdb" q="Q23" id="after-success">after success → portal</Tag>
    </Dialog>
  );
}

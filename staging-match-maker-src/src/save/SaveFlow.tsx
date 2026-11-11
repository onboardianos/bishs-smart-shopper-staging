// Save Progress overlay on the results page. Front end only: submitCustomerProfile() is the stub.
import { useEffect, useState, type FormEvent } from 'react';
import type { Answers } from '../answers';
import { loadAnswers } from '../answers';
import { confirmSignInCode, submitCustomerProfile } from './submitProfile';
import { SAVE_STORES } from './stores';

export const SAVE_PHASES = ['save', 'save-error', 'save-loading', 'save-code', 'save-success'] as const;
export type SavePhase = '' | (typeof SAVE_PHASES)[number];

export function savePhaseFromUrl(): SavePhase {
  const q = new URLSearchParams(location.search);
  const raw = q.get('save') || '';
  const state = q.get('state') || '';
  const hit = raw || ((SAVE_PHASES as readonly string[]).includes(state) ? state : '');
  return (SAVE_PHASES as readonly string[]).includes(hit) ? (hit as SavePhase) : '';
}

function setSaveParam(phase: SavePhase) {
  const s = new URLSearchParams(location.search);
  if (phase) s.set('save', phase); else s.delete('save');
  if ((SAVE_PHASES as readonly string[]).includes(s.get('state') || '')) s.delete('state');
  const str = s.toString();
  history.pushState(null, '', `${location.pathname}${str ? `?${str}` : ''}`);
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const digits = (v: string) => v.replace(/\D/g, '');

type Form = { first: string; last: string; email: string; phone: string; store: string; consent: boolean };
const emptyForm = (): Form => ({ first: '', last: '', email: '', phone: '', store: '', consent: false });

function Needs({ id, q, text }: { id: string; q: string; text: string }) {
  return <span className="sp-nr" data-needs-rule={q} data-spec-id={`info-needs-rule#${id}`}>Placeholder · needs-rule {q} · {text}</span>;
}

export function SaveButton({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="sp-save-slot" data-spec-id="sec-save-progress-slot" id="sp-save-slot">
      <button type="button" className="sp-save-btn" id="sp-save-progress" data-spec-id="btn-action-save-progress" data-bos-class="action" data-bos-target="frame-save-progress" aria-haspopup="dialog" onClick={onOpen}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" /></svg>
        <span id="sp-save-progress-t">Save Progress</span>
      </button>
    </div>
  );
}

export function SaveFlow({ phase, pins, saved, onPhase }: { phase: SavePhase; pins: string[]; saved: string[]; onPhase: (p: SavePhase) => void }) {
  const [form, setForm] = useState<Form>(emptyForm);
  const [errors, setErrors] = useState({ first: false, last: false, email: false, phone: false });
  const [banner, setBanner] = useState('Fix 3 things to continue.');
  const [code, setCode] = useState(['', '', '', '']);
  const [codeHint, setCodeHint] = useState('');
  const open = phase !== '';
  const pinN = pins.filter(Boolean).length;
  const ready = form.first.trim() && form.last.trim() && form.email.trim();

  useEffect(() => {
    if (phase === 'save') { setForm(emptyForm()); setErrors({ first: false, last: false, email: false, phone: false }); setCode(['', '', '', '']); setCodeHint(''); }
  }, [phase === 'save']);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  function go(next: SavePhase) {
    setSaveParam(next);
    onPhase(next);
  }
  function close() { go(''); }

  function validate(show: boolean) {
    const phone = digits(form.phone);
    const next = {
      first: !form.first.trim(),
      last: !form.last.trim(),
      email: !emailOk(form.email.trim()),
      phone: phone !== '' && phone.length !== 10,
    };
    if (show) setErrors(next);
    const n = [next.first, next.last, next.email, next.phone].filter(Boolean).length;
    setBanner(n === 1 ? 'Fix 1 thing to continue.' : `Fix ${n} things to continue.`);
    return n === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate(true)) { go('save-error'); return; }
    go('save-loading');
    const answers: Answers = loadAnswers();
    await submitCustomerProfile({
      firstName: form.first.trim(), lastName: form.last.trim(), email: form.email.trim(),
      phone: form.phone.trim(), store: form.store, consent: form.consent,
      answers, pins, saved,
    });
    if (new URLSearchParams(location.search).get('freeze') === '1') return;
    go('save-code');
  }

  function onVerify(e: FormEvent) {
    e.preventDefault();
    const joined = code.join('');
    if (!confirmSignInCode(joined)) {
      setCodeHint('Enter the code from your email.');
      document.getElementById('sp-code-1')?.focus();
      return;
    }
    go('save-success');
  }

  function onCode(i: number, raw: string) {
    const ch = digits(raw).slice(-1);
    const next = code.slice();
    next[i] = ch;
    setCode(next);
    if (ch && i < 3) document.getElementById(`sp-code-${i + 2}`)?.focus();
  }

  if (!open) return null;
  const destPhone = form.phone.trim();
  return (
    <div className="sp-modal-root" id="sp-overlay-back" data-spec-id="sec-overlay-save-progress" data-bos-level="section" data-bos-type="overlay" data-layer="overlay">
      <button type="button" className="sp-scrim" id="sp-overlay-scrim" data-spec-id="btn-action-dismiss-save-progress" data-bos-class="action" aria-label="Close Save Progress" tabIndex={-1} onClick={close} />
      <div className={`sp-card sp-phase-${phase}`} id="sp-overlay" role="dialog" aria-modal="true" aria-labelledby={phase === 'save-loading' ? 'sp-loading-title' : phase === 'save-code' ? 'sp-code-title' : phase === 'save-success' ? 'sp-success-title' : 'sp-overlay-title'}>
        <button type="button" className="sp-x" id="sp-overlay-close" data-spec-id="btn-action-close-save-progress" data-bos-class="action" aria-label="Close" onClick={close}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div className="sp-form" id="sp-form-pane" data-spec-id="frame-save-progress" data-bos-level="frame">
          <form id="sp-save-form" data-spec-id="form-save-progress" noValidate onSubmit={onSubmit} onInput={() => { if (phase === 'save-error') validate(true); }}>
            <div className="sp-scroll" id="sp-form-scroll">
              <p className="sp-kicker" id="sp-overlay-kicker" data-spec-id="label-save-kicker">Save Progress</p>
              <h2 className="sp-title" id="sp-overlay-title" data-spec-id="label-save-title">Create your customer profile</h2>
              <p className="sp-text" id="sp-overlay-text" data-spec-id="info-save-body">
                We'll keep your Smart Shopper answers, your top three, and any RVs you saved. We'll email you a sign-in code — no password to make up. <Needs id="auth" q="Q3" text="sign-in method" />
              </p>
              <div className={`sp-banner${phase === 'save-error' ? ' is-on' : ''}`} id="sp-overlay-banner" data-spec-id="info-save-error-banner" role="alert">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                <span id="sp-overlay-banner-t">{banner}</span>
              </div>
              <ul className="sp-list" id="sp-save-list" data-spec-id="list-what-we-save">
                <li className="sp-row" id="sp-save-row-answers"><span className="sp-row-l"><span className="sp-check" aria-hidden="true"><Check /></span> Smart Shopper answers</span><span className="sp-row-r">Kept</span></li>
                <li className="sp-row" id="sp-save-row-top3"><span className="sp-row-l"><span className="sp-check" aria-hidden="true"><Check /></span> Your top three</span><span className="sp-row-r">{pinN} {pinN === 1 ? 'match' : 'matches'}</span></li>
                <li className="sp-row" id="sp-save-row-saved"><span className="sp-row-l"><span className="sp-check" aria-hidden="true"><Check /></span> Saved RVs</span><span className="sp-row-r">{saved.length} {saved.length === 1 ? 'unit' : 'units'}</span></li>
              </ul>
              <div className="sp-fields" id="sp-fields">
                <Needs id="fields" q="Q4" text="which fields are required" />
                <div className="sp-name" id="sp-name-row">
                  <Field id="first" label="First name" error="Enter your first name." bad={errors.first} value={form.first} auto="given-name" onChange={(first) => setForm({ ...form, first })} />
                  <Field id="last" label="Last name" error="Enter your last name." bad={errors.last} value={form.last} auto="family-name" onChange={(last) => setForm({ ...form, last })} />
                </div>
                <Field id="email" label="Email" error="That email looks incomplete. Try name@example.com." hint="We'll send your sign-in details here." bad={errors.email} value={form.email} placeholder="you@email.com" auto="email" inputMode="email" onChange={(email) => setForm({ ...form, email })} />
                <Field id="phone" label="Mobile phone" error="Enter a 10-digit mobile number." hint="Optional." bad={errors.phone} value={form.phone} placeholder="(208) 555-0123" auto="tel" inputMode="tel" onChange={(phone) => setForm({ ...form, phone })} />
                <div className="sp-field" id="sp-field-store-wrap">
                  <label className="sp-label" id="sp-field-store-l" htmlFor="sp-field-store">Preferred store <span id="sp-field-store-opt">(optional)</span></label>
                  <select className="sp-ctrl" id="sp-field-store" data-spec-id="input-save-store" data-bos-class="input" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>
                    <option value="">Choose a store</option>
                    {SAVE_STORES.map((s) => <option key={s.code} id={`sp-store-opt-${s.code.toLowerCase()}`} value={s.code}>{s.label}</option>)}
                  </select>
                  <Needs id="store" q="Q8" text="store list = staging stores.json minus Corp" />
                </div>
                <div className="sp-consent" id="sp-consent-wrap">
                  <label id="sp-consent-l">
                    <input id="sp-consent" data-spec-id="input-save-consent" data-bos-class="input" type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                    <span id="sp-consent-t">It's okay for Bish's RV to contact me by email or text about my saved RVs and this search. Message and data rates may apply. <Needs id="consent" q="Q5" text="consent wording + whether it is required" /></span>
                  </label>
                </div>
              </div>
              <p className="sp-legal" id="sp-legal"><span id="sp-legal-t">Terms and privacy line goes here.</span> <Needs id="legal" q="Q6" text="legal copy and links" /></p>
            </div>
            <div className="sp-actions" id="sp-form-actions">
              <p className="sp-hint sp-reason" id="sp-submit-reason" data-spec-id="info-save-disabled-reason" role="status">Add your first name, last name and email to save.</p>
              <button type="submit" className="sp-commit" id="sp-submit" data-spec-id="btn-commit-save-progress" data-bos-class="commit" disabled={!ready}>Save my progress</button>
              <button type="button" className="sp-ghost" id="sp-not-now" data-spec-id="btn-action-not-now" data-bos-class="action" onClick={close}>Not now</button>
            </div>
          </form>
        </div>

        <div className="sp-loading" id="sp-loading-pane" data-spec-id="frame-save-progress-loading" data-bos-level="frame" role="status" aria-live="polite">
          <div className="sp-spin" id="sp-loading-spinner" data-spec-id="info-save-loader" aria-hidden="true" />
          <h2 className="sp-title" id="sp-loading-title" data-spec-id="label-save-loading-title">Saving your progress</h2>
          <p id="sp-loading-text" data-spec-id="info-save-loading-body">Hang tight — we're creating your customer profile and sending a sign-in code.</p>
        </div>

        <div className="sp-code" id="sp-code-pane" data-spec-id="frame-save-progress-code" data-bos-level="frame">
          <p className="sp-kicker" id="sp-code-kicker" data-spec-id="label-code-kicker">Save Progress</p>
          <h2 className="sp-title" id="sp-code-title" data-spec-id="label-code-title">Enter your sign-in code</h2>
          <p className="sp-text" id="sp-code-text" data-spec-id="info-code-body">We sent a 4-digit code to <span id="sp-code-dest">{form.email.trim() || 'your email'}</span>{destPhone ? <> and <span id="sp-code-dest-phone">{destPhone}</span></> : null}.</p>
          <form id="sp-code-form" data-spec-id="form-save-code" onSubmit={onVerify}>
            <div className="sp-codes" id="sp-code-boxes" data-spec-id="input-save-code-group">
              {code.map((ch, i) => (
                <input key={i} id={`sp-code-${i + 1}`} data-spec-id={`input-save-code-${i + 1}`} data-bos-class="input" aria-label={`Digit ${i + 1}`} inputMode="numeric" maxLength={1} value={ch}
                  onChange={(e) => onCode(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !ch && i > 0) document.getElementById(`sp-code-${i}`)?.focus(); }}
                  onPaste={(e) => {
                    const text = digits(e.clipboardData.getData('text')).slice(0, 4);
                    if (!text) return;
                    e.preventDefault();
                    const next = ['', '', '', ''];
                    text.split('').forEach((c, j) => { next[j] = c; });
                    setCode(next);
                    document.getElementById(`sp-code-${Math.min(text.length, 4)}`)?.focus();
                  }} />
              ))}
            </div>
            <p className="sp-hint sp-center" id="sp-code-hint" data-spec-id="info-code-hint">{codeHint || <>Code length and expiry go here. <Needs id="code" q="Q3" text="auth method, code length, expiry" /></>}</p>
            <div className="sp-actions" id="sp-code-actions">
              <button type="submit" className="sp-commit" id="sp-verify" data-spec-id="btn-commit-verify-code" data-bos-class="commit">Verify and save</button>
              <button type="button" className="sp-ghost" id="sp-resend" data-spec-id="btn-action-resend-code" data-bos-class="action" onClick={() => { setCode(['', '', '', '']); setCodeHint(''); document.getElementById('sp-code-1')?.focus(); }}>Resend code</button>
            </div>
          </form>
        </div>

        <div className="sp-success" id="sp-success-pane" data-spec-id="frame-save-progress-success" data-bos-level="frame">
          <div className="sp-ok" id="sp-success-icon" data-spec-id="info-save-success-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg></div>
          <h2 className="sp-title" id="sp-success-title" data-spec-id="label-save-success-title">Your progress is saved</h2>
          <p className="sp-text" id="sp-success-text" data-spec-id="info-save-success-body">Your Smart Shopper answers, top three, and saved RVs are in your customer portal. You're signed in as <span id="sp-success-name">{`${form.first.trim()} ${form.last.trim()}`.trim() || 'your profile'}</span>.</p>
          <div className="sp-actions" id="sp-success-actions">
            <button type="button" className="sp-commit" id="sp-go-portal" data-spec-id="btn-commit-go-to-portal" data-bos-class="commit" onClick={() => { location.href = `${location.pathname}?screen=portal`; }}>Go to my portal</button>
            <button type="button" className="sp-ghost" id="sp-keep-shopping" data-spec-id="btn-action-keep-shopping" data-bos-class="action" onClick={close}>Keep shopping</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Check() {
  return <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>;
}

function Field({ id, label, value, error, hint, bad, placeholder, auto, inputMode, onChange }: {
  id: string; label: string; value: string; error: string; hint?: string; bad: boolean; placeholder?: string; auto: string; inputMode?: 'email' | 'tel'; onChange: (v: string) => void;
}) {
  return (
    <div className={`sp-field${bad ? ' is-error' : ''}`} id={`sp-field-${id}-wrap`}>
      <label className="sp-label" id={`sp-field-${id}-l`} htmlFor={`sp-field-${id}`}>{label}</label>
      <input className="sp-ctrl" id={`sp-field-${id}`} data-spec-id={`input-save-${id === 'first' ? 'first-name' : id === 'last' ? 'last-name' : id}`} data-bos-class="input" autoComplete={auto} inputMode={inputMode} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="sp-hint" id={`sp-field-${id}-hint`}>{hint}</p>}
      <p className="sp-err" id={`sp-field-${id}-err`}>{error}</p>
    </div>
  );
}

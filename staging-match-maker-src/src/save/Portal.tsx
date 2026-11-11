// Logged-in customer portal. Reads the local profile. No network.
import { useState } from 'react';
import { SiteHeader } from '../steps/SiteHeader';
import { findLiveUnit } from '../liveRank';
import { lengthFt, money, unitImg, unitTitle } from '../results/inventory';
import { storeName } from '../steps/inventory';
import { answerText, budgetText, towText } from '../steps/answersText';
import { loadProfile } from './profile';
import { SAVE_STORES, saveStoreLabel } from './stores';
import './save.css';

const VIEWS = ['portal', 'portal-alerts', 'portal-nav', 'portal-trade', 'portal-notes', 'portal-outfitter', 'book-visit', 'book-visit-confirm', 'book-visit-success'] as const;
type View = (typeof VIEWS)[number];

function viewFromUrl(): View {
  const raw = new URLSearchParams(location.search).get('state') || 'portal';
  return (VIEWS as readonly string[]).includes(raw) ? (raw as View) : 'portal';
}
const go = (state: string) => { location.href = `${location.pathname}?state=${state}`; };

function StoreNote() {
  return <span className="sp-nr" data-needs-rule="outfitter-store" data-spec-id="info-needs-rule#outfitter-store">Placeholder · outfitter's store (example is Meridian; Figma showed Twin Falls)</span>;
}

export function Portal() {
  const view = viewFromUrl();
  const profile = loadProfile();
  const answers = profile?.answers;
  const pins = (profile?.pins || []).filter(Boolean);
  const saved = (profile?.saved || []).filter((s) => !pins.includes(s));
  const top = pins.map((stock) => findLiveUnit(stock)).filter((u): u is NonNullable<typeof u> => !!u);
  const savedUnits = saved.map((stock) => findLiveUnit(stock)).filter((u): u is NonNullable<typeof u> => !!u);
  const first = profile?.firstName || 'Alex';
  const last = profile?.lastName || 'Morgan';
  const email = profile?.email || 'alex.morgan@example.com';
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  const looking = answers ? (answerText('03', answers) !== '—' ? answerText('03', answers) : answerText('02', answers)) : '—';
  const sleeps = answers && (answers.picked?.includes('adults') || answers.picked?.includes('children')) ? String((answers.picked.includes('adults') ? answers.adults : 0) + (answers.picked.includes('children') ? answers.children : 0)) : '—';
  const stores = answers?.stores?.length ? answers.stores.map((c) => storeName(c)).join(', ') : 'All locations';
  const lead = top[0];
  const home = view === 'portal' || view === 'portal-alerts' || view === 'portal-nav' || view.startsWith('book-');
  const [slot, setSlot] = useState('');
  const [bookStore, setBookStore] = useState(profile?.store || '');
  const [bookDate, setBookDate] = useState('');
  const storeLabel = saveStoreLabel(bookStore) || 'Meridian';
  const when = bookDate ? new Date(`${bookDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Tuesday, November 17, 2026';
  const slotLabel = slot === '1000' ? '10:00 AM' : slot === '1100' ? '11:00 AM' : slot === '1300' ? '1:00 PM' : slot === '1500' ? '3:00 PM' : '11:00 AM';

  return (
    <div className={`sp-logged${view === 'portal-nav' ? ' is-nav-open' : ''}${view === 'portal-alerts' ? ' is-alerts-open' : ''}`} data-view={view} id="sp-portal" data-spec-id="frame-customer-portal" data-bos-level="frame" data-bos-role="customer" data-bos-screen="customer-portal">
      <SiteHeader prefix="sp" ssHref="?state=results" end={
        <div className="sh-end" id="sp-end" data-spec-id="nav-site-end">
          <button type="button" className="sp-menu" id="sp-nav-toggle" data-spec-id="btn-action-open-portal-nav" data-bos-class="action" aria-label="Open menu" aria-expanded={view === 'portal-nav'} aria-controls="sp-sidenav" onClick={() => go(view === 'portal-nav' ? 'portal' : 'portal-nav')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="sp-account" id="sp-account" data-spec-id="nav-account-cluster">
            <button type="button" className="sp-bell" id="sp-alerts-btn" data-spec-id="btn-action-open-alerts" data-bos-class="action" aria-label="Alerts, 3 new" aria-expanded={view === 'portal-alerts'} aria-controls="sp-alerts-panel" onClick={() => go(view === 'portal-alerts' ? 'portal' : 'portal-alerts')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
              <span className="sp-badge" id="sp-alerts-badge" data-spec-id="info-alerts-count">3</span>
            </button>
            <button type="button" className="sp-avatar" id="sp-avatar" data-spec-id="btn-action-profile" data-bos-class="action" aria-label={`${first} ${last}, customer portal`} onClick={() => go('portal')}>{initials}</button>
          </div>
        </div>
      } />

      <button type="button" className="sp-nav-scrim" id="sp-sidenav-scrim" data-spec-id="btn-action-dismiss-nav" data-bos-class="action" aria-label="Close menu" onClick={() => go('portal')} />
      <aside className="sp-sidenav" id="sp-sidenav" data-spec-id="nav-portal-sidenav" data-bos-type="nav">
        <div className="sp-who" id="sp-sidenav-who">
          <p className="sp-who-name" id="sp-sidenav-name">{first} {last}</p>
          <p className="sp-who-email" id="sp-sidenav-email">{email}</p>
        </div>
        <nav className="sp-navlist" id="sp-sidenav-list" aria-label="Customer portal">
          <a className={home ? 'is-on' : ''} id="sp-nav-overview" data-spec-id="btn-action-nav-overview" data-bos-class="action" href="?state=portal" aria-current={home ? 'page' : undefined}>Overview</a>
          <a className={view === 'portal-trade' ? 'is-on' : ''} id="sp-nav-trade" data-spec-id="btn-action-nav-trade" data-bos-class="action" href="?state=portal-trade" aria-current={view === 'portal-trade' ? 'page' : undefined}>My trade</a>
          <a className={view === 'portal-notes' ? 'is-on' : ''} id="sp-nav-notes" data-spec-id="btn-action-nav-notes" data-bos-class="action" href="?state=portal-notes">Notes <span className="sp-nav-n" id="sp-nav-notes-n">3</span></a>
          <a className={view === 'portal-outfitter' ? 'is-on' : ''} id="sp-nav-outfitter" data-spec-id="btn-action-nav-outfitter" data-bos-class="action" href="?state=portal-outfitter">Outfitter</a>
          <a id="sp-nav-saved" data-spec-id="btn-action-nav-saved" data-bos-class="action" href="?state=portal#sp-saved-sec">Saved units <span className="sp-nav-n" id="sp-nav-saved-n">{savedUnits.length || 2}</span></a>
        </nav>
        <div className="sp-nav-foot" id="sp-sidenav-foot">
          <div className="sp-mini" id="sp-sidenav-outfitter" data-spec-id="card-sidenav-outfitter" data-example="true">
            <p className="sp-next-k">Your outfitter</p>
            <p className="sp-who-name" id="sp-sidenav-outfitter-name">Jess Rivera</p>
            <p id="sp-sidenav-outfitter-store">Bish's RV Meridian</p>
            <StoreNote />
          </div>
          <button type="button" className="sp-ghost" id="sp-sign-out" data-spec-id="btn-action-sign-out" data-bos-class="action" onClick={() => go('results')}>Sign out</button>
        </div>
      </aside>

      <button type="button" className="sp-alert-scrim" id="sp-alerts-scrim" data-spec-id="btn-action-dismiss-alerts" data-bos-class="action" aria-label="Close alerts" onClick={() => go('portal')} />
      <div className="sp-alerts" id="sp-alerts-panel" data-spec-id="sec-alerts-panel" role="dialog" aria-labelledby="sp-alerts-title">
        <p className="sp-alerts-h" id="sp-alerts-title">Alerts</p>
        <a className="sp-alert" id="sp-alert-unit" data-spec-id="btn-action-alert-new-unit" data-bos-class="action" data-example="true" href="?state=portal"><span className="sp-alert-ico">RV</span><span><strong>New unit that fits your search</strong><span className="sp-alert-s">A 2026 Reflection 22RK arrived at Twin Falls in your budget.</span><span className="sp-alert-when">Today · 9:14 AM</span></span></a>
        <a className="sp-alert" id="sp-alert-worksheet" data-spec-id="btn-action-alert-worksheet" data-bos-class="action" data-example="true" href="?state=portal"><span className="sp-alert-ico">WS</span><span><strong>Your payment worksheet is ready</strong><span className="sp-alert-s">Jess sent a worksheet for your #1.</span><span className="sp-alert-when">Yesterday · 4:02 PM</span></span></a>
        <a className="sp-alert" id="sp-alert-message" data-spec-id="btn-action-alert-message" data-bos-class="action" data-example="true" href="?state=portal-notes"><span className="sp-alert-ico">@</span><span><strong>New message from Jess Rivera</strong><span className="sp-alert-s">The top match is on the lot if you want a walk-through.</span><span className="sp-alert-when">Yesterday · 3:48 PM</span></span></a>
      </div>

      <main className="sp-portal" id="sp-portal-main" data-spec-id="sec-portal-main">
        {home && (
          <section id="sp-portal-home" data-spec-id="sec-portal-overview">
            <div className="sp-portal-top" id="sp-portal-top">
              <div id="sp-portal-head" data-spec-id="sec-portal-heading">
                <p className="sp-kicker" id="sp-portal-kicker" data-spec-id="label-portal-kicker">Customer portal</p>
                <h1 className="sp-hello" id="sp-portal-hello" data-spec-id="label-portal-title">Welcome, {first}.</h1>
                <p className="sp-text" id="sp-portal-sub" data-spec-id="info-portal-subtitle">Your Smart Shopper answers, top three, saved RVs, trade, and notes are here. You can pick up right where you left off.</p>
              </div>
              <aside className="sp-next" id="sp-next" data-spec-id="card-portal-next-step" data-bos-type="card">
                <p className="sp-next-k" id="sp-next-k">Next step</p>
                <h2 id="sp-next-t">{lead ? `Walk through your #1 at ${storeName(lead.location)}` : 'Walk through your #1'}</h2>
                <p id="sp-next-s">{lead ? `See the ${unitTitle(lead)} in person. No pressure — just a look at the floorplan that rose to the top of your search.` : 'Pin a top match, then book a walk-through. No pressure.'}</p>
                <div className="sp-next-actions">
                  <button type="button" className="sp-commit" id="sp-book-visit" data-spec-id="btn-commit-book-visit" data-bos-class="commit" onClick={() => go('book-visit')}>Book a visit</button>
                  <a className="sp-ghost" id="sp-view-top" data-spec-id="btn-action-view-top-match" data-bos-class="action" href={lead ? `?screen=results&unit=${lead.stock}` : '?state=results'}>View your top match</a>
                </div>
              </aside>
            </div>
            <div className="sp-snaps" id="sp-snap-grid" data-spec-id="sec-portal-snapshots" data-example="true">
              <article className="sp-next" id="sp-snap-trade" data-spec-id="card-portal-trade-snap"><p className="sp-next-k">Your trade</p><h2>$10,200 – $12,600</h2><p>Estimate, not a quote · 2019 Flagstaff Super Lite</p><button type="button" className="sp-save-btn" id="sp-snap-trade-open" data-spec-id="btn-action-open-trade" data-bos-class="action" onClick={() => go('portal-trade')}>View trade</button></article>
              <article className="sp-next" id="sp-snap-notes" data-spec-id="card-portal-notes-snap"><p className="sp-next-k">Notes</p><h2>3 notes</h2><p>Latest: “Loved the kitchen island. Bunk room is big enough for both kids.”</p><button type="button" className="sp-save-btn" id="sp-snap-notes-open" data-spec-id="btn-action-open-notes" data-bos-class="action" onClick={() => go('portal-notes')}>Open notes</button></article>
              <article className="sp-next" id="sp-snap-outfitter" data-spec-id="card-portal-outfitter-snap"><p className="sp-next-k">Your outfitter</p><h2>Jess Rivera</h2><p>Bish's RV Meridian · Ready to walk you through your #1.</p><StoreNote /><button type="button" className="sp-save-btn" id="sp-snap-outfitter-open" data-spec-id="btn-action-open-outfitter" data-bos-class="action" onClick={() => go('portal-outfitter')}>View outfitter</button></article>
            </div>
            <section className="sp-sec" id="sp-answers-sec" data-spec-id="sec-portal-answers">
              <div className="sp-sec-h"><h2>Your Smart Shopper answers</h2><a className="sp-save-btn" id="sp-edit-answers" data-spec-id="btn-action-edit-answers" data-bos-class="action" href="?screen=summary">Edit answers</a></div>
              <div className="sp-answers" id="sp-answers-card" data-spec-id="card-saved-answers">
                <Ans id="type" label="Looking for" value={looking} />
                <Ans id="sleeps" label="Sleeps" value={sleeps} />
                <Ans id="budget" label="Budget" value={answers ? budgetText(answers) : 'No budget set'} />
                <Ans id="tow" label="Tow rating" value={answers ? (towText(answers) || '—') : '—'} />
                <Ans id="stores" label="Stores" value={stores} />
                <Ans id="email" label="Profile" value={`${first} ${last}${profile?.store ? ` · ${saveStoreLabel(profile.store)}` : ''}`} />
              </div>
            </section>
            <section className="sp-sec" id="sp-top3-sec" data-spec-id="sec-portal-top3">
              <div className="sp-sec-h"><h2>Your top three</h2><a className="sp-ghost" id="sp-top3-browse" data-spec-id="btn-action-browse-matches" data-bos-class="action" href="?state=results&tab=top3">Adjust your top three</a></div>
              {top.length === 0 ? <p className="sp-empty">No top three saved yet.</p> : <div className="sp-cards" id="sp-top3-grid">{top.map((u, i) => <Tile key={u.stock} u={u} n={i + 1} kind="top3" />)}</div>}
            </section>
            <section className="sp-sec" id="sp-saved-sec" data-spec-id="sec-portal-saved">
              <div className="sp-sec-h"><h2>Saved units</h2><span id="sp-saved-count">{savedUnits.length} saved</span></div>
              {savedUnits.length === 0 ? <p className="sp-empty">No saved RVs yet.</p> : <div className="sp-cards" id="sp-saved-grid">{savedUnits.map((u) => <Tile key={u.stock} u={u} kind="saved" />)}</div>}
            </section>
          </section>
        )}

        {view === 'portal-trade' && (
          <section id="sp-portal-trade" data-spec-id="sec-portal-trade" data-example="true">
            <p className="sp-kicker" id="sp-trade-kicker">My trade</p>
            <h1 className="sp-hello" id="sp-trade-title">Your trade estimate</h1>
            <p className="sp-text" id="sp-trade-sub">This is an estimate, not a quote. Jess can walk you through an appraisal in person.</p>
            <div className="sp-snaps">
              <article className="sp-next" id="sp-trade-value" data-spec-id="card-trade-value"><p className="sp-next-k">Estimated range</p><h2 id="sp-trade-value-v">$10,200 – $12,600</h2><p>2019 Flagstaff Super Lite · 26FKBS</p><p>Estimate, not a quote · Inspection scheduled</p><button type="button" className="sp-save-btn" id="sp-trade-appraisal" data-spec-id="btn-action-view-appraisal" data-bos-class="action">View appraisal</button></article>
              <article className="sp-next" id="sp-trade-inspect" data-spec-id="card-trade-inspection"><p className="sp-next-k">Next up · Trade inspection</p><h2 id="sp-trade-inspect-t">Tuesday, November 17 · 11:00 AM</h2><p id="sp-trade-inspect-s">Bish's RV Meridian. Jess Rivera will meet you there.</p><StoreNote /><button type="button" className="sp-commit" id="sp-trade-expect" data-spec-id="btn-commit-what-to-expect" data-bos-class="commit">What to expect</button></article>
            </div>
          </section>
        )}

        {view === 'portal-notes' && (
          <section id="sp-portal-notes" data-spec-id="sec-portal-notes" data-example="true">
            <p className="sp-kicker">Notes</p>
            <h1 className="sp-hello" id="sp-notes-title">Your notes</h1>
            <p className="sp-text">Everything you wrote on your saved RVs, plus questions for Jess.</p>
            <div className="sp-snaps">
              <div id="sp-notes-list" data-spec-id="list-notes">
                <article className="sp-next" id="sp-note-1" data-spec-id="card-note-1"><h3>2026 Avenue 26RD</h3><p>Loved the kitchen island. Bunk room is big enough for both kids.</p></article>
                <article className="sp-next" id="sp-note-2" data-spec-id="card-note-2"><h3>Saved unit</h3><p>Storage looks tight. Ask about the pass-through.</p></article>
                <article className="sp-next" id="sp-note-3" data-spec-id="card-note-3"><h3>Another saved unit</h3><p>Rear bath feels roomy. Price a bit high.</p></article>
              </div>
              <aside className="sp-next" id="sp-notes-questions" data-spec-id="card-notes-questions">
                <p className="sp-next-k">Open questions for Jess · 2</p>
                <label className="sp-q"><input id="sp-q-1" data-spec-id="input-note-q-1" data-bos-class="input" type="checkbox" /> Does the top match come with the outdoor kitchen option?</label>
                <label className="sp-q"><input id="sp-q-2" data-spec-id="input-note-q-2" data-bos-class="input" type="checkbox" /> Is there a pass-through on the second choice?</label>
                <button type="button" className="sp-commit" id="sp-notes-send" data-spec-id="btn-commit-send-questions" data-bos-class="commit">Send all to Jess</button>
              </aside>
            </div>
          </section>
        )}

        {view === 'portal-outfitter' && (
          <section id="sp-portal-outfitter" data-spec-id="sec-portal-outfitter" data-example="true">
            <p className="sp-kicker">Outfitter</p>
            <h1 className="sp-hello" id="sp-outfitter-title">Your outfitter</h1>
            <p className="sp-text" id="sp-outfitter-sub">Jess Rivera is your person at Bish's RV Meridian.</p>
            <StoreNote />
            <article className="sp-next" id="sp-outfitter-card" data-spec-id="card-outfitter-profile">
              <h2 id="sp-outfitter-name">Jess Rivera</h2>
              <p>Jess can walk you through your top three, answer the questions on your notes, and meet you for a trade inspection or a visit on the lot.</p>
              <div className="sp-next-actions">
                <button type="button" className="sp-commit" id="sp-outfitter-text" data-spec-id="btn-commit-text-jess" data-bos-class="commit">Text Jess</button>
                <button type="button" className="sp-save-btn" id="sp-outfitter-call" data-spec-id="btn-action-call-jess" data-bos-class="action">Call</button>
                <button type="button" className="sp-save-btn" id="sp-outfitter-book" data-spec-id="btn-action-book-with-jess" data-bos-class="action" onClick={() => go('book-visit')}>Book a visit</button>
              </div>
            </article>
          </section>
        )}
      </main>

      {(view === 'book-visit' || view === 'book-visit-confirm' || view === 'book-visit-success') && (
        <div className="sp-modal-root" id="sp-book-back" data-spec-id="sec-overlay-book-visit" data-bos-type="overlay" data-layer="overlay">
          <button type="button" className="sp-scrim" id="sp-book-scrim" data-spec-id="btn-action-dismiss-book-visit" data-bos-class="action" aria-label="Close" onClick={() => go('portal')} />
          <div className="sp-card" id="sp-book" role="dialog" aria-modal="true" aria-labelledby="sp-book-title">
            <button type="button" className="sp-x" id="sp-book-close" data-spec-id="btn-action-close-book-visit" data-bos-class="action" aria-label="Close" onClick={() => go('portal')}>×</button>
            {view === 'book-visit' && (
              <form id="sp-book-form" data-spec-id="form-book-visit" onSubmit={(e) => { e.preventDefault(); if (!bookDate || !slot) return; go('book-visit-confirm'); }}>
                <p className="sp-kicker">Book a visit</p>
                <h2 className="sp-title" id="sp-book-title" data-spec-id="label-book-title">Walk through your #1</h2>
                <p className="sp-text" id="sp-book-text">Pick a store, a day, and a time. {lead ? `You'll see the ${unitTitle(lead)}.` : 'No pressure.'}</p>
                <div className="sp-fields">
                  <div className="sp-field" id="sp-book-store-wrap">
                    <label className="sp-label" htmlFor="sp-book-store">Store</label>
                    <select className="sp-ctrl" id="sp-book-store" data-spec-id="input-book-store" data-bos-class="input" value={bookStore} onChange={(e) => setBookStore(e.target.value)}>
                      <option value="">Choose a store</option>
                      {SAVE_STORES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                    </select>
                    <span className="sp-nr" data-needs-rule="store-list" data-spec-id="info-needs-rule#book-store">Placeholder · store list is still open — showing every staging store except Corp</span>
                  </div>
                  <div className="sp-field" id="sp-book-date-wrap">
                    <label className="sp-label" htmlFor="sp-book-date">Date</label>
                    <input className="sp-ctrl" id="sp-book-date" data-spec-id="input-book-date" data-bos-class="input" type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} />
                  </div>
                  <div className="sp-field" id="sp-book-slots-wrap">
                    <p className="sp-label" id="sp-book-slots-l">Time slot</p>
                    <div className="sp-slots" id="sp-book-slots" data-spec-id="input-book-slots" role="group" aria-labelledby="sp-book-slots-l">
                      {[['1000', '10:00 AM'], ['1100', '11:00 AM'], ['1300', '1:00 PM'], ['1500', '3:00 PM']].map(([id, label]) => (
                        <button type="button" key={id} className={`sp-slot${slot === id ? ' is-on' : ''}`} id={`sp-book-slot-${id}`} data-spec-id={`input-book-slot-${id}`} data-bos-class="input" aria-pressed={slot === id} onClick={() => setSlot(id)}>{label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="sp-actions">
                  <button type="submit" className="sp-commit" id="sp-book-next" data-spec-id="btn-commit-review-visit" data-bos-class="commit" disabled={!bookDate || !slot}>Review visit</button>
                  <button type="button" className="sp-ghost" id="sp-book-cancel" data-spec-id="btn-action-cancel-book" data-bos-class="action" onClick={() => go('portal')}>Not now</button>
                </div>
              </form>
            )}
            {view === 'book-visit-confirm' && (
              <div id="sp-book-confirm-pane" data-spec-id="sec-book-confirm">
                <p className="sp-kicker">Book a visit</p>
                <h2 className="sp-title" id="sp-book-confirm-title" data-spec-id="label-book-confirm-title">Confirm your visit</h2>
                <p className="sp-text">We'll tell Jess you're coming. You can change this later.</p>
                <dl className="sp-dl" id="sp-book-confirm-dl">
                  <div><dt>Unit</dt><dd id="sp-book-confirm-unit">{lead ? unitTitle(lead) : 'Your #1'}</dd></div>
                  <div><dt>Store</dt><dd id="sp-book-confirm-store">Bish's RV {storeLabel}</dd></div>
                  <div><dt>When</dt><dd id="sp-book-confirm-when">{when} · {slotLabel}</dd></div>
                  <div><dt>With</dt><dd id="sp-book-confirm-who">Jess Rivera</dd></div>
                </dl>
                <StoreNote />
                <div className="sp-actions">
                  <button type="button" className="sp-commit" id="sp-book-confirm" data-spec-id="btn-commit-confirm-visit" data-bos-class="commit" onClick={() => go('book-visit-success')}>Confirm visit</button>
                  <button type="button" className="sp-ghost" id="sp-book-back-edit" data-spec-id="btn-action-edit-visit" data-bos-class="action" onClick={() => go('book-visit')}>Change date or time</button>
                </div>
              </div>
            )}
            {view === 'book-visit-success' && (
              <div id="sp-book-success-pane" data-spec-id="sec-book-success">
                <div className="sp-ok" aria-hidden="true">✓</div>
                <h2 className="sp-title" id="sp-book-success-title" data-spec-id="label-book-success-title">You're booked</h2>
                <p className="sp-text" id="sp-book-success-text">Jess will meet you{lead ? ` at the ${unitTitle(lead)}` : ''} at <span id="sp-book-success-store">Bish's RV {storeLabel}</span> on <span id="sp-book-success-when">{when} · {slotLabel}</span>.</p>
                <div className="sp-actions">
                  <button type="button" className="sp-commit" id="sp-book-done" data-spec-id="btn-commit-back-to-portal" data-bos-class="commit" onClick={() => go('portal')}>Back to my portal</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Ans({ id, label, value }: { id: string; label: string; value: string }) {
  return <div className="sp-ans" id={`sp-ans-${id}`}><p className="sp-ans-l" id={`sp-ans-${id}-l`}>{label}</p><p className="sp-ans-v" id={`sp-ans-${id}-v`}>{value}</p></div>;
}
function Tile({ u, n, kind }: { u: NonNullable<ReturnType<typeof findLiveUnit>>; n?: number; kind: 'top3' | 'saved' }) {
  return (
    <article className="sp-tile" id={`sp-portal-${kind}-${u.stock}`} data-spec-id={`card-inventory#${u.stock}-${kind}`} data-bos-type="card">
      <div style={{ position: 'relative' }}>
        <img src={unitImg(u)} alt="" />
        {n ? <span className="sp-pin" style={{ position: 'absolute', top: 10, left: 10 }}>#{n}</span> : null}
      </div>
      <div className="sp-tile-b">
        <h3>{unitTitle(u)}</h3>
        <p>{money(u.price)}</p>
        <p>{u.sleeps != null ? `Sleeps ${u.sleeps}` : 'Sleeps —'} · {lengthFt(u) != null ? `${lengthFt(u)} ft` : 'length —'} · {storeName(u.location)}</p>
        <a data-spec-id={`btn-action-view-details#${u.stock}-${kind}`} data-bos-class="action" href={`?screen=results&unit=${u.stock}`}>View details</a>
      </div>
    </article>
  );
}

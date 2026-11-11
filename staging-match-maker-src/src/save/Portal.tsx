// Customer portal landing. Reads the profile written by submitCustomerProfile(). No network.
import { SiteHeader } from '../steps/SiteHeader';
import { findLiveUnit } from '../liveRank';
import { lengthFt, money, unitImg, unitTitle } from '../results/inventory';
import { storeName } from '../steps/inventory';
import { answerText, budgetText, towText } from '../steps/answersText';
import { loadProfile } from './profile';
import { saveStoreLabel } from './stores';
import './save.css';

function Needs({ id, q, text }: { id: string; q: string; text: string }) {
  return <span className="sp-nr" data-needs-rule={q} data-spec-id={`info-needs-rule#${id}`}>Placeholder · needs-rule {q} · {text}</span>;
}

export function Portal() {
  const profile = loadProfile();
  const answers = profile?.answers;
  const pins = (profile?.pins || []).filter(Boolean);
  const saved = (profile?.saved || []).filter((s) => !pins.includes(s));
  const top = pins.map((stock) => findLiveUnit(stock)).filter((u): u is NonNullable<typeof u> => !!u);
  const savedUnits = saved.map((stock) => findLiveUnit(stock)).filter((u): u is NonNullable<typeof u> => !!u);
  const first = profile?.firstName || '';
  const store = profile ? saveStoreLabel(profile.store) : '';
  const looking = answers ? (answerText('03', answers) !== '—' ? answerText('03', answers) : answerText('02', answers)) : '—';
  const sleeps = answers && (answers.picked.includes('adults') || answers.picked.includes('children')) ? String((answers.picked.includes('adults') ? answers.adults : 0) + (answers.picked.includes('children') ? answers.children : 0)) : '—';
  const stores = answers?.stores?.length ? answers.stores.map((c) => storeName(c)).join(', ') : 'All locations';
  const lead = top[0];

  return (
    <div className="sp-portal-page" id="sp-portal" data-spec-id="frame-customer-portal" data-bos-level="frame" data-bos-role="customer" data-bos-screen="customer-portal">
      <SiteHeader prefix="sp" current="results" />
      <main className="sp-portal" id="sp-portal-main" data-spec-id="sec-portal-main" data-bos-level="section" data-bos-type="content">
        <div className="sp-portal-top" id="sp-portal-top">
          <div id="sp-portal-head" data-spec-id="sec-portal-heading">
            <p className="sp-kicker" id="sp-portal-kicker" data-spec-id="label-portal-kicker">Customer portal</p>
            <h1 className="sp-hello" id="sp-portal-hello" data-spec-id="label-portal-title">{first ? `Welcome, ${first}.` : 'Welcome.'}</h1>
            <p className="sp-text" id="sp-portal-sub" data-spec-id="info-portal-subtitle">{profile ? 'Your Smart Shopper answers, top three, and saved RVs are here. You can pick up right where you left off.' : 'Save your progress from Find your next getaway and this page keeps your answers, top three, and saved RVs.'}</p>
            <Needs id="portal-auth" q="Q2" text="is the portal a login, and how do they get back in" />
          </div>
          <aside className="sp-next" id="sp-next" data-spec-id="card-portal-next-step" data-bos-type="card">
            <p className="sp-next-k" id="sp-next-k">Next step</p>
            <h2 id="sp-next-t">{lead ? `Walk through your #1 at ${storeName(lead.location)}` : 'Walk through your #1'}</h2>
            <p id="sp-next-s">{lead ? `See the ${unitTitle(lead)} in person. No pressure — just a look at the floorplan that rose to the top of your search.` : 'Your top match will show here after you pin one and save your progress.'}</p>
            <div className="sp-next-actions" id="sp-next-actions">
              <button type="button" className="sp-commit" id="sp-book-visit" data-spec-id="btn-commit-book-visit" data-bos-class="commit">Book a visit</button>
              <a className="sp-ghost" id="sp-view-top" data-spec-id="btn-action-view-top-match" data-bos-class="action" href={lead ? `?screen=results&unit=${lead.stock}` : '?screen=results'}>View your top match</a>
            </div>
            <Needs id="book-visit" q="Q11" text='"Book a visit" has no booking flow yet' />
          </aside>
        </div>

        <section className="sp-sec" id="sp-answers-sec" data-spec-id="sec-portal-answers" data-bos-level="layer" data-bos-type="detail">
          <div className="sp-sec-h" id="sp-answers-sec-h">
            <h2 id="sp-answers-sec-t">Your Smart Shopper answers</h2>
            <a className="sp-save-btn" id="sp-edit-answers" data-spec-id="btn-action-edit-answers" data-bos-class="action" href="?screen=summary">Edit answers</a>
          </div>
          <div className="sp-answers" id="sp-answers-card" data-spec-id="card-saved-answers">
            <Ans id="type" label="Looking for" value={looking} />
            <Ans id="sleeps" label="Sleeps" value={sleeps} />
            <Ans id="budget" label="Budget" value={answers ? budgetText(answers) : '—'} />
            <Ans id="tow" label="Tow rating" value={answers ? (towText(answers) || '—') : '—'} />
            <Ans id="stores" label="Stores" value={stores} />
            <Ans id="email" label="Profile" value={profile ? `${profile.firstName} ${profile.lastName}${store ? ` · ${store}` : ''}` : '—'} />
          </div>
        </section>

        <section className="sp-sec" id="sp-top3-sec" data-spec-id="sec-portal-top3" data-bos-level="layer" data-bos-type="list">
          <div className="sp-sec-h">
            <h2 id="sp-top3-sec-t">Your top three</h2>
            <a className="sp-ghost" id="sp-top3-browse" data-spec-id="btn-action-browse-matches" data-bos-class="action" href="?screen=results&tab=top3">Adjust your top three</a>
          </div>
          {top.length === 0 ? <p className="sp-empty" id="sp-top3-empty">No top three saved yet.</p> : (
            <div className="sp-cards" id="sp-top3-grid" data-spec-id="list-portal-top3">
              {top.map((u, i) => <Tile key={u.stock} u={u} n={i + 1} kind="top3" />)}
            </div>
          )}
        </section>

        <section className="sp-sec" id="sp-saved-sec" data-spec-id="sec-portal-saved" data-bos-level="layer" data-bos-type="list">
          <div className="sp-sec-h"><h2 id="sp-saved-sec-t">Saved RVs</h2></div>
          {savedUnits.length === 0 ? <p className="sp-empty" id="sp-saved-empty">No saved RVs yet.</p> : (
            <div className="sp-cards" id="sp-saved-grid" data-spec-id="list-portal-saved">
              {savedUnits.map((u) => <Tile key={u.stock} u={u} kind="saved" />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Ans({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="sp-ans" id={`sp-ans-${id}`}>
      <p className="sp-ans-l" id={`sp-ans-${id}-l`}>{label}</p>
      <p className="sp-ans-v" id={`sp-ans-${id}-v`}>{value}</p>
    </div>
  );
}

function Tile({ u, n, kind }: { u: NonNullable<ReturnType<typeof findLiveUnit>>; n?: number; kind: 'top3' | 'saved' }) {
  const suffix = kind === 'top3' ? 'top3' : 'saved';
  return (
    <article className="sp-tile" id={`sp-portal-${suffix}-${u.stock}`} data-spec-id={`card-inventory#${u.stock}-${suffix}`} data-bos-type="card">
      <div style={{ position: 'relative' }}>
        <img src={unitImg(u)} alt="" id={`sp-portal-${suffix}-${u.stock}-img`} />
        {n ? <span className="sp-pin" style={{ position: 'absolute', top: 10, left: 10 }} id={`sp-portal-${suffix}-${u.stock}-pinned`}>#{n}</span> : null}
      </div>
      <div className="sp-tile-b">
        <h3 id={`sp-portal-${suffix}-${u.stock}-name`}>{unitTitle(u)}</h3>
        <p id={`sp-portal-${suffix}-${u.stock}-price`}>{money(u.price)}</p>
        <p id={`sp-portal-${suffix}-${u.stock}-meta`}>{u.sleeps != null ? `Sleeps ${u.sleeps}` : 'Sleeps —'} · {lengthFt(u) != null ? `${lengthFt(u)} ft` : 'length —'} · {storeName(u.location)}</p>
        <a id={`sp-portal-${suffix}-${u.stock}-details`} data-spec-id={`btn-action-view-details#${u.stock}-${suffix}`} data-bos-class="action" href={`?screen=results&unit=${u.stock}`}>View details</a>
      </div>
    </article>
  );
}

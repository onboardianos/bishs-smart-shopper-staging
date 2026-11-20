import { loadAnswers } from '../answers';
import { rankLive } from '../liveRank';
import { loadProfile } from './profile';
import { accountInitials, completedSmartShopper, pendingMatchesUrl, welcomeHeading } from './matchesUnlock';
import logo from './welcome-assets/logo-bishs-rv.png';
import heroPhoto from './welcome-assets/hero-welcome.png';
import goldEdge from './welcome-assets/gold-diagonal-edge.svg';
import iconChevron from './welcome-assets/icon-chevron-down.svg';
import iconHeart from './welcome-assets/icon-heart.svg';
import iconArrow from './welcome-assets/icon-arrow-right.svg';
import iconSparkles from './welcome-assets/icon-sparkles.svg';
import iconSend from './welcome-assets/icon-arrow-up.svg';
import glyphShopper from './welcome-assets/glyph-smart-shopper.svg';
import glyphFinancing from './welcome-assets/glyph-financing.svg';
import glyphTrade from './welcome-assets/glyph-trade-in.svg';
import glyphTowing from './welcome-assets/glyph-towing.svg';
import glyphVisit from './welcome-assets/glyph-visit.svg';
import './welcome.css';

const TILES: { id: string; label: string; icon: string; href?: string }[] = [
  { id: 'smart-shopper', label: 'Smart Shopper', icon: glyphShopper, href: '?screen=01' },
  { id: 'financing', label: 'How Financing Works', icon: glyphFinancing },
  { id: 'trade', label: 'Get Trade-In Value', icon: glyphTrade, href: '?screen=trade-now' },
  { id: 'towing', label: 'Towing 101', icon: glyphTowing },
  { id: 'visit', label: 'Prepare for Store Visit', icon: glyphVisit },
];

function liveMatchTotal(): number | null {
  try {
    const total = rankLive(loadAnswers()).total;
    return typeof total === 'number' && Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}

function matchesHref() {
  const url = pendingMatchesUrl('?state=results');
  return `${location.pathname}${url.startsWith('?') ? url : `?${url}`}`;
}

export function WelcomePage() {
  const profile = loadProfile();
  const first = profile?.firstName?.trim() || '';
  const heading = welcomeHeading(first);
  const initials = accountInitials(profile?.firstName, profile?.lastName, profile?.email);
  const accountLabel = first || (profile?.email ? profile.email.split('@')[0] : 'Account');
  const answers = loadAnswers();
  const finished = completedSmartShopper(answers);
  const total = finished ? liveMatchTotal() : null;

  return (
    <div className="pw" data-spec-id="portal.home.welcome">
      <header className="pw-nav">
        <a className="pw-logo" href={location.pathname} aria-label="Bish's RV">
          <img src={logo} alt="Bish's RV" width={134} height={57} />
        </a>
        <span className="pw-nav-rule" aria-hidden="true" />
        <nav className="pw-nav-links" aria-label="Site">
          <span className="pw-nav-item is-inert">Shop RVs <img src={iconChevron} alt="" width={14} height={14} /></span>
          <span className="pw-nav-item is-inert">Sell Your RV</span>
          <span className="pw-nav-item is-inert">Financing <img src={iconChevron} alt="" width={14} height={14} /></span>
          <span className="pw-nav-item is-inert">RV Learning Hub <img src={iconChevron} alt="" width={14} height={14} /></span>
        </nav>
        <span className="pw-nav-spacer" />
        <span className="pw-icon-btn is-inert" aria-label="Saved RVs" title="Saved RVs">
          <img src={iconHeart} alt="" width={26} height={26} />
        </span>
        <span className="pw-account" aria-label={accountLabel}>
          {initials ? <span className="pw-avatar">{initials}</span> : <span className="pw-avatar pw-avatar-empty" aria-hidden="true" />}
          <span className="pw-account-name">{accountLabel}</span>
          <img src={iconChevron} alt="" width={14} height={14} />
        </span>
      </header>

      <section className="pw-hero-wrap">
        <div className="pw-hero">
          <div className="pw-hero-copy">
            <h1 className="pw-hello">{heading}</h1>
            <p className="pw-lead">Tell us how you camp. We'll help you find RVs that fit.</p>
          </div>
          <div className="pw-hero-art" aria-hidden="true">
            <img className="pw-hero-edge" src={goldEdge} alt="" width={923} height={401} />
            <img className="pw-hero-photo" src={heroPhoto} alt="" width={1847} height={802} />
          </div>
        </div>

        <div className="pw-cards">
          {finished ? (
          <div className="pw-card pw-card-start" data-spec-id="portal.home.welcome.matches">
            <h2 className="pw-card-title">Your matches</h2>
            {total != null ? (
              <>
                <p className="pw-card-count">{total.toLocaleString('en-US')}</p>
                <p className="pw-card-lead">{total === 1 ? 'matching unit that fits your answers.' : 'matching units that fit your answers.'}</p>
              </>
            ) : (
              <p className="pw-card-lead">Your matches are ready.</p>
            )}
            <a className="pw-gold" href={matchesHref()} data-spec-id="btn-commit-see-matches">
              See Matches
              <img src={iconArrow} alt="" width={22} height={22} />
            </a>
          </div>
          ) : (
          <div className="pw-card pw-card-start" data-spec-id="portal.home.welcome.start">
            <h2 className="pw-card-title">“Smart Shopper” Experience</h2>
            <p className="pw-card-lead">Answer a few questions about how you travel.</p>
            <a className="pw-gold" href={`${location.pathname}?screen=01`}>
              Get started
              <img src={iconArrow} alt="" width={22} height={22} />
            </a>
          </div>
          )}
          <div className="pw-card pw-card-ria" data-spec-id="portal.home.welcome.agent">
            <h2 className="pw-card-title">Use Bishs RV “RIA”</h2>
            <form className="pw-ria" onSubmit={(e) => e.preventDefault()} aria-label="RIA (placeholder)">
              <label className="pw-sr" htmlFor="pw-ria-input">Ask RIA</label>
              <span className="pw-ria-spark"><img src={iconSparkles} alt="" width={20} height={20} /></span>
              <input id="pw-ria-input" className="pw-ria-input" placeholder="Ask anything about your RVs, visit, or delivery" disabled />
              <button type="button" className="pw-ria-send" disabled aria-label="Send (coming soon)">
                <img src={iconSend} alt="" width={20} height={20} />
              </button>
            </form>
            <p className="pw-ria-note">RIA is a placeholder on this page — it doesn't send a message yet.</p>
            <div className="pw-chips">
              <span className="pw-chip is-inert">Remind me what units I have been looking at.</span>
              <span className="pw-chip is-inert">What is RVFix?</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pw-tiles" aria-label="Shopping resources">
        {TILES.map((tile) => (
          tile.href
            ? <a key={tile.id} className="pw-tile" href={`${location.pathname}${tile.href}`} data-spec-id={`portal.home.tile.${tile.id}`}>
                <img src={tile.icon} alt="" width={32} height={32} />
                <span>{tile.label}</span>
              </a>
            : <span key={tile.id} className="pw-tile is-inert" aria-disabled="true" title="Coming soon" data-spec-id={`portal.home.tile.${tile.id}`}>
                <img src={tile.icon} alt="" width={32} height={32} />
                <span>{tile.label}</span>
              </span>
        ))}
      </section>
    </div>
  );
}

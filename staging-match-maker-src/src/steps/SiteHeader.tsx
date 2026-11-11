import { useState, type FormEvent, type ReactNode } from 'react';
import logo from './assets/logo-bishs-rv-black-gold.png';

// One header on every Smart Shopper screen. White bar, thin bottom border.
// Left: Bish's logo, then the wordmark SMART (black) + SHOPPER (gold), condensed caps.
// Center (desktop): rounded search, magnifier, placeholder "The easiest way to search..".
// Mobile: logo row on top, full-width search field underneath (font-size >= 16px).
// Gold here is the brand wordmark only (data-gold="brand"), never a fill.
export const WEBSITE_HOME = './';
const SearchI = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

export function SiteHeader({ prefix, homeHref = WEBSITE_HOME, ssHref = './', current, end }: { prefix: string; homeHref?: string; ssHref?: string; current?: string; end?: ReactNode }) {
  const [q, setQ] = useState(() => new URLSearchParams(location.search).get('q') || '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    location.href = `${ssHref}?screen=00${t ? `&q=${encodeURIComponent(t)}` : ''}`;
  };
  return (
    <header className="sh" id={`${prefix}-bar`} data-spec-id="nav-site-header" data-bos-level="section" data-bos-type="nav">
      <div className="sh-in" id={`${prefix}-bar-in`} data-spec-id="nav-site-header-row">
        <div className="sh-brand" id={`${prefix}-brand`} data-spec-id="nav-site-brand">
          <a className="sh-logo" id={`${prefix}-logo`} href={homeHref} data-spec-id="btn-action-home" data-bos-class="action" aria-label="Bish's RV website home">
            <img id={`${prefix}-logo-img`} data-spec-id="media-site-logo" src={logo} alt="Bish's RV" width={98} height={42} />
          </a>
          <a className="sh-word" id={`${prefix}-product`} href={ssHref} data-spec-id="btn-action-smart-shopper-home" data-bos-class="action" aria-label="Smart Shopper" aria-current={current === 'landing' ? 'page' : undefined}>
            <span className="sh-word-a" id={`${prefix}-product-a`} data-spec-id="label-wordmark-smart">SMART</span>
            <span className="sh-word-b" id={`${prefix}-product-b`} data-spec-id="label-wordmark-shopper" data-gold="brand">SHOPPER</span>
          </a>
        </div>
        <form className="sh-search" id={`${prefix}-site-search`} data-spec-id="input-site-search" role="search" onSubmit={submit}>
          <label className="sh-field" id={`${prefix}-site-search-field`} data-spec-id="input-site-search-field">
            <span className="sh-field-i" id={`${prefix}-site-search-i`} data-spec-id="info-site-search-icon"><SearchI /></span>
            <input id={`${prefix}-site-search-input`} data-spec-id="input-site-search-text" data-bos-class="input" type="search" inputMode="search" autoComplete="off"
              placeholder="The easiest way to search.." aria-label="Search RVs" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </form>
        {end}
      </div>
    </header>
  );
}

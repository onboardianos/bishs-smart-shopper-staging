// Asserts document.scrollWidth <= innerWidth for every Smart Shopper step and save/portal state.
// Run from a machine with playwright-core and Chrome:
//   node scripts/overflow-check.mjs http://127.0.0.1:8765/staging-match-maker/
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:8765/staging-match-maker/';
const widths = [320, 360, 375, 390, 414, 430, 768, 820, 1024, 1280, 1440];
const pages = [
  ['home', ''], ['01', '?screen=01'], ['02', '?screen=02'], ['03', '?screen=03'], ['04', '?screen=04'],
  ['fw', '?screen=fw'], ['mh', '?screen=mh'], ['camping', '?screen=camping'],
  ['trade-now', '?screen=trade-now'], ['trade-why', '?screen=trade-why'],
  ['camp-style', '?screen=camp-style'], ['activities', '?screen=activities'],
  ['sleep', '?screen=sleep'], ['bedroom', '?screen=bedroom'], ['tow', '?screen=tow'],
  ['length', '?screen=length'], ['garage', '?screen=garage'],
  ['bath', '?screen=bath'], ['inside', '?screen=inside'], ['outside', '?screen=outside'],
  ['size', '?screen=size'], ['build', '?screen=build'], ['budget', '?screen=budget'], ['summary', '?screen=summary'],
  ['results', '?state=results'], ['save', '?state=save'], ['save-code', '?state=save-code'],
  ['save-success', '?state=save-success'], ['save-merge', '?state=save-merge'], ['save-error', '?state=save-error'],
  ['save-ip', '?state=save-ip'], ['save-zip-invalid', '?state=save-zip-invalid'], ['save-tie', '?state=save-tie'],
  ['portal', '?state=portal'], ['portal-trade', '?state=portal-trade'], ['portal-notes', '?state=portal-notes'],
  ['portal-outfitter', '?state=portal-outfitter'], ['portal-saved-units', '?state=portal-saved-units'],
  ['portal-my-deal', '?state=portal-my-deal'], ['portal-empty', '?state=portal-empty'],
  ['book-visit', '?state=book-visit'], ['book-visit-confirm', '?state=book-visit-confirm'], ['book-visit-success', '?state=book-visit-success'],
];

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
const clipWidths = new Set([320, 375, 390]);
const clipPages = [
  ['results-grid', '?state=results'],
  ['results-list', '?state=results&view=list'],
  ['results-top3', '?state=results&tab=top3'],
];

function clippedText() {
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!(el instanceof HTMLElement)) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || el.clientWidth === 0) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!hasText) continue;
    let box = el;
    let clips = false;
    while (box && box !== document.documentElement) {
      const ox = getComputedStyle(box).overflowX;
      if (ox === 'hidden' || ox === 'clip') { clips = true; break; }
      box = box.parentElement;
    }
    if (clips && el.scrollWidth > el.clientWidth + 1) bad.push((el.id || String(el.className) || el.tagName) + ': ' + el.textContent.trim().slice(0, 48));
  }
  return bad.slice(0, 8);
}

const summary = [];
const fails = [];
for (const w of widths) {
  await page.setViewportSize({ width: w, height: w < 700 ? 800 : 900 });
  let pass = 0;
  for (const [name, q] of pages) {
    await page.goto(base + q, { waitUntil: 'domcontentloaded' });
    const r = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 ? null : document.documentElement.scrollWidth);
    if (r == null) pass++;
    else fails.push({ w, name, scrollWidth: r });
  }
  if (clipWidths.has(w)) {
    for (const [name, q] of clipPages) {
      await page.goto(base + q, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
      const clipped = await page.evaluate(clippedText);
      if (clipped.length) fails.push({ w, name, clipped });
      else pass++;
    }
  }
  summary.push({ width: w, checked: pages.length + (clipWidths.has(w) ? clipPages.length : 0), pass, fail: pages.length + (clipWidths.has(w) ? clipPages.length : 0) - pass });
}
console.log(JSON.stringify({ summary, fails }, null, 2));
await browser.close();
process.exit(fails.length ? 1 : 0);

# Bish's RV Smart Shopper — staging sandbox

This is the staging sandbox for Bish's RV Smart Shopper (Match Maker). Every Smart Shopper improvement lands here first. It is promoted to production only when Zach says so.

## How this maps to bishsos.com

Vercel serves this repository as a plain static site (no framework, no build). The app is at `/staging-match-maker/`.

`https://bishsos.com/staging-match-maker/` is a rewrite from the production site onto this host's `/staging-match-maker/`. The same folder is what you get by opening this deployment directly. `/` on this host redirects to `/staging-match-maker/`.

Asset paths are relative to `/staging-match-maker/`, so they resolve both on this host and behind the bishsos.com rewrite.

The page sends `noindex, nofollow` in a robots meta tag and in an `X-Robots-Tag` response header.

## What is running

Redesigned Smart Shopper (question order and skip rules from live Wayfinder v2.1) plus the mobile and owner fixes. Source is `staging-match-maker-src/` (`npm install` then `npm run build` with base `/staging-match-maker/`). Question-by-question parity is in `QUESTION-PARITY.md`.

- Engine **1.2.0** (match-maker scoring). `index.html` restores it after `vendor/_ds_bundle.js` loads. Permission verbs stay `discovery.*` and `match.send`.
- Inventory snapshot **INV-2026-11-09-80022971B2E4** (8,067 in-scope units, generated 2026-11-09). Byte-identical to the live Match Maker snapshot at `bishsos.com/tools/wayfinder/snapshot.js`. No newer snapshot is published, so the day-old note still shows on the question screens. The results pool is that full file: every in-scope unit, every location, sale price / DSRP (`price`), never MSRP.
- Tow gate keeps campers within **90%** of the published tow rating unless the shopper chooses the exact number
- Budgets gate on the snapshot `price` field (sale price, with evo DSRP as the fallback). The matches screen labels that figure DSRP. MSRP is not the budget.
- Known-unit search and the loader both key off snapshot `stocknumber`. A suggestion navigates to `?screen=loading&unit=<stock>` with no hash.
- Hitch art for bumper pull and fifth wheel is swapped only in `staging-match-maker-src/src/steps/HitchArt.tsx` (`HITCH_ART`).

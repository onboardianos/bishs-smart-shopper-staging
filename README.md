# Bish's RV Smart Shopper — staging sandbox

This is the staging sandbox for Bish's RV Smart Shopper (Match Maker). Every Smart Shopper improvement lands here first. It is promoted to production only when Zach says so.

## How this maps to bishsos.com

Vercel serves this repository as a plain static site (no framework, no build). The app is at `/staging-match-maker/`.

`https://bishsos.com/staging-match-maker/` is a rewrite from the production site onto this host's `/staging-match-maker/`. The same folder is what you get by opening this deployment directly. `/` on this host redirects to `/staging-match-maker/`.

Asset paths are relative to `/staging-match-maker/`, so they resolve both on this host and behind the bishsos.com rewrite.

The page sends `noindex, nofollow` in a robots meta tag and in an `X-Robots-Tag` response header.

## What is running

Baseline copy of the live Smart Shopper (`bishsos.com/tools/wayfinder/`, bishs-harness master `3c3d133`).

- Engine **1.2.0** (match-maker scoring)
- Inventory snapshot **INV-2026-11-09-80022971B2E4** (8,067 in-scope units, generated 2026-11-09)
- Tow gate keeps campers within **90%** of the published tow rating unless the shopper chooses the exact number
- Budgets gate on the snapshot `price` field (sale price, with evo DSRP as the fallback). The matches screen labels that figure DSRP. MSRP is not the budget.

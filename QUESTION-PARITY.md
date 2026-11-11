# Smart Shopper question parity

Live source of truth: Wayfinder v2.1 on bishsos.com/smart-shopper (engine 1.2.0). The redesigned UI keeps that order and those skip rules, and splits the live type screen into the approved card steps (path, towable type, bumper pull). Status is ✔ when the live question and its options are in the new UI, or **fixed** when this pass added or corrected something that was missing.

| Live question | Live options (value → label) | New UI | Status |
| --- | --- | --- | --- |
| Start | stock search (optional) | Landing “I already have one in mind” and Step 1 `?screen=01` (`src/steps/Landing.tsx`, `start.tsx`) | ✔ lookup now uses snapshot `stocknumber` |
| Path | `TOW` Towable, `MOTOR` Motorhome | Step 2 `?screen=02` — Towable, Motorhome, plus redesign **Destination** (`DT`) | ✔ |
| Type (towable) | `TT` Travel Trailer, `FD` Pop-up / Fold-down, `AT` Adventure Trailer, `HTT` Hybrid Trailer, `TTTH` TT Toy Hauler, `FW` Fifth Wheel, `FWTH` FW Toy Hauler, `TC` Truck Camper, `DT` Destination Trailer | Step 3 cards: Bumper pull, Fifth wheel, **FW Toy Hauler**, Truck camper. Step 4 bumper cards: Pop-up camper (`FD`), Teardrop (`AT`), Hybrid trailer (`HTT`), Travel trailer (`TT`), With garage (`TTTH`). Destination is the path card (`DT`) | **fixed** — FW Toy Hauler is its own card (it was folded into Fifth wheel) |
| Type (motorhome) | `AG` Class A gas, `AD` Class A diesel, `B` Class B van, `C` Class C, `CD` Class C diesel, `ANY` Any motorhome | `?screen=mh` | **fixed** — Class C diesel was merged into Class C; Class B label is “Class B van”; Any motorhome added. Shown whenever the path includes Motorhome |
| Camping today | `first` First-time buyer, `current` I have one now, `experienced` We’ve had one before | `?screen=camping` | ✔ |
| Your camper | year, manufacturer, brand, model (skip unless camping = current) | `?screen=trade-now` | ✔ |
| What to change | space, bedroom, bath, storage, amenities, tow, longer, simpler, plus a note. Live also had a voice note | `?screen=trade-why` | ✔ options kept. Voice note **removed** (owner request) |
| Camping style | `boondocking` Boondocking / off-grid, `pad` Pad camping (hookups) | `?screen=camp-style` | ✔ |
| Activities | beaches, paddle, tailgating, entertaining, remotework, crafting, hiking, relaxing, skiing, swimming, biking, powersports, fishing, hunting, plus Other | `?screen=activities` | ✔ |
| Sleeping | adults, children or guests, pets; child setup `must` Bunks required, `prefer` Prefer bunks, `flex` Flexible sleeping; motorhome `loft` Cab-over bunk or loft, `convert` Convertible beds are fine | `?screen=sleep` | ✔ |
| Bedroom | `must` Must have a private bedroom, `prefer` Prefer a private bedroom, `space` Prefer open living space (towable), `open` No preference. Skip: Class B only, or private-master share ≥ 95% or ≤ 5% | `?screen=bedroom` | ✔ |
| Towing | `yes` Yes, with my own vehicle, `no` Not sure yet, `delivery` I need it delivered. 90% margin default (`derived`) or exact (`raw`). Skip when nothing towable is in play | `?screen=tow` | ✔ |
| Length | `hard` Hard limit, `soft` Shorter is better, `none` Not a concern | `?screen=length` | ✔ |
| Garage | `need` I know my length, `any` Any garage is fine. Skip unless a toy hauler class (`TTTH` or `FWTH`) is selected | `?screen=garage` | ✔ |
| Bathroom | `bigger`, `two`, `dual`, `walk`, `compact`, plus Open to any bathroom. Must-have on cards that can gate. Skip when nothing left splits the pool | `?screen=bath` | ✔ |
| Inside | `cook` I cook inside often, `living` An open living room, `bedslide` Walk-around bedroom, `murphy` Fold-away bed (motorhome), `gsleep` The garage sleeps people too (toy hauler), `wd` Washer / dryer prep, plus Open | `?screen=inside` | ✔ |
| Outside | `cookout` I cook outside often, `rearkit` Kitchen near the outdoor action, `patio` Outdoor hangout or patio (or `rearpatio` Rear patio on toy haulers) | `?screen=outside` | ✔ |
| Slide-outs | `space` More room — slide-outs welcome, `balanced` Open to either, `simple` Lighter and simpler — fewer slides. Skip when slide counts do not vary | `?screen=size` | ✔ |
| Build | `laminate` Laminate / fiberglass, `value` Stick and tin / aluminum, `either` No preference, plus “Only show me this construction”. Skip when construction does not vary | `?screen=build` | ✔ |
| Budget | `cash` Paying cash, `finance` Monthly payment. Tiers veryGood / good / fair / poor. Payment starts at **$750**, down at $5,500. Gate is sale price / DSRP, never MSRP | `?screen=budget` | ✔ |
| Summary → loading → matches | review, then rank | `?screen=summary`, `qload`, `results` / `matches` | ✔ |

Skip rules live in `staging-match-maker-src/src/steps/flowSteps.ts`. Session gates live in `src/session.ts` (port of live `buildSession`, tow margin 90%).

Hitch drawings for Bumper pull and Fifth wheel are the only art in `src/steps/HitchArt.tsx` (`HITCH_ART`). Owner PNG replacements were not in this environment, so the built-in drawings remain until those two files are set.

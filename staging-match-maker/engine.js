(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const QUESTIONNAIRE_VERSION = 'v2.1-rev6';
  const SCORING_VERSION = '1.2.0 (match-maker)';

  // characteristic ids — identical id space in both tools (Athena characteristic type ids)
  const IDS = {
    DISH: 1, WASH: 2, DOUBLE_BATH: 3, DUAL_VANITY: 4, FRONT_BATH: 5, REAR_BATH: 6, WALK_THRU: 7, WETBATH: 8,
    DUAL_QUEEN: 9, EAST_WEST: 10, LOFT: 11, MURPHY: 12, TWIN_CONV: 13, TENT: 14, PRIVATE_MASTER: 15,
    TOY_SINGLE: 17, TOY_DOUBLE: 18, DOUBLE_BUNKS: 19, MID_BUNK: 20, PRIVATE_BUNK_ROOM: 21, QUAD_BUNKS: 22,
    SINGLE_BUNKS: 23, TRIPLE_BUNKS: 24, BATH_ENTRY: 25, DUAL_ENTRY: 26, CARGO_DOOR: 27, RAMP: 28,
    FRONT_KITCHEN: 29, REAR_KITCHEN: 30, L_KITCHEN: 31, ISLAND_KITCHEN: 32, U_KITCHEN: 33, FRONT_LIVING: 34,
    REAR_DINETTE: 35, REAR_LIVING: 36, REAR_ENT: 37, PRIVATE_OFFICE: 38, OUTSIDE_KITCHEN: 39,
    FRONT_CAP_WINDOW: 40, SIDE_PATIO: 41, REAR_PATIO: 42, BED_SLIDE: 43, WARDROBE_SLIDE: 44, FULL_WALL: 45,
    SUPER_SLIDE: 46, EXTENDED_SLIDE: 47, STANDARD_SLIDE: 48, TEARDROP: 49, AFRAME: 50,
  };
  const BUNK_IDS = [19, 20, 21, 22, 23, 24];
  const SLIDE_IDS = [43, 44, 45, 46, 47, 48];
  const TOY_BED_IDS = [17, 18];
  const MOTORHOME_CLASSES = ['AD', 'AG', 'B', 'C', 'CD'];
  const TOWABLE_CLASSES = ['TT', 'FW', 'TTTH', 'FWTH', 'HTT', 'FD', 'AT', 'TC', 'DT'];
  const TOY_CLASSES = ['TTTH', 'FWTH'];

  // ---- match-maker constants (verbatim) ----
  const STRENGTH_WEIGHT = { strong: 12, prefer: 8, nice: 4, flex: 6 };
  const MISS_PENALTY = { strong: 6, prefer: 4, nice: 2, flex: 2 };
  const AVOID_PENALTY = { avoid: 6, strongAvoid: 10 };
  const QA_PENALTY = {
    DUPLICATE_STOCKNUMBER: -5, UNKNOWN_CLASS: -5, UNKNOWN_CONDITION: -5,
    MISSING_MAKE_ID: -3, MISSING_MANUFACTURER_ID: -3, MISSING_FLOORPLAN_ID: -3, MISSING_CHARACTERISTICS: -3,
    MISSING_PRICE: -1, MISSING_GVWR: -1, MISSING_LENGTH: -1, MISSING_SLEEP_COUNT: -1,
    UNKNOWN_LOCATION: -1, UNKNOWN_SIDEWALL: -1, SUSPECT_LENGTH_UNIT: -3,
  };
  const APR_BY_TIER = { poor: 15.00, fair: 12.00, good: 9.00, verygood: 6.99, veryGood: 6.99 };  // poor: placeholder rate (v2.1 rev 13), confirm with F&I
  const TERM_BANDS = [[5000, 20000, 120], [20000, 25000, 144], [25000, 60000, 180], [60000, Infinity, 240]];
  const FALLBACK_TAX = 0.06;
  const RANK_ORDER = { VERIFIED_AVAILABLE: 1, VERIFIED_L_STOCK_EXAMPLE: 2, PROBABLE_NEEDS_VERIFICATION: 3, INELIGIBLE: 9 };
  // v2.1 pref strengths -> match-maker strengths (same weights: 12 / 8 / 4 / 6)
  const STRENGTH_MAP = { strongly: 'strong', prefer: 'prefer', nice: 'nice', flexible: 'flex', strong: 'strong', flex: 'flex', avoid: 'avoid', strongAvoid: 'strongAvoid' };

  const cIds = u => u.characteristicTypeIds || [];
  const hasAny = (u, ids) => { const ch = cIds(u); for (let i = 0; i < ids.length; i++) if (ch.indexOf(ids[i]) !== -1) return true; return false; };
  const clone = o => JSON.parse(JSON.stringify(o));
  let CHAR_NAMES = {};

  function qaPenaltyFor(flag, gates) {
    if (flag === 'MISSING_PRICE') return gates.priceActive ? -3 : -1;
    if (flag === 'MISSING_GVWR') return gates.gvwrActive ? -5 : -1;
    if (flag === 'MISSING_LENGTH') return gates.lengthActive ? -3 : -1;
    if (flag === 'MISSING_SLEEP_COUNT') return gates.sleepActive ? -3 : -1;
    if (flag === 'MISSING_GARAGE_LENGTH') return gates.garageActive ? -3 : -1;
    return QA_PENALTY[flag] || 0;
  }

  // ---- v2.1 gate object -> match-maker gate object ----
  function mmGates(g) {
    g = g || {};
    const must = [];
    (g.requiredChars || []).forEach(id => must.push({ ids: [id], label: CHAR_NAMES[id] || ('characteristic ' + id) }));
    (g.requiredAnyOf || []).forEach(list => {
      const isBunks = list.length === BUNK_IDS.length && list.every(id => BUNK_IDS.indexOf(id) !== -1);
      must.push({ ids: list, label: isBunks ? 'Dedicated bunks' : list.map(id => CHAR_NAMES[id] || id).join(' / ') });
    });
    return {
      classIds: g.classes && g.classes.length ? g.classes : null,
      priceActive: g.priceMax != null, priceMax: g.priceMax,
      gvwrActive: g.gvwrMax != null, gvwrMax: g.gvwrMax,
      lengthActive: g.lengthMaxFt != null, lengthMaxIn: g.lengthMaxFt != null ? g.lengthMaxFt * 12 : null,
      garageActive: g.garageMinFt != null, garageMinIn: g.garageMinFt != null ? g.garageMinFt * 12 : null,
      sleepActive: g.sleepsMin != null && g.sleepsMin > 0, sleepMin: g.sleepsMin || 0,
      charMustHave: must,
      sidewallMustHave: g.sidewall || null,
    };
  }

  // ---- evaluateUnit (verbatim logic; also reports which fields were unknown) ----
  function evaluateUnit(u, gates) {
    let probable = false; const unknown = [];
    if (gates.classIds && gates.classIds.indexOf(u.class) === -1) return { pass: false, probable: false, reason: 'type', unknown };
    if (gates.priceActive) {
      if (u.price == null) { probable = true; unknown.push('price'); }
      else if (u.price > gates.priceMax) return { pass: false, probable: false, reason: 'price', unknown };
    }
    if (gates.gvwrActive) {
      if (u.gvwr == null) { probable = true; unknown.push('gvwr'); }
      else if (u.gvwr > gates.gvwrMax) return { pass: false, probable: false, reason: 'gvwr', unknown };
    }
    if (gates.lengthActive) {
      if (u.lengthIn == null) { probable = true; unknown.push('length'); }
      else if (u.lengthIn > gates.lengthMaxIn) return { pass: false, probable: false, reason: 'length', unknown };
    }
    if (gates.sleepActive) {
      if (u.sleeps == null) { probable = true; unknown.push('sleeps'); }
      else if (u.sleeps < gates.sleepMin) return { pass: false, probable: false, reason: 'sleep', unknown };
    }
    if (gates.garageActive) {
      if (u.garageLength == null) { probable = true; unknown.push('garage'); }
      else if (u.garageLength < gates.garageMinIn) return { pass: false, probable: false, reason: 'garage', unknown };
    }
    for (let i = 0; i < gates.charMustHave.length; i++) {
      const must = gates.charMustHave[i];
      if (!cIds(u).length) { probable = true; if (unknown.indexOf('requiredChars') === -1) unknown.push('requiredChars'); continue; }
      const has = must.ids.some(id => cIds(u).indexOf(id) !== -1);
      if (!has) return { pass: false, probable: false, reason: must.label, unknown };
    }
    if (gates.sidewallMustHave) {
      if (!u.sidewallConstruction || u.sidewallConstruction === 'UNKNOWN') { probable = true; unknown.push('sidewall'); }
      else if (u.sidewallConstruction !== gates.sidewallMustHave) return { pass: false, probable: false, reason: 'sidewall', unknown };
    }
    return { pass: true, probable, unknown };
  }

  function filterUnits(units, gates) {
    let verified = 0, probableN = 0; const list = [];
    for (let i = 0; i < units.length; i++) { const r = evaluateUnit(units[i], gates); if (r.pass) { list.push(units[i]); r.probable ? probableN++ : verified++; } }
    return { list, verified, probable: probableN, total: verified + probableN };
  }

  // ---- v2.1 session -> match-maker scoring state ----
  // match-maker infers ONE lifestyle set. Only two exist for now: family (any children or guests) or couple (everyone else, the fallback)
  function lifestyleFor(session) {
    const paths = session.lifestylePaths || [];
    if (paths.indexOf('family') !== -1) return { key: 'family', ids: [{ key: 'lf_bunks', ids: BUNK_IDS }, { key: 'lf_doublebath', ids: [IDS.DOUBLE_BATH] }, { key: 'lf_bathentry', ids: [IDS.BATH_ENTRY] }] };
    return { key: 'couple', ids: [{ key: 'lf_rearliving', ids: [IDS.REAR_LIVING] }, { key: 'lf_ewbed', ids: [IDS.EAST_WEST] }] };
  }
  const COMPACT_REF_IN = 41 * 12; // length reference for the compact priority when no hard length gate is active (top of the Length slider)
  function mmState(session) {
    const gates = mmGates(session.gates);
    const prefs = (session.prefs || []).map(p => ({ key: p.key, label: p.label, charIds: p.ids, strength: STRENGTH_MAP[p.strength] || 'prefer' }));
    const avoids = (session.avoids || []).map(a => ({ key: a.key, label: a.label, charIds: a.ids, strength: STRENGTH_MAP[a.strength] || 'avoid' }));
    const P = session.numericPriorities || {};
    const numericPriorities = [];
    if (P.value) numericPriorities.push({ key: 'value' });
    if (P.lightweight) numericPriorities.push({ key: 'lightweight' });
    if (P.compact) numericPriorities.push({ key: 'compact' });
    if (P.sleepFlex) numericPriorities.push({ key: 'sleepflex' });
    if (P.space) numericPriorities.push({ key: 'morespace' });
    if (P.simple) numericPriorities.push({ key: 'simpler' });
    const explicit = {};
    // keys here must match lifestyleFor() concept keys (lf_*), otherwise the guard never fires (fix)
    prefs.forEach(p => { if ((session.prefs.find(x => x.key === p.key) || {}).concept === 'child_sleep') explicit.lf_bunks = true; if ((session.prefs.find(x => x.key === p.key) || {}).concept === 'adult_privacy') explicit.lf_privatemaster = true; });
    if ((session.gates.requiredChars || []).indexOf(IDS.PRIVATE_MASTER) !== -1) explicit.lf_privatemaster = true;
    if ((session.gates.requiredAnyOf || []).some(l => l.indexOf(IDS.DOUBLE_BUNKS) !== -1)) explicit.lf_bunks = true;
    const lf = lifestyleFor(session);
    return {
      gates, prefs, avoids, numericPriorities,
      sidewallAnswer: session.sidewallPref === 'laminate' ? 'quality' : (session.sidewallPref === 'value' ? 'value' : null),
      lifestyleConceptIds: lf.ids, lifestyleKey: lf.key, explicitConceptKeys: explicit,
    };
  }

  function dedupeByKey(list) { const seen = {}, out = []; list.forEach(x => { if (!seen[x.key]) { seen[x.key] = true; out.push(x); } }); return out; }

  // ---- scoreUnit (verbatim logic) ----
  function scoreUnit(u, s) {
    const gates = s.gates;
    const ev = evaluateUnit(u, gates);
    if (!ev.pass) return { rankGroup: 'INELIGIBLE', final: -1, display: 0, components: {}, hits: [], misses: [], avoided: [], gateResult: { unknown: [] }, reasons: [] };
    const isProbable = ev.probable;
    let rankGroup, base;
    if (u.isLStock) { rankGroup = isProbable ? 'PROBABLE_NEEDS_VERIFICATION' : 'VERIFIED_L_STOCK_EXAMPLE'; base = isProbable ? 35 : 45; }
    else { rankGroup = isProbable ? 'PROBABLE_NEEDS_VERIFICATION' : 'VERIFIED_AVAILABLE'; base = isProbable ? 40 : 50; }

    const dedupedPrefs = dedupeByKey(s.prefs), dedupedAvoids = dedupeByKey(s.avoids);
    let prefEarned = 0, prefPossible = 0; const matched = [], missed = [];
    dedupedPrefs.forEach(p => { const w = STRENGTH_WEIGHT[p.strength]; prefPossible += w; if (hasAny(u, p.charIds)) { prefEarned += w; matched.push({ label: p.label, strength: p.strength }); } else missed.push(p); });
    const prefScore = prefPossible > 0 ? 30 * prefEarned / prefPossible : 0;

    let lifeScore = 0; const lifeHits = [];
    if (s.lifestyleConceptIds.length) {
      const applicable = s.lifestyleConceptIds.filter(c => !s.explicitConceptKeys[c.key]);
      if (applicable.length) {
        const matchedN = applicable.filter(c => { const h = hasAny(u, c.ids); if (h) lifeHits.push(c.key.replace(/^lf_/, '')); return h; }).length;
        lifeScore = 12 * matchedN / applicable.length;
      }
    }

    let valScore = 0;
    if (s.sidewallAnswer === 'quality') valScore = u.sidewallConstruction === 'LAMINATE' ? 8 : 0;
    else if (s.sidewallAnswer === 'value') valScore = u.sidewallConstruction === 'STT' ? 8 : (u.sidewallConstruction === 'LAMINATE' ? 3 : 0);

    let numScore = 0;
    s.numericPriorities.forEach(np => {
      if (np.key === 'value' && u.price != null && gates.priceActive && gates.priceMax) numScore += 3 * (1 - Math.max(0, u.price) / gates.priceMax);
      else if (np.key === 'lightweight' && u.gvwr != null && gates.gvwrActive && gates.gvwrMax) numScore += 3 * (1 - Math.min(1, u.gvwr / gates.gvwrMax));
      else if (np.key === 'compact' && u.lengthIn != null) numScore += 3 * (1 - Math.min(1, u.lengthIn / ((gates.lengthActive && gates.lengthMaxIn) || COMPACT_REF_IN))); // fix: 'shorter is better' scores against the 41 ft slider top when no hard limit is set
      else if (np.key === 'sleepflex' && u.sleeps != null) numScore += Math.min(2, Math.max(0, (u.sleeps - gates.sleepMin)) * 0.7);
      else if (np.key === 'morespace' && u.slides != null) numScore += Math.min(2, u.slides * 0.7);
      else if (np.key === 'simpler' && u.slides != null) numScore += u.slides === 0 ? 2 : (u.slides === 1 ? 1 : 0);
    });
    numScore = Math.min(7, numScore);

    let missPossible = 0, missActual = 0; const avoided = [];
    dedupedPrefs.forEach(p => { missPossible += MISS_PENALTY[p.strength]; });
    missed.forEach(p => { missActual += MISS_PENALTY[p.strength]; });
    dedupedAvoids.forEach(a => {
      const pen = AVOID_PENALTY[a.strength] || AVOID_PENALTY.avoid; missPossible += pen;
      if (hasAny(u, a.charIds)) { missActual += pen; const hit = a.charIds.filter(id => cIds(u).indexOf(id) !== -1)[0]; avoided.push(CHAR_NAMES[hit] || a.label); }
    });
    const missScore = missPossible > 0 ? -12 * missActual / missPossible : 0;

    let qaScore = 0; (u.qaFlags || []).forEach(f => { qaScore += qaPenaltyFor(f, gates); }); qaScore = Math.max(-8, qaScore);

    const final = base + prefScore + lifeScore + valScore + numScore + missScore + qaScore;
    const r2 = v => Math.round(v * 100) / 100;
    const reasons = [];
    if (isProbable) reasons.push('Needs a quick check: no ' + ev.unknown.join(', ') + ' on file');
    if (u.isLStock) reasons.push('Floorplan example, not a physical unit');
    if (matched.length) reasons.push('Matches: ' + matched.map(m => m.label).join(', '));
    if (missed.length) reasons.push('Missing: ' + missed.map(m => m.label).join(', '));
    if (avoided.length) reasons.push('Has avoided feature: ' + avoided.join(', '));
    if (lifeHits.length) reasons.push('Lifestyle fit (' + s.lifestyleKey + '): ' + lifeHits.join(', '));
    if (valScore) reasons.push((u.sidewallConstruction === 'LAMINATE' ? 'Laminate' : 'Stick-and-tin') + ' construction matches your priority');
    if (u.qaFlags && u.qaFlags.length) reasons.push('Data quality: ' + u.qaFlags.map(f => f.toLowerCase().replace(/_/g, ' ')).join(', '));
    return {
      rankGroup, final, display: Math.max(0, Math.min(100, Math.round(final))),
      components: { base, explicit: r2(prefScore), lifestyle: r2(lifeScore), construction: valScore, numeric: r2(numScore), miss: r2(missScore), qa: r2(qaScore) },
      hits: matched.map(m => m.label), misses: missed.map(m => m.label), avoided, gateResult: { unknown: ev.unknown }, reasons,
      _prefScore: prefScore, _lifeScore: lifeScore, _valScore: valScore, _numScore: numScore,
    };
  }

  // ---- public surface (v2.1 API) ----
  function emptyGates() { return { classes: [], priceMax: null, gvwrMax: null, lengthMaxFt: null, sleepsMin: null, requiredChars: [], requiredAnyOf: [], sidewall: null }; }
  function newSession(snapshot) {
    CHAR_NAMES = {};
    const ct = snapshot && snapshot.lookups && snapshot.lookups.characteristicTypes;
    if (ct) Object.keys(ct).forEach(k => { CHAR_NAMES[Number(k)] = (ct[k] && (ct[k].name || ct[k].description)) || String(ct[k]); });
    return {
      sessionId: 'S-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      inventorySnapshotId: snapshot && snapshot.meta ? snapshot.meta.inventorySnapshotId : null,
      questionnaireVersion: QUESTIONNAIRE_VERSION, scoringVersion: SCORING_VERSION, createdAt: new Date().toISOString(),
      gates: emptyGates(), prefs: [], avoids: [], numericPriorities: {}, sidewallPref: null, lifestylePaths: [],
      sleepers: { adults: null, children: null }, tow: { applies: null, rating: null, mode: 'derived' },
      budget: { mode: null, priceCeiling: null, taxRate: FALLBACK_TAX, taxIsFallback: true, solved: null }, store: null, answers: {},
    };
  }
  function candidates(units, gates) {
    const g = mmGates(gates); const verified = [], probable = []; let ineligible = 0;
    for (let i = 0; i < units.length; i++) { const r = evaluateUnit(units[i], g); if (!r.pass) ineligible++; else if (r.probable) probable.push(units[i]); else verified.push(units[i]); }
    return { verified, probable, ineligible };
  }
  function previewGate(units, gates, patch) {
    const g = clone(gates || emptyGates());
    Object.keys(patch || {}).forEach(k => {
      if (k === 'requiredChars') g.requiredChars = (g.requiredChars || []).concat(patch[k].filter(id => (g.requiredChars || []).indexOf(id) === -1));
      else if (k === 'requiredAnyOf') g.requiredAnyOf = (g.requiredAnyOf || []).concat(patch[k]);
      else g[k] = patch[k];
    });
    const r = filterUnits(units, mmGates(g));
    return { gates: g, counts: { verified: r.verified, probable: r.probable, total: r.total } };
  }
  function previewBoost(candidateUnits, ids) { let n = 0; for (let i = 0; i < candidateUnits.length; i++) if (hasAny(candidateUnits[i], ids)) n++; return n; }
  function rankResults(units, session) {
    const s = mmState(session);
    const f = filterUnits(units, s.gates);
    const scored = f.list.map(u => ({ unit: u, score: scoreUnit(u, s) })).filter(x => x.score.rankGroup !== 'INELIGIBLE');
    scored.sort((a, b) => {
      if (RANK_ORDER[a.score.rankGroup] !== RANK_ORDER[b.score.rankGroup]) return RANK_ORDER[a.score.rankGroup] - RANK_ORDER[b.score.rankGroup];
      if (b.score.final !== a.score.final) return b.score.final - a.score.final;
      if (b.score._prefScore !== a.score._prefScore) return b.score._prefScore - a.score._prefScore;
      if (b.score._lifeScore !== a.score._lifeScore) return b.score._lifeScore - a.score._lifeScore;
      if (b.score._valScore !== a.score._valScore) return b.score._valScore - a.score._valScore;
      if (b.score._numScore !== a.score._numScore) return b.score._numScore - a.score._numScore;
      return String(a.unit.stocknumber) > String(b.unit.stocknumber) ? 1 : -1;
    });
    const groups = { VERIFIED_AVAILABLE: [], VERIFIED_L_STOCK_EXAMPLE: [], PROBABLE_NEEDS_VERIFICATION: [] };
    scored.forEach(x => groups[x.score.rankGroup].push(x));
    return { groups, all: scored, ineligible: units.length - f.list.length, gates: s.gates };
  }
  function roundTo500(v) { return Math.round(v / 500) * 500; }
  function solveFinance(payment, aprPct, downPayment, taxRate) {
    let best = null;
    TERM_BANDS.forEach(band => { const min = band[0], max = band[1], n = band[2]; const rate = aprPct / 100 / 12; const principal = rate > 0 ? payment * (1 - Math.pow(1 + rate, -n)) / rate : payment * n; if (principal >= min && principal < max) { if (best === null || principal > best.p) best = { p: principal, n }; } });
    if (best === null) return null;
    return { ceiling: roundTo500((best.p + downPayment) / (1 + taxRate)), termMonths: best.n, principal: Math.round(best.p) };
  }
  function solveFinanceCeiling(opts) {
    const payment = Number(opts.monthlyPayment) || 0, down = Number(opts.downPayment) || 0;
    const apr = APR_BY_TIER[opts.creditTier] != null ? APR_BY_TIER[opts.creditTier] : APR_BY_TIER.good;
    const taxRate = opts.taxRate != null ? opts.taxRate : FALLBACK_TAX;
    if (payment <= 0) return { valid: false, message: 'Enter a monthly payment to estimate a buying range.' };
    const r = solveFinance(payment, apr, down, taxRate);
    if (!r) return { valid: false, apr, taxRate, message: 'That payment is too low to finance an RV in our term bands. Budget will not be applied as a filter.' };
    return { valid: r.ceiling > 0, apr, termMonths: r.termMonths, principal: r.principal, downPayment: down, taxRate, taxIsFallback: opts.taxRate == null, ceiling: r.ceiling,
      message: opts.taxRate == null ? 'Estimated using 6% tax until a store is selected.' : null };
  }
  function cashCeiling(maxSpend) { const v = Number(maxSpend); return v > 0 ? { valid: true, ceiling: roundTo500(v) } : { valid: false, message: 'Enter a maximum spend.' }; }
  function money(v) { return v == null ? null : '$' + Math.round(v).toLocaleString('en-US'); }

  return {
    QUESTIONNAIRE_VERSION, SCORING_VERSION, IDS, BUNK_IDS, SLIDE_IDS, TOY_BED_IDS,
    MOTORHOME_CLASSES, TOWABLE_CLASSES, TOY_CLASSES,
    newSession, candidates, previewGate, previewBoost, rankResults, scoreUnit, evaluateUnit, mmGates, mmState,
    roundTo500, solveFinanceCeiling, cashCeiling, money,
  };
});


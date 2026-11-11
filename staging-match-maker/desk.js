/* Match Maker · Matches screen — "Bish's RV Comparison Desk v4 Nexus" (Rev 19).
   Markup and tokens follow the v4 design file 1:1. Every control starts from the shopper's discovery answers (S / session)
   and re-ranks the real inventory snapshot through the match-maker engine (E.rankResults). Filters never write back to S.
   Loaded as a classic script; reads the page's globals (S, E, UNITS, snap, session, ...) lazily, at call time. */
(function(){
'use strict';
const D={ sig:null, slotsInit:false, shown:25, why:null, detail:null, checked:[], slots:[null,null,null,null], dragOver:-1, sent:false,
  tab:'all', view:'list', sortKey:'score', sortDir:'desc', search:'', leftOpen:null, barHidden:false, canL:false, canR:false, flash:null, towEditing:false, towDraft:'', t0:Date.now() };
let R=null, _lastY=0, _timer=0, _fl=0, _drag=null;
const SLOT_LABELS=['1 · Slot 1','2 · Slot 2','3 · Target unit','4 · Great idea'];
const PRIORITY_LABEL={value:'Price / Value',space:'Room / slide-outs',simple:'Simple setup',lightweight:'Light weight',compact:'Compact length',sleepFlex:'Flexible sleeping'};
const TIER_FULL={veryGood:'Very good',good:'Good',fair:'Fair',poor:'Poor'};
const I_={ dollar:'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  car:'M5 17H3v-5l2-5h9l4 5h3v5h-2 M7 17h8 M5 17a2 2 0 1 0 4 0 M15 17a2 2 0 1 0 4 0',
  swap:'m16 3 4 4-4 4 M20 7H4 m8 14-4-4 4-4 M4 17h16',
  check:'M20 6 9 17l-5-5', alert:'m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3 M12 9v4 M12 17h.01',
  list:'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01', grid:'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  rv:'M18 19V9a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v8a2 2 0 0 0 2 2h2 M2 9h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2 M22 17v1a1 1 0 0 1-1 1H10v-9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9' };
const svg=(d,sz,sw,st)=>`<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw||1.5}" stroke-linecap="round" stroke-linejoin="round"${st?` style="${st}"`:''}><path d="${d}"></path></svg>`;
const q=s=>document.querySelector(s);
const num=v=>Number(v)||0;
const cdEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const mny=v=>E.money(v);
const ft=u=>u.lengthIn?Math.round(u.lengthIn/12):null;

/* ---------- ranges and starting state, both read from the shopper's answers ---------- */
function pathClasses(){ return S.path==='MOTOR'?E.MOTORHOME_CLASSES.filter(c=>present.has(c)):S.path==='TOW'?E.TOWABLE_CLASSES.filter(c=>present.has(c)):E.TOWABLE_CLASSES.concat(E.MOTORHOME_CLASSES).filter(c=>present.has(c)); }
function ranges(){
  const cl=new Set(pathClasses()); const us=UNITS.filter(u=>cl.has(u.class));
  const L=us.map(ft).filter(v=>v!=null), W=us.map(u=>u.gvwr).filter(v=>v>0), SL=us.map(u=>u.sleeps).filter(v=>v>0), G=us.map(u=>u.garageLength).filter(v=>v>0);
  const lo=a=>a.length?Math.min.apply(null,a):0, hi=a=>a.length?Math.max.apply(null,a):0;
  return { lenMin:Math.max(10,Math.floor(lo(L))), lenMax:Math.ceil(hi(L)||40), towMin:Math.floor(lo(W)/250)*250||6000, towMax:Math.ceil(hi(W)/250)*250||13000,
    sleepMin:Math.min(2,lo(SL)||2), sleepMax:Math.min(12,Math.max(hi(SL),num(S.adults)+num(S.children),4)), garMin:Math.floor(lo(G)/12)||6, garMax:Math.ceil(hi(G)/12)||16 };
}
function answerSig(){ return JSON.stringify([S.path,S.type,S.motor,S.budget,S.maxSpend,S.payment,S.down,S.tier,S.store,S.tow,S.towRating,S.towMode,S.adults,S.children,S.childSetup,S.bedroom,S.lengthMode,S.lengthFt,S.garageFt,[...S.bath],[...S.bathMust],[...S.inside],[...S.insideMust],[...S.outside],[...S.outsideMust],S.size,S.build,S.buildMust,S.pets,S.target,S.loc]); }
function seed(){
  const g=session.gates, Rg=ranges(); const isMotor=S.path==='MOTOR';
  const slides=S.size==='space'?'Yes':S.size==='simple'?'No':null;                       /* slide-outs question */
  const bunks=(!isMotor&&S.children>0&&S.childSetup==='must')?'Yes':null;               /* "bunks required" is a gate; "prefer" only ranks */
  const bedroom=S.bedroom==='must'?'Private':S.bedroom==='space'?'Open':null;           /* "prefer a private bedroom" is flexible, so it only ranks */
  const build=S.build==='laminate'?'Fiber':S.build==='value'?'Alum':null;
  Object.assign(D,{ sig:answerSig(), R:Rg,
    method:S.budget==='cash'?'Cash':'Finance', payment:num(S.payment), down:num(S.down), cash:num(S.maxSpend), tier:S.tier||null,
    case:{ payment:num(S.payment), down:num(S.down), cash:num(S.maxSpend) },
    unitType:isMotor?(S.motor&&S.motor!=='ANY'?S.motor:'ALL'):(S.type||'ALL'),
    lenMax:g.lengthMaxFt?Math.min(Rg.lenMax,Math.max(Rg.lenMin,g.lengthMaxFt)):Rg.lenMax,
    towMax:g.gvwrMax?Math.min(Rg.towMax,Math.max(Rg.towMin,Math.floor(g.gvwrMax/250)*250)):Rg.towMax,
    towRating:(S.tow==='yes'&&num(S.towRating)>0)?num(S.towRating):null,
    sleepMin:g.sleepsMin?Math.min(Rg.sleepMax,Math.max(Rg.sleepMin,g.sleepsMin)):Rg.sleepMin,
    garageMin:num(S.garageFt)>0?Math.min(Rg.garMax,Math.max(Rg.garMin,num(S.garageFt))):Rg.garMin,
    toggle:{ bunks, slides, bedroom, build },
    location:S.loc||'', conds:{ lot:true, ex:true },
    shown:25, why:null, detail:null, checked:[], slots:[null,null,null,null], slotsInit:false, sent:false, tab:'all', search:'', towEditing:false, t0:Date.now(), relaxed:[] });
  /* a preference that was turned into a starting toggle must not leave the shopper on an empty list: relax those (never a requirement) until something matches */
  const soft=[['slides','Slides',true],['build','Build',!S.buildMust],['bedroom','Bedroom',S.bedroom!=='must']];
  for(const [k,l,isSoft] of soft){ if(!D.toggle[k]||!isSoft) continue; if(compute().all.length) break; D.toggle[k]=null; D.relaxed.push(l); }
}
const isHauler=()=>D.unitType==='TTTH'||D.unitType==='FWTH';
function classCodes(){ return D.unitType==='ALL'?pathClasses():[D.unitType]; }

/* ---------- ranking ---------- */
function deskSession(){
  const sess=JSON.parse(JSON.stringify(session)), g=sess.gates, Rg=D.R;
  g.classes=classCodes(); g.priceMax=null; g.gvwrMax=null; g.lengthMaxFt=null; g.sleepsMin=null; g.sidewall=null; g.garageMinFt=null;
  /* the four toggles and the sliders replace these answer-derived gates; every other must-have stays an engine gate */
  g.requiredAnyOf=(g.requiredAnyOf||[]).filter(l=>!(l.length===E.BUNK_IDS.length&&l.every(id=>E.BUNK_IDS.indexOf(id)!==-1)));
  if(S.bedroom==='must') g.requiredChars=(g.requiredChars||[]).filter(id=>id!==E.IDS.PRIVATE_MASTER);
  D.fin=null;
  if(D.method==='Cash'){ const r=E.cashCeiling(D.cash); if(r.valid) g.priceMax=r.ceiling; }
  else if(D.payment>0){ const tax=S.store&&snap.lookups.rooftops[S.store]?snap.lookups.rooftops[S.store].salesTaxRate:null;
    const r=E.solveFinanceCeiling(Object.assign({monthlyPayment:D.payment,downPayment:D.down,creditTier:D.tier||'good'},tax!=null?{taxRate:tax}:{})); D.fin=r; if(r.valid) g.priceMax=r.ceiling; }
  if(S.path!=='MOTOR'&&D.towMax<Rg.towMax) g.gvwrMax=D.towMax;
  if(D.lenMax<Rg.lenMax) g.lengthMaxFt=D.lenMax;
  if(D.sleepMin>Rg.sleepMin) g.sleepsMin=D.sleepMin;
  if(isHauler()&&D.garageMin>Rg.garMin) g.garageMinFt=D.garageMin;
  const t=D.toggle;
  if(t.bunks==='Yes') g.requiredAnyOf.push(E.BUNK_IDS.slice());
  if(t.bedroom==='Private'&&g.requiredChars.indexOf(E.IDS.PRIVATE_MASTER)===-1) g.requiredChars.push(E.IDS.PRIVATE_MASTER);
  if(t.build) g.sidewall=t.build==='Fiber'?'LAMINATE':'STT';
  return sess;
}
const chars=u=>u.characteristicTypeIds||[];
const hasAny=(u,ids)=>chars(u).some(id=>ids.indexOf(id)!==-1);
function togglePass(x){            /* the "No" / "Open" sides have no engine gate, so they filter here; unknown data never passes a "No" */
  const u=x.unit, t=D.toggle;
  if(t.bunks==='No'&&!(chars(u).length&&!hasAny(u,E.BUNK_IDS))) return false;
  if(t.slides==='Yes'&&!(u.slides>0)) return false;
  if(t.slides==='No'&&u.slides!==0) return false;
  if(t.bedroom==='Open'&&!(chars(u).length&&chars(u).indexOf(E.IDS.PRIVATE_MASTER)===-1)) return false;
  return true;
}
function monthly(price){ const f=D.fin; if(!f||!f.valid||!(price>0)) return null; const r=f.apr/100/12, n=f.termMonths, P=price*(1+f.taxRate)-D.down;
  if(P<=0) return 0; return Math.round(r>0?P*r/(1-Math.pow(1+r,-n)):P/n); }
function money(u){
  if(!(u.price>0)) return { text:'Price pending', delta:'', fits:null, val:Infinity };
  if(D.method==='Cash'){ const diff=D.cash-u.price, ok=diff>=0; return { text:mny(u.price), delta:(ok?'−':'+')+mny(Math.abs(diff)), fits:ok, val:u.price }; }
  const p=monthly(u.price); if(p==null) return { text:'—', delta:'', fits:null, val:u.price };
  const fits=p<=D.payment; return { text:fits?'$'+p.toLocaleString():'N/A', pmt:p, delta:fits?(p<D.payment?'−$'+(D.payment-p):'$0'):'−'+mny(Math.max(0,u.price-D.fin.ceiling)), fits, val:p };
}
function compute(){
  const sess=deskSession(); const cond=D.conds; const q_=D.search.trim().toLowerCase();
  const units=UNITS.filter(u=>(!D.location||u.location===D.location)&&(u.isLStock?cond.ex:cond.lot));
  const r=E.rankResults(units,sess); let list=r.all.filter(togglePass);
  if(q_) list=list.filter(x=>`${x.unit.year} ${x.unit.manufacturer} ${x.unit.make} ${x.unit.model} ${x.unit.stocknumber}`.toLowerCase().includes(q_));
  const byStock={}; r.all.forEach(x=>byStock[x.unit.stocknumber]=x);
  const dir=D.sortDir==='asc'?1:-1;
  if(D.sortKey==='price') list=list.slice().sort((a,b)=>dir*((a.unit.price>0?a.unit.price:Infinity)-(b.unit.price>0?b.unit.price:Infinity)));
  else if(D.sortKey==='payment'){ const m=new Map(list.map(x=>[x,money(x.unit)])); const na=x=>m.get(x).fits===false?1:0;
    list=list.slice().sort((a,b)=>{ const d=na(a)-na(b); if(d) return D.sortDir==='na'?-d:d; return (D.sortDir==='asc'?1:-1)*(m.get(a).val-m.get(b).val); }); }
  else if(D.sortKey==='score'&&D.sortDir==='asc') list=list.slice().reverse();
  /* default = engine order: rank group first (confirmed, floorplan examples, quick check), then score */
  return { sess, all:list, byStock, ranked:r.all.length };
}
function seedSlots(){
  if(D.slotsInit||!R.all.length) return; D.slotsInit=true;
  const tgt=S.target&&R.byStock[String(S.target)]?String(S.target):null, slots=[null,null,null,null];
  if(tgt) slots[2]=tgt;
  const pick=R.all.slice(0,4).map(x=>x.unit.stocknumber).filter(sn=>sn!==tgt);       /* slot 4 ("Great idea") stays open for the shopper */
  [0,1,2].forEach(i=>{ if(slots[i]==null&&pick.length) slots[i]=pick.shift(); });
  D.slots=slots; D.checked=slots.filter(Boolean);
}

/* ---------- copy built from the answers ---------- */
const typeLabel=()=>{ if(D.unitType==='ALL') return S.path==='MOTOR'?'motorhome':'towable'; const t=(S.path==='MOTOR'?MOTOR_TILES:TOWABLE_TILES).find(t=>t[0]===D.unitType); return t?t[1]:'camper'; };
const unitTypeOptions=()=>[['ALL','All types']].concat((S.path==='MOTOR'?MOTOR_TILES:TOWABLE_TILES).map(t=>[t[0],t[1]]));
const charName=id=>{ const c=CT[id]; return c?(c.name||c.description||String(id)):String(id); };
function requirements(){
  const g=session.gates, out=[]; const tile=(S.path==='MOTOR'?MOTOR_TILES:TOWABLE_TILES).find(t=>t[0]===(S.path==='MOTOR'?S.motor:S.type));
  if(tile) out.push('Type · '+tile[1]);
  if(g.sleepsMin) out.push('Sleeps at least '+g.sleepsMin+' ('+S.adults+' adult'+(S.adults===1?'':'s')+(S.children?' + '+S.children+' kid/guest'+(S.children===1?'':'s'):'')+')');
  if(g.lengthMaxFt) out.push('Length · up to '+g.lengthMaxFt+' ft');
  if(g.gvwrMax) out.push('Weight · up to '+n(g.gvwrMax)+' lbs for the tow vehicle');
  if(g.priceMax) out.push('Price · up to '+mny(g.priceMax)+(S.budget==='finance'?' (from the payment)':''));
  (g.requiredChars||[]).forEach(id=>out.push(charName(id)+' · required'));
  (g.requiredAnyOf||[]).forEach(l=>out.push((l.length===E.BUNK_IDS.length?'Dedicated bunks':l.map(charName).join(' / '))+' · required'));
  if(g.sidewall) out.push((g.sidewall==='LAMINATE'?'Laminate / fiberglass':'Stick-and-tin / aluminum')+' construction only');
  if(num(S.garageFt)>0&&TOY.includes(S.type)) out.push('Garage · at least '+S.garageFt+' ft');
  return out;
}
function prefsList(){ return session.prefs.map(p=>p.label+(p.strength==='strongly'?' (strong)':p.strength==='flexible'?' (flexible)':p.strength==='nice'?' (nice to have)':'')).concat(session.avoids.map(a=>'Avoid · '+a.label.replace(/^Avoid\s+/i,''))); }
function whoName(){ try{ const l=leadGet(); return l&&l.name?String(l.name).trim():''; }catch(e){ return ''; } }
function brief(){
  const Rg=D.R, who=whoName(); let s=who?`${cdEsc(who)} needs a`:'You need a'; s+=` <b>${cdEsc(typeLabel())}</b> that sleeps <b>${D.sleepMin}+</b>`;
  s+=D.lenMax<Rg.lenMax?`, <b>up to ${D.lenMax} ft</b>`:S.lengthMode==='soft'?', <b>shorter is better</b>':'';
  if(S.path!=='MOTOR'&&D.towMax<Rg.towMax) s+=`, under <b>${n(D.towMax)} lbs</b> for the tow rig`;
  if(D.method==='Cash') s+=D.cash>0?`, paying <b>cash, up to ${mny(D.cash)}</b>`:', paying <b>cash</b>';
  else if(D.payment>0) s+=`, around <b>${mny(D.payment)}/mo</b> with <b>${mny(D.down)}</b> down`;
  s+='.'; const pri=Object.keys(session.numericPriorities||{}).map(k=>PRIORITY_LABEL[k]).filter(Boolean).slice(0,2);
  if(pri.length) s+=` <b>${cdEsc(pri.join(' / '))}</b> matters most.`;
  if(S.loc) s+=` Shopping at <b>${cdEsc(storeName(S.loc))}</b>.`;
  if(D.relaxed&&D.relaxed.length) s+=` <i>Nothing on the lot matched every starting toggle, so ${cdEsc(D.relaxed.join(' and '))} ${D.relaxed.length>1?'were':'was'} left on Any.</i>`;
  return s;
}

/* ---------- row model ---------- */
const nameOf=u=>`${u.year} ${u.manufacturer} ${u.make} ${u.model}`;
function reasons(x){
  const u=x.unit, m=money(u), out=[]; const ok='var(--semantic-success-dark)', bad='var(--semantic-danger-dark)', ink='var(--text-light-primary)';
  if(m.fits!=null) out.push([D.method==='Cash'?(m.fits?`Price within ${mny(D.cash)} cash`:`Price over ${mny(D.cash)} cash`):(m.fits?`Payment $${m.pmt} within $${D.payment}`:`Payment $${m.pmt} over $${D.payment}`),m.fits?ok:bad]);
  out.push([clsName(u),ink]);
  (x.score.hits||[]).forEach(t=>out.push(['✓ '+t,ok]));
  (x.score.misses||[]).forEach(t=>out.push(['Missed · '+t,bad]));
  (x.score.avoided||[]).forEach(t=>out.push(['Avoid · '+t,bad]));
  ((x.score.gateResult&&x.score.gateResult.unknown)||[]).forEach(k=>out.push(['Verify · '+(UNKNOWN_LABEL[k]||k),'var(--semantic-warning-dark)']));
  out.push([u.slides==null?'Slides not listed':u.slides?`${u.slides} slide-out${u.slides>1?'s':''}`:'No slide-outs',ink]);
  out.push([`${ft(u)?ft(u)+' ft':'length ?'} · ${u.gvwr?n(u.gvwr)+' lbs GVWR':'weight ?'} · sleeps ${u.sleeps==null?'?':u.sleeps}`,'var(--text-light-secondary)']);
  if(u.isLStock) out.push(['Floorplan example',ink]);
  if(S.path==='TOW'&&!D.towRating) out.push(['Tow not verified',bad]);
  return out;
}
function tagsOf(u){ const t=[clsName(u)]; t.push(u.sidewallConstruction==='LAMINATE'?'Fiberglass':u.sidewallConstruction==='STT'?'Aluminum':'Build ?'); t.push(u.slides==null?'Slides ?':u.slides?u.slides+' slide'+(u.slides>1?'s':''):'No slides'); if(hasAny(u,E.BUNK_IDS)) t.push('Bunks'); return t; }

/* ---------- markup ---------- */
const lbl='font-family:var(--font-ui);font-weight:600;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--accent-gold-lo);';
const btnGold='border:1px solid var(--border-gold-hi);background:transparent;color:var(--accent-gold-lo);font-family:var(--font-ui);font-weight:600;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;cursor:pointer;transition:background var(--duration-fast) var(--ease-standard);';
const tile=(l,v)=>`<div style="flex:1;min-width:0;height:58px;border-radius:var(--radius-md);box-shadow:inset 0 0 0 1px var(--border-light);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--sp-1);padding:0 var(--sp-1);"><span style="font-family:var(--font-ui);font-weight:700;font-size:11px;letter-spacing:0.55px;color:var(--text-light-secondary);text-transform:uppercase;white-space:nowrap;">${l}</span><span title="${cdEsc(v)}" style="max-width:100%;font-family:var(--font-ui);font-weight:700;font-size:12px;color:var(--text-light-primary);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cdEsc(v)}</span></div>`;
const crow=(d,tiles)=>`<div style="height:70px;border-radius:var(--radius-lg);background:var(--brand-white);box-shadow:inset 0 0 0 1px var(--border-light);display:flex;gap:var(--sp-3);padding:var(--sp-1) var(--sp-4);align-items:center;box-sizing:border-box;"><span style="width:44px;height:44px;border-radius:var(--radius-md);background:var(--surface-light-inset);flex-shrink:0;display:flex;align-items:center;justify-content:center;">${svg(d,18,1.5,'color:var(--accent-gold-lo);')}</span>${tiles.map(t=>tile(t[0],t[1])).join('')}</div>`;
const pill=(on,label,act,extra)=>`<button type="button" role="radio" aria-checked="${on}" onclick="${act}" style="${extra}background:${on?'var(--text-light-primary)':'transparent'};color:${on?'var(--brand-white)':'var(--text-light-secondary)'};box-shadow:${on?'var(--shadow-sm)':'none'};border:none;cursor:pointer;border-radius:var(--radius-full);font-family:var(--font-body);font-size:14px;font-weight:${on?600:400};white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:var(--sp-1);transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast);" ${on?'':'class="cd-hov-ink"'}>${on?svg(CHK,14,3):''}${label}</button>`;
const CHK=I_.check;

function leftPanel(){
  const open=D.leftOpen; const slow=D.method==='Cash';
  const money_=crow(I_.dollar, slow?[['Method','Cash'],['Budget',D.case.cash>0?mny(D.case.cash):'—'],['Credit','N/A']]:[['Payment',D.case.payment>0?mny(D.case.payment):'—'],['Down',mny(D.case.down)],['Credit',TIER_SHORT[D.tier]||'—']]);
  const people=crow(I_.users,[['Adults',S.adults],['Kid/Guest',S.children],['Pets',S.pets]]);
  const methodBtns=['Finance','Cash'].map(m=>{ const on=D.method===m; return `<button type="button" role="radio" aria-checked="${on}" onclick="Desk.set({method:'${m}'})" style="min-height:36px;min-width:72px;padding:0 var(--sp-3);border-radius:var(--radius-full);border:none;background:${on?'var(--surface-light-card)':'transparent'};color:${on?'var(--text-light-primary)':'var(--text-light-secondary)'};box-shadow:${on?'var(--shadow-sm)':'none'};cursor:pointer;font-family:var(--font-body);font-size:14px;font-weight:${on?600:400};">${m}</button>`; }).join('');
  const paying=`<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--sp-3);"><span style="${lbl}">▸ Paying with</span><div role="radiogroup" aria-label="Customer payment method" style="display:flex;padding:3px;gap:2px;border-radius:var(--radius-full);background:var(--surface-light-inset);box-shadow:inset 0 0 0 1.5px var(--border-input-light);">${methodBtns}</div></div>`;
  let towRow='', tow='';
  if(S.path==='TOW'){
    const veh=[S.towYr,S.towMk,S.towMd].filter(Boolean);
    if(S.tow==='yes'||veh.length) towRow=crow(I_.car,[['Year',S.towYr||'—'],['Make',S.towMk||'—'],['Model',S.towMd||'—']]);
    const dang='background:var(--semantic-danger-light);border:1px solid var(--semantic-danger-dark);border-left-width:3px;border-radius:var(--radius-sm);padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);';
    if(D.towRating&&!D.towEditing) tow=`<div style="background:var(--semantic-success-light);border:1px solid var(--semantic-success-dark);border-left-width:3px;border-radius:var(--radius-sm);padding:var(--sp-3) var(--sp-4);display:flex;align-items:center;gap:var(--sp-3);">${svg(I_.check,18,2,'color:var(--semantic-success-dark);')}<span style="flex:1;font-family:var(--font-ui);font-weight:700;font-size:14px;color:var(--semantic-success-dark);">Tow rating · <span style="font-family:var(--font-mono);font-weight:400;">${n(D.towRating)}</span> lbs${S.tow==='yes'&&S.towEn?` · ${cdEsc(S.towEn)}`:''}</span><button type="button" onclick="Desk.editTow()" class="cd-hov-gold" style="height:32px;padding:0 var(--sp-3);border-radius:var(--radius-md);border:none;background:transparent;color:var(--accent-gold-lo);font-family:var(--font-ui);font-weight:700;font-size:12px;text-transform:uppercase;cursor:pointer;">Edit</button></div>`;
    else if(S.tow==='delivery'&&!D.towEditing) tow=`<div style="${dang.replace('--semantic-danger-light','--semantic-info-light').replace(/--semantic-danger-dark/g,'--semantic-info-dark')}"><div style="display:flex;align-items:center;gap:var(--sp-2);">${svg(I_.alert,20,1.5,'color:var(--semantic-info-dark);')}<span style="font-family:var(--font-ui);font-weight:700;font-size:14px;color:var(--semantic-info-dark);">Delivery · no tow limit</span></div><span style="font-family:var(--font-body);font-size:14px;line-height:1.45;">Delivery is arranged with the store, so no weight limit was applied.</span><button type="button" onclick="Desk.editTow()" class="cd-hov-gold" style="white-space:nowrap;align-self:flex-start;height:36px;padding:0 var(--sp-4);border-radius:var(--radius-md);${btnGold}background:var(--brand-white);">Review tow data</button></div>`;
    else tow=`<div style="${dang}"><div style="display:flex;align-items:center;gap:var(--sp-2);">${svg(I_.alert,20,1.5,'color:var(--semantic-danger-dark);')}<span style="font-family:var(--font-ui);font-weight:700;font-size:14px;color:var(--semantic-danger-dark);">Tow vehicle / rating not supplied</span></div><span style="font-family:var(--font-body);font-size:14px;line-height:1.45;">Tow assessment not established. No unit is tow-approved; dry weight is not towing approval.</span>${D.towEditing?`<div style="display:flex;gap:var(--sp-2);"><input type="number" data-key="tow" value="${cdEsc(D.towDraft)}" onchange="Desk.towDraft(this.value)" placeholder="Rated lbs" aria-label="Tow rating in pounds" style="flex:1;min-width:0;height:40px;border-radius:var(--radius-md);border:1px solid var(--border-light-mid);padding:0 var(--sp-3);font-family:var(--font-mono);font-size:13px;"><button type="button" onclick="Desk.saveTow()" class="cd-hov-gold" style="height:40px;padding:0 var(--sp-4);border-radius:var(--radius-md);${btnGold}">Save</button></div>`:`<button type="button" onclick="Desk.editTow()" class="cd-hov-gold" style="white-space:nowrap;align-self:flex-start;height:36px;padding:0 var(--sp-4);border-radius:var(--radius-md);${btnGold}background:var(--brand-white);">Review tow data</button>`}</div>`;
    if(D.towRating&&D.towEditing) tow=`<div style="${dang}"><span style="${lbl}">▸ Tow rating</span><div style="display:flex;gap:var(--sp-2);"><input type="number" data-key="tow" value="${cdEsc(D.towDraft)}" onchange="Desk.towDraft(this.value)" placeholder="Rated lbs" aria-label="Tow rating in pounds" style="flex:1;min-width:0;height:40px;border-radius:var(--radius-md);border:1px solid var(--border-light-mid);padding:0 var(--sp-3);font-family:var(--font-mono);font-size:13px;"><button type="button" onclick="Desk.saveTow()" class="cd-hov-gold" style="height:40px;padding:0 var(--sp-4);border-radius:var(--radius-md);${btnGold}">Save</button></div></div>`;
  }
  let trade='';
  if(typeof hasTrade==='function'&&hasTrade()&&S.trade){ const t=S.trade; const mk=[t.mfr,t.make].filter(Boolean).join(' ')||t.other||'—';
    trade=crow(I_.swap,[['Year',t.year||'—'],['Make',mk],['Model',t.model||'—']])+((t.changes&&t.changes.size)?`<span style="font-family:var(--font-body);font-size:13px;color:var(--text-light-secondary);padding:0 var(--sp-1);">Trade-in notes · ${cdEsc([...t.changes].join(', '))}</span>`:''); }
  const list=(title,items,empty)=>`<div style="border-radius:var(--radius-md);box-shadow:inset 0 0 0 1px var(--border-light);padding:var(--sp-3) 0;display:flex;flex-direction:column;gap:var(--sp-1);"><span style="${lbl}line-height:16px;padding:0 var(--sp-3);">${title}</span>${items.length?items.map(p=>`<span style="font-family:var(--font-body);font-size:14px;line-height:1.6;color:var(--text-light-primary);padding:0 var(--sp-3);">${cdEsc(p)}</span>`).join(''):`<span style="font-family:var(--font-body);font-size:14px;line-height:1.6;color:var(--text-light-tertiary);padding:0 var(--sp-3);">${empty}</span>`}</div>`;
  const reqs=requirements(), prefs=prefsList();
  const body=open?`<div style="display:flex;flex-direction:column;gap:var(--sp-4);">${money_}${people}${paying}${towRow}${tow}${trade}${list('▸ Requirements',reqs,'No hard requirements set.')}${list('▸ Preferences · ranked',prefs,'No preferences set — ranked by fit.')}<button type="button" onclick="go(IDX('summary'))" class="cd-hov-gold" style="height:44px;border-radius:var(--radius-md);${btnGold}">Edit answers</button></div>`:'';
  const who=whoName();
  return `<div class="cd-left" style="display:${open?'flex':'none'};width:320px;flex-shrink:0;background:var(--brand-white);border-radius:var(--radius-md);box-shadow:inset 0 0 0 1px var(--border-light);padding:var(--sp-6) var(--sp-4) var(--sp-4);box-sizing:border-box;flex-direction:column;gap:var(--sp-6);transition:width var(--duration-normal) var(--ease-standard);">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--sp-2);">${open?`<div style="display:flex;flex-direction:column;min-width:0;"><span style="${lbl}line-height:16px;white-space:nowrap;">▸ Customer situation</span><span style="font-family:var(--font-display);font-size:24px;line-height:32px;letter-spacing:0.75px;color:var(--text-light-primary);margin-top:var(--sp-1);">${cdEsc(who||'Your situation')}</span></div>`:''}
      <button type="button" onclick="Desk.set({leftOpen:${!open}})" aria-label="${open?'Collapse side panel':'Expand side panel'}" style="width:32px;height:32px;border-radius:var(--radius-lg);background:var(--brand-white);border:1px solid var(--border-light-mid);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${svg('m11 17-5-5 5-5 M18 17l-5-5 5-5',16,1.5,'color:var(--text-light-secondary);')}</button></div>
    ${body}</div>`;
}
function stepper(key,label,step){
  const v=D[key], flash=D.flash===key;
  return `<div style="flex-shrink:0;position:relative;"><label style="display:block;font-family:var(--font-ui);font-size:12px;font-weight:500;letter-spacing:0.5px;color:var(--text-light-secondary);margin-bottom:var(--sp-1);white-space:nowrap;">${label}</label>
    <div style="display:flex;align-items:stretch;height:44px;border:1px solid var(--border-input-light);border-radius:var(--radius-md);background:var(--surface-light-card);overflow:hidden;box-sizing:border-box;">
      <button type="button" onclick="Desk.step('${key}',-${step})" aria-label="Decrease ${label} by $${step}" class="cd-hov-inset" style="width:36px;height:44px;flex-shrink:0;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-light-primary);">${svg('M5 12h14',16,2)}</button>
      <span style="display:flex;align-items:center;gap:2px;border-left:1px solid var(--border-light);border-right:1px solid var(--border-light);padding:0 var(--sp-2);"><span style="font-family:var(--font-mono);font-size:13px;color:var(--text-light-tertiary);">$</span><input type="text" inputmode="numeric" data-key="b-${key}" value="${v}" onchange="Desk.typed('${key}',this.value)" aria-label="${label}" style="width:52px;border:none;outline:none;background:transparent;font-family:var(--font-mono);font-size:14px;color:var(--text-light-primary);text-align:center;padding:0;"></span>
      <button type="button" onclick="Desk.step('${key}',${step})" aria-label="Increase ${label} by $${step}" class="cd-hov-inset" style="width:36px;height:44px;flex-shrink:0;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-light-primary);">${svg('M12 5v14 M5 12h14',16,2)}</button></div>
    <span role="status" aria-live="polite" style="position:absolute;left:0;top:calc(100% + 6px);z-index:5;white-space:nowrap;border-radius:var(--radius-md);background:var(--text-light-primary);color:var(--brand-white);padding:var(--sp-1) var(--sp-2);font-family:var(--font-ui);font-weight:600;font-size:12px;letter-spacing:0.5px;box-shadow:var(--shadow-md);pointer-events:none;opacity:${flash?1:0};transform:${flash?'translateY(0)':'translateY(-4px)'};transition:opacity var(--duration-normal) var(--ease-standard),transform var(--duration-normal) var(--ease-standard);">Case ${key==='payment'?'$'+D.case.payment:mny(D.case[key])}</span></div>`;
}
function slider(key,label,min,max,step,dir,fmt){
  const v=D[key], pct=((v-min)/(max-min))*100, idle=dir==='max'?v>=max:v<=min;
  const valueLabel=fmt(v), minLabel=fmt(min).replace('+',''), maxLabel=fmt(max);
  return `<div data-slider="${key}" style="flex:1 0 176px;min-width:176px;padding:0 var(--sp-2);box-sizing:border-box;display:flex;flex-direction:column;gap:var(--sp-2);">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-2);"><span style="font-family:var(--font-ui);font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent-gold-lo);white-space:nowrap;">${label}</span><span data-sl="sum" style="font-family:var(--font-ui);font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:var(--text-light-tertiary);white-space:nowrap;">${idle?'Any':dir==='max'?'Up to':'At least'}</span></div>
    <div style="position:relative;height:44px;display:flex;align-items:flex-end;"><span data-sl="val" style="position:absolute;top:0;left:calc(${pct}% + ${(10-pct*0.2).toFixed(1)}px);transform:translateX(-50%);border-radius:var(--radius-md);background:var(--text-light-primary);color:var(--brand-white);padding:2px 7px;font-family:var(--font-mono);font-size:11px;white-space:nowrap;pointer-events:none;">${valueLabel}</span>
      <div style="position:absolute;left:0;right:0;bottom:8px;height:4px;border-radius:2px;background:var(--border-light-mid);"></div><div data-sl="fill" style="position:absolute;bottom:8px;height:4px;border-radius:2px;background:var(--text-light-primary);left:${dir==='max'?0:pct}%;width:${dir==='max'?pct:100-pct}%;"></div>
      <input class="cd-rng" type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-key="r-${key}" oninput="Desk.slideLive(this,'${key}')" onchange="Desk.slide('${key}',this.value)" data-dir="${dir}" aria-label="${label}" aria-valuetext="${valueLabel}"></div>
    <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;color:var(--text-light-tertiary);"><span>${minLabel}</span><span>${maxLabel}</span></div></div>`;
}
function filterBar(){
  const Rg=D.R; const t=D.toggle;
  const TOGS=[['bunks','Bunks',['Yes','No']],['slides','Slides',['Yes','No']],['bedroom','Bedroom',['Private','Open']],['build','Build',['Fiber','Alum']]];
  const sep='<span style="width:1px;align-self:stretch;background:var(--border-light);flex-shrink:0;"></span>';
  const tg=TOGS.map(([k,l,opts])=>`<div style="flex-shrink:0;"><div role="group" aria-label="${l}" style="display:flex;flex-direction:column;gap:8px;"><div style="font-family:var(--font-ui);font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent-gold-lo);">${l}</div><div role="radiogroup" aria-label="${l}" style="display:flex;padding:var(--sp-1);gap:2px;border-radius:var(--radius-full);background:var(--surface-light-inset);box-shadow:inset 0 0 0 1.5px var(--border-input-light);">${opts.map(o=>pill(t[k]===o,o,`Desk.tog('${k}','${o}')`,'min-height:38px;min-width:58px;padding:0 var(--sp-4);')).join('')}</div></div></div>`).join('');
  const sliders=[ slider('lenMax','Length (max)',Rg.lenMin,Rg.lenMax,1,'max',v=>v+' ft') ];
  if(S.path!=='MOTOR') sliders.push(slider('towMax','Tow limit',Rg.towMin,Rg.towMax,250,'max',v=>(+(v/1000).toFixed(2))+'K lbs'));
  sliders.push(slider('sleepMin','Sleeps',Rg.sleepMin,Rg.sleepMax,1,'min',v=>v+'+'));
  const garage=isHauler()?slider('garageMin','Garage length',Rg.garMin,Rg.garMax,1,'min',v=>v+' ft'):'';
  const sel=`<div style="flex-shrink:0;display:flex;flex-direction:column;gap:var(--sp-2);"><label for="cd-unit-type" style="font-family:var(--font-ui);font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent-gold-lo);white-space:nowrap;">Unit type</label><div style="position:relative;"><select id="cd-unit-type" class="cd-sel" onchange="Desk.set({unitType:this.value})" style="min-width:168px;height:44px;padding:0 var(--sp-10) 0 var(--sp-3);border-radius:var(--radius-md);border:1px solid var(--border-input-light);background:var(--surface-light-card);font-family:var(--font-body);font-size:14px;color:var(--text-light-primary);cursor:pointer;">${unitTypeOptions().map(([c,l])=>`<option value="${c}" ${D.unitType===c?'selected':''}>${cdEsc(l)}</option>`).join('')}</select>${svg('m6 9 6 6 6-6',16,1.5,'position:absolute;right:var(--sp-3);top:14px;pointer-events:none;color:var(--text-light-tertiary);')}</div></div>`;
  const arrow=(side,d,act)=>`<button type="button" onclick="Desk.scrollBar(${act})" aria-label="Scroll filters ${side}" style="position:absolute;${side}:-12px;top:50%;transform:translateY(-50%);z-index:3;width:32px;height:32px;border-radius:var(--radius-full);border:1px solid var(--border-light-mid);background:var(--surface-light-card);box-shadow:var(--shadow-md);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-light-primary);">${svg(d,16,1.5)}</button>`;
  const budget=D.method==='Cash'?stepper('cash','Sales price ($)',500):stepper('payment','Payment ($/mo)',50)+stepper('down','Down ($)',50);
  return `<div data-cd-bar="1" style="position:sticky;top:65px;z-index:30;transform:${D.barHidden?'translateY(calc(-100% - 8px))':'translateY(0)'};transition:transform var(--duration-normal) var(--ease-standard);background:var(--surface-light-page);margin-top:calc(-1 * var(--sp-6));padding-top:var(--sp-6);"><div style="position:relative;">${D.canL?arrow('left','m15 18-6-6 6-6',-320):''}${D.canR?arrow('right','m9 18 6-6-6-6',320):''}
    <div data-cd-scroll="1" onscroll="Desk.readBar(this)" style="background:var(--brand-white);border-radius:var(--radius-lg);box-shadow:inset 0 0 0 1px var(--border-light);padding:var(--sp-3) var(--sp-4);display:flex;gap:var(--sp-3);align-items:flex-end;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;">${budget}${sep}${tg}${sep}${sliders.join('')}${sep}${sel}${garage}</div></div></div>`;
}
function sortBtn(k,label){ const on=D.sortKey===k, arrow=on?(D.sortDir==='na'?'N/A':D.sortDir==='asc'?'▲':'▼'):'▼';
  return `<button type="button" onclick="Desk.sort('${k}')" aria-sort="${on?(D.sortDir==='asc'?'ascending':D.sortDir==='na'?'other':'descending'):'none'}" style="display:inline-flex;align-items:center;gap:var(--sp-1);border:none;background:none;padding:0;cursor:pointer;font:inherit;letter-spacing:inherit;text-transform:inherit;color:${on?'var(--text-light-primary)':'inherit'};white-space:nowrap;">${label}<span style="font-family:var(--font-mono);font-size:10px;opacity:${on?1:0.3};">${arrow}</span></button>`; }
function rowHtml(x){
  const u=x.unit, m=money(u), on=D.checked.indexOf(u.stocknumber)!==-1, why=D.why===u.stocknumber; const dc=m.fits===false?'var(--semantic-danger-dark)':'var(--semantic-success-dark)';
  const dots='<circle cx="9" cy="5" r="0.6"></circle><circle cx="9" cy="12" r="0.6"></circle><circle cx="9" cy="19" r="0.6"></circle><circle cx="15" cy="5" r="0.6"></circle><circle cx="15" cy="12" r="0.6"></circle><circle cx="15" cy="19" r="0.6"></circle>';
  const st=u.stocknumber, nm=cdEsc(nameOf(u)), mono='font-family:var(--font-mono);font-weight:400;font-size:12px;color:var(--text-light-primary);';
  if(D.view==='grid'){
    return `<div draggable="true" ondragstart="Desk.dragStart(event,'${st}')" style="border-radius:var(--radius-xl);background:var(--brand-white);box-shadow:inset 0 0 0 1px ${on?'var(--text-light-primary)':'var(--border-light-mid)'};overflow:hidden;display:flex;flex-direction:column;">
      <button type="button" onclick="Desk.open('${st}')" aria-label="Open unit details for ${nm}" class="cd-hov-bright" style="height:120px;border:none;padding:var(--sp-3) var(--sp-4);background:var(--accent-gold-lo);cursor:zoom-in;display:flex;flex-direction:column;justify-content:space-between;text-align:left;"><span style="display:flex;gap:var(--sp-2);align-items:center;"><span style="border-radius:var(--radius-full);background:var(--semantic-success-dark);color:var(--brand-white);padding:2px var(--sp-2);font-family:var(--font-display);font-size:16px;letter-spacing:0.5px;">${x.score.display}</span><span style="border-radius:var(--radius-full);background:var(--accent-gold);color:var(--brand-white);padding:2px var(--sp-2);font-family:var(--font-ui);font-weight:600;font-size:11px;letter-spacing:1px;text-transform:uppercase;">${u.isLStock?'Floorplan':'On the lot'}</span><span style="flex:1;"></span></span><span style="font-family:var(--font-display);font-size:32px;line-height:1;letter-spacing:0.5px;color:var(--brand-white);text-align:center;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cdEsc(String(u.manufacturer).toUpperCase())}</span></button>
      <div style="padding:var(--sp-3) var(--sp-4) var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-2);flex:1;"><div style="display:flex;gap:var(--sp-2);align-items:flex-start;"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;"><span style="font-family:var(--font-body);font-weight:600;font-size:15px;color:var(--text-light-primary);">${cdEsc(u.make+' '+u.model)}</span><span style="font-family:var(--font-ui);font-size:11px;letter-spacing:0.5px;text-transform:uppercase;color:var(--text-light-tertiary);">${u.year} ${cdEsc(String(u.manufacturer).toUpperCase())} · #${cdEsc(st)}</span></div>${chk(st,on,'margin:calc(-1 * var(--sp-3)) calc(-1 * var(--sp-3)) 0 0;')}</div>
      <div style="display:flex;gap:var(--sp-3);font-family:var(--font-mono);font-size:12px;color:var(--text-light-primary);flex-wrap:wrap;"><span style="color:var(--accent-gold-lo);">${u.price>0?mny(u.price):'Price pending'}</span><span>${u.gvwr?(u.gvwr/1000).toFixed(1)+'k lb':'? lb'}</span><span>${ft(u)?ft(u)+"'":'?'}</span></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-2);padding:var(--sp-2) var(--sp-3);border-radius:var(--radius-md);background:var(--surface-light-page);"><span style="font-family:var(--font-ui);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-light-secondary);">${moneyCol()}</span><span style="display:flex;gap:var(--sp-2);align-items:baseline;white-space:nowrap;"><span style="font-family:var(--font-mono);font-size:14px;color:var(--text-light-primary);">${m.text}</span><span style="font-family:var(--font-mono);font-size:11px;color:${dc};">${m.delta}</span></span></div>
      <div style="display:flex;gap:var(--sp-1);flex-wrap:wrap;">${tagsOf(u).map(t=>`<span style="border-radius:var(--radius-full);box-shadow:inset 0 0 0 1px var(--border-light-mid);padding:2px var(--sp-2);font-family:var(--font-ui);font-weight:600;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;color:var(--text-light-secondary);">${cdEsc(t)}</span>`).join('')}</div>
      ${whyBtn(st,why,true)}${why?whyChips(x):''}<div style="flex:1;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-light);padding-top:var(--sp-2);"><span title="Drag into a 3+1 slot" style="display:flex;gap:var(--sp-1);align-items:center;cursor:grab;font-family:var(--font-ui);font-size:11px;letter-spacing:0.5px;text-transform:uppercase;color:var(--text-light-tertiary);">${'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">'+dots+'</svg>'}Drag to 3+1</span><button type="button" onclick="Desk.open('${st}')" style="border:none;background:none;padding:0;min-height:32px;cursor:pointer;font-family:var(--font-ui);font-weight:700;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:var(--accent-gold-lo);">View details →</button></div></div></div>`;
  }
  return `<div draggable="true" ondragstart="Desk.dragStart(event,'${st}')" style="min-height:68px;display:flex;gap:var(--sp-3);padding:var(--sp-3);align-items:center;box-sizing:border-box;border-bottom:1px solid var(--border-light);background:${on?'var(--surface-light-page)':'var(--brand-white)'};transition:background var(--duration-fast) var(--ease-standard);">
    <div class="cd-thumb" style="width:120px;height:32px;display:flex;gap:var(--sp-2);align-items:center;flex-shrink:0;"><span title="Drag into a 3+1 slot" style="width:24px;height:24px;border-radius:var(--radius-sm);background:var(--surface-light-inset);display:flex;align-items:center;justify-content:center;cursor:grab;flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" style="color:var(--text-light-secondary);" stroke="currentColor">${dots}</svg></span><button type="button" onclick="Desk.open('${st}')" aria-label="Open unit details for ${nm}" class="cd-hov-thumb" style="width:56px;height:32px;border-radius:var(--radius-sm);border:none;padding:0;background:var(--surface-light-inset);box-shadow:inset 0 0 0 1px var(--border-light-mid);display:flex;align-items:center;justify-content:center;cursor:zoom-in;color:var(--text-light-tertiary);transition:box-shadow var(--duration-fast) var(--ease-standard);">${svg(I_.rv,22,1.5).replace('width="22" height="22"','width="22" height="16"')}</button></div>
    <span style="width:44px;height:44px;border-radius:var(--radius-md);background:var(--brand-white);box-shadow:inset 0 0 0 1px var(--border-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:var(--font-display);font-size:20px;letter-spacing:0.75px;color:var(--text-light-primary);">${x.score.display}</span>
    <div style="flex:1;min-width:140px;display:flex;flex-direction:column;gap:var(--sp-1);"><span style="font-family:var(--font-ui);font-weight:500;font-size:13px;line-height:17px;color:var(--text-light-primary);">${nm}</span>${whyBtn(st,why)}${why?whyChips(x):''}</div>
    <span class="cd-col-hide" style="width:96px;flex-shrink:0;${mono}">#${cdEsc(st)}</span><span class="cd-col-hide" style="width:96px;flex-shrink:0;${mono}">${u.price>0?mny(u.price):'Pending'}</span>
    <div style="width:115px;flex-shrink:0;display:flex;gap:var(--sp-3);align-items:center;"><span style="font-family:var(--font-mono);font-weight:400;font-size:14px;color:var(--text-light-primary);white-space:nowrap;">${m.text}</span><span style="font-family:var(--font-mono);font-weight:400;font-size:11px;color:${dc};white-space:nowrap;">${m.delta}</span></div>
    ${chk(st,on,'margin:calc(-1 * var(--sp-4)) calc(-1 * var(--sp-4)) calc(-1 * var(--sp-4)) 0;')}</div>`;
}
const moneyCol=()=>D.method==='Cash'?'Price / Difference':'Payment / Budget Δ';
function chk(st,on,mg){ return `<button type="button" onclick="Desk.check('${st}')" role="checkbox" aria-checked="${on}" aria-label="Select unit" style="width:44px;height:44px;${mg}border:none;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="width:16px;height:16px;border-radius:2px;background:${on?'var(--text-light-primary)':'var(--brand-white)'};box-shadow:${on?'none':'inset 0 0 0 1px var(--border-light-mid)'};display:flex;align-items:center;justify-content:center;">${svg(I_.check,12,3,`color:var(--brand-white);opacity:${on?1:0};`)}</span></button>`; }
function whyBtn(st,open,grid){ return `<button type="button" onclick="Desk.why('${st}')" aria-expanded="${open}" style="align-self:flex-start;display:flex;gap:var(--sp-1);align-items:center;border:none;background:none;padding:0;cursor:pointer;${grid?'min-height:28px;':''}">${svg('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01',14,1.5,'color:var(--accent-gold-lo);')}<span style="font-family:var(--font-ui);font-weight:700;font-size:11px;line-height:16.5px;letter-spacing:0.55px;color:var(--accent-gold-lo);text-transform:uppercase;white-space:nowrap;">Why it ranks${grid?'':' · #'+cdEsc(st)}</span></button>`; }
function whyChips(x){ return `<div style="display:flex;flex-wrap:wrap;gap:var(--sp-1);margin-top:2px;">${reasons(x).map(([t,c])=>`<span style="border-radius:var(--radius-sm);box-shadow:inset 0 0 0 1px var(--border-light);background:var(--brand-white);padding:2px var(--sp-2);font-family:var(--font-ui);font-weight:500;font-size:12px;color:${c};">${cdEsc(t)}</span>`).join('')}</div>`; }
function results(){
  const sel=D.tab==='selected'; const rows=sel?R.all.filter(x=>D.checked.indexOf(x.unit.stocknumber)!==-1):R.all; const shown=rows.slice(0,D.shown);
  const tabs=[['all','All results',R.all.length],['selected','Selected',D.checked.length]].map(([k,l,c])=>{ const on=D.tab===k; return `<button type="button" role="tab" aria-selected="${on}" onclick="Desk.set({tab:'${k}',shown:25})" style="height:40px;padding:0 var(--sp-4);border-radius:var(--radius-full);border:none;background:${on?'var(--text-light-primary)':'transparent'};color:${on?'var(--brand-white)':'var(--text-light-secondary)'};cursor:pointer;font-family:var(--font-ui);font-weight:700;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;white-space:nowrap;">${l} · <span style="font-family:var(--font-mono);font-weight:400;">${n(c)}</span></button>`; }).join('');
  const present_=[]; if(UNITS.some(u=>!u.isLStock)) present_.push(['lot','On the lot']); if(UNITS.some(u=>u.isLStock)) present_.push(['ex','Floorplan examples']);
  const conds=present_.map(([k,l])=>{ const on=D.conds[k]; return `<button type="button" onclick="Desk.cond('${k}')" aria-pressed="${on}" style="height:44px;padding:0 var(--sp-4);border:none;background:${on?'var(--brand-black)':'var(--brand-white)'};color:${on?'var(--brand-white)':'var(--text-light-secondary)'};cursor:pointer;font-family:var(--font-ui);font-weight:700;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">${l}</button>`; }).join('');
  const views=[['list','List',I_.list],['grid','Grid',I_.grid]].map(([k,l,d])=>{ const on=D.view===k; return `<button type="button" role="radio" aria-checked="${on}" aria-label="${l} view" title="${l} view" onclick="Desk.set({view:'${k}'})" style="width:40px;height:36px;border-radius:var(--radius-sm);border:none;background:${on?'var(--surface-light-card)':'transparent'};box-shadow:${on?'var(--shadow-sm)':'none'};color:${on?'var(--text-light-primary)':'var(--text-light-tertiary)'};cursor:pointer;display:flex;align-items:center;justify-content:center;">${svg(d,18,1.5)}</button>`; }).join('');
  const stores=Object.entries(snap.lookups.rooftops||{}).filter(([c,r])=>r.storeName&&UNITS.some(u=>u.location===c));
  const loc=`<select onchange="Desk.set({location:this.value})" aria-label="Location" style="height:44px;min-width:104px;border-radius:var(--radius-md);border:1px solid var(--border-light);background:var(--brand-white);padding:0 var(--sp-3);font-family:var(--font-body);font-size:14px;color:var(--text-light-primary);"><option value="">All locations</option>${stores.map(([c,r])=>`<option value="${cdEsc(c)}" ${D.location===c?'selected':''}>${cdEsc(r.storeName)}</option>`).join('')}</select>`;
  const head=`<div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3);flex-wrap:wrap;border-bottom:1px solid var(--border-light);"><div role="tablist" style="display:flex;border-radius:var(--radius-full);box-shadow:inset 0 0 0 1px var(--border-light);padding:2px;">${tabs}</div><div style="flex:1;"></div>${present_.length>1?`<div role="group" aria-label="Condition" style="display:flex;border-radius:var(--radius-full);box-shadow:inset 0 0 0 1px var(--border-light);overflow:hidden;">${conds}</div>`:''}<label style="height:44px;width:148px;border-radius:var(--radius-md);box-shadow:inset 0 0 0 1px var(--border-light);display:flex;align-items:center;gap:var(--sp-2);padding:0 var(--sp-3);box-sizing:border-box;">${svg('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z m9 2-3.5-3.5',16,1.5,'color:var(--text-light-tertiary);')}<input value="${cdEsc(D.search)}" data-key="q" onchange="Desk.set({search:this.value,shown:25})" oninput="Desk.typing(this.value)" placeholder="SEARCH" aria-label="Search units" style="flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:var(--font-ui);font-weight:500;font-size:13px;letter-spacing:0.5px;color:var(--text-light-primary);"></label><div role="radiogroup" aria-label="View" style="display:flex;padding:3px;gap:2px;border-radius:var(--radius-md);background:var(--surface-light-inset);box-shadow:inset 0 0 0 1px var(--border-light-mid);">${views}</div>${loc}</div>`;
  const cols=D.view==='list'?`<div style="display:flex;gap:var(--sp-3);padding:var(--sp-3);background:var(--surface-light-page);border-bottom:1px solid var(--border-light);font-family:var(--font-ui);font-weight:700;font-size:11px;letter-spacing:0.55px;color:var(--text-light-secondary);text-transform:uppercase;"><span class="cd-thumb" style="width:120px;flex-shrink:0;overflow:hidden;white-space:nowrap;">Thumbnail</span><span style="width:44px;flex-shrink:0;">${sortBtn('score','Score')}</span><span style="flex:1;min-width:140px;">Year / Manufacturer / Brand / Model</span><span class="cd-col-hide" style="width:96px;flex-shrink:0;">Stock #</span><span class="cd-col-hide" style="width:96px;flex-shrink:0;">${sortBtn('price','DSRP')}</span><span style="width:115px;flex-shrink:0;">${sortBtn('payment',moneyCol())}</span><span style="width:16px;flex-shrink:0;"></span></div>`:'';
  const empty=`<div style="padding:var(--sp-12) var(--sp-4);text-align:center;display:flex;flex-direction:column;align-items:center;gap:var(--sp-3);"><span style="font-family:var(--font-display);font-size:24px;letter-spacing:0.75px;">${sel?'No units selected':'No matching units'}</span><span style="font-family:var(--font-body);font-size:14px;color:var(--text-light-tertiary);">${sel?'Check units in All results to compare them here.':'Relax a toggle, the budget or the unit type to see more units.'}</span><button type="button" onclick="Desk.reset()" class="cd-hov-gold" style="height:44px;padding:0 var(--sp-4);border-radius:var(--radius-md);${btnGold}">Reset filters</button></div>`;
  const body=!rows.length?empty:D.view==='grid'?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:var(--sp-4);padding:var(--sp-4);">${shown.map(rowHtml).join('')}</div>`:`<div>${shown.map(rowHtml).join('')}</div>`;
  const more=rows.length>shown.length?`<div class="cd-more"><button type="button" onclick="Desk.set({shown:${D.shown+25}})" class="cd-hov-gold" style="height:44px;padding:0 var(--sp-5);border-radius:var(--radius-md);${btnGold}">Show ${Math.min(25,rows.length-shown.length)} more · ${n(rows.length-shown.length)} left</button></div>`:'';
  return `<div style="background:var(--brand-white);border-radius:var(--radius-lg);box-shadow:inset 0 0 0 1px var(--border-light);overflow:hidden;">${head}${cols}${body}${more}</div>`;
}
function rightRail(){
  const byS=R.byStock; const placed=D.slots.filter(sn=>sn&&byS[sn]).length; const open=D.slots.map((s,i)=>s?-1:i).filter(i=>i>=0); const checkedOpen=D.checked.filter(id=>D.slots.indexOf(id)===-1);
  const rank=sn=>byS[sn]||null; const total=R.all.length;
  const verified=R.all.filter(x=>x.score.rankGroup==='VERIFIED_AVAILABLE').length, ex=R.all.filter(x=>x.score.rankGroup==='VERIFIED_L_STOCK_EXAMPLE').length, chk_=R.all.filter(x=>x.score.rankGroup==='PROBABLE_NEEDS_VERIFICATION').length;
  const slots=D.slots.map((sn,i)=>{ const x=sn?rank(sn):null, over=D.dragOver===i;
    return `<div ondragover="Desk.dragOver(event,${i})" ondragleave="Desk.dragLeave(event)" ondrop="Desk.drop(event,${i})" style="min-height:116px;border-radius:var(--radius-md);background:${over?'var(--surface-light-page)':'var(--brand-white)'};box-shadow:${over?'inset 0 0 0 2px var(--accent-gold-lo)':x?'inset 0 0 0 1px var(--border-light)':'inset 0 0 0 1px var(--border-light-mid)'};padding:var(--sp-4);box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:${x?'flex-start':'center'};gap:var(--sp-2);transition:background var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast);"><span style="${lbl}line-height:16px;">${SLOT_LABELS[i]}</span>${x?(()=>{ const m=money(x.unit); return `<div style="width:100%;display:flex;gap:var(--sp-3);align-items:center;"><span style="width:44px;height:44px;border-radius:var(--radius-md);background:var(--brand-white);box-shadow:inset 0 0 0 1px var(--border-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:var(--font-display);font-size:20px;">${x.score.display}</span><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;"><span style="font-family:var(--font-ui);font-weight:500;font-size:13px;line-height:17px;color:var(--text-light-primary);">${cdEsc(nameOf(x.unit))}</span><span style="font-family:var(--font-ui);font-weight:700;font-size:13px;color:var(--text-light-primary);">${m.text}${D.method==='Cash'?'':'/mo'} <span style="font-weight:500;color:var(--text-light-tertiary);">· ${x.unit.price>0?mny(x.unit.price):'Price pending'}</span></span></div><button type="button" onclick="Desk.removeSlot(${i})" aria-label="Remove from slot" style="width:44px;height:44px;margin-right:calc(-1 * var(--sp-3));border:none;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${svg('M18 6 6 18 M6 6l12 12',16,1.5,'color:var(--text-light-tertiary);')}</button></div>`; })():`<span style="font-family:var(--font-ui);font-weight:700;font-size:11px;letter-spacing:0.55px;color:var(--accent-gold-lo);text-transform:uppercase;">Drag and drop</span>`}</div>`; }).join('');
  const canSend=placed>0&&!D.sent;
  const note=D.sent?`${placed} of 4 slots saved · edit a slot to resave`:placed===0?'Place at least one unit to send':placed<4?`${4-placed} slot${4-placed>1?'s':''} still open`:'';
  return `<div class="cd-right" style="width:300px;flex-shrink:0;display:flex;flex-direction:column;gap:var(--sp-3);position:sticky;top:89px;max-height:calc((100dvh - 52px) / 0.8 - 40px);overflow-y:auto;">
    <div role="status" aria-live="polite" style="background:var(--surface-light-raised);border-radius:var(--radius-lg);box-shadow:inset 0 0 0 1px var(--border-light),var(--shadow-sm);padding:var(--sp-5) var(--sp-4);display:flex;flex-direction:column;align-items:center;gap:var(--sp-1);text-align:center;"><span style="font-family:var(--font-ui);font-weight:600;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:var(--accent-gold-lo);">▸ Matching units</span><span style="font-family:var(--font-display);font-size:48px;line-height:1;letter-spacing:0.5px;color:var(--text-light-primary);font-variant-numeric:tabular-nums;">${n(total)}</span><span style="font-family:var(--font-body);font-size:13px;color:var(--text-light-tertiary);">${n(verified)} confirmed · ${n(ex)} floorplan examples · ${n(chk_)} need a quick check</span></div>
    <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-family:var(--font-display);font-size:24px;letter-spacing:0.75px;color:var(--text-light-primary);">Your 3+1</span><span style="border-radius:var(--radius-full);background:${placed===4?'var(--semantic-success-light)':placed>0?'var(--border-gold)':'var(--surface-light-inset)'};color:${placed===4?'var(--semantic-success-dark)':placed>0?'var(--accent-gold-lo)':'var(--text-light-secondary)'};padding:var(--sp-1) var(--sp-3);font-family:var(--font-ui);font-weight:600;font-size:11px;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;">${placed} / 4 placed</span></div>
    <div class="cd-slots" style="display:flex;flex-direction:column;gap:var(--sp-3);">${slots}</div>
    <div style="border-radius:var(--radius-md);background:var(--surface-light-inset);padding:var(--sp-3);font-family:var(--font-ui);font-weight:700;font-size:11px;letter-spacing:0.55px;color:var(--text-light-primary);text-transform:uppercase;text-align:center;">Select with the checkbox · drag the handle into a 3+1 slot</div>
    ${checkedOpen.length&&open.length?`<button type="button" onclick="Desk.fillOpen()" class="cd-hov-gold" style="height:44px;padding:0 var(--sp-3);border-radius:var(--radius-md);${btnGold}">Place ${Math.min(checkedOpen.length,open.length)} selected into open slots</button>`:''}
    <div style="border-radius:var(--radius-md);background:var(--brand-white);box-shadow:inset 0 0 0 1px var(--border-light);padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-2);"><button type="button" onclick="Desk.send()" ${canSend?'':'disabled'} class="${canSend?'cd-hov-send':''}" style="height:48px;border-radius:var(--radius-md);border:none;background:${D.sent?'var(--semantic-success-dark)':'var(--accent-gold-hi)'};color:${D.sent?'var(--brand-white)':'var(--brand-black)'};opacity:${canSend||D.sent?1:0.38};cursor:${canSend?'pointer':'default'};display:flex;align-items:center;justify-content:center;gap:var(--sp-3);font-family:var(--font-ui);font-weight:600;font-size:15px;letter-spacing:0.5px;text-transform:uppercase;transition:background var(--duration-fast) var(--ease-standard);">${D.sent?'Saved for your outfitter':'Review & send'} →</button>${note?`<span style="font-family:var(--font-body);font-size:13px;color:var(--text-light-tertiary);text-align:center;">${note}</span>`:''}</div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-2);"><p style="margin:0;font-family:var(--font-mono);font-size:11px;line-height:16px;color:var(--text-light-tertiary);overflow-wrap:anywhere;">Engine ${E.SCORING_VERSION} · snapshot ${snap.meta.inventorySnapshotId} · ref ${DECISION_ID}</p><button type="button" onclick="exportDecision()" class="cd-hov-gold" style="height:44px;border-radius:var(--radius-md);${btnGold}">Export decision</button>${typeof tradeBtn==='function'?tradeBtn():''}<button type="button" onclick="location.reload()" class="cd-hov-gold" style="height:44px;border-radius:var(--radius-md);${btnGold}">Start over</button></div></div>`;
}
function detailDialog(){
  const sn=D.detail; if(sn==null) return ''; const x=R.byStock[sn]; if(!x) return ''; const u=x.unit, m=money(u), on=D.checked.indexOf(sn)!==-1;
  const ok='var(--semantic-success-dark)', bad='var(--semantic-danger-dark)', ink='var(--text-light-primary)';
  const kv=rows=>rows.map(([k,v,c])=>`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-3);padding:var(--sp-2) 0;border-bottom:1px solid var(--border-light-mid);"><span style="font-family:var(--font-body);font-size:14px;color:var(--text-light-secondary);">${k}</span><span style="font-family:var(--font-mono);font-size:13px;color:${c||ink};text-align:right;">${cdEsc(v)}</span></div>`).join('');
  const sec=(t,r)=>`<div style="display:flex;flex-direction:column;gap:var(--sp-1);"><span style="${lbl}">${t}</span><div style="display:flex;flex-direction:column;">${kv(r)}</div></div>`;
  const must=Object.keys(D.toggle).filter(k=>D.toggle[k]).length;
  const deal=D.method==='Cash'?[['DSRP',u.price>0?mny(u.price):'Pending'],['Cash budget',mny(D.cash)],['vs budget',m.fits==null?'—':D.cash>=u.price?mny(D.cash-u.price)+' under':mny(u.price-D.cash)+' over',m.fits?ok:bad]]
    :[['DSRP',u.price>0?mny(u.price):'Pending'],['Amount financed',u.price>0&&D.fin&&D.fin.valid?mny(Math.max(0,u.price*(1+D.fin.taxRate)-D.down)):'—'],['Term',D.fin&&D.fin.valid?`${D.fin.termMonths} mo · ${D.fin.apr}% est`:'—'],['Payment',m.pmt!=null?'$'+m.pmt+'/mo':'—'],['vs ceiling',m.pmt==null?'—':m.pmt<=D.payment?'$'+(D.payment-m.pmt)+' under':'$'+(m.pmt-D.payment)+' over',m.fits?ok:bad]];
  deal.push(['Toggles set',String(must)]);
  const stockRows=[['Stock #',u.stocknumber],['Condition',u.condition||'—'],['Store',storeName(u.location)],['Year',String(u.year)],['Class',clsName(u)],['Status',u.status||'—']];
  const sizeRows=[['Length',ft(u)?ft(u)+' ft':'Not listed'],['GVWR',u.gvwr?n(u.gvwr)+' lbs':'Not listed',D.towRating&&u.gvwr>D.towRating?bad:ink],['Sleeps',u.sleeps==null?'Not listed':String(u.sleeps)],['Slides',u.slides==null?'Not listed':String(u.slides)],['Construction',u.sidewallConstruction==='LAMINATE'?'Laminate / fiberglass':u.sidewallConstruction==='STT'?'Stick and tin':'Not listed']].concat(u.garageLength?[['Garage',Math.round(u.garageLength/12*10)/10+' ft']]:[]);
  const feats=chars(u).map(charName);
  return `<div onclick="Desk.close()" style="position:fixed;inset:0;z-index:200;background:rgba(2,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:var(--sp-6);box-sizing:border-box;"><div role="dialog" aria-modal="true" aria-label="${cdEsc(nameOf(u))}" onclick="event.stopPropagation()" style="width:760px;max-width:100%;max-height:calc(100dvh / 0.8 - 48px);overflow:hidden;display:flex;flex-direction:column;background:var(--surface-light-card);border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);">
    <div style="padding:var(--sp-6);display:flex;justify-content:space-between;align-items:flex-start;gap:var(--sp-4);border-bottom:1px solid var(--border-light-mid);flex-shrink:0;"><div style="display:flex;flex-direction:column;gap:var(--sp-1);min-width:0;"><div style="display:flex;align-items:center;gap:var(--sp-2);"><span style="width:8px;height:8px;border-radius:var(--radius-full);background:${u.isLStock?'var(--text-light-secondary)':ok};"></span><span style="${lbl}color:${u.isLStock?'var(--text-light-secondary)':ok};">${u.isLStock?'Floorplan example':cdEsc(u.condition||'On the lot')}</span><span style="font-family:var(--font-mono);font-size:12px;color:var(--text-light-tertiary);">#${cdEsc(u.stocknumber)}</span></div><span style="font-family:var(--font-display);font-size:36px;line-height:1.05;letter-spacing:0.5px;color:var(--text-light-primary);text-wrap:pretty;">${cdEsc(nameOf(u))}</span><span style="font-family:var(--font-body);font-size:14px;color:var(--text-light-secondary);">${cdEsc(u.manufacturer)} · ${cdEsc(clsName(u))} · ${cdEsc(storeName(u.location))}</span></div><button type="button" onclick="Desk.close()" class="cd-hov-inset" style="min-height:44px;padding:0 var(--sp-3);border:none;background:transparent;cursor:pointer;font-family:var(--font-ui);font-weight:600;font-size:14px;letter-spacing:0.5px;text-transform:uppercase;color:var(--text-light-primary);border-radius:var(--radius-md);">Close</button></div>
    <div style="padding:var(--sp-5) var(--sp-6) var(--sp-6);display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:var(--sp-6);overflow-y:auto;overflow-x:hidden;"><div style="display:flex;flex-direction:column;gap:var(--sp-3);"><div style="aspect-ratio:320 / 210;border-radius:var(--radius-lg);background:var(--surface-light-inset);display:flex;align-items:center;justify-content:center;color:var(--text-light-muted);">${svg(I_.rv,56,1).replace('height="56"','height="40"')}</div><span style="font-family:var(--font-body);font-style:italic;font-size:12px;color:var(--text-light-tertiary);">Photos for this unit are on bishs.com</span><a href="https://www.bishs.com/" target="_blank" rel="noopener" class="cd-hov-page" style="min-height:40px;border-radius:var(--radius-md);border:1px solid var(--border-light-mid);display:flex;align-items:center;justify-content:center;gap:var(--sp-2);font-family:var(--font-ui);font-weight:600;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--text-light-primary);">All photos on bishs.com →</a><div style="margin-top:var(--sp-3);">${sec('Stock',stockRows)}</div></div>
    <div style="display:flex;flex-direction:column;gap:var(--sp-5);">${sec('This deal',deal)}${sec('Weights and size',sizeRows)}${(typeof whyRanks==='function')?`<div style="display:flex;flex-direction:column;gap:var(--sp-2);"><span style="${lbl}">Score breakdown</span>${whyRanks(x)}</div>`:''}<div style="display:flex;flex-direction:column;gap:var(--sp-2);"><span style="${lbl}">Features · ${feats.length}</span><div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);">${feats.map(f=>`<span style="border-radius:var(--radius-full);background:var(--surface-light-inset);padding:var(--sp-1) var(--sp-3);font-family:var(--font-ui);font-weight:600;font-size:13px;letter-spacing:0.5px;color:var(--text-light-primary);">${cdEsc(f)}</span>`).join('')||'<span style="font-family:var(--font-body);font-size:13px;color:var(--text-light-tertiary);">No floorplan features listed.</span>'}</div></div></div></div>
    <div style="padding:var(--sp-4) var(--sp-6);background:var(--surface-light-page);border-top:1px solid var(--border-light);display:flex;align-items:center;gap:var(--sp-3);flex-shrink:0;"><span style="flex:1;font-family:var(--font-body);font-size:13px;color:var(--text-light-secondary);">To place it in your 3+1, drag the row handle into a slot.</span><button type="button" onclick="Desk.check('${cdEsc(sn)}')" aria-pressed="${on}" style="min-height:44px;padding:0 var(--sp-5);border-radius:var(--radius-md);border:1px solid ${on?'var(--text-light-primary)':'var(--border-light-mid)'};background:${on?'var(--text-light-primary)':'var(--surface-light-card)'};color:${on?'var(--brand-white)':'var(--text-light-primary)'};cursor:pointer;display:flex;align-items:center;gap:var(--sp-2);white-space:nowrap;font-family:var(--font-ui);font-weight:600;font-size:14px;letter-spacing:0.5px;text-transform:uppercase;">${on?svg(I_.check,16,2.5):''}${on?'Selected':'Select'}</button></div></div></div>`;
}
function inner(){
  R=compute(); seedSlots();
  return `<div class="cd-body" style="display:flex;gap:var(--sp-5);padding:var(--sp-6) var(--sp-6) var(--sp-6) ${D.leftOpen?'var(--sp-6)':'var(--sp-10)'};align-items:flex-start;box-sizing:border-box;">
    ${D.leftOpen?'':`<button type="button" onclick="Desk.set({leftOpen:true})" aria-label="Expand customer panel" style="position:fixed;left:0;top:${52+44}px;z-index:45;width:32px;height:88px;border-radius:0 var(--radius-md) var(--radius-md) 0;border:1px solid var(--border-light-mid);border-left:none;background:var(--surface-light-card);box-shadow:var(--shadow-md);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--sp-2);color:var(--text-light-primary);">${svg('m6 17 5-5-5-5 M13 17l5-5-5-5',16,1.5)}<span style="writing-mode:vertical-rl;transform:rotate(180deg);font-family:var(--font-ui);font-weight:600;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--accent-gold-lo);">Customer</span></button>`}
    ${leftPanel()}
    <div class="cd-center" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:var(--sp-4);">${filterBar()}
      <div style="background:var(--brand-white);border-radius:var(--radius-md);box-shadow:inset 0 0 0 1px var(--border-light);padding:var(--sp-3) var(--sp-4);display:flex;align-items:center;gap:var(--sp-4);flex-wrap:wrap;"><div style="flex:1;min-width:280px;border-left:3px solid var(--accent-gold);border-radius:var(--radius-sm);box-shadow:inset 0 0 0 1px var(--border-light);padding:var(--sp-3) var(--sp-4);font-family:var(--font-body);font-size:14px;line-height:1.45;color:var(--text-light-secondary);text-wrap:pretty;">${brief()}</div><span style="font-family:var(--font-ui);font-weight:700;font-size:11px;letter-spacing:0.55px;text-transform:uppercase;color:var(--text-light-primary);white-space:nowrap;">Response <span id="cd-timer" style="font-family:var(--font-mono);font-weight:400;">${timerText()}</span> / 5:00</span></div>
      ${results()}</div>
    ${rightRail()}</div>${detailDialog()}`;
}
const timerText=()=>{ const e=Math.floor((Date.now()-D.t0)/1000); return Math.floor(e/60)+':'+String(e%60).padStart(2,'0'); };

/* ---------- paint / state ---------- */
function paint(){
  const root=document.getElementById('cd-root'); if(!root) return;
  const active=document.activeElement, key=active&&active.dataset?active.dataset.key:null, sel=active&&active.selectionStart;
  const bar=root.querySelector('[data-cd-scroll]'), bx=bar?bar.scrollLeft:0, rh=root.offsetHeight; root.style.minHeight=rh+'px';
  root.innerHTML=inner();
  const nb=root.querySelector('[data-cd-scroll]'); if(nb){ nb.scrollLeft=bx; const L=bx>2, Rr=bx+nb.clientWidth<nb.scrollWidth-2; if(L!==D.canL||Rr!==D.canR){ D.canL=L; D.canR=Rr; root.innerHTML=inner(); const b2=root.querySelector('[data-cd-scroll]'); if(b2) b2.scrollLeft=bx; } }
  root.style.minHeight='';
  if(key){ const el=root.querySelector(`[data-key="${key}"]`); if(el){ el.focus({preventScroll:true}); try{ if(sel!=null&&el.setSelectionRange&&el.type!=='range'&&el.type!=='number') el.setSelectionRange(sel,sel); }catch(e){} } }
}
function startTimer(){ clearInterval(_timer); _timer=setInterval(()=>{ const t=document.getElementById('cd-timer'); if(!t){ clearInterval(_timer); return; } t.textContent=timerText(); const e=(Date.now()-D.t0)/1000; t.style.color=e>=300?'var(--semantic-danger-dark)':e>=240?'var(--semantic-warning-dark)':'var(--text-light-primary)'; },1000); }
function bindGlobal(){
  if(bindGlobal.done) return; bindGlobal.done=true;
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&D.detail!=null){ D.detail=null; paint(); } });
  document.addEventListener('scroll',ev=>{ if(!document.getElementById('cd-root')) return; const t=ev&&ev.target; const se=document.scrollingElement||document.documentElement;
    const y=t&&t!==document&&t.scrollTop!=null&&t.scrollHeight>t.clientHeight+50&&!(t.closest&&t.closest('[data-cd-scroll], .cd-right'))?t.scrollTop:se.scrollTop; const dy=y-_lastY; _lastY=y;
    const bar=document.querySelector('[data-cd-bar]'); if(!bar) return; const set=h=>{ if(D.barHidden!==h){ D.barHidden=h; bar.style.transform=h?'translateY(calc(-100% - 8px))':'translateY(0)'; } };
    if(y<160){ set(false); return; } if(dy>4) set(true); else if(dy<-4) set(false); },{passive:true,capture:true});
}
function snapshot(){ return { method:D.method, payment:D.payment, down:D.down, cash:D.cash, unitType:D.unitType, lengthMaxFt:D.lenMax, towMaxLbs:D.towMax, sleepsMin:D.sleepMin, garageMinFt:isHauler()?D.garageMin:null, toggles:Object.assign({},D.toggle), location:D.location, slots:D.slots.slice(), sentForReview:D.sent }; }

const Desk=window.Desk={
  render(pos,vis){
    if(D.sig!==answerSig()||!D.R){ seed(); }
    if(D.leftOpen==null){ const pg=document.querySelector('.page'); D.leftOpen=(pg?pg.clientWidth:window.innerWidth)>=1100; }
    bindGlobal(); startTimer();
    return `<div class="cd-root" id="cd-root">${inner()}</div>`;
  },
  set(p){ Object.assign(D,p); if('location' in p){ S.loc=p.location; D.sig=answerSig(); }
    if('method' in p||'unitType' in p||'location' in p){ D.sent=false; D.shown=25; if('unitType' in p&&!isHauler()) D.garageMin=D.R.garMin; } paint(); },
  typing(v){ D.search=v; clearTimeout(Desk._st); Desk._st=setTimeout(()=>{ D.shown=25; paint(); },250); },
  tog(k,o){ D.toggle[k]=D.toggle[k]===o?null:o; D.shown=25; D.sent=false; paint(); },
  slide(k,v){ D[k]=Number(v); D.shown=25; D.sent=false; paint(); },
  slideLive(el,k){ D[k]=Number(el.value); const c=el.closest('[data-slider]'); if(!c) return; const min=Number(el.min), max=Number(el.max), v=D[k], pct=((v-min)/(max-min))*100, dir=el.dataset.dir;
    const val=c.querySelector('[data-sl=val]'), fill=c.querySelector('[data-sl=fill]'), sum=c.querySelector('[data-sl=sum]');
    const fmt={lenMax:v=>v+' ft',towMax:v=>(+(v/1000).toFixed(2))+'K lbs',sleepMin:v=>v+'+',garageMin:v=>v+' ft'}[k];
    if(val){ val.textContent=fmt(v); val.style.left=`calc(${pct}% + ${(10-pct*0.2).toFixed(1)}px)`; } if(fill){ fill.style.left=(dir==='max'?0:pct)+'%'; fill.style.width=(dir==='max'?pct:100-pct)+'%'; }
    if(sum) sum.textContent=(dir==='max'?v>=max:v<=min)?'Any':dir==='max'?'Up to':'At least'; },
  step(k,d){ Desk.flashNote(k); D[k]=Math.max(0,D[k]+d); D.shown=25; D.sent=false; paint(); },
  typed(k,v){ Desk.flashNote(k); D[k]=Math.max(0,Number(String(v).replace(/[^0-9]/g,''))||0); D.shown=25; D.sent=false; paint(); },
  flashNote(k){ clearTimeout(_fl); D.flash=k; _fl=setTimeout(()=>{ D.flash=null; paint(); },2200); },
  cond(k){ D.conds[k]=!D.conds[k]; if(!D.conds.lot&&!D.conds.ex) D.conds[k=k==='lot'?'ex':'lot']=true; D.shown=25; paint(); },
  sort(k){ if(D.sortKey!==k){ D.sortKey=k; D.sortDir=k==='price'?'asc':'desc'; } else if(k==='payment'&&D.method!=='Cash') D.sortDir=D.sortDir==='desc'?'asc':D.sortDir==='asc'?'na':'desc'; else D.sortDir=D.sortDir==='asc'?'desc':'asc'; paint(); },
  reset(){ const keep={leftOpen:D.leftOpen,slots:D.slots,checked:D.checked,slotsInit:D.slotsInit,sent:D.sent,t0:D.t0,view:D.view}; seed(); Object.assign(D,keep); paint(); },
  why(sn){ D.why=D.why===sn?null:sn; paint(); },
  open(sn){ D.detail=sn; paint(); }, close(){ D.detail=null; paint(); },
  check(sn){ D.checked=D.checked.indexOf(sn)!==-1?D.checked.filter(x=>x!==sn):D.checked.concat(sn); paint(); },
  dragStart(e,sn){ _drag=sn; if(e&&e.dataTransfer){ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',String(sn)); } },
  dragOver(e,i){ if(e&&e.preventDefault) e.preventDefault(); D.dragOver=i; const el=e&&e.currentTarget; if(el){ el.style.background='var(--surface-light-page)'; el.style.boxShadow='inset 0 0 0 2px var(--accent-gold-lo)'; } },
  dragLeave(e){ D.dragOver=-1; const el=e&&e.currentTarget; if(el){ el.style.background=''; el.style.boxShadow=''; } },
  drop(e,i){ if(e&&e.preventDefault) e.preventDefault(); const raw=e&&e.dataTransfer?e.dataTransfer.getData('text/plain'):''; const sn=raw!==''?raw:_drag; if(sn==null) return;
    D.slots=D.slots.map(x=>x===sn?null:x); D.slots[i]=sn; D.dragOver=-1; D.sent=false; if(D.checked.indexOf(sn)===-1) D.checked.push(sn); paint(); },
  removeSlot(i){ D.slots[i]=null; D.sent=false; paint(); },
  fillOpen(){ const qd=D.checked.filter(id=>D.slots.indexOf(id)===-1); D.slots=D.slots.map(x=>x==null&&qd.length?qd.shift():x); D.sent=false; paint(); },
  send(){ if(!(D.slots.some(Boolean)&&!D.sent)) return; D.sent=true; try{ localStorage.setItem('bish-mm-picks',JSON.stringify({decisionId:DECISION_ID,savedAt:new Date().toISOString(),slots:D.slots})); }catch(e){} paint(); },
  editTow(){ D.towEditing=true; D.towDraft=D.towRating?String(D.towRating):''; paint(); },
  towDraft(v){ D.towDraft=v; },
  saveTow(){ const nn=Number(String(D.towDraft).replace(/[^0-9]/g,'')); const rating=nn>0?nn:null; D.towRating=rating; D.towEditing=false;
    D.towMax=rating?Math.max(D.R.towMin,Math.min(D.R.towMax,Math.floor(rating*(S.towMode==='raw'?1:0.9)/250)*250)):D.R.towMax; D.sent=false; paint(); },
  readBar(el){ const L=el.scrollLeft>2, Rr=el.scrollLeft+el.clientWidth<el.scrollWidth-2; if(L!==D.canL||Rr!==D.canR){ D.canL=L; D.canR=Rr; const bx=el.scrollLeft; paint(); const b=document.querySelector('[data-cd-scroll]'); if(b) b.scrollLeft=bx; } },
  scrollBar(dx){ const el=document.querySelector('[data-cd-scroll]'); if(!el) return; el.scrollLeft=Math.max(0,Math.min(el.scrollWidth-el.clientWidth,el.scrollLeft+dx)); },
  snapshot,
};
/* the exported decision carries the desk's filter state and the shopper's 3+1 picks */
if(typeof decisionRecord==='function'){ const base=decisionRecord; window.decisionRecord=decisionRecord=function(r){ const o=base(r); try{ o.desk=snapshot(); }catch(e){} return o; }; }
})();

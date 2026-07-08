/* ===================== Aurora AI — clinical console (demo) ===================== */
const D = window.AURORA_DATA;

/* ---- model / label config (mirrors the adding_models branch) ---- */
const MODELS = [
  { value:'Sienna',    label:'Sienna',         isNew:false, heatmap:true,  labels:['MET_GBM_NON','PITUITARY_MENINGIOMA_GLIOMA'] },
  { value:'NeuroXAI',  label:'NeuroXAI',       isNew:false, heatmap:true,  labels:['MET_GBM_NON'] },
  { value:'Inception', label:'Inception',      isNew:false, heatmap:true,  labels:['MET_GBM_NON'] },
  { value:'end2end',   label:'End-to-End CNN', isNew:true,  heatmap:false, labels:['GBM_MET_NON'] },
  { value:'model1cnn', label:'Model 1 CNN',    isNew:true,  heatmap:false, labels:['TUM_NON'] },
];
const LABEL_SETS = {
  MET_GBM_NON:['Non-Tumor','MET','GBM'], PITUITARY_MENINGIOMA_GLIOMA:['Pituitary','Meningioma','Glioma'],
  GBM_MET_NON:['GBM','MET','NON'], TUM_NON:['TUM','NON'],
};
const LABEL_DISPLAY = { MET_GBM_NON:'MET, GBM, NON TUMOUR', PITUITARY_MENINGIOMA_GLIOMA:'PITUITARY, MENINGIOMA, GLIOMA', GBM_MET_NON:'GBM, MET, NON', TUM_NON:'TUM, NON' };
const CLASS_INFO = { GBM:'Glioblastoma — aggressive primary brain tumour', MET:'Metastasis — cancer spread to the brain', NON:'Non-tumour — no tumour detected', 'Non-Tumor':'No tumour detected', TUM:'Tumour present', Glioma:'Glioma tumour', Meningioma:'Meningioma tumour', Pituitary:'Pituitary adenoma', 'No Tumor':'No tumour detected' };
const COLORS = ['#0f9d94','#d1477e','#3b6fe0','#c9821c','#7b61e0'];
const findModel = n => MODELS.find(m => m.value.toLowerCase()===String(n).toLowerCase() || m.label.toLowerCase()===String(n).toLowerCase());
const modelDisplay = n => (findModel(n)||{}).label || n;
const supportsHeat = n => { const m=findModel(n); return m ? m.heatmap : true; };

/* ---- helpers ---- */
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const svg = (p,z=22)=>`<svg viewBox="0 0 24 24" width="${z}" height="${z}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const initials = n => n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const AV_COLORS=['#0f9d94','#3b6fe0','#7b61e0','#d1477e','#c9821c','#0ea896','#2f6fed'];
function avColor(n){let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))|0;return AV_COLORS[Math.abs(h)%AV_COLORS.length];}
function avg(vs){if(!Array.isArray(vs)||!vs.length||!Array.isArray(vs[0])||!vs[0].length)return[0];const n=vs[0].length,o=Array(n).fill(0);vs.forEach(v=>v.forEach((x,i)=>o[i]+=x));return o.map(x=>x/vs.length);}
function fmtDate(s){const d=new Date(s);return isNaN(d)?s:d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function statusClass(s){return s==='Analyzed'?'good':s==='Pending'?'warn':'info';}
function toast(msg){const t=$('#toast');t.innerHTML=`<span class="ic">${svg('<path d="M20 6 9 17l-5-5"/>',16)}</span>${esc(msg)}`;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600);}
function animateCount(el,target){const suffix=(String(target).match(/[^\d.]+$/)||[''])[0];const num=parseFloat(String(target).replace(/[^\d.]/g,''))||0;const dur=900,t0=performance.now();const big=num>1000;const finalTxt=(big?Math.round(num).toLocaleString():Math.round(num))+suffix;function step(t){const k=Math.min(1,(t-t0)/dur);const e=1-Math.pow(1-k,3);const v=num*e;el.textContent=(big?Math.round(v).toLocaleString():Math.round(v))+suffix;if(k<1)requestAnimationFrame(step);}requestAnimationFrame(step);setTimeout(()=>{el.textContent=finalTxt;},dur+120);}
function seedRand(seed){let s=0;for(const c of String(seed))s=(s*31+c.charCodeAt(0))>>>0;s=s||1;return()=>{s=(s*1103515245+12345)>>>0;return s/4294967296;};}

/* ---- confidence alerts ---- */
function marginInfo(p){const a=avg(p.predictions),s=[...a].sort((x,y)=>y-x);return{conf:s[0],margin:s[0]-(s[1]||0)};}
function isBorderline(p){const{conf,margin}=marginInfo(p);return conf<0.6||margin<0.15;}

/* ---- persistence ---- */
const LS={patients:'aurora_patients_v2',audit:'aurora_audit_v1',tour:'aurora_tour_v1'};
function savePatients(){try{localStorage.setItem(LS.patients,JSON.stringify(D.patients));}catch(e){}}
function loadPatients(){try{const s=localStorage.getItem(LS.patients);if(s){const p=JSON.parse(s);if(Array.isArray(p)){const ok=p.filter(x=>x&&Array.isArray(x.predictions)&&x.predictions.length&&Array.isArray(x.predictions[0])&&x.predictions[0].length&&Array.isArray(x.classes)&&x.classes.length);if(ok.length)return ok;}}}catch(e){}return null;}
let AUDIT=[];
function loadAudit(){try{const s=localStorage.getItem(LS.audit);if(s)AUDIT=JSON.parse(s);}catch(e){AUDIT=[];}}
function logAudit(action,target){AUDIT.unshift({when:new Date().toLocaleString(),user:D.clinician.name,action,target:target||''});AUDIT=AUDIT.slice(0,200);try{localStorage.setItem(LS.audit,JSON.stringify(AUDIT));}catch(e){}}

/* ---- timeline studies (synthesised, deterministic) ---- */
function genStudies(p){const r=seedRand(p.id);const out=[{date:p.uploadedAt,model:p.model,topClass:p.topClass,conf:p.confidence,current:true}];const n=Math.floor(r()*3);const pool=['Model 1 CNN','Sienna','NeuroXAI'];let dt=new Date(p.uploadedAt);for(let i=0;i<n;i++){dt=new Date(dt.getTime()-(30+Math.floor(r()*80))*86400000);const m=pool[Math.floor(r()*pool.length)];out.push({date:dt.toISOString().slice(0,10),model:m,topClass:m==='Model 1 CNN'?'TUM':p.topClass,conf:+(0.6+r()*0.34).toFixed(2),current:false});}return out;}

const ICON = {
  dashboard:'<rect x="3" y="3" width="7" height="8.5" rx="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.6"/><rect x="14" y="11.5" width="7" height="9.5" rx="1.6"/><rect x="3" y="15" width="7" height="6" rx="1.6"/>',
  patients:'<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3.4"/>',
  compare:'<rect x="3" y="4" width="8" height="16" rx="1.6"/><rect x="13" y="4" width="8" height="16" rx="1.6"/>',
  reports:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>',
  docs:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  refresh:'<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>',
  trash:'<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  play:'<path d="M5 3l14 9-14 9V3z"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  pause:'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>',
  brain:'<path d="M3 13c3-6 6-9 9-9s6 3 9 9"/><path d="M3 13c3 6 6 9 9 9"/>',
  warn:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
};
const NAV=[{r:'home',l:'Home',i:ICON.home},{r:'dashboard',l:'Dashboard',i:ICON.dashboard},{r:'patients',l:'Patients',i:ICON.patients},{r:'add-patient',l:'New analysis',i:ICON.scan},{r:'compare',l:'Model Consensus',i:ICON.compare},{r:'reports',l:'Reports',i:ICON.reports},{r:'documentation',l:'Docs',i:ICON.docs}];
const CRUMB={home:'Home',dashboard:'Dashboard',patients:'Patients','add-patient':'New analysis','image-selection':'New analysis · Scan selection',results:'Prediction analysis',compare:'Model Consensus',reports:'Reports',documentation:'Documentation',settings:'Settings',audit:'Audit log',about:'About this build'};

/* ---- synthetic MRI scan ---- */
function scanSVG(seed=0){
  const cy=48+(seed%5), s=(seed*17)%12-6;
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
    <defs><radialGradient id="g${seed}" cx="50%" cy="42%" r="62%"><stop offset="0%" stop-color="#41547084"/><stop offset="55%" stop-color="#1b2941"/><stop offset="100%" stop-color="#0a111d"/></radialGradient></defs>
    <rect width="100" height="100" fill="#0a111d"/>
    <ellipse cx="50" cy="${cy}" rx="31" ry="37" fill="url(#g${seed})" stroke="#46597a" stroke-width="1.1"/>
    <ellipse cx="50" cy="${cy}" rx="24" ry="29" fill="none" stroke="#2b3c58" stroke-width="0.8" opacity="0.7"/>
    <path d="M50 ${cy-30} C 42 ${cy-16}, 42 ${cy-6}, 50 ${cy} C 58 ${cy-6}, 58 ${cy-16}, 50 ${cy-30}" fill="none" stroke="#33455f" stroke-width="0.9" opacity="0.65"/>
    <path d="M33 ${cy-3+s} q 17 -9 34 0" fill="none" stroke="#33455f" stroke-width="0.8" opacity="0.6"/>
    <path d="M35 ${cy+10} q 15 8 30 0" fill="none" stroke="#33455f" stroke-width="0.8" opacity="0.6"/>
  </svg>`;
}
function scanVisual(imgs,idx,opts={}){
  const img=imgs&&imgs[idx];
  const base=img?`<img class="scan-img" src="${img}" alt="MRI slice ${idx+1}">`:scanSVG(idx+1);
  const heat=opts.heat?`<div class="heat-ov on" style="background:radial-gradient(circle at ${42+(idx*11)%26}% ${44+(idx*7)%20}%, ${opts.hc||'#ff5a3c'} 0%, ${opts.hc||'#ff5a3c'}00 46%),radial-gradient(circle at ${42+(idx*11)%26}% ${44+(idx*7)%20}%, #ffe14b 0%, #ffe14b00 22%)"></div>`:'';
  return base+heat;
}

/* ---- charts ---- */
function donut(fracs,classes,size=180){
  const cx=size/2,cy=size/2,r=size*0.38,sw=size*0.13,C=2*Math.PI*r,gap=Math.min(7,C*0.03);let off=0;
  const track=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${sw}"/>`;
  const segs=fracs.map((f,i)=>{const full=f*C,len=Math.max(full-gap,.001);const g=`<circle class="donut-seg" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLORS[i%COLORS.length]}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;off+=full;return g;}).join('');
  const top=fracs.indexOf(Math.max(...fracs));
  return `<div class="donut-c"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${track}${segs}</svg><div class="mid"><div class="pc tnum">${Math.round(fracs[top]*100)}%</div><div class="cl">${esc(classes[top])}</div></div></div>`;
}
function stackBar(vec){const t=vec.reduce((a,b)=>a+b,0)||1;return `<div class="bar">${vec.map((p,i)=>{const w=p/t*100;return `<span title="${w.toFixed(1)}%" style="width:${w.toFixed(1)}%;background:linear-gradient(180deg,color-mix(in srgb,${COLORS[i%COLORS.length]} 84%,#fff),${COLORS[i%COLORS.length]})">${w>=14?w.toFixed(0)+'%':''}</span>`;}).join('')}</div>`;}
function miniBar(vec){const t=vec.reduce((a,b)=>a+b,0)||1;return `<div class="minibar">${vec.map((p,i)=>`<span style="width:${(p/t*100).toFixed(1)}%;background:${COLORS[i%COLORS.length]}"></span>`).join('')}</div>`;}
function legend(classes){return `<div class="legend">${classes.map((c,i)=>`<span class="it" title="${esc(CLASS_INFO[c]||c)}"><span class="sw" style="background:${COLORS[i%COLORS.length]}"></span>${esc(c)}</span>`).join('')}</div>`;}

/* ---- routing ---- */
let route='dashboard';
function go(r,arg){
  route=r; closeNotif(); stopPlayer();
  $$('.view').forEach(v=>v.classList.remove('active'));
  const v=$('#view-'+r); if(v)v.classList.add('active');
  $$('.rail-link[data-route]').forEach(l=>{const on=l.dataset.route===r;l.classList.toggle('active',on);l.setAttribute('aria-current',on?'page':'false');});
  $('#crumb').innerHTML=`<b>${CRUMB[r]||r}</b>`;
  window.scrollTo({top:0});
  ({home:renderHome,dashboard:renderDashboard,patients:renderPatients,'add-patient':renderAddPatient,'image-selection':renderImageSelection,results:()=>renderResults(arg),compare:renderCompare,reports:renderReports,documentation:renderDocs,settings:renderSettings,audit:renderAudit,about:renderAbout}[r]||(()=>{}))();
  animate(r);
}
function buildRail(){$('#railLinks').innerHTML=NAV.map(n=>`<button class="rail-link" data-route="${n.r}" title="${n.l}" aria-label="${n.l}">${svg(n.i,21)}<span class="tip">${n.l}</span></button>`).join('');}
function fillUser(){const c=D.clinician;$('#userName').textContent=c.name;$('#userRole').textContent=c.role;$('#userAv').textContent=c.initials;$('#railAva').textContent=c.initials;$('#dashFirst').textContent='Dr. '+(c.name.split(' ').slice(-1)[0]);}

/* ===================== DASHBOARD ===================== */
function kpiIcon(i){return [ICON.patients,ICON.scan,'<path d="M22 12A10 10 0 1 1 12 2"/><path d="M22 4 12 14.01l-3-3"/>',ICON.warn][i]||ICON.dashboard;}
function renderDashboard(){
  $('#dashKpis').innerHTML=D.stats.map((s,i)=>`<div class="kpi"><div class="ic">${svg(kpiIcon(i),20)}</div><div class="lbl">${esc(s.label)}</div><div class="val tnum" data-cv="${esc(s.value)}">0</div><div class="delta ${s.trend==='up'?'up':'down'}">${svg(s.trend==='up'?'<path d="M7 17 17 7M17 7H8M17 7v9"/>':'<path d="M7 7l10 10M17 17H8M17 17V8"/>',13)} ${esc(s.delta)}</div></div>`).join('');
  $$('#dashKpis .val').forEach(e=>animateCount(e,e.dataset.cv));
  const recent=[...D.patients].sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt)).slice(0,6);
  $('#dashRecent').innerHTML=`<thead><tr><th>Patient</th><th>Model</th><th>Prediction</th><th>Status</th></tr></thead><tbody>${recent.map(p=>rowPatient(p,true)).join('')}</tbody>`;
  const acts=[{r:'add-patient',t:'New analysis',s:'Upload &amp; run a model',i:ICON.plus},{r:'compare',t:'Model Consensus',s:'Two models, one verdict',i:ICON.compare},{r:'reports',t:'Reports',s:`${D.reports.length} generated`,i:ICON.reports},{r:'documentation',t:'Docs',s:'Guides &amp; glossary',i:ICON.book}];
  $('#quickActions').innerHTML=acts.map(a=>`<div class="qa" data-route="${a.r}"><div class="ic">${svg(a.i,20)}</div><div class="tx"><b>${a.t}</b><span>${a.s}</span></div></div>`).join('');
  const usage={};D.patients.forEach(p=>usage[p.model]=(usage[p.model]||0)+1);const maxU=Math.max(1,...Object.values(usage));
  $('#modelUsage').innerHTML=MODELS.map(m=>{const c=usage[m.label]||0;return `<div style="margin-bottom:12px"><div class="between" style="font-size:.82rem;margin-bottom:5px"><span style="color:var(--ink-2);font-weight:600">${esc(m.label)} ${m.isNew?'<span class="chip new" style="padding:.05rem .4rem">NEW</span>':''}</span><span class="muted tnum">${c}</span></div><div style="height:8px;background:var(--surface-2);border-radius:5px;overflow:hidden"><div style="height:100%;width:${c/maxU*100}%;border-radius:5px;background:linear-gradient(90deg,var(--teal),var(--cyan));transition:width .7s var(--ease)"></div></div></div>`;}).join('');
  // borderline alerts card replaces one of the side items
  const flagged=D.patients.filter(isBorderline);
  $('#activityFeed').closest('.card').style.display='';
  $('#activityFeed').innerHTML=(flagged.length?`<div class="alert warn" style="margin-bottom:12px;cursor:pointer" data-route="patients"><span class="ic">${svg(ICON.warn,17)}</span><div><h4>${flagged.length} case${flagged.length>1?'s':''} need review</h4><p>Low confidence or a close margin between the top two classes.</p></div></div>`:'')+D.activity.slice(0,5).map(a=>`<div class="item"><span class="dot" style="background:${a.kind==='review'?'var(--warn)':a.kind==='feedback'?'var(--violet)':'var(--teal)'}"></span><div><div class="tx">${esc(a.text)}</div><div class="tm">${esc(a.when)}</div></div></div>`).join('');
}
function alertChip(p){return isBorderline(p)?`<span class="chip alert-chip" title="Low confidence or close margin">${svg(ICON.warn,12)} Review</span>`:'';}
function rowPatient(p,compact){
  const a=avg(p.predictions);
  return `<tr data-pt="${p.id}" tabindex="0"><td><div class="pt-ident"><span class="pt-ava" style="background:${avColor(p.name)}">${initials(p.name)}</span><div><div class="nm">${esc(p.name)} ${alertChip(p)}</div><div class="mrn tnum">${esc(p.mrn)}</div></div></div></td><td><span class="chip ${findModel(p.model)?.isNew?'new':''}">${esc(p.model)}</span></td><td><div style="display:flex;align-items:center;gap:9px">${miniBar(a)}<span style="font-weight:650;color:var(--ink)">${esc(p.topClass)}</span><span class="muted tnum">${Math.round(p.confidence*100)}%</span></div></td><td><span class="chip ${statusClass(p.status)}">${esc(p.status)}</span></td>${compact?'':`<td class="muted">${fmtDate(p.uploadedAt)}</td><td>${rowActions(p)}</td>`}</tr>`;
}
function rowActions(p){return `<div class="row" style="gap:6px;flex-wrap:nowrap"><button class="icon-btn" style="width:32px;height:32px" data-act="view" data-pt="${p.id}" aria-label="View ${esc(p.name)}" title="View">${svg(ICON.eye,15)}</button><button class="icon-btn" style="width:32px;height:32px" data-act="fb" data-pt="${p.id}" aria-label="Feedback for ${esc(p.name)}" title="Feedback">${svg(ICON.refresh,15)}</button><button class="icon-btn" style="width:32px;height:32px" data-act="del" data-pt="${p.id}" aria-label="Delete ${esc(p.name)}" title="Delete">${svg(ICON.trash,15)}</button></div>`;}

/* ===================== PATIENTS (sort + paginate + search) ===================== */
let patientFilter='all', patientQuery='', patientSort={key:'uploadedAt',dir:'desc'}, patientPage=1;
const PAGE=8;
function patientRows(){
  let rows=D.patients.filter(p=>(patientFilter==='all'||p.status===patientFilter)&&(!patientQuery||(p.name+p.mrn).toLowerCase().includes(patientQuery.toLowerCase())));
  const k=patientSort.key,dir=patientSort.dir==='asc'?1:-1;
  rows.sort((a,b)=>{let x,y;if(k==='confidence'){x=a.confidence;y=b.confidence;}else if(k==='age'){x=a.age;y=b.age;}else{x=String(a[k==='name'?'name':k]);y=String(b[k==='name'?'name':k]);}return (x<y?-1:x>y?1:0)*dir;});
  return rows;
}
function renderPatients(){
  const all=patientRows();const pages=Math.max(1,Math.ceil(all.length/PAGE));patientPage=Math.min(patientPage,pages);
  const rows=all.slice((patientPage-1)*PAGE,patientPage*PAGE);
  const cols=[['name','Patient'],['model','Model'],['confidence','Prediction'],['status','Status'],['uploadedAt','Uploaded']];
  $('#patientsTable').innerHTML=`<thead><tr>${cols.map(c=>`<th class="sortable ${patientSort.key===c[0]?patientSort.dir:''}" data-sort="${c[0]}">${c[1]}<span class="ar">${patientSort.key===c[0]?(patientSort.dir==='asc'?'▲':'▼'):'↕'}</span></th>`).join('')}<th>Actions</th></tr></thead><tbody>${rows.length?rows.map(p=>rowPatient(p,false)).join(''):`<tr><td colspan="6" style="text-align:center;padding:40px" class="muted">No patients match.</td></tr>`}</tbody>`;
  let pager=$('#patientsPager');if(!pager){pager=document.createElement('div');pager.id='patientsPager';pager.className='pager';$('#patientsTable').closest('.card').appendChild(pager);}
  pager.innerHTML=`<span>Showing ${all.length?((patientPage-1)*PAGE+1):0}–${Math.min(patientPage*PAGE,all.length)} of ${all.length}</span><span class="pg"><button class="btn sm" ${patientPage<=1?'disabled':''} data-pg="prev">Prev</button><span class="muted" style="align-self:center">Page ${patientPage}/${pages}</span><button class="btn sm" ${patientPage>=pages?'disabled':''} data-pg="next">Next</button></span>`;
}

/* ===================== NEW ANALYSIS wizard ===================== */
let wizard={name:'',mrn:'',age:'',sex:'Female',scans:0,images:null,selected:new Set(),model:'Sienna',label:'MET_GBM_NON'};
function resetWizard(){wizard={name:'',mrn:'',age:'',sex:'Female',scans:0,images:null,selected:new Set(),model:'Sienna',label:'MET_GBM_NON'};}
function stepsBar(active){const steps=['Patient & upload','Scans & model','Results'];return `<div class="row" style="gap:0;align-items:center">${steps.map((s,i)=>`<div style="display:flex;align-items:center;gap:10px"><span style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:.78rem;font-weight:700;${i<=active?'background:var(--teal);color:#fff':'background:var(--surface-2);color:var(--muted);border:1px solid var(--line)'}">${i+1}</span><span style="font-size:.86rem;font-weight:600;color:${i<=active?'var(--ink)':'var(--muted)'}">${s}</span>${i<2?'<span style="width:44px;height:2px;background:var(--line);margin:0 12px"></span>':''}</div>`).join('')}</div>`;}
function renderAddPatient(){$('#wizardSteps').innerHTML=stepsBar(0);$('#uploadList').innerHTML=wizard.scans?uploadedList():'';}
function uploadedList(){return `<div class="card" style="box-shadow:none"><div class="between" style="padding:10px 14px;border-bottom:1px solid var(--line)"><b style="font-size:.86rem">${wizard.scans} scans ready ${wizard.images?'<span class="chip good">Your images</span>':'<span class="chip">Sample series</span>'}</b></div><div style="padding:10px 14px;display:grid;grid-template-columns:repeat(6,1fr);gap:8px">${Array.from({length:Math.min(wizard.scans,12)},(_,i)=>`<div style="aspect-ratio:1;border-radius:8px;overflow:hidden;border:1px solid var(--line);position:relative">${scanVisual(wizard.images,i)}</div>`).join('')}</div></div>`;}

function renderImageSelection(){
  $('#wizardSteps2').innerHTML=stepsBar(1);
  const n=wizard.scans||12; if(!wizard.scans)wizard.scans=12;
  wizard.selected=new Set(Array.from({length:n},(_,i)=>i));
  $('#scanThumbs').innerHTML=Array.from({length:n},(_,i)=>`<div class="thumb sel" data-thumb="${i}">${scanVisual(wizard.images,i)}<span class="n">#${String(i+1).padStart(2,'0')}</span><span class="ck">${svg('<path d="M20 6 9 17l-5-5"/>',13)}</span></div>`).join('');
  updateScanCount(); buildModelSel(); buildLabelSel(); renderExplainer();
}
function updateScanCount(){$('#scanCountLbl').textContent=`${wizard.selected.size} of ${wizard.scans} slices selected`;}
function buildModelSel(){$('#modelSel').innerHTML=MODELS.map(m=>`<option value="${m.value}" ${m.value===wizard.model?'selected':''}>${m.label}${m.isNew?'  ·  NEW':''}</option>`).join('');}
function buildLabelSel(){const m=findModel(wizard.model);if(!m.labels.includes(wizard.label))wizard.label=m.labels[0];$('#labelSel').innerHTML=m.labels.map(l=>`<option value="${l}" ${l===wizard.label?'selected':''}>${LABEL_DISPLAY[l]||l}</option>`).join('');}
function renderExplainer(){
  const m=findModel(wizard.model),classes=LABEL_SETS[wizard.label],heat=!m.heatmap;
  const ex=$('#explainer');ex.classList.toggle('is-new',m.isNew);
  ex.innerHTML=`<div class="top"><span class="chip ${m.isNew?'new':''}">${m.isNew?'New model':'Original'}</span><span class="nm">${m.label}</span></div>
    <p style="margin:0 0 4px;font-size:.88rem;color:var(--ink-2)">${m.isNew?'One of the two new models on this branch.':'One of the original models'+(m.heatmap?', with Grad-CAM heatmaps.':'.')} Classifies each scan into:</p>
    <div class="excats">${classes.map((c,i)=>`<span class="excat"><span class="sw" style="background:${COLORS[i%COLORS.length]}"></span><b>${esc(c)}</b></span>`).join('')}</div>
    <div style="font-size:.8rem;color:var(--muted)">Sent as <code>${m.value}</code> · key <code>${m.value.toLowerCase()}_${wizard.label}</code><br>Heatmap: ${heat?'✗ not produced by this model':'✓ available'}</div>`;
}
function genPreds(n,count){const dom=Math.floor(Math.random()*n);const out=[];for(let s=0;s<count;s++){const v=Array.from({length:n},()=>Math.random()*0.13);v[dom]+=0.5+Math.random()*0.34;const sum=v.reduce((a,b)=>a+b,0);out.push(v.map(x=>+(x/sum).toFixed(3)));}return out;}
function runPrediction(){
  const m=findModel(wizard.model),classes=LABEL_SETS[wizard.label];
  const sel=[...wizard.selected].sort((a,b)=>a-b),count=sel.length||6,preds=genPreds(classes.length,count),a=avg(preds),top=a.indexOf(Math.max(...a));
  const imgs=wizard.images?sel.map(i=>wizard.images[i]):null;
  const patient={id:'PT-'+Date.now(),mrn:'AUR-2026-'+(10517+Math.floor(Math.random()*400)),name:wizard.name||'New Patient',age:+wizard.age||47,sex:wizard.sex||'Female',uploadedAt:new Date().toISOString().slice(0,10),model:m.label,labelSet:wizard.label,classes,predictions:preds,topClass:classes[top],confidence:+a[top].toFixed(3),status:'Analyzed',feedback:'',scanCount:count,images:imgs};
  D.patients.unshift(patient); savePatients(); logAudit('Ran '+m.label+' analysis',patient.name);
  showAnalyzing(count,()=>go('results',patient));
}
function showAnalyzing(count,cb){
  const s=$('#view-results');go('results',null);
  s.innerHTML=`<div class="card pad"><div class="analyzing"><div class="pulse-ring">${svg(ICON.brain,34)}</div><div style="text-align:center"><h3 style="font-size:1.1rem">Running ${esc(modelDisplay(wizard.model))}</h3><p class="muted" style="margin:4px 0 0">Analysing ${count} slices…</p></div><div style="width:220px;height:6px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div id="anaBar" style="height:100%;width:0;background:linear-gradient(90deg,var(--teal),var(--cyan));transition:width 1.5s var(--ease)"></div></div></div></div>`;
  requestAnimationFrame(()=>{const b=$('#anaBar');if(b)b.style.width='100%';});
  setTimeout(cb,1650);
}

/* ===================== RESULTS ===================== */
let curPatient=null, curScan=null;
function renderResults(p){
  if(p)curPatient=p; curScan=null; p=curPatient;
  const s=$('#view-results'); if(!p){s.innerHTML='';return;}
  logAudit('Viewed prediction',p.name);
  const a=avg(p.predictions),border=isBorderline(p);
  s.innerHTML=`
    <div class="page-head"><div><h1>Prediction analysis</h1><p>${esc(p.name)} · ${esc(p.mrn)}</p></div><div class="row"><button class="btn" id="fbBtn">${svg(ICON.refresh,16)} Model feedback</button><button class="btn primary" id="repBtn">${svg(ICON.file,16)} Generate report</button></div></div>
    ${border?`<div class="alert warn" style="margin-bottom:16px"><span class="ic">${svg(ICON.warn,18)}</span><div><h4>Low-confidence result — clinician review recommended</h4><p>Top class ${esc(p.topClass)} at ${Math.round(p.confidence*100)}% with a close margin to the next class. Consider a second model or follow-up imaging.</p></div></div>`:''}
    <div class="card pad" style="margin-bottom:18px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:18px">
      ${info('Patient',esc(p.name))}${info('MRN',esc(p.mrn))}${info('Age / Sex',p.age+' · '+p.sex)}${info('Model used',esc(modelDisplay(p.model)))}${info('Category set',(LABEL_DISPLAY[p.labelSet]||p.labelSet))}${info('Status','<span class="chip '+statusClass(p.status)+'">'+p.status+'</span>')}
    </div></div>
    <div class="grid-2" style="align-items:start">
      <div class="stack">
        <div class="card"><div class="card-h"><div><h3>Scan predictions</h3><div class="sub">Per-slice class distribution · click a row for detail</div></div><button class="btn sm ghost" id="viewScansBtn">${svg(ICON.scan,15)} View scans</button></div><div class="card-b">${legend(p.classes)}<div id="scanRows" style="margin-top:12px">${p.predictions.map((v,i)=>scanRow(v,i)).join('')}</div></div></div>
        <div class="card pad"><h3 style="font-size:1rem;margin-bottom:12px">Study history</h3>${timelineHTML(p)}</div>
      </div>
      <div class="card pad"><div class="between" style="margin-bottom:8px"><h3 style="font-size:1rem" id="insightTitle">Overall insights</h3><span class="chip">${p.scanCount} slices</span></div><div id="insightBody">${overallInsights(a,p.classes)}</div></div>
    </div>`;
  wireResults(p,a);
}
function info(l,v){return `<div><div style="font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700">${l}</div><div style="font-weight:650;color:var(--ink);margin-top:3px">${v}</div></div>`;}
function scanRow(v,i){return `<div class="scanrow" data-scan="${i}" tabindex="0" style="cursor:pointer"><div class="no">Slice ${i+1}</div>${stackBar(v)}</div>`;}
function overallInsights(a,classes){return `<div style="display:grid;place-items:center;padding:6px 0 14px">${donut(a,classes,190)}</div><div>${classes.map((c,i)=>`<div class="prow" title="${esc(CLASS_INFO[c]||c)}"><span class="sw" style="background:${COLORS[i%COLORS.length]}"></span><span class="nm">${esc(c)}</span><span class="v tnum">${(a[i]*100).toFixed(1)}%</span></div>`).join('')}</div>`;}
function timelineHTML(p){const st=genStudies(p);return `<div class="timeline">${st.map(s=>`<div class="tl-item ${s.current?'cur':''}"><span class="tl-dot"></span><div class="d">${fmtDate(s.date)}</div><div class="t">${esc(modelDisplay(s.model))} · ${esc(s.topClass)}</div><div class="s">${Math.round(s.conf*100)}% confidence${s.current?' · current study':''}</div></div>`).join('')}</div>`;}
function scanDetail(p,idx){
  const v=p.predictions[idx],t=v.reduce((a,b)=>a+b,0),top=v.indexOf(Math.max(...v)),heat=supportsHeat(p.model),on=$('#heatToggle')?.dataset.on==='1';
  return `<div class="viewer" style="aspect-ratio:auto;height:230px">${scanVisual(p.images,idx,{heat:heat&&on,hc:COLORS[top%COLORS.length]})}<div class="scanline"></div><div class="viewer-badges"><span class="vbadge">Slice ${idx+1}/${p.scanCount}</span><span class="vbadge">${esc(modelDisplay(p.model))}</span></div></div>
    <div class="between" style="margin:12px 0"><button class="btn sm" id="prevScan" aria-label="Previous slice">${svg('<path d="M15 18l-6-6 6-6"/>',16)}</button>${heat?`<button class="btn sm ${on?'primary':''}" id="heatToggle" data-on="${on?1:0}">${on?'Show original':'Show heatmap'}</button>`:`<span class="chip">No heatmap for this model</span>`}<button class="btn sm" id="nextScan" aria-label="Next slice">${svg('<path d="M9 18l6-6-6-6"/>',16)}</button></div>
    <div>${p.classes.map((c,i)=>`<div class="prow"><span class="sw" style="background:${COLORS[i%COLORS.length]}"></span><span class="nm">${esc(c)}</span><span class="v tnum">${(v[i]/t*100).toFixed(1)}%</span></div>`).join('')}</div>`;
}
function wireResults(p,a){
  $('#fbBtn').onclick=()=>feedbackModal(p);
  $('#repBtn').onclick=()=>reportModal(p);
  $('#viewScansBtn').onclick=()=>scanViewer(p);
  const selRow=i=>{curScan=curScan===i?null:i;$$('#scanRows .scanrow').forEach(r=>r.style.background=(+r.dataset.scan===curScan)?'var(--surface-2)':'');$('#insightTitle').textContent=curScan===null?'Overall insights':`Slice ${curScan+1} detail`;$('#insightBody').innerHTML=curScan===null?overallInsights(a,p.classes):scanDetail(p,curScan);if(curScan!==null)wireScanDetail(p);};
  $$('#scanRows .scanrow').forEach(row=>{row.onclick=()=>selRow(+row.dataset.scan);row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selRow(+row.dataset.scan);}};});
}
function wireScanDetail(p){
  const nav=d=>{curScan=(curScan+d+p.predictions.length)%p.predictions.length;$('#insightTitle').textContent=`Slice ${curScan+1} detail`;$('#insightBody').innerHTML=scanDetail(p,curScan);wireScanDetail(p);$$('#scanRows .scanrow').forEach(r=>r.style.background=(+r.dataset.scan===curScan)?'var(--surface-2)':'');};
  $('#prevScan').onclick=()=>nav(-1);$('#nextScan').onclick=()=>nav(1);
  const h=$('#heatToggle');if(h)h.onclick=()=>{h.dataset.on=h.dataset.on==='1'?'0':'1';$('#insightBody').innerHTML=scanDetail(p,curScan);wireScanDetail(p);};
}

/* ===================== COMPARE ===================== */
function renderCompare(){
  const opts=MODELS.map(m=>`<option value="${m.value}">${m.label}${m.isNew?' · NEW':''}</option>`).join('');
  $('#cmpA').innerHTML=opts;$('#cmpB').innerHTML=opts;$('#cmpA').value='Sienna';$('#cmpB').value='end2end';
  $('#cmpResult').innerHTML=`<div class="card pad" style="text-align:center;color:var(--muted);padding:40px">Choose two models and run a consensus on a shared scan set.</div>`;
}
function runCompare(){
  const A=findModel($('#cmpA').value),B=findModel($('#cmpB').value),n=Math.max(1,Math.min(12,+$('#cmpN').value||6));
  const mk=m=>{const ls=m.labels[0],classes=LABEL_SETS[ls],preds=genPreds(classes.length,n),a=avg(preds),top=a.indexOf(Math.max(...a));return{m,classes,a,top,conf:a[top]};};
  const ra=mk(A),rb=mk(B);
  const agree=ra.classes[ra.top]===rb.classes[rb.top];
  logAudit('Ran model consensus',A.label+' vs '+B.label);
  const panel=r=>`<div class="card pad lift"><div class="between" style="margin-bottom:8px"><h3 style="font-size:1rem">${esc(r.m.label)} ${r.m.isNew?'<span class="chip new">NEW</span>':''}</h3>${r.m.heatmap?'<span class="chip">heatmap</span>':'<span class="chip">no heatmap</span>'}</div><div style="display:grid;place-items:center;padding:6px 0 12px">${donut(r.a,r.classes,180)}</div><div>${r.classes.map((c,i)=>`<div class="prow"><span class="sw" style="background:${COLORS[i%COLORS.length]}"></span><span class="nm">${esc(c)}</span><span class="v tnum">${(r.a[i]*100).toFixed(1)}%</span></div>`).join('')}</div></div>`;
  $('#cmpResult').innerHTML=`<div class="alert ${agree?'':'warn'}" style="margin-bottom:16px"><span class="ic">${svg(agree?'<path d="M20 6 9 17l-5-5"/>':ICON.warn,18)}</span><div><h4>${agree?'Models agree':'Models disagree'} — ${esc(ra.classes[ra.top])} (${Math.round(ra.conf*100)}%) vs ${esc(rb.classes[rb.top])} (${Math.round(rb.conf*100)}%)</h4><p>${agree?'Both models return the same top class on this scan set.':'The two models disagree on the top class — recommend clinician review or a third opinion.'}</p></div></div><div class="grid-2" style="align-items:start">${panel(ra)}${panel(rb)}</div>`;
}

/* ===================== REPORTS / DOCS / SETTINGS / AUDIT / ABOUT ===================== */
function renderReports(){
  $('#reportsGrid').innerHTML=D.reports.map(r=>`<div class="card pad lift fu"><div class="between" style="margin-bottom:10px"><span class="chip"><span class="d" style="background:var(--teal)"></span>${esc(r.id)}</span><span class="muted" style="font-size:.78rem">${fmtDate(r.date)}</span></div><h3 style="font-size:1rem">${esc(r.patient)}</h3><div class="chip ${findModel(r.model)?.isNew?'new':''}" style="margin:8px 0">${esc(r.model)}</div><p class="muted" style="font-size:.84rem;margin:6px 0 14px">${esc(r.summary)}</p><button class="btn sm" data-report="${esc(r.id)}">${svg(ICON.file,15)} Open report</button></div>`).join('');
}
function renderDocs(){
  $('#docsBody').innerHTML=[
    {h:'Getting started',b:'Add a patient and upload their MRI series, choose one of the five AI models and its category set, then run the prediction. Aurora returns a per-slice breakdown, an aggregate donut, and a downloadable report.'},
    {h:'Choosing a model',b:'Sienna, NeuroXAI and Inception are the original models and produce Grad-CAM heatmaps. <b>End-to-End CNN</b> and <b>Model 1 CNN</b> are the two new PyTorch models added on this branch — they run faster but do not produce heatmaps.'},
    {h:'Reading results',b:'Each slice is a stacked bar of class probabilities. Click a slice to open the scan viewer and, where available, toggle the Grad-CAM heatmap. Low-confidence cases are flagged automatically for review.'},
    {h:'Model consensus',b:'Use <b>Model Consensus</b> to run two models on the same scan set and see where they agree.'},
  ].map(d=>`<div class="card pad"><h3 style="font-size:1.02rem;margin-bottom:6px">${d.h}</h3><p class="muted" style="margin:0;font-size:.9rem">${d.b}</p></div>`).join('');
  const terms=[['GBM','Glioblastoma — aggressive primary tumour'],['MET','Metastasis — spread from elsewhere'],['NON / Non-Tumor','No tumour detected'],['TUM','Tumour present'],['Glioma / Meningioma / Pituitary','Sienna tumour types'],['Grad-CAM','Heat overlay of where the model looked']];
  $('#glossary').innerHTML=terms.map(t=>`<div class="term" style="grid-template-columns:1fr;gap:2px;padding:9px 0"><dt>${t[0]}</dt><dd>${t[1]}</dd></div>`).join('');
}
let settingsTab='account';
function renderSettings(){
  const body=$('#settingsBody');
  if(settingsTab==='account')body.innerHTML=`<div class="card pad" style="max-width:520px"><div class="stack" style="gap:16px"><div class="field"><label>Full name</label><input class="input" value="${esc(D.clinician.name)}"></div><div class="field"><label>Role</label><input class="input" value="${esc(D.clinician.role)}"></div><div class="field"><label>Email (read-only)</label><input class="input" value="a.okafor@meridian.health" disabled></div><div><button class="btn primary" onclick="toast('Account updated');logAudit('Updated account','')">Save changes</button></div></div></div>`;
  else if(settingsTab==='appearance')body.innerHTML=`<div class="card pad" style="max-width:640px"><h3 style="font-size:1rem;margin-bottom:12px">Theme</h3><div class="grid-3" id="themeCards">${['Light','Dark','System'].map(t=>`<div class="card pad" data-theme="${t}" style="cursor:pointer;text-align:center;${t===(document.body.classList.contains('dark')?'Dark':'Light')?'border-color:var(--teal);box-shadow:0 0 0 2px var(--teal-soft)':''}"><div style="height:56px;border-radius:8px;margin-bottom:10px;background:${t==='Dark'?'#0e1a2e':t==='System'?'linear-gradient(90deg,#fff 50%,#0e1a2e 50%)':'#f4f7fb'};border:1px solid var(--line)"></div><b style="font-size:.88rem">${t}</b></div>`).join('')}</div><h3 style="font-size:1rem;margin:22px 0 10px">Font size</h3><input type="range" min="0.85" max="1.2" step="0.01" value="1" id="fontRange" style="width:100%"></div>`;
  else if(settingsTab==='notifications')body.innerHTML=`<div class="card pad" style="max-width:560px"><h3 style="font-size:1rem;margin-bottom:12px">Notify me about</h3>${['All activity','Mentions only','Nothing'].map((o,i)=>`<label style="display:flex;gap:10px;align-items:center;padding:8px 0;cursor:pointer"><input type="radio" name="notif" ${i===0?'checked':''}> ${o}</label>`).join('')}<h3 style="font-size:1rem;margin:18px 0 10px">Email notifications</h3>${['New analysis complete','Reports ready','Low-confidence alerts'].map((o,i)=>`<label class="between" style="padding:9px 0;cursor:pointer"><span>${o}</span><input type="checkbox" ${i<2?'checked':''}></label>`).join('')}<div style="margin-top:14px"><button class="btn primary" onclick="toast('Preferences saved')">Save</button></div></div>`;
  $$('#settingsTabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.s===settingsTab));
  const tc=$('#themeCards');if(tc)$$('[data-theme]',tc).forEach(c=>c.onclick=()=>{const t=c.dataset.theme;document.body.classList.toggle('dark',t==='Dark'||(t==='System'&&matchMedia('(prefers-color-scheme:dark)').matches));toast(t+' theme applied');renderSettings();});
  const fr=$('#fontRange');if(fr)fr.oninput=()=>{document.documentElement.style.fontSize=(fr.value*100)+'%';};
}
function renderAudit(){
  $('#auditTable').innerHTML=`<thead><tr><th>When</th><th>User</th><th>Action</th><th>Target</th></tr></thead><tbody>${AUDIT.length?AUDIT.map(a=>`<tr style="cursor:default"><td class="muted tnum" style="white-space:nowrap">${esc(a.when)}</td><td>${esc(a.user)}</td><td style="font-weight:600;color:var(--ink)">${esc(a.action)}</td><td class="muted">${esc(a.target)}</td></tr>`).join(''):`<tr><td colspan="4" style="text-align:center;padding:40px" class="muted">No actions logged yet — navigate around and they'll appear here.</td></tr>`}</tbody>`;
}
function renderAbout(){
  const changes=[['New models in the dropdown','Shows “End-to-End CNN” / “Model 1 CNN” but sends the codes <code>end2end</code> / <code>model1cnn</code>.'],['Right categories per model','end2end → GBM/MET/NON, model1cnn → TUM/NON, kept valid when switching.'],['Results in backend order','Categories read &amp; coloured in the exact backend order so nothing is dropped.'],['Heatmap hidden for torch models','The two new models produce no Grad-CAM, so the toggle is hidden.'],['Friendly name everywhere','Results header, scan viewer and PDF show the friendly model name.']];
  $('#aboutBody').innerHTML=`<div class="card pad" style="margin-bottom:16px"><p style="margin:0;color:var(--ink-2)">This console is a standalone preview of the <code>adding_models</code> branch of Aurora-Frontend, running on mock data — no login or backend required. It reproduces the real app's features and adds support for two new AI models. <b>main is untouched.</b></p></div><div class="grid-2" style="align-items:start"><div class="stack">${changes.map((c,i)=>`<div class="card pad" style="display:grid;grid-template-columns:auto 1fr;gap:14px"><span class="num" style="width:26px;height:26px">${i+1}</span><div><h4 style="margin:0 0 3px;font-size:.94rem">${c[0]}</h4><p class="muted" style="margin:0;font-size:.85rem">${c[1]}</p></div></div>`).join('')}</div><div class="card pad"><h3 style="font-size:1rem;margin-bottom:10px">The two new models</h3><div class="stack" style="gap:10px">${MODELS.filter(m=>m.isNew).map(m=>`<div class="explain is-new"><div class="top"><span class="chip new">New</span><span class="nm">${m.label}</span></div><div style="font-size:.84rem;color:var(--muted)">Sends <code>${m.value}</code> · categories ${LABEL_SETS[m.labels[0]].join(' · ')} · no heatmap</div></div>`).join('')}</div></div></div>`;
}

/* ---- modals ---- */
function modal(html,wide){const root=$('#modalRoot');root.innerHTML=`<div class="modal-scrim"><div class="modal"${wide?' style="max-width:min(92vw,880px)"':''} role="dialog" aria-modal="true">${html}</div></div>`;const scrim=$('.modal-scrim',root);requestAnimationFrame(()=>scrim.classList.add('open'));scrim.onclick=e=>{if(e.target===scrim)closeModal();};const f=root.querySelector('button,select,textarea,input');if(f)setTimeout(()=>f.focus(),60);return root;}
function closeModal(){const s=$('.modal-scrim');if(s){s.classList.remove('open');setTimeout(()=>$('#modalRoot').innerHTML='',220);}}
const FEEDBACK_LABELS=['MET','GBM','NON TUMOUR','TUM','NON','Pituitary','Meningioma','Glioma'];
function feedbackModal(p){modal(`<div class="modal-h"><h3 style="font-size:1.05rem">Model feedback</h3><p class="muted" style="font-size:.85rem;margin:4px 0 0">Record the correct label for ${esc(p.name)} to improve retraining.</p></div><div class="modal-b"><div class="field"><label>Correct label</label><select class="input" id="fbSel">${FEEDBACK_LABELS.map(l=>`<option>${l}</option>`).join('')}</select></div></div><div class="modal-f"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="fbSubmit">Submit feedback</button></div>`);$('#fbSubmit').onclick=()=>{const v=$('#fbSel').value;p.feedback=v;savePatients();closeModal();toast('Feedback recorded for '+p.name);logAudit('Submitted feedback ('+v+')',p.name);};}
function reportModal(p){modal(`<div class="modal-h"><h3 style="font-size:1.05rem">Generate report</h3><p class="muted" style="font-size:.85rem;margin:4px 0 0">Add remarks, then export a PDF (via your browser's print dialog).</p></div><div class="modal-b"><div class="field"><label>Remarks</label><textarea class="input" id="repRemarks" rows="3" placeholder="Clinical notes…"></textarea></div><div class="muted" style="font-size:.8rem;margin-top:10px">Includes patient info, ${esc(modelDisplay(p.model))} results and a summary.</div></div><div class="modal-f"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="dlRep">${svg(ICON.file,15)} Export PDF</button></div>`);$('#dlRep').onclick=()=>{const rem=$('#repRemarks').value;closeModal();setTimeout(()=>printReport(p,rem),260);};}
function printReport(p,remarks){
  const a=avg(p.predictions);
  $('#printArea').innerHTML=`<div style="font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0f2038;padding-bottom:10px;margin-bottom:18px"><div><div style="font-size:22px;font-weight:700;color:#0f2038">Aurora AI — Prediction Report</div><div style="font-size:12px;color:#666">${new Date().toLocaleString()}</div></div><div style="font-size:12px;text-align:right;color:#333">${esc(D.clinician.org)}<br>${esc(D.clinician.name)}</div></div>
    <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:18px">${[['Patient',p.name],['MRN',p.mrn],['Age / Sex',p.age+' · '+p.sex],['Model used',modelDisplay(p.model)],['Category set',LABEL_DISPLAY[p.labelSet]||p.labelSet],['Study date',fmtDate(p.uploadedAt)]].map(r=>`<tr><td style="padding:5px 8px;color:#666;width:160px">${r[0]}</td><td style="padding:5px 8px;font-weight:600">${esc(r[1])}</td></tr>`).join('')}</table>
    <h3 style="font-size:15px;border-bottom:1px solid #ccc;padding-bottom:5px;color:#0f2038">Overall prediction</h3>
    <table style="width:100%;font-size:13px;border-collapse:collapse;margin:8px 0 16px">${p.classes.map((c,i)=>`<tr><td style="padding:5px 8px">${esc(c)}</td><td style="padding:5px 8px;text-align:right;font-weight:600">${(a[i]*100).toFixed(1)}%</td></tr>`).join('')}</table>
    <div style="font-size:13px;margin-bottom:14px"><b>Top class:</b> ${esc(p.topClass)} (${Math.round(p.confidence*100)}%) — ${isBorderline(p)?'<span style="color:#b5791b">borderline, review recommended</span>':'confident'}</div>
    ${remarks?`<h3 style="font-size:15px;border-bottom:1px solid #ccc;padding-bottom:5px;color:#0f2038">Remarks</h3><p style="font-size:13px;white-space:pre-wrap">${esc(remarks)}</p>`:''}
    <div style="font-size:11px;color:#999;margin-top:28px;border-top:1px solid #ccc;padding-top:8px">Aurora AI research preview · sample data · not for clinical use.</div>
  </div>`;
  window.print(); toast('Use “Save as PDF” in the print dialog'); logAudit('Generated report',p.name);
}
function scanViewer(p){
  let ipp=1,idx=0,heatOn=false;const heat=supportsHeat(p.model);
  const slides=()=>{const arr=[];for(let i=0;i<p.scanCount;i+=ipp)arr.push(Array.from({length:Math.min(ipp,p.scanCount-i)},(_,k)=>i+k));return arr;};
  function draw(){const S=slides();idx=Math.min(idx,S.length-1);root.querySelector('#svBody').innerHTML=`<div style="display:flex;gap:10px;justify-content:center;height:100%">${S[idx].map(si=>`<div class="viewer" style="aspect-ratio:auto;flex:1;max-width:${100/ipp}%">${scanVisual(p.images,si,{heat:heat&&heatOn,hc:COLORS[p.predictions[si].indexOf(Math.max(...p.predictions[si]))%COLORS.length]})}<div class="scanline"></div><div class="viewer-badges"><span class="vbadge">Slice ${si+1}</span></div></div>`).join('')}</div>`;root.querySelector('#svStatus').textContent=`Slide ${idx+1}/${S.length}`;}
  const root=modal(`<div class="modal-h between"><h3 style="font-size:1.05rem">Scan viewer · ${esc(modelDisplay(p.model))}</h3><div class="row" style="gap:8px"><select class="input" id="svIpp" style="width:auto;padding:.4rem 2rem .4rem .6rem"><option value="1">1 / slide</option><option value="2">2 / slide</option><option value="3">3 / slide</option></select>${heat?`<button class="btn sm" id="svHeat">Heatmap: off</button>`:''}<button class="btn sm" onclick="closeModal()" aria-label="Close">✕</button></div></div><div class="modal-b" style="padding:8px 16px"><div id="svBody" style="height:52vh"></div><div class="between" style="margin-top:10px"><button class="btn sm" id="svPrev" aria-label="Previous">${svg('<path d="M15 18l-6-6 6-6"/>',15)}</button><span class="muted tnum" id="svStatus"></span><button class="btn sm" id="svNext" aria-label="Next">${svg('<path d="M9 18l6-6-6-6"/>',15)}</button></div></div>`,true);
  draw();
  root.querySelector('#svIpp').onchange=e=>{ipp=+e.target.value;idx=0;draw();};
  root.querySelector('#svPrev').onclick=()=>{const S=slides();idx=(idx-1+S.length)%S.length;draw();};
  root.querySelector('#svNext').onclick=()=>{const S=slides();idx=(idx+1)%S.length;draw();};
  const hb=root.querySelector('#svHeat');if(hb)hb.onclick=()=>{heatOn=!heatOn;hb.textContent='Heatmap: '+(heatOn?'on':'off');hb.classList.toggle('primary',heatOn);draw();};
}

/* ---- notifications ---- */
function notifItems(){const flagged=D.patients.filter(isBorderline).slice(0,4).map(p=>({t:`${p.name} — low confidence (${p.topClass} ${Math.round(p.confidence*100)}%)`,tm:'Needs review',c:'var(--warn)',pt:p.id}));const acts=D.activity.slice(0,5).map(a=>({t:a.text,tm:a.when,c:a.kind==='review'?'var(--warn)':'var(--teal)'}));return [...flagged,...acts];}
function renderNotif(){const items=notifItems();$('#notifPanel').innerHTML=`<div class="h"><b>Notifications</b><button class="btn sm ghost" onclick="closeNotif()">Close</button></div><div class="notif-list">${items.map(n=>`<div class="notif" ${n.pt?`data-pt="${n.pt}"`:''}><span class="nd" style="background:${n.c}"></span><div><div class="tx">${esc(n.t)}</div><div class="tm">${esc(n.tm)}</div></div></div>`).join('')}</div>`;}
function toggleNotif(){const p=$('#notifPanel');if(p.classList.contains('open'))return closeNotif();renderNotif();p.classList.add('open');$('#notifDot').style.display='none';}
function closeNotif(){$('#notifPanel')?.classList.remove('open');}

/* ---- command palette ---- */
let cmdSel=0,cmdItems=[];
function cmdCommands(){const base=[...NAV.map(n=>({t:'Go to '+n.l,ic:n.i,run:()=>go(n.r)})),{t:'Settings',ic:ICON.dashboard,run:()=>go('settings')},{t:'Audit log',ic:ICON.activity,run:()=>go('audit')},{t:'About this build',ic:ICON.book,run:()=>go('about')},{t:'New analysis',ic:ICON.plus,run:()=>{resetWizard();go('add-patient');}},{t:'Toggle dark mode',ic:ICON.dashboard,run:()=>{document.body.classList.toggle('dark');toast((document.body.classList.contains('dark')?'Dark':'Light')+' theme');}},{t:'Take the tour',ic:ICON.eye,run:()=>startTour()}];return base;}
function openCmd(){const s=$('#cmdkScrim');s.innerHTML=`<div class="cmdk"><div class="cin">${svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-3.6-3.6"/>',18)}<input id="cmdkInput" placeholder="Search commands, patients…"><kbd>Esc</kbd></div><div class="cmdk-list" id="cmdkList"></div></div>`;s.classList.add('open');cmdSel=0;filterCmd('');$('#cmdkInput').addEventListener('input',e=>filterCmd(e.target.value));setTimeout(()=>$('#cmdkInput').focus(),50);}
function closeCmd(){$('#cmdkScrim').classList.remove('open');$('#cmdkScrim').innerHTML='';}
function filterCmd(q){q=q.toLowerCase();const cmds=cmdCommands().filter(c=>c.t.toLowerCase().includes(q));const pts=q?D.patients.filter(p=>(p.name+p.mrn).toLowerCase().includes(q)).slice(0,6).map(p=>({t:p.name,meta:p.mrn,ic:ICON.patients,run:()=>go('results',p)})):[];cmdItems=[...cmds,...pts];cmdSel=0;
  $('#cmdkList').innerHTML=(cmds.length?`<div class="cmdk-group">Commands</div>`+cmds.map((c,i)=>cmdRow(c,i)).join(''):'')+(pts.length?`<div class="cmdk-group">Patients</div>`+pts.map((c,i)=>cmdRow(c,cmds.length+i)).join(''):'')+(cmdItems.length?'':`<div class="cmdk-item">No matches</div>`);
  markCmd();
}
function cmdRow(c,i){return `<div class="cmdk-item" data-i="${i}"><span class="ci">${svg(c.ic,16)}</span>${esc(c.t)}${c.meta?`<span class="meta tnum">${esc(c.meta)}</span>`:''}</div>`;}
function markCmd(){$$('#cmdkList .cmdk-item[data-i]').forEach(el=>el.classList.toggle('sel',+el.dataset.i===cmdSel));}
function runCmd(i){const c=cmdItems[i];if(c){closeCmd();c.run();}}

/* ---- onboarding tour ---- */
const TOUR=[{sel:'.rail-link[data-route="home"]',t:'Home',x:'The home page introduces Aurora and all five models, with a guided walkthrough video.'},{sel:'.rail-link[data-route="dashboard"]',t:'Dashboard',x:'Your day at a glance: patients, recent analyses and low-confidence alerts.'},{sel:'#globalSearch',t:'Search & command palette',x:'Search anything, or press Ctrl+K for the command palette.'},{sel:'.rail-link[data-route="add-patient"]',t:'New analysis',x:'Upload MRI scans, pick a model (incl. the two new ones) and run a prediction.'},{sel:'#notifBtn',t:'Alerts & notifications',x:'Review flagged cases and recent activity anytime.'}];
let tourI=0;
function startTour(){tourI=0;$('#tourScrim').classList.add('open');showTourStep();}
function endTour(){$('#tourScrim').classList.remove('open');$('#tourScrim').innerHTML='';try{localStorage.setItem(LS.tour,'1');}catch(e){}}
function showTourStep(){
  const step=TOUR[tourI];const el=$(step.sel);if(!el){return endTour();}
  const r=el.getBoundingClientRect(),pad=8;
  const holeL=r.left-pad,holeT=r.top-pad,holeW=r.width+pad*2,holeH=r.height+pad*2;
  let popL=Math.min(Math.max(12,r.left),window.innerWidth-302),popT=r.bottom+14;
  if(r.left<120){popL=r.right+16;popT=Math.max(12,r.top);}
  if(popT+150>window.innerHeight)popT=Math.max(12,r.top-160);
  $('#tourScrim').innerHTML=`<div class="tour-hole" style="left:${holeL}px;top:${holeT}px;width:${holeW}px;height:${holeH}px"></div><div class="tour-pop" style="left:${popL}px;top:${popT}px"><div class="step">Step ${tourI+1} of ${TOUR.length}</div><h4>${step.t}</h4><p>${step.x}</p><div class="f"><button class="btn sm ghost" id="tourSkip">Skip</button><div class="row" style="gap:8px">${tourI>0?'<button class="btn sm" id="tourPrev">Back</button>':''}<button class="btn sm primary" id="tourNext">${tourI===TOUR.length-1?'Done':'Next'}</button></div></div></div>`;
  $('#tourSkip').onclick=endTour;$('#tourNext').onclick=()=>{if(tourI===TOUR.length-1)return endTour();tourI++;showTourStep();};const pv=$('#tourPrev');if(pv)pv.onclick=()=>{tourI--;showTourStep();};
}

/* ---- global search dropdown ---- */
function renderSearchPop(q){const pop=$('#searchPop');if(!q){pop.classList.remove('open');return;}q=q.toLowerCase();const pts=D.patients.filter(p=>(p.name+p.mrn).toLowerCase().includes(q)).slice(0,5);const reps=D.reports.filter(r=>(r.patient+r.id).toLowerCase().includes(q)).slice(0,3);if(!pts.length&&!reps.length){pop.innerHTML=`<div class="search-res muted">No matches</div>`;pop.classList.add('open');return;}pop.innerHTML=pts.map(p=>`<div class="search-res" data-pt="${p.id}"><span class="pt-ava" style="width:26px;height:26px;background:${avColor(p.name)}">${initials(p.name)}</span><div><div style="font-weight:600;color:var(--ink)">${esc(p.name)}</div><div class="muted tnum" style="font-size:.74rem">${esc(p.mrn)}</div></div></div>`).join('')+reps.map(r=>`<div class="search-res" data-report="${esc(r.id)}"><span class="ci" style="width:26px;height:26px;border-radius:7px;background:var(--surface-2);display:grid;place-items:center;color:var(--teal-deep)">${svg(ICON.file,14)}</span><div><div style="font-weight:600;color:var(--ink)">${esc(r.id)}</div><div class="muted" style="font-size:.74rem">${esc(r.patient)}</div></div></div>`).join('');pop.classList.add('open');}

function delPatient(p){modal(`<div class="modal-h"><h3 style="font-size:1.05rem">Delete patient?</h3><p class="muted" style="font-size:.85rem;margin:4px 0 0">This removes ${esc(p.name)} and their study from your workspace.</p></div><div class="modal-f"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn danger" id="delYes">Delete</button></div>`);$('#delYes').onclick=()=>{D.patients=D.patients.filter(x=>x.id!==p.id);savePatients();logAudit('Deleted patient',p.name);closeModal();toast('Patient deleted');if(route==='patients')renderPatients();else go('patients');};}

/* ===================== GSAP motion layer =====================
   Vanilla-JS equivalent of the requested React setup: ScrollTrigger is
   registered once, every view's animations live in a gsap.context() scoped
   to that view, and the context is reverted on navigation (safe cleanup, no
   leaks). Respects prefers-reduced-motion. No layout/design changes — motion only. */
const GSAP_OK = typeof window!=='undefined' && !!window.gsap;
if(GSAP_OK && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
const EASE='power3.out';
let VIEW_CTX=null;
const prefersReduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function hoverGlow(sel,color){
  gsap.utils.toArray(sel).forEach(card=>{
    const base=getComputedStyle(card).boxShadow;
    card.addEventListener('mouseenter',()=>gsap.to(card,{boxShadow:`0 24px 55px -26px ${color}`,duration:.35,ease:'power2.out'}));
    card.addEventListener('mouseleave',()=>gsap.to(card,{boxShadow:base,duration:.45,ease:'power2.out'}));
  });
}
function staggerIn(sel,o={}){
  const items=gsap.utils.toArray(sel); if(!items.length)return;
  gsap.from(items,{y:o.y??22,opacity:0,duration:o.d??.6,stagger:o.stagger??.08,ease:EASE,clearProps:'transform,opacity',
    scrollTrigger:o.trigger?{trigger:o.trigger,start:o.start||'top 86%',once:true}:undefined});
}
function countUp(el,end){const s={v:0};gsap.to(s,{v:end,duration:1.1,ease:EASE,onUpdate:()=>{el.textContent=Math.round(s.v);}});}
function animate(route){
  if(VIEW_CTX){try{VIEW_CTX.revert();}catch(e){}VIEW_CTX=null;}
  if(!GSAP_OK || prefersReduced()) return;
  const el=document.getElementById('view-'+route); if(!el)return;
  VIEW_CTX=gsap.context(()=>{
    if(route==='home')animHome();
    else if(route==='dashboard')animDashboard();
    else if(route==='results')animResults();
    else if(route==='compare')animConsensus();
    if(window.ScrollTrigger)ScrollTrigger.refresh();
  },el);
}
function animHome(){
  gsap.from('.home-hero .eyebrow, .home-hero h1, .home-hero p, .home-hero .cta, .home-hero .hstats',
    {y:26,opacity:0,duration:.75,stagger:.09,ease:EASE,clearProps:'transform,opacity'});
  gsap.utils.toArray('.home-hero .hstats b').forEach(b=>countUp(b,parseInt(b.textContent,10)||0));
  gsap.to('.player',{yPercent:-5,ease:'none',scrollTrigger:{trigger:'.player',start:'top bottom',end:'bottom top',scrub:.6}});
  staggerIn('.cap-grid .cap',{trigger:'.cap-grid',y:26});
  staggerIn('.models-grid .mcard',{trigger:'.models-grid',y:28});
  gsap.from('.player',{y:34,opacity:0,duration:.7,ease:EASE,clearProps:'transform,opacity',scrollTrigger:{trigger:'.player',start:'top 90%',once:true}});
  hoverGlow('.mcard, .cap-grid .cap','rgba(14,168,150,.5)');
  const player=document.querySelector('.player');
  if(player){const base=getComputedStyle(player).boxShadow;
    player.addEventListener('mouseenter',()=>gsap.to(player,{y:-4,boxShadow:'0 34px 70px -30px rgba(16,32,56,.55)',duration:.4,ease:'power2.out'}));
    player.addEventListener('mouseleave',()=>gsap.to(player,{y:0,boxShadow:base,duration:.45,ease:'power2.out'}));}
}
function animDashboard(){
  gsap.from('#dashKpis .kpi',{y:22,opacity:0,duration:.6,stagger:.08,ease:EASE,clearProps:'transform,opacity'});
  gsap.from('#view-dashboard .grid-2 > .stack > .card, #view-dashboard .grid-2 > .stack .qa',
    {y:24,opacity:0,duration:.6,stagger:.06,ease:EASE,delay:.12,clearProps:'transform,opacity'});
  hoverGlow('#view-dashboard .qa','rgba(14,168,150,.45)');
}
function animResults(){
  gsap.from('#view-results .page-head',{y:18,opacity:0,duration:.5,ease:EASE,clearProps:'transform,opacity'});
  gsap.from('#view-results > .card, #view-results > .alert',{y:24,opacity:0,duration:.55,stagger:.09,ease:EASE,delay:.05,clearProps:'transform,opacity'});
  staggerIn('#view-results .grid-2 .card',{trigger:'#view-results .grid-2',y:26,stagger:.12});
}
function animConsensus(){
  gsap.from('#view-compare .page-head, #view-compare > .card',{y:22,opacity:0,duration:.6,stagger:.1,ease:EASE,clearProps:'transform,opacity'});
}
function animConsensusResult(){
  if(!GSAP_OK || prefersReduced()) return;
  gsap.from('#cmpResult .alert',{y:-10,opacity:0,duration:.5,ease:EASE,clearProps:'transform,opacity'});
  gsap.from('#cmpResult .grid-2 > .card',{y:30,opacity:0,scale:.985,duration:.6,stagger:.14,ease:EASE,delay:.08,clearProps:'transform,opacity,scale'});
  gsap.fromTo('#cmpResult .alert .ic',{scale:.82,opacity:0},{scale:1,opacity:1,duration:.5,ease:EASE,delay:.18});
  hoverGlow('#cmpResult .card','rgba(14,168,150,.55)');
}

/* ===================== HOME / LANDING ===================== */
const HOME = {
  copy: {
    hero:{tagline:"Clinical AI for brain MRI",headline:"Detect and classify brain tumours across an MRI series, one slice at a time.",sub:"Aurora is a clinical web console that runs a patient's MRI scan series through explainable AI models, scoring each slice for tumour type. It surfaces per-slice results, aggregate confidence, and heatmaps in a single report-ready view for the reviewing physician."},
    whatItDoes:[{title:"Upload",text:"Sign in, add a patient, and upload their MRI scan series in a few clicks."},{title:"Analyse",text:"Choose an AI model and its category set; Aurora scores every slice and aggregates the series."},{title:"Explain",text:"Read per-slice bars, an aggregate donut, and Grad-CAM heatmaps where available, with automatic alerts on low-confidence slices."},{title:"Report",text:"Generate a PDF report, record feedback, or run a Model Consensus across two models."}],
    models:[
      {name:"Sienna",isNew:false,categories:"Non-Tumor, MET, GBM · Pituitary, Meningioma, Glioma",heatmap:true,blurb:"A versatile multi-class classifier spanning two category sets, with Grad-CAM heatmaps for slice-level explainability. Best when you need broad tumour-type coverage from a single model."},
      {name:"NeuroXAI",isNew:false,categories:"Non-Tumor, MET, GBM",heatmap:true,blurb:"A ResNet-based classifier built for explainability, pairing tumour scoring with Grad-CAM heatmaps. Best when interpretability of each prediction is the priority."},
      {name:"Inception",isNew:false,categories:"Non-Tumor, MET, GBM",heatmap:true,blurb:"An InceptionV3-based classifier for Non-Tumor, MET, and GBM, with Grad-CAM heatmaps. A strong general-purpose second opinion on the same three classes."},
      {name:"End-to-End CNN",isNew:true,categories:"GBM, MET, Non-Tumor",heatmap:false,blurb:"A fast PyTorch model that classifies each slice across GBM, MET, and Non-Tumor in a single end-to-end pass. Best for quick three-class triage; no heatmap."},
      {name:"Model 1 CNN",isNew:true,categories:"Tumour, Non-Tumor",heatmap:false,blurb:"A lightweight PyTorch model for rapid tumour-versus-no-tumour screening. Best as a first-pass filter across a scan series; no heatmap."}
    ]
  },
  story:{steps:[
    {title:"Homepage",caption:"You land on the Aurora AI home — an overview of the platform and its five AI models.",url:"/"},
    {title:"Dashboard Overview",caption:"The dashboard summarises patients, recent analyses and average model confidence at a glance.",url:"/dashboard"},
    {title:"Key Insights",caption:"Drill into the aggregated class breakdown and the recommended next action.",url:"/dashboard/insights"},
    {title:"AI Analysis",caption:"Upload a scan series and run a model — including the two new PyTorch models.",url:"/analysis"},
    {title:"Model Consensus",caption:"Run two models on the same scans and confirm where they agree.",url:"/consensus"},
    {title:"Final Output",caption:"A concise, report-ready recommendation: top class, confidence and next step.",url:"/report"},
    {title:"Take Action",caption:"Export the PDF report, record feedback, or start the next analysis.",url:"/report"}
  ]}
};

let PLAYER={i:0,timer:null,steps:[]};
const PL_DUR=4600;
function wfRail(active){
  const items=[ICON.home,ICON.dashboard,ICON.scan,ICON.compare,ICON.reports];
  return `<div class="wf-rail"><div class="wf-brand">${svg(ICON.brain,15)}</div>${items.map((ic,k)=>`<div class="wf-rd ${k===active?'active':''}">${svg(ic,15)}</div>`).join('')}</div>`;
}
function wfBar(vec,opts={}){const t=vec.reduce((a,b)=>a+b,0)||1;return `<div class="wf-bar"${opts.full?' style="width:100%;height:9px"':''}>${vec.map((p,k)=>`<span style="width:${(p/t*100).toFixed(1)}%;background:${COLORS[k%COLORS.length]}"></span>`).join('')}</div>`;}
function wfShell(active,heading,loc,body){
  return `<div class="wf-screen">${wfRail(active)}<div class="wf-main"><div class="wf-head"><h4>${heading}</h4><span class="wf-loc">${loc}</span></div><div class="wf-body">${body}</div></div></div>`;
}
function frameVisual(i){
  switch(i){
    case 0: return wfShell(0,'Welcome to Aurora AI','Home',
      `<div class="wf-hero"><div><div class="wf-brand" style="width:46px;height:46px;margin:0 auto 12px">${svg(ICON.brain,24)}</div><div style="font-size:1.1rem;font-weight:800;color:var(--ink)">Aurora AI</div><div style="font-size:.82rem;color:var(--muted);margin:4px 0 14px">Clinical AI for brain-MRI tumour detection</div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">${[['5','models'],['2','new'],['16','patients']].map(s=>`<span class="wf-chip"><b style="color:var(--ink)">${s[0]}</b>&nbsp;${s[1]}</span>`).join('')}</div><span class="wf-cta">${svg(ICON.plus,15)} Start an analysis</span></div></div>`);
    case 1: return wfShell(1,'Dashboard Overview','Dashboard',
      `<div class="wf-kpis">${[['Patients','16'],['Analyses','9'],['Avg conf.','73%']].map(k=>`<div class="wf-kpi"><div class="l">${k[0]}</div><div class="v">${k[1]}</div></div>`).join('')}</div>
       <div class="wf-card"><div class="ct">Recent studies</div>${[['Marcus Delgado','MD',0,[.8,.15,.05]],['Priya Nair','PN',3,[.4,.5,.1]],['Kwame Osei','KO',6,[.1,.85,.05]]].map(r=>`<div class="wf-row"><span class="wf-ava" style="background:${AV_COLORS[r[2]%AV_COLORS.length]}">${r[1]}</span><span class="wf-name">${r[0]}</span>${wfBar(r[3])}</div>`).join('')}</div>`);
    case 2: return wfShell(1,'Key Insights','Dashboard',
      `<div class="wf-split"><div class="wf-donut">${donut([.6,.28,.12],['GBM','MET','NON'],118)}</div><div>${[['GBM','60%',0],['MET','28%',1],['NON','12%',2]].map(c=>`<div class="wf-krow"><span class="wf-sw" style="background:${COLORS[c[2]]}"></span><span class="wf-name">${c[0]}</span><b>${c[1]}</b></div>`).join('')}<div class="wf-chip hot" style="margin-top:10px">${svg(ICON.warn,12)}&nbsp;Recommend MDT review</div></div></div>`);
    case 3: return wfShell(2,'AI Analysis','New analysis',
      `<div class="wf-thumbs">${Array.from({length:6},(_,k)=>`<div class="wf-thumb">${scanSVG(k+2)}</div>`).join('')}</div>
       <div class="wf-opts">${[['Sienna',0],['NeuroXAI',0],['Inception',0],['End-to-End CNN',1],['Model 1 CNN',1]].map(m=>`<div class="wf-opt ${m[1]?'hot':''}"><span>${m[0]}</span>${m[1]?'<span class="wf-badge">NEW</span>':''}</div>`).join('')}</div>
       <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto"><div class="wf-result" style="opacity:0"><span class="wf-sw" style="background:${COLORS[0]}"></span>GBM · <b>85%</b> confidence</div><span class="wf-cta" style="padding:.42rem .85rem;font-size:.78rem">${svg(ICON.play,13)} Run prediction</span></div>`);
    case 4: return wfShell(3,'Model Consensus','Consensus',
      `<div class="wf-split" style="grid-template-columns:1fr 1fr">${[['Sienna',[.7,.2,.1]],['End-to-End CNN',[.66,.24,.1]]].map(m=>`<div class="wf-donut"><div class="wf-name" style="margin-bottom:4px">${m[0]}</div>${donut(m[1],['GBM','MET','NON'],94)}</div>`).join('')}</div><div class="wf-chip hot" style="margin-top:10px">${svg('<path d="M20 6 9 17l-5-5"/>',12)}&nbsp;Models agree · GBM</div>`);
    case 5: return wfShell(4,'Final Output','Reports',
      `<div class="wf-card"><div class="ct">Recommendation</div><div style="font-size:1.2rem;font-weight:800;color:var(--ink)">Glioblastoma (GBM)</div><div style="font-size:.8rem;color:var(--muted);margin:3px 0 10px">Top class · 85% mean confidence across 6 slices</div>${wfBar([.85,.1,.05],{full:true})}<div class="wf-chip" style="margin-top:12px">Next step: refer to neuro-oncology MDT</div></div>`);
    default: return wfShell(4,'Next Steps','Reports',
      `<div class="wf-actions">${[[ICON.file,'Export PDF'],[ICON.refresh,'Record feedback'],[ICON.plus,'New analysis']].map(a=>`<div class="wf-action"><div class="ic">${svg(a[0],18)}</div>${a[1]}</div>`).join('')}</div>`);
  }
}
function revealPlayer(){ const p=$('#plPoster'); if(p)p.classList.add('hide'); const c=$('#plCursor'); if(c&&GSAP_OK)gsap.to(c,{opacity:1,duration:.3}); }
function typeUrl(text){ const u=$('#plUrl'); if(!u)return; if(!GSAP_OK||prefersReduced()){u.textContent=text;return;} clearInterval(u._t); let n=0; u.textContent=''; u._t=setInterval(()=>{ n++; u.textContent=text.slice(0,n)+(n<text.length?'▏':''); if(n>=text.length){clearInterval(u._t);u.textContent=text;} },20); }
/* per-step in-screen elements the cursor clicks (after navigating via the sidebar) */
const CURSOR_TARGETS={0:['.wf-cta'],1:['.wf-card .wf-row'],2:['.wf-chip.hot'],3:['.wf-opt.hot','.wf-cta'],4:['.wf-chip.hot'],5:['.wf-chip'],6:['.wf-action']};
function ripple(x,y){const r=$('#plClick');if(r){gsap.set(r,{x,y,scale:.3,opacity:.85});gsap.to(r,{scale:1.5,opacity:0,duration:.5,ease:'power2.out'});}}
function press(el){if(el)gsap.fromTo(el,{scale:1},{scale:.95,duration:.12,ease:'power1.inOut',yoyo:true,repeat:1,transformOrigin:'50% 50%'});}
const STEP_TOAST={0:'New analysis started',1:'Opening patient · Marcus Delgado',2:'Flagged for MDT review',3:'Prediction complete · GBM 85%',4:'Consensus reached · GBM',5:'Referral drafted',6:'Report exported (PDF)'};
function reactClick(el){ if(!el)return; el.classList.add('wf-clicked'); setTimeout(()=>el.classList.remove('wf-clicked'),650); if(el.classList.contains('wf-opt'))el.classList.add('picked'); }
function wfToast(msg){ const el=$('#plToast'); if(!el)return; el.innerHTML=`<span class="d"></span>${esc(msg)}`; if(!GSAP_OK||prefersReduced()){el.style.opacity='1';return;} gsap.killTweensOf(el); gsap.fromTo(el,{opacity:0,y:10},{opacity:1,y:0,duration:.35,ease:'power2.out'}); gsap.to(el,{opacity:0,y:8,duration:.4,delay:1.9,ease:'power2.in'}); }
/* steps that show a brief processing state before the result toast */
const STEP_PROCESS={3:{proc:'Analysing 6 slices…',done:'Prediction complete · GBM 85%'},6:{proc:'Generating report…',done:'Report exported (PDF)'}};
function wfProcess(msg,cb){ const el=$('#plProc'); if(!el){cb&&cb();return;} const m=$('#plProcMsg'); if(m)m.textContent=msg; if(!GSAP_OK||prefersReduced()){cb&&cb();return;} gsap.killTweensOf(el); gsap.fromTo(el,{opacity:0,scale:.96},{opacity:1,scale:1,duration:.3,ease:'power2.out'}); gsap.to(el,{opacity:0,scale:.97,duration:.35,delay:1.05,ease:'power2.in',onComplete:()=>{cb&&cb();}}); }
function revealResult(i){ if(i!==3)return; const r=document.querySelector('#plScreen .frame[data-fr="3"] .wf-result'); if(!r)return; if(GSAP_OK&&!prefersReduced())gsap.fromTo(r,{opacity:0,x:-8},{opacity:1,x:0,duration:.4,ease:'power2.out'}); else r.style.opacity='1'; }
function stepFeedback(i){ const p=STEP_PROCESS[i]; if(p){wfProcess(p.proc,()=>{wfToast(p.done);revealResult(i);});} else if(STEP_TOAST[i]){wfToast(STEP_TOAST[i]);} }
function cursorTour(fr){
  if(!GSAP_OK||prefersReduced())return;
  const scr=$('#plScreen'),cur=$('#plCursor'); if(!scr||!cur)return;
  if(PLAYER.tour)PLAYER.tour.kill();
  const seq=[];
  const dot=fr.querySelector('.wf-rd.active'); if(dot)seq.push(dot);                 // 1) navigate via sidebar
  (CURSOR_TARGETS[PLAYER.i]||[]).forEach(sel=>{const el=fr.querySelector(sel); if(el)seq.push(el);}); // 2) click in-screen controls
  if(!seq.length)return;
  const pos=el=>{const sr=$('#plScreen').getBoundingClientRect(),r=el.getBoundingClientRect();return {x:r.left-sr.left+r.width/2,y:r.top-sr.top+Math.min(r.height/2,18)};};
  const tl=gsap.timeline({delay:.4}); PLAYER.tour=tl;
  seq.forEach((el,idx)=>{
    const isLast=idx===seq.length-1;
    tl.to(cur,{x:()=>pos(el).x-5,y:()=>pos(el).y-3,opacity:1,duration:idx===0?.5:.55,ease:'power2.inOut'}, idx===0?0:'+=0.14');
    tl.add(()=>{const p=pos(el);gsap.fromTo(cur,{scale:1},{scale:.86,duration:.1,yoyo:true,repeat:1,ease:'power1.inOut'});ripple(p.x,p.y);press(el);reactClick(el);if(isLast)stepFeedback(PLAYER.i);});
  });
}
function resetFrameState(fr){ fr.querySelectorAll('.picked').forEach(el=>el.classList.remove('picked')); fr.querySelectorAll('.wf-result').forEach(el=>{el.style.opacity='0';}); }
function showFrame(i){
  PLAYER.i=i;
  const frames=$$('#plScreen .frame');
  frames.forEach(f=>f.classList.toggle('on',+f.dataset.fr===i));
  const s=PLAYER.steps[i];
  typeUrl('aurora.health'+(s.url||''));
  const cc=$('#plCount'); if(cc)cc.textContent='Step '+(i+1)+' of '+PLAYER.steps.length;
  const playing=!!PLAYER.playing;
  $$('#plBar .wf-seg').forEach((seg,k)=>{
    const fill=seg.querySelector('i'); seg.classList.toggle('active',k===i); seg.classList.toggle('done',k<i);
    if(!fill)return;
    if(k<i)fill.style.width='100%';
    else if(k>i)fill.style.width='0%';
    else if(playing && GSAP_OK && !prefersReduced()){gsap.killTweensOf(fill);gsap.fromTo(fill,{width:'0%'},{width:'100%',duration:PL_DUR/1000,ease:'none'});}
    else fill.style.width='100%';
  });
  const fr=frames[i];
  if(fr)resetFrameState(fr);
  if(fr && GSAP_OK && !prefersReduced()){
    const scr=fr.querySelector('.wf-screen');
    if(scr)gsap.fromTo(scr,{opacity:0,scale:1.04},{opacity:1,scale:1,duration:.5,ease:'power2.out',transformOrigin:'50% 45%',clearProps:'opacity,transform'}); // subtle zoom + fade
    gsap.fromTo(fr.querySelectorAll('.wf-head, .wf-body > *'),{y:12},{y:0,duration:.45,stagger:.05,ease:'power2.out',delay:.08,clearProps:'transform'}); // slide
    const cap=fr.querySelector('.cap'); if(cap)gsap.fromTo(cap,{opacity:0,y:10},{opacity:1,y:0,duration:.45,ease:'power2.out',delay:.12,clearProps:'transform,opacity'});
    const dot=fr.querySelector('.wf-rd.active'); if(dot)gsap.fromTo(dot,{scale:.82},{scale:1,duration:.4,ease:'power2.out',delay:.1});
  }
  if(fr && $('#plPoster')&&$('#plPoster').classList.contains('hide')) cursorTour(fr);
}
function playPlayer(){ if(!PLAYER.steps.length)return; revealPlayer(); PLAYER.playing=true; const pb=$('#plPlay'); if(pb)pb.innerHTML=svg(ICON.pause,18); showFrame(PLAYER.i); clearInterval(PLAYER.timer); if(prefersReduced()){PLAYER.timer=null;PLAYER.playing=false;return;} PLAYER.timer=setInterval(()=>showFrame((PLAYER.i+1)%PLAYER.steps.length),PL_DUR); }
function pausePlayer(){ clearInterval(PLAYER.timer); PLAYER.timer=null; PLAYER.playing=false; if(PLAYER.tour)PLAYER.tour.kill(); const pb=$('#plPlay'); if(pb)pb.innerHTML=svg(ICON.play,18); }
function stopPlayer(){ clearInterval(PLAYER.timer); PLAYER.timer=null; PLAYER.playing=false; if(PLAYER.tour)PLAYER.tour.kill(); }
function buildPlayer(steps){
  PLAYER.steps=steps; PLAYER.i=0; PLAYER.playing=false;
  $('#plScreen').innerHTML=steps.map((s,i)=>`<div class="frame" data-fr="${i}">${frameVisual(i)}<div class="cap"><div class="t">${s.title}</div><div class="c">${s.caption}</div></div></div>`).join('')
    +`<svg class="wf-cursor" id="plCursor" viewBox="0 0 24 24" width="22" height="22" fill="#fff" stroke="#0f2038" stroke-width="1.3" stroke-linejoin="round"><path d="M5 3l6 16 2.4-6.6L20 10z"/></svg><div class="wf-click" id="plClick"></div><div class="wf-toast" id="plToast"></div><div class="wf-proc" id="plProc"><span class="wf-proc-sp"></span><span id="plProcMsg"></span></div>`
    +`<div class="poster" id="plPoster"><div class="poster-in"><div class="pc">${svg(ICON.play,30)}</div><div class="poster-lbl">Play the guided tour</div></div></div>`;
  $('#plBar').innerHTML=steps.map((s,i)=>`<div class="wf-seg" data-seg="${i}" title="${esc(s.title)}"><i></i></div>`).join('');
  showFrame(0);
  $('#plPoster').onclick=playPlayer;
  $('#plPlay').onclick=()=>PLAYER.timer?pausePlayer():playPlayer();
  $('#plPrev').onclick=()=>{revealPlayer();pausePlayer();showFrame((PLAYER.i-1+steps.length)%steps.length);};
  $('#plNext').onclick=()=>{revealPlayer();pausePlayer();showFrame((PLAYER.i+1)%steps.length);};
  $('#plBar').onclick=e=>{const seg=e.target.closest('.wf-seg');if(seg){revealPlayer();pausePlayer();showFrame(+seg.dataset.seg);}};
}
function renderHome(){
  const c=HOME.copy, story=HOME.story;
  $('#view-home').innerHTML=`
    <div class="home-hero"><div class="z">
      <p class="eyebrow">${esc(c.hero.tagline)}</p>
      <h1>${esc(c.hero.headline)}</h1>
      <p>${esc(c.hero.sub)}</p>
      <div class="cta">
        <button class="btn onhero" data-route="add-patient">${svg(ICON.plus,16)} Start an analysis</button>
        <button class="btn ghosthero" id="watchBtn">${svg(ICON.play,16)} Watch walkthrough</button>
        <button class="btn ghosthero" data-route="dashboard">Go to dashboard →</button>
      </div>
      <div class="hstats">${[['5','AI models'],['2','new this release'],['16','demo patients']].map(s=>`<div class="s"><b class="tnum">${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
    </div></div>

    <div class="sec-title"><h2>What Aurora does</h2></div>
    <div class="cap-grid">${c.whatItDoes.map((w,i)=>`<div class="cap"><div class="ic">${svg([ICON.scan,ICON.brain,ICON.eye,ICON.file][i]||ICON.dashboard,20)}</div><h4>${esc(w.title)}</h4><p>${esc(w.text)}</p></div>`).join('')}</div>

    <div class="sec-title"><h2>The models</h2><p>Five models — two new this release</p></div>
    <div class="models-grid">${c.models.map(m=>`<div class="mcard ${m.isNew?'new':''}"><div class="mh"><div class="mi">${svg(ICON.brain,20)}</div><h3>${esc(m.name)}</h3>${m.isNew?'<span class="chip new">NEW</span>':'<span class="chip">Original</span>'}</div><div class="mtags"><span class="chip">${esc(m.categories)}</span><span class="chip ${m.heatmap?'good':''}">${m.heatmap?'Grad-CAM heatmap':'No heatmap'}</span></div><p>${esc(m.blurb)}</p></div>`).join('')}</div>

    <div class="sec-title"><h2>Guided walkthrough</h2><p>A quick tour of the console</p></div>
    <div class="player">
      <div class="chrome"><div class="dots"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div><div class="urlbar" id="plUrl">aurora.health/</div><div class="wf-live"><span></span>Demo</div></div>
      <div class="screen" id="plScreen"></div>
      <div class="controls">
        <button class="pbtn" id="plPlay" aria-label="Play or pause walkthrough">${svg(ICON.play,18)}</button>
        <button class="pbtn" id="plPrev" aria-label="Previous step">${svg('<path d="M15 18l-6-6 6-6"/>',18)}</button>
        <div class="wf-timeline" id="plBar"></div>
        <button class="pbtn" id="plNext" aria-label="Next step">${svg('<path d="M9 18l6-6-6-6"/>',18)}</button>
        <span class="pcount" id="plCount">Step 1 of ${story.steps.length}</span>
      </div>
    </div>`;
  buildPlayer(story.steps);
  $('#watchBtn').onclick=()=>{document.querySelector('.player').scrollIntoView({behavior:'smooth',block:'center'});playPlayer();};
}

/* ---- auth + init ---- */
function login(){
  $('#authScreen').style.display='none';$('#appShell').hidden=false;
  try{ buildRail(); fillUser(); go('home'); logAudit('Signed in',''); }
  catch(err){ console.error('dashboard render failed',err); const c=document.querySelector('.content'); if(c)c.innerHTML='<div class="card pad" style="margin:24px;max-width:480px">Something went wrong loading the dashboard. Please <a href="?r='+Date.now()+'">reload</a>.</div>'; }
  try{if(!localStorage.getItem(LS.tour))setTimeout(startTour,700);}catch(e){}
}
document.addEventListener('DOMContentLoaded',()=>{
  // wire sign-in first so the app is always usable, even if later setup hiccups
  $('#signInBtn').onclick=login; $('#quickIn').onclick=e=>{e.preventDefault();login();};
  $('#authPass').addEventListener('keydown',e=>{if(e.key==='Enter')login();});
  $$('#authScreen [data-count]').forEach(e=>animateCount(e,e.dataset.count));
  try{ const stored=loadPatients(); if(stored)D.patients=stored; loadAudit();
    if(D.patients.some(isBorderline)){if($('#notifDot'))$('#notifDot').style.display='';}else if($('#notifDot'))$('#notifDot').style.display='none';
  }catch(e){console.error('init warn',e);}

  document.addEventListener('click',e=>{
    const rl=e.target.closest('[data-route]'); if(rl){if(rl.dataset.route==='add-patient')resetWizard();go(rl.dataset.route);return;}
    const actBtn=e.target.closest('[data-act]');
    if(actBtn){e.stopPropagation();const p=D.patients.find(x=>x.id===actBtn.dataset.pt);if(!p)return;if(actBtn.dataset.act==='view')go('results',p);else if(actBtn.dataset.act==='fb')feedbackModal(p);else if(actBtn.dataset.act==='del')delPatient(p);return;}
    const tr=e.target.closest('tr[data-pt]'); const nt=e.target.closest('.notif[data-pt]'); const sr=e.target.closest('.search-res[data-pt]');
    const ptId=(tr&&tr.dataset.pt)||(nt&&nt.dataset.pt)||(sr&&sr.dataset.pt);
    if(ptId){const p=D.patients.find(x=>x.id===ptId);if(p){closeNotif();$('#searchPop').classList.remove('open');go('results',p);}return;}
    const rep=e.target.closest('[data-report]'); if(rep){$('#searchPop').classList.remove('open');go('reports');toast('Opening '+rep.dataset.report+'…');}
    const th=e.target.closest('th.sortable'); if(th){const k=th.dataset.sort;if(patientSort.key===k)patientSort.dir=patientSort.dir==='asc'?'desc':'asc';else patientSort={key:k,dir:'asc'};renderPatients();}
    const pg=e.target.closest('[data-pg]'); if(pg){patientPage+=pg.dataset.pg==='next'?1:-1;renderPatients();}
    const thumb=e.target.closest('.thumb'); if(thumb){const i=+thumb.dataset.thumb;if(wizard.selected.has(i))wizard.selected.delete(i);else wizard.selected.add(i);thumb.classList.toggle('sel');updateScanCount();}
    if(!e.target.closest('#notifBtn,#notifPanel'))closeNotif();
    if(!e.target.closest('.search'))$('#searchPop').classList.remove('open');
  });
  $('#aboutBtn').onclick=()=>go('about');
  $('#userChip').onclick=()=>go('settings');
  $('#railAva').onclick=()=>go('settings');
  $('#notifBtn').onclick=e=>{e.stopPropagation();toggleNotif();};
  $('#cmdkBtn').onclick=openCmd;
  $('#cmdkScrim').onclick=e=>{if(e.target.id==='cmdkScrim')closeCmd();};
  $('#cmdkScrim').addEventListener('click',e=>{const it=e.target.closest('.cmdk-item[data-i]');if(it)runCmd(+it.dataset.i);});

  document.addEventListener('input',e=>{
    if(e.target.id==='patientSearch'){patientQuery=e.target.value;patientPage=1;renderPatients();}
    if(e.target.id==='globalSearch'){patientQuery=e.target.value;renderSearchPop(e.target.value);}
    if(e.target.id==='apName')wizard.name=e.target.value;
    if(e.target.id==='apAge')wizard.age=e.target.value;
  });
  document.addEventListener('click',e=>{
    const ft=e.target.closest('#patientFilter .tab'); if(ft){patientFilter=ft.dataset.f;patientPage=1;$$('#patientFilter .tab').forEach(t=>t.classList.toggle('active',t===ft));renderPatients();}
    const st=e.target.closest('#settingsTabs .tab'); if(st){settingsTab=st.dataset.s;renderSettings();}
  });

  // add-patient upload
  const fileInput=document.createElement('input');fileInput.type='file';fileInput.multiple=true;fileInput.accept='image/png,image/jpeg,.dcm,.dicom';fileInput.style.display='none';document.body.appendChild(fileInput);
  fileInput.onchange=()=>{const files=[...fileInput.files];if(!files.length)return;const imgs=[];let pending=files.length;files.forEach((f,idx)=>{if(/^image\//.test(f.type)){const rd=new FileReader();rd.onload=()=>{imgs[idx]=rd.result;if(--pending===0)finishUpload(imgs);};rd.readAsDataURL(f);}else{imgs[idx]=null;if(--pending===0)finishUpload(imgs);}});};
  function finishUpload(imgs){wizard.images=imgs;wizard.scans=imgs.length;renderAddPatient();toast(imgs.length+' scan(s) uploaded');}
  $('#dropzone').onclick=()=>fileInput.click();
  $('#dropzone').addEventListener('dragover',e=>{e.preventDefault();$('#dropzone').classList.add('over');});
  $('#dropzone').addEventListener('dragleave',()=>$('#dropzone').classList.remove('over'));
  $('#dropzone').addEventListener('drop',e=>{e.preventDefault();$('#dropzone').classList.remove('over');const files=[...(e.dataTransfer?.files||[])].filter(f=>/^image\//.test(f.type));if(files.length){const imgs=[];let pending=files.length;files.forEach((f,i)=>{const rd=new FileReader();rd.onload=()=>{imgs[i]=rd.result;if(--pending===0)finishUpload(imgs);};rd.readAsDataURL(f);});}else{wizard.images=null;wizard.scans=12;renderAddPatient();toast('Sample MRI series loaded (12 slices)');}});
  // sample-series shortcut link injected under dropzone
  const dz=$('#dropzone');const sample=document.createElement('div');sample.style.cssText='text-align:center;margin-top:10px;font-size:.82rem';sample.innerHTML='No scans handy? <a href="#" id="loadSample">Load a sample series</a>';dz.parentElement.insertBefore(sample,dz.nextSibling);
  document.addEventListener('click',e=>{if(e.target.id==='loadSample'){e.preventDefault();wizard.images=null;wizard.scans=12;renderAddPatient();toast('Sample MRI series loaded (12 slices)');}});

  $('#apSex')&&$('#apSex').addEventListener('change',e=>wizard.sex=e.target.value);
  $('#apNext').onclick=()=>{if(!wizard.scans){toast('Upload a scan series first');return;}wizard.name=$('#apName').value||'New Patient';wizard.age=$('#apAge').value;wizard.sex=$('#apSex').value;go('image-selection');};
  $('#selectAllBtn').onclick=()=>{const all=wizard.selected.size===wizard.scans;wizard.selected=all?new Set():new Set(Array.from({length:wizard.scans},(_,i)=>i));$$('#scanThumbs .thumb').forEach((t,i)=>t.classList.toggle('sel',wizard.selected.has(i)));updateScanCount();$('#selectAllBtn').textContent=all?'Select all':'Deselect all';};
  $('#modelSel').onchange=e=>{wizard.model=e.target.value;buildLabelSel();renderExplainer();};
  $('#labelSel').onchange=e=>{wizard.label=e.target.value;renderExplainer();};
  $('#runBtn').onclick=()=>{if(!wizard.selected.size){toast('Select at least one slice');return;}runPrediction();};

  // compare
  $('#cmpRun').onclick=()=>{runCompare();animConsensusResult();};
  // audit
  $('#auditClear').onclick=()=>{AUDIT=[];try{localStorage.removeItem(LS.audit);}catch(e){}renderAudit();toast('Audit log cleared');};

  // keyboard
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if($('#cmdkScrim').classList.contains('open'))closeCmd();else openCmd();return;}
    if($('#cmdkScrim').classList.contains('open')){
      if(e.key==='Escape')closeCmd();
      else if(e.key==='ArrowDown'){e.preventDefault();cmdSel=Math.min(cmdSel+1,cmdItems.length-1);markCmd();$$('#cmdkList .cmdk-item.sel')[0]?.scrollIntoView({block:'nearest'});}
      else if(e.key==='ArrowUp'){e.preventDefault();cmdSel=Math.max(cmdSel-1,0);markCmd();$$('#cmdkList .cmdk-item.sel')[0]?.scrollIntoView({block:'nearest'});}
      else if(e.key==='Enter'){e.preventDefault();runCmd(cmdSel);}
      return;
    }
    if(e.key==='Escape'){closeModal();closeNotif();$('#searchPop').classList.remove('open');if($('#tourScrim').classList.contains('open'))endTour();}
  });
});

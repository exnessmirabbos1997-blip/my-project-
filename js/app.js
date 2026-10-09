const $=id=>document.getElementById(id);
const fmt=(x,d=1)=>Number(x).toFixed(d).replace('.',',');
const nb=(v,d)=>isFinite(v)?fmt(v,d):'NaN';
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const tick=()=>new Promise(r=>setTimeout(r,0));
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const TAGS={
 anon:{title:'Yengil kondensat ombori A va B',disp:'Ekran 1',tk:['T-1A','T-1B'],LI:['LI-101','LI-201'],PI:['PI-102','PI-202'],TI:['TI-103','TI-203'],S1:['104','204'],S2:['105','205'],PP:['102','202'],
  XVin:['HS-106','HS-107'],XVout:['HS-108','HS-109'],ZI:'ZI-110',P1:'P-1',P2:'P-1S',XL1:'XL-111',XL2:'XL-112',FQI:'FQI-113',RST:'HS-155',RSTL:'QAYTA TIKLASH',NORM:'NORMAL',sep:'-',PCV:['PCV-115','PCV-116'],PVSV:['PVSV-101','PVSV-102'],FO:'FO-153',PSV:'PSV-116',
  src1a:'Yengil kondensat',src1b:'1-manbadan',src1t:'M-1',src2a:'Yengil kondensat',src2b:'2-manbadan',src2t:'M-2',dest1:'Yengil kondensat',dest2:'vagon quyish stansiyasiga',fqi1:'Kondensat',fqi2:'ishlab chiqarish',fqiU:'m³/sutka',
  dest:'Vagon quyish stansiyasiga',fqiL:'Kondensat ishlab chiqarish'}
};
// Haqiqiy (korxona) teglari kodda ochiq turmaydi: js/tags-enc.js da AES-GCM bilan shifrlangan, parol kiritilgach xotirada ochiladi (js/vault.js).
const TG=()=>TAGS[$('tags').value]||TAGS.anon;
const XN=['Chegaraga yaqinlik (x₁)','Trip’gacha vaqt (x₂)','Anomaliya (x₃)','DCS–SIS tafovuti (x₄)'];
const SIFL=['LALL (sath past-past, SIS)','LAHH (sath yuqori-yuqori, SIS)','PVSV vakuum (−1,8 kPag)'];
const SIFK=['LALL','LAHH','PVSV vakuum'];
const PDEF=plantDefaults();
let P={...PDEF},simModel=null,model=null,cur=null,prog=0,hover=-1,timer=null,mode='sim',lastBatch=null,working=false,geo=null,lastW=0;
const tx=s=>window.tr?window.tr(s):s;   // i18n.js app.js dan keyin yuklanadi — yuklanish paytida tr yo'q
// Holat turlari: nomlarini o'zgartirish va o'z nomli holatlar qo'shish (har biri asosiy modellardan biriga tayanadi)
const KDEF={...KINDS},KBASE=Object.keys(KDEF),KIND_KEY='qkinds',KC_KEY='qkinds_custom';
let KC=[];
const lsGet=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
const cleanName=s=>String(s).replace(/[<>&"'`]/g,'').trim().slice(0,80);
function kindsLoad(){Object.assign(KINDS,KDEF);for(const k of Object.keys(KINDS))if(!KBASE.includes(k))delete KINDS[k];
  const n=lsGet(KIND_KEY,{});if(n&&typeof n==='object')for(const k of KBASE)if(typeof n[k]==='string'&&cleanName(n[k]))KINDS[k]=cleanName(n[k]);
  const c=lsGet(KC_KEY,[]);KC=(Array.isArray(c)?c:[]).filter(x=>x&&/^c\d{1,4}$/.test(x.id)&&typeof x.name==='string'&&cleanName(x.name)&&KBASE.includes(x.base)).slice(0,20).map(x=>({id:x.id,name:cleanName(x.name),base:x.base}));
  for(const x of KC)KINDS[x.id]=x.name}
const kindBase=k=>{const c=KC.find(x=>x.id===k);return c?c.base:k};
function kindsRebuild(){const s=$('kind'),keep=s.value||'f4';s.textContent='';for(const k in KINDS){const o=document.createElement('option');o.value=k;o.textContent=KINDS[k];s.appendChild(o)}
  s.value=KINDS[keep]!==undefined?keep:'f4';
  const box=$('knBox');if(!box)return;box.textContent='';
  for(const k of KBASE){const l=document.createElement('label');l.textContent=KDEF[k];l.htmlFor='kn_'+k;const i=document.createElement('input');i.type='text';i.id='kn_'+k;i.maxLength=80;i.value=KINDS[k];i.className='kni';box.append(l,i)}
  const cl=$('kcList');cl.textContent='';for(const x of KC){const li=document.createElement('li');li.textContent=x.name+' — '+KDEF[x.base]+' ';const b=document.createElement('button');b.type='button';b.className='sec';b.textContent=tx('O‘chirish');b.onclick=()=>{KC=KC.filter(y=>y.id!==x.id);lsSet(KC_KEY,KC);kindsLoad();kindsRebuild()};li.appendChild(b);cl.appendChild(li)}}
kindsLoad();kindsRebuild();$('kind').value='f4';$('ftank').value='1';
{const sel=$('kcBase');for(const k of KBASE){const o=document.createElement('option');o.value=k;o.textContent=KDEF[k];sel.appendChild(o)}}
$('knSave').onclick=()=>{const n={};for(const k of KBASE){const v=cleanName($('kn_'+k).value);if(v&&v!==KDEF[k])n[k]=v}
  if(!lsSet(KIND_KEY,n)){$('knMsg').textContent=tx('Xato: brauzer xotirasi yopiq, saqlanmadi.');return}kindsLoad();kindsRebuild();$('knMsg').textContent=tx('Saqlandi.');if(cur)render()};
$('knReset').onclick=()=>{try{localStorage.removeItem(KIND_KEY)}catch(e){}kindsLoad();kindsRebuild();$('knMsg').textContent=tx('Asl nomlar tiklandi.');if(cur)render()};
$('kcAdd').onclick=()=>{const nm=cleanName($('kcName').value);if(!nm){$('knMsg').textContent=tx('Holat nomini yozing.');return}if(KC.length>=20){$('knMsg').textContent=tx('Ko‘pi bilan 20 ta o‘z holati.');return}
  let id=1;while(KC.some(x=>x.id==='c'+id))id++;KC.push({id:'c'+id,name:nm,base:$('kcBase').value});
  if(!lsSet(KC_KEY,KC)){KC.pop();$('knMsg').textContent=tx('Xato: brauzer xotirasi yopiq, saqlanmadi.');return}kindsLoad();kindsRebuild();$('kind').value='c'+id;$('kcName').value='';$('knMsg').textContent=tx('Qo‘shildi va tanlandi.')};
$('kindEdit').onclick=()=>{showView('settings');const e=$('knCard');if(e)e.scrollIntoView({block:'start'})};
function readP(){const raw=[1,2,3,4].map(i=>+$('w'+i).value);const s=raw.reduce((a,b)=>a+b,0)||1;P.w=raw.map(x=>x/s);raw.forEach((x,i)=>$('w'+(i+1)+'v').textContent=fmt(P.w[i],2));
  P.RTH=+$('rth').value;$('rthv').textContent=fmt(P.RTH,2);P.sev=+$('sev').value;$('sevv').textContent=P.sev>0?fmt(P.sev,2):'tasodifiy';P.noise=+$('noise').value;$('noisev').textContent='×'+fmt(P.noise,2)}
function readPlant(){const g=(id,def)=>{const v=parseFloat($(id).value);return isFinite(v)?v:def};
  P.V=Math.max(10,g('pV',PDEF.V));P.Qr=Math.max(0,g('pQr',PDEF.Qr));P.Qprod=Math.max(0,g('pQprod',PDEF.Qprod));P.Qpump=Math.max(1,g('pQpump',PDEF.Qpump));P.P0=g('pP0',PDEF.P0);
  P.LAL=g('pLAL',PDEF.LAL);P.LALL=g('pLALL',PDEF.LALL);P.LAH=g('pLAH',PDEF.LAH);P.LAHH=g('pLAHH',PDEF.LAHH);P.PAL=g('pPAL',PDEF.PAL);P.PALL=g('pPALL',PDEF.PALL);
  P.Th=Math.max(5,g('pTh',PDEF.Th));P.Tresp=Math.max(1,g('pTresp',PDEF.Tresp));P.vote=$('pVote').value;
  const bad=[];if(!(P.LALL<P.LAL))bad.push('LALL < Low alarm bo‘lishi kerak');if(!(P.LAH<P.LAHH))bad.push('High alarm < LAHH bo‘lishi kerak');if(!(P.PALL<P.PAL))bad.push('PALL alarm < PAL alarm bo‘lishi kerak');if(!(P.PV<P.PALL))bad.push('PALL alarm vakuum chegarasidan (−1,8) yuqori bo‘lishi kerak');if(!(P.LAL<P.LAH))bad.push('Low alarm < High alarm bo‘lishi kerak');return bad}
// ---------- grafik ----------
function setup(cv){const r=Math.min(devicePixelRatio||1,3),h=+(cv.dataset.h||(cv.dataset.h=cv.getAttribute('height')));cv.style.height=h+'px';const w=cv.clientWidth;cv.width=Math.round(w*r);cv.height=Math.round(h*r);const g=cv.getContext('2d');g.setTransform(r,0,0,r,0,0);return {g,w,h}}
function draw(cv,o){
  const {g,w,h}=setup(cv);const m={l:40,r:10,t:8,b:22};const pw=w-m.l-m.r,ph=h-m.t-m.b;
  const T=o.ys[0].y.length,dt=P.dt,tm=(T-1)*dt;const X=k=>m.l+pw*k/(T-1),Y=v=>m.t+ph*(1-(v-o.min)/(o.max-o.min));
  g.font='12px "Segoe UI",sans-serif';g.lineWidth=1;g.strokeStyle=css('--line');g.fillStyle=css('--mut');g.textAlign='right';g.textBaseline='middle';
  for(let i=0;i<=4;i++){const v=o.min+(o.max-o.min)*i/4,y=Y(v);g.beginPath();g.moveTo(m.l,y);g.lineTo(w-m.r,y);g.stroke();g.fillText(fmt(v,o.dec),m.l-6,y)}
  g.textAlign='center';g.textBaseline='top';const nt=w<520?3:6;
  for(let i=0;i<=nt;i++){const k=(T-1)*i/nt,mins=tm*i/nt;g.fillText(tm>180?fmt(mins/60,0)+' soat':fmt(mins,0)+' min',Math.min(Math.max(X(k),m.l+14),w-m.r-18),h-m.b+5)}
  for(const l of o.lines){if(!isFinite(l.v)||l.v<o.min||l.v>o.max)continue;g.strokeStyle=l.c;g.setLineDash(l.dash||[5,4]);g.beginPath();g.moveTo(m.l,Y(l.v));g.lineTo(w-m.r,Y(l.v));g.stroke();g.setLineDash([]);g.fillStyle=l.c;g.textAlign=l.r?'right':'left';g.textBaseline='bottom';g.fillText(l.t,l.r?w-m.r-6:m.l+6,Y(l.v)-2)}
  for(const v of o.vl){if(v.k<0||v.k>=T)continue;g.strokeStyle=v.c;g.setLineDash(v.dash||[]);g.lineWidth=v.wd||1;g.beginPath();g.moveTo(X(v.k),m.t);g.lineTo(X(v.k),h-m.b);g.stroke();g.setLineDash([]);g.lineWidth=1}
  const n=Math.min(prog+1,T);
  for(const s of o.ys){g.strokeStyle=s.c;g.lineWidth=s.wd||1.6;g.globalAlpha=s.a||1;g.setLineDash(s.dash||[]);g.beginPath();let pen=false;
    for(let k=0;k<n;k++){const v=s.y[k];if(!isFinite(v)){pen=false;continue}const y=Y(clip(v,o.min,o.max));if(pen)g.lineTo(X(k),y);else{g.moveTo(X(k),y);pen=true}}g.stroke();g.globalAlpha=1;g.setLineDash([])}
  g.lineWidth=1;
  for(const p of o.pts){if(p.k<0||p.k>=n)continue;const v=o.ys[0].y[p.k];if(!isFinite(v))continue;g.fillStyle=p.c;g.beginPath();g.arc(X(p.k),Y(clip(v,o.min,o.max)),5,0,7);g.fill()}
  if(hover>=0&&hover<n){g.strokeStyle=css('--ink');g.globalAlpha=.4;g.beginPath();g.moveTo(X(hover),m.t);g.lineTo(X(hover),h-m.b);g.stroke();g.globalAlpha=1;
    const v=o.ys[0].y[hover];g.fillStyle=css('--ink');g.textAlign=X(hover)>w/2?'right':'left';g.textBaseline='top';g.fillText(nb(v,o.dec)+' | '+fmt(hover*dt,1)+' min',X(hover)+(X(hover)>w/2?-6:6),m.t+2)}
  return {m,pw,T};
}
const nT=()=>cur.run.tanks.length;
const timeK=()=>{const T=cur.run.tanks[0].Ld.length;return hover>=0?hover:Math.min(prog,T-1)};
const ct=()=>Math.min(+$('ctank').value,nT()-1);
// ---------- mnemosxema ----------
// ---------- mnemosxema (DCS ekrani geometriyasi asosida) ----------
function box(x,y,w,txt,kind,h){h=h||24;const tr=kind==='trip',nan=kind==='nan',wr=kind==='warn';
  const f=tr?'var(--trip)':'url(#rBox)',st=tr?'var(--trip)':nan?'var(--nan)':wr?'var(--warn)':'#2f6f9a';
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${f}" stroke="${st}" stroke-width="${kind?2.4:1.4}"/>`;
  if(tr)s+=`<rect x="${x+8}" y="${y+5}" width="12" height="${h-10}" rx="2" fill="#fff" opacity=".9"/><text x="${x+14}" y="${y+h/2+5}" font-size="13" font-weight="700" text-anchor="middle" fill="var(--trip)">!</text>`;
  if(nan)s+=`<text x="${x+14}" y="${y+h/2+6}" font-size="16" text-anchor="middle" fill="var(--nan)">⚠</text>`;
  s+=`<text x="${x+w-8}" y="${y+h/2+6}" font-size="17" text-anchor="end" fill="${tr?'#fff':'var(--ink)'}">${txt}</text>`;return s}
function lab(x,y,t,o={}){return `<text x="${x}" y="${y}" font-size="${o.fs||15}" text-anchor="${o.a||'middle'}" fill="${o.c||'var(--ink)'}"${o.b?' font-weight="700"':''}${o.halo?' style="paint-order:stroke" stroke="var(--pan)" stroke-width="3.5" stroke-linejoin="round"':''}>${t}</text>`}
function sis2(x,y,st,tg,i){const sp=tg.sep;let s='';
  s+=lab(x+43,y-8,'LAHH'+sp+tg.S1[i],{fs:14,halo:1})+lab(x+146,y-8,'LAHH'+sp+tg.S2[i],{fs:14,halo:1})+box(x,y,86,st.hh1?'LAHH':'',st.hh1?'trip':'',22)+box(x+103,y,86,st.hh2?'LAHH':'',st.hh2?'trip':'',22);
  s+=lab(x+43,y+43,'LALL'+sp+tg.S1[i],{fs:14,halo:1})+lab(x+146,y+43,'LALL'+sp+tg.S2[i],{fs:14,halo:1})+box(x,y+51,86,st.ll1?'LALL':'',st.ll1?'trip':'',22)+box(x+103,y+51,86,st.ll2?'LALL':'',st.ll2?'trip':'',22);
  s+=lab(x+47,y+94,'PALL'+sp+tg.PP[i],{fs:14,halo:1})+box(x+4,y+102,86,st.pl?'PALL':'',st.pl?'warn':'',22);return s}
function arrowR(x,y){return `<path d="M${x-12} ${y-7}L${x} ${y}L${x-12} ${y+7}Z" fill="var(--ink)"/>`}
function arrowL(x,y){return `<path d="M${x+12} ${y-7}L${x} ${y}L${x+12} ${y+7}Z" fill="var(--ink)"/>`}
function arrowU(x,y){return `<path d="M${x-7} ${y+12}L${x} ${y}L${x+7} ${y+12}Z" fill="var(--ink)"/>`}


// ---------- real ko'rinishdagi elementlar (joylashuv asl chizmadagidek) ----------
const RDEF=`<defs><linearGradient id="rMV" x1="0" x2="1"><stop offset="0" stop-color="#5b636b"/><stop offset=".22" stop-color="#e9edf1"/><stop offset=".55" stop-color="#b7bec5"/><stop offset=".85" stop-color="#7d858d"/><stop offset="1" stop-color="#4d555d"/></linearGradient>
<linearGradient id="rMH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#626a72"/><stop offset=".3" stop-color="#eef1f4"/><stop offset=".65" stop-color="#b3bac1"/><stop offset="1" stop-color="#555d65"/></linearGradient>
<radialGradient id="rRoof" cx=".42" cy=".9" r=".9"><stop offset="0" stop-color="#f2f5f7"/><stop offset=".6" stop-color="#b9c0c6"/><stop offset="1" stop-color="#6b737b"/></radialGradient>
<linearGradient id="rLiq" x1="0" x2="1"><stop offset="0" stop-color="#06524a"/><stop offset=".28" stop-color="#1fc9ad"/><stop offset=".5" stop-color="#27d3b7"/><stop offset=".78" stop-color="#0d7a6e"/><stop offset="1" stop-color="#053f39"/></linearGradient>
<linearGradient id="rLiqV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9fff2" stop-opacity=".85"/><stop offset="1" stop-color="#b9fff2" stop-opacity="0"/></linearGradient>
<linearGradient id="rDeep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#001a17" stop-opacity=".55"/></linearGradient>
<linearGradient id="rStreak" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="rBg" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#1b2a38"/><stop offset="1" stop-color="#0a1119"/></radialGradient>
<pattern id="rGrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#9fc3e0" stroke-opacity=".045" stroke-width="1"/></pattern>
<linearGradient id="rBox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e2436"/><stop offset="1" stop-color="#07131e"/></linearGradient>
<radialGradient id="rPump" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".55" stop-color="#aeb6bd"/><stop offset="1" stop-color="#58606a"/></radialGradient>
<linearGradient id="rBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16348a"/><stop offset=".35" stop-color="#5b8dff"/><stop offset=".7" stop-color="#2451c9"/><stop offset="1" stop-color="#12296e"/></linearGradient>
<linearGradient id="rOn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f6b33"/><stop offset=".32" stop-color="#6dffa6"/><stop offset=".65" stop-color="#22c55e"/><stop offset="1" stop-color="#0c5a2a"/></linearGradient>
<linearGradient id="rOff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a1010"/><stop offset=".32" stop-color="#ff8a80"/><stop offset=".65" stop-color="#e53935"/><stop offset="1" stop-color="#6b0d0d"/></linearGradient>
<radialGradient id="rOnR" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#c9ffdc"/><stop offset=".5" stop-color="#2fd46a"/><stop offset="1" stop-color="#0c5a2a"/></radialGradient>
<radialGradient id="rOffR" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#ffd0cc"/><stop offset=".5" stop-color="#e53935"/><stop offset="1" stop-color="#6b0d0d"/></radialGradient>
<linearGradient id="rAct" x1="0" x2="1"><stop offset="0" stop-color="#3a4550"/><stop offset=".35" stop-color="#9aa6b2"/><stop offset="1" stop-color="#2c353e"/></linearGradient>
<linearGradient id="rConc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d949a"/><stop offset="1" stop-color="#4f555a"/></linearGradient>
<filter id="rSh" x="-35%" y="-35%" width="190%" height="200%"><feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="#000" flood-opacity=".5"/></filter>
<filter id="rGl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter></defs>`;
const isLight=()=>document.documentElement.getAttribute('data-theme')==='light';
// Yorug' mavzuda sahna oq fonda: fon, to'r, oynalar va soyalar mavzuga moslanadi (uskunalar ranglari o'zgarmaydi)
function rdefT(){if(!isLight())return RDEF;
  return RDEF.replace('<stop offset="0" stop-color="#1b2a38"/><stop offset="1" stop-color="#0a1119"/>','<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e7eef4"/>')
   .replace('stroke="#9fc3e0" stroke-opacity=".045"','stroke="#4f6f89" stroke-opacity=".10"')
   .replace('<stop offset="0" stop-color="#0e2436"/><stop offset="1" stop-color="#07131e"/>','<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e8f0f7"/>')
   .replace('flood-color="#000" flood-opacity=".5"','flood-color="#1d2b38" flood-opacity=".24"')}
const rPipe=d=>`<path d="${d}" fill="none" stroke="${isLight()?'#22313f':'#05080b'}" stroke-opacity="${isLight()?.32:.55}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#8f979f" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#c9cfd5" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#f4f7f9" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" transform="translate(-.8 -.8)" opacity=".85"/>`;
function valveBody(x,y,open,w){const f=open?'url(#rOn)':'url(#rOff)',g=open?'#3dff7a':'#ff3b30';
  return `<circle cx="${x}" cy="${y}" r="16" fill="${g}" opacity=".28" filter="url(#rGl)"/><g filter="url(#rSh)"><path d="M${x-w} ${y-12}L${x} ${y}L${x-w} ${y+12}Z" fill="${f}" stroke="#1b2127" stroke-width="1.2"/><path d="M${x+w} ${y-12}L${x} ${y}L${x+w} ${y+12}Z" fill="${f}" stroke="#1b2127" stroke-width="1.2"/>
   <rect x="${x-w-3}" y="${y-13}" width="4" height="26" rx="1" fill="url(#rMV)" stroke="#2c343c" stroke-width=".8"/><rect x="${x+w-1}" y="${y-13}" width="4" height="26" rx="1" fill="url(#rMV)" stroke="#2c343c" stroke-width=".8"/></g>
   <circle cx="${x}" cy="${y}" r="4.2" fill="#e9eff6" stroke="#1b2127" stroke-width="1"/>
   <rect x="${x-1.6}" y="${y-18}" width="3.2" height="14" fill="url(#rMV)"/><path d="M${x-12} ${y-18}Q${x} ${y-32} ${x+12} ${y-18}Z" fill="url(#rAct)" stroke="#1f262d" stroke-width="1"/><rect x="${x-13}" y="${y-19.5}" width="26" height="3" rx="1" fill="#59636d"/>`}
function valve2(x,y,open,label,sis){return valveBody(x,y,open,18)+lab(x,y-38,label)+(sis?lab(x,y+32,'SIS',{fs:13,c:'var(--trip)',b:1}):'')}
function valve3(x,y,side,label){const f=o=>o?'url(#rOn)':'url(#rOff)';
  return `<circle cx="${x}" cy="${y}" r="18" fill="#3dff7a" opacity=".22" filter="url(#rGl)"/><g filter="url(#rSh)"><path d="M${x-20} ${y-12}L${x} ${y}L${x-20} ${y+12}Z" fill="${f(side===0)}" stroke="#1b2127" stroke-width="1.2"/><path d="M${x+20} ${y-12}L${x} ${y}L${x+20} ${y+12}Z" fill="${f(side===1)}" stroke="#1b2127" stroke-width="1.2"/><path d="M${x-12} ${y+20}L${x} ${y}L${x+12} ${y+20}Z" fill="url(#rOn)" stroke="#1b2127" stroke-width="1.2"/></g>
   <circle cx="${x}" cy="${y}" r="4" fill="#e9eff6" stroke="#1b2127"/>
   <rect x="${x-1.6}" y="${y-18}" width="3.2" height="14" fill="url(#rMV)"/><path d="M${x-12} ${y-18}Q${x} ${y-32} ${x+12} ${y-18}Z" fill="url(#rAct)" stroke="#1f262d" stroke-width="1"/><rect x="${x-13}" y="${y-19.5}" width="26" height="3" rx="1" fill="#59636d"/>`+lab(x,y-38,label)}
function pump2(x,y,on,label,xl,sis){const ring=on&&!sis?'#0c5a2a':'#6b0d0d';let fins='';for(let k=0;k<6;k++)fins+=`<line x1="${x+24+k*4}" y1="${y-7}" x2="${x+24+k*4}" y2="${y+13}" stroke="#0f2566" stroke-width="1"/>`;
  return `<g filter="url(#rSh)"><rect x="${x-22}" y="${y+16}" width="76" height="7" rx="1.5" fill="url(#rConc)"/><rect x="${x-18}" y="${y+14}" width="68" height="3" fill="#3d454d"/>
   <rect x="${x+21}" y="${y-9}" width="27" height="24" rx="4" fill="url(#rBlue)" stroke="#0e1f55" stroke-width="1"/>${fins}<rect x="${x+46}" y="${y-7}" width="6" height="20" rx="2.5" fill="#1b2f6e" stroke="#0e1f55" stroke-width=".8"/>
   <rect x="${x+28}" y="${y-13}" width="11" height="5" rx="1" fill="#2451c9" stroke="#0e1f55" stroke-width=".6"/><rect x="${x+13}" y="${y-2}" width="9" height="10" rx="1.5" fill="#f0a52a" stroke="#6a4a0a" stroke-width=".7"/>
   <path d="M${x} ${y-17}H${x+19}V${y-9}H${x+12}A17 17 0 1 1 ${x} ${y-17}Z" fill="${on&&!sis?'url(#rOnR)':'url(#rOffR)'}" stroke="#1b2127" stroke-width="1.2"/><path d="M${x-8} ${y+13}L${x-11} ${y+16}H${x+11}L${x+8} ${y+13}Z" fill="#5d666e"/></g>
   <circle cx="${x}" cy="${y}" r="22" fill="${on&&!sis?'#3dff7a':'#ff3b30'}" opacity=".3" filter="url(#rGl)"/><circle cx="${x}" cy="${y}" r="10" fill="#20272e" stroke="${ring}" stroke-width="2.6"/>
   <g class="imp" stroke="#aeb6bd" stroke-width="1.8" stroke-linecap="round">${[0,60,120].map(a=>{const r=a*Math.PI/180;return `<line x1="${(x-7*Math.cos(r)).toFixed(1)}" y1="${(y-7*Math.sin(r)).toFixed(1)}" x2="${(x+7*Math.cos(r)).toFixed(1)}" y2="${(y+7*Math.sin(r)).toFixed(1)}"/>`}).join('')}</g><circle cx="${x}" cy="${y}" r="2.4" fill="#aeb6bd"/>
   <circle cx="${x+34}" cy="${y-11}" r="2.4" fill="${on&&!sis?'#3dff7a':'#ff3b30'}"/>`+lab(x,y-28,xl)+lab(x+3,y+50,label,{fs:16,b:1,c:on&&!sis?(isLight()?'#15803d':'#4ade80'):(isLight()?'#dc2626':'#f87171')})}
function tank2(x0,x1,name,lvl,sel,alert,isNaNLvl){const top=252,peak=232,bot=455,st=x1-74,id='t'+x0;
  const shape=`M${x0} ${top}Q${(x0+x1)/2} ${peak} ${x1} ${top}V470H${st}V${bot}H${x0+4}Z`,body=`M${x0} ${top}H${x1}V470H${st}V${bot}H${x0+4}Z`,roof=`M${x0-3} ${top+1}Q${(x0+x1)/2} ${peak-4} ${x1+3} ${top+1}Z`;
  let s=`<defs><clipPath id="cp${id}"><path d="${shape}"/></clipPath></defs>`;
  // poydevor
  s+=`<rect x="${x0-8}" y="${bot}" width="${st-x0+12}" height="10" rx="2" fill="url(#rConc)"/><rect x="${st-4}" y="470" width="${x1-st+12}" height="9" rx="2" fill="url(#rConc)"/>`;
  s+=`<g filter="url(#rSh)"><path d="${body}" fill="url(#rMV)"/></g>`;
  if(!isNaNLvl){const L=clip(lvl,0,100),yl=bot-(bot-top+6)*L/100;
    s+=`<g clip-path="url(#cp${id})"><rect x="${x0}" y="${yl}" width="${x1-x0}" height="${480-yl}" fill="url(#rLiq)" opacity=".92"/><rect x="${x0}" y="${yl}" width="${x1-x0}" height="${480-yl}" fill="url(#rDeep)"/><rect x="${x0}" y="${yl}" width="${x1-x0}" height="18" fill="url(#rLiqV)" opacity=".45"/>
    <rect x="${x0}" y="${yl-6}" width="${x1-x0}" height="8" fill="#2ee6c9" opacity=".22" filter="url(#rGl)"/><rect x="${x0}" y="${yl-1.2}" width="${x1-x0}" height="2.4" fill="#aaffef" opacity=".95"/>
    ${Array.from({length:14},(_,i)=>`<circle cx="${(x0+30+((i*53)%(x1-x0-60))).toFixed(1)}" cy="${(yl+14+((i*37)%Math.max(8,bot-yl-20))).toFixed(1)}" r="${(1+(i%3)*.6).toFixed(1)}" fill="#d9fff8" opacity=".35"/>`).join('')}</g>`;
    s+=`<text x="${x1-12}" y="446" font-size="16" font-weight="700" text-anchor="end" fill="#b9fff2" style="paint-order:stroke" stroke="#032b27" stroke-width="3.5">${fmt(L,1)} %</text>`}
  else s+=`<g clip-path="url(#cp${id})"><rect x="${x0}" y="${top-30}" width="${x1-x0}" height="260" fill="var(--nan)" opacity=".12"/></g>`;
  // metall ustki qatlam (kesma oynadan suyuqlik ko'rinadi)
  s+=`<g clip-path="url(#cp${id})"><rect x="${x0}" y="${top}" width="${x1-x0}" height="240" fill="url(#rMV)" opacity=".16"/><rect x="${x0+(x1-x0)*.16}" y="${top}" width="${(x1-x0)*.07}" height="${bot-top}" fill="url(#rStreak)" opacity=".7"/>${[300,350,400,450].map(y=>`<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="#2b3238" stroke-width=".9" opacity=".55"/>`).join('')}
   ${Array.from({length:Math.floor((x1-x0)/46)},(_,i)=>`<line x1="${x0+46*(i+1)}" x2="${x0+46*(i+1)}" y1="${top}" y2="${bot}" stroke="#2b3238" stroke-width=".6" opacity=".35"/>`).join('')}</g>`;
  s+=`<path d="${roof}" fill="url(#rRoof)" stroke="#3b434b" stroke-width="1.2"/>`;
  // tom panjarasi
  s+=`<path d="M${x0+20} ${top-10}Q${(x0+x1)/2} ${peak-20} ${x1-20} ${top-10}" fill="none" stroke="#9aa3ab" stroke-width="1.4"/>`+Array.from({length:7},(_,i)=>{const u=(i+1)/8,xx=x0+20+(x1-x0-40)*u,yy=top-10-(Math.sin(Math.PI*u))*((top-peak)+8)*0.9;return `<line x1="${xx.toFixed(1)}" y1="${yy.toFixed(1)}" x2="${xx.toFixed(1)}" y2="${(yy+9).toFixed(1)}" stroke="#9aa3ab" stroke-width="1.2"/>`}).join('');
  s+=`<path d="${shape}" fill="none" stroke="${alert||'#2b3238'}" stroke-width="${alert?3.4:1.6}" stroke-linejoin="round"/>`;
  if(alert)s+=`<path d="${shape}" fill="none" stroke="${alert}" stroke-width="7" opacity=".3" filter="url(#rGl)"/>`;
  // shtutserlar
  s+=[[x0,352],[x1,427],[x1,351]].map(([xx,yy])=>`<rect x="${xx-4}" y="${yy-9}" width="8" height="18" rx="1.5" fill="url(#rMV)" stroke="#2b3238" stroke-width=".8"/>`).join('');
  // narvon
  s+=`<g stroke="#8e979f" stroke-width="1.6"><line x1="${x0+12}" y1="${top-8}" x2="${x0+12}" y2="${bot}"/><line x1="${x0+24}" y1="${top-8}" x2="${x0+24}" y2="${bot}"/>${Array.from({length:Math.floor((bot-top+8)/12)},(_,i)=>`<line x1="${x0+12}" x2="${x0+24}" y1="${top-4+i*12}" y2="${top-4+i*12}" stroke-width="1.2"/>`).join('')}</g>`;
  // sath ko'rsatkichi (shisha)
  const bx=x0+40;s+=`<rect x="${bx-2}" y="354" width="16" height="74" rx="3" fill="url(#rMV)" stroke="#2b3238"/><rect x="${bx+1}" y="357" width="10" height="68" fill="#1a232b"/>`;
  for(let i=0;i<=4;i++)s+=`<line x1="${bx+1}" x2="${bx+5}" y1="${357+i*17}" y2="${357+i*17}" stroke="#c9d1d8"/>`;
  if(!isNaNLvl){const h=68*clip(lvl,0,100)/100;s+=`<rect x="${bx+2.5}" y="${425-h}" width="7" height="${h}" fill="#27d3b7"/><rect x="${bx+2.5}" y="${425-h}" width="2" height="${h}" fill="#b9fff2" opacity=".6"/>`}
  else s+=`<text x="${bx+6}" y="400" font-size="26" font-weight="700" text-anchor="middle" fill="var(--ink)">B</text>`;
  s+=`<text x="${(x0+x1)/2+2}" y="425" font-size="17" font-weight="700" text-anchor="middle" fill="#fff" style="paint-order:stroke" stroke="#1b2127" stroke-width="3.5">${name+(sel?' ◂':'')}</text>`;return s}
// ---------- avtomatlashtirish qatlami: DCS / SIS kontrollerlari, I/O modullari, operator kompyuteri ----------
function kSprDefs(){if(document.getElementById('kSprDefs'))return;const d=document.createElement('div');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML=`<svg id="kSprDefs" width="0" height="0" aria-hidden="true"><defs>${Object.keys(KSPR).map(k=>`<image id="kspr_${k}" href="${KSPR[k].src}" width="${KSPR[k].w}" height="${KSPR[k].h}"/>`).join('')}</defs></svg>`;document.body.appendChild(d)}
function autoLayer(){const tg=TG();let s='';
  const D='#3d86e8',Sr='#e5484d',E='#8898a5';
  KWR.length=0;const ln=(d,c,dash,w)=>(KWR.push([d,c,!!dash]),`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w||1.6}"${dash?' stroke-dasharray="7 4"':''} stroke-linejoin="round"/>`);
  const jb=(x,y,w,t)=>`<g><rect x="${x}" y="${y}" width="${w}" height="30" rx="4" fill="var(--pan)" stroke="var(--mut)" stroke-width="1.4"/>${Array.from({length:Math.floor((w-16)/10)},(_,i)=>`<rect x="${x+8+i*10}" y="${y+20}" width="6" height="6" rx="1" fill="${i%3===2?Sr:D}" opacity=".85"/>`).join('')}</g>`+lab(x+w/2,y+15,t,{fs:12.5,b:1});
  // --- rezervuar A: JB-1
  s+=ln('M410 194V130',D,1)+ln('M560 194V114H525',D,1)+ln('M778 346H792V113H525',D,1)+ln('M652 283V122H525',Sr,1)+ln('M306 340V113H395',D,1);
  s+=jb(395,98,130,'JB-1');
  // --- rezervuar B: JB-2
  s+=ln('M1062 194V158H1345V130',D,1)+ln('M1212 194V152H1360V130',D,1)+ln('M1304 283V146H1375V130',Sr,1)+ln('M956 340V164H1390V130',D,1)+ln('M1428 346H1442V130',D,1)+ln('M1230 101H1300V140H1405V130',Sr,1);
  s+=jb(1330,98,190,'JB-2');
  // --- magistral kabellar (chap va o'ng), DCS va SIS shinalari
  s+=ln('M395 122H196V945',D,1)+ln('M395 108H206V960',Sr,1)+ln('M1520 113H1553V945',D,1)+ln('M1520 123H1545V960',Sr,1);
  s+=ln('M48 945H1553',D,1)+ln('M206 960H1545',Sr,1);
  // --- to'g'ridan-to'g'ri pastga tushuvchi signallar
  s+=ln('M58 621H48V945',D,1)+ln('M742 441V945',D,1)+ln('M1388 441V470H1300V945',D,1)+ln('M1192 652V945',D,1)+ln('M1030 768H1060V945',D,1)+ln('M1030 868H1072V945',D,1)+ln('M1030 776H1084V960',Sr,1);
  // --- qurilmalar
  const spr=(k,x,y,sc)=>(isLight()&&KSPR[k]?`<rect x="${x}" y="${y}" width="${KSPR[k].w*sc}" height="${KSPR[k].h*sc}" rx="9" fill="#26313d" stroke="#3c4a59" stroke-width="1.2" filter="url(#rSh)"/>`:'')+`<use href="#kspr_${k}" transform="translate(${x} ${y}) scale(${sc})"/>`;   // yorug' mavzuda qurilma rasmlari qora taxtachada
  s+=`<rect x="44" y="975" width="1522" height="286" rx="10" fill="none" stroke="var(--line)" stroke-dasharray="4 4"/>`+lab(56,995,'Operator xonasi · avtomatlashtirish tizimi (DCS / SIS)',{a:'start',fs:14,c:'var(--mut)'});
  // DCS kontroller + I/O
  s+=spr('plc',70,1010,1)+ln('M324 1072H352',E,0,2.2)+spr('aomod',352,1020,1);
  s+=`<rect x="130" y="1026" width="144" height="26" rx="5" fill="#0e2438" stroke="#2e5f86"/>`+lab(202,1045,'DCS · PLC',{fs:15,b:1,c:'#fff'});
  s+=ln('M455 945V1020',D,0,2);s+=lab(197,1172,'DCS kontroller',{fs:14,b:1})+lab(455,1162,'DCS I/O moduli',{fs:14,b:1})+lab(455,1178,'AI 4–20 mA · AO · DI / DO',{fs:12,c:'var(--mut)'});
  // SIS kontroller + I/O
  s+=spr('plc',610,1010,1)+ln('M864 1072H892',E,0,2.2)+spr('aomod',892,1020,1);
  s+=`<rect x="670" y="1026" width="144" height="26" rx="5" fill="#3a0e10" stroke="#b33a3a"/>`+lab(742,1045,'SIS · Safety PLC',{fs:14,b:1,c:'#fff'});
  s+=`<rect x="908" y="1026" width="174" height="20" rx="4" fill="#3a0e10" stroke="#b33a3a"/>`+lab(995,1041,'SIS I/O MODULI',{fs:11.5,b:1,c:'#fff'});
  s+=ln('M1000 960V1020',Sr,0,2);s+=lab(737,1172,'SIS kontroller (SIL 2)',{fs:14,b:1})+lab(995,1162,'SIS I/O moduli',{fs:14,b:1})+lab(995,1178,'LAHH / LALL / PALL · trip chiqishlari',{fs:12,c:'var(--mut)'});
  // Ethernet kommutator va operator kompyuteri
  s+=`<rect x="1135" y="1060" width="96" height="34" rx="4" fill="#1b2129" stroke="#3a434d"/>${[0,1,2,3,4,5].map(i=>`<rect x="${1143+i*14}" y="1078" width="9" height="8" rx="1" fill="#0d1115" stroke="#59616a" stroke-width=".6"/><circle cx="${1147.5+i*14}" cy="1071" r="1.6" fill="#3dff7a"/>`).join('')}`+lab(1183,1052,'Ethernet',{fs:12.5,c:'var(--mut)'});
  s+=spr('pc',1244,1010,.93);
  {const i=ct(),id=cur.idxs[i],R=id.R,k=timeK(),n=Math.min(k,R.length-1),st=Math.max(1,Math.floor(R.length/220));let pts='';for(let j=0;j<=n;j+=st)pts+=`${(77+204*j/(R.length-1)).toFixed(1)},${(124-82*clip(R[j],0,1)).toFixed(1)} `;
   const hot=R[n]>=P.RTH;s+=`<g transform="translate(1244 1010) scale(.93)"><rect x="58" y="17" width="112" height="16" fill="#0a2338"/><text x="60" y="30" font-size="12" font-weight="700" fill="#6fc8f2">R(t) — ${tg.tk[i]}</text>
   <rect x="232" y="16" width="50" height="20" fill="#0a2338"/><text x="278" y="32.5" font-size="18" font-weight="700" text-anchor="end" fill="${hot?'#ffd34d':'#6fc8f2'}">${fmt(R[n],2)}</text>
   <rect x="77" y="40" width="205" height="84" fill="#07192d"/>${[0,1,2,3,4,5].map(q=>`<line x1="77" x2="281" y1="${124-82*q/5}" y2="${124-82*q/5}" stroke="rgba(120,170,220,.18)" stroke-width=".8"/>`).join('')}
   <line x1="77" x2="281" y1="${124-82*P.RTH}" y2="${124-82*P.RTH}" stroke="rgba(255,120,80,.7)" stroke-dasharray="4 3"/><polyline points="${pts}" fill="none" stroke="#f4d03f" stroke-width="2" stroke-linejoin="round"/></g>`}
  s+=ln('M300 1155V1232H1183V1094',E,0,2.2)+ln('M840 1155V1232',E,0,2.2)+ln('M1231 1077H1262',E,0,2.2);
  s+=lab(1398,1232,'Operator stansiyasi',{fs:14,b:1})+lab(1398,1250,'Experion + SILworX + AI xavf indeksi',{fs:13,b:1});
  s+=lab(640,1254,'Modbus TCP / Ethernet',{fs:12,c:'var(--mut)'});
  // afsona
  s+=[[D,'DCS signali (4–20 mA)',1],[Sr,'SIS signali',1],[E,'Tarmoq (Ethernet)',0]].map((l,i)=>`<line x1="${420+i*190}" y1="990" x2="${450+i*190}" y2="990" stroke="${l[0]}" stroke-width="2"${l[2]?' stroke-dasharray="7 4"':''}/>`+lab(456+i*190,995,l[1],{a:'start',fs:12.5,c:'var(--mut)'})).join('');
  return s}

// ---------- JONLI ANIMATSIYA QATLAMI (bir marta quriladi, requestAnimationFrame bilan harakatlanadi) ----------
const KWR=[];
const KA={ok:false,raf:0,last:0,t:0,st:{},cur:{},sig:[],flows:[],leds:[],els:{},tank:[{},{}],pc:{x:0,y:0}};
function kPts(d){const P=[];let x=0,y=0;d.replace(/([MLHV])\s*([-\d.]+)(?:[ ,]([-\d.]+))?/g,(m,c,a,b)=>{if(c==='M'||c==='L'){x=+a;y=+b}else if(c==='H')x=+a;else y=+a;P.push([x,y]);return ''});return P}
function kGeo(P){const seg=[];let L=0;for(let i=1;i<P.length;i++){const [x0,y0]=P[i-1],[x1,y1]=P[i],l=Math.hypot(x1-x0,y1-y0);seg.push({x0,y0,dx:x1-x0,dy:y1-y0,l,s:L});L+=l}return {seg,L}}
function kAt(G,s){let lo=0,hi=G.seg.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(G.seg[m].s<=s)lo=m;else hi=m-1}const g=G.seg[lo],u=g.l?(s-g.s)/g.l:0;return [g.x0+g.dx*u,g.y0+g.dy*u]}
const KFLOW=[['src','M158 793H262V352'],['src','M162 863H262V352'],['inA','M262 352H380'],['inB','M262 352H220V57H880V352H1030'],
 ['outA','M660 427H820V765H960'],['outB','M1310 427H1465V540H820V765H960'],['p2in','M820 765V865H960'],['p1','M994 752H1520'],['p2','M994 853H1250V764'],['p2','M994 853H1168V764'],
 ['rec','M1170 752V668'],['rec','M1068 752V717H1158'],['recA','M1170 645H850V287H672'],['recB','M1170 645H1485V287H1322']];
const KTX=[[388,660],[1040,1310]];
function kBuild(){const W=KWR.slice(),LT=isLight();let s=`<defs><radialGradient id="kP" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${LT?'#0b8f7a':'#e9fffb'}"/><stop offset=".5" stop-color="${LT?'#13b79d':'#5ff0d8'}"/><stop offset="1" stop-color="${LT?'#13b79d':'#1fc9ad'}" stop-opacity="0"/></radialGradient><filter id="kG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.8"/></filter><filter id="kS" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".7"/></filter>
  ${KTX.map(([x0,x1],i)=>`<clipPath id="kT${i}"><path d="M${x0} 252Q${(x0+x1)/2} 232 ${x1} 252V470H${x1-74}V455H${x0+4}Z"/></clipPath>`).join('')}</defs>`;
  // quvurlardagi kondensat oqimi
  KFLOW.forEach(([k,d],i)=>{const G=kGeo(kPts(d)),n=Math.max(3,Math.round(G.L/22));s+=`<g class="kf" data-i="${i}" opacity="0"><path d="${d}" fill="none" stroke="${LT?'#0e9c86':'#4ff0d6'}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 26" opacity=".55" filter="url(#kS)"/>${Array.from({length:n},()=>`<circle r="2" fill="url(#kP)"/>`).join('')}</g>`});
  // rezervuardagi pufakchalar va to'lqin
  KTX.forEach(([x0,x1],i)=>{const bx=x0+62,by=272,R=[[bx,by],[bx+103,by],[bx,by+51],[bx+103,by+51],[bx+4,by+102]];
   s+=`<mask id="kM${i}" maskUnits="userSpaceOnUse" x="${x0-10}" y="220" width="${x1-x0+20}" height="270"><rect x="${x0-10}" y="220" width="${x1-x0+20}" height="270" fill="#fff"/>${R.map(([x,y])=>`<rect x="${x-4}" y="${y-18}" width="94" height="44" rx="3" fill="#000"/>`).join('')}<rect x="${x0+36}" y="352" width="20" height="80" fill="#000"/><rect x="${(x0+x1)/2-40}" y="406" width="84" height="26" fill="#000"/><rect x="${x1-90}" y="428" width="84" height="24" fill="#000"/></mask>`;
   s+=`<g clip-path="url(#kT${i})" mask="url(#kM${i})"><g class="kb${i}">${Array.from({length:16},()=>`<circle r="1.6" fill="#d9fff8" opacity="0"/>`).join('')}</g><path class="kw${i}" fill="none" stroke="#b9fff2" stroke-width="1.6" opacity=".8"/><path class="kw2${i}" fill="none" stroke="#2ee6c9" stroke-width="5" opacity=".18" filter="url(#kS)"/></g>`});
  // nasos parraklari
  [[977,765],[977,865]].forEach(([x,y],i)=>{s+=`<g class="kimp${i}"><circle cx="${x}" cy="${y}" r="9" fill="#20272e"/>${[0,60,120].map(a=>{const r=a*Math.PI/180;return `<line x1="${(x-7*Math.cos(r)).toFixed(1)}" y1="${(y-7*Math.sin(r)).toFixed(1)}" x2="${(x+7*Math.cos(r)).toFixed(1)}" y2="${(y+7*Math.sin(r)).toFixed(1)}" stroke="#d3dae0" stroke-width="1.9" stroke-linecap="round"/>`}).join('')}<circle cx="${x}" cy="${y}" r="2.4" fill="#d3dae0"/></g>`});
  // signal va tarmoq impulslari
  W.forEach(([d,c,dash],i)=>{const eth=c==='#8898a5';s+=`<path class="ks" d="${d}" fill="none" stroke="${eth?(LT?'#5f7284':'#dfe8f2'):c}" stroke-width="${LT?4:5}" stroke-linecap="round" opacity="${LT?.38:.7}" filter="url(#kG)"/><path class="ksc" d="${d}" fill="none" stroke="${LT?(eth?'#3f5163':c):'#fff'}" stroke-width="${eth?2.2:(LT?2.4:1.8)}" stroke-linecap="round"/>`});
  // PLC, modul va kommutator chiroqlari
  const L=[];const plcL=(ox,oy)=>{[613,619.25,629.25,635,644.5,650,659.5,664.5,674.5,679.25,688.75,693.75,704.25,708.75,718,723].forEach(x=>{for(let r=0;r<16;r++)L.push([x-508+ox,562+r*3.35-503+oy,r<2||r>13?'#ffd35a':'#7fd4ff','io',1.15])});for(let r=0;r<12;r++)L.push([565-508+ox,561+r*4.6-503+oy,r%4===0?'#ffb020':'#6dff9a','pw',1.15]);for(let r=0;r<14;r++)L.push([735-508+ox,559+r*3.9-503+oy,r%3?'#ff9d3a':'#7fd4ff','io',1.15]);
    L.push([577.5-508+ox,575.5-503+oy,'#3dff7a','run',1.4],[581-508+ox,575.5-503+oy,'#ffd24a','com',1.4],[584.5-508+ox,575.5-503+oy,'#3dff7a','com2',1.4],[588-508+ox,575.5-503+oy,'#ff3b30','err',1.4])};
  const aoL=(ox,oy)=>{[363.25,375.75,385.75,393.75,400.75,408.25,416.25,423.75,432,440,448,453.75,462,470].forEach(x=>L.push([x-290+ox,773.75-683+oy,'#ffc24a','ao',1.6]));for(let r=0;r<12;r++)L.push([314-290+ox,721+r*4-683+oy,'#6dffd8','io',1])};
  plcL(70,1010);plcL(610,1010);aoL(352,1020);aoL(892,1020);[0,1,2,3,4,5].forEach(i=>L.push([1147.5+i*14,1071,'#3dff7a','com',1.8]));
  s+=L.map(p=>`<circle class="kl" data-k="${p[3]}" cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="${p[4]}" fill="${p[2]}" opacity="0"/>`).join('');
  // CPU displeylari, SIS avariya chirog'i, kompyuter kursori
  [[136.5,1063.5,'kc0'],[676.5,1063.5,'kc1']].forEach(([x,y,c])=>{s+=`<rect x="${x}" y="${y}" width="16" height="11" rx="1" fill="#06222a"/><text class="${c}" x="${x+8}" y="${y+7.7}" font-size="5.6" text-anchor="middle" fill="#6dffe0" font-family="Consolas,monospace">RUN</text>`});
  s+=`<rect class="ksis" x="667" y="1023" width="150" height="32" rx="7" fill="none" stroke="#ff3b30" stroke-width="3" opacity="0" filter="url(#kG)"/>`;
  s+=`<line class="kpcs" y1="${1010+40*.93}" y2="${1010+124*.93}" stroke="#6fc8f2" stroke-width=".8" opacity=".5"/><circle class="kpc2" r="6" fill="#ffe46a" opacity=".35" filter="url(#kG)"/><circle class="kpc" r="2.6" fill="#ffe46a"/><circle class="klive" cx="${1244+170*.93}" cy="${1010+26*.93}" r="2.4" fill="#ff3b30"/><text x="${1244+175*.93}" y="${1010+29*.93}" font-size="8" font-weight="700" fill="#ff8a80">LIVE</text>`;
  const ov=$('kAnim');ov.innerHTML=s;const q=(c)=>ov.querySelector('.'+c);
  KA.flows=[...ov.querySelectorAll('.kf')].map(g=>{const i=+g.dataset.i,G=kGeo(kPts(KFLOW[i][1]));return {g,key:KFLOW[i][0],G,dash:g.firstElementChild,cs:[...g.querySelectorAll('circle')],pos:Math.random()*50}});
  const gs=[...ov.querySelectorAll('.ks')],cs=[...ov.querySelectorAll('.ksc')];KA.sig=gs.map((g,i)=>{const L=kGeo(kPts(W[i][0])).L,seg=16,v=160+(i%5)*20,per=L+(0.8+(i%7)/7)*v+seg;for(const e of [g,cs[i]])e.setAttribute('stroke-dasharray',`${seg} ${per-seg}`);return {g,c:cs[i],seg,v,per,ph:Math.random()*per}});
  KA.leds=[...ov.querySelectorAll('.kl')].map(e=>({e,k:e.dataset.k,on:null}));
  KA.els={imp:[q('kimp0'),q('kimp1')],kc:[q('kc0'),q('kc1')],sis:q('ksis'),pcs:q('kpcs'),pc:q('kpc'),pc2:q('kpc2'),live:q('klive'),b:[[...q('kb0').children],[...q('kb1').children]],w:[q('kw0'),q('kw1')],w2:[q('kw20'),q('kw21')]};
  KA.ok=true;if(!KA.raf){KA.last=performance.now();KA.raf=requestAnimationFrame(kFrame)}}
const ANIM_COARSE=window.matchMedia&&matchMedia('(pointer:coarse)').matches,ANIM_SLOW=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches?0.3:1;   // sensorli qurilmada ≤ 30 kadr/s; reduced-motion da sekinroq
function animIdle(loop,st){st.last=performance.now();setTimeout(()=>{st.raf=requestAnimationFrame(loop)},250)}   // ko'rinmaganda tsikl sekin tekshiriladi (60 Hz o'rniga ~4 Hz)
function kFrame(now){const ov=$('kAnim');if(!KA.ok||!ov||!ov.getClientRects().length||document.hidden){animIdle(kFrame,KA);return}KA.raf=requestAnimationFrame(kFrame);if(ANIM_COARSE&&now-KA.last<30)return;let dt=Math.min(.1,(now-KA.last)/1000)*ANIM_SLOW;KA.last=now;KA.t+=dt;const t=KA.t,S=KA.st,C=KA.cur,E=KA.els;
  for(const k in S){C[k]=(C[k]||0)+(S[k]-(C[k]||0))*Math.min(1,dt/.6)}
  for(const f of KA.flows){const v=Math.min(1,(C[f.key]||0));f.g.setAttribute('opacity',v.toFixed(2));if(v<.01)continue;f.pos+=90*v*dt;f.dash.style.strokeDashoffset=-f.pos*1.2;const n=f.cs.length,L=f.G.L;
    f.cs.forEach((e,i)=>{const sL=((f.pos+i*L/n)%L+L)%L,p=kAt(f.G,sL);e.setAttribute('cx',p[0].toFixed(1));e.setAttribute('cy',p[1].toFixed(1));e.setAttribute('opacity',Math.min(1,sL/8,(L-sL)/8).toFixed(2))})}
  E.imp.forEach((e,i)=>{const on=C['pump'+i]||0;KA['a'+i]=((KA['a'+i]||0)+900*on*dt)%360;e.setAttribute('transform',`rotate(${KA['a'+i].toFixed(1)} 977 ${765+i*100})`);e.setAttribute('opacity',on>.02?1:0)});
  KTX.forEach(([x0,x1],i)=>{const T=KA.tank[i];if(!T.ok){E.w[i].setAttribute('d','');E.b[i].forEach(b=>b.setAttribute('opacity',0));return}const yl=455-(455-252+6)*T.L/100,act=.35+Math.min(1,(C['inA'==='x'?0:(i?'inB':'inA')]||0)+(C[i?'outB':'outA']||0));
    let d=`M${x0} ${yl.toFixed(1)}`;for(let x=x0;x<=x1;x+=8)d+=` L${x} ${(yl+Math.sin(x*.09+t*2.6)*1.3*act+Math.sin(x*.035-t*1.4)*1.1*act).toFixed(2)}`;E.w[i].setAttribute('d',d);E.w2[i].setAttribute('d',d);
    E.b[i].forEach((b,j)=>{const H=Math.max(10,455-yl),sp=10+(j%5)*4,s2=((t*sp*act+j*37)%H+H)%H,y=455-s2;b.setAttribute('cx',(x0+40+((j*67)%(x1-x0-80))+Math.sin(t*2+j)*3).toFixed(1));b.setAttribute('cy',y.toFixed(1));b.setAttribute('opacity',(Math.min(1,s2/10,(H-s2)/10)*.55*act).toFixed(2))})});
  for(const g of KA.sig){const s=((t*g.v+g.ph)%g.per),off=g.seg-s;g.g.style.strokeDashoffset=off;g.c.style.strokeDashoffset=off}
  KA.ledT=(KA.ledT||0)+dt;const tr=(S.trip||0)>.5,bl=(t*2.2)%1<.5;if(KA.ledT>.09){KA.ledT=0;for(const l of KA.leds){let on=l.on;if(l.k==='io')on=Math.random()<.12?!on:!!on;else if(l.k==='ao')on=Math.random()<.08?!on:!!on;else if(l.k==='pw'||l.k==='run')on=true;else if(l.k==='com')on=Math.random()<.55;else if(l.k==='com2')on=(t*3)%1<.5;else if(l.k==='err')on=tr&&bl;if(on!==l.on){l.on=on;l.e.setAttribute('opacity',on?1:0)}}}
  E.kc[0].textContent='RUN';E.kc[1].textContent=tr?(bl?'TRIP':'SIS'):'RUN';E.kc[1].setAttribute('fill',tr?'#ff6b5a':'#6dffe0');E.sis.setAttribute('opacity',tr&&bl?.95:0);
  const px=KA.pc.x,py=KA.pc.y;E.pcs.setAttribute('x1',px);E.pcs.setAttribute('x2',px);E.pc.setAttribute('cx',px);E.pc.setAttribute('cy',py);E.pc2.setAttribute('cx',px);E.pc2.setAttribute('cy',py);E.pc2.setAttribute('r',(4+2.5*Math.abs(Math.sin(t*3))).toFixed(2));E.live.setAttribute('opacity',(t%1)<.5?1:.2)}
function kAnimUpdate(run,k,anyTrip,pTrip,q,zl){const T0=run.tanks[0],T1=run.tanks[1]||null,n0=T0.NP[k]||0,n1=T1?T1.NP[k]||0:0,np=n0+n1;
  Object.assign(KA.st,{src:q>0?1:0,inA:T0.VIN[k]>0?1:0,inB:T1&&T1.VIN[k]>0?1:0,outA:n0>0&&!pTrip?1:0,outB:n1>0&&!pTrip?1:0,p2in:np>=2&&!pTrip?1:0,p1:np>=1&&!pTrip?1:0,p2:np>=2&&!pTrip?1:0,pump0:np>=1&&!pTrip?1:0,pump1:np>=2&&!pTrip?1:0,
    rec:np>=1&&!pTrip?1:0,recA:np>=1&&!pTrip&&zl===0?1:0,recB:np>=1&&!pTrip&&zl===1?1:0,trip:anyTrip?1:0});
  run.tanks.forEach((o,i)=>{const L=o.Ld[k];KA.tank[i]={ok:isFinite(L),L:isFinite(L)?Math.max(0,Math.min(100,L)):0}});if(!run.tanks[1])KA.tank[1]={ok:false};
  const i=ct(),R=cur.idxs[i].R,n=Math.min(k,R.length-1);KA.pc={x:1244+(77+204*n/Math.max(1,R.length-1))*.93,y:1010+(124-82*clip(R[n],0,1))*.93}}
// ================== VEKTOR MNEMOSXEMA (to'liq tahrirlanadigan) ==================
// Har bir uskuna alohida obyekt: {id,t:turi,x,y,r:burchak,s:masshtab,p:{xususiyatlar}}; quvur/sim: {id,t,pts:[[x,y],..],p}
const VM={model:null,edit:false,sel:null,undo:[],redo:[],mode:null,draft:null,grid:5,rt:[],ctx:null,built:false,W:1289,H:807};
const VM_KEY='kondensat_mnemo_v1';
const r2=v=>Math.round(v*100)/100;
let vmSeq=1;const vmId=()=>'o'+Date.now().toString(36).slice(-5)+(vmSeq++);
const xa=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const FONT='Segoe UI,Roboto,Arial,sans-serif';
// oqim manbalari (animatsiya qaysi jarayon holatiga bog'lanadi)
const FLOWS=[['on','Doim ishlaydi / ochiq'],['off','To‘xtagan / yopiq'],['src','Manbalardan kelish'],['inA','T-1A ga kirish (HS-106)'],['inB','T-1B ga kirish (HS-107)'],['outA','T-1A dan chiqish'],['outB','T-1B dan chiqish'],['p1','P-1 nasosi'],['p2','P-1S nasosi'],['rec','Qaytarish (ZI-110)'],['recA','Qaytarish → T-1A'],['recB','Qaytarish → T-1B'],['trip','SIS trip']];
// o'lchov o'zgaruvchilari
const MVARS=[['','—'],['A.Ld','LI-101 sath T-1A, %'],['A.P','PI-102 bosim T-1A'],['A.T','TI-103 harorat T-1A'],['A.S1','SIS sath T-1A (104)'],['A.S2','SIS sath T-1A (105)'],['B.Ld','LI-201 sath T-1B, %'],['B.P','PI-202 bosim T-1B'],['B.T','TI-203 harorat T-1B'],['B.S1','SIS sath T-1B (204)'],['B.S2','SIS sath T-1B (205)'],['A.QIN','Kirish oqimi T-1A'],['B.QIN','Kirish oqimi T-1B'],['NP','Ishlayotgan nasoslar soni'],['Q','FQI-113 ishlab chiqarish'],['R','AI xavf indeksi R']];
const MATS=[['gas','Gaz'],['air','Havo'],['hot','Issiq agent'],['wet','Nam material'],['dry','Quruq mahsulot'],['dust','Chang'],['smoke','Tutun / ishlatilgan agent'],['water','Suv / suyuqlik'],['none','Oqimsiz']];
const PKINDS={gas:['#e6c24c','#fff2b0'],air:['#3b82e6','#b3d8ff'],hot:['#9aa2aa','#ffffff'],metal:['#a9b0b7','#f4f6f8'],copper:['#c7975a','#f7dfb4'],water:['#2e9fd0','#bfeaff'],dark:['#59616a','#b9c0c7']};
const VM_DEFS=`<defs>
<linearGradient id="gMV" x1="0" x2="1"><stop offset="0" stop-color="#6f777f"/><stop offset=".28" stop-color="#eef1f4"/><stop offset=".62" stop-color="#c3c9cf"/><stop offset="1" stop-color="#666e76"/></linearGradient>
<linearGradient id="gMH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f777f"/><stop offset=".3" stop-color="#eef1f4"/><stop offset=".65" stop-color="#bfc5cb"/><stop offset="1" stop-color="#5f676f"/></linearGradient>
<linearGradient id="gCuV" x1="0" x2="1"><stop offset="0" stop-color="#6a4a22"/><stop offset=".3" stop-color="#f3d9a8"/><stop offset=".65" stop-color="#c79a5c"/><stop offset="1" stop-color="#5e4020"/></linearGradient>
<linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16348a"/><stop offset=".35" stop-color="#5b8dff"/><stop offset=".7" stop-color="#2451c9"/><stop offset="1" stop-color="#12296e"/></linearGradient>
<linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2463a"/><stop offset=".5" stop-color="#c22c22"/><stop offset="1" stop-color="#7c140f"/></linearGradient>
<linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7dc7c"/><stop offset=".5" stop-color="#8cbd52"/><stop offset="1" stop-color="#557a2c"/></linearGradient>
<linearGradient id="gCab" x1="0" x2="1"><stop offset="0" stop-color="#2b323a"/><stop offset=".5" stop-color="#3a424b"/><stop offset="1" stop-color="#252b32"/></linearGradient>
<linearGradient id="gMod" x1="0" x2="1"><stop offset="0" stop-color="#9aa1a8"/><stop offset=".4" stop-color="#e3e6e9"/><stop offset="1" stop-color="#8d949b"/></linearGradient>
<linearGradient id="gBelt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5058"/><stop offset=".25" stop-color="#2b3138"/><stop offset="1" stop-color="#15191e"/></linearGradient>
<linearGradient id="gScr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c2238"/><stop offset="1" stop-color="#061321"/></linearGradient>
<linearGradient id="gKbd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a414a"/><stop offset="1" stop-color="#1b2026"/></linearGradient>
<linearGradient id="gWin" x1="0" x2="1"><stop offset="0" stop-color="#5c6263"/><stop offset=".35" stop-color="#3d3e3b"/><stop offset="1" stop-color="#242523"/></linearGradient>
<linearGradient id="gSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0cf8e"/><stop offset=".25" stop-color="#ddb572"/><stop offset="1" stop-color="#b98f52"/></linearGradient>
<linearGradient id="gFire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0804"/><stop offset=".5" stop-color="#4a0e05"/><stop offset="1" stop-color="#2a0603"/></linearGradient>
<linearGradient id="gFlame" x1="0" x2="1"><stop offset="0" stop-color="#fffbe8"/><stop offset=".22" stop-color="#ffe27a"/><stop offset=".55" stop-color="#ff9a2a"/><stop offset=".85" stop-color="#e2380e" stop-opacity=".75"/><stop offset="1" stop-color="#8a1204" stop-opacity="0"/></linearGradient>
<linearGradient id="gFlameB" x1="0" x2="1"><stop offset="0" stop-color="#9fd8ff"/><stop offset=".35" stop-color="#4f8dff" stop-opacity=".7"/><stop offset="1" stop-color="#2a4dff" stop-opacity="0"/></linearGradient>
<radialGradient id="gBub" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e4e9ef"/><stop offset="1" stop-color="#9aa6b3"/></radialGradient>
<radialGradient id="gRoll" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cfd3d8"/><stop offset="1" stop-color="#7d848c"/></radialGradient>
<radialGradient id="gHousing" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f1f3f5"/><stop offset=".6" stop-color="#b6bdc4"/><stop offset="1" stop-color="#6c747c"/></radialGradient>
<radialGradient id="gWet" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#d2a562"/><stop offset=".55" stop-color="#95693a"/><stop offset="1" stop-color="#5a3c1e"/></radialGradient>
<radialGradient id="gDry" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff6d8"/><stop offset=".5" stop-color="#e8c47c"/><stop offset="1" stop-color="#a47a38"/></radialGradient>
<radialGradient id="gDomeW" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#e6c58e"/><stop offset=".45" stop-color="#b08954"/><stop offset="1" stop-color="#5e4122"/></radialGradient>
<radialGradient id="gDomeD" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#fffbe9"/><stop offset=".45" stop-color="#ecd29a"/><stop offset="1" stop-color="#9c7640"/></radialGradient>
<radialGradient id="gDust" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff8e6"/><stop offset=".6" stop-color="#f1d9a4" stop-opacity=".8"/><stop offset="1" stop-color="#e9c887" stop-opacity="0"/></radialGradient>
<radialGradient id="gSpark" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffb24a"/><stop offset="1" stop-color="#ff4a10" stop-opacity="0"/></radialGradient>
<radialGradient id="gGasP" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#fff3a8" stop-opacity="0"/></radialGradient>
<radialGradient id="gAirP" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfeaff" stop-opacity="0"/></radialGradient>
<radialGradient id="gWatP" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e8fbff"/><stop offset="1" stop-color="#7fd6ff" stop-opacity="0"/></radialGradient>
<radialGradient id="gSmokeP" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#eef2f5" stop-opacity=".85"/><stop offset="1" stop-color="#eef2f5" stop-opacity="0"/></radialGradient>
<radialGradient id="gSmoke" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c9d0d6" stop-opacity=".75"/><stop offset=".6" stop-color="#aab3bb" stop-opacity=".35"/><stop offset="1" stop-color="#aab3bb" stop-opacity="0"/></radialGradient>
<radialGradient id="gHeat" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb347" stop-opacity=".85"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient>
<radialGradient id="gBg" cx=".45" cy=".4" r=".8"><stop offset="0" stop-color="#1d2a36"/><stop offset="1" stop-color="#0d151d"/></radialGradient>
<pattern id="pSand" width="7" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".8" fill="#8a6434" opacity=".55"/><circle cx="5" cy="4.2" r=".7" fill="#fff0c8" opacity=".5"/></pattern>
<pattern id="pGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#2dd4bf" stroke-opacity=".09" stroke-width=".6"/></pattern>
<filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="fBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
<filter id="fSoft1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".6"/></filter>
<filter id="fSh" x="-15%" y="-15%" width="135%" height="140%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="2.2" flood-color="#000" flood-opacity=".55"/></filter>
</defs>`;
// ---------- elementlar kutubxonasi ----------
const T={};
const TX=(x,y,t,o={})=>`<text x="${x}" y="${y}" font-size="${o.fs||12}" text-anchor="${o.a||'start'}" fill="${o.c||'#e9f1f7'}" font-weight="${o.w||700}" font-family="${FONT}"${o.cls?` class="${o.cls}"`:''}>${t}</text>`;
const bolt=(x,y)=>`<circle cx="${x}" cy="${y}" r="1.3" fill="#8b939b" stroke="#2a3036" stroke-width=".4"/>`;
const cross=(r,w,cls)=>`<g class="${cls||'spin'}"><line x1="${-r*.62}" y1="0" x2="${r*.62}" y2="0" stroke="#23282e" stroke-width="${w}" stroke-linecap="round"/><line x1="0" y1="${-r*.62}" x2="0" y2="${r*.62}" stroke="#23282e" stroke-width="${w}" stroke-linecap="round"/><circle r="${r*.14}" fill="#23282e"/></g>`;
T.panel={n:'Holat paneli',L:4,props:[['kind','Turi','sel',[['status','Holat (vaqt, R, hodisa)'],['burner','Gorelka va o‘txona']]],['w','Eni','num'],['h','Bo‘yi','num']],
  render(o){const p=o.p,w=p.w||300,h=p.h||64;let s=`<rect width="${w}" height="${h}" rx="7" fill="#07121b" fill-opacity=".94" stroke="#2b4a66" stroke-width="1.2"/>`;
    if(p.kind==='burner'){s+=TX(12,19,'Gorelka va o‘txona (6, 7)',{fs:14.5,c:'#e6edf3'});['FT01 gaz','FT02 birlamchi havo','FT03 ikkilamchi havo','TT01 o‘txona','λ havo/gaz','Klapan 1-2/1-1/1-3'].forEach((t,i)=>{s+=TX(12,38+i*17,t,{fs:13,c:'#a9cfe8',w:600})+TX(w-10,38+i*17,'—',{fs:13,a:'end',c:'#7fd6ff',cls:'r'+i})});}
    else{const ic=(y,warn)=>warn?`<path d="M16 ${y-10}L23 ${y+2}H9Z" fill="#ef5350"/><text x="16" y="${y+0.5}" font-size="8" text-anchor="middle" fill="#fff" font-weight="700" font-family="${FONT}">!</text>`:`<circle cx="16" cy="${y-4.5}" r="5.2" fill="none" stroke="#c9d6e2" stroke-width="1.4"/><path d="M16 ${y-7.5}V${y-4.5}L18.4 ${y-3}" stroke="#c9d6e2" stroke-width="1.3" fill="none"/>`;
      s+=ic(20)+ic(40)+ic(60,1)+TX(28,20,'t = — min',{fs:15,cls:'l1'})+TX(28,40,'AI xavf indeksi R = —',{fs:15,c:'#ffd34d',cls:'l2'})+TX(28,60,'Hodisa: —',{fs:15,c:'#9fb3c0',cls:'l3'});}
    return s},
  rt(o,g){const q=c=>g.querySelector('.'+c);return {dyn(c){const d=c.d,k=c.k,P=c.P,f=(v,n)=>isFinite(v)?fmt(v,n):'NaN';
    if(o.p.kind==='burner'){const L=vmAlarm('LAM',c),t1=vmAlarm('TT01',c),col=s=>s==='trip'?'#ff5a4f':s==='warn'?'#ffd34d':'#7fd6ff';
      const v=[[f(d.FT01[k],0)+' m³/soat',L],[f(d.FT02[k],0)+' m³/soat',L],[f(d.FT03[k],0)+' m³/soat',''],[f(d.TT01[k],0)+' °C',t1],[d.burner[k]?f(d.LAM[k],2):'—',L],[f(d.U12[k],0)+'/'+f(d.U11[k],0)+'/'+f(d.U13[k],0)+' %','warn']];
      v.forEach((r,i)=>{const e=q('r'+i);e.textContent=r[0];e.setAttribute('fill',col(r[1]))})}
    else{q('l1').textContent=`t = ${fmt(k*P.dt,1)} min`;q('l2').textContent=`AI xavf indeksi R = ${fmt(c.id.R[k],2)}`;const e=q('l3');e.textContent=c.trip?`Hodisa: ${EV[c.tripJ].id}`:'Hodisa: yo‘q';e.setAttribute('fill',c.trip?'#ff5a4f':'#9fb3c0')}}}}};
T.label={n:'Yozuv',L:3,props:[['text','Matn (yangi qator: \\n)','text'],['fs','Shrift o‘lchami','num'],['c','Rangi','color'],['a','Tekislash','sel',[['start','Chap'],['middle','Markaz'],['end','O‘ng']]]],
  render(o){const p=o.p,ls=String(p.text||'Yozuv').split('\\n');return ls.map((l,i)=>TX(0,i*(p.fs||13.5)*1.12,xa(l),{fs:p.fs||13.5,c:p.c||'#f1f5f8',a:p.a||'start',w:p.w||700})).join('')}};
T.value={n:'Qiymat oynasi',L:3,props:[['var','O‘lchov','var'],['unit','Birlik','text'],['dec','Kasr xonasi','num'],['w','Eni','num'],['h','Bo‘yi','num'],['fs','Shrift','num']],
  render(o){const p=o.p,w=p.w||50,h=p.h||17;return `<rect width="${w}" height="${h}" rx="4" fill="#06182a" stroke="#2f6f9a" stroke-width="1.1"/>`+TX(w-5,h/2+(p.fs||13)*0.36,'—',{fs:p.fs||13,a:'end',c:'#7fd6ff',cls:'v'})},
  rt(o,g){const e=g.querySelector('.v');return {dyn(c){const v=vmVal(o.p.var,c),a=vmAlarm(o.p.var,c);e.textContent=(isFinite(v)?fmt(v,+o.p.dec||0):'—')+(o.p.unit?' '+o.p.unit:'');e.setAttribute('fill',a==='trip'?'#ff5a4f':a==='warn'?'#ffd34d':'#7fd6ff')}}}};
T.sensor={n:'Datchik (o‘lchov asbobi)',L:3,props:[['tag','Teg (masalan TT03)','text'],['var','O‘lchov','var'],['alarm','Signalizatsiya bo‘yicha','var'],['rim','Hoshiya rangi','color']],
  render(o){const p=o.p,t=String(p.tag||'XX');return `<circle class="sping" r="15.5" fill="none" stroke="#7fd6ff" stroke-width="1.2"/><circle r="16.5" fill="url(#gBub)" stroke="${p.rim||'#39b54a'}" stroke-width="2.4" filter="url(#fSh)"/><circle r="13.2" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width=".8"/>`+TX(0,3.8,xa(t),{fs:t.length>4?9:10.5,a:'middle',c:'#1a2230'})+`<g class="ring" opacity="0"><circle r="20" fill="none" stroke-width="3"/><circle r="24" fill="none" stroke-width="1.2" opacity=".6"/></g>`},
  rt(o,g){const rg=g.querySelector('.ring');return {dyn(c){const a=vmAlarm(o.p.alarm||o.p.var,c);rg.setAttribute('opacity',a?1:0);rg.setAttribute('stroke',a==='trip'?'#ff3b30':'#ffb020')}}}};
T.valve={n:'Klapan (rostlovchi)',L:3,props:[['label','Belgisi (masalan 1-4)','text'],['var','Ochilish signali','var']],
  render(o){const p=o.p;return `<g filter="url(#fSh)"><polygon points="-11,-7.5 0,0 -11,7.5" fill="url(#gMH)" stroke="#39424a" stroke-width=".8"/><polygon points="11,-7.5 0,0 11,7.5" fill="url(#gMH)" stroke="#39424a" stroke-width=".8"/><polygon points="-4.5,13 4.5,13 0,4.5" fill="url(#gMH)" stroke="#39424a" stroke-width=".7"/></g><circle class="sg" r="9" fill="#3dff7a" opacity=".2" filter="url(#fGlow)"/><circle class="st" r="2.6" fill="#3dff7a"/>`+(p.label?TX(0,-14,xa(p.label),{fs:11,a:'middle',c:'#dfe7ee'}):'')},
  rt(o,g){const sg=g.querySelector('.sg'),st=g.querySelector('.st');return {dyn(c){const u=o.p.var?vmVal(o.p.var,c):100,op=u>2,col=op?'#3dff7a':'#ff3b30';sg.setAttribute('fill',col);st.setAttribute('fill',col);sg.setAttribute('opacity',op?(0.12+0.35*Math.min(1,u/100)).toFixed(2):0.3);st.setAttribute('r',op?(2+1.6*Math.min(1,u/100)).toFixed(2):2.4)}}}};
T.motor={n:'Elektr dvigatel',L:2,props:[['flow','Ishlash holati','flow']],
  render(){let f='';for(let i=0;i<5;i++)f+=`<line x1="${-7+i*3}" y1="-6" x2="${-7+i*3}" y2="6" stroke="#0f2566" stroke-width=".7"/>`;return `<g filter="url(#fSh)"><rect x="-12" y="-5" width="3" height="10" rx="1" fill="#1b2f6e"/><rect x="-9.5" y="-7" width="17" height="14" rx="2.5" fill="url(#gBlue)" stroke="#0e1f55" stroke-width=".6"/>${f}<rect x="-4" y="-10" width="7" height="3.5" rx=".8" fill="#2451c9"/><rect x="7.5" y="-1.6" width="5" height="3.2" fill="url(#gMH)"/></g><circle class="ml" cx="-6" cy="-8.5" r="1.1" fill="#3dff7a" opacity="0"/>`},
  rt(o,g){const l=g.querySelector('.ml');return {step(dt,t,C){l.setAttribute('opacity',C[o.p.flow||'on']>0.1?1:0.15)}}}};
T.cap={n:'Quvur qopqog‘i',L:2,props:[],render(){return `<rect x="-7" y="-4" width="14" height="8" rx="1.2" fill="url(#gMH)" stroke="#5d646b" stroke-width=".5"/><path d="M-5 -4H5L0 -12Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".5"/>`}};
T.pump={n:'Nasos',L:2,props:[['flow','Ishlash holati','flow']],
  render(){return `<g filter="url(#fSh)"><rect x="-14" y="12" width="28" height="5" rx="1" fill="#39414a"/><path d="M-13 0A13 13 0 1 1 5 12H-13Z" fill="url(#gHousing)" stroke="#5d646b" stroke-width=".6"/><rect x="-2" y="-19" width="10" height="7" fill="url(#gMV)"/></g><circle r="8" fill="#0d1318"/><g class="imp">${[0,90,180,270].map(a=>`<path d="M0 0L${r2(7*Math.cos(a*Math.PI/180))} ${r2(7*Math.sin(a*Math.PI/180))}" stroke="#aab2ba" stroke-width="2.2" stroke-linecap="round"/>`).join('')}</g><circle r="2" fill="#39414a"/>`},
  rt(o,g){const e=g.querySelector('.imp');let a=0;return {step(dt,t,C){a=(a+900*C[o.p.flow||'on']*dt)%360;e.setAttribute('transform',`rotate(${a.toFixed(1)})`)}}}};
T.tank={n:'Rezervuar / idish',L:2,props:[['var','Sath o‘lchovi','var'],['w','Eni','num'],['h','Bo‘yi','num']],
  render(o){const w=o.p.w||50,h=o.p.h||80,cp='cp_'+o.id;return `<clipPath id="${cp}"><rect x="0" y="0" width="${w}" height="${h}" rx="${w/2}" ry="10"/></clipPath><g filter="url(#fSh)"><rect width="${w}" height="${h}" rx="${w/2}" ry="10" fill="url(#gMV)" stroke="#5d646b" stroke-width=".6"/></g><g clip-path="url(#${cp})"><rect class="lq" x="0" width="${w}" y="${h/2}" height="${h}" fill="#2e9fd0" opacity=".75"/></g>`},
  rt(o,g){const e=g.querySelector('.lq'),h=o.p.h||80;return {dyn(c){const v=vmVal(o.p.var,c),L=isFinite(v)?Math.max(0,Math.min(100,v)):50;e.setAttribute('y',(h-h*L/100).toFixed(2))}}}};
// ---------- boshqaruv qurilmalari ----------
const ledsHtml=(pts)=>pts.map(p=>`<circle class="led" data-k="${p[3]}" cx="${p[0]}" cy="${p[1]}" r="${p[4]||1.15}" fill="${p[2]}" opacity="0"/>`).join('');
const ledRt=g=>{const L=[...g.querySelectorAll('.led')].map(e=>({e,k:e.dataset.k,on:null}));let acc=0;return (dt,t,S)=>{acc+=dt;if(acc<.09)return;acc=0;const tr=S.trip>.5,bl=(t*2.2)%1<.5;
  for(const l of L){let on=l.on;if(l.k==='io')on=Math.random()<.12?!on:!!on;else if(l.k==='ao')on=Math.random()<.08?!on:!!on;else if(l.k==='run'||l.k==='pw')on=true;else if(l.k==='com')on=Math.random()<.55;else if(l.k==='com2')on=(t*3)%1<.5;else if(l.k==='err')on=tr&&bl;
    if(on!==l.on){l.on=on;l.e.setAttribute('opacity',on?1:0)}}}};
T.inverter={n:'Chastota o‘zgartirgich (invertor)',L:2,props:[],
  render(){const btn=[['#39d98a',0,0],['#39d98a',1,0],['#d9dde2',2,0],['#e05252',0,1],['#d9dde2',1,1],['#d9dde2',2,1],['#39d98a',0,2],['#d9dde2',1,2],['#e05252',2,2]].map(b=>`<rect x="${14+b[1]*8}" y="${41+b[2]*7}" width="6" height="4.5" rx="1.2" fill="${b[0]}"/>`).join('');
   const tri=(x,y)=>`<path d="M${x} ${y-7}L${x+7.5} ${y+5}H${x-7.5}Z" fill="#f2c230" stroke="#6b5200" stroke-width=".6"/><text x="${x}" y="${y+3.6}" font-size="7" text-anchor="middle" fill="#1a1a1a" font-weight="700" font-family="${FONT}">!</text>`;
   return `<g filter="url(#fSh)"><rect width="172" height="128" rx="3" fill="url(#gCab)" stroke="#0a0d11"/></g><rect x="4" y="-3" width="164" height="6" rx="1" fill="#3b434c"/>
    <rect x="8" y="8" width="48" height="112" rx="2" fill="#1f252c" stroke="#39414a"/><rect x="12" y="16" width="30" height="58" rx="2" fill="#12171c" stroke="#39414a" stroke-width=".6"/><rect x="14" y="20" width="26" height="14" rx="1" fill="#062a33"/>${TX(38.5,31,'0.0',{fs:8,a:'end',c:'#7dfff0',cls:'hz'})}<text x="15.3" y="24.5" font-size="3.4" fill="#7dfff0" font-family="Consolas,monospace">Hz</text>${btn}
    ${tri(28,102)}<rect x="62" y="8" width="86" height="112" rx="2" fill="#2c343c" stroke="#3f4851"/>${TX(105,40,'INVERTOR',{fs:11.5,a:'middle',c:'#e3e9ef'})}${tri(105,90)}${bolt(66,12)+bolt(144,12)+bolt(66,116)+bolt(144,116)}
    <rect x="152" y="6" width="18" height="116" rx="1.5" fill="#9aa2aa"/><rect x="155" y="10" width="12" height="108" fill="#2a3038"/>${Array.from({length:14},(_,i)=>`<rect x="156.5" y="${13+i*7.5}" width="9" height="4.5" fill="#59616a"/>`).join('')}
    ${Array.from({length:12},(_,i)=>`<rect x="${10+i*13}" y="128" width="6" height="7" rx="1" fill="#2f6bd8"/>`).join('')}
    ${ledsHtml([...Array.from({length:10},(_,i)=>[161,16+i*10.5,i%3?'#6dff9a':'#ffb020','io',1.3]),[17,63,'#3dff7a','run',1.6],[23,63,'#ffd24a','com',1.6]])}`},
  rt(o,g){const hz=g.querySelector('.hz'),led=ledRt(g);let acc=0;return {step(dt,t,C,S){led(dt,t,S);acc+=dt;if(acc>.25){acc=0;hz.textContent=C.hz.toFixed(1)}}}}};
T.plc={n:'PLC kontroller',L:2,props:[],
  render(){let s=`<g filter="url(#fSh)"><rect width="242" height="132" rx="3" fill="#3b434c" stroke="#1a1f25"/></g><rect x="0" y="3" width="242" height="6" fill="url(#gMH)"/><rect x="0" y="123" width="242" height="6" fill="url(#gMH)"/>
   <rect x="2" y="6" width="43" height="120" rx="1.5" fill="url(#gMod)" stroke="#5d646b" stroke-width=".5"/>${bolt(8,14)+bolt(38,14)+bolt(8,118)+bolt(38,118)}<rect x="10" y="40" width="26" height="30" rx="2" fill="#b3bac1" stroke="#7d858d" stroke-width=".5"/>${Array.from({length:5},(_,i)=>`<line x1="13" y1="${45+i*5}" x2="33" y2="${45+i*5}" stroke="#7d858d" stroke-width=".8"/>`).join('')}
   <rect x="45" y="34" width="13" height="92" fill="#1c2127" stroke="#0d1115" stroke-width=".5"/><rect x="58" y="34" width="27" height="92" fill="#232a31" stroke="#0d1115" stroke-width=".5"/><rect x="59.5" y="48.5" width="16" height="11" rx="1" fill="#06222a"/>${TX(67.5,56.2,'RUN',{fs:5.6,a:'middle',c:'#6dffe0',w:400,cls:'cpu'})}
   <rect x="61" y="76" width="18" height="10" rx="1" fill="#15191e"/><rect x="85" y="34" width="10" height="92" fill="#15191e"/>`;
   for(let i=0;i<8;i++){const x=95+i*15.2;s+=`<rect x="${x}" y="34" width="14.2" height="92" rx="1" fill="#1a2026" stroke="#0d1115" stroke-width=".5"/><rect x="${x+1}" y="36" width="12.2" height="6" rx="1" fill="#2a3038"/><rect x="${x+2}" y="115" width="10" height="9" rx="1" fill="#2f6bd8" opacity=".85"/>`}
   s+=`<rect x="217" y="34" width="13" height="92" fill="#1c2127" stroke="#0d1115" stroke-width=".5"/><rect x="230" y="6" width="10" height="120" fill="url(#gMod)"/>
   <rect x="94" y="8" width="120" height="24" rx="5" fill="var(--win)" stroke="#2e5f86" stroke-width="1"/>${TX(154,26,'PLC',{fs:16,a:'middle',c:'#ffffff'})}`;
   const L=[];for(let i=0;i<8;i++)for(const dx of [4,10])for(let r=0;r<16;r++)L.push([95+i*15.2+dx,54+r*3.35,r<2||r>13?'#ffd35a':'#7fd4ff','io']);
   for(let r=0;r<12;r++)L.push([50,53+r*4.6,r%4===0?'#ffb020':'#6dff9a','pw']);for(let r=0;r<14;r++)L.push([223.5,51+r*3.9,r%3?'#ff9d3a':'#7fd4ff','io']);
   L.push([62.5,67.5,'#3dff7a','run',1.4],[66,67.5,'#ffd24a','com',1.4],[69.5,67.5,'#3dff7a','com2',1.4],[73,67.5,'#ff3b30','err',1.4],[62,96,'#3dff7a','run',1.3],[62,99.6,'#ffd24a','com',1.3],[62,103.2,'#3dff7a','com2',1.3]);
   return s+ledsHtml(L)},
  rt(o,g){const cpu=g.querySelector('.cpu'),led=ledRt(g);let acc=0;return {step(dt,t,C,S){led(dt,t,S);acc+=dt;if(acc>.25){acc=0;const tr=S.trip>.5,bl=(t*2.2)%1<.5;cpu.textContent=tr?(bl?'TRIP':'ERR'):'RUN';cpu.setAttribute('fill',tr?'#ff6b5a':'#6dffe0')}}}}};
T.aomod={n:'Analog chiqish moduli',L:2,props:[],
  render(){let s=`<g filter="url(#fSh)"><rect width="194" height="112" rx="3" fill="#3b434c" stroke="#1a1f25"/></g><rect x="3" y="3" width="188" height="106" rx="2" fill="#262d34"/><rect x="16" y="6" width="162" height="20" rx="4" fill="var(--win)" stroke="#2e5f86"/>${TX(97,20,'ANALOG CHIQISH MODULI',{fs:10.5,a:'middle',c:'#fff'})}
   <rect x="8" y="30" width="20" height="76" rx="1" fill="#1c2127"/><rect x="30" y="30" width="30" height="76" rx="1" fill="#232a31"/><rect x="33" y="34" width="24" height="10" rx="1" fill="#06222a"/>${Array.from({length:6},(_,i)=>`<rect x="${35+i*3.5}" y="37" width="2.4" height="4" fill="#6dffd8" opacity=".8"/>`).join('')}`;
   for(let i=0;i<14;i++){const x=62+i*8.6;s+=`<rect x="${x}" y="30" width="7.6" height="76" rx="1" fill="#1a2026" stroke="#0d1115" stroke-width=".4"/><rect x="${x+1.5}" y="36" width="4.6" height="44" fill="#11151a"/><rect x="${x+1}" y="96" width="5.6" height="7" rx="1" fill="#2f6bd8" opacity=".8"/>`}
   s+=`<rect x="184" y="40" width="4" height="62" rx="1" fill="#d9a93a"/>`;const L=[];for(let i=0;i<14;i++)L.push([65.8+i*8.6,86,'#ffc24a','ao',1.6]);for(let r=0;r<12;r++)L.push([18,33+r*4,'#6dffd8','io',1]);for(let r=0;r<3;r++)L.push([8,47+r*10,'#3dff7a','run',1.2]);
   for(let i=0;i<14;i++)for(let r=0;r<5;r++)L.push([65.8+i*8.6,40+r*8,'#7fd4ff','io',.9]);return s+ledsHtml(L)},
  rt(o,g){const led=ledRt(g);return {step(dt,t,C,S){led(dt,t,S)}}}};
T.pc={n:'Operator kompyuteri (SCADA)',L:2,props:[],
  render(){let s=`<rect x="-34" y="148" width="318" height="58" rx="7" fill="url(#gKbd)" stroke="#0e1216" filter="url(#fSh)"/>`;for(let r=0;r<5;r++)for(let c=0;c<(r===4?9:20);c++)s+=`<rect x="${-24+c*(r===4?14:12)+(r===4&&c===4?0:0)}" y="${156+r*9}" width="${r===4&&c===4?48:9.5}" height="6.5" rx="1.2" fill="#15191e" stroke="#3a424b" stroke-width=".4"/>`;
   s+=`<ellipse cx="262" cy="170" rx="11" ry="15" fill="#1b2026" stroke="#3a424b" filter="url(#fSh)"/><line x1="262" y1="157" x2="262" y2="166" stroke="#3a424b"/>
   <rect x="108" y="134" width="36" height="10" fill="#2a3038"/><rect x="92" y="142" width="68" height="5" rx="2" fill="#2a3038"/>
   <g filter="url(#fSh)"><rect width="252" height="134" rx="6" fill="#1b2129" stroke="#3a434d"/></g><rect x="8" y="8" width="236" height="112" rx="2" fill="url(#gScr)"/>
   ${TX(18,24,'R(t) — AI xavf indeksi',{fs:12.5,c:'#6fc8f2'})}<circle class="lv" cx="154" cy="20" r="2.4" fill="#ff3b30"/>${TX(159,23.3,'LIVE',{fs:8.5,c:'#ff8a80'})}<rect x="192" y="10" width="50" height="20" rx="3" fill="#0a2338"/>${TX(238,26.5,'—',{fs:18,a:'end',c:'#6fc8f2',cls:'rv'})}`;
   for(let i=0;i<=5;i++){const y=118-81*i/5;s+=`<line x1="36" y1="${y}" x2="239" y2="${y}" stroke="rgba(120,170,220,.18)" stroke-width=".8"/>`+TX(31,y+3,(i/5).toFixed(1),{fs:7.5,a:'end',c:'#cfe0ee',w:600})}
   for(let i=1;i<6;i++){const x=36+203*i/6;s+=`<line x1="${x}" y1="37" x2="${x}" y2="118" stroke="rgba(120,170,220,.12)" stroke-width=".8"/>`}
   s+=`<line class="th" x1="36" x2="239" stroke="rgba(255,120,80,.6)" stroke-dasharray="4 3"/><polyline class="cv" fill="none" stroke="#f4d03f" stroke-width="2" stroke-linejoin="round"/><line class="sc" y1="37" y2="118" stroke="#6fc8f2" stroke-width=".8" opacity=".5"/><circle class="cd2" r="6" fill="#ffe46a" opacity=".3" filter="url(#fGlow)"/><circle class="cd" r="2.6" fill="#ffe46a"/>
   <rect x="126" y="122" width="124" height="19" rx="4" fill="#0e1e2c" stroke="#2e5f86"/>${TX(188,135.5,'Personal kompyuter',{fs:11.5,a:'middle',c:'#fff'})}<circle class="nl" cx="243" cy="126" r="1.5" fill="#3dff7a"/>`;return s},
  rt(o,g){const q=c=>g.querySelector('.'+c),cv=q('cv'),th=q('th'),sc=q('sc'),cd=q('cd'),cd2=q('cd2'),rv=q('rv'),lv=q('lv'),nl=q('nl');let px=36,py=118;
    return {dyn(c){const R=c.id.R,n=Math.min(c.k,R.length-1),P=c.P,st=Math.max(1,Math.floor(R.length/220));let pts='';for(let i=0;i<=n;i+=st)pts+=`${r2(36+203*i/(R.length-1))},${r2(118-81*clip(R[i],0,1))} `;cv.setAttribute('points',pts);
      const ty=118-81*P.RTH;th.setAttribute('y1',ty);th.setAttribute('y2',ty);px=36+203*n/Math.max(1,R.length-1);py=118-81*clip(R[n],0,1);rv.textContent=fmt(R[n],2);rv.setAttribute('fill',R[n]>=P.RTH?'#ffd34d':'#6fc8f2')},
      step(dt,t){sc.setAttribute('x1',px);sc.setAttribute('x2',px);cd.setAttribute('cx',px);cd.setAttribute('cy',py);cd2.setAttribute('cx',px);cd2.setAttribute('cy',py);cd2.setAttribute('r',(4+2.5*Math.abs(Math.sin(t*3))).toFixed(2));lv.setAttribute('opacity',(t%1)<.5?1:.2);if(Math.random()<.2)nl.setAttribute('opacity',Math.random()<.6?1:.2)}}}};
// ---------- quvurlar va signal simlari ----------
const PMAT={gas:{g:'gGasP',r:1.1,sp:150,gap:16,band:'#fffbe0'},air:{g:'gAirP',r:1.1,sp:130,gap:16,band:'#f2fbff'},hot:{g:'gSpark',r:1.4,sp:120,gap:8,band:'#ffd08a'},wet:{g:'gWet',r:2.1,sp:45,gap:7},dry:{g:'gDry',r:1.8,sp:42,gap:9},dust:{g:'gDust',r:1.3,sp:95,gap:7},smoke:{g:'gSmokeP',r:2.6,sp:90,gap:15,band:'#ffffff'},water:{g:'gWatP',r:1.4,sp:80,gap:10,band:'#e8fbff'},none:null};
function pGeo(pts){const seg=[];let L=0;for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];const l=Math.hypot(x1-x0,y1-y0);seg.push({x0,y0,dx:x1-x0,dy:y1-y0,l,s:L});L+=l}return {seg,L}}
function pAt(P,s){if(s<0)s=0;if(s>P.L)s=P.L;let lo=0,hi=P.seg.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(P.seg[m].s<=s)lo=m;else hi=m-1}const g=P.seg[lo];if(!g)return [0,0,0,1];const u=g.l?(s-g.s)/g.l:0;return [g.x0+g.dx*u,g.y0+g.dy*u,g.l?-g.dy/g.l:0,g.l?g.dx/g.l:1]}
const ptsStr=pts=>pts.map(p=>r2(p[0])+','+r2(p[1])).join(' ');
T.pipe={n:'Quvur',L:1,line:1,props:[['kind','Quvur turi','sel',[['gas','Gaz (sariq)'],['air','Havo (ko‘k)'],['hot','Issiq agent (metall)'],['metal','Metall'],['copper','Mis rang (chang/mahsulot)'],['water','Suv'],['dark','To‘q kulrang']]],['w','Diametri','num'],['mat','Ichidagi oqim','sel',MATS],['flow','Oqim manbai','flow']],
  render(o){const p=o.p,w=+p.w||8,c=PKINDS[p.kind]||PKINDS.metal,P=ptsStr(o.pts),m=PMAT[p.mat];let s=`<polyline points="${P}" fill="none" stroke="#06090c" stroke-opacity=".55" stroke-width="${w+2.2}" stroke-linejoin="round" stroke-linecap="round" filter="url(#fSoft1)"/>
    <polyline points="${P}" fill="none" stroke="${c[0]}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${P}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="${w*.35}" stroke-linejoin="round" stroke-linecap="round" transform="translate(${w*.18} ${w*.18})"/>
    <polyline points="${P}" fill="none" stroke="${c[1]}" stroke-opacity=".75" stroke-width="${Math.max(.8,w*.26)}" stroke-linejoin="round" stroke-linecap="round" transform="translate(${-w*.16} ${-w*.16})"/>`;
    if(p.kind==='hot')s+=`<polyline class="hg" points="${P}" fill="none" stroke="#ff7a1a" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="0"/>`;
    if(m&&m.band)s+=`<polyline class="bd" points="${P}" fill="none" stroke="${m.band}" stroke-width="${Math.max(2,w*.5)}" stroke-linecap="round" stroke-dasharray="${w*1.2} ${w*4}" opacity="0" filter="url(#fSoft1)"/>`;
    if(m){const L=pGeo(o.pts).L,n=Math.max(2,Math.min(80,Math.round(L/m.gap)));s+=`<g class="pp">${Array.from({length:n},()=>`<circle r="${r2(Math.min(m.r*(w>9?1.15:1),w*.42))}" fill="url(#${m.g})"/>`).join('')}</g>`}
    return s+`<polyline class="hit" points="${P}" fill="none" stroke="transparent" stroke-width="${Math.max(12,w+6)}"/>`},
  rt(o,g){const p=o.p,m=PMAT[p.mat],P=pGeo(o.pts),cs=g.querySelector('.pp')?[...g.querySelector('.pp').children]:[],bd=g.querySelector('.bd'),hg=g.querySelector('.hg'),w=+p.w||8;let pos=0,bo=0;const ph=cs.map((_,i)=>(i*.618)%1*.6),wv=cs.map((_,i)=>2+(i*13%9)*.7),jit=Math.max(0,w*.18);
    return {step(dt,t,C){const f=C[p.flow||'on']||0;if(hg)hg.setAttribute('opacity',(Math.min(.55,C.flame*.35+C.hot*.2)).toFixed(2));if(!m)return;pos+=m.sp*f*dt;const vis=Math.min(1,f*2.2);
      if(bd){bo-=m.sp*1.05*f*dt;bd.style.strokeDashoffset=bo;bd.setAttribute('opacity',Math.min(.6,f*.9).toFixed(2))}const n=cs.length,L=P.L;if(!n||!L)return;
      for(let i=0;i<n;i++){const e=cs[i];if(vis<.01){e.setAttribute('opacity',0);continue}const u=((pos/L+i/n+ph[i]/n)%1+1)%1,sL=u*L,q=pAt(P,sL),j=Math.sin(t*wv[i]+i*1.7)*jit;e.setAttribute('cx',(q[0]+q[2]*j).toFixed(2));e.setAttribute('cy',(q[1]+q[3]*j).toFixed(2));e.setAttribute('opacity',(vis*Math.min(1,Math.min(sL,L-sL)/5)).toFixed(2))}}}}};
T.wire={n:'Signal simi',L:0,line:1,props:[['c','Rangi','color'],['w','Qalinligi','num'],['dash','Uzuq chiziq','sel',[['','Yo‘q'],['1','Ha']]],['pulse','Signal impulsi','sel',[['1','Ha'],['','Yo‘q']]]],
  render(o){const p=o.p,P=ptsStr(o.pts),c=p.c||'#5aa8ff',w=+p.w||1.6;return `<polyline points="${P}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"${p.dash?` stroke-dasharray="7 4"`:''} opacity=".92"/>`+(p.pulse===''?'':`<polyline class="sg" points="${P}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity=".6" filter="url(#fGlow)"/><polyline class="sc" points="${P}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`)+`<polyline class="hit" points="${P}" fill="none" stroke="transparent" stroke-width="10"/>`},
  rt(o,g){const a=g.querySelector('.sg'),b=g.querySelector('.sc');if(!a)return null;const L=pGeo(o.pts).L,seg=16,v=150+(o.id.charCodeAt(o.id.length-1)%5)*18,gap=(.8+(o.id.length%7)/7)*v,per=L+gap+seg,ph=Math.random()*per;
    for(const e of [a,b])e.setAttribute('stroke-dasharray',`${seg} ${per-seg}`);let tt=0;return {step(dt){tt+=dt;const s=(tt*v+ph)%per,off=seg-s;a.style.strokeDashoffset=off;b.style.strokeDashoffset=off}}}};

const VA={st:{gas:0,air1:0,air2:0,hot:0,flame:0,conv1:0,screw:0,feed:0,dry:0,prod:0,fan:0,mix:0,dust:0,trip:0,hz:0,on:1,off:0},cur:{},t:0,last:0,raf:0,paused:false,speed:1};for(const k in VA.st)VA.cur[k]=VA.st[k];
const vmLayer=o=>(T[o.t]||{}).L??2;
function vmObjHtml(o){const D=T[o.t];if(!D)return '';const inner=D.line?D.render(o):`<g transform="translate(${r2(o.x)} ${r2(o.y)})${o.r?` rotate(${r2(o.r)})`:''}${(o.s&&o.s!==1)||o.fx?` scale(${r2((o.s||1)*(o.fx?-1:1))} ${r2(o.s||1)})`:''}">${D.render(o)}</g>`;return inner}
function vmRtFor(o,g){const D=T[o.t];if(!D||!D.rt)return null;try{const r=D.rt(o,g);if(r){r.o=o;r.g=g}return r}catch(e){console.warn(e);return null}}
function vmRerender(o){const g=document.querySelector(`#vmL > .vo[data-id="${o.id}"]`);if(!g){vmBuild();return}g.innerHTML=vmObjHtml(o);VM.rt=VM.rt.filter(r=>r.o!==o);const r=vmRtFor(o,g);if(r){VM.rt.push(r);if(VM.ctx&&r.dyn)r.dyn(VM.ctx)}vmDrawSel()}
// ---------- muharrir (tahrirlash rejimi) ----------


const vmSel=()=>VM.model&&VM.model.find(o=>o.id===VM.sel);
function vmPt(e){const svg=$('vmSvg'),p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return [q.x,q.y]}
const vmSnap=v=>VM.grid?Math.round(v/VM.grid)*VM.grid:Math.round(v*10)/10;
let vmSaveT=0;function vmSave(){clearTimeout(vmSaveT);vmSaveT=setTimeout(()=>{try{localStorage.setItem(VM_KEY,JSON.stringify(VM.model))}catch(e){}},250)}
function vmPush(){VM.undo.push(JSON.stringify(VM.model));if(VM.undo.length>80)VM.undo.shift();VM.redo=[]}
function vmCommit(){vmSave();vmProps()}
function vmUndo(){if(!VM.undo.length)return;VM.redo.push(JSON.stringify(VM.model));VM.model=JSON.parse(VM.undo.pop());if(!vmSel())VM.sel=null;vmBuild();vmCommit()}
function vmRedo(){if(!VM.redo.length)return;VM.undo.push(JSON.stringify(VM.model));VM.model=JSON.parse(VM.redo.pop());if(!vmSel())VM.sel=null;vmBuild();vmCommit()}
function vmDrawSel(){const L=$('vmSelL');if(!L)return;let s='';const o=vmSel();
  if(VM.edit&&o){const D=T[o.t];if(D.line){s+=`<polyline points="${ptsStr(o.pts)}" fill="none" stroke="#2dd4bf" stroke-width="1.2" stroke-dasharray="4 3" pointer-events="none"/>`+o.pts.map((p,i)=>`<circle data-h="v" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="4.6" fill="${i===0?'#2dd4bf':'#0b1b24'}" stroke="#2dd4bf" stroke-width="1.4" style="cursor:move"/>`).join('')}
    else{const b=vmBoxOf(o);if(b){const x=b.x-3,y=b.y-3,w=b.width+6,h=b.height+6;
      s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#2dd4bf" stroke-width="1.2" stroke-dasharray="4 3" pointer-events="none"/><circle cx="${o.x}" cy="${o.y}" r="2.4" fill="#2dd4bf" pointer-events="none"/>
      <rect data-h="s" x="${x+w-5}" y="${y+h-5}" width="10" height="10" fill="#0b1b24" stroke="#2dd4bf" stroke-width="1.4" style="cursor:nwse-resize"/><line x1="${x+w/2}" y1="${y}" x2="${x+w/2}" y2="${y-16}" stroke="#2dd4bf" stroke-width="1" pointer-events="none"/><circle data-h="r" cx="${x+w/2}" cy="${y-20}" r="5" fill="#0b1b24" stroke="#2dd4bf" stroke-width="1.4" style="cursor:grab"/>`}}}
  if(VM.draft&&VM.draft.pts.length){const pts=VM.draft.hover?[...VM.draft.pts,VM.draft.hover]:VM.draft.pts;s+=`<polyline points="${ptsStr(pts)}" fill="none" stroke="#ffd34d" stroke-width="2" stroke-dasharray="5 3" pointer-events="none"/>`+VM.draft.pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#ffd34d" pointer-events="none"/>`).join('')}
  L.innerHTML=s}
function vmSelect(id){VM.sel=id;vmDrawSel();vmProps()}
function vmFinishLine(){const d=VM.draft;if(!d)return;if(d.pts.length>=2){vmPush();const o={id:vmId(),t:d.t,pts:d.pts,p:JSON.parse(JSON.stringify(VM_NEW[d.t]||{}))};VM.model.push(o);VM.draft=null;VM.mode=null;vmBuild();vmSelect(o.id);vmCommit()}else{VM.draft=null;VM.mode=null;vmDrawSel()}vmHint('')}
function vmDel(){const o=vmSel();if(!o)return;vmPush();VM.model=VM.model.filter(m=>m!==o);VM.sel=null;vmBuild();vmCommit()}
function vmDup(){const o=vmSel();if(!o)return;vmPush();const c=JSON.parse(JSON.stringify(o));c.id=vmId();if(c.pts)c.pts=c.pts.map(p=>[p[0]+15,p[1]+15]);else{c.x+=20;c.y+=20}VM.model.push(c);vmBuild();vmSelect(c.id);vmCommit()}
function vmZ(dir){const o=vmSel();if(!o)return;vmPush();const i=VM.model.indexOf(o);VM.model.splice(i,1);if(dir>0)VM.model.push(o);else VM.model.unshift(o);vmBuild();vmCommit()}
function vmHint(t){const e=$('vmHint');if(e){e.textContent=t;e.hidden=!t}}
let vmDrag=null;
function vmDown(e){if(!VM.edit||e.button===2)return;const pt=vmPt(e),h=e.target.closest('[data-h]'),vo=e.target.closest('#vmL > .vo');
  if(VM.mode==='line'){const p=[vmSnap(pt[0]),vmSnap(pt[1])];const L=VM.draft.pts[VM.draft.pts.length-1];if(!L||Math.hypot(L[0]-p[0],L[1]-p[1])>2)VM.draft.pts.push(p);vmDrawSel();e.preventDefault();return}
  const o=vmSel();
  if(h&&o){const k=h.dataset.h;vmDrag={k,o,i:+h.dataset.i,start:pt,snap:JSON.stringify(VM.model),x0:o.x,y0:o.y,s0:o.s||1,r0:o.r||0,moved:false};
    if(k==='v'&&e.altKey&&o.pts.length>2){vmPush();o.pts.splice(+h.dataset.i,1);vmDrag=null;vmRerender(o);vmCommit()}e.preventDefault();return}
  if(vo){const id=vo.dataset.id;if(id!==VM.sel)vmSelect(id);const s=vmSel();vmDrag={k:'m',o:s,start:pt,snap:JSON.stringify(VM.model),x0:s.x,y0:s.y,pts0:s.pts?s.pts.map(p=>[...p]):null,moved:false};e.preventDefault();return}
  vmSelect(null)}
function vmMove(e){if(!VM.edit)return;const pt=vmPt(e);if(VM.mode==='line'&&VM.draft){let p=[vmSnap(pt[0]),vmSnap(pt[1])];const L=VM.draft.pts[VM.draft.pts.length-1];if(L&&e.shiftKey){if(Math.abs(p[0]-L[0])>Math.abs(p[1]-L[1]))p[1]=L[1];else p[0]=L[0]}VM.draft.hover=p;vmDrawSel();return}
  const d=vmDrag;if(!d)return;const dx=pt[0]-d.start[0],dy=pt[1]-d.start[1];if(!d.moved&&Math.hypot(dx,dy)<1.5)return;if(!d.moved){d.moved=true;VM.undo.push(d.snap);VM.redo=[]}const o=d.o;
  if(d.k==='m'){if(o.pts)o.pts=d.pts0.map(p=>[vmSnap(p[0]+dx),vmSnap(p[1]+dy)]);else{o.x=vmSnap(d.x0+dx);o.y=vmSnap(d.y0+dy)}}
  else if(d.k==='v'){let p=[vmSnap(pt[0]),vmSnap(pt[1])];if(e.shiftKey){const n=o.pts[d.i-1]||o.pts[d.i+1];if(n){if(Math.abs(p[0]-n[0])>Math.abs(p[1]-n[1]))p[1]=n[1];else p[0]=n[0]}}o.pts[d.i]=p}
  else if(d.k==='s'){const a=Math.hypot(d.start[0]-o.x,d.start[1]-o.y)||1,b=Math.hypot(pt[0]-o.x,pt[1]-o.y);o.s=Math.max(.2,Math.min(6,Math.round(d.s0*b/a*100)/100))}
  else if(d.k==='r'){const a0=Math.atan2(d.start[1]-o.y,d.start[0]-o.x),a1=Math.atan2(pt[1]-o.y,pt[0]-o.x);let r=d.r0+(a1-a0)*180/Math.PI;r=e.shiftKey?r:Math.round(r/15)*15;o.r=((Math.round(r)%360)+360)%360}
  vmRerender(o);vmPropsLive()}
function vmUp(){if(vmDrag){if(vmDrag.moved)vmCommit();vmDrag=null}}
function vmDbl(e){if(!VM.edit)return;if(VM.mode==='line'){if(VM.draft&&VM.draft.pts.length>2){const a=VM.draft.pts,b=a[a.length-1],c=a[a.length-2];if(Math.hypot(b[0]-c[0],b[1]-c[1])<6)a.pop()}vmFinishLine();return}
  const o=vmSel();if(o&&o.pts){const pt=vmPt(e);let best=-1,bd=9;for(let i=1;i<o.pts.length;i++){const [x0,y0]=o.pts[i-1],[x1,y1]=o.pts[i],L2=(x1-x0)**2+(y1-y0)**2||1,u=Math.max(0,Math.min(1,((pt[0]-x0)*(x1-x0)+(pt[1]-y0)*(y1-y0))/L2)),dd=Math.hypot(pt[0]-(x0+u*(x1-x0)),pt[1]-(y0+u*(y1-y0)));if(dd<bd){bd=dd;best=i}}
    if(best>0){vmPush();o.pts.splice(best,0,[vmSnap(pt[0]),vmSnap(pt[1])]);vmRerender(o);vmCommit()}}}
function vmKey(e){if(!VM.edit)return;const tg=e.target.tagName;if(tg==='INPUT'||tg==='SELECT'||tg==='TEXTAREA')return;const k=e.key,c=e.ctrlKey||e.metaKey;
  if(k==='Escape'){if(VM.draft){VM.draft=null;VM.mode=null;vmDrawSel();vmHint('')}else vmSelect(null);e.preventDefault()}
  else if(k==='Enter'&&VM.draft){vmFinishLine();e.preventDefault()}
  else if((k==='Delete'||k==='Backspace')&&VM.sel){vmDel();e.preventDefault()}
  else if(c&&(k==='z'||k==='Z')){e.shiftKey?vmRedo():vmUndo();e.preventDefault()}else if(c&&(k==='y'||k==='Y')){vmRedo();e.preventDefault()}
  else if(c&&(k==='d'||k==='D')){vmDup();e.preventDefault()}
  else if(k.startsWith('Arrow')&&VM.sel){const o=vmSel(),st=e.shiftKey?10:1,dx=k==='ArrowLeft'?-st:k==='ArrowRight'?st:0,dy=k==='ArrowUp'?-st:k==='ArrowDown'?st:0;vmPush();if(o.pts)o.pts=o.pts.map(p=>[p[0]+dx,p[1]+dy]);else{o.x+=dx;o.y+=dy}vmRerender(o);vmCommit();e.preventDefault()}}
// ---------- xususiyatlar paneli ----------
function vmField(o,f){const [k,lab,type,opts]=f,v=o.p[k]??'';const id='vmf_'+k;let inp;
  if(type==='sel'||type==='var'||type==='flow'){const list=type==='var'?MVARS:type==='flow'?FLOWS:opts;inp=`<select id="${id}" data-k="${k}">${list.map(x=>`<option value="${xa(x[0])}"${String(v)===String(x[0])?' selected':''}>${xa(x[1])}</option>`).join('')}</select>`}
  else if(type==='color')inp=`<input id="${id}" data-k="${k}" type="color" value="${/^#[0-9a-f]{6}$/i.test(v)?v:'#5aa8ff'}">`;
  else if(type==='num')inp=`<input id="${id}" data-k="${k}" type="number" step="any" value="${xa(v)}">`;else inp=`<input id="${id}" data-k="${k}" type="text" value="${xa(v)}">`;
  return `<label for="${id}">${xa(lab)}</label>${inp}`}
function vmProps(){const box=$('vmProps');if(!box)return;const o=vmSel();if(!o){box.innerHTML=`<p class="vmmut">Elementni tanlash uchun ustiga bosing. Yangi element qo‘shish uchun yuqoridagi ro‘yxatdan tanlang.</p>`;return}
  const D=T[o.t];let h=`<div class="vmph"><b>${xa(D.n)}</b></div><div class="vmgrid">`;
  if(!D.line)h+=`<label for="vmX">X</label><input id="vmX" type="number" step="any" value="${r2(o.x)}"><label for="vmY">Y</label><input id="vmY" type="number" step="any" value="${r2(o.y)}"><label for="vmR">Burchak, °</label><input id="vmR" type="number" step="any" value="${r2(o.r||0)}"><label for="vmS">Masshtab</label><input id="vmS" type="number" step=".05" min=".2" max="6" value="${r2(o.s||1)}">`;
  h+=D.props.map(f=>vmField(o,f)).join('')+`</div><div class="vmbtns">`;
  if(!D.line)h+=`<button type="button" class="sec" data-a="rl">⟲ 90°</button><button type="button" class="sec" data-a="rr">⟳ 90°</button><button type="button" class="sec" data-a="fh">⇋ Aks</button>`;else h+=`<button type="button" class="sec" data-a="rev">⇄ Yo‘nalishni teskari</button>`;
  h+=`<button type="button" class="sec" data-a="dup">Nusxa</button><button type="button" class="sec" data-a="up">Oldinga</button><button type="button" class="sec" data-a="dn">Orqaga</button><button type="button" class="del" data-a="del">O‘chirish</button></div>`;
  if(D.line)h+=`<p class="vmmut">Nuqtani surish — tutib torting; yangi nuqta — chiziq ustida ikki marta bosing; nuqtani o‘chirish — Alt + bosish.</p>`;box.innerHTML=h;
  const num=(id,f)=>{const e=$(id);if(e)e.onchange=()=>{const v=parseFloat(e.value);if(!isFinite(v))return;vmPush();f(v);vmRerender(o);vmCommit()}};
  num('vmX',v=>o.x=v);num('vmY',v=>o.y=v);num('vmR',v=>o.r=((v%360)+360)%360);num('vmS',v=>o.s=Math.max(.2,Math.min(6,v)));
  box.querySelectorAll('[data-k]').forEach(e=>e.onchange=()=>{const k=e.dataset.k,f=D.props.find(x=>x[0]===k);vmPush();o.p[k]=f&&f[2]==='num'?(parseFloat(e.value)||0):e.value;vmRerender(o);vmCommit()});
  box.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a;if(a==='del')return vmDel();if(a==='dup')return vmDup();if(a==='up')return vmZ(1);if(a==='dn')return vmZ(-1);vmPush();
    if(a==='rl')o.r=(((o.r||0)-90)%360+360)%360;if(a==='rr')o.r=((o.r||0)+90)%360;if(a==='fh')o.fx=!o.fx;if(a==='rev')o.pts.reverse();vmRerender(o);vmCommit()})}
function vmPropsLive(){const o=vmSel();if(!o||o.pts)return;const s=(id,v)=>{const e=$(id);if(e&&document.activeElement!==e)e.value=r2(v)};s('vmX',o.x);s('vmY',o.y);s('vmR',o.r||0);s('vmS',o.s||1)}
// ---------- fayllar ----------
function vmExport(){const b=new Blob([JSON.stringify({format:'quritgich-mnemo',v:2,model:VM.model},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='mnemosxema.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function vmImport(f){const r=new FileReader();r.onload=()=>{try{if(r.result.length>2e6)throw new Error('fayl juda katta');const j=JSON.parse(r.result),m=sanitizeMnemo(Array.isArray(j)?j:j&&j.model,Object.keys(T));if(!m)throw new Error('fayl formati noto‘g‘ri');vmPush();VM.model=m;VM.sel=null;vmBuild();vmCommit();vmHint('Sxema fayldan yuklandi.')}catch(e){vmHint('Yuklab bo‘lmadi: '+e.message)}};r.readAsText(f)}
function vmSetEdit(on){VM.edit=on;const h=$('mimic');h.classList.toggle('vmediting',on);$('vmEditB').textContent=on?'✓ Tahrirlashni tugatish':'✎ Sxemani tahrirlash';const g=$('vmGrid');if(g)g.style.display=on?'':'none';if(!on){VM.draft=null;VM.mode=null;VM.sel=null;vmHint('')}vmDrawSel();vmProps()}
const VM_CSS=`
.vmtool{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:0 2px 10px;font-size:12.5px;color:var(--mut)}
.vmtool button{padding:5px 12px;font-size:12.5px}.vmtool select{width:auto;padding:3px 6px;margin-left:4px}.vmtool label{display:inline-flex;align-items:center;gap:6px;margin:0;color:var(--ink);font-size:12.5px}
.vmwrap{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}
.vmediting .vmwrap{grid-template-columns:minmax(0,1fr) 270px}
.vmstage{position:relative;min-width:720px}
#mimic #vmSvg{display:block;width:100%;height:auto;border-radius:8px;min-width:0;touch-action:none;user-select:none;-webkit-user-select:none}
.vmediting #vmSvg{outline:2px dashed rgba(45,212,191,.5);outline-offset:2px}
.vmediting #vmL .vo{cursor:move}
#mimic #vmSvg{position:absolute;inset:0;width:100%;height:100%;min-width:0;pointer-events:none}
#mimic.vmediting #vmSvg{pointer-events:auto}
.vmediting .kstage{outline:2px dashed rgba(45,212,191,.55);outline-offset:3px;border-radius:8px}
.kstage{position:relative;min-width:900px}
.vmside{display:none;background:var(--pan);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12.5px;max-height:820px;overflow:auto}
.vmediting .vmside{display:block}
.vmside h3{font-size:13px;margin:4px 0 6px}
.vmpal{display:flex;flex-wrap:wrap;gap:4px}
#mimic .vmpal button{padding:3px 8px;font-size:12px;background:transparent;color:var(--ink);border:1px solid var(--line);border-radius:12px}
#mimic .vmpal button:hover{border-color:#2dd4bf;color:#2dd4bf}
.vmgrid{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 8px;align-items:center}
.vmgrid label{margin:0;font-size:12px}.vmgrid input,.vmgrid select{padding:3px 6px;font-size:12px;width:100%}.vmgrid input[type=color]{height:26px;padding:1px}
.vmbtns{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}.vmbtns button{padding:3px 8px;font-size:12px}
#mimic .vmbtns .del{background:#c62828;border-color:#c62828;color:#fff}
.vmph{margin-bottom:6px;color:#2dd4bf}.vmmut{color:var(--mut);margin:6px 0;font-size:12px;line-height:1.4}
.vmhint{margin:8px 2px 0;padding:6px 10px;border-radius:6px;background:rgba(255,211,77,.12);color:var(--ink);font-size:12.5px}
.vmsep{border:0;border-top:1px solid var(--line);margin:10px 0}
#mimic:fullscreen{background:#0a1018;padding:12px 16px;overflow:auto;color:#e9eff6}
#mimic:fullscreen .vmstage{width:min(100%,calc((100vh - 90px) * 1.597));margin:0 auto}
#v-overview #vmEditB,#v-overview .vmside{display:none!important}#v-overview .vmwrap{grid-template-columns:minmax(0,1fr)!important}
@keyframes spg{0%{transform:scale(1);opacity:0}8%{opacity:.7}60%{transform:scale(1.45);opacity:0}100%{opacity:0}}
#vmSvg .sping{animation:spg 3s ease-out infinite;opacity:0;transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:reduce){#vmSvg .sping{animation-duration:6s}}
`;

// ---------- quvurlar: asl rasmdagidek hajmli (silindrsimon) ko'rinish ----------
const PGR={metal:['#5c646c','#f2f5f7','#b9c0c6','#58606a'],hot:['#5c646c','#f2f5f7','#b9c0c6','#58606a'],gas:['#7d6418','#fff3a6','#e8c64e','#8f7020'],air:['#1b4a92','#a6d4ff','#3d86e8','#1a4488'],copper:['#5e4020','#f5dcaa','#c8995a','#5a3c1c'],water:['#125f82','#bff0ff','#2ea3d6','#0f5577'],dark:['#2a3036','#9aa2aa','#59616a','#22282e']};
const PIPE_DEFS=`<defs>${Object.entries(PGR).map(([k,c])=>`<linearGradient id="pg_${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".3" stop-color="${c[1]}"/><stop offset=".62" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[3]}"/></linearGradient><radialGradient id="pj_${k}" cx=".4" cy=".38" r=".62"><stop offset="0" stop-color="${c[1]}"/><stop offset=".55" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[3]}"/></radialGradient>`).join('')}</defs>`;
T.pipe.render=function(o){const p=o.p,w=+p.w||8,k=PGR[p.kind]?p.kind:'metal',P=ptsStr(o.pts),m=PMAT[p.mat],pts=o.pts;
  let s=`<polyline points="${P}" fill="none" stroke="#04070a" stroke-opacity=".5" stroke-width="${w+2.5}" stroke-linejoin="round" stroke-linecap="round" transform="translate(1.2 1.8)" filter="url(#fSoft1)"/>`;
  for(let i=1;i<pts.length;i++){let [x0,y0]=pts[i-1],[x1,y1]=pts[i];let a=Math.atan2(y1-y0,x1-x0)*180/Math.PI;if(a>=90||a<-90){[x0,y0,x1,y1]=[x1,y1,x0,y0];a=Math.atan2(y1-y0,x1-x0)*180/Math.PI}const L=Math.hypot(x1-x0,y1-y0);if(L<.01)continue;
    s+=`<rect x="0" y="${-w/2}" width="${r2(L)}" height="${w}" fill="url(#pg_${k})" transform="translate(${r2(x0)} ${r2(y0)}) rotate(${r2(a)})"/>`}
  pts.forEach((q,i)=>{const end=i===0||i===pts.length-1;s+=`<circle cx="${r2(q[0])}" cy="${r2(q[1])}" r="${w/2}" fill="url(#pj_${k})"${end?' opacity=".95"':''}/>`});
  if(p.kind==='hot')s+=`<polyline class="hg" points="${P}" fill="none" stroke="#ff7a1a" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="0"/>`;
  if(m&&m.band)s+=`<polyline class="bd" points="${P}" fill="none" stroke="${m.band}" stroke-width="${Math.max(2,w*.5)}" stroke-linecap="round" stroke-dasharray="${w*1.2} ${w*4}" opacity="0" filter="url(#fSoft1)"/>`;
  if(m){const L=pGeo(pts).L,n=Math.max(2,Math.min(80,Math.round(L/m.gap)));s+=`<g class="pp">${Array.from({length:n},()=>`<circle r="${r2(Math.min(m.r*(w>9?1.15:1),w*.42))}" fill="url(#${m.g})"/>`).join('')}</g>`}
  return s+`<polyline class="hit" points="${P}" fill="none" stroke="transparent" stroke-width="${Math.max(12,w+6)}"/>`};
T.flange={n:'Flanes (quvur ulanishi)',L:1.5,props:[['w','Eni','num'],['h','Bo‘yi','num']],box:o=>[-(o.p.w||5)/2,-(o.p.h||16)/2,o.p.w||5,o.p.h||16],
  render(o){const w=o.p.w||5,h=o.p.h||16;return `<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="1" fill="url(#gMV)" stroke="#4b535b" stroke-width=".6"/><line x1="0" y1="${-h/2+1.5}" x2="0" y2="${h/2-1.5}" stroke="#3b434b" stroke-width=".6"/>`}};
// datchik: asl rasmdagi shisha pufakchaga yaqin
T.sensor.render=function(o){const p=o.p,t=String(p.tag||'XX'),rim=p.rim||'#39b54a';return `<circle class="sping" r="15.5" fill="none" stroke="#7fd6ff" stroke-width="1.2"/><circle r="18.2" fill="none" stroke="${rim}" stroke-width="3" opacity=".35" filter="url(#fGlow)"/><circle r="16.6" fill="url(#gBub)" stroke="${rim}" stroke-width="2.6"/><circle r="14.4" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width=".8"/><ellipse cx="-4" cy="-8" rx="8" ry="4" fill="#fff" opacity=".45"/>`+TX(0,3.8,xa(t),{fs:t.length>4?9:10.5,a:'middle',c:'#1b2433'})+`<g class="ring" opacity="0"><circle r="20.5" fill="none" stroke-width="3"/><circle r="24.5" fill="none" stroke-width="1.2" opacity=".6"/></g>`};

function vmBoxOf(o){const D=T[o.t];if(D.box){const [bx,by,bw,bh]=D.box(o),s=o.s||1,fx=o.fx?-1:1,a=(o.r||0)*Math.PI/180,c=Math.cos(a),n=Math.sin(a);const P=[[bx,by],[bx+bw,by],[bx,by+bh],[bx+bw,by+bh]].map(([x,y])=>{x*=s*fx;y*=s;return [o.x+x*c-y*n,o.y+x*n+y*c]});
  const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}}
  const g=document.querySelector(`#vmL > .vo[data-id="${o.id}"]`);return g?g.getBBox():null}

// ================== KONDENSAT MNEMOSXEMASI: TAHRIRLASH QATLAMI ==================
function kV(v,c){if(!v||!c)return NaN;const r=c.run,k=c.k;if(v==='NP'){return (r.tanks[0].NP[k]||0)+(r.tanks[1]?r.tanks[1].NP[k]||0:0)}if(v==='Q')return r.QP?r.QP[k]:r.tanks[0].QIN[k];
  if(v==='R'){const i=ct();return cur.idxs[i].R[k]}const [t,f]=v.split('.'),o=r.tanks[t==='A'?0:1];if(!o||!o[f])return NaN;return +o[f][k]}
function vmVal(v,c){return kV(v,c)}
function vmAlarm(v,c){const x=kV(v,c);if(!v||!isFinite(x))return v&&c&&v.includes('.')?'':'';const f=v.split('.')[1]||v;
  if(f==='Ld'||f==='S1'||f==='S2')return x>=P.LAHH||x<=P.LALL?'trip':(x>=P.LAH||x<=P.LAL)?'warn':'';if(f==='P')return x<=P.PALL?'trip':x<=P.PAL?'warn':'';if(v==='R')return x>=P.RTH?'warn':'';return ''}
T.kvalve={n:'Klapan',L:3,props:[['label','Belgisi (masalan HS-110)','text'],['flow','Holat (ochiq/yopiq)','flow']],box:()=>[-22,-34,44,48],
  render(o){return `<g class="on">${valveBody(0,0,true,18)}</g><g class="off">${valveBody(0,0,false,18)}</g>`+lab(0,-38,xa(o.p.label||''))},
  rt(o,g){const on=g.querySelector('.on'),off=g.querySelector('.off');return {step(dt,t,C){const v=(C[o.p.flow||'on']||0)>.5;on.setAttribute('display',v?'':'none');off.setAttribute('display',v?'none':'')}}}};
T.kpump={n:'Nasos',L:3,props:[['label','Nomi (masalan P-2)','text'],['xl','Teg (masalan XL-113)','text'],['flow','Holat (ishlaydi/to‘xtagan)','flow']],box:()=>[-24,-42,80,100],
  render(o){return `<g class="on">${pump2(0,0,true,xa(o.p.label||''),xa(o.p.xl||''),false)}</g><g class="off">${pump2(0,0,false,xa(o.p.label||''),xa(o.p.xl||''),false)}</g>`},
  rt(o,g){const on=g.querySelector('.on'),off=g.querySelector('.off');return {step(dt,t,C){const v=(C[o.p.flow||'on']||0)>.5;on.setAttribute('display',v?'':'none');off.setAttribute('display',v?'none':'')}}}};
T.ktank={n:'Rezervuar',L:2,props:[['name','Nomi (masalan T-1C)','text'],['lv','Sath o‘lchovi','var']],box:()=>[-140,-125,284,252],
  render(o){return `<g class="tk"></g>`},
  rt(o,g){const e=g.querySelector('.tk');let last=null;const draw=L=>{e.innerHTML=`<g transform="translate(-136 -355)">${tank2(0,272,xa(o.p.name||'T-1C'),L,false,'',!isFinite(L))}</g>`};draw(50);
    return {dyn(c){const v=kV(o.p.lv,c),L=isFinite(v)?Math.round(v*2)/2:(o.p.lv?NaN:50);if(L!==last){last=L;draw(L)}}}}};
function vmBuild(){const svg=$('vmSvg');if(!svg)return;const order=VM.model.map((o,i)=>[o,i]).sort((a,b)=>vmLayer(a[0])-vmLayer(b[0])||a[1]-b[1]);
  svg.innerHTML=VM_DEFS+PIPE_DEFS+`<rect id="vmGrid" x="40" y="22" width="1530" height="1245" fill="url(#pGrid)" style="display:${VM.edit?'':'none'}"/><g id="vmL">${order.map(([o])=>`<g class="vo" data-id="${o.id}">${vmObjHtml(o)}</g>`).join('')}</g><g id="vmSelL"></g>`;
  VM.rt=[];svg.querySelectorAll('#vmL > .vo').forEach(g=>{const o=VM.model.find(m=>m.id===g.dataset.id);const r=vmRtFor(o,g);if(r)VM.rt.push(r)});
  if(VM.ctx)VM.rt.forEach(r=>r.dyn&&r.dyn(VM.ctx));vmDrawSel()}
function vmDefault(){return []}
function vmReset(){if(!VM.model.length)return;if(!confirm('Qo‘shilgan barcha elementlarni o‘chirib, asl mnemosxemaga qaytasizmi? (Ctrl+Z bilan qaytarish mumkin)'))return;vmPush();VM.model=[];VM.sel=null;vmBuild();vmCommit()}
function vmAdd(t){if(!VM.edit)return;const D=T[t];if(D.line){VM.mode='line';VM.draft={t,pts:[],hover:null};vmSelect(null);vmHint(`${D.n}: sxemada nuqtalarni ketma-ket bosing. Tugatish — ikki marta bosish yoki Enter, bekor qilish — Esc.`);return}
  vmPush();const o={id:vmId(),t,x:800,y:620,r:0,s:1,p:JSON.parse(JSON.stringify(VM_NEW[t]||{}))};VM.model.push(o);vmBuild();vmSelect(o.id);vmCommit();vmHint('Yangi element markazga qo‘shildi — sichqoncha bilan kerakli joyga suring.')}
function vmUpdate(c){VM.ctx=c;Object.assign(VA.st,KA.st,{on:1,off:0});for(const r of VM.rt)if(r.dyn){try{r.dyn(c)}catch(e){}}}
function vmFrame(now){const svg=$('vmSvg');if(!svg||!svg.getClientRects().length||document.hidden){animIdle(vmFrame,VA);return}VA.raf=requestAnimationFrame(vmFrame);if(ANIM_COARSE&&now-VA.last<30)return;let dt=(now-VA.last)/1000*ANIM_SLOW;VA.last=now;if(dt>.1)dt=.1;if(dt<=0)return;VA.t+=dt;
  const S=VA.st,C=VA.cur;for(const k in S){C[k]=(C[k]||0)+(S[k]-(C[k]||0))*Math.min(1,dt/.6)}C.on=1;C.off=0;for(const r of VM.rt)if(r.step){try{r.step(dt,VA.t,C,S)}catch(e){}}}
const VM_ADD=[['kvalve','Klapan'],['kpump','Nasos'],['ktank','Rezervuar'],['sensor','Datchik'],['value','Qiymat oynasi'],['label','Yozuv'],['pipe','Quvur'],['wire','Signal simi'],['flange','Flanes'],['motor','Dvigatel']];
const VM_NEW={kvalve:{label:'HS-110',flow:'on'},kpump:{label:'P-2',xl:'XL-113',flow:'on'},ktank:{name:'T-1C',lv:''},sensor:{tag:'LI-301',rim:'#3b82e6',var:'',alarm:''},value:{var:'A.Ld',unit:'%',dec:1,w:94,h:24,fs:17},label:{text:'Yangi yozuv',fs:15,c:'#e9eff6',a:'start'},
  pipe:{kind:'metal',w:7,mat:'water',flow:'on'},wire:{c:'#3d86e8',w:1.6,dash:'1',pulse:'1'},flange:{w:5,h:16},motor:{flow:'on'}};
function vmAttachK(host){let m=[];try{const s=localStorage.getItem(VM_KEY);if(s){const j=JSON.parse(s);m=sanitizeMnemo(j,Object.keys(T))||[]}}catch(e){}VM.model=m;
  const side=host.querySelector('.vmside');side.innerHTML=`<h3>Element qo‘shish</h3><div class="vmpal">${VM_ADD.map(a=>`<button type="button" data-add="${a[0]}">${xa(a[1])}</button>`).join('')}</div><hr class="vmsep">
    <h3>Xususiyatlar</h3><div id="vmProps"></div><hr class="vmsep"><h3>Sxema</h3>
    <div class="vmbtns"><button type="button" class="sec" id="vmUndo">↶ Qaytarish</button><button type="button" class="sec" id="vmRedo">↷ Takrorlash</button></div>
    <label style="display:flex;gap:6px;align-items:center;margin:8px 0 0;color:var(--ink)"><input type="checkbox" id="vmSnapC" checked style="width:auto"> To‘rga yopishish (5 px)</label>
    <div class="vmbtns"><button type="button" class="sec" id="vmExp">Faylga saqlash</button><button type="button" class="sec" id="vmImpB">Fayldan yuklash</button><input type="file" id="vmImp" accept=".json,application/json" hidden><button type="button" class="sec" id="vmRst">Qo‘shimchalarni tozalash</button></div>
    <p class="vmmut">Asl chizma o‘zgarmaydi — qo‘shgan elementlaringiz uning ustida turadi. O‘zgarishlar avtomatik saqlanadi. Delete — o‘chirish, Ctrl+Z / Ctrl+Y, Ctrl+D — nusxa, strelkalar — surish.</p>`;
  const svg=$('vmSvg');svg.addEventListener('pointerdown',e=>{vmDown(e);if(vmDrag)try{svg.setPointerCapture(e.pointerId)}catch(_){}});svg.addEventListener('pointermove',vmMove);svg.addEventListener('pointerup',vmUp);svg.addEventListener('pointercancel',vmUp);svg.addEventListener('dblclick',vmDbl);
  svg.addEventListener('contextmenu',e=>{if(VM.edit)e.preventDefault()});document.addEventListener('keydown',vmKey);
  side.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>vmAdd(b.dataset.add));
  $('vmEditB').onclick=()=>vmSetEdit(!VM.edit);$('vmUndo').onclick=vmUndo;$('vmRedo').onclick=vmRedo;$('vmSnapC').onchange=e=>{VM.grid=e.target.checked?5:0};
  $('vmExp').onclick=vmExport;$('vmImpB').onclick=()=>$('vmImp').click();$('vmImp').onchange=e=>{if(e.target.files[0])vmImport(e.target.files[0]);e.target.value=''};$('vmRst').onclick=vmReset;
  $('vmFull').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else if(host.requestFullscreen)host.requestFullscreen()};
  VM.built=true;vmBuild();vmProps();if(!VA.raf){VA.last=performance.now();VA.raf=requestAnimationFrame(vmFrame)}}

function mimic(){
  const tg=TG(),run=cur.run,k=timeK(),a=cur.e.a,sel=ct();
  const anyTrip=a.trip>=0&&k>=a.trip&&a.tripType!=='PVAC';
  const T0=run.tanks[0],T1=run.tanks[1]||null;
  const np=(T0.NP[k]||0)+(T1?T1.NP[k]||0:0),q=run.QP?run.QP[k]:T0.QIN[k];
  const pTrip=a.per.some(p=>p.trip>=0&&k>=p.trip&&p.type==='LALL');
  const zl=run.load!==undefined?run.load:0;
  kSprDefs();let s=`<svg viewBox="40 22 1530 1245" role="img" aria-label="Ombor mnemosxemasi" font-family="Segoe UI,Arial,sans-serif" style="${isLight()?'--ink:#16232e;--pan:#ffffff;--mut:#5b6b78;--line:#c5d0da;--scr:#eef2f5;--win:#f4f9fd':'--ink:#e9eff6;--pan:#0c1822;--mut:#8ea0b4;--line:#2d4256;--scr:#0e1721;--win:#0e2438'};border-radius:8px">`+rdefT()+`<rect x="40" y="22" width="1530" height="1245" fill="url(#rBg)"/><rect x="40" y="22" width="1530" height="1245" fill="url(#rGrid)"/>`;
  s+=lab(48,42,tg.title,{a:'start',fs:17})+lab(1560,42,tg.disp,{a:'end',fs:17});
  // qayta tiklash (reset)
  s+=lab(1175,62,tg.RSTL,{fs:14})+lab(1175,82,tg.RST,{fs:14})+box(1120,90,110,anyTrip?'TRIP':tg.NORM,anyTrip?'trip':'',22);
  // quvurlar
  s+=rPipe('M220 352V57H880V352H1030')+rPipe('M220 352H380')+rPipe('M262 866V352')+rPipe('M158 793H262')+rPipe('M162 863H262')+rPipe('M660 427H820V865H960')+rPipe('M820 765H960')+rPipe('M1310 427H1465V540H820')+rPipe('M672 287H850V645H1485V287H1322')+rPipe('M1170 668V752')+rPipe('M1068 752V717H1158')+rPipe('M994 752H1520')+rPipe('M994 853H1250V764')+rPipe('M1168 853V764');
  s+=arrowR(386,352)+arrowR(1036,352)+arrowL(662,287)+arrowL(1312,287)+arrowR(1160,717)+arrowR(1530,752)+arrowU(1168,762)+arrowU(1250,762);
  // manbalar
  s+=lab(65,762,tg.src1a,{a:'start',fs:14})+lab(65,778,tg.src1b,{a:'start',fs:14});
  s+=`<path d="M68 786H146L156 793L146 800H68Z" fill="#d4a017" stroke="#9a7410"/>`+lab(110,798,tg.src1t,{fs:12,c:'#fff',b:1});
  s+=lab(70,835,tg.src2a,{a:'start',fs:14})+lab(70,851,tg.src2b,{a:'start',fs:14});
  s+=`<path d="M74 856H152L162 863L152 870H74Z" fill="#5f6b73" stroke="#3d464c"/>`+lab(116,868,tg.src2t,{fs:12,c:'#fff',b:1});
  // ishlab chiqarish
  s+=lab(54,562,tg.fqi1,{a:'start',fs:14})+lab(54,578,tg.fqi2,{a:'start',fs:14})+lab(58,600,tg.FQI,{a:'start',fs:14})+box(58,610,130,nb(q,0),isFinite(q)?'':'nan',22)+lab(192,626,tg.fqiU,{a:'start',fs:13});
  s+=lab(1530,727,tg.dest1,{a:'end',fs:14})+lab(1530,743,tg.dest2,{a:'end',fs:14});
  // rezervuarlar
  const X=[[388,660],[1040,1310]];
  for(let i=0;i<2;i++){const o=run.tanks[i],[x0,x1]=X[i],off=x0-388;
    if(!o){s+=tank2(x0,x1,tg.tk[i],NaN,false,'',true)+lab((x0+x1)/2,330,'ma’lumot yo‘q',{c:'var(--mut)'});
      s+=valve2(i?956:306,352,false,tg.XVin[i],false)+valve2(i?1388:742,427,false,tg.XVout[i],false);continue}
    const id=cur.idxs[i],tr=a.per[i],tk=tr.trip>=0&&k>=tr.trip;
    const alert=tk?'var(--trip)':id.R[k]>=P.RTH?'var(--warn)':(id.d3[k]||id.d4[k])?'var(--diag)':'';
    s+=tank2(x0,x1,tg.tk[i],o.Ld[k],i===sel&&nT()>1,alert,!isFinite(o.Ld[k]));
    // LI, PI, TI
    s+=`<path d="M${x0+10} 240V226H${x0+36}V240M${x0+23} 226V218" fill="none" stroke="var(--ink)" stroke-width="1.6"/>`;
    s+=lab(x0+72,184,tg.LI[i])+box(x0+8,194,94,nb(o.Ld[k],2),isFinite(o.Ld[k])?'':'nan');
    s+=lab(x0+224,184,tg.PI[i])+box(x0+160,194,94,nb(o.P[k],1),isFinite(o.P[k])?(o.P[k]<=P.PAL?'warn':''):'nan');
    s+=`<line x1="${x0+60}" y1="218" x2="${x0+60}" y2="236" stroke="var(--ink)" stroke-width="1.4"/><line x1="${x0+207}" y1="218" x2="${x0+207}" y2="238" stroke="var(--ink)" stroke-width="1.4"/>`;
    s+=`<line x1="${x1}" y1="347" x2="${x1+22}" y2="347" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="5 4"/>`+lab(x1+88,324,tg.TI[i])+box(x1+22,335,96,nb(o.T[k],0),isFinite(o.T[k])?'':'nan');
    const s1=o.S1[k],s2=o.S2[k],pk=o.P[k];
    const st={hh1:isNaN(s1)||s1>=P.LAHH,hh2:isNaN(s2)||s2>=P.LAHH,ll1:isNaN(s1)||s1<=P.LALL,ll2:isNaN(s2)||s2<=P.LALL,pl:o.pOK&&isFinite(pk)&&pk<=P.PALL};
    if(!o.sisOK){st.hh1=st.hh2=st.ll1=st.ll2=false}
    s+=sis2(x0+62,272,st,tg,i);
    s+=valve2(i?956:306,352,o.VIN[k]>0,tg.XVin[i],tk&&o.VIN[k]===0&&tr.type==='LAHH');
    s+=valve2(i?1388:742,427,o.VOUT[k]>0,tg.XVout[i],false);
  }
  s+=valve3(1170,648,zl,tg.ZI);
  s+=pump2(977,765,np>=1,tg.P1,tg.XL1,pTrip)+pump2(977,865,np>=2,tg.P2,tg.XL2,pTrip&&false);
  s+=autoLayer();
  const host=$('mimic');if(!$('kBase')){host.innerHTML=`<style>${VM_CSS}</style><div class="vmtool"><span style="flex:1"></span><button type="button" id="vmEditB">✎ Sxemani tahrirlash</button><button type="button" class="sec" id="vmFull">⛶ To‘liq ekran</button></div>
    <div class="vmwrap"><div class="kstage"><div id="kBase"></div><svg id="kAnim" viewBox="40 22 1530 1245" style="position:absolute;inset:0;width:100%;height:100%;min-width:0;pointer-events:none" aria-hidden="true"></svg><svg id="vmSvg" viewBox="40 22 1530 1245" aria-label="Qo‘shilgan elementlar"></svg></div><aside class="vmside" aria-label="Sxema muharriri"></aside></div><div class="vmhint" id="vmHint" hidden></div>`;KA.ok=false;vmAttachK(host)}
  $('kBase').innerHTML=s+'</svg>';if(!KA.ok)kBuild();kAnimUpdate(run,k,anyTrip,pTrip,q,zl);vmUpdate({run,k});
}

// ---------- AI xabarlari ----------
function aiMsgs(k){
  const tg=TG(),run=cur.run,out=[];
  run.tanks.forEach((o,i)=>{const id=cur.idxs[i],tr=cur.e.a.per[i],nm=tg.tk[i];
    if(tr.trip>=0&&k>=tr.trip){out.push(['t',`${nm}: ${tr.type==='PVAC'?'bosim vakuumga tushdi, '+tg.PVSV[i]+' havo so‘rmoqda':'SIS '+tr.type+' himoyasi ishladi'} (${fmt(tr.trip*P.dt,0)}-daqiqa). Rezervuar himoyalangan holatda; sababni aniqlamasdan qayta ishga tushirmang.`]);return}
    if(id.bad[k]){out.push(['t',`${nm}: DCS/SIS signallari yo‘q (NaN). KIP xizmatini chaqiring, haqiqiy sathni mahalliy o‘lchagich bilan tekshiring.`]);return}
    const R=id.R[k],tt=id.ttt[k],j=id.sif[k],L=voteLow(o.S1[k],o.S2[k],P.vote);
    if(R>=P.RTH){const act=j===0?`quyishni to‘xtating (${tg.P1}${o.NP[k]>1?' va '+tg.P2:''}), kerak bo‘lsa boshqa rezervuarga o‘ting`:j===1?`kirishni (${tg.XVin[i]}) boshqa rezervuarga o‘tkazing yoki quyishni boshlang`:`${tg.PCV[i]} va gaz ta’minotini tekshiring, quyishni to‘xtating (vakuumda ${tg.PVSV[i]} havo so‘radi)`;
      out.push(['w',`${nm}: xavf yuqori (R = ${fmt(R,2)}). ${SIFK[j]} ga ${isFinite(tt)?'~'+fmt(tt,0)+' min':'yaqin'} qoldi${j<2&&isFinite(L)?`, sath ${fmt(L,1)} %`:''}. Tavsiya: ${act}.`])}
    if(id.d4[k]){const sm=(o.S1[k]+o.S2[k])/2;out.push(['d',`${nm}: DCS (${tg.LI[i]}) va SIS sath o‘lchovlari ${nb(Math.abs(o.Ld[k]-sm),1)} % farq qilmoqda. DCS ko‘rsatkichiga ishonmang, KIP tekshirsin.`])}
    if(id.d3[k]){const m=id.mb[k];out.push(['d',m===1?(id.zL[k]>5?`${nm}: sath kirish oqimidan tezroq o‘smoqda — hisobga olinmagan oqim kelmoqda (${tg.ZI} holatini tekshiring).`:`${nm}: massa balansi buzildi — sath ${fmt(id.slope[k],2)} %/min o‘zgarmoqda, kirish/nasos oqimlari buni tushuntirmaydi (sizish ehtimoli).`):m===2?`${nm}: bosim kutilmaganda pasaymoqda (${fmt(id.dP[k],2)} kPa/min) — ${tg.PCV[i]} va gaz ta’minotini tekshiring.`:`${nm}: jarayon rejimi odatdagidan farq qilmoqda (AI anomaliya bali ${fmt(id.x[2][k],2)}).`])}
  });
  if(!out.length)out.push(['ok','Hozircha xavf belgisi yo‘q.']);
  return out;
}
function kvPanel(){
  const run=cur.run,i=ct(),o=run.tanks[i],id=cur.idxs[i],tr=cur.e.a.per[i],k=timeK(),tg=TG();
  const tk=tr.trip>=0&&k>=tr.trip,warn=id.R[k]>=P.RTH,dg=id.d3[k]||id.d4[k];
  const st=tk?['SIS trip · '+tr.type,'var(--trip)']:warn?['Ogohlantirish','var(--warn)']:dg?['Diagnostika','var(--diag)']:['Xavfsiz','var(--ok)'];
  const tt=id.ttt[k];
  $('kv').innerHTML=`<span>Rezervuar</span><span>${tg.tk[i]}</span><span>Holat</span><span><i class="badge" style="background:${st[1]}">${st[0]}</i></span><span>Vaqt</span><span>${fmt(k*P.dt,1)} min</span>`+
  `<span>Sath: DCS / SIS</span><span>${nb(o.Ld[k],1)} / ${nb(o.S1[k],1)} · ${nb(o.S2[k],1)} %</span><span>Bosim</span><span>${nb(o.P[k],1)} kPag</span><span>Nasoslar (shu rezervuardan)</span><span>${fmt(o.NP[k]||0,0)} ta</span>`+
  `<span>Indeks R</span><span>${fmt(id.R[k],2)}</span><span>Eng yaqin himoya</span><span>${SIFL[id.sif[k]]}</span><span>Trip’gacha (joriy tezlikda)</span><span>${isFinite(tt)?'~'+fmt(tt,0)+' min':'—'}</span>`;
  $('msgs').innerHTML=aiMsgs(k).map(([c,t])=>`<li class="${c}">${esc(t)}</li>`).join('');
}
function bars(){
  const i=ct(),id=cur.idxs[i],a=cur.e.a.per[i];const T=id.R.length;
  const k=hover>=0?hover:(a.warn>=0&&prog>=T-1?a.warn:Math.min(prog,T-1));
  const c=[0,1,2,3].map(j=>P.w[j]*id.x[j][k]);
  $('bars').innerHTML=c.map((v,j)=>`<div class="bar"><span>${XN[j]}</span><div class="track"><div class="fill" style="width:${Math.min(100,v/Math.max(P.RTH,0.01)*100)}%"></div></div><span style="text-align:right;font-variant-numeric:tabular-nums">${fmt(v,2)}</span></div>`).join('');
  const R=id.R[k],mx=c.indexOf(Math.max(...c));
  $('whyT').textContent='Indeks tarkibi ('+TG().tk[i]+'), t = '+fmt(k*P.dt,1)+' min';
  $('why').textContent='R = '+fmt(R,2)+(R>=P.RTH?' — chegaradan yuqori. ':' — chegaradan past. ')+(R>0.05?'Eng katta hissa: '+XN[mx].replace(/ \(x.\)/,'').toLowerCase()+'. Himoya funksiyasi: '+SIFL[id.sif[k]]+'.':'Tashkil etuvchilar hissasi juda kichik.');
}
function render(){
  if(!cur)return;
  const i=ct(),o=cur.run.tanks[i],id=cur.idxs[i],a=cur.e.a,pa=a.per[i];
  $('capL').textContent='Sath, % ('+TG().tk[i]+')';
  if($('v-trends').classList.contains('on')){
  const vl=[{k:pa.trip,c:css('--trip'),wd:1.5},{k:cur.run.fT===i?cur.run.ft:-1,c:css('--gray'),dash:[2,3]}];
  draw($('c1'),{ys:[{y:o.Ld,c:css('--ink'),wd:1.8},{y:o.S1,c:css('--idx'),wd:1,a:.8},{y:o.S2,c:css('--idx'),wd:1,a:.8}],min:0,max:100,dec:0,
    lines:[{v:P.LAL,c:css('--gray'),t:'Low alarm'},{v:P.LAH,c:css('--gray'),t:'High alarm'},{v:P.LALL,c:css('--trip'),t:'LALL',dash:[8,3],r:1},{v:P.LAHH,c:css('--trip'),t:'LAHH',dash:[8,3],r:1}],vl,pts:[{k:pa.alarm,c:css('--gray')}]});
  let pmin=Infinity,pmax=-Infinity;for(const v of o.P)if(isFinite(v)){pmin=Math.min(pmin,v);pmax=Math.max(pmax,v)}
  if(!isFinite(pmin)){pmin=P.PV;pmax=P.P0}
  pmin=Math.floor(Math.min(pmin,P.PV-3)/5)*5;pmax=Math.max(pmax,P.P0+3);pmax=pmin+Math.ceil((pmax-pmin)/20)*20;
  draw($('c3'),{ys:[{y:o.P,c:css('--ink'),wd:1.5}],min:pmin,max:pmax,dec:0,lines:[{v:P.PAL,c:css('--gray'),t:'PAL'},{v:P.PALL,c:css('--warn'),t:'PALL'},{v:P.PV,c:css('--trip'),t:'PVSV vakuum '+fmt(P.PV,1),dash:[8,3],r:1}],vl,pts:[]});
  const cutR=(R,tr)=>{if(tr<0)return R;const c=Float64Array.from(R);for(let j=tr+1;j<c.length;j++)c[j]=NaN;return c};
  const ys=[{y:cutR(id.R,pa.trip),c:css('--warn'),wd:1.8}];if(nT()>1)ys.push({y:cutR(cur.idxs[1-i].R,a.per[1-i].trip),c:css('--mut'),wd:1,a:.8,dash:[4,3]});
  geo=draw($('c2'),{ys,min:0,max:1,dec:1,lines:[{v:P.RTH,c:css('--warn'),t:'Chegara R = '+fmt(P.RTH,2)}],vl:vl.concat([{k:pa.diag,c:css('--diag'),dash:[4,2],wd:1.5}]),pts:[{k:pa.warn,c:css('--warn')}]});
  }
  mimic();kvPanel();bars();
}
const leadTxt=x=>x===null?null:fmt(x,1)+' min';
function stats(){const e=cur.e,a=e.a;
  if(a.trip<0){const s=f=>f?'signal berdi':'signal yo‘q';$('sIdx').textContent=s(a.warn>=0);$('sAl').textContent=s(a.alarm>=0);$('sDg').textContent=s(a.diag>=0);$('sCb').textContent='SIS trip yo‘q';return}
  $('sIdx').textContent=leadTxt(e.L.warn)||'ishlamadi';$('sAl').textContent=leadTxt(e.L.alarm)||'ishlamadi';$('sDg').textContent=leadTxt(e.L.diag)||'—';$('sCb').textContent=leadTxt(e.L.comb)||'ishlamadi'}
function load(run){const idxs=run.tanks.map(o=>computeIndex2(o,model,P));const e=analyseRun(run,idxs,P);const dg=diagnose(run,idxs,P,e);cur={run,idxs,e,dg};stats();render();$('review').innerHTML=reviewHtml()}
// ---------- Voqealar jurnali ----------
function sifTag(i,type){const tg=TG(),sp=tg.sep;return type==='PVAC'?`${tg.PVSV[i]} (vakuum)`:`${type}${sp}${tg.S1[i]}/${tg.S2[i]}`}
function buildEvents(){
  const tg=TG(),run=cur.run,dt=P.dt,T=run.tanks[0].Ld.length,E=[];
  for(const v of run.ev||[]){const nm=v.tank!==undefined?tg.tk[v.tank]:'';let src='',txt='';
    if(v.code==='start'){src='Holat';txt=`${tg.tk[v.recv]} — mahsulot qabul qilmoqda (${tg.XVin[v.recv]} ochiq); ${tg.tk[v.load]} — ${v.loading?'vagon quyishga tayyor':'kutish rejimida'} (${tg.XVout[v.load]} ochiq).`}
    else if(v.code==='pstart'){src='Operator';txt=`${tg.P1}${v.np>1?' va '+tg.P2:''} ishga tushirildi — ${nm} rezervuaridan vagon quyish boshlandi.`}
    else if(v.code==='pstop'){src='Operator';txt=`Quyish to‘xtatildi (DCS sath ${nb(v.v,1)} %).`}
    else if(v.code==='trip'){if(v.type==='PVAC'){src='Mexanik himoya';txt=`${nm}: bosim ${fmt(P.PV,1)} kPag ga tushdi, ${tg.PVSV[v.tank]} vakuum tomonida ochildi — rezervuarga havo so‘rilmoqda.`}else{src='SIS';const act=v.type==='LAHH'?`${tg.XVin[v.tank]} yopildi`:(v.act.includes('pump')?`${tg.P1}${v.np>1?' va '+tg.P2:''} to‘xtatildi`:'nasos ishlamayotgan edi, qo‘shimcha harakat talab qilinmadi');txt=`${nm}: ${sifTag(v.tank,v.type)} (${P.vote==='1oo2'?'OR, 1oo2':'2oo2'}) ishladi → ${act}.`}}
    else{src='Haqiqiy sabab*';txt={surge:`Yuqori oqimdan keskin oqim keldi (me’yordan ×${fmt(v.f||0,1)}).`,leak:`${nm}: sizish boshlandi (~${fmt(v.q||0,0)} m³/soat).`,press:`${nm}: gaz yostig‘i ta’minoti (${tg.PCV[v.tank]}) ishdan chiqdi.`,recirc:`${tg.ZI} ichki nosozligi: ko‘rsatkich ${tg.tk[1-v.tank]} ni ko‘rsatmoqda, minimal oqim esa ${nm} ga ketmoqda.`,nan:`${nm}: datchiklar signali yo‘qoldi (umumiy sabab).`,freeze:`${nm}: ${tg.LI[v.tank]} ${nb(v.v,1)} % da qotib qoldi.`,overrun:`${nm}: sath rejadagi to‘xtatish darajasiga (${nb(v.v,1)} %) yetdi, quyish davom etdi.`}[v.code]||v.code}
    E.push({k:v.k,src,txt})}
  run.tanks.forEach((o,i)=>{const id=cur.idxs[i],nm=tg.tk[i];
    const add=(k,src,txt)=>{if(k>=0)E.push({k,src,txt})};
    add(firstRun(k=>o.Ld[k]<=P.LAL,3,T,0),'DCS alarm',`${tg.LI[i]} Low alarm (≤ ${fmt(P.LAL,0)} %).`);
    add(firstRun(k=>o.Ld[k]>=P.LAH,3,T,0),'DCS alarm',`${tg.LI[i]} High alarm (≥ ${fmt(P.LAH,0)} %).`);
    if(o.pOK){add(firstRun(k=>o.P[k]<=P.PAL,3,T,0),'DCS alarm',`${tg.PI[i]} L alarm (≤ ${fmt(P.PAL,0)} kPag).`);add(firstRun(k=>o.P[k]<=P.PALL,3,T,0),'DCS alarm',`${tg.PI[i]} LL alarm (≤ ${fmt(P.PALL,0)} kPag).`)}
    add(firstRun(k=>isNaN(o.Ld[k]),1,T,0),'DCS alarm',`${tg.LI[i]} signal sifati yomon (Bad PV).`);
    if(o.sisOK&&P.vote==='2oo2'){const sp=tg.sep;add(firstRun(k=>isFinite(o.S1[k])&&isFinite(o.S2[k])&&Math.min(o.S1[k],o.S2[k])<=P.LALL,1,T,0),'SIS alarm',`${nm}: LALL bitta kanalda (1oo2) — ogohlantirish.`);add(firstRun(k=>isFinite(o.S1[k])&&isFinite(o.S2[k])&&Math.max(o.S1[k],o.S2[k])>=P.LAHH,1,T,0),'SIS alarm',`${nm}: LAHH bitta kanalda (1oo2) — ogohlantirish.`)}
    const w=firstRun(k=>id.R[k]>=P.RTH,3,T,0);if(w>=0)add(w,'AI indeksi',`${nm}: R = ${fmt(id.R[w],2)} ≥ ${fmt(P.RTH,2)}; ${SIFK[id.sif[w]]} ga ${isFinite(id.ttt[w])?'~'+fmt(id.ttt[w],0)+' min':'yaqin'} qoldi.`);
    const d4=firstRun(k=>id.d4[k]&&!id.bad[k],P.DK,T,0);if(d4>=0)add(d4,'AI diagnostika',`${nm}: DCS va SIS sath o‘lchovlari mos kelmayapti.`);
    const d3=firstRun(k=>id.d3[k],P.DK,T,0);if(d3>=0)add(d3,'AI diagnostika',`${nm}: `+(id.mb[d3]===1?'massa balansi buzildi (tushuntirilmagan sath o‘zgarishi).':id.mb[d3]===2?'bosim kutilmaganda pasaymoqda.':'jarayon rejimi odatdagidan farq qilmoqda.'));
  });
  E.sort((a,b)=>a.k-b.k);return E;
}
// ---------- Review ----------
const f3=x=>fmt(Math.abs(x)<0.0005?0:x,3);
function mean(a,i,j){let s=0,n=0;for(let k=Math.max(0,i);k<=j&&k<a.length;k++)if(isFinite(a[k])){s+=a[k];n++}return n?s/n:NaN}
function reviewData(){
  const tg=TG(),run=cur.run,dg=cur.dg,e=cur.e,a=e.a,dt=P.dt,T=run.tanks[0].Ld.length;
  const t=dg.code!=='none'?dg.tank:(a.tripTank>=0?a.tripTank:ct()),o=run.tanks[t],id=cur.idxs[t],pt=a.per[t];
  const k0=dg.k>=0?dg.k:(run.ft>=0?run.ft:Math.round(60/dt)),k1=pt.trip>=0?pt.trip:T-1,pre=[Math.max(0,k0-60),Math.max(0,k0-1)];
  const Sm=o.S1.map((v,k)=>isFinite(v)&&isFinite(o.S2[k])?(v+o.S2[k])/2:(isFinite(v)?v:o.S2[k]));
  const dd=o.Ld.map((v,k)=>Math.abs(v-Sm[k]));
  const rows=[['DCS sath, %',mean(o.Ld,...pre),o.Ld[k1],1],['SIS sath (o‘rtacha), %',mean(Sm,...pre),Sm[k1],1],['DCS–SIS tafovuti, %',mean(dd,...pre),dd[k1],1],['Sath o‘zgarish tezligi, %/min',mean(id.slope,...pre),mean(id.slope,k1-10,k1),2],['Bosim, kPag',mean(o.P,...pre),o.P[k1],1],['Kirish oqimi, m³/sutka',mean(o.QIN,...pre),o.QIN[k1],0],['Ishlayotgan nasoslar',mean(o.NP,...pre),o.NP[k1],0]];
  // SIS harakati tekshiruvi
  let sisChk='';if(pt.trip>=0){const k=pt.trip,k2=Math.min(T-1,k+Math.round(20/dt));
    if(isNaN(o.Ld[k])&&isNaN(o.S1[k]))sisChk=`SIS fail-safe tamoyili bo‘yicha signal yo‘qolganda LALL va LAHH blokirovkalarini birga ishga tushirdi (nasos to‘xtaydi, kirish klapani yopiladi) — bu loyiha talabiga mos.`;
    else if(pt.type==='PVAC')sisChk=`past bosim bo‘yicha SIS blokirovkasi yo‘q; rezervuarni faqat mexanik vakuum klapani himoya qildi.`;
    else if(pt.type==='LAHH'){const ok=o.VIN[Math.min(T-1,k+1)]===0,sl=(mean(Sm,k2-4,k2)-mean(Sm,k,k+4))/Math.max(1,(k2-k-4)*dt);sisChk=`${tg.XVin[t]} ${ok?'yopildi':'yopilmadi!'}; trip’dan keyingi 20 daqiqada sath o‘zgarishi ${f3(sl)} %/min — ${sl<0.02?'to‘ldirish to‘xtadi, himoya samarali':'sath o‘sishda davom etdi, klapan germetikligini tekshirish kerak'}.`}
    else{const np=o.NP[Math.min(T-1,k+1)]===0,sl=(mean(Sm,k2-4,k2)-mean(Sm,k,k+4))/Math.max(1,(k2-k-4)*dt);
      sisChk=`nasos ${np?'to‘xtadi':'to‘xtamadi!'}; trip’dan keyingi 20 daqiqada sath o‘zgarishi ${f3(sl)} %/min — ${sl>-0.03?'chiqim to‘xtadi, himoya samarali':'sath nasossiz ham pasayishda davom etdi: chiqim nasos yo‘lidan emas (drenaj, flanes yoki klapan orqali sizish). SIS faqat nasosni to‘xtatgani uchun bunday sizishni to‘xtata olmaydi'}.`}}
  let ddMax=0,s12=0;for(let k=0;k<T;k++){if(isFinite(dd[k]))ddMax=Math.max(ddMax,dd[k]);if(isFinite(o.S1[k])&&isFinite(o.S2[k]))s12=Math.max(s12,Math.abs(o.S1[k]-o.S2[k]))}
  return {tg,run,dg,e,a,t,o,id,pt,k0,k1,rows,sisChk,ddMax,s12,Sm};
}
function conclusions(D){
  const {tg,dg,o,id,pt,k0,k1,Sm,t}=D,dt=P.dt,nm=tg.tk[t],V=P.V,T=o.Ld.length;
  const sl=mean(id.slope,k0,Math.max(k0,k1-2)),rate=Math.abs(sl),m3h=rate*V*60/100;
  const trip=pt.trip>=0?(pt.type==='PVAC'?`${fmt(pt.trip*dt,0)}-daqiqada bosim vakuumga tushib, ${tg.PVSV[t]} havo so‘ra boshladi`:`${fmt(pt.trip*dt,0)}-daqiqada ${sifTag(t,pt.type)} himoyasi ishladi`):'SIS himoyasi ishlamadi (trip bo‘lmadi)';
  const inst=`DCS va SIS o‘lchovlari orasidagi eng katta farq ${fmt(D.ddMax,1)} %, ikki SIS o‘lchagich orasidagi farq ${fmt(D.s12,1)} %.`;
  let tech='',kip='',tr=[],kr=[];
  switch(dg.code){
   case 'overrun':tech=`${nm} rezervuaridan vagon quyish davom etgan; nasoslar ishlab turganda sath Low alarm (${fmt(P.LAL,0)} %) dan pastga tushdi va ${trip}. Sath ~${fmt(rate,2)} %/min (~${fmt(m3h,0)} m³/soat) tezlikda pasaygan. Sabab — quyishni to‘xtatish vaqti o‘tkazib yuborilgan (operator yoki tartib). Oqibat: SIS nasosni to‘xtatib, uning quruq ishlash xavfini bartaraf etdi; vagon quyish to‘xtadi.`;
     tr=['Quyiladigan hajmni vagonlar soni bo‘yicha oldindan hisoblash va operator ekraniga qoldiq hajmni chiqarish.','DCS’da Low alarm’da quyish nasosini avtomatik to‘xtatish (BPCS blokirovkasi) imkoniyatini ko‘rib chiqish.','AI indeksi ogohlantirishini operator ekraniga chiqarish.'];
     kip=`O‘lchov vositalari me’yorida: ${inst} Sath pasayishi haqiqiy, o‘lchov xatosi emas.`;kr=['SIS ishlash holatini (demand) qayd etish va davriy sinov (proof test) jadvalida hisobga olish.'];break;
   case 'leak':{const v0=mean(Sm,k0-4,k0),v1=Sm[k1];const vol=isFinite(v0)&&isFinite(v1)?Math.max(0,(v0-v1))*V/100:NaN;
     tech=`Nasos to‘xtatilgandan keyin ${nm} rezervuarida sath ~${fmt(rate,2)} %/min (~${fmt(m3h,0)} m³/soat) tezlikda pasaydi; kirish va nasos oqimlari bilan bu tushuntirilmaydi (massa balansi buzilgan). ${trip}. Taxminiy yo‘qotilgan mahsulot: ${nb(vol,0)} m³. Yengil kondensat sizishi yong‘in va ekologik xavf tug‘diradi.`;
     tr=['Chiqish, drenaj va namuna olish klapanlarini, flanes birikmalarini ko‘rikdan o‘tkazish.','Rezervuar atrofida gaz tahlili o‘tkazish.','Massa balansi monitoringini doimiy ishlatish.'];
     kip=`${inst} Ikki mustaqil tizim bir xil pasayishni ko‘rsatgani uchun sizish haqiqiy, o‘lchov xatosi emas.`;kr=[`${tg.XVout[t]} va drenaj klapanlarining germetikligini tekshirish.`,'LALL’da nasos bilan birga chiqish klapanini ham yopishni (SIF kengaytirish) ko‘rib chiqish.'];break}
   case 'surge':{const f=dg.ev.f||0;tech=`Kirish oqimi me’yoridan ~${fmt(f,1)} marta oshdi; ${nm} ~${fmt(rate,2)} %/min tezlikda to‘ldi va ${trip}. Kirish yopilgach ishlab chiqarish oqimini qabul qilish uchun boshqa rezervuarga o‘tish kerak bo‘ladi.`;
     tr=['Yuqori oqim bo‘limi bilan oqim o‘zgarishi haqida xabardor qilish tartibini kelishish.','Qabul qiluvchi rezervuarni almashlab ulashni oldindan rejalashtirish.','High alarm’ni kirish oqimiga bog‘liq (vaqtga asoslangan) qilishni ko‘rib chiqish.'];
     kip=`${inst} Kirish oqimi o‘lchagichi (${tg.FQI}) va sath o‘sishi bir-biriga mos — o‘lchovlar ishonchli.`;kr=['SIS ishlash holatini qayd etish.'];break}
   case 'freeze':{const fl=dg.k,fv=o.Ld[fl],kE=pt.trip>=0?pt.trip:T;let dur=0;for(let k=fl;k<kE&&o.Ld[k]===fv;k++)dur++;
     tech=`Operator quyishni DCS sathiga (${tg.LI[t]}) qarab boshqargan. ${tg.LI[t]} ${nb(fv,1)} % da qotib qolgan, haqiqiy sath (SIS) esa pasayishda davom etgan. Shu sababli quyish o‘z vaqtida to‘xtatilmadi va DCS Low alarm ishlamadi; ${trip}.`;
     tr=['Operator ekraniga SIS sath qiymatini ham chiqarish.','DCS va SIS sathini solishtiruvchi alarmni joriy etish.'];
     kip=`${tg.LI[t]} signali ${pt.trip>=0?'trip’gacha ':''}${fmt(dur*dt,0)} daqiqa davomida o‘zgarmagan (tekis signal), SIS bilan farq ${fmt(D.ddMax,1)} % gacha yetgan. Ikki SIS o‘lchagich o‘zaro mos (${fmt(D.s12,1)} %), demak nosoz — DCS datchigi. Ehtimoliy sabab: datchik elektronikasi, impuls liniyasi yoki kiritish kanali.`;
     kr=[`${tg.LI[t]} datchigini tekshirish va kalibrlash.`,'DCS’da “o‘zgarmas signal” diagnostikasini yoqish.'];break}
   case 'press':{const p0=mean(o.P,k0-30,k0),p1=o.P[k1];tech=`${nm} rezervuarida gaz yostig‘i bosimi ${nb(p0,1)} kPag dan ${nb(p1,1)} kPag gacha pasaydi. Gaz yostig‘i ${tg.PCV[t]} orqali tabiiy gaz bilan ushlab turiladi; u ishdan chiqqanda, ayniqsa quyish vaqtida, bug‘ bo‘shlig‘i kengayib bosim tez tushadi. ${trip}. Rezervuarga havo kirishi yengil kondensat bug‘lari bilan portlovchi aralashma hosil qiladi — bu eng xavfli oqibat.`;
     tr=[`${tg.PCV[t]} va gaz yostig‘i ta’minot liniyasini tekshirish.`,'Bosim L alarm’da quyishni to‘xtatish tartibini joriy etish.','Rezervuar bug‘ bo‘shlig‘ida kislorod tahlilini o‘tkazish.'];
     kip=`Bosim ${tg.PI[t]} bitta datchik bilan o‘lchanadi va P&ID bo‘yicha SIS blokirovkasiga ulanmagan — past bosimdan faqat mexanik ${tg.PVSV[t]} himoya qiladi. ${inst}`;kr=[`${tg.PCV[t]} ishlashini va sozlamasini tekshirish.`,`${tg.PVSV[t]} ni ko‘rikdan o‘tkazish.`,'Past bosim bo‘yicha avtomatik quyishni to‘xtatish (SIF) zarurligini xavf tahlilida ko‘rib chiqish.'];break}
   case 'nan':{const kb=Math.max(0,dg.k-2);tech=`${nm} rezervuarida barcha o‘lchov signallari bir vaqtda yo‘qoldi. DCS ekranida LAHH va LALL bir vaqtda yonadi — fizik jihatdan bu mumkin emas, demak sabab o‘lchov zanjirida. Undan oldin jarayonda og‘ish kuzatilmagan (sath ${nb(o.Ld[kb],1)} %, bosim ${nb(o.P[kb],1)} kPag). ${trip} — bu soxta (spurious) trip, jarayon xavfi sabab bo‘lmagan.`;
     tr=['Qayta ishga tushirishdan oldin haqiqiy sathni mahalliy o‘lchagich bilan tasdiqlash.','Qabul yoki quyishni boshqa rezervuarga o‘tkazish.'];
     kip=`DCS va SIS kanallari bir vaqtda yo‘qolgani umumiy sababni ko‘rsatadi: kabel yoki kommutatsiya qutisi, quvvat manbai yoki kiritish moduli. Yakka datchik nosozligida bunday bo‘lmaydi. SIS fail-safe tamoyili bo‘yicha to‘g‘ri ishladi.`;
     kr=['Quvvat, kabel va kiritish modullarini tekshirish.','SIS’ni chetlab o‘tmasdan (bypass qilmasdan) tiklash.','Soxta trip statistikasini yuritish.'];break}
   case 'recirc':{tech=`Quyish vaqtida nasoslarning minimal oqimi (${tg.FO} orqali) quyilayotgan rezervuarga emas, ${nm} rezervuariga qaytgan. Natijada ${nm} kirish oqimidan tezroq to‘ldi (~${fmt(rate,2)} %/min) va ${trip}. SIS faqat kirish klapanini yopadi, aylanma liniyani yopmaydi — nasos ishlashda davom etsa, rezervuar shu liniya orqali to‘lishda davom etadi.`;
     tr=[`Quyish boshlashdan oldin ${tg.ZI} holatini joyida tekshirish.`,'Ikki rezervuar sathi o‘zgarishini solishtiruvchi nazoratni joriy etish.','LAHH blokirovkasini aylanma liniyaga ham kengaytirishni ko‘rib chiqish.'];
     kip=`${tg.ZI} holat datchiklari (ZSO/ZSC) quyilayotgan rezervuarni ko‘rsatgan, biroq ${nm} da hisobga olinmagan kelim aniqlangan. Bu klapanning ichki nosozligi yoki holat datchiklarining noto‘g‘ri sozlanganini ko‘rsatadi. ${inst}`;
     kr=[`${tg.ZI} va uning ZSO/ZSC datchiklarini tekshirish.`,'Klapan pozitsiyasini joyida tasdiqlash.'];break}
   default:tech=`Jarayon me’yorda kechdi. ${trip}. Parametrlar ruxsat etilgan chegaralarda.`;kip=`O‘lchov vositalari me’yorida: ${inst}`;
  }
  if(D.sisChk)kip+=' SIS harakati: '+D.sisChk;
  return {tech,kip,tr,kr};
}
function reviewHtml(){
  const D=reviewData(),{tg,run,dg,e,a,t,rows}=D,dt=P.dt,E=buildEvents(),C=conclusions(D);
  const truth=mode==='sim'?TRUTH[run.kind]:null,ok=truth!==null&&dg.code===truth&&(truth==='none'||dg.tank===run.fT);
  const ld=x=>x===null?'—':fmt(x,1)+' min';
  let h=`<p><b>${esc(mode==='sim'?(run.label||KINDS[run.kind]):'Yuklangan ma’lumot')}</b>${mode==='sim'&&run.kind!=='normal'?' · nosozlik rezervuari: '+tg.tk[run.fT]:''}</p>`;
  h+=`<p><b>AI tashxisi:</b> ${esc(CAUSE[dg.code])}${dg.code!=='none'?' ('+tg.tk[dg.tank]+', '+fmt(dg.k*dt,0)+'-daqiqadan)':''}`+(truth!==null?` <span class="pill" style="background:${ok?'var(--ok)':'var(--trip)'}">${ok?'haqiqiy sababga mos':'haqiqiy sababga mos emas'}</span>`:'')+`</p>`;
  h+=`<p>${a.trip>=0?`Himoya hodisasi: ${fmt(a.trip*dt,0)}-daqiqada, ${tg.tk[a.tripTank]}, ${sifTag(a.tripTank,a.tripType)}. Hodisadan oldin berilgan ogohlantirishlar: mavjud alarmlar — ${e.L.alarm===null?'ishlamadi':ld(e.L.alarm)}, AI indeksi — ${e.L.warn===null?'ishlamadi':ld(e.L.warn)}, AI diagnostika — ${e.L.diag===null?'ishlamadi':ld(e.L.diag)}.`:'SIS trip bo‘lmadi.'}</p>`;
  h+=`<h2>1. Voqealar ketma-ketligi</h2><div class="tw" tabindex="0"><table><tr><th>Vaqt, min</th><th>Manba</th><th>Hodisa</th></tr>`+E.map(v=>`<tr><td>${fmt(v.k*dt,1)}</td><td>${esc(v.src)}</td><td>${esc(v.txt)}</td></tr>`).join('')+`</table></div><p class="note">* Haqiqiy sabab faqat simulyatsiyada ma’lum; real hodisada u tizimga ko‘rinmaydi va AI tashxisi bilan solishtirish uchun berilgan.</p>`;
  h+=`<h2>2. Parametrlar o‘zgarishi (${tg.tk[t]})</h2><div class="tw" tabindex="0"><table><tr><th>Parametr</th><th>Nosozlikdan oldin</th><th>${D.pt.trip>=0?'Trip paytida':'Kuzatuv oxirida'}</th><th>O‘zgarish</th></tr>`+rows.map(r=>`<tr><td>${r[0]}</td><td>${nb(r[1],r[3])}</td><td>${nb(r[2],r[3])}</td><td>${isFinite(r[1])&&isFinite(r[2])?(r[2]-r[1]>=0?'+':'')+fmt(r[2]-r[1],r[3]):'—'}</td></tr>`).join('')+`</table></div>`;
  h+=`<h2>3. Texnolog xulosasi</h2><p>${esc(C.tech)}</p>${C.tr.length?'<ul>'+C.tr.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':''}`;
  h+=`<h2>4. KIP xulosasi</h2><p>${esc(C.kip)}</p>${C.kr.length?'<ul>'+C.kr.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':''}`;
  h+=`<p class="note">Xulosa AI modeli (Isolation Forest, dinamik xavf indeksi) va fizik qoidalar asosida avtomatik tuzildi. Yakuniy xulosani texnolog va KIP mutaxassisi tasdiqlashi kerak.</p>`;
  cur.reviewRows=[['Hodisa tahlili (Review)'],['Holat',mode==='sim'?(run.label||KINDS[run.kind]):'Yuklangan ma’lumot'],['AI tashxisi',CAUSE[dg.code]],...(truth!==null?[['Haqiqiy sabab bilan mosligi',ok?'mos':'mos emas']]:[]),['Himoya hodisasi',a.trip>=0?`${fmt(a.trip*dt,1)} min, ${tg.tk[a.tripTank]}, ${a.tripType}`:'yo‘q'],['Mavjud alarmlar lead, min',ld(e.L.alarm)],['AI indeksi lead, min',ld(e.L.warn)],['AI diagnostika lead, min',ld(e.L.diag)],[],['Voqealar ketma-ketligi'],['Vaqt, min','Manba','Hodisa'],...E.map(v=>[+(v.k*dt).toFixed(1),v.src,v.txt]),[],['Parametrlar o‘zgarishi',tg.tk[t]],['Parametr','Oldin','Hodisa paytida'],...rows.map(r=>[r[0],isFinite(r[1])?+r[1].toFixed(r[3]):'NaN',isFinite(r[2])?+r[2].toFixed(r[3]):'NaN']),[],['Texnolog xulosasi',C.tech],...C.tr.map(x=>['',x]),[],['KIP xulosasi',C.kip],...C.kr.map(x=>['',x])];
  return h;
}
// ---------- boshqaruv ----------
function runSimNow(anim){if(!simModel)return;mode='sim';model=simModel;P.dt=DT;const r=rngMake(Math.max(1,Math.floor(+$('seed').value||1)));
  const kindSel=$('kind').value,kind=kindBase(kindSel),ft=+$('ftank').value;const run=runPlant2(kind,ft,r,P);run.label=KINDS[kindSel];$('ctank').value=String(kind==='normal'?run.load:ft);load(run);
  $('status').textContent=(kind==='normal'?'Normal ish: bir rezervuar qabul qiladi, ikkinchisidan quyiladi.':(run.label||KINDS[kind])+' — '+TG().tk[ft]+'.')+(run.ft>=0?' Nosozlik ~'+fmt(run.ft*DT,0)+'-daqiqada (kulrang nuqtali chiziq).':'');
  if(anim)play();else{prog=run.tanks[0].Ld.length;render()}}
function play(){clearInterval(timer);prog=0;hover=-1;const T=cur.run.tanks[0].Ld.length;timer=setInterval(()=>{prog+=Math.round(2+(+$('speed').value)*3);if(prog>=T-1){prog=T-1;clearInterval(timer);timer=null}render()},30)}
function mv(e){if(!geo||!cur)return;const rc=e.currentTarget.getBoundingClientRect();const x=e.clientX-rc.left;const k=Math.round((x-geo.m.l)/geo.pw*(geo.T-1));hover=k>=0&&k<=Math.min(prog,geo.T-1)?k:-1;render()}
let hT=null;['c1','c2','c3'].forEach(id=>{const c=$(id);c.addEventListener('pointermove',e=>{clearTimeout(hT);mv(e)});c.addEventListener('pointerdown',e=>{clearTimeout(hT);mv(e)});
  const end=e=>{clearTimeout(hT);hT=setTimeout(()=>{hover=-1;if(cur)render()},e.pointerType==='mouse'?0:1800)};c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);c.addEventListener('pointerleave',end)});
['rth','w1','w2','w3','w4'].forEach(id=>$(id).addEventListener('input',()=>{readP();if(cur)load(cur.run)}));
['sev','noise'].forEach(id=>{$(id).addEventListener('input',readP);$(id).addEventListener('change',()=>{if(mode==='sim')runSimNow(false)})});
try{localStorage.removeItem('qtags_plant');localStorage.removeItem('qtags_rez')}catch(e){}   // eski versiyadan qolganlar; har ochilganda anonim rejim
document.body.dataset.tags=$('tags').value;
const vaultBox=()=>{try{const s=localStorage.getItem('qtags_vault');if(s){const b=JSON.parse(s);if(Vault.valid(b))return b}}catch(e){}return window.PLANT_VAULT||null};
function tagsApply(){document.body.dataset.tags=$('tags').value;if(cur){render();$('review').innerHTML=reviewHtml();try{__journal.refresh()}catch(e){}}}
// Parol oynasi: parol kiritilsa matn, bekor qilinsa null qaytaradi
function askPw(msg){const d=$('pwDlg'),inp=$('pwIn');return new Promise(res=>{let done=false;$('pwMsg').textContent=msg||'';inp.value='';
  const fin=v=>{if(done)return;done=true;d.close();d.onclose=null;$('pwForm').onsubmit=null;$('pwCancel').onclick=null;res(v)};
  $('pwForm').onsubmit=e=>{e.preventDefault();fin(inp.value)};$('pwCancel').onclick=()=>fin(null);d.onclose=()=>fin(null);d.showModal();inp.focus()})}
let pwFails=0,pwLock=0;
async function unlockPlant(){
  if(!Vault.available()){$('status').textContent=tx('Xato: bu brauzerda shifrlash mavjud emas (https yoki zamonaviy brauzer kerak).');return false}
  const box=vaultBox();if(!box){$('status').textContent=tx('Bu nusxada haqiqiy teglar yo‘q.');return false}
  let msg='';
  for(;;){
    const wait=pwLock-Date.now();if(wait>0)msg=tx('Juda ko‘p urinish. Kuting')+': '+Math.ceil(wait/1000)+' s';
    const pw=await askPw(msg);if(pw===null)return false;
    if(pwLock>Date.now()){msg=tx('Juda ko‘p urinish. Kuting')+': '+Math.ceil((pwLock-Date.now())/1000)+' s';continue}
    const t=await Vault.open(box,pw),tags=t&&sanitizeTags(t,TAGS.anon);
    if(tags){pwFails=0;TAGS.plant=tags;return true}
    if(++pwFails>=5){pwLock=Date.now()+30000;pwFails=0}
    msg=tx('Parol noto‘g‘ri.')}}
$('tags').onchange=async()=>{
  if($('tags').value==='plant'){$('tags').value='anon';if(await unlockPlant())$('tags').value='plant'}
  else delete TAGS.plant;   // anonimga qaytilganda qulflanadi: keyingi safar yana parol so'raladi
  tagsApply()};
// Parolni yangilash (Sozlamalar): eski parol bilan ochiladi, yangisi bilan qayta shifrlanadi va faqat shu qurilmada saqlanadi
$('pwChg').onclick=async()=>{const m=$('pwChgMsg'),o=$('pwOld').value,n=$('pwNew').value,n2=$('pwNew2').value;
  const say=(t,bad)=>{m.textContent=tr(t);m.style.color=bad?'var(--trip)':'var(--ok)'};
  if(!Vault.available())return say('Xato: bu brauzerda shifrlash mavjud emas.',1);
  const box=vaultBox();if(!box)return say('Bu nusxada haqiqiy teglar yo‘q.',1);
  if(n.length<8)return say('Yangi parol kamida 8 belgi bo‘lishi kerak.',1);
  if(n!==n2)return say('Yangi parol ikki marta bir xil kiritilmadi.',1);
  const t=await Vault.open(box,o);if(!t)return say('Eski parol noto‘g‘ri.',1);
  try{localStorage.setItem('qtags_vault',JSON.stringify(await Vault.seal(t,n)))}catch(e){return say('Xato: brauzer xotirasi yopiq, parol saqlanmadi.',1)}
  $('pwOld').value=$('pwNew').value=$('pwNew2').value='';say('Parol yangilandi (faqat shu qurilmada).',0)};
$('pwReset').onclick=()=>{if(!confirm(tx('Parol dastlabki (o‘rnatilgan) holatga qaytariladi. Davom etasizmi?')))return;try{localStorage.removeItem('qtags_vault')}catch(e){}$('pwChgMsg').textContent=tx('Dastlabki parol tiklandi.');$('pwChgMsg').style.color='var(--ok)'};
$('ctank').onchange=()=>{if(cur)render()};
$('run').onclick=()=>{if(LV.on)lvStop();if(mode==='sim')runSimNow(true);else if(cur)play()};
$('show').onclick=()=>{clearInterval(timer);timer=null;prog=cur?cur.run.tanks[0].Ld.length:0;hover=-1;render()};
['kind','ftank','seed'].forEach(id=>$(id).onchange=()=>{if(mode==='sim')runSimNow(false)});
window.addEventListener('resize',()=>{const w=window.innerWidth;if(w!==lastW){lastW=w;if(cur)render()}});

let training=false,trainTok=0;
async function trainAsync(Pt,seed,cb){const g=trainModel2Gen(Pt,seed);let x;while(!(x=g.next()).done){if(cb)cb(x.value);await tick()}return x.value}
async function retrain(cb){const tok=++trainTok;const m=await trainAsync({...P,dt:DT,noise:1,sev:0},7,cb);if(tok!==trainTok)return false;simModel=m;if(mode==='sim')model=m;return true}
$('apply').onclick=async()=>{if(working||training)return;const bad=readPlant();if(bad.length){$('status').textContent='Xato: '+bad.join('; ');return}
  training=true;$('apply').disabled=$('reset').disabled=true;const st=f=>{$('status').textContent='Model qayta o‘qitilmoqda… '+Math.round(f*100)+' %'};st(0);
  try{await retrain(st);lastBatch=null;$('bOut').innerHTML='';if(mode==='sim')runSimNow(false);$('status').textContent='Parametrlar qo‘llandi, model qayta o‘qitildi.'}
  catch(e){$('status').textContent='Xato: '+e.message}finally{training=false;$('apply').disabled=$('reset').disabled=false}};
$('reset').onclick=()=>{const map={pQr:'Qr',pV:'V',pQprod:'Qprod',pQpump:'Qpump',pP0:'P0',pLAL:'LAL',pLALL:'LALL',pLAH:'LAH',pLAHH:'LAHH',pPAL:'PAL',pPALL:'PALL',pTh:'Th',pTresp:'Tresp'};for(const id in map)$(id).value=PDEF[map[id]];$('pVote').value='1oo2';$('apply').click()};
// ---------- ommaviy sinov ----------
const METH=[['alarm','Mavjud alarmlar (DCS)'],['warn','AI indeksi R'],['diag','AI diagnostika'],['comb','Birgalikda (alarm + indeks + diagnostika)']];
async function batchAsync(Pb,mdl,seed,nF,nN,cb){
  const r=rngMake(seed);const res={per:{},m:{},dx:{}};for(const [k] of METH)res.m[k]={leads:[],miss:0,fa:0};
  let done=0;const kinds=[...FAULTS,'f6'],tot=kinds.length*nF+nN;
  for(const kind of kinds){res.per[kind]={n:0,trip:0};res.dx[kind]=[0,0];for(const [k] of METH)res.per[kind][k]=[];
    for(let i=0;i<nF;i++){const run=runPlant2(kind,i%2,r,Pb);const idxs=run.tanks.map(o=>computeIndex2(o,mdl,Pb));const e=analyseRun(run,idxs,Pb);const dg=diagnose(run,idxs,Pb,e);
      res.dx[kind][1]++;if(dg.code===TRUTH[kind]&&dg.tank===run.fT)res.dx[kind][0]++;res.per[kind].n++;
      if(e.a.trip>=0){res.per[kind].trip++;if(kind!=='f6')for(const [k] of METH){if(e.L[k]===null){res.m[k].miss++;res.per[kind][k].push(null)}else{res.m[k].leads.push(e.L[k]);res.per[kind][k].push(e.L[k])}}}
      done++;if(done%2===0){cb&&cb(done/tot);await tick()}}}
  res.dx.normal=[0,0];
  for(let i=0;i<nN;i++){const run=runPlant2('normal',0,r,Pb);const idxs=run.tanks.map(o=>computeIndex2(o,mdl,Pb));const e=analyseRun(run,idxs,Pb);for(const [k] of METH)if(e.fired[k])res.m[k].fa++;
    const dg=diagnose(run,idxs,Pb,e);res.dx.normal[1]++;if(dg.code==='none')res.dx.normal[0]++;done++;if(done%2===0){cb&&cb(done/tot);await tick()}}
  res.nN=nN;res.nTrip=FAULTS.reduce((s,k)=>s+res.per[k].trip,0);
  for(const [k] of METH){const l=res.m[k].leads,n=l.length+res.m[k].miss;res.m[k].mean=l.length?l.reduce((a,b)=>a+b,0)/l.length:NaN;res.m[k].min=l.length?Math.min(...l):NaN;res.m[k].ok=n?l.filter(x=>x>=Pb.Tresp).length/n:NaN;res.m[k].far=res.m[k].fa/nN}
  res.dxAll=Object.values(res.dx).reduce((s,v)=>[s[0]+v[0],s[1]+v[1]],[0,0]);return res}
function setProg(f){const p=$('prog');p.classList.remove('hide');p.firstElementChild.style.width=Math.round(f*100)+'%'}
async function guard(ids,fn){if(working||training)return;ids=[...ids,'apply','reset'];working=true;ids.forEach(i=>$(i).disabled=true);$('bOut').innerHTML='<p class="msg">Hisoblanmoqda…</p>';setProg(0);
  try{await fn()}catch(e){$('bOut').innerHTML='<p class="msg">Xato: '+esc(String(e.message||e))+'</p>'}
  working=false;ids.forEach(i=>$(i).disabled=false);$('prog').classList.add('hide');$('bOut').scrollIntoView({behavior:'smooth',block:'nearest'})}
const nf=(x,d)=>isFinite(x)?fmt(x,d):'—';
const tbl=(rows,hdr)=>'<div class="tw" tabindex="0"><table><tr>'+hdr.map(h=>`<th>${h}</th>`).join('')+'</tr>'+rows.map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('')+'</table></div>';
const HDR=['Usul','O‘rtacha ogohlantirish muddati','Eng kichik muddat','Yetarli (≥ javob vaqti) ulushi','O‘tkazib yuborilgan','Normal ishda signal berganlar ulushi'];
$('bRun').onclick=()=>guard(['bRun','b5'],async()=>{
  const s=Math.max(1,+$('seed').value||1)*101,Pb={...P,dt:DT};const r=await batchAsync(Pb,simModel,s,10,50,setProg);
  const rows=METH.map(([k,n])=>{const m=r.m[k];return [n,nf(m.mean,1)+' min',nf(m.min,1)+' min',nf(m.ok*100,0)+' %',m.miss+' / '+r.nTrip,nf(m.far,2)]});
  const mm=a=>{const v=a.filter(x=>x!==null);return v.length?fmt(v.reduce((x,y)=>x+y,0)/v.length,1)+(v.length<a.length?` (${a.length-v.length} o‘tk.)`:''):(a.length?'ishlamadi':'—')};
  const per=[...FAULTS,'f6'].map(kind=>{const p=r.per[kind],dx=r.dx[kind];return [KINDS[kind],p.trip+' / '+p.n,kind==='f6'?'to‘satdan':mm(p.alarm),kind==='f6'?'—':mm(p.warn),kind==='f6'?'—':mm(p.diag),kind==='f6'?'—':mm(p.comb),dx[0]+' / '+dx[1]]});
  per.push([KINDS.normal,'—','—','—','—','—',r.dx.normal[0]+' / '+r.dx.normal[1]]);
  const H2=['Holat','Himoya hodisasi / jami','Mavjud alarmlar, min','AI indeksi, min','AI diagnostika, min','Birgalikda, min','AI tashxisi to‘g‘ri'];
  lastBatch={title:'Barcha ssenariylar (variant '+s+')',rows:[HDR,...rows],per:[H2,...per],dx:r.dxAll};
  $('bOut').innerHTML=tbl(rows,HDR)+'<h2 style="margin:16px 0 0;font-size:14px">Holat turlari bo‘yicha</h2>'+tbl(per,H2)+
   `<p class="msg"><b>AI sabab tashxisi aniqligi: ${r.dxAll[0]} / ${r.dxAll[1]} (${fmt(100*r.dxAll[0]/r.dxAll[1],0)} %)</b> — sabab turi va rezervuar ikkalasi to‘g‘ri topilgan holatlar.</p>`+
   `<p class="note">Ogohlantirish muddati SIS trip bo‘lgan ${r.nTrip} ta rivojlanib boruvchi nosozlik bo‘yicha. “Yetarli” — kamida ${fmt(P.Tresp,0)} daqiqa oldin. Oxirgi ustun (1-jadval) — ${r.nN} ta normal ssenariydan signal berganlari ulushi (DCS alarm uchun bu ko‘pincha to‘g‘ri High alarm).</p>`});
$('b5').onclick=()=>guard(['bRun','b5'],async()=>{
  const runs=[];const N=5;for(let v=1;v<=N;v++){const Pb={...P,dt:DT};const m=trainModel2({...Pb,noise:1,sev:0},v*11);runs.push(await batchAsync(Pb,m,v*100,10,50,f=>setProg((v-1+f)/N)))}
  const st=a=>{const b=a.filter(isFinite);return b.length?{m:b.reduce((x,y)=>x+y,0)/b.length,lo:Math.min(...b),hi:Math.max(...b)}:{m:NaN,lo:NaN,hi:NaN}};
  const c=(o,d,u)=>isFinite(o.m)?fmt(o.m,d)+u+' ['+fmt(o.lo,d)+'–'+fmt(o.hi,d)+']':'—';
  const rows=METH.map(([k,n])=>[n,c(st(runs.map(r=>r.m[k].mean)),1,' min'),c(st(runs.map(r=>r.m[k].min)),1,' min'),c(st(runs.map(r=>r.m[k].ok*100)),0,' %'),runs.reduce((s,r)=>s+r.m[k].miss,0)+' / '+runs.reduce((s,r)=>s+r.nTrip,0),c(st(runs.map(r=>r.m[k].far)),2,'')]);
  const dx=runs.reduce((s,r)=>[s[0]+r.dxAll[0],s[1]+r.dxAll[1]],[0,0]);
  lastBatch={title:'5 ta variant bo‘yicha o‘rtacha [min–maks]',rows:[HDR,...rows],dx};
  $('bOut').innerHTML=tbl(rows,HDR)+`<p class="msg"><b>AI sabab tashxisi aniqligi (5 variant): ${dx[0]} / ${dx[1]} (${fmt(100*dx[0]/dx[1],1)} %)</b></p><p class="note">Har bir variantda model qayta o‘qitildi va ssenariylar yangidan yaratildi. Qavs ichida variantlar orasidagi eng kichik va eng katta qiymat.</p>`});
// ---------- fayl ----------
const csvRows=parseCsvText;
function parseRows(rows){
  const err=validateTankTable(rows);if(err)throw new Error(err);
  const hd=rows[0].map(x=>String(x).toLowerCase().trim());const col=findCols(hd);
  const body=rows.slice(1),g=i=>Float64Array.from(body.map(r=>i>=0&&r[i]!==undefined&&String(r[i]).trim()!==''?parseFloat(String(r[i]).replace(',','.')):NaN));
  const T=body.length,nanA=()=>new Float64Array(T).fill(NaN);
  const o={Ld:g(col.s),S1:col.a>=0?g(col.a):nanA(),S2:col.b>=0?g(col.b):nanA(),P:col.p>=0?g(col.p):nanA(),NP:col.n>=0?g(col.n).map(x=>isNaN(x)?0:x):new Float64Array(T),QIN:col.q>=0?g(col.q):new Float64Array(T).fill(P.Qprod),VIN:new Float64Array(T).fill(1),VOUT:new Float64Array(T).fill(1),T:nanA(),pOK:col.p>=0,sisOK:col.a>=0||col.b>=0};
  o.noPump=col.n<0||col.q<0;
  return {run:{kind:'normal',fT:0,ft:-1,tanks:[o],ev:[],QP:o.QIN},col}}
function readDtTr(){const dtS=parseFloat($('pDT').value),trP=parseFloat($('pTR').value);if(!(dtS>=1&&dtS<=3600))throw new Error('Diskretlik 1–3600 soniya oralig‘ida bo‘lishi kerak.');if(!(trP>=10&&trP<=90))throw new Error('Normal deb olinadigan qism 10–90 % oralig‘ida bo‘lishi kerak.');return {dt:dtS/60,tr:trP/100}}
function useData(run,col,name){
  const dtr=readDtTr();P.dt=dtr.dt;const o=run.tanks[0];const nTr=Math.max(40,Math.floor(o.Ld.length*dtr.tr));
  const sub={};for(const k of ['Ld','S1','S2','P','NP','QIN','VIN','VOUT'])sub[k]=o[k].slice(0,nTr);
  const w=Math.max(2,Math.round(5/P.dt));const X=feat2(sub,P).X.slice(w);model=trainIF(X,100,Math.min(256,X.length),5);model.zT=zThreshold([feat2(sub,P).zL]);mode='csv';$('ctank').value='0';load(run);prog=o.Ld.length;render();
  const miss=[];if(!o.sisOK)miss.push('SIS ustunlari yo‘q — SIS trip DCS sathi bo‘yicha baholanadi');if(!o.pOK)miss.push('bosim yo‘q');if(o.noPump)miss.push('nasos yoki kirish oqimi yo‘q — massa balansi tekshiruvi o‘chirildi');
  window.__csvName=name;$('csvMsg').textContent=name+': '+o.Ld.length+' qator. Model birinchi '+nTr+' qatorda o‘qitildi (normal rejim deb olindi).'+(miss.length?' Eslatma: '+miss.join('; ')+'.':'');
  $('status').textContent='Rejim: o‘z ma’lumotingiz (A rezervuar).';showView('overview')}
$('csv').onchange=async e=>{const f=e.target.files[0];if(!f)return;const oldDt=P.dt;
  try{if(f.size>30e6)throw new Error('Fayl juda katta (30 MB gacha).');let rows;if(/\.xlsx$/i.test(f.name))rows=await readXlsx(await f.arrayBuffer());else if(/\.xls$/i.test(f.name))throw new Error('Eski .xls qo‘llanmaydi. Excel’da .xlsx yoki .csv qilib saqlang.');else rows=csvRows(await f.text());
    const {run,col}=parseRows(rows);useData(run,col,f.name)}catch(er){P.dt=oldDt;$('csvMsg').textContent='Xato: '+er.message}e.target.value=''};
$('back').onclick=()=>{lvStop();P.dt=DT;model=simModel;mode='sim';runSimNow(false);$('csvMsg').textContent='Simulyatsiya rejimiga qaytildi.'};
// ---------- ONLAYN MA'LUMOT QABUL QILISH ----------
const LV={busy:false,on:false,src:'',timer:0,ws:null,rows:null,trained:false,fh:null,last:0,cnt:0,demoK:0};
const LVH=['sath','sis1','sis2','bosim','nasos','kirish'];
function lvSet(t,c){$('lvTxt').textContent=t;$('lvDot').style.background=c||'var(--gray)'}
function lvApply(rows,name){const max=Math.max(100,+$('lvMax').value||2880);if(rows.length>max+1)rows=[rows[0],...rows.slice(rows.length-max)];LV.rows=rows;
  if(rows.length<61){lvSet(`${name}: ${rows.length-1} qator qabul qilindi — tahlil uchun kamida 60 qator kerak, kutilmoqda…`,'var(--warn)');return}
  const {run,col}=parseRows(rows);const o=run.tanks[0];
  if(!LV.trained){const dtr=readDtTr();P.dt=dtr.dt;const nTr=Math.max(40,Math.floor(o.Ld.length*dtr.tr));const sub={};for(const k of ['Ld','S1','S2','P','NP','QIN','VIN','VOUT'])sub[k]=o[k].slice(0,nTr);
    const w=Math.max(2,Math.round(5/P.dt));model=trainIF(feat2(sub,P).X.slice(w),100,Math.min(256,Math.max(40,nTr-w)),5);model.zT=zThreshold([feat2(sub,P).zL]);LV.trained=true;mode='csv';$('ctank').value='0'}
  clearInterval(timer);timer=null;hover=-1;load(run);prog=o.Ld.length;render();LV.cnt++;
  const tm=new Date().toLocaleTimeString();lvSet(`ONLAYN · ${name} · ${o.Ld.length} qator · oxirgi yangilanish ${tm}`,'var(--ok)');$('status').textContent='Rejim: onlayn ma’lumot ('+name+') · '+tm}
async function lvReadFile(f){if(/\.xlsx$/i.test(f.name))return await readXlsx(await f.arrayBuffer());return csvRows(await f.text())}
async function lvTickFile(){try{const f=await LV.fh.getFile();if(f.lastModified===LV.last)return;LV.last=f.lastModified;lvApply(await lvReadFile(f),f.name)}catch(e){lvSet('Faylni o‘qib bo‘lmadi: '+e.message,'var(--trip)')}}
async function lvTickUrl(){if(LV.busy)return;LV.busy=true;const u=$('lvUrl').value.trim();try{if(!/^https?:\/\//i.test(u))throw new Error('manzil http:// yoki https:// bilan boshlanishi kerak');const r=await fetch(u+(u.includes('?')?'&':'?')+'_t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const ct=r.headers.get('content-type')||'';let rows;
    if(/\.xlsx(\?|$)/i.test(u)||/spreadsheetml/.test(ct))rows=await readXlsx(await r.arrayBuffer());else{const t=await r.text();if(t.length>20e6)throw new Error('javob juda katta');if(/^\s*[\[{]/.test(t))rows=lvJsonRows(JSON.parse(t));else rows=csvRows(t)}lvApply(rows,'URL')}catch(e){lvSet('URL dan olib bo‘lmadi: '+e.message+' (manzil va CORS ruxsatini tekshiring)','var(--trip)')}finally{LV.busy=false}}
function lvJsonRows(j){const arr=Array.isArray(j)?j:(j.rows||j.data||[j]);if(Array.isArray(arr[0]))return arr;return [LVH,...arr.map(o=>LVH.map(h=>o[h]??o[h.toUpperCase()]??''))]}
function lvPush(obj){if(!LV.rows)LV.rows=[LVH.slice()];if(Array.isArray(obj)){for(const o of obj.slice(-5000))LV.rows.push(LVH.map(h=>o[h]??''))}else LV.rows.push(LVH.map(h=>obj[h]??''));lvApply(LV.rows,LV.src==='demo'?'sinov manbasi':'WebSocket')}
function lvStop(){clearInterval(LV.timer);LV.timer=0;if(LV.ws){try{LV.ws.close()}catch(e){}LV.ws=null}LV.on=false;$('lvStop').disabled=true;lvSet(LV.cnt?'Onlayn qabul to‘xtatildi (oxirgi ma’lumot ekranda qoldi).':'Onlayn qabul o‘chiq.')}
async function lvStart(){lvStop();LV.trained=false;LV.rows=null;LV.last=0;LV.cnt=0;const src=$('lvSrc').value,iv=Math.max(1,+$('lvInt').value||5)*1000;LV.src=src;
  try{if(src==='file'){if(!window.showOpenFilePicker)throw new Error('bu brauzer faylni kuzatishni qo‘llamaydi — Chrome yoki Edge’dan foydalaning');
      [LV.fh]=await window.showOpenFilePicker({types:[{description:'Excel / CSV',accept:{'text/csv':['.csv','.txt'],'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]});await lvTickFile();LV.timer=setInterval(lvTickFile,iv)}
    else if(src==='url'){if(!$('lvUrl').value.trim())throw new Error('manzilni kiriting');lvSet('Ulanmoqda…','var(--warn)');await lvTickUrl();LV.timer=setInterval(lvTickUrl,iv)}
    else{const u=$('lvUrl').value.trim();if(!/^wss?:\/\//.test(u))throw new Error('WebSocket manzili ws:// yoki wss:// bilan boshlanishi kerak');if(location.protocol==='https:'&&/^ws:\/\//.test(u))throw new Error('https sahifadan ws:// ga ulanib bo‘lmaydi (brauzer bloklaydi) — wss:// ishlating yoki Windows dasturidan foydalaning');lvSet('Ulanmoqda…','var(--warn)');const ws=new WebSocket(u);LV.ws=ws;
      ws.onopen=()=>lvSet('WebSocket ulandi, ma’lumot kutilmoqda…','var(--warn)');ws.onerror=()=>lvSet('WebSocket xatosi — manzilni tekshiring','var(--trip)');ws.onclose=()=>{if(LV.on)lvSet('WebSocket uzildi.','var(--trip)')};
      ws.onmessage=ev=>{try{const t=String(ev.data).trim();if(t.length>5e6)throw new Error('xabar juda katta');if(/^[\[{]/.test(t))lvPush(JSON.parse(t));else{const r=csvRows(t);if(isNaN(parseFloat(String(r[0][0]).replace(',','.')))){LV.rows=[r[0].map(x=>String(x).toLowerCase())];r.shift()}if(!LV.rows)LV.rows=[LVH.slice()];LV.rows.push(...r);lvApply(LV.rows,'WebSocket')}}catch(e){lvSet('Xabarni o‘qib bo‘lmadi: '+e.message,'var(--trip)')}}}
    LV.on=true;$('lvStop').disabled=false}catch(e){if(e&&e.name==='AbortError'){lvSet('Fayl tanlanmadi.');return}lvSet('Boshlab bo‘lmadi: '+e.message,'var(--trip)')}}
function lvDemo(){lvStop();LV.trained=false;LV.rows=null;LV.cnt=0;LV.src='demo';LV.demoK=0;let L=55,np=0;const iv=Math.max(1,+$('lvInt').value||5)*1000;
  const gen=()=>{const k=LV.demoK++;if(k%180===60)np=1;if(k%180===150)np=0;L+=(150/24/60*0.5*100/2500)*6-np*0.35+(Math.random()-.5)*.08;L=Math.max(3,Math.min(97,L));const s1=L+(Math.random()-.5)*.3,s2=L+(Math.random()-.5)*.3;
    return {sath:+L.toFixed(2),sis1:+s1.toFixed(2),sis2:+s2.toFixed(2),bosim:+(52+(Math.random()-.5)*.6).toFixed(2),nasos:np,kirish:150}};
  const first=[];for(let i=0;i<80;i++)first.push(gen());lvPush(first);LV.on=true;$('lvStop').disabled=false;
  LV.timer=setInterval(()=>lvPush(gen()),iv)}
$('lvSrc').onchange=()=>{$('lvUrlBox').hidden=$('lvSrc').value==='file';$('lvUrl').placeholder=$('lvSrc').value==='ws'?'ws://192.168.1.10:1880/ws/tank':'https://docs.google.com/spreadsheets/…/pub?output=csv'};
$('lvStart').onclick=lvStart;$('lvStop').onclick=lvStop;$('lvDemo').onclick=lvDemo;

$('sample').onclick=()=>{const run=runPlant2('f4',0,rngMake(9),{...P,dt:DT,noise:1,sev:0});const o=run.tanks[0];const rows=[['sath','sis1','sis2','bosim','nasos','kirish']];
  for(let k=0;k<o.Ld.length;k++)rows.push([+o.Ld[k].toFixed(3),+o.S1[k].toFixed(3),+o.S2[k].toFixed(3),+o.P[k].toFixed(2),o.NP[k],+o.QIN[k].toFixed(1)]);
  download('namuna_ombor.xlsx',buildXlsx([{name:'Ma’lumot',rows}]),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')};
// ---------- Excel eksport ----------
$('xExp').onclick=()=>{
  if(!cur)return;const {run,idxs,e}=cur;const tg=TG(),T=run.tanks[0].Ld.length,dt=P.dt,nv=(v,n)=>isFinite(v)?+v.toFixed(n):'';
  const hdr=['t, min'];run.tanks.forEach((o,i)=>{const n=tg.tk[i];hdr.push(n+' sath DCS',n+' SIS1',n+' SIS2',n+' bosim',n+' nasoslar',n+' kirish klapani',n+' chiqish klapani',n+' kirish oqimi',n+' R',n+' x1',n+' x2',n+' x3',n+' x4')});
  const rows=[hdr];for(let k=0;k<T;k++){const r=[nv(k*dt,2)];run.tanks.forEach((o,i)=>{const id=idxs[i];r.push(nv(o.Ld[k],3),nv(o.S1[k],3),nv(o.S2[k],3),nv(o.P[k],2),o.NP[k],o.VIN[k],o.VOUT[k],nv(o.QIN[k],1),nv(id.R[k],4),...[0,1,2,3].map(j=>nv(id.x[j][k],4)))});rows.push(r)}
  const sh=[{name:'Review',rows:cur.reviewRows||[['—']]},{name:'Vaqt qatori',rows},{name:'Parametrlar',rows:[['Parametr','Qiymat'],['Rezervuar hajmi, m3',P.V],['Ishlab chiqarish, m3/sutka',P.Qprod],['Nasos unumi, m3/soat',P.Qpump],['Low alarm',P.LAL],['LALL',P.LALL],['High alarm',P.LAH],['LAHH',P.LAHH],['PAL alarm, kPag',P.PAL],['PALL alarm, kPag',P.PALL],['PVSV vakuum, kPag',P.PV],['Minimal oqim, m3/soat',P.Qr],['Ovoz berish',P.vote],['Indeks ufqi, min',P.Th],['Chegara R',P.RTH],['w1',+P.w[0].toFixed(3)],['w2',+P.w[1].toFixed(3)],['w3',+P.w[2].toFixed(3)],['w4',+P.w[3].toFixed(3)]]}];
  if(lastBatch){const br=[[lastBatch.title],[],...lastBatch.rows];if(lastBatch.per)br.push([],...lastBatch.per);if(lastBatch.dx)br.push([],['AI tashxisi aniqligi',lastBatch.dx[0]+' / '+lastBatch.dx[1]]);sh.push({name:'Ommaviy sinov',rows:br})}
  download('ombor_AI_review.xlsx',buildXlsx(sh),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')};

function tickClock(){const d=new Date();const z=n=>String(n).padStart(2,'0');$('clock').textContent=d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes())+':'+z(d.getSeconds())}
setInterval(tickClock,1000);tickClock();
(()=>{let t=null;try{t=localStorage.getItem('qtheme')}catch(e){}if(t===null&&window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)t='light';if(t==='light')document.documentElement.dataset.theme='light'})();
$('theme').onclick=()=>{const r=document.documentElement;r.dataset.theme=r.dataset.theme==='light'?'':'light';try{localStorage.setItem('qtheme',r.dataset.theme==='light'?'light':'dark')}catch(e){}KA.ok=false;if(cur)render()};
$('refresh').onclick=()=>$('run').click();


// ---------- bo'limlar (view) ----------
const VIEWS={overview:'Umumiy ko‘rinish',mimic:'Mnemosxema','3d':'3D ko‘rinish',sis:'SIS blokirovka',trends:'Trendlar',ai:'AI xabarlari va indeks',review:'Hodisa tahlili (Review)',journal:'Hodisalar jurnali',batch:'Ommaviy sinov',data:'O‘z ma’lumotingiz',math:'Matematik model',settings:'Sozlamalar'};
const LIVE=['overview','mimic','3d','sis','trends','ai','review','journal'];
function moveTo(node,view,slot){const pl=document.querySelector(`#v-${view} [data-place="${slot}"]`);if(pl&&node.parentNode!==pl)pl.appendChild(node)}
function showView(v){if(!Object.prototype.hasOwnProperty.call(VIEWS,v))v='overview';
  document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));
  document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===v;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');if(on&&b.classList.contains('mn')&&b.scrollIntoView)try{b.scrollIntoView({inline:'center',block:'nearest'})}catch(e){}});
  $('crumb').textContent=window.tr?tr(VIEWS[v]):VIEWS[v];$('crumb').dataset.v=v;$('ctrl').style.display=LIVE.includes(v)?'':'none';
  if(v==='overview'||v==='mimic')moveTo($('mimic'),v,'mimic');
  if(v==='overview'||v==='ai'){moveTo($('kvwrap'),v,'kv');moveTo($('barswrap'),v,'bars')}
  if(history.replaceState)history.replaceState(null,'','#'+v);
  window.scrollTo({top:0});lastW=0;if(cur)render()}
$('ctrlT').onclick=()=>{const o=$('ctrl').classList.toggle('open');$('ctrlT').setAttribute('aria-expanded',o)};
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
showView((location.hash||'#overview').slice(1));

readP();readPlant();P.dt=DT;
(async()=>{await tick();try{await retrain(f=>{$('status').textContent='Model o‘qitilmoqda… '+Math.round(f*100)+' %'});$('status').textContent='Tayyor.';runSimNow(false)}catch(e){$('status').textContent='Xato: '+e.message}})();

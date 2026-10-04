// ===== Hodisalar jurnali: DCS / SIS / AI voqealari vaqt tartibida, operator tasdiqlashi (ACK), CSV eksport =====
// Voqealar manbasi — Review bo'limidagi buildEvents() (bitta haqiqat manbai).
(function(){
const LV={t:['Kritik','var(--trip)'],w:['Ogohlantirish','var(--warn)'],d:['Diagnostika','var(--diag)'],i:['Ma’lumot','var(--gray)']};
const PRI={'SIS':'t','Mexanik himoya':'t','DCS alarm':'w','SIS alarm':'w','AI indeksi':'w','AI diagnostika':'d'};   // qolgan manbalar (Holat, Operator, Haqiqiy sabab*) — ma'lumot
let mem=new Set(),jSig='';
const store=()=>{try{return JSON.parse(localStorage.getItem('qj_ack_rez')||'[]')}catch(e){return null}};
const saveAck=()=>{try{localStorage.setItem('qj_ack_rez',JSON.stringify([...mem].slice(-2000)))}catch(e){}};
const tt=s=>window.tr?tr(s):s;
function scope(){return (mode==='csv'?'csv:'+(window.__csvName||''):$('kind').value+'#'+$('ftank').value+'#'+$('seed').value)+'|'+$('tags').value+'|'+P.vote+'|'+(+P.sev||0)+'|'+(+P.noise||1)}
function events(k){
  if(typeof cur==='undefined'||!cur)return [];
  const sc=scope(),out=[];
  for(const e of buildEvents()){if(e.k>k)continue;const pri=PRI[e.src]||'i';
    const id=sc+'|'+e.k+'|'+e.src+'|'+e.txt.slice(0,40);out.push({k:e.k,pri,src:e.src,txt:e.txt,id,ack:mem.has(id)})}
  out.sort((x,y)=>x.k-y.k||'twdi'.indexOf(x.pri)-'twdi'.indexOf(y.pri));return out;
}
function badge(list){const n=list.filter(e=>!e.ack&&(e.pri==='t'||e.pri==='w')).length;document.querySelectorAll('.bdg').forEach(b=>{b.textContent=n;b.classList.toggle('on',n>0)});return n}
function draw(list){
  const un=list.filter(e=>!e.ack&&e.pri!=='i').length;
  $('jInfo').textContent=list.length?(tt('Voqealar')+': '+list.length+' · '+tt('tasdiqlanmagan')+': '+un):tt('Hozircha voqea yo‘q.');
  $('jTab').className='jt';
  $('jTab').innerHTML='<caption class="sr">'+tt('Hodisalar jurnali')+'</caption><tr><th scope="col" class="pr">'+tt('Vaqt, min')+'</th><th scope="col">'+tt('Daraja')+'</th><th scope="col">'+tt('Manba')+'</th><th scope="col">'+tt('Voqea')+'</th><th scope="col" class="pr">'+tt('Holat')+'</th></tr>'+
   list.map((e,i)=>`<tr class="${e.ack?'ak':(e.pri==='t'?'un':'')}"><td class="pr">${fmt(e.k*P.dt,1)}</td><td><span class="lv" style="background:${LV[e.pri][1]}">${tt(LV[e.pri][0])}</span></td><td>${esc(e.src)}</td><td>${esc(e.txt)}</td><td class="pr">${e.pri==='i'?'—':e.ack?'✓ '+tt('Tasdiqlandi'):`<button class="sec" data-i="${i}">${tt('Tasdiqlash')}</button>`}</td></tr>`).join('');
  $('jTab').querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>{mem.add(list[+b.dataset.i].id);saveAck();refresh(true)});
}
function refresh(force){
  if(typeof cur==='undefined'||!cur)return;const k=timeK(),list=events(k);badge(list);
  if(!$('v-journal').classList.contains('on'))return;
  const sig=list.map(e=>e.id+e.ack).join('~')+(window.LANG||'');if(!force&&sig===jSig)return;jSig=sig;draw(list);
}
$('jAck').onclick=()=>{events(timeK()).forEach(e=>mem.add(e.id));saveAck();refresh(true)};
$('jClr').onclick=()=>{const sc=scope();[...mem].forEach(x=>{if(x.startsWith(sc))mem.delete(x)});saveAck();refresh(true)};
$('jCsv').onclick=()=>{const L=events(timeK()),q=s=>'"'+String(s).replace(/"/g,'""')+'"';
  const csv='﻿'+['Vaqt_min;Daraja;Manba;Voqea;Tasdiqlangan'].concat(L.map(e=>[fmt(e.k*P.dt,1),LV[e.pri][0],q(e.src),q(e.txt),e.ack?'ha':'yo‘q'].join(';'))).join('\n');
  download('hodisalar_jurnali.csv',new TextEncoder().encode(csv),'text/csv')};
{const a=store();mem=new Set(a||[])}
const _r=render;render=function(){_r.apply(this,arguments);try{refresh(false)}catch(e){console.error(e)}};
window.__journal={refresh:()=>refresh(true),events};
if(typeof cur!=='undefined'&&cur)refresh(true);
})();

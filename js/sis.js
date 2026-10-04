// ===== SIS blokirovka: P&ID izohlari (11, 12) bo'yicha sabab–oqibat matritsasi va asboblar ro'yxati =====
// Holat tanlangan vaqt lahzasi (timeK) uchun simulyatsiya qatoridan hisoblanadi. Teglar TG() orqali — anonim yoki haqiqiy.
(function(){
const tt=s=>window.tr?tr(s):s;
const chip=(txt,on,cls)=>`<span class="chip ${on?(cls||'bad'):'ok'}">${esc(txt)}</span>`;
function ch(o,k,hi){   // ikki mustaqil kanal: faol (true), oddiy (false); signal yo'q — fail-safe: faol
  const f=hi?v=>v>=P.LAHH:v=>v<=P.LALL;
  if(!o.sisOK)return [false,false];   // SIS kanallari yo'q (masalan CSV): kanal chiplari faol emas; qaror DCS sathiga qarab
  return [o.S1[k],o.S2[k]].map(v=>isNaN(v)||f(v));
}
function tankCard(i,k){
  const tg=TG(),o=cur.run.tanks[i],sp=tg.sep,nm=tg.tk[i],pa=cur.e.a.per[i];
  const hh=ch(o,k,true),ll=ch(o,k,false),vote=P.vote==='2oo2'?'2oo2 (AND)':'1oo2 (OR)';
  const hhA=o.sisOK?(P.vote==='2oo2'?hh[0]&&hh[1]:hh[0]||hh[1]):o.Ld[k]>=P.LAHH;
  const llA=o.sisOK?(P.vote==='2oo2'?ll[0]&&ll[1]:ll[0]||ll[1]):o.Ld[k]<=P.LALL;
  const pA=o.pOK&&isFinite(o.P[k])&&o.P[k]<=P.PV+0.3;
  const ls=['LS'+sp+tg.S1[i],'LS'+sp+tg.S2[i]],closed=o.VIN[k]===0,stopped=o.NP[k]===0;
  const trip=pa.trip>=0?`${tt('SIS trip')}: ${pa.type} — t = ${fmt(pa.trip*P.dt,1)} min`:tt('SIS trip yo‘q');
  const rows=[
   [ls.map((t,j)=>chip(t+' HH',hh[j])).join(' '),vote,`${tg.XVin[i]} ${tt('kirish klapani yopiladi')} (FC, TSO)`,chip(closed?tt('yopiq'):tt('ochiq'),closed&&hhA,'trip'),hhA],
   [ls.map((t,j)=>chip(t+' LL',ll[j])).join(' '),vote,`${tg.P1} ${tt('va')} ${tg.P2} ${tt('nasoslari to‘xtaydi')}`,chip(stopped?tt('to‘xtagan'):tt('ishlayapti'),stopped&&llA,'trip'),llA],
   [chip(`${tg.PI[i]} ≤ ${fmt(P.PV+0.3,1)} kPag`,pA),tt('PVSV — mexanik himoya'),`${tg.PVSV[i]} ${tt('havo kiritadi (SIS emas)')}`,chip(pA?tt('ochilishi kerak'):tt('yopiq'),pA,'warn'),pA]];
  return `<h2 class="sh">${esc(nm)} <small style="font-weight:400;color:var(--mut)">· ${esc(trip)}</small></h2>
  <div class="tw" tabindex="0"><table class="sisT"><thead><tr><th>${tt('Sabab (kirish)')}</th><th>${tt('Mantiq')}</th><th>${tt('Oqibat (chiqish)')}</th><th>${tt('Hozirgi holat')}</th></tr></thead><tbody>`+
  rows.map(r=>`<tr${r[4]?' class="act"':''}><td>${r[0]}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${r[3]}</td></tr>`).join('')+`</tbody></table></div>`;
}
function inst(){
  const tg=TG(),sp=tg.sep,L=[
   ['LIA / LI',tg.LI.join(', '),tt('Sath o‘lchagich (mikroto‘lqinli), DCS: H / L alarm')],
   ['LS ×2 (HH / LL)',tg.S1.map((s,i)=>`LS${sp}${s} / LS${sp}${tg.S2[i]}`).join(', '),tt('Mustaqil sath kalitlari (mikroto‘lqinli) — SIS kirishi, 1oo2')],
   ['PIA',tg.PI.join(', '),tt('Bosim: H / L alarm (DCS)')],
   ['PVSV',tg.PVSV.join(', '),tt('Bosim/vakuum himoya klapani: 54 kPag / −1,8 kPag; avariya lyuki 60 kPag')],
   ['PCV',tg.PCV.join(', '),tt('Azot yostig‘i (split-range), minimal oqim shaybasi')+' '+tg.FO],
   ['XV (kirish)',tg.XVin.join(', '),tt('FC, TSO — HH da yopiladi')],
   ['XV (chiqish)',tg.XVout.join(', '),tt('FC, TSO — chizmada blokirovka bilan bog‘lanmagan')],
   ['GA / GA-S',`${tg.P1}, ${tg.P2}`,tt('Mahsulot nasoslari, qo‘sh mexanik zichlagich; ishlash holati')+` ${tg.XL1}, ${tg.XL2}`],
   ['PSV',tg.PSV,tt('Nasos chiqishidagi saqlovchi klapan: 1800 kPag')],
   ['HS',tg.RST,tt('Blokirovkani qayta tiklash (RESET) — sabab yo‘qolgandan keyin')]];
  return `<h2 class="sh">${tt('Chizmadagi asboblar')}</h2><div class="tw" tabindex="0"><table class="sisT"><thead><tr><th>${tt('Turi')}</th><th>${tt('Teg')}</th><th>${tt('Vazifasi')}</th></tr></thead><tbody>`+
   L.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')+`</tbody></table></div>`;
}
function refresh(){
  const box=document.getElementById('sisBox');if(!box||!cur)return;
  if(!document.getElementById('v-sis').classList.contains('on'))return;
  const k=timeK();
  box.innerHTML=`<p class="note" style="margin-top:0">t = ${fmt(k*P.dt,1)} min · ${tt('ovoz berish')}: <b>${P.vote==='2oo2'?'2oo2':'1oo2'}</b> · ${tt('signal yo‘qolsa — fail-safe: kanal faol deb olinadi')}</p>`+
   cur.run.tanks.map((_,i)=>tankCard(i,k)).join('')+inst();
}
const _r=render;render=function(){_r.apply(this,arguments);try{refresh()}catch(e){console.error(e)}};
window.__sis={refresh};
if(typeof cur!=='undefined'&&cur)refresh();
})();

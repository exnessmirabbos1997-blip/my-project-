(function(){
const $=id=>document.getElementById(id);let rp=null,score={ok:0,n:0},aud=null,sirenT=null,snd=false,lastWarn=false,lastTrip=false,lastK=-1;
function toast(m){let t=$('k3dToast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',3800)}
const bar=$('k3dBar');function btn(id,t,title){const b=document.createElement('button');b.id=id;b.textContent=t;if(title)b.title=title;bar.insertBefore(b,$('k3dQ'));return b}
const bR=btn('k3dRp','⏪ Takror','Hodisani sekin tezlikda qayta ko‘rsatish'),bQ=btn('k3dQz','🎓 Mashq','Operator mashqi'),bS=btn('k3dSn','🔇 Ovoz','Signalizatsiya ovozi'),bP=btn('k3dPdf','📄 PDF hisobot','Hodisa hisoboti');
function stopRp(){if(rp){clearInterval(rp);rp=null}$('k3dRep').style.display='none';bR.classList.remove('on')}
function pickTank(i){const sel=$('ctank');if(sel)sel.value=String(i)}
bR.onclick=()=>{if(rp){stopRp();return}if(!cur)return;const a=cur.e.a,ti=a.per.findIndex(p=>p.trip>=0);if(ti<0){toast('Bu variantda SIS trip yo‘q — avval nosozlik variantini tanlang va "Ishga tushirish" ni bosing.');return}
 clearInterval(timer);timer=null;const tr=a.per[ti].trip,end=tr+Math.round(25/P.dt);hover=-1;prog=Math.max(0,tr-Math.round(70/P.dt));pickTank(ti);KScene.setView(ti?'tankB':'tankA');render();bR.classList.add('on');$('k3dRep').style.display='block';
 rp=setInterval(()=>{prog++;const m=prog*P.dt;$('k3dRep').textContent='TAKROR · '+(prog<tr?'trip ga '+Math.max(0,(tr-prog)*P.dt).toFixed(0)+' min qoldi':'SIS TRIP ishladi')+' · t = '+m.toFixed(0)+' min';if(prog>=end){stopRp();return}render()},70)};
// compare panel
function cmp(){const el=$('k3dCmp');if(!cur||!$('v-3d').classList.contains('on')){return}const k=timeK();if(k===lastK&&el.dataset.s===String(ct()))return;lastK=k;el.dataset.s=String(ct());
 const i=ct(),pa=cur.e.a.per[i],dt=P.dt,f=v=>v>=0?(v*dt).toFixed(0)+' min':'—',on=v=>v>=0&&k>=v;
 const rows=[['AI ogohlantirish (R ≥ chegara)',pa.warn,'#f5b041'],['Oddiy signalizatsiya (LAL/LAH)',pa.alarm,'#8797ab'],['AI diagnostika',pa.diag,'#a58be0'],['SIS trip (himoya)',pa.trip,'#ef5350']];
 let lead='';if(pa.warn>=0&&pa.trip>=0)lead='AI SIS dan <b>'+((pa.trip-pa.warn)*dt).toFixed(0)+' min</b> oldin ogohlantirdi';if(pa.warn>=0&&pa.alarm>=0&&pa.alarm>pa.warn)lead+=(lead?'<br>':'')+'Oddiy signalizatsiyadan <b>'+((pa.alarm-pa.warn)*dt).toFixed(0)+' min</b> oldin';else if(pa.warn<0&&pa.trip>=0)lead='AI ogohlantirish bermadi';
 el.innerHTML='<b>AI va oddiy signalizatsiya — '+TG().tk[i]+'</b>'+rows.map(r=>'<div><span style="color:'+(on(r[1])?r[2]:'#5f7185')+'">'+(on(r[1])?'●':'○')+' '+r[0]+'</span><i>'+f(r[1])+'</i></div>').join('')+(lead?'<p>'+lead+'</p>':'')}
// sound
function ac(){if(!aud){try{aud=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}return aud}
function beep(fr,d,v=.08){const a=ac();if(!a||!snd)return;const o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=fr;g.gain.value=v;o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+d)}
function siren(on){clearInterval(sirenT);sirenT=null;if(on&&snd){let h=0;sirenT=setInterval(()=>{beep(h++%2?620:900,.16,.07)},200)}}
bS.onclick=()=>{snd=!snd;bS.textContent=snd?'🔊 Ovoz':'🔇 Ovoz';bS.classList.toggle('on',snd);if(snd){ac()&&aud.resume();beep(660,.15)}else siren(false);lastWarn=lastTrip=false}
function soundHook(){if(!cur||!snd||!$('v-3d').classList.contains('on'))return;const k=timeK(),a=cur.e.a,w=a.per.some(p=>p.warn>=0&&k>=p.warn)&&!a.per.some(p=>p.trip>=0&&k>=p.trip),t=a.per.some(p=>p.trip>=0&&k>=p.trip);
 if(t&&!lastTrip)siren(true);if(!t&&lastTrip)siren(false);if(w&&!lastWarn){beep(880,.12);setTimeout(()=>beep(880,.12),220)}lastWarn=w;lastTrip=t}
// quiz
const OPT=['Quyishni to‘xtatish (nasosni o‘chirish)','Kirishni boshqa rezervuarga o‘tkazish','Gaz yostig‘i (PCV) va gaz ta’minotini tekshirish','Hech narsa qilmaslik, kutish'];
function quiz(){if(!cur)return;stopRp();const cand=[];cur.run.tanks.forEach((o,i)=>{const pa=cur.e.a.per[i],id=cur.idxs[i];for(let k=0;k<id.R.length;k+=3)if(id.R[k]>=P.RTH&&!id.bad[k]&&(pa.trip<0||k<pa.trip))cand.push([i,k])});
 if(!cand.length){toast('Bu variantda xavfli holat yo‘q — nosozlik variantini tanlang va "Ishga tushirish" ni bosing.');return}
 clearInterval(timer);timer=null;const [i,k]=cand[Math.floor(Math.random()*cand.length)];hover=-1;prog=k;pickTank(i);KScene.setView(i?'tankB':'tankA');render();
 const j=Math.min(2,Math.max(0,cur.idxs[i].sif[k]|0)),d=cur.idxs[i].R[k];const q=$('k3dQuiz');
 q.innerHTML='<h3>Operator mashqi</h3><p><b>'+TG().tk[i]+'</b>: AI xavf indeksi R = '+d.toFixed(2)+' (chegara '+P.RTH.toFixed(2)+'dan yuqori). Sath '+cur.run.tanks[i].Ld[k].toFixed(0)+' %. Qanday harakat qilasiz?</p>'+OPT.map((t,n)=>'<button data-n="'+n+'">'+t+'</button>').join('')+'<div id="qfb"></div>';q.style.display='block';
 q.querySelectorAll('button[data-n]').forEach(b=>b.onclick=()=>{const n=+b.dataset.n;score.n++;const ok=n===j;if(ok)score.ok++;q.querySelectorAll('button[data-n]').forEach(x=>{x.disabled=true;if(+x.dataset.n===j)x.style.background='#14594f'});if(!ok)b.style.background='#7a2323';
  let m='';try{const nm=TG().tk[i];const r=aiMsgs(k).find(x=>String(x[1]).startsWith(nm));if(r)m=String(r[1])}catch(e){}
  $('qfb').innerHTML='<p style="color:'+(ok?'#22c55e':'#ef5350')+'"><b>'+(ok?'To‘g‘ri!':'Noto‘g‘ri.')+'</b> Tizim tavsiyasi: '+OPT[j]+'.</p><p style="color:#8ea0b4">'+m+'</p><button id="qnext">Keyingi savol</button> <button id="qclose">Yopish</button><small>Hisob: '+score.ok+' / '+score.n+'</small>';
  $('qnext').onclick=quiz;$('qclose').onclick=()=>q.style.display='none'})}
bQ.onclick=quiz;
// report
function chart(o,pa,R,lines){const c=document.createElement('canvas');c.width=900;c.height=280;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,900,280);const L=40,Rr=880,T=14,B=250,n=o.length;const X=k=>L+(Rr-L)*k/(n-1);
 x.strokeStyle='#ccd';x.strokeRect(L,T,Rr-L,B-T);x.font='12px Arial';x.fillStyle='#333';lines.forEach(l=>{const y=B-(B-T)*(l.v-l.min)/(l.max-l.min);x.strokeStyle=l.c;x.setLineDash([6,4]);x.beginPath();x.moveTo(L,y);x.lineTo(Rr,y);x.stroke();x.setLineDash([]);x.fillStyle=l.c;x.fillText(l.t,Rr-70,y-3)});
 const mn=lines[0].min,mx=lines[0].max;x.strokeStyle='#0b6e6e';x.lineWidth=1.8;x.beginPath();let f=1;const stp=Math.max(1,Math.floor(n/450));for(let k=0;k<n;k+=stp){const v=R[k];if(!isFinite(v))continue;const y=B-(B-T)*(v-mn)/(mx-mn);f?(x.moveTo(X(k),y),f=0):x.lineTo(X(k),y)}x.stroke();x.lineWidth=1;
 [[pa.warn,'#f5b041','AI'],[pa.alarm,'#7b8a96','Signalizatsiya'],[pa.trip,'#c0262d','TRIP']].forEach(m=>{if(m[0]<0)return;x.strokeStyle=m[1];x.setLineDash([3,3]);x.beginPath();x.moveTo(X(m[0]),T);x.lineTo(X(m[0]),B);x.stroke();x.setLineDash([]);x.fillStyle=m[1];x.fillText(m[2]+' '+(m[0]*P.dt).toFixed(0)+' min',Math.min(X(m[0])+3,Rr-110),T+12+(m[2]==='TRIP'?14:0))});
 x.fillStyle='#333';x.fillText('0',L,B+14);x.fillText((n*P.dt).toFixed(0)+' min',Rr-40,B+14);return c.toDataURL('image/png')}
bP.onclick=()=>{if(!cur){toast('Avval simulyatsiyani ishga tushiring.');return}
 const a=cur.e.a,L=cur.e.L||{},tk=TG().tk,kind=$('kind')?$('kind').selectedOptions[0].textContent:'',fm=v=>v==null||v<0?'—':v.toFixed(1)+' min';let snap='';try{if(KScene.ok())snap=KScene.snap()}catch(e){}
 let h='<html><head><meta charset="utf-8"><title>Hodisa hisoboti</title><style>body{font:13px Arial;margin:24px;color:#111}h1{font-size:20px}h2{font-size:15px;margin:18px 0 6px;border-bottom:1px solid #999}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 7px;text-align:left}img{max-width:100%}p.m{background:#f3f6f8;padding:6px 9px;border-left:3px solid #0b6e6e}@media print{@page{size:A4;margin:14mm}}</style></head><body>';
 h+='<h1>Yengil kondensat ombori — hodisa hisoboti</h1><p>Sana: '+new Date().toLocaleString('uz')+'<br>Holat: <b>'+kind+'</b><br>Yaratildi: AI asosida erta ogohlantirish va hodisa tahlili dasturi</p>';
 h+='<h2>Asosiy ko‘rsatkichlar</h2><table><tr><th>Ko‘rsatkich</th><th>Qiymat</th></tr><tr><td>AI ogohlantirish — SIS tripdan oldin</td><td>'+fm(L.warn)+'</td></tr><tr><td>Oddiy signalizatsiya — SIS tripdan oldin</td><td>'+fm(L.alarm)+'</td></tr><tr><td>AI diagnostika</td><td>'+fm(L.diag)+'</td></tr><tr><td>Birlashgan (AI+signal)</td><td>'+fm(L.comb)+'</td></tr><tr><td>AI chegarasi R</td><td>'+P.RTH.toFixed(2)+'</td></tr></table>';
 h+='<h2>Rezervuarlar bo‘yicha</h2><table><tr><th>Rezervuar</th><th>AI</th><th>Signalizatsiya</th><th>Diagnostika</th><th>SIS trip</th><th>Turi</th></tr>'+a.per.map((p,i)=>'<tr><td>'+tk[i]+'</td><td>'+fm(p.warn>=0?p.warn*P.dt:-1)+'</td><td>'+fm(p.alarm>=0?p.alarm*P.dt:-1)+'</td><td>'+fm(p.diag>=0?p.diag*P.dt:-1)+'</td><td>'+fm(p.trip>=0?p.trip*P.dt:-1)+'</td><td>'+(p.type||'—')+'</td></tr>').join('')+'</table>';
 cur.run.tanks.forEach((o,i)=>{const pa=a.per[i];h+='<h2>'+tk[i]+' — sath, %</h2><img src="'+chart(o.Ld,pa,o.Ld,[{v:0,min:0,max:100,c:'#999',t:''},{v:P.LAL,min:0,max:100,c:'#888',t:'LAL'},{v:P.LAH,min:0,max:100,c:'#888',t:'LAH'},{v:P.LALL,min:0,max:100,c:'#c0262d',t:'LALL'},{v:P.LAHH,min:0,max:100,c:'#c0262d',t:'LAHH'}])+'">';
  h+='<h2>'+tk[i]+' — AI xavf indeksi R</h2><img src="'+chart(o.Ld,pa,cur.idxs[i].R,[{v:0,min:0,max:1,c:'#999',t:''},{v:P.RTH,min:0,max:1,c:'#b7791f',t:'R chegara'}])+'">'});
 const k=a.trip>=0?a.trip:cur.run.tanks[0].Ld.length-1;let ms='';try{ms=aiMsgs(k).map(x=>'<p class="m">'+String(x[1]).replace(/</g,'&lt;')+'</p>').join('')}catch(e){}
 h+='<h2>AI xabarlari (hodisa vaqtida)</h2>'+(ms||'<p>Xabar yo‘q.</p>');if(snap)h+='<h2>3D ko‘rinish (hozirgi holat)</h2><img src="'+snap+'">';h+='</body></html>';
 Report.open(h)};
const _r=render;render=function(){_r.apply(this,arguments);try{cmp();soundHook()}catch(e){console.error(e)}};
const _s=showView;showView=function(v){_s.apply(this,arguments);if(v!=='3d'){stopRp();siren(false);lastTrip=false}};
window.__k3d={report:()=>bP.onclick(),quiz,replay:()=>bR.onclick()};
})();

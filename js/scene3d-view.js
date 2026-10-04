(function(){
let inited=false,failed=false,wrap,tip;
function fail(m){failed=true;const f=document.getElementById('k3dFall');if(f){f.style.display='flex';f.style.flexDirection='column';if(m){let d=f.querySelector('small');if(!d){d=document.createElement('small');d.style.cssText='display:block;margin-top:10px;font-size:11px;color:#8ea0b4;word-break:break-all;max-width:90%';f.appendChild(d)}d.textContent='Sabab: '+m}}}
function init(){if(inited||failed)return;wrap=document.getElementById('k3dWrap');tip=document.getElementById('k3dTip');
 let ok=false,ee='';try{ok=window.KScene&&KScene.init(wrap,document.getElementById('k3dCv'),tip)}catch(e){console.error(e);ee=String(e&&e.message||e)}
 if(!ok){fail(ee||(window.KScene&&KScene.err)||'');return}inited=true;try{const qs=document.getElementById('k3dQ');if(qs&&KScene.getQ)qs.value=String(KScene.getQ())}catch(e){}
 document.querySelectorAll('#k3dBar [data-cam]').forEach(b=>b.addEventListener('click',()=>KScene.setView(b.dataset.cam)));
 document.getElementById('k3dAuto').addEventListener('click',e=>{e.currentTarget.classList.toggle('on');KScene.setAuto(e.currentTarget.classList.contains('on'))});
 document.getElementById('k3dQ').addEventListener('change',e=>KScene.setQuality(+e.target.value));
 new ResizeObserver(()=>KScene.resize()).observe(wrap);}
function stt(){if(!cur)return null;const k=timeK(),run=cur.run,a=cur.e.a,T0=run.tanks[0],T1=run.tanks[1]||null;
 const n0=T0.NP[k]||0,n1=T1?T1.NP[k]||0:0,np=n0+n1;
 const anyTrip=a.trip>=0&&k>=a.trip&&a.tripType!=='PVAC',pTrip=a.per.some(p=>p.trip>=0&&k>=p.trip&&p.type==='LALL');
 const q=run.QP?run.QP[k]:T0.QIN[k],zl=run.load!==undefined?run.load:0,f=x=>isFinite(x)?x:0;
 const tanks=run.tanks.map((o,i)=>{const pa=a.per[i];return {L:f(o.Ld[k]),P:f(o.P[k]),T:f(o.T[k]),R:f(cur.idxs[i].R[k]),bad:!!cur.idxs[i].bad[k],d3:!!cur.idxs[i].d3[k],d4:!!cur.idxs[i].d4[k],S1:f(o.S1[k]),S2:f(o.S2[k]),trip:pa.trip>=0&&k>=pa.trip,warn:pa.warn>=0&&k>=pa.warn}});
 let msg='';try{const m=aiMsgs(k);if(m&&m.length)msg=String(m[0][1]).replace(/\s+/g,' ')}catch(e){}
 return {tanks,q:f(q),np,anyTrip,pTrip,zl,rec:np>=1&&!pTrip,recA:np>=1&&!pTrip&&zl===0,recB:np>=1&&!pTrip&&zl===1,
  inA:T0.VIN[k]>0,inB:!!(T1&&T1.VIN[k]>0),outA:n0>0&&!pTrip,outB:n1>0&&!pTrip,p1:np>=1&&!pTrip,p2:np>=2&&!pTrip,vout:[T0.VOUT[k]>0,T1?T1.VOUT[k]>0:false],names:TG().tk,min:k*P.dt,msg,k,trend:cur.idxs.map(d=>d.R),sis:a.per.map(p=>({trip:p.trip>=0&&k>=p.trip,type:p.type}))}}
function push(){if(!inited||!document.getElementById('v-3d').classList.contains('on'))return;const s=stt();if(!s)return;KScene.update(s,{LALL:P.LALL,LAL:P.LAL,LAH:P.LAH,LAHH:P.LAHH,PV:P.PV,PH:54,RTH:P.RTH,vote:P.vote});
 const i=document.getElementById('k3dInfo');if(i)i.textContent=s.tanks.map((d,j)=>s.names[j]+': '+d.L.toFixed(0)+'% · R '+d.R.toFixed(2)).join('   |   ')+'   |   q = '+s.q.toFixed(0)+' m³/sut · nasos: '+s.np}
const _r=render;render=function(){_r.apply(this,arguments);push()};
const _s=showView;showView=function(v){_s.apply(this,arguments);const on=v==='3d';if(on){init();if(inited)KScene.setActive(true)}else if(inited)KScene.setActive(false);if(on)push()};
if((location.hash||'')==='#3d'){init();if(inited){KScene.setActive(true);push()}}
})();

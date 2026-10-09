// ===== Ikki rezervuarli yengil kondensat ombori: model + DCS/SIS + indeks + tashxis =====
const DT=0.5, NSTEP=1440;
function rngMake(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){let u=0,v=0;while(u===0)u=r();while(v===0)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
const clip=(x,a,b)=>Math.min(b,Math.max(a,x));
const KINDS={normal:'Normal ish (quyish o‘z vaqtida to‘xtatiladi)',f1:'Quyish to‘xtatilmadi (operator xatosi)',f2:'Nasos to‘xtagach sath kamaymoqda (sizish)',f3:'Toshib ketish: kirish oqimi keskin oshdi',f4:'DCS sath datchigi qotib qoldi',f5:'Gaz yostig‘i yo‘qoldi: vakuum xavfi',f6:'Datchiklar signali yo‘qoldi (NaN)',f7:'Uch yo‘lli klapan nosozligi: aylanma oqim boshqa rezervuarga'};
const FAULTS=['f1','f2','f3','f4','f5','f7'];
const CAUSE={none:'Nosozlik belgisi topilmadi',overrun:'Quyish o‘z vaqtida to‘xtatilmagan',leak:'Sizish yoki hisobga olinmagan chiqim',surge:'Kirish oqimining keskin oshishi',freeze:'DCS sath datchigining qotib qolishi',press:'Gaz yostig‘i bosimining yo‘qolishi',nan:'Datchiklar signalining yo‘qolishi (umumiy sabab)',recirc:'Aylanma (minimal oqim) liniyasi noto‘g‘ri rezervuarga yo‘nalgan'};
const TRUTH={normal:'none',f1:'overrun',f2:'leak',f3:'surge',f4:'freeze',f5:'press',f6:'nan',f7:'recirc'};
function plantDefaults(){return {V:500,Qprod:174,Qpump:80,Qr:20,LAL:20,LALL:10,LAH:85,LAHH:90,P0:51.9,PAL:30,PALL:15,PV:-1.8,T0:24,vote:'1oo2',Th:60,Tresp:10,w:[.20,.50,.15,.15],RTH:.45,noise:1,sev:0,dt:DT,D3:0.9,DK:5}}
function voteLow(a,b,v){if(isNaN(a))return b;if(isNaN(b))return a;return v==='2oo2'?Math.max(a,b):Math.min(a,b)}
function voteHigh(a,b,v){if(isNaN(a))return b;if(isNaN(b))return a;return v==='2oo2'?Math.min(a,b):Math.max(a,b)}
function sisVote(a,b,cond,v){const ca=isNaN(a)||cond(a),cb=isNaN(b)||cond(b);return v==='2oo2'?(ca&&cb):(ca||cb)}
function newTank(T){const A=()=>new Float64Array(T);return {L:A(),Ld:A(),S1:A(),S2:A(),P:A(),T:A(),NP:A(),QIN:A(),VIN:A(),VOUT:A(),pOK:true,sisOK:true}}
function runPlant2(kind,ft0,r,P){
  const T=NSTEP,dt=DT,nz=P.noise||1,V=P.V,Qp=P.Qpump,pct=dt*100/(V*60);
  const S=()=>P.sev>0?P.sev:r();
  const fT=ft0;                                   // nosozlik rezervuari (0=A,1=B)
  let recv,load,loading=true;
  if(kind==='normal'){recv=r()<0.5?0:1;load=1-recv;loading=r()<0.85}
  else if(kind==='f3'){recv=fT;load=1-fT;loading=r()<0.5}
  else if(kind==='f7'){recv=fT;load=1-fT;loading=true}
  else if(kind==='f5'||kind==='f6'){if(r()<0.5){load=fT;recv=1-fT}else{recv=fT;load=1-fT}}
  else{load=fT;recv=1-fT}
  const lv=[0,0];lv[recv]=kind==='f3'?72+r()*10:kind==='f7'?68+r()*12:30+r()*35;lv[load]=loading?55+r()*30:40+r()*30;
  let loadAt=loading?Math.floor(((kind==='normal'?30+r()*240:20+r()*120))/dt):-1;
  let np=1,u=0.7+0.6*r(),tgt=25+15*r();
  if(kind==='normal'){const npr=r()<0.3?2:1;np=P._np||npr}   // P._np — o'qitishda ikki nasosli rejim yetarli bo'lishi uchun
  if(kind==='f1')np=S()>0.5?2:1;
  if(loading)lv[load]=Math.max(lv[load],tgt+20+r()*15);
  let ft=-1;const leakQ=30+50*S(),leakDelay=Math.floor((10+50*r())/dt),surge=3+7*S(),tau=20+100*(1-S()),freezeLvl=tgt+5+10*r();
  let misAt=kind==='f7'?loadAt+Math.floor((10+50*r())/dt):-1;let ftPlan=-1;if(kind==='f3')ftPlan=Math.floor((20+r()*100)/dt);if(kind==='f5')ftPlan=Math.floor((30+r()*150)/dt);if(kind==='f6')ftPlan=Math.floor((60+r()*240)/dt);
  const bg=[];const ns=Math.floor(r()*3);for(let i=0;i<ns;i++)bg.push([Math.floor(r()*T),Math.floor((20+r()*40)/dt),1.5+r()]);
  const tk=[newTank(T),newTank(T)],b=[[gauss(r)*.4,gauss(r)*.4,gauss(r)*.4],[gauss(r)*.4,gauss(r)*.4,gauss(r)*.4]],ph=r()*1440;
  const vin=[0,0],vout=[0,0];vin[recv]=1;vout[load]=1;
  let ou=0,pumpOn=false,pumpT=[0,0],dip=[0,0],bf=[1,1],stopAt=-1,stoppedAt=-1,leakOn=false,frozen=NaN,dead=false;
  const trips=[],tripped=[{},{}],ev=[],NPT=new Float64Array(T),QP=new Float64Array(T);
  ev.push({k:0,src:'info',code:'start',recv,load,loading});
  for(let k=0;k<T;k++){
    const t=k*dt;
    ou+=(-ou/60)*dt+0.25*Math.sqrt(dt)*gauss(r);
    let q=P.Qprod/24*(1+0.08*ou);for(const [s,d,f] of bg)if(k>=s&&k<s+d)q*=f;
    if(kind==='f3'&&k>=ftPlan){q*=surge;if(ft<0){ft=k;ev.push({k,src:'truth',code:'surge',tank:fT,f:surge})}}
    if(loadAt>=0&&k===loadAt&&!pumpOn&&trips.length===0){pumpOn=true;ev.push({k,src:'op',code:'pstart',tank:load,np})}
    if(kind==='f2'&&stoppedAt>=0&&k===stoppedAt+leakDelay&&!leakOn){leakOn=true;ft=k;ev.push({k,src:'truth',code:'leak',tank:load,q:leakQ})}
    if(kind==='f5'&&k===ftPlan){ft=k;ev.push({k,src:'truth',code:'press',tank:fT,tau})}
    if(kind==='f6'&&k===ftPlan){ft=k;dead=true;ev.push({k,src:'truth',code:'nan',tank:fT})}
    if(kind==='f7'&&k===misAt&&pumpOn){ft=k;ev.push({k,src:'truth',code:'recirc',tank:recv})}
    const nIn=vin[0]+vin[1],nOut=vout[0]+vout[1];
    const qm=q*(1+gauss(r)*0.02);QP[k]=qm*24;
    const npEff=pumpOn&&nOut>0?np:0;NPT[k]=npEff;
    for(let i=0;i<2;i++){
      const sIn=nIn?vin[i]/nIn:0,sOut=nOut?vout[i]/nOut:0;
      const mis=kind==='f7'&&ft>=0&&npEff>0,qr=npEff>0?(P.Qr||0):0;
      const fo=npEff*u*Qp*sOut+(leakOn&&i===load?leakQ:0)+qr*sOut-(mis?(i===recv?qr:0):qr*sOut);
      lv[i]=clip(lv[i]+(q*sIn-fo)*pct,0,100);
      const o=tk[i];o.L[k]=lv[i];
      let dcs=lv[i]+b[i][0]+gauss(r)*0.15*nz;
      if(kind==='f4'&&i===load&&isNaN(frozen)&&pumpOn&&dcs<=freezeLvl){frozen=dcs;ft=k;ev.push({k,src:'truth',code:'freeze',tank:i,v:dcs})}
      if(kind==='f4'&&i===load&&!isNaN(frozen))dcs=frozen;
      const pOn=npEff*sOut>0;if(pOn){pumpT[i]+=dt;dip[i]=3*(1-Math.exp(-pumpT[i]/15))}else{pumpT[i]=0;dip[i]*=Math.exp(-dt/10)}
      if(kind==='f5'&&i===fT&&k>=ftPlan)bf[i]*=Math.exp(-dt*(1+(pOn?1:0))/tau);
      const pn=P.P0+1.2*Math.sin(2*Math.PI*(t+ph)/1440)-dip[i];
      let pr=Math.max(P.PV,P.PV+(pn-P.PV)*bf[i])+gauss(r)*0.3*nz,tm=P.T0+2*Math.sin(2*Math.PI*(t+ph)/1440)+gauss(r)*0.1;
      let s1=lv[i]+b[i][1]+gauss(r)*0.1*nz,s2=lv[i]+b[i][2]+gauss(r)*0.1*nz;
      if(dead&&i===fT){dcs=NaN;pr=NaN;tm=NaN;s1=NaN;s2=NaN}
      o.Ld[k]=dcs;o.S1[k]=s1;o.S2[k]=s2;o.P[k]=pr;o.T[k]=tm;o.NP[k]=npEff*sOut;o.QIN[k]=qm*sIn*24;o.VIN[k]=vin[i];o.VOUT[k]=vout[i];
    }
    // operator
    if(pumpOn&&stopAt<0){const ld=tk[load].Ld[k];
      if(kind==='f1'){if(ft<0&&ld<=tgt){ft=k;ev.push({k,src:'truth',code:'overrun',tank:load,v:tgt})}}
      else if(ld<=tgt)stopAt=k+Math.floor(r()*4/dt)}
    if(pumpOn&&stopAt>=0&&k>=stopAt){pumpOn=false;stoppedAt=k;ev.push({k,src:'op',code:'pstop',tank:load,v:tk[load].Ld[k]})}
    // SIS (fail-safe: yo‘qolgan signal = trip ovozi)
    for(let i=0;i<2;i++){const o=tk[i];
      const ll=sisVote(o.S1[k],o.S2[k],v=>v<=P.LALL,P.vote),hh=sisVote(o.S1[k],o.S2[k],v=>v>=P.LAHH,P.vote),pl=isFinite(o.P[k])&&o.P[k]<=P.PV+0.3;
      const hit=(type)=>{if(tripped[i][type])return;tripped[i][type]=1;trips.push({k,tank:i,type});
        const act=[];if(type==='LAHH'){if(vin[i]){vin[i]=0;act.push('in')}}else if(type==='LALL'){if(pumpOn){pumpOn=false;act.push('pump')}}
        ev.push({k,src:'sis',code:'trip',tank:i,type,act,np})};
      if(ll)hit('LALL');if(pl)hit('PVAC');if(hh)hit('LAHH');}
  }
  return {kind,fT,ft,recv,load,tanks:tk,NPT,QP,trips,ev,dt,np,u,tgt};
}
function sifTrip(o,P){
  const T=o.Ld.length;
  for(let k=0;k<T;k++){
    if(o.sisOK){if(sisVote(o.S1[k],o.S2[k],v=>v<=P.LALL,P.vote))return {k,type:'LALL'};if(sisVote(o.S1[k],o.S2[k],v=>v>=P.LAHH,P.vote))return {k,type:'LAHH'}}
    else{if(o.Ld[k]<=P.LALL)return {k,type:'LALL'};if(o.Ld[k]>=P.LAHH)return {k,type:'LAHH'}}
    if(o.pOK&&isFinite(o.P[k])&&o.P[k]<=P.PV+0.3)return {k,type:'PVAC'};
  }
  return {k:-1,type:''};
}
function feat2(d,P){
  const T=d.Ld.length,dt=P.dt||DT,w=Math.max(2,Math.round(5/dt)),V=P.V,Qp=P.Qpump;
  const Sm=new Float64Array(T);
  for(let k=0;k<T;k++){const a=d.S1[k],b=d.S2[k];Sm[k]=isNaN(a)&&isNaN(b)?d.Ld[k]:isNaN(a)?b:isNaN(b)?a:(a+b)/2}
  const ex=new Float64Array(T);for(let k=0;k<T;k++)ex[k]=((d.VIN?d.VIN[k]:1)*(d.QIN?d.QIN[k]/24:0)-(d.NP?d.NP[k]:0)*Qp)*100/(V*60);
  const avg=(a,i,j)=>{let s=0,n=0;for(let x=Math.max(0,i);x<=j;x++){if(!isNaN(a[x])){s+=a[x];n++}}return n?s/n:NaN};
  const slope=new Float64Array(T),res=new Float64Array(T),dP=new Float64Array(T),X=new Array(T);
  for(let k=0;k<T;k++){
    const a=Math.max(0,k-w),g=Math.min(2,Math.floor((k-a)/3)),span=Math.max(1,k-a-g)*dt;
    slope[k]=(avg(Sm,k-g,k)-avg(Sm,a,a+g))/span;dP[k]=(avg(d.P,k-g,k)-avg(d.P,a,a+g))/span;
    const e=avg(ex,a+1+Math.floor(g/2),k-Math.ceil(g/2));res[k]=slope[k]-(isNaN(e)?0:e);
    if(isNaN(slope[k]))slope[k]=0;if(isNaN(dP[k]))dP[k]=0;if(isNaN(res[k]))res[k]=0;
    const nz=P.noise||1,npk=d.NP?d.NP[k]:0,qp=Qp*100/(V*60),sg=Math.sqrt(Math.pow(0.03*nz,2)+Math.pow(0.15*npk*qp,2));
    X[k]=k<w?[0,0,npk]:[res[k]/sg,dP[k],npk];
  }
  const WL=Math.round(60/dt),zL=new Float64Array(T);let acc=0,np0=0;
  for(let k=0;k<T;k++){acc+=res[k];np0+=(d.NP?d.NP[k]:0)>0?1:0;if(k>=WL){acc-=res[k-WL];np0-=(d.NP?d.NP[k-WL]:0)>0?1:0}
    if(k>=WL+w&&np0===0)zL[k]=(acc/WL)/(0.03*(P.noise||1)/Math.sqrt(WL*dt/5))}
  return {Sm,slope,res,dP,X,zL};
}
function cfun(n){return n<=1?0:2*(Math.log(n-1)+0.5772156649)-2*(n-1)/n}
function buildTree(data,idx,depth,maxD,r){const n=idx.length;if(depth>=maxD||n<=1)return {size:n};const f=Math.floor(r()*data[0].length);let mn=Infinity,mx=-Infinity;for(const i of idx){const v=data[i][f];if(v<mn)mn=v;if(v>mx)mx=v}if(mn===mx)return {size:n};const sp=mn+r()*(mx-mn);const l=[],rr=[];for(const i of idx)(data[i][f]<sp?l:rr).push(i);return {f,sp,l:buildTree(data,l,depth+1,maxD,r),r:buildTree(data,rr,depth+1,maxD,r)}}
function pathLen(t,x,d){while(t.size===undefined){t=x[t.f]<t.sp?t.l:t.r;d++}return d+cfun(t.size)}
function ifScore(m,x){let s=0;for(const t of m.trees)s+=pathLen(t,x,0);return Math.pow(2,-(s/m.trees.length)/m.c)}
function trainIF(data,nTrees,sub,seed){const r=rngMake(seed);const trees=[];const maxD=Math.ceil(Math.log2(sub));const pool=Array.from({length:data.length},(_,i)=>i);for(let t=0;t<nTrees;t++){const m=Math.min(sub,pool.length);for(let i=0;i<m;i++){const j=i+Math.floor(r()*(pool.length-i));[pool[i],pool[j]]=[pool[j],pool[i]]}trees.push(buildTree(data,pool.slice(0,m),0,maxD,r))}   // tanlama takrorsiz
  const m={trees,c:cfun(sub)};const step=Math.max(1,Math.floor(data.length/6000));const sc=[];for(let i=0;i<data.length;i+=step)sc.push(ifScore(m,data[i]));sc.sort((a,b)=>a-b);   // chegara kalibrovkasi uchun ≤ 2000 nuqta yetarli
  m.smin=sc[Math.floor(sc.length*0.5)];m.smax=Math.max(sc[sc.length-1],m.smin+1e-6);return m}
// Sath balansi qoldig'ining (zL) normal ishdagi tarqoqligidan "sizish / aylanma oqim" chegarasini o'rganadi:
// normalda |zL| ≈ 0,6 dan oshmaydi, shuning uchun chegara = max(2,0; 3·kuzatilgan maksimum), lekin 6,8 (eski qat'iy qiymat) dan oshmaydi
function zThreshold(zArrs){let m=0;for(const a of zArrs)for(let k=0;k<a.length;k++){const v=Math.abs(a[k]);if(isFinite(v)&&v>m)m=v}return Math.min(6.8,Math.max(2.0,3*m))}
function* trainModel2Gen(P,seed){const r=rngMake(seed);let data=[];const zs=[];const w=Math.max(2,Math.round(5/(P.dt||DT)));
  for(let i=0;i<40;i++){const run=runPlant2('normal',0,r,{...P,_np:1+(i%2)});for(const o of run.tanks){const f=feat2(o,P);for(let q=w;q<f.X.length;q++)data.push(f.X[q]);zs.push(f.zL)}yield i/40}
  yield 1;const m=trainIF(data,100,256,seed+1);m.zT=zThreshold(zs);return m}
function trainModel2(P,seed){const g=trainModel2Gen(P,seed);let x;while(!(x=g.next()).done);return x.value}
const SIFN=['LALL','LAHH','PALL'];
function computeIndex2(d,model,P){
  const T=d.Ld.length,f=feat2(d,P),w=P.w,Th=P.Th,W0=Math.max(2,Math.round(5/(P.dt||DT)));
  const out={R:new Float64Array(T),x:[[],[],[],[]],sif:new Int8Array(T),ttt:new Float64Array(T),d3:new Uint8Array(T),d4:new Uint8Array(T),bad:new Uint8Array(T),mb:new Uint8Array(T),zL:new Float64Array(T),slope:f.slope,dP:f.dP,res:f.res,z:f.X.map(x=>x[0])};
  const zT=model.zT||6.8,zL=2*P.LAL-P.LALL,zH=2*P.LAH-P.LAHH,zP=P.PAL+0.5*(P.PAL-P.PV);
  for(let k=0;k<T;k++){
    const s1=d.S1[k],s2=d.S2[k],lo=voteLow(s1,s2,P.vote),hi=voteHigh(s1,s2,P.vote);
    const LsL=isNaN(lo)?d.Ld[k]:lo,LsH=isNaN(hi)?d.Ld[k]:hi,pk=d.P[k],v=f.slope[k],vp=f.dP[k],c=[];
    {const x1=isNaN(LsL)?0:clip((zL-LsL)/(zL-P.LALL),0,1);const tt=v<-0.005&&!isNaN(LsL)?Math.max(0,LsL-P.LALL)/(-v):Infinity;c.push([x1,clip(1-tt/Th,0,1),tt])}
    {const x1=isNaN(LsH)?0:clip((LsH-zH)/(P.LAHH-zH),0,1);const tt=v>0.005&&!isNaN(LsH)?Math.max(0,P.LAHH-LsH)/v:Infinity;c.push([x1,clip(1-tt/Th,0,1),tt])}
    {const x1=isNaN(pk)||!d.pOK?0:clip((zP-pk)/(zP-P.PV),0,1);const tt=vp<-0.005&&!isNaN(pk)&&d.pOK?Math.max(0,pk-P.PV)/(-vp):Infinity;c.push([x1,clip(1-tt/Th,0,1),tt])}
    let j=0,best=-1;for(let i=0;i<3;i++){const s=w[0]*c[i][0]+w[1]*c[i][1];if(s>best){best=s;j=i}}
    if(best<=0){let mt=Infinity;for(let i=0;i<3;i++)if(c[i][2]<mt){mt=c[i][2];j=i}}
    const warm=k<W0,dead=isNaN(d.Ld[k])&&isNaN(s1)&&isNaN(s2);
    const x3if=dead?0:clip((ifScore(model,f.X[k])-model.smin)/(model.smax-model.smin),0,1);
    const x3mb=dead||d.noPump?0:clip((Math.abs(f.X[k][0])-3)/2,0,1);
    const zp=Math.min(0,f.dP[k]+(f.X[k][2]>0?0.25:0))/(0.07*(P.noise||1));
    const x3pb=warm||dead||!d.pOK||d.noPump?0:clip((Math.abs(zp)-3)/2,0,1);
    const x3lb=dead||d.noPump?0:clip((Math.abs(f.zL[k])-(zT-1.8))/2,0,1);
    const x3=Math.max(x3if,x3mb,x3pb,x3lb);out.mb[k]=x3===x3if?0:(x3===x3mb||x3===x3lb?1:2);out.zL[k]=f.zL[k];out.zT=zT;
    const badD=isNaN(d.Ld[k]);let dd=0;const sm=isNaN(s1)?s2:isNaN(s2)?s1:(s1+s2)/2;
    if(!badD&&!isNaN(sm))dd=Math.abs(d.Ld[k]-sm);if(!isNaN(s1)&&!isNaN(s2))dd=Math.max(dd,Math.abs(s1-s2));
    const x4=badD?1:clip((dd-1.5)/4.5,0,1);
    out.x[0].push(c[j][0]);out.x[1].push(c[j][1]);out.x[2].push(x3);out.x[3].push(x4);
    out.sif[k]=j;out.ttt[k]=c[j][2];out.R[k]=clip(w[0]*c[j][0]+w[1]*c[j][1]+w[2]*x3+w[3]*x4,0,1);
    out.d3[k]=!warm&&(x3mb>=P.D3||x3pb>=P.D3||x3lb>=P.D3||x3if>=0.98)?1:0;out.d4[k]=!warm&&(x4>=0.6||badD)?1:0;out.bad[k]=badD?1:0;
  }
  return out;
}
function firstRun(cond,K,T,from){let c=0;for(let k=Math.max(0,from||0);k<T;k++){c=cond(k)?c+1:0;if(c>=K)return k-K+1}return -1}
function sisPre(o,P,k){if(!o.sisOK||P.vote!=='2oo2')return false;const a=o.S1[k],b=o.S2[k];return isNaN(a)||isNaN(b)||Math.min(a,b)<=P.LALL||Math.max(a,b)>=P.LAHH}
function alarmCond(o,P){return k=>isNaN(o.Ld[k])||o.Ld[k]<=P.LAL||o.Ld[k]>=P.LAH||(o.pOK&&(isNaN(o.P[k])||o.P[k]<=P.PAL))||sisPre(o,P,k)}
function analyseRun(run,idxs,P){
  const dt=P.dt||DT,T=run.tanks[0].Ld.length;
  const from=run.kind==='normal'||run.ft<0?0:Math.max(0,run.ft-Math.round(10/dt));
  const per=run.tanks.map((o,i)=>{const tr=sifTrip(o,P),id=idxs[i];
    return {trip:tr.k,type:tr.type,alarm:firstRun(alarmCond(o,P),3,T,from),warn:firstRun(k=>id.R[k]>=P.RTH,3,T,from),diag:firstRun(k=>id.d3[k]||id.d4[k],P.DK||5,T,from)}});
  const mn=key=>{let b=-1,bi=-1;per.forEach((p,i)=>{if(p[key]>=0&&(b<0||p[key]<b)){b=p[key];bi=i}});return [b,bi]};
  const [trip,tripTank]=mn('trip'),[alarm,alarmTank]=mn('alarm'),[warn,warnTank]=mn('warn'),[diag,diagTank]=mn('diag');
  const a={trip,tripTank,tripType:tripTank>=0?per[tripTank].type:'',alarm,alarmTank,warn,warnTank,diag,diagTank,per};
  const lead=x=>(trip>=0&&x>=0&&x<=trip)?(trip-x)*dt:null;
  const L={alarm:lead(alarm),warn:lead(warn),diag:lead(diag)};const c=[L.alarm,L.warn,L.diag].filter(x=>x!==null);L.comb=c.length?Math.max(...c):null;
  const fired={alarm:alarm>=0,warn:warn>=0,diag:diag>=0};fired.comb=fired.alarm||fired.warn||fired.diag;
  return {a,L,fired};
}
// ---- Sabab tashxisi (qoidalar + anomaliya belgilari) ----
function diagnose(run,idxs,P,e){
  const dt=P.dt||DT,T=run.tanks[0].Ld.length,found=[];
  run.tanks.forEach((o,i)=>{const id=idxs[i];
    let nanK=-1;for(let k=0;k<T;k++){if(isNaN(o.Ld[k])&&(!o.sisOK||(isNaN(o.S1[k])&&isNaN(o.S2[k])))){nanK=k;break}}
    if(nanK>=0){found.push({code:'nan',tank:i,k:nanK,ev:{}});return}
    // qotish: DCS tekis, SIS o'zgaradi, tafovut katta
    const W=Math.round(10/dt);let frK=-1;
    if(o.sisOK)for(let k=W;k<T;k++){let mn=Infinity,mx=-Infinity;for(let j=k-W;j<=k;j++){mn=Math.min(mn,o.Ld[j]);mx=Math.max(mx,o.Ld[j])}
      const sm=(o.S1[k]+o.S2[k])/2,sm0=(o.S1[k-W]+o.S2[k-W])/2;
      if(mx-mn<0.05&&Math.abs(sm-sm0)>0.5&&Math.abs(o.Ld[k]-sm)>3){frK=k-W;break}}
    if(frK>=0){found.push({code:'freeze',tank:i,k:frK,ev:{v:o.Ld[frK]}});return}
    const pc=k=>id.mb[k]===2&&id.d3[k],mc=k=>id.mb[k]===1&&id.d3[k]&&o.NP[k]===0&&id.z[k]<0;
    const pK=o.pOK?firstRun(pc,5,T,0):-1;if(pK>=0){found.push({code:'press',tank:i,k:pK,ev:{}});return}
    const oth=run.tanks[1-i];
    const rc=k=>oth&&id.zL[k]>id.zT&&o.NP[k]===0&&oth.NP[k]>0;const rK=firstRun(rc,10,T,0);
    if(rK>=0){found.push({code:'recirc',tank:i,k:rK,ev:{}});return}
    let lK=firstRun(mc,5,T,0);const lK2=firstRun(k=>id.zL[k]<-id.zT&&o.NP[k]===0,10,T,0);if(lK<0||(lK2>=0&&lK2<lK))lK=lK2;
    if(lK>=0){found.push({code:'leak',tank:i,k:lK,ev:{}});return}
    // kirish oqimi keskin oshishi
    const q0=[];for(let k=0;k<Math.min(T,Math.round(60/dt));k++)if(o.QIN[k]>0)q0.push(o.QIN[k]);q0.sort((a,b)=>a-b);const qm=P.Qprod>0?P.Qprod:(q0.length?q0[Math.floor(q0.length/2)]:0);
    let sK=-1;if(qm>0){const sc=k=>o.QIN[k]>2.2*qm&&id.slope[k]>0;sK=firstRun(sc,Math.round(10/dt),T,0);
      if(sK>=0){let up=false;for(let k=sK;k<T;k++){const v=voteHigh(o.S1[k],o.S2[k],P.vote);if((isNaN(v)?o.Ld[k]:v)>=P.LAH){up=true;break}}if(!up)sK=-1}}
    if(sK>=0){found.push({code:'surge',tank:i,k:sK,ev:{f:o.QIN[sK+2]/qm}});return}
    // bosim: PALL yoki bosim DCS alarm chegarasidan pastga tushgan bo'lsa
    if(o.pOK){let base=[];for(let k=0;k<Math.min(T,Math.round(60/dt));k++)if(!isNaN(o.P[k]))base.push(o.P[k]);base.sort((a,b)=>a-b);const pb=base.length?base[Math.floor(base.length/2)]:NaN;
      let pk2=-1;for(let k=0;k<T;k++){if(!isNaN(o.P[k])&&o.P[k]<=P.PAL&&o.P[k]<pb-8){pk2=k;break}}
      if(pk2>=0){let s=pk2;for(let k=pk2;k>0;k--){if(o.P[k]>=pb-2){s=k;break}}found.push({code:'press',tank:i,k:s,ev:{}});return}}
    // LAHH: kirish oqimi me'yordan yuqori bo'lsa
    if(qm>0){const tr=sifTrip(o,P);if(tr.k>=0&&tr.type==='LAHH'){let s=-1;for(let k=0;k<=tr.k;k++){if(o.QIN[k]>1.8*qm){s=k;break}}if(s>=0){found.push({code:'surge',tank:i,k:s,ev:{f:o.QIN[tr.k]/qm}});return}}}
    // quyish oshib ketishi: nasos ishlayotganda SIS sathi Low alarm'dan pastga tushdi
    let oK=-1;for(let k=0;k<T;k++){const v=voteLow(o.S1[k],o.S2[k],P.vote);if(o.NP[k]>0&&(isNaN(v)?o.Ld[k]:v)<=P.LAL){oK=k;break}}
    if(oK>=0)found.push({code:'overrun',tank:i,k:oK,ev:{}});
  });
  const pr=['nan','freeze','press','recirc','leak','surge','overrun'];
  found.sort((a,b)=>pr.indexOf(a.code)-pr.indexOf(b.code)||a.k-b.k);
  return found.length?found[0]:{code:'none',tank:e.a.tripTank>=0?e.a.tripTank:0,k:-1,ev:{}};
}

/* ===== Excel (.xlsx) o'qish va yozish — kutubxonasiz ===== */
const CRCT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function zipStore(files){
  const te=new TextEncoder(),parts=[],cen=[];let off=0;
  for(const f of files){
    const nm=te.encode(f.name),d=f.data,crc=crc32(d);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);lh.setUint16(10,0,true);lh.setUint16(12,33,true);
    lh.setUint32(14,crc,true);lh.setUint32(18,d.length,true);lh.setUint32(22,d.length,true);lh.setUint16(26,nm.length,true);lh.setUint16(28,0,true);
    parts.push(new Uint8Array(lh.buffer),nm,d);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);ch.setUint16(12,0,true);ch.setUint16(14,33,true);
    ch.setUint32(16,crc,true);ch.setUint32(20,d.length,true);ch.setUint32(24,d.length,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
    cen.push(new Uint8Array(ch.buffer),nm);
    off+=30+nm.length+d.length;
  }
  const cdSize=cen.reduce((a,b)=>a+b.length,0);
  const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
  const all=[...parts,...cen,new Uint8Array(e.buffer)];const out=new Uint8Array(off+cdSize+22);let p=0;for(const a of all){out.set(a,p);p+=a.length}return out;
}
const xesc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function colName(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
function buildXlsx(sheets){
  const te=new TextEncoder(),U=s=>te.encode(s);const H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const NS='xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const files=[];
  files.push({name:'[Content_Types].xml',data:U(H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>')});
  files.push({name:'_rels/.rels',data:U(H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')});
  files.push({name:'xl/workbook.xml',data:U(H+`<workbook ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`+sheets.map((s,i)=>`<sheet name="${xesc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>')});
  files.push({name:'xl/_rels/workbook.xml.rels',data:U(H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)});
  files.push({name:'xl/styles.xml',data:U(H+`<styleSheet ${NS}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`)});
  sheets.forEach((s,i)=>{
    const nc=Math.max(...s.rows.map(r=>r.length));
    let x=H+`<worksheet ${NS}><cols><col min="1" max="${nc}" width="18" customWidth="1"/></cols><sheetData>`;
    s.rows.forEach((r,ri)=>{x+=`<row r="${ri+1}">`;r.forEach((v,ci)=>{
      const ref=colName(ci)+(ri+1),st=ri===0?' s="1"':'';
      if(typeof v==='number'&&isFinite(v))x+=`<c r="${ref}"${st}><v>${v}</v></c>`;
      else if(v!==''&&v!=null)x+=`<c r="${ref}"${st} t="inlineStr"><is><t>${xesc(v)}</t></is></c>`;
    });x+='</row>'});
    x+='</sheetData></worksheet>';files.push({name:`xl/worksheets/sheet${i+1}.xml`,data:U(x)});
  });
  return zipStore(files);
}
async function inflateRaw(u8){
  if(typeof DecompressionStream==='undefined')throw new Error('Brauzeringiz .xlsx o‘qishni qo‘llamaydi. Faylni CSV qilib saqlab yuklang.');
  const ds=new DecompressionStream('deflate-raw');const w=ds.writable.getWriter();w.write(u8);w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
async function unzip(buf){
  const u=new Uint8Array(buf),dv=new DataView(buf);let e=-1;
  for(let i=u.length-22;i>=Math.max(0,u.length-65600);i--){if(dv.getUint32(i,true)===0x06054b50){e=i;break}}
  if(e<0)throw new Error('Bu .xlsx fayl emas (yoki buzilgan).');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const td=new TextDecoder(),out={};
  for(let i=0;i<n;i++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const meth=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
    const name=td.decode(u.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;
    if(!/^xl\/(worksheets\/sheet\d+\.xml|sharedStrings\.xml|workbook\.xml)$/.test(name))continue;
    const ln=dv.getUint16(lo+26,true),lx=dv.getUint16(lo+28,true),st=lo+30+ln+lx,raw=u.subarray(st,st+cs);
    out[name]=td.decode(meth===0?raw:await inflateRaw(raw));
  }
  return out;
}
async function readXlsx(buf){
  const z=await unzip(buf);const dp=new DOMParser();
  const sn=Object.keys(z).filter(k=>/worksheets\/sheet\d+\.xml/.test(k)).sort((a,b)=>parseInt(a.match(/\d+/g).pop())-parseInt(b.match(/\d+/g).pop()));
  if(!sn.length)throw new Error('Excel fayldan varaq topilmadi.');
  const ss=[];if(z['xl/sharedStrings.xml']){const d=dp.parseFromString(z['xl/sharedStrings.xml'],'application/xml');for(const si of d.getElementsByTagName('si'))ss.push([...si.getElementsByTagName('t')].map(t=>t.textContent).join(''))}
  const d=dp.parseFromString(z[sn[0]],'application/xml');const rows=[];
  for(const r of d.getElementsByTagName('row')){
    const row=[];
    for(const c of r.getElementsByTagName('c')){
      const ref=c.getAttribute('r')||'';const m=ref.match(/^([A-Z]+)/);let ci=0;if(m)for(const ch of m[1])ci=ci*26+ch.charCodeAt(0)-64;ci--;
      const t=c.getAttribute('t'),ve=c.getElementsByTagName('v')[0];let val='';
      if(t==='s'&&ve)val=ss[+ve.textContent]||'';else if(t==='inlineStr')val=[...c.getElementsByTagName('t')].map(x=>x.textContent).join('');else if(ve)val=ve.textContent;
      row[ci<0?row.length:ci]=String(val);
    }
    for(let i=0;i<row.length;i++)if(row[i]===undefined)row[i]='';
    if(row.some(x=>x!==''))rows.push(row);
  }
  return rows;
}
function download(name,u8,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([u8],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}

/* ===== Kiritilgan ma'lumotni tekshirish va tozalash (sof funksiyalar — Node'da sinaladi) ===== */
// CSV/TSV matnini qatorlarga ajratadi: qo'shtirnoq (RFC 4180), ajratgich (; , tab), BOM, \r\n
function parseCsvText(txt){
  txt=String(txt==null?'':txt).replace(/^﻿/,'');
  const first=(txt.split(/\r?\n/).find(l=>l.trim())||'');if(!first)return [];
  const cnt=c=>first.split(c).length-1,dl=[';','\t',','].map(c=>[c,cnt(c)]).sort((a,b)=>b[1]-a[1])[0];const D=dl[1]>0?dl[0]:',';
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<txt.length;i++){const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){cell+='"';i++}else q=false}else cell+=c}
    else if(c==='"'&&cell==='')q=true;
    else if(c===D){row.push(cell.trim());cell=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;row.push(cell.trim());cell='';if(row.some(x=>x!==''))rows.push(row);row=[]}
    else cell+=c}
  row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);
  return rows;
}
// Ustun nomlari bo'yicha ustun indekslari (s — sath, a/b — SIS-1/2, p — bosim, n — nasos, q — kirish oqimi)
function findCols(hd){const f=re=>hd.findIndex(x=>re.test(x));return {s:f(/^sath|^level|^dcs|^li/),a:f(/sis1|lt1|sis_1/),b:f(/sis2|lt2|sis_2/),p:f(/bosim|press|^pi/),n:f(/nasos|pump/),q:f(/kirish|inflow|oqim|fqi/)}}
const numCell=v=>parseFloat(String(v===undefined?'':v).replace(/\s/g,'').replace(',','.'));
// Jadval mazmunini tekshiradi: xato matnini (o'zbekcha) yoki null qaytaradi
// Foydalanuvchi yuklagan teg to'plamini tekshiradi: anonim to'plam shakliga mos bo'lishi shart, belgilar tozalanadi (xavfsiz)
function sanitizeTags(j,ref){
  if(!j||typeof j!=='object'||Array.isArray(j))return null;const cl=x=>x.replace(/[<>&"'`\\\x00-\x1f]/g,'').slice(0,60),o={};
  for(const k in ref){const r=ref[k],v=j[k];
    if(v===undefined){o[k]=r;continue}
    if(typeof r==='string'){if(typeof v!=='string')return null;o[k]=cl(v)}
    else if(Array.isArray(r)){if(!Array.isArray(v)||v.length!==r.length||v.some(x=>typeof x!=='string'))return null;o[k]=v.map(cl)}
    else return null}
  return o}
function validateTankTable(rows){
  if(!rows||!rows.length)return 'Fayl bo‘sh.';
  if(rows.length<60)return 'Kamida 60 qator kerak.';
  if(rows.length>200001)return 'Qatorlar soni 200 000 dan oshmasligi kerak.';
  const hd=rows[0].map(x=>String(x).toLowerCase().trim());
  if(!hd.some(x=>isNaN(parseFloat(x.replace(',','.')))))return 'Birinchi qatorda ustun nomlari bo‘lishi kerak (sath, sis1, sis2, bosim, nasos, kirish).';
  const col=findCols(hd);if(col.s<0)return '“sath” ustuni topilmadi.';
  const body=rows.slice(1);
  for(const key of ['s','a','b','p','n','q']){const i=col[key];if(i<0)continue;let ok=0,out=0,tot=0;
    for(const r of body){const v=numCell(r[i]);if(isFinite(v)){ok++;if(key==='s'||key==='a'||key==='b'){if(v<-5||v>105)out++}else if(key==='n'){if(v<0||v>2)out++}else if(key==='p'){if(v<-2||v>1000)out++}else if(v<0)out++}tot++}
    const name=hd[i]||key;
    if(ok<0.8*tot)return '“'+name+'” ustuni raqamli emas (qiymatlarning kamida 80 % i son bo‘lishi kerak).';
    if(out>0.2*ok){return key==='n'?'“'+name+'” ustunida nasoslar soni 0, 1 yoki 2 bo‘lishi kerak.':(key==='s'||key==='a'||key==='b')?'“'+name+'” ustuni sath (%) bo‘lishi kerak (0–100 oralig‘ida): birliklarni tekshiring.':'“'+name+'” ustunida mumkin bo‘lmagan (manfiy yoki juda katta) qiymatlar ko‘p.'}}
  return null;
}
// Mnemosxema modelini tozalaydi: faqat ruxsat etilgan tur, xavfsiz id, son qiymatlar, atributga tushadigan satrlar faqat xavfsiz belgilardan iborat
function sanitizeMnemo(m,types){
  if(!Array.isArray(m)||!m.length||m.length>2000)return null;
  const num=(v,d)=>(typeof v==='number'||(typeof v==='string'&&v.trim()!==''))&&isFinite(+v)?+v:d;
  const FREE=new Set(['text','label','tag','unit','name']),SAFE=/^[#\w(),.%\s-]{0,40}$/,KEY=/^[A-Za-z][A-Za-z0-9_]{0,20}$/;
  const out=[];
  for(let i=0;i<m.length;i++){const o=m[i];if(!o||typeof o!=='object'||!types.includes(o.t))return null;
    const r={id:/^[A-Za-z0-9_-]{1,40}$/.test(String(o.id))?String(o.id):'s'+i+'x',t:o.t};
    if(Array.isArray(o.pts))r.pts=o.pts.slice(0,500).map(p=>[num(p&&p[0],0),num(p&&p[1],0)]);
    else{r.x=num(o.x,0);r.y=num(o.y,0);r.r=num(o.r,0);r.s=num(o.s,1);if(o.fx)r.fx=1}
    r.p={};const P0=(o.p&&typeof o.p==='object'&&!Array.isArray(o.p))?o.p:{};
    for(const k of Object.keys(P0)){if(!KEY.test(k)||k==='__proto__'||k==='constructor')continue;const v=P0[k];
      if(typeof v==='number'){if(isFinite(v))r.p[k]=v}
      else if(typeof v==='boolean')r.p[k]=v;
      else if(typeof v==='string'){if(FREE.has(k))r.p[k]=v.slice(0,120);else if(SAFE.test(v))r.p[k]=v}}
    out.push(r)}
  const ids=new Set();for(const o of out){while(ids.has(o.id))o.id+='_';ids.add(o.id)}
  return out;
}

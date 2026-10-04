// Ishga tushirish: node --test tests/
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('./load');
const P=S.plantDefaults(),model=S.trainModel2(P,7);
const N=20;
const run1=(kind,tank,seed,Pg=P,M=model)=>{const run=S.runPlant2(kind,tank,S.rngMake(seed),Pg);const idxs=run.tanks.map(o=>S.computeIndex2(o,M,Pg));const e=S.analyseRun(run,idxs,Pg);const dg=S.diagnose(run,idxs,Pg,e);return {run,idxs,e,dg}};

test('normal ish: SIS trip va signalizatsiya yo‘q (40 ssenariy)',()=>{
  for(let s=1;s<=40;s++){const {e}=run1('normal',0,3000+s);assert.ok(e.a.trip<0,'seed '+s+': SIS trip');assert.ok(!e.fired.alarm,'seed '+s+': DCS alarm')}
});

test('normal ish: AI soxta ogohlantirishi ≤ 4 % (150 ssenariy)',()=>{
  let fa=0;for(let s=1;s<=150;s++){const {e}=run1('normal',0,2000+s);if(e.fired.warn||e.fired.diag)fa++}
  assert.ok(fa<=6,'soxta '+fa+'/150');
});

for(const kind of ['f1','f2','f3','f4','f5','f7'])test(`${kind}: ogohlantirish trip dan oldin va sabab+rezervuar to‘g‘ri (≥ 90 %)`,()=>{
  let det=0,dx=0,tr=0;
  for(let s=1;s<=N;s++){const {run,e,dg}=run1(kind,s%2,4000+s);if(e.a.trip>=0){tr++;if(e.L.comb!==null)det++}if(dg.code===S.TRUTH[kind]&&dg.tank===run.fT)dx++}
  assert.ok(tr>=0.9*N,`${kind}: trip ${tr}/${N}`);assert.ok(det>=0.9*tr,`${kind}: topildi ${det}/${tr}`);assert.ok(dx>=0.9*N,`${kind}: tashxis ${dx}/${N}`);
});

test('f6: signal yo‘qolishi aniqlanadi (tashxis nan, ≥ 90 %)',()=>{
  let dx=0;for(let s=1;s<=N;s++){const {run,dg}=run1('f6',s%2,5000+s);if(dg.code==='nan'&&dg.tank===run.fT)dx++}
  assert.ok(dx>=0.9*N,'nan '+dx+'/'+N);
});

test('f7 (aylanma oqim) endi ishonchli aniqlanadi — sath balansi chegarasi o‘rganiladi',()=>{
  assert.ok(model.zT>=2&&model.zT<=6.8,'zT '+model.zT);
  let dx=0;for(let s=1;s<=N;s++){const {run,dg}=run1('f7',s%2,6000+s);if(dg.code==='recirc'&&dg.tank===run.fT)dx++}
  assert.ok(dx>=0.95*N,'recirc '+dx+'/'+N);
});

test('model aniq (bir xil urug‘ — bir xil natija)',()=>{
  const a=S.runPlant2('f2',0,S.rngMake(5),P),b=S.runPlant2('f2',0,S.rngMake(5),P);
  assert.deepEqual(Array.from(a.tanks[0].Ld),Array.from(b.tanks[0].Ld));
});

test('massa balansi: nasos o‘chiq va sizish yo‘q oraliqlarda sath o‘zgarishi kirish oqimiga teng',()=>{
  const pct=P.dt*100/(P.V*60);let seg=0;
  for(let s=1;s<=20;s++){const o=S.runPlant2('normal',0,S.rngMake(7000+s),P).tanks[0];let k0=-1;
    for(let k=1;k<o.L.length;k++){const off=o.NP[k]===0&&o.NP[k-1]===0;if(off&&k0<0)k0=k;if(!off&&k0>=0){
      if(k-1-k0>40&&o.L[k0]>0.5&&o.L[k-1]<99.5){let sum=0;for(let j=k0+1;j<=k-1;j++)sum+=o.QIN[j]/24*pct;assert.ok(Math.abs((o.L[k-1]-o.L[k0])-sum)<0.05,'balans buzildi, seed '+s);seg++}k0=-1}}}
  assert.ok(seg>=5,'tekshirilgan oraliqlar: '+seg);
});

test('SIS ovoz berish: 1oo2 / 2oo2 va signal yo‘qolishi (fail-safe)',()=>{
  const low=v=>v<=10,NaNv=NaN;
  assert.equal(S.sisVote(5,50,low,'1oo2'),true);assert.equal(S.sisVote(5,50,low,'2oo2'),false);assert.equal(S.sisVote(5,5,low,'2oo2'),true);
  assert.equal(S.sisVote(NaNv,50,low,'1oo2'),true,'1oo2: yo‘qolgan signal = trip ovozi');
  assert.equal(S.sisVote(NaNv,NaNv,low,'2oo2'),true,'ikkala signal yo‘q — trip');
  assert.equal(S.voteLow(20,30,'1oo2'),20);assert.equal(S.voteLow(20,30,'2oo2'),30);assert.equal(S.voteHigh(80,90,'1oo2'),90);assert.equal(S.voteHigh(80,90,'2oo2'),80);
  assert.equal(S.voteLow(NaN,30,'1oo2'),30);assert.equal(S.voteHigh(80,NaN,'2oo2'),80);
});

test('2oo2 ovoz berishda ham normal ishda soxta signal yo‘q va nosozlik topiladi',()=>{
  const P2={...P,vote:'2oo2'};let fa=0,det=0,tr=0;
  for(let s=1;s<=30;s++){const {e}=run1('normal',0,8000+s,P2);if(e.fired.warn||e.fired.diag)fa++}
  for(let s=1;s<=10;s++){const {e}=run1('f2',s%2,8500+s,P2);if(e.a.trip>=0){tr++;if(e.L.comb!==null)det++}}
  assert.ok(fa<=2,'soxta '+fa);assert.ok(tr>0&&det===tr,`det ${det}/${tr}`);
});

test('shovqin ×2: soxta signal kam, nosozliklar topiladi, f7 tashxisi ≥ 70 %',()=>{
  const Pn={...P,noise:2};let fa=0;
  for(let s=1;s<=30;s++){const {e}=run1('normal',0,1000+s,Pn);if(e.fired.warn||e.fired.diag)fa++}
  assert.ok(fa<=2,'soxta '+fa+'/30');
  let dx=0;for(let s=1;s<=N;s++){const {run,dg}=run1('f7',s%2,6000+s,Pn);if(dg.code==='recirc'&&dg.tank===run.fT)dx++}assert.ok(dx>=0.7*N,'f7 '+dx+'/'+N);
  for(const kind of ['f2','f4']){let det=0,tr=0;for(let s=1;s<=10;s++){const {e}=run1(kind,s%2,2000+s,Pn);if(e.a.trip>=0){tr++;if(e.L.comb!==null)det++}}assert.ok(det>=0.9*tr,`${kind} ${det}/${tr}`)}
});

test('o‘lchov shovqini ×3 da normal ishda soxta signal ≤ 10 %',()=>{
  const Pn={...P,noise:3};let fa=0;
  for(let s=1;s<=30;s++){const {e}=run1('normal',0,1000+s,Pn);if(e.fired.warn||e.fired.diag)fa++}
  assert.ok(fa<=3,'soxta '+fa+'/30');
});

// node dump_js.js v nF nN out.csv  — dump_runs.m ning JS ekvivalenti
const S=require('../tests/load.js');
const [v,nF,nN,out]=[+process.argv[2],+process.argv[3],+process.argv[4],process.argv[5]];
const P=S.plantDefaults();const M=S.trainModel2(P,v*11);const r=S.rngMake(v*100);
const f=x=>x==null||isNaN(x)?'NaN':x.toFixed(4);
const rows=['v,kind,fT,trip,tripType,alarm,warn,diag,comb,code,tank,ok,fired'];
const TR={f1:'overrun',f2:'leak',f3:'surge',f4:'freeze',f5:'press',f6:'nan',f7:'recirc'};
const K=['f1','f2','f3','f4','f5','f7','f6'];
const one=(kd,tank)=>{const run=S.runPlant2(kd,tank,r,P);const idx=run.tanks.map(o=>S.computeIndex2(o,M,P));const e=S.analyseRun(run,idx,P);const d=S.diagnose(run,idx,P,e);return {run,e,d}};
const tt={'LALL':1,'LAHH':2,'PALL':3};
for(const kd of K)for(let i=0;i<nF;i++){const {run,e,d}=one(kd,i%2);const ok=d.code===TR[kd]&&d.tank===run.fT?1:0;
 rows.push([v,kd,run.fT+1,e.a.trip,e.a.tripType,f(e.L.alarm),f(e.L.warn),f(e.L.diag),f(e.L.comb),d.code,d.tank+1,ok,e.fired.comb?1:0].join(','))}
for(let i=0;i<nN;i++){const {run,e,d}=one('normal',0);rows.push([v,'normal',run.fT+1,e.a.trip,e.a.tripType,'NaN','NaN','NaN','NaN',d.code,d.tank+1,d.code==='none'?1:0,e.fired.comb?1:0].join(','))}
require('fs').writeFileSync(out,rows.join('\n')+'\n');

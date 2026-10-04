const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const S=require('./load');
const J=x=>JSON.parse(JSON.stringify(x));
const hdr='sath,sis1,sis2,bosim,nasos,kirish';
const mk=(n,f,h=hdr)=>[h,...Array.from({length:n},(_,i)=>f(i))].join('\n');
const good=i=>[55+Math.sin(i/20),55,55.1,52,0,150].map(x=>x.toFixed(2)).join(',');
const rows=t=>S.parseCsvText(t);

test('CSV: ajratgichlar, qo‘shtirnoq, BOM, CRLF',()=>{
  assert.deepEqual(J(S.parseCsvText('a;b;c\r\n1;2;3\r\n')),[['a','b','c'],['1','2','3']]);
  assert.deepEqual(J(S.parseCsvText('a\tb\n1\t2')),[['a','b'],['1','2']]);
  assert.deepEqual(J(S.parseCsvText('﻿"sath","sis1"\n"1,5","2"')),[['sath','sis1'],['1,5','2']]);
  assert.deepEqual(J(S.parseCsvText('a,b\n"x ""q"" y","l1\nl2"\n')),[['a','b'],['x "q" y','l1\nl2']]);
  assert.deepEqual(J(S.parseCsvText('')),[]);
});

test('CSV tekshiruvi: bo‘sh, qisqa, sarlavha, ustun, matnli, birlik, nasos',()=>{
  assert.match(S.validateTankTable([]),/bo‘sh/);
  assert.match(S.validateTankTable(rows(mk(30,good))),/Kamida 60/);
  assert.match(S.validateTankTable(rows(Array(80).fill('55,55,55,52,0,150').join('\n'))),/ustun nomlari/);
  assert.match(S.validateTankTable(rows(mk(80,()=>'55,55',  'x,y'))),/sath/);
  assert.match(S.validateTankTable(rows(mk(80,()=>'a,b,c,d,e,f'))),/raqamli emas/);
  assert.match(S.validateTankTable(rows(mk(80,()=>'-55,-55,-55,52,0,150'))),/sath \(%\)/);
  assert.match(S.validateTankTable(rows(mk(80,()=>'555,555,555,52,0,150'))),/sath \(%\)/);
  assert.match(S.validateTankTable(rows(mk(80,()=>'55,55,55,52,7,150'))),/nasoslar soni/);
  assert.equal(S.validateTankTable(rows(mk(80,good))),null);
  assert.equal(S.validateTankTable(rows(mk(80,good).replace(/,/g,';'))),null);
  assert.equal(S.validateTankTable(rows(mk(80,good).split('\n').map(l=>l.split(',').map(x=>'"'+x+'"').join(',')).join('\n'))),null);
  assert.equal(S.validateTankTable(rows('sath\n'+Array(80).fill('55').join('\n'))),null,'faqat sath ustuni yetarli');
});

const TYPES=['label','sensor','value','kvalve','wire','panel','ktank'];
test('sxema importi: XSS yuklamalari tozalanadi',()=>{
  const X='<img src=x onerror=alert(1)>',A='"><img src=x onerror=alert(2)>';
  const m=S.sanitizeMnemo([
    {t:'label',x:1,y:2,id:'z3'+A,p:{text:X,c:A,a:'start',fs:13}},
    {t:'sensor',x:1,y:2,id:'ok_1',p:{tag:X,rim:'red" onmouseover="alert(3)',var:'LI-101'}},
    {t:'wire',id:'w',pts:[[1,'2'],['x',null]],p:{c:'red" onload="alert(4)',w:2,__proto__:{z:1}}},
    {t:'panel',x:'abc',id:'p',p:{kind:X,w:100}},
    {t:'ktank',x:5,y:5,id:'tk',p:{name:X}}],TYPES);
  assert.ok(Array.isArray(m)&&m.length===5);
  const FREE=['text','label','tag','unit','name'];
  for(const o of m){assert.match(o.id,/^[A-Za-z0-9_-]+$/);for(const [k,v] of Object.entries(o.p))if(typeof v==='string'&&!FREE.includes(k))assert.match(v,/^[#\w(),.%\s-]*$/)}
  assert.deepEqual(J(m[2].pts),[[1,2],[0,0]]);assert.equal(m[3].x,0);assert.deepEqual(Object.keys(m[2].p),['w']);
});

test('sxema importi: noto‘g‘ri tur/format rad etiladi, id lar noyob',()=>{
  assert.equal(S.sanitizeMnemo([{t:'evil'}],TYPES),null);assert.equal(S.sanitizeMnemo('x',TYPES),null);assert.equal(S.sanitizeMnemo([],TYPES),null);
  const m=S.sanitizeMnemo([{t:'label',id:'a',x:1,y:1,p:{}},{t:'label',id:'a',x:2,y:2,p:{}}],TYPES);assert.notEqual(m[0].id,m[1].id);
});

test('CSS: yalang‘och <main> qoidasi yo‘q (landmark maketni buzmasin)',()=>{
  const css=fs.readFileSync(path.join(S.root,'css','style.css'),'utf8');
  assert.ok(!/(^|[}\s,])main\s*\{/.test(css),'css da yalang‘och main{...} qoidasi bor');
});

test('app.js da takroriy (o‘lik) funksiya e‘lonlari yo‘q',()=>{
  const src=fs.readFileSync(path.join(S.root,'js','app.js'),'utf8');const names={};
  for(const m of src.matchAll(/^function ([A-Za-z0-9_]+)\(/gm))names[m[1]]=(names[m[1]]||0)+1;
  assert.deepEqual(Object.entries(names).filter(([,n])=>n>1).map(([k])=>k),[]);
});

test('sanitizeTags: shakl tekshiriladi, xavfli belgilar olib tashlanadi',()=>{
  const ref={a:'x',b:['1','2']};
  assert.deepEqual(J(S.sanitizeTags({a:'<b>"q"</b>',b:['p','q']},ref)),{a:'bq/b',b:['p','q']});
  assert.deepEqual(J(S.sanitizeTags({a:'z'},ref)),{a:'z',b:['1','2']});   // yo'q kalit anonim qiymatni oladi
  assert.equal(S.sanitizeTags({a:1,b:['1','2']},ref),null);
  assert.equal(S.sanitizeTags({a:'z',b:['1']},ref),null);
  assert.equal(S.sanitizeTags([],ref),null);assert.equal(S.sanitizeTags(null,ref),null);
});

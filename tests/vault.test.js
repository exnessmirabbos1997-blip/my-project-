const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const V=require('../js/vault.js');
test('vault: to‘g‘ri parol ochadi, noto‘g‘ri parol rad etadi, har safar boshqa shifr',async()=>{
  const box=await V.seal({a:'x'},'parol-12345'),box2=await V.seal({a:'x'},'parol-12345');
  assert.deepEqual(await V.open(box,'parol-12345'),{a:'x'});
  assert.equal(await V.open(box,'parol-12346'),null);assert.equal(await V.open(box,''),null);
  assert.notEqual(box.c,box2.c);
});
test('vault: buzilgan yoki zararli quti rad etiladi',async()=>{
  const b=await V.seal({a:1},'parol-12345');
  assert.equal(await V.open({...b,c:b.c.slice(2)+'AA'},'parol-12345'),null);
  assert.equal(V.valid({...b,i:5e9}),false);assert.equal(V.valid(null),false);assert.equal(await V.open({v:1},'x'),null);
});
test('repodagi shifrlangan teglar ochiq matn saqlamaydi',()=>{
  const s=fs.readFileSync(path.join(__dirname,'..','js','tags-enc.js'),'utf8');
  assert.ok(s.includes('PLANT_VAULT'));assert.ok(!/FB-?8105|81014|GA-8105|HS8101/.test(s));
});

// E2E smoke: brauzerda (Chromium) haqiqiy ishlashini tekshiradi. Ishga tushirish: npm run e2e
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');
const MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/,'/index.html'));
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
const fails=[];const ok=(c,m)=>{if(!c){fails.push(m);console.log('  ✗',m)}else console.log('  ✓',m)};
const VIEWS=['overview','mimic','3d','sis','trends','ai','review','journal','batch','data','math','settings'];
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/index.html';
 const exe=process.env.CHROMIUM_PATH||undefined;
 const b=await chromium.launch({executablePath:exe,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 for(const [nm,vp,mob] of [['desktop',{width:1400,height:900},false],['mobil',{width:375,height:667},true]]){
  console.log(nm);const ctx=await b.newContext({viewport:vp,isMobile:mob,hasTouch:mob});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await p.goto(url);await p.waitForFunction(()=>typeof cur!=='undefined'&&cur,null,{timeout:90000});
  ok(/Kondensat|kondensat/.test(await p.title())&&!/Quritgich/.test(await p.title()),'sarlavha to‘g‘ri: '+await p.title());
  for(const v of VIEWS){await p.evaluate(v=>showView(v),v);await p.waitForTimeout(250);
   const m=await p.evaluate(()=>({o:document.documentElement.scrollWidth>innerWidth+1,cur:document.querySelector('[aria-current=page]')?.dataset.view}));
   ok(!m.o&&m.cur===v,`${v}: gorizontal scroll yo‘q, aria-current=${m.cur}`)}
  // SIS: kanalsiz ma'lumotda yolg'on qizil chip yo'q
  await p.evaluate(()=>{const r=cur.run;r.tanks.forEach(o=>{o.sisOK=false;o.S1.fill(NaN);o.S2.fill(NaN)});load(r);showView('sis')});await p.waitForTimeout(200);
  ok(await p.evaluate(()=>!document.querySelector('#sisBox .chip.bad')),'SIS: kanalsiz ma‘lumotda yolg‘on chip yo‘q');
  // yorug' mavzuda mnemosxema oq fonda (qora emas)
  await p.evaluate(()=>{showView('mimic');document.documentElement.setAttribute('data-theme','light');render()});await p.waitForTimeout(500);
  ok(await p.evaluate(()=>{const s=document.querySelector('#kBase svg');return !!s&&s.getAttribute('style').includes('--ink:#16232e')&&s.querySelector('#rBg stop').getAttribute('stop-color')==='#ffffff'}),'yorug‘ mavzuda mnemosxema oq fonda');
  await p.evaluate(()=>{document.documentElement.setAttribute('data-theme','');render();showView('overview')});
  // parol bilan himoyalangan haqiqiy teglar
  const PW='Test-parol-123',PW2='Yangi-parol-456';
  await p.evaluate(async pw=>{window.PLANT_VAULT=await Vault.seal({tk:['TEST-A','TEST-B']},pw)},PW);
  await p.evaluate(()=>showView('overview'));
  const sel=async v=>{await p.selectOption('#tags',v)};
  await sel('plant');await p.waitForSelector('#pwDlg[open]');
  await p.fill('#pwIn','notogri-parol');await p.click('#pwForm button[type=submit]');await p.waitForTimeout(600);
  ok(await p.evaluate(()=>$('pwDlg').open&&$('pwMsg').textContent.length>0&&!TAGS.plant),'noto‘g‘ri parol rad etiladi');
  await p.fill('#pwIn',PW);await p.click('#pwForm button[type=submit]');await p.waitForTimeout(600);
  ok(await p.evaluate(()=>!$('pwDlg').open&&$('tags').value==='plant'&&TG().tk.join('|')==='TEST-A|TEST-B'),'to‘g‘ri parol haqiqiy teglarni ochadi');
  await sel('anon');ok(await p.evaluate(()=>!TAGS.plant&&TG().tk[0]==='T-1A'),'anonimga qaytganda qulflanadi');
  await sel('plant');await p.waitForSelector('#pwDlg[open]');await p.click('#pwCancel');await p.waitForTimeout(300);
  ok(await p.evaluate(()=>$('tags').value==='anon'&&!$('pwDlg').open),'bekor qilish anonimda qoldiradi');
  // parolni yangilash
  await p.evaluate(()=>showView('settings'));
  await p.fill('#pwOld','xato');await p.fill('#pwNew',PW2);await p.fill('#pwNew2',PW2);await p.click('#pwChg');await p.waitForTimeout(600);
  ok(await p.evaluate(()=>localStorage.getItem('qtags_vault')===null),'eski parol xato bo‘lsa yangilanmaydi');
  await p.fill('#pwOld',PW);await p.click('#pwChg');await p.waitForTimeout(800);
  ok(await p.evaluate(()=>localStorage.getItem('qtags_vault')!==null),'parol yangilandi');
  await p.evaluate(()=>showView('overview'));await sel('plant');await p.waitForSelector('#pwDlg[open]');
  await p.fill('#pwIn',PW);await p.click('#pwForm button[type=submit]');await p.waitForTimeout(600);
  ok(await p.evaluate(()=>$('pwDlg').open),'eski parol endi ishlamaydi');
  await p.fill('#pwIn',PW2);await p.click('#pwForm button[type=submit]');await p.waitForTimeout(600);
  ok(await p.evaluate(()=>$('tags').value==='plant'&&TG().tk[0]==='TEST-A'),'yangi parol ishlaydi');
  await sel('anon');
  // holat turlarini tahrirlash va o'z holatini qo'shish
  await p.evaluate(()=>showView('settings'));
  await p.fill('#kn_f1','Mening quyish holatim');await p.click('#knSave');await p.waitForTimeout(200);
  ok(await p.evaluate(()=>[...$('kind').options].some(o=>o.value==='f1'&&o.textContent==='Mening quyish holatim')),'holat nomi o‘zgartiriladi');
  await p.fill('#kcName','Test <b>holat</b>');await p.selectOption('#kcBase','f2');await p.click('#kcAdd');await p.waitForTimeout(300);
  ok(await p.evaluate(()=>{const o=$('kind').selectedOptions[0];return o.value==='c1'&&o.textContent==='Test bholat/b'}),'o‘z holati qo‘shiladi, belgilar tozalanadi');
  await p.evaluate(()=>{showView('overview');$('run').click()});await p.waitForTimeout(800);
  ok(await p.evaluate(()=>cur.run.kind==='f2'&&cur.run.label==='Test bholat/b'&&$('status').textContent.includes('Test bholat/b')),'o‘z holati asosiy model bo‘yicha ishlaydi');
  await p.evaluate(()=>{showView('settings');$('knReset').click();KC=[];lsSet(KC_KEY,[]);kindsLoad();kindsRebuild()});
  // o'z holati saqlangan bo'lsa sahifa qayta ochilganda xatosiz yuklanadi
  await p.evaluate(()=>{lsSet(KC_KEY,[{id:'c1',name:'Saqlangan',base:'f2'}])});
  const e5=[];p.on('pageerror',e=>e5.push(e.message));await p.reload();await p.waitForFunction(()=>typeof cur!=='undefined'&&cur,null,{timeout:90000});
  ok(e5.length===0&&await p.evaluate(()=>[...$('kind').options].some(o=>o.value==='c1')),'saqlangan o‘z holati bilan sahifa xatosiz ochiladi'+(e5.length?': '+e5[0]:''));
  await p.evaluate(()=>{try{localStorage.removeItem('qkinds_custom')}catch(e){}});
  if(mob){await p.evaluate(()=>showView('sis'));await p.waitForTimeout(400);
   ok(await p.evaluate(()=>{const a=document.querySelector('#mnav .on').getBoundingClientRect();return a.left>=-1&&a.right<=innerWidth+1}),'mobil menyuda faol tab ko‘rinadi');
   ok(await p.evaluate(()=>getComputedStyle($('show')).display==='none'),'mobil boshqaruv panel yig‘ilgan');
   await p.click('#ctrlT');ok(await p.evaluate(()=>getComputedStyle($('show')).display!=='none'),'⚙ tugmasi panelni ochadi')}
  ok(errs.length===0,'konsolda xato yo‘q'+(errs.length?': '+errs[0]:''));await ctx.close()}
 // 3D: bo'limdan chiqilgach sikl to'xtaydi
 const ctx=await b.newContext({viewport:{width:1400,height:900}});const p=await ctx.newPage();
 await p.addInitScript(()=>{window.__raf=0;window.__o=0;const r=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>{window.__raf++;if(f.name==='o_')window.__o++;return r(f)}});
 await p.goto(url+'#3d');await p.waitForFunction(()=>typeof cur!=='undefined'&&cur,null,{timeout:90000});await p.waitForTimeout(1500);
 await p.evaluate(()=>{showView('settings');window.__o=0});await p.waitForTimeout(2500);const n=await p.evaluate(()=>window.__o);
 ok(n<=1,'3D tark etilgach uning rAF sikli to‘xtaydi ('+n+' chaqiruv/2.5s)');
 await p.evaluate(()=>showView('3d'));await p.waitForTimeout(1500);await p.evaluate(()=>{window.__o=0});await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>window.__o)>=1,'3D ga qaytilganda sikl qayta ishga tushadi');
 // PDF hisobot: avval ko'rinadi (to'g'ridan-to'g'ri chop etilmaydi), keyin PDF faylga saqlanadi
 {const c2=await b.newContext({viewport:{width:1400,height:900},acceptDownloads:true});const q=await c2.newPage();
  await q.addInitScript(()=>{window.__pr=0;window.print=()=>{window.__pr++}});
  await q.goto(url+'#3d');await q.waitForFunction(()=>typeof cur!=='undefined'&&cur,null,{timeout:90000});await q.waitForTimeout(2000);
  await q.click('#k3dPdf');await q.waitForSelector('#rpDlg[open]',{timeout:20000});
  ok(await q.evaluate(()=>window.__pr===0&&document.getElementById('rpFr').srcdoc.length>1000),'hisobot avval ko‘rsatiladi, o‘zi chop etilmaydi');
  const [dl]=await Promise.all([q.waitForEvent('download',{timeout:60000}),q.click('#rpPdf')]);
  const bytes=require('fs').readFileSync(await dl.path());ok(bytes.slice(0,5).toString()==='%PDF-'&&bytes.slice(-6).toString().includes('%%EOF')&&bytes.length>20000,'PDF fayl saqlanadi ('+bytes.length+' bayt)');
  await c2.close()}
 await b.close();srv.close();console.log(fails.length?`\n${fails.length} ta xato`:'\nHammasi o‘tdi');process.exit(fails.length?1:0)})();

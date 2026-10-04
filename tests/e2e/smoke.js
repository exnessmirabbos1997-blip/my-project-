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
  // teglar: yuklanmagan bo'lsa Haqiqiy tanlansa anonimga qaytadi, fayl yuklangach ishlaydi
  await p.evaluate(()=>showView('overview'));
  const anonTxt=await p.evaluate(()=>TG().tk[0]);
  await p.setInputFiles('#tagsFile',{name:'t.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({tk:['TEST-A<script>','TEST-B']}))});await p.waitForTimeout(300);
  const t2=await p.evaluate(()=>[$('tags').value,TG().tk.join('|'),localStorage.getItem('qtags_plant')!==null]);
  ok(t2[0]==='plant'&&t2[1]==='TEST-Ascript|TEST-B'&&t2[2],'teglar fayli yuklandi va tozalandi: '+t2[1]);
  await p.click('#tagsDel').catch(()=>p.evaluate(()=>$('tagsDel').click()));await p.waitForTimeout(200);
  ok(await p.evaluate(()=>$('tags').value==='anon'&&!TAGS.plant),'teglarni o‘chirish anonimga qaytaradi');
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
 await b.close();srv.close();console.log(fails.length?`\n${fails.length} ta xato`:'\nHammasi o‘tdi');process.exit(fails.length?1:0)})();

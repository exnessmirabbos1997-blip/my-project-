// Haqiqiy teglar JSON faylini parol bilan shifrlab js/tags-enc.js ni yaratadi (JSON repoga qo'shilmaydi).
// Ishlatish:  node tools/make-vault.js teglar.json "PAROL"
const fs=require('fs'),V=require('../js/vault.js');
const [f,pw]=process.argv.slice(2);if(!f||!pw||pw.length<12){console.error('Ishlatish: node tools/make-vault.js teglar.json "kamida 12 belgili parol"');process.exit(1)}
V.seal(JSON.parse(fs.readFileSync(f,'utf8')),pw).then(b=>{fs.writeFileSync(require('path').join(__dirname,'..','js','tags-enc.js'),'// Shifrlangan haqiqiy teglar (parolsiz o\'qib bo\'lmaydi). tools/make-vault.js bilan yaratilgan.\nwindow.PLANT_VAULT='+JSON.stringify(b)+';\n');console.log('js/tags-enc.js yozildi')});

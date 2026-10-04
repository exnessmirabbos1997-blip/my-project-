# Kondensat rezervuar AI — yengil kondensat ombori

Ikki rezervuarli yengil kondensat omborining brauzerdagi simulyatori: massa balansi modeli, DCS/SIS (1oo2 / 2oo2) integratsiyalashgan himoya, AI xavf indeksi (Isolation Forest + fizik qoldiqlar), sabab tashxisi, mnemosxema, 3D ko‘rinish, o‘z ma’lumotingizni (Excel/CSV) va onlayn oqimni (URL, WebSocket, fayl kuzatuvi) tahlil qilish.

## Ishga tushirish
`index.html` ni brauzerda oching (server shart emas).

## Tuzilma
| Yo‘l | Vazifasi |
|---|---|
| `index.html`, `css/style.css` | Sahifa va uslublar |
| `js/sim.js` | Model, SIS, qoldiqlar, xavf indeksi, tashxis, Excel o‘qish/yozish, kiritishni tekshirish |
| `js/app.js` | Interfeys, grafiklar, mnemosxema, ommaviy sinov, onlayn qabul |
| `js/journal.js` | Hodisalar jurnali: DCS/SIS/AI voqealari, operator tasdiqlashi (ACK), CSV eksport |
| `js/i18n.js` | UZ / RU / EN tarjimalari |
| `js/sis.js` | SIS blokirovka bo‘limi: P&ID 11/12-izohlari bo‘yicha sabab–oqibat matritsasi (holat tanlangan vaqt lahzasi uchun) |
| `js/sprites.js` | Mnemosxema tasvirlari (base64) |
| `js/scene3d.bundle.js`, `js/scene3d-view.js`, `js/pdf-quiz.js`, `js/mn3d.js`, `js/mobile.js` | 3D sahna, PDF hisobot, operator mashqi, mobil qulaylik |
| `electron/`, `build/` | Windows ish stoli dasturi (Electron) |
| `tools/build-single.js` | Bitta HTML faylga yig‘ish |
| `tests/` | Avtomatik sinovlar (`npm test`) |
| `docs/` | Metodologiya va audit hisoboti |

## Sinov
```
npm test
```
GitHub Actions har push va PRda ishga tushiradi.

## Windows dastur
Releases bo‘limidan `Kondensat-rezervuar-AI-Setup-<versiya>.exe`. Yangi versiya: Actions → "Windows dastur" → Run workflow. Dastur imzosiz: SmartScreen chiqsa, "Qo‘shimcha ma’lumot" → "Baribir ishga tushirish".

## Bitta faylli versiya
`node tools/build-single.js` → `dist/Kondensat-rezervuar-AI.html` (internetsiz ochiladi). `--artifact` — claude.ai uchun variant.

## Anonim / Haqiqiy teglar
Yuqori paneldagi **Anonim | Haqiqiy** tanlovi butun ilovaga (mnemosxema, SIS blokirovka, Review, jurnal, eksport) ta’sir qiladi va brauzerda eslab qolinadi. Boshlang‘ich qiymat — *Anonim*.
Korxonaning haqiqiy teglari **dastur kodida va repoda saqlanmaydi**. Ularni *Sozlamalar → Haqiqiy teglar* orqali JSON fayl sifatida yuklaysiz (kalitlar anonim to‘plam bilan bir xil: `tk`, `LI`, `PI`, `S1`, `S2`, `XVin`, …). Fayl tekshiriladi (xavfli belgilar olib tashlanadi) va faqat shu qurilmadagi brauzer xotirasida (localStorage) turadi; hech qayerga yuborilmaydi. Fayl yuklanmaguncha “Haqiqiy” tanlansa, fayl tanlash oynasi ochiladi.

## Sinovlar
`npm test` — model, kiritish va til sinovlari (26 ta). `npm run e2e` — brauzerda (Chromium) 12 ta bo‘lim × 2 ta ekran, mobil menyu, teglar yuklash, SIS va 3D siklini tekshiradi (CI’da ham ishlaydi).

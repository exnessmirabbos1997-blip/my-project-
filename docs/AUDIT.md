# Audit va tuzatishlar (yuklangan `Rezervuar.html` asosida)

Usul: Chromium'da (1400/375 px, qorong'i va yorug' mavzu) `axe-core`, buzuq CSV va zararli sxema fayllari, onlayn qabul (haqiqiy HTTP va WebSocket serverga), unumdorlik o'lchovi, model uchun Node'da yuzlab ssenariyli statistik sinovlar.

## Model (hisob-kitob)
| Topilma | Tuzatish va natija |
|---|---|
| **f7 (aylanma oqim) tashxisi** ishonchsiz edi: sath balansi chegarasi ±6,8 qat'iy qo'yilgan, normal ishda esa \|zL\| ≤ 0,6; chegara f7 taqsimotining o'rtasiga tushgan | Chegara normal ma'lumotdan o'rganiladi: `zT = max(2,0; 3·maks. \|zL\|)`, ≤ 6,8 (CSV rejimida foydalanuvchi ma'lumotidan). To'g'ri tashxis (10 tadan): shovqin ×1: **6 → 10**, ×2: **0 → 9**, ×3: **0 → 7**; f2 (shovqin ×3): 6 → 10 |
| Isolation Forest o'qitishida ikki nasosli rejim kam (30 % ssenariy, qisqa vaqt) | O'qitishda ikki nasosli ssenariylar yarmini tashkil qiladi (`P._np`) |
| IF: tanlama takroriy, o'qitish massivi `concat` bilan O(n²) yig'ilardi, kalibrovka 100 000 nuqtada | Takrorsiz tanlama, `push`, kalibrovka ≤ ~6000 nuqtada |
| Normal ishda AI soxta ogohlantirishi | 150 ssenariyda 4 ta (≈ 3 %), ya'ni asl natija bilan bir xil (yaxshilanmadi) |

Tasdiqlangan (o'zgartirish kerak emas): massa balansi (sath o'zgarishi kirish oqimiga teng, xato < 0,05 %), SIS ovoz berish (1oo2/2oo2, fail-safe signal yo'qolishi), normal ishda SIS trip/DCS alarm yo'q (60/60).

## Xavfsizlik va kiritish
- Sxema importi/`localStorage`: `sanitizeMnemo` (tur, id, son va satrlar oq ro'yxat bo'yicha) + CSP meta.
- CSV: qo'shtirnoqli fayllar o'qiladi; bo'sh, matnli, birligi noto'g'ri (sath %, nasos 0/1/2) ustunlar tushunarli xabar bilan rad etiladi; diskretlik (1–3600 s) va qism (10–90 %) tekshiriladi; xatoda holat tiklanadi.
- Onlayn qabul: manzil http/https (yoki ws/wss) bilan cheklangan, `https` sahifadan `ws://` uchun tushunarli xabar, parallel so'rov himoyasi, javob/xabar hajmi cheklangan.
- `#constructor`, `#__proto__` kabi hash'lar bo'sh sahifa bermaydi.

## Mantiq / holat
- "Qo'llash" CSV rejimida modelni simulyatsiya modeli bilan almashtirib yuborardi: tuzatildi; ommaviy sinov paytida o'chiriladi.
- Ish stoli maketini buzishi mumkin bo'lgan eski `main{…}` CSS qoidasi olib tashlandi (`<main>` landmark qo'shilgani uchun).
- `app.js` da 11 ta takroriy (o'lik) funksiya e'loni olib tashlandi (`valve2/3`, `pump2`, `tank2`, `vmAlarm`, `vmVal`, `vmBuild`, `vmFrame`, `vmUpdate`, `vmAdd`, `vmReset`) — mnemosxema (1999 SVG element) o'zgarishsiz; sinov takrorlanishning oldini oladi.

## Unumdorlik
- Doimiy 120 rAF/s (ikki animatsiya tsikli) → ko'rinmaganda ≈ 8/s; sensorli qurilmada ≤ 30 kadr/s; reduced-motion hisobga olinadi.
- Ishga tushishdagi eng uzun blok 1195 → ~110 ms (asinxron o'qitish, tezlashtirilgan IF).

## Foydalanish imkoniyati va mobil
- `axe-core`: kontrast, `<main>`, 3D sifat yorlig'i, sarlavha tartibi, canvas nomlari, fokuslanadigan skroll hududlari, kichik shriftlar — 0 buzilish.
- Mobil 3D: "☰ Boshqaruv" menyusi, taqqoslash paneli yig'iladi; ixcham topbar; sensorli maqsadlar.
- Tema saqlanadi va OS sozlamasi hisobga olinadi; favicon, meta tavsif, sana formati.

## Qo'shimcha funksiyalar
- **Hodisalar jurnali**: mavjud `buildEvents()` manbasidan (Review bilan bir xil), daraja (kritik / ogohlantirish / diagnostika / ma'lumot), operator tasdiqlashi (ACK, brauzerda saqlanadi), CSV eksport, menyuda tasdiqlanmagan soni.
- **UZ / RU / EN**: statik interfeys matnlari (menyu, sarlavhalar, tugmalar, yorliqlar, tushuntirishlar, ssenariy nomlari). Formulalar, AI xabarlari va Review matni o'zbekcha qoladi; lug'at sinovi bor.

## Hali qolgan
- Real DCS/SIS tarixi bilan sozlash (chegaralar, shovqin) — real ma'lumot kerak.
- MATLAB moduli `matlab/` ga qo'shildi va JS modeliga moslandi (zT, takrorsiz IF, npForce). Octave 8.4 da 5 variant × 120 = 600 ssenariy JS bilan solishtirildi: 0 ta farq (`tools/dump_js.js` ↔ `matlab/dump_runs.m`).

## Yakuniy audit (2-bosqich) — topilmalar va tuzatishlar
| Topilma | Tuzatish |
|---|---|
| Haqiqiy korxona teglari manba kodda (public repoda ochiq bo'lardi) | Kodda faqat anonim to'plam; haqiqiy teglar JSON sifatida yuklanadi (`sanitizeTags`), faqat localStorage'da |
| Tab sarlavhasi boshqa loyiha nomini ko'rsatardi (`i18n.js`) | To'g'rilandi, UZ/RU/EN |
| SIS bo'limi: SIS kanalsiz ma'lumotda yolg'on qizil chip | Kanal yo'q bo'lsa chip faol emas (`sis.js`) |
| 3D sikli boshqa bo'limlarda ham 60 Hz aylanardi | Bo'limdan chiqilganda to'xtaydi, qaytganda tiklanadi (`scene3d.bundle.js`) |
| Mobil: boshqaruv paneli birinchi ekranni egallardi | "⚙ Parametrlar" tugmasi bilan yig'iladi |
| Mobil: faol menyu tabi ko'rinmasdi | Faol tab markazga suriladi, `aria-current` qo'shildi |
| `<code>` mobilda sahifani kengaytirardi | `overflow-wrap:anywhere` |
| h1→h3 sarlavha tartibi, skip-link yo'qligi | h2, "Asosiy mazmunga o'tish" havolasi |
| Boshqa loyihadan qolgan quritgich elementlari kodi | O'chirildi |
| UI uchun avtomatik test yo'q | `tests/e2e/smoke.js` (CI'da ham) |

Qoldi (ma'lum cheklovlar): jarayon xabarlari va holat qatori faqat o'zbekcha; `ws://`/`http://` onlayn manbalar HTTPS sahifada brauzer tomonidan bloklanadi; 200 000 qatorli fayl ~1,3 s qotadi.

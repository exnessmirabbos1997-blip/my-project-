# Matematik modul (MATLAB / GNU Octave) — 2-versiya

Yengil kondensat ombori: DCS va SIS o‘lchovlari asosida erta ogohlantirish, sabab tashxisi, bashoratlovchi boshqaruv (MPC) va Simulink modeli. Barcha natijalar GNU Octave 8.4 da hisoblangan; kod MATLAB sintaksisida yozilgan.

## 1. Erta ogohlantirish va tashxis (II bob)
`ishga_tushirish` — to‘liq hisob (namunaviy holat, 600 ssenariyli ommaviy sinov, sezgirlik tahlili). Veb-simulyator («Kondensat AI») bilan bir xil tasodifiy sonlar generatori (`js_rand.m`) ishlatiladi: 600 ssenariyning barchasida natijalar bir xil (v2 modeli: zL chegarasi `M.zT` o‘qitishdan o‘rganiladi, IF tanlamasi takrorsiz, o‘qitishda 1/2 nasosli rejimlar almashadi — JS bilan qayta tekshirilgan).

## 2. Bashoratlovchi boshqaruv tajribasi (III bob)
```
ommaviy_mpc(1, 200)          % 200 ssenariy x 4 boshqaruv varianti = 800 simulyatsiya
```
- `ssenariylar.mat` — Python tajribasidagi 200 ssenariy parametrlari va har qadamdagi tasodifiy sonlar (ikki realizatsiya aynan bir xil sharoitda ishlaydi).
- `mpc_parametrlar.m` — parametrlar; `M.solver = 'admm'` (OSQP algoritmi, tez) yoki `'qp'` (MATLAB'da quadprog, Octave'da qp).
- `mpc_yechim.m` — MPC masalasi (3.1)–(3.7), zichlashtirilgan QP; `admm_tayyorlash.m`, `admm_qp.m` — OSQP algoritmi; `qp_yech.m` — faol to‘plam usuli.
- `xavf_mpc.m`, `simulyatsiya_mpc.m` — xavf indeksi, Kalman filtri, to‘rt variant (operator, MPC, MPC+R, MPC+R+FT).
- Natija: `natijalar/mpc_natijalar_matlab.csv` (800 qator). Python natijalari bilan: SIS tripi 800/800 mos, eng kichik zaxira farqi mediana 0,005 %, eng kattasi 0,83 %.
- Hisob vaqti: Octave'da ADMM bilan bir simulyatsiya 2–10 s.

## 3. Simulink modeli
`simulink_model_yaratish('f4')` — bitta rezervuar blok-sxemasini avtomatik quradi va ishga tushiradi (MATLAB + Simulink kerak).
Simulink bo‘lmagan muhitda tekshirish: `addpath('sl')` — Simulink API emulyatori (new_system, add_block, add_line, sim...) ulanadi va skript o‘zgarishsiz bajariladi. Natija (`natijalar/simulink_f1..f4.*`): Euler modeli bilan sath farqi ≤ 6·10⁻⁴ %, trip/ogohlantirish/diagnostika vaqtlari bir xil.
Eslatma: emulyator blok parametrlarini faqat qiymat sifatida o‘qiydi; real Simulink'da birinchi ishga tushirishda blok parametr nomlari kutubxona bilan mosligini ko‘rib chiqing.

Qo‘shimcha toolbox kerak emas (quadprog faqat `M.solver='qp'` tanlansa).

## 4. Namoyish va ekran yozuvi (himoya uchun video)
`namoyish_matlab` — hisoblarni 6 bosqichda ketma-ket ko‘rsatadi: model kodi va parametrlar → Isolation Forest o‘qitish → DCS datchigi qotgan ssenariy (grafik bilan) → 600 ssenariy natijalari → MPC (4 variant) va MATLAB ↔ Python solishtiruvi (800/800) → Simulink modeli.
1. MATLAB’da shu papkani Current Folder qiling.
2. Ekran yozuvini yoqing: Windows’da Win+Alt+R (Xbox Game Bar) yoki OBS Studio.
3. Command Window: `namoyish_matlab` — har bosqichdan keyin tugma bosasiz; `namoyish_matlab(false)` — hammasi avtomatik.
Kompyuterda Simulink bo‘lsa, 6-bosqichda haqiqiy Simulink modeli quriladi va oynada ochiladi; bo‘lmasa, sl/ emulyatori ishlatiladi (ekranda yoziladi).
Alohida buyruqlar: `mpc_namoyish(154)` — bitta ssenariy to‘rt boshqaruv variantida; `taqqoslash_mpc` — 800 simulyatsiyani solishtirish.
Eslatma: `namoyish_matlab.m`, `mpc_namoyish.m`, `taqqoslash_mpc.m` GNU Octave 8.4 da sinalgan; MATLAB’da birinchi marta ishga tushirishda xabarlarni kuzatib boring.

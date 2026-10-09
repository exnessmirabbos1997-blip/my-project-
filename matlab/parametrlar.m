function P = parametrlar()
%PARAMETRLAR  Model parametrlari (maqoladagi 1-jadval).
%  DCS ekranidan: ishlab chiqarish 174 m3/sutka, bosim 51,9 kPag, harorat 24 C.
%  P&ID dan: SIS mantiqi 1oo2 (OR), PVSV 54 / -1,8 kPag.
%  Qolganlari taxminiy — korxona qiymatlari bilan almashtiring.
P.V      = 500;     % rezervuar hajmi, m3 (taxminiy)
P.Qprod  = 174;     % ishlab chiqarish oqimi, m3/sutka (DCS ekrani)
P.Qpump  = 80;      % nasos unumi, m3/soat (taxminiy)
P.Qr     = 20;      % minimal (aylanma) oqim, m3/soat (taxminiy)
P.LAL    = 20;      % DCS Low alarm, %
P.LALL   = 10;      % SIS LALL, %
P.LAH    = 85;      % DCS High alarm, %
P.LAHH   = 90;      % SIS LAHH, %
P.P0     = 51.9;    % normal bosim, kPag
P.PAL    = 30;      % DCS bosim L alarm, kPag
P.PALL   = 15;      % DCS bosim LL alarm, kPag
P.PV     = -1.8;    % PVSV vakuum sozlamasi, kPag (P&ID)
P.T0     = 24;      % harorat, C
P.vote   = '1oo2';  % SIS ovoz berish mantiqi: '1oo2' (P&ID) yoki '2oo2'
P.Th     = 60;      % indeks ufqi, min
P.Tresp  = 10;      % operator javob vaqti, min
P.w      = [0.20 0.50 0.15 0.15];  % indeks vaznlari w1..w4
P.RTH    = 0.45;    % ogohlantirish chegarasi
P.noise  = 1;       % o'lchash shovqini koeffitsiyenti
P.sev    = 0;       % nosozlik jiddiyligi (0 - tasodifiy)
P.dt     = 0.5;     % diskretlik, min (30 s)
P.N      = 1440;    % qadamlar soni (12 soat)
P.D3     = 0.9;     % diagnostika chegarasi (anomaliya)
P.DK     = 5;       % diagnostika uchun ketma-ket qadamlar
P.nTrees = 100;     % Isolation Forest daraxtlari
P.sub    = 256;     % Isolation Forest tanlanmasi
P.nTrain = 40;      % o'qitish uchun normal ssenariylar
P.useIF  = true;    % false — Isolation Forest'siz nazorat tajribasi
end

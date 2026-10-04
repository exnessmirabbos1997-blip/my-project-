%% ISHGA_TUSHIRISH — matematik modulning asosiy skripti
%  Yengil kondensat ombori: DCS va SIS ma'lumotlari asosida AI erta ogohlantirish.
%  Ishga tushirish: MATLAB'da shu papkani "Current Folder" qiling va F5 bosing.
%  Natijalar (rasmlar va jadvallar) 'natijalar' papkasiga saqlanadi.
clear; close all; clc;
if exist('OCTAVE_VERSION','builtin'), try, graphics_toolkit('gnuplot'); catch, end, end
P = parametrlar();
fprintf('Isolation Forest modeli o''qitilmoqda (%d ta normal ssenariy)...\n', P.nTrain);
M = model_oqitish(P, 7);

%% 1. Bitta holat (maqoladagi 3-rasm va 4-jadval)
bitta_ssenariy('f4', 2, 3, M, P);   % DCS sath datchigi qotdi, B rezervuar
bitta_ssenariy('f7', 2, 3, M, P);   % uch yo'lli klapan nosozligi
bitta_ssenariy('f5', 1, 3, M, P);   % gaz yostig'i yo'qoldi (vakuum)

%% 2. Ommaviy sinov (maqoladagi 5- va 6-jadval, 4-rasm)
%  To'liq hisob: 5 variant x (70 nosozlik + 50 normal). MATLAB'da bir necha daqiqa oladi.
S = ommaviy_sinov(5, 10, 50, P);

%% 3. Sezgirlik tahlili (ogohlantirish chegarasi)
sezgirlik_tahlili(10, 50, P);

%% 4. Simulink (ixtiyoriy, tekshirilmagan): simulink_model_yaratish('f4') — README ga qarang

function namoyish_matlab(kutish, toliq)
%NAMOYISH_MATLAB  Dissertatsiya hisoblarini MATLAB'da bosqichma-bosqich ko'rsatish (ekran yozuvi uchun).
%
%  Foydalanish:
%    1) Shu papkani MATLAB'da "Current Folder" qiling.
%    2) Ekran yozuvini yoqing (Windows: Win+Alt+R yoki OBS Studio).
%    3) Command Window'ga yozing:   namoyish_matlab
%
%  namoyish_matlab(true)        — har bosqichdan keyin tugma bosilishini kutadi (standart)
%  namoyish_matlab(false)       — hammasi avtomatik, bosqichlar orasida 3 s pauza
%  namoyish_matlab(true, true)  — 600 ssenariyli to'liq sinov ham qayta hisoblanadi (uzoq davom etadi)
%
%  Kompyuterda Simulink bo'lsa, 6-bosqichda haqiqiy Simulink modeli quriladi va ochiladi.
%  Simulink bo'lmasa, sl/ papkasidagi API emulyatori ishlatiladi va bu ekranda yoziladi.
if nargin < 1, kutish = true; end
if nargin < 2, toliq = false; end
clc; close all;
if exist('OCTAVE_VERSION', 'builtin'), muhit = ['GNU Octave ' OCTAVE_VERSION]; sl_bor = false;
else, muhit = ['MATLAB ' version]; sl_bor = license('test', 'Simulink') && ~isempty(ver('simulink')); end
fprintf('Yengil kondensat ombori: DCS–SIS integratsiyalashgan tahlil va MPC\n');
fprintf('Muhit: %s | Simulink: %s\n', muhit, ternar(sl_bor, 'bor', 'yo''q (emulyator ishlatiladi)'));

bosqich(1, 'Jarayon modeli kodi (2.1-paragraf)', ...
  'ombor_modeli.m — massa balansi (2.1), o''lchovlar (2.7), SIS 1oo2 mantiqi (2.8), yetti nosozlik.', kutish);
edit ombor_modeli.m
P = parametrlar();
disp(P);
kut(kutish);

bosqich(2, 'Isolation Forest o''qitish (2.2-paragraf)', ...
  'Algoritm faqat normal ish ssenariylarida o''qitiladi: 100 daraxt, tanlanma 256.', kutish);
t0 = tic; M = model_oqitish(P, 7);
fprintf('O''qitish tugadi: %.1f s\n', toc(t0));
kut(kutish);

bosqich(3, 'Bitta ssenariy: DCS sath datchigi qotdi (2.4-rasm, 2.12-jadval)', ...
  'Model, xavf indeksi R va sabab tashxisi bir ssenariyda.', kutish);
bitta_ssenariy('f4', 2, 3, M, P);
kut(kutish);
bitta_ssenariy('f7', 2, 3, M, P);
kut(kutish);
close all;

bosqich(4, '600 ssenariyli sinov (2.7-jadval)', ...
  ternar(toliq, 'To''liq hisob: 5 variant x (70 nosozlik + 50 normal).', ...
  'Oldindan hisoblangan natija ko''rsatiladi; qayta hisoblash uchun namoyish_matlab(true, true).'), kutish);
if toliq
  S = ommaviy_sinov(5, 10, 50, P); %#ok<NASGU>
else
  type(fullfile('natijalar', 'jadval5_usullar.csv'));
end
kut(kutish);

bosqich(5, 'Bashoratlovchi boshqaruv (3.2-rasm, 3.6 va 3.9-jadvallar)', ...
  'Bitta ssenariy to''rt variantda, so''ng 800 ta simulyatsiyaning MATLAB va Python natijalari solishtiriladi.', kutish);
mpc_namoyish(154);
taqqoslash_mpc;
kut(kutish);

bosqich(6, 'Simulink modeli (3.3-paragraf, 4-ilova)', ...
  ternar(sl_bor, 'Haqiqiy Simulink: blok-sxema skript bilan quriladi, ishga tushiriladi va Euler modeli bilan solishtiriladi.', ...
  'Simulink yo''q: sl/ papkasidagi API emulyatori ishlatiladi (haqiqiy Simulink emas).'), kutish);
if ~sl_bor, addpath('sl'); end
simulink_model_yaratish('f4', P);
fprintf('\nNamoyish tugadi. Rasm va jadvallar ''natijalar'' papkasida.\n');
end

function bosqich(n, sarlavha, izoh, kutish)
fprintf('\n%s\n%d-BOSQICH. %s\n%s\n%s\n', repmat('=', 1, 70), n, sarlavha, izoh, repmat('=', 1, 70));
if ~kutish, pause(3); end
end

function kut(kutish)
if kutish, fprintf('\n[Davom etish uchun istalgan tugmani bosing]\n'); pause; else, pause(3); end
end

function s = ternar(c, a, b)
if c, s = a; else, s = b; end
end

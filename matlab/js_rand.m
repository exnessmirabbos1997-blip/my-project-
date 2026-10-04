function x = js_rand(seed)
%JS_RAND  Mulberry32 psevdotasodifiy sonlar generatori — veb-simulyatordagi rngMake() bilan bit darajasida bir xil.
%  js_rand(seed) — urug'ni o'rnatadi;  x = js_rand() — [0,1) oralig'idagi navbatdagi son.
%  Ikkala platformada (HTML/JavaScript va MATLAB/Octave) bir xil ssenariylar hosil bo'lishi uchun ishlatiladi.
persistent a
M32 = 4294967296;
if nargin > 0, a = mod(double(seed), M32); x = []; return; end
a = mod(a + 1831565813, M32);                                   % a = a + 0x6D2B79F5 | 0
t = imul32(bitxor(a, floor(a/32768)), bitor(a, 1));             % t = imul(a ^ a>>>15, 1 | a)
t = bitxor(mod(t + imul32(bitxor(t, floor(t/128)), bitor(t, 61)), M32), t);
x = bitxor(t, floor(t/16384)) / M32;                            % ((t ^ t>>>14) >>> 0) / 2^32
end
function r = imul32(p, q)
% 32 bitli butun sonlar ko'paytmasining quyi 32 biti (JavaScript Math.imul)
pl = mod(p, 65536); ph = floor(p/65536); ql = mod(q, 65536); qh = floor(q/65536);
r = mod(pl*ql + mod(ph*ql + pl*qh, 65536)*65536, 4294967296);
end

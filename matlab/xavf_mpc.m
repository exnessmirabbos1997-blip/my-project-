function [Rl, Rh, h] = xavf_mpc(h, L, gap, P)
%XAVF_MPC  Bitta rezervuar uchun R indeksining past (LALL) va yuqori (LAHH) tashkil etuvchilari,
%  (2.17)-(2.19), Isolation Forest'siz. h — sath bahosi tarixi (oxirgi 11 qiymat, 5 min oyna).
h = [h L]; if numel(h) > 11, h = h(end-10:end); end
n = numel(h);
if n >= 6, v = (mean(h(end-2:end)) - mean(h(1:3)))/(0.5*(n-3)); else, v = 0; end
cl = @(x) min(1, max(0, x));
x4 = cl((gap - 1.5)/4.5);
LA = P.LAL; LT = P.LALL;
x1l = cl((2*LA - LT - L)/(2*(LA - LT)));
if v < -0.005, x2l = cl(1 - ((L - LT)/(-v))/P.Th); else, x2l = 0; end
LA = P.LAH; LT = P.LAHH;
x1h = cl((L - (2*LA - LT))/(2*(LT - LA)));
if v > 0.005, x2h = cl(1 - ((LT - L)/v)/P.Th); else, x2h = 0; end
w = P.w;
Rl = min(1, w(1)*x1l + w(2)*x2l + w(4)*x4);
Rh = min(1, w(1)*x1h + w(2)*x2h + w(4)*x4);
end

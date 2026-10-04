function [x, ok, it, ws] = admm_qp(K, q, l, u, ws)
%ADMM_QP  OSQP algoritmi (B. Stellato va hammualliflari) asosidagi QP yechuvchi:
%   min 0.5 x'Px + q'x,   l <= Cx <= u.
%  K — admm_tayyorlash() dan olingan oldindan masshtablangan va faktorlangan tuzilma
%  (P va C o'zgarmas, faqat q, l, u qadamdan qadamga o'zgaradi). ws — iliq start (x, z, y).
%  Python modulidagi OSQP sozlamalari: eps_abs = eps_rel = 1e-4, max_iter = 4000, alpha = 1.6.
D = K.D; E = K.E; c = K.c;
qs = c*(D.*q); ls = E.*l; us = E.*u;                 % masshtablangan masala
n = numel(q); m = numel(l);
if nargin < 5 || isempty(ws), x = zeros(n,1); z = min(max(K.C*x, ls), us); y = zeros(m,1);
else, x = ws.x; z = min(max(ws.z, ls), us); y = ws.y; end
rho = K.rho; sig = K.sigma; a = K.alpha; ok = false;
for it = 1:K.max_iter
  rhs = sig*x - qs + K.C'*(rho.*z - y);
  xt = K.R \ (K.R' \ rhs);                           % (P + sigma I + C' diag(rho) C) xt = rhs
  zt = K.C*xt;
  x = a*xt + (1-a)*x;
  zr = a*zt + (1-a)*z;
  zn = min(max(zr + y./rho, ls), us);
  y = y + rho.*(zr - zn);
  z = zn;
  if mod(it, 10) == 0                                % to'xtash mezonlari (asl masshtabda)
    Cx = K.C*x; Px = K.P*x; Cty = K.C'*y;
    rp = norm((Cx - z)./E, inf);
    rd = norm((Px + qs + Cty)./D, inf)/c;
    ep = 1e-4 + 1e-4*max(norm(Cx./E, inf), norm(z./E, inf));
    ed = 1e-4 + 1e-4*max([norm(Px./D, inf), norm(Cty./D, inf), norm(qs./D, inf)])/c;
    if rp <= ep && rd <= ed, ok = true; break; end
  end
end
ws = struct('x', x, 'z', z, 'y', y);
x = D.*x;                                            % asl o'zgaruvchilarga qaytish
end

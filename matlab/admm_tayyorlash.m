function K = admm_tayyorlash(P, C, eq)
%ADMM_TAYYORLASH  OSQP uslubidagi QP uchun Ruiz masshtablash va KKT matritsasini bir marta faktorlash.
%  P, C — o'zgarmas matritsalar; eq — tenglik ko'rinishidagi qatorlar (bu masalada yo'q).
n = size(P,1); m = size(C,1); if nargin < 3, eq = false(m,1); end
D = ones(n,1); E = ones(m,1); Ps = P; Cs = C; c = 1;
for k = 1:25                                         % Ruiz muvozanatlash
  dn = sqrt(max([max(abs(Ps),[],1); max(abs(Cs),[],1)], [], 1))'; dn(dn < 1e-4) = 1; dn = 1./dn;
  em = sqrt(max(abs(Cs),[],2)); em(em < 1e-4) = 1; em = 1./em;
  Ps = diag(dn)*Ps*diag(dn); Cs = diag(em)*Cs*diag(dn); D = D.*dn; E = E.*em;
end
K.P = Ps; K.C = Cs; K.D = D; K.E = E; K.c = 1;
K.sigma = 1e-6; K.alpha = 1.6; K.max_iter = 4000;
K.rho = 0.1*ones(m,1); K.rho(eq) = 1e3*0.1;
K.R = chol(Ps + K.sigma*eye(n) + Cs'*diag(K.rho)*Cs);   % R'R — Cholesky yoyilmasi
end

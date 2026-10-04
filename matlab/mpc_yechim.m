function [q0, a0, ok] = mpc_yechim(Ll0, Lr0, Qin, qmax, tgt, lmin, lmax, act, qprev, M)
%MPC_YECHIM  Bashoratlovchi boshqaruv masalasini (3.1)-(3.7) kvadratik dasturlash ko'rinishida yechish.
%  O'zgaruvchilar: z = [q(1..N); a(1..N); sl; sh; st] — quyish oqimi, burilgan kirish oqimi,
%  past/yuqori himoya va reja cheklovlarining yumshatish o'zgaruvchilari. Holatlar (sath)
%  bashorat modeli (3.1) orqali o'zgaruvchilardan chiqarib tashlangan (zichlashtirilgan shakl):
%    Ll(i) = Ll0 + k*sum_{j<=i}(a_j - q_j),   Lr(i) = Lr0 + k*sum_{j<=i}(Qin - a_j),  k = 100h/(60V).
persistent z0 Mc ws
N = M.N; k = M.k; n = 5*N; iq = 1:N; ia = N+1:2*N; isl = 2*N+1:3*N; ish = 3*N+1:4*N; ist = 4*N+1:5*N;
if isempty(Mc) || Mc.N ~= N || Mc.k ~= k        % o'zgarmas matritsalar bir marta quriladi
  T = tril(ones(N)); Z = zeros(N); I = eye(N); D = eye(N) - diag(ones(N-1,1),-1);
  Mc.N = N; Mc.k = k;
  Mc.H = zeros(n); Mc.H(iq,iq) = 2*M.rq*(D'*D); Mc.H = Mc.H + M.reg*eye(n);
  Mc.A = [ k*T, -k*T, -I,  Z,  Z;                % Ll(i) + sl_i >= lmin
           Z,  -k*T,  Z,  -I,  Z;                % Lr(i) - sh_i <= lmax
           k*T, -k*T,  Z,  Z, -I];               % Ll(i) + st_i >= tgt
  z0 = []; ws = [];
  Hp = zeros(n); Hp(iq,iq) = 2*M.rq*(D'*D);             % ADMM uchun regulyarizatsiyasiz P
  Mc.K = admm_tayyorlash(Hp, [Mc.A; eye(n)]);
end
% --- maqsad funksiyasi: act*sum Ll + rho_s*(sl+sh) + rho_t*act*st + c_a*a + r_q*sum dq^2
w = (N:-1:1)';                                % sum_i cum_i(x) = sum_j (N-j+1) x_j
f = zeros(n,1);
f(iq) = -act*k*w;  f(ia) = act*k*w + M.ca;
f(isl) = M.rs; f(ish) = M.rs; f(ist) = M.rt*act;
f(1) = f(1) - 2*M.rq*qprev;                   % r_q*(q1 - qprev)^2 ning chiziqli qismi
% H: r_q*sum dq^2 va kichik regulyarizatsiya; A: cheklovlar A*z <= b (yuqorida bir marta quriladi)
H = Mc.H; A = Mc.A;
b = [ (Ll0-lmin)*ones(N,1);
      lmax - Lr0 - k*Qin*(1:N)';
      (Ll0-tgt)*ones(N,1)];
lb = zeros(n,1); ub = [qmax*ones(N,1); Qin*ones(N,1); inf(3*N,1)];
if strcmp(M.solver, 'admm')                      % OSQP algoritmi (Python moduli bilan bir xil usul)
  [z, ok, ~, ws] = admm_qp(Mc.K, f, [-inf(3*N,1); lb], [b; ub], ws);
  ok = true;                                     % OSQP kabi: iteratsiyalar tugasa ham oxirgi yaqinlashish olinadi
else                                             % faol to'plam usuli (MATLAB quadprog / Octave qp)
  if numel(z0) ~= n, z0 = zeros(n,1); end
  [z, ok] = qp_yech(H, f, A, b, lb, ub, min(max(z0,lb),ub));
  if ok, z0 = z; end                             % keyingi qadam uchun iliq start
end
if ok, q0 = z(1); a0 = z(N+1); else, q0 = 0; a0 = 0; if act > 0, q0 = qprev; end, end
end

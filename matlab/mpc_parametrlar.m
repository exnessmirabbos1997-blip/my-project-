function M = mpc_parametrlar()
%MPC_PARAMETRLAR  Jarayon va MPC parametrlari (2.1-paragraf, 3.2-jadval).
P.V = 500; P.Qprod = 174; P.Qpump = 80; P.LAL = 20; P.LALL = 10; P.LAH = 85; P.LAHH = 90;
P.dt = 0.5; P.N = 1440; P.Tresp = 10; P.w = [0.20 0.50 0.15 0.15]; P.Th = 60;
M.P = P;
M.N = 30;                    % bashorat gorizonti, qadam
M.h = 2;                     % boshqaruv qadami, min
M.k = 100*M.h/(60*P.V);      % bashorat modeli koeffitsiyenti (3.1)
M.rs = 1e3;                  % xavfsizlik jarimasi rho_s
M.rt = 2e2;                  % reja jarimasi rho_t
M.ca = 0.5;                  % kirish oqimini burish narxi
M.rq = 1e-3;                 % buyruq silliqligi r_q
M.solver = 'admm';           % 'admm' (OSQP algoritmi) yoki 'qp' (faol to'plam)
M.reg = 1e-6;                % QP regulyarizatsiyasi (Octave qp uchun)
end

function mpc_namoyish(j)
%MPC_NAMOYISH  Bitta ssenariyni to'rt boshqaruv variantida hisoblash va natijani jadval ko'rinishida chiqarish.
%  mpc_namoyish(154) — DCS sath datchigi qotgan ssenariy (3.2-rasmdagi misol).
D = load('ssenariylar.mat'); M = mpc_parametrlar(); S = ssenariy_ol(D, j);
nom = struct('normal','Normal ish','f1','Quyish to''xtatilmadi','f3','Kirish oqimi keskin oshdi','f4','DCS sath datchigi qotdi');
fprintf('\nSsenariy %d: %s (quyilayotgan rezervuar: %d, rejadagi sath: %.1f %%)\n', j, nom.(S.kind), S.load, S.tgt);
C = {'operator','mpc','mpc_r','mpc_rft'}; N = {'Operator','Oddiy MPC','MPC+R','MPC+R+FT'};
fprintf('%-12s %9s %20s %18s %8s\n', 'Variant', 'SIS trip', 'eng past sath, %', 'diagnostika, min', 'vaqt, s');
for c = 1:4
  t0 = tic; r = simulyatsiya_mpc(S, C{c}, M);
  if r.trip, tr = 'HA'; else, tr = 'yo''q'; end
  fprintf('%-12s %9s %20.1f %18.1f %8.1f\n', N{c}, tr, r.minL, r.diag_min, toc(t0));
end
end

function [z, ok] = qp_yech(H, f, A, b, lb, ub, z0)
%QP_YECH  min 0.5*z'Hz + f'z,  A*z <= b,  lb <= z <= ub.
%  MATLAB'da Optimization Toolbox'dagi quadprog, GNU Octave'da ichki qp funksiyasi ishlatiladi.
if exist('quadprog', 'file') == 2 && ~exist('OCTAVE_VERSION', 'builtin')
  opt = optimoptions('quadprog', 'Display', 'off');
  [z, ~, flag] = quadprog(H, f, A, b, [], [], lb, ub, z0, opt);
  ok = flag > 0;
else
  [z, ~, info] = qp(z0, H, f, [], [], lb, ub, [], A, b);
  ok = any(info.info == [0 3]);   % 0 — yechim topildi, 3 — iteratsiyalar chegarasi (yaqin yechim)
end
end

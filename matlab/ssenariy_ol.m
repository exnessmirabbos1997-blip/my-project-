function S = ssenariy_ol(D, j)
%SSENARIY_OL  ssenariylar.mat faylidan j-ssenariyni o'qish (Python tajribasidagi bilan bir xil).
%  Ustunlar: tur, i, recv, load, L0(A), L0(B), loadAt, np, u, tgt, surge, freeze, ftPlan, stopDelay, b(2x3)
kinds = {'normal','f1','f3','f4'}; c = D.SC(j,:);
S.kind = kinds{c(1)}; S.i = c(2); S.recv = c(3); S.load = c(4); S.L0 = c(5:6);
S.loadAt = c(7); S.np = c(8); S.u = c(9); S.tgt = c(10); S.surge = c(11); S.freeze = c(12);
S.ftPlan = c(13); S.stopDelay = c(14); S.b = reshape(c(15:20), 3, 2)';
S.bg = squeeze(D.BG(j, 1:D.NBG(j), :)); if D.NBG(j) == 1, S.bg = S.bg(:)'; end
if D.NBG(j) == 0, S.bg = zeros(0, 3); end
S.noise = squeeze(D.NOISE(j, :, :));
end

function ommaviy_mpc(j1, j2, fayl)
%OMMAVIY_MPC  j1..j2 ssenariylarini to'rt boshqaruv variantida hisoblab, natijani CSV ga yozish.
%  Python tajribasidagi 4 holat x 50 ssenariy x 4 variant = 800 simulyatsiyaning MATLAB nusxasi.
if nargin < 3, fayl = 'mpc_natijalar_matlab.csv'; end
D = load('ssenariylar.mat'); M = mpc_parametrlar();
C = {'operator','mpc','mpc_r','mpc_rft'};
fid = fopen(fayl, 'w');
fprintf(fid, ['kind,i,ctrl,trip,trip_ll,trip_hh,minL,maxL,zone_min,ship,', ...
  'done_min,diag_min,Rmax\n']);
for j = j1:j2
  S = ssenariy_ol(D, j);
  for c = 1:4
    r = simulyatsiya_mpc(S, C{c}, M);
    fprintf(fid, '%s,%d,%s,%d,%d,%d,%.6f,%.6f,%.2f,%.6f,%.2f,%.2f,%.4f\n', S.kind, S.i, C{c}, ...
      r.trip, r.trip_ll, r.trip_hh, r.minL, r.maxL, r.zone_min, r.ship, r.done_min, r.diag_min, r.Rmax);
  end
  if exist('OCTAVE_VERSION','builtin'), fflush(fid); end; fprintf('%d/%d\n', j, j2);
end
fclose(fid);
end

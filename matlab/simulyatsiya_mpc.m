function r = simulyatsiya_mpc(S, ctrl, M)
%SIMULYATSIYA_MPC  Ikki rezervuarli ombor: operator va MPC boshqaruv variantlarini bir xil ssenariyda solishtirish.
%  ctrl: 'operator' | 'mpc' | 'mpc_r' | 'mpc_rft'  (3.4-jadval)
%  S — ssenariy (ssenariy_ol.m), S.noise — har qadamdagi 8 ta normal son (Python tajribasi bilan bir xil).
%  Python modulidagi simulyatsiya() funksiyasining MATLAB tilidagi aynan nusxasi.
P = M.P; dt = P.dt; N = P.N; recv = S.recv; load = S.load; kind = S.kind;
lv = S.L0; b = S.b; PCT = dt*100/(P.V*60);
qmax = S.np*S.u*P.Qpump;
pumpOn = false; stopAt = -1; frozen = NaN; ft = -1;
inlet_open = [true true]; trip_ll = [false false]; trip_hh = [false false];
shipped = 0; planned = (S.L0(load) - S.tgt)*P.V/100;
Lmin_true = [100 100]; Lmax_true = [0 0];
alarm_zone = 0; diag_cnt = [0 0]; fault = [false false]; diag_at = -1;
q_cmd = 0; a_cmd = 0; a_hold = 0; ou = 0;
opL = 0; opH = 0; op_stop_at = -1; op_div_at = -1; diverted = false;
hist = {[], []}; kx = S.L0; kP = [1 1];          % xavf indeksi tarixi, Kalman holati va dispersiyasi
loaded_done = false; done_at = -1; Rmax = zeros(N,1);
for k0 = 0:N-1                                    % k0 — Python'dagi 0 dan boshlanuvchi qadam raqami
  e = S.noise(k0+1,:);
  ou = ou + (-ou/60)*dt + 0.25*sqrt(dt)*e(1);
  Qin = P.Qprod/24*(1 + 0.08*ou);
  for j = 1:size(S.bg,1)
    if S.bg(j,1) <= k0 && k0 < S.bg(j,1) + S.bg(j,2), Qin = Qin*S.bg(j,3); end
  end
  if strcmp(kind,'f3') && k0 >= S.ftPlan
    Qin = Qin*S.surge; if ft < 0, ft = k0; end
  end
  Qm = Qin*(1 + e(2)*0.02);
  % --- o'lchovlar
  Ld = zeros(1,2); S1 = Ld; S2 = Ld;
  for i = 1:2
    Ld(i) = lv(i) + b(i,1) + e(3*i)*0.15;
    S1(i) = lv(i) + b(i,2) + e(3*i+1)*0.10;
    S2(i) = lv(i) + b(i,3) + e(3*i+2)*0.10;
  end
  if strcmp(kind,'f4') && isnan(frozen) && pumpOn && Ld(load) <= S.freeze
    frozen = Ld(load); ft = k0;
  end
  if ~isnan(frozen), Ld(load) = frozen; end
  % --- diagnostika (3.12): DCS va SIS farqi > 4,2 % ketma-ket 5 o'lchov
  for i = 1:2
    gap = abs(Ld(i) - (S1(i)+S2(i))/2);
    if gap > 4.2, diag_cnt(i) = diag_cnt(i) + 1; else, diag_cnt(i) = 0; end
    if diag_cnt(i) >= 5 && ~fault(i)
      fault(i) = true; if diag_at < 0, diag_at = k0; end
    end
  end
  % --- boshqaruv
  if ~pumpOn && ~loaded_done && k0 >= S.loadAt && ~trip_ll(load), pumpOn = true; end
  a_cmd = 0;
  if strcmp(ctrl,'operator')
    if pumpOn, q_cmd = qmax; else, q_cmd = 0; end
    if pumpOn && stopAt < 0 && ~strcmp(kind,'f1') && Ld(load) <= S.tgt, stopAt = k0 + S.stopDelay; end
    if Ld(load) <= P.LAL, opL = opL + 1; else, opL = 0; end
    if opL == 3 && op_stop_at < 0, op_stop_at = k0 + fix(P.Tresp/dt); end
    stopNow = (stopAt >= 0 && k0 >= stopAt) || ...
              (op_stop_at >= 0 && k0 >= op_stop_at);
    if pumpOn && stopNow
      pumpOn = false; loaded_done = true;
    end
    if Ld(recv) >= P.LAH, opH = opH + 1; else, opH = 0; end
    if opH == 3 && op_div_at < 0, op_div_at = k0 + fix(P.Tresp/dt); end
    if op_div_at >= 0 && k0 >= op_div_at, diverted = true; end
    if diverted, a_cmd = Qm; end
    if ~pumpOn, q_cmd = 0; end
  else
    % Kalman bahosi (3.10): bashorat — oldingi buyruqlar bo'yicha massa balansi; o'lchov — DCS,
    % mpc_rft da nosozlik aniqlangach SIS o'lchagichlari o'rtachasi (3.12)
    for i = 1:2
      if strcmp(ctrl,'mpc_rft') && fault(i), z = (S1(i)+S2(i))/2; else, z = Ld(i); end
      if k0 == 0, kx(i) = z; end
      if i == recv, dL = (Qm - a_hold)*PCT; else, dL = (a_hold - q_cmd)*PCT; end
      kx(i) = kx(i) + dL; kP(i) = kP(i) + 0.01;
      if isfinite(z)
        K = kP(i)/(kP(i) + 0.03); kx(i) = kx(i) + K*(z - kx(i)); kP(i) = kP(i)*(1 - K);
      end
    end
    Lm = kx;
    [Rl, ~, hist{load}] = xavf_mpc(hist{load}, Lm(load), abs(Ld(load) - (S1(load)+S2(load))/2), P);
    [~, Rh, hist{recv}] = xavf_mpc(hist{recv}, Lm(recv), abs(Ld(recv) - (S1(recv)+S2(recv))/2), P);
    if strcmp(ctrl,'mpc'), ml = 2; mh = 2; else, ml = 2 + 10*Rl; mh = 2 + 10*Rh; end   % (3.6)
    Rmax(k0+1) = max(Rl, Rh);
    active = pumpOn && ~loaded_done;
    if mod(k0,4) == 0
      if active, qm_ = qmax; else, qm_ = 0; end
      [qn, an] = mpc_yechim(Lm(load), Lm(recv), Qm, qm_, S.tgt, P.LAL+ml, P.LAH-mh, double(active), q_cmd, M);
      if active, q_cmd = max(0, min(qmax, qn)); else, q_cmd = 0; end
      a_hold = max(0, min(Qm, an));
    end
    a_cmd = a_hold;
    if active && Lm(load) <= S.tgt + 0.3 && q_cmd < 1, loaded_done = true; pumpOn = false; end
    if ~(pumpOn && ~loaded_done), q_cmd = 0; end
  end
  if trip_ll(load), q_cmd = 0; pumpOn = false; end
  % --- jarayon (2.1)
  if inlet_open(recv), qin_recv = Qin - min(a_cmd, Qin); else, qin_recv = 0; end
  if inlet_open(load), qin_load = min(a_cmd, Qin); else, qin_load = 0; end
  lv(recv) = min(100, max(0, lv(recv) + qin_recv*PCT));
  if lv(load) > 0, out = q_cmd; else, out = 0; end
  lv(load) = min(100, max(0, lv(load) + (qin_load - out)*PCT));
  shipped = shipped + out*dt/60;
  % --- SIS 1oo2 (2.8)
  for i = 1:2
    if min(S1(i),S2(i)) <= P.LALL && ~trip_ll(i)
      trip_ll(i) = true; if i == load, pumpOn = false; end
    end
    if max(S1(i),S2(i)) >= P.LAHH && ~trip_hh(i)
      trip_hh(i) = true; inlet_open(i) = false;
    end
  end
  Lmin_true = min(Lmin_true, lv); Lmax_true = max(Lmax_true, lv);
  if lv(load) < P.LAL || lv(recv) > P.LAH, alarm_zone = alarm_zone + 1; end
  if loaded_done && done_at < 0, done_at = k0; end
end
if planned > 0, ship = shipped/planned; else, ship = 1; end
r = struct('trip', trip_ll(load) || trip_hh(recv), 'trip_ll', trip_ll(load), 'trip_hh', trip_hh(recv), ...
  'minL', Lmin_true(load), 'maxL', Lmax_true(recv), 'zone_min', alarm_zone*dt, 'ship', ship, ...
  'done_min', ifn(done_at >= 0, done_at*dt), 'diag_min', ifn(diag_at >= 0, diag_at*dt), 'Rmax', max(Rmax));
end
function y = ifn(c, v), if c, y = v; else, y = NaN; end, end

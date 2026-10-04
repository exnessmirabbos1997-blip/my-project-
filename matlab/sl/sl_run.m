function out = sl_run(G)
%SL_RUN  Blok-sxemani Simulink ode1 (qat'iy qadamli Euler) semantikasi bo'yicha bajarish.
%  Har qadamda: 1) bloklar chiqishlari topologik tartibda hisoblanadi (Integrator, Memory va
%  Transport Delay chiqishi faqat holatga bog'liq); 2) holatlar yangilanadi. To Workspace
%  bloki qiymatlarni har qadamda yozadi.
dt = str2double(G.par.FixedStep); T = str2double(G.par.StopTime); NS = round(T/dt) + 1;
nb = numel(G.bnames); L = G.lines; ty = G.btype; pr = G.bpar;
num = @(s) str2num(s); %#ok<ST2NM>
nin = zeros(1, nb); for i = 1:nb, m = L(L(:,3)==i, 4); if ~isempty(m), nin(i) = max(m); end, end
src = cell(1, nb); for i = 1:nb, src{i} = zeros(1, nin(i)); end
for r = 1:size(L,1), src{L(r,3)}(L(r,4)) = L(r,1); end   % har kirish portining manba bloki (1 chiqishli bloklar)
for i = 1:nb, assert(all(src{i} > 0) || nin(i) == 0, ['ulanmagan kirish: ' G.bnames{i}]); end
nofeed = ismember(ty, {'Integrator', 'Memory', 'Transport Delay', 'Constant', 'Step', 'Clock'});
% --- topologik tartib
ord = []; done = false(1, nb); dep = cell(1, nb);
for i = 1:nb, if nofeed(i), dep{i} = []; else, dep{i} = unique(src{i}); end, end
while numel(ord) < nb
  prog = false;
  for i = find(~done)
    if all(done(dep{i})), ord(end+1) = i; done(i) = true; prog = true; end %#ok<AGROW>
  end
  assert(prog, 'algebraik halqa aniqlandi');
end
% --- holatlar
x = zeros(1, nb); y = zeros(1, nb); st = zeros(1, nb); buf = cell(1, nb);
for i = 1:nb
  p = pr{i};
  switch ty{i}
    case 'Integrator', x(i) = num(p.InitialCondition);
    case 'Memory', x(i) = num(p.InitialCondition);
    case 'Transport Delay', buf{i} = zeros(1, NS);
    case 'Transfer Fcn', x(i) = 0;
  end
end
logi = find(strcmp(ty, 'To Workspace')); Ylog = []; tlog = zeros(NS, 1);
for n = 1:NS
  t = (n-1)*dt;
  for i = ord
    p = pr{i};
    switch ty{i}
      case 'Constant', y(i) = num(p.Value);
      case 'Step', if t >= num(p.Time), y(i) = num(p.After); else, y(i) = num(p.Before); end
      case 'Clock', y(i) = t;
      case 'Sum', s = p.Inputs; v = 0; for k = 1:numel(s), v = v + (2*(s(k)=='+')-1)*y(src{i}(k)); end, y(i) = v;
      case 'Product', s = p.Inputs; v = 1; for k = 1:numel(s), if s(k)=='*', v = v*y(src{i}(k)); else, v = v/y(src{i}(k)); end, end, y(i) = v;
      case 'Gain', y(i) = num(p.Gain)*y(src{i}(1));
      case 'Bias', y(i) = y(src{i}(1)) + num(p.Bias);
      case 'Abs', y(i) = abs(y(src{i}(1)));
      case 'MinMax', v = arrayfun(@(k) y(src{i}(k)), 1:nin(i)); if strcmp(p.Function,'min'), y(i) = min(v); else, y(i) = max(v); end
      case 'Compare To Constant', v = y(src{i}(1)); c = num(p.const);
        switch p.relop
          case '>=', y(i) = v >= c;   case '<=', y(i) = v <= c;
          case '>',  y(i) = v > c;    case '<',  y(i) = v < c;
          otherwise, y(i) = v == c;
        end
      case 'Logical Operator'
        if strcmp(p.Operator, 'NOT'), y(i) = double(~y(src{i}(1)));
        else, v = arrayfun(@(k) y(src{i}(k))~=0, 1:nin(i)); y(i) = double(all(v)); end
      case 'Data Type Conversion', y(i) = double(y(src{i}(1)));
      case 'Relay'
        if y(src{i}(1)) >= num(p.OnSwitchValue), st(i) = 1; elseif y(src{i}(1)) <= num(p.OffSwitchValue), st(i) = 0; end
        if st(i), y(i) = num(p.OnOutputValue); else, y(i) = num(p.OffOutputValue); end
      case 'Switch', if y(src{i}(2)) >= num(p.Threshold), y(i) = y(src{i}(1)); else, y(i) = y(src{i}(3)); end
      case 'Memory', y(i) = x(i);
      case 'Integrator', y(i) = x(i);
      case 'Transport Delay', d = round(num(p.DelayTime)/dt); if d >= 1 && n > d, y(i) = buf{i}(n-d); elseif d < 1, y(i) = NaN; else, y(i) = 0; end
      case 'Transfer Fcn', b = num(p.Numerator); a = num(p.Denominator);   % (b1 s + b0)/(a1 s + a0)
        y(i) = (b(2)/a(1) - b(1)*a(2)/a(1)^2)*x(i) + (b(1)/a(1))*y(src{i}(1));
      case 'Saturation', y(i) = min(num(p.UpperLimit), max(num(p.LowerLimit), y(src{i}(1))));
      case {'Mux', 'To Workspace', 'Scope'}, y(i) = 0;
      otherwise, error('emulyatorda yo''q blok turi: %s', ty{i});
    end
    if strcmp(ty{i}, 'Transport Delay') && isnan(y(i)), y(i) = y(src{i}(1)); end
  end
  % --- yozish (To Workspace <- Mux)
  for i = logi, mx = src{i}(1); Ylog(n, :) = y(src{mx}); end %#ok<AGROW>
  tlog(n) = t;
  % --- holatlarni yangilash (Euler)
  for i = 1:nb
    p = pr{i};
    switch ty{i}
      case 'Integrator'
        x(i) = x(i) + dt*y(src{i}(1));
        if isfield(p, 'LimitOutput') && strcmp(p.LimitOutput, 'on')
          x(i) = min(num(p.UpperSaturationLimit), max(num(p.LowerSaturationLimit), x(i)));
        end
      case 'Memory', x(i) = y(src{i}(1));
      case 'Transport Delay', buf{i}(n) = y(src{i}(1));
      case 'Transfer Fcn', a = num(p.Denominator); x(i) = x(i) + dt*(-(a(2)/a(1))*x(i) + y(src{i}(1)));
    end
  end
end
D = struct('simout_mat', Ylog, 'tout', tlog);
out.get = @(nm) D.(nm);
end

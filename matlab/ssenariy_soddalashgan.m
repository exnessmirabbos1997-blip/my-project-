function S = ssenariy_soddalashgan(kind, P)
%SSENARIY_SODDALASHGAN  Bitta rezervuar uchun deterministik ssenariy parametrlari (Simulink va ODE uchun umumiy).
%  kind: 'f1' quyish to'xtatilmadi, 'f2' sizish, 'f3' kirish oqimi oshdi, 'f4' DCS datchigi qotdi
S.kind=kind; S.tEnd=600; S.L0=60; S.t0=60; S.n=1; S.u=1; S.tgt=30; S.freezeLvl=NaN; S.leakQ=0; S.leakDelay=0;
S.surge=1; S.tSurge=1e9; S.bD=0.2; S.b1=0.1; S.b2=-0.1;
switch kind
  case 'f1', S.L0=70; S.tgt=NaN;                        % operator quyishni to'xtatmaydi
  case 'f2', S.L0=60; S.leakQ=40; S.leakDelay=10;       % operator to'xtatadi, 10 daqiqadan keyin sizish
  case 'f3', S.L0=75; S.t0=1e9; S.surge=6; S.tSurge=60; % nasos yo'q, kirish oqimi 6 baravar oshadi
  case 'f4', S.L0=70; S.freezeLvl=45;                   % DCS datchigi 45 % da qotadi
  otherwise, error('Noma''lum ssenariy: %s',kind);
end
S.P=P;
end

function [run, I, E, D] = bitta_ssenariy(kind, tank, seed, M, P)
%BITTA_SSENARIY  Bitta holatni hisoblash, grafik va voqealar jadvalini saqlash.
%  bitta_ssenariy('f4', 2, 3)  — DCS datchigi qotishi, B rezervuar, variant 3
if nargin<1, kind='f4'; end
if nargin<2, tank=2; end
if nargin<3, seed=3; end
if nargin<5, P=parametrlar(); end
if nargin<4 || isempty(M), M=model_oqitish(P,7); end
nomlar=struct('normal','Normal ish','f1','Quyish to''xtatilmadi','f2','Nasos to''xtagach sizish','f3','Kirish oqimi keskin oshdi', ...
  'f4','DCS sath datchigi qotdi','f5','Gaz yostig''i yo''qoldi (vakuum)','f6','Datchiklar signali yo''qoldi','f7','Uch yo''lli klapan nosozligi');
sabab=struct('none','nosozlik topilmadi','nan','signal yo''qolishi','freeze','DCS datchigi qotishi','press','gaz yostig''i yo''qolishi', ...
  'recirc','aylanma oqim boshqa rezervuarga','leak','sizish','surge','kirish oqimi oshishi','overrun','quyish to''xtatilmagan');
js_rand(seed); run=ombor_modeli(kind,tank,P);
I=[xavf_indeksi(run.tanks(1),M,P) xavf_indeksi(run.tanks(2),M,P)];
E=tahlil(run,I,P); D=sabab_tashxisi(run,I,P,E);
tn={'T-1A','T-1B'}; ty={'SIS LALL','SIS LAHH','PVSV vakuum'};
fprintf('\n=== %s (%s), variant %d ===\n', nomlar.(kind), tn{tank}, seed);
if E.a.trip>0, fprintf('Himoya hodisasi: %.1f min, %s, %s\n',(E.a.trip-1)*P.dt,tn{E.a.tripTank},ty{E.a.tripType});
else, fprintf('Himoya hodisasi bo''lmadi\n'); end
fprintf('Ogohlantirish muddati (hodisadan oldin): DCS alarm %s | AI indeksi %s | AI diagnostika %s\n', f(E.L.alarm), f(E.L.warn), f(E.L.diag));
fprintf('AI tashxisi: %s (%s)\n', sabab.(D.code), tn{D.tank});
% --- grafik
i=tank; o=run.tanks(i); t=((1:P.N)-1)*P.dt/60; R=I(i).R; pt=E.a.per(i).trip; if pt>0, R(pt+1:end)=NaN; end
fig=figure('Color','w','Position',[80 80 900 700]);
subplot(3,1,1); plot(t,o.Ld,'k','LineWidth',1.3); hold on; plot(t,(o.S1+o.S2)/2,'--','Color',[0 .45 .45],'LineWidth',1.1);
yl=[0 100]; plot(t([1 end]),[P.LAL P.LAL],':','Color',[.5 .5 .5]); plot(t([1 end]),[P.LALL P.LALL],'-.r'); plot(t([1 end]),[P.LAH P.LAH],':','Color',[.5 .5 .5]); plot(t([1 end]),[P.LAHH P.LAHH],'-.r');
ylim(yl); ylabel('Sath, %'); legend({'DCS','SIS (o''rtacha)'},'Location','northeast'); title(sprintf('%s — %s',nomlar.(kind),tn{i})); grid on; vl(run,E,i,P,yl);
subplot(3,1,2); plot(t,o.P,'k'); hold on; plot(t([1 end]),[P.PAL P.PAL],':','Color',[.5 .5 .5]); plot(t([1 end]),[P.PV P.PV],'-.r'); ylabel('Bosim, kPag'); grid on; yl2=[min(P.PV-3,min(o.P)) max(o.P)+3]; if any(isnan(yl2)), yl2=[P.PV-3 P.P0+5]; end; ylim(yl2); vl(run,E,i,P,yl2);
subplot(3,1,3); plot(t,R,'Color',[.72 .47 .12],'LineWidth',1.4); hold on; plot(t([1 end]),[P.RTH P.RTH],'--','Color',[.72 .47 .12]); ylim([0 1.05]); ylabel('Xavf indeksi R'); xlabel('Vaqt, soat'); grid on; vl(run,E,i,P,[0 1.05]);
if ~exist('natijalar','dir'), mkdir('natijalar'); end
print(fig,'-dpng','-r200',fullfile('natijalar',sprintf('ssenariy_%s_%s_v%d.png',kind,tn{tank},seed)));
% --- voqealar jadvali
q={}; for j=1:numel(run.ev), e=run.ev(j); q(end+1,:)={(e.k-1)*P.dt, e.src, e.code, tn{e.tank}, e.val}; end %#ok<AGROW>
saqlash_jadval(sprintf('voqealar_%s_%s_v%d',kind,tn{tank},seed),{'vaqt_min','manba','hodisa','rezervuar','qiymat'},q);
end
function s=f(x), if isnan(x), s='ishlamadi'; else, s=sprintf('%.1f min',x); end, end
function vl(run,E,i,P,yl)
if run.fT==i && run.ft>0, t=(run.ft-1)*P.dt/60; plot([t t],yl,':','Color',[.4 .4 .4]); end
pt=E.a.per(i).trip; if pt>0, t=(pt-1)*P.dt/60; plot([t t],yl,'r','LineWidth',1); end
end

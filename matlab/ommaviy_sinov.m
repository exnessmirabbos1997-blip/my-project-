function S = ommaviy_sinov(nVar, nF, nN, P)
%OMMAVIY_SINOV  Ko'p ssenariyli sinov: maqoladagi 5- va 6-jadvallar, 4-rasm.
%  S = ommaviy_sinov(5, 10, 50)  — 5 variant, har turdan 10 ta nosozlik, 50 ta normal ish
if nargin<1, nVar=5; end
if nargin<2, nF=10; end
if nargin<3, nN=50; end
if nargin<4, P=parametrlar(); end
F={'f1','f2','f3','f4','f5','f7'}; K=[F {'f6'}]; truth=struct('f1','overrun','f2','leak','f3','surge','f4','freeze','f5','press','f6','nan','f7','recirc');
M4={'alarm','warn','diag','comb'}; nm4={'Mavjud alarmlar (DCS)','AI indeksi R','AI diagnostika','Birgalikda'};
S=struct(); S.var=cell(1,nVar); t0=tic; runs={};
vlist=1:nVar; if isfield(P,'vlist'), vlist=P.vlist; end
kesh=''; if isfield(P,'keshPapka'), kesh=P.keshPapka; end
for v=1:nVar
  kf=''; if ~isempty(kesh), kf=fullfile(kesh,sprintf('ommaviy_v%d.mat',v)); end
  if ~isempty(kf) && exist(kf,'file'), L=load(kf); S.var{v}=L.r; runs=[runs; L.runv]; fprintf('  variant %d: keshdan olindi\n',v); continue; end
  if ~ismember(v,vlist), continue; end
  n0=size(runs,1);
  Mdl=model_oqitish(P,v*11); js_rand(v*100);   % o'qitish: urug' v*11 (+1 daraxtlar), baholash: urug' v*100
  r.lead=struct(); r.miss=zeros(1,4); r.fa=zeros(1,4); r.dx=zeros(1,2); r.nTrip=0;
  for j=1:4, r.lead.(M4{j})=[]; end
  for q=1:numel(K), kd=K{q}; r.per.(kd)=struct('alarm',[],'warn',[],'diag',[],'comb',[],'trip',0,'dx',[0 0]);
    for i=1:nF
      run=ombor_modeli(kd,mod(i-1,2)+1,P); I=[xavf_indeksi(run.tanks(1),Mdl,P) xavf_indeksi(run.tanks(2),Mdl,P)];
      E=tahlil(run,I,P); D=sabab_tashxisi(run,I,P,E);
      ok=strcmp(D.code,truth.(kd)) && D.tank==run.fT; r.per.(kd).dx=r.per.(kd).dx+[ok 1]; r.dx=r.dx+[ok 1];
      P0=P; P0.useIF=false; I0=[xavf_indeksi(run.tanks(1),Mdl,P0) xavf_indeksi(run.tanks(2),Mdl,P0)]; E0=tahlil(run,I0,P0); D0=sabab_tashxisi(run,I0,P0,E0);
      ok0=strcmp(D0.code,truth.(kd)) && D0.tank==run.fT;
      runs(end+1,:)={v,kd,run.fT,E.a.trip-1,E.a.tripType,E.L.alarm,E.L.warn,E.L.diag,E.L.comb,D.code,D.tank,double(ok),E0.L.warn,E0.L.comb,double(ok0),double(E.fired.comb),double(E0.fired.comb)}; %#ok<AGROW>
      if E.a.trip>0
        r.per.(kd).trip=r.per.(kd).trip+1;
        if ~strcmp(kd,'f6')
          r.nTrip=r.nTrip+1;
          for j=1:4, x=E.L.(M4{j}); r.per.(kd).(M4{j})(end+1)=x; if isnan(x), r.miss(j)=r.miss(j)+1; else, r.lead.(M4{j})(end+1)=x; end, end
        end
      end
    end
    fprintf('  variant %d/%d: %s tayyor (%.0f s)\n',v,nVar,kd,toc(t0));
  end
  for i=1:nN
    run=ombor_modeli('normal',1,P); I=[xavf_indeksi(run.tanks(1),Mdl,P) xavf_indeksi(run.tanks(2),Mdl,P)];
    E=tahlil(run,I,P); D=sabab_tashxisi(run,I,P,E);
    fr=[E.fired.alarm E.fired.warn E.fired.diag E.fired.comb]; r.fa=r.fa+fr; ok=strcmp(D.code,'none'); r.dx=r.dx+[ok 1];
    P0=P; P0.useIF=false; I0=[xavf_indeksi(run.tanks(1),Mdl,P0) xavf_indeksi(run.tanks(2),Mdl,P0)]; E0=tahlil(run,I0,P0); D0=sabab_tashxisi(run,I0,P0,E0);
    runs(end+1,:)={v,'normal',run.fT,-1,0,NaN,NaN,NaN,NaN,D.code,D.tank,double(ok),NaN,NaN,double(strcmp(D0.code,'none')),double(E.fired.comb),double(E0.fired.comb)}; %#ok<AGROW>
  end
  r.nN=nN; S.var{v}=r;
  if ~isempty(kf), runv=runs(n0+1:end,:); save('-v7',kf,'r','runv'); end
end
if any(cellfun(@isempty,S.var)), fprintf('Hali hisoblanmagan variantlar bor — jadvallar tuzilmadi.\n'); return; end
% --- 5-jadval: usullar bo'yicha (variantlar o'rtachasi [min–maks])
rows={};
for j=1:4
  mv=cellfun(@(r) mean(r.lead.(M4{j})),S.var); mn=cellfun(@(r) min([r.lead.(M4{j}) inf]),S.var);
  okv=cellfun(@(r) sum(r.lead.(M4{j})>=P.Tresp)/r.nTrip,S.var); ms=sum(cellfun(@(r) r.miss(j),S.var)); nt=sum(cellfun(@(r) r.nTrip,S.var));
  fa=cellfun(@(r) r.fa(j)/r.nN,S.var);
  rows(end+1,:)={nm4{j}, mean(mv), min(mv), max(mv), mean(mn), 100*mean(okv), sprintf('%d / %d',ms,nt), mean(fa)}; %#ok<AGROW>
end
fprintf('\n5-jadval. Usullarni solishtirish (%d variant)\n',nVar);
fprintf('%-26s %10s %14s %10s %10s %12s %8s\n','Usul','Lead, min','[min–maks]','Eng kichik','Yetarli,%','O''tk.','Soxta');
for j=1:4, fprintf('%-26s %10.1f   [%5.1f–%5.1f] %10.1f %10.0f %12s %8.2f\n',rows{j,:}); end
saqlash_jadval('jadval5_usullar',{'Usul','Orta_lead_min','Min_variant','Max_variant','Eng_kichik_lead_min','Yetarli_foiz','Otkazib_yuborilgan','Normal_signal_ulushi'},rows);
% --- 6-jadval: holat turlari bo'yicha
nmK=struct('f1','Quyish to''xtatilmadi','f2','Sizish','f3','Kirish oqimi oshdi','f4','DCS datchigi qotdi','f5','Gaz yostig''i yo''qoldi','f7','Uch yo''lli klapan nosozligi','f6','Signal yo''qoldi');
rows6={}; bars=zeros(numel(F),3);
for q=1:numel(K), kd=K{q}; c=cell(1,4);
  for j=1:4, x=cell2mat(cellfun(@(r) r.per.(kd).(M4{j}),S.var,'UniformOutput',false)); if strcmp(kd,'f6'), c{j}='—'; else, c{j}=sprintf('%.1f (%d o''tk.)',mean(x(~isnan(x))),sum(isnan(x))); if q<=numel(F) && j<=3, bars(q,j)=mean(x(~isnan(x))); end, end, end
  dx=sum(cell2mat(cellfun(@(r) r.per.(kd).dx(:)',S.var,'UniformOutput',false)'),1);
  rows6(end+1,:)={nmK.(kd), c{:}, sprintf('%d / %d',dx(1),dx(2))}; %#ok<AGROW>
end
dxA=sum(cell2mat(cellfun(@(r) r.dx(:)',S.var,'UniformOutput',false)'),1);
rows6(end+1,:)={'JAMI (normal ish bilan)','','','','',sprintf('%d / %d (%.1f %%)',dxA(1),dxA(2),100*dxA(1)/dxA(2))};
fprintf('\n6-jadval. Holat turlari bo''yicha (o''rtacha lead, min)\n');
for q=1:size(rows6,1), fprintf('%-28s | %-18s | %-18s | %-18s | %-18s | %s\n',rows6{q,:}); end
saqlash_jadval('jadval6_holatlar',{'Holat','DCS_alarm','AI_indeksi','AI_diagnostika','Birgalikda','Tashxis_togri'},rows6);
S.dx=dxA; S.runs=runs;
saqlash_jadval('ssenariylar_barchasi',{'variant','holat','nosozlik_rez','hodisa_k0','hodisa_turi','lead_DCS','lead_indeks','lead_diag','lead_birgalikda','tashxis','tashxis_rez','togri','lead_indeks_IFsiz','lead_birg_IFsiz','togri_IFsiz','signal_birg','signal_birg_IFsiz'},runs);
% ikkilik ko'rsatkichlar
isN=strcmp(runs(:,2),'normal'); okv=cell2mat(runs(:,12)); dxv=runs(:,10); nf=~isN;
TP=sum(nf & ~strcmp(dxv,'none')); FN=sum(nf)-TP; FP=sum(isN & ~strcmp(dxv,'none')); TN=sum(isN)-FP;
ev=nf & ~strcmp(runs(:,2),'f6'); wTP=sum(ev & ~isnan(cell2mat(runs(:,9)))); wFP=sum(isN & cell2mat(runs(:,16))>0); wTN=sum(isN)-wFP;
q7={'Tashxis (ikkilik: nosozlik bor/yo''q)',TP,FN,FP,TN,TP/(TP+FP),TP/(TP+FN),TN/(TN+FP);'Ogohlantirish (birgalikda)',wTP,sum(ev)-wTP,wFP,wTN,wTP/(wTP+wFP),wTP/sum(ev),wTN/(wTN+wFP)};
saqlash_jadval('jadval_ikkilik',{'Korsatkich','TP','FN','FP','TN','Precision','Recall','Specificity'},q7);
fprintf('\nTashxis: TP=%d FN=%d FP=%d TN=%d | Ogohlantirish: TP=%d FP=%d TN=%d\n',TP,FN,FP,TN,wTP,wFP,wTN);
okIF0=cell2mat(runs(:,15)); fprintf('Isolation Forest o''chirilganda tashxis: %d / %d\n',sum(okIF0),numel(okIF0));
% --- 4-rasm
fig=figure('Color','w','Position',[80 80 900 380]); h=bar(bars); grid on;
set(gca,'XTickLabel',{'Quyish','Sizish','Kirish oqimi','DCS qotdi','Gaz yostig''i','Uch yo''lli'});
ylabel('Himoya hodisasidan oldin, min'); legend({'Mavjud alarmlar (DCS)','AI indeksi','AI diagnostika'},'Location','northwest');
title(sprintf('Holat turlari bo''yicha o''rtacha ogohlantirish muddati (%d variant)',nVar));
if ~exist('natijalar','dir'), mkdir('natijalar'); end
print(fig,'-dpng','-r200',fullfile('natijalar','rasm4_holatlar.png'));
fprintf('\nJami vaqt: %.0f s. Natijalar "natijalar" papkasida.\n',toc(t0));
end

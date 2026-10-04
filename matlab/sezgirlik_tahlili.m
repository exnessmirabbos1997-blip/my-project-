function T = sezgirlik_tahlili(nF, nN, P)
%SEZGIRLIK_TAHLILI  Ogohlantirish chegarasi R* ta'siri: ogohlantirish muddati va soxta signal ulushi.
if nargin<1, nF=10; end
if nargin<2, nN=50; end
if nargin<3, P=parametrlar(); end
Mdl=model_oqitish(P,11); js_rand(500);
F={'f1','f2','f3','f4','f5','f7'}; R={}; trips=[]; froms=[];
for q=1:numel(F), for i=1:nF
  run=ombor_modeli(F{q},mod(i-1,2)+1,P); I=[xavf_indeksi(run.tanks(1),Mdl,P) xavf_indeksi(run.tanks(2),Mdl,P)]; E=tahlil(run,I,P);
  if E.a.trip>0, R{end+1}=[I.R]; trips(end+1)=E.a.trip; froms(end+1)=max(1,run.ft-round(10/P.dt)); end %#ok<AGROW>
end, end
Rn={}; for i=1:nN, run=ombor_modeli('normal',1,P); I=[xavf_indeksi(run.tanks(1),Mdl,P) xavf_indeksi(run.tanks(2),Mdl,P)]; Rn{end+1}=[I.R]; end %#ok<AGROW>
th=0.30:0.05:0.70; T=zeros(numel(th),4);
for a=1:numel(th)
  ld=[]; ms=0;
  for i=1:numel(R), N=numel(R{i})/2; r=reshape(R{i},N,2)';
    w=[birinchi_ketma(r(1,:)>=th(a),3,froms(i)) birinchi_ketma(r(2,:)>=th(a),3,froms(i))]; w(w<0)=inf; w=min(w);
    if isfinite(w) && w<=trips(i), ld(end+1)=(trips(i)-w)*P.dt; else, ms=ms+1; end %#ok<AGROW>
  end
  fa=0; for i=1:numel(Rn), N=numel(Rn{i})/2; r=reshape(Rn{i},N,2)'; if birinchi_ketma(r(1,:)>=th(a),3,1)>0 || birinchi_ketma(r(2,:)>=th(a),3,1)>0, fa=fa+1; end, end
  T(a,:)=[th(a) mean(ld) ms/numel(R) fa/numel(Rn)];
end
fprintf('\nSezgirlik tahlili: R* | o''rtacha lead, min | o''tkazib yuborilgan ulush | normal ishda signal ulushi\n');
fprintf('%6.2f | %8.1f | %6.2f | %6.2f\n',T');
q=num2cell(T); saqlash_jadval('sezgirlik_chegara',{'R_chegara','Orta_lead_min','Otkazib_ulush','Normal_signal_ulush'},q);
fig=figure('Color','w','Position',[80 80 760 420]);
yyaxis_ok=exist('yyaxis','file')==2 || exist('yyaxis','builtin')==5;
if yyaxis_ok
  yyaxis left; plot(th,T(:,2),'-o','LineWidth',1.4); ylabel('O''rtacha ogohlantirish muddati, min');
  yyaxis right; plot(th,100*T(:,4),'-s','LineWidth',1.4); ylabel('Normal ishda signal, %');
else
  [ax,h1,h2]=plotyy(th,T(:,2),th,100*T(:,4)); set(h1,'Marker','o'); set(h2,'Marker','s');
  ylabel(ax(1),'O''rtacha ogohlantirish muddati, min'); ylabel(ax(2),'Normal ishda signal, %');
end
xlabel('Ogohlantirish chegarasi R*'); grid on; title('Chegara tanlashdagi murosa');
if ~exist('natijalar','dir'), mkdir('natijalar'); end
print(fig,'-dpng','-r200',fullfile('natijalar','sezgirlik_chegara.png'));
end

function E = tahlil(run, I, P)
%TAHLIL  Himoya hodisasi, mavjud alarmlar, AI indeksi va diagnostika vaqtlari; ogohlantirish muddatlari.
dt=P.dt; from=1; if ~strcmp(run.kind,'normal') && run.ft>0, from=max(1,run.ft-round(10/dt)); end
for i=1:numel(run.tanks)
  o=run.tanks(i); [tk,ty]=sif_trip(o,P);
  sp=false(size(o.Ld)); if o.sisOK && strcmp(P.vote,'2oo2'), a=o.S1; b=o.S2; sp=isnan(a)|isnan(b)|min(a,b)<=P.LALL|max(a,b)>=P.LAHH; end
  al=isnan(o.Ld)|o.Ld<=P.LAL|o.Ld>=P.LAH|(o.pOK&(isnan(o.P)|o.P<=P.PAL))|sp;
  per(i)=struct('trip',tk,'type',ty,'alarm',birinchi_ketma(al,3,from),'warn',birinchi_ketma(I(i).R>=P.RTH,3,from), ...
    'diag',birinchi_ketma(I(i).d3|I(i).d4,P.DK,from)); %#ok<AGROW>
end
f={'trip','alarm','warn','diag'};
for j=1:4, v=[per.(f{j})]; v(v<0)=inf; [m,ii]=min(v); if isinf(m), a.(f{j})=-1; a.([f{j} 'Tank'])=0; else, a.(f{j})=m; a.([f{j} 'Tank'])=ii; end, end
a.tripType=0; if a.trip>0, a.tripType=per(a.tripTank).type; end; a.per=per;
ld=@(x) ifl(a.trip>0 && x>0 && x<=a.trip, (a.trip-x)*dt);
L.alarm=ld(a.alarm); L.warn=ld(a.warn); L.diag=ld(a.diag); c=[L.alarm L.warn L.diag]; c=c(~isnan(c));
if isempty(c), L.comb=NaN; else, L.comb=max(c); end
fired.alarm=a.alarm>0; fired.warn=a.warn>0; fired.diag=a.diag>0; fired.comb=fired.alarm||fired.warn||fired.diag;
E=struct('a',a,'L',L,'fired',fired);
end
function y=ifl(c,v), if c, y=v; else, y=NaN; end, end

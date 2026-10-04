function [k, ty] = sif_trip(o, P)
%SIF_TRIP  Birinchi himoya hodisasi: 1-LALL, 2-LAHH, 3-PVSV vakuum (k=-1 - yo'q).
if o.sisOK, ll=sis_ovoz(o.S1,o.S2,@(v) v<=P.LALL,P.vote); hh=sis_ovoz(o.S1,o.S2,@(v) v>=P.LAHH,P.vote);
else, ll=o.Ld<=P.LALL; hh=o.Ld>=P.LAHH; end
pv=false(size(o.Ld)); if o.pOK, pv=isfinite(o.P)&o.P<=P.PV+0.3; end
c=[fk(ll) fk(hh) fk(pv)]; c(c<0)=inf; [m,ty]=min(c);
if isinf(m), k=-1; ty=0; else, k=m; end
end
function j=fk(x), j=find(x,1); if isempty(j), j=-1; end, end

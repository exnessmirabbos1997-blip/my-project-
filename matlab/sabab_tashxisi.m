function D = sabab_tashxisi(run, I, P, E)
%SABAB_TASHXISI  Nosozlik sababini belgilar asosida aniqlash (maqoladagi 3-jadval).
%  Kodlar: none, nan, freeze, press, recirc, leak, surge, overrun
dt=P.dt; found=struct('code',{},'tank',{},'k',{}); pr={'nan','freeze','press','recirc','leak','surge','overrun'};
nt=numel(run.tanks);
for i=1:nt
  o=run.tanks(i); id=I(i); N=numel(o.Ld);
  kk=find(isnan(o.Ld)&(~o.sisOK|(isnan(o.S1)&isnan(o.S2))),1);
  if ~isempty(kk), found(end+1)=struct('code','nan','tank',i,'k',kk); continue; end %#ok<AGROW>
  W=round(10/dt); fr=-1;
  if o.sisOK
    for k=W+1:N
      seg=o.Ld(k-W:k); sm=(o.S1(k)+o.S2(k))/2; sm0=(o.S1(k-W)+o.S2(k-W))/2;
      if max(seg)-min(seg)<0.05 && abs(sm-sm0)>0.5 && abs(o.Ld(k)-sm)>3, fr=k-W; break; end
    end
  end
  if fr>0, found(end+1)=struct('code','freeze','tank',i,'k',fr); continue; end %#ok<AGROW>
  if o.pOK, pK=birinchi_ketma(id.mb==2&id.d3,5,1); else, pK=-1; end
  if pK>0, found(end+1)=struct('code','press','tank',i,'k',pK); continue; end %#ok<AGROW>
  if nt>1, oth=run.tanks(3-i); rK=birinchi_ketma(id.zL>id.zT&o.NP==0&oth.NP>0,10,1); else, rK=-1; end
  if rK>0, found(end+1)=struct('code','recirc','tank',i,'k',rK); continue; end %#ok<AGROW>
  lK=birinchi_ketma(id.mb==1&id.d3&o.NP==0&id.z<0,5,1); lK2=birinchi_ketma(id.zL<-id.zT&o.NP==0,10,1);
  if lK<0 || (lK2>0 && lK2<lK), lK=lK2; end
  if lK>0, found(end+1)=struct('code','leak','tank',i,'k',lK); continue; end %#ok<AGROW>
  qm=P.Qprod; sK=-1;
  if qm>0
    sK=birinchi_ketma(o.QIN>2.2*qm&id.slope>0,round(10/dt),1);
    if sK>0, hv=ovoz_yuqori(o.S1,o.S2,P.vote); hv(isnan(hv))=o.Ld(isnan(hv)); if ~any(hv(sK:end)>=P.LAH), sK=-1; end, end
  end
  if sK>0, found(end+1)=struct('code','surge','tank',i,'k',sK); continue; end %#ok<AGROW>
  if o.pOK
    base=o.P(1:min(N,round(60/dt))); base=sort(base(~isnan(base)));
    if ~isempty(base)
      pb=base(floor(numel(base)/2)+1); pk2=find(~isnan(o.P)&o.P<=P.PAL&o.P<pb-8,1);
      if ~isempty(pk2), s=pk2; for k=pk2:-1:2, if o.P(k)>=pb-2, s=k; break; end, end
        found(end+1)=struct('code','press','tank',i,'k',s); continue; end %#ok<AGROW>
    end
  end
  [tk,ty]=sif_trip(o,P);
  if qm>0 && tk>0 && ty==2, s=find(o.QIN(1:tk)>1.8*qm,1); if ~isempty(s), found(end+1)=struct('code','surge','tank',i,'k',s); continue; end, end %#ok<AGROW>
  lv=ovoz_past(o.S1,o.S2,P.vote); lv(isnan(lv))=o.Ld(isnan(lv)); oK=find(o.NP>0&lv<=P.LAL,1);
  if ~isempty(oK), found(end+1)=struct('code','overrun','tank',i,'k',oK); end %#ok<AGROW>
end
if isempty(found), D=struct('code','none','tank',max(1,E.a.tripTank),'k',-1); return; end
rank=zeros(1,numel(found)); for j=1:numel(found), rank(j)=find(strcmp(pr,found(j).code))*1e6+found(j).k; end
[~,j]=min(rank); D=found(j);
end

function I = xavf_indeksi(o, M, P)
%XAVF_INDEKSI  Dinamik xavf indeksi R(t) (maqoladagi (3)-(6) formulalar).
%  R = max_j(w1*x1j + w2*x2j) + w3*x3 + w4*x4
F=belgilar(o,P); N=numel(o.Ld); w=P.w; Th=P.Th; W0=max(2,round(5/P.dt)); cl=@(x) min(1,max(0,x));
lo=ovoz_past(o.S1,o.S2,P.vote); hi=ovoz_yuqori(o.S1,o.S2,P.vote);
LsL=lo; LsL(isnan(lo))=o.Ld(isnan(lo)); LsH=hi; LsH(isnan(hi))=o.Ld(isnan(hi));
v=F.slope; vp=F.dP; pk=o.P;
zL=2*P.LAL-P.LALL; zH=2*P.LAH-P.LAHH; zP=P.PAL+0.5*(P.PAL-P.PV);
x1=zeros(N,3); tt=inf(N,3);
x1(:,1)=cl((zL-LsL)/(zL-P.LALL))'; m=v<-0.005&~isnan(LsL); tt(m,1)=max(0,LsL(m)-P.LALL)./(-v(m));
x1(:,2)=cl((LsH-zH)/(P.LAHH-zH))'; m=v>0.005&~isnan(LsH); tt(m,2)=max(0,P.LAHH-LsH(m))./v(m);
if o.pOK, x1(:,3)=cl((zP-pk)/(zP-P.PV))'; m=vp<-0.005&~isnan(pk); tt(m,3)=max(0,pk(m)-P.PV)./(-vp(m)); end
x1(isnan(x1))=0; x2=cl(1-tt/Th);
s=w(1)*x1+w(2)*x2; [best,j]=max(s,[],2); [~,j2]=min(tt,[],2); j(best<=0)=j2(best<=0);
ix=sub2ind([N 3],(1:N)',j); x1j=x1(ix); x2j=x2(ix); ttj=tt(ix);
dead=(isnan(o.Ld)&isnan(o.S1)&isnan(o.S2))'; warm=((1:N)<=W0)';
if isfield(P,'useIF') && ~P.useIF, x3if=zeros(N,1); else, x3if=cl((iforest_baho(M,F.X)-M.smin)/(M.smax-M.smin)); end; x3if(dead)=0;   % P.useIF=false — nazorat tajribasi (Isolation Forest'siz)
x3mb=cl((abs(F.X(:,1))-3)/2); x3mb(dead|o.noPump)=0;
zp=min(0,F.dP(:)+(F.X(:,3)>0)*0.25)/(0.07*P.noise); x3pb=cl((abs(zp)-3)/2); x3pb(warm|dead|~o.pOK|o.noPump)=0;
zT=6.8; if isfield(M,'zT') && ~isempty(M.zT), zT=M.zT; end
x3lb=cl((abs(F.zL(:))-(zT-1.8))/2); x3lb(dead|o.noPump)=0;
x3=max([x3if x3mb x3pb x3lb],[],2); mb=2*ones(N,1); mb(x3==x3mb|x3==x3lb)=1; mb(x3==x3if)=0;
badD=isnan(o.Ld(:)); sm=(o.S1(:)+o.S2(:))/2; sm(isnan(o.S1))=o.S2(isnan(o.S1)); sm(isnan(o.S2))=o.S1(isnan(o.S2));
dd=abs(o.Ld(:)-sm); dd(isnan(dd))=0; d12=abs(o.S1(:)-o.S2(:)); d12(isnan(d12))=0; dd=max(dd,d12);
x4=cl((dd-1.5)/4.5); x4(badD)=1;
R=cl(w(1)*x1j+w(2)*x2j+w(3)*x3+w(4)*x4);
d3=~warm & (x3mb>=P.D3 | x3pb>=P.D3 | x3lb>=P.D3 | x3if>=0.98); d4=~warm & (x4>=0.6 | badD);
I=struct('R',R','x',[x1j x2j x3 x4],'sif',j','ttt',ttj','d3',d3','d4',d4','bad',badD','mb',mb','zL',F.zL,'zT',zT,'z',F.X(:,1)','slope',F.slope,'dP',F.dP);
end

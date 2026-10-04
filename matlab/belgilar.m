function F = belgilar(o, P)
%BELGILAR  Massa balansi qoldig'i z, z60, bosim tezligi va Isolation Forest belgilari (feat2 bilan bir xil).
%  z = (v - v_kut)/sigma,  sigma = sqrt((0,03k)^2 + (0,15 n q_n)^2)      (maqoladagi (3)-formula)
%  v — 5 daqiqalik oynada, oyna chetlaridagi uch o'lchov o'rtachasi bo'yicha hisoblangan sath tezligi.
N=numel(o.Ld); dt=P.dt; w=max(2,round(5/dt)); V=P.V; Qp=P.Qpump; nz=P.noise;
Sm=zeros(1,N);
for k=1:N
  a=o.S1(k); b=o.S2(k);
  if isnan(a) && isnan(b), Sm(k)=o.Ld(k); elseif isnan(a), Sm(k)=b; elseif isnan(b), Sm(k)=a; else, Sm(k)=(a+b)/2; end
end
ex=(o.VIN.*(o.QIN/24)-o.NP*Qp)*100/(V*60);
slope=zeros(1,N); dP=zeros(1,N); res=zeros(1,N); X=zeros(N,3);
qp=Qp*100/(V*60);
for k=1:N
  a=max(1,k-w); g=min(2,floor((k-a)/3)); span=max(1,k-a-g)*dt;
  slope(k)=(avg(Sm,k-g,k)-avg(Sm,a,a+g))/span;
  dP(k)=(avg(o.P,k-g,k)-avg(o.P,a,a+g))/span;
  e=avg(ex,a+1+floor(g/2),k-ceil(g/2)); if isnan(e), e=0; end
  res(k)=slope(k)-e;
  if isnan(slope(k)), slope(k)=0; end
  if isnan(dP(k)), dP(k)=0; end
  if isnan(res(k)), res(k)=0; end
  npk=o.NP(k); sg=sqrt((0.03*nz)^2+(0.15*npk*qp)^2);
  if k<=w, X(k,:)=[0 0 npk]; else, X(k,:)=[res(k)/sg, dP(k), npk]; end
end
% z60: nasos ishlamagan 60 daqiqalik oynadagi o'rtacha qoldiq
WL=round(60/dt); zL=zeros(1,N); acc=0; np0=0;
for k=1:N
  acc=acc+res(k); np0=np0+(o.NP(k)>0);
  if k>WL, acc=acc-res(k-WL); np0=np0-(o.NP(k-WL)>0); end
  if k>=WL+w+1 && np0==0, zL(k)=(acc/WL)/(0.03*nz/sqrt(WL*dt/5)); end
end
F=struct('Sm',Sm,'slope',slope,'res',res,'dP',dP,'X',X,'zL',zL);
end
function m=avg(x,i,j)
% i..j oralig'idagi NaN bo'lmagan qiymatlar o'rtachasi (ketma-ket yig'ish)
s=0; n=0;
for q=max(1,i):j, if ~isnan(x(q)), s=s+x(q); n=n+1; end, end
if n>0, m=s/n; else, m=NaN; end
end

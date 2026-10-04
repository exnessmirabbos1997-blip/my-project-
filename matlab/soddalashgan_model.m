function R = soddalashgan_model(kind, P, dt)
%SODDALASHGAN_MODEL  Bitta rezervuar — deterministik (shovqinsiz) matematik model, Euler usuli.
%  Simulink modelining mustaqil tekshiruvi va "sof" egri chiziqlar uchun.
%  Tenglamalar (vaqt — daqiqa, oqim — m3/soat):
%    dL/dt = 100*(Qkir*(1-HH) - Qchiq - Qsiz)/(60*V)          L in [0,100]
%    Qchiq = n*u*Qn * [t>=t0] * (1-OP) * (1-LL)               (operator va SIS LALL nasosni to'xtatadi)
%    LL = latch(S<=LALL), HH = latch(S>=LAHH), OP = latch(DCS<=tgt)
%    v = d/dt LP(S),  tau*dx/dt = S-x,  v=(S-x)/tau
%    x1=sat((zL-S)/(zL-LALL)), x2=sat(1-tau_t/Th),  tau_t=(S-LALL)/max(-v,1e-3), x4=sat((|DCS-S|-1,5)/4,5)
%    R = (w1*x1 + w2*x2 + w4*x4)/(w1+w2+w4)
if nargin<3, dt=0.05; end
S=ssenariy_soddalashgan(kind,P); N=round(S.tEnd/dt)+1; t=(0:N-1)*dt; V=P.V; Qp=P.Qpump; Qin0=P.Qprod/24;
tau=5; Th=P.Th; w=P.w; zL=2*P.LAL-P.LALL; k2=100/(60*V);
L=zeros(1,N); Ld=zeros(1,N); Sm=zeros(1,N); Rr=zeros(1,N); x1=zeros(1,N); x2=zeros(1,N); x4=zeros(1,N); v=zeros(1,N);
LL=zeros(1,N); HH=zeros(1,N); OP=zeros(1,N); FZ=zeros(1,N); pump=zeros(1,N); Qout=zeros(1,N); Qleak=zeros(1,N);
L(1)=S.L0; ll=0; hh=0; op=0; fz=0; x=0; dprev=S.L0+S.bD; kd=round(S.leakDelay/dt); opHist=zeros(1,N);
for k=1:N
  s1=L(k)+S.b1; s2=L(k)+S.b2; smin=min(s1,s2); smax=max(s1,s2); Sm(k)=(s1+s2)/2; draw=L(k)+S.bD;
  if ~isnan(S.freezeLvl) && -draw>=-S.freezeLvl, fz=1; end
  if fz, Ld(k)=dprev; else, Ld(k)=draw; end
  dprev=Ld(k); FZ(k)=fz;
  if -smin>=-P.LALL, ll=1; end
  if smax>=P.LAHH, hh=1; end
  if ~isnan(S.tgt) && -Ld(k)>=-S.tgt, op=1; end
  LL(k)=ll; HH(k)=hh; OP(k)=op; opHist(k)=op;
  pump(k)=(t(k)>=S.t0)&&~op&&~ll;
  Qout(k)=S.n*S.u*Qp*pump(k);
  if k>kd, dl=opHist(k-kd); else, dl=0; end
  Qleak(k)=S.leakQ*dl;
  sg=1+(S.surge-1)*(t(k)>=S.tSurge); Qin=Qin0*sg*(1-hh);
  v(k)=(Sm(k)-x)/tau;
  x1(k)=min(1,max(0,(zL-Sm(k))/(zL-P.LALL)));
  ttt=(Sm(k)-P.LALL)/max(-v(k),1e-3); x2(k)=min(1,max(0,1-ttt/Th));
  x4(k)=min(1,max(0,(abs(Ld(k)-Sm(k))-1.5)/4.5));
  Rr(k)=min(1,max(0,(w(1)*x1(k)+w(2)*x2(k)+w(4)*x4(k))/(w(1)+w(2)+w(4))));
  if k<N
    L(k+1)=min(100,max(0,L(k)+dt*k2*(Qin-Qout(k)-Qleak(k)))); x=x+dt*(Sm(k)-x)/tau;
  end
end
R=struct('t',t,'L',L,'Ld',Ld,'S',Sm,'R',Rr,'x1',x1,'x2',x2,'x4',x4,'LL',LL,'HH',HH,'OP',OP,'FZ',FZ,'pump',pump,'kind',kind,'P',P);
tr=find(LL>0|HH>0,1); if isempty(tr), R.tTrip=NaN; else, R.tTrip=t(tr); end
a=find(Rr>=P.RTH,1); if isempty(a), R.tWarn=NaN; else, R.tWarn=t(a); end
a=find(Ld<=P.LAL|Ld>=P.LAH,1); if isempty(a), R.tAlarm=NaN; else, R.tAlarm=t(a); end
a=find(x4>=0.6,1); if isempty(a), R.tDiag=NaN; else, R.tDiag=t(a); end
end

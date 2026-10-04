function run = ombor_modeli(kind, fT, P)
%OMBOR_MODELI  Ikki rezervuarli yengil kondensat ombori modeli (veb-simulyatordagi runPlant2 bilan bir xil).
%  run = ombor_modeli(kind, fT, P)
%  kind : 'normal','f1'..'f7';  fT : nosozlik rezervuari (1 = A, 2 = B)
%  Tasodifiy sonlar js_rand/js_gauss dan olinadi (urug'ni chaqiruvchi funksiya o'rnatadi).
%  Massa balansi (maqoladagi (1)-formula):  dL/dt = 100*(Qkir*s - n*u*Qn*c - Qm*c + Qm*m - Qsiz)/(60*V)  [%/min]
N=P.N; dt=P.dt; nz=P.noise; V=P.V; Qp=P.Qpump; pct=dt*100/(V*60); r=@() js_rand();
loading=true;
switch kind
  case 'normal', if r()<0.5, recv=1; else, recv=2; end; load=3-recv; loading=r()<0.85;
  case 'f3',     recv=fT; load=3-fT; loading=r()<0.5;
  case 'f7',     recv=fT; load=3-fT; loading=true;
  case {'f5','f6'}, if r()<0.5, load=fT; recv=3-fT; else, recv=fT; load=3-fT; end
  otherwise,     load=fT; recv=3-fT;
end
lv=[0 0];
if strcmp(kind,'f3'), lv(recv)=72+r()*10; elseif strcmp(kind,'f7'), lv(recv)=68+r()*12; else, lv(recv)=30+r()*35; end
if loading, lv(load)=55+r()*30; else, lv(load)=40+r()*30; end
loadAt=-1;
if loading, if strcmp(kind,'normal'), loadAt=floor((30+r()*240)/dt)+1; else, loadAt=floor((20+r()*120)/dt)+1; end, end
np=1; u=0.7+0.6*r(); tgt=25+15*r();
if strcmp(kind,'normal'), npr=1+(r()<0.3); np=npr; if isfield(P,'npForce'), np=P.npForce; end, end   % npForce — o'qitishda ikki nasosli rejim yetarli bo'lishi uchun (r() har doim bir marta chaqiriladi)
if strcmp(kind,'f1'), if sv(P)>0.5, np=2; else, np=1; end, end
if loading, lv(load)=max(lv(load),tgt+20+r()*15); end
ft=-1; leakQ=30+50*sv(P); leakDelay=floor((10+50*r())/dt); surge=3+7*sv(P); tau=20+100*(1-sv(P)); freezeLvl=tgt+5+10*r();
misAt=-1; if strcmp(kind,'f7'), misAt=loadAt+floor((10+50*r())/dt); end
ftPlan=-1;
if strcmp(kind,'f3'), ftPlan=floor((20+r()*100)/dt)+1; end
if strcmp(kind,'f5'), ftPlan=floor((30+r()*150)/dt)+1; end
if strcmp(kind,'f6'), ftPlan=floor((60+r()*240)/dt)+1; end
ns=floor(r()*3); bg=zeros(ns,3);
for i=1:ns, bg(i,1)=floor(r()*N)+1; bg(i,2)=floor((20+r()*40)/dt); bg(i,3)=1.5+r(); end
b=zeros(2,3); for i=1:2, for j=1:3, b(i,j)=js_gauss()*.4; end, end
ph=r()*1440;
f={'L','Ld','S1','S2','P','T','NP','QIN','VIN','VOUT'};
for i=1:2, for j=1:numel(f), tk(i).(f{j})=zeros(1,N); end, tk(i).pOK=true; tk(i).sisOK=true; tk(i).noPump=false; end %#ok<AGROW>
vin=[0 0]; vout=[0 0]; vin(recv)=1; vout(load)=1;
ou=0; pumpOn=false; pumpT=[0 0]; dip=[0 0]; bf=[1 1]; stopAt=-1; stoppedAt=-1; leakOn=false; frozen=NaN; dead=false;
tripped=false(2,3); trips=zeros(0,3); ev=struct('k',{},'src',{},'code',{},'tank',{},'val',{});
ev(end+1)=mkev(1,'info','start',recv,load);
NPT=zeros(1,N); QP=zeros(1,N);
for k=1:N
  t=(k-1)*dt;
  ou=ou+(-ou/60)*dt+0.25*sqrt(dt)*js_gauss();
  q=P.Qprod/24*(1+0.08*ou);
  for i=1:ns, if k>=bg(i,1) && k<bg(i,1)+bg(i,2), q=q*bg(i,3); end, end
  if strcmp(kind,'f3') && k>=ftPlan, q=q*surge; if ft<0, ft=k; ev(end+1)=mkev(k,'truth','surge',fT,surge); end, end %#ok<AGROW>
  if loadAt>0 && k==loadAt && ~pumpOn && isempty(trips), pumpOn=true; ev(end+1)=mkev(k,'op','pstart',load,np); end %#ok<AGROW>
  if strcmp(kind,'f2') && stoppedAt>0 && k==stoppedAt+leakDelay && ~leakOn, leakOn=true; ft=k; ev(end+1)=mkev(k,'truth','leak',load,leakQ); end %#ok<AGROW>
  if strcmp(kind,'f5') && k==ftPlan, ft=k; ev(end+1)=mkev(k,'truth','press',fT,tau); end %#ok<AGROW>
  if strcmp(kind,'f6') && k==ftPlan, ft=k; dead=true; ev(end+1)=mkev(k,'truth','nan',fT,0); end %#ok<AGROW>
  if strcmp(kind,'f7') && k==misAt && pumpOn, ft=k; ev(end+1)=mkev(k,'truth','recirc',recv,P.Qr); end %#ok<AGROW>
  nIn=vin(1)+vin(2); nOut=vout(1)+vout(2);
  qm=q*(1+js_gauss()*0.02); QP(k)=qm*24;
  npEff=0; if pumpOn && nOut>0, npEff=np; end; NPT(k)=npEff;
  for i=1:2
    sIn=0; if nIn>0, sIn=vin(i)/nIn; end
    sOut=0; if nOut>0, sOut=vout(i)/nOut; end
    mis=strcmp(kind,'f7') && ft>0 && npEff>0; qr=0; if npEff>0, qr=P.Qr; end
    lk=0; if leakOn && i==load, lk=leakQ; end
    if mis, if i==recv, back=qr; else, back=0; end, else, back=qr*sOut; end
    fo=npEff*u*Qp*sOut+lk+qr*sOut-back;
    lv(i)=min(100,max(0,lv(i)+(q*sIn-fo)*pct));
    tk(i).L(k)=lv(i);
    dcs=lv(i)+b(i,1)+js_gauss()*0.15*nz;
    if strcmp(kind,'f4') && i==load && isnan(frozen) && pumpOn && dcs<=freezeLvl, frozen=dcs; ft=k; ev(end+1)=mkev(k,'truth','freeze',i,dcs); end %#ok<AGROW>
    if strcmp(kind,'f4') && i==load && ~isnan(frozen), dcs=frozen; end
    pOn=npEff*sOut>0;
    if pOn, pumpT(i)=pumpT(i)+dt; dip(i)=3*(1-exp(-pumpT(i)/15)); else, pumpT(i)=0; dip(i)=dip(i)*exp(-dt/10); end
    if strcmp(kind,'f5') && i==fT && k>=ftPlan, bf(i)=bf(i)*exp(-dt*(1+double(pOn))/tau); end
    pn=P.P0+1.2*sin(2*pi*(t+ph)/1440)-dip(i);
    pr=max(P.PV,P.PV+(pn-P.PV)*bf(i))+js_gauss()*0.3*nz;
    tm=P.T0+2*sin(2*pi*(t+ph)/1440)+js_gauss()*0.1;
    s1=lv(i)+b(i,2)+js_gauss()*0.1*nz;
    s2=lv(i)+b(i,3)+js_gauss()*0.1*nz;
    if dead && i==fT, dcs=NaN; pr=NaN; tm=NaN; s1=NaN; s2=NaN; end
    tk(i).Ld(k)=dcs; tk(i).S1(k)=s1; tk(i).S2(k)=s2; tk(i).P(k)=pr; tk(i).T(k)=tm;
    tk(i).NP(k)=npEff*sOut; tk(i).QIN(k)=qm*sIn*24; tk(i).VIN(k)=vin(i); tk(i).VOUT(k)=vout(i);
  end
  % operator quyishni DCS sathiga qarab to'xtatadi
  if pumpOn && stopAt<0
    ld=tk(load).Ld(k);
    if strcmp(kind,'f1')
      if ft<0 && ld<=tgt, ft=k; ev(end+1)=mkev(k,'truth','overrun',load,tgt); end %#ok<AGROW>
    elseif ld<=tgt, stopAt=k+floor(r()*4/dt);
    end
  end
  if pumpOn && stopAt>0 && k>=stopAt, pumpOn=false; stoppedAt=k; ev(end+1)=mkev(k,'op','pstop',load,tk(load).Ld(k)); end %#ok<AGROW>
  % SIS blokirovkasi (fail-safe: yo'qolgan signal = trip ovozi); tartib: LALL, PVSV, LAHH
  for i=1:2
    ll=sis_ovoz(tk(i).S1(k),tk(i).S2(k),@(v) v<=P.LALL,P.vote);
    hh=sis_ovoz(tk(i).S1(k),tk(i).S2(k),@(v) v>=P.LAHH,P.vote);
    pl=isfinite(tk(i).P(k)) && tk(i).P(k)<=P.PV+0.3;
    hits=[ll pl hh]; tys=[1 3 2];
    for q2=1:3
      ty=tys(q2);
      if hits(q2) && ~tripped(i,ty)
        tripped(i,ty)=true; trips(end+1,:)=[k i ty]; %#ok<AGROW>
        if ty==2 && vin(i), vin(i)=0; end
        if ty==1 && pumpOn, pumpOn=false; end
        ev(end+1)=mkev(k,'sis','trip',i,ty); %#ok<AGROW>
      end
    end
  end
end
run=struct('kind',kind,'fT',fT,'ft',ft,'recv',recv,'load',load,'tanks',{tk},'NPT',NPT,'QP',QP,'trips',{trips},'ev',{ev},'np',np,'u',u,'tgt',tgt);
end
function s=sv(P), if P.sev>0, s=P.sev; else, s=js_rand(); end, end
function e=mkev(k,src,code,tank,val), e=struct('k',k,'src',src,'code',code,'tank',tank,'val',val); end

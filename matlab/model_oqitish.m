function M = model_oqitish(P, seed)
%MODEL_OQITISH  Isolation Forest modelini normal ish ssenariylarida o'qitish (trainModel2 bilan bir xil).
%  seed — o'qitish ssenariylari urug'i; daraxtlar seed+1 urug'i bilan quriladi.
%  O'qitish to'plami faqat normal ish ssenariylaridan iborat va baholash ssenariylaridan alohida generatsiya qilinadi.
if nargin<2, seed=7; end
w=max(2,round(5/P.dt)); X=[]; zs=[];
js_rand(seed);
for i=1:P.nTrain
  P1=P; P1.npForce=1+mod(i-1,2);
  run=ombor_modeli('normal',1,P1);
  for j=1:2, F=belgilar(run.tanks(j),P); X=[X; F.X(w+1:end,:)]; zs=[zs; F.zL(:)]; end %#ok<AGROW>
end
js_rand(seed+1);
M=iforest_oqitish(X,P.nTrees,P.sub);
% zL (sath balansi qoldig'i) chegarasi: normal ishdagi maksimumning 3 baravari, [2.0; 6.8] oralig'ida
m=max(abs(zs(isfinite(zs)))); if isempty(m), m=0; end
M.zT=min(6.8,max(2.0,3*m));
end

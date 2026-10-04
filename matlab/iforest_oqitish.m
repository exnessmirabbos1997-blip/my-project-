function M = iforest_oqitish(X, nTrees, sub)
%IFOREST_OQITISH  Isolation Forest (Liu, Ting, Zhou, 2008) — qo'shimcha toolbox'siz, veb-simulyatordagi trainIF bilan bir xil.
%  Daraxt chuqurlik bo'yicha (avval chap, keyin o'ng tarmoq) quriladi; tasodifiy sonlar js_rand dan olinadi.
%  Anomaliya bali o'qitish to'plamidagi ballar bo'yicha me'yorlanadi: mediana -> 0, maksimum -> 1 (M.smin, M.smax).
N=size(X,1); d=size(X,2); maxD=ceil(log2(sub)); M.c=cfun(sub); M.trees=cell(1,nTrees); M.maxD=maxD;
pool=(1:N)'; m0=min(sub,N);
for t=1:nTrees
  % takrorsiz tanlash: pool ustida qisman Fisher–Yates almashtirish (JS trainIF bilan bir xil)
  for i0=1:m0, j0=(i0-1)+floor(js_rand()*(N-(i0-1)))+1; tmp=pool(i0); pool(i0)=pool(j0); pool(j0)=tmp; end
  idx=pool(1:m0);
  cap=2*sub+1; feat=zeros(1,cap); spl=zeros(1,cap); L=zeros(1,cap); R=zeros(1,cap); sz=zeros(1,cap);
  stk={idx}; sdep=0; snode=1; nn=1;
  while ~isempty(stk)
    id=stk{end}; dd=sdep(end); node=snode(end); stk(end)=[]; sdep(end)=[]; snode(end)=[];
    n=numel(id);
    if dd>=maxD || n<=1, sz(node)=n; continue; end
    f=floor(js_rand()*d)+1; v=X(id,f); mn=min(v); mx=max(v);
    if mn==mx, sz(node)=n; continue; end
    sp=mn+js_rand()*(mx-mn); feat(node)=f; spl(node)=sp;
    nl=nn+1; nr=nn+2; nn=nn+2; L(node)=nl; R(node)=nr;
    stk{end+1}=id(v>=sp); sdep(end+1)=dd+1; snode(end+1)=nr; %#ok<AGROW>   % o'ng tarmoq (keyin)
    stk{end+1}=id(v<sp);  sdep(end+1)=dd+1; snode(end+1)=nl; %#ok<AGROW>   % chap tarmoq (avval)
  end
  M.trees{t}=struct('feat',feat(1:nn),'spl',spl(1:nn),'L',L(1:nn),'R',R(1:nn),'sz',sz(1:nn));
end
step=max(1,floor(N/6000)); s=sort(iforest_baho(M,X(1:step:N,:))); M.smin=s(floor(numel(s)*0.5)+1); M.smax=max(s(end),M.smin+1e-6);
end
function c=cfun(n), if n<=1, c=0; else, c=2*(log(n-1)+0.5772156649)-2*(n-1)/n; end, end

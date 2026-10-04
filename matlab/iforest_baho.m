function s = iforest_baho(M, X)
%IFOREST_BAHO  Isolation Forest anomaliya bali: s = 2^(-E[h(x)]/c(n)). Vektorli.
N=size(X,1); tot=zeros(N,1);
for t=1:numel(M.trees)
  T=M.trees{t}; node=ones(N,1); h=zeros(N,1);
  for it=1:M.maxD+1
    act=T.feat(node)'>0; if ~any(act), break; end
    ia=find(act); f=T.feat(node(ia))'; v=X(sub2ind(size(X),ia,f));
    goL=v<T.spl(node(ia))'; nd=node(ia); nd(goL)=T.L(nd(goL)); nd(~goL)=T.R(nd(~goL));
    node(ia)=nd; h(ia)=h(ia)+1;
  end
  n=T.sz(node)'; c=zeros(N,1); m=n>1; c(m)=2*(log(n(m)-1)+0.5772156649)-2*(n(m)-1)./n(m);
  tot=tot+(h+c);
end
s=2.^(-(tot/numel(M.trees))/M.c);
end

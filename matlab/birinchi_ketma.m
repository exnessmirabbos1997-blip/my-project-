function k = birinchi_ketma(c, K, from)
%BIRINCHI_KETMA  c vektorida from dan boshlab K ta ketma-ket true bo'lgan birinchi indeks (-1 - yo'q).
c = logical(c(:))'; if from>1, c(1:from-1)=false; end
r = filter(ones(1,K),1,double(c)); j = find(r>=K,1);
if isempty(j), k=-1; else, k=j-K+1; end
end

% dump_runs(v, nF, nN, outfile) — ommaviy_sinov ning bir varianti, har ssenariy natijasi CSV ga
function dump_runs(v,nF,nN,outfile)
P=parametrlar(); P.keshPapka=[outfile '.cache']; if ~exist(P.keshPapka,'dir'), mkdir(P.keshPapka); end; P.vlist=v;
% faqat bitta variantni hisoblash uchun ommaviy_sinov ni nVar=v bilan chaqiramiz (oldingi variantlar o'tkazib yuboriladi)
try, evalc('S=ommaviy_sinov(v,nF,nN,P);'); catch e, disp(e.message); end
L=load(fullfile(P.keshPapka,sprintf('ommaviy_v%d.mat',v)));
R=L.runv; fid=fopen(outfile,'w');
fprintf(fid,'v,kind,fT,trip,tripType,alarm,warn,diag,comb,code,tank,ok,fired\n');
for i=1:size(R,1)
  fprintf(fid,'%d,%s,%d,%d,%d,%s,%s,%s,%s,%s,%d,%d,%d\n',R{i,1},R{i,2},R{i,3},R{i,4},R{i,5},f(R{i,6}),f(R{i,7}),f(R{i,8}),f(R{i,9}),R{i,10},R{i,11},R{i,12},R{i,16});
end
fclose(fid);
end
function s=f(x), if isempty(x)||isnan(x), s='NaN'; else, s=sprintf('%.4f',x); end, end

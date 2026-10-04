function v = ovoz_yuqori(a, b, vote)
%OVOZ_YUQORI  Yuqori chegara uchun hal qiluvchi SIS qiymati.
if strcmp(vote,'2oo2'), v=min(a,b); else, v=max(a,b); end
v(isnan(a))=b(isnan(a)); v(isnan(b))=a(isnan(b));
end

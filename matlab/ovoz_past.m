function v = ovoz_past(a, b, vote)
%OVOZ_PAST  Past chegara uchun hal qiluvchi SIS qiymati (1oo2 - kichigi, 2oo2 - kattasi).
if strcmp(vote,'2oo2'), v=max(a,b); else, v=min(a,b); end
v(isnan(a))=b(isnan(a)); v(isnan(b))=a(isnan(b));
end

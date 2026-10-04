function tr = sis_ovoz(a, b, cond, vote)
%SIS_OVOZ  Ikki kanalli SIS ovoz berish mantiqi (fail-safe). Vektorli ishlaydi.
ca = isnan(a) | cond(a); cb = isnan(b) | cond(b);
if strcmp(vote,'2oo2'), tr = ca & cb; else, tr = ca | cb; end
end

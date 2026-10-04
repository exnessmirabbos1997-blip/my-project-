function g = js_gauss()
%JS_GAUSS  Standart normal taqsimotli son (Box–Muller), veb-simulyatordagi gauss() bilan bir xil.
u = 0; while u == 0, u = js_rand(); end
v = 0; while v == 0, v = js_rand(); end
g = sqrt(-2*log(u))*cos(2*pi*v);
end

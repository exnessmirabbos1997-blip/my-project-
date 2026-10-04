%% SIMULINK_TEKSHIRUV — barcha 4 ssenariy uchun Simulink modelini yaratib, Euler bilan solishtirish
%  MATLAB + Simulink kerak. Natijalar 'natijalar' papkasida.
P=parametrlar(); if ~exist('natijalar','dir'), mkdir('natijalar'); end
for k={'f1','f2','f3','f4'}
  try, simulink_model_yaratish(k{1},P);
  catch e, fprintf(2,'%s ssenariysida xato: %s\n',k{1},e.message); end
end

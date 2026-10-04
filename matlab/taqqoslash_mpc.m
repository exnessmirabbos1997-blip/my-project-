function taqqoslash_mpc()
%TAQQOSLASH_MPC  MATLAB va Python realizatsiyalarida 800 ta MPC simulyatsiyasini solishtirish (3.9-jadval).
fm = fopen(fullfile('natijalar','mpc_natijalar_matlab.csv')); fgetl(fm);
A = textscan(fm, '%s %f %s %f %f %f %f %f %f %f %f %f %f', 'Delimiter', ',', 'EmptyValue', NaN); fclose(fm);
fp = fopen(fullfile('natijalar','mpc_natijalar_python.csv')); fgetl(fp);
B = textscan(fp, '%s %s %f %f %f %f %f %f %f %f', 'Delimiter', ',', 'EmptyValue', NaN); fclose(fp);
kalit = @(k, i, c) sprintf('%s|%d|%s', k, i, c);
py = containers.Map();
for j = 1:numel(B{1}), py(kalit(B{1}{j}, B{3}(j), B{2}{j})) = [B{4}(j) B{5}(j) B{6}(j)]; end
n = numel(A{1}); mos = 0; dz = zeros(n, 1);
for j = 1:n
  q = py(kalit(A{1}{j}, A{2}(j), A{3}{j}));
  mos = mos + (A{4}(j) == q(1));
  if strcmp(A{1}{j}, 'f3'), dz(j) = abs((90 - A{8}(j)) - (90 - q(3))); else, dz(j) = abs((A{7}(j) - 10) - (q(2) - 10)); end
end
fprintf('\nMATLAB va Python realizatsiyalari (bir xil ssenariy va shovqin):\n');
fprintf('  simulyatsiyalar soni:              %d\n', n);
fprintf('  SIS tripi bo''yicha mos natija:     %d / %d\n', mos, n);
fprintf('  eng kichik zaxira farqi, mediana:  %.3f %%\n', median(dz));
fprintf('  eng kichik zaxira farqi, eng katta: %.2f %%\n', max(dz));
end

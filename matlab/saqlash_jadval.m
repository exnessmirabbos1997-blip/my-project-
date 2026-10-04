function fayl = saqlash_jadval(nom, sarlavha, qatorlar)
%SAQLASH_JADVAL  Jadvalni 'natijalar' papkasiga saqlash (MATLAB: .xlsx, Octave: .csv).
if ~exist('natijalar','dir'), mkdir('natijalar'); end
if ~exist('OCTAVE_VERSION','builtin') && exist('writetable','file')
  T = cell2table(qatorlar, 'VariableNames', matlab.lang.makeValidName(sarlavha));
  fayl = fullfile('natijalar',[nom '.xlsx']);
  try, writetable(T, fayl); catch, fayl = fullfile('natijalar',[nom '.csv']); writetable(T, fayl); end
else
  fayl = fullfile('natijalar',[nom '.csv']); fid = fopen(fayl,'w');
  fprintf(fid,'%s\n', strjoin(sarlavha, ';'));
  for i=1:size(qatorlar,1)
    q = qatorlar(i,:); s = cell(1,numel(q));
    for j=1:numel(q), if ischar(q{j}), s{j}=q{j}; else, s{j}=strrep(sprintf('%.3f',q{j}),'.',','); end, end
    fprintf(fid,'%s\n', strjoin(s, ';'));
  end
  fclose(fid);
end
end

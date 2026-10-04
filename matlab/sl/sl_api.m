function varargout = sl_api(cmd, varargin)
%SL_API  Simulink API ning GNU Octave'dagi minimal emulyatori (tekshiruv uchun).
%  simulink_model_yaratish.m skripti chaqiradigan new_system, add_block, add_line, set_param,
%  sim kabi funksiyalar shu yerga yo'naltiriladi. Model bloklar va ulanishlar grafi sifatida
%  saqlanadi, sim esa Simulink'ning qat'iy qadamli ode1 (Euler) rejimi semantikasi bo'yicha bajaradi.
persistent G
switch cmd
  case 'new'
    G = struct('name', varargin{1}, 'blk', {{}}, 'par', struct(), 'lines', zeros(0,4));
    G.bnames = {}; G.btype = {}; G.bpar = {};
  case 'loaded', varargout{1} = ~isempty(G) && strcmp(G.name, varargin{1});
  case 'set'
    p = varargin(2:end); for i = 1:2:numel(p), G.par.(p{i}) = p{i+1}; end
  case 'add_block'
    lib = varargin{1}; full = varargin{2}; p = varargin(3:end);
    parts = strsplit(full, '/'); nm = parts{end}; t = strsplit(lib, '/'); ty = t{end};
    s = struct(); for i = 1:2:numel(p), if ~strcmp(p{i}, 'Position'), s.(strrep(p{i}, ' ', '')) = p{i+1}; end, end
    assert(~any(strcmp(G.bnames, nm)), ['takroriy blok nomi: ' nm]);
    G.bnames{end+1} = nm; G.btype{end+1} = ty; G.bpar{end+1} = s;
  case 'add_line'
    a = strsplit(varargin{2}, '/'); b = strsplit(varargin{3}, '/');
    ia = find(strcmp(G.bnames, a{1})); ib = find(strcmp(G.bnames, b{1}));
    assert(~isempty(ia) && ~isempty(ib), ['noma''lum blok: ' varargin{2} ' -> ' varargin{3}]);
    G.lines(end+1, :) = [ia str2double(a{2}) ib str2double(b{2})];
  case 'model', varargout{1} = G;
  case 'sim', varargout{1} = sl_run(G);
end
end

function mdl = simulink_model_yaratish(kind, P)
%SIMULINK_MODEL_YARATISH  Rezervuar + SIS + AI xavf indeksi Simulink modelini avtomatik yaratadi va ishga tushiradi.
%  simulink_model_yaratish('f4')   % f1: quyish to'xtatilmadi, f2: sizish, f3: kirish oqimi oshdi, f4: DCS datchigi qotdi
%  Model faqat standart bloklardan iborat (Simulink asosiy kutubxonasi, qo'shimcha toolbox kerak emas).
%  Vaqt birligi — daqiqa; oqim — m3/soat; sath — %.
%  Blok-sxema: Qkir -> [Integrator: sath] <- Qchiq (nasos), Qsiz;  sath -> DCS va 2 ta SIS o'lchagich;
%  SIS: LALL/LAHH relesi (latch); AI indeks: x1, x2 (hodisagacha vaqt), x4 (DCS-SIS tafovuti).
if nargin<1, kind='f4'; end
if nargin<2, P=parametrlar(); end
S=ssenariy_soddalashgan(kind,P);
mdl=['ombor_' kind]; if bdIsLoaded(mdl), close_system(mdl,0); end
new_system(mdl); open_system(mdl);
set_param(mdl,'Solver','ode1','FixedStep','0.05','StopTime',num2str(S.tEnd),'SaveTime','on');
x0=30; dx=150; % joylashuv qadamlari
% ---------- yordamchi funksiyalar ----------
B=@(lib,name,pos,varargin) add_block(['simulink/' lib],[mdl '/' name],'Position',pos,varargin{:});
Ln=@(a,pa,b,pb) add_line(mdl,[a '/' num2str(pa)],[b '/' num2str(pb)],'autorouting','on');
pos=@(c,r) [x0+dx*(c-1) 40+r*70 x0+dx*(c-1)+60 40+r*70+40];
big=1e9; neg=-1e6;
% ---------- 1. Kirish oqimi ----------
B('Sources/Constant','Qkir0',pos(1,0),'Value',num2str(P.Qprod/24));
B('Sources/Step','surge_step',pos(1,1),'Time',num2str(S.tSurge),'Before','0','After',num2str(S.surge-1));
B('Math Operations/Sum','surge_sum',pos(2,1),'Inputs','++');          % 1 + (surge-1)*step
B('Sources/Constant','one',pos(1,2),'Value','1');
B('Math Operations/Product','Qkir_p',pos(3,0),'Inputs','**');
B('Math Operations/Sum','notHH',pos(2,2),'Inputs','+-');              % 1 - HH
% ---------- 2. Nasos (chiqish) ----------
B('Sources/Clock','clk',pos(1,4));
B('Logic and Bit Operations/Compare To Constant','pump_start',pos(2,4),'relop','>=','const',num2str(S.t0));
B('Logic and Bit Operations/Logical Operator','NOT_op',pos(3,5),'Operator','NOT');
B('Logic and Bit Operations/Logical Operator','NOT_ll',pos(3,6),'Operator','NOT');
B('Logic and Bit Operations/Logical Operator','pump_and',pos(4,5),'Operator','AND','Inputs','3');
B('Signal Attributes/Data Type Conversion','pump_dbl',pos(5,5),'OutDataTypeStr','double');
B('Math Operations/Gain','Qn_gain',pos(6,5),'Gain',num2str(S.n*S.u*P.Qpump));
% ---------- 3. Sizish ----------
B('Continuous/Transport Delay','leak_delay',pos(4,7),'DelayTime',num2str(max(S.leakDelay,1e-3)));
B('Math Operations/Gain','leak_gain',pos(5,7),'Gain',num2str(S.leakQ));
% ---------- 4. Sath (massa balansi) ----------
B('Math Operations/Sum','bal',pos(7,1),'Inputs','+--');               % Qkir - Qchiq - Qsiz
B('Math Operations/Gain','k2',pos(8,1),'Gain',num2str(100/(60*P.V)));  % %/min
B('Continuous/Integrator','L_int',pos(9,1),'InitialCondition',num2str(S.L0),'LimitOutput','on','UpperSaturationLimit','100','LowerSaturationLimit','0');
% ---------- 5. O'lchagichlar ----------
B('Math Operations/Bias','dcs_raw',pos(10,0),'Bias',num2str(S.bD));
B('Math Operations/Bias','sis1',pos(10,2),'Bias',num2str(S.b1));
B('Math Operations/Bias','sis2',pos(10,3),'Bias',num2str(S.b2));
B('Math Operations/MinMax','S_min',pos(11,2),'Function','min','Inputs','2');
B('Math Operations/MinMax','S_max',pos(11,3),'Function','max','Inputs','2');
B('Math Operations/Sum','S_sum',pos(11,4),'Inputs','++');
B('Math Operations/Gain','S_mean',pos(12,4),'Gain','0.5');
% DCS qotishi: qotgan holatda avvalgi qiymatni ushlab turadi (Memory orqali teskari aloqa)
fzOn=big; if ~isnan(S.freezeLvl), fzOn=-S.freezeLvl; end
B('Math Operations/Gain','neg_raw',pos(11,0),'Gain','-1');
B('Discontinuities/Relay','fz_relay',pos(12,0),'OnSwitchValue',num2str(fzOn),'OffSwitchValue',num2str(neg),'OnOutputValue','1','OffOutputValue','0');
B('Signal Routing/Switch','dcs_sw',pos(13,0),'Criteria','u2 >= Threshold','Threshold','0.5');
B('Discrete/Memory','dcs_mem',pos(13,1),'InitialCondition',num2str(S.L0+S.bD));
% ---------- 6. SIS relelari (latch) ----------
B('Math Operations/Gain','neg_smin',pos(12,2),'Gain','-1');
B('Discontinuities/Relay','ll_relay',pos(13,2),'OnSwitchValue',num2str(-P.LALL),'OffSwitchValue',num2str(neg),'OnOutputValue','1','OffOutputValue','0');
B('Discontinuities/Relay','hh_relay',pos(12,3),'OnSwitchValue',num2str(P.LAHH),'OffSwitchValue',num2str(neg),'OnOutputValue','1','OffOutputValue','0');
opOn=big; if ~isnan(S.tgt), opOn=-S.tgt; end
B('Math Operations/Gain','neg_dcs',pos(14,0),'Gain','-1');
B('Discontinuities/Relay','op_relay',pos(15,0),'OnSwitchValue',num2str(opOn),'OffSwitchValue',num2str(neg),'OnOutputValue','1','OffOutputValue','0');
% ---------- 7. AI xavf indeksi ----------
zL=2*P.LAL-P.LALL;
B('Continuous/Transfer Fcn','slope_tf',pos(13,4),'Numerator','[1 0]','Denominator','[5 1]');       % filtrlangan hosila, %/min
B('Math Operations/Gain','neg_v',pos(14,4),'Gain','-1');
B('Math Operations/MinMax','v_max',pos(15,4),'Function','max','Inputs','2');
B('Sources/Constant','eps_c',pos(14,5),'Value','1e-3');
B('Math Operations/Bias','S_minus_LL',pos(13,5),'Bias',num2str(-P.LALL));
B('Math Operations/Product','ttt',pos(16,4),'Inputs','*/');
B('Math Operations/Gain','ttt_g',pos(17,4),'Gain',num2str(1/P.Th));
B('Math Operations/Gain','x2_neg',pos(18,5),'Gain','-1');
B('Math Operations/Bias','x2_b',pos(19,4),'Bias','1');
B('Discontinuities/Saturation','x2_sat',pos(20,4),'UpperLimit','1','LowerLimit','0');
B('Math Operations/Gain','x1_neg',pos(13,6),'Gain','-1');
B('Math Operations/Bias','x1_b',pos(14,6),'Bias',num2str(zL));
B('Math Operations/Gain','x1_g',pos(15,6),'Gain',num2str(1/(zL-P.LALL)));
B('Discontinuities/Saturation','x1_sat',pos(16,6),'UpperLimit','1','LowerLimit','0');
B('Math Operations/Sum','dd',pos(13,7),'Inputs','+-');
B('Math Operations/Abs','dd_abs',pos(14,7));
B('Math Operations/Bias','x4_b',pos(15,7),'Bias','-1.5');
B('Math Operations/Gain','x4_g',pos(16,7),'Gain',num2str(1/4.5));
B('Discontinuities/Saturation','x4_sat',pos(17,7),'UpperLimit','1','LowerLimit','0');
B('Math Operations/Gain','w1',pos(21,6),'Gain',num2str(P.w(1)));
B('Math Operations/Gain','w2',pos(21,4),'Gain',num2str(P.w(2)));
B('Math Operations/Gain','w4',pos(21,7),'Gain',num2str(P.w(4)));
B('Math Operations/Sum','R_sum',pos(22,5),'Inputs','+++');
B('Math Operations/Gain','R_norm',pos(23,5),'Gain',num2str(1/(P.w(1)+P.w(2)+P.w(4))));
B('Discontinuities/Saturation','R_sat',pos(24,5),'UpperLimit','1','LowerLimit','0');
B('Logic and Bit Operations/Compare To Constant','warn_cmp',pos(25,5),'relop','>=','const',num2str(P.RTH));
B('Logic and Bit Operations/Compare To Constant','diag_cmp',pos(18,7),'relop','>=','const','0.6');
B('Signal Attributes/Data Type Conversion','warn_dbl',pos(26,5),'OutDataTypeStr','double');
B('Signal Attributes/Data Type Conversion','diag_dbl',pos(19,7),'OutDataTypeStr','double');
% ---------- 8. Yozish ----------
sig={'L_true','DCS','SIS','R','warn','diag','SIS_LL','Qchiq'};
B('Signal Routing/Mux','mux',pos(27,3),'Inputs',num2str(numel(sig)));
B('Sinks/To Workspace','log',pos(28,3),'VariableName','simout_mat','SaveFormat','Array','SampleTime','0.05');
B('Sinks/Scope','scope',pos(28,5),'NumInputPorts','1');
% ---------- ulanishlar ----------
% kirish oqimi
Ln('surge_step',1,'surge_sum',1); Ln('one',1,'surge_sum',2);
Ln('Qkir0',1,'Qkir_p',1); Ln('surge_sum',1,'Qkir_p',2);
Ln('one',1,'notHH',1); Ln('hh_relay',1,'notHH',2);
% Qkir_p * notHH -> alohida Product
add_block('simulink/Math Operations/Product',[mdl '/Qkir_eff'],'Position',pos(4,0),'Inputs','**');
Ln('Qkir_p',1,'Qkir_eff',1); Ln('notHH',1,'Qkir_eff',2);
% nasos
Ln('clk',1,'pump_start',1);
Ln('op_relay',1,'NOT_op',1); Ln('ll_relay',1,'NOT_ll',1);
Ln('pump_start',1,'pump_and',1); Ln('NOT_op',1,'pump_and',2); Ln('NOT_ll',1,'pump_and',3);
Ln('pump_and',1,'pump_dbl',1); Ln('pump_dbl',1,'Qn_gain',1);
% sizish
Ln('op_relay',1,'leak_delay',1); Ln('leak_delay',1,'leak_gain',1);
% balans
Ln('Qkir_eff',1,'bal',1); Ln('Qn_gain',1,'bal',2); Ln('leak_gain',1,'bal',3);
Ln('bal',1,'k2',1); Ln('k2',1,'L_int',1);
% o'lchagichlar
Ln('L_int',1,'dcs_raw',1); Ln('L_int',1,'sis1',1); Ln('L_int',1,'sis2',1);
Ln('sis1',1,'S_min',1); Ln('sis2',1,'S_min',2); Ln('sis1',1,'S_max',1); Ln('sis2',1,'S_max',2);
Ln('sis1',1,'S_sum',1); Ln('sis2',1,'S_sum',2); Ln('S_sum',1,'S_mean',1);
% DCS qotishi
Ln('dcs_raw',1,'neg_raw',1); Ln('neg_raw',1,'fz_relay',1);
Ln('dcs_mem',1,'dcs_sw',1); Ln('fz_relay',1,'dcs_sw',2); Ln('dcs_raw',1,'dcs_sw',3);
Ln('dcs_sw',1,'dcs_mem',1);
% SIS relelari
Ln('S_min',1,'neg_smin',1); Ln('neg_smin',1,'ll_relay',1); Ln('S_max',1,'hh_relay',1);
Ln('dcs_sw',1,'neg_dcs',1); Ln('neg_dcs',1,'op_relay',1);
% indeks: x1
Ln('S_mean',1,'x1_neg',1); Ln('x1_neg',1,'x1_b',1); Ln('x1_b',1,'x1_g',1); Ln('x1_g',1,'x1_sat',1);
% indeks: x2 (hodisagacha vaqt)
Ln('S_mean',1,'slope_tf',1); Ln('slope_tf',1,'neg_v',1); Ln('neg_v',1,'v_max',1); Ln('eps_c',1,'v_max',2);
Ln('S_mean',1,'S_minus_LL',1); Ln('S_minus_LL',1,'ttt',1); Ln('v_max',1,'ttt',2);
Ln('ttt',1,'ttt_g',1); Ln('ttt_g',1,'x2_neg',1); Ln('x2_neg',1,'x2_b',1); Ln('x2_b',1,'x2_sat',1);
% indeks: x4
Ln('dcs_sw',1,'dd',1); Ln('S_mean',1,'dd',2); Ln('dd',1,'dd_abs',1); Ln('dd_abs',1,'x4_b',1); Ln('x4_b',1,'x4_g',1); Ln('x4_g',1,'x4_sat',1);
% indeks: yig'indi
Ln('x1_sat',1,'w1',1); Ln('x2_sat',1,'w2',1); Ln('x4_sat',1,'w4',1);
Ln('w1',1,'R_sum',1); Ln('w2',1,'R_sum',2); Ln('w4',1,'R_sum',3);
Ln('R_sum',1,'R_norm',1); Ln('R_norm',1,'R_sat',1);
Ln('R_sat',1,'warn_cmp',1); Ln('warn_cmp',1,'warn_dbl',1);
Ln('x4_sat',1,'diag_cmp',1); Ln('diag_cmp',1,'diag_dbl',1);
% yozish
Ln('L_int',1,'mux',1); Ln('dcs_sw',1,'mux',2); Ln('S_mean',1,'mux',3); Ln('R_sat',1,'mux',4);
Ln('warn_dbl',1,'mux',5); Ln('diag_dbl',1,'mux',6); Ln('ll_relay',1,'mux',7); Ln('Qn_gain',1,'mux',8);
Ln('mux',1,'log',1); Ln('R_sat',1,'scope',1);
save_system(mdl); fprintf('Simulink modeli yaratildi: %s.slx\n',mdl);
% ---------- ishga tushirish ----------
if ~exist("natijalar","dir"), mkdir("natijalar"); end
out=sim(mdl); Y=out.get('simout_mat'); t=out.get('tout');
save(fullfile('natijalar',['simulink_' kind '.mat']),'t','Y');
R=soddalashgan_model(kind,P);   % mustaqil tekshiruv (Euler)
fig=figure('Color','w','Position',[80 80 900 650]);
subplot(2,1,1); plot(t,Y(:,1),'b',t,Y(:,2),'k',t,Y(:,3),'--','Color',[0 .45 .45]); hold on; plot(R.t,R.L,'r:','LineWidth',1.2);
legend({'Simulink: haqiqiy sath','Simulink: DCS','Simulink: SIS','Euler (tekshiruv)'},'Location','northeast'); ylabel('Sath, %'); grid on; title(['Simulink modeli: ' kind]);
subplot(2,1,2); plot(t,Y(:,4),'Color',[.72 .47 .12],'LineWidth',1.3); hold on; plot(R.t,R.R,'r:'); plot(t([1 end]),[P.RTH P.RTH],'--'); ylim([0 1.05]); ylabel('R'); xlabel('Vaqt, min'); grid on;
if ~exist('natijalar','dir'), mkdir('natijalar'); end
print(fig,'-dpng','-r200',fullfile('natijalar',['simulink_' kind '.png']));
d=max(abs(interp1(t,Y(:,1),R.t)-R.L)); fprintf('Simulink va Euler o''rtasidagi eng katta farq (sath): %.3f %%\n',d);
end

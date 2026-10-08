/* Field Hydraulics — Arabic strings (added to the shared I18N layer of the Driller's Console). */
(function () {
'use strict';
if (!window.I18N || !window.I18N.add) return;
window.I18N.add({
  // header / toolbar
  'Field Hydraulics': 'هيدروليكا الحفر — بيانات حقلية', '— API RP 13D · Herschel-Bulkley': '— API RP 13D · Herschel-Bulkley',
  Depth: 'العمق', Density: 'الكثافة', Flow: 'التدفق', Pressure: 'الضغط',
  'Load example': 'تحميل مثال', 'New well': 'بئر جديد', 'Export JSON': 'تصدير JSON', 'Import JSON': 'استيراد JSON', 'Print / PDF report': 'طباعة / تقرير PDF',
  "Driller's Console": 'محاكي الحفّار', Guide: 'الدليل (PDF)',
  'Engineering aid, not validated software. Results depend on the inputs and on the model assumptions listed below. Compare them with measured SPP / ECD (PWD) or with a commercial program before using them for decisions.':
    'أداة مساعدة هندسية وليست برنامجاً معتمداً. النتائج تعتمد على المدخلات وعلى افتراضات النموذج المذكورة في الأسفل. قارنها بـ SPP و ECD مقاسة (PWD) أو ببرنامج تجاري قبل استخدامها في اتخاذ القرار.',
  // input cards
  Well: 'البئر', 'Casing / liner': 'الـ Casing / الـ liner', '+ Row': '+ صف', 'Open hole': 'الـ Open hole', 'Drill string': 'الـ Drill string',
  'from the bit upwards · empty length = to surface': 'من البت إلى الأعلى · الطول الفارغ = حتى السطح', 'Surface lines': 'الخطوط السطحية',
  'Mud & cuttings': 'الطين والـ cuttings', 'Fann 35 dial readings': 'قراءات جهاز Fann 35', Pumps: 'المضخات', 'Bit & BHA': 'البت والـ BHA', Limits: 'الحدود',
  Survey: 'الـ Survey', 'MD, Inc (°), Azi (°) — one station per line; paste from Excel': 'MD، Inc (°)، Azi (°) — محطة في كل سطر؛ يمكن اللصق من Excel',
  'Measured data': 'بيانات مقاسة', "SPP, PWD ECD, or another program's results": 'SPP، أو ECD من PWD، أو نتائج برنامج آخر',
  'Well name': 'اسم البئر', 'Total depth (MD)': 'العمق الكلي (MD)', 'Bit depth (MD), 0 = at TD': 'عمق البت (MD)، 0 = عند القاع',
  'Hole / bit size': 'قطر البئر / البت', 'Open-hole washout (% of diameter)': 'اتساع الـ open hole (% من القطر)', 'Equivalent length': 'الطول المكافئ', 'Inside diameter': 'القطر الداخلي',
  'Mud weight': 'وزن الطين', 'Cutting size': 'حجم الـ cutting', 'Cutting density (sg)': 'كثافة الـ cutting (sg)', 'ROP (for cuttings load)': 'ROP (لحساب حمل الـ cuttings)',
  Liner: 'الـ Liner', Stroke: 'الشوط', 'Volumetric efficiency (%)': 'الكفاءة الحجمية (%)', 'Pump 1 SPM': 'SPM المضخة 1', 'Pump 2 SPM': 'SPM المضخة 2', 'Pump 3 SPM': 'SPM المضخة 3',
  'Flow rate override (0 = from pumps)': 'معدل تدفق يدوي (0 = من المضخات)', 'Nozzles (1/32 in, comma-separated)': 'الـ Nozzles (بوحدة 1/32 in، مفصولة بفواصل)',
  'Discharge coefficient Cd': 'معامل التصريف Cd', 'MWD / motor ΔP at this flow': 'ΔP الـ MWD / الـ motor عند هذا التدفق',
  'Max. pump pressure (liner rating)': 'أقصى ضغط للمضخة (rating الـ liner)', 'Fracture gradient at shoe (EMW)': 'تدرّج التكسير عند الـ shoe (EMW)',
  Name: 'الاسم', ID: 'ID', 'Top (MD)': 'القمة (MD)', 'Shoe (MD)': 'الـ Shoe (MD)', Component: 'المكوّن', OD: 'OD', Length: 'الطول', Source: 'المصدر',
  'Flow rate': 'معدل التدفق', SPP: 'SPP', 'ECD (PWD)': 'ECD (PWD)', 'PWD depth (MD)': 'عمق حساس PWD (MD)', 'Delete row': 'حذف الصف', 'No rows.': 'لا توجد صفوف.',
  // results
  Results: 'النتائج', 'Pressure breakdown': 'توزيع فواقد الضغط', 'Comparison with measured data': 'المقارنة مع البيانات المقاسة', 'Rheology — Herschel-Bulkley fit': 'الريولوجيا — مطابقة Herschel-Bulkley',
  'Drill string (inside)': 'داخل الـ Drill string', Annulus: 'الحلقي', 'ECD profile & wellpath': 'منحنى الـ ECD ومسار البئر', 'Survey stations (minimum curvature)': 'محطات الـ Survey (minimum curvature)',
  'Method & assumptions': 'الطريقة والافتراضات', 'bit at': 'البت عند',
  'Standpipe pressure (calc.)': 'ضغط الـ standpipe (محسوب)', 'ECD at bit': 'ECD عند البت', 'ECD at shoe': 'ECD عند الـ shoe', 'Bit ΔP': 'ΔP البت', HSI: 'HSI',
  'Jet impact force': 'قوة اصطدام النفث', 'Annular velocity': 'السرعة الحلقية', 'Surface → bit': 'السطح ← البت', 'Bottoms-up': 'Bottoms-up', 'Annular friction': 'احتكاك الحلقي', Rheology: 'الريولوجيا',
  'pump HHP {h}': 'HHP المضخة {h}', 'with cuttings {v}': 'مع الـ cuttings {v}', 'FG {v}': 'FG {v}', '{p} % of SPP': '{p} % من SPP', 'jet {v} · TFA {a} in²': 'النفث {v} · TFA {a} in²',
  'min – max over sections': 'أدنى – أعلى قيمة بين المقاطع', 'string {s} · surface {f}': 'الـ string {s} · السطح {f}',
  'Rheology fit failed — check the Fann readings (R600 > R300 > R200 > R100 > R6 > R3).': 'فشلت مطابقة الريولوجيا — تحقق من قراءات Fann (R600 > R300 > R200 > R100 > R6 > R3).',
  'Maximum inclination {i}° > 30°: the Moore slip velocity and the Ft / Ca hole-cleaning indicators are for near-vertical wells only. Use a deviated-well hole-cleaning model.':
    'أقصى ميل {i}° > 30°: سرعة انزلاق Moore ومؤشرا Ft / Ca لتنظيف البئر صالحة للآبار شبه العمودية فقط. استخدم نموذج تنظيف للآبار المائلة.',
  'Transport ratio below 0.5 in at least one annular section.': 'نسبة النقل أقل من 0.5 في مقطع حلقي واحد على الأقل.', 'Calculated SPP exceeds the maximum pump pressure.': 'الـ SPP المحسوب يتجاوز أقصى ضغط للمضخة.',
  'ECD at the shoe exceeds the fracture gradient.': 'الـ ECD عند الـ shoe يتجاوز تدرّج التكسير.',
  'Some sections are in transitional flow: the friction factor there is an interpolation and is the least certain part of the result.': 'بعض المقاطع في جريان انتقالي: معامل الاحتكاك هناك محسوب بالاستيفاء، وهو أقل أجزاء النتيجة يقيناً.',
  'Calculation error — check the inputs.': 'خطأ في الحساب — تحقق من المدخلات.',
  Section: 'المقطع', Interval: 'المدى', Velocity: 'السرعة', Regime: 'نظام الجريان', laminar: 'طبقي (laminar)', turbulent: 'مضطرب (turbulent)', transitional: 'انتقالي', none: '—',
  'Bit nozzles': 'nozzles البت', 'MWD / motor': 'الـ MWD / الـ motor', 'Total string + bit': 'مجموع الـ string + البت', 'Total annulus': 'مجموع الحلقي', cased: 'مبطّن (cased)', 'open hole': 'open hole',
  Measured: 'المقاس', 'Power law (600/300) for reference': 'Power law (600/300) للمرجعية', Error: 'الخطأ', 'meas.': 'مقاس', 'calc.': 'محسوب',
  'Add measured rows (flow rate + SPP, and PWD ECD if available) in “Measured data”. You can also enter another program’s results (e.g. WELLPLAN, Drillbench) to compare the two calculations.':
    'أضف صفوفاً مقاسة (معدل التدفق + SPP، و ECD من PWD إن وُجد) في "بيانات مقاسة". ويمكنك أيضاً إدخال نتائج برنامج آخر (مثل WELLPLAN أو Drillbench) للمقارنة بين الحسابين.',
  'Colours (±5 % green, ±15 % amber) are only a visual aid, not an acceptance criterion. A consistent bias usually points to an input: rheology at downhole temperature, MWD/motor losses, nozzle sizes, surface-line equivalent length, or tool joints (not modelled).':
    'الألوان (±5 % أخضر، ±15 % برتقالي) مساعدة بصرية فقط وليست معيار قبول. الانحراف الثابت يشير عادةً إلى أحد المدخلات: الريولوجيا عند حرارة البئر، أو فواقد الـ MWD/الـ motor، أو أقطار الـ nozzles، أو الطول المكافئ للخطوط السطحية، أو الـ tool joints (غير مُنمذجة).',
  'shear rate γ (1/s)': 'معدل القص γ (1/s)', 'HB model': 'نموذج HB', 'Fann readings': 'قراءات Fann', 'FG at shoe': 'FG عند الـ shoe', 'Horizontal displacement': 'الإزاحة الأفقية',
  '{n} stations · TVD at bit {t} · max inclination {i}° · max DLS {d}': '{n} محطة · TVD عند البت {t} · أقصى ميل {i}° · أقصى DLS {d}',
  'Example loaded (training well, not field data).': 'تم تحميل المثال (بئر تدريبي وليس بيانات حقلية).', 'Blank well: enter your data.': 'بئر فارغ: أدخل بياناتك.',
  'Data imported.': 'تم استيراد البيانات.', 'Could not read this file (expected a JSON export from this page).': 'تعذّرت قراءة الملف (المتوقع ملف JSON مُصدَّر من هذه الصفحة).',
  // method list
  'Rheology: Herschel-Bulkley, τ = τy + K·γⁿ with τy = 2R3 − R6, n = 3.32·log[(R600 − τy)/(R300 − τy)], K = (R300 − τy)/511ⁿ. Dial readings taken as lbf/100 ft².':
    'الريولوجيا: Herschel-Bulkley، τ = τy + K·γⁿ حيث τy = 2R3 − R6، و n = 3.32·log[(R600 − τy)/(R300 − τy)]، و K = (R300 − τy)/511ⁿ. قراءات الجهاز تؤخذ كـ lbf/100 ft².',
  'Pressure losses: generalized Reynolds number and friction factor of API RP 13D for pipe and concentric annulus. Not included: tool joints, eccentricity, pipe rotation, and temperature/pressure effects on rheology and density.':
    'فواقد الضغط: رقم Reynolds المعمّم ومعامل الاحتكاك وفق API RP 13D للأنبوب وللحلقي المتمركز. غير مشمول: الـ tool joints، وعدم التمركز، ودوران الأنبوب، وأثر الحرارة والضغط على الريولوجيا والكثافة.',
  'Bit: ΔP = 8.311×10⁻⁵·ρ·Q²/(Cd²·TFA²). MWD/motor losses are a user input.': 'البت: ΔP = 8.311×10⁻⁵·ρ·Q²/(Cd²·TFA²). فواقد الـ MWD/الـ motor يدخلها المستخدم.',
  "ECD = MW + Σ annular ΔP / (0.052·TVD); TVD from the survey (minimum curvature). The cuttings effect uses Moore's slip velocity with the HB apparent viscosity at the annular wall. This is valid only for near-vertical sections (inclination < 30°).":
    'ECD = MW + Σ ΔP الحلقي / (0.052·TVD)؛ والـ TVD من الـ survey (minimum curvature). أثر الـ cuttings يعتمد سرعة انزلاق Moore مع اللزوجة الظاهرية HB عند جدار الحلقي، وهو صالح فقط للمقاطع شبه العمودية (ميل < 30°).',
  'Full equations and their meaning: see the guide (PDF), sections 10–11.': 'المعادلات الكاملة ومعانيها: راجع الدليل (PDF)، القسمين 10–11.',
});
})();

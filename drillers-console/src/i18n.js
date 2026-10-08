/* Driller's Console — language layer (English / Arabic). English is the source text; AR maps it to Arabic.
   Technical terms (WOB, ROP, SPP, ECD, BOP, SIDPP ...) are kept in English on purpose.
   I18N.t(s)        -> translated string (exact match, then regex patterns for messages carrying numbers)
   I18N.f(tpl, vars)-> translated template with {placeholders}
   I18N.setLang(l)  -> switches <html lang/dir> and the static text of the page */
(function (root) {
'use strict';
const AR = {
  // header / toolbar
  "Driller's Console": 'لوحة تحكم الحفّار', '— Drilling Rig Control': '— Driller\'s Console', Sim: 'المحاكاة', Units: 'الوحدات', SI: 'SI', Field: 'Field',
  Pause: 'إيقاف مؤقت', 'Alarm horn': 'صفارة الإنذار', '🔇 Horn': '🔇 الصفارة', '🔊 Horn': '🔊 الصفارة', 'Instructor / Setup': 'المدرّب / الإعداد',
  Language: 'اللغة', Guide: 'الدليل (PDF)', 'Parameter guide (PDF, Arabic + English)': 'دليل البارامترات (PDF، عربي + إنجليزي)',
  'Rig ID': 'رقم المنصة', Well: 'البئر', 'Well status': 'حالة البئر', ESD: 'ESD', Comms: 'الاتصال', Rig: 'المنصة', TVD: 'TVD', Sat: 'القمر',
  Online: 'متصل', Offline: 'غير متصل', Paused: 'متوقف', 'Bit / Formation': 'البت / التكوين', 'Click to acknowledge': 'اضغط للإقرار',
  'No active alarms': 'لا توجد إنذارات', 'All systems normal': 'كل الأنظمة طبيعية', READY: 'جاهز', 'CONFIRM?': 'تأكيد؟', 'ACTIVE — RESET': 'مفعّل — إعادة ضبط',
  'SI units': 'وحدات SI', 'Oilfield units': 'وحدات حقلية',
  // well status
  'ESD ACTIVE': 'ESD مفعّل', 'E-STOP': 'E-STOP', 'WELL CONTROL LOST': 'فقدان السيطرة على البئر', 'SHEARED / SECURED': 'قُطع الأنبوب / البئر مؤمَّن',
  'KILL CIRCULATION': 'تدوير القتل (Kill)', 'SHUT-IN': 'البئر مغلق', CONNECTION: 'وصلة (Connection)', 'IN SLIPS': 'على الـ Slips', DRILLING: 'حفر',
  'TRIPPING OUT': 'سحب الأنابيب (POOH)', 'TRIPPING IN': 'إنزال الأنابيب (RIH)', 'CIRCULATE & ROTATE': 'تدوير ودوران', CIRCULATING: 'تدوير', IDLE: 'خامل',
  // cards
  'Primary Parameters': 'البارامترات الأساسية', 'Rig & Well Schematic': 'مخطط المنصة والبئر', live: 'مباشر', 'Mud in': 'طين داخل', Returns: 'الراجع',
  'Choke line': 'خط الـ Choke', Gas: 'غاز', 'Drilling Control Loop': 'حلقة التحكم بالحفر', 'Formation / Bit Interaction': 'تفاعل التكوين / البت',
  'WOB / Torque / ROP Measurement': 'قياس WOB / العزم / ROP', 'Drilling Controller / Auto-Driller': 'المتحكم / Auto-Driller',
  'Drawworks / Top Drive Command': 'أوامر Drawworks / Top Drive', 'Bit Response': 'استجابة البت', 'Stable Drilling': 'حفر مستقر',
  'Unsafe — check alarms': 'غير آمن — راجع الإنذارات', 'Manual Control': 'تحكم يدوي',
  'Drilling Control': 'التحكم بالحفر', 'Out (DW cmd)': 'المخرج (أمر DW)', Mode: 'الوضع', Auto: 'آلي', Manual: 'يدوي', 'Control variable': 'المتغير المتحكَّم به',
  'ROP cap (WOB mode)': 'سقف ROP (وضع WOB)', On: 'تشغيل', Off: 'إيقاف', 'WOB setpoint': 'WOB المطلوب', 'ROP target': 'ROP المستهدف', 'WOB limit': 'حد WOB',
  'Torque limit': 'حد العزم', 'RPM limit': 'حد RPM', 'Auto connection at stand end': 'وصلة آلية عند نهاية الـ stand',
  'Top Drive': 'Top Drive', Torque: 'العزم', 'FWD / OFF / REV': 'أمامي / إيقاف / عكسي', Drill: 'حفر', Spin: 'لفّ', Fwd: 'أمامي', Rev: 'عكسي',
  'RPM setpoint': 'RPM المطلوب', 'Torque setpoint': 'العزم المطلوب', 'Motor status': 'حالة المحرك', 'Motor temperature': 'حرارة المحرك',
  'Hydraulic pressure': 'الضغط الهيدروليكي', Lubrication: 'التزييت', OK: 'سليم', Cooling: 'التبريد', VFD: 'VFD', FAULT: 'عطل',
  TRIPPED: 'فصل (Trip)', RUNNING: 'يعمل', STOPPED: 'متوقف', 'TORQUE LIMIT': 'حد العزم', sequence: 'تسلسل آلي',
  Drawworks: 'Drawworks', 'Hoist / Lower': 'رفع / إنزال', '(hold)': '(اضغط باستمرار)', Hoist: 'رفع', Lower: 'إنزال', 'Block position': 'موضع البلوك',
  'Hook load': 'حمل الخطاف', 'Block speed': 'سرعة البلوك', 'Drum RPM': 'دوران الطبلة', 'Brake status': 'حالة الفرامل', 'Motor load': 'حمل المحرك',
  'Brake mode': 'وضع الفرامل', Set: 'تثبيت', Release: 'تحرير', SET: 'مثبّتة', RELEASED: 'محرّرة', 'Jog speed': 'سرعة التحريك',
  'Keyboard: hold': 'لوحة المفاتيح: اضغط', 'hoist,': 'للرفع،', 'lower,': 'للإنزال،', 'stop block,': 'لإيقاف البلوك،', 'pause.': 'للإيقاف المؤقت.',
  MANUAL: 'يدوي', STOP: 'إيقاف', 'AUTO-DRILLER': 'Auto-Driller', SEQUENCE: 'تسلسل آلي',
  'Mud Pumps 1 / 2 / 3': 'مضخات الطين 1 / 2 / 3', 'All On': 'تشغيل الكل', 'All Off': 'إيقاف الكل', 'Master SPM': 'SPM للكل', PUMP: 'مضخة',
  liner: 'liner', 'Liner size': 'قطر الـ liner', Pressure: 'الضغط', Stroke: 'الشوط', Flow: 'التدفق', Strokes: 'الضربات', Status: 'الحالة', Alarm: 'إنذار',
  RUN: 'يعمل', RELIEF: 'Relief',
  'BOP / Well Control': 'BOP / السيطرة على البئر', 'Choke manifold': 'Choke manifold', 'Choke position': 'فتحة الـ Choke', 'Auto (hold DPP)': 'آلي (تثبيت DPP)',
  'Auto-choke holds drill-pipe pressure at the target (constant BHP method)': 'الـ Auto-choke يثبّت ضغط الـ drill pipe عند الهدف (طريقة BHP الثابت)',
  'DPP target': 'هدف DPP', 'Choke (casing) pressure': 'ضغط الـ Choke (casing)', 'Drill-pipe pressure': 'ضغط الـ drill pipe', 'Accumulator pressure': 'ضغط الـ Accumulator',
  'MAASP (shoe @ 2000 m)': 'MAASP (الـ shoe عند 2000 m)', 'BHP / Pore pressure': 'BHP / ضغط المسام', 'Annular BOP': 'Annular BOP', 'Pipe rams': 'Pipe rams',
  'Blind / shear rams': 'Blind / shear rams', 'HCR (choke line)': 'HCR (خط الـ choke)', 'Kill line': 'Kill line', Open: 'فتح', Close: 'إغلاق', Arm: 'تسليح', Disarm: 'إلغاء التسليح',
  Fire: 'إطلاق', Confirm: 'تأكيد', OPEN: 'مفتوح', CLOSED: 'مغلق', MOVING: 'يتحرك', ARMED: 'مسلّح',
  'returns via choke': 'الراجع عبر الـ choke', 'well shut in': 'البئر مغلق', 'returns via flowline': 'الراجع عبر الـ flowline',
  'Kill Sheet & Mud': 'Kill sheet والطين', "Driller's / Wait-&-Weight": "Driller's / Wait-&-Weight", 'Pit gain at shut-in': 'زيادة الحوض عند الإغلاق',
  'Kill mud weight': 'وزن طين القتل (KMW)', 'SCR (slow circ. rate)': 'SCR (معدل التدوير البطيء)', 'ICP (initial circ.)': 'ICP (ضغط التدوير الأولي)',
  'FCP (final circ.)': 'FCP (ضغط التدوير النهائي)', 'Strokes surface→bit': 'ضربات السطح ← البت', 'Record SCR': 'سجّل SCR', 'DPP target = ICP': 'هدف DPP = ICP',
  'Mix KMW': 'اخلط KMW', 'Active mud system': 'نظام الطين الفعّال', 'MW setpoint (mixing)': 'MW المطلوب (الخلط)', 'MW in / out': 'MW داخل / خارج',
  'Pit volume / Δ': 'حجم الحوض / Δ', 'Trip tank': 'Trip tank', 'PV / YP': 'PV / YP', 'ECD @ bit': 'ECD عند البت', Mixing: 'الخلط', 'Hole fill': 'ملء البئر',
  'Zero pit Δ': 'تصفير Δ الحوض', 'LCM pill': 'LCM pill', 'not recorded': 'غير مسجّل',
  "Pipe Handling & Driller's Panel": 'مناولة الأنابيب ولوحة الحفّار', 'Auto Connection': 'وصلة آلية', Abort: 'إلغاء', 'Set slips': 'ضع الـ slips',
  'Pull slips': 'ارفع الـ slips', 'Break out': 'فكّ الوصلة', 'Pick stand': 'التقط stand', 'Rack stand': 'أعد الـ stand', 'Make up': 'اربط الوصلة',
  "Driller's panel": 'لوحة الحفّار', '▲ Block up': '▲ البلوك لأعلى', '▼ Block down': '▼ البلوك لأسفل', 'PWR ON': 'الطاقة', ALARM: 'إنذار',
  'Reset E-STOP / power': 'إعادة ضبط E-STOP / الطاقة', 'Acknowledge alarms': 'الإقرار بالإنذارات', 'Emergency stop: top drive, drawworks, pumps': 'إيقاف طوارئ: top drive و drawworks والمضخات',
  Connected: 'متصل', 'In slips': 'على الـ slips', 'Stand on TD': 'Stand على الـ TD', 'Joint @ floor': 'وصلة عند الأرضية', 'On bottom': 'على القاع',
  'Real-Time Trends': 'المنحنيات اللحظية', 'Alarm / Safety': 'الإنذارات / السلامة', 'Ack all': 'إقرار الكل', Time: 'الوقت', 'Event log': 'سجل الأحداث',
  ACTIVE: 'نشط', CLEAR: 'زال', CLEARED: 'زال', Ack: 'إقرار', 'No alarms': 'لا إنذارات', acknowledged: 'مُقَرّ', unacknowledged: 'غير مُقَرّ',
  'Pressure Window & Lithology': 'نافذة الضغط والطبقات', 'EMW (sg) vs depth — pore (prognosis dashed), fracture, MW, ECD': 'EMW (sg) مقابل العمق — المسام (المتوقع متقطع)، التكسير، MW، ECD',
  'Hydraulics & Bit': 'الهيدروليكا والبت', 'Bit ΔP / HSI': 'ΔP البت / HSI', 'Annular friction': 'احتكاك الحلقي', 'SPP expected (clean)': 'SPP المتوقع (نظيف)',
  'Hole depth / bit': 'عمق البئر / البت', 'Bit hours / wear (IADC)': 'ساعات البت / التآكل (IADC)', MSE: 'MSE', 'd-exponent (dxc)': 'd-exponent (dxc)',
  'Pore / Frac @ bottom': 'المسام / التكسير عند القاع', Overbalance: 'Overbalance', 'Stands added / racked': 'Stands مضافة / مُعادة',
  '12¼" PDC, 6×14/32" nozzles · 5½" 21.9 ppf DP + 200 m BHA · 13⅜" shoe 2000 m · vertical well (MD = TVD). Values are a simplified training model, not calibrated to a specific rig.':
    'بت PDC قطر 12¼"، 6 nozzles 14/32" · DP 5½" 21.9 ppf + BHA بطول 200 m · shoe 13⅜" عند 2000 m · بئر عمودي (MD = TVD). القيم من نموذج تدريبي مبسّط وغير معايَر على منصة محددة.',
  // primary parameters
  'Hole Depth': 'عمق البئر', 'Bit Depth': 'عمق البت', 'Block Position': 'موضع البلوك', 'Block Speed': 'سرعة البلوك', 'Hook Load': 'حمل الخطاف',
  WOB: 'WOB', ROP: 'ROP', 'Top Drive RPM': 'RPM الـ Top Drive', 'Top Drive Torque': 'عزم الـ Top Drive', 'Standpipe Pressure': 'ضغط الـ Standpipe (SPP)',
  'Casing Pressure': 'ضغط الـ Casing', 'Pump Strokes': 'ضربات المضخات', 'Pump Pressure': 'ضغط المضخة', 'Mud Flow In': 'تدفق الطين الداخل',
  'Mud Flow Out': 'تدفق الطين الخارج', 'Mud Pit Volume': 'حجم أحواض الطين', 'Pit Gain / Loss': 'زيادة / نقص الحوض', 'Differential Pressure': 'الضغط التفاضلي',
  'Rotary Torque': 'عزم الدوران',
  // trends / pressure window
  'Block pos': 'موضع البلوك', 'Casing P': 'ضغط الـ Casing', 'Flow in': 'تدفق داخل', 'Flow out': 'تدفق خارج', 'Pit Δ': 'Δ الحوض',
  'Pore (prognosis)': 'المسام (المتوقع)', 'Pore (actual, drilled)': 'المسام (الفعلي المحفور)', Fracture: 'التكسير', 'MW in hole': 'MW في البئر',
  'ECD @ bottom': 'ECD عند القاع', 'Hole depth': 'عمق البئر', shoe: 'shoe',
  // formations
  'Clay / Silt': 'طين / غرين', 'Sand / Shale': 'رمل / طفل', Claystone: 'حجر طيني', Shale: 'طفل (Shale)', 'Silty sandstone': 'حجر رملي غريني',
  'Limestone stringer': 'شريط حجر جيري', 'Shale (transition)': 'طفل (منطقة انتقالية)', 'Gas sand': 'رمل غازي', 'Vugular limestone': 'حجر جيري كهفي',
  'Sandstone / Shale': 'حجر رملي / طفل', Sandstone: 'حجر رملي', Limestone: 'حجر جيري', GAS: 'غاز', LOSS: 'فقد',
  // auto-driller states
  OFF: 'إيقاف', 'HOLD (CONNECTION)': 'انتظار (وصلة)', STANDBY: 'استعداد', 'STAND END': 'نهاية الـ stand', 'SEEK BOTTOM': 'البحث عن القاع',
  'SEEK': 'البحث عن القاع', CONTROL: 'تحكم', 'ROP LIMIT': 'حد ROP',
  // floor operations / connection steps
  'SET SLIPS': 'وضع الـ slips', 'PULL SLIPS': 'رفع الـ slips', 'BREAK OUT': 'فكّ الوصلة', 'PICK UP STAND': 'التقاط stand', 'RACK BACK STAND': 'إعادة الـ stand',
  'SPIN-IN & TORQUE UP': 'لفّ وشدّ الوصلة', 'Stop rotation, pick up off bottom': 'أوقف الدوران وارفع عن القاع', 'Stop mud pumps (flow-check)': 'أوقف المضخات (flow-check)',
  'Set slips': 'ضع الـ slips', 'Break out top-drive connection': 'فكّ وصلة الـ top drive', 'Raise top drive to racking board': 'ارفع الـ top drive إلى الـ racking board',
  'Latch new stand': 'التقط stand جديد', 'Stab, spin-in and torque up': 'أدخل الوصلة ولفّها وشدّها', 'Take string weight': 'احمل وزن الـ string',
  'Pull slips': 'ارفع الـ slips', 'Restart pumps (staged)': 'أعد تشغيل المضخات تدريجياً', 'Start rotation': 'ابدأ الدوران', 'Run to bottom': 'انزل إلى القاع',
  // alarms
  'EMERGENCY SHUTDOWN ACTIVE': 'إيقاف الطوارئ ESD مفعّل', 'DRILLER E-STOP ACTIVE': 'E-STOP الحفّار مفعّل', 'WELL CONTROL LOST — WELLHEAD PRESSURE EXCEEDED': 'فقدان السيطرة — تجاوز ضغط رأس البئر',
  'FLOW OUT > FLOW IN — POSSIBLE KICK': 'التدفق الخارج > الداخل — kick محتمل', 'WELL FLOWING WITH PUMPS OFF': 'البئر يتدفق والمضخات متوقفة', 'PIT GAIN': 'زيادة في الحوض',
  'HIGH CASING PRESSURE (> % MAASP)': 'ضغط casing مرتفع (> % من MAASP)', 'CROWN-O-MATIC — BLOCK AT UPPER LIMIT': 'Crown-o-matic — البلوك عند الحد العلوي',
  'HIGH STANDPIPE PRESSURE': 'ضغط standpipe مرتفع', 'LOW STANDPIPE PRESSURE — POSSIBLE WASHOUT': 'ضغط standpipe منخفض — washout محتمل', 'HIGH TORQUE': 'عزم مرتفع',
  'TOP DRIVE STALLED': 'توقف الـ Top Drive (stall)', 'HIGH HOOK LOAD': 'حمل خطاف مرتفع', 'OVERPULL — EXCESS DRAG': 'Overpull — سحب زائد', 'HIGH WOB': 'WOB مرتفع',
  'HIGH RPM': 'RPM مرتفع', 'LOW MUD FLOW — FLOW OUT < FLOW IN': 'تدفق منخفض — الخارج < الداخل', 'PIT LOSS': 'نقص في الحوض', 'HIGH GAS': 'غاز مرتفع',
  'LOW ACCUMULATOR PRESSURE': 'ضغط accumulator منخفض', 'HIGH BLOCK SPEED': 'سرعة بلوك مرتفعة', 'TOP DRIVE MOTOR HIGH TEMPERATURE': 'حرارة محرك الـ Top Drive مرتفعة',
  'MUD PUMP RELIEF / TRIP': 'Relief / فصل مضخة الطين', 'MUD PUMP FAULT — LOW VOLUMETRIC EFFICIENCY': 'عطل مضخة — كفاءة حجمية منخفضة',
  'STAND DRILLED DOWN — CONNECTION REQUIRED': 'انتهى الـ stand — يلزم connection', 'BIT WORN — CONSIDER TRIP': 'البت متآكل — فكّر في الـ trip',
  'ROTATING / MOVING WITH BOP CLOSED': 'دوران / حركة والـ BOP مغلق', 'POOR HOLE CLEANING — HIGH CUTTINGS LOAD': 'تنظيف بئر ضعيف — حمل cuttings مرتفع',
  // events / notes
  'E-STOP pressed': 'ضُغط E-STOP', 'ESD activated': 'تفعيل ESD', 'E-STOP reset, power restored': 'إعادة ضبط E-STOP وعودة الطاقة', 'ESD reset': 'إعادة ضبط ESD', 'Reset ESD first': 'أعد ضبط ESD أولاً',
  'Auto connection started': 'بدأت الوصلة الآلية', 'BLIND/SHEAR RAMS FIRED': 'أُطلقت الـ BLIND/SHEAR RAMS', 'WELLHEAD/BOP FAILURE — LOSS OF CONTAINMENT': 'فشل رأس البئر/BOP — فقدان الاحتواء',
  'LCM pill pumped (8 m³)': 'ضُخّت LCM pill (8 m³)', 'Another floor operation is in progress': 'هناك عملية أخرى جارية على الأرضية', 'Slips already set': 'الـ slips موضوعة مسبقاً',
  'String not on the top drive': 'الـ string غير متصل بالـ top drive', 'Stop the block before setting slips': 'أوقف البلوك قبل وضع الـ slips',
  'Pick up off bottom before setting slips': 'ارفع عن القاع قبل وضع الـ slips', 'No tool joint at slip height — position the block (saver sub 1.5 m above floor ± stand length)': 'لا توجد tool joint عند ارتفاع الـ slips — حرّك البلوك (الـ saver sub 1.5 m فوق الأرضية ± طول الـ stand)',
  'Slips are not set': 'الـ slips غير موضوعة', 'Make up the top drive to the string first': 'اربط الـ top drive بالـ string أولاً', 'Take string weight on the hook before pulling slips': 'احمل وزن الـ string على الخطاف قبل رفع الـ slips',
  'Break-out needs the string in slips and connected': 'فكّ الوصلة يتطلب الـ string على الـ slips ومتصلاً', 'Stop top drive rotation first': 'أوقف دوران الـ top drive أولاً',
  'Stop the mud pumps first': 'أوقف مضخات الطين أولاً', 'Top drive must be empty and disconnected': 'يجب أن يكون الـ top drive فارغاً وغير متصل', 'No free stand on the top drive': 'لا يوجد stand حر على الـ top drive',
  'Already connected': 'متصل مسبقاً', 'String must be in slips': 'يجب أن يكون الـ string على الـ slips', 'Connection already running': 'الوصلة جارية مسبقاً',
  'String must be connected and out of slips': 'يجب أن يكون الـ string متصلاً وخارج الـ slips', 'Drill the stand down first (saver sub ≤ 3 m above floor)': 'احفر الـ stand حتى نهايته أولاً (الـ saver sub ≤ 3 m فوق الأرضية)',
  'Arm the blind/shear rams first': 'سلّح الـ blind/shear rams أولاً', 'Click again to reset ESD': 'اضغط مرة أخرى لإعادة ضبط ESD', 'Click again to activate ESD': 'اضغط مرة أخرى لتفعيل ESD',
  'Click Fire again within 3 s — the drill pipe will be cut': 'اضغط إطلاق مرة أخرى خلال 3 ثوانٍ — سيُقطع الـ drill pipe',
  'Run a pump at slow rate first (e.g. 30–40 spm, one pump)': 'شغّل مضخة بمعدل بطيء أولاً (مثلاً 30–40 spm، مضخة واحدة)', 'Need shut-in pressures and an SCR first': 'تحتاج ضغوط الإغلاق و SCR أولاً',
  'No shut-in data yet': 'لا توجد بيانات إغلاق بعد', 'Reset: drilling ahead at 3125 m': 'إعادة ضبط: حفر عند 3125 m', 'Reset: rig idle, bit 0.5 m off bottom': 'إعادة ضبط: المنصة خاملة، البت 0.5 m فوق القاع',
  'Tracer injected at pump suction': 'حُقن الـ tracer عند سحب المضخة', 'Start the mud pumps before injecting the tracer': 'شغّل مضخات الطين قبل حقن الـ tracer',
  'String not connected — no circulation path': 'الـ string غير متصل — لا يوجد مسار تدوير',
  // kill hints
  'Well is shut in — wait for pressures to stabilise, then read SIDPP / SICP.': 'البئر مغلق — انتظر استقرار الضغوط ثم اقرأ SIDPP / SICP.',
  'Record an SCR (slow-circulation rate) before the kill, or use a pre-recorded value: ICP = SIDPP + SCR pressure.': 'سجّل SCR (معدل التدوير البطيء) قبل القتل أو استخدم قيمة مسجّلة مسبقاً: ICP = SIDPP + ضغط SCR.',
  "Driller's method: 1st circulation with current mud — bring pump to {spm} spm holding casing pressure constant, then hold DPP at ICP {icp} (Auto-choke). 2nd circulation with KMW {kmw}: DPP falls from ICP to FCP {fcp} over {stk} strokes.":
    "Driller's method: التدوير الأول بالطين الحالي — ارفع المضخة إلى {spm} spm مع تثبيت ضغط الـ casing، ثم ثبّت DPP عند ICP {icp} (Auto-choke). التدوير الثاني بـ KMW {kmw}: ينخفض DPP من ICP إلى FCP {fcp} خلال {stk} ضربة.",
  'Kick response: stop rotating, pick up to space out, stop pumps, flow-check, close annular (hard shut-in), open HCR, read pressures.': 'الاستجابة للـ kick: أوقف الدوران، ارفع للـ space-out، أوقف المضخات، flow-check، أغلق الـ annular (hard shut-in)، افتح HCR، اقرأ الضغوط.',
  // templates
  '{n} in list — click to ack': '{n} في القائمة — اضغط للإقرار', 'Total {q} · {spm} spm': 'الإجمالي {q} · {spm} spm', 'Connection {i}/{n}': 'الوصلة {i}/{n}',
  'on bottom · MSE {v}': 'على القاع · MSE {v}', 'off bottom {v}': 'فوق القاع {v}', 'Scenario: {n}': 'سيناريو: {n}', 'Geohazards: {s}': 'المخاطر الجيولوجية: {s}', ON: 'تشغيل',
  'Mixing kill mud {v}': 'خلط طين القتل {v}',
  // instructor
  'INSTRUCTOR / SETUP': 'المدرّب / الإعداد', 'Scenarios (fault injection)': 'السيناريوهات (حقن الأعطال)', 'Kick (overpressured pocket)': 'Kick (جيب عالي الضغط)',
  'Lost circulation': 'فقدان التدوير (Losses)', 'Pack-off': 'Pack-off', 'String washout': 'Washout في الـ string', 'Plugged nozzle': 'Nozzle مسدودة',
  'Pump 2 valve/liner failure': 'عطل صمام/liner المضخة 2', 'TD cooling failure': 'عطل تبريد الـ TD', 'Accumulator leak': 'تسريب الـ Accumulator',
  'Accelerated bit wear': 'تآكل بت متسارع', 'Clear all faults': 'إزالة كل الأعطال', 'Well / simulation': 'البئر / المحاكاة', 'Reset — drilling (hot start)': 'إعادة — حفر (hot start)',
  'Reset — rig idle (cold start)': 'إعادة — منصة خاملة (cold start)', 'Alarm set-points': 'حدود الإنذارات', 'What is modelled': 'ما الذي يُحاكى',
  'High SPP': 'SPP مرتفع', 'Low SPP (fraction of expected)': 'SPP منخفض (نسبة من المتوقع)', 'High hook load': 'حمل خطاف مرتفع', Overpull: 'Overpull',
  'Flow deviation': 'انحراف التدفق', 'Flow deviation (% of in)': 'انحراف التدفق (% من الداخل)', 'Flow-check (pumps off)': 'Flow-check (المضخات متوقفة)',
  'Pit gain': 'زيادة الحوض', 'Pit loss': 'نقص الحوض', 'Casing P (% of MAASP)': 'ضغط الـ casing (% من MAASP)', 'Low accumulator': 'Accumulator منخفض',
  'High gas (units)': 'غاز مرتفع (وحدات)', 'High block speed': 'سرعة بلوك مرتفعة', 'TD motor temperature': 'حرارة محرك الـ TD',
  // circulation card
  'Mud Circulation': 'دورة سائل الحفر (Mud Circulation)', 'Flow in / out': 'التدفق داخل / خارج', 'Pipe velocity (vp)': 'سرعة الطين في الأنبوب (vp)',
  'Annular velocity (va)': 'السرعة الحلقية (va)', 'Nozzle jet velocity (vn)': 'سرعة نفث الـ nozzles (vn)', 'Cuttings slip velocity (vs, Moore)': 'سرعة انزلاق الـ cuttings (vs، Moore)',
  'Transport ratio (Ft)': 'نسبة النقل (Ft)', 'Cuttings concentration (Ca)': 'تركيز الـ cuttings (Ca)', 'Surface → bit': 'السطح ← البت', 'Bottoms-up': 'Bottoms-up',
  'Full circulation': 'دورة كاملة', 'Cuttings lag time': 'زمن تأخر الـ cuttings', 'Lag depth (cuttings at shaker)': 'Lag depth (cuttings عند الـ shaker)',
  'Cuttings over shakers': 'Cuttings على الـ shakers', 'Cuttings in annulus': 'Cuttings في الحلقي', 'Apparent viscosity (annulus)': 'اللزوجة الظاهرية (الحلقي)',
  'Lag test & bottoms-up': 'اختبار الـ lag و bottoms-up', 'Inject tracer': 'احقن tracer', 'Count bottoms-up': 'عُدّ bottoms-up', Tracer: 'Tracer',
  'Bottoms-up count': 'عداد bottoms-up', 'Hole cleaning': 'تنظيف البئر', GOOD: 'جيد', MARGINAL: 'حدّي', POOR: 'ضعيف', 'NO CIRCULATION': 'لا تدوير',
  'in surface lines': 'في الخطوط السطحية', 'in string': 'داخل الـ string', 'in annulus': 'في الحلقي', 'at shakers': 'عند الـ shakers', 'not injected': 'لم يُحقن',
  'done': 'اكتمل', 'not started': 'لم يبدأ',
  'Active pit': 'الحوض الفعّال', 'Mud pump': 'مضخة الطين', Standpipe: 'Standpipe', Flowline: 'Flowline', 'Shale shaker': 'Shale shaker', 'Return tanks': 'أحواض الراجع',
  'lag depth': 'lag depth', 'Bit close-up': 'البت عن قرب (PDC)', 'side view': 'منظر جانبي', 'face view': 'منظر الوجه (من الأسفل)', 'on bottom': 'على القاع', 'off bottom': 'فوق القاع', 'bit jets': 'نفث البت', 'MW scale': 'مقياس MW', 'rising': 'صاعد',
  'Radial scale exaggerated. Mud fronts, gas, cuttings and tracer are drawn at their true depth; flow arrows show relative speed. Use 20×–60× to watch transport.':
    'المقياس العرضي مكبَّر. جبهات الطين والغاز والـ cuttings والـ tracer مرسومة على عمقها الحقيقي؛ أسهم التدفق تبيّن السرعة النسبية. استخدم 20×–60× لمشاهدة النقل.',
  'Ft {ft} < 0.5': 'Ft {ft} < 0.5', 'Ca {ca} > 5 %': 'Ca {ca} > 5 %', 'Ca {ca} > 3 %': 'Ca {ca} > 3 %', 'Ft {ft} < 0.7': 'Ft {ft} < 0.7',
  'Tracer at shakers after {min} min / {stk} strokes (calculated {exp} strokes)': 'وصل الـ tracer إلى الـ shakers بعد {min} دقيقة / {stk} ضربة (المحسوب {exp} ضربة)',
};
// messages coming from the physics core with numbers inside
const PAT = [
  [/^Raise the block to the racking board \(≥ (.+) m\)$/, 'ارفع البلوك إلى الـ racking board (≥ $1 m)'],
  [/^Position block at (.+) m to stab$/, 'ضع البلوك عند $1 m لإدخال الوصلة'],
  [/^Connection step timed out: (.+)$/, (m, a) => 'انتهت مهلة خطوة الوصلة: ' + t(a)],
  [/^Auto connection aborted at step (\d+)$/, 'أُلغيت الوصلة الآلية عند الخطوة $1'],
  [/^Connection complete — stand #(\d+)$/, 'اكتملت الوصلة — stand رقم $1'],
  [/^Instructor: (.+)$/, 'المدرّب: $1'],
  [/^([A-Z]+) → (OPEN|CLOSED)$/, (m, a, b) => a + ' ← ' + t(b)],
  [/^SCR recorded: (.+)$/, 'سُجّل SCR: $1'],
  [/^Pump (\d) pop-off relief opened @ (.+)$/, 'فُتح pop-off relief للمضخة $1 عند $2'],
  [/^Added (.+)$/, 'أُضيف $1'], [/^Transferred out (.+)$/, 'نُقل خارجاً $1'],
  [/^Tracer at shakers after (.+) min \/ (.+) strokes \(calculated (.+) strokes\)$/, 'وصل الـ tracer إلى الـ shakers بعد $1 دقيقة / $2 ضربة (المحسوب $3 ضربة)'],
  [/^Bottoms-up count started: (.+) strokes$/, 'بدأ عدّ bottoms-up: $1 ضربة'],
  [/^Bottoms-up complete \((.+) strokes\)$/, 'اكتمل bottoms-up ($1 ضربة)'],
];
let lang = 'en';
function t(s) {
  if (lang !== 'ar' || s === undefined || s === null) return s;
  const k = String(s); if (Object.prototype.hasOwnProperty.call(AR, k)) return AR[k];
  for (const [re, r] of PAT) if (re.test(k)) return k.replace(re, r);
  return k;
}
function f(tpl, v) { const s = lang === 'ar' && AR[tpl] ? AR[tpl] : tpl; return s.replace(/\{(\w+)\}/g, (m, key) => v[key] === undefined ? m : v[key]); }
// static page text: translate text nodes / titles; keep the English originals to switch back
const orig = new WeakMap();
function applyStatic(rootEl) {
  const w = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('script,style,svg,[data-i18n-skip]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  for (const n of nodes) {
    let en = orig.get(n); if (en === undefined) { en = n.data; orig.set(n, en); }
    const k = en.trim(); if (!k) continue;
    const tr = lang === 'ar' && Object.prototype.hasOwnProperty.call(AR, k) ? en.replace(k, AR[k]) : en;
    if (n.data !== tr) n.data = tr;
  }
  rootEl.querySelectorAll('[title]').forEach(el => { if (el.closest('[data-i18n-skip]')) return; if (!el.dataset.enTitle) el.dataset.enTitle = el.title; el.title = t(el.dataset.enTitle); });
}
function setLang(l) {
  lang = l === 'ar' ? 'ar' : 'en';
  const h = document.documentElement; h.lang = lang; h.dir = lang === 'ar' ? 'rtl' : 'ltr';
  applyStatic(document.body);
  try { localStorage.setItem('dc-lang', lang); } catch (e) { /* storage unavailable */ }
}
function init() {
  let l = 'en';
  try { const q = new URLSearchParams(location.search).get('lang'); l = q || localStorage.getItem('dc-lang') || 'en'; } catch (e) { /* default */ }
  setLang(l);
}
root.I18N = { t, f, setLang, init, get lang() { return lang; }, AR };
})(typeof window !== 'undefined' ? window : globalThis);

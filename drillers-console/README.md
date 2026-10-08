# Driller's Console — محاكي لوحة تحكم الحفّار

لوحة تحكم تفاعلية لمنصة حفر تحاكي فيزياء مترابطة: كل زر وكل منزلق يغيّر حالة النموذج، وتنتقل النتائج إلى باقي الأنظمة (WOB ← ROP ← Torque ← SPP ← ECD ← BHP ← kick/loss).

افتح `index.html` مباشرة في المتصفح. الملف مستقل بذاته (CSS و JS مضمّنان داخله)، فيعمل بدون خادم ولا مكتبات ولا إنترنت.

الكود المصدري في `src/` (`page.html` و `style.css` و `i18n.js` و `sim.js` و `ui.js`). بعد أي تعديل أعد البناء بالأمر: `node drillers-console/build.js`، فيُنتج `index.html` من جديد.

## اللغة ودليل البارامترات
- زر **English / العربية** في شريط الأدوات يبدّل الواجهة كلها (مع اتجاه RTL للعربية). تبقى المصطلحات التقنية (WOB، ROP، SPP، ECD، BOP …) بالإنجليزية. الاختيار يُحفظ في المتصفح، ويمكن فتح العربية مباشرة بـ `?lang=ar`.
- **دليل البارامترات** (PDF، عربي + إنجليزي جنباً إلى جنب): [`guide/drillers-console-guide.pdf`](guide/drillers-console-guide.pdf). يتضمن مهمة كل بارامتر وكيف تفسّر تغيّره، ودورة الطين، وبت الـ PDC، والـ kill sheet، والإنذارات، والمراجع.
  المصدر `guide/guide.html`، ويُعاد توليد الـ PDF بالأمر `node drillers-console/guide/build-pdf.js` (يحتاج Playwright). يتضمن الآن أيضاً حاسبة البيانات الحقلية (القسم 9) وكل معادلات الحاسبة والمحاكي مع شرحها ونوعها، أي هل هي قياسية أم افتراض للنموذج (القسمان 10–11).

## حاسبة البيانات الحقلية (Field Hydraulics)
صفحة منفصلة: [`hydraulics/`](hydraulics/index.html)، ولها زر **Field Hydraulics** في شريط أدوات المحاكي. تأخذ بيانات بئر حقيقي وتحسب الهيدروليكا وفق API RP 13D بنموذج Herschel-Bulkley.
- **المدخلات:**
  - الهندسة: الـ casing والـ liner، والـ open hole مع نسبة الـ washout، والـ drill string من البت إلى الأعلى، والخطوط السطحية.
  - الـ survey: MD، وInc، وAzi، ويمكن لصقه من Excel.
  - الطين: قراءات Fann 600/300/200/100/6/3 و MW.
  - المضخات والـ nozzles، وفواقد الـ MWD/الـ motor، والحدود.
  - بيانات مقاسة للمقارنة: SPP و ECD من PWD، أو نتائج WELLPLAN/Drillbench.
- **المخرجات:**
  - SPP وتوزيعه، و ECD عند البت وعند الـ shoe.
  - هيدروليكا البت: ΔP، و HSI، وسرعة النفث، وقوة الاصطدام.
  - لكل مقطع: السرعة، ورقم Reynolds، ونظام الجريان، ومعامل الاحتكاك.
  - تنظيف البئر بمعادلة Moore: Ft و Ca.
  - ضربات الـ bottoms-up، وجدول الـ survey بطريقة minimum curvature.
  - المقارنة مع القيم المقاسة ونسبة الخطأ.
- الوحدات SI أو حقلية، بالعربي أو الإنجليزي. تصدير واستيراد JSON، وطباعة تقرير PDF.
- **ليست برنامجاً معتمداً:** تحقّق من النتائج مقابل قياسات حقيقية قبل الاعتماد عليها. كل المعادلات وشرحها في الدليل (الأقسام 9–11).
- البناء: `node drillers-console/hydraulics/build.js`. الاختبار: `node drillers-console/hydraulics/tests/core-test.js`.

## التثبيت على سطح المكتب أو الهاتف
المحاكي تطبيق ويب قابل للتثبيت (PWA)، ويعمل بدون إنترنت بعد أول فتح.
- **Chrome / Edge على الكمبيوتر:** افتح https://25im0024-lab.github.io/waled/drillers-console/ ثم اضغط أيقونة التثبيت ⊕ في آخر شريط العنوان، أو من القائمة ⋮ اختر **Install Driller's Console**.
- **Android (Chrome):** القائمة ⋮ ← **Add to Home screen** أو **Install app**.
- **iPhone / iPad (Safari):** زر المشاركة ← **Add to Home Screen**.

## ما الذي يمكن التحكم فيه
- **Auto-Driller**: وضع WOB أو ROP، وحدود WOB/Torque/RPM، مع عرض PV/SP/Output. ويوجد تحكم يدوي كامل (Hoist/Lower، Brake، Jog speed).
- **Top Drive**: الأوضاع DRILL/SPIN/TORQUE والاتجاه FWD/OFF/REV وRPM setpoint وTorque setpoint، مع محاكاة الـ stall عند تجاوز حد العزم.
- **Mud pumps 1/2/3**: تشغيل وإيقاف، وSPM، وliner size، مع حساب flow وpressure وmotor load وpop-off relief.
- **BOP / Well control**: Annular وPipe rams وBlind/Shear (Arm/Fire) وHCR وKill line وChoke (يدوي أو Auto بتثبيت DPP)، وAccumulator، وMAASP.
- **Kill sheet**: SIDPP وSICP وKMW وSCR وICP وFCP، مع حساب Strokes to bit.
- **Pipe handling**: Auto connection من 12 خطوة، أو تنفيذ يدوي (slips، break-out، make-up، pick/rack stand). الـ tripping ممكن مع Trip tank وhole fill وswab/surge.
- **Mud circulation** (دورة سائل الحفر): مخطط كامل للمسار: الحوض ← المضخة ← الـ standpipe ← داخل الـ string ← nozzles البت ← الحلقي ← الـ shakers. لون الطين يبيّن الكثافة من الـ parcels الفعلية، فتظهر جبهة طين القتل وهي تتحرك. الغاز والـ cuttings والـ tracer مرسومة على عمقها الحقيقي. القراءات:
  - السرعات: vp و va و vn، وslip velocity للـ cuttings (Moore)، وTransport ratio Ft، وتركيز الـ cuttings Ca.
  - الأحجام والأزمنة: ضربات وزمن السطح ← البت، وbottoms-up، والدورة الكاملة.
  - الـ Lag depth، وحكم على تنظيف البئر (جيد / حدّي / ضعيف).
  - أزرار: **Inject tracer** (lag test) و **Count bottoms-up**.
- **PDC bit** (بت الماس المتعدد البلورات): منظر مقرّب جانبي ومنظر للوجه، فيه blades وPDC cutters وgauge pads وnozzles وjunk slots. يدور بسرعة RPM الفعلية، وتكبر الـ wear flats مع درجة تآكل IADC.
- **Mud system**: خلط حتى MW setpoint (يصل الطين الجديد إلى الـ bit بعد إزاحة حجم الـ string)، وpit volume، وإضافة/سحب طين، وLCM pill.
- **Alarms**: نحو 27 إنذاراً بثلاث أولويات وحالات ACTIVE/ACK/CLEAR، مع event log وصوت horn اختياري.
- **Trends**: خمس مسارات (15 min إلى 6 h) مع cursor عند المرور بالمؤشر، وإخفاء أو إظهار القنوات.
- **Pressure window**: pore (prognosis/actual) وfracture وMW وECD مقابل العمق، مع lithology column.
- **Instructor**: حقن أعطال (kick، losses، pack-off، washout، plugged nozzle، pump failure، TD cooling، accumulator leak، bit wear)، وتشغيل/إيقاف geohazards، وتعديل alarm set-points.
- وحدات **SI / Field**، وسرعة محاكاة حتى 60×، واختصارات لوحة المفاتيح (↑ ↓ Space P).

## النموذج (مبسّط لأغراض التدريب، غير معاير على منصة حقيقية)
- WOB = k·(الطول المُنزَل − الطول المحفور)، حيث k = EA/L، لذلك يعمل اختبار drill-off طبيعياً.
- ROP = f(WOB, RPM, HSI, overbalance, bit wear, drillability, founder point)، بصيغة تجريبية مستوحاة من Maurer/Bourgoyne-Young. المعاملات مختارة يدوياً وليست مأخوذة من مرجع محدد.
- Friction: Bingham effective viscosity مع max(64/Re, Blasius)، وbit ΔP = ρQ²/(2Cd²A²).
- Cuttings transport: سرعة الانزلاق بمعادلة Moore (cutting بقطر 0.25 in وكثافة 2.6 sg) مع لزوجة ظاهرية للحلقي μa = PV + 5·YP·(Dh−Dp)/va. الـ cuttings تُولَّد عند البت كل 5 s وتصعد بسرعة (va − vs)، وتهبط ببطء عند إيقاف المضخات. ونسبة النقل Ft تدخل في حساب أثر الـ cuttings على الـ ECD.
- Gas kick: فقاعة واحدة بغاز مثالي (isothermal) تتحرك مع circulation وmigration بسرعة 0.05 m/s، وتتمدد كلما ارتفعت. عند تطبيق Driller's method يرتفع casing pressure كلما اقترب الغاز من السطح.
- البئر عمودي (MD = TVD)، والـ open hole قطره 12¼" تحت shoe على 2000 m.

## الاختبار
```
node drillers-console/tests/sim-smoke.js
```
يختبر: الحفر المستقر، وسرعات الدورة ونقل الـ cuttings ووصول الـ tracer عند الضربات المحسوبة، وconnection تلقائي، واكتشاف kick ثم shut-in وkill بالـ auto-choke حتى خروج الغاز، والـ losses، والـ washout، والـ pack-off، والـ plugged nozzle، وعطل المضخة، والحفر داخل gas sand.

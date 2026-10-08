# Driller's Console — محاكي لوحة تحكم الحفّار

لوحة تحكم تفاعلية لمنصة حفر تحاكي فيزياء مترابطة: كل زر وكل منزلق يغيّر حالة النموذج، وتنتقل النتائج إلى باقي الأنظمة (WOB ← ROP ← Torque ← SPP ← ECD ← BHP ← kick/loss).

افتح `index.html` مباشرة في المتصفح. الملف مستقل بذاته (CSS و JS مضمّنان داخله)، فيعمل بدون خادم ولا مكتبات ولا إنترنت.

الكود المصدري في `src/` (`page.html` و `style.css` و `sim.js` و `ui.js`). بعد أي تعديل أعد البناء بالأمر: `node drillers-console/build.js`، فيُنتج `index.html` من جديد.

## ما الذي يمكن التحكم فيه
- **Auto-Driller**: وضع WOB أو ROP، وحدود WOB/Torque/RPM، مع عرض PV/SP/Output. ويوجد تحكم يدوي كامل (Hoist/Lower، Brake، Jog speed).
- **Top Drive**: الأوضاع DRILL/SPIN/TORQUE والاتجاه FWD/OFF/REV وRPM setpoint وTorque setpoint، مع محاكاة الـ stall عند تجاوز حد العزم.
- **Mud pumps 1/2/3**: تشغيل وإيقاف، وSPM، وliner size، مع حساب flow وpressure وmotor load وpop-off relief.
- **BOP / Well control**: Annular وPipe rams وBlind/Shear (Arm/Fire) وHCR وKill line وChoke (يدوي أو Auto بتثبيت DPP)، وAccumulator، وMAASP.
- **Kill sheet**: SIDPP وSICP وKMW وSCR وICP وFCP، مع حساب Strokes to bit.
- **Pipe handling**: Auto connection من 12 خطوة، أو تنفيذ يدوي (slips، break-out، make-up، pick/rack stand). الـ tripping ممكن مع Trip tank وhole fill وswab/surge.
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
- Gas kick: فقاعة واحدة بغاز مثالي (isothermal) تتحرك مع circulation وmigration بسرعة 0.05 m/s، وتتمدد كلما ارتفعت. عند تطبيق Driller's method يرتفع casing pressure كلما اقترب الغاز من السطح.
- البئر عمودي (MD = TVD)، والـ open hole قطره 12¼" تحت shoe على 2000 m.

## الاختبار
```
node drillers-console/tests/sim-smoke.js
```
يختبر: الحفر المستقر، وconnection تلقائي، واكتشاف kick ثم shut-in وkill بالـ auto-choke حتى خروج الغاز، والـ losses، والـ washout، والـ pack-off، والـ plugged nozzle، وعطل المضخة، والحفر داخل gas sand.

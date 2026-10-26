# Virtual Lab — المختبر الافتراضي

مختبر ثلاثي الأبعاد يعمل في المتصفح، بدرسين:

1. **اختبارات اللهب (Flame Tests)**: موقد Bunsen بفتحة هواء، وسلك nichrome، وكأس HCl مخفف للتنظيف، وسبعة أملاح (LiCl، NaCl، KCl، CaCl₂، SrCl₂، CuCl₂، BaCl₂)، وعيّنة مجهولة. فيه أيضاً spectroscope حي يعرض خطوط الانبعاث، وزجاج كوبالت يحجب أصفر Na، وتلوّث واقعي بآثار Na، وبقايا تنتقل على السلك إن لم يُنظَّف.
2. **جل التكسير WLM (thesis bench)**: تحضير جل NaOA / KCl / guar خطوة بخطوة على hotplate stirrer، مع nano view يُظهر الانتقال: monomers ← micelles قصيرة ← wormlike micelles متشابكة ← قطيرات microemulsion بعد الكسر. فيه أيضاً rheometer (G′/G″ و η(γ̇)) مع مقارنة القياسات، واختبار تعليق proppant 20/40، والتسخين، والكسر بالـ kerosene (للـ WLM) والـ APS (للـ guar).

افتحه من: `https://25im0024-lab.github.io/waled/vlab/` (عربي)، أو `?lang=en` للإنجليزية، أو `?lesson=gel` للبدء بدرس الجل مباشرة.

## للعرض (presentation)

- زر **▶ عرض** يفتح ملء الشاشة ويحوّل بطاقة الخطوة إلى شريط شرح كبير.
- الأسهم → و ← تتحكم بالعرض، وكذلك PageDown و PageUp، فيعمل أي presentation clicker. إذا لم تكتمل الخطوة نفّذها التطبيق بنفسه مع الحركة، وإذا اكتملت انتقل إلى التالية.
- كل الملفات محلية، و Three.js مضمَّن في `vendor/`، فيعمل دون إنترنت. بعد أول فتح يبقى مخزّناً (PWA). ويمكن أيضاً فتح `index.html` مباشرة من القرص.

## الأرقام: ما الثابت وما التوضيحي

| الجزء | الحالة |
|---|---|
| مواضع الخطوط الذرية (Na 589.0/589.6، K 766.5/769.9 و 404، Li 670.8، Ba 553.5 nm…) | قيم مرجعية ثابتة |
| مواضع الحزم الجزيئية (CaOH، SrOH، CuCl) | تقريبية |
| منحنى نفاذية زجاج الكوبالت | تقريبي، والسلوك صحيح نوعياً |
| لزوجة الماء (معادلة Vogel)، وقانون السحب Schiller–Naumann، وحد Stokes | ثابتة |
| اتجاهات الجل: Cates scaling (G₀ ∝ c^2.25)، Arrhenius لـ τR، ومنحنى Morris للـ guar، والكسر بالـ hydrocarbon والـ persulfate | اتجاهات معروفة |
| القيم المرجعية للجل (G₀ = 30 Pa و τR = 1.5 s عند NaOA 8 g، وطاقات التنشيط، وزمن الـ hydration، ومعدل الـ APS) | **افتراضية للعرض فقط، وليست قياسات** |

النموذج يجمع إسهام الـ WLM والـ guar دون حد تآزر، لأن التآزر هو ما تقرّره القياسات.

**استخدام بياناتك:** في درس الجل اختر «بياناتي في FracGel Lab». إذا كانت [FracGel Lab](../fracgel/) على نفس الموقع وفيها قيم G₀ و τR (أو η₀) للعينة المختارة، تُستخدم هذه القيم عند 25 °C قبل أي تسخين أو breaker. وإن فُتح المختبر من مكان آخر فاستورد ملف JSON المصدَّر من FracGel Lab. وإن كانت البيانات «بيانات المثال» في FracGel تظهر شارة تقول ذلك.

## الملفات

- `index.html`، `css/style.css`: الواجهة.
- `js/model.js`: العلوم دون DOM أو Three.js، ويُختبر في Node.
- `js/app.js`: المشهد، والكاميرا، والاختيار بالنقر، والحركات، والبطاقات، والعرض، والترجمة.
- `js/flame.js` و `js/gel.js`: الدرسان. كل درس مصفوفة `steps` فيها لكل خطوة `title` و `text` و `conf` و `target` و `done` و `auto`، فإضافة خطوة أو درس جديد لا تحتاج تعديل الـ shell.
- `vendor/`: Three.js r147 (MIT) و OrbitControls.

الاختبار: `node vlab/tests/model-test.js`

## مراجع النموذج

- Israelachvili, J. N., Mitchell, D. J., Ninham, B. W. (1976). *J. Chem. Soc., Faraday Trans. 2*, 72, 1525: الـ packing parameter.
- Cates, M. E. (1987). *Macromolecules*, 20, 2289: تعاقب الـ reptation والانكسار، و Maxwell.
- Morris, E. R., Cutler, A. N., Ross-Murphy, S. B., Rees, D. A., Price, J. (1981). *Carbohydrate Polymers*, 1, 5: منحنى c[η] للسكريات المتعددة.
- Molchanov, V. S., Philippova, O. E., Khokhlov, A. R., et al. (2007). *Langmuir*, 23, 105: كسر شبكات potassium oleate بالـ hydrocarbons.

راجع بيانات كل مرجع (السنة والصفحات و DOI) من المصدر قبل نقلها إلى الرسالة.

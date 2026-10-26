# أدوات هندسة الحفر — Drilling Engineering Tools

### ▶ [الصفحة الرئيسية: كل الأدوات وطريقة التثبيت ورموز QR](https://25im0024-lab.github.io/waled/)

- **[محاكي لوحة الحفّار](https://25im0024-lab.github.io/waled/drillers-console/?lang=ar)**: للتدريب.
- **[حاسبة البيانات الحقلية](https://25im0024-lab.github.io/waled/drillers-console/hydraulics/?lang=ar)**: تعمل وفق API RP 13D بنموذج Herschel-Bulkley.
- **[محاكي وحدة FPSO](https://25im0024-lab.github.io/waled/fpso/?lang=ar)**: تطبيق مستقل يغطي مسار الإنتاج البحري من المكمن حتى التفريغ، مع شرح لكل جزء.
- **[الدليل الشامل للـ FPSO بصيغة PDF](https://25im0024-lab.github.io/waled/fpso/guide/fpso-guide.pdf)**: 28 صفحة بالعربي والإنجليزي، تشرح كل جوانب الـ FPSO وكل معادلات المحاكي.
- **[دليل البارامترات PDF](https://25im0024-lab.github.io/waled/drillers-console/guide/drillers-console-guide.pdf)**: بالعربي والإنجليزي، ويضم كل المعادلات.

رموز QR جاهزة للعروض والملصقات في [`qr/`](qr/): ملفات SVG للطباعة و PNG للعروض.

**الجودة والاستشهاد:** كل تعديل يمرّ تلقائياً عبر اختبارات GitHub Actions ([`tests.yml`](.github/workflows/tests.yml)) لكل المحاكيات والحاسبات، مع التحقق من أن الصفحات المنشورة مبنية من مصدرها. وللاستشهاد بالأدوات في التدريس أو البحث استخدم [`CITATION.cff`](CITATION.cff)، فيظهر زر "Cite this repository" في GitHub.

**الترخيص:** [MIT](LICENSE). يمكنك الاستخدام والتعديل وإعادة النشر بشرط إبقاء إشعار الترخيص. البرنامج مقدَّم "كما هو" دون أي ضمان. المحاكي نموذج تدريبي، والحاسبة أداة مساعدة غير معتمدة، فتحقّق من نتائجها بقياسات حقيقية.

---

https://github.com/25im0024-lab/waled/commit/be429ce5f3b571389ec05952bc00c307bfe19e9d

## UHS-MD: Hydrogen Storage in Carbonates (LAMMPS)

### ▶ [Open UHS Pore Lab (runs in the browser)](https://25im0024-lab.github.io/waled/uhs-md/)

Live 3D molecular dynamics of H2 with a cushion gas (CO2, CH4 or N2) in a calcite nanopore, with brine and methanogenic bacteria, and a 3D player for the full atomistic LAMMPS model: [`uhs-md/`](uhs-md/README.md).

## FracGel Lab — NaOA/KCl/guar fracturing gel

### ▶ [افتح FracGel Lab](https://25im0024-lab.github.io/waled/fracgel/)

منضدة عمل بحثية لجل التكسير المكوّن من sodium oleate و KCl و guar: مصفوفة العينات (NaOA 6/8/10 × guar 0/0.3/0.5/0.7 g مع KCl 1 g لكل 100 mL ماء، و G0.7-K) مع عينات الضبط ومؤشر التآزر، وتحليل Maxwell للـ frequency sweep، و power law للـ flow curve، وحاسبة ترسيب الـ proppant، وترتيب التركيبات بالـ desirability (Derringer–Suich)، وسطح استجابة quadratic يقترح نقطة تحقق. البيانات تُحفظ في المتصفح، مع تصدير JSON و CSV، ويمكن حفظها commit في مستودع GitHub خاص (زر GitHub في الأداة، بـ fine-grained token مقصور على ذلك المستودع). اختبار الحسابات: `node fracgel/tests/core-test.js`.

## Frac Gel Lab 3D — مختبر جل التكسير

### ▶ [افتح المختبر](https://25im0024-lab.github.io/waled/vlab/)

مختبر ثلاثي الأبعاد لتحضير جل NaOA / KCl / guar مع nano view يُظهر الانتقال من محلول إلى wormlike micelles، و rheometer، وتعليق الـ proppant، والتسخين، والكسر. فيه وضع عرض يعمل بالـ clicker، ويقرأ قياساتك من FracGel Lab. التفاصيل وما هو توضيحي من الأرقام: [`vlab/`](vlab/README.md). الاختبار: `node vlab/tests/model-test.js`.

## IELTS Coach

تدريب على اختبار IELTS Academic (Reading / Listening / Writing / Speaking) بنمط الاختبار الحقيقي: [`ielts/`](ielts/README.md).

## رحلة البرميل (Oilfield Guide)

أداة تفاعلية تشرح مسار النفط من قاع البئر إلى التصدير، مع تبويب للتكسير الهيدروليكي وحاسبات هندسية: [`oilfield/`](oilfield/).

بعد دمج الفرع في `main` وتفعيل GitHub Pages (Settings → Pages → Branch: `main` / root) تُفتح من:
`https://25im0024-lab.github.io/waled/oilfield/`

الأداة تطبيق ويب قابل للتثبيت (PWA): من Chrome أو Edge اختر Install / Create shortcut، ومن Safari على iPhone اختر Add to Home Screen. تعمل بدون إنترنت بعد أول فتح (الخطوط فقط تحتاج اتصالاً في أول مرة).

الكود المصدري في `oilfield/src/`، وللبناء: `node oilfield/build.js` (ينتج `oilfield/index.html`). اختبار سريع للحسابات: `node oilfield/tests/core-smoke.js`.

## Driller's Console — محاكي لوحة الحفّار

لوحة تحكم تفاعلية لمنصة حفر (auto-driller، top drive، mud pumps، BOP و well control، alarms، trends).

### ▶ [افتح المحاكي](https://25im0024-lab.github.io/waled/drillers-console/)

الواجهة بالإنجليزية والعربية (زر English / العربية، أو [النسخة العربية مباشرة](https://25im0024-lab.github.io/waled/drillers-console/?lang=ar)). دليل البارامترات PDF ثنائي اللغة: [`drillers-console/guide/drillers-console-guide.pdf`](drillers-console/guide/drillers-console-guide.pdf).

الكود والشرح: [`drillers-console/`](drillers-console/README.md).

### ▶ [حاسبة الهيدروليكا للبيانات الحقلية](https://25im0024-lab.github.io/waled/drillers-console/hydraulics/)
تعمل وفق API RP 13D بنموذج Herschel-Bulkley، وتقارن النتائج بالقيم المقاسة. أداة مساعدة هندسية وليست برنامجاً معتمداً.

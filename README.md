# أدوات هندسة الحفر — Drilling Engineering Tools

### ▶ [الصفحة الرئيسية: كل الأدوات وطريقة التثبيت ورموز QR](https://25im0024-lab.github.io/waled/)

- **[محاكي لوحة الحفّار](https://25im0024-lab.github.io/waled/drillers-console/?lang=ar)**: للتدريب.
- **[حاسبة البيانات الحقلية](https://25im0024-lab.github.io/waled/drillers-console/hydraulics/?lang=ar)**: تعمل وفق API RP 13D بنموذج Herschel-Bulkley.
- **[محاكي وحدة FPSO](https://25im0024-lab.github.io/waled/fpso/?lang=ar)**: تطبيق مستقل يغطي مسار الإنتاج البحري من المكمن حتى التفريغ، مع شرح لكل جزء.
- **[دليل البارامترات PDF](https://25im0024-lab.github.io/waled/drillers-console/guide/drillers-console-guide.pdf)**: بالعربي والإنجليزي، ويضم كل المعادلات.

رموز QR جاهزة للعروض والملصقات في [`qr/`](qr/): ملفات SVG للطباعة و PNG للعروض.

**الجودة والاستشهاد:** كل تعديل يمرّ تلقائياً عبر اختبارات GitHub Actions ([`tests.yml`](.github/workflows/tests.yml)) لكل المحاكيات والحاسبات، مع التحقق من أن الصفحات المنشورة مبنية من مصدرها. وللاستشهاد بالأدوات في التدريس أو البحث استخدم [`CITATION.cff`](CITATION.cff)، فيظهر زر "Cite this repository" في GitHub.

**الترخيص:** [MIT](LICENSE). يمكنك الاستخدام والتعديل وإعادة النشر بشرط إبقاء إشعار الترخيص. البرنامج مقدَّم "كما هو" دون أي ضمان. المحاكي نموذج تدريبي، والحاسبة أداة مساعدة غير معتمدة، فتحقّق من نتائجها بقياسات حقيقية.

---

https://github.com/25im0024-lab/waled/commit/be429ce5f3b571389ec05952bc00c307bfe19e9d

## UHS-MD: Hydrogen Storage in Carbonates (LAMMPS)

Molecular Dynamics of H2 with a cushion gas (CO2, CH4 or N2) in a calcite nanopore, with brine and the effect of bacteria (methanogenesis): [`uhs-md/`](uhs-md/README.md).

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

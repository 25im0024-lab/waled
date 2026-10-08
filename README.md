https://github.com/25im0024-lab/waled/commit/be429ce5f3b571389ec05952bc00c307bfe19e9d

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

الكود والشرح: [`drillers-console/`](drillers-console/README.md).

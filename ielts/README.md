# IELTS Coach

تدريب على IELTS Academic بنمط الاختبار الحقيقي: **Reading** و**Listening** و**Writing** و**Speaking**، مع مفردات بالتكرار المتباعد، وGrammar، وتصحيح آلي بـ Claude. صفحة ثابتة بلا سيرفر ولا build، وتعمل أوفلاين بعد أول تحميل (PWA).

## التشغيل

- **محليًا:** افتح `ielts/index.html` في Chrome أو Edge. (الميكروفون يحتاج `https` أو `localhost`: شغّل `python3 -m http.server` من جذر المستودع وافتح `http://localhost:8000/ielts/`.)
- **GitHub Pages:** `Settings → Pages → Build and deployment → Source: Deploy from a branch` → اختر الفرع والمجلد `/ (root)`. يصبح الرابط `https://<user>.github.io/<repo>/ielts/`.

## ما فيها

| القسم | المحتوى |
|---|---|
| **Plan** | خطة دراسة من اليوم حتى الاختبار (تشخيص ← أساسيات ← بناء ← تدريب تحت الوقت ← محاكاة ← أسبوع تخفيف) حسب ساعاتك ويوم راحتك وأضعف مهارة. مهام يومية بعلامات إنجاز وروابط للأقسام، وتسجيل نتائج اختبارات Cambridge الرسمية (درجة خام ← band تقريبي ← منحنى التقدم)، ودفتر أخطاء |
| Reading | اختبار كامل: 3 نصوص، 40 سؤالًا، 60 د، شاشة مقسومة، navigator وflags وhighlighter، استئناف بعد إغلاق الصفحة، تحليل دقة حسب نوع السؤال. + 4 نصوص تدريب مفردة |
| Listening | 4 أقسام، 40 سؤالًا، تسلسل الاختبار (30 ث قراءة ← تشغيل مرة واحدة ← 30 ث مراجعة)، أصوات متعددة، خريطة SVG، Dictation |
| Writing | اختبار 60 د (Task 1 + Task 2) أو مهمة واحدة. 11 مهمة Task 1 برسوم SVG (line/bar/stacked/horizontal/pie/table/process/map) و20 سؤال Task 2 |
| Speaking | ممتحِن صوتي، Parts 1–3، تسجيل وتفريغ نصي، مراجعة وتصحيح التفريغ قبل التقييم |
| Vocabulary | 173 كلمة وعبارة في 8 مجموعات (منها Energy & industry وScience) + كلماتك، نظام Leitner |
| Grammar | 46 سؤالًا بفئات، الأخطاء تتكرر حتى تُتقَن |
| Toolkit | صيغة الاختبار، ملخص الـ band descriptors، عبارات Task 1/2، أخطاء الناطقين بالعربية |

## تصحيح Claude (اختياري)

أدخل مفتاح Anthropic API في صفحة Writing أو Speaking. الطلب يخرج **من متصفحك مباشرة** إلى `api.anthropic.com` عبر SDK الرسمي المضمَّن محليًا في `vendor/anthropic-sdk.js` (لا CDN، لتجنّب تحميل كود خارجي في صفحة تحمل مفتاحك).

- المخرجات JSON ملتزمة بـ schema (`output_config.format`) وتُرسَم كتقرير: band لكل معيار، أهم المشكلات بشواهد، تصحيحات سطرية، أنماط الناطقين بالعربية، فقرة محسّنة، مهمة تالية.
- الـ Overall يُحسب في الصفحة (متوسط المعايير مقرَّبًا لنصف band) وليس بحساب النموذج. وWriting = (Task 1 + 2 × Task 2) ÷ 3.
- الافتراضي `claude-opus-5-5` ويمكن اختيار `claude-sonnet-5-5` (أرخص) أو `claude-fable-5-1`. المحاولة الأولى تطلب refusal-fallback من الخادم، وعند رفضها بـ 400 تُعاد بدونه.
- **الأمان:** المفتاح يُحفظ في `sessionStorage` (يضيع بإغلاق التبويب) إلا إذا اخترت "تذكّر" فيُحفظ في `localStorage`. أي إضافة متصفح أو شخص يصل لملفات موقعك قد يقرأه، فاستخدم مفتاحًا مخصّصًا بحد إنفاق منخفض ولا تستخدمه على جهاز مشترك.
- **حدود:** التقدير آلي (قد يختلف عن examiner بشري بنصف إلى درجة). في Speaking يُقيَّم **النص فقط** فلا يشمل النطق.
- بدون مفتاح: فحوص محلية شكلية + زر "نسخ prompt" للصقه في أي محادثة Claude.

## بنية المشروع

```
ielts/
  index.html, manifest.webmanifest, sw.js, icon.svg
  css/app.css
  vendor/anthropic-sdk.js          # @anthropic-ai/sdk مجمَّع بـ esbuild (MIT)
  js/core.js                        # store, TTS متعدد الأصوات, timers, جداول band, router
  js/charts.js                      # رسوم SVG
  js/exam.js                        # محرك الأسئلة المشترك (Reading/Listening)
  js/ai.js                          # Claude + فحوص محلية
  js/data/*.js                      # المحتوى
  js/mod/*.js                       # الأقسام (home, plan, reading, listening, writing, speaking, vocab, grammar, toolkit)
  tools/validate-data.js            # فحص سلامة المحتوى
```

## إضافة محتوى

1. اعدّل `js/data/reading.js` أو `listening.js` بنفس البنية (أنواع الأسئلة: `tfng, ynng, mcq, mcq2, complete, short, heading, match, map, summary`).
2. شغّل `node ielts/tools/validate-data.js`: يتحقق من العدد (40)، ومن أن كل مفتاح إجابة صالح، ومن مطابقة placeholders الملخص، ومن أن بيانات الرسوم تجمع 100%.
3. نصوص Reading في `paras` وكل سؤال يحمل `ev` (دليل/تفسير) يظهر في المراجعة.

## ملاحظات صدق

- كل الأسئلة والنصوص **مؤلَّفة أصليًا** وليست من اختبارات رسمية. نصوص Reading ≈ 450–700 كلمة (الحقيقية 700–1000) وأقسام Listening ≈ 3 دقائق (الحقيقية ≈ 7).
- جدول تحويل الدرجة الخام إلى band **تقريبي** (يختلف قليلًا بين نسخ الاختبار)؛ الرسمي على `ielts.org`.
- صوت Listening اصطناعي من المتصفح (أفضل جودة في Edge)، وليس لهجات حقيقية.
- ألوان الرسوم مُتحقَّق منها لعمى الألوان على الخلفية الداكنة (5 ألوان متجاورة: أسوأ CVD ΔE = 8.4 ≥ 8، أسوأ فرق بصري عادي 19.3 ≥ 15). الـ Pie بخمس شرائح يعتمد على legend وتسميات القيم لا على اللون وحده.
- بيانات الرسوم في Task 1 مُختلقة للتدريب.

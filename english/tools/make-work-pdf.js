#!/usr/bin/env node
/* Builds guide/english-for-work.pdf (bilingual guide for the adults' section) from the app data, using Playwright's Chromium.
   Usage: node english/tools/make-work-pdf.js */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const d = require('./load-data.js')().data;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LV = { A2: 'أساسي', B1: 'متوسط' };

const unitHtml = (u, n) => `
<section class="unit">
  <h2><span class="num">${n}</span> ${u.icon} <span class="en">${esc(u.title[0])}</span> <span class="lv">${u.level}</span><span class="ar t">${esc(u.title[1])}</span></h2>
  <p class="goal"><span class="en">${esc(u.desc[0])}</span> <span class="ar">${esc(u.desc[1])}</span></p>
  <h3>العبارات الأساسية · Key phrases</h3>
  <table>${u.phrases.map(p => `<tr><td class="en">${esc(p[0])}${p[2] ? `<div class="tip">💡 ${esc(p[2])}</div>` : ''}</td><td class="ar">${esc(p[1])}</td></tr>`).join('')}</table>
  <h3>حوار نموذجي · Model dialogue</h3>
  <div class="dlg">${u.dialogue.lines.map(l => { const sp = u.dialogue.speakers[l[0]]; return `<div class="line"><div class="en"><b>${esc(sp.name)}:</b> ${esc(l[1])}</div><div class="ar">${esc(l[2])}</div></div>`; }).join('')}</div>
  <h3>ماذا تقول؟ · What do you say?</h3>
  <table class="sim">${u.sim.map(s => { const best = s.opts.find(o => o[1] === 2), bad = s.opts.find(o => o[1] === 0) || s.opts.find(o => o[1] === 1);
    return `<tr><td colspan="2" class="sit"><span class="en">${esc(s.say[0])}</span> <span class="ar">— ${esc(s.say[1])}</span></td></tr>
    <tr><td class="en good">✅ ${esc(best[0])}<div class="why"><span class="en">${esc(best[2])}</span> <span class="ar">${esc(best[3])}</span></div></td><td class="en bad">❌ ${esc(bad[0])}<div class="why"><span class="en">${esc(bad[2])}</span> <span class="ar">${esc(bad[3])}</span></div></td></tr>`; }).join('')}</table>
  ${u.email ? `<h3>رسالة نموذجية · Model email</h3><div class="email"><div class="en"><b>Subject:</b> ${esc(u.email.subject)}</div>${u.email.body.map(l => `<div class="en">${esc(l[0])}<span class="ar sm"> — ${esc(l[1])}</span></div>`).join('')}</div>` : ''}
  <p class="practice"><b>تدرّب · Practise:</b> <span class="muted">أنت · You:</span> <span class="en">${esc(u.ai.role[1])}</span> — <span class="muted">شريكك · Partner:</span> <span class="en">${esc(u.ai.role[0])}</span><br><span class="muted">الهدف · Goal:</span> <span class="en">${esc(u.ai.goal)}</span></p>
</section>`;

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@page{size:A4;margin:16mm 14mm 18mm}
*{box-sizing:border-box}body{font-family:"Noto Naskh Arabic","Noto Sans Arabic","DejaVu Sans",system-ui,Arial,sans-serif;color:#1b2430;font-size:10.5pt;line-height:1.55;margin:0}
.en{direction:ltr;unicode-bidi:isolate;text-align:left}.ar{direction:rtl;unicode-bidi:isolate;text-align:right;color:#27527a}.muted{color:#667}
.cover{height:255mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;page-break-after:always}
.cover .logo{font-size:60pt}.cover h1{font-size:30pt;margin:6pt 0}.cover .sub{font-size:14pt;color:#444}.cover .box{margin-top:22pt;border:1.5px solid #2563eb;border-radius:10px;padding:10pt 16pt;color:#2563eb;font-weight:700}
h2{font-size:15pt;margin:0 0 4pt;border-bottom:2.5px solid #2563eb;padding-bottom:3pt;display:flex;gap:8pt;align-items:baseline;flex-wrap:wrap}
h2 .num{background:#2563eb;color:#fff;border-radius:50%;width:20pt;height:20pt;display:inline-flex;align-items:center;justify-content:center;font-size:10pt}
h2 .t{font-size:11pt;margin-inline-start:auto}.lv{font-size:8.5pt;background:#e8f0fe;color:#2563eb;border-radius:8px;padding:1px 7px}
h3{font-size:11pt;margin:10pt 0 3pt;color:#2563eb;break-after:avoid}
.unit{page-break-before:always}.goal{margin:2pt 0 6pt}
table{width:100%;border-collapse:collapse;font-size:10pt}td{border:1px solid #cfd8e3;padding:3.5pt 6pt;vertical-align:top}tr{break-inside:avoid}
td.en{width:55%;font-weight:600}.tip{font-weight:400;font-size:8.5pt;color:#667}
.dlg .line{border-bottom:1px dotted #cfd8e3;padding:2pt 0;break-inside:avoid}.dlg .ar{font-size:9.5pt}
.sim .sit{background:#f2f6fb;font-weight:700}.sim td.good{background:#eefaf2;width:50%}.sim td.bad{background:#fdf0f0;width:50%;font-weight:400}.why{font-weight:400;font-size:8.5pt;color:#556;margin-top:2pt}
.email{border:1px solid #cfd8e3;border-radius:8px;padding:6pt 10pt;background:#fafcff}.sm{font-size:8.5pt}
.practice{margin-top:8pt;background:#fff8e6;border-radius:8px;padding:5pt 9pt}
.how li{margin:3pt 0}.how h2,.words h2,.note h2{margin-top:0}
.words table{font-size:9.5pt}.words td{padding:2.5pt 6pt}.words table td.en{width:25%}.note{font-size:9pt}.note h3{margin-top:6pt}
.foot{margin-top:12pt;font-size:8.5pt;color:#667}
</style></head><body>
<div class="cover"><div class="logo">💼</div><h1>English for Work</h1><div class="sub ar">دليل الإنجليزية في العمل — للبالغين</div><div class="sub en">Speaking and writing guide · Levels A2–B1</div>
<div class="box en">English Hub · github.com/25im0024-lab/waled/tree/main/english</div><p class="foot ar" style="margin-top:30pt">الترجمات العربية كُتبت بمساعدة الذكاء الاصطناعي ولم يراجعها مدرّس معتمد بعد.</p></div>

<section class="how"><h2>كيف تستخدم هذا الدليل · How to use this guide</h2>
<ol>
<li><b>اقرأ العبارات بصوت عالٍ</b> وكرّر كل عبارة 3 مرات. النطق والإيقاع أهم من الحفظ الحرفي.</li>
<li><b>اقرأ الحوار بدورين:</b> مرة بدور الأول ومرة بدور الثاني. ثم أخفِ العمود الإنجليزي وحاول أن تقوله من المعنى العربي.</li>
<li><b>جدول «ماذا تقول؟»:</b> الصيغة الخضراء هي الأنسب مهنيًا، والحمراء أمثلة على ما يُفضَّل تجنّبه مع السبب.</li>
<li><b>استخدم عبارة واحدة على الأقل</b> من كل وحدة في عملك الحقيقي هذا الأسبوع، في رسالة أو مكالمة أو اجتماع.</li>
<li><b>للتدريب التفاعلي</b> (صوت، تمثيل أدوار، تسجيل صوتك، مراجعة الأخطاء) استخدم تطبيق English Hub، قسم «العمل».</li>
</ol>
<h3>الوحدات · Units</h3>
<table>${d.work.units.map((u, i) => `<tr><td class="en">${i + 1}. ${u.icon} ${esc(u.title[0])} <span class="lv">${u.level}</span></td><td class="ar">${esc(u.title[1])}</td></tr>`).join('')}</table>
</section>
${d.work.units.map((u, i) => unitHtml(u, i + 1)).join('')}
<section class="unit words"><h2>مفردات الأعمال · Business words</h2>
<table>${d.work.words.map(w => `<tr><td class="en"><b>${esc(w[0])}</b> ${w[2]}</td><td class="en" style="width:35%;font-weight:400">${esc(w[3])}</td><td class="ar">${esc(w[1])}<div class="sm">${esc(w[4])}</div></td></tr>`).join('')}</table>
<div class="note"><h3>ملاحظات · Notes</h3><ul>
<li>الأدب في الإنجليزية المهنية يأتي من الصيغة: <span class="en"><b>Could you…? / I was wondering if… / I'm afraid…</b></span> بدل الأمر المباشر.</li>
<li>الجملة الكاملة أفضل من كلمة واحدة: «Yes.» وحدها تُنهي الحديث، أمّا «Yes, thanks. And you?» فتُبقيه.</li>
<li>إن لم تفهم فاطلب الإعادة بأدب: <span class="en"><b>Sorry, could you repeat that, please?</b></span></li>
</ul>
<p class="foot ar">المحتوى والترجمة العربية كُتبا بمساعدة الذكاء الاصطناعي ولم يراجعهما مدرّس معتمد؛ إن وجدت خطأً فأبلغ عنه من التطبيق (زر «🚩 أبلغ عن خطأ»). الترخيص: MIT (مستودع waled). <span class="en">Provided "as is", without warranty.</span></p></div></section>
</body></html>`;

(async () => {
  const out = path.join(__dirname, '..', 'guide'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.pdf({ path: path.join(out, 'english-for-work.pdf'), format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#778;font-family:Arial">English Hub · English for Work · <span class="pageNumber"></span> / <span class="totalPages"></span></div>', margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' } });
  await b.close();
  console.log('wrote english/guide/english-for-work.pdf');
})();

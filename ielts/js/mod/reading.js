/* Reading module — exam-style split-screen test with timer, navigator, flags, highlighter, resume, review. */
(function () {
  'use strict';
  const I = window.IELTS, { $, $$, esc } = I, X = I.exam;
  const PKEY = 'ielts_progress_reading_v1';
  const loadP = () => { try { return JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch (e) { return null; } };
  const saveP = p => { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { } };
  const clearP = () => { try { localStorage.removeItem(PKEY); } catch (e) { } };

  function landing() {
    const D = I.data.reading, res = loadP(), hist = I.S.reading.slice(-6).reverse();
    $('#view').innerHTML = `
    ${res ? `<div class="card" style="border-color:var(--orange)"><h2>اختبار غير مكتمل</h2><p>لديك محاولة محفوظة: <b>${esc(res.title)}</b> — المتبقي ${I.fmt(Math.max(0, Math.round((res.endsAt - Date.now()) / 1000)))}.</p><div class="row"><button class="primary" id="rs">أكمل</button><button class="danger" id="rd">تجاهل</button></div></div>` : ''}
    <div class="card"><h2>Academic Reading — اختبار كامل</h2>
      <p>3 نصوص، 40 سؤالًا، 60 دقيقة، بأنواع أسئلة الاختبار الحقيقي (True/False/Not Given، Matching headings، Yes/No/Not Given، Multiple choice، Matching، Summary completion، Sentence completion). لا تصحيح قبل التسليم، ولا وقت إضافي لنقل الإجابات في Reading.</p>
      <div class="row">${D.tests.map(t => `<button class="primary" data-t="${t.id}">ابدأ: ${esc(t.title)}</button>`).join('')}</div></div>
    <div class="card"><h2>تدريب سريع — نص واحد (20 دقيقة)</h2><div class="row">${D.practice.map(t => `<button data-p="${t.id}">${esc(t.title.replace('Academic Reading — ', ''))}</button>`).join('')}</div>
      <p class="muted">النصوص مؤلَّفة أصليًا بطول ~450–700 كلمة، أقصر قليلًا من نصوص الاختبار الحقيقي (التي تبلغ عادةً 700–1000). التحويل إلى band تقريبي.</p></div>
    <div class="card"><h2>سجل Reading</h2>${hist.length ? `<table class="result-table"><tr><th>التاريخ</th><th>الاختبار</th><th>الدرجة</th><th>Band ≈</th></tr>${hist.map(h => `<tr><td>${esc(h.date)}</td><td class="l">${esc(h.title)}</td><td>${h.score}/${h.of}</td><td>${I.band.label(I.band.fromRaw('reading', h.score, h.of))}</td></tr>`).join('')}</table>` : '<p class="muted">لا توجد محاولات بعد.</p>'}</div>
    <div class="card"><h2>استراتيجيات سريعة</h2><ul class="muted">
      <li>اقرأ الأسئلة أولًا، ثم ابحث عن الكلمات المفتاحية وأسماء الأعلام والأرقام (scanning) بدل قراءة كل كلمة.</li>
      <li>True/False/Not Given: False = النص <b>يناقض</b> المعلومة، Not Given = لا معلومة عنها إطلاقًا. لا تستخدم معرفتك الخارجية.</li>
      <li>Matching headings: ابدأ بالعناوين المختلفة تمامًا، ثم اربط الفكرة الرئيسية للفقرة (وليس تفصيلة فيها). في العادة توجد عناوين زائدة.</li>
      <li>أجوبة الإكمال تُنسَخ من النص حرفيًا بما يلتزم بحد الكلمات؛ التهجئة الخاطئة تُحسَب خطأ.</li></ul></div>`;
    $$('#view [data-t]').forEach(b => b.onclick = () => begin(D.tests.find(t => t.id === b.dataset.t)));
    $$('#view [data-p]').forEach(b => b.onclick = () => begin(D.practice.find(t => t.id === b.dataset.p)));
    if (res) { $('#rs').onclick = () => begin([...D.tests, ...D.practice].find(t => t.id === res.testId), res); $('#rd').onclick = () => { clearP(); landing(); }; }
  }

  function begin(def, resume) {
    const test = X.number(structuredClone(def));
    const state = { ans: {}, flags: new Set() };
    let part = 0, submitted = false, timer;
    if (resume) { state.ans = resume.ans || {}; (resume.flags || []).forEach(n => state.flags.add(n)); part = resume.part || 0; }
    const endsAt = resume ? resume.endsAt : Date.now() + test.minutes * 60000;
    I.examActive = true;
    I.leaveGuard = () => submitted || confirm('الاختبار قيد التقدم. المغادرة ستُبقي تقدمك محفوظًا لاستئنافه لاحقًا. متابعة؟');

    const persist = () => { if (!submitted) saveP({ testId: def.id, title: test.title, ans: state.ans, flags: [...state.flags], part, endsAt }); };
    const passage = (p, i) => `<div class="pane passage en" data-part="${i}" ${i ? 'hidden' : ''}><h3>${esc(p.passage.title)}</h3>${p.passage.paras.map(x => `<p><span class="plabel">${esc(x.l)}</span> ${esc(x.t)}</p>`).join('')}</div>`;
    const qpane = (p, i) => `<div class="pane" data-part="${i}" ${i ? 'hidden' : ''}>${p.groups.map(X.groupHtml).join('')}</div>`;

    $('#view').innerHTML = `
    <div class="exam-bar"><span class="title">${esc(test.title)}</span>
      <span class="parttabs" id="tabs">${test.parts.map((p, i) => `<button data-i="${i}" class="${i === 0 ? 'on' : ''}">${esc(p.title)} <span class="muted">(${p.first}–${p.last})</span></button>`).join('')}</span>
      <span class="row" style="margin:0"><button class="sm" id="hl" title="حدّد نصًا في الفقرة ثم اضغط">🖍 Highlight</button><button class="sm" id="hc">مسح</button><span class="timer" id="tmr" aria-live="off">--:--</span><button class="primary" id="sub">تسليم</button></span></div>
    <div class="split" id="split"><div id="lp">${test.parts.map(passage).join('')}</div><div id="rp">${test.parts.map(qpane).join('')}</div></div>
    <div class="card" style="margin-top:12px"><h3 style="margin-top:0">Navigator <span class="muted">— ⚑ للعلامة على السؤال للمراجعة</span></h3>${X.navHtml(test)}</div><div id="out"></div>`;

    const split = $('#split');
    X.bind(split, state, () => { X.updateNav($('#view'), state); persist(); });
    if (resume) X.restore(split, state);
    X.updateNav($('#view'), state);

    const showPart = i => {
      part = i;
      $$('[data-part]').forEach(el => el.hidden = +el.dataset.part !== i);
      $$('#tabs button').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
      persist();
    };
    showPart(part);
    $$('#tabs button').forEach(b => b.onclick = () => showPart(+b.dataset.i));
    $$('.navgrid button').forEach(b => b.onclick = () => {
      const n = +b.dataset.go, i = test.parts.findIndex(p => n >= p.first && n <= p.last);
      showPart(i);
      const el = $(`#q${n}`) || $(`[data-q="${n}"]`);
      if (el) { el.scrollIntoView({ block: 'center' }); const inp = el.querySelector('input,select'); if (inp) inp.focus({ preventScroll: true }); }
    });

    // highlighter (only inside a single text node)
    $('#hl').onclick = () => {
      const s = getSelection(); if (!s.rangeCount || s.isCollapsed) return I.toast('حدّد نصًا داخل الفقرة أولًا');
      const r = s.getRangeAt(0);
      if (!r.commonAncestorContainer.parentElement.closest('.passage') || r.startContainer !== r.endContainer) return I.toast('حدّد جزءًا داخل فقرة واحدة (سطر متصل)');
      const m = document.createElement('mark'); r.surroundContents(m); s.removeAllRanges();
    };
    $('#hc').onclick = () => $$('.passage mark').forEach(m => { m.replaceWith(...m.childNodes); });

    timer = I.timer($('#tmr'), { onEnd: () => finish(true) });
    timer.start(Math.max(1, Math.round((endsAt - Date.now()) / 1000)));
    $('#sub').onclick = () => finish(false);

    function finish(auto) {
      if (submitted) return;
      const unanswered = Array.from({ length: test.total }, (_, i) => i + 1).filter(n => !X.has(state.ans[n]) && !(Array.isArray(state.ans[n - 1]) && state.ans[n - 1].length === 2)).length;
      if (!auto && !confirm(unanswered ? `لديك ${unanswered} سؤالًا بلا إجابة. التسليم الآن؟` : 'تسليم الاختبار؟')) return;
      submitted = true; timer.stop(); I.examActive = false; I.leaveGuard = null; clearP();
      const marks = X.mark(test, state.ans);
      I.addHistory('reading', { date: I.dayKey(new Date()), title: test.title, score: marks.score, of: marks.total, byType: marks.byType });
      I.addHistory('mocks', { date: I.dayKey(new Date()), skill: 'reading', raw: marks.score, of: marks.total, band: I.band.fromRaw('reading', marks.score, marks.total), id: def.id });
      I.mark();
      X.annotate(split, marks); X.markNav($('#view'), marks);
      $('#sub').disabled = true; $('#hl').disabled = true;
      $('#out').innerHTML = X.summaryHtml(test, marks, 'reading', `<div class="row"><button class="primary" id="again">العودة للقائمة</button></div>`) + reviewTable(marks);
      $('#again').onclick = () => I.show('reading');
      $('#out').scrollIntoView({ behavior: 'smooth' });
      if (auto) I.toast('انتهى الوقت: تم التسليم تلقائيًا');
    }
  }

  function reviewTable(marks) {
    return `<div class="card"><h2>مراجعة الأسئلة</h2><div class="tblwrap"><table class="result-table"><tr><th>#</th><th>إجابتك</th><th>الصحيح</th><th></th></tr>${marks.results.filter(r => r.exp).map(r => `<tr><td>${r.n}</td><td class="l">${esc(r.given || '—')}</td><td class="l">${esc(r.exp)}</td><td class="${r.ok ? 'ok' : 'bad'}">${r.ok ? '✓' : '✗'}</td></tr>`).join('')}</table></div></div>`;
  }

  I.register('reading', 'Reading', landing);
})();

/* Writing module — practice (Task 1 or 2) and full 60-minute mock; charts, autosave, local checks, Claude grading. */
(function () {
  'use strict';
  const I = window.IELTS, { $, $$, esc } = I;
  const PKEY = 'ielts_progress_writing_v1';
  const loadP = () => { try { return JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch (e) { return null; } };
  const saveP = p => { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { } };
  const clearP = () => { try { localStorage.removeItem(PKEY); } catch (e) { } };
  const D = () => I.data.writing, minWords = t => t === 'Task 1' ? 150 : 250;
  const byId = (task, id) => (task === 'Task 1' ? D().T1 : D().T2).find(x => x.id === id);

  function landing() {
    const res = loadP(), hist = I.S.writing.slice(-8).reverse();
    $('#view').innerHTML = `
    ${res ? `<div class="card" style="border-color:var(--orange)"><h2>محاولة غير مكتملة</h2><p>${res.mode === 'mock' ? 'اختبار Writing كامل' : esc(res.tasks[0].task)} — المتبقي ${I.fmt(Math.max(0, Math.round((res.endsAt - Date.now()) / 1000)))}.</p><div class="row"><button class="primary" id="rs">أكمل</button><button class="danger" id="rd">تجاهل</button></div></div>` : ''}
    <div class="card"><h2>Academic Writing — اختبار كامل (60 دقيقة)</h2>
      <p>Task 1 (رسم بياني/جدول/مخطط عملية/خريطة) + Task 2 (مقال). ≥150 و≥250 كلمة. الوقت الموصى به: 20 دقيقة للأول و40 للثاني، وTask 2 يساوي ضعف وزن Task 1 في الدرجة.</p>
      <div class="row"><button class="primary" id="mock">ابدأ الاختبار الكامل</button></div></div>
    <div class="card"><h2>تدريب على مهمة واحدة</h2>
      <div class="row"><label>النوع <select id="pt"><option>Task 1</option><option>Task 2</option></select></label>
        <label id="pfw"></label><button class="primary" id="pg">ابدأ</button></div></div>
    ${I.ai.settingsHtml()}
    <div class="card"><h2>سجل Writing</h2>${hist.length ? `<table class="result-table"><tr><th>التاريخ</th><th>المهمة</th><th>كلمات</th><th>Band (Claude)</th></tr>${hist.map(h => `<tr><td>${esc(h.date)}</td><td class="l">${esc(h.task)}${h.mode === 'mock' ? ' (mock)' : ''}</td><td>${h.words}</td><td>${h.band != null ? h.band.toFixed(1) : '—'}</td></tr>`).join('')}</table>` : '<p class="muted">لا توجد محاولات محفوظة بعد.</p>'}</div>
    <div class="card"><h2>نصائح</h2><ul class="muted">
      <li>Task 1: ابدأ بـ paraphrase للسؤال، ثم <b>overview</b> (2–3 سمات رئيسية)، ثم تفاصيل منتقاة بأرقام. لا رأي شخصي ولا أسباب مخترعة.</li>
      <li>Task 2: حدّد position واضحًا من المقدمة وأجب عن كل أجزاء السؤال؛ فكرة رئيسية واحدة لكل فقرة مع تفسير ومثال.</li>
      <li>الدقة أهم من التعقيد: جملة معقدة مليئة بالأخطاء تخفّض Grammatical Range & Accuracy.</li></ul></div>`;
    I.ai.bindSettings();
    const fill = () => {
      const t = $('#pt').value;
      $('#pfw').innerHTML = t === 'Task 1'
        ? `الشكل <select id="pf"><option value="">الكل</option>${[...new Set(D().T1.map(x => x.kind))].map(k => `<option>${k}</option>`).join('')}</select>`
        : `الموضوع <select id="pf"><option value="">الكل</option>${[...new Set(D().T2.map(x => x.topic))].map(k => `<option>${k}</option>`).join('')}</select>`;
    };
    fill(); $('#pt').onchange = fill;
    $('#pg').onclick = () => {
      const t = $('#pt').value, f = $('#pf').value, pool = (t === 'Task 1' ? D().T1 : D().T2).filter(x => !f || (t === 'Task 1' ? x.kind : x.topic) === f);
      editor({ mode: 'practice', tasks: [{ task: t, id: I.pick(pool).id, text: '' }], endsAt: Date.now() + (t === 'Task 1' ? 20 : 40) * 60000 });
    };
    $('#mock').onclick = () => editor({ mode: 'mock', tasks: [{ task: 'Task 1', id: I.pick(D().T1).id, text: '' }, { task: 'Task 2', id: I.pick(D().T2).id, text: '' }], endsAt: Date.now() + 60 * 60000 });
    if (res) { $('#rs').onclick = () => editor(res); $('#rd').onclick = () => { clearP(); landing(); }; }
  }

  function editor(cfg) {
    const tasks = cfg.tasks.map(t => ({ ...t, item: byId(t.task, t.id) }));
    let active = 0, submitted = false, saveT = null;
    I.examActive = true;
    I.leaveGuard = () => submitted || confirm('ستغادر الصفحة. نصّك محفوظ تلقائيًا ويمكنك استئنافه لاحقًا. متابعة؟');
    const persist = () => { if (!submitted) saveP({ mode: cfg.mode, tasks: tasks.map(t => ({ task: t.task, id: t.id, text: t.text })), endsAt: cfg.endsAt }); };

    $('#view').innerHTML = `
    <div class="exam-bar"><span class="title">${cfg.mode === 'mock' ? 'Writing — Full test' : esc(tasks[0].task)}</span>
      ${tasks.length > 1 ? `<span class="parttabs" id="tabs">${tasks.map((t, i) => `<button data-i="${i}" class="${i === 0 ? 'on' : ''}">${t.task} <span class="muted" id="wc${i}">0/${minWords(t.task)}</span></button>`).join('')}</span>` : `<span class="muted" id="wc0">0 / ${minWords(tasks[0].task)}</span>`}
      <span class="row" style="margin:0"><span class="timer" id="tmr">--:--</span><button class="primary" id="sub">تسليم</button></span></div>
    <div class="split">
      <div id="lp">${tasks.map((t, i) => `<div class="pane" data-part="${i}" ${i ? 'hidden' : ''}><p class="en"><b>${esc(t.task)}</b> · <span class="muted">${esc(t.item.type || t.item.kind)}</span></p>${t.task === 'Task 1' ? `<p class="en">You should spend about 20 minutes on this task.</p>` : `<p class="en">You should spend about 40 minutes on this task. Write about the following topic:</p>`}<p class="en" style="font-size:16px"><b>${esc(t.item.q)}</b></p>${t.task === 'Task 1' ? `<div class="chart" data-i="${i}"></div><p class="en muted">Write at least 150 words.</p>` : `<p class="en muted">Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.</p>`}</div>`).join('')}</div>
      <div id="rp">${tasks.map((t, i) => `<div class="pane" data-part="${i}" ${i ? 'hidden' : ''} style="max-height:none"><textarea class="en ta" data-i="${i}" placeholder="Write your answer here…" spellcheck="true" aria-label="${esc(t.task)} answer">${esc(t.text || '')}</textarea></div>`).join('')}</div>
    </div><div id="out"></div>`;
    tasks.forEach((t, i) => { if (t.task === 'Task 1' && t.item.chart) I.charts.render(t.item.chart, $(`.chart[data-i="${i}"]`)); });

    const upd = i => {
      const n = I.wordCount(tasks[i].text), el = $('#wc' + i), m = minWords(tasks[i].task);
      el.textContent = `${n}/${m}`; el.className = n >= m ? 'ok' : 'muted';
    };
    $$('.ta').forEach(ta => { const i = +ta.dataset.i; upd(i); ta.addEventListener('input', () => { tasks[i].text = ta.value; upd(i); clearTimeout(saveT); saveT = setTimeout(persist, 1500); }); });
    const showPart = i => { active = i; $$('[data-part]').forEach(el => el.hidden = +el.dataset.part !== i); $$('#tabs button').forEach(b => b.classList.toggle('on', +b.dataset.i === i)); };
    $$('#tabs button').forEach(b => b.onclick = () => showPart(+b.dataset.i));

    const tm = I.timer($('#tmr'), { onEnd: () => finish(true), warnAt: 300 });
    I.onLeave(() => tm.stop());
    tm.start(Math.max(1, Math.round((cfg.endsAt - Date.now()) / 1000)));
    $('#sub').onclick = () => finish(false);

    async function finish(auto) {
      if (submitted) return;
      const short = tasks.filter(t => I.wordCount(t.text) < minWords(t.task));
      if (!auto && !confirm(short.length ? `${short.map(t => t.task).join(' و')} أقل من الحد الأدنى للكلمات. التسليم الآن؟` : 'تسليم الاختبار؟')) return;
      if (tasks.every(t => I.wordCount(t.text) < 20)) { if (!auto) I.toast('اكتب نصًا أطول أولًا'); if (!auto) return; }
      submitted = true; tm.stop(); I.examActive = false; I.leaveGuard = null; clearP();
      $$('.ta').forEach(t => t.disabled = true); $('#sub').disabled = true;
      $('#out').innerHTML = tasks.map((t, i) => `<div class="card"><h2>${esc(t.task)} — ${I.wordCount(t.text)} words</h2><h3>فحوص آلية</h3>${I.local.html(I.local.writing(t.text, t.task))}<div id="ai${i}" style="margin-top:12px"></div></div>`).join('') + `<div id="sum"></div><div class="row"><button class="primary" id="back">العودة للقائمة</button></div>`;
      $('#back').onclick = () => I.show('writing'); $('#out').scrollIntoView({ behavior: 'smooth' });
      if (auto) I.toast('انتهى الوقت: تم التسليم تلقائيًا');
      const bands = [];
      for (let i = 0; i < tasks.length; i++) bands[i] = await gradeOne(tasks[i], i);
      I.mark();
      tasks.forEach((t, i) => I.addHistory('writing', { date: I.dayKey(new Date()), task: t.task, mode: cfg.mode, words: I.wordCount(t.text), band: bands[i], id: t.id, text: t.text.slice(0, 8000) }));
      if (cfg.mode === 'mock') {
        const w = bands[0] != null && bands[1] != null ? I.band.roundHalf((bands[0] + 2 * bands[1]) / 3) : null;
        I.addHistory('mocks', { date: I.dayKey(new Date()), skill: 'writing', band: w, parts: bands });
        if (w != null) $('#sum').innerHTML = `<div class="card"><h2>Writing band (تقدير)</h2><span class="band-chip">≈ ${w.toFixed(1)}</span><p class="muted">= (Task 1 + 2 × Task 2) ÷ 3 مقرّبًا لأقرب نصف band. Task 2 يحمل ضعف الوزن. التقدير آلي وغير رسمي.</p></div>`;
      }
    }
    async function gradeOne(t, i) {
      const box = $('#ai' + i), payload = { task: t.task, prompt: t.item.q, data: t.item.chart ? I.charts.describe(t.item.chart) : '', essay: t.text };
      const paste = `<div class="row"><button id="cp${i}">نسخ prompt لمحادثة Claude</button></div>`;
      if (I.wordCount(t.text) < 20) { box.innerHTML = '<p class="muted">لا يوجد نص كافٍ للتصحيح.</p>'; return null; }
      if (!I.ai.hasKey()) {
        box.innerHTML = `<p class="muted">لتفعيل التصحيح الآلي أدخل مفتاح API في "مصحّح Claude" بصفحة Writing (قبل بدء الاختبار)، أو الصق الـ prompt في محادثة Claude.</p>${paste}`;
        $('#cp' + i).onclick = async () => I.toast(await I.copy(I.ai.pastePromptWriting(payload)) ? 'تم النسخ' : 'تعذّر النسخ');
        return null;
      }
      box.innerHTML = '<p class="muted" aria-live="polite">⏳ Claude يصحّح… (قد يستغرق حتى دقيقة)</p>';
      try {
        const r = await I.ai.gradeWriting(payload), rep = I.ai.reportHtml(r.data, 'writing', { title: t.task, model: r.model });
        box.innerHTML = rep.html; return rep.overall;
      } catch (e) {
        box.innerHTML = `<p class="bad">✗ ${esc(I.ai.explain(e))}</p><div class="row"><button id="rt${i}">أعد المحاولة</button></div>${paste}`;
        $('#cp' + i).onclick = async () => I.toast(await I.copy(I.ai.pastePromptWriting(payload)) ? 'تم النسخ' : 'تعذّر النسخ');
        $('#rt' + i).onclick = () => gradeOne(t, i);
        return null;
      }
    }
  }

  I.register('writing', 'Writing', landing);
})();

/* Plan — study schedule generator: phases from today to the exam, daily tasks with checkboxes and deep links,
   logging of external (e.g. official Cambridge) test scores, and a mistakes notebook. */
(function () {
  'use strict';
  const I = window.IELTS, { $, $$, esc } = I;
  const DAY = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const SKILL_AR = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };
  const PHASES = {
    diag: ['تشخيص', 'اختبار كامل لكل مهارة بشروط الاختبار لمعرفة نقطة البداية.'],
    found: ['أساسيات', 'بناء العادة اليومية، المفردات، دفتر الأخطاء، وأنواع الأسئلة.'],
    build: ['بناء المهارات', 'تدريب مركّز على أنواع الأسئلة والمقالات الضعيفة مع تصحيح وإعادة كتابة.'],
    timed: ['التدريب تحت الوقت', 'اختبارات كاملة بوقت صارم وتحليل الأخطاء بعد كل واحد.'],
    mock: ['محاكاة الاختبار', 'اختبار شامل أسبوعيًا بظروف يوم الاختبار.'],
    final: ['الأسبوع الأخير', 'مراجعة خفيفة بلا مواد جديدة، نوم جيد، وتجهيز المستندات.']
  };
  const T2_TYPES = ['Opinion (agree/disagree)', 'Discuss both views', 'Problem–solution', 'Advantages/disadvantages', 'Two-part question'];
  const T1_KINDS = ['line graph', 'bar chart', 'pie charts', 'table', 'process diagram', 'map'];
  const TOOL_DRILL_WEEKS = 4;   // the built-in tests are limited: beyond this, drills point to official books

  /* ---------- date helpers ---------- */
  const ymd = d => d.toLocaleDateString('en-CA');
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const diff = (a, b) => Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 864e5);
  const r5 = n => Math.max(5, Math.round(n / 5) * 5);
  // "Writing — اختبار كامل" → English label first (LTR), Arabic description after, so mixed text keeps a stable order
  const label = t => { const i = t.indexOf(' — '); return i > 0 ? `<b dir="ltr">${esc(t.slice(0, i))}</b> · ${esc(t.slice(i + 3))}` : esc(t); };
  const fmtD = d => `${DAY[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;

  /* ---------- schedule model ---------- */
  function totalWeeks(P) { return P.exam ? Math.max(6, Math.ceil((diff(parse(P.exam), parse(P.start)) + 1) / 7)) : 12; }
  function phaseOf(w, W) {
    if (w === 1) return 'diag';
    if (w >= W) return 'final';
    if (w > W - 3) return 'mock';
    const found = Math.max(3, Math.round(W * .2) + 1), build = Math.max(found + 3, Math.round(W * .6) + 1);
    return w <= found ? 'found' : w <= build ? 'build' : 'timed';
  }

  function dayTasks(P, date) {
    const iso = ymd(date), start = parse(P.start), W = totalWeeks(P), f = P.mpd / 60;
    const w = Math.floor(diff(date, start) / 7) + 1;
    if (P.exam && diff(date, parse(P.exam)) > 0) return [];
    if (P.exam && iso === P.exam) return [mk('home', 'يوم الاختبار 🎯 تحدّث بثقة، وراجع المستندات المطلوبة من مركزك قبل الخروج.', 0, {})];
    const wd = date.getDay(), phase = phaseOf(w, W);
    if (wd === P.rest) return [];
    function mk(tab, text, mins, o) { return { tab, text, mins: o.fixed ? mins : r5(mins * f), ext: o.ext || null, star: !!o.star }; }
    const T = (tab, text, mins, o = {}) => mk(tab, text, mins, o);
    const check = w % 4 === 0 && ['found', 'build', 'timed'].includes(phase);
    const full = phase === 'mock' || check || (phase === 'timed' && w % 2 === 1);
    const ext = w > TOOL_DRILL_WEEKS;
    const weak = P.weak || '';

    if (phase === 'final') {
      if (P.exam && diff(parse(P.exam), date) === 1) return [T('toolkit', 'راحة: راجع قائمة المستندات والموقع والوقت، ولا تدرس مواد جديدة. نم مبكرًا.', 20, { fixed: 1 })];
      return [T('toolkit', 'مراجعة خفيفة: دفتر الأخطاء وأخطاءك المتكررة (بلا مواد جديدة)', 30, { fixed: 1 }), T('speaking', 'Speaking — جلسة قصيرة للإحماء', 15, { fixed: 1 })];
    }
    const rdFull = () => ext
      ? [T('reading', 'Cambridge — Reading Test كامل (كتاب رسمي) بوقت 60 د، ثم سجّل النتيجة', 60, { fixed: 1, star: 1, ext: { skill: 'reading', of: 40 } })]
      : [T('reading', 'Reading — اختبار كامل في الأداة بشروط الاختبار', 60, { fixed: 1, star: 1 })];
    const lsFull = () => ext
      ? [T('listening', 'Cambridge — Listening Test كامل (كتاب رسمي) ثم سجّل النتيجة', 40, { fixed: 1, star: 1, ext: { skill: 'listening', of: 40 } })]
      : [T('listening', 'Listening — اختبار كامل في الأداة بشروط الاختبار', 30, { fixed: 1, star: 1 })];
    const drill = skill => {
      if (skill === 'reading') return ext
        ? T('reading', 'Cambridge — نص Reading واحد (20 د)، ثم حلّل الأخطاء وسجّل النتيجة', 35, { fixed: 1, ext: { skill: 'reading', of: 13 } })
        : T('reading', 'Reading — نص واحد بوقت 20 د ثم تحليل الأخطاء', 35, { fixed: 1 });
      if (skill === 'listening') return ext
        ? T('listening', 'Cambridge — قسم Listening واحد، ثم راجع النص المسموع وسجّل النتيجة', 35, { fixed: 1, ext: { skill: 'listening', of: 10 } })
        : T('listening', 'Listening — قسم واحد ثم مراجعة النص المسموع', 35, { fixed: 1 });
      if (skill === 'writing') return T('writing', 'Writing — فقرة body واحدة ركّز فيها على نقطة ضعفك (Cohesion أو Lexis أو Grammar)', 35);
      return T('speaking', 'Speaking — جلسة Part 2 واحدة مسجَّلة ومراجَعة', 35);
    };

    switch (wd) {
      case 6: // Saturday — Listening
        if (phase === 'diag') return [T('listening', 'Listening — اختبار كامل (تشخيص)', 30, { fixed: 1, star: 1 }), T('vocab', 'Vocabulary — جلسة اليوم', 20)];
        if (full) return lsFull();
        if (phase === 'found' && !ext) return [T('listening', 'Listening — قسم واحد (مع الإعادة) ثم Dictation', 45), T('vocab', 'Vocabulary', 15)];
        return [drill('listening'), T('listening', 'Dictation + تحليل أخطاء التهجئة والأرقام', 15), T('vocab', 'Vocabulary', 10)];
      case 0: // Sunday — Reading
        if (phase === 'diag') return rdFull();
        if (full) return rdFull();
        if (phase === 'found' && !ext) return [T('reading', 'Reading — نص واحد بوقت 20 د', 20, { fixed: 1 }), T('reading', 'تحليل الأخطاء حسب نوع السؤال (True/False/Not Given أولًا)', 25), T('vocab', 'Vocabulary', 15)];
        return [drill('reading'), T('reading', 'سجّل الأنواع التي أخطأت فيها في دفتر الأخطاء', 15), T('vocab', 'Vocabulary', 10)];
      case 1: // Monday — Writing Task 2
        if (phase === 'diag' || phase === 'mock' || check) return [T('writing', 'Writing — اختبار كامل (Task 1 + Task 2) بوقت 60 د', 60, { fixed: 1, star: 1 })];
        return [T('writing', `Writing Task 2 (${T2_TYPES[(w - 2 + 5) % 5]}) — 40 د بوقت الاختبار`, 40, { fixed: 1 }), T('writing', 'اقرأ التصحيح ثم أعد كتابة المقدمة وفقرة واحدة', 20)];
      case 2: // Tuesday — Speaking
        if (phase === 'diag' || full) return [T('speaking', 'Speaking — اختبار كامل (Parts 1–3)', 20, { fixed: 1, star: 1 }), T('speaking', 'مراجعة التسجيل وتصحيح التفريغ', 25), T('vocab', 'Vocabulary', 15)];
        if (phase === 'found') return [T('speaking', 'Speaking — Part 1 + Part 2', 25), T('speaking', 'مراجعة التسجيل: الأخطاء النحوية، التكرار، التوقفات', 20), T('vocab', 'Vocabulary', 15)];
        return [T('speaking', 'Speaking — Part 2 + Part 3 (رأي + سبب + مثال)', 30), T('speaking', 'مراجعة التسجيل وكلمات بديلة للمكرَّر', 15), T('vocab', 'Vocabulary', 15)];
      case 3: // Wednesday — Writing Task 1
        if (phase === 'diag') return [T('toolkit', 'Toolkit — صيغة الاختبار وملخص معايير Writing والأخطاء الشائعة', 30), T('grammar', 'Grammar', 15), T('vocab', 'Vocabulary', 15)];
        return [T('writing', `Writing Task 1 (${T1_KINDS[w % 6]}) — 20 د`, 20, { fixed: 1 }), T('writing', 'اقرأ التصحيح وأعد كتابة الـ overview', 25), T('grammar', 'Grammar', 15)];
      case 4: // Thursday — mixed / analysis
        if (phase === 'diag') return [T('home', 'راجع الصفحة الرئيسية: درجاتك التقديرية وأضعف أنواع الأسئلة. دوّن 3 أولويات وفكّر في حجز موعد الاختبار.', 30, { fixed: 1 }), T('toolkit', 'Toolkit — الأخطاء الشائعة عند الناطقين بالعربية', 30)];
        if (full) return [T('toolkit', 'تحليل أخطاء اختبارات الأسبوع كلها وكتابتها في دفتر الأخطاء', 40), T('vocab', 'Vocabulary', 20)];
        {
          const order = ['reading', 'listening', 'writing', 'speaking'];
          const first = weak || 'reading', second = weak ? order[(order.indexOf(weak) + 1) % 4] : 'listening';
          return [drill(first), drill(second)];
        }
      default: // Friday — weekly review
        return [T('toolkit', 'مراجعة دفتر الأخطاء الأسبوعي: اكتب 5 أخطاء متكررة وقاعدة كل منها', 30), T('grammar', 'Grammar — أخطاء الأسبوع', 15), T('vocab', 'Vocabulary', 15)];
    }
  }

  /* ---------- state ---------- */
  const plan = () => I.S.plan;
  let viewWeek = 0;
  const taskId = (iso, i) => `${iso}:${i}`;
  function weekRange(P, w) { const s = addDays(parse(P.start), (w - 1) * 7); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }
  function currentWeek(P) { return Math.max(1, Math.min(totalWeeks(P), Math.floor(diff(new Date(), parse(P.start)) / 7) + 1)); }
  function weekStats(P, w) {
    let n = 0, d = 0, m = 0, md = 0;
    weekRange(P, w).forEach(day => dayTasks(P, day).forEach((t, i) => { n++; m += t.mins; if (P.done[taskId(ymd(day), i)]) { d++; md += t.mins; } }));
    return { n, d, m, md };
  }

  /* ---------- views ---------- */
  function render() { viewWeek = 0; if (!plan()) setup(); else view(); }

  function setup() {
    const P = plan() || {};
    const today = ymd(new Date());
    $('#view').innerHTML = `<div class="card"><h2>إنشاء خطة دراسة</h2>
      <p class="muted">تُولَّد الخطة من تاريخ البدء إلى موعد الاختبار: أسبوع تشخيص، ثم أساسيات، ثم تدريب تحت الوقت، ثم محاكاة، ثم أسبوع تخفيف. كل ما هنا قابل للتعديل لاحقًا.</p>
      <div class="grid2">
        <label>تاريخ البدء<br><input type="date" id="ps" value="${esc(P.start || today)}"></label>
        <label>موعد الاختبار (تقريبي، اختياري)<br><input type="date" id="pe" value="${esc(P.exam || '')}"></label>
        <label>وقت الدراسة اليومي<br><select id="pm">${[45, 60, 90, 120].map(m => `<option value="${m}" ${(P.mpd || 60) === m ? 'selected' : ''}>${m} دقيقة</option>`).join('')}</select></label>
        <label>يوم الراحة<br><select id="pr"><option value="5" ${P.rest === 5 || P.rest == null ? 'selected' : ''}>الجمعة</option>${[6, 0, 1, 2, 3, 4].map(d => `<option value="${d}" ${P.rest === d ? 'selected' : ''}>${DAY[d]}</option>`).join('')}<option value="-1" ${P.rest === -1 ? 'selected' : ''}>بلا راحة (7 أيام)</option></select></label>
        <label>أضعف مهارة (إن كنتَ تعرفها)<br><select id="pw"><option value="">لا أعرف بعد (يحددها التشخيص)</option>${Object.entries(SKILL_AR).map(([k, l]) => `<option value="${k}" ${P.weak === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <p id="perr" class="bad"></p>
      <div class="row"><button class="primary" id="pgo">${plan() ? 'حدّث الخطة' : 'أنشئ الخطة'}</button>${plan() ? '<button id="pcancel">إلغاء</button>' : ''}</div>
      <p class="muted">إن غيّرت الإعدادات تُحفظ علامات الإنجاز القديمة لنفس التواريخ، لكن قد لا تتطابق المهام.</p></div>`;
    if (plan()) $('#pcancel').onclick = view;
    $('#pgo').onclick = () => {
      const start = $('#ps').value, exam = $('#pe').value;
      if (!start) return $('#perr').textContent = 'اختر تاريخ البدء.';
      if (exam && diff(parse(exam), parse(start)) < 42) return $('#perr').textContent = 'موعد الاختبار قريب جدًا: يلزم 6 أسابيع على الأقل من تاريخ البدء.';
      const old = plan() || {};
      I.S.plan = { start, exam, mpd: +$('#pm').value, rest: +$('#pr').value, weak: $('#pw').value, done: old.done || {}, errors: old.errors || [] };
      I.save(); view();
    };
  }

  function view(wk) {
    const P = plan(), W = totalWeeks(P), cw = currentWeek(P);
    const w = wk || viewWeek || cw; viewWeek = w;
    const phase = phaseOf(w, W), st = weekStats(P, w), todayIso = ymd(new Date());
    const dLeft = P.exam ? diff(parse(P.exam), new Date()) : null;
    const tab = (id, l) => `<button class="sm" data-open="${id}">${l}</button>`;
    let all = 0, done = 0;
    for (let k = 1; k <= W; k++) { const s = weekStats(P, k); all += s.n; done += s.d; }

    $('#view').innerHTML = `
    <div class="card"><h2>خطتك — الأسبوع ${w} من ${W}</h2>
      <div class="grid">
        <div class="stat"><small>المرحلة</small><b style="font:600 16px Tahoma">${PHASES[phase][0]}</b></div>
        <div class="stat"><small>إنجاز هذا الأسبوع</small><b>${st.d}/${st.n}</b></div>
        <div class="stat"><small>الإنجاز الكلي</small><b>${all ? Math.round(100 * done / all) : 0}%</b></div>
        <div class="stat"><small>${dLeft == null ? 'الأسابيع' : 'أيام للاختبار'}</small><b>${dLeft == null ? W : Math.max(0, dLeft)}</b></div></div>
      <div class="bar" style="margin-top:10px"><i style="width:${st.n ? Math.round(100 * st.d / st.n) : 0}%"></i></div>
      <p class="muted">${esc(PHASES[phase][1])}</p>
      <div class="row"><button id="pprev" ${w <= 1 ? 'disabled' : ''}>‹ الأسبوع السابق</button><button id="pnow">الأسبوع الحالي</button><button id="pnext" ${w >= W ? 'disabled' : ''}>الأسبوع التالي ›</button><button id="pedit">تعديل الإعدادات</button></div>
      ${w === 1 ? '<p class="warn">بعد التشخيص: افتح الصفحة الرئيسية، وانظر الدرجات التقديرية وأضعف الأسئلة، ثم عدّل "أضعف مهارة" في الإعدادات ليُعاد توزيع أيام الأسبوع.</p>' : ''}</div>
    ${weekRange(P, w).map(day => {
      const iso = ymd(day), tasks = dayTasks(P, day), isToday = iso === todayIso;
      return `<div class="card" ${isToday ? 'style="border-color:var(--green)"' : ''}><h3 style="margin-top:0">${fmtD(day)} ${isToday ? '<span class="tag ok">اليوم</span>' : ''}${day.getDay() === P.rest ? '<span class="tag">راحة</span>' : ''}${P.exam && iso === P.exam ? '<span class="tag warn">الاختبار</span>' : ''}</h3>
        ${tasks.length ? tasks.map((t, i) => {
        const id = taskId(iso, i), ok = !!P.done[id];
        return `<div class="q" style="display:flex;gap:10px;align-items:flex-start"><label style="flex:1"><input type="checkbox" data-done="${esc(id)}" ${ok ? 'checked' : ''}> <span ${ok ? 'style="opacity:.6;text-decoration:line-through"' : ''}>${t.star ? '⭐ ' : ''}${label(t.text)}</span> <span class="tag">${t.mins ? t.mins + ' د' : ''}</span></label>
          <span class="row" style="margin:0">${t.ext ? `<button class="sm" data-ext="${esc(id)}" data-skill="${t.ext.skill}" data-of="${t.ext.of}">سجّل النتيجة</button>` : ''}${tab(t.tab, 'افتح ›')}</span></div>
          <div id="x-${esc(id.replace(/[^a-z0-9]/gi, '_'))}"></div>`;
      }).join('') + `<p class="muted">الإجمالي: ${tasks.reduce((a, t) => a + t.mins, 0)} دقيقة</p>` : '<p class="muted">لا مهام.</p>'}</div>`;
    }).join('')}
    <details class="card"><summary><b>خريطة المراحل</b></summary><div class="tblwrap"><table><tr><th>الأسابيع</th><th>المرحلة</th></tr>${phaseRows(P, W)}</table></div></details>
    <div class="card"><h2>دفتر الأخطاء</h2><p class="muted">اكتب هنا كل خطأ متكرر وقاعدته. مراجعته أسبوعيًا هي أسرع طريق لإزالته.</p>
      <div class="row"><input class="grow en" id="ew" placeholder="خطأي (مثال: discuss about)"><input class="grow en" id="ec" placeholder="الصواب (discuss)"><input class="grow" id="er" placeholder="القاعدة"><button class="primary" id="eadd">أضف</button></div>
      <div id="elist"></div></div>
    <div class="card"><h2>المواد الرسمية</h2><p class="muted">مهام "Cambridge" تفترض أن لديك كتب Cambridge IELTS الرسمية (اشترِها أو استعرها من مكتبة الجامعة). أجب في الكتاب بوقت الاختبار، صحّح من مفتاح الإجابات، ثم اضغط "سجّل النتيجة" لتدخل درجتك الخام فتظهر في منحنى التقدم. الأداة لا تحتوي نصوصها ولا تصل إليها.</p></div>`;

    $('#pprev').onclick = () => view(w - 1); $('#pnext').onclick = () => view(w + 1); $('#pnow').onclick = () => { viewWeek = 0; view(); };
    $('#pedit').onclick = setup;
    $$('#view [data-open]').forEach(b => b.onclick = () => I.show(b.dataset.open));
    $$('#view [data-done]').forEach(c => c.onchange = () => { const y = window.scrollY; if (c.checked) { P.done[c.dataset.done] = 1; I.mark(); } else delete P.done[c.dataset.done]; I.save(); view(w); window.scrollTo(0, y); });
    $$('#view [data-ext]').forEach(b => b.onclick = () => extForm(b, P, w));
    errors(P);
  }

  function phaseRows(P, W) {
    const rows = []; let cur = null, from = 1;
    for (let w = 1; w <= W + 1; w++) {
      const p = w <= W ? phaseOf(w, W) : null;
      if (p !== cur) { if (cur) rows.push(`<tr><td>${from === w - 1 ? from : from + '–' + (w - 1)}</td><td class="l">${PHASES[cur][0]} — ${esc(PHASES[cur][1])}</td></tr>`); cur = p; from = w; }
    }
    return rows.join('');
  }

  function extForm(btn, P, w) {
    const id = btn.dataset.ext, of = +btn.dataset.of, skill = btn.dataset.skill;
    const box = $('#x-' + id.replace(/[^a-z0-9]/gi, '_'));
    if (box.innerHTML) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="q row"><label>اسم الاختبار <input class="en" id="xn" placeholder="مثال: Cambridge 17 Test 2" style="min-width:200px"></label><label>الدرجة الخام من ${of} <input type="number" id="xr" min="0" max="${of}" style="width:90px"></label><button class="primary" id="xs">احفظ</button><span class="muted" id="xo"></span></div>`;
    $('#xs').onclick = () => {
      const raw = parseInt($('#xr').value, 10);
      if (isNaN(raw) || raw < 0 || raw > of) return $('#xo').textContent = `أدخل رقمًا من 0 إلى ${of}.`;
      const band = I.band.fromRaw(skill, raw, of), name = $('#xn').value.trim() || 'External test';
      I.addHistory('mocks', { date: I.dayKey(new Date()), skill, raw, of, band, id: 'ext: ' + name, src: 'external' });
      P.done[id] = 1; I.mark(); I.save();
      I.toast(`حُفظت: ${raw}/${of} ≈ Band ${I.band.label(band)} (تقدير تقريبي)`); view(w);
    };
  }

  function errors(P) {
    const draw = () => {
      $('#elist').innerHTML = P.errors.length ? `<table class="result-table" style="width:100%"><tr><th>خطئي</th><th>الصواب</th><th>القاعدة</th><th></th></tr>${P.errors.map((e, i) => `<tr><td class="l bad">${esc(e.w)}</td><td class="l ok">${esc(e.c)}</td><td class="l">${esc(e.r)}</td><td><button class="sm danger" data-edel="${i}" aria-label="حذف">×</button></td></tr>`).join('')}</table><div class="row"><button class="sm" id="ecopy">نسخ الدفتر (لمشاركته مع Claude)</button></div>` : '<p class="muted">لا توجد أخطاء مسجّلة بعد.</p>';
      $$('#elist [data-edel]').forEach(b => b.onclick = () => { P.errors.splice(+b.dataset.edel, 1); I.save(); draw(); });
      const cp = $('#ecopy'); if (cp) cp.onclick = async () => I.toast(await I.copy(P.errors.map(e => `${e.w} → ${e.c} (${e.r})`).join('\n')) ? 'تم النسخ' : 'تعذّر النسخ');
    };
    $('#eadd').onclick = () => {
      const w = $('#ew').value.trim(), c = $('#ec').value.trim(), r = $('#er').value.trim();
      if (!w || !c) return I.toast('اكتب الخطأ والصواب');
      P.errors.unshift({ w, c, r }); I.save(); $('#ew').value = $('#ec').value = $('#er').value = ''; draw();
    };
    draw();
  }

  I.register('plan', 'Plan', render);
  I.planApi = { dayTasks, totalWeeks, phaseOf };   // exposed for tests
})();

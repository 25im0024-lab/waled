/* Listening module — sequential exam flow (prep → single play → check), multi-voice TTS, review with transcripts, dictation. */
(function () {
  'use strict';
  const I = window.IELTS, { $, $$, esc } = I, X = I.exam, T = I.tts;

  function diffWords(exp, got) {
    const a = I.toks(exp), b = I.toks(got), n = a.length, m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push(['ok', a[i]]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(['miss', a[i]]); i++; }
      else { out.push(['extra', b[j]]); j++; }
    }
    while (i < n) out.push(['miss', a[i++]]); while (j < m) out.push(['extra', b[j++]]);
    return { out, score: Math.round(100 * dp[0][0] / Math.max(n, 1)) };
  }

  function landing() {
    const D = I.data.listening, hist = I.S.listening.filter(h => h.kind === 'test').slice(-6).reverse();
    $('#view').innerHTML = `
    ${T.supported ? '' : '<div class="card" style="border-color:var(--red)"><p class="bad">هذا المتصفح لا يدعم النطق الصوتي (speechSynthesis). استخدم Chrome أو Edge أو Safari حديث.</p></div>'}
    <div class="card"><h2>إعدادات الصوت</h2>
      <p class="muted">الصوت يُولَّد بواسطة المتصفح (TTS) وبأصوات متعددة للمتحدثين. أفضل جودة عادةً في Edge (أصوات "Natural") وChrome على سطح المكتب. ليس بلهجات حقيقية متنوعة كما في الاختبار.</p>
      <div class="row"><label>الصوت الرئيسي <select id="vo"><option value="">تلقائي</option>${T.options()}</select></label>
        <label>السرعة <select id="rt"><option value=".9">0.9</option><option value="1" selected>1.0</option><option value="1.1">1.1</option></select></label>
        <button id="vt">🔊 جرّب الصوت</button></div></div>
    <div class="card"><h2>Listening — اختبار كامل (4 أقسام، 40 سؤالًا)</h2>
      <p>التسلسل كالاختبار: 30 ثانية لقراءة الأسئلة ← التسجيل <b>مرة واحدة</b> ← 30 ثانية للمراجعة ← القسم التالي. بلا إيقاف ولا إعادة.</p>
      <div class="row"><label>بعد الأقسام <select id="tr"><option value="120">دقيقتان للمراجعة (computer-delivered)</option><option value="600">10 دقائق لنقل الإجابات (paper-based)</option></select></label></div>
      <div class="row">${D.tests.map(t => `<button class="primary" data-t="${t.id}">ابدأ: ${esc(t.title)}</button>`).join('')}</div>
      <p class="muted">تنبيه: كل قسم هنا ≈ 3 دقائق صوتية، أقصر من القسم الحقيقي (≈ 7 دقائق)، لذلك الاختبار كاملًا ≈ 15 دقيقة صوت بدل 30.</p></div>
    <div class="card"><h2>تدريب على قسم واحد</h2><div class="row">${D.practice.map(t => `<button data-p="${t.id}">${esc(t.title.replace('Listening — ', ''))}</button>`).join('')}</div>
      <label class="muted"><input type="checkbox" id="rep" checked> السماح بالإعادة والتخطّي في التدريب (وضع التعلّم)</label></div>
    <div class="card"><h2>Dictation</h2><p class="muted">استمع واكتب الجملة حرفيًا لتدريب الانتباه للتفاصيل والتهجئة.</p>
      <div class="row"><button class="primary" id="dn">جملة جديدة</button><button id="dr">🔊 أعد</button></div>
      <textarea class="en" id="dt" style="min-height:80px" placeholder="Type what you hear…"></textarea>
      <div class="row"><button class="primary" id="dk">تحقّق</button></div><div id="dres"></div></div>
    <div class="card"><h2>سجل Listening</h2>${hist.length ? `<table class="result-table"><tr><th>التاريخ</th><th>الاختبار</th><th>الدرجة</th><th>Band ≈</th></tr>${hist.map(h => `<tr><td>${esc(h.date)}</td><td class="l">${esc(h.title)}</td><td>${h.score}/${h.of}</td><td>${I.band.label(I.band.fromRaw('listening', h.score, h.of))}</td></tr>`).join('')}</table>` : '<p class="muted">لا توجد محاولات بعد.</p>'}</div>`;
    const opts = () => ({ voice: $('#vo').value, rate: +$('#rt').value, transfer: +$('#tr').value, replay: $('#rep').checked });
    $('#vt').onclick = () => T.say('Welcome to the IELTS listening practice. This is a test of the voice.', { voice: $('#vo').value, rate: +$('#rt').value });
    $$('#view [data-t]').forEach(b => b.onclick = () => begin(D.tests.find(t => t.id === b.dataset.t), { ...opts(), replay: false, full: true }));
    $$('#view [data-p]').forEach(b => b.onclick = () => begin(D.practice.find(t => t.id === b.dataset.p), { ...opts(), full: false }));
    // dictation
    let di = -1;
    const say = () => T.say(D.dictation[di], { voice: $('#vo').value, rate: +$('#rt').value * .95 });
    $('#dn').onclick = () => { di = Math.floor(Math.random() * D.dictation.length); $('#dt').value = ''; $('#dres').innerHTML = ''; say(); };
    $('#dr').onclick = () => { if (di >= 0) say(); };
    $('#dk').onclick = () => {
      if (di < 0) return;
      const r = diffWords(D.dictation[di], $('#dt').value);
      I.addHistory('listening', { date: I.dayKey(new Date()), kind: 'dict', score: r.score, of: 100 }); I.mark();
      $('#dres').innerHTML = `<p class="big">${r.score}%</p><p class="en diff">${r.out.map(([t, w]) => `<span class="${t}">${esc(w)}</span>`).join(' ')}</p><p class="muted"><span class="diff"><span class="miss">أحمر</span></span> كلمة فاتتك · <span class="diff"><span class="extra">مشطوب</span></span> كلمة زائدة أو خاطئة</p><p class="en q">${esc(D.dictation[di])}</p>`;
    };
  }

  function begin(def, o) {
    const test = X.number(structuredClone(def));
    const state = { ans: {}, flags: new Set() };
    let part = 0, ctl = null, submitted = false, stepIdx = 0, stopped = false;
    I.examActive = o.full; I.leaveGuard = () => submitted || stopped || confirm('الاختبار قيد التشغيل. المغادرة ستوقف التسجيل وتُلغي المحاولة. متابعة؟');
    I.onLeave(() => { stopped = true; if (ctl) ctl.stop(); if (tm) tm.stop(); T.stop(); I.examActive = false; });
    const announcer = T.cast({ N: { g: 'f' } }, o.voice);
    const steps = [];
    test.parts.forEach((p, i) => steps.push({ t: 'prep', i }, { t: 'audio', i }, { t: 'check', i }));
    if (o.full) steps.push({ t: 'transfer' });

    $('#view').innerHTML = `
    <div class="exam-bar"><span class="title">${esc(test.title)}</span>
      <span class="parttabs" id="tabs">${test.parts.map((p, i) => `<button data-i="${i}" class="${i === 0 ? 'on' : ''}">${esc(p.title)} <span class="muted">(${p.first}–${p.last})</span></button>`).join('')}</span>
      <button class="primary" id="sub">تسليم</button></div>
    <div class="stage" id="stage"><div id="stt" style="font-weight:600"></div><div class="wave">${'<i></i>'.repeat(14)}</div><div class="timer" id="tmr">--:--</div><div id="sts" class="muted"></div><div class="row" style="justify-content:center" id="stb"></div></div>
    <div id="qs">${test.parts.map((p, i) => `<div class="pane" data-part="${i}" ${i ? 'hidden' : ''} style="max-height:none">${p.groups.map(X.groupHtml).join('')}</div>`).join('')}</div>
    <div class="card" style="margin-top:12px"><h3 style="margin-top:0">Navigator</h3>${X.navHtml(test)}</div><div id="out"></div>`;

    const qs = $('#qs'); X.bind(qs, state, () => X.updateNav($('#view'), state)); X.updateNav($('#view'), state);
    let curDone = null;
    const fire = () => { const d = curDone; curDone = null; if (d) d(); };
    const tm = I.timer($('#tmr'), { warnAt: 10, onEnd: fire });
    const timed = (sec, done) => { curDone = done; tm.start(sec); };
    const skip = () => { tm.stop(); fire(); };
    const showPart = i => { part = i; $$('[data-part]').forEach(el => el.hidden = +el.dataset.part !== i); $$('#tabs button').forEach(b => b.classList.toggle('on', +b.dataset.i === i)); };
    $$('#tabs button').forEach(b => b.onclick = () => showPart(+b.dataset.i));
    $$('.navgrid button').forEach(b => b.onclick = () => {
      const n = +b.dataset.go, i = test.parts.findIndex(p => n >= p.first && n <= p.last); showPart(i);
      const el = $(`[data-q="${n}"]`); if (el) { el.scrollIntoView({ block: 'center' }); const inp = el.querySelector('input,select'); if (inp) inp.focus({ preventScroll: true }); }
    });
    $('#sub').onclick = () => finish(false);

    const stage = (title, sub, playing) => { $('#stt').textContent = title; $('#sts').textContent = sub || ''; $('#stage').classList.toggle('playing', !!playing); $('#stb').innerHTML = ''; };
    const btn = (label, fn, cls) => { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; $('#stb').appendChild(b); return b; };
    const speakNote = txt => T.play([{ s: 'N', t: txt }], { cast: announcer, rate: o.rate });

    function run() {
      if (stopped || submitted) return;
      const s = steps[stepIdx++];
      if (!s) return finish(true);
      const p = test.parts[s.i];
      if (s.t === 'prep') {
        showPart(s.i); stage(`${p.title} — اقرأ الأسئلة ${p.first}–${p.last}`, 'لديك 30 ثانية لقراءة الأسئلة', false);
        speakNote(`${p.context} You now have thirty seconds to look at questions ${p.first} to ${p.last}.`);
        timed(30, next);
        if (o.replay) btn('تخطّي ›', () => { T.stop(); skip(); }, 'sm');
      } else if (s.t === 'audio') {
        stage(`${p.title} — التسجيل قيد التشغيل`, o.replay ? 'وضع التعلّم: يمكنك التخطّي' : 'يُشغَّل مرة واحدة فقط', true);
        $('#tmr').textContent = '▶';
        const cast = T.cast(p.speakers, o.voice);
        ctl = T.play(p.script, { cast, rate: o.rate, onEnd: () => { stage('', ''); next(); } });
        if (o.replay) btn('تخطّي ›', () => { ctl.stop(); next(); }, 'sm');
      } else if (s.t === 'check') {
        const last = s.i === test.parts.length - 1;
        stage(`${p.title} — انتهى التسجيل`, last && !o.full ? 'راجع إجاباتك ثم سلّم' : 'لديك 30 ثانية لمراجعة إجاباتك', false);
        if (o.replay) btn('🔁 أعد القسم', () => { curDone = null; tm.stop(); stepIdx -= 2; run(); }, 'sm');
        timed(test.checkSeconds || 30, next);
        if (o.replay) btn('تخطّي ›', skip, 'sm');
      } else if (s.t === 'transfer') {
        stage('انتهى التسجيل', `وقت لنقل/مراجعة الإجابات: ${I.fmt(o.transfer)}`, false);
        timed(o.transfer, next);
        btn('سلّم الآن', skip, 'primary');
      }
    }
    function next() { if (!stopped && !submitted) setTimeout(run, 250); }

    function finish(auto) {
      if (submitted) return;
      if (!auto && !confirm('تسليم الاختبار الآن؟')) return;
      submitted = true; stopped = true; if (ctl) ctl.stop(); tm.stop(); T.stop(); I.examActive = false; I.leaveGuard = null;
      stage('تم التسليم', '', false); $('#tmr').textContent = '✓';
      const marks = X.mark(test, state.ans);
      I.addHistory('listening', { date: I.dayKey(new Date()), kind: 'test', title: test.title, score: marks.score, of: marks.total, byType: marks.byType });
      I.addHistory('mocks', { date: I.dayKey(new Date()), skill: 'listening', raw: marks.score, of: marks.total, band: I.band.fromRaw('listening', marks.score, marks.total), id: def.id });
      I.mark();
      showPart(0); $$('[data-part]').forEach(el => el.hidden = false);
      X.annotate(qs, marks); X.markNav($('#view'), marks); $('#sub').disabled = true;
      const scripts = test.parts.map(p => `<details class="q"><summary>Transcript — ${esc(p.title)}</summary><p class="muted">${esc(p.context)}</p>${p.script.filter(l => l.t).map(l => `<p class="en"><b>${esc(l.s)}:</b> ${esc(l.t)}</p>`).join('')}</details>`).join('');
      $('#out').innerHTML = X.summaryHtml(test, marks, 'listening', `<div class="row"><button class="primary" id="back">العودة للقائمة</button></div>`) + `<div class="card"><h2>النصوص المسموعة</h2><p class="muted">اقرأ النص بعد المحاولة وحدّد أين فاتتك الإجابة (تشتيت؟ سرعة؟ رقم؟ تهجئة؟).</p>${scripts}</div>`;
      $('#back').onclick = () => I.show('listening'); $('#out').scrollIntoView({ behavior: 'smooth' });
    }

    stage('جاهز؟', 'اضغط ابدأ لتشغيل التسلسل. سيبدأ الصوت فورًا.', false);
    $('#tmr').textContent = '--:--';
    btn('▶ ابدأ', () => run(), 'primary');
  }

  I.register('listening', 'Listening', landing);
})();

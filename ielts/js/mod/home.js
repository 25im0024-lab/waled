/* Home — dashboard: plan, mock progress chart, weak areas from test analytics, settings and backup. */
(function () {
  'use strict';
  const I = window.IELTS, { $, $$, esc } = I;
  const SKILLS = [['listening', 'Listening', 0], ['reading', 'Reading', 1], ['writing', 'Writing', 2], ['speaking', 'Speaking', 3]];

  function weakAreas() {
    const agg = {};
    [...I.S.reading.slice(-10), ...I.S.listening.filter(h => h.kind === 'test').slice(-10)].forEach(h => {
      Object.entries(h.byType || {}).forEach(([t, v]) => { const a = agg[t] || (agg[t] = { ok: 0, of: 0 }); a.ok += v.ok; a.of += v.of; });
    });
    return Object.entries(agg).filter(([, v]) => v.of >= 4).map(([t, v]) => ({ t, ok: v.ok, of: v.of, pct: Math.round(100 * v.ok / v.of) })).sort((a, b) => a.pct - b.pct);
  }
  function latest(skill) { const a = I.S.mocks.filter(m => m.skill === skill && m.band != null); return a.length ? a[a.length - 1].band : null; }

  function render() {
    const S = I.S, vs = I.vocabStats(), g = S.grammar, acc = g.total ? Math.round(100 * g.right / g.total) : null;
    const dow = new Date().getDay();
    const plan = [['Reading — نص كامل أو اختبار', 'reading'], ['Listening — قسمان أو اختبار', 'listening'], ['Speaking — محاكاة', 'speaking'], ['Writing Task 2', 'writing'], ['Writing Task 1', 'writing'], ['مراجعة الأخطاء (Grammar + كلماتي)', 'grammar'], ['Listening — Dictation + مراجعة النصوص', 'listening']][dow];
    let days = '';
    if (S.exam) { const d = Math.ceil((new Date(S.exam) - new Date()) / 864e5); days = d >= 0 ? `<b>${d}</b> يوم حتى الاختبار` : 'تاريخ الاختبار مضى'; }
    const bands = SKILLS.map(([k]) => latest(k)), have = bands.filter(b => b != null);
    const overall = have.length === 4 ? I.band.overall(bands) : null;
    const weak = weakAreas().slice(0, 3);

    $('#view').innerHTML = `
    <div class="card"><h2>خطة اليوم (~60 دقيقة)</h2>
      <ol><li>10 د: Vocabulary — لديك <b>${vs.due}</b> كلمة للمراجعة</li><li>10 د: Grammar</li><li>40 د: <b>${esc(plan[0])}</b></li></ol>
      <div class="row"><button class="primary" data-go="vocab">Vocabulary</button><button data-go="grammar">Grammar</button><button class="primary" data-go="${plan[1]}">${esc(plan[0].split(' ')[0])}</button></div>
      <p class="muted">${days}</p></div>

    <div class="card"><h2>مستواك التقديري</h2>
      <div class="grid">${SKILLS.map(([k, l], i) => `<div class="stat"><small>${l} (آخر محاولة)</small><b>${bands[i] != null ? bands[i].toFixed(1) : '–'}</b></div>`).join('')}
        <div class="stat"><small>Overall (تقدير)</small><b>${overall != null ? overall.toFixed(1) : '–'}</b></div><div class="stat"><small>الهدف</small><b>${S.target}</b></div></div>
      <div id="chart"></div>
      <p class="muted">كل الدرجات تقديرية: Reading/Listening من جدول تحويل تقريبي، وWriting/Speaking من تقييم Claude الآلي. Overall يظهر عند وجود محاولة لكل المهارات الأربع.</p></div>

    ${weak.length ? `<div class="card"><h2>أضعف أنواع الأسئلة (آخر 10 اختبارات)</h2><table class="result-table" style="width:100%">${weak.map(w => `<tr><td class="l">${esc(I.exam.LABEL[w.t] || w.t)}</td><td>${w.ok}/${w.of}</td><td style="width:40%"><div class="bar"><i style="width:${w.pct}%;background:${w.pct >= 75 ? 'var(--green)' : w.pct >= 50 ? 'var(--orange)' : 'var(--red)'}"></i></div></td></tr>`).join('')}</table><p class="muted">ركّز تدريبك القادم على هذه الأنواع.</p></div>` : ''}

    <div class="card"><h2>نشاطك</h2><div class="grid">
      <div class="stat"><small>Streak (أيام)</small><b>${I.streak()}</b></div>
      <div class="stat"><small>كلمات بدأتها</small><b>${vs.started}</b></div>
      <div class="stat"><small>كلمات متقنة</small><b>${vs.mastered}</b></div>
      <div class="stat"><small>دقة Grammar</small><b>${acc == null ? '–' : acc + '%'}</b></div>
      <div class="stat"><small>اختبارات Reading</small><b>${S.reading.length}</b></div>
      <div class="stat"><small>اختبارات Listening</small><b>${S.listening.filter(h => h.kind === 'test').length}</b></div>
      <div class="stat"><small>مقالات</small><b>${S.writing.length}</b></div>
      <div class="stat"><small>جلسات Speaking</small><b>${S.speaking.length}</b></div></div></div>

    <div class="card"><h2>إعدادات</h2><div class="row">
      <label>Band المستهدف <select id="tgt">${[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map(b => `<option ${b === S.target ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
      <label>تاريخ الاختبار <input type="date" id="exam" value="${esc(S.exam)}"></label></div>
      <div class="row"><button id="exp">تصدير التقدم (JSON)</button><label class="muted">استيراد: <input type="file" id="imp" accept=".json"></label><button class="danger" id="rst">مسح كل شيء</button></div>
      <p class="muted">التقدم محفوظ في متصفحك فقط (localStorage). صدّر نسخة احتياطية من وقت لآخر. استخدم الأداة من نفس المتصفح والجهاز لتبقى بياناتك.</p></div>

    <div class="card"><h2>تنبيه مهم</h2><p class="muted">الأداة تدرّبك بنمط الاختبار لكنها ليست الاختبار الرسمي: أسئلة Reading وListening مؤلَّفة أصليًا وأقصر قليلًا، وصوت Listening اصطناعي. التصحيح الآلي لـ Writing وSpeaking تقدير لا درجة رسمية. للجاهزية النهائية جرّب مواد Cambridge الرسمية واحجز اختبارًا تجريبيًا مع examiner بشري إن أمكن.</p></div>`;

    $$('#view [data-go]').forEach(b => b.onclick = () => I.show(b.dataset.go));
    $('#tgt').onchange = e => { S.target = +e.target.value; I.save(); render(); $('#topinfo').textContent = `Streak ${I.streak()} يوم · الهدف Band ${S.target}`; };
    $('#exam').onchange = e => { S.exam = e.target.value; I.save(); render(); };
    $('#exp').onclick = () => I.download('ielts-progress.json', JSON.stringify(S, null, 1));
    $('#imp').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { if (confirm('سيُستبدل تقدمك الحالي بالملف. متابعة؟')) { I.replaceState(JSON.parse(t)); render(); } } catch (err) { I.toast('ملف غير صالح'); } }); };
    $('#rst').onclick = () => { if (confirm('سيتم حذف كل التقدم. متأكد؟')) { I.resetState(); render(); } };

    // progress chart
    const mocks = S.mocks.filter(m => m.band != null).slice(-16), box = $('#chart');
    if (mocks.length >= 2) {
      const series = SKILLS.map(([k, l, ci]) => ({ name: l, ci, data: mocks.map(m => m.skill === k ? m.band : null) })).filter(s => s.data.some(v => v != null));
      series.push({ name: 'Target', ci: 4, data: mocks.map(() => S.target) });
      I.charts.render({ type: 'line', title: 'Estimated band by test', sub: 'Most recent tests, oldest → newest', categories: mocks.map(m => m.date.slice(5)), y: { label: 'Band', min: 4, max: 9, step: 1 }, x: { label: 'Test date (MM-DD)' }, series }, box);
    } else box.innerHTML = '<p class="muted">أنجز اختبارين على الأقل لرؤية منحنى التقدم.</p>';
  }
  I.register('home', 'الرئيسية', render);
})();

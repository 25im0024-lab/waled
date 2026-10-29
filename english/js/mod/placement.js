/* Placement test — 24 multiple-choice questions, ends with a recommended level (stored in E.S.placed). */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc, shuffle } = E;
  const items = E.data.placement.items;

  /** Highest level passed (>=60%) with every lower level also passed (>=50%). Pure function (tested). */
  function decide(by) {
    const pct = l => by[l].n ? by[l].ok / by[l].n : 0;
    if (pct('A1') < 0.5) return 'A1';
    if (pct('A2') < 0.6) return pct('A1') >= 0.75 ? 'A2' : 'A1';
    return pct('B1') >= 0.6 ? 'B1' : 'A2';
  }

  function start() {
    $('#view').innerHTML = `<div class="card"><h2>🧪 اختبار تحديد المستوى · Placement test</h2>
      <p>${E.bi('24 short questions (about 5 minutes). Answer what you can. If you do not know, guess — and tell yourself the truth, the result is only for you.', '٢٤ سؤالًا قصيرًا (حوالي ٥ دقائق). أجب بما تعرف، وإن لم تعرف فخمّن. النتيجة لك وحدك.')}</p>
      <p class="muted">النتيجة تقديرية ولا تساوي شهادة رسمية. يمكنك تغيير المستوى في أي وقت من الرئيسية.</p>
      <div class="row"><button class="primary big" data-go>ابدأ · Start</button><button data-skip>‹ رجوع</button></div></div>`;
    $('[data-go]').onclick = run; $('[data-skip]').onclick = () => E.show('home');
  }

  /* Own flow (not E.quiz.run) because the result needs per-level counts. */
  function run() {
    const qs = ['A1', 'A2', 'B1'].flatMap(l => items.filter(x => x.level === l));
    const by = { A1: { ok: 0, n: 0 }, A2: { ok: 0, n: 0 }, B1: { ok: 0, n: 0 } };
    let i = 0;
    const show = () => {
      if (i >= qs.length) return end();
      const x = qs[i];
      $('#view').innerHTML = `<div class="qwrap card"><div class="qhead"><span class="muted">${i + 1} / ${qs.length}</span><div class="bar" style="flex:1"><i style="width:${100 * i / qs.length}%"></i></div></div>
        <div class="sent" dir="ltr">${esc(x.q)}</div>${x.ar ? `<div class="ar muted" style="text-align:center">${esc(x.ar)}</div>` : ''}
        <div class="opts">${shuffle(x.opts).map(o => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}<button class="opt" data-o="" style="opacity:.7">لا أعرف · I don't know</button></div></div>`;
      $$('#view .opt').forEach(b => b.onclick = () => { by[x.level].n++; if (b.dataset.o === x.a) by[x.level].ok++; i++; show(); });
    };
    const end = () => {
      const lv = decide(by), pct = l => by[l].n ? Math.round(100 * by[l].ok / by[l].n) : 0;
      E.S.placed = { level: lv, date: new Date().toISOString().slice(0, 10), by: { A1: pct('A1'), A2: pct('A2'), B1: pct('B1') } }; E.S.level = lv; E.save(); E.xp(10);
      $('#view').innerHTML = `<div class="card" style="text-align:center"><h2>🎯 مستواك المقترح · Your suggested level</h2><div class="meter">${lv}</div><p>${esc(E.LEVEL_AR[lv] || '')}</p>
        <div class="grid3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${['A1', 'A2', 'B1'].map(l => `<div class="card" style="box-shadow:none;background:var(--soft)"><b>${l}</b><div class="meter" style="font-size:1.4rem">${pct(l)}%</div><small class="muted">${by[l].ok}/${by[l].n}</small></div>`).join('')}</div>
        <p class="muted">تقدير سريع من ٢٤ سؤالًا فقط، فلا تتعامل معه كحكم نهائي. إن وجدتَ المحتوى سهلًا جدًا أو صعبًا جدًا فغيّر المستوى من الرئيسية.</p>
        <div class="row" style="justify-content:center"><button class="primary big" data-ok>ابدأ التعلّم · Start learning</button><button data-again>🔁 أعد الاختبار</button></div></div>`;
      $('[data-ok]').onclick = () => E.show('home'); $('[data-again]').onclick = start;
    };
    show();
  }

  E.mod.placement = { decide };
  E.register('placement', 'تحديد المستوى', '🧪', start, 110, true);
})();

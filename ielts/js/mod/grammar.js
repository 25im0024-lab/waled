/* Grammar module — 10-question sessions; missed questions return first until answered correctly. */
(function () {
  'use strict';
  const I = window.IELTS, { $, $$, esc } = I;

  function render() {
    const bank = I.data.grammar, G = I.S.grammar, cats = [...new Set(bank.map(q => q.cat))].sort();
    $('#view').innerHTML = `<div class="card"><h2>Grammar quiz</h2><p class="muted">${bank.length} سؤالًا في ${cats.length} فئات؛ أسئلتك الخاطئة تتكرر أولًا حتى تُجيبها صحيحة.</p>
      <div class="row"><label>الفئة <select id="gc"><option value="">الكل</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></label><button class="primary" id="gs">ابدأ (10 أسئلة)</button></div>
      ${Object.keys(G.byCat || {}).length ? `<h3>دقتك حسب الفئة</h3><table class="result-table">${Object.entries(G.byCat).sort((a, b) => a[1].r / a[1].t - b[1].r / b[1].t).map(([c, v]) => `<tr><td class="l">${esc(c)}</td><td>${v.r}/${v.t}</td><td style="width:40%"><div class="bar"><i style="width:${Math.round(100 * v.r / v.t)}%"></i></div></td></tr>`).join('')}</table>` : ''}</div>`;
    $('#gs').onclick = () => quiz($('#gc').value);
  }

  function quiz(cat) {
    const G = I.S.grammar, wrong = Object.keys(G.wrong).map(Number);
    const pool = I.shuffle(I.data.grammar.filter(q => !cat || q.cat === cat));
    const qs = pool.filter(q => wrong.includes(q.id)).concat(pool.filter(q => !wrong.includes(q.id))).slice(0, 10);
    let i = 0, right = 0, locked = false;
    const draw = () => {
      if (i >= qs.length) {
        $('#view').innerHTML = `<div class="card"><h2>النتيجة</h2><p class="big">${right} / ${qs.length}</p><div class="row"><button class="primary" id="again">جلسة جديدة</button><button id="hm">الرئيسية</button></div></div>`;
        $('#again').onclick = () => quiz(cat); $('#hm').onclick = () => I.show('home'); return;
      }
      const q = qs[i], order = I.shuffle(q.opts.map((o, k) => [o, k]));
      locked = false;
      $('#view').innerHTML = `<div class="card"><h2>Grammar — ${i + 1}/${qs.length} <span class="tag">${esc(q.cat)}</span></h2><div class="bar"><i style="width:${100 * i / qs.length}%"></i></div>
        <p class="en big" style="font-size:20px">${esc(q.q)}</p>${order.map(([o, k]) => `<button class="opt en" data-k="${k}">${esc(o)}</button>`).join('')}<div id="fb"></div></div>`;
      $$('.opt').forEach(b => b.onclick = () => {
        if (locked) return; locked = true;
        const ok = +b.dataset.k === q.ans, bc = G.byCat[q.cat] || (G.byCat[q.cat] = { r: 0, t: 0 });
        G.total++; bc.t++;
        if (ok) { G.right++; bc.r++; right++; delete G.wrong[q.id]; } else G.wrong[q.id] = (G.wrong[q.id] || 0) + 1;
        $$('.opt').forEach(x => { if (+x.dataset.k === q.ans) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
        I.mark(); I.save();
        $('#fb').innerHTML = `<p class="${ok ? 'ok' : 'bad'}">${ok ? 'صحيح' : 'خطأ'}</p><p>${esc(q.why)}</p><button class="primary" id="nx">التالي</button>`;
        $('#nx').onclick = () => { i++; draw(); };
      });
    };
    draw();
  }
  I.register('grammar', 'Grammar', render);
})();

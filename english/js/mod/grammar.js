/* Grammar — lessons with bilingual rules, tables, visual widgets and practice. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc } = E;
  const lessons = E.data.grammar.lessons;
  let filter = null;

  function landing() {
    filter = filter || E.S.level;
    const list = lessons.filter(l => filter === 'ALL' || l.level === filter);
    $('#view').innerHTML = `<div class="card"><h2>🧩 القواعد · Grammar</h2><p class="muted">كل درس: شرح بالعربية والإنجليزية، أمثلة بالصوت، أداة مرئية تفاعلية عند الحاجة، ثم تمارين. ✅ = أنجزتَه بنسبة 70% فأكثر.</p>
      <div class="levels">${['A1', 'A2', 'B1', 'ALL'].map(l => `<button data-lv="${l}" class="${l} ${filter === l ? 'on' : ''}">${l === 'ALL' ? 'الكل · All' : `<b>${l}</b><br><small>${E.LEVEL_AR[l]}</small>`}</button>`).join('')}</div></div>
      <div class="tiles">${list.map(l => { const d = E.S.done['g:' + l.id]; return `<button class="tile" data-id="${l.id}"><span class="ic">${l.icon}</span><b>${esc(l.en)}</b><span class="ar muted" style="text-align:center">${esc(l.ar)}</span><span class="tag lv ${l.level}">${l.level}</span><small>${d ? (d.best >= 70 ? '✅ ' : '') + d.best + '%' : 'لم يبدأ'}</small></button>`; }).join('')}</div>`;
    $$('#view [data-lv]').forEach(b => b.onclick = () => { filter = b.dataset.lv; landing(); });
    $$('#view [data-id]').forEach(b => b.onclick = () => lesson(lessons.find(l => l.id === b.dataset.id)));
  }

  function lesson(l) {
    const idx = lessons.indexOf(l), next = lessons[idx + 1];
    const pts = l.points.map(p => `<div class="card" style="box-shadow:none"><div class="rule">${E.bi(p.t[0], p.t[1])}</div>
      ${p.table ? `<div class="tblwrap"><table class="t"><thead><tr>${p.table.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${p.table.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
      ${p.ex ? `<div class="ex-list">${p.ex.map(e => `<div class="ex-item"><div style="flex:1">${E.bi(e[0], e[1])}</div>${E.sayBtn(e[0])}</div>`).join('')}</div>` : ''}
      ${p.warn ? `<div class="rule warn" style="margin-top:8px"><b>⚠️ انتبه · Watch out</b><div class="en" dir="ltr">${esc(p.warn[0])}</div><div class="ar">${esc(p.warn[1])}</div></div>` : ''}</div>`).join('');
    $('#view').innerHTML = `<div class="lesson"><div class="card"><div class="row" style="justify-content:space-between"><button class="sm" data-back>‹ الدروس · Lessons</button><span class="tag lv ${l.level}">${l.level}</span></div>
      <h2>${l.icon} ${esc(l.en)}</h2><div class="ar muted">${esc(l.ar)}</div></div>
      ${l.widget ? '<div id="wid"></div>' : ''}${pts}
      <div class="card" style="text-align:center"><h2>🎯 تمرّن · Practice</h2><p class="muted">${l.ex.length} تمارين. تحتاج 70% لتُسجَّل الدرس منجزًا.</p><button class="primary big" data-go>ابدأ التمارين · Start</button>${next ? ` <button class="big" data-next>الدرس التالي › ${esc(next.en)}</button>` : ''}</div></div>`;
    $('[data-back]').onclick = landing;
    if (l.widget) { const [name, arg] = l.widget.split(':'); const el = $('#wid'); const fn = E.vis.WIDGETS[name]; if (fn) fn(el, arg ? arg.split(',') : undefined); }
    $('[data-go]').onclick = () => E.quiz.run({ root: $('#view'), items: l.ex, shuffle: true, title: l.en, id: 'g:' + l.id, onExit: () => lesson(l) });
    if (next) $('[data-next]').onclick = () => lesson(next);
  }

  E.mod.grammar = { lessons, lesson };
  E.register('grammar', 'القواعد', '🧩', landing, 40);
})();

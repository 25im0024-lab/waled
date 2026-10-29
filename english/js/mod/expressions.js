/* Expressions — idioms, phrasal verbs and collocations with pictures (emoji), Arabic meaning, examples and quizzes. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc, shuffle } = E;
  const D = E.data.expressions;
  const CATS = {
    idioms: { icon: '🧠', en: 'Idioms', ar: 'التعابير الاصطلاحية', note: 'عبارات معناها ليس حرفيًا. تعلّم المعنى كاملًا لا كلمة بكلمة.', rows: D.idioms },
    phrasal: { icon: '🧩', en: 'Phrasal verbs', ar: 'الأفعال المركّبة', note: 'فعل + أداة (up, off, on…) يغيّر المعنى: give up = يستسلم.', rows: D.phrasal },
    colloc: { icon: '🔗', en: 'Collocations', ar: 'المتلازمات اللفظية', note: 'كلمات تأتي معًا بشكل طبيعي: نقول make a decision وليس do a decision.', rows: D.colloc }
  };
  let level = 'ALL';

  const pseudo = (cat, rows) => ({ id: 'expr-' + cat, level: 'B1', icon: CATS[cat].icon, en: CATS[cat].en, ar: CATS[cat].ar, words: rows.map(r => [r[0], r[1], r[2], r[3], r[4]]) });
  const rowsOf = cat => CATS[cat].rows.filter(r => level === 'ALL' || r[5] === level);

  function landing() {
    $('#view').innerHTML = `<div class="card"><h2>🧠 التعابير والأفعال المركّبة · Expressions</h2>
      <p class="muted">هذا ما يجعل كلامك طبيعيًا. كل عبارة مع صورة ومعناها بالعربية ومثال بصوت.</p></div>
      <div class="tiles">${Object.entries(CATS).map(([k, c]) => { const x = E.S.done['ex:' + k]; return `<button class="tile" data-c="${k}"><span class="ic">${c.icon}</span><b>${c.en}</b><span class="ar muted" style="text-align:center">${c.ar}</span><small>${c.rows.length} · ${x ? x.best + '%' : ''}</small></button>`; }).join('')}</div>`;
    $$('#view [data-c]').forEach(b => b.onclick = () => category(b.dataset.c));
  }

  function category(cat) {
    const c = CATS[cat], rows = rowsOf(cat);
    $('#view').innerHTML = `<div class="card"><button class="sm" data-back>‹ رجوع</button><h2>${c.icon} ${c.en} <span class="ar muted" style="font-size:.95rem">${c.ar}</span></h2><p class="muted">${c.note}</p>
      <div class="levels">${['ALL', 'A1', 'A2', 'B1'].map(l => `<button data-lv="${l}" class="${l === 'ALL' ? '' : l} ${level === l ? 'on' : ''}">${l === 'ALL' ? 'الكل' : `<b>${l}</b>`}</button>`).join('')}</div>
      <div class="row"><button class="primary big" data-cards ${rows.length ? '' : 'disabled'}>📇 بطاقات · Flashcards</button><button class="big" data-q="mean">❓ ما معناها؟</button><button class="big" data-q="rev">🔤 اختر العبارة</button><button class="big" data-q="gap">✏️ أكمل الجملة</button><button class="big" data-q="match">🔗 طابق</button></div></div>
      <div class="card"><div class="ex-list">${rows.map(r => `<div class="ex-item" style="align-items:flex-start"><span style="font-size:1.9rem">${r[2]}</span><span class="en" dir="ltr" style="flex:1"><b>${esc(r[0])}</b> <span class="tag lv ${r[5]}">${r[5]}</span><br><span class="muted">${esc(r[3])}</span><br><small class="ar muted" dir="rtl">${esc(r[4])}</small></span><span class="ar" style="text-align:end;max-width:42%">${esc(r[1])}</span>${E.sayBtn(r[0])}</div>`).join('') || '<p class="muted">لا توجد عناصر لهذا المستوى.</p>'}</div></div>`;
    $('[data-back]').onclick = landing;
    $$('#view [data-lv]').forEach(b => b.onclick = () => { level = b.dataset.lv; category(cat); });
    $('[data-cards]').onclick = () => { const t = pseudo(cat, rows); E.mod.words.session(t.words.map(w => ({ t, w, key: t.id + ':' + w[0] })), c.en, () => category(cat)); };
    $$('#view [data-q]').forEach(b => b.onclick = () => quiz(cat, b.dataset.q, rows));
  }

  function quiz(cat, kind, rows) {
    if (rows.length < 4) return E.toast('اختر مستوى أكبر — العناصر قليلة');
    const others = (r, n, f) => shuffle(rows.filter(x => x !== r)).slice(0, n).map(f);
    let items;
    if (kind === 'match') items = [{ t: 'match', q: 'طابق العبارة بمعناها · Match', pairs: shuffle(rows).slice(0, 6).map(r => [r[0], r[1]]), review: 'match' }];
    else if (kind === 'mean') items = shuffle(rows).slice(0, 10).map(r => ({ t: 'mc', pic: r[2], q: `What does “${r[0]}” mean?`, ar: 'ما معناها؟', opts: [r[1], ...others(r, 3, x => x[1])], a: r[1], say: r[0], why: { en: r[3], ar: r[4] }, review: r[0], shown: r[1] }));
    else if (kind === 'rev') items = shuffle(rows).slice(0, 10).map(r => ({ t: 'mc', pic: r[2], q: r[1], opts: [r[0], ...others(r, 3, x => x[0])], a: r[0], say: r[0], why: { en: r[3], ar: r[4] }, review: r[1], shown: r[0] }));
    else {
      const ok = rows.filter(r => r[3].toLowerCase().includes(r[0].toLowerCase()));
      if (ok.length < 4) return E.toast('لا توجد جمل كافية لهذا التمرين في هذا المستوى');
      items = shuffle(ok).slice(0, 10).map(r => { const i = r[3].toLowerCase().indexOf(r[0].toLowerCase()); const q = r[3].slice(0, i) + '____' + r[3].slice(i + r[0].length); return { t: 'mc', q, ar: r[4], opts: [r[0], ...shuffle(ok.filter(x => x !== r)).slice(0, 3).map(x => x[0])], a: r[0], say: r[3], why: { en: `${r[0]} = ${r[1]}`, ar: r[1] }, review: r[3], shown: r[0] }; });
    }
    E.quiz.run({ root: $('#view'), items, shuffle: false, title: CATS[cat].en, id: 'ex:' + cat, onExit: () => category(cat) });
  }

  E.mod.expressions = { cats: CATS };
  E.register('expressions', 'تعابير', '🧠', landing, 100);
})();

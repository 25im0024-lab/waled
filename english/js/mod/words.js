/* Words — picture flashcards with spaced repetition, picture/listening/spelling/matching quizzes. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc, shuffle } = E;
  const baseTopics = E.data.vocab.topics, all = [];
  /** Built-in topics plus a "My words" topic from words saved while reading. */
  const allTopics = () => { const a = baseTopics.slice(); if (E.S.custom.length) a.push({ id: 'mine', level: 'A1', icon: '⭐', en: 'My words', ar: 'كلماتي', words: E.S.custom.map(c => [c.en, c.ar, '⭐', c.ex || '', '']) }); return a; };
  const rebuild = () => { all.length = 0; allTopics().forEach(t => t.words.forEach(w => all.push({ t, w, key: t.id + ':' + w[0] }))); };
  rebuild();
  let topics = allTopics();
  let filter = null;

  const learnedIn = t => t.words.filter(w => E.S.vocab[t.id + ':' + w[0]]).length;
  const dueCount = () => E.srs.due(all.map(x => x.key)).length;

  function landing() {
    filter = filter || E.S.level; rebuild(); topics = allTopics();
    const list = topics.filter(t => t.id === 'mine' || filter === 'ALL' || t.level === filter), due = dueCount();
    $('#view').innerHTML = `
    <div class="card"><h2>📚 الكلمات · Words</h2>
      <p class="muted">كل كلمة بصورة وصوت وترجمة. المراجعة بنظام التكرار المتباعد: ما تعرفه تتباعد مراجعته.</p>
      <div class="levels">${['A1', 'A2', 'B1', 'ALL'].map(l => `<button data-lv="${l}" class="${l} ${filter === l ? 'on' : ''}">${l === 'ALL' ? 'الكل · All' : `<b>${l}</b><br><small>${E.LEVEL_AR[l]}</small>`}</button>`).join('')}</div>
      <div class="row"><button class="primary big" data-review ${due ? '' : 'disabled'}>🔁 مراجعة اليوم · Review (${due})</button><button class="big" data-new>✨ كلمات جديدة · Learn new</button><button class="big" data-mix>🎯 اختبار شامل · Mixed quiz</button></div></div>
    <div class="tiles">${list.map(t => { const n = learnedIn(t); return `<button class="tile" data-id="${t.id}"><span class="ic">${t.icon}</span><b>${esc(t.en)}</b><span class="ar muted" style="text-align:center">${esc(t.ar)}</span><span class="tag lv ${t.level}">${t.id === 'mine' ? '⭐' : t.level}</span><div class="bar" style="width:100%"><i style="width:${100 * n / t.words.length}%"></i></div><small>${n}/${t.words.length}</small></button>`; }).join('')}</div>`;
    $$('#view [data-lv]').forEach(b => b.onclick = () => { filter = b.dataset.lv; landing(); });
    $$('#view [data-id]').forEach(b => b.onclick = () => topic(topics.find(t => t.id === b.dataset.id)));
    $('[data-review]').onclick = () => session(E.srs.due(all.map(x => x.key)).map(k => all.find(x => x.key === k)), 'مراجعة اليوم');
    $('[data-new]').onclick = () => { const pool = all.filter(x => filter === 'ALL' || x.t.level === filter); const keys = E.srs.fresh(pool.map(x => x.key)); if (!keys.length) return E.toast('لا توجد كلمات جديدة اليوم — عُد غدًا أو غيّر المستوى'); session(keys.map(k => all.find(x => x.key === k)), 'كلمات جديدة'); };
    $('[data-mix]').onclick = () => { const pool = all.filter(x => filter === 'ALL' || x.t.level === filter); quiz(null, 'mixed', shuffle(pool).slice(0, 12)); };
  }

  /* ---------- topic page ---------- */
  function topic(t) {
    $('#view').innerHTML = `<div class="card"><button class="sm" data-back>‹ رجوع · Back</button>
      <h2>${t.icon} ${esc(t.en)} <span class="ar muted" style="font-size:.9rem">${esc(t.ar)}</span> <span class="tag lv ${t.level}">${t.level}</span></h2>
      <div class="row"><button class="primary big" data-cards>📇 بطاقات · Flashcards</button><button class="big" data-q="pic">🖼️ ما هذا؟ · What is it?</button><button class="big" data-q="word2pic">🔤→🖼️ اختر الصورة</button><button class="big" data-q="listen">🎧 استمع واختر</button><button class="big" data-q="spell">✍️ اكتب الكلمة</button><button class="big" data-q="match">🔗 طابق</button></div></div>
      <div class="card"><h3>القائمة · Word list</h3><div class="ex-list">${t.words.map(w => `<div class="ex-item"><span style="font-size:1.8rem">${w[2]}</span><span class="en" dir="ltr" style="flex:1"><b>${esc(w[0])}</b><br><small class="muted">${esc(w[3])}</small></span><span class="ar" style="text-align:end">${esc(w[1])}</span>${E.sayBtn(w[0])}</div>`).join('')}</div></div>`;
    $('[data-back]').onclick = landing;
    $('[data-cards]').onclick = () => session(t.words.map(w => ({ t, w, key: t.id + ':' + w[0] })), t.en, () => topic(t));
    $$('#view [data-q]').forEach(b => b.onclick = () => quiz(t, b.dataset.q, null, () => topic(t)));
  }

  /* ---------- flashcards + SRS ---------- */
  function session(queue, title, back) {
    queue = queue.slice(); const failed = new Set(); let shown = false, done = 0; const total = queue.length;
    const draw = () => {
      if (!queue.length) {
        E.xp(Math.min(10, 2 + total)); return $('#view').innerHTML = `<div class="card flash"><h2>🎉 انتهت الجلسة · Session complete</h2><p>${total} كلمات · +${Math.min(10, 2 + total)} XP</p><div class="row" style="justify-content:center"><button class="primary" data-ok>متابعة · Continue</button></div></div>`, $('[data-ok]').onclick = back || landing;
      }
      const { t, w } = queue[0];
      $('#view').innerHTML = `<div class="card flash"><div class="row" style="justify-content:space-between"><button class="sm" data-back>‹</button><span class="muted">${done + 1} / ${total} · ${esc(title)}</span><span class="tag lv ${t.level}">${t.level}</span></div>
        <div class="bar"><i style="width:${100 * done / total}%"></i></div>
        <div class="pic">${w[2]}</div><div class="word">${esc(w[0])} ${E.sayBtn(w[0], 'big')}</div>
        ${shown ? `<div class="ar">${esc(w[1])}</div><div class="ex"><div class="en" dir="ltr">${esc(w[3])} ${E.sayBtn(w[3])}</div><div class="ar muted" style="font-size:1rem;text-align:center">${esc(w[4])}</div></div>
          <div class="row" style="justify-content:center;margin-top:14px"><button class="bad big" data-no>😕 لم أعرفها · Again</button><button class="good big" data-yes>😊 عرفتها · Got it</button></div>`
          : `<div class="row" style="justify-content:center;margin-top:14px"><button class="primary big" data-show>إظهار المعنى · Show meaning</button></div>`}</div>`;
      $('[data-back]').onclick = back || landing; setTimeout(() => E.say(w[0]), 200);
      if (!shown) $('[data-show]').onclick = () => { shown = true; draw(); };
      else { $('[data-yes]').onclick = () => ans(true); $('[data-no]').onclick = () => ans(false); }
    };
    const ans = ok => { const cur = queue.shift(); E.srs.answer(cur.key, ok, failed); E.xp(ok ? 1 : 0); if (!ok) queue.push(cur); else done++; shown = false; draw(); };
    draw();
  }

  /* ---------- quizzes ---------- */
  function others(t, w, n, pred) {
    const pool = shuffle(t ? t.words.concat(all.filter(x => x.t !== t).map(x => x.w)) : all.map(x => x.w)).filter(x => x[0] !== w[0] && pred(x));
    const seen = new Set(), out = [];
    for (const x of pool) { const k = pred.key ? pred.key(x) : x[0]; if (!seen.has(k)) { seen.add(k); out.push(x); } if (out.length >= n) break; }
    return out;
  }
  const uniqEmoji = (w, n, t) => { const out = [], seen = new Set([w[2]]); for (const x of shuffle(t ? t.words.concat(all.filter(a => a.t !== t).map(a => a.w)) : all.map(a => a.w))) { if (!seen.has(x[2]) && x[0] !== w[0]) { seen.add(x[2]); out.push(x[2]); } if (out.length >= n) break; } return out; };
  function build(t, type, w) {
    const why = { en: w[3], ar: w[4] };
    if (type === 'pic') return { t: 'mc', pic: w[2], q: 'What is this? · ما هذا؟', opts: [w[0], ...others(t, w, 3, () => true).map(x => x[0])], a: w[0], say: w[0], why, review: w[2] + ' ' + w[1], shown: w[0] };
    if (type === 'word2pic') return { t: 'word2pic', q: w[0], ar: w[1], opts: [w[2], ...uniqEmoji(w, 3, t)], a: w[2], say: w[0], why, review: w[0], shown: w[2] };
    if (type === 'listen') return { t: 'listen', say: w[0], opts: [w[2], ...uniqEmoji(w, 3, t)], a: w[2], big: true, why, review: w[0], shown: w[2] };
    if (type === 'spell') return { t: 'fill', pic: w[2], q: '____', ar: w[1], hint: `${w[0][0]}${w[0].slice(1).replace(/[a-z]/gi, '_')}  (${w[0].replace(/ /g, '').length} letters)`, a: [w[0]], say: w[0], why, review: w[1], shown: w[0] };
    return null;
  }
  function quiz(t, type, pool, back) {
    const ws = pool ? pool : shuffle(t.words.map(w => ({ t, w }))).slice(0, 10);
    let items;
    if (type === 'match') {
      const src = shuffle((t ? t.words : ws.map(x => x.w)).map(w => w)).slice(0, 6);
      items = [{ t: 'match', q: 'طابق الكلمة بمعناها · Match', pairs: src.map(w => [w[0], w[1]]), review: 'match' }];
    } else if (type === 'mixed') {
      const kinds = ['pic', 'word2pic', 'listen', 'spell']; items = ws.map((x, i) => build(x.t, kinds[i % 4], x.w));
    } else items = ws.map(x => build(x.t || t, type, x.w || x));
    E.quiz.run({ root: $('#view'), items: items.filter(Boolean), shuffle: false, title: t ? t.en : 'Mixed', id: t ? `q:${t.id}:${type}` : null, onExit: back || landing });
  }

  E.mod.words = { get topics() { return topics; }, all, quiz, session };
  E.register('words', 'الكلمات', '📚', landing, 20);
})();

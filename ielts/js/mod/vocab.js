/* Vocabulary module — Leitner spaced repetition (boxes 1–5 → 1/3/7/14/30 days). */
(function () {
  'use strict';
  const I = window.IELTS, { $, $$, esc } = I;
  const INT = [0, 1, 3, 7, 14, 30], NEW_PER_DAY = 10;

  function decks() {
    const d = {};
    for (const [k, [name, words]] of Object.entries(I.data.vocab)) d[k] = { name, words: words.map(w => ({ key: k + ':' + w[0], en: w[0], pos: w[1], ar: w[2], ex: w[3] })) };
    d.mine = { name: 'كلماتي', words: I.S.custom.map(w => ({ key: 'mine:' + w.en, en: w.en, pos: '', ar: w.ar, ex: w.ex || '' })) };
    return d;
  }
  const wordsOf = id => { const d = decks(); return id === 'all' ? Object.values(d).flatMap(x => x.words) : (d[id] ? d[id].words : []); };
  I.vocabStats = () => {
    const t = I.dayIdx(), all = wordsOf('all');
    return { due: all.filter(w => I.S.vocab[w.key] && I.S.vocab[w.key].due <= t).length, started: Object.keys(I.S.vocab).length, mastered: Object.values(I.S.vocab).filter(r => r.box >= 5).length, total: all.length };
  };

  function render() {
    const D = decks();
    if (I.S.deckSel !== 'all' && !D[I.S.deckSel]) I.S.deckSel = 'core';
    let queue = [], failed = new Set(), shown = false;
    const t0 = I.dayIdx();
    const build = () => {
      const ws = wordsOf(I.S.deckSel), used = I.S.newToday.day === t0 ? I.S.newToday.n : 0;
      const due = ws.filter(w => I.S.vocab[w.key] && I.S.vocab[w.key].due <= t0);
      const fresh = ws.filter(w => !I.S.vocab[w.key]).slice(0, Math.max(0, NEW_PER_DAY - used));
      queue = I.shuffle(due).concat(fresh);
    };
    const draw = () => {
      const ws = wordsOf(I.S.deckSel), cnt = [0, 0, 0, 0];
      ws.forEach(w => { const r = I.S.vocab[w.key]; if (!r) cnt[0]++; else if (r.box <= 2) cnt[1]++; else if (r.box <= 4) cnt[2]++; else cnt[3]++; });
      $('#vprog').innerHTML = `جديدة <b>${cnt[0]}</b> · قيد التعلم <b>${cnt[1]}</b> · مراجعة <b>${cnt[2]}</b> · متقنة <b>${cnt[3]}</b>`;
      const w = queue[0];
      if (!w) { $('#vcard').innerHTML = '<p class="ok">انتهت جلسة اليوم لهذه المجموعة. عد غدًا للمراجعة، أو غيّر المجموعة أو أضف كلمات جديدة.</p>'; return; }
      $('#vcard').innerHTML = `<p class="muted">متبقي في الجلسة: ${queue.length}</p>
        <div class="en big">${esc(w.en)} <small class="muted">${esc(w.pos)}</small></div>
        <div class="row"><button id="say">🔊 نطق</button>${shown ? '' : '<button class="primary" id="rev">إظهار المعنى</button>'}</div>
        ${shown ? `<p class="big">${esc(w.ar)}</p><p class="en muted">${esc(w.ex)}</p><div class="row"><button id="no" class="danger">لم أعرفها</button><button id="yes" class="primary">عرفتها</button></div>` : ''}`;
      $('#say').onclick = () => I.tts.say(w.en + (w.ex ? '. ' + w.ex : ''));
      if (!shown) $('#rev').onclick = () => { shown = true; draw(); }; else { $('#yes').onclick = () => answer(true); $('#no').onclick = () => answer(false); }
    };
    const answer = ok => {
      const w = queue.shift(), t = I.dayIdx();
      let r = I.S.vocab[w.key];
      if (!r) { r = I.S.vocab[w.key] = { box: 0, due: t }; if (I.S.newToday.day !== t) I.S.newToday = { day: t, n: 0 }; I.S.newToday.n++; }
      if (ok && !failed.has(w.key)) { r.box = Math.min(5, r.box + 1); r.due = t + INT[r.box]; }
      else if (ok) { r.box = 1; r.due = t + 1; }
      else { failed.add(w.key); r.box = 1; r.due = t; queue.push(w); }
      I.mark(); shown = false; draw();
    };
    $('#view').innerHTML = `<div class="card"><h2>Vocabulary — تكرار متباعد (Leitner)</h2>
      <div class="row"><select id="deck">${Object.entries(D).map(([k, d]) => `<option value="${k}" ${k === I.S.deckSel ? 'selected' : ''}>${esc(d.name)} (${d.words.length})</option>`).join('')}<option value="all" ${I.S.deckSel === 'all' ? 'selected' : ''}>الكل</option></select><button id="more">+10 كلمات جديدة اليوم</button></div>
      <p class="muted" id="vprog"></p><div id="vcard" class="q"></div>
      <p class="muted">الكلمة التي تعرفها تتباعد مراجعتها (1 ← 3 ← 7 ← 14 ← 30 يومًا). الخطأ يعيدها للصندوق الأول. الحد الافتراضي للكلمات الجديدة: ${NEW_PER_DAY} يوميًا. المفردات المختارة يدويًا لمستوى Academic وليست قائمة رسمية.</p></div>
      <div class="card"><h2>أضف كلمة من قراءاتك</h2><div class="row"><input class="grow en" id="ne" placeholder="English word / phrase"><input class="grow" id="na" placeholder="المعنى بالعربية"></div>
      <div class="row"><input class="grow en" id="nx" placeholder="Example sentence (optional)"><button id="add" class="primary">إضافة</button></div></div>`;
    $('#deck').onchange = e => { I.S.deckSel = e.target.value; I.save(); render(); };
    $('#more').onclick = () => { if (I.S.newToday.day === I.dayIdx()) I.S.newToday.n = Math.max(0, I.S.newToday.n - 10); I.save(); build(); shown = false; draw(); };
    $('#add').onclick = () => {
      const en = $('#ne').value.trim(), ar = $('#na').value.trim();
      if (!en || !ar) return;
      if (I.S.custom.some(c => c.en.toLowerCase() === en.toLowerCase())) return I.toast('الكلمة موجودة');
      I.S.custom.push({ en, ar, ex: $('#nx').value.trim() }); I.S.deckSel = 'mine'; I.save(); render();
    };
    build(); draw();
  }
  I.register('vocab', 'Vocabulary', render);
})();

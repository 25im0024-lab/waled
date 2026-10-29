/* English Hub — mistakes notebook. Every wrong answer in any quiz is saved (with enough data to replay it) and comes back
   for review on a spaced schedule: right answers move an item up a box (back after 1 day, then 3 days); the third correct review retires it. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc } = E;
  const INT = [1, 3], RETIRE = 3, MAX = 300, SKIP = new Set(['speak']);

  const key = it => it.t + '|' + String(it.q || it.say || it.target || (it.words && it.words.join(' ')) || (it.pairs && it.pairs.map(p => p[0]).join(',')) || '') + '|' + String(Array.isArray(it.a) ? it.a[0] : it.a);
  const today = () => E.dayIdx();
  const store = () => E.S.wrong;

  const nb = E.nb = {
    key,
    add(it, src) {
      if (!it || SKIP.has(it.t)) return;
      const k = key(it), W = store();
      if (W[k]) { W[k].box = 0; W[k].due = today(); W[k].n = (W[k].n || 1) + 1; }
      else {
        W[k] = { item: JSON.parse(JSON.stringify(it)), src: src || '', box: 0, due: today(), at: Date.now(), n: 1 };
        const ks = Object.keys(W); if (ks.length > MAX) ks.sort((a, b) => W[a].at - W[b].at).slice(0, ks.length - MAX).forEach(x => delete W[x]);
      }
      E.save();
    },
    all: () => Object.entries(store()).map(([k, v]) => ({ k, ...v })),
    due: () => nb.all().filter(x => x.due <= today()),
    count: () => Object.keys(store()).length,
    /** ok → next box (retired after the last); wrong → back to box 0 and due tomorrow. */
    answer(k, ok) {
      const r = store()[k]; if (!r) return;
      if (ok) { r.box++; if (r.box >= RETIRE) delete store()[k]; else r.due = today() + INT[r.box - 1]; }
      else { r.box = 0; r.due = today() + 1; }
      E.save();
    },
    remove(k) { delete store()[k]; E.save(); },
    clear() { E.S.wrong = {}; E.save(); },
    /** Review session over a list of notebook rows. */
    review(root, rows, back) {
      if (!rows.length) { E.toast('لا توجد أخطاء مستحقّة للمراجعة 🎉'); return back && back(); }
      E.quiz.run({ root, items: rows.slice(0, 15).map(r => r.item), shuffle: true, title: 'مراجعة الأخطاء · Mistakes review', track: false, onAnswer: (it, ok) => nb.answer(key(it), ok), onExit: back });
    }
  };
})();

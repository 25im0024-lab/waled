/* Progress — per-skill completion for a level, 14-day activity, and an honest "I can…" checklist. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc } = E;
  let lv = null;

  const ok = id => ((E.S.done[id] || {}).best || 0) >= 70;
  function stats(level) {
    const inLv = x => x.level === level;
    const topics = E.mod.words.topics.filter(t => inLv(t) && t.id !== 'mine'), wTot = topics.reduce((a, t) => a + t.words.length, 0), wLearn = topics.reduce((a, t) => a + t.words.filter(w => E.S.vocab[t.id + ':' + w[0]]).length, 0);
    const cnt = (list, pre) => { const l = list.filter(inLv); return [l.filter(x => ok(pre + x.id)).length, l.length]; };
    const rows = [
      ['📚', 'الكلمات · Words', wLearn, wTot, 'words'],
      ['🧩', 'القواعد · Grammar', ...cnt(E.mod.grammar.lessons, 'g:'), 'grammar'],
      ['📖', 'القراءة · Reading', ...cnt(E.mod.reading.texts, 'r:'), 'reading'],
      ['🎧', 'الاستماع · Listening', ...cnt(E.mod.listening.dialogues, 'l:'), 'listening'],
      ['✍️', 'الكتابة · Writing', ...cnt(E.mod.writing.tasks, 'wr:'), 'writing'],
      ['🎙️', 'التحدّث · Speaking', ...cnt(E.mod.speaking.tasks, 'sp:'), 'speaking'],
      ['💼', 'العمل · Work', ...cnt(E.mod.work.units, 'w:'), 'work']
    ];
    return rows.filter(r => r[3] > 0);
  }

  function render() {
    lv = lv || E.S.level; E.S.cando = E.S.cando || {};
    const rows = stats(lv), items = E.data.cando[lv], ticked = items.filter((_, i) => E.S.cando[lv + i]).length;
    const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push([d.getDate(), E.S.days[E.dayKey(d)] || 0]); }
    const max = Math.max(30, ...days.map(d => d[1])), active = Object.keys(E.S.days).filter(k => E.S.days[k] > 0).length;
    const soundsDone = E.data.sounds.cards.filter(c => ok('snd:' + c.id)).length, rp = Object.keys(E.S.done).filter(k => k.startsWith('rp:')).length, recs = (E.S.speak || {}).n || 0;
    $('#view').innerHTML = `<div class="card"><h2>📊 تقدّمي · My progress</h2>
      <div class="levels">${E.LEVELS.map(l => `<button data-lv="${l}" class="${l} ${lv === l ? 'on' : ''}"><b>${l}</b> <small>${E.LEVEL_AR[l]}</small></button>`).join('')}</div>
      <div class="row"><span class="chip">⭐ ${E.S.xp} XP</span><span class="chip">🔥 ${E.streak()} يوم متتالٍ</span><span class="chip">📅 ${active} يومًا نشطًا</span></div></div>
      <div class="card"><h3>إتمام المحتوى في ${lv}</h3><p class="muted">الدرس/النص يُحسب بعد نتيجة 70% فأكثر، والكلمة بعد أن تتعلّمها في البطاقات.</p>
      ${rows.map(r => `<div class="ex-item" style="margin:6px 0;flex-wrap:wrap"><span>${r[0]} ${r[1]}</span><span class="muted" dir="ltr">${r[2]} / ${r[3]}</span><div class="bar" style="flex-basis:100%"><i style="width:${r[3] ? 100 * r[2] / r[3] : 0}%"></i></div></div>`).join('')}
      <p class="muted">النطق: ${soundsDone}/${E.data.sounds.cards.length} أصوات · محادثات بأدوار: ${rp} · تسجيلات: ${recs}</p></div>
      <div class="card"><h3>آخر 14 يومًا (XP)</h3><div style="display:flex;gap:4px;align-items:flex-end;height:90px;direction:ltr" role="img" aria-label="XP per day, last 14 days">${days.map(d => `<div style="flex:1;text-align:center"><div title="${d[1]} XP" style="background:var(--primary);opacity:${d[1] ? 1 : .15};height:${Math.max(3, Math.round(70 * d[1] / max))}px;border-radius:4px 4px 0 0"></div><small class="muted" style="font-size:.65rem">${d[0]}</small></div>`).join('')}</div></div>
      <div class="card"><h3>✅ ماذا أستطيع أن أفعل؟ · I can… <span class="muted"><bdi dir="ltr">(${ticked}/${items.length})</bdi></span></h3>
      <p class="muted">علّم فقط ما تستطيع فعله فعلًا دون مساعدة. هذا تقييم ذاتي وليس اختبارًا.</p>
      <div class="ex-list">${items.map((it, i) => `<label class="ex-item" style="cursor:pointer;gap:12px"><input type="checkbox" data-c="${i}" ${E.S.cando[lv + i] ? 'checked' : ''}><span style="flex:1"><b class="en" dir="ltr">${esc(it[1])}</b><br><small class="ar muted">${esc(it[2])}</small></span><span class="tag">${esc(it[0])}</span></label>`).join('')}</div>
      ${ticked === items.length && lv !== 'B1' ? `<p class="fb good">🎉 أكملت قائمة ${lv}. جرّب مستوى ${E.LEVELS[E.LEVELS.indexOf(lv) + 1]} (من الرئيسية).</p>` : ''}</div>`;
    $$('#view [data-lv]').forEach(b => b.onclick = () => { lv = b.dataset.lv; render(); });
    $$('#view [data-c]').forEach(b => b.onchange = () => { E.S.cando[lv + b.dataset.c] = b.checked; E.save(); render(); });
  }
  E.register('progress', 'تقدّمي', '📊', render, 120);
})();

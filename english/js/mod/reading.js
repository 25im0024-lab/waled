/* Reading — graded texts with tap-a-word and tap-a-sentence translation, read-aloud with highlighting, comprehension quiz. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc } = E;
  const texts = E.data.reading.texts;
  let filter = null;

  /* ----- word lookup: text glossary → topic vocabulary → common words, with simple inflection handling ----- */
  const IRR = { went: 'go', gone: 'go', saw: 'see', seen: 'see', ate: 'eat', eaten: 'eat', bought: 'buy', took: 'take', taken: 'take', came: 'come', made: 'make', wrote: 'write', written: 'write', drank: 'drink', gave: 'give', given: 'give', knew: 'know', known: 'know', told: 'tell', said: 'say', left: 'leave', met: 'meet', slept: 'sleep', paid: 'pay', felt: 'feel', began: 'begin', ran: 'run', children: 'child', men: 'man', women: 'woman', people: 'person', better: 'good', best: 'good', worse: 'bad', worst: 'bad' };
  function lookup(raw, gloss) {
    const w = raw.toLowerCase().replace(/[^a-z' ]/g, '').replace(/'s$/, '');
    const dict = k => (gloss && gloss[k]) || E.data.vocab.lex[k] || E.data.common[k];
    const cands = [w, IRR[w], w.replace(/s$/, ''), w.replace(/es$/, ''), w.replace(/ies$/, 'y'), w.replace(/ed$/, ''), w.replace(/ed$/, 'e'), w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/(.)\1ing$/, '$1'), w.replace(/(.)\1ed$/, '$1'), w.replace(/ly$/, ''), w.replace(/er$/, ''), w.replace(/est$/, '')].filter(Boolean);
    for (const c of cands) { const d = dict(c); if (d) return { en: raw, base: c, ar: d }; }
    return null;
  }

  function landing() {
    filter = filter || E.S.level;
    const list = texts.filter(t => filter === 'ALL' || t.level === filter);
    $('#view').innerHTML = `<div class="card"><h2>📖 القراءة · Reading</h2><p class="muted">نصوص متدرّجة. اضغط على أي <b>كلمة</b> لمعناها، وعلى أي <b>جملة</b> لترجمتها. ثم أجب عن أسئلة الفهم.</p>
      <div class="levels">${['A1', 'A2', 'B1', 'ALL'].map(l => `<button data-lv="${l}" class="${l} ${filter === l ? 'on' : ''}">${l === 'ALL' ? 'الكل · All' : `<b>${l}</b><br><small>${E.LEVEL_AR[l]}</small>`}</button>`).join('')}</div></div>
      <div class="tiles">${list.map(t => { const d = E.S.done['r:' + t.id]; return `<button class="tile" data-id="${t.id}"><span class="ic">${t.icon}</span><b>${esc(t.title[0])}</b><span class="ar muted">${esc(t.title[1])}</span><span class="tag lv ${t.level}">${t.level}</span><small>${d ? (d.best >= 70 ? '✅ ' : '') + d.best + '%' : t.sentences.length + ' جمل'}</small></button>`; }).join('')}</div>`;
    $$('#view [data-lv]').forEach(b => b.onclick = () => { filter = b.dataset.lv; landing(); });
    $$('#view [data-id]').forEach(b => b.onclick = () => read(texts.find(t => t.id === b.dataset.id)));
  }

  function read(t) {
    let allAr = false, ctl = null;
    const draw = () => {
      $('#view').innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><button class="sm" data-back>‹ النصوص · Texts</button><span class="tag lv ${t.level}">${t.level}</span></div>
        <h2>${t.icon} ${esc(t.title[0])} <span class="ar muted" style="font-size:.95rem">${esc(t.title[1])}</span></h2>
        <div class="row"><button class="primary" data-play>🔊 استمع للنص · Listen</button><button data-slow>🐢 بطيء · Slow</button><button data-stop>⏹</button><label class="muted"><input type="checkbox" data-ar ${allAr ? 'checked' : ''}> أظهر كل الترجمة · Show all translation</label></div>
        <div class="text-en" id="txt">${t.sentences.map((s, i) => `<span class="sentwrap"><span class="sent" data-i="${i}">${s[0].split(/(\s+)/).map(w => /\S/.test(w) ? `<span class="w">${esc(w)}</span>` : w).join('')}</span><span class="sent-ar" ${allAr ? '' : 'hidden'} data-ar="${i}">${esc(s[1])}</span> </span>`).join('')}</div></div>
        <div class="card" style="text-align:center"><h2>🎯 أسئلة الفهم · Comprehension</h2><button class="primary big" data-quiz>ابدأ · Start</button></div>`;
      $('[data-back]').onclick = () => { if (ctl) ctl.stop(); landing(); };
      $('[data-ar]').onchange = e => { allAr = e.target.checked; $$('.sent-ar').forEach(x => x.hidden = !allAr); };
      const play = slow => { if (ctl) ctl.stop(); ctl = E.tts.play(t.sentences.map(s => ({ s: 'A', t: s[0] })), { cast: E.tts.cast({ A: { g: 'f' } }), slow, gap: 350, onLine: i => { $$('.sent').forEach(x => x.classList.toggle('on', +x.dataset.i === i)); }, onEnd: () => $$('.sent').forEach(x => x.classList.remove('on')) }); };
      $('[data-play]').onclick = () => play(false); $('[data-slow]').onclick = () => play(true); $('[data-stop]').onclick = () => { if (ctl) ctl.stop(); $$('.sent').forEach(x => x.classList.remove('on')); };
      $('#txt').onclick = e => {
        const w = e.target.closest('.w'), s = e.target.closest('.sent');
        if (w) { e.stopPropagation(); return word(w, t); }
        if (s) { const ar = $(`.sent-ar[data-ar="${s.dataset.i}"]`); ar.hidden = !ar.hidden; E.say(t.sentences[+s.dataset.i][0]); }
      };
      $('[data-quiz]').onclick = () => {
        if (ctl) ctl.stop();
        const items = t.qs.map(q => q.t === 'mc' ? { t: 'mc', q: q.q, ar: q.ar, opts: q.opts, a: q.a } : q.t === 'tf' ? { t: 'tf', q: q.q, ar: q.ar, a: q.a } : { t: 'fill', q: q.q, ar: q.ar, a: q.a, hint: 'من النص · from the text' });
        E.quiz.run({ root: $('#view'), items, shuffle: false, title: t.title[0], id: 'r:' + t.id, onExit: () => read(t) });
      };
    };
    draw();
  }

  /* ----- word popup ----- */
  function word(el, t) {
    const raw = el.textContent.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, ''), r = lookup(raw, t.gloss), pop = $('#wordpop');
    const rect = el.getBoundingClientRect();
    pop.innerHTML = `<div class="en" style="font-size:1.3rem;font-weight:800;text-align:center">${esc(raw)} ${E.sayBtn(raw)}</div>` + (r ? `<div class="ar" style="text-align:center;font-size:1.2rem;color:var(--primary)">${esc(r.ar)}</div>${r.base.toLowerCase() !== raw.toLowerCase() ? `<div class="muted" style="text-align:center">(${esc(r.base)})</div>` : ''}` : `<div class="ar muted" style="text-align:center">لا يوجد معنى محفوظ لهذه الكلمة. اضغط على الجملة لترجمتها.</div>`) +
      `<div class="row" style="justify-content:center"><button class="sm" data-save>⭐ أضف إلى كلماتي</button><button class="sm" data-close>✕</button></div>`;
    pop.style.display = 'block';
    const x = Math.min(window.innerWidth - 270, Math.max(8, rect.left + rect.width / 2 - 130)), y = rect.bottom + 8;
    pop.style.left = x + 'px'; pop.style.top = Math.min(window.innerHeight - 170, y) + 'px';
    E.say(raw);
    $('[data-close]', pop).onclick = () => { pop.style.display = 'none'; };
    $('[data-save]', pop).onclick = () => {
      const ar = r ? r.ar : prompt('اكتب معنى الكلمة بالعربية · Arabic meaning'); if (!ar) return;
      if (!E.S.custom.some(c => c.en.toLowerCase() === raw.toLowerCase())) { E.S.custom.push({ en: raw.toLowerCase(), ar, ex: '' }); E.save(); E.toast('أُضيفت إلى «كلماتي» ⭐'); }
      else E.toast('موجودة مسبقًا');
      pop.style.display = 'none';
    };
  }
  document.addEventListener('click', e => { const pop = $('#wordpop'); if (pop && pop.style.display === 'block' && !e.target.closest('#wordpop') && !e.target.closest('.w')) pop.style.display = 'none'; });

  E.mod.reading = { texts, lookup };
  E.register('reading', 'القراءة', '📖', landing, 50);
})();

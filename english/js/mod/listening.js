/* Listening — dialogues with different voices, hide-the-text mode, comprehension quiz, speaking role-play, dictation. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc, shuffle } = E;
  const data = E.data.listening;
  let filter = null;

  function landing() {
    filter = filter || E.S.level;
    const list = data.dialogues.filter(d => filter === 'ALL' || d.level === filter);
    $('#view').innerHTML = `<div class="card"><h2>🎧 الاستماع · Listening</h2><p class="muted">استمع أولًا والنصّ مخفيّ، ثم أجب، ثم اقرأ النصّ، ثم تدرّب على التحدث بدور من الحوار.</p>
      <div class="levels">${['A1', 'A2', 'B1', 'ALL'].map(l => `<button data-lv="${l}" class="${l} ${filter === l ? 'on' : ''}">${l === 'ALL' ? 'الكل · All' : `<b>${l}</b><br><small>${E.LEVEL_AR[l]}</small>`}</button>`).join('')}</div>
      <div class="row"><button class="big" data-dict>✍️ إملاء · Dictation</button><button class="big" data-pic>🖼️ استمع واختر الصورة</button></div></div>
      <div class="tiles">${list.map(d => { const x = E.S.done['l:' + d.id]; return `<button class="tile" data-id="${d.id}"><span class="ic">${d.icon}</span><b>${esc(d.title[0])}</b><span class="ar muted">${esc(d.title[1])}</span><span class="tag lv ${d.level}">${d.level}</span><small>${x ? (x.best >= 70 ? '✅ ' : '') + x.best + '%' : d.lines.length + ' جمل'}</small></button>`; }).join('')}</div>`;
    $$('#view [data-lv]').forEach(b => b.onclick = () => { filter = b.dataset.lv; landing(); });
    $$('#view [data-id]').forEach(b => b.onclick = () => dialogue(data.dialogues.find(d => d.id === b.dataset.id)));
    $('[data-dict]').onclick = () => { const lv = filter === 'ALL' ? E.S.level : filter; E.quiz.run({ root: $('#view'), items: shuffle(data.dictation[lv]).slice(0, 6).map(s => ({ t: 'dictate', say: s, review: s, shown: s })), title: `Dictation ${lv}`, id: 'dict:' + lv, onExit: landing }); };
    $('[data-pic]').onclick = () => { const lv = filter === 'ALL' ? null : filter; const pool = E.mod.words.all.filter(x => !lv || x.t.level === lv); E.mod.words.quiz(null, 'listen', shuffle(pool).slice(0, 10), landing); };
  }

  function dialogue(d) {
    let ctl = null, hidden = true, ar = false;
    const draw = () => {
      $('#view').innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><button class="sm" data-back>‹ الحوارات · Dialogues</button><span class="tag lv ${d.level}">${d.level}</span></div>
        <h2>${d.icon} ${esc(d.title[0])} <span class="ar muted" style="font-size:.95rem">${esc(d.title[1])}</span></h2>
        <div class="row"><button class="primary big" data-play>▶ استمع · Play</button><button data-slow>🐢 بطيء · Slow</button><button data-stop>⏹ إيقاف</button></div>
        <div class="row"><label class="muted"><input type="checkbox" data-en ${hidden ? '' : 'checked'}> أظهر النص الإنجليزي · Show English</label><label class="muted"><input type="checkbox" data-ar ${ar ? 'checked' : ''}> أظهر الترجمة · Show Arabic</label></div>
        <div id="chat" class="${hidden ? 'hide-en' : ''} ${ar ? '' : 'hide-ar'}">${E.dlg.bubbles(d)}</div></div>
        <div class="card" style="text-align:center"><div class="row" style="justify-content:center"><button class="primary big" data-quiz>🎯 أسئلة الفهم · Questions</button><button class="big" data-rp>🎭 تدرّب: أنت تتكلّم</button></div>
        <p class="muted">في التدريب تتكلّم أنت دورًا والتطبيق يتكلّم الدور الآخر. يحتاج ميكروفون ومتصفح يدعم التعرّف على الكلام (Chrome أو Edge).</p></div>`;
      $('[data-back]').onclick = () => { if (ctl) ctl.stop(); landing(); };
      const mark = i => $$('.bubble').forEach(b => b.classList.toggle('cur', +b.dataset.line === i));
      const go = slow => { if (ctl) ctl.stop(); ctl = E.dlg.play(d, { slow, onLine: mark, onEnd: () => { mark(-1); if (hidden) E.toast('انتهى الحوار — اضغط «أظهر النص» لتقرأه'); } }); };
      $('[data-play]').onclick = () => go(false); $('[data-slow]').onclick = () => go(true); $('[data-stop]').onclick = () => { if (ctl) ctl.stop(); mark(-1); };
      $('[data-en]').onchange = e => { hidden = !e.target.checked; $('#chat').classList.toggle('hide-en', hidden); };
      $('[data-ar]').onchange = e => { ar = e.target.checked; $('#chat').classList.toggle('hide-ar', !ar); };
      $$('.bubble').forEach(b => b.onclick = () => { const l = d.lines[+b.dataset.line]; if (ctl) ctl.stop(); ctl = E.tts.play([{ s: l[0], t: l[1] }], { cast: E.dlg.cast(d) }); });
      $('[data-quiz]').onclick = () => { if (ctl) ctl.stop(); E.quiz.run({ root: $('#view'), items: d.qs.map(q => ({ ...q, a: q.a, keep: false })), title: d.title[0], id: 'l:' + d.id, onExit: () => dialogue(d) }); };
      $('[data-rp]').onclick = () => { if (ctl) ctl.stop(); const roles = Object.keys(d.speakers); E.dlg.roleplay($('#view'), d, roles[1] || roles[0], () => dialogue(d)); };
    };
    draw();
  }

  E.mod.listening = {};
  E.register('listening', 'الاستماع', '🎧', landing, 60);
})();

/* Home — level, daily goal, tiles for every module, settings and backup. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc } = E;

  function levelProgress(l) {
    const vt = E.data.vocab.topics.filter(t => t.level === l), words = vt.reduce((a, t) => a + t.words.length, 0), learned = vt.reduce((a, t) => a + t.words.filter(w => E.S.vocab[t.id + ':' + w[0]]).length, 0);
    const gl = ((E.data.grammar || {}).lessons || []).filter(x => x.level === l), gd = gl.filter(x => E.S.done['g:' + x.id]).length;
    return { words, learned, gl: gl.length, gd };
  }

  function render() {
    const S = E.S, due = E.srs.due(E.mod.words ? E.mod.words.all.map(x => x.key) : []).length, goalPct = Math.min(100, Math.round(100 * E.todayXp() / S.goal));
    const tiles = [
      ['words', '📚', 'Words', 'الكلمات'], ['scenes', '🖼️', 'Picture scenes', 'مشاهد مصوّرة'], ['grammar', '🧩', 'Grammar', 'القواعد'], ['reading', '📖', 'Reading', 'القراءة'],
      ['listening', '🎧', 'Listening', 'الاستماع'], ['writing', '✍️', 'Writing', 'الكتابة'], ['sounds', '🗣️', 'Sounds', 'النطق'], ['expressions', '💬', 'Expressions', 'تعابير وأفعال'], ['work', '💼', 'English for Work', 'الإنجليزية في العمل']
    ];
    $('#view').innerHTML = `
    <div class="card"><div class="hello"><div style="font-size:3rem">👋</div><div style="flex:1"><h2 style="margin:0">أهلًا! Welcome</h2><div class="muted">اختر مستواك وابدأ. كل شيء بالعربية والإنجليزية.</div></div></div>
      <h3>مستواك · Your level</h3>
      <div class="levels">${E.LEVELS.map(l => { const p = levelProgress(l); return `<button data-lv="${l}" class="${l} ${S.level === l ? 'on' : ''}"><b>${l}</b> <small>${E.LEVEL_AR[l]}</small><div class="bar" style="margin-top:6px"><i style="width:${p.words ? 100 * p.learned / p.words : 0}%"></i></div><small>${p.learned}/${p.words} كلمة</small></button>`; }).join('')}</div>
      ${S.placed ? `<p class="muted">نتيجة اختبار تحديد المستوى: <b>${esc(S.placed.level)}</b> (${esc(S.placed.date)})</p>` : ''}
      <div class="row"><button class="primary" data-go="placement">🧪 اختبار تحديد المستوى (5 دقائق)</button>${due ? `<button class="good" data-go="words">🔁 لديك ${due} كلمات للمراجعة</button>` : ''}</div></div>
    <div class="card"><h2>🎯 هدف اليوم · Daily goal</h2><div class="bar good"><i style="width:${goalPct}%"></i></div><p class="muted">${E.todayXp()} / ${S.goal} XP · 🔥 ${E.streak()} يوم متتالٍ</p></div>
    <div class="tiles">${tiles.map(([id, ic, en, ar]) => `<button class="tile ${id === 'work' ? 'work' : ''}" data-go="${id}"><span class="ic">${ic}</span><b>${en}</b><small class="ar">${ar}</small></button>`).join('')}</div>
    <div class="card" style="margin-top:14px"><h2>⚙️ الإعدادات · Settings</h2>
      <div class="grid2">
        <label>الترجمة العربية<br><select id="s-hints"><option value="show" ${S.hints === 'show' ? 'selected' : ''}>ظاهرة دائمًا · Always show</option><option value="tap" ${S.hints === 'tap' ? 'selected' : ''}>مخفية حتى أضغط · Tap to reveal</option></select></label>
        <label>اللهجة · Accent<br><select id="s-acc"><option value="en-US" ${S.accent === 'en-US' ? 'selected' : ''}>American 🇺🇸</option><option value="en-GB" ${S.accent === 'en-GB' ? 'selected' : ''}>British 🇬🇧</option></select></label>
        <label>سرعة الصوت · Speed<br><select id="s-slow"><option value="0" ${!S.slow ? 'selected' : ''}>عادي · Normal</option><option value="1" ${S.slow ? 'selected' : ''}>بطيء · Slow 🐢</option></select></label>
        <label>هدف اليوم (XP)<br><select id="s-goal">${[15, 30, 50, 80].map(g => `<option ${S.goal === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
        <label><input type="checkbox" id="s-snd" ${S.sound ? 'checked' : ''}> أصوات التصحيح · Sound effects</label>
      </div>
      <div class="row"><button id="exp">⬇️ نسخة احتياطية · Export</button><label class="muted">استيراد: <input type="file" id="imp" accept=".json"></label><button class="bad" id="rst">مسح التقدّم · Reset</button></div>
      <p class="muted">التقدّم محفوظ في متصفحك فقط. صدّر نسخة احتياطية من وقت لآخر.${S.lastExport ? '' : ' (لم تُصدّر نسخة بعد)'}</p></div>${E.ai ? E.ai.panel() : ''}`;
    if (E.ai) E.ai.bindPanel();
    $$('#view [data-go]').forEach(b => b.onclick = () => E.show(b.dataset.go));
    $$('#view [data-lv]').forEach(b => b.onclick = () => { S.level = b.dataset.lv; E.save(); render(); });
    const on = (id, fn) => $(id).onchange = e => { fn(e); E.save(); };
    on('#s-hints', e => { S.hints = e.target.value; }); on('#s-acc', e => { S.accent = e.target.value; E.tts.load(); }); on('#s-slow', e => { S.slow = e.target.value === '1'; });
    on('#s-goal', e => { S.goal = +e.target.value; render(); }); on('#s-snd', e => { S.sound = e.target.checked; });
    $('#exp').onclick = () => { S.lastExport = Date.now(); E.save(); E.download('english-hub-progress.json', JSON.stringify(S, null, 1)); };
    $('#imp').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { if (confirm('سيُستبدل تقدمك الحالي بالملف. متابعة؟')) { E.replaceState(JSON.parse(t)); render(); } } catch (err) { E.toast('ملف غير صالح'); } }); };
    $('#rst').onclick = () => { if (confirm('سيتم حذف كل التقدّم. متأكد؟')) { E.resetState(); render(); } };
  }
  E.mod.levelProgress = levelProgress;
  E.register('home', 'الرئيسية', '🏠', render, 10);
})();

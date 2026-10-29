/* Speaking — record yourself (MediaRecorder; nothing is uploaded or stored), listen back, compare with a model, self-check.
   Also a "listen, repeat, compare" drill. No scoring by software: honest self-assessment plus the model for comparison. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc, shuffle } = E;
  const D = E.data.speaking;
  let filter = null;
  const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  /** Minimal recorder: start() → stop() resolves a blob URL. */
  async function recorder() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }), chunks = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.start();
    return { stop: () => new Promise(res => { mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); res(URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }))); }; try { mr.stop(); } catch (e) { res(null); } }), cancel: () => { try { mr.stop(); } catch (e) { } stream.getTracks().forEach(t => t.stop()); } };
  }

  function landing() {
    filter = filter || E.S.level;
    const list = D.tasks.filter(t => filter === 'ALL' || t.level === filter);
    $('#view').innerHTML = `<div class="card"><h2>🎙️ التحدّث · Speaking</h2>
      <p class="muted">تتحدّث، وتسجّل صوتك، وتسمعه، وتقارنه بنموذج، ثم تقيّم نفسك بقائمة مختصرة. التسجيل يبقى في ذاكرة المتصفح فقط ولا يُرفع ولا يُحفظ، ويختفي عند مغادرة الصفحة. لا يوجد تقييم آلي للنطق هنا، وهذا مقصود: المقارنة والتقييم الذاتي أصدق من رقم غير دقيق.</p>
      ${canRecord() ? '' : '<p class="warn">⚠️ متصفحك لا يدعم التسجيل. ستعمل الموضوعات بالمؤقّت والتقييم الذاتي فقط. (التسجيل يحتاج https أو localhost.)</p>'}
      <div class="levels">${['A1', 'A2', 'B1', 'ALL'].map(l => `<button data-lv="${l}" class="${l} ${filter === l ? 'on' : ''}">${l === 'ALL' ? 'الكل' : `<b>${l}</b>`}</button>`).join('')}</div>
      <div class="row"><button class="big" data-drill>🔁 استمع وكرّر وقارن · Listen, repeat, compare</button></div></div>
      <div class="tiles">${list.map(t => { const x = E.S.done['sp:' + t.id]; return `<button class="tile" data-id="${t.id}"><span class="ic">${t.icon}</span><b>${esc(t.title[0])}</b><span class="ar muted" style="text-align:center">${esc(t.title[1])}</span><span class="tag lv ${t.level}">${t.level}</span><small>${x ? (x.best >= 75 ? '✅ ' : '') + x.best + '%' : t.seconds + ' ث'}</small></button>`; }).join('')}</div>`;
    $$('#view [data-lv]').forEach(b => b.onclick = () => { filter = b.dataset.lv; landing(); });
    $$('#view [data-id]').forEach(b => b.onclick = () => task(D.tasks.find(t => t.id === b.dataset.id)));
    $('[data-drill]').onclick = () => drill();
  }

  function task(t) {
    let rec = null, tick = null, url = null;
    const stop = () => { clearInterval(tick); if (rec) { rec.cancel(); rec = null; } };
    E.onLeave(() => { stop(); if (url) URL.revokeObjectURL(url); });
    const draw = (phase) => {
      $('#view').innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><button class="sm" data-back>‹ المواضيع</button><span class="tag lv ${t.level}">${t.level}</span></div>
        <h2>${t.icon} ${esc(t.title[0])} <span class="ar muted" style="font-size:.95rem">${esc(t.title[1])}</span></h2><p>${E.bi(t.prompt[0], t.prompt[1])}</p>
        <h3>عبارات تساعدك · Useful phrases</h3><div class="chips">${t.frames.map(f => `<button class="sm" data-say="${esc(f[0])}" title="${esc(f[1])}" dir="ltr">🔊 ${esc(f[0])}</button>`).join('')}</div></div>
        <div class="card" style="text-align:center"><p class="muted">خذ نصف دقيقة للتفكير، ثم تحدّث نحو ${t.seconds} ثانية.</p>
        <div class="meter" id="clock">${t.seconds}</div>
        <div class="row" style="justify-content:center">${phase === 'rec' ? '<button class="bad big" data-stop>⏹ إيقاف</button>' : '<button class="primary big" data-rec>🔴 ابدأ ' + (canRecord() ? 'التسجيل' : 'المؤقّت') + '</button>'}</div>
        ${phase === 'done' ? `<div id="after">${url ? `<p><b>🎧 سجّلك:</b></p><audio controls src="${url}" style="width:100%"></audio>` : ''}
          <div class="row" style="justify-content:center"><button data-model>👁️ النموذج · Model</button><button data-again>🔁 أعد المحاولة</button></div><div id="model"></div>
          <div class="card" style="text-align:start;background:var(--soft);box-shadow:none"><h3>قيّم نفسك بصدق · Self-check</h3>${D.checks.map((c, i) => `<label class="ex-item" style="cursor:pointer"><input type="checkbox" data-ck="${i}"><span style="flex:1"><span class="en" dir="ltr">${esc(c[0])}</span><br><small class="ar muted">${esc(c[1])}</small></span></label>`).join('')}
          <div class="row" style="justify-content:center"><button class="primary" data-save>تم · Done</button></div></div></div>` : ''}</div>`;
      $('[data-back]').onclick = () => { stop(); landing(); };
      const rb = $('[data-rec]'); if (rb) rb.onclick = start;
      const sb = $('[data-stop]'); if (sb) sb.onclick = finish;
      const mb = $('[data-model]'); if (mb) mb.onclick = () => { $('#model').innerHTML = `<div class="card" style="background:var(--soft);box-shadow:none;text-align:start"><p class="en" dir="ltr">${esc(t.model[0])}</p><p>${E.sayBtn(t.model[0])}</p><p class="ar muted">${esc(t.model[1])}</p><p class="muted">قارن: هل نبرتك وسرعتك قريبتان؟ لا تحفظ النموذج حرفيًا؛ استخدم أفكارك.</p></div>`; };
      const ab = $('[data-again]'); if (ab) ab.onclick = () => { if (url) URL.revokeObjectURL(url); url = null; draw(); };
      const sv = $('[data-save]'); if (sv) sv.onclick = () => { const n = $$('[data-ck]:checked').length, pct = Math.round(100 * n / D.checks.length); E.markDone('sp:' + t.id, pct); E.S.speak = { n: ((E.S.speak || {}).n || 0) + (url ? 1 : 0) }; E.xp(4 + n * 2); E.toast(`+${4 + n * 2} XP`); landing(); };
    };
    async function start() {
      let left = t.seconds;
      if (canRecord()) { try { rec = await recorder(); } catch (e) { E.toast('تعذّر الوصول إلى الميكروفون — اسمح به من إعدادات المتصفح'); return; } }
      draw('rec'); $('#clock').textContent = left;
      tick = setInterval(() => { left--; const c = $('#clock'); if (c) c.textContent = Math.max(left, 0); if (left <= -15) finish(); }, 1000);
    }
    async function finish() { clearInterval(tick); if (rec) { url = await rec.stop(); rec = null; } draw('done'); }
    draw();
  }

  /* Listen → repeat → hear yourself next to the model. */
  function drill() {
    const sents = shuffle(D.tasks.flatMap(t => t.model[0].split(/(?<=[.!?])\s+/).map(s => [s, t.level]))).filter(x => x[1] === (filter === 'ALL' ? E.S.level : filter) && x[0].length < 120).slice(0, 8);
    let i = 0, url = null, rec = null;
    E.onLeave(() => { if (rec) rec.cancel(); if (url) URL.revokeObjectURL(url); });
    const draw = () => {
      if (i >= sents.length) { E.xp(5); E.toast('أحسنت! +5 XP'); return landing(); }
      const s = sents[i][0];
      $('#view').innerHTML = `<div class="card" style="text-align:center"><button class="sm" data-back>‹ خروج</button><p class="muted">${i + 1} / ${sents.length}</p>
        <p class="sent en" dir="ltr" style="font-size:1.3rem">${esc(s)}</p>
        <div class="row" style="justify-content:center">${E.sayBtn(s, 'big')}<button class="sm" data-slow>🐢 بطيء</button>${canRecord() ? '<button class="primary big" data-rec>🔴 سجّل</button>' : ''}<button class="primary" data-next>التالي ›</button></div>
        <div id="out"></div><p class="muted">١) استمع ٢) سجّل نفسك ٣) استمع لتسجيلك ثم للنموذج وقارن النبر والإيقاع.</p></div>`;
      $('[data-back]').onclick = () => { if (rec) rec.cancel(); landing(); };
      $('[data-slow]').onclick = () => E.say(s, { slow: true });
      $('[data-next]').onclick = () => { if (rec) { rec.cancel(); rec = null; } i++; draw(); };
      const r = $('[data-rec]'); if (r) r.onclick = async () => {
        if (rec) { url = await rec.stop(); rec = null; $('#out').innerHTML = `<audio controls src="${url}" style="width:100%"></audio><p>${E.sayBtn(s)} <span class="muted">النموذج</span></p>`; r.textContent = '🔴 سجّل مجددًا'; return; }
        try { rec = await recorder(); r.textContent = '⏹ إيقاف'; } catch (e) { E.toast('تعذّر الوصول إلى الميكروفون'); }
      };
    };
    draw();
  }

  E.mod.speaking = { tasks: D.tasks };
  E.register('speaking', 'التحدّث', '🎙️', landing, 75);
})();

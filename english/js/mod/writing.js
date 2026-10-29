/* Writing — guided tasks with local checks (no internet needed), an "is this sentence correct?" drill on common
   mistakes of Arabic speakers, and basic punctuation rules. Optional Claude feedback is added by ai.js. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc, shuffle } = E;
  const D = E.data.writing;
  let filter = null;

  const words = t => (t.match(/[A-Za-z'’-]+/g) || []).length;

  /** Local checker. Returns {items:[{ok,en,ar}], found:[error], score}. Pure function, also used by tests. */
  function check(task, text) {
    const items = [], wc = words(text);
    items.push({ ok: wc >= task.min, en: `At least ${task.min} words (you wrote ${wc})`, ar: `على الأقل ${task.min} كلمة (كتبتَ ${wc})` });
    const sents = text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => /[A-Za-z]/.test(s));
    const badCap = sents.filter(s => /^[a-z]/.test(s.replace(/^[^A-Za-z]+/, '')));
    items.push({ ok: sents.length > 0 && !badCap.length, en: 'Every sentence starts with a capital letter', ar: 'كل جملة تبدأ بحرف كبير', hint: badCap[0] ? `“${badCap[0].slice(0, 40)}…”` : '' });
    const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const noEnd = lines.filter(l => words(l) >= 5 && !/[.!?:,]$/.test(l));
    items.push({ ok: lines.length > 0 && !noEnd.length, en: 'Sentences end with . ? or !', ar: 'الجمل تنتهي بنقطة أو علامة استفهام أو تعجّب', hint: noEnd[0] ? `“…${noEnd[0].slice(-30)}”` : '' });
    items.push({ ok: !/(^|[\s(])i(\s|'|’|,|\.|$)/.test(text), en: 'The word "I" is always a capital letter', ar: 'الضمير I يُكتب دائمًا بحرف كبير' });
    task.need.forEach(n => items.push({ ok: new RegExp(n[0], n[1]).test(text), en: n[2], ar: n[3] }));
    const found = D.errors.filter(e => new RegExp(e.re, 'i').test(text));
    items.push({ ok: !found.length, en: 'No common mistakes found', ar: 'لا توجد أخطاء شائعة ظاهرة' });
    const score = Math.round(100 * items.filter(i => i.ok).length / items.length);
    return { items, found, score, wc };
  }

  function landing() {
    filter = filter || E.S.level;
    const list = D.tasks.filter(t => filter === 'ALL' || t.level === filter);
    $('#view').innerHTML = `<div class="card"><h2>✍️ الكتابة · Writing</h2>
      <p class="muted">مهام كتابة موجّهة: تقرأ التعليمات، تستعمل العبارات المساعدة، تكتب، ثم يفحص التطبيق نصّك فورًا (حروف كبيرة، علامات ترقيم، عدد الكلمات، البنية، وأخطاء شائعة عند الناطقين بالعربية). الفحص آليّ وتقريبي — لا يقيّم المعنى ولا الأسلوب.</p>
      <div class="levels">${['A1', 'A2', 'B1', 'ALL'].map(l => `<button data-lv="${l}" class="${l} ${filter === l ? 'on' : ''}">${l === 'ALL' ? 'الكل · All' : `<b>${l}</b><br><small>${E.LEVEL_AR[l]}</small>`}</button>`).join('')}</div>
      <div class="row"><button class="big" data-err>🔎 هل الجملة صحيحة؟ · Spot the mistake</button><button class="big" data-rules>📏 قواعد الكتابة · Writing rules</button></div></div>
      <div class="tiles">${list.map(t => { const x = E.S.done['wr:' + t.id]; return `<button class="tile" data-id="${t.id}"><span class="ic">${t.icon}</span><b>${esc(t.title[0])}</b><span class="ar muted" style="text-align:center">${esc(t.title[1])}</span><span class="tag lv ${t.level}">${t.level}</span>${t.work ? '<span class="tag">💼 work</span>' : ''}<small>${x ? (x.best >= 80 ? '✅ ' : '') + x.best + '%' : t.min + '+ كلمة'}</small></button>`; }).join('')}</div>`;
    $$('#view [data-lv]').forEach(b => b.onclick = () => { filter = b.dataset.lv; landing(); });
    $$('#view [data-id]').forEach(b => b.onclick = () => task(D.tasks.find(t => t.id === b.dataset.id)));
    $('[data-err]').onclick = () => errDrill();
    $('[data-rules]').onclick = () => rules();
  }

  function rules() {
    $('#view').innerHTML = `<div class="card"><button class="sm" data-back>‹ رجوع</button><h2>📏 قواعد الكتابة الأساسية · Basic writing rules</h2>
      <div class="ex-list">${D.lessons.map(l => `<div class="card" style="background:var(--soft);box-shadow:none"><p>${E.bi(l.en, l.ar)}</p><p class="en" dir="ltr" style="margin:.3rem 0"><span class="muted">❌</span> ${esc(l.ex[0])}<br><span class="muted">✅</span> <b>${esc(l.ex[1])}</b> ${E.sayBtn(l.ex[1])}</p></div>`).join('')}</div></div>`;
    $('[data-back]').onclick = landing;
  }

  function errDrill() {
    const pick = shuffle(D.errors).slice(0, 10), items = [];
    pick.forEach((e, n) => {
      const showRight = n % 3 === 2;
      items.push({ t: 'tf', q: showRight ? e.right : e.wrong, a: showRight, why: { en: `${e.en} ✅ ${e.right}`, ar: e.ar }, say: e.right, review: e.wrong, shown: e.right });
    });
    E.quiz.run({ root: $('#view'), items, shuffle: false, title: 'Is the sentence correct? هل الجملة صحيحة؟', id: 'wr:errors', onExit: landing, onDone: (p) => { if (p < 100) pick.forEach(e => remember(e)); } });
  }
  const remember = e => { const k = 'wr:' + e.wrong; if (!E.S.wrong[k]) { E.S.wrong[k] = { q: e.wrong, a: e.right, ar: e.ar, at: Date.now() }; E.save(); } };

  function task(t) {
    const saved = (E.S.writing || {})[t.id] || {};
    let showModel = false;
    $('#view').innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><button class="sm" data-back>‹ المهام · Tasks</button><span class="tag lv ${t.level}">${t.level}</span></div>
      <h2>${t.icon} ${esc(t.title[0])} <span class="ar muted" style="font-size:.95rem">${esc(t.title[1])}</span></h2>
      <p>${E.bi(t.prompt[0], t.prompt[1])}</p>
      <h3>عبارات تساعدك · Useful phrases <small class="muted">(اضغط لإضافتها)</small></h3>
      <div class="chips">${t.frames.map((f, i) => `<button class="sm" data-fr="${i}" title="${esc(f[1])}" dir="ltr">${esc(f[0])}</button>`).join('')}</div></div>
      <div class="card"><textarea id="wr" dir="ltr" rows="9" placeholder="Write here… اكتب هنا" style="width:100%;font-size:1.05rem;line-height:1.6;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink)">${esc(saved.text || '')}</textarea>
      <div class="row" style="justify-content:space-between"><span class="muted" dir="ltr"><span id="wc">0</span> / ${t.min}+ words</span><span class="muted" id="saved"></span></div>
      <div class="row"><button class="primary big" data-check>✅ افحص · Check</button><button data-model>👁️ نموذج إجابة · Model answer</button>${E.ai && E.ai.available && E.ai.available() ? '<button class="big" data-ai>🤖 ملاحظات من Claude (اختياري)</button>' : ''}</div>
      <div id="rep"></div></div>`;
    const ta = $('#wr'), upd = () => { $('#wc').textContent = words(ta.value); };
    upd(); let tm;
    ta.oninput = () => { upd(); clearTimeout(tm); tm = setTimeout(() => { E.S.writing = E.S.writing || {}; E.S.writing[t.id] = { ...(E.S.writing[t.id] || {}), text: ta.value, at: Date.now() }; E.save(); $('#saved').textContent = 'تم الحفظ ✓ saved'; }, 700); };
    $('[data-back]').onclick = landing;
    $$('#view [data-fr]').forEach(b => b.onclick = () => { const f = t.frames[+b.dataset.fr]; ta.value += (ta.value && !/\s$/.test(ta.value) ? ' ' : '') + f[0]; ta.focus(); upd(); ta.oninput(); E.say(f[0]); });
    $('[data-model]').onclick = () => { showModel = !showModel; $('#rep').insertAdjacentHTML('beforeend', ''); const m = $('#model'); if (m) m.remove(); if (showModel) $('#rep').insertAdjacentHTML('beforeend', `<div class="card" id="model" style="background:var(--soft);box-shadow:none"><h3>نموذج · Model answer</h3><p class="en" dir="ltr" style="white-space:pre-wrap">${esc(t.model[0])}</p><p>${E.sayBtn(t.model[0].replace(/\n/g, ' '))}</p><p class="ar muted" dir="rtl" style="white-space:pre-wrap">${esc(t.model[1])}</p><p class="muted">هذا نموذج واحد من عدة إجابات صحيحة — لا تنسخه، بل قارن البنية.</p></div>`); };
    $('[data-check]').onclick = () => {
      if (words(ta.value) < 3) return E.toast('اكتب شيئًا أولًا · Write something first');
      const r = check(t, ta.value);
      E.S.writing = E.S.writing || {}; E.S.writing[t.id] = { text: ta.value, at: Date.now(), score: r.score }; E.save();
      E.markDone('wr:' + t.id, r.score); E.xp(r.score >= 80 ? 8 : 3);
      r.found.forEach(remember);
      const m = $('#model'), keep = m ? m.outerHTML : '';
      $('#rep').innerHTML = `<div class="card" style="box-shadow:none;background:var(--soft)"><div class="meter">${r.score}%</div>
        <ul class="checks" style="list-style:none;padding:0">${r.items.map(i => `<li style="padding:4px 0">${i.ok ? '✅' : '⚠️'} <span class="en" dir="ltr">${esc(i.en)}</span> <span class="ar muted">· ${esc(i.ar)}</span>${!i.ok && i.hint ? `<br><small class="muted en" dir="ltr">${esc(i.hint)}</small>` : ''}</li>`).join('')}</ul>
        ${r.found.length ? `<h3>أخطاء شائعة وُجدت · Common mistakes found</h3>${r.found.map(e => `<div class="fb bad" style="margin:6px 0"><div class="en" dir="ltr">❌ ${esc(e.wrong)}<br>✅ <b>${esc(e.right)}</b></div><div>${E.bi(e.en, e.ar)}</div></div>`).join('')}` : ''}
        <p class="muted">الفحص آليّ ويبحث عن أنماط محددة؛ لا يفهم المعنى. اطلب من مدرّس أو من ميزة Claude الاختيارية مراجعة أعمق.</p></div>${keep}`;
      $('#rep').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    const ai = $('[data-ai]'); if (ai) ai.onclick = () => E.ai.feedback(t, ta.value, $('#rep'));
  }

  E.mod.writing = { check, tasks: D.tasks };
  E.register('writing', 'الكتابة', '✍️', landing, 70);
})();

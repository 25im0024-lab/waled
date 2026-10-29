/* English for Work (adults) — phrases with shadowing, workplace dialogues, role-play, "what would you say?" simulations, email model. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc, shuffle } = E;
  const D = E.data.work;
  let filter = 'ALL';

  const unitPct = u => { const x = E.S.done['w:' + u.id]; return x ? x.best : null; };

  function landing() {
    const list = D.units.filter(u => filter === 'ALL' || u.level === filter);
    const done = D.units.filter(u => (unitPct(u) || 0) >= 70).length;
    $('#view').innerHTML = `<div class="card"><h2>💼 إنجليزية العمل · English for Work</h2>
      <p class="muted">للبالغين والموظفين: عبارات جاهزة للاستخدام في الاجتماعات والمكالمات والرسائل والعروض، مع حوارات ومواقف تدرّبك على الكلام الفعلي. الهدف: أن تتكلّم بثقة في عملك.</p>
      <div class="levels">${['ALL', 'A2', 'B1'].map(l => `<button data-lv="${l}" class="${l === 'ALL' ? '' : l} ${filter === l ? 'on' : ''}">${l === 'ALL' ? 'الكل · All' : `<b>${l}</b><br><small>${E.LEVEL_AR[l]}</small>`}</button>`).join('')}</div>
      <div class="row"><span class="chip">${done} / ${D.units.length} ✅</span><button class="big" data-words>💼 مفردات العمل · Business words</button><button class="big" data-daily>🎲 عبارة اليوم · Phrase of the day</button><button class="big" data-print>🖨️ طباعة بطاقات العبارات</button></div></div>
      <div class="tiles">${list.map(u => { const p = unitPct(u); return `<button class="tile" data-id="${u.id}"><span class="ic">${u.icon}</span><b>${esc(u.title[0])}</b><span class="ar muted" style="text-align:center">${esc(u.title[1])}</span><span class="tag lv ${u.level}">${u.level}</span><small>${p != null ? (p >= 70 ? '✅ ' : '') + p + '%' : u.phrases.length + ' عبارات'}</small></button>`; }).join('')}</div>
      <div class="card"><p class="muted">💡 طريقة مقترحة لكل وحدة: ١) تعلّم العبارات وكرّرها بصوتك ٢) استمع للحوار ٣) تدرّب على دور من الحوار ٤) جرّب «ماذا تقول؟» ٥) استخدم العبارات في عملك الحقيقي هذا الأسبوع.</p></div>`;
    $$('#view [data-lv]').forEach(b => b.onclick = () => { filter = b.dataset.lv; landing(); });
    $$('#view [data-id]').forEach(b => b.onclick = () => unit(D.units.find(u => u.id === b.dataset.id), 'phrases'));
    $('[data-words]').onclick = () => { const t = E.mod.words.topics.find(x => x.id === 'work'); E.mod.words.session(t.words.map(w => ({ t, w, key: 'work:' + w[0] })), t.en, landing); };
    $('[data-daily]').onclick = () => daily();
    $('[data-print]').onclick = () => printCards(list);
  }

  /* ---------- printable phrase cards (opens a clean page; use the browser's Print) ---------- */
  function printCards(units) {
    const w = window.open('', '_blank');
    if (!w) return E.toast('اسمح للنوافذ المنبثقة ثم أعد المحاولة');
    const css = 'body{font-family:system-ui,Segoe UI,Tahoma,Arial,sans-serif;margin:16px;color:#111}h1{font-size:18px}h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #2563eb;padding-bottom:3px;break-after:avoid}table{width:100%;border-collapse:collapse;font-size:13px}td{border:1px solid #bbb;padding:5px 8px;vertical-align:top}td.en{direction:ltr;text-align:left;width:55%;font-weight:600}td.ar{direction:rtl;text-align:right}tr{break-inside:avoid}@media print{.np{display:none}}';
    w.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>English for Work — phrase cards</title><style>' + css + '</style></head><body><p class="np"><button onclick="print()">🖨️ Print / Save as PDF</button></p><h1>English for Work — Phrase cards · عبارات العمل</h1>' +
      units.map(u => '<h2>' + esc(u.title[0]) + ' · ' + esc(u.title[1]) + ' (' + u.level + ')</h2><table>' + u.phrases.map(p => '<tr><td class="en">' + esc(p[0]) + '</td><td class="ar">' + esc(p[1]) + '</td></tr>').join('') + '</table>').join('') + '</body></html>');
    w.document.close();
  }

  /* ---------- phrase of the day ---------- */
  function daily() {
    const all = D.units.flatMap(u => u.phrases.map(p => ({ p, u })));
    const n = Math.floor(Date.now() / 864e5) % all.length, { p, u } = all[n];
    $('#view').innerHTML = `<div class="card flash"><button class="sm" data-back>‹ رجوع</button><div class="pic">${u.icon}</div><div class="word" style="font-size:1.6rem">${esc(p[0])} ${E.sayBtn(p[0], 'big')}</div><div class="ar" style="font-size:1.3rem">${esc(p[1])}</div>${p[2] ? `<p class="muted en" dir="ltr">💡 ${esc(p[2])}</p>` : ''}
      <p class="muted">حاول أن تستخدم هذه العبارة اليوم مرة واحدة على الأقل: في رسالة، أو مكالمة، أو مع زميل.</p>
      <div class="row" style="justify-content:center"><button class="primary big" data-say-it>🎤 كرّرها · Say it</button></div><div data-res></div></div>`;
    $('[data-back]').onclick = landing; $('[data-say-it]').onclick = () => shadow(p[0], $('[data-res]'));
  }

  const shadow = (text, box) => E.dlg.shadow(text, box);

  /* ---------- unit page with sections ---------- */
  function unit(u, tab) {
    let ctl = null, hideEn = false, showAr = true;
    const stop = () => { if (ctl) { ctl.stop(); ctl = null; } };
    E.onLeave(stop);
    const tabs = [['phrases', '🗣️ العبارات'], ['dialogue', '💬 الحوار'], ['sim', '🎯 ماذا تقول؟']];
    if (u.email) tabs.push(['email', '✉️ نموذج رسالة']);
    const head = () => `<div class="card"><div class="row" style="justify-content:space-between"><button class="sm" data-back>‹ الوحدات · Units</button><span class="tag lv ${u.level}">${u.level}</span></div>
      <h2>${u.icon} ${esc(u.title[0])} <span class="ar muted" style="font-size:.95rem">${esc(u.title[1])}</span></h2><p class="muted">${E.bi(u.desc[0], u.desc[1])}</p>
      <div class="row">${tabs.map(t => `<button data-tab="${t[0]}" class="${t[0] === tab ? 'primary' : ''}">${t[1]}</button>`).join('')}</div></div>`;
    const bind = () => {
      $('[data-back]').onclick = () => { stop(); landing(); };
      $$('#view [data-tab]').forEach(b => b.onclick = () => { stop(); unit(u, b.dataset.tab); });
    };

    if (tab === 'phrases') {
      $('#view').innerHTML = head() + `<div class="card"><h3>العبارات الأساسية · Key phrases</h3><p class="muted">اضغط 🔊 للاستماع، ثم 🎤 لتكرّر العبارة بصوتك.</p>
        <div class="ex-list">${u.phrases.map((p, i) => `<div class="ex-item" style="flex-wrap:wrap"><span class="en" dir="ltr" style="flex:1;min-width:200px"><b>${esc(p[0])}</b>${p[2] ? `<br><small class="muted">💡 ${esc(p[2])}</small>` : ''}</span><span class="ar" style="text-align:end">${esc(p[1])}</span><span>${E.sayBtn(p[0])} <button class="say" data-sh="${i}" aria-label="كرّر / Repeat">🎤</button></span><div data-res="${i}" style="flex-basis:100%"></div></div>`).join('')}</div>
        <div class="row" style="margin-top:12px"><button class="primary" data-drill>🎯 اختبر العبارات · Phrase quiz</button></div></div>`;
      bind();
      $$('#view [data-sh]').forEach(b => b.onclick = () => shadow(u.phrases[+b.dataset.sh][0], $(`[data-res="${b.dataset.sh}"]`)));
      $('[data-drill]').onclick = () => E.quiz.run({ root: $('#view'), items: phraseQuiz(u), title: u.title[0], id: 'wp:' + u.id, shuffle: false, onExit: () => unit(u, 'phrases') });
    } else if (tab === 'dialogue') {
      const draw = () => {
        $('#view').innerHTML = head() + `<div class="card"><div class="row"><button class="primary big" data-play>▶ استمع · Play</button><button data-slow>🐢 بطيء</button><button data-stop>⏹</button></div>
          <div class="row"><label class="muted"><input type="checkbox" data-en ${hideEn ? '' : 'checked'}> أظهر الإنجليزية</label><label class="muted"><input type="checkbox" data-ar ${showAr ? 'checked' : ''}> أظهر الترجمة</label></div>
          <div id="chat" class="${hideEn ? 'hide-en' : ''} ${showAr ? '' : 'hide-ar'}">${E.dlg.bubbles(u.dialogue)}</div></div>
          <div class="card" style="text-align:center"><h3>🎭 تدرّب على الكلام · Role-play</h3><p class="muted">اختر الدور الذي ستتكلّمه أنت، والتطبيق يتكلّم الدور الآخر.</p>
          <div class="row" style="justify-content:center">${Object.keys(u.dialogue.speakers).map(k => `<button class="big" data-rp="${k}">${u.dialogue.speakers[k].av} ${esc(u.dialogue.speakers[k].name)}</button>`).join('')}</div></div>`;
        bind();
        const mark = i => $$('.bubble').forEach(b => b.classList.toggle('cur', +b.dataset.line === i));
        const go = slow => { stop(); ctl = E.dlg.play(u.dialogue, { slow, onLine: mark, onEnd: () => mark(-1) }); };
        $('[data-play]').onclick = () => go(false); $('[data-slow]').onclick = () => go(true); $('[data-stop]').onclick = () => { stop(); mark(-1); };
        $('[data-en]').onchange = e => { hideEn = !e.target.checked; $('#chat').classList.toggle('hide-en', hideEn); };
        $('[data-ar]').onchange = e => { showAr = e.target.checked; $('#chat').classList.toggle('hide-ar', !showAr); };
        $$('.bubble').forEach(b => b.onclick = () => { const l = u.dialogue.lines[+b.dataset.line]; stop(); ctl = E.tts.play([{ s: l[0], t: l[1] }], { cast: E.dlg.cast(u.dialogue) }); });
        $$('#view [data-rp]').forEach(b => b.onclick = () => { stop(); E.dlg.roleplay($('#view'), u.dialogue, b.dataset.rp, () => unit(u, 'dialogue')); });
      };
      draw();
    } else if (tab === 'sim') {
      $('#view').innerHTML = head() + `<div id="sim"></div>`; bind(); sim(u);
    } else if (tab === 'email') {
      const m = u.email;
      $('#view').innerHTML = head() + `<div class="card"><h3>نموذج رسالة · Model email</h3><div style="background:var(--soft);border-radius:12px;padding:14px"><div class="en" dir="ltr"><b>Subject:</b> ${esc(m.subject)}</div><hr>
        ${m.body.map(l => `<p class="en" dir="ltr" style="margin:.4rem 0">${esc(l[0])} ${E.sayBtn(l[0])}<br><small class="ar muted" dir="rtl">${esc(l[1])}</small></p>`).join('')}</div>
        <p class="muted">البنية: تحية ← سبب الرسالة ← الطلب أو المعلومة ← خاتمة مهذّبة ← توقيع. لتدرّب نفسك على الكتابة افتح قسم «الكتابة» واختر مهمة البريد الإلكتروني.</p>
        <div class="row"><button data-wr>✍️ اذهب إلى الكتابة</button></div></div>`;
      bind(); $('[data-wr]').onclick = () => { E.show('writing', true); };
    }
  }

  function phraseQuiz(u) {
    const ps = u.phrases;
    const out = [];
    shuffle(ps).slice(0, 6).forEach((p, i) => {
      if (i % 2 === 0) out.push({ t: 'mc', q: p[1], opts: shuffle([p[0], ...shuffle(ps.filter(x => x !== p)).slice(0, 3).map(x => x[0])]), a: p[0], say: p[0], review: p[1], shown: p[0], why: { en: p[2] || 'Say it aloud three times.', ar: p[2] ? '' : 'كرّرها بصوت عالٍ ثلاث مرات.' } });
      else out.push({ t: 'mc', q: p[0], ar: '', opts: shuffle([p[1], ...shuffle(ps.filter(x => x !== p)).slice(0, 3).map(x => x[1])]), a: p[1], say: p[0], review: p[0], shown: p[1] });
    });
    return out;
  }

  /* ---------- simulation: hear a workplace line, pick the best reply ---------- */
  function sim(u) {
    const steps = u.sim; let i = 0, pts = 0; const root = $('#sim');
    const show = () => {
      if (i >= steps.length) return end();
      const s = steps[i], opts = shuffle(s.opts.map((o, k) => ({ o, k })));
      root.innerHTML = `<div class="card"><div class="muted" style="text-align:center">${i + 1} / ${steps.length}</div><div class="bar"><i style="width:${100 * i / steps.length}%"></i></div>
        <div class="bubble"><div class="av">🧑‍💼</div><div class="msg"><div class="en" dir="ltr">${esc(s.say[0])} ${E.sayBtn(s.say[0])}</div><div class="ar" dir="rtl">${esc(s.say[1])}</div></div></div>
        <h3 style="text-align:center">ماذا تقول؟ <span class="en" dir="ltr">What do you say?</span></h3>
        <div class="opts" style="grid-template-columns:1fr">${opts.map((x, n) => `<button class="opt" data-n="${n}" style="text-align:left">${esc(x.o[0])}</button>`).join('')}</div><div class="fbbox"></div></div>`;
      setTimeout(() => E.say(s.say[0]), 250);
      $$('#sim [data-n]').forEach(b => b.onclick = () => {
        const x = opts[+b.dataset.n], q = x.o[1]; if ($('.fb', root)) return;
        pts += q; E.beep(q === 2); if (q === 2) E.xp(2);
        $$('#sim [data-n]').forEach(bb => { const oo = opts[+bb.dataset.n].o; if (oo[1] === 2) bb.classList.add('right'); else if (bb === b) bb.classList.add('wrong'); bb.disabled = true; });
        const best = s.opts.find(o => o[1] === 2);
        $('.fbbox', root).innerHTML = `<div class="fb ${q === 2 ? 'good' : q === 1 ? '' : 'bad'}"><b>${q === 2 ? 'ممتاز! Best choice' : q === 1 ? 'مقبولة لكن يمكن أفضل · Acceptable, but weak' : 'غير مناسبة · Not appropriate'}</b><div style="margin-top:6px">${E.bi(x.o[2], x.o[3])}</div>
          ${q !== 2 ? `<div style="margin-top:6px">الأفضل · Best: <b class="en" dir="ltr">${esc(best[0])}</b> ${E.sayBtn(best[0])}</div>` : E.sayBtn(x.o[0])}</div><div class="row" style="justify-content:center"><button class="primary big" data-next>التالي · Next ›</button></div>`;
        $('[data-next]', root).onclick = () => { i++; show(); };
      });
    };
    const end = () => {
      const pct = Math.round(100 * pts / (steps.length * 2)); E.markDone('w:' + u.id, pct); if (pct >= 70) E.xp(5);
      const rp = u.ai;
      root.innerHTML = `<div class="card" style="text-align:center"><h2>${pct >= 70 ? '🎉 أحسنت! Well done!' : 'حاول مرة أخرى · Try again'}</h2><div class="meter">${pct}%</div>
        <p class="muted">الإجابات الأفضل تجمع: أدب + جملة كاملة + معلومة واضحة.</p>${rp ? `<div class="card" style="background:var(--soft);box-shadow:none;text-align:start"><h3>🎭 الخطوة التالية · Next step</h3><p>الأدوار · Roles: <b class="en" dir="ltr">${esc(rp.role[0])}</b> / <b class="en" dir="ltr">${esc(rp.role[1])}</b><br>الهدف · Goal: <b class="en" dir="ltr">${esc(rp.goal)}</b></p><p class="muted">جرّب هذا الموقف مع زميل أو أمام المرآة، أو افتح قسم «مساعد المحادثة» إن فعّلت ميزة Claude الاختيارية.</p></div>` : ''}
        <div class="row" style="justify-content:center"><button class="primary" data-again>🔁 أعد · Again</button><button data-chat>🤖 محادثة حرّة (اختياري)</button><button data-ok>تم · Done</button></div></div>`;
      $('[data-again]', root).onclick = () => { i = 0; pts = 0; show(); };
      $('[data-chat]', root).onclick = () => { if (E.ai && E.ai.openRoleplay) E.ai.openRoleplay($('#view'), u, () => unit(u, 'sim')); else E.toast('ميزة المحادثة الحرة تحتاج مفتاح Claude — فعّلها من الإعدادات'); };
      $('[data-ok]', root).onclick = () => unit(u, 'sim');
    };
    show();
  }

  E.mod.work = { units: D.units, open: u => unit(u, 'phrases') };
  E.register('work', 'العمل', '💼', landing, 80);
})();

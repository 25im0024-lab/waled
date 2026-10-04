/* Speaking module — examiner-led mock (Parts 1–3) with TTS examiner, per-answer recording and transcript, review, Claude grading. */
(function () {
  'use strict';
  const I = window.IELTS, { $, $$, esc } = I, T = I.tts;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const FILL = /\b(um+|uh+|erm?|you know|i mean|like)\b/gi;

  function landing() {
    const hist = I.S.speaking.slice(-6).reverse();
    $('#view').innerHTML = `
    <div class="card"><h2>Speaking — محاكاة بالممتحِن</h2>
      <p>الممتحِن صوتي (TTS) يقرأ الأسئلة ثم يبدأ تسجيلك تلقائيًا. الاختبار الكامل ≈ 11–14 دقيقة: Part 1 (3 مواضيع × 3 أسئلة)، Part 2 (دقيقة تحضير + حتى دقيقتين)، Part 3 (4–5 أسئلة نقاش).</p>
      <div class="row"><label>صوت الممتحِن <select id="vo"><option value="">تلقائي</option>${T.options()}</select></label>
        <label>السرعة <select id="rt"><option value=".9">0.9</option><option value="1" selected>1.0</option></select></label>
        <label><input type="checkbox" id="hide"> إخفاء نص الأسئلة (استماع فقط)</label>
        <label><input type="checkbox" id="txt" ${SR ? '' : 'checked'}> وضع الكتابة بدل الميكروفون</label></div>
      <div class="row"><button class="primary" id="full">ابدأ الاختبار الكامل</button><button data-m="part1">Part 1 فقط</button><button data-m="part2">Part 2 فقط</button><button data-m="part3">Part 3 فقط</button></div>
      <p class="muted">${SR ? 'التفريغ النصي الآلي متاح (Chrome/Edge): يمكنك تصحيح التفريغ قبل إرساله للتقييم.' : '⚠️ متصفحك لا يدعم التفريغ الصوتي؛ سيُسجَّل صوتك للاستماع فقط، أو اكتب إجاباتك في وضع الكتابة لتُقيَّم.'} يتطلب الميكروفون اتصالًا آمنًا (https أو localhost) وإذنًا من المتصفح.</p></div>
    ${I.ai.settingsHtml()}
    <div class="card"><h2>سجل Speaking</h2>${hist.length ? `<table class="result-table"><tr><th>التاريخ</th><th>النوع</th><th>إجابات</th><th>كلمات</th><th>Band (Claude)</th></tr>${hist.map(h => `<tr><td>${esc(h.date)}</td><td>${esc(h.mode)}</td><td>${h.answers}</td><td>${h.words}</td><td>${h.band != null ? h.band.toFixed(1) : '—'}</td></tr>`).join('')}</table>` : '<p class="muted">لا توجد جلسات بعد.</p>'}</div>
    <div class="card"><h2>طريقة الاستفادة</h2><ul class="muted">
      <li>Part 1: 2–3 جمل لكل سؤال (إجابة + سبب/مثال)، لا إجابات من كلمة واحدة ولا خطابات طويلة.</li>
      <li>Part 2: غطِّ كل نقاط البطاقة وتحدّث دقيقة على الأقل دون صمت طويل. دوّن كلمات مفتاحية في دقيقة التحضير لا جملًا كاملة.</li>
      <li>Part 3: رأي + سبب + مثال أو مقارنة؛ تعلّم عبارات مثل "It depends on…" و"On the one hand…".</li>
      <li>راجع تسجيلك: أين توقفت؟ أي كلمات كررت؟ أي أخطاء نحوية ظاهرة؟</li></ul></div>`;
    I.ai.bindSettings();
    const cfg = () => ({ voice: $('#vo').value, rate: +$('#rt').value, hide: $('#hide').checked, textMode: $('#txt').checked });
    $('#full').onclick = () => run('full', cfg());
    $$('#view [data-m]').forEach(b => b.onclick = () => run(b.dataset.m, cfg()));
  }

  function buildQueue(mode) {
    const D = I.data.speaking, q = [], card = I.pick(D.part2);
    if (mode === 'full' || mode === 'part1') I.shuffle(D.part1).slice(0, 3).forEach(t => I.shuffle(t.qs).slice(0, 3).forEach((s, i) => q.push({ part: 1, topic: t.topic, q: s, cap: 60, intro: i === 0 ? `Now I'd like to ask you some questions about ${t.topic.toLowerCase()}.` : '' })));
    if (mode === 'full' || mode === 'part2') q.push({ part: 2, card, q: card.t, cap: 120 });
    if (mode === 'full' || mode === 'part3') I.shuffle(card.p3).slice(0, 5).forEach((s, i) => q.push({ part: 3, q: s, cap: 90, intro: i === 0 ? `We've been talking about ${card.t.replace(/^Describe /, '').replace(/\.$/, '')}, and now I'd like to discuss one or two more general questions related to this.` : '' }));
    return q;
  }

  async function run(mode, o) {
    const queue = buildQueue(mode), answers = [];
    let cancelled = false, stream = null, mr = null, rec = null, chunks = [], finalText = '', recording = false, t0 = 0, waiter = null, exCtl = null;
    I.examActive = true;
    I.leaveGuard = () => confirm('الجلسة قيد التقدم وستُفقد إجاباتك عند المغادرة. متابعة؟');
    I.onLeave(() => { cancelled = true; I.examActive = false; T.stop(); if (exCtl) exCtl.stop(); try { rec && rec.stop(); } catch (_) { } try { mr && mr.state !== 'inactive' && mr.stop(); } catch (_) { } if (stream) stream.getTracks().forEach(t => t.stop()); tm.stop(); });
    const cast = T.cast({ E: { g: 'f' } }, o.voice);

    $('#view').innerHTML = `
    <div class="exam-bar"><span class="title">Speaking — ${mode === 'full' ? 'Full test' : mode.replace('part', 'Part ')}</span><span class="muted" id="prog"></span><span class="timer" id="tmr">--:--</span></div>
    <div class="stage" id="stage"><div id="exm" style="font-weight:600"></div><div id="qt" class="en" style="font-size:19px;margin:10px 0;line-height:1.6"></div>
      <div class="wave">${'<i></i>'.repeat(14)}</div><div id="live" class="en muted" style="min-height:44px" aria-live="polite"></div>
      <div id="notes"></div><div class="row" style="justify-content:center" id="ctl"></div></div><div id="out"></div>`;
    const tm = I.timer($('#tmr'), { warnAt: 10 });
    const btn = (label, fn, cls) => { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; $('#ctl').appendChild(b); return b; };
    const examiner = text => new Promise(res => { exCtl = T.play([{ s: 'E', t: text }], { cast, rate: o.rate, onEnd: res }); if (!T.supported) res(); });

    if (!o.textMode) {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { $('#exm').innerHTML = `<span class="bad">تعذّر الوصول إلى الميكروفون (${esc(e.message)}). سيستمر الاختبار بوضع الكتابة.</span>`; o.textMode = true; await new Promise(r => setTimeout(r, 1800)); }
    }

    function startRec() {
      chunks = []; finalText = ''; recording = true; t0 = Date.now();
      if (stream) { try { mr = new MediaRecorder(stream); mr.ondataavailable = e => e.data && e.data.size && chunks.push(e.data); mr.start(); } catch (e) { mr = null; } }
      if (SR && stream) {
        rec = new SR(); rec.lang = 'en-GB'; rec.continuous = true; rec.interimResults = true;
        rec.onresult = e => { let interim = ''; for (let k = e.resultIndex; k < e.results.length; k++) { const r = e.results[k]; if (r.isFinal) finalText += r[0].transcript + ' '; else interim += r[0].transcript; } $('#live').textContent = finalText + interim; };
        rec.onend = () => { if (recording) { try { rec.start(); } catch (_) { } } };
        try { rec.start(); } catch (_) { rec = null; }
      }
      $('#stage').classList.add('playing');
    }
    function stopRec() {
      return new Promise(resolve => {
        recording = false; $('#stage').classList.remove('playing');
        const dur = (Date.now() - t0) / 1000; let pending = (mr ? 1 : 0) + (rec ? 1 : 0), fin = false;
        const done = () => { if (fin) return; fin = true; resolve({ dur, blob: chunks.length ? new Blob(chunks, { type: (mr && mr.mimeType) || 'audio/webm' }) : null, text: finalText.trim() }); };
        const tick = () => { if (--pending <= 0) done(); };
        if (!pending) return done();
        if (mr) { mr.onstop = tick; try { mr.state !== 'inactive' ? mr.stop() : tick(); } catch (_) { tick(); } }
        if (rec) { rec.onend = tick; try { rec.stop(); } catch (_) { tick(); } }
        setTimeout(done, 2000);
      });
    }
    const waitNext = cap => new Promise(res => { waiter = res; tm.stop(); tm.start(cap); const iv = setInterval(() => { if (!tm.running || cancelled) { clearInterval(iv); waiter = null; res(); } }, 250); });
    const proceed = () => { tm.stop(); if (waiter) { const w = waiter; waiter = null; w(); } };

    for (let k = 0; k < queue.length && !cancelled; k++) {
      const it = queue[k];
      $('#prog').textContent = `${k + 1} / ${queue.length} · Part ${it.part}`; $('#live').textContent = ''; $('#ctl').innerHTML = ''; $('#notes').innerHTML = ''; $('#tmr').textContent = '--:--';
      let typed = '';
      if (it.part === 2) {
        const c = it.card;
        $('#exm').textContent = 'Examiner'; $('#qt').innerHTML = `<b>${esc(c.t)}</b><br><span class="muted">You should say:</span><br>${c.pts.map(p => '• ' + esc(p)).join('<br>')}`;
        await examiner('Now, I\'m going to give you a topic, and I\'d like you to talk about it for one to two minutes. Before you talk, you have one minute to think about what you\'re going to say. You can make some notes if you wish.');
        if (cancelled) return;
        $('#notes').innerHTML = `<textarea class="en" id="nt" style="min-height:90px" placeholder="Notes (keywords only)…"></textarea>`;
        $('#exm').textContent = 'التحضير: دقيقة واحدة'; btn('ابدأ الحديث الآن ›', proceed, 'primary');
        await waitNext(60); if (cancelled) return;
        await examiner('All right? Remember, you have one to two minutes for this, so don\'t worry if I stop you. I\'ll tell you when the time is up. Can you start speaking now, please?');
      } else {
        $('#exm').textContent = 'Examiner'; $('#qt').innerHTML = o.hide ? '<span class="muted">🎧 استمع إلى السؤال</span>' : esc(it.q);
        if (it.intro) await examiner(it.intro);
        if (cancelled) return;
        await examiner(it.q);
      }
      if (cancelled) return;
      $('#ctl').innerHTML = ''; $('#exm').textContent = o.textMode ? 'اكتب إجابتك كما كنت ستقولها' : '🔴 يتم التسجيل — تحدّث الآن';
      if (o.textMode) { $('#notes').innerHTML = `<textarea class="en" id="ty" style="min-height:120px" placeholder="Type your spoken answer…"></textarea>`; }
      else startRec();
      if (o.textMode) btn('↻ كرّر السؤال', () => examiner(it.q), 'sm');
      btn('التالي ›', proceed, 'primary');
      const startedAt = Date.now();
      await waitNext(it.cap); if (cancelled) return;
      if (o.textMode) { const ty = $('#ty'); typed = ty ? ty.value : ''; answers.push({ it, dur: (Date.now() - startedAt) / 1000, blob: null, text: typed.trim() }); }
      else { const r = await stopRec(); answers.push({ it, ...r }); }
    }
    if (cancelled) return;
    I.examActive = false; I.leaveGuard = null; tm.stop(); if (stream) stream.getTracks().forEach(t => t.stop());
    await examiner('Thank you. That is the end of the speaking test.');
    review(mode, answers, o);
  }

  function review(mode, answers, o) {
    $('#stage').hidden = true;
    const qText = a => a.it.part === 2 ? `${a.it.card.t} (${a.it.card.pts.join('; ')})` : a.it.q;
    const stats = a => { const w = I.toks(a.text).length, fill = (a.text.match(FILL) || []).length, wpm = a.dur > 5 ? Math.round(w / (a.dur / 60)) : 0; return { w, fill, wpm }; };
    $('#out').innerHTML = `<div class="card"><h2>مراجعة الجلسة</h2>
      <p class="muted">${o.textMode ? 'وضع الكتابة: النص أدناه هو ما كتبته.' : 'التفريغ آلي وقد يخطئ (لهجتك، اسم علم، ضوضاء). صحّح أي كلمة خاطئة قبل التقييم حتى لا تُحسَب عليك. التقييم يعتمد على النص فقط.'}</p></div>
      ${answers.map((a, i) => { const s = stats(a); return `<div class="card"><h3 style="margin-top:0">Part ${a.it.part} — <span class="en">${esc(qText(a))}</span></h3>
        ${a.blob ? `<audio controls src="${URL.createObjectURL(a.blob)}" style="width:100%"></audio>` : ''}
        <div class="grid" style="margin:8px 0"><div class="stat"><small>المدة</small><b>${I.fmt(a.dur)}</b></div><div class="stat"><small>كلمات</small><b>${s.w}</b></div><div class="stat"><small>كلمة/دقيقة</small><b>${s.wpm || '–'}</b></div><div class="stat"><small>fillers محتملة</small><b>${s.fill}</b></div></div>
        ${a.it.part === 2 && a.dur < 60 ? `<p class="warn">مدة Part 2 أقل من دقيقة (${Math.round(a.dur)} ث). المطلوب 1–2 دقيقة.</p>` : ''}
        <textarea class="en tr" data-i="${i}" style="min-height:90px" placeholder="(لا يوجد تفريغ — اكتب ما قلته إن أردت التقييم)">${esc(a.text)}</textarea></div>`; }).join('')}
      <div class="card"><div class="row"><button class="primary" id="gr">قيّم بـ Claude</button><button id="cp">نسخ prompt لمحادثة Claude</button><button id="bk">العودة</button></div><p class="muted">كلمة like قد تكون استخدامًا سليمًا فلا تعدّها خطأً تلقائيًا. معدل 110–160 كلمة/دقيقة تقدير عام وليس معيارًا رسميًا.</p><div id="ai"></div></div>`;
    const items = () => answers.map((a, i) => ({ part: a.it.part, q: qText(a), transcript: $(`.tr[data-i="${i}"]`).value.trim(), seconds: Math.round(a.dur) }));
    $('#bk').onclick = () => I.show('speaking');
    $('#cp').onclick = async () => I.toast(await I.copy(I.ai.pastePromptSpeaking(items())) ? 'تم النسخ' : 'تعذّر النسخ');
    const wordsNow = () => answers.reduce((n, a, i) => n + I.toks($(`.tr[data-i="${i}"]`).value).length, 0);
    const rec = { date: I.dayKey(new Date()), mode, answers: answers.length, words: wordsNow(), band: null };
    I.addHistory('speaking', rec); I.mark();
    $('#gr').onclick = async () => {
      if (!I.ai.hasKey()) { $('#ai').innerHTML = '<p class="warn">أدخل مفتاح API في "مصحّح Claude" بصفحة Speaking أولًا، أو انسخ الـ prompt.</p>'; return; }
      const its = items(); if (its.every(x => !x.transcript)) { $('#ai').innerHTML = '<p class="warn">لا يوجد نص للتقييم.</p>'; return; }
      $('#gr').disabled = true; $('#ai').innerHTML = '<p class="muted">⏳ Claude يقيّم…</p>';
      try {
        const r = await I.ai.gradeSpeaking(its), rep = I.ai.reportHtml(r.data, 'speaking', { title: 'Speaking', model: r.model });
        $('#ai').innerHTML = rep.html; rec.band = rep.overall; rec.words = wordsNow(); I.save();
        if (mode === 'full' && rep.overall != null) I.addHistory('mocks', { date: rec.date, skill: 'speaking', band: rep.overall });
      } catch (e) { $('#ai').innerHTML = `<p class="bad">✗ ${esc(I.ai.explain(e))}</p>`; $('#gr').disabled = false; }
    };
  }

  I.register('speaking', 'Speaking', landing);
})();

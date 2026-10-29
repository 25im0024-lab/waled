/* English Hub — exercise engine.
   Item types: mc, pic, word2pic, listen, fill, dictate, order, tf, match, speak.
   Every item may carry: why:{en,ar} (explanation), ar (Arabic translation of the prompt), say (text to read aloud after answering). */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc, shuffle, norm } = E;
  const GOODS = ['أحسنت! Great!', 'ممتاز! Excellent!', 'صحيح! Correct!', 'رائع! Well done!'];

  function run(cfg) {
    const root = cfg.root, items = cfg.shuffle ? shuffle(cfg.items) : cfg.items.slice();
    let i = 0, score = 0, locked = false; const missed = [];
    const head = () => `<div class="qhead"><span class="muted">${i + 1} / ${items.length}</span><div class="bar" style="flex:1"><i style="width:${100 * i / items.length}%"></i></div><span class="chip">✅ ${score}</span></div>`;

    function show() {
      if (i >= items.length) return end();
      const it = items[i]; locked = false;
      root.innerHTML = `<div class="qwrap card">${cfg.title ? `<div class="muted" style="text-align:center">${esc(cfg.title)}</div>` : ''}${head()}<div class="qbox"></div><div class="fbbox"></div></div>`;
      R[it.t](it, $('.qbox', root));
    }
    function feedback(ok, it, correctText) {
      if (locked) return; locked = true;
      E.beep(ok); if (ok) { score++; E.xp(2); } else missed.push(it);
      const why = it.why ? E.bi(it.why.en, it.why.ar) : '';
      const sayTxt = it.say || (typeof correctText === 'string' && /[a-z]/i.test(correctText) ? correctText : '');
      $('.fbbox', root).innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><b>${ok ? E.S.hints ? GOODS[score % GOODS.length] : 'Correct!' : 'ليست صحيحة · Not quite'}</b>${!ok && correctText ? `<div>الإجابة · Answer: <b class="en" dir="ltr">${esc(correctText)}</b></div>` : ''}${why ? `<div style="margin-top:6px">${why}</div>` : ''}${sayTxt ? `<div style="margin-top:6px">${E.sayBtn(sayTxt)}</div>` : ''}</div><div class="row" style="justify-content:center"><button class="primary big" data-next>التالي · Next ›</button></div>`;
      const nb = $('[data-next]', root); nb.onclick = () => { i++; show(); }; nb.focus({ preventScroll: true });
    }
    function end() {
      const pct = Math.round(100 * score / items.length), stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
      if (pct >= 70) E.xp(5);
      if (cfg.id) E.markDone(cfg.id, pct);
      root.innerHTML = `<div class="qwrap card" style="text-align:center"><h2>${pct >= 70 ? 'أحسنت! Well done!' : 'استمر في التدرّب · Keep practising'}</h2><div class="stars" aria-label="${stars} stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><div class="meter">${score} / ${items.length}</div><p class="muted">${pct}% · +${score * 2 + (pct >= 70 ? 5 : 0)} XP</p>
        ${missed.length ? `<div style="text-align:start"><h3>راجع أخطاءك · Review</h3>${missed.slice(0, 6).map(m => `<div class="ex-item"><span class="en" dir="ltr">${esc(m.review || m.q || m.say || m.target || (m.words && m.a) || '')}</span><b class="en" dir="ltr">${esc(m.shown || (Array.isArray(m.a) ? m.a[0] : typeof m.a === 'string' ? m.a : ''))}</b></div>`).join('')}</div>` : ''}
        <div class="row" style="justify-content:center"><button class="primary" data-again>🔁 أعد · Again</button><button data-exit>خروج · Done</button></div></div>`;
      $('[data-again]', root).onclick = () => run(cfg); $('[data-exit]', root).onclick = () => cfg.onExit && cfg.onExit(pct);
      if (cfg.onDone) cfg.onDone(pct, score, items.length);
    }

    const optBtn = (o, big) => `<button class="opt" data-o="${esc(o)}" ${big ? 'style="font-size:2.4rem;line-height:1.3"' : ''}>${esc(o)}</button>`;
    function choices(it, box, answer) {
      const opts = it.keep ? it.opts : shuffle(it.opts);
      $('.opts', box).innerHTML = opts.map(o => optBtn(o, it.big)).join('');
      $$('.opt', box).forEach(b => b.onclick = () => {
        if (locked) return; const ok = b.dataset.o === String(answer);
        b.classList.add(ok ? 'right' : 'wrong'); if (!ok) $$('.opt', box).forEach(x => { if (x.dataset.o === String(answer)) x.classList.add('right'); });
        feedback(ok, it, ok ? '' : String(answer));
      });
    }
    const R = {
      mc(it, box) {
        box.innerHTML = `${it.pic ? `<div class="pic">${it.pic}</div>` : ''}<div class="prompt">${esc(it.q)}</div>${it.ar ? `<div class="ar muted" style="text-align:center">${esc(it.ar)}</div>` : ''}<div class="opts"></div>`;
        choices(it, box, it.a);
      },
      pic(it, box) { R.mc({ ...it, q: it.q || 'What is this? ما هذا؟', big: false }, box); },
      word2pic(it, box) {
        box.innerHTML = `<div class="prompt">${esc(it.q)} ${E.sayBtn(it.q)}</div>${it.ar ? `<div class="ar muted" style="text-align:center">${esc(it.ar)}</div>` : ''}<div class="opts"></div>`;
        choices({ ...it, big: true }, box, it.a);
      },
      listen(it, box) {
        box.innerHTML = `<div class="prompt">🎧 استمع واختر · Listen and choose</div><div style="margin:6px 0">${E.sayBtn(it.say, 'big')} <button class="sm" data-slow>🐢 بطيء · Slow</button></div>${it.q ? `<div class="prompt">${esc(it.q)}</div>` : ''}<div class="opts"></div>`;
        $('[data-slow]', box).onclick = () => E.say(it.say, { slow: true });
        choices({ ...it, big: it.big }, box, it.a);
        setTimeout(() => E.say(it.say), 300);
      },
      tf(it, box) {
        box.innerHTML = `${it.pic ? `<div class="pic">${it.pic}</div>` : ''}<div class="sent">${esc(it.q)}</div>${it.ar ? `<div class="ar muted" style="text-align:center">${esc(it.ar)}</div>` : ''}<div class="opts"><button class="opt" data-v="1">✅ صح · True</button><button class="opt" data-v="0">❌ خطأ · False</button></div>`;
        $$('.opt', box).forEach(b => b.onclick = () => { if (locked) return; const ok = (b.dataset.v === '1') === !!it.a; b.classList.add(ok ? 'right' : 'wrong'); feedback(ok, it, it.a ? 'True' : 'False'); });
      },
      fill(it, box) {
        const parts = it.q.split('____');
        box.innerHTML = `${it.pic ? `<div class="pic">${it.pic}</div>` : ''}<div class="sent">${esc(parts[0])}<span class="gap" data-gap>&nbsp;</span>${esc(parts.slice(1).join(''))}</div>${it.ar ? `<div class="ar muted" style="text-align:center">${esc(it.ar)}</div>` : ''}${it.hint ? `<div class="muted" style="text-align:center">💡 ${esc(it.hint)}</div>` : ''}
          <div class="answer-row"><input type="text" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="answer"><button class="primary" data-check>تحقّق · Check</button></div>`;
        const inp = $('input', box); inp.focus({ preventScroll: true });
        const check = () => { if (locked) return; const v = inp.value; if (!v.trim()) return; const acc = Array.isArray(it.a) ? it.a : [it.a], ok = acc.some(a => norm(a) === norm(v)); $('[data-gap]', box).textContent = v.trim(); feedback(ok, it, acc[0]); inp.disabled = true; };
        $('[data-check]', box).onclick = check; inp.onkeydown = e => { if (e.key === 'Enter') check(); };
      },
      dictate(it, box) {
        box.innerHTML = `<div class="prompt">✍️ اكتب ما تسمعه · Type what you hear</div><div style="margin:6px 0">${E.sayBtn(it.say, 'big')} <button class="sm" data-slow>🐢 بطيء · Slow</button></div><div class="answer-row"><input type="text" autocomplete="off" autocapitalize="none" spellcheck="false" style="max-width:480px;width:100%"><button class="primary" data-check>تحقّق · Check</button></div>`;
        $('[data-slow]', box).onclick = () => E.say(it.say, { slow: true });
        const inp = $('input', box);
        const check = () => { if (locked || !inp.value.trim()) return; const d = E.compare(it.say, inp.value); inp.disabled = true; feedback(d.score >= 90, it, it.say); };
        $('[data-check]', box).onclick = check; inp.onkeydown = e => { if (e.key === 'Enter') check(); };
        setTimeout(() => E.say(it.say), 300);
      },
      order(it, box) {
        const toks = shuffle(it.words.map((w, k) => ({ w, k })));
        box.innerHTML = `<div class="prompt">${it.ar ? '' : 'Put the words in order · رتّب الكلمات'}</div>${it.ar ? `<div class="ar" style="text-align:center;font-size:1.2rem">${esc(it.ar)}</div><div class="muted" style="text-align:center">رتّب الكلمات بالإنجليزية · Put the words in order</div>` : ''}<div class="build" style="margin-top:10px"></div><div class="bank"></div><div class="row" style="justify-content:center"><button class="primary" data-check>تحقّق · Check</button><button class="sm" data-clear>مسح · Clear</button></div>`;
        const build = $('.build', box), bank = $('.bank', box), chosen = [];
        const draw = () => {
          build.innerHTML = chosen.map((c, n) => `<button class="wt" data-n="${n}">${esc(c.w)}</button>`).join('');
          bank.innerHTML = toks.map((t, n) => `<button class="wt ${chosen.includes(t) ? 'used' : ''}" data-t="${n}">${esc(t.w)}</button>`).join('');
          $$('[data-n]', build).forEach(b => b.onclick = () => { if (locked) return; chosen.splice(+b.dataset.n, 1); draw(); });
          $$('[data-t]', bank).forEach(b => b.onclick = () => { if (locked) return; chosen.push(toks[+b.dataset.t]); draw(); });
        };
        draw();
        $('[data-clear]', box).onclick = () => { if (!locked) { chosen.length = 0; draw(); } };
        $('[data-check]', box).onclick = () => { if (locked || !chosen.length) return; const ok = norm(chosen.map(c => c.w).join(' ')) === norm(it.a); build.style.borderColor = ok ? 'var(--good)' : 'var(--bad)'; feedback(ok, it, it.a); };
      },
      match(it, box) {
        const L = shuffle(it.pairs.map((p, k) => ({ k, t: p[0] }))), Rr = shuffle(it.pairs.map((p, k) => ({ k, t: p[1] })));
        let selL = null, mistakes = 0, left = it.pairs.length;
        box.innerHTML = `<div class="prompt">${esc(it.q || 'Match · طابق')}</div><div class="grid2" style="gap:8px"><div class="opts" style="grid-template-columns:1fr" data-l></div><div class="opts" style="grid-template-columns:1fr" data-r></div></div>`;
        const draw = () => {
          $('[data-l]', box).innerHTML = L.map(x => `<button class="opt ${x.done ? 'right' : ''} ${selL === x ? 'sel' : ''}" ${x.done ? 'disabled' : ''} data-k="${x.k}" style="${selL === x ? 'border-color:var(--primary);background:var(--soft)' : ''}">${esc(x.t)}</button>`).join('');
          $('[data-r]', box).innerHTML = Rr.map(x => `<button class="opt ${x.done ? 'right' : ''}" ${x.done ? 'disabled' : ''} data-k="${x.k}" dir="auto">${esc(x.t)}</button>`).join('');
          $$('[data-l] .opt', box).forEach(b => b.onclick = () => { selL = L.find(x => x.k === +b.dataset.k); E.say(selL.t, {}); draw(); });
          $$('[data-r] .opt', box).forEach(b => b.onclick = () => {
            if (!selL) return E.toast('اختر كلمة من اليمين أولًا · Pick a word first');
            if (selL.k === +b.dataset.k) { selL.done = true; Rr.find(x => x.k === selL.k).done = true; selL = null; left--; E.beep(true); draw(); if (!left) { locked = false; feedback(mistakes === 0, { ...it, review: it.q || 'match', shown: '' }, mistakes ? `${mistakes} mistake(s)` : ''); } }
            else { mistakes++; E.beep(false); b.classList.add('wrong'); setTimeout(draw, 350); }
          });
        };
        draw();
      },
      speak(it, box) {
        box.innerHTML = `<div class="prompt">🎤 قل الجملة · Say it</div><div class="sent">${esc(it.target)}</div>${it.ar ? `<div class="ar muted" style="text-align:center">${esc(it.ar)}</div>` : ''}<div style="margin:8px 0">${E.sayBtn(it.target, 'big')} <button class="sm" data-slow>🐢</button></div><div class="row" style="justify-content:center"><button class="primary big" data-mic>🎤 ${E.canListen ? 'ابدأ التسجيل · Speak' : 'قلتُها · I said it'}</button></div><div class="heard"></div>`;
        $('[data-slow]', box).onclick = () => E.say(it.target, { slow: true });
        $('[data-mic]', box).onclick = async () => {
          if (locked) return;
          if (!E.canListen) return feedback(true, { ...it, say: it.target }, '');
          $('.heard', box).innerHTML = '<p class="muted">🎙️ أسمعك… Listening…</p>';
          const r = await E.listen({ lang: E.S.accent });
          if (r.error) { $('.heard', box).innerHTML = `<p class="warn">لم أسمع شيئًا واضحًا (${esc(r.error)}). حاول مرة أخرى أو اضغط التالي. · Try again.</p><div class="row" style="justify-content:center"><button class="sm" data-skip>تخطَّ · Skip</button></div>`; const s = $('[data-skip]', box); if (s) s.onclick = () => feedback(false, { ...it, say: it.target }, it.target); return; }
          const d = E.compare(it.target, r.text);
          $('.heard', box).innerHTML = `<p>${E.diffHtml(d)}</p><p class="muted">فهم المتصفح · The browser heard: “${esc(r.text)}” — ${d.score}%</p>`;
          feedback(d.score >= 75, { ...it, say: it.target }, it.target);
        };
      }
    };
    show();
  }
  E.quiz = { run };
})();

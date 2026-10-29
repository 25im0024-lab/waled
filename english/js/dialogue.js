/* English Hub — dialogue helpers shared by Listening and English for Work:
   multi-voice playback, chat bubbles, and a speaking role-play (you speak one role, the app speaks the other). */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc } = E;

  const cast = d => { const spec = {}; Object.entries(d.speakers).forEach(([k, v]) => { spec[k] = { g: v.g, pitch: v.pitch }; }); return E.tts.cast(spec); };

  /** Chat bubbles for a dialogue. Speaker A on the left, everyone else on the right. */
  const bubbles = (d, opts = {}) => d.lines.map((l, i) => {
    const sp = d.speakers[l[0]] || {};
    return `<div class="bubble ${l[0] === 'A' ? '' : 'r'}" data-line="${i}"><div class="av" title="${esc(sp.name || '')}">${sp.av || '🙂'}</div><div class="msg"><div class="en" dir="ltr"><b>${esc(sp.name || '')}:</b> ${esc(l[1])}</div><div class="ar" dir="rtl">${esc(l[2])}</div></div></div>`;
  }).join('');

  /** Play all lines; calls onLine(i) while each line is spoken. */
  const play = (d, { slow, onLine, onEnd } = {}) => E.tts.play(d.lines.map(l => ({ s: l[0], t: l[1] })), { cast: cast(d), slow, gap: 450, onLine, onEnd });

  /** Role-play: the app speaks the other roles; you speak yours. */
  function roleplay(root, d, role, back) {
    let cancelled = false, ctl = null; const hist = [], scores = [];
    E.onLeave(() => { cancelled = true; if (ctl) ctl.stop(); });
    const c = cast(d);
    const bubble = (i, mine) => { const l = d.lines[i], sp = d.speakers[l[0]] || {}; return `<div class="bubble ${l[0] === 'A' ? '' : 'r'}"><div class="av">${sp.av || '🙂'}</div><div class="msg"><div class="en" dir="ltr">${esc(l[1])}</div><div class="ar" dir="rtl">${esc(l[2])}</div></div></div>`; };
    const frame = (inner) => { root.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><button class="sm" data-back>‹ خروج · Exit</button><span class="muted">${esc(d.title[0])} · أنت: <b>${esc((d.speakers[role] || {}).name || role)}</b> ${(d.speakers[role] || {}).av || ''}</span></div><div data-hist>${hist.join('')}</div>${inner}</div>`; $('[data-back]', root).onclick = () => { cancelled = true; if (ctl) ctl.stop(); back(); }; };
    const speakLine = i => new Promise(res => { ctl = E.tts.play([{ s: d.lines[i][0], t: d.lines[i][1] }], { cast: c, onEnd: res }); if (!E.tts.supported) res(); });

    async function step(i) {
      if (cancelled) return;
      if (i >= d.lines.length) return finish();
      const l = d.lines[i];
      if (l[0] !== role) {
        hist.push(bubble(i)); frame('<div class="muted" style="text-align:center">🔊 …</div>');
        await speakLine(i); return step(i + 1);
      }
      frame(`<div class="card" style="background:var(--soft);box-shadow:none"><div class="muted">دورك · Your turn</div>${bubble(i)}
        <div class="row" style="justify-content:center"><button class="primary big" data-mic>🎤 ${E.canListen ? 'قل الجملة · Say it' : 'قلتُها · I said it'}</button><button data-hear>🔊 اسمعها · Hear it</button><button data-skip>تخطَّ · Skip</button></div><div data-res></div></div>`);
      $('[data-hear]', root).onclick = () => E.say(l[1]);
      $('[data-skip]', root).onclick = () => { scores.push(0); hist.push(bubble(i)); step(i + 1); };
      $('[data-mic]', root).onclick = async () => {
        if (!E.canListen) { scores.push(100); hist.push(bubble(i)); return step(i + 1); }
        $('[data-res]', root).innerHTML = '<p class="muted">🎙️ أسمعك… Listening…</p>';
        const r = await E.listen({ lang: E.S.accent });
        if (cancelled) return;
        if (r.error) { $('[data-res]', root).innerHTML = `<p class="warn">لم أسمع بوضوح (${esc(r.error)}). حاول مرة أخرى · Try again.</p>`; return; }
        const df = E.compare(l[1], r.text), ok = df.score >= 75; E.beep(ok);
        $('[data-res]', root).innerHTML = `<p>${E.diffHtml(df)}</p><p class="muted">فهم المتصفح: “${esc(r.text)}” — ${df.score}%</p><div class="row" style="justify-content:center"><button data-again>🔁 أعد · Again</button><button class="primary" data-next>التالي › Next</button></div>`;
        $('[data-again]', root).onclick = () => step(i); $('[data-next]', root).onclick = () => { scores.push(df.score); E.xp(df.score >= 75 ? 3 : 1); hist.push(bubble(i)); step(i + 1); };
      };
    }
    function finish() {
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;
      E.xp(5); E.markDone('rp:' + d.id + ':' + role, avg);
      frame(`<div style="text-align:center"><h2>🎉 أحسنت! Well done!</h2><div class="meter">${avg}%</div><p class="muted">متوسط تطابق نطقك مع النص كما فهمه المتصفّح. هذا مؤشّر تقريبي وليس تقييم نطق رسميًا.</p><div class="row" style="justify-content:center"><button class="primary" data-again>🔁 أعد · Again</button><button data-swap>🔀 بدّل الدور · Swap role</button><button data-ok>خروج · Done</button></div></div>`);
      const roles = Object.keys(d.speakers);
      $('[data-again]', root).onclick = () => roleplay(root, d, role, back); $('[data-swap]', root).onclick = () => roleplay(root, d, roles.find(r => r !== role) || role, back); $('[data-ok]', root).onclick = back;
    }
    step(0);
  }

  /** Repeat-after-me: listens once, then shows a word diff. A rough text-match indicator, not a pronunciation grade. */
  async function shadow(text, box) {
    if (!E.canListen) { box.innerHTML = '<p class="muted">متصفحك لا يدعم التعرّف على الكلام. استمع ثم كرّر بصوت عالٍ — هذا يكفي للتدريب.</p>'; return E.say(text); }
    box.innerHTML = '<p class="muted">🎙️ أسمعك… Listening…</p>';
    const r = await E.listen({ lang: E.S.accent });
    if (r.error) { box.innerHTML = `<p class="warn">لم أسمع بوضوح (${esc(r.error)}). حاول مرة أخرى · Try again.</p>`; return; }
    const df = E.compare(text, r.text); E.beep(df.score >= 75); if (df.score >= 75) E.xp(2);
    box.innerHTML = `<p>${E.diffHtml(df)}</p><p class="muted">فهم المتصفح: “${esc(r.text)}” — ${df.score}%<br>هذا مؤشّر تقريبي لتطابق الكلام، وليس تقييم نطق رسميًا.</p>`;
  }

  E.dlg = { cast, bubbles, play, roleplay, shadow };
})();

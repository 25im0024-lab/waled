/* English Hub — core: helpers, store, XP/streak, bilingual rendering, speech (TTS + recognition), spaced repetition, router.
   Classic script (works from file://). Global namespace: window.EL */
(function () {
  'use strict';
  const E = (window.EL = { data: {}, tabs: [], mod: {}, LEVELS: ['A1', 'A2', 'B1'], LEVEL_AR: { A1: 'مبتدئ', A2: 'أساسي', B1: 'متوسط' } });

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const dayIdx = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5); };
  const dayKey = d => (d || new Date()).toLocaleDateString('en-CA');
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = s => norm(s).split(' ').filter(Boolean);
  const fmt = s => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  Object.assign(E, { $, $$, esc, shuffle, pick, dayIdx, dayKey, norm, toks, fmt });

  E.copy = async t => { try { await navigator.clipboard.writeText(t); return true; } catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) { } a.remove(); return ok; } };
  E.download = (name, text, type = 'application/json') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  let toastT;
  E.toast = msg => { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); };

  /* ---------- persistent store ---------- */
  const KEY = 'english_hub_v1';
  const defaults = () => ({
    level: 'A1', hints: 'show' /* show | tap */, accent: 'en-US', slow: false, sound: true, goal: 30,
    xp: 0, today: { day: '', xp: 0 }, days: {}, vocab: {}, newToday: { day: 0, n: 0 }, done: {}, wrong: {},
    placed: null, custom: [], writing: {}, work: {}, ai: { spend: 0, calls: 0 }, lastExport: 0
  });
  function load() { try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return defaults(); } }
  E.S = load();
  E.save = () => { try { localStorage.setItem(KEY, JSON.stringify(E.S)); } catch (e) { } };
  E.replaceState = o => { E.S = Object.assign(defaults(), o); E.save(); };
  E.resetState = () => { E.S = defaults(); E.save(); };

  /* ---------- XP / streak ---------- */
  E.xp = (n, why) => {
    const S = E.S, k = dayKey();
    if (S.today.day !== k) S.today = { day: k, xp: 0 };
    S.xp += n; S.today.xp += n; S.days[k] = (S.days[k] || 0) + n;
    E.save();
    const el = $('#xpchip'); if (el) { el.textContent = '⭐ ' + S.xp; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  };
  E.streak = () => { let n = 0; const d = new Date(); if (!E.S.days[dayKey(d)]) d.setDate(d.getDate() - 1); while (E.S.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); } return n; };
  E.todayXp = () => (E.S.today.day === dayKey() ? E.S.today.xp : 0);
  E.markDone = (id, score) => { const d = E.S.done[id] || (E.S.done[id] = { best: 0, n: 0 }); d.best = Math.max(d.best, score); d.n++; d.at = dayKey(); E.save(); };

  /* ---------- bilingual rendering ---------- */
  /** English line + Arabic line. In "tap" mode the Arabic is veiled until tapped. */
  E.bi = (en, ar, cls = '') => `<span class="bi ${cls}"><span class="en" dir="ltr">${esc(en)}</span>${ar ? `<span class="ar ${E.S.hints === 'tap' ? 'veil' : ''}" dir="rtl" lang="ar">${esc(ar)}</span>` : ''}</span>`;
  document.addEventListener('click', e => { const v = e.target.closest('.veil'); if (v) v.classList.toggle('shown'); });

  /* ---------- speech synthesis ---------- */
  const tts = E.tts = {
    supported: !!window.speechSynthesis, voices: [],
    load() { if (tts.supported) tts.voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); },
    choose(spec, used = []) {
      const F = /(sonia|libby|hazel|susan|kate|serena|fiona|karen|samantha|zira|aria|jenny|olivia|natasha|emma|amy|female|moira|tessa|allison|ava|joanna|salli)/i;
      const M = /(ryan|thomas|george|daniel|oliver|alfie|arthur|james|guy|davis|male|david|mark|rishi|lee|gordon|alex|fred|matthew|joey|brian)/i;
      let best = null, bs = -1e9;
      for (const v of tts.voices) {
        let s = 0; const lang = v.lang.replace('_', '-');
        if (spec.accent && lang.toLowerCase() === spec.accent.toLowerCase()) s += 4; else if (spec.accent && lang.slice(0, 2) === spec.accent.slice(0, 2)) s += 1;
        if (spec.g === 'f') s += F.test(v.name) ? 3 : M.test(v.name) ? -3 : 0;
        if (spec.g === 'm') s += M.test(v.name) ? 3 : F.test(v.name) ? -3 : 0;
        if (/natural|online|neural/i.test(v.name)) s += 2;
        if (used.includes(v)) s -= 6;
        if (s > bs) { bs = s; best = v; }
      }
      return best;
    },
    cast(speakers) {
      const used = [], out = {}; let k = 0;
      for (const [id, spec] of Object.entries(speakers)) {
        const v = tts.choose({ accent: E.S.accent, ...spec }, used); if (v) used.push(v);
        out[id] = { voice: v, lang: v ? v.lang : E.S.accent, pitch: spec.pitch || 1, rate: spec.rate || 1 }; k++;
      }
      if (new Set(used).size < Object.keys(speakers).length) Object.keys(out).forEach((id, i) => { out[id].pitch = [1, .8, 1.2, .9][i % 4]; });
      return out;
    },
    stop() { if (tts.supported) speechSynthesis.cancel(); },
    say(text, { slow, g = 'f', onend } = {}) {
      if (!tts.supported) { E.toast('المتصفح لا يدعم النطق الصوتي'); if (onend) onend(); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text)); u.lang = E.S.accent; u.rate = (slow == null ? E.S.slow : slow) ? .7 : .95;
      const v = tts.choose({ accent: E.S.accent, g }); if (v) { u.voice = v; u.lang = v.lang; }
      if (onend) { u.onend = onend; u.onerror = onend; }
      speechSynthesis.speak(u);
    },
    play(lines, { cast = {}, slow, gap = 500, onLine, onEnd } = {}) {
      const ctl = { stopped: false, t: null, stop() { ctl.stopped = true; clearTimeout(ctl.t); tts.stop(); } };
      if (!tts.supported) { E.toast('المتصفح لا يدعم النطق الصوتي'); if (onEnd) onEnd(); return ctl; }
      const q = [];
      lines.forEach((ln, i) => { if (ln.pause) q.push({ pause: ln.pause, i }); else (String(ln.t).match(/[^.!?;]+[.!?;]*\s*/g) || [String(ln.t)]).map(x => x.trim()).filter(Boolean).forEach(c => q.push({ t: c, s: ln.s, i })); });
      let k = 0;
      const next = () => {
        if (ctl.stopped) return;
        if (k >= q.length) { if (onEnd) onEnd(); return; }
        const it = q[k++];
        if (it.pause) { ctl.t = setTimeout(next, it.pause); return; }
        if (onLine) onLine(it.i);
        const sp = cast[it.s] || {}, u = new SpeechSynthesisUtterance(it.t), rate = (slow == null ? E.S.slow : slow) ? .7 : .95;
        u.lang = sp.lang || E.S.accent; u.rate = rate * (sp.rate || 1); u.pitch = sp.pitch || 1; if (sp.voice) u.voice = sp.voice;
        let done = false;
        const go = () => { if (done || ctl.stopped) return; done = true; clearTimeout(wd); ctl.t = setTimeout(next, k < q.length && q[k].i !== it.i ? gap : 70); };
        const wd = setTimeout(go, it.t.length * 140 / u.rate + 5000);
        u.onend = go; u.onerror = ev => { if (ev.error === 'interrupted' || ev.error === 'canceled') return; go(); };
        speechSynthesis.speak(u);
      };
      speechSynthesis.cancel(); ctl.t = setTimeout(next, 60);
      return ctl;
    }
  };
  tts.load(); if (tts.supported) speechSynthesis.onvoiceschanged = tts.load;
  E.say = (t, o) => tts.say(t, o);
  /** 🔊 button markup; click handled globally */
  E.sayBtn = (text, cls = '') => `<button type="button" class="say ${cls}" data-say="${esc(text)}" aria-label="استمع / Listen" title="استمع / Listen">🔊</button>`;
  document.addEventListener('click', e => { const b = e.target.closest('[data-say]'); if (b) { e.preventDefault(); tts.say(b.dataset.say, { slow: b.dataset.slow === '1' ? true : undefined }); } });

  /* ---------- speech recognition (for speaking practice) ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  E.canListen = !!SR;
  /** Listen once; resolves {text} or {error}. */
  E.listen = ({ lang = 'en-US', max = 12000 } = {}) => new Promise(resolve => {
    if (!SR) return resolve({ error: 'unsupported' });
    const r = new SR(); r.lang = lang; r.interimResults = false; r.maxAlternatives = 3; let done = false;
    const fin = v => { if (done) return; done = true; clearTimeout(tm); try { r.stop(); } catch (_) { } resolve(v); };
    const tm = setTimeout(() => fin({ error: 'timeout' }), max);
    r.onresult = e => fin({ text: e.results[0][0].transcript, alts: [...e.results[0]].map(x => x.transcript) });
    r.onerror = e => fin({ error: e.error || 'error' });
    r.onend = () => fin({ error: 'nospeech' });
    try { r.start(); } catch (e) { fin({ error: 'start' }); }
  });
  /** Word-level comparison of what was said vs. the target sentence. */
  E.compare = (target, said) => {
    const a = toks(target), b = toks(said), n = a.length, m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { out.push(['ok', a[i]]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(['miss', a[i]]); i++; } else { out.push(['extra', b[j]]); j++; } }
    while (i < n) out.push(['miss', a[i++]]); while (j < m) out.push(['extra', b[j++]]);
    return { out, score: Math.round(100 * dp[0][0] / Math.max(n, 1)) };
  };
  E.diffHtml = d => `<span class="diff">${d.out.map(([t, w]) => `<span class="${t}">${esc(w)}</span>`).join(' ')}</span>`;

  /* ---------- sound effects (tiny WebAudio beeps) ---------- */
  let ac;
  E.beep = ok => {
    if (!E.S.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination);
      o.type = 'sine'; o.frequency.value = ok ? 660 : 220; g.gain.value = .06;
      const t = ac.currentTime; if (ok) o.frequency.setValueAtTime(880, t + .09);
      o.start(t); o.stop(t + (ok ? .2 : .25));
    } catch (e) { }
  };

  /* ---------- spaced repetition (Leitner boxes 1–5 → 1/3/7/14/30 days) ---------- */
  const INT = [0, 1, 3, 7, 14, 30];
  E.srs = {
    NEW_PER_DAY: 8,
    due: keys => { const t = dayIdx(); return keys.filter(k => E.S.vocab[k] && E.S.vocab[k].due <= t); },
    fresh: keys => { const used = E.S.newToday.day === dayIdx() ? E.S.newToday.n : 0; return keys.filter(k => !E.S.vocab[k]).slice(0, Math.max(0, E.srs.NEW_PER_DAY - used)); },
    answer(key, ok, failedSet) {
      const t = dayIdx(); let r = E.S.vocab[key];
      if (!r) { r = E.S.vocab[key] = { box: 0, due: t }; if (E.S.newToday.day !== t) E.S.newToday = { day: t, n: 0 }; E.S.newToday.n++; }
      if (ok && !failedSet.has(key)) { r.box = Math.min(5, r.box + 1); r.due = t + INT[r.box]; }
      else if (ok) { r.box = 1; r.due = t + 1; }
      else { failedSet.add(key); r.box = 1; r.due = t; }
      E.save();
    }
  };

  /* ---------- router ---------- */
  let cleanup = () => { };
  E.leaveGuard = null;
  E.onLeave = fn => { cleanup = fn || (() => { }); };
  E.register = (id, label, icon, render, order, hidden) => E.tabs.push({ id, label, icon, render, order: order == null ? 50 : order, hidden: !!hidden });
  E.show = (id, push = true) => {
    if (E.leaveGuard && !E.leaveGuard()) return false;
    E.leaveGuard = null; cleanup(); cleanup = () => { }; tts.stop();
    const tab = E.tabs.find(t => t.id === id) || E.tabs.find(t => t.id === 'home') || E.tabs[0];
    $('#nav').innerHTML = E.tabs.filter(t => !t.hidden).map(t => `<button data-t="${t.id}" class="${t.id === tab.id ? 'on' : ''}" ${t.id === tab.id ? 'aria-current="page"' : ''}><span class="ic" aria-hidden="true">${t.icon}</span><span>${t.label}</span></button>`).join('');
    $$('#nav button').forEach(b => b.onclick = () => E.show(b.dataset.t));
    $('#xpchip').textContent = '⭐ ' + E.S.xp; $('#streakchip').textContent = '🔥 ' + E.streak();
    E.currentId = tab.id;
    if (push && location.hash !== '#/' + tab.id) { E.silentHash = true; location.hash = '#/' + tab.id; }
    tab.render();
    window.scrollTo(0, 0);
    return true;
  };
  window.addEventListener('hashchange', () => {
    if (E.silentHash) { E.silentHash = false; return; }
    const id = location.hash.replace('#/', '') || 'home';
    if (!E.show(id, false)) { E.silentHash = true; location.hash = '#/' + (E.currentId || 'home'); }
  });
})();

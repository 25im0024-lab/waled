/* IELTS Coach — core: helpers, store, speech, timers, band tables, router. Classic script (works from file://). */
(function () {
  'use strict';
  const I = (window.IELTS = { data: {}, tabs: [], mod: {} });

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const dayIdx = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5); };
  const dayKey = d => d.toLocaleDateString('en-CA');
  const fmt = s => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const toks = s => String(s).toLowerCase().replace(/[’]/g, "'").match(/[a-z0-9]+(?:'[a-z]+)?/g) || [];
  const wordCount = s => (String(s).match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
  Object.assign(I, { $, $$, esc, shuffle, pick, dayIdx, dayKey, fmt, norm, toks, wordCount });

  I.copy = async text => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { }
      ta.remove(); return ok;
    }
  };
  I.download = (name, text, type = 'application/json') => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  let toastT;
  I.toast = msg => {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
  };

  /* ---------- persistent store ---------- */
  const KEY = 'ielts_coach_v2';
  const defaults = () => ({
    target: 7, exam: '', vocab: {}, custom: [], deckSel: 'core', newToday: { day: 0, n: 0 },
    grammar: { right: 0, total: 0, wrong: {}, byCat: {} }, days: {},
    writing: [], speaking: [], reading: [], listening: [], mocks: [], plan: null
  });
  function load() {
    try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { return defaults(); }
  }
  I.S = load();
  I.save = () => { try { localStorage.setItem(KEY, JSON.stringify(I.S)); } catch (e) { } };
  I.replaceState = obj => { I.S = Object.assign(defaults(), obj); I.save(); };
  I.resetState = () => { I.S = defaults(); I.save(); };
  I.mark = () => { const k = dayKey(new Date()); I.S.days[k] = (I.S.days[k] || 0) + 1; I.save(); };
  I.streak = () => {
    let n = 0; const d = new Date();
    if (!I.S.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (I.S.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };
  I.addHistory = (list, rec, cap = 200) => { const a = I.S[list]; a.push(rec); if (a.length > cap) a.splice(0, a.length - cap); I.save(); };

  /* ---------- band tables ---------- */
  // Approximate Academic raw-score → band conversions (they vary slightly between test versions;
  // IELTS does not publish a single fixed table — see ielts.org). Raw below 10 → shown as "<4".
  const LIS = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4]];
  const REA = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4]];
  I.band = {
    roundHalf: x => Math.round(x * 2) / 2,              // .25 → .5, .75 → next whole (IELTS convention)
    overall: arr => { const v = arr.filter(x => typeof x === 'number'); return v.length ? Math.round(v.reduce((a, c) => a + c, 0) / v.length * 2) / 2 : null; },
    fromRaw(type, raw, of = 40) {
      const t = type === 'listening' ? LIS : REA;
      const r = of === 40 ? raw : Math.round(raw / of * 40);   // scale shorter practice sets to 40
      for (const [m, b] of t) if (r >= m) return b;
      return null;
    },
    label: b => b == null ? '<4.0' : b.toFixed(1)
  };

  /* ---------- timers ---------- */
  I.timer = (el, { onTick, onEnd, warnAt = 300 } = {}) => {
    let id = null, end = 0, left = 0;
    const draw = () => { el.textContent = fmt(left); el.classList.toggle('low', id !== null && left <= warnAt); };
    const api = {
      start(sec) {
        api.stop(); left = sec; end = Date.now() + sec * 1000; draw();
        id = setInterval(() => {
          left = Math.max(0, Math.ceil((end - Date.now()) / 1000)); draw();
          if (onTick) onTick(left);
          if (left <= 0) { api.stop(); if (onEnd) onEnd(); }
        }, 250);
      },
      stop() { clearInterval(id); id = null; el.classList.remove('low'); },
      set(sec) { left = sec; draw(); },
      get left() { return left; },
      get running() { return id !== null; }
    };
    return api;
  };

  /* ---------- speech synthesis (multi-voice) ---------- */
  const tts = I.tts = {
    supported: !!window.speechSynthesis, voices: [],
    load() { if (tts.supported) tts.voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); },
    options() { return tts.voices.map(v => `<option value="${esc(v.name)}">${esc(v.name)} (${esc(v.lang)})</option>`).join('') || '<option value="">default</option>'; },
    byName(n) { return tts.voices.find(v => v.name === n); },
    /** Choose a voice for a speaker spec {g:'f'|'m', accent:'GB'|'US'|'AU'}; `used` = voices already assigned. */
    choose(spec, used = []) {
      const F = /(sonia|libby|hazel|susan|kate|serena|fiona|karen|samantha|zira|aria|jenny|olivia|natasha|emma|amy|female|moira|tessa)/i;
      const M = /(ryan|thomas|george|daniel|oliver|alfie|arthur|james|guy|davis|male|david|mark|rishi|lee|gordon)/i;
      let best = null, bs = -1;
      for (const v of tts.voices) {
        let s = 0;
        if (spec.accent && v.lang.replace('_', '-').toUpperCase().endsWith(spec.accent)) s += 4;
        if (spec.g === 'f' && F.test(v.name)) s += 3;
        if (spec.g === 'm' && M.test(v.name)) s += 3;
        if (spec.g === 'f' && M.test(v.name)) s -= 3;
        if (spec.g === 'm' && F.test(v.name)) s -= 3;
        if (/natural|online|neural/i.test(v.name)) s += 2;
        if (used.includes(v)) s -= 6;
        if (s > bs) { bs = s; best = v; }
      }
      return best;
    },
    /** Build {speaker → {voice,pitch,rate}} for a script. speakers: {A:{g:'f'},B:{g:'m'}} */
    cast(speakers, pref = '') {
      const used = [], out = {};
      let k = 0;
      for (const [id, spec] of Object.entries(speakers)) {
        const v = pref && tts.byName(pref) && k === 0 ? tts.byName(pref) : tts.choose({ accent: 'GB', ...spec }, used);
        if (v) used.push(v);
        out[id] = { voice: v, lang: v ? v.lang : 'en-GB', pitch: spec.pitch || 1, rate: spec.rate || 1 };
        k++;
      }
      // if fewer distinct voices than speakers, separate them by pitch
      if (new Set(used).size < Object.keys(speakers).length) {
        const ids = Object.keys(out); ids.forEach((id, i) => { out[id].pitch = [1, 0.8, 1.2, 0.9][i % 4]; });
      }
      return out;
    },
    stop() { if (tts.supported) speechSynthesis.cancel(); },
    say(text, { rate = .95, voice = '', onend } = {}) {
      if (!tts.supported) { I.toast('المتصفح لا يدعم النطق الصوتي (speechSynthesis).'); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = rate;
      const v = tts.byName(voice) || tts.choose({ accent: 'GB', g: 'f' }); if (v) { u.voice = v; u.lang = v.lang; }
      if (onend) u.onend = onend;
      speechSynthesis.speak(u);
    },
    /** Play script lines [{s,t}|{pause:ms}] sequentially. Returns controller with stop(). */
    play(lines, { cast = {}, rate = 1, gap = 450, onLine, onEnd } = {}) {
      const ctl = { stopped: false, t: null, stop() { ctl.stopped = true; clearTimeout(ctl.t); tts.stop(); } };
      if (!tts.supported) { I.toast('المتصفح لا يدعم النطق الصوتي.'); return ctl; }
      const chunk = t => (String(t).match(/[^.!?;]+[.!?;]*\s*/g) || [String(t)]).map(x => x.trim()).filter(Boolean);
      const queue = [];
      lines.forEach((ln, i) => { if (ln.pause) queue.push({ pause: ln.pause, i }); else chunk(ln.t).forEach(c => queue.push({ t: c, s: ln.s, i })); });
      let k = 0;
      const next = () => {
        if (ctl.stopped) return;
        if (k >= queue.length) { if (onEnd) onEnd(); return; }
        const it = queue[k++];
        if (it.pause) { ctl.t = setTimeout(next, it.pause); return; }
        if (onLine) onLine(it.i);
        const sp = cast[it.s] || {};
        const u = new SpeechSynthesisUtterance(it.t);
        u.lang = sp.lang || 'en-GB'; u.rate = (sp.rate || 1) * rate; u.pitch = sp.pitch || 1; if (sp.voice) u.voice = sp.voice;
        let done = false;
        const go = () => { if (done || ctl.stopped) return; done = true; clearTimeout(wd); ctl.t = setTimeout(next, k < queue.length && queue[k].i !== it.i ? gap : 80); };
        const wd = setTimeout(go, it.t.length * 130 / (u.rate || 1) + 5000);   // watchdog for browsers that drop onend
        u.onend = go; u.onerror = e => { if (e.error === 'interrupted' || e.error === 'canceled') return; go(); };
        speechSynthesis.speak(u);
      };
      speechSynthesis.cancel(); ctl.t = setTimeout(next, 60);
      return ctl;
    }
  };
  tts.load(); if (tts.supported) speechSynthesis.onvoiceschanged = tts.load;

  /* ---------- router ---------- */
  let cleanup = () => { };
  I.leaveGuard = null;
  I.onLeave = fn => { cleanup = fn || (() => { }); };
  I.register = (id, label, render) => I.tabs.push({ id, label, render });
  I.show = (id, push = true) => {
    if (I.leaveGuard && !I.leaveGuard()) { return false; }
    I.leaveGuard = null; cleanup(); cleanup = () => { }; tts.stop();
    const tab = I.tabs.find(t => t.id === id) || I.tabs[0];
    $('#nav').innerHTML = I.tabs.map(t => `<button data-t="${t.id}" class="${t.id === tab.id ? 'on' : ''}" ${t.id === tab.id ? 'aria-current="page"' : ''}>${t.label}</button>`).join('');
    $$('#nav button').forEach(b => b.onclick = () => I.show(b.dataset.t));
    $('#topinfo').textContent = `Streak ${I.streak()} يوم · الهدف Band ${I.S.target}`;
    if (push && location.hash !== '#/' + tab.id) { I.silentHash = true; location.hash = '#/' + tab.id; }
    tab.render();
    window.scrollTo(0, 0);
    return true;
  };
  window.addEventListener('hashchange', () => {
    if (I.silentHash) { I.silentHash = false; return; }
    const id = location.hash.replace('#/', '') || 'home';
    if (!I.show(id, false)) { I.silentHash = true; location.hash = '#/' + (I.currentId || 'home'); }
  });
  const origShow = I.show;
  I.show = (id, push) => { const ok = origShow(id, push); if (ok) I.currentId = id; return ok; };
  window.addEventListener('beforeunload', e => { if (I.leaveGuard && I.examActive) { e.preventDefault(); e.returnValue = ''; } });
})();

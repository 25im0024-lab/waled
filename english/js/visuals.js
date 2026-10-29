/* English Hub — visual engine: SVG helpers and interactive teaching widgets.
   Widgets: prepositions, clock, timeline (tenses), family, compare, directions. Each is bilingual and speaks. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc } = E;
  const V = (E.vis = {});

  /* ---------- SVG primitives ---------- */
  V.R = (x, y, w, h, f, rx = 0, x2 = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${x2}/>`;
  V.C = (cx, cy, r, f, x2 = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${x2}/>`;
  V.El = (cx, cy, rx, ry, f, x2 = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${x2}/>`;
  V.P = (d, f, x2 = '') => `<path d="${d}" fill="${f}" ${x2}/>`;
  V.L = (x1, y1, x2, y2, s, w = 2, x3 = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" stroke-linecap="round" ${x3}/>`;
  V.T = (x, y, t, size = 14, f = '#1b2430', anchor = 'middle', x2 = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${f}" text-anchor="${anchor}" font-family="system-ui,Segoe UI,Arial" ${x2}>${esc(t)}</text>`;
  V.EM = (x, y, emoji, size = 28) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${emoji}</text>`;

  const bilingualLine = (en, ar) => `<div class="sentence-big">${esc(en)} ${E.sayBtn(en)}</div><div class="ar" style="text-align:center;font-size:1.1rem;color:var(--muted)">${esc(ar)}</div>`;

  /* ================= 1. PREPOSITIONS ================= */
  const PREP = {
    box: {
      in: ['The ball is in the box.', 'الكرة داخل الصندوق.'], on: ['The ball is on the box.', 'الكرة فوق الصندوق (على سطحه).'],
      'in front of': ['The ball is in front of the box.', 'الكرة أمام الصندوق.'], behind: ['The ball is behind the box.', 'الكرة خلف الصندوق.'],
      'next to': ['The ball is next to the box.', 'الكرة بجانب الصندوق.'], between: ['The ball is between the boxes.', 'الكرة بين الصندوقين.'],
      above: ['The ball is above the box.', 'الكرة فوق الصندوق (في الهواء).']
    },
    table: {
      on: ['The ball is on the table.', 'الكرة فوق الطاولة (على سطحها).'], under: ['The ball is under the table.', 'الكرة تحت الطاولة.'],
      above: ['The ball is above the table.', 'الكرة فوق الطاولة (في الهواء).'], 'next to': ['The ball is next to the table.', 'الكرة بجانب الطاولة.'],
      'in front of': ['The ball is in front of the table.', 'الكرة أمام الطاولة.']
    }
  };
  function prepScene(obj, p) {
    const floor = V.R(0, 200, 400, 40, '#e8d9b5') + V.L(0, 200, 400, 200, '#cdb98a', 2);
    const ball = (x, y) => `<g class="ball">${V.C(x, y, 20, '#ef4444')}${V.P(`M${x - 12} ${y - 8}a14 14 0 0 1 12 -8`, 'none', 'stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"')}</g>`;
    if (obj === 'box') {
      const back = V.R(150, 110, 100, 90, '#8f5f26', 4) + V.R(158, 116, 84, 84, '#6f4720', 2);
      const front = V.R(150, 150, 100, 50, '#d9a15c', 4) + V.L(150, 150, 250, 150, '#a56f35', 3);
      const full = V.R(150, 110, 100, 90, '#d9a15c', 4) + V.L(150, 126, 250, 126, '#a56f35', 3) + V.R(188, 150, 24, 8, '#a56f35', 3);
      const spots = { on: [200, 90], above: [200, 44], 'next to': [300, 178], 'in front of': [205, 188] };
      if (p === 'in') return floor + back + ball(200, 138) + front;
      if (p === 'behind') return floor + ball(228, 104) + full;
      if (p === 'between') return floor + V.R(52, 120, 84, 80, '#d9a15c', 4) + V.R(264, 120, 84, 80, '#d9a15c', 4) + ball(200, 178);
      const s = spots[p] || [200, 90]; return floor + full + ball(s[0], s[1]);
    }
    const table = V.R(110, 108, 180, 16, '#8b5a2b', 4) + V.R(122, 124, 12, 76, '#6f4720', 2) + V.R(266, 124, 12, 76, '#6f4720', 2);
    const spots = { on: [200, 88], above: [200, 44], under: [200, 178], 'next to': [330, 178], 'in front of': [200, 205] };
    const s = spots[p] || [200, 88];
    return floor + (p === 'in front of' ? table + ball(s[0], s[1]) : table + ball(s[0], s[1]));
  }
  V.prepositions = el => {
    let obj = 'box', p = 'in';
    el.innerHTML = `<div class="widget"><div class="seg" data-obj><button data-o="box" class="on">📦 صندوق · Box</button><button data-o="table">🪑 طاولة · Table</button></div>
      <svg viewBox="0 0 400 240" role="img" aria-label="ball and box"></svg><div class="seg" data-preps style="margin:6px 0"></div><div data-sent></div>
      <div class="row" style="justify-content:center"><button class="primary" data-quiz>🎯 اختبرني · Quiz me</button></div></div>`;
    const svg = $('svg', el);
    const draw = () => {
      if (!PREP[obj][p]) p = Object.keys(PREP[obj])[0];
      svg.innerHTML = V.R(0, 0, 400, 240, '#eaf4ff') + prepScene(obj, p);
      const b = $('.ball', svg); if (b) b.style.animation = 'pop .4s';
      $('[data-preps]', el).innerHTML = Object.keys(PREP[obj]).map(k => `<button data-p="${k}" class="${k === p ? 'on' : ''}">${k}</button>`).join('');
      const [en, ar] = PREP[obj][p]; $('[data-sent]', el).innerHTML = bilingualLine(en, ar);
      $$('[data-p]', el).forEach(b => b.onclick = () => { p = b.dataset.p; draw(); E.say(PREP[obj][p][0]); });
    };
    $$('[data-o]', el).forEach(b => b.onclick = () => { obj = b.dataset.o; $$('[data-o]', el).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $('[data-quiz]', el).onclick = () => {
      const keys = Object.keys(PREP[obj]); let tries = 0, target = E.pick(keys);
      p = target; svg.innerHTML = V.R(0, 0, 400, 240, '#eaf4ff') + prepScene(obj, p);
      const choices = E.shuffle(keys).slice(0, 4); if (!choices.includes(target)) choices[0] = target;
      $('[data-sent]', el).innerHTML = `<div class="sentence-big">The ball is ____ the ${obj}.</div><div class="muted" style="text-align:center">أين الكرة؟ Where is the ball?</div>`;
      $('[data-preps]', el).innerHTML = E.shuffle(choices).map(k => `<button data-c="${k}">${k}</button>`).join('');
      $$('[data-c]', el).forEach(b => b.onclick = () => { if (b.dataset.c === target) { E.beep(true); E.xp(2); $('[data-sent]', el).innerHTML = bilingualLine(...PREP[obj][target]); E.say(PREP[obj][target][0]); $$('[data-c]', el).forEach(x => x.disabled = true); } else { E.beep(false); b.classList.add('bad'); tries++; } });
    };
    draw();
  };

  /* ================= 2. CLOCK ================= */
  const NUM_EN = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const MIN_EN = { 5: 'five', 10: 'ten', 20: 'twenty', 25: 'twenty-five' };
  const AR_H = ['', 'الواحدة', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشرة', 'الثانية عشرة'];
  const AR_PAST = { 5: 'وخمس دقائق', 10: 'وعشر دقائق', 20: 'والثلث', 25: 'وخمس وعشرين دقيقة' };
  const AR_TO = { 35: 'إلا خمسًا وعشرين دقيقة', 40: 'إلا ثلثًا', 50: 'إلا عشر دقائق', 55: 'إلا خمس دقائق' };
  V.timeWords = (h, m) => {
    const hh = h % 12 || 12, nx = (h + 1) % 12 || 12; let en, ar;
    if (m === 0) { en = `It's ${NUM_EN[hh]} o'clock.`; ar = `الساعة ${AR_H[hh]} تمامًا.`; }
    else if (m === 15) { en = `It's quarter past ${NUM_EN[hh]}.`; ar = `الساعة ${AR_H[hh]} والربع.`; }
    else if (m === 30) { en = `It's half past ${NUM_EN[hh]}.`; ar = `الساعة ${AR_H[hh]} والنصف.`; }
    else if (m === 45) { en = `It's quarter to ${NUM_EN[nx]}.`; ar = `الساعة ${AR_H[nx]} إلا ربعًا.`; }
    else if (m < 30) { en = `It's ${MIN_EN[m]} past ${NUM_EN[hh]}.`; ar = `الساعة ${AR_H[hh]} ${AR_PAST[m]}.`; }
    else { en = `It's ${MIN_EN[60 - m]} to ${NUM_EN[nx]}.`; ar = `الساعة ${AR_H[nx]} ${AR_TO[m]}.`; }
    return [en, ar];
  };
  V.clock = el => {
    let h = 3, m = 0, task = null;
    el.innerHTML = `<div class="widget" style="text-align:center"><svg viewBox="0 0 260 260" style="max-width:260px;margin:0 auto" role="img" aria-label="clock"></svg>
      <div class="mono" data-dig dir="ltr" style="font-size:1.6rem;font-weight:800;font-family:Consolas,monospace"></div><div data-sent></div>
      <div class="row" style="justify-content:center"><button data-h="-1">− ساعة · hour</button><button data-h="1">+ ساعة · hour</button><button data-m="-5">− 5 min</button><button data-m="5">+ 5 min</button></div>
      <div class="seg"><button data-pre="0:0">o'clock</button><button data-pre="0:15">quarter past</button><button data-pre="0:30">half past</button><button data-pre="0:45">quarter to</button></div>
      <div class="row" style="justify-content:center"><button class="primary" data-chal>🎯 تحدٍّ: اضبط الساعة · Set the clock</button></div><div data-task></div></div>`;
    const svg = $('svg', el);
    const draw = () => {
      let s = V.C(130, 130, 120, '#fff', 'stroke="#1b2430" stroke-width="6"') + V.C(130, 130, 5, '#1b2430');
      for (let k = 0; k < 60; k++) { const a = k * 6 * Math.PI / 180, r1 = k % 5 ? 112 : 106; s += V.L(130 + r1 * Math.sin(a), 130 - r1 * Math.cos(a), 130 + 116 * Math.sin(a), 130 - 116 * Math.cos(a), '#1b2430', k % 5 ? 1 : 3); }
      for (let n = 1; n <= 12; n++) { const a = n * 30 * Math.PI / 180; s += V.T(130 + 90 * Math.sin(a), 130 - 90 * Math.cos(a) + 6, n, 18, '#1b2430'); }
      const ha = ((h % 12) + m / 60) * 30 * Math.PI / 180, ma = m * 6 * Math.PI / 180;
      s += V.L(130, 130, 130 + 55 * Math.sin(ha), 130 - 55 * Math.cos(ha), '#2563eb', 8) + V.L(130, 130, 130 + 85 * Math.sin(ma), 130 - 85 * Math.cos(ma), '#ef4444', 5) + V.C(130, 130, 7, '#1b2430');
      svg.innerHTML = s;
      $('[data-dig]', el).textContent = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h % 24 < 12 ? 'AM' : 'PM'}`;
      if (!task) { const [en, ar] = V.timeWords(h, m); $('[data-sent]', el).innerHTML = bilingualLine(en, ar); }
    };
    const set = (dh, dm) => { m += dm; if (m >= 60) { m -= 60; h++; } if (m < 0) { m += 60; h--; } h = ((h + dh) % 24 + 24) % 24; draw(); if (!task) E.say(V.timeWords(h, m)[0]); };
    $$('[data-h]', el).forEach(b => b.onclick = () => set(+b.dataset.h, 0));
    $$('[data-m]', el).forEach(b => b.onclick = () => set(0, +b.dataset.m));
    $$('[data-pre]', el).forEach(b => b.onclick = () => { m = +b.dataset.pre.split(':')[1]; draw(); E.say(V.timeWords(h, m)[0]); });
    $('[data-chal]', el).onclick = () => {
      const th = 1 + Math.floor(Math.random() * 12), tm = E.pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]); task = { h: th, m: tm };
      $('[data-sent]', el).innerHTML = `<div class="sentence-big">${esc(V.timeWords(th, tm)[0])}</div><div class="muted">اضبط الساعة على هذا الوقت ثم اضغط تحقّق · Set the clock, then check</div>`;
      $('[data-task]', el).innerHTML = `<button class="primary" data-ck>تحقّق · Check</button>`;
      $('[data-ck]', el).onclick = () => { const ok = (h % 12 || 12) === th && m === tm; E.beep(ok); if (ok) { E.xp(3); task = null; $('[data-task]', el).innerHTML = '<p class="ok">✅ أحسنت! Correct!</p>'; draw(); } else E.toast('حاول مرة أخرى · Try again'); };
    };
    draw();
  };

  /* ================= 3. TENSE TIMELINE ================= */
  const TL = [
    { id: 'present simple', en: 'Present simple', ar: 'المضارع البسيط', ex: ['I work every day.', 'أعمل كل يوم.'], note: 'عادات وحقائق · habits and facts',
      draw: () => [95, 150, 205, 260, 315].map(x => V.C(x, 100, 7, '#2563eb')).join('') + V.T(205, 70, 'every day · usually', 13, '#2563eb') },
    { id: 'present continuous', en: 'Present continuous', ar: 'المضارع المستمر', ex: ['I am working now.', 'أنا أعمل الآن.'], note: 'يحدث الآن · happening now',
      draw: () => V.R(172, 80, 56, 40, '#bfdbfe', 8, 'stroke="#2563eb" stroke-width="3"') + V.T(200, 66, 'now · at the moment', 13, '#2563eb') },
    { id: 'past simple', en: 'Past simple', ar: 'الماضي البسيط', ex: ['I worked yesterday.', 'عملتُ أمس.'], note: 'حدث انتهى في الماضي · finished',
      draw: () => V.C(90, 100, 9, '#dc2626') + V.T(90, 72, 'yesterday', 13, '#dc2626') },
    { id: 'past continuous', en: 'Past continuous', ar: 'الماضي المستمر', ex: ['I was working at 8 pm.', 'كنتُ أعمل عند الثامنة مساءً.'], note: 'كان مستمرًا في الماضي · was in progress',
      draw: () => V.R(62, 82, 90, 36, '#fecaca', 8, 'stroke="#dc2626" stroke-width="3"') + V.T(107, 68, 'at 8 pm', 13, '#dc2626') },
    { id: 'present perfect', en: 'Present perfect', ar: 'المضارع التام', ex: ['I have worked here for 3 years.', 'عملتُ هنا منذ ثلاث سنوات.'], note: 'الماضي يرتبط بالحاضر · past → now',
      draw: () => V.P('M90 100 Q145 40 200 100', 'none', 'stroke="#7c3aed" stroke-width="4" stroke-dasharray="6 5"') + V.C(90, 100, 7, '#7c3aed') + V.C(200, 100, 7, '#7c3aed') + V.T(145, 52, 'for · since · already · ever', 12, '#7c3aed') },
    { id: 'going to', en: 'Future: going to', ar: 'المستقبل: going to', ex: ['I am going to work tomorrow.', 'سأعمل غدًا (خطة).'], note: 'خطة أو نية · plan',
      draw: () => V.C(300, 100, 9, '#16a34a') + V.T(300, 72, 'tomorrow', 13, '#16a34a') + V.P('M215 100 L285 100', 'none', 'stroke="#16a34a" stroke-width="3" marker-end="url(#ar)"') },
    { id: 'will', en: 'Future: will', ar: 'المستقبل: will', ex: ['I will help you.', 'سأساعدك (قرار لحظي).'], note: 'قرار لحظي أو توقّع · decision / prediction',
      draw: () => V.C(330, 100, 9, '#0d9488') + V.T(330, 72, 'soon · next year', 13, '#0d9488') + V.P('M215 100 L305 100', 'none', 'stroke="#0d9488" stroke-width="3" stroke-dasharray="4 4"') }
  ];
  V.timeline = (el, only) => {
    const list = only ? TL.filter(t => only.includes(t.id)) : TL; let cur = list[0];
    el.innerHTML = `<div class="widget"><div class="seg" data-chips>${list.map(t => `<button data-id="${t.id}">${t.en}</button>`).join('')}</div>
      <svg viewBox="0 0 400 170" role="img" aria-label="timeline"></svg><div data-sent></div></div>`;
    const svg = $('svg', el);
    const draw = () => {
      svg.innerHTML = `<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#16a34a"/></marker></defs>` +
        V.R(0, 0, 400, 170, '#f7fbff') + V.L(20, 100, 380, 100, '#1b2430', 4) + V.P('M380 100l-12 -7v14z', '#1b2430') +
        V.L(200, 90, 200, 112, '#1b2430', 3) + V.T(200, 135, 'NOW · الآن', 14, '#1b2430') + V.T(70, 135, 'PAST · الماضي', 13, '#dc2626') + V.T(335, 135, 'FUTURE · المستقبل', 13, '#16a34a') + cur.draw();
      $$('[data-id]', el).forEach(b => b.classList.toggle('on', b.dataset.id === cur.id));
      $('[data-sent]', el).innerHTML = `<div class="sentence-big">${esc(cur.ex[0])} ${E.sayBtn(cur.ex[0])}</div><div class="ar" style="text-align:center;font-size:1.1rem;color:var(--muted)">${esc(cur.ex[1])}</div><div class="muted" style="text-align:center">${esc(cur.note)}</div>`;
    };
    $$('[data-id]', el).forEach(b => b.onclick = () => { cur = list.find(t => t.id === b.dataset.id); draw(); E.say(cur.ex[0]); });
    draw();
  };

  /* ================= 4. FAMILY TREE ================= */
  const FAM = [
    { id: 'grandfather', e: '👴', en: 'grandfather', ar: 'جدّ', x: 110, y: 40, my: 'my grandfather', arMy: 'جدّي' },
    { id: 'grandmother', e: '👵', en: 'grandmother', ar: 'جدّة', x: 230, y: 40, my: 'my grandmother', arMy: 'جدّتي' },
    { id: 'uncle', e: '🧔', en: 'uncle', ar: 'عمّ / خال', x: 40, y: 125, my: 'my uncle', arMy: 'عمّي / خالي' },
    { id: 'father', e: '👨', en: 'father', ar: 'أب', x: 130, y: 125, my: 'my father', arMy: 'أبي' },
    { id: 'mother', e: '👩', en: 'mother', ar: 'أم', x: 210, y: 125, my: 'my mother', arMy: 'أمّي' },
    { id: 'aunt', e: '👩‍🦰', en: 'aunt', ar: 'عمّة / خالة', x: 300, y: 125, my: 'my aunt', arMy: 'عمّتي / خالتي' },
    { id: 'cousin', e: '🧒', en: 'cousin', ar: 'ابن/ابنة العم أو الخال', x: 40, y: 215, my: 'my cousin', arMy: 'ابن عمّي / خالي' },
    { id: 'brother', e: '👦', en: 'brother', ar: 'أخ', x: 100, y: 215, my: 'my brother', arMy: 'أخي' },
    { id: 'me', e: '🧑', en: 'me', ar: 'أنا', x: 170, y: 215, my: 'me', arMy: 'أنا' },
    { id: 'sister', e: '👧', en: 'sister', ar: 'أخت', x: 240, y: 215, my: 'my sister', arMy: 'أختي' }
  ];
  V.family = el => {
    el.innerHTML = `<div class="widget"><svg viewBox="0 0 400 270" role="img" aria-label="family tree"></svg><div data-sent class="scenecard"><span class="muted">اضغط على أي شخص · Tap a person</span></div>
      <div class="row" style="justify-content:center"><button class="primary" data-q>🎯 من هذا؟ · Who is this?</button></div></div>`;
    const svg = $('svg', el); let target = null;
    const draw = (sel) => {
      const K = '#a16207';
      let s = V.R(0, 0, 400, 270, '#fff8ec') + V.L(136, 40, 204, 40, K, 2, 'stroke-dasharray="3 4"') + V.L(170, 40, 170, 85, K, 3) + V.L(40, 85, 300, 85, K, 3) + [40, 130, 300].map(x => V.L(x, 85, x, 99, K, 3)).join('') +
        V.L(156, 125, 184, 125, K, 2, 'stroke-dasharray="3 4"') + V.L(170, 125, 170, 170, K, 3) + V.L(100, 170, 240, 170, K, 3) + [100, 170, 240].map(x => V.L(x, 170, x, 189, K, 3)).join('') + V.L(40, 151, 40, 189, K, 3);
      FAM.forEach(f => { s += `<g class="obj ${sel === f.id ? 'sel' : ''}" data-id="${f.id}" tabindex="0" role="button" aria-label="${f.en}" style="cursor:pointer">${V.C(f.x, f.y, 26, sel === f.id ? '#fde68a' : '#fff', 'stroke="#a16207" stroke-width="3"')}${V.EM(f.x, f.y, f.e, 30)}${V.T(f.x, f.y + 42, f.en, 12, '#1b2430')}</g>`; });
      svg.innerHTML = s;
      $$('.obj', svg).forEach(g => { const f = FAM.find(x => x.id === g.dataset.id); const act = () => { if (target) return guess(f); draw(f.id); show(f); }; g.onclick = act; g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } }; });
    };
    const show = f => { const en = f.id === 'me' ? "This is me." : `This is ${f.my}.`; $('[data-sent]', el).innerHTML = `<span style="font-size:2.6rem">${f.e}</span><div style="flex:1"><div class="sentence-big" style="text-align:left;font-size:1.3rem">${esc(en)}</div><div class="ar" style="font-size:1.1rem">${esc(f.id === 'me' ? 'هذا أنا.' : 'هذا/هذه ' + f.arMy + '.')}</div></div>${E.sayBtn(en, 'big')}`; E.say(en); };
    const guess = f => { if (f.id === target.id) { E.beep(true); E.xp(2); draw(f.id); $('[data-sent]', el).innerHTML = `<b class="ok">✅ Yes! ${esc(target.my)}</b>`; E.say(`This is ${target.my}.`); target = null; } else { E.beep(false); E.toast('جرّب شخصًا آخر · Try another person'); } };
    $('[data-q]', el).onclick = () => { target = E.pick(FAM.filter(f => f.id !== 'me')); draw(); $('[data-sent]', el).innerHTML = `<div class="sentence-big" style="font-size:1.3rem">Tap ${esc(target.my)}. ${E.sayBtn('Tap ' + target.my + '.')}</div><div class="ar">اضغط على ${esc(target.arMy)}</div>`; E.say('Tap ' + target.my + '.'); };
    draw();
  };

  /* ================= 5. COMPARATIVES ================= */
  const CMP = [
    { adj: 'tall', c: 'taller', s: 'the tallest', ar: ['طويل', 'أطول', 'الأطول'], emoji: '🧍' },
    { adj: 'short', c: 'shorter', s: 'the shortest', ar: ['قصير', 'أقصر', 'الأقصر'], emoji: '🧍' },
    { adj: 'big', c: 'bigger', s: 'the biggest', ar: ['كبير', 'أكبر', 'الأكبر'], emoji: '🐘' },
    { adj: 'fast', c: 'faster', s: 'the fastest', ar: ['سريع', 'أسرع', 'الأسرع'], emoji: '🚗' },
    { adj: 'cheap', c: 'cheaper', s: 'the cheapest', ar: ['رخيص', 'أرخص', 'الأرخص'], emoji: '🏷️' },
    { adj: 'expensive', c: 'more expensive', s: 'the most expensive', ar: ['غالٍ', 'أغلى', 'الأغلى'], emoji: '💎' },
    { adj: 'good', c: 'better', s: 'the best', ar: ['جيّد', 'أفضل', 'الأفضل'], emoji: '👍' },
    { adj: 'old', c: 'older', s: 'the oldest', ar: ['كبير في السن / قديم', 'أكبر سنًا / أقدم', 'الأكبر سنًا / الأقدم'], emoji: '🏛️' }
  ];
  V.compare = el => {
    let cur = CMP[0]; const names = ['Sam', 'Tom', 'Ali'];
    el.innerHTML = `<div class="widget"><div class="seg" data-adj>${CMP.map(c => `<button data-a="${c.adj}">${c.adj}</button>`).join('')}</div><svg viewBox="0 0 400 230" role="img" aria-label="comparison bars"></svg><div data-sent></div></div>`;
    const svg = $('svg', el);
    const draw = () => {
      const hs = [60, 105, 150]; let s = V.R(0, 0, 400, 230, '#f4fbf6') + V.L(30, 190, 370, 190, '#1b2430', 3);
      hs.forEach((h, i) => { const x = 60 + i * 110; s += V.R(x, 190 - h, 70, h, ['#93c5fd', '#60a5fa', '#2563eb'][i], 8) + V.EM(x + 35, 190 - h - 20, cur.emoji, 30 + i * 6) + V.T(x + 35, 212, names[i], 15, '#1b2430'); });
      svg.innerHTML = s;
      $$('[data-a]', el).forEach(b => b.classList.toggle('on', b.dataset.a === cur.adj));
      const lines = [[`Sam is ${cur.adj}.`, `سام ${cur.ar[0]}.`], [`Tom is ${cur.c} than Sam.`, `توم ${cur.ar[1]} من سام.`], [`Ali is ${cur.s}.`, `علي ${cur.ar[2]}.`]];
      $('[data-sent]', el).innerHTML = lines.map(l => `<div class="ex-item"><span class="en" dir="ltr"><b>${esc(l[0])}</b></span><span class="ar" style="flex:1">${esc(l[1])}</span>${E.sayBtn(l[0])}</div>`).join('') +
        `<div class="muted" style="margin-top:6px">${cur.c.startsWith('more') ? 'الصفات الطويلة: more + صفة · the most + صفة' : 'الصفات القصيرة: صفة + er · the + صفة + est'}</div>`;
    };
    $$('[data-a]', el).forEach(b => b.onclick = () => { cur = CMP.find(c => c.adj === b.dataset.a); draw(); E.say(`${cur.adj}, ${cur.c}, ${cur.s}`); });
    draw();
  };

  /* ================= 6. DIRECTIONS ================= */
  const MAP = {
    places: [{ e: '🏦', n: 'bank', x: 160, y: 170 }, { e: '🏥', n: 'hospital', x: 270, y: 165 }, { e: '🛒', n: 'supermarket', x: 360, y: 65 }, { e: '🏫', n: 'school', x: 245, y: 58 }, { e: '🌳', n: 'park', x: 70, y: 175 }, { e: '☕', n: 'café', x: 60, y: 65 }, { e: '💊', n: 'pharmacy', x: 440, y: 180 }],
    routes: [
      { to: 'bank', pts: [[40, 240], [120, 240], [120, 100]], steps: [['Go straight on Main Street.', 'سِر مباشرةً في الشارع الرئيسي.'], ['Turn left at Park Road.', 'انعطف يسارًا عند شارع الحديقة.'], ['The bank is on your right.', 'البنك على يمينك.']] },
      { to: 'hospital', pts: [[40, 240], [300, 240], [300, 100]], steps: [['Go straight. Pass the park.', 'سِر مباشرةً. تجاوز الحديقة.'], ['Turn left at School Street.', 'انعطف يسارًا عند شارع المدرسة.'], ['The hospital is on your left.', 'المستشفى على يسارك.']] },
      { to: 'supermarket', pts: [[40, 240], [120, 240], [120, 100], [400, 100]], steps: [['Take the first left.', 'اتّخذ أول منعطف يسار.'], ['Turn right at High Street.', 'انعطف يمينًا عند الشارع العالي.'], ['Go straight. The supermarket is at the end of the street.', 'سِر مباشرةً. السوبرماركت في نهاية الشارع.']] }
    ]
  };
  V.directions = el => {
    el.innerHTML = `<div class="widget"><div class="seg" data-r>${MAP.routes.map((r, i) => `<button data-i="${i}">Where is the ${r.to}?</button>`).join('')}</div>
      <svg viewBox="0 0 480 290" role="img" aria-label="town map"></svg><div data-steps></div></div>`;
    const svg = $('svg', el); let timer = null;
    const base = () => {
      let s = V.R(0, 0, 480, 290, '#e8f5e9') + V.R(0, 228, 480, 24, '#9ca3af') + V.R(108, 0, 24, 290, '#9ca3af') + V.R(288, 0, 24, 290, '#9ca3af') + V.R(0, 88, 480, 24, '#9ca3af');
      s += V.T(60, 272, 'Main Street', 12, '#374151') + V.T(120, 14, 'Park Rd', 11, '#374151') + V.T(300, 14, 'School St', 11, '#374151') + V.T(420, 80, 'High Street', 12, '#374151');
      MAP.places.forEach(p => { s += V.EM(p.x, p.y, p.e, 34) + V.T(p.x, p.y + 28, p.n, 11, '#1f2937'); });
      return s + V.EM(40, 240, '🧑', 28) + V.T(40, 218, 'You are here', 11, '#2563eb');
    };
    svg.innerHTML = base();
    const play = i => {
      clearInterval(timer); const r = MAP.routes[i];
      svg.innerHTML = base() + `<polyline id="rt" points="${r.pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#2563eb" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round" stroke-linejoin="round"/><g id="dot">${V.C(0, 0, 8, '#f59e0b', 'stroke="#fff" stroke-width="3"')}</g>`;
      $$('[data-i]', el).forEach(b => b.classList.toggle('on', +b.dataset.i === i));
      $('[data-steps]', el).innerHTML = r.steps.map((s, k) => `<div class="ex-item" data-k="${k}"><span class="en" dir="ltr"><b>${k + 1}. ${esc(s[0])}</b></span><span class="ar" style="flex:1">${esc(s[1])}</span>${E.sayBtn(s[0])}</div>`).join('');
      const pl = $('#rt', svg), len = pl.getTotalLength(), dot = $('#dot', svg); let d = 0;
      timer = setInterval(() => { d += len / 90; if (d >= len) { d = len; clearInterval(timer); } const pt = pl.getPointAtLength(d); dot.setAttribute('transform', `translate(${pt.x} ${pt.y})`); }, 33);
      E.say(r.steps.map(s => s[0]).join(' '));
    };
    $$('[data-i]', el).forEach(b => b.onclick = () => play(+b.dataset.i));
    E.onLeave(() => clearInterval(timer));
  };

  V.WIDGETS = { prepositions: V.prepositions, clock: V.clock, timeline: V.timeline, family: V.family, compare: V.compare, directions: V.directions };
})();

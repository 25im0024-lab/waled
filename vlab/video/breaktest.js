/* Break-test film: static break test in a thermostatic water bath, the inversion test, break levels
   (a practical 4-level scale and the Sydansk gel-strength codes), the break curve and the effect of bath
   temperature. Time-driven like film.js: frame(t) draws the film at time t (s). Numbers are illustrative. */
(function () {
  'use strict';
  const qs = new URLSearchParams(location.search);
  let lang = qs.get('lang') === 'ar' ? 'ar' : 'en';
  const DUR = 126;
  const $ = s => document.querySelector(s);

  /* ------------------------------------------------------------------ text */
  const L = (en, ar) => ({ en, ar });
  const TX = {
    intro: { h: L('Static break test in a water bath', 'اختبار الكسر الساكن في حمام مائي'),
      p: L('Sealed vials · time points · inversion test · break levels', 'قوارير مغلقة · نقاط زمنية · اختبار القلب · درجات الكسر') },
    prep: { tag: L('1 · PREPARE THE VIALS', '1 · جهّز القوارير'),
      c: L('Mix the gel with its breaker (APS for guar samples, DI-water dilution for polymer-free ones) and split it at once into identical sealed vials, one per time point.',
        'اخلط الجل مع الـ breaker (APS للعينات التي فيها guar، أو التخفيف بماء مقطّر للعينات الخالية من البوليمر)، ووزّعه فوراً على قوارير متطابقة مغلقة، قارورة لكل نقطة زمنية.') },
    bath: { tag: L('2 · BATH AT TEST TEMPERATURE', '2 · الحمام على حرارة الاختبار'),
      c: L('Let the bath settle at the test temperature first, then load all vials together and start the timer. Keep the water above the fluid level; a water bath works up to about 95 °C.',
        'اترك الحمام يستقر على حرارة الاختبار أولاً، ثم ضع القوارير كلها معاً وابدأ المؤقت. اجعل الماء أعلى من مستوى السائل؛ الحمام المائي يصلح حتى نحو 95 °C.') },
    monitor: { tag: L('3 · ONE VIAL PER TIME POINT', '3 · قارورة لكل نقطة زمنية'),
      c: L('At each time point take out one vial and do not return it. The test is static: no stirring.',
        'عند كل نقطة زمنية أخرج قارورة واحدة ولا تُرجعها. الاختبار ساكن دون تحريك.') },
    invert: { tag: L('4 · INVERSION TEST', '4 · اختبار القلب'),
      c: L('Turn the vial upside down and watch for a few seconds: does the fluid stay, flow slowly, or run like water? Photograph it next to a vial of water.',
        'اقلب القارورة وراقبها بضع ثوانٍ: هل يبقى السائل مكانه، أم يسيل ببطء، أم يجري كالماء؟ صوّرها بجانب قارورة ماء.') },
    grades: { tag: L('5 · BREAK LEVELS', '5 · درجات الكسر'),
      c: L('Grade every vial on one scale and keep it the same for all samples. The viscosity measurement decides the final break.',
        'قيّم كل قارورة على مقياس واحد، وثبّته لكل العينات. قياس اللزوجة هو الذي يحسم الكسر النهائي.') },
    measure: { tag: L('6 · COOL, FILTER, MEASURE', '6 · برّد ورشّح وقِس'),
      c: L('Cool each vial to a fixed temperature (e.g. 30 °C), filter it and measure η: Cannon-Fenske for a water-like fluid, the rheometer while it is still viscous.',
        'برّد كل قارورة إلى حرارة ثابتة (مثلاً 30 °C)، ورشّحها، وقِس η: بأنبوب Cannon-Fenske للسائل الشبيه بالماء، وبالـ rheometer ما دام لزجاً.') },
    curve: { tag: L('7 · BREAK CURVE', '7 · منحنى الكسر'),
      c: L('Plot η at the fixed temperature against time in the bath. The break time is the first point at or below the criterion of your reference (here 5 mPa·s).',
        'ارسم η عند الحرارة الثابتة مقابل الزمن في الحمام. زمن الكسر هو أول نقطة تبلغ معيار مرجعك أو تنزل تحته (هنا 5 mPa·s).') },
    temp: { tag: L('8 · BATH TEMPERATURE MATTERS', '8 · حرارة الحمام مهمة'),
      c: L('APS acts faster at higher temperature and is very slow at room temperature, so test at your target temperature and report it.',
        'الـ APS أسرع عند الحرارة الأعلى وبطيء جداً عند حرارة الغرفة، فاختبر عند حرارة الهدف واذكرها.') },
    outro: { h: L('Report every test the same way', 'سجّل كل اختبار بنفس الطريقة'),
      p: L('Bath temperature · breaker and dose · time points · break level · η at a fixed temperature · break time — numbers here are illustrative',
        'حرارة الحمام · الـ breaker وجرعته · النقاط الزمنية · درجة الكسر · η عند حرارة ثابتة · زمن الكسر — الأرقام هنا توضيحية') },
    levels: [
      [L('Not broken', 'لم ينكسر'), L('does not flow; elastic', 'لا يسيل؛ مرن')],
      [L('Partially broken', 'كسر جزئي'), L('slow flow, lumps or strings', 'يسيل ببطء مع كتل أو خيوط')],
      [L('Broken, still viscous', 'مكسور لكنه لزج'), L('flows freely; η above criterion', 'يسيل بحرية؛ η فوق المعيار')],
      [L('Completely broken', 'كسر تام'), L('water-like, clear; η ≤ criterion', 'كالماء وصافٍ؛ η ≤ المعيار')],
    ],
    sydH: L('Sydansk gel-strength codes (bottle test)', 'رموز Sydansk لقوة الجل (اختبار القارورة)'),
    syd: [
      ['A', L('no detectable gel', 'لا جل ظاهر')], ['B', L('highly flowing gel', 'جل شديد السيولة')], ['C', L('flowing gel', 'جل يسيل')],
      ['D', L('moderately flowing gel', 'جل متوسط السيولة')], ['E', L('barely flowing gel', 'جل بالكاد يسيل')], ['F', L('highly deformable, non-flowing', 'لا يسيل، شديد التشوّه')],
      ['G', L('moderately deformable, non-flowing', 'لا يسيل، متوسط التشوّه')], ['H', L('slightly deformable, non-flowing', 'لا يسيل، قليل التشوّه')],
      ['I', L('rigid gel', 'جل صلب')], ['J', L('ringing rigid gel', 'جل صلب رنّان')],
    ],
    sydNote: L('A linear gel like this one usually sits in the low codes.', 'الجل غير المشبّك مثل هذا يقع عادة في الرموز الدنيا.'),
    timer: L('time in bath', 'الزمن في الحمام'), bathL: L('bath', 'الحمام'), cooling: L('cooling to 30 °C', 'تبريد إلى 30 °C'),
    xlab: L('time in bath (min)', 'الزمن في الحمام (min)'), ylab: L('η at 30 °C (mPa·s)', 'η عند 30 °C (mPa·s)'),
    crit: L('criterion 5 mPa·s', 'المعيار 5 mPa·s'), bt: L('break time', 'زمن الكسر'), rheo: L('rheometer', 'rheometer'), cf: L('Cannon-Fenske', 'Cannon-Fenske'),
    illus: L('Illustrative numbers.', 'أرقام توضيحية.'),
  };
  const UNIT = /([±]?\d[\d.,]*\s?(?:mPa·s|mm²\/s|mg\/L|mL|mg|mm|min|°C|h|s|g|%)(?![A-Za-z²]))/g;
  const lvl = i => lang === 'ar' ? `الدرجة ${i}: ${t_(TX.levels[i][0])}` : `${i} · ${t_(TX.levels[i][0])}`;
  const t_ = o => { const v = o[lang]; return lang === 'ar' && typeof v === 'string' ? v.replace(UNIT, '⁦$1⁩') : v; };

  /* ------------------------------------------------------------------ renderer */
  const canvas = $('#c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.02, 60);
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3a4a, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(2, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc4ff, 0.5); rim.position.set(-3, 2, -2); scene.add(rim);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5 }, o));
  const glass = (o = 0.24) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: o, roughness: 0.03, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 2.6), std(0x1c2630, { roughness: 0.9 })); bench.position.set(0, -0.05, 0.2); scene.add(bench);

  // water bath
  const BW = 1.9, BH = 0.62, BD = 1.0, WL = 0.52;
  const shell = std(0xe6eaee, { roughness: 0.35, metalness: 0.2 });
  const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shell); m.position.set(x, y, z); scene.add(m); };
  wall(BW, 0.04, BD, 0, 0.02, 0); wall(BW, BH, 0.04, 0, BH / 2, -BD / 2); wall(BW, BH, 0.04, 0, BH / 2, BD / 2); wall(0.04, BH, BD, -BW / 2, BH / 2, 0); wall(0.04, BH, BD, BW / 2, BH / 2, 0);
  const water = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.08, WL - 0.04, BD - 0.08), new THREE.MeshPhysicalMaterial({ color: 0x8fcdf2, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false }));
  water.position.y = 0.04 + (WL - 0.04) / 2; water.renderOrder = 1; scene.add(water);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.5), std(0x9aa3ad, { metalness: 0.6, roughness: 0.4 })); rack.position.y = 0.16; scene.add(rack);
  const ctrl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.06), std(0x2b3440)); ctrl.position.set(0, 0.36, BD / 2 + 0.05); scene.add(ctrl);

  // vials (origin at the base, 0.5 tall); content split in three pieces for the inversion test
  const TP = [15, 30, 60, 120, 240, 480];
  const ETA = [2400, 380, 42, 6.5, 2.1, 1.0];          // η at 30 °C, mPa·s (illustrative)
  const GRADE = [0, 1, 2, 2, 3, 3];
  const LOOK = [{ c: 0xefe3bf, o: 0.96 }, { c: 0xefe0b0, o: 0.88 }, { c: 0xf2da98, o: 0.72 }, { c: 0xf6e8b0, o: 0.42 }];
  const vials = TP.map(() => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 28, 1, true), glass(0.3)); body.position.y = 0.25;
    const bot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 28), glass(0.3)); bot.rotation.x = -Math.PI / 2; bot.position.y = 0.002;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.07, 28), std(0xd2452f)); cap.position.y = 0.535;
    const mat = std(0xefe3bf, { transparent: true, opacity: 0.96, roughness: 0.3 });
    const main = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 1, 28), mat);
    const lump = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 1, 28), mat);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), mat);
    g.add(main, lump, str, body, bot, cap); scene.add(g);
    g.userData = { mat, main, lump, str };
    return g;
  });
  const span = (m, a, b) => { m.visible = b - a > 0.002; m.scale.y = Math.max(0.001, b - a); m.position.y = (a + b) / 2; };
  /* content inside a vial: k = 0 upright … 1 fully slid toward the cap (only the part that can flow moves) */
  function content(v, grade, slide) {
    const u = v.userData, look = LOOK[grade];
    u.mat.color.setHex(look.c); u.mat.opacity = look.o;
    const H = 0.3, top = 0.48;
    if (grade === 0 || slide <= 0) { span(u.main, 0.02, 0.02 + H); u.lump.visible = false; u.str.visible = false; return; }
    if (grade === 1) {          // most stays as a lump at the base, part creeps down to the cap with a string
      const moved = 0.12 * slide;
      span(u.main, 0.02, 0.02 + H - 0.12); span(u.lump, top - moved, top);
      span(u.str, 0.02 + H - 0.12, top - moved); u.str.visible = slide > 0.05 && slide < 0.98; return;
    }
    const a = lerp(0.02, top - H, slide);  // slides as a whole
    span(u.main, a, a + H); u.lump.visible = false; u.str.visible = false;
  }

  /* ------------------------------------------------------------------ helpers */
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ss = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const fade = (t, a, b, f = 0.5) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));
  const lerp3 = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
  const SCENES = [['intro', 0, 8], ['prep', 8, 20], ['bath', 20, 32], ['monitor', 32, 44], ['invert', 44, 62], ['grades', 62, 82], ['measure', 82, 92],
    ['curve', 92, 106], ['temp', 106, 118], ['outro', 118, DUR]];
  const sceneAt = t => SCENES.find(s => t >= s[1] && t < s[2]) || SCENES[SCENES.length - 1];
  const CAMK = [
    [0, [0, 3.0, 6.0], [0, 1.25, 0]], [7, [0, 3.0, 6.0], [0, 1.25, 0]], [8.5, [0, 1.9, 4.6], [0, 0.45, 0.4]], [19, [0, 1.9, 4.6], [0, 0.45, 0.4]],
    [20.5, [0.9, 2.2, 4.2], [0, 0.35, 0]], [31, [0.9, 2.2, 4.2], [0, 0.35, 0]], [32.5, [0, 2.1, 3.9], [0, 0.4, 0.1]], [43, [0, 2.1, 3.9], [0, 0.4, 0.1]],
    [44.5, [0, 1.45, 3.0], [0, 1.1, 1.0]], [61, [0, 1.45, 3.0], [0, 1.1, 1.0]], [62.5, [0.55, 1.5, 4.9], [0.55, 1.12, 0.9]], [81, [0.55, 1.5, 4.9], [0.55, 1.12, 0.9]],
    [82.5, [0.6, 1.6, 3.6], [0.5, 0.35, 0.8]], [91, [0.6, 1.6, 3.6], [0.5, 0.35, 0.8]], [92.5, [-1.6, 2.0, 4.6], [-1.6, 0.5, 0.2]], [117, [-1.6, 2.0, 4.6], [-1.6, 0.5, 0.2]],
    [118.5, [0, 3.0, 6.0], [0, 1.25, 0]], [DUR, [0, 3.0, 6.0], [0, 1.25, 0]],
  ];
  function cam(t) {
    let i = 0; while (i < CAMK.length - 2 && t >= CAMK[i + 1][0]) i++;
    const [t0, p0, q0] = CAMK[i], [t1, p1, q1] = CAMK[i + 1], u = ss((t - t0) / (t1 - t0));
    camera.position.set(...lerp3(p0, p1, u)); camera.lookAt(...lerp3(q0, q1, u)); camera.updateMatrixWorld();
  }
  const proj = v => { const p = new THREE.Vector3(...v).project(camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; };
  const BENCH = i => [-0.95 + i * 0.38, 0, 1.0], RACK = i => [-0.7 + i * 0.28, 0.17, 0], STAGE = [0, 1.5, 1.0], GRID = i => [-0.15 + i * 0.6, 1.62, 0.9];

  /* ------------------------------------------------------------------ SVG plot */
  function plot(series, o) {
    const W = 860, H = 430, l = 92, r = 24, tp = 24, b = 66, pw = W - l - r, ph = H - tp - b;
    const X = x => l + x / o.xmax * pw, ly0 = Math.log10(o.ymin), ly1 = Math.log10(o.ymax), Y = y => tp + ph - (Math.log10(y) - ly0) / (ly1 - ly0) * ph;
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="direction:ltr;font-family:'DejaVu Sans',sans-serif">`;
    for (let e = Math.ceil(ly0); e <= ly1; e++) { const y = Y(10 ** e); s += `<line x1="${l}" x2="${l + pw}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.12)"/><text x="${l - 10}" y="${y + 6}" fill="#b7c3cf" font-size="18" text-anchor="end">${10 ** e >= 1 ? 10 ** e : 10 ** e}</text>`; }
    for (let x = 0; x <= o.xmax; x += 120) s += `<line x1="${X(x)}" x2="${X(x)}" y1="${tp}" y2="${tp + ph}" stroke="rgba(255,255,255,.08)"/><text x="${X(x)}" y="${tp + ph + 26}" fill="#b7c3cf" font-size="18" text-anchor="middle">${x}</text>`;
    s += `<text x="${l + pw / 2}" y="${H - 8}" fill="#b7c3cf" font-size="19" text-anchor="middle" style="direction:${lang === 'ar' ? 'rtl' : 'ltr'}">${o.xlab}</text>`;
    s += `<text x="20" y="${tp + ph / 2}" fill="#b7c3cf" font-size="19" text-anchor="middle" transform="rotate(-90 20 ${tp + ph / 2})" style="direction:${lang === 'ar' ? 'rtl' : 'ltr'}">${o.ylab}</text>`;
    if (o.crit) { const y = Y(o.crit); s += `<line x1="${l}" x2="${l + pw}" y1="${y}" y2="${y}" stroke="#ffbf5a" stroke-width="2.5" stroke-dasharray="10 8"/><text x="${l + pw - 6}" y="${y - 10}" fill="#ffbf5a" font-size="19" text-anchor="end" style="direction:${lang === 'ar' ? 'rtl' : 'ltr'}">${o.critLab}</text>`; }
    for (const se of series) {
      if (se.pts.length > 1) s += `<polyline points="${se.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="none" stroke="${se.color}" stroke-width="${se.w || 3}" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''}/>`;
      for (const p of se.marks || []) s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="9" fill="${p[2]}" stroke="#0c141c" stroke-width="2"/>`;
      if (se.label) { const [x, y] = se.pts[se.pts.length - 1]; s += `<text x="${X(x) - 8}" y="${Y(y) - 12}" fill="${se.color}" font-size="19" text-anchor="end">${se.label}</text>`; }
    }
    if (o.vline) s += `<line x1="${X(o.vline)}" x2="${X(o.vline)}" y1="${tp}" y2="${tp + ph}" stroke="#39d6a0" stroke-width="2.5"/><text x="${X(o.vline) + 8}" y="${tp + 22}" fill="#39d6a0" font-size="19" style="direction:${lang === 'ar' ? 'rtl' : 'ltr'}">${o.vlab}</text>`;
    return s + '</svg>';
  }
  const GCOL = ['#ff7a6b', '#ffbf5a', '#e8d27a', '#39d6a0'];
  // break curve at another temperature: same curve stretched in time (APS slower when cooler)
  const etaAt = (t, stretch) => {
    const x = t / stretch; if (x <= TP[0]) return ETA[0];
    for (let i = 0; i < TP.length - 1; i++) if (x <= TP[i + 1]) { const u = Math.log(x / TP[i]) / Math.log(TP[i + 1] / TP[i]); return Math.exp(lerp(Math.log(ETA[i]), Math.log(ETA[i + 1]), u)); }
    return ETA[ETA.length - 1];
  };

  /* ------------------------------------------------------------------ overlays */
  const fmtMin = m => m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min`;
  function overlays(t, sc) {
    const [name, a, b] = sc;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang;
    const ti = $('#title'), isT = name === 'intro' || name === 'outro';
    ti.style.opacity = isT ? fade(t, a, b, 0.8) : 0; ti.style.top = '10%';
    if (isT) { ti.querySelector('h1').textContent = t_(TX[name].h); ti.querySelector('p').textContent = t_(TX[name].p); }
    const cap = $('#cap');
    if (!isT) { cap.innerHTML = `<b>${t_(TX[name].tag)}</b>${t_(TX[name].c)}`; cap.style.opacity = fade(t, a, b); } else cap.style.opacity = 0;
    // labels: time points under the vials (prep) and level names (grades)
    let lh = '', sv = '';
    if (name === 'prep' || name === 'bath') {
      const o = name === 'prep' ? fade(t, a + 3, b + 2) : 1 - seg(t, 26, 27);
      if (o > 0) TP.forEach((tp, i) => { const [px, py] = proj([BENCH(i)[0], 0, BENCH(i)[2] + 0.12]); lh += `<div class="lab" style="opacity:${o};left:${px - 50}px;top:${py + 6}px;min-width:100px;text-align:center">${tp} min</div>`; });
    }
    if (name === 'grades') {
      TX.levels.forEach(([h, d], i) => {
        const o = fade(t, a + 0.6 + i * 1.2, b, 0.4); if (o <= 0) return;
        const [px, py] = proj([GRID(i)[0] - 0.9, GRID(i)[1] - 0.58, 0.9]);
        lh += `<div class="lab" style="opacity:${o};left:${px - 120}px;top:${py}px;width:240px;white-space:normal;text-align:center;border-top:6px solid ${GCOL[i]}"><b>${lvl(i)}</b><br><span style="font-size:20px">${t_(d)}</span></div>`;
      });
    }
    $('#labels').innerHTML = lh; $('#lines').innerHTML = sv;
    // timer and bath temperature
    const w = $('#watch'); let wo = 0, wt = '', ws = '';
    if (t >= 31 && t < 44) { wo = 1; wt = fmtMin(15 * ss(seg(t, 32, 38))); ws = t_(TX.timer); }
    if (name === 'invert') { const k = t < 50 ? 0 : t < 56 ? 2 : 4; wo = 1; wt = fmtMin(TP[k]); ws = t_(TX.timer); }
    if (name === 'measure') { wo = 1; wt = `${Math.round(lerp(90, 30, ss(seg(t, 83, 89))))} °C`; ws = t_(TX.cooling); }
    w.style.opacity = wo; w.querySelector('.t').textContent = wt; w.querySelector('.s').textContent = ws;
    const tp = $('#temp'), bathOn = t >= 20 && t < 62;
    tp.style.opacity = bathOn ? 1 : 0; tp.textContent = `${t_(TX.bathL)} ${lerp(25, 90, ss(seg(t, 21, 26))).toFixed(1)} °C`;
    tp.style.top = t >= 31 ? '210px' : '80px';
    // flag on each inversion
    const fl = $('#flag'); let fo = 0, ftx = '';
    const shows = [[47.5, 0], [53.5, 2], [59.5, 4]];
    for (const [t0, k] of shows) if (t >= t0 && t < t0 + 2.3) { fo = fade(t, t0, t0 + 2.3, 0.3); ftx = `<bdi>${TP[k]} min</bdi> · ${lvl(GRADE[k])}`; }
    fl.style.opacity = fo; fl.innerHTML = ftx; fl.style.color = fo ? GCOL[GRADE[shows.find(s => t >= s[0] && t < s[0] + 2.3)?.[1] ?? 0]] : '';
    // panels
    const pn = $('#panel'); let ph = '', po = 0;
    pn.style.width = '640px'; pn.style.right = '70px'; pn.style.left = 'auto'; pn.style.top = '90px';
    if (name === 'grades') {
      po = fade(t, a + 6.5, b);
      ph = `<h3>${t_(TX.sydH)}</h3>` + TX.syd.map(([c, d]) => `<div style="display:flex;gap:14px;font-size:22px;line-height:1.45"><b style="width:26px;color:#ffd66b">${c}</b><span>${t_(d)}</span></div>`).join('') +
        `<div class="note">${t_(TX.sydNote)}</div>`;
      pn.style.width = '600px'; pn.style.top = '60px';
    }
    if (name === 'curve' || name === 'temp') {
      po = fade(t, a + 0.3, b + (name === 'curve' ? 0.6 : 0));
      pn.style.width = '920px'; pn.style.top = '70px'; pn.style.right = '60px';
      if (name === 'curve') {
        const n = Math.min(TP.length, Math.floor(seg(t, a + 0.8, a + 7.5) * TP.length + 0.0001) + (t >= a + 0.8 ? 1 : 0));
        const pts = TP.slice(0, n).map((x, i) => [x, ETA[i]]);
        ph = plot([{ pts, color: '#dfe7ef', w: 2.5, marks: pts.map((p, i) => [p[0], p[1], GCOL[GRADE[i]]]) }],
          { xmax: 480, ymin: 0.5, ymax: 5000, xlab: t_(TX.xlab), ylab: t_(TX.ylab), crit: 5, critLab: t_(TX.crit), vline: n >= 5 && t > a + 8.5 ? 240 : null, vlab: `${t_(TX.bt)} ≈ 240 min` }) +
          `<div class="note">● ${TX.levels.map((l, i) => `<span style="color:${GCOL[i]}">${lvl(i)}</span>`).join(' · ')} — ${t_(TX.illus)}</div>`;
      } else {
        const curve = (st, col, lab) => ({ pts: Array.from({ length: 49 }, (_, i) => { const x = 15 + i * 465 / 48; return [x, etaAt(x, st)]; }), color: col, label: lab, w: 3 });
        const k = seg(t, a + 0.6, a + 4);
        const ser = [curve(1, '#39d6a0', '90 °C')];
        if (k > 0.3) ser.push(curve(2.5, '#ffbf5a', '80 °C'));
        if (k > 0.7) ser.push(curve(6, '#ff7a6b', '70 °C'));
        ph = plot(ser, { xmax: 480, ymin: 0.5, ymax: 5000, xlab: t_(TX.xlab), ylab: t_(TX.ylab), crit: 5, critLab: t_(TX.crit) }) + `<div class="note">${t_(TX.illus)}</div>`;
      }
    }
    pn.innerHTML = ph; pn.style.opacity = po;
  }

  /* ------------------------------------------------------------------ state at time t */
  function frame(t) {
    const sc = sceneAt(t);
    // vial positions over time
    vials.forEach((v, i) => {
      let p = BENCH(i), rz = 0, slide = 0, grade = 0;
      const fill = ss(seg(t, 9 + i * 0.35, 10 + i * 0.35));
      v.visible = true;
      // load into the bath 27–31
      const t0 = 27 + i * 0.6;
      if (t >= t0) {
        const u = ss(seg(t, t0, t0 + 0.9)), up = [BENCH(i)[0], 0.8, BENCH(i)[2]], over = [RACK(i)[0], 0.8, RACK(i)[2]];
        p = u < 0.33 ? lerp3(BENCH(i), up, u / 0.33) : u < 0.66 ? lerp3(up, over, (u - 0.33) / 0.33) : lerp3(over, RACK(i), (u - 0.66) / 0.34);
      }
      // inversion stage: vials 0, 2, 4 at 44–50, 50–56, 56–62
      const inv = { 0: 44, 2: 50, 4: 56 }[i];
      if (inv !== undefined && t >= inv - 0.01 && t < 62) {
        const u = ss(seg(t, inv, inv + 1.2));
        p = lerp3(RACK(i), STAGE, u);
        rz = Math.PI * ss(seg(t, inv + 1.4, inv + 2.6));
        grade = GRADE[i];
        slide = seg(t, inv + 2.6, inv + (GRADE[i] === 3 ? 3.3 : GRADE[i] === 2 ? 4.4 : 5.6));
        if (t >= inv + 5.6) { rz = Math.PI * (1 - ss(seg(t, inv + 5.6, inv + 5.95))); slide = 1 - seg(t, inv + 5.6, inv + 5.95); }
        if (t >= inv + 5.95) v.visible = false;
      } else if (inv !== undefined && t >= 62) v.visible = false;
      // grades scene: four vials inverted side by side (levels 0..3)
      if (t >= 62 && t < 82) {
        const lvl = [0, 1, 2, 3][[0, 1, 2, 4].indexOf(i)];
        if (lvl === undefined) { v.visible = false; } else {
          v.visible = true; p = [GRID(lvl)[0] - 0.9, GRID(lvl)[1], GRID(lvl)[2]]; rz = Math.PI; grade = lvl;
          slide = seg(t, 62.8 + lvl * 1.2, 64 + lvl * 1.2);
        }
      }
      if (t >= 82) { v.visible = i === 5 && t < 92; p = [0.9, 0, 1.15]; rz = 0; grade = 3; slide = 0; }
      if (t >= 92 && t < 118) v.visible = false;
      if (t >= 118) { v.visible = true; p = RACK(i); rz = 0; grade = GRADE[i]; slide = 0; }
      v.position.set(...p); v.rotation.set(0, 0, rz);
      content(v, grade, slide);
      if (t < 12) { const u = v.userData; u.main.scale.y = Math.max(0.001, 0.3 * fill); u.main.position.y = 0.02 + 0.15 * fill; u.main.visible = fill > 0.01; }
    });
    water.material.color.setRGB(lerp(0.56, 0.8, seg(t, 21, 26)), 0.8, lerp(0.95, 0.82, seg(t, 21, 26)));
    cam(t);
    overlays(t, sc);
    renderer.render(scene, camera);
  }

  window.FILM = { DUR, frame, setLang(l) { lang = l === 'ar' ? 'ar' : 'en'; }, ready: false };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { window.FILM.ready = true; });
  if (!qs.has('render')) { const t0 = performance.now(); const loop = now => { frame(((now - t0) / 1000) % DUR); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  else frame(0);
})();

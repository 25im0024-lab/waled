/* Cannon-Fenske film: a deterministic, time-driven scene. frame(t) draws the film at time t (s), so the
   renderer can step it frame by frame (render.js) and a browser can also play it live (film.html).
   Geometry is a schematic Cannon-Fenske routine viscometer; the numbers shown are illustrative. */
(function () {
  'use strict';
  const qs = new URLSearchParams(location.search);
  let lang = qs.get('lang') === 'ar' ? 'ar' : 'en';
  const DUR = 126;
  const $ = s => document.querySelector(s);

  /* ------------------------------------------------------------------ text */
  const L = (en, ar) => ({ en, ar });
  const TX = {
    intro: { h: L('Measuring viscosity with a Cannon-Fenske viscometer', 'قياس اللزوجة بأنبوب Cannon-Fenske'),
      p: L('Kinematic viscosity by capillary flow · ASTM D445 / D446', 'اللزوجة الكينماتيكية بالجريان في أنبوب شعري · ASTM D445 / D446') },
    parts: { tag: L('1 · THE VISCOMETER', '1 · الجهاز'),
      c: L('A Cannon-Fenske routine viscometer: the sample flows by gravity through the capillary, and we time the meniscus between marks E and F.',
        'أنبوب Cannon-Fenske روتيني: تجري العيّنة بالجاذبية عبر الشعيرة (capillary)، ونقيس زمن مرور الـ meniscus بين العلامتين E و F.') },
    size: { tag: L('2 · CHOOSE THE SIZE', '2 · اختر الحجم'),
      c: L('Pick the size whose efflux time is at least 200 s: t = ν / C. A broken fluid near 0.9 mm²/s needs size 25.',
        'اختر الحجم الذي يعطي زمن جريان 200 s على الأقل: t = ν / C. السائل المكسور قرب 0.9 mm²/s يحتاج الحجم 25.') },
    clean: { tag: L('3 · CLEAN AND DRY', '3 · نظّف وجفّف'),
      c: L('Rinse with a suitable solvent, then dry with clean, filtered air. A film or particle in the capillary changes the time.',
        'اشطف الأنبوب بمذيب مناسب، ثم جفّفه بهواء نظيف مرشّح. أي طبقة أو جسيم في الشعيرة يغيّر الزمن.') },
    charge: { tag: L('4 · CHARGE THE SAMPLE', '4 · عبّئ العيّنة'),
      c: L('Filter the cooled sample. Invert the viscometer, dip the narrow arm into the sample and apply gentle suction to the wide arm until the liquid reaches mark F.',
        'رشّح العيّنة بعد تبريدها. اقلب الأنبوب، واغمس الذراع الضيقة في العيّنة، واسحب بلطف من الذراع الواسعة حتى يصل السائل إلى العلامة F.') },
    upright: { tag: L('5 · TURN IT UPRIGHT', '5 · أعده عمودياً'),
      c: L('Wipe the tip, turn the viscometer upright and let the liquid run down into the lower reservoir.',
        'امسح طرف الأنبوب، وأعده إلى الوضع العمودي، ودع السائل ينزل إلى الخزان السفلي.') },
    bath: { tag: L('6 · CONSTANT-TEMPERATURE BATH', '6 · حمام ثابت الحرارة'),
      c: L('Mount it vertically in the bath at the test temperature (±0.02 °C) and wait about 10 min to reach equilibrium.',
        'ثبّته عمودياً في حمام على حرارة الاختبار (±0.02 °C)، وانتظر نحو 10 min حتى يتوازن.') },
    drawup: { tag: L('7 · DRAW THE LIQUID UP', '7 · اسحب السائل إلى الأعلى'),
      c: L('Apply suction to the narrow arm to draw the liquid about 5 mm above mark E, then release it.',
        'اسحب من الذراع الضيقة حتى يرتفع السائل نحو 5 mm فوق العلامة E، ثم اتركه.') },
    timing: { tag: L('8 · TIME THE FLOW', '8 · قِس زمن الجريان'),
      c: L('Start the watch as the bottom of the meniscus passes E, and stop it as it passes F.',
        'شغّل الساعة عندما تمرّ قاعدة الـ meniscus بالعلامة E، وأوقفها عندما تمرّ بالعلامة F.') },
    repeat: { tag: L('9 · REPEAT', '9 · كرّر'),
      c: L('Repeat the run. The times should agree closely; use their mean.', 'كرّر القياس. يجب أن تتقارب الأزمنة جداً؛ استخدم متوسطها.') },
    calc: { tag: L('10 · CALCULATE', '10 · احسب'),
      c: L('Use the constant C from your tube’s certificate and the density measured at the same temperature.',
        'استخدم الثابت C من شهادة أنبوبك، والكثافة المقاسة عند نفس الحرارة.') },
    outro: { h: L('Capillary viscometers are for Newtonian fluids', 'الأنبوب الشعري للسوائل الـ Newtonian فقط'),
      p: L('If the broken fluid does not flow or is still shear-thinning, it is not broken: measure it with the rheometer.',
        'إذا لم يسل السائل المكسور أو بقي shear-thinning فهو لم ينكسر: قِسه بالـ rheometer.') },
    parts_l: {
      narrow: L('Narrow arm (capillary side)', 'الذراع الضيقة (جهة الشعيرة)'), wide: L('Wide arm (filling side)', 'الذراع الواسعة (جهة التعبئة)'),
      upper: L('Upper bulb', 'البصيلة العليا'), timing: L('Timing bulb', 'بصيلة التوقيت'), E: L('Mark E', 'العلامة E'), F: L('Mark F', 'العلامة F'),
      cap: L('Capillary', 'الشعيرة (capillary)'), res: L('Lower reservoir', 'الخزان السفلي'),
    },
    start: L('START · E', 'ابدأ · E'), stop: L('STOP · F', 'أوقف · F'), lapse: L('time-lapse', 'تسريع'), real: L('real time', 'زمن حقيقي'),
    sizesH: L('Cannon-Fenske routine sizes (nominal)', 'أحجام Cannon-Fenske الروتينية (قيم اسمية)'),
    sizeCols: L(['Size', 'C (mm²/s²)', 'Range (mm²/s)', 't at 0.9 mm²/s'], ['الحجم', 'C (mm²/s²)', 'المدى (mm²/s)', 't عند 0.9 mm²/s']),
    sizeNote: L('t ≥ 200 s (ASTM D445/D446). Use the C on your certificate.', 't ≥ 200 s (ASTM D445/D446). استخدم C من شهادة أنبوبك.'),
    runsH: L('Efflux times', 'أزمنة الجريان'), run: L('Run', 'القياس'), mean: L('Mean', 'المتوسط'), spread: L('Spread', 'الفرق'),
    calcH: L('Result', 'النتيجة'), illus: L('Illustrative numbers.', 'أرقام توضيحية.'),
    crit: L('η ≤ 5 mPa·s → broken (use your reference’s criterion)', 'η ≤ 5 mPa·s ← مكسور (اعتمد معيار مرجعك)'),
    wait: L('equilibrating', 'توازن حراري'),
  };
  const t_ = o => o[lang];

  /* ------------------------------------------------------------------ renderer */
  const canvas = $('#c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.01, 50);
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3a4a, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(2, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc4ff, 0.6); rim.position.set(-3, 2, -2); scene.add(rim);

  /* ------------------------------------------------------------------ viscometer (local coordinates, tube ~250 mm tall) */
  const NX = -0.06, WX = 0.08, E = 0.865, F = 0.735;
  const pivot = new THREE.Group(); pivot.position.set(0, 0.7, 0); scene.add(pivot);
  const T = new THREE.Group(); T.position.set(0, -0.7, 0); pivot.add(T);
  const V = (x, y) => new THREE.Vector3(x, y, 0);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.05,
    side: THREE.DoubleSide, depthWrite: false });
  const cyl = (r, y0, y1, x, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 32, 1, true), mat); m.position.set(x, (y0 + y1) / 2, 0); return m; };
  const bulb = (r, sy, x, y, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 24), mat); m.scale.y = sy; m.position.set(x, y, 0); return m; };
  const along = (pts, r, mat) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 16), mat);
  const CAP = [V(NX, 0.70), V(-0.035, 0.47), V(0.0, 0.26)];
  const BEND = [V(0.0, 0.26), V(0.006, 0.205), V(0.04, 0.185), V(0.075, 0.205), V(WX, 0.245)];
  // glass
  T.add(cyl(0.012, 1.05, 1.25, NX, glass), bulb(0.035, 1.5, NX, 1.0, glass), cyl(0.009, 0.85, 0.95, NX, glass), bulb(0.032, 1.7, NX, 0.8, glass),
    cyl(0.009, 0.70, 0.75, NX, glass), along(CAP, 0.006, glass), along(BEND, 0.012, glass), bulb(0.055, 1.35, WX, 0.30, glass), cyl(0.016, 0.37, 1.25, WX, glass));
  const markMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  for (const y of [E, F]) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.0115, 0.0018, 8, 40), markMat); m.rotation.x = Math.PI / 2; m.position.set(NX, y, 0); T.add(m); }
  // liquid: two groups clipped by height (narrow side and reservoir side)
  const planes = () => [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
  const liq = (pl) => new THREE.MeshStandardMaterial({ color: 0xf2b84b, emissive: 0x3a2200, roughness: 0.3, transparent: true, opacity: 0.93, clippingPlanes: pl, side: THREE.DoubleSide });
  const pN = planes(), pR = planes(), lmN = liq(pN), lmR = liq(pR);
  T.add(cyl(0.009, 1.05, 1.25, NX, lmN), bulb(0.031, 1.5, NX, 1.0, lmN), cyl(0.006, 0.85, 0.96, NX, lmN), bulb(0.028, 1.7, NX, 0.8, lmN),
    cyl(0.006, 0.70, 0.76, NX, lmN), along(CAP, 0.0035, lmN), along(BEND, 0.009, lmN));
  T.add(bulb(0.05, 1.35, WX, 0.30, lmR), cyl(0.0125, 0.36, 1.25, WX, lmR));
  const local = { n: [9, -9], r: [9, -9] };
  function applyClip() {
    T.updateMatrixWorld(true);
    const set = (pl, [a, b]) => {
      pl[0].set(new THREE.Vector3(0, 1, 0), -a).applyMatrix4(T.matrixWorld);
      pl[1].set(new THREE.Vector3(0, -1, 0), b).applyMatrix4(T.matrixWorld);
    };
    set(pN, local.n); set(pR, local.r);
  }
  // meniscus highlight on the narrow side
  function rN(y) {
    const ell = (r, c, h) => r * Math.sqrt(Math.max(0, 1 - ((y - c) / h) ** 2));
    if (y > 1.05) return 0.009; if (y > 0.9535) return Math.max(0.006, ell(0.031, 1.0, 0.0465)); if (y > 0.8476) return 0.006;
    if (y > 0.7524) return Math.max(0.006, ell(0.028, 0.8, 0.0476)); return 0.006;
  }
  const men = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.0022, 40), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  men.visible = false; T.add(men);

  // suction bulbs (rubber) on each arm
  const rubber = new THREE.MeshStandardMaterial({ color: 0xc8352a, roughness: 0.55 });
  function suction(x) {
    const g = new THREE.Group();
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 20), rubber); hose.position.y = 1.29;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 32, 20), rubber); b.scale.y = 1.4; b.position.y = 1.38;
    g.add(hose, b); g.position.x = x; g.userData.b = b; g.visible = false; T.add(g); return g;
  }
  const SN = suction(NX), SW = suction(WX);

  // cleaning: droplets along the centre line, and air arrows
  const path = new THREE.CatmullRomCurve3([V(NX, 1.25), V(NX, 1.0), V(NX, 0.8), V(NX, 0.7), V(-0.035, 0.47), V(0, 0.26), V(0.04, 0.185), V(WX, 0.245), V(WX, 0.30), V(WX, 0.6), V(WX, 1.25)], false, 'centripetal');
  const drops = []; const dropMat = new THREE.MeshStandardMaterial({ color: 0x8fd3ff, emissive: 0x0b3350, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 26; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), dropMat); d.visible = false; T.add(d); drops.push(d); }
  const arrows = [NX, WX].map(x => {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.85 });
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 20), m); c.rotation.x = Math.PI;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 12), m); s.position.y = 0.065;
    g.add(c, s); g.position.set(x, 1.33, 0); g.visible = false; T.add(g); return g;
  });

  // sample beaker for charging
  const beaker = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.16, 40, 1, true), glass.clone());
  bg.position.y = 0.05; const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.08, 0.12, 40), new THREE.MeshStandardMaterial({ color: 0xf2b84b, transparent: true, opacity: 0.8, roughness: 0.3 }));
  bl.position.y = 0.03; beaker.add(bl, bg); beaker.position.set(0.06, 0, 0); beaker.visible = false; scene.add(beaker);

  // constant-temperature bath with a holder
  const bath = new THREE.Group();
  const bathGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const bathWater = new THREE.MeshStandardMaterial({ color: 0x7fc4ec, transparent: true, opacity: 0.14, depthWrite: false });
  const bw = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 1.15, 64), bathWater); bw.position.y = 0.555;
  const bgl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.45, 64, 1, true), bathGlass); bgl.position.y = 0.695;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x8a949e, metalness: 0.7, roughness: 0.3 })); rod.position.set(0.0, 1.5, -0.06);
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.05), rod.material); clamp.position.set(0.01, 1.27, -0.04);
  bath.add(bw, bgl, rod, clamp); bath.visible = false; scene.add(bath);

  /* ------------------------------------------------------------------ helpers */
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ss = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const CAMK = [
    [0, [1.3, 1.1, 3.3], [0, 0.55, 0]], [8, [0.3, 0.8, 2.95], [0, 0.55, 0]], [9.5, [0, 0.7, 2.9], [0, 0.55, 0]], [20.5, [0, 0.7, 2.9], [0, 0.55, 0]],
    [22, [0.45, 0.7, 2.9], [0.45, 0.55, 0]], [30, [0.45, 0.7, 2.9], [0.45, 0.55, 0]], [31.5, [0.25, 0.8, 2.7], [0, 0.55, 0]], [40, [0.25, 0.8, 2.7], [0, 0.55, 0]],
    [41.5, [0, 0.55, 3.5], [0, 0.45, 0]], [57, [0, 0.55, 3.5], [0, 0.45, 0]], [58.5, [0.8, 1.05, 4.0], [0, 0.55, 0]], [69, [0.8, 1.05, 4.0], [0, 0.55, 0]],
    [70.5, [0.25, 0.95, 2.1], [-0.02, 0.8, 0]], [79, [0.25, 0.95, 2.1], [-0.02, 0.8, 0]], [80.5, [0.02, 0.8, 0.46], [-0.06, 0.8, 0]], [99, [0.02, 0.8, 0.46], [-0.06, 0.8, 0]],
    [100.5, [0.36, 0.74, 2.0], [0.3, 0.62, 0]], [109, [0.36, 0.74, 2.0], [0.3, 0.62, 0]], [110.5, [0.45, 0.7, 2.9], [0.45, 0.55, 0]], [119, [0.45, 0.7, 2.9], [0.45, 0.55, 0]],
    [120.5, [0, 0.95, 3.4], [0, 0.6, 0]], [DUR, [0, 0.95, 3.4], [0, 0.6, 0]],
  ];
  function cam(t) {
    let i = 0; while (i < CAMK.length - 2 && t >= CAMK[i + 1][0]) i++;
    const [t0, p0, q0] = CAMK[i], [t1, p1, q1] = CAMK[i + 1], u = ss((t - t0) / (t1 - t0));
    camera.position.set(...p0.map((v, k) => lerp(v, p1[k], u)));
    camera.lookAt(...q0.map((v, k) => lerp(v, q1[k], u)));
    camera.updateMatrixWorld();
  }
  const SCENES = [['intro', 0, 9], ['parts', 9, 21], ['size', 21, 31], ['clean', 31, 41], ['charge', 41, 50], ['upright', 50, 58], ['bath', 58, 70],
    ['drawup', 70, 80], ['timing', 80, 100], ['repeat', 100, 110], ['calc', 110, 120], ['outro', 120, DUR]];
  const sceneAt = t => SCENES.find(s => t >= s[1] && t < s[2]) || SCENES[SCENES.length - 1];
  const fade = (t, a, b, f = 0.5) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));

  // flow during the timed run
  const FALL0 = 78.5, FALL1 = 98, TOP = 0.89, BOT = 0.70;
  const yAt = t => lerp(TOP, BOT, seg(t, FALL0, FALL1));
  const tE = lerp(FALL0, FALL1, (TOP - E) / (TOP - BOT)), tF = lerp(FALL0, FALL1, (TOP - F) / (TOP - BOT));
  const RUNS = [415.6, 415.2, 416.0], MEAN = RUNS.reduce((a, b) => a + b, 0) / RUNS.length;
  const C = 0.00207, RHO = 1.002;

  /* ------------------------------------------------------------------ overlays */
  const proj = (x, y) => { const v = T.localToWorld(new THREE.Vector3(x, y, 0)).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
  const PARTS = [['narrow', NX, 1.2, -1, 0.0], ['upper', NX, 1.0, -1, 0.8], ['E', NX, E, -1, 1.6], ['timing', NX, 0.8, 1, 2.4], ['F', NX, F, -1, 3.2],
    ['cap', -0.035, 0.47, -1, 4.0], ['res', WX, 0.3, 1, 4.8], ['wide', WX, 1.15, 1, 5.6]];
  function overlays(t, sc) {
    const [name, a, b] = sc;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang;
    // title
    const ti = $('#title'), isT = name === 'intro' || name === 'outro';
    ti.style.opacity = isT ? fade(t, a, b, 0.8) : 0;
    if (isT) { ti.querySelector('h1').textContent = t_(TX[name].h); ti.querySelector('p').textContent = t_(TX[name].p); }
    ti.style.top = name === 'outro' ? '24%' : '34%';
    // caption
    const cap = $('#cap');
    if (!isT) { cap.innerHTML = `<b>${t_(TX[name].tag)}</b>${t_(TX[name].c)}`; cap.style.opacity = fade(t, a, b); } else cap.style.opacity = 0;
    // part labels
    const labs = $('#labels'), svg = $('#lines');
    let lh = '', sv = '';
    if (name === 'parts') {
      for (const [k, x, y, side, d] of PARTS) {
        const o = fade(t, a + 0.6 + d * 0.9, b, 0.4); if (o <= 0) continue;
        const [px, py] = proj(x, y), lx = px + side * 230;
        sv += `<line x1="${px}" y1="${py}" x2="${lx}" y2="${py}" stroke="rgba(255,255,255,${0.7 * o})" stroke-width="2"/><circle cx="${px}" cy="${py}" r="5" fill="rgba(255,233,168,${o})"/>`;
        lh += `<div class="lab" style="opacity:${o};top:${py - 22}px;${side < 0 ? `right:${innerWidth - lx}px` : `left:${lx}px`}">${t_(TX.parts_l[k])}</div>`;
      }
    }
    if (name === 'timing' || name === 'drawup') {
      const o = name === 'timing' ? fade(t, a, b) : fade(t, a + 5, b + 1);
      for (const [m, y] of [['E', E], ['F', F]]) {
        const [px, py] = proj(NX, y), [qx] = proj(NX + 0.05, y);
        sv += `<line x1="${2 * px - qx}" y1="${py}" x2="${qx}" y2="${py}" stroke="rgba(255,214,107,${0.85 * o})" stroke-width="3" stroke-dasharray="10 8"/>`;
        lh += `<div class="mark" style="opacity:${o};left:${qx + 16}px;top:${py - 26}px">${m}</div>`;
      }
    }
    labs.innerHTML = lh; svg.innerHTML = sv;
    // panel
    const pn = $('#panel'); let ph = '', po = 0;
    if (name === 'size') {
      po = fade(t, a + 0.8, b);
      const cols = t_(TX.sizeCols), rows = [[25, 0.002, '0.5–2', 450, true], [50, 0.004, '0.8–4', 225, true], [75, 0.008, '1.6–8', 113, false], [100, 0.015, '3–15', 60, false]];
      ph = `<h3>${t_(TX.sizesH)}</h3><table><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows.map(r =>
        `<tr class="${r[0] === 25 ? 'hi' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="${r[4] ? 'ok' : 'bad'}">${r[3]} s ${r[4] ? '✓' : '✗'}</td></tr>`).join('')}</table><div class="note">${t_(TX.sizeNote)}</div>`;
    } else if (name === 'repeat') {
      po = fade(t, a + 0.3, b);
      const n = 1 + (t >= 104.5) + (t >= 109.3);
      const spread = (Math.max(...RUNS) - Math.min(...RUNS)) / MEAN * 100;
      ph = `<h3>${t_(TX.runsH)}</h3>` + RUNS.slice(0, n).map((v, i) => `<div class="eq">${t_(TX.run)} ${i + 1}:  ${v.toFixed(1)} s</div>`).join('') +
        (n === 3 ? `<div class="eq ok">${t_(TX.mean)}:  ${MEAN.toFixed(1)} s</div><div class="eq">${t_(TX.spread)}:  ${spread.toFixed(2)} %</div>` : '');
    } else if (name === 'calc') {
      po = fade(t, a + 0.3, b);
      const nu = C * MEAN, eta = nu * RHO, k = n => t >= a + 0.8 + n * 1.3;
      ph = `<h3>${t_(TX.calcH)}</h3>` +
        (k(0) ? `<div class="eq">C (cert., 30 °C) = ${C.toFixed(5)} mm²/s²</div>` : '') + (k(1) ? `<div class="eq">t̄ = ${MEAN.toFixed(1)} s</div>` : '') +
        (k(2) ? `<div class="eq ok">ν = C · t̄ = ${nu.toFixed(3)} mm²/s</div>` : '') + (k(3) ? `<div class="eq">ρ (30 °C) = ${RHO.toFixed(3)} g/cm³</div>` : '') +
        (k(4) ? `<div class="eq ok">η = ν · ρ = ${eta.toFixed(3)} mPa·s</div>` : '') + (k(5) ? `<div class="note">${t_(TX.crit)}<br>${t_(TX.illus)}</div>` : '');
    }
    pn.innerHTML = ph; pn.style.opacity = po;
    // stopwatch
    const w = $('#watch'); let wo = 0, wt = 0, ws = '';
    if (name === 'timing') { wo = fade(t, a, b); wt = t < tE ? 0 : t > tF ? RUNS[0] : (t - tE) / (tF - tE) * RUNS[0]; ws = `${t_(TX.lapse)} ×${Math.round(RUNS[0] / (tF - tE))} · ${t_(TX.real)}`; }
    if (name === 'repeat') {
      wo = fade(t, a, b); const c = t < 105 ? 1 : 2, s0 = 100 + (c - 1) * 5, u = seg(t, s0 + 1.6, s0 + 4.3); wt = u * RUNS[c]; ws = `${t_(TX.lapse)} · ${t_(TX.real)}`;
    }
    if (name === 'bath') { wo = fade(t, a + 2.5, b); const u = seg(t, 61, 68.5); wt = u * 600; ws = t_(TX.wait); }
    w.style.opacity = wo; w.querySelector('.t').textContent = name === 'bath' ? `${String(Math.floor(wt / 60)).padStart(2, '0')}:${String(Math.floor(wt % 60)).padStart(2, '0')} min` : `${wt.toFixed(1)} s`;
    w.querySelector('.s').textContent = ws;
    // bath temperature
    const tp = $('#temp'); tp.style.opacity = ['bath', 'drawup', 'timing', 'repeat'].includes(name) ? fade(t, name === 'bath' ? a + 1 : a, b + (name === 'repeat' ? 0 : 1)) : 0;

    // start / stop flags
    const fl = $('#flag'); let fo = 0, ftx = '';
    if (Math.abs(t - tE) < 1.1) { fo = 1 - Math.abs(t - tE) / 1.1; ftx = t_(TX.start); }
    if (t > tF - 0.2 && t < tF + 1.6) { fo = 1 - Math.abs(t - (tF + 0.5)) / 1.2; ftx = t_(TX.stop); }
    fl.style.opacity = clamp01(fo); fl.textContent = ftx;
  }

  /* ------------------------------------------------------------------ state at time t */
  function frame(t) {
    const sc = sceneAt(t);
    // defaults
    pivot.rotation.set(0, 0, 0); pivot.position.set(0, 0.7, 0);
    local.n = [9, -9]; local.r = [9, -9];
    SN.visible = SW.visible = false; SN.userData.b.scale.set(1, 1.4, 1); SW.userData.b.scale.set(1, 1.4, 1);
    beaker.visible = false; bath.visible = false; men.visible = false;
    drops.forEach(d => { d.visible = false; }); arrows.forEach(a => { a.visible = false; });

    if (t < 9) pivot.rotation.y = 0.9 * (1 - ss(t / 9));
    // cleaning
    if (t >= 31.5 && t < 36.8) {
      const u = (t - 31.5) / 5.3;
      drops.forEach((d, i) => { const s = u * 1.6 - i * 0.045; if (s > 0 && s < 1) { d.visible = true; d.position.copy(path.getPointAt(s)); } });
    }
    if (t >= 36.8 && t < 40.8) arrows.forEach((a, i) => { a.visible = true; a.position.y = 1.33 + 0.03 * Math.sin((t - 36.8) * 8 + i); });
    // charging (inverted)
    if (t >= 41 && t < 58) {
      const rz = t < 51.5 ? Math.PI * ss(seg(t, 41.3, 43)) : Math.PI * (1 - ss(seg(t, 51.5, 54)));
      pivot.rotation.z = rz;
      const dip = t < 50 ? ss(seg(t, 43, 44.5)) : 1 - ss(seg(t, 50, 51.2));
      pivot.position.y = 0.7 - 0.09 * dip;
      beaker.visible = t < 52.5;
      if (t >= 43.5 && t < 50) { SW.visible = true; const sq = t >= 44.5 && t < 49 ? 0.72 + 0.1 * Math.sin((t - 44.5) * 5) : 1; SW.userData.b.scale.set(sq, 1.4, sq); }
      if (t >= 44.5) {
        const front = lerp(1.25, F, ss(seg(t, 44.5, 49)));
        local.n = [front, 1.25];
      }
      if (t >= 54) {
        const p = ss(seg(t, 54, 57.5));
        local.n = [lerp(F, 0.18, clamp01(p * 2.2)), lerp(1.25, 0.33, p)];
        local.r = [0.18, lerp(0.18, 0.33, clamp01(p * 1.4 - 0.4))];
      }
    }
    // in the bath
    if (t >= 58) { bath.visible = true; local.n = [0.18, 0.33]; local.r = [0.18, 0.33]; }
    if (t >= 58 && t < 61) pivot.position.y = 0.7 + 0.55 * (1 - ss(seg(t, 58, 60.5)));
    bath.children.forEach(m => { if (m.material.userData.op === undefined) m.material.userData.op = m.material.opacity; m.material.opacity = m.material.userData.op * ss(seg(t, 58, 59.2)); });
    // draw up and timed fall
    if (t >= 70) {
      if (t < FALL0) {
        const u = ss(seg(t, 71, 76));
        local.n = [0.18, lerp(0.33, TOP, u)]; local.r = [0.18, lerp(0.33, 0.255, u)];
        if (t >= 70.5 && t < 77) { SN.visible = true; const sq = t >= 71 && t < 76 ? 0.72 + 0.1 * Math.sin((t - 71) * 5) : 1; SN.userData.b.scale.set(sq, 1.4, sq); }
      } else if (t < 100) {
        const y = yAt(t), u = seg(t, FALL0, FALL1);
        local.n = [0.18, y]; local.r = [0.18, lerp(0.255, 0.33, u)];
      } else if (t < 110) {
        const c = t < 105 ? 0 : 1, s0 = 100 + c * 5;
        const up = ss(seg(t, s0, s0 + 1.5)), dn = seg(t, s0 + 1.6, s0 + 4.3);
        const y = t < s0 + 1.6 ? lerp(BOT, TOP, up) : lerp(TOP, BOT, dn);
        local.n = [0.18, y]; local.r = [0.18, lerp(0.33, 0.255, (y - BOT) / (TOP - BOT))];
      } else { local.n = [0.18, BOT]; local.r = [0.18, 0.33]; }
      const yN = local.n[1];
      if (t >= 70.5 && t < 110 && yN > 0.4) { men.visible = true; const r = rN(yN); men.scale.set(r, 1, r); men.position.set(NX, yN, 0); }
    }
    cam(t);
    applyClip();
    overlays(t, sc);
    renderer.render(scene, camera);
  }

  window.FILM = { DUR, frame, setLang(l) { lang = l === 'ar' ? 'ar' : 'en'; }, ready: false, events: { tE, tF } };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { window.FILM.ready = true; });

  if (!qs.has('render')) { // live playback in a browser
    const t0 = performance.now();
    const loop = now => { frame(((now - t0) / 1000) % DUR); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  } else frame(0);
})();

/* Residue film: gravimetric residue of a broken guar fluid by vacuum filtration (Whatman ashless 50 mm,
   washing, blank). Time-driven like film.js: frame(t) draws the film at time t (s) for render.js, and a
   browser can play it live. Equipment is schematic and the masses are illustrative. */
(function () {
  'use strict';
  const qs = new URLSearchParams(location.search);
  let lang = qs.get('lang') === 'ar' ? 'ar' : 'en';
  const DUR = 124;
  const $ = s => document.querySelector(s);

  /* ------------------------------------------------------------------ text */
  const L = (en, ar) => ({ en, ar });
  const TX = {
    intro: { h: L('Residue of a broken guar fluid', 'الـ residue للسائل المكسور الذي فيه guar'),
      p: L('Vacuum filtration · Whatman ashless 50 mm · blank-corrected', 'ترشيح تحت التفريغ · Whatman ashless 50 mm · مصحَّح بالـ blank') },
    equip: { tag: L('1 · THE EQUIPMENT', '1 · الأدوات'),
      c: L('Filter paper on a Büchner funnel over a side-arm flask and vacuum pump; DI water for washing; an oven, a desiccator and a 0.1 mg balance.',
        'ورق ترشيح على قمع Büchner فوق دورق جانبي ومضخة تفريغ، وماء مقطّر للغسيل، وفرن ومجفّف (desiccator) وميزان 0.1 mg.') },
    papers: { tag: L('2 · PREPARE TWO PAPERS', '2 · جهّز ورقتين'),
      c: L('One paper for the sample and one blank, same grade. Wash both with DI water under vacuum, dry at 105 °C, cool in the desiccator, then weigh: m₁ and b₁.',
        'ورقة للعيّنة وورقة blank من نفس الدرجة. اغسلهما بماء مقطّر تحت التفريغ، وجفّفهما عند 105 °C، وبرّدهما في المجفّف، ثم زِنهما: m₁ و b₁.') },
    sample: { tag: L('3 · PREPARE THE SAMPLE', '3 · جهّز العيّنة'),
      c: L('Cool the broken fluid to room temperature, record its pH, and measure a fixed volume, here 50 mL.',
        'برّد السائل المكسور إلى حرارة الغرفة، وسجّل الـ pH، وخذ حجماً ثابتاً، هنا 50 mL.') },
    filter: { tag: L('4 · FILTER UNDER VACUUM', '4 · رشّح تحت التفريغ'),
      c: L('Put the sample paper in the funnel with forceps, wet it with DI water, start the vacuum and pour in the 50 mL. Very slow filtration means the fluid is not broken.',
        'ضع ورقة العيّنة في القمع بالملقط، وبلّلها بماء مقطّر، وشغّل التفريغ، واسكب الـ 50 mL. الترشيح البطيء جداً يعني أن السائل لم ينكسر.') },
    wash: { tag: L('5 · RINSE AND WASH', '5 · اشطف واغسل'),
      c: L('Rinse the container onto the paper, then wash the cake 3 times with about 10 mL DI water to remove dissolved KCl, oleate and APS. Pass the same water through the blank paper.',
        'اشطف الوعاء على الورقة، ثم اغسل الكعكة 3 مرات بنحو 10 mL ماء مقطّر لإزالة KCl والـ oleate والـ APS الذائبة. مرّر نفس الماء على ورقة الـ blank.') },
    dry: { tag: L('6 · DRY AND COOL', '6 · جفّف وبرّد'),
      c: L('Dry both papers at 105 °C (about 2 h), then cool them in the desiccator (about 30 min) before weighing.',
        'جفّف الورقتين عند 105 °C (نحو 2 h)، ثم برّدهما في المجفّف (نحو 30 min) قبل الوزن.') },
    weigh: { tag: L('7 · WEIGH TO CONSTANT MASS', '7 · زِن حتى ثبات الكتلة'),
      c: L('Weigh, dry again and re-weigh until two successive weighings differ by 0.3 mg or less.',
        'زِن، ثم جفّف مرة أخرى وزِن، حتى يختلف وزنان متتاليان بـ 0.3 mg أو أقل.') },
    calc: { tag: L('8 · CALCULATE', '8 · احسب'),
      c: L('Subtract the blank’s change from the sample’s, divide by the volume, and report mg/L and the share of the guar added.',
        'اطرح تغيّر الـ blank من تغيّر العيّنة، واقسم على الحجم، وسجّل النتيجة بالـ mg/L وكنسبة من الـ guar المضاف.') },
    outro: { h: L('Repeat on 3 independent samples', 'كرّر على 3 عينات مستقلة'),
      p: L('Report the mean ± SD in mg/L. A low pH after APS can precipitate oleic acid and inflate the residue: check the pH.',
        'سجّل المتوسط ± SD بالـ mg/L. انخفاض الـ pH بعد الـ APS قد يرسّب oleic acid فيرفع الـ residue خطأً: راقب الـ pH.') },
    eq: {
      paper: L('Whatman ashless 50 mm', 'ورق Whatman ashless 50 mm'), funnel: L('Büchner funnel', 'قمع Büchner'), flask: L('Side-arm filter flask', 'دورق ترشيح جانبي'),
      pump: L('Vacuum pump', 'مضخة تفريغ'), wash: L('DI water wash bottle', 'قارورة ماء مقطّر'), oven: L('Oven 105 °C', 'فرن 105 °C'),
      des: L('Desiccator', 'مجفّف (desiccator)'), bal: L('Balance 0.1 mg', 'ميزان 0.1 mg'),
    },
    balance: L('balance', 'الميزان'), oven: L('oven 105 °C', 'الفرن 105 °C'), desic: L('desiccator', 'المجفّف'), vacuum: L('vacuum on', 'التفريغ يعمل'),
    sampleP: L('sample paper', 'ورقة العيّنة'), blankP: L('blank paper', 'ورقة الـ blank'), constant: L('constant', 'ثابتة'), again: L('dry again', 'جفّف مرة أخرى'),
    weighH: L('Weighings', 'الأوزان'), calcH: L('Result', 'النتيجة'), illus: L('Illustrative numbers.', 'أرقام توضيحية.'),
    guarAdded: L('guar in 50 mL', 'الـ guar في \u206650 mL\u2069'), share: L('share of guar', 'نسبة من الـ guar'), ph: L('record the pH', 'سجّل الـ pH'),
  };
  // In Arabic captions keep "50 mL", "0.9 mm²/s", "±0.02 °C" in reading order by isolating them as LTR runs
  const UNIT = /([±]?\d[\d.,]*\s?(?:mm²\/s²|mm²\/s|mg\/L|g\/L|mL|mg|mm|min|°C|h|s|g|L|%)(?![A-Za-z²]))/g;
  const t_ = o => { const v = o[lang]; return lang === 'ar' && typeof v === 'string' ? v.replace(UNIT, '\u2066$1\u2069') : v; };
  const rtl = () => lang === 'ar';
  const num = x => `<bdi dir="ltr">${x}</bdi>`;

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
  const glass = (o = 0.22) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: o, roughness: 0.03, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 2.4), std(0x1c2630, { roughness: 0.9 })); bench.position.set(0, -0.05, 0); scene.add(bench);

  // filter flask with side arm, Büchner funnel, vacuum pump
  const flask = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.34, 0], [0.35, 0.03], [0.34, 0.2], [0.09, 0.78], [0.07, 0.86], [0.07, 0.96]].map(p => new THREE.Vector2(...p)), 48), glass());
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 16), glass(0.35)); arm.rotation.z = Math.PI / 2; arm.position.set(0.18, 0.86, 0);
  const filtrate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 1, 40), std(0xf3e2a6, { transparent: true, opacity: 0.6, depthWrite: false })); filtrate.visible = false;
  const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.09, 24), std(0x222831)); stopper.position.y = 0.97;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.2, 20), std(0xf7f7f4, { roughness: 0.35 })); stem.position.y = 1.05;
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.22, 48, 1, true), std(0xf7f7f4, { roughness: 0.35, side: THREE.DoubleSide })); funnel.position.y = 1.24;
  const plate = new THREE.Mesh(new THREE.CircleGeometry(0.155, 40), std(0xd9dbdc)); plate.rotation.x = -Math.PI / 2; plate.position.y = 1.16;
  const fPaper = new THREE.Mesh(new THREE.CircleGeometry(0.15, 40), std(0xffffff, { roughness: 0.95, side: THREE.DoubleSide })); fPaper.rotation.x = -Math.PI / 2; fPaper.position.y = 1.165; fPaper.visible = false;
  const fLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.157, 1, 40), std(0xf2c35e, { transparent: true, opacity: 0.8, depthWrite: false })); fLiq.visible = false;
  const pump = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.32), std(0x2b3440)); pump.position.set(0.95, 0.15, -0.25);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshBasicMaterial({ color: 0x334033 })); led.position.set(0.85, 0.22, -0.085);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.3, 0.86, 0), new THREE.Vector3(0.55, 0.75, 0), new THREE.Vector3(0.75, 0.35, -0.15), new THREE.Vector3(0.85, 0.3, -0.25)]), 30, 0.022, 10), std(0xc8352a, { roughness: 0.6 }));
  [flask, arm, filtrate, stopper, stem, funnel, plate, fPaper, fLiq, pump, led, hose].forEach(m => scene.add(m));

  // 50 mL graduated cylinder, wash bottle, pH meter
  const cylG = new THREE.Group();
  const cylBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 24, 1, true), glass(0.3)); cylBody.position.y = 0.3;
  const cylBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 24), std(0xe8eef3)); cylBase.position.y = 0.01;
  const cylLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 24), std(0xf2c35e, { transparent: true, opacity: 0.85 })); cylLiq.visible = false;
  cylG.add(cylBase, cylBody, cylLiq); cylG.position.set(-0.75, 0, 0.35); scene.add(cylG);
  const wb = new THREE.Group();
  const wbBody = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.11, 0], [0.12, 0.03], [0.12, 0.3], [0.06, 0.38], [0.03, 0.42]].map(p => new THREE.Vector2(...p)), 32), std(0xeef6fb, { transparent: true, opacity: 0.85 }));
  const nozzle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.42, 0), new THREE.Vector3(0, 0.52, 0), new THREE.Vector3(0.08, 0.56, 0), new THREE.Vector3(0.14, 0.52, 0)]), 20, 0.008, 8), std(0xeef6fb));
  wb.add(wbBody, nozzle); wb.position.set(-0.75, 0, -0.35); scene.add(wb);
  const spray = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3)),
    new THREE.PointsMaterial({ color: 0xbfe6ff, size: 0.025, transparent: true, opacity: 0.9 }));
  spray.visible = false; spray.frustumCulled = false; scene.add(spray);

  // oven, desiccator, balance
  const oven = new THREE.Group();
  const ob = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.7), std(0xdfe3e7, { roughness: 0.4, metalness: 0.2 })); ob.position.y = 0.375;
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.38), std(0x1c232b, { emissive: 0x000000 })); win.position.set(-0.08, 0.4, 0.351);
  oven.add(ob, win); oven.position.set(-2.35, 0, -0.25); scene.add(oven);
  const des = new THREE.Group();
  const dBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.32, 40, 1, true), glass(0.3)); dBody.position.y = 0.16;
  const dLid = new THREE.Mesh(new THREE.SphereGeometry(0.33, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), glass(0.3)); dLid.scale.y = 0.45; dLid.position.y = 0.32;
  const gel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 40), std(0x4a7bd1, { roughness: 0.8 })); gel.position.y = 0.04;
  const shelf = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.01, 40), std(0xcfd5db)); shelf.position.y = 0.12;
  des.add(gel, shelf, dBody, dLid); des.position.set(-1.35, 0, 0.55); scene.add(des);
  const bal = new THREE.Group();
  const bb = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.8), std(0xe9ecef, { roughness: 0.35 })); bb.position.y = 0.07;
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.55), glass(0.16)); shield.position.set(0, 0.42, -0.05);
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 32), std(0xbfc4c9, { metalness: 0.8, roughness: 0.3 })); pan.position.set(0, 0.16, -0.05);
  bal.add(bb, pan, shield); bal.position.set(2.2, 0, 0); scene.add(bal);

  // dishes carrying the sample paper and the blank paper
  function dish(col) {
    const g = new THREE.Group();
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.025, 32), glass(0.45));
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.004, 32), std(col, { roughness: 0.95 })); p.position.y = 0.016;
    g.add(d, p); g.userData.paper = p; scene.add(g); return g;
  }
  const dS = dish(0xffffff), dB = dish(0xffffff);
  const cake = new THREE.Color(0xc9b27a), white = new THREE.Color(0xffffff);

  /* ------------------------------------------------------------------ helpers */
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ss = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const fade = (t, a, b, f = 0.5) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));
  const lerp3 = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
  // path of a dish through stops, with timed moves
  function route(stops, t) {
    let p = stops[0][1];
    for (let i = 1; i < stops.length; i++) { const [t0, a] = stops[i - 1], [t1, b] = stops[i]; if (t >= t0) p = lerp3(a, b, ss(seg(t, t0, t1))); }
    return p;
  }
  const P = { bench: [-1.5, 0.02, 0.8], benchB: [-1.15, 0.02, 0.95], oven: [-2.42, 0.25, -0.15], ovenB: [-2.18, 0.25, -0.3], des: [-1.42, 0.135, 0.5], desB: [-1.25, 0.135, 0.62],
    bal: [2.2, 0.17, -0.05], balB: [1.65, 0.02, 0.45], fun: [0.0, 1.33, 0.0] };
  const SCENES = [['intro', 0, 8], ['equip', 8, 21], ['papers', 21, 35], ['sample', 35, 45], ['filter', 45, 62], ['wash', 62, 74], ['dry', 74, 87],
    ['weigh', 87, 101], ['calc', 101, 114], ['outro', 114, DUR]];
  const sceneAt = t => SCENES.find(s => t >= s[1] && t < s[2]) || SCENES[SCENES.length - 1];
  const CAMK = [
    [0, [0, 3.3, 6.8], [0, 1.45, 0]], [7, [0, 3.3, 6.8], [0, 1.45, 0]], [8.5, [0, 2.4, 7.0], [0.05, 0.55, 0]], [21, [0, 2.4, 7.0], [0.05, 0.55, 0]],
    [22.5, [-0.6, 1.9, 4.6], [-0.4, 0.4, 0]], [34, [-0.6, 1.9, 4.6], [-0.4, 0.4, 0]],
    [35.5, [-0.4, 1.4, 2.6], [-0.4, 0.55, 0]], [44, [-0.4, 1.4, 2.6], [-0.4, 0.55, 0]],
    [45.5, [0.15, 1.75, 1.75], [0, 1.0, 0]], [61, [0.15, 1.75, 1.75], [0, 1.0, 0]], [62.5, [-0.2, 1.8, 1.9], [-0.15, 1.0, 0]], [73, [-0.2, 1.8, 1.9], [-0.15, 1.0, 0]],
    [74.5, [-1.0, 1.8, 4.2], [-1.2, 0.4, 0]], [86, [-1.0, 1.8, 4.2], [-1.2, 0.4, 0]],
    [87.5, [2.6, 1.2, 2.2], [1.95, 0.3, 0]], [100, [2.6, 1.2, 2.2], [1.95, 0.3, 0]],
    [101.5, [1.9, 1.5, 3.4], [2.6, 0.35, 0]], [113, [1.9, 1.5, 3.4], [2.6, 0.35, 0]], [115.5, [0, 3.3, 6.8], [0, 1.45, 0]], [DUR, [0, 3.3, 6.8], [0, 1.45, 0]],
  ];
  function cam(t) {
    let i = 0; while (i < CAMK.length - 2 && t >= CAMK[i + 1][0]) i++;
    const [t0, p0, q0] = CAMK[i], [t1, p1, q1] = CAMK[i + 1], u = ss((t - t0) / (t1 - t0));
    camera.position.set(...lerp3(p0, p1, u)); camera.lookAt(...lerp3(q0, q1, u)); camera.updateMatrixWorld();
  }
  const proj = v => { const p = new THREE.Vector3(...v).project(camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; };

  // masses (g) and results — illustrative
  const M1 = 0.1994, B1 = 0.1988, M2 = [0.2287, 0.2275, 0.2274], B2 = [0.2001, 0.1987, 0.1986], V = 50, GUAR = 0.7;
  const dS_ = (M2[2] - M1) - (B2[2] - B1), mgL = dS_ * 1e6 / V, guarMg = GUAR * V / 100 * 1000;
  // what the balance shows over time
  function balanceAt(t) {
    if (t >= 30.5 && t < 33) return { m: M1, who: 'sampleP' };
    if (t >= 33 && t < 35) return { m: B1, who: 'blankP' };
    const k = t < 91 ? 0 : t < 95 ? 1 : 2;
    if (t >= 88 && t < 99.5) { const sub = (t - 88) % 4; return { m: sub < 2.6 ? M2[k] : B2[k], who: sub < 2.6 ? 'sampleP' : 'blankP' }; }
    return null;
  }

  /* ------------------------------------------------------------------ overlays */
  const EQ = [['paper', [0, 1.2, 0], -1, 0, -50], ['funnel', [0.17, 1.28, 0], 1, 0.7, -50], ['flask', [0.25, 0.3, 0.1], 1, 1.4, 90], ['pump', [0.95, 0.3, -0.25], 1, 2.1, -60],
    ['wash', [-0.75, 0.42, -0.35], -1, 2.8, -60], ['oven', [-2.35, 0.75, -0.25], -1, 3.5, -50], ['des', [-1.35, 0.42, 0.55], -1, 4.2, 60], ['bal', [2.2, 0.7, 0], 1, 4.9, -50]];
  function overlays(t, sc) {
    const [name, a, b] = sc;
    document.documentElement.dir = rtl() ? 'rtl' : 'ltr'; document.documentElement.lang = lang;
    const ti = $('#title'), isT = name === 'intro' || name === 'outro';
    ti.style.opacity = isT ? fade(t, a, b, 0.8) : 0; ti.style.top = '12%';
    if (isT) { ti.querySelector('h1').textContent = t_(TX[name].h); ti.querySelector('p').textContent = t_(TX[name].p); }
    const cap = $('#cap');
    if (!isT) { cap.innerHTML = `<b>${t_(TX[name].tag)}</b>${t_(TX[name].c)}`; cap.style.opacity = fade(t, a, b); } else cap.style.opacity = 0;
    // equipment labels
    let lh = '', sv = '';
    if (name === 'equip') {
      for (const [k, p, side, d, dy] of EQ) {
        const o = fade(t, a + 0.5 + d, b, 0.4); if (o <= 0) continue;
        const [px, py] = proj(p), lx = px + side * 150, ly = py + dy;
        sv += `<line x1="${px}" y1="${py}" x2="${lx}" y2="${ly}" stroke="rgba(255,255,255,${0.75 * o})" stroke-width="2"/><circle cx="${px}" cy="${py}" r="5" fill="rgba(255,233,168,${o})"/>`;
        lh += `<div class="lab" style="opacity:${o};top:${ly - 22}px;${side < 0 ? `right:${innerWidth - lx}px` : `left:${lx}px`}">${t_(TX.eq[k])}</div>`;
      }
    }
    $('#labels').innerHTML = lh; $('#lines').innerHTML = sv;
    // balance / oven / pH readouts (top-left boxes)
    const w = $('#watch'), bal = balanceAt(t); let wo = 0, wt = '', ws = '';
    if (bal) { wo = 1; wt = `${bal.m.toFixed(4)} g`; ws = `${t_(TX.balance)} · ${t_(TX[bal.who])}`; }
    else if ((t >= 23.5 && t < 27) || (t >= 77.5 && t < 82)) { wo = 1; const u = t < 30 ? seg(t, 24, 26.5) : seg(t, 78, 81.5); wt = `${(u * 2).toFixed(1)} h`; ws = t_(TX.oven); }
    else if ((t >= 27.5 && t < 30) || (t >= 82 && t < 86)) { wo = 1; const u = t < 31 ? seg(t, 27.5, 29.5) : seg(t, 82.5, 85); wt = `${Math.round(u * 30)} min`; ws = t_(TX.desic); }
    else if (t >= 38 && t < 44.5) { wo = 1; wt = 'pH'; ws = t_(TX.ph); }
    w.style.opacity = wo; w.querySelector('.t').textContent = wt; w.querySelector('.s').textContent = ws;
    const tp = $('#temp'), vac = t >= 47 && t < 74; tp.style.opacity = vac ? 1 : 0; tp.textContent = t_(TX.vacuum);
    // panels
    const pn = $('#panel'); let ph = '', po = 0; const d = rtl() ? 'rtl' : 'ltr';
    if (name === 'weigh') {
      po = fade(t, a + 0.4, b); const n = 1 + (t >= 91) + (t >= 95);
      const w = x => `<bdi class="w">${x}</bdi>`;
      ph = `<h3>${t_(TX.weighH)}</h3><div class="eq">m₁ = ${M1.toFixed(4)} g · b₁ = ${B1.toFixed(4)} g</div>` +
        M2.slice(0, n).map((m, i) => `<div class="eq ${i === 2 ? 'ok' : ''}">#${i + 1}  m₂ = ${m.toFixed(4)} g${i ? ` · Δ = ${((M2[i - 1] - m) * 1000).toFixed(1)} mg` : ''}${i === 2 ? ` ✓ ${w(t_(TX.constant))}` : i < n - 1 ? '' : ` → ${w(t_(TX.again))}`}</div>`).join('') +
        (n === 3 ? `<div class="eq">b₂ = ${B2[2].toFixed(4)} g</div>` : '');
    } else if (name === 'calc') {
      po = fade(t, a + 0.3, b); const k = i => t >= a + 0.8 + i * 1.4;
      ph = `<h3>${t_(TX.calcH)}</h3>` +
        (k(0) ? `<div class="eq">m₂ − m₁ = ${((M2[2] - M1) * 1000).toFixed(1)} mg</div>` : '') +
        (k(1) ? `<div class="eq">b₂ − b₁ = ${((B2[2] - B1) * 1000).toFixed(1)} mg</div>` : '') +
        (k(2) ? `<div class="eq">Δ = ${(dS_ * 1000).toFixed(1)} mg</div>` : '') +
        (k(3) ? `<div class="eq ok">residue = Δ / V = ${(dS_ * 1000).toFixed(1)} mg / 0.050 L = ${mgL.toFixed(0)} mg/L</div>` : '') +
        (k(4) ? `<div class="eq" dir="${d}">${t_(TX.guarAdded)}: ${num(`${guarMg.toFixed(0)} mg`)}</div><div class="eq ok" dir="${d}">${t_(TX.share)}: ${num(`${(dS_ * 1000 / guarMg * 100).toFixed(1)} %`)}</div>` : '') +
        (k(5) ? `<div class="note">${t_(TX.illus)}</div>` : '');
    }
    pn.innerHTML = ph; pn.style.opacity = po;
    $('#flag').style.opacity = 0;
  }

  /* ------------------------------------------------------------------ state at time t */
  function frame(t) {
    const sc = sceneAt(t);
    // dishes: papers prepared (oven → desiccator → balance), then the sample paper goes into the funnel and back
    const sStops = [[0, P.bench], [22, P.bench], [23.5, P.oven], [27, P.oven], [28.5, P.des], [29.6, P.des], [30.6, P.bal], [33, P.bal], [34.2, P.bench],
      [45, P.bench], [46.5, P.fun], [74, P.fun], [75.5, P.bench], [76, P.bench], [77.5, P.oven], [82, P.oven], [83.5, P.des], [86, P.des], [87.6, P.bal]];
    const bStops = [[0, P.benchB], [22, P.benchB], [23.5, P.ovenB], [27, P.ovenB], [28.5, P.desB], [29.6, P.desB], [32.6, P.desB], [33.4, P.bal], [34.4, P.benchB],
      [76, P.benchB], [77.5, P.ovenB], [82, P.ovenB], [83.5, P.desB], [86, P.desB], [87.6, P.balB]];
    let sp = route(sStops, t), bp = route(bStops, t);
    // on the balance, sample and blank take turns
    if (t >= 88 && t < 99.5) { const sub = (t - 88) % 4; if (sub >= 2.6) { const tmp = sp; sp = P.balB; bp = P.bal; void tmp; } }
    if (t >= 33 && t < 34.2) sp = route([[33, P.bal], [34.2, P.bench]], t);
    dS.position.set(...sp); dB.position.set(...bp);
    // the sample paper sits in the funnel from 46.5 to 74 (dish hidden there; paper drawn in the funnel)
    const inFunnel = t >= 46.5 && t < 74;
    dS.visible = !inFunnel; fPaper.visible = inFunnel;
    const tint = ss(seg(t, 50, 60));
    fPaper.material.color.lerpColors(white, cake, 0.15 + 0.7 * tint);
    dS.userData.paper.material.color.lerpColors(white, cake, t >= 74 ? 0.85 : 0);
    // oven glow while drying
    const ovenOn = (t >= 23.5 && t < 27) || (t >= 77.5 && t < 82);
    win.material.emissive.setHex(ovenOn ? 0x6a2a0c : 0x000000);
    // vacuum pump
    const vac = t >= 47 && t < 74; led.material.color.setHex(vac ? 0x29ff8a : 0x334033);
    // graduated cylinder: filled at 36–38, pours at 48–52
    cylLiq.visible = t >= 36 && t < 52.2;
    const fillC = ss(seg(t, 36, 38)) * (1 - ss(seg(t, 48.5, 51.8)));
    cylLiq.scale.y = Math.max(0.001, 0.5 * fillC); cylLiq.position.y = 0.02 + 0.25 * fillC;
    const pour = ss(seg(t, 47, 48.5)) * (1 - ss(seg(t, 52, 53.5)));
    cylG.position.set(lerp(-0.75, -0.22, pour), lerp(0, 1.3, pour), lerp(0.35, 0.05, pour)); cylG.rotation.z = -2.0 * ss(seg(t, 48.2, 49.2)) * (1 - ss(seg(t, 51.8, 52.6)));
    // liquid in the funnel and filtrate in the flask
    let lvl = 0;
    if (t >= 48.5 && t < 62) lvl = 0.13 * ss(seg(t, 48.5, 51.5)) * (1 - seg(t, 51.5, 60.5));
    let washI = -1;
    for (let i = 0; i < 3; i++) { const s0 = 63 + i * 3.6; if (t >= s0 && t < s0 + 3.4) { washI = i; lvl = 0.05 * ss(seg(t, s0 + 0.4, s0 + 1.2)) * (1 - seg(t, s0 + 1.2, s0 + 3.2)); } }
    fLiq.visible = lvl > 0.002; fLiq.scale.y = Math.max(0.001, lvl); fLiq.position.y = 1.168 + lvl / 2;
    fLiq.material.color.setHex(washI >= 0 ? 0xcfeaff : 0xf2c35e);
    const fil = 0.12 * seg(t, 51.5, 60.5) + 0.06 * seg(t, 63, 74);
    filtrate.visible = fil > 0.002; filtrate.scale.y = Math.max(0.001, fil); filtrate.position.y = 0.02 + fil / 2;
    // wash bottle: squirt during washes
    const squirt = washI >= 0 && (t - (63 + washI * 3.6)) < 1.2;
    const wbT = ss(seg(t, 62, 63)) * (1 - ss(seg(t, 73.5, 74.5)));
    wb.position.set(lerp(-0.75, -0.42, wbT), lerp(0, 1.12, wbT), lerp(-0.35, 0.0, wbT)); wb.rotation.z = -0.9 * wbT;
    spray.visible = squirt;
    if (squirt) {
      wb.updateMatrixWorld();
      const tip = new THREE.Vector3(0.14, 0.52, 0).applyMatrix4(wb.matrixWorld), pa = spray.geometry.attributes.position;
      for (let i = 0; i < 60; i++) { const u = ((i / 60) + t * 2.2) % 1; pa.setXYZ(i, lerp(tip.x, 0.0, u), lerp(tip.y, 1.2, u) + 0.12 * Math.sin(u * Math.PI), lerp(tip.z, 0, u)); }
      pa.needsUpdate = true;
    }
    cam(t);
    overlays(t, sc);
    renderer.render(scene, camera);
  }

  window.FILM = { DUR, frame, setLang(l) { lang = l === 'ar' ? 'ar' : 'en'; }, ready: false };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { window.FILM.ready = true; });
  if (!qs.has('render')) { const t0 = performance.now(); const loop = now => { frame(((now - t0) / 1000) % DUR); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  else frame(0);
})();

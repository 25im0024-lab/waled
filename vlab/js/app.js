/* Virtual Lab — shell: renderer, camera, picking, tweens, labels, step cards, instrument panel, i18n,
   presentation mode. Lessons (gel.js, break.js) register themselves in VL.lessons and build into VL.root. */
(function () {
  'use strict';
  const M = window.VLabModel;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  const UI = {
    ar: {
      brand: 'مختبر جل التكسير WLM', home: 'كل الأدوات', lessonGel: 'تحضير الجل', lessonBreak: 'اختبار الكسر (حمام مائي)', lessonGelS: 'التحضير', lessonBreakS: 'الكسر', present: '▶ عرض', exitPresent: '■ إنهاء العرض',
      reset: '↺ إعادة', doit: 'نفّذ الخطوة', next: 'التالي ›', stepOf: (i, n) => `الخطوة ${i} من ${n}`, finished: 'اكتملت كل الخطوات. جرّب بحرية أو أعد البدء.',
      fact: 'ثابت', inf: 'استنتاج', illu: 'توضيحي', spec: 'تخمين', nano: 'Nano view', busy: 'انتظر انتهاء الحركة الحالية',
      noWebGL: 'المتصفح لا يدعم WebGL، والمختبر يحتاجه.', stepDone: 'تمت الخطوة ✓', keys: 'العرض: → أو PageDown للتالي، ← أو PageUp للسابق، Esc للخروج.',
    },
    en: {
      brand: 'WLM Frac Gel Lab', home: 'All tools', lessonGel: 'Gel preparation', lessonBreak: 'Break test (water bath)', lessonGelS: 'Prepare', lessonBreakS: 'Break', present: '▶ Present', exitPresent: '■ Exit',
      reset: '↺ Reset', doit: 'Do this step', next: 'Next ›', stepOf: (i, n) => `STEP ${i} OF ${n}`, finished: 'All steps done. Explore freely or reset.',
      fact: 'Established', inf: 'Inference', illu: 'Illustrative', spec: 'Speculation', nano: 'Nano view', busy: 'Wait for the current motion to finish',
      noWebGL: 'This browser has no WebGL, which the lab needs.', stepDone: 'Step done ✓', keys: 'Presenting: → or PageDown = next, ← or PageUp = back, Esc = exit.',
    },
  };
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
  const qs = new URLSearchParams(location.search);
  let lang = qs.get('lang') || store.get('vlab.lang') || 'ar';
  if (!UI[lang]) lang = 'ar';

  const VL = window.VL = { M, $, $$, lessons: {}, labels: [], busy: 0, store };
  VL.lang = () => lang;
  // In Arabic text, keep "100 mL", "589.0 nm", "25 °C" in reading order by isolating them as LTR runs.
  const UNIT_RUN = /(\d[\d.,]*(?:\s?[–-]\s?\d[\d.,]*)?\s?(?:g\/100 mL|mPa·s|Pa·s|kJ\/mol|mN\/m|m\/s|mm\/s|g\/L|ppg|mL|mM|nm|°C|rpm|min|Pa|g|h|s)(?![A-Za-z]))/g;
  const bidi = s => lang === 'ar' && typeof s === 'string' ? s.replace(UNIT_RUN, '\u2066$1\u2069') : s;
  VL.t = o => typeof o === 'string' ? (UI[lang][o] ?? UI.en[o] ?? o) : o && typeof o === 'object' ? bidi(o[lang] ?? o.en) : '';
  VL.fmt = (v, unit) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return '—';
    const a = Math.abs(v); let s;
    if (a === 0) s = '0'; else if (a >= 1e4 || a < 1e-3) s = v.toExponential(1).replace('e', '×10^').replace(/\^\+?(-?)(\d+)/, (_, m, d) => toSup(m + d));
    else if (a >= 100) s = v.toFixed(0); else if (a >= 10) s = v.toFixed(1); else if (a >= 1) s = v.toFixed(2); else s = v.toPrecision(2);
    return unit ? `${s} ${unit}` : s;
  };
  const toSup = s => s.replace(/[-0-9]/g, c => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);

  /* ------------------------------------------------------------------ three.js stage */
  let renderer, scene, camera, controls;
  const clock = { last: 0 };
  const darkMQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  VL.dark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : darkMQ.matches;

  function initThree() {
    try {
      renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true });
    } catch (e) { document.body.insertAdjacentHTML('beforeend', `<p style="position:fixed;top:80px;left:20px;right:20px;z-index:9">${VL.t('noWebGL')}</p>`); return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 1.6; controls.maxDistance = 14; controls.maxPolarAngle = Math.PI * 0.48;
    controls.enablePan = true; controls.screenSpacePanning = true;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a948a, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(3.5, 8, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 5, bottom: -4, near: 1, far: 25 }); sun.shadow.bias = -0.0004;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xdfe9ff, 0.25); fill.position.set(-5, 4, 3); scene.add(fill);

    // bench + wall
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.12, 3.6), new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.55 }));
    benchTop.position.set(0, -0.06, 0.2); benchTop.receiveShadow = true; scene.add(benchTop);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(8.44, 0.05, 3.64), new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: 0.5 }));
    edge.position.set(0, -0.145, 0.2); scene.add(edge);
    const body = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.2, 3.4), new THREE.MeshStandardMaterial({ color: 0x5d6b79, roughness: 0.8 }));
    body.position.set(0, -1.27, 0.2); scene.add(body);
    VL.wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshStandardMaterial({ color: 0xe6e9ec, roughness: 0.95 }));
    VL.wall.position.set(0, 3, -1.75); VL.wall.receiveShadow = true; scene.add(VL.wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0xbfc5ca, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -2.37; scene.add(floor);
    applyTheme();

    VL.root = new THREE.Group(); scene.add(VL.root);
    VL.scene = scene; VL.camera = camera; VL.controls = controls; VL.renderer = renderer;
    buildHint();
    addEventListener('resize', resize); resize();
    initPicking();
    return true;
  }
  function applyTheme() {
    const d = VL.dark();
    scene.background = new THREE.Color(d ? 0x1a2027 : 0xdfe5ea);
    scene.fog = new THREE.Fog(d ? 0x1a2027 : 0xdfe5ea, 14, 30);
    VL.wall.material.color.set(d ? 0x2a313a : 0xe6e9ec);
  }
  if (darkMQ.addEventListener) darkMQ.addEventListener('change', () => { if (scene) applyTheme(); });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 62 : w / h < 1.2 ? 50 : 40;
    camera.updateProjectionMatrix();
    if (lesson && lesson.resize) lesson.resize();
  }
  VL.home = (pos, target) => {
    VL._home = { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target) };
    camera.position.copy(VL._home.pos); controls.target.copy(VL._home.target); controls.update();
  };
  VL.flyTo = (pos, target, dur = 1.2) => {
    const p0 = camera.position.clone(), t0 = controls.target.clone(), p1 = new THREE.Vector3(...pos), t1 = new THREE.Vector3(...target);
    return VL.tween(dur, k => { camera.position.lerpVectors(p0, p1, k); controls.target.lerpVectors(t0, t1, k); });
  };

  /* ------------------------------------------------------------------ tweens and timing */
  const tweens = [];
  const easeInOut = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  VL.tween = (dur, fn, ease = easeInOut) => new Promise(res => { if (dur <= 0) { fn(1); res(); } else tweens.push({ t: 0, dur, fn, ease, res }); });
  VL.wait = s => VL.tween(s, () => {});
  VL.move = (obj, pos, rotEuler, dur = 0.8) => {
    const p0 = obj.position.clone(), p1 = new THREE.Vector3(...pos);
    const q0 = obj.quaternion.clone(), q1 = rotEuler ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotEuler)) : q0.clone();
    return VL.tween(dur, k => { obj.position.lerpVectors(p0, p1, k); obj.quaternion.slerpQuaternions(q0, q1, k); });
  };
  VL.run = async fn => {
    if (VL.busy) { VL.toast(VL.t('busy')); return; }
    VL.busy++;
    try { await fn(); } finally { VL.busy--; checkStep(true); }
  };

  /* ------------------------------------------------------------------ labels (canvas-texture sprites) */
  const hasArabic = s => /[؀-ۿ]/.test(s);
  function drawLabel(cv, title, sub, accent) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const r = 26;
    g.fillStyle = 'rgba(0,0,0,0.12)'; roundRect(g, 10, 14, W - 20, H - 20, r); g.fill();
    g.fillStyle = '#ffffff'; roundRect(g, 6, 6, W - 16, H - 20, r); g.fill();
    if (accent) { g.fillStyle = accent; roundRect(g, 6, H - 26, W - 16, 12, 6); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fam = 'system-ui, "Segoe UI", Tahoma, Arial, sans-serif';
    const fit = (txt, size, weight, maxW) => { let s = size; do { g.font = `${weight} ${s}px ${fam}`; s -= 2; } while (g.measureText(txt).width > maxW && s > 14); };
    g.fillStyle = '#17212b'; g.direction = hasArabic(title) ? 'rtl' : 'ltr';
    fit(title, 74, 700, W - 60); g.fillText(title, W / 2, sub ? H * 0.36 : H / 2 - 6);
    if (sub) { g.fillStyle = '#6a7580'; g.direction = hasArabic(sub) ? 'rtl' : 'ltr'; fit(sub, 42, 500, W - 50); g.fillText(sub, W / 2, H * 0.68); }
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  VL.label = (title, sub, opts = {}) => {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = sub ? 250 : 170;
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    const w = opts.w || 0.95; sp.scale.set(w, w * cv.height / cv.width, 1);
    sp.renderOrder = 2;
    sp.userData.label = { title, sub, accent: opts.accent, cv, tex };
    sp.userData.redraw = () => { const L = sp.userData.label; drawLabel(L.cv, VL.t(L.title), L.sub ? VL.t(L.sub) : '', L.accent); L.tex.needsUpdate = true; };
    sp.userData.redraw();
    VL.labels.push(sp);
    return sp;
  };
  VL.canvasTexture = (w, h, draw) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    tex.userData = { cv, draw };
    return tex;
  };
  VL.roundRect = roundRect;

  /* common materials */
  VL.glass = (opts = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.22,
    side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05 }, opts));
  VL.std = (color, opts = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.5, metalness: 0 }, opts));
  VL.shadow = obj => { obj.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } }); return obj; };

  /* ------------------------------------------------------------------ picking and hint arrow */
  const picks = [];
  VL.pick = (obj, fn) => { obj.userData.onPick = fn; obj.traverse(o => { o.userData.pickRoot = obj; }); picks.push(obj); return obj; };
  function initPicking() {
    const ray = new THREE.Raycaster(), p = new THREE.Vector2(); let down = null;
    const hit = e => {
      const r = renderer.domElement.getBoundingClientRect();
      p.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(p, camera);
      const live = picks.filter(o => o.parent && o.visible);
      const h = ray.intersectObjects(live, true).find(i => i.object.visible && !i.object.userData.noPick);
      return h ? h.object.userData.pickRoot : null;
    };
    const el = renderer.domElement;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) { down = null; return; }
      down = null; const o = hit(e); if (o && o.userData.onPick) o.userData.onPick();
    });
    el.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') el.style.cursor = hit(e) ? 'pointer' : 'grab'; });
    el.addEventListener('dblclick', () => { if (VL._home) VL.flyTo(VL._home.pos.toArray(), VL._home.target.toArray(), 0.8); });
  }
  let hintObj = null, hintArrow = null;
  function buildHint() {
    hintArrow = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0x19c48c, emissive: 0x0b7a55, emissiveIntensity: 0.6, roughness: 0.35 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 16), m); shaft.position.y = 0.2;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.18, 24), m); head.rotation.x = Math.PI; head.position.y = 0.02;
    hintArrow.add(shaft, head); hintArrow.visible = false; scene.add(hintArrow);
  }
  VL.hint = obj => { hintObj = obj || null; hintArrow.visible = !!obj; };
  const box3 = new THREE.Box3();
  function updateHint(t) {
    if (!hintObj || !hintObj.parent) { hintArrow.visible = false; return; }
    hintArrow.visible = true;
    box3.setFromObject(hintObj);
    const top = hintObj.userData.hintAt ? hintObj.localToWorld(hintObj.userData.hintAt.clone()) : new THREE.Vector3((box3.min.x + box3.max.x) / 2, box3.max.y, (box3.min.z + box3.max.z) / 2);
    hintArrow.position.set(top.x, top.y + 0.18 + 0.06 * Math.sin(t * 4), top.z);
    hintArrow.rotation.y = t;
  }

  /* ------------------------------------------------------------------ toast */
  let toastTimer = 0;
  VL.toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); };

  /* ------------------------------------------------------------------ 2D plots */
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  VL.css = css;
  VL.plot = (cv, cfg) => {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const L = 44, Rm = 10, T = 10, B = 32, pw = W - L - Rm, ph = H - T - B;
    const tx = v => cfg.xlog ? Math.log10(v) : v, ty = v => cfg.ylog ? Math.log10(v) : v;
    const [x0, x1] = cfg.x.map(tx), [y0, y1] = cfg.y.map(ty);
    const X = v => L + (tx(v) - x0) / (x1 - x0) * pw, Y = v => T + ph - (ty(v) - y0) / (y1 - y0) * ph;
    const ink = css('--ink'), mut = css('--muted'), line = css('--line');
    g.font = '11px system-ui, sans-serif'; g.fillStyle = mut; g.strokeStyle = line; g.lineWidth = 1; g.direction = 'ltr';
    const ticks = (a, b, log) => { const r = []; if (log) { for (let e = Math.ceil(a); e <= Math.floor(b); e++) r.push(10 ** e); } else { const st = niceStep((b - a) / 5); for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) r.push(+v.toFixed(10)); } return r; };
    const lab = (v, log) => log ? (v >= 1 && v < 1e4 ? String(v) : '10' + toSup(String(Math.round(Math.log10(v))))) : String(v);
    g.textAlign = 'center';
    for (const v of ticks(x0, x1, cfg.xlog)) { const x = X(v); g.beginPath(); g.moveTo(x, T); g.lineTo(x, T + ph); g.stroke(); g.fillText(lab(v, cfg.xlog), x, T + ph + 14); }
    g.textAlign = 'right';
    for (const v of ticks(y0, y1, cfg.ylog)) { const y = Y(v); g.beginPath(); g.moveTo(L, y); g.lineTo(L + pw, y); g.stroke(); g.fillText(lab(v, cfg.ylog), L - 5, y + 4); }
    g.textAlign = 'center'; g.fillStyle = mut; g.fillText(cfg.xlabel || '', L + pw / 2, H - 4);
    g.save(); g.translate(11, T + ph / 2); g.rotate(-Math.PI / 2); g.fillText(cfg.ylabel || '', 0, 0); g.restore();
    g.save(); g.beginPath(); g.rect(L, T, pw, ph); g.clip();
    for (const s of cfg.series || []) {
      if (!s.pts.length) continue;
      g.strokeStyle = s.color; g.lineWidth = s.width || 2; g.globalAlpha = s.alpha ?? 1; g.setLineDash(s.dash || []);
      g.beginPath(); let started = false;
      for (const [x, y] of s.pts) { if (!(y > 0) && cfg.ylog) { started = false; continue; } const px = X(x), py = Y(y); if (!started) { g.moveTo(px, py); started = true; } else g.lineTo(px, py); }
      g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    }
    for (const v of cfg.vlines || []) { g.strokeStyle = v.color || mut; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(v.x), T); g.lineTo(X(v.x), T + ph); g.stroke(); g.setLineDash([]); }
    g.restore();
    // legend
    let lx = L + 6; g.textAlign = 'left'; g.font = '11.5px system-ui, sans-serif';
    for (const s of (cfg.series || []).filter(s => s.label)) {
      g.fillStyle = s.color; g.globalAlpha = s.alpha ?? 1; g.fillRect(lx, T + 6, 12, 3); g.globalAlpha = 1; g.fillStyle = ink; g.fillText(s.label, lx + 16, T + 11); lx += g.measureText(s.label).width + 30;
    }
    return { X, Y, L, T, pw, ph, g };
  };
  function niceStep(raw) { const p = 10 ** Math.floor(Math.log10(raw)), f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }

  /* ------------------------------------------------------------------ lessons and steps */
  let lesson = null, stepI = 0, lastDone = false;
  const CONF = { fact: 'good', inf: 'warn', spec: 'warn', illu: '' };
  function setLesson(id) {
    if (lesson && lesson.dispose) lesson.dispose();
    // clear previous lesson objects
    for (const o of [...VL.root.children]) { VL.root.remove(o); o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) [].concat(n.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); }); }
    picks.length = 0; VL.labels.length = 0; VL.hint(null); tweens.length = 0; VL.busy = 0;
    lesson = VL.lessons[id]; stepI = 0; lastDone = false;
    $$('.lessons button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.lesson === id)));
    store.set('vlab.lesson', id);
    $('#nanoBox').hidden = !lesson.nano;
    lesson.build();
    renderControls(); renderStep(); refreshInstrument();
  }
  VL.lesson = () => lesson;
  function renderControls() { const el = $('#lessonControls'); el.innerHTML = ''; if (lesson.controls) lesson.controls(el); }
  VL.renderControls = renderControls;
  function renderStep() {
    const steps = lesson.steps, s = steps[stepI], n = steps.length;
    $('#stepNo').textContent = VL.t('stepOf')(stepI + 1, n);
    $('#stepTitle').textContent = VL.t(s.title);
    $('#stepText').textContent = VL.t(s.text);
    $('#stepConf').innerHTML = (s.conf || []).map(c => `<span class="pill ${CONF[c] || ''}">${VL.t(c)}</span>`).join('');
    $('#prev').disabled = stepI === 0;
    $('#next').disabled = stepI === n - 1;
    lastDone = !!s.done();
    $('#stepDone').hidden = !lastDone;
    $('#doit').textContent = lastDone ? (stepI === n - 1 ? '✓' : VL.t('next')) : VL.t('doit');
    $('#doit').disabled = lastDone && stepI === n - 1;
    VL.hint(lastDone ? null : s.target ? s.target() : null);
    if (lesson.onStep) lesson.onStep(stepI);
  }
  VL.renderStep = renderStep;
  function checkStep(force) {
    if (!lesson) return;
    const s = lesson.steps[stepI], d = !!s.done();
    if (d !== lastDone || force) {
      const newly = d && !lastDone;
      renderStep();
      if (newly) VL.toast(stepI === lesson.steps.length - 1 ? VL.t('finished') : VL.t('stepDone'));
    }
  }
  VL.checkStep = checkStep;
  function go(d) { const n = lesson.steps.length; stepI = Math.max(0, Math.min(n - 1, stepI + d)); renderStep(); }
  async function doStep() {
    const s = lesson.steps[stepI];
    if (s.done()) { go(1); return; }
    if (s.auto) await VL.run(s.auto);
  }
  VL.doStep = doStep;

  /* ------------------------------------------------------------------ instrument panel */
  let instTab = null;
  function refreshInstrument() {
    if (!lesson || !lesson.instrument) return;
    const I = lesson.instrument(instTab);
    $('#instTitle').textContent = VL.t(I.title);
    const b = $('#instBadge'); b.textContent = I.badge ? VL.t(I.badge.text) : ''; b.className = 'pill ' + (I.badge ? I.badge.cls || '' : ''); b.hidden = !I.badge;
    const tabs = $('#plotTabs');
    if (I.tabs) {
      tabs.hidden = false;
      if (!I.tabs.some(t => t.id === instTab)) instTab = I.tabs[0].id;
      const sig = I.tabs.map(t => t.id + VL.t(t.label)).join() + instTab;
      if (tabs.dataset.sig !== sig) {
        tabs.dataset.sig = sig;
        tabs.innerHTML = I.tabs.map(t => `<button data-t="${t.id}" aria-pressed="${t.id === instTab}">${VL.t(t.label)}</button>`).join('');
        $$('#plotTabs button').forEach(btn => btn.onclick = () => { instTab = btn.dataset.t; refreshInstrument(); });
      }
    } else { tabs.hidden = true; tabs.dataset.sig = ''; }
    if (I.draw) I.draw($('#plot'), instTab);
    $('#readouts').innerHTML = (I.readouts || []).map(r => `<div class="${r[2] ? 'wide' : ''}"><small>${VL.t(r[0])}</small><b>${r[1]}</b></div>`).join('');
    $('#instNote').textContent = I.note ? VL.t(I.note) : '';
  }
  VL.refreshInstrument = refreshInstrument;
  VL.showTab = id => { instTab = id; refreshInstrument(); };

  /* ------------------------------------------------------------------ i18n */
  function applyLang() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i]').forEach(el => { const k = el.dataset.i; if (el.classList.contains('home')) el.title = VL.t(k); else el.textContent = VL.t(k); });
    $('#btnLang').textContent = lang === 'ar' ? 'EN' : 'عربي';
    $('#btnPresent').textContent = document.body.classList.contains('present') ? VL.t('exitPresent') : VL.t('present');
    VL.labels.forEach(l => l.userData.redraw());
    if (lesson) { if (lesson.relabel) lesson.relabel(); renderControls(); renderStep(); refreshInstrument(); }
  }

  /* ------------------------------------------------------------------ presentation mode */
  function setPresent(on) {
    document.body.classList.toggle('present', on);
    $('#btnPresent').textContent = on ? VL.t('exitPresent') : VL.t('present');
    if (on) { VL.toast(VL.t('keys')); if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); }
    else if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    setTimeout(resize, 200);
  }
  addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && document.body.classList.contains('present'))) { e.preventDefault(); doStep(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    else if (e.key === 'Escape' && document.body.classList.contains('present')) setPresent(false);
  });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('present')) setPresent(false); });

  /* ------------------------------------------------------------------ main loop */
  let tAcc = 0, instAcc = 0, elapsed = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - (clock.last || now)) / 1000); clock.last = now; elapsed += dt;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.ease(k));
      if (k >= 1) { tweens.splice(i, 1); tw.res(); }
    }
    if (lesson && lesson.update) lesson.update(dt, elapsed);
    updateHint(elapsed);
    controls.update();
    renderer.render(scene, camera);
    if (lesson && lesson.renderExtra) lesson.renderExtra(dt, elapsed);
    tAcc += dt; instAcc += dt;
    if (tAcc > 0.25) { tAcc = 0; checkStep(false); }
    if (instAcc > (lesson && lesson.instRate || 0.2)) { instAcc = 0; refreshInstrument(); }
  }

  VL.start = () => {
    if (!initThree()) return;
    applyLang();
    $('#btnLang').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; store.set('vlab.lang', lang); const u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u); applyLang(); };
    $('#btnPresent').onclick = () => setPresent(!document.body.classList.contains('present'));
    $('#btnReset').onclick = () => setLesson(lesson.id);
    $('#prev').onclick = () => go(-1);
    $('#next').onclick = () => go(1);
    $('#doit').onclick = doStep;
    $('#btnCollapse').onclick = () => $('#stepcard').classList.toggle('min');
    $('#instTitle').onclick = () => { if (innerWidth <= 860) $('#instrument').classList.toggle('min'); };
    if (innerWidth <= 860) $('#instrument').classList.add('min');
    $$('.lessons button').forEach(b => b.onclick = () => setLesson(b.dataset.lesson));
    const first = qs.get('lesson') || store.get('vlab.lesson');
    setLesson(VL.lessons[first] ? first : 'gel');
    requestAnimationFrame(frame);
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  };
})();

/* Frac Gel Lab 3D — Lesson 2: static break test in a water bath, then the broken fluid's viscosity
   with a Cannon-Fenske routine viscometer. Sealed vials (one per time point) sit in a thermostatic bath;
   at each time point one vial is taken out for the inversion test, cooled to the measuring temperature,
   cleaned of residue and run through the capillary viscometer: ν = C·t, η = ν·ρ.
   Kinetics and viscosities come from the illustrative model in model.js. */
(function () {
  'use strict';
  const VL = window.VL, M = VL.M;
  const L = (ar, en) => ({ ar, en });
  const PLAN = [...[6, 8, 10].flatMap(n => [0, 0.3, 0.5, 0.7].map(g => [n, g])), [0, 0.7]];
  const sampleName = (n, g) => n ? `S${n}-${g}` : `G${g}-K`;
  const TP = [15, 30, 60, 120, 240, 480];           // time points, min
  const BATH = { x: -0.75, z: -0.15, w: 1.5, h: 0.55, d: 0.85, water: 0.47 };
  const VB = { x: 1.3, z: -0.05 };                   // viscometer bath
  const RACK = TP.map((_, i) => [BATH.x + (i % 3 - 1) * 0.4, BATH.z + (i < 3 ? -0.18 : 0.18)]);
  const OUT = TP.map((_, i) => [-1.75 + i * 0.27, 0.85]);

  let B, O;

  function freshState() {
    return { set: { naoa: 0, guar: 0.7, kcl: 1, aps: 0.05, dil: 2, T: 90, Tm: 30, crit: 5 }, filled: false, heat: false, Tb: 25, running: false, t: 0, speed: 60,
      vials: [], sel: -1, size: 75, sizeTouched: false, runs: [], stopwatch: 0, tab: 'curve' };
  }

  /* ------------------------------------------------------------------ physics per vial */
  function vialState() {
    const s = B.set, d = s.guar > 0 ? 1 : 1 + s.dil;   // polymer-free samples are diluted with DI water
    return { water: 100 * d, naoa: s.naoa / d, kcl: s.kcl / d, guar: s.guar, hydr: 1, aps: s.guar > 0 ? s.aps : 0, guarM: 1, T: 25, stir: false, dil: d };
  }
  function observe(st) {
    const e = M.viscosity(st, 1); // Pa·s at a gravity-flow shear rate; thresholds are illustrative
    return e > 2 ? 'gel' : e > 0.05 ? 'viscous' : 'water';
  }
  const OBS = { gel: L('جل: لا يسيل عند قلب القارورة', 'gel: does not flow when inverted'), viscous: L('يسيل ببطء', 'flows slowly'), water: L('يسيل كالماء', 'flows like water') };

  /* what the Cannon-Fenske run would give for a vial at the measuring temperature */
  function capillary(v, size) {
    const st = { ...v.st, T: B.set.Tm };
    const etaLow = M.viscosity(st, 10), etaCap = M.viscosity(st, 500), rho = M.fluidDensity(st);
    if (etaLow > 1) return { ok: false, why: 'gel', rho };
    const nu = etaCap * 1000 / rho, C = M.CANNON[size].C, t = nu / C;
    return { ok: true, nu, t, rho, eta: nu * rho, C, newtonian: etaLow / etaCap < 1.15, tooFast: t < 200, tooSlow: t > 1000 };
  }

  /* ------------------------------------------------------------------ build */
  function build() {
    B = freshState(); O = { vials: [] };
    const root = VL.root, wide = innerWidth / innerHeight >= 0.8;
    VL.home(wide ? [0.2, 3.6, 6.2] : [0.2, 6.2, 9.4], wide ? [0.2, 0.55, 0.2] : [0.2, -1.0, 0.2]);

    const poster = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshStandardMaterial({ map: posterTexture(), roughness: 0.9 }));
    poster.position.set(0, 2.75, -1.72); root.add(poster);

    // water bath
    const bath = new THREE.Group(); bath.position.set(BATH.x, 0, BATH.z);
    const shell = VL.std(0xeef1f3, { roughness: 0.35, metalness: 0.2 });
    const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shell); m.position.set(x, y, z); bath.add(m); };
    wall(BATH.w, 0.04, BATH.d, 0, 0.02, 0);
    wall(BATH.w, BATH.h, 0.04, 0, BATH.h / 2, -BATH.d / 2); wall(BATH.w, BATH.h, 0.04, 0, BATH.h / 2, BATH.d / 2);
    wall(0.04, BATH.h, BATH.d, -BATH.w / 2, BATH.h / 2, 0); wall(0.04, BATH.h, BATH.d, BATH.w / 2, BATH.h / 2, 0);
    O.water = new THREE.Mesh(new THREE.BoxGeometry(BATH.w - 0.08, BATH.water - 0.04, BATH.d - 0.08), new THREE.MeshPhysicalMaterial({ color: 0x9fd3f5, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }));
    O.water.position.y = 0.04 + (BATH.water - 0.04) / 2; O.water.renderOrder = 1; bath.add(O.water);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.6), VL.std(0x9aa3ad, { metalness: 0.6, roughness: 0.4 })); rack.position.y = 0.2; bath.add(rack);
    const ctrl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.06), VL.std(0x2b3440)); ctrl.position.set(0, 0.36, BATH.d / 2 + 0.05); bath.add(ctrl);
    O.bathTex = VL.canvasTexture(512, 256, drawBathDisplay);
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.22), new THREE.MeshBasicMaterial({ map: O.bathTex })); disp.position.set(0, 0.36, BATH.d / 2 + 0.081); bath.add(disp);
    VL.shadow(bath); root.add(bath); O.bath = bath;
    bath.userData.hintAt = new THREE.Vector3(0, BATH.h + 0.05, BATH.d / 2);
    VL.pick(bath, () => VL.run(async () => {
      if (!B.filled) { VL.toast(VL.t(L('حضّر القوارير أولاً', 'Prepare the vials first'))); return; }
      if (!B.heat) { B.heat = true; VL.toast(VL.t(L('الحمام يسخّن إلى حرارة الاختبار', 'Bath heating to the test temperature'))); VL.renderControls(); return; }
      if (!B.running) await startTest();
    }));
    const bl = VL.label(L('حمام مائي thermostatic', 'Thermostatic water bath'), L('حتى ~95 °C', 'up to ~95 °C'), { w: 0.85 }); bl.position.set(BATH.x, 0.85, BATH.z); root.add(bl);

    // vials (start on the bench, empty)
    TP.forEach((tp, i) => {
      const g = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 24, 1, true), VL.glass({ opacity: 0.3 })); glass.position.y = 0.21;
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.055, 24), VL.glass({ opacity: 0.3 })); bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.002;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 24), VL.std(0xd2452f, { roughness: 0.5 })); cap.position.y = 0.445;
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.049, 0.049, 0.24, 24), new THREE.MeshStandardMaterial({ color: 0xf1ead2, transparent: true, opacity: 0.85, roughness: 0.3 }));
      fill.position.y = 0.125; fill.visible = false;
      g.add(fill, glass, bottom, cap); g.position.set(OUT[i][0], 0, OUT[i][1]);
      root.add(g); VL.shadow(g);
      const lab = VL.label(`${tp} min`, null, { w: 0.3 }); lab.position.set(0, 0.6, 0); g.add(lab);
      O.vials.push({ g, fill, lab });
      VL.pick(g, () => VL.run(() => takeVial(i)));
    });

    // viscometer bath with a Cannon-Fenske tube
    const vb = new THREE.Group(); vb.position.set(VB.x, 0, VB.z);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.05, 40, 1, true), VL.glass({ opacity: 0.16 })); cyl.position.y = 0.6;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.08, 40), VL.std(0x3a4350)); base.position.y = 0.04;
    const wat = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.92, 40), new THREE.MeshPhysicalMaterial({ color: 0xbfe3fb, transparent: true, opacity: 0.22, depthWrite: false })); wat.position.y = 0.54; wat.renderOrder = 1;
    O.vbTex = VL.canvasTexture(512, 160, drawViscoDisplay);
    const vdisp = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.13), new THREE.MeshBasicMaterial({ map: O.vbTex })); vdisp.position.set(0, 0.05, 0.37);
    vb.add(base, wat, cyl, vdisp, cannonTube());
    VL.shadow(vb); root.add(vb); O.vb = vb;
    vb.userData.hintAt = new THREE.Vector3(0, 1.15, 0);
    VL.pick(vb, () => VL.run(() => runViscometer(B.sel)));
    const vl = VL.label(L('Cannon-Fenske في حمام ثابت الحرارة', 'Cannon-Fenske in a constant-T bath'), L('ν = C·t', 'ν = C·t'), { w: 0.85 }); vl.position.set(VB.x, 1.42, VB.z); root.add(vl);

    // stopwatch
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.12), VL.std(0x2b3440)); sw.position.set(2.1, 0.11, 0.55); sw.rotation.y = -0.4;
    O.swTex = VL.canvasTexture(512, 256, drawStopwatch);
    const swd = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.19), new THREE.MeshBasicMaterial({ map: O.swTex })); swd.position.set(0, 0, 0.061); sw.add(swd);
    VL.shadow(sw); root.add(sw);
    const sl = VL.label(L('ساعة إيقاف', 'Stopwatch'), null, { w: 0.4 }); sl.position.set(2.1, 0.42, 0.55); root.add(sl);
  }

  /* Cannon-Fenske routine: wide arm with the lower reservoir, narrow arm with the timing bulb between
     marks E (upper) and F (lower) above the capillary. */
  function cannonTube() {
    const g = new THREE.Group(), glass = VL.glass({ opacity: 0.55 });
    const tube = (pts, r) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], 0))), 48, r, 10), glass);
    g.add(tube([[-0.07, 1.12], [-0.07, 0.86]], 0.012));                                   // narrow arm above the bulb
    g.add(tube([[-0.07, 0.7], [-0.07, 0.42], [-0.05, 0.3], [0, 0.24], [0.05, 0.28], [0.08, 0.36]], 0.006)); // capillary + bend
    g.add(tube([[0.08, 0.5], [0.08, 1.12]], 0.016));                                       // wide arm
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 16), glass); bulb.scale.y = 1.9; bulb.position.set(-0.07, 0.78, 0); g.add(bulb);
    const res = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), glass); res.scale.y = 1.4; res.position.set(0.08, 0.43, 0); g.add(res);
    const mark = y => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 6, 24), new THREE.MeshBasicMaterial({ color: 0x17212b })); m.rotation.x = Math.PI / 2; m.position.set(-0.07, y, 0); g.add(m); };
    mark(0.875); mark(0.685);                                                              // E and F
    O.meniscus = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 16), new THREE.MeshStandardMaterial({ color: 0xf6e7a8, transparent: true, opacity: 0.85 }));
    O.meniscus.visible = false; g.add(O.meniscus);
    O.resFill = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 12), new THREE.MeshStandardMaterial({ color: 0xf6e7a8, transparent: true, opacity: 0.8 }));
    O.resFill.scale.y = 1.0; O.resFill.position.set(0.08, 0.41, 0); O.resFill.visible = false; g.add(O.resFill);
    g.position.y = 0; g.rotation.y = 0.3;
    return g;
  }
  function setMeniscus(top) { const bot = 0.66; O.meniscus.visible = top > bot; O.meniscus.scale.y = Math.max(0.001, top - bot); O.meniscus.position.set(-0.07, (top + bot) / 2, 0); }

  function posterTexture() {
    return VL.canvasTexture(2048, 1024, (g, W, H) => {
      g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2a2f36'; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14);
      g.fillStyle = '#17212b'; g.textAlign = 'center'; g.font = '700 60px system-ui, sans-serif';
      g.fillText('Break test → capillary viscosity', W / 2, 110);
      const steps = ['Sealed vials + breaker', 'Water bath at test T', 'Inversion test at each time point', 'Cool to measuring T', 'Filter / centrifuge residue', 'Cannon-Fenske: t ≥ 200 s'];
      g.font = '500 40px system-ui, sans-serif';
      steps.forEach((s, i) => { const x = 140 + (i % 3) * 610, y = 260 + Math.floor(i / 3) * 210;
        g.fillStyle = '#e2f6ee'; VL.roundRect(g, x, y - 70, 540, 130, 24); g.fill(); g.fillStyle = '#0f9d76'; g.font = '800 44px system-ui'; g.textAlign = 'left'; g.fillText(String(i + 1), x + 26, y + 12);
        g.fillStyle = '#17212b'; g.font = '500 38px system-ui, sans-serif'; g.fillText(s, x + 80, y + 12); });
      g.textAlign = 'center'; g.fillStyle = '#17212b'; g.font = '700 54px system-ui, sans-serif';
      g.fillText('ν (mm²/s) = C · t        η (mPa·s) = ν · ρ', W / 2, 800);
      g.font = '32px system-ui, sans-serif'; g.fillStyle = '#5a6672';
      g.fillText('ASTM D445 / D446 · C from the tube certificate · ρ at the same temperature · capillary is valid for Newtonian fluid only', W / 2, 880);
    });
  }
  const pad = n => String(Math.floor(n)).padStart(2, '0');
  const hms = s => `${pad(s / 3600)}:${pad(s / 60 % 60)}:${pad(s % 60)}`;
  function drawBathDisplay(g, W, H) {
    g.fillStyle = '#0c1a14'; g.fillRect(0, 0, W, H); g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = '#5dffb1'; g.font = '700 80px ui-monospace, Consolas, monospace'; g.fillText(`${(B ? B.Tb : 25).toFixed(1)}°C`, 24, 80);
    g.font = '500 36px ui-monospace, Consolas, monospace'; g.fillStyle = B && B.heat ? '#ff8a70' : '#3f6b57'; g.fillText(`set ${B ? B.set.T : 90}`, 330, 64);
    g.fillStyle = '#7fc8ff'; g.fillText(`t ${hms(B ? B.t : 0)}`, 24, 190);
  }
  function drawViscoDisplay(g, W, H) {
    g.fillStyle = '#0c1a14'; g.fillRect(0, 0, W, H); g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillStyle = '#5dffb1'; g.font = '700 72px ui-monospace, Consolas, monospace'; g.fillText(`${(B ? B.set.Tm : 30).toFixed(2)}°C ±0.02`, W / 2, H / 2);
  }
  function drawStopwatch(g, W, H) {
    g.fillStyle = '#0c1a14'; g.fillRect(0, 0, W, H); g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillStyle = '#ffd66b'; g.font = '700 96px ui-monospace, Consolas, monospace'; g.fillText(`${(B ? B.stopwatch : 0).toFixed(1)} s`, W / 2, H / 2);
  }
  function redraw(tex, fn) { fn(tex.userData.cv.getContext('2d'), tex.userData.cv.width, tex.userData.cv.height); tex.needsUpdate = true; }

  /* ------------------------------------------------------------------ actions */
  async function fillVials() {
    if (B.running) { VL.toast(VL.t(L('الاختبار جارٍ؛ أعد البدء لتغيير العينة', 'Test running; reset to change the sample'))); return; }
    B.vials = TP.map(tp => ({ tp, st: vialState(), where: 'bench', obs: null, cooled: false }));
    B.filled = true; B.runs = []; B.sel = -1;
    for (const [i, o] of O.vials.entries()) {
      o.fill.visible = true; o.fill.material.color.set(0xf1ead2); o.fill.material.opacity = 0.85; o.fill.position.y = 0.125;
      await VL.tween(0.12, k => { o.fill.scale.y = Math.max(0.01, k); });
      void i;
    }
    VL.renderControls();
  }
  async function startTest() {
    if (!B.filled) { VL.toast(VL.t(L('حضّر القوارير أولاً', 'Prepare the vials first'))); return; }
    if (Math.abs(B.Tb - B.set.T) > 0.5) { VL.toast(VL.t(L('انتظر حتى تستقر حرارة الحمام', 'Wait for the bath temperature to settle'))); return; }
    for (const [i, o] of O.vials.entries()) {
      await VL.move(o.g, [o.g.position.x, 0.75, o.g.position.z], null, 0.25);
      await VL.move(o.g, [RACK[i][0], 0.75, RACK[i][1]], null, 0.35);
      await VL.move(o.g, [RACK[i][0], 0.21, RACK[i][1]], null, 0.25);
      B.vials[i].where = 'bath';
    }
    B.running = true; B.t = 0;
  }
  async function takeVial(i) {
    const v = B.vials[i];
    if (!v) { VL.toast(VL.t(L('حضّر القوارير أولاً', 'Prepare the vials first'))); return; }
    if (v.where === 'bench' && !B.running) { VL.toast(VL.t(L('ضع القوارير في الحمام وابدأ المؤقت (اضغط على الحمام)', 'Place the vials in the bath and start the timer (click the bath)'))); return; }
    if (v.where === 'out') { B.sel = i; VL.renderControls(); VL.toast(VL.t(L(`اخترت قارورة ${v.tp} min`, `Selected the ${v.tp} min vial`))); return; }
    if (B.t < v.tp * 60) { VL.toast(VL.t(L(`لم يحن وقتها: ${v.tp} min`, `Not yet: ${v.tp} min`))); return; }
    const o = O.vials[i];
    v.where = 'lifting';
    await VL.move(o.g, [RACK[i][0], 0.95, RACK[i][1]], null, 0.35);
    await VL.move(o.g, [BATH.x, 1.05, BATH.z + 0.75], null, 0.45);
    v.obs = observe(v.st);
    const flows = v.obs !== 'gel', slow = v.obs === 'viscous';
    await VL.move(o.g, [BATH.x, 1.3, BATH.z + 0.75], [Math.PI, 0, 0], 0.7);       // invert
    if (flows) await VL.tween(slow ? 1.6 : 0.5, k => { o.fill.position.y = 0.125 + 0.165 * k; });
    await VL.wait(0.9);
    await VL.move(o.g, [BATH.x, 1.05, BATH.z + 0.75], [0, 0, 0], 0.6);
    if (flows) await VL.tween(slow ? 1.2 : 0.4, k => { o.fill.position.y = 0.29 - 0.165 * k; });
    await VL.move(o.g, [OUT[i][0], 0.4, OUT[i][1]], null, 0.5);
    await VL.move(o.g, [OUT[i][0], 0, OUT[i][1]], null, 0.25);
    v.where = 'out'; B.sel = i;
    VL.toast(`${v.tp} min · ${VL.t(OBS[v.obs])}`);
    VL.renderControls(); VL.showTab('log');
  }
  async function coolAndClean() {
    const list = B.vials.filter(v => v.where === 'out' && !v.cooled);
    if (!list.length) { VL.toast(VL.t(L('لا توجد قوارير مُخرَجة تحتاج تبريداً', 'No taken-out vials waiting to be cooled'))); return; }
    await VL.tween(1.2, () => {});
    for (const v of list) { v.cooled = true; v.st = { ...v.st }; }
    VL.toast(VL.t(L(`بُرّدت ${list.length} قارورة إلى ${B.set.Tm} °C ورُشّحت`, `${list.length} vial(s) cooled to ${B.set.Tm} °C and filtered`)));
    VL.renderControls();
  }
  function selectedVial() { return B.vials[B.sel]; }
  async function runViscometer(i, autoSize) {
    const v = B.vials[i];
    if (!v || v.where !== 'out') { VL.toast(VL.t(L('أخرج قارورة من الحمام أولاً واخترها', 'Take a vial out of the bath first and select it'))); return; }
    if (!v.cooled) { VL.toast(VL.t(L('برّد العيّنة إلى حرارة القياس ورشّحها أولاً', 'Cool the sample to the measuring temperature and filter it first'))); return; }
    if (autoSize) { const c0 = capillary(v, B.size); if (c0.ok) { B.size = M.recommendSize(c0.nu); } }
    const c = capillary(v, B.size);
    if (!c.ok) { B.runs.push({ i, tp: v.tp, ok: false, why: 'gel' }); VL.toast(VL.t(L('العيّنة لا تسيل في الشعيرة: لم تنكسر، استخدم الـ rheometer', 'The sample will not flow through the capillary: not broken, use the rheometer'))); VL.showTab('log'); return; }
    if (c.tooFast) VL.toast(VL.t(L(`زمن الجريان ${c.t.toFixed(0)} s أقل من 200 s: اختر أنبوباً أصغر (C أقل)`, `Efflux ${c.t.toFixed(0)} s is under 200 s: choose a smaller tube (lower C)`)));
    if (c.tooSlow) VL.toast(VL.t(L(`زمن الجريان ${c.t.toFixed(0)} s طويل: اختر أنبوباً أكبر`, `Efflux ${c.t.toFixed(0)} s is long: choose a larger tube`)));
    O.resFill.visible = true;
    const times = [];
    for (let r = 0; r < 3; r++) {
      const tr = c.t * (1 + (Math.random() - 0.5) * 0.002);
      await VL.tween(0.6, k => { setMeniscus(0.66 + 0.26 * k); O.resFill.scale.y = 1 - 0.6 * k; });   // draw up above mark E
      B.stopwatch = 0;
      const dur = Math.min(3.5, Math.max(1.2, tr / 120));
      await VL.tween(dur, k => { setMeniscus(0.92 - 0.26 * k); O.resFill.scale.y = 0.4 + 0.6 * k; B.stopwatch = 0.875 - (0.92 - 0.26 * k) > 0 ? tr * Math.min(1, Math.max(0, (0.875 - (0.92 - 0.26 * k)) / 0.19)) : 0; }, k => k);
      B.stopwatch = tr; times.push(tr);
      await VL.wait(0.4);
    }
    O.meniscus.visible = false; O.resFill.visible = false;
    const tm = times.reduce((a, b) => a + b, 0) / times.length, spread = (Math.max(...times) - Math.min(...times)) / tm * 100;
    const nu = c.C * tm, eta = nu * c.rho;
    B.runs.push({ i, tp: v.tp, ok: true, size: B.size, C: c.C, times, tm, spread, nu, rho: c.rho, eta, newtonian: c.newtonian, valid: !c.tooFast && !c.tooSlow });
    v.eta = eta;
    VL.showTab('curve');
  }

  /* ------------------------------------------------------------------ per-frame */
  let dispAcc = 0, last = '';
  function update(dt) {
    const sdt = dt * B.speed;
    const target = B.heat ? B.set.T : 25;
    B.Tb += (target - B.Tb) * (1 - Math.exp(-sdt / 400));
    if (B.running) {
      B.t += sdt;
      for (const v of B.vials) {
        if (v.where !== 'bath') continue;
        v.st.T += (B.Tb - v.st.T) * (1 - Math.exp(-sdt / 240));   // vials lag the bath
        M.stepGel(v.st, sdt);
      }
    }
    // vial look: cream gel → clearer as it breaks (at the vial's own temperature)
    for (const [i, v] of B.vials.entries()) {
      const o = O.vials[i], e = M.viscosity(v.st, 1), k = Math.max(0, Math.min(1, (Math.log10(e) + 2.5) / 3.5));
      o.fill.material.color.lerpColors(new THREE.Color(0xf7f1c8), new THREE.Color(0xf1ead2), k); o.fill.material.opacity = 0.45 + 0.4 * k;
    }
    O.water.material.color.setRGB(0.62 + 0.25 * (B.Tb - 25) / 70, 0.83, 0.96 - 0.15 * (B.Tb - 25) / 70);
    dispAcc += dt;
    const sig = `${B.Tb.toFixed(1)}|${B.heat}|${Math.floor(B.t)}|${B.set.T}|${B.stopwatch.toFixed(1)}|${B.set.Tm}`;
    if (dispAcc > 0.15 && sig !== last) { dispAcc = 0; last = sig; redraw(O.bathTex, drawBathDisplay); redraw(O.swTex, drawStopwatch); redraw(O.vbTex, drawViscoDisplay); }
  }

  /* ------------------------------------------------------------------ instrument panel */
  const fmt = VL.fmt;
  function instrument(tab) {
    const green = '#14a37a', orange = '#e8892b';
    const ok = B.runs.filter(r => r.ok);
    const draw = (cv, tb) => {
      if (tb === 'log') return drawLog(cv);
      const pts = ok.map(r => [r.tp, r.eta]).sort((a, b) => a[0] - b[0]);
      const ys = pts.map(p => p[1]).concat([B.set.crit]);
      const c = VL.plot(cv, { x: [0, 500], y: [Math.min(0.5, ...ys) / 1.5, Math.max(50, ...ys) * 1.5], ylog: true, xlabel: VL.t(L('الزمن في الحمام (min)', 'time in bath (min)')), ylabel: 'η (mPa·s)',
        series: [{ pts: [[0, B.set.crit], [500, B.set.crit]], color: orange, dash: [6, 4], width: 1.5, label: VL.t(L(`المعيار ${B.set.crit} mPa·s`, `criterion ${B.set.crit} mPa·s`)) },
          { pts, color: green, width: 2.5, label: `η @ ${B.set.Tm} °C` }] });
      if (c) { c.g.fillStyle = green; for (const [x, y] of pts) { c.g.beginPath(); c.g.arc(c.X(x), c.Y(y), 4, 0, 7); c.g.fill(); }
        if (!pts.length) { c.g.fillStyle = VL.css('--muted'); c.g.textAlign = 'center'; c.g.font = '13px system-ui, sans-serif'; c.g.direction = VL.lang() === 'ar' ? 'rtl' : 'ltr'; c.g.fillText(VL.t(L('قِس القوارير بالـ viscometer لترسم منحنى الكسر', 'Measure vials with the viscometer to draw the break curve')), c.L + c.pw / 2, c.T + c.ph / 2); } }
    };
    const r = B.runs[B.runs.length - 1], sv = selectedVial(), cap = sv && sv.cooled ? capillary(sv, B.size) : null;
    const broken = ok.filter(x => x.eta <= B.set.crit).sort((a, b) => a.tp - b.tp)[0];
    return {
      title: L('اختبار الكسر و Cannon-Fenske', 'Break test & Cannon-Fenske'),
      badge: { cls: 'warn', text: L('نموذج توضيحي', 'illustrative model') },
      tabs: [{ id: 'curve', label: L('منحنى الكسر', 'Break curve') }, { id: 'log', label: L('السجل', 'Log') }],
      draw,
      readouts: [
        [L('الحمام · الزمن', 'Bath · time'), `${B.Tb.toFixed(1)} °C · ${hms(B.t)}`],
        [L('القارورة المختارة', 'Selected vial'), sv ? `${sv.tp} min` : '—'],
        [L('الأنبوب · C', 'Tube · C'), `${B.size} · ${M.CANNON[B.size].C} mm²/s²`],
        [L('زمن الجريان المتوقع', 'Expected efflux'), cap ? (cap.ok ? fmt(cap.t, 's') : VL.t(L('لا يسيل', 'no flow'))) : '—'],
        [L('آخر قياس: t̄ · ν', 'Last run: t̄ · ν'), r && r.ok ? `${fmt(r.tm, 's')} · ${fmt(r.nu, 'mm²/s')}` : '—'],
        [L('ρ · η', 'ρ · η'), r && r.ok ? `${r.rho.toFixed(4)} g/cm³ · ${fmt(r.eta, 'mPa·s')}` : '—'],
        [L('زمن الكسر (أول نقطة ≤ المعيار)', 'Break time (first point ≤ criterion)'), broken ? `≤ ${broken.tp} min` : '—', true],
      ],
      note: r && r.ok && !r.newtonian ? L('تنبيه: السائل ما زال shear-thinning عند حرارة القياس، فنتيجة الـ capillary غير موثوقة: قِسه بالـ rheometer.', 'Warning: the fluid is still shear-thinning at the measuring temperature, so the capillary result is unreliable: use the rheometer.')
        : L('زمن الحركية والقيم من النموذج التوضيحي. الثوابت C اسمية (ASTM D446)؛ استخدم الثابت المكتوب في شهادة أنبوبك.', 'Kinetics and values come from the illustrative model. C values are nominal (ASTM D446); use the constant on your tube certificate.'),
    };
  }
  function drawLog(cv) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const ink = VL.css('--ink'), mut = VL.css('--muted'), rtl = VL.lang() === 'ar';
    g.direction = rtl ? 'rtl' : 'ltr'; g.textAlign = rtl ? 'right' : 'left'; g.font = '12px system-ui, sans-serif';
    const x0 = rtl ? W - 6 : 6;
    const rows = B.vials.filter(v => v.obs).map(v => {
      const run = [...B.runs].reverse().find(r => r.i === B.vials.indexOf(v));
      const vis = run ? (run.ok ? `η ${fmt(run.eta)} mPa·s (t̄ ${fmt(run.tm)} s)` : VL.t(L('لا يسيل في الشعيرة', 'no capillary flow'))) : (v.cooled ? VL.t(L('جاهزة للقياس', 'ready to measure')) : VL.t(L('تحتاج تبريداً وترشيحاً', 'needs cooling and filtering')));
      return `${v.tp} min · ${VL.t(OBS[v.obs])} · ${vis}`;
    });
    if (!rows.length) { g.fillStyle = mut; g.textAlign = 'center'; g.fillText(VL.t(L('أخرج القوارير عند أوقاتها لتظهر هنا', 'Take vials out at their time points to log them')), W / 2, H / 2); return; }
    rows.forEach((t, i) => { g.fillStyle = i % 2 ? mut : ink; g.fillText(t, x0, 18 + i * 22, W - 12); });
  }

  /* ------------------------------------------------------------------ controls */
  function controls(el) {
    const s = B.set, cur = PLAN.find(([n, g]) => n === s.naoa && g === s.guar);
    const outs = B.vials.map((v, i) => [v, i]).filter(([v]) => v.where === 'out');
    el.innerHTML = `
      <label>${VL.t(L('العينة', 'Sample'))}
        <select id="bPreset" ${B.filled ? 'disabled' : ''}>${PLAN.map(([n, g]) => `<option value="${n}|${g}" ${cur && cur[0] === n && cur[1] === g ? 'selected' : ''}>${sampleName(n, g)} · NaOA ${n} g · guar ${g} g · KCl 1 g</option>`).join('')}</select></label>
      <div class="grid2">
        ${s.guar > 0 ? `<label>${VL.t(L('APS لكل 100 mL', 'APS per 100 mL'))} <span class="val" id="bApsV">${s.aps} g</span><input type="range" id="bAps" min="0.01" max="0.2" step="0.01" value="${s.aps}" ${B.filled ? 'disabled' : ''}></label>`
        : `<label>${VL.t(L('تخفيف (ماء : جل)', 'Dilution (water : gel)'))}<select id="bDil" ${B.filled ? 'disabled' : ''}>${[1, 2, 3].map(r => `<option value="${r}" ${s.dil === r ? 'selected' : ''}>${r}:1 (÷${r + 1})</option>`).join('')}</select></label>`}
        <label>${VL.t(L('حرارة الحمام', 'Bath T'))} <span class="val" id="bTV">${s.T} °C</span><input type="range" id="bT" min="40" max="95" step="5" value="${s.T}"></label>
      </div>
      <div class="grid2">
        <label>${VL.t(L('حرارة القياس', 'Measuring T'))}<select id="bTm">${[25, 30, 40].map(v => `<option value="${v}" ${s.Tm === v ? 'selected' : ''}>${v} °C</option>`).join('')}</select></label>
        <label>${VL.t(L('معيار الكسر', 'Break criterion'))}<select id="bCrit">${[5, 10].map(v => `<option value="${v}" ${s.crit === v ? 'selected' : ''}>≤ ${v} mPa·s</option>`).join('')}</select></label>
      </div>
      <div class="row">
        <button id="bFill" ${B.filled ? 'disabled' : ''}>${VL.t(L('املأ القوارير وأغلقها', 'Fill and seal vials'))}</button>
        <button id="bHeat" class="${B.heat ? 'pri' : ''}">${VL.t(B.heat ? L('الحمام يعمل', 'Bath on') : L('شغّل الحمام', 'Bath on'))}</button>
        <button id="bStart" ${B.running ? 'disabled' : ''}>${VL.t(L('ضع القوارير وابدأ', 'Load vials & start'))}</button>
      </div>
      <div class="row">
        <label class="inline">${VL.t(L('تسريع الزمن', 'Time-lapse'))} <select id="bSpeed">${[60, 600, 3000].map(v => `<option value="${v}" ${B.speed === v ? 'selected' : ''}>×${v}</option>`).join('')}</select></label>
        <button id="bCool">${VL.t(L('برّد ورشّح', 'Cool & filter'))}</button>
      </div>
      <div class="grid2">
        <label>${VL.t(L('القارورة للقياس', 'Vial to measure'))}<select id="bSel">${outs.length ? outs.map(([v, i]) => `<option value="${i}" ${B.sel === i ? 'selected' : ''}>${v.tp} min${v.cooled ? '' : ' *'}</option>`).join('') : '<option>—</option>'}</select></label>
        <label>${VL.t(L('أنبوب Cannon-Fenske', 'Cannon-Fenske size'))}<select id="bSize">${Object.entries(M.CANNON).map(([k, c]) => `<option value="${k}" ${B.size === +k ? 'selected' : ''}>${k} · ${c.lo}–${c.hi} mm²/s</option>`).join('')}</select></label>
      </div>
      <div class="row"><button id="bRun" class="pri">${VL.t(L('قِس زمن الجريان ×3', 'Time the efflux ×3'))}</button></div>`;
    const $ = q => el.querySelector(q);
    $('#bPreset').onchange = e => { const [n, g] = e.target.value.split('|').map(Number); Object.assign(s, { naoa: n, guar: g, kcl: 1 }); VL.renderControls(); };
    if ($('#bAps')) $('#bAps').oninput = e => { s.aps = +e.target.value; $('#bApsV').textContent = `${s.aps} g`; };
    if ($('#bDil')) $('#bDil').onchange = e => { s.dil = +e.target.value; };
    $('#bT').oninput = e => { s.T = +e.target.value; $('#bTV').textContent = `${s.T} °C`; };
    $('#bTm').onchange = e => { s.Tm = +e.target.value; };
    $('#bCrit').onchange = e => { s.crit = +e.target.value; };
    $('#bFill').onclick = () => VL.run(fillVials);
    $('#bHeat').onclick = () => { B.heat = !B.heat; VL.renderControls(); };
    $('#bStart').onclick = () => VL.run(startTest);
    $('#bSpeed').onchange = e => { B.speed = +e.target.value; };
    $('#bCool').onclick = () => VL.run(coolAndClean);
    $('#bSel').onchange = e => { B.sel = +e.target.value; };
    $('#bSize').onchange = e => { B.size = +e.target.value; B.sizeTouched = true; };
    $('#bRun').onclick = () => VL.run(() => runViscometer(B.sel));
  }

  /* ------------------------------------------------------------------ steps */
  async function waitFor(cond, maxS, speed = 3000) {
    const sp = B.speed; B.speed = Math.max(sp, speed);
    try { for (let i = 0; i < maxS * 10 && !cond(); i++) await VL.wait(0.1); } finally { B.speed = sp; }
  }
  const nextVial = () => B.vials.findIndex(v => v.where === 'bath');
  const steps = [
    { title: L('حضّر القوارير وأغلقها', 'Prepare and seal the vials'),
      text: L('حضّر الجل كما في القسم 1، ثم أضف الـ breaker: APS للعينات التي فيها guar، أو خفّف العينات الخالية من البوليمر بالماء المقطّر. وزّعه فوراً على قوارير زجاجية متساوية، قارورة لكل نقطة زمنية (هنا 15 إلى 480 min)، واملأها لنفس الارتفاع، وأغلقها بإحكام لمنع التبخر.',
        'Prepare the gel as in section 1, then add the breaker: APS for samples with guar, or dilute polymer-free samples with DI water. Split it at once into identical glass vials, one per time point (here 15 to 480 min), fill them to the same height and seal them tightly against evaporation.'),
      conf: ['fact'], target: () => O.vials[0].g, done: () => B.filled, auto: fillVials },
    { title: L('شغّل الحمام المائي حتى تستقر الحرارة', 'Bring the water bath to temperature'),
      text: L('اضبط الحمام على حرارة الاختبار، وانتظر حتى تستقر قبل إدخال القوارير. الحمام المائي يصلح حتى نحو 95 °C؛ فوق ذلك استخدم حمام زيت أو فرناً وقوارير ضغط. اجعل مستوى الماء أعلى من مستوى السائل في القوارير.',
        'Set the bath to the test temperature and let it settle before loading the vials. A water bath works up to about 95 °C; above that use an oil bath or oven and pressure-rated vials. Keep the water level above the fluid level in the vials.'),
      conf: ['fact'], target: () => O.bath, done: () => B.heat && Math.abs(B.Tb - B.set.T) <= 0.5,
      auto: async () => { if (!B.filled) await fillVials(); B.heat = true; VL.renderControls(); await waitFor(() => Math.abs(B.Tb - B.set.T) <= 0.5, 12, 600); } },
    { title: L('ضع القوارير وابدأ المؤقت', 'Load the vials and start the timer'),
      text: L('ضع القوارير في الحمام معاً وابدأ المؤقت. القوارير تحتاج دقائق لتصل حرارة الحمام، فسجّل هذا التأخير أو سخّنها مسبقاً. الاختبار ساكن (static) دون تحريك.',
        'Put all vials in the bath together and start the timer. The vials need minutes to reach bath temperature, so note this lag or pre-heat them. The test is static, without stirring.'),
      conf: ['fact', 'inf'], target: () => O.bath, done: () => B.running,
      auto: async () => { if (!B.heat || Math.abs(B.Tb - B.set.T) > 0.5) { B.heat = true; await waitFor(() => Math.abs(B.Tb - B.set.T) <= 0.5, 12, 600); } await startTest(); } },
    { title: L('راقب الكسر: اختبار القلب عند كل نقطة زمنية', 'Monitor: inversion test at each time point'),
      text: L('عند كل نقطة زمنية أخرج قارورة واحدة، اقلبها وسجّل: جل لا يسيل، أو يسيل ببطء، أو يسيل كالماء. صوّرها بجانب قارورة ماء للمقارنة. لا تُرجع القارورة إلى الحمام. اختبار القلب نوعي؛ القرار يكون بقياس اللزوجة بعده.',
        'At each time point take out one vial, invert it and record: gel that does not flow, flows slowly, or flows like water. Photograph it next to a water vial for comparison. Do not return the vial to the bath. The inversion test is qualitative; the viscosity measurement decides.'),
      conf: ['fact'], target: () => { const i = nextVial(); return i >= 0 ? O.vials[i].g : O.bath; }, done: () => B.vials.filter(v => v.obs).length >= 3,
      auto: async () => { for (let i = nextVial(); i >= 0; i = nextVial()) { const tp = B.vials[i].tp * 60; await waitFor(() => B.t >= tp, 20); await takeVial(i); } } },
    { title: L('برّد العيّنة ونظّفها من الـ residue', 'Cool the sample and remove residue'),
      text: L('برّد القارورة في حمام ماء أو ثلج حتى حرارة القياس (مثلاً 30 °C) لإيقاف التفاعل وتثبيت الحرارة. جزء الـ WLM قد يستعيد لزوجته عند التبريد، فقِس دائماً عند نفس الحرارة. ثم رشّح أو افصل بالـ centrifuge حتى لا تسدّ البقايا الشعيرة. البقايا نفسها تُجفَّف وتُوزن كاختبار residue منفصل.',
        'Cool the vial in a water or ice bath to the measuring temperature (for example 30 °C) to stop the reaction and fix the temperature. The WLM part can regain viscosity on cooling, so always measure at the same temperature. Then filter or centrifuge so residue does not block the capillary. The residue itself is dried and weighed as a separate residue test.'),
      conf: ['fact', 'inf'], target: () => O.vials[Math.max(0, B.sel)].g, done: () => B.vials.some(v => v.cooled),
      auto: async () => { if (!B.vials.some(v => v.where === 'out')) { const i = nextVial(); if (i >= 0) { await waitFor(() => B.t >= B.vials[i].tp * 60, 20); await takeVial(i); } } await coolAndClean(); } },
    { title: L('اختر حجم أنبوب Cannon-Fenske', 'Choose the Cannon-Fenske size'),
      text: L('كل حجم له مدى لزوجة وثابت C. اختر الحجم الذي يعطي زمن جريان 200 s على الأقل (ASTM D445/D446)؛ للسائل المكسور القريب من الماء يكون غالباً الحجم 25 أو 50. استخدم الثابت C المكتوب في شهادة أنبوبك لا القيمة الاسمية.',
        'Each size has a viscosity range and a constant C. Pick the size that gives an efflux time of at least 200 s (ASTM D445/D446); for a water-like broken fluid that is usually size 25 or 50. Use the C on your tube certificate, not the nominal value.'),
      conf: ['fact'], target: () => O.vb,
      done: () => { const v = selectedVial(); if (!v || !v.cooled) return false; const c = capillary(v, B.size); return !c.ok || (!c.tooFast && !c.tooSlow); },
      auto: async () => { const v = selectedVial(); if (v && v.cooled) { const c = capillary(v, B.size); if (c.ok) B.size = M.recommendSize(c.nu); VL.renderControls(); } } },
    { title: L('قِس زمن الجريان ثلاث مرات', 'Time the efflux three times'),
      text: L('اقلب الأنبوب واملأه حتى خط التعبئة، ثبّته عمودياً في حمام اللزوجة واتركه 10 min ليتوازن. اسحب السائل فوق العلامة العليا، ثم شغّل الساعة عندما يمرّ الـ meniscus بالعلامة العليا وأوقفها عند السفلى. كرّر 3 مرات والفرق بينها صغير جداً. ν = C·t̄ و η = ν·ρ، مع ρ مقاسة عند نفس الحرارة.',
        'Invert the tube and fill it to the fill line, mount it vertically in the viscometer bath and allow 10 min to equilibrate. Draw the liquid above the upper mark, start the watch as the meniscus passes the upper mark and stop it at the lower one. Repeat 3 times; the times should agree closely. ν = C·t̄ and η = ν·ρ, with ρ measured at the same temperature.'),
      conf: ['fact'], target: () => O.vb, done: () => B.runs.some(r => r.ok || r.why === 'gel'),
      auto: () => runViscometer(B.sel, true) },
    { title: L('ارسم منحنى الكسر', 'Draw the break curve'),
      text: L('كرّر القياس لكل قارورة مُخرَجة وارسم η عند حرارة القياس مقابل زمن البقاء في الحمام. زمن الكسر هو أول نقطة تحت المعيار الذي تعتمده الورقة التي تتبعها (يظهر في الأدبيات 5 أو 10 mPa·s، فتحقّق من مرجعك). إذا لم تسل العيّنة في الشعيرة أو بقيت shear-thinning فهي لم تنكسر، وقِسها بالـ rheometer.',
        'Repeat for every vial taken out and plot η at the measuring temperature against time in the bath. The break time is the first point under the criterion used by the paper you follow (5 or 10 mPa·s appear in the literature; check your reference). If the sample does not flow through the capillary or is still shear-thinning, it is not broken: use the rheometer.'),
      conf: ['fact', 'inf'], target: () => O.vb, done: () => B.runs.filter(r => r.ok).length >= 3 || (B.runs.length >= 3 && B.vials.every(v => v.where === 'out')),
      auto: async () => {
        for (let i = nextVial(); i >= 0; i = nextVial()) { await waitFor(() => B.t >= B.vials[i].tp * 60, 20); await takeVial(i); }
        await coolAndClean();
        for (const [i, v] of B.vials.entries()) if (v.where === 'out' && !B.runs.some(r => r.i === i)) { B.sel = i; await runViscometer(i, true); }
        VL.renderControls();
      } },
  ];

  VL.lessons.break = { id: 'break', steps, build, update, instrument, controls, relabel() {}, dispose() {} };
})();

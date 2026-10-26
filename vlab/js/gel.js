/* Virtual Lab — Lesson 2: NaOA / KCl / guar wormlike-micelle fracturing gel.
   Bench: hotplate stirrer + beaker, reagents, rheometer, proppant, breakers. A nano view shows the
   micro-structure the model predicts (monomers → micelles → worms → microemulsion droplets; guar chains).
   Numbers come from the illustrative model in model.js unless the user's FracGel Lab data is available. */
(function () {
  'use strict';
  const VL = window.VL, M = VL.M;
  const L = (ar, en) => ({ ar, en });
  const BEAKER = { x: 0, z: 0.15, base: 0.245, r: 0.38, h: 0.9 };
  const UNIT = 10;              // scene units per metre (1 unit = 10 cm)
  const LEVEL_PER_ML = 0.0034;  // liquid height per mL in this beaker
  const PLAN = [[0, 0], [0, 0.3], [0, 0.5], [0, 0.7], ...[6, 8, 10].flatMap(n => [0, 0.3, 0.5, 0.7].map(g => [n, g]))];
  const sampleName = (n, g) => n ? `S${n}-${g}` : g ? `G${g}-K` : 'K (blank)';

  let G, O, nano;

  function freshState() {
    return { water: 0, naoa: 0, kcl: 0, guar: 0, T: 25, heat: false, stir: false, hydr: 0, hcB: 0, hc: 0, aps: 0, guarM: 1, simT: 0, speed: 60,
      set: { naoa: 8, guar: 0.5, kcl: 1, T: 90, hc: 5, aps: 0.05 }, meas: [], prop: false, source: 'model', fg: loadFG(), plotTab: 'osc' };
  }
  function loadFG() { try { const s = JSON.parse(VL.store.get('fracgel.v2') || 'null'); return s && s.samples ? s : null; } catch { return null; } }

  /* ------------------------------------------------------------------ properties: model or measured */
  function props() {
    const st = { naoa: G.naoa, kcl: G.kcl, guar: G.guar, T: G.T, hydr: G.hydr, hcB: G.hcB, guarM: G.guarM };
    const mu = M.waterVisc(G.T);
    const fresh = Math.abs(G.T - 25) < 1.5 && G.hcB < 0.02 && G.guarM > 0.98 && Math.abs(G.kcl - 1) < 0.01 && (G.guar === 0 || G.hydr > 0.9) && G.water > 0;
    const meas = G.source === 'data' && fresh ? M.measuredFor(G.fg, G.naoa, G.guar) : null;
    if (meas && meas.G0 !== null && meas.tau !== null) {
      const eta0 = meas.eta0 ?? meas.G0 * meas.tau;
      return { src: 'data', demo: meas.demo, eta0: eta0 + mu, G0: meas.G0, tau: meas.tau, eta170: meas.eta170 ?? (mu + eta0 / (1 + meas.tau * 170)),
        visc: r => mu + eta0 / (1 + meas.tau * r), mod: w => { const x = w * meas.tau, d = 1 + x * x; return { Gp: meas.G0 * x * x / d, Gpp: meas.G0 * x / d + mu * w }; } };
    }
    const w = M.wlmParams(st);
    return { src: 'model', eta0: M.viscosity(st, 1e-4), G0: w.G0, tau: w.tau, eta170: M.viscosity(st, 170), visc: r => M.viscosity(st, r), mod: x => M.moduli(st, x),
      missing: G.source === 'data' && !meas };
  }

  /* ------------------------------------------------------------------ build */
  function build() {
    G = freshState(); O = { pours: [] };
    const root = VL.root;
    const wide = innerWidth / innerHeight >= 0.8;
    VL.home(wide ? [0, 4.1, 6.5] : [0, 6.2, 9.4], wide ? [0, 0.65, 0.15] : [0, -1.0, 0.15]);

    const poster = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshStandardMaterial({ map: posterTexture(), roughness: 0.9 }));
    poster.position.set(0, 2.75, -1.72); root.add(poster); O.poster = poster;

    // hotplate stirrer
    const hp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 1.0), VL.std(0xf4f5f6, { roughness: 0.35 })); body.position.y = 0.11;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.025, 0.88), VL.std(0xc9ced3, { roughness: 0.25, metalness: 0.2 })); plate.position.y = 0.232;
    O.plate = plate;
    O.dispTex = VL.canvasTexture(512, 128, drawDisplay);
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.115), new THREE.MeshBasicMaterial({ map: O.dispTex })); disp.position.set(0, 0.12, 0.501);
    const knob = c => { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 24), VL.std(c, { roughness: 0.4 })); k.rotation.x = Math.PI / 2; return k; };
    O.knobStir = knob(0x2b7de9); O.knobStir.position.set(-0.36, 0.11, 0.52);
    O.knobHeat = knob(0xe2442f); O.knobHeat.position.set(0.36, 0.11, 0.52);
    hp.add(body, plate, disp); hp.position.set(BEAKER.x, 0, BEAKER.z); VL.shadow(hp); root.add(hp);
    O.knobStir.position.add(hp.position); O.knobHeat.position.add(hp.position); VL.shadow(O.knobStir); VL.shadow(O.knobHeat);
    root.add(O.knobStir, O.knobHeat);
    VL.pick(O.knobStir, () => { G.stir = !G.stir; VL.renderControls(); });
    VL.pick(O.knobHeat, () => { G.heat = !G.heat; VL.renderControls(); });
    O.hp = hp;

    // beaker + liquid
    const bk = new THREE.Group(); bk.position.set(BEAKER.x, BEAKER.base, BEAKER.z);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(BEAKER.r, BEAKER.r * 0.97, BEAKER.h, 48, 1, true), VL.glass({ opacity: 0.18 })); glass.position.y = BEAKER.h / 2; glass.renderOrder = 3;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(BEAKER.r, 0.01, 8, 64), VL.glass({ opacity: 0.5 })); rim.rotation.x = Math.PI / 2; rim.position.y = BEAKER.h;
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(BEAKER.r * 0.97, 48), VL.glass({ opacity: 0.25 })); bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.004;
    for (let i = 1; i <= 4; i++) { // graduation marks every 50 mL
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.006, 0.004), new THREE.MeshBasicMaterial({ color: 0x5a6672, transparent: true, opacity: 0.6 }));
      m.position.set(-0.12, 0.012 + i * 50 * LEVEL_PER_ML, BEAKER.r + 0.002); bk.add(m);
    }
    O.liquidMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.35, roughness: 0.15, clearcoat: 0.6, depthWrite: false, side: THREE.DoubleSide });
    O.liquid = new THREE.Mesh(new THREE.CylinderGeometry(BEAKER.r * 0.955, BEAKER.r * 0.94, 1, 48, 1, true), O.liquidMat); O.liquid.visible = false; O.liquid.renderOrder = 1;
    O.surface = new THREE.Mesh(surfaceGeometry(BEAKER.r * 0.955), O.liquidMat); O.surface.visible = false; O.surface.renderOrder = 2;
    O.oil = new THREE.Mesh(new THREE.CircleGeometry(BEAKER.r * 0.95, 48), new THREE.MeshStandardMaterial({ color: 0xf2c94c, transparent: true, opacity: 0, depthWrite: false }));
    O.oil.rotation.x = -Math.PI / 2; O.oil.renderOrder = 2;
    O.bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.16, 6, 12), VL.std(0xffffff, { roughness: 0.3 })); O.bar.rotation.z = Math.PI / 2; O.bar.position.y = 0.035;
    O.barPivot = new THREE.Group(); O.barPivot.add(O.bar);
    bk.add(O.liquid, O.surface, O.oil, O.barPivot, glass, rim, bottom);
    // bubbles and proppant (instanced)
    O.bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1, depthWrite: false }), 40);
    O.bub.renderOrder = 2; O.bubs = Array.from({ length: 40 }, () => ({ on: false })); bk.add(O.bub);
    O.sand = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), VL.std(0xc9a56b, { roughness: 0.9 }), 260);
    O.grains = Array.from({ length: 260 }, () => ({ on: false })); bk.add(O.sand);
    hideAll(O.bub, O.bubs); hideAll(O.sand, O.grains);
    root.add(bk); O.beaker = bk;
    VL.pick(bk, () => { G.stir = !G.stir; VL.renderControls(); });
    bk.userData.hintAt = new THREE.Vector3(0, BEAKER.h + 0.05, 0);
    const bl = VL.label(L('كأس 250 mL على hotplate stirrer', '250 mL beaker on hotplate stirrer'), L('أزرق: تحريك · أحمر: تسخين', 'blue knob: stir · red knob: heat'), { w: 0.95 });
    bl.position.set(0, 0.08, 1.0); root.add(bl);

    // reagents
    O.jars = {};
    const J = (id, x, z, kind, color, title, sub) => {
      const j = container(kind, color); j.position.set(x, 0, z); root.add(j);
      j.userData.home = j.position.toArray(); O.jars[id] = j;
      const lab = VL.label(title, sub, { w: 0.62 }); lab.position.set(x, kind === 'bottle' ? 0.82 : 0.66, z + 0.05); root.add(lab); j.userData.labelObj = lab;
      return j;
    };
    VL.pick(J('water', -2.0, -0.3, 'bottle', 0xbfe0ff, L('ماء مقطّر', 'DI water'), L('100 mL', '100 mL')), () => VL.run(addWater));
    VL.pick(J('guar', -1.28, -0.85, 'jar', 0xefe4c2, L('Guar gum', 'Guar gum'), L('بوليمر طبيعي', 'natural polymer')), () => VL.run(() => addSolid('guar')));
    VL.pick(J('naoa', -0.43, -1.05, 'jar', 0xf3ead0, L('Sodium oleate', 'Sodium oleate'), L('NaOA · surfactant', 'NaOA · surfactant')), () => VL.run(() => addSolid('naoa')));
    VL.pick(J('kcl', 0.43, -1.05, 'jar', 0xfafafa, L('KCl', 'KCl'), L('ملح · K⁺', 'salt · K⁺')), () => VL.run(() => addSolid('kcl')));
    VL.pick(J('hc', 1.28, -0.85, 'bottle', 0xf2d36b, L('Kerosene', 'Kerosene'), L('breaker: hydrocarbon', 'breaker: hydrocarbon')), () => VL.run(() => addBreaker('hc')));
    VL.pick(J('aps', 2.0, -0.3, 'jar', 0xffffff, L('APS', 'APS'), L('breaker: oxidizer', 'breaker: oxidizer')), () => VL.run(() => addBreaker('aps')));
    VL.pick(J('sand', 1.75, 0.95, 'jar', 0xc9a56b, L('Proppant', 'Proppant'), L('رمل 20/40', '20/40 sand')), () => VL.run(dropProppant));

    // rheometer
    const rh = new THREE.Group();
    const rb = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.5), VL.std(0x3a4350, { roughness: 0.5 })); rb.position.y = 0.06;
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.15, 0.1), VL.std(0x59636f, { roughness: 0.4, metalness: 0.3 })); col.position.set(0, 0.68, -0.18);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.32), VL.std(0xe9ecef, { roughness: 0.35 })); head.position.set(0, 1.12, -0.06);
    O.rhLed = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), new THREE.MeshBasicMaterial({ color: 0x334033 })); O.rhLed.position.set(0.11, 1.12, 0.105);
    O.spindle = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 8), VL.std(0xbfc4c9, { metalness: 0.9, roughness: 0.25 })); shaft.position.y = -0.21;
    const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 24), VL.std(0xbfc4c9, { metalness: 0.9, roughness: 0.25 })); bob.position.y = -0.46;
    O.spindle.add(shaft, bob); O.spindle.position.set(0, 1.0, 0.0);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 24, 1, true), VL.std(0xbfc4c9, { metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide })); cup.position.set(0, 0.22, 0);
    O.cupFill = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.15, 24), O.liquidMat.clone()); O.cupFill.position.set(0, 0.2, 0); O.cupFill.visible = false;
    rh.add(rb, col, head, O.rhLed, O.spindle, cup, O.cupFill); rh.position.set(-1.75, 0, 0.85); rh.rotation.y = 0.35; VL.shadow(rh); root.add(rh); O.rheo = rh;
    VL.pick(rh, () => VL.run(measure));
    const rl = VL.label(L('Rheometer', 'Rheometer'), L('اضغط للقياس', 'click: measure'), { w: 0.62 }); rl.position.set(-1.75, 1.45, 0.85); root.add(rl);

    // pour stream particles
    const N = 90, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    O.stream = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.03, color: 0xffffff, transparent: true, opacity: 0 }));
    O.stream.userData = { seeds: Float32Array.from({ length: N }, Math.random), noPick: true, on: false, from: new THREE.Vector3(), color: 0xffffff };
    O.stream.frustumCulled = false; root.add(O.stream);

    initNano();
  }

  function container(kind, color) {
    const g = new THREE.Group();
    if (kind === 'bottle') {
      const prof = [[0, 0], [0.16, 0], [0.17, 0.02], [0.17, 0.42], [0.12, 0.52], [0.055, 0.56], [0.055, 0.64]].map(p => new THREE.Vector2(...p));
      const b = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), VL.glass({ opacity: 0.3 }));
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.36, 32), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false })); liq.position.y = 0.2;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 20), VL.std(0x2a2f36)); cap.position.y = 0.66;
      g.add(liq, b, cap); g.userData.mouthY = 0.66;
    } else {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 32, 1, true), VL.glass({ opacity: 0.32 })); body.position.y = 0.2;
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 32), VL.std(color, { roughness: 1 })); fill.position.y = 0.115; fill.castShadow = true;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 32), VL.std(0x2a2f36)); lid.position.y = 0.425;
      g.add(fill, body, lid); g.userData.mouthY = 0.42; g.userData.lid = lid;
    }
    g.userData.color = color;
    return g;
  }

  /* liquid top surface as a polar grid so it can dip into a vortex and ripple */
  function surfaceGeometry(R) {
    const rings = 14, segs = 56, pos = [], idx = [];
    pos.push(0, 0, 0);
    for (let i = 1; i <= rings; i++) for (let j = 0; j < segs; j++) { const r = R * i / rings, a = j / segs * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
    for (let j = 0; j < segs; j++) idx.push(0, 1 + (j + 1) % segs, 1 + j);
    for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + (j + 1) % segs, c = 1 + i * segs + j, d = 1 + i * segs + (j + 1) % segs;
      idx.push(a, b, d, a, d, c);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    geo.userData = { R, rings, segs };
    return geo;
  }

  const hideAll = (mesh, arr) => { const m = new THREE.Matrix4().makeScale(0, 0, 0); arr.forEach((_, i) => mesh.setMatrixAt(i, m)); mesh.instanceMatrix.needsUpdate = true; };

  /* poster: why KCl turns the solution into a gel (packing parameter) */
  function posterTexture() {
    return VL.canvasTexture(2048, 1024, (g, W, H) => {
      g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2a2f36'; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14);
      g.fillStyle = '#17212b'; g.textAlign = 'center'; g.font = '700 58px system-ui, sans-serif';
      g.fillText('Packing parameter  p = v / (a₀ · l_c)', W / 2, 100);
      g.font = '500 40px system-ui, sans-serif'; g.fillStyle = '#5a6672';
      g.fillText('K⁺ screens the –COO⁻ head groups  →  a₀ ↓  →  p ↑  →  spheres grow into worms', W / 2, 165);
      g.direction = 'rtl'; g.fillText('أيونات K⁺ تحجب شحنة الرؤوس فتصغر a₀ ويكبر p فتنمو الـ micelles الكروية إلى سلاسل', W / 2, 220); g.direction = 'ltr';
      const head = '#e8892b', tail = '#5a6672';
      const amph = (x, y, ang, len = 60) => { g.strokeStyle = tail; g.lineWidth = 6; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len); g.stroke(); g.fillStyle = head; g.beginPath(); g.arc(x, y, 15, 0, 7); g.fill(); };
      const cx = [W * 0.18, W * 0.5, W * 0.82], cy = 560;
      // sphere
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; amph(cx[0] + Math.cos(a) * 120, cy + Math.sin(a) * 120, a); }
      // cylinder (worm segment)
      for (let i = 0; i < 9; i++) { const x = cx[1] - 200 + i * 50; amph(x, cy - 95, -Math.PI / 2); amph(x, cy + 95, Math.PI / 2); }
      g.strokeStyle = 'rgba(232,137,43,.35)'; g.lineWidth = 3; g.setLineDash([10, 10]); g.beginPath(); g.moveTo(cx[1] - 250, cy); g.lineTo(cx[1] + 250, cy); g.stroke(); g.setLineDash([]);
      // bilayer
      for (let i = 0; i < 9; i++) { const x = cx[2] - 200 + i * 50; amph(x, cy - 105, Math.PI / 2 + Math.PI); amph(x, cy + 105, Math.PI / 2); }
      g.fillStyle = '#17212b'; g.font = '700 46px system-ui, sans-serif';
      g.fillText('p < 1/3', cx[0], 790); g.fillText('1/3 < p < 1/2', cx[1], 790); g.fillText('1/2 < p < 1', cx[2], 790);
      g.font = '500 38px system-ui, sans-serif'; g.fillStyle = '#5a6672';
      g.fillText('spherical micelles', cx[0], 845); g.fillText('cylindrical / wormlike', cx[1], 845); g.fillText('bilayers, vesicles', cx[2], 845);
      g.fillStyle = '#0f9d76'; g.font = '700 40px system-ui, sans-serif'; g.fillText('← NaOA + KCl', cx[1], 905);
      g.fillStyle = '#8a949e'; g.font = '30px system-ui, sans-serif'; g.fillText('Israelachvili, Mitchell & Ninham (1976)', W / 2, 980);
    });
  }

  function drawDisplay(g, W, H) {
    g.fillStyle = '#0c1a14'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5dffb1'; g.font = '700 64px ui-monospace, Consolas, monospace'; g.textBaseline = 'middle';
    const T = G ? G.T : 25, rpm = G && G.stir ? 600 : 0, set = G ? G.set.T : 90, heat = G && G.heat;
    g.textAlign = 'left'; g.fillText(`${T.toFixed(0)}°C`, 18, H / 2);
    g.font = '500 30px ui-monospace, Consolas, monospace'; g.fillStyle = heat ? '#ff8a70' : '#3f6b57'; g.fillText(`set ${set}`, 210, H / 2 - 22);
    g.fillStyle = rpm ? '#7fc8ff' : '#3f6b57'; g.fillText(`${rpm} rpm`, 210, H / 2 + 22);
  }

  /* ------------------------------------------------------------------ actions */
  const level = () => (G.water + G.hc) * LEVEL_PER_ML;
  async function pour(id, apply, dur = 1.4) {
    const j = O.jars[id], home = j.userData.home, side = home[0] < 0 ? -1 : 1, a = side * 2.0, h = j.userData.mouthY;
    const mouthY = BEAKER.base + BEAKER.h + 0.35;
    const p = [BEAKER.x + h * Math.sin(a) * 1, mouthY - h * Math.cos(a), BEAKER.z];
    await VL.move(j, [home[0], 0.5, home[2]], [0, 0, 0], 0.35);
    j.userData.labelObj.visible = false; if (j.userData.lid) j.userData.lid.visible = false;
    await VL.move(j, p, [0, 0, a], 0.75);
    const s = O.stream.userData; s.on = true; s.color = j.userData.color; s.liquid = id === 'water' || id === 'hc';
    s.from.set(BEAKER.x, mouthY + 0.02, BEAKER.z);
    let done = 0;
    await VL.tween(dur, k => { apply(k - done); done = k; }, k => k);
    s.on = false;
    spawnBubbles(id === 'water' ? 6 : 12);
    await VL.move(j, [home[0], 0.5, home[2]], [0, 0, 0], 0.75);
    await VL.move(j, home, [0, 0, 0], 0.3);
    j.userData.labelObj.visible = true; if (j.userData.lid) j.userData.lid.visible = true;
  }
  async function addWater() {
    if (G.water >= 100) { VL.toast(VL.t(L('في الكأس 100 mL ماء. التراكيز محسوبة لكل 100 mL ماء.', 'The beaker already holds 100 mL water; amounts are per 100 mL water.'))); return; }
    await pour('water', f => { G.water = Math.min(100, G.water + 100 * f); }, 1.6);
  }
  const needWater = () => { if (G.water > 0) return true; VL.toast(VL.t(L('أضف الماء أولاً', 'Add the water first'))); return false; };
  async function addSolid(id) {
    if (!needWater()) return;
    const amt = G.set[id];
    if (!(amt > 0)) { VL.toast(VL.t(L('الكمية المختارة صفر لهذه العينة (عينة ضبط)', 'The amount is zero for this sample (control)'))); return; }
    await pour(id, f => { G[id] += amt * f; }, 1.2);
    if (id === 'guar' && !G.stir) { G.stir = true; VL.renderControls(); }
  }
  async function addBreaker(id) {
    if (!needWater()) return;
    const amt = G.set[id];
    if (!(amt > 0)) { VL.toast(VL.t(L('الكمية صفر', 'Amount is zero'))); return; }
    await pour(id, f => { G[id] += amt * f; }, 1.0);
    if (!G.stir) { G.stir = true; VL.renderControls(); }
  }
  async function measure() {
    if (!needWater()) return;
    O.cupFill.visible = true; O.cupFill.material.color.copy(O.liquidMat.color);
    await VL.tween(0.6, k => { O.spindle.position.y = 1.0 - 0.18 * k; });
    O.rhLed.material.color.set(0x29ff8a);
    const t0 = performance.now();
    await VL.tween(1.8, () => { O.spindle.rotation.y = Math.sin((performance.now() - t0) / 1000 * 18) * 0.5; }, k => k);
    O.spindle.rotation.y = 0;
    const P = props(), ws = [], rs = [];
    for (let e = -2; e <= 2.0001; e += 0.1) ws.push(10 ** e);
    for (let e = -2; e <= 3.0001; e += 0.1) rs.push(10 ** e);
    const tag = `${G.T.toFixed(0)} °C${G.hcB > 0.3 || G.guarM < 0.5 ? ' · broken' : ''}`;
    G.meas.push({ tag, T: G.T, src: P.src, Gp: ws.map(w => [w, P.mod(w).Gp]), Gpp: ws.map(w => [w, P.mod(w).Gpp]), eta: rs.map(r => [r, P.visc(r)]), eta0: P.eta0, eta170: P.eta170, G0: P.G0, tau: P.tau });
    if (G.meas.length > 4) G.meas.shift();
    O.rhLed.material.color.set(0x334033);
    await VL.tween(0.5, k => { O.spindle.position.y = 0.82 + 0.18 * k; });
    O.cupFill.visible = false;
    VL.refreshInstrument();
  }
  async function dropProppant() {
    if (!needWater()) return;
    G.prop = true;
    await pour('sand', f => {
      const n = Math.round(f * O.grains.length * 1.0);
      let k = 0;
      for (const gr of O.grains) { if (k >= n) break; if (gr.on) continue; const a = Math.random() * 6.283, r = Math.random() * 0.13;
        Object.assign(gr, { on: true, x: Math.cos(a) * r, z: Math.sin(a) * r, y: level() - 0.01, rest: 0.035 + 0.012 + Math.random() * 0.03, s: 0.01 + Math.random() * 0.006 }); k++; }
    }, 1.2);
  }
  function spawnBubbles(n) {
    if (!G.water) return;
    for (const b of O.bubs) { if (n <= 0) break; if (b.on) continue; const a = Math.random() * 6.283, r = Math.random() * 0.3;
      Object.assign(b, { on: true, x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.04 + Math.random() * Math.max(0.02, level() - 0.06), s: 0.008 + Math.random() * 0.014 }); n--; }
  }

  /* ------------------------------------------------------------------ per-frame */
  const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), col2 = new THREE.Color();
  let dispAcc = 0, lastDisp = '';
  function update(dt, t) {
    // processes in time-lapse
    const sdt = dt * G.speed; G.simT += sdt;
    const target = G.heat ? G.set.T : 25;
    G.T += (target - G.T) * (1 - Math.exp(-sdt / 150));
    M.stepGel(G, sdt);

    const P = props(), lv = level();
    const gel = Math.max(0, Math.min(1, (Math.log10(P.eta0) + 2.5) / 3.5));
    O.gel = gel;
    // liquid look
    const has = G.water > 0;
    O.liquid.visible = O.surface.visible = has;
    if (has) {
      O.liquid.scale.y = lv; O.liquid.position.y = lv / 2 + 0.004;
      const haze = Math.min(1, G.naoa / 10 * 0.6 + G.guar * 0.5);
      col.set(0xcfe6ff).lerp(col2.set(0xf1ead2), haze * 0.8);
      if (G.hcB > 0.5 && G.naoa > 0) col.lerp(col2.set(0xf6f0dc), 0.3);
      O.liquidMat.color.lerp(col, Math.min(1, dt * 3));
      O.liquidMat.opacity += ((0.33 + haze * 0.35 + gel * 0.12) - O.liquidMat.opacity) * Math.min(1, dt * 3);
      // surface: vortex + ripples, damped by viscosity
      const pa = O.surface.geometry.attributes.position, U = O.surface.geometry.userData;
      const vort = G.stir ? 0.11 * Math.pow(1 - gel, 2) : 0, amp = (G.stir ? 0.006 : 0.0015) * (1 - gel);
      O.vort = (O.vort || 0) + (vort - (O.vort || 0)) * Math.min(1, dt * 2);
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), z = pa.getZ(i), r = Math.hypot(x, z) / U.R;
        pa.setY(i, -O.vort * (1 - r * r) + amp * Math.sin(r * 18 - t * 6 + Math.atan2(z, x) * 2));
      }
      pa.needsUpdate = true; O.surface.geometry.computeVertexNormals();
      O.surface.position.y = lv + 0.004;
      O.oil.position.y = lv + 0.008; O.oil.material.opacity = G.hc > 0 && G.naoa > 0 ? (1 - G.hcB) * 0.7 : G.hc > 0 ? 0.6 : 0;
      O.oil.visible = O.oil.material.opacity > 0.01;
    } else O.oil.visible = false;
    // stir bar (decouples in a thick gel)
    O.barPivot.rotation.y += (G.stir ? (gel > 0.85 ? 6 : 26) : 0) * dt;
    const swirl = G.stir ? 2.5 * (1 - gel) : 0;

    // bubbles rise at their terminal velocity; trapped in a gel
    if (has && G.stir && gel < 0.5 && Math.random() < dt * 3) spawnBubbles(1);
    const vb = M.settling(0.3, 0.0012, 1.0, P.visc).v * UNIT; // 3 mm bubble; negative → rises
    for (let i = 0; i < O.bubs.length; i++) {
      const b = O.bubs[i];
      if (!b.on) continue;
      const v = vb * Math.min(1, Math.pow(b.s / 0.015, 2));
      b.y -= v * dt;
      if (swirl) { const a = Math.atan2(b.z, b.x) + swirl * dt, r = Math.hypot(b.x, b.z); b.x = Math.cos(a) * r; b.z = Math.sin(a) * r; }
      if (b.y > lv - 0.005 || !has) { b.on = false; mat4.makeScale(0, 0, 0); }
      else mat4.compose(v3.set(b.x, b.y, b.z), q.identity(), sc.setScalar(b.s));
      O.bub.setMatrixAt(i, mat4);
    }
    O.bub.instanceMatrix.needsUpdate = true;

    // proppant settles at the drag-law terminal velocity (real time, not time-lapse)
    if (G.prop) {
      const vs = M.settling(0.6, 2.65, 1.01, P.visc).v * UNIT;
      O.vSettle = vs / UNIT;
      for (let i = 0; i < O.grains.length; i++) {
        const gr = O.grains[i];
        if (!gr.on) continue;
        if (gr.y > gr.rest) { gr.y = Math.max(gr.rest, gr.y - vs * dt); if (swirl) { const a = Math.atan2(gr.z, gr.x) + swirl * dt * 0.6, r = Math.min(0.32, Math.hypot(gr.x, gr.z) + dt * 0.02 * swirl); gr.x = Math.cos(a) * r; gr.z = Math.sin(a) * r; } }
        mat4.compose(v3.set(gr.x, gr.y, gr.z), q.setFromAxisAngle(v3.set(0.3, 1, 0.2).normalize(), i), sc.setScalar(gr.s));
        O.sand.setMatrixAt(i, mat4);
      }
      O.sand.instanceMatrix.needsUpdate = true;
    }

    // pour stream
    const s = O.stream.userData, sp = O.stream.geometry.attributes.position;
    O.stream.material.opacity += ((s.on ? 0.95 : 0) - O.stream.material.opacity) * Math.min(1, dt * 10);
    if (s.on || O.stream.material.opacity > 0.02) {
      O.stream.material.color.set(s.color); O.stream.material.size = s.liquid ? 0.045 : 0.028;
      const yTop = s.from.y, yBot = BEAKER.base + lv;
      for (let i = 0; i < s.seeds.length; i++) {
        const ph = (s.seeds[i] + t * 1.8) % 1;
        sp.setXYZ(i, s.from.x + Math.sin(i * 7.1) * (s.liquid ? 0.012 : 0.03) * ph, yTop - (yTop - yBot) * ph * ph, s.from.z + Math.cos(i * 3.3) * (s.liquid ? 0.012 : 0.03) * ph);
      }
      sp.needsUpdate = true;
    }

    // hotplate display
    dispAcc += dt;
    const sig = `${G.T.toFixed(0)}|${G.stir}|${G.heat}|${G.set.T}`;
    if (dispAcc > 0.2 && sig !== lastDisp) { dispAcc = 0; lastDisp = sig; drawDisplay(O.dispTex.userData.cv.getContext('2d'), 512, 128); O.dispTex.needsUpdate = true; }
    O.plate.material.emissive = O.plate.material.emissive || new THREE.Color();
    O.plate.material.emissive.setRGB(Math.max(0, (G.T - 25) / 200), 0.02 * Math.max(0, (G.T - 25) / 100), 0);

    updateNano(dt, t);
  }

  /* ------------------------------------------------------------------ nano view (second renderer) */
  function initNano() {
    const cv = document.getElementById('nano');
    nano = { r: null };
    try { nano.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); } catch { return; }
    nano.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); nano.r.outputEncoding = THREE.sRGBEncoding;
    nano.scene = new THREE.Scene(); nano.scene.background = new THREE.Color(0x0b1220);
    nano.cam = new THREE.PerspectiveCamera(38, 1.5, 0.1, 50); nano.cam.position.set(0, 1.2, 7.2); nano.cam.lookAt(0, 0, 0);
    nano.scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(3, 5, 4); nano.scene.add(dl);
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.6, 3.2, 3.2)), new THREE.LineBasicMaterial({ color: 0x6f8bb5, transparent: true, opacity: 0.25 }));
    nano.scene.add(box);
    nano.group = null; nano.sig = '';
    resizeNano();
  }
  function resizeNano() {
    if (!nano || !nano.r) return;
    const cv = nano.r.domElement, w = cv.clientWidth || 360, h = cv.clientHeight || 240;
    nano.r.setSize(w, h, false); nano.cam.aspect = w / h; nano.cam.updateProjectionMatrix();
  }
  function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  function walk(r, n, step, persist, bounds) {
    const pts = []; let p = new THREE.Vector3((r() - 0.5) * bounds.x * 1.6, (r() - 0.5) * bounds.y * 1.6, (r() - 0.5) * bounds.z * 1.6);
    let d = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    for (let i = 0; i < n; i++) {
      pts.push(p.clone());
      d.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(persist)).normalize();
      p = p.clone().addScaledVector(d, step);
      for (const ax of ['x', 'y', 'z']) if (Math.abs(p[ax]) > bounds[ax]) { d[ax] *= -1; p[ax] = Math.sign(p[ax]) * bounds[ax]; }
    }
    return pts;
  }
  function buildNano(ms) {
    const r = rng(7), grp = new THREE.Group(), B = { x: 2.2, y: 1.5, z: 1.5 };
    const mats = [];
    const mk = (c, o = {}) => { const { op = 1, ...rest } = o; const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, transparent: true, opacity: 0 }, rest)); m.userData.op = op; mats.push(m); return m; };
    const inst = (geo, mat, n, place) => { if (!n) return; const im = new THREE.InstancedMesh(geo, mat, n); for (let i = 0; i < n; i++) { place(mat4, i); im.setMatrixAt(i, mat4); } grp.add(im); };
    const rp = () => v3.set((r() - 0.5) * B.x * 2, (r() - 0.5) * B.y * 2, (r() - 0.5) * B.z * 2);
    const oleate = mk(0xff9a3c);
    inst(new THREE.SphereGeometry(0.04, 8, 6), mk(0xffc58a), ms.monomers, m => m.makeTranslation(rp().x, v3.y, v3.z));
    inst(new THREE.SphereGeometry(0.13, 16, 12), oleate, ms.spheres, m => m.makeTranslation(rp().x, v3.y, v3.z));
    inst(new THREE.SphereGeometry(0.22, 18, 14), mk(0xffd84a, { op: 0.9 }), ms.droplets, m => m.makeTranslation(rp().x, v3.y, v3.z));
    for (let i = 0; i < ms.worms; i++) {
      const pts = walk(r, ms.wormLen, 0.17, 0.55, B);
      grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), ms.wormLen * 3, 0.075, 7), oleate));
    }
    if (ms.guar) {
      const gm = mk(0x45d483), step = 0.05 + 0.13 * (1 - ms.guarCoil);
      for (let i = 0; i < ms.guar; i++) {
        const pts = walk(r, ms.guarLen, step, 1.1, B), per = Math.floor(pts.length / ms.guarPieces);
        for (let k = 0; k < ms.guarPieces; k++) {
          const seg = pts.slice(k * per, (k + 1) * per - (ms.guarPieces > 1 ? 2 : 0));
          if (seg.length >= 3) grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seg), seg.length * 2, 0.03, 5), gm));
        }
      }
    }
    if (G.kcl > 0) { // K⁺ counter-ions
      const n = 70, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { rp(); pos.set([v3.x, v3.y, v3.z], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pm = new THREE.PointsMaterial({ color: 0xb991ff, size: 0.07, transparent: true, opacity: 0 }); pm.userData.op = 0.9; mats.push(pm);
      grp.add(new THREE.Points(g, pm));
    }
    grp.userData.mats = mats; grp.userData.fade = 0;
    return grp;
  }
  function nanoSig(ms) { return [ms.phase, ms.monomers ? 1 : 0, ms.spheres, ms.worms, Math.round(ms.wormLen / 3), ms.droplets ? Math.round(ms.droplets / 6) : 0, ms.guar, ms.guarPieces, Math.round(ms.guarCoil * 3), G.kcl > 0].join('|'); }
  function updateNano(dt, t) {
    if (!nano || !nano.r) return;
    const ms = M.microState({ naoa: G.naoa, kcl: G.kcl, guar: G.guar, T: G.T, hydr: G.hydr, hcB: G.hcB, guarM: G.guarM });
    O.ms = ms;
    const sig = nanoSig(ms);
    if (sig !== nano.sig) {
      nano.sig = sig;
      if (nano.old) disposeGroup(nano.old);
      nano.old = nano.group; nano.group = buildNano(ms); nano.scene.add(nano.group);
      if (nano.old) nano.old.userData.out = true;
    }
    for (const gp of [nano.group, nano.old]) {
      if (!gp) continue;
      const out = gp.userData.out;
      gp.userData.fade = Math.max(0, Math.min(1, gp.userData.fade + (out ? -dt * 2 : dt * 1.5)));
      for (const m of gp.userData.mats) m.opacity = m.userData.op * gp.userData.fade;
      gp.rotation.y = t * 0.12; gp.position.y = Math.sin(t * 0.8) * 0.03;
      if (out && gp.userData.fade <= 0) { disposeGroup(gp); nano.old = null; }
    }
    const ph = document.getElementById('nanoPhase');
    const txt = VL.t(PHASE[ms.phase] || PHASE.water) + (ms.guar && ms.phase !== 'guar' ? ' + guar' : '');
    if (ph.textContent !== txt) ph.textContent = txt;
  }
  function disposeGroup(gp) {
    nano.scene.remove(gp);
    gp.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of gp.userData.mats || []) m.dispose();
  }
  function renderExtra() { if (nano && nano.r && G.water >= 0) nano.r.render(nano.scene, nano.cam); }
  const PHASE = {
    water: L('ماء', 'water'), guar: L('سلاسل guar', 'guar chains'), monomers: L('monomers تحت الـ CMC', 'monomers below the CMC'),
    spheres: L('micelles كروية/قصيرة', 'spherical / short micelles'), rods: L('micelles قصيرة (rods)', 'short rod-like micelles'),
    entangled: L('wormlike micelles متشابكة', 'entangled wormlike micelles'), droplets: L('قطيرات microemulsion منتفخة بالزيت', 'oil-swollen microemulsion droplets'),
  };

  /* ------------------------------------------------------------------ instrument panel */
  const fmt = VL.fmt;
  function instrument(tab) {
    const P = props();
    const meas = G.meas, last = meas[meas.length - 1];
    const green = '#14a37a', orange = '#e8892b', grey = '#8a949e';
    const draw = (cv, tb) => {
      if (!last) { const c = VL.plot(cv, { x: [0.01, 100], y: [0.01, 1000], xlog: true, ylog: true, xlabel: 'ω (rad/s)', ylabel: 'G′, G″ (Pa)', series: [] });
        if (c) { c.g.fillStyle = VL.css('--muted'); c.g.textAlign = 'center'; c.g.font = '13px system-ui, sans-serif'; c.g.direction = VL.lang() === 'ar' ? 'rtl' : 'ltr';
          c.g.fillText(VL.t(L('اضغط على الـ rheometer للقياس', 'Click the rheometer to measure')), c.L + c.pw / 2, c.T + c.ph / 2); }
        return; }
      if (tb === 'flow') {
        const series = meas.slice(0, -1).map(m => ({ pts: m.eta, color: grey, width: 1.5, alpha: 0.6 }));
        series.push({ pts: last.eta, color: green, width: 2.5, label: `η · ${last.tag}` });
        const ys = meas.flatMap(m => m.eta.map(p => p[1]));
        VL.plot(cv, { x: [0.01, 1000], y: rangeLog(ys), xlog: true, ylog: true, xlabel: 'γ̇ (1/s)', ylabel: 'η (Pa·s)', series, vlines: [{ x: 170, color: orange }] });
      } else {
        const series = meas.slice(0, -1).map(m => ({ pts: m.Gp, color: grey, width: 1.5, alpha: 0.6 }));
        series.push({ pts: last.Gp, color: green, width: 2.5, label: `G′ · ${last.tag}` }, { pts: last.Gpp, color: orange, width: 2.2, dash: [6, 4], label: 'G″' });
        const ys = meas.flatMap(m => m.Gp.concat(m.Gpp).map(p => p[1]));
        VL.plot(cv, { x: [0.01, 100], y: rangeLog(ys), xlog: true, ylog: true, xlabel: 'ω (rad/s)', ylabel: 'G′, G″ (Pa)', series, vlines: last.tau > 0.01 && last.tau < 100 ? [{ x: 1 / last.tau, color: grey }] : [] });
      }
    };
    const vs = G.water ? M.settling(0.6, 2.65, 1.01, P.visc).v : null;
    const comp = G.water ? `NaOA ${fmt(G.naoa)} · guar ${fmt(G.guar)} · KCl ${fmt(G.kcl)}` : '—';
    const brk = G.hc || G.aps ? `WLM ${Math.round(G.hcB * 100)}% · guar M/M₀ ${fmt(G.guarM)}` : '—';
    const badge = P.src === 'data' ? { cls: 'good', text: P.demo ? L('بيانات المثال في FracGel', 'FracGel demo data') : L('بياناتك المقاسة', 'your measured data') }
      : { cls: 'warn', text: L('نموذج توضيحي', 'illustrative model') };
    return {
      title: L('Rheometer وقراءات الجل', 'Rheometer & gel readouts'), badge,
      tabs: [{ id: 'osc', label: L('G′ / G″', 'G′ / G″') }, { id: 'flow', label: L('η(γ̇)', 'η(γ̇)') }],
      draw,
      readouts: [
        [L('η₀ (zero-shear)', 'η₀ (zero-shear)'), G.water ? fmt(P.eta0, 'Pa·s') : '—'],
        [L('η عند 170 s⁻¹', 'η at 170 s⁻¹'), G.water ? fmt(P.eta170 * 1000, 'mPa·s') : '—'],
        [L('G₀ (WLM)', 'G₀ (WLM)'), P.G0 > 0 ? fmt(P.G0, 'Pa') : '—'],
        [L('τR (WLM)', 'τR (WLM)'), P.tau > 0 ? fmt(P.tau, 's') : '—'],
        [L('الحرارة · الزمن', 'T · time'), `${G.T.toFixed(0)} °C · ${fmtTime(G.simT)}`],
        [L('ترسيب proppant 20/40', '20/40 proppant settling'), vs === null ? '—' : fmt(vs * 1000, 'mm/s')],
        [L('التركيب (g/100 mL ماء)', 'Recipe (g/100 mL water)'), comp, true],
        [L('الكسر', 'Breaking'), brk, true],
      ],
      note: P.src === 'data' ? L('G₀ و τR و η₀ من FracGel Lab لهذه العينة عند 25 °C. أي حرارة أو breaker يعيد النموذج التوضيحي.', 'G₀, τR and η₀ come from FracGel Lab for this sample at 25 °C. Any heating or breaker switches back to the illustrative model.')
        : P.missing ? L('لا توجد قياسات في FracGel لهذه العينة وهذه الظروف، فالقيم من النموذج التوضيحي.', 'No FracGel measurements for this sample and condition, so values come from the illustrative model.')
          : L('نموذج توضيحي: Cates scaling و Arrhenius ومنحنى Morris للـ guar، دون حد تآزر. القيم المرجعية افتراضية، فلا تعرضها كنتائج.', 'Illustrative model: Cates scaling, Arrhenius and the Morris guar curve, no synergy term. Reference values are placeholders: do not present them as results.'),
    };
  }
  function rangeLog(ys) {
    const v = ys.filter(y => y > 0); if (!v.length) return [0.001, 10];
    const hi = Math.max(...v), lo = Math.max(Math.min(...v), hi * 1e-5);
    return [10 ** Math.floor(Math.log10(lo)), 10 ** Math.ceil(Math.log10(hi) + 0.01)];
  }
  const fmtTime = s => s < 3600 ? `${Math.floor(s / 60)} min` : `${(s / 3600).toFixed(1)} h`;

  /* ------------------------------------------------------------------ controls */
  function controls(el) {
    const s = G.set;
    const presetVal = PLAN.find(([n, g]) => n === s.naoa && g === s.guar && s.kcl === 1);
    const slider = (id, lab, min, max, step, unit) => `<label>${VL.t(lab)} <span class="val" id="v_${id}">${s[id]} ${unit}</span><input type="range" id="s_${id}" min="${min}" max="${max}" step="${step}" value="${s[id]}"></label>`;
    const nFG = G.fg ? Object.values(G.fg.samples).filter(x => x.G0 !== null && x.G0 !== '' && x.G0 !== undefined).length : 0;
    el.innerHTML = `
      <label>${VL.t(L('العينة (من خطة FracGel)', 'Sample (FracGel plan)'))}
        <select id="gPreset"><option value="">${VL.t(L('مخصّصة', 'custom'))}</option>${PLAN.map(([n, g]) => `<option value="${n}|${g}" ${presetVal && presetVal[0] === n && presetVal[1] === g ? 'selected' : ''}>${sampleName(n, g)} · NaOA ${n} g · guar ${g} g · KCl 1 g</option>`).join('')}</select></label>
      <div class="grid2">${slider('naoa', L('NaOA', 'NaOA'), 0, 10, 0.5, 'g')}${slider('guar', L('guar', 'guar'), 0, 1, 0.05, 'g')}</div>
      <div class="grid2">${slider('kcl', L('KCl', 'KCl'), 0, 3, 0.25, 'g')}${slider('T', L('حرارة الهدف', 'Target T'), 25, 120, 5, '°C')}</div>
      <div class="grid2">${slider('hc', L('Kerosene', 'Kerosene'), 0, 10, 0.5, 'mL')}${slider('aps', L('APS', 'APS'), 0, 0.2, 0.01, 'g')}</div>
      <p class="note" style="margin:0">${VL.t(L('الكميات لكل 100 mL ماء، وتُضاف بالضغط على الجرّة.', 'Amounts per 100 mL water; added when you click the jar.'))}</p>
      <div class="row">
        <button id="gStir" class="${G.stir ? 'pri' : ''}">${VL.t(G.stir ? L('إيقاف التحريك', 'Stop stirring') : L('تحريك', 'Stir'))}</button>
        <button id="gHeat" class="${G.heat ? 'pri' : ''}">${VL.t(G.heat ? L('إيقاف التسخين', 'Heater off') : L('تسخين', 'Heat'))}</button>
        <label class="inline">${VL.t(L('تسريع الزمن', 'Time-lapse'))} <select id="gSpeed">${[1, 60, 600].map(v => `<option value="${v}" ${G.speed === v ? 'selected' : ''}>×${v}</option>`).join('')}</select></label>
      </div>
      <div class="row">
        <button id="gPrep">${VL.t(L('حضّر العينة (الخطوات 1–4)', 'Prepare sample (steps 1–4)'))}</button>
        <button id="gMeas">${VL.t(L('قِس', 'Measure'))}</button>
        <button id="gProp">${VL.t(L('proppant', 'Proppant'))}</button>
      </div>
      <label>${VL.t(L('مصدر القيم', 'Values from'))}
        <select id="gSrc"><option value="model">${VL.t(L('النموذج التوضيحي', 'Illustrative model'))}</option><option value="data" ${G.source === 'data' ? 'selected' : ''}>${VL.t(L('بياناتي في FracGel Lab', 'My FracGel Lab data'))}</option></select></label>
      <div class="row"><span class="note" style="margin:0">${G.fg ? VL.t(L(`FracGel: ${nFG} عينة فيها G₀${G.fg.demo ? ' (بيانات مثال)' : ''}`, `FracGel: ${nFG} samples with G₀${G.fg.demo ? ' (demo data)' : ''}`)) : VL.t(L('لا توجد بيانات FracGel في هذا المتصفح', 'No FracGel data in this browser'))}</span>
        <button id="gImport" class="ghost">${VL.t(L('استورد JSON', 'Import JSON'))}</button><input type="file" id="gFile" accept="application/json,.json" hidden></div>`;
    const $ = q => el.querySelector(q);
    for (const id of ['naoa', 'guar', 'kcl', 'T', 'hc', 'aps']) {
      $(`#s_${id}`).oninput = e => { s[id] = +e.target.value; $(`#v_${id}`).textContent = `${s[id]} ${{ T: '°C', hc: 'mL', aps: 'g' }[id] || 'g'}`; if (['naoa', 'guar', 'kcl'].includes(id)) $('#gPreset').value = PLAN.some(([n, g]) => n === s.naoa && g === s.guar) && s.kcl === 1 ? `${s.naoa}|${s.guar}` : ''; };
    }
    $('#gPreset').onchange = e => { if (!e.target.value) return; const [n, g] = e.target.value.split('|').map(Number); Object.assign(s, { naoa: n, guar: g, kcl: 1 }); VL.renderControls(); };
    $('#gStir').onclick = () => { G.stir = !G.stir; VL.renderControls(); };
    $('#gHeat').onclick = () => { G.heat = !G.heat; VL.renderControls(); };
    $('#gSpeed').onchange = e => { G.speed = +e.target.value; };
    $('#gPrep').onclick = () => VL.run(prepare);
    $('#gMeas').onclick = () => VL.run(measure);
    $('#gProp').onclick = () => VL.run(dropProppant);
    $('#gSrc').onchange = e => { G.source = e.target.value; if (G.source === 'data' && !G.fg) VL.toast(VL.t(L('افتح FracGel Lab على نفس الموقع أو استورد ملف JSON المصدَّر منه', 'Open FracGel Lab on the same site, or import its exported JSON'))); VL.refreshInstrument(); };
    $('#gImport').onclick = () => $('#gFile').click();
    $('#gFile').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const j = JSON.parse(await f.text()); if (!j || !j.samples) throw new Error('no samples'); G.fg = j; G.source = 'data'; VL.toast(VL.t(L('تم استيراد بيانات FracGel', 'FracGel data imported'))); }
      catch { VL.toast(VL.t(L('الملف ليس تصديراً من FracGel Lab', 'Not a FracGel Lab export'))); }
      VL.renderControls(); VL.refreshInstrument();
    };
  }

  /* ------------------------------------------------------------------ steps */
  // Auto steps fast-forward the time-lapse (×600) while they wait for a slow process, then restore it.
  async function waitFor(cond, maxS) {
    const sp = G.speed; G.speed = Math.max(sp, 600);
    try { for (let i = 0; i < maxS * 10 && !cond(); i++) await VL.wait(0.1); } finally { G.speed = sp; }
  }
  async function prepare() {
    if (G.water < 100) await addWater();
    if (G.set.guar > 0 && G.guar === 0) { await addSolid('guar'); G.stir = true; await waitFor(() => G.hydr > 0.85, 8); }
    if (G.set.naoa > 0 && G.naoa === 0) await addSolid('naoa');
    if (G.set.kcl > 0 && G.kcl === 0) await addSolid('kcl');
    G.stir = false; VL.renderControls();
  }
  const steps = [
    { title: L('أضف 100 mL ماء', 'Add 100 mL water'),
      text: L('اضغط على قارورة الماء المقطّر. استخدم ماءً مقطّراً أو deionized: أيونات Ca²⁺ و Mg²⁺ ترسّب الـ oleate كصابون غير ذائب. كل الكميات بعدها بالغرام لكل 100 mL ماء، كما في خطة FracGel.',
        'Click the DI water bottle. Use distilled or deionized water: Ca²⁺ and Mg²⁺ precipitate oleate as insoluble soap. All later amounts are g per 100 mL water, as in the FracGel plan.'),
      conf: ['fact'], target: () => O.jars.water, done: () => G.water >= 100, auto: addWater },
    { title: L('أضف الـ guar وحرّك حتى يتميّه', 'Add guar and stir to hydrate'),
      text: L('سلاسل الـ guar الملتفة تتشرّب الماء وتنفرد، فترتفع اللزوجة تدريجياً (انظر الـ nano view). زمن الـ hydration هنا توضيحي ويعتمد على درجة الـ guar والقص. عينة بلا guar؟ اختر 0 g وتُتخطى الخطوة.',
        'Coiled guar chains take up water and unfold, so viscosity rises gradually (see the nano view). Hydration time here is illustrative and depends on guar grade and shear. Guar-free sample? Set 0 g and the step is skipped.'),
      conf: ['fact', 'illu'], target: () => O.jars.guar, done: () => G.set.guar === 0 ? G.water > 0 : G.guar > 0 && G.hydr > 0.85,
      auto: async () => { if (!G.water) await addWater(); if (G.set.guar > 0) { if (!G.guar) await addSolid('guar'); G.stir = true; await waitFor(() => G.hydr > 0.85, 8); } } },
    { title: L('أضف sodium oleate', 'Add sodium oleate'),
      text: L('فوق الـ CMC (رتبته نحو 1 mM، بينما 8 g/100 mL ≈ 263 mM) تتجمّع جزيئات الـ oleate في micelles. دون ملح مضاف تبقى قصيرة، لأن رؤوس الـ carboxylate المشحونة تتنافر. الشكل الدقيق عند هذه التراكيز دون ملح غير مؤكد.',
        'Above the CMC (order of 1 mM, while 8 g/100 mL ≈ 263 mM) oleate assembles into micelles. Without added salt they stay short because the charged carboxylate heads repel. The exact shape at these concentrations without salt is uncertain.'),
      conf: ['fact', 'inf'], target: () => O.jars.naoa, done: () => G.set.naoa === 0 ? G.water > 0 : G.naoa > 0,
      auto: async () => { if (!G.water) await addWater(); if (G.set.naoa > 0 && !G.naoa) await addSolid('naoa'); } },
    { title: L('أضف KCl: من محلول إلى wormlike micelles', 'Add KCl: from solution to wormlike micelles'),
      text: L('K⁺ يحجب شحنة الرؤوس فتصغر مساحة الرأس a₀ ويرتفع الـ packing parameter نحو 1/3–1/2 (الملصق خلف الكأس)، فتنمو الـ micelles إلى سلاسل طويلة متشابكة وتصير الشبكة viscoelastic: الدوّامة تختفي والفقاعات تعلق. وجود الـ guar داخل هذه الشبكة (pseudo-interpenetrating) هو فرضية البحث.',
        'K⁺ screens the head-group charge, a₀ shrinks and the packing parameter rises toward 1/3–1/2 (poster behind the beaker), so micelles grow into long entangled worms and the fluid turns viscoelastic: the vortex vanishes and bubbles get trapped. Guar inside this network (pseudo-interpenetrating) is the thesis hypothesis.'),
      conf: ['fact', 'inf'], target: () => O.jars.kcl, done: () => G.set.kcl === 0 ? G.water > 0 : G.kcl > 0,
      auto: async () => { if (!G.water) await addWater(); if (G.set.kcl > 0 && !G.kcl) await addSolid('kcl'); G.stir = true; VL.renderControls(); await VL.wait(1.2); G.stir = false; VL.renderControls(); } },
    { title: L('قِس على الـ rheometer', 'Measure on the rheometer'),
      text: L('الـ frequency sweep لـ WLM يتبع Maxwell تقريباً: G″ أعلى عند الترددات المنخفضة، ويتقاطعان عند ω ≈ 1/τR، ثم يستقر G′ عند G₀. القيم توضيحية ما لم تحمّل بياناتك من FracGel Lab.',
        'A WLM frequency sweep is close to Maxwell: G″ dominates at low frequency, the curves cross near ω ≈ 1/τR, then G′ levels at G₀. Values are illustrative unless you load your FracGel Lab data.'),
      conf: ['fact', 'illu'], target: () => O.rheo, done: () => G.meas.some(m => m.T < 30), auto: measure },
    { title: L('اختبار تعليق الـ proppant', 'Proppant suspension test'),
      text: L('اضغط على جرّة الرمل 20/40. سرعة الهبوط من قانون السحب (Schiller–Naumann) باللزوجة عند معدل القص حول الحبة. في الماء تهبط الحبة 0.6 mm بنحو 0.1 m/s، وفي الجل المتشابك تكاد تتوقف. حجم الحبات في الرسم مكبّر.',
        'Click the 20/40 sand jar. Fall speed uses a drag law (Schiller–Naumann) with the viscosity at the shear rate around the grain. In water a 0.6 mm grain falls at about 0.1 m/s; in the entangled gel it nearly stops. Grains are drawn enlarged.'),
      conf: ['fact', 'illu'], target: () => O.jars.sand, done: () => G.prop, auto: dropProppant },
    { title: L('سخّن إلى حرارة الهدف', 'Heat to the target temperature'),
      text: L('شغّل التسخين (الزر الأحمر). الـ WLM يضعف بسرعة مع الحرارة لأن τR يتبع Arrhenius والـ micelles تقصر، والحبات العالقة تبدأ بالهبوط. الـ guar يفقد أقل، وهذا دافع الدمج. قِس مرة أخرى لترى المنحنيين معاً.',
        'Turn the heater on (red knob). The WLM weakens fast with temperature because τR follows Arrhenius and the micelles shorten, so suspended grains start to fall. Guar loses less, which is the reason to combine them. Measure again to compare the curves.'),
      conf: ['fact', 'illu'], target: () => O.knobHeat, done: () => G.heat && G.set.T > 40 && Math.abs(G.T - G.set.T) < 1.5,
      auto: async () => { G.heat = true; VL.renderControls(); await waitFor(() => Math.abs(G.T - G.set.T) < 1.5, 15); await measure(); } },
    { title: L('اكسر الجل', 'Break the gel'),
      text: L('الـ kerosene يذوب في قلب الـ micelles فتتحول إلى قطيرات microemulsion كروية وتنهار المرونة. الـ APS يولّد جذور sulfate تقطع سلسلة الـ guar، وهو بطيء جداً عند حرارة الغرفة ويتسارع بالحرارة. الـ WLM وحده لا يترك بوليمراً، فالـ residue مصدره الـ guar.',
        'Kerosene dissolves into the micelle cores, turning them into spherical microemulsion droplets, and the elasticity collapses. APS makes sulfate radicals that cut the guar chain; it is very slow at room temperature and speeds up with heat. WLM alone leaves no polymer, so the residue comes from guar.'),
      conf: ['fact', 'inf'], target: () => G.hc ? O.jars.aps : O.jars.hc,
      done: () => (G.hc > 0 || G.aps > 0) && (G.naoa === 0 || G.hcB > 0.8) && (G.guar === 0 || G.guarM < 0.2) && props().eta170 < 0.01,
      auto: async () => { if (G.naoa > 0 && !G.hc) await addBreaker('hc'); if (G.guar > 0 && !G.aps) await addBreaker('aps'); await waitFor(() => (G.naoa === 0 || G.hcB > 0.8) && (G.guar === 0 || G.guarM < 0.2), 15); await measure(); } },
  ];

  VL.lessons.gel = {
    id: 'gel', nano: true, steps, build, update, instrument, controls, renderExtra, instRate: 0.25,
    resize: resizeNano,
    relabel() {},
    dispose() { if (nano && nano.r) { if (nano.group) disposeGroup(nano.group); if (nano.old) disposeGroup(nano.old); nano.r.dispose(); nano = null; } },
  };
})();

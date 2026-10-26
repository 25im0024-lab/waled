/* Virtual Lab — Lesson 1: flame tests with a live spectroscope and a cobalt-glass filter. */
(function () {
  'use strict';
  const VL = window.VL, M = VL.M;
  const ORDER = ['LiCl', 'NaCl', 'KCl', 'CaCl2', 'SrCl2', 'CuCl2', 'BaCl2'];
  const FORM = { LiCl: 'LiCl', NaCl: 'NaCl', KCl: 'KCl', CaCl2: 'CaCl₂', SrCl2: 'SrCl₂', CuCl2: 'CuCl₂', BaCl2: 'BaCl₂', X: '?' };
  const NAME = {
    LiCl: { ar: 'كلوريد الليثيوم', en: 'Lithium chloride' }, NaCl: { ar: 'كلوريد الصوديوم', en: 'Sodium chloride' },
    KCl: { ar: 'كلوريد البوتاسيوم', en: 'Potassium chloride' }, CaCl2: { ar: 'كلوريد الكالسيوم', en: 'Calcium chloride' },
    SrCl2: { ar: 'كلوريد السترونشيوم', en: 'Strontium chloride' }, CuCl2: { ar: 'كلوريد النحاس(II)', en: 'Copper(II) chloride' },
    BaCl2: { ar: 'كلوريد الباريوم', en: 'Barium chloride' }, X: { ar: 'عيّنة مجهولة', en: 'Unknown sample' },
  };
  const COLOR_NAME = {
    LiCl: { ar: 'أحمر قرمزي', en: 'crimson red' }, NaCl: { ar: 'أصفر-برتقالي قوي', en: 'intense yellow-orange' },
    KCl: { ar: 'بنفسجي فاتح (lilac)', en: 'lilac' }, CaCl2: { ar: 'أحمر طوبي / برتقالي', en: 'brick red / orange-red' },
    SrCl2: { ar: 'قرمزي', en: 'crimson' }, CuCl2: { ar: 'أزرق-مخضر', en: 'blue-green' }, BaCl2: { ar: 'أخضر فاتح', en: 'pale (apple) green' },
  };
  const LINE_NOTE = {
    Na: 'Na D 589.0 / 589.6 nm', K: 'K 766.5 / 769.9 nm + 404 nm', Li: 'Li 670.8 nm', Ca: 'CaOH ~622, ~554 nm; Ca 422.7 nm',
    Sr: 'SrOH ~682, ~606 nm; Sr 460.7 nm', Cu: 'Cu 510.6–521.8 nm; CuCl ~420–450 nm', Ba: 'Ba 553.5 nm; ~513, 524 nm bands',
  };
  const BURNER_TOP = 1.12;
  const FLAME_TIP = [0, BURNER_TOP + 0.3, 0];
  const L = (ar, en) => ({ ar, en });

  let S, O; // state, scene objects

  function freshState() {
    const pickU = () => ORDER[Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * ORDER.length)];
    return { burner: false, air: false, loop: M.newLoop(), loopAt: 'rest', tested: new Set(), cleaned: false, cobalt: false, cobaltSeenK: false,
      naTrace: true, unknown: pickU(), answer: '', answered: false, correct: false, em: null, hold: 0 };
  }

  /* ------------------------------------------------------------------ flame shader */
  const FLAME_VS = `
    uniform float uTime, uWobble; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() {
      vUv = uv; vec3 p = position; float h = clamp(uv.y, 0.0, 1.0);
      p.x += sin(uTime * 13.0 + h * 7.0) * uWobble * h; p.z += cos(uTime * 11.0 + h * 5.0) * uWobble * h;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`;
  const FLAME_FS = `
    uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() {
      float y = vUv.y;
      float a = uAlpha * smoothstep(0.0, 0.12, y) * pow(1.0 - y, 0.9);
      a *= pow(abs(dot(vN, vV)), 1.4);
      gl_FragColor = vec4(uColor * (1.2 - 0.4 * y), a);
    }`;
  function flameLayer(r, h) {
    const geo = new THREE.ConeGeometry(r, h, 32, 12, true); geo.translate(0, h / 2, 0);
    const mat = new THREE.ShaderMaterial({ vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uWobble: { value: 0.02 }, uColor: { value: new THREE.Color(0x3a6dff) }, uAlpha: { value: 0 } } });
    const m = new THREE.Mesh(geo, mat); m.userData.noPick = true; return m;
  }

  /* ------------------------------------------------------------------ build */
  function build() {
    S = freshState(); O = {};
    const root = VL.root;
    const wide = innerWidth / innerHeight >= 0.8;
    VL.home(wide ? [0, 4.3, 6.4] : [0, 6.2, 9.4], wide ? [0, 0.55, 0.3] : [0, -1.1, 0.3]);

    // poster: periodic table with flame colours
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.75), new THREE.MeshStandardMaterial({ map: periodicTexture(), roughness: 0.9 }));
    poster.position.set(0, 2.75, -1.72); root.add(poster); O.poster = poster;

    // Bunsen burner
    const burner = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.07, 48), VL.std(0x2b3d6e, { roughness: 0.35, metalness: 0.3 })); base.position.y = 0.035;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, BURNER_TOP - 0.07, 32), VL.std(0xbfc4c9, { metalness: 0.85, roughness: 0.28 })); barrel.position.y = 0.07 + (BURNER_TOP - 0.07) / 2;
    const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 16), VL.std(0xbfc4c9, { metalness: 0.85, roughness: 0.3 })); inlet.rotation.z = Math.PI / 2; inlet.position.set(0.17, 0.14, 0);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.31, 0.14, 0), new THREE.Vector3(0.6, 0.06, -0.05), new THREE.Vector3(1.0, 0.04, -0.5), new THREE.Vector3(1.2, 0.04, -1.5)]), 40, 0.03, 10), VL.std(0xe8742a, { roughness: 0.6 }));
    burner.add(base, barrel, inlet, hose);
    VL.shadow(burner); root.add(burner); O.burner = burner;
    burner.userData.hintAt = new THREE.Vector3(0, BURNER_TOP + 0.05, 0);
    VL.pick(burner, () => VL.run(async () => { S.burner = !S.burner; if (!S.burner) S.air = false; syncCollar(); }));

    const collar = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 32), VL.std(0xc9a14a, { metalness: 0.75, roughness: 0.3 }));
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 16), VL.std(0x111111)); hole.rotation.x = Math.PI / 2; hole.position.set(0, 0, 0.078);
    collar.add(ring, hole); collar.position.y = 0.3; VL.shadow(collar); root.add(collar); O.collar = collar; O.hole = hole;
    VL.pick(collar, () => VL.run(async () => { if (!S.burner) { VL.toast(VL.t(L('أشعل الموقد أولاً', 'Light the burner first'))); return; } S.air = !S.air; syncCollar(); }));
    O.burnerLabel = VL.label(L('موقد Bunsen', 'Bunsen burner'), L('اضغط لإشعال / إطفاء', 'click: on / off'), { w: 0.7 });
    O.burnerLabel.position.set(0.62, 0.4, 0.35); root.add(O.burnerLabel);

    // flame
    const flame = new THREE.Group(); flame.position.set(0, BURNER_TOP, 0);
    O.outer = flameLayer(0.1, 0.62); O.inner = flameLayer(0.05, 0.22); O.lum = flameLayer(0.12, 0.95);
    O.inner.material.uniforms.uColor.value.set(0x8fd0ff);
    flame.add(O.lum, O.outer, O.inner);
    // emission particles
    const N = 140, pos = new Float32Array(N * 3), seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) seeds[i] = Math.random();
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    O.sparks = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.035, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    O.sparks.userData = { seeds, noPick: true }; flame.add(O.sparks);
    O.light = new THREE.PointLight(0xffa040, 0, 4, 2); O.light.position.y = 0.3; flame.add(O.light);
    root.add(flame); O.flame = flame;

    // wire loop (origin at the loop tip)
    const tool = new THREE.Group();
    const loopRing = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 10, 28), VL.std(0x9aa0a6, { metalness: 0.9, roughness: 0.3, emissive: 0x000000 }));
    loopRing.position.x = -0.035;
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.8, 8), VL.std(0x9aa0a6, { metalness: 0.9, roughness: 0.3 })); wire.rotation.z = Math.PI / 2; wire.position.x = -0.47;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.075, 0.075), VL.std(0xe2342b, { roughness: 0.45 })); handle.position.x = -1.17;
    tool.add(loopRing, wire, handle); VL.shadow(tool); root.add(tool); O.tool = tool; O.loopRing = loopRing;
    O.rest = { pos: [-0.6, 0.05, 0.45], rot: [0, -0.25, 0] };
    tool.position.set(...O.rest.pos); tool.rotation.set(...O.rest.rot);
    tool.userData.hintAt = new THREE.Vector3(-1.1, 0.05, 0);
    VL.pick(tool, () => VL.run(cleanLoop));
    O.toolLabel = VL.label(L('سلك nichrome', 'Nichrome wire loop'), L('اضغط للتنظيف', 'click: clean it'), { w: 0.66 }); O.toolLabel.position.set(-1.25, 0.32, 0.4); root.add(O.toolLabel);

    // dilute HCl beaker
    O.hcl = beaker(0.22, 0.5, 0xf4f7f9, 0.6); O.hcl.position.set(1.45, 0, -0.35); root.add(O.hcl);
    VL.pick(O.hcl, () => VL.run(cleanLoop));
    const hl = VL.label(L('HCl مخفف', 'Dilute HCl'), L('لتنظيف السلك', 'for cleaning'), { w: 0.66 }); hl.position.set(1.45, 0.82, -0.35); root.add(hl);

    // cobalt glass
    const cg = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.015), new THREE.MeshPhysicalMaterial({ color: 0x1d3cff, transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1, depthWrite: false }));
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.12), VL.std(0x333a44)); foot.position.y = -0.185;
    cg.add(plate, foot); O.cobaltHome = [-1.45, 0.2, -0.3]; cg.position.set(...O.cobaltHome); root.add(cg); O.cobalt = cg; O.cobaltPlate = plate;
    VL.pick(cg, () => VL.run(() => setCobalt(!S.cobalt)));
    O.cobaltLabel = VL.label(L('زجاج الكوبالت', 'Cobalt glass'), L('يحجب أصفر Na', 'blocks Na yellow'), { w: 0.66 }); O.cobaltLabel.position.set(-1.45, 0.62, -0.3); root.add(O.cobaltLabel);

    // salt dishes
    O.dishes = {};
    const keys = [...ORDER, 'X'];
    keys.forEach((k, i) => {
      const x = (i - (keys.length - 1) / 2) * 0.74, z = 1.25;
      const d = dish(k === 'X' ? '#e9e9e4' : M.SALTS[k].powder); d.position.set(x, 0, z); root.add(d); O.dishes[k] = d;
      VL.pick(d, () => VL.run(() => testSalt(k)));
      const lab = VL.label(FORM[k], NAME[k], { w: 0.56, accent: k === 'X' ? '#19c48c' : null }); lab.position.set(x, 0.06, z + 0.5); root.add(lab);
      d.userData.label = lab;
    });
    syncCollar(true);
  }

  function beaker(r, h, liquid, fill) {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.96, h, 40, 1, true), VL.glass({ opacity: 0.2 }));
    glass.position.y = h / 2;
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 40), VL.glass({ opacity: 0.25 })); bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.005;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 8, 48), VL.glass({ opacity: 0.45 })); rim.rotation.x = Math.PI / 2; rim.position.y = h;
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.92, h * fill, 40), new THREE.MeshStandardMaterial({ color: liquid, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }));
    liq.position.y = h * fill / 2 + 0.006; liq.renderOrder = 1;
    g.add(liq, glass, bottom, rim); g.userData.liquid = liq;
    return g;
  }
  function dish(powder) {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), VL.glass({ opacity: 0.35 }));
    glass.scale.set(1, 0.32, 1); glass.position.y = 0.1;
    const pile = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: powder, roughness: 1 }));
    pile.scale.set(1, 0.28, 1); pile.position.y = 0.035; pile.castShadow = true; pile.receiveShadow = true;
    g.add(pile, glass);
    return g;
  }

  /* periodic table texture; flame-test elements filled with their flame colour */
  function periodicTexture() {
    const SYM = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
    const pos = z => {
      if (z === 1) return [1, 1]; if (z === 2) return [1, 18];
      if (z <= 4) return [2, z - 2]; if (z <= 10) return [2, z + 8];
      if (z <= 12) return [3, z - 10]; if (z <= 18) return [3, z];
      if (z <= 36) return [4, z - 18]; if (z <= 54) return [5, z - 36];
      if (z <= 56) return [6, z - 54]; if (z === 57) return [6, 3]; if (z <= 71) return [9, z - 54];
      if (z <= 86) return [6, z - 68]; if (z <= 88) return [7, z - 86]; if (z === 89) return [7, 3]; if (z <= 103) return [10, z - 86];
      return [7, z - 100];
    };
    const FL = { Li: M.SALTS.LiCl.flame, Na: M.SALTS.NaCl.flame, K: M.SALTS.KCl.flame, Ca: M.SALTS.CaCl2.flame, Sr: M.SALTS.SrCl2.flame, Cu: M.SALTS.CuCl2.flame, Ba: M.SALTS.BaCl2.flame };
    return VL.canvasTexture(2048, 1084, (g, W, H) => {
      g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#2a2f36'; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14);
      const cw = 104, ch = 92, ox = 80, oy = 120;
      g.fillStyle = '#17212b'; g.font = '700 54px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('Periodic Table · الجدول الدوري', ox, 80);
      g.font = '500 30px system-ui, sans-serif'; g.fillStyle = '#5a6672'; g.textAlign = 'right';
      g.fillText('Coloured cells = flame colour  ·  الخلايا الملوّنة = لون اللهب', W - 70, 80);
      for (let z = 1; z <= 118; z++) {
        const [r, c] = pos(z), s = SYM[z - 1];
        const x = ox + (c - 1) * cw, y = oy + (r - 1) * ch + (r >= 9 ? 26 : 0);
        g.fillStyle = FL[s] || (r >= 9 ? '#eef0f3' : '#f1f3f5'); g.fillRect(x + 3, y + 3, cw - 6, ch - 6);
        g.strokeStyle = FL[s] ? '#17212b' : '#cfd5db'; g.lineWidth = FL[s] ? 4 : 2; g.strokeRect(x + 3, y + 3, cw - 6, ch - 6);
        g.fillStyle = '#17212b'; g.textAlign = 'center'; g.font = `${FL[s] ? 800 : 600} 38px system-ui, sans-serif`; g.fillText(s, x + cw / 2, y + ch / 2 + 18);
        g.font = '22px system-ui, sans-serif'; g.fillStyle = '#5a6672'; g.textAlign = 'left'; g.fillText(String(z), x + 10, y + 28);
      }
    });
  }

  /* ------------------------------------------------------------------ actions */
  function syncCollar(instant) {
    const target = S.air ? 1.3 : 0;
    O.hole.material.color.set(S.air ? 0x050505 : 0x8a6d2e);
    if (instant) O.collar.rotation.y = target; else VL.tween(0.4, k => { O.collar.rotation.y = O.collar.rotation.y + (target - O.collar.rotation.y) * k; });
  }
  const above = (p, dy) => [p[0], p[1] + dy, p[2]];
  const IN_FLAME = { pos: [FLAME_TIP[0] + 0.02, FLAME_TIP[1], FLAME_TIP[2]], rot: [0, 0.55, 0.32] };
  async function toFlame(hold) {
    await VL.move(O.tool, IN_FLAME.pos, IN_FLAME.rot, 0.9);
    S.loopAt = 'flame';
    await VL.wait(hold);
    S.loopAt = 'air';
  }
  async function toRest() { await VL.move(O.tool, above(O.rest.pos, 0.3), O.rest.rot, 0.7); await VL.move(O.tool, O.rest.pos, O.rest.rot, 0.3); S.loopAt = 'rest'; }
  async function ensureBurner() {
    if (!S.burner) { VL.toast(VL.t(L('أشعل الموقد أولاً (اضغط عليه)', 'Light the burner first (click it)'))); return false; }
    return true;
  }
  async function cleanLoop() {
    if (!(await ensureBurner())) return;
    const p = O.hcl.position, top = [p.x, 0.75, p.z], inside = [p.x, 0.2, p.z];
    await VL.move(O.tool, top, [0, 0.4, -1.1], 0.8);
    await VL.move(O.tool, inside, [0, 0.4, -1.1], 0.35);
    M.dipHCl(S.loop);
    await VL.move(O.tool, top, [0, 0.4, -1.1], 0.35);
    await VL.move(O.tool, IN_FLAME.pos, IN_FLAME.rot, 0.9);
    S.loopAt = 'flame';
    for (let i = 0; i < 40 && !M.loopClean(S.loop); i++) await VL.wait(0.1);
    await VL.wait(0.6);
    if (M.loopClean(S.loop)) { S.cleaned = true; S.loop.load = {}; }
    S.loopAt = 'air';
    await toRest();
    VL.toast(VL.t(M.loopClean(S.loop) ? L('السلك نظيف: لا لون في اللهب', 'Loop is clean: no colour in the flame') : L('ما زالت بقايا على السلك، نظّفه مرة أخرى', 'Some residue left, clean again')));
  }
  async function testSalt(k) {
    if (!(await ensureBurner())) return;
    const salt = k === 'X' ? S.unknown : k;
    const d = O.dishes[k].position, top = [d.x, 0.55, d.z], inside = [d.x, 0.07, d.z];
    const rot = [0, 0.2, -0.55];
    await VL.move(O.tool, top, rot, 0.8);
    await VL.move(O.tool, inside, rot, 0.35);
    M.dipLoop(S.loop, salt, S.naTrace);
    await VL.move(O.tool, top, rot, 0.35);
    await toFlame(3.4);
    if (S.air) S.tested.add(k);
    await toRest();
  }
  async function setCobalt(on) {
    S.cobalt = on;
    if (on) {
      const cam = VL.camera.position.clone(), f = new THREE.Vector3(...FLAME_TIP);
      const dir = cam.clone().sub(f).normalize(), p = f.clone().add(dir.multiplyScalar(1.05));
      const look = new THREE.Object3D(); look.position.copy(p); look.lookAt(cam);
      await VL.move(O.cobalt, p.toArray(), [look.rotation.x, look.rotation.y, look.rotation.z], 0.8);
    } else await VL.move(O.cobalt, O.cobaltHome, [0, 0, 0], 0.8);
    VL.renderControls();
  }

  /* ------------------------------------------------------------------ per-frame */
  const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
  function update(dt, t) {
    const inFlame = S.loopAt === 'flame' && S.burner;
    if (inFlame) M.heatLoop(S.loop, dt);
    const em = inFlame && S.air ? M.flameEmission(S.loop.load, { cobalt: S.cobalt }) : null;
    S.em = em;
    if (em && S.cobalt && (S.loop.load.KCl || 0) > 0.2) S.cobaltSeenK = true;

    const u = (m, col, alpha, wob) => {
      const U = m.material.uniforms; U.uTime.value = t; U.uWobble.value = wob;
      U.uColor.value.lerp(tmpC.set(col), Math.min(1, dt * 8)); U.uAlpha.value += (alpha - U.uAlpha.value) * Math.min(1, dt * 6);
    };
    const on = S.burner, cob = S.cobalt;
    // luminous (air closed) flame: soot glow; through cobalt glass mostly blocked
    const lumCol = em ? em.color : cob ? '#3b2a80' : '#ffad3a';
    u(O.lum, S.air ? '#000000' : (inFlame && Object.keys(S.loop.load).length ? '#ffb04a' : lumCol), on && !S.air ? (cob ? 0.35 : 0.95) : 0, 0.05);
    const outerCol = em && em.strength > 0.05 ? em.color : cob ? '#2a46ff' : '#3a6dff';
    const outerA = !on || !S.air ? 0 : em && em.strength > 0.05 ? 0.35 + 0.6 * em.strength : 0.32;
    u(O.outer, outerCol, outerA, 0.02 + (em ? 0.015 : 0));
    O.outer.scale.y = 1 + (em ? 0.25 * em.strength : 0);
    u(O.inner, cob ? '#5d7bff' : '#8fd0ff', on && S.air ? 0.85 : 0, 0.006);

    // sparks: rising coloured particles while a salt is in the flame
    const sp = O.sparks, pa = sp.geometry.attributes.position, seeds = sp.userData.seeds;
    const act = on && (em ? em.strength : !S.air ? 0.25 : 0);
    sp.material.opacity += ((act ? 0.85 : 0) - sp.material.opacity) * Math.min(1, dt * 5);
    if (act) sp.material.color.lerp(tmpC2.set(em ? em.color : '#ffb04a'), Math.min(1, dt * 8));
    for (let i = 0; i < seeds.length; i++) {
      const ph = (seeds[i] + t * (0.6 + seeds[i] * 0.5)) % 1;
      const a = seeds[i] * 40 + t * 2;
      pa.setXYZ(i, Math.sin(a) * 0.05 * (1 - ph) + Math.sin(t * 7 + i) * 0.01, 0.12 + ph * 0.75, Math.cos(a) * 0.05 * (1 - ph));
    }
    pa.needsUpdate = true;

    // light from the flame onto the bench
    const lc = em ? em.color : S.air ? '#5f86ff' : '#ffa040';
    O.light.color.lerp(tmpC.set(lc), Math.min(1, dt * 6));
    const li = on ? (S.air ? (em ? 0.6 + 1.6 * em.strength : 0.35) : 1.4) : 0;
    O.light.intensity += (li * (0.9 + 0.1 * Math.sin(t * 23)) - O.light.intensity) * Math.min(1, dt * 8);

    // hot nichrome glows orange in the flame
    const glow = inFlame ? 1 : 0, rm = O.loopRing.material;
    rm.emissive.lerp(tmpC.set(glow ? 0xff5a10 : 0x000000), Math.min(1, dt * (glow ? 2 : 1.2)));
  }

  /* ------------------------------------------------------------------ instrument: spectroscope */
  function drawSpectrum(cv) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x0 = 380, x1 = 780, Lm = 8, Rm = 8, top = 22, bandH = H - top - 34;
    const X = nm => Lm + (nm - x0) / (x1 - x0) * (W - Lm - Rm);
    g.fillStyle = '#05070a'; g.fillRect(0, 0, W, H);
    // reference continuum strip
    for (let nm = x0; nm <= x1; nm += 1) { const c = M.wavelengthToRGB(nm); g.fillStyle = `rgb(${c.map(v => Math.round(v * 255)).join(',')})`; g.fillRect(X(nm), 4, Math.ceil((W - Lm - Rm) / 400) + 1, 10); }
    const em = S.em, lines = [];
    if (em) lines.push(...em.lines);
    else if (S.burner && S.air) lines.push({ nm: 431, I: 0.18, kind: 'band', w: 6 }, { nm: 516, I: 0.12, kind: 'band', w: 8 }); // CH* and C2* (Swan) in a blue flame
    if (S.burner && !S.air) { // soot: continuous glow, stronger to the red
      for (let nm = x0; nm <= x1; nm += 2) { const c = M.wavelengthToRGB(nm), a = 0.55 * Math.pow((nm - x0) / (x1 - x0), 1.6) * (S.cobalt ? M.cobaltT(nm) : 1); g.fillStyle = `rgba(${c.map(v => Math.round(v * 255)).join(',')},${a})`; g.fillRect(X(nm), top, X(nm + 2) - X(nm) + 1, bandH); }
    }
    for (const l of lines) {
      const c = M.wavelengthToRGB(l.nm).map(v => Math.round(Math.min(1, v * 1.15) * 255)).join(',');
      if (l.kind === 'band') {
        const grd = g.createLinearGradient(X(l.nm - l.w), 0, X(l.nm + l.w), 0);
        grd.addColorStop(0, `rgba(${c},0)`); grd.addColorStop(0.5, `rgba(${c},${Math.min(1, l.I)})`); grd.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = grd; g.fillRect(X(l.nm - l.w), top, X(l.nm + l.w) - X(l.nm - l.w), bandH);
      } else {
        g.fillStyle = `rgba(${c},${Math.min(1, 0.25 + l.I)})`; g.fillRect(X(l.nm) - 1.5, top, 3, bandH);
        g.fillStyle = `rgba(${c},${0.25 * l.I})`; g.fillRect(X(l.nm) - 5, top, 10, bandH);
      }
    }
    if (S.cobalt) {
      g.strokeStyle = 'rgba(140,170,255,.85)'; g.setLineDash([4, 3]); g.beginPath();
      for (let nm = x0; nm <= x1; nm += 4) { const y = top + bandH - M.cobaltT(nm) * bandH * 0.95; nm === x0 ? g.moveTo(X(nm), y) : g.lineTo(X(nm), y); }
      g.stroke(); g.setLineDash([]);
    }
    g.fillStyle = '#9aa7b3'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'center'; g.direction = 'ltr';
    for (let nm = 400; nm <= 750; nm += 50) { g.fillText(String(nm), X(nm), H - 18); g.fillRect(X(nm), top + bandH, 1, 4); }
    g.fillText('λ (nm)', W / 2, H - 4);
    const strong = lines.filter(l => l.I > 0.3 && l.kind !== 'band').sort((a, b) => b.I - a.I).slice(0, 3);
    g.fillStyle = '#e8eef3';
    for (const l of strong) g.fillText(l.nm.toFixed(1), X(l.nm), top + 12);
  }

  function instrument() {
    const em = S.em, dom = em && em.dominant, ld = Object.entries(S.loop.load).filter(([, v]) => v > 0.03).map(([k]) => FORM[k]).join(' + ');
    const saltOf = c => ORDER.find(k => M.SALTS[k].cation === c);
    const col = !S.burner ? L('مطفأ', 'off') : !S.air ? L('أصفر مضيء (soot)', 'luminous yellow (soot)') : em ? (dom ? COLOR_NAME[saltOf(dom)] : L('—', '—')) : L('أزرق (CH و C₂)', 'blue (CH, C₂)');
    const sw = em ? `<span class="swatch" style="background:${em.color}"></span>` : '';
    return {
      title: L('Spectroscope · طيف اللهب', 'Spectroscope · flame spectrum'),
      badge: S.cobalt ? { cls: 'warn', text: L('عبر زجاج الكوبالت', 'through cobalt glass') } : null,
      draw: cv => drawSpectrum(cv),
      readouts: [
        [L('لون اللهب', 'Flame colour'), sw + VL.t(col)],
        [L('العنصر الغالب', 'Dominant emitter'), dom || '—'],
        [L('الخطوط الرئيسية', 'Key lines'), dom ? LINE_NOTE[dom] : '—', true],
        [L('على السلك', 'On the loop'), ld || VL.t(L('نظيف', 'clean'))],
        [L('تلوّث Na', 'Na traces'), VL.t(S.naTrace ? L('مفعّل', 'on') : L('مطفأ', 'off'))],
      ],
      note: L('مواضع الخطوط الذرية قيم مرجعية ثابتة. مواضع الحزم الجزيئية (CaOH، SrOH، CuCl) تقريبية، والشدات للعرض فقط.',
        'Atomic line positions are reference values. Molecular band positions (CaOH, SrOH, CuCl) are approximate; intensities are for display only.'),
    };
  }

  /* ------------------------------------------------------------------ side-panel controls */
  function controls(el) {
    el.innerHTML = `
      <label class="inline"><input type="checkbox" id="fNa" ${S.naTrace ? 'checked' : ''}> ${VL.t(L('تلوّث واقعي بآثار Na', 'Realistic Na contamination'))}</label>
      <div class="row"><button id="fCobalt" class="${S.cobalt ? 'pri' : ''}">${VL.t(S.cobalt ? L('أبعد زجاج الكوبالت', 'Remove cobalt glass') : L('انظر عبر زجاج الكوبالت', 'View through cobalt glass'))}</button>
      <button id="fClean">${VL.t(L('نظّف السلك', 'Clean loop'))}</button></div>
      <label>${VL.t(L('اختبر ملحاً', 'Test a salt'))}
        <div class="row"><select id="fSalt">${[...ORDER, 'X'].map(k => `<option value="${k}">${FORM[k]} · ${VL.t(NAME[k])}</option>`).join('')}</select><button id="fTest">${VL.t(L('اختبر', 'Test'))}</button></div></label>
      <label>${VL.t(L('إجابتك عن العيّنة المجهولة', 'Your answer for the unknown'))}
        <div class="row"><select id="fAns"><option value="">—</option>${ORDER.map(k => `<option value="${k}" ${S.answer === k ? 'selected' : ''}>${FORM[k]}</option>`).join('')}</select>
        <button id="fCheck">${VL.t(L('تحقّق', 'Check'))}</button><button id="fNew" class="ghost">${VL.t(L('عيّنة جديدة', 'New unknown'))}</button></div></label>
      <p class="note" id="fRes">${S.answered ? resultText() : ''}</p>`;
    const $ = s => el.querySelector(s);
    $('#fNa').onchange = e => { S.naTrace = e.target.checked; };
    $('#fCobalt').onclick = () => VL.run(() => setCobalt(!S.cobalt));
    $('#fClean').onclick = () => VL.run(cleanLoop);
    $('#fTest').onclick = () => VL.run(() => testSalt($('#fSalt').value));
    $('#fAns').onchange = e => { S.answer = e.target.value; };
    $('#fCheck').onclick = () => { if (!S.answer) return; S.answered = true; S.correct = S.answer === S.unknown; $('#fRes').textContent = resultText(); VL.checkStep(true); };
    $('#fNew').onclick = () => { const s = freshState(); S.unknown = s.unknown; S.answer = ''; S.answered = false; S.correct = false; S.tested.delete('X'); VL.renderControls(); VL.checkStep(true); };
  }
  function resultText() {
    return S.correct ? VL.t(L(`صحيح: إنها ${FORM[S.unknown]}.`, `Correct: it is ${FORM[S.unknown]}.`))
      : VL.t(L(`ليست ${FORM[S.answer]}. نظّف السلك وأعد الاختبار وقارن الخطوط.`, `Not ${FORM[S.answer]}. Clean the loop, test again and compare the lines.`));
  }

  /* ------------------------------------------------------------------ steps */
  const steps = [
    { title: L('أشعل موقد Bunsen', 'Light the Bunsen burner'),
      text: L('اضغط على الموقد. فتحة الهواء مغلقة، فيظهر لهب أصفر مضيء.', 'Click the burner. With the air hole closed the flame is yellow and luminous.'),
      conf: ['fact'], target: () => O.burner, done: () => S.burner, auto: async () => { S.burner = true; syncCollar(); await VL.wait(0.6); } },
    { title: L('افتح فتحة الهواء', 'Open the air hole'),
      text: L('اضغط على الطوق النحاسي (collar). بالهواء يكتمل الاحتراق فيصير اللهب أزرق وأسخن. الأصفر سببه جزيئات soot متوهجة، وهو يغطي ألوان الأملاح، ولذلك نعمل باللهب الأزرق.',
        'Click the brass collar. With air, combustion is complete: the flame turns blue and hotter. The yellow came from glowing soot, which would hide the salt colours, so we test in the blue flame.'),
      conf: ['fact'], target: () => O.collar, done: () => S.burner && S.air, auto: async () => { S.burner = true; S.air = true; syncCollar(); await VL.wait(0.6); } },
    { title: L('نظّف السلك', 'Clean the wire loop'),
      text: L('اضغط على كأس HCl المخفف: يُغمس السلك ثم يُسخَّن حتى يختفي أي لون. الـ HCl يحوّل البقايا إلى chlorides متطايرة تحترق بسرعة.',
        'Click the dilute HCl beaker: the loop is dipped, then heated until no colour remains. HCl turns residues into volatile chlorides that burn off quickly.'),
      conf: ['fact'], target: () => O.hcl, done: () => S.cleaned, auto: cleanLoop },
    { title: L('اختبر NaCl', 'Test NaCl'),
      text: L('اضغط على طبق NaCl. لون أصفر-برتقالي قوي من خطّي Na D عند 589.0 و 589.6 nm، كما في الـ spectroscope.',
        'Click the NaCl dish. The intense yellow-orange comes from the Na D lines at 589.0 and 589.6 nm, shown in the spectroscope.'),
      conf: ['fact'], target: () => O.dishes.NaCl, done: () => S.tested.has('NaCl'), auto: () => testSalt('NaCl') },
    { title: L('نظّف ثم اختبر KCl', 'Clean, then test KCl'),
      text: L('لهب K بنفسجي فاتح وباهت: خطّاه الرئيسيان عند 766.5 و 769.9 nm في الأحمر العميق حيث حساسية العين ضعيفة، ومعهما خط بنفسجي ضعيف قرب 404 nm. أي أثر من Na يغطيه بالأصفر: قارن مع خيار «تلوّث Na» وبدونه.',
        'K gives a faint lilac: its main lines at 766.5 and 769.9 nm sit in the deep red where the eye is weak, plus a weak violet line near 404 nm. Any trace of Na swamps it with yellow: compare with the Na-contamination option on and off.'),
      conf: ['fact'], target: () => O.dishes.KCl, done: () => S.tested.has('KCl'), auto: async () => { await cleanLoop(); await testSalt('KCl'); } },
    { title: L('انظر إلى K عبر زجاج الكوبالت', 'View K through cobalt glass'),
      text: L('ضع زجاج الكوبالت أمام اللهب ثم اختبر KCl. الزجاج يمتص الأصفر (589 nm) ويمرّر البنفسجي والأحمر العميق، فيظهر لون K رغم تلوّث Na. انظر منحنى النفاذية المتقطع في الطيف.',
        'Put the cobalt glass in front of the flame, then test KCl. The glass absorbs the 589 nm yellow and passes violet and deep red, so K shows through despite Na traces. See the dashed transmission curve.'),
      conf: ['fact'], target: () => S.cobalt ? O.dishes.KCl : O.cobalt, done: () => S.cobaltSeenK,
      auto: async () => { if (!S.cobalt) await setCobalt(true); await testSalt('KCl'); } },
    { title: L('اختبر CuCl₂ وباقي الأملاح', 'Test CuCl₂ and the others'),
      text: L('CuCl₂ يعطي أزرق-مخضر: خطوط Cu الخضراء بين 510 و 522 nm وحزم CuCl الزرقاء. جرّب أيضاً LiCl (أحمر قرمزي، 670.8 nm) و CaCl₂ (أحمر طوبي) و SrCl₂ (قرمزي) و BaCl₂ (أخضر فاتح).',
        'CuCl₂ gives blue-green: green Cu lines between 510 and 522 nm plus blue CuCl bands. Also try LiCl (crimson, 670.8 nm), CaCl₂ (brick red), SrCl₂ (crimson) and BaCl₂ (pale green).'),
      conf: ['fact', 'inf'], target: () => O.dishes.CuCl2, done: () => S.tested.has('CuCl2'),
      auto: async () => { if (S.cobalt) await setCobalt(false); await cleanLoop(); await testSalt('CuCl2'); } },
    { title: L('حدّد الملح المجهول', 'Identify the unknown'),
      text: L('الطبق «?» يحوي أحد الأملاح السبعة. نظّف السلك، اختبره، قارن اللون والطيف، ثم اختر إجابتك من اللوحة.',
        'The "?" dish holds one of the seven salts. Clean the loop, test it, compare colour and spectrum, then pick your answer in the panel.'),
      conf: [], target: () => O.dishes.X, done: () => S.answered && S.correct,
      auto: async () => { if (S.cobalt) await setCobalt(false); await cleanLoop(); await testSalt('X'); S.answer = S.unknown; S.answered = true; S.correct = true; VL.renderControls(); } },
  ];

  function relabel() { O.poster.material.map.needsUpdate = true; }

  VL.lessons.flame = { id: 'flame', steps, build, update, instrument, controls, relabel, dispose() { if (S && S.cobalt) S.cobalt = false; } };
})();

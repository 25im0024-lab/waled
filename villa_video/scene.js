import * as THREE from 'three';

// ============================================================ setup
const W = 1920, H = 1080, DUR = 30;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 1, 2500);

let seed = 12345;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rr = (a, b) => a + (b - a) * rnd();
const clamp01 = x => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eInOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eOut = x => 1 - Math.pow(1 - x, 3);
const eBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

// ============================================================ textures
function canvasTex(w, h, draw, rep = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(x, w, h, n, cols, amax = .12, smax = 3) {
  for (let i = 0; i < n; i++) {
    x.globalAlpha = rr(.02, amax); x.fillStyle = cols[(rnd() * cols.length) | 0];
    const s = rr(1, smax); x.fillRect(rnd() * w, rnd() * h, s, s);
  }
  x.globalAlpha = 1;
}
const texPlaster = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#ece7dd'; x.fillRect(0, 0, w, h); speckle(x, w, h, 9000, ['#ffffff', '#b8b0a2', '#d8cfbf'], .10, 3); });
const texConcrete = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#9b9a95'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { x.globalAlpha = .05; x.fillStyle = rnd() < .5 ? '#6f6e6a' : '#bdbcb6'; x.beginPath(); x.arc(rnd() * w, rnd() * h, rr(15, 60), 0, 7); x.fill(); }
  speckle(x, w, h, 12000, ['#55544f', '#d0cfc9'], .15, 3);
});
const texStone = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#4a4d52'; x.fillRect(0, 0, w, h); speckle(x, w, h, 5000, ['#2c2e32', '#7a7d82'], .2, 3); });
const texWood = canvasTex(256, 256, (x, w, h) => {
  const cols = ['#8a5a36', '#7d4f2e', '#946238', '#85563a', '#9a6a40'];
  for (let i = 0; i < 8; i++) {
    x.fillStyle = cols[(rnd() * cols.length) | 0]; x.fillRect(i * 32, 0, 32, h);
    for (let k = 0; k < 16; k++) { x.globalAlpha = rr(.05, .22); x.fillStyle = rnd() < .5 ? '#3d2412' : '#c08a5c'; x.fillRect(i * 32 + rnd() * 30, 0, rr(.6, 1.6), h); }
    x.globalAlpha = 1; x.fillStyle = 'rgba(25,12,5,.75)'; x.fillRect(i * 32, 0, 1.6, h);
  }
});
const texDeck = canvasTex(256, 256, (x, w, h) => {
  const cols = ['#a77a52', '#9a6e48', '#b38558', '#a07450'];
  for (let i = 0; i < 8; i++) {
    x.fillStyle = cols[(rnd() * cols.length) | 0]; x.fillRect(0, i * 32, w, 32);
    for (let k = 0; k < 14; k++) { x.globalAlpha = rr(.05, .18); x.fillStyle = rnd() < .5 ? '#3d2412' : '#d9a878'; x.fillRect(0, i * 32 + rnd() * 30, w, rr(.6, 1.4)); }
    x.globalAlpha = 1; x.fillStyle = 'rgba(25,12,5,.7)'; x.fillRect(0, i * 32, w, 1.6);
  }
});
function tileDraw(bump) {
  return (x, w, h) => {
    const cols = ['#b4532e', '#a8482a', '#bf5b34', '#9f4326', '#b85a36', '#ab4f2c'];
    x.fillStyle = bump ? '#303030' : '#5a2412'; x.fillRect(0, 0, w, h);
    const tw = 64, th = 64;
    for (let r = 0; r < 8; r++) for (let c = -1; c < 9; c++) {
      const ox = c * tw + (r % 2) * (tw / 2), oy = r * th;
      let g = x.createLinearGradient(0, oy, 0, oy + th);
      if (bump) { g.addColorStop(0, '#d0d0d0'); g.addColorStop(.85, '#8a8a8a'); g.addColorStop(1, '#202020'); }
      else {
        const col = cols[(rnd() * cols.length) | 0]; g.addColorStop(0, col); g.addColorStop(.8, col); g.addColorStop(1, '#5e2612');
      }
      x.fillStyle = g; x.fillRect(ox + 2, oy + 1, tw - 4, th - 2);
      if (!bump) {
        x.globalAlpha = .18; x.fillStyle = '#fff'; x.fillRect(ox + 8, oy + 3, 10, th - 18); x.globalAlpha = 1;
        x.fillStyle = 'rgba(40,14,6,.55)'; x.fillRect(ox, oy, 2.5, th); x.fillRect(ox + tw - 2.5, oy, 2.5, th);
      }
    }
    if (!bump) speckle(x, w, h, 6000, ['#3a1608', '#d08a60'], .12, 2);
  };
}
const texTile = canvasTex(512, 512, tileDraw(false));
const texTileBump = canvasTex(512, 512, tileDraw(true), [1, 1], false);
const texGrass = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#6b9a3c'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) { x.globalAlpha = rr(.05, .2); x.fillStyle = rnd() < .5 ? '#2f5a1f' : '#78a64a'; x.beginPath(); x.arc(rnd() * w, rnd() * h, rr(6, 30), 0, 7); x.fill(); }
  x.globalAlpha = 1; for (let i = 0; i < 16000; i++) { x.globalAlpha = rr(.1, .35); x.strokeStyle = rnd() < .5 ? '#2d5a1c' : '#8db85a'; const px = rnd() * w, py = rnd() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + rr(-2, 2), py - rr(3, 8)); x.stroke(); }
  x.globalAlpha = 1;
});
const texDirt = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#8a6a48'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { x.globalAlpha = rr(.05, .18); x.fillStyle = rnd() < .5 ? '#5b4129' : '#b08e66'; x.beginPath(); x.arc(rnd() * w, rnd() * h, rr(4, 36), 0, 7); x.fill(); }
  speckle(x, w, h, 14000, ['#3a2a1a', '#cdb08a', '#6e5238'], .25, 3);
});
const texPave = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#b3b0aa'; x.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) {
    const ox = c * 128 + (r % 2) * 64, oy = r * 64; x.fillStyle = `hsl(35,6%,${66 + rnd() * 10}%)`; x.fillRect(ox + 2, oy + 2, 124, 60);
  }
  speckle(x, w, h, 6000, ['#555', '#fff'], .1, 2);
});
const texAsphalt = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#34363a'; x.fillRect(0, 0, w, h); speckle(x, w, h, 9000, ['#1b1c1e', '#6a6c70'], .25, 2); });
const texSlat = canvasTex(128, 128, (x, w, h) => {
  x.fillStyle = '#3b3e43'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 12; i++) { const g = x.createLinearGradient(0, i * 128 / 12, 0, (i + 1) * 128 / 12); g.addColorStop(0, '#50545a'); g.addColorStop(.85, '#3a3d42'); g.addColorStop(1, '#16171a'); x.fillStyle = g; x.fillRect(0, i * 128 / 12, w, 128 / 12 - 1); }
});
const texWater = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#2ab4d4'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { x.globalAlpha = rr(.05, .18); x.strokeStyle = '#d6f6ff'; x.lineWidth = rr(1, 3); x.beginPath(); const y0 = rnd() * h, a = rr(3, 9), f = rr(.02, .05); for (let px = 0; px <= w; px += 4) x.lineTo(px, y0 + Math.sin(px * f * 6.28 + i) * a); x.stroke(); }
  x.globalAlpha = 1;
});
const texLeaf = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#3f7a2c'; x.fillRect(0, 0, w, h); speckle(x, w, h, 9000, ['#1f4a14', '#7fb352', '#2c5e1c'], .35, 4); });

// ============================================================ materials
const mat = (o, s = 0.5) => { const m = new THREE.MeshStandardMaterial(o); m.userData.s = s; return m; };
const mPlaster = mat({ map: texPlaster, roughness: .92 }, .5);
const mWood = mat({ map: texWood, roughness: .6 }, 1);
const mConcrete = mat({ map: texConcrete, roughness: .95 }, .33);
const mStone = mat({ map: texStone, roughness: .8 }, .5);
const mFrame = mat({ color: 0x23272c, roughness: .45, metalness: .5 });
const mSteel = mat({ color: 0x8a9096, roughness: .45, metalness: .8 });
const mDark = mat({ color: 0x1a1c1f, roughness: .6, metalness: .2 });
const mWhite = mat({ color: 0xf3f1ec, roughness: .8 });
const mSill = mat({ color: 0xcfcdc7, roughness: .85 });
const mGlass = new THREE.MeshPhysicalMaterial({ color: 0xa9c4d4, roughness: .03, metalness: 0, transparent: true, opacity: .30, envMapIntensity: 1.6, side: THREE.DoubleSide });
const mPanel = new THREE.MeshBasicMaterial({ color: 0x14181d });
const mSoil = mat({ map: texDirt, roughness: 1 });
const mRebar = mat({ color: 0x4a3326, roughness: .7, metalness: .6 });
const mYellow = mat({ color: 0xf2b01e, roughness: .55, metalness: .35 });
const mRoof = mat({ map: texTile, bumpMap: texTileBump, bumpScale: 4, roughness: .85 });
const mTimber = mat({ color: 0x9a7048, roughness: .8 });
const mRidge = mat({ color: 0x8f3e22, roughness: .8 });

// ============================================================ scene helpers
const anims = [];
function A(obj, a, b, mode = 'scaleY', o = {}) { obj.userData.__a = obj.userData.__a || []; obj.userData.__a.push({ a, b, mode, ...o }); if (!anims.includes(obj)) anims.push(obj); return obj; }
function applyAnim(obj, t) {
  const list = obj.userData.__a.slice().sort((p, q) => p.a - q.a);
  let an = null; for (const x of list) if (t >= x.a) an = x;
  let p = 0; if (!an) { an = list[0]; p = 0; if (an.rev) p = 1; } else { p = clamp01((t - an.a) / (an.b - an.a)); if (an.rev) p = 1 - p; }
  const e = (an.ease || eInOut)(p); const ud = obj.userData;
  const s = Math.max(e, 1e-4);
  switch (an.mode) {
    case 'scaleY': obj.scale.y = s; obj.visible = an.keep ? true : (p > 1e-3); break;
    case 'scaleX': obj.scale.x = s; obj.visible = p > 1e-3; break;
    case 'scaleZ': obj.scale.z = s; obj.visible = p > 1e-3; break;
    case 'scaleAll': obj.scale.setScalar(s); obj.visible = p > 1e-3; break;
    case 'pop': { const v = Math.max(eBack(p), 1e-4); obj.scale.setScalar(v); obj.visible = p > 1e-3; break; }
    case 'dropY': obj.position.y = ud.y0 + (1 - e) * an.h; obj.visible = p > 1e-3; break;
    case 'slideX': obj.position.x = ud.x0 + (1 - e) * an.d; obj.visible = p > 1e-3; break;
    case 'slideZ': obj.position.z = ud.z0 + (1 - e) * an.d; obj.visible = p > 1e-3; break;
    case 'show': obj.visible = p > .5; break;
  }
}
function box(w, h, d, m, x = 0, y = 0, z = 0, cast = true, recv = true) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (m.map && m.userData.s) wuv(g, x, y, z, m.userData.s);
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.castShadow = cast; me.receiveShadow = recv; return me;
}
function wuv(geo, ox, oy, oz, su) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + ox, y = p.getY(i) + oy, z = p.getZ(i) + oz;
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, x * su, z * su); else if (ax >= az) uv.setXY(i, z * su, y * su); else uv.setXY(i, x * su, y * su);
  }
  uv.needsUpdate = true;
}
function cyl(r, h, m, x, y, z, seg = 10) { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me; }
function between(p0, p1, r, m) { // thin cylinder between two points
  const d = new THREE.Vector3().subVectors(p1, p0), L = d.length();
  const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 6), m);
  me.position.copy(p0).addScaledVector(d, .5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  me.castShadow = true; return me;
}
function pivotAt(obj, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); g.userData.x0 = x; g.userData.y0 = y; g.userData.z0 = z; g.add(obj); scene.add(g); return g; }

// ============================================================ sky, lights, ground
const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() } };
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec3 vD; uniform vec3 top,hor,sunCol,sunDir;
  void main(){ vec3 d=normalize(vD); float h=max(d.y,0.); vec3 c=mix(hor,top,pow(h,.45));
   float s=max(dot(d,normalize(sunDir)),0.); c+=sunCol*(pow(s,900.)*6.+pow(s,14.)*.22+pow(s,3.)*.05);
   if(d.y<0.) c=hor*.9; gl_FragColor=vec4(c,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), skyMat); sky.frustumCulled = false; scene.add(sky);
scene.fog = new THREE.Fog(0xbfd4e6, 110, 520);

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 260 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.06; sun.shadow.radius = 3;
scene.add(sun); scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x6b5a45, .7); scene.add(hemi);

// env for reflections from a static sky
{
  const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene();
  skyU.top.value.set(0x4f8fd6); skyU.hor.value.set(0xdbe8f2); skyU.sunDir.value.set(.4, .7, .6); skyU.sunCol.value.set(1, .95, .85);
  const m2 = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat); es.add(m2);
  const g2 = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5f7f48 })); g2.position.y = -2; es.add(g2);
  scene.environment = pm.fromScene(es, 0, 1, 2000).texture; scene.environmentIntensity = .5;
}

{
  const s = new THREE.Shape(); s.moveTo(-1500, -1500); s.lineTo(1500, -1500); s.lineTo(1500, 1500); s.lineTo(-1500, 1500); s.lineTo(-1500, -1500);
  const hole = new THREE.Path(); hole.moveTo(-8.8, -5.3); hole.lineTo(-8.8, 5.3); hole.lineTo(6.8, 5.3); hole.lineTo(6.8, -5.3); hole.lineTo(-8.8, -5.3); s.holes.push(hole);
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 6, p.getZ(i) / 6);
  const gm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: texGrass, roughness: 1, color: 0xd6e6b8 })); gm.position.y = -.03; gm.receiveShadow = true; scene.add(gm);
}

// plot dirt with pit hole
const PX0 = -32, PX1 = 32, PZ0 = -26, PZ1 = 32;
{
  const s = new THREE.Shape(); s.moveTo(PX0, PZ0); s.lineTo(PX1, PZ0); s.lineTo(PX1, PZ1); s.lineTo(PX0, PZ1); s.lineTo(PX0, PZ0);
  const hole = new THREE.Path(); const hx0 = -8.8, hx1 = 6.8, hz0 = -5.3, hz1 = 5.3;
  hole.moveTo(hx0, hz0); hole.lineTo(hx0, hz1); hole.lineTo(hx1, hz1); hole.lineTo(hx1, hz0); hole.lineTo(hx0, hz0); s.holes.push(hole);
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 8, p.getZ(i) / 8);
  const dirt = new THREE.Mesh(g, mSoil); dirt.position.y = 0.0; dirt.receiveShadow = true; scene.add(dirt);
  // pit
  const pit = new THREE.Group();
  const pf = box(15.6, .1, 10.6, mSoil, -1, -1.15, 0); pit.add(pf);
  for (const [w, d, x, z] of [[15.6, .1, -1, 5.3], [15.6, .1, -1, -5.3]]) { const m = box(w, 1.2, d, mSoil, x, -.6, z); pit.add(m); }
  for (const x of [-8.8, 6.8]) pit.add(box(.1, 1.2, 10.6, mSoil, x, -.6, 0));
  pit.position.y = 0; scene.add(pit); A(pit, 2.7, 5.0, 'scaleY', { keep: true });
  pit.userData.__a[0].ease = eInOut;
}

// ============================================================ foundation
const plinth = pivotAt(box(17, 1.4, 10, mConcrete, 0, .7, 0), -1, -1.2, 0); A(plinth, 6.0, 7.8, 'scaleY');
const cap = pivotAt(box(16, .3, 11, mConcrete, 0, .15, 0), -1, .2, 0); A(cap, 7.7, 8.5, 'scaleY');
{
  const rb = new THREE.Group();
  for (let i = 0; i <= 20; i++) rb.add(between(new THREE.Vector3(-8.4, -.85, -4.9 + i * .49), new THREE.Vector3(6.4, -.85, -4.9 + i * .49), .025, mRebar));
  for (let i = 0; i <= 30; i++) rb.add(between(new THREE.Vector3(-8.4 + i * .49, -.8, -4.9), new THREE.Vector3(-8.4 + i * .49, -.8, 4.9), .025, mRebar));
  rb.position.y = 0; rb.userData.y0 = 0; scene.add(rb); A(rb, 5.0, 5.8, 'dropY', { h: 2.5 }); 
}

// ============================================================ walls
function buildWall({ len, h, t = .3, openings = [], breaksU = [], breaksV = [], matFn }) {
  const g = new THREE.Group();
  const us = [...new Set([0, len, ...openings.flatMap(o => [o.u0, o.u1]), ...breaksU])].sort((a, b) => a - b);
  for (let i = 0; i < us.length - 1; i++) {
    const ua = us[i], ub = us[i + 1]; if (ub - ua < 1e-3) continue;
    const blocks = openings.filter(o => o.u0 <= ua + 1e-6 && o.u1 >= ub - 1e-6).map(o => [o.v0, o.v1]).sort((a, b) => a[0] - b[0]);
    let cur = 0; const segs = [];
    for (const [v0, v1] of blocks) { if (v0 > cur + 1e-3) segs.push([cur, v0]); cur = Math.max(cur, v1); }
    if (cur < h - 1e-3) segs.push([cur, h]);
    for (const [a0, a1] of segs) {
      const vs = [...new Set([a0, a1, ...breaksV.filter(v => v > a0 + 1e-3 && v < a1 - 1e-3)])].sort((a, b) => a - b);
      for (let j = 0; j < vs.length - 1; j++) {
        const m = matFn(ua, ub, vs[j], vs[j + 1]);
        g.add(box(ub - ua, vs[j + 1] - vs[j], t, m, (ua + ub) / 2 - len / 2, (vs[j] + vs[j + 1]) / 2, 0));
      }
    }
  }
  return g;
}
function placeWall(o) {
  const frame = new THREE.Group(); frame.position.set(o.x, o.y0, o.z); frame.rotation.y = o.rotY;
  const piv = new THREE.Group(); piv.add(buildWall(o)); frame.add(piv); scene.add(frame);
  return { frame, piv, len: o.len, h: o.h };
}
const wallMat = (woodUntil = -1, base = true) => (ua, ub, va, vb) => (base && vb <= 0.46 ? mStone : (ub <= woodUntil ? mWood : mPlaster));

const walls = [];
const G0 = .5, G1 = 4.0; // floor bases
const front0 = placeWall({ x: -1, z: 4.35, rotY: 0, y0: G0, len: 14, h: 3.2, openings: [
  { u0: 1.5, u1: 5.5, v0: 0, v1: 2.6 }, { u0: 6.2, u1: 7.8, v0: .6, v1: 2.8 }, { u0: 8.7, u1: 9.9, v0: 0, v1: 2.5 }, { u0: 10.8, u1: 13.6, v0: .15, v1: 2.9 }], breaksV: [.45], matFn: wallMat() });
const right0 = placeWall({ x: 5.85, z: 0, rotY: Math.PI / 2, y0: G0, len: 8.4, h: 3.2, openings: [{ u0: 1, u1: 3.6, v0: .4, v1: 2.8 }, { u0: 5, u1: 6.6, v0: .7, v1: 2.7 }], breaksV: [.45], matFn: wallMat() });
const back0 = placeWall({ x: -1, z: -4.35, rotY: Math.PI, y0: G0, len: 14, h: 3.2, openings: [{ u0: 1.5, u1: 4.5, v0: .9, v1: 2.7 }, { u0: 6, u1: 7.4, v0: .9, v1: 2.7 }, { u0: 9, u1: 11, v0: 1.6, v1: 2.7 }], breaksV: [.45], matFn: wallMat() });
const left0 = placeWall({ x: -7.85, z: 0, rotY: -Math.PI / 2, y0: G0, len: 8.4, h: 3.2, openings: [{ u0: 2, u1: 4, v0: 1, v1: 2.7 }], breaksV: [.45], matFn: wallMat() });
const front1 = placeWall({ x: 1.5, z: 4.35, rotY: 0, y0: G1, len: 9, h: 3, openings: [{ u0: 1, u1: 2.6, v0: .8, v1: 2.4 }, { u0: 4.8, u1: 8.4, v0: .2, v1: 2.7 }], breaksU: [3.5], matFn: wallMat(3.5, false) });
const right1 = placeWall({ x: 5.85, z: 0, rotY: Math.PI / 2, y0: G1, len: 8.4, h: 3, openings: [{ u0: 1, u1: 3, v0: .8, v1: 2.5 }, { u0: 4.6, u1: 7.2, v0: .4, v1: 2.6 }], matFn: wallMat(-1, false) });
const back1 = placeWall({ x: 1.5, z: -4.35, rotY: Math.PI, y0: G1, len: 9, h: 3, openings: [{ u0: 1.2, u1: 3, v0: .8, v1: 2.5 }, { u0: 4, u1: 6.5, v0: .5, v1: 2.6 }, { u0: 7.4, u1: 8.4, v0: 1.2, v1: 2.5 }], matFn: wallMat(-1, false) });
const left1 = placeWall({ x: -2.85, z: 0, rotY: -Math.PI / 2, y0: G1, len: 8.4, h: 3, openings: [{ u0: 1.5, u1: 4.5, v0: 0, v1: 2.6 }, { u0: 5.5, u1: 7.2, v0: 1, v1: 2.5 }], matFn: wallMat(-1, false) });
// timing: ground floor staggered, then upper floor
[[back0, 8.7], [left0, 9.3], [right0, 10.0], [front0, 10.7]].forEach(([w, a]) => A(w.piv, a, a + 2.4, 'scaleY'));
[[back1, 14.1], [left1, 14.7], [right1, 15.4], [front1, 16.1]].forEach(([w, a]) => A(w.piv, a, a + 2.2, 'scaleY'));
// gable triangles
function gable(x) {
  const s = new THREE.Shape(); s.moveTo(-4.5, 0); s.lineTo(4.5, 0); s.lineTo(0, 1.8); s.lineTo(-4.5, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .3, bevelEnabled: false }); g.translate(0, 0, -.15); g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, mPlaster); m.castShadow = m.receiveShadow = true; return pivotAt(m, x, 7.0, 0);
}
const gR = gable(5.85), gL = gable(-2.85); A(gR, 17.0, 18.2, 'scaleY'); A(gL, 17.0, 18.2, 'scaleY');

// floor slab 2 (also terrace + ground roof)
const slab2 = pivotAt(box(16.6, .3, 9.6, mConcrete, 0, .15, 0), -1, 3.7, 0); A(slab2, 12.9, 14.0, 'scaleX');
slab2.userData.__a[0].mode = 'scaleY';

// ============================================================ roof
const ROOF_L = 10, EAVE_Y = 6.7, HALF = 5.2, RISE = 2.2, PHI = Math.atan2(RISE, HALF), SLOPE = Math.hypot(HALF, RISE), NSTR = 14, SD = SLOPE / NSTR;
const roofGroup = new THREE.Group(); scene.add(roofGroup);
for (const side of [1, -1]) for (let i = 0; i < NSTR; i++) {
  const g = new THREE.BoxGeometry(ROOF_L, .14, SD + .01); const p = g.attributes.position, uv = g.attributes.uv, s0 = i * SD;
  for (let k = 0; k < p.count; k++) uv.setXY(k, p.getX(k) / 2.4 + .3 * (i % 2), (p.getZ(k) + SD / 2 + s0) / 2.56 * -1 + 1000);
  // v should grow toward ridge: v = s_from_eave/2.56 where local +z points toward eave
  for (let k = 0; k < p.count; k++) uv.setXY(k, p.getX(k) / 2.4, (-(p.getZ(k)) + SD / 2 + s0) / 2.56);
  uv.needsUpdate = true;
  const me = new THREE.Mesh(g, mRoof); me.castShadow = me.receiveShadow = true;
  const sm = s0 + SD / 2;
  const grp = new THREE.Group(); me.position.set(0, 0, 0); grp.add(me);
  grp.position.set(1.5, EAVE_Y + sm * Math.sin(PHI), side * (HALF - sm * Math.cos(PHI)));
  if (side > 0) grp.rotation.x = PHI; else grp.rotation.set(-PHI, Math.PI, 0); grp.userData.y0 = grp.position.y;
  roofGroup.add(grp); A(grp, 19.3 + (i / NSTR) * 2.2 + (side < 0 ? .15 : 0), 19.3 + (i / NSTR) * 2.2 + .55, 'dropY', { h: 1.4, ease: eOut });
}
// rafters
for (const side of [1, -1]) for (let i = 0; i <= 11; i++) {
  const m = box(.07, .2, SLOPE, mTimber, 0, 0, 0); const grp = new THREE.Group(); grp.add(m);
  grp.position.set(-3.2 + i * .9 + 0 + 0.0 + 1.5 - 1.5, EAVE_Y + SLOPE / 2 * Math.sin(PHI) - .12, side * (HALF - SLOPE / 2 * Math.cos(PHI)));
  grp.rotation.x = side * PHI; scene.add(grp); A(grp, 18.2 + i * .05, 18.9 + i * .05, 'scaleAll');
}
{
  const rid = cyl(.15, ROOF_L + .1, mRidge, 1.5, EAVE_Y + RISE + .04, 0, 14); rid.rotation.z = Math.PI / 2; scene.add(rid); A(rid, 22.2, 22.9, 'scaleAll');
  for (const side of [1, -1]) {
    const f = box(ROOF_L + .1, .28, .06, mFrame, 1.5, EAVE_Y - .08, side * (HALF + .02)); scene.add(f); A(f, 22.4, 23, 'scaleX');
    for (const x of [-3.5, 6.5]) { const v = box(.07, .26, SLOPE + .05, mFrame, 0, 0, 0); const g = new THREE.Group(); g.add(v); g.position.set(x, EAVE_Y + SLOPE / 2 * Math.sin(PHI), side * (HALF - SLOPE / 2 * Math.cos(PHI))); g.rotation.x = side * PHI; scene.add(g); A(g, 22.6, 23.2, 'scaleAll'); }
  }
  const ch = pivotAt(box(.9, 2.4, .9, mPlaster, 0, 1.2, 0), 4.6, 7.9, -1.8); A(ch, 22.4, 23.2, 'scaleY');
  const chc = pivotAt(box(1.1, .12, 1.1, mStone, 0, .06, 0), 4.6, 10.3, -1.8); A(chc, 23.1, 23.5, 'pop');
}

// ============================================================ windows, doors, details
const glowPanels = [];
function makeWindow(w, h, o = {}) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w - .05, h - .05, .03), mGlass); glass.renderOrder = 2; g.add(glass);
  const pan = new THREE.Mesh(new THREE.PlaneGeometry(w - .06, h - .06), mPanel); pan.position.z = -.12; g.add(pan);
  const ft = .07;
  g.add(box(w, ft, .12, mFrame, 0, h / 2 - ft / 2, 0, true, false), box(w, ft, .12, mFrame, 0, -h / 2 + ft / 2, 0, true, false),
    box(ft, h, .12, mFrame, -w / 2 + ft / 2, 0, 0, true, false), box(ft, h, .12, mFrame, w / 2 - ft / 2, 0, 0, true, false));
  for (let i = 1; i <= (o.mull || 0); i++) g.add(box(.05, h, .1, mFrame, -w / 2 + w * i / (o.mull + 1), 0, 0, true, false));
  if (!o.door) g.add(box(w + .2, .07, .2, mSill, 0, -h / 2 - .035, .07, true, true));
  return g;
}
function addOpening(wall, o, tStart, opt = {}) {
  const w = o.u1 - o.u0, h = o.v1 - o.v0; const g = makeWindow(w, h, opt);
  g.position.set((o.u0 + o.u1) / 2 - wall.len / 2, (o.v0 + o.v1) / 2, 0); wall.frame.add(g); g.userData = {}; A(g, tStart, tStart + .7, 'pop');
}
const OP = (wall, list, t0, optList = []) => list.forEach((o, i) => addOpening(wall, o, t0 + i * .35, optList[i] || {}));
OP(front0, [{ u0: 6.2, u1: 7.8, v0: .6, v1: 2.8 }, { u0: 10.8, u1: 13.6, v0: .15, v1: 2.9 }], 22.6, [{ mull: 0 }, { mull: 2, door: true }]);
OP(right0, [{ u0: 1, u1: 3.6, v0: .4, v1: 2.8 }, { u0: 5, u1: 6.6, v0: .7, v1: 2.7 }], 23.1, [{ mull: 1 }, {}]);
OP(back0, [{ u0: 1.5, u1: 4.5, v0: .9, v1: 2.7 }, { u0: 6, u1: 7.4, v0: .9, v1: 2.7 }, { u0: 9, u1: 11, v0: 1.6, v1: 2.7 }], 23.3, [{ mull: 2 }, {}, { mull: 1 }]);
OP(left0, [{ u0: 2, u1: 4, v0: 1, v1: 2.7 }], 23.6, [{ mull: 1 }]);
OP(front1, [{ u0: 1, u1: 2.6, v0: .8, v1: 2.4 }, { u0: 4.8, u1: 8.4, v0: .2, v1: 2.7 }], 22.9, [{}, { mull: 2, door: true }]);
OP(right1, [{ u0: 1, u1: 3, v0: .8, v1: 2.5 }, { u0: 4.6, u1: 7.2, v0: .4, v1: 2.6 }], 23.5, [{ mull: 1 }, { mull: 1 }]);
OP(back1, [{ u0: 1.2, u1: 3, v0: .8, v1: 2.5 }, { u0: 4, u1: 6.5, v0: .5, v1: 2.6 }, { u0: 7.4, u1: 8.4, v0: 1.2, v1: 2.5 }], 23.7, [{}, { mull: 1 }, {}]);
OP(left1, [{ u0: 1.5, u1: 4.5, v0: 0, v1: 2.6 }, { u0: 5.5, u1: 7.2, v0: 1, v1: 2.5 }], 24.0, [{ mull: 2, door: true }, {}]);
// interior glow panels: share one material -> color animated in update()

// garage door
{
  const gd = new THREE.Mesh(new THREE.BoxGeometry(3.94, 2.58, .08), new THREE.MeshStandardMaterial({ map: texSlat, roughness: .5, metalness: .4 })); gd.castShadow = true;
  const gg = new THREE.Group(); gd.position.y = -1.29; gg.add(gd); gg.position.set(3.5 - 7, 2.6, .02); front0.frame.add(gg); gg.userData.y0 = 2.6; A(gg, 23.6, 24.8, 'scaleY');
  gg.scale.y = 1e-4;
  // front door
  const dr = new THREE.Group(); dr.add(box(1.04, 2.44, .08, mWood, 0, 0, 0)); dr.add(box(.04, 1.1, .05, mSteel, .38, 0, .08)); dr.add(box(.05, 2.44, .1, mFrame, -.55, 0, 0)); dr.add(box(.05, 2.44, .1, mFrame, .55, 0, 0)); dr.add(box(1.14, .05, .1, mFrame, 0, 1.22, 0));
  dr.position.set(9.3 - 7, 1.25, .02); front0.frame.add(dr); A(dr, 24.4, 25.0, 'pop');
}
// entrance canopy + columns + steps
{
  const can = pivotAt(box(5.6, .22, 2.4, mConcrete, 0, 0, 0), 3.0, 3.35, 5.7); A(can, 21.2, 22.0, 'scaleZ'); can.userData.__a[0].mode = 'scaleX';
  for (const x of [.4, 5.6]) { const c = pivotAt(cyl(.07, 3.2, mFrame, 0, 1.6, 0), x, .5, 6.7); A(c, 21.8, 22.5, 'scaleY'); }
  const st = new THREE.Group(); for (let i = 0; i < 3; i++) { const h = .5 - i * .17; st.add(box(2.6, h, .45, mConcrete, 0, h / 2, .45 * i + .22)); }
  scene.add(st);
  st.position.set(1.3, 0, 4.5); st.userData.y0 = 0; A(st, 22.0, 22.6, 'scaleY');
}
// balcony + railing
function railing(x0, z0, x1, z1, y, tStart) {
  const L = Math.hypot(x1 - x0, z1 - z0), g = new THREE.Group(); g.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); g.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  const gl = new THREE.Mesh(new THREE.BoxGeometry(L, 1.0, .025), mGlass); gl.position.y = .55; gl.renderOrder = 2; g.add(gl);
  g.add(box(L, .04, .06, mFrame, 0, 1.08, 0)); g.add(box(L, .06, .08, mFrame, 0, .03, 0));
  const n = Math.max(2, Math.round(L / 1.6)); for (let i = 0; i <= n; i++) g.add(box(.05, 1.1, .05, mFrame, -L / 2 + L * i / n, .55, 0));
  scene.add(g); A(g, tStart, tStart + .8, 'scaleY'); g.scale.y = 1e-4; return g;
}
{
  const bal = pivotAt(box(4.2, .22, 1.5, mConcrete, 0, 0, 0), 3.7, 3.88, 5.2); A(bal, 22.4, 23.2, 'scaleX');
  railing(1.6, 5.9, 5.8, 5.9, 4.1, 24.2); railing(1.6, 4.6, 1.6, 5.9, 4.1, 24.5); railing(5.8, 4.6, 5.8, 5.9, 4.1, 24.5);
  railing(-8.15, 4.65, -3.0, 4.65, 4.0, 24.2); railing(-8.15, -4.65, -3.0, -4.65, 4.0, 24.5); railing(-8.15, -4.65, -8.15, 4.65, 4.0, 24.7);
}

// ============================================================ construction equipment
// excavator
const exc = new THREE.Group();
{
  exc.add(box(4.2, .7, 1.1, mDark, 0, .35, -.9), box(4.2, .7, 1.1, mDark, 0, .35, .9));
  const up = new THREE.Group(); up.position.y = .8; exc.add(up);
  up.add(box(3, 1, 2.4, mYellow, 0, .5, 0), box(1.2, 1.3, 1.6, mYellow, 1, 1.5, .1));
  const cabG = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.4), mGlass); cabG.position.set(1.05, 1.5, .1); up.add(cabG);
  up.add(box(1.4, .8, 2.2, mYellow, -1.2, 1.1, 0));
  const boom = new THREE.Group(); boom.position.set(1.6, 1, 0); up.add(boom); boom.add(box(4.2, .4, .45, mYellow, 2, 0, 0));
  const stick = new THREE.Group(); stick.position.set(4.1, 0, 0); boom.add(stick); stick.add(box(3, .3, .35, mYellow, 1.4, 0, 0));
  const bucket = new THREE.Group(); bucket.position.set(2.9, 0, 0); stick.add(bucket); bucket.add(box(.9, .6, 1.2, mDark, .3, -.2, 0));
  exc.userData = { boom, stick, bucket, up };
  exc.position.set(-14, 0, 0); exc.rotation.y = Math.PI; scene.add(exc); // faces +x
  exc.rotation.y = 0; exc.userData.x0 = -14;
}
A(exc, 2.3, 2.9, 'scaleAll'); A(exc, 5.2, 5.8, 'scaleAll', { rev: true });

// crane
const crane = new THREE.Group(); const craneTop = new THREE.Group();
{
  const MH = 26, S = .8;
  const corners = [[-S, -S], [S, -S], [S, S], [-S, S]];
  for (const [cx, cz] of corners) crane.add(cyl(.07, MH, mYellow, cx, MH / 2, cz, 6));
  for (let y = 0; y < MH; y += 1.6) {
    for (let k = 0; k < 4; k++) { const a = corners[k], b = corners[(k + 1) % 4]; crane.add(between(new THREE.Vector3(a[0], y + 1.6, a[1]), new THREE.Vector3(b[0], y, b[1]), .035, mYellow)); }
    for (let k = 0; k < 4; k++) { const a = corners[k], b = corners[(k + 1) % 4]; crane.add(between(new THREE.Vector3(a[0], y, a[1]), new THREE.Vector3(b[0], y, b[1]), .03, mYellow)); }
  }
  crane.add(box(3, 1.2, 3, mYellow, 0, .6, 0));
  craneTop.position.y = MH; crane.add(craneTop);
  const jib = new THREE.Group(); craneTop.add(jib);
  const JL = 24;
  jib.add(between(new THREE.Vector3(-8, .9, 0), new THREE.Vector3(JL, .9, 0), .06, mYellow));
  jib.add(between(new THREE.Vector3(-8, -.4, -.6), new THREE.Vector3(JL, -.4, -.6), .05, mYellow));
  jib.add(between(new THREE.Vector3(-8, -.4, .6), new THREE.Vector3(JL, -.4, .6), .05, mYellow));
  for (let x = -8; x < JL; x += 1.6) { jib.add(between(new THREE.Vector3(x, -.4, -.6), new THREE.Vector3(x + .8, .9, 0), .03, mYellow)); jib.add(between(new THREE.Vector3(x + .8, .9, 0), new THREE.Vector3(x + 1.6, -.4, .6), .03, mYellow)); jib.add(between(new THREE.Vector3(x, -.4, .6), new THREE.Vector3(x + .8, .9, 0), .03, mYellow)); }
  craneTop.add(box(2, 1.4, 1.6, mYellow, 0, -.6, 0)); jib.add(box(2.4, 1.4, 1.2, mDark, -6.5, .4, 0));
  craneTop.add(box(.2, 3.2, .2, mYellow, 0, 2.4, 0)); // tower head
  craneTop.add(between(new THREE.Vector3(0, 4, 0), new THREE.Vector3(JL - 2, .9, 0), .025, mDark)); craneTop.add(between(new THREE.Vector3(0, 4, 0), new THREE.Vector3(-8, .9, 0), .025, mDark));
  const trolley = new THREE.Group(); jib.add(trolley); trolley.add(box(.9, .3, 1.2, mDark, 0, -.7, 0));
  const cable = cyl(.025, 1, mDark, 0, -.5, 0, 4); trolley.add(cable);
  const hook = new THREE.Group(); trolley.add(hook); hook.add(box(.5, .6, .4, mYellow, 0, 0, 0));
  const load = new THREE.Group(); hook.add(load); load.add(box(2.2, .5, 1.3, mTimber, 0, -1.4, 0)); for (let i = 0; i < 3; i++) load.add(box(2, .35, 1.1, mStone, 0, -1.0 + i * 0, 0));
  load.children.forEach(c => { c.position.y = -1.4; }); load.children[1].position.y = -1.0; load.children[2].position.y = -.7; load.children[3].position.y = -.4;
  crane.userData = { trolley, cable, hook, jib, load };
  crane.position.set(17, 0, -9); scene.add(crane);
}
A(crane, 3.0, 5.4, 'scaleY'); A(crane, 24.3, 26.3, 'scaleY', { rev: true });
crane.children.forEach(c => { c.castShadow = true; });

// scaffolding around front/right/left
const scaf = new THREE.Group();
{
  const mS = mat({ color: 0x9aa3a8, roughness: .5, metalness: .7 }); const mPl = mat({ color: 0xb08a58, roughness: .8 });
  const lv = [.6, 2.6, 4.6, 6.6, 8.2], zf = 5.4, xs = [];
  for (let x = -8.6; x <= 7.0; x += 2.4) xs.push(x);
  for (const x of xs) { scaf.add(cyl(.04, 9, mS, x, 4.6, zf, 6)); scaf.add(cyl(.04, 9, mS, x, 4.6, zf - 1.1, 6)); }
  for (const y of lv) {
    scaf.add(between(new THREE.Vector3(xs[0], y, zf), new THREE.Vector3(xs[xs.length - 1], y, zf), .035, mS)); scaf.add(between(new THREE.Vector3(xs[0], y, zf - 1.1), new THREE.Vector3(xs[xs.length - 1], y, zf - 1.1), .035, mS));
    scaf.add(box(xs[xs.length - 1] - xs[0], .05, 1.0, mPl, (xs[0] + xs[xs.length - 1]) / 2, y + .05, zf - .55));
    for (const x of xs) scaf.add(between(new THREE.Vector3(x, y, zf), new THREE.Vector3(x, y, zf - 1.1), .03, mS));
    scaf.add(between(new THREE.Vector3(xs[0], y + 1, zf), new THREE.Vector3(xs[xs.length - 1], y + 1, zf), .03, mS));
  }
  for (let i = 0; i < xs.length - 1; i += 2) for (let l = 0; l < lv.length - 1; l++) scaf.add(between(new THREE.Vector3(xs[i], lv[l], zf), new THREE.Vector3(xs[i + 1], lv[l + 1], zf), .03, mS));
  // right side
  const xr = 7.2; for (let z = -4.8; z <= 5.4; z += 2.4) { scaf.add(cyl(.04, 9, mS, xr, 4.6, z, 6)); scaf.add(cyl(.04, 9, mS, xr - 1.1, 4.6, z, 6)); }
  for (const y of lv.slice(0, 4)) { scaf.add(between(new THREE.Vector3(xr, y, -4.8), new THREE.Vector3(xr, y, 5.4), .035, mS)); scaf.add(box(1, .05, 10.2, mPl, xr - .55, y + .05, .3)); }
  scene.add(scaf); scaf.userData.y0 = 0;
  scaf.children.forEach(c => { c.castShadow = true; });
}
A(scaf, 9.2, 16.0, 'scaleY', { ease: x => x }); A(scaf, 23.7, 25.0, 'scaleY', { rev: true });
// material piles
const piles = new THREE.Group();
{
  const sand = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.6, 18), new THREE.MeshStandardMaterial({ color: 0xc9b07c, roughness: 1 })); sand.position.set(-14, .8, 10); sand.castShadow = true; piles.add(sand);
  const gr = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.4, 18), new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 1 })); gr.position.set(-11, .7, 12); gr.castShadow = true; piles.add(gr);
  for (let i = 0; i < 3; i++) piles.add(box(1.4, .9, 1.1, mat({ color: 0xb4623a, roughness: .9 }), -17 + i * 1.6, .45, 14));
  for (let i = 0; i < 4; i++) piles.add(box(.2, .2, 3, mTimber, 12, .15 + i * .2, 10));
  const cone = (x, z) => { const c = new THREE.Mesh(new THREE.ConeGeometry(.25, .7, 12), new THREE.MeshStandardMaterial({ color: 0xff6a13 })); c.position.set(x, .35, z); c.castShadow = true; return c; };
  piles.add(cone(-9, 12), cone(-6, 14), cone(4, 12), cone(9, 9));
  scene.add(piles);
}
A(piles, 1.2, 1.3, 'show'); A(piles, 24.0, 24.1, 'show', { rev: true });
// survey stakes + tape (day 0)
const stakes = new THREE.Group();
{
  const pts = [[-9, -5.6], [7, -5.6], [7, 5.6], [-9, 5.6]];
  pts.forEach(([x, z], i) => { stakes.add(cyl(.05, 1.4, mat({ color: 0xffd23a }), x, .7, z, 6)); const n = pts[(i + 1) % 4]; stakes.add(between(new THREE.Vector3(x, 1.1, z), new THREE.Vector3(n[0], 1.1, n[1]), .015, mat({ color: 0xff6a13 }))); });
  scene.add(stakes);
}
A(stakes, .3, 1.0, 'scaleY'); A(stakes, 2.6, 3.0, 'scaleY', { rev: true });

// ============================================================ site finish: road, driveway, lawn, path, pool, trees, walls
const road = new THREE.Mesh(new THREE.PlaneGeometry(1200, 9).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: (() => { const t = texAsphalt.clone(); t.repeat.set(400, 3); t.needsUpdate = true; return t; })(), roughness: .9 }));
road.position.set(0, .0, 39); road.receiveShadow = true; scene.add(road);
for (let x = -200; x < 200; x += 8) { const d = new THREE.Mesh(new THREE.PlaneGeometry(3.5, .2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8e4d4 })); d.position.set(x, .01, 39); scene.add(d); }
const walk = new THREE.Mesh(new THREE.PlaneGeometry(1200, 2.4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb4b2ac, roughness: .9 })); walk.position.set(0, .02, 33.2); walk.receiveShadow = true; scene.add(walk);

// lawn: scales from front to back
const lawn = new THREE.Mesh(new THREE.PlaneGeometry(PX1 - PX0, PZ1 - PZ0 - 1).rotateX(-Math.PI / 2).translate(0, 0, (PZ1 - PZ0 - 1) / 2), new THREE.MeshStandardMaterial({ map: (() => { const t = texGrass.clone(); t.repeat.set(10, 10); t.needsUpdate = true; return t; })(), roughness: 1 }));
lawn.receiveShadow = true; const lawnP = pivotAt(lawn, 0, .035, PZ0); A(lawnP, 24.6, 27.0, 'scaleZ');
// driveway
const drv = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 28.5).rotateX(-Math.PI / 2).translate(0, 0, 14.25), new THREE.MeshStandardMaterial({ map: (() => { const t = texPave.clone(); t.repeat.set(2, 9); t.needsUpdate = true; return t; })(), roughness: .9 }));
drv.receiveShadow = true; const drvP = pivotAt(drv, -4.6, .05, 4.5); A(drvP, 25.3, 27.2, 'scaleZ');
// stepping stones
const stones = []; for (let i = 0; i < 20; i++) { const s = box(1.3, .08, .8, mat({ color: 0xcfccc4, roughness: .9 }), 0, .04, 0); const p = pivotAt(s, 1.3, .035, 7.7 + i * 1.28); A(p, 26.0 + i * .08, 26.5 + i * .08, 'pop'); }
// boundary wall + hedges
function bwall(x0, z0, x1, z1, t0) {
  const L = Math.hypot(x1 - x0, z1 - z0), g = new THREE.Group(); g.add(box(L, 1.2, .25, mWhite, 0, .6, 0)); g.add(box(L + .05, .08, .35, mFrame, 0, 1.24, 0));
  g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); g.rotation.y = -Math.atan2(z1 - z0, x1 - x0); scene.add(g); A(g, t0, t0 + 1.1, 'scaleY'); return g;
}
bwall(PX0 + .5, PZ0 + .5, PX1 - .5, PZ0 + .5, 26.4); bwall(PX0 + .5, PZ0 + .5, PX0 + .5, PZ1 - .5, 26.6); bwall(PX1 - .5, PZ0 + .5, PX1 - .5, PZ1 - .5, 26.6);
bwall(PX0 + .5, PZ1 - .5, -8.3, PZ1 - .5, 26.8); bwall(3.2, PZ1 - .5, PX1 - .5, PZ1 - .5, 26.8);
const mLeaf = new THREE.MeshStandardMaterial({ map: texLeaf, roughness: 1 });
function tree(x, z, s = 1) {
  const g = new THREE.Group(); g.add(cyl(.22 * s, 3 * s, mat({ color: 0x5a4030, roughness: 1 }), 0, 1.5 * s, 0, 8));
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(1.5, 2.1) * s, 1), mLeaf); b.position.set(rr(-1, 1) * s, (3.4 + i * .8 + rr(0, .5)) * s, rr(-1, 1) * s); b.scale.y = .85; b.castShadow = b.receiveShadow = true; g.add(b); }
  const p = pivotAt(g, x, 0, z); return p;
}
[[-14, -9, 1.1], [-22, 2, 1.2], [13, -16, 1.2], [23, -9, 1.3], [27, 6, 1.1], [26, 20, 1.2], [-25, -17, 1.2], [-27, -3, 1.3], [0, -19, 1.3], [-8, -15, 1], [-26, 22, 1.2], [20, -3, 1], [-18, 26, 1]].forEach(([x, z, s], i) => A(tree(x, z, s), 27.0 + i * .12, 27.7 + i * .12, 'pop'));
const bushM = new THREE.MeshStandardMaterial({ map: texLeaf, roughness: 1, color: 0xbfe0a0 });
[[-1.2, 5.6], [0, 5.6], [-8.4, 5.4], [-9.1, 3], [6.8, 5.6], [6.9, 2.8], [6.9, -2], [-9.2, -1], [-3.4, 5.6], [-8.8, -5.2], [6.8, -5.2]].forEach(([x, z], i) => {
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(.5, .8), 1), bushM); b.scale.y = .75; b.position.y = .4; b.castShadow = b.receiveShadow = true; const p = pivotAt(b, x, 0, z); A(p, 27.3 + i * .08, 27.9 + i * .08, 'pop');
});
// pool
{
  const deck = box(11.6, .12, 8.6, mat({ map: texDeck, roughness: .7 }, .5), 0, 0, 0); const dp = pivotAt(deck, 14.5, .0, 1.5); A(dp, 25.0, 26.2, 'scaleX');
  const coping = new THREE.Group(); [[9.2, .22, 0, -3.1], [9.2, .22, 0, 3.1]].forEach(([w, d, x, z]) => coping.add(box(w, .1, d, mWhite, x, .09, z))); [-4.5, 4.5].forEach(x => coping.add(box(.22, .1, 6.2, mWhite, x, .09, 0)));
  const cp = pivotAt(coping, 14.5, .08, 1.5); A(cp, 25.8, 26.4, 'pop');
  const wtex = texWater.clone(); wtex.repeat.set(3, 2); wtex.needsUpdate = true;
  const wm = new THREE.MeshPhysicalMaterial({ map: wtex, color: 0x66d4ee, roughness: .06, metalness: .05, transparent: true, opacity: .9, envMapIntensity: 1.4, emissive: 0x0a5f77, emissiveIntensity: .5 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(9, 6).rotateX(-Math.PI / 2), wm); water.receiveShadow = true; const wp = pivotAt(water, 14.5, .115, 1.5); A(wp, 26.0, 27.0, 'scaleX');
  window.__water = wtex;
  [12.2, 16.2].forEach((x, k) => { const b = new THREE.Group(); b.add(box(2, .14, .8, mWhite, 0, .3, 0)); b.add(box(.5, .1, .78, mWhite, -.9, .5, 0)); [-.8, .8].forEach(dx => b.add(box(.08, .3, .7, mFrame, dx, .15, 0))); const p = pivotAt(b, x, .12, 5.25); A(p, 27.2 + k * .2, 27.8 + k * .2, 'pop'); });
}
// path lights
const lightBulbs = [];
{
  const lm = new THREE.MeshBasicMaterial({ color: 0x302a22 }); window.__lm = lm;
  for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.add(cyl(.03, .5, mFrame, 0, .25, 0, 6)); const bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), lm); bulb.position.y = .55; g.add(bulb); const p = pivotAt(g, 1.3 + sx * 1.1, .03, 8 + i * 2.7); A(p, 27.6 + i * .05, 28.0 + i * .05, 'pop');
  }
}
// distant trees (instanced)
{
  const N = 220, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.35, .45, 4, 6), mat({ color: 0x4a3828 }), N), crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3.4, 1), new THREE.MeshStandardMaterial({ map: texLeaf, roughness: 1, color: 0xa8c890 }), N);
  const m = new THREE.Matrix4(); let k = 0;
  while (k < N) { const x = rr(-300, 300), z = rr(-260, 20); if (Math.abs(x) < 42 && z > -34) continue; const s = rr(1, 2.1); m.compose(new THREE.Vector3(x, 2 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); trunk.setMatrixAt(k, m); m.compose(new THREE.Vector3(x, 6 * s, z), new THREE.Quaternion(), new THREE.Vector3(s * 1.3, s * 1.1, s * 1.3)); crown.setMatrixAt(k, m); k++; }
  scene.add(trunk, crown);
}

// ============================================================ camera / sun path
function cat(keys, t) { // catmull-rom 1D, keys [[t,v],...]
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const p0 = keys[Math.max(i - 1, 0)][1], p1 = keys[i][1], p2 = keys[i + 1][1], p3 = keys[Math.min(i + 2, keys.length - 1)][1];
  const u = clamp01((t - keys[i][0]) / (keys[i + 1][0] - keys[i][0])), u2 = u * u, u3 = u2 * u;
  return .5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}
const K_AZ = [[0, -62], [6, -48], [12, -30], [18, -8], [24, 14], [30, 30]];
const K_EL = [[0, 34], [6, 31], [12, 28], [18, 24], [24, 15], [30, 9]];
const K_DI = [[0, 92], [6, 84], [12, 76], [18, 68], [24, 56], [30, 44]];
const K_TY = [[0, 1], [10, 2.8], [20, 4.2], [30, 4.4]];
const K_TX = [[0, -1], [30, -.5]];

const cTop0 = new THREE.Color(0x3d86d8), cTop1 = new THREE.Color(0x2a5aa0), cHor0 = new THREE.Color(0xcfe2f2), cHor1 = new THREE.Color(0xffc48a);
const cSun0 = new THREE.Color(0xfff2e0), cSun1 = new THREE.Color(0xffae66);
const tmp = new THREE.Color();

function update(t) {
  for (const o of anims) applyAnim(o, t);
  // excavator motion
  { const u = exc.userData, ph = t * 2.2; u.boom.rotation.z = -.5 + .35 * Math.sin(ph); u.stick.rotation.z = -.7 + .5 * Math.sin(ph + 1.2); u.bucket.rotation.z = -.4 + .5 * Math.sin(ph + 2.2); u.up.rotation.y = .25 * Math.sin(ph * .5); }
  // crane motion
  { const u = crane.userData, jibYaw = -2.35 + .35 * Math.sin(t * .35) + Math.min(t, 12) * .0; craneTop.rotation.y = jibYaw + (t > 8 ? .2 * Math.sin((t - 8) * .5) : 0);
    const tr = 9 + 5 * Math.sin(t * .4 + 1); u.trolley.position.set(tr, -.5, 0);
    const drop = 7 + 4 * (.5 + .5 * Math.sin(t * .7)); u.cable.scale.y = drop; u.cable.position.y = -drop / 2 - .2; u.hook.position.y = -drop - .2; u.load.visible = t < 22;
    u.hook.rotation.y = -craneTop.rotation.y * 0; }
  // sun & sky: midday -> golden hour
  const k = clamp01((t - 12) / 18), kk = eInOut(k);
  const elS = lerp(58, 17, kk) * Math.PI / 180, azS = lerp(-35, 52, kk) * Math.PI / 180, R = 150;
  sun.position.set(R * Math.cos(elS) * Math.sin(azS), R * Math.sin(elS), R * Math.cos(elS) * Math.cos(azS)); sun.target.position.set(0, 0, 0);
  sun.color.copy(cSun0).lerp(cSun1, kk); sun.intensity = lerp(3.2, 2.9, kk);
  hemi.color.copy(cHor0).lerp(cHor1, kk * .5); hemi.intensity = lerp(.75, .55, kk);
  skyU.top.value.copy(cTop0).lerp(cTop1, kk); skyU.hor.value.copy(cHor0).lerp(cHor1, kk); skyU.sunDir.value.copy(sun.position).normalize(); skyU.sunCol.value.copy(cSun1).lerp(cSun0, 1 - kk);
  scene.fog.color.copy(skyU.hor.value).lerp(new THREE.Color(0xa9c0a0), .15);
  renderer.toneMappingExposure = lerp(.95, 1.05, kk);
  // interior lights
  const gl = eInOut(clamp01((t - 26) / 3.5)); tmp.setHex(0x151a20).lerp(new THREE.Color(0xffc67e), gl); mPanel.color.copy(tmp);
  window.__lm.color.setHex(0x302a22).lerp(new THREE.Color(0xffd9a0), gl);
  if (window.__water) { window.__water.offset.set(t * .015, t * .01); }
  // camera
  const az = cat(K_AZ, t) * Math.PI / 180, el = cat(K_EL, t) * Math.PI / 180, di = cat(K_DI, t), ty = cat(K_TY, t), tx = cat(K_TX, t);
  camera.position.set(tx + di * Math.sin(az) * Math.cos(el), ty + di * Math.sin(el), di * Math.cos(az) * Math.cos(el) + 1);
  camera.lookAt(tx, ty, 1);
  // overlay
  const fade = 1 - clamp01(t / .9) * 1 + clamp01((t - (DUR - .9)) / .9); document.getElementById('fade').style.opacity = Math.min(1, fade);
  document.getElementById('title').style.opacity = String(clamp01((t - 27.2) / 1.2) * (1 - clamp01((t - 29.2) / .6)));
}
window.renderAt = (t) => { update(t); renderer.render(scene, camera); return true; };
window.ready = true;

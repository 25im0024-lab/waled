/* FPSO Console — field layout scene (SVG): detailed FPSO, helideck and helicopter, turret and mooring, risers,
   subsea hardware, reservoir, shuttle tanker, and an ROV whose camera re-renders the same world (<use>) magnified.
   Scales are schematic: the hull is drawn at 2.2 px/m, water depth is compressed into the water column. */
window.FpsoScene = function (ctx) {
'use strict';
const { T, fu, nf, CFG } = ctx, rtl = () => ctx.rtl && ctx.rtl();
const SW = 1100, SEA = 250, BED = 598, PX = 2.2, HD = 32 * PX, TUR = 205, HULL0 = 140, HULL1 = 800, MAN = 500;
const TREES = [120, 310, 690, 870], WIX = 960;
const iso = x => '\u2068' + x + '\u2069';   // bidi isolate for Arabic words inside LTR value lines
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const $ = id => document.getElementById(id);
const SC = {};
const ANCH = [[-80, 0], [22, 1], [78, 2], [610, 3], [745, 4]];        // anchor x, index of drawn line
const rov = { x: 430, y: 520, tx: 430, ty: 520, dir: 1, side: 1, zoom: 5, lights: true, key: 'manifold', follow: false };
const stand = () => 400 / rov.zoom;   // camera stand-off: the target sits mid-frame, the ROV's own nose at the frame edge

/* ---------- building blocks ---------- */
// oblique projection: the 58 m beam recedes up and to the right
const B = 38, pv = f => [+(B * f * 0.6).toFixed(1), +(-B * f * 0.8).toFixed(1)];
const PK = [0.179, -0.238];                       // plan (x along hull, y across beam, both in px at hull scale) -> screen shear
const plan = (x, y, v) => [+(x + PK[0] * v).toFixed(1), +(y + PK[1] * v).toFixed(1)];
const FLX = 262, FLY = -158, HPX = 790, HPY = -122;   // flare tip; helideck centre (deck coordinates)
const CRANES = [];
const octagon = r => { let p = ''; for (let k = 0; k < 8; k++) { const a = (k * 45 + 22.5) * Math.PI / 180; p += (k ? 'L' : 'M') + (r * Math.cos(a)).toFixed(1) + ' ' + (r * Math.sin(a)).toFixed(1); } return p + 'Z'; };
function box3(x, y, w, h, f, c, st) {
  st = st || '#1b242d'; const [dx, dy] = pv(f);
  return `<path d="M${x} ${y} h${w} l${dx} ${dy} h${-w}z" fill="${c[1]}" stroke="${st}" stroke-width=".5"/><path d="M${x + w} ${y} l${dx} ${dy} v${h} l${-dx} ${-dy}z" fill="${c[2]}" stroke="${st}" stroke-width=".5"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c[0]}" stroke="${st}" stroke-width=".5"/>`;
}
function frame3(x, yb, w, n, lh, f, inner, cols, colC) {
  const [dx, dy] = pv(f); colC = colC || '#c9d2db'; cols = cols || Math.max(2, Math.round(w / 30));
  let s = `<rect x="${x + dx}" y="${yb - n * lh + dy}" width="${w}" height="${n * lh}" fill="#1a232c" stroke="#3e4954" stroke-width=".5"/>`;
  for (let k = 0; k <= n; k++) { const y = yb - k * lh; s += `<path d="M${x} ${y} h${w} l${dx} ${dy} h${-w}z" fill="${k ? '#56616c' : '#3d4650'}" stroke="#222b33" stroke-width=".4"/>`; }
  s += inner;
  for (let k = 0; k <= cols; k++) { const xx = +(x + w * k / cols).toFixed(1); s += `<path d="M${xx} ${yb} V${yb - n * lh}" stroke="${colC}" stroke-width="1.3"/>`; }
  s += `<path d="M${x + w} ${yb} l${dx} ${dy} V${yb - n * lh + dy} M${x + w} ${yb} L${x + w + dx} ${yb - lh + dy}" stroke="#9aa6b2" stroke-width=".9" fill="none"/>`;
  for (let k = 1; k <= n; k++) { const y = yb - k * lh; s += `<path d="M${x} ${y} H${x + w}" stroke="${colC}" stroke-width="1.6"/><path d="M${x} ${y - 3.5} H${x + w}" stroke="#ffcf3a" stroke-width=".6"/>`; }
  return s;
}
const vcyl = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill || 'url(#gSteelV)'}" stroke="#2e3b48" stroke-width=".5"/><ellipse cx="${x + w / 2}" cy="${y}" rx="${w / 2}" ry="${(w * .28).toFixed(1)}" fill="#dfe7ee" stroke="#2e3b48" stroke-width=".4"/>`;
function flareTower(o) {
  const [ox, oy] = o, N = 8, L = t => FLX - 14 + 9 * t + ox, R = t => FLX + 14 - 9 * t + ox, Y = t => -2 - 144 * t + oy;
  let p = `M${L(0)} ${Y(0)} L${L(1)} ${Y(1)} M${R(0)} ${Y(0)} L${R(1)} ${Y(1)}`;
  for (let k = 0; k <= N; k++) { const t = k / N, u = (k + 1) / N; p += ` M${L(t)} ${Y(t)} L${R(t)} ${Y(t)}`; if (k < N) p += ` M${L(t)} ${Y(t)} L${R(u)} ${Y(u)} M${R(t)} ${Y(t)} L${L(u)} ${Y(u)}`; }
  return `<path d="${p}" stroke="${ox ? '#56626e' : '#c3ced8'}" stroke-width="${ox ? 1 : 1.3}" fill="none"/>`;
}
function crane3(x, ang, len) {
  const a = ang * Math.PI / 180, bx = x, by = -58, ex = +(bx + Math.cos(a) * len).toFixed(1), ey = +(by - Math.sin(a) * len).toFixed(1), nx = -Math.sin(a) * 2.2, ny = -Math.cos(a) * 2.2;
  CRANES.push([ex, ey]);
  let z = `M${bx} ${by}`; for (let k = 1; k <= 12; k++) { const t = k / 12, sg = k % 2 ? 1 : -1; z += ` L${(bx + (ex - bx) * t + sg * nx).toFixed(1)} ${(by + (ey - by) * t + sg * ny).toFixed(1)}`; }
  return vcyl(x - 4, -50, 8, 47, 'url(#gYelV)') + box3(x - 8, -62, 16, 10, .3, ['#e2b52c', '#f6d25a', '#a7820f']) + `<rect x="${x - 6}" y="-60" width="5" height="4" fill="#1d4f7a"/>
    <path d="M${(bx + nx).toFixed(1)} ${(by + ny).toFixed(1)} L${(ex + nx).toFixed(1)} ${(ey + ny).toFixed(1)} M${(bx - nx).toFixed(1)} ${(by - ny).toFixed(1)} L${(ex - nx).toFixed(1)} ${(ey - ny).toFixed(1)}" stroke="#f2c43a" stroke-width="1.2"/><path d="${z}" stroke="#c99a1e" stroke-width=".6" fill="none"/>
    <path d="M${x} -62 L${(x - Math.cos(a) * 5).toFixed(1)} -74 L${ex} ${ey}" stroke="#c9d6e3" stroke-width=".4" fill="none"/><path d="M${ex} ${ey} V${ey + 26}" stroke="#c9d6e3" stroke-width=".5"/><path d="M${ex - 1.6} ${ey + 26} h3.2 l-1.6 3z" fill="#e8742a"/>`;
}
const tree = (x, i) => `<g data-info="wells" class="hot" transform="translate(${x} ${BED - 2})">
  <rect x="-22" y="-4" width="44" height="6" fill="#5b6470" stroke="#2b3138"/>
  <path d="M-20 -4 V-40 M20 -4 V-40 M-20 -40 H20" stroke="#ffcf3a" stroke-width="2" fill="none"/>
  <rect x="-7" y="-14" width="14" height="10" fill="#8c99a6" stroke="#3a444e"/>
  <rect x="-9" y="-34" width="18" height="21" rx="2" fill="url(#gYel)" stroke="#3a2a00"/>
  <circle cx="-12" cy="-26" r="3.2" fill="#c49b18" stroke="#3a2a00"/><path d="M-15 -26 h-4" stroke="#222" stroke-width="1.5"/>
  <circle cx="12" cy="-22" r="3.2" fill="#c49b18" stroke="#3a2a00"/><path d="M15 -22 h4" stroke="#222" stroke-width="1.5"/>
  <rect x="9" y="-33" width="9" height="7" fill="#e8742a" stroke="#5a2a00"/><text x="13.5" y="-28.2" font-size="2.6" text-anchor="middle" fill="#fff">CHK</text>
  <rect x="-19" y="-38" width="8" height="8" fill="#4a5560" stroke="#222"/><circle cx="-16.5" cy="-35.5" r="1.4" fill="#e8f0f8"/><circle cx="-13.5" cy="-35.5" r="1.4" fill="#e8f0f8"/>
  <text x="-15" y="-31.3" font-size="1.6" fill="#ffcf3a" text-anchor="middle">ROV PANEL</text>
  <circle id="tl${i}" cx="0" cy="-44" r="2.6" fill="#2bd66f" filter="url(#glow)"/>
  <rect x="-8" y="-7" width="16" height="3.6" fill="#0b2340"/><text x="0" y="-4.4" font-size="3" fill="#fff" text-anchor="middle">XT ${CFG.wells[i].id}</text>
  <path d="M-21 -40 q4 -2 8 0 M6 -40 q4 -2 8 0" stroke="#5c7a4a" stroke-width="1" fill="none" opacity=".6"/></g>`;
const lattice = (x0, x1, y0, y1, n) => { let p = `M${x0} ${y0} H${x1} M${x0} ${y1} H${x1}`; for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n; p += ` M${x} ${y0} V${y1}`; if (k < n) p += ` M${x} ${y0} L${x0 + (x1 - x0) * (k + 1) / n} ${y1}`; } return p; };
const vessel = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill || 'url(#gSteel)'}" stroke="#2e3b48" stroke-width=".8"/><path d="M${x + h / 2} ${y + 1} V${y + h - 1} M${x + w - h / 2} ${y + 1} V${y + h - 1}" stroke="#7d8b99" stroke-width=".6"/>`;
const finfan = (x, y, n) => { let s = `<rect x="${x}" y="${y}" width="${n * 12}" height="6" fill="#5c6a78" stroke="#2e3b48" stroke-width=".6"/>`; for (let k = 0; k < n; k++) s += `<circle cx="${x + 6 + k * 12}" cy="${y + 3}" r="2.4" fill="#2b3640" stroke="#9fb3c8" stroke-width=".5"/>`; return s; };
const windows = (x0, x1, y, n) => { let s = ''; for (let k = 0; k < n; k++) s += `<rect x="${x0 + 3 + k * ((x1 - x0 - 6) / n)}" y="${y}" width="${(x1 - x0 - 6) / n - 2}" height="3.2" fill="#ffe7a8" opacity=".85"/>`; return s; };
const lifeboat = (x, y) => `<g transform="translate(${x} ${y})"><path d="M2 -6 V-12 h28 V-6" stroke="#9aa6b2" stroke-width=".8" fill="none"/><path d="M0 0 h26 q5 0 5 4 q0 4 -5 4 h-26 q-4 0 -4 -4 q0 -4 4 -4z" fill="#ff7a1a" stroke="#7a2e00" stroke-width=".5"/><path d="M3 0 q12 -7 22 0" fill="#ff9a4a" stroke="#7a2e00" stroke-width=".4"/><path d="M-2 5 h31" stroke="#fff" stroke-width=".7"/></g>`;
const heliShape = () => `<g id="heliBody"><path d="M-22 0 q2 -9 14 -10 h14 q8 0 10 6 l3 6 h-41z" fill="#e7ecf2" stroke="#3a4552" stroke-width=".8"/><path d="M-8 -9 h12 l4 6 h-16z" fill="#1d4f7a" opacity=".85"/>
  <path d="M-22 -3 L-48 -6 L-50 -12 L-46 -12 L-42 -7 L-22 -6z" fill="#e7ecf2" stroke="#3a4552" stroke-width=".8"/><rect x="-30" y="-1" width="30" height="2.4" fill="#e8742a"/>
  <path d="M-14 1 v4 M6 1 v4 M-18 5 h28" stroke="#3a4552" stroke-width="1.2"/><rect x="-6" y="-14" width="6" height="4" fill="#9fb3c8"/></g>
  <g id="heliRotor"><path d="M-3 -14 h-34 M-3 -14 h34" stroke="#2b3138" stroke-width="1.6"/></g><g id="heliTail" transform="translate(-48 -9)"><path d="M0 -6 V6" stroke="#2b3138" stroke-width="1.3"/></g>`;

// crew working on deck: [key, x, y (feet, deck coordinates), walk amplitude, hard hat, coverall]
const CREW = [['proc', 300, -3, 12, '#f4f7fa', '#ff7a1a'], ['mech', 470, -3, 7, '#ffd84a', '#1d4f9a'], ['elec', 598, -3, 5, '#ffd84a', '#1d4f9a'], ['lab', 652, -21, 5, '#f4f7fa', '#2b7a4b'],
  ['crane', 621, -54, 0, '#ffd84a', '#ff7a1a'], ['deck', 548, -3, 14, '#ffd84a', '#ff7a1a'], ['deck2', 582, -3, 3, '#ffd84a', '#ff7a1a'], ['hlo', 768, -117, 3, '#f4f7fa', '#ff7a1a'], ['rov', 662, -3, 3, '#f4f7fa', '#1d4f9a']];
const person = (hat, suit, vest) => `<circle cy="-6.3" r="1.25" fill="#d9ad8a"/><path d="M-1.6 -6.5 a1.6 1.7 0 0 1 3.2 0 h.6 v.45 h-4.4z" fill="${hat}"/><path d="M-1.5 -4.9 h3 l.3 3.3 h-3.6z" fill="${suit}"/>
  <path d="M-1.45 -3.9 h2.9 M-1.55 -2.5 h3.1" stroke="${vest || '#e8f26a'}" stroke-width=".4"/><path d="M-1.5 -4.6 L-2.1 -2.3 M1.5 -4.6 L2.1 -2.3" stroke="${suit}" stroke-width=".8"/><path class="lg" d="M-.7 -1.6 L-.8 0" stroke="#2b3138" stroke-width=".9"/><path class="lg" d="M.7 -1.6 L.8 0" stroke="#2b3138" stroke-width=".9"/>`;
/* ---------- build ---------- */
function build() {
  let h = `<defs>
  <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1d3c"/><stop offset=".45" stop-color="#3a3d66"/><stop offset=".75" stop-color="#c46a4a"/><stop offset=".93" stop-color="#f3a35a"/><stop offset="1" stop-color="#ffd08a"/></linearGradient>
  <linearGradient id="gSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f5a86"/><stop offset=".25" stop-color="#0a3f66"/><stop offset=".7" stop-color="#05213b"/><stop offset="1" stop-color="#020e1c"/></linearGradient>
  <linearGradient id="gUp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262b31"/><stop offset="1" stop-color="#14181c"/></linearGradient>
  <linearGradient id="gAF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9b2a22"/><stop offset="1" stop-color="#5a1410"/></linearGradient>
  <linearGradient id="gYel" x1="0" x2="1"><stop offset="0" stop-color="#9d7500"/><stop offset=".45" stop-color="#ffd84a"/><stop offset="1" stop-color="#8f6a00"/></linearGradient>
  <linearGradient id="gSteel" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d7e1ea"/><stop offset=".55" stop-color="#8d9cab"/><stop offset="1" stop-color="#4c5f73"/></linearGradient>
  <linearGradient id="gWhite" x1="0" x2="1"><stop offset="0" stop-color="#c9d2dc"/><stop offset=".5" stop-color="#f4f7fa"/><stop offset="1" stop-color="#bfc9d4"/></linearGradient>
  <linearGradient id="gOil" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c98b24"/><stop offset="1" stop-color="#6e4310"/></linearGradient>
  <linearGradient id="gSand" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6b5a40"/><stop offset="1" stop-color="#3b3124"/></linearGradient>
  <linearGradient id="gRes" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffb42e"/><stop offset="1" stop-color="#8c4b07"/></linearGradient>
  <radialGradient id="gSun" cx=".86" cy=".98" r=".45"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".95"/><stop offset=".25" stop-color="#ffb066" stop-opacity=".45"/><stop offset="1" stop-color="#ffb066" stop-opacity="0"/></radialGradient>
  <radialGradient id="gLamp"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
  <pattern id="pSand" width="8" height="6" patternUnits="userSpaceOnUse"><rect width="8" height="6" fill="#8a744f"/><circle cx="2" cy="2" r=".7" fill="#a18a60"/><circle cx="6" cy="4.5" r=".6" fill="#6f5c3e"/></pattern>
  <pattern id="pSS" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="10" height="8" fill="#b9802e"/><circle cx="2" cy="2" r="1" fill="#d6a04a"/><circle cx="7" cy="5.5" r="1" fill="#9a6420"/></pattern>
  <pattern id="pChain" width="5" height="3" patternUnits="userSpaceOnUse"><ellipse cx="2.5" cy="1.5" rx="2.2" ry="1.2" fill="none" stroke="#3a3f45" stroke-width=".9"/></pattern>
  <linearGradient id="gSkyD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fb5"/><stop offset=".7" stop-color="#8fc3ea"/><stop offset="1" stop-color="#d6ecf8"/></linearGradient>
  <linearGradient id="gSkyN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#01030a"/><stop offset=".7" stop-color="#06122a"/><stop offset="1" stop-color="#10264a"/></linearGradient>
  <linearGradient id="gVeil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#01040c"/><stop offset=".62" stop-color="#020a18"/><stop offset="1" stop-color="#020a18" stop-opacity="0"/></linearGradient>
  <linearGradient id="gDeck" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5d6a60"/><stop offset="1" stop-color="#3f4a43"/></linearGradient>
  <linearGradient id="gSteelV" x1="0" x2="1"><stop offset="0" stop-color="#5a6a7a"/><stop offset=".4" stop-color="#dfe7ee"/><stop offset="1" stop-color="#6c7c8c"/></linearGradient>
  <linearGradient id="gYelV" x1="0" x2="1"><stop offset="0" stop-color="#9d7500"/><stop offset=".4" stop-color="#ffd84a"/><stop offset="1" stop-color="#a7820f"/></linearGradient>
  <linearGradient id="gStack" x1="0" x2="1"><stop offset="0" stop-color="#3a434c"/><stop offset=".4" stop-color="#9aa6b2"/><stop offset="1" stop-color="#3a434c"/></linearGradient>
  <linearGradient id="gCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff4c8" stop-opacity="0"/></linearGradient>
  <radialGradient id="gRed"><stop offset="0" stop-color="#ff4a3a" stop-opacity=".9"/><stop offset="1" stop-color="#ff2a1a" stop-opacity="0"/></radialGradient>
  <radialGradient id="gFlare"><stop offset="0" stop-color="#ffb347" stop-opacity=".45"/><stop offset=".5" stop-color="#ff8a2a" stop-opacity=".15"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
  <pattern id="gNet" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#2b3640"/><path d="M0 0 L3 3 M3 0 L0 3" stroke="#8a96a2" stroke-width=".35"/></pattern>
  <filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
  <clipPath id="hullClip"><path d="M${HULL0 + 26} 0 H${HULL1} V${HD} H${HULL0 + 52} C${HULL0 + 24} ${HD} ${HULL0 + 6} ${HD * 0.5} ${HULL0} -6 Z"/></clipPath></defs>`;
  // ---- world (also rendered by the ROV camera) ----
  h += `<g id="world">
  <rect id="sky" width="${SW}" height="${SEA}" fill="url(#gSky)"/><g id="sunG"><rect width="${SW}" height="${SEA}" fill="url(#gSun)"/>
  <circle cx="880" cy="${SEA - 6}" r="20" fill="#ffe7b0" opacity=".9"/></g>
  <g id="stars" visibility="hidden">${Array.from({ length: 70 }, (_, k) => `<circle cx="${(k * 137.5) % SW}" cy="${(k * 61.7) % (SEA - 40)}" r="${k % 5 ? .6 : 1.1}" fill="#fff" opacity="${.4 + (k % 4) * .15}"/>`).join('')}</g>
  <g filter="url(#soft)" opacity=".55" fill="#2a2f55"><ellipse cx="170" cy="70" rx="150" ry="14"/><ellipse cx="560" cy="44" rx="190" ry="12"/><ellipse cx="860" cy="120" rx="150" ry="10" fill="#7a4a60"/><ellipse cx="380" cy="150" rx="120" ry="8" fill="#6a4060"/></g>
  <path d="M40 ${SEA} v-14 h6 v-8 h4 v8 h10 v-5 h3 v5 h6 v14z" fill="#141a26" opacity=".7"/><path d="M53 ${SEA - 22} v-10" stroke="#141a26" stroke-width="1.5" opacity=".7"/>
  <rect y="${SEA}" width="${SW}" height="${BED - SEA}" fill="url(#gSea)"/>
  <g id="rays" opacity=".14" fill="#bfeaff">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${100 + i * 140} ${SEA} L${50 + i * 140} ${BED - 60} L${150 + i * 140} ${BED - 60} Z"/>`).join('')}</g>`;
  // subsurface geology
  h += `<path d="M0 ${BED} Q120 ${BED - 5} 250 ${BED + 1} T520 ${BED - 1} T800 ${BED + 2} T${SW} ${BED} V760 H0Z" fill="url(#gSand)"/>
  <path d="M0 ${BED} Q120 ${BED - 5} 250 ${BED + 1} T520 ${BED - 1} T800 ${BED + 2} T${SW} ${BED} V${BED + 7} H0Z" fill="url(#pSand)"/>
  ${[60, 180, 410, 640, 790, 930].map((x, k) => `<ellipse cx="${x}" cy="${BED + 1}" rx="${5 + k % 3 * 3}" ry="2.6" fill="#4d4436"/>`).join('')}
  <path d="M0 640 C200 632 400 652 600 640 S900 630 ${SW} 642 V662 C800 652 600 670 400 660 S100 650 0 664Z" fill="#3a3024"/>
  <path d="M0 672 C220 660 420 690 640 674 S900 664 ${SW} 676 V700 C800 690 600 712 400 702 S150 690 0 704Z" fill="#5a5e63"/>
  <text x="980" y="690" class="gl" text-anchor="end">cap rock (shale)</text>
  <g data-info="reservoir" class="hot"><path d="M30 712 C200 694 360 700 520 696 S820 700 970 716 L970 729 C800 723 600 727 500 727 S200 725 30 731Z" fill="url(#pSS)"/>
  <path d="M30 712 C200 694 360 700 520 696 S820 700 970 716 L970 729 C800 723 600 727 500 727 S200 725 30 731Z" fill="url(#gRes)" opacity=".55" filter="url(#glow)"/>
  <path d="M30 731 C200 725 400 727 500 727 S800 723 970 729 L970 746 C760 742 500 748 300 746 S100 746 30 748Z" fill="#1f5f8f" opacity=".8"/>
  <path d="M30 731 C200 725 400 727 500 727 S800 723 970 729" stroke="#7fd0ff" stroke-dasharray="6 4" fill="none"/><text x="975" y="740" class="gl">OWC</text>
  <path d="M760 640 L735 760" stroke="#1a140e" stroke-width="2" stroke-dasharray="7 4"/><text x="742" y="756" class="gl">fault</text></g>`;
  // wells (casing + perforations) and trees
  const tip = [190, 360, 640, 820];
  TREES.forEach((x, i) => {
    const d = `M${tip[i]} 714 C${(x + tip[i]) / 2} 682 ${x} 650 ${x} ${BED + 2}`;
    h += `<path d="${d}" stroke="#7d8b99" stroke-width="3.4" fill="none"/><path d="${d}" stroke="#1b232c" stroke-width="1.6" fill="none"/><path id="dh${i}" class="flow" d="${d}" stroke="#ffb627" stroke-width="1.4" fill="none"/>
    ${[0, 1, 2, 3].map(k => `<path d="M${tip[i] - 6 + k * 4} 709 l-2 -4 M${tip[i] - 6 + k * 4} 717 l-2 4" stroke="#ffe08a" stroke-width=".8"/>`).join('')}`;
  });
  h += `<path d="M${WIX} ${BED + 2} C${WIX} 660 ${WIX - 30} 700 ${WIX - 60} 739" stroke="#7d8b99" stroke-width="3.4" fill="none"/><path id="dhWi" class="flow" d="M${WIX} ${BED + 2} C${WIX} 660 ${WIX - 30} 700 ${WIX - 60} 739" stroke="#3fb0ff" stroke-width="1.4" fill="none"/>`;
  // flowlines with PLETs and M-shaped jumpers into the manifold
  TREES.forEach((x, i) => {
    const side = x < MAN ? -1 : 1, px = MAN + side * 62, dy = (i % 2) * 3;
    h += `<path d="M${x + side * -22} ${BED - 2 - dy} H${px}" stroke="#121a22" stroke-width="5" fill="none"/><path id="fl${i}" class="flow" d="M${x + side * -22} ${BED - 2 - dy} H${px}" stroke="#ffb627" stroke-width="2.2" fill="none"/>
    <rect x="${px - 6}" y="${BED - 8 - dy}" width="12" height="7" fill="#6b7682" stroke="#2b3138"/>
    <path d="M${px} ${BED - 8 - dy} V${BED - 26 - dy} H${px - side * 8} V${BED - 14 - dy} H${MAN + side * 40}" stroke="#ffcf3a" stroke-width="2.2" fill="none"/>`;
  });
  h += `<path d="M${MAN + 50} ${BED + 2} H${WIX - 10}" stroke="#121a22" stroke-width="4"/><path id="flWi" class="flow" d="M${MAN + 50} ${BED + 2} H${WIX - 10}" stroke="#3fb0ff" stroke-width="2"/>
  <g data-info="injection" class="hot" transform="translate(${WIX} ${BED - 2})"><rect x="-16" y="-4" width="32" height="5" fill="#5b6470"/><rect x="-7" y="-26" width="14" height="22" rx="2" fill="#3b78b5" stroke="#0d2a48"/><circle cx="-10" cy="-18" r="2.6" fill="#7fb6e0"/><text x="0" y="-28" font-size="4" fill="#bfe0ff" text-anchor="middle">WI-1</text></g>`;
  TREES.forEach((x, i) => { h += tree(x, i); });
  // manifold with protective structure
  h += `<g data-info="manifold" class="hot" transform="translate(${MAN} ${BED - 2})">
    <rect x="-52" y="-3" width="104" height="5" fill="#5b6470"/>
    <path d="${lattice(-48, 48, -40, -3, 8)}" stroke="#ffcf3a" stroke-width="1.6" fill="none"/>
    <rect x="-48" y="-44" width="96" height="5" fill="url(#gYel)" stroke="#5a4400"/>${[-40, -20, 0, 20].map(x => `<rect x="${x}" y="-49" width="16" height="5" fill="#e2b52c" stroke="#5a4400"/>`).join('')}
    <path d="M-44 -14 H44 M-44 -24 H44" stroke="#9fb3c8" stroke-width="3"/>${[-30, -10, 10, 30].map(x => `<circle cx="${x}" cy="-19" r="3.4" fill="#c49b18" stroke="#3a2a00"/><path d="M${x} -23 v-5 M${x - 3} -28 h6" stroke="#222" stroke-width="1"/>`).join('')}
    <rect x="-16" y="-36" width="32" height="6" fill="#0b2340"/><text x="0" y="-31.6" font-size="4" fill="#fff" text-anchor="middle">MANIFOLD M-1</text></g>`;
  // riser base / SSIV, risers (lazy wave), umbilical
  const RB = MAN - 70;
  h += `<g data-info="risers" class="hot"><rect x="${RB - 14}" y="${BED - 20}" width="28" height="20" fill="#6b7682" stroke="#2b3138"/><rect x="${RB - 9}" y="${BED - 30}" width="18" height="10" fill="#e8742a" stroke="#5a2a00"/><text x="${RB}" y="${BED - 23.5}" font-size="3.4" fill="#fff" text-anchor="middle">SSIV</text>
    <path d="M${RB + 14} ${BED - 10} H${MAN - 48}" stroke="#ffcf3a" stroke-width="2.2"/></g>`;
  const riser = (dx, id, col, w) => { const x0 = TUR + dx, x1 = RB + dx * 2; return `<path d="M${x1} ${BED - 30} C${x1 - 10} 470 ${x0 + 170} 500 ${x0 + 130} 430 S${x0 + 8} 380 ${x0} ${SEA + 76}" stroke="#121a22" stroke-width="${w + 2.4}" fill="none"/><path id="${id}" class="flow" d="M${x1} ${BED - 30} C${x1 - 10} 470 ${x0 + 170} 500 ${x0 + 130} 430 S${x0 + 8} 380 ${x0} ${SEA + 76}" stroke="${col}" stroke-width="${w}" fill="none"/>`; };
  h += `<g data-info="risers" class="hot">${riser(-6, 'rs0', '#ffb627', 3)}${riser(-2, 'rs1', '#ffb627', 3)}${riser(2, 'rsGl', '#9b7cff', 2)}${riser(6, 'rsWi', '#3fb0ff', 2)}${riser(10, 'umb', '#7bd35a', 1.4)}
    ${[0, 1, 2, 3, 4, 5, 6].map(k => `<rect x="${TUR + 100 + k * 9}" y="${424 + Math.abs(k - 3) * 3.5}" width="7.5" height="15" rx="3" fill="#ffb627" stroke="#6a4000" stroke-width=".7"/>`).join('')}</g>`;
  // mooring lines: chain (top) - polyester - chain on seabed - suction pile
  const fair = [TUR, SEA + 74];
  h += `<g data-info="turret" class="hot">${ANCH.map(([ax], j) => {
    const td = ax + (ax < TUR ? 40 : -40), mx = (fair[0] + td) / 2, my = BED - 40;
    const c1 = `M${fair[0]} ${fair[1]} Q${fair[0] + (td - fair[0]) * 0.15} ${fair[1] + 60} ${fair[0] + (td - fair[0]) * 0.22} ${fair[1] + 80}`;
    const p = `M${fair[0] + (td - fair[0]) * 0.22} ${fair[1] + 80} Q${mx} ${my} ${td} ${BED - 2}`;
    return `<path id="mlc${j}" d="${c1}" stroke="url(#pChain)" stroke-width="3" fill="none"/><path id="ml${j}" d="${p}" stroke="#e8e0c8" stroke-width="1.3" fill="none"/>
      <path d="M${td} ${BED - 2} H${ax}" stroke="url(#pChain)" stroke-width="3"/><g transform="translate(${ax} ${BED - 4})"><rect x="-6" y="0" width="12" height="9" fill="#6b7682" stroke="#2b3138"/><rect x="-7" y="-2" width="14" height="3" fill="#8c99a6"/><circle cx="0" cy="-3" r="1.4" fill="none" stroke="#c9d6e3"/></g>`;
  }).join('')}</g>`;
  // ---- FPSO hull and topsides (translated by draft); oblique view: the beam recedes up-right (pv) ----
  const [DX, DY] = pv(1), mid = pv(0.45);
  h += `<g id="hull">
    <g data-info="storage" class="hot" clip-path="url(#hullClip)">
      <rect x="${HULL0 - 10}" y="-10" width="${HULL1 - HULL0 + 20}" height="${HD + 20}" fill="url(#gAF)"/>
      <rect id="hullUpper" x="${HULL0 - 10}" y="-10" width="${HULL1 - HULL0 + 20}" height="36" fill="url(#gUp)"/>
      <rect x="${HULL0 - 10}" y="25" width="${HULL1 - HULL0 + 20}" height="2.2" fill="#0b0d10"/>
      ${[7, 15].map(y => `<path d="M${HULL0} ${y} H${HULL1}" stroke="#000" stroke-opacity=".35" stroke-width=".6"/>`).join('')}<path d="M${HULL0} 2.5 H${HULL1}" stroke="#4a525b" stroke-width="1.2"/>
      ${Array.from({ length: 16 }, (_, k) => `<path d="M${HULL0 + 40 + k * 40} 0 V${HD}" stroke="#000" stroke-opacity=".16"/>`).join('')}
      ${Array.from({ length: 22 }, (_, k) => `<path d="M${HULL0 + 50 + k * 29} 3 v${6 + (k * 7) % 9}" stroke="#7a3a1a" stroke-opacity=".35" stroke-width="${1 + k % 3 * .5}"/>`).join('')}
      ${[0, 1, 2, 3, 4].map(k => `<rect x="${330 + k * 80}" y="6" width="72" height="${HD - 14}" rx="9" fill="#0b1015" stroke="#5c6a78" stroke-width=".8"/><rect id="ct${k}" x="${332 + k * 80}" y="${HD - 10}" width="68" height="0" rx="8" fill="url(#gOil)"/>`).join('')}
      <text x="530" y="${HD - 12}" class="sl" text-anchor="middle" fill="#ffd9a8">${T('CARGO TANKS')}</text>
      ${draftMarks(HULL0 + 34)}${draftMarks(HULL1 - 10)}
      <text x="${HULL0 + 70}" y="18" font-size="9" font-weight="700" fill="#e9eef3" letter-spacing="2">AL-WAHA</text><text x="${HULL1 - 60}" y="18" font-size="5" fill="#c9d2dc" letter-spacing="1">MONROVIA</text></g>
    <path d="M${HULL0 + 26} 0 H${HULL1} V${HD} H${HULL0 + 52} C${HULL0 + 24} ${HD} ${HULL0 + 6} ${HD * 0.5} ${HULL0} -6 Z" fill="none" stroke="#05080c" stroke-width="1.2"/>
    <path d="M${HULL1} 0 l${DX} ${DY} V${HD + DY} L${HULL1} ${HD}Z" fill="#15191e"/><path d="M${HULL1} 26 l${DX} ${DY} V${HD + DY} L${HULL1} ${HD}Z" fill="#4a120e"/>
    <path d="M${HULL0 + 30} 0 H${HULL1} l${DX} ${DY} H${HULL0 + 30 + DX} Q${HULL0 + 6 + DX * .5} ${DY + 2} ${HULL0 - 2 + DX * .5} ${-6 + DY * .5} Q${HULL0 + 2} -4 ${HULL0 + 30} 0Z" fill="url(#gDeck)" stroke="#0e1318" stroke-width=".6"/>
    ${Array.from({ length: 15 }, (_, k) => `<path d="M${HULL0 + 70 + k * 42} 0 l${DX} ${DY}" stroke="#000" stroke-opacity=".18" stroke-width=".5"/>`).join('')}
    <path d="M${HULL0 + 34 + pv(.1)[0]} ${pv(.1)[1]} H${HULL1 - 6 + pv(.1)[0]}" stroke="#e8c23a" stroke-width=".7" stroke-dasharray="6 3" opacity=".8"/>
    <!-- centreline pipe rack -->
    <g transform="translate(${mid[0]} ${mid[1]})">${box3(280, -14, 436, 3, .25, ['#59636d', '#7d8893', '#3e4650'])}${['#c96a2b', '#d9b52c', '#7d8b99', '#3b78b5', '#7d8b99', '#c9d2db'].map((c, k) => `<path d="M280 ${-11 + k * 1.6} H716" stroke="${c}" stroke-width="1.1"/>`).join('')}${Array.from({ length: 13 }, (_, k) => `<path d="M${282 + k * 36} -14 V-1" stroke="#6b7682" stroke-width="1.2"/>`).join('')}</g>
    <!-- internal turret: gantry with the swivel stack above deck; shaft and chain table below the keel -->
    <g data-info="turret" class="hot"><rect x="${TUR - 14}" y="-4" width="28" height="${HD + 8}" fill="#ffd84a" opacity=".2"/><rect x="${TUR - 20}" y="${HD - 2}" width="40" height="8" fill="url(#gYel)" stroke="#3a2a00"/>
      ${[-15, -5, 5, 15].map(dx => `<rect x="${TUR + dx - 2}" y="${HD + 5}" width="4" height="4" fill="#8f6a00"/>`).join('')}
      ${frame3(TUR - 18, -2, 36, 3, 24, .85, `<g transform="translate(${pv(.4).join(' ')})">${vcyl(TUR - 7, -74, 14, 72, 'url(#gSteelV)')}${[0, 1, 2, 3, 4].map(k => `<rect x="${TUR - 9}" y="${-70 + k * 13}" width="18" height="4" rx="1" fill="#e2b52c" stroke="#5a4400" stroke-width=".4"/>`).join('')}</g>`, 2, '#ffcf3a')}
      ${box3(TUR - 20, -80, 40, 5, .85, ['#e2b52c', '#f2c94a', '#a7820f'])}<text x="${TUR + 10}" y="-110" font-size="5.5" fill="#ffcf3a" text-anchor="middle">SWIVEL</text></g>
    <!-- flare tower (forward) -->
    <g data-info="flare" class="hot">${flareTower(pv(.35))}${flareTower([0, 0])}
      <path d="M${FLX} -146 V${FLY}" stroke="#7d8b99" stroke-width="3"/><rect x="${FLX - 3}" y="${FLY - 2}" width="6" height="3" fill="#3e4650"/>
      <g id="flameG"><path id="flame" d="M${FLX} ${FLY} c-12 -14 -4 -30 0 -44 c4 14 14 30 0 44z" fill="#ffb627" filter="url(#glow)"/><path id="flame2" d="M${FLX} ${FLY - 2} c-6 -8 -2 -18 0 -26 c2 8 8 18 0 26z" fill="#fff3b0"/></g></g>
    <!-- process modules -->
    <g data-info="separator" class="hot">${frame3(286, -3, 150, 2, 22, .8, `<g transform="translate(${pv(.25).join(' ')})">
        ${vessel(292, -20, 86, 16)}<rect id="sepLiq" x="295" y="-12" width="80" height="7" rx="3" fill="#c98b24" opacity=".9"/><text x="335" y="-14" font-size="3.6" fill="#1b242d" text-anchor="middle">V-101 HP SEPARATOR</text>
        ${vessel(384, -16, 44, 12)}${vessel(296, -42, 58, 13)}${vessel(362, -40, 44, 9)}${vessel(362, -30, 44, 4.5, '#7d8b99')}
        <path d="M300 -4 V-2 M370 -4 V-2 M394 -4 V-2 M420 -4 V-2" stroke="#3e4650" stroke-width="2"/></g>${vcyl(420, -70, 11, 66, 'url(#gSteelV)')}`)}
      <text x="386" y="-74" class="sl" text-anchor="middle">${T('SEPARATION')}</text></g>
    <g data-info="compression" class="hot">${box3(446, -56, 114, 53, .8, ['#6d7c8b', '#a3b1be', '#4b5866'])}
      ${Array.from({ length: 19 }, (_, k) => `<path d="M${449 + k * 6} -55 V-4" stroke="#5a6876" stroke-width=".6"/>`).join('')}
      ${[0, 1].map(k => `<rect x="${452 + k * 54}" y="-46" width="44" height="22" fill="#56636f" stroke="#8fa2b5" stroke-width=".5"/>${Array.from({ length: 6 }, (_, j) => `<path d="M${454 + k * 54} ${-43 + j * 3.4} h40" stroke="#3e4954" stroke-width="1.4"/>`).join('')}<rect x="${470 + k * 54}" y="-18" width="9" height="15" fill="#3e4954" stroke="#8fa2b5" stroke-width=".4"/><text x="${474 + k * 54}" y="-48.5" font-size="4" fill="#e6eef6" text-anchor="middle">K-101${'AB'[k]}</text>`).join('')}
      <circle id="cA" cx="458" cy="-51" r="2.8" stroke="#000" stroke-width=".5"/><circle id="cB" cx="512" cy="-51" r="2.8" stroke="#000" stroke-width=".5"/>
      ${box3(448, -63, 110, 7, .7, ['#4f5c69', '#6c7a88', '#3b4551'])}${Array.from({ length: 9 }, (_, k) => { const [fx, fy] = pv(.35); return `<ellipse cx="${454 + k * 12 + fx}" cy="${-63 + fy}" rx="5" ry="3.4" fill="#1f282f" stroke="#9fb3c8" stroke-width=".5" transform="rotate(-18 ${454 + k * 12 + fx} ${-63 + fy})"/><path class="fan" d="M${450 + k * 12 + fx} ${-63 + fy} h8" stroke="#9fb3c8" stroke-width=".6"/>`; }).join('')}
      <text x="503" y="-92" class="sl" text-anchor="middle">${T('GAS COMPRESSION')}</text></g>
    <g data-info="power" class="hot">${box3(568, -40, 62, 37, .8, ['#5c6773', '#8c99a6', '#434d58'])}${[0, 1, 2].map(k => `<rect x="${572 + k * 19}" y="-35" width="15" height="28" fill="#4a5560" stroke="#8fa2b5" stroke-width=".5"/><path d="M${574 + k * 19} -31 h11 M${574 + k * 19} -28 h11 M${574 + k * 19} -25 h11" stroke="#2e3740" stroke-width="1"/><text x="${579.5 + k * 19}" y="-12" font-size="3.4" fill="#e6eef6" text-anchor="middle">GT-${k + 1}</text>`).join('')}
      ${[0, 1, 2].map(k => { const [sx, sy] = pv(.5); return vcyl(574 + k * 19 + sx, -102, 8, 62 + sy, 'url(#gStack)') + `<rect x="${573 + k * 19 + sx}" y="-104" width="10" height="3" fill="#2b3138"/>`; }).join('')}
      <g id="smoke" opacity="0">${[0, 1, 2].map(k => `<circle cx="${590 + k * 19}" cy="-114" r="7" fill="#555" filter="url(#soft)"/>`).join('')}</g><text x="604" y="-120" class="sl" text-anchor="middle">${T('POWER')}</text></g>
    <g data-info="water" class="hot">${frame3(638, -3, 52, 2, 18, .8, `<g transform="translate(${pv(.25).join(' ')})">${[0, 1, 2].map(k => vessel(642, -17 + k * 4.2, 26, 3.6, '#7fb6e0')).join('')}${vessel(642, -34, 30, 11)}</g>`)}${vcyl(682 + pv(.4)[0], -84, 9, 80 + pv(.4)[1], 'url(#gSteelV)')}
      <text x="660" y="-48" class="sl" text-anchor="middle">${T('WATER')}</text></g>
    ${crane3(298, 62, 70)}${crane3(626, 132, 64)}
    <!-- accommodation, bridge, mast, helideck, lifeboats -->
    <g data-info="accommodation" class="hot">${box3(714, -100, 82, 97, .95, ['url(#gWhite)', '#f1f4f7', '#aab5c1'])}
      ${[0, 1, 2, 3, 4, 5].map(k => windows(714, 796, -94 + k * 15, 9)).join('')}<path d="M714 -70 H796 M714 -40 H796" stroke="#9aa6b2" stroke-width=".6"/>
      ${[0, 1, 2, 3, 4].map(k => { const [a, b] = pv(.18 + k * .17); return `<path d="M${796 + a} ${-92 + b} v3" stroke="#ffe7a8" stroke-width="2.4" opacity=".8"/><path d="M${796 + a} ${-62 + b} v3" stroke="#ffe7a8" stroke-width="2.4" opacity=".8"/>`; }).join('')}
      ${box3(722, -112, 64, 12, .7, ['#dfe6ee', '#f4f7fa', '#b5c0cb'])}<rect x="724" y="-109" width="60" height="4" fill="#1d4f7a"/>
      ${(() => { const [mx, my] = pv(.45); return `<path d="M${746 + mx} ${-112 + my} V${-150 + my} M${741 + mx} ${-140 + my} H${751 + mx}" stroke="#c9d2db" stroke-width="1.2"/><circle cx="${746 + mx}" cy="${-152 + my}" r="3" fill="#f4f7fa" stroke="#8a96a2" stroke-width=".5"/><path d="M${737 + mx} ${-134 + my} h18" stroke="#2b3138" stroke-width="1.6"/>`; })()}
      ${lifeboat(722, -26)}${lifeboat(756, -26)}<rect x="778" y="-30" width="6" height="8" rx="2.5" fill="#f4f7fa" stroke="#8a96a2" stroke-width=".4"/><rect x="786" y="-30" width="6" height="8" rx="2.5" fill="#f4f7fa" stroke="#8a96a2" stroke-width=".4"/></g>
    <g data-info="helideck" class="hot">
      ${[[-24, -8], [24, -8], [-16, 14], [20, 14]].map(([u, v]) => { const p = plan(HPX + u, HPY, v); return `<path d="M${p[0]} ${p[1]} L${p[0] - 6 + u * .2} ${p[1] + 22}" stroke="#7d8b99" stroke-width="1.4"/>`; }).join('')}
      <g transform="matrix(1 0 ${PK[0]} ${PK[1]} ${HPX} ${HPY})"><path d="${octagon(31)}" fill="#7d8b99" transform="translate(0 2.5)"/><path d="${octagon(31)}" fill="url(#gNet)" stroke="#b8c4cf" stroke-width="1"/><path d="${octagon(29)}" fill="#2f5d3a"/><path d="${octagon(28)}" fill="#3d4a55"/>
        <circle r="17" fill="none" stroke="#ffe14d" stroke-width="3"/><path d="M-6 -8 V8 M6 -8 V8 M-6 0 H6" stroke="#fff" stroke-width="2.6"/><text y="-21" font-size="5" fill="#fff" text-anchor="middle" transform="scale(1 -1)">8.9t  D 22</text></g>
      <g transform="translate(${HPX + 38} ${HPY - 10})"><path d="M0 0 V12" stroke="#9aa6b2"/><path id="sock" d="M0 0 l10 2 l-1 3 l-9 0z" fill="#ff7a1a"/></g></g>
    <g transform="translate(${HULL1 - 6} -4)">${box3(-10, -8, 12, 8, .4, ['#5c6773', '#8c99a6', '#434d58'])}<circle cx="-4" cy="-4" r="3.2" fill="#2b3640" stroke="#9fb3c8" stroke-width=".6"/></g>
    <g id="crew">${box3(666, -11, 22, 8, .4, ['#e9eef3', '#f4f7fa', '#aab5c1'])}<text x="677" y="-5.5" font-size="2.8" text-anchor="middle" fill="#1d4f7a">ROV CONTROL</text>
      ${CREW.map(([k, x, y, , hat, suit]) => `<g class="cm" data-info="crew_${k}" data-crew="${k}" transform="translate(${x} ${y})"><circle class="ring" cy="-5" r="9" fill="none" stroke="#7dffb0" stroke-width="1.2" opacity="0"/><circle cy="-5" r="7" fill="transparent"/>
        <g class="fig" transform="scale(1.5)">${k === 'crane' ? '<circle cy="-1.3" r="1.25" fill="#d9ad8a"/><path d="M-1.6 -1.5 a1.6 1.7 0 0 1 3.2 0z" fill="#ffd84a"/>' : person(hat, suit)}</g></g>`).join('')}</g>
    <path d="M${HULL0 + 26} -3 H${HULL1}" stroke="#aeb9c4" stroke-width=".7"/>${Array.from({ length: 33 }, (_, k) => `<path d="M${HULL0 + 30 + k * 20} -3 V0" stroke="#aeb9c4" stroke-width=".5"/>`).join('')}
  </g>`;
  // ---- shuttle tanker ----
  h += `<g id="tanker" data-info="tanker" class="hot"><path d="M0 0 H150 C160 0 170 10 170 22 V38 H12 C5 38 0 26 0 16Z" fill="url(#gAF)"/><path d="M0 0 H150 C160 0 168 8 169 16 H2 C1 8 0 4 0 0Z" fill="url(#gUp)"/><path d="M0 0 H150 C160 0 170 10 170 22 V38 H12 C5 38 0 26 0 16Z" fill="none" stroke="#05080c"/>
    <rect x="124" y="-30" width="34" height="30" fill="url(#gWhite)" stroke="#8a96a2" stroke-width=".7"/>${windows(124, 158, -24, 4)}${windows(124, 158, -14, 4)}<rect x="132" y="-40" width="18" height="10" fill="#dfe6ee"/>
    <path d="M10 -2 H120" stroke="#8a97a4" stroke-width="1.6"/><rect x="50" y="-9" width="40" height="7" fill="#4f5b66"/><path d="M6 -2 L4 -16 L14 -16" stroke="#ff7a1a" stroke-width="1.5" fill="none"/><text x="70" y="14" font-size="6" fill="#e9eef3">SHUTTLE TANKER</text></g>
  <g id="tug" data-info="tug" class="hot" visibility="hidden"><path d="M0 -5 H40 Q52 -5 56 1 L51 9 H6 Q0 9 0 3Z" fill="url(#gAF)"/><path d="M0 -5 H40 Q52 -5 56 1 L55 2 H0Z" fill="#1d2329"/>
    ${[8, 18, 28, 38, 47].map(x => `<circle cx="${x}" cy="-1" r="1.8" fill="#14181c"/>`).join('')}<rect x="22" y="-15" width="20" height="10" fill="url(#gWhite)" stroke="#8a96a2" stroke-width=".5"/><rect x="28" y="-22" width="14" height="7" fill="#e9eef3" stroke="#8a96a2" stroke-width=".5"/>
    <rect x="29" y="-20" width="12" height="2.6" fill="#1d4f7a"/><path d="M35 -22 V-32 M31 -28 h8" stroke="#c9d2db" stroke-width=".8"/><rect x="4" y="-9" width="9" height="4" fill="#e2b52c" stroke="#5a4400" stroke-width=".4"/><rect x="16" y="-12" width="3" height="7" fill="#c9d2db"/>
    <text x="30" y="5" font-size="3.6" fill="#e9eef3" text-anchor="middle">SUPPORT TUG</text></g><path id="towline" d="" stroke="#e8e0c8" stroke-width=".9" fill="none"/>
  <path id="hawser" d="" stroke="#e8e0c8" stroke-width="1.3" fill="none"/><path id="hose" d="" stroke="#121a22" stroke-width="4.5" fill="none"/><path id="hoseF" class="flow" d="" stroke="#ffb627" stroke-width="2" fill="none"/>`;
  // ---- helicopter ----
  h += `<g id="heli" data-info="helideck" class="hot" visibility="hidden"><g transform="scale(.6)">${heliShape()}</g></g>`;
  // ---- ROV and TMS ----
  h += `<path id="tether" d="" stroke="#ffcf3a" stroke-width="1" fill="none"/><path id="lars" d="" stroke="#c9d6e3" stroke-width="1.2" fill="none"/>
  <g id="tms" data-info="rov"><rect x="-9" y="-7" width="18" height="14" fill="none" stroke="#ffcf3a" stroke-width="1.6"/><path d="M-9 -7 L9 7 M9 -7 L-9 7" stroke="#ffcf3a" stroke-width=".6"/></g>
  <g id="rov" class="rovg" data-info="rov"><g id="rovFlip"><rect x="-11" y="-7" width="22" height="12" rx="1.5" fill="#ffd84a" stroke="#3a2a00" stroke-width=".8"/><rect x="-11" y="-9" width="22" height="3" fill="#2b3138"/>
    <rect x="-13" y="-2" width="4" height="6" fill="#2b3138"/><rect x="9" y="-2" width="4" height="6" fill="#2b3138"/><circle cx="11" cy="3" r="1.6" fill="#fff6c8" filter="url(#glow)"/><circle cx="11" cy="-4" r="1.6" fill="#fff6c8" filter="url(#glow)"/>
    <path d="M10 5 l6 3 l3 -2" stroke="#9fb3c8" stroke-width="1.2" fill="none"/><path id="rovBeam" d="M12 0 L60 -16 L60 16Z" fill="#fff6c8" opacity=".12"/></g><text x="0" y="1.5" font-size="3.5" font-weight="700" text-anchor="middle" fill="#3a2a00">ROV</text></g>`;
  // sea surface over the hulls, glitter
  h += `<path id="waves" d="" fill="#0f5a86" opacity=".6"/><path id="waveLine" d="" stroke="#cfefff" stroke-width="1.1" fill="none" opacity=".85"/>
  <g id="glit" opacity=".7">${Array.from({ length: 18 }, (_, k) => `<rect x="${760 + (k * 37) % 220}" y="${SEA + 2 + (k * 13) % 26}" width="${8 + (k * 7) % 14}" height="1.2" fill="#ffe2a0"/>`).join('')}</g>
`;
  // ---- night veil and lights (drawn above everything so they glow at dusk and night) ----
  const FLOODS = [[300, -52], [436, -30], [452, -66], [556, -62], [640, -44], [706, -14], [350, -8], [520, -8], [232, -82], [190, -76]];
  h += `<rect id="veil" width="${SW}" height="${SEA + 120}" fill="url(#gVeil)" opacity="0"/>
  <g id="lights" pointer-events="none">
    ${FLOODS.map(([x, y]) => `<path d="M${x - 2} ${y} L${x - 16} ${Math.min(-1, y + 46)} H${x + 16}Z" fill="url(#gCone)" opacity=".55"/><circle cx="${x}" cy="${y}" r="6" fill="url(#gLamp)"/><circle cx="${x}" cy="${y}" r="1.2" fill="#fffbe6"/>`).join('')}
    ${[0, 1, 2, 3, 4, 5].map(k => windows(714, 796, -94 + k * 15, 9)).join('').replace(/opacity="\.85"/g, 'opacity="1" filter="url(#glow)"')}<rect x="724" y="-109" width="36" height="4" fill="#9fe0ff" opacity=".55"/>
    ${[[FLX, -146], [FLX, -80], [TUR, -86], [746 + pv(.45)[0], -156 + pv(.45)[1]], ...CRANES].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="url(#gRed)"/><circle cx="${x}" cy="${y}" r="1.4" fill="#ff5a4a"/>`).join('')}
    ${[[HULL0 + 8, -16], [HULL1 + 10, -18]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="url(#gLamp)"/><circle cx="${x}" cy="${y}" r="1.3" fill="#fff"/>`).join('')}
    <circle id="flareGlow" cx="${FLX}" cy="${FLY - 18}" r="60" fill="url(#gFlare)"/>
    <g transform="matrix(1 0 ${PK[0]} ${PK[1]} ${HPX} ${HPY})">
      ${Array.from({ length: 24 }, (_, k) => { const a = k / 24 * 2 * Math.PI; return `<circle cx="${(29.5 * Math.cos(a)).toFixed(1)}" cy="${(29.5 * Math.sin(a)).toFixed(1)}" r="1.5" fill="#5dff8a" filter="url(#glow)"/>`; }).join('')}
      ${Array.from({ length: 16 }, (_, k) => { const a = k / 16 * 2 * Math.PI; return `<circle cx="${(17 * Math.cos(a)).toFixed(1)}" cy="${(17 * Math.sin(a)).toFixed(1)}" r="1.3" fill="#ffe14d" filter="url(#glow)"/>`; }).join('')}
      ${[[-6, -8], [-6, -3], [-6, 3], [-6, 8], [6, -8], [6, -3], [6, 3], [6, 8], [-2, 0], [2, 0]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#5dff8a"/>`).join('')}
      <g id="hStat" opacity="0">${[[-31, 0], [31, 0]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="url(#gRed)"/><circle cx="${x}" cy="${y}" r="2" fill="#ff3030"/>`).join('')}</g>
    </g>
    <path d="M${HPX - 34} ${HPY + 9} l-8 -4 M${HPX + 40} ${HPY - 9} l8 -2" stroke="#fffbe6" stroke-width="1.4"/><circle cx="${HPX - 42}" cy="${HPY + 5}" r="8" fill="url(#gLamp)" opacity=".8"/><circle cx="${HPX + 48}" cy="${HPY - 11}" r="8" fill="url(#gLamp)" opacity=".8"/>
  </g>
  <g id="tkLights" pointer-events="none">${windows(124, 158, -24, 4).replace(/opacity="\.85"/g, 'opacity="1"')}${windows(124, 158, -14, 4).replace(/opacity="\.85"/g, 'opacity="1"')}<circle cx="141" cy="-44" r="5" fill="url(#gLamp)"/><circle cx="141" cy="-44" r="1.2" fill="#fff"/><circle cx="2" cy="-4" r="5" fill="url(#gLamp)"/><circle cx="168" cy="-2" r="5" fill="url(#gLamp)"/><circle cx="70" cy="-12" r="9" fill="url(#gLamp)" opacity=".7"/></g>
  <g id="tugLights" pointer-events="none" visibility="hidden"><circle cx="35" cy="-33" r="4" fill="url(#gLamp)"/><circle cx="35" cy="-33" r="1" fill="#fff"/><rect x="29" y="-20" width="12" height="2.6" fill="#ffe7a8" opacity=".8"/><path d="M4 -8 L-8 4 H14Z" fill="url(#gCone)" opacity=".4"/></g>
  <g id="heliLights" pointer-events="none" visibility="hidden"><g transform="scale(.6)"><path id="heliBeam" d="M8 4 L40 70 H-20Z" fill="url(#gCone)" opacity="0"/><circle id="heliBcn" cx="-6" cy="-15" r="4" fill="url(#gRed)"/><circle cx="-6" cy="-15" r="1.4" fill="#ff4040" class="bk"/><circle cx="-47" cy="-12" r="1.4" fill="#fff"/><circle cx="2" cy="0" r="1.6" fill="#40ff70"/></g></g>`;

  h += `</g>`;  // end world
  // ---- labels (not part of the world, so the ROV camera stays clean) ----
  h += `<g id="labels">${callout(8, 40, 'turret', 'TURRET MOORING', 'Keeps the FPSO on station', 200)}${callout(290, 6, 'separator', 'PROCESSING', 'Separates oil, gas and water', 210)}
    ${callout(520, 6, 'compression', 'GAS COMPRESSION', 'Export, lift and fuel gas', 210)}${callout(906, 6, 'helideck', 'HELIDECK', 'Crew change by helicopter', 180)}${callout(906, 150, 'tanker', 'SHUTTLE TANKER', 'Receives crude oil', 180)}
    ${callout(560, 300, 'storage', 'CRUDE OIL STORAGE', 'Stored in the hull tanks', 210)}${callout(330, 360, 'risers', 'RISERS', 'Well fluids to the FPSO', 170)}${callout(560, 452, 'manifold', 'SUBSEA MANIFOLD', 'Combines production from wells', 230)}
    ${callout(8, 462, 'flowlines', 'FLOWLINES', 'Connect wells to the manifold', 220)}${callout(758, 500, 'wells', 'SUBSEA WELLHEADS', 'Control production from the reservoir', 236)}${callout(560, 676, 'reservoir', 'RESERVOIR', 'Oil, gas and water', 170)}
    ${callout(8, 116, 'flare', 'FLARE', 'Safe disposal of excess gas', 200)}
    <g transform="translate(36 205)"><circle r="20" fill="#0b1e36cc" stroke="#4f6c8a"/><path id="windArrow" d="M0 -14 L5 0 H2 V14 H-2 V0 H-5Z" fill="#dcecff"/><text y="34" class="sl" text-anchor="middle" id="windTxt">—</text></g></g>`;
  $('scene').innerHTML = `<style>.sl{font:10.5px system-ui,sans-serif;fill:#cfe3f7}.gl{font:9px system-ui,sans-serif;fill:#c9b896}.co rect{fill:#071425e6;stroke:#ffcf3a;stroke-width:1}.ct{font:700 13px system-ui,sans-serif;fill:#ffcf3a;letter-spacing:.03em}.cs{font:12px system-ui,sans-serif;fill:#e6f0fa}.co,.hot,.rovg{cursor:pointer}.co:hover rect{stroke:#fff}.hot:hover{filter:brightness(1.2)}</style>` + h;
  SC.cm = null;
  for (const id of ['hull', 'hullUpper', 'tanker', 'hawser', 'hose', 'hoseF', 'waves', 'waveLine', 'flameG', 'flame', 'flame2', 'smoke', 'sepLiq', 'cA', 'cB', 'windArrow', 'windTxt', 'rs0', 'rs1', 'rsGl', 'rsWi', 'umb', 'flWi', 'dhWi',
    'ct0', 'ct1', 'ct2', 'ct3', 'ct4', 'ml0', 'ml1', 'ml2', 'ml3', 'ml4', 'dh0', 'dh1', 'dh2', 'dh3', 'fl0', 'fl1', 'fl2', 'fl3', 'tl0', 'tl1', 'tl2', 'tl3', 'heli', 'heliRotor', 'heliTail', 'sock',
    'sky', 'sunG', 'glit', 'rays', 'stars', 'veil', 'lights', 'tkLights', 'heliLights', 'tug', 'tugLights', 'towline', 'crew', 'heliBeam', 'heliBcn', 'flareGlow', 'hStat', 'rov', 'rovFlip', 'rovBeam', 'tms', 'tether', 'lars', 'labels', 'co_separator', 'co_storage', 'co_compression', 'co_tanker', 'co_risers', 'co_manifold', 'co_wells', 'co_reservoir', 'co_flare', 'co_turret', 'co_flowlines', 'co_helideck']) SC[id] = document.getElementById(id);
  bindRov(); setLight(light);
}
let light = 'dusk';
function setLight(m) { light = m; if (!SC.sky) return; const L = { day: ['gSkyD', 0, 0.2], dusk: ['gSky', 0.14, 0.85], night: ['gSkyN', 0.6, 1] }[m] || [];
  SC.sky.setAttribute('fill', `url(#${L[0]})`); SC.sunG.setAttribute('visibility', m === 'dusk' ? 'visible' : 'hidden'); SC.stars.setAttribute('visibility', m === 'night' ? 'visible' : 'hidden'); SC.glit.setAttribute('visibility', m === 'dusk' ? 'visible' : 'hidden'); SC.rays.setAttribute('opacity', m === 'night' ? 0.03 : 0.14);
  SC.veil.setAttribute('opacity', L[1]); for (const g of [SC.lights, SC.tkLights, SC.tugLights]) g.setAttribute('opacity', L[2]); }
function draftMarks(x) { let s = ''; for (let m = 8; m <= 24; m += 2) { const y = HD - m * PX; s += `<path d="M${x} ${y} h5" stroke="#fff" stroke-width=".6"/>${m % 4 === 0 ? `<text x="${x + 6.5}" y="${y + 1.6}" font-size="4.2" fill="#fff">${m}M</text>` : ''}`; } return s; }
function callout(x, y, key, title, sub, w) { const tx = rtl() ? `x="${w - 8}" style="direction:rtl;unicode-bidi:embed"` : 'x="8"', tv = rtl() ? `x="${w - 8}" text-anchor="end"` : 'x="8"'; return `<g class="co" data-info="${key}" transform="translate(${x} ${y})"><rect width="${w}" height="40" rx="3"/><text ${tx} y="16" class="ct">${T(title)}</text><text ${tv} y="33" class="cs" id="co_${key}">${T(sub)}</text></g>`; }

/* ---------- per-frame update ---------- */
const A = { wave: 0, rot: 0 };
function flowAnim(el, q, qRef) {
  if (!el) return;
  if (q > qRef * 0.002) { el.style.animationPlayState = 'running'; el.style.animationDuration = clamp(2.2 * qRef / Math.max(q, 1e-9), 0.3, 8).toFixed(2) + 's'; el.style.opacity = 1; }
  else { el.style.animationPlayState = 'paused'; el.style.opacity = 0.2; }
}
const tensionCol = r => r > 0.55 ? '#ff4545' : r > 0.4 ? '#ffb627' : '#e8e0c8';
const TK_TXT = { none: 'No tanker', approaching: 'Approaching', hookup: 'Connecting hawser & hose', offloading: 'Offloading', disconnect: 'Disconnecting', departing: 'Departing' };
let deck = { y: 200, heave: 0 };
function update(sim, dtA, dtR) {
  const s = sim.s, d = sim.d, c = sim.c;
  A.wave += dtA; A.rot += dtR;
  const draft = d.draft || 12, yDeck = SEA - (32 - draft) * PX, heave = Math.sin(A.wave * 0.9) * Math.min(c.env.hs, 8) * 0.35;
  deck = { y: yDeck, heave };
  SC.hull.setAttribute('transform', `translate(0 ${(yDeck + heave).toFixed(2)})`); SC.lights.setAttribute('transform', `translate(0 ${(yDeck + heave).toFixed(2)})`);
  const frac = s.cargo / CFG.cargo.cap, th = (HD - 16) * frac;
  for (let k = 0; k < 5; k++) { SC['ct' + k].setAttribute('y', HD - 10 - th); SC['ct' + k].setAttribute('height', Math.max(0, th)); }
  const amp = 1.5 + Math.min(c.env.hs, 9) * 1.4; let p = `M0 ${SEA + 40} V${SEA}`, l = '';
  for (let x = 0; x <= SW; x += 20) { const y = SEA + Math.sin(x / 38 + A.wave * 1.6) * amp * 0.6 + Math.sin(x / 91 - A.wave) * amp * 0.4; p += ` L${x} ${y.toFixed(1)}`; l += (x ? ' L' : 'M') + `${x} ${y.toFixed(1)}`; }
  SC.waves.setAttribute('d', p + ` V${SEA + 40} Z`); SC.waveLine.setAttribute('d', l);
  // flare: size with flare rate, leaning downwind (side view: component of wind along the hull)
  const fl = s.sep.flareQ, sc = clamp(0.35 + Math.sqrt(fl) * 1.4, 0.35, 3.2) * (0.9 + 0.1 * Math.sin(A.rot * 9));
  const lean = clamp(Math.sin((c.env.windDir - 90) * Math.PI / 180) * c.env.wind / 30, -1, 1) * 30;
  SC.flameG.setAttribute('transform', `translate(${FLX} ${FLY}) rotate(${lean.toFixed(1)}) scale(${sc.toFixed(2)}) translate(${-FLX} ${-FLY})`);
  SC.flareGlow.setAttribute('r', (30 + 40 * sc).toFixed(0)); SC.flareGlow.setAttribute('cx', (FLX + lean * 0.6).toFixed(1));
  SC.sock.setAttribute('transform', `scale(${(Math.sign(-lean) || 1) * clamp(c.env.wind / 15, 0.3, 1)} 1)`);
  SC.smoke.setAttribute('opacity', s.power.diesel ? 0.7 : 0);
  { const lh = 13 * clamp(s.sep.LT / 100, 0, 1); SC.sepLiq.setAttribute('height', lh.toFixed(1)); SC.sepLiq.setAttribute('y', (-5.5 - lh).toFixed(1)); }
  SC.cA.setAttribute('fill', s.comp.tripped[0] ? '#ff4545' : c.comp[0] ? '#2bd66f' : '#28384b'); SC.cB.setAttribute('fill', s.comp.tripped[1] ? '#ff4545' : c.comp[1] ? '#2bd66f' : '#28384b');
  const qL = s.wellsQin.L;
  s.wells.forEach((w, i) => { flowAnim(SC['dh' + i], w.q, 5000); flowAnim(SC['fl' + i], w.q, 5000); SC['tl' + i].setAttribute('fill', w.q > 50 ? '#2bd66f' : c.wells[i].open && w.ch > 5 ? '#ffb627' : '#ff4545'); });
  flowAnim(SC.rs0, qL / 2, 9000); flowAnim(SC.rs1, qL / 2, 9000); flowAnim(SC.rsGl, s.gasUse.lift, 0.5); flowAnim(SC.rsWi, s.wi.q, 20000); flowAnim(SC.flWi, s.wi.q, 20000); flowAnim(SC.dhWi, s.wi.q, 20000); flowAnim(SC.umb, 1, 2);
  const Tl = s.moor.T || []; ANCH.forEach(([, j]) => { const t = Math.max(Tl[j] || 0, Tl[j + 4] || 0); SC['ml' + j].setAttribute('stroke', s.moor.failed[j] ? '#ff4545' : tensionCol(t / CFG.moor.MBL)); SC['ml' + j].setAttribute('stroke-dasharray', s.moor.failed[j] ? '4 4' : ''); });
  // shuttle tanker
  const tk = s.tanker, Tc = CFG.tanker, TX0 = 838, TXF = SW + 90; let tx = TXF;
  if (tk.st === 'approaching') tx = TXF - (TXF - TX0) * clamp(tk.t / Tc.approach, 0, 1); else if (['hookup', 'offloading', 'disconnect'].includes(tk.st)) tx = TX0; else if (tk.st === 'departing') tx = TX0 + (TXF - TX0) * clamp(tk.t / Tc.depart, 0, 1);
  const tDraft = 6 + 12 * tk.cargo / Tc.cap, ty = SEA - (20 - tDraft) * 1.4 + Math.sin(A.wave * 1.1 + 1) * Math.min(c.env.hs, 8) * 0.45;
  SC.tanker.setAttribute('transform', `translate(${tx} ${ty.toFixed(1)}) scale(.95)`); SC.tkLights.setAttribute('transform', `translate(${tx} ${ty.toFixed(1)}) scale(.95)`);
  // support (hold-back) tug: follows the tanker in, holds its stern on a towline during hook-up and offloading
  { const tied = ['hookup', 'offloading', 'disconnect'].includes(tk.st), gx = tx + 166 + (tied ? 26 + Math.sin(A.wave * 0.7) * 2 : 14), gy = SEA - 3 + Math.sin(A.wave * 1.3 + 2) * Math.min(c.env.hs, 8) * 0.6;
    const vis = tk.st !== 'none'; SC.tug.setAttribute('visibility', vis ? 'visible' : 'hidden'); SC.tugLights.setAttribute('visibility', vis ? 'visible' : 'hidden');
    SC.tug.setAttribute('transform', `translate(${gx.toFixed(1)} ${gy.toFixed(1)})`); SC.tugLights.setAttribute('transform', `translate(${gx.toFixed(1)} ${gy.toFixed(1)})`);
    SC.towline.setAttribute('d', vis && tied ? `M${tx + 160} ${ty + 2} Q${(tx + 163 + gx) / 2} ${SEA + 4} ${gx + 4} ${gy - 3}` : ''); }
  const conn = ['offloading', 'hookup', 'disconnect'].includes(tk.st) && tx < 900, sx = HULL1, sy = yDeck + heave + 4;
  SC.hawser.setAttribute('d', conn ? `M${sx} ${sy} Q${(sx + tx) / 2} ${SEA + 6} ${tx + 4} ${ty + 4}` : '');
  const hp = conn && tk.st !== 'hookup' ? `M${sx - 4} ${sy + 8} Q${(sx + tx) / 2} ${SEA + 20} ${tx + 6} ${ty + 10}` : '';
  SC.hose.setAttribute('d', hp); SC.hoseF.setAttribute('d', hp); flowAnim(SC.hoseF, tk.st === 'offloading' ? c.offRate : 0, 6000);
  // helicopter: inbound from the north-east, lands on the helideck, departs
  const hk = s.heli, H = CFG.heli, padX = HPX, padY = yDeck + heave + HPY - 3;
  let hx = padX, hy = padY, vis = true, spin = 1;
  if (hk.st === 'inbound') { const u = clamp(hk.t / H.inbound, 0, 1), e = 1 - (1 - u) * (1 - u); hx = SW + 80 + (padX - SW - 80) * e; hy = 30 + (padY - 30) * Math.min(1, e * 1.05); }
  else if (hk.st === 'outbound') { const u = clamp(hk.t / H.outbound, 0, 1); hx = padX + (SW + 100 - padX) * u * u; hy = padY + (20 - padY) * Math.min(1, u * 1.4); }
  else if (hk.st === 'landed') { spin = hk.t < 120 || hk.t > H.onDeck - 120 ? 1 : 0; }
  else vis = false;
  SC.heli.setAttribute('visibility', vis ? 'visible' : 'hidden'); SC.heli.setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`);
  SC.heliLights.setAttribute('visibility', vis ? 'visible' : 'hidden'); SC.heliLights.setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`);
  SC.heliBeam.setAttribute('opacity', hk.st === 'inbound' && hk.t > H.inbound * 0.6 ? 0.9 : 0); SC.heliBcn.setAttribute('opacity', Math.sin(A.rot * 6) > 0 ? 1 : 0.15);
  { const fly = c.env.wind <= H.windMax && c.env.hs <= H.hsMax && !c.esd; SC.hStat.setAttribute('opacity', !fly && Math.sin(A.rot * 5) > 0 ? 1 : 0); }
  SC.heliRotor.setAttribute('transform', `translate(-3 -14) scale(${spin ? Math.cos(A.rot * 40).toFixed(2) : 1} 1) translate(3 14)`); SC.heliTail.setAttribute('transform', `translate(-48 -9) scale(1 ${spin ? Math.cos(A.rot * 70).toFixed(2) : 1})`);
  SC.windArrow.setAttribute('transform', `rotate(${(c.env.windDir + 180).toFixed(0)})`); SC.windTxt.textContent = fu('spd', c.env.wind, 0);
  // callout values
  SC.co_separator.textContent = `${fu('press', s.sep.P, 1)} · ${iso(T('level'))} ${nf(s.sep.LT, 0)} %`; SC.co_storage.textContent = `${fu('vol', s.cargo, 0)} · ${nf(frac * 100, 0)} %`;
  SC.co_compression.textContent = `${fu('gas', s.comp.q, 2)} · ${nf(s.comp.power, 1)} MW`; SC.co_tanker.textContent = T(TK_TXT[tk.st]); SC.co_risers.textContent = fu('liq', qL, 0);
  SC.co_manifold.textContent = fu('press', s.Pman, 1); SC.co_flare.textContent = fu('gas', s.sep.flareQ, 2); SC.co_reservoir.textContent = fu('press', s.Pr, 0);
  SC.co_turret.textContent = `${iso(T('offset'))} ${fu('len', s.moor.offset, 0)}`; SC.co_flowlines.textContent = fu('temp', s.Tarr, 0); SC.co_helideck.textContent = iso(T(HELI_TXT[hk.st])) + ` · POB ${hk.pob}`;
  // crew: walk back and forth at their work place; highlighted member pulses
  if (!SC.cm) SC.cm = [...document.querySelectorAll('#crew .cm')].map((el, i) => ({ el, c: CREW[i], fig: el.querySelector('.fig'), ring: el.querySelector('.ring'), lg: el.querySelectorAll('.lg') }));
  SC.cm.forEach(({ el, c: [k, x0, y0, amp], fig, ring, lg }, i) => {
    const ph = A.rot * 0.35 + i * 1.7, x = x0 + amp * Math.sin(ph), dir = Math.cos(ph) >= 0 ? 1 : -1, sw = amp ? Math.sin(A.rot * 7 + i) * 18 : 0;
    el.setAttribute('transform', `translate(${x.toFixed(1)} ${y0})`); fig.setAttribute('transform', `scale(${1.5 * dir} 1.5)`);
    lg[0] && lg[0].setAttribute('transform', `rotate(${sw.toFixed(0)} -.7 -1.6)`); lg[1] && lg[1].setAttribute('transform', `rotate(${(-sw).toFixed(0)} .7 -1.6)`);
    ring.setAttribute('opacity', hiKey === k && hiT > A.rot ? (0.5 + 0.5 * Math.sin(A.rot * 8)).toFixed(2) : 0); });
  updateRov(sim, dtR);
}
let hiKey = null, hiT = 0;
function highlight(k) { hiKey = k; hiT = A.rot + 6; }
const HELI_TXT = { none: 'No flight', inbound: 'Helicopter inbound', landed: 'On the helideck', outbound: 'Departing' };

/* ---------- ROV: drive, tether, camera ---------- */
const TARGETS = {
  hull: ['Hull & draft marks', 'storage', () => [HULL0 + 50, deck.y + deck.heave + HD - 14 + 0]],
  turret: ['Turret chain table & fairleads', 'turret', () => [TUR + 4, deck.y + deck.heave + HD + 16]],
  buoy: ['Lazy-wave buoyancy modules', 'risers', () => [TUR + 128, 440]],
  ssiv: ['Riser base & SSIV', 'risers', () => [MAN - 70, BED - 22]],
  manifold: ['Manifold M-1', 'manifold', () => [MAN, BED - 26]],
  t0: ['Tree XT P-1', 'wells', () => [TREES[0], BED - 22]], t1: ['Tree XT P-2', 'wells', () => [TREES[1], BED - 22]],
  t2: ['Tree XT P-3', 'wells', () => [TREES[2], BED - 22]], t3: ['Tree XT P-4', 'wells', () => [TREES[3], BED - 22]],
  wi: ['Water injection tree WI-1', 'injection', () => [WIX, BED - 16]],
  touchdown: ['Mooring touchdown & chain', 'turret', () => [118, BED - 8]], anchor: ['Suction pile anchor', 'turret', () => [22, BED - 6]],
};
function rovTo(key) { const t = TARGETS[key]; if (!t) return; rov.key = key; const [x, y] = t[2](); rov.side = rov.x <= x ? 1 : -1; if (x - rov.side * stand() < 10) rov.side = -1; if (x - rov.side * stand() > SW - 10) rov.side = 1; rov.tx = x - rov.side * stand(); rov.ty = y; rov.follow = true; }
function nudge(dx, dy) { rov.follow = false; if (dx) rov.side = dx > 0 ? 1 : -1; rov.tx = clamp(rov.tx + dx, 10, SW - 10); rov.ty = clamp(rov.ty + dy, SEA + 14, BED - 4); rov.key = nearestKey(rov.tx + rov.side * stand(), rov.ty); }
function lookAt(x, y) { rov.follow = false; rov.side = rov.dir; rov.tx = clamp(x - rov.side * stand(), 10, SW - 10); rov.ty = clamp(y, SEA + 14, BED - 4); rov.key = nearestKey(x, y); }
function nearestKey(x, y) { let best = null, bd = 1e9; for (const [k, t] of Object.entries(TARGETS)) { const [tx, ty] = t[2](); const dd = Math.hypot(tx - x, ty - y); if (dd < bd) { bd = dd; best = k; } } return bd < 70 ? best : null; }
function updateRov(sim, dtR) {
  if (rov.follow && TARGETS[rov.key]) { const [x, y] = TARGETS[rov.key][2](); rov.tx = x - rov.side * stand(); rov.ty = y; }
  rov.ty = clamp(rov.ty, SEA + 14, BED - 4);
  const dx = rov.tx - rov.x, dy = rov.ty - rov.y, dist = Math.hypot(dx, dy), v = Math.min(dist, 90 * dtR);
  if (dist > 0.3) { rov.x += dx / dist * v; rov.y += dy / dist * v; if (Math.abs(dx) > 2) rov.dir = dx > 0 ? 1 : -1; }
  if (dist < 2) rov.dir = rov.side;
  SC.rov.setAttribute('transform', `translate(${rov.x.toFixed(1)} ${rov.y.toFixed(1)})`); SC.rovFlip.setAttribute('transform', `scale(${rov.dir} 1)`);
  SC.rovBeam.setAttribute('opacity', rov.lights ? 0.14 : 0);
  // TMS hangs from the launch system at the side of the hull; tether to the ROV
  const lx = 700, ly = deck.y + deck.heave - 4, tmsY = clamp(rov.y - 70, SEA + 30, BED - 60), tmsX = lx + (rov.x - lx) * 0.25;
  SC.lars.setAttribute('d', `M${lx} ${ly} L${tmsX} ${tmsY - 7}`); SC.tms.setAttribute('transform', `translate(${tmsX.toFixed(1)} ${tmsY.toFixed(1)})`);
  SC.tether.setAttribute('d', `M${tmsX} ${tmsY + 7} Q${(tmsX + rov.x) / 2} ${Math.max(tmsY, rov.y) + 30} ${rov.x} ${rov.y - 6}`);
  if (camOn) drawCam(sim);
}
let camOn = true;
function bindRov() {
  const svg = $('scene'); let drag = false;
  const pt = e => { const m = svg.getScreenCTM(); if (!m) return null; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return [p.x, p.y]; };
  SC.rov.addEventListener('pointerdown', e => { drag = true; SC.rov.setPointerCapture && SC.rov.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); });
  SC.rov.addEventListener('pointermove', e => { if (!drag) return; const p = pt(e); if (p) { rov.follow = false; if (Math.abs(p[0] - rov.tx) > 1) rov.side = p[0] > rov.tx ? 1 : -1; rov.tx = clamp(p[0], 10, SW - 10); rov.ty = clamp(p[1], SEA + 14, BED - 4); rov.key = nearestKey(rov.tx + rov.side * stand(), rov.ty); } });
  ['pointerup', 'pointercancel'].forEach(ev => SC.rov.addEventListener(ev, () => { drag = false; }));
}
function depthOf(y) { return clamp((y - SEA) / (BED - SEA), 0, 1) * CFG.wd; }
function tempOf(z) { return 4 + 22 * Math.exp(-z / 180); }
function drawCam(sim) {
  const cam = $('camSvg'); if (!cam) return;
  const W = cam.clientWidth || 600, Hh = cam.clientHeight || 340, w = 1000 / rov.zoom, h = w * Hh / W;
  cam.setAttribute('viewBox', `${(rov.x + rov.dir * stand() - w / 2).toFixed(1)} ${(rov.y - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  const z = depthOf(rov.y), dark = clamp(z / CFG.wd, 0, 1);
  const shade = $('camShade'); if (shade) shade.style.background = rov.lights ? `radial-gradient(ellipse 55% 60% at ${rov.dir > 0 ? 60 : 40}% 52%, rgba(255,250,220,${0.06 * (1 - dark)}) 0%, rgba(2,10,20,${(0.15 + 0.55 * dark).toFixed(2)}) 55%, rgba(0,4,10,${(0.35 + 0.6 * dark).toFixed(2)}) 100%)` : `rgba(0,6,14,${(0.3 + 0.65 * dark).toFixed(2)})`;
  const s = sim.s, key = rov.key, t = TARGETS[key];
  const live = liveFor(sim, key);
  const hud = $('camHud'); if (hud) hud.innerHTML = `<div>ROV-1 · ${T('DEPTH')} <b>${fu('len', z, 0)}</b> · ${T('HDG')} <b>${rov.dir > 0 ? '090' : '270'}°</b> · <b>${fu('temp', tempOf(z), 1)}</b></div><div class="tg">${t ? '◎ ' + T(t[0]) : T('Free flight — drag the ROV or use the arrows')}</div>${live ? `<div class="lv">${live}</div>` : ''}<div class="rec">● REC ${new Date(sim.clockMs()).toISOString().slice(11, 19)}</div>`;
  const ex = $('camExplain'); if (ex) { ex.disabled = !t; ex.dataset.info = t ? t[1] : ''; }
}
function liveFor(sim, key) {
  const s = sim.s; if (!key) return '';
  const m = /^t(\d)$/.exec(key);
  if (m) { const w = s.wells[+m[1]]; return `WHP ${fu('press', w.Pwh, 0)} · ${T('choke')} ${w.ch.toFixed(0)} % · ${T('oil')} ${fu('liq', w.qo, 0)}`; }
  switch (key) {
    case 'manifold': return `${T('Manifold pressure')} ${fu('press', s.Pman, 1)} · ${fu('temp', s.Tarr, 0)}`;
    case 'ssiv': case 'buoy': return `${T('Riser flow')} ${fu('liq', s.wellsQin.L, 0)} · ${T('slugging')} ${nf(s.slug, 2)}`;
    case 'turret': case 'touchdown': case 'anchor': return `${T('offset')} ${fu('len', s.moor.offset, 1)} · Tmax ${fu('force', Math.max(...(s.moor.T || [0])), 0)}`;
    case 'hull': return `${T('Draft')} ${fu('len', sim.d.draft, 1)} · ${T('cargo')} ${nf(s.cargo / CFG.cargo.cap * 100, 0)} %`;
    case 'wi': return `${T('Seawater injection')} ${fu('liq', s.wi.q, 0)}`;
  }
  return '';
}
return { build, update, highlight, CREW: CREW.map(c => c[0]), setCam: on => { camOn = on; }, rovTo, nudge, lookAt, setLight, light: () => light, rov, TARGETS, setLabels: on => { if (SC.labels) SC.labels.style.display = on ? '' : 'none'; } };
};

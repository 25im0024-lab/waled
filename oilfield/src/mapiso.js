/* ===== Isometric production facility with operator controls ===== */
function isoTubeX(P, x0, x1, cy, cz, r, col) {
  let s = ''; const N = 20;
  for (let i = 0; i < N; i++) {
    const a0 = i / N * 6.2832, a1 = (i + 1) / N * 6.2832, am = (a0 + a1) / 2, nY = Math.cos(am), nZ = Math.sin(am);
    if (nY + nZ < -0.05) continue;
    const q = [P(x0, cy + r * Math.cos(a0), cz + r * Math.sin(a0)), P(x1, cy + r * Math.cos(a0), cz + r * Math.sin(a0)), P(x1, cy + r * Math.cos(a1), cz + r * Math.sin(a1)), P(x0, cy + r * Math.cos(a1), cz + r * Math.sin(a1))];
    const c = shade(col, (nZ * 0.8 + nY * 0.25 - 0.1) * 0.55); s += `<polygon points="${pts(q)}" style="fill:${c};stroke:${c};stroke-width:.5"/>`;
  }
  const ring = []; for (let a = 0; a < 360; a += 15) ring.push(P(x1, cy + r * Math.cos(a * Math.PI / 180), cz + r * Math.sin(a * Math.PI / 180)));
  return s + `<polygon points="${pts(ring)}" style="fill:${shade(col, -0.12)};stroke:rgba(0,0,0,.45);stroke-width:.7"/>`;
}
function isoTubeY(P, y0, y1, cx, cz, r, col) {
  let s = ''; const N = 20;
  for (let i = 0; i < N; i++) {
    const a0 = i / N * 6.2832, a1 = (i + 1) / N * 6.2832, am = (a0 + a1) / 2, nX = Math.cos(am), nZ = Math.sin(am);
    if (nX + nZ < -0.05) continue;
    const q = [P(cx + r * Math.cos(a0), y0, cz + r * Math.sin(a0)), P(cx + r * Math.cos(a0), y1, cz + r * Math.sin(a0)), P(cx + r * Math.cos(a1), y1, cz + r * Math.sin(a1)), P(cx + r * Math.cos(a1), y0, cz + r * Math.sin(a1))];
    const c = shade(col, (nZ * 0.8 + nX * 0.25 - 0.1) * 0.55); s += `<polygon points="${pts(q)}" style="fill:${c};stroke:${c};stroke-width:.5"/>`;
  }
  const ring = []; for (let a = 0; a < 360; a += 15) ring.push(P(cx + r * Math.cos(a * Math.PI / 180), y1, cz + r * Math.sin(a * Math.PI / 180)));
  return s + `<polygon points="${pts(ring)}" style="fill:${shade(col, -0.12)};stroke:rgba(0,0,0,.45);stroke-width:.7"/>`;
}
function numP(P, x, y, z, n, dx = 0, dy = 0) { const [sx, sy] = P(x, y, z); return `<g class="badgeN" pointer-events="none"><circle cx="${(sx + dx).toFixed(1)}" cy="${(sy + dy).toFixed(1)}" r="11"/><text x="${(sx + dx).toFixed(1)}" y="${(sy + dy + 4.5).toFixed(1)}" text-anchor="middle">${n}</text></g>`; }

const OPS = { run: true, choke: 70, comp: true, exp: false, esd: false, spd: 12, last: 0, A: 0.32, B: 0.28, reason: '', alarm: [] };
const MAPK = 6.3, MAPX = 330, MAPY = 118;
function mapIsoSVG() {
  const k = MAPK, P = mkP(k, MAPX, MAPY), defs = new Map();
  const gid = col => { const id = 'mg' + col.slice(1); if (!defs.has(id)) defs.set(id, `<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${shade(col, 0.1)}"/><stop offset=".4" stop-color="${shade(col, 0.32)}"/><stop offset="1" stop-color="${shade(col, -0.35)}"/></linearGradient>`); return id; };
  const cyl = (cx, cy, z, r, h, col) => isoCyl(P, k, gid, cx, cy, z, r, h, col), box = (x, y, z, w, d, h, col, o) => isoBox(P, x, y, z, w, d, h, col, o);
  const tubeX = (x0, x1, cy, cz, r, col) => isoTubeX(P, x0, x1, cy, cz, r, col), tubeY = (y0, y1, cx, cz, r, col) => isoTubeY(P, y0, y1, cx, cz, r, col);
  const pl = (arr, cls) => `<polyline class="pl ${cls}" points="${pts(arr.map(a => P(a[0], a[1], a[2] ?? 0.9)))}"/>`;
  /* ground */
  let ground = `<polygon points="${pts([P(-12, -12, 0), P(108, -12, 0), P(108, 36, 0), P(-12, 36, 0)])}" style="fill:var(--earth);stroke:var(--line)"/><polygon points="${pts([P(-10, -10, 0), P(106, -10, 0), P(106, 34, 0), P(-10, 34, 0)])}" style="fill:color-mix(in srgb,var(--earth) 78%,#fff 22%)"/>`;
  for (let i = 0; i < 380; i++) { const x = -10 + hash(i, 1) * 116, y = -10 + hash(i, 2) * 44, p = P(x, y, 0); ground += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(0.6 + hash(i, 3) * 1.1).toFixed(1)}" style="fill:rgba(0,0,0,${(0.05 + hash(i, 4) * 0.08).toFixed(2)})"/>`; }
  ground += `<polygon points="${pts([P(-12, 36.5, 0), P(108, 36.5, 0), P(108, 40, 0), P(-12, 40, 0)])}" style="fill:var(--earth2)"/>`;
  /* underground block (reservoir + well) */
  const X0 = -9, X1 = 15, Y0 = 6, Y1 = 26, ZB = -12, layers = [[0, -2, 'soil'], [-2, -6, 'bar'], [-6, -9, 'pay'], [-9, -12, 'bar']];
  const fill = n => n === 'soil' ? 'var(--earth)' : n === 'pay' ? 'color-mix(in srgb,var(--oil-bg) 70%,var(--earth) 30%)' : 'color-mix(in srgb,var(--earth2) 88%,#000 12%)';
  let u1 = `<polygon points="${pts([P(X0, Y0, ZB), P(X1, Y0, ZB), P(X1, Y1, ZB), P(X0, Y1, ZB)])}" style="fill:color-mix(in srgb,var(--earth2) 70%,#000 30%)"/>`;
  layers.forEach(([z0, z1, n]) => { u1 += `<polygon points="${pts([P(X0, Y0, z0), P(X0, Y1, z0), P(X0, Y1, z1), P(X0, Y0, z1)])}" style="fill:${fill(n)};stroke:rgba(0,0,0,.25);stroke-width:.6"/><polygon points="${pts([P(X0, Y0, z0), P(X1, Y0, z0), P(X1, Y0, z1), P(X0, Y0, z1)])}" style="fill:color-mix(in srgb,${fill(n)} 90%,#000 10%);stroke:rgba(0,0,0,.25);stroke-width:.6"/>`; });
  [-6, -9].forEach((z, i) => { u1 += `<polygon points="${pts([P(X0, Y0, z), P(X1, Y0, z), P(X1, Y1, z), P(X0, Y1, z)])}" style="fill:${fill('pay')};opacity:${i ? 0.34 : 0.2};stroke:var(--oil);stroke-opacity:.5;stroke-dasharray:4 3"/>`; });
  let u2 = ''; /* well (stage 2) */
  const wx = 3, wy = 16;
  u2 += `<path d="M${P(wx - 0.5, wy, 0.2)}L${P(wx - 0.5, wy, -8)}M${P(wx + 0.5, wy, 0.2)}L${P(wx + 0.5, wy, -8)}" style="stroke:#1f2428;stroke-width:3.2;fill:none"/><path d="M${P(wx, wy, 0.2)}L${P(wx, wy, -8.2)}" style="stroke:#9aa3ab;stroke-width:3;fill:none"/>`;
  u2 += `<path d="M${P(wx, wy, -7.9)}L${P(wx, wy, -8.4)}" style="stroke:#d6b21a;stroke-width:4"/>` + isoBox(P, wx - 0.7, wy - 0.7, -6.3, 1.4, 1.4, 0.5, '#4a5058');
  for (const dz of [-6.9, -7.4, -7.9]) u2 += `<path d="M${P(wx - 0.7, wy, dz)}L${P(wx - 2.2, wy, dz)}M${P(wx + 0.7, wy, dz)}L${P(wx + 2.2, wy, dz)}" style="stroke:var(--oil);stroke-width:1.6" class="flow"/>`;
  u2 += `<text x="${(P(wx - 2.4, wy, -7.4)[0]).toFixed(1)}" y="${(P(wx - 2.4, wy, -7.4)[1] + 4).toFixed(1)}" class="tg3" text-anchor="end">perforations</text>`;
  let u3 = '';
  layers.forEach(([z0, z1, n]) => { u3 += `<polygon points="${pts([P(X1, Y0, z0), P(X1, Y1, z0), P(X1, Y1, z1), P(X1, Y0, z1)])}" style="fill:${fill(n)};opacity:.34;stroke:var(--ink);stroke-opacity:.3;stroke-width:.7"/><polygon points="${pts([P(X0, Y1, z0), P(X1, Y1, z0), P(X1, Y1, z1), P(X0, Y1, z1)])}" style="fill:${fill(n)};opacity:.28;stroke:var(--ink);stroke-opacity:.3;stroke-width:.7"/>`; });
  const O = []; const add = (key, svg, stage) => O.push([key, svg, stage]);
  /* wellhead + choke (3) */
  add(19, cyl(wx, wy, 0, 1.0, 1.0, '#6f787f') + box(wx - 2.2, wy - 0.4, 1.9, 4.4, 0.8, 0.9, '#6d757c') + cyl(wx, wy, 1.0, 0.7, 1.8, '#98a1a8') + cyl(wx - 2.2, wy, 1.9, 0.45, 1.1, '#2d6aa8') + cyl(wx, wy, 2.8, 0.55, 1.4, '#aeb5bb') + cyl(wx + 2.0, wy, 1.9, 0.9, 1.4, '#b5382b') + cyl(wx, wy, 4.2, 0.28, 0.9, '#5d656d') + box(wx + 3.0, wy - 0.7, 0.3, 2.4, 1.4, 1.2, '#7b848d') + cyl(wx + 4.2, wy, 1.5, 0.35, 0.6, '#d6b21a'), 'wellhead');
  /* manifold + test header (4) */
  add(38, tubeY(10, 22, 18.5, 1.3, 0.55, '#6b737c') + [11.5, 14, 16, 18, 20.5].map(y => cyl(18.5, y, 1.5, 0.4, 1.1, '#b5382b')).join('') + box(17.2, 9.6, 0, 2.6, 0.4, 1.1, '#555c63') + box(17.2, 21.8, 0, 2.6, 0.4, 1.1, '#555c63') + cyl(22.5, 22.5, 0, 0.9, 3.4, '#8d969f') + `<path d="M${P(18.5, 22, 1.3)}L${P(22.5, 22.5, 1.3)}" style="stroke:#6b737c;stroke-width:3;fill:none"/>`, 'flowline');
  /* separator (5) */
  add(58, shadowP(P, 26, 14, 16, 4, 5.8) + box(28, 14.6, 0, 1.8, 2.8, 1.5, '#3a4047') + box(37.4, 14.6, 0, 1.8, 2.8, 1.5, '#3a4047') + tubeX(26, 42, 16, 3.6, 2.1, '#7f8e9c') + cyl(31, 16, 5.6, 0.5, 1.4, '#6f787f') + cyl(39, 16, 5.6, 0.55, 1.6, '#6f787f') + cyl(34, 16, 5.7, 0.35, 1.1, '#b5382b') + box(33.4, 18.3, 1.8, 0.35, 0.35, 3.4, '#c9d3da') + box(33.5, 18.4, 1.9, 0.18, 0.18, 1.1, '#6c8fb5') + `<path d="M${P(42, 15, 1.5)}L${P(42, 17, 1.5)}" style="stroke:rgba(0,0,0,.4);stroke-width:1"/>`, 'separator');
  /* treater (6) */
  add(66, shadowP(P, 48, 13.5, 16, 5, 7) + box(50, 14.5, 0, 1.8, 3, 1.4, '#3a4047') + box(57.4, 14.5, 0, 1.8, 3, 1.4, '#3a4047') + tubeX(48, 60, 16, 3.8, 2.3, '#8a7f74') + box(60, 14.8, 2.2, 3.2, 2.4, 2.4, '#b5382b') + cyl(61.6, 16, 4.6, 0.5, 4.6, '#4a4f55') + cyl(54, 16, 6.0, 0.5, 1.5, '#6f787f') + cyl(51, 16, 6.0, 0.35, 1.0, '#b5382b') + cyl(57.5, 16, 6.0, 0.35, 1.0, '#6f787f'), 'treater');
  /* LP flash / stabilizer (7) */
  add(84, shadowP(P, 66.4, 14.4, 3.2, 3.2, 10) + box(66.2, 14.2, 0, 3.6, 3.6, 0.6, '#3a4047') + cyl(68, 16, 0.6, 1.6, 8.4, '#a9b3bb') + cyl(68, 16, 9, 1.0, 0.8, '#8e979f') + [2, 4, 6, 8].map(z => box(66.5, 17.6, z, 3, 0.2, 0.2, '#5a6169')).join('') + cyl(70.2, 16, 1.0, 0.25, 6, '#5d656d'), 'stabilizer');
  /* tanks (10) */
  const tank = (cx, cy, id) => { const r = 4.4, h = 8.5, [tx, ty] = P(cx, cy, h), [bx, by] = P(cx, cy, 0), apex = P(cx, cy, h + 2.6), rx = 1.2247 * k * r, ry = 0.7071 * k * r; const gx = cx + r * 0.7071, gy = cy + r * 0.7071;
    return shadowP(P, cx - r, cy - r, 2 * r, 2 * r, 9) + `<path d="M${(tx - rx).toFixed(1)} ${ty.toFixed(1)}L${(bx - rx).toFixed(1)} ${by.toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${(bx + rx).toFixed(1)} ${by.toFixed(1)}L${(tx + rx).toFixed(1)} ${ty.toFixed(1)}Z" style="fill:url(#${gid('#d4d8dc')});${ST}"/><polygon points="${(tx - rx).toFixed(1)},${ty.toFixed(1)} ${apex[0].toFixed(1)},${apex[1].toFixed(1)} ${(tx + rx).toFixed(1)},${ty.toFixed(1)}" style="fill:#aeb5bb;${ST}"/><ellipse cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" style="fill:#c4cacf;opacity:.0"/>` + [1.6, 3.2, 4.8, 6.4].map(z => `<path d="M${(bx - rx).toFixed(1)} ${(by - z * k).toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${(bx + rx).toFixed(1)} ${(by - z * k).toFixed(1)}" style="fill:none;stroke:rgba(0,0,0,.18);stroke-width:.8"/>`).join('') + `<path d="M${P(gx, gy, 0.5)}L${P(gx, gy, 8.0)}" style="stroke:#1b1f23;stroke-width:5;stroke-linecap:round"/><path id="${id}" d="M${P(gx, gy, 0.6)}L${P(gx, gy, 3)}" style="stroke:var(--oil);stroke-width:3;stroke-linecap:round"/>` + cyl(cx - 1.5, cy - 1.0, h + 1.0, 0.35, 0.8, '#6f787f') + `<path d="M${P(cx + r * 0.95, cy - r * 0.3, 0)}L${P(cx + r * 0.95, cy - r * 0.3, 7.5)}" style="stroke:#555c63;stroke-width:1.3;stroke-dasharray:3 2"/>`; };
  add(88, tank(80, 9, 'tkA'), 'tank'); add(102, tank(80, 23, 'tkB'), 'tank');
  /* LACT (11) */
  add(112, shadowP(P, 90, 13, 6, 6, 3.5) + box(90, 13.2, 0.1, 6, 5.6, 0.4, '#5a6169') + box(90.5, 13.8, 0.5, 1.6, 2.2, 2.0, '#e8ecef') + cyl(93.2, 15.2, 0.5, 0.65, 1.8, '#c28f14') + tubeY(14.0, 17.8, 94.8, 1.8, 0.4, '#6f787f') + cyl(91.4, 17.6, 0.5, 0.4, 1.4, '#3b6ea5') + box(94.3, 17.2, 0.5, 1.4, 1.2, 1.6, '#d97a1e'), 'lact');
  /* export pump + pipeline + tanker (12) */
  add(116, shadowP(P, 97, 13.8, 3.2, 3.4, 2.6) + box(97, 13.8, 0.1, 3.2, 3.4, 0.4, '#4a5058') + cyl(98.2, 15.5, 0.5, 0.7, 1.2, '#7b848d') + box(99.0, 14.7, 0.5, 1.2, 1.6, 1.4, '#3b6ea5') + `<path d="M${P(100.2, 16, 0.9)}L${P(110, 16, 0.9)}" style="stroke:#1f2428;stroke-width:5;stroke-linecap:round;fill:none"/><path d="M${P(100.2, 16, 0.9)}L${P(110, 16, 0.9)}" style="stroke:#9aa3ab;stroke-width:2.2;stroke-linecap:round;fill:none"/>`, 'export');
  add(112, `<g>${shadowP(P, 86, 27, 9, 3, 4.5)}${box(86, 27, 0.9, 9, 3, 2.3, '#38404a')}${tubeX(86.4, 94.6, 28.5, 3.6, 1.3, '#b9bec4')}${box(95.2, 27, 0.9, 2.6, 3, 2.9, '#e8ecef')}${[88.5, 91, 93.4, 96.6].map(x => isoWheel(P, x, 30, 0.9, 0.9)).join('')}</g>`, 'export');
  /* gas train (8) */
  add(30, shadowP(P, 26.5, 0.5, 3, 3, 8) + cyl(28, 2, 0, 1.3, 7, '#a9b3bb') + cyl(28, 2, 7, 0.75, 0.5, '#8e979f'), 'gas');
  add(44, shadowP(P, 35, -2, 12, 7, 4.5) + box(35, -2, 0, 12, 7, 3.8, '#a5b0b8', { ribs: 1.2 }) + box(34.6, -2.4, 3.8, 12.8, 7.8, 0.4, '#6c757d') + cyl(38, 1.5, 4.2, 0.45, 2.2, '#2a2e33') + cyl(41, 1.5, 4.2, 0.45, 2.2, '#2a2e33') + cyl(44, 1.5, 4.2, 0.45, 2.2, '#2a2e33') + box(47.3, 0, 0, 2.6, 3.2, 2.6, '#6c757d'), 'gas');
  add(56, shadowP(P, 52.8, 0.8, 2.4, 2.4, 13) + cyl(54, 2, 0, 1.2, 12, '#9ba5ad') + cyl(54, 2, 12, 0.7, 0.8, '#8e979f') + box(57.2, 0.8, 0, 3.4, 2.4, 2.4, '#b5382b') + cyl(58.8, 2, 2.4, 0.35, 3.4, '#4a4f55'), 'gas');
  add(58, tubeX(61, 70, -6, 1.5, 1.2, '#8b949c') + box(62, -7.2, 0, 1.4, 2.4, 0.5, '#3a4047') + box(67, -7.2, 0, 1.4, 2.4, 0.5, '#3a4047') + cyl(72, -6, 0, 0.4, 17, '#6f787f') + box(71.3, -6.7, 0, 1.4, 1.4, 0.8, '#555c63'), 'gas');
  /* water train (9) */
  add(70, shadowP(P, 33, 25.4, 5.6, 5.6, 6) + cyl(36, 28, 0, 2.8, 4.8, '#6a8fb5') + cyl(36, 28, 4.8, 1.2, 0.6, '#4a6785'), 'water');
  add(86, tubeX(43, 52, 27.6, 2.0, 0.9, '#6a8fb5') + tubeX(43, 52, 31.2, 2.0, 0.9, '#6a8fb5') + box(44, 26.8, 0, 1, 1.6, 1.1, '#3a4047') + box(50, 26.8, 0, 1, 1.6, 1.1, '#3a4047') + box(44, 30.4, 0, 1, 1.6, 1.1, '#3a4047') + box(50, 30.4, 0, 1, 1.6, 1.1, '#3a4047'), 'water');
  add(90, shadowP(P, 55.4, 26.4, 5, 4, 2.6) + box(55.4, 26.4, 0.1, 5, 4, 0.4, '#4a5058') + box(56, 27.2, 0.5, 2, 2.4, 1.6, '#3b6ea5') + cyl(59.4, 28.4, 0.5, 0.8, 1.6, '#7b848d'), 'water');
  add(96, cyl(66, 29, 0, 0.8, 1.0, '#6f787f') + cyl(66, 29, 1.0, 0.55, 1.4, '#98a1a8') + cyl(66, 29, 2.4, 0.35, 0.8, '#aeb5bb') + `<path d="M${P(66, 29, 0)}L${P(66, 29, -4)}" style="stroke:#1f2428;stroke-width:2.4" />`, 'water');
  O.sort((a, b) => a[0] - b[0]);
  /* pipes */
  const under = pl([[wx + 3.8, wy, 2.6], [wx + 5.2, wy, 2.6], [wx + 5.2, wy, 0.9], [18, 16, 0.9], [23, 16, 0.9], [23, 16, 3.6], [26, 16, 3.6]], 'mix pl-well') +
    pl([[41, 16, 1.7], [41, 16, 0.9], [45, 16, 0.9], [45, 16, 3.8], [48, 16, 3.8]], 'oil pl-oil') + pl([[60, 16, 1.7], [60, 16, 0.9], [66.4, 16, 0.9], [66.4, 16, 3]], 'oil pl-oil') + pl([[69.7, 16, 1.4], [74, 16, 0.9], [74, 9, 0.9], [75.6, 9, 0.9]], 'oil pl-oil') + pl([[74, 16, 0.9], [74, 23, 0.9], [75.6, 23, 0.9]], 'oil pl-oil') +
    pl([[84.4, 9, 0.9], [88, 9, 0.9], [88, 16, 0.9], [90.5, 16, 0.9]], 'oil pl-export') + pl([[84.4, 23, 0.9], [88, 23, 0.9], [88, 16, 0.9]], 'oil pl-export') + pl([[96, 16, 0.9], [97.2, 16, 0.9]], 'oil pl-export') + pl([[100.2, 16, 0.9], [110, 16, 0.9]], 'oil pl-export') +
    pl([[30, 16, 1.6], [30, 16, 0.9], [30, 26, 0.9], [30, 28, 0.9], [33.2, 28, 0.9]], 'water pl-water') + pl([[38.8, 28, 0.9], [41, 28, 0.9], [41, 28, 2], [43, 28, 2]], 'water pl-water') + pl([[52, 28, 2], [54, 28, 2], [54, 28, 0.9], [55.6, 28, 0.9]], 'water pl-water') + pl([[60.4, 28, 0.9], [66, 28, 0.9], [66, 29, 0.9]], 'water pl-water') +
    pl([[29.3, 2, 1.1], [35, 2, 1.1]], 'gas pl-gas2') + pl([[47, 2, 1.1], [52.8, 2, 1.1]], 'gas pl-gas2') + pl([[55.2, 2, 1.1], [100, 2, 1.1], [108, 2, 1.1]], 'gas pl-gas2') + pl([[49.5, 2, 1.1], [49.5, -6, 1.1], [61, -6, 1.5]], 'gas pl-flare');
  const over = pl([[31, 16, 7], [31, 10, 7.5], [39, 10, 7.5], [39, 16, 7.4], [39, 2, 7.5], [28, 2, 7.5], [28, 2, 7.1]], 'gas pl-gas') + pl([[54, 16, 7.5], [54, 2, 8.4], [54, 2, 12.7]], 'gas pl-gas');
  const flame = (() => { const [fx, fy] = P(72, -6, 17.2); return `<g transform="translate(${fx.toFixed(1)} ${fy.toFixed(1)})"><g class="flame"><path d="M0 0C-8 -8 -6 -20 0 -34C4 -24 9 -14 0 0Z" style="fill:#e8742a"/><path d="M0 0C-4 -5 -3 -12 0 -20C2 -14 5 -8 0 0Z" style="fill:#f6d24a"/></g></g>`; })();
  const objs = O.map(o => `<g class="node" data-stage="${o[2]}" tabindex="-1">${o[1]}</g>`).join('');
  const nodeU = `<g class="node" data-stage="reservoir" tabindex="-1">${u1}</g><g class="node" data-stage="wellbore" tabindex="-1">${u2}</g>`;
  const badges = numP(P, 6, 24, -3, 1, 0, 0) + numP(P, 3, 16, -4, 2, 26, 0) + numP(P, 3, 16, 5.6, 3, -18, 0) + numP(P, 18.5, 22.5, 3, 4, 14, 0) + numP(P, 34, 16, 7, 5, 0, -16) + numP(P, 54, 16, 8, 6, 0, -14) + numP(P, 68, 16, 10.4, 7, 0, -14) + numP(P, 28, 2, 8, 8, -18, 0) + numP(P, 36, 28, 5.6, 9, 0, -14) + numP(P, 80, 9, 12, 10, 0, -12) + numP(P, 93, 15, 3.4, 11, 0, -14) + numP(P, 98, 15, 2.6, 12, 0, -14);
  const labels = tagP(P, 3, 16, 5.4, 'Wellhead + choke', '', -78, -24) + tagP(P, 30, 15, 5, 'HP Separator', '', -86, -34) + tagP(P, 54, 18.4, 1.8, 'Heater Treater', '', -10, 54) + tagP(P, 68, 16, 10.2, 'LP flash', '', 0, -28) + tagP(P, 80, 9, 12.5, 'Storage tanks', '', 0, -30) + tagP(P, 93, 15, 3.4, 'LACT', '', 0, -28) + tagP(P, 36, 1.5, 4, 'Gas compression', '', -70, -16) + tagP(P, 54, 2, 12.8, 'TEG dehydration', '', 0, -26) + tagP(P, 72, -6, 18, 'Flare', '', 28, -4) + tagP(P, 36, 28, 5.4, 'Skim tank', '', -50, 30) + tagP(P, 66, 29, 2.6, 'Injection well', '', 20, 36) + tagP(P, 105, 16, 0.9, 'Export pipeline', '', 0, 30) + tagP(P, 18.5, 22.5, 3.4, 'Manifold', '', -30, 36) + tagP(P, -2, 22, 0, 'Reservoir', '', -60, 36);
  return `<svg id="mapsvg" viewBox="0 0 1000 640" role="img" aria-label="منظر مجسم لمنشأة إنتاج النفط: بئر ومكمن تحت الأرض، رأس البئر والـ choke، manifold، فاصل ثلاثي الأطوار، heater treater، LP flash، منظومة غاز بشعلة، معالجة مياه وحقن، خزانات، LACT، مضخة تصدير وخط أنابيب">
  <defs>${[...defs.values()].join('')}</defs>${ground}${nodeU}${u3}<g class="pipes">${under}</g>${objs}<g class="pipes">${over}</g>${flame}${badges}${labels}</svg>`;
}

/* ---- controls and operation logic ---- */
function mapControlsHTML() {
  return `<div class="opsbar" id="opsbar"><button class="btn pri" id="op_run" type="button" aria-pressed="true">إيقاف مؤقت</button>
  ${SEL('op_spd', 'سرعة المحاكاة', [[3, '3 ساعات/ث'], [12, '12 ساعة/ث'], [48, '2 يوم/ث']], 12)}
  <label class="f" for="op_choke" style="min-width:170px"><span class="fl">فتح الـ choke: <b id="op_chv" class="mono">70%</b></span><input id="op_choke" type="range" min="0" max="100" value="70" style="width:100%"></label>
  <button class="btn" id="op_comp" type="button" aria-pressed="true">ضاغط الغاز: يعمل</button>
  <button class="btn" id="op_exp" type="button" aria-pressed="false">مضخة التصدير: متوقفة</button>
  <button class="btn danger" id="op_esd" type="button" aria-pressed="false">ESD إيقاف طارئ</button></div>
  <div class="calc" style="margin-top:10px;padding:12px"><div class="kvs" id="op_ro"></div></div><div id="op_msg" style="margin-top:8px"></div>`;
}
function opsUpdateStatic() {
  const sv = document.getElementById('mapsvg'); if (!sv) return;
  const f = OPS.esd ? 0 : OPS.choke / 100;
  const cls = { 'off-well': f === 0, 'off-oil': f === 0, 'off-water': f === 0, 'off-gas': f === 0, 'off-gas2': f === 0 || !OPS.comp, 'off-flare': f === 0 || OPS.comp, 'off-export': !(OPS.exp && !OPS.esd) , paused: !OPS.run, 'flare-on': f > 0 && !OPS.comp };
  for (const k in cls) sv.classList.toggle(k, !!cls[k]);
  sv.style.setProperty('--spd', String(Math.max(0.2, f * 1.4 + 0.15)));
  const b = id => document.getElementById(id);
  b('op_run').textContent = OPS.run ? 'إيقاف مؤقت' : 'تشغيل'; b('op_run').setAttribute('aria-pressed', OPS.run);
  b('op_comp').textContent = 'ضاغط الغاز: ' + (OPS.comp ? 'يعمل' : 'متوقف (الغاز يُحرق)'); b('op_comp').setAttribute('aria-pressed', OPS.comp);
  b('op_exp').textContent = 'مضخة التصدير: ' + (OPS.exp ? 'تعمل' : 'متوقفة'); b('op_exp').setAttribute('aria-pressed', OPS.exp);
  b('op_esd').textContent = OPS.esd ? 'إعادة التشغيل بعد ESD' : 'ESD إيقاف طارئ'; b('op_esd').setAttribute('aria-pressed', OPS.esd);
  b('op_chv').textContent = OPS.choke + '%';
}
function opsReadouts() {
  const c = caseObj(), bal = stageBalance(c), f = OPS.esd ? 0 : OPS.choke / 100;
  const cap = tankBblPerFt(60) * 32;
  const set = (id, lv) => { const el = document.getElementById(id); if (!el) return; const P = mkP(MAPK, MAPX, MAPY), gx = (id === 'tkA' ? 80 : 80) + 4.4 * 0.7071, gy = (id === 'tkA' ? 9 : 23) + 4.4 * 0.7071; el.setAttribute('d', `M${P(gx, gy, 0.6)}L${P(gx, gy, 0.6 + 7.2 * lv)}`); };
  set('tkA', OPS.A); set('tkB', OPS.B);
  const ro = document.getElementById('op_ro'); if (!ro) return;
  const lv = (OPS.A + OPS.B) / 2;
  ro.innerHTML = `${KV('نفط', fmt(bal.qo * f, 0), 'STB/d')}${KV('ماء', fmt(bal.qw * f, 0), 'bbl/d')}${KV('غاز', fmt(bal.gasTot * f, 3), 'MMscf/d')}${KV('خزان A', fmt(OPS.A * 100, 0), '%', OPS.A > 0.85 ? 'warn' : '')}${KV('خزان B', fmt(OPS.B * 100, 0), '%', OPS.B > 0.85 ? 'warn' : '')}${KV('سعة الخزان', fmt(cap, 0), 'bbl')}${KV('الغاز', OPS.comp ? 'يُباع' : f > 0 ? 'يُحرق' : '—', '', !OPS.comp && f > 0 ? 'warn' : '')}`;
  const msgs = []; if (OPS.esd) msgs.push(MSG(OPS.reason ? 'ESD تلقائي: ' + OPS.reason : 'ESD: أُغلق صمام SSV وتوقف الإنتاج. أعد التشغيل بعد التحقق من السبب.', 'bad'));
  if (OPS.A > 0.85 || OPS.B > 0.85) msgs.push(MSG('LSH: مستوى الخزان مرتفع. شغّل مضخة التصدير قبل بلوغ 95% (LSHH يُنفّذ ESD).', 'warn'));
  if (!OPS.comp && f > 0) msgs.push(MSG('الضاغط متوقف: الغاز يتجه إلى الـ flare. هذا مقبول مؤقتاً فقط (الحرق الروتيني مقيَّد تنظيمياً).', 'warn'));
  if (OPS.exp && OPS.A < 0.04) msgs.push(MSG('LSLL: مستوى منخفض جداً في الخزان: توقفت مضخة التصدير آلياً لحماية المضخة.', 'warn'));
  document.getElementById('op_msg').innerHTML = msgs.join('');
}
function opsTick(dtReal) {
  if (!OPS.run) return;
  const c = caseObj(), bal = stageBalance(c), f = OPS.esd ? 0 : OPS.choke / 100, cap = tankBblPerFt(60) * 32, dh = dtReal * OPS.spd;
  const inflow = bal.qo * f / 24 * dh / 2, outRate = 2 * bal.qo / 24 * dh / 2;
  [['A'], ['B']].forEach(([k]) => { let v = OPS[k] + inflow / cap; if (OPS.exp && !OPS.esd && v > 0.03) v -= outRate / cap; OPS[k] = clamp01(v); });
  if (OPS.exp && OPS.A < 0.035 && OPS.B < 0.035) { OPS.exp = false; opsUpdateStatic(); }
  if (!OPS.esd && (OPS.A >= 0.95 || OPS.B >= 0.95)) { OPS.esd = true; OPS.reason = 'LSHH: مستوى الخزان بلغ 95%'; opsUpdateStatic(); }
}
function opsLoop(ts) { if (!OPS.run) return; if (!OPS.last) OPS.last = ts; const dt = Math.min((ts - OPS.last) / 1000, 0.1); OPS.last = ts; opsTick(dt); opsReadouts(); requestAnimationFrame(opsLoop); }
function opsInit() {
  opsUpdateStatic(); opsReadouts(); OPS.last = 0; requestAnimationFrame(opsLoop);
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.id === 'op_run') { OPS.run = !OPS.run; OPS.last = 0; opsUpdateStatic(); if (OPS.run) requestAnimationFrame(opsLoop); }
    if (t.id === 'op_comp') { OPS.comp = !OPS.comp; opsUpdateStatic(); opsReadouts(); }
    if (t.id === 'op_exp') { OPS.exp = !OPS.exp; if (OPS.exp) OPS.esd = OPS.esd; opsUpdateStatic(); opsReadouts(); }
    if (t.id === 'op_esd') { OPS.esd = !OPS.esd; OPS.reason = ''; if (!OPS.esd) { OPS.A = Math.min(OPS.A, 0.9); OPS.B = Math.min(OPS.B, 0.9); } opsUpdateStatic(); opsReadouts(); }
  });
  document.addEventListener('input', e => { const t = e.target; if (t.id === 'op_choke') { OPS.choke = +t.value; opsUpdateStatic(); opsReadouts(); } if (t.id === 'op_spd') { OPS.spd = +t.value; } if (t.closest && t.closest('#case')) opsReadouts(); });
}

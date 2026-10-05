/* ===== Realistic illustrations (isometric scenes, rock texture, gauges, grain close-up) ===== */
const mkP = (k, ox, oy) => (x, y, z) => [ox + (x - y) * 0.866 * k, oy + (x + y) * 0.5 * k - z * k];
const pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const m = f > 0 ? 255 : 0, a = Math.abs(f);
  r = Math.round(r + (m - r) * a); g = Math.round(g + (m - g) * a); b = Math.round(b + (m - b) * a);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
const ST = 'stroke:rgba(0,0,0,.5);stroke-width:.7;stroke-linejoin:round';
function isoBox(P, x, y, z, w, d, h, col, o = {}) {
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const right = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
  const left = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  let s = `<polygon points="${pts(right)}" style="fill:${shade(col, -0.3)};${ST}"/><polygon points="${pts(left)}" style="fill:${shade(col, -0.08)};${ST}"/><polygon points="${pts(top)}" style="fill:${shade(col, 0.22)};${ST}"/>`;
  if (o.ribs) {
    let l = ''; for (let xi = x + o.ribs; xi < x + w - 0.01; xi += o.ribs) l += `M${P(xi, y + d, z + 0.15).map(v => v.toFixed(1)).join(' ')}L${P(xi, y + d, z + h - 0.15).map(v => v.toFixed(1)).join(' ')}`;
    for (let yi = y + o.ribs; yi < y + d - 0.01; yi += o.ribs) l += `M${P(x + w, yi, z + 0.15).map(v => v.toFixed(1)).join(' ')}L${P(x + w, yi, z + h - 0.15).map(v => v.toFixed(1)).join(' ')}`;
    s += `<path d="${l}" style="fill:none;stroke:rgba(0,0,0,.28);stroke-width:.7"/>`;
  }
  return s;
}
function isoCyl(P, k, gid, cx, cy, z, r, h, col) {
  const [tx, ty] = P(cx, cy, z + h), [bx, by] = P(cx, cy, z), rx = 1.2247 * k * r, ry = 0.7071 * k * r;
  const f = (a, b) => a.toFixed(1) + ' ' + b.toFixed(1);
  return `<path d="M${f(tx - rx, ty)}L${f(bx - rx, by)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${f(bx + rx, by)}L${f(tx + rx, ty)}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${f(tx - rx, ty)}Z" style="fill:url(#${gid(col)});${ST}"/><ellipse cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" style="fill:${shade(col, 0.28)};${ST}"/>`;
}
function isoWheel(P, cx, y, cz, r, hub) {
  const ring = [], hubp = []; for (let a = 0; a < 360; a += 20) { const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); ring.push(P(cx + r * c, y, cz + r * s)); hubp.push(P(cx + r * 0.45 * c, y, cz + r * 0.45 * s)); }
  return `<polygon points="${pts(ring)}" style="fill:#15181b;stroke:#000;stroke-width:.6"/><polygon points="${pts(hubp)}" style="fill:${hub || '#9aa0a6'}"/>`;
}
function shadowP(P, x, y, w, d, h) { const o = h * 0.55, q = [P(x + o, y - o * 0.5, 0), P(x + w + o, y - o * 0.5, 0), P(x + w + o, y + d - o * 0.5, 0), P(x + w, y + d, 0), P(x, y + d, 0), P(x, y, 0)]; return `<polygon points="${pts(q)}" style="fill:rgba(0,0,0,.2)"/>`; }
function tagP(P, x, y, z, en, ar, dx = 0, dy = 0) {
  const [ax, ay] = P(x, y, z), sx = ax + dx, sy = ay + dy, w = Math.max(en.length * 7.4, (ar || '').length * 6.4) + 14, h = ar ? 34 : 20;
  return `<g class="tagp" pointer-events="none"><line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" style="stroke:var(--muted);stroke-width:1"/><rect x="${(sx - w / 2).toFixed(1)}" y="${(sy - h).toFixed(1)}" width="${w.toFixed(0)}" height="${h}" rx="4" style="fill:var(--surface);opacity:.9;stroke:var(--line)"/><text x="${sx.toFixed(1)}" y="${(sy - h + 14).toFixed(1)}" text-anchor="middle" class="tg1">${en}</text>${ar ? `<text x="${sx.toFixed(1)}" y="${(sy - 5).toFixed(1)}" text-anchor="middle" class="tg2">${ar}</text>` : ''}</g>`;
}

/* ---- the frac site, isometric ---- */
function spreadSVG() {
  const k = 10.4, P = mkP(k, 405, 70), defs = new Map();
  const gid = col => { const id = 'sg' + col.slice(1); if (!defs.has(id)) defs.set(id, `<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${shade(col, 0.1)}"/><stop offset=".4" stop-color="${shade(col, 0.32)}"/><stop offset="1" stop-color="${shade(col, -0.35)}"/></linearGradient>`); return id; };
  const cyl = (cx, cy, z, r, h, col) => isoCyl(P, k, gid, cx, cy, z, r, h, col);
  const box = (x, y, z, w, d, h, col, o) => isoBox(P, x, y, z, w, d, h, col, o);
  const G = {};
  /* ground */
  let ground = `<polygon points="${pts([P(-3, -3, 0), P(58, -3, 0), P(58, 36, 0), P(-3, 36, 0)])}" style="fill:var(--earth);stroke:var(--line)"/><polygon points="${pts([P(-1, -1, 0), P(56, -1, 0), P(56, 34, 0), P(-1, 34, 0)])}" style="fill:color-mix(in srgb,var(--earth) 78%,#fff 22%)"/>`;
  for (let i = 0; i < 260; i++) { const x = -1 + hash(i, 1) * 57, y = -1 + hash(i, 2) * 35, p = P(x, y, 0); ground += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(0.7 + hash(i, 3) * 1.2).toFixed(1)}" style="fill:rgba(0,0,0,${(0.05 + hash(i, 4) * 0.08).toFixed(2)})"/>`; }
  const road = `<polygon points="${pts([P(-3, 36.5, 0), P(58, 36.5, 0), P(58, 40, 0), P(-3, 40, 0)])}" style="fill:var(--earth2)"/><path d="M${P(-2, 38.2, 0).join(' ')}L${P(57, 38.2, 0).join(' ')}" style="stroke:var(--muted);stroke-width:1.4;stroke-dasharray:9 8;fill:none"/>`;
  /* hoses (under equipment) */
  const hose = (arr, cls) => `<polyline class="${cls}" points="${pts(arr.map(a => P(a[0], a[1], a[2] ?? 0.55)))}"/>`;
  let lines = '';
  [0, 1, 2].forEach(i => { lines += hose([[11, i * 4.4 + 1.7], [13, i * 4.4 + 1.7], [13, 14.3], [14.5, 14.3]], 'sl2 lw flow'); });
  lines += hose([[6.5, 28.6], [12, 28.6], [12, 16], [14.5, 16]], 'sl2 lc flow');
  lines += hose([[23.5, 14.5], [26.5, 14.5], [26.5, 1.7], [26.5, 26.7]], 'sl2 lw flow');
  [0, 1, 2, 3, 4, 5].forEach(i => { lines += hose([[26.5, i * 5 + 1.7], [28, i * 5 + 1.7]], 'sl2 lw flow'); lines += hose([[39.4, i * 5 + 1.7], [41.8, i * 5 + 1.7]], 'sl2 lh flow'); });
  /* objects: [sortKey, svg, group] */
  const O = [];
  const add = (key, svg, grp) => O.push([key, svg, grp]);
  [0, 1, 2].forEach(i => { const y = i * 4.4; add(5.5 + y + 1.7, shadowP(P, 0, y, 11, 3.4, 4.5) + box(0, y, 0.35, 11, 3.4, 4.1, '#5f86ad', { ribs: 1.1 }) + box(0.5, y + 0.3, 4.45, 10, 2.8, 0.18, '#40576f') + cyl(8.3, y + 1.7, 4.6, 0.5, 0.28, '#40576f') + box(0.4, y + 3.4, 0.05, 0.5, 0.2, 0.35, '#2d3946') + box(10, y + 3.4, 0.05, 0.5, 0.2, 0.35, '#2d3946'), 'tanks'); });
  [18, 23].forEach(y => { const cx = 3.2, p0 = P(cx, y, 4), r = 1.2247 * k * 1.9; add(cx + y, shadowP(P, cx - 1.9, y - 1.9, 3.8, 3.8, 9) + `<polygon points="${pts([P(cx - 1.9, y, 4), P(cx, y, 1.9), P(cx + 1.9, y, 4)])}" style="fill:#8e9399;${ST}"/>` + `<path d="M${P(cx - 1.4, y + 1.4, 0)}L${P(cx - 1.4, y + 1.4, 4)}M${P(cx + 1.4, y + 1.4, 0)}L${P(cx + 1.4, y + 1.4, 4)}" style="stroke:#5d6269;stroke-width:3;fill:none"/>` + cyl(cx, y, 4, 1.9, 5.2, '#c9ced4') + cyl(cx, y, 9.2, 1.0, 0.5, '#9aa0a6'), 'sand'); });
  add(9 + 18, box(5.2, 17.6, 2.3, 9.4, 1.0, 0.3, '#2f353b') + box(5.2, 17.4, 2.0, 9.4, 0.15, 0.4, '#777f87') + box(5.2, 18.5, 2.0, 9.4, 0.15, 0.4, '#777f87'), 'sand');
  add(3 + 28.5, shadowP(P, 0, 27, 6.5, 3.2, 3.5) + box(0, 27, 0.9, 6.5, 3.2, 2.0, '#4f8268') + [0, 1, 2].map(i => box(0.5 + i * 2, 27.4, 2.9, 1.6, 2.4, 1.4, '#e9eef0', { ribs: 0.4 })).join('') + [0.7, 3.2].map(x => isoWheel(P, x + 0.5, 30.2, 0.55, 0.55)).join(''), 'chem');
  add(19 + 14.3, shadowP(P, 14.5, 12.6, 9, 3.4, 4.5) + box(14.5, 12.6, 0.9, 9, 3.4, 1.8, '#b98a14') + box(15.2, 12.9, 2.7, 4.6, 2.8, 1.3, '#d9a21b', { ribs: 0.8 }) + cyl(20.9, 14.3, 2.7, 1.2, 1.4, '#9aa3ab') + box(22.9, 12.6, 0.9, 2.5, 3.4, 2.7, '#e8ecef') + `<polygon points="${pts([P(25.4, 12.95, 2.2), P(25.4, 15.65, 2.2), P(25.4, 15.65, 3.3), P(25.4, 12.95, 3.3)])}" style="fill:#8fc5df;opacity:.85"/>` + [16, 19.2, 22.2].map(x => isoWheel(P, x, 16, 0.85, 0.85)).join(''), 'blender');
  [0, 1, 2, 3, 4, 5].forEach(i => { const x = 28, y = i * 5; add(x + 5.6 + y + 1.7, shadowP(P, x, y, 11.4, 3, 4.8) + box(x, y, 0.9, 8.6, 3, 2.3, '#38404a') + box(x + 0.8, y + 0.3, 3.2, 4.8, 2.4, 1.5, '#8d969f') + box(x + 5.9, y + 0.5, 3.2, 2.2, 2, 1.1, '#aab1b8') + cyl(x + 7.5, y + 0.8, 3.2, 0.2, 2.0, '#2a2e33') + box(x + 8.8, y, 0.9, 2.6, 3, 2.9, i % 2 ? '#b5382b' : '#c4452f') + `<polygon points="${pts([P(x + 11.4, y + 0.3, 2.7), P(x + 11.4, y + 2.7, 2.7), P(x + 11.4, y + 2.7, 3.7), P(x + 11.4, y + 0.3, 3.7)])}" style="fill:#8fc5df;opacity:.85"/>` + `<polygon points="${pts([P(x + 9.2, y + 3, 2.7), P(x + 10.9, y + 3, 2.7), P(x + 10.9, y + 3, 3.7), P(x + 9.2, y + 3, 3.7)])}" style="fill:#8fc5df;opacity:.8"/>` + [1.4, 3.7, 6.2, 9.8].map(dx => isoWheel(P, x + dx, y + 3, 0.9, 0.9)).join(''), 'pumps'); });
  add(42.3 + 14.5, shadowP(P, 41.6, 0, 1.4, 29.5, 1.8) + box(41.6, 0, 0.9, 1.4, 29.5, 1.5, '#69717a') + [0, 1, 2, 3, 4, 5].map(i => box(41.5, i * 5 + 1.3, 0.85, 1.6, 0.8, 1.6, '#d6b21a') + cyl(42.3, i * 5 + 1.7, 2.4, 0.38, 0.9, '#b5382b')).join(''), 'manifold');
  add(49.7 + 14.5, `<polygon points="${pts([P(46.5, 10.8, 0.25), P(52.9, 10.8, 0.25), P(52.9, 18.2, 0.25), P(46.5, 18.2, 0.25)])}" style="fill:#a5a59f;${ST}"/>` + box(43.4, 14.15, 3.7, 6.0, 0.9, 0.9, '#5b636b') + cyl(49.7, 14.5, 0.25, 1.1, 1.2, '#6f787f') + cyl(49.7, 14.5, 1.45, 0.8, 1.7, '#98a1a8') + box(47.3, 14.0, 2.1, 5.0, 1.0, 0.9, '#6d757c') + cyl(47.3, 14.5, 2.0, 0.45, 1.1, '#b5382b') + cyl(52.3, 14.5, 2.0, 0.45, 1.1, '#2d6aa8') + cyl(49.7, 14.5, 3.15, 0.6, 1.5, '#aeb5bb') + cyl(49.7, 14.5, 4.65, 0.28, 3.8, '#5d656d') + cyl(49.7, 14.5, 8.45, 0.5, 0.5, '#d6b21a'), 'well');
  add(54 + 22, shadowP(P, 52, 19, 5, 4.4, 2.8) + box(52, 19, 0.9, 5, 4.4, 1.8, '#d6a21d') + `<path d="M${P(54, 21, 2.7)}L${P(50.5, 15.2, 9.6)}" style="stroke:#e2b925;stroke-width:5;stroke-linecap:round;fill:none"/><path d="M${P(54, 21, 2.7)}L${P(50.5, 15.2, 9.6)}" style="stroke:#7a5a10;stroke-width:1;fill:none"/>` + [53.2, 56].map(x => isoWheel(P, x, 23.4, 0.9, 0.9)).join(''), 'well');
  add(50 + 26, shadowP(P, 46, 23.5, 7, 3.2, 3.6) + box(46, 23.5, 0.9, 7, 3.2, 2.6, '#d97a1e') + box(52.4, 23.5, 0.9, 2.2, 3.2, 3.0, '#e9ecee') + cyl(48.5, 25.1, 3.5, 0.5, 1.0, '#7d858d') + [47.4, 50.6, 53.4].map(x => isoWheel(P, x, 26.7, 0.9, 0.9)).join(''), 'wire');
  add(49.5 + 3.7, shadowP(P, 46.5, 1.5, 5.5, 3.2, 3.4) + box(46.5, 1.5, 0.9, 5.5, 3.2, 2.5, '#eaeef0') + `<polygon points="${pts([P(47, 4.7, 2.2), P(51.4, 4.7, 2.2), P(51.4, 4.7, 3.0), P(47, 4.7, 3.0)])}" style="fill:#8fc5df;opacity:.85"/>` + box(48, 2, 3.4, 1.2, 0.8, 0.4, '#555c63') + [47.4, 50.6].map(x => isoWheel(P, x, 4.7, 0.9, 0.7)).join(''), 'van');
  O.sort((a, b) => a[0] - b[0]);
  const byGrp = {}; let objs = '';
  /* keep click groups: wrap consecutive items by group in sorted order */
  O.forEach(o => { objs += `<g class="eqn" data-eq="${o[2]}" tabindex="-1">${o[1]}</g>`; });
  const labels = tagP(P, 5.5, 4.4, 5.8, 'Frac tanks', 'خزانات المياه') + tagP(P, 3.2, 20.5, 10.8, 'Sand silos', 'الـ proppant') + tagP(P, 3, 28.6, 4.6, 'Chemicals', 'الكيماويات') + tagP(P, 19, 14, 5.8, 'Blender', '') + tagP(P, 33, -1, 6.6, 'Frac pumps (HHP)', 'مضخات الضغط العالي') + tagP(P, 42.3, 28.5, 2.4, 'HP manifold', '', -40, 44) + tagP(P, 49.7, 14.5, 9, 'Wellhead + frac tree', 'رأس البئر', 175, 70) + tagP(P, 54, 25.5, 3.2, 'Wireline unit', '', 70, 40) + tagP(P, 49.4, 4, 3.6, 'Data van', '', 40, -50);
  return `<svg id="spreadsvg" viewBox="0 0 1000 620" role="img" aria-label="منظر مجسم لموقع التكسير: خزانات المياه والصوامع ووحدة الكيماويات والـ blender وست مضخات ضغط عالٍ والـ manifold ورأس البئر ووحدة الـ wireline وغرفة البيانات">
  <defs>${[...defs.values()].join('')}</defs>${ground}${road}<g class="hoses">${lines}</g>${objs}${labels}</svg>`.replace('</defs>', '</defs>');
}
function spreadSVGWithDefs() { return spreadSVG(); }

/* ---- subsurface cut-away: transparent earth block with horizontal well and fractures ---- */
const PP = { v: 0, playing: false, last: 0 };
const CUT = { X: 62, Y: 26, Z: 18, k: 9.2, ox: 452, oy: 112 };
function cutP() { return mkP(CUT.k, CUT.ox, CUT.oy); }
function ppSVG() {
  const P = cutP(), { X, Y } = CUT; const layers = [[0, -2, 'soil'], [-2, -6, 'bar1'], [-6, -12, 'pay'], [-12, -18, 'bar2']];
  const fill = n => n === 'soil' ? 'var(--earth)' : n === 'pay' ? 'color-mix(in srgb,var(--oil-bg) 70%,var(--earth) 30%)' : 'color-mix(in srgb,var(--earth2) 88%,#000 12%)';
  let s = `<svg id="ppsvg" viewBox="0 0 1000 640" role="img" aria-label="قطاع ثلاثي الأبعاد شفاف للأرض: بئر عمودي ينحني إلى مقطع أفقي في طبقة المكمن، وثماني مراحل تكسير، كل مرحلة بثلاثة عناقيد تنتج شقوقاً عمودية على البئر">
  <defs><marker id="pa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" style="fill:var(--ink)"/></marker></defs>
  <rect x="0" y="0" width="1000" height="640" class="sprbg"/>`;
  s += `<polygon points="${pts([P(0, 0, -18), P(X, 0, -18), P(X, Y, -18), P(0, Y, -18)])}" style="fill:color-mix(in srgb,var(--earth2) 70%,#000 30%);stroke:rgba(0,0,0,.3)"/>`;
  /* back walls */
  layers.forEach(([z0, z1, n]) => {
    s += `<polygon points="${pts([P(0, 0, z0), P(0, Y, z0), P(0, Y, z1), P(0, 0, z1)])}" style="fill:${fill(n)};stroke:rgba(0,0,0,.25);stroke-width:.6"/><polygon points="${pts([P(0, 0, z0), P(X, 0, z0), P(X, 0, z1), P(0, 0, z1)])}" style="fill:color-mix(in srgb,${fill(n)} 90%,#000 10%);stroke:rgba(0,0,0,.25);stroke-width:.6"/>`;
  });
  for (let i = 0; i < 220; i++) { const y = hash(i, 5) * Y, z = -hash(i, 6) * 18, p = P(0, y, z), q = P(hash(i, 7) * X, 0, -hash(i, 8) * 18); s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1" style="fill:rgba(0,0,0,.14)"/><circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="1" style="fill:rgba(0,0,0,.14)"/>`; }
  [-6, -12].forEach((z, i) => { s += `<polygon points="${pts([P(0, 0, z), P(X, 0, z), P(X, Y, z), P(0, Y, z)])}" style="fill:${fill('pay')};opacity:${i ? 0.34 : 0.2};stroke:var(--oil);stroke-opacity:.5;stroke-width:1;stroke-dasharray:5 4"/>`; });
  s += `<g id="ppdyn"></g>`;
  /* front glass faces */
  layers.forEach(([z0, z1, n]) => { s += `<polygon points="${pts([P(X, 0, z0), P(X, Y, z0), P(X, Y, z1), P(X, 0, z1)])}" style="fill:${fill(n)};opacity:.34;stroke:var(--ink);stroke-opacity:.35;stroke-width:.8"/><polygon points="${pts([P(0, Y, z0), P(X, Y, z0), P(X, Y, z1), P(0, Y, z1)])}" style="fill:${fill(n)};opacity:.28;stroke:var(--ink);stroke-opacity:.35;stroke-width:.8"/>`; });
  s += `<polygon points="${pts([P(0, 0, 0), P(X, 0, 0), P(X, Y, 0), P(0, Y, 0)])}" style="fill:var(--earth);opacity:.45;stroke:var(--ink);stroke-opacity:.5;stroke-width:1"/>`;
  /* surface pad: small spread */
  const gid = col => { const id = 'cg' + col.slice(1); return id; };
  s += `<defs>${['#6f787f', '#5f86ad', '#98a1a8'].map(c => `<linearGradient id="${gid(c)}" x1="0" x2="1"><stop offset="0" stop-color="${shade(c, 0.1)}"/><stop offset=".4" stop-color="${shade(c, 0.32)}"/><stop offset="1" stop-color="${shade(c, -0.35)}"/></linearGradient>`).join('')}</defs>`;
  s += isoBox(P, 10, 3, 0, 9, 2.4, 1.6, '#5f86ad', { ribs: 1.2 }) + isoBox(P, 10, 8, 0, 9, 2.4, 1.6, '#5f86ad', { ribs: 1.2 }) + [0, 1, 2, 3].map(i => isoBox(P, 22, 3 + i * 4.6, 0, 6, 2.4, 1.4, i % 2 ? '#b5382b' : '#c4452f')).join('') + isoBox(P, 32, 20, 0, 4, 3, 1.4, '#d9a21b');
  s += isoCyl(P, CUT.k, gid, 4, 13, 0, 0.7, 1.4, '#98a1a8') + isoCyl(P, CUT.k, gid, 4, 13, 1.4, 0.4, 1.8, '#6f787f');
  /* annotations */
  const arr = (a, b, t, dx, dy) => { const p = P(...a), q = P(...b), m = [(p[0] + q[0]) / 2 + dx, (p[1] + q[1]) / 2 + dy]; return `<path d="M${p.map(v => v.toFixed(1)).join(' ')}L${q.map(v => v.toFixed(1)).join(' ')}" style="stroke:var(--ink);stroke-width:1.6;fill:none" marker-start="url(#pa)" marker-end="url(#pa)"/><text x="${m[0].toFixed(1)}" y="${m[1].toFixed(1)}" text-anchor="middle" class="tg1">${t}</text>`; };
  s += arr([2, Y + 2.4, 0], [16, Y + 2.4, 0], 'σ_hmin', -6, 24) + arr([X - 4, 2, 0.01], [X - 4, 16, 0.01], 'σ_Hmax', 46, -2);
  const lab = (x, y, z, t, dx = 0, dy = 0, cls = 'tg2') => { const p = P(x, y, z); return `<text x="${(p[0] + dx).toFixed(1)}" y="${(p[1] + dy).toFixed(1)}" class="${cls}" text-anchor="start">${t}</text>`; };
  s += lab(0, Y, -4, 'shale عازل', -12, 4, 'tg2e') + lab(0, Y, -9, 'المكمن (pay zone)', -12, 4, 'tg1e') + lab(0, Y, -15, 'shale عازل', -12, 4, 'tg2e') + lab(0, Y, -1, 'تربة', -12, 4, 'tg2e');
  return s + `</svg>`;
}
function ppRender() {
  const P = cutP(), N = 8, v = PP.v, s = Math.min(N, Math.floor(v / 100) + 1), p = (v % 100) / 100, done = v >= 800;
  const zc = -9.2, yc = 13, Ly = 9.5, Hz = 2.7;
  const xi = i => 57 - (i - 1) * 6.4;
  let d = '';
  /* well */
  const path = []; path.push(P(4, yc, 0.2)); path.push(P(4, yc, -6.2)); for (let a = 0; a <= 90; a += 10) { const r = 3, t = a * Math.PI / 180; path.push(P(4 + r * (1 - Math.cos(t)), yc, -6.2 - r * Math.sin(t))); } path.push(P(59, yc, zc));
  d += `<polyline points="${pts(path)}" style="fill:none;stroke:#1f2428;stroke-width:6;stroke-linecap:round;stroke-linejoin:round"/><polyline points="${pts(path)}" style="fill:none;stroke:#8d969f;stroke-width:3;stroke-linecap:round;stroke-linejoin:round"/>`;
  /* plugs */
  for (let i = 2; i <= N; i++) { if (done || i < s || (i === s && p > 0.08)) { const x = xi(i) + 3.4; d += isoBox(P, x - 0.35, yc - 0.5, zc - 0.5, 0.7, 1, 1, '#2b2f33'); } }
  /* fractures */
  const frs = [];
  for (let i = 1; i <= N; i++) { let prog = 0; if (done || i < s) prog = 1; else if (i === s) prog = clamp01((p - 0.28) / 0.72); if (prog <= 0.001) continue; for (const o of [-1.1, 0, 1.1]) frs.push([xi(i) + o, prog, i]); }
  frs.sort((a, b) => a[0] - b[0]);
  frs.forEach(([x, prog, i], idx) => {
    const cur = (i === s && !done), pr = cur ? Math.pow(prog, 0.7) : 1, ring = [];
    for (let a = 0; a < 360; a += 12) { const t = a * Math.PI / 180, rr = 1 + 0.09 * Math.sin(3 * t + i) + 0.05 * Math.sin(5 * t + x); ring.push(P(x, yc + Ly * pr * rr * Math.cos(t), zc + Hz * pr * rr * Math.sin(t) * (0.9 + 0.1 * Math.cos(t)))); }
    d += `<polygon points="${pts(ring)}" style="fill:${cur ? 'var(--accent)' : 'var(--water)'};fill-opacity:${cur ? 0.42 : 0.26};stroke:${cur ? 'var(--accent)' : 'var(--water)'};stroke-width:${cur ? 1.8 : 1}"/>`;
    if (prog > 0.5) { const n = Math.round(20 * pr); for (let j = 0; j < n; j++) { const u = Math.sqrt(hash(j, idx)) * 0.92, a = hash(j, idx + 40) * 6.283, q = P(x, yc + Ly * pr * u * Math.cos(a), zc + Hz * pr * u * Math.sin(a)); d += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="1.15" style="fill:#d6b06a;stroke:rgba(90,60,20,.7);stroke-width:.3"/>`; } }
  });
  /* gun */
  if (!done && p < 0.28) { const x = xi(s), q = P(x, yc, zc); d += isoBox(P, x - 1.4, yc - 0.55, zc - 0.55, 2.8, 1.1, 1.1, '#b5382b'); for (let j = 0; j < 6; j++) { const a = j * 1.05 + PP.v * 0.2, e = P(x, yc + Math.cos(a) * 2.2, zc + Math.sin(a) * 2.2); d += `<line x1="${q[0].toFixed(1)}" y1="${q[1].toFixed(1)}" x2="${e[0].toFixed(1)}" y2="${e[1].toFixed(1)}" style="stroke:#e8b82a;stroke-width:1.6;stroke-linecap:round"/>`; } }
  /* stage tags along lateral */
  for (let i = 1; i <= N; i++) { const q = P(xi(i), yc, zc + 4.1); d += `<text x="${q[0].toFixed(1)}" y="${(q[1]).toFixed(1)}" text-anchor="middle" class="tg3" style="font-size:13px;font-weight:700;fill:${i === s && !done ? 'var(--accent)' : 'var(--ink)'}">${i}</text>`; }
  const hq = P(7, yc, zc - 1.6), tq = P(59, yc, zc - 1.6);
  d += `<text x="${hq[0].toFixed(1)}" y="${(hq[1] + 14).toFixed(1)}" class="tg3" text-anchor="middle">HEEL</text><text x="${tq[0].toFixed(1)}" y="${(tq[1] + 14).toFixed(1)}" class="tg3" text-anchor="middle">TOE</text>`;
  const dy = document.getElementById('ppdyn'); if (dy) dy.innerHTML = d;
  const msgEl = document.getElementById('pp_msg');
  if (msgEl) msgEl.textContent = done ? 'اكتملت المراحل الثماني: تُحفر الـ plugs ويبدأ الـ flowback.' : p < 0.28 ? `المرحلة ${s}: وصل الـ wireline: يُثبَّت plug لعزل المراحل السابقة ثم تُطلق الـ guns فتُثقب العناقيد الثلاثة.` : `المرحلة ${s}: ضخ الـ pad ثم الـ proppant: الشقوق تنمو من كل عنقود عمودياً على البئر وتتنافس على السائل (stress shadow).`;
  const sl = document.getElementById('pp_v'); if (sl && +sl.value !== Math.round(v)) sl.value = Math.round(v);
}
function ppLoop(ts) { if (!PP.playing) return; if (!PP.last) PP.last = ts; const dt = (ts - PP.last) / 1000; PP.last = ts; PP.v += dt * 40; if (PP.v >= 800) { PP.v = 800; PP.playing = false; const b = document.getElementById('pp_play'); if (b) b.textContent = 'تشغيل'; } ppRender(); if (PP.playing) requestAnimationFrame(ppLoop); }

/* ---- rock texture + gauges + grain close-up for the canvas ---- */
const TEX = { key: '', pay: null, bar: null };
function rockTex(ctx, T) {
  const key = T.earth + '|' + T.earth2; if (TEX.key === key && TEX.pay) return TEX;
  const mk = (base, seed, lam) => { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 160, 160);
    for (let i = 0; i < 460; i++) { const x = hash(i, seed) * 160, y = hash(i + 500, seed) * 160, r = 0.5 + hash(i + 900, seed) * 1.3; g.fillStyle = hash(i, seed + 3) > 0.5 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1; for (let j = 0; j < lam; j++) { const y0 = (j + 0.5) * 160 / lam; g.beginPath(); g.moveTo(0, y0); for (let x = 0; x <= 160; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.07 + j) * 2.2); g.stroke(); } return c; };
  TEX.key = key; TEX.pay = ctx.createPattern(mk(T.earth, 1, 5), 'repeat'); TEX.bar = ctx.createPattern(mk(T.earth2, 2, 10), 'repeat'); return TEX;
}
function gauge(ctx, T, x, y, r, val, max, unit) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = T.surface; ctx.strokeStyle = T.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = T.muted; ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) { const a = (-225 + 27 * i) * Math.PI / 180, l = i % 5 === 0 ? 9 : 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3)); ctx.lineTo(Math.cos(a) * (r - l), Math.sin(a) * (r - l)); ctx.stroke(); }
  const a = (-225 + 270 * clamp01(val / max)) * Math.PI / 180; ctx.strokeStyle = T.gas; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8)); ctx.stroke();
  ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 6.3); ctx.fill();
  ctx.font = '600 11px "IBM Plex Mono",monospace'; ctx.textAlign = 'center'; ctx.fillStyle = T.ink; ctx.fillText(Math.round(val).toLocaleString('en-US'), 0, r * 0.42); ctx.fillStyle = T.muted; ctx.font = '10px "IBM Plex Mono",monospace'; ctx.fillText(unit, 0, r * 0.42 + 11);
  ctx.restore();
}
const lerp = (a, b, t) => a + (b - a) * t;
function grainLoupe(ctx, T, cx, cy, r, t, now) {
  const cf = clamp01((t - 0.74) / 0.14), tex = TEX.pay;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.clip();
  ctx.fillStyle = t < 0.80 ? T.soft : T.waterbg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  const wx = lerp(0.8 * r, 0.46 * r, cf);
  ctx.fillStyle = tex; ctx.fillRect(cx - r, cy - r, r - wx, 2 * r); ctx.fillRect(cx + wx, cy - r, r - wx, 2 * r);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - wx, cy - r); ctx.lineTo(cx - wx, cy + r); ctx.moveTo(cx + wx, cy - r); ctx.lineTo(cx + wx, cy + r); ctx.stroke();
  const gr = lerp(5.2, 6.6, cf), dx = lerp(30, 14.5, cf), dyy = lerp(30, 13, cf), drift = t < 0.80 ? (now * 14) % dyy : 0;
  const blobs = [];
  for (let row = -6; row <= 6; row++) for (let col = -3; col <= 3; col++) {
    const jx = (hash(row + 9, col + 3) - 0.5) * lerp(14, 1.6, cf), jy = (hash(col + 5, row + 2) - 0.5) * lerp(14, 1.6, cf);
    const x = cx + (col + (row & 1 ? 0.5 : 0)) * dx + jx, y = cy + row * dyy + drift + jy;
    if (x - gr < cx - wx || x + gr > cx + wx || y < cy - r - 8 || y > cy + r + 8) continue;
    const g = ctx.createRadialGradient(x - gr * 0.3, y - gr * 0.3, 1, x, y, gr);
    g.addColorStop(0, '#f0d9a0'); g.addColorStop(1, '#c19a55'); ctx.fillStyle = g; ctx.strokeStyle = 'rgba(90,60,20,.75)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(x, y, gr, 0, 6.3); ctx.fill(); ctx.stroke(); blobs.push([x, y]);
  }
  if (cf > 0.6 && HFS.breaker === 'poor') { ctx.fillStyle = T.oil; ctx.globalAlpha = 0.6; blobs.forEach((b, i) => { if (i % 2) { ctx.beginPath(); ctx.arc(b[0] + gr * 0.9, b[1] + gr * 0.6, gr * 0.55, 0, 6.3); ctx.fill(); } }); ctx.globalAlpha = 1; }
  if (t >= 0.88) { const prodN = t >= 0.94; ctx.fillStyle = prodN ? T.oil : T.water; for (let i = 0; i < 14; i++) { const x = cx - wx + 8 + hash(i, 7) * (2 * wx - 16), y = cy + r - ((now * 22 + hash(i, 3) * 160) % (2 * r)); ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.3); ctx.fill(); } }
  ctx.restore();
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.stroke();
}

/* ---- main canvas ---- */
function hfDraw() {
  const cv = HFS.cv; if (!cv) return;
  const dpr = window.devicePixelRatio || 1, W = 1000, H = 440, wpx = cv.clientWidth; if (!wpx) return;
  if (cv.width !== Math.round(wpx * dpr)) { cv.width = Math.round(wpx * dpr); cv.height = Math.round(wpx * dpr * H / W); }
  const ctx = cv.getContext('2d'), k = cv.width / W; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.direction = 'ltr';
  const T = tok(), tex = rockTex(ctx, T), t = HFS.t, S = hfState(t), now = performance.now() / 1000, P0 = hfParams();
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
  const yc = 220, strong = HFS.barrier === 'strong', hmax = strong ? 150 : 310, X0 = 48, LP = 556, clos = t >= 0.88;
  const layers = (x0, x1) => { ctx.fillStyle = tex.bar; ctx.fillRect(x0, 20, x1 - x0, 120); ctx.fillRect(x0, 300, x1 - x0, 120); ctx.fillStyle = tex.pay; ctx.fillRect(x0, 140, x1 - x0, 160); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, 140); ctx.lineTo(x1, 140); ctx.moveTo(x0, 300); ctx.lineTo(x1, 300); ctx.stroke(); };
  layers(0, 620);
  /* natural fractures in the pay zone */
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 0.8; for (let i = 0; i < 9; i++) { const x = 90 + hash(i, 61) * 500, y0 = 150 + hash(i, 62) * 120; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 18 + hash(i, 63) * 20, y0 + 22 + hash(i, 64) * 30); ctx.stroke(); }
  ctx.fillStyle = T.muted; ctx.font = '12px "IBM Plex Mono",monospace'; ctx.textAlign = 'right'; ctx.fillText('upper barrier (σ high)', 612, 40); ctx.fillText('pay zone', 612, 160); ctx.fillText('lower barrier (σ high)', 612, 410);
  const L = S.L * LP, hh = x => { const u = L > 1 ? x / L : 1; return (hmax / 2) * Math.pow(Math.max(0, 1 - u * u), 0.28) * (0.35 + 0.65 * Math.min(1, S.L * 3)); }, sh = clamp01((t - 0.80) / 0.08);
  if (L > 2) {
    ctx.beginPath(); ctx.moveTo(X0, yc - hh(0)); for (let x = 0; x <= L; x += 4) ctx.lineTo(X0 + x, yc - hh(x) + (hash(x, 3) - 0.5) * 1.2); for (let x = L; x >= 0; x -= 4) ctx.lineTo(X0 + x, yc + hh(x) + (hash(x, 4) - 0.5) * 1.2); ctx.closePath();
    const g = ctx.createLinearGradient(0, yc - hmax / 2, 0, yc + hmax / 2); const col = t < 0.2 ? T.waterbg : T.soft; g.addColorStop(0, col); g.addColorStop(0.5, T.waterbg); g.addColorStop(1, col);
    ctx.globalAlpha = clos ? 0.6 : 0.96; ctx.fillStyle = g; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = T.accent; ctx.lineWidth = 1.6; ctx.stroke();
    const settle = hfSettleNorm(), e = Math.max(0, Math.min(t, 0.80) - 0.20), ncol = Math.max(8, Math.floor(L / 5)), cmaxv = P0.cmax;
    for (let i = 0; i < ncol; i++) {
      const xi = (i + 0.5) / ncol, x = xi * L, tau = 0.20 + (1 - xi) * e, c = hfProp(tau, cmaxv); if (c <= 0) continue;
      const hl = hh(x), age = (Math.min(t, 0.80) - tau) * 200 / 120, D = clamp01(settle * age), cnt = Math.max(2, Math.round(c * 3.2));
      for (let j = 0; j < cnt; j++) { const r1 = hash(i, j), r2 = hash(j, i + 7), y0 = (r1 - 0.5) * 2 * (hl - 3), yb = hl - 3 - r2 * Math.min(hl * 0.55, 6 + 8 * c) * D; let y = y0 + D * (yb - y0); y = Math.max(-hl + 3, Math.min(hl - 3, y)); ctx.fillStyle = '#c9a15c'; ctx.fillRect(X0 + x + (r2 - 0.5) * 4, yc + y, 2.4, 2.4); }
      if (D > 0.15) { const bh = D * Math.min(10, 2 + c * 2.2); ctx.fillStyle = '#c9a15c'; ctx.globalAlpha = 0.9; ctx.fillRect(X0 + x - 2.5, yc + hl - bh, 5, bh); ctx.globalAlpha = 1; }
    }
    if (t >= 0.80 && HFS.breaker === 'poor') { for (let i = 0; i < 90; i++) { const x = hash(i, 3) * L, y = (hash(i, 9) - 0.5) * 2 * hh(x) * 0.8; ctx.fillStyle = T.oil; ctx.globalAlpha = 0.45; ctx.fillRect(X0 + x, yc + y, 5, 3); } ctx.globalAlpha = 1; }
    if (t >= 0.04 && t < 0.80 && S.q > 0) { ctx.strokeStyle = T.water; ctx.lineWidth = 1.2; for (let i = 0; i < 12; i++) { const x = (i + 0.5) / 12 * L, hl = hh(x), ph2 = (now * 0.6 + i * 0.23) % 1; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X0 + x, yc + sg * (hl + 3)); ctx.lineTo(X0 + x, yc + sg * (hl + 3 + ph2 * 12)); ctx.stroke(); } } }
    ctx.fillStyle = T.muted; ctx.font = '12px "IBM Plex Sans Arabic",sans-serif'; ctx.textAlign = 'left';
    if (t >= 0.2 && t < 0.80) ctx.fillText('tip: pad (no proppant)', X0 + Math.max(0, L - 140), yc - hh(L * 0.8) - 8);
    if (t >= 0.36 && t < 0.80) ctx.fillText('slurry + proppant', X0 + 30, yc - hh(30) - 8);
  }
  /* wellbore: casing, cement, tubing, perforation tunnels */
  ctx.fillStyle = '#b9bcb5'; ctx.fillRect(20, 20, 6, 400); ctx.fillRect(46, 20, 6, 400);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.7; for (let y = 24; y < 420; y += 8) { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(26, y + 6); ctx.moveTo(46, y); ctx.lineTo(52, y + 6); ctx.stroke(); }
  const cg = ctx.createLinearGradient(26, 0, 46, 0); cg.addColorStop(0, '#7b858d'); cg.addColorStop(0.5, '#c4cbd1'); cg.addColorStop(1, '#6f7881'); ctx.fillStyle = cg; ctx.fillRect(26, 20, 20, 400);
  ctx.fillStyle = T.bg; ctx.fillRect(29, 20, 14, 400); ctx.fillStyle = '#6f787f'; ctx.fillRect(33, 20, 6, 400);
  ctx.fillStyle = '#2b2f33'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(52, yc - 18 + i * 9); ctx.lineTo(60, yc - 21 + i * 9); ctx.lineTo(60, yc - 15 + i * 9); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = T.muted; ctx.font = '12px "IBM Plex Sans Arabic",sans-serif'; ctx.textAlign = 'left'; ctx.fillText('casing + cement', 56, 14); ctx.fillText('perforations', 62, yc + 44);
  if (S.q > 0 && t >= 0.04) { ctx.strokeStyle = T.water; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -now * 30; ctx.beginPath(); ctx.moveTo(36, 28); ctx.lineTo(36, yc); ctx.stroke(); ctx.setLineDash([]); }
  if (t >= 0.88 && L > 2) {
    const prodN = t >= 0.94, col = prodN ? T.oil : T.water; ctx.fillStyle = col;
    for (let i = 0; i < 46; i++) { const s = (i / 46 + now * 0.12) % 1, x = L * (1 - s), y = (hash(i, 5) - 0.5) * hh(x) * 1.4; ctx.beginPath(); ctx.arc(X0 + x, yc + y, 2.6, 0, 6.3); ctx.fill(); }
    ctx.strokeStyle = col; ctx.lineWidth = 1.4; for (let i = 0; i < 30; i++) { const x = hash(i, 11) * L, sg = i % 2 ? 1 : -1, dd = ((now * 0.5 + hash(i, 2)) % 1), hl = hh(x), y0 = yc + sg * (hl + 40), y1 = yc + sg * (hl + 4), y = y0 + (y1 - y0) * dd; ctx.beginPath(); ctx.moveTo(X0 + x, y - sg * 6); ctx.lineTo(X0 + x, y); ctx.stroke(); }
    ctx.fillStyle = T.muted; ctx.font = '12px "IBM Plex Sans Arabic",sans-serif'; ctx.textAlign = 'right'; ctx.fillText(prodN ? 'hydrocarbons: matrix → fracture → wellbore' : 'flowback: fluid + gel + proppant', 612, 232 + hmax / 2 + 14);
  }
  /* gauges */
  gauge(ctx, T, 484, 366, 32, S.ps, HFCACHE.rating || 10000, 'psi'); gauge(ctx, T, 556, 366, 32, S.q, Math.max(100, P0.q * 1.4), 'bpm');
  /* right: cross-section */
  const ox = 650, pw = 340; layers(ox, ox + pw); const cx = ox + pw / 2, hasProp = t >= 0.36; let wpxF;
  if (t < 0.04) wpxF = 1; else if (t < 0.80) wpxF = 3 + 27 * clamp01(S.pn / 1.2); else wpxF = (3 + 27 * clamp01(1.05 / 1.2)) * (1 - sh) + Math.max(hasProp ? 7 : 0, 0.8) * sh;
  if (t >= 0.80 && !hasProp) wpxF = 0.8; if (t >= 0.88) wpxF = Math.max(hasProp ? 7 : 0, 0.8);
  const hFr = Math.min(hmax * 0.5, 95 + (strong ? 0 : 90)) * (t < 0.04 ? 0.15 : 1) * (0.4 + 0.6 * Math.min(1, S.L * 3));
  ctx.fillStyle = t < 0.2 ? T.waterbg : T.soft; ctx.beginPath(); ctx.rect(cx - wpxF / 2, yc - hFr, wpxF, hFr * 2); ctx.fill();
  ctx.strokeStyle = T.accent; ctx.lineWidth = 1.5; ctx.beginPath(); for (let y = -hFr; y <= hFr; y += 6) { const j = (hash(y, 1) - 0.5) * 1.2; ctx.lineTo(cx - wpxF / 2 + j, yc + y); } ctx.stroke(); ctx.beginPath(); for (let y = -hFr; y <= hFr; y += 6) { const j = (hash(y, 2) - 0.5) * 1.2; ctx.lineTo(cx + wpxF / 2 + j, yc + y); } ctx.stroke();
  const cNow = t >= 0.80 ? (hasProp ? 3 : 0) : S.c;
  if (cNow > 0) { const n = Math.round((t >= 0.80 ? 3 : cNow) * 14), settle = hfSettleNorm(); for (let j = 0; j < n; j++) { const r1 = hash(j, 21), r2 = hash(j, 22), D = t >= 0.80 ? 0.5 * settle : 0, y = yc + (r1 - 0.5) * 2 * (hFr - 3) * (1 - D) + D * (hFr - 6 - r2 * 20); ctx.fillStyle = '#c9a15c'; ctx.fillRect(cx - wpxF / 2 + 1 + r2 * Math.max(wpxF - 3, 0), Math.min(Math.max(y, yc - hFr + 2), yc + hFr - 3), 2.6, 2.6); } }
  const arrow = (x1, y1, x2, y2, col) => { ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 8 * Math.cos(a - 0.45), y2 - 8 * Math.sin(a - 0.45)); ctx.lineTo(x2 - 8 * Math.cos(a + 0.45), y2 - 8 * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill(); };
  for (const yy of [yc - 60, yc, yc + 60]) { arrow(ox + 12, yy, cx - Math.max(wpxF, 2) / 2 - 8, yy, T.ink); arrow(ox + pw - 12, yy, cx + Math.max(wpxF, 2) / 2 + 8, yy, T.ink); }
  if (((t >= 0.04 && t < 0.80) || (t >= 0.14 && t < 0.20)) && S.pn > 0.05) { const pl = 8 + 22 * clamp01(S.pn / 1.2); for (const yy of [yc - 40, yc + 40]) { arrow(cx - 1, yy, cx - pl, yy, T.water); arrow(cx + 1, yy, cx + pl, yy, T.water); } }
  ctx.fillStyle = T.muted; ctx.font = '12px "IBM Plex Mono",monospace'; ctx.textAlign = 'center'; ctx.fillText('σ_hmin →  ←  σ_hmin', cx, 36); ctx.fillText('cross-section (width exaggerated)', cx, 80);
  ctx.font = '600 13px "IBM Plex Sans Arabic",sans-serif'; ctx.fillStyle = T.ink; ctx.direction = 'rtl';
  ctx.fillText(t < 0.04 ? 'الشق مغلق' : t >= 0.88 ? 'مغلق على حزمة الدعم' : t >= 0.80 ? 'توقف الضخ: السائل يتسرب والشق يُغلق' : (S.pn > 0.02 ? 'ضغط السائل أعلى من الإجهاد: الشق مفتوح' : 'ضغط السائل أقل من الإجهاد: يُغلق'), cx, 62); ctx.direction = 'ltr';
  /* close-up lens */
  const lx = cx, ly = 356, lr = 58; ctx.strokeStyle = T.accent; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx, yc + hFr); ctx.lineTo(cx, ly - lr); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(cx, yc + hFr, 4, 0, 6.3); ctx.stroke();
  grainLoupe(ctx, T, lx, ly, lr, t, now);
  ctx.fillStyle = T.muted; ctx.font = '11px "IBM Plex Mono",monospace'; ctx.textAlign = 'center'; ctx.fillText('close-up: proppant grains', cx, 432);
  ctx.textAlign = 'left'; ctx.fillStyle = T.muted; ctx.font = '12px "IBM Plex Mono",monospace'; ctx.fillText('side view: length × height', 60, 432);
  ctx.strokeStyle = T.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(628, 20); ctx.lineTo(628, 420); ctx.stroke();
}

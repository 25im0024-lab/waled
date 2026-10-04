/* IELTS Coach — SVG chart & diagram renderer for Academic Writing Task 1.
   Types: line, bar (grouped / stacked / horizontal), pie, table, process, map.
   Marks follow the dataviz spec: 2px lines, ≥8px markers with surface ring, ≤24px bars with 4px rounded data-end,
   2px surface gaps, recessive hairline grid, legend always for ≥2 series + selective direct labels,
   hover tooltip, and a "data table" view so identity never relies on colour alone. */
(function () {
  'use strict';
  const I = window.IELTS, esc = I.esc;
  const SER = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
  const SER_HEX = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];
  const SURFACE = 'var(--panel)';
  const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross'];

  /* ---------- utils ---------- */
  const f = n => Math.round(n * 10) / 10;
  function nice(min, max, step) {
    if (step) { return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step }; }
    const span = (max - min) || 1, raw = span / 5, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = [1, 2, 2.5, 5, 10].find(x => x * p >= raw) * p;
    return { min: Math.floor(min / m) * m, max: Math.ceil(max / m) * m, step: m };
  }
  const ticks = sc => { const a = []; for (let v = sc.min; v <= sc.max + sc.step / 1000; v += sc.step) a.push(Math.round(v * 1e6) / 1e6); return a; };
  const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const wrap = (t, n) => { const w = String(t).split(' '), L = []; let c = ''; w.forEach(x => { if ((c + ' ' + x).trim().length > n) { L.push(c); c = x; } else c = (c + ' ' + x).trim(); }); if (c) L.push(c); return L; };
  const thousands = v => Math.abs(v) >= 10000 ? v.toLocaleString('en-US') : String(v);

  function marker(shape, x, y, color, r = 4.5) {
    const ring = `stroke="${SURFACE}" stroke-width="2"`;
    switch (shape) {
      case 'square': return `<rect x="${f(x - r)}" y="${f(y - r)}" width="${r * 2}" height="${r * 2}" fill="${color}" ${ring}/>`;
      case 'triangle': return `<path d="M${f(x)} ${f(y - r - 1)} L${f(x + r + 1)} ${f(y + r)} L${f(x - r - 1)} ${f(y + r)}Z" fill="${color}" ${ring} stroke-linejoin="round"/>`;
      case 'diamond': return `<path d="M${f(x)} ${f(y - r - 1)} L${f(x + r + 1)} ${f(y)} L${f(x)} ${f(y + r + 1)} L${f(x - r - 1)} ${f(y)}Z" fill="${color}" ${ring} stroke-linejoin="round"/>`;
      case 'cross': return `<path d="M${f(x - r)} ${f(y - r)} L${f(x + r)} ${f(y + r)} M${f(x + r)} ${f(y - r)} L${f(x - r)} ${f(y + r)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
      default: return `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${color}" ${ring}/>`;
    }
  }
  function legendHtml(items, kind) {
    if (items.length < 2) return '';
    return `<div class="legend" role="list">${items.map((it, i) => `<span role="listitem"><i class="${kind === 'line' ? '' : 'sw'}" style="background:${SER[(it.ci != null ? it.ci : i) % 5]}"></i>${esc(it.name)}</span>`).join('')}</div>`;
  }
  function tableHtml(spec) {
    let head = [], rows = [];
    if (spec.type === 'pie') {
      const names = [...new Set(spec.pies.flatMap(p => p.slices.map(s => s.name)))];
      head = [''].concat(spec.pies.map(p => p.title));
      rows = names.map(n => [n].concat(spec.pies.map(p => { const s = p.slices.find(x => x.name === n); return s ? s.value + (spec.unit || '') : '–'; })));
    } else if (spec.type === 'table') { head = spec.head; rows = spec.rows; }
    else if (spec.series) {
      head = [spec.x && spec.x.label || ''].concat(spec.series.map(s => s.name));
      rows = spec.categories.map((c, i) => [c].concat(spec.series.map(s => s.data[i] == null ? '–' : s.data[i])));
    } else return '';
    return `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function frame(spec, inner, legend, extra = '') {
    const tv = spec.type !== 'table' && spec.type !== 'process' && spec.type !== 'map' ? `<details class="muted"><summary>عرض البيانات كجدول (للوصول)</summary><div class="tblwrap">${tableHtml(spec)}</div></details>` : '';
    return `<figure class="chartbox" style="margin:8px 0"><div class="ctitle">${esc(spec.title)}</div>${spec.sub ? `<div class="csub">${esc(spec.sub)}</div>` : ''}${inner}${legend}${extra}${tv}</figure>`;
  }

  /* ---------- tooltip ---------- */
  let tip;
  function showTip(html, cx, cy) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'ctip'; document.body.appendChild(tip); }
    tip.innerHTML = html; tip.style.display = 'block';
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, cx + 14)) + 'px';
    tip.style.top = Math.min(window.innerHeight - h - 8, Math.max(8, cy - h - 10)) + 'px';
  }
  const hideTip = () => { if (tip) tip.style.display = 'none'; };

  /* ---------- line ---------- */
  function line(spec) {
    const W = 760, H = 400, multi = spec.series.length > 1, m = { l: 62, r: multi ? 112 : 30, t: 26, b: 60 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b, n = spec.categories.length;
    const vals = spec.series.flatMap(s => s.data.filter(v => v != null));
    const y = spec.y || {};
    const sc = nice(y.min != null ? y.min : Math.min(0, ...vals), y.max != null ? y.max : Math.max(...vals), y.step);
    const X = i => m.l + (n === 1 ? iw / 2 : i * iw / (n - 1)), Y = v => m.t + ih - (v - sc.min) / (sc.max - sc.min) * ih;
    let g = '';
    ticks(sc).forEach(t => { g += `<line x1="${m.l}" x2="${W - m.r}" y1="${f(Y(t))}" y2="${f(Y(t))}" stroke="var(--grid)" stroke-width="1"/><text x="${m.l - 8}" y="${f(Y(t)) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" style="font-variant-numeric:tabular-nums">${thousands(t)}</text>`; });
    g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(sc.min)}" y2="${Y(sc.min)}" stroke="var(--axis)" stroke-width="1"/>`;
    spec.categories.forEach((c, i) => { g += `<text x="${f(X(i))}" y="${H - m.b + 18}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(c)}</text>`; });
    if (spec.x && spec.x.label) g += `<text x="${m.l + iw / 2}" y="${H - 14}" text-anchor="middle" font-size="12" fill="var(--muted)">${esc(spec.x.label)}</text>`;
    if (y.label) g += `<text x="${m.l}" y="14" font-size="12" fill="var(--muted)">${esc(y.label)}</text>`;
    // direct end labels only if they don't collide (else legend + tooltip carry identity)
    const ends = spec.series.map((s, si) => { let li = s.data.length - 1; while (li >= 0 && s.data[li] == null) li--; return { si, y: Y(s.data[li]), li }; }).sort((a, b) => a.y - b.y);
    const direct = multi && ends.every((e, i) => i === 0 || e.y - ends[i - 1].y >= 15);
    const ci = si => (spec.series[si].ci != null ? spec.series[si].ci : si) % 5;
    spec.series.forEach((s, si) => {
      const pts = s.data.map((v, i) => v == null ? null : [X(i), Y(v)]).filter(Boolean);
      g += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join(' ')}" fill="none" stroke="${SER[ci(si)]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach(p => { g += marker(SHAPES[ci(si)], p[0], p[1], SER[ci(si)]); });
      if (direct) { const e = ends.find(x => x.si === si); g += `<text x="${f(X(e.li)) + 12}" y="${f(e.y) + 4}" font-size="12" fill="var(--ink)">${esc(s.name)}</text>`; }
    });
    g += `<line id="cx" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" stroke="var(--axis)" stroke-width="1" opacity="0"/><rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/>`;
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.title)}">${g}</svg>`;
    return {
      html: frame(spec, svg, legendHtml(spec.series.map((s, i) => ({ name: s.name, ci: s.ci != null ? s.ci : i })), 'line')),
      bind(el) {
        const sv = el.querySelector('svg'), hit = sv.querySelector('.hit'), cx = sv.querySelector('#cx');
        hit.addEventListener('pointermove', e => {
          const r = sv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
          const i = Math.max(0, Math.min(n - 1, Math.round((px - m.l) / (iw / Math.max(1, n - 1)))));
          cx.setAttribute('x1', X(i)); cx.setAttribute('x2', X(i)); cx.setAttribute('opacity', 1);
          showTip(`<b>${esc(spec.categories[i])}</b>` + spec.series.map((s, si) => `<div><span style="color:${SER_HEX[ci(si)]}">●</span> ${esc(s.name)}: ${s.data[i] == null ? '–' : esc(s.data[i]) + esc(y.unit || '')}</div>`).join(''), e.clientX, e.clientY);
        });
        hit.addEventListener('pointerleave', () => { cx.setAttribute('opacity', 0); hideTip(); });
      }
    };
  }

  /* ---------- bar (grouped / stacked / horizontal) ---------- */
  function topRound(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, h, w / 2);
    return `M${f(x)} ${f(y + h)} V${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} H${f(x + w - r)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} V${f(y + h)} Z`;
  }
  function rightRound(x, y, w, h, r) {
    if (w <= 0) return '';
    r = Math.min(r, w, h / 2);
    return `M${f(x)} ${f(y)} H${f(x + w - r)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} V${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} H${f(x)} Z`;
  }
  function bar(spec) {
    const ns = spec.series.length, n = spec.categories.length, stacked = !!spec.stacked, horiz = !!spec.horizontal;
    const W = 760, H = horiz ? Math.max(300, 90 + n * (ns * 26 + 14)) : 400;
    const m = horiz ? { l: 150, r: 50, t: 28, b: 44 } : { l: 62, r: 30, t: 28, b: 58 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b, y = spec.y || {};
    const tot = i => spec.series.reduce((a, s) => a + (s.data[i] || 0), 0);
    const maxv = stacked ? Math.max(...spec.categories.map((_, i) => tot(i))) : Math.max(...spec.series.flatMap(s => s.data));
    const sc = nice(Math.min(0, y.min != null ? y.min : 0), y.max != null ? y.max : maxv, y.step);
    let g = '', hits = '';
    const V = horiz ? v => m.l + (v - sc.min) / (sc.max - sc.min) * iw : v => m.t + ih - (v - sc.min) / (sc.max - sc.min) * ih;
    ticks(sc).forEach(t => {
      if (horiz) g += `<line x1="${f(V(t))}" x2="${f(V(t))}" y1="${m.t}" y2="${m.t + ih}" stroke="var(--grid)"/><text x="${f(V(t))}" y="${H - m.b + 16}" text-anchor="middle" font-size="11" fill="var(--muted)">${thousands(t)}</text>`;
      else g += `<line x1="${m.l}" x2="${W - m.r}" y1="${f(V(t))}" y2="${f(V(t))}" stroke="var(--grid)"/><text x="${m.l - 8}" y="${f(V(t)) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${thousands(t)}</text>`;
    });
    g += horiz ? `<line x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${m.t + ih}" stroke="var(--axis)"/>` : `<line x1="${m.l}" x2="${W - m.r}" y1="${V(sc.min)}" y2="${V(sc.min)}" stroke="var(--axis)"/>`;
    if (y.label) g += `<text x="${horiz ? m.l + iw / 2 : m.l}" y="${horiz ? H - 8 : 14}" ${horiz ? 'text-anchor="middle"' : ''} font-size="12" fill="var(--muted)">${esc(y.label)}</text>`;
    const slot = (horiz ? ih : iw) / n, labelBars = !stacked && ns * n <= 10;
    spec.categories.forEach((c, ci) => {
      const c0 = (horiz ? m.t : m.l) + slot * ci;
      const bw = Math.min(24, (slot * .8 - (stacked ? 0 : (ns - 1) * 2)) / (stacked ? 1 : ns));
      const gw = stacked ? bw : ns * bw + (ns - 1) * 2, start = c0 + (slot - gw) / 2;
      if (horiz) g += `<text x="${m.l - 8}" y="${f(c0 + slot / 2) + 4}" text-anchor="end" font-size="12" fill="var(--ink)">${esc(c)}</text>`;
      else g += `<text x="${f(c0 + slot / 2)}" y="${H - m.b + 18}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(c)}</text>`;
      let acc = 0;
      spec.series.forEach((s, si) => {
        const v = s.data[ci]; if (v == null) return;
        let d, tx, ty, anchor = 'middle', inside = false;
        if (stacked) {
          const a = V(acc), b = V(acc + v); acc += v;
          if (horiz) { const x = Math.min(a, b) + (si ? 1 : 0), w = Math.abs(b - a) - (si ? 2 : 0); d = si === ns - 1 ? rightRound(x, start, w, bw, 4) : `M${f(x)} ${f(start)} h${f(w)} v${bw} h${f(-w)}Z`; tx = x + w / 2; ty = start + bw / 2 + 4; inside = w > 34; }
          else { const top = Math.min(a, b), h = Math.abs(a - b) - (si ? 2 : 0); d = si === ns - 1 ? topRound(start, top, bw, h, 4) : `M${f(start)} ${f(top)} h${bw} v${f(h)} h${-bw}Z`; tx = start + bw / 2; ty = top + h / 2 + 4; inside = h > 18 && bw > 30; }
        } else if (horiz) { const x0 = V(Math.max(0, sc.min)), x1 = V(v), by = start + si * (bw + 2); d = rightRound(x0, by, x1 - x0, bw, 4); tx = x1 + 6; ty = by + bw / 2 + 4; anchor = 'start'; }
        else { const y1 = V(v), bx = start + si * (bw + 2); d = topRound(bx, y1, bw, V(Math.max(0, sc.min)) - y1, 4); tx = bx + bw / 2; ty = y1 - 5; }
        g += `<path d="${d}" fill="${SER[si]}" data-c="${ci}" data-s="${si}" class="mk"/>`;
        if (stacked && inside) g += `<text x="${f(tx)}" y="${f(ty)}" text-anchor="middle" font-size="11" fill="${lum(SER_HEX[si]) > .3 ? '#06110f' : '#fff'}">${v}</text>`;
        if (!stacked && labelBars) g += `<text x="${f(tx)}" y="${f(ty)}" text-anchor="${anchor}" font-size="11" fill="var(--ink)">${v}</text>`;
      });
    });
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.title)}">${g}</svg>`;
    return {
      html: frame(spec, svg, legendHtml(spec.series.map((s, i) => ({ name: s.name, ci: s.ci != null ? s.ci : i })), 'bar')),
      bind(el) {
        el.querySelectorAll('.mk').forEach(p => {
          p.addEventListener('pointermove', e => { const ci = +p.dataset.c, si = +p.dataset.s; showTip(`<b>${esc(spec.categories[ci])}</b><span style="color:${SER_HEX[si]}">●</span> ${esc(spec.series[si].name)}: ${esc(spec.series[si].data[ci])}${esc(y.unit || '')}`, e.clientX, e.clientY); p.style.opacity = .85; });
          p.addEventListener('pointerleave', () => { hideTip(); p.style.opacity = 1; });
        });
      }
    };
  }

  /* ---------- pie ---------- */
  function pie(spec) {
    const names = [...new Set(spec.pies.flatMap(p => p.slices.map(s => s.name)))];
    const col = n => names.indexOf(n) % 5;              // colour follows the entity, not its rank
    const np = spec.pies.length, W = 380 * np, H = 340, r = 100;
    let g = '';
    spec.pies.forEach((p, k) => {
      const cx = 190 + 380 * k, cy = 175, total = p.slices.reduce((a, s) => a + s.value, 0);
      g += `<text x="${cx}" y="22" text-anchor="middle" font-size="13" font-weight="600" fill="var(--ink)">${esc(p.title)}</text>`;
      let a0 = -Math.PI / 2;
      p.slices.forEach(s => {
        const a1 = a0 + s.value / total * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0;
        const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
        g += `<path d="M${cx} ${cy} L${f(x0)} ${f(y0)} A${r} ${r} 0 ${big} 1 ${f(x1)} ${f(y1)}Z" fill="${SER[col(s.name)]}" stroke="${SURFACE}" stroke-width="2" class="mk" data-p="${k}" data-n="${esc(s.name)}" data-v="${s.value}"/>`;
        const am = (a0 + a1) / 2, lx = cx + (r + 18) * Math.cos(am), ly = cy + (r + 18) * Math.sin(am) + 4;
        g += `<text x="${f(lx)}" y="${f(ly)}" text-anchor="${Math.cos(am) > .15 ? 'start' : Math.cos(am) < -.15 ? 'end' : 'middle'}" font-size="12" fill="var(--ink)">${s.value}${esc(spec.unit || '%')}</text>`;
        a0 = a1;
      });
    });
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.title)}">${g}</svg>`;
    const leg = `<div class="legend" role="list">${names.map(n => `<span role="listitem"><i class="sw" style="background:${SER[col(n)]}"></i>${esc(n)}</span>`).join('')}</div>`;
    return {
      html: frame(spec, svg, leg),
      bind(el) {
        el.querySelectorAll('.mk').forEach(p => {
          p.addEventListener('pointermove', e => showTip(`<b>${esc(spec.pies[+p.dataset.p].title)}</b>${esc(p.dataset.n)}: ${esc(p.dataset.v)}${esc(spec.unit || '%')}`, e.clientX, e.clientY));
          p.addEventListener('pointerleave', hideTip);
        });
      }
    };
  }

  /* ---------- table ---------- */
  function table(spec) { return { html: `<figure class="chartbox"><div class="ctitle">${esc(spec.title)}</div>${spec.sub ? `<div class="csub">${esc(spec.sub)}</div>` : ''}<div class="tblwrap">${tableHtml(spec)}</div></figure>` }; }

  /* ---------- process diagram ---------- */
  function process(spec) {
    const cols = spec.cols || 3, bw = 190, bh = 74, gx = 56, gy = 46, steps = spec.steps, rows = Math.ceil(steps.length / cols);
    const W = cols * bw + (cols - 1) * gx + 24, H = rows * bh + (rows - 1) * gy + 24;
    const pos = steps.map((_, i) => { const r = Math.floor(i / cols); let c = i % cols; if (r % 2) c = cols - 1 - c; return { x: 12 + c * (bw + gx), y: 12 + r * (bh + gy), r, c }; });
    let g = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="var(--axis)"/></marker></defs>`;
    steps.forEach((s, i) => {
      const p = pos[i];
      g += `<rect x="${p.x}" y="${p.y}" width="${bw}" height="${bh}" rx="6" fill="var(--panel2)" stroke="var(--line)" stroke-width="1.5"/>`;
      const L = wrap(s, 24), y0 = p.y + bh / 2 - (L.length - 1) * 8 + 4;
      L.forEach((l, j) => { g += `<text x="${p.x + bw / 2}" y="${y0 + j * 16}" text-anchor="middle" font-size="12.5" fill="var(--ink)">${esc(l)}</text>`; });
      if (i < steps.length - 1) {
        const q = pos[i + 1];
        if (q.r === p.r) { const dir = q.x > p.x ? 1 : -1; g += `<path d="M${p.x + (dir > 0 ? bw : 0) + dir * 4} ${p.y + bh / 2} H${q.x + (dir > 0 ? 0 : bw) - dir * 4}" stroke="var(--axis)" stroke-width="2" fill="none" marker-end="url(#ah)"/>`; }
        else g += `<path d="M${p.x + bw / 2} ${p.y + bh + 3} V${q.y - 5}" stroke="var(--axis)" stroke-width="2" fill="none" marker-end="url(#ah)"/>`;
      }
    });
    return { html: frame(spec, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.title)}">${g}</svg>`, '') };
  }

  /* ---------- maps (before / after) ---------- */
  const MAPC = { road: '#8fa39b', building: '#3f7a6b', home: '#7b6aa8', green: '#2f7a4f', water: '#2f6c8f', car: '#55645f', ground: '#0b1d18' };
  function mapOne(m) {
    let g = `<rect width="${m.w}" height="${m.h}" fill="${MAPC.ground}" stroke="var(--line)"/>`;
    m.shapes.forEach(s => {
      if (s.t === 'road') g += `<polyline points="${s.pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${MAPC.road}" stroke-width="${s.w || 10}" stroke-linecap="butt" stroke-linejoin="round"/>` + (s.label ? `<text x="${s.pts[0][0] + 6}" y="${s.pts[0][1] - 8}" font-size="10" fill="var(--muted)">${esc(s.label)}</text>` : '');
      else if (s.t === 'rect') {
        g += `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.k === 'water' ? 10 : 2}" fill="${MAPC[s.k] || MAPC.building}" opacity=".95"/>`;
        if (s.label) { const L = wrap(s.label, Math.max(6, Math.floor(s.w / 6.3))), y0 = s.y + s.h / 2 - (L.length - 1) * 6 + 3; L.forEach((l, j) => g += `<text x="${s.x + s.w / 2}" y="${y0 + j * 12}" text-anchor="middle" font-size="10.5" fill="#fff">${esc(l)}</text>`); }
      } else if (s.t === 'trees') { for (let i = 0; i < s.n; i++) { const tx = s.x + (i * 37 % s.w), ty = s.y + (i * 53 % s.h); g += `<circle cx="${tx}" cy="${ty}" r="6" fill="${MAPC.green}" stroke="var(--panel)" stroke-width="1.5"/>`; } }
      else if (s.t === 'text') g += `<text x="${s.x}" y="${s.y}" font-size="${s.s || 11}" fill="var(--muted)">${esc(s.v)}</text>`;
    });
    g += `<g transform="translate(24 26)"><path d="M0 -14 L5 4 L0 0 L-5 4Z" fill="var(--ink)"/><text y="16" text-anchor="middle" font-size="10" fill="var(--ink)">N</text></g>`;
    return `<div style="flex:1 1 320px;min-width:280px"><div class="csub" style="font-weight:600;color:var(--ink)">${esc(m.label)}</div><svg viewBox="0 0 ${m.w} ${m.h}" role="img" aria-label="${esc(m.label)}">${g}</svg></div>`;
  }
  function map(spec) {
    const leg = `<div class="legend"><span><i class="sw" style="background:${MAPC.road}"></i>Road</span><span><i class="sw" style="background:${MAPC.building}"></i>Building</span><span><i class="sw" style="background:${MAPC.green}"></i>Green area / trees</span><span><i class="sw" style="background:${MAPC.water}"></i>Water</span></div>`;
    return { html: frame(spec, `<div style="display:flex;gap:10px;flex-wrap:wrap">${spec.maps.map(mapOne).join('')}</div>`, leg) };
  }

  /* ---------- public API ---------- */
  const TYPES = { line, bar, pie, table, process, map };
  I.charts = {
    /** Render a chart spec into an element. */
    render(spec, el) {
      const t = TYPES[spec.type]; if (!t) { el.innerHTML = '<p class="bad">Unknown chart type</p>'; return; }
      const r = t(spec); el.innerHTML = r.html; if (r.bind) r.bind(el);
    },
    /** Plain-text description of the data, for AI grading prompts. */
    describe(spec) {
      const lines = [`Type: ${spec.type}`, `Title: ${spec.title}`];
      if (spec.sub) lines.push(`Note: ${spec.sub}`);
      if (spec.type === 'process') lines.push('Stages in order: ' + spec.steps.map((s, i) => `${i + 1}) ${s}`).join(' → '));
      else if (spec.type === 'map') spec.maps.forEach(m => lines.push(`Map "${m.label}": ` + m.shapes.filter(s => s.label).map(s => s.label).join(', ')));
      else lines.push(tableHtml(spec).replace(/<\/tr>/g, '\n').replace(/<\/t[hd]>/g, ' | ').replace(/<[^>]+>/g, '').trim());
      if (spec.type === 'line' || spec.type === 'bar') lines.push(`Unit: ${(spec.y && (spec.y.unit || spec.y.label)) || ''}`);
      return lines.join('\n');
    }
  };
})();

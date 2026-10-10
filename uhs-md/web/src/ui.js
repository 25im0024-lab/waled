/* UHS Pore Lab - user interface: controls, 3D view, readouts, charts,
 * and playback of the atomistic LAMMPS run. */
(function () {
  'use strict';
  const U = window.UHS, RU = window.UHSRender;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const css = getComputedStyle(document.documentElement);
  const C = k => css.getPropertyValue(k).trim();
  const SER = [C('--s1'), C('--s2'), C('--s3')];

  // ---------------------------------------------------------------- controls
  const FIELDS = ['cushion', 'xCushion', 'P_MPa', 'T', 'molality', 'film', 'pore', 'wetting', 'bio', 'microbes', 'bioRate', 'carbonateCO2'];
  const FMT = {
    xCushion: v => `${Math.round(v * 100)} %`,
    P_MPa: v => `${(+v).toFixed(1)} MPa`,
    T: v => `${Math.round(v)} K (${Math.round(v - 273.15)} °C)`,
    molality: v => `${(+v).toFixed(2)} mol/kg`,
    film: v => (+v === 0 ? 'none (dry)' : `${v} Å`),
    pore: v => `${v} Å`,
    wetting: v => (v < 650 ? 'weakly water-wet' : v < 1050 ? 'intermediate' : 'strongly water-wet'),
    microbes: v => `${v}`,
    bioRate: v => `×${Math.round(v / 0.001)}`,
  };
  const PRESETS = {
    base: { cushion: 'CO2', xCushion: 0.3, P_MPa: 10, T: 333, molality: 1, film: 10, pore: 60, wetting: 1000, bio: false, microbes: 8, bioRate: 0.004, carbonateCO2: true },
    bio:  { cushion: 'CO2', xCushion: 0.3, P_MPa: 10, T: 333, molality: 1, film: 10, pore: 60, wetting: 1000, bio: true, microbes: 12, bioRate: 0.01, carbonateCO2: true },
    dry:  { cushion: 'CH4', xCushion: 0.3, P_MPa: 10, T: 333, molality: 0, film: 0, pore: 50, wetting: 1000, bio: false, microbes: 8, bioRate: 0.004, carbonateCO2: true },
    salt: { cushion: 'CO2', xCushion: 0.3, P_MPa: 10, T: 333, molality: 4, film: 12, pore: 60, wetting: 1000, bio: false, microbes: 8, bioRate: 0.004, carbonateCO2: true },
  };
  function setControls(p) {
    for (const k of FIELDS) {
      const el = document.getElementById(k);
      if (el.type === 'checkbox') el.checked = !!p[k]; else el.value = p[k];
    }
    refreshOutputs();
  }
  function readControls() {
    const p = {};
    for (const k of FIELDS) {
      const el = document.getElementById(k);
      p[k] = el.type === 'checkbox' ? el.checked : el.tagName === 'SELECT' ? el.value : +el.value;
    }
    return p;
  }
  function refreshOutputs() {
    for (const k of Object.keys(FMT)) {
      const el = document.getElementById(k), out = document.querySelector(`output[for="${k}"]`);
      if (out) out.textContent = FMT[k](+el.value);
    }
    const bio = $('#bio').checked;
    ['microbes', 'bioRate', 'carbonateCO2'].forEach(k => { document.getElementById(k).disabled = !bio; });
    updateCmd();
  }
  FIELDS.forEach(k => document.getElementById(k).addEventListener('input', refreshOutputs));
  $$('#presets [data-preset]').forEach(b => b.addEventListener('click', () => { setControls(PRESETS[b.dataset.preset]); setMode('live'); rebuild(); }));
  $('#apply').addEventListener('click', () => { setMode('live'); rebuild(); });

  // ---------------------------------------------------------------- renderer
  const cv = $('#view');
  let R = null;
  try { R = RU.createRenderer(cv); } catch (e) { R = null; }
  if (!R) $('.nogl').hidden = false;
  $$('[data-view]').forEach(b => b.addEventListener('click', () => R && R.view(b.dataset.view)));
  let buf = { pos: new Float32Array(3 * 8192), rad: new Float32Array(8192), col: new Float32Array(3 * 8192) };
  function ensure(n) {
    if (buf.rad.length >= n) return;
    const m = 2 * n;
    buf = { pos: new Float32Array(3 * m), rad: new Float32Array(m), col: new Float32Array(3 * m) };
  }
  const RGB = {}; for (const k of U.NAMES) RGB[k] = RU.hexRGB(U.SPECIES[k].color);
  const show = () => ({ water: $('#showWater').checked, rock: $('#showRock').checked, slice: $('#slice').checked });
  ['showWater', 'showRock', 'slice'].forEach(id => document.getElementById(id).addEventListener('change', () => { if (mode === 'lammps') drawLammpsFrame(); }));

  // ------------------------------------------------------------- live model
  let sim = null, running = true, hist = null, prof = null, frame = 0, mode = 'live';
  let rockLive = [];

  /** Schematic calcite (10-14) lattice for the live view: two layers per wall. */
  function buildRockLive(L, H) {
    const a = 4.99, b = 8.10, out = [];
    const cols = { Ca: RU.hexRGB('#b9ad8c'), C: RU.hexRGB('#6f6f6f'), O: RU.hexRGB('#c8553d') };
    for (const [zs, sgn] of [[0, -1], [H, 1]]) {
      for (let layer = 0; layer < 2; layer++) {
        const zc = zs + sgn * (1.6 + layer * 3.03);
        for (let i = 0; i * a < L - 0.5; i++) for (let j = 0; j * b < L - 0.5; j++) {
          const ox = i * a + (layer % 2) * a / 2, oy = j * b;
          out.push([ox % L, oy, zc, 1.0, cols.Ca]);
          out.push([(ox + a / 2) % L, (oy + b / 2) % L, zc, 1.0, cols.Ca]);
          for (const [cx, cy] of [[ox, oy + b / 2], [ox + a / 2, oy]]) {
            const X = cx % L, Y = cy % L;
            out.push([X, Y, zc, 0.65, cols.C]);
            for (let k = 0; k < 3; k++) {
              const th = 2 * Math.PI * k / 3 + 0.5;
              out.push([(X + 1.1 * Math.cos(th) + L) % L, (Y + 1.1 * Math.sin(th) + L) % L, zc + 0.55 * Math.sin(th) * sgn, 0.72, cols.O]);
            }
          }
        }
      }
    }
    return out;
  }

  function rebuild() {
    const p = readControls();
    sim = U.createSim({
      cushion: p.cushion, xCushion: p.xCushion, P_MPa: p.P_MPa, T: p.T, molality: p.molality,
      film: p.film, pore: p.pore, wetting: p.wetting, bio: p.bio, microbes: p.microbes,
      bioRate: p.bioRate, carbonateCO2: p.carbonateCO2, seed: (Math.random() * 1e9) | 0,
    });
    hist = { t: [], free: [], dis: [], cons: [], P: [], pur: [], prod: [] };
    prof = null;
    rockLive = buildRockLive(sim.L, sim.H);
    if (R) { R.setBox(sim.L, sim.L, sim.H, 0); }
    setCycle('off');
    buildLegend();
    sample();
    drawCharts();
  }
  function setCycle(mode) {
    if (sim) sim.setCycle(mode);
    $$('[data-cycle]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cycle === mode)));
  }
  $$('[data-cycle]').forEach(b => b.addEventListener('click', () => setCycle(b.dataset.cycle)));
  $('#resetMsd').addEventListener('click', () => sim && sim.resetMSD());

  function renderLive() {
    if (!R) return;
    const P = sim.particles(), f = show(), L = sim.L;
    ensure(P.n + rockLive.length + 3 * sim.microbes.length);
    let k = 0;
    const put = (x, y, z, r, c) => { buf.pos[3 * k] = x; buf.pos[3 * k + 1] = y; buf.pos[3 * k + 2] = z; buf.rad[k] = r; buf.col[3 * k] = c[0]; buf.col[3 * k + 1] = c[1]; buf.col[3 * k + 2] = c[2]; k++; };
    for (let i = 0; i < P.n; i++) {
      const s = P.sp[i], name = U.NAMES[s];
      if (!f.water && s >= 4) continue;
      if (f.slice && P.y[i] < L / 2) continue;
      const r = U.SPECIES[name].sig * 0.45 * (s <= 3 && P.dis[i] ? 1.3 : 1);
      put(P.x[i], P.y[i], P.z[i], r, RGB[name]);
    }
    if (f.rock) for (const a of rockLive) { if (f.slice && a[1] < L / 2) continue; put(a[0], a[1], a[2], a[3], a[4]); }
    for (const m of sim.microbes) {
      if (f.slice && m.y < L / 2) continue;
      const t = Math.min(1, m.h2 / 4), c = [0.15 + 0.35 * t, 0.55 + 0.45 * t, 0.25 + 0.35 * t];
      for (let d = -1; d <= 1; d++) put((m.x + 2.6 * d + L) % L, m.y, m.z, 1.9, c);
    }
    R.setAtoms(buf.pos, buf.rad, buf.col, k);
    R.draw();
  }

  function buildLegend() {
    const L = $('#legend');
    L.textContent = '';
    const item = (color, text, cls) => {
      const s = document.createElement('span'), i = document.createElement('i');
      if (cls) i.className = cls; if (color) i.style.background = color;
      s.append(i, document.createTextNode(text)); L.append(s);
    };
    if (mode === 'live') {
      const c = sim.cfg.cushion;
      item(U.SPECIES.H2.color, 'H₂');
      item(U.SPECIES[c].color, U.SPECIES[c].label + ' (cushion)');
      if (c !== 'CH4') item(U.SPECIES.CH4.color, 'CH₄ (biogenic)');
      item(U.SPECIES.W.color, 'water'); item(U.SPECIES.S.color, 'NaCl (dissolved)');
      item(null, 'dissolved gas (enlarged)', 'ring');
      if (sim.microbes.length) item(null, 'methanogen (brighter = more H₂ taken up)', 'rod');
      item('#b9ad8c', 'calcite Ca'); item('#c8553d', 'carbonate O');
    } else {
      for (const t of LMP_TYPES) if (t.legend) item(t.color, t.legend);
    }
  }

  // --------------------------------------------------------------- readouts
  function tile(k, v, unit, d) {
    return `<div class="tile"><div class="k">${k}</div><div class="v">${v}<small>${unit || ''}</small></div>${d ? `<div class="d">${d}</div>` : ''}</div>`;
  }
  const fmt = (v, d) => (v === null || v === undefined || !isFinite(v) ? '–' : (+v).toFixed(d));
  function updateTiles(s) {
    const L = s.ledger, c = sim.cfg.cushion;
    const prodN = U.GASES.reduce((a, k) => a + L.withdrawn[k], 0);
    $('#tiles').innerHTML = [
      tile('Pressure (equiv.)', fmt(s.P_MPa, 2), 'MPa', `target ${sim.cfg.P_MPa} MPa`),
      tile('Free H₂', s.H2_free, '', `dissolved: ${s.H2_dissolved}`),
      tile('H₂ purity, pore centre', s.H2_purity_centre === null ? '–' : fmt(100 * s.H2_purity_centre, 0), '%', `${U.SPECIES[c].label} in system: ${s.counts[c] || 0}`),
      tile('Consumed by microbes', L.H2_consumed, 'H₂', `CH₄ made: ${L.CH4_produced} · CO₂ used: ${L.CO2_gas_consumed + L.CO2_carbonate}`),
      tile('Produced gas purity', s.produced_purity === null ? '–' : fmt(100 * s.produced_purity, 0), '% H₂', `withdrawn: ${prodN} · injected H₂: ${L.injected.H2}`),
      tile('D(H₂), lateral', s.D_H2_lateral === null ? '–' : fmt(s.D_H2_lateral * 1e6, 2), '×10⁻⁶ m²/s', `water: ${s.D_water_lateral === null ? '–' : fmt(s.D_water_lateral * 1e8, 1) + '×10⁻⁸'}`),
    ].join('');
    $('#status').textContent = `t = ${s.time.toFixed(1)} ps · T = ${s.T.toFixed(0)} K · ${s.n} molecules`;
  }
  function sample() {
    const s = sim.stats();
    hist.t.push(s.time); hist.free.push(s.H2_free); hist.dis.push(s.H2_dissolved); hist.cons.push(s.ledger.H2_consumed);
    hist.P.push(s.P_MPa); hist.pur.push(s.H2_purity_centre); hist.prod.push(s.produced_purity);
    if (hist.t.length > 600) for (const k in hist) hist[k] = hist[k].filter((_, i) => i % 2 === 0);
    const p = sim.profiles(40);
    if (!prof) prof = { dz: p.dz, data: {} };
    for (const k of U.NAMES) {
      const a = p.data[k], o = prof.data[k] || (prof.data[k] = Float64Array.from(a));
      for (let i = 0; i < a.length; i++) o[i] = 0.9 * o[i] + 0.1 * a[i];
    }
    updateTiles(s);
  }

  // ----------------------------------------------------------------- charts
  function niceTicks(lo, hi, n) {
    if (hi <= lo) hi = lo + 1;
    const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= step0) || 10 * mag;
    const t = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) t.push(+v.toFixed(10));
    return { t, lo: Math.min(lo, t[0]), hi: Math.max(hi, t[t.length - 1]) };
  }
  function makeChart(id) {
    const el = document.getElementById(id), canvas = el.querySelector('canvas'), ctx = canvas.getContext('2d');
    const tip = el.querySelector('.tip'), lg = el.querySelector('.lg');
    const ch = { data: null, hover: null, el };
    function draw() {
      const d = ch.data; if (!d) return;
      const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const m = { l: 40, r: 10, t: 8, b: 22 };
      const xs = d.x; if (xs.length < 2) return;
      let ylo = d.yZero ? 0 : Infinity, yhi = -Infinity;
      for (const s of d.series) for (const v of s.y) if (v !== null && isFinite(v)) { ylo = Math.min(ylo, v); yhi = Math.max(yhi, v); }
      if (!isFinite(yhi)) { ylo = 0; yhi = 1; }
      if (!d.yZero) { const pad = 0.1 * (yhi - ylo || 1); ylo -= pad; yhi += pad; }
      const yt = niceTicks(ylo, yhi, 4), xt = niceTicks(xs[0], xs[xs.length - 1], 5);
      const X = v => m.l + (v - xt.lo) / (xt.hi - xt.lo) * (w - m.l - m.r);
      const Y = v => h - m.b - (v - yt.lo) / (yt.hi - yt.lo) * (h - m.t - m.b);
      if (d.bands) { ctx.fillStyle = '#12304f'; for (const [a, b] of d.bands) ctx.fillRect(X(a), m.t, X(b) - X(a), h - m.t - m.b); }
      ctx.strokeStyle = C('--grid'); ctx.lineWidth = 1; ctx.fillStyle = C('--muted'); ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (const v of yt.t) { const y = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(w - m.r, y); ctx.stroke(); ctx.fillText(d.yFmt ? d.yFmt(v) : v, m.l - 5, y); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (const v of xt.t) ctx.fillText(v, X(v), h - m.b + 5);
      ctx.lineWidth = 2; ctx.lineJoin = 'round';
      for (const s of d.series) {
        ctx.strokeStyle = s.color; ctx.beginPath(); let pen = false;
        for (let i = 0; i < xs.length; i++) {
          const v = s.y[i]; if (v === null || !isFinite(v)) { pen = false; continue; }
          if (!pen) { ctx.moveTo(X(xs[i]), Y(v)); pen = true; } else ctx.lineTo(X(xs[i]), Y(v));
        }
        ctx.stroke();
      }
      if (ch.hover !== null && ch.hover < xs.length) {
        const i = ch.hover, xx = Math.round(X(xs[i])) + 0.5;
        ctx.strokeStyle = C('--text2'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, m.t); ctx.lineTo(xx, h - m.b); ctx.stroke();
        for (const s of d.series) {
          const v = s.y[i]; if (v === null || !isFinite(v)) continue;
          ctx.beginPath(); ctx.arc(X(xs[i]), Y(v), 4, 0, 2 * Math.PI); ctx.fillStyle = s.color; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = '#081a30'; ctx.stroke();
        }
        tip.textContent = '';
        const t = document.createElement('div'); t.className = 't'; t.textContent = `${d.xName} ${(+xs[i]).toFixed(1)}`; tip.append(t);
        for (const s of d.series) {
          const r = document.createElement('div'); r.className = 'r';
          const k = document.createElement('i'); k.style.background = s.color;
          const b = document.createElement('b'); const v = s.y[i];
          b.textContent = v === null || !isFinite(v) ? '–' : (d.yFmt ? d.yFmt(v) : (+v).toFixed(2));
          r.append(k, b, document.createTextNode(s.name)); tip.append(r);
        }
        tip.style.display = 'block';
        tip.style.left = Math.min(canvas.offsetLeft + xx + 12, el.clientWidth - tip.offsetWidth - 4) + 'px';
        tip.style.top = (canvas.offsetTop + 6) + 'px';
      } else tip.style.display = 'none';
      const key = d.series.map(s => s.name).join('|') + (d.bands ? '|b' : '');
      if (lg.dataset.k !== key) {
        lg.textContent = ''; lg.dataset.k = key;
        if (d.series.length > 1) for (const s of d.series) {
          const sp = document.createElement('span'), b = document.createElement('b'); b.style.background = s.color;
          sp.append(b, document.createTextNode(s.name)); lg.append(sp);
        }
        if (d.bands) { const sp = document.createElement('span'), b = document.createElement('b'); b.className = 'area'; sp.append(b, document.createTextNode('brine film')); lg.append(sp); }
      }
      ch._X = X;
    }
    canvas.addEventListener('pointermove', e => {
      if (!ch.data || !ch._X) return;
      const r = canvas.getBoundingClientRect(), px = e.clientX - r.left;
      let best = 0, bd = Infinity;
      ch.data.x.forEach((v, i) => { const dd = Math.abs(ch._X(v) - px); if (dd < bd) { bd = dd; best = i; } });
      ch.hover = best; draw();
    });
    canvas.addEventListener('pointerleave', () => { ch.hover = null; draw(); });
    ch.set = data => { ch.data = data; draw(); };
    ch.title = (t, sub) => { el.querySelector('h4').textContent = t; el.querySelector('.sub').textContent = sub; };
    return ch;
  }
  const chInv = makeChart('cInv'), chP = makeChart('cP'), chProf = makeChart('cProf');

  function brineBands(w, dz) {
    let wmax = 0; for (const v of w) wmax = Math.max(wmax, v);
    const bands = []; let start = null;
    for (let i = 0; i < w.length; i++) {
      const inB = wmax > 0 && w[i] > 0.5 * wmax;
      if (inB && start === null) start = i * dz;
      if ((!inB || i === w.length - 1) && start !== null) { bands.push([start, inB ? (i + 1) * dz : i * dz]); start = null; }
    }
    return bands;
  }
  function drawCharts() {
    if (mode !== 'live') return;
    chInv.title('H₂ inventory', 'molecules vs time (ps)');
    chP.title('Reservoir-equivalent pressure', 'MPa vs time (ps)');
    chProf.title('Gas density across the pore', 'molecules / nm³ vs distance from bottom wall (Å); shaded = brine');
    chInv.set({ x: hist.t, xName: 't (ps)', yZero: true, yFmt: v => (+v).toFixed(0), series: [
      { name: 'free H₂', color: SER[0], y: hist.free },
      { name: 'dissolved H₂', color: SER[1], y: hist.dis },
      { name: 'consumed by microbes', color: SER[2], y: hist.cons },
    ] });
    chP.set({ x: hist.t, xName: 't (ps)', yZero: false, yFmt: v => (+v).toFixed(1), series: [{ name: 'pressure (MPa)', color: SER[0], y: hist.P }] });
    if (prof) {
      const nb = prof.data.W.length, dz = prof.dz, c = sim.cfg.cushion;
      const x = Array.from({ length: nb }, (_, i) => +((i + 0.5) * dz).toFixed(1));
      const nm3 = a => Array.from(a, v => v * 1000);
      const series = [{ name: 'H₂', color: SER[0], y: nm3(prof.data.H2) }];
      if (sim.cfg.xCushion > 0) series.push({ name: U.SPECIES[c].label + ' (cushion)', color: SER[1], y: nm3(prof.data[c]) });
      if (c !== 'CH4' && sim.microbes.length) series.push({ name: 'CH₄ (biogenic)', color: SER[2], y: nm3(prof.data.CH4) });
      chProf.set({ x, xName: 'z (Å)', yZero: true, yFmt: v => (+v).toFixed(1), series, bands: brineBands(prof.data.W, dz) });
    }
  }
  window.addEventListener('resize', () => { drawCharts(); if (mode === 'lammps') drawLammpsCharts(); });

  // ------------------------------------------------------- LAMMPS playback
  // atom types of the LAMMPS model (ff/params.py TYPE_ORDER)
  const LMP_TYPES = [
    { name: 'Ca', color: '#b9ad8c', r: 1.0, rock: true, legend: 'calcite Ca' },
    { name: 'Cc', color: '#6f6f6f', r: 0.7, rock: true },
    { name: 'Oc', color: '#c8553d', r: 0.8, rock: true, legend: 'carbonate O' },
    { name: 'Ow', color: '#2f7fd8', r: 1.35, water: true, legend: 'water O (SPC/E)' },
    { name: 'Hw', color: '#a8c4e0', r: 0.55, water: true },
    { name: 'Na', color: '#ff8fd1', r: 1.05, legend: 'Na⁺' },
    { name: 'Cl', color: '#4fd16a', r: 1.6, legend: 'Cl⁻' },
    { name: 'H2', color: '#ffffff', r: 1.45, legend: 'H₂' },
    { name: 'CH4', color: '#ffb627', r: 1.85, legend: 'CH₄' },
    { name: 'Cco2', color: '#3a3a3a', r: 0.8 },
    { name: 'Oco2', color: '#ff5d5d', r: 1.05, legend: 'CO₂' },
    { name: 'Nn2', color: '#b48cff', r: 1.15, legend: 'N₂' },
    { name: 'Mn2', color: '#000000', r: 0 },
  ];
  LMP_TYPES.forEach(t => { t.rgb = RU.hexRGB(t.color); });
  let run = null, lframe = 0, lplay = true, lastFrameT = 0;

  function b64(s, Type) {
    const bin = atob(s), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Type(u8.buffer);
  }
  async function loadRun() {
    if (run) return run;
    $('#status').textContent = 'Loading LAMMPS run…';
    const res = await fetch('demo/demo-run.json');
    if (!res.ok) throw new Error('no demo run published yet');
    const d = await res.json();
    d.typeArr = b64(d.types, Uint8Array);
    d.frameArr = d.frames.map(f => b64(f.xyz, Uint16Array));
    run = d;
    $('#frame').max = String(d.frames.length - 1);
    return d;
  }
  function drawLammpsFrame() {
    if (!run || !R) return;
    const f = show(), n = run.typeArr.length, q = run.frameArr[lframe], s = run.scale, Ly = run.box[1];
    ensure(n);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const t = LMP_TYPES[run.typeArr[i] - 1];
      if (!t || t.r === 0) continue;
      if (!f.water && t.water) continue;
      if (!f.rock && t.rock) continue;
      const y = q[3 * i + 1] * s;
      if (f.slice && y < Ly / 2) continue;
      buf.pos[3 * k] = q[3 * i] * s; buf.pos[3 * k + 1] = y; buf.pos[3 * k + 2] = q[3 * i + 2] * s;
      buf.rad[k] = t.r; buf.col.set(t.rgb, 3 * k); k++;
    }
    R.setAtoms(buf.pos, buf.rad, buf.col, k);
    $('#frame').value = String(lframe);
    $('#status').textContent = `LAMMPS run · t = ${run.frames[lframe].t_ps.toFixed(0)} ps · frame ${lframe + 1}/${run.frames.length} · ${n} atoms`;
  }
  function lammpsTiles() {
    const r = run.results || {}, c = run.conditions || {}, g = r.gas_centre_mole_fractions || {};
    const pct = v => (v === undefined || v === null ? '–' : (100 * v).toFixed(0));
    $('#tiles').innerHTML = [
      tile('Conditions', `${(c.P_Pa / 1e6).toFixed(0)}`, 'MPa', `${(c.T_K - 273.15).toFixed(0)} °C · NaCl ${c.molality_NaCl} mol/kg`),
      tile('Pore pressure (Pzz)', fmt(r.P_gas_Pzz_MPa, 1), 'MPa', `± ${fmt(r.P_gas_Pzz_MPa_std, 1)} (fluctuation) · target ${fmt(r.P_target_MPa, 0)}`),
      tile('H₂ mole fraction in brine', r.x_H2_brine === undefined ? '–' : (r.x_H2_brine * 1e3).toFixed(2), '×10⁻³', `c = ${fmt(r.c_H2_brine_mol_L, 3)} mol/L`),
      tile('H₂ in pore-centre gas', pct(g.h2), '%', `CO₂ ${pct(g.co2)} % · CH₄ ${pct(g.ch4)} % · N₂ ${pct(g.n2)} %`),
      tile('H₂ liquid/gas ratio K', fmt(r.K_H2_liq_over_gas, 3), '', `interface enrichment ×${fmt(r.H2_interface_enrichment, 2)}`),
      tile('D(H₂), lateral', r.D_H2_lateral_m2_s === undefined ? '–' : (r.D_H2_lateral_m2_s * 1e7).toFixed(2), '×10⁻⁷ m²/s', 'from the H₂ MSD'),
    ].join('');
  }
  function drawLammpsCharts() {
    if (!run) return;
    const p = run.profiles, z = p.z, nm3 = a => a.map(v => v * 1000);
    // H2 in brine vs gas per frame, using the brine bands from the water profile
    const bands = brineBands(p.water, z[1] - z[0]);
    const inBrine = zz => bands.some(([a, b]) => zz >= a && zz < b);
    const tH = [], gasH = [], brH = [];
    run.frameArr.forEach((q, fi) => {
      let g = 0, b = 0;
      for (let i = 0; i < run.typeArr.length; i++) if (run.typeArr[i] === 8) { if (inBrine(q[3 * i + 2] * run.scale)) b++; else g++; }
      tH.push(run.frames[fi].t_ps); gasH.push(g); brH.push(b);
    });
    chInv.title('H₂ location (LAMMPS)', 'molecules vs time (ps), brine films vs gas');
    chInv.set({ x: tH, xName: 't (ps)', yZero: true, yFmt: v => (+v).toFixed(0), series: [
      { name: 'H₂ in gas', color: SER[0], y: gasH }, { name: 'H₂ in brine films', color: SER[1], y: brH }] });
    chP.title('Pore pressure, Pzz (LAMMPS)', 'MPa vs time (ps), bulk-gas region');
    chP.set({ x: run.pressure.t_ps, xName: 't (ps)', yZero: false, yFmt: v => (+v).toFixed(1), series: [{ name: 'Pzz (MPa)', color: SER[0], y: run.pressure.Pzz_MPa }] });
    chProf.title('Density across the pore (LAMMPS)', 'molecules / nm³ vs z (Å), production average; shaded = brine');
    const series = [{ name: 'H₂', color: SER[0], y: nm3(p.h2) }];
    if (p.co2 && p.co2.some(v => v > 0)) series.push({ name: 'CO₂', color: SER[1], y: nm3(p.co2) });
    else if (p.n2 && p.n2.some(v => v > 0)) series.push({ name: 'N₂', color: SER[1], y: nm3(p.n2) });
    if (p.ch4 && p.ch4.some(v => v > 0)) series.push({ name: 'CH₄', color: SER[2], y: nm3(p.ch4) });
    chProf.set({ x: z, xName: 'z (Å)', yZero: true, yFmt: v => (+v).toFixed(1), series, bands });
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    $$('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    $$('.liveonly').forEach(e => { e.hidden = m !== 'live'; });
    $$('.lammpsonly').forEach(e => { e.hidden = m !== 'lammps'; });
    $('#csv').hidden = m !== 'live';
    if (m === 'live') {
      if (R && sim) R.setBox(sim.L, sim.L, sim.H, 0);
      buildLegend(); updateTiles(sim.stats()); drawCharts();
      $('#run').textContent = running ? 'Pause' : 'Run';
    } else {
      loadRun().then(d => {
        if (mode !== 'lammps') return;
        if (R) R.setBox(d.box[0], d.box[1], d.box[2], 0);
        buildLegend(); lammpsTiles(); drawLammpsCharts(); drawLammpsFrame();
        $('#run').textContent = lplay ? 'Pause' : 'Play';
      }).catch(err => { $('#status').textContent = 'LAMMPS run not available: ' + err.message; });
    }
  }
  $$('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#run').addEventListener('click', () => {
    if (mode === 'lammps') { lplay = !lplay; $('#run').textContent = lplay ? 'Pause' : 'Play'; }
    else { running = !running; $('#run').textContent = running ? 'Pause' : 'Run'; }
  });
  $('#frame').addEventListener('input', e => { lframe = +e.target.value; drawLammpsFrame(); });

  // ------------------------------------------------------------------ loop
  function loop(ts) {
    if (mode === 'live' && sim) {
      if (running) sim.step(+$('#speed').value);
      renderLive();
      if (running && ++frame % 10 === 0) sample();
      if (running && frame % 30 === 0) drawCharts();
    } else if (mode === 'lammps' && run) {
      if (lplay && ts - lastFrameT > 220) { lframe = (lframe + 1) % run.frames.length; lastFrameT = ts; drawLammpsFrame(); }
      if (R) R.draw();
    }
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------- tabs
  $$('.tablist [role=tab]').forEach(t => t.addEventListener('click', () => {
    $$('.tablist [role=tab]').forEach(o => o.setAttribute('aria-selected', String(o === t)));
    $$('[role=tabpanel]').forEach(p => { p.hidden = p.id !== t.getAttribute('aria-controls'); });
  }));

  // -------------------------------------------------------- CSV and LAMMPS
  $('#csv').addEventListener('click', () => {
    const rows = ['time_ps,H2_free,H2_dissolved,H2_consumed,P_equiv_MPa,H2_purity_centre,produced_purity'];
    for (let i = 0; i < hist.t.length; i++)
      rows.push([hist.t[i].toFixed(3), hist.free[i], hist.dis[i], hist.cons[i], fmt(hist.P[i], 3),
        hist.pur[i] === null ? '' : hist.pur[i].toFixed(4), hist.prod[i] === null ? '' : hist.prod[i].toFixed(4)].join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = 'uhs-pore-lab.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  function updateCmd() {
    const p = readControls();
    const out = `p_${p.cushion.toLowerCase()}_${Math.round(p.xCushion * 100)}_m${p.molality}${p.bio ? '_bio' : ''}`;
    const lines = [
      'git clone https://github.com/25im0024-lab/waled.git && cd waled/uhs-md',
      `python3 build_system.py --cushion ${p.cushion} --x-cushion ${p.xCushion} \\`,
      `    --T ${(+p.T).toFixed(2)} --P ${(p.P_MPa * 1e6).toExponential(2).replace('+', '')} --molality ${p.molality} \\`,
      `    --water-film ${p.film} --pore ${Math.max(p.pore, 2 * p.film + 10)} --water-model tip4p2005 \\`,
      p.bio ? `    --bio methanogenesis --bio-conversion 0.10 --out runs/${out}` : `    --out runs/${out}`,
      `cd runs/${out} && mpirun -np 8 lmp -in ../../in.uhs.lmp && cd ../..`,
      `python3 analyze.py runs/${out}`,
    ];
    $('#cmd').textContent = lines.join('\n');
  }
  $('#copyCmd').addEventListener('click', () => {
    navigator.clipboard && navigator.clipboard.writeText($('#cmd').textContent).then(() => {
      $('#copyCmd').textContent = 'Copied'; setTimeout(() => { $('#copyCmd').textContent = 'Copy commands'; }, 1500);
    });
  });

  // ------------------------------------------------------------------ start
  setControls(PRESETS.base);
  rebuild();
  $$('.lammpsonly').forEach(e => { e.hidden = true; });
  if (new URLSearchParams(location.search).get('view') === 'lammps') setMode('lammps');
  requestAnimationFrame(loop);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();

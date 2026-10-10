/* UHS Pore Lab - user interface: controls, live view, readouts, charts. */
(function () {
  'use strict';
  const U = window.UHS;
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
    base: { cushion: 'CO2', xCushion: 0.3, P_MPa: 10, T: 333, molality: 1, film: 12, pore: 80, wetting: 1100, bio: false, microbes: 8, bioRate: 0.004, carbonateCO2: true },
    bio:  { cushion: 'CO2', xCushion: 0.3, P_MPa: 10, T: 333, molality: 1, film: 12, pore: 80, wetting: 1100, bio: true, microbes: 12, bioRate: 0.01, carbonateCO2: true },
    dry:  { cushion: 'CH4', xCushion: 0.3, P_MPa: 10, T: 333, molality: 0, film: 0, pore: 60, wetting: 1100, bio: false, microbes: 8, bioRate: 0.004, carbonateCO2: true },
    salt: { cushion: 'CO2', xCushion: 0.3, P_MPa: 10, T: 333, molality: 4, film: 14, pore: 80, wetting: 1100, bio: false, microbes: 8, bioRate: 0.004, carbonateCO2: true },
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
  $$('#presets [data-preset]').forEach(b => b.addEventListener('click', () => { setControls(PRESETS[b.dataset.preset]); rebuild(); }));
  $('#apply').addEventListener('click', rebuild);

  // ------------------------------------------------------------- simulation
  let sim = null, running = true, hist = null, prof = null, frame = 0;
  const WALL = 9; // A of calcite drawn on each side

  function rebuild() {
    const p = readControls();
    sim = U.createSim({
      cushion: p.cushion, xCushion: p.xCushion, P_MPa: p.P_MPa, T: p.T, molality: p.molality,
      film: p.film, pore: p.pore, wetting: p.wetting, bio: p.bio, microbes: p.microbes,
      bioRate: p.bioRate, carbonateCO2: p.carbonateCO2, seed: (Math.random() * 1e9) | 0,
    });
    hist = { t: [], free: [], dis: [], cons: [], P: [], pur: [], prod: [] };
    prof = null;
    setCycle('off');
    sizeCanvas();
    buildLegend();
    sample();
    drawCharts();
  }

  function setCycle(mode) {
    if (sim) sim.setCycle(mode);
    $$('[data-cycle]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cycle === mode)));
  }
  $$('[data-cycle]').forEach(b => b.addEventListener('click', () => setCycle(b.dataset.cycle)));
  $('#run').addEventListener('click', () => { running = !running; $('#run').textContent = running ? 'Pause' : 'Run'; });
  $('#resetMsd').addEventListener('click', () => sim && sim.resetMSD());

  // ---------------------------------------------------------------- render
  const cv = $('#view'), g = cv.getContext('2d');
  let scale = 1;
  function sizeCanvas() {
    const W = 1400;
    scale = W / sim.Lx;
    cv.width = W;
    cv.height = Math.round((sim.H + 2 * WALL) * scale);
  }
  function buildLegend() {
    const L = $('#legend');
    L.textContent = '';
    const c = sim.cfg.cushion;
    const items = [['H2'], [c], ['CH4'], ['W'], ['S']];
    const seen = new Set();
    for (const [k] of items) {
      if (seen.has(k)) continue; seen.add(k);
      const s = document.createElement('span'), i = document.createElement('i');
      i.style.background = U.SPECIES[k].color;
      s.append(i, document.createTextNode(k === 'W' ? 'Water' : k === 'S' ? 'NaCl (dissolved)' : U.SPECIES[k].label + (k === c ? ' (cushion)' : k === 'CH4' ? ' (biogenic)' : '')));
      L.append(s);
    }
    const s1 = document.createElement('span'), r = document.createElement('i'); r.className = 'ring';
    s1.append(r, document.createTextNode('dissolved gas')); L.append(s1);
    if (sim.microbes.length) {
      const s2 = document.createElement('span'), m = document.createElement('i'); m.className = 'rod';
      s2.append(m, document.createTextNode('methanogen')); L.append(s2);
    }
    const s3 = document.createElement('span'), w = document.createElement('i');
    w.style.cssText = 'border-radius:2px;background:#8a8270';
    s3.append(w, document.createTextNode('calcite (10-14) wall')); L.append(s3);
  }
  function drawWall(y0, h, top) {
    g.fillStyle = '#4a463c';
    g.fillRect(0, y0, cv.width, h);
    // surface lattice: alternating Ca / CO3 sites, 4.99 A apart
    const step = 4.99 * scale / 2;
    for (let row = 0; row < 3; row++) {
      const yy = top ? y0 + h - (row + 0.5) * h / 3 : y0 + (row + 0.5) * h / 3;
      for (let k = 0, xx = (row % 2) * step / 2; xx < cv.width; xx += step, k++) {
        g.fillStyle = (k + row) % 2 ? '#8a8270' : '#b9ad8c';
        g.beginPath(); g.arc(xx, yy, Math.max(2, scale * 0.9), 0, 2 * Math.PI); g.fill();
      }
    }
    g.fillStyle = '#b9ad8c';
    g.fillRect(0, top ? y0 + h - 2 : y0, cv.width, 2);
  }
  function render() {
    const W = cv.width, Hc = cv.height, H = sim.H, wallPx = WALL * scale;
    g.fillStyle = '#061224'; g.fillRect(0, 0, W, Hc);
    drawWall(0, wallPx, true);
    drawWall(Hc - wallPx, wallPx, false);
    const yOf = z => Hc - wallPx - z * scale; // z = 0 at the bottom wall
    const P = sim.particles();
    // brine first, gas on top
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < P.n; i++) {
        const s = P.sp[i], isGas = s <= 3;
        if ((pass === 0) === isGas) continue;
        const name = U.NAMES[s], sp = U.SPECIES[name];
        const r = Math.max(2.5, sp.sig * 0.5 * scale * 0.92);
        const px = P.x[i] * scale, py = yOf(P.z[i]);
        g.beginPath(); g.arc(px, py, r, 0, 2 * Math.PI);
        g.fillStyle = sp.color; g.fill();
        if (isGas && P.dis[i]) { g.lineWidth = 2.5; g.strokeStyle = '#ffffff'; g.stroke(); }
        if (px < r) { g.beginPath(); g.arc(px + W, py, r, 0, 2 * Math.PI); g.fill(); }
        if (px > W - r) { g.beginPath(); g.arc(px - W, py, r, 0, 2 * Math.PI); g.fill(); }
      }
    }
    for (const m of sim.microbes) {
      const px = m.x * scale, py = yOf(m.z), w = 10 * scale, h = 3.6 * scale;
      g.fillStyle = '#3fbf5f';
      roundRect(px - w / 2, py - h / 2, w, h, h / 2); g.fill();
      g.strokeStyle = '#1d6b31'; g.lineWidth = 1.5; g.stroke();
      for (let k = 0; k < 4; k++) {
        g.beginPath(); g.arc(px - w / 2 + (k + 1) * w / 5, py, h * 0.18, 0, 2 * Math.PI);
        g.fillStyle = k < m.h2 ? '#f4f7fb' : '#1d6b31'; g.fill();
      }
    }
  }
  function roundRect(x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // --------------------------------------------------------------- readouts
  function tile(k, v, unit, d) {
    return `<div class="tile"><div class="k">${k}</div><div class="v">${v}<small>${unit || ''}</small></div>${d ? `<div class="d">${d}</div>` : ''}</div>`;
  }
  const fmt = (v, d) => (v === null || v === undefined || !isFinite(v) ? '–' : v.toFixed(d));
  function updateTiles(s) {
    const L = s.ledger, c = sim.cfg.cushion;
    const cush = s.counts[c] || 0;
    const prodN = U.GASES.reduce((a, k) => a + L.withdrawn[k], 0);
    $('#tiles').innerHTML = [
      tile('Pressure (equiv.)', fmt(s.P_MPa, 2), 'MPa', `target ${sim.cfg.P_MPa} MPa`),
      tile('Free H₂', s.H2_free, '', `dissolved: ${s.H2_dissolved}`),
      tile('H₂ purity, pore centre', s.H2_purity_centre === null ? '–' : fmt(100 * s.H2_purity_centre, 0), '%', `${c} in system: ${cush}`),
      tile('Consumed by microbes', L.H2_consumed, 'H₂', `CH₄ made: ${L.CH4_produced} · CO₂ used: ${L.CO2_gas_consumed + L.CO2_carbonate}`),
      tile('Produced gas purity', s.produced_purity === null ? '–' : fmt(100 * s.produced_purity, 0), '% H₂', `withdrawn: ${prodN} · injected H₂: ${L.injected.H2}`),
      tile('D(H₂), lateral', s.D_H2_lateral === null ? '–' : fmt(s.D_H2_lateral * 1e7, 2), '×10⁻⁷ m²/s', `water: ${s.D_water_lateral === null ? '–' : fmt(s.D_water_lateral * 1e8, 1) + '×10⁻⁸'}`),
    ].join('');
    $('#status').textContent = `t = ${s.time.toFixed(1)} ps · T = ${s.T.toFixed(0)} K · ${s.n} molecules`;
  }

  function sample() {
    const s = sim.stats();
    hist.t.push(s.time); hist.free.push(s.H2_free); hist.dis.push(s.H2_dissolved); hist.cons.push(s.ledger.H2_consumed);
    hist.P.push(s.P_MPa); hist.pur.push(s.H2_purity_centre); hist.prod.push(s.produced_purity);
    if (hist.t.length > 600) for (const k in hist) hist[k] = hist[k].filter((_, i) => i % 2 === 0);
    const p = sim.profiles(48);
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
    const ch = { data: null, hover: null };
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
      // shaded bands (brine)
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
        const left = canvas.offsetLeft + xx + 12;
        tip.style.left = Math.min(left, el.clientWidth - tip.offsetWidth - 4) + 'px';
        tip.style.top = (canvas.offsetTop + 6) + 'px';
      } else tip.style.display = 'none';
      // legend (rebuilt only when names change)
      const key = d.series.map(s => s.name).join('|') + (d.bands ? '|b' : '');
      if (lg.dataset.k !== key) {
        lg.textContent = ''; lg.dataset.k = key;
        if (d.series.length > 1) for (const s of d.series) {
          const sp = document.createElement('span'), b = document.createElement('b'); b.style.background = s.color;
          sp.append(b, document.createTextNode(s.name)); lg.append(sp);
        }
        if (d.bands) { const sp = document.createElement('span'), b = document.createElement('b'); b.className = 'area'; sp.append(b, document.createTextNode('brine film')); lg.append(sp); }
      }
      ch._X = X; ch._m = m; ch._w = w;
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
    return ch;
  }
  const chInv = makeChart('cInv'), chP = makeChart('cP'), chProf = makeChart('cProf');

  function drawCharts() {
    chInv.set({ x: hist.t, xName: 't (ps)', yZero: true, yFmt: v => (+v).toFixed(0), series: [
      { name: 'free H₂', color: SER[0], y: hist.free },
      { name: 'dissolved H₂', color: SER[1], y: hist.dis },
      { name: 'consumed by microbes', color: SER[2], y: hist.cons },
    ] });
    chP.set({ x: hist.t, xName: 't (ps)', yZero: false, yFmt: v => (+v).toFixed(1), series: [
      { name: 'pressure (MPa)', color: SER[0], y: hist.P },
    ] });
    if (prof) {
      const nb = prof.data.W.length, dz = prof.dz;
      const x = Array.from({ length: nb }, (_, i) => +((i + 0.5) * dz).toFixed(1));
      const nm2 = a => Array.from(a, v => v * 100);
      const c = sim.cfg.cushion;
      const series = [{ name: 'H₂', color: SER[0], y: nm2(prof.data.H2) }];
      if (sim.cfg.xCushion > 0) series.push({ name: U.SPECIES[c].label + ' (cushion)', color: SER[1], y: nm2(prof.data[c]) });
      if (c !== 'CH4' && sim.microbes.length) series.push({ name: 'CH₄ (biogenic)', color: SER[2], y: nm2(prof.data.CH4) });
      // brine bands: where water density exceeds half of its maximum
      const w = prof.data.W; let wmax = 0; for (const v of w) wmax = Math.max(wmax, v);
      const bands = []; let start = null;
      for (let i = 0; i < nb; i++) {
        const inB = wmax > 0 && w[i] > 0.5 * wmax;
        if (inB && start === null) start = i * dz;
        if ((!inB || i === nb - 1) && start !== null) { bands.push([start, inB ? (i + 1) * dz : i * dz]); start = null; }
      }
      chProf.set({ x, xName: 'z (Å)', yZero: true, yFmt: v => (+v).toFixed(2), series, bands });
    }
  }
  window.addEventListener('resize', drawCharts);

  // ------------------------------------------------------------------ loop
  function loop() {
    if (sim) {
      if (running) sim.step(+$('#speed').value);
      render();
      if (running && ++frame % 8 === 0) sample();
      if (frame % 24 === 0 && running) drawCharts();
    }
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------- tabs
  $$('[role=tab]').forEach(t => t.addEventListener('click', () => {
    $$('[role=tab]').forEach(o => o.setAttribute('aria-selected', String(o === t)));
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
      `    --water-film ${p.film} --pore ${Math.max(p.pore, 2 * p.film + 10)} \\`,
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
  requestAnimationFrame(loop);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();

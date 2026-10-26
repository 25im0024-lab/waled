/* FracGel Lab — calculation core (no DOM). Loaded by index.html as a classic script (global FracCore)
   and by the Node tests through module.exports. All inputs/outputs in SI unless the name says otherwise. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.FracCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KB = 1.380649e-23; // J/K
  const G = 9.80665;       // m/s²

  /* Parse pasted rheometer columns. Accepts tab, ';', several spaces or ',' as separators,
     skips header/unit lines. With tab/';'/space separators a decimal comma is accepted. */
  function parseTable(text) {
    const rows = [];
    for (const raw of String(text || '').split(/\r?\n/)) {
      const line = raw.trim(); if (!line) continue;
      let parts;
      if (/[\t;]|\s{1,}/.test(line) && !/^[^\s;\t]+(,[^\s;\t]+)+$/.test(line)) parts = line.split(/[\t;]+|\s+/).map(t => t.replace(',', '.'));
      else parts = line.split(',');
      const nums = parts.filter(t => t !== '').map(Number);
      if (nums.length >= 2 && nums.every(Number.isFinite)) rows.push(nums);
    }
    return rows;
  }

  function sortBy(x, ...cols) {
    const idx = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
    return [idx.map(i => x[i]), ...cols.map(c => idx.map(i => c[i]))];
  }

  /* G'–G'' crossover by log–log interpolation; first sign change from low ω (viscous → elastic). */
  function crossover(omega, Gp, Gpp) {
    const [w, a, b] = sortBy(omega, Gp, Gpp);
    for (let i = 0; i + 1 < w.length; i++) {
      if (!(a[i] > 0 && b[i] > 0 && a[i + 1] > 0 && b[i + 1] > 0)) continue;
      const d0 = Math.log10(a[i] / b[i]), d1 = Math.log10(a[i + 1] / b[i + 1]);
      if (d0 === 0) return { wc: w[i], Gc: a[i] };
      if (d0 < 0 && d1 >= 0) {
        const t = d0 / (d0 - d1);
        const lw = Math.log10(w[i]) + t * (Math.log10(w[i + 1]) - Math.log10(w[i]));
        // chords under-read Gc slightly (both curves are concave in log–log there): ~3 % at 5 points/decade
        const ga = Math.log10(a[i]) + t * (Math.log10(a[i + 1]) - Math.log10(a[i]));
        const gb = Math.log10(b[i]) + t * (Math.log10(b[i + 1]) - Math.log10(b[i]));
        return { wc: 10 ** lw, Gc: 10 ** ((ga + gb) / 2) };
      }
    }
    return null;
  }

  /* Single-mode Maxwell fit, least squares on log10 of G' and G'' together.
     For a fixed τ the best log G0 is the mean residual, so only τ is searched. */
  function fitMaxwell(omega, Gp, Gpp, wMax) {
    const pts = [];
    for (let i = 0; i < omega.length; i++) {
      if (omega[i] > 0 && Gp[i] > 0 && Gpp[i] > 0 && (!wMax || omega[i] <= wMax)) pts.push([omega[i], Gp[i], Gpp[i]]);
    }
    if (pts.length < 3) return null;
    const sse = lt => {
      const tau = 10 ** lt; let s = 0; const r = [];
      for (const [w, a, b] of pts) {
        const x = w * tau, d = 1 + x * x;
        r.push(Math.log10(a) - Math.log10(x * x / d), Math.log10(b) - Math.log10(x / d));
      }
      const lg0 = r.reduce((p, q) => p + q, 0) / r.length;
      for (const v of r) s += (v - lg0) ** 2;
      return { s, lg0 };
    };
    const lws = pts.map(p => Math.log10(p[0]));
    let lo = -Math.max(...lws) - 3, hi = -Math.min(...lws) + 3, best = lo, bs = Infinity;
    for (let k = 0; k <= 600; k++) { const lt = lo + (hi - lo) * k / 600, v = sse(lt).s; if (v < bs) { bs = v; best = lt; } }
    lo = best - (hi - lo) / 600; hi = best + (hi - lo) / 600 * 2;
    for (let k = 0; k < 80; k++) { // golden-section refine
      const m1 = hi - (hi - lo) * 0.618, m2 = lo + (hi - lo) * 0.618;
      if (sse(m1).s < sse(m2).s) hi = m2; else lo = m1;
    }
    const lt = (lo + hi) / 2, { s, lg0 } = sse(lt);
    const tau = 10 ** lt, G0 = 10 ** lg0;
    const all = []; for (const [, a, b] of pts) all.push(Math.log10(a), Math.log10(b));
    const mean = all.reduce((p, q) => p + q, 0) / all.length;
    const sst = all.reduce((p, q) => p + (q - mean) ** 2, 0);
    return { G0, tau, eta0: G0 * tau, rmsLog: Math.sqrt(s / all.length), r2: sst > 0 ? 1 - s / sst : 1, n: pts.length };
  }

  function maxwellModel(w, G0, tau) { const x = w * tau, d = 1 + x * x; return { Gp: G0 * x * x / d, Gpp: G0 * x / d }; }

  /* Local minimum of G'' above the crossover (Granek–Cates: G''min/G0 ≈ le/L̄, for well-entangled WLMs). */
  function gppMin(omega, Gpp, wc) {
    const [w, b] = sortBy(omega, Gpp);
    for (let i = 1; i + 1 < w.length; i++) if (w[i] > (wc || 0) && b[i] <= b[i - 1] && b[i] <= b[i + 1]) return { w: w[i], Gpp: b[i] };
    return null;
  }

  /* Mesh size ξ ≈ (kB·T/G0)^(1/3), returned in nm. */
  function meshSizeNm(G0, tC) { return G0 > 0 ? Math.cbrt(KB * (tC + 273.15) / G0) * 1e9 : NaN; }

  function linreg(x, y) {
    const n = x.length; if (n < 2) return null;
    const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    if (sxx === 0) return null;
    const m = sxy / sxx, b = my - m * mx;
    return { m, b, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 1 };
  }

  /* Power law η = K·γ̇^(n−1) fitted on log–log points inside [rMin, rMax]; η in Pa·s → K in Pa·sⁿ. */
  function fitPowerLaw(rate, eta, rMin, rMax) {
    const x = [], y = [];
    for (let i = 0; i < rate.length; i++) {
      if (rate[i] > 0 && eta[i] > 0 && (!rMin || rate[i] >= rMin) && (!rMax || rate[i] <= rMax)) { x.push(Math.log10(rate[i])); y.push(Math.log10(eta[i])); }
    }
    const f = linreg(x, y); if (!f) return null;
    return { n: f.m + 1, K: 10 ** f.b, r2: f.r2, pts: x.length };
  }

  /* η at a given rate by log–log interpolation of measured points (no extrapolation). */
  function interpLogLog(xs, ys, x) {
    const [a, b] = sortBy(xs, ys);
    if (!a.length || x < a[0] || x > a[a.length - 1]) return NaN;
    for (let i = 0; i + 1 < a.length; i++) {
      if (x >= a[i] && x <= a[i + 1]) {
        if (a[i + 1] === a[i]) return b[i];
        const t = (Math.log10(x) - Math.log10(a[i])) / (Math.log10(a[i + 1]) - Math.log10(a[i]));
        return 10 ** (Math.log10(b[i]) + t * (Math.log10(b[i + 1]) - Math.log10(b[i])));
      }
    }
    return b[b.length - 1];
  }

  /* Single-particle settling. Newtonian Stokes, and the power-law form with drag correction X(n)=1 (approximation). */
  function stokesNewtonian(d, rhoP, rhoF, eta) { return (rhoP - rhoF) * G * d * d / (18 * eta); }
  function stokesPowerLaw(d, rhoP, rhoF, K, n) { return Math.pow((rhoP - rhoF) * G * Math.pow(d, n + 1) / (18 * K), 1 / n); }
  function reynoldsPowerLaw(rhoF, v, d, K, n) { return rhoF * Math.pow(v, 2 - n) * Math.pow(d, n) / K; }

  /* Synergy index: mixture value over the sum of the two single-component controls (>1 = synergy). */
  function synergy(mix, naoaOnly, guarOnly) {
    if (!(mix > 0) || !(naoaOnly >= 0) || !(guarOnly >= 0) || naoaOnly + guarOnly <= 0) return NaN;
    return mix / (naoaOnly + guarOnly);
  }

  /* Derringer–Suich desirability. spec: {goal:'max'|'min', lo, hi, s} */
  function desirability(y, spec) {
    if (!Number.isFinite(y)) return NaN;
    const s = spec.s || 1, lo = +spec.lo, hi = +spec.hi;
    if (spec.goal === 'max') { if (y <= lo) return 0; if (y >= hi) return 1; return Math.pow((y - lo) / (hi - lo), s); }
    if (y <= lo) return 1; if (y >= hi) return 0; return Math.pow((hi - y) / (hi - lo), s);
  }
  function overallD(ds, ws) {
    let num = 0, den = 0;
    for (let i = 0; i < ds.length; i++) {
      if (!Number.isFinite(ds[i])) continue;
      if (ds[i] <= 0) return 0;
      num += (ws[i] || 1) * Math.log(ds[i]); den += ws[i] || 1;
    }
    return den ? Math.exp(num / den) : NaN;
  }

  /* Gaussian elimination with partial pivoting. */
  function solve(A, b) {
    const n = b.length, M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-12) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }

  /* Full quadratic response surface y = b0 + b1·x1 + b2·x2 + b11·x1² + b22·x2² + b12·x1·x2,
     with x1 = NaOA wt%, x2 = guar wt% coded to [-1, 1] over the design box. */
  function quadFit(points, box) {
    const c1 = (box.x1[0] + box.x1[1]) / 2, h1 = (box.x1[1] - box.x1[0]) / 2;
    const c2 = (box.x2[0] + box.x2[1]) / 2, h2 = (box.x2[1] - box.x2[0]) / 2;
    const row = (x1, x2) => { const u = (x1 - c1) / h1, v = (x2 - c2) / h2; return [1, u, v, u * u, v * v, u * v]; };
    const pts = points.filter(p => Number.isFinite(p.y));
    if (pts.length < 6) return null;
    const XtX = Array.from({ length: 6 }, () => Array(6).fill(0)), Xty = Array(6).fill(0);
    for (const p of pts) { const r = row(p.x1, p.x2); for (let i = 0; i < 6; i++) { Xty[i] += r[i] * p.y; for (let j = 0; j < 6; j++) XtX[i][j] += r[i] * r[j]; } }
    const beta = solve(XtX, Xty); if (!beta) return null;
    const predict = (x1, x2) => row(x1, x2).reduce((s, v, i) => s + v * beta[i], 0);
    const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    let sse = 0, sst = 0; for (const p of pts) { sse += (p.y - predict(p.x1, p.x2)) ** 2; sst += (p.y - my) ** 2; }
    const dof = pts.length - 6;
    return { beta, predict, r2: sst > 0 ? 1 - sse / sst : 1, adjR2: dof > 0 && sst > 0 ? 1 - (sse / dof) / (sst / (pts.length - 1)) : NaN, dof, n: pts.length };
  }

  function gridOptimum(f, box, goal, steps = 60) {
    let best = null;
    for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) {
      const x1 = box.x1[0] + (box.x1[1] - box.x1[0]) * i / steps, x2 = box.x2[0] + (box.x2[1] - box.x2[0]) * j / steps, y = f(x1, x2);
      if (!best || (goal === 'min' ? y < best.y : y > best.y)) best = { x1, x2, y };
    }
    return best;
  }

  /* UTF-8 safe base64 for the GitHub contents API (Arabic notes survive the round trip). */
  function b64encodeUtf8(str) {
    const bytes = new TextEncoder().encode(str); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decodeUtf8(b64) {
    const bin = atob(String(b64).replace(/\s+/g, '')), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  return { KB, G, parseTable, b64encodeUtf8, b64decodeUtf8, crossover, fitMaxwell, maxwellModel, gppMin, meshSizeNm, linreg, fitPowerLaw, interpLogLog,
    stokesNewtonian, stokesPowerLaw, reynoldsPowerLaw, synergy, desirability, overallD, solve, quadFit, gridOptimum };
});

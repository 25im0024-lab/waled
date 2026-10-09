/* Frac-Fluid Lab — computation core (no DOM).
   Browser: window.FL ; Node: module.exports. All internal quantities are SI unless a name says otherwise. */
(function (root) {
'use strict';
const R_GAS = 8.314462618, NA = 6.02214076e23, G0 = 9.80665, SQPI = Math.sqrt(Math.PI);
const fin = x => typeof x === 'number' && isFinite(x);

/* ================= statistics ================= */
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015;
  for (const v of c) s += v / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function betacf(a, b, x) {
  const FP = 1e-300; let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FP) d = FP; d = 1 / d; let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-16) break;
  }
  return h;
}
function ibeta(x, a, b) { // regularized incomplete beta I_x(a,b)
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
function tCdf(t, df) { const p = 0.5 * ibeta(df / (df + t * t), df / 2, 0.5); return t > 0 ? 1 - p : p; }
function tInv(p, df) { // Student-t quantile, p > 0.5
  let lo = 0, hi = 1e4;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (tCdf(m, df) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => a.length > 1 ? Math.sqrt(a.reduce((s, v) => s + (v - mean(a)) ** 2, 0) / (a.length - 1)) : NaN;

function inv(M) { // Gauss-Jordan; returns null if singular
  const n = M.length, A = M.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => +(i === j))));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (!(Math.abs(A[p][c]) > 1e-300)) return null;
    [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c];
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map(r => r.slice(n));
}

/* Ordinary least squares y = a + b·x, with standard errors and 95 % confidence intervals. */
function linreg(x, y) {
  const n = x.length; if (n < 2) return null;
  const mx = mean(x), my = mean(y); let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); syy += (y[i] - my) ** 2; }
  if (!(sxx > 0)) return null;
  const b = sxy / sxx, a = my - b * mx; let ssr = 0;
  for (let i = 0; i < n; i++) ssr += (y[i] - a - b * x[i]) ** 2;
  const dof = n - 2, s2 = dof > 0 ? ssr / dof : NaN, seB = Math.sqrt(s2 / sxx), seA = Math.sqrt(s2 * (1 / n + mx * mx / sxx));
  const t = dof > 0 ? tInv(0.975, dof) : NaN;
  return { a, b, seA, seB, ciA: t * seA, ciB: t * seB, r2: syy > 0 ? 1 - ssr / syy : 1, ssr, n, dof, f: v => a + b * v };
}

/* Nonlinear least squares (Levenberg-Marquardt).
   spec: { f(x, p), x[], y[], p0[], names[], logp[] (fit ln p: keeps p > 0), lo[] (lower bound for linear params), mode 'log'|'lin' }
   Residuals: mode 'log' -> ln y − ln f (relative error); 'lin' -> y − f.
   Uncertainty: covariance s²(JᵀJ)⁻¹ evaluated in the natural parameters; 95 % CI = p ± t(0.975, N−P)·SE (Wald). */
function nls(spec) {
  const { f, x, y, names } = spec, N = x.length, P = spec.p0.length, logp = spec.logp || names.map(() => false);
  const lo = spec.lo || names.map(() => -Infinity), mode = spec.mode || 'log';
  const toP = q => q.map((v, i) => logp[i] ? Math.exp(v) : Math.max(v, lo[i]));
  const res = p => { const r = new Array(N); for (let i = 0; i < N; i++) { const m = f(x[i], p); r[i] = mode === 'log' ? (m > 0 ? Math.log(y[i]) - Math.log(m) : 50) : y[i] - m; if (!isFinite(r[i])) r[i] = 1e6; } return r; };
  const ss = r => r.reduce((s, v) => s + v * v, 0);
  const jac = (q, r0) => { const J = []; for (let j = 0; j < P; j++) { const h = 1e-6 * (Math.abs(q[j]) + 1e-3), qq = q.slice(); qq[j] += h; const r1 = res(toP(qq)); J.push(r1.map((v, i) => (v - r0[i]) / h)); } return J; }; // J[j][i]
  let q = spec.p0.map((v, i) => logp[i] ? Math.log(v) : v), r = res(toP(q)), S = ss(r), lam = 1e-3, it = 0;
  for (; it < 500; it++) {
    const J = jac(q, r), A = [], g = [];
    for (let a = 0; a < P; a++) { A.push([]); g.push(-J[a].reduce((s, v, i) => s + v * r[i], 0)); for (let b = 0; b < P; b++) A[a].push(J[a].reduce((s, v, i) => s + v * J[b][i], 0)); }
    let improved = false;
    for (let k = 0; k < 30; k++) {
      const B = A.map((row, i) => row.map((v, j) => i === j ? v * (1 + lam) + 1e-12 : v)), Bi = inv(B);
      if (!Bi) { lam *= 10; continue; }
      const d = Bi.map(row => row.reduce((s, v, j) => s + v * g[j], 0));
      const qn = q.map((v, i) => { const t = v + d[i]; return logp[i] ? t : Math.max(t, lo[i]); }), rn = res(toP(qn)), Sn = ss(rn);
      if (Sn < S) { const done = (S - Sn) <= 1e-14 * (S + 1e-30) || d.every((v, i) => Math.abs(v) < 1e-12 * (Math.abs(q[i]) + 1e-12)); q = qn; r = rn; S = Sn; lam = Math.max(lam / 3, 1e-12); improved = true; if (done) it = 1e9; break; }
      lam *= 4;
    }
    if (!improved) break;
  }
  const p = toP(q), dof = N - P, s2 = dof > 0 ? S / dof : NaN;
  // Jacobian in natural parameters for the covariance
  const r0 = res(p), Jn = [];
  for (let j = 0; j < P; j++) {
    const h = 1e-6 * Math.abs(p[j]) + 1e-12, pp = p.slice(), pm = p.slice(); pp[j] += h; pm[j] = Math.max(pm[j] - h, logp[j] ? pm[j] * 0.5 : lo[j]);
    const rp = res(pp), rm = res(pm), hh = pp[j] - pm[j]; Jn.push(rp.map((v, i) => (v - rm[i]) / hh));
  }
  const JTJ = Jn.map(a => Jn.map(b => a.reduce((s, v, i) => s + v * b[i], 0))), C = inv(JTJ);
  const t = dof > 0 ? tInv(0.975, dof) : NaN;
  const atBound = p.map((v, i) => !logp[i] && isFinite(lo[i]) && Math.abs(v - lo[i]) <= 1e-12 * (1 + Math.abs(lo[i])));
  const se = p.map((v, i) => C && dof > 0 && C[i][i] > 0 && !atBound[i] ? Math.sqrt(s2 * C[i][i]) : NaN);
  // goodness of fit
  const yt = y.map(v => mode === 'log' ? Math.log(v) : v), myt = mean(yt), sst = yt.reduce((s, v) => s + (v - myt) ** 2, 0);
  const my = mean(y), sstl = y.reduce((s, v) => s + (v - my) ** 2, 0), ssrl = y.reduce((s, v, i) => s + (v - f(x[i], p)) ** 2, 0);
  const mape = 100 * mean(y.map((v, i) => Math.abs((v - f(x[i], p)) / v)));
  const aic = N * Math.log(S / N) + 2 * P, aicc = N - P - 1 > 0 ? aic + 2 * P * (P + 1) / (N - P - 1) : NaN;
  const out = { names, p, se, ci: se.map(v => t * v), atBound, ssr: S, r2: sst > 0 ? 1 - S / sst : NaN, r2adj: sst > 0 && dof > 0 ? 1 - (S / dof) / (sst / (N - 1)) : NaN, r2lin: sstl > 0 ? 1 - ssrl / sstl : NaN, mape, aic, aicc, N, P, dof, mode, iter: it };
  names.forEach((n, i) => out[n] = p[i]);
  return out;
}
function bestOf(fits) { return fits.filter(Boolean).sort((a, b) => a.ssr - b.ssr)[0] || null; }

/* ================= data parsing ================= */
/* Accepts paste from Excel/rheometer software: tab, semicolon, comma or space separated; decimal comma allowed
   with tab/semicolon separators. Lines that are not fully numeric (headers, notes) are skipped. */
function parseTable(text, ncol) {
  const rows = [];
  for (let line of String(text || '').split(/\r?\n/)) {
    line = line.trim(); if (!line || line[0] === '#') continue;
    let cells;
    if (line.includes('\t')) cells = line.split('\t').map(s => s.replace(',', '.'));
    else if (line.includes(';')) cells = line.split(';').map(s => s.replace(',', '.'));
    else cells = line.split(/[,\s]+/);
    cells = cells.map(s => s.trim()).filter(s => s !== '');
    if (cells.length < ncol) continue;
    const v = cells.slice(0, ncol).map(Number);
    if (v.every(fin)) rows.push(v);
  }
  return rows;
}

/* ================= 1. steady-shear rheology ================= */
/* unit: 'eta' (γ̇ 1/s, η mPa·s) | 'tau' (γ̇ 1/s, τ Pa) | 'fann' (rpm, dial θ; Fann 35 R1B1 F1: γ̇ = 1.7023·rpm, τ = 0.5110·θ Pa) */
function rheoData(rows, unit) {
  const d = rows.map(([a, b]) => unit === 'fann' ? [1.7023 * a, 0.5110 * b] : unit === 'tau' ? [a, b] : [a, b * 1e-3 * a])
    .filter(([g, t]) => g > 0 && t > 0).sort((p, q) => p[0] - q[0]);
  return { gd: d.map(r => r[0]), tau: d.map(r => r[1]), eta: d.map(r => r[1] / r[0]) };
}
const MODELS = {
  PL: { names: ['K', 'n'], tau: (g, p) => p[0] * Math.pow(g, p[1]) },
  HB: { names: ['tau0', 'K', 'n'], tau: (g, p) => p[0] + p[1] * Math.pow(g, p[2]) },
  CA: { names: ['eta0', 'lambda', 'n', 'etaInf'], tau: (g, p) => g * (p[3] + (p[0] - p[3]) * Math.pow(1 + (p[1] * g) ** 2, (p[2] - 1) / 2)) },
};
function etaModel(model, p) { // apparent viscosity function η(γ̇) in Pa·s
  if (model === 'CA') return g => p.etaInf + (p.eta0 - p.etaInf) * Math.pow(1 + (p.lambda * g) ** 2, (p.n - 1) / 2);
  if (model === 'HB') return g => p.tau0 / g + p.K * Math.pow(g, p.n - 1);
  return g => p.K * Math.pow(g, p.n - 1);
}
function fitPL(d, mode) {
  const lr = linreg(d.gd.map(Math.log), d.tau.map(Math.log)); if (!lr) return null;
  const f = nls({ f: MODELS.PL.tau, x: d.gd, y: d.tau, p0: [Math.exp(lr.a), Math.min(Math.max(lr.b, 0.02), 2)], names: MODELS.PL.names, logp: [true, true], mode });
  f.model = 'PL'; f.p = { K: f.K, n: f.n }; return f;
}
function fitHB(d, mode) {
  if (d.gd.length < 4) return null;
  const tmin = Math.min(...d.tau), starts = [];
  for (const fr of [0, 0.3, 0.6, 0.85, 0.95]) {
    const t0 = fr * tmin, lr = linreg(d.gd.map(Math.log), d.tau.map(t => Math.log(Math.max(t - t0, 1e-12))));
    if (lr) starts.push(nls({ f: MODELS.HB.tau, x: d.gd, y: d.tau, p0: [t0, Math.exp(lr.a), Math.min(Math.max(lr.b, 0.02), 2)], names: MODELS.HB.names, logp: [false, true, true], lo: [0, -Infinity, -Infinity], mode }));
  }
  const f = bestOf(starts); if (!f) return null; f.model = 'HB'; f.p = { tau0: f.tau0, K: f.K, n: f.n }; return f;
}
function fitCA(d, mode, etaInfFix) { // etaInfFix: number (Pa·s) to fix η∞, or null to fit it
  if (d.gd.length < 5) return null;
  const e0 = Math.max(...d.eta) * 1.05, half = d.gd.find((g, i) => d.eta[i] < e0 / 2) || d.gd[d.gd.length - 1];
  const lr = linreg(d.gd.slice(-4).map(Math.log), d.eta.slice(-4).map(Math.log)), n0 = Math.min(Math.max(lr ? lr.b + 1 : 0.5, 0.05), 0.95);
  const fits = [];
  for (const m of [1, 0.1, 10, 0.01]) {
    const lam0 = m / half;
    if (etaInfFix === null || etaInfFix === undefined) {
      const ei0 = Math.min(...d.eta) * 0.1;
      fits.push(nls({ f: MODELS.CA.tau, x: d.gd, y: d.tau, p0: [e0, lam0, n0, ei0], names: MODELS.CA.names, logp: [true, true, true, false], lo: [0, 0, 0, 0], mode }));
    } else {
      const fx = nls({ f: (g, p) => MODELS.CA.tau(g, [p[0], p[1], p[2], etaInfFix]), x: d.gd, y: d.tau, p0: [e0, lam0, n0], names: ['eta0', 'lambda', 'n'], logp: [true, true, true], mode });
      fx.names = MODELS.CA.names; fx.p = fx.p.concat(etaInfFix); fx.se = fx.se.concat(NaN); fx.ci = fx.ci.concat(NaN); fx.atBound = fx.atBound.concat(false); fx.etaInf = etaInfFix; fx.fixed = { etaInf: true };
      fits.push(fx);
    }
  }
  const f = bestOf(fits); if (!f) return null; f.model = 'CA'; f.p = { eta0: f.eta0, lambda: f.lambda, n: f.n, etaInf: f.etaInf }; return f;
}
const REF_RATES = [40, 100, 170, 511];
function rheology(rows, unit, opt) {
  opt = opt || {}; const d = rheoData(rows, unit), mode = opt.mode || 'log';
  if (d.gd.length < 3) return { d, err: 'need at least 3 valid points' };
  const fits = { PL: fitPL(d, mode), HB: fitHB(d, mode), CA: fitCA(d, mode, opt.etaInfFit ? null : (opt.etaInf || 0)) };
  for (const k in fits) { const f = fits[k]; if (!f) continue; f.eta = etaModel(k, f.p); f.etaAt = REF_RATES.map(g => f.eta(g)); }
  const ranked = Object.values(fits).filter(f => f && fin(f.aicc)).sort((a, b) => a.aicc - b.aicc);
  // measured apparent viscosity at the reference rates (log-log interpolation inside the data range only)
  const etaMeas = REF_RATES.map(g => interpLog(d.gd, d.eta, g));
  return { d, fits, best: ranked.length ? ranked[0].model : null, etaMeas, mode };
}
/* Parameters entered directly (e.g. K′, n′ from a paper). Kunit factor converts to Pa·sⁿ. */
function rheoFromParams(o) {
  const K = o.K * (o.Kunit === 'mPa' ? 1e-3 : o.Kunit === 'lbf' ? 47.880259 : 1), n = o.n, tau0 = o.tau0 || 0;
  if (!(K > 0 && n > 0)) return null;
  const model = tau0 > 0 ? 'HB' : 'PL', p = model === 'HB' ? { tau0, K, n } : { K, n }, eta = etaModel(model, p);
  return { model, p, eta, etaAt: REF_RATES.map(g => eta(g)), manual: true };
}

/* ================= interpolation helpers ================= */
function interpLin(x, y, xq) {
  for (let i = 0; i < x.length - 1; i++) { const a = x[i], b = x[i + 1]; if ((xq - a) * (xq - b) <= 0 && a !== b) return y[i] + (y[i + 1] - y[i]) * (xq - a) / (b - a); }
  return null;
}
function interpLog(x, y, xq) {
  if (!(xq > 0)) return null; const v = interpLin(x.map(Math.log), y.map(v => Math.log(Math.max(v, 1e-300))), Math.log(xq));
  return v === null ? null : Math.exp(v);
}
/* sign changes of ln(a/b) along x, interpolated in log-log coordinates */
function crossings(x, a, b) {
  const out = [];
  for (let i = 0; i < x.length - 1; i++) {
    const d0 = Math.log(a[i] / b[i]), d1 = Math.log(a[i + 1] / b[i + 1]);
    if (!(fin(d0) && fin(d1))) continue;
    if (d0 === 0) { out.push({ x: x[i], G: a[i], dir: d1 > 0 ? 'up' : 'down' }); continue; }
    if (d0 * d1 < 0) {
      const fr = d0 / (d0 - d1), lx = Math.log(x[i]) + fr * (Math.log(x[i + 1]) - Math.log(x[i]));
      const lg = Math.log(a[i]) + fr * (Math.log(a[i + 1]) - Math.log(a[i]));
      out.push({ x: Math.exp(lx), G: Math.exp(lg), dir: d1 > 0 ? 'up' : 'down' }); // 'up' = G′ overtakes G″ with increasing x
    }
  }
  return out;
}

/* ================= 2. thermal / shear stability ================= */
/* rows: [t (min), T (°C), η (mPa·s)] at a constant shear rate. */
function thermal(rows, opt) {
  opt = opt || {}; const r = rows.filter(v => v[2] > 0).sort((a, b) => a[0] - b[0]);
  if (r.length < 3) return { err: 'need at least 3 points' };
  const t = r.map(v => v[0]), T = r.map(v => v[1]), eta = r.map(v => v[2]), tol = opt.tol ?? 2;
  const Tmax = Math.max(...T), ih = T.findIndex(v => v >= Tmax - tol);
  const eta0 = eta[0], etaH = eta[ih], etaEnd = eta[eta.length - 1], ref = opt.ref === 'initial' ? eta0 : etaH;
  const out = { t, T, eta, Tmax, ih, tHold: t[ih], eta0, etaHold: etaH, etaEnd, tEnd: t[t.length - 1], ref,
    retention: 100 * etaEnd / ref, retentionHeat: 100 * etaH / eta0, etaMin: Math.min(...eta), etaMeanHold: mean(eta.slice(ih)) };
  // first time η falls below the threshold
  out.thr = opt.thr; out.tThr = null;
  if (opt.thr > 0) { if (eta[0] < opt.thr) out.tThr = t[0]; else for (let i = 1; i < eta.length; i++) if (eta[i] < opt.thr) { out.tThr = t[i - 1] + (t[i] - t[i - 1]) * (eta[i - 1] - opt.thr) / (eta[i - 1] - eta[i]); break; } }
  // first-order decay during the isothermal hold: ln η = a − k·(t − t_hold)
  const th = t.slice(ih), eh = eta.slice(ih);
  if (th.length >= 3 && th[th.length - 1] > th[0]) {
    const lr = linreg(th.map(v => v - th[0]), eh.map(Math.log));
    if (lr) out.hold = { k: -lr.b, ciK: lr.ciB, r2: lr.r2, eta0: Math.exp(lr.a), half: -lr.b > 0 ? Math.LN2 / -lr.b : null, n: th.length, fn: v => Math.exp(lr.a + lr.b * (v - th[0])) };
  }
  // Arrhenius (flow activation energy) on the heating ramp: ln η = ln A + Ea/(R·T)
  const tr = [], er = []; for (let i = 0; i <= ih; i++) { tr.push(T[i] + 273.15); er.push(eta[i]); }
  if (tr.length >= 3 && Math.max(...tr) - Math.min(...tr) >= 10) {
    const lr = linreg(tr.map(v => 1 / v), er.map(Math.log));
    if (lr) out.arr = { Ea: lr.b * R_GAS / 1000, ciEa: lr.ciB * R_GAS / 1000, r2: lr.r2, n: tr.length };
  }
  return out;
}

/* ================= 3. viscoelasticity (oscillation) ================= */
/* kind 'freq': rows [ω or f, G′, G″]; xunit 'rad'|'Hz'. kind 'amp': rows [γ (%) or τ (Pa), G′, G″]. */
function viscoelastic(rows, opt) {
  opt = opt || {}; const r = rows.filter(v => v[0] > 0 && v[1] > 0 && v[2] > 0).sort((a, b) => a[0] - b[0]);
  if (r.length < 3) return { err: 'need at least 3 points' };
  const x = r.map(v => opt.kind === 'freq' && opt.xunit === 'Hz' ? 2 * Math.PI * v[0] : v[0]), G1 = r.map(v => v[1]), G2 = r.map(v => v[2]);
  const tand = G1.map((v, i) => G2[i] / v), cx = crossings(x, G1, G2), out = { kind: opt.kind, x, G1, G2, tand, cross: cx };
  if (opt.kind === 'freq') {
    out.etaStar = x.map((w, i) => Math.hypot(G1[i], G2[i]) / w);
    out.at = [0.1, 1, 10].map(w => ({ w, G1: interpLog(x, G1, w), G2: interpLog(x, G2, w), etaStar: interpLog(x, out.etaStar, w) }));
    out.at.forEach(a => a.tand = a.G1 && a.G2 ? a.G2 / a.G1 : null);
    out.char = G1.every((v, i) => v > G2[i]) ? 'solid' : G1.every((v, i) => v < G2[i]) ? 'liquid' : 'cross';
    const c = cx[0]; if (c) { out.wc = c.x; out.Gc = c.G; out.lambdaC = 1 / c.x; }
    const k = Math.min(4, x.length); if (k >= 3) { const a = linreg(x.slice(0, k).map(Math.log), G1.slice(0, k).map(Math.log)), b = linreg(x.slice(0, k).map(Math.log), G2.slice(0, k).map(Math.log)); out.slopeG1 = a && a.b; out.slopeG2 = b && b.b; }
    // single-mode Maxwell: G′ = G·(ωλ)²/(1+(ωλ)²), G″ = G·ωλ/(1+(ωλ)²); fitted to both moduli in log space
    if (x.length >= 3) {
      const xx = x.map(w => [w, 0]).concat(x.map(w => [w, 1])), yy = G1.concat(G2);
      const fm = (q, p) => { const wl = q[0] * p[1], den = 1 + wl * wl; return q[1] ? p[0] * wl / den : p[0] * wl * wl / den; };
      const l0 = out.lambdaC || 1 / Math.sqrt(x[0] * x[x.length - 1]), g0 = Math.max(...G1, ...G2);
      out.maxwell = bestOf([1, 0.1, 10].map(m => nls({ f: fm, x: xx, y: yy, p0: [g0, l0 * m], names: ['G', 'lambda'], logp: [true, true], mode: 'log' })));
      if (out.maxwell) out.maxwell.fn = (w, k2) => fm([w, k2], out.maxwell.p);
    }
  } else {
    const np = Math.min(opt.nPlat || 3, x.length), plat = mean(G1.slice(0, np)), tol = (opt.tol ?? 5) / 100;
    out.plateau = plat; out.tandLVE = mean(tand.slice(0, np)); out.lve = null;
    for (let i = np; i < x.length; i++) if (G1[i] < (1 - tol) * plat) {
      const y0 = Math.log(G1[i - 1]), y1 = Math.log(G1[i]), yc = Math.log((1 - tol) * plat), fr = (y0 - yc) / (y0 - y1);
      out.lve = Math.exp(Math.log(x[i - 1]) + fr * (Math.log(x[i]) - Math.log(x[i - 1]))); break;
    }
    const fp = cx.find(c => c.dir === 'down'); if (fp) { out.flow = fp.x; out.flowG = fp.G; }
  }
  return out;
}

/* ================= 4. proppant settling ================= */
/* Single particle: force balance with the Schiller-Naumann drag curve, Cd = 24·X/Re·(1+0.15·Re^0.687) (Re < 1000; 0.44 above),
   using the fluid's apparent viscosity at the characteristic shear rate γ̇ = v/d. For a power-law fluid in creeping flow this
   reduces exactly to the power-law Stokes analogue v = [g·Δρ·d^(n+1)/(18·K·X)]^(1/n). */
function cdSN(Re, X) { return Re < 1000 ? 24 * X / Re * (1 + 0.15 * Math.pow(Re, 0.687)) : 0.44; }
function settle(etaFn, rhof, rhop, d, X) {
  X = X || 1; const drho = rhop - rhof; if (!(drho > 0 && d > 0)) return { v: 0, Re: 0 };
  const g = v => { const mu = etaFn(v / d), Re = rhof * v * d / mu; return 0.75 * cdSN(Re, X) * rhof * v * v - G0 * drho * d; };
  let lo = Math.log(1e-14), hi = Math.log(20);
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (g(Math.exp(m)) > 0) hi = m; else lo = m; }
  const v = Math.exp((lo + hi) / 2), mu = etaFn(v / d), Re = rhof * v * d / mu;
  return { v, Re, Cd: cdSN(Re, X), gd: v / d, mu };
}
function stokesPL(K, n, rhof, rhop, d, X) { return Math.pow(G0 * (rhop - rhof) * Math.pow(d, n + 1) / (18 * K * (X || 1)), 1 / n); }
/* Richardson-Zaki hindered settling exponent (small d/D) */
function rzExp(Re) { return Re < 0.2 ? 4.65 : Re < 1 ? 4.4 * Math.pow(Re, -0.03) : Re < 500 ? 4.4 * Math.pow(Re, -0.1) : 2.39; }
/* proppant concentration in lb of proppant per gal of fluid (ppa) -> volume fraction */
function ppaToPhi(ppa, sgp) { const vp = ppa / (8.3454 * sgp); return vp / (1 + vp); }
function proppant(fluid, o) {
  if (!fluid || !fluid.eta) return { err: 'no fluid rheology' };
  const rhof = o.rhof * 1000, rhop = o.rhop * 1000, d = o.dmm / 1000, s = settle(fluid.eta, rhof, rhop, d, o.X);
  const phi = o.phiMode === 'phi' ? o.phi / 100 : ppaToPhi(o.ppa || 0, o.rhop), m = rzExp(s.Re), vh = s.v * Math.pow(1 - phi, m);
  const out = { ...s, phi, m, vh, X: o.X || 1 };
  if (fluid.p && fluid.p.K && fluid.p.n && !fluid.p.tau0 && fluid.model !== 'CA') out.vStokes = stokesPL(fluid.p.K, fluid.p.n, rhof, rhop, d, o.X);
  if (fluid.p && fluid.p.tau0 > 0) out.Y = fluid.p.tau0 / (G0 * (rhop - rhof) * d);
  if (o.tpump > 0) out.dist = vh * o.tpump * 60;
  if (o.H > 0) out.tH = o.H / vh / 60;
  if (o.vmeas > 0) out.vmeas = o.vmeas / 1000; // mm/s -> m/s
  out.curve = []; for (let dm = 0.1; dm <= 1.2001; dm += 0.05) out.curve.push([dm, settle(fluid.eta, rhof, rhop, dm / 1000, o.X).v * 1000]);
  return out;
}
const MESH = { '12/20': 1.24, '16/30': 0.89, '20/40': 0.63, '30/50': 0.45, '40/70': 0.30, '100 mesh': 0.15 }; // approx. mean diameter, mm (mid of sieve openings)

/* ================= 5. breaker ================= */
/* rows [t (min), η (mPa·s)] */
function breaker(rows, opt) {
  opt = opt || {}; const r = rows.filter(v => v[1] > 0).sort((a, b) => a[0] - b[0]);
  if (r.length < 3) return { err: 'need at least 3 points' };
  const t = r.map(v => v[0]), eta = r.map(v => v[1]), out = { t, eta, eta0: eta[0], etaEnd: eta[eta.length - 1] };
  out.reduction = 100 * (1 - out.etaEnd / out.eta0);
  const lr = linreg(t, eta.map(Math.log));
  if (lr) out.first = { k: -lr.b, ciK: lr.ciB, eta0: Math.exp(lr.a), r2: lr.r2, half: -lr.b > 0 ? Math.LN2 / -lr.b : null, fn: v => Math.exp(lr.a + lr.b * v) };
  if (r.length >= 4) {
    const k0 = out.first && out.first.k > 0 ? out.first.k : 1 / (t[t.length - 1] || 1);
    const f = bestOf([0, 0.5, 0.9].map(fr => nls({ f: (x, p) => p[2] + (p[0] - p[2]) * Math.exp(-p[1] * x), x: t, y: eta, p0: [eta[0], k0 * (fr ? 2 : 1), fr * Math.min(...eta)], names: ['eta0', 'k', 'etaInf'], logp: [true, true, false], lo: [0, 0, 0], mode: 'log' })));
    if (f) { f.half = Math.LN2 / f.k; f.fn = v => f.etaInf + (f.eta0 - f.etaInf) * Math.exp(-f.k * v); out.plateau = f; }
  }
  if (opt.crit > 0) {
    out.crit = opt.crit; out.tBreak = null;
    if (eta[0] <= opt.crit) out.tBreak = t[0]; else for (let i = 1; i < eta.length; i++) if (eta[i] <= opt.crit) { out.tBreak = Math.exp(interpLin([Math.log(eta[i - 1]), Math.log(eta[i])], [Math.log(Math.max(t[i - 1], 1e-9)), Math.log(Math.max(t[i], 1e-9))], Math.log(opt.crit))); break; }
    const p = out.plateau; if (p && opt.crit > p.etaInf && p.eta0 > opt.crit) out.tBreakModel = -Math.log((opt.crit - p.etaInf) / (p.eta0 - p.etaInf)) / p.k;
  }
  return out;
}
/* Residue (gravimetric): rows [V broken fluid (mL), m empty container (g), m container + dried residue (g)];
   conc = polymer (gelling agent) concentration of the original gel in g/L. */
function residue(rows, conc) {
  const r = rows.filter(v => v[0] > 0 && v[2] >= v[1]);
  if (!r.length) return { err: 'no replicate' };
  const reps = r.map(([V, m0, m1]) => { const dm = m1 - m0, mgL = dm * 1e3 / (V / 1e3); return { V, dm, mgL, pct: conc > 0 ? 100 * dm / (conc * V / 1e3) : null }; });
  const a = reps.map(x => x.mgL), b = reps.map(x => x.pct).filter(fin);
  return { reps, mgL: mean(a), sdMgL: sd(a), pct: b.length ? mean(b) : null, sdPct: sd(b) };
}
/* rows [T (°C), k (1/min)] -> Arrhenius activation energy of the breaking reaction */
function arrhenius(rows) {
  const r = rows.filter(v => v[1] > 0); if (r.length < 2) return null;
  const lr = linreg(r.map(v => 1 / (v[0] + 273.15)), r.map(v => Math.log(v[1]))); if (!lr) return null;
  return { Ea: -lr.b * R_GAS / 1000, ciEa: lr.ciB * R_GAS / 1000, A: Math.exp(lr.a), r2: lr.r2, n: r.length };
}

/* ================= 6. fracture geometry (PKN / KGD) with Carter leak-off ================= */
/* scaled complementary error function erfcx(x) = exp(x²)·erfc(x), x ≥ 0 (Numerical Recipes erfcc, rel. error < 1.2e-7) */
function erfcx(x) {
  const t = 1 / (1 + 0.5 * x);
  return t * Math.exp(-1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
}
/* Carter (Howard & Fast, 1957): fracture face area (one face, both wings) at time t for constant total rate q and constant width w,
   leak-off coefficient C (per face) and spurt Sp (volume per unit area of one face):
   A = q·w′/(4πC²)·[exp(β²)erfc(β) + 2β/√π − 1],  β = 2C√(πt)/w′,  w′ = w + 2Sp. */
function carterArea(q, t, w, C, Sp) {
  const wp = w + 2 * Sp;
  if (!(C > 0)) return q * t / wp;
  const b = 2 * C * Math.sqrt(Math.PI * t) / wp;
  const F = b < 0.05 ? b * b - 4 * b ** 3 / (3 * SQPI) + b ** 4 / 2 - 8 * b ** 5 / (15 * SQPI) + b ** 6 / 6 : erfcx(b) + 2 * b / SQPI - 1;
  return q * wp / (4 * Math.PI * C * C) * F;
}
/* Width-length relations (q per wing), obtained by eliminating t from Nordgren's (1972) PKN and Geertsma-de Klerk's (1969) KGD
   no-leak-off solutions as given in Valkó & Economides (1995):
     PKN  w_w = 2.75·[(1−ν)·μ·q_w·L/G]^(1/4),       w̄ = (π/5)·w_w   (elliptic section, (1−x/L)^(1/4) profile)
     KGD  w_w = 2.27·[(1−ν)·μ·q_w·L²/(G·h)]^(1/4),  w̄ = (π/4)·w_w
   Power-law fluid: equivalent Newtonian viscosity of slot flow at the average width,
     μ_e = K·((2n+1)/(3n))ⁿ·(6·q_w/(h·w̄²))^(n−1)  (exact for a parallel-plate slot). */
const FR = { PKN: { c: 2.5 / Math.pow(0.68, 0.25), a: 1, shape: Math.PI / 5 }, KGD: { c: 1.32 / Math.sqrt(0.48) * Math.pow(8, 1 / 12), a: 2, shape: Math.PI / 4 } };
function fracture(o) {
  // o: model, qt (m³/s, total), t (s), h (m), E (Pa), nu, CL (m/√s), Sp (m³/m²), K (Pa·sⁿ), n
  const M = FR[o.model], G = o.E / (2 * (1 + o.nu)), qw = o.qt / 2, h = o.h;
  const muOf = wb => o.K * Math.pow((2 * o.n + 1) / (3 * o.n), o.n) * Math.pow(6 * qw / (h * wb * wb), o.n - 1);
  const wwOf = (mu, L) => M.c * Math.pow((1 - o.nu) * mu * qw * Math.pow(L, M.a) / (G * (o.model === 'KGD' ? h : 1)), 0.25);
  let wb = 0.005, L = 0, mu = 0, it = 0, err = 1;
  for (; it < 500 && err > 1e-11; it++) {
    mu = muOf(wb); L = carterArea(o.qt, o.t, wb, o.CL, o.Sp) / (2 * h);
    const wn = M.shape * wwOf(mu, L); err = Math.abs(wn - wb) / wb; wb = wb + 0.6 * (wn - wb);
  }
  mu = muOf(wb); L = carterArea(o.qt, o.t, wb, o.CL, o.Sp) / (2 * h);
  const ww = wb / M.shape, A = 2 * L * h, Vf = A * wb, Vi = o.qt * o.t;
  const pnet = o.model === 'PKN' ? G * ww / ((1 - o.nu) * h) : G * ww / (2 * (1 - o.nu) * L);
  return { model: o.model, L, ww, wb, mu, gd: (2 * o.n + 1) / (3 * o.n) * 6 * qw / (h * wb * wb), eff: Vf / Vi, Vf, Vi, Vl: Vi - Vf, pnet, A, G, conv: err <= 1e-9, it };
}
function fractureSeries(o, npts) {
  const out = []; for (let i = 1; i <= (npts || 24); i++) out.push(fracture({ ...o, t: o.t * i / (npts || 24) }));
  return out;
}
/* static fluid-loss test: cumulative filtrate V (mL) vs t (min) through filter area A (cm²).
   V/A = Sp + 2·Cw·√t  ->  Cw = slope/2 (cm/√min), Sp = intercept (cm = mL/cm²). */
function fluidLoss(rows, area) {
  const r = rows.filter(v => v[0] > 0 && v[1] >= 0); if (r.length < 2 || !(area > 0)) return null;
  const lr = linreg(r.map(v => Math.sqrt(v[0])), r.map(v => v[1] / area)); if (!lr) return null;
  return { Cw: lr.b / 2, ciCw: lr.ciB / 2, Sp: Math.max(lr.a, 0), SpRaw: lr.a, r2: lr.r2, n: r.length, CwSI: lr.b / 2 / 100, SpSI: Math.max(lr.a, 0) / 100, fn: s => (lr.a + lr.b * s) * area };
}

/* ================= 7. surface and interfacial tension ================= */
/* Du Noüy ring with the Zuidema-Waters (1941) correction (as used in ASTM D971):
   f = 0.7250 + sqrt(0.01452·P/(C²·Δρ) + 0.04534 − 1.679·r/R); γ = P·f.
   P apparent tension (mN/m), C ring circumference (cm), Δρ (g/cm³), r wire radius, R ring radius. */
function ringZW(P, Rmm, rmm, drho) {
  const C = 2 * Math.PI * Rmm / 10, s = 0.01452 * P / (C * C * drho) + 0.04534 - 1.679 * rmm / Rmm;
  if (!(s >= 0)) return null; const f = 0.725 + Math.sqrt(s); return { f, gamma: P * f };
}
/* Wilhelmy plate: γ = F/(L·cosθ), L = 2(w + t) */
function plate(FmN, wmm, tmm, thetaDeg) { const L = 2 * (wmm + tmm) / 1000; return FmN / (L * Math.cos((thetaDeg || 0) * Math.PI / 180)); }
/* Spinning drop (Vonnegut, 1942): γ = Δρ·ω²·r³/4, valid for elongated drops (L/D ≳ 4). The apparent diameter seen through
   the heavy phase is divided by its refractive index. Returns mN/m. */
function spinning(dmm, rpm, drho, nref, Lmm) {
  const r = dmm / 2 / (nref || 1) / 1000, w = 2 * Math.PI * rpm / 60;
  return { gamma: drho * 1000 * w * w * r ** 3 / 4 * 1000, LD: Lmm > 0 ? Lmm / (dmm / (nref || 1)) : null };
}
/* CMC from γ vs C: two straight lines in ln C (best split by least squares), CMC at their intersection.
   Gibbs: Γmax = −(1/(nRT))·dγ/dlnC ; Amin = 1/(N_A·Γmax). nG = 1 (non-ionic or ionic + excess salt), 2 (1:1 ionic, no salt). */
function cmc(rows, opt) {
  opt = opt || {}; const r = rows.filter(v => v[0] > 0 && v[1] > 0).sort((a, b) => a[0] - b[0]);
  if (r.length < 5) return { err: 'need at least 5 points' };
  const x = r.map(v => Math.log(v[0])), y = r.map(v => v[1]); let best = null;
  for (let k = 3; k <= r.length - 2; k++) {
    const a = linreg(x.slice(0, k), y.slice(0, k)), b = linreg(x.slice(k), y.slice(k)); if (!a || !b) continue;
    if (!(a.b < b.b)) continue; // the pre-CMC branch must be steeper (more negative)
    const xc = (b.a - a.a) / (a.b - b.b), s = a.ssr + b.ssr;
    if (!best || s < best.s) best = { k, a, b, xc, s };
  }
  if (!best) return { err: 'no break point found' };
  const T = (opt.T ?? 25) + 273.15, nG = opt.nG || 1, slope = best.a.b / 1000; // N/m per ln-unit
  const Gam = -slope / (nG * R_GAS * T), out = { C: r.map(v => v[0]), y, k: best.k, pre: best.a, post: best.b, cmc: Math.exp(best.xc), gcmc: best.a.f(best.xc), Gamma: Gam, Amin: Gam > 0 ? 1e18 / (NA * Gam) : null, nG, T: opt.T ?? 25 };
  const g0 = opt.g0 || 72.0; out.pi = g0 - out.gcmc;
  if (best.a.b < 0) { out.C20 = Math.exp((g0 - 20 - best.a.a) / best.a.b); if (opt.molar) out.pC20 = -Math.log10(out.C20 * opt.molar); out.ratio = out.cmc / out.C20; }
  return out;
}
function iftScan(rows) {
  const r = rows.filter(v => v[1] > 0); if (!r.length) return { err: 'no data' };
  let m = r[0]; for (const v of r) if (v[1] < m[1]) m = v;
  return { x: r.map(v => v[0]), y: r.map(v => v[1]), xmin: m[0], min: m[1], cls: m[1] < 1e-2 ? 'ultralow' : m[1] < 1 ? 'low' : 'normal' };
}

/* ================= example data (synthetic, for demonstration only) ================= */
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 - 0.5; }; }
function makeExample() {
  const z = rnd(7), f = (v, d) => +v.toFixed(d), L = a => a.map(r => r.join('\t')).join('\n');
  const rheo = []; for (let i = 0; i <= 15; i++) { const g = Math.pow(10, -1 + i * 4 / 15), e = 0.95 * Math.pow(1 + (0.6 * g) ** 2, (0.38 - 1) / 2) + 0.002; rheo.push([f(g, 3), f(e * 1000 * (1 + 0.03 * z()), 2)]); }
  const th = []; for (let t = 0; t <= 120; t += 5) { const T = t < 20 ? 25 + 65 * t / 20 : 90, e = 160 * Math.exp(2600 * (1 / (T + 273.15) - 1 / 298.15)) * Math.exp(-0.004 * Math.max(0, t - 20)); th.push([t, f(T, 1), f(e * (1 + 0.02 * z()), 1)]); }
  const ve = []; for (let i = 0; i <= 12; i++) { const w = Math.pow(10, -1 + i * 3 / 12), wl = w * 0.8, d = 1 + wl * wl; ve.push([f(w, 3), f((6 * wl * wl / d + 0.05 * Math.sqrt(w)) * (1 + 0.03 * z()), 3), f((6 * wl / d + 0.25 * Math.sqrt(w)) * (1 + 0.03 * z()), 3)]); }
  const amp = []; for (let i = 0; i <= 14; i++) { const g = Math.pow(10, -1 + i * 3.3 / 14), dec = 1 / (1 + Math.pow(g / 60, 1.6)); amp.push([f(g, 3), f(5.2 * dec * (1 + 0.01 * z()), 3), f((2.4 + 2.8 * (1 - dec)) * Math.sqrt(dec) * (1 + 0.01 * z()), 3)]); }
  const brk = []; for (const t of [0, 5, 10, 15, 20, 30, 40, 50, 60, 75, 90, 120]) brk.push([t, f((3 + 177 * Math.exp(-0.06 * t)) * (1 + 0.03 * z()), 1)]);
  const fl = []; for (const t of [1, 4, 9, 16, 25, 36]) fl.push([t, f(22.6 * (0.02 + 2 * 0.012 * Math.sqrt(t)) * (1 + 0.02 * z()), 2)]);
  const cm = []; for (const c of [0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 0.9, 1.2, 1.6, 2.5, 4, 6]) { const g = c < 1 ? 31 - 9.2 * Math.log(c) : 31; cm.push([c, f(Math.min(g, 71.5) + 0.3 * z(), 1)]); }
  const ift = []; for (const x of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]) ift.push([x, +(0.004 * Math.exp(1.6 * (x - 2.4) ** 2) * (1 + 0.05 * z())).toPrecision(3)]);
  return { rheo: L(rheo), thermal: L(th), ve: L(ve), amp: L(amp), brk: L(brk), res: L([[50, 25.1234, 25.1301], [50, 24.8710, 24.8779], [50, 25.4402, 25.4466]]), arr: L([[60, 0.021], [70, 0.038], [80, 0.066], [90, 0.11]]), fl: L(fl), cmc: L(cm), ift: L(ift) };
}

const FL = { R_GAS, NA, G0, tInv, tCdf, linreg, nls, inv, mean, sd, parseTable, rheoData, MODELS, etaModel, rheology, rheoFromParams, REF_RATES,
  interpLin, interpLog, crossings, thermal, viscoelastic, settle, stokesPL, rzExp, ppaToPhi, proppant, MESH, breaker, residue, arrhenius,
  erfcx, carterArea, fracture, fractureSeries, FR, fluidLoss, ringZW, plate, spinning, cmc, iftScan, makeExample };
if (typeof module !== 'undefined' && module.exports) module.exports = FL; else root.FL = FL;
})(typeof window !== 'undefined' ? window : this);

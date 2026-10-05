/*CORE-START*/
/* ===== Pure engineering functions (field units unless stated) ===== */
const C = {
  rhoW: 62.37,        // lb/ft3 fresh water @ 60F
  lbPerBblW: 350.2,   // lb per bbl fresh water
  gasLbScf: 0.0763,   // lb/scf per unit gas SG (air 28.964/379.48)
  ft3Bbl: 5.6146,
  g: 32.174
};
const apiToSG = api => 141.5 / (131.5 + api);
const sgToApi = sg => 141.5 / sg - 131.5;

/* Standing (1947) */
function standingRs(P, T, api, gg) {
  return gg * Math.pow((P / 18.2 + 1.4) * Math.pow(10, 0.0125 * api - 0.00091 * T), 1.2048);
}
function standingPb(Rs, T, api, gg) {
  return 18.2 * (Math.pow(Rs / gg, 0.83) * Math.pow(10, 0.00091 * T - 0.0125 * api) - 1.4);
}
function standingBo(Rs, T, api, gg) {
  const go = apiToSG(api);
  return 0.9759 + 0.00012 * Math.pow(Rs * Math.sqrt(gg / go) + 1.25 * T, 1.2);
}
/* Sutton pseudo-criticals + Papay Z */
function zPapay(P, T, gg) {
  const Tpc = 169.2 + 349.5 * gg - 74 * gg * gg;
  const Ppc = 756.8 - 131 * gg - 3.6 * gg * gg;
  const Tpr = (T + 459.67) / Tpc, Ppr = P / Ppc;
  return 1 - 3.52 * Ppr * Math.pow(10, -0.9813 * Tpr) + 0.274 * Ppr * Ppr * Math.pow(10, -0.8157 * Tpr);
}
/* Beggs-Robinson (1975) dead oil viscosity, cP, T in F */
function muDeadOil(api, T) {
  const z = 3.0324 - 0.02023 * api;
  const y = Math.pow(10, z);
  const x = y * Math.pow(T, -1.163);
  return Math.pow(10, x) - 1;
}

/* ===== IPR: composite Darcy (above Pb) + Vogel (below Pb) ===== */
function iprQ(pwf, Pr, Pb, J) {
  pwf = Math.max(0, Math.min(pwf, Pr));
  if (Pb >= Pr) { // saturated: pure Vogel
    const qmax = J * Pr / 1.8, r = pwf / Pr;
    return qmax * (1 - 0.2 * r - 0.8 * r * r);
  }
  const qb = J * (Pr - Pb);
  if (pwf >= Pb) return J * (Pr - pwf);
  const r = pwf / Pb;
  return qb + (J * Pb / 1.8) * (1 - 0.2 * r - 0.8 * r * r);
}
function iprQmax(Pr, Pb, J) { return Pb >= Pr ? J * Pr / 1.8 : J * (Pr - Pb) + J * Pb / 1.8; }
function iprPwf(q, Pr, Pb, J) {
  if (Pb >= Pr) {
    const qmax = J * Pr / 1.8; if (q >= qmax) return 0;
    const x = q / qmax; return Pr * (-0.2 + Math.sqrt(0.04 + 3.2 * (1 - x))) / 1.6;
  }
  const qb = J * (Pr - Pb);
  if (q <= qb) return Pr - q / J;
  const qv = J * Pb / 1.8; const x = (q - qb) / qv;
  if (x >= 1) return 0;
  return Pb * (-0.2 + Math.sqrt(0.04 + 3.2 * (1 - x))) / 1.6;
}

/* ===== VLP: homogeneous no-slip, segment-wise, top -> bottom ===== */
function vlpPwf(q, p) {
  const N = p.N || 40;
  const fo = 1 - p.wc, fw = p.wc, go = apiToSG(p.api);
  const D = p.id / 12, A = Math.PI / 4 * D * D, eps = (p.eps || 0.0006) / 12;
  let P = p.whp, z = 0;
  const dz = p.TVD / N, dL = p.MD / N;
  let pumpDone = !(p.dpPump > 0);
  let gasFracTop = null, gasFracBot = null;
  const props = (Pm, zm) => {
    const T = p.Twh + (p.Tbh - p.Twh) * zm / p.TVD;
    const Rs = Math.min(p.gor, standingRs(Pm, T, p.api, p.gg));
    const Bo = standingBo(Rs, T, p.api, p.gg);
    const Rfree = Math.max(p.gor - Rs, 0);
    const inj = (p.glrInj > 0 && zm < p.zInj) ? p.glrInj : 0;
    const Z = zPapay(Pm, T, p.gg);
    const Bg = 0.02827 * Z * (T + 459.67) / Pm; // ft3/scf
    const Vg = (fo * Rfree + inj) * Bg;
    const Vo = fo * Bo * C.ft3Bbl, Vw = fw * C.ft3Bbl;
    const Vt = Vo + Vw + Vg;
    const mass = fo * (C.lbPerBblW * go + p.gor * p.gg * C.gasLbScf) + fw * C.lbPerBblW * p.gw + inj * p.gg * C.gasLbScf;
    const rho = mass / Vt;
    const v = q * Vt / 86400 / A;
    const lamL = (Vo + Vw) / Vt;
    const mu = Math.max(lamL * p.muL + (1 - lamL) * 0.015, 0.012);
    const Re = 1488 * rho * v * D / mu;
    let f;
    if (Re < 2100) f = 64 / Math.max(Re, 1);
    else { const t = Math.log10(eps / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)); f = 0.25 / (t * t); }
    const dpf = f * (dL / D) * rho * v * v / (2 * C.g) / 144;
    const dph = rho * dz / 144;
    return { dp: dph + dpf, gasFrac: Vg / Vt, rho, v, Re, dph, dpf };
  };
  let sumF = 0, sumH = 0;
  for (let i = 0; i < N; i++) {
    const zm = z + dz / 2;
    let a = props(P, zm);
    let Pend = P + a.dp;
    const b = props((P + Pend) / 2, zm);
    Pend = P + b.dp;
    if (i === 0) gasFracTop = b.gasFrac;
    if (i === N - 1) gasFracBot = b.gasFrac;
    sumF += b.dpf; sumH += b.dph;
    if (p.rec) p.rec.push([z + dz, Pend, b.gasFrac, b.v]);
    P = Pend; z += dz;
    if (!pumpDone && z >= p.zPump - 1e-6) { P -= p.dpPump; pumpDone = true; }
    if (!(P > 5)) return { pwf: NaN, bad: true };
  }
  return { pwf: P, gasFracTop, gasFracBot, dpFric: sumF, dpHyd: sumH };
}
/* operating point: stable intersection VLP/IPR */
function nodalSolve(p, Pr, Pb, J) {
  const qmax = iprQmax(Pr, Pb, J);
  const g = q => { const v = vlpPwf(q, p).pwf; return isNaN(v) ? NaN : v - iprPwf(q, Pr, Pb, J); };
  const n = 60; let prevQ = qmax * 0.01, prevG = g(prevQ);
  let found = null;
  for (let i = 2; i <= n; i++) {
    const q = qmax * (i / n) * 0.995;
    const gq = g(q);
    if (!isNaN(prevG) && !isNaN(gq) && prevG < 0 && gq >= 0) {
      let lo = prevQ, hi = q;
      for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; (g(mid) < 0 ? (lo = mid) : (hi = mid)); }
      found = (lo + hi) / 2; break; // first upward crossing (lowest-rate stable point)
    }
    prevQ = q; prevG = gq;
  }
  return { q: found, qmax };
}

/* ===== Chokes (multiphase critical flow, empirical) ===== */
const CHOKES = {
  Gilbert:   { A: 10.0, B: 0.546, Cc: 1.89 },
  Ros:       { A: 17.4, B: 0.5,   Cc: 2.0 },
  Baxendell: { A: 9.56, B: 0.546, Cc: 1.93 },
  Achong:    { A: 3.82, B: 0.65,  Cc: 1.88 }
};
const chokeP = (k, q, R, S) => { const c = CHOKES[k]; return c.A * Math.pow(R, c.B) * q / Math.pow(S, c.Cc); };
const chokeS = (k, q, R, P) => { const c = CHOKES[k]; return Math.pow(c.A * Math.pow(R, c.B) * q / P, 1 / c.Cc); };

/* ===== Separators (Arnold & Stewart style, horizontal, 50% liquid-filled) ===== */
function gasDensity(P, T, gg) { const Z = zPapay(P, T, gg); return { Z, rho: 2.699 * gg * P / (Z * (T + 459.67)) }; }
function dropletVt(dm, rhoL, rhoG, mu) {
  let Cd = 0.34, Vt = 0;
  for (let i = 0; i < 60; i++) {
    Vt = 0.0119 * Math.sqrt((rhoL - rhoG) / rhoG * dm / Cd);
    const Re = 0.0049 * rhoG * dm * Vt / mu;
    const Cn = 0.34 + 3 / Math.sqrt(Re) + 24 / Re;
    if (Math.abs(Cn - Cd) < 1e-6) { Cd = Cn; break; }
    Cd = 0.5 * (Cd + Cn);
  }
  return { Vt, Cd };
}
function sepSizing(p) {
  const T = p.T, P = p.Pg + 14.696, TR = T + 459.67;
  const { Z, rho: rhoG } = gasDensity(P, T, p.gg);
  const rhoO = 62.4 * apiToSG(p.api);
  const { Vt, Cd } = dropletVt(p.dm, rhoO, rhoG, p.muG);
  const dLg = 420 * (TR * Z * p.Qg / P) * Math.sqrt(rhoG / (rhoO - rhoG) * Cd / p.dm);
  const d2L = 1.42 * (p.Qo * p.to + p.Qw * p.tw);
  const rows = [];
  for (const d of [24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 108, 120]) {
    const Lg = dLg / d, Ll = d2L / (d * d);
    const gasGov = Lg >= Ll, Leff = Math.max(Lg, Ll);
    const Lss = gasGov ? Leff + d / 12 : Leff * 4 / 3;
    const SR = 12 * Lss / d;
    rows.push({ d, Lg, Ll, Leff, Lss, SR, gasGov, ok: SR >= 3 && SR <= 5.5 });
  }
  let best = null;
  for (const r of rows) if (r.ok && (!best || r.d * r.Lss < best.d * best.Lss)) best = r;
  return { rhoG, rhoO, Z, Vt, Cd, dLg, d2L, rows, best };
}

/* ===== Stokes ===== */
/* SI: d [m], drho [kg/m3], mu [Pa.s] -> m/s ; sign gives direction */
const stokesV = (d, drho, mu) => 9.80665 * drho * d * d / (18 * mu);
const stokesCut = (vs, drho, mu) => Math.sqrt(18 * mu * vs / (9.80665 * Math.abs(drho)));

/* ===== Gas compression ===== */
function compressor(p) {
  const P1 = p.P1 + 14.696, P2 = p.P2 + 14.696, T1 = p.T1 + 459.67;
  const r = P2 / P1;
  const n = Math.max(1, Math.ceil(Math.log(r) / Math.log(p.rmax)));
  const rs = Math.pow(r, 1 / n);
  const Z = zPapay(P1, p.T1, p.gg);
  const e = (p.k - 1) / p.k;
  const nd = p.Q * 1e6 / (379.48 * 24); // lbmol/h
  const wIs = (p.k / (p.k - 1)) * Z * 1.986 * T1 * (Math.pow(rs, e) - 1) * nd; // BTU/h per stage
  const hpStage = wIs / p.eta / 2544.43;
  const Td = T1 * (1 + (Math.pow(rs, e) - 1) / p.eta) - 459.67;
  const acfm = p.Q * 1e6 / 1440 * (14.696 / P1) * (T1 / 519.67) * Z;
  return { r, n, rs, Z, hpStage, hpTot: hpStage * n, Td, acfm };
}

/* ===== Hydrate inhibitor (Hammerschmidt) ===== */
const INHIB = { MeOH: { M: 32.04, K: 2335, lbGal: 6.63 }, MEG: { M: 62.07, K: 2700, lbGal: 9.26 } };
function hammerschmidt(dT, key) { const i = INHIB[key]; return 100 * dT * i.M / (i.K + dT * i.M); }

/* ===== Crude volume correction (API MPMS 11.1 style, crude oil) ===== */
function crudeCorr(apiObs, Tobs) {
  const K0 = 341.0957, dT = Tobs - 60;
  let rho60 = 141.5 / (131.5 + apiObs) * 999.016;
  const rhoObs = rho60;
  for (let i = 0; i < 50; i++) {
    const a = K0 / (rho60 * rho60);
    const vcf = Math.exp(-a * dT * (1 + 0.8 * a * dT));
    rho60 = rhoObs / vcf;
  }
  const a = K0 / (rho60 * rho60);
  const vcf = Math.exp(-a * dT * (1 + 0.8 * a * dT));
  return { rho60, api60: 141.5 / (rho60 / 999.016) - 131.5, alpha: a, vcf };
}
const tankBblPerFt = d => Math.PI / 4 * d * d / C.ft3Bbl;

/* ===== Pipeline hydraulics (liquid, Darcy-Weisbach, Swamee-Jain) ===== */
function pipeline(p) {
  const D = p.id / 12, A = Math.PI / 4 * D * D;
  const Qf = p.Q * C.ft3Bbl / 86400;
  const v = Qf / A;
  const rho = 62.4 * apiToSG(p.api);
  const Re = 1488 * rho * v * D / p.mu;
  const eps = p.eps / 12;
  let f;
  if (Re < 2100) f = 64 / Re;
  else { const t = Math.log10(eps / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)); f = 0.25 / (t * t); }
  const L = p.Lmi * 5280;
  const dpPerMi = f * (5280 / D) * rho * v * v / (2 * C.g) / 144;
  const dpF = dpPerMi * p.Lmi;
  const dpS = rho * p.dz / 144;
  const dpTot = dpF + dpS;
  const Pdis = p.Pdel + dpTot;
  const hpH = p.Q * dpTot / 58770;
  const hrs = L / v / 3600;
  const vol = A * L / C.ft3Bbl;
  return { v, Re, f, dpPerMi, dpF, dpS, dpTot, Pdis, hpH, hrs, vol, rho, lam: Re < 2100 };
}

/* ===== Stage gas release (Standing Rs between stage pressures) ===== */
function stageBalance(c) {
  const T = c.Tres;
  const qo = c.qL * (1 - c.wc / 100), qw = c.qL * c.wc / 100;
  const Pb = standingPb(c.gor, T, c.api, c.gg);
  const RsAt = P => Math.min(c.gor, standingRs(P, T, c.api, c.gg));
  const Rs0 = RsAt(Pb), Rs14 = standingRs(14.696, T, c.api, c.gg);
  const pts = [Pb, c.Psep1 + 14.696, c.Psep2 + 14.696, 14.696];
  const denom = Rs0 - Rs14;
  const frac = [];
  for (let i = 1; i < pts.length; i++) frac.push((standingRs(pts[i - 1], T, c.api, c.gg) - standingRs(pts[i], T, c.api, c.gg)) / denom);
  const Bo = standingBo(c.gor, T, c.api, c.gg);
  return { qo, qw, Pb, Bo, shrink: 1 - 1 / Bo, frac, gas: frac.map(f => f * qo * c.gor / 1e6), gasTot: qo * c.gor / 1e6 };
}

/* ===== Hydraulic fracturing ===== */
/* Eaton (uniaxial strain) closure stress + Hubbert-Willis breakdown (non-penetrating fluid) */
function stressCalc(p) {
  const sv = p.Gob * p.TVD, pp = p.Gp * p.TVD;
  const sh = p.nu / (1 - p.nu) * (sv - p.alpha * pp) + p.alpha * pp + p.tect;
  const sH = sh + p.dSH;
  const pbd = 3 * sh - sH - pp + p.T0;
  return { sv, pp, sh, sH, pbd, fg: sh / p.TVD, pbdG: pbd / p.TVD, vertical: sh < sv };
}
const slurryDensity = (ppg, spg) => { const rp = spg * 8.345; return (8.345 + ppg) / (1 + ppg / rp); }; /* lb/gal */
const perfFriction = (q, rho, n, d, cd) => 0.2369 * q * q * rho / (cd * cd * n * n * Math.pow(d, 4));
function hfPressure(p) {
  const rho = slurryDensity(p.ppg, p.spg);
  const dpPerf = perfFriction(p.q, rho, p.nperf, p.dperf, p.cd);
  const bhtp = p.Gf * p.TVD + p.pnet + dpPerf + p.tort;
  const hyd = 0.052 * rho * p.TVD;
  const D = p.id / 12, A = Math.PI / 4 * D * D, v = p.q * C.ft3Bbl / 60 / A, rhoft = rho * 7.4805;
  const Re = 1488 * rhoft * v * D / (p.mu || 1);
  const t = Math.log10(0.00015 / 12 / (3.7 * D) + 5.74 / Math.pow(Re, 0.9));
  const f = 0.25 / (t * t);
  const dpFraw = f * (p.TVD / D) * rhoft * v * v / (2 * C.g) / 144;
  const dpF = dpFraw * (1 - p.fr / 100);
  const ps = bhtp - hyd + dpF;
  const hhp = ps * p.q / 40.8;
  const units = Math.ceil(hhp / (p.unit * p.util / 100) * (1 + p.standby / 100));
  const gpmClean = p.q * 42 / (1 + p.ppg / (p.spg * 8.345));
  const propLbMin = p.ppg * gpmClean;
  return { rho, dpPerf, bhtp, hyd, v, dpFraw, dpF, ps, hhp, units, propLbMin, gpmClean };
}
function fracBalance(p) {
  const A = p.Mp / p.Cp, xf = A / (2 * p.hf);
  const Vf = p.eta / 100 * p.Vi * C.ft3Bbl;
  const wbar = Vf / A;
  const wp = p.Cp / (p.spg * 62.4 * (1 - p.phi));
  const kfEff = p.kf * 1000 * p.ret / 100; /* md */
  const FCD = kfEff * wp / (p.k * xf);
  return { A, xf, Vf, wbar, wp, kfEff, FCD, ratio: wbar / wp };
}
/* terminal settling: Schiller-Naumann drag, Richardson-Zaki hindering */
function settleV(d, rp, rf, mu, c) {
  let v = 0.01;
  for (let i = 0; i < 200; i++) {
    const Re = Math.max(rf * v * d / mu, 1e-9);
    const Cd = 24 / Re * (1 + 0.15 * Math.pow(Re, 0.687));
    const vn = Math.sqrt(4 * 9.80665 * d * (rp - rf) / (3 * Cd * rf));
    if (Math.abs(vn - v) < 1e-9) { v = vn; break; }
    v = 0.5 * (v + vn);
  }
  const Re = rf * v * d / mu;
  const n = Re < 0.2 ? 4.65 : Re < 1 ? 4.35 * Math.pow(Re, -0.03) : Re < 500 ? 4.45 * Math.pow(Re, -0.1) : 2.39;
  return { v0: v, Re, n, vh: v * Math.pow(Math.max(1 - c, 0), n) };
}
/* Arps decline */
function arpsQ(qi, Di, b, t) { return b < 0.005 ? qi * Math.exp(-Di * t) : qi / Math.pow(1 + b * Di * t, 1 / b); }
function arpsNp(qi, Di, b, t) { /* bbl, t in years, q in bbl/d */
  if (b < 0.005) return qi * 365.25 / Di * (1 - Math.exp(-Di * t));
  if (Math.abs(b - 1) < 0.005) return qi * 365.25 / Di * Math.log(1 + Di * t);
  return qi * 365.25 / (Di * (1 - b)) * (1 - Math.pow(1 + b * Di * t, (b - 1) / b));
}

/* ===== Rheology-aware proppant settling ===== */
/* model: {type:'newt', mu(Pa.s)} | {type:'pl', K(Pa.s^n), n} | {type:'cross', eta0, einf, lam(s), m} */
function etaModel(m, g) {
  g = Math.max(g, 1e-9);
  if (m.type === 'newt') return m.mu;
  if (m.type === 'pl') return Math.max(m.K * Math.pow(g, m.n - 1), m.einf || 1e-4);
  return m.einf + (m.eta0 - m.einf) / (1 + Math.pow(m.lam * g, m.m));
}
function faxen(lam) { lam = Math.min(Math.max(lam, 0), 0.6); const f = 1 - 1.004 * lam + 0.418 * Math.pow(lam, 3) + 0.21 * Math.pow(lam, 4) - 0.169 * Math.pow(lam, 5); return Math.max(f, 0.05); }
function settleRheo(p) {
  const g0 = 9.80665, drag = (v) => {
    const gam = p.gc * v / p.d, eta = etaModel(p.model, gam), Re = Math.max(p.rf * v * p.d / eta, 1e-12);
    const Cd = 24 / Re * (1 + 0.15 * Math.pow(Re, 0.687));
    return { vn: Math.sqrt(4 * g0 * p.d * (p.rp - p.rf) / (3 * Cd * p.rf)), eta, gam, Re };
  };
  let lo = 1e-13, hi = 20;
  for (let i = 0; i < 200; i++) { const mid = Math.sqrt(lo * hi); (drag(mid).vn > mid) ? (lo = mid) : (hi = mid); }
  const v0 = Math.sqrt(lo * hi), d0 = drag(v0);
  const nRZ = d0.Re < 0.2 ? 4.65 : d0.Re < 1 ? 4.35 * Math.pow(d0.Re, -0.03) : d0.Re < 500 ? 4.45 * Math.pow(d0.Re, -0.1) : 2.39;
  const hind = Math.pow(Math.max(1 - p.c, 0), nRZ), wall = p.w ? faxen(p.d / p.w) : 1;
  const v = v0 * hind * wall, dv = drag(v);
  return { v0, v, eta: dv.eta, gam: dv.gam, Re: d0.Re, hind, wall, nRZ };
}

/* ===== Linear-flow production from fractured tight rock ===== */
function erfc(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return 1 - s * y; }
function linFlow(p) {
  const k = p.k * 9.869233e-16, mu = p.mu * 1e-3, ct = p.ct / 6894.757, dp = p.dp * 6894.757;
  const A = 4 * p.xf * p.hf * 0.09290304 * p.nF, eta = k / (p.phi * mu * ct), s = p.s * 0.3048;
  const te = Math.pow(s / 4, 2) / eta;
  const qlin = ts => A * k * dp / (mu * Math.sqrt(Math.PI * eta * ts));
  const Qlin = ts => 2 * A * dp * Math.sqrt(k * p.phi * ct * ts / (Math.PI * mu));
  const Qmax = p.phi * ct * dp * A * s / 2, qe = qlin(te), Qe = Qlin(te), tau = Math.max(Qmax - Qe, 1e-12) / qe;
  const toSTB = 86400 / 0.158987 / p.Bo;
  return {
    eta, te: te / 86400,
    q: td => { const ts = Math.max(td, 1e-6) * 86400; return (ts <= te ? qlin(ts) : qe * Math.exp(-(ts - te) / tau)) * toSTB; },
    Np: td => { const ts = td * 86400; return (ts <= te ? Qlin(ts) : Qe + qe * tau * (1 - Math.exp(-(ts - te) / tau))) / 0.158987 / p.Bo; },
    dist: td => Math.min(2 * Math.sqrt(eta * td * 86400), s / 2) / 0.3048,
    Npmax: Qmax / 0.158987 / p.Bo
  };
}
function whpFor(q, p, pwf) {
  let lo = 15, hi = pwf;
  const f = w => vlpPwf(q, { ...p, whp: w }).pwf - pwf;
  if (!(f(lo) <= 0)) return null;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; (f(m) < 0 ? (lo = m) : (hi = m)); }
  return (lo + hi) / 2;
}
/*CORE-END*/
if (typeof module !== 'undefined') module.exports = { apiToSG, standingRs, standingPb, standingBo, zPapay, muDeadOil, iprQ, iprPwf, iprQmax, vlpPwf, nodalSolve, chokeP, chokeS, sepSizing, stokesV, stokesCut, compressor, hammerschmidt, crudeCorr, tankBblPerFt, pipeline, stageBalance, gasDensity, dropletVt, stressCalc, slurryDensity, perfFriction, hfPressure, fracBalance, settleV, arpsQ, arpsNp, etaModel, faxen, settleRheo, erfc, linFlow, whpFor };

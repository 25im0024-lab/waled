/* Field Hydraulics — calculation core (no DOM). Runs in the browser (window.FH) and in Node (module.exports).
   Oilfield units internally: ft, in, ppg, gpm, psi, lbf/100ft2, cP, ft/min.
   Rheology and pressure losses follow the Herschel-Bulkley procedure of API RP 13D (2006 and later editions);
   wellpath by the minimum-curvature method; cuttings slip velocity by Moore's correlation. */
(function (root) {
'use strict';
const PI = Math.PI, log10 = Math.log10, rad = d => d * PI / 180, deg = r => r * 180 / PI;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

/* ---------- unit conversions (to / from the internal oilfield units) ---------- */
const U = {
  len: { m: 0.3048, ft: 1 },               // display per ft
  dens: { sg: 1 / 8.3454, ppg: 1 },        // display per ppg
  flow: { lpm: 3.785412, gpm: 1 },         // display per gpm
  press: { bar: 0.0689476, psi: 1, kPa: 6.89476 },
  vel: { 'm/min': 0.3048, 'ft/min': 1 },   // annular / pipe velocity display per ft/min
  vol: { m3: 0.158987, bbl: 1 },
};
const toDisp = (q, unit, v) => v * U[q][unit];
const toInt = (q, unit, v) => v / U[q][unit];

/* ---------- rheology: Herschel-Bulkley from Fann 35 readings (API RP 13D) ----------
   Dial readings are used as lbf/100ft2 (the 1.067 dial factor is neglected, as in the PV/YP convention).
   ty = 2·R3 − R6 ; n = 3.32·log10[(R600 − ty)/(R300 − ty)] ; K = (R300 − ty)/511^n */
const RPM = [600, 300, 200, 100, 6, 3];
function rheology(m) {
  const R = { 600: +m.r600, 300: +m.r300, 200: +m.r200, 100: +m.r100, 6: +m.r6, 3: +m.r3 };
  const PV = R[600] - R[300], YP = R[300] - PV;
  let ty = 2 * R[3] - R[6];
  ty = clamp(isFinite(ty) ? ty : 0, 0, Math.max(0, R[300] * 0.99));
  const n = 3.32 * log10((R[600] - ty) / (R[300] - ty));
  const K = (R[300] - ty) / Math.pow(511, n);                  // lbf·s^n/100ft2
  const model = rpm => ty + K * Math.pow(1.703 * rpm, n);     // shear rate 1.703·rpm (1/s)
  const fit = RPM.filter(r => isFinite(R[r])).map(r => ({ rpm: r, meas: R[r], model: model(r) }));
  const mean = fit.reduce((a, p) => a + p.meas, 0) / fit.length;
  const ssr = fit.reduce((a, p) => a + (p.meas - p.model) ** 2, 0), sst = fit.reduce((a, p) => a + (p.meas - mean) ** 2, 0);
  // Power law (two-point, 600/300) and Bingham, for reference
  const nPL = 3.32 * log10(R[600] / R[300]), KPL = R[300] / Math.pow(511, nPL);
  const ok = isFinite(n) && n > 0.05 && n <= 1.5 && K > 0;
  return { R, PV, YP, ty, n, K, model, fit, r2: sst > 0 ? 1 - ssr / sst : 1, nPL, KPL, ok };
}

/* ---------- wellpath: minimum curvature ----------
   β = acos[cos(I2−I1) − sinI1·sinI2·(1 − cos(A2−A1))] ; RF = (2/β)·tan(β/2)
   ΔTVD = ΔMD/2·(cosI1 + cosI2)·RF ; ΔN = ΔMD/2·(sinI1cosA1 + sinI2cosA2)·RF ; ΔE = ΔMD/2·(sinI1sinA1 + sinI2sinA2)·RF */
function survey(rows) {
  const st = (rows || []).map(r => ({ md: +r[0], inc: +r[1] || 0, azi: +r[2] || 0 })).filter(r => isFinite(r.md)).sort((a, b) => a.md - b.md);
  if (!st.length || st[0].md > 0) st.unshift({ md: 0, inc: 0, azi: st.length ? st[0].azi : 0 });
  st[0].tvd = 0; st[0].n = 0; st[0].e = 0; st[0].dls = 0;
  for (let i = 1; i < st.length; i++) {
    const a = st[i - 1], b = st[i], dmd = b.md - a.md, I1 = rad(a.inc), I2 = rad(b.inc), A1 = rad(a.azi), A2 = rad(b.azi);
    const cb = Math.cos(I2 - I1) - Math.sin(I1) * Math.sin(I2) * (1 - Math.cos(A2 - A1)), beta = Math.acos(clamp(cb, -1, 1));
    const rf = beta > 1e-9 ? 2 / beta * Math.tan(beta / 2) : 1;
    b.tvd = a.tvd + dmd / 2 * (Math.cos(I1) + Math.cos(I2)) * rf;
    b.n = a.n + dmd / 2 * (Math.sin(I1) * Math.cos(A1) + Math.sin(I2) * Math.cos(A2)) * rf;
    b.e = a.e + dmd / 2 * (Math.sin(I1) * Math.sin(A1) + Math.sin(I2) * Math.sin(A2)) * rf;
    b.dls = dmd > 0 ? deg(beta) * 100 / dmd : 0;                // deg/100 ft
  }
  // interpolation along MD (linear in the curvature-corrected values; extrapolate the last tangent)
  const at = (md, key) => {
    if (md <= st[0].md) return st[0][key] + (key === 'tvd' ? md - st[0].md : 0);
    for (let i = 1; i < st.length; i++) if (md <= st[i].md) { const a = st[i - 1], b = st[i], u = (md - a.md) / (b.md - a.md || 1); return a[key] + u * (b[key] - a[key]); }
    const l = st[st.length - 1]; if (key === 'tvd') return l.tvd + (md - l.md) * Math.cos(rad(l.inc)); return l[key];
  };
  return { st, tvd: md => at(md, 'tvd'), inc: md => at(md, 'inc') };
}

/* ---------- friction factor and flow in one section (API RP 13D, Herschel-Bulkley) ----------
   α = 0 pipe, 1 annulus ; G = [((3−α)n + 1)/((4−α)n)]·(1 + α/2)
   γw = 1.6·G·V/D  (1/s; V ft/min, D in — D = pipe ID or D2 − D1)
   τw = [(4−α)/(3−α)]^n·τy + K·γw^n   (lbf/100ft2)
   NRe = ρ·V² / (19.36·τw)  (ρ ppg)
   laminar NRe < 3470 − 1370n ; turbulent NRe > 4270 − 1370n
   f_lam = 16/NRe ; f_trans = 16·NRe/(3470 − 1370n)² ; f_turb = a/NRe^b, a = (log n + 3.93)/50, b = (1.75 − log n)/7
   f = [f_lam^12 + (f_trans^−8 + f_turb^−8)^(−3/2)]^(1/12)
   dP/dL = 1.076·ρ·V²·f / (10^5·D)  (psi/ft) */
function friction(NRe, n) {
  const fl = 16 / NRe, ft = 16 * NRe / (3470 - 1370 * n) ** 2, a = (log10(n) + 3.93) / 50, b = (1.75 - log10(n)) / 7, fturb = a / Math.pow(NRe, b);
  const f = Math.pow(fl ** 12 + Math.pow(ft ** -8 + fturb ** -8, -1.5), 1 / 12);
  const regime = NRe < 3470 - 1370 * n ? 'laminar' : NRe > 4270 - 1370 * n ? 'turbulent' : 'transitional';
  return { f, regime, fl, ft, fturb };
}
function flow(Q, Dout, Din, L, rho, rh) { // Din = 0 for pipe flow
  const ann = Din > 0, alpha = ann ? 1 : 0, D = ann ? Dout - Din : Dout;
  const area = PI / 4 * (Dout * Dout - Din * Din);                 // in2
  const V = 24.51 * Q / (Dout * Dout - Din * Din);                 // ft/min (Q gpm, D in)
  if (Q <= 0 || L <= 0 || D <= 0) return { V: 0, gw: 0, tw: 0, NRe: 0, regime: 'none', f: 0, dP: 0, D, area, mua: 0 };
  const n = rh.n, G = ((3 - alpha) * n + 1) / ((4 - alpha) * n) * (1 + alpha / 2);
  const gw = 1.6 * G * V / D;
  const tw = Math.pow((4 - alpha) / (3 - alpha), n) * rh.ty + rh.K * Math.pow(gw, n);
  const NRe = rho * V * V / (19.36 * tw);
  const fr = friction(NRe, n);
  const dPdL = 1.076 * rho * V * V * fr.f / (1e5 * D);
  return { V, G, gw, tw, NRe, regime: fr.regime, f: fr.f, dPdL, dP: dPdL * L, D, area, mua: 478.8 * tw / gw };
}

/* ---------- bit hydraulics ----------
   TFA = Σ π/4·(dn/32)² ; ΔPbit = 8.311e-5·ρ·Q² / (Cd²·TFA²) (psi) ; vn = 0.3208·Q/TFA (ft/s)
   HHPb = ΔPbit·Q/1714 ; HSI = HHPb / (π/4·Db²) ; Fj = 0.01823·Cd·Q·√(ρ·ΔPbit) (lbf) */
function bit(Q, rho, nozzles, cd, Db) {
  const tfa = nozzles.reduce((a, d) => a + PI / 4 * (d / 32) ** 2, 0);
  if (!(tfa > 0) || Q <= 0) return { tfa, dP: 0, vn: 0, hhp: 0, hsi: 0, fj: 0 };
  const dP = 8.311e-5 * rho * Q * Q / (cd * cd * tfa * tfa), vn = 0.3208 * Q / tfa, hhp = dP * Q / 1714;
  return { tfa, dP, vn, hhp, hsi: hhp / (PI / 4 * Db * Db), fj: 0.01823 * cd * Q * Math.sqrt(rho * dP) };
}

/* ---------- cuttings slip velocity: Moore (field units; vs ft/s, ds in, ρ ppg, μa cP) ----------
   intermediate: vs = 2.90·ds·(ρs−ρf)^0.667 / (ρf^0.333·μa^0.333) ; NRp = 928·ρf·vs·ds/μa
   NRp > 300: vs = 1.54·√(ds·(ρs−ρf)/ρf) ; NRp < 3: vs = 82.87·ds²·(ρs−ρf)/μa */
function moore(rf, rs, ds, mua) {
  if (!(mua > 0) || rs <= rf) return { vs: 0, nrp: 0, regime: '—' };
  let vs = 2.90 * ds * Math.pow(rs - rf, 0.667) / (Math.pow(rf, 0.333) * Math.pow(mua, 0.333)), regime = 'intermediate';
  const nrp = 928 * rf * vs * ds / mua;
  if (nrp > 300) { vs = 1.54 * Math.sqrt(ds * (rs - rf) / rf); regime = 'turbulent'; }
  else if (nrp < 3) { vs = 82.87 * ds * ds * (rs - rf) / mua; regime = 'laminar'; }
  return { vs, nrp: 928 * rf * vs * ds / mua, regime };
}

/* ---------- pumps: triplex displacement bbl/stk = 0.000243·Dl²·Ls·η (Dl, Ls in) ---------- */
function pumps(p) {
  const disp = 0.000243 * p.liner * p.liner * p.stroke * (p.eff / 100);   // bbl/stk
  const spm = (p.spm || []).reduce((a, s) => a + (+s || 0), 0);
  const Q = p.qOverride > 0 ? p.qOverride : disp * spm * 42;               // gpm
  return { disp, spm, Q };
}

/* ---------- geometry: pipe and annulus sections between all depth breakpoints ---------- */
function geometry(inp) {
  const B = inp.well.bitDepth > 0 ? Math.min(inp.well.bitDepth, inp.well.td) : inp.well.td;
  // drill string from the bit upwards; a component with len ≤ 0 fills to surface
  const comps = []; let z = B;
  for (const c of inp.string) {
    const len = c.len > 0 ? Math.min(c.len, z) : z; if (len <= 0) break;
    comps.push({ name: c.name, od: +c.od, id: +c.id, top: z - len, bot: z }); z -= len;
  }
  if (z > 1e-6 && comps.length) comps[comps.length - 1].top = 0;              // extend the last component to surface
  const ohId = inp.hole.id * (1 + (inp.hole.washout || 0) / 100);
  const cas = (inp.casing || []).filter(c => c.id > 0 && c.shoe > (c.top || 0));
  const holeAt = zm => { let d = null; for (const c of cas) if (zm >= (c.top || 0) && zm <= c.shoe) d = d === null ? c.id : Math.min(d, c.id); return d === null ? { id: ohId, cased: false } : { id: d, cased: true }; };
  const pipeAt = zm => comps.find(c => zm >= c.top && zm <= c.bot) || comps[comps.length - 1];
  const bp = new Set([0, B]); comps.forEach(c => { bp.add(c.top); bp.add(c.bot); }); cas.forEach(c => { if (c.shoe < B) bp.add(c.shoe); if (c.top > 0 && c.top < B) bp.add(c.top); });
  const pts = [...bp].filter(v => v >= 0 && v <= B).sort((a, b) => a - b);
  const ann = [];
  for (let i = 1; i < pts.length; i++) {
    const z0 = pts[i - 1], z1 = pts[i]; if (z1 - z0 < 1e-6) continue; const zm = (z0 + z1) / 2, h = holeAt(zm), p = pipeAt(zm);
    ann.push({ top: z0, bot: z1, len: z1 - z0, dh: h.id, cased: h.cased, od: p.od, name: p.name });
  }
  return { B, comps, ann, ohId };
}

/* ---------- full calculation at one flow rate ---------- */
function calc(inp, Qover) {
  const rh = rheology(inp.mud), sv = survey(inp.survey), g = geometry(inp), pm = pumps(inp.pumps);
  const Q = Qover > 0 ? Qover : pm.Q, rho = +inp.mud.mw;
  const warn = [];
  if (!rh.ok) warn.push('rheology');
  const surf = flow(Q, inp.surface.id, 0, inp.surface.len, rho, rh);
  const pipe = g.comps.map(c => Object.assign({ name: c.name, top: c.top, bot: c.bot, od: c.od, id: c.id, len: c.bot - c.top }, flow(Q, c.id, 0, c.bot - c.top, rho, rh)));
  const b = bit(Q, rho, inp.bit.nozzles, inp.bit.cd || 0.95, inp.hole.id);
  // annulus, from surface down; cuttings load from ROP (optional)
  const Ab = PI / 4 * inp.hole.id ** 2, rop = +inp.ops.rop || 0, ds = +inp.mud.ds || 0.25, rs = (+inp.mud.rhos || 2.6) * 8.3454;
  const qc = rop * Ab / 144 * 7.4805 / 60;                                       // gpm of drilled rock
  let cum = 0;
  const ann = g.ann.map(s => {
    const fl = flow(Q, s.dh, s.od, s.len, rho, rh), inc = sv.inc((s.top + s.bot) / 2);
    const mo = moore(rho, rs, ds, fl.mua), va = fl.V / 60;                        // ft/s
    const Ft = va > 0 ? clamp(1 - mo.vs / va, 0, 1) : 0, Ca = qc > 0 && Q > 0 ? qc / (qc + Q * Math.max(Ft, 0.05)) : 0;
    cum += fl.dP;
    const tvdB = sv.tvd(s.bot);
    return Object.assign({}, s, fl, { inc, vs: mo.vs * 60, moore: mo.regime, Ft, Ca, cumDP: cum, tvdBot: tvdB, ecdBot: rho + cum / (0.052 * Math.max(tvdB, 1)) });
  });
  const annDP = cum, pipeDP = pipe.reduce((a, p) => a + p.dP, 0), extra = +inp.bit.extra || 0;
  const spp = surf.dP + pipeDP + b.dP + extra + annDP;
  const tvdBit = sv.tvd(g.B);
  // cuttings load adds to the annulus density (volume-weighted with the bit-region Ca)
  const caBit = ann.length ? ann[ann.length - 1].Ca : 0, rhoCut = rho * (1 - caBit) + rs * caBit;
  const ecd = rho + annDP / (0.052 * Math.max(tvdBit, 1)), ecdCut = ecd + (rhoCut - rho);
  const shoe = (inp.casing || []).reduce((a, c) => Math.max(a, c.shoe < g.B ? c.shoe : 0), 0);
  let ecdShoe = null; if (shoe > 0) { let c2 = 0; for (const s of ann) { if (s.bot <= shoe + 1e-6) c2 = s.cumDP; } ecdShoe = rho + c2 / (0.052 * Math.max(sv.tvd(shoe), 1)); }
  // volumes (bbl), strokes, times
  const capP = pipe.reduce((a, p) => a + p.id * p.id / 1029.4 * p.len, 0) + inp.surface.id ** 2 / 1029.4 * inp.surface.len;
  const capA = ann.reduce((a, s) => a + (s.dh * s.dh - s.od * s.od) / 1029.4 * s.len, 0);
  const qbpm = Q / 42;
  const maxInc = Math.max(...sv.st.map(s => s.inc));
  if (maxInc > 30) warn.push('deviated');
  if (ann.some(s => s.Ft < 0.5)) warn.push('lowFt');
  if (inp.ops.maxSpp > 0 && spp > inp.ops.maxSpp) warn.push('spp');
  if (inp.ops.fgShoe > 0 && ecdShoe !== null && ecdShoe > inp.ops.fgShoe) warn.push('frac');
  return {
    Q, rho, rh, sv, g, pm, surf, pipe, bit: b, ann, extra, annDP, pipeDP, spp, ecd, ecdCut, ecdShoe, shoe, tvdBit,
    pctBit: spp > 0 ? b.dP / spp : 0, hhpPump: spp * Q / 1714, capP, capA,
    stkBit: pm.disp > 0 ? capP / pm.disp : 0, stkBU: pm.disp > 0 ? capA / pm.disp : 0,
    tBit: qbpm > 0 ? capP / qbpm : 0, tBU: qbpm > 0 ? capA / qbpm : 0, warn, maxInc,
  };
}

/* ---------- comparison with measured data ---------- */
function compare(inp) {
  return (inp.measured || []).filter(m => m.q > 0).map(m => {
    const r = calc(inp, m.q); let ecdC = null;
    if (m.ecd > 0) { const z = m.ecdDepth > 0 ? Math.min(m.ecdDepth, r.g.B) : r.g.B; let c = 0; for (const s of r.ann) { if (s.top < z) c += s.dP * clamp((z - s.top) / s.len, 0, 1); } ecdC = r.rho + c / (0.052 * Math.max(r.sv.tvd(z), 1)); }
    return { src: m.src || '', q: m.q, sppM: m.spp, sppC: r.spp, eSpp: m.spp > 0 ? (r.spp - m.spp) / m.spp : null, ecdM: m.ecd || null, ecdC, eEcd: m.ecd > 0 ? (ecdC - m.ecd) / m.ecd : null };
  });
}

/* ---------- example: the Driller's Console training well (not field data) ---------- */
const EXAMPLE = {
  units: { len: 'm', dens: 'sg', flow: 'lpm', press: 'bar' },
  well: { name: "Example — Driller's Console training well (not field data)", td: 3115 / 0.3048, bitDepth: 0 },
  casing: [{ name: '13 3/8" 72 ppf', id: 12.347, top: 0, shoe: 2000 / 0.3048 }],
  hole: { id: 12.25, washout: 0 },
  string: [{ name: '8" drill collars (BHA)', od: 8.0, id: 2.8125, len: 200 / 0.3048 }, { name: '5 1/2" DP 21.9 ppf', od: 5.5, id: 4.778, len: 0 }],
  surface: { id: 3.826, len: 100 / 0.3048 },
  mud: { mw: 1.20 * 8.3454, r600: 62, r300: 37, r200: 28, r100: 18, r6: 7, r3: 6, ds: 0.25, rhos: 2.6 },
  pumps: { liner: 5.5, stroke: 12, eff: 95, spm: [95, 95, 95], qOverride: 0 },
  bit: { nozzles: [14, 14, 14, 14, 14, 14], cd: 0.95, extra: 0 },
  ops: { rop: 20 / 0.3048, fgShoe: 1.78 * 8.3454, maxSpp: 5000 },
  survey: [[0, 0, 0], [3115 / 0.3048, 0, 0]],
  measured: [],
};

const api = { U, toDisp, toInt, rheology, survey, friction, flow, bit, moore, pumps, geometry, calc, compare, EXAMPLE };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FH = api;
})(typeof window !== 'undefined' ? window : globalThis);

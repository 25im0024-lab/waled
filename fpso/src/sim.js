/* FPSO Console — physics core (no DOM). Runs in the browser (window.FPSO) and in Node (module.exports).
   Coupled models: reservoir (material balance) -> wells (composite Vogel IPR, tubing, subsea choke; nodal solution)
   -> manifold & riser (hydrostatic + friction, slugging, hydrate cooldown) -> 3-phase HP separator (levels, pressure)
   -> gas compression (adiabatic, multi-stage), fuel gas / gas lift / export / reinjection, flare
   -> produced water (hydrocyclones, OIW) and seawater injection -> crude storage, draft, offloading to a shuttle tanker
   -> turret mooring (weathervaning, offset, line tensions) -> power balance, alarms, trends.
   Units inside: bar, m, s, Sm3 (liquid at standard conditions), Sm3 gas, °C, kN, MW. Rates in the public state are per day. */
(function (root) {
'use strict';
const G = 9.80665, PI = Math.PI, DAY = 86400, PSTD = 1.01325, TSTD = 288.15;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lag = (c, t, tau, dt) => c + (t - c) * (1 - Math.exp(-dt / tau));
const approach = (c, t, r, dt) => { const d = t - c, m = r * dt; return Math.abs(d) <= m ? t : c + Math.sign(d) * m; };
const wrap = a => ((a % 360) + 540) % 360 - 180;          // -180..180
const rad = d => d * PI / 180;

const CFG = {
  name: 'FPSO Al-Waha', field: 'Block 7 (training field)',
  wd: 1200,                                   // water depth, m
  rhoO: 850, rhoW: 1030, rhoSW: 1025,         // stock-tank oil, produced water, seawater (kg/m3)
  Bo: 1.30, Bg: 0.0045, Pb: 220,              // oil FVF (rm3/Sm3), gas FVF at reservoir (rm3/Sm3), bubble point (bar)
  ctVp: 140000,                               // total compressibility x pore volume, rm3/bar
  wells: [
    { id: 'P-1', J: 80, wc: 0.08, wcMax: 0.70, Nb: 4e6, gor: 190, tvd: 1850, dPr: 0 },
    { id: 'P-2', J: 62, wc: 0.22, wcMax: 0.80, Nb: 3e6, gor: 170, tvd: 1820, dPr: -6 },
    { id: 'P-3', J: 95, wc: 0.04, wcMax: 0.65, Nb: 5e6, gor: 230, tvd: 1900, dPr: 4 },
    { id: 'P-4', J: 45, wc: 0.48, wcMax: 0.90, Nb: 2e6, gor: 140, tvd: 1800, dPr: -12 },
  ],
  Pr0: 300,                                   // initial reservoir pressure, bar
  choke: 1350,                                // Sm3/d per √bar at 100 % opening
  tub: { kf: 5.0e-7, a: 0.0035, b: 0.004 },   // tubing friction coeff, gas lightening, gas friction factor
  riser: { len: 1230, kr: 2.2e-8, a: 0.006 },
  sep: { V: 150, Vliq: 80, Pset: 15, LTsp: 55, LIsp: 30, psv: 24, pcv: 2.0 },
  comp: { train: 2.4, Pd: 180, stages: 3, k: 1.28, M: 19, T1: 313, eta: 0.75, rhoStd: 0.80 }, // MSm3/d per train
  exportCap: 5.0,                             // MSm3/d export + reinjection capacity
  power: { base: 12, gtUnit: 25, gts: 4, etaGT: 0.32, LHV: 36e6 },  // MW, J/Sm3
  wi: { cap: 32000, dP: 260, eta: 0.75 },     // seawater injection, Sm3/d, bar
  pw: { cap: 30000, base: 12, limit: 30 },    // produced-water treatment capacity Sm3/d, base OIW mg/L, discharge limit mg/L
  cargo: { cap: 254000, min: 0.05, lightDraft: 9.0, wpa: 16240 },   // m3 (≈1.6 MMbbl), m, m2
  tanker: { cap: 159000, rate: 6360, hsLimit: 4.0, approach: 7200, hookup: 5400, disconnect: 3600, depart: 3600 },
  moor: { lines: 9, kl: 18, T0: 1500, MBL: 8000, Af: 3200, As: 9500, Cdw: 0.9, Ccur: 0.6, AcF: 1300, AcS: 5600, cw: 8, dyn: 55 },
};

/* Composite IPR (straight line above Pb, Vogel below): liquid rate Sm3/d at flowing bottom-hole pressure Pwf */
function ipr(J, Pr, Pwf, Pb) {
  if (Pwf >= Pr) return 0;
  if (Pr <= Pb) { const qmax = J * Pr / 1.8, x = Pwf / Pr; return qmax * (1 - 0.2 * x - 0.8 * x * x); }
  if (Pwf >= Pb) return J * (Pr - Pwf);
  const qb = J * (Pr - Pb), x = Pwf / Pb; return qb + J * Pb / 1.8 * (1 - 0.2 * x - 0.8 * x * x);
}
const chokeCv = u => Math.pow(clamp(u, 0, 100) / 100, 1.6);  // equal-percentage-like trim

const ALARMS = [
  // id, text, priority (1 crit, 2 high, 3 advisory), on-delay s, test
  ['ESD', 'EMERGENCY SHUTDOWN ACTIVE', 1, 0, m => m.c.esd],
  ['PSD', 'PROCESS SHUTDOWN — WELLS SHUT IN', 1, 0, m => m.c.psd],
  ['SEP_LTHH', 'HP SEPARATOR LIQUID LEVEL HIGH-HIGH', 1, 2, m => m.s.sep.LT > 90],
  ['SEP_LTLL', 'HP SEPARATOR LIQUID LEVEL LOW-LOW', 1, 5, m => m.s.sep.LT < 10 && m.d.qL > 500],
  ['SEP_PH', 'HP SEPARATOR PRESSURE HIGH', 2, 3, m => m.s.sep.P > m.c.sep.Pset + 3],
  ['PSV', 'SEPARATOR PSV LIFTING — RELIEF TO FLARE', 1, 0, m => m.s.sep.psvQ > 0.01],
  ['COMP_TRIP', 'GAS COMPRESSOR TRAIN TRIPPED', 2, 0, m => m.s.comp.tripped.some(Boolean)],
  ['FLARE', 'HIGH FLARING', 2, 30, m => m.d.flare > 0.5],
  ['DIESEL', 'FUEL GAS SHORT — TURBINES ON DIESEL', 2, 10, m => m.s.power.diesel],
  ['LOADSHED', 'POWER DEMAND ABOVE AVAILABLE GENERATION', 1, 5, m => m.d.powerDemand > m.d.powerAvail],
  ['OIW', 'PRODUCED WATER OIL-IN-WATER ABOVE LIMIT', 2, 60, m => m.d.oiw > m.c.pw.limit && m.d.qw > 100],
  ['BSW', 'OFF-SPEC CRUDE — BS&W ABOVE 0.5 %', 2, 60, m => m.d.bsw > 0.5 && m.d.qo > 100],
  ['SLUG', 'RISER SLUGGING', 3, 120, m => m.s.slug > 0.25],
  ['HYD', 'HYDRATE RISK IN FLOWLINES — INJECT MEG OR DEPRESSURIZE', 1, 30, m => m.d.Tarr < m.d.Thyd + 3 && m.d.Pman > 20],
  ['DEAD', 'WELL UNABLE TO FLOW — CONSIDER GAS LIFT', 3, 60, m => m.s.wells.some((w, i) => m.c.wells[i].open && m.c.wells[i].choke > 5 && w.q < 50)],
  ['CARGO_H', 'CARGO TANKS HIGH — ARRANGE OFFLOADING', 2, 0, m => m.s.cargo > 0.92 * CFG.cargo.cap],
  ['CARGO_HH', 'CARGO TANKS FULL — PRODUCTION MUST STOP', 1, 0, m => m.s.cargo > 0.985 * CFG.cargo.cap],
  ['OFF_DISC', 'OFFLOADING EMERGENCY DISCONNECT', 1, 0, m => m.s.tanker.emergency],
  ['MOOR_T', 'MOORING LINE TENSION HIGH (> 55 % MBL)', 2, 10, m => m.d.Tmax > 0.55 * CFG.moor.MBL],
  ['MOOR_FAIL', 'MOORING LINE FAILURE', 1, 0, m => m.s.moor.failed.some(Boolean)],
  ['OFFSET', 'VESSEL OFFSET HIGH (> 4 % OF WATER DEPTH)', 2, 10, m => m.d.offset > 0.04 * CFG.wd],
  ['VRR', 'VOIDAGE REPLACEMENT BELOW 0.9 — RESERVOIR PRESSURE FALLING', 3, 600, m => m.d.vrr < 0.9 && m.d.qL > 1000],
  ['PR_LOW', 'RESERVOIR PRESSURE BELOW BUBBLE POINT', 3, 0, m => m.s.Pr < CFG.Pb],
];

class FpsoSim {
  constructor(opts) { opts = opts || {}; this.seed = opts.seed || 20261008; this.reset(opts.hot !== false); }
  rnd() { this.rs = (this.rs * 1664525 + 1013904223) >>> 0; return this.rs / 4294967296; }
  gauss() { return (this.rnd() + this.rnd() + this.rnd() - 1.5) * 2; }

  reset(hot) {
    this.rs = this.seed; const on = !!hot;
    this.c = {
      wells: CFG.wells.map((w, i) => ({ open: on, choke: on ? 75 : 0, lift: on && i === 3 ? 0.25 : 0 })),     // lift: MSm3/d per well
      sep: { Pset: CFG.sep.Pset, LTsp: CFG.sep.LTsp, LIsp: CFG.sep.LIsp, lcvStuck: null },
      comp: [on, on], route: 0.5,                 // fraction of surplus gas to reinjection (rest export)
      wi: { on: on, rate: on ? 21000 : 0 },
      meg: false, esd: false, psd: false,
      env: { wind: 12, windDir: 0, hs: 2.0, waveDir: 10, cur: 0.5, curDir: 30 },
      tankerReq: false, offRate: CFG.tanker.rate,
    };
    this.s = {
      t: 0, Pr: CFG.Pr0, Np: CFG.wells.map(() => 0),
      wells: CFG.wells.map(w => ({ q: 0, qo: 0, qw: 0, qg: 0, Pwf: 0, Pwh: 0, wc: w.wc, ch: on ? 75 : 0 })),
      Pman: 80, Tarr: on ? 55 : 6, slug: 0, slugPh: 0,
      sep: { P: CFG.sep.Pset, Vo: 0.32 * CFG.sep.Vliq, Vw: 0.22 * CFG.sep.Vliq, LT: 54, LI: 27, qoOut: 0, qwOut: 0, qgComp: 0, flareQ: 0, psvQ: 0 },
      comp: { tripped: [false, false], q: 0, power: 0 }, gasUse: { fuel: 0, lift: 0, exp: 0, reinj: 0 },
      power: { diesel: false, demand: 0 },
      wi: { q: 0 }, cargo: 0.55 * CFG.cargo.cap, oiwFoul: 0, wellsQin: { o: 0, w: 0, g: 0 },
      tanker: { st: 'none', t: 0, cargo: 0, emergency: false },
      moor: { heading: 0, offset: 0, offDir: 180, failed: new Array(CFG.moor.lines).fill(false) },
      cum: { oil: 0, gas: 0, water: 0, flare: 0, offloaded: 0 },
    };
    this.d = {}; this.log = []; this.msg = [];
    this.alarm = {}; for (const a of ALARMS) this.alarm[a[0]] = { id: a[0], text: a[1], prio: a[2], delay: a[3], t: 0, active: false, acked: true, t0: 0 };
    this.trend = { n: 0, N: 4320, dt: 60, last: -1e9, t: new Float64Array(4320), ch: {} };
    for (const k of TREND_KEYS) this.trend.ch[k] = new Float32Array(4320);
    this.tStart = 0; this.clock0 = Date.now();
    if (on) { for (let i = 0; i < 1800; i++) this.step(2); this.tStart = this.s.t; this.log = []; for (const a of Object.values(this.alarm)) { a.active = false; a.acked = true; a.t = 0; } }
    else this._sense(1);
  }
  get c_() { return this.c; }
  note(text) { this.msg.push({ t: this.s.t, text }); if (this.msg.length > 30) this.msg.shift(); return { ok: false, msg: text }; }
  clockMs() { return this.clock0 + (this.s.t - this.tStart) * 1000; }

  step(dt) {
    this.s.t += dt;
    this._reservoir(dt); this._subsea(dt); this._separator(dt); this._gas(dt); this._water(dt); this._cargo(dt);
    this._mooring(dt); this._sense(dt); this._alarms(dt); this._record();
  }

  /* ---------- wells: nodal solution for each well at the current manifold pressure ---------- */
  _well(i, Pman) {
    const w = CFG.wells[i], s = this.s.wells[i], c = this.c.wells[i];
    const u = this.c.esd || this.c.psd || !c.open ? 0 : s.ch;
    if (u < 0.5) return { q: 0, Pwf: this.s.Pr + w.dPr, Pwh: 0 };
    const Pr = Math.max(this.s.Pr + w.dPr, 1), wc = s.wc, rhoL = (1 - wc) * CFG.rhoO + wc * CFG.rhoW;
    const liftSm3 = (this.d.liftAvail === undefined ? 1 : this.d.liftAvail) * c.lift * 1e6;
    const Kc = CFG.choke * chokeCv(u), tb = CFG.tub;
    let lo = 0, hi = Pr, q = 0, Pwh = 0;
    for (let it = 0; it < 40; it++) {
      const Pwf = (lo + hi) / 2; q = ipr(w.J, Pr, Pwf, CFG.Pb);
      const glr = (1 - wc) * w.gor + liftSm3 / Math.max(q, 50);
      const rhoM = rhoL / (1 + tb.a * glr);
      Pwh = Pwf - rhoM * G * w.tvd / 1e5 - tb.kf * q * q * (1 + tb.b * glr);
      const qc = Kc * Math.sqrt(Math.max(Pwh - Pman, 0));
      if (q > qc) lo = Pwf; else hi = Pwf;
    }
    return { q, Pwf: (lo + hi) / 2, Pwh };
  }
  _reservoir(dt) {
    const s = this.s;
    // voidage (rm3/d): oil + water + free gas below Pb; replaced by water injection and gas reinjection
    let qo = 0, qw = 0, qg = 0; s.wells.forEach(w => { qo += w.qo; qw += w.qw; qg += w.qg; });
    const Rs = (gor) => gor * Math.min(1, s.Pr / CFG.Pb);
    let free = 0; s.wells.forEach((w, i) => { free += w.qo * Math.max(0, CFG.wells[i].gor - Rs(CFG.wells[i].gor)); });
    const vout = qo * CFG.Bo + qw + free * CFG.Bg, vin = s.wi.q + s.gasUse.reinj * 1e6 * CFG.Bg;
    this.d.vrr = vout > 1 ? vin / vout : 0;
    s.Pr = Math.max(20, s.Pr - (vout - vin) / CFG.ctVp * (dt / DAY) * (this.c.decline || 1));
    // water cut rises with cumulative production (water breakthrough)
    s.wells.forEach((w, i) => { const W = CFG.wells[i]; s.Np[i] += w.qo * dt / DAY; const base = W.wc + (W.wcMax - W.wc) * (1 - Math.exp(-s.Np[i] / W.Nb)); w.wc = Math.max(base, w.wcBoost || 0); });
  }
  _subsea(dt) {
    const s = this.s, c = this.c;
    // choke actuators move at 2 %/s (stepping chokes are slower in reality)
    s.wells.forEach((w, i) => { const tgt = c.esd || c.psd || !c.wells[i].open ? 0 : c.wells[i].choke; w.ch = approach(w.ch, tgt, c.esd || c.psd ? 10 : 2, dt); });
    // fixed point on manifold pressure: wells <-> riser
    let Pman = s.Pman, res = [];
    for (let k = 0; k < 3; k++) {
      res = s.wells.map((w, i) => this._well(i, Pman));
      let qL = 0, qOil = 0, gas = 0, rhoSum = 0;
      res.forEach((r, i) => { const wc = s.wells[i].wc; qL += r.q; qOil += r.q * (1 - wc); gas += r.q * (1 - wc) * CFG.wells[i].gor + (r.q > 1 ? c.wells[i].lift * 1e6 * (this.d.liftAvail ?? 1) : 0); rhoSum += r.q * ((1 - wc) * CFG.rhoO + wc * CFG.rhoW); });
      const rhoL = qL > 1 ? rhoSum / qL : 900, glr = qL > 1 ? gas / qL : 0, R = CFG.riser;
      const Ptarget = s.sep.P + rhoL / (1 + R.a * glr) * G * R.len / 1e5 + R.kr * qL * qL * (1 + 0.004 * glr);
      Pman = Pman + 0.6 * (Ptarget - Pman);
    }
    s.Pman = Pman;
    let qo = 0, qw = 0, qg = 0, qL = 0;
    res.forEach((r, i) => {
      const w = s.wells[i], W = CFG.wells[i], lift = r.q > 1 ? c.wells[i].lift * 1e6 * (this.d.liftAvail ?? 1) : 0;
      w.q = r.q; w.Pwf = r.Pwf; w.Pwh = r.q > 0 ? r.Pwh : Math.max(Pman, s.Pr + W.dPr - ((1 - w.wc) * CFG.rhoO + w.wc * CFG.rhoW) / (1 + CFG.tub.a * (1 - w.wc) * W.gor * 0.3) * G * W.tvd / 1e5);
      w.qo = r.q * (1 - w.wc); w.qw = r.q * w.wc; w.qg = w.qo * W.gor; w.lift = lift;
      qo += w.qo; qw += w.qw; qg += w.qg + lift; qL += r.q;
    });
    // severe slugging at low riser velocity (model indicator): liquid/gas arrive in cycles
    const slugT = qL > 1 ? clamp(1 - qL / 7000, 0, 1) : 0; s.slug = lag(s.slug, slugT, 600, dt); s.slugPh += dt * 2 * PI / 900;
    const sl = 1 + 0.9 * s.slug * Math.sin(s.slugPh), sg = 1 - 0.9 * s.slug * Math.sin(s.slugPh);
    s.wellsQin = { o: qo * sl, w: qw * sl, g: qg * sg, L: qL };
    // arrival temperature and hydrate equilibrium (model fit to a natural-gas hydrate curve)
    const Tflow = 4 + 58 * (1 - Math.exp(-qL / 5000));
    s.Tarr = qL > 50 ? lag(s.Tarr, Tflow, 3600, dt) : lag(s.Tarr, 4, 8 * 3600, dt);
    this.d.Thyd = -14 + 6.95 * Math.log(Math.max(Pman, 2)) - (c.meg ? 14 : 0);
  }
  /* ---------- 3-phase HP separator ---------- */
  _separator(dt) {
    const s = this.s, sp = s.sep, c = this.c, C = CFG.sep;
    const qoIn = s.wellsQin.o / DAY, qwIn = s.wellsQin.w / DAY, qgIn = s.wellsQin.g / DAY;      // m3/s, Sm3/s
    // level controllers (feed-forward + proportional), valves limited to 2.5x nominal
    const LT = (sp.Vo + sp.Vw) / C.Vliq * 100, LI = sp.Vw / C.Vliq * 100;
    let qwOut = clamp(qwIn + 0.0025 * C.Vliq * (LI - c.sep.LIsp) / 100 * 10, 0, 2.5 * 30000 / DAY);
    let qoOut = clamp(qoIn + 0.0025 * C.Vliq * (LT - c.sep.LTsp) / 100 * 10, 0, 2.5 * 25000 / DAY);
    if (c.sep.lcvStuck !== null) qoOut = c.sep.lcvStuck;
    if (c.esd) { qoOut = 0; qwOut = 0; }
    sp.Vo = clamp(sp.Vo + (qoIn - qoOut) * dt, 0, C.Vliq * 1.15); sp.Vw = clamp(sp.Vw + (qwIn - qwOut) * dt, 0, C.Vliq);
    if (sp.Vo <= 0) qoOut = Math.min(qoOut, qoIn); if (sp.Vw <= 0) qwOut = Math.min(qwOut, qwIn);
    sp.LT = (sp.Vo + sp.Vw) / C.Vliq * 100; sp.LI = sp.Vw / C.Vliq * 100; sp.qoOut = qoOut * DAY; sp.qwOut = qwOut * DAY;
    // high-high level trips the wells (PSD)
    if (sp.LT > 95 && !c.psd) this.psd('HP separator level high-high');
    // gas: pressure controller sends gas to the compressors; PCV to flare above Pset + 2 bar; PSV at 24 bar
    const capComp = (c.comp[0] && !s.comp.tripped[0] ? CFG.comp.train : 0) + (c.comp[1] && !s.comp.tripped[1] ? CFG.comp.train : 0);
    const qComp = c.esd ? 0 : clamp(qgIn + 25 * (sp.P - c.sep.Pset), 0, capComp * 1e6 / DAY);
    let qFlare = clamp(8 * (sp.P - c.sep.Pset - C.pcv), 0, 60) + 0.25;            // + purge, Sm3/s
    if (c.esd) qFlare += clamp(6 * (sp.P - 1.5), 0, 120);                        // blowdown
    const psv = sp.P > C.psv ? 40 * (sp.P - C.psv) : 0;
    const Vg = Math.max(C.V - sp.Vo - sp.Vw, 10), T = 273.15 + Math.max(s.Tarr, 20);
    sp.P = Math.max(1.0, sp.P + (qgIn - qComp - qFlare - psv) * PSTD * (T / TSTD) / Vg * dt);
    sp.qgComp = qComp * DAY / 1e6; sp.flareQ = (qFlare + psv) * DAY / 1e6; sp.psvQ = psv * DAY / 1e6;
  }
  /* ---------- gas compression and allocation, power ---------- */
  _gas(dt) {
    const s = this.s, c = this.c, C = CFG.comp, P = CFG.power;
    const Q = s.sep.qgComp;                                       // MSm3/d through the compressors
    // adiabatic power, N equal-ratio stages with intercooling: W = N·k/(k−1)·(R·T1/M)·[(r^(1/N))^((k−1)/k) − 1]/η
    const r = C.Pd / Math.max(s.sep.P, 2), rs = Math.pow(r, 1 / C.stages), e = (C.k - 1) / C.k;
    const wkg = C.stages * (C.k / (C.k - 1)) * (8314 * C.T1 / C.M) * (Math.pow(rs, e) - 1) / C.eta;   // J/kg
    const mdot = Q * 1e6 / DAY * C.rhoStd;
    s.comp.power = Q > 0.01 ? wkg * mdot / 1e6 : 0; s.comp.q = Q;
    const wiPower = s.wi.q / DAY * CFG.wi.dP * 1e5 / CFG.wi.eta / 1e6;
    const demand = P.base + s.comp.power + wiPower + (s.tanker.st === 'offloading' ? 2.5 : 0);
    const fuelNeed = demand * 1e6 / (P.etaGT * P.LHV) * DAY / 1e6;   // MSm3/d
    // priority: fuel gas -> gas lift -> export / reinjection (surplus beyond export capacity is flared via the PCV)
    let left = Q; const fuel = Math.min(fuelNeed, left); left -= fuel;
    const liftReq = c.wells.reduce((a, w, i) => a + (w.open && s.wells[i].ch > 1 ? w.lift : 0), 0);
    const lift = Math.min(liftReq, left); left -= lift;
    this.d.liftAvail = liftReq > 0 ? lift / liftReq : 1;
    const out = Math.min(left, CFG.exportCap); left -= out;
    s.gasUse = { fuel, lift, exp: out * (1 - c.route), reinj: out * c.route, excess: left };
    if (left > 0.01) s.sep.flareQ += left;                         // compressors cannot export it: recycle -> flare
    s.power = { diesel: fuel < fuelNeed - 1e-3, demand, wiPower };
    this.d.powerDemand = demand; this.d.powerAvail = P.gtUnit * P.gts * (c.esd ? 0.3 : 1);
    if (c.esd) { s.wi.q = 0; }
  }
  _water(dt) {
    const s = this.s, c = this.c, W = CFG.pw;
    // seawater injection pumps
    s.wi.q = approach(s.wi.q, c.wi.on && !c.esd ? clamp(c.wi.rate, 0, CFG.wi.cap) : 0, 2000 / 60, dt);
    // hydrocyclones: OIW rises with hydraulic load, interface upsets and fouling (model)
    const load = s.sep.qwOut / W.cap, iface = Math.abs(s.sep.LI - c.sep.LIsp) / 30;
    this.d.oiwRaw = W.base + 22 * load * load + 25 * iface * iface + 60 * s.oiwFoul;
    if (c.cleanCyclones) { s.oiwFoul = Math.max(0, s.oiwFoul - dt / 1800); }
  }
  _cargo(dt) {
    const s = this.s, c = this.c, T = CFG.tanker, tk = s.tanker;
    // crude to cargo tanks (stabilised stock-tank oil)
    s.cargo = Math.min(CFG.cargo.cap, s.cargo + s.sep.qoOut * dt / DAY);
    if (s.cargo >= 0.995 * CFG.cargo.cap && !c.psd) this.psd('Cargo tanks full');
    // shuttle tanker sequence
    tk.emergency = false;
    if (tk.st === 'none' && c.tankerReq) { tk.st = 'approaching'; tk.t = 0; this._log('TANKER', 'Shuttle tanker approaching', 3, 'EVENT'); }
    tk.t += dt;
    const hs = c.env.hs;
    if (tk.st === 'approaching' && tk.t > T.approach) { tk.st = 'hookup'; tk.t = 0; }
    if (tk.st === 'hookup') { if (hs > T.hsLimit) tk.t = Math.min(tk.t, 0); else if (tk.t > T.hookup) { tk.st = 'offloading'; tk.t = 0; this._log('TANKER', 'Hawser and hose connected — offloading', 3, 'EVENT'); } }
    if (tk.st === 'offloading') {
      const minC = CFG.cargo.min * CFG.cargo.cap;
      if (hs > T.hsLimit + 0.5 || c.esd) { tk.emergency = true; tk.st = 'disconnect'; tk.t = 0; this._log('TANKER', 'Emergency disconnect (weather / ESD)', 1, 'EVENT'); }
      else {
        const q = Math.min(c.offRate * dt / 3600, s.cargo - minC, T.cap - tk.cargo);
        if (q > 0) { s.cargo -= q; tk.cargo += q; s.cum.offloaded += q; }
        if (tk.cargo >= T.cap - 1 || s.cargo <= minC + 1 || !c.tankerReq) { tk.st = 'disconnect'; tk.t = 0; this._log('TANKER', 'Offloading complete — ' + tk.cargo.toFixed(0) + ' m3', 3, 'EVENT'); }
      }
    }
    if (tk.st === 'disconnect' && tk.t > T.disconnect) { tk.st = 'departing'; tk.t = 0; c.tankerReq = false; }
    if (tk.st === 'departing' && tk.t > T.depart) { tk.st = 'none'; tk.t = 0; tk.cargo = 0; }
    s.cum.oil += s.sep.qoOut * dt / DAY; s.cum.water += s.sep.qwOut * dt / DAY; s.cum.gas += s.comp.q * dt / DAY; s.cum.flare += s.sep.flareQ * dt / DAY;
  }
  /* ---------- turret mooring: weathervaning, mean offset and line tensions (quasi-static) ---------- */
  envForces(heading) {
    const e = this.c.env, M = CFG.moor; let fx = 0, fy = 0;
    const add = (fromDeg, mag) => { const to = rad(fromDeg + 180); fx += mag * Math.cos(to); fy += mag * Math.sin(to); };
    const proj = (fromDeg, Af, As) => { const a = rad(fromDeg - heading); return Af * Math.abs(Math.cos(a)) + As * Math.abs(Math.sin(a)); };
    add(e.windDir, 0.5 * 1.225 * M.Cdw * proj(e.windDir, M.Af, M.As) * e.wind * e.wind / 1000);
    add(e.curDir, 0.5 * CFG.rhoSW * M.Ccur * proj(e.curDir, M.AcF, M.AcS) * e.cur * e.cur / 1000);
    const wa = rad(e.waveDir - heading); add(e.waveDir, M.cw * e.hs * e.hs * (1 + 2.5 * Math.abs(Math.sin(wa))) * 10);
    return { fx, fy, F: Math.hypot(fx, fy), dir: Math.atan2(fy, fx) * 180 / PI };   // dir: direction the force acts towards
  }
  lineAz(j) { return Math.floor(j / 3) * 120 + (j % 3 - 1) * 5 + 30; }
  _mooring(dt) {
    const m = this.s.moor, M = CFG.moor;
    const f = this.envForces(m.heading);
    // bow turns to face the resultant: equilibrium heading = direction the force comes from
    const hEq = f.dir + 180; m.heading = (m.heading + clamp(wrap(hEq - m.heading), -180, 180) * (1 - Math.exp(-dt / 600)) + 360) % 360;
    let K = 0; for (let j = 0; j < M.lines; j++) if (!m.failed[j]) K += M.kl * Math.cos(rad(this.lineAz(j) - f.dir)) ** 2;
    const target = f.F / Math.max(K, 1);
    m.offset = lag(m.offset, target, 120, dt); m.offDir = f.dir; m.F = f.F;
    // mean tension from the offset, plus a wave-frequency dynamic part on the loaded (upstream) lines
    const hs = this.c.env.hs; m.T = [];
    for (let j = 0; j < M.lines; j++) { const cs = Math.cos(rad(this.lineAz(j) - m.offDir)); m.T.push(m.failed[j] ? 0 : Math.max(0.3 * M.T0, M.T0 - M.kl * m.offset * cs + M.dyn * hs * hs * Math.max(0, -cs))); }
  }
  /* ---------- sensors ---------- */
  _sense(dt) {
    const s = this.s, d = this.d, n = () => this.gauss();
    const set = (k, v, noise, tau) => { const x = v + noise * n(); d[k] = d[k] === undefined || tau <= 0 ? x : lag(d[k], x, tau, Math.min(dt, tau)); };
    const qo = s.sep.qoOut, qw = s.sep.qwOut;
    set('qo', qo, qo > 10 ? qo * 0.003 : 0, 30); set('qw', qw, qw > 10 ? qw * 0.003 : 0, 30); set('qL', s.wellsQin.L, 0, 30);
    set('qg', s.wellsQin.g / 1e6, 0.003, 30); set('psep', s.sep.P, 0.03, 2); set('pman', s.Pman, 0.1, 5);
    set('flare', s.sep.flareQ, 0.002, 20); set('cargo', s.cargo, 0, 0); set('pr', s.Pr, 0, 0);
    d.Pman = s.Pman; d.Tarr = s.Tarr; d.wc = s.wellsQin.L > 1 ? s.wellsQin.w / Math.max(s.wellsQin.o + s.wellsQin.w, 1) : 0;
    d.gor = s.wellsQin.o > 1 ? (s.wellsQin.g - s.wells.reduce((a, w) => a + (w.lift || 0), 0)) / Math.max(s.wellsQin.o, 1) : 0;
    set('oiw', this.d.oiwRaw || 0, 0.6, 60);
    d.bsw = 0.12 + 0.9 * Math.max(0, d.wc - 0.45) + 1.4 * (Math.abs(s.sep.LI - this.c.sep.LIsp) / 30) ** 2 + (s.slug > 0.3 ? 0.3 * s.slug : 0);
    d.offset = s.moor.offset; d.Tmax = Math.max(...(s.moor.T || [0])); d.power = s.power.demand;
    d.draft = CFG.cargo.lightDraft + s.cargo * CFG.rhoO / (CFG.cargo.wpa * CFG.rhoSW);
    d.daysFull = qo > 1 ? (CFG.cargo.cap - s.cargo) / qo : Infinity;
  }
  _alarms(dt) {
    for (const def of ALARMS) {
      const a = this.alarm[def[0]]; let cond = false;
      try { cond = !!def[4](this); } catch (e) { cond = false; }
      if (cond) { a.t += dt; if (!a.active && a.t >= a.delay) { a.active = true; a.acked = false; a.t0 = this.s.t; this._log(a.id, a.text, a.prio, 'ALARM'); } }
      else { a.t = 0; if (a.active) { a.active = false; this._log(a.id, a.text, a.prio, 'CLEAR'); } }
    }
  }
  _log(id, text, prio, type) { this.log.unshift({ t: this.s.t, id, text, prio, type }); if (this.log.length > 200) this.log.pop(); }
  ack(id) { for (const a of Object.values(this.alarm)) if (!id || a.id === id) a.acked = true; }
  alarmList() { return Object.values(this.alarm).filter(a => a.active || !a.acked).sort((x, y) => x.prio - y.prio || (y.t0 - x.t0)); }
  _record() {
    const T = this.trend; if (this.s.t - T.last < T.dt) return; T.last = this.s.t;
    const i = T.n % T.N; T.t[i] = this.s.t; for (const k of TREND_KEYS) T.ch[k][i] = this.d[k] === undefined ? 0 : this.d[k]; T.n++;
  }

  /* ---------- operator commands ---------- */
  esd() { this.c.esd = true; this._log('ESD', 'ESD activated — wells shut in, blowdown to flare', 1, 'EVENT'); }
  resetEsd() { this.c.esd = false; this._log('ESD', 'ESD reset', 3, 'EVENT'); }
  psd(why) { this.c.psd = true; this._log('PSD', 'Process shutdown: ' + why, 1, 'EVENT'); }
  resetPsd() { if (this.s.sep.LT > 92) return this.note('Lower the separator level before resetting PSD'); if (this.s.cargo > 0.99 * CFG.cargo.cap) return this.note('Cargo tanks full — offload first'); this.c.psd = false; this._log('PSD', 'PSD reset — open wells gradually', 3, 'EVENT'); return { ok: true }; }
  restartComp(i) { if (this.s.comp.tripped[i]) { this.s.comp.tripped[i] = false; this._log('COMP', 'Compressor train ' + (i ? 'B' : 'A') + ' restarted', 3, 'EVENT'); } this.c.comp[i] = true; }
  callTanker() { if (this.s.tanker.st !== 'none') return this.note('A tanker is already in the offloading sequence'); this.c.tankerReq = true; return { ok: true }; }
  stopOffload() { this.c.tankerReq = false; }
  scenario(name) {
    const s = this.s, c = this.c;
    switch (name) {
      case 'comptrip': s.comp.tripped[0] = true; break;
      case 'water3': s.wells[2].wcBoost = 0.55; break;
      case 'line': s.moor.failed[1] = true; break;
      case 'storm': Object.assign(c.env, { wind: 28, hs: 6.5, cur: 1.0 }); break;
      case 'foul': s.oiwFoul = 1; c.cleanCyclones = false; break;
      case 'lcv': c.sep.lcvStuck = s.sep.qoOut / DAY * 0.6; break;
      case 'decline': c.decline = 200; break;
      case 'clear':
        s.comp.tripped = [false, false]; s.wells.forEach(w => { w.wcBoost = 0; }); s.moor.failed.fill(false); s.oiwFoul = 0;
        c.sep.lcvStuck = null; c.decline = 1; Object.assign(c.env, { wind: 12, hs: 2.0, cur: 0.5 }); break;
    }
    this._log('SCENARIO', 'Instructor: ' + name, 3, 'EVENT');
  }
}
const TREND_KEYS = ['qo', 'qw', 'qg', 'psep', 'pman', 'flare', 'cargo', 'pr', 'offset', 'power', 'oiw'];
const api = { FpsoSim, CFG, ALARMS, TREND_KEYS, ipr };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FPSO = api;
})(typeof window !== 'undefined' ? window : globalThis);

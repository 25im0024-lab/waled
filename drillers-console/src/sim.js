/* Driller's Console — physics core (no DOM). Runs in the browser (window.RigSim) and in Node (module.exports).
   Coupled models: drawworks/string elasticity -> WOB, ROP (bit/formation), top-drive dynamics, triplex pumps,
   Bingham/turbulent hydraulics, mud transport (parcel FIFO), BHP/ECD, influx/losses, gas-kick migration/expansion,
   BOP/choke/accumulator, auto-driller (cascade PI), connection sequencer, alarms (ISA-18.2 style), trends. */
(function (root) {
'use strict';
const G = 9.80665, BAR = 1e5, PI = Math.PI;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const approach = (c, t, r, dt) => { const d = t - c, m = r * dt; return Math.abs(d) <= m ? t : c + Math.sign(d) * m; };
const lag = (c, t, tau, dt) => c + (t - c) * (1 - Math.exp(-dt / tau));

const CFG = {
  rigId: 'RIG-03', well: 'Well-12A',
  holeD: 0.3112, bitIn: 12.25, shoe: 2000,
  dp: { od: 0.1397, id: 0.1214, kgm: 32.6 },          // 5-1/2" 21.9 ppf drill pipe
  bha: { len: 200, kgm: 180 },
  standLen: 28.5, tdOff: 5.0, blockW: 343,            // block + top drive weight, kN
  minBlockH: 6.2, standEndH: 6.9, crownStop: 42.5, maxBlockH: 44.5,
  EA: 7.0e8, wobFound: 300, mu: 0.62,
  tfa: 5.82e-4, cd: 0.95,                              // 6 x 14/32" nozzles
  pump: { stroke: 0.3048, maxSpm: 130, eff: 0.95, kw: 746, rating: { 5: 345, 5.5: 345, 6: 310, 6.5: 262 } },
  dw: { kw: 1119, lines: 10, drumD: 0.9, vmax: 1.0, accel: 0.4, hlRated: 2200 },
  td: { J: 1.5, maxTq: 35, aMax: 4 },
  bopRating: 345, accumNom: 207, tripTank: 20, pitNom: 520,
  surfVol: 4,                                          // surface lines: pump -> standpipe -> hose -> top drive, m3
  cut: { d: 0.25, rho: 2.6 },                          // cuttings: equivalent diameter (in), density (sg)
};

/* lithology column (vertical well, MD = TVD). pp/fg as equivalent mud weight (sg), linear within each layer */
const FORM_HAZ = [
  { n: 'Clay / Silt', top: 0, bot: 800, kf: 6.0e-3, abr: .3, pp: [1.00, 1.03], fg: [1.45, 1.68], col: '#7d6b4c' },
  { n: 'Sand / Shale', top: 800, bot: 1500, kf: 5.0e-3, abr: .5, pp: [1.03, 1.05], fg: [1.68, 1.74], col: '#8b7753' },
  { n: 'Claystone', top: 1500, bot: 2000, kf: 4.5e-3, abr: .4, pp: [1.05, 1.06], fg: [1.74, 1.78], col: '#6f624c' },
  { n: 'Shale', top: 2000, bot: 2600, kf: 4.0e-3, abr: .5, pp: [1.06, 1.08], fg: [1.78, 1.82], col: '#5e5b52' },
  { n: 'Silty sandstone', top: 2600, bot: 3140, kf: 3.4e-3, abr: .7, pp: [1.08, 1.10], fg: [1.82, 1.87], col: '#86775a' },
  { n: 'Limestone stringer', top: 3140, bot: 3152, kf: .9e-3, abr: 1.2, pp: [1.10, 1.10], fg: [1.88, 1.88], col: '#a9b3ba' },
  { n: 'Shale (transition)', top: 3152, bot: 3215, kf: 3.6e-3, abr: .6, pp: [1.12, 1.22], fg: [1.88, 1.90], col: '#55514a' },
  { n: 'Gas sand', top: 3215, bot: 3250, kf: 3.0e-3, abr: 1.0, pp: [1.30, 1.30], fg: [1.90, 1.90], col: '#c9a443', gas: { pi: 14 }, prog: 1.24 },
  { n: 'Shale', top: 3250, bot: 3480, kf: 3.4e-3, abr: .6, pp: [1.28, 1.28], fg: [1.90, 1.92], col: '#55514a' },
  { n: 'Vugular limestone', top: 3480, bot: 3495, kf: 1.6e-3, abr: 1.0, pp: [1.05, 1.05], fg: [1.55, 1.55], col: '#9aa6ae', loss: { k: 3.5 }, prog: 1.28 },
  { n: 'Sandstone / Shale', top: 3495, bot: 6000, kf: 3.0e-3, abr: .8, pp: [1.28, 1.32], fg: [1.92, 2.05], col: '#86775a' },
];
const FORM_SAFE = FORM_HAZ.map(f => {
  const g = Object.assign({}, f); delete g.gas; delete g.loss; delete g.prog;
  if (f.top >= 3140) { g.pp = [1.10, 1.12]; g.fg = [1.88, 1.95]; }
  if (f.n === 'Limestone stringer') g.kf = 2.4e-3;
  if (f.n === 'Gas sand') { g.n = 'Sandstone'; }
  if (f.n === 'Vugular limestone') { g.n = 'Limestone'; g.fg = [1.92, 1.92]; }
  return g;
});
function formations(haz) { return haz ? FORM_HAZ : FORM_SAFE; }
function formAt(z, haz) { const L = formations(haz); for (const f of L) if (z < f.bot) return f; return L[L.length - 1]; }
function interp(f, key, z) { const a = f[key]; const u = clamp((z - f.top) / (f.bot - f.top), 0, 1); return a[0] + (a[1] - a[0]) * u; }
function ppAt(z, haz) { return interp(formAt(z, haz), 'pp', z); }
function fgAt(z, haz) { return interp(formAt(z, haz), 'fg', z); }
function ppProg(z, haz) { const f = formAt(z, haz); return f.prog || interp(f, 'pp', z); }

function fricDP(Q, Dh, A, L, rho, pv, yp) { // Pa — Bingham effective viscosity, max(laminar, Blasius)
  if (Q <= 1e-7 || L <= 0) return 0;
  const v = Q / A, mu = pv + yp * Dh / (6 * v), Re = rho * v * Dh / mu;
  const f = Math.max(64 / Re, 0.316 / Math.pow(Re, 0.25));
  return f * (L / Dh) * rho * v * v / 2;
}

class Fifo { // plug-flow mud column made of (volume, density) parcels; a[0] = exit end
  constructor() { this.a = []; this.vol = 0; }
  push(v, r) { if (v <= 0) return; const l = this.a[this.a.length - 1]; if (l && Math.abs(l.r - r) < 0.0015) l.v += v; else this.a.push({ v, r }); this.vol += v; }
  pop(v) { let m = 0, out = 0; while (v > 1e-12 && this.a.length) { const p = this.a[0], t = Math.min(p.v, v); m += t * p.r; out += t; p.v -= t; v -= t; this.vol -= t; if (p.v <= 1e-12) this.a.shift(); } return out > 0 ? m / out : null; }
  avg() { let m = 0; for (const p of this.a) m += p.v * p.r; return this.vol > 0 ? m / this.vol : 1.2; }
  fit(cap, atExit) { // grow/shrink to capacity
    const d = cap - this.vol;
    if (d > 1e-6) { const ref = atExit ? (this.a[0] || { r: 1.2 }) : (this.a[this.a.length - 1] || { r: 1.2 }); if (atExit) this.a.unshift({ v: d, r: ref.r }); else this.a.push({ v: d, r: ref.r }); this.vol += d; }
    else if (d < -1e-6) { if (atExit) this.pop(-d); else { let v = -d; while (v > 1e-12 && this.a.length) { const p = this.a[this.a.length - 1], t = Math.min(p.v, v); p.v -= t; v -= t; this.vol -= t; if (p.v <= 1e-12) this.a.pop(); } } }
  }
}

const DEF_TH = { sppHi: 275, sppLoPct: 0.85, hlHi: 1800, overpull: 400, flowDev: 150, flowPct: 4, flowCheck: 60, pitGain: 2.0, pitLoss: 3.0, pcHiPct: 80, accumLo: 186, gasHi: 150, blockSpeedHi: 60, tdTempHi: 105 };

const ALARMS = [
  // id, text, priority(1 crit, 2 high, 3 advisory), on-delay s, test
  ['ESD', 'EMERGENCY SHUTDOWN ACTIVE', 1, 0, m => m.c.esd],
  ['ESTOP', 'DRILLER E-STOP ACTIVE', 1, 0, m => m.c.estop],
  ['BLOW', 'WELL CONTROL LOST — WELLHEAD PRESSURE EXCEEDED', 1, 0, m => m.s.bop.failed],
  ['KICK', 'FLOW OUT > FLOW IN — POSSIBLE KICK', 1, 8, m => m.pumpsOn() && !m.sealed() && m.d.qout - m.d.qinExp > Math.max(m.th.flowDev, m.d.qin * m.th.flowPct / 100)],
  ['FLOWING', 'WELL FLOWING WITH PUMPS OFF', 1, 10, m => !m.pumpsOn() && !m.sealed() && m.d.qout - m.d.qinExp > m.th.flowCheck],
  ['PITGAIN', 'PIT GAIN', 1, 5, m => m.d.pitDelta > m.th.pitGain],
  ['HPC', 'HIGH CASING PRESSURE (> % MAASP)', 1, 3, m => m.d.pc > 5 && m.d.pc > m.th.pcHiPct / 100 * m.d.maasp],
  ['CROWN', 'CROWN-O-MATIC — BLOCK AT UPPER LIMIT', 1, 0, m => m.s.blockH >= CFG.crownStop - 0.05],
  ['HSPP', 'HIGH STANDPIPE PRESSURE', 2, 2, m => m.d.spp > m.th.sppHi],
  ['LSPP', 'LOW STANDPIPE PRESSURE — POSSIBLE WASHOUT', 2, 15, m => m.pumpsOn() && !m.sealed() && m.d.sppExp > 30 && m.d.spp < m.th.sppLoPct * m.d.sppExp],
  ['HTQ', 'HIGH TORQUE', 2, 2, m => m.d.torque > m.c.ad.torqueLimit],
  ['STALL', 'TOP DRIVE STALLED', 1, 1, m => m.s.tdStall],
  ['HHL', 'HIGH HOOK LOAD', 2, 2, m => m.d.hl > m.th.hlHi],
  ['OVERPULL', 'OVERPULL — EXCESS DRAG', 2, 2, m => m.d.overpull > m.th.overpull],
  ['HWOB', 'HIGH WOB', 2, 3, m => m.d.wob > m.c.ad.wobLimit],
  ['HRPM', 'HIGH RPM', 2, 2, m => m.d.rpm > m.c.ad.rpmLimit + 2],
  ['LOWFLOW', 'LOW MUD FLOW — FLOW OUT < FLOW IN', 3, 8, m => m.pumpsOn() && !m.sealed() && m.d.qinExp - m.d.qout > Math.max(m.th.flowDev, m.d.qin * m.th.flowPct / 100)],
  ['PITLOSS', 'PIT LOSS', 2, 5, m => m.d.pitDelta < -m.th.pitLoss],
  ['GAS', 'HIGH GAS', 2, 3, m => m.d.gas > m.th.gasHi],
  ['ACCUM', 'LOW ACCUMULATOR PRESSURE', 2, 3, m => m.s.bop.accum < m.th.accumLo],
  ['BSPD', 'HIGH BLOCK SPEED', 2, 1, m => Math.abs(m.d.blockV) > m.th.blockSpeedHi],
  ['TDTEMP', 'TOP DRIVE MOTOR HIGH TEMPERATURE', 2, 3, m => m.s.tdTemp > m.th.tdTempHi],
  ['PRELIEF', 'MUD PUMP RELIEF / TRIP', 2, 0, m => m.s.pumps.some(p => p.relief)],
  ['PFAULT', 'MUD PUMP FAULT — LOW VOLUMETRIC EFFICIENCY', 3, 5, m => m.s.pumps.some((p, i) => p.effLoss > 0.1 && p.spm > 5)],
  ['CONN', 'STAND DRILLED DOWN — CONNECTION REQUIRED', 3, 2, m => m.s.connected && !m.s.inSlips && m.s.blockH <= CFG.standEndH + 0.05 && !m.m.active],
  ['BIT', 'BIT WORN — CONSIDER TRIP', 3, 0, m => m.s.wear > 0.85],
  ['ROTBOP', 'ROTATING / MOVING WITH BOP CLOSED', 2, 2, m => m.sealed() && (m.s.rpm > 5 || Math.abs(m.s.vUp) > 0.02)],
  ['HOLECLEAN', 'POOR HOLE CLEANING — HIGH CUTTINGS LOAD', 3, 30, m => m.s.circ.Ca > 0.05 || (m.s.rop > 2 && m.pumpsOn() && m.s.circ.Ft < 0.5)],
];

class RigSim {
  constructor(opts) { opts = opts || {}; this.seed = opts.seed || 20261005; this.th = Object.assign({}, DEF_TH); this.haz = opts.haz !== false; this.reset(opts.hot !== false); }

  rnd() { this.rs = (this.rs * 1664525 + 1013904223) >>> 0; return this.rs / 4294967296; }
  gauss() { return (this.rnd() + this.rnd() + this.rnd() - 1.5) * 2; }

  reset(hot) {
    this.rs = this.seed;
    const on = !!hot;
    this.c = {
      td: { dir: on ? 'FWD' : 'OFF', mode: 'DRILL', rpmSet: 120, torqueSet: 10 },
      dw: { jog: 0, jogSpeed: 15, blockAuto: 0, brakeMode: 'AUTO', brakeSet: true },
      pumps: [0, 1, 2].map(() => ({ on: on, spm: 95, liner: 5.5 })),
      ad: { on: on, mode: 'WOB', wobSet: 120, ropTarget: 25, ropCap: true, wobLimit: 200, torqueLimit: 18, rpmLimit: 180, kp: 0.03, ki: 0.0015 },
      bop: { annular: 'OPEN', pipe: 'OPEN', shear: 'OPEN', shearArmed: false, hcr: 'CLOSED', kill: 'CLOSED', choke: 0, chokeAuto: false, chokeTarget: 0 },
      mud: { mwSet: 1.20, mixing: true, holeFill: true },
      autoConnect: true, power: true, estop: false, esd: false,
    };
    const Dh = on ? 3115.0 : 3125.4;
    this.s = {
      t: 0, Dh, zFree: on ? Dh + 0.5 : Dh - 0.5, blockH: on ? 28.6 : 18.0, vUp: 0, brake: 'SET', brakeHold: 0,
      connected: true, inSlips: false, standOnTD: false, slipRef: 0, racked: 0, stands: 0, op: null,
      wob: 0, rop: 0, w: on ? 12.57 : 0, rpm: on ? 120 : 0, tdTorque: 0, rotTorque: 0, tdStall: false, tdTemp: on ? 62 : 35,
      wear: 0.12, bitHours: 31.5, hl: 0, wBuoy: 0, overpull: 0,
      pumps: [0, 1, 2].map(() => ({ spm: on ? 95 : 0, q: 0, p: 0, load: 0, relief: false, effLoss: 0, strokes: 0 })),
      qin: 0, qout: 0, qoutLag: 0, pit: CFG.pitNom, pitRef: CFG.pitNom, tripTank: CFG.tripTank, pitRho: 1.20, retRho: 1.20,
      Pc: 0, bhp: 0, dpAnn: 0, gasDef: 0, swab: 0, levelDrop: 0, cutRho: 0, rhoA: 1.2, rhoP: 1.2,
      spp: 0, sppClean: 0, dpBit: 0, qInfl: 0, qLoss: 0, qExp: 0, ecd: 1.2, overbal: 0, mse: 0, dxc: 0, hsi: 0, gasU: 8,
      gas: { m: 0, zb: 0, h: 0, V: 0, Pm: 1, surf: false },
      bop: { annular: 0, pipe: 0, shear: 0, hcr: 0, kill: 0, accum: CFG.accumNom, failed: false, overT: 0 },
      choke: 0, sheared: false,
      fault: { kick: null, lossK: 0, lcm: 1, packTarget: 0, pack: 0, washTarget: 0, wash: 0, plug: 0, tdCool: false, accumLeak: false, wearX: 1 },
      pitIntegral: 0, kickVol: 0, shutin: null, scr: null,
      circ: { vp: 0, va: 0, vn: 0, vs: 0, mua: 0, nre: 0, Ft: 0, Ca: 0, disp: 0, volPipe: 0, volAnn: 0, stkBit: 0, stkBU: 0, tBit: 0, tBU: 0, tCut: 0, genT: 0, genV: 0, shaker: 0, cutVol: 0, lagDepth: null, lagForm: '' },
      tracer: null, bu: null,
    };
    this.cut = []; this.cutId = 0;
    this.pipe = new Fifo(); this.ann = new Fifo();
    this.pipe.push(this.Ap() * Dh + CFG.surfVol, 1.20); this.ann.push(this.Aann() * Dh, 1.20);
    this.m = { active: false, step: 0, t: 0, msg: '', v: null, saved: null };
    this.ad = { state: 'OFF', iu: 0.005, capWob: this.c.ad.wobLimit, sp: 0, pv: 0, out: 0 };
    this.d = {};
    this.alarm = {}; for (const a of ALARMS) this.alarm[a[0]] = { id: a[0], text: a[1], prio: a[2], delay: a[3], t: 0, active: false, acked: true, t0: 0 };
    this.log = [];
    this.trend = { n: 0, N: 4320, dt: 5, last: -1e9, t: new Float64Array(4320), ch: {} };
    for (const k of TREND_KEYS) this.trend.ch[k] = new Float32Array(4320);
    this.msg = [];
    this.tStart = 0; this.clock0 = Date.now();
    if (on) { for (let i = 0; i < 3600; i++) { this.step(0.5); if (i === 240) { this.trend.n = 0; this.trend.last = -1e9; } } this._seedCuttings(); this.tStart = this.s.t; this.s.pitRef = this.s.pit; this.d.pitDelta = 0; this.d.pit = this.s.pit; for (const a of Object.values(this.alarm)) { a.active = false; a.acked = true; a.t = 0; } this.log = []; }
    else this._sense(1);
  }

  /* ---------- geometry ---------- */
  Ap() { return PI / 4 * CFG.dp.id ** 2; }
  Aann() { return PI / 4 * (CFG.holeD ** 2 - CFG.dp.od ** 2); }
  bitDepth() { return Math.min(this.s.zFree, this.s.Dh); }
  onBottom() { const s = this.s; return s.connected && !s.inSlips && s.zFree >= s.Dh - 1e-3; }
  pumpsOn() { return this.s.qin * 60000 > 200; }
  sealed() { const b = this.s.bop; return !b.failed && (b.annular > 0.95 || b.pipe > 0.95 || b.shear > 0.95); }
  chokePath() { return this.sealed() && this.s.bop.hcr > 0.9 && this.s.choke > 0.004; }
  powerOK() { return this.c.power && !this.c.estop && !this.c.esd; }
  saverElev() { return this.s.blockH - CFG.tdOff; }
  jointAtFloor() { const L = CFG.standLen, x = ((this.saverElev() - 1.5) % L + L) % L; return Math.min(x, L - x) <= 1.4; }
  clockMs() { return this.clock0 + (this.s.t - this.tStart) * 1000; }
  note(text) { this.msg.push({ t: this.s.t, text }); if (this.msg.length > 30) this.msg.shift(); return { ok: false, msg: text }; }

  /* ---------- main step ---------- */
  step(dt) {
    const s = this.s; s.t += dt;
    this._ops(dt); this._macro(dt); this._faults(dt); this._bopUpdate(dt); this._pumps(dt); this._mud(dt);
    this._drawworks(dt); this._topdrive(dt); this._bit(dt); this._well(dt); this._hydraulics(dt);
    this._circ(dt); this._sense(dt); this._alarms(dt); this._record();
  }

  /* ---------- rig-floor operations (timed) ---------- */
  _ops(dt) {
    const op = this.s.op; if (!op) return;
    op.t += dt; if (op.t >= op.dur) { this.s.op = null; op.fn(); }
  }
  _startOp(name, dur, fn) { if (this.s.op) return this.note('Another floor operation is in progress'); this.s.op = { name, t: 0, dur, fn }; return { ok: true }; }
  setSlips() {
    const s = this.s;
    if (s.inSlips) return this.note('Slips already set');
    if (!s.connected) return this.note('String not on the top drive');
    if (Math.abs(s.vUp) > 0.03) return this.note('Stop the block before setting slips');
    if (s.wob > 2 || this.onBottom()) return this.note('Pick up off bottom before setting slips');
    if (!this.jointAtFloor()) return this.note('No tool joint at slip height — position the block (saver sub 1.5 m above floor ± stand length)');
    return this._startOp('SET SLIPS', 4, () => { s.inSlips = true; s.slipRef = s.blockH; });
  }
  pullSlips() {
    const s = this.s;
    if (!s.inSlips) return this.note('Slips are not set');
    if (!s.connected) return this.note('Make up the top drive to the string first');
    if (this._slipF() < 0.97 * s.wBuoy) return this.note('Take string weight on the hook before pulling slips');
    return this._startOp('PULL SLIPS', 3, () => { s.inSlips = false; });
  }
  breakOut() {
    const s = this.s;
    if (!s.inSlips || !s.connected) return this.note('Break-out needs the string in slips and connected');
    if (s.rpm > 2) return this.note('Stop top drive rotation first');
    if (s.qin * 60000 > 50) return this.note('Stop the mud pumps first');
    return this._startOp('BREAK OUT', 8, () => { s.connected = false; s.standOnTD = this.saverElev() > 3; });
  }
  pickStand() {
    const s = this.s, need = CFG.tdOff + 1.5 + CFG.standLen;
    if (s.connected || s.standOnTD) return this.note('Top drive must be empty and disconnected');
    if (s.blockH < need - 1.5) return this.note('Raise the block to the racking board (≥ ' + (need - 1.5).toFixed(1) + ' m)');
    return this._startOp('PICK UP STAND', 6, () => { s.standOnTD = true; if (s.racked > 0) s.racked--; });
  }
  rackStand() {
    const s = this.s;
    if (!s.standOnTD || s.connected) return this.note('No free stand on the top drive');
    return this._startOp('RACK BACK STAND', 6, () => { s.standOnTD = false; s.racked++; });
  }
  makeUp() {
    const s = this.s;
    if (s.connected) return this.note('Already connected');
    if (!s.inSlips) return this.note('String must be in slips');
    const tgt = s.standOnTD ? CFG.tdOff + 1.5 + CFG.standLen : CFG.tdOff + 1.5;
    if (Math.abs(s.blockH - tgt) > 1.2) return this.note('Position block at ' + tgt.toFixed(1) + ' m to stab');
    return this._startOp('SPIN-IN & TORQUE UP', 14, () => { if (s.standOnTD) s.stands++; s.connected = true; s.standOnTD = false; s.slipRef = s.blockH; });
  }

  /* ---------- automatic connection ---------- */
  startConnection() {
    const s = this.s;
    if (this.m.active) return this.note('Connection already running');
    if (!s.connected || s.inSlips) return this.note('String must be connected and out of slips');
    if (this.saverElev() > 3.2) return this.note('Drill the stand down first (saver sub ≤ 3 m above floor)');
    this.m = { active: true, step: 0, t: 0, msg: '', v: null, saved: { pumps: this.c.pumps.map(p => ({ on: p.on, spm: p.spm })), dir: this.c.td.dir === 'OFF' ? 'FWD' : this.c.td.dir, mode: this.c.td.mode } };
    this._log('CONNECTION', 'Auto connection started', 3, 'EVENT');
    return { ok: true };
  }
  abortConnection() { if (!this.m.active) return; this.m.active = false; this.m.v = null; this._log('CONNECTION', 'Auto connection aborted at step ' + (this.m.step + 1), 3, 'EVENT'); }
  _macro(dt) {
    const M = this.m; if (!M.active) return;
    if (!this.powerOK()) { this.abortConnection(); return; }
    const st = CONN_STEPS[M.step]; M.t += dt; M.msg = st.n;
    let done = false;
    try { done = st.run(this, M); } catch (e) { done = false; }
    if (done) { M.step++; M.t = 0; M.v = null; if (M.step >= CONN_STEPS.length) { M.active = false; this.ad.state = 'SEEK'; this._log('CONNECTION', 'Connection complete — stand #' + this.s.stands, 3, 'EVENT'); } }
    else if (M.t > st.to) { this.abortConnection(); this.note('Connection step timed out: ' + st.n); }
  }

  /* ---------- faults / scenarios ---------- */
  scenario(name) {
    const f = this.s.fault;
    switch (name) {
      case 'kick': f.kick = { dpp: 60, pi: 18 }; break;
      case 'loss': f.lossK = 6; f.lcm = 1; break;
      case 'packoff': f.packTarget = 0.85; break;
      case 'washout': f.washTarget = 0.6; break;
      case 'plug': f.plug = 0.35; break;
      case 'pump2': this.s.pumps[1].effLoss = 0.4; break;
      case 'tdcool': f.tdCool = true; break;
      case 'accum': f.accumLeak = true; break;
      case 'wear': f.wearX = 40; break;
      case 'clear':
        Object.assign(f, { kick: null, lossK: 0, lcm: 1, packTarget: 0, washTarget: 0, plug: 0, tdCool: false, accumLeak: false, wearX: 1 });
        this.s.pumps.forEach(p => { p.effLoss = 0; p.relief = false; }); break;
    }
    this._log('SCENARIO', 'Instructor: ' + name, 3, 'EVENT');
  }
  pumpLCM() { const f = this.s.fault; f.lcm = Math.max(0.05, f.lcm * 0.45); this._log('MUD', 'LCM pill pumped (8 m³)', 3, 'EVENT'); }
  _faults(dt) {
    const s = this.s, f = s.fault;
    const working = Math.abs(s.vUp) > 0.03 && s.connected && !s.inSlips;
    if (working) f.packTarget = Math.max(0, f.packTarget - 0.006 * dt);
    if (s.qin * 60000 < 2000) f.packTarget = Math.max(0, f.packTarget - 0.002 * dt);
    f.pack = lag(f.pack, f.packTarget, 40, dt);
    f.wash = lag(f.wash, f.washTarget, 90, dt);
    if (f.accumLeak) s.bop.accum = Math.max(0, s.bop.accum - 0.35 * dt);
  }

  /* ---------- BOP, choke, accumulator ---------- */
  bopCmd(el, state) {
    const b = this.c.bop;
    if (el === 'shear') { if (!b.shearArmed) return this.note('Arm the blind/shear rams first'); b.shear = 'CLOSED'; this._log('BOP', 'BLIND/SHEAR RAMS FIRED', 1, 'EVENT'); return { ok: true }; }
    b[el] = state; this._log('BOP', el.toUpperCase() + ' → ' + state, 3, 'EVENT'); return { ok: true };
  }
  _bopUpdate(dt) {
    const s = this.s, b = this.c.bop, sb = s.bop;
    const rate = { annular: 1 / 28, pipe: 1 / 10, shear: 1 / 8, hcr: 1 / 4, kill: 1 / 4 };
    const use = { annular: 30, pipe: 14, shear: 40, hcr: 2, kill: 2 };
    for (const el of ['annular', 'pipe', 'shear', 'hcr', 'kill']) {
      const closing = el === 'hcr' || el === 'kill' ? b[el] === 'OPEN' : b[el] === 'CLOSED';
      const tgt = closing ? 1 : 0; const prev = sb[el];
      const r = sb.accum > 100 ? rate[el] : rate[el] * 0.05;
      sb[el] = approach(sb[el], tgt, r, dt); sb.accum -= Math.abs(sb[el] - prev) * use[el];
    }
    if (this.powerOK() && !s.fault.accumLeak) sb.accum = Math.min(CFG.accumNom, sb.accum + 0.9 * dt);
    sb.accum = Math.max(0, sb.accum);
    if (sb.shear > 0.9 && !s.sheared && this.bitDepth() > 10) { s.sheared = true; s.connected = false; s.inSlips = false; s.standOnTD = false; this.c.ad.on = false; this.c.td.dir = 'OFF'; this.c.pumps.forEach(p => p.on = false); this.abortConnection(); }
    // choke actuator + auto choke (holds drill-pipe pressure at target)
    if (b.chokeAuto && this.chokePath() && this.pumpsOn()) {
      const e = this.d.spp - b.chokeTarget, cc = Math.max(this.s.choke, 0.02);
      b.choke = clamp(b.choke + clamp(0.25 * e * cc / (4 * Math.max(s.Pc, 3)), -0.08, 0.08) * dt * 100, 0, 100);
    }
    s.choke = approach(s.choke, b.choke / 100, 0.1, dt);
    // wellhead over-pressure
    if (s.Pc > CFG.bopRating * 1.05) { sb.overT += dt; if (sb.overT > 5 && !sb.failed) { sb.failed = true; this._log('WELL', 'WELLHEAD/BOP FAILURE — LOSS OF CONTAINMENT', 1, 'EVENT'); } } else sb.overT = 0;
  }

  /* ---------- pumps ---------- */
  _pumps(dt) {
    const s = this.s, c = this.c, k = CFG; let q = 0; const pw = this.powerOK() && !s.sheared;
    for (let i = 0; i < 3; i++) {
      const pc = c.pumps[i], ps = s.pumps[i];
      const tgt = pc.on && pw && !ps.relief ? clamp(pc.spm, 0, k.pump.maxSpm) : 0;
      ps.spm = approach(ps.spm, tgt, tgt > ps.spm ? 4 : (pw ? 10 : 30), dt);
      const D = pc.liner * 0.0254, vs = 3 * PI / 4 * D * D * k.pump.stroke * (k.pump.eff - ps.effLoss);
      ps.q = vs * ps.spm / 60; ps.strokes += ps.spm / 60 * dt; q += ps.q;
    }
    s.qin = q;
  }

  /* ---------- mud system: pit mixing + transport through string/annulus ---------- */
  _mud(dt) {
    const s = this.s, c = this.c;
    if (c.mud.mixing) s.pitRho = approach(s.pitRho, c.mud.mwSet, 0.02 / 60, dt);
    const dV = s.qin * dt;
    this.pipe.fit(this.Ap() * this.bitDepth() + CFG.surfVol, true);
    this.ann.fit(this.Aann() * s.Dh, false);
    if (dV > 0) {
      this.pipe.push(dV, s.pitRho); const r1 = this.pipe.pop(dV);
      if (r1 !== null) { this.ann.push(dV, r1); const r2 = this.ann.pop(dV); if (r2 !== null) s.retRho = r2; }
      s.pitRho += (s.retRho - s.pitRho) * Math.min(1, dV / Math.max(s.pit, 50));
    }
    s.rhoP = this.pipe.avg(); s.rhoA = this.ann.avg();
  }
  rheo(rho) { return { pv: 0.025 * (1 + 4 * (rho - 1.2)), yp: 5.75 * (1 + 2 * (rho - 1.2)) }; }

  /* ---------- drawworks / block / string ---------- */
  hoist(dir) { this.c.dw.jog = dir; this.c.dw.blockAuto = 0; }
  blockAuto(dir) { this.c.dw.blockAuto = this.c.dw.blockAuto === dir ? 0 : dir; }
  _slipF() { const s = this.s; return clamp(5000 * (s.blockH - s.slipRef), 0, s.wBuoy); } // kN, stiffness 5 kN/mm above slips
  _autodriller(dt) {
    const c = this.c.ad, s = this.s, A = this.ad;
    if (!c.on) { A.state = 'OFF'; return null; }
    if (this.m.active) { A.state = 'HOLD (CONNECTION)'; return null; }
    if (!s.connected || s.inSlips || !this.powerOK() || s.sheared || s.rpm < 20 || s.qin * 60000 < 500 || this.sealed()) { A.state = 'STANDBY'; A.iu = 0.005; return null; }
    if (s.blockH <= CFG.standEndH) {
      A.state = 'STAND END';
      if (this.c.autoConnect && Math.abs(s.vUp) < 0.01) this.startConnection();
      return 0;
    }
    const gap = s.Dh - s.zFree;
    if (gap > 0 && s.wob < 1) { A.state = 'SEEK BOTTOM'; A.iu = 0.004; return clamp(gap * 0.4, 0.008, 0.1); }
    A.state = 'CONTROL';
    // outer loop: ROP target -> WOB cap (integral)
    A.capWob = clamp(A.capWob + 0.25 * (c.ropTarget - s.rop) * dt, 0, c.wobLimit);
    let sp = c.mode === 'ROP' ? A.capWob : (c.ropCap ? Math.min(c.wobSet, A.capWob) : c.wobSet);
    sp = Math.min(sp, c.wobLimit);
    const tq = s.tdTorque / c.torqueLimit; if (tq > 0.92) { sp *= clamp(1 - (tq - 0.92) * 6, 0.2, 1); A.state = 'TORQUE LIMIT'; }
    if (s.rop > c.ropTarget * 1.02 && c.mode === 'WOB' && c.ropCap && sp < c.wobSet) A.state = 'ROP LIMIT';
    const e = (sp - s.wob) / 100;
    A.iu = clamp(A.iu + c.ki * e * dt, -0.005, 0.03);
    const u = clamp(c.kp * e + A.iu, -0.05, 0.03);
    A.sp = sp; A.pv = s.wob; A.out = u;
    if (c.mode === 'ROP') { A.pvR = s.rop; }
    return u;
  }
  _drawworks(dt) {
    const s = this.s, c = this.c, k = CFG;
    let vT = 0, src = 'MANUAL';
    const adU = this._autodriller(dt);
    if (!this.powerOK() || s.sheared) { vT = 0; src = 'STOP'; }
    else if (this.m.active && this.m.v !== null) { vT = this.m.v; src = 'SEQUENCE'; }
    else if (c.dw.jog) { vT = c.dw.jog * c.dw.jogSpeed / 60; c.dw.blockAuto = 0; }
    else if (c.dw.blockAuto) { vT = c.dw.blockAuto * Math.min(40, c.dw.jogSpeed * 2) / 60; if ((c.dw.blockAuto > 0 && s.blockH >= k.crownStop - 3) || (c.dw.blockAuto < 0 && s.blockH <= (s.connected ? k.minBlockH : 6.0) + 0.3)) c.dw.blockAuto = 0; }
    else if (adU !== null) { vT = -adU; src = 'AUTO-DRILLER'; }
    // brake
    if (c.dw.brakeMode === 'MANUAL') { s.brake = c.dw.brakeSet ? 'SET' : 'RELEASED'; }
    else { if (vT !== 0) { s.brake = 'RELEASED'; s.brakeHold = 0; } else if (Math.abs(s.vUp) < 0.002) { s.brakeHold += dt; if (s.brakeHold > 2) s.brake = 'SET'; } }
    if (s.brake === 'SET' || !this.powerOK()) vT = 0;
    // power limit when hoisting
    const vPow = k.dw.kw / Math.max(s.hl, 100); if (vT > 0) vT = Math.min(vT, vPow, k.dw.vmax);
    if (vT > 0 && s.hl > k.dw.hlRated) vT = 0;
    const acc = vT === 0 && (s.brake === 'SET' || !this.powerOK()) ? 2.0 : k.dw.accel;
    s.vUp = approach(s.vUp, vT, acc, dt); s.dwSrc = src;
    // limits
    const minH = s.connected && !s.inSlips ? k.minBlockH : 6.0;
    if (s.blockH >= k.crownStop && s.vUp > 0) s.vUp = 0;
    if (s.blockH <= minH && s.vUp < 0) s.vUp = 0;
    if (s.connected && !s.inSlips && s.zFree <= 60 && s.vUp > 0) s.vUp = 0;
    const db = s.vUp * dt; const z0 = this.bitDepth();
    s.blockH = clamp(s.blockH + db, 5.5, k.maxBlockH);
    if (s.connected && !s.inSlips) s.zFree -= db;
    // pipe displacement (tripping): steel volume in/out of the hole
    const dz = this.bitDepth() - z0;
    if (Math.abs(dz) > 0) {
      const steel = Math.abs(dz) * (CFG.dp.kgm / 7850);
      if (dz < 0) { if (c.mud.holeFill) s.tripTank = Math.max(0, s.tripTank - steel); else s.levelDrop += steel / this.Aann(); }
      else { if (s.levelDrop > 0) s.levelDrop = Math.max(0, s.levelDrop - steel / this.Aann()); else s.tripTank += steel; }
    }
    if (s.qin > 0.002 && s.levelDrop > 0) s.levelDrop = Math.max(0, s.levelDrop - s.qin / this.Aann() * dt);
    if (c.mud.holeFill && s.levelDrop > 0 && s.tripTank > 0) { const v = Math.min(s.levelDrop * this.Aann(), 0.02 * dt); s.levelDrop -= v / this.Aann(); s.tripTank -= v; }
    // swab / surge (bar), only when string hangs from the block
    const vp = s.connected && !s.inSlips ? s.vUp : 0;
    s.swab = -Math.sign(vp) * 3.0 * Math.abs(vp) * (this.bitDepth() / 1000) * (s.qin > 0.01 ? 0.4 : 1);
  }

  /* ---------- top drive ---------- */
  _topdrive(dt) {
    const s = this.s, c = this.c, k = CFG, td = c.td, f = s.fault;
    const pw = this.powerOK() && !s.sheared;
    const dir = !pw || td.dir === 'OFF' ? 0 : td.dir === 'REV' ? -1 : 1;
    let rpmT = Math.min(td.rpmSet, c.ad.rpmLimit), Tlim = c.ad.torqueLimit;
    if (td.mode === 'SPIN') { rpmT = Math.min(td.rpmSet, 60); Tlim = Math.min(3, Tlim); }
    if (td.mode === 'TORQUE') { rpmT = Math.min(td.rpmSet, 15); }
    if (this.m.active && this.m.td) { rpmT = this.m.td.rpm; Tlim = this.m.td.tq; }
    const string = s.connected && !s.inSlips;
    const fm = formAt(s.Dh, this.haz);
    const Tbit = this.onBottom() && s.wob > 0.5 ? k.mu * s.wob * k.holeD / 3 * (1 + 0.6 * s.wear) * (fm.kf < 1.5e-3 ? 1.15 : 1) : 0;
    const wn = s.w / 12.57;
    const Tdrag = string ? (0.6 + 0.0011 * this.bitDepth()) * (0.5 + 0.5 * clamp(wn, 0, 2)) * (1 + 1.2 * f.pack) : 0.15;
    const Tload = s.w > 0.05 || dir ? Tbit + Tdrag : 0;
    const wCmd = dir ? rpmT * 2 * PI / 60 : 0;
    let Tm;
    if (td.mode === 'TORQUE' && dir && !(this.m.active && this.m.td)) Tm = Math.min(td.torqueSet, Tlim);
    else { const aDes = clamp((wCmd - s.w) * 1.5, -k.td.aMax, k.td.aMax); Tm = clamp(Tload + k.td.J * aDes, dir ? -Tlim : -k.td.maxTq, dir ? Tlim : 0); }
    if (!pw) Tm = Math.min(Tm, 0) - (s.w > 0 ? 6 : 0);
    s.w = Math.max(0, s.w + (Tm - Tload) / k.td.J * dt);
    if (td.mode === 'TORQUE' && s.w > wCmd) s.w = wCmd;
    if (!dir && s.w < 0.05) s.w = 0;
    s.rpm = s.w * 60 / (2 * PI);
    s.tdStall = string && dir && wCmd > 1 && s.rpm < 3 && Tm >= Tlim * 0.98;
    s.tdTorque = s.rpm > 0.3 || s.tdStall ? Math.max(0, Tm) : 0; s.tdSign = dir || 1;
    s.rotTorque = s.rpm > 0.3 || s.tdStall ? Math.max(0, s.tdStall ? Tlim : Tload) : 0;
    const load = clamp(s.tdTorque / k.td.maxTq, 0, 1.5);
    s.tdTemp = lag(s.tdTemp, 35 + 70 * load * load + (s.rpm > 1 ? 8 : 0) + (f.tdCool ? 55 * (0.3 + load) : 0), 300, dt);
  }

  /* ---------- bit / formation ---------- */
  _bit(dt) {
    const s = this.s, k = CFG, f = formAt(s.Dh, this.haz);
    let rop = 0;
    if (this.onBottom() && s.wob > 10 && s.rpm > 3) {
      const base = f.kf * ((s.wob - 10) / k.holeD) * Math.pow(s.rpm, 0.6);
      const found = 1 / (1 + Math.pow(s.wob / k.wobFound, 3));
      const fh = 0.7 + 0.3 * clamp(s.hsi / 1.5, 0, 1);
      const over = clamp(Math.exp(-0.012 * (s.overbal - 30)), 0.6, 1.6);
      const fw = 1 - 0.55 * Math.pow(s.wear, 1.5);
      rop = base * found * fh * over * fw * (1 - 0.6 * s.fault.pack);
      s.wear = Math.min(1, s.wear + s.fault.wearX * f.abr * (s.rpm / 120) * (0.6 + 0.4 * s.wob / 120) / (120 * 3600) * dt);
      s.bitHours += dt / 3600;
    }
    s.rop = lag(s.rop, rop, 6, dt);
    s.Dh += s.rop / 3600 * dt;
    const kStr = k.EA / Math.max(500, this.bitDepth()) / 1000; // kN/m
    s.wob = s.connected && !s.inSlips ? kStr * Math.max(0, s.zFree - s.Dh) : 0;
    // hook load
    const bd = this.bitDepth(), BF = 1 - s.rhoA / 7.85;
    const Wair = (CFG.dp.kgm * Math.max(0, bd - CFG.bha.len) + CFG.bha.kgm * Math.min(CFG.bha.len, bd)) * G / 1000;
    s.wBuoy = Wair * BF;
    const drag = Math.sign(s.vUp) * Math.min(1, Math.abs(s.vUp) / 0.1) * (0.025 * s.wBuoy + (s.vUp > 0 ? 450 : 200) * s.fault.pack);
    if (s.sheared) s.hl = k.blockW;
    else if (!s.connected) s.hl = k.blockW + (s.standOnTD ? CFG.dp.kgm * CFG.standLen * G / 1000 : 0);
    else if (s.inSlips) s.hl = k.blockW + this._slipF();
    else s.hl = k.blockW + s.wBuoy - s.wob + drag;
    s.overpull = s.connected && !s.inSlips && s.vUp > 0 ? s.hl - (k.blockW + s.wBuoy) : 0;
    s.cutRho = lag(s.cutRho, s.qin > 0.005 ? clamp(s.rop / 3600 * PI / 4 * k.holeD ** 2 / (s.qin * clamp(s.circ.Ft || 0.7, 0.3, 1)) * (CFG.cut.rho * 1000 - s.rhoA * 1000) / 1000, 0, 0.05) : 0, s.qin > 0.005 ? 120 : 400, dt);
  }

  /* ---------- well: BHP, influx/losses, kick gas, casing pressure, returns, pits ---------- */
  _gasGeom() {
    const s = this.s, g = s.gas, A = this.Aann(), rho = s.rhoA * 1000;
    if (g.m < 0.5) { g.m = 0; g.h = 0; g.V = 0; s.gasDef = 0; g.surf = false; return; }
    let P = s.Pc + 1 + rho * G * g.zb / BAR, h = g.m / (0.8 * P * A);
    for (let i = 0; i < 6; i++) { P = s.Pc + 1 + rho * G * Math.max(g.zb - h / 2, 0) / BAR; h = g.m / (0.8 * P * A); }
    g.hU = h; g.surf = h >= g.zb; h = Math.min(h, g.zb);
    g.h = h; g.V = h * A; g.Pm = P; g.zt = g.zb - h;
    s.gasDef = Math.max(0, (rho - 0.8 * P) * G * h / BAR);
  }
  bhp() { const s = this.s; return s.Pc + s.rhoA * 1000 * G * s.Dh / BAR + s.dpAnn - s.gasDef + s.swab - s.levelDrop * s.rhoA * 1000 * G / BAR + s.cutRho * 1000 * G * this.bitDepth() / BAR; }
  _well(dt) {
    const s = this.s, k = CFG, g = s.gas, D = s.Dh, A = this.Aann(), bd = this.bitDepth();
    const rho = s.rhoA * 1000, r = this.rheo(s.rhoA);
    s.dpAnn = fricDP(s.qin, k.holeD - k.dp.od, A, bd, rho, r.pv, r.yp) / BAR;
    this._gasGeom();
    let bhp = this.bhp();
    // permeable zones exposed in open hole
    let qIn = 0, qLoss = 0; const shoe = k.shoe;
    for (const f of formations(this.haz)) {
      if (f.top >= D || f.bot <= shoe || !(f.gas || f.loss)) continue;
      const zt = Math.max(f.top, shoe), zbt = Math.min(f.bot, D), zm = (zt + zbt) / 2, expo = clamp((zbt - zt) / 15, 0, 1);
      const pz = bhp - rho * G * (D - zm) / BAR, pp = interp(f, 'pp', zm) * 1000 * G * zm / BAR;
      if (f.gas && pp > pz) { const q = f.gas.pi * expo * (pp - pz); qIn += q; this._addGas(q, pz, zm, dt); }
      if (f.loss && pz > pp) qLoss += f.loss.k * expo * (pz - pp) * s.fault.lcm;
    }
    if (s.fault.kick) { const pk = ppAt(D, this.haz) * 1000 * G * D / BAR + s.fault.kick.dpp; if (pk > bhp) { const q = s.fault.kick.pi * (pk - bhp); qIn += q; this._addGas(q, bhp, D, dt); } }
    if (s.fault.lossK) qLoss += s.fault.lossK * Math.max(0, bhp - ppAt(D, this.haz) * 1000 * G * D / BAR + 20) * s.fault.lcm;
    // induced fractures (bottom, shoe)
    const pfB = fgAt(D, this.haz) * 1000 * G * D / BAR, pShoe = bhp - rho * G * (D - shoe) / BAR, pfS = fgAt(shoe, this.haz) * 1000 * G * shoe / BAR;
    if (bhp > pfB) qLoss += 60 * (bhp - pfB);
    if (pShoe > pfS) qLoss += 60 * (pShoe - pfS);
    s.maasp = pfS - rho * G * shoe / BAR;
    s.qInfl = qIn; s.qLoss = Math.min(qLoss, 6000 + s.qin * 60000);
    // gas movement / migration / venting
    const vmig = 0.05;
    let qExp = 0;
    if (g.m > 0) {
      const vA = s.qin / A, V0 = g.V;
      g.zb = Math.max(0, g.zb - (vA + vmig) * dt);
      this._gasGeom();
      if (g.surf || g.zb <= 0.5) { const rate = Math.max(vA + vmig, 0.02) / Math.max(g.hU, 1); g.m *= Math.exp(-rate * dt * 3); if (g.m < 1) g.m = 0; }
      else qExp = Math.max(0, g.V - V0) / dt; // expansion of rising gas displaces mud
      if (s.qInfl > 0) qExp = Math.max(0, qExp - s.qInfl / 60000);
    }
    s.qExp = qExp * 60000;
    // returns path
    const qNet = s.qin + (s.qInfl - s.qLoss) / 60000 + qExp; // m3/s
    let qOut;
    if (s.bop.failed) { s.Pc = lag(s.Pc, 0, 2, dt); qOut = Math.max(0, qNet) + (g.m > 0 ? 0.08 : 0.02); }
    else if (!this.sealed()) { s.Pc = lag(s.Pc, 0, 1.5, dt); qOut = Math.max(0, qNet); }
    else {
      const beta = 0.012 + (g.V > 0 ? g.V / Math.max(g.Pm, 1) : 0);
      if (this.chokePath()) {
        const Ae = 4.5e-3 * s.choke * s.choke, Pb = 1.5;
        const Peq = Pb + rho * Math.max(qNet, 0) ** 2 / (2 * 0.49 * Ae * Ae) / BAR;
        const tau = clamp(beta * 2 * (Peq - Pb + 0.1) / Math.max(qNet, 1e-4), 0.3, 40);
        s.Pc = lag(s.Pc, Math.min(Peq, 600), tau, dt);
        qOut = 0.7 * Ae * Math.sqrt(2 * Math.max(s.Pc - Pb, 0) * BAR / rho);
      } else {
        s.Pc += qNet * dt / beta + (g.m > 0 && s.qin < 0.002 ? rho * G * vmig * dt / BAR : 0);
        qOut = 0;
      }
      s.Pc = Math.max(0, s.Pc);
    }
    if (s.fault.pack > 0.05 && !this.sealed()) qOut *= 1 - 0.25 * s.fault.pack;
    s.qout = qOut;
    s.qoutLag = lag(s.qoutLag, qOut, 3, dt); s.qinLag = lag(s.qinLag || 0, s.qin, 3, dt);
    s.pit += (s.qoutLag - s.qin) * dt;
    if (s.qInfl > 0) s.kickVol += s.qInfl / 60000 * dt;
    this._gasGeom();
    s.bhp = this.bhp();
    const pp = ppAt(D, this.haz) * 1000 * G * D / BAR;
    s.pp = pp; s.overbal = s.bhp - pp; s.ecd = s.bhp * BAR / (G * D) / 1000;
    // shut-in snapshot (SIDPP/SICP) once pressures stabilise
    if (this.sealed() && s.qin < 0.001 && s.Pc > 0.5) {
      if (!s.shutin) s.shutin = { t: s.t, pit: s.pit - s.pitRef, sidpp: 0, sicp: 0, tvd: D, mw: s.rhoP };
      if (s.t - s.shutin.t < 600) { s.shutin.sidpp = Math.max(0, s.bhp - s.rhoP * 1000 * G * D / BAR); s.shutin.sicp = s.Pc; s.shutin.mw = s.rhoP; s.shutin.tvd = D; }
    }
  }
  _addGas(qLmin, P, z, dt) {
    const g = this.s.gas, dV = qLmin / 60000 * dt, dm = 0.8 * dV * Math.max(P, 1);
    g.zb = g.m > 0 ? (g.zb * g.m + z * dm) / (g.m + dm) : z; g.m += dm;
  }
  recordSCR() { const s = this.s; s.scr = { spm: s.pumps.reduce((a, p) => a + p.spm, 0), q: s.qin * 60000, spp: this.d.spp, t: s.t }; this._log('WELL', 'SCR recorded: ' + s.scr.spm.toFixed(0) + ' spm @ ' + s.scr.spp.toFixed(1) + ' bar', 3, 'EVENT'); }
  killSheet() {
    const s = this.s, si = s.shutin, scr = s.scr; if (!si) return null;
    const kmw = si.mw + si.sidpp / (0.0980665 * si.tvd);
    const o = { sidpp: si.sidpp, sicp: si.sicp, pitGain: si.pit, tvd: si.tvd, mw: si.mw, kmw };
    if (scr) { o.icp = si.sidpp + scr.spp; o.fcp = scr.spp * kmw / si.mw; o.scrSpm = scr.spm; o.scrSpp = scr.spp; }
    o.strokesToBit = (this.Ap() * this.bitDepth() + CFG.surfVol) / this.strokeDisp();
    return o;
  }

  /* ---------- pressures at surface ---------- */
  _hydraulics() {
    const s = this.s, k = CFG, f = s.fault, Q = s.qin, bd = this.bitDepth();
    const rp = this.rheo(s.rhoP), rhoP = s.rhoP * 1000, rhoA = s.rhoA * 1000;
    if (s.sheared || !s.connected) { s.spp = 0; s.dpBit = 0; s.sppClean = 0; s.hsi = 0; }
    else {
      const Qb = Q * (1 - 0.6 * f.wash), A = k.tfa * (1 - 0.55 * f.plug);
      const dpBit = rhoP * Qb * Qb / (2 * k.cd ** 2 * A * A) / BAR;
      const dpPipe = fricDP(Q, k.dp.id, this.Ap(), bd, rhoP, rp.pv, rp.yp) / BAR * (1 - 0.75 * f.wash);
      const dpSurf = 8 * Math.pow(Q / 0.0633, 1.86) * s.rhoP / 1.2;
      const clean = rhoP * Q * Q / (2 * k.cd ** 2 * k.tfa ** 2) / BAR + fricDP(Q, k.dp.id, this.Ap(), bd, rhoP, rp.pv, rp.yp) / BAR + dpSurf + s.dpAnn;
      s.sppClean = clean;
      s.spp = Math.max(0, s.bhp - rhoP * G * s.Dh / BAR + dpBit + dpPipe + dpSurf + 70 * f.pack * (Q > 0.003 ? 1 : 0));
      s.dpBit = dpBit; s.hsi = dpBit * BAR * Qb / 745.7 / (PI / 4 * k.bitIn ** 2);
    }
    for (let i = 0; i < 3; i++) {
      const ps = s.pumps[i], pc = this.c.pumps[i];
      ps.p = ps.spm > 0.5 ? s.spp * 1.012 + 0.8 : 0;
      ps.load = clamp(ps.p * BAR * ps.q / (k.pump.kw * 1000) * 100 + (ps.spm > 0.5 ? 6 : 0), 0, 150);
      if (ps.p > (k.pump.rating[pc.liner] || 345) && !ps.relief) { ps.relief = true; pc.on = false; this._log('PUMP', 'Pump ' + (i + 1) + ' pop-off relief opened @ ' + ps.p.toFixed(0) + ' bar', 2, 'EVENT'); }
    }
    // MSE / d-exponent
    const Ab = PI / 4 * k.holeD ** 2, ropMs = s.rop / 3600;
    s.mse = ropMs > 1e-5 ? (s.wob * 1e3 / Ab + 2 * PI * (s.rpm / 60) * s.rotTorque * 1e3 / (Ab * ropMs)) / 1e6 : 0;
    if (s.rop > 0.5 && s.rpm > 5 && s.wob > 15) {
      const d = Math.log10(s.rop * 3.28084 / (60 * s.rpm)) / Math.log10(12 * s.wob * 224.809 / (1e6 * k.bitIn));
      s.dxc = d * 1.03 / Math.max(s.ecd, 0.9);
    }
    const g = s.gas;
    s.gasU = 6 + 90 * Math.exp(-Math.max(s.overbal, 0) / 8) + (g.m > 0 && s.qin > 0.001 ? 1500 * clamp(1 - (g.zt || g.zb) / 400, 0, 1) : 0) + (g.surf ? 800 : 0);
  }

  /* ---------- mud circulation: velocities, cuttings transport, lag, tracer ---------- */
  strokeDisp() { // m3 per pump stroke (running pumps' average, else pump 1 nominal)
    const s = this.s, spm = s.pumps.reduce((a, p) => a + p.spm, 0);
    if (spm > 1 && s.qin > 1e-5) return s.qin / (spm / 60);
    const D = this.c.pumps[0].liner * 0.0254; return 3 * PI / 4 * D * D * CFG.pump.stroke * CFG.pump.eff;
  }
  totStrokes() { return this.s.pumps.reduce((a, p) => a + p.strokes, 0); }
  _circ(dt) {
    const s = this.s, k = CFG, c = s.circ, Q = s.qin, bd = this.bitDepth();
    const Ap = this.Ap(), Aa = this.Aann(), Ab = PI / 4 * k.holeD ** 2;
    c.vp = Q / Ap; c.va = Q / Aa; c.vn = s.connected && !s.sheared ? Q / k.tfa : 0; // m/s
    // slip velocity of cuttings: Moore correlation (field units) with Bingham apparent viscosity of the annulus
    const r = this.rheo(s.rhoA), pv = r.pv * 1000, yp = r.yp / 0.4788;          // cP, lbf/100ft2
    const rf = s.rhoA * 8.3454, rs = k.cut.rho * 8.3454, ds = k.cut.d;           // ppg, in
    const vaF = Math.max(c.va * 3.28084, 0.05), gap = (k.holeD - k.dp.od) / 0.0254; // ft/s, in
    const mua = pv + 5 * yp * gap / vaF;
    let vs = 2.90 * ds * Math.pow(rs - rf, 0.667) / (Math.pow(rf, 0.333) * Math.pow(mua, 0.333));
    let nre = 928 * rf * vs * ds / mua;
    if (nre > 300) vs = 1.54 * Math.sqrt(ds * (rs - rf) / rf);
    else if (nre < 3) vs = 82.87 * ds * ds * (rs - rf) / mua;
    c.mua = mua; c.nre = 928 * rf * vs * ds / mua; c.vs = vs / 3.28084;
    c.Ft = c.va > 0.01 ? clamp(1 - c.vs / c.va, 0, 1) : 0;
    const qc = s.rop / 3600 * Ab;                                                 // drilled rock, m3/s
    c.Ca = qc > 1e-7 && Q > 1e-4 ? qc / (qc + Q * Math.max(c.Ft, 0.05)) : 0;
    // circulating volumes, strokes and times
    c.disp = this.strokeDisp(); c.volPipe = Ap * bd + k.surfVol; c.volAnn = Aa * bd;
    c.stkBit = c.volPipe / c.disp; c.stkBU = c.volAnn / c.disp;
    c.tBit = Q > 1e-4 ? c.volPipe / Q : 0; c.tBU = Q > 1e-4 ? c.volAnn / Q : 0;
    c.tCut = Q > 1e-4 && c.va - c.vs > 1e-3 ? bd / (c.va - c.vs) : 0;
    // cuttings cohorts: generated at the bit every 5 s, rise at (va - vs); settle at vs with pumps off
    c.genT += dt; c.genV += qc * dt;
    if (c.genT >= 5) { if (c.genV > 1e-6) { const f = formAt(s.Dh, this.haz); this.cut.push({ id: this.cutId++, z: bd, z0: s.Dh, v: c.genV, col: f.col, n: f.n }); } c.genT = 0; c.genV = 0; }
    const up = (Q > 1e-4 ? c.va : 0) - c.vs;
    let arr = 0, inHole = 0;
    if (this.cut.length) {
      const keep = [];
      for (const p of this.cut) {
        p.z = Math.min(p.z - up * dt, s.Dh);
        if (p.z <= 0) { arr += p.v; c.lagDepth = p.z0; c.lagForm = p.n; } else { keep.push(p); inHole += p.v; }
      }
      this.cut = keep.length > 3000 ? keep.slice(-3000) : keep;
    }
    c.cutVol = inHole; c.shaker = lag(c.shaker, arr / dt, 30, dt);                 // m3/s of cuttings over the shakers
    // tracer (lag test): injected at the pump suction, travels the surface lines, the string, then the annulus
    const T = s.tracer;
    if (T && !T.done && Q > 1e-4) {
      if (T.ph === 'pipe') { T.z += c.vp * dt; if (T.z >= bd) { T.ph = 'ann'; T.z = bd; T.tBit = s.t - T.t0; } }
      else {
        T.z -= c.va * dt;
        if (T.z <= 0) {
          T.z = 0; T.done = true; T.tAct = s.t - T.t0; T.stkAct = this.totStrokes() - T.stk0;
          this._log('MUD', 'Tracer at shakers after ' + (T.tAct / 60).toFixed(1) + ' min / ' + T.stkAct.toFixed(0) + ' strokes (calculated ' + T.stkExp.toFixed(0) + ' strokes)', 3, 'EVENT');
        }
      }
    }
    const B = s.bu;
    if (B && !B.done && this.totStrokes() - B.stk0 >= B.need) { B.done = true; this._log('MUD', 'Bottoms-up complete (' + B.need.toFixed(0) + ' strokes)', 3, 'EVENT'); }
  }
  injectTracer() {
    const s = this.s, c = s.circ;
    if (!this.pumpsOn()) return this.note('Start the mud pumps before injecting the tracer');
    if (!s.connected || s.sheared) return this.note('String not connected — no circulation path');
    s.tracer = { t0: s.t, ph: 'pipe', z: -CFG.surfVol / this.Ap(), stk0: this.totStrokes(), stkExp: c.stkBit + c.stkBU, tExp: c.tBit + c.tBU, done: false };
    this._log('MUD', 'Tracer injected at pump suction', 3, 'EVENT'); return { ok: true };
  }
  startBottomsUp() {
    const c = this.s.circ;
    this.s.bu = { stk0: this.totStrokes(), need: c.stkBU, done: false };
    this._log('MUD', 'Bottoms-up count started: ' + c.stkBU.toFixed(0) + ' strokes', 3, 'EVENT'); return { ok: true };
  }
  _seedCuttings() { // hot start: fill the annulus with the cuttings of the last hour, as in steady drilling
    const s = this.s, c = s.circ, up = c.va - c.vs; if (up <= 0.01 || s.rop <= 0) return;
    let zTop = this.cut.length ? Math.min(...this.cut.map(p => p.z)) : this.bitDepth();
    const v = s.rop / 3600 * PI / 4 * CFG.holeD ** 2 * 5, f = formAt(s.Dh, this.haz), old = [];
    for (let z = zTop - 5 * up; z > 0; z -= 5 * up) old.push({ id: this.cutId++, z, z0: s.Dh - (zTop - z) / up * s.rop / 3600, v, col: f.col, n: f.n });
    this.cut = old.reverse().concat(this.cut);
    if (old.length) { c.lagDepth = old[old.length - 1].z0; c.lagForm = f.n; c.shaker = v / 5; }
  }

  /* ---------- sensors (noise + filtering) ---------- */
  _sense(dt) {
    const s = this.s, d = this.d, n = () => this.gauss();
    const set = (key, v, noise, tau) => { const x = v + noise * n(); d[key] = d[key] === undefined || tau <= 0 ? x : lag(d[key], x, tau, dt); };
    set('holeDepth', s.Dh, 0, 0); set('bitDepth', this.bitDepth(), 0, 0); set('blockH', s.blockH, 0.005, 0);
    set('blockV', s.vUp * 60, 0.02, 0.3); set('hl', s.hl, 1.2, 0.6); set('wob', s.wob, 0.35, 0.6); set('rop', s.rop, 0.1, 1.5);
    set('rpm', s.rpm, s.rpm > 1 ? 0.4 : 0, 0.4); set('torque', s.tdTorque, s.rpm > 1 ? 0.06 : 0, 0.4); set('rotTorque', s.rotTorque * 0.97, s.rpm > 1 ? 0.06 : 0, 0.4);
    set('spp', s.spp, s.spp > 1 ? 0.35 : 0, 0.5); set('pc', s.Pc, s.Pc > 0.5 ? 0.15 : 0, 0.5);
    set('spm', s.pumps.reduce((a, p) => a + p.spm, 0), 0, 0); set('pumpP', Math.max(...s.pumps.map(p => p.p)), s.spp > 1 ? 0.4 : 0, 0.5);
    set('qin', s.qin * 60000, s.qin > 0 ? 2 : 0, 0.5); set('qout', s.qoutLag * 60000, s.qoutLag > 0.0005 ? 6 : 0, 1.0);
    d.qout = Math.max(0, d.qout); d.qin = Math.max(0, d.qin); set('qinExp', (s.qinLag || 0) * 60000, 0, 1.0);
    set('pit', s.pit, 0.008, 2); d.pitDelta = d.pit - s.pitRef; set('tripTank', s.tripTank, 0.003, 1);
    set('dp', s.connected && s.qin > 0.003 && !this.sealed() ? s.spp - s.sppClean : 0, 0.15, 1);
    set('ecd', s.ecd, 0.0005, 2); set('bhp', s.bhp, 0.2, 1); set('overbal', s.overbal, 0, 0); set('gas', s.gasU, 1.5, 3);
    set('mse', s.mse, 2, 5); set('dxc', s.dxc, 0.004, 10);
    d.sppExp = s.sppClean; d.mwIn = s.pitRho; d.mwOut = s.retRho - (s.gas.surf ? 0.15 : 0); d.maasp = s.maasp || 0; d.overpull = s.overpull;
    d.pp = s.pp; d.ppSg = ppAt(s.Dh, this.haz); d.fgSg = fgAt(s.Dh, this.haz);
  }

  /* ---------- alarms ---------- */
  _alarms(dt) {
    for (const def of ALARMS) {
      const a = this.alarm[def[0]]; let cond = false;
      try { cond = !!def[4](this); } catch (e) { cond = false; }
      if (cond) { a.t += dt; if (!a.active && a.t >= a.delay) { a.active = true; a.acked = false; a.t0 = this.s.t; this._log(a.id, a.text, a.prio, 'ALARM'); } }
      else { a.t = 0; if (a.active) { a.active = false; a.t1 = this.s.t; this._log(a.id, a.text, a.prio, 'CLEAR'); } }
    }
  }
  _log(id, text, prio, type) { this.log.unshift({ t: this.s.t, id, text, prio, type }); if (this.log.length > 200) this.log.pop(); }
  ack(id) { for (const a of Object.values(this.alarm)) if (!id || a.id === id) a.acked = true; }
  alarmList() { return Object.values(this.alarm).filter(a => a.active || !a.acked).sort((x, y) => x.prio - y.prio || (y.t0 - x.t0)); }

  /* ---------- trends ---------- */
  _record() {
    const T = this.trend, s = this.s; if (s.t - T.last < T.dt) return; T.last = s.t;
    const i = T.n % T.N; T.t[i] = s.t;
    for (const k of TREND_KEYS) T.ch[k][i] = this.d[k] === undefined ? 0 : this.d[k];
    T.n++;
  }

  /* ---------- driller commands ---------- */
  estop() { this.c.estop = true; this.c.dw.jog = 0; this.c.dw.blockAuto = 0; this.c.pumps.forEach(p => p.on = false); this.c.td.dir = 'OFF'; this.abortConnection(); this._log('ESTOP', 'E-STOP pressed', 1, 'EVENT'); }
  esdTrip() { this.estop(); this.c.esd = true; this._log('ESD', 'ESD activated', 1, 'EVENT'); }
  resetEstop() { if (this.c.esd) return this.note('Reset ESD first'); this.c.estop = false; this._log('ESTOP', 'E-STOP reset, power restored', 3, 'EVENT'); return { ok: true }; }
  resetEsd() { this.c.esd = false; this._log('ESD', 'ESD reset', 3, 'EVENT'); }
  zeroPit() { this.s.pitRef = this.s.pit; this.s.kickVol = 0; }
  addMud(v) { this.s.pit += v; this._log('MUD', (v > 0 ? 'Added ' : 'Transferred out ') + Math.abs(v) + ' m³', 3, 'EVENT'); }
}

/* connection sequence (drilling with stands). Each run() returns true when the step is complete */
const CONN_STEPS = [
  { n: 'Stop rotation, pick up off bottom', to: 90, run: (S, M) => { S.c.td.dir = 'OFF'; M.v = S.s.Dh - S.s.zFree < 0.15 ? 0.1 : 0; return M.v === 0 && S.s.rpm < 2 && Math.abs(S.s.vUp) < 0.005; } },
  { n: 'Stop mud pumps (flow-check)', to: 120, run: (S) => { S.c.pumps.forEach(p => p.on = false); return S.s.qin * 60000 < 20; } },
  { n: 'Set slips', to: 30, run: (S, M) => { if (!S.s.op && !S.s.inSlips) S.setSlips(); return S.s.inSlips; } },
  { n: 'Break out top-drive connection', to: 40, run: (S) => { if (!S.s.op && S.s.connected) S.breakOut(); return !S.s.connected; } },
  { n: 'Raise top drive to racking board', to: 150, run: (S, M) => { const tgt = CFG.tdOff + 1.5 + CFG.standLen; M.v = clamp((tgt - S.s.blockH) * 0.5, 0.0, 0.6); if (M.v < 0.01) M.v = 0; return Math.abs(S.s.blockH - tgt) < 0.05 && Math.abs(S.s.vUp) < 0.01; } },
  { n: 'Latch new stand', to: 30, run: (S) => { if (!S.s.op && !S.s.standOnTD) S.pickStand(); return S.s.standOnTD; } },
  { n: 'Stab, spin-in and torque up', to: 40, run: (S, M) => { M.td = { rpm: M.t < 8 ? 40 : 5, tq: M.t < 8 ? 3 : 30 }; if (!S.s.op && !S.s.connected) S.makeUp(); const ok = S.s.connected; if (ok) M.td = null; return ok; } },
  { n: 'Take string weight', to: 40, run: (S, M) => { M.v = S._slipF() < 0.985 * S.s.wBuoy ? 0.06 : 0; return M.v === 0 && Math.abs(S.s.vUp) < 0.005; } },
  { n: 'Pull slips', to: 30, run: (S) => { if (!S.s.op && S.s.inSlips) S.pullSlips(); return !S.s.inSlips; } },
  { n: 'Restart pumps (staged)', to: 120, run: (S, M) => { const sv = M.saved.pumps; S.c.pumps.forEach((p, i) => { p.on = sv[i].on; p.spm = sv[i].spm; }); return S.s.pumps.every((p, i) => Math.abs(p.spm - (sv[i].on ? sv[i].spm : 0)) < 1); } },
  { n: 'Start rotation', to: 60, run: (S, M) => { S.c.td.dir = M.saved.dir; S.c.td.mode = M.saved.mode; return S.s.rpm > 0.9 * Math.min(S.c.td.rpmSet, S.c.ad.rpmLimit); } },
  { n: 'Run to bottom', to: 240, run: (S, M) => { const gap = S.s.Dh - S.s.zFree; M.v = -clamp(gap * 0.3, 0.01, 0.3); return S.s.wob > 3; } },
];

const TREND_KEYS = ['wob', 'rop', 'hl', 'blockH', 'torque', 'rpm', 'spp', 'pc', 'qin', 'qout', 'pitDelta', 'gas', 'ecd', 'bhp', 'holeDepth', 'dxc'];

const api = { RigSim, CFG, FORM_HAZ, FORM_SAFE, formations, formAt, ppAt, fgAt, ppProg, TREND_KEYS, CONN_STEPS, ALARMS, DEF_TH };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Rig = api;
})(typeof window !== 'undefined' ? window : globalThis);

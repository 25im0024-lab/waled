// Tests for the UHS Pore Lab engine: node uhs-md/web/tests/sim-test.js
const U = require('../src/sim.js');
let failed = false;
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? `  (${detail})` : '')); if (!ok) failed = true; };

// Peng-Robinson vs CoolProp (HEOS) at 333.15 K, 10 MPa, mol/m3
const ref = { H2: 3420.5, CH4: 3964.8, CO2: 6588.3, N2: 3534.9 };
for (const g of Object.keys(ref)) {
  const c = {}; c[g] = 1;
  const r = U.prDensity(333.15, 10e6, c).rho, e = Math.abs(r / ref[g] - 1);
  check(`PR density ${g} within 4 % of CoolProp`, e < 0.04, `${r.toFixed(0)} vs ${ref[g]}`);
}
const mixRef = 3580.5, mix = U.prDensity(333.15, 10e6, { H2: 0.7, CO2: 0.3 }).rho;
check('PR density H2/CO2 70/30 within 4 %', Math.abs(mix / mixRef - 1) < 0.04, `${mix.toFixed(0)} vs ${mixRef}`);
check('PR pressure inverts PR density', Math.abs(U.prPressure(333.15, mix, { H2: 0.7, CO2: 0.3 }) / 10e6 - 1) < 1e-9);

// base case: stability, temperature, pressure
const s = U.createSim({ seed: 7, bio: false });
const e0 = s.elements();
s.step(2500);
let Tsum = 0, Psum = 0, k = 0;
for (let i = 0; i < 15; i++) { s.step(150); const st = s.stats(); Tsum += st.T; Psum += st.P_MPa; k++; }
check('thermostat holds T near 333 K', Math.abs(Tsum / k - 333.15) < 15, `${(Tsum / k).toFixed(1)} K`);
check('equivalent pressure near the 10 MPa target', Math.abs(Psum / k - 10) < 1.5, `${(Psum / k).toFixed(2)} MPa`);
const P = s.particles();
let inside = true, finite = true;
for (let i = 0; i < P.n; i++) {
  if (P.z[i] < 0 || P.z[i] > s.H || P.x[i] < 0 || P.x[i] >= s.L || P.y[i] < 0 || P.y[i] >= s.L) inside = false;
  if (!isFinite(P.x[i] + P.y[i] + P.z[i])) finite = false;
}
check('all molecules inside the pore, finite coordinates', inside && finite);
check('closed system conserves elements', JSON.stringify(e0) === JSON.stringify(s.elements()));
const prof = s.profiles(20);
const wall = prof.data.W[0] + prof.data.W[19], mid = prof.data.W[9] + prof.data.W[10];
check('brine wets the calcite walls (film, not centre)', wall > 10 * (mid + 1e-6), `wall ${wall.toFixed(3)} mid ${mid.toFixed(4)}`);

// methanogenesis: stoichiometry and element balance
const b = U.createSim({ seed: 3, bio: true, microbes: 12, bioRate: 0.03 });
const eb = b.elements();
b.step(7000);
const L = b.stats().ledger;
check('microbes consume H2', L.H2_consumed > 8, `${L.H2_consumed} H2`);
check('4 H2 + CO2 -> CH4 + 2 H2O stoichiometry', L.CH4_produced * 4 <= L.H2_consumed && L.H2O_produced === 2 * L.CH4_produced
  && L.CO2_gas_consumed + L.CO2_carbonate === L.CH4_produced + b.microbes.reduce((a, m) => a + m.co2, 0), JSON.stringify({ c: L.H2_consumed, m: L.CH4_produced }));
check('elements conserved through methanogenesis', JSON.stringify(eb) === JSON.stringify(b.elements()), JSON.stringify(b.elements()));

// no carbon source: methanogenesis stalls once each microbe holds 4 H2
const nc = U.createSim({ seed: 5, cushion: 'N2', bio: true, microbes: 6, bioRate: 0.08, carbonateCO2: false });
nc.step(6000);
const Ln = nc.stats().ledger;
check('no CO2 and no carbonate source: no CH4, uptake capped at 4 H2 per microbe', Ln.CH4_produced === 0 && Ln.H2_consumed <= 24, `${Ln.H2_consumed} H2`);

// withdrawal: removed gas is recorded and elements still balance
const w = U.createSim({ seed: 9, bio: false });
const ew = w.elements();
w.step(1000); w.setCycle('withdraw'); w.step(6000);
const Lw = w.stats().ledger, nW = U.GASES.reduce((a, g) => a + Lw.withdrawn[g], 0);
check('withdrawal removes gas', nW >= 15, `${nW} molecules`);
check('elements balance including withdrawn gas', JSON.stringify(ew) === JSON.stringify(w.elements()));

// salting-out: salt reduces dissolved CO2
function dissolvedCO2(m) {
  let tot = 0;
  for (const seed of [11, 12]) {
    const t = U.createSim({ seed, bio: false, molality: m, xCushion: 0.5 });
    t.step(2000);
    for (let i = 0; i < 20; i++) { t.step(250); const p = t.particles(); for (let j = 0; j < p.n; j++) if (p.sp[j] === 2 && p.dis[j]) tot++; }
  }
  return tot;
}
const d0 = dissolvedCO2(0), d4 = dissolvedCO2(4);
check('salting-out: less CO2 dissolves at 4 mol/kg than in fresh water', d4 < d0, `${d4} vs ${d0}`);

process.exit(failed ? 1 : 0);

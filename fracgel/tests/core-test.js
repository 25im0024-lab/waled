// FracGel Lab core: checks against closed-form values. Run: node fracgel/tests/core-test.js
const c = require('../core.js');
let fails = 0;
const near = (name, got, want, rel = 1e-3) => {
  const ok = Number.isFinite(got) && Math.abs(got - want) <= rel * Math.max(1, Math.abs(want));
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got} (want ${want})`); if (!ok) fails++;
};

// Maxwell: G0 = 10 Pa, τ = 2 s → crossover at ω = 0.5 rad/s, G' = G'' = 5 Pa, η0 = 20 Pa·s
const w = [], gp = [], gpp = [];
for (let k = -2; k <= 2; k += 0.2) { const om = 10 ** k; const m = c.maxwellModel(om, 10, 2); w.push(om); gp.push(m.Gp); gpp.push(m.Gpp); }
const x = c.crossover(w, gp, gpp);
near('crossover ωc', x.wc, 0.5, 2e-2); near('crossover Gc (chord, 5 pts/decade)', x.Gc, 5, 3e-2);
const f = c.fitMaxwell(w, gp, gpp);
near('Maxwell G0', f.G0, 10, 1e-3); near('Maxwell τ', f.tau, 2, 1e-3); near('Maxwell η0', f.eta0, 20, 1e-3);

// Mesh size at 25 °C, G0 = 10 Pa: (kB·298.15/10)^(1/3) ≈ 74.4 nm
near('mesh size', c.meshSizeNm(10, 25), Math.cbrt(c.KB * 298.15 / 10) * 1e9);

// Power law: K = 2 Pa·sⁿ, n = 0.4
const r = [0.1, 1, 10, 100, 1000], eta = r.map(g => 2 * g ** (0.4 - 1));
const p = c.fitPowerLaw(r, eta); near('power-law n', p.n, 0.4); near('power-law K', p.K, 2);
near('η(170) interpolated', c.interpLogLog(r, eta, 170), 2 * 170 ** -0.6, 1e-6);

// Stokes: d = 0.5 mm, Δρ = 1650 kg/m³, η = 0.1 Pa·s
near('Stokes v', c.stokesNewtonian(5e-4, 2650, 1000, 0.1), 1650 * c.G * 2.5e-7 / 1.8);
near('power-law Stokes with n = 1 equals Newtonian', c.stokesPowerLaw(5e-4, 2650, 1000, 0.1, 1), c.stokesNewtonian(5e-4, 2650, 1000, 0.1));

// Desirability
near('d max mid', c.desirability(100, { goal: 'max', lo: 50, hi: 150 }), 0.5);
near('d min mid', c.desirability(3, { goal: 'min', lo: 1, hi: 5 }), 0.5);
near('D geometric mean', c.overallD([0.25, 1], [1, 1]), 0.5);
near('D zero when one fails', c.overallD([0, 1], [1, 1]), 0);
near('synergy', c.synergy(150, 50, 50), 1.5);

// Quadratic surface: exact recovery and optimum inside the box
const box = { x1: [2, 6], x2: [0.4, 1] }, truth = (a, b) => 5 - (a - 3.5) ** 2 - 20 * (b - 0.6) ** 2 + 0.3 * a * b;
const pts = []; for (const a of [2, 4, 6]) for (const b of [0.4, 0.7, 1]) pts.push({ x1: a, x2: b, y: truth(a, b) });
const q = c.quadFit(pts, box);
near('RSM R²', q.r2, 1, 1e-9); near('RSM predict', q.predict(3.1, 0.55), truth(3.1, 0.55), 1e-6);
const o = c.gridOptimum(q.predict, box, 'max', 400);
near('RSM optimum NaOA', o.x1, 3.5 + 0.3 * 0.6 / 2, 2e-2);

// Parsing: tabs with headers and decimal commas, and comma-separated
near('parse tabs', c.parseTable('Angular Frequency\tG\'\tG\'\'\n[rad/s]\t[Pa]\t[Pa]\n0,1\t1,5\t2\n1\t3\t4').length, 2);
near('parse csv', c.parseTable('0.1,1.5,2\n1,3,4')[1][2], 4);

if (fails) { console.error(`${fails} check(s) failed`); process.exit(1); }
console.log('all FracGel core checks passed');

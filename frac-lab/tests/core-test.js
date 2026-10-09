// Checks the Frac-Fluid Lab core against exact solutions, textbook limits and tabulated values.
//   node frac-lab/tests/core-test.js
const L = require('../src/core.js');
const fail = []; const check = (c, msg) => { if (!c) { fail.push(msg); console.log('  FAIL:', msg); } else console.log('  ok  ', msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

console.log('statistics');
check(near(L.tInv(0.975, 1), 12.706, 1e-3) && near(L.tInv(0.975, 10), 2.228, 1e-3) && near(L.tInv(0.975, 1000), 1.962, 1e-3), `t quantiles ${L.tInv(0.975, 1).toFixed(3)} ${L.tInv(0.975, 10).toFixed(3)} ${L.tInv(0.975, 1000).toFixed(3)}`);
{ const lr = L.linreg([1, 2, 3, 4, 5], [2.1, 3.9, 6.2, 7.8, 10.1]); // hand check: b = 1.99, a = 0.05
  check(near(lr.b, 1.99, 1e-9) && Math.abs(lr.a - 0.05) < 1e-9 && lr.r2 > 0.99, `linreg b=${lr.b} a=${lr.a.toFixed(3)} r2=${lr.r2.toFixed(4)}`); }
{ const t = L.parseTable('rate\tvisc\n1,5\t200\n10;20\n3 4\n5,6\n', 2); check(t.length === 4 && t[0][0] === 1.5 && t[3][1] === 6, 'parser: header skipped, decimal comma with tab, comma/space separators'); }

console.log('rheology');
{ const rows = []; for (let i = 0; i < 12; i++) { const g = Math.pow(10, -1 + i * 0.3); rows.push([g, 2.5 * Math.pow(g, 0.45)]); }
  const r = L.rheology(rows, 'tau'); const p = r.fits.PL;
  check(near(p.K, 2.5, 1e-6) && near(p.n, 0.45, 1e-6) && p.r2 > 0.999999, `PL exact data: K=${p.K.toFixed(5)} n=${p.n.toFixed(5)}`);
  const h = r.fits.HB; check(h.tau0 < 1e-4 && near(h.n, 0.45, 1e-3), `HB on PL data: tau0≈0 (${h.tau0.toExponential(2)}), n=${h.n.toFixed(4)}`); }
{ const rows = []; for (let i = 0; i < 14; i++) { const g = Math.pow(10, -1 + i * 0.25); rows.push([g, 4 + 1.2 * Math.pow(g, 0.6)]); }
  const h = L.rheology(rows, 'tau').fits.HB; check(near(h.tau0, 4, 1e-4) && near(h.K, 1.2, 1e-4) && near(h.n, 0.6, 1e-4), `HB exact data: tau0=${h.tau0.toFixed(4)} K=${h.K.toFixed(4)} n=${h.n.toFixed(4)}`); }
{ const rows = []; for (let i = 0; i < 16; i++) { const g = Math.pow(10, -2 + i * 0.3); rows.push([g, 1000 * 0.8 * Math.pow(1 + (2 * g) ** 2, (0.3 - 1) / 2)]); }
  const c = L.rheology(rows, 'eta').fits.CA; check(near(c.eta0, 0.8, 1e-4) && near(c.lambda, 2, 1e-3) && near(c.n, 0.3, 1e-3), `Carreau exact data: eta0=${c.eta0.toFixed(4)} λ=${c.lambda.toFixed(4)} n=${c.n.toFixed(4)}`); }
{ // noisy data: the 95 % CI must cover the true value in most repetitions (Wald CI, nominal 95 %)
  let cover = 0, N = 200, s = 12345; const rn = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(rn() + 1e-12)) * Math.cos(2 * Math.PI * rn());
  for (let k = 0; k < N; k++) { const rows = []; for (let i = 0; i < 10; i++) { const g = Math.pow(10, i * 0.3); rows.push([g, 3 * Math.pow(g, 0.5) * Math.exp(0.05 * gauss())]); }
    const p = L.rheology(rows, 'tau').fits.PL; if (Math.abs(p.n - 0.5) <= p.ci[1]) cover++; }
  check(cover / N > 0.9 && cover / N < 0.99, `CI coverage of n: ${(100 * cover / N).toFixed(0)} % (nominal 95 %)`); }
{ const r = L.rheology([[100, 30], [200, 50], [300, 70]], 'fann'); check(near(r.d.gd[0], 170.23, 1e-4) && near(r.d.tau[0], 15.33, 1e-3), 'Fann 100 rpm -> 170 1/s, 30° -> 15.3 Pa'); }
{ const m = L.rheoFromParams({ K: 0.05, Kunit: 'lbf', n: 0.5 }); check(near(m.p.K, 2.394, 1e-3) && near(m.eta(100), 0.2394, 1e-3), `K′ 0.05 lbf·sⁿ/ft² = ${m.p.K.toFixed(3)} Pa·sⁿ`); }

console.log('thermal');
{ const rows = []; for (let t = 0; t <= 120; t += 5) { const T = t < 20 ? 25 + 65 * t / 20 : 90; rows.push([t, T, 200 * Math.exp(3000 * (1 / (T + 273.15) - 1 / 298.15)) * Math.exp(-0.005 * Math.max(0, t - 20))]); }
  const r = L.thermal(rows, { thr: 50, ref: 'hold' });
  check(near(r.hold.k, 0.005, 1e-6) && near(r.arr.Ea, 3000 * L.R_GAS / 1000, 1e-6), `hold k=${r.hold.k.toFixed(5)}/min, Ea=${r.arr.Ea.toFixed(2)} kJ/mol (exact 24.94)`);
  check(near(r.retention, 100 * Math.exp(-0.005 * 100), 1e-9), `retention ${r.retention.toFixed(2)} % = exp(-0.5)`); }

console.log('viscoelasticity');
{ const rows = []; for (let i = 0; i <= 20; i++) { const w = Math.pow(10, -2 + i * 0.2), wl = w * 0.5, d = 1 + wl * wl; rows.push([w, 10 * wl * wl / d, 10 * wl / d]); }
  const r = L.viscoelastic(rows, { kind: 'freq', xunit: 'rad' });
  check(near(r.wc, 2, 1e-3) && near(r.Gc, 5, 0.05), `Maxwell crossover at ω=1/λ: ωc=${r.wc.toFixed(4)}, Gc=${r.Gc.toFixed(3)} (exact 2, 5; log-log interpolation between points)`);
  check(near(r.maxwell.G, 10, 1e-6) && near(r.maxwell.lambda, 0.5, 1e-6), `Maxwell fit G=${r.maxwell.G.toFixed(4)} λ=${r.maxwell.lambda.toFixed(4)}`);
  check(near(r.slopeG1, 2, 0.01) && near(r.slopeG2, 1, 0.01), `terminal slopes ${r.slopeG1.toFixed(3)}, ${r.slopeG2.toFixed(3)} (2 and 1)`); }
{ const rows = [[0.1, 10, 2], [0.3, 10, 2], [1, 10, 2], [3, 9, 2.5], [10, 7, 3], [30, 3, 4], [100, 1, 3]];
  const r = L.viscoelastic(rows, { kind: 'amp', tol: 5 });
  check(r.lve > 1 && r.lve < 3 && r.flow > 10 && r.flow < 30, `amplitude sweep: LVE limit ${r.lve.toFixed(2)} %, flow point ${r.flow.toFixed(1)} %`); }

console.log('proppant');
{ // Newtonian water-like creeping flow: Stokes v = gΔρd²/(18μ)
  const mu = 0.5, d = 0.6e-3, v = L.settle(() => mu, 1000, 2650, d).v, vs = L.G0 * 1650 * d * d / (18 * mu);
  check(near(v, vs, 3e-3), `Newtonian creeping = Stokes (Re≈1e-3, Schiller-Naumann term 0.1 %) (${(v * 1000).toExponential(4)} mm/s)`);
  // power-law creeping: equals the power-law Stokes analogue
  const K = 2, n = 0.4, vp = L.settle(g => K * Math.pow(g, n - 1), 1000, 2650, d).v, va = L.stokesPL(K, n, 1000, 2650, d);
  check(near(vp, va, 1e-4), `power-law creeping = [gΔρd^(n+1)/(18K)]^(1/n) (${(vp * 1000).toExponential(3)} mm/s)`);
  // water, 0.6 mm sand: Re ~ 50 -> v ~ 8-9 cm/s (standard drag curve)
  const w = L.settle(() => 0.001, 1000, 2650, d); check(w.v > 0.07 && w.v < 0.1 && w.Re > 30, `sand in water: v=${(w.v * 100).toFixed(2)} cm/s, Re=${w.Re.toFixed(0)}`);
  check(near(L.ppaToPhi(2, 2.65), 0.0829, 1e-2), `2 ppa sand -> φ=${L.ppaToPhi(2, 2.65).toFixed(4)}`); }

console.log('breaker');
{ const rows = []; for (const t of [0, 5, 10, 20, 30, 45, 60, 90, 120]) rows.push([t, 4 + 196 * Math.exp(-0.05 * t)]);
  const r = L.breaker(rows, { crit: 10 }); const p = r.plateau;
  check(near(p.k, 0.05, 1e-4) && near(p.etaInf, 4, 1e-3) && near(p.eta0, 200, 1e-4), `breaker fit k=${p.k.toFixed(5)} η∞=${p.etaInf.toFixed(3)} η0=${p.eta0.toFixed(2)}`);
  check(near(r.tBreakModel, -Math.log(6 / 196) / 0.05, 1e-3), `model time to 10 mPa·s = ${r.tBreakModel.toFixed(1)} min`);
  const s = L.residue([[50, 25.0, 25.0070]], 3); check(near(s.mgL, 140, 1e-6) && near(s.pct, 4.6667, 1e-4), `residue 7 mg in 50 mL = ${s.mgL} mg/L, ${s.pct.toFixed(2)} % of polymer`);
  const a = L.arrhenius([[50, 0.01 * Math.exp(-50000 / 8.314462618 * (1 / 323.15 - 1 / 323.15))], [70, 0.01 * Math.exp(-50000 / 8.314462618 * (1 / 343.15 - 1 / 323.15))], [90, 0.01 * Math.exp(-50000 / 8.314462618 * (1 / 363.15 - 1 / 323.15))]]);
  check(near(a.Ea, 50, 1e-6), `breaker Arrhenius Ea=${a.Ea.toFixed(3)} kJ/mol`); }

console.log('fracture');
{ check(near(L.erfcx(0.5), Math.exp(0.25) * 0.4795001222, 2e-7) && near(L.erfcx(3), Math.exp(9) * 2.209049699858544e-5, 2e-7), 'erfcx(0.5), erfcx(3)');
  // Carter, no leak-off: A·w = q·t ; small leak-off: continuous with the series branch
  check(near(L.carterArea(0.05, 600, 0.004, 0, 0) * 0.004, 30, 1e-12), 'Carter C=0: A·w = q·t');
  const a1 = L.carterArea(0.05, 600, 0.004, 1.2e-6, 0), a2 = L.carterArea(0.05, 600, 0.004, 1.3e-6, 0);
  check(a1 > a2 && a1 < 30 / 0.004, 'Carter: area falls as C rises');
  // large leak-off limit: A → q√t/(πC)
  const C = 5e-3, t = 1000, q = 0.05, Al = L.carterArea(q, t, 0.003, C, 0); check(near(Al, q * Math.sqrt(t) / (Math.PI * C), 0.05), 'Carter high-leak-off limit A ≈ q√t/(πC)');
  // Newtonian, no leak-off: reproduce Nordgren and Geertsma-de Klerk time solutions
  const base = { qt: 0.0795, t: 1800, h: 30, E: 20e9, nu: 0.25, CL: 0, Sp: 0, K: 0.1, n: 1 }, G = base.E / 2.5, qw = base.qt / 2, mu = 0.1;
  const p = L.fracture({ ...base, model: 'PKN' }), Ln = 0.68 * Math.pow(G * qw ** 3 / ((1 - 0.25) * mu * 30 ** 4), 0.2) * Math.pow(1800, 0.8), wn = 2.5 * Math.pow((1 - 0.25) * mu * qw * qw / (G * 30), 0.2) * Math.pow(1800, 0.2);
  check(near(p.L, Ln, 0.08) && near(p.ww, wn, 0.03) && near(p.eff, 1, 1e-6), `PKN vs Nordgren: L ${p.L.toFixed(1)} vs ${Ln.toFixed(1)} m, w ${(p.ww * 1000).toFixed(2)} vs ${(wn * 1000).toFixed(2)} mm`);
  const k = L.fracture({ ...base, model: 'KGD' }), Lk = 0.48 * Math.pow(8 * G * qw ** 3 / ((1 - 0.25) * mu * 30 ** 3), 1 / 6) * Math.pow(1800, 2 / 3), wk = 1.32 * Math.pow(8 * (1 - 0.25) * mu * qw ** 3 / (G * 30 ** 3), 1 / 6) * Math.pow(1800, 1 / 3);
  check(near(k.L, Lk, 0.02) && near(k.ww, wk, 0.02), `KGD vs Geertsma-de Klerk: L ${k.L.toFixed(1)} vs ${Lk.toFixed(1)} m, w ${(k.ww * 1000).toFixed(2)} vs ${(wk * 1000).toFixed(2)} mm`);
  // leak-off lowers efficiency and length; more viscous fluid -> wider, shorter (PKN), higher efficiency
  const pl = L.fracture({ ...base, model: 'PKN', CL: 0.001 / Math.sqrt(60), K: 0.5, n: 0.5 }), pl2 = L.fracture({ ...base, model: 'PKN', CL: 0.001 / Math.sqrt(60), K: 2, n: 0.5 });
  check(pl.eff < 1 && pl.eff > 0 && pl2.wb > pl.wb && pl2.eff > pl.eff && pl.conv && pl2.conv, `leak-off: eff ${(pl.eff * 100).toFixed(1)} % -> ${(pl2.eff * 100).toFixed(1)} % with 4× K; w̄ ${(pl.wb * 1000).toFixed(2)} -> ${(pl2.wb * 1000).toFixed(2)} mm`);
  const fl = L.fluidLoss([[1, 22.6 * (0.02 + 0.024)], [4, 22.6 * (0.02 + 0.048)], [9, 22.6 * (0.02 + 0.072)], [16, 22.6 * (0.02 + 0.096)]], 22.6);
  check(near(fl.Cw, 0.012, 1e-9) && near(fl.Sp, 0.02, 1e-9), `fluid loss Cw=${fl.Cw} cm/√min Sp=${fl.Sp} cm`); }

console.log('surface / interfacial tension');
{ const z = L.ringZW(75, 9.549, 0.178, 0.997); check(z.f > 0.92 && z.f < 0.95, `Zuidema-Waters f=${z.f.toFixed(4)} -> γ=${z.gamma.toFixed(2)} mN/m`);
  check(near(L.plate(1.44, 19.6, 0.1, 0), 36.548, 1e-3), `Wilhelmy ${L.plate(1.44, 19.6, 0.1, 0).toFixed(3)} mN/m`);
  // spinning drop: Δρ 0.2 g/cm³, 6000 rpm, r 0.5 mm -> γ = 200·(628.3)²·(5e-4)³/4 N/m
  const sp = L.spinning(1.0, 6000, 0.2, 1, 8), ex = 200 * (2 * Math.PI * 100) ** 2 * (5e-4) ** 3 / 4 * 1000;
  check(near(sp.gamma, ex, 1e-9) && sp.LD === 8, `Vonnegut γ=${sp.gamma.toFixed(3)} mN/m`);
  const rows = []; for (const c of [0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1.5, 3, 6]) rows.push([c, c < 1 ? 30 - 10 * Math.log(c) : 30]);
  const r = L.cmc(rows, { T: 25, nG: 1, g0: 72, molar: 1e-3 }), G = 10e-3 / (L.R_GAS * 298.15);
  check(near(r.cmc, 1, 1e-9) && near(r.gcmc, 30, 1e-9) && near(r.Gamma, G, 1e-9), `CMC ${r.cmc.toFixed(4)} mM, γcmc ${r.gcmc.toFixed(2)}, Γ ${(r.Gamma * 1e6).toFixed(3)} µmol/m², Amin ${r.Amin.toFixed(3)} nm²`);
  check(near(r.C20, Math.exp((72 - 20 - 30) / -10), 1e-9), `C20 ${r.C20.toFixed(4)} mM, pC20 ${r.pC20.toFixed(2)}`); }

console.log('example data');
{ const e = L.makeExample(), pr = L.rheology(L.parseTable(e.rheo, 2), 'eta');
  check(pr.fits.CA && pr.best === 'CA', `example rheology: best model ${pr.best} (n=${pr.fits.CA.n.toFixed(3)}, λ=${pr.fits.CA.lambda.toFixed(3)} s)`);
  const th = L.thermal(L.parseTable(e.thermal, 3), { thr: 50 }); check(th.hold && th.hold.k > 0, `example thermal: retention ${th.retention.toFixed(1)} %`);
  const ve = L.viscoelastic(L.parseTable(e.ve, 3), { kind: 'freq' }); check(ve.wc > 0, `example VE crossover ${ve.wc.toFixed(3)} rad/s`);
  const am = L.viscoelastic(L.parseTable(e.amp, 3), { kind: 'amp', tol: 5 }); check(am.lve > 0 && am.flow > 0, `example amplitude: LVE ${am.lve.toFixed(1)} %, flow point ${am.flow.toFixed(0)} %`);
  const cm = L.cmc(L.parseTable(e.cmc, 2), {}); check(near(cm.cmc, 1, 0.15), `example CMC ${cm.cmc.toFixed(3)}`);
  const fl = L.fluidLoss(L.parseTable(e.fl, 2), 22.6); check(near(fl.Cw, 0.012, 0.1), `example Cw ${fl.Cw.toFixed(4)} cm/√min`); }

console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed');
process.exit(fail.length ? 1 : 0);

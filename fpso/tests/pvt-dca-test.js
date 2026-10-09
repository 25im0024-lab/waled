// PVT correlations and Arps decline tests:  node fpso/tests/pvt-dca-test.js
const P = require('../src/pvt.js'), FD = require('../src/field.js');
const fail = []; const check = (c, msg) => { console.log((c ? '  ok    ' : '  FAIL  ') + msg); if (!c) fail.push(msg); };
const f = (x, n = 2) => (+x).toFixed(n);
// 1. Standing's worked example (350 scf/STB, γg 0.75, 30 °API, 200 °F): chart answer ≈ 1930 psia; the equation is a fit to the chart
{ const pb = P.pbStanding(350 / P.SCF, 0.75, 30, (200 - 32) / 1.8) * P.PSI; check(Math.abs(pb / 1930 - 1) < 0.05, `Standing Pb = ${f(pb, 0)} psia (chart ≈ 1930)`); }
const fl = { api: 35, sg: 0.8, T: 90, Rsb: 150 }, pb = P.props(fl, 100).Pb;
// 2. self-consistency: Rs(Pb) = Rsb, Bo continuous at Pb, trends
{ const a = P.props(fl, pb - 1e-6), b = P.props(fl, pb + 1e-6);
  check(Math.abs(P.rsStanding(pb, fl.sg, fl.api, fl.T) / fl.Rsb - 1) < 1e-3, `Rs(Pb) = Rsb (exponents 1/0.83 vs 1.2048 rounded) (Pb ${f(pb, 1)} bar)`);
  check(Math.abs(a.Bo - b.Bo) < 1e-4 && Math.abs(a.muo - b.muo) < 1e-3, `Bo continuous at Pb (${f(a.Bo, 4)}), μo continuous (${f(a.muo, 3)} cP)`);
  const lo = P.props(fl, pb * 0.5), hi = P.props(fl, pb * 1.5);
  check(lo.Rs < fl.Rsb && lo.Bo < a.Bo && hi.Bo < a.Bo && lo.muo > a.muo && hi.muo > a.muo, `below Pb: Rs ${f(lo.Rs, 0)}, Bo ${f(lo.Bo, 3)}, μo ${f(lo.muo, 2)}; above Pb: Bo ${f(hi.Bo, 3)} (shrinks), μo ${f(hi.muo, 2)} cP`);
  check(a.Bo > 1.2 && a.Bo < 1.7 && a.muo > 0.2 && a.muo < 3, 'Bo and viscosity in a plausible range for a 35 °API, 150 Sm3/Sm3 oil'); }
// 3. gas: z between 0.7 and 1.1, → 1 at low pressure; Bg ∝ z/p
{ const z1 = P.zPapay(1, 90, 0.8), z2 = P.zPapay(200, 90, 0.8), g = P.props(fl, 200);
  check(Math.abs(z1 - 1) < 0.01 && z2 > 0.7 && z2 < 1.05, `z(1 bar) = ${f(z1, 3)}, z(200 bar) = ${f(z2, 3)}`);
  check(g.Bg > 0.003 && g.Bg < 0.008 && g.mug > 0.01 && g.mug < 0.04, `Bg(200 bar) = ${f(g.Bg, 4)} rm3/Sm3, μg = ${f(g.mug, 4)} cP`); }
check(P.check({ api: 70, sg: 0.8, T: 90 }).length === 1, 'out-of-range inputs are flagged');
// 4. Arps: recovers known parameters from a synthetic decline, and EUR is consistent
for (const [qi, Di, b] of [[20000, 0.35, 0], [20000, 0.6, 0.5], [15000, 0.9, 1]]) {
  const ser = Array.from({ length: 60 }, (_, k) => { const t = Date.UTC(2010, k, 15), ty = (t - Date.UTC(2010, 0, 15)) / (365.25 * 864e5); return { t, qo: FD.arpsQ(qi, Di, b, ty) }; });
  const ft = FD.fitArps(ser, 0); check(Math.abs(ft.b - b) <= 0.05 && Math.abs(ft.Di / Di - 1) < 0.08 && Math.abs(ft.qi / qi - 1) < 0.03 && ft.r2 > 0.999, `Arps fit b ${b}: b ${f(ft.b)}, Di ${f(ft.Di, 3)}/yr, qi ${f(ft.qi, 0)}, R² ${f(ft.r2, 4)}`);
  const fc = FD.forecast(ft, 500), qEnd = FD.arpsQ(ft.qi, ft.Di, ft.b, ft.tEnd);
  check(fc.Np > 0 && (fc.points.length === 0 || fc.points[fc.points.length - 1].qo >= 500 * 0.95) && fc.points.every((p, i, a) => !i || p.qo <= a[i - 1].qo), `forecast to 500 Sm3/d from ${f(qEnd, 0)}: ${f(fc.Np / 1e6, 2)} MSm3 remaining, ${fc.points.length} months`);
}
{ let ok = false; try { FD.fitArps([{ t: 0, qo: 1 }], 0); } catch (e) { ok = true; } check(ok, 'too few points is reported'); }
console.log(fail.length ? 'FAILURES: ' + fail.length : 'ALL CHECKS PASSED'); process.exit(fail.length ? 1 : 0);

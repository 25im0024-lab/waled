// Checks the hydraulics core against known limits and hand calculations.
//   node drillers-console/hydraulics/tests/core-test.js
const H = require('../src/core.js');
const fail = []; const check = (c, msg) => { if (!c) { fail.push(msg); console.log('  FAIL:', msg); } else console.log('  ok  ', msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

// 1. Newtonian fluid (n = 1, τy = 0) in laminar pipe flow -> Hagen-Poiseuille: dP/dL = μ·v/(1500·d²) psi/ft (v ft/s, d in, μ cP)
{ const mu = 30, K = mu / 478.8, rh = { n: 1, K, ty: 0 }, d = 4.778, Q = 50, r = H.flow(Q, d, 0, 1000, 9, rh);
  const v = 24.51 * Q / (d * d) / 60, hp = mu * v / (1500 * d * d);
  check(r.regime === 'laminar' && near(r.dPdL, hp, 0.01), `Newtonian laminar pipe = Hagen-Poiseuille (${r.dPdL.toExponential(3)} vs ${hp.toExponential(3)})`);
  // annulus (slot approximation): dP/dL = μ·v/(1000·(d2−d1)²)
  const a = H.flow(Q, 12.25, 5.5, 1000, 9, rh), va = 24.51 * Q / (12.25 ** 2 - 5.5 ** 2) / 60, ha = mu * va / (1000 * 6.75 ** 2);
  check(a.regime === 'laminar' && near(a.dPdL, ha, 0.01), `Newtonian laminar annulus = slot formula (${a.dPdL.toExponential(3)} vs ${ha.toExponential(3)})`);
  // generalized Reynolds number reduces to 928·ρ·v·d/μ
  check(near(r.NRe, 928 * 9 * v * d / mu, 0.01), `Newtonian NRe = 928ρvd/μ (${r.NRe.toFixed(1)})`); }
// 2. Newtonian turbulent friction factor -> close to Blasius 0.0791/Re^0.25 (Fanning)
{ const f = H.friction(1e5, 1).f; check(near(f, 0.0791 / Math.pow(1e5, 0.25), 0.02), `turbulent n=1 ≈ Blasius (${f.toFixed(5)})`); }
// 3. Herschel-Bulkley parameters (API RP 13D): ty = 2R3−R6, n = 3.32 log((R600−ty)/(R300−ty)), K = (R300−ty)/511^n
{ const rh = H.rheology({ r600: 62, r300: 37, r200: 28, r100: 18, r6: 7, r3: 6 });
  check(rh.ty === 5 && near(rh.n, 3.32 * Math.log10(57 / 32), 1e-9) && near(rh.K, 32 / Math.pow(511, rh.n), 1e-9), `HB params ty=${rh.ty} n=${rh.n.toFixed(3)} K=${rh.K.toFixed(4)}`);
  check(rh.PV === 25 && rh.YP === 12, 'PV = R600−R300, YP = R300−PV');
  check(near(rh.model(300), 37, 0.01) && near(rh.model(600), 62, 0.01), 'HB curve passes through R300 and R600'); }
// 4. minimum curvature: vertical, then a straight slant hole at 30°
{ const v = H.survey([[0, 0, 0], [1000, 0, 0]]); check(near(v.tvd(1000), 1000, 1e-9), 'vertical: TVD = MD');
  const s = H.survey([[0, 0, 0], [1000, 0, 0], [1000.0001, 30, 45], [3000, 30, 45]]);
  const exp = 1000 + 2000 * Math.cos(Math.PI / 6); check(near(s.tvd(3000), exp, 1e-4), `slant 30°: TVD = ${s.tvd(3000).toFixed(1)} (exp ${exp.toFixed(1)})`);
  // constant build 3°/100 ft from 0 to 90°: radius R = 18000/(π·3) ; TVD at end = R
  const rows = [[0, 0, 0]]; for (let md = 100; md <= 3000; md += 100) rows.push([md, md * 0.03, 0]);
  const b = H.survey(rows), R = 18000 / (Math.PI * 3); check(near(b.tvd(3000), R, 1e-6) && near(b.st[5].dls, 3, 1e-6), `build 3°/100ft: TVD(90°) = R (${b.tvd(3000).toFixed(2)} vs ${R.toFixed(2)}), DLS 3`); }
// 5. bit: 6×14/32" -> TFA 0.902 in2 ; ΔP = 8.311e-5 ρQ²/(Cd²A²)
{ const b = H.bit(1000, 10, [14, 14, 14, 14, 14, 14], 0.95, 12.25); check(near(b.tfa, 0.9020, 1e-3), `TFA = ${b.tfa.toFixed(4)} in²`);
  check(near(b.dP, 8.311e-5 * 10 * 1e6 / (0.95 ** 2 * b.tfa ** 2), 1e-9) && near(b.vn, 0.3208 * 1000 / b.tfa, 1e-9), `bit ΔP ${b.dP.toFixed(0)} psi, vn ${b.vn.toFixed(0)} ft/s`); }
// 6. pumps: 5.5" × 12" triplex at 95 % -> 0.0838 bbl/stk
{ const p = H.pumps({ liner: 5.5, stroke: 12, eff: 95, spm: [95, 95, 95] }); check(near(p.disp, 0.0838, 0.005), `triplex displacement ${p.disp.toFixed(4)} bbl/stk, Q ${p.Q.toFixed(0)} gpm`); }
// 7. Moore: intermediate regime example
{ const m = H.moore(10, 21.7, 0.25, 144); check(m.regime === 'intermediate' && m.vs > 0.2 && m.vs < 0.5, `Moore vs ${m.vs.toFixed(3)} ft/s (${m.regime}, NRp ${m.nrp.toFixed(1)})`); }
// 8. full example: values in a plausible range and internally consistent
{ const r = H.calc(H.EXAMPLE), sum = r.surf.dP + r.pipeDP + r.bit.dP + r.annDP;
  console.log(`  example: Q ${r.Q.toFixed(0)} gpm, SPP ${r.spp.toFixed(0)} psi (${(r.spp * 0.0689476).toFixed(1)} bar), ECD ${(r.ecd / 8.3454).toFixed(3)} sg, bit ${(r.pctBit * 100).toFixed(0)} %, HSI ${r.bit.hsi.toFixed(2)}, BU ${r.stkBU.toFixed(0)} stk`);
  r.ann.forEach(s => console.log(`    ann ${s.name.padEnd(22)} ${s.top.toFixed(0)}-${s.bot.toFixed(0)} ft dh ${s.dh} V ${s.V.toFixed(0)} ft/min NRe ${s.NRe.toFixed(0)} ${s.regime} dP ${s.dP.toFixed(1)} psi Ft ${s.Ft.toFixed(2)}`));
  r.pipe.forEach(s => console.log(`    pipe ${s.name.padEnd(21)} V ${s.V.toFixed(0)} ft/min NRe ${s.NRe.toFixed(0)} ${s.regime} dP ${s.dP.toFixed(0)} psi`));
  check(Math.abs(sum - r.spp) < 1e-6, 'SPP = surface + string + bit + annulus');
  check(r.spp > 2000 && r.spp < 5000 && r.ecd / 8.3454 > 1.2 && r.ecd / 8.3454 < 1.35, 'example SPP and ECD plausible');
  check(Math.abs(r.stkBU * r.pm.disp - r.capA) < 1e-9, 'bottoms-up strokes = annular volume / displacement');
  check(r.ann.length === 3, 'annulus split at shoe and BHA top'); }
// 9. comparison
{ const inp = JSON.parse(JSON.stringify(H.EXAMPLE)); inp.measured = [{ src: 'test', q: 1000, spp: 2000, ecd: 10.2, ecdDepth: 9000 }];
  const c = H.compare(inp); check(c.length === 1 && c[0].sppC > 0 && c[0].ecdC > inp.mud.mw, `compare: calc SPP ${c[0].sppC.toFixed(0)} vs 2000 (${(c[0].eSpp * 100).toFixed(1)} %)`); }
console.log(fail.length ? 'FAILURES: ' + fail.length : 'ALL CHECKS PASSED'); process.exit(fail.length ? 1 : 0);

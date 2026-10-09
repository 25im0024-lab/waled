/* FPSO Console — black-oil PVT from published correlations (no DOM; window.FPSO_PVT in the browser, module.exports in Node).
   Inputs in SI (bar, °C, Sm3/Sm3); the correlations are evaluated in their native field units.
   - Bubble point and solution GOR: Standing (1947), API Drilling and Production Practice.
   - Oil FVF at and below Pb: Standing (1947). Above Pb: Bo = Bob·exp(co·(Pb − P)), co from Vasquez & Beggs (1980), JPT, SPE-6719-PA.
   - Dead and saturated oil viscosity: Beggs & Robinson (1975), JPT, SPE-5434-PA. Undersaturated: Vasquez & Beggs (1980).
   - Gas pseudo-critical properties: Standing (1977) natural-gas correlation. z-factor: Papay (1968), explicit.
   - Gas viscosity: Lee, Gonzalez & Eakin (1966), JPT, SPE-1340-PA.
   Ranges of the original data apply (e.g. Standing: ~16–64 °API, 0.59–0.95 gas SG, 38–125 °C); outside them results are extrapolations. */
(function (root) {
'use strict';
const PSI = 14.5038, SCF = 5.6146;                 // psi per bar; scf/STB per Sm3/Sm3
const F = c => c * 1.8 + 32, R = c => c * 1.8 + 491.67;
const sgOil = api => 141.5 / (131.5 + api);

function pbStanding(RsSI, sg, api, Tc) { const Rs = RsSI * SCF, a = 0.00091 * F(Tc) - 0.0125 * api; return 18.2 * (Math.pow(Rs / sg, 0.83) * Math.pow(10, a) - 1.4) / PSI; }
function rsStanding(Pbar, sg, api, Tc) { const p = Pbar * PSI, x = 0.0125 * api - 0.00091 * F(Tc); return Math.max(0, sg * Math.pow((p / 18.2 + 1.4) * Math.pow(10, x), 1.2048)) / SCF; }
function boStanding(RsSI, sg, api, Tc) { const Rs = RsSI * SCF; return 0.9759 + 0.00012 * Math.pow(Rs * Math.sqrt(sg / sgOil(api)) + 1.25 * F(Tc), 1.2); }
function coVB(Pbar, RsSI, sg, api, Tc) { const p = Pbar * PSI; return (-1433 + 5 * RsSI * SCF + 17.2 * F(Tc) - 1180 * sg + 12.61 * api) / (1e5 * p) * PSI; }   // 1/bar
function muDead(api, Tc) { const x = Math.pow(F(Tc), -1.163) * Math.exp(6.9824 - 0.04658 * api); return Math.pow(10, x) - 1; }
function muSat(mud, RsSI) { const Rs = RsSI * SCF; return 10.715 * Math.pow(Rs + 100, -0.515) * Math.pow(mud, 5.44 * Math.pow(Rs + 150, -0.338)); }
function muUnder(muob, Pbar, Pb) { const p = Pbar * PSI, m = 2.6 * Math.pow(p, 1.187) * Math.exp(-11.513 - 8.98e-5 * p); return muob * Math.pow(Pbar / Pb, m); }
function pseudoCrit(sg) { return { Tpc: 168 + 325 * sg - 12.5 * sg * sg, Ppc: 677 + 15 * sg - 37.5 * sg * sg }; }   // °R, psia
function zPapay(Pbar, Tc, sg) { const { Tpc, Ppc } = pseudoCrit(sg), Ppr = Pbar * PSI / Ppc, Tpr = R(Tc) / Tpc; return 1 - 3.53 * Ppr / Math.pow(10, 0.9813 * Tpr) + 0.274 * Ppr * Ppr / Math.pow(10, 0.8157 * Tpr); }
function bg(Pbar, Tc, z) { return 0.02827 * z * R(Tc) / (Pbar * PSI); }      // rm3/Sm3 (= ft3/scf)
function muGasLGE(Pbar, Tc, sg, z) { const T = R(Tc), M = 28.97 * sg, rho = Pbar * PSI * M / (z * 10.732 * T) / 62.428, K = (9.4 + 0.02 * M) * Math.pow(T, 1.5) / (209 + 19 * M + T), X = 3.5 + 986 / T + 0.01 * M, Y = 2.4 - 0.2 * X; return 1e-4 * K * Math.exp(X * Math.pow(rho, Y)); }

/* fluid = { api, sg (gas, air = 1), T (°C), Rsb (Sm3/Sm3) }  ->  properties at P (bar) */
function props(fluid, P) {
  const { api, sg, T, Rsb } = fluid, Pb = pbStanding(Rsb, sg, api, T), sat = P <= Pb;
  const Rs = sat ? Math.min(Rsb, rsStanding(P, sg, api, T)) : Rsb, Bob = boStanding(Rsb, sg, api, T);
  const co = sat ? NaN : coVB(P, Rsb, sg, api, T), Bo = sat ? boStanding(Rs, sg, api, T) : Bob * Math.exp(co * (Pb - P));
  const mud = muDead(api, T), muob = muSat(mud, Rsb), muo = sat ? muSat(mud, Rs) : muUnder(muob, P, Pb);
  const z = zPapay(P, T, sg), Bg = bg(P, T, z), mug = muGasLGE(P, T, sg, z);
  const rhoO = (sgOil(api) * 999.0 + Rs * sg * 1.2232) / Bo;                     // reservoir oil density, kg/m3
  return { P, Pb, Rs, Bo, Bob, co, muo, mud, z, Bg, mug, rhoO, rhoSTO: sgOil(api) * 999.0 };
}
function table(fluid, Pmax, n) { const out = []; n = n || 40; for (let k = 1; k <= n; k++) out.push(props(fluid, Pmax * k / n)); return out; }
function check(fluid) {
  const w = []; if (fluid.api < 16 || fluid.api > 64) w.push('API gravity outside Standing data range (16–64)'); if (fluid.sg < 0.59 || fluid.sg > 0.95) w.push('Gas gravity outside Standing data range (0.59–0.95)');
  if (fluid.T < 38 || fluid.T > 125) w.push('Temperature outside Standing data range (38–125 °C)'); return w;
}
const API = { props, table, check, pbStanding, rsStanding, boStanding, zPapay, muDead, sgOil, PSI, SCF };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.FPSO_PVT = API;
})(typeof window !== 'undefined' ? window : globalThis);

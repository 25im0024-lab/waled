// Frac Gel Lab 3D science core: closed-form and literature-order checks. Run: node vlab/tests/model-test.js
const m = require('../js/model.js');
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${got !== undefined ? `: ${got}` : ''}`); if (!ok) fails++; };
const near = (name, got, want, rel = 1e-3) => check(name, Number.isFinite(got) && Math.abs(got - want) <= rel * Math.abs(want), `${got} (want ${want})`);

/* ---------- gel */
near('water viscosity 25 °C (0.890 mPa·s)', m.waterVisc(25), 0.890e-3, 0.02);
near('water viscosity 90 °C (0.315 mPa·s)', m.waterVisc(90), 0.315e-3, 0.05);
near('NaOA 8 g/100 mL in mM', m.toMM(8, m.MW.NaOA), 262.8, 1e-3);
near('salt factor is 1 at the reference recipe', m.saltFactor(m.toMM(1, m.MW.KCl), m.toMM(8, m.MW.NaOA)), 1, 1e-9);
const base = { naoa: 8, kcl: 1, guar: 0, T: 25 };
const w8 = m.wlmParams(base);
near('reference G0', w8.G0, m.REF.G0, 1e-9); near('reference τR', w8.tau, m.REF.tau, 1e-9);
check('η0 rises with NaOA', m.wlmParams({ ...base, naoa: 10 }).eta0 > w8.eta0 && m.wlmParams({ ...base, naoa: 6 }).eta0 < w8.eta0);
check('without KCl the WLM viscosity is far lower', m.wlmParams({ ...base, kcl: 0 }).eta0 < w8.eta0 / 50);
check('salt curve: 3 g KCl is past the maximum', m.wlmParams({ ...base, kcl: 3 }).eta0 < w8.eta0);
check('heating 25 → 90 °C cuts WLM η0 by > 100×', m.wlmParams({ ...base, T: 90 }).eta0 < w8.eta0 / 100);
near('Maxwell crossover at ω = 1/τR', (() => { const r = m.moduli({ ...base }, 1 / w8.tau); return r.Gp / (r.Gpp - m.waterVisc(25) / w8.tau); })(), 1, 1e-9);
check('guar is shear-thinning', m.viscosity({ naoa: 0, kcl: 1, guar: 0.7, T: 25, hydr: 1 }, 170) < m.viscosity({ naoa: 0, kcl: 1, guar: 0.7, T: 25, hydr: 1 }, 0.01));
check('guar loses less than WLM on heating', (() => {
  const g = T => m.guarParams({ guar: 0.5, hydr: 1, T }).eta0;
  return g(90) / g(25) > m.wlmParams({ ...base, T: 90 }).eta0 / w8.eta0;
})());

// breakers
const hc = { ...base, water: 100, hc: 5, stir: true };
for (let i = 0; i < 60; i++) m.stepGel(hc, 60);
check('kerosene breaks the WLM to < 10 mPa·s', m.viscosity(hc, 170) < 0.01, m.viscosity(hc, 170));
check('broken WLM shows microemulsion droplets', m.microState(hc).phase === 'droplets');
const aps25 = { guar: 0.5, water: 100, hydr: 1, aps: 0.05, T: 25, guarM: 1 }; m.stepGel(aps25, 3600);
check('APS is slow at 25 °C (M/M0 > 0.99 after 1 h)', aps25.guarM > 0.99, aps25.guarM.toFixed(4));
const aps90 = { ...aps25, T: 90, guarM: 1 }; m.stepGel(aps90, 2400);
near('APS 0.05 g at 90 °C halves guar M in ~40 min (model calibration)', aps90.guarM, 0.5, 0.03);

// settling
const sw = m.settling(0.6, 2.65, 1.0, () => m.waterVisc(20));
check('0.6 mm sand in water settles at 7–12 cm/s', sw.v > 0.07 && sw.v < 0.12, sw.v.toFixed(4));
near('Stokes limit (η = 10 Pa·s)', m.settling(0.6, 2.65, 1.0, () => 10).v, 1650 * 9.80665 * (0.6e-3) ** 2 / (18 * 10), 1e-3);
check('a bubble rises (negative velocity)', m.settling(1, 0.0012, 1.0, () => 1e-3).v < 0);
check('sand is held by the entangled gel (< 0.01 mm/s)', m.settling(0.6, 2.65, 1.01, r => m.viscosity({ ...base }, r)).v < 1e-5);

// proppant loading and hindered settling
near('4 ppg sand → φ = 0.153', m.ppgToPhi(4), 0.153, 5e-3);
near('6 ppg sand → φ = 0.213', m.ppgToPhi(6), 0.213, 5e-3);
near('Richardson–Zaki n at low Re', m.rzExponent(0.01), 4.65, 1e-9);
near('Richardson–Zaki n at high Re', m.rzExponent(1000), 2.39, 1e-9);
const h4 = m.hinderedSettling(0.6, 2.65, 1.01, r => m.viscosity({ ...base }, r), 4), h6 = m.hinderedSettling(0.6, 2.65, 1.01, r => m.viscosity({ ...base }, r), 6);
check('6 ppg settles slower than 4 ppg (hindered)', h6.v < h4.v && h4.v < h4.v0);

// surface and interfacial tension
near('surface tension of water at 25 °C', m.surfaceTension({}), 72.0, 1e-9);
check('NaOA above the CMC lowers surface tension to the plateau', m.surfaceTension(base) < 30);
near('3:1 dilution keeps NaOA above the CMC, so γ is unchanged', m.surfaceTension({ ...base, naoa: 2, kcl: 0.25 }), m.surfaceTension(base), 1e-9);
check('surfactant lowers IFT against oil', m.interfacialTension(base) < m.interfacialTension({}) / 5);

// Cannon-Fenske
near('efflux time: ν = 1.2 mm²/s in size 25', m.effluxTime(1.2, 25), 600, 1e-9);
check('recommended size gives t ≥ 200 s', [0.9, 3, 12, 60].every(nu => m.effluxTime(nu, m.recommendSize(nu)) >= 200));
check('size 25 for a water-like broken fluid (ν = 0.6 mm²/s)', m.recommendSize(0.6) === 25);
near('density of water at 30 °C', m.fluidDensity({ T: 30 }), 0.99565, 5e-4);

// micro-structure
check('no salt → short micelles', ['spheres', 'rods'].includes(m.microState({ naoa: 8, kcl: 0 }).phase));
check('with KCl → entangled worms', m.microState(base).phase === 'entangled');
check('guar only → guar chains', m.microState({ guar: 0.5, kcl: 1 }).phase === 'guar');

// FracGel import: units
const fg = { samples: { '8|0.5': { G0: 20, tauR: 2, eta0: null, eta170_25: 150, settle: 3 } } };
const r = m.measuredFor(fg, 8, 0.5);
check('FracGel import: η0 from G0·τR and η170 from mPa·s', r && r.eta0 === 40 && r.eta170 === 0.15 && r.settleMmMin === 3);
check('FracGel import: missing sample → null', m.measuredFor(fg, 6, 0.3) === null);

if (fails) { console.error(`${fails} check(s) failed`); process.exit(1); }
console.log('all Frac Gel Lab 3D model checks passed');

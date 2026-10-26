// Virtual Lab science core: closed-form and literature-order checks. Run: node vlab/tests/model-test.js
const m = require('../js/model.js');
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${got !== undefined ? `: ${got}` : ''}`); if (!ok) fails++; };
const near = (name, got, want, rel = 1e-3) => check(name, Number.isFinite(got) && Math.abs(got - want) <= rel * Math.abs(want), `${got} (want ${want})`);

/* ---------- flame tests */
const y = m.wavelengthToRGB(589);
check('589 nm renders yellow-orange', y[0] > 0.9 && y[1] > 0.6 && y[2] === 0, y.map(v => v.toFixed(2)).join(','));
check('cobalt glass blocks the Na D lines', m.cobaltT(589.0) < 0.05);
check('cobalt glass passes K violet and deep red', m.cobaltT(404.4) > 0.5 && m.cobaltT(766.5) > 0.5);
check('NaCl flame is dominated by Na', m.flameEmission({ NaCl: 1 }).dominant === 'Na');
const mix = m.flameEmission({ NaCl: 0.1, KCl: 1 }, { cobalt: true });
const peak = s => Math.max(...mix.lines.filter(l => l.salt === s).map(l => l.I));
check('through cobalt glass, K lines outshine Na traces', peak('KCl') > 5 * peak('NaCl'));
check('every salt has its textbook strongest atomic line',
  [['LiCl', 670.8], ['NaCl', 589.0], ['KCl', 766.5], ['BaCl2', 553.5]].every(([s, nm]) => m.SALTS[s].lines.some(l => l.nm === nm && l.I === 1)));
const loop = m.dipLoop(m.newLoop(), 'CuCl2', false);
m.dipHCl(loop); for (let i = 0; i < 40; i++) m.heatLoop(loop, 0.1);
check('HCl + flame cleans the loop within 4 s', m.loopClean(loop));
const dirty = m.dipLoop(m.newLoop(), 'CuCl2', false); for (let i = 0; i < 40; i++) m.heatLoop(dirty, 0.1);
check('flame alone (no HCl) leaves residue after 4 s', !m.loopClean(dirty));

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
const aps80 = { ...aps25, T: 80, guarM: 1 }; m.stepGel(aps80, 600);
near('APS at 80 °C halves guar M in 10 min (model calibration)', aps80.guarM, 0.5, 1e-3);

// settling
const sw = m.settling(0.6, 2.65, 1.0, () => m.waterVisc(20));
check('0.6 mm sand in water settles at 7–12 cm/s', sw.v > 0.07 && sw.v < 0.12, sw.v.toFixed(4));
near('Stokes limit (η = 10 Pa·s)', m.settling(0.6, 2.65, 1.0, () => 10).v, 1650 * 9.80665 * (0.6e-3) ** 2 / (18 * 10), 1e-3);
check('a bubble rises (negative velocity)', m.settling(1, 0.0012, 1.0, () => 1e-3).v < 0);
check('sand is held by the entangled gel (< 0.01 mm/s)', m.settling(0.6, 2.65, 1.01, r => m.viscosity({ ...base }, r)).v < 1e-5);

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
console.log('all Virtual Lab model checks passed');

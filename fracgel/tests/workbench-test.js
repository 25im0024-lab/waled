// Rheology Workbench Excel reader: sheets given as arrays of rows, as SheetJS returns them. Run: node fracgel/tests/workbench-test.js
const W = require('../workbench.js');
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${got !== undefined ? `: ${got}` : ''}`); if (!ok) fails++; };

const sheets = {
  Results: [
    ['Sample', 'NaOA (g/100 mL water)', 'KCl (g/100 mL)', 'Guar (g/100 mL)', 'pH', 'η0 Carreau (Pa·s)', 'k power-law (Pa·sⁿ)', 'n power-law', 'η @100 s⁻¹ (mPa·s)', 'η @170 s⁻¹ (mPa·s)', 'τR = 1/ωc (s)', 'G0 Maxwell (Pa)', 'Ea (kJ/mol)'],
    ['S8-0.5', 8, 1, 0.5, '10', 36.98, 41.66, 0.08, 589.47, 357.45, 0.35, 120.7, 64.8],
    ['S8-0.7', 8, 1, 0.7, '', null, null, null, null, null, null, null, null],
    ['G0.7-K', 0, 1, 0.7, '10', 0.36, 0.88, 0.5, 90, 70, null, null, null],
  ],
  Steady: [
    ['S8-0.5', null, 'G0.7-K', null],
    ['Shear rate (1/s)', 'Viscosity (Pa·s)', 'Shear rate (1/s)', 'Viscosity (Pa·s)'],
    [0.1, 41.3, 0.1, 0.35], [10, 4.2, 10, 0.2], [100, 0.59, null, null],
  ],
  Frequency: [
    ['S8-0.5', 'S8-0.5 G″', null, 'G0.7-K', 'G0.7-K G″', null],
    ['ω (rad/s)', "G' (Pa)", 'G″ (Pa)', 'ω (rad/s)', "G' (Pa)", 'G″ (Pa)'],
    [0.1, 0.49, 4.28, null, null, null], [1, 20, 30, null, null, null], [10, 110, 25, null, null, null],
  ],
  Temperature: [
    ['S8-0.5', null], ['T (°C)', 'η (mPa·s)'], [40, 650], [65, 300], [89, 43.7],
  ],
};

const p = W.parse(sheets);
check('S8-0.5 found with its composition', p.samples['8|0.5'] && p.samples['8|0.5'].naoa === 8 && p.samples['8|0.5'].guar === 0.5);
check('G0.7-K found as guar-only control', p.samples['0|0.7'] && p.samples['0|0.7'].curves.flow.length === 2);
check('an empty row is reported, not imported', !p.samples['8|0.7'] && p.report.some(r => r.name === 'S8-0.7' && r.empty));
check('frequency blocks are 3 wide', p.samples['8|0.5'].curves.freq.length === 3 && p.samples['8|0.5'].curves.freq[0].length === 3);
check('incomplete rows are dropped', p.samples['0|0.7'].curves.flow.every(r => r.every(Number.isFinite)));
const s = W.applyToSample({ testT: 90, settle: 2.5, notes: 'keep me' }, p.samples['8|0.5']);
check('η at 100 1/s goes to eta100_25', s.eta100_25 === 589.47);
check('Results fields copied (pH, η0, n, K, G0, τR)', s.pH === 10 && s.eta0 === 36.98 && s.n === 0.08 && s.K === 41.66 && s.G0 === 120.7 && s.tauR === 0.35);
check('fields absent from the file are kept', s.settle === 2.5 && s.notes === 'keep me');
check('test temperature capped at the sweep maximum', s.testT === 89 && s.eta100_T === 43.7, `${s.testT} °C, ${s.eta100_T} mPa·s`);
check('curves stored as FracGel text columns', W.rowsOf(s.freq).length === 3 && W.rowsOf(s.flow).length === 3 && W.rowsOf(s.tempCurve).length === 3);
check('sample names parse', JSON.stringify(W.parseName('S10-0.3')) === '{"naoa":10,"guar":0.3}' && W.parseName('G0.5-K').guar === 0.5 && W.parseName('x') === null);

if (fails) { console.error(`${fails} check(s) failed`); process.exit(1); }
console.log('all Workbench reader checks passed');

// Field-data import and calibration tests:  node fpso/tests/field-test.js
// The CSV snippets below are synthetic test fixtures (format checks only), not field data.
const FD = require('../src/field.js'), F = require('../src/sim.js');
const fail = []; const check = (c, msg) => { console.log((c ? '  ok    ' : '  FAIL  ') + msg); if (!c) fail.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);
// 1. Sodir monthly format: volumes per month -> Sm3/d, two fields grouped
{ const csv = 'prfInformationCarrier,prfYear,prfMonth,prfPrdOilNetMillSm3,prfPrdGasNetBillSm3,prfPrdNGLNetMillSm3,prfPrdCondensateNetMillSm3,prfPrdOeNetMillSm3,prfPrdProducedWaterInFieldMillSm3,prfNpdidInformationCarrier\n'
    + 'FIELD A,2010,1,0.62,0.155,0.01,0,0.8,0.31,1\nFIELD A,2010,2,0.56,0.14,0.01,0,0.7,0.28,1\nFIELD B,2010,1,0.10,0.01,0,0,0.11,0.0,2\n';
  const r = FD.parse(csv), a = r.entities['FIELD A'];
  check(/monthly/.test(r.format) && Object.keys(r.entities).length === 2, 'Sodir monthly recognised, 2 fields');
  check(near(a[0].qo, 0.62e6 / 31, 1e-9) && near(a[1].qo, 0.56e6 / 28, 1e-9) && near(a[0].qg, 0.155e9 / 31, 1e-9), `rates: Jan oil ${a[0].qo.toFixed(0)} Sm3/d, Feb ${a[1].qo.toFixed(0)}, gas ${(a[0].qg / 1e6).toFixed(2)} MSm3/d`);
  const st = FD.stats(a); check(near(st[0].wc, 0.31 / 0.93, 1e-9) && near(st[0].gor, 155000 / 620, 1e-9), `WC ${(st[0].wc * 100).toFixed(1)} %, GOR ${st[0].gor.toFixed(0)}`); }
// 2. Volve-style daily per well, with field total
{ const csv = 'DATEPRD,WELL_BORE_CODE,NPD_WELL_BORE_NAME,ON_STREAM_HRS,AVG_DOWNHOLE_PRESSURE,AVG_WHP_P,AVG_CHOKE_SIZE_P,BORE_OIL_VOL,BORE_GAS_VOL,BORE_WAT_VOL\n'
    + '07-Apr-14,W1,15/9-X-1,24,250,30,50,1000,150000,100\n07-Apr-14,W2,15/9-X-2,24,240,28,45,500,70000,600\n08-Apr-14,W1,15/9-X-1,24,249,30,50,990,149000,110\n';
  const r = FD.parse(csv), tot = r.entities['Field total (all wells)'];
  check(/Volve/.test(r.format) && tot.length === 2 && tot[0].qo === 1500 && tot[0].qw === 700, `Volve daily: total ${tot[0].qo} Sm3/d oil on ${tot[0].label}, ${Object.keys(r.entities).length - 1} wells`); }
// 3. Generic CSV in field units
{ const r = FD.parse('Date;Oil (bbl/d);Gas (MMscf/d);Water (bbl/d)\n2021-01-31;10000;20;5000\n2021-02-28;9500;19;5500\n'), d = r.entities.Data;
  check(near(d[0].qo, 10000 * 0.158987, 1e-6) && near(d[0].qg, 20e6 * 0.0283168, 1e-6), `generic: ${d[0].qo.toFixed(0)} Sm3/d oil, ${(d[0].qg / 1e6).toFixed(3)} MSm3/d gas (semicolon, field units)`); }
// 4. bad file
{ let ok = false; try { FD.parse('a,b\n1,2\n'); } catch (e) { ok = /Unrecognised/.test(e.message); } check(ok, 'unrecognised columns are reported'); }
// 5. calibration reproduces a target period (larger than the training FPSO)
for (const tg of [{ qo: 25000, qw: 9000, qg: 3.6e6 }, { qo: 6000, qw: 14000, qg: 0.7e6 }]) {
  const r = FD.calibrate(F, tg, { name: 'TEST' });
  console.log(`   target oil ${tg.qo} water ${tg.qw} gas ${(tg.qg / 1e6).toFixed(2)}M -> model ${r.model.qo.toFixed(0)} / ${r.model.qw.toFixed(0)} / ${(r.model.qg / 1e6).toFixed(2)}M, size ×${r.size}, J ${r.J}, GTs ${r.gts}, iterations ${r.iterations}`);
  check(Math.abs(r.err.qo) < 5 && Math.abs(r.err.qw) < 5 && Math.abs(r.err.qg) < 6, `calibrated within 5 % (oil ${r.err.qo.toFixed(1)} %, water ${r.err.qw.toFixed(1)} %, gas ${r.err.qg.toFixed(1)} %)`);
  check(r.sim.alarmList().filter(a => a.prio === 1).length === 0, 'no critical alarms in the calibrated plant: ' + r.sim.alarmList().map(a => a.id));
}
FD.restore(F.CFG); check(F.CFG.wells[0].J === 80 && F.CFG.field === 'Block 7 (training field)', 'restore brings back the training field');
console.log(fail.length ? 'FAILURES: ' + fail.length : 'ALL CHECKS PASSED'); process.exit(fail.length ? 1 : 0);

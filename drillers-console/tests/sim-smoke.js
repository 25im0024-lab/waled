const { RigSim } = require('../sim.js');
const f = (x, n = 1) => (x === undefined || x === null) ? '-' : (+x).toFixed(n);
function snap(m, tag) {
  const s = m.s, d = m.d;
  console.log(`${tag.padEnd(14)} t=${f(s.t / 60, 1)}min Dh=${f(s.Dh, 1)} bit=${f(m.bitDepth(), 1)} blk=${f(s.blockH, 1)} WOB=${f(d.wob)} ROP=${f(d.rop)} RPM=${f(d.rpm, 0)} TQ=${f(d.torque)} HL=${f(d.hl, 0)} SPP=${f(d.spp)} Pc=${f(d.pc)} Qin=${f(d.qin, 0)} Qout=${f(d.qout, 0)} pitΔ=${f(d.pitDelta, 2)} ECD=${f(d.ecd, 3)} OB=${f(s.overbal)} gas=${f(d.gas, 0)} AD=${m.ad.state} conn=${m.m.active ? m.m.step + 1 : '-'} slips=${s.inSlips}`);
}
const run = (m, sec, dt = 0.25) => { for (let t = 0; t < sec; t += dt) m.step(dt); };
const fail = []; const check = (c, msg) => { if (!c) { fail.push(msg); console.log('  FAIL:', msg); } };

// 1. hot start steady drilling
let m = new RigSim(); snap(m, 'hot start');
check(m.d.spp > 150 && m.d.spp < 280, 'SPP plausible'); check(Math.abs(m.d.wob - 120) < 15, 'WOB near SP');
check(m.d.rop > 8 && m.d.rop < 40, 'ROP plausible'); check(m.d.hl > 1100 && m.d.hl < 1600, 'hook load plausible');
check(Math.abs(m.d.pitDelta) < 0.5, 'pit steady'); check(m.alarmList().length === 0, 'no alarms at hot start: ' + m.alarmList().map(a => a.id));
// 2. drill to stand end -> auto connection -> resume
let sawConn = false, t0 = m.s.t;
for (let i = 0; i < 4 * 3600 * 4 && m.s.stands < 1; i++) { m.step(0.25); if (m.m.active) sawConn = true; if (i % 4000 === 0) snap(m, 'drilling'); }
snap(m, 'after conn'); check(sawConn && m.s.stands >= 1, 'auto connection completed');
run(m, 300); snap(m, 'resumed'); check(m.ad.state === 'CONTROL' || m.ad.state === 'ROP LIMIT' || m.ad.state === 'TORQUE LIMIT', 'AD back in control: ' + m.ad.state);
console.log('alarms:', m.log.filter(l => l.type === 'ALARM').map(l => l.id).join(','));
// 3. kick scenario, detection, shut-in, kill with auto choke
m = new RigSim(); m.zeroPit(); m.scenario('kick'); 
for (let i = 0; i < 4 * 300 && !m.alarm.KICK.active; i++) { m.step(0.25); }
snap(m, 'kick +60s'); check(m.alarm.KICK.active || m.alarm.PITGAIN.active, 'kick detected');
// driller response
m.c.ad.on = false; m.c.td.dir = 'OFF'; m.hoist(1); run(m, 3); m.hoist(0); m.c.pumps.forEach(p => p.on = false); run(m, 30);
m.bopCmd('annular', 'CLOSED'); run(m, 40); snap(m, 'shut-in'); run(m, 300); snap(m, 'shut-in +5m');
const ks = m.killSheet(); console.log('kill sheet', ks); check(ks && ks.sidpp > 0 && ks.sicp >= ks.sidpp - 1, 'SIDPP/SICP');
// circulate kick out: open HCR, choke 20%, start 1 pump slow, hold DP pressure
m.bopCmd('hcr', 'OPEN'); m.c.bop.choke = 25; run(m, 5);
m.c.pumps[0].spm = 40; m.c.pumps[0].on = true; m.c.pumps[1].on = false; m.c.pumps[2].on = false;
run(m, 60); m.recordSCR(); const icp = ks.sidpp + 8 + (m.d.spp - m.d.pc); console.log('  ICP target', f(icp)); m.c.bop.chokeTarget = icp; m.c.bop.chokeAuto = true;
for (let i = 0; i < 40; i++) { run(m, 600); snap(m, 'kill circ'); console.log('   gas m', f(m.s.gas.m, 0), 'zb', f(m.s.gas.zb, 0), 'choke%', f(m.c.bop.choke), 'bhp', f(m.s.bhp), 'pp', f(m.s.pp)); if (m.s.gas.m === 0) break; }
snap(m,'gas out'); console.log('  bhp',f(m.s.bhp),'pp+kick',f(m.s.pp+60));
check(m.s.gas.m === 0, 'gas circulated out'); check(!m.s.bop.failed, 'no BOP failure');
// 4. loss + LCM
m = new RigSim(); m.zeroPit(); m.scenario('loss'); run(m, 300); snap(m, 'loss'); check(m.alarm.LOWFLOW.active || m.alarm.PITLOSS.active, 'loss detected'); m.pumpLCM(); m.pumpLCM(); run(m, 200); snap(m, 'after LCM');
// 5. washout, packoff, plug
for (const sc of ['washout', 'packoff', 'plug', 'pump2']) { m = new RigSim(); m.scenario(sc); run(m, 600); snap(m, sc); console.log('   alarms', m.alarmList().map(a => a.id).join(',')); }
// 6. drill into gas sand with geohazards
m = new RigSim(); m.c.ad.ropTarget = 40; m.zeroPit();
for (let i = 0; i < 12 * 3600 * 2 && !m.alarm.KICK.active && !m.alarm.PITGAIN.active; i++) { m.step(0.5); if (i % 7200 === 0) snap(m, 'to sand'); }
snap(m, 'sand kick'); check(m.s.Dh > 3215, 'kick from gas sand');
// 7. cold start
m = new RigSim({ hot: false }); run(m, 10); snap(m, 'cold');
console.log(fail.length ? 'FAILURES: ' + fail.length : 'ALL CHECKS PASSED');
process.exit(fail.length ? 1 : 0);

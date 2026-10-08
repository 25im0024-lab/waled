// FPSO Console physics smoke test:  node fpso/tests/sim-smoke.js
const { FpsoSim, CFG, ipr } = require('../src/sim.js');
const fail = []; const check = (c, msg) => { console.log((c ? '  ok    ' : '  FAIL  ') + msg); if (!c) fail.push(msg); };
const f = (x, n = 1) => (+x).toFixed(n);
const run = (m, sec, dt = 2) => { for (let t = 0; t < sec; t += dt) m.step(dt); };

// 1. IPR: straight line above Pb, Vogel below, continuous at Pb
{ const J = 50, Pr = 300, Pb = 220; check(Math.abs(ipr(J, Pr, 250, Pb) - J * 50) < 1e-9, 'IPR linear above Pb');
  check(Math.abs(ipr(J, Pr, Pb + 1e-9, Pb) - ipr(J, Pr, Pb - 1e-9, Pb)) < 1e-3, 'IPR continuous at Pb');
  check(ipr(J, Pr, 0, Pb) > ipr(J, Pr, 100, Pb) && ipr(J, Pr, 0, Pb) < J * Pr, 'Vogel rate at Pwf=0 below straight-line AOF'); }
// 2. hot start: steady, plausible, no alarms
let m = new FpsoSim(); const s = m.s, d = m.d;
console.log(`hot: oil ${f(s.sep.qoOut, 0)} Sm3/d (${f(s.sep.qoOut * 6.2898 / 1000)} kbbl/d), gas ${f(s.wellsQin.g / 1e6, 2)} MSm3/d, Psep ${f(s.sep.P, 2)}, Pman ${f(s.Pman)}, power ${f(s.power.demand)} MW, VRR ${f(d.vrr, 2)}, offset ${f(s.moor.offset)} m`);
check(s.sep.qoOut > 12000 && s.sep.qoOut < 20000, 'oil rate 75–125 kbbl/d');
check(Math.abs(s.sep.P - CFG.sep.Pset) < 0.3 && Math.abs(s.sep.LT - 55) < 2, 'separator on set-points');
check(m.alarmList().length === 0, 'no alarms at hot start: ' + m.alarmList().map(a => a.id));
check(s.power.demand > 20 && s.power.demand < 60 && !s.power.diesel, 'power 20–60 MW on fuel gas');
// 3. choke closed -> that well stops; more choke -> more rate
{ const q0 = s.wells[0].q; m.c.wells[0].choke = 40; run(m, 300); check(s.wells[0].q < q0, `P-1 choke 75→40 %: ${f(q0, 0)} → ${f(s.wells[0].q, 0)} Sm3/d`); m.c.wells[0].choke = 75; run(m, 300); }
// 4. gas lift raises the rate of the high-water-cut well P-4
{ m.c.wells[3].lift = 0; run(m, 600); const q0 = s.wells[3].q; m.c.wells[3].lift = 0.4; run(m, 600); check(s.wells[3].q > q0 * 1.05, `gas lift on P-4: ${f(q0, 0)} → ${f(s.wells[3].q, 0)} Sm3/d`); }
// 5. compressor train trip -> separator pressure up, flaring
{ m.scenario('comptrip'); run(m, 900); check(s.sep.flareQ > 0.3 && m.alarm.COMP_TRIP.active, `train A trip: flare ${f(s.sep.flareQ, 2)} MSm3/d, Psep ${f(s.sep.P, 2)}`); m.restartComp(0); run(m, 600); check(s.sep.flareQ < 0.1, 'restart: flaring back to purge'); }
// 6. ESD: wells shut in, blowdown, then hydrate risk during cooldown unless MEG
{ m.esd(); run(m, 600); check(s.wellsQin.L < 1 && s.sep.P < 6, `ESD: flow ${f(s.wellsQin.L, 0)}, Psep ${f(s.sep.P, 2)} bar after blowdown`);
  run(m, 12 * 3600, 10); check(m.alarm.HYD.active, `after 12 h shut-in: Tarr ${f(s.Tarr)} °C < Thyd ${f(d.Thyd)} °C -> hydrate alarm`);
  m.c.meg = true; run(m, 600, 10); check(!m.alarm.HYD.active, `MEG injected: Thyd ${f(d.Thyd)} °C, alarm cleared`);
  m.resetEsd(); m.c.meg = false; run(m, 4 * 3600, 5); check(s.sep.qoOut > 10000, `restart after ESD: oil ${f(s.sep.qoOut, 0)} Sm3/d`); }
// 7. offloading: tanker sequence moves cargo
{ m = new FpsoSim(); const c0 = m.s.cargo; m.callTanker(); run(m, 30 * 3600, 5);
  check(m.s.cum.offloaded > 100000 && m.s.cargo < c0, `offloaded ${f(m.s.cum.offloaded, 0)} m3, cargo ${f(c0, 0)} → ${f(m.s.cargo, 0)} m3, tanker ${m.s.tanker.st}`); }
// 8. weather: offloading stops with emergency disconnect in a storm
{ m = new FpsoSim(); m.callTanker(); run(m, 4 * 3600, 5); const st = m.s.tanker.st; m.scenario('storm'); run(m, 600, 5);
  check(st === 'offloading' && ['disconnect', 'departing', 'none'].includes(m.s.tanker.st), `storm during offloading: ${st} → ${m.s.tanker.st}`); }
// 9. mooring: storm + line failure -> offset and tension alarms
{ m = new FpsoSim(); m.scenario('storm'); m.scenario('line'); run(m, 1800); check(m.alarm.OFFSET.active && m.alarm.MOOR_FAIL.active, `storm + line failure: offset ${f(m.s.moor.offset)} m, Tmax ${f(m.d.Tmax, 0)} kN`);
  const ok = m.s.moor.T.every((t, j) => m.s.moor.failed[j] ? t === 0 : t > 0); check(ok, 'failed line carries no tension'); }
// 10. low rate -> riser slugging indicator; separator level control holds
{ m = new FpsoSim(); m.c.wells.forEach((w, i) => { w.choke = i === 0 ? 25 : 0; }); run(m, 3 * 3600); check(m.s.slug > 0.25 && m.alarm.SLUG.active, `low rate ${f(m.s.wellsQin.L, 0)} Sm3/d: slug index ${f(m.s.slug, 2)}`);
  check(m.s.sep.LT > 30 && m.s.sep.LT < 80, `separator level held during slugging (${f(m.s.sep.LT)} %)`); }
// 11. reservoir: no injection -> pressure falls faster than with injection
{ const a = new FpsoSim(), b = new FpsoSim(); a.c.decline = b.c.decline = 200; b.c.wi.on = false; run(a, 6 * 3600, 5); run(b, 6 * 3600, 5);
  check(b.s.Pr < a.s.Pr - 1, `pressure support: with WI ${f(a.s.Pr)} bar, without ${f(b.s.Pr)} bar`); }
// 12. cold start
{ const c = new FpsoSim({ hot: false }); run(c, 60); check(c.s.wellsQin.L === 0 && c.alarmList().every(a => a.prio > 1 || a.id === 'HYD'), 'cold start: wells closed'); }
console.log(fail.length ? 'FAILURES: ' + fail.length : 'ALL CHECKS PASSED'); process.exit(fail.length ? 1 : 0);

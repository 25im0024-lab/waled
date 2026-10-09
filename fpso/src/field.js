/* FPSO Console — field data: import real production history (CSV) and calibrate the simulator to a chosen period.
   Formats recognised:
   1. Sodir (Norwegian Offshore Directorate) FactPages, field production monthly or yearly:
      prfInformationCarrier, prfYear, prfMonth, prfPrdOilNetMillSm3, prfPrdGasNetBillSm3, prfPrdCondensateNetMillSm3, prfPrdProducedWaterInFieldMillSm3 ...
      (volumes per period: oil/condensate/water in million Sm3, gas in billion Sm3)
   2. Equinor Volve daily production per well: DATEPRD, NPD_WELL_BORE_NAME, BORE_OIL_VOL, BORE_GAS_VOL, BORE_WAT_VOL (Sm3 per day)
   3. Generic: a date (or year + month) column and oil / gas / water rate columns; units from the header
      (Sm3/d by default; bbl, stb, scf, Mscf, MMscf recognised). An optional well/field column groups the rows.
   No DOM here: runs in the browser (window.FPSO_FIELD) and in Node (module.exports). */
(function (root) {
'use strict';
const BBL = 0.158987, SCF = 0.0283168;

function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '', delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.includes('\t') && !first.includes(',') ? '\t' : ',');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true; else if (ch === delim) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(c => c.trim() !== '')) rows.push(row); row = []; } else cell += ch;
  }
  row.push(cell); if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows.map(r => r.map(c => c.trim()));
}
const num = s => { if (s === undefined || s === null) return NaN; s = String(s).trim(); if (!s) return NaN; if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.'); else s = s.replace(/,/g, ''); return parseFloat(s); };
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseDate(s) {
  s = String(s || '').trim(); let m;
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s))) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{1,2})[-/ .]([A-Za-z]{3})[A-Za-z]*[-/ .](\d{2,4})/.exec(s))) { const y = +m[3] < 100 ? 2000 + +m[3] - (+m[3] > 50 ? 100 : 0) : +m[3]; const mo = MON[m[2].toLowerCase()]; if (mo !== undefined) return Date.UTC(y, mo, +m[1]); }
  if ((m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/.exec(s))) return Date.UTC(+m[3], +m[2] - 1, +m[1]);       // dd/mm/yyyy (European)
  if ((m = /^(\d{4})[-/](\d{1,2})$/.exec(s))) return Date.UTC(+m[1], +m[2] - 1, 15);
  if ((m = /^(\d{4})$/.exec(s))) return Date.UTC(+m[1], 6, 1);
  const t = Date.parse(s); return isFinite(t) ? t : NaN;
}
const daysIn = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const finish = (map, format, notes) => {
  const entities = {};
  for (const [k, arr] of map) { const a = arr.filter(p => isFinite(p.t) && (p.qo > 0 || p.qg > 0 || p.qw > 0)).sort((x, y) => x.t - y.t); if (a.length) entities[k] = a; }
  return { format, notes, entities };
};
function push(map, k, p) { if (!map.has(k)) map.set(k, []); map.get(k).push(p); }

function parse(text) {
  const rows = parseCSV(text); if (rows.length < 2) throw new Error('No data rows found');
  const H = rows[0].map(h => h.replace(/^"|"$/g, '')), lc = H.map(h => h.toLowerCase()), col = re => lc.findIndex(h => re.test(h));
  const body = rows.slice(1);
  // 1. Sodir FactPages
  if (lc.includes('prfinformationcarrier') && lc.includes('prfyear')) {
    const iF = lc.indexOf('prfinformationcarrier'), iY = lc.indexOf('prfyear'), iM = lc.indexOf('prfmonth'),
      iO = lc.indexOf('prfprdoilnetmillsm3'), iC = lc.indexOf('prfprdcondensatenetmillsm3'), iG = lc.indexOf('prfprdgasnetbillsm3'), iW = lc.indexOf('prfprdproducedwaterinfieldmillsm3');
    if (iO < 0 || iG < 0) throw new Error('Sodir file without oil/gas columns');
    const map = new Map();
    for (const r of body) {
      const y = num(r[iY]), m = iM >= 0 ? num(r[iM]) : NaN; if (!isFinite(y)) continue;
      const monthly = isFinite(m), days = monthly ? daysIn(y, m - 1) : (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 366 : 365);
      const v = i => (i >= 0 && isFinite(num(r[i])) ? num(r[i]) : 0);
      push(map, r[iF], { t: monthly ? Date.UTC(y, m - 1, 15) : Date.UTC(y, 6, 1), label: monthly ? `${y}-${String(m).padStart(2, '0')}` : String(y),
        qo: (v(iO) + v(iC)) * 1e6 / days, qg: v(iG) * 1e9 / days, qw: v(iW) * 1e6 / days, days });
    }
    return finish(map, iM >= 0 ? 'Sodir FactPages — monthly field production' : 'Sodir FactPages — yearly field production',
      ['Oil = net oil + condensate (NGL not included).', 'Rates are period volumes divided by calendar days (average, including downtime).']);
  }
  // 2. Volve daily production (Equinor open data)
  if (lc.includes('dateprd') && lc.includes('bore_oil_vol')) {
    const iD = lc.indexOf('dateprd'), iWb = lc.indexOf('npd_well_bore_name') >= 0 ? lc.indexOf('npd_well_bore_name') : lc.indexOf('wellbore_code'),
      iO = lc.indexOf('bore_oil_vol'), iG = lc.indexOf('bore_gas_vol'), iW = lc.indexOf('bore_wat_vol'), iH = lc.indexOf('on_stream_hrs'),
      iP = lc.indexOf('avg_downhole_pressure'), iWh = lc.indexOf('avg_whp_p'), iCh = lc.indexOf('avg_choke_size_p');
    const map = new Map(), tot = new Map();
    for (const r of body) {
      const t = parseDate(r[iD]); if (!isFinite(t)) continue;
      const v = i => (i >= 0 && isFinite(num(r[i])) ? num(r[i]) : 0), p = { t, label: new Date(t).toISOString().slice(0, 10), qo: v(iO), qg: v(iG), qw: v(iW), hrs: iH >= 0 ? num(r[iH]) : NaN, bhp: iP >= 0 ? num(r[iP]) : NaN, whp: iWh >= 0 ? num(r[iWh]) : NaN, choke: iCh >= 0 ? num(r[iCh]) : NaN };
      if (iWb >= 0) push(map, r[iWb], p);
      const a = tot.get(t) || { t, label: p.label, qo: 0, qg: 0, qw: 0 }; a.qo += p.qo; a.qg += p.qg; a.qw += p.qw; tot.set(t, a);
    }
    const all = new Map([['Field total (all wells)', [...tot.values()]], ...map]);
    return finish(all, 'Equinor Volve — daily production per well', ['Daily volumes per wellbore (Sm3/d). Field total = sum of wellbores.', 'Pressures (BHP, WHP) are in bar where present.']);
  }
  // 3. Generic
  const iDate = col(/^(date|dato|time|day|period)/), iYear = col(/^year|^yr$|^år$/), iMon = col(/^month|^mnd|^mon$/);
  const iO = col(/oil|crude|^qo/), iG = col(/gas|^qg/), iW = col(/water|^qw|wat/), iE = col(/well|field|felt|bore|entity|name/);
  if (iO < 0 || (iDate < 0 && iYear < 0)) throw new Error('Unrecognised columns. Need a date (or year + month) column and an oil column; gas and water are optional.');
  const unit = (i, gas) => { if (i < 0) return 1; const h = lc[i]; if (gas) { if (/mmscf/.test(h)) return 1e6 * SCF; if (/mscf/.test(h)) return 1e3 * SCF; if (/scf/.test(h)) return SCF; if (/(msm3|1e6|e6m3)/.test(h)) return 1e6; return 1; } if (/(mbbl|kbbl|mstb)/.test(h)) return 1e3 * BBL; if (/(bbl|stb|bopd|bwpd)/.test(h)) return BBL; return 1; };
  const uO = unit(iO), uG = unit(iG, true), uW = unit(iW), map = new Map();
  for (const r of body) {
    let t = NaN, label = '';
    if (iDate >= 0) { t = parseDate(r[iDate]); label = isFinite(t) ? new Date(t).toISOString().slice(0, 10) : ''; }
    else { const y = num(r[iYear]), m = iMon >= 0 ? num(r[iMon]) : NaN; t = isFinite(m) ? Date.UTC(y, m - 1, 15) : Date.UTC(y, 6, 1); label = isFinite(m) ? `${y}-${String(m).padStart(2, '0')}` : String(y); }
    const v = (i, u) => (i >= 0 && isFinite(num(r[i])) ? num(r[i]) * u : 0);
    push(map, iE >= 0 && r[iE] ? r[iE] : 'Data', { t, label, qo: v(iO, uO), qg: v(iG, uG), qw: v(iW, uW) });
  }
  return finish(map, 'Generic CSV (rates per day)', [`Units read from the headers: oil ×${uO.toPrecision(3)}, gas ×${uG.toPrecision(3)}, water ×${uW.toPrecision(3)} → Sm3/d.`]);
}

function stats(series) {
  let cum = 0, prev = null; return series.map(p => { if (prev) cum += p.qo * (p.days || Math.max(1, (p.t - prev.t) / 864e5)); else cum += p.qo * (p.days || 1); prev = p;
    const L = p.qo + p.qw; return Object.assign({}, p, { wc: L > 0 ? p.qw / L : 0, gor: p.qo > 0 ? p.qg / p.qo : 0, cumO: cum }); });
}

/* ---------- calibration: make the simulator reproduce one field period ---------- */
let DEFAULT = null;
const deep = o => JSON.parse(JSON.stringify(o));
function restore(CFG) { if (!DEFAULT) return; for (const k of Object.keys(DEFAULT)) CFG[k] = deep(DEFAULT[k]); }
function calibrate(F, target, opts) {
  const CFG = F.CFG; opts = opts || {};
  if (!DEFAULT) DEFAULT = deep(CFG); else restore(CFG);
  const qo = Math.max(0, target.qo), qw = Math.max(0, target.qw), qg = Math.max(0, target.qg), qL = qo + qw;
  if (qo < 1) throw new Error('The selected period has no oil production');
  const wcT = qL > 0 ? qw / qL : 0, gorT = qg / qo;
  // spread around the field values keeps the four wells different, as in a real field
  const W = CFG.wells, wcAvg = W.reduce((a, w) => a + w.wc, 0) / W.length, gorAvg = W.reduce((a, w) => a + w.gor, 0) / W.length;
  W.forEach(w => { w.wc = Math.min(0.97, Math.max(0, wcT + (w.wc - wcAvg) * 0.35 * (1 - wcT))); w.wcMax = Math.min(0.98, Math.max(w.wcMax, w.wc + 0.1)); w.gor = Math.max(5, gorT * w.gor / gorAvg); });
  // facilities sized for the field (at least the training FPSO, with ~20 % margin)
  const g6 = qg / 1e6;
  CFG.comp.train = Math.max(CFG.comp.train, +(g6 * 0.6).toFixed(2)); CFG.exportCap = Math.max(CFG.exportCap, +(g6 * 1.25).toFixed(2));
  CFG.pw.cap = Math.max(CFG.pw.cap, Math.round(qw * 1.25)); CFG.wi.cap = Math.max(CFG.wi.cap, Math.round(qL * 1.3 * CFG.Bo));
  CFG.field = opts.name || 'Field data'; if (opts.wd) CFG.wd = opts.wd;
  // iterate a size factor until the simulated liquid rate matches the field: productivity, choke capacity, tubing and riser
  // friction and separator volume scale together (like a field with more or larger wells of the same design)
  let sim, hist = [], S = 1;
  const lift = () => (wcT > 0.4 ? 0.15 : 0) * S;
  const settle = () => { const m = new F.FpsoSim({ hot: true }); m.c.wells.forEach(w => { w.open = true; w.choke = 85; w.lift = lift(); }); m.c.wi.rate = Math.min(CFG.wi.cap, m.c.wi.rate * S); for (let t = 0; t < 3 * 3600; t += 5) m.step(5); return m; };
  for (let it = 0; it < 10; it++) {
    sim = settle(); const m = sim.s, qs = m.wellsQin.L, gM = (m.wellsQin.g - m.wells.reduce((x, w) => x + (w.lift || 0), 0)) / Math.max(1, m.wellsQin.o), wM = m.wellsQin.w / Math.max(1, qs); hist.push(qs);
    const r = Math.min(4, Math.max(0.25, qL / Math.max(qs, 1)));
    if (Math.abs(r - 1) < 0.01 && Math.abs(gM / gorT - 1) < 0.01 && Math.abs(wM - wcT) < 0.005) break;
    W.forEach(w => { w.gor *= gorT / Math.max(gM, 1); w.wc = Math.min(0.97, Math.max(0, w.wc + (wcT - wM))); w.wcMax = Math.min(0.98, Math.max(w.wcMax, w.wc + 0.1)); });
    S *= r; W.forEach(w => { w.J *= r; }); CFG.choke *= r; CFG.tub.kf /= r * r; CFG.riser.kr /= r * r; CFG.sep.V *= r; CFG.sep.Vliq *= r;
  }
  // enough generation for the larger compression / injection load
  for (let k = 0; k < 6 && sim.s.power.demand > 0.85 * CFG.power.gts * CFG.power.gtUnit; k++) { CFG.power.gts++; sim = settle(); }
  const s = sim.s, mod = { qo: s.sep.qoOut || s.wellsQin.o, qw: s.wellsQin.w, qg: s.wellsQin.g - s.wells.reduce((a, w) => a + (w.lift || 0), 0) };
  const err = (a, b) => b > 0 ? (a - b) / b * 100 : 0;
  return { sim, target: { qo, qw, qg, wc: wcT, gor: gorT }, model: { qo: s.wellsQin.o, qw: mod.qw, qg: mod.qg, wc: mod.qw / Math.max(1, s.wellsQin.o + mod.qw), gor: mod.qg / Math.max(1, s.wellsQin.o) },
    err: { qo: err(s.wellsQin.o, qo), qw: err(mod.qw, qw), qg: err(mod.qg, qg) }, iterations: hist.length, size: +S.toFixed(2), J: W.map(w => +w.J.toFixed(1)), gts: CFG.power.gts, lift: lift() };
}

const API = { parseCSV, parse, parseDate, stats, calibrate, restore };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.FPSO_FIELD = API;
})(typeof window !== 'undefined' ? window : globalThis);

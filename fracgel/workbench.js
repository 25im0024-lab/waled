/* Read a "Rheology Workbench" Excel export (sheets Results, Steady, Frequency, Temperature, …) into
   FracGel Lab sample fields. No DOM: the browser passes the sheets as arrays of rows (SheetJS
   sheet_to_json with header: 1), and the Node tests pass the same arrays directly.
   Loaded as a classic script (global FracWorkbench) by FracGel Lab and the 3D lab. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.FracWorkbench = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SHEAR = 100; // 1/s: the shear rate of the viscosity readings in both tools

  const num = v => {
    if (v === null || v === undefined || v === '') return null;
    const x = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(x) ? x : null;
  };
  /* Sample code → composition: S8-0.5 → NaOA 8, guar 0.5; G0.7-K → guar 0.7; K → blank */
  function parseName(name) {
    const s = String(name || '').trim();
    let m = /^S(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/i.exec(s); if (m) return { naoa: +m[1], guar: +m[2] };
    m = /^G(\d+(?:\.\d+)?)-K$/i.exec(s); if (m) return { naoa: 0, guar: +m[1] };
    if (/^K( \(blank\))?$/i.test(s)) return { naoa: 0, guar: 0 };
    return null;
  }

  /* Results sheet: one row per sample, columns found by their headers */
  const RESULT_COLS = {
    naoa: /^NaOA/i, kcl: /^KCl/i, guar: /^Guar/i, pH: /^pH$/i,
    eta0: /η0 Carreau/i, K: /^k power-law/i, n: /^n power-law/i, eta100: /η @100/i, eta170: /η @170/i,
    G0: /G0 Maxwell/i, tauR: /τR = 1\/ωc/i, wc: /ωc crossover/i, Ea: /^Ea \(kJ/i, SI: /Synergy index/i,
  };
  function parseResults(rows) {
    const out = {};
    if (!rows || !rows.length) return out;
    const head = rows[0].map(h => String(h ?? ''));
    const col = {};
    for (const [k, re] of Object.entries(RESULT_COLS)) col[k] = head.findIndex(h => re.test(h));
    for (const r of rows.slice(1)) {
      const name = r && r[0] !== null && r[0] !== undefined ? String(r[0]).trim() : '';
      if (!name) continue;
      const v = {};
      for (const [k, j] of Object.entries(col)) if (j >= 0) v[k] = num(r[j]);
      out[name] = v;
    }
    return out;
  }

  /* Data sheets: blocks side by side. Row 0 holds the sample name at the first column of each block,
     row 1 the column labels; a block is 3 wide when its third label is G″ (frequency, amplitude). */
  function parseBlocks(rows) {
    const out = {};
    if (!rows || rows.length < 3) return out;
    const r0 = rows[0], r1 = rows[1] || [];
    for (let j = 0; j < r0.length; j++) {
      const name = r0[j]; if (name === null || name === undefined || name === '' || /G″|G''/.test(String(name))) continue;
      const w = /G″|G''/.test(String(r1[j + 2] ?? '')) ? 3 : 2;
      const pts = [];
      for (const r of rows.slice(2)) {
        const p = Array.from({ length: w }, (_, k) => num(r[j + k]));
        if (p.every(x => x !== null)) pts.push(p);
      }
      if (pts.length) out[String(name).trim()] = pts;
    }
    return out;
  }

  /* Linear interpolation of y at x on (x, y) points sorted by x; null outside the range */
  function interp(pts, x) {
    const s = [...pts].sort((a, b) => a[0] - b[0]);
    if (!s.length || x < s[0][0] || x > s[s.length - 1][0]) return null;
    for (let i = 0; i + 1 < s.length; i++) if (x <= s[i + 1][0]) { const u = (x - s[i][0]) / (s[i + 1][0] - s[i][0] || 1); return s[i][1] + u * (s[i + 1][1] - s[i][1]); }
    return s[s.length - 1][1];
  }

  /* All sheets → { samples: { 'naoa|guar': { name, naoa, kcl, guar, fields, curves } }, report: [...] } */
  function parse(sheets) {
    const res = parseResults(sheets.Results);
    const blocks = {
      flow: parseBlocks(sheets.Steady), freq: parseBlocks(sheets.Frequency), temp: parseBlocks(sheets.Temperature),
      amp: parseBlocks(sheets.Amplitude), time: parseBlocks(sheets.Time),
    };
    const names = new Set([...Object.keys(res), ...Object.values(blocks).flatMap(b => Object.keys(b))]);
    const samples = {}, report = [];
    for (const name of names) {
      const r = res[name] || {}, byName = parseName(name);
      const naoa = r.naoa ?? (byName && byName.naoa), guar = r.guar ?? (byName && byName.guar);
      if (naoa === null || naoa === undefined || guar === null || guar === undefined) { report.push({ name, skipped: true }); continue; }
      const curves = { flow: blocks.flow[name] || [], freq: blocks.freq[name] || [], temp: blocks.temp[name] || [], amp: blocks.amp[name] || [], time: blocks.time[name] || [] };
      const fields = {};
      for (const k of ['pH', 'eta0', 'K', 'n', 'G0', 'tauR', 'Ea', 'SI']) if (r[k] !== null && r[k] !== undefined) fields[k] = r[k];
      if (r.eta100 !== null && r.eta100 !== undefined) fields.eta100_25 = r.eta100;
      const has = Object.keys(fields).length > 0 || Object.values(curves).some(c => c.length);
      if (r.kcl !== null && r.kcl !== undefined) fields.kcl = r.kcl;
      if (!has) { report.push({ name, empty: true }); continue; }
      samples[`${+naoa}|${+guar}`] = { name, naoa: +naoa, guar: +guar, fields, curves };
      report.push({ name, key: `${+naoa}|${+guar}`, results: Object.keys(fields).length, flow: curves.flow.length, freq: curves.freq.length, temp: curves.temp.length });
    }
    return { samples, report };
  }

  /* Write one parsed sample into a FracGel sample object (fields present in the file win; the rest stay) */
  function applyToSample(s, p) {
    Object.assign(s, p.fields);
    if (p.curves.freq.length) s.freq = 'ω [rad/s]\tG\' [Pa]\tG\'\' [Pa]\n' + p.curves.freq.map(r => r.join('\t')).join('\n');
    if (p.curves.flow.length) { s.flow = 'γ̇ [1/s]\tη [Pa·s]\n' + p.curves.flow.map(r => r.join('\t')).join('\n'); s.flowUnit = 'Pa·s'; }
    if (p.curves.temp.length) {
      s.tempCurve = 'T [°C]\tη [mPa·s] at 100 1/s\n' + p.curves.temp.map(r => r.join('\t')).join('\n');
      const tMax = Math.max(...p.curves.temp.map(r => r[0]));
      const target = num(s.testT) !== null && num(s.testT) <= tMax ? num(s.testT) : Math.round(tMax);
      const e = interp(p.curves.temp, Math.min(target, tMax));
      if (e !== null) { s.testT = target; s.eta100_T = +e.toPrecision(4); }
    }
    return s;
  }

  /* Text columns (as stored in FracGel samples) → number rows; header lines are skipped */
  function rowsOf(text) {
    const out = [];
    for (const line of String(text || '').split(/\r?\n/)) {
      const p = line.trim().split(/[\t;]+|\s+/).map(Number);
      if (p.length >= 2 && p.every(Number.isFinite)) out.push(p);
    }
    return out;
  }

  return { SHEAR, parseName, parseResults, parseBlocks, parse, applyToSample, interp, rowsOf };
});

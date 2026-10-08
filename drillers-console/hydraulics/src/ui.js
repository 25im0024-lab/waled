/* Field Hydraulics — UI: input forms (stored in oilfield units), results tables and charts. */
(function () {
'use strict';
const H = window.FH, $ = id => document.getElementById(id);
const I = window.I18N || { t: x => x, f: (x, v) => x.replace(/\{(\w+)\}/g, (m, k) => v[k]), lang: 'en' };
const T = x => I.t(x), F = (x, v) => I.f(x, v);
const clone = o => JSON.parse(JSON.stringify(o));
const KEY = 'fh-state-v1';
let S = load() || clone(H.EXAMPLE);

/* ---------------- units ---------------- */
const UL = { len: { m: 'm', ft: 'ft' }, dens: { sg: 'sg', ppg: 'ppg' }, flow: { lpm: 'L/min', gpm: 'gpm' }, press: { bar: 'bar', psi: 'psi', kPa: 'kPa' } };
const u = q => S.units[q];
const lab = q => q === 'rop' ? UL.len[u('len')] + '/h' : q === 'in' ? 'in' : UL[q] ? UL[q][u(q)] : '';
const disp = (q, v) => (q === 'rop' ? H.toDisp('len', u('len'), v) : UL[q] ? H.toDisp(q, u(q), v) : v);
const intl = (q, x) => (q === 'rop' ? H.toInt('len', u('len'), x) : UL[q] ? H.toInt(q, u(q), x) : x);
const DEC = { len: 2, dens: 3, flow: 1, press: 1, rop: 2, in: 4, num: 4 };
const nf = (x, d) => (x === null || x === undefined || !isFinite(x)) ? '—' : (+x).toFixed(d);
const fq = (q, v, d) => nf(disp(q, v), d === undefined ? DEC[q] : d);
const fu = (q, v, d) => fq(q, v, d) + ' ' + lab(q);
const SI = () => u('len') === 'm';
const vel = vFtMin => SI() ? nf(vFtMin * 0.3048, 1) + ' m/min' : nf(vFtMin, 0) + ' ft/min';
const vol = bbl => SI() ? nf(bbl * 0.158987, 1) + ' m³' : nf(bbl, 0) + ' bbl';

/* ---------------- state helpers ---------------- */
const get = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
function set(o, p, v) { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.well && s.units ? s : null; } catch (e) { return null; } }
function toast(t) { const e = document.createElement('div'); e.textContent = T(t); $('toast').appendChild(e); setTimeout(() => e.remove(), 4200); }

/* ---------------- forms ---------------- */
const FIELDS = {
  fWell: [['well.name', 'Well name', 'text'], ['well.td', 'Total depth (MD)', 'len'], ['well.bitDepth', 'Bit depth (MD), 0 = at TD', 'len']],
  fHole: [['hole.id', 'Hole / bit size', 'in'], ['hole.washout', 'Open-hole washout (% of diameter)', 'num']],
  fSurf: [['surface.len', 'Equivalent length', 'len'], ['surface.id', 'Inside diameter', 'in']],
  fMud: [['mud.mw', 'Mud weight', 'dens'], ['mud.r600', 'R600', 'num'], ['mud.r300', 'R300', 'num'], ['mud.r200', 'R200', 'num'], ['mud.r100', 'R100', 'num'], ['mud.r6', 'R6', 'num'], ['mud.r3', 'R3', 'num'],
    ['mud.ds', 'Cutting size', 'in'], ['mud.rhos', 'Cutting density (sg)', 'num'], ['ops.rop', 'ROP (for cuttings load)', 'rop']],
  fPumps: [['pumps.liner', 'Liner', 'in'], ['pumps.stroke', 'Stroke', 'in'], ['pumps.eff', 'Volumetric efficiency (%)', 'num'], ['pumps.spm.0', 'Pump 1 SPM', 'num'], ['pumps.spm.1', 'Pump 2 SPM', 'num'], ['pumps.spm.2', 'Pump 3 SPM', 'num'], ['pumps.qOverride', 'Flow rate override (0 = from pumps)', 'flow']],
  fBit: [['bit.nozzles', 'Nozzles (1/32 in, comma-separated)', 'list'], ['bit.cd', 'Discharge coefficient Cd', 'num'], ['bit.extra', 'MWD / motor ΔP at this flow', 'press']],
  fOps: [['ops.maxSpp', 'Max. pump pressure (liner rating)', 'press'], ['ops.fgShoe', 'Fracture gradient at shoe (EMW)', 'dens']],
};
const TABLES = {
  casing: { el: 'fCasing', cols: [['name', 'Name', 'text'], ['id', 'ID', 'in'], ['top', 'Top (MD)', 'len'], ['shoe', 'Shoe (MD)', 'len']], blank: () => ({ name: '', id: 0, top: 0, shoe: 0 }) },
  string: { el: 'fString', cols: [['name', 'Component', 'text'], ['od', 'OD', 'in'], ['id', 'ID', 'in'], ['len', 'Length', 'len']], blank: () => ({ name: '', od: 0, id: 0, len: 0 }) },
  measured: { el: 'fMeas', cols: [['src', 'Source', 'text'], ['q', 'Flow rate', 'flow'], ['spp', 'SPP', 'press'], ['ecd', 'ECD (PWD)', 'dens'], ['ecdDepth', 'PWD depth (MD)', 'len']], blank: () => ({ src: '', q: 0, spp: 0, ecd: 0, ecdDepth: 0 }) },
};
function inputHtml(path, q, v) {
  if (q === 'text') return `<input type="text" data-k="${path}" data-q="text" value="${String(v || '').replace(/"/g, '&quot;')}">`;
  if (q === 'list') return `<input type="text" dir="ltr" data-k="${path}" data-q="list" value="${(v || []).join(', ')}">`;
  return `<input type="number" step="any" data-k="${path}" data-q="${q}" value="${v === undefined || v === null || v === '' ? '' : +(+disp(q, +v)).toFixed(DEC[q] + 2)}">`;
}
function renderForms() {
  for (const [el, fs] of Object.entries(FIELDS)) $(el).innerHTML = fs.map(([p, l, q]) => `<label>${T(l)}${lab(q) && q !== 'num' ? ' <em>(' + lab(q) + ')</em>' : ''}${inputHtml(p, q, get(S, p))}</label>`).join('');
  for (const [k, t] of Object.entries(TABLES)) {
    const rows = S[k] || [];
    $(t.el).innerHTML = `<table class="tbl"><thead><tr>${t.cols.map(([, l, q]) => `<th>${T(l)}${lab(q) && q !== 'text' ? ' (' + lab(q) + ')' : ''}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map((r, i) =>
      `<tr>${t.cols.map(([c, , q]) => `<td>${inputHtml(`${k}.${i}.${c}`, q, r[c])}</td>`).join('')}<td><button class="btn x" data-del="${k}.${i}" title="${T('Delete row')}">✕</button></td></tr>`).join('')}</tbody></table>${rows.length ? '' : `<p class="note">${T('No rows.')}</p>`}`;
  }
  $('survey').value = (S.survey || []).map(r => [+(+disp('len', r[0])).toFixed(2), r[1], r[2]].join('\t')).join('\n');
  document.querySelectorAll('[data-unit]').forEach(s => { s.value = S.units[s.dataset.unit]; });
}
function onInput(e) {
  const el = e.target, p = el.dataset.k; if (!p) return;
  const q = el.dataset.q; let v;
  if (q === 'text') v = el.value; else if (q === 'list') v = el.value.split(/[,;\s]+/).map(Number).filter(x => x > 0);
  else { const x = parseFloat(el.value); v = isFinite(x) ? intl(q, x) : 0; }
  set(S, p, v); schedule();
}
function parseSurvey(txt) {
  const rows = [];
  for (const line of txt.split(/\r?\n/)) {
    const nums = line.replace(/,(?=\d{3}\b)/g, '').split(/[\s,;\t]+/).map(Number).filter(x => isFinite(x));
    if (nums.length >= 2 && line.trim() && !/^[a-z]/i.test(line.trim())) rows.push([intl('len', nums[0]), nums[1], nums[2] || 0]);
  }
  return rows;
}

/* ---------------- results ---------------- */
let timer = 0; function schedule() { clearTimeout(timer); timer = setTimeout(() => { save(); calc(); }, 150); }
function kpi(label, value, sub, cls) { return `<div class="kpi"><span>${T(label)}</span><b class="${cls || ''}">${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`; }
function calc() {
  let r; try { r = H.calc(S); } catch (e) { $('kpis').innerHTML = `<div class="wn r">${T('Calculation error — check the inputs.')} (${e.message})</div>`; return; }
  const sppCls = S.ops.maxSpp > 0 && r.spp > S.ops.maxSpp ? 'r' : 'g';
  const shoeTxt = r.ecdShoe === null ? '—' : fu('dens', r.ecdShoe), fgCls = !(S.ops.fgShoe > 0) || r.ecdShoe === null ? 'c' : r.ecdShoe > S.ops.fgShoe ? 'r' : r.ecdShoe > S.ops.fgShoe * 0.98 ? 'a' : 'g';
  const va = r.ann.map(s => s.V), jet = SI() ? nf(r.bit.vn * 0.3048, 0) + ' m/s' : nf(r.bit.vn, 0) + ' ft/s';
  $('resQ').textContent = `${fu('flow', r.Q)} · MW ${fu('dens', r.rho)} · ${T('bit at')} ${fu('len', r.g.B, 1)}`;
  $('kpis').innerHTML = [
    kpi('Flow rate', fu('flow', r.Q), `${nf(r.pm.spm, 0)} spm · ${SI() ? nf(r.pm.disp * 158.987, 2) + ' L/stk' : nf(r.pm.disp, 4) + ' bbl/stk'}`, 'c'),
    kpi('Standpipe pressure (calc.)', fu('press', r.spp), F('pump HHP {h}', { h: nf(r.hhpPump, 0) + ' hp' }), sppCls),
    kpi('ECD at bit', fu('dens', r.ecd), F('with cuttings {v}', { v: fu('dens', r.ecdCut) }), 'c'),
    kpi('ECD at shoe', shoeTxt, S.ops.fgShoe > 0 ? F('FG {v}', { v: fu('dens', S.ops.fgShoe) }) : '', fgCls),
    kpi('Bit ΔP', fu('press', r.bit.dP), F('{p} % of SPP', { p: nf(r.pctBit * 100, 0) }), 'w'),
    kpi('HSI', nf(r.bit.hsi, 2) + ' hp/in²', F('jet {v} · TFA {a} in²', { v: jet, a: nf(r.bit.tfa, 3) }), 'w'),
    kpi('Jet impact force', SI() ? nf(r.bit.fj * 4.44822e-3, 2) + ' kN' : nf(r.bit.fj, 0) + ' lbf', '', 'w'),
    kpi('Annular velocity', va.length ? `${vel(Math.min(...va))} – ${vel(Math.max(...va))}` : '—', T('min – max over sections'), 'c'),
    kpi('Surface → bit', `${nf(r.stkBit, 0)} stk`, `${nf(r.tBit, 1)} min · ${vol(r.capP)}`, 'w'),
    kpi('Bottoms-up', `${nf(r.stkBU, 0)} stk`, `${nf(r.tBU, 1)} min · ${vol(r.capA)}`, 'w'),
    kpi('Annular friction', fu('press', r.annDP), F('string {s} · surface {f}', { s: fu('press', r.pipeDP, 0), f: fu('press', r.surf.dP, 0) }), 'w'),
    kpi('Rheology', `n ${nf(r.rh.n, 3)} · τy ${nf(r.rh.ty, 1)}`, `K ${nf(r.rh.K, 4)} lbf·sⁿ/100ft² · R² ${nf(r.rh.r2, 4)}`, r.rh.ok ? 'w' : 'r'),
  ].join('');
  const W = { rheology: ['r', 'Rheology fit failed — check the Fann readings (R600 > R300 > R200 > R100 > R6 > R3).'],
    deviated: ['a', F('Maximum inclination {i}° > 30°: the Moore slip velocity and the Ft / Ca hole-cleaning indicators are for near-vertical wells only. Use a deviated-well hole-cleaning model.', { i: nf(r.maxInc, 1) })],
    lowFt: ['a', 'Transport ratio below 0.5 in at least one annular section.'], spp: ['r', 'Calculated SPP exceeds the maximum pump pressure.'], frac: ['r', 'ECD at the shoe exceeds the fracture gradient.'] };
  $('warns').innerHTML = r.warn.map(w => `<div class="wn ${W[w][0]}">${T(W[w][1])}</div>`).join('') + (r.ann.some(s => s.regime === 'transitional') ? `<div class="wn i">${T('Some sections are in transitional flow: the friction factor there is an interpolation and is the least certain part of the result.')}</div>` : '');
  renderPipe(r); renderAnn(r); renderRheo(r); renderSurvey(r); renderCmp(); drawBreak(r); drawRheo(r); drawEcd(r); drawPath(r);
  const sv = r.sv.st; $('survNote').textContent = F('{n} stations · TVD at bit {t} · max inclination {i}° · max DLS {d}', { n: sv.length, t: fu('len', r.tvdBit, 1), i: nf(r.maxInc, 1), d: nf(Math.max(...sv.map(s => s.dls)) * (SI() ? 30 / 30.48 : 1), 2) + (SI() ? '°/30 m' : '°/100 ft') });
}
const regime = x => `<span class="${x === 'laminar' ? 'c' : x === 'turbulent' ? 'a' : 'r'}">${T(x)}</span>`;
function renderPipe(r) {
  const rows = [{ name: T('Surface lines'), top: null, ...r.surf, id: S.surface.id, len: S.surface.len }].concat(r.pipe);
  $('pipeTab').innerHTML = `<table class="res"><thead><tr><th>${T('Section')}</th><th>${T('Interval')} (${lab('len')})</th><th>ID (in)</th><th>${T('Velocity')}</th><th>γw (1/s)</th><th>τw (lbf/100ft²)</th><th>NRe</th><th>${T('Regime')}</th><th>f</th><th>ΔP (${lab('press')})</th></tr></thead><tbody>${rows.map(s =>
    `<tr><td>${s.name}</td><td>${s.top === null ? fq('len', s.len, 0) : fq('len', s.top, 0) + '–' + fq('len', s.bot, 0)}</td><td>${nf(s.id, 3)}</td><td>${vel(s.V)}</td><td>${nf(s.gw, 0)}</td><td>${nf(s.tw, 1)}</td><td>${nf(s.NRe, 0)}</td><td>${regime(s.regime)}</td><td>${nf(s.f, 5)}</td><td>${fq('press', s.dP, 1)}</td></tr>`).join('')}
    <tr><td>${T('Bit nozzles')}</td><td colspan="8">TFA ${nf(r.bit.tfa, 3)} in² · ${(S.bit.nozzles || []).join('/')} /32"</td><td>${fq('press', r.bit.dP, 1)}</td></tr>
    ${r.extra ? `<tr><td>${T('MWD / motor')}</td><td colspan="8"></td><td>${fq('press', r.extra, 1)}</td></tr>` : ''}
    <tr class="tot"><td>${T('Total string + bit')}</td><td colspan="8"></td><td>${fq('press', r.surf.dP + r.pipeDP + r.bit.dP + r.extra, 1)}</td></tr></tbody></table>`;
}
function renderAnn(r) {
  $('annTab').innerHTML = `<table class="res"><thead><tr><th>${T('Section')}</th><th>${T('Interval')} (${lab('len')})</th><th>Dh × OD (in)</th><th>Inc (°)</th><th>${T('Velocity')}</th><th>NRe</th><th>${T('Regime')}</th><th>ΔP (${lab('press')})</th><th>vs (Moore)</th><th>Ft</th><th>Ca</th><th>ECD (${lab('dens')})</th></tr></thead><tbody>${r.ann.map(s =>
    `<tr><td>${s.name} · ${T(s.cased ? 'cased' : 'open hole')}</td><td>${fq('len', s.top, 0)}–${fq('len', s.bot, 0)}</td><td>${nf(s.dh, 3)} × ${nf(s.od, 3)}</td><td>${nf(s.inc, 1)}</td><td>${vel(s.V)}</td><td>${nf(s.NRe, 0)}</td><td>${regime(s.regime)}</td><td>${fq('press', s.dP, 1)}</td><td>${vel(s.vs)}</td><td class="${s.Ft < 0.5 ? 'r' : s.Ft < 0.7 ? 'a' : 'g'}">${nf(s.Ft * 100, 0)} %</td><td>${nf(s.Ca * 100, 2)} %</td><td>${fq('dens', s.ecdBot)}</td></tr>`).join('')}
    <tr class="tot"><td>${T('Total annulus')}</td><td colspan="6"></td><td>${fq('press', r.annDP, 1)}</td><td colspan="3"></td><td>${fq('dens', r.ecd)}</td></tr></tbody></table>`;
}
function renderRheo(r) {
  const h = r.rh;
  $('rheoTab').innerHTML = `<table class="res"><thead><tr><th>RPM</th><th>γ (1/s)</th><th>${T('Measured')}</th><th>HB</th><th>Δ</th></tr></thead><tbody>${h.fit.map(p =>
    `<tr><td>${p.rpm}</td><td>${nf(1.703 * p.rpm, 1)}</td><td>${nf(p.meas, 1)}</td><td>${nf(p.model, 1)}</td><td class="${Math.abs(p.model - p.meas) > Math.max(1, 0.1 * p.meas) ? 'a' : ''}">${nf(p.model - p.meas, 1)}</td></tr>`).join('')}</tbody></table>
    <p class="note">PV ${nf(h.PV, 0)} cP · YP ${nf(h.YP, 0)} lbf/100ft² · τy ${nf(h.ty, 1)} · n ${nf(h.n, 3)} · K ${nf(h.K, 4)} lbf·sⁿ/100ft² · R² ${nf(h.r2, 4)}<br>${T('Power law (600/300) for reference')}: n ${nf(h.nPL, 3)} · K ${nf(h.KPL, 4)}</p>`;
}
function renderSurvey(r) {
  const k = SI() ? 30 / 30.48 : 1;
  $('survTab').innerHTML = `<table class="res"><thead><tr><th>MD (${lab('len')})</th><th>Inc (°)</th><th>Azi (°)</th><th>TVD (${lab('len')})</th><th>N (${lab('len')})</th><th>E (${lab('len')})</th><th>DLS (${SI() ? '°/30 m' : '°/100 ft'})</th></tr></thead><tbody>${r.sv.st.map(s =>
    `<tr><td>${fq('len', s.md, 1)}</td><td>${nf(s.inc, 2)}</td><td>${nf(s.azi, 2)}</td><td>${fq('len', s.tvd, 1)}</td><td>${fq('len', s.n, 1)}</td><td>${fq('len', s.e, 1)}</td><td>${nf(s.dls * k, 2)}</td></tr>`).join('')}</tbody></table>`;
}
function renderCmp() {
  const c = H.compare(S);
  if (!c.length) { $('cmp').innerHTML = `<p class="note">${T('Add measured rows (flow rate + SPP, and PWD ECD if available) in “Measured data”. You can also enter another program’s results (e.g. WELLPLAN, Drillbench) to compare the two calculations.')}</p>`; return; }
  const cl = e => e === null ? '' : Math.abs(e) <= 0.05 ? 'g' : Math.abs(e) <= 0.15 ? 'a' : 'r';
  const pc = e => e === null ? '—' : (e > 0 ? '+' : '') + nf(e * 100, 1) + ' %';
  $('cmp').innerHTML = `<table class="res"><thead><tr><th>${T('Source')}</th><th>${T('Flow rate')} (${lab('flow')})</th><th>SPP ${T('meas.')}</th><th>SPP ${T('calc.')}</th><th>${T('Error')}</th><th>ECD ${T('meas.')}</th><th>ECD ${T('calc.')}</th><th>${T('Error')}</th></tr></thead><tbody>${c.map(x =>
    `<tr><td>${x.src.replace(/</g, '&lt;') || '—'}</td><td>${fq('flow', x.q)}</td><td>${x.sppM ? fq('press', x.sppM) : '—'}</td><td>${fq('press', x.sppC)}</td><td class="${cl(x.eSpp)}">${pc(x.eSpp)}</td><td>${x.ecdM ? fq('dens', x.ecdM) : '—'}</td><td>${x.ecdC === null ? '—' : fq('dens', x.ecdC)}</td><td class="${cl(x.eEcd)}">${pc(x.eEcd)}</td></tr>`).join('')}</tbody></table>
    <p class="note">${T('Colours (±5 % green, ±15 % amber) are only a visual aid, not an acceptance criterion. A consistent bias usually points to an input: rheology at downhole temperature, MWD/motor losses, nozzle sizes, surface-line equivalent length, or tool joints (not modelled).')}</p>`;
}

/* ---------------- charts ---------------- */
function ctx(id) {
  const cv = $(id), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, Hh = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, Hh); c.font = '11px system-ui,sans-serif'; return [c, W, Hh];
}
const dark = () => !window.matchMedia || !window.matchMedia('print').matches;
function drawBreak(r) {
  const [c, W, Hh] = ctx('cBreak');
  const items = [[T('Surface lines'), r.surf.dP, '#7fdcff']].concat(r.pipe.map(p => [p.name, p.dP, '#4f8dff']), [[T('Bit nozzles'), r.bit.dP, '#ffb627']], r.extra ? [[T('MWD / motor'), r.extra, '#b689ff']] : [], r.ann.map(s => [T('Annulus') + ': ' + s.name, s.dP, '#2bd66f']));
  const L = Math.min(230, W * 0.42), R = 70, rowH = Math.min(26, (Hh - 10) / items.length), mx = Math.max(...items.map(i => i[1]), 1);
  items.forEach(([n, v, col], i) => {
    const y = 6 + i * rowH; c.fillStyle = '#bcd3ea'; c.textAlign = 'right'; c.fillText(n.length > 34 ? n.slice(0, 33) + '…' : n, L - 6, y + rowH * 0.62);
    c.fillStyle = col; c.fillRect(L, y + 3, (W - L - R) * v / mx, rowH - 7);
    c.fillStyle = '#dcecff'; c.textAlign = 'left'; c.fillText(`${fq('press', v, 0)} · ${nf(v / r.spp * 100, 0)}%`, L + (W - L - R) * v / mx + 4, y + rowH * 0.62);
  });
}
function axes(c, W, Hh, x0, x1, y0, y1, L, B, xl, yl, nx, ny, fx, fy) {
  const X = v => L + (v - x0) / (x1 - x0) * (W - L - 10), Y = v => 8 + (v - y0) / (y1 - y0) * (Hh - 8 - B);
  c.strokeStyle = '#163a5e'; c.fillStyle = '#7f9dbd'; c.lineWidth = 1; c.beginPath();
  for (let i = 0; i <= nx; i++) { const v = x0 + (x1 - x0) * i / nx; c.moveTo(X(v), 8); c.lineTo(X(v), Hh - B); c.textAlign = 'center'; c.fillText(fx(v), X(v), Hh - B + 13); }
  for (let i = 0; i <= ny; i++) { const v = y0 + (y1 - y0) * i / ny; c.moveTo(L, Y(v)); c.lineTo(W - 10, Y(v)); c.textAlign = 'right'; c.fillText(fy(v), L - 4, Y(v) + 4); }
  c.stroke(); c.textAlign = 'center'; c.fillText(xl, L + (W - L) / 2, Hh - 3); c.save(); c.translate(11, 8 + (Hh - B) / 2); c.rotate(-Math.PI / 2); c.fillText(yl, 0, 0); c.restore();
  return [X, Y];
}
function drawRheo(r) {
  const [c, W, Hh] = ctx('cRheo'), h = r.rh, gm = 1022;
  const ym = Math.max(...h.fit.map(p => p.meas), h.model(600)) * 1.1;
  const [X, Y] = axes(c, W, Hh, 0, gm, ym, 0, 46, 32, T('shear rate γ (1/s)'), 'τ (lbf/100ft²)', 5, 4, v => nf(v, 0), v => nf(v, 0));
  c.strokeStyle = '#36c8ff'; c.lineWidth = 2; c.beginPath(); for (let g = 0; g <= gm; g += 4) { const t = h.ty + h.K * Math.pow(g, h.n); g ? c.lineTo(X(g), Y(t)) : c.moveTo(X(g), Y(t)); } c.stroke();
  c.fillStyle = '#ffb627'; for (const p of h.fit) { c.beginPath(); c.arc(X(1.703 * p.rpm), Y(p.meas), 4, 0, 7); c.fill(); }
  c.textAlign = 'left'; c.fillStyle = '#36c8ff'; c.fillText(T('HB model'), 56, 22); c.fillStyle = '#ffb627'; c.fillText(T('Fann readings'), 56, 36);
}
function drawEcd(r) {
  const [c, W, Hh] = ctx('cEcd');
  const pts = [[r.rho, 0]].concat(r.ann.map(s => [s.ecdBot, s.tvdBot]));
  const e0 = Math.min(r.rho, ...pts.map(p => p[0])) * 0.99, e1 = Math.max(...pts.map(p => p[0]), S.ops.fgShoe || 0) * 1.01, z1 = Math.max(r.tvdBit, 1);
  const [X, Y] = axes(c, W, Hh, disp('dens', e0), disp('dens', e1), 0, disp('len', z1), 54, 32, `${T('Density')} (${lab('dens')})`, `TVD (${lab('len')})`, 4, 5, v => nf(v, u('dens') === 'sg' ? 3 : 2), v => nf(v, 0));
  c.strokeStyle = '#2bd66f88'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(X(disp('dens', r.rho)), Y(0)); c.lineTo(X(disp('dens', r.rho)), Y(disp('len', z1))); c.stroke(); c.setLineDash([]);
  c.strokeStyle = '#36c8ff'; c.lineWidth = 2; c.beginPath(); pts.forEach((p, i) => { const x = X(disp('dens', p[0])), y = Y(disp('len', p[1])); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
  if (S.ops.fgShoe > 0 && r.shoe > 0) { const x = X(disp('dens', S.ops.fgShoe)), y = Y(disp('len', r.sv.tvd(r.shoe))); c.fillStyle = '#ff4545'; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 6, y - 5); c.lineTo(x - 6, y + 5); c.fill(); c.textAlign = 'right'; c.fillText(T('FG at shoe'), x - 9, y + 4); }
  c.textAlign = 'left'; c.fillStyle = '#36c8ff'; c.fillText('ECD', 62, 22); c.fillStyle = '#2bd66f'; c.fillText('MW', 62, 36);
}
function drawPath(r) {
  const [c, W, Hh] = ctx('cPath'), st = r.sv.st, hd = st.map(s => Math.hypot(s.n, s.e));
  const z1 = Math.max(...st.map(s => s.tvd), r.tvdBit, 1), h1 = Math.max(...hd, z1 * 0.05);
  const [X, Y] = axes(c, W, Hh, 0, disp('len', h1), 0, disp('len', z1), 54, 32, `${T('Horizontal displacement')} (${lab('len')})`, `TVD (${lab('len')})`, 4, 5, v => nf(v, 0), v => nf(v, 0));
  c.strokeStyle = '#ffb627'; c.lineWidth = 2; c.beginPath(); st.forEach((s, i) => { const x = X(disp('len', hd[i])), y = Y(disp('len', s.tvd)); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
  c.fillStyle = '#ffb627'; st.forEach((s, i) => { c.beginPath(); c.arc(X(disp('len', hd[i])), Y(disp('len', s.tvd)), 2.5, 0, 7); c.fill(); });
}

/* ---------------- events ---------------- */
function bind() {
  document.querySelector('.inputs').addEventListener('input', onInput);
  document.querySelector('.inputs').addEventListener('click', e => {
    const a = e.target.closest('[data-add]'), d = e.target.closest('[data-del]');
    if (a) { const k = a.dataset.add; (S[k] = S[k] || []).push(TABLES[k].blank()); renderForms(); schedule(); }
    if (d) { const [k, i] = d.dataset.del.split('.'); S[k].splice(+i, 1); renderForms(); schedule(); }
  });
  $('survey').addEventListener('input', e => { S.survey = parseSurvey(e.target.value); schedule(); });
  document.querySelectorAll('[data-unit]').forEach(s => s.addEventListener('change', () => { S.units[s.dataset.unit] = s.value; renderForms(); schedule(); }));
  $('exBtn').onclick = () => { S = clone(H.EXAMPLE); renderForms(); schedule(); toast('Example loaded (training well, not field data).'); };
  $('clrBtn').onclick = () => { const units = S.units; S = clone(H.EXAMPLE); S.units = units; S.well.name = ''; S.measured = []; S.survey = [[0, 0, 0]]; S.casing = []; S.string = [TABLES.string.blank()]; renderForms(); schedule(); toast('Blank well: enter your data.'); };
  $('expBtn').onclick = () => { const b = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (S.well.name || 'well').replace(/[^\w.-]+/g, '_') + '-hydraulics.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  $('impFile').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { const o = JSON.parse(t); if (!o.well || !o.mud || !o.string) throw new Error('format'); S = Object.assign(clone(H.EXAMPLE), o); renderForms(); schedule(); toast('Data imported.'); }).catch(() => toast('Could not read this file (expected a JSON export from this page).')); e.target.value = ''; });
  $('prtBtn').onclick = () => window.print();
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  window.addEventListener('resize', () => calc());
}
function setLang(l) { if (I.setLang) I.setLang(l); document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === I.lang)); renderForms(); calc(); }

if (I.init) I.init();
bind(); setLang(I.lang);
window.__fh = () => S;
})();

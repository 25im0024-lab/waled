/* FPSO Console — UI layer: binds the FpsoSim physics core to the panels, the animated field layout, the turret plan view and trends. */
(function () {
'use strict';
const F_ = window.FPSO, CFG = F_.CFG, INFO = window.FPSO_INFO || {};
let sim = new F_.FpsoSim();
const $ = id => document.getElementById(id);
const I = window.I18N || { t: x => x, f: (x, v) => x.replace(/\{(\w+)\}/g, (m, k) => v[k]), lang: 'en' };
const T = x => I.t(x), F = (x, v) => I.f(x, v);
const st = { units: 'si', speed: 1, win: 21600, sound: false, hover: null, lastUi: 0, lastTrend: 0, lastMsg: 0, hidden: {}, beepT: 0, info: 'overview', labels: true, cam: 'rov' };
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

/* ---------------- units ---------------- */
const UN = {
  liq: { si: ['Sm³/d', 1], fd: ['bbl/d', 6.2898, 0] }, gas: { si: ['MSm³/d', 1], fd: ['MMscf/d', 35.3147] },
  press: { si: ['bar', 1], fd: ['psi', 14.5038, 0] }, vol: { si: ['m³', 1], fd: ['bbl', 6.2898, 0] }, len: { si: ['m', 1], fd: ['ft', 3.28084] },
  force: { si: ['kN', 1], fd: ['klbf', 0.224809] }, temp: { si: ['°C', 1], fd: ['°F', 1] }, gor: { si: ['Sm³/Sm³', 1], fd: ['scf/bbl', 5.6146, 0] },
  spd: { si: ['m/s', 1], fd: ['kn', 1.94384] }, ofh: { si: ['m³/h', 1], fd: ['bbl/h', 6.2898, 0] },
};
const cv = (q, v) => q === 'temp' ? (st.units === 'si' ? v : v * 1.8 + 32) : (UN[q] ? v * UN[q][st.units][1] : v);
const un = q => UN[q] ? UN[q][st.units][0] : (q || '');
function fmt(q, v, dec) { if (v === undefined || v === null || !isFinite(v)) return '—'; const u = UN[q]; const d = u && st.units === 'fd' && u.fd[2] !== undefined ? u.fd[2] : dec; return cv(q, v).toFixed(d); }
const fu = (q, v, dec) => fmt(q, v, dec) + ' ' + un(q);
const nf = (v, d) => v === undefined || v === null || !isFinite(v) ? '—' : (+v).toFixed(d);

/* ---------------- key parameters ---------------- */
const PARAMS = [
  ['qo', 'Oil production', 'liq', 0], ['qw', 'Water production', 'liq', 0], ['qg', 'Gas production', 'gas', 2], ['wc', 'Water cut', '%', 1], ['gor', 'Producing GOR', 'gor', 0],
  ['psep', 'Separator pressure', 'press', 2], ['pman', 'Manifold pressure', 'press', 1], ['flare', 'Flare', 'gas', 2], ['cargo', 'Cargo on board', 'vol', 0], ['daysFull', 'Days to tanks full', 'd', 1],
  ['draft', 'Draft', 'len', 1], ['pr', 'Reservoir pressure', 'press', 1], ['vrr', 'Voidage replacement', '', 2], ['oiw', 'Oil in water', 'mg/L', 1], ['power', 'Power demand', 'MW', 1],
  ['offset', 'Vessel offset', 'len', 1], ['Tmax', 'Max mooring tension', 'force', 0],
];
const ALARM_ROW = { SEP_PH: 'psep', PSV: 'psep', FLARE: 'flare', COMP_TRIP: 'flare', OIW: 'oiw', CARGO_H: 'cargo', CARGO_HH: 'cargo', OFFSET: 'offset', MOOR_T: 'Tmax', MOOR_FAIL: 'Tmax', VRR: 'vrr', PR_LOW: 'pr', LOADSHED: 'power', DIESEL: 'power', HYD: 'pman' };
function buildParams() { $('params').innerHTML = PARAMS.map(p => `<div class="prow" id="pr_${p[0]}" data-info="${INFO_OF[p[0]] || 'overview'}"><span class="n">${T(p[1])} <i id="pu_${p[0]}"></i></span><span class="v" id="pv_${p[0]}">—</span></div>`).join(''); }
const INFO_OF = { qo: 'separator', qw: 'water', qg: 'compression', wc: 'wells', gor: 'wells', psep: 'separator', pman: 'risers', flare: 'flare', cargo: 'storage', daysFull: 'storage', draft: 'storage', pr: 'reservoir', vrr: 'injection', oiw: 'water', power: 'power', offset: 'turret', Tmax: 'turret' };

/* ---------------- wells & compressors ---------------- */
function buildWells() {
  $('wells').innerHTML = CFG.wells.map((w, i) => `<div class="well" data-info="wells">
    <h3>${w.id} <span class="lamp" id="wl${i}"></span></h3>
    <div class="seg"><button class="btn sm" data-wopen="${i}">${T('Open')}</button><button class="btn sm" data-wshut="${i}">${T('Shut')}</button></div>
    <div class="ctl"><label>${T('Choke')}</label><input type="range" min="0" max="100" step="1" data-wch="${i}"><output id="wco${i}"></output></div>
    <div class="ctl"><label>${T('Gas lift')}</label><input type="range" min="0" max="0.6" step="0.01" data-wgl="${i}"><output id="wgo${i}"></output></div>
    <div class="kvt"><span>${T('Oil')}</span><b id="wq${i}">—</b><span>${T('Water cut')}</span><b id="ww${i}">—</b><span>WHP / BHP</span><b id="wp${i}" class="w">—</b><span>${T('Status')}</span><b id="wx${i}">—</b></div></div>`).join('');
}
function buildComp() {
  $('compRow').innerHTML = [0, 1].map(i => `<div class="comp"><b>${T('Train')} ${i ? 'B' : 'A'}</b> <span class="lamp" id="cl${i}"></span><span class="seg"><button class="btn sm" data-con="${i}">${T('Run')}</button><button class="btn sm" data-coff="${i}">${T('Stop')}</button></span></div>`).join('');
}

/* ---------------- field layout scene, helicopter and ROV camera (scene.js) ----------------
   The world is drawn once per language; the ROV camera re-renders it magnified through <use href="#world">. */
const SCN = window.FpsoScene({ T, fu, nf, CFG, rtl: () => I.lang === 'ar' });
const tensionCol = r => r > 0.55 ? '#ff4545' : r > 0.4 ? '#ffb627' : '#c9d6e3';
const TK_TXT = { none: 'No tanker', approaching: 'Approaching', hookup: 'Connecting hawser & hose', offloading: 'Offloading', disconnect: 'Disconnecting', departing: 'Departing' };
const HELI_TXT = { none: 'No flight', inbound: 'Helicopter inbound', landed: 'On the helideck', outbound: 'Departing' };
const ROV_KEYS = ['manifold', 't0', 't1', 't2', 't3', 'wi', 'ssiv', 'buoy', 'turret', 'hull', 'touchdown', 'anchor'];
const IN = window.FpsoInside({ T, fu, nf, CFG });
// crew: key, name, work place, hard-hat colour, camera view, explanation where they work
const CREW_UI = [
  ['oim', 'OIM — WALEID ALOBAID', 'Accommodation — OIM office', '#f4f7fa', 'ccr', 'accommodation'], ['cro', 'Control room operators', 'Central control room', '#f4f7fa', 'ccr', 'accommodation'],
  ['proc', 'Process / production engineer', 'Separation module', '#f4f7fa', 'sep', 'separator'], ['mech', 'Mechanical technician', 'Gas compression module', '#ffd84a', 'comp', 'compression'],
  ['elec', 'E&I technician', 'Power generation module', '#ffd84a', 'gt', 'power'], ['lab', 'Lab technician', 'Water treatment module', '#f4f7fa', null, 'water'],
  ['marine', 'Marine & cargo superintendent', 'Cargo control room', '#f4f7fa', 'cargo', 'storage'], ['crane', 'Crane operator', 'Pedestal crane cab', '#ffd84a', null, null],
  ['deck', 'Deck crew & banksman', 'Main deck', '#ffd84a', null, null], ['hlo', 'Helicopter landing officer (HLO)', 'Helideck', '#f4f7fa', null, 'helideck'],
  ['rov', 'ROV supervisor & pilots', 'ROV control van', '#f4f7fa', 'rov', 'rov'], ['medic', 'Offshore medic', 'Sick bay', '#f4f7fa', null, 'accommodation']];
const HELI_ACT = { none: 'Helideck on standby', inbound: 'Preparing the helideck — helicopter inbound', landed: 'Helicopter on deck — passengers and refuelling', outbound: 'Helicopter departing' };
function crewAct(k) {
  const s = sim.s, c = sim.c, d = sim.d, al = sim.alarmList().filter(a => a.active);
  switch (k) {
    case 'oim': return c.esd ? T('Leading the emergency response (ESD)') : F('In command — POB {n}', { n: s.heli.pob });
    case 'cro': return al.length ? F('Handling {n} active alarms', { n: al.length }) : T('Monitoring the DCS — plant steady');
    case 'proc': return s.sep.flareQ > 0.3 ? T('Investigating high flaring') : s.slug > 0.25 ? T('Mitigating riser slugging') : F('Separator {p}, level {l} %', { p: fu('press', s.sep.P, 1), l: nf(s.sep.LT, 0) });
    case 'mech': return s.comp.tripped.some(x => x) ? T('Investigating a compressor trip') : T('Vibration and lube-oil checks on K-101A/B');
    case 'elec': return s.power.diesel ? T('Turbines on diesel — restoring fuel gas') : F('Load {a} of {b} MW', { a: nf(s.power.demand, 1), b: nf(d.powerAvail, 0) });
    case 'lab': return F('Oil-in-water sample: {v} mg/L', { v: nf(d.oiw, 0) });
    case 'marine': return s.tanker.st === 'offloading' ? F('Offloading — tanker {p} % loaded', { p: nf(s.tanker.cargo / CFG.tanker.cap * 100, 0) }) : F('Cargo {p} %, draft {d}', { p: nf(s.cargo / CFG.cargo.cap * 100, 0), d: fu('len', d.draft, 1) });
    case 'crane': return c.env.wind > 20 ? T('Lifting suspended — wind above limit') : T('Deck lifts to the laydown area');
    case 'deck': return ['hookup', 'disconnect'].includes(s.tanker.st) ? T('Handling the hawser and offloading hose') : T('Slinging loads and guiding lifts');
    case 'hlo': return T(HELI_ACT[s.heli.st]);
    case 'rov': return F('ROV at: {t}', { t: SCN.rov.key ? T(SCN.TARGETS[SCN.rov.key][0]) : T('free flight') });
    case 'medic': return T('Sick bay — on call');
  }
  return '';
}
function buildCrew() {
  $('crewList').innerHTML = CREW_UI.map(([k, n, w, hat]) => `<div class="cr" data-crew-row="${k}" data-info="crew_${k}"><i style="background:${hat}"></i><div><b>${T(n)}</b><small>${T(w)}</small><em id="ca_${k}">—</em></div></div>`).join('');
}
function setCam(mode, view) {
  st.cam = mode; const inMode = mode === 'in';
  document.querySelectorAll('[data-cam]').forEach(b => on(b, b.dataset.cam === mode));
  $('camSvg').style.display = inMode ? 'none' : ''; $('inSvg').style.display = inMode ? '' : 'none';
  for (const el of document.querySelectorAll('#camShade,.cam .snow')) el.style.display = inMode ? 'none' : '';
  $('inCtl').style.display = inMode ? '' : 'none'; $('rovCtl').style.display = inMode ? 'none' : ''; $('rovNote').style.display = inMode ? 'none' : '';
  SCN.setCam(!inMode); if (inMode) { IN.show(view || IN.cur()); buildInGo(); }
}
function buildInGo() { $('inGo').innerHTML = Object.entries(IN.VIEWS).map(([k, v]) => `<button class="btn sm${IN.cur() === k ? ' on' : ''}" data-inview="${k}">${T(v[0])}</button>`).join(''); }
function lookAt(view) { if (view === 'rov') setCam('rov'); else setCam('in', view); const card = $('camSvg').closest('.card'); if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
function buildRovGo() { $('rovGo').innerHTML = ROV_KEYS.map(k => `<button class="btn sm${SCN.rov.key === k ? ' on' : ''}" data-rov="${k}">${T(SCN.TARGETS[k][0])}</button>`).join(''); }

/* ---------------- explanation panel ---------------- */
function showInfo(key) {
  st.info = key; const it = INFO[key] || INFO.overview; if (!it) return;
  const L = I.lang === 'ar' ? 1 : 0;
  const look = IN.INFO2VIEW[key] || (CREW_UI.find(c => 'crew_' + c[0] === key) || [])[4];
  const who = CREW_UI.filter(c => c[5] === key).map(c => `<button class="btn sm" data-info="crew_${c[0]}">👷 ${INFO['crew_' + c[0]] ? INFO['crew_' + c[0]].t[L] : c[0]}</button>`).join('');
  $('info').innerHTML = `<h3 class="ih">${it.t[L]}</h3><p class="is">${it.s[L]}</p>${it.b[L]}${look ? `<div class="row" style="margin:6px 0"><button class="btn sm cy" data-look="${look}">📷 ${T(look === 'rov' ? 'Show on the ROV camera' : 'Look inside (camera)')}</button></div>` : ''}${who ? `<div class="sub-h">${T('Who works here')}</div><div class="itags">${who}</div>` : ''}<div class="itags">${Object.keys(INFO).filter(k => !k.startsWith('crew_')).map(k => `<button class="btn sm${k === key ? ' on' : ''}" data-info="${k}">${INFO[k].t[L]}</button>`).join('')}</div>`;
  $('infoTag').textContent = it.t[L];
}

/* ---------------- turret plan view ---------------- */
function drawPlan() {
  const cv0 = $('plan'), dpr = window.devicePixelRatio || 1, W = cv0.clientWidth, H = cv0.clientHeight;
  if (cv0.width !== Math.round(W * dpr)) { cv0.width = Math.round(W * dpr); cv0.height = Math.round(H * dpr); }
  const c = cv0.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const s = sim.s, m = s.moor, e = sim.c.env, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42, k = R / 900;      // 900 m radius anchor circle
  c.fillStyle = '#062a45'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#1e4f7d'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); c.fillStyle = '#7f9dbd'; c.font = '10.5px system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('N', cx, cy - R - 4);
  // compass: 0° = north (up), clockwise
  const P = (az, r) => [cx + Math.sin(az * Math.PI / 180) * r, cy - Math.cos(az * Math.PI / 180) * r];
  const off = m.offset * k * 3, od = m.offDir; const [tx, ty] = [cx + Math.sin(od * Math.PI / 180) * off, cy - Math.cos(od * Math.PI / 180) * off];
  // mooring lines from anchors to the turret
  for (let j = 0; j < CFG.moor.lines; j++) {
    const [ax, ay] = P(sim.lineAz(j), R); const t = (m.T || [])[j] || 0;
    c.strokeStyle = m.failed[j] ? '#ff4545' : tensionCol(t / CFG.moor.MBL); c.lineWidth = m.failed[j] ? 1 : 1.6; c.setLineDash(m.failed[j] ? [4, 4] : []);
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(tx, ty); c.stroke(); c.setLineDash([]); c.fillStyle = '#9fb3c8'; c.fillRect(ax - 2, ay - 2, 4, 4);
  }
  // FPSO hull: turret at the bow, hull extends downstream along the heading
  const L = 300 * k * 1.6, B = 58 * k * 1.8, hd = m.heading * Math.PI / 180;
  c.save(); c.translate(tx, ty); c.rotate(hd); c.fillStyle = '#3b4652'; c.strokeStyle = '#ffd9a8'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-B / 2, 0); c.quadraticCurveTo(0, -B * 0.9, B / 2, 0); c.lineTo(B / 2, L); c.lineTo(-B / 2, L); c.closePath(); c.fill(); c.stroke();
  if (s.tanker.st === 'offloading' || s.tanker.st === 'hookup' || s.tanker.st === 'disconnect') { c.fillStyle = '#5c6a78'; c.fillRect(-B * 0.35, L + 25 * k * 4, B * 0.7, L * 0.55); c.strokeStyle = '#e8e0c8'; c.beginPath(); c.moveTo(0, L); c.lineTo(0, L + 25 * k * 4); c.stroke(); }
  c.restore();
  c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(tx, ty, 3.5, 0, 7); c.fill();
  // environment arrows (towards)
  const arrow = (fromDeg, mag, col, lab, r0) => { const to = fromDeg + 180; const [x0, y0] = P(fromDeg, R * r0), [x1, y1] = P(fromDeg, R * r0 - 14 - mag * 14); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - 7 * Math.cos(a - 0.5), y1 - 7 * Math.sin(a - 0.5)); c.lineTo(x1 - 7 * Math.cos(a + 0.5), y1 - 7 * Math.sin(a + 0.5)); c.fill(); c.fillText(lab, x0 + 10 * Math.sin(to), y0); };
  c.textAlign = 'center'; arrow(e.windDir, e.wind / 10, '#dcecff', T('wind'), 1.12); arrow(e.waveDir, e.hs / 2.5, '#7fdcff', T('waves'), 1.0); arrow(e.curDir, e.cur * 2, '#2bd66f', T('current'), 0.88);
  c.fillStyle = '#7f9dbd'; c.textAlign = 'left'; c.fillText(`${T('offset ×3 for visibility')} · ${T('anchor radius')} ≈ 900 m`, 6, H - 6);
}

/* ---------------- trends ---------------- */
const TRACKS = [
  [['qo', 'Oil', 'liq', '#ffb627'], ['qw', 'Water', 'liq', '#3fb0ff']],
  [['qg', 'Gas', 'gas', '#ffe14d'], ['flare', 'Flare', 'gas', '#ff4545']],
  [['psep', 'Separator P', 'press', '#36c8ff'], ['pman', 'Manifold P', 'press', '#b689ff']],
  [['cargo', 'Cargo', 'vol', '#2bd66f'], ['offset', 'Offset', 'len', '#ff8a3d']],
  [['pr', 'Reservoir P', 'press', '#ffd9a8'], ['power', 'Power (MW)', '', '#9fb3c8']],
];
function buildLegend() { $('legend').innerHTML = TRACKS.flat().map(ch => `<span data-ch="${ch[0]}" class="${st.hidden[ch[0]] ? 'off' : ''}"><i style="background:${ch[3]}"></i>${T(ch[1])} <em class="hint">${un(ch[2]) ? '(' + un(ch[2]) + ')' : ''}</em></span>`).join(''); }
function drawTrend() {
  const cv0 = $('trend'), dpr = window.devicePixelRatio || 1, W = cv0.clientWidth, H = cv0.clientHeight;
  if (cv0.width !== Math.round(W * dpr)) { cv0.width = Math.round(W * dpr); cv0.height = Math.round(H * dpr); }
  const c = cv0.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const Tr = sim.trend, n = Math.min(Tr.n, Tr.N), idx = []; for (let k = n; k > 0; k--) idx.push((Tr.n - k) % Tr.N);
  const tNow = sim.s.t, t0 = tNow - st.win, L = 64, Rm = 64, pw = W - L - Rm, th = (H - 18) / TRACKS.length, xt = t => L + (t - t0) / st.win * pw;
  c.font = '10.5px system-ui,sans-serif';
  const step = st.win <= 3600 ? 600 : st.win <= 21600 ? 3600 : st.win <= 86400 ? 4 * 3600 : 12 * 3600;
  TRACKS.forEach((tr, ti) => {
    const y0 = ti * th + 2, y1 = y0 + th - 6; c.fillStyle = ti % 2 ? '#0a1a2f' : '#0b1e36'; c.fillRect(L, y0, pw, y1 - y0);
    c.strokeStyle = '#163a5e'; c.beginPath(); for (let t = Math.ceil(t0 / step) * step; t < tNow; t += step) { c.moveTo(xt(t), y0); c.lineTo(xt(t), y1); } c.stroke(); c.strokeStyle = '#1e4f7d'; c.strokeRect(L, y0, pw, y1 - y0);
    tr.forEach((ch, ci) => {
      const [key, , q, col] = ch; if (st.hidden[key]) return; const arr = Tr.ch[key];
      let mn = Infinity, mx = -Infinity; for (const i of idx) { if (Tr.t[i] < t0) continue; mn = Math.min(mn, arr[i]); mx = Math.max(mx, arr[i]); }
      if (!isFinite(mn)) { mn = 0; mx = 1; } const pad = (mx - mn) * 0.1 || Math.abs(mx) * 0.05 || 1; mn -= pad; mx += pad;
      const yv = v => y1 - (v - mn) / (mx - mn) * (y1 - y0);
      c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); let first = true; for (const i of idx) { if (Tr.t[i] < t0) continue; const x = xt(Tr.t[i]), y = yv(arr[i]); if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y); } c.stroke();
      c.fillStyle = col; const left = ci === 0, lx = left ? L - 4 : L + pw + 4; c.textAlign = left ? 'right' : 'left';
      c.fillText(fmt(q, mx, 1), lx, y0 + 10); c.fillText(fmt(q, mn, 1), lx, y1 - 2); c.font = 'bold 12px system-ui,sans-serif'; c.fillText(fmt(q, sim.d[key], q === 'gas' ? 2 : 0), lx, (y0 + y1) / 2 + 4); c.font = '10.5px system-ui,sans-serif';
    });
  });
  c.fillStyle = '#7f9dbd'; c.textAlign = 'center';
  for (let t = Math.ceil(t0 / step) * step; t < tNow; t += step) c.fillText(clockStr(sim.clock0 + (t - sim.tStart) * 1000, true), xt(t), H - 4);
}

/* ---------------- periodic UI ---------------- */
function clockStr(ms, short) { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return short ? `${p(d.getDate())}/${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function txt(id, v) { const e = $(id); if (e && e.textContent !== v) e.textContent = v; }
function cls(id, c) { const e = $(id); if (e && e.className !== c) e.className = c; }
function on(el, b) { if (el) el.classList.toggle('on', !!b); }
function sync(id, oid, v, show) { const el = $(id); if (el && document.activeElement !== el) el.value = v; if (oid) txt(oid, show); }
function plantStatus() {
  const c = sim.c, s = sim.s;
  if (c.esd) return ['ESD', 'crit']; if (c.psd) return ['PROCESS SHUTDOWN', 'crit'];
  if (s.wellsQin.L < 1) return ['SHUT IN', 'idle'];
  if (s.tanker.st === 'offloading') return ['PRODUCING + OFFLOADING', ''];
  if (s.sep.flareQ > 0.5) return ['PRODUCING — FLARING', 'warn'];
  return ['PRODUCING', ''];
}
function updateUI() {
  const s = sim.s, c = sim.c, d = sim.d;
  const now = new Date(sim.clockMs()); txt('dateTxt', `${String(now.getDate()).padStart(2, '0')}-${MON[now.getMonth()]}-${now.getFullYear()}`); txt('clockTxt', clockStr(sim.clockMs()));
  const [ps, pc] = plantStatus(); txt('plantStatus', T(ps)); cls('plantStatus', 'status-badge ' + pc);
  const al = sim.alarmList(), top = al[0], ban = $('alarmBanner');
  if (top) { txt('alarmTxt', T(top.text)); txt('alarmSub', `${T(top.active ? 'ACTIVE' : 'CLEARED')} · ${T(top.acked ? 'acknowledged' : 'unacknowledged')} · ${F('{n} in list — click to ack', { n: al.length })}`); ban.className = `alarm-banner p${top.prio}${top.acked ? '' : ' blink'}`; }
  else { txt('alarmTxt', T('No active alarms')); txt('alarmSub', T('All systems normal')); ban.className = 'alarm-banner ok'; }
  txt('esdBtn', T(confirming('esd') ? 'CONFIRM?' : c.esd ? 'ESD ACTIVE — RESET' : 'ESD READY')); $('esdBtn').className = 'btn ' + (c.esd || confirming('esd') ? 'red blink' : 'on');
  $('psdBtn').disabled = !c.psd;
  txt('unitsNote', T(st.units === 'si' ? 'SI units' : 'Oilfield units'));
  // key parameters
  const alarmRows = {}; for (const a of al) if (a.active && ALARM_ROW[a.id]) alarmRows[ALARM_ROW[a.id]] = Math.min(alarmRows[ALARM_ROW[a.id]] || 9, a.prio);
  const vals = { wc: d.wc * 100, daysFull: d.daysFull, vrr: d.vrr, Tmax: d.Tmax, power: d.power };
  for (const [k, , q, dec] of PARAMS) {
    const v = k in vals ? vals[k] : d[k];
    txt('pv_' + k, k === 'daysFull' && !isFinite(v) ? '—' : fmt(q, v, dec)); txt('pu_' + k, un(q) ? '(' + T(un(q)) + ')' : '');
    cls('pr_' + k, 'prow' + (alarmRows[k] ? (alarmRows[k] <= 2 ? ' al' : ' wn') : ''));
  }
  // wells
  s.wells.forEach((w, i) => {
    const cw = c.wells[i]; on(document.querySelector(`[data-wopen="${i}"]`), cw.open); on(document.querySelector(`[data-wshut="${i}"]`), !cw.open);
    const ch = document.querySelector(`[data-wch="${i}"]`), gl = document.querySelector(`[data-wgl="${i}"]`);
    if (document.activeElement !== ch) ch.value = cw.choke; if (document.activeElement !== gl) gl.value = cw.lift;
    txt('wco' + i, `${cw.choke.toFixed(0)} % (${w.ch.toFixed(0)})`); txt('wgo' + i, fu('gas', cw.lift, 2));
    txt('wq' + i, fu('liq', w.qo, 0)); txt('ww' + i, nf(w.wc * 100, 1) + ' %'); txt('wp' + i, `${fmt('press', w.Pwh, 0)} / ${fmt('press', w.Pwf, 0)} ${un('press')}`);
    const stt = c.esd || c.psd ? 'SHUT (ESD/PSD)' : !cw.open || w.ch < 1 ? 'SHUT' : w.q < 50 ? 'NOT FLOWING' : 'FLOWING'; txt('wx' + i, T(stt)); cls('wx' + i, stt === 'FLOWING' ? '' : stt === 'SHUT' ? 'w' : 'r');
    cls('wl' + i, 'lamp' + (stt === 'FLOWING' ? ' g' : stt === 'NOT FLOWING' ? ' a' : ' r'));
  });
  txt('sPman', fu('press', s.Pman, 1)); txt('sTemp', `${fu('temp', s.Tarr, 1)} / ${fu('temp', d.Thyd, 1)}`); cls('sTemp', s.Tarr < d.Thyd + 3 ? 'r' : s.Tarr < d.Thyd + 8 ? 'a' : '');
  const coolH = s.wellsQin.L > 50 ? null : s.Tarr > d.Thyd + 0.1 ? 8 * Math.log((s.Tarr - 4) / Math.max(d.Thyd - 4, 0.01)) : 0;
  txt('sCool', s.wellsQin.L > 50 ? T('flowing — no cooldown') : d.Thyd <= 4 ? T('protected (MEG)') : F('{h} h until hydrate zone', { h: nf(Math.max(0, coolH), 1) })); cls('sCool', coolH !== null && coolH < 2 && d.Thyd > 4 ? 'r' : 'w');
  txt('sSlug', nf(s.slug, 2)); cls('sSlug', s.slug > 0.25 ? 'a' : ''); txt('sPr', `${fu('press', s.Pr, 1)} / ${fu('press', CFG.Pb, 0)}`); txt('sVrr', nf(d.vrr, 2)); cls('sVrr', d.vrr < 0.9 ? 'a' : '');
  on($('megBtn'), c.meg); txt('subseaNote', `${fu('liq', s.wellsQin.L, 0)} ${T('liquid')}`);
  // process
  sync('sPset', 'oPset', c.sep.Pset, fu('press', c.sep.Pset, 1)); sync('sLT', 'oLT', c.sep.LTsp, c.sep.LTsp.toFixed(0) + ' %');
  $('vLT').style.height = clamp(s.sep.LT, 0, 100) + '%'; $('vLI').style.height = clamp(s.sep.LI, 0, 100) + '%'; txt('vTxt', `${nf(s.sep.LT, 0)} % / ${nf(s.sep.LI, 0)} %`);
  txt('pP', fu('press', s.sep.P, 2)); cls('pP', s.sep.P > c.sep.Pset + 3 ? 'r' : ''); txt('pL', `${nf(s.sep.LT, 1)} % / ${nf(s.sep.LI, 1)} %`); cls('pL', s.sep.LT > 85 || s.sep.LT < 15 ? 'r' : '');
  txt('pQo', fu('liq', s.sep.qoOut, 0)); txt('pQw', fu('liq', s.sep.qwOut, 0)); txt('pQg', fu('gas', s.sep.qgComp, 2)); txt('pBsw', nf(d.bsw, 2) + ' %'); cls('pBsw', d.bsw > 0.5 ? 'r' : '');
  [0, 1].forEach(i => { on(document.querySelector(`[data-con="${i}"]`), c.comp[i] && !s.comp.tripped[i]); on(document.querySelector(`[data-coff="${i}"]`), !c.comp[i]); cls('cl' + i, 'lamp' + (s.comp.tripped[i] ? ' r' : c.comp[i] ? ' g' : '')); });
  const g = s.gasUse, tot = Math.max(s.wellsQin.g / 1e6, 0.01), bars = [['Fuel gas', g.fuel, '#ff8a3d'], ['Gas lift', g.lift, '#9b7cff'], ['Export', g.exp, '#2bd66f'], ['Reinjection', g.reinj, '#36c8ff'], ['Flare', s.sep.flareQ, '#ff4545']];
  $('gasBars').innerHTML = bars.map(([n, v, col]) => `<div class="bar"><span>${T(n)}</span><i style="width:${clamp(v / tot * 100, 0, 100).toFixed(1)}%;background:${col}"></i><b>${fu('gas', v, 2)}</b></div>`).join('');
  sync('sRoute', 'oRoute', c.route * 100, (c.route * 100).toFixed(0) + ' %');
  txt('pOiw', nf(d.oiw, 1) + ' mg/L'); cls('pOiw', d.oiw > CFG.pw.limit ? 'r' : d.oiw > 0.8 * CFG.pw.limit ? 'a' : ''); txt('pPw', fu('liq', s.sep.qwOut, 0)); txt('pWi', fu('liq', s.wi.q, 0));
  on($('wiBtn'), c.wi.on); sync('sWi', 'oWi', c.wi.rate, fu('liq', c.wi.rate, 0)); on($('cleanBtn'), c.cleanCyclones);
  txt('pPow', `${nf(s.power.demand, 1)} / ${nf(d.powerAvail, 0)} MW`); cls('pPow', s.power.demand > d.powerAvail ? 'r' : ''); txt('pPow2', `${nf(s.comp.power, 1)} / ${nf(s.power.wiPower, 1)} MW`);
  txt('pFuel', s.power.diesel ? T('DIESEL (fuel gas short)') : fu('gas', g.fuel, 3)); cls('pFuel', s.power.diesel ? 'a' : '');
  txt('procNote', `${T('separator')} ${fu('press', s.sep.P, 1)}`);
  // storage & offloading
  const frac = s.cargo / CFG.cargo.cap; $('cargoBar').style.width = (frac * 100).toFixed(1) + '%'; cls('cargoBar', frac > 0.92 ? 'r' : frac > 0.8 ? 'a' : ''); txt('cargoTxt', `${nf(frac * 100, 1)} %`);
  txt('oCargo', `${fu('vol', s.cargo, 0)} / ${fu('vol', CFG.cargo.cap, 0)}`); txt('oDays', isFinite(d.daysFull) ? nf(d.daysFull, 1) + ' ' + T('days') : '—'); txt('oDraft', fu('len', d.draft, 1));
  const tk = s.tanker; txt('oTk', T(TK_TXT[tk.st])); cls('oTk', tk.st === 'offloading' ? 'c' : tk.st === 'none' ? 'w' : 'a'); txt('oTkC', `${fu('vol', tk.cargo, 0)} / ${fu('vol', CFG.tanker.cap, 0)}`);
  txt('oHs', `Hs ${nf(c.env.hs, 1)} / ${nf(CFG.tanker.hsLimit, 1)} m`); cls('oHs', c.env.hs > CFG.tanker.hsLimit ? 'r' : 'w');
  sync('sOff', 'oOff', c.offRate, fu('ofh', c.offRate, 0)); txt('tkState', T(TK_TXT[tk.st]));
  const Tc = CFG.tanker, dur = { approaching: Tc.approach, hookup: Tc.hookup, disconnect: Tc.disconnect, departing: Tc.depart }[tk.st];
  $('tkProg').style.width = (tk.st === 'offloading' ? tk.cargo / Tc.cap * 100 : dur ? clamp(tk.t / dur, 0, 1) * 100 : 0) + '%';
  // helideck
  const hk = s.heli, H = CFG.heli, fly = c.env.wind <= H.windMax && c.env.hs <= H.hsMax && !c.esd, hdur = { inbound: H.inbound, landed: H.onDeck, outbound: H.outbound }[hk.st];
  txt('hSt', T(HELI_TXT[hk.st])); cls('hSt', hk.st === 'none' ? 'w' : hk.st === 'landed' ? 'c' : 'a'); txt('heliState', T(HELI_TXT[hk.st]));
  txt('hPob', String(hk.pob)); txt('hFl', String(hk.flights));
  txt('hLim', `${fu('spd', H.windMax, 0)} · Hs ${fu('len', H.hsMax, 1)}`);
  txt('hWx', `${fu('spd', c.env.wind, 0)} · Hs ${fu('len', c.env.hs, 1)} — ${T(fly ? 'within limits' : 'outside limits')}`); cls('hWx', fly ? '' : 'r');
  $('heliProg').style.width = (hdur ? clamp(hk.t / hdur, 0, 1) * 100 : 0) + '%';
  $('heliBtn').disabled = hk.st !== 'none'; $('heliTo').disabled = hk.st !== 'landed';
  txt('crewPob', `POB ${hk.pob}`); CREW_UI.forEach(([k]) => txt('ca_' + k, crewAct(k)));
  on($('lblBtn'), st.labels); on($('rovLights'), SCN.rov.lights); txt('rovZoom', `×${SCN.rov.zoom}`);
  document.querySelectorAll('[data-rov]').forEach(b => on(b, b.dataset.rov === SCN.rov.key));
  $('tkBtn').disabled = tk.st !== 'none';
  // mooring & environment
  const e = c.env;
  sync('sWind', 'oWind', e.wind, fu('spd', e.wind, 0)); sync('sWindDir', 'oWindDir', e.windDir, e.windDir + '°'); sync('sHs', 'oHs2', e.hs, nf(e.hs, 1) + ' m'); sync('sWaveDir', 'oWaveDir', e.waveDir, e.waveDir + '°');
  sync('sCur', 'oCur', e.cur, fu('spd', e.cur, 2)); sync('sCurDir', 'oCurDir', e.curDir, e.curDir + '°');
  txt('mHead', nf(s.moor.heading, 0) + '°'); txt('mOff', `${fu('len', s.moor.offset, 1)} (${nf(s.moor.offset / CFG.wd * 100, 1)} %)`); cls('mOff', s.moor.offset > 0.04 * CFG.wd ? 'r' : s.moor.offset > 0.03 * CFG.wd ? 'a' : '');
  txt('mT', `${fu('force', d.Tmax, 0)} (${nf(d.Tmax / CFG.moor.MBL * 100, 0)} %)`); cls('mT', d.Tmax > 0.55 * CFG.moor.MBL ? 'r' : d.Tmax > 0.4 * CFG.moor.MBL ? 'a' : '');
  txt('moorNote', `${T('water depth')} ${fu('len', CFG.wd, 0)}`);
  // alarms & log
  $('alarmBody').innerHTML = al.length ? al.map(a => `<tr class="p${a.prio}${a.acked ? '' : ' unack'}"><td class="num">${clockStr(sim.clock0 + (a.t0 - sim.tStart) * 1000)}</td><td>${T(a.text)}</td><td>${a.active ? '<span class="pill ' + (a.prio === 1 ? 'r' : a.prio === 2 ? 'a' : 'c') + '">' + T('ACTIVE') + '</span>' : '<span class="pill g">' + T('CLEAR') + '</span>'} ${a.acked ? '' : `<button class="btn sm" data-ack="${a.id}">${T('Ack')}</button>`}</td></tr>`).join('') : `<tr><td colspan="3" class="hint">${T('No alarms')}</td></tr>`;
  $('log').innerHTML = sim.log.slice(0, 60).map(l => `<div class="${l.type === 'EVENT' ? 'ev' : 'p' + l.prio}">${clockStr(sim.clock0 + (l.t - sim.tStart) * 1000)} ${l.type === 'EVENT' ? '•' : l.type === 'ALARM' ? '▲' : '✓'} ${T(l.text)}</div>`).join('');
  for (const m of sim.msg) if (m.t > st.lastMsg) { toast(m.text); st.lastMsg = m.t; }
  if (st.sound) { const u = al.find(a => !a.acked && a.active && a.prio <= 2); if (u && performance.now() - st.beepT > 1400) { beep(u.prio === 1 ? 880 : 620); st.beepT = performance.now(); } }
  txt('unitName', CFG.name); txt('fieldName', T(CFG.field));
}

/* ---------------- helpers ---------------- */
function confirm2(key, fn, msg) { const now = performance.now(); if (st.confirm && st.confirm.key === key && now - st.confirm.t < 3000) { st.confirm = null; fn(); return; } st.confirm = { key, t: now }; toast(msg); }
const confirming = key => st.confirm && st.confirm.key === key && performance.now() - st.confirm.t < 3000;
function toast(t) { const e = document.createElement('div'); e.textContent = T(t); $('toast').appendChild(e); setTimeout(() => e.remove(), 4200); }
let actx = null;
function beep(f) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.05, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.35); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.36); } catch (e) { /* no audio */ } }
const res = r => { if (r && r.ok === false && r.msg) { toast(r.msg); st.lastMsg = sim.s.t; } };

/* ---------------- field data: import, chart, calibration ---------------- */
const FD = window.FPSO_FIELD, fd = { data: null, ent: null, ser: [], i: 0, res: null };
function fdLoad(text, name) {
  try { fd.data = FD.parse(text); } catch (e) { toast(F('Could not read the file: {e}', { e: T(e.message) })); return; }
  const ents = Object.keys(fd.data.entities); if (!ents.length) { toast('No production rows found in the file'); return; }
  $('fdName').textContent = name || ''; $('fdFmt').textContent = T(fd.data.format);
  $('fdEnt').innerHTML = ents.map(k => `<option>${k.replace(/</g, '&lt;')}</option>`).join(''); $('fdEnt').disabled = false;
  fdEntity(ents[0]); toast(F('{n} loaded: {m} series', { n: name || 'CSV', m: ents.length }));
}
function fdEntity(k) {
  fd.ent = k; fd.ser = FD.stats(fd.data.entities[k]);
  let best = 0; fd.ser.forEach((p, i) => { if (p.qo > fd.ser[best].qo) best = i; });   // start at peak oil rate
  const r = $('fdIdx'); r.max = fd.ser.length - 1; r.value = best; r.disabled = false; fd.i = best; $('fdApply').disabled = false; fdShow();
}
function fdShow() {
  const p = fd.ser[fd.i]; if (!p) return; txt('fdLbl', p.label);
  const extra = isFinite(p.bhp) && p.bhp > 0 ? `<span>${T('Measured BHP / WHP')}</span><b class="w">${fu('press', p.bhp, 0)} / ${fu('press', p.whp, 0)}</b>` : '';
  $('fdKv').innerHTML = `<span>${T('Oil')}</span><b class="a">${fu('liq', p.qo, 0)}</b><span>${T('Water')}</span><b class="c">${fu('liq', p.qw, 0)}</b><span>${T('Gas')}</span><b>${fu('gas', p.qg / 1e6, 2)}</b>
    <span>${T('Water cut')}</span><b class="w">${nf(p.wc * 100, 1)} %</b><span>GOR</span><b class="w">${fu('gor', p.gor, 0)}</b><span>${T('Cumulative oil')}</span><b class="w">${fu('vol', p.cumO, 0)}</b>${extra}`;
  fdChart();
}
function fdChart() {
  const cv0 = $('fdChart'); if (!cv0) return; const dpr = window.devicePixelRatio || 1, W = cv0.clientWidth, H = cv0.clientHeight;
  if (cv0.width !== Math.round(W * dpr)) { cv0.width = Math.round(W * dpr); cv0.height = Math.round(H * dpr); }
  const c = cv0.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const S = fd.ser, L = 58, R = 54, Tp = 10, B = 24, pw = W - L - R, ph = H - Tp - B;
  c.font = '10.5px system-ui,sans-serif'; c.fillStyle = '#7f9dbd';
  if (!S.length) { c.textAlign = 'center'; c.fillText(T('Load a production CSV to see its history here'), W / 2, H / 2); return; }
  const t0 = S[0].t, t1 = S[S.length - 1].t || t0 + 1, xt = t => L + (t - t0) / Math.max(1, t1 - t0) * pw;
  const yL = Math.max(1, ...S.map(p => Math.max(cv('liq', p.qo), cv('liq', p.qw)))) * 1.08, yG = Math.max(1e-6, ...S.map(p => cv('gas', p.qg / 1e6))) * 1.08;
  c.strokeStyle = '#15385b'; c.lineWidth = 1; c.textAlign = 'right';
  for (let k = 0; k <= 4; k++) { const y = Tp + ph * (1 - k / 4); c.beginPath(); c.moveTo(L, y); c.lineTo(L + pw, y); c.stroke(); c.fillStyle = '#ffb627'; c.fillText(nf(yL * k / 4, 0), L - 6, y + 3); c.fillStyle = '#ffe14d'; c.textAlign = 'left'; c.fillText(nf(yG * k / 4, 2), L + pw + 6, y + 3); c.textAlign = 'right'; }
  c.fillStyle = '#7f9dbd'; c.textAlign = 'left'; c.fillText(un('liq'), 4, Tp + 8); c.textAlign = 'right'; c.fillText(un('gas'), W - 4, Tp + 8);
  const y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear(), stepY = Math.max(1, Math.ceil((y1 - y0 + 1) / 10)); c.textAlign = 'center'; c.fillStyle = '#7f9dbd';
  for (let y = y0; y <= y1 + 1; y += stepY) { const x = xt(Date.UTC(y, 0, 1)); if (x >= L && x <= L + pw) { c.fillText(String(y), x, H - 8); c.strokeStyle = '#102a45'; c.beginPath(); c.moveTo(x, Tp); c.lineTo(x, Tp + ph); c.stroke(); } }
  const line = (f, col, sc) => { c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); S.forEach((p, i) => { const x = xt(p.t), y = Tp + ph * (1 - f(p) / sc); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); };
  line(p => cv('liq', p.qw), '#3fb0ff', yL); line(p => cv('gas', p.qg / 1e6), '#ffe14d', yG); line(p => cv('liq', p.qo), '#ffb627', yL);
  c.setLineDash([4, 3]); c.strokeStyle = '#b689ff'; c.lineWidth = 1.2; c.beginPath(); S.forEach((p, i) => { const x = xt(p.t), y = Tp + ph * (1 - p.wc); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]);
  const p = S[fd.i]; if (p) { const x = xt(p.t); c.strokeStyle = '#7dffb0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, Tp); c.lineTo(x, Tp + ph); c.stroke(); }
  $('fdLeg').innerHTML = `<span><i style="background:#ffb627"></i>${T('Oil')}</span><span><i style="background:#3fb0ff"></i>${T('Water')}</span><span><i style="background:#ffe14d"></i>${T('Gas')} (${un('gas')})</span><span><i style="background:#b689ff"></i>${T('Water cut')} (0–100 %)</span>`;
}
function fdApply() {
  const p = fd.ser[fd.i]; if (!p) return; $('fdApply').disabled = true; $('fdRes').innerHTML = `<p class="note">${T('Calibrating…')}</p>`;
  setTimeout(() => {
    try {
      const r = FD.calibrate(F_, p, { name: `${fd.ent} · ${p.label}` }); sim = r.sim; fd.res = r; st.lastMsg = 0;
      const row = (n, a, b, e, q, d) => `<tr><td>${T(n)}</td><td>${q ? fu(q, a, d) : a}</td><td>${q ? fu(q, b, d) : b}</td><td class="${e === '' ? '' : Math.abs(e) < 5 ? 'ok' : 'bad'}">${e === '' ? '' : (e > 0 ? '+' : '') + nf(e, 1) + ' %'}</td></tr>`;
      const pr = isFinite(p.bhp) && p.bhp > 0 ? row('BHP (measured vs model, not fitted)', p.bhp, sim.s.wells.reduce((a, w) => a + w.Pwf, 0) / sim.s.wells.length, (sim.s.wells.reduce((a, w) => a + w.Pwf, 0) / sim.s.wells.length - p.bhp) / p.bhp * 100, 'press', 0) : '';
      $('fdRes').innerHTML = `<table class="fdt"><thead><tr><th></th><th>${T('Field')}</th><th>${T('Model')}</th><th>${T('Error')}</th></tr></thead><tbody>
        ${row('Oil', r.target.qo, r.model.qo, r.err.qo, 'liq', 0)}${row('Water', r.target.qw, r.model.qw, r.err.qw, 'liq', 0)}${row('Gas', r.target.qg / 1e6, r.model.qg / 1e6, r.err.qg, 'gas', 2)}
        ${row('Water cut', nf(r.target.wc * 100, 1) + ' %', nf(r.model.wc * 100, 1) + ' %', '')}${row('GOR', r.target.gor, r.model.gor, (r.model.gor - r.target.gor) / Math.max(1, r.target.gor) * 100, 'gor', 0)}${pr}</tbody></table>
        <p class="note">${F('Fitted: size factor ×{s} (productivity, choke capacity, flowline/riser friction and separator volume scaled together), well water cut and GOR; {g} gas turbines. Reservoir pressure, PVT and equipment curves stay generic, so pressures are indicative only.', { s: nf(r.size, 2), g: r.gts })}</p>`;
      toast(F('Simulator calibrated to {n}', { n: `${fd.ent} ${p.label}` })); drawTrend(); updateUI();
    } catch (e) { $('fdRes').innerHTML = `<p class="note">${T(e.message)}</p>`; }
    $('fdApply').disabled = false;
  }, 30);
}
function fdBind() {
  $('fdFile').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => fdLoad(rd.result, f.name); rd.readAsText(f); e.target.value = ''; });
  const card = $('fieldCard'); card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drop'); }); card.addEventListener('dragleave', () => card.classList.remove('drop'));
  card.addEventListener('drop', e => { e.preventDefault(); card.classList.remove('drop'); const f = e.dataTransfer.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => fdLoad(rd.result, f.name); rd.readAsText(f); });
  $('fdEnt').addEventListener('change', e => fdEntity(e.target.value)); $('fdIdx').addEventListener('input', e => { fd.i = +e.target.value; fdShow(); });
  $('fdApply').onclick = fdApply;
  $('fdReset').onclick = () => { FD.restore(CFG); sim = new F_.FpsoSim(); fd.res = null; $('fdRes').innerHTML = ''; st.lastMsg = 0; drawTrend(); updateUI(); toast('Back to the training field'); };
}

/* ---------------- events ---------------- */
function bind() {
  const q = (sel, fn, ev = 'click') => document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, e => fn(el, e)));
  q('[data-speed]', el => { st.speed = +el.dataset.speed; document.querySelectorAll('[data-speed]').forEach(b => on(b, b === el)); });
  q('[data-units]', el => { st.units = el.dataset.units; document.querySelectorAll('[data-units]').forEach(b => on(b, b === el)); buildLegend(); updateUI(); drawTrend(); });
  q('[data-lang]', el => setLang(el.dataset.lang));
  $('soundBtn').onclick = () => { st.sound = !st.sound; $('soundBtn').textContent = T(st.sound ? '🔊 Horn' : '🔇 Horn'); on($('soundBtn'), st.sound); if (st.sound) beep(660); };
  $('instrBtn').onclick = () => $('instr').showModal(); $('instrClose').onclick = () => $('instr').close();
  $('alarmBanner').onclick = () => sim.ack(); $('ackAll').onclick = () => sim.ack();
  $('alarmBody').addEventListener('click', e => { const b = e.target.closest('[data-ack]'); if (b) sim.ack(b.dataset.ack); });
  $('esdBtn').onclick = () => confirm2('esd', () => { if (sim.c.esd) sim.resetEsd(); else sim.esd(); }, sim.c.esd ? 'Click again to reset ESD' : 'Click again to activate ESD');
  $('psdBtn').onclick = () => res(sim.resetPsd());
  // explanation: any element with data-info
  document.addEventListener('click', e => { const t = e.target.closest('[data-info]'); if (t && (!e.target.closest('input,select,button') || e.target.closest('.itags'))) showInfo(t.dataset.info); });
  // wells
  $('wells').addEventListener('click', e => { const a = e.target.closest('[data-wopen]'), b = e.target.closest('[data-wshut]'); if (a) sim.c.wells[+a.dataset.wopen].open = true; if (b) sim.c.wells[+b.dataset.wshut].open = false; });
  $('wells').addEventListener('input', e => { const t = e.target; if (t.dataset.wch !== undefined) sim.c.wells[+t.dataset.wch].choke = +t.value; if (t.dataset.wgl !== undefined) sim.c.wells[+t.dataset.wgl].lift = +t.value; });
  $('allOpen').onclick = () => sim.c.wells.forEach(w => { w.open = true; if (w.choke < 5) w.choke = 50; }); $('allShut').onclick = () => sim.c.wells.forEach(w => { w.open = false; });
  $('megBtn').onclick = () => { sim.c.meg = !sim.c.meg; };
  // process
  $('sPset').addEventListener('input', e => sim.c.sep.Pset = +e.target.value); $('sLT').addEventListener('input', e => sim.c.sep.LTsp = +e.target.value);
  $('compRow').addEventListener('click', e => { const a = e.target.closest('[data-con]'), b = e.target.closest('[data-coff]'); if (a) sim.restartComp(+a.dataset.con); if (b) sim.c.comp[+b.dataset.coff] = false; });
  $('sRoute').addEventListener('input', e => sim.c.route = +e.target.value / 100);
  $('wiBtn').onclick = () => { sim.c.wi.on = !sim.c.wi.on; }; $('sWi').addEventListener('input', e => sim.c.wi.rate = +e.target.value);
  $('cleanBtn').onclick = () => { sim.c.cleanCyclones = !sim.c.cleanCyclones; };
  // offloading
  $('tkBtn').onclick = () => res(sim.callTanker()); $('tkStop').onclick = () => sim.stopOffload(); $('sOff').addEventListener('input', e => sim.c.offRate = +e.target.value);
  // helideck
  $('heliBtn').onclick = () => res(sim.callHeli());
  $('heliTo').onclick = () => res(sim.heliTakeoff());
  // cameras and crew
  q('[data-cam]', el => setCam(el.dataset.cam));
  $('inGo').addEventListener('click', e => { const b = e.target.closest('[data-inview]'); if (b) { IN.show(b.dataset.inview); buildInGo(); } });
  document.addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (b) lookAt(b.dataset.look); });
  $('crewList').addEventListener('click', e => { const r = e.target.closest('[data-crew-row]'); if (!r) return; const k = r.dataset.crewRow, c = CREW_UI.find(x => x[0] === k);
    SCN.highlight(k); if (c && c[4]) lookAt(c[4]); });
  $('scene').addEventListener('click', e => { const m = e.target.closest('[data-crew]'); if (m) SCN.highlight(m.dataset.crew); });
  // field layout labels and ROV camera
  q('[data-light]', el => { SCN.setLight(el.dataset.light); document.querySelectorAll('[data-light]').forEach(b => on(b, b === el)); });
  $('lblBtn').onclick = () => { st.labels = !st.labels; SCN.setLabels(st.labels); };
  $('rovGo').addEventListener('click', e => { const b = e.target.closest('[data-rov]'); if (b) SCN.rovTo(b.dataset.rov); });
  q('[data-nudge]', el => { const [dx, dy] = el.dataset.nudge.split(',').map(Number); SCN.nudge(dx * 100 / SCN.rov.zoom, dy * 60 / SCN.rov.zoom); });
  $('rovIn').onclick = () => { SCN.rov.zoom = Math.min(12, SCN.rov.zoom + 1); }; $('rovOut').onclick = () => { SCN.rov.zoom = Math.max(2, SCN.rov.zoom - 1); };
  $('rovLights').onclick = () => { SCN.rov.lights = !SCN.rov.lights; };
  $('camExplain').onclick = () => { const k = st.cam === 'in' ? IN.VIEWS[IN.cur()][1] : $('camExplain').dataset.info; if (k) showInfo(k); };
  $('camSvg').addEventListener('click', e => { const m = $('camSvg').getScreenCTM(); if (!m) return; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); SCN.lookAt(p.x, p.y); });
  // environment
  const env = (id, k) => $(id).addEventListener('input', e => { sim.c.env[k] = +e.target.value; });
  env('sWind', 'wind'); env('sWindDir', 'windDir'); env('sHs', 'hs'); env('sWaveDir', 'waveDir'); env('sCur', 'cur'); env('sCurDir', 'curDir');
  // trends
  q('[data-win]', el => { st.win = +el.dataset.win; document.querySelectorAll('[data-win]').forEach(b => on(b, b === el)); drawTrend(); });
  $('legend').addEventListener('click', e => { const s = e.target.closest('[data-ch]'); if (s) { st.hidden[s.dataset.ch] = !st.hidden[s.dataset.ch]; s.classList.toggle('off'); drawTrend(); } });
  // instructor
  q('[data-sc]', el => { sim.scenario(el.dataset.sc); toast(F('Scenario: {n}', { n: el.textContent })); });
  const reset = hot => { sim = new F_.FpsoSim({ hot }); st.lastMsg = 0; $('instr').close(); drawTrend(); toast(hot ? 'Reset: producing' : 'Reset: wells shut in'); };
  $('resetHot').onclick = () => reset(true); $('resetCold').onclick = () => reset(false);
  fdBind();
  window.addEventListener('resize', () => { drawTrend(); drawPlan(); fdChart(); });
}
function setLang(l) { if (I.setLang) I.setLang(l); document.querySelectorAll('[data-lang]').forEach(b => on(b, b.dataset.lang === I.lang)); buildParams(); buildWells(); buildComp(); SCN.build(); SCN.setLabels(st.labels); buildRovGo(); buildCrew(); if (st.cam === 'in') { IN.show(IN.cur()); buildInGo(); } buildLegend(); showInfo(st.info); if (fd.ser.length) fdShow(); else fdChart(); $('soundBtn').textContent = T(st.sound ? '🔊 Horn' : '🔇 Horn'); updateUI(); drawTrend(); drawPlan(); }

/* ---------------- main loop ---------------- */
let last = performance.now();
function frame(now) {
  const dtR = Math.min(0.25, (now - last) / 1000); last = now;
  if (st.speed > 0) { const simT = dtR * st.speed, h = st.speed >= 3600 ? 4 : st.speed >= 600 ? 2 : 1; const n = Math.min(Math.ceil(simT / h), 2000); for (let i = 0; i < n; i++) sim.step(simT / n); }
  SCN.update(sim, dtR * (st.speed ? 1 : 0), dtR);
  if (st.cam === 'in') { IN.update(sim, dtR); if (now - (st.lastHud || 0) > 250) { $('camHud').innerHTML = IN.hud(sim); $('camExplain').disabled = false; st.lastHud = now; } }
  if (now - st.lastUi > 150) { updateUI(); drawPlan(); st.lastUi = now; }
  if (now - st.lastTrend > 1000) { drawTrend(); st.lastTrend = now; }
  requestAnimationFrame(frame);
}
if (I.init) I.init();
bind(); setLang(I.lang);
requestAnimationFrame(frame);
window.__sim = () => sim;
})();

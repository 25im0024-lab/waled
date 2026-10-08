/* FPSO Console — UI layer: binds the FpsoSim physics core to the panels, the animated field layout, the turret plan view and trends. */
(function () {
'use strict';
const F_ = window.FPSO, CFG = F_.CFG, INFO = window.FPSO_INFO || {};
let sim = new F_.FpsoSim();
const $ = id => document.getElementById(id);
const I = window.I18N || { t: x => x, f: (x, v) => x.replace(/\{(\w+)\}/g, (m, k) => v[k]), lang: 'en' };
const T = x => I.t(x), F = (x, v) => I.f(x, v);
const st = { units: 'si', speed: 1, win: 21600, sound: false, hover: null, lastUi: 0, lastTrend: 0, lastMsg: 0, hidden: {}, beepT: 0, info: 'overview', anim: { flow: 0, wave: 0 } };
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

/* ---------------- field layout scene ---------------- */
const SEA = 250, BED = 598, PX = 2.2, TUR = 196, HULL0 = 140, HULL1 = 800, MAN = 500;
const TREES = [120, 310, 690, 870], WIX = 960;
let SC = {};
function callout(x, y, key, title, sub, w) {
  w = w || 196;
  return `<g class="co" data-info="${key}" transform="translate(${x} ${y})"><rect width="${w}" height="40" rx="3"/><text x="8" y="16" class="ct">${T(title)}</text><text x="8" y="33" class="cs" id="co_${key}">${T(sub)}</text></g>`;
}
function buildScene() {
  let h = `<defs>
  <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14254a"/><stop offset=".55" stop-color="#5b4a73"/><stop offset=".85" stop-color="#e58a4a"/><stop offset="1" stop-color="#f6b25c"/></linearGradient>
  <linearGradient id="gSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d4d7a"/><stop offset=".5" stop-color="#083356"/><stop offset="1" stop-color="#03182b"/></linearGradient>
  <linearGradient id="gHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f36"/><stop offset=".62" stop-color="#1b1f24"/><stop offset=".63" stop-color="#8a1f1f"/><stop offset="1" stop-color="#5c1212"/></linearGradient>
  <linearGradient id="gYel" x1="0" x2="1"><stop offset="0" stop-color="#9d7500"/><stop offset=".45" stop-color="#ffd84a"/><stop offset="1" stop-color="#8f6a00"/></linearGradient>
  <linearGradient id="gSteel" x1="0" x2="1"><stop offset="0" stop-color="#55697e"/><stop offset=".5" stop-color="#cfdbe6"/><stop offset="1" stop-color="#4c5f73"/></linearGradient>
  <linearGradient id="gOil" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c98b24"/><stop offset="1" stop-color="#6e4310"/></linearGradient>
  <linearGradient id="gRes" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffb42e"/><stop offset="1" stop-color="#8c4b07"/></linearGradient>
  <radialGradient id="gSun" cx=".88" cy=".9" r=".35"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
  <filter id="glow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <pattern id="rock" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="#2b2620"/><path d="M0 12 L6 4 L12 9 L18 2 L24 8" stroke="#3a332a" fill="none"/></pattern></defs>
  <rect width="1000" height="${SEA}" fill="url(#gSky)"/><rect width="1000" height="${SEA}" fill="url(#gSun)"/>
  <g opacity=".35" fill="#20304f"><ellipse cx="160" cy="70" rx="120" ry="16"/><ellipse cx="520" cy="45" rx="160" ry="14"/><ellipse cx="830" cy="95" rx="140" ry="12"/></g>
  <rect y="${SEA}" width="1000" height="${BED - SEA}" fill="url(#gSea)"/>
  <g opacity=".18" fill="#9fe0ff">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${120 + i * 150} ${SEA} L${80 + i * 150} ${BED} L${170 + i * 150} ${BED} Z"/>`).join('')}</g>`;
  // subsurface: seabed, strata, reservoir, OWC
  h += `<rect y="${BED}" width="1000" height="${760 - BED}" fill="#241d16"/><rect y="${BED}" width="1000" height="16" fill="url(#rock)"/>
  <path d="M0 640 C200 632 400 652 600 640 S900 630 1000 642 V662 C800 652 600 670 400 660 S100 650 0 664Z" fill="#3a2f22"/>
  <path d="M0 676 C220 660 420 690 640 672 S900 662 1000 676 V700 C800 690 600 712 400 700 S150 690 0 704Z" fill="#4a3a28"/>
  <g data-info="reservoir" class="hot"><path id="resOil" d="M40 712 C200 694 360 700 520 696 S820 700 960 716 L960 728 C800 722 600 726 500 726 S200 724 40 730Z" fill="url(#gRes)" filter="url(#glow)" opacity=".9"/>
  <path d="M40 730 C200 724 400 726 500 726 S800 722 960 728 L960 744 C760 740 500 746 300 744 S100 744 40 746Z" fill="#1f5f8f" opacity=".75"/>
  <path d="M40 730 C200 724 400 726 500 726 S800 722 960 728" stroke="#7fd0ff" stroke-dasharray="6 4" fill="none"/>
  <text x="880" y="758" class="sl">OWC</text></g>`;
  // wells: downhole paths, trees, flowlines
  const tip = [190, 360, 640, 820];
  TREES.forEach((x, i) => {
    h += `<path d="M${x} ${BED - 4} C${x} ${650} ${(x + tip[i]) / 2} ${680} ${tip[i]} 712" stroke="#9fb3c8" stroke-width="2.4" fill="none"/>
    <path id="dh${i}" class="flow" d="M${tip[i]} 712 C${(x + tip[i]) / 2} 680 ${x} 650 ${x} ${BED - 4}" stroke="#ffb627" stroke-width="2" fill="none"/>
    <path d="M${x} ${BED} H${MAN}" stroke="#16222e" stroke-width="7" fill="none"/><path id="fl${i}" class="flow" d="M${x} ${BED} H${MAN}" stroke="#ffb627" stroke-width="3" fill="none" transform="translate(0 ${(i % 2) * 3 - 1})"/>
    <g data-info="wells" class="hot" transform="translate(${x} ${BED - 4})"><rect x="-9" y="-30" width="18" height="30" fill="url(#gYel)" stroke="#3a2a00"/><rect x="-16" y="-20" width="32" height="7" fill="url(#gYel)" stroke="#3a2a00"/><rect x="-5" y="-38" width="10" height="9" fill="#c49b18"/><circle id="tl${i}" cx="0" cy="-44" r="4" fill="#2bd66f" filter="url(#glow)"/>
    <text x="0" y="16" class="sl" text-anchor="middle">${CFG.wells[i].id}</text></g>`;
  });
  // water injection well
  h += `<path d="M${WIX} ${BED - 4} C${WIX} 660 ${WIX - 30} 700 ${WIX - 60} 738" stroke="#9fb3c8" stroke-width="2.4" fill="none"/><path id="dhWi" class="flow" d="M${WIX} ${BED - 4} C${WIX} 660 ${WIX - 30} 700 ${WIX - 60} 738" stroke="#3fb0ff" stroke-width="2" fill="none"/>
  <path d="M${MAN + 40} ${BED + 4} H${WIX}" stroke="#16222e" stroke-width="6"/><path id="flWi" class="flow" d="M${MAN + 40} ${BED + 4} H${WIX}" stroke="#3fb0ff" stroke-width="2.6"/>
  <g data-info="injection" class="hot" transform="translate(${WIX} ${BED - 4})"><rect x="-8" y="-26" width="16" height="26" fill="#3b78b5" stroke="#0d2a48"/><rect x="-13" y="-17" width="26" height="6" fill="#3b78b5"/><text x="0" y="16" class="sl" text-anchor="middle">WI-1</text></g>`;
  // manifold
  h += `<g data-info="manifold" class="hot" transform="translate(${MAN} ${BED - 6})"><rect x="-46" y="-26" width="92" height="26" fill="url(#gYel)" stroke="#3a2a00"/>${[-34, -18, -2, 14, 30].map(x => `<rect x="${x}" y="-38" width="8" height="12" fill="#c49b18"/>`).join('')}<path d="M-46 -12 H46 M-46 -20 H46" stroke="#8f6a00"/></g>`;
  // risers (lazy wave): production x2, gas lift, water injection
  const riser = (dx, id, col, w) => { const x0 = TUR + dx, x1 = MAN - 30 + dx * 3; return `<path d="M${x1} ${BED - 32} C${x1 - 10} 480 ${x0 + 150} 500 ${x0 + 120} 440 S${x0 + 10} 380 ${x0} ${SEA + 60}" stroke="#16222e" stroke-width="${w + 3}" fill="none"/><path id="${id}" class="flow" d="M${x1} ${BED - 32} C${x1 - 10} 480 ${x0 + 150} 500 ${x0 + 120} 440 S${x0 + 10} 380 ${x0} ${SEA + 60}" stroke="${col}" stroke-width="${w}" fill="none"/>`; };
  h += `<g data-info="risers" class="hot">${riser(-6, 'rs0', '#ffb627', 3.4)}${riser(-2, 'rs1', '#ffb627', 3.4)}${riser(2, 'rsGl', '#9b7cff', 2.2)}${riser(6, 'rsWi', '#3fb0ff', 2.2)}
  ${[0, 1, 2, 3, 4].map(i => `<rect x="${TUR + 100 + i * 12}" y="${438 + Math.abs(i - 2) * 4}" width="10" height="14" rx="3" fill="#ffcf3a" stroke="#6a5000"/>`).join('')}</g>`;
  // mooring lines (catenaries to anchors)
  const moor = [[-40, 540], [10, 590], [60, 598], [430, 598], [560, 590]];
  h += `<g data-info="turret" class="hot">${moor.map((a, j) => `<path id="ml${j}" d="M${TUR} ${SEA + 62} Q${(TUR + a[0]) / 2} ${a[1] - 10} ${a[0]} ${a[1]}" stroke="#c9d6e3" stroke-width="1.6" fill="none"/>`).join('')}</g>`;
  // waves (drawn over hull bottom later) — hull group translated by draft
  h += `<g id="hull">
    <path data-info="storage" class="hot" d="M${HULL0 + 30} 0 H${HULL1} V${32 * PX} H${HULL0 + 40} C${HULL0 + 10} ${32 * PX} ${HULL0} ${20 * PX} ${HULL0} 0 Z" fill="url(#gHull)" stroke="#05080c"/>
    <g data-info="storage" class="hot">${[0, 1, 2, 3, 4].map(k => `<rect x="${320 + k * 82}" y="${8}" width="74" height="${24 * PX - 4}" rx="10" fill="#0c1218" stroke="#5c6a78"/><rect id="ct${k}" x="${322 + k * 82}" y="${8}" width="70" height="0" rx="9" fill="url(#gOil)"/>`).join('')}
    <text x="520" y="${30 * PX}" class="sl" text-anchor="middle" fill="#ffd9a8">${T('CARGO TANKS')}</text></g>
    <path d="M${HULL0 + 4} -4 H${HULL1}" stroke="#7f8a96" stroke-width="3"/>
    <!-- turret -->
    <g data-info="turret" class="hot"><rect x="${TUR - 18}" y="-34" width="36" height="${32 * PX + 46}" fill="url(#gYel)" stroke="#3a2a00"/><rect x="${TUR - 26}" y="-44" width="52" height="12" fill="#e2b52c" stroke="#3a2a00"/>${[0, 1, 2, 3].map(k => `<path d="M${TUR - 18} ${-20 + k * 30} H${TUR + 18}" stroke="#8f6a00"/>`).join('')}</g>
    <!-- flare tower -->
    <g data-info="flare" class="hot"><path d="M232 -4 L246 -150 L260 -4 M236 -40 H256 M239 -80 H253 M242 -120 H250 M236 -40 L253 -80 M256 -40 L239 -80 M239 -80 L250 -120 M253 -80 L242 -120" stroke="#9fb3c8" stroke-width="2" fill="none"/>
      <path id="flame" d="M246 -150 c-12 -14 -4 -30 0 -44 c4 14 14 30 0 44z" fill="#ffb627" filter="url(#glow)"/><path id="flame2" d="M246 -152 c-6 -8 -2 -18 0 -26 c2 8 8 18 0 26z" fill="#fff3b0"/></g>
    <!-- process modules -->
    <g data-info="separator" class="hot"><rect x="290" y="-46" width="150" height="42" fill="#3b4652" stroke="#8fa2b5"/>
      <rect x="300" y="-38" width="88" height="22" rx="11" fill="url(#gSteel)" stroke="#2e3b48"/><rect id="sepLiq" x="302" y="-26" width="84" height="8" rx="4" fill="#c98b24"/><rect x="396" y="-36" width="36" height="16" rx="8" fill="url(#gSteel)"/><text x="365" y="-50" class="sl" text-anchor="middle">${T('SEPARATION')}</text></g>
    <g data-info="compression" class="hot"><rect x="450" y="-64" width="120" height="60" fill="#46505b" stroke="#8fa2b5"/>${[0, 1, 2].map(k => `<rect x="${460 + k * 36}" y="-56" width="28" height="22" fill="#5c6a78" stroke="#9fb3c8"/><circle cx="${474 + k * 36}" cy="-24" r="8" fill="#2b3640" stroke="#9fb3c8"/>`).join('')}
      <path d="M470 -64 V-96 M500 -64 V-104 M530 -64 V-96" stroke="#9fb3c8" stroke-width="5"/><circle id="cA" cx="458" cy="-58" r="4"/><circle id="cB" cx="562" cy="-58" r="4"/><text x="510" y="-108" class="sl" text-anchor="middle">${T('GAS COMPRESSION')}</text></g>
    <g data-info="power" class="hot"><rect x="580" y="-50" width="70" height="46" fill="#3e4954" stroke="#8fa2b5"/><path d="M596 -50 V-86 M616 -50 V-90 M636 -50 V-86" stroke="#7f8a96" stroke-width="7"/><g id="smoke" opacity="0">${[0, 1, 2].map(k => `<circle cx="${596 + k * 20}" cy="-98" r="7" fill="#555"/>`).join('')}</g><text x="615" y="-96" class="sl" text-anchor="middle">${T('POWER')}</text></g>
    <g data-info="water" class="hot"><rect x="658" y="-40" width="62" height="36" fill="#34506b" stroke="#8fa2b5"/>${[0, 1, 2, 3].map(k => `<rect x="${664 + k * 14}" y="-34" width="8" height="24" rx="3" fill="#7fb6e0"/>`).join('')}<text x="689" y="-46" class="sl" text-anchor="middle">${T('WATER')}</text></g>
    <g data-info="accommodation" class="hot"><rect x="728" y="-92" width="66" height="88" fill="#e9eef3" stroke="#9aa6b2"/>${[0, 1, 2, 3, 4].map(k => `<path d="M734 ${-82 + k * 16} H788" stroke="#4f6c8a" stroke-width="4" stroke-dasharray="6 3"/>`).join('')}<rect x="740" y="-110" width="40" height="18" fill="#dfe6ee"/><path d="M760 -110 V-132" stroke="#9aa6b2" stroke-width="2"/></g>
    <path d="M300 -4 H720" stroke="#ffb627" stroke-width="2" opacity=".6"/>
    <g><path d="M560 -64 L600 -150 L640 -110" stroke="#ffcf3a" stroke-width="4" fill="none"/><path d="M640 -110 V-80" stroke="#c9d6e3"/></g>
  </g>`;
  // shuttle tanker group
  h += `<g id="tanker" data-info="tanker" class="hot"><path d="M0 0 H150 C160 0 168 10 168 22 V36 H10 C4 36 0 26 0 18Z" fill="url(#gHull)" stroke="#05080c"/><rect x="120" y="-26" width="34" height="26" fill="#e9eef3"/><rect x="128" y="-36" width="18" height="10" fill="#dfe6ee"/>
    <path d="M10 -2 H118" stroke="#7f8a96" stroke-width="2"/><rect x="40" y="-8" width="60" height="6" fill="#4f5b66"/><text x="84" y="52" class="sl" text-anchor="middle">${T('SHUTTLE TANKER')}</text></g>
  <path id="hawser" d="" stroke="#e8e0c8" stroke-width="1.5" fill="none"/><path id="hose" d="" stroke="#16222e" stroke-width="5" fill="none"/><path id="hoseF" class="flow" d="" stroke="#ffb627" stroke-width="2.4" fill="none"/>`;
  // sea surface (animated) over the hulls
  h += `<path id="waves" d="" fill="#0d4d7a" opacity=".55"/><path id="waveLine" d="" stroke="#bfe9ff" stroke-width="1.2" fill="none" opacity=".8"/>`;
  // wind indicator
  h += `<g transform="translate(36 200)"><circle r="22" fill="#0b1e36aa" stroke="#4f6c8a"/><path id="windArrow" d="M0 -16 L6 0 H2 V16 H-2 V0 H-6Z" fill="#dcecff"/><text y="38" class="sl" text-anchor="middle" id="windTxt">—</text></g>`;
  // callouts (like an infographic)
  h += callout(8, 46, 'turret', 'TURRET MOORING', 'Keeps the FPSO on station', 200)
    + callout(290, 8, 'separator', 'PROCESSING', 'Separates oil, gas and water', 210)
    + callout(520, 8, 'compression', 'GAS COMPRESSION', 'Export, lift and fuel gas', 210)
    + callout(800, 96, 'tanker', 'SHUTTLE TANKER', 'Receives crude oil', 192)
    + callout(560, 300, 'storage', 'CRUDE OIL STORAGE', 'Stored in the hull tanks', 210)
    + callout(330, 372, 'risers', 'RISERS', 'Well fluids to the FPSO', 170)
    + callout(560, 466, 'manifold', 'SUBSEA MANIFOLD', 'Combines production from wells', 230)
    + callout(8, 470, 'flowlines', 'FLOWLINES', 'Connect wells to the manifold', 220)
    + callout(758, 520, 'wells', 'SUBSEA WELLHEADS', 'Control production from the reservoir', 236)
    + callout(560, 676, 'reservoir', 'RESERVOIR', 'Oil, gas and water', 170)
    + callout(8, 120, 'flare', 'FLARE', 'Safe disposal of excess gas', 200);
  $('scene').innerHTML = `<style>.sl{font:10.5px system-ui,sans-serif;fill:#cfe3f7}.co rect{fill:#071425e6;stroke:#ffcf3a;stroke-width:1}.ct{font:700 13px system-ui,sans-serif;fill:#ffcf3a;letter-spacing:.03em}.cs{font:12px system-ui,sans-serif;fill:#e6f0fa}.co,.hot{cursor:pointer}.co:hover rect{stroke:#fff}.hot:hover{filter:brightness(1.25)}</style>` + h;
  for (const id of ['hull', 'tanker', 'hawser', 'hose', 'hoseF', 'waves', 'waveLine', 'flame', 'flame2', 'smoke', 'sepLiq', 'cA', 'cB', 'windArrow', 'windTxt', 'rs0', 'rs1', 'rsGl', 'rsWi', 'flWi', 'dhWi', 'ct0', 'ct1', 'ct2', 'ct3', 'ct4', 'ml0', 'ml1', 'ml2', 'ml3', 'ml4',
    'dh0', 'dh1', 'dh2', 'dh3', 'fl0', 'fl1', 'fl2', 'fl3', 'tl0', 'tl1', 'tl2', 'tl3', 'co_separator', 'co_storage', 'co_compression', 'co_tanker', 'co_risers', 'co_manifold', 'co_wells', 'co_reservoir', 'co_flare', 'co_turret', 'co_flowlines']) SC[id] = document.getElementById(id);
}
function flowAnim(el, q, qRef) {
  if (!el) return;
  if (q > qRef * 0.002) { el.style.animationPlayState = 'running'; el.style.animationDuration = clamp(2.2 * qRef / Math.max(q, 1e-9), 0.3, 8).toFixed(2) + 's'; el.style.opacity = 1; }
  else { el.style.animationPlayState = 'paused'; el.style.opacity = 0.2; }
}
const tensionCol = r => r > 0.55 ? '#ff4545' : r > 0.4 ? '#ffb627' : '#c9d6e3';
function updateScene(dtA) {
  const s = sim.s, d = sim.d, c = sim.c, A = st.anim;
  A.wave += dtA;
  // hull floats at its draft
  const draft = d.draft || 12, yDeck = SEA - (32 - draft) * PX, heave = Math.sin(A.wave * 0.9) * Math.min(c.env.hs, 8) * 0.35;
  SC.hull.setAttribute('transform', `translate(0 ${(yDeck + heave).toFixed(2)})`);
  const frac = s.cargo / CFG.cargo.cap, th = (24 * PX - 4) * frac;
  for (let k = 0; k < 5; k++) { SC['ct' + k].setAttribute('y', 8 + (24 * PX - 4) - th); SC['ct' + k].setAttribute('height', Math.max(0, th)); }
  // sea surface
  const amp = 1.5 + Math.min(c.env.hs, 9) * 1.4; let p = `M0 ${SEA + 40} V${SEA}`, l = '';
  for (let x = 0; x <= 1000; x += 20) { const y = SEA + Math.sin(x / 38 + A.wave * 1.6) * amp * 0.6 + Math.sin(x / 91 - A.wave) * amp * 0.4; p += ` L${x} ${y.toFixed(1)}`; l += (x ? ' L' : 'M') + `${x} ${y.toFixed(1)}`; }
  SC.waves.setAttribute('d', p + ` V${SEA + 40} Z`); SC.waveLine.setAttribute('d', l);
  // flare
  const fl = s.sep.flareQ, sc = clamp(0.35 + Math.sqrt(fl) * 1.4, 0.35, 3.2) * (0.9 + 0.1 * Math.sin(A.wave * 9));
  for (const f of [SC.flame, SC.flame2]) f.setAttribute('transform', `translate(246 -150) scale(${sc.toFixed(2)}) translate(-246 150)`);
  SC.smoke.setAttribute('opacity', s.power.diesel ? 0.7 : 0);
  SC.sepLiq.setAttribute('width', (84 * clamp(s.sep.LT / 100, 0, 1)).toFixed(1));
  SC.cA.setAttribute('fill', s.comp.tripped[0] ? '#ff4545' : c.comp[0] ? '#2bd66f' : '#28384b'); SC.cB.setAttribute('fill', s.comp.tripped[1] ? '#ff4545' : c.comp[1] ? '#2bd66f' : '#28384b');
  // flows
  const qL = s.wellsQin.L;
  s.wells.forEach((w, i) => { flowAnim(SC['dh' + i], w.q, 5000); flowAnim(SC['fl' + i], w.q, 5000); SC['tl' + i].setAttribute('fill', w.q > 50 ? '#2bd66f' : sim.c.wells[i].open && w.ch > 5 ? '#ffb627' : '#ff4545'); });
  flowAnim(SC.rs0, qL / 2, 9000); flowAnim(SC.rs1, qL / 2, 9000); flowAnim(SC.rsGl, s.gasUse.lift, 0.5); flowAnim(SC.rsWi, s.wi.q, 20000); flowAnim(SC.flWi, s.wi.q, 20000); flowAnim(SC.dhWi, s.wi.q, 20000);
  // mooring line colours (side view shows the 5 drawn lines mapped onto the 9 lines)
  const Tl = s.moor.T || []; [0, 1, 2, 3, 4].forEach(j => { const t = Math.max(Tl[j] || 0, Tl[j + 4] || 0); SC['ml' + j].setAttribute('stroke', s.moor.failed[j] ? '#ff4545' : tensionCol(t / CFG.moor.MBL)); SC['ml' + j].setAttribute('stroke-dasharray', s.moor.failed[j] ? '4 4' : ''); });
  // shuttle tanker
  const tk = s.tanker, Tc = CFG.tanker; let tx = 1100;
  if (tk.st === 'approaching') tx = 1100 - 290 * clamp(tk.t / Tc.approach, 0, 1);
  else if (['hookup', 'offloading', 'disconnect'].includes(tk.st)) tx = 810;
  else if (tk.st === 'departing') tx = 810 + 290 * clamp(tk.t / Tc.depart, 0, 1);
  const tDraft = 6 + 12 * tk.cargo / Tc.cap, ty = SEA - (20 - tDraft) * 1.4 + Math.sin(A.wave * 1.1 + 1) * Math.min(c.env.hs, 8) * 0.45;
  SC.tanker.setAttribute('transform', `translate(${tx} ${ty.toFixed(1)}) scale(.95)`);
  const conn = ['offloading', 'hookup', 'disconnect'].includes(tk.st) && tx < 900;
  const sx = HULL1, sy = yDeck + heave + 4;
  SC.hawser.setAttribute('d', conn ? `M${sx} ${sy} Q${(sx + tx) / 2} ${SEA + 6} ${tx + 4} ${ty + 4}` : '');
  const hp = conn && tk.st !== 'hookup' ? `M${sx - 4} ${sy + 8} Q${(sx + tx) / 2} ${SEA + 20} ${tx + 6} ${ty + 10}` : '';
  SC.hose.setAttribute('d', hp); SC.hoseF.setAttribute('d', hp); flowAnim(SC.hoseF, tk.st === 'offloading' ? c.offRate : 0, 6000);
  // wind indicator: arrow points where the wind blows to
  SC.windArrow.setAttribute('transform', `rotate(${(c.env.windDir + 180).toFixed(0)})`); SC.windTxt.textContent = fu('spd', c.env.wind, 0);
  // live values on the callouts
  SC.co_separator.textContent = `${fu('press', s.sep.P, 1)} · ${T('level')} ${nf(s.sep.LT, 0)} %`;
  SC.co_storage.textContent = `${fu('vol', s.cargo, 0)} · ${nf(frac * 100, 0)} %`;
  SC.co_compression.textContent = `${fu('gas', s.comp.q, 2)} · ${nf(s.comp.power, 1)} MW`;
  SC.co_tanker.textContent = T(TK_TXT[tk.st]);
  SC.co_risers.textContent = `${fu('liq', qL, 0)}`;
  SC.co_manifold.textContent = `${fu('press', s.Pman, 1)}`;
  SC.co_flare.textContent = `${fu('gas', s.sep.flareQ, 2)}`;
  SC.co_reservoir.textContent = `${fu('press', s.Pr, 0)}`;
  SC.co_turret.textContent = `${T('offset')} ${fu('len', s.moor.offset, 0)}`;
  SC.co_flowlines.textContent = `${fu('temp', s.Tarr, 0)}`;
}
const TK_TXT = { none: 'No tanker', approaching: 'Approaching', hookup: 'Connecting hawser & hose', offloading: 'Offloading', disconnect: 'Disconnecting', departing: 'Departing' };

/* ---------------- explanation panel ---------------- */
function showInfo(key) {
  st.info = key; const it = INFO[key] || INFO.overview; if (!it) return;
  const L = I.lang === 'ar' ? 1 : 0;
  $('info').innerHTML = `<h3 class="ih">${it.t[L]}</h3><p class="is">${it.s[L]}</p>${it.b[L]}<div class="itags">${Object.keys(INFO).map(k => `<button class="btn sm${k === key ? ' on' : ''}" data-info="${k}">${INFO[k].t[L]}</button>`).join('')}</div>`;
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
  window.addEventListener('resize', () => { drawTrend(); drawPlan(); });
}
function setLang(l) { if (I.setLang) I.setLang(l); document.querySelectorAll('[data-lang]').forEach(b => on(b, b.dataset.lang === I.lang)); buildParams(); buildWells(); buildComp(); buildScene(); buildLegend(); showInfo(st.info); $('soundBtn').textContent = T(st.sound ? '🔊 Horn' : '🔇 Horn'); updateUI(); drawTrend(); drawPlan(); }

/* ---------------- main loop ---------------- */
let last = performance.now();
function frame(now) {
  const dtR = Math.min(0.25, (now - last) / 1000); last = now;
  if (st.speed > 0) { const simT = dtR * st.speed, h = st.speed >= 3600 ? 4 : st.speed >= 600 ? 2 : 1; const n = Math.min(Math.ceil(simT / h), 2000); for (let i = 0; i < n; i++) sim.step(simT / n); }
  updateScene(dtR * (st.speed ? 1 : 0));
  if (now - st.lastUi > 150) { updateUI(); drawPlan(); st.lastUi = now; }
  if (now - st.lastTrend > 1000) { drawTrend(); st.lastTrend = now; }
  requestAnimationFrame(frame);
}
if (I.init) I.init();
bind(); setLang(I.lang);
requestAnimationFrame(frame);
window.__sim = () => sim;
})();

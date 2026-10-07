/* Driller's Console — UI layer: binds the RigSim physics core to the console, animated rig schematic and trends. */
(function () {
'use strict';
const R = window.Rig, CFG = R.CFG;
let sim = new R.RigSim();
const $ = id => document.getElementById(id);
const st = { units: 'si', speed: 1, win: 3600, sound: false, hover: null, lastUi: 0, lastTrend: 0, lastPw: 0, lastMsg: 0, hidden: {}, beepT: 0, anim: { td: 0, drum: 0, pump: [0, 0, 0], shake: 0, bit: 0 } };

/* ---------------- units ---------------- */
const UN = {
  len: { si: ['m', 1], fd: ['ft', 3.28084] }, rop: { si: ['m/h', 1], fd: ['ft/h', 3.28084] }, spd: { si: ['m/min', 1], fd: ['ft/min', 3.28084] },
  force: { si: ['kN', 1], fd: ['klbf', 0.224809] }, torque: { si: ['kN·m', 1], fd: ['kft·lbf', 0.737562] },
  press: { si: ['bar', 1], fd: ['psi', 14.5038, 0] }, flow: { si: ['L/min', 1], fd: ['gpm', 0.264172, 0] },
  vol: { si: ['m³', 1], fd: ['bbl', 6.28981] }, dens: { si: ['sg', 1], fd: ['ppg', 8.3454, 2] },
  temp: { si: ['°C', 1], fd: ['°F', 1] }, mpa: { si: ['MPa', 1], fd: ['ksi', 0.145038] },
};
const cv = (q, v) => q === 'temp' ? (st.units === 'si' ? v : v * 1.8 + 32) : (UN[q] ? v * UN[q][st.units][1] : v);
const un = q => UN[q] ? UN[q][st.units][0] : (q || '');
function fmt(q, v, dec) {
  if (v === undefined || v === null || !isFinite(v)) return '—';
  const u = UN[q]; const d = u && st.units === 'fd' && u.fd[2] !== undefined ? u.fd[2] : dec;
  const x = cv(q, v); return (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d);
}
const fu = (q, v, dec) => fmt(q, v, dec) + ' ' + un(q);
const toSI = (q, x) => q === 'temp' ? (st.units === 'si' ? x : (x - 32) / 1.8) : (UN[q] ? x / UN[q][st.units][1] : x);

/* ---------------- primary parameters ---------------- */
const PARAMS = [
  ['holeDepth', 'Hole Depth', 'len', 1], ['bitDepth', 'Bit Depth', 'len', 1], ['blockH', 'Block Position', 'len', 2], ['blockV', 'Block Speed', 'spd', 1],
  ['hl', 'Hook Load', 'force', 1], ['wob', 'WOB', 'force', 1], ['rop', 'ROP', 'rop', 1], ['rpm', 'Top Drive RPM', 'rpm', 0],
  ['torque', 'Top Drive Torque', 'torque', 1], ['spp', 'Standpipe Pressure', 'press', 1], ['pc', 'Casing Pressure', 'press', 1],
  ['spm', 'Pump Strokes', 'spm', 0], ['pumpP', 'Pump Pressure', 'press', 1], ['qin', 'Mud Flow In', 'flow', 0], ['qout', 'Mud Flow Out', 'flow', 0],
  ['pit', 'Mud Pit Volume', 'vol', 1], ['pitDelta', 'Pit Gain / Loss', 'vol', 2], ['dp', 'Differential Pressure', 'press', 1],
  ['rotTorque', 'Rotary Torque', 'torque', 1], ['ecd', 'ECD @ bit', 'dens', 3], ['gas', 'Gas', 'units', 0],
];
const ALARM_ROW = { HSPP: 'spp', LSPP: 'spp', HTQ: 'torque', STALL: 'torque', HHL: 'hl', OVERPULL: 'hl', HWOB: 'wob', HRPM: 'rpm', KICK: 'qout', LOWFLOW: 'qout', FLOWING: 'qout', PITGAIN: 'pitDelta', PITLOSS: 'pitDelta', HPC: 'pc', GAS: 'gas', BSPD: 'blockV', CROWN: 'blockH', CONN: 'blockH' };
function buildParams() {
  $('params').innerHTML = PARAMS.map(p => `<div class="prow" id="pr_${p[0]}"><span class="n">${p[1]} <i id="pu_${p[0]}"></i></span><span class="v" id="pv_${p[0]}">—</span></div>`).join('');
}

/* ---------------- pumps / BOP rows ---------------- */
function buildPumps() {
  $('pumps').innerHTML = [0, 1, 2].map(i => `<div class="pump">
    <h3>PUMP ${i + 1} <span class="lamp" id="pl${i}" title="Alarm"></span></h3>
    <div class="seg"><button class="btn sm" data-pon="${i}">On</button><button class="btn sm" data-poff="${i}">Off</button>
      <select data-liner="${i}" title="Liner size">${[5, 5.5, 6, 6.5].map(l => `<option value="${l}">${l}" liner</option>`).join('')}</select></div>
    <div class="ctl"><label>SPM</label><input type="range" min="0" max="130" step="1" data-pspm="${i}"><output id="po${i}"></output></div>
    <div class="kvt">
      <span>SPM</span><b id="pS${i}">—</b><span>Pressure</span><b id="pP${i}">—</b><span>Stroke</span><b id="pK${i}">—</b>
      <span>Flow</span><b id="pQ${i}">—</b><span>Motor load</span><b id="pL${i}">—</b><span>Strokes</span><b id="pT${i}" class="w">—</b><span>Status</span><b id="pX${i}">—</b>
    </div></div>`).join('');
}
const BOP_ROWS = [['annular', 'Annular BOP'], ['pipe', 'Pipe rams'], ['shear', 'Blind / shear rams'], ['hcr', 'HCR (choke line)'], ['kill', 'Kill line']];
function buildBop() {
  $('bopRows').innerHTML = BOP_ROWS.map(([k, n]) => `<span>${n}</span><span class="row" style="justify-content:flex-end;gap:4px">
    ${k === 'shear' ? `<button class="btn sm" data-arm="1">Arm</button><button class="btn sm red" data-fire="1">Fire</button>` :
      `<button class="btn sm" data-bop="${k}" data-st="OPEN">Open</button><button class="btn sm" data-bop="${k}" data-st="CLOSED">Close</button>`}
    <span class="pill d" id="bp_${k}">—</span></span>`).join('');
}
function buildSteps() { $('steps').innerHTML = R.CONN_STEPS.map((s, i) => `<li id="cs${i}">${i + 1}. ${s.n}</li>`).join(''); }

/* ---------------- alarm thresholds (instructor) ---------------- */
const TH_META = { sppHi: ['High SPP', 'press'], sppLoPct: ['Low SPP (fraction of expected)', ''], hlHi: ['High hook load', 'force'], overpull: ['Overpull', 'force'], flowDev: ['Flow deviation', 'flow'], flowPct: ['Flow deviation (% of in)', ''], flowCheck: ['Flow-check (pumps off)', 'flow'], pitGain: ['Pit gain', 'vol'], pitLoss: ['Pit loss', 'vol'], pcHiPct: ['Casing P (% of MAASP)', ''], accumLo: ['Low accumulator', 'press'], gasHi: ['High gas (units)', ''], blockSpeedHi: ['High block speed', 'spd'], tdTempHi: ['TD motor temperature', 'temp'] };
function buildTh() {
  $('thGrid').innerHTML = Object.keys(TH_META).map(k => { const [n, q] = TH_META[k]; return `<label>${n} ${q ? '(' + un(q) + ')' : ''}<input type="number" step="any" data-th="${k}" value="${q ? +cv(q, sim.th[k]).toFixed(2) : sim.th[k]}"></label>`; }).join('');
}

/* ---------------- scene ---------------- */
const X = 330, FL = 380, GR = 470, S = 7.0, SUB0 = 532, SUB1 = 852;
const xl = y => 250 + 56 * (FL - y) / (FL - 52), xr = y => 410 - 56 * (FL - y) / (FL - 52);
let SC = {};
function buildScene() {
  let h = `<defs>
  <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d2a4b"/><stop offset="1" stop-color="#061321"/></linearGradient>
  <linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2c1d"/><stop offset="1" stop-color="#1c150e"/></linearGradient>
  <linearGradient id="gYel" x1="0" x2="1"><stop offset="0" stop-color="#9d7500"/><stop offset=".45" stop-color="#ffd84a"/><stop offset="1" stop-color="#8f6a00"/></linearGradient>
  <linearGradient id="gRed" x1="0" x2="1"><stop offset="0" stop-color="#6d0b0b"/><stop offset=".45" stop-color="#e03a3a"/><stop offset="1" stop-color="#5e0a0a"/></linearGradient>
  <linearGradient id="gAmb" x1="0" x2="1"><stop offset="0" stop-color="#6a4a00"/><stop offset=".45" stop-color="#e6a515"/><stop offset="1" stop-color="#5c4000"/></linearGradient>
  <linearGradient id="gBlue" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3d8fe8"/><stop offset="1" stop-color="#103e7a"/></linearGradient>
  <linearGradient id="gSteel" x1="0" x2="1"><stop offset="0" stop-color="#55697e"/><stop offset=".5" stop-color="#cfdbe6"/><stop offset="1" stop-color="#4c5f73"/></linearGradient>
  <linearGradient id="gMud" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a37445"/><stop offset="1" stop-color="#5c3d20"/></linearGradient>
  <filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="clipSub"><rect x="0" y="${SUB0}" width="760" height="${SUB1 - SUB0}"/></clipPath></defs>
  <rect width="760" height="${GR}" fill="url(#gSky)"/>
  <rect y="${GR}" width="760" height="${SUB0 - GR - 4}" fill="url(#gGround)"/>
  <path d="M0 ${GR}H760" stroke="#6b5a40" stroke-width="2"/>`;
  // derrick lattice
  let lat = `M250 ${FL}L306 52M410 ${FL}L354 52`; const lv = []; for (let y = FL - 8; y > 60; y -= 34) lv.push(y);
  for (let i = 0; i < lv.length; i++) { const y = lv[i]; lat += `M${xl(y)} ${y}H${xr(y)}`; if (i + 1 < lv.length) { const y2 = lv[i + 1]; lat += `M${xl(y)} ${y}L${xr(y2)} ${y2}M${xr(y)} ${y}L${xl(y2)} ${y2}`; } }
  h += `<path d="${lat}" stroke="#7fa6c9" stroke-width="2" fill="none" opacity=".85"/><path d="M250 ${FL}L306 52M410 ${FL}L354 52" stroke="#c9dceb" stroke-width="4"/>`;
  const mb = FL - 27 * S; h += `<path d="M${xl(mb) - 34} ${mb}H${xl(mb)}" stroke="#c9dceb" stroke-width="4"/><text x="${xl(mb) - 36}" y="${mb - 5}" class="sl">Racking board</text>`;
  // crown
  h += `<rect x="296" y="34" width="68" height="20" rx="2" fill="url(#gYel)" stroke="#2a2000"/>${[312, 324, 336, 348].map(x => `<circle cx="${x}" cy="44" r="5" fill="#3a3000" stroke="#ffe27a"/>`).join('')}
  <text x="372" y="36" class="sl">Crown Block</text><text x="372" y="160" class="sl">Derrick / Mast</text>`;
  // standpipe + hose
  h += `<path id="stdp" d="M445 395V140" stroke="#3fb0ff" stroke-width="5" fill="none"/><path id="stdpF" class="flow" d="M445 395V140" stroke="#bfe9ff" stroke-width="2" fill="none"/>
  <path id="hose" d="" stroke="#1c2b3c" stroke-width="7" fill="none" stroke-linecap="round"/><path id="hoseF" class="flow" d="" stroke="#3fb0ff" stroke-width="3" fill="none"/>
  <text x="452" y="150" class="sl">Standpipe</text><text x="452" y="162" class="sv" id="tSpp">—</text>`;
  // drilling lines + drawworks
  h += `<g id="dlines" stroke="#d6e3ef" stroke-width="1.2">${[0, 1, 2, 3].map(i => `<line id="dl${i}" x1="${314 + i * 10.7}" y1="54"/>`).join('')}</g>
  <line x1="226" y1="356" x2="300" y2="48" stroke="#d6e3ef" stroke-width="1.2"/><line x1="360" y1="48" x2="404" y2="${FL - 2}" stroke="#d6e3ef" stroke-width="1.2"/>
  <rect x="198" y="350" width="54" height="30" rx="2" fill="#163556" stroke="#5c8fbf"/><g id="drum" transform="translate(225 365)"><circle r="12" fill="#2b4a6b" stroke="#bcd3ea"/><path d="M-12 0H12M0 -12V12M-8.5 -8.5L8.5 8.5M-8.5 8.5L8.5 -8.5" stroke="#bcd3ea" stroke-width="1.2"/></g>
  <text x="196" y="344" class="sl">Drawworks</text>`;
  // block + top drive
  h += `<g id="blk"><rect x="315" y="-18" width="30" height="18" rx="3" fill="url(#gYel)" stroke="#2a2000"/><path d="M330 0v6" stroke="#ffd84a" stroke-width="3"/>
    <rect x="314" y="6" width="32" height="20" rx="2" fill="url(#gYel)" stroke="#2a2000"/><rect x="346" y="8" width="13" height="15" rx="2" fill="#c49b18" stroke="#2a2000"/>
    <rect x="326" y="26" width="8" height="9" fill="url(#gSteel)"/><ellipse id="tdSpin" cx="330" cy="30" rx="7" ry="2.6" fill="none" stroke="#36c8ff" stroke-width="2" stroke-dasharray="4 4"/>
    <text x="364" y="-6" class="sl">Travelling Block</text><text x="364" y="16" class="sl">Top Drive</text><text x="364" y="28" class="sv" id="tRpm">—</text></g>
  <line id="strTop" x1="${X}" x2="${X}" stroke="url(#gSteel)" stroke-width="6"/><line id="stand" x1="${X}" x2="${X}" stroke="#9fb3c8" stroke-width="5" stroke-dasharray="40 2"/>
  <line id="stub" x1="${X}" x2="${X}" y1="${FL - 1.5 * S}" y2="${FL}" stroke="url(#gSteel)" stroke-width="6"/>`;
  // floor, substructure, rotary, slips
  h += `<path d="M215 ${FL + 8}L238 ${GR}M445 ${FL + 8}L422 ${GR}M215 ${FL + 8}L422 ${GR}M445 ${FL + 8}L238 ${GR}" stroke="#4f7397" stroke-width="2"/>
  <rect x="190" y="${FL}" width="285" height="8" fill="#2b4a6b" stroke="#6b97c2"/><ellipse cx="${X}" cy="${FL + 1}" rx="24" ry="4.5" fill="#0d1d30" stroke="#ffb627"/>
  <g id="slips" visibility="hidden"><path d="M${X - 13} ${FL - 4}L${X - 4} ${FL - 4}L${X - 4} ${FL + 4}L${X - 9} ${FL + 4}Z M${X + 13} ${FL - 4}L${X + 4} ${FL - 4}L${X + 4} ${FL + 4}L${X + 9} ${FL + 4}Z" fill="#ffb627"/></g>
  <line id="strBop" x1="${X}" x2="${X}" y1="${FL}" y2="${SUB0}" stroke="url(#gSteel)" stroke-width="5"/>
  <text x="478" y="${FL + 7}" class="sl">Drill floor</text>`;
  // BOP stack
  const ram = (id, y, hgt, fill) => `<rect x="${X - 34}" y="${y}" width="68" height="${hgt}" rx="3" fill="${fill}" stroke="#2a0000"/><rect id="${id}L" x="${X - 30}" y="${y + 3}" width="2" height="${hgt - 6}" fill="#ffd2d2"/><rect id="${id}R" x="${X + 28}" y="${y + 3}" width="2" height="${hgt - 6}" fill="#ffd2d2"/>`;
  h += `<rect x="${X - 9}" y="${FL + 8}" width="18" height="6" fill="#5b6f84"/>
  <rect x="${X - 27}" y="394" width="54" height="20" rx="9" fill="url(#gRed)" stroke="#2a0000"/><rect id="annL" x="${X - 22}" y="399" width="2" height="10" fill="#ffd2d2"/><rect id="annR" x="${X + 20}" y="399" width="2" height="10" fill="#ffd2d2"/>
  ${ram('pr', 417, 15, 'url(#gRed)')}${ram('sr', 435, 15, 'url(#gAmb)')}
  <rect x="${X - 24}" y="452" width="48" height="6" fill="#7b8da0"/><rect x="${X - 18}" y="458" width="36" height="12" fill="#56697d" stroke="#9fb3c8"/>
  <circle id="ldAnn" cx="${X + 41}" cy="404" r="4"/><circle id="ldPr" cx="${X + 41}" cy="424" r="4"/><circle id="ldSr" cx="${X + 41}" cy="442" r="4"/>
  <text x="${X + 48}" y="407" class="sl">Annular</text><text x="${X + 48}" y="427" class="sl">Pipe rams</text><text x="${X + 48}" y="445" class="sl">Blind/Shear</text>
  <text x="${X - 36}" y="${FL + 26}" class="sl" text-anchor="end">BOP Stack</text><text x="${X + 4}" y="494" class="sl">Wellhead</text>`;
  // choke / kill lines, MGS, flare
  h += `<path d="M${X + 24} 455H510V380" stroke="#4a1d1d" stroke-width="6" fill="none"/><path id="chkF" class="flow" d="M${X + 24} 455H510V380" stroke="#ff5a5a" stroke-width="3" fill="none"/>
  <path d="M${X - 24} 455H250" stroke="#36506b" stroke-width="5"/><path id="killV" d="M262 449L274 461M262 461L274 449" stroke="#9fb3c8" stroke-width="2.5"/>
  <path id="hcrV" d="M394 449L406 461V449L394 461Z" fill="#2bd66f" stroke="#081627"/><path id="chkV" d="M462 448L476 462V448L462 462Z" fill="#ffb627" stroke="#081627"/><rect x="465" y="438" width="8" height="8" fill="#9fb3c8"/>
  <text x="380" y="476" class="sl">HCR</text><text x="420" y="478" class="sl">Choke</text><text x="420" y="490" class="sv" id="tPc">—</text><text x="236" y="476" class="sl">Kill</text>
  <rect x="496" y="292" width="28" height="88" rx="10" fill="#183858" stroke="#6b97c2"/><text x="528" y="320" class="sl">Mud-gas</text><text x="528" y="332" class="sl">separator</text>
  <path d="M510 292V214H690V188" stroke="#36506b" stroke-width="3" fill="none"/><path id="flare" d="M690 188c-10-10-4-22 0-30c4 8 10 20 0 30z" fill="#ffb627" filter="url(#glow)" visibility="hidden"/>
  <text x="640" y="206" class="sl">Flare</text><text x="528" y="344" class="sv" id="tGas">—</text>
  <path id="mgsRet" class="flow" d="M496 372H486V496H140V462" stroke="#c9925a" stroke-width="3" fill="none" visibility="hidden"/>`;
  // flowline, shaker, pits, trip tank
  h += `<path d="M${X - 9} 391H250L205 401" stroke="#5c3d20" stroke-width="7" fill="none"/><path id="flowF" class="flow" d="M${X - 9} 391H250L205 401" stroke="#c9925a" stroke-width="3" fill="none"/>
  <g id="shaker"><rect x="148" y="393" width="58" height="12" rx="2" fill="#284c70" stroke="#8fb2d6"/><path d="M152 397H202" stroke="#c9925a" stroke-width="2" stroke-dasharray="3 2"/></g>
  <text x="148" y="388" class="sl">Shale shaker</text>
  ${[20, 112].map((x, i) => `<rect x="${x}" y="410" width="88" height="56" fill="#0d1d30" stroke="#6b97c2"/><rect id="mud${i}" x="${x + 2}" y="440" width="84" height="24" fill="url(#gMud)"/>`).join('')}
  <text x="22" y="404" class="sl">Mud Pits</text><text x="70" y="404" class="sv" id="tPit">—</text>
  <rect x="210" y="404" width="18" height="40" fill="#0d1d30" stroke="#6b97c2"/><rect id="ttLvl" x="212" y="420" width="14" height="22" fill="url(#gMud)"/><text x="206" y="456" class="sl" font-size="9">Trip tank</text>`;
  // suction, pumps, discharge
  h += `<path d="M196 462V512H740V462" stroke="#5c3d20" stroke-width="6" fill="none"/><path id="sucF" class="flow" d="M196 462V512H740V462" stroke="#c9925a" stroke-width="2.5" fill="none"/>
  <path d="M740 404V394H445" stroke="#143d66" stroke-width="7" fill="none"/><path id="disF" class="flow" d="M740 404V394H445" stroke="#3fb0ff" stroke-width="3" fill="none"/>`;
  for (let i = 0; i < 3; i++) {
    const x0 = 556 + i * 64;
    h += `<g><rect x="${x0}" y="404" width="56" height="58" rx="3" fill="url(#gBlue)" stroke="#9cc8ff"/>
      <rect x="${x0 + 4}" y="410" width="18" height="46" rx="2" fill="#0d3466" stroke="#5c8fbf"/>${[0, 1, 2].map(k => `<circle cx="${x0 + 13}" cy="${418 + k * 15}" r="5" fill="#1d6fd1" stroke="#bfe0ff"/>`).join('')}
      <rect id="rod${i}" x="${x0 + 22}" y="428" width="14" height="5" fill="#cfdbe6"/><rect x="${x0 + 36}" y="414" width="16" height="36" rx="2" fill="#123a6b" stroke="#5c8fbf"/>
      <circle id="pumpLamp${i}" cx="${x0 + 50}" cy="409" r="3.5" fill="#28384b"/><text x="${x0 + 28}" y="476" class="sl" text-anchor="middle">${i + 1}</text></g>`;
  }
  h += `<text x="740" y="526" class="sl" text-anchor="end">Mud Pumps (triplex)</text><text x="200" y="526" class="sl">Suction</text>`;
  // subsurface group (re-rendered), section break
  h += `<rect y="${SUB0 - 4}" width="760" height="${SUB1 - SUB0 + 8}" fill="#0a0f16"/><g id="sub" clip-path="url(#clipSub)"></g>
  <path d="M${X - 20} ${SUB0 - 10}l10 -6l10 6l10 -6l10 6" stroke="#ffb627" fill="none" stroke-width="1.5"/>
  <text x="8" y="${SUB0 + 14}" class="sl">Well section (depth window)</text>`;
  $('scene').innerHTML = `<style>.sl{font:10.5px system-ui,sans-serif;fill:#9cc4e8}.sv{font:700 11px system-ui,sans-serif;fill:#2bd66f}.fl{font:10px system-ui,sans-serif;fill:#e8dcc4}.dt{font:9.5px system-ui,sans-serif;fill:#7f9dbd}</style>` + h;
  for (const id of ['blk', 'strTop', 'stand', 'stub', 'hose', 'hoseF', 'drum', 'tdSpin', 'slips', 'strBop', 'annL', 'annR', 'prL', 'prR', 'srL', 'srR', 'ldAnn', 'ldPr', 'ldSr', 'chkF', 'hcrV', 'chkV', 'killV', 'flare', 'mgsRet', 'flowF', 'shaker', 'mud0', 'mud1', 'ttLvl', 'sucF', 'disF', 'stdpF', 'sub', 'tSpp', 'tRpm', 'tPc', 'tPit', 'tGas', 'rod0', 'rod1', 'rod2', 'pumpLamp0', 'pumpLamp1', 'pumpLamp2', 'dl0', 'dl1', 'dl2', 'dl3'])
    SC[id] = document.getElementById(id);
}
function flowAnim(el, q, qRef) { // q in L/min
  if (!el) return;
  if (q > 5) { el.style.animationPlayState = 'running'; el.style.animationDuration = clamp(2.2 * qRef / Math.max(q, 1), 0.25, 8).toFixed(2) + 's'; el.style.opacity = 1; }
  else { el.style.animationPlayState = 'paused'; el.style.opacity = 0.25; }
}
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sevColor = p => p >= 0.98 ? '#ff4545' : p <= 0.02 ? '#2bd66f' : '#ffb627';
function updateScene(dtA) {
  const s = sim.s, d = sim.d, A = st.anim;
  const yb = FL - s.blockH * S, ys = yb + CFG.tdOff * S;
  SC.blk.setAttribute('transform', `translate(0 ${yb})`);
  for (let i = 0; i < 4; i++) { SC['dl' + i].setAttribute('x2', 318 + i * 8); SC['dl' + i].setAttribute('y2', yb - 18); SC['dl' + i].setAttribute('y1', 54); }
  const hp = `M445 140C445 ${Math.min(yb + 60, 300)} 372 ${yb - 40} 359 ${yb + 10}`; SC.hose.setAttribute('d', hp); SC.hoseF.setAttribute('d', hp);
  const conn = s.connected && !s.sheared;
  SC.strTop.setAttribute('y1', ys); SC.strTop.setAttribute('y2', FL); SC.strTop.style.visibility = conn ? 'visible' : 'hidden';
  SC.stand.setAttribute('y1', ys); SC.stand.setAttribute('y2', ys + CFG.standLen * S); SC.stand.style.visibility = s.standOnTD ? 'visible' : 'hidden';
  SC.stub.style.visibility = !conn && !s.sheared ? 'visible' : 'hidden';
  SC.slips.setAttribute('visibility', s.inSlips ? 'visible' : 'hidden');
  SC.strBop.style.visibility = s.sheared ? 'hidden' : 'visible';
  A.td = (A.td + s.rpm / 60 * dtA * 16) % 16; SC.tdSpin.setAttribute('stroke-dashoffset', A.td.toFixed(2)); SC.tdSpin.style.opacity = s.rpm > 0.5 ? 1 : 0.3;
  A.drum = (A.drum + s.vUp * 60 * CFG.dw.lines / (Math.PI * CFG.dw.drumD) / 60 * 360 * dtA * 0.25) % 360; SC.drum.setAttribute('transform', `translate(225 365) rotate(${A.drum.toFixed(1)})`);
  // BOP visuals
  const b = s.bop;
  SC.annL.setAttribute('width', 2 + 16 * b.annular); SC.annR.setAttribute('x', X + 20 - 16 * b.annular); SC.annR.setAttribute('width', 2 + 16 * b.annular);
  SC.prL.setAttribute('width', 2 + 26 * b.pipe); SC.prR.setAttribute('x', X + 28 - 26 * b.pipe); SC.prR.setAttribute('width', 2 + 26 * b.pipe);
  SC.srL.setAttribute('width', 2 + 26 * b.shear); SC.srR.setAttribute('x', X + 28 - 26 * b.shear); SC.srR.setAttribute('width', 2 + 26 * b.shear);
  SC.ldAnn.setAttribute('fill', sevColor(b.annular)); SC.ldPr.setAttribute('fill', sevColor(b.pipe)); SC.ldSr.setAttribute('fill', sim.c.bop.shearArmed && b.shear < 0.02 ? '#ffb627' : sevColor(b.shear));
  SC.hcrV.setAttribute('fill', b.hcr > 0.98 ? '#2bd66f' : b.hcr < 0.02 ? '#ff4545' : '#ffb627'); SC.killV.setAttribute('stroke', b.kill > 0.98 ? '#2bd66f' : '#ff4545');
  const sealed = sim.sealed(), qo = s.qout * 60000, qi = s.qin * 60000;
  flowAnim(SC.chkF, sealed ? qo : 0, 3800); SC.chkF.style.visibility = sealed && b.hcr > 0.5 ? 'visible' : 'hidden';
  SC.mgsRet.setAttribute('visibility', sealed && qo > 5 ? 'visible' : 'hidden'); flowAnim(SC.mgsRet, sealed ? qo : 0, 3800);
  SC.flare.setAttribute('visibility', s.gas.surf || (s.gas.m > 0 && s.gas.zt < 30) ? 'visible' : 'hidden');
  flowAnim(SC.flowF, sealed ? 0 : qo, 3800); flowAnim(SC.sucF, qi, 3800); flowAnim(SC.disF, qi, 3800); flowAnim(SC.stdpF, qi, 3800); flowAnim(SC.hoseF, conn ? qi : 0, 3800);
  A.shake += dtA * 40; SC.shaker.setAttribute('transform', qo > 50 && !sealed ? `translate(${Math.sin(A.shake) * 0.8} 0)` : '');
  for (let i = 0; i < 3; i++) {
    const p = s.pumps[i]; A.pump[i] = (A.pump[i] + p.spm / 60 * dtA * 2 * Math.PI) % (2 * Math.PI);
    SC['rod' + i].setAttribute('x', 556 + i * 64 + 22 + 5 * Math.sin(A.pump[i]));
    SC['pumpLamp' + i].setAttribute('fill', p.relief || p.effLoss > 0.1 ? '#ff4545' : p.spm > 1 ? '#2bd66f' : '#28384b');
  }
  const lv = clamp(s.pit / 800, 0, 1) * 52; for (const k of ['mud0', 'mud1']) { SC[k].setAttribute('y', 464 - lv); SC[k].setAttribute('height', lv); }
  const tl = clamp(s.tripTank / 30, 0, 1) * 36; SC.ttLvl.setAttribute('y', 442 - tl); SC.ttLvl.setAttribute('height', tl);
  SC.tSpp.textContent = fu('press', d.spp, 1); SC.tRpm.textContent = fmt('', d.rpm, 0) + ' rpm · ' + fu('torque', d.torque, 1);
  SC.tPc.textContent = fu('press', d.pc, 1); SC.tPit.textContent = fu('vol', d.pit, 1); SC.tGas.textContent = 'Gas ' + fmt('', d.gas, 0) + ' u';
}
function renderSub() {
  const s = sim.s, d = sim.d, bd = sim.bitDepth(), W = 1000;
  const top = Math.max(0, bd - 0.72 * W), y = z => SUB0 + (z - top) * (SUB1 - SUB0) / W;
  let h = '';
  for (const f of R.formations(sim.haz)) {
    if (f.bot < top || f.top > top + W) continue;
    const y0 = Math.max(y(f.top), SUB0), y1 = Math.min(y(f.bot), SUB1);
    h += `<rect x="40" y="${y0}" width="720" height="${y1 - y0}" fill="${f.col}" opacity=".55"/><path d="M40 ${y0}H760" stroke="#000" stroke-opacity=".35"/>`;
    if (y1 - y0 > 11) h += `<text x="752" y="${(y0 + y1) / 2 + 3}" class="fl" text-anchor="end">${f.n} · pp ${f.pp[1].toFixed(2)} sg${f.gas ? ' · GAS' : ''}${f.loss ? ' · LOSS' : ''}</text>`;
  }
  for (let z = Math.ceil(top / 100) * 100; z < top + W; z += 100) h += `<path d="M30 ${y(z)}H44" stroke="#7f9dbd"/><text x="2" y="${y(z) + 3}" class="dt">${fmt('len', z, 0)}</text>`;
  const shoeY = y(CFG.shoe), holeB = y(s.Dh);
  // annulus (mud), casing, open hole
  h += `<rect x="${X - 16}" y="${SUB0}" width="32" height="${Math.max(0, holeB - SUB0)}" fill="#6d4a2a"/>`;
  if (shoeY > SUB0) h += `<path d="M${X - 18} ${SUB0}V${shoeY}M${X + 18} ${SUB0}V${shoeY}" stroke="#c4ced8" stroke-width="3"/><path d="M${X - 18} ${shoeY}l-6 6h6zM${X + 18} ${shoeY}l6 6h-6z" fill="#c4ced8"/><text x="${X + 28}" y="${shoeY + 4}" class="fl">13⅜" shoe ${fmt('len', CFG.shoe, 0)} ${un('len')}</text>`;
  else h += `<text x="${X + 24}" y="${SUB0 + 12}" class="fl">↑ 13⅜" shoe @ ${fmt('len', CFG.shoe, 0)} ${un('len')}</text>`;
  // gas
  const g = s.gas;
  if (g.m > 0) { const ya = Math.max(y(g.zt || g.zb), SUB0), yz = Math.max(y(g.zb), ya + 2); h += `<rect x="${X - 16}" y="${ya}" width="10" height="${yz - ya}" fill="#ffe14d" opacity=".85"/><rect x="${X + 6}" y="${ya}" width="10" height="${yz - ya}" fill="#ffe14d" opacity=".85"/>`; if (yz > SUB0 + 4) h += `<text x="${X - 22}" y="${(ya + yz) / 2 + 3}" class="fl" text-anchor="end" fill="#ffe14d">gas ${fmt('vol', g.V, 1)} ${un('vol')}</text>`; }
  // string
  if (!s.sheared) {
    const yBha = y(Math.max(0, bd - CFG.bha.len)), yBit = y(bd);
    h += `<rect x="${X - 3}" y="${SUB0}" width="6" height="${Math.max(0, yBha - SUB0)}" fill="#c4ced8"/><rect x="${X - 6}" y="${Math.max(yBha, SUB0)}" width="12" height="${Math.max(0, yBit - Math.max(yBha, SUB0))}" fill="#8fa2b5"/>
      <path d="M${X - 9} ${yBit}h18l-9 9z" fill="#ffb627" transform="rotate(${(st.anim.bit % 360).toFixed(0)} ${X} ${yBit + 4})"/>
      <text x="${X + 30}" y="${yBit + 4}" class="fl">◄ Bit ${fmt('len', bd, 1)} ${un('len')}</text>`;
  }
  h += `<path d="M${X - 18} ${holeB}H${X + 18}" stroke="#ffb627" stroke-width="1.5"/><text x="${X - 24}" y="${holeB + 12}" class="fl" text-anchor="end">TD ${fmt('len', s.Dh, 1)}</text>`;
  if (s.qInfl > 1) h += `<text x="${X - 60}" y="${y(Math.min(s.Dh, bd)) - 4}" class="fl" fill="#ffe14d" font-size="14">⟹ influx ${fmt('flow', s.qInfl, 0)} ${un('flow')}</text>`;
  if (s.qLoss > 1) h += `<text x="${X + 30}" y="${y(s.Dh) - 14}" class="fl" fill="#ff8a8a" font-size="13">⟸ losses ${fmt('flow', s.qLoss, 0)} ${un('flow')}</text>`;
  h += `<text x="60" y="${SUB1 - 8}" class="fl">MW in ${fmt('dens', d.mwIn, 3)} ${un('dens')} · ECD ${fmt('dens', d.ecd, 3)} · BHP ${fu('press', d.bhp, 1)} · Pp ${fu('press', d.pp, 1)}</text>`;
  SC.sub.innerHTML = h;
}

/* ---------------- trends ---------------- */
const TRACKS = [
  [['wob', 'WOB', 'force', 0, 300, '#36d97b'], ['rop', 'ROP', 'rop', 0, 60, '#ffb627']],
  [['hl', 'Hook load', 'force', 0, 2200, '#4f8dff'], ['blockH', 'Block pos', 'len', 0, 45, '#9fb3c8']],
  [['torque', 'Torque', 'torque', 0, 35, '#ff8a3d'], ['rpm', 'RPM', '', 0, 200, '#b689ff']],
  [['spp', 'SPP', 'press', 0, 350, '#36c8ff'], ['pc', 'Casing P', 'press', 0, 150, '#ff4545']],
  [['qin', 'Flow in', 'flow', 0, 5000, '#7fdcff'], ['qout', 'Flow out', 'flow', 0, 5000, '#ff6fd8'], ['pitDelta', 'Pit Δ', 'vol', -10, 10, '#ffe14d']],
];
function buildLegend() {
  $('legend').innerHTML = TRACKS.flat().map(c => `<span data-ch="${c[0]}" class="${st.hidden[c[0]] ? 'off' : ''}"><i style="background:${c[5]}"></i>${c[1]} <em class="hint">(${un(c[2]) || c[2]})</em></span>`).join('');
}
function trendData() {
  const T = sim.trend, n = Math.min(T.n, T.N), out = [];
  for (let k = n; k > 0; k--) { const i = (T.n - k) % T.N; out.push(i); } return out;
}
function drawTrend() {
  const cv0 = $('trend'), dpr = window.devicePixelRatio || 1, W = cv0.clientWidth, H = cv0.clientHeight;
  if (cv0.width !== Math.round(W * dpr)) { cv0.width = Math.round(W * dpr); cv0.height = Math.round(H * dpr); }
  const c = cv0.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const T = sim.trend, idx = trendData(), tNow = sim.s.t, t0 = tNow - st.win;
  const L = 58, Rm = 58, plotW = W - L - Rm, th = (H - 18) / TRACKS.length;
  const xt = t => L + (t - t0) / st.win * plotW;
  c.font = '10.5px system-ui,sans-serif';
  TRACKS.forEach((tr, ti) => {
    const y0 = ti * th + 2, y1 = y0 + th - 6;
    c.fillStyle = ti % 2 ? '#0a1a2f' : '#0b1e36'; c.fillRect(L, y0, plotW, y1 - y0);
    c.strokeStyle = '#163a5e'; c.lineWidth = 1; c.beginPath();
    for (let g = 1; g < 4; g++) { const yy = y0 + (y1 - y0) * g / 4; c.moveTo(L, yy); c.lineTo(L + plotW, yy); }
    const step = st.win <= 900 ? 120 : st.win <= 3600 ? 600 : st.win <= 7200 ? 900 : 3600;
    for (let t = Math.ceil(t0 / step) * step; t < tNow; t += step) { const x = xt(t); c.moveTo(x, y0); c.lineTo(x, y1); }
    c.stroke(); c.strokeStyle = '#1e4f7d'; c.strokeRect(L, y0, plotW, y1 - y0);
    tr.forEach((ch, ci) => {
      const [key, name, q, mn0, mx0, col] = ch; if (st.hidden[key]) return;
      const arr = T.ch[key]; let mn = mn0, mx = mx0;
      for (const i of idx) { if (T.t[i] < t0) continue; const v = arr[i]; if (v > mx) mx = v * 1.1; if (v < mn) mn = v * 1.1; }
      const yv = v => y1 - (v - mn) / (mx - mn || 1) * (y1 - y0);
      c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); let first = true;
      for (const i of idx) { if (T.t[i] < t0) continue; const x = xt(T.t[i]), yy = yv(arr[i]); if (first) { c.moveTo(x, yy); first = false; } else c.lineTo(x, yy); }
      c.stroke();
      c.fillStyle = col; const left = ci % 2 === 0, lx = left ? L - 4 : L + plotW + 4; c.textAlign = left ? 'right' : 'left';
      const row = Math.floor(ci / 2) * 11;
      c.fillText(fmt(q, mx, 0), lx, y0 + 9 + row); c.fillText(fmt(q, mn, 0), lx, y1 - 2 - row);
      c.font = 'bold 12px system-ui,sans-serif'; c.fillText(fmt(q, sim.d[key], q === 'vol' ? 2 : 1), lx, (y0 + y1) / 2 + 4 + row); c.font = '10.5px system-ui,sans-serif';
    });
  });
  // time axis
  c.fillStyle = '#7f9dbd'; c.textAlign = 'center';
  const step = st.win <= 900 ? 120 : st.win <= 3600 ? 600 : st.win <= 7200 ? 900 : 3600;
  for (let t = Math.ceil(t0 / step) * step; t < tNow; t += step) c.fillText(clockStr(sim.clock0 + (t - sim.tStart) * 1000, true), xt(t), H - 4);
  // hover cursor
  if (st.hover !== null && st.hover > L && st.hover < L + plotW) {
    const tH = t0 + (st.hover - L) / plotW * st.win; let best = -1, bd = 1e9;
    for (const i of idx) { const dd = Math.abs(T.t[i] - tH); if (dd < bd) { bd = dd; best = i; } }
    c.strokeStyle = '#ffffffaa'; c.beginPath(); c.moveTo(st.hover, 0); c.lineTo(st.hover, H - 14); c.stroke();
    if (best >= 0 && bd < 60) {
      const lines = [clockStr(sim.clock0 + (T.t[best] - sim.tStart) * 1000, false)].concat(TRACKS.flat().filter(ch => !st.hidden[ch[0]]).map(ch => `${ch[1]}: ${fmt(ch[2], T.ch[ch[0]][best], ch[2] === 'vol' ? 2 : 1)} ${un(ch[2])}`));
      const bw = 170, bx = st.hover + 8 + bw > W ? st.hover - bw - 8 : st.hover + 8;
      c.fillStyle = '#071425ee'; c.fillRect(bx, 6, bw, lines.length * 13 + 6); c.strokeStyle = '#1e4f7d'; c.strokeRect(bx, 6, bw, lines.length * 13 + 6);
      c.textAlign = 'left'; c.fillStyle = '#dcecff'; lines.forEach((l, i) => c.fillText(l, bx + 6, 18 + i * 13));
    }
  }
}

/* ---------------- pressure window ---------------- */
function drawPwin() {
  const cv0 = $('pwin'), dpr = window.devicePixelRatio || 1, W = cv0.clientWidth, H = cv0.clientHeight;
  if (cv0.width !== Math.round(W * dpr)) { cv0.width = Math.round(W * dpr); cv0.height = Math.round(H * dpr); }
  const c = cv0.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const s = sim.s, z0 = 1800, z1 = Math.max(3800, Math.ceil((s.Dh + 300) / 100) * 100), e0 = 0.95, e1 = 2.10;
  const LC = 150, L = LC + 42, Rr = 10, T = 8, B = 22;
  const yz = z => T + (z - z0) / (z1 - z0) * (H - T - B), xe = e => L + (e - e0) / (e1 - e0) * (W - L - Rr);
  c.font = '10.5px system-ui,sans-serif';
  for (const f of R.formations(sim.haz)) { if (f.bot < z0 || f.top > z1) continue; const a = yz(Math.max(f.top, z0)), b = yz(Math.min(f.bot, z1)); c.fillStyle = f.col; c.fillRect(0, a, LC, b - a); c.strokeStyle = '#0006'; c.strokeRect(0, a, LC, b - a); if (b - a > 11) { c.fillStyle = '#f2ead8'; c.textAlign = 'left'; c.fillText(f.n, 4, (a + b) / 2 + 4); } }
  c.fillStyle = '#0a1a2f'; c.fillRect(L, T, W - L - Rr, H - T - B); c.strokeStyle = '#163a5e'; c.beginPath();
  for (let e = 1.0; e <= e1; e += 0.1) { c.moveTo(xe(e), T); c.lineTo(xe(e), H - B); }
  for (let z = Math.ceil(z0 / 200) * 200; z <= z1; z += 200) { c.moveTo(L, yz(z)); c.lineTo(W - Rr, yz(z)); }
  c.stroke();
  c.fillStyle = '#7f9dbd'; c.textAlign = 'right'; for (let z = Math.ceil(z0 / 200) * 200; z <= z1; z += 200) c.fillText(fmt('len', z, 0), L - 4, yz(z) + 3);
  c.textAlign = 'center'; for (let e = 1.0; e <= e1 + 1e-6; e += 0.2) c.fillText(fmt('dens', e, 1), xe(e), H - 8);
  const line = (fn, col, dash, zmax) => { c.strokeStyle = col; c.lineWidth = 2; c.setLineDash(dash || []); c.beginPath(); let f = true; for (let z = z0; z <= (zmax || z1); z += 2) { const x = xe(fn(z)), yy = yz(z); if (f) { c.moveTo(x, yy); f = false; } else c.lineTo(x, yy); } c.stroke(); c.setLineDash([]); };
  line(z => R.ppProg(z, sim.haz), '#ff7a7a', [5, 4]);
  line(z => R.ppAt(z, sim.haz), '#ff3b3b', null, s.Dh);
  line(z => R.fgAt(z, sim.haz), '#4f8dff');
  const yS = yz(CFG.shoe); c.fillStyle = '#c4ced8'; c.fillRect(L, yS - 1, 30, 2); c.textAlign = 'left'; c.fillText('shoe', L + 34, yS + 4);
  const mw = sim.d.mwIn, ecd = sim.d.ecd, yb = yz(s.Dh);
  c.strokeStyle = '#2bd66f'; c.lineWidth = 2; c.beginPath(); c.moveTo(xe(s.rhoA), T); c.lineTo(xe(s.rhoA), yb); c.stroke();
  c.strokeStyle = '#2bd66f88'; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(xe(mw), T); c.lineTo(xe(mw), H - B); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#36c8ff'; c.beginPath(); c.arc(xe(ecd), yb, 5, 0, 7); c.fill();
  c.strokeStyle = '#ffb627'; c.beginPath(); c.moveTo(L, yb); c.lineTo(W - Rr, yb); c.stroke();
  c.fillStyle = '#ffb627'; c.textAlign = 'right'; c.fillText('Hole depth ' + fmt('len', s.Dh, 1), W - Rr - 4, yb - 4);
  const lg = [['#ff7a7a', 'Pore (prognosis)'], ['#ff3b3b', 'Pore (actual, drilled)'], ['#4f8dff', 'Fracture'], ['#2bd66f', 'MW in hole'], ['#36c8ff', 'ECD @ bottom']];
  c.textAlign = 'left'; lg.forEach((l, i) => { c.fillStyle = l[0]; c.fillRect(L + 8, T + 8 + i * 14, 14, 3); c.fillStyle = '#dcecff'; c.fillText(l[1], L + 26, T + 12 + i * 14); });
  c.fillStyle = '#7f9dbd'; c.textAlign = 'center'; c.fillText('EMW (' + un('dens') + ')', L + (W - L) / 2, H - 8 + 0);
}

/* ---------------- periodic UI update ---------------- */
function clockStr(ms, short) { const d = new Date(ms); const p = n => String(n).padStart(2, '0'); return short ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function txt(id, v) { const e = $(id); if (e && e.textContent !== v) e.textContent = v; }
function cls(id, c) { const e = $(id); if (e && e.className !== c) e.className = c; }
function on(el, b) { if (el) el.classList.toggle('on', !!b); }
function pillState(p, closeIsOne, armed) {
  if (armed) return ['ARMED', 'pill a'];
  if (p >= 0.98) return closeIsOne ? ['CLOSED', 'pill r'] : ['OPEN', 'pill g'];
  if (p <= 0.02) return closeIsOne ? ['OPEN', 'pill g'] : ['CLOSED', 'pill r'];
  return [closeIsOne ? 'MOVING' : 'MOVING', 'pill a'];
}
function wellStatus() {
  const s = sim.s, c = sim.c;
  if (c.esd) return ['ESD ACTIVE', 'crit']; if (c.estop) return ['E-STOP', 'crit']; if (s.bop.failed) return ['WELL CONTROL LOST', 'crit'];
  if (s.sheared) return ['SHEARED / SECURED', 'crit'];
  if (sim.sealed()) return [sim.pumpsOn() ? 'KILL CIRCULATION' : 'SHUT-IN', 'warn'];
  if (sim.m.active) return ['CONNECTION', 'warn']; if (s.inSlips) return ['IN SLIPS', 'warn'];
  if (sim.onBottom() && s.rop > 0.3) return ['DRILLING', ''];
  if (Math.abs(s.vUp) > 0.05 && !sim.pumpsOn()) return [s.vUp > 0 ? 'TRIPPING OUT' : 'TRIPPING IN', 'warn'];
  if (sim.pumpsOn()) return [s.rpm > 5 ? 'CIRCULATE & ROTATE' : 'CIRCULATING', ''];
  return ['IDLE', 'idle'];
}
function updateUI() {
  const s = sim.s, c = sim.c, d = sim.d, A = sim.ad;
  // header
  const now = new Date(sim.clockMs()); txt('dateTxt', `${String(now.getDate()).padStart(2, '0')}-${MON[now.getMonth()]}-${now.getFullYear()}`); txt('clockTxt', clockStr(sim.clockMs()));
  const [ws, wc] = wellStatus(); txt('wellStatus', ws); cls('wellStatus', 'status-badge ' + wc);
  const al = sim.alarmList(); const top = al[0];
  const ban = $('alarmBanner');
  if (top) { txt('alarmTxt', top.text); txt('alarmSub', `${top.active ? 'ACTIVE' : 'CLEARED'} · ${top.acked ? 'acknowledged' : 'unacknowledged'} · ${al.length} in list — click to ack`); ban.className = `alarm-banner p${top.prio}${top.acked ? '' : ' blink'}`; }
  else { txt('alarmTxt', 'No active alarms'); txt('alarmSub', 'All systems normal'); ban.className = 'alarm-banner ok'; }
  const esd = $('esdBtn'); txt('esdBtn', c.esd ? 'ACTIVE — RESET' : 'READY'); esd.className = 'btn ' + (c.esd ? 'red blink' : 'on');
  cls('cRig', 'dot' + (st.speed ? '' : ' amb')); txt('cRigT', st.speed ? 'Online' : 'Paused'); cls('cSat', 'dot' + (navigator.onLine ? '' : ' red')); txt('cSatT', navigator.onLine ? 'Online' : 'Offline');
  const fm = R.formAt(s.Dh, sim.haz); txt('fmTxt', `${fm.n} · Pp ${fmt('dens', d.ppSg, 2)} / Frac ${fmt('dens', d.fgSg, 2)} ${un('dens')}`);
  txt('unitsNote', st.units === 'si' ? 'SI units' : 'Oilfield units');
  // params
  const alarmRows = {}; for (const a of al) if (a.active && ALARM_ROW[a.id]) alarmRows[ALARM_ROW[a.id]] = a.prio;
  for (const [k, , q, dec] of PARAMS) {
    let v = d[k]; if (k === 'bitDepth') v = sim.bitDepth();
    txt('pv_' + k, k === 'blockV' ? (Math.abs(v) < 0.05 ? '0.0' : (v > 0 ? '▲ ' : '▼ ') + fmt(q, Math.abs(v), dec)) : fmt(q, v, dec));
    txt('pu_' + k, '(' + (UN[q] ? un(q) : q) + ')');
    cls('pr_' + k, 'prow' + (alarmRows[k] ? (alarmRows[k] <= 2 ? ' al' : ' wn') : ''));
  }
  // control loop
  txt('lb1v', `${fm.n} · ${fmt('rop', d.rop, 1)} ${un('rop')}`); txt('lb2v', `WOB ${fmt('force', d.wob, 1)} · T ${fmt('torque', d.torque, 1)} · ROP ${fmt('rop', d.rop, 1)}`);
  txt('lb3v', A.state); txt('lb4v', `${s.dwSrc || '—'} · ${fmt('spd', d.blockV, 2)} ${un('spd')} · ${fmt('', d.rpm, 0)} rpm`);
  txt('lb5v', sim.onBottom() ? `on bottom · MSE ${fmt('mpa', d.mse, 0)} ${un('mpa')}` : `off bottom ${fmt('len', s.Dh - sim.bitDepth(), 2)} ${un('len')}`);
  const lb6 = $('lb6'); const loopBad = al.some(a => a.active && a.prio === 1), loopWarn = ['TORQUE LIMIT', 'STAND END', 'ROP LIMIT'].includes(A.state) || al.some(a => a.active && a.prio === 2);
  lb6.className = 'lb ' + (loopBad ? 'bad' : loopWarn ? 'warn' : A.state === 'CONTROL' ? 'ok' : 'warn');
  txt('lb6', loopBad ? 'Unsafe — check alarms' : A.state === 'CONTROL' ? 'Stable Drilling' : A.state === 'OFF' ? 'Manual Control' : A.state);
  ['lb1', 'lb2', 'lb3', 'lb4', 'lb5'].forEach((id, i) => $(id).classList.toggle('act', A.state === 'CONTROL' && Math.floor(performance.now() / 600) % 5 === i));
  // drilling control
  const rop = c.ad.mode === 'ROP';
  txt('adPV', rop ? fmt('rop', d.rop, 1) : fmt('force', d.wob, 1)); txt('adSP', rop ? fmt('rop', c.ad.ropTarget, 1) : fmt('force', A.sp || c.ad.wobSet, 1)); txt('adOut', A.out ? fmt('rop', A.out * 3600, 1) + ' ' + un('rop') : '—');
  txt('adState', A.state); on($('adAuto'), c.ad.on); on($('adMan'), !c.ad.on); document.querySelectorAll('[data-admode]').forEach(b => on(b, b.dataset.admode === c.ad.mode));
  on($('ropCapBtn'), c.ad.ropCap); txt('ropCapBtn', c.ad.ropCap ? 'On' : 'Off'); on($('autoConnBtn'), c.autoConnect); txt('autoConnBtn', c.autoConnect ? 'On' : 'Off');
  syncSlider('sWob', 'oWob', c.ad.wobSet, 'force', 0); syncSlider('sRop', 'oRop', c.ad.ropTarget, 'rop', 1); syncSlider('sWobLim', 'oWobLim', c.ad.wobLimit, 'force', 0);
  syncSlider('sTqLim', 'oTqLim', c.ad.torqueLimit, 'torque', 1); syncSlider('sRpmLim', 'oRpmLim', c.ad.rpmLimit, '', 0);
  // top drive
  txt('tdRpm', fmt('', d.rpm, 0) + ' rpm'); txt('tdTq', fu('torque', d.torque, 1));
  document.querySelectorAll('[data-tdmode]').forEach(b => on(b, b.dataset.tdmode === c.td.mode)); document.querySelectorAll('[data-tddir]').forEach(b => on(b, b.dataset.tddir === c.td.dir));
  syncSlider('sRpm', 'oRpm', c.td.rpmSet, '', 0); syncSlider('sTq', 'oTq', c.td.torqueSet, 'torque', 1);
  const pw = sim.powerOK(); txt('tdMot', !pw ? 'TRIPPED' : s.rpm > 0.5 ? 'RUNNING' : 'STOPPED'); cls('tdMotD', 'dot' + (!pw ? ' red' : s.rpm > 0.5 ? '' : ' off'));
  txt('tdTemp', fu('temp', s.tdTemp, 0)); cls('tdTempD', 'dot' + (s.tdTemp > sim.th.tdTempHi ? ' red' : s.tdTemp > 90 ? ' amb' : ''));
  txt('tdHyd', fu('press', pw ? 165 + Math.sin(sim.s.t / 7) * 1.5 : 0, 0)); txt('tdCool', s.fault.tdCool ? 'FAULT' : 'OK'); cls('tdCoolD', 'dot' + (s.fault.tdCool ? ' red' : ''));
  txt('tdVfd', s.tdStall ? 'TORQUE LIMIT' : pw ? 'OK' : 'TRIPPED'); cls('tdVfdD', 'dot' + (s.tdStall || !pw ? ' red' : '')); txt('tdSrc', sim.m.active && sim.m.td ? 'sequence' : c.td.mode);
  // drawworks
  txt('dwPos', fu('len', s.blockH, 2)); txt('dwHl', fu('force', d.hl, 1)); txt('dwSpd', (Math.abs(d.blockV) < 0.05 ? '' : d.blockV > 0 ? '▲ ' : '▼ ') + fu('spd', Math.abs(d.blockV), 2));
  txt('dwRpm', (Math.abs(s.vUp) * CFG.dw.lines / (Math.PI * CFG.dw.drumD) * 60).toFixed(0)); txt('dwBrake', s.brake === 'SET' ? 'SET' : 'RELEASED'); cls('dwBrake', s.brake === 'SET' ? 'a' : '');
  const dwl = clamp(s.hl * Math.abs(s.vUp) / CFG.dw.kw * 100 + (s.brake === 'SET' ? 0 : 6), 0, 150); txt('dwLoad', dwl.toFixed(0) + ' %'); txt('dwMot', !pw ? 'TRIPPED' : 'RUNNING'); txt('dwSrc', s.dwSrc || '');
  document.querySelectorAll('[data-brake]').forEach(b => on(b, b.dataset.brake === c.dw.brakeMode)); const bs = $('brakeSetBtn'); bs.disabled = c.dw.brakeMode !== 'MANUAL'; txt('brakeSetBtn', c.dw.brakeSet ? 'Release' : 'Set');
  syncSlider('sJog', 'oJog', c.dw.jogSpeed, 'spd', 1);
  on($('blkUp'), c.dw.blockAuto > 0); on($('blkDn'), c.dw.blockAuto < 0);
  // pumps
  let tot = 0;
  for (let i = 0; i < 3; i++) {
    const p = s.pumps[i], pc = c.pumps[i]; tot += p.q;
    on(document.querySelector(`[data-pon="${i}"]`), pc.on); on(document.querySelector(`[data-poff="${i}"]`), !pc.on);
    const sl = document.querySelector(`[data-pspm="${i}"]`); if (document.activeElement !== sl) sl.value = pc.spm; txt('po' + i, pc.spm.toFixed(0));
    const ls = document.querySelector(`[data-liner="${i}"]`); if (document.activeElement !== ls) ls.value = pc.liner;
    txt('pS' + i, p.spm.toFixed(0)); txt('pP' + i, fu('press', p.p, 0)); txt('pK' + i, (p.spm / CFG.pump.maxSpm * 100).toFixed(0) + ' %'); txt('pQ' + i, fu('flow', p.q * 60000, 0)); txt('pL' + i, p.load.toFixed(0) + ' %'); txt('pT' + i, p.strokes.toFixed(0));
    const stx = p.relief ? 'RELIEF' : p.effLoss > 0.1 && p.spm > 1 ? 'FAULT' : p.spm > 1 ? 'RUN' : 'STOP'; txt('pX' + i, stx); cls('pX' + i, stx === 'RUN' ? '' : stx === 'STOP' ? 'w' : 'r');
    cls('pl' + i, 'lamp' + (p.relief || (p.effLoss > 0.1 && p.spm > 1) ? ' r' : p.spm > 1 ? ' g' : ''));
  }
  txt('pumpsTot', `Total ${fu('flow', tot * 60000, 0)} · ${d.spm.toFixed(0)} spm`);
  // BOP
  const b = s.bop, cb = c.bop;
  for (const [k] of BOP_ROWS) { const isValve = k === 'hcr' || k === 'kill'; const [t, cl] = pillState(b[k], !isValve, k === 'shear' && cb.shearArmed && b.shear < 0.02); txt('bp_' + k, t); cls('bp_' + k, cl); }
  document.querySelectorAll('[data-bop]').forEach(btn => on(btn, cb[btn.dataset.bop] === btn.dataset.st)); on(document.querySelector('[data-arm]'), cb.shearArmed);
  const armB = document.querySelector('[data-arm]'); if (armB) armB.textContent = cb.shearArmed ? 'Disarm' : 'Arm';
  syncSlider('sChoke', 'oChoke', cb.choke, '%', 1); on($('chokeAutoBtn'), cb.chokeAuto); syncSlider('sChkT', 'oChkT', cb.chokeTarget, 'press', 1);
  txt('bcPc', fu('press', d.pc, 1)); txt('bcDp', fu('press', d.spp, 1)); txt('bcAcc', fu('press', b.accum, 0)); cls('bcAcc', b.accum < sim.th.accumLo ? 'r' : '');
  txt('bcMaasp', fu('press', d.maasp, 1)); txt('bcBhp', `${fmt('press', d.bhp, 1)} / ${fmt('press', d.pp, 1)} ${un('press')}`);
  txt('bopNote', sim.sealed() ? (sim.chokePath() ? 'returns via choke' : 'well shut in') : 'returns via flowline');
  // kill sheet
  const ks = sim.killSheet();
  txt('kSidpp', ks ? fu('press', ks.sidpp, 1) : '—'); txt('kSicp', ks ? fu('press', ks.sicp, 1) : '—'); txt('kGain', ks ? fu('vol', ks.pitGain, 2) : '—'); txt('kKmw', ks ? fu('dens', ks.kmw, 3) : '—');
  txt('kScr', s.scr ? `${s.scr.spm.toFixed(0)} spm @ ${fu('press', s.scr.spp, 1)}` : 'not recorded'); txt('kIcp', ks && ks.icp ? fu('press', ks.icp, 1) : '—'); txt('kFcp', ks && ks.fcp ? fu('press', ks.fcp, 1) : '—'); txt('kStk', ks ? ks.strokesToBit.toFixed(0) : '—');
  txt('killHint', killHint(ks));
  syncSlider('sMw', 'oMw', c.mud.mwSet, 'dens', 3);
  txt('mMw', `${fmt('dens', d.mwIn, 3)} / ${fmt('dens', d.mwOut, 3)} ${un('dens')}`); txt('mPit', `${fmt('vol', d.pit, 1)} / ${d.pitDelta >= 0 ? '+' : ''}${fmt('vol', d.pitDelta, 2)} ${un('vol')}`); cls('mPit', Math.abs(d.pitDelta) > 1 ? 'a' : '');
  txt('mTt', fu('vol', d.tripTank, 2)); const rh = sim.rheo(s.pitRho); txt('mRheo', `${(rh.pv * 1000).toFixed(0)} cP / ${(rh.yp / 0.4788).toFixed(0)} lbf/100ft²`); txt('mEcd', fu('dens', d.ecd, 3));
  on($('mixBtn'), c.mud.mixing); on($('fillBtn'), c.mud.holeFill);
  // pipe handling
  const lamps = [['Connected', s.connected], ['In slips', s.inSlips], ['Stand on TD', s.standOnTD], ['Joint @ floor', sim.jointAtFloor()], ['On bottom', sim.onBottom()]];
  $('phLamps').innerHTML = lamps.map(([n, v]) => `<span><i class="dot${v ? '' : ' off'}"></i>${n}</span>`).join('');
  const M = sim.m; on($('connBtn'), M.active); txt('connBtn', M.active ? `Connection ${M.step + 1}/${R.CONN_STEPS.length}` : 'Auto Connection');
  R.CONN_STEPS.forEach((_, i) => cls('cs' + i, M.active ? (i < M.step ? 'done' : i === M.step ? 'cur' : '') : ''));
  txt('opTxt', s.op ? s.op.name : M.active ? M.msg : '');
  $('opProg').style.width = (s.op ? s.op.t / s.op.dur * 100 : M.active ? M.step / R.CONN_STEPS.length * 100 : 0) + '%';
  cls('pwrLamp', 'lamp' + (pw ? ' g' : ''));
  cls('almLamp', 'lamp' + (al.some(a => !a.acked) ? (Math.floor(performance.now() / 500) % 2 ? ' r' : '') : al.length ? ' a' : ''));
  // hydraulics
  txt('hBit', `${fu('press', s.dpBit, 1)} / ${s.hsi.toFixed(2)} hp/in²`); txt('hAnn', fu('press', s.dpAnn, 1)); txt('hExp', fu('press', d.sppExp, 1));
  txt('hDepth', `${fmt('len', s.Dh, 1)} / ${fmt('len', sim.bitDepth(), 1)} ${un('len')}`); txt('hWear', `${s.bitHours.toFixed(1)} h / ${Math.round(s.wear * 8)}-8`);
  cls('hWear', s.wear > 0.85 ? 'r' : s.wear > 0.6 ? 'a' : ''); txt('hMse', fu('mpa', d.mse, 0)); txt('hDxc', d.dxc ? d.dxc.toFixed(2) : '—');
  txt('hPpFg', `${fmt('dens', d.ppSg, 2)} / ${fmt('dens', d.fgSg, 2)} ${un('dens')}`); txt('hOb', fu('press', d.overbal, 1)); cls('hOb', d.overbal < 0 ? 'r' : d.overbal < 10 ? 'a' : '');
  txt('hStands', `${s.stands} / ${s.racked}`);
  // alarms table + log
  $('alarmBody').innerHTML = al.length ? al.map(a => `<tr class="p${a.prio}${a.acked ? '' : ' unack'}"><td class="num">${clockStr(sim.clock0 + (a.t0 - sim.tStart) * 1000)}</td><td>${a.text}</td><td>${a.active ? '<span class="pill ' + (a.prio === 1 ? 'r' : a.prio === 2 ? 'a' : 'c') + '">ACTIVE</span>' : '<span class="pill g">CLEAR</span>'} ${a.acked ? '' : `<button class="btn sm" data-ack="${a.id}">Ack</button>`}</td></tr>`).join('') : '<tr><td colspan="3" class="hint">No alarms</td></tr>';
  $('log').innerHTML = sim.log.slice(0, 60).map(l => `<div class="${l.type === 'EVENT' ? 'ev' : 'p' + l.prio}">${clockStr(sim.clock0 + (l.t - sim.tStart) * 1000)} ${l.type === 'EVENT' ? '•' : l.type === 'ALARM' ? '▲' : '✓'} ${l.text}</div>`).join('');
  // toasts from sim notes
  for (const m of sim.msg) if (m.t > st.lastMsg) { toast(m.text); st.lastMsg = m.t; }
  // horn
  if (st.sound) { const un1 = al.find(a => !a.acked && a.active && a.prio <= 2); if (un1 && performance.now() - st.beepT > 1400) { beep(un1.prio === 1 ? 880 : 620); st.beepT = performance.now(); } }
  if (performance.now() - st.lastSub > 150 || !st.lastSub) { renderSub(); st.lastSub = performance.now(); }
}
function killHint(ks) {
  const s = sim.s;
  if (sim.sealed() && !ks) return 'Well is shut in — wait for pressures to stabilise, then read SIDPP / SICP.';
  if (ks && !s.scr) return 'Record an SCR (slow-circulation rate) before the kill, or use a pre-recorded value: ICP = SIDPP + SCR pressure.';
  if (ks && s.scr) return `Driller's method: 1st circulation with current mud — bring pump to ${s.scr.spm.toFixed(0)} spm holding casing pressure constant, then hold DPP at ICP ${fu('press', ks.icp, 1)} (Auto-choke). 2nd circulation with KMW ${fu('dens', ks.kmw, 3)}: DPP falls from ICP to FCP ${fu('press', ks.fcp, 1)} over ${ks.strokesToBit.toFixed(0)} strokes.`;
  return 'Kick response: stop rotating, pick up to space out, stop pumps, flow-check, close annular (hard shut-in), open HCR, read pressures.';
}
function syncSlider(sid, oid, v, q, dec) {
  const sl = $(sid); if (!sl) return;
  if (document.activeElement !== sl) sl.value = v;
  txt(oid, q === '%' ? (+v).toFixed(dec) + ' %' : q === '' ? (+v).toFixed(dec) : fu(q, v, dec));
}

/* ---------------- toasts & audio ---------------- */
function toast(t) { const e = document.createElement('div'); e.textContent = t; $('toast').appendChild(e); setTimeout(() => e.remove(), 4200); }
let actx = null;
function beep(f) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.05, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.35); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.36); } catch (e) { /* audio unavailable */ } }
const res = r => { if (r && r.ok === false && r.msg) { toast(r.msg); st.lastMsg = sim.s.t; } };

/* ---------------- events ---------------- */
function bind() {
  const q = (sel, fn, ev = 'click') => document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, e => fn(el, e)));
  q('[data-speed]', el => { st.speed = +el.dataset.speed; document.querySelectorAll('[data-speed]').forEach(b => on(b, b === el)); });
  q('[data-units]', el => { st.units = el.dataset.units; document.querySelectorAll('[data-units]').forEach(b => on(b, b === el)); buildLegend(); buildTh(); setSliderRanges(); updateUI(); drawPwin(); });
  $('soundBtn').onclick = () => { st.sound = !st.sound; $('soundBtn').textContent = st.sound ? '🔊 Horn' : '🔇 Horn'; on($('soundBtn'), st.sound); if (st.sound) beep(660); };
  $('instrBtn').onclick = () => { buildTh(); $('instr').showModal(); }; $('instrClose').onclick = () => $('instr').close();
  $('alarmBanner').onclick = () => sim.ack(); $('ackAll').onclick = () => sim.ack(); $('almBtn').onclick = () => sim.ack();
  $('alarmBody').addEventListener('click', e => { const b = e.target.closest('[data-ack]'); if (b) sim.ack(b.dataset.ack); });
  $('esdBtn').onclick = () => { if (sim.c.esd) { if (confirm('Reset ESD?')) sim.resetEsd(); } else if (confirm('Activate rig EMERGENCY SHUTDOWN?')) sim.esdTrip(); };
  $('estopBtn').onclick = () => sim.estop(); $('pwrBtn').onclick = () => res(sim.resetEstop());
  // auto-driller
  $('adAuto').onclick = () => { sim.c.ad.on = true; }; $('adMan').onclick = () => { sim.c.ad.on = false; };
  q('[data-admode]', el => { sim.c.ad.mode = el.dataset.admode; sim.ad.capWob = sim.s.wob; });
  $('ropCapBtn').onclick = () => { sim.c.ad.ropCap = !sim.c.ad.ropCap; }; $('autoConnBtn').onclick = () => { sim.c.autoConnect = !sim.c.autoConnect; };
  const sl = (id, set) => $(id).addEventListener('input', e => set(+e.target.value));
  sl('sWob', v => sim.c.ad.wobSet = v); sl('sRop', v => sim.c.ad.ropTarget = v); sl('sWobLim', v => sim.c.ad.wobLimit = v); sl('sTqLim', v => sim.c.ad.torqueLimit = v); sl('sRpmLim', v => sim.c.ad.rpmLimit = v);
  // top drive
  q('[data-tdmode]', el => sim.c.td.mode = el.dataset.tdmode); q('[data-tddir]', el => sim.c.td.dir = el.dataset.tddir);
  sl('sRpm', v => sim.c.td.rpmSet = v); sl('sTq', v => sim.c.td.torqueSet = v);
  // drawworks: hold-to-run
  document.querySelectorAll('[data-hold]').forEach(el => {
    const dir = +el.dataset.hold;
    el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture && el.setPointerCapture(e.pointerId); sim.hoist(dir); el.classList.add('on'); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => { sim.hoist(0); el.classList.remove('on'); }));
  });
  $('blkUp').onclick = () => sim.blockAuto(1); $('blkDn').onclick = () => sim.blockAuto(-1);
  q('[data-brake]', el => { sim.c.dw.brakeMode = el.dataset.brake; sim.c.dw.brakeSet = true; }); $('brakeSetBtn').onclick = () => { sim.c.dw.brakeSet = !sim.c.dw.brakeSet; };
  $('sJog').addEventListener('input', e => sim.c.dw.jogSpeed = +e.target.value);
  window.addEventListener('keydown', e => {
    if (e.target.matches('input,select,textarea')) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); if (!e.repeat) sim.hoist(e.key === 'ArrowUp' ? 1 : -1); }
    else if (e.key === ' ') { e.preventDefault(); sim.hoist(0); sim.c.dw.blockAuto = 0; }
    else if (e.key === 'p' || e.key === 'P') { const b = document.querySelector(`[data-speed="${st.speed ? 0 : 1}"]`); b && b.click(); }
  });
  window.addEventListener('keyup', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') sim.hoist(0); });
  window.addEventListener('blur', () => sim.hoist(0));
  // pumps
  $('pumps').addEventListener('click', e => { const a = e.target.closest('[data-pon]'), b = e.target.closest('[data-poff]'); if (a) { const p = sim.s.pumps[+a.dataset.pon]; p.relief = false; sim.c.pumps[+a.dataset.pon].on = true; } if (b) sim.c.pumps[+b.dataset.poff].on = false; });
  $('pumps').addEventListener('input', e => { if (e.target.dataset.pspm !== undefined) sim.c.pumps[+e.target.dataset.pspm].spm = +e.target.value; });
  $('pumps').addEventListener('change', e => { if (e.target.dataset.liner !== undefined) sim.c.pumps[+e.target.dataset.liner].liner = +e.target.value; });
  $('allPumpsOn').onclick = () => sim.c.pumps.forEach((p, i) => { p.on = true; sim.s.pumps[i].relief = false; }); $('allPumpsOff').onclick = () => sim.c.pumps.forEach(p => p.on = false);
  $('sMaster').addEventListener('input', e => { sim.c.pumps.forEach(p => p.spm = +e.target.value); txt('oMaster', e.target.value); });
  // BOP
  $('bopRows').addEventListener('click', e => {
    const b = e.target.closest('[data-bop]'); if (b) res(sim.bopCmd(b.dataset.bop, b.dataset.st));
    if (e.target.closest('[data-arm]')) sim.c.bop.shearArmed = !sim.c.bop.shearArmed;
    if (e.target.closest('[data-fire]')) { if (!sim.c.bop.shearArmed) toast('Arm the blind/shear rams first'); else if (confirm('FIRE BLIND/SHEAR RAMS? The drill pipe will be cut.')) res(sim.bopCmd('shear')); }
  });
  $('sChoke').addEventListener('input', e => { sim.c.bop.choke = +e.target.value; sim.c.bop.chokeAuto = false; });
  q('[data-chk]', el => { sim.c.bop.choke = clamp(sim.c.bop.choke + +el.dataset.chk, 0, 100); sim.c.bop.chokeAuto = false; });
  $('chokeAutoBtn').onclick = () => { const b = sim.c.bop; b.chokeAuto = !b.chokeAuto; if (b.chokeAuto && !b.chokeTarget) b.chokeTarget = sim.d.spp; };
  $('sChkT').addEventListener('input', e => sim.c.bop.chokeTarget = +e.target.value);
  // kill / mud
  $('scrBtn').onclick = () => { if (!sim.pumpsOn()) toast('Run a pump at slow rate first (e.g. 30–40 spm, one pump)'); else sim.recordSCR(); };
  $('useIcp').onclick = () => { const k = sim.killSheet(); if (k && k.icp) { sim.c.bop.chokeTarget = +k.icp.toFixed(1); } else toast('Need shut-in pressures and an SCR first'); };
  $('setKmw').onclick = () => { const k = sim.killSheet(); if (k) { sim.c.mud.mwSet = Math.ceil(k.kmw * 200) / 200; sim.c.mud.mixing = true; toast('Mixing kill mud ' + fu('dens', sim.c.mud.mwSet, 3)); } else toast('No shut-in data yet'); };
  $('sMw').addEventListener('input', e => sim.c.mud.mwSet = +e.target.value);
  $('mixBtn').onclick = () => sim.c.mud.mixing = !sim.c.mud.mixing; $('fillBtn').onclick = () => sim.c.mud.holeFill = !sim.c.mud.holeFill;
  $('zeroPit').onclick = () => sim.zeroPit(); $('addMud').onclick = () => sim.addMud(20); $('dumpMud').onclick = () => sim.addMud(-20); $('lcmBtn').onclick = () => sim.pumpLCM();
  // pipe handling
  $('connBtn').onclick = () => res(sim.m.active ? { ok: true } : sim.startConnection()); $('connAbort').onclick = () => sim.abortConnection();
  $('opSet').onclick = () => res(sim.setSlips()); $('opPull').onclick = () => res(sim.pullSlips()); $('opBreak').onclick = () => res(sim.breakOut());
  $('opPick').onclick = () => res(sim.pickStand()); $('opRack').onclick = () => res(sim.rackStand()); $('opMake').onclick = () => res(sim.makeUp());
  // trends
  q('[data-win]', el => { st.win = +el.dataset.win; document.querySelectorAll('[data-win]').forEach(b => on(b, b === el)); drawTrend(); });
  $('legend').addEventListener('click', e => { const s = e.target.closest('[data-ch]'); if (s) { st.hidden[s.dataset.ch] = !st.hidden[s.dataset.ch]; s.classList.toggle('off'); drawTrend(); } });
  $('trend').addEventListener('pointermove', e => { const r = e.target.getBoundingClientRect(); st.hover = e.clientX - r.left; drawTrend(); });
  $('trend').addEventListener('pointerleave', () => { st.hover = null; drawTrend(); });
  // instructor
  q('[data-sc]', el => { sim.scenario(el.dataset.sc); toast('Scenario: ' + el.textContent); });
  $('hazBtn').onclick = () => { sim.haz = !sim.haz; txt('hazBtn', 'Geohazards: ' + (sim.haz ? 'ON' : 'OFF')); drawPwin(); };
  const reset = hot => { const haz = sim.haz, th = sim.th; sim = new R.RigSim({ hot, haz }); sim.th = th; st.lastMsg = 0; buildTh(); $('instr').close(); drawTrend(); drawPwin(); toast(hot ? 'Reset: drilling ahead at 3125 m' : 'Reset: rig idle, bit 0.5 m off bottom'); };
  $('resetHot').onclick = () => reset(true); $('resetCold').onclick = () => reset(false);
  $('thGrid').addEventListener('change', e => { const k = e.target.dataset.th; if (!k) return; const qq = TH_META[k][1]; sim.th[k] = qq ? toSI(qq, +e.target.value) : +e.target.value; });
  window.addEventListener('resize', () => { drawTrend(); drawPwin(); });
}
function setSliderRanges() { /* sliders operate in SI internally; labels show the selected unit system */ }

/* ---------------- main loop ---------------- */
let last = performance.now();
function frame(now) {
  const dtR = Math.min(0.25, (now - last) / 1000); last = now;
  if (st.speed > 0) { const simT = dtR * st.speed, hmax = st.speed >= 20 ? 0.5 : st.speed >= 5 ? 0.25 : 0.1; const n = Math.max(1, Math.ceil(simT / hmax)); for (let i = 0; i < n; i++) sim.step(simT / n); }
  const dA = dtR * Math.min(st.speed, 2);
  st.anim.bit += sim.s.rpm / 60 * 360 * dA * 0.15;
  updateScene(dA);
  if (now - st.lastUi > 100) { updateUI(); st.lastUi = now; }
  if (now - st.lastTrend > (st.hover !== null ? 1000 : 500)) { drawTrend(); st.lastTrend = now; }
  if (now - st.lastPw > 2000) { drawPwin(); st.lastPw = now; }
  requestAnimationFrame(frame);
}

buildParams(); buildPumps(); buildBop(); buildSteps(); buildScene(); buildLegend(); bind();
txt('rigId', CFG.rigId); txt('wellId', CFG.well);
updateUI(); drawTrend(); drawPwin();
requestAnimationFrame(frame);
window.__sim = () => sim;
})();

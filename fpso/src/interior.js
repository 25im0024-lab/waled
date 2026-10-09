/* FPSO Console — "inside the FPSO" camera: cutaway and CCTV views of the separator, a cargo tank, the turret and swivel,
   a gas compressor, a gas-turbine generator and the central control room. Every view is driven by the live simulation.
   Cutaways are schematic (no camera can sit inside a pressurised vessel); CCTV views are what an operator would see. */
window.FpsoInside = function (ctx) {
'use strict';
const { T, fu, nf, CFG } = ctx;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const $ = id => document.getElementById(id);
const E = {};               // cached elements of the current view
let cur = 'sep', tA = 0, rot = { comp: 0, gt: 0, swv: 0 };
const VIEWS = {
  sep: ['HP separator V-101 — cutaway', 'separator', 'CUTAWAY'],
  cargo: ['Cargo tank 3C — tank camera', 'storage', 'TANK CAM'],
  turret: ['Turret & swivel — cutaway', 'turret', 'CUTAWAY'],
  comp: ['Gas compressor K-101A — cutaway', 'compression', 'CUTAWAY'],
  gt: ['Turbine hall — gas turbine generator GT-1', 'power', 'CCTV'],
  ccr: ['Central control room', 'accommodation', 'CCTV'],
};
const INFO2VIEW = { separator: 'sep', storage: 'cargo', turret: 'turret', compression: 'comp', power: 'gt', accommodation: 'ccr' };
const tx = (x, y, s, t, a, c, w) => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="${a || 'start'}" fill="${c || '#cfe3f7'}"${w ? ` font-weight="${w}"` : ''}>${t}</text>`;
const tag = (x, y, t) => `<g transform="translate(${x} ${y})"><rect x="-1" y="-5" width="${t.length * 3.3 + 3}" height="7" rx="1" fill="#0b1e36e6" stroke="#ffcf3a" stroke-width=".4"/>${tx(.6, .3, 4.6, t, 'start', '#ffe9a0')}</g>`;
const DEFS = `<defs>
  <linearGradient id="ivSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb0c0"/><stop offset=".5" stop-color="#5d6d7d"/><stop offset="1" stop-color="#2c3946"/></linearGradient>
  <linearGradient id="ivSteelH" x1="0" x2="1"><stop offset="0" stop-color="#3a4856"/><stop offset=".45" stop-color="#b8c6d2"/><stop offset="1" stop-color="#3a4856"/></linearGradient>
  <linearGradient id="ivOil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d79a2c"/><stop offset="1" stop-color="#6a3c0c"/></linearGradient>
  <linearGradient id="ivCrude" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2c10"/><stop offset=".15" stop-color="#23140a"/><stop offset="1" stop-color="#0c0703"/></linearGradient>
  <linearGradient id="ivWat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f8fd0"/><stop offset="1" stop-color="#123c66"/></linearGradient>
  <linearGradient id="ivEmul" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6a30" stop-opacity="0"/><stop offset=".5" stop-color="#8a7a50"/><stop offset="1" stop-color="#3f8fd0" stop-opacity="0"/></linearGradient>
  <linearGradient id="ivIG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d5a48" stop-opacity=".05"/><stop offset="1" stop-color="#b08a5a" stop-opacity=".35"/></linearGradient>
  <linearGradient id="ivFire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#ff9a2a"/><stop offset="1" stop-color="#c2410c"/></linearGradient>
  <radialGradient id="ivGlow"><stop offset="0" stop-color="#ffb347" stop-opacity=".8"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
  <radialGradient id="ivLamp"><stop offset="0" stop-color="#fff6d8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
  <pattern id="ivHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#3a2420"/><path d="M0 0 V6" stroke="#5a3a30" stroke-width="2"/></pattern>
  <pattern id="ivGrid" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#26313b"/><path d="M0 0 H16 M0 0 V16" stroke="#323f4b" stroke-width=".6"/></pattern>
  <pattern id="ivChain" width="5" height="3" patternUnits="userSpaceOnUse"><ellipse cx="2.5" cy="1.5" rx="2.2" ry="1.2" fill="none" stroke="#8a929a" stroke-width=".9"/></pattern>
  <clipPath id="ivSepClip"><path d="M62 32 H258 A28 58 0 0 1 258 148 H62 A28 58 0 0 1 62 32Z"/></clipPath></defs>`;
const lerp = (a, b, f) => a + (b - a) * f;
// cargo tank perspective: front frame (x0, x1, y deckhead, y bottom) far wider than the back wall: camera high, looking down
const TK = { f: [-70, 390, -14, 330], b: [70, 250, 22, 142] };
const flowPath = (id, d, col, w) => `<path d="${d}" stroke="#0d141b" stroke-width="${w + 2}" fill="none"/><path id="${id}" class="flow" d="${d}" stroke="${col}" stroke-width="${w}" fill="none"/>`;
const blades = (n, r0, r1, sweep) => { let p = ''; for (let k = 0; k < n; k++) { const a = k / n * 2 * Math.PI; p += `M${(r0 * Math.cos(a)).toFixed(1)} ${(r0 * Math.sin(a)).toFixed(1)} Q${(((r0 + r1) / 2) * Math.cos(a + sweep / 2)).toFixed(1)} ${(((r0 + r1) / 2) * Math.sin(a + sweep / 2)).toFixed(1)} ${(r1 * Math.cos(a + sweep)).toFixed(1)} ${(r1 * Math.sin(a + sweep)).toFixed(1)} `; } return p; };

const person = (x, y, sc, hat, suit, flip) => `<g class="iv_p" transform="translate(${x} ${y}) scale(${flip ? -sc : sc} ${sc})"><circle cy="-6.3" r="1.25" fill="#d9ad8a"/><path d="M-1.6 -6.5 a1.6 1.7 0 0 1 3.2 0 h.6 v.45 h-4.4z" fill="${hat}"/><path d="M-1.5 -4.9 h3 l.3 3.3 h-3.6z" fill="${suit}"/><path d="M-1.45 -3.9 h2.9 M-1.55 -2.5 h3.1" stroke="#e8f26a" stroke-width=".4"/><path d="M-1.5 -4.6 L-2.1 -2.3 M1.5 -4.6 L2.6 -3.6" stroke="${suit}" stroke-width=".8"/><rect x="2.2" y="-4.4" width="1.4" height="1.9" fill="#1d2731" stroke="#7dffb0" stroke-width=".2"/><path d="M-.7 -1.6 L-.8 0 M.7 -1.6 L.8 0" stroke="#2b3138" stroke-width=".9"/></g>`;
/* ---------- views ---------- */
const BUILD = {
  sep: () => `<rect width="320" height="180" fill="#0b1622"/><rect y="150" width="320" height="30" fill="url(#ivGrid)"/>
    ${flowPath('iv_in', 'M0 52 H40 Q52 52 56 60 L72 70', '#ffb627', 4)}
    <path d="M62 32 H258 A28 58 0 0 1 258 148 H62 A28 58 0 0 1 62 32Z" fill="#17222d"/>
    <g clip-path="url(#ivSepClip)"><rect id="iv_w" x="0" y="120" width="320" height="60" fill="url(#ivWat)"/><rect id="iv_o" x="0" y="80" width="320" height="40" fill="url(#ivOil)" opacity=".95"/>
      <rect id="iv_e" x="0" y="116" width="320" height="8" fill="url(#ivEmul)"/><path id="iv_surf" d="" stroke="#ffe0a0" stroke-width=".8" fill="none" opacity=".8"/>
      <g id="iv_bub">${Array.from({ length: 16 }, () => '<circle r="1.1" fill="#fff6d0" opacity=".75"/>').join('')}</g><g id="iv_drop">${Array.from({ length: 12 }, () => '<circle r="1" fill="#7fc4ff"/>').join('')}</g>
      <path d="M72 62 Q60 75 72 92" stroke="#c3ced8" stroke-width="3" fill="none"/><path d="M74 66 l-10 -6 M74 76 l-12 0 M74 86 l-10 6" stroke="#ffb627" stroke-width=".8" opacity=".8"/>
      <g><path d="M112 34 V146" stroke="#8a97a4" stroke-width="2.4" stroke-dasharray="5 3"/></g>
      <rect x="244" y="38" width="22" height="16" fill="url(#ivSteelH)" opacity=".85"/><path d="M244 41 h22 M244 44 h22 M244 47 h22 M244 50 h22" stroke="#2c3946" stroke-width=".5"/>
      ${[130, 160, 190, 220].map(x => `<path d="M${x} 146 l-3 -4 M${x} 146 l3 -4" stroke="#ffcf3a" stroke-width=".6"/>`).join('')}</g>
    <path d="M62 32 H258 A28 58 0 0 1 258 148 H62 A28 58 0 0 1 62 32Z" fill="none" stroke="#c3ced8" stroke-width="3"/><path d="M62 32 V148 M258 32 V148" stroke="#c3ced8" stroke-width=".6" opacity=".5"/>
    ${flowPath('iv_g', 'M255 32 V22 H320', '#ffe14d', 3)}${flowPath('iv_oo', 'M246 148 V166 H320', '#ffb627', 3)}${flowPath('iv_wo', 'M180 148 V172 H320', '#3fb0ff', 3)}
    <path d="M296 40 V150" stroke="#8a97a4" stroke-width="3"/><path d="M286 50 H296 M286 136 H296 M286 92 H296" stroke="#8a97a4" stroke-width="2"/>
    ${tag(36, 44, 'INLET')}${tag(80, 104, 'INLET DIVERTER')}${tag(114, 42, 'CALMING BAFFLE')}${tag(222, 30, 'MIST EXTRACTOR')}${tag(270, 30, 'GAS OUT')}${tag(258, 178, 'OIL OUT')}${tag(184, 178, 'WATER OUT')}
    <g font-family="ui-monospace,monospace">${tx(300, 46, 5, 'PT', 'start', '#7dffb0')}<text id="iv_pt" x="299" y="53" font-size="4.4" fill="#e8fff0">—</text>${tx(300, 88, 5, 'LT', 'start', '#7dffb0')}<text id="iv_lt" x="299" y="95" font-size="4.4" fill="#e8fff0">—</text>${tx(300, 128, 5, 'LIT', 'start', '#7dffb0')}<text id="iv_li" x="299" y="135" font-size="4.4" fill="#e8fff0">—</text></g>
    ${tx(160, 66, 6, T('gas'), 'middle', '#ffe9a0')}<text id="iv_ol" x="160" y="0" font-size="6" text-anchor="middle" fill="#2a1600" font-weight="700">${T('oil')}</text><text id="iv_wl" x="160" y="0" font-size="6" text-anchor="middle" fill="#dff0ff" font-weight="700">${T('water')}</text>`,

  cargo: () => { const L = TK;
    const wl = f => [lerp(L.f[0], L.b[0], f), lerp(L.f[2], L.b[2], f), lerp(L.f[3], L.b[3], f)], cr = (f, h) => { const [, yT, yB] = wl(f); return yB - h * (yB - yT); };
    let fr = ''; for (const f of [.2, .4, .6, .8]) { const [x0] = wl(f), x1 = lerp(L.f[1], L.b[1], f); fr += `<path d="M${x0.toFixed(1)} ${cr(f, 1).toFixed(1)} V${cr(f, 0).toFixed(1)} M${x1.toFixed(1)} ${cr(f, 1).toFixed(1)} V${cr(f, 0).toFixed(1)}" stroke="#39424b" stroke-width="${(6 - f * 5).toFixed(1)}"/>`; }
    return `<rect width="320" height="180" fill="#161b20"/>
    <path d="M${L.f[0]} ${L.f[2]} H${L.f[1]} L${L.b[1]} ${L.b[2]} H${L.b[0]}Z" fill="#20262c"/><path d="M${L.f[0]} ${L.f[2]} L${L.b[0]} ${L.b[2]} V${L.b[3]} L${L.f[0]} ${L.f[3]}Z" fill="#1c2227"/><path d="M${L.f[1]} ${L.f[2]} L${L.b[1]} ${L.b[2]} V${L.b[3]} L${L.f[1]} ${L.f[3]}Z" fill="#191e23"/>
    <rect x="${L.b[0]}" y="${L.b[2]}" width="${L.b[1] - L.b[0]}" height="${L.b[3] - L.b[2]}" fill="#262c32"/><path d="M${L.b[0]} ${L.b[3]} H${L.b[1]} L${L.f[1]} ${L.f[3]} H${L.f[0]}Z" fill="#14181c"/>
    ${Array.from({ length: 8 }, (_, k) => `<path d="M${L.b[0] + 20 + k * 20} ${L.b[2]} V${L.b[3]}" stroke="#323a42" stroke-width="2"/>`).join('')}${fr}
    <path d="M${L.b[0] + 8} ${L.b[2] + 2} V${L.b[3]} M${L.b[0] + 15} ${L.b[2] + 2} V${L.b[3]}" stroke="#5b6670" stroke-width="1.2"/>${Array.from({ length: 14 }, (_, k) => `<path d="M${L.b[0] + 8} ${L.b[2] + 6 + k * 8} h7" stroke="#5b6670" stroke-width=".8"/>`).join('')}
    ${[0, 1, 2, 3].map(k => `<path d="M${L.b[0] + 10} ${L.b[3] - 3 + k * 10} q15 ${4 + k * 2} 30 0 t30 0 t30 0 t30 0 t30 0 t30 0" stroke="#4f5964" stroke-width="${2 + k}" fill="none" transform="scale(${1 + k * .25} 1) translate(${-k * 22} 0)"/>`).join('')}
    <rect id="iv_ig" x="0" y="0" width="320" height="100" fill="url(#ivIG)"/>
    <path id="iv_crude" d="" fill="url(#ivCrude)"/><path id="iv_sheen" d="" stroke="#8a6438" stroke-width=".7" fill="none" opacity=".7"/><ellipse id="iv_refl" cx="160" cy="0" rx="40" ry="4" fill="#fff6d8" opacity=".08"/>
    ${flowPath('iv_fill', 'M104 0 V70', '#ffb627', 3)}<path d="M100 70 h8" stroke="#7d8b99" stroke-width="2"/>
    ${flowPath('iv_suct', `M${L.b[1] - 18} ${L.b[2]} V${L.b[3] - 4}`, '#ffb627', 3)}<path d="M${L.b[1] - 24} ${L.b[3] - 4} h12 l-3 4 h-6z" fill="#7d8b99"/>
    <path d="M160 0 V48" stroke="#8a97a4" stroke-width="3"/><g id="iv_cow" transform="translate(160 50)"><circle r="4" fill="#9aa6b2"/><path id="iv_jet" d="M0 0 L70 50" stroke="#c98b24" stroke-width="1.6" stroke-dasharray="3 2" opacity="0"/></g>
    <path d="M206 ${L.b[2] + 2} l-4 -6 h8z" fill="#8a97a4"/><path id="iv_radar" d="M206 ${L.b[2] + 4} V60" stroke="#7dffb0" stroke-width=".6" stroke-dasharray="1 3"/>
    ${tag(110, 30, 'FILLING LINE')}${tag(L.b[1] - 34, 112, 'CARGO PUMP SUCTION')}${tag(166, 44, 'COW MACHINE')}${tag(212, 30, 'RADAR GAUGE')}${tag(L.b[0] + 18, L.b[3] - 8, 'HEATING COILS')}
    <text x="314" y="30" font-size="5" text-anchor="end" fill="#e8d2b0">IG blanket · O₂ &lt; 8 %</text><text id="iv_lvl" x="314" y="40" font-size="6" text-anchor="end" fill="#7dffb0" font-family="ui-monospace,monospace">—</text>`; },

  turret: () => `<rect width="320" height="180" fill="#0d1620"/><rect y="0" width="320" height="64" fill="#101e2c"/>
    <path d="M0 70 H112 V160 H0Z M208 70 H320 V160 H208Z" fill="url(#ivHatch)"/><path d="M0 70 H112 V160 M320 70 H208 V160" stroke="#8a4a3a" stroke-width="1.5" fill="none"/><path d="M0 160 H112 M208 160 H320" stroke="#c43a2a" stroke-width="2"/>
    <rect y="160" width="320" height="20" fill="#0a2a44"/>
    <rect x="122" y="44" width="76" height="120" fill="#3a4652" stroke="#9fb3c8" stroke-width="1"/><rect x="112" y="160" width="96" height="10" fill="#e2b52c" stroke="#5a4400"/>
    <rect x="110" y="64" width="12" height="10" fill="#ffd84a" stroke="#5a4400"/><rect x="198" y="64" width="12" height="10" fill="#ffd84a" stroke="#5a4400"/>
    ${[0, 1, 2, 3].map(k => flowPath('iv_r' + k, `M${134 + k * 9} 176 V48 H${150 + k * 5} V${38 - k * 7}`, ['#ffb627', '#ffb627', '#9b7cff', '#3fb0ff'][k], 2)).join('')}
    ${[0, 1, 2, 3].map(k => `<g transform="translate(160 ${36 - k * 7})"><ellipse rx="${22 - k * 2}" ry="3.6" fill="url(#ivSteelH)" stroke="#2c3946" stroke-width=".5"/><path class="iv_sw" d="M${-20 + k * 2} 0 H${20 - k * 2}" stroke="#ffcf3a" stroke-width="1" stroke-dasharray="2 6"/></g>`).join('')}
    <rect x="152" y="2" width="16" height="10" fill="#5d6d7d" stroke="#9fb3c8" stroke-width=".5"/>
    ${[0, 1, 2].map(k => `<path id="iv_ch${k}" d="M${118 + k * 42} 170 L${80 + k * 80} 180" stroke="url(#ivChain)" stroke-width="3"/>`).join('')}
    ${tag(6, 66, 'HULL (rotates)')}${tag(214, 66, 'MAIN BEARING')}${tag(126, 60, 'TURRET (fixed to seabed)')}${tag(186, 20, 'SWIVEL STACK')}${tag(214, 168, 'CHAIN TABLE')}${tag(214, 176, 'RISERS & MOORING CHAIN')}
    ${tx(216, 36, 4.3, 'production · gas lift', 'start', '#9fb3c8')}${tx(216, 42, 4.3, 'water injection · umbilical', 'start', '#9fb3c8')}
    <g transform="translate(40 30)"><circle r="20" fill="#0b1e36" stroke="#4f6c8a"/><text y="-13" font-size="5" text-anchor="middle" fill="#dcecff">N</text><g id="iv_hdg"><path d="M0 -16 L4 -8 V14 H-4 V-8Z" fill="#c9d2db" stroke="#2c3946" stroke-width=".5"/><circle cy="-10" r="2" fill="#ffd84a"/></g></g>
    <text id="iv_hd" x="40" y="60" font-size="5" text-anchor="middle" fill="#7dffb0" font-family="ui-monospace,monospace">—</text>`,

  comp: () => `<rect width="320" height="180" fill="url(#ivGrid)"/><rect width="320" height="40" fill="#1b2530"/>
    <g transform="translate(78 98)"><circle r="56" fill="#1d2731" stroke="#9fb3c8" stroke-width="2"/><circle r="50" fill="#26323d"/>
      <g id="iv_imp"><circle r="46" fill="#4d5c6b"/><path d="${blades(13, 12, 46, 0.9)}" stroke="#c3ced8" stroke-width="2.2" fill="none"/><circle r="12" fill="#8a97a4" stroke="#2c3946"/><circle r="4" fill="#2c3946"/></g>
      <text y="68" font-size="5.5" text-anchor="middle" fill="#9fb3c8">impeller (front view)</text></g>
    <rect x="150" y="62" width="156" height="72" rx="10" fill="#3e4c5a" stroke="#9fb3c8" stroke-width="1.2"/><rect x="156" y="68" width="144" height="60" rx="6" fill="#1a232c"/>
    <path d="M150 98 H312" stroke="#c3ced8" stroke-width="5"/><path id="iv_shaft" d="M150 98 H312" stroke="#5d6d7d" stroke-width="5" stroke-dasharray="3 3"/>
    ${[0, 1, 2].map(k => `<path d="M${178 + k * 40} 74 q8 24 0 48 h10 q-8 -24 0 -48z" fill="#8a97a4" stroke="#2c3946" stroke-width=".5"/><path d="M${192 + k * 40} 74 h12 v48 h-12" stroke="#5d6d7d" stroke-width="1" fill="none"/>`).join('')}
    ${flowPath('iv_cin', 'M164 20 V70', '#ffe14d', 3)}${flowPath('iv_cout', 'M290 70 V20 H320', '#ffe14d', 3)}${flowPath('iv_rec', 'M286 20 V10 H170 V20', '#ffb627', 1.6)}<rect x="226" y="6" width="10" height="8" fill="#e8742a"/>
    ${tag(140, 14, 'SUCTION')}${tag(268, 30, 'DISCHARGE')}${tag(206, 4, 'ANTI-SURGE VALVE')}${tag(178, 142, '3 STAGES')}${tag(276, 144, 'TO DRIVER →')}
    ${person(296, 166, 3, '#ffd84a', '#1d4f9a', 1)}${tag(250, 176, 'MECH. TECHNICIAN')}
    <text id="iv_cst" x="152" y="152" font-size="8" font-weight="700" text-anchor="start" fill="#2bd66f">RUNNING</text><text id="iv_cv" x="152" y="161" font-size="4.6" fill="#cfe3f7" font-family="ui-monospace,monospace">—</text>`,

  gt: () => `<rect width="320" height="180" fill="#1a2028"/><rect y="146" width="320" height="34" fill="url(#ivGrid)"/>${[50, 160, 270].map(x => `<circle cx="${x}" cy="6" r="22" fill="url(#ivLamp)" opacity=".5"/><rect x="${x - 12}" y="2" width="24" height="3" fill="#e8eef4"/>`).join('')}
    <rect x="8" y="74" width="60" height="56" rx="4" fill="#2f5d7a" stroke="#9fb3c8"/>${tx(38, 104, 6, 'GENERATOR', 'middle', '#e6eef6', 700)}<rect x="68" y="98" width="16" height="6" fill="#8a97a4"/>
    <path d="M84 86 H118 L210 76 V122 L118 112 H84Z" fill="#46525e" stroke="#9fb3c8"/><path id="iv_cblades" d="M120 98 H208" stroke="#c3ced8" stroke-width="20" stroke-dasharray="1 2.4" opacity=".75"/>
    <rect x="210" y="70" width="34" height="58" rx="6" fill="#3a3f46" stroke="#9fb3c8"/><ellipse id="iv_fire" cx="227" cy="99" rx="12" ry="22" fill="url(#ivFire)"/><circle id="iv_fglow" cx="227" cy="99" r="40" fill="url(#ivGlow)"/>
    <path d="M244 76 L276 70 V128 L244 122Z" fill="#46525e" stroke="#9fb3c8"/><path id="iv_tblades" d="M246 99 H274" stroke="#d9a35a" stroke-width="40" stroke-dasharray="1.4 2.6" opacity=".7"/>
    <path d="M276 70 H300 V0 H318 V128 H276" fill="#3a434c" stroke="#9fb3c8"/><path d="M84 92 H40 V40 H84" stroke="#5d6d7d" stroke-width="2" fill="none"/>
    ${tag(90, 70, 'AIR COMPRESSOR')}${tag(206, 62, 'COMBUSTOR')}${tag(246, 140, 'POWER TURBINE')}${tag(280, 36, 'EXHAUST')}${tag(14, 66, 'GENERATOR')}
    ${person(186, 150, 3.4, '#ffd84a', '#1d4f9a', 1)}${tag(160, 160, 'E&I TECHNICIAN')}
    <text id="iv_gst" x="10" y="150" font-size="7" font-weight="700" fill="#2bd66f">—</text><text id="iv_gv" x="10" y="160" font-size="5.5" fill="#cfe3f7" font-family="ui-monospace,monospace">—</text><text id="iv_gv2" x="10" y="168" font-size="5.5" fill="#cfe3f7" font-family="ui-monospace,monospace">—</text>`,

  ccr: () => `<rect width="320" height="180" fill="#131a22"/><rect width="320" height="12" fill="#1d2630"/>${[60, 160, 260].map(x => `<rect x="${x - 30}" y="10" width="60" height="2" fill="#f4f7fa"/><path d="M${x - 30} 12 L${x - 60} 60 H${x + 60} L${x + 30} 12Z" fill="#fff6d8" opacity=".04"/>`).join('')}
    ${[0, 1, 2].map(k => `<rect x="${18 + k * 98}" y="22" width="90" height="56" rx="2" fill="#050b12" stroke="#4a5866" stroke-width="2"/>`).join('')}
    <g font-family="ui-monospace,monospace">${tx(24, 31, 5, 'PRODUCTION', 'start', '#36c8ff', 700)}<text id="iv_s1" x="24" y="41" font-size="5" fill="#2bd66f"></text><text id="iv_s2" x="24" y="49" font-size="5" fill="#ffe14d"></text><text id="iv_s3" x="24" y="57" font-size="5" fill="#3fb0ff"></text><text id="iv_s4" x="24" y="65" font-size="5" fill="#cfe3f7"></text><text id="iv_s5" x="24" y="73" font-size="5" fill="#cfe3f7"></text>
      ${tx(122, 31, 5, 'HP SEPARATOR', 'start', '#36c8ff', 700)}<rect x="124" y="38" width="70" height="20" rx="10" fill="#0a1626" stroke="#8fa2b5"/><rect id="iv_m1" x="125" y="48" width="68" height="9" fill="#c98b24"/><text id="iv_m2" x="122" y="66" font-size="5" fill="#cfe3f7"></text><text id="iv_m3" x="122" y="74" font-size="5" fill="#cfe3f7"></text>
      ${tx(220, 31, 5, 'ALARM SUMMARY', 'start', '#36c8ff', 700)}<rect id="iv_ab" x="218" y="35" width="86" height="12" fill="#0f5c31"/><text id="iv_a1" x="222" y="43" font-size="5.5" fill="#fff" font-weight="700"></text><text id="iv_a2" x="222" y="56" font-size="4.4" fill="#ffd6d6"></text><text id="iv_a3" x="222" y="64" font-size="4.4" fill="#ffd6d6"></text><text id="iv_a4" x="222" y="72" font-size="4.4" fill="#ffd6d6"></text></g>
    <path d="M0 132 L30 104 H290 L320 132Z" fill="#2a333d"/><rect x="0" y="132" width="320" height="48" fill="#1e252d"/>
    ${[40, 90, 140, 190, 240].map(x => `<g transform="translate(${x} 96)"><path d="M-2 10 h4 v6 h-4z" fill="#2a333d"/><rect x="-18" y="-14" width="36" height="24" rx="1.5" fill="#0a121b" stroke="#4a5866"/><path d="M-14 -8 h12 M-14 -3 h20 M-14 2 h16" stroke="#2bd66f" stroke-width="1" opacity=".7"/></g>`).join('')}
    ${[[110, 1], [210, -1]].map(([x, s]) => `<g transform="translate(${x} 140) scale(${s} 1)"><circle cy="-30" r="8" fill="#3a4450"/><path d="M-12 0 q0 -22 12 -22 q12 0 12 22z" fill="#e8742a"/><path d="M-14 0 h28 v14 h-28z" fill="#262d35"/></g>`).join('')}
    ${tag(96, 104, 'CRO')}${tag(196, 104, 'CRO')}
    <rect id="iv_esd" x="276" y="112" width="18" height="12" rx="2" fill="#a11"/><text x="285" y="120" font-size="4" text-anchor="middle" fill="#fff">ESD</text>`,
};

/* ---------- per-frame updates ---------- */
const run = (el, on, dur) => { if (!el) return; el.style.animationPlayState = on ? 'running' : 'paused'; el.style.opacity = on ? 1 : 0.25; if (dur) el.style.animationDuration = dur + 's'; };
const UPD = {
  sep(sim) { const s = sim.s, y = p => 148 - clamp(p, 0, 100) / 100 * 116;
    const yo = y(s.sep.LT), yw = y(s.sep.LI);
    E.iv_o.setAttribute('y', yo.toFixed(1)); E.iv_o.setAttribute('height', Math.max(0, yw - yo).toFixed(1)); E.iv_w.setAttribute('y', yw.toFixed(1)); E.iv_w.setAttribute('height', (180 - yw).toFixed(1));
    E.iv_e.setAttribute('y', (yw - 4).toFixed(1));
    let d = ''; for (let x = 30; x <= 290; x += 10) d += (x === 30 ? 'M' : 'L') + x + ' ' + (yo + Math.sin(x / 13 + tA * 3) * 0.9).toFixed(1);
    E.iv_surf.setAttribute('d', d); E.iv_ol.setAttribute('y', ((yo + yw) / 2 + 2).toFixed(1)); E.iv_wl.setAttribute('y', ((yw + 148) / 2 + 2).toFixed(1));
    const q = s.wellsQin.L; [...E.iv_bub.children].forEach((c, k) => { const x = 120 + (k * 37) % 130, ph = (tA * (0.3 + q / 40000) + k * 0.37) % 1; c.setAttribute('cx', x); c.setAttribute('cy', (yw - (yw - yo) * ph).toFixed(1)); c.setAttribute('opacity', q > 100 ? 0.75 : 0); });
    [...E.iv_drop.children].forEach((c, k) => { const x = 125 + (k * 29) % 120, ph = (tA * 0.25 + k * 0.41) % 1; c.setAttribute('cx', x); c.setAttribute('cy', (yo + (yw - yo) * ph).toFixed(1)); c.setAttribute('opacity', q > 100 ? 0.8 : 0); });
    run(E.iv_in, q > 50, clamp(9000 / Math.max(q, 1), 0.3, 6).toFixed(2)); run(E.iv_g, s.sep.qgComp > 0.01 || s.sep.flareQ > 0.01); run(E.iv_oo, s.sep.qoOut > 50); run(E.iv_wo, s.sep.qwOut > 50);
    E.iv_pt.textContent = fu('press', s.sep.P, 1); E.iv_lt.textContent = nf(s.sep.LT, 0) + ' %'; E.iv_li.textContent = nf(s.sep.LI, 0) + ' %'; },
  cargo(sim) { const s = sim.s, c = sim.c, f = clamp(s.cargo / CFG.cargo.cap, 0, 1), L = TK;
    const yb = L.b[3] - f * (L.b[3] - L.b[2]), yf = L.f[3] - f * (L.f[3] - L.f[2]), w = k => Math.sin(tA * 0.8 + k) * 0.8 * (0.4 + Math.min(c.env.hs, 6) / 6);
    const xl = lerp(L.f[0], L.b[0], 1), xr = L.b[1];
    E.iv_crude.setAttribute('d', `M${L.f[0]} ${(yf + w(0)).toFixed(1)} L${xl} ${(yb + w(1)).toFixed(1)} H${xr} L${L.f[1]} ${(yf + w(2)).toFixed(1)} V200 H${L.f[0]}Z`);
    let sh = ''; for (let k = 1; k < 6; k++) { const g = k / 6, y = lerp(yb, yf, g) + w(k) * 0.5, x0 = lerp(xl, L.f[0], g), x1 = lerp(xr, L.f[1], g); sh += `M${(x0 + 10).toFixed(1)} ${y.toFixed(1)} L${(x1 - 10).toFixed(1)} ${(y + w(k + 3) * .4).toFixed(1)} `; }
    E.iv_sheen.setAttribute('d', sh); E.iv_refl.setAttribute('cy', (lerp(yb, yf, .45)).toFixed(1));
    E.iv_ig.setAttribute('height', Math.max(0, yb).toFixed(1)); E.iv_radar.setAttribute('d', `M206 ${L.b[2] + 4} V${Math.max(L.b[2] + 6, yb).toFixed(1)}`);
    const off = s.tanker.st === 'offloading'; run(E.iv_fill, s.sep.qoOut > 50); run(E.iv_suct, off);
    E.iv_jet.setAttribute('opacity', off ? 0.9 : 0); E.iv_cow.setAttribute('transform', `translate(160 50) rotate(${off ? (tA * 40) % 360 : 30})`);
    E.iv_lvl.textContent = `${nf(f * 100, 1)} % · ${fu('vol', s.cargo, 0)}`; },
  turret(sim) { const s = sim.s; E.iv_hdg.setAttribute('transform', `rotate(${(s.moor.heading || 0).toFixed(1)})`); E.iv_hd.textContent = `HDG ${nf(s.moor.heading, 0)}°`;
    const q = s.wellsQin.L; run(E.iv_r0, q > 50); run(E.iv_r1, q > 50); run(E.iv_r2, s.gasUse.lift > 0.01); run(E.iv_r3, s.wi.q > 50);
    rot.swv += ((s.moor.heading || 0) - (rot.h0 === undefined ? s.moor.heading : rot.h0)); rot.h0 = s.moor.heading;
    E.sw.forEach((el, k) => el.setAttribute('stroke-dashoffset', (rot.swv * (2 + k * 0.4) + tA * 0.6).toFixed(1)));
    const Tl = s.moor.T || [], col = r => r > 0.55 ? '#ff4545' : r > 0.4 ? '#ffb627' : '#8a929a';
    [0, 1, 2].forEach(k => E['iv_ch' + k].setAttribute('stroke', s.moor.failed[k * 3] ? '#ff4545' : col((Tl[k * 3] || 0) / CFG.moor.MBL))); },
  comp(sim, dt) { const s = sim.s, c = sim.c, on = c.comp[0] && !s.comp.tripped[0], q = s.comp.q;
    const sp = on ? clamp(q / (CFG.comp.train * 2), 0.3, 1.2) : 0; rot.comp += sp * dt * 1400;
    E.iv_imp.setAttribute('transform', `rotate(${(rot.comp % 360).toFixed(1)})`); E.iv_shaft.setAttribute('stroke-dashoffset', (rot.comp / 20).toFixed(1));
    run(E.iv_cin, on); run(E.iv_cout, on); run(E.iv_rec, on && q < CFG.comp.train * 0.5);
    E.iv_cst.textContent = T(s.comp.tripped[0] ? 'TRIPPED' : on ? 'RUNNING' : 'STOPPED'); E.iv_cst.setAttribute('fill', s.comp.tripped[0] ? '#ff4545' : on ? '#2bd66f' : '#9fb3c8');
    E.iv_cv.textContent = `Ps ${fu('press', s.sep.P, 1)} → Pd ${fu('press', CFG.comp.Pd, 0)} · ${fu('gas', q, 2)} · ${nf(s.comp.power, 1)} MW`.replace(' · ', ' · '); },
  gt(sim, dt) { const s = sim.s, d = sim.d, on = s.power.demand > 0.5; rot.gt += (on ? 1 : 0) * dt * 60;
    E.iv_cblades.setAttribute('stroke-dashoffset', (-rot.gt).toFixed(1)); E.iv_tblades.setAttribute('stroke-dashoffset', (-rot.gt * 1.3).toFixed(1));
    const fl = on ? 0.85 + 0.15 * Math.sin(tA * 23) : 0; E.iv_fire.setAttribute('opacity', fl.toFixed(2)); E.iv_fglow.setAttribute('opacity', (fl * (s.power.diesel ? 1 : 0.7)).toFixed(2));
    E.iv_fire.setAttribute('ry', (16 + 6 * fl).toFixed(1));
    E.iv_gst.textContent = T(!on ? 'STOPPED' : s.power.diesel ? 'ON DIESEL (liquid fuel)' : 'ON FUEL GAS'); E.iv_gst.setAttribute('fill', !on ? '#9fb3c8' : s.power.diesel ? '#ffb627' : '#2bd66f');
    E.iv_gv.textContent = `${T('Demand / available')} ${nf(s.power.demand, 1)} / ${nf(d.powerAvail, 0)} MW`; E.iv_gv2.textContent = `${T('Fuel gas')} ${fu('gas', s.gasUse.fuel, 2)}`; },
  ccr(sim) { const s = sim.s, c = sim.c, al = sim.alarmList();
    E.iv_s1.textContent = `OIL   ${fu('liq', s.sep.qoOut, 0)}`; E.iv_s2.textContent = `GAS   ${fu('gas', s.wellsQin.g / 1e6, 2)}`; E.iv_s3.textContent = `WATER ${fu('liq', s.sep.qwOut, 0)}`;
    E.iv_s4.textContent = `CARGO ${nf(s.cargo / CFG.cargo.cap * 100, 0)} %`; E.iv_s5.textContent = `POB   ${s.heli.pob}`;
    E.iv_m1.setAttribute('height', (18 * clamp(s.sep.LT / 100, 0, 1)).toFixed(1)); E.iv_m1.setAttribute('y', (57 - 18 * clamp(s.sep.LT / 100, 0, 1)).toFixed(1));
    E.iv_m2.textContent = `P  ${fu('press', s.sep.P, 2)}`; E.iv_m3.textContent = `LT ${nf(s.sep.LT, 0)} %  LI ${nf(s.sep.LI, 0)} %`;
    const act = al.filter(a => a.active), un = al.some(a => !a.acked), fl = un && Math.sin(tA * 6) > 0;
    E.iv_ab.setAttribute('fill', act.length ? (fl ? '#ff4545' : '#7c0d0d') : '#0f5c31'); E.iv_a1.textContent = act.length ? `${act.length} ${T('ACTIVE')}` : T('No active alarms');
    [0, 1, 2].forEach(k => { E['iv_a' + (k + 2)].textContent = act[k] ? T(act[k].text).slice(0, 34) : ''; });
    E.iv_esd.setAttribute('fill', c.esd ? (Math.sin(tA * 8) > 0 ? '#ff3030' : '#600') : '#a11'); },
};

function show(key) {
  if (!VIEWS[key]) key = 'sep'; cur = key; const svg = $('inSvg'); if (!svg) return;
  svg.innerHTML = DEFS + BUILD[key]();
  for (const k in E) delete E[k];
  svg.querySelectorAll('[id]').forEach(el => { if (el.id.startsWith('iv_')) E[el.id] = el; }); E.sw = [...svg.querySelectorAll('.iv_sw')];
  rot.h0 = undefined;
}
function update(sim, dt) { tA += dt; if (UPD[cur] && $('inSvg') && E[Object.keys(E)[0]]) UPD[cur](sim, dt); }
function hud(sim) {
  const v = VIEWS[cur];
  return `<div>${v[2]} · <b>${T(v[0])}</b></div><div class="rec">● REC ${new Date(sim.clockMs()).toISOString().slice(11, 19)}</div>`;
}
return { VIEWS, INFO2VIEW, show, update, hud, cur: () => cur };
};

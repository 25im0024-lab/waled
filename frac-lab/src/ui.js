/* Frac-Fluid Lab — UI: inputs (stored in localStorage), results, charts, comparison with a reference paper. */
(function () {
'use strict';
const FL = window.FL, $ = id => document.getElementById(id), KEY = 'fraclab-v1', WHO = ['mine', 'ref'];
const COL = { mine: '#36c8ff', ref: '#ffb627' }, COL2 = { mine: '#7fe3ff', ref: '#ffd27a' };
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = v => v === '' || v === null || v === undefined ? NaN : +v;
const ok = v => typeof v === 'number' && isFinite(v);

/* ---------------- state ---------------- */
const rheoS = () => ({ src: 'data', unit: 'eta', text: '', K: '', Kunit: 'Pa', n: '', tau0: '' });
const DEF = {
  tab: 'rheo',
  meta: { mine: 'عينتي', ref: 'البحث المرجعي', cite: '', notes: '' },
  rheo: { mode: 'log', etaInfFit: false, etaInf: 0, show: 'eta', curves: 'best', mine: rheoS(), ref: rheoS() },
  thermal: { thr: 50, refPt: 'hold', tol: 2, gd: 170, mine: { text: '' }, ref: { text: '' } },
  ve: { kind: 'freq', xunit: 'rad', tol: 5, mine: { freq: '', amp: '' }, ref: { freq: '', amp: '' } },
  prop: { model: 'best', rhof: 1.0, rhop: 2.65, mesh: '20/40', dmm: 0.63, X: 1, phiMode: 'ppa', ppa: 2, phi: 8, H: 30, tpump: 60, mine: { vmeas: '' }, ref: { vmeas: '' } },
  brk: { crit: 5, mine: { text: '', res: '', conc: 3.6, arr: '' }, ref: { text: '', res: '', conc: 3.6, arr: '' } },
  frac: { qu: 'bpm', q: 40, t: 60, h: 30, E: 20, nu: 0.25, mine: { clsrc: 'manual', CL: 0.001, Sp: 0, area: 22.6, fl: '' }, ref: { clsrc: 'manual', CL: 0.001, Sp: 0, area: 22.6, fl: '' } },
  surf: { T: 25, nG: 1, g0: 72, cunit: 'mM', mw: 304.44, iftx: 'co-surfactant : surfactant', ring: { P: '', R: 9.549, r: 0.178, drho: 0.997 }, plate: { F: '', w: 19.9, t: 0.1, theta: 0 }, spin: { d: '', rpm: 6000, drho: 0.1, nref: 1.333, L: '' }, mine: { cmc: '', ift: '' }, ref: { cmc: '', ift: '' } },
  cmp: { manual: {} },
  proto: {},
};
function merge(d, o) {
  if (!o || typeof o !== 'object') return d;
  for (const k in d) if (k in o) {
    const dv = d[k];
    if (dv && typeof dv === 'object' && !Array.isArray(dv)) { if (Object.keys(dv).length) merge(dv, o[k]); else if (o[k] && typeof o[k] === 'object') Object.assign(dv, o[k]); }
    else d[k] = o[k];
  }
  return d;
}
let S = (() => { try { return merge(clone(DEF), JSON.parse(localStorage.getItem(KEY))); } catch (e) { return clone(DEF); } })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } };
const get = (p, o = S) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
function set(p, v) { const ks = p.split('.'); let a = S; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; }
function toast(t) { const e = document.createElement('div'); e.textContent = t; $('toast').appendChild(e); setTimeout(() => e.remove(), 4200); }
const nm = w => esc(S.meta[w] || (w === 'mine' ? 'عينتي' : 'المرجع'));

/* ---------------- formatting ---------------- */
function fm(v, s) {
  if (v === null || v === undefined || !ok(v)) return '—'; s = s || 4; const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e6)) return v.toExponential(s - 1);
  return String(+v.toPrecision(s));
}
const pm = (v, ci) => ok(ci) ? `${fm(v)} ± ${fm(ci, 2)}` : fm(v);
const tbl = (head, rows, cls) => `<div class="tw"><table class="res ${cls || ''}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const tr = (cells, cls) => `<tr class="${cls || ''}">${cells.map((c, i) => `<td class="${i ? 'n' : ''}">${c}</td>`).join('')}</tr>`;
const wn = (t, k) => `<div class="wn ${k || 'a'}">${t}</div>`;

/* ---------------- input builders ---------------- */
// field: [path, label, type, opts]; type n=number t=text s=select c=checkbox a=textarea
function fld([p, l, t, o]) {
  const v = get(p), rr = o && o.rr ? ' data-rr="1"' : '', cls = t === 'a' || (o && o.wide) ? ' class="wide"' : t === 'c' ? ' class="chk"' : '';
  if (t === 's') return `<label${cls}><span>${l}</span><select data-k="${p}"${rr}>${o.opts.map(([a, b]) => `<option value="${a}"${String(v) === String(a) ? ' selected' : ''}>${b}</option>`).join('')}</select></label>`;
  if (t === 'c') return `<label${cls}><input type="checkbox" data-k="${p}"${rr}${v ? ' checked' : ''}><span>${l}</span></label>`;
  if (t === 'a') return `<label${cls}><span>${l}</span><textarea data-k="${p}" rows="${(o && o.rows) || 8}" spellcheck="false" placeholder="${esc(o && o.ph)}">${esc(v)}</textarea></label>`;
  if (t === 't') return `<label${cls}><span>${l}</span><input type="text" data-k="${p}" value="${esc(v)}"${rr}></label>`;
  return `<label${cls}><span>${l}</span><input type="number" step="any" data-k="${p}" value="${esc(v)}"${rr}></label>`;
}
const form = fs => `<div class="form">${fs.map(fld).join('')}</div>`;
const card = (title, body, extra) => `<div class="card"><h2>${title}${extra ? ` <small>${extra}</small>` : ''}</h2><div class="body">${body}</div></div>`;
const wcard = (w, title, body, extra) => card(`<span class="dot" style="background:${COL[w]}"></span>${nm(w)} — ${title}`, body, extra);
const cv = (id, h) => `<canvas id="${id}" style="height:${h || 320}px"></canvas>`;
const proto = k => `<details class="proto" data-proto="${k}"${S.proto[k] ? ' open' : ''}><summary>خطوات إجراء التجربة وطريقة الحساب (Protocol)</summary><div>${window.PROTO[k]}</div></details>`;

/* ---------------- tab layouts ---------------- */
const TAB = {};
TAB.rheo = () => {
  const smp = w => {
    const p = `rheo.${w}`, src = get(p + '.src');
    const f = [[p + '.src', 'مصدر البيانات', 's', { rr: 1, opts: [['data', 'قراءات rheometer'], ['params', 'Parameters (K′، n′) من بحث']] }]];
    if (src === 'params') f.push([p + '.K', 'K′', 'n'], [p + '.Kunit', 'وحدة K′', 's', { opts: [['Pa', 'Pa·sⁿ'], ['mPa', 'mPa·sⁿ'], ['lbf', 'lbf·sⁿ/ft²']] }], [p + '.n', 'n′', 'n'], [p + '.tau0', 'τ₀ (Pa)، اختياري', 'n']);
    else f.push([p + '.unit', 'الأعمدة', 's', { rr: 1, opts: [['eta', 'γ̇ (1/s) ، η (mPa·s)'], ['tau', 'γ̇ (1/s) ، τ (Pa)'], ['fann', 'Fann 35: rpm ، قراءة القرص']] }],
      [p + '.text', 'الصق البيانات (عمودان)', 'a', { ph: '0.1\t850\n1\t620\n10\t180\n...' }]);
    return wcard(w, 'منحنى التدفق', form(f));
  };
  return `${proto('rheo')}<div class="grid"><div class="col">
  ${card('إعدادات المطابقة', form([['rheo.mode', 'فضاء المطابقة', 's', { opts: [['log', 'log (خطأ نسبي)'], ['lin', 'linear على τ']] }],
    ['rheo.etaInfFit', 'طابِق η∞ في Carreau (وإلا تُثبَّت)', 'c', { rr: 1 }], ...(S.rheo.etaInfFit ? [] : [['rheo.etaInf', 'η∞ المثبّتة (mPa·s)', 'n']]),
    ['rheo.show', 'المحور الرأسي', 's', { opts: [['eta', 'η (mPa·s)'], ['tau', 'τ (Pa)']] }],
    ['rheo.curves', 'المنحنيات المرسومة', 's', { opts: [['best', 'أفضل نموذج (AICc)'], ['PL', 'Power-law'], ['HB', 'Herschel-Bulkley'], ['CA', 'Carreau'], ['all', 'الكل']] }]]))}
  ${smp('mine')}${smp('ref')}</div>
  <div class="col">${card('منحنى التدفق والنماذج', cv('cRheo', 360))}<div id="oRheo"></div></div></div>`;
};
TAB.thermal = () => `${proto('thermal')}<div class="grid"><div class="col">
  ${card('إعدادات', form([['thermal.gd', 'معدل القص المستخدم (1/s)', 'n'], ['thermal.thr', 'عتبة اللزوجة (mPa·s)', 'n'],
    ['thermal.refPt', 'مرجع نسبة الاحتفاظ', 's', { opts: [['hold', 'بداية الـ hold'], ['initial', 'أول قراءة']] }], ['thermal.tol', 'بداية الـ hold عند T ≥ Tmax − (°C)', 'n']]))}
  ${WHO.map(w => wcard(w, 'الزمن والحرارة واللزوجة', form([[`thermal.${w}.text`, 'ثلاثة أعمدة: t (min) ، T (°C) ، η (mPa·s)', 'a', { ph: '0\t25\t160\n5\t41\t140\n...' }]]))).join('')}</div>
  <div class="col">${card('اللزوجة والحرارة مع الزمن', cv('cTh', 360))}<div id="oTh"></div></div></div>`;
TAB.ve = () => {
  const k = S.ve.kind, fk = k === 'freq' ? 'freq' : 'amp';
  return `${proto('ve')}<div class="grid"><div class="col">
  ${card('نوع الاختبار', form([['ve.kind', 'الاختبار', 's', { rr: 1, opts: [['freq', 'Frequency sweep'], ['amp', 'Amplitude sweep']] }],
    ...(k === 'freq' ? [['ve.xunit', 'وحدة التردد', 's', { opts: [['rad', 'ω (rad/s)'], ['Hz', 'f (Hz)']] }]] : [['ve.tol', 'تسامح الـ LVE (% انخفاض G′)', 'n']])]))}
  ${WHO.map(w => wcard(w, k === 'freq' ? 'Frequency sweep' : 'Amplitude sweep', form([[`ve.${w}.${fk}`, k === 'freq' ? 'ثلاثة أعمدة: ω ، G′ (Pa) ، G″ (Pa)' : 'ثلاثة أعمدة: γ (%) أو τ (Pa) ، G′ ، G″', 'a', { ph: '0.1\t0.9\t1.5\n1\t4.1\t3.2\n...' }]]))).join('')}</div>
  <div class="col">${card('G′ و G″', `<div class="charts">${cv('cVe', 320)}${cv('cTd', 320)}</div>`)}<div id="oVe"></div></div></div>`;
};
TAB.prop = () => `${proto('prop')}<div class="grid"><div class="col">
  ${card('الـ proppant والمائع', form([['prop.model', 'نموذج ريولوجيا المائع', 's', { opts: [['best', 'أفضل نموذج (AICc)'], ['PL', 'Power-law'], ['CA', 'Carreau'], ['HB', 'Herschel-Bulkley']] }],
    ['prop.rhof', 'كثافة المائع (g/cm³)', 'n'], ['prop.rhop', 'كثافة الـ proppant (g/cm³)', 'n'],
    ['prop.mesh', 'المقاس', 's', { rr: 1, opts: Object.keys(FL.MESH).map(m => [m, m + ' (≈' + FL.MESH[m] + ' mm)']).concat([['custom', 'قطر مخصص']]) }],
    ...(S.prop.mesh === 'custom' ? [['prop.dmm', 'القطر (mm)', 'n']] : []), ['prop.X', 'معامل الـ drag X(n)', 'n'],
    ['prop.phiMode', 'التركيز', 's', { rr: 1, opts: [['ppa', 'ppa (lb/gal)'], ['phi', 'نسبة حجمية %']] }], S.prop.phiMode === 'phi' ? ['prop.phi', 'φ (%)', 'n'] : ['prop.ppa', 'ppa', 'n'],
    ['prop.H', 'مسافة السقوط المرجعية (m)', 'n'], ['prop.tpump', 'زمن الضخ / الإغلاق (min)', 'n']]))}
  ${WHO.map(w => wcard(w, 'قياس (اختياري)', form([[`prop.${w}.vmeas`, 'سرعة الترسيب المقاسة (mm/s)', 'n']]), 'الريولوجيا تؤخذ من تبويب الريولوجيا')).join('')}</div>
  <div class="col">${card('سرعة الترسيب مقابل قطر الحبيبة', cv('cProp', 320))}<div id="oProp"></div></div></div>`;
TAB.brk = () => `${proto('brk')}<div class="grid"><div class="col">
  ${card('إعدادات', form([['brk.crit', 'معيار الكسر: η ≤ (mPa·s)', 'n']]))}
  ${WHO.map(w => wcard(w, 'الكسر والبقايا', form([[`brk.${w}.text`, 'حركية الكسر: t (min) ، η (mPa·s)', 'a', { rows: 7, ph: '0\t180\n10\t95\n...' }],
    [`brk.${w}.conc`, 'تركيز البوليمر في الجل (g/L)', 'n'],
    [`brk.${w}.res`, 'الـ residue (مكرّرات): V (mL) ، m فارغ (g) ، m مع البقايا (g)', 'a', { rows: 3, ph: '50\t25.1234\t25.1301' }],
    [`brk.${w}.arr`, 'اختياري: T (°C) ، k (1/min) لحساب Ea', 'a', { rows: 3, ph: '60\t0.02\n80\t0.06' }]]))).join('')}</div>
  <div class="col">${card('انخفاض اللزوجة مع الزمن', cv('cBrk', 340))}<div id="oBrk"></div></div></div>`;
TAB.frac = () => `${proto('frac')}<div class="grid"><div class="col">
  ${card('بيانات العملية (مشتركة للسائلين)', form([['frac.q', 'معدل الضخ الكلي', 'n'], ['frac.qu', 'الوحدة', 's', { opts: [['bpm', 'bbl/min'], ['m3min', 'm³/min']] }],
    ['frac.t', 'زمن الضخ (min)', 'n'], ['frac.h', 'ارتفاع الكسر h (m)', 'n'], ['frac.E', 'E (GPa)', 'n'], ['frac.nu', 'ν', 'n']]))}
  ${WHO.map(w => { const p = `frac.${w}`, src = get(p + '.clsrc');
    return wcard(w, 'التسرّب (leak-off)', form([[p + '.clsrc', 'مصدر C<sub>L</sub>', 's', { rr: 1, opts: [['manual', 'إدخال يدوي'], ['test', 'من اختبار fluid loss']] }],
      ...(src === 'test' ? [[p + '.area', 'مساحة الترشيح (cm²)', 'n'], [p + '.fl', 't (min) ، V تراكمي (mL)', 'a', { rows: 6, ph: '1\t1.5\n4\t2.6\n9\t3.7\n16\t4.8\n25\t5.9\n36\t7.0' }]]
        : [[p + '.CL', 'C<sub>L</sub> (m/√min)', 'n'], [p + '.Sp', 'S<sub>p</sub> spurt (L/m²)', 'n']])]), 'الريولوجيا: K و n من مطابقة Power-law'); }).join('')}</div>
  <div class="col"><div id="oFrac"></div>${card('تطور الكسر مع الزمن', `<div class="charts">${cv('cFl', 300)}${cv('cFw', 300)}</div>`)}<div id="oFl"></div></div></div>`;
TAB.surf = () => `${proto('surf')}<div class="grid"><div class="col">
  ${card('حاسبة القياس', `<div id="calc">${form([['surf.ring.P', 'Ring: القراءة الظاهرية P (mN/m)', 'n'], ['surf.ring.R', 'نصف قطر الحلقة R (mm)', 'n'], ['surf.ring.r', 'نصف قطر السلك r (mm)', 'n'], ['surf.ring.drho', 'Δρ (g/cm³)', 'n']])}<div id="oRing" class="note"></div><hr>
    ${form([['surf.plate.F', 'Plate: القوة F (mN)', 'n'], ['surf.plate.w', 'عرض الصفيحة (mm)', 'n'], ['surf.plate.t', 'سماكتها (mm)', 'n'], ['surf.plate.theta', 'θ (°)', 'n']])}<div id="oPlate" class="note"></div><hr>
    ${form([['surf.spin.d', 'Spinning drop: القطر الظاهري (mm)', 'n'], ['surf.spin.L', 'طول القطرة (mm)', 'n'], ['surf.spin.rpm', 'rpm', 'n'], ['surf.spin.drho', 'Δρ (g/cm³)', 'n'], ['surf.spin.nref', 'معامل انكسار الطور الثقيل', 'n']])}<div id="oSpin" class="note"></div></div>`)}
  ${card('إعدادات الـ CMC', form([['surf.cunit', 'وحدة التركيز', 's', { opts: [['mM', 'mM'], ['M', 'mol/L'], ['gL', 'g/L'], ['wt', 'wt%']] }], ['surf.mw', 'الكتلة المولية (g/mol)', 'n'],
    ['surf.T', 'T (°C)', 'n'], ['surf.nG', 'n في Gibbs', 's', { opts: [['1', '1 (غير أيوني / ملح زائد)'], ['2', '2 (أيوني 1:1 بلا ملح)']] }], ['surf.g0', 'γ المذيب (mN/m)', 'n'], ['surf.iftx', 'متغير جدول الـ IFT', 't']]))}
  ${WHO.map(w => wcard(w, 'Surface / IFT', form([[`surf.${w}.cmc`, 'C ، γ (mN/m)', 'a', { rows: 7, ph: '0.05\t58\n0.1\t52\n...' }], [`surf.${w}.ift`, 'المتغير ، IFT (mN/m)', 'a', { rows: 5, ph: '1\t0.05\n2\t0.004' }]]))).join('')}</div>
  <div class="col">${card('γ مقابل التركيز و IFT', `<div class="charts">${cv('cCmc', 320)}${cv('cIft', 320)}</div>`)}<div id="oSurf"></div></div></div>`;
TAB.cmp = () => `<div class="grid"><div class="col">
  ${card('العيّنتان والمصدر', form([['meta.mine', 'اسم عيّنتي', 't'], ['meta.ref', 'اسم المرجع', 't'], ['meta.cite', 'البحث (المؤلفون، السنة، المجلة، DOI)', 't', { wide: 1 }], ['meta.notes', 'ملاحظات (اختلاف الظروف: الحرارة، التركيز، الجهاز...)', 'a', { rows: 4 }]]))}
  ${card('طريقة الاستخدام', `<div class="note"><ol>
    <li>أدخل بيانات البحث في بطاقات "${nm('ref')}" في كل تبويب، كما تُدخل بيانات عيّنتك.</li>
    <li>إذا أعطى البحث أرقاماً نهائية فقط، مثل retention % أو CMC، فاكتبها في عمود "قيمة البحث (يدوي)". القيمة اليدوية تُقدَّم على المحسوبة.</li>
    <li>لا تكون المقارنة عادلة إلا عند الظروف نفسها: معدل القص، والحرارة، والتركيز، والـ geometry. سجّل أي اختلاف في الملاحظات.</li></ol></div>`)}</div>
  <div class="col">${card('جدول المقارنة', `<div id="oCmp"></div><div class="toolbar" style="margin-top:8px"><button class="btn sm" id="csvBtn">تصدير CSV</button></div>`)}</div></div>`;
TAB.ref = () => card('المعادلات والمراجع', `<div class="note" style="font-size:13.5px;color:var(--text)">${window.METHODS}</div>`);

/* ---------------- computation ---------------- */
const rows = (t, n) => FL.parseTable(t, n);
function rheoOf(w) {
  const s = S.rheo[w];
  if (s.src === 'params') { const m = FL.rheoFromParams({ K: num(s.K), Kunit: s.Kunit, n: num(s.n), tau0: num(s.tau0) || 0 }); return m ? { manual: m } : null; }
  const r = rows(s.text, 2); if (r.length < 3) return null;
  return FL.rheology(r, s.unit, { mode: S.rheo.mode, etaInfFit: S.rheo.etaInfFit, etaInf: (num(S.rheo.etaInf) || 0) / 1000 });
}
function fluidOf(R, w, pref) { // {model, p, eta}
  const r = R.rheo[w]; if (!r) return null; if (r.manual) return r.manual;
  if (!r.fits) return null; const k = pref === 'best' || !r.fits[pref] ? r.best : pref; return r.fits[k] || null;
}
function plOf(R, w) { const r = R.rheo[w]; if (!r) return null; if (r.manual) return { K: r.manual.p.K, n: r.manual.p.n, manual: true }; const f = r.fits && r.fits.PL; return f ? { K: f.K, n: f.n } : null; }
function fracInputs(R, w) {
  const f = S.frac, s = f[w], pl = plOf(R, w); if (!pl) return null;
  const qt = num(f.q) * (f.qu === 'bpm' ? 0.158987294928 : 1) / 60;
  let CL = num(s.CL) / Math.sqrt(60), Sp = (num(s.Sp) || 0) / 1000, flr = null;
  if (s.clsrc === 'test') { flr = FL.fluidLoss(rows(s.fl, 2), num(s.area)); if (!flr) return { err: 'fl', pl }; CL = flr.CwSI / Math.sqrt(60); Sp = flr.SpSI; }
  const o = { qt, t: num(f.t) * 60, h: num(f.h), E: num(f.E) * 1e9, nu: num(f.nu), CL: CL || 0, Sp: Sp || 0, K: pl.K, n: pl.n };
  if (![o.qt, o.t, o.h, o.E, o.nu].every(v => v > 0) || o.nu >= 0.5) return { err: 'job', pl, flr };
  return { o, pl, flr };
}
function compute() {
  const R = { rheo: {}, thermal: {}, ve: {}, prop: {}, brk: {}, frac: {}, surf: {} };
  for (const w of WHO) {
    R.rheo[w] = rheoOf(w);
    const th = rows(S.thermal[w].text, 3); R.thermal[w] = th.length >= 3 ? FL.thermal(th, { thr: num(S.thermal.thr), ref: S.thermal.refPt, tol: num(S.thermal.tol) || 2 }) : null;
    const vf = rows(S.ve[w].freq, 3), va = rows(S.ve[w].amp, 3);
    R.ve[w] = { freq: vf.length >= 3 ? FL.viscoelastic(vf, { kind: 'freq', xunit: S.ve.xunit }) : null, amp: va.length >= 3 ? FL.viscoelastic(va, { kind: 'amp', tol: num(S.ve.tol) || 5 }) : null };
    const fl = fluidOf(R, w, S.prop.model), P = S.prop;
    R.prop[w] = fl ? FL.proppant(fl, { rhof: num(P.rhof), rhop: num(P.rhop), dmm: P.mesh === 'custom' ? num(P.dmm) : FL.MESH[P.mesh], X: num(P.X) || 1, phiMode: P.phiMode, ppa: num(P.ppa) || 0, phi: num(P.phi) || 0, H: num(P.H), tpump: num(P.tpump), vmeas: num(P[w].vmeas) }) : null;
    if (R.prop[w]) { R.prop[w].fluid = fl; }
    const b = S.brk[w], br = rows(b.text, 2);
    R.brk[w] = { b: br.length >= 3 ? FL.breaker(br, { crit: num(S.brk.crit) }) : null, res: rows(b.res, 3).length ? FL.residue(rows(b.res, 3), num(b.conc)) : null, arr: FL.arrhenius(rows(b.arr, 2)) };
    const fi = fracInputs(R, w);
    R.frac[w] = fi && fi.o ? { ...fi, PKN: FL.fracture({ ...fi.o, model: 'PKN' }), KGD: FL.fracture({ ...fi.o, model: 'KGD' }), sPKN: FL.fractureSeries({ ...fi.o, model: 'PKN' }), sKGD: FL.fractureSeries({ ...fi.o, model: 'KGD' }) } : fi;
    const su = S.surf, molar = su.cunit === 'mM' ? 1e-3 : su.cunit === 'M' ? 1 : su.cunit === 'gL' ? 1 / num(su.mw) : 10 / num(su.mw);
    const cr = rows(su[w].cmc, 2), ir = rows(su[w].ift, 2);
    R.surf[w] = { cmc: cr.length >= 5 ? FL.cmc(cr, { T: num(su.T), nG: +su.nG, g0: num(su.g0) || 72, molar: ok(molar) ? molar : null }) : null, ift: ir.length ? FL.iftScan(ir) : null };
  }
  return R;
}

/* ---------------- chart ---------------- */
function plot(id, o) {
  const cvs = $(id); if (!cvs) return; const dpr = window.devicePixelRatio || 1, W = cvs.clientWidth || 500, H = cvs.clientHeight || 320;
  cvs.width = W * dpr; cvs.height = H * dpr; const c = cvs.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.direction = 'ltr';
  c.font = '11px system-ui,sans-serif'; c.clearRect(0, 0, W, H);
  const ser = o.series.filter(s => s.x && s.x.length), L = 58, Rm = o.y2 ? 54 : 12, T = 12, B = 38;
  const vals = (k, ax) => ser.filter(s => !!s.y2 === ax).flatMap(s => s[k].filter((v, i) => ok(v) && ok(s.x[i]) && ok(s.y[i]) && (!o.xlog || s.x[i] > 0) && (!(ax ? o.y2log : o.ylog) || s.y[i] > 0)));
  const xs = vals('x', false).concat(vals('x', true)), ys = vals('y', false), y2s = vals('y', true);
  if (!xs.length || !ys.length) { c.fillStyle = '#8fa9c6'; c.textAlign = 'center'; c.fillText(o.empty || 'لا توجد بيانات بعد', W / 2, H / 2); return; }
  const ax = (lo, hi, log, p0, p1) => {
    if (log) { lo = Math.log10(lo); hi = Math.log10(hi); if (hi - lo < 0.3) { lo -= 0.3; hi += 0.3; } lo = Math.floor(lo * 4) / 4; hi = Math.ceil(hi * 4) / 4; }
    else { if (o.zero !== false && lo > 0 && lo < hi * 0.6) lo = 0; if (hi === lo) { hi += Math.abs(hi) * 0.1 || 1; lo -= Math.abs(lo) * 0.1 || 1; } const pad = (hi - lo) * 0.05; hi += pad; if (lo !== 0) lo -= pad; }
    const f = v => p0 + ((log ? Math.log10(v) : v) - lo) / (hi - lo) * (p1 - p0), ticks = [];
    if (log) { for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) for (const m of hi - lo < 1.6 ? [1, 2, 5] : [1]) { const v = m * 10 ** e, l = Math.log10(v); if (l >= lo - 1e-9 && l <= hi + 1e-9) ticks.push(v); } }
    else { const raw = (hi - lo) / 5, mg = 10 ** Math.floor(Math.log10(raw)), st = [1, 2, 2.5, 5, 10].map(k => k * mg).find(k => k >= raw); for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9 * st; v += st) ticks.push(+v.toPrecision(10)); }
    return { f, ticks };
  };
  const X = ax(Math.min(...xs), Math.max(...xs), o.xlog, L, W - Rm), Y = ax(Math.min(...ys), Math.max(...ys), o.ylog, H - B, T);
  const Y2 = y2s.length ? ax(Math.min(...y2s), Math.max(...y2s), o.y2log, H - B, T) : null;
  const tl = v => { const a = Math.abs(v); return a !== 0 && (a < 1e-2 || a >= 1e5) ? v.toExponential(0) : String(+v.toPrecision(3)); };
  c.strokeStyle = '#163a5e'; c.lineWidth = 1; c.fillStyle = '#8fa9c6';
  c.beginPath(); X.ticks.forEach(v => { const x = X.f(v); c.moveTo(x, T); c.lineTo(x, H - B); }); Y.ticks.forEach(v => { const y = Y.f(v); c.moveTo(L, y); c.lineTo(W - Rm, y); }); c.stroke();
  c.strokeStyle = '#2b5f90'; c.strokeRect(L, T, W - Rm - L, H - B - T);
  c.textAlign = 'center'; X.ticks.forEach(v => c.fillText(tl(v), X.f(v), H - B + 14));
  c.textAlign = 'right'; Y.ticks.forEach(v => c.fillText(tl(v), L - 4, Y.f(v) + 4));
  if (Y2) { c.textAlign = 'left'; Y2.ticks.forEach(v => c.fillText(tl(v), W - Rm + 4, Y2.f(v) + 4)); }
  c.textAlign = 'center'; c.fillStyle = '#bcd3ea'; c.fillText(o.xl || '', L + (W - Rm - L) / 2, H - 6);
  c.save(); c.translate(13, T + (H - B - T) / 2); c.rotate(-Math.PI / 2); c.fillText(o.yl || '', 0, 0); c.restore();
  if (Y2) { c.save(); c.translate(W - 8, T + (H - B - T) / 2); c.rotate(Math.PI / 2); c.fillText(o.y2l || '', 0, 0); c.restore(); }
  c.save(); c.beginPath(); c.rect(L, T, W - Rm - L, H - B - T); c.clip();
  for (const s of ser) {
    const Yf = s.y2 ? Y2 : Y; if (!Yf) continue; const yl = s.y2 ? o.y2log : o.ylog;
    const P = s.x.map((x, i) => [x, s.y[i]]).filter(([x, y]) => ok(x) && ok(y) && (!o.xlog || x > 0) && (!yl || y > 0)).map(([x, y]) => [X.f(x), Yf.f(y)]);
    c.strokeStyle = c.fillStyle = s.c; c.lineWidth = s.lw || 1.8; c.setLineDash(s.dash ? [6, 4] : s.dot ? [2, 3] : []);
    if (s.mode !== 'p') { c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
    c.setLineDash([]);
    if (s.mode !== 'l') for (const [x, y] of P) { c.beginPath(); if (s.sq) c.rect(x - 3.5, y - 3.5, 7, 7); else c.arc(x, y, 3.6, 0, 7); if (s.open) { c.lineWidth = 1.5; c.stroke(); } else c.fill(); }
  }
  c.restore();
  let ly = T + 14; c.textAlign = 'left';
  const leg = ser.filter(s => s.label);
  if (leg.length) { const lw = Math.max(...leg.map(s => c.measureText(s.label).width)) + 34; c.fillStyle = 'rgba(4,11,21,0.82)'; c.fillRect(L + 3, T + 3, lw, leg.length * 15 + 6); }
  for (const s of leg) {
    const lx = L + 8; c.strokeStyle = c.fillStyle = s.c; c.lineWidth = 2; c.setLineDash(s.dash ? [6, 4] : s.dot ? [2, 3] : []);
    if (s.mode !== 'p') { c.beginPath(); c.moveTo(lx, ly - 4); c.lineTo(lx + 18, ly - 4); c.stroke(); }
    c.setLineDash([]); if (s.mode !== 'l') { c.beginPath(); c.arc(lx + 9, ly - 4, 3.4, 0, 7); s.open ? c.stroke() : c.fill(); }
    c.fillStyle = '#dcecff'; c.fillText(s.label, lx + 24, ly); ly += 15;
  }
}
const logspace = (a, b, n) => Array.from({ length: n }, (_, i) => a * Math.pow(b / a, i / (n - 1)));

/* ---------------- rendering per tab ---------------- */
const MN = { PL: 'Power-law', HB: 'Herschel-Bulkley', CA: 'Carreau' };
const PU = { K: 'Pa·sⁿ', n: '', tau0: 'Pa', eta0: 'Pa·s', lambda: 's', etaInf: 'Pa·s' };
const PNAME = { K: 'K', n: 'n', tau0: 'τ₀', eta0: 'η₀', lambda: 'λ', etaInf: 'η∞' };
const OUT = {};
OUT.rheo = R => {
  let h = '';
  for (const w of WHO) {
    const r = R.rheo[w]; if (!r) { h += wcard(w, 'نتائج المطابقة', '<p class="note">لا توجد بيانات كافية (3 نقاط على الأقل).</p>'); continue; }
    if (r.manual) { const m = r.manual; h += wcard(w, 'Parameters مُدخلة', tbl(['', 'القيمة'], [tr(['النموذج', MN[m.model]]), ...Object.entries(m.p).map(([k, v]) => tr([PNAME[k] + (PU[k] ? ` (${PU[k]})` : ''), fm(v)])), ...FL.REF_RATES.map((g, i) => tr([`η @ ${g} s⁻¹ (mPa·s)`, fm(m.etaAt[i] * 1000)]))])); continue; }
    const rowsH = [], warns = [];
    for (const k of ['PL', 'HB', 'CA']) {
      const f = r.fits[k]; if (!f) { rowsH.push(tr([MN[k], 'نقاط غير كافية', '', '', '', '', ''])); continue; }
      const pars = f.names.map((n, i) => `${PNAME[n]} = ${f.fixed && f.fixed[n] ? fm(f.p[n]) + ' (مثبّت)' : pm(f.p[n], f.ci[i])}${PU[n] ? ' ' + PU[n] : ''}`).join('<br>');
      rowsH.push(tr([MN[k] + (r.best === k ? ' ★' : ''), pars, fm(f.r2, 5), fm(f.r2lin, 5), fm(f.mape, 3), fm(f.aicc, 4), f.etaAt.map(v => fm(v * 1000, 4)).join(' / ')], r.best === k ? 'best' : ''));
      f.names.forEach((n, i) => { if (f.atBound[i]) warns.push(`${MN[k]}: ${PNAME[n]} عند حدّه الأدنى (0)، لذا لا يُحسب له CI. النموذج الأبسط يكفي.`); else if (ok(f.ci[i]) && f.ci[i] > Math.abs(f.p[n]) && !(f.fixed && f.fixed[n])) warns.push(`${MN[k]}: الـ CI لـ ${PNAME[n]} أوسع من قيمته، فهو غير محدد جيداً من هذه البيانات${n === 'lambda' || n === 'eta0' ? '. الهضبة عند القص المنخفض لا تظهر بوضوح' : ''}.`); });
    }
    const em = r.etaMeas.map(v => fm(v === null ? null : v * 1000, 4)).join(' / ');
    h += wcard(w, 'نتائج المطابقة', tbl(['النموذج', 'المعاملات ± 95 % CI', `R² (${r.mode})`, 'R² (τ)', 'MAPE %', 'AICc', 'η @ 40/100/170/511 s⁻¹ (mPa·s)'], rowsH) +
      `<p class="note">N = ${r.d.gd.length} نقطة، γ̇ من ${fm(r.d.gd[0], 3)} إلى ${fm(r.d.gd[r.d.gd.length - 1], 3)} s⁻¹. اللزوجة المقاسة (استيفاء) عند 40/100/170/511: <span class="ltr">${em}</span> mPa·s. ★ = أقل AICc.</p>` + warns.map(t => wn(t)).join(''));
  }
  $('oRheo').innerHTML = h;
  const ser = [], show = S.rheo.show;
  for (const w of WHO) {
    const r = R.rheo[w]; if (!r) continue;
    const curve = (eta, lab, k) => { const g = logspace(r.manual ? 0.1 : Math.min(...r.d.gd), r.manual ? 1000 : Math.max(...r.d.gd), 80); ser.push({ x: g, y: g.map(v => show === 'tau' ? eta(v) * v : eta(v) * 1000), c: k ? ['#2bd66f', '#ff6fae', '#b689ff'][k - 1] : COL[w], mode: 'l', dash: w === 'ref', label: lab }); };
    if (r.manual) { curve(r.manual.eta, `${nm(w)}: ${MN[r.manual.model]} (Parameters)`); continue; }
    ser.push({ x: r.d.gd, y: show === 'tau' ? r.d.tau : r.d.eta.map(v => v * 1000), c: COL[w], mode: 'p', open: w === 'ref', label: nm(w) });
    const ks = S.rheo.curves === 'all' ? ['PL', 'HB', 'CA'] : [S.rheo.curves === 'best' ? r.best : S.rheo.curves];
    ks.forEach(k => { const f = r.fits[k]; if (f) curve(f.eta, `${nm(w)}: ${MN[k]}`, S.rheo.curves === 'all' ? ['PL', 'HB', 'CA'].indexOf(k) + 1 : 0); });
  }
  plot('cRheo', { xlog: true, ylog: true, xl: 'γ̇ (1/s)', yl: show === 'tau' ? 'τ (Pa)' : 'η (mPa·s)', series: ser });
};
OUT.thermal = R => {
  const rr = [], ser = [];
  const lines = [['η الابتدائية (mPa·s)', r => fm(r.eta0)], ['أقصى حرارة (°C)', r => fm(r.Tmax)], ['بداية الـ hold (min)', r => fm(r.tHold)], ['η عند بداية الـ hold (mPa·s)', r => fm(r.etaHold)],
    ['احتفاظ بعد التسخين (η_hold/η₀ %)', r => fm(r.retentionHeat)], ['η في النهاية (mPa·s)', r => fm(r.etaEnd) + ` @ ${fm(r.tEnd)} min`], [`<b>نسبة الاحتفاظ % (مرجع: ${S.thermal.refPt === 'hold' ? 'بداية hold' : 'أول قراءة'})</b>`, r => `<b>${fm(r.retention)}</b>`],
    [`زمن الهبوط تحت ${fm(num(S.thermal.thr))} mPa·s (min)`, r => r.tThr === null ? `> ${fm(r.tEnd)} (لم تهبط)` : fm(r.tThr)], ['متوسط η خلال الـ hold', r => fm(r.etaMeanHold)],
    ['k خلال الـ hold (1/min) ± CI', r => r.hold ? pm(r.hold.k, r.hold.ciK) : '—'], ['t½ = ln2/k (min)', r => r.hold && r.hold.half ? fm(r.hold.half) : '—'], ['R² (ln η مقابل t)', r => r.hold ? fm(r.hold.r2, 4) : '—'],
    ['E<sub>a</sub> للتدفق أثناء التسخين (kJ/mol) ± CI', r => r.arr ? pm(r.arr.Ea, r.arr.ciEa) : '—'], ['R² (Arrhenius)', r => r.arr ? fm(r.arr.r2, 4) : '—']];
  for (const [l, f] of lines) rr.push(tr([l, ...WHO.map(w => R.thermal[w] ? f(R.thermal[w]) : '—')]));
  for (const w of WHO) { const r = R.thermal[w]; if (!r) continue;
    ser.push({ x: r.t, y: r.eta, c: COL[w], mode: 'pl', open: w === 'ref', label: `${nm(w)}: η` }, { x: r.t, y: r.T, c: COL2[w], mode: 'l', dot: true, y2: true, label: `${nm(w)}: T` });
    if (r.hold) { const tt = r.t.slice(r.ih); ser.push({ x: tt, y: tt.map(r.hold.fn), c: '#2bd66f', mode: 'l', dash: true, lw: 1.2 }); } }
  if (num(S.thermal.thr) > 0 && ser.length) { const all = ser.flatMap(s => s.x); ser.push({ x: [Math.min(...all), Math.max(...all)], y: [num(S.thermal.thr), num(S.thermal.thr)], c: '#ff4545', mode: 'l', dot: true, lw: 1, label: 'العتبة' }); }
  $('oTh').innerHTML = card(`النتائج عند ${fm(num(S.thermal.gd))} s⁻¹`, tbl(['', `<span class="mine">${nm('mine')}</span>`, `<span class="refc">${nm('ref')}</span>`], rr) +
    `<p class="note">الخط الأخضر المتقطع = مطابقة first-order خلال الـ hold. E<sub>a</sub> تُحسب فقط إذا ارتفعت الحرارة 10 °C على الأقل قبل الـ hold.</p>`);
  plot('cTh', { xl: 't (min)', yl: 'η (mPa·s)', y2: true, y2l: 'T (°C)', series: ser });
};
OUT.ve = R => {
  const k = S.ve.kind, ser = [], ser2 = [], rr = [];
  if (k === 'freq') {
    const lines = [['السلوك', r => r.char === 'solid' ? 'G′ > G″ في كل المدى (gel-like)' : r.char === 'liquid' ? 'G″ > G′ في كل المدى (liquid-like)' : 'يوجد تقاطع'],
      ['ω<sub>c</sub> التقاطع (rad/s)', r => r.wc ? fm(r.wc) : '—'], ['G عند التقاطع (Pa)', r => r.Gc ? fm(r.Gc) : '—'], ['λ = 1/ω<sub>c</sub> (s)', r => r.lambdaC ? fm(r.lambdaC) : r.char === 'solid' ? `> ${fm(1 / r.x[0])}` : r.char === 'liquid' ? `< ${fm(1 / r.x[r.x.length - 1])}` : '—'],
      ...[0.1, 1, 10].flatMap((wv, i) => [[`G′ / G″ @ ${wv} rad/s (Pa)`, r => `${fm(r.at[i].G1)} / ${fm(r.at[i].G2)}`], [`tan δ @ ${wv} rad/s`, r => fm(r.at[i].tand)]]), ['|η*| @ 1 rad/s (Pa·s)', r => fm(r.at[1].etaStar)],
      ['ميل G′ ، G″ عند ω منخفض', r => `${fm(r.slopeG1, 3)} ، ${fm(r.slopeG2, 3)}`], ['Maxwell: G (Pa) ± CI', r => r.maxwell ? pm(r.maxwell.G, r.maxwell.ci[0]) : '—'], ['Maxwell: λ (s) ± CI', r => r.maxwell ? pm(r.maxwell.lambda, r.maxwell.ci[1]) : '—'], ['Maxwell: R² (log) ، MAPE %', r => r.maxwell ? `${fm(r.maxwell.r2, 4)} ، ${fm(r.maxwell.mape, 3)}` : '—']];
    for (const [l, f] of lines) rr.push(tr([l, ...WHO.map(w => R.ve[w].freq ? f(R.ve[w].freq) : '—')]));
    for (const w of WHO) { const r = R.ve[w].freq; if (!r) continue;
      ser.push({ x: r.x, y: r.G1, c: COL[w], mode: 'pl', label: `${nm(w)}: G′` }, { x: r.x, y: r.G2, c: COL[w], mode: 'pl', open: true, dash: true, label: `${nm(w)}: G″` });
      if (r.maxwell) { const ww = logspace(r.x[0], r.x[r.x.length - 1], 60); ser.push({ x: ww, y: ww.map(v => r.maxwell.fn(v, 0)), c: '#2bd66f', mode: 'l', lw: 1, dot: true }, { x: ww, y: ww.map(v => r.maxwell.fn(v, 1)), c: '#2bd66f', mode: 'l', lw: 1, dot: true }); }
      ser2.push({ x: r.x, y: r.tand, c: COL[w], mode: 'pl', label: `${nm(w)}: tan δ` }); }
    $('oVe').innerHTML = card('نتائج Frequency sweep', tbl(['', `<span class="mine">${nm('mine')}</span>`, `<span class="refc">${nm('ref')}</span>`], rr) + '<p class="note">المنقّط الأخضر = مطابقة single-mode Maxwell.</p>');
    plot('cVe', { xlog: true, ylog: true, xl: 'ω (rad/s)', yl: 'G′, G″ (Pa)', series: ser });
  } else {
    const lines = [['هضبة G′ في الـ LVE (Pa)', r => fm(r.plateau)], ['tan δ في الـ LVE', r => fm(r.tandLVE)], [`نهاية الـ LVE (انخفاض ${fm(num(S.ve.tol))} %)`, r => r.lve ? fm(r.lve) : 'لم تُبلغ'], ['نقطة التدفق G′ = G″', r => r.flow ? fm(r.flow) : 'لا تقاطع'], ['G عند نقطة التدفق (Pa)', r => r.flowG ? fm(r.flowG) : '—']];
    for (const [l, f] of lines) rr.push(tr([l, ...WHO.map(w => R.ve[w].amp ? f(R.ve[w].amp) : '—')]));
    for (const w of WHO) { const r = R.ve[w].amp; if (!r) continue;
      ser.push({ x: r.x, y: r.G1, c: COL[w], mode: 'pl', label: `${nm(w)}: G′` }, { x: r.x, y: r.G2, c: COL[w], mode: 'pl', open: true, dash: true, label: `${nm(w)}: G″` });
      ser2.push({ x: r.x, y: r.tand, c: COL[w], mode: 'pl', label: `${nm(w)}: tan δ` }); }
    $('oVe').innerHTML = card('نتائج Amplitude sweep', tbl(['', `<span class="mine">${nm('mine')}</span>`, `<span class="refc">${nm('ref')}</span>`], rr) + '<p class="note">الوحدة هي وحدة المحور الأفقي المُدخل (strain % أو τ Pa).</p>');
    plot('cVe', { xlog: true, ylog: true, xl: 'γ (%) / τ (Pa)', yl: 'G′, G″ (Pa)', series: ser });
  }
  plot('cTd', { xlog: true, ylog: true, xl: k === 'freq' ? 'ω (rad/s)' : 'γ (%) / τ (Pa)', yl: 'tan δ', series: ser2.concat(ser2.length ? [{ x: ser2.flatMap(s => s.x).sort((a, b) => a - b).filter((v, i, a) => i === 0 || i === a.length - 1), y: [1, 1], c: '#ff4545', mode: 'l', dot: true, lw: 1, label: 'tan δ = 1' }] : []) });
};
OUT.prop = R => {
  const rr = [], ser = [], warns = [];
  const lines = [['نموذج الريولوجيا', r => r.fluid.manual ? MN[r.fluid.model] + ' (Parameters)' : MN[r.fluid.model]], ['<b>سرعة الترسيب v (mm/s)</b>', r => `<b>${fm(r.v * 1000)}</b>`], ['Re الجسيم', r => fm(r.Re, 3)], ['C<sub>D</sub>', r => fm(r.Cd, 4)],
    ['γ̇ المميِّز = v/d (1/s)', r => fm(r.gd, 3)], ['اللزوجة الظاهرية عنده (mPa·s)', r => fm(r.mu * 1000)], ['Stokes power-law (mm/s)', r => r.vStokes ? fm(r.vStokes * 1000) : '—'],
    ['φ (%)', r => fm(r.phi * 100, 3)], ['أُس Richardson-Zaki m', r => fm(r.m, 3)], ['<b>الترسيب المعاق v<sub>h</sub> (mm/s)</b>', r => `<b>${fm(r.vh * 1000)}</b>`],
    [`مسافة الترسيب خلال ${fm(num(S.prop.tpump))} min (m)`, r => fm(r.dist)], [`زمن سقوط ${fm(num(S.prop.H))} m (min)`, r => fm(r.tH)], ['Y = τ₀/(gΔρd)', r => r.Y ? fm(r.Y, 3) : '—'],
    ['المقاسة (mm/s) ، المقاسة ÷ المحسوبة', r => r.vmeas ? `${fm(r.vmeas * 1000)} ، ${fm(r.vmeas / r.v, 3)}` : '—']];
  for (const [l, f] of lines) rr.push(tr([l, ...WHO.map(w => R.prop[w] ? f(R.prop[w]) : '—')]));
  for (const w of WHO) { const r = R.prop[w]; if (!r) continue;
    ser.push({ x: r.curve.map(p => p[0]), y: r.curve.map(p => p[1]), c: COL[w], mode: 'l', dash: w === 'ref', label: nm(w) });
    if (r.vmeas) ser.push({ x: [S.prop.mesh === 'custom' ? num(S.prop.dmm) : FL.MESH[S.prop.mesh]], y: [r.vmeas * 1000], c: COL[w], mode: 'p', sq: true, label: `${nm(w)}: مقاسة` });
    const rh = R.rheo[w]; if (rh && rh.d && r.gd < rh.d.gd[0]) warns.push(`${nm(w)}: معدل القص المميِّز (${fm(r.gd, 2)} s⁻¹) أقل من أدنى معدل مقاس (${fm(rh.d.gd[0], 2)} s⁻¹)، فالنتيجة استقراء. ${r.fluid.model === 'PL' ? 'نموذج Power-law يبالغ في اللزوجة عند القص المنخفض، فيقلّل سرعة الترسيب. جرّب Carreau.' : ''}`);
    if (r.Re > 1) warns.push(`${nm(w)}: Re = ${fm(r.Re, 3)} > 1، أي خارج الجريان الزاحف. الـ drag محسوب بمنحنى Schiller-Naumann مع اللزوجة الظاهرية، وهذا تقريب.`);
    if (r.fluid.model === 'HB' && r.Y) warns.push(`${nm(w)}: مع yield stress قد تبقى الحبيبة معلّقة إن تجاوز Y قيمة حرجة (≈ 0.04 إلى 0.2 في الأدبيات حسب التعريف). الحساب هنا يفترض أنها تتحرك.`); }
  $('oProp').innerHTML = card('النتائج', tbl(['', `<span class="mine">${nm('mine')}</span>`, `<span class="refc">${nm('ref')}</span>`], rr) + warns.map(t => wn(t)).join('') +
    `<p class="note">القطر المستخدم: ${fm(S.prop.mesh === 'custom' ? num(S.prop.dmm) : FL.MESH[S.prop.mesh])} mm. الحساب لا يشمل المرونة، ولا القص الناتج عن جريان المائع في الكسر، ولا أثر الجدار.</p>`);
  plot('cProp', { ylog: true, xl: 'd (mm)', yl: 'v (mm/s)', series: ser, zero: false });
};
OUT.brk = R => {
  const rr = [], ser = [];
  const lines = [['η الابتدائية / النهائية (mPa·s)', b => b.b ? `${fm(b.b.eta0)} / ${fm(b.b.etaEnd)}` : '—'], ['الانخفاض %', b => b.b ? fm(b.b.reduction, 3) : '—'],
    ['First-order: k (1/min) ± CI', b => b.b && b.b.first ? pm(b.b.first.k, b.b.first.ciK) : '—'], ['First-order: t½ (min) ، R²', b => b.b && b.b.first ? `${fm(b.b.first.half)} ، ${fm(b.b.first.r2, 4)}` : '—'],
    ['مع هضبة: k (1/min) ± CI', b => b.b && b.b.plateau ? pm(b.b.plateau.k, b.b.plateau.ci[1]) : '—'], ['مع هضبة: η∞ (mPa·s) ± CI', b => b.b && b.b.plateau ? pm(b.b.plateau.etaInf, b.b.plateau.ci[2]) : '—'],
    ['مع هضبة: t½ (min) ، R² (log)', b => b.b && b.b.plateau ? `${fm(b.b.plateau.half)} ، ${fm(b.b.plateau.r2, 4)}` : '—'],
    [`<b>زمن الوصول إلى ≤ ${fm(num(S.brk.crit))} mPa·s (min)</b>: من البيانات`, b => b.b ? (b.b.tBreak === null || b.b.tBreak === undefined ? '<b>لم يُبلغ</b>' : `<b>${fm(b.b.tBreak)}</b>`) : '—'], ['… من نموذج الهضبة', b => b.b && b.b.tBreakModel ? fm(b.b.tBreakModel) : '—'],
    ['<b>Residue (mg/L) ± SD</b>', b => b.res && !b.res.err ? `<b>${pm(b.res.mgL, null)}</b>${ok(b.res.sdMgL) ? ' ± ' + fm(b.res.sdMgL, 2) : ''} (n=${b.res.reps.length})` : '—'],
    ['Residue % من كتلة البوليمر ± SD', b => b.res && !b.res.err && b.res.pct !== null ? fm(b.res.pct) + (ok(b.res.sdPct) ? ' ± ' + fm(b.res.sdPct, 2) : '') : '—'],
    ['E<sub>a</sub> للكسر (kJ/mol) ± CI', b => b.arr ? pm(b.arr.Ea, b.arr.ciEa) + ` (n=${b.arr.n})` : '—']];
  for (const [l, f] of lines) rr.push(tr([l, ...WHO.map(w => f(R.brk[w]))]));
  for (const w of WHO) { const b = R.brk[w].b; if (!b) continue; const tt = Array.from({ length: 60 }, (_, i) => b.t[b.t.length - 1] * i / 59);
    ser.push({ x: b.t, y: b.eta, c: COL[w], mode: 'p', open: w === 'ref', label: nm(w) });
    if (b.plateau) ser.push({ x: tt, y: tt.map(b.plateau.fn), c: COL[w], mode: 'l', dash: w === 'ref', label: `${nm(w)}: first-order + هضبة` });
    if (b.first) ser.push({ x: tt, y: tt.map(b.first.fn), c: '#2bd66f', mode: 'l', dot: true, lw: 1 }); }
  if (num(S.brk.crit) > 0 && ser.length) { const all = ser.flatMap(s => s.x); ser.push({ x: [Math.min(...all), Math.max(...all)], y: [num(S.brk.crit), num(S.brk.crit)], c: '#ff4545', mode: 'l', dot: true, lw: 1, label: 'معيار الكسر' }); }
  $('oBrk').innerHTML = card('النتائج', tbl(['', `<span class="mine">${nm('mine')}</span>`, `<span class="refc">${nm('ref')}</span>`], rr) + '<p class="note">المنقّط الأخضر = first-order البسيط (ln η خطي مع t).</p>');
  plot('cBrk', { ylog: true, xl: 't (min)', yl: 'η (mPa·s)', series: ser, zero: false });
};
OUT.frac = R => {
  const rr = [], warns = [];
  const head = ['', ...['PKN', 'KGD'].flatMap(m => WHO.map(w => `${m}<br><span class="${w === 'mine' ? 'mine' : 'refc'}">${nm(w)}</span>`))];
  const lines = [['K (Pa·sⁿ) ، n المستخدمة', (f) => `${fm(f.o.K)} ، ${fm(f.o.n, 3)}`], ['C<sub>L</sub> (m/√min) ، S<sub>p</sub> (L/m²)', f => `${fm(f.o.CL * Math.sqrt(60))} ، ${fm(f.o.Sp * 1000, 3)}`],
    ['<b>نصف الطول x<sub>f</sub> (m)</b>', (f, m) => `<b>${fm(f[m].L)}</b>`], ['العرض عند البئر w<sub>w</sub> (mm)', (f, m) => fm(f[m].ww * 1000)], ['<b>العرض المتوسط w̄ (mm)</b>', (f, m) => `<b>${fm(f[m].wb * 1000)}</b>`],
    ['<b>كفاءة المائع η (%)</b>', (f, m) => `<b>${fm(f[m].eff * 100, 3)}</b>`], ['الضغط الصافي p<sub>net</sub> (MPa / psi)', (f, m) => `${fm(f[m].pnet / 1e6, 3)} / ${fm(f[m].pnet / 6894.757, 4)}`],
    ['اللزوجة المكافئة μ<sub>e</sub> (mPa·s)', (f, m) => fm(f[m].mu * 1000)], ['معدل القص في الكسر (1/s)', (f, m) => fm(f[m].gd, 3)], ['حجم الكسر / المضخوخ (m³)', (f, m) => `${fm(f[m].Vf, 3)} / ${fm(f[m].Vi, 3)}`], ['x<sub>f</sub>/h', (f, m) => fm(f[m].L / f.o.h, 3)]];
  for (const [l, fn] of lines) rr.push(tr([l, ...['PKN', 'KGD'].flatMap(m => WHO.map(w => { const f = R.frac[w]; return f && f.o ? fn(f, m) : '—'; }))]));
  for (const w of WHO) { const f = R.frac[w];
    if (!f) warns.push(`${nm(w)}: لا توجد ريولوجيا Power-law. أدخل بيانات أو Parameters في تبويب الريولوجيا.`);
    else if (f.err === 'fl') warns.push(`${nm(w)}: بيانات الـ fluid loss غير كافية (نقطتان على الأقل ومساحة الترشيح).`);
    else if (f.err === 'job') warns.push('بيانات العملية ناقصة أو غير صالحة (ν يجب أن تكون أقل من 0.5).');
    else { if (f.pl.manual && S.rheo[w].tau0 > 0) warns.push(`${nm(w)}: τ₀ تُهمَل هنا، فنماذج الكسر تستخدم Power-law فقط.`);
      ['PKN', 'KGD'].forEach(m => { if (!f[m].conv) warns.push(`${nm(w)} ${m}: لم يتقارب الحل تماماً.`); }); } }
  const fm0 = R.frac.mine && R.frac.mine.o ? R.frac.mine : R.frac.ref && R.frac.ref.o ? R.frac.ref : null;
  if (fm0) { const r = fm0.PKN.L / fm0.o.h; warns.push(r > 1.5 ? `x<sub>f</sub>/h ≈ ${fm(r, 2)} > 1، فالـ PKN هو الأنسب لهذه الحالة.` : `x<sub>f</sub>/h ≈ ${fm(r, 2)}، فالـ KGD أقرب للواقع هنا.`); }
  $('oFrac').innerHTML = card('النتائج عند نهاية الضخ', tbl(head, rr) + warns.map(t => wn(t, t.includes('الأنسب') || t.includes('أقرب') ? 'i' : 'a')).join(''));
  const s1 = [], s2 = [];
  for (const w of WHO) { const f = R.frac[w]; if (!f || !f.o) continue;
    for (const [m, dash] of [['PKN', false], ['KGD', true]]) { const s = f['s' + m], t = s.map((_, i) => num(S.frac.t) * (i + 1) / s.length);
      s1.push({ x: t, y: s.map(v => v.L), c: COL[w], mode: 'l', dash, label: `${nm(w)} ${m}` }); s2.push({ x: t, y: s.map(v => v.wb * 1000), c: COL[w], mode: 'l', dash, label: `${nm(w)} ${m}` }); } }
  plot('cFl', { xl: 't (min)', yl: 'x_f (m)', series: s1 }); plot('cFw', { xl: 't (min)', yl: 'w̄ (mm)', series: s2 });
  const fx = WHO.map(w => R.frac[w] && R.frac[w].flr);
  const flRows = [['C<sub>w</sub> (cm/√min) ± CI', x => pm(x.Cw, x.ciCw)], ['C<sub>w</sub> (m/√min)', x => fm(x.CwSI)], ['C<sub>w</sub> (ft/√min)', x => fm(x.Cw * 0.0328084)],
    ['S<sub>p</sub> (L/m²)', x => fm(x.Sp * 10, 3) + (x.SpRaw < 0 ? ' (تقاطع سالب ← 0)' : '')], ['S<sub>p</sub> (gal/100 ft²)', x => fm(x.Sp * 24.5424, 3)], ['R²', x => fm(x.r2, 4)], ['عدد النقاط', x => x.n]];
  $('oFl').innerHTML = fx.some(Boolean) ? card('اختبار الـ fluid loss <span class="ltr">V/A = S<sub>p</sub> + 2·C<sub>w</sub>·√t</span>', tbl(['', `<span class="mine">${nm('mine')}</span>`, `<span class="refc">${nm('ref')}</span>`], flRows.map(([l, f]) => tr([l, ...fx.map(x => x ? f(x) : '—')]))) +
    '<p class="note">C<sub>w</sub> هو معامل الـ wall-building فقط. الـ C<sub>L</sub> الكلي في المكمن يجمعه مع C<sub>v</sub> و C<sub>c</sub>.</p>') : '';
};
OUT.surf = R => {
  const su = S.surf, rg = FL.ringZW(num(su.ring.P), num(su.ring.R), num(su.ring.r), num(su.ring.drho));
  $('oRing').innerHTML = num(su.ring.P) > 0 ? (rg ? `معامل التصحيح f = <b class="ltr">${fm(rg.f)}</b> ← γ = <b class="ltr">${fm(rg.gamma)}</b> mN/m` : 'المدخلات خارج مجال معادلة Zuidema-Waters.') : '';
  const pf = num(su.plate.F); $('oPlate').innerHTML = pf > 0 ? `γ = <b class="ltr">${fm(FL.plate(pf, num(su.plate.w), num(su.plate.t), num(su.plate.theta)))}</b> mN/m` : '';
  const sd = num(su.spin.d); if (sd > 0) { const s = FL.spinning(sd, num(su.spin.rpm), num(su.spin.drho), num(su.spin.nref) || 1, num(su.spin.L)); $('oSpin').innerHTML = `IFT = <b class="ltr">${fm(s.gamma)}</b> mN/m${s.LD ? ` ، L/D = ${fm(s.LD, 3)}${s.LD < 4 ? ' <span style="color:var(--amber)">(أقل من 4، فمعادلة Vonnegut غير دقيقة)</span>' : ''}` : ''}`; } else $('oSpin').innerHTML = '';
  const cu = { mM: 'mM', M: 'mol/L', gL: 'g/L', wt: 'wt%' }[su.cunit], rr = [], ser = [], ser2 = [];
  const lines = [[`<b>CMC (${cu})</b>`, s => s.cmc && !s.cmc.err ? `<b>${fm(s.cmc.cmc)}</b>` : s.cmc ? s.cmc.err : '—'], ['γ<sub>CMC</sub> (mN/m)', s => s.cmc && !s.cmc.err ? fm(s.cmc.gcmc) : '—'], ['Π<sub>CMC</sub> = γ₀ − γ<sub>CMC</sub>', s => s.cmc && !s.cmc.err ? fm(s.cmc.pi) : '—'],
    ['ميل ما قبل الـ CMC dγ/dlnC (mN/m) ± CI', s => s.cmc && !s.cmc.err ? pm(s.cmc.pre.b, s.cmc.pre.ciB) : '—'], ['Γ<sub>max</sub> (µmol/m²)', s => s.cmc && !s.cmc.err ? fm(s.cmc.Gamma * 1e6) : '—'], ['A<sub>min</sub> (nm²/جزيء)', s => s.cmc && !s.cmc.err ? fm(s.cmc.Amin) : '—'],
    [`C20 (${cu}) ، pC20`, s => s.cmc && !s.cmc.err && s.cmc.C20 ? `${fm(s.cmc.C20)} ، ${s.cmc.pC20 ? fm(s.cmc.pC20, 3) : '—'}` : '—'], ['CMC/C20', s => s.cmc && s.cmc.ratio ? fm(s.cmc.ratio, 3) : '—'],
    ['نقاط قبل / بعد الانكسار', s => s.cmc && !s.cmc.err ? `${s.cmc.k} / ${s.cmc.C.length - s.cmc.k}` : '—'],
    ['<b>أقل IFT (mN/m)</b>', s => s.ift && !s.ift.err ? `<b>${fm(s.ift.min, 3)}</b>` : '—'], [`عند ${esc(su.iftx)}`, s => s.ift && !s.ift.err ? fm(s.ift.xmin) : '—'], ['التصنيف', s => s.ift && !s.ift.err ? ({ ultralow: 'ultralow (< 10⁻² mN/m)', low: 'منخفض (< 1)', normal: 'عادي' })[s.ift.cls] : '—']];
  for (const [l, f] of lines) rr.push(tr([l, ...WHO.map(w => f(R.surf[w]))]));
  for (const w of WHO) { const s = R.surf[w];
    if (s.cmc && !s.cmc.err) { const c = s.cmc, x1 = logspace(c.C[0], c.cmc, 20), x2 = logspace(c.cmc, c.C[c.C.length - 1], 10);
      ser.push({ x: c.C, y: c.y, c: COL[w], mode: 'p', open: w === 'ref', label: nm(w) }, { x: x1, y: x1.map(v => c.pre.f(Math.log(v))), c: COL[w], mode: 'l', dash: w === 'ref', lw: 1.2 }, { x: x2, y: x2.map(v => c.post.f(Math.log(v))), c: COL[w], mode: 'l', dash: w === 'ref', lw: 1.2 }); }
    if (s.ift && !s.ift.err) ser2.push({ x: s.ift.x, y: s.ift.y, c: COL[w], mode: 'pl', open: w === 'ref', label: nm(w) }); }
  $('oSurf').innerHTML = card('النتائج', tbl(['', `<span class="mine">${nm('mine')}</span>`, `<span class="refc">${nm('ref')}</span>`], rr) + `<p class="note">Gibbs بـ n = ${su.nG} عند ${fm(num(su.T))} °C. pC20 يحتاج وحدة مولية، أو الكتلة المولية مع g/L و wt%.</p>`);
  plot('cCmc', { xlog: true, xl: `C (${cu})`, yl: 'γ (mN/m)', series: ser, zero: false }); plot('cIft', { ylog: true, xl: esc(su.iftx), yl: 'IFT (mN/m)', series: ser2, zero: false });
};
/* ---------------- comparison ---------------- */
const CMP = [
  ['الريولوجيا', [['rheo_n', 'n (Power-law)', '', R => w => { const p = plOf(R, w); return p && p.n; }], ['rheo_K', 'K (Power-law)', 'Pa·sⁿ', R => w => { const p = plOf(R, w); return p && p.K; }],
    ['rheo_e100', 'η @ 100 s⁻¹', 'mPa·s', R => w => { const f = fluidOf(R, w, 'best'); return f && f.etaAt[1] * 1000; }], ['rheo_e170', 'η @ 170 s⁻¹', 'mPa·s', R => w => { const f = fluidOf(R, w, 'best'); return f && f.etaAt[2] * 1000; }],
    ['rheo_eta0', 'η₀ (Carreau)', 'Pa·s', R => w => { const r = R.rheo[w]; return r && r.fits && r.fits.CA && r.fits.CA.eta0; }], ['rheo_tau0', 'τ₀ (HB)', 'Pa', R => w => { const r = R.rheo[w]; return r && r.fits ? r.fits.HB && r.fits.HB.tau0 : r && r.manual && r.manual.p.tau0; }]]],
  ['الثبات الحراري', [['th_ret', 'نسبة الاحتفاظ', '%', R => w => R.thermal[w] && R.thermal[w].retention], ['th_end', 'η النهائية', 'mPa·s', R => w => R.thermal[w] && R.thermal[w].etaEnd], ['th_k', 'k خلال الـ hold', '1/min', R => w => R.thermal[w] && R.thermal[w].hold && R.thermal[w].hold.k], ['th_thr', 'زمن الهبوط تحت العتبة', 'min', R => w => R.thermal[w] && R.thermal[w].tThr]]],
  ['اللزوجة المرنة', [['ve_G1', 'G′ @ 1 rad/s', 'Pa', R => w => R.ve[w].freq && R.ve[w].freq.at[1].G1], ['ve_G2', 'G″ @ 1 rad/s', 'Pa', R => w => R.ve[w].freq && R.ve[w].freq.at[1].G2], ['ve_td', 'tan δ @ 1 rad/s', '', R => w => R.ve[w].freq && R.ve[w].freq.at[1].tand],
    ['ve_wc', 'ω<sub>c</sub> التقاطع', 'rad/s', R => w => R.ve[w].freq && R.ve[w].freq.wc], ['ve_lam', 'λ = 1/ω<sub>c</sub>', 's', R => w => R.ve[w].freq && R.ve[w].freq.lambdaC], ['ve_lve', 'نهاية الـ LVE', '', R => w => R.ve[w].amp && R.ve[w].amp.lve], ['ve_fp', 'نقطة التدفق', '', R => w => R.ve[w].amp && R.ve[w].amp.flow]]],
  ['الـ proppant', [['pr_v', 'سرعة الترسيب', 'mm/s', R => w => R.prop[w] && R.prop[w].v * 1000], ['pr_vh', 'الترسيب المعاق', 'mm/s', R => w => R.prop[w] && R.prop[w].vh * 1000], ['pr_vm', 'السرعة المقاسة', 'mm/s', R => w => R.prop[w] && R.prop[w].vmeas && R.prop[w].vmeas * 1000]]],
  ['الـ breaker', [['bk_k', 'k (مع هضبة)', '1/min', R => w => R.brk[w].b && R.brk[w].b.plateau && R.brk[w].b.plateau.k], ['bk_t', 'زمن الكسر', 'min', R => w => R.brk[w].b && R.brk[w].b.tBreak], ['bk_red', 'الانخفاض', '%', R => w => R.brk[w].b && R.brk[w].b.reduction],
    ['bk_res', 'Residue', 'mg/L', R => w => R.brk[w].res && R.brk[w].res.mgL], ['bk_rp', 'Residue من البوليمر', '%', R => w => R.brk[w].res && R.brk[w].res.pct]]],
  ['الكسر (بيانات العملية نفسها)', [['fr_pl', 'PKN x<sub>f</sub>', 'm', R => w => R.frac[w] && R.frac[w].PKN && R.frac[w].PKN.L], ['fr_pw', 'PKN w̄', 'mm', R => w => R.frac[w] && R.frac[w].PKN && R.frac[w].PKN.wb * 1000], ['fr_pe', 'PKN كفاءة', '%', R => w => R.frac[w] && R.frac[w].PKN && R.frac[w].PKN.eff * 100],
    ['fr_kl', 'KGD x<sub>f</sub>', 'm', R => w => R.frac[w] && R.frac[w].KGD && R.frac[w].KGD.L], ['fr_kw', 'KGD w̄', 'mm', R => w => R.frac[w] && R.frac[w].KGD && R.frac[w].KGD.wb * 1000], ['fr_ke', 'KGD كفاءة', '%', R => w => R.frac[w] && R.frac[w].KGD && R.frac[w].KGD.eff * 100]]],
  ['Surface / IFT', [['sf_cmc', 'CMC', 'وحدة الإدخال', R => w => R.surf[w].cmc && R.surf[w].cmc.cmc], ['sf_g', 'γ<sub>CMC</sub>', 'mN/m', R => w => R.surf[w].cmc && R.surf[w].cmc.gcmc], ['sf_G', 'Γ<sub>max</sub>', 'µmol/m²', R => w => R.surf[w].cmc && R.surf[w].cmc.Gamma && R.surf[w].cmc.Gamma * 1e6],
    ['sf_A', 'A<sub>min</sub>', 'nm²', R => w => R.surf[w].cmc && R.surf[w].cmc.Amin], ['sf_ift', 'أقل IFT', 'mN/m', R => w => R.surf[w].ift && R.surf[w].ift.min]]],
];
function cmpRows(R) {
  const out = [];
  for (const [g, items] of CMP) for (const [k, l, u, f] of items) {
    const v = f(R), a = v('mine'), b = v('ref'), man = num(S.cmp.manual[k]), p = ok(man) ? man : b;
    out.push({ g, k, l, u, mine: ok(a) ? a : null, ref: ok(b) ? b : null, man: ok(man) ? man : null, d: ok(a) && ok(p) && p !== 0 ? 100 * (a - p) / Math.abs(p) : null });
  }
  return out;
}
OUT.cmp = R => {
  const rs = cmpRows(R); let g = '', h = [];
  for (const r of rs) { if (r.g !== g) { g = r.g; h.push(`<tr class="grp"><td colspan="6">${g}</td></tr>`); }
    h.push(tr([`${r.l}${r.u ? ` <small class="note">(${r.u})</small>` : ''}`, fm(r.mine), fm(r.ref), `<input type="number" step="any" data-k="cmp.manual.${r.k}" value="${r.man === null ? '' : r.man}">`, r.d === null ? '—' : `${r.d > 0 ? '+' : ''}${fm(r.d, 3)} %`])); }
  $('oCmp').innerHTML = tbl(['المؤشر', `<span class="mine">${nm('mine')}</span>`, `<span class="refc">${nm('ref')}</span> (محسوب)`, 'قيمة البحث (يدوي)', 'الفرق (عيّنتي − البحث)'], h) +
    (S.meta.cite ? `<p class="note">المرجع: ${esc(S.meta.cite)}</p>` : '') + '<p class="note">الفرق % = (عيّنتي − البحث) ÷ |البحث| × 100. القيمة اليدوية تُقدَّم على المحسوبة.</p>';
  $('csvBtn').onclick = () => { const q = s => `"${String(s).replace(/<[^>]+>/g, '').replace(/"/g, '""')}"`;
    const lines = [['group', 'metric', 'unit', S.meta.mine, S.meta.ref + ' (computed)', 'paper (manual)', 'diff %'].map(q).join(',')].concat(rs.map(r => [r.g, r.l, r.u, r.mine ?? '', r.ref ?? '', r.man ?? '', r.d === null ? '' : r.d.toFixed(2)].map(q).join(',')));
    const b = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'frac-lab-comparison.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
};
OUT.ref = () => {};

/* ---------------- control ---------------- */
function renderTab() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  $('main').innerHTML = TAB[S.tab](); calc();
}
let timer = null;
function calc() { clearTimeout(timer); timer = null; try { OUT[S.tab](compute()); } catch (e) { console.error(e); toast('خطأ في الحساب: ' + e.message); } }
function schedule() { save(); clearTimeout(timer); timer = setTimeout(calc, 250); }
function onInput(e) {
  const el = e.target.closest('[data-k]'); if (!el) return;
  const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
  set(el.dataset.k, v);
  if (el.dataset.k.startsWith('cmp.manual.') && e.type === 'input') { save(); return; }
  if (el.dataset.k === 'prop.mesh' && FL.MESH[v]) S.prop.dmm = FL.MESH[v];
  if (el.dataset.rr) { save(); renderTab(); } else schedule();
}
function loadExample() {
  const e = FL.makeExample(), st = clone(DEF); st.tab = S.tab;
  st.meta.mine = 'مثال: جل guar (بيانات مصطنعة)'; st.meta.ref = 'المرجع (أدخل بيانات البحث)';
  st.rheo.mine.text = e.rheo; st.thermal.mine.text = e.thermal; st.ve.mine.freq = e.ve; st.ve.mine.amp = e.amp;
  Object.assign(st.brk.mine, { text: e.brk, res: e.res, arr: e.arr }); Object.assign(st.frac.mine, { clsrc: 'test', fl: e.fl }); Object.assign(st.surf.mine, { cmc: e.cmc, ift: e.ift });
  st.surf.ring.P = 75; st.surf.spin.d = 0.35; st.surf.spin.L = 2.4;
  S = st; save(); renderTab(); toast('حُمّلت بيانات مثال مصطنعة (synthetic) لعيّنتك فقط. بطاقات المرجع فارغة لبيانات البحث.');
}
function bind() {
  $('main').addEventListener('input', onInput); $('main').addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.k; if (k && k.startsWith('cmp.manual.')) onInput(e); });
  $('main').addEventListener('toggle', e => { const d = e.target.closest && e.target.closest('details.proto'); if (d) { S.proto[d.dataset.proto] = d.open; save(); } }, true);
  $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { S.tab = b.dataset.tab; save(); renderTab(); } });
  $('exBtn').onclick = () => { if (confirm('تحميل المثال يستبدل بياناتك الحالية. هل صدّرت نسخة JSON؟ متابعة؟')) loadExample(); };
  $('clrBtn').onclick = () => { if (confirm('مسح كل البيانات والبدء من جديد؟')) { S = clone(DEF); save(); renderTab(); } };
  $('expBtn').onclick = () => { const b = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'frac-lab-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  $('impFile').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { const o = JSON.parse(t); if (!o.rheo || !o.meta) throw new Error('format'); S = merge(clone(DEF), o); save(); renderTab(); toast('استُوردت البيانات.'); }).catch(() => toast('تعذّرت قراءة الملف (المتوقع ملف JSON مُصدَّر من هذه الأداة).')); e.target.value = ''; });
  $('prtBtn').onclick = () => window.print();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(calc, 150); });
}
bind(); renderTab();
window.__fraclab = { state: () => S, compute };
})();

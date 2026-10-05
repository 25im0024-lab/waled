/* ===== UI ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const num = id => parseFloat(document.getElementById(id).value);
const setv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
const fmt = (x, d = 0) => (typeof x === 'number' && isFinite(x)) ? x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const F = (id, label, val, unit = '', o = {}) => `<label class="f" for="${id}"><span class="fl">${label}</span><span class="fi"><input id="${id}" type="number" inputmode="decimal" value="${val}" step="${o.step || 'any'}"${o.min != null ? ` min="${o.min}"` : ''}><b>${unit}</b></span></label>`;
const SEL = (id, label, opts, val) => `<label class="f" for="${id}"><span class="fl">${label}</span><span class="fi"><select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${String(v) === String(val) ? ' selected' : ''}>${t}</option>`).join('')}</select></span></label>`;
const KV = (label, val, unit = '', cls = '') => `<div class="kv ${cls}"><small>${label}</small><strong>${val}${unit ? `<i>${unit}</i>` : ''}</strong></div>`;
const MSG = (t, cls = '') => `<div class="msg ${cls}">${t}</div>`;
const BADGE = { e: '<span class="badge b-est">مؤكَّد</span>', i: '<span class="badge b-inf">استنتاج</span>', s: '<span class="badge b-spec">تخمين</span>' };

const RUN = {}; const FILL = {};
function panel(id, title, sub, fields, o = {}) {
  return `<section class="calc" data-calc="${id}"><h3>${title}</h3><p class="sub">${sub || ''}</p>
  <div class="calc-body"><div><div class="fgrid">${fields}</div>
  ${o.fill ? `<div class="btnrow"><button class="btn" type="button" data-fill="${id}">تعبئة من حالة الحقل</button></div>` : ''}</div>
  <div class="out" id="o_${id}"></div></div>${o.after || ''}</section>`;
}

/* ---------- Case (shared inputs) ---------- */
const CASE_FIELDS = [
  ['الموائع', [['c_api', 'API gravity', 32, '°API'], ['c_gg', 'Gas SG (هواء = 1)', 0.75, ''], ['c_gor', 'GOR', 600, 'scf/STB'], ['c_wc', 'Water cut', 30, '%'], ['c_qL', 'السائل الكلي (stock-tank)', 2000, 'bbl/d']]],
  ['المكمن والبئر', [['c_Pr', 'Pr', 3500, 'psia'], ['c_Tres', 'T المكمن', 180, '°F'], ['c_J', 'PI فوق Pb', 2, 'STB/d/psi'], ['c_TVD', 'TVD', 8000, 'ft'], ['c_id', 'Tubing ID', 2.992, 'in']]],
  ['السطح', [['c_Pwh', 'FWHP', 400, 'psig'], ['c_Pchk', 'ضغط بعد الـ choke', 170, 'psig'], ['c_Ps1', 'HP separator', 150, 'psig'], ['c_Ps2', 'LP separator', 25, 'psig'], ['c_Ts', 'T الفاصل', 110, '°F']]]
];
function caseVals() {
  return { api: num('c_api'), gg: num('c_gg'), gor: num('c_gor'), wc: num('c_wc'), qL: num('c_qL'), Pr: num('c_Pr'), Tres: num('c_Tres'), J: num('c_J'), TVD: num('c_TVD'), id: num('c_id'), Pwh: num('c_Pwh'), Pchk: num('c_Pchk'), Psep1: num('c_Ps1'), Psep2: num('c_Ps2'), Ts: num('c_Ts') };
}
function caseHTML() {
  return `<details class="case" id="case" open><summary><b>حالة الحقل (مدخلات مشتركة)</b><span class="sum" id="casesum"></span></summary><div class="case-grid">${CASE_FIELDS.map(([g, fs]) => `<div class="case-grp">${g}</div>` + fs.map(([id, l, v, u]) => F(id, l, v, u)).join('')).join('')}</div></details>`;
}

/* ---------- Charts ---------- */
function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }
function lineChart(o) {
  const W = 640, H = 330, L = 58, R = 16, T = 16, B = 44;
  const xm = o.xmax, ym = o.ymax;
  const X = x => L + (x / xm) * (W - L - R), Y = y => T + (1 - y / ym) * (H - T - B);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria || ''}">`;
  for (let i = 0; i <= 5; i++) {
    const yv = ym * i / 5, xv = xm * i / 5;
    s += `<line class="gridl" x1="${L}" x2="${W - R}" y1="${Y(yv)}" y2="${Y(yv)}"/><text x="${L - 6}" y="${Y(yv) + 4}" text-anchor="end">${fmt(yv, 0)}</text>`;
    s += `<text x="${X(xv)}" y="${H - B + 16}" text-anchor="middle">${fmt(xv, 0)}</text>`;
  }
  s += `<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${H - B}"/>`;
  s += `<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">${o.xlab}</text><text transform="rotate(-90)" x="${-(T + H - B) / 2}" y="13" text-anchor="middle">${o.ylab}</text>`;
  (o.hlines || []).forEach(h => { if (h.y <= ym) s += `<line x1="${L}" x2="${W - R}" y1="${Y(h.y)}" y2="${Y(h.y)}" style="stroke:${h.color};stroke-width:1.2;stroke-dasharray:5 4"/><text x="${W - R - 4}" y="${Y(h.y) - 4}" text-anchor="end" style="fill:${h.color}">${h.label}</text>`; });
  (o.series || []).forEach(se => {
    const pts = se.pts.filter(p => isFinite(p[0]) && isFinite(p[1]) && p[0] <= xm && p[1] <= ym * 1.0001 && p[1] >= 0);
    if (pts.length > 1) s += `<polyline points="${pts.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}" style="fill:none;stroke:${se.color};stroke-width:${se.w || 2.4};${se.dash ? 'stroke-dasharray:6 4;' : ''}stroke-linejoin:round"/>`;
  });
  (o.marks || []).forEach(m => { s += `<circle cx="${X(m.x)}" cy="${Y(m.y)}" r="5.5" style="fill:${m.color || 'var(--ink)'};stroke:var(--bg);stroke-width:2"/><text class="tt" x="${X(m.x) + (m.dx || 10)}" y="${Y(m.y) + (m.dy || -8)}" text-anchor="${m.anchor || 'start'}">${m.label}</text>`; });
  let lx = L + 8;
  (o.series || []).forEach((se, i) => { s += `<line x1="${lx}" x2="${lx + 18}" y1="${T + 8 + i * 15}" y2="${T + 8 + i * 15}" style="stroke:${se.color};stroke-width:2.4;${se.dash ? 'stroke-dasharray:6 4' : ''}"/><text class="tt" x="${lx + 24}" y="${T + 12 + i * 15}">${se.label}</text>`; });
  return s + '</svg>';
}

/* ---------- Stage detail (Map tab) ---------- */
let curStage = 0;
const TABNAMES = { well: 'البئر والـ choke', sep: 'الفصل والمعالجة', gas: 'الغاز والماء', store: 'التخزين والتصدير', trouble: 'أعطال حقلية' };
function stageNode(id) { return $(`#mapsvg .node[data-stage="${id}"]`); }
function selectStage(i) {
  curStage = (i + STAGES.length) % STAGES.length;
  const s = STAGES[curStage];
  $$('#mapsvg .node').forEach(n => n.classList.toggle('sel', n.dataset.stage === s.id));
  $$('.step').forEach((b, k) => b.setAttribute('aria-pressed', k === curStage));
  $('#detail').innerHTML = `<div><h3>${curStage + 1}. ${s.ar}<span class="en">${s.en}</span></h3><div class="lead">${s.what.map(t => `<p>${t}</p>`).join('')}</div>
    <h4>ما يراقبه المشغّل</h4><ul class="tight">${s.watch.map(t => `<li>${t}</li>`).join('')}</ul>
    <h4>أعطال شائعة</h4><ul class="tight">${s.fail.map(t => `<li>${t}</li>`).join('')}</ul>
    <div class="nav"><button class="btn" type="button" id="prevS">السابق</button><button class="btn pri" type="button" id="nextS">المرحلة التالية</button>${s.tab ? `<button class="btn" type="button" data-go="${s.tab}">افتح: ${TABNAMES[s.tab]}</button>` : ''}</div></div>
    <div><h4 style="margin-top:0">ظروف نموذجية</h4><dl class="cond">${s.cond.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <h4>المعدات</h4><ul class="tight">${s.equip.map(t => `<li>${t}</li>`).join('')}</ul></div>`;
}

/* ---------- Tabs ---------- */
const TABS = [['map', 'خريطة الحقل'], ['well', 'البئر والـ choke'], ['sep', 'الفصل والمعالجة'], ['gas', 'الغاز والماء'], ['store', 'التخزين والتصدير'], ['trouble', 'أعطال حقلية'], ['hf', 'التكسير الهيدروليكي'], ['frac', 'من الـ frac إلى السطح'], ['ref', 'مرجع']];
function showTab(id) {
  if (!TABS.some(t => t[0] === id)) id = 'map';
  $$('.pane').forEach(p => p.hidden = p.id !== 'pane-' + id);
  $$('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === id));
  try { history.replaceState(null, '', '#' + id); } catch (e) { }
  window.scrollTo(0, 0);
  if (id === 'hf' && typeof hfUpdateUI === 'function') requestAnimationFrame(() => { hfRefresh(); });
}

/* ---------- Build panes ---------- */
function buildMap() {
  $('#pane-map').innerHTML = `
  <p class="lead">اتبع البرميل من المكمن إلى نقطة التسليم. اضغط أي معدّة في الرسم (أو رقمها بالأسفل). المدخلات في "حالة الحقل" أعلاه تغذي كل الحاسبات في الأدوات الأخرى.</p>
  <div class="steps" id="steps">${STAGES.map((s, i) => `<button type="button" class="step" data-i="${i}" aria-pressed="false"><small>${i + 1}</small>${s.ar.split(' (')[0]}</button>`).join('')}</div>
  ${mapControlsHTML()}
  <div class="mapwrap" style="margin-top:10px">${mapIsoSVG()}</div>
  <div class="legend"><span><i style="border-color:var(--ink)"></i>مائع متعدد الأطوار من البئر</span><span><i style="border-color:var(--oil)"></i>نفط</span><span><i style="border-color:var(--gas)"></i>غاز</span><span><i style="border-color:var(--water)"></i>ماء</span><span>رسم مجسم غير مرسوم بمقياس؛ الأرقام 1–12 هي مراحل الرحلة. جرّب الأزرار أعلاه.</span></div>
  <div class="detail" id="detail" style="margin-top:14px"></div>
  <div class="sec"><h2>ميزان الموائع <small>ماذا يخرج من كل مرحلة بالحالة الحالية</small></h2><div id="o_stream"></div></div>
  <div class="sec"><h2>أين يضيع الضغط؟ <small>من المكمن حتى الخزان</small></h2><div class="twocol"><div id="o_fall"></div><div id="o_fallnote"></div></div></div>`;
}

function buildWell() {
  $('#pane-well').innerHTML = `
  <p class="lead">هنا يتحدد ما يمكن أن ينتجه البئر. المكمن يعطي منحنى IPR، والـ tubing + ضغط رأس البئر يعطيان منحنى VLP، وتقاطعهما هو نقطة التشغيل. الرافعات (gas lift/ESP) تغيّر منحنى VLP لا IPR.</p>
  <div class="sec"><h2>Nodal analysis <small>IPR × VLP</small></h2>
  ${panel('nodal', 'نقطة التشغيل للبئر', 'IPR: Darcy فوق Pb + Vogel (1968) تحت Pb. VLP: نموذج homogeneous مبسط (بدون slip) مع خصائص Standing وPapay-Z. للتصميم الفعلي استخدم Hagedorn–Brown أو Beggs–Brill (1973) في PIPESIM/Prosper.',
    F('n_MD', 'MD (طول الـ tubing)', 8200, 'ft') + F('n_Twh', 'T رأس البئر', 110, '°F') + F('n_eps', 'خشونة', 0.0006, 'in') + F('n_mu', 'لزوجة السائل', 3, 'cP') +
    SEL('n_mode', 'وضع الرفع', [['none', 'تدفق طبيعي'], ['gl', 'Gas lift (حقن غاز)'], ['esp', 'ESP (رفع ضغط عند عمق)']], 'none') +
    F('n_glr', 'غاز الحقن', 400, 'scf/bbl سائل') + F('n_zinj', 'عمق نقطة الحقن', 6000, 'ft') + F('n_dpp', 'ΔP للمضخة', 800, 'psi') + F('n_zp', 'عمق المضخة', 7500, 'ft'))}
  <div class="note warn">القيود: no-slip homogeneous يقلل الـ hydrostatic عند المعدلات المنخفضة (slip يزيد كثافة الخليط الحقيقية). استخدمه لفهم الاتجاهات فقط وليس لتصميم completion. ${BADGE.e} الصيغ المستخدمة هي الصيغ المنشورة؛ ${BADGE.i} دقتها كأداة تصميم محدودة.</div></div>
  <div class="sec"><h2>Choke <small>تدفق حرج</small></h2>
  ${panel('choke', 'حجم الـ choke وضغط رأس البئر', 'أربع علاقات تجريبية (Gilbert, Ros, Baxendell, Achong) من الشكل P = A·R^B·q / S^C. الفروق بينها هي درس بحد ذاتها: كلها ±20–30%، وتُعايَر محلياً بقياسات الحقل.',
    F('k_q', 'السائل الكلي', 2000, 'STB/d') + F('k_R', 'GLR (على السائل الكلي)', 420, 'scf/STB') + F('k_S', 'حجم الـ choke', 28, '/64 in') + F('k_pt', 'FWHP المستهدف', 400, 'psig') + F('k_pd', 'ضغط downstream', 170, 'psig'), { fill: true })}</div>
  <div class="sec"><h2>Artificial lift <small>فرز أولي</small></h2>
  ${panel('al', 'اختيار طريقة الرفع', 'تقييم قاعدي يستند إلى نطاقات تشغيل شائعة (راجع Clegg وآخرين 1993). الغرض: ترتيب الخيارات واستبعاد الواضح منها قبل دراسة الاقتصاد والتصميم.',
    F('a_d', 'عمق المضخة/الحقن', 8000, 'ft') + F('a_q', 'المعدل المستهدف', 1200, 'bbl/d') + F('a_wc', 'Water cut', 30, '%') + F('a_gor', 'GOR', 600, 'scf/STB') + F('a_mu', 'لزوجة النفط', 5, 'cP') + F('a_T', 'درجة حرارة القاع', 180, '°F') +
    SEL('a_sand', 'الرمل', [[0, 'لا يوجد'], [1, 'قليل'], [2, 'كثير']], 0) + SEL('a_h2s', 'H₂S', [[0, 'لا'], [1, 'نعم']], 0) + SEL('a_dev', 'مسار البئر', [[0, 'عمودي'], [1, 'مائل (deviated)'], [2, 'أفقي (horizontal)']], 0) +
    SEL('a_gas', 'غاز متاح للحقن', [[1, 'نعم'], [0, 'لا']], 1) + SEL('a_pw', 'كهرباء متاحة', [[1, 'نعم'], [0, 'لا']], 1), { fill: true })}</div>`;
}

function buildSep() {
  $('#pane-sep').innerHTML = `
  <p class="lead">الفصل كله جاذبية: قطرة أثقل من الوسط تهبط، أخف تصعد، بسرعة تعطيها معادلة Stokes. كل ما يفعله المصمم والمشغّل هو تحسين شروط هذه المعادلة: قطرة أكبر (تلاحم)، لزوجة أقل (حرارة)، زمن أطول (حجم)، وتشتت أقل (حقن كيماويات في المكان الصحيح).</p>
  <div class="sec"><h2>تحجيم الفاصل الأفقي <small>3-phase</small></h2>
  ${panel('sep', 'Gas capacity × Liquid retention', 'يتبع منهج Arnold & Stewart المبسط: الوعاء ممتلئ 50% بالسائل. قطر الفاصل d (in) وطول التماس Leff (ft) يحققان قيدين: ترسب قطرات السائل من الغاز وبقاء السائل زمن retention المطلوب. النتيجة أولية، وتُراجع مع API 12J والـ vendor.',
    F('s_p', 'ضغط التشغيل', 150, 'psig') + F('s_T', 'درجة الحرارة', 110, '°F') + F('s_Qg', 'الغاز', 0.81, 'MMscf/d') + F('s_Qo', 'النفط', 1400, 'bbl/d') + F('s_Qw', 'الماء', 600, 'bbl/d') + F('s_gg', 'Gas SG', 0.75, '') + F('s_api', 'API', 32, '°API') +
    F('s_dm', 'قطر القطرة المراد إزالتها من الغاز', 100, 'µm') + F('s_mug', 'لزوجة الغاز', 0.012, 'cP') + F('s_to', 'Retention time للنفط', 3, 'min') + F('s_tw', 'Retention time للماء', 3, 'min'), { fill: true })}
  <div class="note">أرقام الـ retention time هنا مدخلات المصمم. القيم الشائعة ≈ 3–5 دقائق للنفط الخفيف الساخن وأكثر للثقيل أو البارد (يُتحقق منها من bottle tests أو معايير الشركة). لا يتضمن الحساب slugs أو foaming أو الرمل: زد الهامش لها.</div></div>
  <div class="sec"><h2>Stokes <small>الأداة الأهم لفهم الفصل</small></h2>
  ${panel('stokes', 'سرعة الترسب أو الطفو لقطرة/جسيم', 'v = g·Δρ·d² / (18·μ). صالحة للتدفق اللزج (Re < 1) ولسوائل نيوتنية فقط. أي أرقام فوق ذلك تُبالغ في السرعة.',
    SEL('st_pre', 'سيناريو جاهز', [['wo', 'قطرة ماء في نفط (treater)'], ['ow', 'قطرة نفط في ماء (skim/CPI)'], ['sand', 'رمل في ماء'], ['gas', 'فقاعة غاز في نفط']], 'wo') +
    F('st_d', 'قطر الجسيم', 100, 'µm') + F('st_rp', 'كثافة الجسيم', 1050, 'kg/m³') + F('st_rf', 'كثافة الوسط', 865, 'kg/m³') + F('st_mu', 'لزوجة الوسط', 9.6, 'cP') + F('st_h', 'مسافة الترسب', 24, 'in') +
    F('st_Q', 'للمقطع الأفقي: معدل التدفق', 2000, 'bbl/d') + F('st_A', 'مساحة السطح الأفقي', 200, 'ft²') +
    F('st_api', 'مساعد: API', 32, '°API') + F('st_T', 'مساعد: درجة الحرارة', 110, '°F'))}</div>
  <div class="sec"><h2>Heater treater <small>الطاقة المطلوبة</small></h2>
  ${panel('heat', 'حمل التسخين واستهلاك الغاز', 'Q = Σ m·cp·ΔT. cp للنفط من علاقة Gambill (0.388+0.00045T)/√SG، وللماء 1.0. لا يشمل الفقد الحراري من الجدران أو الاستعادة بالمبادل.',
    F('h_qo', 'النفط', 1400, 'bbl/d') + F('h_qw', 'الماء', 600, 'bbl/d') + F('h_api', 'API', 32, '°API') + F('h_Ti', 'T الدخول', 85, '°F') + F('h_To', 'T المطلوبة', 140, '°F') + F('h_lhv', 'LHV لغاز الوقود', 950, 'BTU/scf') + F('h_eff', 'كفاءة الـ firetube', 70, '%'), { fill: true })}</div>`;
}

function buildGas() {
  $('#pane-gas').innerHTML = `
  <p class="lead">الغاز والماء ليسا "منتجات جانبية": الغاز يحدد هل الحقل يبيع أو يحرق، والماء يحدد كلفة المعالجة وسلامة الحقن. هذه الأدوات تجيب عن الأسئلة التشغيلية الأولى لكل منهما.</p>
  <div class="sec"><h2>ضاغط الغاز</h2>
  ${panel('comp', 'القدرة وعدد المراحل', 'Isentropic work: W = k/(k−1)·Z·R·T₁·[r^((k−1)/k) − 1] / η لكل مرحلة، مع تبريد بيني حتى T₁. Z من Papay مع pseudo-criticals بدلالة SG. الحقيقة تحتاج منحنيات المصنّع.',
    F('g_Q', 'معدل الغاز', 0.84, 'MMscf/d') + F('g_p1', 'ضغط الشفط', 150, 'psig') + F('g_T1', 'T الشفط', 100, '°F') + F('g_p2', 'ضغط التفريغ', 1000, 'psig') + F('g_gg', 'Gas SG', 0.75, '') + F('g_k', 'k = cp/cv', 1.27, '') + F('g_eta', 'isentropic efficiency', 0.78, '') + F('g_rm', 'أقصى ratio/stage', 4, ''), { fill: true })}</div>
  <div class="sec"><h2>Hydrates</h2>
  ${panel('hyd', 'جرعة المثبط (Hammerschmidt)', 'المدخل الأساسي هو "الخفض المطلوب في درجة تكوّن الـ hydrate" = T_hydrate − T_أدنى تشغيل + هامش أمان. T_hydrate تُؤخذ من منحنى/برنامج (CSMGem أو HYSYS) لغاز الحقل. الصيغة تقريبية وأدق عند W < ≈ 25%.',
    F('y_dT', 'الخفض المطلوب', 18, '°F') + SEL('y_in', 'المثبط', [['MeOH', 'Methanol'], ['MEG', 'MEG (ethylene glycol)']], 'MeOH') + F('y_qw', 'معدل الماء', 600, 'bbl/d') + F('y_sg', 'SG للماء', 1.03, ''), { fill: false })}</div>
  <div class="sec"><h2>Produced water</h2>
  ${panel('pw', 'أصغر قطرة نفط تزيلها وحدة الفصل بالجاذبية', 'القطرة تُزال إذا كانت سرعة طفوها ≥ معدل التدفق ÷ مساحة السطح (Q/A) في وحدة مثالية. d_cut = √(18·μ·(Q/A)/(g·Δρ)). مساحة أكبر أو ماء أسخن (μ أقل) يعني قطرة أصغر.',
    F('w_Q', 'معدل الماء', 600, 'bbl/d') + F('w_A', 'مساحة السطح الفعالة', 250, 'ft²') + F('w_T', 'درجة الحرارة', 110, '°F') + F('w_sg', 'SG للماء', 1.05, '') + F('w_api', 'API للنفط', 32, '°API') + F('w_tgt', 'القطرة المستهدفة', 30, 'µm'), { fill: true })}
  <div class="note">أهداف الجودة: التصريف البحري ≈ 30 mg/L oil-in-water كمتوسط شهري (OSPAR 2001/1) ${BADGE.e}. أما أهداف الحقن (TSS، حجم الجسيمات، OIW) فتتوقف على نفاذية الطبقة: تُحدَّد بـ core-flood واختبارات فلترة، ولا يوجد رقم عالمي واحد ${BADGE.i}.</div></div>`;
}

function buildStore() {
  $('#pane-store').innerHTML = `
  <p class="lead">الخزان ليس مجرد حجم، بل وثيقة مالية: كم برميلاً "قياسياً" تسلمت وبأي نقاء. من قراءة الـ gauge إلى الـ NSV، ثم تدفع المضخة الخام عبر الخط.</p>
  <div class="sec"><h2>القياس والتسليم <small>Tank → NSV</small></h2>
  ${panel('tank', 'من قراءة الخزان إلى الحجم القياسي', 'TOV من جدول المعايرة (هنا: أسطوانة بسيطة)، ثم GOV = TOV − Free Water، ثم GSV = GOV × VCF، ثم NSV = GSV × (1 − BS&W). VCF بصيغة API 11.1 للخام العام: α₆₀ = 341.0957/ρ₆₀². الجدول الرسمي هو المرجع التجاري.',
    F('t_d', 'قطر الخزان', 80, 'ft') + F('t_h', 'ارتفاع النفط (dip)', 22.5, 'ft') + F('t_fw', 'ارتفاع الماء الحر', 0.4, 'ft') + F('t_T', 'درجة الحرارة المقاسة', 95, '°F') + F('t_api', 'API المقروء عند T', 31.5, '°API') + F('t_bsw', 'BS&W', 0.4, '%'))}
  <div class="note warn">هذه الحاسبة لا تتضمن: تصحيح تمدد جدار الخزان (CTSh)، وزن السقف العائم، الـ deadwood، ولا تصحيح ضغط الخام. لا تستخدمها للتسليم التجاري الفعلي.</div></div>
  <div class="sec"><h2>مزرعة الخزانات <small>كم خزاناً أحتاج؟</small></h2>
  ${panel('farm', 'سعة التخزين وعدد الخزانات', 'السعة الاسمية = 0.1399·d²·h (bbl). السعة العاملة = السعة × نسبة التعبئة الآمنة. الخزان الاحتياطي (N+1) للصيانة وللتنظيف.',
    F('f_q', 'إنتاج النفط', 1400, 'STB/d') + F('f_days', 'أيام التخزين المطلوبة', 5, 'day') + F('f_d', 'قطر الخزان', 60, 'ft') + F('f_h', 'ارتفاع الجدار', 32, 'ft') + F('f_fill', 'تعبئة آمنة', 90, '%'), { fill: true })}</div>
  <div class="sec"><h2>خط التصدير</h2>
  ${panel('pipe', 'الاحتكاك وقدرة المضخة', 'Darcy–Weisbach مع Swamee–Jain للـ friction factor، سائل أحادي الطور. اللزوجة هنا قيمة واحدة عند حرارة الخط. (الخطوط الطويلة تتغير حرارتها، وتحتاج حساباً متدرجاً.)',
    F('p_Q', 'المعدل', 20000, 'bbl/d') + F('p_id', 'القطر الداخلي', 12.25, 'in') + F('p_L', 'الطول', 50, 'mi') + F('p_eps', 'خشونة', 0.0018, 'in') + F('p_api', 'API', 32, '°API') + F('p_mu', 'اللزوجة عند T الخط', 10, 'cP') + F('p_dz', 'فرق الارتفاع (+ صعود)', 200, 'ft') + F('p_pd', 'ضغط التسليم', 50, 'psig') + F('p_maop', 'MAOP', 1440, 'psig') + F('p_eta', 'كفاءة المضخة', 75, '%'), { fill: true })}</div>`;
}

function buildTrouble() {
  const stages = [['all', 'الكل']].concat(STAGES.filter(s => TROUBLE.some(t => t.stage === s.id)).map(s => [s.id, s.ar.split(' (')[0]]));
  $('#pane-trouble').innerHTML = `<p class="lead">كل بطاقة تتبع نفس التسلسل: عَرَض ظاهر في الغرفة أو على السجل، أسباب محتملة، ما يُقاس أولاً، ثم الإجراء. الترتيب مهم: لا تعالج قبل أن تقيس.</p>
  <div class="sec"><div class="chips" id="tchips">${stages.map(([k, n], i) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${i === 0}">${n}</button>`).join('')}</div><div class="tcards" id="tcards"></div></div>`;
  renderTrouble('all');
}
function renderTrouble(f) {
  const nm = Object.fromEntries(STAGES.map(s => [s.id, s.ar.split(' (')[0]]));
  $('#tcards').innerHTML = TROUBLE.filter(t => f === 'all' || t.stage === f).map(t => `<article class="tcard"><div class="tg">${nm[t.stage]}</div><h3>${t.t}</h3><p class="sym">${t.sym}</p>
    <h4>أسباب محتملة</h4><ul>${t.cause.map(x => `<li>${x}</li>`).join('')}</ul><h4>ماذا تقيس أولاً</h4><ul>${t.check.map(x => `<li>${x}</li>`).join('')}</ul><h4>إجراءات</h4><ul>${t.fix.map(x => `<li>${x}</li>`).join('')}</ul></article>`).join('');
}

function buildFrac() {
  $('#pane-frac').innerHTML = `
  <p class="lead">أطروحتك تقع عند نقطة نادراً ما تُناقش في أبحاث الـ rheology: بعد الشغل، يعود جزء من الـ fracturing fluid إلى السطح (flowback) ويدخل نفس السلسلة التي رأيتها. السؤال العملي: هل يجعل gel الـ SPME أصعب أو أسهل على الفاصل والـ treater والمياه؟ هذه الصفحة تفصل بين ما هو معروف وما يحتاج قياساً.</p>
  <div class="sec"><h2>ماذا يتغير على الأرض أثناء الـ flowback</h2>
  <div class="twocol"><div><ul class="tight">
   <li><b>المعدات مؤقتة غالباً:</b> flowback manifold مع chokes قابلة للتبديل، sand trap/desander، فاصل رباعي الأطوار (غاز/نفط/ماء/رمل)، خزانات frac مفتوحة (≈ 500 bbl)، وflare مؤقت.</li>
   <li><b>الـ choke أخطر نقطة:</b> الـ proppant العائد ينحت الـ choke. يُدار معدل الـ flowback بالتدريج لحماية الـ proppant pack والمعدات.</li>
   <li><b>التركيب يتغير مع الوقت:</b> الأيام الأولى: ماء الـ frac + gel مكسور + proppant + قليل من الهيدروكربون. لاحقاً يرتفع النفط/الغاز وتزداد ملوحة الماء (ماء التكوين).</li>
   <li><b>نسبة الاسترجاع:</b> جزء فقط من الحجم المضخوخ يعود (يتفاوت كثيراً بين الحقول؛ في الـ shale غالباً أقل من النصف) ${BADGE.e}.</li></ul></div>
  <figure>${flowbackSVG()}<figcaption>رسم توضيحي نوعي لتغير مكونات الـ flowback مع الزمن. ليس بيانات حقل.</figcaption></figure></div></div>
  <div class="sec"><h2>اللزوجة المتبقية تبطئ الفصل <small>Stokes</small></h2>
  ${panel('frac', 'زمن طفو قطرة نفط في ماء يحمل بوليمر متبقياً', 'المنطق: إذا بقي guar/مشتقاته مذاباً في الماء العائد فإن لزوجة الطور المائي ترتفع، وتنخفض سرعة طفو قطرات النفط بنفس النسبة. الحساب نيوتني: يعطي حداً أعلى للإبطاء، لأن محلول البوليمر shear-thinning وسرعة الترسب منخفضة الإجهاد.',
    F('x_d', 'قطر قطرة النفط', 100, 'µm') + F('x_h', 'مسافة الطفو', 24, 'in') + F('x_mu', 'لزوجة الماء النظيف', 0.7, 'cP') + F('x_sg', 'SG للماء', 1.03, '') + F('x_api', 'API للنفط', 32, '°API'))}
  <div class="note">القياس الذي يحسم المسألة هو rheology للماء العائد/المكسور عند معدلات القص المنخفضة وليس عند 100 s⁻¹ فقط ${BADGE.i}. النتيجة أعلاه تحدد "كم تهمّ اللزوجة"، لا "كم هي".</div></div>
  <div class="sec"><h2>مكونات نظامك وانعكاساتها السطحية</h2>
  <div class="tblwrap"><table><thead><tr><th>المكوّن</th><th>الأثر المتوقع على السطح</th><th>الثقة</th></tr></thead><tbody>
   <tr><td>Natural guar (حمولة دنيا)</td><td style="white-space:normal">البوليمر يضيف لزوجة للماء ويترك residue غير ذائب بعد الكسر، وقد يسد filters ويطلي الأسطح. نسبة الـ residue تتفاوت بين المنتجات وتُقاس لكل دفعة (القيمة الشائعة للـ guar الخام عدة نسب مئوية). كسر الـ gel بـ breaker يخفض الوزن الجزيئي ولا يزيل الـ residue.</td><td>${BADGE.e}</td></tr>
   <tr><td>Sodium oleate</td><td style="white-space:normal">صابون كربوكسيلات. يترسب بوجود Ca²⁺ و Mg²⁺ (أوليات الكالسيوم والمغنيسيوم قليلة الذوبان). ماء الـ flowback عالي الملوحة والصلابة، فالمتوقع فقدان جزء من الـ surfactant بالترسب واحتمال تكوّن رواسب صابونية على الأسطح والـ filters.</td><td>${BADGE.e} كيمياء الصابون، ${BADGE.i} للحجم الفعلي</td></tr>
   <tr><td>Surfactant + co-surfactant على الـ interface</td><td style="white-space:normal">أي surfactant متبقٍ يتجمع عند interface النفط/الماء ويثبّت الاستحلاب ويكوّن rag layer. هل يحدث في نظامك وبأي درجة؟ يتوقف على التركيز المتبقي بعد الكسر وعلى ملوحة الماء.</td><td>${BADGE.i}</td></tr>
   <tr><td>Clove oil (eugenol) و 2-ethylhexanol</td><td style="white-space:normal">مكونات عضوية ستتوزع بين الطورين. تأثيرها على OIW وعلى المعالجة الحيوية أو الـ demulsifiers لم أجد ما يسندها كمعطى مؤكد.</td><td>${BADGE.s}</td></tr>
  </tbody></table></div></div>
  <div class="sec"><h2>تجارب مخبرية تربط أطروحتك بالسطح</h2>
  <ul class="tight"><li><b>Bottle test</b> بخام حقيقي + سائل مكسور من gel الـ SPME بنسب water-cut مختلفة وعند درجة حرارة المنشأة، مع قياس water drop مقابل الزمن وسمك الـ rag layer.</li>
  <li><b>قياس الـ residue</b> بالفلترة والوزن بعد الكسر، ومقارنته بـ gel مرجعي (guar/HPG + borate).</li>
  <li><b>IFT</b> (pendant/spinning drop) بين النفط والماء المكسور قبل وبعد الـ breaker.</li>
  <li><b>توافق مع ماء التكوين</b> (Ca²⁺/Mg²⁺ عند ملوحات واقعية) لنظام oleate.</li>
  <li><b>Karl Fischer</b> لماء الخام (ASTM D4377 أو D6304) وطريقة الـ centrifuge (D4007) لـ BS&W المرجعي.</li></ul>
  <div class="note warn">لا تعتمد على هذا القسم كاقتباس علمي: الجدول يفصل الثقة بين المؤكد والاستنتاج والتخمين عمداً. أي ادعاء عن أثر نظامك يحتاج بيانات من تجاربك.</div></div>`;
}
function flowbackSVG() {
  const W = 560, H = 250, L = 40, R = 12, T = 14, B = 34;
  const x = t => L + t / 60 * (W - L - R), y = v => T + (1 - v) * (H - T - B);
  const curve = f => { let d = ''; for (let t = 0; t <= 60; t += 2) d += (t ? ' L' : 'M') + x(t).toFixed(1) + ' ' + y(f(t)).toFixed(1); return d; };
  const gel = t => 0.9 * Math.exp(-t / 6) + 0.02, solids = t => 0.85 * Math.exp(-t / 2.5) + 0.02, gas = t => Math.min(1, 0.12 + 0.85 * (1 - Math.exp(-t / 10))) * Math.exp(-t / 90), oil = t => 0.7 * (1 - Math.exp(-t / 15)) + 0.04;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="رسم توضيحي: تتراجع حصة الـ gel والـ proppant في الـ flowback بسرعة بينما ترتفع حصة الغاز والنفط">`;
  s += `<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${H - B}"/>`;
  [0, 15, 30, 45, 60].forEach(t => s += `<text x="${x(t)}" y="${H - B + 15}" text-anchor="middle">${t}</text>`);
  s += `<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">الأيام بعد بدء الـ flowback</text><text transform="rotate(-90)" x="${-(T + H - B) / 2}" y="12" text-anchor="middle">مقياس نسبي</text>`;
  const sers = [[gel, 'var(--water)', 'gel/polymer في الماء'], [solids, 'var(--ink)', 'proppant وصلب'], [gas, 'var(--gas)', 'غاز'], [oil, 'var(--oil)', 'نفط']];
  sers.forEach(([f, c, l], i) => { s += `<path d="${curve(f)}" style="fill:none;stroke:${c};stroke-width:2.4"/><line x1="${W - R - 150}" x2="${W - R - 132}" y1="${T + 8 + i * 16}" y2="${T + 8 + i * 16}" style="stroke:${c};stroke-width:2.4"/><text class="tt" x="${W - R - 126}" y="${T + 12 + i * 16}">${l}</text>`; });
  return s + '</svg>';
}

function buildRef() {
  $('#pane-ref').innerHTML = `
  <div class="sec"><h2>قاموس</h2><input class="gsearch" id="gq" type="search" placeholder="ابحث: GOR, separator, hydrate..." aria-label="بحث في القاموس"><div class="gloss" id="gl"></div></div>
  <div class="sec"><h2>ظروف القياس القياسية</h2>
  <div class="tblwrap"><table><thead><tr><th>الاصطلاح</th><th>الظروف</th><th>ملاحظة</th></tr></thead><tbody>
   <tr><td>STB / scf (US field)</td><td class="n">60°F, 14.696 psia</td><td style="white-space:normal">المستعمل في هذه الأداة</td></tr>
   <tr><td>Sm³ (SI)</td><td class="n">15°C (288.15 K), 101.325 kPa</td><td style="white-space:normal">قد تختلف الشركات (0°C أو 20°C أيضاً)؛ تحقق من العقد</td></tr>
   <tr><td>1 bbl</td><td class="n">42 US gal = 0.158987 m³</td><td style="white-space:normal">5.6146 ft³</td></tr>
   <tr><td>1 MMscf</td><td class="n">1,000,000 scf ≈ 28,317 Sm³ (فرق ظروف قياس)</td><td style="white-space:normal">تقريب لأن المراجع تختلف</td></tr>
  </tbody></table></div></div>
  <div class="sec"><h2>حدود هذه الأداة</h2><ul class="tight">
   <li>الحاسبات تعليمية/أولية: تُظهر الاتجاهات والرتب وتساعد على الفهم، ولا تغني عن برامج المحاكاة أو معايير الشركة أو مراجعة مهندس مرخّص.</li>
   <li>خصائص الموائع من علاقات ارتباطية (Standing, Beggs–Robinson, Papay). تتفاوت دقتها بحسب نوع الخام والمدى. للحقل الحقيقي استخدم PVT مخبري.</li>
   <li>توزيع الغاز على مراحل الفصل مقدَّر من Standing؛ التقسيم الفعلي يحتاج flash بمعادلة حالة (EOS).</li>
   <li>ثوابت الـ choke correlations منقولة عن مراجع ثانوية؛ تحقق منها قبل الاعتماد عليها.</li></ul></div>
  <div class="sec"><h2>المراجع <small>مع درجة ثقتي في دقة الببليوغرافيا</small></h2><div class="tblwrap"><table><thead><tr><th>المرجع</th><th>الثقة</th></tr></thead><tbody>${REFS.map(([r, c]) => `<tr><td style="white-space:normal;min-width:320px;direction:ltr;text-align:left">${r}</td><td style="white-space:normal">${c}</td></tr>`).join('')}</tbody></table></div>
  <p class="note warn" style="margin-top:10px">راجع الأرقام (DOI/الصفحات) من المصدر قبل أي اقتباس رسمي في الأطروحة. ما لم أذكر له DOI فذلك لأنني غير متأكد منه.</p></div>`;
  const render = q => { $('#gl').innerHTML = GLOSS.filter(g => !q || (g[0] + ' ' + g[1]).toLowerCase().includes(q.toLowerCase())).map(g => `<div><b>${g[0]}</b>${g[1]}</div>`).join('') || '<div>لا نتائج</div>'; };
  render(''); $('#gq').addEventListener('input', e => render(e.target.value.trim()));
}

/* ===== Calculators ===== */
const out = (id, html) => { const e = document.getElementById('o_' + id); if (e) e.innerHTML = html; };
const dens = api => 62.4 * apiToSG(api);
const muWaterCp = TF => { const TK = (TF - 32) / 1.8 + 273.15; return 2.414e-5 * Math.pow(10, 247.8 / (TK - 140)) * 1000; };

function caseObj() { return caseVals(); }

RUN.stream = () => {
  const c = caseObj(); if (![c.qL, c.wc, c.gor, c.api, c.gg, c.Tres].every(isFinite)) return;
  const b = stageBalance(c);
  const names = [['HP separator', c.Psep1], ['LP separator', c.Psep2], ['Stock tank / VRU', 0]];
  const rows = names.map(([n, p], i) => `<tr><td>${n}</td><td class="n">${fmt(p, 0)}</td><td class="n">${fmt(b.gas[i] * 1000, 1)}</td><td class="n">${fmt(b.frac[i] * 100, 1)}%</td></tr>`).join('');
  const ro = dens(c.api);
  const sat = c.Pr < b.Pb;
  $('#o_stream').innerHTML = `<div class="twocol"><div class="out"><div class="kvs">${KV('نفط (stock tank)', fmt(b.qo, 0), 'STB/d')}${KV('ماء', fmt(b.qw, 0), 'bbl/d')}${KV('غاز كلي', fmt(b.gasTot, 3), 'MMscf/d')}${KV('Pb (Standing)', fmt(b.Pb, 0), 'psia', sat ? 'warn' : '')}${KV('Bo عند Pb', fmt(b.Bo, 3), 'rb/STB')}${KV('Shrinkage', fmt(b.shrink * 100, 1), '%')}${KV('كثافة النفط', fmt(ro, 1), 'lb/ft³')}</div>
   ${sat ? MSG('Pr أقل من Pb: المكمن saturated، فالـ GOR المُدخَل قد لا يمثل الـ solution GOR. الحساب هنا تقريبي.', 'warn') : MSG('Pr أعلى من Pb: المكمن undersaturated، فالنفط يصل البئر مذاباً فيه الغاز ويتحرر لاحقاً. هذا هو سبب الـ shrinkage.', '')}</div>
   <div class="out"><div class="tblwrap"><table><thead><tr><th>المرحلة</th><th class="n">psig</th><th class="n">Mscf/d</th><th class="n">حصة الغاز</th></tr></thead><tbody>${rows}</tbody></table></div>
   ${MSG('توزيع الغاز على المراحل مقدَّر من Standing؛ يميل لتقدير غاز المرحلة الأولى أعلى مما يحدث في الواقع. التوزيع الحقيقي يحتاج flash لتركيب المائع.', '')}</div></div>`;
  const casesum = `API ${c.api} · GOR ${c.gor} · WC ${c.wc}% · q ${fmt(c.qL, 0)} · Pr ${fmt(c.Pr, 0)} · FWHP ${c.Pwh}`; $('#casesum').textContent = casesum;
};

RUN.fall = () => {
  const c = caseObj(); if (![c.Pr, c.Pwh, c.Pchk, c.Psep1, c.Psep2, c.J, c.qL].every(isFinite)) return;
  const b = stageBalance(c);
  const pwfI = iprPwf(c.qL, c.Pr, b.Pb, c.J);
  const qmax = iprQmax(c.Pr, b.Pb, c.J);
  const lv = [c.Pr - 14.696, pwfI - 14.696, c.Pwh, c.Pchk, c.Psep1, c.Psep2, 0];
  const names = ['Drawdown', 'Tubing', 'Choke', 'Flowline', 'HP→LP', 'LP→tank'];
  const cols = ['var(--oil)', 'var(--accent)', 'var(--gas)', 'var(--muted)', 'var(--water)', 'var(--water)'];
  const W = 640, H = 300, L = 56, R = 12, T = 18, B = 40, ym = niceMax(lv[0] * 1.05);
  const Y = v => T + (1 - Math.max(v, 0) / ym) * (H - T - B), bw = (W - L - R) / 6;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="رسم شلال الضغط من المكمن حتى الخزان">`;
  for (let i = 0; i <= 4; i++) { const v = ym * i / 4; s += `<line class="gridl" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, 0)}</text>`; }
  s += `<text transform="rotate(-90)" x="${-(T + H - B) / 2}" y="12" text-anchor="middle">psig</text>`;
  for (let i = 0; i < 6; i++) {
    const hi = Math.max(lv[i], lv[i + 1]), lo = Math.min(lv[i], lv[i + 1]), x = L + i * bw + 6;
    s += `<rect x="${x}" y="${Y(hi)}" width="${bw - 12}" height="${Math.max(Y(lo) - Y(hi), 1)}" style="fill:${cols[i]};opacity:.85"/>`;
    s += `<text x="${x + (bw - 12) / 2}" y="${Y(hi) - 5}" text-anchor="middle" class="tt">${fmt(lv[i] - lv[i + 1], 0)}</text><text x="${x + (bw - 12) / 2}" y="${H - B + 15}" text-anchor="middle">${names[i]}</text>`;
  }
  s += `<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/></svg>`;
  $('#o_fall').innerHTML = `<figure>${s}<figcaption>كل عمود هو الضغط المفقود في مرحلة (psi). المجموع من Pr حتى الخزان.</figcaption></figure>`;
  /* consistency: VLP vs IPR at qL */
  const lift = vlpParams(c, 'none');
  const v = vlpPwf(c.qL, lift);
  let msg = '';
  if (!(c.qL < qmax)) msg = MSG(`المعدل المُدخَل (${fmt(c.qL, 0)}) أكبر من qmax للمكمن (${fmt(qmax, 0)} bbl/d).`, 'bad');
  else if (!isFinite(v.pwf)) msg = MSG('VLP لم يُحسب (ضغط سالب أو غير واقعي).', 'bad');
  else {
    const d = v.pwf - pwfI;
    msg = Math.abs(d) < 150 ? MSG(`متسق: الـ tubing يحتاج Pwf ≈ ${fmt(v.pwf, 0)} psia والمكمن يعطي ${fmt(pwfI, 0)} psia عند هذا المعدل.`, 'ok')
      : d > 0 ? MSG(`غير متسق: الـ tubing يحتاج Pwf ≈ ${fmt(v.pwf, 0)} psia لكن المكمن لا يعطي إلا ${fmt(pwfI, 0)} psia عند هذا المعدل. البئر لن يصل هذا المعدل بدون رفع أو خفض ضغط السطح.`, 'warn')
        : MSG(`الـ tubing يحتاج ${fmt(v.pwf, 0)} psia والمكمن يعطي ${fmt(pwfI, 0)}: هناك فائض ضغط ≈ ${fmt(-d, 0)} psi، فيمكن رفع المعدل أو زيادة الاختناق.`, 'ok');
  }
  const ratio = (c.Pchk + 14.696) / (c.Pwh + 14.696);
  $('#o_fallnote').innerHTML = `<div class="out">${msg}${MSG(`نسبة ضغط الـ choke (downstream/upstream) = ${fmt(ratio, 2)}. ${ratio < 0.55 ? 'أقل من ≈ 0.55: تدفق حرج، فضغط المنشأة لا يؤثر على معدل البئر.' : 'أعلى من ≈ 0.55: تدفق تحت حرج، فتغيّر ضغط السطح سيغيّر معدل البئر.'}`, ratio < 0.55 ? 'ok' : 'warn')}
   <p>الدرس: في الحقول الطبيعية الضغط يُصرف أساساً في ثلاثة أماكن: الـ drawdown (لا بد منه)، رفع العمود في الـ tubing، والـ choke. المراحل السطحية الأخيرة صغيرة بالمقارنة، لكنها هي التي تحدد كم غاز يتحرر ومدى استقرار الخام.</p></div>`;
};

function vlpParams(c, mode) {
  const g = (id, d) => { const e = document.getElementById(id); const v = e ? parseFloat(e.value) : NaN; return isFinite(v) ? v : d; };
  const p = { whp: c.Pwh + 14.696, TVD: c.TVD, MD: Math.max(g('n_MD', c.TVD), c.TVD), id: c.id, Twh: g('n_Twh', 110), Tbh: c.Tres, wc: c.wc / 100, gor: c.gor, api: c.api, gg: c.gg, gw: 1.05, eps: g('n_eps', 0.0006), muL: g('n_mu', 3), N: 40, glrInj: 0, zInj: 0, dpPump: 0, zPump: 0 };
  if (mode === 'gl') { p.glrInj = g('n_glr', 0); p.zInj = Math.min(g('n_zinj', 0), c.TVD); }
  if (mode === 'esp') { p.dpPump = g('n_dpp', 0); p.zPump = Math.min(g('n_zp', 0), c.TVD); }
  return p;
}

RUN.nodal = () => {
  const c = caseObj(); if (![c.Pr, c.J, c.TVD, c.id, c.gor, c.api].every(isFinite)) return;
  const mode = document.getElementById('n_mode').value;
  const b = stageBalance(c), Pb = b.Pb;
  const p0 = vlpParams(c, 'none'), p1 = vlpParams(c, mode);
  const qmax = iprQmax(c.Pr, Pb, c.J);
  const base = nodalSolve(p0, c.Pr, Pb, c.J);
  const lifted = mode === 'none' ? base : nodalSolve(p1, c.Pr, Pb, c.J);
  const ipr = [], v0 = [], v1 = [], N = 36;
  for (let i = 0; i <= N; i++) {
    const q = qmax * i / N * 0.99, pw = iprPwf(q, c.Pr, Pb, c.J); ipr.push([q, pw]);
    if (i >= 1) { v0.push([q, vlpPwf(q, p0).pwf]); if (mode !== 'none') v1.push([q, vlpPwf(q, p1).pwf]); }
  }
  const ym = niceMax(c.Pr * 1.05), xm = niceMax(qmax * 1.02);
  const series = [{ pts: ipr, color: 'var(--oil)', label: 'IPR (المكمن)' }, { pts: v0, color: 'var(--water)', label: mode === 'none' ? 'VLP (tubing)' : 'VLP بدون رفع', dash: mode !== 'none' }];
  if (mode !== 'none') series.push({ pts: v1, color: 'var(--accent)', label: mode === 'gl' ? 'VLP مع gas lift' : 'VLP مع ESP' });
  const marks = []; const res = lifted;
  let det = '';
  if (res.q) { const pw = iprPwf(res.q, c.Pr, Pb, c.J); marks.push({ x: res.q, y: pw, label: `${fmt(res.q, 0)} bbl/d`, color: 'var(--ink)', dx: -8, dy: -10, anchor: 'end' }); const vv = vlpPwf(res.q, p1);
    const oil = res.q * (1 - c.wc / 100);
    let hp = ''; if (mode === 'esp') hp = KV('hp هيدروليكي للمضخة', fmt(res.q * p1.dpPump / 58770, 0), 'hp');
    det = `<div class="kvs">${KV('نقطة التشغيل', fmt(res.q, 0), 'bbl/d', 'ok')}${KV('النفط', fmt(oil, 0), 'STB/d')}${KV('Pwf', fmt(pw, 0), 'psia')}${KV('Drawdown', fmt(c.Pr - pw, 0), 'psi')}${KV('احتكاك الـ tubing', fmt(vv.dpFric, 0), 'psi')}${KV('غاز حر أعلى/أسفل', fmt(vv.gasFracTop * 100, 0) + '/' + fmt(vv.gasFracBot * 100, 0), '%')}${hp}</div>`;
    if (mode !== 'none' && base.q) det += MSG(`المكسب من الرفع: ${fmt(res.q - base.q, 0)} bbl/d (من ${fmt(base.q, 0)} إلى ${fmt(res.q, 0)}).`, 'ok');
    else if (mode !== 'none') det += MSG(`البئر لا يتدفق طبيعياً بهذه الظروف، والرفع جعله ينتج ${fmt(res.q, 0)} bbl/d.`, 'ok');
    if (pw < Pb) det += MSG('Pwf أقل من Pb: يتحرر الغاز عند الـ perforations وفي الـ tubing؛ توقع إنتاج GOR أعلى وتحميلاً أسوأ للمضخة.', 'warn');
  } else det = MSG(mode === 'none' ? 'لا يوجد تقاطع: البئر لا يتدفق طبيعياً (VLP فوق IPR في كل المدى). يحتاج artificial lift أو خفض FWHP.' : 'لا يوجد تقاطع حتى مع الرفع الحالي. زد الحقن/الـ ΔP أو راجع المدخلات.', 'bad');
  $('#o_nodal').innerHTML = `<figure>${lineChart({ xmax: xm, ymax: ym, xlab: 'Liquid rate (bbl/d)', ylab: 'Pwf (psia)', series, marks, hlines: [{ y: Pb, color: 'var(--gas)', label: 'Pb' }], aria: 'منحنيا IPR و VLP ونقطة التشغيل' })}</figure>${det}`;
};

RUN.choke = () => {
  const q = num('k_q'), R = num('k_R'), S = num('k_S'), pt = num('k_pt'), pd = num('k_pd');
  if (![q, R, S, pt, pd].every(isFinite) || S <= 0) return;
  const rows = Object.keys(CHOKES).map(k => `<tr><td>${k}</td><td class="n">${fmt(chokeP(k, q, R, S), 0)}</td><td class="n">${fmt(chokeS(k, q, R, pt), 1)}</td></tr>`).join('');
  const ps = Object.keys(CHOKES).map(k => chokeP(k, q, R, S)), avg = ps.reduce((a, b) => a + b, 0) / ps.length;
  const ratio = (pd + 14.696) / (avg + 14.696);
  $('#o_choke').innerHTML = `<div class="tblwrap"><table><thead><tr><th>العلاقة</th><th class="n">FWHP عند S (psig)</th><th class="n">S لـ FWHP المستهدف (/64)</th></tr></thead><tbody>${rows}</tbody></table></div>
   <div class="kvs">${KV('متوسط FWHP', fmt(avg, 0), 'psig')}${KV('مدى الاختلاف', fmt(Math.min(...ps), 0) + '–' + fmt(Math.max(...ps), 0), 'psig')}${KV('نسبة ضغط الـ choke', fmt(ratio, 2), '', ratio < 0.55 ? 'ok' : 'bad')}</div>
   ${ratio < 0.55 ? MSG('تدفق حرج: العلاقات صالحة تقريبياً.', 'ok') : MSG('تحت حرج (النسبة ≥ ≈ 0.55): هذه العلاقات غير صالحة، ويؤثر ضغط downstream على المعدل.', 'bad')}`;
};
FILL.choke = () => { const c = caseObj(); const b = stageBalance(c); setv('k_q', c.qL); setv('k_R', Math.round(c.gor * (1 - c.wc / 100))); setv('k_pt', c.Pwh); setv('k_pd', c.Pchk); };

RUN.al = () => {
  const i = { d: num('a_d'), q: num('a_q'), wc: num('a_wc'), gor: num('a_gor'), mu: num('a_mu'), T: num('a_T'), sand: +document.getElementById('a_sand').value, h2s: +document.getElementById('a_h2s').value, dev: +document.getElementById('a_dev').value, gas: +document.getElementById('a_gas').value, pw: +document.getElementById('a_pw').value };
  if (![i.d, i.q, i.wc, i.gor, i.mu, i.T].every(isFinite)) return;
  const R = {}; AL_DATA.forEach(a => R[a.k] = { s: 100, w: [], x: false });
  const pen = (k, p, why) => { R[k].s -= p; R[k].w.push(why); }, bon = (k, p, why) => { R[k].s += p; R[k].w.push(why + ' (+)'); }, ex = (k, why) => { R[k].x = true; R[k].w.push('مستبعد: ' + why); };
  /* SRP */
  if (i.d > 14000) ex('srp', 'العمق أكبر من النطاق العملي لـ SRP'); if (i.q > 4000) ex('srp', 'المعدل أكبر من النطاق العملي');
  if (i.q > 1500 && i.d > 7000) pen('srp', 30, 'معدل عالٍ مع عمق كبير يحمّل القضبان');
  if (i.dev === 2) pen('srp', 40, 'البئر الأفقي يعيق الضخ بالقضبان'); if (i.dev === 1) pen('srp', 15, 'الانحراف يزيد تآكل القضبان/tubing');
  if (i.sand === 2) pen('srp', 25, 'رمل كثير يتلف المضخة'); else if (i.sand === 1) pen('srp', 8, 'رمل قليل');
  if (i.gor > 800) pen('srp', 15, 'غاز حر يقلل كفاءة الشوط'); if (i.mu > 500) pen('srp', 15, 'لزوجة عالية');
  /* ESP */
  if (!i.pw) ex('esp', 'لا تتوفر كهرباء'); if (i.q < 150) pen('esp', 45, 'المعدل أقل من النطاق الكفؤ'); else if (i.q < 300) pen('esp', 15, 'معدل منخفض نسبياً');
  if (i.d > 13000) pen('esp', 20, 'عمق كبير');
  if (i.T > 300) pen('esp', 50, 'حرارة تتجاوز حد المحركات/الكوابل القياسية'); else if (i.T > 260) pen('esp', 25, 'حرارة عالية على المحرك');
  if (i.sand === 2) pen('esp', 35, 'رمل كثير يتلف impellers'); else if (i.sand === 1) pen('esp', 10, 'رمل قليل');
  if (i.gor > 800) pen('esp', 25, 'غاز حر عند الـ intake'); else if (i.gor > 400) pen('esp', 10, 'غاز معتبر');
  if (i.mu > 1000) pen('esp', 40, 'لزوجة عالية جداً'); else if (i.mu > 200) pen('esp', 15, 'لزوجة عالية');
  if (i.h2s) pen('esp', 8, 'H₂S يتطلب مواد خاصة'); if (i.dev === 2) pen('esp', 10, 'ضرورة وضع المضخة في المقطع العمودي'); if (i.wc > 50) bon('esp', 8, 'water cut عالٍ يناسب ESP');
  /* Gas lift */
  if (!i.gas) ex('gl', 'لا يتوفر غاز للحقن'); if (i.q < 100) pen('gl', 30, 'معدل منخفض لا يبرر البنية'); if (i.q > 5000) bon('gl', 8, 'مناسب للمعدلات العالية');
  if (i.sand === 2) pen('gl', 10, 'رمل كثير (تآكل سطحي)'); if (i.mu > 300) pen('gl', 20, 'لزوجة عالية تضعف الرفع'); if (i.wc > 70) pen('gl', 8, 'water cut عالٍ يرفع الغاز المطلوب');
  if (i.gor > 300) bon('gl', 5, 'الغاز المصاحب يساعد'); if (i.dev > 0) bon('gl', 5, 'يتحمل الانحراف جيداً'); if (i.d > 14000) pen('gl', 10, 'ضغط ضغط كبير للحقن');
  /* PCP */
  if (i.d > 8000) ex('pcp', 'العمق أكبر من حدود PCP'); else if (i.d > 6000) pen('pcp', 30, 'عمق كبير'); else if (i.d > 4500) pen('pcp', 10, 'عمق متوسط');
  if (i.q > 2500) ex('pcp', 'المعدل أكبر من حدود PCP'); else if (i.q > 1200) pen('pcp', 30, 'معدل مرتفع');
  if (i.T > 300) ex('pcp', 'الحرارة تتجاوز حد الـ elastomer'); else if (i.T > 250) pen('pcp', 30, 'حرارة عالية على الـ elastomer'); else if (i.T > 200) pen('pcp', 8, 'حرارة تقصّر عمر الـ stator');
  if (i.gor > 500) pen('pcp', 20, 'غاز يضر بالـ elastomer'); if (i.sand) bon('pcp', 8, 'يتحمل الرمل أفضل من SRP/ESP'); if (i.mu >= 100) bon('pcp', 10, 'مناسب للنفط اللزج');
  if (i.h2s) pen('pcp', 5, 'H₂S/مكونات عطرية قد تنفخ الـ elastomer'); if (i.dev === 2) pen('pcp', 15, 'تآكل القضبان في الأفقي'); else if (i.dev === 1) pen('pcp', 5, 'انحراف');
  /* Plunger */
  if (i.q > 500) ex('pl', 'المعدل أكبر بكثير من نطاق plunger'); else if (i.q > 200) pen('pl', 40, 'معدل أعلى من النطاق المعتاد');
  const need = 300 * i.d / 1000; if (i.gor < need) pen('pl', 40, `GOR أقل من ≈ ${fmt(need, 0)} scf/bbl (قاعدة تقريبية 300/1000 ft)`);
  if (i.sand === 2) pen('pl', 15, 'رمل كثير'); if (i.dev === 2) pen('pl', 25, 'أفقي'); else if (i.dev === 1) pen('pl', 10, 'انحراف'); if (i.mu > 50) pen('pl', 10, 'لزوجة');
  const list = AL_DATA.map(a => ({ ...a, s: R[a.k].x ? 0 : Math.max(0, Math.min(100, R[a.k].s)), x: R[a.k].x, w: R[a.k].w })).sort((a, b) => b.s - a.s);
  $('#o_al').innerHTML = `<div class="tblwrap"><table><thead><tr><th>الطريقة</th><th>الملاءمة</th></tr></thead><tbody>${list.map(l => `<tr class="${l === list[0] && !l.x ? 'hi' : ''}"><td>${l.n}<br><small style="color:var(--muted)">${l.ar}</small></td><td><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><i style="width:${l.s}%"></i></div><span class="mono">${l.x ? 'مستبعد' : l.s}</span></div></td></tr>`).join('')}</tbody></table></div>
   ${list.map(l => l.w.length ? `<div class="msg ${l.x ? 'bad' : ''}"><b>${l.n}:</b> ${l.w.join('، ')}</div>` : '').join('')}
   ${MSG('الأرقام لا تحمل معنى مطلقاً: هي ترتيب نسبي لتقليص الخيارات، وليست احتمال نجاح. تعتمد على نطاقات تشغيل عامة وقد تختلف عن نطاقات المورّد.', '')}`;
};
FILL.al = () => { const c = caseObj(); setv('a_d', c.TVD); setv('a_q', c.qL); setv('a_wc', c.wc); setv('a_gor', c.gor); setv('a_T', c.Tres); };

RUN.sep = () => {
  const p = { Pg: num('s_p'), T: num('s_T'), Qg: num('s_Qg'), Qo: num('s_Qo'), Qw: num('s_Qw'), gg: num('s_gg'), api: num('s_api'), dm: num('s_dm'), muG: num('s_mug'), to: num('s_to'), tw: num('s_tw') };
  if (!Object.values(p).every(isFinite)) return;
  const r = sepSizing(p);
  const rows = r.rows.map(x => `<tr class="${r.best && x.d === r.best.d ? 'hi' : ''}"><td class="n">${x.d}</td><td class="n">${fmt(x.Lg, 1)}</td><td class="n">${fmt(x.Ll, 1)}</td><td class="n">${fmt(x.Lss, 1)}</td><td class="n">${fmt(x.SR, 1)}</td><td>${x.gasGov ? 'الغاز' : 'السائل'}</td><td>${x.ok ? 'مقبول' : '—'}</td></tr>`).join('');
  $('#o_sep').innerHTML = `<div class="kvs">${KV('ρ الغاز', fmt(r.rhoG, 2), 'lb/ft³')}${KV('ρ النفط', fmt(r.rhoO, 1), 'lb/ft³')}${KV('Z', fmt(r.Z, 3))}${KV('Vt للقطرة', fmt(r.Vt, 2), 'ft/s')}${KV('Cd', fmt(r.Cd, 2))}${KV('d·Leff (غاز)', fmt(r.dLg, 0), 'in·ft')}${KV('d²·Leff (سائل)', fmt(r.d2L, 0), 'in²·ft')}</div>
   <div class="tblwrap"><table><thead><tr><th class="n">d (in)</th><th class="n">Leff غاز (ft)</th><th class="n">Leff سائل (ft)</th><th class="n">Lss (ft)</th><th class="n">12·Lss/d</th><th>يحكم</th><th>مقبول؟</th></tr></thead><tbody>${rows}</tbody></table></div>
   ${r.best ? MSG(`أقل كلفة تقريبية ضمن SR 3–5.5 (المثالي 3–5): قطر ${r.best.d}" × طول ${fmt(r.best.Lss, 1)} ft (Lss). ${r.best.gasGov ? 'قيد الغاز هو الحاكم.' : 'قيد السائل هو الحاكم.'}`, 'ok') : MSG('لا يوجد قطر ضمن SR 3–5.5 في الجدول: استخدم وعاءً رأسياً أو أضف وحدات متوازية.', 'warn')}`;
};
FILL.sep = () => { const c = caseObj(); const b = stageBalance(c); setv('s_p', c.Psep1); setv('s_T', c.Ts); setv('s_Qg', +(b.gas[0]).toFixed(3)); setv('s_Qo', Math.round(b.qo)); setv('s_Qw', Math.round(b.qw)); setv('s_gg', c.gg); setv('s_api', c.api); };

const STPRE = { wo: [100, 1050, 865, 9.6], ow: [100, 865, 1050, 0.6], sand: [100, 2650, 1000, 0.7], gas: [200, 5, 865, 9.6] };
RUN.stokes = () => {
  const d = num('st_d') * 1e-6, rp = num('st_rp'), rf = num('st_rf'), mu = num('st_mu') * 1e-3, h = num('st_h') * 0.0254;
  if (![d, rp, rf, mu, h].every(isFinite) || mu <= 0) return;
  const v = stokesV(d, rp - rf, mu), av = Math.abs(v), Re = rf * av * d / mu;
  const muOil = muDeadOil(num('st_api'), num('st_T'));
  const t = av > 0 ? h / av : Infinity;
  const Q = num('st_Q'), A = num('st_A'); const vs = Q * 0.158987 / 86400 / (A * 0.092903);
  const dcut = stokesCut(vs, rp - rf, mu);
  $('#o_stokes').innerHTML = `<div class="kvs">${KV('الاتجاه', v >= 0 ? 'يهبط' : 'يطفو')}${KV('السرعة', fmt(av * 1000, av < 0.001 ? 4 : 3), 'mm/s')}${KV('السرعة', fmt(av * 1000 * 60 / 25.4, 3), 'in/min')}${KV('زمن قطع المسافة', t < 3600 ? fmt(t / 60, 1) : fmt(t / 3600, 1), t < 3600 ? 'min' : 'h')}${KV('Reynolds', fmt(Re, 3), '', Re < 1 ? 'ok' : 'bad')}${KV('أصغر قطرة تُزال عند Q/A', fmt(dcut * 1e6, 1), 'µm')}</div>
   ${Re < 1 ? MSG('Re < 1: نظام Stokes صالح.', 'ok') : MSG('Re ≥ 1: Stokes غير صالح، والسرعة الحقيقية أقل من الحساب (استخدم Cd للمنطقة الانتقالية أو حاسبة الفاصل).', 'bad')}
   ${MSG(`مساعد: لزوجة النفط الميت (Beggs–Robinson) عند ${num('st_T')}°F وAPI ${num('st_api')} ≈ ${fmt(muOil, 2)} cP. ضعها في "لزوجة الوسط" إذا كان النفط هو الوسط.`)}
   ${MSG('الأثر العملي: السرعة تتناسب مع d²: مضاعفة قطر القطرة (بالتلاحم) تزيد السرعة 4 مرات، وخفض اللزوجة للنصف يضاعفها.')}`;
};

RUN.heat = () => {
  const qo = num('h_qo'), qw = num('h_qw'), api = num('h_api'), Ti = num('h_Ti'), To = num('h_To'), lhv = num('h_lhv'), eff = num('h_eff') / 100;
  if (![qo, qw, api, Ti, To, lhv, eff].every(isFinite) || eff <= 0) return;
  const sg = apiToSG(api), Tm = (Ti + To) / 2;
  const cpo = (0.388 + 0.00045 * Tm) / Math.sqrt(sg);
  const mo = qo * C.lbPerBblW * sg / 24, mw = qw * C.lbPerBblW * 1.03 / 24;
  const Q = (mo * cpo + mw * 1.0) * (To - Ti);
  const fuel = Q / eff / lhv * 24 / 1000;
  const m1 = muDeadOil(api, Ti), m2 = muDeadOil(api, To);
  $('#o_heat').innerHTML = `<div class="kvs">${KV('الحمل الحراري', fmt(Q / 1e6, 2), 'MMBTU/hr')}${KV('يومياً', fmt(Q * 24 / 1e6, 1), 'MMBTU/d')}${KV('غاز الوقود', fmt(fuel, 1), 'Mscf/d')}${KV('cp النفط', fmt(cpo, 3), 'BTU/lb·°F')}${KV('μ النفط عند الدخول', fmt(m1, 1), 'cP')}${KV('μ النفط عند الخروج', fmt(m2, 1), 'cP')}${KV('نسبة الخفض', fmt(m1 / m2, 1), '×')}</div>
   ${MSG(`حصة الماء من الحمل: ${fmt(mw * (To - Ti) / Q * 100, 0)}%. الماء مكلف حرارياً (cp = 1.0)، لذا فصله (FWKO) قبل الـ heater يوفر وقوداً.`)}`;
};
FILL.heat = () => { const c = caseObj(); const b = stageBalance(c); setv('h_qo', Math.round(b.qo)); setv('h_qw', Math.round(b.qw)); setv('h_api', c.api); };

RUN.comp = () => {
  const p = { Q: num('g_Q'), P1: num('g_p1'), T1: num('g_T1'), P2: num('g_p2'), gg: num('g_gg'), k: num('g_k'), eta: num('g_eta'), rmax: num('g_rm') };
  if (!Object.values(p).every(isFinite) || p.P2 <= p.P1 || p.rmax <= 1) { out('comp', MSG('ضغط التفريغ يجب أن يكون أعلى من الشفط.', 'warn')); return; }
  const r = compressor(p);
  out('comp', `<div class="kvs">${KV('Ratio كلي', fmt(r.r, 2))}${KV('عدد المراحل', fmt(r.n, 0))}${KV('Ratio/stage', fmt(r.rs, 2))}${KV('القدرة/مرحلة', fmt(r.hpStage, 0), 'hp')}${KV('القدرة الكلية', fmt(r.hpTot, 0), 'hp', 'ok')}${KV('hp لكل MMscf/d', fmt(r.hpTot / p.Q, 0))}${KV('T التفريغ/مرحلة', fmt(r.Td, 0), '°F', r.Td > 325 ? 'warn' : '')}${KV('Z عند الشفط', fmt(r.Z, 3))}${KV('ACFM عند الشفط', fmt(r.acfm, 0))}</div>
   ${r.Td > 325 ? MSG('درجة حرارة التفريغ مرتفعة: يحدّها تلف الزيوت/الحشوات وغالباً تُحدّد بـ ≈ 300–350°F؛ زد عدد المراحل أو راجع الكفاءة.', 'warn') : ''}${MSG('القدرة المحسوبة على عمود الإدارة (bhp) بدون فقد ميكانيكي وفقد الـ valves. أضف ≈ 5–10% للفقد الميكانيكي حسب نوع الضاغط.')}`);
};
FILL.comp = () => { const c = caseObj(); const b = stageBalance(c); setv('g_Q', +b.gasTot.toFixed(3)); setv('g_p1', c.Psep1); setv('g_gg', c.gg); };

RUN.hyd = () => {
  const dT = num('y_dT'), key = document.getElementById('y_in').value, qw = num('y_qw'), sg = num('y_sg');
  if (![dT, qw, sg].every(isFinite)) return;
  const W = hammerschmidt(dT, key), mw = qw * C.lbPerBblW * sg, mi = mw * W / (100 - W);
  const gal = mi / INHIB[key].lbGal;
  out('hyd', `<div class="kvs">${KV('التركيز في الطور المائي', fmt(W, 1), 'wt%', W > 25 ? 'warn' : 'ok')}${KV('المثبط النقي', fmt(mi, 0), 'lb/d')}${KV('الحجم', fmt(gal, 0), 'gal/d')}${KV('لكل bbl ماء', fmt(gal / qw, 2), 'gal')}</div>
   ${W > 25 ? MSG('W > ≈ 25 wt%: الصيغة تفقد دقتها؛ استخدم برنامج hydrate.', 'warn') : ''}
   ${key === 'MeOH' ? MSG('Methanol يتوزع أيضاً في الغاز والنفط (فقد في الطور البخاري) ولا يُحسب هنا: الجرعة الفعلية أعلى. MEG أقل فقداً ويُسترجع بالـ regeneration.') : MSG('MEG غالباً يُسترجع ويُعاد حقنه؛ تُضبط الجرعة بحسب تركيز الـ lean MEG المحقون (هنا افترضنا نقياً).')}`);
};

RUN.pw = () => {
  const Q = num('w_Q'), A = num('w_A'), T = num('w_T'), sg = num('w_sg'), api = num('w_api'), tgt = num('w_tgt');
  if (![Q, A, T, sg, api, tgt].every(isFinite)) return;
  const mu = muWaterCp(T) * 1e-3, rw = sg * 999.016, ro = 999.016 * apiToSG(api);
  const vs = Q * 0.158987 / 86400 / (A * 0.092903), dc = stokesCut(vs, rw - ro, mu);
  const vt = stokesV(tgt * 1e-6, rw - ro, mu), Areq = Q * 0.158987 / 86400 / vt / 0.092903;
  out('pw', `<div class="kvs">${KV('μ الماء', fmt(mu * 1000, 3), 'cP')}${KV('Δρ', fmt(rw - ro, 0), 'kg/m³')}${KV('Q/A', fmt(vs * 1000, 3), 'mm/s')}${KV('أصغر قطرة تُزال', fmt(dc * 1e6, 1), 'µm', dc * 1e6 <= tgt ? 'ok' : 'warn')}${KV(`المساحة لإزالة ${tgt} µm`, fmt(Areq, 0), 'ft²')}</div>
   ${dc * 1e6 <= tgt ? MSG('المساحة الحالية كافية للقطرة المستهدفة (في وحدة مثالية بدون short-circuiting).', 'ok') : MSG('المساحة الحالية لا تكفي: تحتاج مساحة أكبر أو حرارة أعلى أو تلاحم (coalescing media/CPI).', 'warn')}
   ${MSG('الوحدات الحقيقية تقلّ كفاءتها عن المثالية (قصر مسار، اضطراب)؛ تُعتمد معاملات أمان 1.5–2× على المساحة عادةً.')}`);
};
FILL.pw = () => { const c = caseObj(); const b = stageBalance(c); setv('w_Q', Math.round(b.qw)); setv('w_T', c.Ts); setv('w_api', c.api); };

RUN.tank = () => {
  const d = num('t_d'), h = num('t_h'), fw = num('t_fw'), T = num('t_T'), api = num('t_api'), bsw = num('t_bsw');
  if (![d, h, fw, T, api, bsw].every(isFinite)) return;
  const bpf = tankBblPerFt(d), tov = bpf * h, fwv = bpf * fw, gov = tov - fwv;
  const cc = crudeCorr(api, T), gsv = gov * cc.vcf, nsv = gsv * (1 - bsw / 100);
  out('tank', `<div class="kvs">${KV('سعة لكل قدم', fmt(bpf, 1), 'bbl/ft')}${KV('TOV', fmt(tov, 0), 'bbl')}${KV('ماء حر', fmt(fwv, 0), 'bbl')}${KV('GOV', fmt(gov, 0), 'bbl')}${KV('API عند 60°F', fmt(cc.api60, 1), '°API')}${KV('VCF', fmt(cc.vcf, 4))}${KV('GSV', fmt(gsv, 0), 'bbl')}${KV('NSV', fmt(nsv, 0), 'bbl', 'ok')}</div>
   ${MSG(`الفرق بين TOV و NSV: ${fmt(tov - nsv, 0)} bbl (${fmt((tov - nsv) / tov * 100, 2)}%). هذا ما يفصل "ما قرأته على المقياس" عن "ما تُحاسب عليه".`)}`);
};

RUN.farm = () => {
  const q = num('f_q'), days = num('f_days'), d = num('f_d'), h = num('f_h'), fill = num('f_fill') / 100;
  if (![q, days, d, h, fill].every(isFinite)) return;
  const nom = tankBblPerFt(d) * h, work = nom * fill, need = q * days, n = Math.ceil(need / work);
  out('farm', `<div class="kvs">${KV('السعة الاسمية/خزان', fmt(nom, 0), 'bbl')}${KV('السعة العاملة', fmt(work, 0), 'bbl')}${KV('المطلوب', fmt(need, 0), 'bbl')}${KV('عدد الخزانات', fmt(n, 0), '', 'ok')}${KV('مع N+1', fmt(n + 1, 0))}</div>`);
};
FILL.farm = () => { const c = caseObj(); const b = stageBalance(c); setv('f_q', Math.round(b.qo)); };

RUN.pipe = () => {
  const p = { Q: num('p_Q'), id: num('p_id'), Lmi: num('p_L'), eps: num('p_eps'), api: num('p_api'), mu: num('p_mu'), dz: num('p_dz'), Pdel: num('p_pd') };
  const maop = num('p_maop'), eta = num('p_eta') / 100;
  if (!Object.values(p).every(isFinite) || !isFinite(maop) || !isFinite(eta) || eta <= 0) return;
  const r = pipeline(p);
  const st = Math.max(1, Math.ceil(r.Pdis / maop));
  const hpS = r.hpH / eta;
  out('pipe', `<div class="kvs">${KV('السرعة', fmt(r.v, 2), 'ft/s')}${KV('Reynolds', fmt(r.Re, 0))}${KV('f', fmt(r.f, 4))}${KV('ΔP احتكاك/ميل', fmt(r.dpPerMi, 1), 'psi/mi')}${KV('ΔP احتكاك', fmt(r.dpF, 0), 'psi')}${KV('ΔP ارتفاع', fmt(r.dpS, 0), 'psi')}${KV('ضغط التفريغ المطلوب', fmt(r.Pdis, 0), 'psig', r.Pdis > maop ? 'bad' : 'ok')}${KV('hp هيدروليكي', fmt(r.hpH, 0), 'hp')}${KV('hp على العمود', fmt(hpS, 0), 'hp')}${KV('زمن العبور', fmt(r.hrs, 1), 'h')}${KV('حجم الخط', fmt(r.vol, 0), 'bbl')}</div>
   ${r.lam ? MSG('تدفق رقائقي (laminar): نادر للخام الخفيف، شائع لثقيل جداً/بارد؛ الاحتكاك يتناسب خطياً مع اللزوجة.', 'warn') : ''}
   ${r.Pdis > maop ? MSG(`ضغط التفريغ يتجاوز MAOP: تحتاج ≈ ${st} محطات ضخ على الأقل، أو قطراً أكبر.`, 'bad') : MSG('ضمن MAOP لمحطة ضخ واحدة.', 'ok')}
   ${MSG('الاحتكاك يتناسب تقريباً مع Q^1.8–2 ومع 1/D^4.8–5: مضاعفة القطر تخفض الاحتكاك ≈ 25 مرة. هذا هو سبب أن تكبير الخط غالباً أرخص من محطات ضخ إضافية.')}`);
};
FILL.pipe = () => { const c = caseObj(); setv('p_api', c.api); };

RUN.frac = () => {
  const d = num('x_d') * 1e-6, h = num('x_h') * 0.0254, mu0 = num('x_mu'), sg = num('x_sg'), api = num('x_api');
  if (![d, h, mu0, sg, api].every(isFinite) || mu0 <= 0) return;
  const drho = sg * 999.016 - 999.016 * apiToSG(api);
  const mult = [1, 2, 5, 10, 30, 100];
  const t0 = h / stokesV(d, drho, mu0 * 1e-3);
  const rows = mult.map(m => { const mu = mu0 * m, v = stokesV(d, drho, mu * 1e-3), t = h / v; return `<tr><td class="n">${fmt(mu, 1)}</td><td class="n">${m}×</td><td class="n">${fmt(v * 1000, 3)}</td><td class="n">${t < 3600 ? fmt(t / 60, 1) + ' min' : fmt(t / 3600, 1) + ' h'}</td></tr>`; }).join('');
  out('frac', `<div class="tblwrap"><table><thead><tr><th class="n">μ الماء (cP)</th><th class="n">× النظيف</th><th class="n">v (mm/s)</th><th class="n">زمن الطفو</th></tr></thead><tbody>${rows}</tbody></table></div>
   ${MSG(`في الماء النظيف تحتاج القطرة ${fmt(t0 / 60, 1)} دقيقة لتصعد ${num('x_h')} بوصة. مع لزوجة 10× يصبح الزمن ${fmt(t0 * 10 / 60, 0)} دقيقة: الـ retention time المصمّم لن يكفي.`, 'warn')}`);
};

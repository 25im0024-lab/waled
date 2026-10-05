/* ===== Hydraulic fracturing tab ===== */
const HF_PH = [
  ['setup', 'تجهيز واختبار الضغط', 0, 0.04],
  ['break', 'Breakdown', 0.04, 0.12],
  ['dfit', 'Minifrac / DFIT', 0.12, 0.20],
  ['pad', 'Pad', 0.20, 0.36],
  ['prop', 'Proppant stages', 0.36, 0.74],
  ['flush', 'Flush', 0.74, 0.80],
  ['shut', 'Shut-in وإغلاق الشق', 0.80, 0.88],
  ['flow', 'Flowback', 0.88, 0.94],
  ['prod', 'إنتاج', 0.94, 1.0]
];
const HF_TXT = {
  setup: { t: 'تجهيز الموقع واختبار الضغط', p: 'الـ spread كله يُرصّ ويُربط بالـ wellhead (الـ frac tree). تُختبر الخطوط السطحية بالضغط قبل أي ضخ، وتُضبط صمامات الأمان (pop-off) وحدود ضغط الإيقاف.', n: 'قبل الضخ بساعات (الزمن حسب عدد المراحل)', w: 'اختبار ضغط ناجح بدون هبوط، وحدود الإيقاف مضبوطة تحت تصنيف الـ wellhead.' },
  break: { t: 'Breakdown وinjectivity', p: 'بعد الـ perforation يُضخ ماء (وأحياناً حمض خفيف spearhead مثل HCl) لتنظيف الـ perforations وكسر الصخر. يرتفع الضغط حتى ضغط الانهيار (breakdown pressure)، ثم يهبط فجأة حين يبدأ الشق، ويزداد الاستقبال (injectivity).', n: 'دقائق؛ معدل منخفض ≈ عدة bpm', w: 'ضغط الانهيار والهبوط المفاجئ، ثم ISIP عند إيقاف الضخ.' },
  dfit: { t: 'Minifrac / DFIT (معايرة)', p: 'ضخ حجم صغير ثم إيقاف الضخ ومراقبة هبوط الضغط. منه يُستخرج closure stress ومعامل التسرب (leak-off) وكفاءة الشق: مدخلات لتصميم المعالجة الرئيسية. تُجرى غالباً على بئر/مرحلة منتقاة وليس كل مرحلة.', n: 'من عشرات الدقائق إلى ساعات لتفسير الإغلاق', w: 'منحنى Pressure falloff: نقطة الإغلاق (closure).' },
  pad: { t: 'Pad', p: 'سائل بلا proppant (أو قليل جداً) يفتح الشق ويؤسس العرض والطول ويبني طبقة ترشيح على الجدران (filter cake) تقلل التسرب. جزء من الـ pad يتسرب إلى الصخر، لذا يُصمَّم حجمه بحيث لا ينفد قبل وصول الـ proppant إلى الطرف.', n: 'غالباً ≈ ربع إلى نصف الحجم الكلي (يتفاوت بين التصميمات)', w: 'الضغط الصافي (net pressure) وارتفاع ISIP وسلوك الشق (نمو الارتفاع).' },
  prop: { t: 'مراحل الـ proppant', p: 'يُرفع تركيز الـ proppant (بوحدة ppg = lb لكل gallon) على خطوات. الـ gel أو سرعة الـ slickwater يحمل الحبيبات إلى عمق الشق. الخطر الأكبر screenout: تجمع proppant يسد الشق عند الجدار أو الطرف فيقفز الضغط وتُوقف المعالجة.', n: 'تركيز يصل إلى عدة ppg في الـ gel؛ أقل في slickwater', w: 'الضغط السطحي، تركيز الـ proppant عند الـ blender وعند الـ wellhead، ومعدل الضخ.' },
  flush: { t: 'Flush', p: 'ماء خفيف يدفع الـ slurry المتبقي في البئر نحو الـ perforations. الحجم يساوي حجم البئر تقريباً: الزيادة (overflush) تبعد الـ proppant عن البئر فتخلق منطقة ضيقة قرب البئر (pinch)، والنقص (underflush) يترك proppant في البئر.', n: '≈ حجم البئر من السطح إلى الـ perforations', w: 'حجم الـ flush المحسوب مقابل المضخوخ.' },
  shut: { t: 'Shut-in وإغلاق الشق وكسر الـ gel', p: 'عند إيقاف الضخ يُقرأ ISIP. يتسرب السائل إلى الصخر فينخفض ضغطه تحت closure stress، فيُغلق الشق على الـ proppant. الـ breaker يخفض لزوجة الـ gel ليتحرك للخارج، وتبقى حزمة الـ proppant مفتوحة. عرض الشق النهائي هو عرض حزمة الدعم (propped width).', n: 'دقائق إلى ساعات حتى يُغلق الشق', w: 'ISIP، زمن الإغلاق، وفعالية الـ breaker.' },
  flow: { t: 'Flowback وتنظيف', p: 'في الـ plug-and-perf تُحفر الـ plugs أولاً ثم يُفتح البئر عبر choke صغير ويُوسَّع تدريجياً. يعود سائل الـ frac ومعه gel مكسور وبعض residue وربما proppant. إدارة الـ choke تحمي حزمة الدعم. تفاصيل ما يحدث بالسطح في تبويب "من الـ frac إلى السطح".', n: 'من ساعات إلى أسابيع', w: 'معدل العودة، محتوى الرمل، لزوجة السائل العائد، وضغط الـ wellhead.' },
  prod: { t: 'الإنتاج', p: 'الهيدروكربونات تتحرك من matrix الصخر نحو الشق (تدفق خطي)، ثم عبر حزمة الـ proppant إلى البئر. قدرة الشق على التوصيل (fracture conductivity) مقابل نفاذية المكمن هي ما يحدد النتيجة. في المكامن المحكمة يهبط الإنتاج بسرعة في الأشهر الأولى.', n: 'سنوات', w: 'منحنى الـ decline، GOR وwater cut، ومقارنة الأداء بالتصميم.' }
};

/* ---- fluids / proppants data ---- */
const HF_FLUIDS = [
  ['Slickwater', 'ماء + friction reducer (polyacrylamide) بكميات صغيرة', 'لزوجة منخفضة جداً (قريبة من الماء)', 'معدلات ضخ عالية؛ الـ proppant يُحمل بالسرعة ويهبط أسرع', 'شقوق معقدة، حجم ماء كبير؛ شائع في الـ shale'],
  ['Linear gel', 'ماء + guar أو مشتقاته (بدون crosslinker)', 'لزوجة متوسطة', 'يحمل proppant أفضل من slickwater', 'حجم أقل للمياه؛ بعض residue'],
  ['Crosslinked gel', 'guar + crosslinker (borate أو zirconate) + breaker', 'لزوجة عالية جداً عند الحرارة المصمَّمة', 'تعليق ممتاز للـ proppant وشق أعرض', 'مكامن أعمق/أدفأ؛ خطر residue وتلف التوصيل إذا لم يُكسر جيداً'],
  ['Foam / Energized', 'سائل + N₂ أو CO₂', 'لزوجة ظاهرية مرتفعة وحجم سائل أقل', 'تنظيف سريع بعد الشغل', 'مكامن حساسة للماء أو ضغط منخفض'],
  ['VES (viscoelastic surfactant)', 'surfactant يكوّن micelles خيطية', 'لزوجة مرنة بلا بوليمر', 'لا residue بوليمري؛ يتكسر بالهيدروكربونات أو التخفيف', 'حساسية للحرارة وتكلفة أعلى']
];
const HF_PROP = [
  ['Sand (رمل)', '≈ 2.65', 'الأرخص والأكثر استعمالاً؛ يتحمل إجهادات إغلاق منخفضة إلى متوسطة'],
  ['Resin-coated sand', '≈ 2.5–2.6', 'يتماسك فيقلل رجوع الـ proppant (flowback)'],
  ['Ceramic (سيراميك)', '≈ 2.7–3.3', 'يتحمل إجهادات عالية ويعطي توصيلاً أعلى؛ أغلى'],
  ['Lightweight ceramic', '≈ 2.7', 'أخف فيُنقل أسهل في سوائل أقل لزوجة']
];
const HF_EQ = [
  ['tanks', 'خزانات المياه', 'Frac tanks', 'مئات إلى آلاف البراميل. الماء يمر عبر manifold إلى الـ blender. يُدار الماء (تسخين شتاءً، biocide، تحليل ملوحة) لأن جودة الماء تحدد أداء الـ gel.'],
  ['chem', 'وحدة الكيماويات', 'Chemical unit', 'تحقن friction reducer، polymer/gel، crosslinker، breaker، biocide، surfactant. يُضبط معدل كل مادة آلياً من غرفة التحكم.'],
  ['sand', 'الـ proppant', 'Sand / proppant storage', 'صوامع أو sand kings مع حزام ناقل (conveyor) يغذي الـ blender. المعدل بآلاف lb/min عند الذروة.'],
  ['blender', 'الـ Blender', 'Blender', 'يخلط الماء والكيماويات والـ proppant في slurry متجانس بتركيز مضبوط، ثم يغذي المضخات بضغط منخفض.'],
  ['pumps', 'مضخات الضغط العالي', 'Frac pumps (HHP)', 'مجموعة شاحنات مضخات (قدرة كل منها آلاف hp). تعمل بالتوازي لتعطي المعدل المطلوب والضغط الكلي، مع مضخات احتياطية.'],
  ['manifold', 'الـ Manifold عالي الضغط', 'Missile / zipper manifold', 'يجمع تدفق المضخات في خط عالي الضغط واحد إلى الـ wellhead، ويتيح التبديل بين الآبار (zipper frac).'],
  ['well', 'الـ Wellhead', 'Frac tree', 'شجرة خاصة بالـ frac بتصنيف ضغط أعلى من شجرة الإنتاج، مع صمامات عزل. تُحمل عليها وحدة الـ wireline أثناء setting الـ plug والـ perforation.'],
  ['wire', 'وحدة الـ wireline', 'Wireline unit', 'كابل فولاذي ينزل في البئر (عبر lubricator فوق الـ frac tree) ومعه plug وperforating guns. يثبّت الـ plug لعزل المراحل المنتهية ثم يطلق الـ guns لعمل ثقوب العناقيد، ثم يُسحب قبل ضخ المرحلة التالية.'],
  ['van', 'غرفة البيانات', 'Data van', 'تراقب الضغط والمعدل وتركيز الـ proppant لحظياً. منها يُقرر تعديل الجدول الزمني أو إيقافه عند screenout أو ضغط خطر.']
];

/* ---- timeline functions (illustrative, parametrised by the calcs) ---- */
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = x => Math.max(0, Math.min(1, x));
function hfParams() {
  const g = (id, d) => { const e = document.getElementById(id); const v = e ? parseFloat(e.value) : NaN; return isFinite(v) ? v : d; };
  return { q: g('hp_q', 60), cmax: g('hf_cmax', 4), pnet: g('hp_pnet', 800), TVD: g('hp_tvd', 8000), Gf: g('hp_gf', 0.73), fric: HFCACHE.fric || 2500, spg: g('hp_spg', 2.65) };
}
const HFCACHE = {};
function hfRate(t, qm) { if (t < 0.04) return 0; if (t < 0.12) return 10 * sm(0.04, 0.05, t); if (t < 0.14) return 12; if (t < 0.20) return 0; if (t < 0.22) return qm * sm(0.20, 0.22, t); if (t < 0.80) return qm; return 0; }
function hfProp(t, cm) { if (t < 0.36 || t >= 0.74) return 0; const lv = [0.125, 0.25, 0.5, 0.75, 1]; return cm * lv[Math.min(4, Math.floor((t - 0.36) / 0.076))]; }
function hfPn(t) {
  if (t < 0.04) return 0;
  if (t < 0.075) return 1.35 * sm(0.04, 0.075, t);
  if (t < 0.085) return 1.35 - 0.6 * sm(0.075, 0.085, t);
  if (t < 0.12) return 0.75 + 0.05 * sm(0.085, 0.12, t);
  if (t < 0.14) return 0.85;
  if (t < 0.20) return 0.85 * Math.exp(-(t - 0.14) / 0.022) + 0.02;
  if (t < 0.22) return 0.05 + 0.85 * sm(0.20, 0.22, t);
  if (t < 0.80) { let p = 0.9 + 0.22 * Math.sqrt((t - 0.22) / 0.58); if (t >= 0.36 && t < 0.74) p += 0.015 * Math.floor((t - 0.36) / 0.076); return p; }
  if (t < 0.88) return 1.05 * (1 - sm(0.80, 0.88, t));
  return 0;
}
function hfLen(t) {
  if (t < 0.04) return 0;
  if (t < 0.12) return 0.05 * sm(0.04, 0.085, t);
  if (t < 0.20) return 0.05 + 0.05 * sm(0.12, 0.14, t);
  if (t < 0.80) return 0.10 + 0.90 * Math.pow((Math.min(t, 0.80) - 0.20) / 0.60, 0.8);
  return 1;
}
function hfState(t) {
  const P = hfParams(), pn = hfPn(t), q = hfRate(t, P.q), c = hfProp(t, P.cmax);
  const sig = HFCACHE.sigC || P.Gf * P.TVD;
  const pp = HFCACHE.pp || 0.44 * P.TVD;
  const bhp = pn > 0.001 ? sig + pn * P.pnet : pp;
  const rho = slurryDensity(c, P.spg);
  const ps = bhp - 0.052 * rho * P.TVD + P.fric * Math.pow(q / Math.max(P.q, 1), 1.8);
  return { pn, q, c, bhp, ps: Math.max(ps, 0), L: hfLen(t), sig };
}
function hfPhaseOf(t) { for (const p of HF_PH) if (t >= p[2] && t < p[3]) return p; return HF_PH[HF_PH.length - 1]; }

/* ---- state ---- */
const HFS = { t: 0, playing: false, last: 0, dur: 70, speed: 1, fluid: 'xl', barrier: 'strong', breaker: 'good', cv: null, ctx: null };
const HF_VISC = { sw: 2, lg: 25, xl: 300 };
function hfVisc() { return HFS.fluid === 'cu' ? (parseFloat((document.getElementById('hf_mu') || {}).value) || 50) : HF_VISC[HFS.fluid]; }
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
function tok() { const cs = getComputedStyle(document.documentElement); const g = n => cs.getPropertyValue(n).trim(); return { earth: g('--earth'), earth2: g('--earth2'), surface: g('--surface'), ink: g('--ink'), muted: g('--muted'), oil: g('--oil'), oilbg: g('--oil-bg'), water: g('--water'), waterbg: g('--water-bg'), gas: g('--gas'), accent: g('--accent'), soft: g('--accent-soft'), bg: g('--bg'), line: g('--line') }; }

function hfChartSVG() {
  const P = hfParams();
  const W = 1000, H = 250, L = 52, R = 14, N = 220;
  const x = t => L + t * (W - L - R);
  const panels = [
    { y0: 8, h: 70, key: 'ps', col: 'var(--accent)', lab: 'surface pressure (psi)', f: t => hfState(t).ps },
    { y0: 94, h: 70, key: 'q', col: 'var(--water)', lab: 'rate (bpm)', f: t => hfState(t).q },
    { y0: 180, h: 60, key: 'c', col: 'var(--oil)', lab: 'proppant (ppg)', f: t => hfState(t).c }
  ];
  let s = `<svg class="chart" id="hfchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="مخطط المعالجة: الضغط السطحي والمعدل وتركيز الـ proppant مقابل الزمن">`;
  HF_PH.forEach(ph => { const a = x(ph[2]), b = x(ph[3]); s += `<rect x="${a}" y="4" width="${b - a}" height="${H - 8}" style="fill:${ph[0] === 'pad' || ph[0] === 'flush' || ph[0] === 'flow' ? 'var(--surface2)' : 'transparent'};opacity:.6"/>`; });
  panels.forEach(p => {
    const vals = []; for (let i = 0; i <= N; i++) { const t = i / N; vals.push(p.f(t)); }
    const mx = Math.max(...vals, 1) * 1.08;
    const Y = v => p.y0 + p.h - (v / mx) * p.h;
    s += `<line class="axis" x1="${L}" x2="${W - R}" y1="${p.y0 + p.h}" y2="${p.y0 + p.h}"/><text x="${L - 6}" y="${p.y0 + 10}" text-anchor="end">${fmt(mx / 1.08, 0)}</text><text x="${L - 6}" y="${p.y0 + p.h}" text-anchor="end">0</text><text class="tt" x="${L + 6}" y="${p.y0 + 11}" style="fill:${p.col}">${p.lab}</text>`;
    s += `<polyline points="${vals.map((v, i) => `${x(i / N).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" style="fill:none;stroke:${p.col};stroke-width:2"/>`;
  });
  HF_PH.forEach(ph => { const a = x(ph[2]), b = x(ph[3]); if (b - a > 38) s += `<text x="${(a + b) / 2}" y="${H - 1}" text-anchor="middle" style="font-size:10px">${ph[0]}</text>`; });
  s += `<line id="hfmark" x1="${x(0)}" x2="${x(0)}" y1="4" y2="${H - 12}" style="stroke:var(--ink);stroke-width:1.5"/></svg>`;
  return s;
}
function hfSyncChartMark() { const m = document.getElementById('hfmark'); if (!m) return; const x = 52 + HFS.t * (1000 - 52 - 14); m.setAttribute('x1', x); m.setAttribute('x2', x); }

function hfUpdateUI() {
  const t = HFS.t, S = hfState(t), ph = hfPhaseOf(t), tx = HF_TXT[ph[0]];
  const sl = document.getElementById('hf_t'); if (sl && +sl.value !== Math.round(t * 1000)) sl.value = Math.round(t * 1000);
  $$('.phchip').forEach(b => b.setAttribute('aria-pressed', b.dataset.ph === ph[0]));
  const d = document.getElementById('hf_ph'); if (d && d.dataset.k !== ph[0]) { d.dataset.k = ph[0]; d.innerHTML = `<h3>${tx.t}</h3><p>${tx.p}</p><div class="msg" style="margin-top:10px"><b>الزمن الفعلي النموذجي:</b> ${tx.n}</div><p style="margin-top:8px;color:var(--muted);font-size:13.5px"><b>ما يراقبه المهندس:</b> ${tx.w}</p>`; }
  const ro = document.getElementById('hf_ro'); if (ro) ro.innerHTML = `${KV('الضغط السطحي', fmt(S.ps, 0), 'psi')}${KV('BHP', fmt(S.bhp, 0), 'psi')}${KV('closure σ_min', fmt(S.sig, 0), 'psi')}${KV('المعدل', fmt(S.q, 0), 'bpm')}${KV('Proppant', fmt(S.c, 1), 'ppg')}${KV('طول الشق (نسبي)', fmt(S.L * 100, 0), '%')}`;
  hfSyncChartMark(); hfDraw();
}
function hfLoop(ts) {
  if (!HFS.playing) return;
  if (!HFS.last) HFS.last = ts;
  const dt = (ts - HFS.last) / 1000; HFS.last = ts;
  HFS.t += dt / HFS.dur * HFS.speed;
  if (HFS.t >= 1) { HFS.t = 1; HFS.playing = false; const b = document.getElementById('hf_play'); if (b) b.textContent = 'تشغيل'; }
  hfUpdateUI();
  if (HFS.playing) requestAnimationFrame(hfLoop);
}
function hfPlay(on) {
  HFS.playing = on; HFS.last = 0;
  const b = document.getElementById('hf_play'); if (b) b.textContent = on ? 'إيقاف مؤقت' : 'تشغيل';
  if (on) { if (HFS.t >= 1) HFS.t = 0; requestAnimationFrame(hfLoop); }
}
function hfSetT(t) { HFS.t = clamp01(t); hfUpdateUI(); }

/* ---- stress picture ---- */
function stressSVG() {
  return `<svg class="chart" viewBox="0 0 520 300" role="img" aria-label="ثلاثة إجهادات رئيسية: العمودي، الأفقي الأكبر، الأفقي الأصغر؛ الشق العمودي يتشكل عمودياً على الإجهاد الأصغر">
  <g style="fill:none;stroke:var(--ink);stroke-width:1.6"><path d="M150 90h150v110H150z"/><path d="M150 90l50-40h150l-50 40"/><path d="M300 90l50-40v110l-50 40"/></g>
  <path d="M215 60 L215 195 L285 160 L285 55z" style="fill:var(--water-bg);stroke:var(--accent);stroke-width:2;opacity:.95"/>
  <text x="250" y="130" text-anchor="middle" class="tt" style="fill:var(--accent);font-weight:600">fracture</text>
  <defs><marker id="sk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1L10 5L0 9z" style="fill:var(--ink)"/></marker></defs>
  <g style="stroke:var(--ink);stroke-width:2.2;fill:none" marker-end="url(#sk)"><path d="M225 6V44" marker-end="url(#sk)"/><path d="M225 250V212" marker-end="url(#sk)"/><path d="M60 140H140" marker-end="url(#sk)"/><path d="M440 140H360" marker-end="url(#sk)"/><path d="M60 230L130 195" marker-end="url(#sk)"/></g>
  <text x="262" y="20" class="tt">σ_v (overburden)</text><text x="262" y="262" class="tt">σ_v</text>
  <text x="30" y="132" class="tt">σ_hmin</text><text x="448" y="132" class="tt">σ_hmin</text><text x="18" y="256" class="tt">σ_Hmax</text>
  <text x="260" y="290" text-anchor="middle" class="tt" style="fill:var(--muted)">الشق يفتح عمودياً على أصغر إجهاد (هنا σ_hmin) ويمتد في اتجاه σ_Hmax</text></svg>`;
}

/* ---- build ---- */
function buildHF() {
  $('#pane-hf').innerHTML = `
  <p class="lead">التكسير الهيدروليكي يضخ سائلاً بضغط يتجاوز إجهاد الصخر فيُنشئ شقاً، ثم يحمل مادة دعم (proppant) تبقي الشق مفتوحاً بعد توقف الضخ. من هنا يبدأ مسار جديد للهيدروكربونات: من الصخر إلى الشق إلى البئر. هذه الصفحة تبني المشهد بالترتيب: الموقع، ثم الضخ والشق، ثم السوائل، ثم الإنتاج.</p>

  <div class="sec"><h2>١. موقع التكسير <small>Frac spread</small></h2>
  <div class="mapwrap">${spreadSVG()}</div>
  <div class="steps" id="eqchips">${HF_EQ.map(e => `<button type="button" class="step" data-eqb="${e[0]}" aria-pressed="false">${e[1]}</button>`).join('')}</div>
  <div class="legend"><span><i style="border-color:var(--water)"></i>ماء/سائل منخفض الضغط</span><span><i style="border-color:var(--oil)"></i>proppant</span><span><i style="border-color:var(--ink)"></i>ضغط عالٍ</span><span>اضغط أي معدّة للشرح.</span></div>
  <div class="detail" id="spr_detail" style="margin-top:12px;grid-template-columns:1fr"></div></div>

  <div class="sec"><h2>٢. من الضخ إلى الشق إلى الإنتاج <small>محاكاة متزامنة</small></h2>
  <div class="simbar"><button class="btn pri" id="hf_play" type="button">تشغيل</button><button class="btn" id="hf_rst" type="button">من البداية</button>
   <label class="f" for="hf_t" style="flex:1;min-width:180px"><span class="fl">الزمن (غير خطي: الدقائق ← الساعات ← الأيام ← السنوات)</span><input id="hf_t" type="range" min="0" max="1000" value="0" style="width:100%"></label></div>
  <div class="phchips" id="hf_chips">${HF_PH.map(p => `<button class="step phchip" type="button" data-ph="${p[0]}" aria-pressed="false">${p[1]}</button>`).join('')}</div>
  <div class="simopts">
   ${SEL('hf_fl', 'السائل الحامل', [['sw', 'Slickwater (≈ 2 cP)'], ['lg', 'Linear gel (shear-thinning)'], ['xl', 'Crosslinked gel (shear-thinning)'], ['cu', 'لزوجة مخصصة']], 'xl')}
   ${F('hf_mu', 'اللزوجة المخصصة', 50, 'cP')}${F('hf_cmax', 'أقصى تركيز proppant', 4, 'ppg')}
   ${SEL('hf_bar', 'الحواجز الإجهادية', [['strong', 'قوية (الشق محصور)'], ['weak', 'ضعيفة (ينمو الارتفاع)']], 'strong')}
   ${SEL('hf_brk', 'فعالية الـ breaker', [['good', 'جيدة'], ['poor', 'ضعيفة (residue)']], 'good')}</div>
  <div class="canvaswrap"><canvas id="hfcv" role="img" aria-label="محاكاة الشق: منظر جانبي لطول وارتفاع الشق، ومقطع عرضي لعرضه، مع توزيع الـ proppant وإغلاق الشق والإنتاج"></canvas></div>
  <div class="legend" style="margin-top:6px"><span><b>يسار:</b> منظر جانبي (الطول × الارتفاع)، النقاط السوداء = proppant</span><span><b>يمين:</b> مقطع عمودي على مستوى الشق (العرض مبالغ فيه)</span><span>الأسهم السوداء = إجهاد الصخر، الزرقاء = ضغط السائل</span></div>
  <div class="calc" style="margin-top:12px;padding:12px"><div class="kvs" id="hf_ro"></div></div>
  <div class="detail" id="hf_ph" style="margin-top:12px;grid-template-columns:1fr"></div>
  <figure style="margin-top:14px" id="hf_chartwrap"></figure>
  <div class="note warn">الشكل نوعي: الأزمنة والمنحنيات مُمثَّلة لتوضيح التسلسل، ومدخلاتها (closure، net pressure، الاحتكاك، المعدل) من الحاسبات في الأسفل، وليست مخرجات نموذج انتشار شق (مثل PKN/KGD/pseudo-3D). النموذج الحقيقي يعتمد على المكمن وبيانات الـ DFIT.</div></div>

  <div class="sec"><h2>٣. كيف يتشكل الشق؟ <small>الإجهادات تحدد كل شيء</small></h2>
  <div class="twocol"><div><ul class="tight">
   <li>الصخر تحت ثلاثة إجهادات رئيسية. <b>الشق يفتح عمودياً على أصغرها</b> لأن الضغط يحتاج أقل جهد لدفع الجدران في هذا الاتجاه ${BADGE.e}.</li>
   <li>في الأعماق العادية يكون أصغر إجهاد أفقياً (σ_hmin) فتتكون شقوق <b>عمودية</b>؛ في الأعماق الضحلة جداً أو مع tectonics قد يصبح الأصغر هو العمودي فتتكون شقوق أفقية (Hubbert & Willis, 1957) ${BADGE.e}.</li>
   <li><b>Breakdown:</b> يبدأ الشق عند جدار البئر عندما يتجاوز الإجهاد المماسي قوة شد الصخر. من حل Kirsch: P_bd = 3σ_h − σ_H − p_p + T₀ لسائل لا يخترق الصخر ${BADGE.e}.</li>
   <li><b>Propagation:</b> بعد البدء يكفي أن يتجاوز ضغط السائل <b>closure stress</b> (≈ σ_hmin) بمقدار الـ net pressure اللازم لفتح الشق وتحمل الاحتكاك بداخله ${BADGE.e}.</li>
   <li><b>العرض</b> يتناسب مع net pressure × الارتفاع ÷ معامل الصخر (E′)، لذا الصخر الصلب يعطي شقاً أضيق، وهذا يتحدى مرور الـ proppant ${BADGE.e}.</li>
   <li><b>الارتفاع</b> يتوقف عند طبقات بإجهاد أعلى (barriers). عندما يضعف الفرق ينمو الارتفاع خارج المكمن ويضيع السائل والـ proppant ${BADGE.e}. جرّب "الحواجز الضعيفة" في المحاكاة.</li>
   <li>في الـ shale مع الشقوق الطبيعية قد تتشكل <b>شبكة شقوق معقدة</b> بدل جناحين مستويين ${BADGE.i}.</li></ul></div>
  <figure>${stressSVG()}<figcaption>الإجهادات الرئيسية الثلاثة واتجاه الشق العمودي.</figcaption></figure></div>
  ${panel('hs', 'الإجهادات وضغط الانهيار', 'Eaton (uniaxial strain): σ_h = ν/(1−ν)(σ_v − αp_p) + αp_p + tectonic. وضغط الانهيار لسائل لا يخترق الصخر: P_bd = 3σ_h − σ_H − p_p + T₀. هذه تقديرات مسبقة وتُعايَر بـ DFIT أو سجلات الإجهاد (sonic).',
    F('hs_tvd', 'TVD', 8000, 'ft') + F('hs_gob', 'تدرج overburden', 1.0, 'psi/ft') + F('hs_gp', 'تدرج ضغط المسام', 0.44, 'psi/ft') + F('hs_nu', 'Poisson ν', 0.25, '') + F('hs_al', 'Biot α', 1.0, '') + F('hs_tec', 'tectonic إضافي', 0, 'psi') + F('hs_dsh', 'σ_H − σ_h', 500, 'psi') + F('hs_t0', 'قوة الشد T₀', 500, 'psi'), { fill: true })}</div>

  <div class="sec"><h2>٤. السوائل والـ proppant <small>الجل يعلّق، والـ proppant يُبقي الشق مفتوحاً</small></h2>
  <p class="lead">الـ gel يؤدي ثلاث مهام: يحمل الـ proppant ويمنعه من الهبوط، ويعطي لزوجة تنتج عرض شق كافياً، ويقلل التسرب. لكنه يجب أن ينكسر بعد الشغل (breaker) كي لا يسد حزمة الدعم. هذا بالضبط مجال أطروحتك.</p>
  <div class="tblwrap"><table><thead><tr><th>السائل</th><th>التركيب</th><th>الخاصية</th><th>التعليق/النقل</th><th>الاستعمال/المحاذير</th></tr></thead><tbody>${HF_FLUIDS.map(r => `<tr>${r.map(c => `<td style="white-space:normal;min-width:130px">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="tblwrap" style="margin-top:12px"><table><thead><tr><th>الـ proppant</th><th>SG</th><th>ملاحظة</th></tr></thead><tbody>${HF_PROP.map(r => `<tr>${r.map(c => `<td style="white-space:normal;min-width:130px">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="note">قاعدة يكثر ذكرها: لزوجة ≈ 100 cP عند ≈ 170 s⁻¹ كحد أدنى لتعليق جيد في الـ gel ${BADGE.i}. تتفاوت بين المصادر والحقول، ولا تعوّض اختبار الـ rheology عند حرارة المكمن ومعدل القص الفعلي (ISO 13503-1 لقياس لزوجة سوائل الإكمال ${BADGE.i}).</div>
  ${htPanel()}</div>

  <div class="sec"><h2>٥. تعدد المراحل <small>Plug-and-perf</small></h2>
  <p class="lead">البئر الأفقي لا يُكسَّر دفعة واحدة. يُقسَّم إلى مراحل: يُثبَّت plug لعزل ما تم، ثم تُثقب مجموعة عناقيد (clusters)، ثم يُضخ pad وproppant، ثم يتكرر الأمر نحو الـ heel. الشقوق المتجاورة تؤثر على بعضها (stress shadowing)، لذا تباعد العناقيد قرار تصميم ${BADGE.e}.</p>
  <div class="simbar"><button class="btn pri" id="pp_play" type="button">تشغيل</button><label class="f" for="pp_v" style="flex:1;min-width:180px"><span class="fl">التقدم عبر المراحل</span><input id="pp_v" type="range" min="0" max="800" value="0" style="width:100%"></label></div>
  <div class="mapwrap" style="margin-top:8px">${ppSVG()}</div><div class="msg" id="pp_msg" style="margin-top:8px"></div></div>

  <div class="sec"><h2>٦. حسابات التصميم</h2>
  ${panel('hp', 'الضغط السطحي وقدرة المضخات', 'BHTP = تدرج الشق×TVD + net pressure + perforation friction + tortuosity. الضغط السطحي = BHTP − الضغط الهيدروستاتيكي + احتكاك الأنبوب. احتكاك الـ perforations: Δp = 0.2369·q²·ρ/(C_d²·N²·d⁴). HHP = P·q/40.8 (psi، bpm).',
    F('hp_tvd', 'TVD', 8000, 'ft') + F('hp_gf', 'تدرج الشق', 0.73, 'psi/ft') + F('hp_pnet', 'net pressure', 800, 'psi') + F('hp_q', 'المعدل', 60, 'bpm') + F('hp_ppg', 'تركيز الـ proppant', 2, 'ppg') + F('hp_spg', 'SG للـ proppant', 2.65, '') + F('hp_id', 'ID للـ casing', 4.778, 'in') + F('hp_fr', 'تخفيض الاحتكاك (FR)', 70, '%') + F('hp_np', 'عدد الـ perforations', 60, '') + F('hp_dp', 'قطر الـ perf', 0.38, 'in') + F('hp_cd', 'Cd', 0.85, '') + F('hp_tort', 'tortuosity', 300, 'psi') + F('hp_unit', 'قدرة المضخة الواحدة', 2250, 'hhp') + F('hp_util', 'نسبة الاستخدام', 80, '%') + F('hp_sb', 'احتياطي', 15, '%') + F('hp_rate', 'تصنيف الـ wellhead', 10000, 'psi'), { fill: true })}
  <div style="height:14px"></div>
  ${panel('hb', 'ميزان المادة وتوصيل الشق', 'الكتلة: مساحة الشق A = M_p/C_p، ونصف الطول x_f = A/(2h_f). عرض الحزمة w_p = C_p/(ρ_p(1−φ)). F_CD = k_f·w_p/(k·x_f) (Prats 1961؛ Cinco-Ley & Samaniego). k_f المحسوبة تُضرب بنسبة التوصيل المتبقي بعد ضرر الـ gel.',
    F('hb_vi', 'السائل الكلي', 6000, 'bbl') + F('hb_eta', 'كفاءة الشق', 40, '%') + F('hb_mp', 'كتلة الـ proppant', 150000, 'lb') + F('hb_cp', 'تركيز مساحي C_p', 1.5, 'lb/ft²') + F('hb_spg', 'SG', 2.65, '') + F('hb_phi', 'مسامية الحزمة', 0.38, '') + F('hb_hf', 'ارتفاع الشق', 150, 'ft') + F('hb_kf', 'نفاذية الحزمة k_f', 60, 'D') + F('hb_ret', 'التوصيل المتبقي بعد الضرر', 50, '%') + F('hb_k', 'نفاذية المكمن k', 0.5, 'md'))}
  <div class="note">أرقام k_f تعتمد على نوع الـ proppant وإجهاد الإغلاق والحرارة والزمن. وتظل نسبة التوصيل المتبقي (retained conductivity) بعد ضرر الـ gel أحد أهم الأرقام المتأثرة بالـ residue. قِسها مخبرياً (ISO 13503-5 للتوصيل ${BADGE.i}).</div></div>

  <div class="sec"><h2>٧. بعد الشغل: الإنتاج <small>Decline</small></h2>
  ${panel('ha', 'منحنى هبوط الإنتاج (Arps)', 'q(t) = q_i / (1 + b·D_i·t)^(1/b). الـ b بين 0 (أُسّي) و1 (توافقي) وقد يتجاوز 1 في الـ shale أثناء التدفق العابر. المعادلة تصف الشكل ولا تتنبأ به: تُعايَر ببيانات الإنتاج.',
    F('ha_qi', 'المعدل الأولي q_i', 900, 'bbl/d') + F('ha_di', 'D_i الاسمي', 1.5, '1/yr') + F('ha_b', 'b', 1.0, '') + F('ha_lim', 'حد الجدوى', 15, 'bbl/d') + F('ha_T', 'الأفق الزمني', 10, 'yr'))}</div>
  ${prodSection()}`;
  /* wire */
  HFS.cv = document.getElementById('hfcv');
  const eq = id => { const e = HF_EQ.find(x => x[0] === id); const d = document.getElementById('spr_detail'); $$('#spreadsvg .eqn').forEach(g => g.classList.toggle('sel', g.dataset.eq === id)); $$('#eqchips .step').forEach(b => b.setAttribute('aria-pressed', b.dataset.eqb === id)); d.innerHTML = `<div><h3>${e[1]}<span class="en">${e[2]}</span></h3><p>${e[3]}</p></div>`; };
  HFS.eq = eq; eq('blender');
  hfRefresh();
  ppRender();
}
function hfRefresh() { const w = document.getElementById('hf_chartwrap'); if (w) w.innerHTML = hfChartSVG() + '<figcaption>الضغط السطحي والمعدل وتركيز الـ proppant عبر المراحل (نوعي). الشريط الرمادي = مراحل pad/flush/flowback.</figcaption>'; hfUpdateUI(); if (typeof prodUpdate === 'function' && document.getElementById('prcv')) prodUpdate(); }

/* ---- calcs ---- */
RUN.hs = () => {
  const p = { TVD: num('hs_tvd'), Gob: num('hs_gob'), Gp: num('hs_gp'), nu: num('hs_nu'), alpha: num('hs_al'), tect: num('hs_tec'), dSH: num('hs_dsh'), T0: num('hs_t0') };
  if (!Object.values(p).every(isFinite) || p.nu >= 1) return;
  const r = stressCalc(p); HFCACHE.sigC = r.sh; HFCACHE.pp = r.pp;
  out('hs', `<div class="kvs">${KV('σ_v', fmt(r.sv, 0), 'psi')}${KV('p_p', fmt(r.pp, 0), 'psi')}${KV('σ_hmin (closure)', fmt(r.sh, 0), 'psi', 'ok')}${KV('σ_Hmax', fmt(r.sH, 0), 'psi')}${KV('تدرج closure', fmt(r.fg, 3), 'psi/ft')}${KV('P_bd (قاع البئر)', fmt(r.pbd, 0), 'psi')}${KV('تدرج الانهيار', fmt(r.pbdG, 3), 'psi/ft')}</div>
   ${r.vertical ? MSG('σ_hmin < σ_v: الشق عمودي (vertical) ويفتح عمودياً على σ_hmin.', 'ok') : MSG('σ_h > σ_v: يُتوقع شق أفقي (horizontal): حالة ضحلة أو tectonic قوي.', 'warn')}
   ${MSG(`فرق الضغط الواجب: لكي ينتشر الشق يجب أن يتجاوز ضغط السائل ${fmt(r.sh, 0)} psi (≈ closure) بمقدار الـ net pressure؛ والانهيار الأولي أعلى منه بنحو ${fmt(r.pbd - r.sh, 0)} psi.`)}`);
  hfRefresh();
};
FILL.hs = () => { const c = caseObj(); setv('hs_tvd', c.TVD); };

RUN.hp = () => {
  const p = { TVD: num('hp_tvd'), Gf: num('hp_gf'), pnet: num('hp_pnet'), q: num('hp_q'), ppg: num('hp_ppg'), spg: num('hp_spg'), id: num('hp_id'), mu: 1, fr: num('hp_fr'), nperf: num('hp_np'), dperf: num('hp_dp'), cd: num('hp_cd'), tort: num('hp_tort'), unit: num('hp_unit'), util: num('hp_util'), standby: num('hp_sb') };
  const rate = num('hp_rate'); if (!Object.values(p).every(isFinite) || !isFinite(rate) || p.nperf <= 0) return;
  const r = hfPressure(p);
  HFCACHE.fric = Math.max(r.dpF + r.dpPerf + p.tort, 0); HFCACHE.rating = rate;
  out('hp', `<div class="kvs">${KV('BHTP', fmt(r.bhtp, 0), 'psi')}${KV('Δp للـ perforations', fmt(r.dpPerf, 0), 'psi', r.dpPerf > 1500 ? 'warn' : '')}${KV('الضغط الهيدروستاتيكي', fmt(r.hyd, 0), 'psi')}${KV('احتكاك الأنبوب (بعد FR)', fmt(r.dpF, 0), 'psi')}${KV('الضغط السطحي', fmt(r.ps, 0), 'psi', r.ps > rate * 0.9 ? 'bad' : 'ok')}${KV('HHP', fmt(r.hhp, 0), 'hp')}${KV('عدد المضخات', fmt(r.units, 0), '', 'ok')}${KV('سرعة التدفق', fmt(r.v, 1), 'ft/s')}${KV('Proppant', fmt(r.propLbMin, 0), 'lb/min')}${KV('', fmt(r.propLbMin * 60 / 2000, 1), 'ton/hr')}</div>
   ${r.ps > rate * 0.9 ? MSG('الضغط السطحي قريب من تصنيف الـ wellhead (أو أعلى منه): خفّض المعدل أو زد الـ perforations أو راجع الـ FR.', 'bad') : MSG(`ضغط السطح أقل من ${fmt(rate * 0.9, 0)} psi (90% من التصنيف).`, 'ok')}
   ${MSG('احتكاك الأنبوب لسائل بلزوجة الماء مع FR ثابتة؛ الحقيقة تعتمد على تصميم السائل وتتغير مع تركيز الـ proppant. الصيغة ببارامترات Newtonian (Swamee–Jain).')}`);
  hfRefresh();
};
FILL.hp = () => { const c = caseObj(); setv('hp_tvd', c.TVD); };

RUN.hb = () => {
  const p = { Vi: num('hb_vi'), eta: num('hb_eta'), Mp: num('hb_mp'), Cp: num('hb_cp'), spg: num('hb_spg'), phi: num('hb_phi'), hf: num('hb_hf'), kf: num('hb_kf'), ret: num('hb_ret'), k: num('hb_k') };
  if (!Object.values(p).every(isFinite) || p.Cp <= 0 || p.k <= 0) return;
  const r = fracBalance(p);
  const cls = r.FCD < 1 ? 'bad' : r.FCD < 10 ? 'ok' : 'ok';
  out('hb', `<div class="kvs">${KV('مساحة الشق (جناحان)', fmt(r.A, 0), 'ft²')}${KV('نصف الطول x_f', fmt(r.xf, 0), 'ft')}${KV('عرض ديناميكي متوسط', fmt(r.wbar * 12, 2), 'in')}${KV('عرض الحزمة w_p', fmt(r.wp * 12, 3), 'in')}${KV('k_f الفعالة', fmt(r.kfEff / 1000, 1), 'D')}${KV('F_CD', fmt(r.FCD, 2), '', cls)}</div>
   ${r.FCD < 1 ? MSG('F_CD أقل من 1: الشق محدود التوصيل (choked)؛ الإنتاج يتقيد بتوصيل الحزمة وليس بمساحة الشق.', 'bad') : r.FCD < 10 ? MSG('F_CD بين 1 و10: متوازن تقريباً. القيمة ≈ 1.6 تُذكر كمثلى لتعظيم الأداء عند كتلة proppant ثابتة (Prats؛ Valko & Economides).', 'ok') : MSG('F_CD أعلى من 10: توصيل الشق كبير مقارنة بالمكمن؛ زيادة الطول أنفع من زيادة العرض.', 'ok')}
   ${r.ratio < 1.2 ? MSG('العرض الديناميكي أقل من عرض الحزمة بقليل: المدخلات غير متسقة (الـ proppant لن يدخل الشق). زد الكفاءة أو الحجم أو قلل C_p.', 'warn') : MSG(`العرض الديناميكي ≈ ${fmt(r.ratio, 1)}× عرض الحزمة: تقلص العرض عند الإغلاق طبيعي.`, '')}
   ${MSG('الحساب افتراضي مبسط: يُعطي طولاً مكافئاً لتوزيع متجانس. التوزيع الحقيقي لـ C_p غير منتظم (هبوط proppant، tortuosity).')}`);
};

RUN.ha = () => {
  const qi = num('ha_qi'), Di = num('ha_di'), b = num('ha_b'), lim = num('ha_lim'), T = num('ha_T');
  if (![qi, Di, b, lim, T].every(isFinite) || Di <= 0 || b < 0) return;
  const pts = []; for (let m = 0; m <= T * 12; m++) pts.push([m, arpsQ(qi, Di, b, m / 12)]);
  const q1 = arpsQ(qi, Di, b, 1), np = arpsNp(qi, Di, b, T);
  let tEcon = null; for (let m = 1; m <= 1200; m++) if (arpsQ(qi, Di, b, m / 12) <= lim) { tEcon = m / 12; break; }
  const xm = Math.max(12, Math.ceil(T * 12 / 12) * 12);
  out('ha', `<figure>${lineChart({ xmax: xm, ymax: niceMax(qi * 1.05), xlab: 'months', ylab: 'bbl/d', series: [{ pts, color: 'var(--oil)', label: 'q(t)' }], hlines: [{ y: lim, color: 'var(--gas)', label: 'economic limit' }], aria: 'منحنى هبوط الإنتاج' })}</figure>
   <div class="kvs">${KV('هبوط السنة الأولى', fmt((1 - q1 / qi) * 100, 0), '%')}${KV('q بعد سنة', fmt(q1, 0), 'bbl/d')}${KV('q بعد 5 سنوات', fmt(arpsQ(qi, Di, b, 5), 0), 'bbl/d')}${KV(`تراكمي ${fmt(T, 0)} سنوات`, fmt(np / 1000, 0), 'Mbbl')}${KV('عمر الجدوى', tEcon ? fmt(tEcon, 1) : '>100', 'yr')}</div>
   ${b > 1 ? MSG('b > 1: صالحة أثناء التدفق العابر فقط؛ على المدى الطويل تُحوَّل إلى معدل هبوط نهائي (terminal decline) لتفادي المبالغة في EUR.', 'warn') : ''}`);
};

/* ---- events ---- */
function hfInit() {
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'hf_t') { HFS.playing = false; const b = document.getElementById('hf_play'); if (b) b.textContent = 'تشغيل'; hfSetT(+t.value / 1000); }
    if (t.id === 'hf_fl') { HFS.fluid = t.value; hfUpdateUI(); }
    if (t.id === 'hf_mu') hfUpdateUI();
    if (t.id === 'hf_cmax') hfRefresh();
    if (t.id === 'hf_bar') { HFS.barrier = t.value; hfUpdateUI(); }
    if (t.id === 'hf_brk') { HFS.breaker = t.value; hfUpdateUI(); }
    if (t.id === 'pp_v') { PP.playing = false; const b = document.getElementById('pp_play'); if (b) b.textContent = 'تشغيل'; PP.v = +t.value; ppRender(); }
  });
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.id === 'hf_play') return hfPlay(!HFS.playing);
    if (t.id === 'hf_rst') { hfPlay(false); hfSetT(0); return; }
    const ch = t.closest('.phchip'); if (ch) { const p = HF_PH.find(x => x[0] === ch.dataset.ph); hfPlay(false); hfSetT(p[2] + (p[3] - p[2]) * 0.55); return; }
    if (t.id === 'pp_play') { PP.playing = !PP.playing; PP.last = 0; t.textContent = PP.playing ? 'إيقاف مؤقت' : 'تشغيل'; if (PP.playing) { if (PP.v >= 800) PP.v = 0; requestAnimationFrame(ppLoop); } return; }
    const eq = t.closest('#spreadsvg .eqn'); if (eq && HFS.eq) HFS.eq(eq.dataset.eq);
    const eb = t.closest('[data-eqb]'); if (eb && HFS.eq) HFS.eq(eb.dataset.eqb);
  });
  document.addEventListener('keydown', e => { const eq = e.target.closest && e.target.closest('#spreadsvg .eqn'); if (eq && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); HFS.eq(eq.dataset.eq); } });
  window.addEventListener('resize', () => hfDraw());
  if (window.matchMedia) { const mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', () => hfDraw()); }
}

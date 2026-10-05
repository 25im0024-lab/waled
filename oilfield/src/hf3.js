/* ===== Rheology-aware settling + production path (matrix -> fracture -> well -> surface) ===== */
const HF_RHEO = {
  sw: { type: 'newt', mu: 0.002 },
  lg: { type: 'cross', eta0: 0.12, einf: 0.003, lam: 0.1, m: 0.45 },
  xl: { type: 'cross', eta0: 60, einf: 0.02, lam: 6, m: 0.65 }
};
function hfSettleNorm() {
  const model = HFS.fluid === 'cu' ? { type: 'newt', mu: (parseFloat((document.getElementById('hf_mu') || {}).value) || 50) * 1e-3 } : HF_RHEO[HFS.fluid];
  const r = settleRheo({ d: 600e-6, rp: 2650, rf: 1000, c: 0.1, w: 0.2 * 0.0254, gc: 1, model });
  return Math.min(1, r.v * 7200 / 30);
}

/* ---- log-log chart ---- */
function logChart(o) {
  const W = 640, H = 300, L = 62, R = 16, T = 14, B = 42;
  const lx = Math.log10(o.xmin), hx = Math.log10(o.xmax), ly = Math.log10(o.ymin), hy = Math.log10(o.ymax);
  const X = x => L + (Math.log10(Math.max(x, o.xmin)) - lx) / (hx - lx) * (W - L - R), Y = y => T + (1 - (Math.log10(Math.max(y, o.ymin)) - ly) / (hy - ly)) * (H - T - B);
  const lab = v => { const e = Math.round(Math.log10(v)); return e === 0 ? '1' : e === 1 ? '10' : e === 2 ? '100' : '1e' + e; };
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria || ''}">`;
  for (let e = Math.ceil(ly); e <= Math.floor(hy); e++) { const y = Y(Math.pow(10, e)); s += `<line class="gridl" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${lab(Math.pow(10, e))}</text>`; }
  for (let e = Math.ceil(lx); e <= Math.floor(hx); e++) { const x = X(Math.pow(10, e)); s += `<line class="gridl" x1="${x}" x2="${x}" y1="${T}" y2="${H - B}"/><text x="${x}" y="${H - B + 16}" text-anchor="middle">${lab(Math.pow(10, e))}</text>`; }
  s += `<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${H - B}"/>`;
  s += `<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">${o.xlab}</text><text transform="rotate(-90)" x="${-(T + H - B) / 2}" y="13" text-anchor="middle">${o.ylab}</text>`;
  (o.series || []).forEach(se => { const p = se.pts.filter(q => q[1] > 0).map(q => X(q[0]).toFixed(1) + ',' + Y(q[1]).toFixed(1)).join(' '); s += `<polyline points="${p}" style="fill:none;stroke:${se.color};stroke-width:2.4;${se.dash ? 'stroke-dasharray:6 4;' : ''}stroke-linejoin:round"/>`; });
  (o.marks || []).forEach(m => { s += `<circle cx="${X(m.x)}" cy="${Y(m.y)}" r="5.5" style="fill:${m.color || 'var(--ink)'};stroke:var(--bg);stroke-width:2"/><text class="tt" x="${X(m.x) + (m.dx || 10)}" y="${Y(m.y) + (m.dy || -8)}" text-anchor="${m.anchor || 'start'}">${m.label}</text>`; });
  (o.series || []).forEach((se, i) => { s += `<line x1="${L + 8}" x2="${L + 26}" y1="${T + 8 + i * 15}" y2="${T + 8 + i * 15}" style="stroke:${se.color};stroke-width:2.4;${se.dash ? 'stroke-dasharray:6 4' : ''}"/><text class="tt" x="${L + 32}" y="${T + 12 + i * 15}">${se.label}</text>`; });
  return s + '</svg>';
}

/* ---- settling panel (replaces the Newtonian one) ---- */
const HT_PRESETS = {
  sw: { model: 'newt', mu: 2, rf: 1000, note: 'Slickwater: لزوجة قريبة من الماء (≈ 2 cP) وعدم تعليق فعلي: الحمل بالسرعة.' },
  lg: { model: 'cross', e0: 0.12, einf: 3, lam: 0.1, m: 0.45, rf: 1000, note: 'Linear gel (≈ 25 lb/Mgal guar): ≈ 30 cP عند 100 s⁻¹ في هذا النموذج.' },
  xl: { model: 'cross', e0: 60, einf: 20, lam: 6, m: 0.65, rf: 1050, note: 'Crosslinked gel: ≈ 900 cP عند 100 s⁻¹ لكن لزوجته عند قص منخفض أعلى بآلاف المرات.' }
};
function htPanel() {
  const mf = (m, html) => `<div class="mf" data-m="${m}" style="display:contents">${html}</div>`;
  return panel('ht', 'سرعة هبوط الـ proppant في سائل shear-thinning', 'توازن وزن/سحب لحبيبة كروية مع معامل سحب Schiller–Naumann، ولزوجة تتغير مع معدل القص (Newtonian أو power-law أو Cross)، وتصحيح التزاحم (Richardson–Zaki)، وتأثير جدران الشق (Faxén). معدل القص الفعلي حول الحبيبة ≈ معامل × v/d، ويُحسب بالتكرار.',
    SEL('ht_pre', 'سائل جاهز (قيم توضيحية)', [['sw', 'Slickwater'], ['lg', 'Linear gel'], ['xl', 'Crosslinked gel'], ['cu', 'مخصص']], 'xl') +
    SEL('ht_model', 'نموذج اللزوجة', [['newt', 'Newtonian'], ['pl', 'Power-law'], ['cross', 'Cross (plateau)']], 'cross') +
    F('ht_d', 'قطر الحبيبة', 600, 'µm') + F('ht_rp', 'كثافة الـ proppant', 2650, 'kg/m³') + F('ht_rf', 'كثافة السائل', 1050, 'kg/m³') + F('ht_c', 'التركيز', 2, 'ppg') + F('ht_w', 'عرض الشق', 0.2, 'in') + F('ht_H', 'ارتفاع الشق', 100, 'ft') + F('ht_res', 'زمن مكوث الـ slurry', 60, 'min') + F('ht_gc', 'معامل معدل القص', 1, '×v/d') +
    mf('newt', F('ht_mu', 'اللزوجة', 2, 'cP')) +
    mf('pl', F('ht_K', 'K (consistency)', 0.5, 'Pa·sⁿ') + F('ht_n', 'n (flow index)', 0.5, '')) +
    mf('cross', F('ht_e0', 'η₀ (قص صفري)', 60, 'Pa·s') + F('ht_einf', 'η∞', 20, 'cP') + F('ht_lam', 'λ (زمن)', 6, 's') + F('ht_m', 'm', 0.65, '')));
}
function htModel() {
  const m = document.getElementById('ht_model').value;
  if (m === 'newt') return { type: 'newt', mu: num('ht_mu') * 1e-3 };
  if (m === 'pl') return { type: 'pl', K: num('ht_K'), n: num('ht_n'), einf: 1e-3 };
  return { type: 'cross', eta0: num('ht_e0'), einf: num('ht_einf') * 1e-3, lam: num('ht_lam'), m: num('ht_m') };
}
function htToggle() { const m = document.getElementById('ht_model').value; $$('#pane-hf .mf').forEach(e => e.hidden = e.dataset.m !== m); }
function htApplyPreset(k) {
  if (k === 'cu') return; const p = HT_PRESETS[k]; setv('ht_model', p.model); setv('ht_rf', p.rf);
  if (p.model === 'newt') setv('ht_mu', p.mu); if (p.model === 'cross') { setv('ht_e0', p.e0); setv('ht_einf', p.einf); setv('ht_lam', p.lam); setv('ht_m', p.m); }
  htToggle();
}
RUN.ht = () => {
  const model = htModel();
  const d = num('ht_d') * 1e-6, rp = num('ht_rp'), rf = num('ht_rf'), ppg = num('ht_c'), w = num('ht_w') * 0.0254, H = num('ht_H') * 0.3048, res = num('ht_res'), gc = num('ht_gc');
  if (![d, rp, rf, ppg, w, H, res, gc].every(isFinite) || d <= 0) return;
  const rpg = rp / 1000 * 8.345, c = (ppg / rpg) / (1 + ppg / rpg);
  const s = settleRheo({ d, rp, rf, model, c, w, gc });
  const tSet = H / s.v / 60;
  const e170 = etaModel(model, 170), sOld = settleRheo({ d, rp, rf, model: { type: 'newt', mu: e170 }, c, w, gc });
  const pts = []; for (let e = -4; e <= 3.001; e += 0.1) { const g = Math.pow(10, e); pts.push([g, etaModel(model, g)]); }
  const ys = pts.map(p => p[1]), ymin = Math.pow(10, Math.floor(Math.log10(Math.min(...ys)))), ymax = Math.pow(10, Math.ceil(Math.log10(Math.max(...ys))));
  const chart = logChart({ xmin: 1e-4, xmax: 1e3, ymin: Math.max(ymin, 1e-4), ymax: Math.max(ymax, ymin * 10), xlab: 'shear rate (1/s)', ylab: 'η (Pa·s)', series: [{ pts, color: 'var(--accent)', label: 'η(γ̇)' }], marks: [{ x: Math.max(s.gam, 1e-4), y: s.eta, label: 'حبيبة تهبط', color: 'var(--oil)', dx: 10, dy: -10 }, { x: 170, y: e170, label: '170 s⁻¹', color: 'var(--gas)', dx: -8, dy: -10, anchor: 'end' }], aria: 'منحنى اللزوجة مقابل معدل القص مع نقطة الحبيبة ونقطة 170' });
  out('ht', `<figure>${chart}</figure><div class="kvs">${KV('v الهبوط', fmt(s.v * 1000, s.v < 1e-3 ? 5 : 3), 'mm/s')}${KV('η عند الحبيبة', fmt(s.eta * 1000, 0), 'cP')}${KV('معدل القص', fmt(s.gam, 4), '1/s')}${KV('Reynolds', s.Re < 0.001 ? s.Re.toExponential(1) : fmt(s.Re, 4))}${KV('تزاحم (RZ)', fmt(s.hind, 3), '×')}${KV('جدران (Faxén)', fmt(s.wall, 3), '×')}${KV('زمن هبوط ' + fmt(H / 0.3048, 0) + ' ft', tSet < 120 ? fmt(tSet, 1) : tSet < 60 * 48 ? fmt(tSet / 60, 1) : fmt(tSet / 1440, 1), tSet < 120 ? 'min' : tSet < 60 * 48 ? 'h' : 'day', tSet < res ? 'bad' : 'ok')}</div>
   ${tSet < res ? MSG(`زمن الهبوط (${fmt(tSet, 1)} min) أقل من زمن المكوث (${res} min): يُتوقع تكوّن bank من الـ proppant في أسفل الشق.`, 'bad') : MSG('زمن الهبوط أكبر بكثير من زمن المكوث: التعليق جيد (من منظور اللزوجة فقط).', 'ok')}
   ${s.Re > 1 ? MSG('Re > 1: خارج مدى Stokes؛ استُخدم معامل Schiller–Naumann. في slickwater يُعتمد على سرعة التدفق لحمل الحبيبات.', 'warn') : ''}
   ${MSG(`لو استُعملت اللزوجة عند 170 s⁻¹ (${fmt(e170 * 1000, 0)} cP) كلزوجة ثابتة لخرجت السرعة ${fmt(sOld.v * 1000, 3)} mm/s، أي ${fmt(sOld.v / s.v, 1)}× السرعة الفعلية هنا. هذا هو سبب خطأ الحساب النيوتني القديم.`, 'warn')}
   ${MSG(HT_PRESETS[document.getElementById('ht_pre').value] ? HT_PRESETS[document.getElementById('ht_pre').value].note : 'نموذج مخصص.')}
   ${MSG('ما لا يشمله النموذج: المرونة (viscoelasticity) وإجهاد الخضوع، وكلاهما يبطئ الهبوط في gels الـ guar المتشابكة، وتأثير الميل والتدفق الجانبي. لذلك يعطي النموذج حداً أعلى لسرعة الهبوط عند وجود مرونة. المعاملات الفعلية (η₀, λ, m) تُؤخذ من rheometer لسائلك عند حرارة المكمن (Barbati وآخرون 2016 يراجعون دور الـ rheology في نقل الـ proppant).')}`);
  hfRefresh();
};

/* ======================= Production path ======================= */
const PR = { x: 300, playing: false, last: 0, speed: 1, cache: { key: '', S: null } };
const prDays = x => Math.pow(10, x / 1000 * Math.log10(7300));
const prLabel = d => d < 2 ? fmt(d * 24, 0) + ' ساعة' : d < 60 ? fmt(d, 0) + ' يوم' : d < 730 ? fmt(d / 30.4, 1) + ' شهر' : fmt(d / 365.25, 1) + ' سنة';
function prodSection() {
  return `<div class="sec"><h2>٨. كيف تُسحب الهيدروكربونات إلى البئر ثم إلى السطح <small>مصفوفة ← شق ← بئر ← فاصل</small></h2>
  <p class="lead">بعد الإغلاق والـ flowback، يعمل الشق كطريق سريع داخل صخر شبه عديم النفاذية. الضغط ينخفض أولاً عند وجه الشق ثم تنتشر جبهة الاستنزاف داخل المصفوفة ببطء (∝ √t)، فيصل النفط إلى الشق بتدفق خطي، ثم يجري داخل حزمة الـ proppant إلى الثقوب فالبئر الأفقي. وفي البئر العمودي ينخفض الضغط صعوداً فيتحرر الغاز، وإذا كان ضغط الرأس أقل من ضغط المنشأة لا يتدفق البئر دون رفع صناعي.</p>
  <div class="simbar"><button class="btn pri" id="pr_play" type="button">تشغيل</button><button class="btn" id="pr_rst" type="button">من البداية</button>
   <label class="f" for="pr_t" style="flex:1;min-width:180px"><span class="fl">الزمن منذ بدء الإنتاج: <b id="pr_tl" class="mono"></b></span><input id="pr_t" type="range" min="0" max="1000" value="300" style="width:100%"></label>
   <label class="f" for="pr_pwf" style="min-width:170px"><span class="fl">ضغط قاع البئر المتدفق Pwf: <b id="pr_pl" class="mono"></b></span><input id="pr_pwf" type="range" min="300" max="3200" step="50" value="1500" style="width:100%"></label>
   <label class="f" for="pr_lift" style="min-width:150px"><span class="fl">رفع صناعي (ESP)</span><span class="fi"><input id="pr_lift" type="checkbox" style="flex:0 0 auto;width:20px;margin-inline:8px"><input id="pr_dpp" type="number" value="1200" step="100"><b>psi</b></span></label></div>
  <div class="canvaswrap"><canvas id="prcv" role="img" aria-label="مسار الإنتاج: جبهة استنزاف الضغط في المصفوفة، تدفق النفط إلى الشقوق ثم البئر الأفقي، ثم صعوده في البئر العمودي مع تحرر الغاز إلى رأس البئر والفاصل والخزان"></canvas></div>
  <div class="legend" style="margin-top:6px"><span><b>يسار:</b> منظر علوي: البئر الأفقي والشقوق. اللون الأزرق = ضغط منخفض (مستنزَف)</span><span><b>يمين:</b> مقطع عمودي: البئر إلى السطح (الفقاعات = غاز متحرر)</span></div>
  <div class="calc" style="margin-top:10px;padding:12px"><div class="kvs" id="pr_ro"></div></div>
  <div id="pr_msg" style="margin-top:8px"></div>
  ${panel('hq', 'معدل الإنتاج من التدفق الخطي إلى الشقوق', 'نموذج دوال تحليلي لتدفق خطي عابر (infinite-acting) ثم استنزاف محدود بين الشقوق: q = A·k·Δp / (μ·√(π·η·t)) حيث η = k/(φ·μ·c_t) وA = 4·x_f·h_f لكل شق (جناحان × وجهان). عند تداخل الجبهات (t_e) يتحول إلى هبوط أُسّي يحفظ المادة. نفط أحادي الطور، توصيل الشق لا نهائي، Pwf ثابت.',
    F('hq_k', 'نفاذية المصفوفة k', 0.0005, 'md') + F('hq_phi', 'المسامية φ', 0.08, '') + F('hq_mu', 'لزوجة النفط', 1.0, 'cP') + F('hq_ct', 'الانضغاطية الكلية c_t', 0.000015, '1/psi') + F('hq_xf', 'نصف طول الشق x_f', 300, 'ft') + F('hq_hf', 'ارتفاع الشق h_f', 150, 'ft') + F('hq_nf', 'عدد الشقوق', 40, '') + F('hq_s', 'تباعد الشقوق', 150, 'ft'))}
  <div class="note warn">القيود: الغاز المذاب وتحرره في المصفوفة، والتدفق ثنائي الطور، وحساسية النفاذية للإجهاد، والتداخل بين الشقوق والآبار، كلها غير مشمولة. الواقع غالباً يعطي هبوطاً أبطأ على المدى الطويل (b > 1) من هذا النموذج. استعمله لفهم أن الهبوط المبكر ∝ 1/√t وأن التباعد والنفاذية يحددان زمن التداخل t_e، وليس للتنبؤ بـ EUR (قارن مع Wattenbarger وآخرين 1998 عن التدفق الخطي ${BADGE.i}).</div></div>`;
}
function prodParams() {
  const c = caseObj(), g = (id, d) => { const v = parseFloat((document.getElementById(id) || {}).value); return isFinite(v) ? v : d; };
  const b = stageBalance(c);
  return { c, b, k: g('hq_k', 0.0005), phi: g('hq_phi', 0.08), mu: g('hq_mu', 1), ct: g('hq_ct', 1.5e-5), xf: g('hq_xf', 300), hf: g('hq_hf', 150), nF: g('hq_nf', 40), s: g('hq_s', 150), Bo: b.Bo, pwf: Math.min(g('pr_pwf', 1500), c.Pr - 100), lift: !!(document.getElementById('pr_lift') || {}).checked, dpp: g('pr_dpp', 0) };
}
function prodCompute(td) {
  const P = prodParams(), key = [Math.round(Math.log10(td) * 200), P.pwf, P.lift, P.dpp, P.k, P.phi, P.mu, P.ct, P.xf, P.hf, P.nF, P.s, P.c.TVD, P.c.gor, P.c.wc, P.c.Pchk, P.c.Pr].join('|');
  if (PR.cache.key === key) return PR.cache.S;
  const dp = Math.max(P.c.Pr - P.pwf, 1), f = linFlow({ k: P.k, phi: P.phi, mu: P.mu, ct: P.ct, dp, xf: P.xf, hf: P.hf, nF: P.nF, s: P.s, Bo: P.Bo });
  const q = f.q(td), Np = f.Np(td), qL = q / Math.max(1 - P.c.wc / 100, 0.05), whpMin = P.c.Pchk + 14.696;
  const vp = vlpParams(P.c, 'none'); if (P.lift) { vp.dpPump = P.dpp; vp.zPump = P.c.TVD * 0.88; }
  const whp = qL > 1 ? whpFor(qL, vp, P.pwf) : P.c.Pchk + 14.696 + 50;
  const flows = whp !== null && whp >= whpMin; const rec = [];
  vlpPwf(Math.max(qL, 5), { ...vp, whp: Math.max(whp || whpMin, whpMin), rec });
  const Pb = standingPb(P.c.gor, P.c.Tres, P.c.api, P.c.gg);
  const S = { P, f, q, Np, qL, whp, whpMin, flows, rec, dist: f.dist(td), regime: td * 86400 < f.te * 86400 ? 'linear' : 'bdf', Pb, td, etaFt: 0.0002637 * P.k / (P.phi * P.mu * P.ct) };
  PR.cache = { key, S }; return S;
}
function prodUpdate() {
  const td = prDays(PR.x), S = prodCompute(td);
  const tl = document.getElementById('pr_tl'); if (tl) tl.textContent = prLabel(td);
  const pl = document.getElementById('pr_pl'); if (pl) pl.textContent = fmt(S.P.pwf, 0) + ' psi';
  const sl = document.getElementById('pr_t'); if (sl && +sl.value !== Math.round(PR.x)) sl.value = Math.round(PR.x);
  const ps = document.getElementById('pr_pwf'); if (ps) { ps.max = Math.max(400, Math.floor((S.P.c.Pr - 150) / 50) * 50); }
  const ro = document.getElementById('pr_ro'); if (ro) ro.innerHTML = `${KV('معدل النفط', fmt(S.q, 0), 'STB/d', S.flows ? 'ok' : 'bad')}${KV('تراكمي Np', fmt(S.Np / 1000, 1), 'Mbbl')}${KV('جبهة الاستنزاف', fmt(S.dist, 0), 'ft')}${KV('نظام التدفق', S.regime === 'linear' ? 'خطي عابر' : 'استنزاف محدود')}${KV('Drawdown', fmt(S.P.c.Pr - S.P.pwf, 0), 'psi')}${KV('WHP الناتج', S.whp === null ? '—' : fmt(S.whp - 14.696, 0), 'psig', S.flows ? 'ok' : 'bad')}`;
  const m = document.getElementById('pr_msg'); if (m) m.innerHTML = (S.flows ? MSG(`البئر يتدفق إلى المنشأة: ضغط الرأس ${fmt(S.whp - 14.696, 0)} psig أعلى من ضغط ما بعد الـ choke (${fmt(S.P.c.Pchk, 0)} psig).`, 'ok') : MSG(S.whp === null ? 'عند هذا المعدل وPwf لا يستطيع البئر رفع السائل حتى بضغط رأس صفري: يحتاج رفعاً صناعياً (ESP أو gas lift) أو رفع Pwf.' : `ضغط الرأس الناتج (${fmt(S.whp - 14.696, 0)} psig) أقل من ضغط المنشأة (${fmt(S.P.c.Pchk, 0)} psig): لن يتدفق البئر ذاتياً. فعّل الرفع الصناعي أو خفّض ضغط الفاصل.`, 'bad')) + (S.P.pwf < S.Pb ? MSG(`Pwf (${fmt(S.P.pwf, 0)}) أقل من Pb (${fmt(S.Pb, 0)} psia): الغاز يتحرر قرب البئر أيضاً، وهذا غير مشمول بنموذج المصفوفة.`, 'warn') : '');
  prodDraw(S);
}
function prodLoop(ts) { if (!PR.playing) return; if (!PR.last) PR.last = ts; const dt = (ts - PR.last) / 1000; PR.last = ts; PR.x += dt / 50 * 1000 * PR.speed; if (PR.x >= 1000) { PR.x = 1000; PR.playing = false; const b = document.getElementById('pr_play'); if (b) b.textContent = 'تشغيل'; } prodUpdate(); if (PR.playing) requestAnimationFrame(prodLoop); }
function prodPlay(on) { PR.playing = on; PR.last = 0; const b = document.getElementById('pr_play'); if (b) b.textContent = on ? 'إيقاف مؤقت' : 'تشغيل'; if (on) { if (PR.x >= 1000) PR.x = 0; requestAnimationFrame(prodLoop); } }

function prodDraw(S) {
  const cv = document.getElementById('prcv'); if (!cv) return;
  const dpr = window.devicePixelRatio || 1, W = 1000, H = 460, wpx = cv.clientWidth; if (!wpx) return;
  if (cv.width !== Math.round(wpx * dpr)) { cv.width = Math.round(wpx * dpr); cv.height = Math.round(wpx * dpr * H / W); }
  const ctx = cv.getContext('2d'), k = cv.width / W; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.direction = 'ltr';
  const T = tok(), tex = rockTex(ctx, T), now = performance.now() / 1000, P = S.P;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
  const qn = clamp01(Math.log10(S.q + 1) / 3.6), spd = S.flows ? 0.03 + 0.2 * qn : 0.004;
  /* ---- left: plan view ---- */
  ctx.fillStyle = tex.pay; ctx.fillRect(0, 20, 566, 420);
  const xs = [], NF = 7; for (let i = 0; i < NF; i++) xs.push(70 + i * 70);
  const pxFt = 70 / P.s, thr = S.td * 24, dfun = dxPx => erfc(dxPx / pxFt / (2 * Math.sqrt(S.etaFt * thr)));
  const LH = 100, yL = 240;
  ctx.save(); ctx.beginPath(); xs.forEach(x => { ctx.rect(x - 35, yL - LH - 8, 70, 2 * LH + 16); }); ctx.clip();
  for (let dx = 0; dx <= 35; dx += 1) { const f = dfun(dx); if (f < 0.01) break; xs.forEach(x => { ctx.fillStyle = T.water; ctx.globalAlpha = f * 0.62; ctx.fillRect(x + dx, yL - LH - 8, 1.2, 2 * LH + 16); ctx.fillRect(x - dx - 1.2, yL - LH - 8, 1.2, 2 * LH + 16); }); }
  ctx.globalAlpha = 1; ctx.restore();
  xs.forEach(x => { ctx.fillStyle = '#c9a15c'; ctx.fillRect(x - 2.5, yL - LH, 5, 2 * LH); ctx.strokeStyle = T.accent; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, yL - LH, 5, 2 * LH); });
  const lg = ctx.createLinearGradient(0, yL - 5, 0, yL + 5); lg.addColorStop(0, '#9aa3ab'); lg.addColorStop(0.5, '#e0e4e7'); lg.addColorStop(1, '#6f787f'); ctx.fillStyle = lg; ctx.fillRect(28, yL - 5, 530, 10);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.strokeRect(28, yL - 5, 530, 10);
  const pathLen = i => 30 + LH * 0.9 + (556 - xs[i]);
  ctx.fillStyle = T.oil;
  for (let j = 0; j < 110; j++) {
    const fi = j % NF, side = (j >> 3) & 1 ? 1 : -1, y0 = (hash(j, 41) - 0.5) * 1.8 * LH, L1 = 30, L2 = Math.abs(y0), L3 = 556 - xs[fi], u = ((j / 110 + now * spd) % 1) * (L1 + L2 + L3);
    let x, y; if (u < L1) { x = xs[fi] + side * (L1 - u); y = yL + y0; } else if (u < L1 + L2) { x = xs[fi]; y = yL + y0 * (1 - (u - L1) / L2); } else { x = xs[fi] + (u - L1 - L2); y = yL; }
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.3); ctx.fill();
  }
  ctx.fillStyle = T.muted; ctx.font = '12px "IBM Plex Mono",monospace'; ctx.textAlign = 'left'; ctx.fillText('plan view: horizontal well + fractures', 12, 38);
  ctx.fillText('toe', 28, yL + 24); ctx.textAlign = 'right'; ctx.fillText('heel →', 556, yL + 24);
  ctx.textAlign = 'center'; ctx.fillText(`depletion front ≈ ${fmt(S.dist, 0)} ft  (fracture spacing ${fmt(P.s, 0)} ft)`, 283, 428);
  /* ---- right: vertical section ---- */
  const ox = 580; ctx.fillStyle = T.surface; ctx.fillRect(ox, 20, 420, 70);
  ctx.fillStyle = tex.bar; ctx.fillRect(ox, 90, 420, 350); ctx.fillStyle = tex.pay; ctx.fillRect(ox, 335, 420, 60);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox, 90); ctx.lineTo(ox + 420, 90); ctx.stroke();
  ctx.fillStyle = T.muted; ctx.font = '12px "IBM Plex Mono",monospace'; ctx.textAlign = 'right'; ctx.fillText('pay zone (lateral end-on)', ox + 410, 352);
  const wx = ox + 62, yTop = 92, yBot = 366, yh = h => yBot - h * (yBot - yTop);
  ctx.fillStyle = '#b9bcb5'; ctx.fillRect(wx - 12, yTop, 5, yBot - yTop); ctx.fillRect(wx + 7, yTop, 5, yBot - yTop);
  const cg = ctx.createLinearGradient(wx - 7, 0, wx + 7, 0); cg.addColorStop(0, '#7b858d'); cg.addColorStop(0.5, '#c4cbd1'); cg.addColorStop(1, '#6f7881'); ctx.fillStyle = cg; ctx.fillRect(wx - 7, yTop, 14, yBot - yTop);
  ctx.fillStyle = T.oilbg; ctx.fillRect(wx - 4, yTop, 8, yBot - yTop);
  /* gas fraction vs height */
  const gfAt = h => { const z = (1 - h) * P.c.TVD, r = S.rec; if (!r.length) return 0; for (let i = 0; i < r.length; i++) if (r[i][0] >= z) return r[i][2]; return r[r.length - 1][2]; };
  const flowF = S.flows ? 1 : 0.06;
  for (let j = 0; j < 70; j++) { const h = ((j / 70 + now * 0.05 * flowF * (0.3 + qn)) % 1), gf = gfAt(h), isGas = hash(j, 55) < gf * 1.5, y = yh(h), r = isGas ? 1.3 + 2.6 * Math.min(gf * 1.5, 1) : 1.6;
    ctx.beginPath(); ctx.arc(wx + (hash(j, 56) - 0.5) * 5, y, r, 0, 6.3); ctx.fillStyle = isGas ? T.surface : T.oil; ctx.fill(); if (isGas) { ctx.strokeStyle = T.gas; ctx.lineWidth = 0.9; ctx.stroke(); } }
  ctx.beginPath(); ctx.arc(wx, yBot + 4, 10, 0, 6.3); ctx.fillStyle = '#6f787f'; ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#c9a15c'; for (let a = 0; a < 6.3; a += 0.9) { ctx.beginPath(); ctx.arc(wx + 18 * Math.cos(a), yBot + 4 + 18 * Math.sin(a), 2, 0, 6.3); ctx.fill(); }
  if (P.lift) { ctx.fillStyle = '#3b6ea5'; ctx.fillRect(wx - 11, 290, 22, 34); ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.strokeRect(wx - 11, 290, 22, 34); ctx.fillStyle = T.ink; ctx.font = '600 11px "IBM Plex Mono",monospace'; ctx.textAlign = 'left'; ctx.fillText(`ESP +${fmt(P.dpp, 0)} psi`, wx + 18, 312); }
  /* pressure bar */
  const pb = ox + 112, pg = ctx.createLinearGradient(0, yTop, 0, yBot); pg.addColorStop(0, T.water); pg.addColorStop(1, T.gas); ctx.fillStyle = pg; ctx.fillRect(pb, yTop, 8, yBot - yTop);
  ctx.fillStyle = T.ink; ctx.font = '600 11px "IBM Plex Mono",monospace'; ctx.textAlign = 'left'; ctx.fillText(`Pwf ${fmt(P.pwf, 0)} psi`, pb + 12, yBot - 4); ctx.fillText(S.whp === null ? 'WHP —' : `WHP ${fmt(S.whp - 14.696, 0)} psig`, pb + 12, yTop + 14);
  ctx.fillStyle = T.muted; ctx.font = '11px "IBM Plex Mono",monospace'; ctx.fillText('bubbles = gas liberated as P falls', pb + 12, 200);
  /* surface facilities */
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.fillStyle = '#98a1a8'; ctx.fillRect(wx - 10, 66, 20, 24); ctx.strokeRect(wx - 10, 66, 20, 24); ctx.fillStyle = '#b5382b'; ctx.fillRect(wx + 10, 70, 14, 10);
  ctx.strokeStyle = T.oil; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx + 24, 75); ctx.lineTo(ox + 200, 75); ctx.stroke(); ctx.setLineDash([6, 5]); ctx.lineDashOffset = -now * 40 * spd * 10; ctx.strokeStyle = T.bg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(wx + 24, 75); ctx.lineTo(ox + 200, 75); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#b9bcb5'; ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox + 118, 66); ctx.lineTo(ox + 118, 84); ctx.lineTo(ox + 134, 75); ctx.closePath(); ctx.moveTo(ox + 150, 66); ctx.lineTo(ox + 150, 84); ctx.lineTo(ox + 134, 75); ctx.closePath(); ctx.fill(); ctx.stroke();
  const sg = ctx.createLinearGradient(0, 52, 0, 90); sg.addColorStop(0, '#d7dce0'); sg.addColorStop(1, '#8d969f'); ctx.fillStyle = sg; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(ox + 200, 50, 110, 40, 18) : ctx.rect(ox + 200, 50, 110, 40); ctx.fill(); ctx.stroke();
  ctx.fillStyle = T.waterbg; ctx.fillRect(ox + 214, 80, 82, 7); ctx.fillStyle = T.oilbg; ctx.fillRect(ox + 214, 72, 82, 8);
  ctx.strokeStyle = T.gas; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox + 250, 50); ctx.lineTo(ox + 250, 32); ctx.lineTo(ox + 330, 32); ctx.stroke();
  ctx.strokeStyle = T.oil; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox + 310, 75); ctx.lineTo(ox + 350, 75); ctx.stroke();
  const tg = ctx.createLinearGradient(ox + 350, 0, ox + 410, 0); tg.addColorStop(0, '#c9ced4'); tg.addColorStop(0.5, '#eef0f2'); tg.addColorStop(1, '#8d939a'); ctx.fillStyle = tg; ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.fillRect(ox + 350, 40, 56, 50); ctx.strokeRect(ox + 350, 40, 56, 50);
  const lvl = clamp01(S.Np / Math.max(S.f.Npmax, 1)); ctx.fillStyle = T.oil; ctx.globalAlpha = 0.75; ctx.fillRect(ox + 353, 88 - 46 * lvl, 50, 46 * lvl); ctx.globalAlpha = 1;
  ctx.fillStyle = T.oil; for (let j = 0; j < 14; j++) { const u = ((j / 14 + now * spd * 2) % 1); const x = wx + 26 + u * 160; ctx.beginPath(); ctx.arc(x, 75, 2.3, 0, 6.3); ctx.fill(); }
  ctx.fillStyle = T.muted; ctx.font = '11px "IBM Plex Mono",monospace'; ctx.textAlign = 'center'; ctx.fillText('wellhead', wx, 60); ctx.fillText('choke', ox + 134, 60); ctx.fillText('separator', ox + 255, 46); ctx.fillText('tank', ox + 378, 36);
  ctx.textAlign = 'left'; ctx.fillText('vertical section: well → surface', ox + 6, 432);
  gauge(ctx, T, ox + 250, 250, 32, S.whp === null ? 0 : S.whp - 14.696, 2000, 'psig'); gauge(ctx, T, ox + 335, 250, 32, S.q, Math.max(500, S.f.q(1) * 0.9), 'STB/d');
  /* heel connector */
  ctx.strokeStyle = T.accent; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(556, yL); ctx.lineTo(ox + 34, yBot + 4); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = T.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(568, 20); ctx.lineTo(568, 440); ctx.stroke();
}

/* ---- rate-time chart + calc ---- */
RUN.hq = () => {
  const P = prodParams(), dp = Math.max(P.c.Pr - P.pwf, 1);
  const f = linFlow({ k: P.k, phi: P.phi, mu: P.mu, ct: P.ct, dp, xf: P.xf, hf: P.hf, nF: P.nF, s: P.s, Bo: P.Bo });
  if (![f.eta, f.te].every(isFinite)) return;
  const pts = []; for (let e = 0; e <= Math.log10(7300) + 0.001; e += 0.04) { const t = Math.pow(10, e); pts.push([t, f.q(t)]); }
  const qs = pts.map(p => p[1]).filter(v => v > 0), ymin = Math.pow(10, Math.floor(Math.log10(Math.max(Math.min(...qs), 0.01)))), ymax = Math.pow(10, Math.ceil(Math.log10(Math.max(...qs))));
  const td = prDays(PR.x);
  const chart = logChart({ xmin: 1, xmax: 10000, ymin: Math.max(ymin, 0.01), ymax: Math.max(ymax, ymin * 10), xlab: 'days', ylab: 'oil rate (STB/d)', series: [{ pts, color: 'var(--oil)', label: 'q(t)' }], marks: [{ x: Math.max(Math.min(f.te, 9000), 1), y: f.q(f.te), label: 't_e (تداخل الجبهات)', color: 'var(--gas)', dx: 10, dy: -10 }, { x: td, y: f.q(td), label: 'الآن', color: 'var(--ink)', dx: 10, dy: 14 }], aria: 'معدل الإنتاج مقابل الزمن بمقياس لوغاريتمي' });
  out('hq', `<figure>${chart}</figure><div class="kvs">${KV('الانتشار η', fmt(f.eta * 1e6, 2), '×10⁻⁶ m²/s')}${KV('t_e', f.te < 730 ? fmt(f.te / 30.4, 1) : fmt(f.te / 365.25, 1), f.te < 730 ? 'شهر' : 'سنة')}${KV('q بعد 30 يوماً', fmt(f.q(30), 0), 'STB/d')}${KV('q بعد سنة', fmt(f.q(365), 0), 'STB/d')}${KV('q بعد 5 سنوات', fmt(f.q(1826), 0), 'STB/d')}${KV('تراكمي 1 سنة', fmt(f.Np(365) / 1000, 0), 'Mbbl')}${KV('تراكمي 5 سنوات', fmt(f.Np(1826) / 1000, 0), 'Mbbl')}${KV('الحد الأعلى (استنزاف)', fmt(f.Npmax / 1000, 0), 'Mbbl')}</div>
   ${MSG('على المنحنى اللوغاريتمي يظهر التدفق الخطي كخط ميله −½ (q ∝ 1/√t). بعد t_e يصبح الهبوط أسرع (استنزاف محدود). زيادة عدد الشقوق أو تقليل التباعد تقدّم t_e وتزيد المعدل المبكر، لكنها لا تزيد الحد الأعلى للمصفوفة المستنزفة.')}
   ${MSG(`المعدل المبكر يتناسب مع √k وعدد الشقوق وطولها، ولا يعتمد على عرض الحزمة هنا لأن توصيل الشق مفترض لا نهائياً. تحقق من F_CD في القسم ٦ حتى لا تكون هذه الفرضية متفائلة.`)}`);
  PR.cache = { key: '', S: null }; if (document.getElementById('prcv')) prodUpdate();
};

function prodInit() {
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'pr_t') { prodPlay(false); PR.x = +t.value; prodUpdate(); }
    if (t.id === 'pr_pwf' || t.id === 'pr_lift' || t.id === 'pr_dpp') { PR.cache = { key: '', S: null }; safe('hq'); prodUpdate(); }
    if (t.id === 'ht_model') { htToggle(); const p = document.getElementById('ht_pre'); if (p) p.value = 'cu'; safe('ht'); }
    if (t.id === 'ht_pre') { htApplyPreset(t.value); safe('ht'); }
    if (t.closest && t.closest('#case')) { PR.cache = { key: '', S: null }; }
  });
  document.addEventListener('click', e => { const t = e.target; if (t.id === 'pr_play') return prodPlay(!PR.playing); if (t.id === 'pr_rst') { prodPlay(false); PR.x = 0; prodUpdate(); } });
  window.addEventListener('resize', () => prodUpdate());
  htToggle(); htApplyPreset('xl');
}

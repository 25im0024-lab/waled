/* ===== Init ===== */
function init() {
  $('#app').innerHTML = `<div class="top"><div class="brand"><h1>رحلة البرميل</h1><span>من قاع البئر إلى التصدير · أداة تعلّم هندسية</span></div>
    <div class="tabs" role="tablist">${TABS.map(([id, n]) => `<button class="tab" role="tab" type="button" data-tab="${id}" aria-selected="false">${n}</button>`).join('')}</div></div>
    ${caseHTML()}
    ${TABS.map(([id]) => `<main class="pane" id="pane-${id}" hidden></main>`).join('')}
    <div class="foot">أداة تعليمية: الحاسبات تقريبية وتعتمد على علاقات ارتباطية منشورة. لا تُستخدم للتصميم النهائي أو للقياس التجاري. راجع تبويب "مرجع" للحدود والمراجع.</div>`;
  buildMap(); buildWell(); buildSep(); buildGas(); buildStore(); buildTrouble(); buildFrac(); buildRef(); buildHF(); hfInit(); prodInit();
  const prev = $$('.pane'); void prev;

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'st_pre') { const v = STPRE[t.value]; setv('st_d', v[0]); setv('st_rp', v[1]); setv('st_rf', v[2]); setv('st_mu', v[3]); }
    if (t.closest && t.closest('#case')) runAll();
    else { const p = t.closest && t.closest('[data-calc]'); if (p && RUN[p.dataset.calc]) safe(p.dataset.calc); if (p && p.dataset.calc === 'nodal') safe('fall'); }
  });
  document.addEventListener('click', e => {
    const t = e.target;
    const tab = t.closest('[data-tab]'); if (tab) return showTab(tab.dataset.tab);
    const go = t.closest('[data-go]'); if (go) return showTab(go.dataset.go);
    const st = t.closest('.step'); if (st) return selectStage(+st.dataset.i);
    const nd = t.closest('#mapsvg .node'); if (nd) return selectStage(STAGES.findIndex(s => s.id === nd.dataset.stage));
    if (t.id === 'prevS') return selectStage(curStage - 1);
    if (t.id === 'nextS') return selectStage(curStage + 1);
    const fl = t.closest('[data-fill]'); if (fl) { FILL[fl.dataset.fill](); safe(fl.dataset.fill); return; }
    const ch = t.closest('.chip'); if (ch) { $$('.chip').forEach(c => c.setAttribute('aria-pressed', c === ch)); renderTrouble(ch.dataset.f); }
  });
  document.addEventListener('keydown', e => {
    const nd = e.target.closest && e.target.closest('#mapsvg .node');
    if (nd && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectStage(STAGES.findIndex(s => s.id === nd.dataset.stage)); }
  });
  runAll();
  opsInit();
  selectStage(0);
  showTab((location.hash || '').replace('#', '') || 'map');
  window.scrollTo(0, 0);
}
function safe(k) { try { RUN[k](); } catch (err) { console.error(k, err); } }
function runAll() { ['hs', 'hp', 'hb', 'ht', 'ha', 'hq', 'stream', 'fall', 'nodal', 'choke', 'al', 'sep', 'stokes', 'heat', 'comp', 'hyd', 'pw', 'tank', 'farm', 'pipe', 'frac'].forEach(safe); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

/* ===== bidi: isolate Latin/number runs inside Arabic text ===== */
const LAT_RE = /[A-Za-z0-9(Ͱ-Ͽ][A-Za-z0-9 .,:;\/%°≈<>±×÷·+\-−–'"µ²³⁰¹⁴-₉()=*^√→_′≥≤Ͱ-Ͽ]*/g;
function trimRun(s) {
  s = s.replace(/[ .,:;'"\-–−+=*^<>·]+$/, '');
  let bal = 0, bad = [];
  for (let i = 0; i < s.length; i++) { if (s[i] === '(') bal++; else if (s[i] === ')') { if (bal) bal--; else bad.push(i); } }
  if (bal) { let k = s.indexOf('('); s = s.slice(0, k) ? s.slice(0, k) : ''; s = s.replace(/[ .,:;'"\-–−+=*^<>·]+$/, ''); }
  if (bad.length && bad[bad.length - 1] === s.length - 1) s = s.slice(0, -1);
  return s;
}
function wrapText(node) {
  const t = node.nodeValue; if (!/[A-Za-z0-9Ͱ-Ͽ]/.test(t) || !/[؀-ۿ]/.test(t)) return;
  const frag = document.createDocumentFragment(); let last = 0, any = false; LAT_RE.lastIndex = 0; let m;
  while ((m = LAT_RE.exec(t))) {
    let run = trimRun(m[0]); if (!run || !/[A-Za-z0-9Ͱ-Ͽ]/.test(run)) continue;
    const start = m.index; const end = start + run.length;
    if (start > last) frag.appendChild(document.createTextNode(t.slice(last, start)));
    const b = document.createElement('bdi'); b.dir = 'ltr'; b.textContent = run; frag.appendChild(b); last = end; any = true; LAT_RE.lastIndex = end;
  }
  if (!any) return;
  if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
  node.parentNode.replaceChild(frag, node);
}
function fixBidi(root) {
  if (!root || root.nodeType === 8) return;
  if (root.nodeType === 3) { if (!root.parentNode.closest('svg,script,style,bdi,option,textarea,.ltr')) wrapText(root); return; }
  if (root.nodeType !== 1 || root.closest('svg,script,style,bdi,option,textarea')) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentNode.closest('svg,script,style,bdi,option,textarea,.ltr') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode); nodes.forEach(wrapText);
}
(function () {
  const start = () => {
    const app = document.getElementById('app'); if (!app) return;
    fixBidi(app);
    let pend = false; const q = new Set();
    const mo = new MutationObserver(ms => { ms.forEach(m => m.addedNodes.forEach(n => q.add(n))); if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; mo.disconnect(); q.forEach(n => { if (n.isConnected) fixBidi(n); }); q.clear(); mo.observe(app, { childList: true, subtree: true }); }); } });
    mo.observe(app, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0)); else setTimeout(start, 0);
})();

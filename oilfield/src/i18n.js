/* ===== Language: Arabic (source) / English =====
   Arabic is the source text. In English mode every text node, title/placeholder/aria-label and canvas label
   is translated as it appears, using EN_DICT (en.js). Latin/number runs inside a sentence (WOB, 3,500 psi, ...)
   become {0},{1},... in the dictionary key, so live numbers still match. Switching language reloads the page,
   because the Arabic view wraps Latin runs in <bdi> elements, which cannot be undone cleanly in place. */
const I18N = (function () {
  const AR_RE = /[؀-ۿ]/;
  const RUN_RE = /[A-Za-z0-9٠-٩#Ͱ-Ͽµ°%$][A-Za-z0-9٠-٩#Ͱ-Ͽµ°%$.,\/_²³⁰-₉'’+\-−–×·=<>≈≤≥()→:\[\] ]*/g;
  const TRAIL_RE = /[ .,:;'’\-–−+=·(\[)\]]*$/;
  function parse(s) {
    const args = [];
    const key = String(s).replace(/\s+/g, ' ').trim().replace(RUN_RE, m => {
      const t = m.match(TRAIL_RE)[0], core = m.slice(0, m.length - t.length);
      if (!core) return m;
      args.push(core); return '#' + t;
    });
    return { key, args };
  }
  const KEY = 'oilfield-lang';
  function getLang() {
    try { const q = new URLSearchParams(location.search).get('lang'); if (q === 'en' || q === 'ar') return q; } catch (e) { }
    try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'ar'; } catch (e) { return 'ar'; }
  }
  const lang = typeof location === 'undefined' ? 'ar' : getLang();
  const dict = typeof EN_DICT === 'undefined' ? {} : EN_DICT;
  const missing = new Set();
  function tr(s) {
    if (lang !== 'en' || typeof s !== 'string' || !AR_RE.test(s)) return s;
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    const p = parse(s), out = resolve(p.key, p.args, true);
    if (out == null) { missing.add(p.key); return s; }
    return lead + out + trail;
  }
  // '^' at the start of a template capitalizes the result (for labels that begin with an English term: "choke size")
  const fill = (tpl, args) => { const cap = tpl[0] === '^', r = (cap ? tpl.slice(1) : tpl).replace(/\{(\d+)\}/g, (_, i) => args[+i] == null ? '' : args[+i]); return cap ? r.charAt(0).toUpperCase() + r.slice(1) : r; };
  const nHash = k => (k.match(/#/g) || []).length;
  // exact key; then numbering "#. X" and markers "X (+)"; then (for lists built at runtime) split on Arabic comma / semicolon / colon
  function resolve(key, args, split) {
    if (dict[key] != null) return fill(dict[key], args);
    let m = key.match(/^#\. (.+)$/);
    if (m) { const r = resolve(m[1], args.slice(1), split); return r == null ? null : args[0] + '. ' + r; }
    m = key.match(/^(.+?)( \([+\u2212-]\))$/);
    if (m) { const r = resolve(m[1], args, split); return r == null ? null : r + m[2]; }
    if (!split) return null;
    const parts = key.split(/(\u060C ?|\u061B ?|: )/);
    if (parts.length < 2) return null;
    let k = 0, out = '';
    for (const part of parts) {
      if (/^(\u060C ?|\u061B ?|: )$/.test(part)) { out += part[0] === '\u060C' ? ', ' : part[0] === '\u061B' ? '; ' : ': '; continue; }
      const n = nHash(part), a = args.slice(k, k + n); k += n;
      if (!AR_RE.test(part)) { out += part.replace(/#/g, () => a.shift()); continue; }
      const r = resolve(part, a, false); if (r == null) return null; out += r;
    }
    return out;
  }
  function setLang(l) {
    try { localStorage.setItem(KEY, l); } catch (e) { }
    let u; try { u = new URL(location.href); u.searchParams.delete('lang'); if (l === 'en') u.searchParams.set('lang', 'en'); } catch (e) { }
    if (u) location.replace(u.href); else location.reload();
  }
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1 };
  function node(n) {
    if (n.nodeType === 3) { const p = n.parentNode; if (p && !SKIP[p.nodeName] && !(p.closest && p.closest('.langbtn'))) { const v = n.nodeValue, t = tr(v); if (t !== v) n.nodeValue = t; } return; }
    if (n.nodeType !== 1 || SKIP[n.nodeName] || (n.classList && n.classList.contains('langbtn'))) return;
    for (const a of ATTRS) { const v = n.getAttribute(a); if (v && AR_RE.test(v)) { const t = tr(v); if (t !== v) n.setAttribute(a, t); } }
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    while (w.nextNode()) { const c = w.currentNode; if (c.nodeType === 3) { if (!c.parentNode.closest('.langbtn')) node(c); } else if (!SKIP[c.nodeName]) for (const a of ATTRS) { const v = c.getAttribute(a); if (v && AR_RE.test(v)) { const t = tr(v); if (t !== v) c.setAttribute(a, t); } } }
  }
  function addButton() {
    const brand = document.querySelector('.top .brand');
    if (!brand || brand.querySelector('.langbtn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'langbtn'; b.lang = lang === 'en' ? 'ar' : 'en';
    b.textContent = lang === 'en' ? 'العربية' : 'English';
    b.title = lang === 'en' ? 'عرض الصفحة بالعربية' : 'Show this page in English';
    b.addEventListener('click', () => setLang(lang === 'en' ? 'ar' : 'en'));
    brand.appendChild(b);
  }
  if (typeof document !== 'undefined') {
    if (lang === 'en') {
      document.documentElement.lang = 'en';
      document.title = 'Barrel Journey';
      const C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
      if (C) for (const f of ['fillText', 'strokeText', 'measureText']) { const o = C[f]; C[f] = function (t, ...a) { return o.call(this, tr(t), ...a); }; }
      new MutationObserver(ms => {
        for (const m of ms) {
          if (m.type === 'characterData') node(m.target);
          else if (m.type === 'attributes') node(m.target);
          else m.addedNodes.forEach(node);
        }
      }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      if (document.body) node(document.body);
    }
    const ready = () => setTimeout(addButton, 0);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  }
  return { lang, tr, parse, setLang, missing };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = I18N;

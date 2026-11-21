/* English coverage check for the Oilfield Guide.
   node oilfield/tests/i18n-check.js            -> lists Arabic source texts with no entry in src/en.js (exit 1 if any)
   node oilfield/tests/i18n-check.js --dump f   -> writes every untranslated key with its source text to f (JSON)
   Keys are built with the same parse() the page uses, so a key found here is a key the page will look up. */
const fs = require('fs'), path = require('path');
const I18N = require('../src/i18n.js');
const SRC = path.join(__dirname, '..', 'src');
global.EN_DICT = undefined;
const dict = (() => { const s = fs.readFileSync(path.join(SRC, 'en.js'), 'utf8'); return new Function(s + '\nreturn EN_DICT;')(); })();

const AR = /[؀-ۿ]/;
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', rarr: '→', larr: '←', times: '×', deg: '°', hellip: '…', mdash: '—', ndash: '–' };
const decode = s => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] != null ? ENT[e] : m));
function fragments(text) {
  const out = [];
  const t = text.replace(/\$\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g, '#');
  for (const part of t.split(/<[^>]*>/)) { const s = decode(part); if (AR.test(s)) out.push(s); }
  for (const m of t.matchAll(/(?:title|placeholder|aria-label|alt)="([^"]*)"/g)) if (AR.test(m[1])) out.push(decode(m[1]));
  return out;
}

/* string-literal scanner that follows nested template literals: `a ${b ? `c ${'d'}` : 'e'} f` */
function scan(src, out) {
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { const k = src.indexOf('\n', i); if (k < 0) break; i = k; continue; }
    if (c === '/' && src[i + 1] === '*') { const k = src.indexOf('*/', i + 2); if (k < 0) break; i = k + 2; continue; }
    if (c === "'" || c === '"') { let j = i + 1, t = ''; while (j < src.length && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') { t += src[j] + src[j + 1]; j += 2; continue; } t += src[j++]; } out.push(t); i = j + 1; continue; }
    if (c === '`') { const r = tpl(src, i + 1, out); out.push(r.text); i = r.end; continue; }
    i++;
  }
}
function tpl(src, i, out) {
  let text = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { text += c + src[i + 1]; i += 2; continue; }
    if (c === '`') return { text, end: i + 1 };
    if (c === '$' && src[i + 1] === '{') {
      let depth = 1, j = i + 2; const start = j;
      while (j < src.length && depth > 0) {
        const d = src[j];
        if (d === "'" || d === '"') { j++; while (j < src.length && src[j] !== d && src[j] !== '\n') { if (src[j] === '\\') j++; j++; } j++; continue; }
        if (d === '`') { j = tpl(src, j + 1, []).end; continue; }
        if (d === '{') depth++; else if (d === '}') depth--;
        j++;
      }
      scan(src.slice(start, j - 1), out);
      text += '#'; i = j; continue;
    }
    text += c; i++;
  }
  return { text, end: i };
}
const found = new Map();
for (const f of fs.readdirSync(SRC)) {
  if (f === 'en.js' || f === 'i18n.js') continue;
  let s = fs.readFileSync(path.join(SRC, f), 'utf8');
  const texts = [];
  if (f.endsWith('.html')) texts.push(s.replace(/<style[\s\S]*?<\/style>/g, ''));
  else scan(s, texts);
  for (const t of texts) for (const fr of fragments(t)) {
    const { key } = I18N.parse(fr);
    if (!AR.test(key)) continue;
    if (!found.has(key)) found.set(key, { key, src: fr.replace(/\s+/g, ' ').trim(), file: f });
  }
}
const all = [...found.values()], miss = all.filter(x => dict[x.key] == null);
const bad = Object.entries(dict).filter(([k, v]) => { const n = (k.match(/#/g) || []).length; const used = [...v.matchAll(/\{(\d+)\}/g)].map(m => +m[1]); return used.some(i => i >= n) || AR.test(v) || /[\u0001\u0002]/.test(v); });
const i = process.argv.indexOf('--dump');
if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(miss, null, 1));
console.log(`source texts: ${all.length}, translated: ${all.length - miss.length}, missing: ${miss.length}, dictionary entries: ${Object.keys(dict).length}, malformed: ${bad.length}`);
bad.forEach(([k, v]) => console.log('  MALFORMED', JSON.stringify(k), '->', JSON.stringify(v)));
if (i < 0) miss.slice(0, 40).forEach(x => console.log('  MISSING', x.file, JSON.stringify(x.src)));
process.exit(miss.length || bad.length ? 1 : 0);

#!/usr/bin/env node
/* Data-integrity checks for IELTS Coach content. Run:  node ielts/tools/validate-data.js
   Catches the mistakes that make a practice test silently wrong: missing/invalid answer keys, wrong question counts,
   summary placeholders that don't match their items, chart data that doesn't add up, duplicate vocabulary. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', 'js');
const ctx = { window: { IELTS: { data: {} } } }; vm.createContext(ctx);
['vocab', 'grammar', 'writing', 'speaking', 'reading', 'listening'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, 'data', f + '.js'), 'utf8'), ctx, { filename: f }));
const D = ctx.window.IELTS.data;
let errors = 0, warns = 0;
const bad = m => { errors++; console.error('  ✗ ' + m); }, warn = m => { warns++; console.warn('  ! ' + m); };
const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function checkTest(test, kind) {
  console.log(`${kind}: ${test.id} — ${test.title}`);
  let n = 1;
  test.parts.forEach(p => p.groups.forEach(g => {
    const where = `${test.id}/${p.id}/${g.type}`;
    if (!g.items || !g.items.length) bad(`${where}: no items`);
    const keys = (g.bank || g.headings || []).map(b => b.k);
    let blanks = 0;
    g.items.forEach((it, idx) => {
      if (it.h) return;
      const at = `${where} Q${n}`;
      if (!it.ev) warn(`${at}: missing explanation (ev)`);
      switch (g.type) {
        case 'tfng': if (!['T', 'F', 'NG'].includes(it.a)) bad(`${at}: tfng answer must be T/F/NG, got ${it.a}`); break;
        case 'ynng': if (!['Y', 'N', 'NG'].includes(it.a)) bad(`${at}: ynng answer must be Y/N/NG, got ${it.a}`); break;
        case 'mcq': if (!it.opts || it.opts.length < 3) bad(`${at}: needs ≥3 options`); else if (!(LET.indexOf(it.a) >= 0 && LET.indexOf(it.a) < it.opts.length)) bad(`${at}: answer ${it.a} not among options`); if (new Set(it.opts).size !== it.opts.length) bad(`${at}: duplicate options`); break;
        case 'mcq2': if (!Array.isArray(it.a) || it.a.length !== 2 || new Set(it.a).size !== 2) bad(`${at}: mcq2 needs two distinct answers`); else it.a.forEach(a => { if (LET.indexOf(a) >= it.opts.length || LET.indexOf(a) < 0) bad(`${at}: answer ${a} out of range`); }); break;
        case 'heading': case 'match': case 'map': if (!keys.includes(it.a)) bad(`${at}: answer ${it.a} not in [${keys}]`); break;
        case 'summary': blanks++; if (g.bank ? !keys.includes(it.a) : !(it.a && it.a.length)) bad(`${at}: bad summary answer`); break;
        case 'complete': case 'short': if (!Array.isArray(it.a) || !it.a.length || it.a.some(x => !String(x).trim())) bad(`${at}: completion needs a non-empty accepted-answer list`); if (!/____/.test(it.q || '')) warn(`${at}: no ____ gap marker`); break;
        default: bad(`${at}: unknown type ${g.type}`);
      }
      n += g.type === 'mcq2' ? 2 : 1;
    });
    if (g.type === 'summary') {
      const ph = (g.text.match(/\{\{(\d+)\}\}/g) || []).map(x => +x.replace(/\D/g, ''));
      if (ph.length !== g.items.length || ph.some((v, i) => v !== i + 1)) bad(`${where}: placeholders ${ph} don't match ${g.items.length} items`);
      if (g.bank) { const used = new Set(g.items.map(i => i.a)); if (g.bank.length <= used.size) warn(`${where}: no distractors in word bank`); }
    }
    if (g.type === 'heading' && g.headings.length <= g.items.length) warn(`${where}: no extra headings (distractors)`);
    if (g.type === 'tfng' || g.type === 'ynng') { const c = {}; g.items.forEach(i => c[i.a] = (c[i.a] || 0) + 1); if (Object.keys(c).length < 2) warn(`${where}: all answers identical`); }
  }));
  const total = n - 1;
  console.log(`  ${total} questions`);
  if (test.id === 'R1' || test.id === 'L1') { if (total !== 40) bad(`${test.id}: full test must have 40 questions, has ${total}`); }
  test.parts.forEach(p => {
    if (kind === 'reading') p.passage.paras.forEach(x => { if (!x.l || !x.t) bad(`${test.id}/${p.id}: bad paragraph`); });
    if (kind === 'listening') { if (!p.script || !p.script.length) bad(`${test.id}/${p.id}: no script`); const sp = Object.keys(p.speakers); p.script.forEach(l => { if (l.s && !sp.includes(l.s)) bad(`${test.id}/${p.id}: unknown speaker ${l.s}`); }); }
  });
}
D.reading.tests.forEach(t => checkTest(t, 'reading')); D.reading.practice.forEach(t => checkTest(t, 'reading'));
D.listening.tests.forEach(t => checkTest(t, 'listening'));

console.log('Writing');
const ids = new Set();
D.writing.T1.forEach(t => {
  if (ids.has(t.id)) bad(`duplicate id ${t.id}`); ids.add(t.id);
  const c = t.chart, at = `T1 ${t.id}`;
  if (c.series) c.series.forEach(s => { if (s.data.length !== c.categories.length) bad(`${at}: series "${s.name}" has ${s.data.length} values for ${c.categories.length} categories`); });
  if (c.type === 'pie') c.pies.forEach(p => { const s = p.slices.reduce((a, x) => a + x.value, 0); if (s !== 100) bad(`${at}: pie "${p.title}" sums to ${s}`); });
  if (c.stacked) c.categories.forEach((cat, i) => { const s = c.series.reduce((a, x) => a + x.data[i], 0); if (s !== 100) bad(`${at}: stacked bar "${cat}" sums to ${s}`); });
  if (c.type === 'bar' && !c.stacked && /sums to 100/.test(c.sub || '')) c.series.forEach(s => { const sum = s.data.reduce((a, b) => a + b, 0); if (sum !== 100) bad(`${at}: series "${s.name}" sums to ${sum}`); });
  if (c.type === 'table') { c.rows.forEach(r => { if (r.length !== c.head.length) bad(`${at}: row length mismatch`); }); if (/electricity/i.test(c.title)) for (let j = 1; j < c.head.length; j++) { const s = c.rows.reduce((a, r) => a + +r[j], 0); if (s !== 100) bad(`${at}: column ${c.head[j]} sums to ${s}`); } }
  if (c.type === 'process' && c.steps.length < 4) bad(`${at}: too few steps`);
  if (c.type === 'map') c.maps.forEach(m => m.shapes.forEach(s => { if (s.t === 'rect' && (s.x < 0 || s.y < 0 || s.x + s.w > m.w || s.y + s.h > m.h)) bad(`${at}: shape "${s.label}" outside map`); }));
});
D.writing.T2.forEach(t => { if (ids.has(t.id)) bad(`duplicate id ${t.id}`); ids.add(t.id); if (t.q.length < 60) warn(`${t.id}: very short prompt`); });
console.log(`  ${D.writing.T1.length} Task 1, ${D.writing.T2.length} Task 2`);

console.log('Speaking');
D.speaking.part1.forEach(t => { if (t.qs.length < 3) bad(`part1 ${t.topic}: needs ≥3 questions`); });
D.speaking.part2.forEach(c => { if (c.pts.length !== 4) warn(`part2 "${c.t}": ${c.pts.length} bullet points`); if (c.p3.length < 4) bad(`part2 "${c.t}": needs ≥4 Part 3 questions`); });
console.log(`  ${D.speaking.part1.length} Part 1 topics, ${D.speaking.part2.length} Part 2 cards`);

console.log('Vocabulary');
const seen = new Map(); let total = 0;
Object.entries(D.vocab).forEach(([k, [name, words]]) => words.forEach(w => { total++; if (w.length !== 4 || w.some(x => !x)) bad(`${k}:${w[0]}: incomplete entry`); const key = w[0].toLowerCase(); if (seen.has(key)) bad(`duplicate word "${w[0]}" in ${k} and ${seen.get(key)}`); seen.set(key, k); if (!/['…]/.test(w[0])) { const stem = key.split(' ')[0].slice(0, 5); if (!w[3].toLowerCase().includes(stem)) warn(`${k}:${w[0]}: example may not use the word`); } }));
console.log(`  ${total} entries in ${Object.keys(D.vocab).length} decks`);

console.log('Grammar');
D.grammar.forEach(q => { if (new Set(q.opts).size !== q.opts.length) bad(`G${q.id}: duplicate options`); if (q.opts.length < 2) bad(`G${q.id}: too few options`); if (!q.why) bad(`G${q.id}: no explanation`); });
console.log(`  ${D.grammar.length} questions`);

console.log(`\n${errors} error(s), ${warns} warning(s)`);
process.exit(errors ? 1 : 0);

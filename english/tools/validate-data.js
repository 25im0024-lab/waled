#!/usr/bin/env node
/* Content validator for English Hub. Run: node english/tools/validate-data.js  (exit 1 on any error). */
'use strict';
const EL = require('./load-data.js')();
const d = EL.data;
const errors = [], warns = [];
const err = (where, msg) => errors.push(where + ': ' + msg);
const AR = /[؀-ۿ]/, LATIN = /[A-Za-z]/;
const LEVELS = ['A1', 'A2', 'B1'];
const arOk = (s, where) => { if (typeof s !== 'string' || !AR.test(s)) err(where, 'missing Arabic text'); };
const enOk = (s, where) => { if (typeof s !== 'string' || !LATIN.test(s)) err(where, 'missing English text'); };
const uniq = (arr, key, where) => { const seen = new Set(); arr.forEach(x => { const k = key(x); if (seen.has(k)) err(where, 'duplicate ' + k); seen.add(k); }); };

/* ---- exercise items (quiz engine shapes) ---- */
function item(it, where) {
  if (!it || !it.t) return err(where, 'missing item type');
  if (it.t === 'mc') {
    if (!Array.isArray(it.opts) || it.opts.length < 2) err(where, 'mc needs >=2 options');
    else { if (!it.opts.includes(it.a)) err(where, `mc answer "${it.a}" not among options`); if (new Set(it.opts).size !== it.opts.length) err(where, 'mc has duplicate options'); }
  } else if (it.t === 'tf') { if (typeof it.a !== 'boolean') err(where, 'tf answer must be boolean'); }
  else if (it.t === 'fill') { if (!it.a || !String(it.q).includes('____') && !String(it.q).includes('___')) err(where, 'fill needs a gap and answer'); }
  else if (it.t === 'order') { if (!Array.isArray(it.words) || it.words.join(' ').replace(/\s+/g, ' ').toLowerCase().replace(/[.?!,]/g, '') !== String(it.a).toLowerCase().replace(/[.?!,]/g, '')) err(where, 'order words do not rebuild the answer'); }
  else if (it.t === 'match') { if (!Array.isArray(it.pairs) || it.pairs.length < 3) err(where, 'match needs >=3 pairs'); }
}

/* ---- vocabulary ---- */
uniq(d.vocab.topics, t => t.id, 'vocab topics');
let nWords = 0;
d.vocab.topics.forEach(t => {
  const w0 = 'vocab:' + t.id;
  if (!LEVELS.includes(t.level)) err(w0, 'bad level');
  arOk(t.ar, w0 + ' title');
  uniq(t.words, w => w[0].toLowerCase(), w0);
  t.words.forEach(w => {
    nWords++;
    const w1 = `${w0}/${w[0]}`;
    if (w.length < 5) return err(w1, 'row needs [en, ar, emoji, exEn, exAr]');
    enOk(w[0], w1); arOk(w[1], w1); if (!w[2]) err(w1, 'missing emoji'); enOk(w[3], w1 + ' example'); arOk(w[4], w1 + ' example AR');
    if (w[3] && !w[3].toLowerCase().includes(w[0].toLowerCase().split(' ')[0].slice(0, 4))) warns.push(`${w1}: example may not contain the word`);
  });
});

/* ---- scenes ---- */
d.scenes.forEach(s => {
  const w0 = 'scene:' + s.id; arOk(s.ar, w0);
  if (!LEVELS.includes(s.level)) err(w0, 'bad level');
  uniq(s.objects, o => o.id, w0);
  s.objects.forEach(o => { const w1 = w0 + '/' + o.id; enOk(o.en, w1); arOk(o.ar, w1); if (!o.box || o.box.length !== 4) err(w1, 'needs box [x,y,w,h]'); });
});

/* ---- grammar ---- */
uniq(d.grammar.lessons, l => l.id, 'grammar lessons');
d.grammar.lessons.forEach(l => {
  const w0 = 'grammar:' + l.id;
  if (!LEVELS.includes(l.level)) err(w0, 'bad level'); enOk(l.en, w0); arOk(l.ar, w0);
  if (!l.points || !l.points.length) err(w0, 'no points');
  (l.points || []).forEach((p, i) => { enOk(p.t[0], `${w0}/p${i}`); arOk(p.t[1], `${w0}/p${i}`); });
  if (!l.ex || l.ex.length < 4) err(w0, 'needs >=4 exercises');
  (l.ex || []).forEach((it, i) => item(it, `${w0}/ex${i}`));
});

/* ---- reading ---- */
uniq(d.reading.texts, t => t.id, 'reading texts');
d.reading.texts.forEach(t => {
  const w0 = 'reading:' + t.id; if (!LEVELS.includes(t.level)) err(w0, 'bad level');
  if (!t.sentences || t.sentences.length < 4) err(w0, 'needs >=4 sentences');
  (t.sentences || []).forEach((s, i) => { enOk(s[0], `${w0}/s${i}`); arOk(s[1], `${w0}/s${i}`); });
  if (!t.qs || t.qs.length < 3) err(w0, 'needs >=3 questions');
  (t.qs || []).forEach((q, i) => item(q, `${w0}/q${i}`));
});

/* ---- listening ---- */
uniq(d.listening.dialogues, t => t.id, 'dialogues');
d.listening.dialogues.forEach(t => {
  const w0 = 'listening:' + t.id;
  t.lines.forEach((l, i) => { if (!t.speakers[l[0]]) err(`${w0}/l${i}`, 'unknown speaker ' + l[0]); enOk(l[1], `${w0}/l${i}`); arOk(l[2], `${w0}/l${i}`); });
  (t.qs || []).forEach((q, i) => item(q, `${w0}/q${i}`));
  if (!t.qs || t.qs.length < 3) err(w0, 'needs >=3 questions');
});
LEVELS.forEach(l => { if (!d.listening.dictation[l] || d.listening.dictation[l].length < 5) err('dictation ' + l, 'needs >=5 sentences'); });

/* ---- writing ---- */
uniq(d.writing.tasks, t => t.id, 'writing tasks');
const wc = s => (s.match(/[A-Za-z'’-]+/g) || []).length;
d.writing.tasks.forEach(t => {
  const w0 = 'writing:' + t.id;
  if (wc(t.model[0]) < t.min) err(w0, `model answer has ${wc(t.model[0])} words < min ${t.min}`);
  t.need.forEach(n => { try { if (!new RegExp(n[0], n[1]).test(t.model[0])) err(w0, 'model answer fails requirement: ' + n[2]); } catch (e) { err(w0, 'bad regex ' + n[0]); } });
  arOk(t.model[1], w0 + ' model AR');
});
d.writing.errors.forEach(e => {
  const w0 = 'error:' + e.wrong, r = new RegExp(e.re, 'i');
  if (!r.test(e.wrong)) err(w0, 'pattern does not match the wrong sentence');
  if (r.test(e.right)) err(w0, 'pattern also matches the corrected sentence');
  arOk(e.ar, w0);
});

/* ---- work ---- */
uniq(d.work.units, u => u.id, 'work units');
d.work.units.forEach(u => {
  const w0 = 'work:' + u.id;
  if (!LEVELS.includes(u.level)) err(w0, 'bad level');
  if (u.phrases.length < 8) err(w0, 'needs >=8 phrases'); u.phrases.forEach(p => { enOk(p[0], w0); arOk(p[1], w0); });
  u.dialogue.lines.forEach((l, i) => { if (!u.dialogue.speakers[l[0]]) err(`${w0}/l${i}`, 'unknown speaker'); arOk(l[2], `${w0}/l${i}`); });
  if (new Set(u.dialogue.lines.map(l => l[0])).size < 2) err(w0, 'dialogue needs 2 speakers');
  if (u.sim.length < 3) err(w0, 'needs >=3 simulation steps');
  u.sim.forEach((s, i) => {
    const w1 = `${w0}/sim${i}`; arOk(s.say[1], w1);
    const best = s.opts.filter(o => o[1] === 2).length; if (best !== 1) err(w1, `needs exactly one best option (found ${best})`);
    if (s.opts.length < 3) err(w1, 'needs >=3 options');
    s.opts.forEach(o => { arOk(o[3], w1); enOk(o[2], w1); });
  });
  if (!u.ai || !u.ai.role || u.ai.role.length !== 2) err(w0, 'needs ai.role [ai, learner] and goal');
});

/* ---- sounds / expressions / placement ---- */
d.sounds.cards.forEach(c => { if (c.words.length < 4) err('sound:' + c.id, 'needs >=4 pairs'); arOk(c.note[1], 'sound:' + c.id); });
d.sounds.stress.forEach(s => { const n = s[1].split('-'); if (s[1].replace(/-/g, '') !== s[0] || s[2] >= n.length) err('stress:' + s[0], 'bad syllables/index'); });
['idioms', 'phrasal', 'colloc'].forEach(k => {
  uniq(d.expressions[k], r => r[0], 'expressions ' + k);
  d.expressions[k].forEach(r => { const w0 = `expr:${k}/${r[0]}`; if (r.length !== 6) err(w0, 'row needs 6 fields'); arOk(r[1], w0); arOk(r[4], w0); if (!LEVELS.includes(r[5])) err(w0, 'bad level'); });
});
d.placement.items.forEach((q, i) => { if (!q.opts.includes(q.a)) err('placement' + i, 'answer not in options'); if (!LEVELS.includes(q.level)) err('placement' + i, 'bad level'); });
LEVELS.forEach(l => { if (d.placement.items.filter(q => q.level === l).length < 6) err('placement', `needs >=6 questions at ${l}`); });

/* ---- summary ---- */
console.log(`topics ${d.vocab.topics.length} · words ${nWords} · scenes ${d.scenes.length} · grammar ${d.grammar.lessons.length} · reading ${d.reading.texts.length} · dialogues ${d.listening.dialogues.length} · writing ${d.writing.tasks.length} · work ${d.work.units.length} · expressions ${d.expressions.idioms.length + d.expressions.phrasal.length + d.expressions.colloc.length} · placement ${d.placement.items.length}`);
warns.slice(0, 15).forEach(w => console.log('warn  ' + w));
if (warns.length > 15) console.log(`warn  … and ${warns.length - 15} more`);
if (errors.length) { errors.forEach(e => console.log('ERROR ' + e)); console.log(`\n${errors.length} error(s)`); process.exit(1); }
console.log('OK — no content errors');

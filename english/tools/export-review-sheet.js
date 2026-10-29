#!/usr/bin/env node
/* Exports every English ↔ Arabic pair in the app to a CSV for a teacher/translator to review.
   Usage: node english/tools/export-review-sheet.js  →  english/review/arabic-review-sheet.csv (UTF-8 with BOM, opens in Excel)
   Columns: section, id, english, arabic, teacher_correction, notes. Corrections are applied by hand in english/js/data/*.js. */
'use strict';
const fs = require('fs'), path = require('path');
const d = require('./load-data.js')().data;
const rows = [], seen = new Set();
const add = (section, id, en, ar) => { if (!en || !ar) return; const k = en + '|' + ar; if (seen.has(k)) return; seen.add(k); rows.push([section, id, en, ar]); };

d.vocab.topics.forEach(t => { add('vocab-topic', t.id, t.en, t.ar); t.words.forEach(w => { add('vocab-word', t.id, w[0], w[1]); add('vocab-example', t.id + '/' + w[0], w[3], w[4]); }); });
d.scenes.forEach(s => { add('scene', s.id, s.en, s.ar); s.objects.forEach(o => { add('scene-object', s.id, o.en, o.ar); add('scene-example', s.id + '/' + o.id, o.ex, o.exAr); }); });
d.grammar.lessons.forEach(l => {
  add('grammar-title', l.id, l.en, l.ar);
  l.points.forEach((p, i) => { add('grammar-rule', `${l.id}/p${i}`, p.t[0], p.t[1]); (p.ex || []).forEach(e => add('grammar-example', `${l.id}/p${i}`, e[0], e[1])); if (p.warn) add('grammar-warning', `${l.id}/p${i}`, p.warn[0], p.warn[1]); });
  l.ex.forEach((x, i) => { if (x.ar) add('grammar-exercise', `${l.id}/ex${i}`, x.q || (x.a && String(x.a)) || '', x.ar); if (x.why) add('grammar-feedback', `${l.id}/ex${i}`, x.why.en, x.why.ar); });
});
d.reading.texts.forEach(t => { add('reading-title', t.id, t.title[0], t.title[1]); t.sentences.forEach((s, i) => add('reading', `${t.id}/s${i}`, s[0], s[1])); Object.entries(t.gloss || {}).forEach(([en, ar]) => add('reading-gloss', t.id, en, ar)); t.qs.forEach((q, i) => add('reading-question', `${t.id}/q${i}`, q.q, q.ar)); });
d.listening.dialogues.forEach(t => { add('listening-title', t.id, t.title[0], t.title[1]); t.lines.forEach((l, i) => add('listening', `${t.id}/l${i}`, l[1], l[2])); t.qs.forEach((q, i) => add('listening-question', `${t.id}/q${i}`, q.q, q.ar)); });
d.writing.tasks.forEach(t => { add('writing-title', t.id, t.title[0], t.title[1]); add('writing-prompt', t.id, t.prompt[0], t.prompt[1]); t.frames.forEach(f => add('writing-phrase', t.id, f[0], f[1])); add('writing-model', t.id, t.model[0], t.model[1]); t.need.forEach(n => add('writing-check', t.id, n[2], n[3])); });
d.writing.errors.forEach(e => { add('writing-error-rule', e.wrong, e.en, e.ar); });
d.writing.lessons.forEach((l, i) => add('writing-rule', 'r' + i, l.en, l.ar));
d.work.units.forEach(u => {
  add('work-title', u.id, u.title[0], u.title[1]); add('work-desc', u.id, u.desc[0], u.desc[1]);
  u.phrases.forEach(p => add('work-phrase', u.id, p[0], p[1])); u.dialogue.lines.forEach((l, i) => add('work-dialogue', `${u.id}/l${i}`, l[1], l[2]));
  u.sim.forEach((s, i) => { add('work-sim-prompt', `${u.id}/s${i}`, s.say[0], s.say[1]); s.opts.forEach(o => add('work-sim-feedback', `${u.id}/s${i}`, o[2], o[3])); });
  if (u.email) u.email.body.forEach(l => add('work-email', u.id, l[0], l[1]));
});
['idioms', 'phrasal', 'colloc'].forEach(k => d.expressions[k].forEach(r => { add('expression', k, r[0], r[1]); add('expression-example', k + '/' + r[0], r[3], r[4]); }));
d.sounds.cards.forEach(c => { add('sound-title', c.id, c.en, c.ar); add('sound-note', c.id, c.note[0], c.note[1]); });
d.sounds.silent.forEach(s => add('silent-letter', s[0], s[0], s[2]));
d.speaking.tasks.forEach(t => { add('speaking-title', t.id, t.title[0], t.title[1]); add('speaking-prompt', t.id, t.prompt[0], t.prompt[1]); t.frames.forEach(f => add('speaking-phrase', t.id, f[0], f[1])); add('speaking-model', t.id, t.model[0], t.model[1]); });
d.speaking.checks.forEach((c, i) => add('speaking-check', 'c' + i, c[0], c[1]));
d.placement.items.forEach((q, i) => add('placement', 'q' + i, q.q, q.ar));
Object.entries(d.cando).forEach(([lv, list]) => list.forEach((c, i) => add('can-do', lv + i, c[1], c[2])));

const esc = v => '"' + String(v).replace(/"/g, '""') + '"';
const out = path.join(__dirname, '..', 'review'); fs.mkdirSync(out, { recursive: true });
const header = ['section', 'id', 'english', 'arabic', 'teacher_correction', 'notes'];
fs.writeFileSync(path.join(out, 'arabic-review-sheet.csv'), '﻿' + [header, ...rows.map(r => [...r, '', ''])].map(r => r.map(esc).join(',')).join('\r\n') + '\r\n');
console.log(`wrote ${rows.length} pairs → english/review/arabic-review-sheet.csv`);

/* Loads every english/js/data/*.js file into a sandbox (no DOM) and returns window.EL.data. Shared by the validator and tests. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ORDER = ['vocab', 'vocab2', 'scenes', 'common', 'grammar', 'grammar2', 'grammar3', 'grammar-bank', 'reading', 'reading2', 'listening', 'listening2', 'writing', 'work', 'sounds', 'expressions', 'placement', 'cando', 'speaking'];
module.exports = function load() {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EL = { data: {}, mod: {}, esc, $: () => null, $$: () => [], shuffle: a => a.slice(), pick: a => a[0] };
  const ctx = { window: { EL }, console };
  vm.createContext(ctx);
  // the visual engine is needed by scenes.js (pure string builders)
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/visuals.js'), 'utf8'), ctx, { filename: 'visuals.js' });
  for (const f of ORDER) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return EL;
};

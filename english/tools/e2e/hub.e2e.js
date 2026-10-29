const { chromium } = require('playwright');
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8766') + '/english/';
const OUT = process.env.SHOTS || require('os').tmpdir();
let failures = 0;
const ok = (c, m) => { if (c) console.log('  ✓', m); else { failures++; console.log('  ✗ FAIL:', m); } };

// Speech: stub synthesis (records text); remove recognition so the "no microphone" paths are exercised.
const STUBS = () => {
  window.__spoken = [];
  try { if (!localStorage.getItem('english_hub_v1')) localStorage.setItem('english_hub_v1', JSON.stringify({ intro: 1 })); } catch (e) { }
  class U { constructor(t) { this.text = t; this.onend = null; this.onerror = null; } }
  window.SpeechSynthesisUtterance = U;
  Object.defineProperty(window, 'speechSynthesis', { value: { voices: [], getVoices() { return []; }, cancel() { }, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 5); }, onvoiceschanged: null }, configurable: true });
  delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, serviceWorkers: 'block', permissions: ['microphone'] });
  await ctx.addInitScript(STUBS);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const $ = (s) => page.locator(s);
  const go = async id => { await page.evaluate(i => EL.show(i), id); await page.waitForTimeout(60); };
  const html = s => page.evaluate(x => (document.querySelector(x) || {}).innerHTML || '', s);
  const click = s => page.evaluate(x => { const e = document.querySelector(x); if (e) e.click(); return !!e; }, s);
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);

  await page.goto(BASE); await page.waitForSelector('#nav button');

  console.log('Shell');
  const tabs = await page.$$eval('#nav button', b => b.map(x => x.dataset.t));
  ok(['home', 'words', 'scenes', 'grammar', 'reading', 'listening', 'writing', 'speaking', 'work', 'sounds', 'expressions', 'notebook', 'progress'].every(t => tabs.includes(t)), 'all 13 tabs present: ' + tabs.join(','));
  ok(!tabs.includes('placement'), 'placement tab is hidden from the nav');
  for (const t of tabs) { await go(t); const h = await html('#view'); ok(h.length > 200, `tab "${t}" renders`); ok(await noOverflow(), `tab "${t}" has no horizontal overflow at 420px`); }

  console.log('Quiz engine (all item types, known answers)');
  await go('home');
  const quizRes = await page.evaluate(() => new Promise(res => {
    const root = document.querySelector('#view');
    const items = [
      { t: 'mc', q: 'Pick b', opts: ['a', 'b', 'c'], a: 'b' },
      { t: 'tf', q: 'True?', a: true },
      { t: 'fill', q: 'I ____ a student.', a: ['am'] },
      { t: 'order', words: ['I', 'like', 'tea'], a: 'I like tea' },
      { t: 'match', pairs: [['a', 'أ'], ['b', 'ب'], ['c', 'ج']] }
    ];
    let fin = false;
    EL.quiz.run({ root, items, shuffle: false, onDone: (p, s, n) => { fin = true; res({ p, s, n }); } });
    const step = async () => {
      for (let guard = 0; guard < 80 && !fin; guard++) {
        await new Promise(r => setTimeout(r, 20));
        const q = root.querySelector('.qbox'); if (!q) { if (root.querySelector('.stars')) return; continue; }
        const next = root.querySelector('[data-next]'); if (next) { next.click(); continue; }
        const idx = root.querySelector('.qhead span').textContent.trim().split(' ')[0] - 1;
        if (idx === 0) [...q.querySelectorAll('.opt')].find(b => b.dataset.o === 'b').click();
        else if (idx === 1) q.querySelector('[data-v="1"]').click();
        else if (idx === 2) { q.querySelector('input').value = 'am'; q.querySelector('[data-check]').click(); }
        else if (idx === 3) { ['I', 'like', 'tea'].forEach(w => [...q.querySelectorAll('.bank .wt')].find(b => b.textContent === w && !b.classList.contains('used')).click()); q.querySelector('[data-check]').click(); }
        else if (idx === 4) { for (const [a, b] of [['a', 'أ'], ['b', 'ب'], ['c', 'ج']]) { [...q.querySelectorAll('[data-l] .opt')].find(x => x.textContent === a).click(); [...q.querySelectorAll('[data-r] .opt')].find(x => x.textContent === b).click(); await new Promise(r => setTimeout(r, 30)); } }
      }
    };
    step();
  }));
  ok(quizRes.s === 5 && quizRes.n === 5, `engine scores 5/5 on mc, tf, fill, order, match (got ${quizRes.s}/${quizRes.n})`);

  console.log('Mistakes notebook + Today');
  await page.evaluate(() => { EL.S.wrong = {}; EL.save(); });
  await go('home');
  ok((await html('#view')).includes('خطة اليوم'), 'Home shows the Today plan');
  await page.evaluate(() => {
    EL.quiz.run({ root: document.querySelector('#view'), shuffle: false, title: 'NB test', items: [{ t: 'mc', q: 'NB question one', opts: ['x', 'y'], a: 'x', keep: true }, { t: 'tf', q: 'NB two', a: true }] });
  });
  await page.waitForSelector('.qbox .opt'); await page.evaluate(() => document.querySelector('.qbox .opt[data-o="y"]').click());
  ok(await page.evaluate(() => EL.nb.count() === 1), 'a wrong answer is saved to the notebook automatically');
  await page.evaluate(() => { document.querySelector('[data-next]').click(); });
  await page.evaluate(() => document.querySelector('[data-v="1"]').click());
  ok(await page.evaluate(() => EL.nb.count() === 1), 'a right answer is not saved');
  await go('notebook'); await page.waitForSelector('[data-go]');
  ok(await page.evaluate(() => !document.querySelector('[data-go]').disabled), 'notebook shows the item as due');
  await click('[data-go]'); await page.waitForSelector('.qbox .opt');
  for (let r = 0; r < 3; r++) {
    // answer correctly three review rounds: each round the item moves up a box; make it due again between rounds
    await page.evaluate(() => document.querySelector('.qbox .opt[data-o="x"]').click());
    await page.evaluate(() => document.querySelector('[data-next]').click());
    await page.waitForSelector('[data-again], [data-exit]');
    if (r < 2) { await page.evaluate(() => { Object.values(EL.S.wrong).forEach(x => { x.due = EL.dayIdx(); }); }); await page.evaluate(() => document.querySelector('[data-again]').click()); await page.waitForSelector('.qbox .opt'); }
  }
  ok(await page.evaluate(() => EL.nb.count() === 0), 'three correct reviews retire the item from the notebook');

  console.log('Words');
  await go('words');
  await click('[data-id="colors"]'); await page.waitForSelector('[data-cards]');
  await click('[data-cards]'); await page.waitForSelector('[data-show]');
  await click('[data-show]'); await page.waitForSelector('[data-yes]'); await click('[data-yes]');
  ok(await page.evaluate(() => Object.keys(EL.S.vocab).length > 0), 'answering a flashcard records SRS progress');
  await go('words'); await click('[data-id="colors"]'); await click('[data-q="pic"]'); await page.waitForSelector('.qbox .opt');
  ok(await page.$$eval('.qbox .opt', o => o.length === 4), 'picture quiz shows 4 options');
  await page.screenshot({ path: OUT + '/e-words-quiz.png' });

  console.log('Scenes');
  await go('scenes');
  await click('[data-id="kitchen"]'); await page.waitForSelector('svg');
  ok(await page.$$eval('svg .obj', n => n.length >= 8), 'kitchen scene has tappable objects');
  await page.evaluate(() => document.querySelector('svg .obj').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__spoken.length > 0), 'tapping an object speaks its name');

  console.log('Grammar (all lessons open, widgets render)');
  const ids = await page.evaluate(() => EL.mod.grammar.lessons.map(l => [l.id, !!l.widget]));
  let bad = 0;
  for (const [id, hasW] of ids) { await page.evaluate(i => EL.mod.grammar.lesson(EL.mod.grammar.lessons.find(l => l.id === i)), id); await page.waitForTimeout(20); if (hasW && !(await page.$('#wid svg'))) { bad++; console.log('   no widget svg in', id); } if (!(await noOverflow())) { bad++; console.log('   overflow in', id); } }
  ok(bad === 0, `${ids.length} grammar lessons open without widget/overflow problems`);

  console.log('Reading');
  await go('reading'); await click('[data-id="sara"]'); await page.waitForSelector('.w');
  await page.evaluate(() => document.querySelector('.w').click()); await page.waitForTimeout(100);
  ok((await html('#wordpop')).length > 20, 'tapping a word opens the dictionary popup');
  await click('#wordpop [data-save]'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => EL.S.custom.length >= 1), 'saving a word adds it to "My words"');

  console.log('Listening');
  await go('listening'); await click('[data-id="meet"]'); await page.waitForSelector('[data-play]');
  await page.evaluate(() => { window.__spoken.length = 0; }); await click('[data-play]');
  const nLines = await page.evaluate(() => EL.data.listening.dialogues.find(d => d.id === 'meet').lines.length);
  await page.waitForFunction(n => window.__spoken.length >= n, nLines, { timeout: 15000 }).catch(() => { });
  ok(await page.evaluate(n => window.__spoken.length >= n, nLines), `dialogue plays all ${nLines} lines with TTS`);
  ok(await page.evaluate(() => document.querySelector('#chat').classList.contains('hide-en')), 'English text starts hidden (listen first)');

  console.log('Writing');
  await go('writing'); await click('[data-id="me"]'); await page.waitForSelector('#wr');
  await page.evaluate(() => { document.querySelector('#wr').value = 'i am agree with you'; });
  await click('[data-check]'); await page.waitForTimeout(100);
  let rep = await html('#rep');
  ok(/I am agree/.test(rep) && /I agree with you/.test(rep), 'flags "I am agree" with the correction');
  const models = await page.evaluate(() => EL.mod.writing.tasks.map(t => [t.id, EL.mod.writing.check(t, t.model[0]).score]));
  ok(models.every(m => m[1] >= 80), 'every model answer scores >=80% on its own checks: ' + models.map(m => m.join('=')).join(' '));
  await go('writing'); await click('[data-err]'); await page.waitForSelector('.qbox');
  ok(await page.$$eval('.qbox .opt', o => o.length === 2), 'spot-the-mistake drill shows True/False');

  console.log('English for Work');
  await go('work'); await click('[data-id="meeting"]'); await page.waitForSelector('[data-tab="sim"]');
  ok(await page.$$eval('.ex-item', n => n.length >= 8), 'unit lists >=8 phrases');
  await click('[data-tab="sim"]'); await page.waitForSelector('#sim .opt');
  const steps = await page.evaluate(() => EL.data.work.units.find(u => u.id === 'meeting').sim);
  for (const s of steps) {
    const best = s.opts.find(o => o[1] === 2)[0];
    await page.evaluate(b => [...document.querySelectorAll('#sim .opt')].find(x => x.textContent === b).click(), best);
    await page.waitForSelector('#sim [data-next]'); await click('#sim [data-next]');
  }
  await page.waitForSelector('#sim .meter');
  ok(await page.evaluate(() => EL.S.done['w:meeting'].best === 100), 'choosing every best reply gives 100%');
  await page.screenshot({ path: OUT + '/e-work-done.png' });
  await click('[data-tab="dialogue"]'); await page.waitForSelector('[data-rp]');
  await click('[data-rp="B"]'); await page.waitForSelector('[data-mic], .meter', { timeout: 8000 });
  for (let i = 0; i < 12 && !(await page.$('.meter')); i++) { if (await page.$('[data-mic]')) await click('[data-mic]'); await page.waitForTimeout(200); }
  ok(!!(await page.$('.meter')), 'role-play completes without a microphone (self-report mode)');
  await go('work'); await click('[data-words]'); await page.waitForSelector('[data-show]');
  ok(true, 'business-words flashcards open');
  await go('work'); await click('[data-id="email"]'); await click('[data-tab="email"]');
  ok((await html('#view')).includes('Dear Mr. Rashid'), 'email unit shows the model email');

  await go('work');
  const pdf = await page.evaluate(async () => { const a = document.querySelector('[data-pdf]'); const r = await fetch(a.href); const b = new Uint8Array(await r.arrayBuffer()); return { ok: r.ok, type: r.headers.get('content-type'), head: String.fromCharCode(...b.slice(0, 5)), size: b.length, dl: a.getAttribute('download') }; });
  ok(pdf.ok && pdf.head === '%PDF-' && pdf.size > 100000 && pdf.dl, `Work tab links to a downloadable PDF guide (${Math.round(pdf.size / 1024)} KB)`);

  console.log('Sounds');
  await go('sounds'); await click('[data-id="th"]'); await page.waitForSelector('svg');
  ok(await page.$$eval('svg', s => s.length >= 1), 'mouth diagram renders');
  await click('[data-q]'); await page.waitForSelector('.qbox .opt');
  ok(await page.evaluate(() => window.__spoken.length > 0), 'listening pair quiz plays the word');
  for (const x of ['stress', 'ed', 'plural', 'silent']) { await go('sounds'); await click(`[data-x="${x}"]`); await page.waitForSelector('[data-q]'); await click('[data-q]'); await page.waitForSelector('.qbox .opt'); }
  ok(true, 'stress / -ed / -s / silent-letter quizzes start');

  console.log('Expressions');
  await go('expressions');
  for (const c of ['idioms', 'phrasal', 'colloc']) {
    await go('expressions'); await click(`[data-c="${c}"]`); await page.waitForSelector('[data-cards]');
    for (const k of ['mean', 'rev', 'gap', 'match']) { await click(`[data-q="${k}"]`); await page.waitForSelector('.qbox', { timeout: 3000 }); await click('[data-back]').catch(() => { }); await go('expressions'); await click(`[data-c="${c}"]`); await page.waitForSelector('[data-cards]'); }
  }
  ok(true, 'all 12 expression quizzes start');

  console.log('Placement test');
  for (const mode of ['correct', 'idk']) {
    await go('placement'); await click('[data-go]'); await page.waitForSelector('.opt');
    for (let i = 0; i < 24; i++) {
      await page.evaluate(m => {
        const q = document.querySelector('.sent').textContent; const it = EL.data.placement.items.find(x => x.q === q);
        const btn = m === 'correct' ? [...document.querySelectorAll('.opt')].find(b => b.dataset.o === it.a) : [...document.querySelectorAll('.opt')].find(b => b.dataset.o === '');
        btn.click();
      }, mode);
      await page.waitForTimeout(10);
    }
    await page.waitForSelector('[data-ok]');
    const lv = await page.evaluate(() => EL.S.placed.level);
    ok(lv === (mode === 'correct' ? 'B1' : 'A1'), `placement with ${mode === 'correct' ? 'all correct' : 'all "don\'t know"'} → ${lv}`);
  }
  ok(await page.evaluate(() => [['A1', 1, 0], ['A2', 1, 0]].length && EL.mod.placement.decide({ A1: { ok: 8, n: 8 }, A2: { ok: 5, n: 8 }, B1: { ok: 1, n: 8 } }) === 'A2'), 'decide(): A1 100%, A2 62%, B1 12% → A2');

  console.log('Speaking (fake microphone)');
  await go('speaking'); await click('[data-lv="ALL"]'); await click('[data-id="introduce"]'); await page.waitForSelector('[data-rec]');
  await click('[data-rec]'); await page.waitForSelector('[data-stop]', { timeout: 8000 });
  await page.waitForTimeout(1200); await click('[data-stop]'); await page.waitForSelector('#after audio', { timeout: 8000 });
  ok(await page.evaluate(() => /^blob:/.test(document.querySelector('#after audio').src)), 'recording is created and playable');
  await click('[data-model]'); ok((await html('#model')).includes('Omar'), 'model answer can be revealed');
  await page.evaluate(() => { document.querySelectorAll('[data-ck]').forEach(c => c.click()); }); await click('[data-save]');
  ok(await page.evaluate(() => EL.S.done['sp:introduce'].best === 100 && EL.S.speak.n >= 1), 'self-check is saved (100%) and recording count increases');
  await go('speaking'); await click('[data-drill]'); await page.waitForSelector('[data-rec]'); ok(true, 'listen-repeat-compare drill opens');

  console.log('Progress + can-do');
  await go('progress'); await page.waitForSelector('[data-c]');
  await click('[data-c="0"]'); ok(await page.evaluate(() => Object.values(EL.S.cando).filter(Boolean).length === 1), 'ticking a can-do statement is saved');
  ok((await html('#view')).includes('آخر 14 يومًا'), 'activity chart is shown');

  console.log('Polish');
  ok(await page.evaluate(() => !document.querySelector('a[href*="github.com"]') && !EL.reportUrl), 'no GitHub links anywhere in the app UI');
  const noName = await page.evaluate(() => { const out = []; for (const t of ['home', 'words', 'grammar', 'work', 'sounds', 'expressions', 'notebook', 'progress', 'speaking']) { EL.show(t); document.querySelectorAll('#view button, #view input, #view select, #view a').forEach(e => { const n = (e.textContent || '').trim() || e.getAttribute('aria-label') || e.getAttribute('title') || (e.labels && e.labels.length) || e.closest('label'); if (!n) out.push(t + ':' + e.outerHTML.slice(0, 70)); }); } return out; });
  ok(noName.length === 0, 'every button/input/link on main tabs has an accessible name' + (noName.length ? ': ' + noName.slice(0, 3).join(' | ') : ''));
  ok(await page.evaluate(() => !!document.querySelector('link[rel="apple-touch-icon"]') && !!document.querySelector('.skip')), 'apple-touch-icon and skip link present');
  const ctx2 = await browser.newContext({ viewport: { width: 420, height: 900 }, serviceWorkers: 'block' });
  const p2 = await ctx2.newPage(); await p2.goto(BASE); await p2.waitForSelector('.modal .box', { timeout: 3000 });
  await p2.click('[data-next]'); await p2.click('[data-next]'); await p2.click('[data-next]');
  ok(await p2.evaluate(() => !document.querySelector('.modal') && EL.S.intro === 1), 'first-visit welcome appears once and can be completed'); await ctx2.close();
  await go('work');
  const popupP = ctx.waitForEvent('page'); await click('[data-print]'); const pr = await popupP; await pr.waitForLoadState();
  ok((await pr.content()).includes('Phrase cards') && (await pr.$$('tr')).length > 50, 'printable phrase cards page opens with all phrases'); await pr.close();

  console.log('Optional Claude features (SDK mocked)');
  await go('home');
  ok((await html('#aipanel')).includes('ai-key'), 'settings show the optional AI panel');
  await go('work'); await click('[data-id="phone"]'); await click('[data-tab="sim"]'); await page.waitForSelector('#sim .opt');
  await page.evaluate(() => { EL.data.work.units.find(u => u.id === 'phone').sim.forEach(() => { }); });
  await page.evaluate(() => EL.ai.openRoleplay(document.querySelector('#view'), EL.data.work.units.find(u => u.id === 'phone'), () => { }));
  ok((await html('#chat')).includes('مفتاح API'), 'role-play without a key explains how to add one');
  await page.evaluate(() => {
    sessionStorage.setItem('english_ai_key', 'sk-ant-test');
    let n = 0;
    window.AnthropicSDK = class { constructor() { this.beta = { messages: { create: async () => ({ stop_reason: 'end_turn', usage: { input_tokens: 100, output_tokens: 50 }, content: [{ type: 'text', text: JSON.stringify(n++ === 0 ? { reply: 'Good morning, Delta Trading. How can I help you?', feedback_ar: '', better_version: '', finished: false } : { reply: 'One moment, please.', feedback_ar: 'قل: Could I speak to…', better_version: 'Could I speak to Mr. Hassan?', finished: false }) }] }) } }; } };
  });
  await page.evaluate(() => EL.ai.openRoleplay(document.querySelector('#view'), EL.data.work.units.find(u => u.id === 'phone'), () => { }));
  await page.waitForSelector('#chat .bubble'); ok((await html('#chat')).includes('Delta Trading'), 'mock Claude opens the role-play');
  await page.fill('#msg', 'I want speak Mr Hassan'); await click('#send'); await page.waitForFunction(() => document.querySelectorAll('#chat .bubble').length >= 3);
  ok((await html('#chat')).includes('Could I speak to Mr. Hassan?'), 'correction from Claude is shown');
  ok(await page.evaluate(() => EL.S.ai.calls >= 2 && EL.S.ai.spend > 0), 'cost estimate is tracked');
  await go('writing'); await click('[data-id="me"]'); await page.waitForSelector('#wr');
  ok(!!(await page.$('[data-ai]')), 'writing task shows the Claude feedback button once a key exists');

  console.log('Persistence');
  const xp = await page.evaluate(() => EL.S.xp);
  await page.reload(); await page.waitForSelector('#nav button');
  ok(await page.evaluate(x => EL.S.xp === x && x > 0, xp), `progress persists across reload (xp ${xp})`);

  console.log('Console');
  const real = errs.filter(e => !/favicon|ERR_FAILED|Failed to load resource/.test(e));
  ok(real.length === 0, 'no page errors or console errors' + (real.length ? ': ' + real.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

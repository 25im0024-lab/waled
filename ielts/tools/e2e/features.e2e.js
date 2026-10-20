/* Browser tests for: revision comparison, auto-capture of mistakes/vocabulary, cost display, criteria trend chart,
   "today" card, backup reminder, .ics export, adaptive weakest skill, Reading pace table, notebook migration. */
const { chromium } = require('playwright');
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8765') + '/ielts/';
let failures = 0;
const OUT = process.env.SHOTS || require('os').tmpdir();
const ok = (c, m) => { if (c) console.log('  ✓', m); else { failures++; console.log('  ✗ FAIL:', m); } };

const TTS_STUB = () => {
  class U { constructor(t) { this.text = t; } }
  window.SpeechSynthesisUtterance = U;
  Object.defineProperty(window, 'speechSynthesis', { value: { getVoices() { return []; }, cancel() { }, speak(u) { setTimeout(() => u.onend && u.onend(), 5); }, onvoiceschanged: null }, configurable: true });
};
const WRITING = { word_count_note: 'ok', criteria: [{ name: 'Task Achievement / Response', band: 6, evidence: 'e', to_reach_next_band: 'n' }, { name: 'Coherence and Cohesion', band: 6, evidence: 'e', to_reach_next_band: 'n' }, { name: 'Lexical Resource', band: 5.5, evidence: 'e', to_reach_next_band: 'n' }, { name: 'Grammatical Range and Accuracy', band: 6, evidence: 'e', to_reach_next_band: 'n' }], top_problems: [{ problem: 'p', quote: 'q', why_it_costs_marks: 'w' }], corrections: [{ original: 'informations about jobs', corrected: 'information about jobs', reason: 'uncountable' }, { original: 'in the other hand', corrected: 'on the other hand', reason: 'fixed phrase' }], arabic_speaker_patterns: ['x'], vocabulary_to_learn: [{ word: 'substantial', arabic: 'كبير / ملموس', example: 'A substantial increase.' }, { word: 'mitigate', arabic: 'يخفّف', example: 'Mitigate the effects.' }], upgraded_paragraph: 'Better.', next_task: 'Rewrite.' };
const COMPARE = { criteria: [{ name: 'Task Achievement / Response', before_band: 6, after_band: 6.5, comment: 'Clearer position.' }, { name: 'Coherence and Cohesion', before_band: 6, after_band: 6.5, comment: 'Better paragraphing.' }, { name: 'Lexical Resource', before_band: 5.5, after_band: 6, comment: 'More precise.' }, { name: 'Grammatical Range and Accuracy', before_band: 6, after_band: 6, comment: 'Same.' }], fixed: ['Uncountable noun fixed'], still_open: ['Comma splice remains'], new_problems: ['Article missing in intro'], verdict: 'Modest improvement.' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
  await ctx.addInitScript(TTS_STUB);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.stack)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  p.on('dialog', d => d.accept());
  const calls = [];
  await p.route('https://api.anthropic.com/**', async route => {
    const req = route.request(), cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST,OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const body = JSON.parse(req.postData() || '{}'); calls.push(body);
    const compare = /REVISION COMPARISON MODE/.test(body.system || '');
    route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(compare ? COMPARE : WRITING) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 3000, output_tokens: 2000 } }) });
  });
  await p.goto(BASE);
  await p.evaluate(() => sessionStorage.setItem('ielts_ai_key', 'sk-ant-test-key'));

  console.log('1. grading → capture → cost');
  await p.click('nav button[data-t=writing]');
  await p.selectOption('#pt', 'Task 2'); await p.click('#pg');
  const essay = 'Some people believe that universities should teach practical skills. However, informations about jobs change fast. ' .repeat(12);
  await p.fill('.ta', essay); await p.click('#sub');
  await p.waitForSelector('#ai0 .band-chip', { timeout: 15000 });
  const cost = await p.textContent('#ai0 .band-chip + span');
  ok(/≈ \$0\.0[0-9]{2}/.test(cost) && cost.includes('0.052'), `cost estimate shown: "${cost.trim().slice(-30)}" (3000 in + 2000 out on Opus 5.5 = $0.052)`);
  ok((await p.evaluate(() => IELTS.S.errors.length)) === 2, '2 corrections captured into the notebook');
  ok((await p.evaluate(() => IELTS.S.custom.map(c => c.en).join())) === 'substantial,mitigate', 'suggested words added to "كلماتي"');
  ok((await p.textContent('#ai0')).includes('أُضيف 2 تصحيح') && (await p.textContent('#ai0')).includes('2 كلمة'), 'user is told what was captured');
  ok(await p.locator('#ai0 td.en', { hasText: /^substantial$/ }).count() === 1, 'vocabulary table rendered');
  ok(calls[0].output_config.format.schema.properties.vocabulary_to_learn !== undefined, 'schema requests vocabulary_to_learn');
  ok(Math.abs((await p.evaluate(() => IELTS.S.aiSpend.usd)) - 0.052) < 1e-9, 'cumulative spend tracked ($0.052)');
  const h1 = await p.evaluate(() => IELTS.S.writing[IELTS.S.writing.length - 1]);
  ok(h1.crit && h1.crit.TA === 6 && h1.crit.LR === 5.5 && Object.keys(h1.crit).length === 4, 'criteria bands saved in history');

  console.log('2. revision mode');
  ok(await p.locator('#rv0').count() === 1 && (await p.inputValue('#rv0')).startsWith('Some people'), 'revision box prefilled with original text');
  await p.click('#rvb0');
  ok((await p.textContent('#toast')).includes('لم تغيّر'), 'identical text rejected');
  await p.fill('#rv0', essay.replace(/informations/g, 'information') + ' Moreover, this is a clearly better version of the essay now.');
  await p.click('#rvb0'); await p.waitForSelector('#rvo0 .band-chip', { timeout: 10000 });
  const cmp = await p.textContent('#rvo0');
  ok(cmp.includes('6.0 → 6.5') && cmp.includes('Uncountable noun fixed') && cmp.includes('Comma splice remains') && cmp.includes('Article missing'), 'comparison shows before→after, fixed, open and new problems');
  const body = calls[calls.length - 1];
  ok(/ORIGINAL RESPONSE/.test(body.messages[0].content) && /REVISED RESPONSE/.test(body.messages[0].content) && /PREVIOUS EXAMINER BANDS/.test(body.messages[0].content), 'comparison request carries both versions and previous bands');
  await p.locator('#rvo0').screenshot({ path: OUT + '/revision.png' });
  const order = await p.evaluate(() => { const r = document.querySelector('#rvo0 .crit .bn'); const rects = [...r.childNodes].filter(n => n.nodeType === 3 || n.nodeType === 1).map(n => { const rg = document.createRange(); rg.selectNodeContents(n); return [n.textContent.trim(), rg.getBoundingClientRect().left]; }); return rects.filter(x => x[0]).sort((a, b) => a[1] - b[1]).map(x => x[0]).join(' '); });
  ok(order === '6.0 ▲ 6.5', `before→after reads left-to-right ("${order}")`);
  const h2 = await p.evaluate(() => IELTS.S.writing[IELTS.S.writing.length - 1]);
  ok(h2.mode === 'revision' && h2.crit.TA === 6.5, 'revision saved in history with new criteria');
  await p.click('nav button[data-t=home]');
  ok(await p.locator('#chartW svg').count() === 1, 'Writing criteria trend chart appears on Home after 2 graded versions');

  console.log('3. notebook + plan integration, migration');
  await p.evaluate(() => { IELTS.S.plan = { start: IELTS.dayKey(new Date()), exam: '', mpd: 60, rest: -1, weak: '', done: {}, errors: [{ w: 'old entry', c: 'new', r: 'migrated' }] }; IELTS.save(); });
  await p.click('nav button[data-t=plan]');
  const mig = await p.evaluate(() => ({ n: IELTS.S.errors.length, has: IELTS.S.errors.some(e => e.w === 'old entry'), gone: IELTS.S.plan.errors === undefined }));
  ok(mig.n === 3 && mig.has && mig.gone, 'old per-plan notebook migrated into the global notebook');
  ok(await p.locator('#elist td', { hasText: '🤖' }).count() >= 1, 'AI-captured items are marked in the notebook');

  console.log('4. today card');
  await p.click('nav button[data-t=home]');
  ok(await p.locator('h2', { hasText: 'مهمة اليوم' }).count() === 1, 'Today card shown when a plan exists');
  const n0 = await p.locator('[data-pdone]').count();
  ok(n0 >= 1, `Today card lists ${n0} tasks`);
  await p.screenshot({ path: OUT + '/home2.png', fullPage: true });
  await p.locator('[data-pdone]').first().check();
  ok(await p.evaluate(() => Object.keys(IELTS.S.plan.done).length) === 1, 'ticking a task on Home updates the plan');

  console.log('5. backup reminder');
  await p.evaluate(() => { const d = new Date(); for (let i = 0; i < 4; i++) { const x = new Date(d); x.setDate(x.getDate() - i); IELTS.S.days[IELTS.dayKey(x)] = 1; } IELTS.S.lastExport = 0; IELTS.save(); });
  await p.click('nav button[data-t=plan]'); await p.click('nav button[data-t=home]');
  ok(await p.locator('#bkp').count() === 1, 'backup banner shown after ≥3 active days and no export');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bkp')]);
  ok(dl.suggestedFilename() === 'ielts-progress.json', 'backup downloads ielts-progress.json');
  ok(await p.locator('#bkp').count() === 0 && (await p.evaluate(() => IELTS.S.lastExport)) > 0, 'banner disappears after export');

  console.log('6. adaptive weakest skill');
  const adapt = await p.evaluate(() => {
    IELTS.S.mocks = [{ date: '2026-10-01', skill: 'listening', band: 8, raw: 35, of: 40 }, { date: '2026-10-02', skill: 'reading', band: 6, raw: 24, of: 40 }, { date: '2026-10-03', skill: 'writing', band: 7 }];
    const P = { start: '2026-10-05', exam: '2027-06-15', mpd: 60, rest: 5, weak: '', done: {}, errors: [] };
    const thu = new Date(2026, 10, 12), w1 = IELTS.planApi.dayTasks(P, thu);  // Thursday in a "found/build" week
    const weak = IELTS.planApi.autoWeak(), forced = IELTS.planApi.dayTasks({ ...P, weak: 'listening' }, thu)[0].tab;
    IELTS.S.mocks.push({ date: '2026-10-04', skill: 'speaking', band: 5.5 });
    return { weak, first: w1[0].tab, forced, afterSpeaking: IELTS.planApi.autoWeak() };
  });
  ok(adapt.weak === 'reading' && adapt.first === 'reading', `weakest skill detected automatically (${adapt.weak}); Thursday starts with ${adapt.first}`);
  ok(adapt.forced === 'listening' && adapt.afterSpeaking === 'speaking', 'manual choice overrides; new low result changes the auto choice');

  console.log('7. .ics export');
  await p.click('nav button[data-t=plan]');
  await p.evaluate(() => { IELTS.S.plan = { start: IELTS.dayKey(new Date()), exam: '2027-03-15', mpd: 60, rest: 5, weak: '', done: {} }; IELTS.save(); });
  await p.click('nav button[data-t=home]'); await p.click('nav button[data-t=plan]');
  await p.fill('#ict', '19:30');
  const [ics] = await Promise.all([p.waitForEvent('download'), p.click('#pics')]);
  const text = require('fs').readFileSync(await ics.path(), 'utf8');
  const events = (text.match(/BEGIN:VEVENT/g) || []).length;
  ok(ics.suggestedFilename() === 'ielts-plan.ics' && text.startsWith('BEGIN:VCALENDAR\r\n') && text.trimEnd().endsWith('END:VCALENDAR'), '.ics file is a well-formed VCALENDAR');
  ok(events > 100, `${events} events until the exam`);
  ok(/DTSTART:\d{8}T193000\r\n/.test(text) && /DURATION:PT\d+M\r\n/.test(text), 'events start at the chosen time with a duration');
  const longest = Math.max(...text.split('\r\n').map(l => Buffer.byteLength(l)));
  ok(longest <= 75, `no line exceeds 75 octets (longest ${longest})`);
  ok((text.match(/BEGIN:VEVENT/g) || []).length === (text.match(/END:VEVENT/g) || []).length && /UID:\d{8}-\d+@ielts-coach/.test(text), 'events are balanced and have UIDs');

  console.log('8. Reading pace table');
  await p.click('nav button[data-t=reading]'); await p.click('#view [data-t=R1]');
  await p.click('#tabs button[data-i="1"]'); await p.waitForTimeout(1200); await p.click('#tabs button[data-i="2"]');
  await p.click('#sub');
  const pace = await p.textContent('#out');
  ok(pace.includes('الوقت لكل نص') && (pace.match(/ث\/سؤال/g) || []).length >= 3, 'pace table with one row per passage');
  const times = await p.evaluate(() => IELTS.S.reading[IELTS.S.reading.length - 1].times);
  ok(Array.isArray(times) && times.length === 3 && times[1] >= 1, `time per passage saved (${JSON.stringify(times)})`);

  console.log('errors:', errs.length ? errs : 'none'); failures += errs.length;
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nFEATURE CHECKS PASSED'); await browser.close(); process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

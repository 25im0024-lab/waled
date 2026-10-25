const { chromium } = require('playwright');
const URL = (process.env.BASE_URL || 'http://127.0.0.1:8765') + '/ielts/';
const OUT = process.env.SHOTS || require('os').tmpdir();
let failures = 0;
const ok = (c, m) => { if (c) console.log('  ✓', m); else { failures++; console.log('  ✗ FAIL:', m); } };

const TTS_STUB = () => {
  window.__spoken = [];
  class U { constructor(t) { this.text = t; this.onend = null; this.onerror = null; } }
  window.SpeechSynthesisUtterance = U;
  const synth = { voices: [], getVoices() { return []; }, cancel() { }, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 5); }, onvoiceschanged: null };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
};

// fill helper executed in page
const FILL = ({ testId, pool, mode }) => {
  const def = IELTS.data[pool].tests.concat(IELTS.data[pool].practice).find(t => t.id === testId);
  const test = IELTS.exam.number(structuredClone(def));
  const pickOther = (list, a) => list.find(x => x !== a);
  test.parts.forEach(p => p.groups.forEach(g => g.items.forEach(it => {
    if (it.h) return; const n = it.n, good = mode === 'correct';
    if (g.type === 'tfng' || g.type === 'ynng') { const all = g.type === 'tfng' ? ['T', 'F', 'NG'] : ['Y', 'N', 'NG']; document.querySelector(`input[name=q${n}][value="${good ? it.a : pickOther(all, it.a)}"]`).click(); }
    else if (g.type === 'mcq') { const all = ['A', 'B', 'C', 'D'].slice(0, it.opts.length); document.querySelector(`input[name=q${n}][value="${good ? it.a : pickOther(all, it.a)}"]`).click(); }
    else if (g.type === 'mcq2') { const all = ['A', 'B', 'C', 'D', 'E'].slice(0, it.opts.length); const sel = good ? it.a : all.filter(x => !it.a.includes(x)).slice(0, 2); sel.forEach(v => document.querySelector(`input[name=q${n}][value="${v}"]`).click()); }
    else if (['complete', 'short'].includes(g.type) || (g.type === 'summary' && !g.bank)) { const el = document.querySelector(`input.gap[data-n="${n}"]`); el.value = good ? it.a[0] : 'zzz'; el.dispatchEvent(new Event('input', { bubbles: true })); }
    else { const keys = (g.bank || g.headings).map(b => b.k); const el = document.querySelector(`select[data-n="${n}"]`); el.value = good ? it.a : pickOther(keys, it.a); el.dispatchEvent(new Event('change', { bubbles: true })); }
  })));
  return test.total;
};

const GRADE_JSON = (kind) => JSON.stringify(kind === 'speaking' ? {
  criteria: [{ name: 'Fluency and Coherence', band: 6.5, evidence: 'Answers are developed but hesitant.', to_reach_next_band: 'Reduce repetition.' }, { name: 'Lexical Resource', band: 6, evidence: 'Adequate range.', to_reach_next_band: 'Use more collocations.' }, { name: 'Grammatical Range and Accuracy', band: 6.5, evidence: 'Mix of structures.', to_reach_next_band: 'Fewer tense slips.' }],
  per_answer: [{ part: 1, comment: 'Good start.', better_answer: "Honestly, I'd say it depends." }], corrections: [{ original: 'I am agree', corrected: 'I agree', reason: 'agree is a verb' }], arabic_speaker_patterns: ['Article omission'], pronunciation_text_advice: ['Watch /p/ vs /b/'], next_task: 'Record again.'
} : {
  word_count_note: 'Meets minimum.', criteria: [{ name: 'Task Achievement / Response', band: 6.5, evidence: 'Position is clear.', to_reach_next_band: 'Develop ideas.' }, { name: 'Coherence and Cohesion', band: 6, evidence: 'Mechanical linking.', to_reach_next_band: 'Vary linkers.' }, { name: 'Lexical Resource', band: 6, evidence: 'Some repetition.', to_reach_next_band: 'Collocations.' }, { name: 'Grammatical Range and Accuracy', band: 6.5, evidence: 'Some errors.', to_reach_next_band: 'Complex accuracy.' }],
  top_problems: [{ problem: 'Overgeneralisation', quote: 'all people', why_it_costs_marks: 'Task Response' }], corrections: [{ original: 'informations', corrected: 'information', reason: 'uncountable' }], arabic_speaker_patterns: ['Comma splices'], vocabulary_to_learn: [{ word: 'substantial', arabic: 'كبير', example: 'A substantial increase.' }], upgraded_paragraph: 'Better paragraph.', next_task: 'Rewrite body 2.'
});

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(TTS_STUB);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  page.on('dialog', d => d.accept());

  /* ---------- A. navigation ---------- */
  console.log('A. navigation');
  await page.goto(URL);
  for (const id of ['home', 'reading', 'listening', 'writing', 'speaking', 'vocab', 'grammar', 'toolkit']) {
    await page.click(`nav button[data-t=${id}]`);
    const len = (await page.textContent('#view')).trim().length;
    ok(len > 80, `tab ${id} renders (${len} chars)`);
  }
  ok(await page.evaluate(() => location.hash) === '#/toolkit', 'hash routing updates');

  /* ---------- B. reading ---------- */
  console.log('B. reading full test');
  await page.click('nav button[data-t=reading]');
  await page.click('[data-t=R1]');
  ok(await page.locator('.qitem').count() >= 33, 'question items rendered');
  const total = await page.evaluate(FILL, { testId: 'R1', pool: 'reading', mode: 'wrong' });
  ok(total === 40, 'test has 40 questions');
  await page.click('#sub');
  let score = await page.textContent('#out .big');
  ok(/^\s*0 \/ 40/.test(score), `all-wrong → ${score.trim()}`);

  await page.click('nav button[data-t=reading]');
  await page.click('[data-t=R1]');
  await page.evaluate(FILL, { testId: 'R1', pool: 'reading', mode: 'correct' });
  ok(await page.locator('.navgrid button.answered').count() === 40, 'navigator shows 40 answered');
  await page.click('#sub');
  score = await page.textContent('#out .big');
  ok(/^\s*40 \/ 40/.test(score), `all-correct → ${score.trim()}`);
  ok((await page.textContent('#out .band-chip')).includes('9.0'), 'band ≈ 9.0 for 40/40');
  ok(await page.locator('.qitem.correct, .sumgap.correct').count() >= 33, 'review marks correct items');
  await page.screenshot({ path: OUT + '/reading-result.png', fullPage: false });

  // resume
  await page.click('nav button[data-t=reading]');
  await page.click('[data-t=R1]');
  await page.click('input[name=q1][value=T]');
  await page.click('nav button[data-t=home]');     // dialog accepted
  await page.click('nav button[data-t=reading]');
  ok(await page.locator('#rs').count() === 1, 'resume card offered');
  await page.click('#rs');
  ok(await page.locator('input[name=q1][value=T]').isChecked(), 'answer restored on resume');
  await page.click('#sub');

  // practice single passage + mobile screenshot
  await page.click('nav button[data-t=reading]');
  await page.click('[data-p=R1-p2]');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: OUT + '/reading-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(FILL, { testId: 'R1-p2', pool: 'reading', mode: 'correct' });
  await page.click('#sub');
  ok(/^\s*13 \/ 13/.test(await page.textContent('#out .big')), 'passage 2 practice 13/13');

  /* ---------- C. listening ---------- */
  console.log('C. listening');
  await page.click('nav button[data-t=listening]');
  await page.click('[data-p=L1-s2]');
  await page.click('#stb button.primary');            // start
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__spoken.length) > 0, 'announcer TTS invoked');
  await page.evaluate(FILL, { testId: 'L1-s2', pool: 'listening', mode: 'correct' });
  await page.click('#sub');
  ok(/^\s*10 \/ 10/.test(await page.textContent('#out .big')), 'section 2 (MCQ + map) 10/10');
  ok(await page.locator('#out details').count() === 1, 'transcript offered');

  // full test with fake clock: run through whole sequence and auto-submit
  await page.click('nav button[data-t=listening]');
  await page.clock.install();
  await page.click('[data-t=L1]');
  await page.click('#stb button.primary');
  await page.evaluate(FILL, { testId: 'L1', pool: 'listening', mode: 'correct' });
  await page.clock.runFor(12 * 60 * 1000);
  await page.waitForTimeout(200);
  const lscore = await page.textContent('#out .big');
  ok(/^\s*40 \/ 40/.test(lscore), `full listening flow auto-submits → ${lscore.trim()}`);
  const spoken = await page.evaluate(() => window.__spoken.length);
  ok(spoken > 60, `scripts were spoken (${spoken} chunks)`);
  await page.screenshot({ path: OUT + '/listening-result.png' });

  // dictation
  await page.click('nav button[data-t=listening]');
  await page.click('#dn'); await page.fill('#dt', 'the government has introduced several measures'); await page.click('#dk');
  ok(await page.locator('#dres p.diff').count() === 1, 'dictation diff shown');

  /* ---------- D. writing ---------- */
  console.log('D. writing + charts + AI');
  // chart gallery
  await page.click('nav button[data-t=writing]');
  const kinds = await page.evaluate(() => {
    const box = document.createElement('div'); box.id = 'gallery'; box.style.cssText = 'position:absolute;left:0;top:0;width:800px;background:#06110f;z-index:99'; document.body.appendChild(box);
    return IELTS.data.writing.T1.map(t => {
      const d = document.createElement('div'); d.id = 'g-' + t.id; box.appendChild(d); IELTS.charts.render(t.chart, d);
      const svgs = d.querySelectorAll('svg').length, nan = (d.innerHTML.match(/NaN|undefined/g) || []).length;
      return [t.id, svgs, nan];
    });
  });
  kinds.forEach(([id, svgs, nan]) => ok(nan === 0 && (svgs >= 1 || id.includes('table')), `chart ${id}: svg=${svgs} NaN/undefined=${nan}`));
  for (const id of ['t1-line-phones', 't1-pie-energy', 't1-hbar-reasons', 't1-stack-commute', 't1-process-frac', 't1-map-village', 't1-bar-students']) {
    await page.locator('#g-' + id).screenshot({ path: `${OUT}/chart-${id}.png` });
  }
  await page.evaluate(() => document.getElementById('gallery').remove());

  // AI request interception (real bundled SDK)
  const calls = [];
  let failFirstBeta = false;
  await page.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST,OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const body = JSON.parse(req.postData() || '{}');
    calls.push({ url: req.url(), headers: req.headers(), body });
    if (failFirstBeta && req.url().includes('beta=true')) { failFirstBeta = false; return route.fulfill({ status: 400, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'fallbacks not supported' } }) }); }
    const speaking = /Speaking/.test(body.system || '');
    route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: GRADE_JSON(speaking ? 'speaking' : 'writing') }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }) });
  });
  await page.evaluate(() => sessionStorage.setItem('ielts_ai_key', 'sk-ant-test-key'));

  await page.click('nav button[data-t=writing]');
  await page.click('#mock');
  ok(await page.locator('.chart svg').count() >= 1 || await page.locator('.chart table').count() >= 1, 'Task 1 chart shown in mock');
  const essay1 = 'Overall, the figures rose steadily. '.repeat(30) + 'In 2010 the figure was 25% while in 2020 it was 60%.';
  const essay2 = ('Some people believe that universities should teach practical skills. However, informations about jobs change fast. ' + 'On the other hand, academic knowledge matters. ').repeat(14) + '\n\nIn conclusion, I agree.';
  await page.fill('.ta[data-i="0"]', essay1);
  await page.click('#tabs button[data-i="1"]');
  await page.fill('.ta[data-i="1"]', essay2);
  failFirstBeta = true;
  await page.click('#sub');
  await page.waitForSelector('#sum .band-chip', { timeout: 15000 });
  ok(calls.length >= 3, `API calls made (${calls.length}) incl. fallback retry`);
  const first = calls[0];
  ok(first.url.includes('/v1/messages') && first.url.includes('beta=true'), 'first request → /v1/messages?beta=true');
  ok(first.headers['x-api-key'] === 'sk-ant-test-key', 'x-api-key header sent');
  ok(first.headers['anthropic-dangerous-direct-browser-access'] === 'true', 'browser-access header sent');
  ok((first.headers['anthropic-beta'] || '').includes('server-side-fallback-2026-07-01'), 'fallback beta header present');
  ok(first.body.model === 'claude-opus-5-5' && first.body.fallbacks === 'default', 'model claude-opus-5-5 + fallbacks:"default"');
  ok(first.body.output_config && first.body.output_config.format.type === 'json_schema' && first.body.output_config.effort === 'medium', 'output_config.format json_schema + effort');
  ok(!('thinking' in first.body) && !('tool_choice' in first.body) && !('temperature' in first.body), 'no thinking/tool_choice/temperature params');
  const schema = first.body.output_config.format.schema;
  const strictObjs = JSON.stringify(schema).split('"type":"object"').length - 1, noAdd = JSON.stringify(schema).split('"additionalProperties":false').length - 1;
  ok(strictObjs === noAdd, `schema: every object has additionalProperties:false (${noAdd}/${strictObjs})`);
  ok(/Task 1/.test(first.body.messages[0].content) && first.body.messages[0].content.includes('VISUAL INPUT'), 'Task 1 prompt includes chart data');
  const second = calls[1];
  ok(second.url.includes('/v1/messages') && !second.url.includes('beta=true') && !('fallbacks' in second.body), 'after 400 → retried on plain /v1/messages without fallbacks');
  ok(calls.some(c => /Task 2/.test(c.body.messages[0].content) && c.body.messages[0].content.includes('informations')), 'Task 2 essay sent');
  const band = await page.textContent('#sum .band-chip');
  ok(band.includes('6.3') === false && /≈ 6\.[05]|≈ 6\.5/.test(band), `weighted writing band: ${band.trim()}`);
  ok(await page.locator('.crit').count() === 8, '8 criteria rows rendered (2 tasks × 4)');
  ok(await page.locator('.fix').count() >= 4, 'problems/corrections rendered');
  await page.screenshot({ path: OUT + '/writing-report.png', fullPage: true });
  ok(await page.locator('.msg li.bad').count() >= 1, 'local heuristic flagged an error (informations)');

  // practice mode without key shows paste prompt
  await page.evaluate(() => sessionStorage.removeItem('ielts_ai_key'));
  await page.click('nav button[data-t=writing]');
  await page.selectOption('#pt', 'Task 2'); await page.click('#pg');
  await page.fill('.ta', 'Short text '.repeat(15));
  await page.click('#sub');
  await page.waitForSelector('#cp0');
  ok(true, 'no-key path shows copy-prompt fallback');

  /* ---------- E. speaking (text mode) ---------- */
  console.log('E. speaking');
  await page.evaluate(() => sessionStorage.setItem('ielts_ai_key', 'sk-ant-test-key'));
  await page.click('nav button[data-t=speaking]');
  await page.check('#txt');
  await page.click('#full');
  let guard = 0, answered = 0, lastQ = '', lastPrep = '';
  while (guard++ < 400 && !(await page.locator('#gr').count())) {
    const prog = await page.textContent('#prog').catch(() => '');
    const next = page.locator('#ctl button', { hasText: 'التالي' });
    const go2 = page.locator('#ctl button', { hasText: 'ابدأ الحديث' });
    const ty = page.locator('#ty');
    if (await go2.count() && prog !== lastPrep) { lastPrep = prog; await go2.click().catch(() => { }); }
    else if (await next.count() && await ty.count() && prog !== lastQ) { lastQ = prog; await ty.fill('Honestly, I think it depends on the situation, and for instance I prefer quiet places.').catch(() => { }); answered++; await next.click().catch(() => { }); }
    else await page.waitForTimeout(50);
  }
  ok(answered === 14 || answered === 15, `full speaking test asked 9 + 1 + (4–5) questions (got ${answered})`);
  await page.waitForSelector('#gr', { timeout: 5000 });
  const spokenQ = await page.evaluate(() => window.__spoken.filter(t => /\?$/.test(t)).length);
  ok(spokenQ >= 13, `examiner voiced the questions (${spokenQ})`);
  await page.click('#gr');
  await page.waitForSelector('#ai .band-chip', { timeout: 10000 });
  ok(/6\.[05]/.test(await page.textContent('#ai .band-chip')), 'speaking AI report rendered');
  ok(await page.locator('#ai .crit').count() === 3, '3 speaking criteria');
  const sp = calls[calls.length - 1];
  ok(/Part 2/.test(sp.body.messages[0].content) && /Part 3/.test(sp.body.messages[0].content), 'speaking prompt includes all parts');

  /* ---------- F. vocab + grammar ---------- */
  console.log('F. vocab / grammar');
  await page.click('nav button[data-t=vocab]');
  for (let i = 0; i < 4; i++) { await page.click('#rev'); await page.click(i === 3 ? '#no' : '#yes'); }
  await page.fill('#ne', 'ubiquitous'); await page.fill('#na', 'موجود في كل مكان'); await page.click('#add');
  ok(await page.inputValue('#deck') === 'mine', 'custom word added');
  await page.click('nav button[data-t=grammar]');
  await page.click('#gs');
  for (let i = 0; i < 10; i++) { await page.click('.opt'); await page.click('#nx'); }
  ok((await page.textContent('#view')).includes('/ 10'), 'grammar session completes');

  /* ---------- G. home ---------- */
  console.log('G. home');
  await page.click('nav button[data-t=home]');
  ok(await page.locator('#chart svg').count() === 1, 'progress chart rendered from mock history');
  ok((await page.textContent('#view')).includes('Overall'), 'overall card present');
  await page.screenshot({ path: OUT + '/home.png', fullPage: true });
  await page.click('nav button[data-t=toolkit]');
  await page.screenshot({ path: OUT + '/toolkit.png' });

  const real = errs.filter(e => !/status of 400/.test(e));
  console.log('\nconsole/page errors (excluding the simulated 400):', real.length ? real : 'none');
  failures += real.length;
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

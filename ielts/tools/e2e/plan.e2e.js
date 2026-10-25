const { chromium } = require('playwright');
let failures = 0;
const ok = (c, m) => { if (c) console.log('  ✓', m); else { failures++; console.log('  ✗ FAIL:', m); } };
const iso = d => d.toLocaleDateString('en-CA');
const T0 = new Date(), at = n => new Date(T0.getFullYear(), T0.getMonth(), T0.getDate() + n);
const START = iso(T0), SOON = iso(at(15)), EXAM = iso(at(254));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.stack)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto((process.env.BASE_URL || 'http://127.0.0.1:8765') + '/ielts/');
  ok((await p.$$eval('nav button', b => b.map(x => x.dataset.t))).join() === 'home,plan,reading,listening,writing,speaking,vocab,grammar,toolkit', 'Plan tab is second in the nav');

  console.log('setup validation');
  await p.click('nav button[data-t=plan]');
  ok(await p.locator('#pgo').count() === 1, 'setup form shown when no plan');
  await p.fill('#ps', START); await p.fill('#pe', SOON); await p.click('#pgo');
  ok((await p.textContent('#perr')).includes('6 أسابيع'), 'rejects an exam date < 6 weeks away');

  console.log('create plan (exam mid-June 2027, 60 min/day, rest Friday)');
  await p.fill('#pe', EXAM); await p.selectOption('#pm', '60'); await p.selectOption('#pr', '5'); await p.click('#pgo');
  const head = await p.textContent('#view .card h2');
  const W = await p.evaluate(() => IELTS.planApi.totalWeeks(IELTS.S.plan));
  ok(head.includes('الأسبوع') && W >= 36 && W <= 41, `header "${head.trim()}" ; total weeks=${W}`);

  console.log('schedule integrity over the whole range');
  const rep = await p.evaluate(() => {
    const P = IELTS.S.plan, out = { days: 0, empty: [], badTab: [], phases: {}, minsHigh: 0, tabsSeen: new Set(), exam: 0 };
    const tabs = IELTS.tabs.map(t => t.id);
    const [sy, sm, sd] = P.start.split('-').map(Number); let d = new Date(sy, sm - 1, sd);
    for (let i = 0; i < 280; i++, d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const t = IELTS.planApi.dayTasks(P, d), iso = d.toLocaleDateString('en-CA'), wd = d.getDay();
      if (iso > P.exam) { if (t.length) out.empty.push('after-exam ' + iso); continue; }
      out.days++;
      if (wd === P.rest && t.length) out.empty.push('rest-has-tasks ' + iso);
      if (wd !== P.rest && !t.length) out.empty.push('no-tasks ' + iso);
      if (iso === P.exam) out.exam = t.length;
      t.forEach(x => { if (!tabs.includes(x.tab)) out.badTab.push(x.tab); if (x.mins < 0 || Number.isNaN(x.mins)) out.empty.push('badmins ' + iso); out.tabsSeen.add(x.tab); if (x.ext && !['reading', 'listening'].includes(x.ext.skill)) out.empty.push('badext'); });
      const mins = t.reduce((a, x) => a + x.mins, 0); if (mins > 80) out.minsHigh++;
    }
    for (let w = 1; w <= IELTS.planApi.totalWeeks(P); w++) { const ph = IELTS.planApi.phaseOf(w, IELTS.planApi.totalWeeks(P)); out.phases[ph] = (out.phases[ph] || 0) + 1; }
    out.tabsSeen = [...out.tabsSeen]; return out;
  });
  ok(rep.empty.length === 0, `no empty/odd days (${rep.empty.slice(0, 3).join('; ') || 'none'}) over ${rep.days} days`);
  ok(rep.badTab.length === 0, 'every task links to an existing tab');
  ok(rep.exam === 1, 'exam day has a task');
  console.log('   phases (weeks):', JSON.stringify(rep.phases), '| days > 80 min:', rep.minsHigh, '| tabs used:', rep.tabsSeen.join());
  ok(rep.phases.diag === 1 && rep.phases.final === 1 && rep.phases.mock === 2 && rep.phases.found > 0 && rep.phases.build > 0 && rep.phases.timed > 0, 'all six phases present with 1 diagnostic, 2 mock and 1 final week');

  console.log('UI interactions');
  const boxes = await p.locator('[data-done]').count();
  ok(boxes >= 10, `week 1 shows ${boxes} tasks`);
  await p.locator('[data-done]').first().check();
  ok((await p.textContent('#view')).includes('1/'), 'ticking a task updates the weekly counter');
  ok(await p.evaluate(() => Object.keys(IELTS.S.plan.done).length) === 1, 'completion saved');
  await p.reload(); await p.click('nav button[data-t=plan]');
  ok(await p.locator('[data-done]:checked').count() === 1, 'completion survives reload');

  // navigate to a week with external (Cambridge) tasks
  for (let i = 0; i < 6; i++) await p.click('#pnext');
  ok((await p.textContent('#view .card h2')).includes('الأسبوع 7'), 'week navigation works');
  const extBtns = await p.locator('[data-ext]').count();
  ok(extBtns >= 1, `external-test tasks appear later in the plan (${extBtns} in week 7)`);
  const bt = p.locator('[data-ext][data-skill=listening]').first(); const of = +(await bt.getAttribute('data-of'));
  await bt.click(); const raw = Math.round(of * 0.75);
  await p.fill('#xr', String(raw)); await p.fill('#xn', 'Cambridge 17 Test 1'); await p.click('#xs');
  const m = await p.evaluate(() => IELTS.S.mocks[IELTS.S.mocks.length - 1]);
  const expect = await p.evaluate(([r, o]) => IELTS.band.fromRaw('listening', r, o), [raw, of]);
  ok(m && m.skill === 'listening' && m.raw === raw && m.of === of && m.band === expect && expect != null, `external listening ${raw}/${of} logged → band ${m && m.band}`);
  const bands = await p.evaluate(() => [IELTS.band.fromRaw('listening', 30, 40), IELTS.band.fromRaw('reading', 27, 40), IELTS.band.fromRaw('listening', 40, 40), IELTS.band.fromRaw('reading', 9, 40), IELTS.band.fromRaw('reading', 8, 10)]);
  ok(JSON.stringify(bands) === '[7,6.5,9,null,7]', `band table spot checks: ${JSON.stringify(bands)} (listening 30/40=7, reading 27/40=6.5, 40/40=9, reading 9/40=below range, reading 8/10 scaled to 32/40=7)`);
  await p.locator('[data-ext]').first().click();
  await p.fill('#xr', '99'); await p.click('#xs');
  ok((await p.textContent('#xo')).includes('0 إلى'), 'rejects out-of-range score');

  // error notebook
  await p.fill('#ew', 'discuss about'); await p.fill('#ec', 'discuss'); await p.fill('#er', 'transitive verb'); await p.click('#eadd');
  ok(await p.locator('#elist tr').count() === 2, 'mistake added to notebook');
  await p.click('nav button[data-t=home]');
  ok(await p.locator('#chart').count() === 1, 'home still renders');
  await p.click('nav button[data-t=plan]');
  ok((await p.textContent('#view')).includes('discuss about'), 'notebook persists');
  await p.click('#pedit'); await p.selectOption('#pw', 'writing'); await p.click('#pgo');
  ok(await p.evaluate(() => IELTS.S.plan.weak) === 'writing', 'settings can be edited (weak skill)');
  await p.screenshot({ path: (process.env.SHOTS || require('os').tmpdir()) + '/plan.png', fullPage: true });

  console.log('short horizon (12-week plan, no exam date)');
  const w12 = await p.evaluate(() => { const P = { start: '2026-10-05', exam: '', mpd: 90, rest: -1, weak: 'speaking', done: {}, errors: [] }; let n = 0, empty = 0; let d = new Date(2026, 9, 5); for (let i = 0; i < 84; i++, d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) { const t = IELTS.planApi.dayTasks(P, d); n += t.length; if (!t.length) empty++; } return { W: IELTS.planApi.totalWeeks(P), n, empty }; });
  ok(w12.W === 12 && w12.empty === 0, `12 weeks, 7 days/week, 90 min: ${w12.n} tasks, ${w12.empty} empty days`);

  console.log('errors:', errs.length ? errs : 'none'); failures += errs.length;
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nPLAN CHECKS PASSED'); await b.close(); process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

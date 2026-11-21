// Field Hydraulics: 2x full-page screenshots of each state + boxes (page coords) of the elements the video points at.
const { chromium } = require(process.env.PW);
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/claude-0/-home-user-waled/0d01f66a-d902-5233-9452-3007a22dc561/scratchpad/main-wt/drillers-console/hydraulics/index.html?lang=en');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
  await p.click('#exBtn'); await p.waitForTimeout(400);
  const quiet = () => p.evaluate(() => { document.querySelectorAll('#toast div').forEach(e => e.remove()); window.scrollTo(0, 0); });
  const setK = (k, v) => p.evaluate(([k, v]) => { const e = document.querySelector(`[data-k="${k}"]`); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [k, v]);
  const box = sel => p.evaluate(s => { const e = typeof s === 'string' ? document.querySelector(s) : null; if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY]; }, sel);
  const cardBox = t => p.evaluate(t => { const c = [...document.querySelectorAll('.card')].find(c => c.querySelector('h2').textContent.trim().startsWith(t)); const r = c.getBoundingClientRect(); return [r.left, r.top + scrollY, r.right, r.bottom + scrollY]; }, t);
  const kpiBox = t => p.evaluate(t => { const k = [...document.querySelectorAll('#kpis .kpi')].find(k => k.textContent.startsWith(t)); const r = k.getBoundingClientRect(); return [r.left, r.top + scrollY, r.right, r.bottom + scrollY]; }, t);
  const out = {};
  const shot = async (name, extra) => { await quiet(); await p.waitForTimeout(500); await p.screenshot({ path: `fh/${name}.png`, fullPage: true });
    const page = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]); out[name] = { page, boxes: extra ? await extra() : {} }; };
  const cards = async names => { const o = {}; for (const [k, t] of names) o[k] = await cardBox(t); return o; };
  const CARDS = [['well', 'Well'], ['mud', 'Mud & cuttings'], ['pumps', 'Pumps'], ['survey', 'Survey'], ['results', 'Results'], ['breakdown', 'Pressure breakdown'], ['compare', 'Comparison'], ['rheo', 'Rheology'], ['annulus', 'Annulus'], ['ecd', 'ECD profile'], ['measured', 'Measured data']];
  await shot('base', async () => ({ ...(await cards(CARDS)), kSpp: await kpiBox('Standpipe'), kEcdShoe: await kpiBox('ECD at shoe'), kEcdBit: await kpiBox('ECD at bit'), kHsi: await kpiBox('HSI'), kAv: await kpiBox('Annular velocity'), kBit: await kpiBox('Bit ΔP'), rheoChart: await box('#cRheo'), rheoTab: await box('#rheoTab'), ecdChart: await box('#cEcd'), pathChart: await box('#cPath') }));
  // directional survey pasted: J-shaped well, kick-off 1000 m, build 3°/100 m to 30°, hold to TD
  const rows = [[0, 0, 0], [1000, 0, 0]]; for (let md = 1100; md <= 2000; md += 100) rows.push([md, Math.min(30, (md - 1000) * 0.03), 45]); rows.push([3115, 30, 45]);
  await p.evaluate(t => { const e = document.getElementById('survey'); e.value = t; e.dispatchEvent(new Event('input', { bubbles: true })); }, rows.map(r => r.join('\t')).join('\n'));
  await shot('survey', async () => ({ ...(await cards(CARDS)), kEcdShoe: await kpiBox('ECD at shoe'), kSpp: await kpiBox('Standpipe'), ecdChart: await box('#cEcd'), pathChart: await box('#cPath'), survNote: await box('#survNote'), annTab: await box('#annTab') }));
  // pump rate pushed up step by step
  for (const spm of [105, 115, 125]) { await setK('pumps.spm.0', spm); await setK('pumps.spm.1', spm); await setK('pumps.spm.2', spm);
    await shot('spm' + spm, async () => ({ results: await cardBox('Results'), kSpp: await kpiBox('Standpipe'), kFlow: await kpiBox('Flow rate'), warns: await box('#warns') })); }
  for (const k of ['pumps.spm.0', 'pumps.spm.1', 'pumps.spm.2']) await setK(k, 95);
  // measured data from the rig (example values)
  await p.click('[data-add="measured"]'); await p.waitForTimeout(200);
  await setK('measured.0.src', 'Rig (example)'); await setK('measured.0.q', 3797); await setK('measured.0.spp', 262); await setK('measured.0.ecd', 1.224); await setK('measured.0.ecdDepth', 3115);
  await shot('measured', async () => ({ compare: await cardBox('Comparison'), measured: await cardBox('Measured data'), cmpTab: await box('#cmp table') }));
  // Arabic interface
  await p.click('[data-lang="ar"]'); await p.waitForTimeout(400);
  await shot('arabic', async () => ({ top: [0, 0, 1600, 760] }));
  fs.writeFileSync('fh-boxes.json', JSON.stringify(out, null, 1));
  console.log(Object.entries(out).map(([k, v]) => k + ' ' + v.page + ' ' + Object.keys(v.boxes).join(',')).join('\n'));
  console.log(errs.join('\n') || 'no page errors'); await b.close();
})();

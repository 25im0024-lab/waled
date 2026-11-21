// Full-page 2x screenshots of each Frac-Fluid Lab tab + bounding boxes of the regions each video scene focuses on.
const { chromium } = require(process.env.PW);
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 2 });
  p.on('dialog', d => d.accept());
  await p.goto('file:///home/user/waled/frac-lab/index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#exBtn'); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelectorAll('#toast div').forEach(e => e.remove()));
  const box = async sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY]; }, sel);
  const out = {};
  const shot = async (name, tab, sels, prep) => {
    await p.click(`[data-tab="${tab}"]`); await p.waitForTimeout(400);
    if (prep) { await prep(); await p.waitForTimeout(500); }
    await p.evaluate(() => { document.querySelectorAll('#toast div').forEach(e => e.remove()); window.scrollTo(0, 0); });
    await p.screenshot({ path: `shots/${name}.png`, fullPage: true });
    out[name] = { boxes: await Promise.all(sels.map(box)), page: await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]) };
  };
  await shot('home', 'rheo', ['.hdr', '.grid']);
  await shot('rheo', 'rheo', ['#cRheo', '#oRheo .card'], () => p.selectOption('[data-k="rheo.curves"]', 'all'));
  await shot('thermal', 'thermal', ['#cTh', '#oTh .card']);
  await shot('ve', 've', ['#cVe', '#cTd', '#oVe .card']);
  await shot('prop', 'prop', ['#cProp', '#oProp .card']);
  await shot('brk', 'brk', ['#cBrk', '#oBrk .card']);
  await shot('frac', 'frac', ['#oFrac .card', '#cFl', '#cFw']);
  await shot('surf', 'surf', ['#cCmc', '#cIft', '#oSurf .card']);
  await shot('cmp', 'cmp', ['#oCmp']);
  await shot('proto', 'thermal', ['details.proto'], () => p.click('details.proto summary'));
  fs.writeFileSync('boxes.json', JSON.stringify(out, null, 1));
  await b.close();
})();

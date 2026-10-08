// Renders guide/guide.html to guide/drillers-console-guide.pdf with Playwright's Chromium.
//   node drillers-console/guide/build-pdf.js
// Fonts (Noto Sans / Noto Naskh Arabic) load from Google Fonts; without network the system fonts are used.
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
(async () => {
  const b = await pw.chromium.launch(); const p = await b.newPage();
  if (process.env.GUIDE_ROUTE) await require(path.resolve(process.env.GUIDE_ROUTE))(p); // optional request routing (e.g. local font mirror)
  await p.goto('file://' + path.join(__dirname, 'guide.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const out = path.join(__dirname, 'drillers-console-guide.pdf');
  await p.pdf({ path: out, format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font:7pt sans-serif;color:#667;width:100%;padding:0 11mm;display:flex;justify-content:space-between"><span>Driller\'s Console — Parameter Guide · دليل البارامترات</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
  await b.close(); console.log('->', out);
})();

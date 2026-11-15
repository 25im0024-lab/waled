// Render the Cannon-Fenske film to MP4, one language at a time.
// Needs Playwright (Chromium) and ffmpeg, plus Noto Sans Arabic for the Arabic captions.
//   node vlab/video/render.js en            → vlab/video/cannon-fenske-en.mp4
//   node vlab/video/render.js ar --fps 25   → vlab/video/cannon-fenske-ar.mp4
//   node vlab/video/render.js en --stills 15,47,88   → PNG stills only (for checking)
// The film is stepped frame by frame through FILM.frame(t), so the result is smooth however slow the GPU is.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const args = process.argv.slice(2);
const lang = args[0] === 'ar' ? 'ar' : 'en';
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const fps = +(opt('--fps') || 25);
const stills = opt('--stills');
const out = opt('--out') || path.join(__dirname, `cannon-fenske-${lang}.mp4`);
const tmp = opt('--tmp') || fs.mkdtempSync(path.join(require('os').tmpdir(), `film-${lang}-`));
const root = path.join(__dirname, '..');

// tiny static server for vlab/ (file:// would block nothing here, but keeps paths identical to the site)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  await page.goto(`http://127.0.0.1:${port}/video/film.html?render=1&lang=${lang}`);
  await page.waitForFunction(() => window.FILM && window.FILM.ready);
  const dur = await page.evaluate(() => window.FILM.DUR);
  const times = stills ? stills.split(',').map(Number) : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
  const t0 = Date.now();
  for (const [i, t] of times.entries()) {
    await page.evaluate(x => window.FILM.frame(x), t);
    const file = stills ? path.join(tmp, `still-${lang}-${t}.png`) : path.join(tmp, `f${String(i).padStart(5, '0')}.jpg`);
    await page.screenshot(stills ? { path: file } : { path: file, type: 'jpeg', quality: 92 });
    if (!stills && i % 250 === 0) console.log(`${lang}: frame ${i}/${times.length} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  await browser.close(); server.close();
  if (stills) { console.log('stills in', tmp); return; }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%05d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
})();

import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const mode = args[0];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const port = 8700 + Math.floor(Math.random() * 200);
await new Promise(r => srv.listen(port, r));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 300)); });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:${port}/index.html`);
await p.waitForFunction('window.ready===true', null, { timeout: 120000 });
fs.mkdirSync(path.join(dir, 'frames'), { recursive: true });
if (mode === 'still') {
  for (const t of args.slice(1).map(Number)) { const t0 = Date.now(); await p.evaluate(t => window.renderAt(t), t); await p.screenshot({ path: path.join(dir, `still_${t.toFixed(1)}.jpg`), type: 'jpeg', quality: 92 }); console.log('still', t, (Date.now() - t0) + 'ms'); }
} else if (mode === 'range') {
  const [a, bb] = [Number(args[1]), Number(args[2])];
  for (let i = a; i < bb; i++) { await p.evaluate(t => window.renderAt(t), i / 24); await p.screenshot({ path: path.join(dir, 'frames', `f_${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 93 }); if (i % 12 === 0) console.log('frame', i); }
}
await b.close(); srv.close();

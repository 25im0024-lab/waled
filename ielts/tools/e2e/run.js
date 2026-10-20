#!/usr/bin/env node
/* Serves the repository root on a free local port and runs every *.e2e.js suite against it.
   Needs Playwright with Chromium:  npm install && npx playwright install chromium */
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const root = path.resolve(__dirname, '..', '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + server.address().port;
  const suites = fs.readdirSync(__dirname).filter(f => f.endsWith('.e2e.js')).sort();
  let failed = 0;
  for (const f of suites) {
    console.log(`\n=== ${f} ===`);
    // async spawn: the static server lives in this process and must keep serving while the suite runs
    const code = await new Promise(res => spawn(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit', env: { ...process.env, BASE_URL: base } }).on('exit', res));
    if (code !== 0) failed++;
  }
  server.close();
  console.log(failed ? `\n${failed} suite(s) FAILED` : '\nAll suites passed');
  process.exit(failed ? 1 : 0);
});

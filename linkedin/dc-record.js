// Records each scene of the Driller's Console video with a CDP screencast (real motion), plus the crop box per scene.
const { chromium } = require(process.env.PW);
const fs = require('fs');
const OUT = 'dc-frames'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/claude-0/-home-user-waled/0d01f66a-d902-5233-9452-3007a22dc561/scratchpad/main-wt/drillers-console/index.html?lang=en');
  await p.waitForTimeout(2500);
  const cdp = await p.context().newCDPSession(p);
  const speed = v => p.evaluate(v => document.querySelector(`[data-speed="${v}"]`).click(), v);
  const clickJS = sel => p.evaluate(s => document.querySelector(s).click(), sel);
  const scrollTo = y => p.evaluate(y => window.scrollTo(0, y), y);
  const rect = sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }, sel);
  const cardOf = h => `section.card:has(> h2:is(:scope h2)):nth-of-type(1)`; // unused
  const card = async title => p.evaluate(t => { const s = [...document.querySelectorAll('section.card')].find(c => c.querySelector('h2') && c.querySelector('h2').textContent.trim().startsWith(t)); const r = s.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, r.top + scrollY]; }, title);
  const meta = {};
  async function scene(name, dur, prep, crop, actions) {
    if (prep) await prep();
    await p.waitForTimeout(300);
    const box = await crop();
    const dir = `${OUT}/${name}`; fs.mkdirSync(dir); const frames = []; let k = 0;
    const onFrame = f => { const ts = f.metadata.timestamp; const fn = `${dir}/${String(k++).padStart(5, '0')}.jpg`; fs.writeFileSync(fn, Buffer.from(f.data, 'base64')); frames.push([fn, ts]); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); };
    cdp.on('Page.screencastFrame', onFrame);
    const t0 = Date.now() / 1000;
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 3200, maxHeight: 2000, everyNthFrame: 2 });
    for (const [at, fn] of (actions || [])) { const w = t0 + at - Date.now() / 1000; if (w > 0) await p.waitForTimeout(w * 1000); await fn(); }
    const w = t0 + dur + 0.4 - Date.now() / 1000; if (w > 0) await p.waitForTimeout(w * 1000);
    await cdp.send('Page.stopScreencast'); cdp.off('Page.screencastFrame', onFrame);
    meta[name] = { box, page: [1600, 1000], scale: 1, t0, frames: frames.map(([f, ts]) => [f, +(ts - t0).toFixed(3)]) };
    console.log(name, 'frames', frames.length, 'box', box.map(Math.round));
  }
  // 1. overview
  await scene('overview', 5.2, async () => { await scrollTo(0); await speed(1); }, async () => [0, 0, 1411, 1000]);
  // 2. auto-driller: raise the WOB setpoint, watch ROP and the control loop respond
  const setWob = v => p.evaluate(v => { const e = document.getElementById('sWob'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, v);
  await scene('autodriller', 6.0, async () => { await scrollTo(0); await speed(5); }, async () => { const a = await card('Rig & Well'), c = await card('Drilling Control'); return [a[0], 182, c[2] + 6, 925]; },
    [[1.0, () => setWob(150)], [1.6, () => setWob(175)], [2.2, () => setWob(195)]]);
  // 3. mud circulation
  await scene('circulation', 6.0, async () => { const c = await card('Mud Circulation'); await scrollTo(c[4] - 10); await speed(20); }, async () => { const c = await card('Mud Circulation'); return [c[0], c[1], c[0] + 990, c[1] + 700]; });
  // 4. bit close-up: 2x clipped screenshots (the screencast is only 1x); top drive at 40 rpm so the blades don't alias
  const setRange = (id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
  await speed(1); await setRange('sRpm', 40); await p.waitForTimeout(2500);
  { const c = await card('Mud Circulation'), box = [c[0] + 572, c[1] + 410, c[0] + 945, c[1] + 680], sy = await p.evaluate(() => scrollY); // CDP clip is in page coordinates
    const dir = `${OUT}/bit`; fs.mkdirSync(dir); const frames = []; const t0 = Date.now() / 1000; let k = 0;
    while (Date.now() / 1000 - t0 < 5.0) { const ts = Date.now() / 1000 - t0, fn = `${dir}/${String(k++).padStart(5, '0')}.jpg`;
      const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, optimizeForSpeed: true, clip: { x: box[0], y: box[1] + sy, width: box[2] - box[0], height: box[3] - box[1], scale: 1 } });
      fs.writeFileSync(fn, Buffer.from(r.data, 'base64')); frames.push([fn, +ts.toFixed(3)]); }
    meta.bit = { box: [0, 0, box[2] - box[0], box[3] - box[1]], page: [box[2] - box[0], box[3] - box[1]], scale: 2, t0, frames }; console.log('bit frames', frames.length); }
  await setRange('sRpm', 120);
  // 5. kick: instructor dialog, inject kick, run fast
  await scene('kick', 8.0, async () => { await scrollTo(0); await speed(5); }, async () => [16, 90, 1190, 1000],
    [[0.6, () => clickJS('#instrBtn')], [2.0, () => clickJS('[data-sc="kick"]')], [2.8, () => clickJS('#instrClose')], [3.0, () => speed(60)], [6.6, () => speed(5)]]);
  // 6. shut-in: pumps off, close annular, pressures build in the kill sheet
  await scene('shutin', 8.0, async () => { const c = await card('BOP / Well Control'); await scrollTo(c[4] - 10); await speed(5); }, async () => { const a = await card('BOP / Well Control'), k = await card('Kill Sheet'); return [a[0], a[1], k[2], k[3]]; },
    [[0.8, () => clickJS('#allPumpsOff')], [2.4, () => clickJS('[data-bop="annular"][data-st="CLOSED"]')], [4.0, () => speed(20)]]);
  // 7. trends and alarms
  await scene('trends', 5.0, async () => { const c = await card('Real-Time Trends'); await scrollTo(c[4] - 10); }, async () => { const a = await card('Real-Time Trends'), k = await card('Alarm / Safety'); return [a[0], a[1], k[2], k[3]]; });
  fs.writeFileSync('dc-meta.json', JSON.stringify(meta));
  console.log(errs.join('\n') || 'no page errors'); await b.close();
})();

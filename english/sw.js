/* English Hub service worker: offline cache for same-origin static files (stale-while-revalidate). */
const CACHE = 'english-hub-v2';
const PRECACHE = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'vendor/anthropic-sdk.js',
  'js/core.js', 'js/quiz.js', 'js/notebook.js', 'js/mod/notebook.js', 'js/mod/progress.js', 'js/mod/speaking.js', 'js/dialogue.js', 'js/visuals.js', 'js/ai.js', 'js/main.js',
  'js/data/vocab.js', 'js/data/vocab2.js', 'js/data/scenes.js', 'js/data/common.js', 'js/data/grammar.js', 'js/data/grammar2.js', 'js/data/grammar3.js', 'js/data/grammar-bank.js', 'js/data/reading.js', 'js/data/reading2.js', 'js/data/listening.js', 'js/data/listening2.js', 'js/data/writing.js', 'js/data/work.js', 'js/data/sounds.js', 'js/data/expressions.js', 'js/data/placement.js', 'js/data/cando.js', 'js/data/speaking.js',
  'js/mod/home.js', 'js/mod/words.js', 'js/mod/scenes.js', 'js/mod/grammar.js', 'js/mod/reading.js', 'js/mod/listening.js', 'js/mod/writing.js', 'js/mod/work.js', 'js/mod/sounds.js', 'js/mod/expressions.js', 'js/mod/placement.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;     // never touch API calls
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});

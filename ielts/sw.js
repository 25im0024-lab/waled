/* IELTS Coach service worker: offline cache for same-origin static files (stale-while-revalidate). */
const CACHE = 'ielts-coach-v1';
const PRECACHE = ['./', 'index.html', 'css/app.css', 'js/core.js', 'js/charts.js', 'js/exam.js', 'js/ai.js', 'js/main.js',
  'js/data/vocab.js', 'js/data/grammar.js', 'js/data/writing.js', 'js/data/speaking.js', 'js/data/reading.js', 'js/data/listening.js',
  'js/mod/home.js', 'js/mod/vocab.js', 'js/mod/grammar.js', 'js/mod/reading.js', 'js/mod/listening.js', 'js/mod/writing.js', 'js/mod/speaking.js', 'js/mod/toolkit.js',
  'manifest.webmanifest', 'icon.svg', 'vendor/anthropic-sdk.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;   // never touch API calls
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});

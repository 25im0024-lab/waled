/* Frac Gel Lab 3D service worker: offline copy of this folder.
   Network first, so a new deploy shows on the next load; the cache is only the offline fallback.
   Bump CACHE when the app shell changes to drop old copies. */
const CACHE = 'vlab-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'css/style.css', 'js/model.js', 'js/app.js', 'js/gel.js', 'js/break.js',
  'vendor/three.min.js', 'vendor/OrbitControls.js'];
const SCOPE_PATH = new URL('./', self.location).pathname;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('vlab-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin || !u.pathname.startsWith(SCOPE_PATH)) return;
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { if (res && res.ok) caches.open(CACHE).then(c => c.put(r, res.clone())); return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(hit => hit || (r.mode === 'navigate' ? caches.match('index.html') : undefined))));
});

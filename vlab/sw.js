/* Virtual Lab service worker: offline cache (stale-while-revalidate) for this folder.
   Bump CACHE when the app shell changes to drop old copies. */
const CACHE = 'vlab-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'css/style.css', 'js/model.js', 'js/app.js', 'js/flame.js', 'js/gel.js',
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
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => hit || (r.mode === 'navigate' ? c.match('index.html') : undefined));
    return hit || net;
  }));
});

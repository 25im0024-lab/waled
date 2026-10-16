/* Home page service worker: offline copy of the tools hub only.
   Scope is the whole site, but every request outside the hub's own files is left to the network
   (and to each app's own, narrower service worker, which takes precedence for its folder). */
const CACHE = 'waled-home-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
const ROOT = new URL('./', self.location).pathname;
const OWN = new Set(SHELL.map(p => new URL(p, self.location).pathname));
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('waled-home-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== self.location.origin || !OWN.has(u.pathname)) return;
  // network first so the hub always shows the newest list of tools; cache when offline
  e.respondWith(fetch(r).then(res => { if (res && res.ok) caches.open(CACHE).then(c => c.put(r, res.clone())); return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(h => h || caches.match(ROOT))));
});

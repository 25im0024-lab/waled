/* English Hub — bootstrap: tab order, initial route, service worker. */
(function () {
  'use strict';
  const E = window.EL;
  const ORDER = ['home', 'words', 'scenes', 'grammar', 'reading', 'listening', 'writing', 'work', 'sounds', 'expressions', 'placement'];
  E.tabs.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const start = location.hash.replace('#/', '');
  E.show(E.tabs.some(t => t.id === start) ? start : 'home', false);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) E.toast('تحديث جديد جاهز: أعد تحميل الصفحة لتفعيله'); });
      });
    }).catch(() => { /* offline cache is optional */ });
  }
})();

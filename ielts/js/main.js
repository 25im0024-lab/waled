/* IELTS Coach — bootstrap: tab order, initial route, service worker. */
(function () {
  'use strict';
  const I = window.IELTS;
  const ORDER = ['home', 'plan', 'reading', 'listening', 'writing', 'speaking', 'vocab', 'grammar', 'toolkit'];
  I.tabs.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const start = location.hash.replace('#/', '');
  I.show(I.tabs.some(t => t.id === start) ? start : 'home', false);
  I.currentId = I.tabs.some(t => t.id === start) ? start : 'home';
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) I.toast('تحديث جديد للأداة جاهز: أعد تحميل الصفحة لتفعيله'); });
      });
    }).catch(() => { /* offline cache is optional */ });
  }
})();

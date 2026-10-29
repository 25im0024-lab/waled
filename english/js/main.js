/* English Hub — bootstrap: tab order, initial route, service worker. */
(function () {
  'use strict';
  const E = window.EL;
  const ORDER = ['home', 'words', 'scenes', 'grammar', 'reading', 'listening', 'writing', 'speaking', 'work', 'sounds', 'expressions', 'notebook', 'progress', 'placement'];
  E.tabs.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  /* First-visit welcome (3 short steps). */
  function intro() {
    const steps = [['👋', 'أهلًا بك في English Hub', 'تعلّم الإنجليزية من A1 إلى B1 بالعربية والإنجليزية: كلمات بصور، مشاهد تفاعلية، قواعد، قراءة، استماع، كتابة، تحدّث، وقسم للإنجليزية في العمل.'],
      ['📅', 'ابدأ من «الرئيسية»', 'ستجد هناك «خطة اليوم» (15–20 دقيقة) بما يستحق المراجعة والدرس التالي. أخطاؤك تُحفظ تلقائيًا في «الأخطاء» وتعود للمراجعة.'],
      ['💾', 'بياناتك في متصفحك فقط', 'لا حساب ولا سيرفر. من الرئيسية يمكنك تصدير نسخة احتياطية. يعمل أوفلاين بعد أول تحميل، ويمكن تثبيته على الهاتف.']];
    let i = 0; const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'مرحبًا');
    const draw = () => { const [ic, t, p] = steps[i]; m.innerHTML = `<div class="box"><div class="big-ic" aria-hidden="true">${ic}</div><h2>${t}</h2><p>${p}</p><div class="dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><div class="row" style="justify-content:center"><button data-skip>تخطَّ</button><button class="primary" data-next>${i === steps.length - 1 ? 'ابدأ' : 'التالي ›'}</button></div></div>`; m.querySelector('[data-next]').focus(); m.querySelector('[data-skip]').onclick = close; m.querySelector('[data-next]').onclick = () => { if (i === steps.length - 1) close(); else { i++; draw(); } }; };
    const close = () => { m.remove(); E.S.intro = 1; E.save(); };
    document.body.appendChild(m); draw();
    m.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  if (!E.S.intro) setTimeout(intro, 400);

  /* Gentle backup reminder (progress lives only in this browser). */
  if (E.S.xp >= 100 && Date.now() - (E.S.lastExport || 0) > 14 * 864e5) setTimeout(() => E.toast('💾 تذكير: صدّر نسخة احتياطية من تقدّمك (الرئيسية ← الإعدادات)'), 2500);

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

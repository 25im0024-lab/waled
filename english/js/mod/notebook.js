/* Mistakes notebook tab. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc } = E;
  const text = it => String(it.q || it.say || it.target || (it.words && it.words.join(' ')) || (it.pairs && 'Match: ' + it.pairs.map(p => p[0]).join(', ')) || '').slice(0, 120);
  const ans = it => { const a = it.shown || (Array.isArray(it.a) ? it.a[0] : it.a); return typeof a === 'boolean' ? (a ? 'True' : 'False') : String(a == null ? '' : a); };
  const when = r => { const d = r.due - E.dayIdx(); return d <= 0 ? 'الآن' : d === 1 ? 'غدًا' : `بعد ${d} أيام`; };

  function render() {
    const rows = E.nb.all().sort((a, b) => a.due - b.due || b.at - a.at), due = E.nb.due();
    const bySrc = {}; rows.forEach(r => { bySrc[r.src || '—'] = (bySrc[r.src || '—'] || 0) + 1; });
    $('#view').innerHTML = `<div class="card"><h2>📒 دفتر الأخطاء · Mistakes notebook</h2>
      <p class="muted">كل سؤال تخطئ فيه في أي قسم يُحفظ هنا ويعود للمراجعة بعد يوم ثم بعد 3 أيام. بعد ثلاث مراجعات صحيحة يخرج من الدفتر، وأي إجابة خاطئة تعيده إلى البداية.</p>
      <div class="row"><span class="chip">📒 ${rows.length}</span><span class="chip">⏰ مستحقّ الآن: ${due.length}</span></div>
      <div class="row"><button class="primary big" data-go ${due.length ? '' : 'disabled'}>🔁 ابدأ مراجعة اليوم (${Math.min(15, due.length)})</button><button class="big" data-all ${rows.length ? '' : 'disabled'}>📚 راجع الكل</button><button class="bad" data-clear ${rows.length ? '' : 'disabled'}>🗑️ مسح الدفتر</button></div>
      ${Object.keys(bySrc).length ? `<p class="muted">حسب المصدر: ${Object.entries(bySrc).map(([k, v]) => `${esc(k)} (${v})`).join(' · ')}</p>` : ''}</div>
      ${rows.length ? `<div class="card"><div class="ex-list">${rows.slice(0, 60).map(r => `<div class="ex-item" style="flex-wrap:wrap"><span class="en" dir="ltr" style="flex:1;min-width:200px"><b>${esc(text(r.item))}</b><br><small class="muted">✅ ${esc(ans(r.item))}</small></span><span class="muted" style="font-size:.8rem">${esc(r.src)} · ${when(r)}</span><button class="sm" data-rm="${esc(r.k)}" aria-label="حذف">✕</button></div>`).join('')}</div>${rows.length > 60 ? `<p class="muted">يُعرض أول 60 من ${rows.length}.</p>` : ''}</div>` : '<div class="card" style="text-align:center"><div style="font-size:3rem">✨</div><p>الدفتر فارغ. أخطاؤك ستظهر هنا تلقائيًا أثناء التمارين.</p></div>'}`;
    const go = list => E.nb.review($('#view'), list, render);
    const b1 = $('[data-go]'), b2 = $('[data-all]'), b3 = $('[data-clear]');
    if (b1) b1.onclick = () => go(due); if (b2) b2.onclick = () => go(E.nb.all());
    if (b3) b3.onclick = () => { if (confirm('حذف كل الأخطاء المحفوظة؟')) { E.nb.clear(); render(); } };
    $$('#view [data-rm]').forEach(b => b.onclick = () => { E.nb.remove(b.dataset.rm); render(); });
  }
  E.register('notebook', 'الأخطاء', '📒', render, 55);
})();

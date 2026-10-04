/* IELTS Coach — exam engine shared by Reading and Listening:
   question numbering, rendering of all IELTS item types, answer capture, marking, review and analytics. */
(function () {
  'use strict';
  const I = window.IELTS, esc = I.esc;
  const TF = { tfng: [['T', 'TRUE'], ['F', 'FALSE'], ['NG', 'NOT GIVEN']], ynng: [['Y', 'YES'], ['N', 'NO'], ['NG', 'NOT GIVEN']] };
  const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LABEL = { tfng: 'True / False / Not Given', ynng: 'Yes / No / Not Given', mcq: 'Multiple choice', mcq2: 'Multiple choice (choose two)', complete: 'Sentence / note / form completion', short: 'Short answer', heading: 'Matching headings', match: 'Matching', map: 'Map / plan labelling', summary: 'Summary completion' };
  const limitWords = l => /ONE WORD AND\/OR A NUMBER/i.test(l) ? 2 : /THREE/i.test(l) ? 3 : /TWO/i.test(l) ? 2 : /ONE/i.test(l) ? 1 : 99;

  /** Assign sequential question numbers across parts. mcq2 items consume two numbers. */
  function number(test) {
    let n = 1;
    test.parts.forEach(p => {
      p.first = n;
      p.groups.forEach(g => {
        g.first = n;
        g.items.forEach(it => { if (it.h) return; it.n = n; n += g.type === 'mcq2' ? 2 : 1; });
        g.last = n - 1;
      });
      p.last = n - 1;
    });
    test.total = n - 1;
    return test;
  }

  function instr(g) {
    if (g.instruction) return g.instruction;
    const lim = g.limit ? `Write ${g.limit} for each answer.` : '';
    switch (g.type) {
      case 'tfng': return 'Do the following statements agree with the information given in the passage? Write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN if there is no information on this.';
      case 'ynng': return 'Do the following statements agree with the views or claims of the writer? Write YES if the statement agrees with the views of the writer, NO if the statement contradicts the views of the writer, NOT GIVEN if it is impossible to say what the writer thinks about this.';
      case 'mcq': return 'Choose the correct letter, A, B, C or D.';
      case 'mcq2': return 'Choose TWO letters, A–E.';
      case 'complete': case 'short': case 'summary': return 'Complete the answers. ' + lim;
      case 'heading': return 'Choose the correct heading for each paragraph from the list of headings below.';
      default: return '';
    }
  }

  const bankHtml = (bank, title) => `<div class="bank">${title ? `<b>${esc(title)}</b>` : ''}${bank.map(b => `<div><b>${esc(b.k)}</b> &nbsp; ${esc(b.t)}</div>`).join('')}</div>`;
  const qwrap = (n, inner, label) => `<div class="qitem" id="q${n}" data-q="${n}"><span class="n">${label || n}</span><div class="body">${inner}</div><button class="flag" type="button" aria-label="Flag question ${n}" title="Flag for review">⚑</button></div>`;
  const selectHtml = (n, keys) => `<select data-n="${n}" aria-label="Answer ${n}"><option value="">–</option>${keys.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select>`;

  function itemHtml(g, it) {
    const n = it.n;
    switch (g.type) {
      case 'tfng': case 'ynng':
        return qwrap(n, `<p>${esc(it.q)}</p><div>${TF[g.type].map(([k, t]) => `<label class="ch" style="display:inline-block;margin-inline-end:14px"><input type="radio" name="q${n}" data-n="${n}" value="${k}"> ${t}</label>`).join('')}</div>`);
      case 'mcq':
        return qwrap(n, `<p>${esc(it.q)}</p>${it.opts.map((o, i) => `<label class="ch"><input type="radio" name="q${n}" data-n="${n}" value="${LET[i]}"> <b>${LET[i]}</b> ${esc(o)}</label>`).join('')}`);
      case 'mcq2':
        return qwrap(n, `<p>${esc(it.q)}</p>${it.opts.map((o, i) => `<label class="ch"><input type="checkbox" name="q${n}" data-n="${n}" value="${LET[i]}"> <b>${LET[i]}</b> ${esc(o)}</label>`).join('')}`, `${n}–${n + 1}`);
      case 'complete': case 'short': {
        const parts = it.q.split('____'), inp = `<input class="gap" data-n="${n}" autocomplete="off" spellcheck="false" aria-label="Answer ${n}">`;
        return qwrap(n, `<p>${parts.length > 1 ? esc(parts[0]) + inp + esc(parts.slice(1).join('')) : esc(it.q) + ' ' + inp}</p>`);
      }
      case 'heading': case 'match': case 'map': {
        const keys = (g.bank || g.headings).map(b => b.k);
        return qwrap(n, `<p>${esc(it.q)} ${selectHtml(n, keys)}</p>`);
      }
      default: return '';
    }
  }

  function groupHtml(g) {
    const rng = g.first === g.last ? `Question ${g.first}` : `Questions ${g.first}–${g.last}`;
    let h = `<section class="qgroup"><div class="ghead"><b>${rng}</b><span class="tag">${LABEL[g.type] || ''}</span></div>`;
    h += `<p class="instr">${esc(instr(g))}</p>`;
    if (g.figure) h += g.figure;
    if (g.type === 'heading') h += bankHtml(g.headings, 'List of Headings');
    else if (g.bank && g.type !== 'summary' && g.type !== 'map') h += bankHtml(g.bank, g.bankTitle);
    if (g.type === 'summary') {
      if (g.bank) h += bankHtml(g.bank, g.bankTitle || 'Word bank');
      let i = 0;
      const body = esc(g.text).replace(/\{\{(\d+)\}\}/g, (_, k) => {
        const it = g.items[+k - 1];
        return `<span class="sumgap" data-q="${it.n}" id="q${it.n}"><b class="n" style="min-width:20px;height:20px;border-radius:10px;font-size:11px;display:inline-flex;align-items:center;justify-content:center;background:var(--panel2);border:1px solid var(--line)">${it.n}</b> ${g.bank ? selectHtml(it.n, g.bank.map(b => b.k)) : `<input class="gap" data-n="${it.n}" autocomplete="off" spellcheck="false" aria-label="Answer ${it.n}">`}</span>`;
      });
      h += `<div class="q en" style="line-height:2.2">${body.replace(/\n/g, '<br>')}</div>`;
    } else {
      if (g.title) h += `<h4 class="en">${esc(g.title)}</h4>`;
      g.items.forEach(it => { h += it.h ? `<h4 class="en" style="margin:10px 0 2px">${esc(it.h)}</h4>` : itemHtml(g, it); });
    }
    return h + '</section>';
  }

  /* ---------- answer capture ---------- */
  const has = v => Array.isArray(v) ? v.length > 0 : !!String(v == null ? '' : v).trim();
  function bind(container, state, onChange) {
    const read = el => {
      const n = +el.dataset.n, type = el.type;
      if (type === 'checkbox') return $all(container, `input[type=checkbox][data-n="${n}"]:checked`).map(x => x.value);
      if (type === 'radio') { const c = container.querySelector(`input[type=radio][name="q${n}"]:checked`); return c ? c.value : ''; }
      return el.value.trim();
    };
    const $all = (r, s) => [...r.querySelectorAll(s)];
    const upd = e => {
      const t = e.target; if (!t.dataset || t.dataset.n == null) return;
      const n = +t.dataset.n; let v = read(t);
      if (t.type === 'checkbox' && v.length > 2) { t.checked = false; v = read(t); I.toast('اختر إجابتين فقط'); }
      state.ans[n] = v;
      const w = t.closest('[data-q]'); if (w) w.classList.toggle('answered', has(v));
      if (onChange) onChange(n);
    };
    container.addEventListener('input', e => { if (e.target.matches('input.gap')) upd(e); });
    container.addEventListener('change', upd);
    container.addEventListener('click', e => {
      const b = e.target.closest('.flag'); if (!b) return;
      const w = b.closest('[data-q]'), n = +w.dataset.q;
      if (state.flags.has(n)) state.flags.delete(n); else state.flags.add(n);
      w.classList.toggle('flagged', state.flags.has(n));
      if (onChange) onChange(n);
    });
  }
  /** Re-apply saved answers to freshly rendered DOM (used when resuming). */
  function restore(container, state) {
    Object.entries(state.ans).forEach(([n, v]) => {
      const els = container.querySelectorAll(`[data-n="${n}"]`); if (!els.length) return;
      els.forEach(el => {
        if (el.type === 'radio') el.checked = el.value === v;
        else if (el.type === 'checkbox') el.checked = (v || []).includes(el.value);
        else el.value = v;
      });
      const w = container.querySelector(`[data-q="${n}"]`); if (w) w.classList.toggle('answered', has(v));
    });
    state.flags.forEach(n => { const w = container.querySelector(`[data-q="${n}"]`); if (w) w.classList.add('flagged'); });
  }

  /* ---------- marking ---------- */
  function wordsOf(s) { return String(s).trim().split(/\s+/).filter(Boolean); }
  function markItem(g, it, given) {
    const exp = Array.isArray(it.a) ? it.a : [it.a];
    if (g.type === 'mcq2') {
      const sel = Array.isArray(given) ? given : [];
      const okCount = sel.length > 2 ? 0 : sel.filter(x => it.a.includes(x)).length;
      return { ok: okCount, of: 2, given: sel.join(', '), exp: it.a.join(', ') };
    }
    const isText = g.type === 'complete' || g.type === 'short' || (g.type === 'summary' && !g.bank);
    let ok;
    if (isText) {
      const gv = String(given || '').trim(), lim = limitWords(g.limit || '');
      ok = has(gv) && wordsOf(gv).length <= lim && exp.some(a => I.norm(a) === I.norm(gv));
      return { ok: ok ? 1 : 0, of: 1, given: gv, exp: exp[0] + (exp.length > 1 ? ` (also: ${exp.slice(1).join(' / ')})` : '') };
    }
    ok = given === it.a;
    const list = g.bank || g.headings, hit = list && list.find(b => b.k === it.a);
    return { ok: ok ? 1 : 0, of: 1, given: given || '', exp: it.a + (hit && g.type !== 'summary' ? ` — ${hit.t}` : '') };
  }
  function mark(test, ans) {
    const results = [], byType = {};
    test.parts.forEach(p => p.groups.forEach(g => g.items.forEach(it => {
      if (it.h) return;
      const m = markItem(g, it, ans[it.n]);
      const bt = byType[g.type] || (byType[g.type] = { ok: 0, of: 0 });
      bt.ok += m.ok; bt.of += m.of;
      if (g.type === 'mcq2') {
        results.push({ n: it.n, type: g.type, ok: m.ok >= 1, given: m.given, exp: m.exp, ev: it.ev, q: it.q, part: p.id });
        results.push({ n: it.n + 1, type: g.type, ok: m.ok >= 2, given: '', exp: '', ev: '', q: '(second answer)', part: p.id });
      } else results.push({ n: it.n, type: g.type, ok: !!m.ok, given: m.given, exp: m.exp, ev: it.ev, q: it.q || ('Gap ' + it.n), part: p.id });
    })));
    const score = results.filter(r => r.ok).length;
    return { score, total: test.total, results, byType };
  }

  /* ---------- navigator + review ---------- */
  function navHtml(test) {
    return `<div class="navgrid" role="group" aria-label="Question navigator">${Array.from({ length: test.total }, (_, i) => `<button type="button" data-go="${i + 1}" aria-label="Question ${i + 1}">${i + 1}</button>`).join('')}</div>`;
  }
  function updateNav(root, state) {
    root.querySelectorAll('.navgrid button').forEach(b => {
      const n = +b.dataset.go;
      b.classList.toggle('answered', has(state.ans[n]) || (n > 1 && Array.isArray(state.ans[n - 1]) && state.ans[n - 1].length === 2));
      b.classList.toggle('flagged', state.flags.has(n));
    });
  }
  function annotate(container, marks) {
    container.querySelectorAll('input,select').forEach(el => el.disabled = true);
    marks.results.forEach(r => {
      const w = container.querySelector(`[data-q="${r.n}"]`); if (!w || !r.exp) return;
      w.classList.add(r.ok ? 'correct' : 'incorrect');
      const host = w.querySelector('.body') || w;
      host.insertAdjacentHTML('beforeend', `<span class="res ${r.ok ? 'ok' : 'bad'}">${r.ok ? '✓' : '✗'} ${r.ok ? '' : `Your answer: ${esc(r.given || '—')} · `}Correct: <b>${esc(r.exp)}</b>${r.ev ? ` <span class="muted ar" style="display:block">${esc(r.ev)}</span>` : ''}</span>`);
    });
  }
  function markNav(root, marks) {
    root.querySelectorAll('.navgrid button').forEach(b => {
      const r = marks.results.find(x => x.n === +b.dataset.go);
      b.classList.remove('answered', 'flagged'); if (r) b.classList.add(r.ok ? 'correct' : 'incorrect');
    });
  }
  function summaryHtml(test, marks, skill, extra = '') {
    const band = I.band.fromRaw(skill, marks.score, marks.total);
    const rows = Object.entries(marks.byType).map(([t, v]) => {
      const pct = Math.round(100 * v.ok / v.of);
      return `<tr><td class="l">${esc(LABEL[t] || t)}</td><td>${v.ok}/${v.of}</td><td style="width:40%"><div class="bar"><i style="width:${pct}%;background:${pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--orange)' : 'var(--red)'}"></i></div></td></tr>`;
    }).join('');
    const weak = Object.entries(marks.byType).filter(([, v]) => v.of >= 3).sort((a, b) => a[1].ok / a[1].of - b[1].ok / b[1].of)[0];
    return `<div class="card"><h2>النتيجة — ${esc(test.title)}</h2>
      <div class="row"><span class="big">${marks.score} / ${marks.total}</span><span class="band-chip" title="تقدير تقريبي">Band ≈ ${I.band.label(band)}</span></div>
      <p class="disclaimer">التحويل من الدرجة الخام إلى band تقريبي: الجداول الفعلية تختلف قليلًا من نسخة اختبار لأخرى (راجع <span dir="ltr">ielts.org</span>). ${marks.total !== 40 ? 'جزء من الاختبار فقط، فالتقدير مُحجَّم إلى 40.' : ''}</p>
      <h3>الدقة حسب نوع السؤال</h3><table class="result-table" style="width:100%"><tbody>${rows}</tbody></table>
      ${weak && weak[1].ok / weak[1].of < .75 ? `<p class="warn">أضعف نوع لديك: <b>${esc(LABEL[weak[0]] || weak[0])}</b> (${weak[1].ok}/${weak[1].of}). راجع تفسير كل سؤال أسفل.</p>` : ''}${extra}</div>`;
  }

  I.exam = { number, groupHtml, bind, restore, mark, navHtml, updateNav, annotate, markNav, summaryHtml, has, LABEL };
})();

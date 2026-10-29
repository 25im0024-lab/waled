/* Sounds — pronunciation practice: tricky sounds with a mouth diagram and minimal pairs, word stress,
   -ed / -s endings, silent letters, and read-aloud sentences. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc, shuffle, pick } = E;
  const D = E.data.sounds;

  /* Side view of the mouth: lips on the left, throat on the right. kind sets tongue/lip position. */
  function mouth(kind) {
    const T = {
      th: { tip: [54, 88], c: [120, 120], hump: 0, note: ['Tongue tip between the teeth', 'طرف اللسان بين الأسنان'] },
      l: { tip: [70, 68], c: [130, 118], hump: 0, note: ['Tongue tip touches behind the top teeth', 'طرف اللسان يلمس خلف الأسنان العليا'] },
      rl: { tip: [70, 68], c: [130, 118], hump: 0, note: ['/l/: tip touches behind the top teeth. /r/: tip curls back and does not touch.', '/l/: الطرف يلمس خلف الأسنان العليا. /r/: الطرف يلتف للخلف ولا يلمس.'], ghost: [112, 82] },
      ng: { tip: [62, 112], c: [150, 130], hump: 1, note: ['Back of the tongue rises to touch the soft palate', 'مؤخّرة اللسان ترتفع وتلمس الحنك اللين'] },
      vowel: { tip: [66, 94], c: [118, 76], hump: 0, note: ['Long /iː/: tongue high and forward. Short /ɪ/: a bit lower.', 'الطويل /iː/: اللسان مرتفع ومتقدّم. القصير /ɪ/: أخفض قليلًا.'] },
      pb: { tip: [90, 120], c: [140, 125], hump: 0, lips: 'closed', note: ['Lips closed, then released', 'الشفتان مغلقتان ثم تنفتحان'] },
      vf: { tip: [90, 120], c: [140, 125], hump: 0, lips: 'teeth', note: ['Top teeth touch the bottom lip', 'الأسنان العليا تلمس الشفة السفلى'] }
    }[kind] || { tip: [90, 115], c: [140, 125], hump: 0, note: ['', ''] };
    const [tx, ty] = T.tip, [cx, cy] = T.c;
    const tongue = T.hump ? `M205 140 C190 140 180 80 150 78 C115 76 85 95 ${tx} ${ty} L${tx} ${ty + 14} C110 140 160 152 205 140 Z` : `M205 140 C190 140 ${cx + 20} ${cy - 20} ${cx} ${cy - 24} C100 ${cy - 30} 80 ${ty} ${tx} ${ty} L${tx} ${ty + 14} C110 150 160 152 205 140 Z`;
    const lipsClosed = T.lips === 'closed', lipTeeth = T.lips === 'teeth';
    return `<svg viewBox="0 0 240 170" class="widget" style="max-width:360px;width:100%;direction:ltr" role="img" aria-label="${esc(T.note[0])}">
      <path d="M40 45 C100 20 200 30 218 70 L218 150 C200 165 60 165 40 140" fill="none" stroke="var(--line)" stroke-width="3"/>
      <path d="M50 62 C100 50 170 52 214 70" fill="none" stroke="var(--muted)" stroke-width="3"/>
      <rect x="50" y="62" width="12" height="20" rx="3" fill="#fff" stroke="var(--muted)"/><rect x="50" y="${lipTeeth ? 100 : 96}" width="12" height="18" rx="3" fill="#fff" stroke="var(--muted)"/>
      <path d="${tongue}" fill="#f4a3a8" stroke="#d9626a" stroke-width="2"/>
      ${T.ghost ? `<circle cx="${T.ghost[0]}" cy="${T.ghost[1]}" r="6" fill="none" stroke="var(--primary)" stroke-dasharray="3 3"/><text x="${T.ghost[0] + 10}" y="${T.ghost[1] - 8}" font-size="11" fill="var(--primary)">/r/</text>` : ''}
      <path d="M40 ${lipsClosed ? 92 : 70} C30 ${lipsClosed ? 92 : 80} 30 ${lipsClosed ? 96 : 100} 40 ${lipsClosed ? 96 : 112}" fill="none" stroke="#d9626a" stroke-width="${lipsClosed ? 8 : 6}" stroke-linecap="round"/>
      ${lipTeeth ? '<path d="M40 112 C48 106 54 100 58 98" fill="none" stroke="#d9626a" stroke-width="6" stroke-linecap="round"/>' : ''}
      </svg>
      <p class="en muted" dir="ltr" style="text-align:center;margin:.2rem 0">${esc(T.note[0])}</p><p class="ar muted" style="text-align:center;margin:.2rem 0">${esc(T.note[1])} <small>(رسم توضيحي مبسّط)</small></p>`;
  }

  const KIND = { pb: 'pb', vf: 'vf', th: 'th', vowel: 'vowel', rl: 'rl', ng: 'ng' };

  function landing() {
    const lv = E.S.level;
    $('#view').innerHTML = `<div class="card"><h2>🔊 الأصوات والنطق · Sounds</h2>
      <p class="muted">أصوات صعبة غالبًا على الناطقين بالعربية (الأمر يختلف حسب اللهجة والشخص)، مع رسم لوضع الفم، وأزواج كلمات متقاربة للتدريب على السمع، ثم نطق الجُمل. ملاحظة: الصوت المسموع صناعي وجودته تختلف حسب جهازك، والتقييم عبر الميكروفون تقريبي.</p>
      <div class="row"><button class="big" data-sent>🎤 اقرأ بصوت عالٍ · Read aloud</button></div></div>
      <div class="tiles">${D.cards.map(c => { const x = E.S.done['snd:' + c.id]; return `<button class="tile" data-id="${c.id}"><span class="ic">${c.icon}</span><b class="en" dir="ltr">${esc(c.sym)}</b><span class="ar muted" style="text-align:center">${esc(c.ar)}</span><small>${x ? x.best + '%' : '6 أزواج'}</small></button>`; }).join('')}
        <button class="tile" data-x="stress"><span class="ic">🥁</span><b>Word stress</b><span class="ar muted">النبر في الكلمة</span></button>
        <button class="tile" data-x="ed"><span class="ic">⏪</span><b>-ed endings</b><span class="ar muted">نهايات الماضي -ed</span></button>
        <button class="tile" data-x="plural"><span class="ic">➕</span><b>-s endings</b><span class="ar muted">نهايات الجمع -s</span></button>
        <button class="tile" data-x="silent"><span class="ic">🤫</span><b>Silent letters</b><span class="ar muted">حروف صامتة</span></button></div>`;
    $$('#view [data-id]').forEach(b => b.onclick = () => card(D.cards.find(c => c.id === b.dataset.id)));
    $$('#view [data-x]').forEach(b => b.onclick = () => ({ stress, ed: () => ending('ed'), plural: () => ending('plural'), silent })[b.dataset.x]());
    $('[data-sent]').onclick = () => sentences(lv);
  }

  function card(c) {
    $('#view').innerHTML = `<div class="card"><button class="sm" data-back>‹ رجوع</button><h2>${c.icon} <span class="en" dir="ltr">${esc(c.en)}</span> <span class="ar muted" style="font-size:.95rem">${esc(c.ar)}</span></h2>
      ${mouth(KIND[c.id])}<p>${E.bi(c.note[0], c.note[1])}</p></div>
      <div class="card"><h3>أزواج للتدريب · Minimal pairs</h3><p class="muted">اضغط 🔊 لتسمع كل كلمة، ثم 🎤 لتقولها. لاحظ الفرق بين الكلمتين.</p>
      <div class="ex-list">${c.words.map((w, i) => `<div class="ex-item" style="flex-wrap:wrap"><span class="en" dir="ltr" style="flex:1"><b>${esc(w[0])}</b> ${E.sayBtn(w[0])} <button class="say" data-sh="${esc(w[0])}" data-i="${i}a">🎤</button> &nbsp;vs&nbsp; <b>${esc(w[1])}</b> ${E.sayBtn(w[1])} <button class="say" data-sh="${esc(w[1])}" data-i="${i}b">🎤</button></span><div data-res="${i}" style="flex-basis:100%"></div></div>`).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="primary big" data-q>🎧 أي كلمة سمعت؟ · Which word?</button></div></div>`;
    $('[data-back]').onclick = landing;
    $$('#view [data-sh]').forEach(b => b.onclick = () => E.dlg.shadow(b.dataset.sh, $(`[data-res="${parseInt(b.dataset.i)}"]`)));
    $('[data-q]').onclick = () => {
      const items = shuffle(c.words).flatMap(w => { const a = pick(w), o = w.find(x => x !== a) || w[1]; return [{ t: 'listen', say: a, opts: [w[0], w[1]], a, keep: false, why: { en: `${w[0]} / ${w[1]}`, ar: c.ar }, review: `${w[0]} / ${w[1]}`, shown: a }]; });
      E.quiz.run({ root: $('#view'), items, shuffle: false, title: c.en, id: 'snd:' + c.id, onExit: () => card(c) });
    };
  }

  function stress() {
    const items = shuffle(D.stress).slice(0, 10).map(([w, syl, k]) => { const parts = syl.split('-'); return { t: 'mc', q: `Which syllable is stressed in “${w}”?`, ar: 'أي مقطع منبور؟', opts: parts.map((p, i) => p + (parts.length > 1 ? ` (${i + 1})` : '')), a: parts[k] + ` (${k + 1})`, keep: true, say: w, why: { en: parts.map((p, i) => i === k ? p.toUpperCase() : p).join('-'), ar: 'المقطع المنبور يكون أعلى وأطول وأوضح.' }, review: w, shown: parts.map((p, i) => i === k ? p.toUpperCase() : p).join('-') }; });
    $('#view').innerHTML = `<div class="card"><button class="sm" data-back>‹ رجوع</button><h2>🥁 Word stress · النبر</h2>
      <p>${E.bi('In English every long word has ONE strong syllable. Say it louder, longer and clearer. Wrong stress is often the reason people do not understand a word.', 'كل كلمة طويلة في الإنجليزية فيها مقطع واحد قوي. انطقه أعلى وأطول وأوضح. خطأ النبر من أكثر أسباب عدم فهم الكلمة.')}</p>
      <div class="ex-list">${D.stress.map(([w, syl, k]) => `<div class="ex-item"><span class="en" dir="ltr"><b>${esc(w)}</b> &nbsp;<span class="muted">${syl.split('-').map((p, i) => i === k ? `<b style="color:var(--primary);text-decoration:underline">${esc(p.toUpperCase())}</b>` : esc(p)).join('·')}</span></span>${E.sayBtn(w)}</div>`).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="primary big" data-q>🎯 تمرين · Quiz</button></div></div>`;
    $('[data-back]').onclick = landing;
    $('[data-q]').onclick = () => E.quiz.run({ root: $('#view'), items, shuffle: false, title: 'Word stress', id: 'snd:stress', onExit: stress });
  }

  function ending(kind) {
    const isEd = kind === 'ed', data = isEd ? D.ed : D.plural, sounds = isEd ? ['t', 'd', 'ɪd'] : ['s', 'z', 'ɪz'];
    const rule = isEd ? [['After voiceless sounds (p, k, f, s, sh, ch): /t/ — worked, watched.', 'بعد الأصوات غير المجهورة: /t/'], ['After voiced sounds and vowels: /d/ — played, lived.', 'بعد الأصوات المجهورة والصوائت: /d/'], ['After t or d: /ɪd/ (an extra syllable) — wanted, needed.', 'بعد t أو d: /ɪd/ (مقطع إضافي)']]
      : [['After voiceless sounds (p, t, k, f): /s/ — books, cats.', 'بعد الأصوات غير المجهورة: /s/'], ['After voiced sounds and vowels: /z/ — days, dogs.', 'بعد الأصوات المجهورة والصوائت: /z/'], ['After s, z, sh, ch, x: /ɪz/ (extra syllable) — buses, boxes.', 'بعد s وz وsh وch وx: /ɪz/ (مقطع إضافي)']];
    const items = shuffle(data).slice(0, 10).map(([w, s]) => ({ t: 'mc', q: `How do we say the ending of “${w}”?`, ar: 'كيف تُنطق النهاية؟', opts: sounds.map(x => '/' + x + '/'), keep: true, a: '/' + s + '/', say: w, why: { en: `${w} → /${s}/`, ar: '' }, review: w, shown: '/' + s + '/' }));
    $('#view').innerHTML = `<div class="card"><button class="sm" data-back>‹ رجوع</button><h2>${isEd ? '⏪ -ed endings' : '➕ -s endings'}</h2>
      ${rule.map(r => `<p>${E.bi(r[0], r[1])}</p>`).join('')}
      <div class="ex-list">${data.map(([w, s]) => `<div class="ex-item"><span class="en" dir="ltr"><b>${esc(w)}</b> <span class="muted">/${s}/</span></span>${E.sayBtn(w)}</div>`).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="primary big" data-q>🎯 تمرين · Quiz</button></div></div>`;
    $('[data-back]').onclick = landing;
    $('[data-q]').onclick = () => E.quiz.run({ root: $('#view'), items, shuffle: false, title: kind, id: 'snd:' + kind, onExit: () => ending(kind) });
  }

  function silent() {
    const items = shuffle(D.silent).map(([w, l, ar]) => ({ t: 'mc', q: `Which letter is silent in “${w}”?`, ar: `${ar} — أي حرف لا يُنطق؟`, opts: shuffle([...new Set([l, ...shuffle([...w.toLowerCase()].filter(x => x !== l)).slice(0, 3)])]).slice(0, 4), keep: false, a: l, say: w, why: { en: `${w}: silent “${l}”`, ar: '' }, review: w, shown: l }));
    items.forEach(it => { if (!it.opts.includes(it.a)) it.opts[0] = it.a; });
    $('#view').innerHTML = `<div class="card"><button class="sm" data-back>‹ رجوع</button><h2>🤫 Silent letters · حروف صامتة</h2><p class="muted">بعض الحروف تُكتب ولا تُنطق. استمع وتذكّر.</p>
      <div class="ex-list">${D.silent.map(([w, l, ar]) => `<div class="ex-item"><span class="en" dir="ltr"><b>${[...w].map((ch, i) => ch.toLowerCase() === l && w.toLowerCase().indexOf(l) === i ? `<s style="color:var(--bad)">${esc(ch)}</s>` : esc(ch)).join('')}</b></span><span class="ar">${esc(ar)}</span>${E.sayBtn(w)}</div>`).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="primary big" data-q>🎯 تمرين · Quiz</button></div></div>`;
    $('[data-back]').onclick = landing;
    $('[data-q]').onclick = () => E.quiz.run({ root: $('#view'), items, shuffle: false, title: 'Silent letters', id: 'snd:silent', onExit: silent });
  }

  function sentences(lv) {
    const list = D.sentences[lv] || D.sentences.A1;
    $('#view').innerHTML = `<div class="card"><button class="sm" data-back>‹ رجوع</button><h2>🎤 Read aloud · اقرأ بصوت عالٍ</h2>
      <p class="muted">استمع للجملة (🔊) ثم قلها (🎤). المتصفح يكتب ما فهمه ونقارنه بالنص — مؤشّر تقريبي وليس تقييم نطق رسميًا. المستوى: ${lv}.</p>
      <div class="levels">${['A1', 'A2', 'B1'].map(l => `<button data-l="${l}" class="${l} ${l === lv ? 'on' : ''}"><b>${l}</b></button>`).join('')}</div>
      <div class="ex-list">${list.map((s, i) => `<div class="ex-item" style="flex-wrap:wrap"><span class="en" dir="ltr" style="flex:1;min-width:220px">${esc(s)}</span><span>${E.sayBtn(s)} <button class="say" data-sh="${i}" aria-label="Say it">🎤</button></span><div data-res="${i}" style="flex-basis:100%"></div></div>`).join('')}</div></div>`;
    $('[data-back]').onclick = landing;
    $$('#view [data-l]').forEach(b => b.onclick = () => sentences(b.dataset.l));
    $$('#view [data-sh]').forEach(b => b.onclick = () => E.dlg.shadow(list[+b.dataset.sh], $(`[data-res="${b.dataset.sh}"]`)));
  }

  E.mod.sounds = { mouth };
  E.register('sounds', 'النطق', '🔊', landing, 90);
})();

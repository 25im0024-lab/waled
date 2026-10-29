/* Picture scenes — tap objects to learn them, find-it game, listen-and-tap game. */
(function () {
  'use strict';
  const E = window.EL, { $, $$, esc, shuffle } = E;
  const scenes = E.data.scenes;

  function landing() {
    $('#view').innerHTML = `<div class="card"><h2>🖼️ مشاهد مصوّرة · Picture scenes</h2><p class="muted">اضغط على أي شيء في الصورة لتتعلّم اسمه بالإنجليزية والعربية مع الصوت. ثم العب: «ابحث عنه» أو «استمع واضغط».</p></div>
      <div class="tiles">${scenes.map(s => { const d = E.S.done['scene:' + s.id]; return `<button class="tile" data-id="${s.id}"><span class="ic">${s.icon}</span><b>${esc(s.en)}</b><span class="ar muted">${esc(s.ar)}</span><span class="tag lv ${s.level}">${s.level}</span><small>${s.objects.length} كلمة${d ? ' · ✅' : ''}</small></button>`; }).join('')}</div>`;
    $$('#view [data-id]').forEach(b => b.onclick = () => open(scenes.find(s => s.id === b.dataset.id)));
  }

  function sceneSvg(s, labels) {
    const objs = s.objects.map(o => `<g class="obj" data-id="${esc(o.id)}" tabindex="0" role="button" aria-label="${esc(o.en)}">${R(...o.box, 'rgba(0,0,0,0)')}${o.g}</g>`).join('');
    const lab = labels ? s.objects.map(o => { const cx = o.lab ? o.lab[0] : o.box[0] + o.box[2] / 2, cy = o.lab ? o.lab[1] : o.box[1] + o.box[3] / 2; return `<g pointer-events="none"><text x="${cx}" y="${cy}" text-anchor="middle" font-size="17" font-weight="800" fill="#111" stroke="#fff" stroke-width="5" paint-order="stroke" font-family="system-ui,Arial">${esc(o.en)}</text><text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="14" font-weight="700" fill="#1d4ed8" stroke="#fff" stroke-width="4" paint-order="stroke" font-family="system-ui,Tahoma">${esc(o.ar)}</text></g>`; }).join('') : '';
    return `<svg viewBox="0 0 800 500" style="direction:ltr" role="img" aria-label="${esc(s.en)}">${s.bg}${objs}${lab}</svg>`;
  }
  const R = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;

  function open(s) {
    let mode = 'explore', labels = false; const seen = new Set();
    const draw = () => {
      $('#view').innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><button class="sm" data-back>‹ المشاهد · Scenes</button><h2 style="margin:0">${s.icon} ${esc(s.en)} <span class="ar muted" style="font-size:.9rem">${esc(s.ar)}</span></h2></div>
        <div class="seg" style="margin:8px 0"><button data-m="explore" class="${mode === 'explore' ? 'on' : ''}">👆 استكشف · Explore</button><button data-m="find" class="${mode === 'find' ? 'on' : ''}">🔎 ابحث عنه · Find it</button><button data-m="listen" class="${mode === 'listen' ? 'on' : ''}">🎧 استمع واضغط · Listen &amp; tap</button>
        <label class="muted" style="align-self:center"><input type="checkbox" data-lab ${labels ? 'checked' : ''}> أسماء على الصورة · Show names</label></div>
        <div class="scene">${sceneSvg(s, labels)}</div><div class="scenecard" data-card><span class="muted">${mode === 'explore' ? 'اضغط على أي شيء في الصورة · Tap anything in the picture' : ''}</span></div></div>`;
      $('[data-back]').onclick = landing;
      $$('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); if (mode !== 'explore') game(); });
      $('[data-lab]').onchange = e => { labels = e.target.checked; const keep = mode; draw(); if (keep !== 'explore') game(); };
      $$('.obj').forEach(g => { const act = () => click(g.dataset.id); g.onclick = act; g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } }; });
    };
    let target = null, round = 0, score = 0, rounds = Math.min(10, s.objects.length), order = [];
    const game = () => { round = 0; score = 0; order = shuffle(s.objects).slice(0, rounds); next(); };
    const next = () => {
      if (round >= rounds) {
        E.xp(score * 2 + (score >= rounds * .7 ? 5 : 0)); E.markDone('scene:' + s.id + ':' + mode, Math.round(100 * score / rounds));
        $('[data-card]').innerHTML = `<div style="flex:1"><b>🎉 انتهت اللعبة · Done: ${score} / ${rounds}</b></div><button class="primary" data-again>🔁 أعد · Again</button>`;
        return $('[data-again]').onclick = game;
      }
      target = order[round];
      const text = mode === 'find' ? `<div class="w">Find the <b>${esc(target.en)}</b></div><div class="ar muted">ابحث عن: ${esc(target.ar)}</div>` : `<div class="w">🎧 ?</div><div class="muted">استمع ثم اضغط على الشيء الصحيح · Listen, then tap it</div>`;
      $('[data-card]').innerHTML = `${E.sayBtn('Find the ' + target.en, 'big')}<div style="flex:1">${text}</div><span class="chip">${round + 1}/${rounds} · ✅ ${score}</span>`;
      E.say('Find the ' + target.en);
    };
    const click = id => {
      const o = s.objects.find(x => x.id === id), g = $(`.obj[data-id="${CSS.escape(id)}"]`);
      if (mode === 'explore') {
        $$('.obj.sel').forEach(x => x.classList.remove('sel')); g.classList.add('sel'); seen.add(id);
        $('[data-card]').innerHTML = `<div class="w" style="font-size:2.2rem">${esc(o.en)}</div><div style="flex:1"><div class="ar" style="font-size:1.4rem;color:var(--primary);font-weight:800">${esc(o.ar)}</div><div class="en" dir="ltr">${esc(o.ex)}</div><div class="ar muted">${esc(o.exAr)}</div></div>${E.sayBtn(o.en + '. ' + o.ex, 'big')}`;
        E.say(o.en + '. ' + o.ex);
        if (seen.size === s.objects.length && !E.S.done['scene:' + s.id]) { E.markDone('scene:' + s.id, 100); E.xp(10); E.toast('🎉 تعلّمتَ كل كلمات المشهد! +10 XP'); }
        return;
      }
      if (!target) return;
      if (id === target.id) { E.beep(true); g.classList.add('ok'); score++; round++; setTimeout(() => { g.classList.remove('ok'); next(); }, 700); }
      else { E.beep(false); g.classList.add('no'); setTimeout(() => g.classList.remove('no'), 400); E.toast(`${o.en} · ${o.ar}`); }
    };
    draw();
  }
  E.mod.scenes = { open };
  E.register('scenes', 'مشاهد', '🖼️', landing, 30);
})();

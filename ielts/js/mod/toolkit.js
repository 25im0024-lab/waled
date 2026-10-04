/* Toolkit — reference: exam format, band descriptors summary, phrase banks, essay structures, Arabic-speaker pitfalls. */
(function () {
  'use strict';
  const I = window.IELTS, { $, esc } = I;
  const en = s => `<span class="en">${s}</span>`;
  const list = a => `<ul class="msg">${a.map(x => `<li>${x}</li>`).join('')}</ul>`;

  const SECTIONS = [
    ['صيغة الاختبار (Academic)', `<div class="tblwrap"><table><tr><th>المهارة</th><th>المدة</th><th>الأسئلة / المهام</th></tr>
      <tr><td>Listening</td><td>≈ 30 دقيقة + وقت نقل/مراجعة</td><td>4 أقسام، 40 سؤالًا، يُسمع التسجيل مرة واحدة</td></tr>
      <tr><td>Reading</td><td>60 دقيقة</td><td>3 نصوص، 40 سؤالًا، لا وقت إضافي</td></tr>
      <tr><td>Writing</td><td>60 دقيقة</td><td>Task 1 (≥150 كلمة، ≈20 د) + Task 2 (≥250 كلمة، ≈40 د). Task 2 بوزن مضاعف</td></tr>
      <tr><td>Speaking</td><td>11–14 دقيقة</td><td>Part 1 (≈4–5 د)، Part 2 (دقيقة تحضير + 1–2 د)، Part 3 (≈4–5 د)</td></tr></table></div>
      <p class="muted">Overall = متوسط المهارات الأربع مقرّبًا لأقرب نصف band. الأرقام أعلاه من الصيغة المعلنة؛ تحقق من <span dir="ltr">ielts.org</span> لأي تغيير حديث.</p>`],
    ['معايير Writing الأربعة (ملخّص للـ band descriptors)', list([
      '<b>Task Achievement / Response:</b> هل أجبتَ عن كل أجزاء المهمة؟ Task 2: موقف واضح مطوَّر. Task 1: <b>overview</b> واضح + تفاصيل مختارة صحيحة.',
      '<b>Coherence & Cohesion:</b> تسلسل منطقي، فقرة لكل فكرة مركزية، روابط متنوعة بلا إفراط آلي.',
      '<b>Lexical Resource:</b> مدى المفردات، الدقة، collocations، قلة أخطاء التهجئة وتكوين الكلمات.',
      '<b>Grammatical Range & Accuracy:</b> تنوّع التراكيب المعقدة مع جمل خالية من الأخطاء بنسبة عالية.',
      'الأوزان متساوية للمعايير الأربعة. لا تستعمل مفردات نادرة بشكل مصطنع: الدقة أهم.'])],
    ['Task 1 — عبارات جاهزة', `<h4>الاتجاهات</h4>${list([en('rose / increased sharply (from 20% to 45%) · climbed steadily · grew gradually'), en('fell / declined slightly · dropped dramatically · plummeted'), en('fluctuated around … · remained stable at … · levelled off at …'), en('peaked at … in 2015, before falling to … · reached a low of …')])}
      <h4>المقارنة</h4>${list([en('A was twice as high as B · A accounted for the largest share (45%), followed by B (30%)'), en('In contrast / By contrast, … · Whereas A …, B … · A overtook B in 2010')])}
      <h4>Overview</h4>${list([en('Overall, the most striking feature is that … · It is clear that … while … · In general, … increased whereas … declined')])}
      <h4>Process</h4>${list([en('The process begins with … · Next / Subsequently / Following this, … · Once …, … · Finally, … · The final stage involves …'), en('Use present simple + passive: Bottles are collected, sorted and crushed.')])}
      <h4>Maps</h4>${list([en('was replaced by / was converted into / was demolished to make way for / was extended'), en('to the north-east of … · opposite … · adjacent to … · along the main road'), en('Use past tense for the earlier map, and present perfect/past for the later one according to dates.')])}`],
    ['Task 2 — هياكل المقال', `<h4>Opinion (agree/disagree)</h4>${list([en('Intro: paraphrase + clear position (I strongly agree / I partly agree that …).'), en('Body 1: strongest reason + explanation + example. Body 2: second reason (or a concession and rebuttal).'), en('Conclusion: restate position, no new ideas.')])}
      <h4>Discuss both views + opinion</h4>${list([en('Body 1: view A with reasons. Body 2: view B with reasons. State your opinion in the intro and conclusion (and briefly in a body if natural).')])}
      <h4>Problem–solution / two-part question</h4>${list([en('Body 1: problems or causes (2). Body 2: solutions or measures (2) linked clearly to the problems.')])}
      <h4>Advantages / disadvantages (outweigh?)</h4>${list([en('Decide whether advantages outweigh disadvantages in the intro; Body 1: advantages; Body 2: disadvantages; conclusion repeats your judgement.')])}
      <h4>جمل مفيدة</h4>${list([en('It is often argued that … ; however, this view overlooks …'), en('One compelling reason is that … For instance, …'), en('This is not to say that …, but rather that …'), en('On balance, the advantages of … outweigh the drawbacks.')])}`],
    ['Speaking — إطار الإجابة', `${list([en('Part 1: Answer + reason + short example (2–3 sentences). Avoid one-word answers.'), en('Part 2: Introduce → follow the cue-card points in order → explain why it matters → short closing. Use a past/present time frame consistently.'), en('Part 3: Opinion + reason + example/comparison. Useful starters: It depends on … · The main reason is … · Compared with the past, …'), 'قلّل fillers مثل um/like؛ بدّلها بوقفة قصيرة أو بعبارة ربط ("Well, …", "Let me think …").', 'تدرّب على استبدال الكلمات المكرّرة (very, good, nice) بمفردات أدق.'])}`],
    ['أخطاء شائعة عند الناطقين بالعربية', `<div class="tblwrap"><table><tr><th>خطأ شائع</th><th>الصواب</th><th>ملاحظة</th></tr>
      <tr><td class="en">discuss about</td><td class="en">discuss</td><td>فعل متعدٍّ مباشرة</td></tr>
      <tr><td class="en">informations / advices</td><td class="en">information / advice</td><td>غير معدودة</td></tr>
      <tr><td class="en">in the other hand</td><td class="en">on the other hand</td><td>collocation ثابت</td></tr>
      <tr><td class="en">more better</td><td class="en">much better / better</td><td>لا تجمع more مع -er</td></tr>
      <tr><td class="en">I am agree</td><td class="en">I agree</td><td>agree فعل وليس صفة</td></tr>
      <tr><td class="en">the people say / the life is hard</td><td class="en">people say / life is hard</td><td>لا article في التعميم</td></tr>
      <tr><td class="en">Technology is useful, it saves time.</td><td class="en">…useful because it saves time.</td><td>comma splice</td></tr>
      <tr><td class="en">Moreover, … Furthermore, … (كل جملة)</td><td class="en">وزّع الروابط بدقة</td><td>إفراط آلي في linkers</td></tr></table></div>`],
    ['يوم الاختبار', list(['راجع على موقع المركز المسجَّل لديك قائمة المستندات المطلوبة وقواعد الأجهزة والقاعة، فهي تختلف بين المراكز.', 'Reading: لا وقت لنقل الإجابات؛ اكتب الإجابات مباشرة وبإملاء صحيح. لا تترك سؤالًا فارغًا.', 'Listening: اقرأ الأسئلة في الوقت المتاح، توقّع نوع الإجابة (رقم، اسم، صفة)، ولا تتوقف عند سؤال فاتك.', 'Writing: خصّص 5 دقائق للتخطيط في Task 2 و3 في Task 1، وآخر 3 دقائق للمراجعة.', 'Speaking: تحدّث بصوت واضح، واطلب إعادة السؤال إن لزم (Could you repeat that, please?).'])]
  ];

  function render() {
    $('#view').innerHTML = `<div class="card"><h2>Toolkit — مرجع سريع</h2><p class="muted">مرجع مختصر مبني على الصيغة المعلنة وعلى الممارسات الشائعة في التحضير. ليس بديلًا عن المواد الرسمية.</p></div>` +
      SECTIONS.map(([t, body], i) => `<details class="card" ${i === 0 ? 'open' : ''}><summary><b>${esc(t)}</b></summary><div style="margin-top:8px">${body}</div></details>`).join('');
  }
  I.register('toolkit', 'Toolkit', render);
})();

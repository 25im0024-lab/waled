/* Placement test: 8 questions per level (A1, A2, B1), mixed grammar / vocabulary / reading. [question, options, answer, level, Arabic hint] */
(function () {
  'use strict';
  const q = (level, text, opts, a, ar) => ({ level, q: text, opts, a, ar: ar || '' });
  const items = [
    q('A1', 'My name ____ Sara.', ['am', 'is', 'are', 'be'], 'is', 'اسمي سارة'),
    q('A1', 'They ____ students.', ['is', 'am', 'are', 'be'], 'are', 'هم طلاب'),
    q('A1', 'I have two ____.', ['book', 'books', 'bookes', 'a books'], 'books', 'عندي كتابان'),
    q('A1', 'This is my brother. ____ name is Ali.', ['His', 'Her', 'He', 'My is'], 'His', 'اسمه علي'),
    q('A1', 'She ____ coffee every morning.', ['drink', 'drinks', 'drinking', 'drinkes'], 'drinks', 'تشرب القهوة'),
    q('A1', 'What time is it? — It is ____.', ['seven o\'clock', 'in seven', 'at seven hour', 'seven hours'], 'seven o\'clock', 'الساعة السابعة'),
    q('A1', 'The book is ____ the table.', ['in', 'on', 'at', 'to'], 'on', 'الكتاب على الطاولة'),
    q('A1', 'Which word is a fruit?', ['chair', 'apple', 'blue', 'run'], 'apple', 'أي كلمة هي فاكهة؟'),
    q('A2', 'Yesterday I ____ to the market.', ['go', 'goed', 'went', 'gone'], 'went', 'أمس ذهبتُ إلى السوق'),
    q('A2', 'I am ____ a book now.', ['read', 'reading', 'reads', 'to read'], 'reading', 'أقرأ كتابًا الآن'),
    q('A2', 'There ____ any milk in the fridge.', ['isn\'t', 'aren\'t', 'don\'t', 'not'], 'isn\'t', 'لا يوجد حليب'),
    q('A2', 'This phone is ____ than that one.', ['more cheap', 'cheaper', 'cheapest', 'more cheaper'], 'cheaper', 'أرخص'),
    q('A2', 'We ____ visit my grandmother tomorrow.', ['are going to', 'going to', 'will to', 'go to'], 'are going to', 'سنزور جدّتي غدًا'),
    q('A2', 'You ____ park here. It is forbidden.', ['must', 'mustn\'t', 'should', 'can'], 'mustn\'t', 'ممنوع الوقوف'),
    q('A2', 'How ____ water do you drink every day?', ['many', 'much', 'few', 'long'], 'much', 'كم من الماء'),
    q('A2', '“Could you open the window, please?” is a ____.', ['request', 'question about time', 'order', 'greeting'], 'request', 'طلب'),
    q('B1', 'I ____ here since 2020.', ['live', 'lived', 'have lived', 'am living'], 'have lived', 'أسكن هنا منذ ٢٠٢٠'),
    q('B1', 'If it rains tomorrow, we ____ at home.', ['stay', 'will stay', 'would stay', 'stayed'], 'will stay', 'إن أمطرت سنبقى'),
    q('B1', 'She asked me where I ____.', ['live', 'lived', 'am living', 'do live'], 'lived', 'سألتني أين أسكن'),
    q('B1', 'The report ____ by the manager yesterday.', ['wrote', 'was written', 'is written', 'has written'], 'was written', 'كُتب التقرير'),
    q('B1', 'He ____ when I called him.', ['slept', 'was sleeping', 'sleeps', 'has slept'], 'was sleeping', 'كان نائمًا'),
    q('B1', 'The meeting was ____ because the manager was ill.', ['called off', 'called up', 'called in', 'called at'], 'called off', 'أُلغي الاجتماع'),
    q('B1', 'I would like to ____ you to my colleague.', ['present', 'introduce', 'show', 'tell'], 'introduce', 'أعرّفك بزميلي'),
    q('B1', 'Although it was late, ____ continued working.', ['we', 'but we', 'and we', 'so we'], 'we', 'رغم أنه كان متأخرًا')
  ];
  window.EL.data.placement = { items };
})();

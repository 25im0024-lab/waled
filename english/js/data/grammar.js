/* Grammar lessons — level A1 (A2 and B1 are in grammar2.js / grammar3.js).
   Lesson: {id, level, icon, en, ar, widget?, points:[{t:[en,ar], ex:[[en,ar]...], table?, warn?:[en,ar]}], ex:[exercise...]}
   Exercises use the engine in quiz.js. */
(function () {
  'use strict';
  const mc = (q, opts, a, ar, why) => ({ t: 'mc', q, opts, a, ar, why: why ? { en: why[0], ar: why[1] } : undefined, keep: false });
  const fill = (q, a, ar, hint, why) => ({ t: 'fill', q, a: Array.isArray(a) ? a : [a], ar, hint, why: why ? { en: why[0], ar: why[1] } : undefined });
  const ord = (a, ar) => ({ t: 'order', words: a.split(' '), a, ar });
  const tf = (q, a, ar, why) => ({ t: 'tf', q, a, ar, why: why ? { en: why[0], ar: why[1] } : undefined });
  const mkTable = (head, rows) => ({ head, rows });
  const L = (id, level, icon, en, ar, widget, points, ex) => ({ id, level, icon, en, ar, widget, points, ex });
  window.EL.data.grammar = { lessons: [], mc, fill, ord, tf, mkTable, L };
  const G = window.EL.data.grammar.lessons;

  G.push(
    L('to-be', 'A1', '🧑', 'Verb to be: am / is / are', 'فعل الكينونة: am / is / are', null, [
      { t: ['We use am / is / are to say who or what someone is, and how they feel. The verb is always needed in English.', 'نستخدم am / is / are لنقول من هو الشخص أو ما هو الشيء وكيف يشعر. الفعل ضروري دائمًا في الجملة الإنجليزية.'],
        table: mkTable(['Pronoun', 'to be', 'Short form'], [['I', 'am', "I'm"], ['you', 'are', "you're"], ['he / she / it', 'is', "he's / she's / it's"], ['we / you / they', 'are', "we're / you're / they're"]]),
        ex: [['I am a student.', 'أنا طالب.'], ['She is a doctor.', 'هي طبيبة.'], ['They are at home.', 'هم في البيت.']],
        warn: ["✗ He teacher.   ✓ He is a teacher.", 'في العربية نقول «هو معلّم» بلا فعل، أمّا في الإنجليزية فلا بدّ من is.'] },
      { t: ['Negative: add not (is not = isn\'t, are not = aren\'t, I\'m not). Question: put am / is / are before the subject.', 'النفي بإضافة not. والسؤال بوضع الفعل قبل الفاعل.'],
        ex: [['He is not tired.', 'هو ليس متعبًا.'], ['Are you ready?', 'هل أنت جاهز؟'], ['Is she at school?', 'هل هي في المدرسة؟'], ["Yes, I am. / No, I'm not.", 'نعم. / لا.']] },
      { t: ['We also use to be for age and feelings.', 'ونستخدم to be للعمر والمشاعر أيضًا.'], ex: [['I am twenty years old.', 'عمري عشرون سنة.'], ['We are hungry.', 'نحن جائعون.']],
        warn: ['✗ I have 20 years.   ✓ I am 20 years old.', 'للعمر لا نقول have؛ نقول am / is / are.'] }
    ], [
      mc('I ___ a student.', ['am', 'is', 'are'], 'am', 'أنا طالب.'), mc('She ___ from Egypt.', ['am', 'is', 'are'], 'is', 'هي من مصر.'),
      mc('They ___ happy.', ['am', 'is', 'are'], 'are', 'هم سعداء.'), mc('How old ___ you?', ['is', 'am', 'are'], 'are', 'كم عمرك؟'),
      fill('My father ____ a driver.', 'is', 'أبي سائق.'), fill('We ____ at home.', 'are', 'نحن في البيت.'),
      ord('He is not at home.', 'هو ليس في البيت.'), ord('Are you a teacher?', 'هل أنت معلّم؟'),
      tf('"He teacher." is correct English.', false, '', ['We need is: He is a teacher.', 'لا بدّ من is: He is a teacher.'])
    ]),

    L('pronouns', 'A1', '👥', 'Pronouns and my / your', 'الضمائر وصفات الملكية', null, [
      { t: ['Subject pronouns replace names: I, you, he, she, it, we, they. Use he for a man, she for a woman, it for things and animals.', 'ضمائر الفاعل تحلّ محلّ الأسماء. he للمذكّر، she للمؤنّث، it للأشياء والحيوانات.'],
        table: mkTable(['Pronoun', 'Possessive', 'Example'], [['I', 'my', 'my book'], ['you', 'your', 'your bag'], ['he', 'his', 'his car'], ['she', 'her', 'her phone'], ['it', 'its', 'its tail'], ['we', 'our', 'our house'], ['they', 'their', 'their school']]),
        ex: [['Ali is my brother. He is a nurse.', 'علي أخي. هو ممرّض.'], ['This is Sara. Her bag is red.', 'هذه سارة. حقيبتها حمراء.']] },
      { t: ['The possessive word comes before the noun and does not change for singular or plural.', 'كلمة الملكية تأتي قبل الاسم ولا تتغيّر مع المفرد والجمع.'], ex: [['My book is here. My books are here.', 'كتابي هنا. كتبي هنا.'], ['Their children are at school.', 'أولادهم في المدرسة.']],
        warn: ['✗ She is my sister, her name is Huda.   ✓ …Her name is Huda. (his/her depends on the owner, not the thing)', 'her / his تتبع المالك (هي/هو) وليس الشيء المملوك.'] }
    ], [
      mc('Sara is my sister. ___ is a doctor.', ['She', 'He', 'It'], 'She'), mc('Ahmed and I are friends. ___ are at school.', ['We', 'They', 'You'], 'We'),
      mc('This is Tom. ___ bag is blue.', ['His', 'Her', 'My'], 'His'), mc('Maria has a cat. ___ name is Lulu.', ['Its', 'Her', 'Their'], 'Her'),
      fill('We love ____ teacher. (we)', 'our', 'نحبّ معلّمنا.'), fill('The dog is hungry. ____ food is here. (it)', 'its', 'الكلب جائع. طعامه هنا.'),
      mc('The children are happy. ___ toys are new.', ['Their', 'Her', 'Our'], 'Their'), ord('This is my father.', 'هذا أبي.')
    ]),

    L('articles', 'A1', '🅰️', 'a / an / the', 'أداتا التنكير والتعريف', null, [
      { t: ['Use a or an with one singular thing. Use an before a vowel SOUND (a, e, i, o, u): an apple, an hour. Use a before other sounds: a book, a university.', 'نستخدم a أو an قبل اسم مفرد غير محدّد. an قبل صوت متحرّك (an apple)، وa قبل غيره (a book). الاعتبار للصوت لا للحرف: an hour، a university.'],
        ex: [['I have a dog.', 'عندي كلب.'], ['She eats an apple.', 'هي تأكل تفاحة.'], ['He is an engineer.', 'هو مهندس.']] },
      { t: ['Use the when both people know which one: the sun, the door, the teacher. Use no article for general plurals and uncountable nouns.', 'نستخدم the حين يكون المقصود معروفًا للطرفين. ولا نستخدم أداة مع الجمع العام والأسماء غير المعدودة.'],
        ex: [['Close the door, please.', 'أغلق الباب من فضلك.'], ['I like cats.', 'أحب القطط.'], ['Water is important.', 'الماء مهم.']],
        warn: ['✗ The life is beautiful.   ✓ Life is beautiful.', 'في العربية «الحياة جميلة» بأل، لكن في الإنجليزية لا نستخدم the مع التعميم.'] }
    ], [
      mc('I have ___ egg for breakfast.', ['a', 'an', 'the'], 'an'), mc('She is ___ teacher.', ['a', 'an', 'the'], 'a'), mc('He waits for ___ hour.', ['a', 'an', 'the'], 'an', 'حرف h صامت في hour فالصوت متحرّك.', ['h is silent in hour: an hour.', 'الحرف h صامت في hour: an hour.']),
      mc('Look at ___ sun!', ['a', 'an', 'the'], 'the', 'انظر إلى الشمس!'), mc('I like ___ music.', ['a', 'the', '—'], '—', 'أحب الموسيقى.', ['No article for general ideas.', 'لا أداة مع التعميم.']),
      fill('She has ____ umbrella. (a / an)', 'an', 'معها مظلة.'), fill('He is ____ doctor. (a / an)', 'a', 'هو طبيب.'), tf('We say "an university".', false, '', ['University starts with a "yu" sound: a university.', 'university تبدأ بصوت «يو»: a university.'])
    ]),

    L('plurals', 'A1', '🍎', 'Plural nouns', 'صيغة الجمع', null, [
      { t: ['Most nouns: add -s. After s, x, ch, sh: add -es. After consonant + y: change y to -ies.', 'القاعدة: نضيف s. بعد s,x,ch,sh نضيف es. وبعد حرف ساكن + y نحوّل y إلى ies.'],
        table: mkTable(['Singular', 'Plural', 'Rule'], [['book', 'books', '+s'], ['box', 'boxes', '+es'], ['watch', 'watches', '+es'], ['baby', 'babies', 'y → ies'], ['boy', 'boys', 'vowel + y → +s']]),
        ex: [['two books', 'كتابان'], ['three babies', 'ثلاثة أطفال رضّع']] },
      { t: ['Some plurals are irregular. Learn them as words!', 'بعض صيغ الجمع شاذّة؛ احفظها.'],
        table: mkTable(['Singular', 'Plural'], [['man', 'men'], ['woman', 'women'], ['child', 'children'], ['person', 'people'], ['foot', 'feet'], ['tooth', 'teeth']]),
        ex: [['Two children are in the park.', 'طفلان في الحديقة.'], ['Many people live here.', 'يعيش هنا أناس كثيرون.']],
        warn: ['✗ two book / many peoples   ✓ two books / many people', 'بعد الأعداد نستخدم الجمع. وpeople هي جمع person، فلا نضيف إليها s.'] }
    ], [
      mc('one box → two ___', ['boxs', 'boxes', 'box'], 'boxes'), mc('one baby → three ___', ['babys', 'babies', 'babyes'], 'babies'), mc('one man → two ___', ['mans', 'men', 'mens'], 'men'),
      mc('one child → four ___', ['childs', 'children', 'childrens'], 'children'), fill('one watch → two ____', 'watches', 'ساعتان.'), fill('one tooth → ten ____', 'teeth', 'عشرة أسنان.'),
      mc('There are five ___ in the room.', ['person', 'people', 'peoples'], 'people'), tf('"two book" is correct.', false, '', ['After a number we use the plural: two books.', 'بعد العدد نستخدم الجمع.'])
    ]),

    L('this-that', 'A1', '👉', 'this / that / these / those', 'أسماء الإشارة', null, [
      { t: ['Use this / these for things near you. Use that / those for things far from you. this and that are singular; these and those are plural.', 'this / these للقريب، وthat / those للبعيد. this و that للمفرد؛ these و those للجمع.'],
        table: mkTable(['', 'Near', 'Far'], [['Singular', 'this', 'that'], ['Plural', 'these', 'those']]),
        ex: [['This is my book.', 'هذا كتابي.'], ['That is a mosque.', 'ذاك مسجد.'], ['These are my shoes.', 'هذه حذائي.'], ['Those are birds.', 'تلك طيور.']] },
      { t: ['After this / that we use is. After these / those we use are.', 'بعد this / that نستخدم is، وبعد these / those نستخدم are.'], ex: [['What is this?', 'ما هذا؟'], ['Who are those men?', 'من أولئك الرجال؟']] }
    ], [
      mc('(near, one book) ___ is my book.', ['This', 'These', 'That'], 'This'), mc('(far, two cars) ___ are fast cars.', ['Those', 'That', 'This'], 'Those'), mc('(near, two bags) ___ are my bags.', ['These', 'This', 'Those'], 'These'),
      mc('(far, one house) ___ is a big house.', ['That', 'Those', 'These'], 'That'), fill('(near) ____ are my keys.', 'these', 'هذه مفاتيحي.'), fill('(far) ____ is my school.', 'that', 'تلك مدرستي.'),
      ord('What is this?', 'ما هذا؟'), ord('Those are my friends.', 'أولئك أصدقائي.')
    ]),

    L('have-got', 'A1', '🎒', 'have got / has got', 'الملكية: have got', null, [
      { t: ['We use have got / has got to talk about things we own, family and descriptions. Use has got with he, she, it.', 'نستخدم have got / has got للتعبير عن الامتلاك والعائلة والأوصاف. has got مع he, she, it.'],
        table: mkTable(['Subject', 'Positive', 'Negative'], [['I / you / we / they', 'have got', "haven't got"], ['he / she / it', 'has got', "hasn't got"]]),
        ex: [['I have got a new phone.', 'عندي هاتف جديد.'], ['She has got two sisters.', 'عندها أختان.'], ["He hasn't got a car.", 'ليس عنده سيارة.']] },
      { t: ['Question: Have you got …? / Has she got …?', 'السؤال: Have you got …? / Has she got …?'], ex: [['Have you got a pen?', 'هل عندك قلم؟'], ["Yes, I have. / No, I haven't.", 'نعم. / لا.']],
        warn: ['✗ I am have a car.   ✓ I have got a car. / I have a car.', 'لا نجمع am مع have.'] }
    ], [
      mc('She ___ got a big family.', ['have', 'has', 'is'], 'has'), mc('They ___ got three cars.', ['have', 'has', 'are'], 'have'), mc('He ___ got a bike. (negative)', ["hasn't", "haven't", "isn't"], "hasn't"),
      fill('I ____ got a headache.', 'have', 'عندي صداع.'), fill('My brother ____ got a dog.', 'has', 'أخي عنده كلب.'), ord('Have you got a pen?', 'هل عندك قلم؟'), ord('She has got long hair.', 'شعرها طويل.'),
      tf('"He have got a car" is correct.', false, '', ['With he we use has: He has got a car.', 'مع he نستخدم has.'])
    ]),

    L('present-simple', 'A1', '📅', 'Present simple', 'المضارع البسيط', 'timeline:present simple', [
      { t: ['We use the present simple for habits, routines and facts. With he / she / it add -s (-es after s, x, ch, sh, o; y → ies).', 'نستخدم المضارع البسيط للعادات والروتين والحقائق. مع he / she / it نضيف s (وes بعد s,x,ch,sh,o، وy تصبح ies).'],
        table: mkTable(['I / you / we / they', 'he / she / it'], [['work', 'works'], ['go', 'goes'], ['watch', 'watches'], ['study', 'studies'], ['have', 'has']]),
        ex: [['I get up at six.', 'أستيقظ في السادسة.'], ['She works in a bank.', 'هي تعمل في بنك.'], ['The sun rises in the east.', 'تشرق الشمس من الشرق.']],
        warn: ['✗ He go to school.   ✓ He goes to school.', 'لا تنسَ s مع he / she / it.'] },
      { t: ['Negative: do not (don\'t) / does not (doesn\'t) + base verb. Question: Do / Does + subject + base verb.', 'النفي: don\'t / doesn\'t + الفعل الأصلي. السؤال: Do / Does + الفاعل + الفعل الأصلي.'],
        ex: [["I don't like tea.", 'لا أحب الشاي.'], ["He doesn't work on Friday.", 'هو لا يعمل يوم الجمعة.'], ['Do you speak English?', 'هل تتكلم الإنجليزية؟'], ['Does she live here?', 'هل تسكن هنا؟']],
        warn: ["✗ He doesn't works.   ✓ He doesn't work. (after does/doesn't the verb has NO -s)", 'بعد does / doesn\'t نستخدم الفعل بلا s.'] }
    ], [
      mc('She ___ English every day.', ['study', 'studies', 'studys'], 'studies'), mc('They ___ football on Fridays.', ['play', 'plays', 'playing'], 'play'), mc('He ___ TV in the evening.', ['watch', 'watches', 'watchs'], 'watches'),
      mc('I ___ like coffee.', ["don't", "doesn't", "isn't"], "don't"), mc('___ she live in Cairo?', ['Do', 'Does', 'Is'], 'Does'), fill('My mother ____ (cook) dinner.', 'cooks', 'أمي تطبخ العشاء.'),
      fill('He doesn\'t ____ (like) fish.', 'like', 'هو لا يحب السمك.'), ord('Do you speak English?', 'هل تتكلم الإنجليزية؟'), ord("She doesn't work on Sunday.", 'هي لا تعمل يوم الأحد.')
    ]),

    L('there-is', 'A1', '🏠', 'there is / there are', 'يوجد: there is / there are', null, [
      { t: ['There is + singular noun. There are + plural noun. We use them to say that something exists.', 'there is + اسم مفرد، وthere are + اسم جمع. نستخدمهما لنقول إن شيئًا موجود.'],
        ex: [['There is a lamp in the room.', 'يوجد مصباح في الغرفة.'], ['There are three chairs.', 'توجد ثلاثة كراسٍ.'], ['There is some milk in the fridge.', 'يوجد حليب في الثلاجة.']] },
      { t: ['Negative: there isn\'t / there aren\'t. Question: Is there …? / Are there …?', 'النفي: there isn\'t / there aren\'t. السؤال: Is there …? / Are there …?'],
        ex: [["There isn't a bank near here.", 'لا يوجد بنك قريب من هنا.'], ['Is there a pharmacy?', 'هل توجد صيدلية؟'], ['Are there any shops?', 'هل توجد محلّات؟'], ['Yes, there are. / No, there aren\'t.', 'نعم. / لا.']],
        warn: ['✗ In the room there a table.   ✓ There is a table in the room.', 'لا بدّ من is / are بعد there.'] }
    ], [
      mc('There ___ a book on the table.', ['is', 'are', 'am'], 'is'), mc('There ___ two windows.', ['is', 'are', 'be'], 'are'), mc('___ there a park near here?', ['Is', 'Are', 'Do'], 'Is'), mc('___ there any eggs?', ['Is', 'Are', 'Does'], 'Are'),
      fill("There ____ a school here. (negative: isn't)", "isn't", 'لا توجد مدرسة هنا.'), fill('There ____ five students in the class.', 'are', 'يوجد خمسة طلاب في الفصل.'), ord('There is a cat under the table.', 'توجد قطة تحت الطاولة.'), ord('Are there any bananas?', 'هل توجد أي موزات؟')
    ]),

    L('can', 'A1', '💪', 'can / can\'t', 'القدرة والإذن: can', null, [
      { t: ['can + base verb = ability or permission. can is the same for all subjects. Negative: can\'t (cannot).', 'can + الفعل الأصلي = القدرة أو الإذن. وهي ثابتة مع كل الضمائر. النفي can\'t.'],
        ex: [['I can swim.', 'أستطيع السباحة.'], ['She can speak three languages.', 'هي تتكلم ثلاث لغات.'], ["He can't drive.", 'هو لا يستطيع القيادة.'], ['Can I sit here?', 'هل يمكنني الجلوس هنا؟']] },
      { t: ['Question: Can + subject + verb? Short answers: Yes, I can. / No, I can\'t. Use can to ask politely: Can you help me, please?', 'السؤال: Can + الفاعل + فعل؟ ونستخدمها للطلب بلطف: Can you help me, please?'],
        ex: [['Can you open the window, please?', 'هل تفتح النافذة من فضلك؟'], ['Can you play the guitar?', 'هل تعزف على الغيتار؟']],
        warn: ['✗ She cans swim. / She can to swim.   ✓ She can swim.', 'لا s بعد can ولا to بعدها.'] }
    ], [
      mc('She ___ swim very well.', ['can', 'cans', 'can to'], 'can'), mc('I ___ drive. I\'m too young.', ["can't", 'can', 'cannot to'], "can't"), mc('___ you help me, please?', ['Can', 'Do', 'Are'], 'Can'),
      fill('He can ____ (play) football.', 'play', 'هو يستطيع لعب كرة القدم.'), fill('Birds ____ fly. (can)', 'can', 'الطيور تستطيع الطيران.'), ord('Can you open the door?', 'هل تفتح الباب؟'), ord("I can't speak French.", 'لا أستطيع التكلّم بالفرنسية.'),
      tf('"He can swims" is correct.', false, '', ['After can we use the base verb: He can swim.', 'بعد can نستخدم الفعل الأصلي.'])
    ]),

    L('prepositions-place', 'A1', '📦', 'Prepositions of place', 'حروف الجر للمكان', 'prepositions', [
      { t: ['Prepositions of place tell us where something is: in, on, under, next to, behind, in front of, between, above.', 'حروف الجر تقول لنا أين الشيء: in (داخل)، on (على سطح)، under (تحت)، next to (بجانب)، behind (خلف)، in front of (أمام)، between (بين)، above (فوق).'],
        ex: [['The book is on the table.', 'الكتاب على الطاولة.'], ['The cat is under the chair.', 'القطة تحت الكرسي.'], ['The bank is next to the school.', 'البنك بجانب المدرسة.']] },
      { t: ['Try the widget above: choose a preposition and watch the ball move!', 'جرّب الأداة التفاعلية أعلاه: اختر حرف جر وشاهد الكرة تتحرّك!'], warn: ['in Cairo / in a room / in the car;   on the table / on the wall;   at home / at school', 'in للأماكن المغلقة والمدن، on للسطوح، at للأماكن العامّة والنقاط.'], ex: [['I am at home.', 'أنا في البيت.'], ['She lives in Amman.', 'تسكن في عمّان.']] }
    ], [
      mc('The ball is ___ the box. (inside)', ['in', 'on', 'under'], 'in'), mc('The lamp is ___ the table. (on top)', ['in', 'on', 'behind'], 'on'), mc('The dog is ___ the table. (below)', ['above', 'under', 'between'], 'under'),
      mc('The shop is ___ the bank and the school.', ['between', 'in', 'on'], 'between'), fill('I live ____ Riyadh. (in / on)', 'in', 'أسكن في الرياض.'), fill('The picture is ____ the wall. (in / on)', 'on', 'اللوحة على الحائط.'), fill('She is ____ school now. (at / in)', 'at', 'هي في المدرسة الآن.'), ord('The cat is behind the sofa.', 'القطة خلف الأريكة.')
    ]),

    L('question-words', 'A1', '❓', 'Question words', 'كلمات الاستفهام', null, [
      { t: ['Use question words at the start of a question.', 'نضع كلمة الاستفهام في بداية السؤال.'],
        table: mkTable(['Word', 'Asks about', 'Example'], [['What', 'things', 'What is your name?'], ['Where', 'place', 'Where do you live?'], ['Who', 'people', 'Who is that man?'], ['When', 'time', 'When is the class?'], ['Why', 'reason', 'Why are you late?'], ['How', 'way / state', 'How are you?'], ['How much / How many', 'price or quantity', 'How much is this?']]),
        ex: [['What time is it?', 'كم الساعة؟'], ['How many brothers have you got?', 'كم أخًا عندك؟']] },
      { t: ['Word order: Question word + do/does/is/are + subject + verb.', 'الترتيب: كلمة الاستفهام + do/does/is/are + الفاعل + الفعل.'], ex: [['Where does he work?', 'أين يعمل؟'], ['Why do you study English?', 'لماذا تدرس الإنجليزية؟']],
        warn: ['✗ Where you live?   ✓ Where do you live?', 'لا ننسى الفعل المساعد do / does.'] }
    ], [
      mc('___ is your teacher? Mr. Khalid.', ['Who', 'What', 'Where'], 'Who'), mc('___ do you live? In Jeddah.', ['Where', 'When', 'Why'], 'Where'), mc('___ is the exam? On Monday.', ['When', 'How', 'Who'], 'When'),
      mc('___ are you tired? Because I worked all night.', ['Why', 'What', 'Who'], 'Why'), mc('___ is this bag? Ten dollars.', ['How much', 'How many', 'What'], 'How much'), mc('___ brothers have you got? Two.', ['How many', 'How much', 'Which'], 'How many'),
      ord('Where do you work?', 'أين تعمل؟'), ord('What is your name?', 'ما اسمك؟')
    ]),

    L('time', 'A1', '⏰', 'Telling the time', 'قول الوقت (at / on / in)', 'clock', [
      { t: ['Ask: What time is it? Answer: It\'s … o\'clock / half past … / quarter past … / quarter to … / … past / … to …', 'نسأل: What time is it? ونجيب: It\'s … بإحدى الصيغ: o\'clock، half past (والنصف)، quarter past (والربع)، quarter to (إلا ربعًا).'],
        ex: [["It's three o'clock.", 'الساعة الثالثة تمامًا.'], ["It's half past six.", 'الساعة السادسة والنصف.'], ["It's quarter to nine.", 'الساعة التاسعة إلا ربعًا.']] },
      { t: ['Prepositions of time: at + clock time (at 7:30), on + days and dates (on Monday), in + months, years, seasons and parts of the day (in May, in 2025, in the morning).', 'حروف الجر للزمان: at مع الساعة، on مع الأيام والتواريخ، in مع الشهور والسنوات والفصول وأوقات اليوم.'],
        ex: [['The class starts at nine.', 'يبدأ الدرس في التاسعة.'], ['I play football on Friday.', 'ألعب كرة القدم يوم الجمعة.'], ['It is hot in summer.', 'الجو حارّ في الصيف.']],
        warn: ['at night, but in the morning / in the evening', 'نقول at night لكن in the morning.'] }
    ], [
      mc('We have lunch ___ one o\'clock.', ['at', 'on', 'in'], 'at'), mc('I travel ___ Monday.', ['at', 'on', 'in'], 'on'), mc('She was born ___ 1998.', ['at', 'on', 'in'], 'in'), mc('He studies ___ the morning.', ['at', 'on', 'in'], 'in'),
      mc('8:30 is ___.', ['half past eight', 'half to eight', 'eight half'], 'half past eight'), mc('3:45 is ___.', ['quarter to four', 'quarter past three', 'three quarter'], 'quarter to four'), fill('The film starts ____ night. (at / in)', 'at', 'يبدأ الفيلم ليلًا.'), ord("It's quarter past five.", 'الساعة الخامسة والربع.')
    ]),

    L('possessive-s', 'A1', '👨‍👩‍👧', "Possessive 's and family", "الملكية 's والعائلة", 'family', [
      { t: ["We add 's to a person's name to show ownership: Ali's book = the book of Ali. For plural nouns ending in s, add only an apostrophe: the students' room.", "نضيف 's لاسم الشخص لنعبّر عن الملكية: Ali's book = كتاب علي. وللجمع المنتهي بـ s نضيف الفاصلة العليا فقط: the students' room."],
        ex: [["This is Sara's bag.", 'هذه حقيبة سارة.'], ["My father's car is old.", 'سيارة أبي قديمة.'], ["The girls' room is big.", 'غرفة البنات كبيرة.']] },
      { t: ['Family words: grandfather, grandmother, father, mother, uncle, aunt, brother, sister, cousin, son, daughter. Tap the people in the family tree above!', 'كلمات العائلة: جدّ، جدّة، أب، أمّ، عمّ/خال، عمّة/خالة، أخ، أخت، ابن/ابنة العم أو الخال، ابن، ابنة. اضغط على الأشخاص في شجرة العائلة أعلاه!'],
        ex: [["My aunt's son is my cousin.", 'ابن عمّتي هو ابن عمّي.'], ['My mother is my father\'s wife.', 'أمي هي زوجة أبي.']],
        warn: ["'s can also be short for is: He's tall = He is tall. Look at the meaning.", "قد تكون 's اختصارًا لـ is أيضًا: He's tall."] }
    ], [
      mc("This is my ___ car. (my father)", ["father's", 'fathers', "fathers'"], "father's"), mc("The ___ books are on the desk. (many students)", ["student's", "students'", 'students'], "students'"), mc("Ali is my father's brother. He is my ___.", ['uncle', 'cousin', 'grandfather'], 'uncle'),
      mc("My mother's mother is my ___.", ['aunt', 'grandmother', 'sister'], 'grandmother'), fill("This is ____ phone. (Sara)", "Sara's", 'هذا هاتف سارة.'), fill("My uncle's daughter is my ____.", 'cousin', 'ابنة عمّي (cousin).'), ord("It is my brother's bag.", 'إنها حقيبة أخي.'), tf("'The cat's name is Lulu' means the name of the cat.", true, '', ["Yes: 's shows that the name belongs to the cat.", "نعم: 's تدلّ أن الاسم يخصّ القطة."])
    ])
  );
})();

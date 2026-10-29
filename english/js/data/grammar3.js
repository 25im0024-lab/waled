/* Grammar lessons — level B1. */
(function () {
  'use strict';
  const { lessons: G, mc, fill, ord, tf, mkTable, L } = window.EL.data.grammar;

  G.push(
    L('present-perfect', 'B1', '🌉', 'Present perfect', 'المضارع التام', 'timeline:present perfect,past simple', [
      { t: ['have / has + past participle. We use it for experiences, recent results and situations that started in the past and continue now.', 'have / has + التصريف الثالث للفعل. نستخدمه للخبرات والنتائج القريبة والحالات التي بدأت في الماضي وما زالت مستمرة.'],
        table: mkTable(['Base', 'Past simple', 'Past participle'], [['be', 'was / were', 'been'], ['go', 'went', 'gone / been'], ['see', 'saw', 'seen'], ['eat', 'ate', 'eaten'], ['write', 'wrote', 'written'], ['take', 'took', 'taken'], ['do', 'did', 'done'], ['work', 'worked', 'worked']]),
        ex: [['I have lived here for five years.', 'أعيش هنا منذ خمس سنوات.'], ['Have you ever been to London?', 'هل سبق أن زرتَ لندن؟'], ['She has already finished the report.', 'لقد أنهت التقرير بالفعل.'], ["I haven't seen him yet.", 'لم أره بعد.']] },
      { t: ['for + period of time (for two years); since + starting point (since 2020). Do NOT use the present perfect with a finished time (yesterday, in 2019, last week): use the past simple.', 'for مع المدّة، وsince مع نقطة البداية. ولا نستخدم المضارع التام مع زمن منتهٍ (yesterday, in 2019): نستخدم الماضي البسيط.'],
        ex: [['We have known each other since 2018.', 'نعرف بعضنا منذ 2018.'], ['I went to Paris in 2019.', 'ذهبتُ إلى باريس في 2019.']],
        warn: ['✗ I have seen him yesterday.   ✓ I saw him yesterday.', 'مع yesterday لا نستخدم المضارع التام.'] }
    ], [
      mc('I ___ in this city since 2015.', ['live', 'have lived', 'lived'], 'have lived'), mc('She ___ never ___ sushi.', ['has / eaten', 'have / ate', 'is / eating'], 'has / eaten'), mc('___ you ever been to Turkey?', ['Have', 'Did', 'Are'], 'Have'), mc('I ___ him yesterday.', ['have seen', 'saw', 'see'], 'saw'),
      mc('We have worked here ___ three years.', ['since', 'for', 'ago'], 'for'), fill('He has ____ (write) three emails today.', 'written', 'كتب ثلاث رسائل اليوم.'), fill('I haven\'t finished ____ . (yet / already)', 'yet', 'لم أنتهِ بعد.'), ord('Have you finished the report yet?', 'هل أنهيتَ التقرير بعد؟')
    ]),

    L('past-continuous', 'B1', '🎬', 'Past continuous', 'الماضي المستمر', 'timeline:past continuous,past simple', [
      { t: ['was / were + verb-ing = an action in progress at a moment in the past. Often used with the past simple: a long action (past continuous) is interrupted by a short action (past simple).', 'was / were + ing = حدث كان جاريًا في لحظة ماضية. وغالبًا مع الماضي البسيط: حدث طويل (مستمر) قاطعه حدث قصير (بسيط).'],
        ex: [['I was cooking when the phone rang.', 'كنتُ أطبخ عندما رنّ الهاتف.'], ['They were playing football at five.', 'كانوا يلعبون كرة القدم في الخامسة.'], ['It was raining when we left.', 'كانت تمطر عندما غادرنا.']] },
      { t: ['when + short action (past simple), while + long action (past continuous).', 'when مع الحدث القصير، وwhile مع الحدث الطويل.'], ex: [['While I was walking, I saw an accident.', 'بينما كنتُ أمشي رأيتُ حادثًا.'], ['I was sleeping when you called.', 'كنتُ نائمًا عندما اتّصلتَ.']], warn: ['✗ I was walk home.   ✓ I was walking home.', 'بعد was / were نضيف ing.'] }
    ], [
      mc('I ___ a book when he arrived.', ['read', 'was reading', 'am reading'], 'was reading'), mc('They ___ TV when the lights went out.', ['were watching', 'watched', 'watching'], 'were watching'), mc('___ she sleeping at ten?', ['Was', 'Were', 'Did'], 'Was'),
      mc('While we ___ , it started to rain.', ['walked', 'were walking', 'was walking'], 'were walking'), fill('He ____ (drive) when the accident happened.', 'was driving', 'كان يقود عندما وقع الحادث.'), fill('We were ____ (have) lunch at one.', 'having', 'كنا نتناول الغداء في الواحدة.'), ord('I was working when she called.', 'كنتُ أعمل عندما اتصلت.'), ord('What were you doing at nine?', 'ماذا كنتَ تفعل في التاسعة؟')
    ]),

    L('first-conditional', 'B1', '☔', 'First conditional (real future)', 'الشرط الأول (مستقبل ممكن)', null, [
      { t: ['If + present simple, will + base verb. We use it for real, possible future situations.', 'If + مضارع بسيط، will + فعل أصلي. للمواقف المستقبلية الممكنة.'],
        ex: [['If it rains, we will stay at home.', 'إذا أمطرت، سنبقى في البيت.'], ['If you study hard, you will pass.', 'إذا درستَ بجدّ، فسوف تنجح.'], ["She won't come if she is busy.", 'لن تأتي إذا كانت مشغولة.']] },
      { t: ['The if-clause uses the PRESENT, not will. unless = if … not. Use a comma when the if-clause is first.', 'جملة if تأتي بالمضارع وليس will. وunless = if … not. نضع فاصلة إذا بدأنا بجملة if.'],
        ex: [["Unless you hurry, you'll miss the bus.", 'إن لم تُسرع ستفوتك الحافلة.'], ['I will call you if I have time.', 'سأتّصل بك إن توفّر لي الوقت.']], warn: ['✗ If it will rain, I will stay.   ✓ If it rains, I will stay.', 'لا نستخدم will بعد if.'] }
    ], [
      mc('If you ___ me, I will help you.', ['ask', 'will ask', 'asked'], 'ask'), mc('If it ___ tomorrow, we will cancel the trip.', ['rains', 'will rain', 'rained'], 'rains'), mc("She ___ pass if she studies.", ['will', 'would', 'is'], 'will'), mc('___ you hurry, you will be late.', ['Unless', 'If', 'When'], 'Unless'),
      fill('If I ____ (see) him, I will tell him.', 'see', 'إذا رأيته سأخبره.'), fill('We ____ (go) out if the weather is nice.', 'will go', 'سنخرج إذا كان الطقس جميلًا.'), ord('If you work hard, you will succeed.', 'إذا عملتَ بجدّ فسوف تنجح.'), tf('"If it will rain, I will stay home" is correct.', false, '', ['After if we use the present simple: If it rains…', 'بعد if نستخدم المضارع: If it rains.'])
    ]),

    L('second-conditional', 'B1', '💭', 'Second conditional (imaginary)', 'الشرط الثاني (افتراضي)', null, [
      { t: ['If + past simple, would + base verb. We use it for unreal or unlikely situations in the present or future.', 'If + ماضٍ بسيط، would + فعل أصلي. للمواقف المتخيّلة أو غير المحتملة.'],
        ex: [['If I had a million dollars, I would travel the world.', 'لو كان معي مليون دولار لسافرتُ حول العالم.'], ['If she knew the answer, she would tell us.', 'لو عرفت الإجابة لأخبرتنا.'], ["I wouldn't do that if I were you.", 'لم أكن لأفعل ذلك لو كنتُ مكانك.']] },
      { t: ['After if we can use were for all persons: If I were you … (advice). The past form here does not mean past time!', 'بعد if نستخدم were مع كل الضمائر: If I were you … (نصيحة). والماضي هنا لا يعني زمنًا ماضيًا!'],
        ex: [['If I were you, I would study more.', 'لو كنتُ مكانك لدرستُ أكثر.'], ['What would you do if you lost your job?', 'ماذا ستفعل لو فقدتَ وظيفتك؟']], warn: ['✗ If I would have time, I would come.   ✓ If I had time, I would come.', 'لا would داخل جملة if.'] }
    ], [
      mc('If I ___ rich, I would buy a big house.', ['am', 'were', 'will be'], 'were'), mc('If she ___ more time, she would learn French.', ['has', 'had', 'would have'], 'had'), mc('I ___ help you if I knew how.', ['will', 'would', 'did'], 'would'), mc('What ___ you do if you saw a lion?', ['will', 'would', 'did'], 'would'),
      fill('If I ____ (be) you, I would call him.', 'were', 'لو كنتُ مكانك لاتّصلتُ به.'), fill('If we had a car, we ____ (drive) to the beach.', 'would drive', 'لو كان عندنا سيارة لقدنا إلى الشاطئ.'), ord('If I had more time, I would learn English.', 'لو كان عندي وقت أكثر لتعلّمتُ الإنجليزية.'), ord('What would you do?', 'ماذا كنتَ ستفعل؟')
    ]),

    L('passive', 'B1', '🏗️', 'Passive voice', 'المبني للمجهول', null, [
      { t: ['Passive = be + past participle. We use it when the action is more important than who did it. Present: is / are + p.p. Past: was / were + p.p.', 'المبني للمجهول = be + التصريف الثالث. نستخدمه حين يكون الحدث أهم من الفاعل. المضارع: is / are + p.p. والماضي: was / were + p.p.'],
        table: mkTable(['Active', 'Passive'], [['They make cars here.', 'Cars are made here.'], ['Someone stole my bag.', 'My bag was stolen.'], ['People speak English in many countries.', 'English is spoken in many countries.'], ['A famous architect designed this building.', 'This building was designed by a famous architect.']]),
        ex: [['The mosque was built in 1990.', 'بُني المسجد عام 1990.'], ['Rice is grown in warm countries.', 'يُزرع الأرز في البلدان الدافئة.']] },
      { t: ['Use by + agent only when it is important: This book was written by Naguib Mahfouz.', 'نستخدم by + الفاعل فقط إذا كان مهمًّا.'], ex: [['The letters are delivered every day.', 'تُسلَّم الرسائل كل يوم.'], ['The thief was caught.', 'أُلقي القبض على اللص.']], warn: ['✗ The window broke by the boy.   ✓ The window was broken by the boy.', 'لا ننسى was + التصريف الثالث.'] }
    ], [
      mc('English ___ in many countries.', ['speaks', 'is spoken', 'spoke'], 'is spoken'), mc('The house ___ in 1950.', ['built', 'was built', 'is building'], 'was built'), mc('These shoes ___ in Italy.', ['are made', 'make', 'made'], 'are made'), mc('My phone ___ yesterday.', ['stole', 'was stolen', 'is stolen'], 'was stolen'),
      fill('The letters ____ (send) every day.', 'are sent', 'تُرسَل الرسائل كل يوم.'), fill('The book ____ (write) by a famous author.', 'was written', 'كُتب الكتاب بقلم مؤلف مشهور.'), ord('The car was repaired yesterday.', 'أُصلحت السيارة أمس.'), ord('Coffee is grown in Yemen.', 'تُزرع القهوة في اليمن.')
    ]),

    L('relative', 'B1', '🔗', 'Relative clauses', 'جمل الصلة: who / which / that / where', null, [
      { t: ['who = people, which = things, that = people or things, where = places, whose = possession. They join two sentences.', 'who للأشخاص، which للأشياء، that لكليهما، where للأماكن، whose للملكية. وهي تربط جملتين.'],
        ex: [['The man who lives next door is a doctor.', 'الرجل الذي يسكن بجوارنا طبيب.'], ['This is the book which I told you about.', 'هذا هو الكتاب الذي حدّثتك عنه.'], ['That is the restaurant where we had dinner.', 'ذلك هو المطعم الذي تناولنا فيه العشاء.'], ['I know a girl whose father is a pilot.', 'أعرف بنتًا والدها طيّار.']] },
      { t: ['In English we do NOT repeat the pronoun: no "him / it" after the relative clause.', 'في الإنجليزية لا نعيد الضمير: لا نقول «الكتاب الذي قرأته هو».'], ex: [['The film that I saw was great.', 'الفيلم الذي شاهدته كان رائعًا.']], warn: ['✗ The book which I read it was long.   ✓ The book which I read was long.', 'لا نكرّر it بعد جملة الصلة.'] }
    ], [
      mc('The woman ___ teaches me English is kind.', ['who', 'which', 'where'], 'who'), mc('This is the phone ___ I bought.', ['who', 'which', 'whose'], 'which'), mc('That is the school ___ I studied.', ['where', 'who', 'which'], 'where'), mc('I have a friend ___ brother is a footballer.', ['whose', 'who', 'where'], 'whose'),
      fill('The man ____ called you is here. (who / which)', 'who', 'الرجل الذي اتّصل بك هنا.'), fill('The car ____ is outside is mine. (who / which)', 'which', 'السيارة التي بالخارج لي.'), ord('The book that I read was interesting.', 'الكتاب الذي قرأته كان ممتعًا.'), tf('"The film which I saw it was good" is correct.', false, '', ['Do not repeat it: The film which I saw was good.', 'لا نعيد الضمير it.'])
    ]),

    L('used-to', 'B1', '🕰️', 'used to', 'كنتُ أفعل: used to', null, [
      { t: ['used to + base verb = past habits or states that are not true now.', 'used to + فعل أصلي = عادات أو حالات في الماضي لم تعد صحيحة الآن.'],
        ex: [['I used to play football every day.', 'كنتُ ألعب كرة القدم كل يوم (ولم أعد).'], ['She used to live in Amman.', 'كانت تسكن في عمّان (سابقًا).'], ['There used to be a cinema here.', 'كانت هنا سينما.']] },
      { t: ['Negative: didn\'t use to. Question: Did you use to …? (no -d after did). Do not confuse with be used to + -ing = to be accustomed.', 'النفي: didn\'t use to. والسؤال: Did you use to …؟. ولا تخلطها مع be used to + ing = معتاد على.'],
        ex: [["He didn't use to like fish.", 'لم يكن يحبّ السمك.'], ['Did you use to walk to school?', 'هل كنتَ تمشي إلى المدرسة؟'], ["I'm used to getting up early.", 'اعتدتُ الاستيقاظ مبكرًا.']], warn: ['✗ I use to smoke.   ✓ I used to smoke.', 'في الماضي نقول used to (بـ d).'] }
    ], [
      mc('We ___ live in a small village.', ['use to', 'used to', 'using to'], 'used to'), mc('He ___ eat meat, but now he is vegetarian.', ['used to', 'is used to', 'uses to'], 'used to'), mc('Did you ___ play the piano?', ['use to', 'used to', 'using'], 'use to'), mc("I'm used to ___ up early.", ['get', 'getting', 'got'], 'getting'),
      fill("She didn't ____ to like coffee.", 'use', 'لم تكن تحب القهوة.'), fill('I ____ to walk to school every day.', 'used', 'كنتُ أمشي إلى المدرسة كل يوم.'), ord('I used to play with my cousins.', 'كنتُ ألعب مع أبناء عمومتي.'), ord('Did you use to live here?', 'هل كنتَ تسكن هنا؟')
    ]),

    L('reported-speech', 'B1', '🗨️', 'Reported speech', 'الكلام المنقول', null, [
      { t: ['We report what someone said. The verb usually moves one step back in time (backshift): am/is → was, do/does → did, will → would, can → could, present simple → past simple.', 'ننقل ما قاله شخص ما. ويرجع الفعل خطوة للخلف في الزمن: present → past، will → would، can → could.'],
        table: mkTable(['Direct', 'Reported'], [['"I am tired."', 'He said he was tired.'], ['"I work here."', 'She said she worked here.'], ['"I will call you."', 'He said he would call me.'], ['"I can swim."', 'She said she could swim.']]),
        ex: [['He said that he was busy.', 'قال إنه مشغول.'], ['They said they would come.', 'قالوا إنهم سيأتون.']] },
      { t: ['say + that (no person): He said he was late. tell + person: He told me he was late. Pronouns and time words also change: today → that day, tomorrow → the next day, here → there.', 'say بلا مفعول به، وtell + الشخص. وتتغيّر الضمائر وكلمات الزمن: tomorrow → the next day.'],
        ex: [['She told me she was hungry.', 'قالت لي إنها جائعة.'], ['He said he would come the next day.', 'قال إنه سيأتي في اليوم التالي.']], warn: ['✗ She said me that she was tired.   ✓ She told me that she was tired. / She said that she was tired.', 'say لا يأخذ me مباشرة؛ نستخدم tell me.'] }
    ], [
      mc('"I am happy." → He said he ___ happy.', ['is', 'was', 'be'], 'was'), mc('"I will help." → She said she ___ help.', ['will', 'would', 'can'], 'would'), mc('"I can drive." → He said he ___ drive.', ['can', 'could', 'cans'], 'could'), mc('She ___ me that she was late.', ['said', 'told', 'say'], 'told'),
      fill('"I work here." → He said he ____ here.', 'worked', 'قال إنه يعمل هنا.'), fill('"I like tea." → She said she ____ tea.', 'liked', 'قالت إنها تحب الشاي.'), ord('He said that he was tired.', 'قال إنه متعب.'), ord('She told me she would call.', 'قالت لي إنها ستتّصل.')
    ]),

    L('gerund-infinitive', 'B1', '🔤', 'Verb + -ing or to + verb', 'الفعل + ing أو to + فعل', null, [
      { t: ['Some verbs are followed by -ing: enjoy, finish, avoid, mind, suggest, keep, practise. Some are followed by to + verb: want, need, decide, hope, plan, learn, promise.', 'بعض الأفعال تتبعها ing: enjoy, finish, avoid, mind, suggest. وبعضها يتبعه to + فعل: want, need, decide, hope, plan, learn.'],
        table: mkTable(['+ -ing', '+ to + verb', 'Both'], [['enjoy', 'want', 'like'], ['finish', 'need', 'love'], ['avoid', 'decide', 'start'], ['suggest', 'hope', 'begin'], ['keep', 'plan', 'prefer']]),
        ex: [['I enjoy reading.', 'أستمتع بالقراءة.'], ['She wants to learn English.', 'تريد تعلّم الإنجليزية.'], ['We decided to leave.', 'قرّرنا المغادرة.']] },
      { t: ['After a preposition we always use -ing: interested in learning, good at cooking, before leaving.', 'بعد حرف الجر نستخدم دائمًا ing: interested in learning, good at cooking.'],
        ex: [["I'm interested in learning French.", 'أنا مهتم بتعلّم الفرنسية.'], ['Thank you for helping me.', 'شكرًا لمساعدتك لي.']], warn: ['✗ I am interested to learn.   ✓ I am interested in learning.', 'بعد in نستخدم ing.'] }
    ], [
      mc('I enjoy ___ football.', ['play', 'playing', 'to play'], 'playing'), mc('She wants ___ a doctor.', ['be', 'being', 'to be'], 'to be'), mc('He finished ___ the report.', ['write', 'writing', 'to write'], 'writing'), mc('We decided ___ early.', ['leaving', 'to leave', 'leave'], 'to leave'),
      mc('She is good at ___ .', ['to cook', 'cooking', 'cook'], 'cooking'), fill('They hope ____ (win) the game.', 'to win', 'يأملون الفوز بالمباراة.'), fill('Thank you for ____ (help) me.', 'helping', 'شكرًا لمساعدتك لي.'), ord('I want to learn English.', 'أريد تعلّم الإنجليزية.')
    ]),

    L('linking', 'B1', '🧷', 'Linking words', 'أدوات الربط', null, [
      { t: ['and (addition), but (contrast), or (choice), so (result), because (reason). because + clause; because of + noun.', 'and للإضافة، but للتعارض، or للاختيار، so للنتيجة، because للسبب. because + جملة، وbecause of + اسم.'],
        ex: [["I was tired, so I went to bed.", 'كنتُ متعبًا لذلك نمت.'], ['I stayed home because it was raining.', 'بقيتُ في البيت لأنها كانت تمطر.'], ['We stayed home because of the rain.', 'بقينا في البيت بسبب المطر.']] },
      { t: ['although / even though + clause = but (contrast). however = starts a new sentence with a comma. First, then, after that, finally for steps.', 'although + جملة بمعنى «مع أنّ». أمّا however فتبدأ جملة جديدة ويليها فاصلة. وfirst, then, finally لترتيب الخطوات.'],
        ex: [['Although it was cold, we went out.', 'مع أن الجو كان باردًا خرجنا.'], ['The hotel was expensive. However, it was great.', 'كان الفندق غاليًا. ومع ذلك كان رائعًا.'], ['First, mix the eggs. Then, add milk. Finally, cook.', 'أولًا اخلط البيض. ثم أضف الحليب. وأخيرًا اطبخ.']], warn: ['✗ Although it was cold, but we went out.   ✓ Although it was cold, we went out.', 'لا نجمع although مع but.'] }
    ], [
      mc('I was hungry, ___ I ate a sandwich.', ['so', 'because', 'but'], 'so'), mc('She stayed home ___ she was ill.', ['so', 'because', 'but'], 'because'), mc('He studied hard. ___, he failed.', ['However', 'Because', 'So'], 'However'), mc('___ it was hot, we played outside.', ['Although', 'Because', 'So'], 'Although'),
      mc('We were late ___ the traffic.', ['because of', 'because', 'although'], 'because of'), fill('It was raining, ____ I took an umbrella. (so / but)', 'so', 'كانت تمطر لذلك أخذتُ مظلة.'), ord('Although I was tired, I finished the work.', 'مع أني كنتُ متعبًا أنهيتُ العمل.'), tf('"Although it was cold, but we went out" is correct.', false, '', ['Use only one: Although it was cold, we went out.', 'نستخدم أداة واحدة فقط.'])
    ])
  );
})();

/* Grammar lessons — level A2. */
(function () {
  'use strict';
  const { lessons: G, mc, fill, ord, tf, mkTable, L } = window.EL.data.grammar;

  G.push(
    L('present-continuous', 'A2', '🏃', 'Present continuous', 'المضارع المستمر', 'timeline:present simple,present continuous', [
      { t: ['Use am / is / are + verb-ing for actions happening now or around now.', 'نستخدم am / is / are + الفعل مع ing للأحداث التي تجري الآن أو في هذه الفترة.'],
        table: mkTable(['Verb', '-ing form', 'Rule'], [['work', 'working', '+ing'], ['make', 'making', 'drop e'], ['run', 'running', 'double the consonant'], ['study', 'studying', 'keep y'], ['lie', 'lying', 'ie → ying']]),
        ex: [["I'm learning English.", 'أنا أتعلّم الإنجليزية.'], ['She is talking on the phone.', 'هي تتحدّث على الهاتف.'], ['They are not working today.', 'هم لا يعملون اليوم.'], ['Are you listening?', 'هل تستمع؟']],
        warn: ['✗ I am go now.   ✓ I am going now.', 'بعد am / is / are نضيف ing للفعل.'] },
      { t: ['Present simple = habits and facts (every day). Present continuous = now (now, at the moment, today, this week). Some verbs (like, love, want, know, understand) are not used with -ing.', 'المضارع البسيط للعادات والحقائق، والمستمر لما يحدث الآن. وبعض الأفعال (like, want, know, understand) لا تأتي مع ing.'],
        ex: [['I drink tea every morning. / I am drinking tea now.', 'أشرب الشاي كل صباح. / أنا أشرب الشاي الآن.'], ['I want a coffee.', 'أريد قهوة.']],
        warn: ['✗ I am wanting water.   ✓ I want water.', 'لا نقول wanting.'] }
    ], [
      mc('Look! It ___ .', ['rains', 'is raining', 'rain'], 'is raining'), mc('She usually ___ at seven.', ['gets up', 'is getting up', 'get up'], 'gets up'), mc('They ___ football now.', ['play', 'are playing', 'plays'], 'are playing'),
      mc('I ___ to music at the moment.', ['listen', 'am listening', 'listens'], 'am listening'), fill('He is ____ (run) in the park.', 'running', 'هو يركض في الحديقة.'), fill('We are ____ (make) dinner.', 'making', 'نحن نُعدّ العشاء.'),
      ord('She is reading a book now.', 'هي تقرأ كتابًا الآن.'), mc('I ___ the answer. (know)', ['know', 'am knowing', 'knowing'], 'know', 'أعرف الإجابة.', ['know is a state verb: no -ing.', 'know فعل حالة: لا نستخدم ing معه.'])
    ]),

    L('was-were', 'A2', '⏪', 'Past of to be: was / were', 'الماضي من to be: was / were', null, [
      { t: ['was = I / he / she / it. were = you / we / they. Negative: wasn\'t / weren\'t. Question: Was he …? Were you …?', 'was مع I / he / she / it، وwere مع you / we / they. النفي wasn\'t / weren\'t.'],
        table: mkTable(['Subject', 'Positive', 'Negative'], [['I / he / she / it', 'was', "wasn't"], ['you / we / they', 'were', "weren't"]]),
        ex: [['I was at home yesterday.', 'كنتُ في البيت أمس.'], ['They were late.', 'كانوا متأخرين.'], ["It wasn't cold.", 'لم يكن الجو باردًا.'], ['Were you at school?', 'هل كنتَ في المدرسة؟']] },
      { t: ['Time words for the past: yesterday, last week, last year, two days ago, in 2010.', 'كلمات الزمن الماضي: yesterday, last week, two days ago, in 2010.'], ex: [['Where were you last night?', 'أين كنتَ ليلة أمس؟'], ['She was born in 1999.', 'وُلدت في 1999.']] }
    ], [
      mc('I ___ tired yesterday.', ['was', 'were', 'am'], 'was'), mc('They ___ in Dubai last week.', ['was', 'were', 'are'], 'were'), mc('___ she happy?', ['Was', 'Were', 'Did'], 'Was'), mc('We ___ at the party. (negative)', ["wasn't", "weren't", "didn't"], "weren't"),
      fill('The film ____ boring. (was / were)', 'was', 'كان الفيلم مملًّا.'), fill('My parents ____ at home. (was / were)', 'were', 'كان والداي في البيت.'), ord('Where were you yesterday?', 'أين كنتَ أمس؟'), ord('He was not at work.', 'لم يكن في العمل.')
    ]),

    L('past-regular', 'A2', '📆', 'Past simple: regular verbs', 'الماضي البسيط: الأفعال المنتظمة', 'timeline:past simple', [
      { t: ['Add -ed to the verb: work → worked. If the verb ends in e add -d: live → lived. Consonant + y → -ied: study → studied. Short verbs: double the last letter: stop → stopped.', 'نضيف ed للفعل: worked. إذا انتهى بـ e نضيف d. وبعد حرف ساكن + y تصبح ied. والأفعال القصيرة نضاعف الحرف الأخير: stopped.'],
        ex: [['I watched TV last night.', 'شاهدتُ التلفاز ليلة أمس.'], ['She studied hard.', 'درست بجدّ.'], ['They stopped at the shop.', 'توقّفوا عند المحلّ.']] },
      { t: ['Negative: didn\'t + base verb. Question: Did + subject + base verb? The verb after did / didn\'t does NOT take -ed.', 'النفي: didn\'t + الفعل الأصلي. السؤال: Did + الفاعل + الفعل الأصلي. بعد did لا نضيف ed.'],
        ex: [["I didn't call him.", 'لم أتصل به.'], ['Did you finish the work?', 'هل أنهيتَ العمل؟'], ["Yes, I did. / No, I didn't.", 'نعم. / لا.']],
        warn: ["✗ I didn't watched.   ✓ I didn't watch.", 'بعد didn\'t نستخدم الفعل الأصلي.'] }
    ], [
      mc('He ___ in Jeddah in 2015.', ['live', 'lived', 'lives'], 'lived'), mc('We ___ English last year.', ['studied', 'studyed', 'study'], 'studied'), mc('She ___ the bus at the corner.', ['stoped', 'stopped', 'stop'], 'stopped'),
      mc('I ___ call him. (negative)', ["didn't", "don't", "wasn't"], "didn't"), mc('___ you visit your uncle?', ['Did', 'Do', 'Were'], 'Did'), fill('They ____ (play) football yesterday.', 'played', 'لعبوا كرة القدم أمس.'),
      fill("He didn't ____ (cook) dinner.", 'cook', 'لم يطبخ العشاء.'), ord('Did you watch the match?', 'هل شاهدتَ المباراة؟')
    ]),

    L('past-irregular', 'A2', '🕰️', 'Past simple: irregular verbs', 'الماضي البسيط: الأفعال الشاذّة', 'timeline:past simple', [
      { t: ['Many common verbs have special past forms. You must learn them.', 'كثير من الأفعال الشائعة لها صيغ ماضٍ خاصّة يجب حفظها.'],
        table: mkTable(['Base', 'Past', 'Base', 'Past'], [['go', 'went', 'see', 'saw'], ['have', 'had', 'eat', 'ate'], ['buy', 'bought', 'take', 'took'], ['come', 'came', 'make', 'made'], ['write', 'wrote', 'drink', 'drank'], ['give', 'gave', 'know', 'knew']]),
        ex: [['I went to the market yesterday.', 'ذهبتُ إلى السوق أمس.'], ['She bought a new dress.', 'اشترت فستانًا جديدًا.'], ['We saw a good film.', 'شاهدنا فيلمًا جيدًا.']] },
      { t: ['Questions and negatives use did / didn\'t + the BASE verb, the same as regular verbs.', 'الأسئلة والنفي تستخدم did / didn\'t + الفعل الأصلي كما في الأفعال المنتظمة.'],
        ex: [['Did you go to school?', 'هل ذهبتَ إلى المدرسة؟'], ["She didn't eat breakfast.", 'لم تتناول الفطور.']], warn: ["✗ Did you went?   ✓ Did you go?", 'بعد did الفعل أصلي (go).'] }
    ], [
      mc('I ___ to Cairo last year.', ['go', 'went', 'goed'], 'went'), mc('She ___ a letter to her friend.', ['writed', 'wrote', 'write'], 'wrote'), mc('We ___ pizza for dinner.', ['ate', 'eated', 'eat'], 'ate'), mc('He ___ a new car.', ['buyed', 'bought', 'buys'], 'bought'),
      fill('They ____ (come) late yesterday.', 'came', 'جاؤوا متأخرين أمس.'), fill('Did you ____ (see) the film?', 'see', 'هل شاهدتَ الفيلم؟'), ord('I did not have breakfast.', 'لم أتناول الفطور.'), tf('"Did he went?" is correct.', false, '', ['After did we use the base form: Did he go?', 'بعد did نستخدم الفعل الأصلي.'])
    ]),

    L('comparatives', 'A2', '📏', 'Comparatives and superlatives', 'المقارنة والتفضيل', 'compare', [
      { t: ['Short adjectives: + -er than / the + -est. Long adjectives: more … than / the most …. Adjectives ending in -y: y → ier / iest.', 'الصفات القصيرة: er than / the est. والطويلة: more … than / the most. والمنتهية بـ y: ier / iest.'],
        table: mkTable(['Adjective', 'Comparative', 'Superlative'], [['tall', 'taller', 'the tallest'], ['big', 'bigger', 'the biggest'], ['happy', 'happier', 'the happiest'], ['expensive', 'more expensive', 'the most expensive'], ['good', 'better', 'the best'], ['bad', 'worse', 'the worst']]),
        ex: [['My brother is taller than me.', 'أخي أطول مني.'], ['This is the most expensive phone.', 'هذا أغلى هاتف.'], ['Today is better than yesterday.', 'اليوم أفضل من أمس.']] },
      { t: ['Use than after the comparative. Use the before the superlative. as … as means "equal".', 'نستخدم than بعد المقارنة، وthe قبل التفضيل. وas … as للتساوي.'], ex: [['Cairo is bigger than Alexandria.', 'القاهرة أكبر من الإسكندرية.'], ['He is as tall as his father.', 'هو بطول أبيه.']],
        warn: ['✗ more taller / the most tallest   ✓ taller / the tallest', 'لا نجمع more مع er.'] }
    ], [
      mc('A car is ___ than a bicycle.', ['fast', 'faster', 'more fast'], 'faster'), mc('This is the ___ book I know.', ['good', 'better', 'best'], 'best'), mc('Gold is ___ than silver.', ['more expensive', 'expensiver', 'most expensive'], 'more expensive'),
      mc('She is the ___ girl in the class.', ['happier', 'happiest', 'most happy'], 'happiest'), fill('Winter is ____ than summer. (cold)', 'colder', 'الشتاء أبرد من الصيف.'), fill('Mount Everest is the ____ mountain. (high)', 'highest', 'إيفرست أعلى جبل.'),
      ord('My house is bigger than yours.', 'بيتي أكبر من بيتك.'), tf('"more taller" is correct.', false, '', ['Say taller (not more taller).', 'نقول taller.'])
    ]),

    L('quantifiers', 'A2', '🥛', 'some / any / much / many / a lot of', 'مقادير: some / any / much / many', null, [
      { t: ['Countable nouns (apples, books) can be counted: use many, a few. Uncountable nouns (water, rice, money) cannot be counted: use much, a little.', 'المعدود (apples) نستخدم معه many / a few، وغير المعدود (water) نستخدم معه much / a little.'],
        table: mkTable(['', 'Countable', 'Uncountable'], [['+', 'some / a lot of / many', 'some / a lot of'], ['−', 'any / many', 'any / much'], ['?', 'any / how many', 'any / how much']]),
        ex: [['I have some apples.', 'عندي بعض التفاح.'], ["We don't have any milk.", 'ليس عندنا حليب.'], ['How much water do you drink?', 'كم ماءً تشرب؟'], ['How many books are there?', 'كم كتابًا هناك؟']] },
      { t: ['a lot of = much / many in positive sentences. We use some in offers and requests: Would you like some tea?', 'a lot of تعني الكثير في الجمل المثبتة. ونستخدم some في العروض: Would you like some tea?'], ex: [['She has a lot of friends.', 'عندها أصدقاء كثيرون.'], ['Can I have some water?', 'هل يمكنني الحصول على بعض الماء؟']] }
    ], [
      mc('There is ___ milk in the fridge.', ['some', 'many', 'a'], 'some'), mc("We haven't got ___ eggs.", ['any', 'some', 'much'], 'any'), mc('How ___ money have you got?', ['much', 'many', 'few'], 'much'), mc('How ___ students are in the class?', ['much', 'many', 'any'], 'many'),
      mc('I drink ___ water every day. (a large amount)', ['a lot of', 'a few', 'many'], 'a lot of'), fill('Is there ____ rice? (some / any)', 'any', 'هل يوجد أرز؟'), fill('I need ____ help. (some / any)', 'some', 'أحتاج بعض المساعدة.'), ord('How many brothers have you got?', 'كم أخًا عندك؟')
    ]),

    L('future', 'A2', '🔮', 'Future: going to and will', 'المستقبل: going to و will', 'timeline:going to,will', [
      { t: ['going to + verb = plans and intentions, or something we can see will happen. will + verb = quick decisions, promises and predictions.', 'going to للخطط والنوايا ولما نراه سيحدث. will للقرارات اللحظية والوعود والتوقّعات.'],
        ex: [["I'm going to study medicine.", 'سأدرس الطب (خطة).'], ['Look at the clouds! It is going to rain.', 'انظر إلى الغيوم! ستمطر.'], ["I'll help you with your bag.", 'سأساعدك في حقيبتك (قرار لحظي).'], ["I'll call you tomorrow.", 'سأتّصل بك غدًا (وعد).']] },
      { t: ['Negative: aren\'t going to / won\'t. Question: Are you going to …? / Will you …?', 'النفي: aren\'t going to / won\'t. السؤال: Are you going to …? / Will you …?'], ex: [['She is not going to come.', 'هي لن تأتي.'], ["It won't take long.", 'لن يستغرق وقتًا طويلًا.'], ['Will you be at home tonight?', 'هل ستكون في البيت الليلة؟']],
        warn: ['✗ I will to go.   ✓ I will go.', 'بعد will فعل أصلي بلا to.'] }
    ], [
      mc('We ___ visit my uncle next week. (plan)', ['are going to', 'will to', 'go'], 'are going to'), mc('A: The phone is ringing. B: I ___ answer it.', ["'ll", 'am going to', 'will to'], "'ll"), mc('Look at that car! It ___ crash!', ['will', 'is going to', 'going'], 'is going to'),
      mc('I think it ___ be hot tomorrow.', ['will', 'is going', 'are going to'], 'will'), fill('She ____ come tomorrow. (negative of will)', ["won't", 'will not'], 'هي لن تأتي غدًا.', 'wo__\'t'), fill('They ____ going to buy a house.', 'are', 'سيشترون بيتًا.'), ord("I'm going to study tonight.", 'سأدرس الليلة.'), ord('Will you help me, please?', 'هل ستساعدني من فضلك؟')
    ]),

    L('frequency', 'A2', '🔁', 'Adverbs of frequency', 'ظروف التكرار', null, [
      { t: ['always (100%) → usually → often → sometimes → rarely → never (0%). Put them BEFORE the main verb but AFTER am / is / are.', 'always دائمًا · usually عادةً · often غالبًا · sometimes أحيانًا · rarely نادرًا · never أبدًا. تأتي قبل الفعل الرئيسي وبعد am / is / are.'],
        ex: [['I always drink tea in the morning.', 'أشرب الشاي دائمًا في الصباح.'], ['She is never late.', 'هي لا تتأخر أبدًا.'], ['We sometimes eat out.', 'نأكل خارج البيت أحيانًا.']] },
      { t: ['How often …? Answers: every day, once a week, twice a month, three times a year.', 'للسؤال How often …؟ نجيب: every day، once a week (مرّة في الأسبوع)، twice a month (مرتين في الشهر).'], ex: [['How often do you exercise?', 'كم مرة تتمرّن؟'], ['I go to the gym twice a week.', 'أذهب إلى النادي مرتين في الأسبوع.']],
        warn: ["✗ I never don't go.   ✓ I never go.  (never is already negative)", 'never نفي بحدّ ذاته فلا نضيف نفيًا آخر.'] }
    ], [
      mc('He is ___ late. (0%)', ['never', 'always', 'often'], 'never'), mc('I ___ eat breakfast. (100%)', ['always', 'never', 'rarely'], 'always'), mc('She ___ goes to the cinema. (about 50%)', ['sometimes', 'always', 'never'], 'sometimes'),
      mc('How ___ do you visit your grandparents?', ['often', 'much', 'long'], 'often'), ord('I usually get up at six.', 'أستيقظ عادةً في السادسة.'), ord('She is always happy.', 'هي دائمًا سعيدة.'), fill('We go swimming ____ a week. (2 times)', 'twice', 'نذهب للسباحة مرتين في الأسبوع.'), tf('"I never don\'t eat meat" is correct.', false, '', ['never is already negative: I never eat meat.', 'never نفي بذاتها.'])
    ]),

    L('must-should', 'A2', '⚠️', 'must / have to / should', 'الوجوب والنصيحة: must / have to / should', null, [
      { t: ['must / have to = it is necessary (a rule). mustn\'t = it is forbidden. don\'t have to = it is not necessary. should = good advice.', 'must / have to = واجب. mustn\'t = ممنوع. don\'t have to = ليس ضروريًا. should = نصيحة.'],
        table: mkTable(['Phrase', 'Meaning', 'Example'], [['must / have to', 'necessary', 'You must wear a seat belt.'], ["mustn't", 'forbidden', "You mustn't smoke here."], ["don't have to", 'not necessary', "You don't have to pay."], ['should', 'advice', 'You should drink more water.']]),
        ex: [['I have to get up early.', 'عليّ أن أستيقظ مبكرًا.'], ["We mustn't be late.", 'يجب ألّا نتأخّر.'], ["You don't have to come.", 'لا يلزمك أن تأتي.']] },
      { t: ['After must / mustn\'t / should we use the base verb (no to). After have to we use to + verb.', 'بعد must / should فعل أصلي بدون to، وبعد have to نستخدم to + فعل.'], ex: [['She should see a doctor.', 'عليها أن ترى طبيبًا (نصيحة).'], ['He has to work on Saturday.', 'عليه أن يعمل يوم السبت.']],
        warn: ["✗ You must to go.   ✓ You must go.", 'لا to بعد must.'] }
    ], [
      mc('You ___ stop at a red light. (rule)', ['must', 'should to', "don't have"], 'must'), mc('You ___ park here. It\'s forbidden.', ["mustn't", "don't have to", 'should'], "mustn't"), mc('It is Friday. I ___ go to work.', ["don't have to", "mustn't", 'must'], "don't have to"),
      mc('You look tired. You ___ rest.', ['should', 'have', 'mustn\'t'], 'should'), fill('She ____ to study for the exam. (have to)', 'has', 'عليها أن تدرس للامتحان.'), fill("You ____ smoke in the hospital. (forbidden)", "mustn't", 'يُمنع التدخين في المستشفى.'), ord('You should drink more water.', 'ينبغي أن تشرب مزيدًا من الماء.'), ord("We don't have to hurry.", 'لا داعي للعجلة.')
    ]),

    L('adverbs', 'A2', '🐢', 'Adverbs of manner', 'ظروف الحال (الطريقة)', null, [
      { t: ['Adverbs tell us HOW we do something. Add -ly to an adjective: slow → slowly, careful → carefully, quick → quickly. y → ily: happy → happily.', 'الظرف يصف كيف نفعل الشيء. نضيف ly للصفة: slowly. وy تصبح ily: happily.'],
        ex: [['He drives slowly.', 'هو يقود ببطء.'], ['She speaks English very well.', 'هي تتكلم الإنجليزية جيدًا.'], ['They worked hard.', 'عملوا بجدّ.']] },
      { t: ['Irregular: good → well, fast → fast, hard → hard, late → late. Use an adjective after be / look / feel; use an adverb after an action verb.', 'شاذّة: good → well، وfast وhard وlate بلا تغيير. بعد be نستخدم صفة، وبعد الأفعال الحركية نستخدم ظرفًا.'],
        ex: [['She is a good singer. She sings well.', 'هي مغنّية جيدة. تغنّي جيدًا.'], ['The exam was easy.', 'كان الامتحان سهلًا.']], warn: ['✗ She sings good.   ✓ She sings well.  (good = adjective: a good singer)', 'good صفة (a good singer)، وwell ظرف (sings well).'] }
    ], [
      mc('She speaks ___.', ['slow', 'slowly', 'slowlyly'], 'slowly'), mc('He is a ___ driver.', ['careful', 'carefully', 'carefuly'], 'careful'), mc('They play football very ___.', ['good', 'well', 'goodly'], 'well'), mc('The train is ___ . (not slow)', ['fast', 'fastly', 'quickly'], 'fast'),
      fill('He answered the question ____ . (quick)', 'quickly', 'أجاب عن السؤال بسرعة.'), fill('She sings ____ . (good)', 'well', 'هي تغنّي جيدًا.'), ord('Please drive carefully.', 'من فضلك قُد بحذر.'), tf('"She works hardly" means she works a lot.', false, '', ['hardly means almost not. Say: She works hard.', 'hardly تعني «بالكاد». نقول She works hard.'])
    ]),

    L('directions', 'A2', '🧭', 'Directions', 'الاتجاهات والوصف', 'directions', [
      { t: ['To give directions use imperatives: Go straight. Turn left / right. Take the first / second left. Cross the road.', 'نعطي الاتجاهات بصيغة الأمر: Go straight (سِر مباشرة). Turn left / right (انعطف يسارًا / يمينًا). Take the first left (أول منعطف يسار).'],
        ex: [['Go straight and turn left at the bank.', 'سِر مباشرة وانعطف يسارًا عند البنك.'], ['Take the second right.', 'اتّخذ ثاني منعطف يمين.']] },
      { t: ['Describe the place: on the left / on the right, opposite, next to, between, at the corner, near, far from. Prepositions of movement: across, along, past, through.', 'ولوصف المكان: on the left (على اليسار)، opposite (مقابل)، next to (بجانب)، at the corner (عند الزاوية). وحروف الحركة: across (عبر)، along (على طول)، past (بعد/متجاوزًا).'],
        ex: [['The pharmacy is opposite the bank.', 'الصيدلية مقابل البنك.'], ['Walk along the street and go past the park.', 'امشِ على طول الشارع وتجاوز الحديقة.']], warn: ['Excuse me, how can I get to the station?', 'للسؤال بأدب: Excuse me, how can I get to …؟'] }
    ], [
      mc('___ left at the traffic light.', ['Turn', 'Turns', 'Turning'], 'Turn'), mc('The bank is ___ the school. (in front, across the street)', ['opposite', 'under', 'inside'], 'opposite'), mc('Walk ___ the road. (to the other side)', ['across', 'under', 'at'], 'across'),
      mc('"Go straight" means:', ['سِر مباشرة', 'انعطف يمينًا', 'ارجع'], 'سِر مباشرة'), fill('Take the ____ left. (1st)', 'first', 'اتّخذ أول منعطف يسار.'), fill('The shop is ____ the corner. (at / on)', 'at', 'المحلّ عند الزاوية.'), ord('Excuse me, where is the bank?', 'عفوًا، أين البنك؟'), ord('Turn right and go straight.', 'انعطف يمينًا وسِر مباشرة.')
    ]),

    L('object-pronouns', 'A2', '🫱', 'Object and possessive pronouns', 'ضمائر المفعول وضمائر الملكية', null, [
      { t: ['Object pronouns come after verbs and prepositions: me, you, him, her, it, us, them.', 'ضمائر المفعول بعد الأفعال وحروف الجر: me, you, him, her, it, us, them.'],
        table: mkTable(['Subject', 'Object', 'Possessive pronoun'], [['I', 'me', 'mine'], ['you', 'you', 'yours'], ['he', 'him', 'his'], ['she', 'her', 'hers'], ['we', 'us', 'ours'], ['they', 'them', 'theirs']]),
        ex: [['Call me tomorrow.', 'اتّصل بي غدًا.'], ['I love her.', 'أحبّها.'], ['The teacher helps us.', 'المعلّم يساعدنا.']] },
      { t: ['Possessive pronouns replace "possessive adjective + noun": This is my book → This book is mine.', 'ضمائر الملكية تحلّ محلّ «صفة الملكية + الاسم»: This book is mine.'], ex: [['Is this bag yours?', 'هل هذه الحقيبة لك؟'], ['That house is ours.', 'ذلك البيت لنا.']],
        warn: ['✗ He gave to me the book.   ✓ He gave me the book. / He gave the book to me.', 'ترتيب المفعولين: gave me the book.'] }
    ], [
      mc('Ali is my friend. I like ___.', ['he', 'him', 'his'], 'him'), mc('Sara is here. Can you see ___?', ['she', 'her', 'hers'], 'her'), mc('We are late. Wait for ___ .', ['we', 'us', 'ours'], 'us'), mc('Is this pen ___ ? (belongs to you)', ['your', 'yours', 'you'], 'yours'),
      fill('This is my car. It is ____ . (I)', 'mine', 'هذه سيارتي. إنها لي.'), fill('The children are noisy. Tell ____ to be quiet.', 'them', 'الأولاد صاخبون. قل لهم أن يهدؤوا.'), ord('Please give me the book.', 'من فضلك أعطني الكتاب.'), ord('That bag is hers.', 'تلك الحقيبة لها.')
    ])
  );
})();

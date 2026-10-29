/* More graded reading texts (appended to EL.data.reading.texts). Same shape as reading.js. */
(function () {
  'use strict';
  const mc = (q, opts, a, ar) => ({ t: 'mc', q, opts, a, ar });
  const tf = (q, a, ar) => ({ t: 'tf', q, a, ar });
  const fill = (q, a, ar) => ({ t: 'fill', q, a: Array.isArray(a) ? a : [a], ar });
  const X = (id, level, icon, title, sentences, gloss, qs) => ({ id, level, icon, title, sentences, gloss, qs });
  window.EL.data.reading.texts.push(
    X('pet', 'A1', '🐱', ['My cat Luna', 'قطّتي لونا'], [
      ['I have a cat. Her name is Luna.', 'عندي قطّة. اسمها لونا.'], ['She is two years old.', 'عمرها سنتان.'], ['Luna is small and white.', 'لونا صغيرة وبيضاء.'], ['She likes fish and milk.', 'تحب السمك والحليب.'],
      ['She sleeps on my bed at night.', 'تنام على سريري في الليل.'], ['In the morning, she plays with a ball.', 'في الصباح تلعب بكرة.'], ['I love my cat very much.', 'أحب قطّتي كثيرًا.']
    ], { sleeps: 'تنام', plays: 'تلعب' }, [
      mc('How old is Luna?', ['One year old', 'Two years old', 'Three years old'], 'Two years old', 'كم عمر لونا؟'), mc('What colour is Luna?', ['Black', 'White', 'Brown'], 'White', 'ما لون لونا؟'),
      tf('Luna likes fish.', true, 'لونا تحب السمك.'), fill('Luna sleeps on the ____ at night.', ['bed'], 'تنام لونا على … في الليل.')]),
    X('newphone', 'A2', '📱', ['A new phone', 'هاتف جديد'], [
      ['Last week, my old phone stopped working.', 'الأسبوع الماضي توقّف هاتفي القديم عن العمل.'], ['The screen was broken and the battery was very weak.', 'كانت الشاشة مكسورة والبطارية ضعيفة جدًا.'], ['So I went to a shop and looked at many phones.', 'فذهبت إلى محلّ ونظرت إلى هواتف كثيرة.'],
      ['Some phones were very expensive, but I did not have much money.', 'بعض الهواتف كانت غالية جدًا لكن لم يكن معي مال كثير.'], ['The shop assistant showed me a cheaper phone with a good camera.', 'أراني البائع هاتفًا أرخص بكاميرا جيدة.'], ['I paid by card and took it home.', 'دفعتُ بالبطاقة وأخذته إلى البيت.'],
      ['Now I use it every day to call my family and to study English.', 'أستخدمه الآن كل يوم للاتصال بعائلتي ولدراسة الإنجليزية.'], ['I am very happy with my choice.', 'أنا سعيد جدًا باختياري.']
    ], { assistant: 'موظف / بائع', stopped: 'توقّف', choice: 'اختيار' }, [
      mc('What was wrong with the old phone?', ['It was too big', 'The screen was broken', 'It was lost'], 'The screen was broken', 'ما مشكلة الهاتف القديم؟'), mc('Why did he choose the cheaper phone?', ['He did not have much money', 'He liked the colour', 'His friend told him'], 'He did not have much money', 'لماذا اختار الهاتف الأرخص؟'),
      tf('He paid in cash.', false, 'دفع نقدًا.'), mc('What does he use the phone for?', ['Only games', 'Calling family and studying English', 'Only photos'], 'Calling family and studying English', 'لماذا يستخدم الهاتف؟')]),
    X('sleep', 'B1', '😴', ['Why sleep matters', 'لماذا النوم مهم'], [
      ['Many adults need between seven and nine hours of sleep every night.', 'يحتاج كثير من البالغين بين سبع وتسع ساعات من النوم كل ليلة.'], ['However, a lot of people sleep much less because of work, study or their phones.', 'لكن كثيرين ينامون أقل بكثير بسبب العمل أو الدراسة أو هواتفهم.'],
      ['Doctors say that bad sleep can make it harder to concentrate and to remember things.', 'يقول الأطباء إن قلّة النوم قد تجعل التركيز والتذكّر أصعب.'], ['It can also increase stress and affect your health over time.', 'ويمكن أن تزيد التوتّر وتؤثّر في صحتك مع الوقت.'],
      ['To sleep better, try to go to bed at the same time every day.', 'لتنام أفضل حاول أن تنام في الوقت نفسه كل يوم.'], ['Avoid coffee in the evening, and turn off your phone an hour before bed.', 'تجنّب القهوة مساءً وأطفئ هاتفك قبل النوم بساعة.'],
      ['A quiet, dark and cool room also helps.', 'وتساعد أيضًا غرفة هادئة ومظلمة وباردة.'], ['If you still feel tired after a few weeks, it is a good idea to talk to a doctor.', 'وإن بقيتَ متعبًا بعد بضعة أسابيع فمن الجيد أن تستشير طبيبًا.']
    ], { concentrate: 'يركّز', affect: 'يؤثّر في', avoid: 'يتجنّب', stress: 'توتّر' }, [
      mc('How much sleep do many adults need?', ['4–5 hours', '7–9 hours', '10–12 hours'], '7–9 hours', 'كم ساعة نوم يحتاج كثير من البالغين؟'), mc('Which is advice from the text?', ['Drink coffee at night', 'Go to bed at the same time every day', 'Use your phone in bed'], 'Go to bed at the same time every day', 'ما النصيحة الواردة في النص؟'),
      tf('Bad sleep can make it harder to remember things.', true, 'قلّة النوم قد تجعل التذكّر أصعب.'), mc('When should you talk to a doctor?', ['After one bad night', 'If you stay tired after a few weeks', 'Never'], 'If you stay tired after a few weeks', 'متى تستشير الطبيب؟')]),
    X('interview', 'B1', '🧑‍💼', ['A job interview', 'مقابلة عمل'], [
      ['Last Tuesday, Huda had an interview for a job at a large company.', 'يوم الثلاثاء الماضي كان عند هدى مقابلة عمل في شركة كبيرة.'], ['She was nervous, so she prepared carefully the night before.', 'كانت متوتّرة فحضّرت بعناية في الليلة السابقة.'],
      ['She read about the company and practised answers to common questions.', 'قرأت عن الشركة وتدرّبت على الإجابة عن أسئلة شائعة.'], ['She arrived ten minutes early and smiled at everyone she met.', 'وصلت قبل الموعد بعشر دقائق وابتسمت لكل من قابلته.'],
      ['The manager asked her why she wanted the job.', 'سألها المدير لماذا تريد الوظيفة.'], ['Huda explained that she enjoys working with people and wants to learn new skills.', 'شرحت هدى أنها تحب العمل مع الناس وتريد تعلّم مهارات جديدة.'],
      ['At the end, she asked about training opportunities, which impressed the manager.', 'وفي النهاية سألت عن فرص التدريب، وهذا أعجب المدير.'], ['Two days later, the company called her and offered her the job.', 'وبعد يومين اتّصلت بها الشركة وعرضت عليها الوظيفة.']
    ], { nervous: 'متوتّرة', impressed: 'أعجبه / ترك انطباعًا جيدًا', opportunities: 'فرص', prepared: 'حضّرت' }, [
      mc('How did Huda prepare?', ['She did not prepare', 'She read about the company and practised answers', 'She asked a friend to go'], 'She read about the company and practised answers', 'كيف حضّرت هدى؟'), mc('What impressed the manager?', ['Her question about training', 'Her expensive clothes', 'Her late arrival'], 'Her question about training', 'ما الذي أعجب المدير؟'),
      tf('Huda arrived late.', false, 'وصلت هدى متأخّرة.'), fill('The company called her two ____ later.', ['days'], 'اتّصلت بها الشركة بعد يومين.')])
  );
})();

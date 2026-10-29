/* Listening dialogues: lines [speaker, English, Arabic]; read aloud with different voices by the browser (TTS). */
(function () {
  'use strict';
  const mc = (q, opts, a, ar) => ({ t: 'mc', q, opts, a, ar });
  const tf = (q, a, ar) => ({ t: 'tf', q, a, ar });
  const fill = (q, a, ar) => ({ t: 'fill', q, a: Array.isArray(a) ? a : [a], ar });
  const D = (id, level, icon, title, speakers, lines, qs) => ({ id, level, icon, title, speakers, lines, qs });
  const F = (name, av) => ({ g: 'f', name, av }), M = (name, av) => ({ g: 'm', name, av });

  window.EL.data.listening = { dialogues: [
    D('meet', 'A1', '👋', ['Meeting a new friend', 'التعرّف على صديق جديد'], { A: F('Sara', '👩'), B: M('Tom', '👨') }, [
      ['A', "Hi! I'm Sara. What's your name?", 'مرحبًا! أنا سارة. ما اسمك؟'], ['B', 'Hello, Sara. My name is Tom. Nice to meet you.', 'مرحبًا يا سارة. اسمي توم. تشرّفتُ بمعرفتك.'],
      ['A', 'Nice to meet you too. Where are you from?', 'وأنا أيضًا. من أين أنت؟'], ['B', "I'm from Canada. And you?", 'أنا من كندا. وأنتِ؟'],
      ['A', "I'm from Egypt, but I live in Dubai.", 'أنا من مصر لكنني أسكن في دبي.'], ['B', 'Oh, really? What do you do?', 'حقًا؟ ماذا تعملين؟'],
      ['A', "I'm a student. I study English here. What about you?", 'أنا طالبة. أدرس الإنجليزية هنا. وأنت؟'], ['B', "I'm a teacher. I teach maths at a school.", 'أنا معلّم. أدرّس الرياضيات في مدرسة.'], ['A', "That's great!", 'هذا رائع!']
    ], [mc('Where is Tom from?', ['Canada', 'Egypt', 'Dubai'], 'Canada', 'من أين توم؟'), mc('What does Sara do?', ['She is a teacher', 'She is a student', 'She is a doctor'], 'She is a student', 'ماذا تعمل سارة؟'), tf('Tom teaches maths.', true, 'توم يدرّس الرياضيات.'), fill('Sara lives in ____.', ['Dubai'], 'سارة تسكن في …')]),

    D('cafe', 'A1', '☕', ['At the café', 'في المقهى'], { A: M('Waiter', '🧑‍🍳'), B: F('Customer', '👩') }, [
      ['A', 'Good morning. What would you like?', 'صباح الخير. ماذا تريدين؟'], ['B', "Good morning. I'd like a coffee, please.", 'صباح الخير. أريد قهوة من فضلك.'], ['A', 'Anything to eat?', 'هل تريدين شيئًا لتأكليه؟'],
      ['B', 'Yes, a cheese sandwich, please.', 'نعم، شطيرة جبن من فضلك.'], ['A', 'Large or small coffee?', 'قهوة كبيرة أم صغيرة؟'], ['B', 'A large one, please.', 'كبيرة من فضلك.'],
      ['A', "That's six dollars.", 'الحساب ستة دولارات.'], ['B', 'Here you are. Thank you!', 'تفضّل. شكرًا لك!'], ['A', "You're welcome. Enjoy your meal!", 'عفوًا. بالهناء والعافية!']
    ], [mc('What does the customer drink?', ['Tea', 'Coffee', 'Juice'], 'Coffee', 'ماذا تشرب الزبونة؟'), mc('What does she eat?', ['A cheese sandwich', 'A cake', 'A salad'], 'A cheese sandwich', 'ماذا تأكل؟'), fill('It is ____ dollars.', ['six', '6'], 'الحساب … دولارات.'), tf('She wants a small coffee.', false, 'تريد قهوة صغيرة.')]),

    D('time', 'A1', '⏰', ['What time is it?', 'كم الساعة؟'], { A: F('Mina', '👧'), B: M('Ali', '👦') }, [
      ['A', 'Excuse me, what time is it?', 'عفوًا، كم الساعة؟'], ['B', "It's half past three.", 'الساعة الثالثة والنصف.'], ['A', 'Thanks. When does the bus come?', 'شكرًا. متى تأتي الحافلة؟'],
      ['B', 'At four o\'clock.', 'في الرابعة.'], ['A', 'Oh, good. We have thirty minutes.', 'جيد. أمامنا ثلاثون دقيقة.'], ['B', "Let's have a drink at the café.", 'لنشرب شيئًا في المقهى.'], ['A', 'Great idea!', 'فكرة رائعة!']
    ], [mc('What time is it?', ['3:30', '4:00', '3:15'], '3:30', 'كم الساعة؟'), mc('When does the bus come?', ['At four', 'At three', 'At five'], 'At four', 'متى تأتي الحافلة؟'), fill('They have ____ minutes.', ['thirty', '30'], 'عندهما … دقيقة.'), tf('They will go to a café.', true, 'سيذهبان إلى مقهى.')]),

    D('doctor', 'A2', '🩺', ['At the doctor', 'عند الطبيب'], { A: F('Doctor', '👩‍⚕️'), B: M('Patient', '🧑') }, [
      ['A', "Good afternoon. What's the problem?", 'مساء الخير. ما المشكلة؟'], ['B', 'I have a headache and a sore throat.', 'عندي صداع والتهاب في الحلق.'], ['A', 'How long have you had them?', 'منذ متى وأنت تعاني منهما؟'], ['B', 'Since Monday.', 'منذ يوم الاثنين.'],
      ['A', 'Do you have a fever?', 'هل عندك حرارة؟'], ['B', 'Yes, a little.', 'نعم، قليلًا.'], ['A', 'Your temperature is thirty-eight. You should rest and drink a lot of water.', 'حرارتك ثمانٍ وثلاثون. ينبغي أن ترتاح وتشرب ماءً كثيرًا.'],
      ['B', 'Do I need any medicine?', 'هل أحتاج إلى دواء؟'], ['A', 'Take these tablets twice a day, after meals.', 'خذ هذه الأقراص مرتين في اليوم بعد الوجبات.'], ['B', 'Thank you, doctor.', 'شكرًا يا دكتورة.']
    ], [mc('Since when has he had the problem?', ['Since Monday', 'Since yesterday', 'Since last year'], 'Since Monday', 'منذ متى المشكلة؟'), mc('How often should he take the tablets?', ['Once a day', 'Twice a day', 'Three times a day'], 'Twice a day', 'كم مرة يأخذ الأقراص؟'), tf('He has a high fever.', false, 'حرارته مرتفعة جدًا.'), fill('The doctor says he should drink a lot of ____.', ['water'], 'تقول الطبيبة إنه ينبغي أن يشرب كثيرًا من …')]),

    D('hotel', 'A2', '🏨', ['Booking a hotel room', 'حجز غرفة في فندق'], { A: F('Receptionist', '👩‍💼'), B: M('Guest', '🧳') }, [
      ['A', 'Good evening, Palm Hotel. How can I help you?', 'مساء الخير، فندق بالم. كيف أساعدك؟'], ['B', "Hello. I'd like to book a room for two nights, please.", 'مرحبًا. أريد حجز غرفة لليلتين من فضلك.'], ['A', 'Certainly. Single or double?', 'بكل سرور. مفردة أم مزدوجة؟'],
      ['B', 'A double room, please.', 'غرفة مزدوجة من فضلك.'], ['A', 'What date are you arriving?', 'في أي تاريخ ستصل؟'], ['B', 'On the fifth of March.', 'في الخامس من مارس.'],
      ['A', "It's seventy dollars a night, and breakfast is included.", 'السعر سبعون دولارًا لليلة، والفطور مشمول.'], ['B', 'That sounds good. Can I pay by card?', 'هذا جيد. هل يمكنني الدفع بالبطاقة؟'], ['A', 'Yes, of course. May I have your name?', 'نعم بالطبع. هل لي باسمك؟'], ['B', "It's Ahmed Hassan.", 'أحمد حسن.']
    ], [mc('How many nights does he want?', ['One', 'Two', 'Five'], 'Two', 'كم ليلة يريد؟'), mc('How much is the room per night?', ['$50', '$70', '$90'], '$70', 'كم سعر الليلة؟'), tf('Breakfast is included.', true, 'الفطور مشمول.'), fill('He is arriving on the ____ of March.', ['fifth', '5th'], 'سيصل في … من مارس.')]),

    D('plans', 'A2', '🎬', ['Making plans', 'وضع خطة للخروج'], { A: M('Omar', '👨'), B: F('Lina', '👩') }, [
      ['A', 'Hi, Lina. What are you doing on Saturday?', 'مرحبًا يا لينا. ماذا ستفعلين يوم السبت؟'], ['B', 'Nothing special. Why?', 'لا شيء مميز. لماذا؟'], ['A', "There's a new film at the cinema. Do you want to come?", 'يوجد فيلم جديد في السينما. هل تريدين المجيء؟'],
      ['B', 'Sounds fun! What time does it start?', 'يبدو ممتعًا! متى يبدأ؟'], ['A', 'At half past seven. Shall we meet at six for dinner first?', 'في السابعة والنصف. هل نلتقي في السادسة للعشاء أولًا؟'], ['B', "Good idea. Let's meet outside the cinema.", 'فكرة جيدة. لنلتقِ أمام السينما.'], ['A', 'OK, see you on Saturday!', 'حسنًا، أراك يوم السبت!']
    ], [mc('When does the film start?', ['6:00', '7:30', '8:00'], '7:30', 'متى يبدأ الفيلم؟'), mc('When do they meet?', ['At six', 'At seven', 'At nine'], 'At six', 'متى يلتقيان؟'), tf('They will eat dinner before the film.', true, 'سيتعشّيان قبل الفيلم.'), fill('They will meet ____ the cinema.', ['outside'], 'سيلتقيان … السينما.')]),

    D('interview', 'B1', '🧑‍💼', ['A job interview', 'مقابلة عمل'], { A: F('Interviewer', '👩‍💼'), B: M('Candidate', '🧑') }, [
      ['A', 'Thank you for coming. Could you tell me a little about yourself?', 'شكرًا لحضورك. هل يمكنك أن تحدّثني قليلًا عن نفسك؟'], ['B', "Of course. I graduated in business last year, and since then I've been working as an assistant in a small company.", 'بالطبع. تخرّجتُ في إدارة الأعمال العام الماضي ومنذ ذلك الحين أعمل مساعدًا في شركة صغيرة.'],
      ['A', 'What are your main strengths?', 'ما نقاط قوّتك الرئيسية؟'], ['B', "I'm organised and I work well in a team. I also speak three languages.", 'أنا منظّم وأعمل جيدًا ضمن فريق. وأتكلّم أيضًا ثلاث لغات.'], ['A', 'Why do you want this job?', 'لماذا تريد هذه الوظيفة؟'],
      ['B', "Because I'd like to develop my skills in an international company.", 'لأنني أريد تطوير مهاراتي في شركة دولية.'], ['A', 'Where do you see yourself in five years?', 'أين ترى نفسك بعد خمس سنوات؟'], ['B', 'I hope to be a team leader.', 'آمل أن أكون قائد فريق.'], ['A', "Thank you. We'll contact you next week.", 'شكرًا لك. سنتواصل معك الأسبوع القادم.']
    ], [mc('What did the candidate study?', ['Business', 'Medicine', 'Law'], 'Business', 'ماذا درس المرشّح؟'), mc('How many languages does he speak?', ['Two', 'Three', 'Four'], 'Three', 'كم لغة يتكلّم؟'), tf('He wants to work in a small local company.', false, 'يريد العمل في شركة محلية صغيرة.'), fill('In five years he hopes to be a team ____.', ['leader'], 'يأمل أن يكون خلال خمس سنوات … فريق.')]),

    D('return', 'B1', '🛍️', ['Returning an item', 'إرجاع قطعة في المتجر'], { A: M('Assistant', '🧑‍💼'), B: F('Customer', '👩') }, [
      ['B', "Excuse me, I bought this jacket yesterday, but it doesn't fit.", 'عفوًا، اشتريتُ هذه السترة أمس لكنها لا تناسبني.'], ['A', "I'm sorry to hear that. Do you have the receipt?", 'يؤسفني ذلك. هل معك الإيصال؟'], ['B', 'Yes, here it is.', 'نعم، تفضّل.'],
      ['A', 'Would you like to exchange it for a bigger size or get a refund?', 'هل تريدين استبدالها بمقاس أكبر أم استرداد المبلغ؟'], ['B', "I'd prefer a refund, please.", 'أفضّل استرداد المبلغ من فضلك.'], ['A', "No problem. It'll take about five days to appear in your account.", 'لا مشكلة. سيستغرق ظهوره في حسابك نحو خمسة أيام.'], ['B', 'That\'s fine. Thank you for your help.', 'لا بأس. شكرًا لمساعدتك.']
    ], [mc('What is the problem?', ['The jacket does not fit', 'The jacket is expensive', 'The jacket is dirty'], 'The jacket does not fit', 'ما المشكلة؟'), mc('What does the customer want?', ['A refund', 'A bigger size', 'A different colour'], 'A refund', 'ماذا تريد الزبونة؟'), tf('She needs the receipt.', true, 'هي بحاجة إلى الإيصال.'), fill('The refund will take about ____ days.', ['five', '5'], 'سيستغرق الاسترداد نحو … أيام.')]),

    D('holiday', 'B1', '🏖️', ['Talking about holidays', 'الحديث عن العطلات'], { A: F('Nour', '👩'), B: M('Karim', '👨') }, [
      ['A', 'Did you have a good holiday?', 'هل قضيتَ عطلة جيدة؟'], ['B', 'Yes, it was fantastic. We went to Turkey for ten days.', 'نعم، كانت رائعة. ذهبنا إلى تركيا لمدة عشرة أيام.'], ['A', 'Lucky you! What was the weather like?', 'يا لحظّك! كيف كان الطقس؟'],
      ['B', 'It was hot and sunny every day, so we spent most of the time on the beach.', 'كان حارًّا ومشمسًا كل يوم، لذا قضينا معظم الوقت على الشاطئ.'], ['A', 'Did you try the local food?', 'هل جرّبتم الطعام المحلي؟'], ['B', 'Of course! The kebabs were delicious. If I could, I would go back next summer.', 'بالطبع! كان الكباب لذيذًا. لو استطعتُ لعدتُ الصيف القادم.'], ['A', "I'd love to go there one day.", 'أتمنى أن أذهب إلى هناك يومًا ما.']
    ], [mc('Where did Karim go?', ['Turkey', 'Italy', 'Spain'], 'Turkey', 'أين ذهب كريم؟'), mc('What was the weather like?', ['Hot and sunny', 'Cold and rainy', 'Windy'], 'Hot and sunny', 'كيف كان الطقس؟'), tf('Karim did not like the food.', false, 'لم يعجب كريمًا الطعام.'), fill('They stayed there for ____ days.', ['ten', '10'], 'بقوا هناك … أيام.')])
  ],
  dictation: {
    A1: ['I am a student.', 'She has two brothers.', 'The cat is on the sofa.', 'We eat breakfast at seven.', 'Open the window, please.', 'He likes tea with sugar.', 'My phone is in my bag.', 'Where is the bank?'],
    A2: ['Yesterday I went to the market with my mother.', 'She is cooking dinner for her family.', 'It was cold, so we stayed at home.', 'He is taller than his brother.', 'I am going to visit my grandparents on Friday.', 'You should drink more water.', 'Turn left at the traffic light.', 'Did you see the film last night?'],
    B1: ['If it rains tomorrow, we will cancel the trip.', 'I have lived in this city for five years.', 'The report was finished before the deadline.', 'She said that she would call me later.', 'Although it was expensive, we bought it.', 'He used to play football every weekend.', 'The man who lives next door is a doctor.', 'I am interested in learning another language.']
  } };
})();

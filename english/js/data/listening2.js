/* More listening dialogues (appended to EL.data.listening.dialogues). Same shape as listening.js. */
(function () {
  'use strict';
  const mc = (q, opts, a, ar) => ({ t: 'mc', q, opts, a, ar });
  const tf = (q, a, ar) => ({ t: 'tf', q, a, ar });
  const fill = (q, a, ar) => ({ t: 'fill', q, a: Array.isArray(a) ? a : [a], ar });
  const D = (id, level, icon, title, speakers, lines, qs) => ({ id, level, icon, title, speakers, lines, qs });
  const F = (name, av) => ({ g: 'f', name, av }), M = (name, av) => ({ g: 'm', name, av });
  window.EL.data.listening.dialogues.push(
    D('shop', 'A1', '👕', ['Buying a shirt', 'شراء قميص'], { A: F('Assistant', '👩‍💼'), B: M('Customer', '🧑') }, [
      ['A', 'Hello. Can I help you?', 'مرحبًا. هل أستطيع مساعدتك؟'], ['B', 'Yes, please. I want a blue shirt.', 'نعم من فضلك. أريد قميصًا أزرق.'], ['A', 'What size are you?', 'ما مقاسك؟'], ['B', 'I am medium.', 'أنا متوسّط.'],
      ['A', 'Here you are. This one is twenty dollars.', 'تفضّل. هذا بعشرين دولارًا.'], ['B', 'Can I try it on?', 'هل أستطيع تجربته؟'], ['A', 'Of course. The changing room is over there.', 'بالطبع. غرفة القياس هناك.'], ['B', 'It fits well. I will take it.', 'مقاسه مناسب. سآخذه.']
    ], [mc('What colour is the shirt?', ['Red', 'Blue', 'White'], 'Blue', 'ما لون القميص؟'), mc('What size is the customer?', ['Small', 'Medium', 'Large'], 'Medium', 'ما مقاس الزبون؟'), fill('The shirt is ____ dollars.', ['twenty', '20'], 'سعر القميص … دولارًا.'), tf('The customer does not buy the shirt.', false, 'الزبون لا يشتري القميص.')]),
    D('directions', 'A2', '🧭', ['Asking for directions', 'السؤال عن الاتجاهات'], { A: M('Tourist', '🧳'), B: F('Local', '👩') }, [
      ['A', 'Excuse me. Is there a pharmacy near here?', 'عفوًا. هل توجد صيدلية قريبة من هنا؟'], ['B', 'Yes. Go straight on and turn left at the traffic lights.', 'نعم. امشِ للأمام ثم انعطف يسارًا عند إشارة المرور.'], ['A', 'Is it far?', 'هل هي بعيدة؟'],
      ['B', 'No, it is about five minutes on foot.', 'لا، تبعد حوالي خمس دقائق مشيًا.'], ['A', 'Which side of the street is it on?', 'على أي جانب من الشارع هي؟'], ['B', 'It is on the right, next to the bank.', 'على اليمين بجانب البنك.'], ['A', 'Thank you very much.', 'شكرًا جزيلًا.'], ['B', "You're welcome. Have a nice day!", 'عفوًا. أتمنى لك يومًا سعيدًا!']
    ], [mc('Where does he turn?', ['Right at the bank', 'Left at the traffic lights', 'Left at the bank'], 'Left at the traffic lights', 'أين ينعطف؟'), mc('How far is the pharmacy?', ['About five minutes on foot', 'About an hour', 'Next door'], 'About five minutes on foot', 'كم تبعد الصيدلية؟'), mc('What is next to the pharmacy?', ['A bank', 'A school', 'A park'], 'A bank', 'ما الذي بجانب الصيدلية؟'), tf('The pharmacy is on the left side.', false, 'الصيدلية على الجانب الأيسر.')]),
    D('complaint', 'B1', '😤', ['A problem with an order', 'مشكلة في طلب'], { A: F('Agent', '🧑‍💻'), B: M('Customer', '👨') }, [
      ['B', 'Hello. I ordered a laptop two weeks ago, but it has not arrived.', 'مرحبًا. طلبتُ حاسوبًا محمولًا قبل أسبوعين ولم يصل.'], ['A', "I'm sorry about that. Could I have your order number, please?", 'أعتذر عن ذلك. هل لي برقم الطلب من فضلك؟'], ['B', "It's 7-3-9-1-0.", 'إنه 7-3-9-1-0.'],
      ['A', 'Thank you. I can see the problem. The package was sent to the wrong address.', 'شكرًا. أرى المشكلة. أُرسلت الطرد إلى عنوان خاطئ.'], ['B', 'That is very disappointing. What can you do?', 'هذا مخيّب جدًا. ماذا تستطيعون أن تفعلوا؟'],
      ['A', 'We can send a new laptop today, and you will get it within two days.', 'نستطيع إرسال حاسوب جديد اليوم وسيصلك خلال يومين.'], ['B', 'Will I pay anything extra?', 'هل سأدفع شيئًا إضافيًا؟'], ['A', 'No, delivery is free, and we will give you a ten per cent discount on your next order.', 'لا، التوصيل مجاني وسنمنحك خصمًا عشرة بالمئة على طلبك القادم.'], ['B', 'That sounds fair. Thank you for your help.', 'يبدو عادلًا. شكرًا لمساعدتك.']
    ], [mc('What is the problem?', ['The laptop is broken', 'The package went to the wrong address', 'The price is too high'], 'The package went to the wrong address', 'ما المشكلة؟'), mc('When will the new laptop arrive?', ['Within two days', 'Next month', 'Today'], 'Within two days', 'متى سيصل الحاسوب الجديد؟'), tf('The customer must pay for delivery.', false, 'على الزبون أن يدفع ثمن التوصيل.'), mc('What extra offer does the agent make?', ['A free phone', 'A ten per cent discount', 'Nothing'], 'A ten per cent discount', 'ما العرض الإضافي؟')])
  );
})();

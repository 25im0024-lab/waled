/* Pronunciation: sounds that are often hard for Arabic speakers (tendencies — they vary by dialect and person),
   minimal pairs for listening, word stress, -ed / -s endings, silent letters, and read-aloud sentences. */
(function () {
  'use strict';
  const cards = [
    { id: 'pb', sym: 'p / b', icon: '👄', en: '/p/ vs /b/', ar: 'صوت P مقابل B',
      note: ['Many Arabic dialects have no /p/, so "park" can sound like "bark". Put your lips together and release a small puff of air for /p/ — hold a tissue in front of your mouth: it should move.', 'كثير من اللهجات العربية ليس فيها صوت /p/ فيُنطق park كأنه bark. أطبق الشفتين ثم أطلق نفَسًا خفيفًا مع /p/ — ضع ورقة أمام فمك: يجب أن تتحرك.'],
      words: [['park', 'bark'], ['pan', 'ban'], ['pill', 'bill'], ['cap', 'cab'], ['pest', 'best'], ['pig', 'big']] },
    { id: 'vf', sym: 'v / f', icon: '🦷', en: '/v/ vs /f/', ar: 'صوت V مقابل F',
      note: ['For /v/ and /f/ the top teeth touch the bottom lip. /v/ uses the voice (feel the buzz in your throat), /f/ is only air.', 'مع /v/ و/f/ تلمس الأسنان العليا الشفة السفلى. /v/ مجهور (تحسّ بالاهتزاز في الحلق) و/f/ هواء فقط.'],
      words: [['very', 'ferry'], ['vine', 'fine'], ['veal', 'feel'], ['vast', 'fast'], ['van', 'fan'], ['save', 'safe']] },
    { id: 'th', sym: 'θ / ð', icon: '👅', en: '"th" sounds', ar: 'صوتا th',
      note: ['Put the tip of your tongue between your teeth. /θ/ (think, three) is air only; /ð/ (this, that) has voice. Do not replace them with /s/, /t/ or /z/, /d/.', 'ضع طرف اللسان بين الأسنان. /θ/ (think, three) هواء فقط، و/ð/ (this, that) مجهور. لا تستبدلهما بـ s أو t أو z أو d.'],
      words: [['think', 'sink'], ['three', 'free'], ['thank', 'sank'], ['thin', 'tin'], ['then', 'den'], ['breathe', 'breeze']] },
    { id: 'vowel', sym: 'ɪ / iː', icon: '🔤', en: 'Short vs long vowels', ar: 'الصوائت القصيرة والطويلة',
      note: ['English changes meaning with vowel length and quality: ship ≠ sheep, bit ≠ beat. Make the long vowel longer and tighter, the short one quick and relaxed.', 'في الإنجليزية يتغيّر المعنى بتغيّر طول الصائت ونوعه: ship ≠ sheep. اجعل الطويل أطول وأشدّ والقصير سريعًا ومسترخيًا.'],
      words: [['ship', 'sheep'], ['bit', 'beat'], ['live', 'leave'], ['sit', 'seat'], ['full', 'fool'], ['pull', 'pool']] },
    { id: 'rl', sym: 'r / l', icon: '🌀', en: '/r/ vs /l/', ar: 'صوت R مقابل L',
      note: ['English /r/ is not rolled: curl the tongue back without touching the roof of the mouth. For /l/ the tongue tip touches behind the top teeth.', 'حرف /r/ الإنجليزي ليس مكرّرًا (ليس كراء العربية): قوّس اللسان للخلف دون لمس سقف الفم. أما /l/ فيلمس طرف اللسان خلف الأسنان العليا.'],
      words: [['right', 'light'], ['red', 'led'], ['rock', 'lock'], ['road', 'load'], ['rice', 'lice'], ['fly', 'fry']] },
    { id: 'ng', sym: 'ŋ', icon: '🔔', en: '"ng" at the end', ar: 'نهاية ng',
      note: ['In "sing" the sound is one nasal sound /ŋ/ — do not add a hard /g/ after it and do not replace it with /n/.', 'في كلمة sing صوت أنفي واحد /ŋ/ — لا تضف /g/ قاسية بعده ولا تستبدله بـ /n/.'],
      words: [['sing', 'sin'], ['thing', 'thin'], ['king', 'kin'], ['rang', 'ran'], ['wing', 'win'], ['sung', 'sun']] }
  ];

  /* word stress: [word, syllables split with "-", index of the stressed syllable] */
  const stress = [
    ['photograph', 'pho-to-graph', 0], ['photographer', 'pho-tog-ra-pher', 1], ['computer', 'com-pu-ter', 1], ['banana', 'ba-na-na', 1], ['together', 'to-ge-ther', 1],
    ['important', 'im-por-tant', 1], ['engineer', 'en-gi-neer', 2], ['manager', 'man-a-ger', 0], ['education', 'ed-u-ca-tion', 2], ['information', 'in-for-ma-tion', 2],
    ['hotel', 'ho-tel', 1], ['teacher', 'tea-cher', 0], ['police', 'po-lice', 1], ['interview', 'in-ter-view', 0], ['reception', 're-cep-tion', 1], ['opinion', 'o-pin-ion', 1],
    ['available', 'a-vail-a-ble', 1], ['decision', 'de-ci-sion', 1], ['company', 'com-pa-ny', 0], ['agree', 'a-gree', 1]
  ];

  /* -ed endings and -s endings: [word, ending sound] */
  const ed = [['worked', 't'], ['watched', 't'], ['helped', 't'], ['stopped', 't'], ['played', 'd'], ['cleaned', 'd'], ['lived', 'd'], ['opened', 'd'], ['wanted', 'ɪd'], ['needed', 'ɪd'], ['decided', 'ɪd'], ['visited', 'ɪd']];
  const plural = [['books', 's'], ['cats', 's'], ['maps', 's'], ['days', 'z'], ['dogs', 'z'], ['pens', 'z'], ['buses', 'ɪz'], ['watches', 'ɪz'], ['boxes', 'ɪz'], ['languages', 'ɪz']];

  /* silent letters: [word, silent letter, Arabic hint] */
  const silent = [['knife', 'k', 'السكين'], ['write', 'w', 'يكتب'], ['listen', 't', 'يستمع'], ['hour', 'h', 'ساعة'], ['honest', 'h', 'أمين'], ['island', 's', 'جزيرة'], ['climb', 'b', 'يتسلّق'], ['know', 'k', 'يعرف'], ['Wednesday', 'd', 'الأربعاء'], ['comb', 'b', 'مشط']];

  /* read-aloud sentences that practise the sounds above */
  const sentences = {
    A1: ['The big black bag is on the bed.', 'I have five very good friends.', 'Please give me three cups of tea.', 'My brother is a doctor.', 'I like to sing in the morning.'],
    A2: ['Thank you for the lovely present.', 'We visited the park on Friday.', 'The weather is better than yesterday.', 'I will bring a little rice and some fresh fruit.', 'They were working in the garden.'],
    B1: ['Although the project was very difficult, we finished it on time.', 'I think we should discuss the problem with the manager.', 'Thousands of people travel through the airport every week.', 'It is important to listen carefully and ask questions.', 'She thought about the decision for three weeks.']
  };
  window.EL.data.sounds = { cards, stress, ed, plural, silent, sentences };
})();

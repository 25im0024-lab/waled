/* Listening — original scripts written for practice; audio is produced by the browser's speech synthesis (TTS). */
(function () {
  const A = (s, t) => ({ s, t });

  /* ----- Section 2 map (park plan) ----- */
  function parkMap() {
    const L = (k, x, y) => `<g><circle cx="${x}" cy="${y}" r="13" fill="#f3f7f5" stroke="#06110f" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#06110f">${k}</text></g>`;
    return `<figure class="chartbox"><div class="ctitle">Riverside Country Park</div>
    <svg viewBox="0 0 520 370" role="img" aria-label="Plan of Riverside Country Park with locations labelled A to H">
      <rect width="520" height="370" fill="#0e2a21" stroke="var(--line)"/>
      <ellipse cx="270" cy="150" rx="120" ry="65" fill="#2f6c8f"/><text x="270" y="154" text-anchor="middle" font-size="13" fill="#fff">Lake</text>
      <path d="M385 70 q50 -10 80 30 q15 40 -10 70 q-30 15 -50 -10 q-25 -40 -20 -90Z" fill="#2f7a4f" opacity=".55"/><text x="455" y="150" text-anchor="middle" font-size="11" fill="#cfe8dc">Wetland</text>
      <g fill="none" stroke="#8fa39b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M260 332 V282 M260 282 H110 V90 M260 282 H430 V100 M110 90 H270 M270 40 V90 M110 220 H150 M430 230 H390 M260 282 V236 M180 300 H260 M260 300 H360 M110 90 V40 H270 M270 40 H430 V100"/>
      </g>
      <rect x="215" y="270" width="90" height="30" rx="3" fill="#3f7a6b"/><text x="260" y="289" text-anchor="middle" font-size="11" fill="#fff">Visitor centre</text>
      <path d="M248 346 H272" stroke="var(--ink)" stroke-width="3"/><text x="260" y="362" text-anchor="middle" font-size="12" fill="var(--ink)">ENTRANCE</text>
      <g transform="translate(40 40)"><path d="M0 -16 L6 6 L0 1 L-6 6Z" fill="var(--ink)"/><text y="20" text-anchor="middle" font-size="11" fill="var(--ink)">N</text></g>
      ${L('A', 110, 90)}${L('B', 110, 220)}${L('C', 430, 100)}${L('D', 430, 230)}${L('E', 270, 40)}${L('F', 180, 310)}${L('G', 360, 310)}${L('H', 270, 238)}
    </svg></figure>`;
  }
  const LETTERS = 'ABCDEFGH'.split('').map(k => ({ k, t: '' }));

  const L1 = {
    id: 'L1', title: 'Listening — Practice Test 1', checkSeconds: 30,
    parts: [
      {
        id: 's1', title: 'Section 1',
        context: 'Section 1. You will hear a telephone conversation between a man who wants to join an evening class and a receptionist at a community centre.',
        speakers: { A: { g: 'f' }, B: { g: 'm' } },
        script: [
          A('A', 'Good morning, Greenfield Community Centre. How can I help you?'),
          A('B', 'Hello. I\'m calling about the evening classes that start next month. I saw a leaflet in the library.'),
          A('A', 'Of course. Are you interested in a particular subject?'),
          A('B', 'I was thinking about yoga, actually.'),
          A('A', 'I\'m afraid the yoga classes are full at the moment, but there\'s a waiting list. Would you like to be added to it?'),
          A('B', 'Maybe. What else do you have?'),
          A('A', 'We have pottery, creative writing, Spanish for beginners and digital photography.'),
          A('B', 'Photography sounds interesting. I\'ve just bought a new camera, and I don\'t really know how to use it properly.'),
          A('A', 'Then it\'s perfect for you. The class is taught by a professional photographer.'),
          A('B', 'Great. When does it take place?'),
          A('A', 'It runs on Wednesday evenings. Oh, no, sorry, I\'m looking at last term\'s timetable. It\'s moved to Thursdays.'),
          A('B', 'And what time does it start? Seven would suit me, because I finish work at six.'),
          A('A', 'It starts at half past seven, I\'m afraid, and finishes at nine thirty.'),
          A('B', 'That\'s fine. How long is the course?'),
          A('A', 'It lasts eight weeks, and the first lesson is on the fourth of October.'),
          A('B', 'And how much does it cost?'),
          A('A', 'The full price is ninety-six pounds. Are you a student or on a low income?'),
          A('B', 'I\'m a student at the university.'),
          A('A', 'Then you qualify for the concession rate, which is seventy-two pounds.'),
          A('B', 'That\'s good to know.'),
          A('A', 'Right, let me take your details. What\'s your name, please?'),
          A('B', 'Daniel Whitcombe.'),
          A('A', 'Could you spell your surname for me?'),
          A('B', 'Yes. It\'s W, H, I, T, C, O, M, B, E.'),
          A('A', 'Thank you. And a contact number?'),
          A('B', 'It\'s oh seven seven oh oh, nine four five, three one six.'),
          A('A', 'Let me check that. Oh seven seven oh oh, nine four five, three one six. Is that right?'),
          A('B', 'Yes, that\'s right. Do I need to bring anything with me?'),
          A('A', 'Just your camera, and a spare memory card, please. We provide tripods, but not cameras.'),
          A('B', 'And where is the class held?'),
          A('A', 'Last term it was in room four, but it\'s now in room fourteen, on the first floor of the Arts Building.'),
          A('B', 'Room fourteen, Arts Building. Thank you very much for your help.'),
          A('A', 'You\'re welcome. We look forward to seeing you in October.')
        ],
        groups: [{
          type: 'complete', limit: 'ONE WORD AND/OR A NUMBER', title: 'Evening class enquiry form', instruction: 'Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.', items: [
            { q: 'Surname: ____', a: ['Whitcombe'], ev: 'تهجئة الاسم: W-H-I-T-C-O-M-B-E.' },
            { q: 'Telephone: 07700 ____', a: ['945316'], ev: 'الرقم: nine four five, three one six.' },
            { q: 'Class: digital ____', a: ['photography'], ev: 'اليوغا ممتلئة فاختار التصوير.' },
            { q: 'Day: ____', a: ['Thursday', 'Thursdays'], ev: 'تصحيح ذاتي: Wednesday → "It\'s moved to Thursdays".' },
            { q: 'Start time: ____', a: ['7.30', '7:30', '730', '19:30', '7.30pm', '7:30pm'], ev: 'أراد السابعة لكنها قالت "half past seven".' },
            { q: 'Length of course: ____ weeks', a: ['8', 'eight'], ev: '"It lasts eight weeks".' },
            { q: 'Concession fee: £ ____', a: ['72', 'seventy-two', 'seventy two'], ev: 'السعر الكامل 96 لكنه طالب → 72.' },
            { q: 'Bring a camera and a spare ____', a: ['memory card', 'memory cards'], ev: '"a spare memory card".' },
            { q: 'Room: ____', a: ['14', 'fourteen'], ev: 'الغرفة السابقة 4 (مشتّت) والحالية 14.' },
            { q: 'Building: ____ Building', a: ['Arts', 'arts'], ev: '"on the first floor of the Arts Building".' }
          ]
        }]
      },
      {
        id: 's2', title: 'Section 2',
        context: 'Section 2. You will hear a park ranger giving a welcome talk to visitors at Riverside Country Park.',
        speakers: { A: { g: 'f' } },
        script: [
          A('A', 'Good morning, everyone, and welcome to Riverside Country Park. My name\'s Janet, and I\'m one of the rangers. Before you set off, I\'d like to tell you a little about the park and how to find your way around.'),
          A('A', 'Many visitors assume the land was once farmland. In fact, for about thirty years it was used as a rubbish tip, until the council closed it and began turning it into a park. Today it covers around two hundred hectares.'),
          A('A', 'There\'s plenty of wildlife. Our wildflower meadows are at their best in June, and bats roost under the old railway bridge, but what really makes the park special is the wetland, which attracts more than a hundred species of bird.'),
          A('A', 'Please stay on the boardwalk in the wetland. It isn\'t that the mud is dangerous. It\'s that many birds nest on the ground and are easily disturbed.'),
          A('A', 'Now a few practical points. The café is open every day in summer, but from November to March it opens at weekends only. Dogs are welcome, but please keep them on a lead near the lake, where the swans are nesting at this time of year.'),
          { pause: 1200 },
          A('A', 'Now let me describe the layout. Look at the map. You\'re standing at the visitor centre, and as you leave, you\'ll be facing the lake.'),
          A('A', 'Just along the path to your right, there\'s the café, marked G. If you walk straight ahead, to the near shore of the lake, you\'ll find the boat hire, which is H. Please remember that life jackets are compulsory.'),
          A('A', 'Now, if you take the path round to the left, to the west side of the lake, you\'ll come to the play area, B. It\'s very popular with families, so it can be noisy at weekends. A little further on, in the north-west corner, are the toilets, A.'),
          A('A', 'On the opposite side of the park, to the east, you can hire bicycles at D. The path then continues north, round to the far corner of the lake, where you\'ll find the bird hide, C. It overlooks the wetland, and it\'s the best place to watch the birds early in the morning.'),
          A('A', 'At the very top of the park, north of the lake, there\'s the picnic area, E, with tables under the trees. Finally, the car park, F, is to the left of the entrance, so you may want to remember that for when you come back.'),
          A('A', 'Is everyone clear? Right. If you have any questions, please ask. Otherwise, enjoy your visit.')
        ],
        groups: [
          {
            type: 'mcq', title: 'Riverside Country Park', items: [
              { q: 'Before it became a park, the land was', opts: ['a private garden.', 'a rubbish tip.', 'farmland.'], a: 'B', ev: '"for about thirty years it was used as a rubbish tip". الزوّار يظنونها مزرعة (مشتّت).' },
              { q: 'What does the ranger say makes the park special?', opts: ['the wetland birds', 'the wildflower meadows', 'the bats'], a: 'A', ev: '"what really makes the park special is the wetland, which attracts more than a hundred species of bird".' },
              { q: 'Visitors should stay on the boardwalk in the wetland because', opts: ['the mud is dangerous.', 'birds nesting on the ground are easily disturbed.', 'some plants are protected.'], a: 'B', ev: '"It isn\'t that the mud is dangerous... many birds nest on the ground".' },
              { q: 'The café is open', opts: ['every day all year.', 'at weekends only from November to March.', 'every day except Mondays.'], a: 'B', ev: '"from November to March it opens at weekends only".' },
              { q: 'Dogs', opts: ['are welcome everywhere without restrictions.', 'must be kept on a lead near the lake.', 'are only allowed on weekdays.'], a: 'B', ev: '"keep them on a lead near the lake".' }
            ]
          },
          {
            type: 'map', figure: parkMap(), bank: LETTERS, instruction: 'Label the map below. Write the correct letter, A–H, next to each place.', items: [
              { q: 'Café', a: 'G', ev: '"Just along the path to your right, there\'s the café, marked G".' },
              { q: 'Boat hire', a: 'H', ev: '"straight ahead, to the near shore of the lake... boat hire, which is H".' },
              { q: 'Play area', a: 'B', ev: '"west side of the lake... the play area, B".' },
              { q: 'Bird hide', a: 'C', ev: '"round to the far corner of the lake... the bird hide, C".' },
              { q: 'Picnic area', a: 'E', ev: '"north of the lake, there\'s the picnic area, E".' }
            ]
          }
        ]
      },
      {
        id: 's3', title: 'Section 3',
        context: 'Section 3. You will hear two students, Priya and Marcus, discussing a river pollution project with their tutor, Dr Hughes.',
        speakers: { T: { g: 'm', pitch: .85 }, P: { g: 'f' }, M: { g: 'm', pitch: 1.1 } },
        script: [
          A('T', 'Come in, both of you. So, how is the river project going?'),
          A('P', 'Quite well, thank you, Dr Hughes. We wanted to talk to you about our methods before we write the report.'),
          A('M', 'Yes, mainly about the samples.'),
          A('T', 'Fine. Remind me why you chose microplastics in the first place?'),
          A('M', 'Well, I\'d read a newspaper article about plastic in the oceans, and that was the spark, I suppose.'),
          A('P', 'But the main reason we kept going was that the river runs right through the city, so it\'s a problem on our doorstep. Nobody had measured it locally.'),
          A('T', 'Good. That makes the work relevant. And the sampling?'),
          A('P', 'We collected water from four points along the river, over two weekends.'),
          A('M', 'We had a problem with the first batch, though. We used ordinary plastic bottles, and then Elena realised that we might have been adding fibres ourselves.'),
          A('T', 'Yes, contamination is a classic issue. Did you repeat them?'),
          A('P', 'We did, with glass jars.'),
          A('T', 'Excellent. Now, you were thinking of adding more sampling sites, I believe.'),
          A('M', 'We were. Maybe six instead of four.'),
          A('T', 'I wouldn\'t. You have limited time, and it won\'t change your conclusions much. A better use of your time would be to repeat the measurements at different times, or at least after heavy rain, because levels can change a lot.'),
          A('P', 'That makes sense. We could do one more round next week, after the forecast storm.'),
          A('T', 'Good. Now, who is doing what for the write-up?'),
          A('P', 'I\'ll analyse the data, since I did the statistics module last year.'),
          A('M', 'And I\'ll contact the council, because they hold records about drain discharge. I\'ve already emailed them.'),
          A('P', 'Elena will do the sampling next week, since she lives next to the river.'),
          A('M', 'And Tom has volunteered to design the poster. I\'d said I would do it, but he\'s much better at it.'),
          A('P', 'We\'ll all rehearse the presentation together on Friday.'),
          A('T', 'Sounds sensible. What about the presentation itself?'),
          A('M', 'I thought we might include a short video of the sampling.'),
          A('P', 'But we only have fifteen minutes in total, and a video would take up too much of that.'),
          A('T', 'I agree with Priya. Keep to ten slides at the most, and use one clear diagram instead.'),
          A('M', 'All right. Ten slides, then.'),
          A('T', 'Finally, I\'ve read your draft report. The writing is clear, the graphs are easy to follow, and your references are all there. My main concern is the conclusion. You say the river is "heavily polluted", but your data only show concentrations at four points. You need to be more careful about what you can actually claim.'),
          A('P', 'So we should say what the data suggest, rather than state it as fact.'),
          A('T', 'Exactly.'),
          A('M', 'We\'ll rewrite it.'),
          A('T', 'Good. Come and see me again after the next round of samples.')
        ],
        groups: [
          {
            type: 'mcq', title: 'River pollution project', items: [
              { q: 'What was the main reason the students chose microplastics?', opts: ['Their tutor recommended it.', 'They had read a newspaper article.', 'It is a local problem.'], a: 'C', ev: 'ماركوس ذكر المقال (مشتّت)، لكن بريا قالت السبب الرئيسي: "a problem on our doorstep".' },
              { q: 'What went wrong with the first set of samples?', opts: ['They were contaminated.', 'There were too few of them.', 'They were collected on the wrong day.'], a: 'A', ev: '"we might have been adding fibres ourselves" ← التلوث من الزجاجات.' },
              { q: 'Dr Hughes advises the students to', opts: ['add more sampling sites.', 'use a different filter.', 'repeat the measurements at different times.'], a: 'C', ev: '"A better use of your time would be to repeat the measurements at different times".' },
              { q: 'What do the students decide about the presentation?', opts: ['to include a short video.', 'to use no more than ten slides.', 'to give a live demonstration.'], a: 'B', ev: 'الفيديو رُفض؛ المشرف: "ten slides at the most" ووافق ماركوس.' },
              { q: 'What is Dr Hughes\'s main concern about the draft report?', opts: ['The references are incomplete.', 'The conclusion claims more than the data show.', 'The graphs are difficult to read.'], a: 'B', ev: 'A و C خاطئتان صراحةً؛ المشكلة في الخلاصة.' }
            ]
          },
          {
            type: 'match', instruction: 'What task will each person do? Choose FIVE answers from the box and write the correct letter, A–F, next to Questions 26–30.',
            bank: [{ k: 'A', t: 'collecting water samples' }, { k: 'B', t: 'analysing the data' }, { k: 'C', t: 'designing the poster' }, { k: 'D', t: 'writing the introduction' }, { k: 'E', t: 'contacting the local council' }, { k: 'F', t: 'rehearsing the presentation' }], bankTitle: 'Tasks',
            items: [
              { q: 'Priya', a: 'B', ev: '"I\'ll analyse the data".' }, { q: 'Marcus', a: 'E', ev: '"I\'ll contact the council".' }, { q: 'Elena', a: 'A', ev: '"Elena will do the sampling next week".' },
              { q: 'Tom', a: 'C', ev: 'ماركوس كان سيصمّم الملصق لكن توم تطوّع.' }, { q: 'All four students', a: 'F', ev: '"We\'ll all rehearse the presentation together".' }
            ]
          }
        ]
      },
      {
        id: 's4', title: 'Section 4',
        context: 'Section 4. You will hear a university lecturer talking about an approach to managing heavy rain in cities.',
        speakers: { A: { g: 'm', pitch: .9 } },
        script: [
          A('A', 'Today I\'d like to talk about an idea that is changing the way some cities deal with heavy rain: the sponge city.'),
          A('A', 'Let\'s start with the problem. In a traditional city, most of the ground is covered with hard surfaces such as concrete and asphalt. Rain cannot soak into the ground, so it runs off very quickly into the drains. During a major storm the drains simply cannot cope, and streets flood.'),
          A('A', 'The term "sponge city" became well known in China during the two thousand and tens, when the government launched a programme to redesign a number of cities, although many of the techniques had been used elsewhere for much longer. The basic idea is simple: instead of getting rid of rainwater as fast as possible, a sponge city tries to absorb it, store it and reuse it where it falls.'),
          A('A', 'So what techniques are involved? First, permeable pavements, which are made of porous materials, so that water can pass through them into the ground below. Second, rain gardens. These are shallow planted areas beside roads and car parks, which collect water running off the surface. Third, restored wetlands, which can store enormous volumes of water and release it slowly. Some cities have also built artificial lakes, but these are expensive and take up valuable land.'),
          A('A', 'What are the benefits? The most obvious is a lower risk of flooding after storms. But there are other advantages. Plants and water help to lower temperatures in summer, so cities tend to be less hot. And in one pilot scheme, in a single district, the peak flow of water into the drains was cut by around thirty per cent. That is not a huge fall, but it is significant.'),
          A('A', 'There are also problems. The systems need regular cleaning. If leaves and rubbish block the permeable surfaces, they stop working. Another difficulty is cost, particularly in older districts, where the whole drainage network has to be rebuilt.'),
          A('A', 'Finally, an example from Europe. In Rotterdam, some public squares have been designed to fill with water during heavy rain and then drain slowly. In dry weather, they are used as sports courts and playgrounds.'),
          A('A', 'That is all for today. Next week, we will look at green roofs in more detail.')
        ],
        groups: [{
          type: 'complete', limit: 'ONE WORD AND/OR A NUMBER', title: 'Sponge cities', instruction: 'Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.', items: [
            { h: 'Problem' }, { q: 'Hard surfaces such as concrete stop rain soaking in, so water rushes into ____.', a: ['drains'], ev: '"it runs off very quickly into the drains".' },
            { h: 'Idea' }, { q: 'The term became well known in ____ during the 2010s.', a: ['China'], ev: '"became well known in China during the two thousand and tens".' },
            { h: 'Techniques' },
            { q: '____ pavements allow water to pass through.', a: ['Permeable', 'permeable'], ev: '"permeable pavements".' },
            { q: 'Rain ____ collect water running off roads and car parks.', a: ['gardens'], ev: '"rain gardens".' },
            { q: 'Restored ____ store large volumes of water.', a: ['wetlands'], ev: '"restored wetlands" (البحيرات الصناعية مشتّت).' },
            { h: 'Benefits' },
            { q: 'Lower risk of ____ after storms.', a: ['flooding', 'floods', 'flood'], ev: '"a lower risk of flooding".' },
            { q: 'Plants and water help to reduce ____ in summer.', a: ['temperatures', 'temperature', 'heat'], ev: '"help to lower temperatures in summer".' },
            { q: 'One pilot scheme cut peak flows by about ____ %.', a: ['30', 'thirty'], ev: '"around thirty per cent".' },
            { h: 'Problems' },
            { q: 'Systems need regular ____ to avoid blockages.', a: ['cleaning'], ev: '"The systems need regular cleaning".' },
            { h: 'Example' },
            { q: 'In Rotterdam, public ____ fill with water during heavy rain.', a: ['squares'], ev: '"some public squares have been designed to fill with water".' }
          ]
        }]
      }
    ]
  };

  window.IELTS.data.listening = {
    tests: [L1],
    practice: L1.parts.map(p => ({ id: 'L1-' + p.id, title: `Listening — ${p.title}`, checkSeconds: 30, parts: [p] })),
    dictation: [
      'The government has introduced several measures to reduce air pollution.',
      'Renewable energy is becoming increasingly affordable for ordinary households.',
      'Researchers have discovered a significant correlation between sleep and academic performance.',
      'Despite a sharp decline in 2010, sales recovered steadily over the following decade.',
      'Students who study abroad often develop greater independence and cultural awareness.',
      'The proportion of people living in urban areas is expected to rise significantly.',
      'A substantial increase in energy demand has exacerbated the shortage of infrastructure.',
      'Although the experiment was small, the findings suggest a possible benefit that should be investigated further.'
    ]
  };
})();

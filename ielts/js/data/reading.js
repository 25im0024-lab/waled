/* Academic Reading — original passages written for practice (not taken from Cambridge or any official test). */
(function () {
  const P = (l, t) => ({ l, t });

  /* ===== Test 1: three passages, 40 questions ===== */
  const R1 = {
    id: 'R1', title: 'Academic Reading — Practice Test 1', minutes: 60,
    parts: [
      {
        id: 'p1', title: 'Passage 1',
        passage: {
          title: 'Bees in the City',
          paras: [
            P('A', 'Over the past two decades, rooftop beehives have become a familiar sight in many large cities. Supporters argue that urban beekeeping helps to protect pollinators while also giving city dwellers a connection with the natural world. Yet a growing number of ecologists are asking a more uncomfortable question: whether keeping honeybees in cities actually helps bees at all.'),
            P('B', 'The starting point for the debate is a surprising finding. Surveys of urban green spaces in several European cities have recorded more wild bee species in gardens, parks and cemeteries than in the intensively farmed countryside around them. Farmland, dominated by a single crop and treated with pesticides, offers little food for most bees, whereas a city\'s patchwork of flowerbeds, balconies and neglected corners provides blossom from early spring until late autumn. The honeybee, however, is only one of around twenty thousand bee species worldwide, and most of the others are solitary insects that nest in soil or hollow stems rather than in hives.'),
            P('C', 'This distinction matters because honeybees and wild bees compete for the same flowers. A beekeeper can add hives at will, but the supply of nectar and pollen in a city is limited. In one study carried out across a mid-sized city, researchers counted visits to flowers in areas with and without nearby hives. Where hives were concentrated, visits by wild bees fell sharply, and some of the rarer species disappeared from the sample altogether. The researchers stopped short of claiming that hives were the only cause, since traffic pollution and the loss of nesting sites may also play a part.'),
            P('D', 'Beekeepers respond that honeybees are livestock, not wildlife, and should not be judged by the standards of conservation. Many hobbyists, they point out, begin with no interest in ecology at all and gradually become advocates for habitat protection. Several city councils have nevertheless begun to review their policies. One council now requires that anyone wishing to place hives on public land must first demonstrate that enough flowers exist within a radius of about a kilometre.'),
            P('E', 'A more promising approach, many scientists suggest, is to improve habitat rather than to add hives. Planting a wider mixture of native flowers, leaving patches of bare soil for ground-nesting species, and reducing the mowing of grass verges all increase the resources available to wild bees. A small trial on a university campus found that converting a single lawn into a meadow tripled the number of bee species recorded within three years. Such measures are cheap and, unlike hives, do not demand regular maintenance.'),
            P('F', 'None of this means that urban beekeeping should be abandoned. Rooftop hives can still be valuable for education, and honey from city hives is popular with consumers. The key, ecologists say, is for the public to understand that a hive is not a conservation measure in itself. For people who truly want to help bees, planting flowers is likely to do more good than keeping them.')
          ]
        },
        groups: [
          {
            type: 'tfng', items: [
              { q: 'The number of rooftop beehives in cities has increased over the past two decades.', a: 'T', ev: 'الفقرة A: "Over the past two decades, rooftop beehives have become a familiar sight" — النص يؤكد الزيادة.' },
              { q: 'Farmland offers bees flowers for a longer part of the year than city gardens do.', a: 'F', ev: 'الفقرة B: المدينة توفر الأزهار "from early spring until late autumn" بينما المزارع تقدم القليل — العكس تمامًا.' },
              { q: 'Honeybees are less affected by pesticides than wild bees are.', a: 'NG', ev: 'النص يذكر المبيدات كسبب لفقر المزارع بالغذاء لكنه لا يقارن تأثيرها على النحل العسلي والبري.' },
              { q: 'Wild bees visited fewer flowers in areas where hives were concentrated.', a: 'T', ev: 'الفقرة C: "visits by wild bees fell sharply" حيث تتركز الخلايا.' },
              { q: 'The researchers concluded that hives were the sole cause of the decline in wild bees.', a: 'F', ev: 'الفقرة C: "stopped short of claiming that hives were the only cause" — لم يجزموا بذلك.' },
              { q: 'Beekeeping is more profitable in cities than in rural areas.', a: 'NG', ev: 'لا يوجد أي حديث عن الربحية في النص.' },
              { q: 'One city council requires proof of sufficient flowers before allowing hives on public land.', a: 'T', ev: 'الفقرة D: "must first demonstrate that enough flowers exist within a radius of about a kilometre".' }
            ]
          },
          {
            type: 'complete', limit: 'NO MORE THAN TWO WORDS', title: 'Complete the sentences below.', items: [
              { q: 'Most wild bees are described as ______ insects.', a: ['solitary'], ev: 'الفقرة B: "most of the others are solitary insects".' },
              { q: 'In farmland, bees find little food because fields are dominated by a single ______.', a: ['crop'], ev: 'الفقرة B: "dominated by a single crop".' },
              { q: 'Beekeepers say honeybees are "livestock, not ______".', a: ['wildlife'], ev: 'الفقرة D: "honeybees are livestock, not wildlife".' },
              { q: 'Leaving patches of ______ helps species that nest in the ground.', a: ['bare soil'], ev: 'الفقرة E: "leaving patches of bare soil for ground-nesting species".' },
              { q: 'Converting a ______ into a meadow increased the number of bee species on a campus.', a: ['lawn', 'single lawn'], ev: 'الفقرة E: "converting a single lawn into a meadow".' },
              { q: 'Rooftop hives can still be useful for ______.', a: ['education'], ev: 'الفقرة F: "valuable for education".' }
            ]
          }
        ]
      },
      {
        id: 'p2', title: 'Passage 2',
        passage: {
          title: 'Sleeping on It',
          paras: [
            P('A', 'Most people have had the experience of struggling with a problem in the evening and finding the solution obvious the next morning. For a long time this was dismissed as folklore. In recent decades, however, laboratory research has shown that sleep is not simply a period of rest for the brain, but an active process in which memories are sorted, strengthened and reorganised.'),
            P('B', 'Sleep is divided into stages that repeat several times each night. Deep, slow-wave sleep, which dominates the first half of the night, appears to be especially important for factual memories such as names and dates. During this stage, activity in the hippocampus, a region where new memories are first stored, is replayed and gradually transferred to the cortex for longer-term storage. Rapid eye movement (REM) sleep, which becomes more frequent towards morning, seems to be more closely linked to emotional memories and to skills.'),
            P('C', 'The strongest evidence comes from experiments in which volunteers learn a task and are then tested after a delay. In a typical design, two groups memorise lists of word pairs in the evening; one group sleeps for eight hours while the other stays awake. When tested the next day, those who slept usually recall noticeably more. Crucially, the advantage is not simply because the sleepers are less tired: a group tested after an equally long period of daytime wakefulness also performs worse than the sleeping group.'),
            P('D', 'Even short periods of sleep appear to help. Researchers who allowed students to take a nap of about ninety minutes after learning found that their recall of the material improved compared with students who stayed awake. A nap of only ten or twenty minutes increased alertness but had little measurable effect on memory in the same study. The findings have encouraged a few schools to trial later start times, although the evidence for this practice is mixed.'),
            P('E', 'Against this background, the habits of modern life are cause for concern. Surveys suggest that many adolescents sleep for considerably less than the eight to ten hours recommended by health authorities, partly because of evening screen use. Students who regularly lose sleep before examinations may therefore be undermining the very revision they have worked so hard to complete. Staying up all night to study is, in other words, likely to be self-defeating.'),
            P('F', 'How sleep achieves its effect is still debated. One view holds that the brain replays recent experiences during sleep, strengthening the connections involved. Another proposes that sleep works mainly by weakening unimportant connections formed during the day, making room for new learning and leaving the important ones standing out more clearly. The two ideas are not mutually exclusive, and both may operate at different stages of the night.'),
            P('G', 'Researchers urge caution about commercial claims. Products that promise to boost memory by playing sounds during sleep have appeared on the market, but the laboratory studies behind them involve small groups and short-lived effects. Most experts believe that the simplest advice is also the best: keep regular hours, avoid screens late at night, and treat sleep as part of the learning process rather than as time lost from it.')
          ]
        },
        groups: [
          {
            type: 'heading', instruction: 'Paragraph A has been numbered for you as an example. Choose the correct heading for paragraphs B–G from the list of headings below.',
            headings: [
              { k: 'i', t: 'Competing explanations of the process' }, { k: 'ii', t: 'Testing the effect under controlled conditions' },
              { k: 'iii', t: 'Practical lessons and a note of caution' }, { k: 'iv', t: 'The origins of a common belief' },
              { k: 'v', t: 'Different stages, different kinds of memory' }, { k: 'vi', t: 'How animals sleep compared with humans' },
              { k: 'vii', t: 'The value of a brief rest' }, { k: 'viii', t: 'Consequences of getting too little sleep' }
            ],
            items: [
              { q: 'Paragraph B', a: 'v', ev: 'B تشرح مراحل النوم (slow-wave و REM) ونوع الذاكرة المرتبط بكل مرحلة.' },
              { q: 'Paragraph C', a: 'ii', ev: 'C تصف تجارب مضبوطة: مجموعتان، نوم مقابل يقظة، ثم اختبار.' },
              { q: 'Paragraph D', a: 'vii', ev: 'D عن القيلولة القصيرة وأثرها في التذكر.' },
              { q: 'Paragraph E', a: 'viii', ev: 'E عن قلة نوم المراهقين وأثرها على المراجعة والامتحانات.' },
              { q: 'Paragraph F', a: 'i', ev: 'F تعرض نظريتين متنافستين لكيفية عمل النوم.' },
              { q: 'Paragraph G', a: 'iii', ev: 'G تحذّر من الادعاءات التجارية وتعطي نصائح عملية.' }
            ]
          },
          {
            type: 'mcq', items: [
              { q: 'According to paragraph B, slow-wave sleep', opts: ['occurs mainly in the second half of the night.', 'is linked to factual memories.', 'is more frequent when people are under stress.', 'involves the cortex replaying emotional experiences.'], a: 'B', ev: 'B: "especially important for factual memories such as names and dates". A خاطئة (النصف الأول)، C غير مذكورة، D تخلط مع REM.' },
              { q: 'In the nap study described in paragraph D,', opts: ['ten-minute naps improved memory.', 'ninety-minute naps improved recall.', 'napping students were more alert than other groups all day.', 'students who napped went on to perform better in examinations.'], a: 'B', ev: 'D: النوم 90 دقيقة حسّن التذكر؛ القيلولة القصيرة حسّنت اليقظة فقط. D غير مذكورة.' },
              { q: 'What point does the writer make in paragraph G about products that play sounds during sleep?', opts: ['They have been shown to be harmful.', 'The research supporting them is limited.', 'They work best for children.', 'They should replace regular sleep routines.'], a: 'B', ev: 'G: "involve small groups and short-lived effects" — أي أن الأدلة محدودة.' }
            ]
          },
          {
            type: 'ynng', items: [
              { q: 'The link between sleep and problem solving was always taken seriously.', a: 'N', ev: 'A: "For a long time this was dismissed as folklore" — تناقض مع الادعاء.' },
              { q: 'The writer considers studying all night before an examination to be a poor strategy.', a: 'Y', ev: 'E: "likely to be self-defeating" — رأي الكاتب واضح.' },
              { q: 'The writer believes later school start times clearly improve results.', a: 'N', ev: 'D: "the evidence for this practice is mixed" — لا يرى أنها تحسّن النتائج بوضوح.' },
              { q: 'The writer expects sleep-based memory products to become widely effective in the future.', a: 'NG', ev: 'يحذّر الكاتب من الادعاءات الحالية لكنه لا يتوقع شيئًا عن المستقبل.' }
            ]
          }
        ]
      },
      {
        id: 'p3', title: 'Passage 3',
        passage: {
          title: 'The Slow Technology Debate',
          paras: [
            P('A', 'For most of the past century, technological progress has been measured by speed: faster processors, faster networks, faster delivery. Lately, however, a counter-movement has emerged under labels such as "slow technology" and "digital minimalism". Its supporters do not reject technology; they argue that the pace at which devices and services demand our attention has outrun our ability to use them well. The debate draws in four very different groups of experts: engineers, economists, psychologists and educators.'),
            P('B', 'Among engineers the argument is partly about design. Many products are released with a stream of automatic updates, each of which changes the interface slightly and obliges users to relearn familiar tasks. Some designers contend that this reflects commercial pressure rather than user need. They propose that software should be built to change less often, and that notifications should be switched off by default. Others in the profession reply that frequent updates are necessary for security and that users cannot be expected to accept vulnerable software in the name of stability.'),
            P('C', 'Economists tend to be sceptical of calls for restraint. A rapid cycle of new products, they point out, sustains employment and encourages investment, and the benefits of innovation have historically spread far beyond the companies that produce it. Yet some economists admit that competition on speed alone can lead firms to release products before they are fully tested, imposing hidden costs on customers. A few have suggested that the real danger is not too much innovation but too little attention to quality.'),
            P('D', 'Psychologists have concentrated on attention. Experiments show that even a brief interruption, such as a message alert, can noticeably lengthen the time needed to complete a demanding task and increase the number of errors. Surveys of heavy phone users report higher levels of tiredness and anxiety than those of moderate users, although researchers caution that these studies cannot show which comes first, since anxious people may simply use their phones more.'),
            P('E', 'Educators are divided. Some teachers have banned phones from classrooms altogether and report calmer lessons. Others argue that prohibition simply postpones the problem, since pupils will eventually enter a world in which devices are unavoidable. They favour teaching young people to decide when a device helps them and when it does not, treating self-control as a skill that can be learned like any other.'),
            P('F', 'One company has tried to put these ideas into practice. Having noticed that its employees spent much of the day answering messages, it introduced two quiet hours each afternoon during which email and chat were disabled. Managers expected output to fall. Instead, projects were completed slightly faster, and staff reported lower stress. The experiment was small, and the company has not published detailed figures, so its results should be treated with caution.'),
            P('G', 'Whether slow technology will become a mainstream movement remains uncertain. Its critics see it as a luxury for people who can afford to disconnect, while its supporters see it as a necessary correction. What both sides appear to agree on is that technology should serve human purposes rather than the reverse. How to achieve that, and who should take responsibility for doing so, remains open to debate.')
          ]
        },
        groups: [
          {
            type: 'match', instruction: 'Match each statement with the correct group, A–D. You may use any letter more than once.',
            bank: [{ k: 'A', t: 'Engineers' }, { k: 'B', t: 'Economists' }, { k: 'C', t: 'Psychologists' }, { k: 'D', t: 'Educators' }], bankTitle: 'Groups of experts',
            items: [
              { q: 'Interruptions from devices reduce people\'s ability to carry out difficult tasks.', a: 'C', ev: 'الفقرة D: علماء النفس — التنبيهات تُطيل زمن المهمة وتزيد الأخطاء.' },
              { q: 'Faster product cycles support jobs and investment.', a: 'B', ev: 'الفقرة C: الاقتصاديون — "sustains employment and encourages investment".' },
              { q: 'Users should be taught to judge when a device is useful.', a: 'D', ev: 'الفقرة E: المربّون — تعليم الشباب متى يفيدهم الجهاز.' },
              { q: 'Devices should be set up to interrupt people less by default.', a: 'A', ev: 'الفقرة B: المهندسون — "notifications should be switched off by default".' },
              { q: 'Competition can push companies to release products before they are properly tested.', a: 'B', ev: 'الفقرة C: بعض الاقتصاديين يقرّون بذلك.' }
            ]
          },
          {
            type: 'summary', limit: 'ONE WORD ONLY', instruction: 'Complete the summary using the list of words, A–H, below.',
            bank: [{ k: 'A', t: 'messages' }, { k: 'B', t: 'disabled' }, { k: 'C', t: 'output' }, { k: 'D', t: 'stress' }, { k: 'E', t: 'caution' }, { k: 'F', t: 'meetings' }, { k: 'G', t: 'salaries' }, { k: 'H', t: 'feedback' }], bankTitle: 'Word bank',
            text: 'A company noticed that its employees spent much of the day replying to {{1}}. It therefore introduced two quiet hours each afternoon during which email and chat were {{2}}. Managers feared that {{3}} would decline, but projects were finished slightly faster and staff reported lower {{4}}. Because the experiment was small, the results should be treated with {{5}}.',
            items: [
              { a: 'A', ev: 'الفقرة F: "answering messages".' }, { a: 'B', ev: 'الفقرة F: "email and chat were disabled".' }, { a: 'C', ev: 'الفقرة F: "Managers expected output to fall".' },
              { a: 'D', ev: 'الفقرة F: "staff reported lower stress".' }, { a: 'E', ev: 'الفقرة F: "treated with caution".' }
            ]
          },
          {
            type: 'mcq2', items: [
              { q: 'Which TWO of the following points about psychologists\' research are mentioned in paragraph D?', opts: ['Message alerts can make people commit more errors.', 'Heavy phone use has been proved to cause anxiety.', 'Researchers cannot tell whether anxiety leads to heavy phone use or the reverse.', 'Moderate phone use improves concentration.', 'The surveys were carried out in several countries.'], a: ['A', 'C'], ev: 'D: A صحيحة ("increase the number of errors")، C صحيحة ("cannot show which comes first"). B خاطئة (الباحثون يحذّرون)، D و E غير مذكورتين.' }
            ]
          },
          {
            type: 'mcq', items: [
              { q: 'What is the writer\'s view of the company experiment in paragraph F?', opts: ['It proves that quiet hours should be compulsory.', 'It suggests a possible benefit but is not conclusive.', 'It failed because output fell.', 'It was too expensive to repeat.'], a: 'B', ev: 'F: النتائج إيجابية لكن التجربة صغيرة ولم تُنشر أرقامها — "treated with caution".' },
              { q: 'According to paragraph G, what do both supporters and critics of slow technology appear to agree on?', opts: ['It will soon become mainstream.', 'It is only suitable for wealthy people.', 'Technology should serve human purposes.', 'Governments must regulate device design.'], a: 'C', ev: 'G: "What both sides appear to agree on is that technology should serve human purposes".' }
            ]
          }
        ]
      }
    ]
  };

  /* ===== Short practice passage (kept from v1, converted) ===== */
  const RP1 = {
    id: 'RP1', title: 'Short practice — Green Roofs', minutes: 20,
    parts: [{
      id: 'p1', title: 'Passage',
      passage: {
        title: 'Green Roofs in Dense Cities', paras: [
          P('A', 'As cities grow denser, space for parks and gardens shrinks. One response has been the green roof: a layer of soil and vegetation installed on top of a building. Although the idea dates back to ancient times, modern green roofs only became widespread in the 1980s, when Germany introduced policies to encourage their installation.'),
          P('B', 'Green roofs offer several benefits. They absorb rainwater, reducing the amount that flows into drains during storms. A study of roofs in one northern European city found that vegetation retained roughly half of the annual rainfall. In addition, plants insulate buildings, which lowers heating costs in winter and cooling costs in summer. Some researchers also claim that green roofs reduce the "urban heat island" effect, although the evidence remains limited to a few small-scale trials.'),
          P('C', 'Critics point to the costs. Installation is typically more expensive than for a conventional roof because the structure must support extra weight, and the waterproof layer needs regular inspection. Maintenance costs are lower for "extensive" roofs, which use thin soil and hardy plants such as sedum, than for "intensive" roofs, which can support shrubs and even small trees. Despite these concerns, a growing number of city councils now offer subsidies to property owners.')
        ]
      },
      groups: [
        {
          type: 'tfng', items: [
            { q: 'Green roofs were first invented in Germany in the 1980s.', a: 'F', ev: 'A: الفكرة قديمة "dates back to ancient times"؛ ألمانيا شجّعت انتشارها فقط.' },
            { q: 'In one study, vegetation retained about 50% of the yearly rainfall.', a: 'T', ev: 'B: "retained roughly half of the annual rainfall".' },
            { q: 'It has been proven that green roofs reduce the urban heat island effect.', a: 'F', ev: 'B: "some researchers claim" و"the evidence remains limited".' },
            { q: 'Extensive roofs are cheaper to maintain than intensive roofs.', a: 'T', ev: 'C: "Maintenance costs are lower for extensive roofs".' },
            { q: 'Most green roofs in Germany are owned by private companies.', a: 'NG', ev: 'لا يوجد ذكر للملكية.' },
            { q: 'Some city councils now provide financial support for green roofs.', a: 'T', ev: 'C: "a growing number of city councils now offer subsidies".' }
          ]
        },
        {
          type: 'complete', limit: 'NO MORE THAN TWO WORDS', items: [
            { q: 'Installing a green roof costs more because the structure must support extra ______.', a: ['weight'], ev: 'C: "must support extra weight".' },
            { q: 'The waterproof layer needs regular ______.', a: ['inspection'], ev: 'C: "needs regular inspection".' },
            { q: 'Extensive roofs use ______ soil and hardy plants such as sedum.', a: ['thin'], ev: 'C: "which use thin soil".' }
          ]
        }
      ]
    }]
  };

  // Single passages of Test 1 are also offered as stand-alone 20-minute practice.
  const split = (t, i) => ({ id: t.id + '-' + t.parts[i].id, title: `${t.title} — ${t.parts[i].title}`, minutes: 20, parts: [t.parts[i]] });

  window.IELTS.data.reading = { tests: [R1], practice: [split(R1, 0), split(R1, 1), split(R1, 2), RP1] };
})();

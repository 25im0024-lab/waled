/* Vocabulary topics. Row: [english, arabic, emoji (picture), example sentence, Arabic translation of the example].
   Original authoring; Arabic is Modern Standard Arabic. */
(function () {
  const T = (id, level, icon, en, ar, words) => ({ id, level, icon, en, ar, words });
  const topics = [
    /* ================= A1 ================= */
    T("colors", "A1", "🎨", "Colours", "الألوان", [
      ["red", "أحمر", "🔴", "The apple is red.", "التفاحة حمراء."], ["blue", "أزرق", "🔵", "The sky is blue.", "السماء زرقاء."],
      ["green", "أخضر", "🟢", "The tree is green.", "الشجرة خضراء."], ["yellow", "أصفر", "🟡", "The sun is yellow.", "الشمس صفراء."],
      ["black", "أسود", "⚫", "I have a black cat.", "عندي قطة سوداء."], ["white", "أبيض", "⚪", "The milk is white.", "الحليب أبيض."],
      ["orange", "برتقالي", "🟠", "The ball is orange.", "الكرة برتقالية."], ["pink", "وردي", "💗", "She has a pink bag.", "عندها حقيبة وردية."],
      ["brown", "بني", "🟤", "The dog is brown.", "الكلب بنّي."], ["purple", "بنفسجي", "🟣", "I like purple flowers.", "أحب الزهور البنفسجية."]]),
    T("numbers", "A1", "🔢", "Numbers 1–10", "الأرقام من 1 إلى 10", [
      ["one", "واحد", "1️⃣", "I have one book.", "عندي كتاب واحد."], ["two", "اثنان", "2️⃣", "Two teas, please.", "كوبان من الشاي من فضلك."],
      ["three", "ثلاثة", "3️⃣", "I have three sisters.", "عندي ثلاث أخوات."], ["four", "أربعة", "4️⃣", "A car has four wheels.", "للسيارة أربع عجلات."],
      ["five", "خمسة", "5️⃣", "Wait five minutes.", "انتظر خمس دقائق."], ["six", "ستة", "6️⃣", "I wake up at six.", "أستيقظ في السادسة."],
      ["seven", "سبعة", "7️⃣", "A week has seven days.", "الأسبوع سبعة أيام."], ["eight", "ثمانية", "8️⃣", "I work eight hours.", "أعمل ثماني ساعات."],
      ["nine", "تسعة", "9️⃣", "She is nine years old.", "عمرها تسع سنوات."], ["ten", "عشرة", "🔟", "Ten students are here.", "عشرة طلاب هنا."]]),
    T("family", "A1", "👨‍👩‍👧", "Family", "العائلة", [
      ["mother", "أمّ", "👩", "My mother cooks well.", "أمي تطبخ جيدًا."], ["father", "أب", "👨", "My father works in a bank.", "أبي يعمل في بنك."],
      ["brother", "أخ", "👦", "I have one brother.", "عندي أخ واحد."], ["sister", "أخت", "👧", "My sister is a student.", "أختي طالبة."],
      ["grandfather", "جدّ", "👴", "My grandfather tells stories.", "جدي يحكي القصص."], ["grandmother", "جدّة", "👵", "My grandmother makes tea.", "جدتي تصنع الشاي."],
      ["son", "ابن", "🧒", "They have one son.", "عندهم ابن واحد."], ["daughter", "ابنة", "👧", "Her daughter is five.", "ابنتها عمرها خمس سنوات."],
      ["husband", "زوج", "🤵", "Her husband is a doctor.", "زوجها طبيب."], ["wife", "زوجة", "👰", "His wife is a teacher.", "زوجته معلّمة."]]),
    T("animals", "A1", "🐶", "Animals", "الحيوانات", [
      ["cat", "قطّة", "🐱", "The cat is sleeping.", "القطة نائمة."], ["dog", "كلب", "🐶", "The dog runs fast.", "الكلب يركض بسرعة."],
      ["bird", "طائر", "🐦", "The bird can fly.", "الطائر يستطيع الطيران."], ["fish", "سمكة", "🐟", "Fish live in water.", "الأسماك تعيش في الماء."],
      ["horse", "حصان", "🐴", "The horse is strong.", "الحصان قوي."], ["cow", "بقرة", "🐄", "The cow gives milk.", "البقرة تعطي الحليب."],
      ["sheep", "خروف", "🐑", "The sheep eat grass.", "الخراف تأكل العشب."], ["rabbit", "أرنب", "🐰", "The rabbit likes carrots.", "الأرنب يحب الجزر."],
      ["lion", "أسد", "🦁", "The lion is dangerous.", "الأسد خطير."], ["elephant", "فيل", "🐘", "The elephant is big.", "الفيل كبير."],
      ["camel", "جمل", "🐪", "The camel lives in the desert.", "الجمل يعيش في الصحراء."]]),
    T("food", "A1", "🍎", "Food", "الطعام", [
      ["apple", "تفّاحة", "🍎", "I eat an apple every day.", "آكل تفاحة كل يوم."], ["banana", "موزة", "🍌", "Monkeys like bananas.", "القرود تحب الموز."],
      ["bread", "خبز", "🍞", "I want some bread.", "أريد بعض الخبز."], ["rice", "أرز", "🍚", "We eat rice for lunch.", "نأكل الأرز على الغداء."],
      ["egg", "بيضة", "🥚", "I have an egg for breakfast.", "آكل بيضة على الفطور."], ["cheese", "جبن", "🧀", "Cheese is tasty.", "الجبن لذيذ."],
      ["tomato", "طماطم", "🍅", "Add a tomato to the salad.", "أضف طماطم إلى السلطة."], ["potato", "بطاطا", "🥔", "She cooks potatoes.", "هي تطبخ البطاطا."],
      ["meat", "لحم", "🥩", "He doesn't eat meat.", "هو لا يأكل اللحم."], ["soup", "شوربة", "🍲", "The soup is hot.", "الشوربة ساخنة."],
      ["cake", "كعكة", "🍰", "Happy birthday! Here is a cake.", "عيد ميلاد سعيد! هذه كعكة."], ["salad", "سلطة", "🥗", "I like salad.", "أحب السلطة."]]),
    T("drinks", "A1", "☕", "Drinks", "المشروبات", [
      ["water", "ماء", "💧", "Can I have some water?", "هل يمكنني شرب بعض الماء؟"], ["milk", "حليب", "🥛", "Children drink milk.", "الأطفال يشربون الحليب."],
      ["tea", "شاي", "🍵", "I drink tea in the morning.", "أشرب الشاي في الصباح."], ["coffee", "قهوة", "☕", "He likes strong coffee.", "هو يحب القهوة القوية."],
      ["juice", "عصير", "🧃", "A glass of juice, please.", "كأس عصير من فضلك."], ["lemonade", "ليموناضة", "🍋", "The lemonade is cold.", "الليموناضة باردة."],
      ["soda", "مشروب غازي", "🥤", "Soda has a lot of sugar.", "المشروبات الغازية فيها سكر كثير."]]),
    T("body", "A1", "🧍", "Body", "الجسم", [
      ["head", "رأس", "🙂", "My head hurts.", "رأسي يؤلمني."], ["eye", "عين", "👁️", "She has blue eyes.", "عيناها زرقاوان."],
      ["ear", "أذن", "👂", "I hear with my ears.", "أسمع بأذنيّ."], ["nose", "أنف", "👃", "He has a big nose.", "أنفه كبير."],
      ["mouth", "فم", "👄", "Open your mouth.", "افتح فمك."], ["hand", "يد", "✋", "Wash your hands.", "اغسل يديك."],
      ["arm", "ذراع", "💪", "He has strong arms.", "ذراعاه قويتان."], ["leg", "ساق", "🦵", "My leg is tired.", "ساقي متعبة."],
      ["foot", "قدم", "🦶", "My foot hurts.", "قدمي تؤلمني."], ["tooth", "سنّ", "🦷", "I have a bad tooth.", "عندي سنّ مؤلمة."],
      ["hair", "شعر", "💇", "She has long hair.", "شعرها طويل."]]),
    T("clothes", "A1", "👕", "Clothes", "الملابس", [
      ["shirt", "قميص", "👕", "This shirt is new.", "هذا القميص جديد."], ["trousers", "بنطال", "👖", "These trousers are too long.", "هذا البنطال طويل جدًا."],
      ["dress", "فستان", "👗", "She wears a red dress.", "ترتدي فستانًا أحمر."], ["shoes", "حذاء", "👟", "I need new shoes.", "أحتاج حذاءً جديدًا."],
      ["hat", "قبّعة", "🧢", "He wears a hat.", "يرتدي قبعة."], ["coat", "معطف", "🧥", "Take your coat. It's cold.", "خذ معطفك. الجو بارد."],
      ["socks", "جوارب", "🧦", "I lost my socks.", "أضعتُ جواربي."], ["scarf", "وشاح", "🧣", "Wear a scarf in winter.", "ارتدِ وشاحًا في الشتاء."],
      ["glasses", "نظارة", "👓", "I can't see without my glasses.", "لا أرى بدون نظارتي."], ["bag", "حقيبة", "👜", "My bag is heavy.", "حقيبتي ثقيلة."]]),
    T("house", "A1", "🏠", "Home", "البيت", [
      ["house", "بيت", "🏠", "We live in a big house.", "نسكن في بيت كبير."], ["bed", "سرير", "🛏️", "The bed is soft.", "السرير ناعم."],
      ["chair", "كرسي", "🪑", "Sit on the chair.", "اجلس على الكرسي."], ["door", "باب", "🚪", "Close the door, please.", "أغلق الباب من فضلك."],
      ["window", "نافذة", "🪟", "Open the window.", "افتح النافذة."], ["key", "مفتاح", "🔑", "Where is my key?", "أين مفتاحي؟"],
      ["lamp", "مصباح", "💡", "Turn on the lamp.", "شغّل المصباح."], ["sofa", "أريكة", "🛋️", "The cat is on the sofa.", "القطة على الأريكة."],
      ["TV", "تلفاز", "📺", "We watch TV at night.", "نشاهد التلفاز ليلًا."], ["shower", "دُشّ", "🚿", "I take a shower every morning.", "آخذ دشًّا كل صباح."],
      ["clock", "ساعة حائط", "🕐", "The clock is on the wall.", "الساعة على الحائط."]]),
    T("weather", "A1", "⛅", "Weather", "الطقس", [
      ["sunny", "مشمس", "☀️", "It's sunny today.", "الجو مشمس اليوم."], ["cloudy", "غائم", "☁️", "It's cloudy.", "الجو غائم."],
      ["rainy", "ماطر", "🌧️", "It's rainy. Take an umbrella.", "الجو ماطر. خذ مظلة."], ["windy", "عاصف / كثير الرياح", "💨", "It's very windy.", "الجو كثير الرياح."],
      ["snowy", "ثلجي", "❄️", "It's snowy in the mountains.", "الجو ثلجي في الجبال."], ["hot", "حارّ", "🥵", "It's hot in summer.", "الجو حارّ في الصيف."],
      ["cold", "بارد", "🥶", "It's cold in winter.", "الجو بارد في الشتاء."], ["storm", "عاصفة", "⛈️", "A storm is coming.", "عاصفة قادمة."],
      ["rainbow", "قوس قزح", "🌈", "Look! A rainbow!", "انظر! قوس قزح!"], ["umbrella", "مظلّة", "☂️", "I have an umbrella.", "معي مظلة."]]),

    /* ================= A2 ================= */
    T("daily", "A2", "⏰", "Daily routine (verbs)", "الروتين اليومي (أفعال)", [
      ["wake up", "يستيقظ", "⏰", "I wake up at six.", "أستيقظ في السادسة."], ["brush", "ينظّف (بالفرشاة)", "🪥", "I brush my teeth twice a day.", "أنظّف أسناني مرتين في اليوم."],
      ["have breakfast", "يتناول الفطور", "🍳", "We have breakfast at seven.", "نتناول الفطور في السابعة."], ["go to work", "يذهب إلى العمل", "💼", "He goes to work by bus.", "يذهب إلى العمل بالحافلة."],
      ["study", "يدرس", "📚", "I study English every day.", "أدرس الإنجليزية كل يوم."], ["cook", "يطبخ", "👩‍🍳", "She cooks dinner.", "هي تطبخ العشاء."],
      ["clean", "ينظّف", "🧹", "I clean my room on Fridays.", "أنظّف غرفتي أيام الجمعة."], ["watch", "يشاهد", "📺", "They watch a film.", "يشاهدون فيلمًا."],
      ["sleep", "ينام", "😴", "I sleep eight hours.", "أنام ثماني ساعات."], ["call", "يتّصل", "📞", "I call my mother every day.", "أتصل بأمي كل يوم."]]),
    T("time", "A2", "📅", "Days and time", "الأيام والوقت", [
      ["Monday", "الاثنين", "📅", "I have English class on Monday.", "عندي حصة إنجليزي يوم الاثنين."], ["Tuesday", "الثلاثاء", "📅", "We meet on Tuesday.", "نلتقي يوم الثلاثاء."],
      ["Wednesday", "الأربعاء", "📅", "Wednesday is a busy day.", "الأربعاء يوم مزدحم."], ["Thursday", "الخميس", "📅", "The test is on Thursday.", "الاختبار يوم الخميس."],
      ["Friday", "الجمعة", "🕌", "Friday is a holiday.", "الجمعة يوم عطلة."], ["Saturday", "السبت", "📅", "I relax on Saturday.", "أرتاح يوم السبت."],
      ["Sunday", "الأحد", "📅", "We visit Grandma on Sunday.", "نزور جدتي يوم الأحد."], ["morning", "صباح", "🌅", "I run in the morning.", "أركض في الصباح."],
      ["evening", "مساء", "🌆", "We eat dinner in the evening.", "نأكل العشاء في المساء."], ["night", "ليل", "🌙", "Good night!", "تصبح على خير!"],
      ["today", "اليوم", "📆", "Today is a good day.", "اليوم يوم جيد."], ["tomorrow", "غدًا", "➡️", "See you tomorrow.", "أراك غدًا."], ["yesterday", "أمس", "⬅️", "I was at home yesterday.", "كنت في البيت أمس."]]),
    T("town", "A2", "🏙️", "Places in town", "أماكن في المدينة", [
      ["school", "مدرسة", "🏫", "The school opens at eight.", "تفتح المدرسة في الثامنة."], ["hospital", "مستشفى", "🏥", "The hospital is near here.", "المستشفى قريب من هنا."],
      ["bank", "بنك", "🏦", "I go to the bank on Monday.", "أذهب إلى البنك يوم الاثنين."], ["supermarket", "سوبرماركت", "🛒", "We buy food at the supermarket.", "نشتري الطعام من السوبرماركت."],
      ["restaurant", "مطعم", "🍽️", "Let's eat at a restaurant.", "لنأكل في مطعم."], ["park", "حديقة", "🌳", "The children play in the park.", "الأطفال يلعبون في الحديقة."],
      ["airport", "مطار", "🛫", "The airport is far.", "المطار بعيد."], ["station", "محطة", "🚉", "The train station is big.", "محطة القطار كبيرة."],
      ["hotel", "فندق", "🏨", "We stay at a hotel.", "نقيم في فندق."], ["library", "مكتبة (للاستعارة)", "📚", "I read in the library.", "أقرأ في المكتبة."],
      ["mosque", "مسجد", "🕌", "The mosque is next to the school.", "المسجد بجانب المدرسة."], ["pharmacy", "صيدلية", "💊", "I need to go to the pharmacy.", "أحتاج أن أذهب إلى الصيدلية."]]),
    T("transport", "A2", "🚌", "Transport", "المواصلات", [
      ["car", "سيارة", "🚗", "He drives a new car.", "يقود سيارة جديدة."], ["bus", "حافلة", "🚌", "The bus is late.", "الحافلة متأخرة."],
      ["train", "قطار", "🚆", "I go by train.", "أسافر بالقطار."], ["plane", "طائرة", "✈️", "The plane lands at nine.", "تهبط الطائرة في التاسعة."],
      ["bicycle", "دراجة", "🚲", "She rides a bicycle.", "هي تركب دراجة."], ["taxi", "تاكسي", "🚕", "Let's take a taxi.", "لنأخذ تاكسي."],
      ["ship", "سفينة", "🚢", "The ship is big.", "السفينة كبيرة."], ["motorbike", "دراجة نارية", "🏍️", "He has a motorbike.", "عنده دراجة نارية."],
      ["truck", "شاحنة", "🚚", "The truck brings food.", "الشاحنة تجلب الطعام."], ["ticket", "تذكرة", "🎫", "I need a ticket.", "أحتاج تذكرة."],
      ["road", "طريق", "🛣️", "The road is long.", "الطريق طويل."], ["traffic light", "إشارة مرور", "🚦", "Stop at the traffic light.", "قِف عند إشارة المرور."]]),
    T("office", "A2", "✏️", "School and office things", "أدوات المدرسة والمكتب", [
      ["book", "كتاب", "📖", "Open your book.", "افتح كتابك."], ["pen", "قلم حبر", "🖊️", "I need a pen.", "أحتاج قلمًا."],
      ["pencil", "قلم رصاص", "✏️", "Use a pencil.", "استخدم قلم رصاص."], ["notebook", "دفتر", "📓", "Write it in your notebook.", "اكتبها في دفترك."],
      ["ruler", "مسطرة", "📏", "Can I borrow your ruler?", "هل أستعير مسطرتك؟"], ["computer", "حاسوب", "💻", "She works on a computer.", "هي تعمل على حاسوب."],
      ["phone", "هاتف", "📱", "My phone is new.", "هاتفي جديد."], ["paper", "ورق", "📄", "I need some paper.", "أحتاج بعض الورق."],
      ["scissors", "مقصّ", "✂️", "Cut it with scissors.", "قصّه بالمقص."], ["school bag", "حقيبة مدرسية", "🎒", "His school bag is heavy.", "حقيبته المدرسية ثقيلة."]]),
    T("jobs", "A2", "👷", "Jobs", "المهن", [
      ["teacher", "معلّم", "👩‍🏫", "My teacher is kind.", "معلّمتي لطيفة."], ["doctor", "طبيب", "👨‍⚕️", "The doctor helps sick people.", "الطبيب يساعد المرضى."],
      ["nurse", "ممرّضة", "👩‍⚕️", "The nurse is very kind.", "الممرضة لطيفة جدًا."], ["engineer", "مهندس", "👷", "My brother is an engineer.", "أخي مهندس."],
      ["farmer", "مزارع", "🧑‍🌾", "The farmer grows tomatoes.", "المزارع يزرع الطماطم."], ["police officer", "شرطي", "👮", "The police officer helps us.", "الشرطي يساعدنا."],
      ["chef", "طاهٍ", "🧑‍🍳", "The chef cooks fish.", "الطاهي يطبخ السمك."], ["pilot", "طيّار", "🧑‍✈️", "The pilot flies the plane.", "الطيار يقود الطائرة."],
      ["firefighter", "رجل إطفاء", "🧑‍🚒", "The firefighter is brave.", "رجل الإطفاء شجاع."], ["lawyer", "محامٍ", "⚖️", "A lawyer knows the law.", "المحامي يعرف القانون."],
      ["driver", "سائق", "🚕", "The driver is waiting.", "السائق ينتظر."], ["artist", "فنّان", "🎨", "She is an artist.", "هي فنّانة."]]),
    T("hobbies", "A2", "⚽", "Hobbies and sport", "الهوايات والرياضة", [
      ["football", "كرة القدم", "⚽", "We play football on Friday.", "نلعب كرة القدم يوم الجمعة."], ["swimming", "السباحة", "🏊", "I like swimming.", "أحب السباحة."],
      ["reading", "القراءة", "📖", "Reading is my hobby.", "القراءة هوايتي."], ["cooking", "الطبخ", "🍳", "She loves cooking.", "هي تحب الطبخ."],
      ["painting", "الرسم (بالألوان)", "🎨", "He enjoys painting.", "هو يستمتع بالرسم."], ["music", "الموسيقى", "🎵", "I listen to music.", "أستمع إلى الموسيقى."],
      ["cycling", "ركوب الدراجات", "🚴", "Cycling is good for you.", "ركوب الدراجات مفيد لك."], ["running", "الجري", "🏃", "I go running in the morning.", "أذهب للجري في الصباح."],
      ["gaming", "ألعاب الفيديو", "🎮", "He likes gaming.", "هو يحب ألعاب الفيديو."], ["photography", "التصوير", "📷", "She loves photography.", "هي تحب التصوير."],
      ["fishing", "صيد السمك", "🎣", "My father goes fishing.", "أبي يذهب لصيد السمك."], ["travelling", "السفر", "🧳", "I love travelling.", "أحب السفر."]]),
    T("feelings", "A2", "😀", "Feelings", "المشاعر", [
      ["happy", "سعيد", "😀", "I'm happy today.", "أنا سعيد اليوم."], ["sad", "حزين", "😢", "She is sad.", "هي حزينة."],
      ["angry", "غاضب", "😠", "He is angry.", "هو غاضب."], ["tired", "متعب", "😴", "I'm very tired.", "أنا متعب جدًا."],
      ["hungry", "جائع", "🍽️", "I'm hungry. Let's eat.", "أنا جائع. لنأكل."], ["thirsty", "عطشان", "🥤", "I'm thirsty.", "أنا عطشان."],
      ["scared", "خائف", "😨", "The child is scared.", "الطفل خائف."], ["excited", "متحمّس", "🤩", "We are excited about the trip.", "نحن متحمسون للرحلة."],
      ["bored", "ضجِر", "🥱", "I'm bored.", "أنا ضجر."], ["sick", "مريض", "🤒", "He is sick today.", "هو مريض اليوم."],
      ["surprised", "متفاجئ", "😮", "I'm surprised!", "أنا متفاجئ!"], ["busy", "مشغول", "⏳", "I'm busy now.", "أنا مشغول الآن."]]),
    T("shopping", "A2", "🛍️", "Shopping and money", "التسوّق والمال", [
      ["price", "سعر", "🏷️", "What's the price?", "ما السعر؟"], ["money", "نقود", "💵", "I don't have much money.", "ليس معي نقود كثيرة."],
      ["cheap", "رخيص", "🪙", "This shirt is cheap.", "هذا القميص رخيص."], ["expensive", "غالٍ", "💎", "That watch is expensive.", "تلك الساعة غالية."],
      ["buy", "يشتري", "🛒", "I want to buy a phone.", "أريد أن أشتري هاتفًا."], ["sell", "يبيع", "🏪", "They sell fresh bread.", "يبيعون خبزًا طازجًا."],
      ["pay", "يدفع", "💳", "Can I pay by card?", "هل يمكنني الدفع بالبطاقة؟"], ["cash", "نقدًا", "💵", "I pay in cash.", "أدفع نقدًا."],
      ["change", "الباقي (فكّة)", "🪙", "Here is your change.", "تفضّل الباقي."], ["discount", "خصم", "🔖", "There is a 20% discount.", "هناك خصم 20%."],
      ["size", "مقاس", "📏", "What size do you wear?", "ما مقاسك؟"], ["receipt", "إيصال", "🧾", "Keep the receipt.", "احتفظ بالإيصال."]]),
    T("travel", "A2", "🧳", "Travel", "السفر", [
      ["passport", "جواز سفر", "🛂", "Show your passport, please.", "أرِني جواز سفرك من فضلك."], ["luggage", "أمتعة", "🧳", "Where is my luggage?", "أين أمتعتي؟"],
      ["reservation", "حجز", "📅", "I have a reservation.", "عندي حجز."], ["map", "خريطة", "🗺️", "Look at the map.", "انظر إلى الخريطة."],
      ["flight", "رحلة جوية", "✈️", "My flight is at ten.", "رحلتي في العاشرة."], ["tourist", "سائح", "📸", "Many tourists visit the city.", "يزور المدينةَ سيّاح كثيرون."],
      ["beach", "شاطئ", "🏖️", "We go to the beach.", "نذهب إلى الشاطئ."], ["camera", "كاميرا", "📷", "Bring your camera.", "أحضر كاميرتك."],
      ["souvenir", "تذكار", "🎁", "I buy a souvenir.", "أشتري تذكارًا."], ["guide", "مرشد", "🧭", "The guide speaks English.", "المرشد يتكلم الإنجليزية."]]),

    /* ================= B1 ================= */
    T("health", "B1", "🩺", "Health", "الصحة", [
      ["headache", "صداع", "🤕", "I've had a headache since morning.", "عندي صداع منذ الصباح."], ["fever", "حمّى", "🤒", "She has a high fever.", "عندها حمّى مرتفعة."],
      ["cough", "سعال", "😷", "I have a bad cough.", "عندي سعال شديد."], ["medicine", "دواء", "💊", "Take this medicine twice a day.", "خذ هذا الدواء مرتين في اليوم."],
      ["appointment", "موعد", "📅", "I have an appointment with the doctor.", "عندي موعد مع الطبيب."], ["prescription", "وصفة طبية", "📝", "You need a prescription for this.", "تحتاج وصفة طبية لهذا."],
      ["injury", "إصابة", "🩹", "He has a knee injury.", "عنده إصابة في الركبة."], ["allergy", "حساسية", "🤧", "I have an allergy to nuts.", "عندي حساسية من المكسّرات."],
      ["vaccine", "لقاح", "💉", "The vaccine protects you.", "اللقاح يحميك."], ["healthy", "صحّي", "🥗", "Try to eat healthy food.", "حاول أن تأكل طعامًا صحيًا."]]),
    T("tech", "B1", "💻", "Technology", "التكنولوجيا", [
      ["website", "موقع إلكتروني", "🌐", "Visit our website for more information.", "زُر موقعنا الإلكتروني لمزيد من المعلومات."], ["password", "كلمة مرور", "🔐", "Don't share your password.", "لا تشارك كلمة المرور."],
      ["download", "يُنزّل", "⬇️", "I downloaded the app yesterday.", "نزّلتُ التطبيق أمس."], ["battery", "بطارية", "🔋", "My battery is low.", "بطاريتي ضعيفة."],
      ["screen", "شاشة", "🖥️", "The screen is too bright.", "الشاشة ساطعة جدًا."], ["update", "تحديث / يحدّث", "🔄", "Please update the software.", "من فضلك حدّث البرنامج."],
      ["network", "شبكة", "📶", "The network is slow today.", "الشبكة بطيئة اليوم."], ["file", "ملف", "📁", "I saved the file on my laptop.", "حفظتُ الملف على حاسوبي المحمول."],
      ["search", "يبحث", "🔍", "I search online for information.", "أبحث عن المعلومات عبر الإنترنت."], ["app", "تطبيق", "📱", "This app is very useful.", "هذا التطبيق مفيد جدًا."]]),
    T("environment", "B1", "🌍", "Environment", "البيئة", [
      ["pollution", "تلوّث", "🏭", "Air pollution is a big problem.", "تلوّث الهواء مشكلة كبيرة."], ["recycle", "يعيد التدوير", "♻️", "We recycle paper and plastic.", "نعيد تدوير الورق والبلاستيك."],
      ["climate", "مناخ", "🌡️", "The climate is changing.", "المناخ يتغيّر."], ["energy", "طاقة", "⚡", "Solar energy is clean.", "الطاقة الشمسية نظيفة."],
      ["waste", "نفايات / هدر", "🗑️", "Don't waste water.", "لا تُهدر الماء."], ["forest", "غابة", "🌲", "The forest is home to many animals.", "الغابة موطن لحيوانات كثيرة."],
      ["ocean", "محيط", "🌊", "The ocean is full of life.", "المحيط مليء بالحياة."], ["protect", "يحمي", "🛡️", "We must protect nature.", "علينا أن نحمي الطبيعة."],
      ["plastic", "بلاستيك", "🧴", "Plastic bags harm the sea.", "الأكياس البلاستيكية تضرّ البحر."], ["global warming", "الاحترار العالمي", "🔥", "Global warming is getting worse.", "الاحترار العالمي يزداد سوءًا."]]),
    T("career", "B1", "🏢", "Work and career", "العمل والمهنة", [
      ["manager", "مدير", "👔", "My manager is very helpful.", "مديري متعاون جدًا."], ["salary", "راتب", "💰", "The salary is good.", "الراتب جيد."],
      ["interview", "مقابلة عمل", "🗣️", "I have a job interview tomorrow.", "عندي مقابلة عمل غدًا."], ["experience", "خبرة", "🏅", "She has five years of experience.", "عندها خمس سنوات من الخبرة."],
      ["skill", "مهارة", "🛠️", "Communication is an important skill.", "التواصل مهارة مهمة."], ["deadline", "موعد نهائي", "⏰", "The deadline is Friday.", "الموعد النهائي يوم الجمعة."],
      ["colleague", "زميل عمل", "🤝", "My colleagues are friendly.", "زملائي في العمل ودودون."], ["contract", "عقد", "📄", "Please sign the contract.", "من فضلك وقّع العقد."],
      ["promotion", "ترقية", "📈", "He got a promotion.", "حصل على ترقية."], ["schedule", "جدول زمني", "🗓️", "I have a busy schedule this week.", "جدولي مزدحم هذا الأسبوع."]]),
    T("education", "B1", "🎓", "Education", "التعليم", [
      ["degree", "شهادة جامعية", "🎓", "She has a degree in engineering.", "عندها شهادة في الهندسة."], ["course", "دورة / مقرّر", "📚", "I'm taking an English course.", "أدرس دورة في الإنجليزية."],
      ["exam", "امتحان", "📝", "I'm studying for my exam.", "أذاكر لامتحاني."], ["lecture", "محاضرة", "🎤", "The lecture starts at nine.", "تبدأ المحاضرة في التاسعة."],
      ["scholarship", "منحة دراسية", "🏅", "He won a scholarship.", "فاز بمنحة دراسية."], ["homework", "واجب منزلي", "✏️", "I finish my homework before dinner.", "أنهي واجبي قبل العشاء."],
      ["university", "جامعة", "🏛️", "She studies at university.", "هي تدرس في الجامعة."], ["certificate", "شهادة (إثبات)", "📜", "I got a certificate.", "حصلتُ على شهادة."],
      ["research", "بحث علمي", "🔬", "He does research on energy.", "يجري بحثًا عن الطاقة."], ["grade", "درجة / علامة", "💯", "I got a good grade.", "حصلتُ على درجة جيدة."]]),
    T("personality", "B1", "🙂", "Personality", "الشخصية", [
      ["friendly", "ودود", "😊", "Our neighbours are friendly.", "جيراننا ودودون."], ["shy", "خجول", "🙈", "He is shy with new people.", "هو خجول مع الناس الجدد."],
      ["honest", "صادق", "🤝", "An honest person tells the truth.", "الشخص الصادق يقول الحقيقة."], ["polite", "مهذّب", "🙏", "Be polite to everyone.", "كن مهذبًا مع الجميع."],
      ["generous", "كريم", "🎁", "She is very generous.", "هي كريمة جدًا."], ["lazy", "كسول", "🦥", "I feel lazy on Sundays.", "أشعر بالكسل أيام الأحد."],
      ["patient", "صبور", "⏳", "Teachers must be patient.", "على المعلمين أن يكونوا صبورين."], ["creative", "مبدع", "🎨", "She has creative ideas.", "عندها أفكار مبدعة."],
      ["confident", "واثق", "😎", "He feels confident in meetings.", "يشعر بالثقة في الاجتماعات."], ["curious", "فضولي", "🧐", "Children are curious.", "الأطفال فضوليون."]]),
    T("money", "B1", "🏦", "Money and banking", "المال والبنوك", [
      ["account", "حساب", "🏦", "I opened a bank account.", "فتحتُ حسابًا مصرفيًا."], ["loan", "قرض", "🏦", "He took a loan to buy a house.", "أخذ قرضًا ليشتري بيتًا."],
      ["interest", "فائدة", "📈", "The interest rate is low.", "سعر الفائدة منخفض."], ["budget", "ميزانية", "📊", "We need a monthly budget.", "نحتاج ميزانية شهرية."],
      ["savings", "مدّخرات", "🐖", "I put money in my savings.", "أضع المال في مدّخراتي."], ["credit card", "بطاقة ائتمان", "💳", "Do you accept credit cards?", "هل تقبلون بطاقات الائتمان؟"],
      ["bill", "فاتورة", "🧾", "I pay the electricity bill.", "أدفع فاتورة الكهرباء."], ["income", "دخل", "💵", "Her income is low.", "دخلها منخفض."],
      ["expense", "مصروف", "💸", "Rent is my biggest expense.", "الإيجار أكبر مصروفاتي."], ["debt", "دَين", "📉", "He is paying off his debt.", "هو يسدّد دَينه."]]),
    T("society", "B1", "🏛️", "News and society", "الأخبار والمجتمع", [
      ["government", "حكومة", "🏛️", "The government announced a new plan.", "أعلنت الحكومة خطة جديدة."], ["election", "انتخابات", "🗳️", "The election is next month.", "الانتخابات الشهر القادم."],
      ["law", "قانون", "⚖️", "Everyone must follow the law.", "على الجميع اتّباع القانون."], ["citizen", "مواطن", "🧑", "Every citizen has rights.", "لكل مواطن حقوق."],
      ["crime", "جريمة", "🚨", "Crime has fallen this year.", "انخفضت الجريمة هذا العام."], ["population", "عدد السكان", "👥", "The population is growing.", "عدد السكان يزداد."],
      ["community", "مجتمع محلي", "🏘️", "Our community is very close.", "مجتمعنا المحلي متقارب جدًا."], ["opinion", "رأي", "💬", "In my opinion, it's a good idea.", "في رأيي، هذه فكرة جيدة."],
      ["news", "أخبار", "📰", "I read the news every morning.", "أقرأ الأخبار كل صباح."], ["public", "عامّ", "👥", "Public transport is cheap.", "المواصلات العامة رخيصة."]])
  ];
  const lex = {};
  topics.forEach(t => t.words.forEach(w => { lex[w[0].toLowerCase()] = w[1]; }));
  window.EL.data.vocab = { topics, lex };
})();

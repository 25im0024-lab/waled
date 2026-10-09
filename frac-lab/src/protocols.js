/* Frac-Fluid Lab — experiment protocols and method notes (Arabic with English technical terms). */
window.PROTO = {
rheo: `
<p class="pnote">الهدف: منحنى التدفق (flow curve) في حالة الاستقرار (steady state)، ثم مطابقته (fitting) مع نماذج Power-law و Herschel-Bulkley و Carreau.</p>
<ol>
<li><b>تحضير الجل (hydration):</b>
  <ul>
  <li>أضف الـ guar ببطء إلى دوامة الماء (vortex) في خلاط بسرعة ثابتة، لتجنّب التكتلات (fish-eyes).</li>
  <li>اترك البوليمر يتميّه زمناً ثابتاً ومسجّلاً قبل أي إضافة (عادةً 30 دقيقة أو أكثر).</li>
  <li>أضف بقية المكوّنات بترتيب ثابت في كل مرة، وسجّل الـ pH ودرجة الحرارة.</li>
  </ul></li>
<li><b>إزالة الفقاعات (degassing):</b> اترك العينة ترتاح، أو استخدم طرداً مركزياً خفيفاً. الفقاعات تخفض اللزوجة المقاسة.</li>
<li><b>اختيار الـ geometry:</b>
  <ul>
  <li>concentric cylinder (bob &amp; cup): للسوائل منخفضة اللزوجة والجل الخطي.</li>
  <li>cone-plate أو parallel-plate: للعينات الصغيرة والجل القوي.</li>
  <li>استخدم solvent trap عند الحرارة العالية لمنع التبخر.</li>
  </ul></li>
<li><b>التحميل والتوازن الحراري:</b> حمّل الحجم الصحيح، وانتظر 5 إلى 10 دقائق عند درجة حرارة القياس.</li>
<li><b>الـ pre-shear:</b> طبّق مثلاً 100 s⁻¹ لمدة 60 s، ثم راحة 60 إلى 120 s. هذه الخطوة تمسح أثر التحميل. استخدم الإعدادات نفسها لكل العينات.</li>
<li><b>الـ shear-rate sweep:</b>
  <ul>
  <li>مسح لوغاريتمي من 1000 إلى 0.1 s⁻¹ تقريباً، بـ 5 إلى 10 نقاط في كل decade.</li>
  <li>فعّل معيار الاستقرار (steady-state criterion) لكل نقطة.</li>
  </ul></li>
<li><b>فحص صلاحية النقاط:</b>
  <ul>
  <li>احذف كل نقطة عزمها (torque) أقل من الحد الأدنى للجهاز.</li>
  <li>عند المعدلات العالية في السوائل الخفيفة، احذف النقاط المتأثرة بالـ inertia أو Taylor vortices.</li>
  <li>إن شككت في الانزلاق عند الجدار (wall slip)، أعد القياس بفجوة (gap) مختلفة أو بسطوح خشنة.</li>
  </ul></li>
<li><b>التكرار:</b> 3 عينات جديدة على الأقل. أدخل المتوسط هنا، وسجّل الـ SD.</li>
<li><b>الإدخال:</b>
  <ul>
  <li>الصق عمودين: γ̇ (s⁻¹) واللزوجة η (mPa·s)، أو τ (Pa)، أو قراءات Fann 35 (rpm ثم قراءة القرص).</li>
  <li>إن كان البحث يعطي K′ و n′ فقط، اختر "Parameters".</li>
  </ul></li>
</ol>
<p class="pnote"><b>التفسير:</b></p>
<ul>
<li>n &lt; 1 يعني shear-thinning.</li>
<li>τ₀ في Herschel-Bulkley هو apparent yield stress، أي ناتج مطابقة وليس قياساً مباشراً.</li>
<li>η₀ في Carreau هي لزوجة الهضبة عند القص الصفري. و 1/λ تقريباً معدل القص الذي يبدأ عنده الـ shear-thinning.</li>
<li>اختيار النموذج بالـ AICc: القيمة الأقل أفضل. الفرق الأقل من 2 لا يرجّح نموذجاً على آخر (Burnham &amp; Anderson, 2002).</li>
<li>الـ 95 % CI من نوع Wald، أي ± t·SE. لا يُعتمد عليه إذا كان المعامل عند حدّه (مثل τ₀ = 0)، أو إذا كانت البيانات لا تغطي منطقة المعامل (مثل λ إذا لم تظهر الهضبة).</li>
</ul>
<p class="pnote"><b>فضاء المطابقة (fitting space):</b></p>
<ul>
<li>"log" يقلّل الخطأ النسبي. هو المناسب عندما تمتد البيانات عدة decades.</li>
<li>"linear" يعطي وزناً أكبر للإجهادات العالية.</li>
<li>عند المقارنة مع بحث، استخدم الفضاء نفسه الذي استخدمه البحث إن ذكره. قيمة R² تختلف بين الفضاءين.</li>
</ul>`,

thermal: `
<p class="pnote">الهدف: معرفة كيف تتغير اللزوجة مع الزمن والحرارة تحت قص ثابت (shear and thermal stability)، على نمط API RP 39 / ISO 13503-1.</p>
<ol>
<li><b>الجهاز:</b> استخدم HPHT rotational rheometer بخلية مضغوطة، مثل Fann 50 أو Grace M5600 أو Anton Paar مع pressure cell.
  <ul><li>طبّق ضغط N₂ أعلى من ضغط بخار الماء عند حرارة الاختبار (عادة بضع مئات psi) لمنع الغليان.</li></ul></li>
<li><b>التحميل:</b> املأ الخلية بالحجم المحدد بعد تحضير الجل وإزالة الفقاعات، وأغلقها.</li>
<li><b>القص الثابت:</b> ابدأ عند 170 s⁻¹ أو 100 s⁻¹، وسجّل القيمة المستخدمة في حقل "shear rate".</li>
<li><b>التسخين:</b> سخّن بمعدل ثابت ومسجّل (مثلاً 2 إلى 5 °C/min) حتى حرارة الاختبار.</li>
<li><b>الثبات (hold):</b> ثبّت الحرارة 60 إلى 120 دقيقة.
  <ul><li>سجّل t و T و η كل 30 إلى 60 ثانية.</li></ul></li>
<li><b>اختياري:</b> مسح قص قصير (shear ramp) كل 30 دقيقة لحساب n′ و K′ عند الحرارة. هذا جزء من إجراءات API RP 39 / ISO 13503-1.
  <ul><li>أدخل n′ و K′ الناتجة في تبويب الريولوجيا (Parameters) لاستخدامها في حساب الكسر عند حرارة المكمن.</li></ul></li>
<li><b>الإدخال:</b> ثلاثة أعمدة: الزمن (min)، والحرارة (°C)، واللزوجة (mPa·s).</li>
</ol>
<p class="pnote"><b>ما تحسبه الأداة:</b></p>
<ul>
<li><b>نسبة الاحتفاظ:</b> retention = η(نهاية الاختبار) ÷ η(المرجع) × 100. المرجع إما بداية الـ hold (بعد الوصول إلى الحرارة)، أو أول قراءة.</li>
<li><b>زمن الهبوط:</b> أول زمن تنخفض فيه اللزوجة تحت العتبة.</li>
<li><b>معدل التحلل:</b> ln η = a − k·t خلال الـ hold. منه k و t½ = ln2/k.</li>
<li><b>طاقة التنشيط للتدفق:</b> E<sub>a</sub> من ln η مقابل 1/T خلال مرحلة التسخين. هذا الجزء يخلط أثر الحرارة مع أي تحلل يحدث أثناء التسخين.</li>
</ul>
<p class="pnote"><b>العتبة:</b> المعيار الشائع في الأدبيات هو η ≥ 50 mPa·s عند 170 s⁻¹ بعد زمن الاختبار. هذا عُرف صناعي وليس شرطاً موحّداً في كل المواصفات، لذا اكتب المعيار الذي تعتمده في التقرير.</p>`,

ve: `
<p class="pnote">الهدف: قياس G′ (التخزين، المرونة) و G″ (الفقد، اللزوجة) بالاهتزاز (oscillation).</p>
<ol>
<li><b>Amplitude sweep أولاً:</b> عند تردد ثابت (1 Hz أو 10 rad/s)، امسح الـ strain من 0.01 % إلى 1000 % تقريباً.
  <ul>
  <li>تحدّد الأداة نهاية المنطقة الخطية (LVE limit)، وهي حيث ينخفض G′ عن الهضبة بنسبة التسامح (5 % افتراضياً).</li>
  <li>وتحدّد نقطة التدفق (flow point)، وهي حيث G′ = G″.</li>
  </ul></li>
<li><b>Frequency sweep:</b> من 0.1 إلى 100 rad/s عند strain داخل المنطقة الخطية (مثلاً نصف الـ LVE limit). نفّذه عند الحرارة نفسها.</li>
<li><b>فحص الصلاحية:</b>
  <ul>
  <li>عند الترددات العالية: انتبه للـ instrument inertia. إن اقتربت raw phase angle من 180°، فالنقطة غير صالحة.</li>
  <li>عند الترددات المنخفضة: انتبه للعزم المنخفض.</li>
  <li>استخدم solvent trap.</li>
  </ul></li>
<li><b>Time sweep (اختياري):</b> عند ω و γ ثابتين، لمتابعة تكوّن الجل أو تحلله مع الزمن.</li>
<li><b>الإدخال:</b> ثلاثة أعمدة: ω (rad/s، أو Hz مع اختيار الوحدة) أو الـ strain (%)، ثم G′ (Pa)، ثم G″ (Pa).</li>
</ol>
<p class="pnote"><b>التفسير:</b></p>
<ul>
<li>G′ &gt; G″ في كل المدى: سلوك gel-like.</li>
<li>التقاطع عند ω<sub>c</sub> يعطي زمن ارتخاء تقريبي λ ≈ 1/ω<sub>c</sub>، وهو تقدير Maxwell أحادي النمط.</li>
<li>الأداة تطابق أيضاً single-mode Maxwell على G′ و G″ معاً. إذا كانت المطابقة رديئة، فهذا يعني توزيعاً من أزمنة الارتخاء.</li>
<li>ميل G′ و G″ عند الترددات المنخفضة يقارَن بـ 2 و 1 (المنطقة الطرفية، terminal zone).</li>
<li>tan δ = G″/G′. قيمة أقل من 1 تعني أن المرونة غالبة.</li>
<li>المرونة العالية (G′ كبير و tan δ منخفض) ترتبط في الأدبيات بتعليق أفضل للـ proppant. لكن العلاقة الكمية تعتمد على النظام، فلا تستنتجها من G′ وحده.</li>
</ul>`,

prop: `
<p class="pnote">الهدف: سرعة ترسيب حبيبة الـ proppant في الجل.</p>
<p class="pnote"><b>الحساب:</b> الأداة تأخذ ريولوجيا كل عينة من تبويب الريولوجيا (النموذج الذي تختاره)، ثم:</p>
<ul>
<li>تحسب اللزوجة الظاهرية عند معدل القص المميِّز γ̇ = v/d.</li>
<li>تستخدم منحنى الـ drag (Schiller-Naumann)، مع معامل تصحيح X(n) اختياري.</li>
<li>في الجريان الزاحف (creeping flow) لمائع Power-law، تساوي النتيجة تماماً المعادلة المناظرة لـ Stokes:<br>
  v = [g·Δρ·d<sup>n+1</sup> / (18·K·X)]<sup>1/n</sup></li>
<li>الترسيب المعاق (hindered settling) بمعادلة Richardson-Zaki: v<sub>h</sub> = v·(1−φ)<sup>m</sup>.</li>
</ul>
<ol>
<li><b>اختبار الحبيبة المفردة (single-particle):</b>
  <ul>
  <li>قِس قطر الحبيبات بالمجهر أو الغربال.</li>
  <li>املأ أسطوانة شفافة بالجل عند حرارة الاختبار، وأزل الفقاعات.</li>
  <li>اجعل قطر الأسطوانة أكبر بكثير من قطر الحبيبة (d/D صغيرة، مثلاً أقل من 0.05)، لتقليل أثر الجدار.</li>
  <li>أسقط الحبيبة في المحور، وابدأ التوقيت بعد مسافة كافية لبلوغ السرعة النهائية.</li>
  <li>قِس زمن المرور بين علامتين (أو استخدم فيديو).</li>
  <li>كرّر مع 10 حبيبات على الأقل، وأدخل المتوسط في "السرعة المقاسة".</li>
  </ul></li>
<li><b>اختبار الترسيب الساكن (static settling):</b>
  <ul>
  <li>اخلط الـ proppant بالتركيز المطلوب (ppa) في أسطوانة مدرّجة عند الحرارة.</li>
  <li>سجّل ارتفاع السائل الصافي فوق المعلّق مع الزمن.</li>
  <li>ميل الجزء الخطي الأول هو سرعة الترسيب المعاق. قارنها بـ v<sub>h</sub>.</li>
  </ul></li>
</ol>
<p class="pnote"><b>حدود الحساب:</b></p>
<ul>
<li><b>استقراء الـ Power-law:</b> يتنبأ بلزوجة لانهائية عند قص يقترب من الصفر. إذا كان γ̇ = v/d أقل من أدنى معدل قص قِسته، فالنتيجة استقراء (extrapolation). الأفضل حينها اختيار Carreau.</li>
<li><b>المرونة والقص:</b> الحساب لا يشمل المرونة (التي قد تبطئ الترسيب)، ولا القص الناتج عن جريان المائع في الكسر (الذي يخفض اللزوجة ويسرّع الترسيب).</li>
<li><b>المائع الذي له yield stress:</b> تعرض الأداة Y = τ₀/(g·Δρ·d). القيم الحرجة في الأدبيات (Chhabra &amp; Richardson, 2008) تتراوح تقريباً بين 0.04 و 0.2 حسب التعريف والتجربة، فاعتبرها مؤشراً فقط.</li>
</ul>`,

brk: `
<p class="pnote">الهدف: سرعة كسر الجل بالـ breaker، وكمية البقايا (residue) التي يتركها في الـ proppant pack.</p>
<ol>
<li><b>حركية الكسر:</b>
  <ul>
  <li>حضّر الجل، وأضف الـ breaker (مثل APS أو إنزيم أو encapsulated breaker) بتركيز محدد.</li>
  <li><b>الطريقة الأولى:</b> القياس المستمر في الـ rheometer عند حرارة الاختبار و 170 s⁻¹.</li>
  <li><b>الطريقة الثانية:</b> عيّنات في أوعية مغلقة داخل حمام مائي، تُسحب على فترات وتُقاس اللزوجة. سجّل إن كان القياس عند حرارة الاختبار أم بعد التبريد، لأن النتائج تختلف.</li>
  </ul></li>
<li><b>معيار الكسر:</b> عادةً لزوجة السائل المكسور ≤ 5 إلى 10 mPa·s (في كثير من الأبحاث وفق SY/T 5107). اكتب المعيار الذي تعتمده.</li>
<li><b>الـ residue (طريقة وزنية):</b>
  <ul>
  <li>خذ حجماً معروفاً (V) من السائل المكسور كلياً.</li>
  <li>اطرده مركزياً (مثلاً حوالي 3000 rpm لمدة 30 min، أو حسب المواصفة التي تتبعها).</li>
  <li>أزل الطبقة العليا، واغسل الراسب بالماء، ثم أعد الطرد.</li>
  <li>جفّف عند 105 °C حتى ثبات الوزن، وزِن بميزان دقته 0.1 mg.</li>
  </ul></li>
<li><b>عيّنة الـ blank:</b> نفّذ الإجراء نفسه على محلول بلا بوليمر (ماء مع الـ breaker والإضافات)، واطرح كتلة بقاياه. هذا يفصل أثر الأملاح عن بقايا البوليمر.</li>
<li><b>Arrhenius (اختياري):</b> كرّر حركية الكسر عند 3 درجات حرارة أو أكثر، وأدخل k الناتج مع T لحساب طاقة تنشيط تفاعل الكسر.</li>
</ol>
<p class="pnote"><b>النماذج:</b></p>
<ul>
<li>First-order: ln η = ln η₀ − k·t.</li>
<li>First-order مع هضبة: η = η∞ + (η₀ − η∞)·e<sup>−k·t</sup>. هي الأنسب عندما تقترب اللزوجة من قيمة الماء والأملاح.</li>
<li>t½ = ln 2 / k.</li>
</ul>
<p class="pnote"><b>الـ residue:</b> mg/L = Δm ÷ V. والنسبة من البوليمر = Δm ÷ (تركيز البوليمر × V) × 100.</p>`,

frac: `
<p class="pnote">الهدف: معرفة أثر ريولوجيا الجل والتسرّب (leak-off) على هندسة الكسر وكفاءة المائع، بنموذجين ثنائيي الأبعاد.</p>
<ul>
<li><b>PKN:</b> ارتفاع ثابت، والطول أكبر بكثير من الارتفاع (x<sub>f</sub> ≫ h).</li>
<li><b>KGD:</b> الارتفاع أكبر من الطول، أو انفعال مستوٍ أفقي.</li>
</ul>
<ol>
<li><b>اختبار الـ fluid loss (static):</b>
  <ul>
  <li>استخدم HTHP filter press بقرص ترشيح أو لب صخري، على نمط API RP 39 / ISO 13503-4.</li>
  <li>طبّق فرق ضغط ثابتاً (عادة 1000 psi) عند الحرارة.</li>
  <li>سجّل حجم الراشح التراكمي عند 1، 4، 9، 16، 25، 36 min.</li>
  <li>أدخل t و V ومساحة الترشيح A. الأداة ترسم V/A مقابل √t:
    <ul><li>الميل = 2·C<sub>w</sub>.</li><li>التقاطع = spurt (S<sub>p</sub>).</li></ul></li>
  </ul></li>
<li><b>بيانات العملية:</b> معدل الضخ الكلي، وزمن الضخ، وارتفاع الكسر، ومعامل يونغ E، ونسبة بواسون ν.</li>
<li><b>ريولوجيا المائع:</b> تؤخذ تلقائياً من مطابقة Power-law في تبويب الريولوجيا لكل عينة.
  <ul><li>الأدق أن تستخدم K′ و n′ عند حرارة المكمن من اختبار الثبات الحراري، بإدخالها كـ Parameters.</li></ul></li>
</ol>
<p class="pnote"><b>طريقة الحساب:</b></p>
<ul>
<li><b>علاقة العرض بالطول</b> (q لكل جناح)، مشتقة من حلّي Nordgren (1972) و Geertsma-de Klerk (1969) دون تسرّب:
  <ul>
  <li>PKN: w<sub>w</sub> = 2.75·[(1−ν)·μ·q<sub>w</sub>·L/G]<sup>1/4</sup></li>
  <li>KGD: w<sub>w</sub> = 2.27·[(1−ν)·μ·q<sub>w</sub>·L²/(G·h)]<sup>1/4</sup></li>
  </ul></li>
<li><b>التوازن الحجمي مع التسرّب:</b> معادلة Carter (Howard &amp; Fast, 1957).</li>
<li><b>مائع Power-law:</b> لزوجة نيوتنية مكافئة لجريان الشقّ (slot flow) عند العرض المتوسط:
  <ul><li>μ<sub>e</sub> = K·((2n+1)/3n)<sup>n</sup>·(6·q<sub>w</sub>/(h·w̄²))<sup>n−1</sup></li></ul></li>
<li>تُحل المعادلات بالتكرار. اختُبرت مقابل الحلول الأصلية بلا تسرّب: الفرق حتى 5 % في PKN (بسبب افتراض شكل المقطع)، وأقل من 1 % في KGD.</li>
</ul>
<p class="pnote"><b>حدود الحساب:</b> نماذج 2D ذات ارتفاع ثابت. لا تشمل: tip effects، ولا fracture toughness، ولا الـ proppant، ولا تغيّر الحرارة على طول الكسر. هي للمقارنة النسبية بين سائلين وليست تصميماً لعملية حقيقية.</p>`,

surf: `
<p class="pnote">الهدف: قياس الـ surface tension للمحاليل، والـ CMC، والـ interfacial tension (IFT) بين الماء والزيت.</p>
<ol>
<li><b>النظافة والحرارة:</b>
  <ul>
  <li>نظّف الأواني الزجاجية جيداً.</li>
  <li>نظّف حلقة أو صفيحة الـ platinum باللهب حتى الاحمرار بعد غسلها.</li>
  <li>اضبط الحرارة، مثلاً 25 ± 0.1 °C.</li>
  <li>تحقّق بالماء المقطّر: يجب أن يعطي حوالي 72.0 mN/m عند 25 °C.</li>
  </ul></li>
<li><b>سلسلة التخفيف:</b>
  <ul>
  <li>حضّر محلولاً أساسياً (stock)، وخفّفه بخطوات لوغاريتمية تغطي ما تحت الـ CMC وما فوقها بوضوح (ثلاث نقاط على الأقل فوقها).</li>
  <li>قِس من التركيز الأقل إلى الأعلى.</li>
  </ul></li>
<li><b>التوازن:</b>
  <ul>
  <li>جزيئات الـ surfactant تحتاج زمناً لتصل إلى السطح.</li>
  <li>انتظر حتى تستقر القراءة (التغير أقل من 0.1 mN/m خلال دقائق)، أو سجّل القراءة مع الزمن.</li>
  <li>خذ 3 قراءات على الأقل لكل تركيز.</li>
  </ul></li>
<li><b>Du Noüy ring:</b> القراءة الخام تحتاج تصحيحاً (Harkins-Jordan أو Zuidema-Waters). إذا كان جهازك يطبّق التصحيح تلقائياً، فأدخل القيمة المصحّحة مباشرة. <b>Wilhelmy plate:</b> لا تحتاج تصحيحاً إذا كانت الصفيحة مبللة تماماً (θ ≈ 0).</li>
<li><b>الـ IFT:</b>
  <ul>
  <li>Pendant drop: للقيم الأعلى من حوالي 1 mN/m.</li>
  <li>Spinning drop: للقيم المنخفضة جداً (ultralow، أقل من 10⁻² mN/m).</li>
  <li>في الـ spinning drop: قِس كثافتي الطورين، واختر سرعة دوران تجعل طول القطرة أكبر من 4 أضعاف قطرها، وانتظر الاتزان (قد يستغرق 30 دقيقة أو أكثر في أنظمة الـ microemulsion).</li>
  <li>القطر الظاهري يُقسم على معامل انكسار الطور الثقيل. الأداة تفعل ذلك إذا أدخلته.</li>
  </ul></li>
<li><b>الإدخال:</b>
  <ul>
  <li>جدول التركيز و γ (mN/m) لحساب الـ CMC.</li>
  <li>جدول المتغير (ملوحة، نسبة co-surfactant، زمن...) و IFT لإيجاد أقل قيمة.</li>
  </ul></li>
</ol>
<p class="pnote"><b>الحساب:</b></p>
<ul>
<li><b>الـ CMC:</b> تقاطع خطين في γ مقابل ln C. الأداة تختار نقطة الانكسار التي تعطي أقل مجموع مربعات.</li>
<li><b>معادلة Gibbs:</b>
  <ul>
  <li>Γ<sub>max</sub> = −(1/nRT)·dγ/dlnC، من الخط الذي قبل الـ CMC.</li>
  <li>n = 1 للـ surfactant غير الأيوني، أو الأيوني بوجود ملح زائد.</li>
  <li>n = 2 للـ surfactant أيوني 1:1 بلا ملح، مثل sodium oleate في الماء النقي.</li>
  <li>A<sub>min</sub> = 1/(N<sub>A</sub>·Γ<sub>max</sub>).</li>
  </ul></li>
<li><b>pC20:</b> = −log C20، حيث C20 التركيز الذي يخفض γ بمقدار 20 mN/m. يحتاج وحدة مولية أو الكتلة المولية.</li>
</ul>`,
};

window.METHODS = `
<h3>المعادلات والافتراضات</h3>
<ul>
<li><b>Power-law:</b> τ = K·γ̇ⁿ</li>
<li><b>Herschel-Bulkley:</b> τ = τ₀ + K·γ̇ⁿ</li>
<li><b>Carreau:</b> η = η∞ + (η₀ − η∞)·[1 + (λγ̇)²]<sup>(n−1)/2</sup>. تُثبَّت η∞ (صفر افتراضياً) أو تُطابَق.</li>
<li><b>المطابقة:</b> Levenberg-Marquardt على τ، في فضاء log أو linear. الـ 95 % CI = p ± t(0.975, N−P)·SE، و SE من s²(JᵀJ)⁻¹.</li>
<li><b>مقاييس الجودة:</b>
  <ul>
  <li>R² في فضاء المطابقة.</li>
  <li>R²(τ) في الفضاء الخطي.</li>
  <li>MAPE.</li>
  <li>AICc = N·ln(SSR/N) + 2P + 2P(P+1)/(N−P−1).</li>
  </ul></li>
<li><b>Fann 35</b> (R1B1، spring F1): γ̇ = 1.7023·rpm، و τ = 0.511·θ Pa.</li>
<li><b>الثبات الحراري:</b> تحلل من الرتبة الأولى أثناء الـ hold، و Arrhenius أثناء التسخين.</li>
<li><b>الاهتزاز:</b>
  <ul>
  <li>التقاطع بالاستيفاء الخطي في المحورين اللوغاريتميين (log-log).</li>
  <li>Maxwell: G′ = G(ωλ)²/(1+(ωλ)²)، و G″ = Gωλ/(1+(ωλ)²).</li>
  </ul></li>
<li><b>الترسيب:</b>
  <ul>
  <li>Schiller-Naumann (Re &lt; 1000): C<sub>D</sub> = 24X/Re·(1+0.15Re<sup>0.687</sup>)</li>
  <li>اللزوجة الظاهرية عند γ̇ = v/d.</li>
  <li>Richardson-Zaki: m = 4.65 (Re &lt; 0.2)، و 4.4·Re<sup>−0.03</sup> (حتى 1)، و 4.4·Re<sup>−0.1</sup> (حتى 500)، و 2.39 (فوق 500).</li>
  <li>φ من ppa: φ = (C/(8.3454·SG)) / (1 + C/(8.3454·SG)).</li>
  </ul></li>
<li><b>الكسر:</b> انظر تبويب الكسر. الضغط الصافي (p<sub>net</sub>):
  <ul>
  <li>PKN: G·w<sub>w</sub>/((1−ν)·h)</li>
  <li>KGD: G·w<sub>w</sub>/(2(1−ν)·L)</li>
  </ul></li>
<li><b>Zuidema-Waters:</b> f = 0.7250 + √(0.01452·P/(C²·Δρ) + 0.04534 − 1.679·r/R)</li>
<li><b>Vonnegut:</b> γ = Δρ·ω²·r³/4</li>
</ul>
<h3>المراجع <small>(تحقق من الـ DOI قبل الاقتباس؛ ما لم أتأكد منه موسوم بذلك)</small></h3>
<ul class="refs">
<li>Herschel, W.H., Bulkley, R. (1926). Konsistenzmessungen von Gummi-Benzollösungen. <i>Kolloid-Zeitschrift</i> 39, 291–300.</li>
<li>Carreau, P.J. (1972). Rheological equations from molecular network theories. <i>Transactions of the Society of Rheology</i> 16, 99–127. DOI 10.1122/1.549276</li>
<li>Burnham, K.P., Anderson, D.R. (2002). <i>Model Selection and Multimodel Inference</i>, 2nd ed. Springer.</li>
<li>Mezger, T.G. <i>The Rheology Handbook</i>. Vincentz Network (عدة طبعات).</li>
<li>API RP 39 (1998, 3rd ed.). Recommended Practices on Measuring the Viscous Properties of a Cross-linked Water-based Fracturing Fluid. حلّت محلها ISO 13503-1 / API RP 13M.</li>
<li>ISO 13503-1:2011. Completion fluids and materials — Part 1: Measurement of viscous properties of completion fluids.</li>
<li>ISO 13503-4:2006. Completion fluids and materials — Part 4: Procedure for measuring stimulation and gravel-pack fluid leakoff under static conditions.</li>
<li>SY/T 5107-2016 (China). Evaluation measurement for properties of water-based fracturing fluid. <small>(متوسط الثقة في تفاصيل الأرقام، مثل سرعة الطرد ومعيار اللزوجة، فارجع إلى النص)</small></li>
<li>Howard, G.C., Fast, C.R. (1957). Optimum fluid characteristics for fracture extension. <i>Drilling and Production Practice</i>, API, 261–270. (يتضمن معادلة Carter)</li>
<li>Perkins, T.K., Kern, L.R. (1961). Widths of hydraulic fractures. <i>Journal of Petroleum Technology</i> 13(9), 937–949. DOI 10.2118/89-PA</li>
<li>Nordgren, R.P. (1972). Propagation of a vertical hydraulic fracture. <i>SPE Journal</i> 12(4), 306–314. DOI 10.2118/3009-PA</li>
<li>Geertsma, J., de Klerk, F. (1969). A rapid method of predicting width and extent of hydraulically induced fractures. <i>JPT</i> 21(12), 1571–1581. DOI 10.2118/2458-PA</li>
<li>Valkó, P., Economides, M.J. (1995). <i>Hydraulic Fracture Mechanics</i>. Wiley.</li>
<li>Economides, M.J., Nolte, K.G. (eds.) (2000). <i>Reservoir Stimulation</i>, 3rd ed. Wiley.</li>
<li>Schiller, L., Naumann, A. (1933). Über die grundlegenden Berechnungen bei der Schwerkraftaufbereitung. <i>Z. Ver. Deutsch. Ing.</i> 77, 318–320.</li>
<li>Richardson, J.F., Zaki, W.N. (1954). Sedimentation and fluidisation: Part I. <i>Trans. Inst. Chem. Eng.</i> 32, 35–53.</li>
<li>Chhabra, R.P., Richardson, J.F. (2008). <i>Non-Newtonian Flow and Applied Rheology</i>, 2nd ed. Butterworth-Heinemann.</li>
<li>Zuidema, H.H., Waters, G.W. (1941). Ring method for the determination of interfacial tension. <i>Ind. Eng. Chem. Anal. Ed.</i> 13, 312–313.</li>
<li>Harkins, W.D., Jordan, H.F. (1930). A method for the determination of surface and interfacial tension from the maximum pull on a ring. <i>JACS</i> 52, 1751–1772.</li>
<li>Vonnegut, B. (1942). Rotating bubble method for the determination of surface and interfacial tensions. <i>Rev. Sci. Instrum.</i> 13, 6–9. DOI 10.1063/1.1769937</li>
<li>Rosen, M.J., Kunjappu, J.T. (2012). <i>Surfactants and Interfacial Phenomena</i>, 4th ed. Wiley.</li>
</ul>
<p class="pnote">ثوابت الحلول الأصلية (0.68 و 2.5 لـ Nordgren، و 0.48 و 1.32 لـ Geertsma-de Klerk) من Valkó &amp; Economides (1995) كما أذكرها. تحقق منها في الكتاب قبل اقتباسها، والاختبارات في <code>tests/core-test.js</code> تتحقق من الاتساق الحجمي فقط.</p>`;

# UHS-MD: محاكاة Molecular Dynamics لتخزين الهيدروجين في مكامن الكربونات (LAMMPS)

نموذج جاهز للتشغيل يدرس تفاعل **H2** مع **cushion gas** (CO2 أو CH4 أو N2) داخل **slit nanopore** في **calcite (10-14)**، بحضور **brine / formation water** وتأثير **bacteria** ممثَّلاً بنواتج الأيض.

> **تنبيه قبل أي نتائج للنشر:** بارامترات Lennard-Jones الخاصة بالـ calcite في [`ff/calcite.json`](ff/calcite.json) قيم مؤقتة (placeholder) وليست مجموعة منشورة، والملف معلَّم `"verified": false`. لن يعمل `build_system.py` إلا إذا أدخلت القيم الأصلية وغيّرت العلامة إلى `true`، أو مرّرت `--accept-unverified-calcite` لاختبار التشغيل فقط. التفاصيل في قسم "Force field".

---

## 1. النظام المُحاكى

```
 z ↑
   |  calcite slab (periodic image)   ← السطح المقابل للمسام
   |  brine film (NaCl + H2O)          ← طبقة ماء على جدار water-wet
   |  H2 + cushion gas (+ CH4 حيوي)    ← الطور الغازي في وسط المسام
   |  brine film
   |  calcite (10-14) slab, rigid     ← z = 0
```

- **Calcite (10-14):** وهو المستوى الأكثر استقراراً وانتشاراً في بلورات calcite. البناء من البنية البلورية R-3c (Effenberger et al., 1981). خلية السطح 4.99 × 8.10 Å، والمسافة بين الطبقات 3.035 Å. تحقّقتُ من الهندسة: Ca–O = 2.36 Å، و Ca السطحي خماسي التناسق مقابل سداسي في الداخل.
- **Periodic في الاتجاهات الثلاثة:** صورة الشريحة الدورية تغلق المسام، فلا يحتاج النموذج إلى wall potential ولا إلى slab correction للـ Ewald.
- **كمية الغاز** تُحسب من كثافة الخليط عند (T, P) باستخدام CoolProp (معادلة HEOS، وعند فشلها Peng-Robinson).
- **Brine:** ماء SPC/E مع NaCl بالـ molality المطلوبة. الكثافة من الماء النقي، والأيونات تأخذ مواقع جزيئات ماء.

## 2. تمثيل البكتيريا: ما يمكن وما لا يمكن

**حقيقة أساسية:** لا يمكن محاكاة خلية بكتيرية بـ all-atom MD. حجم الخلية نحو 1 µm، ونشاطها الأيضي يمتد ساعات إلى أيام. أما MD فيغطي صندوقاً بأبعاد نانومترات ولمدة nanoseconds، أي فرقاً بنحو 10 إلى 15 رتبة عشرية في الزمن.

لذلك يمثَّل تأثير البكتيريا بنواتج أيضها الكيميائية، وهذه الطريقة يمكن الدفاع عنها علمياً:

| المسار | التفاعل | التطبيق هنا |
|---|---|---|
| Hydrogenotrophic methanogenesis | 4 H2 + CO2 → CH4 + 2 H2O | ✅ `--bio methanogenesis --bio-conversion f` |
| Sulfate reduction (SRB) | 4 H2 + SO4²⁻ + 2H⁺ → H2S + 4 H2O | ❌ غير مطبَّق: يحتاج نموذج H2S و SO4²⁻ موثَّقاً متوافقاً مع SPC/E |
| Homoacetogenesis | 4 H2 + 2 CO2 → CH3COOH + 2 H2O | ❌ غير مطبَّق: يحتاج بارامترات acetate |
| Biofilm / EPS على السطح | تغيير wettability | ❌ يحتاج topology لسكريات متعددة (CHARMM36 / GLYCAM عبر CHARMM-GUI) |

في مسار methanogenesis يُحذف من H2 الكسرُ `f`، ويُستهلك CO2 من الـ cushion gas إن وُجد، ويضاف CH4 والماء الناتج. انخفاض عدد مولات الغاز (5 → 1) يعني هبوط الضغط، وهذا هو فقد الهيدروجين الحيوي المعروف حقلياً. إن لم يكن الـ cushion هو CO2، يُفترض أن مصدر الكربون هو HCO3⁻ من الكربونات، ولا يُحذف صراحةً (يُسجَّل في `system.json`).

## 3. Force field (وحدات `real`، و Lorentz-Berthelot للتفاعلات المتقاطعة)

| المكوّن | النموذج | المرجع | الثقة |
|---|---|---|---|
| Water | SPC/E، صلب (SHAKE) | Berendsen, Grigera & Straatsma, *J. Phys. Chem.* 91 (1987) 6269 | عالية |
| Na⁺, Cl⁻ | Joung-Cheatham (SPC/E) | Joung & Cheatham, *J. Phys. Chem. B* 112 (2008) 9020 | عالية |
| H2 | LJ أحادي الموقع، ε/k = 34.2 K، σ = 2.96 Å | Buch, *J. Chem. Phys.* 100 (1994) 7610 | عالية للقيم، مع حدود النموذج أدناه |
| CH4 | TraPPE-UA | Martin & Siepmann, *J. Phys. Chem. B* 102 (1998) 2569 | عالية |
| CO2, N2 | TraPPE، ثلاثي المواقع، صلب | Potoff & Siepmann, *AIChE J.* 47 (2001) 1676 | عالية |
| Calcite | **placeholder** | الشحنات (Ca +2، C +1.123282، O −1.041094) من ذاكرتي لنموذج Xiao, Edwards & Gräter, *J. Phys. Chem. C* 115 (2011) 20067. **لم أتحقق منها من المصدر.** قيم LJ عامة بأسلوب CHARMM وليست من Xiao. | **منخفضة: يجب التحقق** |

**قبل الإنتاج:** أدخل قيم ε و σ (والشحنات إن اختلفت) من الجدول الأصلي في الورقة إلى `ff/calcite.json`، ثم اجعل `"verified": true`. البديل الشائع هو نموذج Raiteri et al., *J. Phys. Chem. C* 114 (2010) 5997، لكنه Buckingham ويحتاج `pair_style hybrid/overlay`، والقالب الحالي لا يدعمه كما هو.

## 4. التشغيل

```bash
# المتطلبات
conda install -c conda-forge lammps   # يحتاج حزم MOLECULE و KSPACE و RIGID
pip install numpy CoolProp matplotlib

cd uhs-md
# 1) بناء النظام: CO2 كـ cushion بنسبة 30%، 60 °C، 10 MPa، 1 mol/kg NaCl، تحويل حيوي 10%
python3 build_system.py --cushion CO2 --x-cushion 0.3 --T 333.15 --P 10e6 \
        --molality 1.0 --bio methanogenesis --bio-conversion 0.10 --out runs/co2_bio

# 2) التشغيل (0.5 ns موازنة ثم 2 ns إنتاج افتراضياً)
cd runs/co2_bio && mpirun -np 8 lmp -in ../../in.uhs.lmp && cd ../..

# 3) التحليل
python3 analyze.py runs/co2_bio

# مصفوفة السيناريوهات كاملة: 3 غازات × 3 ملوحات × (مع/بدون بكتيريا)
NP=8 LMP=lmp ./run_matrix.sh
```

خيارات البناء الأساسية: `--pore` (عرض المسام بـ Å)، و `--water-film` (سماكة الـ brine على كل جدار، و 0 تعني مسام جافة)، و `--nx --ny --layers` (حجم الشريحة)، و `--seed`.

**بروتوكول `in.uhs.lmp`:** minimization، ثم 5 ps عند 0.5 fs، ثم NVT (Nosé-Hoover) عند 1 fs، ثم الإنتاج. التفاصيل:
- الماء مقيَّد بـ SHAKE.
- CO2 و N2 أجسام صلبة عبر `rigid/nvt/small`.
- شريحة calcite مجمَّدة.
- الـ Coulomb طويل المدى بـ PPPM بدقة 10⁻⁵.

اختبار التشغيل: على نواة واحدة ونظام من نحو 2900 ذرة، تبلغ السرعة نحو 4 ns/day.

## 5. المخرجات وما تعنيه

| الملف / المفتاح في `results.json` | المعنى الفيزيائي |
|---|---|
| `prof_*.dat`، `profiles.png` | توزيع كثافة كل نوع على z، ومنه طبقات الماء على calcite وتراكم الغاز عند السطح البيني |
| `x_H2_brine`، `K_H2_liq_over_gas` | ذوبانية H2 في الـ brine، ومعامل التوزيع بين السائل والغاز. هذا مصدر فقد الهيدروجين بالذوبان، وتأثير الملوحة هنا هو salting-out |
| `gas_centre_mole_fractions` | تركيب الغاز في وسط المسام، ومنه مدى اختلاط H2 بالـ cushion gas. هذا يحدد نقاوة الهيدروجين المسترجَع |
| `H2_interface_enrichment` | تراكم H2 عند سطح غاز-brine مقارنة بالغاز الحر |
| `H2_within_5A_of_surface_per_nm2` | امتزاز H2 مباشرة على calcite. له معنى في المسام الجافة فقط (`--water-film 0`) |
| `D_H2_lateral_m2_s` | معامل الانتشار الجانبي لـ H2 تحت الحصر |
| `energy_h2.dat` | طاقة تفاعل H2 مع calcite ومع الماء |
| `rdf.dat` | RDF لأزواج H2 مع Ow و Oc و Ca و CH4 و C(CO2)، ثم Ow مع Oc |
| `P_gas_Pzz_MPa` | الضغط العمودي في منطقة الغاز. **قارنه بالضغط المستهدف** |

## 6. الحدود (اقرأها قبل تفسير النتائج)

1. **الضغط غير متحكَّم به مباشرة.** يُحدَّد عدد جزيئات الغاز من كثافة الغاز الحر، لكن جزءاً منه يذوب أو يمتز فينخفض الضغط الفعلي. افحص `P_gas_Pzz_MPa` بعد ns واحد على الأقل، ثم عدّل `--P` وأعد البناء حتى يتطابق. منطقة الغاز صغيرة، لذا تقلبات Pzz كبيرة وتحتاج متوسطاً طويلاً.
2. **calcite صلب** ولا ذوبان فيه، وبلا كيمياء تفاعلية: لا pH، ولا توازن CO2/HCO3⁻/CO3²⁻، ولا ترسيب. ذوبان CO2 الفعلي يحمّض الـ brine ويذيب الكربونات، وهذا يحتاج ReaxFF أو نماذج geochemical (مثل PHREEQC) خارج نطاق هذا النموذج.
3. **H2 أحادي الموقع وكلاسيكي:** التأثيرات الكمية لـ H2 صغيرة عند 333 K لكنها غير صفرية، ولا quadrupole في هذا النموذج.
4. **التفاعلات المتقاطعة** (مثل H2–calcite و CO2–calcite) تأتي من Lorentz-Berthelot وغير معايرة على بيانات تجريبية.
5. **الحجم والزمن:** الأنظمة الافتراضية صغيرة (≈ 3000 ذرة) وزمن الإنتاج 2 ns. للنشر: كبّر `--nx --ny`، وأطل الإنتاج، وكرّر بثلاث seeds مختلفة على الأقل، وأبلغ عن الانحراف المعياري.
6. **الملح NaCl فقط.** formation water في الكربونات غني بـ Ca²⁺ و Mg²⁺ و SO4²⁻، وإضافتها تحتاج بارامترات متوافقة مع SPC/E.
7. **تحذيرات LAMMPS المتوقعة:** التحذير `Neighbor exclusions used with KSpace` ناتج عن استبعاد أزواج calcite–calcite المجمّدة، ويضيف إزاحة ثابتة في الطاقة لا تؤثر على القوى بين الموائع.

## 7. التحقق المقترح (validation) قبل استخدام النتائج

- **ذوبانية H2 في الماء أو الـ brine:** قارن `x_H2_brine` في نظام بلا calcite وبلا cushion مع بيانات Chabab et al., *Int. J. Hydrogen Energy* 45 (2020) 32206. ثقتي في هذا المرجع متوسطة إلى عالية، فتحقق من رقم المجلد والصفحة.
- **IFT بين H2 والماء:** Chow et al., *Fluid Phase Equilib.* 475 (2018) 37. الثقة متوسطة.
- **كثافة الغاز في وسط المسام** مقابل CoolProp عند الضغط المقاس.
- **calcite–water:** كثافة الطبقات الأولى للماء مقابل بيانات X-ray reflectivity (Fenter et al.)، كتحقق نوعي لبارامترات calcite بعد إدخالها.

## 8. الملفات

| الملف | الوظيفة |
|---|---|
| `build_system.py` | يبني `system.data` و `forcefield.lmp` و `system.lmp` و `system.json` |
| `ff/params.py` | بارامترات الماء والأيونات والغازات (موثَّقة) |
| `ff/calcite.json` | بارامترات calcite (**تحتاج تحققاً**) |
| `in.uhs.lmp` | مدخل LAMMPS: minimization، ثم equilibration، ثم production وجمع المخرجات |
| `analyze.py` | التحليل وإنتاج `results.json` و `profiles.png` |
| `run_matrix.sh` | مصفوفة السيناريوهات |
| `tests/test_build.py` | اختبارات البناء (حيادية الشحنة، سلامة الجزيئات، التداخل، stoichiometry) وتعمل في CI |

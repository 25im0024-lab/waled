"""
مثال تعليمي: نمذجة بسيطة لبنية وحدة حقل إنتاج نفطي بلغة Python
باستخدام البرمجة الكائنية (OOP) — كل مكوّن حقيقي في الحقل يصير Class

المكونات المغطاة:
- Well (البئر)
- Wellhead (رأس البئر)
- Separator (فاصل ثلاثي الطور: نفط/غاز/ماء)
- StorageTank (خزان تخزين)
- ProductionUnit (الوحدة الكاملة التي تجمع كل شي)
"""


class Well:
    """يمثل بئر إنتاج واحد"""

    def __init__(self, name, depth_m, reservoir_pressure_psi):
        self.name = name
        self.depth_m = depth_m
        self.reservoir_pressure_psi = reservoir_pressure_psi
        self.flow_rate_bpd = 0  # برميل يومياً

    def produce(self, rate_bpd):
        self.flow_rate_bpd = rate_bpd
        print(f"البئر {self.name} ينتج {rate_bpd} برميل/يوم")


class Wellhead:
    """رأس البئر: يتحكم بضغط وتدفق البئر قبل دخوله للمعدات السطحية"""

    def __init__(self, well: Well, choke_size_inch):
        self.well = well
        self.choke_size_inch = choke_size_inch

    def flowing_pressure(self):
        # معادلة تبسيطية فقط للتوضيح، مو دقيقة هندسياً
        return self.well.reservoir_pressure_psi * 0.6


class Separator:
    """فاصل ثلاثي الطور: يفصل النفط عن الغاز والماء"""

    def __init__(self, capacity_bpd):
        self.capacity_bpd = capacity_bpd

    def separate(self, mixed_flow_bpd):
        oil = mixed_flow_bpd * 0.7
        water = mixed_flow_bpd * 0.2
        gas = mixed_flow_bpd * 0.1
        return {"oil_bpd": oil, "water_bpd": water, "gas_bpd": gas}


class StorageTank:
    """خزان تخزين النفط المفصول قبل النقل"""

    def __init__(self, capacity_bbl):
        self.capacity_bbl = capacity_bbl
        self.current_level_bbl = 0

    def fill(self, oil_bpd):
        self.current_level_bbl += oil_bpd
        if self.current_level_bbl > self.capacity_bbl:
            print("تحذير: الخزان قارب على الامتلاء!")
            self.current_level_bbl = self.capacity_bbl


class ProductionUnit:
    """
    وحدة حقل الإنتاج الكاملة — تجمع كل المكونات وتديرها
    """

    def __init__(self, name):
        self.name = name
        self.wells = []
        self.separator = Separator(capacity_bpd=10000)
        self.storage_tank = StorageTank(capacity_bbl=50000)

    def add_well(self, well: Well):
        self.wells.append(well)

    def run_daily_cycle(self):
        print(f"\n--- تشغيل وحدة الإنتاج: {self.name} ---")
        total_flow = 0

        for well in self.wells:
            total_flow += well.flow_rate_bpd

        print(f"إجمالي التدفق من كل الآبار: {total_flow} برميل/يوم")

        separated = self.separator.separate(total_flow)
        print(f"بعد الفصل -> نفط: {separated['oil_bpd']:.0f} | "
              f"ماء: {separated['water_bpd']:.0f} | "
              f"غاز: {separated['gas_bpd']:.0f}")

        self.storage_tank.fill(separated["oil_bpd"])
        print(f"مستوى الخزان الحالي: {self.storage_tank.current_level_bbl:.0f} برميل")


# ============ مثال تشغيلي ============
if __name__ == "__main__":
    unit = ProductionUnit("حقل الإنتاج A")

    well1 = Well("Well-1", depth_m=3200, reservoir_pressure_psi=4500)
    well2 = Well("Well-2", depth_m=2800, reservoir_pressure_psi=3900)

    well1.produce(rate_bpd=1500)
    well2.produce(rate_bpd=1200)

    unit.add_well(well1)
    unit.add_well(well2)

    unit.run_daily_cycle()

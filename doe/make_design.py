#!/usr/bin/env python3
"""Box-Behnken design (3 factors, 3 centre points = 15 runs) for the SPME guar-surfactant gel.

Edit FACTORS (names, units, low/centre/high) and RESPONSES, then run:
    python doe/make_design.py            # writes doe/bbd_design.csv (randomised run order)
    python doe/make_design.py --seed 7   # different randomisation
The ranges below are PLACEHOLDERS, not recommendations: replace them with ranges you can actually prepare
and that stay inside the single-phase / stable-gel region of your system.
"""
import argparse, csv, os, random

FACTORS = {
    "A": {"name": "Guar loading",                 "unit": "wt%", "low": 0.20, "center": 0.30, "high": 0.40},
    "B": {"name": "Sodium oleate",                "unit": "wt%", "low": 0.10, "center": 0.30, "high": 0.50},
    "C": {"name": "Microemulsion dose (2-EH+oil)", "unit": "wt%", "low": 0.50, "center": 1.00, "high": 1.50},
}
RESPONSES = [
    "eta100_Tres_cP",     # apparent viscosity at 100 1/s, at test temperature
    "eta0p1_25C_cP",      # low-shear viscosity at 0.1 1/s, 25 C (suspension proxy)
    "Gprime_1Hz_Pa",      # elastic modulus G' at 1 Hz (inside the linear viscoelastic range)
    "t_half_Tres_min",    # time for viscosity to fall to 50 % at test temperature (thermal stability)
    "residue_wtpct",      # insoluble residue after breaking (gravimetric)
    "settling_mm_s",      # static sand settling velocity (graduated cylinder, test temperature)
]

def bbd3(n_center=3):
    runs = []
    for i, j in [(0, 1), (0, 2), (1, 2)]:
        for a in (-1, 1):
            for b in (-1, 1):
                v = [0, 0, 0]; v[i] = a; v[j] = b; runs.append(tuple(v))
    runs += [(0, 0, 0)] * n_center
    return runs

def real(coded, f):
    return f["center"] + coded * ((f["high"] - f["center"]) if coded > 0 else (f["center"] - f["low"]))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--seed", type=int, default=42); ap.add_argument("--center", type=int, default=3)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "bbd_design.csv")); a = ap.parse_args()
    runs = bbd3(a.center); std = list(range(1, len(runs) + 1)); order = std[:]; random.Random(a.seed).shuffle(order)
    rows = sorted(zip(order, std, runs))
    keys = list(FACTORS)
    head = ["run", "std_order"] + [k + "_coded" for k in keys] + [k + "_" + FACTORS[k]["unit"].replace("%", "pct") for k in keys] + RESPONSES
    with open(a.out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh); w.writerow(head)
        for run, s, c in rows:
            w.writerow([run, s] + list(c) + [round(real(c[i], FACTORS[k]), 4) for i, k in enumerate(keys)] + [""] * len(RESPONSES))
    print("wrote", a.out, "(", len(rows), "runs )")

if __name__ == "__main__":
    main()

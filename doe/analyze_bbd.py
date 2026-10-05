#!/usr/bin/env python3
"""Fit a full quadratic response-surface model to a filled Box-Behnken CSV (output of make_design.py).

    python doe/analyze_bbd.py doe/bbd_design.csv                       # all response columns that have data
    python doe/analyze_bbd.py file.csv --responses eta100_Tres_cP residue_wtpct
    python doe/analyze_bbd.py file.csv --goal eta100_Tres_cP:max residue_wtpct:min   # multi-response desirability
Requires: numpy, scipy, pandas, statsmodels (matplotlib optional for contour plots).
"""
import argparse, itertools, sys
import os
import numpy as np, pandas as pd
import statsmodels.formula.api as smf
from scipy import stats

FACT = ["A", "B", "C"]
FORMULA = "y ~ A + B + C + A:B + A:C + B:C + I(A**2) + I(B**2) + I(C**2)"

def fit(df, resp):
    d = df[["A", "B", "C", resp]].rename(columns={resp: "y"}).dropna()
    m = smf.ols(FORMULA, d).fit()
    n, p = len(d), len(m.params)
    h = m.get_influence().hat_matrix_diag
    press = float(np.sum((m.resid / (1 - h)) ** 2)); sst = float(np.sum((d["y"] - d["y"].mean()) ** 2))
    r2pred = 1 - press / sst
    c = d[(d.A == 0) & (d.B == 0) & (d.C == 0)]["y"]
    lof = None
    if len(c) >= 2:
        sspe, dfpe = float(((c - c.mean()) ** 2).sum()), len(c) - 1
        sslof, dflof = float(m.ssr) - sspe, int(m.df_resid) - dfpe
        if dflof > 0 and sspe > 0:
            F = (sslof / dflof) / (sspe / dfpe); lof = (F, 1 - stats.f.cdf(F, dflof, dfpe), dflof, dfpe)
    return m, d, r2pred, lof

def report(df, resp, factors):
    m, d, r2pred, lof = fit(df, resp)
    print("=" * 74); print(resp, f"  (n={len(d)})")
    print(f"R2={m.rsquared:.3f}  adjR2={m.rsquared_adj:.3f}  predR2={r2pred:.3f}  model F p={m.f_pvalue:.4g}  RMSE={np.sqrt(m.mse_resid):.4g}")
    if lof: print(f"Lack of fit: F={lof[0]:.3f} (df {lof[2]},{lof[3]})  p={lof[1]:.3f}  ->", "NOT significant (good)" if lof[1] > 0.05 else "SIGNIFICANT: model inadequate")
    else: print("Lack of fit: not testable (need >=2 centre points with variation)")
    if r2pred < 0.5 or m.rsquared_adj - r2pred > 0.2: print("WARNING: predicted R2 is low or far from adjusted R2: model may over-fit / noisy")
    print(m.summary().tables[1])
    if len(d) >= 8:
        print("Shapiro-Wilk on residuals: p=%.3f" % stats.shapiro(m.resid)[1])
    return m

def predict(m, a, b, c):
    return m.predict(pd.DataFrame({"A": a, "B": b, "C": c}))

def to_real(coded, f):
    return f["center"] + coded * ((f["high"] - f["center"]) if coded > 0 else (f["center"] - f["low"]))

def optimise(models, goals, df):
    g = np.linspace(-1, 1, 41); grid = pd.DataFrame(list(itertools.product(g, g, g)), columns=FACT)
    D = np.ones(len(grid))
    for resp, goal in goals:
        y = predict(models[resp], grid.A, grid.B, grid.C).values; obs = df[resp].dropna()
        lo, hi = obs.min(), obs.max(); d = np.clip((y - lo) / (hi - lo + 1e-12), 0, 1) if goal == "max" else np.clip((hi - y) / (hi - lo + 1e-12), 0, 1)
        D *= d ** (1 / len(goals))
    i = int(np.argmax(D)); return grid.iloc[i], D[i]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("csv"); ap.add_argument("--responses", nargs="*"); ap.add_argument("--goal", nargs="*", default=[])
    a = ap.parse_args(); df = pd.read_csv(a.csv)
    df = df.rename(columns={"A_coded": "A", "B_coded": "B", "C_coded": "C"})
    real_cols = [c for c in df.columns if c.split("_")[0] in FACT and c not in FACT and not c.endswith("coded")]
    meta = {"run", "std_order"} | set(FACT) | set(real_cols)
    resp = a.responses or [c for c in df.columns if c not in meta and df[c].notna().sum() >= 10]
    if not resp: sys.exit("No response column with >=10 filled values found.")
    models = {r: report(df, r, FACT) for r in resp}
    if a.goal:
        goals = [tuple(s.split(":")) for s in a.goal]
        pt, D = optimise(models, goals, df)
        print("=" * 74); print("Desirability optimum (coded):", {k: round(float(pt[k]), 3) for k in FACT}, " D=%.3f" % D)
        try:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from make_design import FACTORS
            print("  in real units:", {k: f"{to_real(float(pt[k]), FACTORS[k]):.4g} {FACTORS[k]['unit']} ({FACTORS[k]['name']})" for k in FACT})
        except Exception: pass
        print("This is a MODEL prediction: confirm it with 2-3 confirmation runs before trusting it.")
        for r, _ in goals: print(f"  predicted {r}: {float(predict(models[r], [pt.A], [pt.B], [pt.C]).iloc[0]):.4g}")

if __name__ == "__main__":
    main()

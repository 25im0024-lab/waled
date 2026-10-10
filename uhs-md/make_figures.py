#!/usr/bin/env python3
"""Publication figures for UHS-MD LAMMPS runs.

  python make_figures.py RUN_DIR [RUN_DIR ...] [--out figures] [--skip 0.2]

Several run directories of the same system (different --seed values) are
averaged: curves show the mean, shaded bands +/- one standard deviation
across runs. With one run, the bands are block-averaging errors (5 blocks
of the production trajectory).

Figures (each as PNG at 300 dpi and as vector PDF, with a CSV of the
plotted data):
  fig_density      number density profiles across the pore (brine, ions, gases)
  fig_mass_density total mass density profile (g/cm3)
  fig_msd          lateral (xy) and normal (z) MSD of H2, water and gases;
                   diffusion coefficients from the linear regime
  fig_rdf          radial distribution functions around H2. In a slit pore
                   g(r) is normalised by the whole-box density, so it does not
                   tend to 1: use peak positions, not absolute heights
  fig_pressure     pore pressure (Pzz in the bulk-gas region) vs time
  fig_energy       H2-calcite and H2-water interaction energies vs time
and table_summary.csv / .md with D values, H2 solubility, gas composition
and pressure.
"""
import argparse
import csv
import json
import os

import numpy as np

from analyze import read_chunks, read_table

NA = 6.02214076e23
# species: (profile file, sites per molecule, molar mass g/mol, label, color, line style)
SPECIES = {
    "water": ("prof_water.dat", 3, 18.015, "H$_2$O", "#6250d6", "-"),
    "ions":  ("prof_ions.dat", 1, 29.22, "Na$^+$ + Cl$^-$", "#7a7a7a", ":"),
    "h2":    ("prof_h2.dat", 1, 2.016, "H$_2$", "#2a78d6", "-"),
    "co2":   ("prof_co2.dat", 3, 44.01, "CO$_2$", "#eb6834", "--"),
    "ch4":   ("prof_ch4.dat", 1, 16.043, "CH$_4$", "#1baf7a", "-."),
    "n2":    ("prof_n2.dat", 3, 28.014, "N$_2$", "#eda100", (0, (5, 1, 1, 1, 1, 1))),
}
MSD_FILES = {"h2": "msd_h2.dat", "water": "msd_water.dat", "co2": "msd_co2.dat", "ch4": "msd_ch4.dat", "n2": "msd_n2.dat"}
RDF_PAIRS = ["H$_2$–O$_w$", "H$_2$–O (calcite)", "H$_2$–Ca", "H$_2$–CH$_4$", "H$_2$–C (CO$_2$)", "O$_w$–O (calcite)"]
A3_TO_NM3 = 1000.0


def style():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams.update({
        "font.size": 10, "axes.labelsize": 10, "axes.titlesize": 10, "legend.fontsize": 8.5,
        "xtick.labelsize": 9, "ytick.labelsize": 9, "axes.linewidth": 0.8, "lines.linewidth": 1.6,
        "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True, "grid.color": "#e6e6e6",
        "grid.linewidth": 0.6, "legend.frameon": False, "savefig.bbox": "tight", "figure.dpi": 100,
        "font.family": "DejaVu Sans", "mathtext.default": "regular",
    })
    return plt


def save(fig, out, name, header, cols):
    fig.savefig(os.path.join(out, name + ".png"), dpi=300)
    fig.savefig(os.path.join(out, name + ".pdf"))
    with open(os.path.join(out, name + ".csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for row in zip(*cols):
            w.writerow([f"{v:.6g}" if isinstance(v, (float, np.floating)) else v for v in row])


def blocks_mean_err(blocks, nblock=5):
    """Mean over blocks and standard error from nblock contiguous groups."""
    a = np.asarray(blocks)
    mean = a.mean(axis=0)
    if len(a) < nblock:
        return mean, np.zeros_like(mean)
    groups = np.array_split(a, nblock)
    gm = np.array([g.mean(axis=0) for g in groups])
    return mean, gm.std(axis=0, ddof=1) / np.sqrt(nblock)


def combine(per_run_means, per_run_errs):
    """Across runs: mean and std; for a single run: its block error."""
    m = np.asarray(per_run_means)
    if len(m) == 1:
        return m[0], np.asarray(per_run_errs)[0]
    return m.mean(axis=0), m.std(axis=0, ddof=1)


def load_profiles(runs, skip):
    out = {}
    z = None
    for key, (fname, nsite, *_rest) in SPECIES.items():
        means, errs = [], []
        for r in runs:
            path = os.path.join(r, fname)
            if not os.path.exists(path):
                break
            zz, blocks = read_chunks(path)
            k0 = int(len(blocks) * skip)
            m, e = blocks_mean_err(np.array(blocks[k0:]) / nsite)
            means.append(m); errs.append(e); z = zz
        if len(means) == len(runs) and np.max(np.mean(means, axis=0)) > 0:
            out[key] = combine(means, errs)
    return z, out


def brine_bands(z, w):
    if w is None or w.max() <= 0:
        return []
    inb = w > 0.5 * 0.0334  # half the bulk liquid-water density (1/A^3)
    bands, start = [], None
    for i, b in enumerate(inb):
        if b and start is None:
            start = z[i]
        if (not b or i == len(z) - 1) and start is not None:
            bands.append((start, z[i])); start = None
    return bands


def fig_density(plt, z, prof, meta, out):
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(6.5, 5.2), sharex=True, gridspec_kw={"height_ratios": [1, 1.2]})
    slab = meta["slab_thickness_A"]
    header, cols = ["z_A"], [z]
    for ax in (a1, a2):
        ax.axvspan(0, slab, color="#d9d4c7", lw=0, zorder=0)
        for b in brine_bands(z, prof.get("water", (None,))[0]):
            ax.axvspan(*b, color="#eef0fb", lw=0, zorder=0)
    for key, ax in (("water", a1), ("ions", a1), ("h2", a2), ("co2", a2), ("ch4", a2), ("n2", a2)):
        if key not in prof:
            continue
        m, e = prof[key]
        _, _, _, lab, col, ls = SPECIES[key]
        ax.plot(z, m * A3_TO_NM3, color=col, ls=ls, label=lab)
        ax.fill_between(z, (m - e) * A3_TO_NM3, (m + e) * A3_TO_NM3, color=col, alpha=0.18, lw=0)
        header += [f"{key}_nm-3", f"{key}_err_nm-3"]; cols += [m * A3_TO_NM3, e * A3_TO_NM3]
    a1.set_ylabel("Number density (nm$^{-3}$)")
    a2.set_ylabel("Number density (nm$^{-3}$)")
    a2.set_xlabel("z (Å)")
    a1.legend(loc="upper center", ncol=2)
    a2.legend(loc="upper center", ncol=4)
    a1.text(slab / 2, a1.get_ylim()[1] * 0.92, "calcite", ha="center", va="top", fontsize=8.5, color="#5a5444")
    fig.align_ylabels()
    save(fig, out, "fig_density", header, cols)
    plt.close(fig)


def fig_mass_density(plt, z, prof, meta, out):
    rho = np.zeros_like(z, dtype=float)
    err2 = np.zeros_like(z, dtype=float)
    for key, (m, e) in prof.items():
        M = SPECIES[key][2]
        rho += m * M / NA * 1e24
        err2 += (e * M / NA * 1e24) ** 2
    err = np.sqrt(err2)
    fig, ax = plt.subplots(figsize=(6.5, 2.8))
    ax.axvspan(0, meta["slab_thickness_A"], color="#d9d4c7", lw=0)
    ax.plot(z, rho, color="#2a78d6")
    ax.fill_between(z, rho - err, rho + err, color="#2a78d6", alpha=0.18, lw=0)
    ax.set_xlabel("z (Å)"); ax.set_ylabel("Fluid mass density (g cm$^{-3}$)")
    save(fig, out, "fig_mass_density", ["z_A", "rho_g_cm3", "err_g_cm3"], [z, rho, err])
    plt.close(fig)


def load_msd(runs, fname):
    curves = []
    for r in runs:
        p = os.path.join(r, fname)
        if not os.path.exists(p):
            return None
        m = read_table(p)
        t = (m[:, 0] - m[0, 0]) / 1000.0  # ps (1 fs time step)
        curves.append((t, m[:, 1] + m[:, 2], m[:, 3]))
    n = min(len(c[0]) for c in curves)
    t = curves[0][0][:n]
    xy = np.array([c[1][:n] for c in curves]); zz = np.array([c[2][:n] for c in curves])
    return t, xy, zz


def fit_D(t, msd, dim, lo=0.2, hi=0.8):
    """Slope of MSD vs t in [lo, hi] of the trajectory; D = slope / (2 dim), m^2/s.
    Error: spread of slopes over the three thirds of the window."""
    sel = (t >= lo * t[-1]) & (t <= hi * t[-1])
    if sel.sum() < 6:
        return np.nan, np.nan
    s = np.polyfit(t[sel], msd[sel], 1)[0]
    parts = np.array_split(np.where(sel)[0], 3)
    ss = [np.polyfit(t[p], msd[p], 1)[0] for p in parts if len(p) > 3]
    conv = 1e-20 / 1e-12 / (2 * dim)  # A^2/ps -> m^2/s
    return s * conv, (np.std(ss, ddof=1) * conv if len(ss) > 1 else np.nan)


def fig_msd(plt, runs, out):
    fig, axes = plt.subplots(1, 2, figsize=(7.2, 3.0))
    header, cols, rows = [], [], []
    for key, fname in MSD_FILES.items():
        d = load_msd(runs, fname)
        if d is None:
            continue
        t, xy, zz = d
        _, _, _, lab, col, ls = SPECIES[key]
        for ax, arr, dim, comp in ((axes[0], xy, 2, "xy"), (axes[1], zz, 1, "z")):
            m = arr.mean(axis=0)
            e = arr.std(axis=0, ddof=1) if len(arr) > 1 else None
            ax.plot(t[1:], m[1:], color=col, ls=ls, label=lab)
            if e is not None:
                ax.fill_between(t[1:], (m - e)[1:], (m + e)[1:], color=col, alpha=0.18, lw=0)
            header += [f"{key}_msd_{comp}_A2"]; cols += [m]
            if comp == "xy":  # z is bounded by the walls: its MSD plateaus, no D
                Ds = [fit_D(t, a, dim) for a in arr]
                Dm = np.mean([x[0] for x in Ds])
                De = np.std([x[0] for x in Ds], ddof=1) if len(Ds) > 1 else Ds[0][1]
                rows.append((key, comp, Dm, De))
    for ax, title in ((axes[0], "Parallel to the walls (xy)"), (axes[1], "Normal to the walls (z)")):
        ax.set_xscale("log"); ax.set_yscale("log")
        ax.set_xlabel("t (ps)"); ax.set_title(title)
    axes[0].set_ylabel("MSD (Å$^2$)")
    axes[0].legend(loc="upper left")
    fig.tight_layout()
    if cols:
        save(fig, out, "fig_msd", ["t_ps"] + header, [t] + cols)
    plt.close(fig)
    return rows


def fig_rdf(plt, runs, skip, out):
    gs = []
    for r in runs:
        p = os.path.join(r, "rdf.dat")
        if not os.path.exists(p):
            return
        blocks, cur = [], []
        for line in open(p):
            if line.startswith("#"):
                continue
            s = line.split()
            if len(s) == 2:
                if cur:
                    blocks.append(np.array(cur))
                cur = []
            else:
                cur.append(list(map(float, s[1:])))
        if cur:
            blocks.append(np.array(cur))
        k0 = int(len(blocks) * skip)
        if len(blocks) - k0 < 1:
            print(f"fig_rdf skipped: {r} has no RDF block yet (run longer than 10000 steps)")
            return
        gs.append(np.mean(blocks[k0:], axis=0))
    g = np.mean(gs, axis=0)
    r = g[:, 0]
    fig, axes = plt.subplots(2, 3, figsize=(7.2, 4.4), sharex=True)
    header, cols = ["r_A"], [r]
    for k, ax in enumerate(axes.flat):
        y = g[:, 1 + 2 * k]
        ax.plot(r, y, color="#2a78d6" if k < 5 else "#6250d6")
        ax.set_title(RDF_PAIRS[k])
        if k >= 3:
            ax.set_xlabel("r (Å)")
        if k % 3 == 0:
            ax.set_ylabel("g(r), box-normalised")
        header.append(f"g_{k + 1}"); cols.append(y)
    fig.tight_layout()
    save(fig, out, "fig_rdf", header, cols)
    plt.close(fig)


def running_series(runs, fname, col):
    ts = []
    for r in runs:
        p = os.path.join(r, fname)
        if not os.path.exists(p):
            return None
        m = read_table(p)
        ts.append(((m[:, 0] - m[0, 0]) / 1000.0, m[:, col]))
    n = min(len(t) for t, _ in ts)
    return ts[0][0][:n], np.array([v[:n] for _, v in ts])


def fig_time(plt, runs, out, fname, cols_idx, labels, ylabel, name, colors, target=None):
    data = [running_series(runs, fname, c) for c in cols_idx]
    if any(d is None for d in data):
        return
    fig, ax = plt.subplots(figsize=(6.5, 2.8))
    header, cols = ["t_ps"], [data[0][0]]
    for (t, v), lab, col in zip(data, labels, colors):
        m = v.mean(axis=0)
        ax.plot(t, m, color=col, lw=0.8, alpha=0.45)
        w = max(1, len(m) // 25)
        run = np.convolve(m, np.ones(w) / w, mode="valid")
        ax.plot(t[w - 1:], run, color=col, lw=1.8, label=f"{lab} (running mean)")
        header += [lab]; cols += [m]
    if target is not None:
        ax.axhline(target, color="#9a9a9a", ls="--", lw=0.9, label="target")
    ax.set_xlabel("t (ps)"); ax.set_ylabel(ylabel)
    ax.legend(loc="best")
    save(fig, out, name, header, cols)
    plt.close(fig)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("runs", nargs="+")
    ap.add_argument("--out", default=None, help="output folder (default: RUN/figures, or figures/ for several runs)")
    ap.add_argument("--skip", type=float, default=0.2, help="fraction of production discarded before averaging")
    a = ap.parse_args()
    out = a.out or (os.path.join(a.runs[0], "figures") if len(a.runs) == 1 else "figures")
    os.makedirs(out, exist_ok=True)
    plt = style()
    meta = json.load(open(os.path.join(a.runs[0], "system.json")))

    z, prof = load_profiles(a.runs, a.skip)
    fig_density(plt, z, prof, meta, out)
    fig_mass_density(plt, z, prof, meta, out)
    drows = fig_msd(plt, a.runs, out)
    fig_rdf(plt, a.runs, a.skip, out)
    fig_time(plt, a.runs, out, "pressure_gas.dat", [1], ["P$_{zz}$"], "Pressure (MPa)", "fig_pressure",
             ["#2a78d6"], target=meta["conditions"]["P_Pa"] / 1e6)
    fig_time(plt, a.runs, out, "energy_h2.dat", [1, 2], ["H$_2$–calcite", "H$_2$–water"],
             "Interaction energy (kcal mol$^{-1}$)", "fig_energy", ["#eb6834", "#6250d6"])

    # summary table (results.json from analyze.py, averaged over runs)
    res = [json.load(open(os.path.join(r, "results.json"))) for r in a.runs if os.path.exists(os.path.join(r, "results.json"))]
    def agg(key, sub=None):
        vals = [(x.get(key) or {}).get(sub) if sub else x.get(key) for x in res]
        vals = [v for v in vals if v is not None]
        if not vals:
            return "", ""
        return float(np.mean(vals)), (float(np.std(vals, ddof=1)) if len(vals) > 1 else "")
    rows = [("Runs averaged", len(a.runs), "")]
    for k, comp, Dm, De in drows:
        rows.append((f"D {k}, parallel to walls [1e-9 m2/s]", Dm * 1e9, De * 1e9 if De == De else ""))
    for label, key, sub in (("x_H2 in brine", "x_H2_brine", None), ("H2 liquid/gas ratio K", "K_H2_liq_over_gas", None),
                            ("H2 mole fraction, pore-centre gas", "gas_centre_mole_fractions", "h2"),
                            ("CO2 mole fraction, pore-centre gas", "gas_centre_mole_fractions", "co2"),
                            ("CH4 mole fraction, pore-centre gas", "gas_centre_mole_fractions", "ch4"),
                            ("N2 mole fraction, pore-centre gas", "gas_centre_mole_fractions", "n2"),
                            ("H2 interface enrichment", "H2_interface_enrichment", None),
                            ("Pore pressure Pzz [MPa]", "P_gas_Pzz_MPa", None)):
        m, e = agg(key, sub)
        if m != "" and not (sub and m == 0):
            rows.append((label, m, e))
    with open(os.path.join(out, "table_summary.csv"), "w", newline="") as f:
        w = csv.writer(f); w.writerow(["quantity", "mean", "std_or_error"])
        for r in rows:
            w.writerow([r[0]] + [f"{v:.4g}" if isinstance(v, float) else v for v in r[1:]])
    with open(os.path.join(out, "table_summary.md"), "w") as f:
        f.write("| Quantity | Mean | ± |\n|---|---|---|\n")
        for r in rows:
            f.write("| " + " | ".join([r[0]] + [f"{v:.4g}" if isinstance(v, float) else str(v) for v in r[1:]]) + " |\n")
    print(f"figures written to {out}/")
    print(open(os.path.join(out, "table_summary.md")).read())


if __name__ == "__main__":
    main()

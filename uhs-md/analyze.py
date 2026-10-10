#!/usr/bin/env python3
"""Post-process a run made with in.uhs.lmp.

  python analyze.py RUN_DIR [--skip 0.2]

Reports:
  * molecular density profiles rho_i(z) (and profiles.png if matplotlib is present)
  * H2 solubility in the brine films (mole fraction x_H2, and the
    concentration ratio K = c_liq / c_gas)
  * gas-phase composition in the pore centre (H2 / cushion-gas mixing)
  * H2 enrichment at the gas-brine interface (peak / bulk-gas density)
  * H2 self-diffusion from the MSD (total and lateral x-y)
  * pore pressure from the bulk-gas Pzz
Everything is written to RUN_DIR/results.json.
"""
import argparse
import json
import os

import numpy as np

SITES = {"water": 3, "co2": 3, "n2": 3, "h2": 1, "ch4": 1, "ions": 1}
A3_TO_MOL_L = 1e27 / 6.02214076e23  # 1/A^3 -> mol/L


def read_chunks(path):
    """Return (z, list_of_density_arrays) from a fix ave/chunk file."""
    blocks, z, cur = [], None, []
    with open(path) as f:
        for line in f:
            if line.startswith("#"):
                continue
            p = line.split()
            if len(p) == 3:  # block header: step nchunks total
                if cur:
                    blocks.append(np.array(cur))
                cur = []
            elif len(p) == 4:
                cur.append([float(p[1]), float(p[3])])
    if cur:
        blocks.append(np.array(cur))
    z = blocks[0][:, 0]
    return z, [b[:, 1] for b in blocks]


def read_table(path):
    rows = [list(map(float, l.split())) for l in open(path) if l.strip() and not l.startswith("#")]
    return np.array(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run")
    ap.add_argument("--skip", type=float, default=0.2, help="fraction of blocks discarded as equilibration")
    a = ap.parse_args()
    meta = json.load(open(os.path.join(a.run, "system.json")))

    prof = {}
    for sp, nsite in SITES.items():
        path = os.path.join(a.run, f"prof_{sp}.dat")
        if not os.path.exists(path):
            continue
        z, blocks = read_chunks(path)
        k0 = int(len(blocks) * a.skip)
        prof[sp] = np.mean(blocks[k0:], axis=0) / nsite  # molecules / A^3
    dz = z[1] - z[0]
    w = prof["water"]

    liq = w > 0.025          # >= ~75 % of bulk water (0.033 /A^3)
    gas = (w < 1e-4) & (z > meta["regions_A"]["surface_top"]) & (z < meta["regions_A"]["surface_bottom_image"])
    res = {"run": a.run, "conditions": meta["conditions"], "bio": meta["bio"],
           "calcite_verified": meta["calcite_verified"], "n_blocks_used": len(blocks) - k0}

    h2 = prof.get("h2", np.zeros_like(w))
    if liq.any():
        n_w, n_h2 = w[liq].sum(), h2[liq].sum()
        res["x_H2_brine"] = n_h2 / (n_h2 + n_w)
        res["c_H2_brine_mol_L"] = h2[liq].mean() * A3_TO_MOL_L
    if gas.any():
        tot = sum(prof[s][gas].sum() for s in ("h2", "ch4", "co2", "n2") if s in prof)
        res["gas_centre_mole_fractions"] = {s: prof[s][gas].sum() / tot for s in ("h2", "ch4", "co2", "n2")
                                            if s in prof and tot > 0}
        cg = h2[gas].mean()
        res["c_H2_gas_mol_L"] = cg * A3_TO_MOL_L
        if liq.any() and cg > 0:
            res["K_H2_liq_over_gas"] = h2[liq].mean() / cg
            # interfacial enrichment: peak H2 density outside the gas centre vs bulk gas
            res["H2_interface_enrichment"] = float(h2[~gas & ~liq].max() / cg) if (~gas & ~liq).any() else None
    # H2 near the calcite surface (first 5 A of fluid), relevant for dry pores
    zt = meta["regions_A"]["surface_top"]
    near = (z > zt) & (z < zt + 5.0)
    res["H2_within_5A_of_surface_per_nm2"] = float(h2[near].sum() * dz * 100.0)

    msd_path = os.path.join(a.run, "msd_h2.dat")
    if os.path.exists(msd_path):
        m = read_table(msd_path)
        t = m[:, 0] - m[0, 0]  # fs (timestep 1 fs)
        half = (t >= 0.2 * t[-1]) & (t <= 0.8 * t[-1])  # same window as make_figures.py
        if half.sum() > 3:
            s_tot = np.polyfit(t[half], m[half, 4], 1)[0]
            s_xy = np.polyfit(t[half], m[half, 1] + m[half, 2], 1)[0]
            res["D_H2_total_m2_s"] = s_tot / 6 * 1e-5   # A^2/fs -> m^2/s
            res["D_H2_lateral_m2_s"] = s_xy / 4 * 1e-5
            res["note_D"] = ("MSD averages over all H2 (mostly gas phase). D_total is reduced by "
                             "confinement in z; the lateral value is the more meaningful one.")
    p_path = os.path.join(a.run, "pressure_gas.dat")
    if os.path.exists(p_path):
        p = read_table(p_path)
        k0 = int(len(p) * a.skip)
        res["P_gas_Pzz_MPa"] = float(p[k0:, 1].mean())
        res["P_gas_Pzz_MPa_std"] = float(p[k0:, 1].std())
        res["P_target_MPa"] = meta["conditions"]["P_Pa"] / 1e6

    with open(os.path.join(a.run, "results.json"), "w") as f:
        json.dump(res, f, indent=2, default=float)
    print(json.dumps(res, indent=2, default=float))

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return
    fig, ax = plt.subplots(2, 1, figsize=(7, 6), sharex=True)
    ax[0].plot(z, w * A3_TO_MOL_L, label="H$_2$O")
    if "ions" in prof:
        ax[0].plot(z, prof["ions"] * A3_TO_MOL_L, label="Na$^+$+Cl$^-$")
    for s, lab in (("h2", "H$_2$"), ("ch4", "CH$_4$"), ("co2", "CO$_2$"), ("n2", "N$_2$")):
        if s in prof and prof[s].any():
            ax[1].plot(z, prof[s] * A3_TO_MOL_L, label=lab)
    ax[0].set_ylabel("c (mol/L)")
    ax[1].set_ylabel("c (mol/L)")
    ax[1].set_xlabel("z (Å)")
    for x in ax:
        x.axvspan(0, meta["slab_thickness_A"], color="0.85", lw=0)
        x.legend(frameon=False)
    fig.tight_layout()
    fig.savefig(os.path.join(a.run, "profiles.png"), dpi=150)


if __name__ == "__main__":
    main()

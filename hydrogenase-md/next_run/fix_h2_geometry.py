#!/usr/bin/env python3
"""
Reset every 2-site H2 in a LAMMPS data file (atom_style full) to the
experimental bond length (default 0.741 A), keeping each molecule's centre
of mass and orientation. Image flags are recomputed.

usage: python3 fix_h2_geometry.py IN.data OUT.data [--type 21] [--bond 0.741]

Works on the original builder file (system_protein_h2_small.data) or on a
write_data output such as final_config.data (then the protein and water keep
their equilibrated state and only H2 is repaired).
"""
import argparse
import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp")
    ap.add_argument("out")
    ap.add_argument("--type", type=int, default=21)
    ap.add_argument("--bond", type=float, default=0.741)
    a = ap.parse_args()

    lines = open(a.inp).read().split("\n")
    lo, hi = np.zeros(3), np.zeros(3)
    for ln in lines[:60]:
        for k, ax in enumerate("xyz"):
            if ln.strip().endswith(f"{ax}lo {ax}hi"):
                lo[k], hi[k] = map(float, ln.split()[:2])
    L = hi - lo

    # locate the Atoms section
    start = next(i for i, ln in enumerate(lines) if ln.strip().startswith("Atoms"))
    i = start + 1
    while not lines[i].strip():
        i += 1
    rows = {}
    while i < len(lines) and lines[i].strip():
        f = lines[i].split()
        if int(f[2]) == a.type:
            rows.setdefault(int(f[1]), []).append(i)
        i += 1

    dists_before, dists_after = [], []
    for mol, idx in rows.items():
        if len(idx) != 2:
            raise SystemExit(f"molecule {mol} has {len(idx)} atoms of type {a.type}, expected 2")
        F = [lines[j].split() for j in idx]
        x = np.array([[float(v) for v in f[4:7]] for f in F])
        img = np.array([[int(v) for v in f[7:10]] if len(f) >= 10 else [0, 0, 0] for f in F])
        xu = x + img * L
        d = xu[1] - xu[0]
        d -= L * np.round(d / L)                  # minimum image, in case flags were inconsistent
        com = xu[0] + 0.5 * d
        r = np.linalg.norm(d)
        dists_before.append(r)
        u = d / r
        new = [com - 0.5 * a.bond * u, com + 0.5 * a.bond * u]
        for j, f, xn in zip(idx, F, new):
            im = np.floor((xn - lo) / L).astype(int)
            xw = xn - im * L
            f[4:7] = [f"{v:.10f}" for v in xw]
            if len(f) >= 10:
                f[7:10] = [str(v) for v in im]
            lines[j] = " ".join(f)
        dists_after.append(np.linalg.norm(new[1] - new[0]))

    open(a.out, "w").write("\n".join(lines))
    db = np.array(dists_before)
    print(f"{len(rows)} H2 molecules (type {a.type})")
    print(f"H-H before: mean {db.mean():.4f}, min {db.min():.4f}, max {db.max():.4f} A")
    print(f"H-H after : {np.mean(dists_after):.4f} A for all molecules -> {a.out}")


if __name__ == "__main__":
    main()

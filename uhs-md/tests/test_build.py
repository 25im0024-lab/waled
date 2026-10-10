#!/usr/bin/env python3
"""Checks on build_system.py (no LAMMPS needed). Run: python uhs-md/tests/test_build.py"""
import os
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import build_system as B  # noqa: E402


def read_data(path):
    lines = open(path).read().splitlines()
    box = [float(l.split()[1]) for l in lines if l.endswith(("xhi", "yhi", "zhi"))]
    sec, atoms, bonds = None, [], []
    for l in lines:
        s = l.split("#")[0].strip()
        if l.startswith(("Atoms", "Bonds", "Angles", "Masses")):
            sec = l.split()[0]
            continue
        if not s:
            continue
        p = s.split()
        if sec == "Atoms":
            atoms.append([int(p[0]), int(p[1]), int(p[2]), float(p[3]), *map(float, p[4:7]), *map(int, p[7:10])])
        elif sec == "Bonds":
            bonds.append(list(map(int, p)))
    return np.array(box), np.array(atoms), np.array(bonds)


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  ({detail})" if detail else ""))
    if not cond:
        check.failed = True


check.failed = False


def run_case(argv):
    with tempfile.TemporaryDirectory() as d:
        a = B.parse(argv + ["--out", d, "--accept-unverified-calcite", "--nx", "4", "--ny", "3", "--pore", "45"])
        meta = B.build(a)
        box, at, bd = read_data(os.path.join(d, "system.data"))
        tag = " ".join(argv)
        check(f"[{tag}] neutral", abs(at[:, 3].sum()) < 1e-4, f"q={at[:, 3].sum():.2e}")
        check(f"[{tag}] atoms inside box", np.all(at[:, 4:7] >= 0) and np.all(at[:, 4:7] < box))
        unw = at[:, 4:7] + at[:, 7:10] * box
        idx = {int(i): k for k, i in enumerate(at[:, 0])}
        r = np.array([np.linalg.norm(unw[idx[b[2]]] - unw[idx[b[3]]]) for b in bd])
        check(f"[{tag}] bonds intact with image flags", r.max() < 1.5, f"max bond {r.max():.3f} A")
        # no two fluid molecules closer than 2.0 A (minimum image), centres only
        fl = at[at[:, 2] >= 4]
        heavy = fl[np.isin(fl[:, 2], [4, 6, 7, 8, 9, 10, 13])]
        x = heavy[:, 4:7]
        dmin = 1e9
        for i in range(len(x)):
            dd = x[i + 1:] - x[i]
            dd -= np.round(dd / box) * box
            if len(dd):
                dmin = min(dmin, np.linalg.norm(dd, axis=1).min())
        check(f"[{tag}] no overlapping molecule centres", dmin > 2.0, f"min {dmin:.2f} A")
        nca = (at[:, 2] == 1).sum()
        check(f"[{tag}] calcite stoichiometry CaCO3",
              nca > 0 and nca == (at[:, 2] == 2).sum() and (at[:, 2] == 3).sum() == 3 * nca)
        return meta


m = run_case(["--cushion", "CO2"])
check("H2 in gas feed", m["counts"]["H2"] > 0)
m = run_case(["--cushion", "N2", "--x-cushion", "0.5", "--molality", "2"])
check("N2 count", m["counts"]["N2"] > 0)
check("NaCl molality", abs(m["counts"]["Na"] / (m["counts"]["H2O"] * 18.015e-3) - 2) < 0.4)
m0 = run_case(["--cushion", "CH4", "--seed", "7"])
m1 = run_case(["--cushion", "CH4", "--seed", "7", "--bio", "methanogenesis", "--bio-conversion", "0.4"])
b = m1["bio"]
check("methanogenesis stoichiometry 4H2 -> CH4 + 2H2O",
      b["H2_consumed"] == 4 * b["CH4_produced"] == 2 * b["H2O_produced"])
check("methanogenesis mass balance",
      m0["counts"]["H2"] - m1["counts"]["H2"] == b["H2_consumed"]
      and m1["counts"]["CH4"] - m0["counts"]["CH4"] == b["CH4_produced"]
      and m1["counts"]["H2O"] - m0["counts"]["H2O"] == b["H2O_produced"])
run_case(["--cushion", "CO2", "--water-film", "0"])

# the builder must refuse unverified calcite parameters without the explicit flag
try:
    with tempfile.TemporaryDirectory() as d:
        B.build(B.parse(["--out", d]))
    check("refuses unverified calcite", False)
except SystemExit:
    check("refuses unverified calcite", True)

sys.exit(1 if check.failed else 0)

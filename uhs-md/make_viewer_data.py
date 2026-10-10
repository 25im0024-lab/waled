#!/usr/bin/env python3
"""Pack a finished LAMMPS run for the 3D player in UHS Pore Lab.

  python make_viewer_data.py RUN_DIR [--out demo/demo-run.json] [--max-frames 60]

Reads traj.lammpstrj, system.json, results.json (run analyze.py first),
prof_*.dat and pressure_gas.dat from RUN_DIR and writes one JSON file with
positions packed as base64 uint16 (0.01 A resolution).
"""
import argparse
import base64
import json
import os

import numpy as np

from analyze import SITES, read_chunks, read_table

SCALE = 0.01  # A per stored unit


def read_traj(path):
    """Yield (timestep, box_lengths, array[id, type, x, y, z]) per frame."""
    with open(path) as f:
        while True:
            line = f.readline()
            if not line:
                return
            if not line.startswith("ITEM: TIMESTEP"):
                continue
            step = int(f.readline())
            f.readline()
            natoms = int(f.readline())
            f.readline()
            lo_hi = [list(map(float, f.readline().split()[:2])) for _ in range(3)]
            cols = f.readline().split()[2:]
            data = np.loadtxt([f.readline() for _ in range(natoms)])
            ci = {c: k for k, c in enumerate(cols)}
            xyz = data[:, [ci["xu"], ci["yu"], ci["zu"]]]
            lo = np.array([a for a, _ in lo_hi])
            L = np.array([b - a for a, b in lo_hi])
            xyz = (xyz - lo) % L
            arr = np.column_stack([data[:, ci["id"]], data[:, ci["type"]], xyz])
            yield step, L, arr[np.argsort(arr[:, 0])]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo", "demo-run.json"))
    ap.add_argument("--max-frames", type=int, default=60)
    ap.add_argument("--dt-fs", type=float, default=1.0, help="MD time step (fs) to convert steps to ps")
    a = ap.parse_args()

    meta = json.load(open(os.path.join(a.run, "system.json")))
    res_path = os.path.join(a.run, "results.json")
    results = json.load(open(res_path)) if os.path.exists(res_path) else {}

    frames, types, box = [], None, None
    allf = list(read_traj(os.path.join(a.run, "traj.lammpstrj")))
    keep = np.unique(np.linspace(0, len(allf) - 1, min(a.max_frames, len(allf))).round().astype(int))
    for k in keep:
        step, L, arr = allf[k]
        if types is None:
            types = arr[:, 1].astype(np.uint8)
            box = L
        q = np.clip(np.round(arr[:, 2:5] / SCALE), 0, 65535).astype("<u2")
        frames.append({"t_ps": step * a.dt_fs / 1000.0, "xyz": base64.b64encode(q.tobytes()).decode()})

    prof = {}
    for sp, nsite in SITES.items():
        path = os.path.join(a.run, f"prof_{sp}.dat")
        if os.path.exists(path):
            z, blocks = read_chunks(path)
            k0 = int(len(blocks) * 0.2)
            prof[sp] = np.round(np.mean(blocks[k0:], axis=0) / nsite, 7).tolist()
            prof["z"] = np.round(z, 3).tolist()
    p = read_table(os.path.join(a.run, "pressure_gas.dat"))
    out = {
        "title": "UHS-MD demonstration run",
        "conditions": meta["conditions"], "bio": meta["bio"], "counts": meta["counts"],
        "calcite_ff": meta.get("calcite_ff"), "box": [round(float(v), 4) for v in box],
        "scale": SCALE, "types": base64.b64encode(types.tobytes()).decode(),
        "frames": frames, "profiles": prof,
        "pressure": {"t_ps": np.round(p[:, 0] * a.dt_fs / 1000.0, 3).tolist(), "Pzz_MPa": np.round(p[:, 1], 3).tolist()},
        "results": results,
    }
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"{a.out}: {len(frames)} frames, {len(types)} atoms, {os.path.getsize(a.out) / 1024:.0f} KB")


if __name__ == "__main__":
    main()

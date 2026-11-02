#!/usr/bin/env python3
"""
Build a 20,000-atom LAMMPS data file:
  [NiFe]-hydrogenase (1H2R) + cofactors + 29 H2 = atom ids 1-12371, copied UNCHANGED
  (same ids, types, charges, coordinates, bonded topology) + thin NaCl brine film (TIP3P + Joung-Cheatham TIP3P ions)
  + cushion-gas phase: N2 / CH4 / CO2 (TraPPE).

Input : system_protein_h2_small.data  (47,849-atom v6 system)
Output: system_protein_brine_gas_20k.data

Usage : python3 build_20k.py <input.data> <output.data> [seed]
"""
import sys
import numpy as np

KB = 0.0019872043  # kcal/(mol K)

# ---------------- composition (edit here) ----------------
N_TOTAL = 20000
N_CO2, N_CH4, N_N2 = 100, 101, 100   # CH4 = 101 uses the atom freed by removing the v6 artifact
NACL_MOLALITY = 1.0            # mol NaCl / kg water (target, rounded to integer pairs)
KEEP_LAST_ID = 12371           # v6 ids 1-12371 = protein + cofactors (types 1-20) + 29 H2 (type 21)
# v6 BUILD ARTIFACT: id 12341 is typed as a cofactor O (type 20, mol 3) but has no bonds,
# angles or dihedrals, its id lies inside the H2 id range, and it sits exactly 0.741 A
# (the H-H bond length) from the real cofactor O 12312 -> a spurious "second H2 site"
# created on a cofactor atom by the v6 1-site -> 2-site H2 conversion. It is not in the
# 1H2R structure. It is dropped (checked below); all later ids shift down by one, so the
# protein/cofactor ids 1-12312 (Ni = 12305, Fe = 12306) are unchanged.
ARTIFACT_IDS = [12341]
GAS_PROT_MIN = 4.0             # A, gas site -> any protein/cofactor atom
GAS_OTHER_MIN = 3.0            # A, gas site -> water / ion / H2 atom
GAS_GAS_MIN = 3.4              # A, gas site -> other cushion-gas site
ION_PROT_MIN = 3.5             # A, ion -> nearest protein heavy atom
ION_ION_MIN = 5.0              # A

HEAVY_PROTEIN_TYPES = {1, 3, 5, 6, 9, 10, 15, 16, 17, 18, 19, 20}

# New atom types (appended after the v6 types 1-23)
NEW_TYPES = [
    # id, mass, eps (kcal/mol), sigma (A), comment
    (24, 22.98977, 0.0874393, 2 * 1.369 / 2 ** (1 / 6),
     "Na+  Joung-Cheatham 2008, TIP3P set (Rmin/2=1.369 A)"),
    (25, 35.453, 0.0355910, 2 * 2.513 / 2 ** (1 / 6),
     "Cl-  Joung-Cheatham 2008, TIP3P set (Rmin/2=2.513 A)"),
    (26, 16.043, 148.0 * KB, 3.73, "CH4  TraPPE-UA (eps/k=148 K)"),
    (27, 12.011, 27.0 * KB, 2.80, "C of CO2  TraPPE (eps/k=27 K)"),
    (28, 15.9994, 79.0 * KB, 3.05, "O of CO2  TraPPE (eps/k=79 K)"),
    (29, 14.0067, 36.0 * KB, 3.31, "N of N2  TraPPE (eps/k=36 K)"),
    (30, 0.001, 0.0, 0.0, "N2 centre site (massless in TraPPE; 0.001 for LAMMPS)"),
]
Q = {24: 1.0, 25: -1.0, 26: 0.0, 27: 0.70, 28: -0.35, 29: -0.482, 30: 0.964}
NEW_BONDS = [  # id, K, r0, comment  (all inside rigid bodies -> K irrelevant for dynamics)
    (86, 1000.0, 0.741, "H-H of H2 (rigid body; bond only for 1-2 exclusion)"),
    (87, 1000.0, 1.160, "C=O of CO2 (rigid body; TraPPE)"),
    (88, 1000.0, 0.550, "N-centre of N2 (rigid body; TraPPE, N-N = 1.10 A)"),
]
# Optional active-site ligand bonds (types 89/90). Defined here but NOT used in the
# Bonds section; the .in file creates them at run time when LIGFIX = 1.
# In v6 the O atoms of the Fe-bound diatomic ligands carry no bond to their C/S
# partner, so LJ repulsion at 1.2-1.5 A pushes them off during minimisation.
LIGAND_PAIRS = {89: [(12307, 12310), (12308, 12311)], 90: [(12309, 12312)]}
LIGAND_K = {89: 600.0, 90: 300.0}
LIGAND_NAME = {89: "Fe-bound C-O ligand", 90: "bridging S-O ligand"}


# ---------------- parse ----------------
def parse(path):
    with open(path) as f:
        lines = f.read().split("\n")
    head, sec, cur = [], {}, None
    names = {"Masses", "Pair Coeffs", "Bond Coeffs", "Angle Coeffs", "Dihedral Coeffs",
             "Improper Coeffs", "Atoms", "Velocities", "Bonds", "Angles", "Dihedrals",
             "Impropers"}
    for ln in lines:
        key = ln.split("#")[0].strip()
        if key in names:
            cur = key
            sec[cur] = []
            continue
        if cur is None:
            head.append(ln)
        elif ln.strip():
            sec[cur].append(ln)
    return head, sec


def box_from_head(head):
    lo, hi = np.zeros(3), np.zeros(3)
    for ln in head:
        p = ln.split()
        for i, ax in enumerate("xyz"):
            if len(p) >= 4 and p[2] == f"{ax}lo":
                lo[i], hi[i] = float(p[0]), float(p[1])
    return lo, hi


class Grid:
    """Periodic cell list for min-distance queries."""

    def __init__(self, pts, lo, L, cell=4.0):
        self.lo, self.L = lo, L
        self.n = np.maximum((L // cell).astype(int), 1)
        self.cs = L / self.n
        self.cells = {}
        self.pts = []
        for p in pts:
            self.add(p)

    def key(self, p):
        return tuple(((np.floor((p - self.lo) / self.cs)).astype(int)) % self.n)

    def add(self, p):
        self.pts.append(p)
        self.cells.setdefault(self.key(p), []).append(len(self.pts) - 1)

    def mindist(self, p, rmax):
        k = np.array(self.key(p))
        reach = int(np.ceil(rmax / self.cs.min()))
        best = np.inf
        idx = []
        for dx in range(-reach, reach + 1):
            for dy in range(-reach, reach + 1):
                for dz in range(-reach, reach + 1):
                    c = tuple((k + (dx, dy, dz)) % self.n)
                    idx.extend(self.cells.get(c, ()))
        if not idx:
            return best
        d = np.asarray([self.pts[i] for i in set(idx)]) - p
        d -= self.L * np.round(d / self.L)
        return np.sqrt((d * d).sum(1)).min()


def main(inp, out, seed=2026):
    rng = np.random.default_rng(seed)
    head, sec = parse(inp)
    lo, hi = box_from_head(head)
    L = hi - lo

    atoms = {}
    for ln in sec["Atoms"]:
        p = ln.split()
        aid, mol, typ = int(p[0]), int(p[1]), int(p[2])
        atoms[aid] = [mol, typ, float(p[3]), np.array(list(map(float, p[4:7])))]
    assert len(atoms) == max(atoms), "atom ids must be contiguous"

    topo_ids = set()
    for name, nat in (("Bonds", 2), ("Angles", 3), ("Dihedrals", 4)):
        for ln in sec[name]:
            topo_ids.update(map(int, ln.split()[2:2 + nat]))
    for a in ARTIFACT_IDS:
        assert atoms[a][1] == 20 and a not in topo_ids, f"{a} is not the expected artifact"
        partner = min(np.linalg.norm(atoms[a][3] - atoms[j][3])
                      for j in atoms if j != a and atoms[j][1] == 20)
        print(f"dropping v6 artifact atom {a}: type 20, no topology, "
              f"{partner:.3f} A from another cofactor O")
    old_ids = [i for i in range(1, KEEP_LAST_ID + 1) if i not in ARTIFACT_IDS]
    remap = {o: n for n, o in enumerate(old_ids, 1)}
    keep = {remap[o]: atoms[o] for o in old_ids}
    assert all(a[1] <= 21 for a in keep.values())
    assert all(a[1] >= 22 for i, a in atoms.items() if i > KEEP_LAST_ID)
    prot_ids = [i for i, a in keep.items() if a[1] <= 20]
    h2_ids = [i for i, a in keep.items() if a[1] == 21]
    h2_mols = {}
    for i in h2_ids:
        h2_mols.setdefault(keep[i][0], []).append(i)
    assert all(len(v) == 2 for v in h2_mols.values())
    q_prot = sum(a[2] for a in keep.values())
    n_cation_extra = int(round(-q_prot))
    print(f"protein+cofactor+H2 atoms: {len(keep)}   net charge: {q_prot:+.4f}")

    # protein dry mass (for hydration level h = g water / g protein)
    masses = {int(l.split()[0]): float(l.split()[1]) for l in sec["Masses"]}
    m_prot = sum(masses[atoms[i][1]] for i in prot_ids)

    # ---- atom budget ----
    n_gas_atoms = 3 * N_CO2 + N_CH4 + 3 * N_N2
    free = N_TOTAL - len(keep) - n_gas_atoms - n_cation_extra   # = 3W + 2*Npair
    # Npair ~= molality * W * 0.018015
    W = int(free / (3 + 2 * NACL_MOLALITY * 0.0180153))
    while True:
        npair = (free - 3 * W) // 2
        if (free - 3 * W) % 2 == 0 and npair >= 0:
            break
        W -= 1
    n_na, n_cl = npair + n_cation_extra, npair
    n_ion = n_na + n_cl
    print(f"water W={W}  NaCl pairs={npair}  Na+={n_na} Cl-={n_cl}  "
          f"molality={npair / (W * 0.0180153):.3f} mol/kg")

    # ---- waters: rank by distance to protein heavy atoms ----
    heavy = np.array([keep[i][3] for i in prot_ids if keep[i][1] in HEAVY_PROTEIN_TYPES])
    waters = []  # (O id, H id, H id)
    ids = sorted(i for i, a in atoms.items() if a[1] == 22)
    for o in ids:
        assert atoms[o + 1][1] == 23 and atoms[o + 2][1] == 23
        assert atoms[o][0] == atoms[o + 1][0] == atoms[o + 2][0]
        waters.append((o, o + 1, o + 2))
    O = np.array([atoms[w[0]][3] for w in waters])
    dmin = np.full(len(O), np.inf)
    for s in range(0, len(heavy), 500):
        h = heavy[s:s + 500]
        d = O[:, None, :] - h[None, :, :]
        d -= L * np.round(d / L)
        dmin = np.minimum(dmin, np.sqrt((d * d).sum(-1)).min(1))
    order = np.argsort(dmin)
    sel = order[:W + n_ion]
    print(f"brine film: waters kept up to {dmin[sel].max():.2f} A from protein heavy atoms")

    # ---- ions replace waters in the outer part of the film ----
    cand = [k for k in sel if dmin[k] >= ION_PROT_MIN]
    rng.shuffle(cand)
    ion_sites = []
    for k in cand:
        p = O[k]
        ok = True
        for q in ion_sites:
            d = O[q] - p
            d -= L * np.round(d / L)
            if np.sqrt(d @ d) < ION_ION_MIN:
                ok = False
                break
        if ok:
            ion_sites.append(k)
        if len(ion_sites) == n_ion:
            break
    assert len(ion_sites) == n_ion, "could not place all ions"
    ion_set = set(ion_sites)
    water_sel = [k for k in sel if k not in ion_set]
    assert len(water_sel) == W

    # ---- cushion-gas placement in the free volume ----
    g_prot = Grid([keep[i][3] for i in prot_ids], lo, L)
    other = [keep[i][3] for i in h2_ids]
    for k in water_sel:
        other += [atoms[w][3] for w in waters[k]]
    other += [O[k] for k in ion_sites]
    g_oth = Grid(other, lo, L)
    g_gas = Grid([], lo, L)

    def rand_unit():
        v = rng.normal(size=3)
        return v / np.linalg.norm(v)

    def try_place(offsets):
        for _ in range(200000):
            c = lo + rng.random(3) * L
            u = rand_unit()
            sites = [c + o * u for o in offsets]
            if all(g_prot.mindist(s, GAS_PROT_MIN) >= GAS_PROT_MIN and
                   g_oth.mindist(s, GAS_OTHER_MIN) >= GAS_OTHER_MIN and
                   g_gas.mindist(s, GAS_GAS_MIN) >= GAS_GAS_MIN for s in sites):
                for s in sites:
                    g_gas.add(s)
                return sites
        raise RuntimeError("gas placement failed - box too crowded")

    gas_mols = []   # list of (kind, [(type, xyz)])
    plan = [("CO2", N_CO2), ("N2", N_N2), ("CH4", N_CH4)]
    for kind, n in plan:
        for _ in range(n):
            if kind == "CO2":
                s = try_place([0.0, 1.16, -1.16])
                gas_mols.append((kind, [(27, s[0]), (28, s[1]), (28, s[2])]))
            elif kind == "N2":
                s = try_place([0.55, 0.0, -0.55])
                gas_mols.append((kind, [(29, s[0]), (30, s[1]), (29, s[2])]))
            else:
                s = try_place([0.0])
                gas_mols.append((kind, [(26, s[0])]))

    # ---- assemble ----
    out_atoms = []  # (id, mol, type, q, xyz)
    for i in range(1, len(keep) + 1):
        m, t, q, x = keep[i]
        out_atoms.append([i, m, t, q, x.copy()])
    # H2: write each molecule unwrapped relative to its first site (rigid/small needs
    # consistent images; read_data remaps into the box and sets image flags)
    bonds_new, angles_new = [], []
    for m, (i, j) in sorted(h2_mols.items()):
        a, b = out_atoms[i - 1], out_atoms[j - 1]
        d = b[4] - a[4]
        b[4] = a[4] + d - L * np.round(d / L)
        bonds_new.append((86, i, j))
    hh = [np.linalg.norm(out_atoms[j - 1][4] - out_atoms[i - 1][4]) for i, j in h2_mols.values()]
    print(f"H2 H-H distances in input: {min(hh):.3f}-{max(hh):.3f} A")

    nid = len(keep)
    mol = max(a[1] for a in out_atoms)

    for k in sorted(water_sel):
        mol += 1
        o, h1, h2 = waters[k]
        xo = atoms[o][3]
        pos = []
        for w in (o, h1, h2):
            d = atoms[w][3] - xo
            pos.append(xo + d - L * np.round(d / L))
        for w, x in zip((o, h1, h2), pos):
            nid += 1
            out_atoms.append([nid, mol, atoms[w][1], atoms[w][2], x])
        bonds_new += [(85, nid - 2, nid - 1), (85, nid - 2, nid)]
        angles_new.append((145, nid - 1, nid - 2, nid))

    for j, k in enumerate(ion_sites):
        mol += 1
        nid += 1
        t = 24 if j < n_na else 25
        out_atoms.append([nid, mol, t, Q[t], O[k].copy()])

    for kind, sites in gas_mols:
        mol += 1
        first = nid + 1
        for t, x in sites:
            nid += 1
            out_atoms.append([nid, mol, t, Q[t], x])
        if kind == "CO2":
            bonds_new += [(87, first, first + 1), (87, first, first + 2)]
        elif kind == "N2":
            bonds_new += [(88, first, first + 1), (88, first + 1, first + 2)]

    assert nid == N_TOTAL, nid
    qtot = sum(a[3] for a in out_atoms)
    print(f"total atoms {nid}   total charge {qtot:+.6f}")
    assert abs(qtot) < 1e-6

    # keep protein/cofactor topology (all ids <= 12371), renumbered through remap
    def keep_topo(lines, nat):
        res = []
        for ln in lines:
            p = ln.split()
            ids_ = list(map(int, p[2:2 + nat]))
            if max(ids_) <= KEEP_LAST_ID:
                res.append((int(p[1]), *[remap[i] for i in ids_]))
        return res

    bonds = keep_topo(sec["Bonds"], 2) + bonds_new
    angles = keep_topo(sec["Angles"], 3) + angles_new
    dihed = keep_topo(sec["Dihedrals"], 4)

    # gas-phase free volume (for an ideal-gas pressure estimate)
    vol = L.prod()
    n_gas = N_CO2 + N_CH4 + N_N2 + len(h2_mols)

    # ---- write ----
    with open(out, "w") as f:
        f.write("LAMMPS data file: [NiFe]-hydrogenase (1H2R, unchanged) + 29 H2 + NaCl brine "
                f"film ({W} TIP3P, {n_na} Na+, {n_cl} Cl-) + cushion gas "
                f"({N_N2} N2, {N_CH4} CH4, {N_CO2} CO2)\n\n")
        f.write(f"{nid} atoms\n{len(bonds)} bonds\n{len(angles)} angles\n"
                f"{len(dihed)} dihedrals\n0 impropers\n\n")
        f.write(f"30 atom types\n90 bond types\n145 angle types\n77 dihedral types\n\n")
        for i, ax in enumerate("xyz"):
            f.write(f"{lo[i]:.4f} {hi[i]:.4f} {ax}lo {ax}hi\n")
        f.write("\nMasses\n\n")
        for ln in sec["Masses"]:
            f.write(ln + "\n")
        for t, m, e, s, c in NEW_TYPES:
            f.write(f"{t}  {m:.5f}  # {c}\n")
        f.write("\nPair Coeffs   # eps(kcal/mol)  sigma(A)\n\n")
        for ln in sec["Pair Coeffs"]:
            f.write(ln + "\n")
        for t, m, e, s, c in NEW_TYPES:
            f.write(f"{t}  {e:.6f}  {s:.4f}  # {c}\n")
        f.write("\nBond Coeffs   # harmonic: K(kcal/mol/A^2)  r0(A)\n\n")
        for ln in sec["Bond Coeffs"]:
            f.write(ln + "\n")
        for b, k, r, c in NEW_BONDS:
            f.write(f"{b}  {k:.4f}  {r:.4f}  # {c}\n")
        for b, pairs in LIGAND_PAIRS.items():
            r0 = np.mean([np.linalg.norm(atoms[i][3] - atoms[j][3]) for i, j in pairs])
            f.write(f"{b}  {LIGAND_K[b]:.4f}  {r0:.4f}  # OPTIONAL {LIGAND_NAME[b]} "
                    f"(crystal r0 from 1H2R coords, generic K; created only if LIGFIX=1)\n")
        for name in ("Angle Coeffs", "Dihedral Coeffs"):
            f.write(f"\n{name}\n\n")
            for ln in sec[name]:
                f.write(ln + "\n")
        f.write("\nAtoms   # full: id mol type q x y z\n\n")
        for a in out_atoms:
            x = a[4]
            f.write(f"{a[0]} {a[1]} {a[2]} {a[3]:.6f} {x[0]:.4f} {x[1]:.4f} {x[2]:.4f}\n")
        for name, rows in (("Bonds", bonds), ("Angles", angles), ("Dihedrals", dihed)):
            f.write(f"\n{name}\n\n")
            for i, r in enumerate(rows, 1):
                f.write(f"{i} " + " ".join(map(str, r)) + "\n")

    print(f"bonds {len(bonds)}  angles {len(angles)}  dihedrals {len(dihed)}")
    print(f"hydration level h = {W * 18.0153 / m_prot:.2f} g water / g protein "
          f"(protein mass {m_prot / 1000:.1f} kDa)")
    print(f"gas molecules (incl. H2): {n_gas} in box {vol:.0f} A^3")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 2026)

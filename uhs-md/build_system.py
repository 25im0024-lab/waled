#!/usr/bin/env python3
"""Build a LAMMPS data file for H2 + cushion gas + brine in a calcite (10-14) slit pore.

Geometry (fully periodic in x, y, z):

    | calcite slab | brine film | H2 + cushion gas | brine film | (periodic image of slab)
    z=0 ................................................................... z=Lz

The slab's periodic image closes the pore, so no wall potentials or slab
Ewald correction are needed. The brine films model a water-wet carbonate
pore; set --water-film 0 for a dry pore.

Gas molecule counts come from the mixture density at (T, P), computed with
CoolProp (HEOS, falling back to Peng-Robinson). "Bacteria" are represented by
their metabolic products, not as cells (see README, section "Bacteria"):
  --bio methanogenesis : 4 H2 + CO2 -> CH4 + 2 H2O (hydrogenotrophic methanogens)

Usage example:
  python build_system.py --cushion CO2 --x-cushion 0.3 --T 333.15 --P 10e6 \
      --molality 1.0 --bio methanogenesis --bio-conversion 0.10 --out run_co2_bio
"""
import argparse
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from ff import params as P  # noqa: E402

NA = 6.02214076e23

# ---------------------------------------------------------------------------
# Calcite crystal: space group R-3c (167), hexagonal setting.
# Effenberger, Mereiter & Zemann, Z. Kristallogr. 156 (1981) 233:
# a = 4.9896 A, c = 17.0610 A; Ca 6b (0,0,0), C 6a (0,0,1/4), O 18e (x,0,1/4).
# x(O) = 0.2570 gives C-O = 1.282 A (measured C-O is about 1.28 A).
# ---------------------------------------------------------------------------
A_HEX, C_HEX, X_O = 4.9896, 17.0610, 0.2570
D104 = 3.035  # (10-14) interlayer spacing, A


def hex_matrix():
    a, c = A_HEX, C_HEX
    return np.array([[a, 0, 0],
                     [-a / 2, a * math.sqrt(3) / 2, 0],
                     [0, 0, c]])  # rows = a, b, c


def calcite_units():
    """Formula units in the conventional hexagonal cell (fractional coords).

    Returns list of (kind, centre_frac, O_offsets_frac).
    """
    cent = [np.zeros(3), np.array([2 / 3, 1 / 3, 1 / 3]), np.array([1 / 3, 2 / 3, 2 / 3])]
    offA = np.array([[X_O, 0, 0], [0, X_O, 0], [-X_O, -X_O, 0]])
    units = []
    for t in cent:
        units.append(("Ca", np.array([0, 0, 0.0]) + t, None))
        units.append(("Ca", np.array([0, 0, 0.5]) + t, None))
        units.append(("CO3", np.array([0, 0, 0.25]) + t, offA))
        units.append(("CO3", np.array([0, 0, 0.75]) + t, -offA))
    return units


def surface_vectors(hkl=(1, 0, 4)):
    """Two shortest orthogonal lattice translations lying in the (hkl) plane."""
    H = hex_matrix()
    cents = [np.zeros(3), np.array([2 / 3, 1 / 3, 1 / 3]), np.array([1 / 3, 2 / 3, 2 / 3])]
    rng = range(-6, 7)
    cands = []
    for k in cents:
        for n1 in rng:
            for n2 in rng:
                for n3 in rng:
                    f = np.array([n1, n2, n3]) + k
                    if abs(np.dot(hkl, f)) < 1e-8 and np.any(np.abs(f) > 1e-8):
                        cands.append(f @ H)
    cands.sort(key=lambda v: np.linalg.norm(v))
    t1 = cands[0]
    t2 = next(v for v in cands if abs(np.dot(v, t1)) < 1e-6 * np.linalg.norm(v) * np.linalg.norm(t1)
              and np.linalg.norm(np.cross(v, t1)) > 1e-6)
    return t1, t2


def build_calcite_slab(nx, ny, nlayers):
    """Return atoms (list of (type, xyz, molid_local)) and box lengths Lx, Ly, slab thickness."""
    H = hex_matrix()
    t1, t2 = surface_vectors()
    e1 = t1 / np.linalg.norm(t1)
    e2 = t2 / np.linalg.norm(t2)
    e3 = np.cross(e1, e2)
    R = np.vstack([e1, e2, e3])  # rotates lab -> surface frame
    Lx, Ly = nx * np.linalg.norm(t1), ny * np.linalg.norm(t2)

    span = math.sqrt(Lx ** 2 + Ly ** 2 + (nlayers * D104 + 10) ** 2)
    n12 = int(span / A_HEX) + 3
    n3 = int(span / C_HEX) + 3
    grid = np.array([(i, j, k) for i in range(-n12, n12 + 1)
                     for j in range(-n12, n12 + 1) for k in range(-n3, n3 + 1)], float)
    units = calcite_units()

    # Unit centres in the surface frame
    recs = []
    for kind, cf, off in units:
        cart = (grid + cf) @ H @ R.T
        recs.append((kind, cart, off))
    allZ = np.concatenate([r[1][:, 2] for r in recs if r[0] == "Ca"])
    # Ca layer positions near the origin
    zl = np.unique(np.round(allZ[np.abs(allZ) < nlayers * D104 + 5], 3))
    zl = zl[zl >= 0][:nlayers]
    if len(zl) < nlayers:
        raise RuntimeError("not enough calcite layers generated")
    zlo, zhi = zl[0] - D104 / 2, zl[-1] + D104 / 2

    atoms = []
    mol = 0
    for kind, cart, off in recs:
        sel = ((cart[:, 0] >= -1e-6) & (cart[:, 0] < Lx - 1e-6) &
               (cart[:, 1] >= -1e-6) & (cart[:, 1] < Ly - 1e-6) &
               (cart[:, 2] >= zlo) & (cart[:, 2] < zhi))
        for c in cart[sel]:
            mol += 1
            if kind == "Ca":
                atoms.append(("Ca", c.copy(), mol))
            else:
                atoms.append(("Cc", c.copy(), mol))
                for o in off:
                    atoms.append(("Oc", c + (o @ H) @ R.T, mol))
    xyz = np.array([a[1] for a in atoms])
    zmin = xyz[:, 2].min()
    for a in atoms:
        a[1][2] -= zmin  # molecules stay whole; write_data sets image flags
    thick = xyz[:, 2].max() - zmin
    nca = sum(1 for a in atoms if a[0] == "Ca")
    nc = sum(1 for a in atoms if a[0] == "Cc")
    assert nca == nc == 2 * nx * ny * nlayers, (nca, nc)
    return atoms, Lx, Ly, thick


# ---------------------------------------------------------------------------
# Fluid densities
# ---------------------------------------------------------------------------
COOLPROP_NAMES = {"H2": "Hydrogen", "CH4": "Methane", "CO2": "CarbonDioxide", "N2": "Nitrogen"}


def gas_molar_density(T, Pa, comp):
    """Mixture molar density [mol/m3] at T [K], P [Pa]; comp = {species: mole fraction}."""
    import CoolProp.CoolProp as CP
    comp = {k: v for k, v in comp.items() if v > 0}
    fluid = "&".join(f"{COOLPROP_NAMES[k]}[{v}]" for k, v in comp.items())
    errs = []
    for backend in ("HEOS", "PR"):
        try:
            return CP.PropsSI("Dmolar", "T", T, "P", Pa, f"{backend}::{fluid}"), backend
        except Exception as e:  # noqa: BLE001 (CoolProp raises ValueError variants)
            errs.append(f"{backend}: {e}")
    raise RuntimeError("CoolProp failed: " + " | ".join(errs))


def water_number_density(T, Pa):
    """Pure-water number density [1/A^3]; ions are placed on water sites."""
    import CoolProp.CoolProp as CP
    rho = CP.PropsSI("Dmolar", "T", T, "P", Pa, "Water")
    return rho * NA * 1e-30


# ---------------------------------------------------------------------------
# Placement helpers
# ---------------------------------------------------------------------------
def random_rotation(rng):
    q = rng.normal(size=4)
    q /= np.linalg.norm(q)
    a, b, c, d = q
    return np.array([[a*a+b*b-c*c-d*d, 2*(b*c-a*d), 2*(b*d+a*c)],
                     [2*(b*c+a*d), a*a-b*b+c*c-d*d, 2*(c*d-a*b)],
                     [2*(b*d-a*c), 2*(c*d+a*b), a*a-b*b-c*c+d*d]])


def grid_points(Lx, Ly, zlo, zhi, spacing):
    nx = max(1, int(Lx / spacing))
    ny = max(1, int(Ly / spacing))
    nz = max(1, int((zhi - zlo) / spacing))
    xs = (np.arange(nx) + 0.5) * Lx / nx
    ys = (np.arange(ny) + 0.5) * Ly / ny
    zs = zlo + (np.arange(nz) + 0.5) * (zhi - zlo) / nz
    return np.array([(x, y, z) for x in xs for y in ys for z in zs])


def pick_sites(Lx, Ly, zlo, zhi, n, spacing, rng):
    if n == 0:
        return np.zeros((0, 3))
    s = spacing
    while True:
        g = grid_points(Lx, Ly, zlo, zhi, s)
        if len(g) >= n:
            break
        s *= 0.95
        if s < 2.2:
            raise RuntimeError(f"cannot fit {n} molecules in z=[{zlo:.1f},{zhi:.1f}]")
    return g[rng.choice(len(g), n, replace=False)]


def water_template():
    th = math.radians(P.GEOM["water_HOH"] / 2)
    r = P.GEOM["water_OH"]
    return [("Ow", np.zeros(3)), ("Hw", np.array([r*math.sin(th), 0, r*math.cos(th)])),
            ("Hw", np.array([-r*math.sin(th), 0, r*math.cos(th)]))]


def co2_template():
    r = P.GEOM["co2_CO"]
    return [("Cco2", np.zeros(3)), ("Oco2", np.array([0, 0, r])), ("Oco2", np.array([0, 0, -r]))]


def n2_template():
    r = P.GEOM["n2_NN"] / 2
    return [("Mn2", np.zeros(3)), ("Nn2", np.array([0, 0, r])), ("Nn2", np.array([0, 0, -r]))]


TEMPLATES = {"H2O": water_template(), "CO2": co2_template(), "N2": n2_template(),
             "H2": [("H2", np.zeros(3))], "CH4": [("CH4", np.zeros(3))],
             "Na": [("Na", np.zeros(3))], "Cl": [("Cl", np.zeros(3))]}


# ---------------------------------------------------------------------------
def build(args):
    rng = np.random.default_rng(args.seed)
    calcite = P.load_calcite(args.calcite_ff)
    if not calcite["verified"] and not args.accept_unverified_calcite:
        sys.exit("The calcite parameter file is marked verified=false.\n"
                 "Use a documented set (default ff/calcite.json) or pass\n"
                 "--accept-unverified-calcite for a smoke test only.")

    slab, Lx, Ly, thick = build_calcite_slab(args.nx, args.ny, args.layers)
    gap = 1.5  # A, clearance between surface atoms and first fluid site
    s_top = thick + gap
    Lz = thick + args.pore
    s_bot = Lz - gap  # facing surface = periodic image of slab bottom at z = Lz
    tw = args.water_film
    gas_lo, gas_hi = s_top + tw, s_bot - tw
    if gas_hi - gas_lo < 6.0:
        sys.exit("pore too narrow for the requested water films")
    area = Lx * Ly

    # --- brine
    nw_dens = water_number_density(args.T, args.P)
    n_w = int(round(nw_dens * area * 2 * tw)) if tw > 0 else 0
    n_salt = int(round(args.molality * n_w * 18.015e-3)) if n_w else 0

    # --- gas
    comp = {"H2": 1.0 - args.x_cushion}
    if args.x_cushion > 0:
        comp[args.cushion] = args.x_cushion
    rho_mol, backend = gas_molar_density(args.T, args.P, comp)
    n_gas_tot = rho_mol * NA * 1e-30 * area * (gas_hi - gas_lo - 2 * 1.5)
    counts = {k: int(round(v * n_gas_tot)) for k, v in comp.items()}

    # --- bacterial metabolism (stoichiometric product scenario)
    bio = {"mode": args.bio}
    if args.bio == "methanogenesis":
        dh2 = int(round(args.bio_conversion * counts["H2"] / 4)) * 4
        nco2_needed = dh2 // 4
        co2_from = "cushion gas"
        if counts.get("CO2", 0) >= nco2_needed:
            counts["CO2"] = counts.get("CO2", 0) - nco2_needed
        else:
            co2_from = "carbonate/brine (HCO3-) - not removed explicitly"
        counts["H2"] -= dh2
        counts["CH4"] = counts.get("CH4", 0) + dh2 // 4
        n_w += dh2 // 2
        bio.update(H2_consumed=dh2, CH4_produced=dh2 // 4, H2O_produced=dh2 // 2,
                   CO2_consumed=nco2_needed, CO2_source=co2_from)
    counts = {k: v for k, v in counts.items() if v > 0}

    # --- placement
    molecules = []  # (species, centre)
    if n_w:
        nb = n_w // 2
        sites = np.vstack([pick_sites(Lx, Ly, s_top, s_top + tw, nb, 3.0, rng),
                           pick_sites(Lx, Ly, s_bot - tw, s_bot, n_w - nb, 3.0, rng)])
        species = ["H2O"] * len(sites)
        ion_idx = rng.choice(len(sites), 2 * n_salt, replace=False) if n_salt else []
        for j, i in enumerate(ion_idx):
            species[i] = "Na" if j < n_salt else "Cl"
        molecules += list(zip(species, sites))
    ngas = sum(counts.values())
    gsites = pick_sites(Lx, Ly, gas_lo + 1.5, gas_hi - 1.5, ngas, 4.0, rng)
    gspecies = [k for k, v in counts.items() for _ in range(v)]
    rng.shuffle(gspecies)
    molecules += list(zip(gspecies, gsites))

    # --- assemble atoms / bonds / angles
    tid = {n: i + 1 for i, n in enumerate(P.TYPE_ORDER)}
    bid = {n: i + 1 for i, n in enumerate(P.BOND_ORDER)}
    aid = {n: i + 1 for i, n in enumerate(P.ANGLE_ORDER)}
    types = P.all_types(calcite)
    atoms, bonds, angles = [], [], []

    def add_atom(name, xyz, mol):
        atoms.append((len(atoms) + 1, mol, tid[name], types[name][1], xyz))
        return len(atoms)

    # calcite (bonds/angles inside CO3 so special_bonds excludes them)
    by_mol = {}
    for name, xyz, m in slab:
        idx = add_atom(name, xyz, m)
        by_mol.setdefault(m, []).append((name, idx))
    mol = max(by_mol)
    for m, lst in by_mol.items():
        if lst[0][0] == "Cc":
            c = lst[0][1]
            os_ = [i for n, i in lst[1:]]
            for o in os_:
                bonds.append((bid["Cc-Oc"], c, o))
            for i in range(3):
                for j in range(i + 1, 3):
                    angles.append((aid["Oc-Cc-Oc"], os_[i], c, os_[j]))

    for sp, centre in molecules:
        mol += 1
        Rm = random_rotation(rng)
        idx = [add_atom(n, centre + Rm @ r, mol) for n, r in TEMPLATES[sp]]
        if sp == "H2O":
            bonds += [(bid["Ow-Hw"], idx[0], idx[1]), (bid["Ow-Hw"], idx[0], idx[2])]
            angles.append((aid["Hw-Ow-Hw"], idx[1], idx[0], idx[2]))
        elif sp == "CO2":
            bonds += [(bid["Cco2-Oco2"], idx[0], idx[1]), (bid["Cco2-Oco2"], idx[0], idx[2])]
            angles.append((aid["Oco2-Cco2-Oco2"], idx[1], idx[0], idx[2]))
        elif sp == "N2":
            bonds += [(bid["Nn2-Mn2"], idx[0], idx[1]), (bid["Nn2-Mn2"], idx[0], idx[2])]

    qtot = sum(a[3] for a in atoms)
    if abs(qtot) > 1e-4:
        raise RuntimeError(f"system not neutral: q = {qtot:.6f}")

    os.makedirs(args.out, exist_ok=True)
    write_data(os.path.join(args.out, "system.data"), atoms, bonds, angles,
               (Lx, Ly, Lz), types)
    P.write_forcefield(os.path.join(args.out, "forcefield.lmp"), calcite)

    n_species = {sp: sum(1 for s, _ in molecules if s == sp) for sp in
                 ("H2O", "Na", "Cl", "H2", "CH4", "CO2", "N2")}
    meta = {
        "conditions": {"T_K": args.T, "P_Pa": args.P, "molality_NaCl": args.molality},
        "gas_feed_mole_fractions": comp, "eos_backend": backend,
        "gas_molar_density_mol_m3": rho_mol,
        "bio": bio, "counts": n_species,
        "box_A": [Lx, Ly, Lz], "slab_thickness_A": thick,
        "regions_A": {"surface_top": thick, "surface_bottom_image": Lz,
                      "water_film": tw, "gas_lo": gas_lo, "gas_hi": gas_hi},
        "calcite_ff": calcite["name"], "calcite_verified": calcite["verified"],
        "natoms": len(atoms), "seed": args.seed,
    }
    with open(os.path.join(args.out, "system.json"), "w") as f:
        json.dump(meta, f, indent=2)
    with open(os.path.join(args.out, "system.lmp"), "w") as f:
        f.write("# Generated by build_system.py\n")
        f.write(f"variable T       equal {args.T}\n")
        f.write(f"variable gas_lo  equal {gas_lo + 3.0:.3f}   # bulk-gas region for pressure\n")
        f.write(f"variable gas_hi  equal {gas_hi - 3.0:.3f}\n")
        f.write(f"variable n_rigid equal {n_species['CO2'] + n_species['N2']}\n")
        f.write(f"variable n_h2    equal {n_species['H2']}\n")
    return meta


def write_data(path, atoms, bonds, angles, box, types):
    Lx, Ly, Lz = box
    with open(path, "w") as f:
        f.write("UHS calcite slit pore: brine + H2 + cushion gas (build_system.py)\n\n")
        f.write(f"{len(atoms)} atoms\n{len(bonds)} bonds\n{len(angles)} angles\n\n")
        f.write(f"{len(P.TYPE_ORDER)} atom types\n{len(P.BOND_ORDER)} bond types\n"
                f"{len(P.ANGLE_ORDER)} angle types\n\n")
        f.write(f"0.0 {Lx:.6f} xlo xhi\n0.0 {Ly:.6f} ylo yhi\n0.0 {Lz:.6f} zlo zhi\n\n")
        f.write("Masses\n\n")
        for i, n in enumerate(P.TYPE_ORDER):
            f.write(f"{i+1} {types[n][0]:.4f}  # {n}\n")
        f.write("\nAtoms  # full\n\n")
        L = np.array([Lx, Ly, Lz])
        for i, m, t, q, r in atoms:
            img = np.floor(r / L).astype(int)  # unwrapped molecules stay whole
            w = r - img * L
            edge = np.round(w, 5) >= L  # -1e-9 would otherwise print as L
            w[edge] -= L[edge]
            img[edge] += 1
            x, y, z = np.abs(w) * (np.round(w, 5) != 0)
            f.write(f"{i} {m} {t} {q:.6f} {x:.5f} {y:.5f} {z:.5f} "
                    f"{img[0]} {img[1]} {img[2]}\n")
        if bonds:
            f.write("\nBonds\n\n")
            for k, (t, a, b) in enumerate(bonds):
                f.write(f"{k+1} {t} {a} {b}\n")
        if angles:
            f.write("\nAngles\n\n")
            for k, (t, a, b, c) in enumerate(angles):
                f.write(f"{k+1} {t} {a} {b} {c}\n")


def parse(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--cushion", choices=["CO2", "CH4", "N2"], default="CO2")
    p.add_argument("--x-cushion", type=float, default=0.3, help="cushion-gas mole fraction in the gas feed")
    p.add_argument("--T", type=float, default=333.15, help="temperature [K]")
    p.add_argument("--P", type=float, default=10e6, help="gas pressure used to set the gas loading [Pa]")
    p.add_argument("--molality", type=float, default=1.0, help="NaCl molality [mol/kg water]")
    p.add_argument("--water-film", type=float, default=10.0, help="brine film thickness on each wall [A]")
    p.add_argument("--pore", type=float, default=60.0, help="pore width, surface to surface [A]")
    p.add_argument("--nx", type=int, default=6, help="surface cells along x (4.99 A each)")
    p.add_argument("--ny", type=int, default=4, help="surface cells along y (8.09 A each)")
    p.add_argument("--layers", type=int, default=4, help="calcite (10-14) layers (3.035 A each)")
    p.add_argument("--bio", choices=["none", "methanogenesis"], default="none")
    p.add_argument("--bio-conversion", type=float, default=0.10,
                   help="fraction of H2 consumed by methanogens (0-1)")
    p.add_argument("--calcite-ff", default=None, help="calcite parameter JSON (default ff/calcite.json)")
    p.add_argument("--accept-unverified-calcite", action="store_true")
    p.add_argument("--seed", type=int, default=2026)
    p.add_argument("--out", default="run")
    a = p.parse_args(argv)
    if not 0 <= a.x_cushion < 1:
        p.error("--x-cushion must be in [0, 1)")
    if not 0 <= a.bio_conversion <= 1:
        p.error("--bio-conversion must be in [0, 1]")
    return a


if __name__ == "__main__":
    m = build(parse())
    print(json.dumps({k: m[k] for k in ("counts", "box_A", "natoms", "bio", "eos_backend")}, indent=2))
    if not m["calcite_verified"]:
        print("WARNING: calcite parameters are marked unverified - smoke test only.")

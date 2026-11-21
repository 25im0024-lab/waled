#!/usr/bin/env python3
"""
Post-processing of the [NiFe]-hydrogenase + H2 LAMMPS pilot run
(input: h2_hydrogenase_v6_small.in).

Reads
  h2_msd_timeseries.dat   production time series (fix ave/time, every 100 steps)
  equil.lammpstrj         NPT equilibration trajectory (every 2500 steps)
  final_config.data       write_data at the end of production (with image flags + velocities)

Writes PNG figures and summary.txt into OUTDIR.

usage: python3 analyze_hydrogenase.py DATADIR OUTDIR
       (files are matched by suffix, so upload prefixes such as 'b55e6f01-' are fine)
"""
import glob
import os
import sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import stats
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import breadth_first_order, connected_components
from scipy.spatial import cKDTree

# ----------------------------------------------------------------- style
C1, C2, C3 = "#2a78d6", "#eb6834", "#1baf7a"     # categorical slots 1-3
INK, INK2, GRID = "#0b0b0b", "#52514e", "#e4e3df"
plt.rcParams.update({
    "figure.dpi": 150, "savefig.dpi": 200, "font.size": 9,
    "axes.edgecolor": INK2, "axes.labelcolor": INK, "axes.titlesize": 10,
    "axes.titleweight": "bold", "axes.grid": True, "grid.color": GRID,
    "grid.linewidth": 0.6, "axes.spines.top": False, "axes.spines.right": False,
    "xtick.color": INK2, "ytick.color": INK2, "lines.linewidth": 1.2,
    "legend.frameon": False, "figure.facecolor": "white",
})

NI_ID, FE_ID = 12305, 12306
T_SET = 300.0
FS_PER_STEP = 1.0
AMU_A3_TO_GCC = 1.66053906660

out_lines = []


def log(s=""):
    print(s)
    out_lines.append(s)


def find(datadir, suffix):
    m = sorted(glob.glob(os.path.join(datadir, "*" + suffix)))
    if not m:
        sys.exit(f"missing *{suffix} in {datadir}")
    return m[0]


def running_mean(y, w):
    k = np.ones(w) / w
    return np.convolve(y, k, mode="valid")


def autocorr(y, nmax):
    y = y - y.mean()
    n = len(y)
    f = np.fft.rfft(y, 2 * n)
    ac = np.fft.irfft(f * np.conj(f))[:n]
    ac /= ac[0]
    return ac[:nmax]


def integrated_time(ac, dt):
    """Integrated autocorrelation time, summed until first zero crossing."""
    z = np.where(ac <= 0)[0]
    cut = z[0] if len(z) else len(ac)
    return dt * (0.5 + ac[1:cut].sum()), cut


def kabsch_rmsd(P, Q, w=None):
    """RMSD of P onto Q after optimal superposition (rows = atoms)."""
    if w is None:
        w = np.ones(len(P))
    w = w / w.sum()
    pc, qc = (P * w[:, None]).sum(0), (Q * w[:, None]).sum(0)
    P0, Q0 = P - pc, Q - qc
    H = (P0 * w[:, None]).T @ Q0
    U, S, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    D = np.diag([1, 1, d])
    R = Vt.T @ D @ U.T
    diff = (R @ P0.T).T - Q0
    return np.sqrt((w * (diff ** 2).sum(1)).sum())


def rg(X, m):
    c = (X * m[:, None]).sum(0) / m.sum()
    return np.sqrt((m * ((X - c) ** 2).sum(1)).sum() / m.sum())


# ----------------------------------------------------------------- readers
def read_data(path):
    with open(path) as f:
        lines = f.read().split("\n")
    box = {}
    masses = {}
    sec = None
    atoms, vels, bonds = [], [], []
    for ln in lines:
        s = ln.strip()
        if not s:
            continue
        if s.endswith("xlo xhi"):
            box["x"] = tuple(map(float, s.split()[:2])); continue
        if s.endswith("ylo yhi"):
            box["y"] = tuple(map(float, s.split()[:2])); continue
        if s.endswith("zlo zhi"):
            box["z"] = tuple(map(float, s.split()[:2])); continue
        head = s.split("#")[0].strip()
        if head in ("Masses", "Atoms", "Velocities", "Bonds", "Angles",
                    "Dihedrals", "Pair Coeffs", "Bond Coeffs", "Angle Coeffs",
                    "Dihedral Coeffs", "Impropers", "Improper Coeffs"):
            sec = head; continue
        if sec == "Masses":
            a = s.split(); masses[int(a[0])] = float(a[1])
        elif sec == "Atoms":
            atoms.append(s.split()[:10])
        elif sec == "Velocities":
            vels.append(s.split()[:4])
        elif sec == "Bonds":
            bonds.append(s.split()[2:4])
    A = np.array(atoms, dtype=float)
    A = A[np.argsort(A[:, 0])]
    V = np.array(vels, dtype=float)
    V = V[np.argsort(V[:, 0])]
    B = np.array(bonds, dtype=int)
    lo = np.array([box["x"][0], box["y"][0], box["z"][0]])
    hi = np.array([box["x"][1], box["y"][1], box["z"][1]])
    ids = A[:, 0].astype(int)
    row = -np.ones(ids.max() + 1, int)       # atom ID -> row (IDs need not be consecutive)
    row[ids] = np.arange(len(ids))
    return dict(id=ids, row=row, mol=A[:, 1].astype(int),
                type=A[:, 2].astype(int), q=A[:, 3], x=A[:, 4:7],
                img=A[:, 7:10].astype(int), v=V[:, 1:4], bonds=B,
                lo=lo, L=hi - lo, masses=masses)


def read_dump(path):
    frames = []
    with open(path) as f:
        while True:
            ln = f.readline()
            if not ln:
                break
            if not ln.startswith("ITEM: TIMESTEP"):
                continue
            step = int(f.readline())
            f.readline(); n = int(f.readline())
            f.readline()
            bx = np.array([list(map(float, f.readline().split()[:2])) for _ in range(3)])
            f.readline()
            arr = np.loadtxt(f, max_rows=n)
            arr = arr[np.argsort(arr[:, 0])]
            frames.append(dict(step=step, lo=bx[:, 0], L=bx[:, 1] - bx[:, 0],
                               x=arr[:, 3:6]))
    return frames


def mic(d, L):
    return d - L * np.round(d / L)


def make_whole(x, idx, bonds_local, L):
    """Unwrap a bonded set of atoms through PBC by BFS over its bond graph."""
    n = len(idx)
    g = coo_matrix((np.ones(len(bonds_local)), (bonds_local[:, 0], bonds_local[:, 1])),
                   shape=(n, n)).tocsr()
    g = g + g.T
    xs = x[idx].copy()
    ncomp, lab = connected_components(g, directed=False)
    done = np.zeros(n, bool)
    for c in range(ncomp):
        root = np.where(lab == c)[0][0]
        order, pred = breadth_first_order(g, root, directed=False)
        for i in order[1:]:
            p = pred[i]
            xs[i] = xs[p] + mic(xs[i] - xs[p], L)
        done[order] = True
    return xs


# ================================================================== main
def main(datadir, outdir, final="final_config.data", step0=None):
    os.makedirs(outdir, exist_ok=True)
    f_ts = find(datadir, "h2_msd_timeseries.dat")
    f_eq = find(datadir, "equil.lammpstrj")
    f_dat = find(datadir, final)

    # ------------------------------------------------------------ time series
    d = np.loadtxt(f_ts, comments="#")
    step = d[:, 0]
    TH2, Nc, Np, dNi, dFe = d[:, 1], d[:, 2], d[:, 3], d[:, 4], d[:, 5]
    msd = d[:, 6:10]
    Rg_ts, rmsdp = d[:, 10], d[:, 11]

    D = read_data(f_dat)
    step_final = None
    with open(f_dat) as f:
        h = f.readline()
        if "timestep" in h:
            step_final = int(h.split("timestep =")[1].split(",")[0])
    if step0 is None:
        step0 = step_final - 250000 if step_final else step[0] - 100
    T_run = (step[-1] - step0 + (step[1] - step[0])) / 1000.0     # production length, ps
    t = (step - step0) * FS_PER_STEP / 1000.0      # ps since start of production
    dt = (step[1] - step[0]) * FS_PER_STEP / 1000.0

    typ, mol = D["type"], D["mol"]
    m_type = D["masses"]
    mass = np.array([m_type[k] for k in typ])
    is_prot = np.isin(mol, [1, 2])
    is_cof = (typ >= 15) & (typ <= 20)
    is_h2 = typ == 21
    is_wat = (typ == 22) | (typ == 23)
    is_ion = (typ == 24) | (typ == 25)
    nH2 = is_h2.sum()
    nH2mol = len(np.unique(mol[is_h2]))

    log("=" * 72)
    log("[NiFe]-hydrogenase + H2 pilot run: analysis summary")
    log("=" * 72)
    log(f"atoms {len(typ)} | protein {is_prot.sum()} | cofactor {is_cof.sum()} | "
        f"H2 sites {nH2} ({nH2mol} molecules) | water {is_wat.sum() // 3} molecules | ions {is_ion.sum()}")
    log(f"production: steps {step0} -> {step_final} ({(step_final - step0) / 1000:.0f} ps), "
        f"{len(step)} samples every {dt:.2f} ps")
    log(f"total system charge: {D['q'].sum():.4f} e")

    # ---- H2 temperature vs. canonical expectation ----
    ndof_h2 = 5 * nH2mol           # rigid linear molecule: 3 translational + 2 rotational
    # fix rigid/small removes nothing else for a group temperature compute; 3 COM dofs
    # of the whole system are not removed from a sub-group compute.
    sd_expected = T_SET * np.sqrt(2.0 / ndof_h2)
    ac_T = autocorr(TH2, 200)
    tau_T, _ = integrated_time(ac_T, dt)
    neff_T = len(TH2) * dt / (2 * tau_T)
    log("")
    log("--- H2 temperature (rigid 2-site, rigid/nvt/small) ---")
    log(f"<T_H2> = {TH2.mean():.1f} K, SD = {TH2.std():.1f} K; canonical SD for "
        f"{ndof_h2} DOF = {sd_expected:.1f} K")
    log(f"tau_int = {tau_T:.2f} ps, N_eff ~ {neff_T:.0f}, SEM ~ "
        f"{TH2.std() / np.sqrt(neff_T):.1f} K")

    # ---- MSD / diffusion ----
    log("")
    log("--- H2 MSD and diffusion (single time origin, all 29 H2 pooled) ---")
    fa, fb = 0.08 * T_run, 0.6 * T_run
    win = (t >= fa) & (t <= fb)
    fits = {}
    for k, lab, dim in [(0, "x", 1), (1, "y", 1), (2, "z", 1), (3, "total", 3)]:
        r = stats.linregress(t[win], msd[win, k])
        Dk = r.slope / (2 * dim) * 1e-20 / 1e-12       # A^2/ps -> m^2/s
        fits[lab] = (r, Dk)
        log(f"D_{lab:5s} = {Dk * 1e9:5.2f} x 1e-9 m^2/s  (fit {fa:.0f}-{fb:.0f} ps, R^2 = {r.rvalue ** 2:.3f})")
    # windowed sensitivity
    sens = []
    for a, b in [(0.04 * T_run, 0.4 * T_run), (fa, fb), (0.2 * T_run, 0.8 * T_run), (0.4 * T_run, T_run)]:
        w = (t >= a) & (t <= b)
        r = stats.linregress(t[w], msd[w, 3])
        sens.append((a, b, r.slope / 6 * 1e-8 * 1e9))
    log("fit-window sensitivity of D_total (1e-9 m^2/s): " +
        ", ".join(f"{a:.0f}-{b:.0f} ps: {v:.2f}" for a, b, v in sens))
    lg = (t > 1) & (t < 0.8 * T_run)
    alpha = stats.linregress(np.log(t[lg]), np.log(msd[lg, 3])).slope
    log(f"log-log slope alpha (1-{0.8 * T_run:.0f} ps) = {alpha:.2f}  (1 = Fickian)")

    # ---- contacts ----
    log("")
    log("--- H2-protein contacts (H2 sites within 4.5 A of any protein atom) ---")
    ac_N = autocorr(Nc, 1000)
    tau_N, cutN = integrated_time(ac_N, dt)
    log(f"<N_contact> = {Nc.mean():.2f} of {nH2} sites ({100 * Nc.mean() / nH2:.1f} %), "
        f"range {Nc.min():.0f}-{Nc.max():.0f}")
    log(f"integrated autocorrelation time of N_contact = {tau_N:.1f} ps "
        "(collective proxy, NOT the per-molecule residence time)")
    log(f"N_pocket > 0 in {(Np > 0).sum()} of {len(Np)} samples "
        f"({100 * (Np > 0).mean():.2f} %)")

    # ---- active site ----
    log("")
    log("--- closest H2 site to the active-site metals (PBC minimum image) ---")
    for nm, arr in [("Ni", dNi), ("Fe", dFe)]:
        log(f"min dist to {nm}: mean {arr.mean():.1f} A, median {np.median(arr):.1f} A, "
            f"closest {arr.min():.2f} A at t = {t[arr.argmin()]:.1f} ps; "
            f"< 10 A in {100 * (arr < 10).mean():.1f} % of samples")
    q = len(t) // 4
    log("quarter means of minDist_Ni (A): " +
        ", ".join(f"{dNi[i * q:(i + 1) * q].mean():.1f}" for i in range(4)))

    # ---- protein stability ----
    log("")
    log("--- protein stability ---")
    log(f"Rg: {Rg_ts.mean():.2f} +/- {Rg_ts.std():.3f} A; drift first->last 10 % : "
        f"{Rg_ts[:len(t) // 10].mean():.3f} -> {Rg_ts[-len(t) // 10:].mean():.3f} A")
    log(f"RMSD proxy (no superposition): final {rmsdp[-1]:.2f} A; "
        f"last-{0.2 * T_run:.0f}-ps mean {rmsdp[t > 0.8 * T_run].mean():.2f} A")

    # ------------------------------------------------------------ equil trajectory
    frames = read_dump(f_eq)
    log("")
    log(f"--- NPT equilibration trajectory: {len(frames)} frames, steps "
        f"{frames[0]['step']}-{frames[-1]['step']} ---")
    total_mass = mass.sum()
    prot_idx = np.where(is_prot)[0]
    prot_heavy = prot_idx[mass[prot_idx] > 2.0]
    # bond list restricted to protein + cofactors (for PBC unwrapping)
    sol_idx = np.where(is_prot | is_cof)[0]
    pos_in = -np.ones(len(typ), int)
    pos_in[sol_idx] = np.arange(len(sol_idx))
    B = D["row"][D["bonds"]]
    keep = (pos_in[B[:, 0]] >= 0) & (pos_in[B[:, 1]] >= 0)
    Bl = pos_in[B[keep]]
    heavy_in_sol = pos_in[prot_heavy]
    ni_in, fe_in = pos_in[D["row"][NI_ID]], pos_in[D["row"][FE_ID]]

    eq_t, eq_V, eq_rho, eq_rg, eq_rmsd, eq_dni = [], [], [], [], [], []
    eq_whole = []
    prev = None
    for fr in frames:
        xw = make_whole(fr["x"], sol_idx, Bl, fr["L"])
        if prev is not None:      # keep the same periodic image as the previous frame
            shift = np.round((xw.mean(0) - prev.mean(0)) / fr["L"]) * fr["L"]
            xw -= shift
        prev = xw
        eq_whole.append(xw)
        V = np.prod(fr["L"])
        eq_t.append(fr["step"] / 1000.0)
        eq_V.append(V)
        eq_rho.append(total_mass / V * AMU_A3_TO_GCC)
        eq_rg.append(rg(xw[pos_in[prot_idx]], mass[prot_idx]))
        h2x = fr["x"][is_h2]
        eq_dni.append(np.linalg.norm(mic(h2x - xw[ni_in], fr["L"]), axis=1))
    ref = eq_whole[0][heavy_in_sol]
    for xw in eq_whole:
        eq_rmsd.append(kabsch_rmsd(xw[heavy_in_sol], ref))
    eq_t, eq_V, eq_rho = map(np.array, (eq_t, eq_V, eq_rho))
    eq_rg, eq_rmsd, eq_dni = map(np.array, (eq_rg, eq_rmsd, eq_dni))
    for i in range(len(frames)):
        log(f"  step {frames[i]['step']:6d}: V = {eq_V[i]:9.0f} A^3, rho = {eq_rho[i]:.4f} g/cm3, "
            f"Rg = {eq_rg[i]:.2f} A, heavy-atom RMSD vs first = {eq_rmsd[i]:.2f} A, "
            f"closest H2-Ni = {eq_dni[i].min():.1f} A")

    # ------------------------------------------------------------ final configuration
    log("")
    log("--- final configuration (write_data) ---")
    L = D["L"]
    xu = D["x"] + D["img"] * L                       # unwrapped
    rho_f = total_mass / np.prod(L) * AMU_A3_TO_GCC
    log(f"box {L[0]:.2f} x {L[1]:.2f} x {L[2]:.2f} A, rho = {rho_f:.4f} g/cm3")

    # Kabsch RMSD: end of NPT (step 30000) -> end of production
    xs_final = make_whole(D["x"], sol_idx, Bl, L)
    rmsd_prod = kabsch_rmsd(xs_final[heavy_in_sol], eq_whole[-1][heavy_in_sol])
    rmsd_tot = kabsch_rmsd(xs_final[heavy_in_sol], eq_whole[0][heavy_in_sol])
    rg_final = rg(xs_final[pos_in[prot_idx]], mass[prot_idx])
    # displacement of protein COM (what the proxy cannot remove)
    com_shift = np.linalg.norm(
        (xu[prot_idx] * mass[prot_idx, None]).sum(0) / mass[prot_idx].sum()
        - (eq_whole[-1][pos_in[prot_idx]] * mass[prot_idx, None]).sum(0) / mass[prot_idx].sum())
    log(f"protein heavy-atom RMSD with Kabsch superposition: end-NPT -> final = {rmsd_prod:.2f} A; "
        f"first NPT frame -> final = {rmsd_tot:.2f} A")
    log(f"protein COM translation over production (unwrapped) = {com_shift:.2f} A "
        f"(RMSD proxy contains this, Kabsch RMSD does not)")
    log(f"Rg from final coordinates = {rg_final:.2f} A")

    # periodic self-contact of the protein (images across the thin water shell)
    P = xs_final[pos_in[np.where(is_prot | is_cof)[0]]] if False else xs_final
    tree = cKDTree(P)
    best = (np.inf, None)
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            for k in (-1, 0, 1):
                if i == j == k == 0:
                    continue
                s = np.array([i, j, k]) * L
                dd, _ = tree.query(P + s, k=1)
                if dd.min() < best[0]:
                    best = (dd.min(), (i, j, k))
    ext = P.max(0) - P.min(0)
    log(f"protein+cofactor extent {ext[0]:.1f} x {ext[1]:.1f} x {ext[2]:.1f} A vs box; "
        f"closest approach to its own periodic image = {best[0]:.1f} A (shift {best[1]})")

    # per-H2 analysis
    h2_ids = np.where(is_h2)[0]
    h2_mols = mol[h2_ids]
    umols = np.unique(h2_mols)
    prot_tree = cKDTree(np.mod(D["x"][prot_idx] - D["lo"], L), boxsize=L)
    wat_O = np.where(typ == 22)[0]
    wat_tree = cKDTree(np.mod(D["x"][wat_O] - D["lo"], L), boxsize=L)
    ni_x = D["x"][D["row"][NI_ID]]
    bondlen, dni_mol, dprot_mol, nwat_mol, nprot8 = [], [], [], [], []
    for mm in umols:
        ii = h2_ids[h2_mols == mm]
        a, b = D["x"][ii[0]], D["x"][ii[1]]
        bondlen.append(np.linalg.norm(mic(a - b, L)))
        com = a + 0.5 * mic(b - a, L)
        comw = np.mod(com - D["lo"], L)
        dni_mol.append(np.linalg.norm(mic(com - ni_x, L)))
        dprot_mol.append(prot_tree.query(comw)[0])
        nwat_mol.append(len(wat_tree.query_ball_point(comw, 3.5)))
        nprot8.append(len(prot_tree.query_ball_point(comw, 8.0)))
    bondlen, dni_mol, dprot_mol = map(np.array, (bondlen, dni_mol, dprot_mol))
    nwat_mol, nprot8 = np.array(nwat_mol), np.array(nprot8)
    log(f"H-H bond length: mean {bondlen.mean():.4f} A, range {bondlen.min():.4f}-{bondlen.max():.4f} A "
        f"(target 0.741)")
    sig21 = 2.96 * 2 ** (1 / 6)
    geom_ok = np.abs(bondlen - 0.741).max() < 0.01
    if geom_ok:
        log("  -> H2 geometry check PASSED (all within 0.01 A of 0.741 A)")
    else:
        log(f"  -> FAILED. 2^(1/6)*sigma_H2 = {sig21:.3f} A = LJ minimum: with no H-H bond/exclusion the two "
            "sites repelled each other during the (pre-rigid) minimization and fix rigid/small then froze "
            "that separation. The 'H2' simulated is a ~3 A dumbbell, not H2.")
    buried = (nwat_mol == 0) & (nprot8 > 40)
    surface = (dprot_mol < 4.5) & ~buried
    bulk = ~buried & ~surface
    log(f"H2 classification at the final frame: {buried.sum()} buried (no water O within 3.5 A, "
        f">40 protein atoms within 8 A), {surface.sum()} at the surface (<4.5 A of protein), "
        f"{bulk.sum()} in water")
    log("per-molecule (mol, d_Ni, d_protein, waterO<3.5A, protein atoms<8A): " +
        "; ".join(f"{m}:{a:.1f},{b:.1f},{c},{e}" for m, a, b, c, e in
                  zip(umols, dni_mol, dprot_mol, nwat_mol, nprot8)))

    # kinetic temperatures from velocities (real units: A/fs, g/mol)
    mvv2kcal = 1.0 / 4.184e-4                     # (g/mol)(A/fs)^2 -> kcal/mol
    kB = 0.0019872067
    def ktemp(sel, ndof):
        ke = 0.5 * (mass[sel, None] * D["v"][sel] ** 2).sum() * mvv2kcal
        return 2 * ke / (ndof * kB)
    T_w = ktemp(is_wat, 6 * is_wat.sum() // 3)
    T_p = ktemp(is_prot | is_cof, 3 * (is_prot | is_cof).sum())
    T_h = ktemp(is_h2, ndof_h2)
    log(f"kinetic T from final velocities: water {T_w:.1f} K (6 DOF/molecule, SHAKE), "
        f"protein+cofactors {T_p:.1f} K, H2 {T_h:.1f} K (5 DOF/molecule)")
    log(f"net charge of cofactor atoms: {D['q'][is_cof].sum():.3f} e; "
        f"atoms with q = 0 among cofactors: {(D['q'][is_cof] == 0).sum()}/{is_cof.sum()}")
    log(f"total system charge: {D['q'].sum():.4f} e")

    # water density away from the protein (shell check)
    dprot_w, _ = prot_tree.query(np.mod(D["x"][wat_O] - D["lo"], L))
    edges = np.arange(0, 22, 1.0)
    hist, _ = np.histogram(dprot_w, edges)
    # volume of each shell estimated by Monte-Carlo points
    rng = np.random.default_rng(1)
    pts = rng.random((400000, 3)) * L
    dpts, _ = prot_tree.query(pts)
    vfrac, _ = np.histogram(dpts, edges)
    shell_vol = vfrac / len(pts) * np.prod(L)
    with np.errstate(invalid="ignore", divide="ignore"):
        rho_w = hist * 18.015 / shell_vol * AMU_A3_TO_GCC
    log("water density vs distance from nearest protein atom (g/cm3): " +
        ", ".join(f"{edges[i]:.0f}-{edges[i + 1]:.0f}A:{rho_w[i]:.2f}"
                  for i in range(len(hist)) if shell_vol[i] > 500))
    log(f"largest distance of any point in the box from the protein = {dpts.max():.1f} A")

    # =============================================================== FIGURES
    def save(fig, name):
        fig.savefig(os.path.join(outdir, name), bbox_inches="tight")
        plt.close(fig)

    w = max(1, min(50, len(t) // 5))  # 5 ps running mean (shorter for very short runs)

    # ---- Fig 1: overview dashboard ----
    fig, ax = plt.subplots(3, 2, figsize=(10, 8.5), sharex=True)
    panels = [
        (ax[0, 0], TH2, "T(H$_2$) (K)", "H$_2$ temperature"),
        (ax[0, 1], Nc, "H$_2$ sites in contact", "H$_2$–protein contacts (≤ 4.5 Å)"),
        (ax[1, 0], dNi, "distance (Å)", "Closest H$_2$ site to Ni"),
        (ax[1, 1], msd[:, 3], "MSD (Å$^2$)", "H$_2$ total MSD"),
        (ax[2, 0], Rg_ts, "R$_g$ (Å)", "Protein radius of gyration"),
        (ax[2, 1], rmsdp, "RMSD proxy (Å)", "Protein RMSD proxy (no fit)"),
    ]
    for a, y, yl, ttl in panels:
        a.plot(t, y, color=C1, alpha=0.35, lw=0.7)
        if ttl not in ("H$_2$ total MSD",):
            a.plot(t[w - 1:], running_mean(y, w), color=C1, lw=1.6, label="5 ps running mean")
        else:
            a.plot(t, y, color=C1, lw=1.4)
        a.set_ylabel(yl); a.set_title(ttl, loc="left")
    ax[0, 0].axhline(T_SET, color=INK2, ls="--", lw=0.8)
    ax[1, 0].axhline(6.0, color=C2, ls="--", lw=1)
    ax[1, 0].text(t[-1], 6.6, "pocket radius 6 Å", ha="right", color=INK2, fontsize=8)
    ax[0, 0].legend(loc="upper right", fontsize=7)
    for a in ax[2]:
        a.set_xlabel("production time (ps)")
    fig.suptitle(f"Production run overview ({T_run:.0f} ps, NVT 300 K)", x=0.01, ha="left",
                 fontweight="bold")
    fig.tight_layout()
    save(fig, "fig01_overview.png")

    # ---- Fig 2: MSD and diffusion ----
    fig, ax = plt.subplots(1, 2, figsize=(10, 4))
    for k, lab, col in [(0, "x", C1), (1, "y", C2), (2, "z", C3)]:
        ax[0].plot(t, msd[:, k], color=col, lw=1.2, label=f"MSD$_{lab}$")
        r, Dk = fits[lab]
        ax[0].text(t[-1] + 3, msd[-1, k], f"{lab}: D = {Dk * 1e9:.1f}", color=INK2,
                   fontsize=8, va="center")
    ax[0].set_xlim(0, 1.2 * T_run)
    ax[0].set_xlabel("time (ps)"); ax[0].set_ylabel("MSD (Å$^2$)")
    ax[0].set_title(f"Per-axis MSD (D in 10$^{{-9}}$ m$^2$/s, {fa:.0f}–{fb:.0f} ps fit)", loc="left")
    ax[0].legend(loc="upper left")
    r, Dt = fits["total"]
    ax[1].loglog(t, msd[:, 3], color=C1, lw=1.4, label="MSD total")
    tt = np.logspace(np.log10(0.5), np.log10(T_run), 50)
    ax[1].loglog(tt, r.slope * tt, color=INK2, ls="--", lw=0.9,
                 label=f"6Dt, D = {Dt * 1e9:.1f}×10$^{{-9}}$ m$^2$/s")
    ax[1].loglog(tt, msd[0, 3] * (tt / t[0]) ** 2, color=C2, ls=":", lw=1, label="~ t$^2$ (ballistic)")
    ax[1].axvspan(fa, fb, color=GRID, alpha=0.6, lw=0)
    ax[1].set_ylim(1, 3000)
    ax[1].set_xlabel("time (ps)"); ax[1].set_ylabel("MSD (Å$^2$)")
    ax[1].set_title(f"Log–log MSD (α = {alpha:.2f}, 1–{0.8 * T_run:.0f} ps)", loc="left")
    ax[1].legend(loc="upper left", fontsize=8)
    fig.tight_layout()
    save(fig, "fig02_msd_diffusion.png")

    # ---- Fig 3: H2 temperature distribution ----
    fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
    ax[0].hist(TH2, bins=40, density=True, color=C1, alpha=0.75, edgecolor="white", lw=0.5,
               label="sampled")
    Tg = np.linspace(TH2.min() * 0.9, TH2.max() * 1.05, 300)
    k_ = ndof_h2 / 2.0
    pdf = stats.gamma.pdf(Tg, a=k_, scale=T_SET / k_)
    ax[0].plot(Tg, pdf, color=C2, lw=1.6, label=f"canonical (Γ, {ndof_h2} DOF, 300 K)")
    ax[0].set_xlabel("T(H$_2$) (K)"); ax[0].set_ylabel("probability density")
    ax[0].set_title("H$_2$ temperature distribution", loc="left")
    ax[0].legend(fontsize=8)
    lag = np.arange(len(ac_T)) * dt
    ax[1].plot(lag, ac_T, color=C1, lw=1.4)
    ax[1].axhline(0, color=INK2, lw=0.7)
    ax[1].set_xlabel("lag (ps)"); ax[1].set_ylabel("autocorrelation")
    ax[1].set_title(f"T(H$_2$) autocorrelation (τ$_{{int}}$ = {tau_T:.2f} ps)", loc="left")
    fig.tight_layout()
    save(fig, "fig03_h2_temperature.png")

    # ---- Fig 4: contacts ----
    fig, ax = plt.subplots(1, 3, figsize=(12, 3.6), gridspec_kw=dict(width_ratios=[2.2, 1, 1.4]))
    ax[0].step(t, Nc, color=C1, lw=0.6, alpha=0.5, where="mid")
    ax[0].plot(t[w - 1:], running_mean(Nc, w), color=C1, lw=1.6)
    ax[0].set_xlabel("time (ps)"); ax[0].set_ylabel(f"H$_2$ sites in contact (of {nH2})")
    ax[0].set_title("H$_2$–protein contact count", loc="left")
    vals, cnts = np.unique(Nc.astype(int), return_counts=True)
    ax[1].barh(vals, cnts / cnts.sum() * 100, color=C1, height=0.8)
    ax[1].set_xlabel("% of samples"); ax[1].set_ylabel("sites in contact")
    ax[1].set_title("Distribution", loc="left")
    lagN = np.arange(len(ac_N)) * dt
    ax[2].plot(lagN, ac_N, color=C1, lw=1.4)
    ax[2].axhline(0, color=INK2, lw=0.7)
    ax[2].set_xlabel("lag (ps)"); ax[2].set_ylabel("autocorrelation")
    ax[2].set_title(f"Contact-count memory (τ$_{{int}}$ ≈ {tau_N:.1f} ps)", loc="left")
    fig.tight_layout()
    save(fig, "fig04_contacts.png")

    # ---- Fig 5: active site distances ----
    fig, ax = plt.subplots(1, 2, figsize=(10, 3.8), gridspec_kw=dict(width_ratios=[2, 1]))
    ax[0].plot(t, dNi, color=C1, lw=0.6, alpha=0.4)
    ax[0].plot(t[w - 1:], running_mean(dNi, w), color=C1, lw=1.6, label="Ni (5 ps mean)")
    ax[0].plot(t, dFe, color=C2, lw=0.6, alpha=0.4)
    ax[0].plot(t[w - 1:], running_mean(dFe, w), color=C2, lw=1.6, label="Fe (5 ps mean)")
    ax[0].plot(t, np.minimum.accumulate(dNi), color=INK2, lw=1, ls="--",
               label="closest Ni approach so far")
    ax[0].axhline(6, color=C3, lw=1.2)
    ax[0].text(2, 6.5, "pocket radius 6 Å", fontsize=8, color=INK2)
    ax[0].set_xlabel("time (ps)"); ax[0].set_ylabel("closest H$_2$ site (Å)")
    ax[0].set_title("Closest H$_2$ to the Ni–Fe centre", loc="left")
    ax[0].legend(fontsize=7, loc="upper right")
    bins = np.arange(4, 36, 1)
    ax[1].hist(dNi, bins=bins, color=C1, alpha=0.7, label="Ni", edgecolor="white", lw=0.4)
    ax[1].hist(dFe, bins=bins, color=C2, alpha=0.5, label="Fe", edgecolor="white", lw=0.4)
    ax[1].axvline(6, color=C3, lw=1.2)
    ax[1].set_xlabel("closest H$_2$ site (Å)"); ax[1].set_ylabel("samples")
    ax[1].set_title("Distribution", loc="left")
    ax[1].legend(fontsize=8)
    fig.tight_layout()
    save(fig, "fig05_active_site.png")

    # ---- Fig 6: protein stability ----
    fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
    ax[0].plot(t, Rg_ts, color=C1, lw=0.6, alpha=0.4)
    ax[0].plot(t[w - 1:], running_mean(Rg_ts, w), color=C1, lw=1.6)
    ax[0].set_xlabel("time (ps)"); ax[0].set_ylabel("R$_g$ (Å)")
    ax[0].set_title(f"Protein R$_g$ ({Rg_ts.mean():.2f} ± {Rg_ts.std():.2f} Å)", loc="left")
    ax[1].plot(t, rmsdp, color=C1, lw=1.2, label="RMSD proxy (no fit, from input)")
    ax[1].scatter([t[-1]], [rmsd_prod], s=40, color=C2, zorder=5,
                  label=f"heavy-atom RMSD, Kabsch fit: {rmsd_prod:.2f} Å")
    ax[1].set_xlabel("time (ps)"); ax[1].set_ylabel("RMSD (Å)")
    ax[1].set_title("Protein structural drift", loc="left")
    ax[1].legend(fontsize=8, loc="lower right")
    fig.tight_layout()
    save(fig, "fig06_protein_stability.png")

    # ---- Fig 7: NPT equilibration ----
    fig, ax = plt.subplots(2, 2, figsize=(10, 6.5), sharex=True)
    ax[0, 0].plot(eq_t, eq_rho, "o-", color=C1, ms=4)
    ax[0, 0].set_ylabel("density (g/cm$^3$)"); ax[0, 0].set_title("System density (NPT)", loc="left")
    ax[0, 1].plot(eq_t, eq_rg, "o-", color=C1, ms=4)
    ax[0, 1].set_ylabel("R$_g$ (Å)"); ax[0, 1].set_title("Protein R$_g$", loc="left")
    ax[1, 0].plot(eq_t, eq_rmsd, "o-", color=C1, ms=4)
    ax[1, 0].set_ylabel("RMSD (Å)")
    ax[1, 0].set_title("Heavy-atom RMSD vs first frame (Kabsch)", loc="left")
    bp = ax[1, 1].boxplot(eq_dni.T, positions=eq_t, widths=1.2, patch_artist=True,
                          medianprops=dict(color=INK), flierprops=dict(ms=2))
    for b in bp["boxes"]:
        b.set_facecolor(C1); b.set_alpha(0.5)
    ax[1, 1].plot(eq_t, eq_dni.min(1), "o-", color=C2, ms=4, label="closest H$_2$")
    ax[1, 1].set_ylabel("H$_2$–Ni distance (Å)")
    ax[1, 1].set_title("All 58 H$_2$ sites: distance to Ni", loc="left")
    ax[1, 1].legend(fontsize=8)
    ax[1, 1].set_xticks(eq_t); ax[1, 1].set_xticklabels([f"{x:.1f}" for x in eq_t], rotation=45)
    for a in ax[1]:
        a.set_xlabel("time step / 1000 (= ps)")
    fig.suptitle("NPT equilibration (equil.lammpstrj)", x=0.01, ha="left", fontweight="bold")
    fig.tight_layout()
    save(fig, "fig07_equilibration.png")

    # ---- Fig 8: final configuration per H2 ----
    fig, ax = plt.subplots(1, 3, figsize=(13.5, 4))
    cls = np.where(buried, "buried", np.where(surface, "surface", "in water"))
    for lab, col in [("buried", C2), ("surface", C1), ("in water", C3)]:
        s = cls == lab
        ax[0].scatter(dprot_mol[s], dni_mol[s], s=36, color=col, label=f"{lab} ({s.sum()})",
                      edgecolor="white", lw=1)
    ax[0].axhline(6, color=INK2, ls="--", lw=0.8)
    ax[0].set_xlabel("H$_2$ COM to nearest protein atom (Å)")
    ax[0].set_ylabel("H$_2$ COM to Ni (Å)")
    ax[0].set_title("Where the 29 H$_2$ are at the end", loc="left")
    ax[0].legend(fontsize=8)
    cen = rho_w.copy()
    good = shell_vol > 500
    ax[1].plot(edges[:-1][good] + 0.5, cen[good], "o-", color=C1, ms=4)
    ax[1].axhline(1.0, color=INK2, ls="--", lw=0.8)
    ax[1].set_xlabel("distance from nearest protein atom (Å)")
    ax[1].set_ylabel("water density (g/cm$^3$)")
    ax[1].set_title("Hydration-shell water density (final frame)", loc="left")
    ax[2].hist(bondlen, bins=np.arange(0.5, 3.6, 0.05), color=C3 if geom_ok else C2,
               edgecolor="white", lw=0.5)
    ax[2].axvline(0.741, color=C1, lw=1.6)
    ax[2].text(0.79, ax[2].get_ylim()[1] * 0.9, "intended 0.741 Å", color=INK2, fontsize=8)
    ax[2].axvline(2.96 * 2 ** (1 / 6), color=INK2, ls="--", lw=1)
    ax[2].text(2.96 * 2 ** (1 / 6) - 0.05, ax[2].get_ylim()[1] * 0.75, "LJ minimum\n2$^{1/6}$σ = 3.32 Å",
               color=INK2, fontsize=8, ha="right")
    ax[2].set_xlabel("H–H site separation within each H$_2$ (Å)")
    ax[2].set_ylabel("molecules")
    ax[2].set_title("H$_2$ geometry check: " + ("PASSED" if geom_ok else "FAILED"), loc="left")
    fig.tight_layout()
    save(fig, "fig08_final_config.png")

    # ---- Fig 9: snapshot projections ----
    fig, ax = plt.subplots(1, 3, figsize=(12, 4.2))
    Pp = np.mod(D["x"][prot_heavy] - D["lo"], L)
    Hh = np.mod(D["x"][h2_ids] - D["lo"], L)
    M = np.mod(D["x"][[D["row"][NI_ID], D["row"][FE_ID]]] - D["lo"], L)
    for a, (i, j, ln) in zip(ax, [(0, 1, "x–y"), (0, 2, "x–z"), (1, 2, "y–z")]):
        a.scatter(Pp[:, i], Pp[:, j], s=0.3, color="#b9b8b2", rasterized=True)
        h2cls = np.repeat(cls, 2)
        for lab, col in [("buried", C2), ("surface", C1), ("in water", C3)]:
            s = h2cls == lab
            a.scatter(Hh[s, i], Hh[s, j], s=14, color=col, edgecolor="white", lw=0.5,
                      label=lab)
        a.scatter(M[:, i], M[:, j], s=60, marker="*", color=INK, label="Ni / Fe")
        a.set_xlim(0, L[i]); a.set_ylim(0, L[j]); a.set_aspect("equal")
        a.set_title(f"{ln} projection", loc="left")
        a.set_xlabel(f"{'xyz'[i]} (Å)"); a.set_ylabel(f"{'xyz'[j]} (Å)")
        a.grid(False)
    ax[0].legend(fontsize=7, loc="lower left", markerscale=1.2)
    fig.suptitle("Final frame: protein heavy atoms (grey), H$_2$, active-site metals",
                 x=0.01, ha="left", fontweight="bold")
    fig.tight_layout()
    save(fig, "fig09_snapshot.png")

    with open(os.path.join(outdir, "summary.txt"), "w") as f:
        f.write("\n".join(out_lines) + "\n")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("datadir"); ap.add_argument("outdir")
    ap.add_argument("--final", default="final_config.data", help="suffix of the write_data file")
    ap.add_argument("--step0", type=int, default=None, help="time step at which production starts")
    a = ap.parse_args()
    main(a.datadir, a.outdir, a.final, a.step0)

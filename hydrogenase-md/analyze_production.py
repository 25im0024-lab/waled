#!/usr/bin/env python3
"""
Production-trajectory analysis for the [NiFe]-hydrogenase + H2 pilot run.
Combines production.lammpstrj (50 frames, every 5 ps) with the files used by
analyze_hydrogenase.py (time series, equilibration trajectory, final data file).

usage: python3 analyze_production.py DATADIR PRODUCTION_DUMP OUTDIR
"""
import os
import sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import stats
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import breadth_first_order, connected_components

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze_hydrogenase import (C1, C2, C3, INK, INK2, GRID, NI_ID, FE_ID,
                                 find, read_data, read_dump, mic, kabsch_rmsd, rg)

out = []


def log(s=""):
    print(s)
    out.append(s)


def bfs_plan(n, bonds_local):
    g = coo_matrix((np.ones(len(bonds_local)), (bonds_local[:, 0], bonds_local[:, 1])),
                   shape=(n, n)).tocsr()
    g = g + g.T
    ncomp, lab = connected_components(g, directed=False)
    plan = []
    for c in range(ncomp):
        root = np.where(lab == c)[0][0]
        order, pred = breadth_first_order(g, root, directed=False)
        plan.append((order[1:], pred[order[1:]]))
    return plan


def whole(xs, plan, L):
    xs = xs.copy()
    for order, pred in plan:
        for i, p in zip(order, pred):
            xs[i] = xs[p] + mic(xs[i] - xs[p], L)
    return xs


def block_sem(y, nblocks=5):
    b = np.array_split(y, nblocks)
    m = np.array([bb.mean() for bb in b])
    return m.std(ddof=1) / np.sqrt(nblocks)


def fit_kabsch(P, Q):
    """return P superposed onto Q (equal weights)"""
    pc, qc = P.mean(0), Q.mean(0)
    H = (P - pc).T @ (Q - qc)
    U, S, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    R = Vt.T @ np.diag([1, 1, d]) @ U.T
    return (R @ (P - pc).T).T + qc


def main(datadir, dumpfile, outdir):
    os.makedirs(outdir, exist_ok=True)
    D = read_data(find(datadir, "final_config.data"))
    ts = np.loadtxt(find(datadir, "h2_msd_timeseries.dat"), comments="#")
    eq = read_dump(find(datadir, "equil.lammpstrj"))
    pr = read_dump(dumpfile)

    typ, mol = D["type"], D["mol"]
    mass = np.array([D["masses"][k] for k in typ])
    is_prot = np.isin(mol, [1, 2])
    is_cof = (typ >= 15) & (typ <= 20)
    is_h2 = typ == 21
    prot_idx = np.where(is_prot)[0]
    rdf_j = np.where(typ <= 14)[0]                      # 'compute rdf ... 21 1*14'
    h2_ids = np.where(is_h2)[0]
    umols = np.unique(mol[h2_ids])
    pairs = np.array([h2_ids[mol[h2_ids] == m] for m in umols])   # (29, 2)
    nmol = len(umols)
    wat_O = np.where(typ == 22)[0]

    sol_idx = np.where(is_prot | is_cof)[0]
    pos_in = -np.ones(len(typ), int)
    pos_in[sol_idx] = np.arange(len(sol_idx))
    B = D["bonds"] - 1
    keep = (pos_in[B[:, 0]] >= 0) & (pos_in[B[:, 1]] >= 0)
    plan = bfs_plan(len(sol_idx), pos_in[B[keep]])
    heavy = np.where(is_prot & (mass > 2.0))[0]
    heavy_in = pos_in[heavy]
    prot_in = pos_in[prot_idx]

    step0 = 30205
    frames = eq + pr
    tag = np.array(["eq"] * len(eq) + ["prod"] * len(pr))
    steps = np.array([f["step"] for f in frames])
    tps = (steps - step0) / 1000.0                     # ps relative to production start

    log("=" * 72)
    log("Production trajectory analysis (production.lammpstrj + previous files)")
    log("=" * 72)
    log(f"production frames: {len(pr)} (steps {pr[0]['step']}-{pr[-1]['step']}, every "
        f"{(pr[1]['step'] - pr[0]['step']) / 1000:.0f} ps); equilibration frames: {len(eq)}")

    # ------------------------------------------------ protein: whole, Rg, RMSD, image distance
    W = []
    prev = None
    img_d = []
    for fr in frames:
        xw = whole(fr["x"][sol_idx], plan, fr["L"])
        if prev is not None:
            xw -= np.round((xw.mean(0) - prev.mean(0)) / fr["L"]) * fr["L"]
        prev = xw
        W.append(xw)
        tree = cKDTree(xw)
        best = np.inf
        for i in (-1, 0, 1):
            for j in (-1, 0, 1):
                for k in (-1, 0, 1):
                    if i == j == k == 0:
                        continue
                    dd, _ = tree.query(xw + np.array([i, j, k]) * fr["L"],
                                       distance_upper_bound=best)
                    best = min(best, dd.min())
        img_d.append(best)
    img_d = np.array(img_d)
    ref_i = len(eq) - 1                                  # step 30000 = start of production
    ref = W[ref_i][heavy_in]
    rmsd = np.array([kabsch_rmsd(w[heavy_in], ref) for w in W])
    rgs = np.array([rg(w[prot_in], mass[prot_idx]) for w in W])
    # active-site region: heavy atoms within 12 A of Ni at the reference
    ni_in, fe_in = pos_in[NI_ID - 1], pos_in[FE_ID - 1]
    dref = np.linalg.norm(ref - W[ref_i][ni_in], axis=1)
    loc = dref < 12.0
    rmsd_site_local = np.array([kabsch_rmsd(w[heavy_in][loc], ref[loc]) for w in W])
    nife = np.array([np.linalg.norm(w[ni_in] - w[fe_in]) for w in W])

    P = np.array([W[i][heavy_in] for i in range(len(frames)) if tag[i] == "prod"])
    # iterative fit to the average structure
    avg = P[0].copy()
    for _ in range(3):
        Pf = np.array([fit_kabsch(p, avg) for p in P])
        avg = Pf.mean(0)
    rmsf = np.sqrt(((Pf - avg) ** 2).sum(2).mean(0))
    davg_ni = np.linalg.norm(avg - avg.mean(0), axis=1)
    dist_ni_avg = np.linalg.norm(avg - np.array([fit_kabsch(W[i][heavy_in], avg)
                                                 for i in [ref_i]])[0][0] * 0 -
                                 W[ref_i][ni_in] + W[ref_i][heavy_in].mean(0) - avg.mean(0),
                                 axis=1) if False else dref
    prod = tag == "prod"
    log("")
    log("--- protein (heavy atoms, Kabsch fit to the production-start structure) ---")
    log(f"RMSD: last 100 ps {rmsd[prod & (tps > 150)].mean():.2f} +/- "
        f"{rmsd[prod & (tps > 150)].std():.2f} A, final {rmsd[-1]:.2f} A, max {rmsd[prod].max():.2f} A")
    log(f"active-site region (heavy atoms < 12 A of Ni, n={loc.sum()}), locally fitted RMSD: "
        f"last 100 ps {rmsd_site_local[prod & (tps > 150)].mean():.2f} A")
    log(f"Ni-Fe distance: {nife[prod].mean():.3f} +/- {nife[prod].std():.3f} A")
    log(f"Rg from trajectory: {rgs[prod].mean():.2f} +/- {rgs[prod].std():.3f} A")
    log(f"RMSF over production: mean {rmsf.mean():.2f} A, median {np.median(rmsf):.2f} A, "
        f"95th pct {np.percentile(rmsf, 95):.2f} A; atoms < 12 A of Ni: {rmsf[loc].mean():.2f} A")
    log(f"closest protein-image approach: min {img_d[prod].min():.1f} A, mean {img_d[prod].mean():.1f} A; "
        f"below 12 A cutoff in {(img_d[prod] < 12).sum()}/{prod.sum()} production frames")

    # ------------------------------------------------ H2 per molecule
    PF = [f for f in pr]
    nF = len(PF)
    dtF = (PF[1]["step"] - PF[0]["step"]) / 1000.0
    tF = np.array([(f["step"] - step0) / 1000.0 for f in PF])
    bond = np.zeros((nF, nmol))
    com = np.zeros((nF, nmol, 3))
    contact_site = np.zeros((nF, 2 * nmol), bool)
    contact_mol = np.zeros((nF, nmol), bool)
    buried = np.zeros((nF, nmol), bool)
    dmin_prot = np.zeros((nF, nmol))
    d_ni = np.zeros((nF, nmol))
    d_fe = np.zeros((nF, nmol))
    site_dni = np.zeros(nF)
    site_dfe = np.zeros(nF)
    pocket = np.zeros(nF, int)
    rmax, nb = 12.0, 100
    edges = np.linspace(0, rmax, nb + 1)
    rdf_counts = np.zeros(nb)
    rho_j = []
    for f_i, fr in enumerate(PF):
        L, lo = fr["L"], fr["lo"]
        x = fr["x"]
        a, b = x[pairs[:, 0]], x[pairs[:, 1]]
        dv = mic(b - a, L)
        bond[f_i] = np.linalg.norm(dv, axis=1)
        c = a + 0.5 * dv
        com[f_i] = c
        xp = np.mod(x[prot_idx] - lo, L)
        tp = cKDTree(xp, boxsize=L)
        sites = np.mod(x[h2_ids] - lo, L)
        ds, _ = tp.query(sites)
        contact_site[f_i] = ds <= 4.5
        dsm = dict(zip(h2_ids, ds))
        dsite = np.array([[dsm[p0], dsm[p1]] for p0, p1 in pairs])
        dmin_prot[f_i] = dsite.min(1)
        contact_mol[f_i] = dmin_prot[f_i] <= 4.5
        cw = np.mod(c - lo, L)
        tw = cKDTree(np.mod(x[wat_O] - lo, L), boxsize=L)
        nw = np.array([len(v) for v in tw.query_ball_point(cw, 3.5)])
        n8 = np.array([len(v) for v in tp.query_ball_point(cw, 8.0)])
        buried[f_i] = (nw == 0) & (n8 > 40)
        ni, fe = x[NI_ID - 1], x[FE_ID - 1]
        d_ni[f_i] = np.linalg.norm(mic(c - ni, L), axis=1)
        d_fe[f_i] = np.linalg.norm(mic(c - fe, L), axis=1)
        sni = np.linalg.norm(mic(x[h2_ids] - ni, L), axis=1)
        sfe = np.linalg.norm(mic(x[h2_ids] - fe, L), axis=1)
        site_dni[f_i], site_dfe[f_i] = sni.min(), sfe.min()
        pocket[f_i] = ((sni < 6.0) | (sfe < 6.0)).sum()
        # RDF H2 sites -> types 1-14 (LAMMPS normalisation: bulk density of j over the box)
        tj = cKDTree(np.mod(x[rdf_j] - lo, L), boxsize=L)
        for i_s, nbrs in enumerate(tj.query_ball_point(sites, rmax)):
            if nbrs:
                r = np.linalg.norm(mic(np.mod(x[rdf_j[nbrs]] - lo, L) - sites[i_s], L), axis=1)
                rdf_counts += np.histogram(r, edges)[0]
        rho_j.append(len(rdf_j) / np.prod(L))
    shell = 4.0 / 3.0 * np.pi * (edges[1:] ** 3 - edges[:-1] ** 3)
    rho = np.mean(rho_j)
    g = rdf_counts / (nF * len(h2_ids)) / (rho * shell)
    rc = 0.5 * (edges[1:] + edges[:-1])
    cn = np.cumsum(rdf_counts / (nF * len(h2_ids)))

    log("")
    log("--- H2 geometry over all production frames ---")
    log(f"H-H separation: {bond.mean():.3f} A (range {bond.min():.3f}-{bond.max():.3f}); "
        f"max per-molecule drift over 245 ps = {np.abs(bond - bond[0]).max():.4f} A "
        "-> geometry frozen by fix rigid, still ~3 A instead of 0.741 A")

    # validation against fix ave/time output at matching steps
    tsd = {int(r[0]): r for r in ts}
    m_steps = [f["step"] for f in PF if f["step"] in tsd]
    nc_ts = np.array([tsd[s][2] for s in m_steps])
    nc_tr = np.array([contact_site[i].sum() for i, f in enumerate(PF) if f["step"] in tsd])
    dni_ts = np.array([tsd[s][4] for s in m_steps])
    dni_tr = np.array([site_dni[i] for i, f in enumerate(PF) if f["step"] in tsd])
    log("")
    log(f"--- validation vs fix ave/time ({len(m_steps)} matching steps) ---")
    log(f"N_contact: exact match in {(nc_ts == nc_tr).sum()}/{len(m_steps)} frames; "
        f"min-dist-to-Ni max |diff| = {np.abs(dni_ts - dni_tr).max():.3f} A")

    # ---------------- diffusion: time-averaged, all origins, per molecule
    U = np.zeros_like(com)
    U[0] = com[0]
    for i in range(1, nF):
        U[i] = U[i - 1] + mic(com[i] - com[i - 1], PF[i]["L"])
    maxlag = nF - 1
    lags = np.arange(1, maxlag + 1)
    msd_mol = np.zeros((len(lags), nmol))
    for k, lg in enumerate(lags):
        dd = U[lg:] - U[:-lg]
        msd_mol[k] = (dd ** 2).sum(2).mean(0)
    msd_mean = msd_mol.mean(1)
    tl = lags * dtF
    fw = (tl >= 10) & (tl <= 100)
    r = stats.linregress(tl[fw], msd_mean[fw])
    D_all = r.slope / 6 * 1e-8                  # A^2/ps -> m^2/s
    D_mol = np.array([stats.linregress(tl[fw], msd_mol[fw, m]).slope / 6 * 1e-8
                      for m in range(nmol)])
    rng = np.random.default_rng(0)
    boot = []
    for _ in range(2000):
        s = rng.integers(0, nmol, nmol)
        boot.append(stats.linregress(tl[fw], msd_mol[fw][:, s].mean(1)).slope / 6 * 1e-8)
    D_ci = np.percentile(boot, [2.5, 97.5])
    frac_contact_mol = contact_mol.mean(0)
    free = frac_contact_mol < 0.2
    D_free = stats.linregress(tl[fw], msd_mol[fw][:, free].mean(1)).slope / 6 * 1e-8
    D_bound = (stats.linregress(tl[fw], msd_mol[fw][:, ~free].mean(1)).slope / 6 * 1e-8
               if (~free).sum() > 1 else np.nan)
    alpha = stats.linregress(np.log(tl[(tl >= 5) & (tl <= 120)]),
                             np.log(msd_mean[(tl >= 5) & (tl <= 120)])).slope
    log("")
    log("--- H2 diffusion (COM, all time origins, 5 ps resolution) ---")
    log(f"D = {D_all * 1e9:.2f} x 1e-9 m^2/s (fit 10-100 ps lag), 95 % bootstrap CI over molecules "
        f"{D_ci[0] * 1e9:.2f}-{D_ci[1] * 1e9:.2f}; alpha (5-120 ps) = {alpha:.2f}")
    log(f"per-molecule D: median {np.median(D_mol) * 1e9:.2f}, range {D_mol.min() * 1e9:.2f}-"
        f"{D_mol.max() * 1e9:.2f} x 1e-9 m^2/s")
    log(f"molecules in contact < 20 % of time (n={free.sum()}): D = {D_free * 1e9:.2f}; "
        f"protein-associated (n={(~free).sum()}): D = {D_bound * 1e9:.2f} x 1e-9 m^2/s")

    # ---------------- contacts, residence
    log("")
    log("--- H2-protein contact and residence (molecule-level, 4.5 A, 5 ps sampling) ---")
    log(f"molecules in contact per frame: {contact_mol.sum(1).mean():.2f} +/- "
        f"{contact_mol.sum(1).std():.2f} of {nmol} ({100 * contact_mol.mean():.1f} %)")
    log(f"molecules that touched the protein at least once: {(contact_mol.any(0)).sum()}/{nmol}; "
        f"buried at least once: {buried.any(0).sum()}; buried fraction of molecule-frames "
        f"{100 * buried.mean():.1f} %")
    episodes, censored, ep_mol = [], [], []
    for m in range(nmol):
        s = contact_mol[:, m].astype(int)
        dsg = np.diff(np.r_[0, s, 0])
        st, en = np.where(dsg == 1)[0], np.where(dsg == -1)[0]
        for a_, b_ in zip(st, en):
            episodes.append((b_ - a_) * dtF)
            censored.append(a_ == 0 or b_ == nF)
            ep_mol.append(m)
    episodes, censored = np.array(episodes), np.array(censored)
    h = contact_mol.astype(float)
    nlag = 30
    CI = np.zeros(nlag)
    CC = np.zeros(nlag)
    for k in range(nlag):
        a_ = h[:nF - k]
        b_ = h[k:]
        CI[k] = (a_ * b_).sum() / a_.sum()
        cont = np.ones_like(a_)
        for j in range(k + 1):
            cont *= h[j:nF - k + j]
        CC[k] = cont.sum() / a_.sum()
    tlag = np.arange(nlag) * dtF
    hb = h.mean()
    CIn = (CI - hb) / (1 - hb)
    tau_I = dtF * (0.5 + CIn[1:][np.cumprod(CIn[1:] > 0) > 0].sum())
    tau_C = dtF * (0.5 + CC[1:][np.cumprod(CC[1:] > 0) > 0].sum())
    # same, excluding molecules that are in contact in > 90 % of frames (trapped)
    trapped = contact_mol.mean(0) > 0.9
    ht = h[:, ~trapped]
    CCt = np.zeros(nlag)
    for k in range(nlag):
        a_ = ht[:nF - k]
        cont = np.ones_like(a_)
        for j in range(k + 1):
            cont *= ht[j:nF - k + j]
        CCt[k] = cont.sum() / a_.sum()
    tau_Ct = dtF * (0.5 + CCt[1:][np.cumprod(CCt[1:] > 0) > 0].sum())
    ep_t = np.array([e for e, m_ in zip(episodes, ep_mol) if not trapped[m_]])
    log(f"contact episodes: {len(episodes)} ({censored.sum()} cut by trajectory ends); "
        f"mean length {episodes.mean():.1f} ps, median {np.median(episodes):.1f} ps, "
        f"longest {episodes.max():.0f} ps")
    log(f"single-frame (<= 5 ps) episodes: {100 * (episodes <= dtF).mean():.0f} % -> "
        "most contacts are shorter than the sampling interval")
    log(f"residence correlation, all molecules: tau_C ~ {tau_C:.1f} ps, tau_I ~ {tau_I:.1f} ps "
        f"-> dominated by {trapped.sum()} trapped molecule(s) (mol {', '.join(map(str, umols[trapped]))}, "
        "in contact in every frame); not a meaningful average")
    log(f"transient molecules only (n={(~trapped).sum()}): tau_C ~ {tau_Ct:.1f} ps; episodes mean "
        f"{ep_t.mean():.1f} ps, median {np.median(ep_t):.1f} ps, max {ep_t.max():.0f} ps "
        "(5 ps sampling: contacts shorter than ~5 ps are not resolved; true residence is shorter)")
    top = np.argsort(-frac_contact_mol)[:5]
    log("most protein-associated molecules (mol: % frames in contact, % buried, min d_Ni): " +
        "; ".join(f"{umols[m]}: {100 * frac_contact_mol[m]:.0f}, {100 * buried[:, m].mean():.0f}, "
                  f"{d_ni[:, m].min():.1f}" for m in top))
    log("")
    log("--- active site (5 ps frames) ---")
    log(f"closest H2 site to Ni per frame: mean {site_dni.mean():.1f} A, min {site_dni.min():.2f} A; "
        f"pocket (<6 A of Ni or Fe) occupied in {(pocket > 0).sum()}/{nF} frames")
    log(f"closest H2 COM to Ni over the whole run: {d_ni.min():.1f} A (mol {umols[np.unravel_index(d_ni.argmin(), d_ni.shape)[1]]})")
    loc_max = [i for i in range(1, nb - 1) if g[i] > g[i - 1] and g[i] >= g[i + 1] and g[i] > 0.05]
    log("")
    log("--- RDF H2 sites -> protein atoms (types 1-14), averaged over 50 frames ---")
    log("g(r) at r = " + ", ".join(f"{rr} A: {g[min(np.searchsorted(rc, rr), nb - 1)]:.3f}" for rr in (3, 3.5, 4, 4.5, 6, 8, 10, 11.9)))
    log("local maxima (r, g): " + (", ".join(f"({rc[i]:.2f}, {g[i]:.3f})" for i in loc_max[:4]) or "none"))
    log(f"coordination number within 4.5 A = {cn[np.searchsorted(rc, 4.5)]:.2f}, within 12 A = {cn[-1]:.1f}")
    log("note: protein atoms are not homogeneous in the box, so g(r) here follows the LAMMPS "
        "'compute rdf' convention and does not tend to 1.")

    # ---------------- consolidated table
    T = ts[:, 1]
    tsec = (ts[:, 0] - step0) / 1000.0
    log("")
    log("=" * 72)
    log("FINAL RESULTS (production, 250 ps; mean +/- block SEM of 5 x 50 ps blocks)")
    log("=" * 72)
    rows = [
        ("T(H2) as reported (142 DOF) [K]", T.mean(), block_sem(T)),
        ("T(H2) corrected to 145 DOF [K]", T.mean() * 142 / 145, block_sem(T) * 142 / 145),
        ("H2 sites in contact (of 58)", ts[:, 2].mean(), block_sem(ts[:, 2])),
        ("H2 molecules in contact (of 29)", contact_mol.sum(1).mean(), block_sem(contact_mol.sum(1))),
        ("closest H2 site to Ni [A]", ts[:, 4].mean(), block_sem(ts[:, 4])),
        ("closest H2 site to Fe [A]", ts[:, 5].mean(), block_sem(ts[:, 5])),
        ("pocket occupancy [% of samples]", 100 * (ts[:, 3] > 0).mean(), np.nan),
        ("D(H2) all-origin [1e-9 m^2/s]", D_all * 1e9, (D_ci[1] - D_ci[0]) / 3.92 * 1e9),
        ("Rg protein [A]", ts[:, 10].mean(), block_sem(ts[:, 10])),
        ("RMSD heavy, Kabsch, last 100 ps [A]", rmsd[prod & (tps > 150)].mean(),
         rmsd[prod & (tps > 150)].std() / np.sqrt(4)),
        ("RMSF heavy atoms, mean [A]", rmsf.mean(), np.nan),
        ("Ni-Fe distance [A]", nife[prod].mean(), nife[prod].std() / np.sqrt(prod.sum() / 5)),
        ("contact residence tau_C, transient [ps]", tau_Ct, np.nan),
        ("contact episode median, transient [ps]", np.median(ep_t), np.nan),
        ("H2 trapped inside protein (whole run)", trapped.sum(), np.nan),
        ("protein-image min distance [A]", img_d[prod].min(), np.nan),
    ]
    for nm, v, e in rows:
        log(f"  {nm:38s} {v:9.2f}" + ("" if np.isnan(e) else f"  +/- {e:.2f}"))

    # ================================================ figures
    def save(fig, name):
        fig.savefig(os.path.join(outdir, name), bbox_inches="tight")
        plt.close(fig)

    # fig10 protein over equil + production
    fig, ax = plt.subplots(1, 3, figsize=(13.5, 3.8))
    for a, y, yl, ttl in [(ax[0], rmsd, "RMSD (Å)", "Heavy-atom RMSD (Kabsch)"),
                          (ax[1], rgs, "R$_g$ (Å)", "Protein R$_g$")]:
        a.axvspan(tps.min() - 2, 0, color=GRID, alpha=0.7, lw=0)
        a.plot(tps, y, "o-", color=C1, ms=3)
        a.set_xlabel("time from production start (ps)"); a.set_ylabel(yl)
        a.set_title(ttl, loc="left")
    ax[0].plot(tps, rmsd_site_local, "o-", color=C2, ms=3, label="active site (< 12 Å of Ni), local fit")
    ax[0].plot(tps[0:0], [], "o-", color=C1, ms=3, label="whole protein")
    ax[0].legend(fontsize=7, loc="lower right")
    ax[0].text(tps.min(), ax[0].get_ylim()[1] * 0.95, "NPT", color=INK2, fontsize=8)
    ax[2].plot(tps, img_d, "o-", color=C1, ms=3)
    ax[2].axhline(12, color=C2, lw=1.2)
    ax[2].text(tps.max(), 12.2, "12 Å cutoff", ha="right", va="bottom", color=INK2, fontsize=8)
    ax[2].set_xlabel("time from production start (ps)"); ax[2].set_ylabel("distance (Å)")
    ax[2].set_title("Protein ↔ own periodic image", loc="left")
    fig.tight_layout(); save(fig, "fig10_protein_full_run.png")

    # fig11 RMSF
    fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
    ax[0].plot(np.arange(len(rmsf)), rmsf, color=C1, lw=0.5)
    ax[0].set_xlabel("protein heavy-atom index"); ax[0].set_ylabel("RMSF (Å)")
    ax[0].set_title("Per-atom RMSF (production)", loc="left")
    bins = np.arange(0, dref.max() + 4, 4)
    idx = np.digitize(dref, bins)
    bm = [rmsf[idx == i].mean() if (idx == i).sum() > 5 else np.nan for i in range(1, len(bins))]
    ax[1].scatter(dref, rmsf, s=1, color="#b9b8b2", rasterized=True)
    ax[1].plot(bins[:-1] + 2, bm, "o-", color=C1, ms=4, label="4 Å bin mean")
    ax[1].set_xlabel("distance from Ni (Å)"); ax[1].set_ylabel("RMSF (Å)")
    ax[1].set_ylim(0, np.percentile(rmsf, 99.5))
    ax[1].set_title("Mobility vs distance from the active site", loc="left")
    ax[1].legend(fontsize=8)
    fig.tight_layout(); save(fig, "fig11_rmsf.png")

    # fig12 multi-origin MSD
    fig, ax = plt.subplots(1, 2, figsize=(10, 3.8), gridspec_kw=dict(width_ratios=[1.6, 1]))
    for m in range(nmol):
        ax[0].plot(tl, msd_mol[:, m], color=C1, lw=0.5, alpha=0.25)
    ax[0].plot(tl, msd_mean, color=C1, lw=2, label="mean of 29 H$_2$")
    ax[0].plot(tl, r.intercept + r.slope * tl, color=C2, ls="--", lw=1.2,
               label=f"fit 10–100 ps: D = {D_all * 1e9:.1f}×10$^{{-9}}$ m$^2$/s")
    ax[0].set_xlim(0, 125); ax[0].set_ylim(0, np.percentile(msd_mol[tl <= 125], 98))
    ax[0].set_xlabel("lag time (ps)"); ax[0].set_ylabel("MSD (Å$^2$)")
    ax[0].set_title("H$_2$ COM MSD, all time origins", loc="left")
    ax[0].legend(fontsize=8, loc="upper left")
    ax[1].hist(D_mol * 1e9, bins=12, color=C1, edgecolor="white", lw=0.5)
    ax[1].axvline(D_all * 1e9, color=C2, lw=1.4)
    ax[1].set_xlabel("per-molecule D (10$^{-9}$ m$^2$/s)"); ax[1].set_ylabel("molecules")
    ax[1].set_title("Spread between molecules", loc="left")
    fig.tight_layout(); save(fig, "fig12_msd_multiorigin.png")

    # fig13 per-molecule maps
    order = np.argsort(d_ni.mean(0))
    fig, ax = plt.subplots(1, 2, figsize=(12, 5), sharey=True)
    im = ax[0].imshow(d_ni[:, order].T, aspect="auto", cmap="Blues_r", origin="lower",
                      extent=[tF[0] - dtF / 2, tF[-1] + dtF / 2, -0.5, nmol - 0.5], vmin=0, vmax=60)
    cb = fig.colorbar(im, ax=ax[0]); cb.set_label("H$_2$ COM – Ni distance (Å)")
    ax[0].set_yticks(range(nmol)); ax[0].set_yticklabels(umols[order], fontsize=6)
    ax[0].set_ylabel("H$_2$ molecule id (sorted by mean distance)")
    ax[0].set_xlabel("time (ps)"); ax[0].set_title("Distance to Ni", loc="left")
    state = contact_mol.astype(int) + buried.astype(int)
    from matplotlib.colors import ListedColormap
    cm = ListedColormap(["#f1f0ec", C1, C2])
    ax[1].imshow(state[:, order].T, aspect="auto", cmap=cm, origin="lower", vmin=0, vmax=2,
                 extent=[tF[0] - dtF / 2, tF[-1] + dtF / 2, -0.5, nmol - 0.5], interpolation="nearest")
    ax[1].set_xlabel("time (ps)"); ax[1].set_title("State: water / protein contact / buried", loc="left")
    from matplotlib.patches import Patch
    ax[1].legend(handles=[Patch(color="#f1f0ec", label="in water"), Patch(color=C1, label="contact ≤ 4.5 Å"),
                          Patch(color=C2, label="buried")], fontsize=7, loc="upper right",
                 bbox_to_anchor=(1.0, 1.12), ncol=3)
    ax[1].grid(False); ax[0].grid(False)
    fig.tight_layout(); save(fig, "fig13_h2_per_molecule.png")

    # fig14 residence
    fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
    eb = np.arange(dtF / 2, episodes.max() + dtF, dtF)
    ax[0].hist(episodes, bins=eb, color=C1, edgecolor="white", lw=0.5)
    ax[0].set_xlabel("contact episode length (ps)"); ax[0].set_ylabel("episodes")
    ax[0].set_title(f"Contact episodes (n = {len(episodes)})", loc="left")
    ax[1].plot(tlag, CC, "o-", color=C1, ms=3, label="continuous, all 29 (trapped mol dominates)")
    ax[1].plot(tlag, CCt, "o-", color=C2, ms=3, label=f"continuous, transient only, τ ≈ {tau_Ct:.1f} ps")
    ax[1].axhline(0, color=INK2, lw=0.7)
    ax[1].set_xlabel("lag (ps)"); ax[1].set_ylabel("correlation")
    ax[1].set_title("Residence correlation functions", loc="left")
    ax[1].legend(fontsize=8)
    fig.tight_layout(); save(fig, "fig14_residence.png")

    # fig15 RDF
    fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
    ax[0].plot(rc, g, color=C1, lw=1.6)
    ax[0].set_xlabel("r (Å)"); ax[0].set_ylabel("g(r)")
    ax[0].set_title("RDF: H$_2$ sites → protein atoms", loc="left")
    ax[1].plot(rc, cn, color=C1, lw=1.6)
    ax[1].axvline(4.5, color=INK2, ls="--", lw=0.8)
    ax[1].text(4.6, cn.max() * 0.9, "contact cutoff 4.5 Å", fontsize=8, color=INK2)
    ax[1].set_xlabel("r (Å)"); ax[1].set_ylabel("protein atoms within r")
    ax[1].set_title("Running coordination number", loc="left")
    fig.tight_layout(); save(fig, "fig15_rdf.png")

    # fig16 validation
    fig, ax = plt.subplots(1, 2, figsize=(8, 3.6))
    ax[0].scatter(nc_ts, nc_tr, s=20, color=C1, edgecolor="white")
    lim = [0, max(nc_ts.max(), nc_tr.max()) + 1]
    ax[0].plot(lim, lim, color=INK2, lw=0.8)
    ax[0].set_xlabel("N_contact, LAMMPS fix ave/time"); ax[0].set_ylabel("N_contact, this script")
    ax[0].set_title("Contact count", loc="left")
    ax[1].scatter(dni_ts, dni_tr, s=20, color=C1, edgecolor="white")
    lim = [min(dni_ts.min(), dni_tr.min()) - 1, max(dni_ts.max(), dni_tr.max()) + 1]
    ax[1].plot(lim, lim, color=INK2, lw=0.8)
    ax[1].set_xlabel("min d(Ni), LAMMPS (Å)"); ax[1].set_ylabel("min d(Ni), this script (Å)")
    ax[1].set_title("Closest H$_2$ to Ni", loc="left")
    fig.suptitle("Cross-check: trajectory analysis vs on-the-fly LAMMPS output", x=0.01, ha="left",
                 fontweight="bold")
    fig.tight_layout(); save(fig, "fig16_validation.png")

    with open(os.path.join(outdir, "summary_production.txt"), "w") as f:
        f.write("\n".join(out) + "\n")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])

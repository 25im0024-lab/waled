#!/usr/bin/env python3
"""
Analysis of the outputs that only the v7 input writes:
  h2_msd_timeseries.dat   (extra columns: dNiFe, dHHmin, dHHmax)
  equil_density.dat       NPT density every 0.1 ps
  h2_traj.lammpstrj       H2 only, unwrapped, every 0.1 ps   -> high-resolution diffusion
  h2_residence_state.dump per-site contact/pocket, 0.1 ps   -> high-resolution residence
  h2_protein_rdf.dat      LAMMPS compute rdf (fix ave/time, mode vector)
  log.lammps              thermo output (optional)

usage: python3 analyze_v7_extras.py DATADIR OUTDIR --step0 S0
"""
import argparse
import glob
import os
import re

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import stats

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze_hydrogenase import C1, C2, C3, INK2, GRID, find   # noqa: E402  (also sets the style)

out = []


def log(s=""):
    print(s)
    out.append(s)


def opt(datadir, suffix):
    m = sorted(glob.glob(os.path.join(datadir, "*" + suffix)))
    return m[0] if m else None


def read_frames(path):
    """generic LAMMPS custom dump reader -> list of (step, 2-D array sorted by id)"""
    frames = []
    with open(path) as f:
        lines = f.read().split("\n")
    i, n = 0, len(lines)
    while i < n:
        if lines[i].startswith("ITEM: TIMESTEP"):
            step = int(lines[i + 1])
            nat = int(lines[i + 3])
            j = i + 4
            while not lines[j].startswith("ITEM: ATOMS"):
                j += 1
            arr = np.array([l.split() for l in lines[j + 1:j + 1 + nat]], dtype=float)
            arr = arr[np.argsort(arr[:, 0])]
            frames.append((step, arr))
            i = j + 1 + nat
        else:
            i += 1
    return frames


def msd_fft(r):
    """r: (nT, 3) unwrapped positions -> MSD(lag) for lag = 0..nT-1 (all origins)."""
    N = len(r)
    D = np.square(r).sum(axis=1)
    D = np.append(D, 0)
    Q = 2 * D.sum()
    S1 = np.zeros(N)
    for m in range(N):
        Q = Q - D[m - 1] - D[N - m]
        S1[m] = Q / (N - m)
    S2 = np.zeros(N)
    for k in range(3):
        x = r[:, k]
        F = np.fft.fft(x, n=2 * N)
        S2 += np.fft.ifft(F * F.conjugate())[:N].real / (N - np.arange(N))
    return S1 - 2 * S2


def episodes_of(s):
    d = np.diff(np.r_[0, s.astype(int), 0])
    st, en = np.where(d == 1)[0], np.where(d == -1)[0]
    return [(a, b) for a, b in zip(st, en)]


def main(datadir, outdir, step0):
    os.makedirs(outdir, exist_ok=True)
    figs = []

    def save(fig, name):
        fig.savefig(os.path.join(outdir, name), bbox_inches="tight")
        plt.close(fig)
        figs.append(name)

    log("=" * 72)
    log("v7-specific outputs")
    log("=" * 72)

    # ---------------- checks: H-H, Ni-Fe, density ----------------
    ts = np.loadtxt(find(datadir, "h2_msd_timeseries.dat"), comments="#")
    t = (ts[:, 0] - step0) / 1000.0
    have_cols = ts.shape[1] >= 15
    rho_f = opt(datadir, "equil_density.dat")
    if have_cols or rho_f:
        fig, ax = plt.subplots(1, 3, figsize=(13.5, 3.8))
        if have_cols:
            dnf, hmin, hmax = ts[:, 12], ts[:, 13], ts[:, 14]
            ok = (np.abs(hmin - 0.741) < 0.01).all() and (np.abs(hmax - 0.741) < 0.01).all()
            log(f"H-H distance during production: min {hmin.min():.4f}, max {hmax.max():.4f} A -> "
                + ("PASSED (0.741 +/- 0.01 A)" if ok else "FAILED"))
            log(f"Ni-Fe distance: {dnf.mean():.3f} +/- {dnf.std():.3f} A (range {dnf.min():.2f}-{dnf.max():.2f})")
            ax[0].plot(t, hmax, color=C1, lw=1.2, label="max over 29 H$_2$")
            ax[0].plot(t, hmin, color=C2, lw=1.2, ls="--", label="min over 29 H$_2$")
            ax[0].set_ylim(0.70, 0.78)
            ax[0].axhspan(0.731, 0.751, color=GRID, alpha=0.6, lw=0)
            ax[0].set_xlabel("production time (ps)"); ax[0].set_ylabel("H–H distance (Å)")
            ax[0].set_title("H$_2$ geometry (target 0.741 Å)", loc="left")
            ax[0].legend(fontsize=8)
            ax[1].plot(t, dnf, color=C1, lw=0.5, alpha=0.4)
            w = min(50, len(dnf))
            ax[1].plot(t[w - 1:], np.convolve(dnf, np.ones(w) / w, "valid"), color=C1, lw=1.6)
            ax[1].set_xlabel("production time (ps)"); ax[1].set_ylabel("Ni–Fe (Å)")
            ax[1].set_title(f"Ni–Fe distance ({dnf.mean():.2f} ± {dnf.std():.2f} Å)", loc="left")
        if rho_f:
            r = np.loadtxt(rho_f, comments="#")
            tr = r[:, 0] / 1000.0
            half = r[len(r) // 2:, 1]
            log(f"NPT density: start {r[0, 1]:.4f}, end {r[-1, 1]:.4f} g/cm3; second-half mean "
                f"{half.mean():.4f} +/- {half.std():.4f}; second-half drift "
                f"{np.polyfit(tr[len(r) // 2:], half, 1)[0] * 100:.4f} g/cm3 per 100 ps")
            ax[2].plot(tr, r[:, 1], color=C1, lw=0.8)
            ax[2].axhline(half.mean(), color=C2, lw=1, ls="--", label="second-half mean")
            ax[2].set_xlabel("time step / 1000 (ps)"); ax[2].set_ylabel("density (g/cm$^3$)")
            ax[2].set_title("NPT density (0.1 ps)", loc="left")
            ax[2].legend(fontsize=8)
        fig.tight_layout()
        save(fig, "fig17_v7_checks.png")

    # ---------------- high-resolution diffusion ----------------
    trj = opt(datadir, "h2_traj.lammpstrj")
    if trj:
        fr = read_frames(trj)
        steps = np.array([s for s, _ in fr])
        dt = (steps[1] - steps[0]) / 1000.0
        mol = fr[0][1][:, 1].astype(int)
        umol = np.unique(mol)
        X = np.array([a[:, 2:5] for _, a in fr])                 # (nF, nat, 3) unwrapped
        com = np.array([X[:, mol == m].mean(1) for m in umol]).transpose(1, 0, 2)  # (nF, nmol, 3)
        nF, nmol = com.shape[:2]
        T = (steps[-1] - steps[0]) / 1000.0
        msd = np.array([msd_fft(com[:, m]) for m in range(nmol)]).T  # (nF, nmol)
        lag = np.arange(nF) * dt
        fw = (lag >= 0.04 * T) & (lag <= 0.4 * T)
        mean = msd.mean(1)
        r = stats.linregress(lag[fw], mean[fw])
        D = r.slope / 6 * 1e-8
        Dm = np.array([stats.linregress(lag[fw], msd[fw, m]).slope / 6 * 1e-8 for m in range(nmol)])
        rng = np.random.default_rng(0)
        boot = [stats.linregress(lag[fw], msd[fw][:, rng.integers(0, nmol, nmol)].mean(1)).slope / 6 * 1e-8
                for _ in range(2000)]
        ci = np.percentile(boot, [2.5, 97.5])
        aw = (lag >= 1.0) & (lag <= 0.48 * T)
        alpha = stats.linregress(np.log(lag[aw]), np.log(mean[aw])).slope
        log(f"H2 diffusion from h2_traj ({nF} frames, {dt:.1f} ps): D = {D * 1e9:.2f} x 1e-9 m^2/s "
            f"(95 % CI {ci[0] * 1e9:.2f}-{ci[1] * 1e9:.2f}, fit {lag[fw][0]:.0f}-{lag[fw][-1]:.0f} ps), "
            f"alpha (1-{0.48 * T:.0f} ps) = {alpha:.2f}")
        log(f"per-molecule D: median {np.median(Dm) * 1e9:.2f}, range {Dm.min() * 1e9:.2f}-{Dm.max() * 1e9:.2f}")
        fig, ax = plt.subplots(1, 2, figsize=(10, 3.8), gridspec_kw=dict(width_ratios=[1.5, 1]))
        sel = lag > 0
        ax[0].loglog(lag[sel], mean[sel], color=C1, lw=2, label="mean of all H$_2$")
        ax[0].loglog(lag[sel], 6 * r.slope / 6 * lag[sel], color=C2, ls="--", lw=1.2,
                     label=f"6Dt, D = {D * 1e9:.1f}×10$^{{-9}}$ m$^2$/s")
        ax[0].axvspan(lag[fw][0], lag[fw][-1], color=GRID, alpha=0.6, lw=0)
        ax[0].set_xlim(dt, 0.5 * T)
        ax[0].set_xlabel("lag time (ps)"); ax[0].set_ylabel("MSD (Å$^2$)")
        ax[0].set_title(f"H$_2$ COM MSD, 0.1 ps resolution (α = {alpha:.2f})", loc="left")
        ax[0].legend(fontsize=8)
        ax[1].hist(Dm * 1e9, bins=12, color=C1, edgecolor="white", lw=0.5)
        ax[1].axvline(D * 1e9, color=C2, lw=1.4)
        ax[1].set_xlabel("per-molecule D (10$^{-9}$ m$^2$/s)"); ax[1].set_ylabel("molecules")
        ax[1].set_title("Spread between molecules", loc="left")
        fig.tight_layout()
        save(fig, "fig18_v7_diffusion_hires.png")

    # ---------------- high-resolution residence ----------------
    res = opt(datadir, "h2_residence_state.dump")
    if res:
        fr = read_frames(res)
        steps = np.array([s for s, _ in fr])
        dt = (steps[1] - steps[0]) / 1000.0
        mol = fr[0][1][:, 1].astype(int)
        umol = np.unique(mol)
        C = np.array([a[:, 2] for _, a in fr]) > 0
        P = np.array([a[:, 3] for _, a in fr]) > 0
        hc = np.array([C[:, mol == m].any(1) for m in umol]).T      # (nF, nmol)
        hp = np.array([P[:, mol == m].any(1) for m in umol]).T
        frac = hc.mean(0)
        trapped = frac > 0.9
        def stats_of(h, sel):
            eps = []
            for m in np.where(sel)[0]:
                eps += [(b - a) * dt for a, b in episodes_of(h[:, m])]
            return np.array(eps)
        ep_all = stats_of(hc, np.ones(len(umol), bool))
        ep_tr = stats_of(hc, ~trapped)
        maxlag = int(min(len(fr) // 4, 2000))
        lagt = np.arange(maxlag) * dt
        def cont_corr(eps_frames):
            tot = sum(eps_frames)
            return np.array([sum(max(0, L - k) for L in eps_frames) / tot for k in range(maxlag)])
        ef_all = [int(round(e / dt)) for e in ep_all]
        ef_tr = [int(round(e / dt)) for e in ep_tr] if len(ep_tr) else [1]
        Ca, Ct = cont_corr(ef_all), cont_corr(ef_tr)
        tau = dt * (0.5 + Ct[1:][np.cumprod(Ct[1:] > 0) > 0].sum())
        log(f"residence (h2_residence_state, {dt:.1f} ps): molecules in contact {hc.sum(1).mean():.2f} "
            f"+/- {hc.sum(1).std():.2f} of {len(umol)}; trapped (>90 % in contact): {trapped.sum()} "
            f"(mol {', '.join(map(str, umol[trapped])) or '-'})")
        if len(ep_tr):
            log(f"transient contact episodes: n = {len(ep_tr)}, median {np.median(ep_tr):.2f} ps, mean "
                f"{ep_tr.mean():.2f} ps, max {ep_tr.max():.1f} ps; continuous residence tau ~ {tau:.2f} ps")
        pocc = hp.any(1)
        log(f"active-site pocket (6 A of Ni/Fe) occupied in {100 * pocc.mean():.2f} % of frames by "
            f"{hp.any(0).sum()} distinct molecule(s)")
        fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
        if len(ep_tr):
            bins = np.logspace(np.log10(dt / 2), np.log10(max(ep_tr.max(), dt) * 1.5), 30)
            ax[0].hist(ep_tr, bins=bins, color=C1, edgecolor="white", lw=0.5)
            ax[0].set_xscale("log")
        ax[0].set_xlabel("contact episode length (ps)"); ax[0].set_ylabel("episodes")
        ax[0].set_title(f"Contact episodes, transient H$_2$ (n = {len(ep_tr)})", loc="left")
        ax[1].plot(lagt, Ca, color=C1, lw=1.4, label="all molecules")
        ax[1].plot(lagt, Ct, color=C2, lw=1.4, label=f"transient only, τ ≈ {tau:.1f} ps")
        ax[1].set_xlim(0, min(lagt[-1], 20 * max(tau, 1)))
        ax[1].set_xlabel("lag (ps)"); ax[1].set_ylabel("continuous residence C(t)")
        ax[1].set_title("Residence correlation (0.1 ps)", loc="left")
        ax[1].legend(fontsize=8)
        fig.tight_layout()
        save(fig, "fig19_v7_residence_hires.png")

    # ---------------- LAMMPS RDF ----------------
    rdf = opt(datadir, "h2_protein_rdf.dat")
    if rdf:
        blocks = []
        with open(rdf) as f:
            L = [l for l in f.read().split("\n") if l.strip() and not l.startswith("#")]
        i = 0
        while i < len(L):
            st, nr = map(int, L[i].split()[:2])
            blocks.append(np.array([l.split() for l in L[i + 1:i + 1 + nr]], dtype=float))
            i += 1 + nr
        B = np.array(blocks)
        r_, g_, cn_ = B[0][:, 1], B[:, :, 2].mean(0), B[:, :, 3].mean(0)
        i45 = np.searchsorted(r_, 4.5)
        log(f"LAMMPS RDF ({len(blocks)} blocks): g at 4.5 A = {g_[i45]:.3f}, at {r_[-1]:.1f} A = {g_[-1]:.3f}; "
            f"coordination within 4.5 A = {cn_[i45]:.2f}")
        fig, ax = plt.subplots(1, 2, figsize=(10, 3.6))
        ax[0].plot(r_, g_, color=C1, lw=1.6)
        ax[0].set_xlabel("r (Å)"); ax[0].set_ylabel("g(r)")
        ax[0].set_title("RDF H$_2$ → protein (LAMMPS compute rdf)", loc="left")
        ax[1].plot(r_, cn_, color=C1, lw=1.6)
        ax[1].axvline(4.5, color=INK2, ls="--", lw=0.8)
        ax[1].set_xlabel("r (Å)"); ax[1].set_ylabel("coordination number")
        ax[1].set_title("Running coordination number", loc="left")
        fig.tight_layout()
        save(fig, "fig20_v7_lammps_rdf.png")

    # ---------------- thermo from log.lammps ----------------
    lg = opt(datadir, "log.lammps")
    if lg:
        txt = open(lg).read().split("\n")
        sec = None
        for k, l in enumerate(txt):
            if l.strip().startswith("Step") and "c_cTempH2" in l:
                sec = k
        if sec is not None:
            head = txt[sec].split()
            rows = []
            for l in txt[sec + 1:]:
                if l.startswith("Loop time") or not l.strip():
                    break
                p = l.split()
                if len(p) == len(head):
                    try:
                        rows.append([float(v) for v in p])
                    except ValueError:
                        break
            A = np.array(rows)
            tt = (A[:, 0] - step0) / 1000.0
            col = {h: A[:, i] for i, h in enumerate(head)}
            E = col.get("TotEng")
            drift = np.polyfit(tt, E, 1)[0] * 1000 if E is not None else np.nan
            log(f"thermo ({len(A)} rows): T = {col['Temp'].mean():.1f} +/- {col['Temp'].std():.1f} K, "
                f"P = {col['Press'].mean():.0f} +/- {col['Press'].std():.0f} atm, "
                f"E_tot drift = {drift:.1f} kcal/mol per ns")
            fig, ax = plt.subplots(1, 3, figsize=(13.5, 3.6))
            for a, key, yl in [(ax[0], "TotEng", "E$_{tot}$ (kcal/mol)"), (ax[1], "Temp", "T (K)"),
                               (ax[2], "Press", "P (atm)")]:
                a.plot(tt, col[key], color=C1, lw=1)
                a.set_xlabel("production time (ps)"); a.set_ylabel(yl)
            ax[0].set_title("Total energy", loc="left"); ax[1].set_title("System temperature", loc="left")
            ax[2].set_title("Pressure (NVT)", loc="left")
            fig.tight_layout()
            save(fig, "fig21_v7_thermo.png")

    with open(os.path.join(outdir, "summary_v7_extras.txt"), "w") as f:
        f.write("\n".join(out) + "\n")
    return figs


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("datadir"); ap.add_argument("outdir")
    ap.add_argument("--step0", type=int, required=True)
    a = ap.parse_args()
    main(a.datadir, a.outdir, a.step0)

#!/usr/bin/env python3
"""
One command from v7 run outputs to a PDF report.

usage: python3 report_v7.py RUNDIR OUTDIR [--input h2_hydrogenase_v7.in]

RUNDIR must contain (any filename prefix is fine):
  h2_msd_timeseries.dat  equil.lammpstrj  production.lammpstrj  final_config_v7.data
and optionally: h2_traj.lammpstrj  h2_residence_state.dump  h2_protein_rdf.dat
                equil_density.dat  log.lammps
Writes all figures, summary_*.txt and OUTDIR/hydrogenase_v7_report.pdf.
If OUTDIR/interpretation_v7.json exists ({"fig01_overview.png": "text", ...}),
its text is added to the matching pages as "Interpretation".
"""
import argparse
import glob
import json
import os
import sys
import textwrap

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze_hydrogenase as A1          # noqa: E402
import analyze_production as A2           # noqa: E402
import analyze_v7_extras as A3            # noqa: E402
from make_report_pdf import FIGS as V6FIGS  # noqa: E402

import matplotlib                          # noqa: E402
matplotlib.use("Agg")
import matplotlib.pyplot as plt            # noqa: E402
from matplotlib.backends.backend_pdf import PdfPages  # noqa: E402
from PIL import Image                      # noqa: E402

INK, INK2, WARN, GOOD = "#0b0b0b", "#52514e", "#b2401a", "#0d7a50"

WHAT = {fn: secs[0][1] for fn, _, secs in V6FIGS}
TITLES = {fn: title for fn, title, _ in V6FIGS}
WHAT["fig01_overview.png"] = ("The quantities LAMMPS wrote on the fly (fix ave/time) every 0.1 ps during NVT "
                              "production. Light lines are raw values, dark lines 5 ps running means.")
WHAT["fig17_v7_checks.png"] = ("Checks of the v7 corrections: the largest and smallest H–H distance among all "
                               "29 H₂ at every 0.1 ps (target 0.741 Å, grey band ±0.01 Å), the Ni–Fe distance, "
                               "and the system density during NPT at 0.1 ps resolution.")
WHAT["fig18_v7_diffusion_hires.png"] = ("Mean-square displacement of each H₂ centre of mass from the 0.1 ps "
                                        "unwrapped H₂ trajectory, averaged over all time origins, on log–log "
                                        "axes (grey band = fit window), plus the per-molecule diffusion coefficients.")
WHAT["fig19_v7_residence_hires.png"] = ("Protein-contact episodes at 0.1 ps resolution (a molecule is in contact "
                                        "when either site is within 4.5 Å of a protein atom) and the continuous "
                                        "residence correlation function. 'Transient' excludes molecules in "
                                        "contact more than 90 % of the time.")
WHAT["fig20_v7_lammps_rdf.png"] = ("The H₂ → protein-atom RDF as computed on the fly by LAMMPS (compute rdf, "
                                   "averaged over all output blocks), and the running coordination number.")
WHAT["fig21_v7_thermo.png"] = ("Thermodynamic output from log.lammps during production: total energy, system "
                               "temperature and pressure.")
TITLES.update({
    "fig17_v7_checks.png": "v7 checks: H₂ geometry, Ni–Fe distance, NPT density",
    "fig18_v7_diffusion_hires.png": "H₂ diffusion at 0.1 ps resolution",
    "fig19_v7_residence_hires.png": "H₂ residence at the protein at 0.1 ps resolution",
    "fig20_v7_lammps_rdf.png": "RDF from LAMMPS (compute rdf)",
    "fig21_v7_thermo.png": "Production thermodynamics",
})
KEYS = {
    "fig01_overview.png": ["<T_H2>", "<N_contact>", "min dist to Ni", "Rg:", "RMSD proxy"],
    "fig02_msd_diffusion.png": ["D_x", "D_y", "D_z", "D_total", "fit-window", "log-log"],
    "fig03_h2_temperature.png": ["<T_H2>", "tau_int ="],
    "fig04_contacts.png": ["<N_contact>", "integrated autocorrelation time of N_contact", "N_pocket > 0"],
    "fig05_active_site.png": ["min dist to Ni", "min dist to Fe", "N_pocket > 0", "quarter means"],
    "fig06_protein_stability.png": ["Rg:", "RMSD proxy", "Kabsch superposition", "COM translation"],
    "fig07_equilibration.png": ["  step"],
    "fig08_final_config.png": ["H2 classification", "H-H bond length", "  -> ", "water density vs distance"],
    "fig09_snapshot.png": ["protein+cofactor extent", "box "],
    "fig10_protein_full_run.png": ["RMSD: last", "active-site region", "Ni-Fe distance:", "closest protein-image"],
    "fig11_rmsf.png": ["RMSF over production"],
    "fig12_msd_multiorigin.png": ["D = ", "per-molecule D:", "molecules in contact < 20"],
    "fig13_h2_per_molecule.png": ["molecules that touched", "most protein-associated", "closest H2 COM to Ni"],
    "fig14_residence.png": ["contact episodes:", "residence correlation", "transient molecules only"],
    "fig15_rdf.png": ["g(r) at r", "coordination number within"],
    "fig16_validation.png": ["N_contact: exact match"],
    "fig17_v7_checks.png": ["H-H distance during production", "Ni-Fe distance:", "NPT density"],
    "fig18_v7_diffusion_hires.png": ["H2 diffusion from h2_traj", "per-molecule D: median"],
    "fig19_v7_residence_hires.png": ["residence (h2_residence_state", "transient contact episodes", "active-site pocket"],
    "fig20_v7_lammps_rdf.png": ["LAMMPS RDF"],
    "fig21_v7_thermo.png": ["thermo ("],
}

W, H, ML = 8.27, 11.69, 0.6


def key_lines(summary_lines, keys, fn):
    picked = []
    for k in keys:
        for l in summary_lines:
            if k in l and l.strip() not in picked:
                picked.append(l.strip())
                if k != "  step":
                    break
    if fn == "fig12_msd_multiorigin.png":
        picked = [p for p in picked if "H2 diffusion from h2_traj" not in p]
    return picked


def page_text(fig, y, head, body, color=INK, wrap=104, size=9.2, family="DejaVu Sans"):
    fig.text(ML / W, y, head, fontsize=10.5, weight="bold", color=color, va="top")
    y -= 0.022
    lines = []
    for para in (body if isinstance(body, list) else [body]):
        lines += textwrap.wrap(para, wrap, subsequent_indent="  " if isinstance(body, list) else "") or [""]
    fig.text(ML / W, y, "\n".join(lines), fontsize=size, color=color, va="top", linespacing=1.45,
             family=family, parse_math=False)
    return y - 0.0158 * len(lines) - 0.014


def main(rundir, outdir, inp=None):
    os.makedirs(outdir, exist_ok=True)
    ts = np.loadtxt(A1.find(rundir, "h2_msd_timeseries.dat"), comments="#")
    step0 = int(ts[0, 0] - (ts[1, 0] - ts[0, 0]))
    final = "final_config_v7.data" if glob.glob(os.path.join(rundir, "*final_config_v7.data")) else "final_config.data"
    A1.main(rundir, outdir, final=final, step0=step0)
    A2.main(rundir, A1.find(rundir, "production.lammpstrj"), outdir, final=final, step0=step0, t_dof=145)
    A3.main(rundir, outdir, step0)

    summ = []
    for f in ("summary.txt", "summary_production.txt", "summary_v7_extras.txt"):
        p = os.path.join(outdir, f)
        if os.path.exists(p):
            summ += open(p).read().split("\n")
    interp = {}
    jp = os.path.join(outdir, "interpretation_v7.json")
    if os.path.exists(jp):
        interp = json.load(open(jp))

    figs = sorted(f for f in os.listdir(outdir) if f.startswith("fig") and f.endswith(".png"))
    final_block, inblock = [], False
    for l in summ:
        if l.startswith("FINAL RESULTS"):
            inblock = True
            continue
        if inblock:
            if l.startswith("  "):
                final_block.append(l[2:])
            elif final_block:
                break
    checks = []
    for l in summ:
        if ("PASSED" in l or "FAILED" in l or "total system charge" in l or "closest protein-image" in l
                or "WARNING" in l) and l.strip() not in checks:
            checks.append(l.strip())

    pdf_path = os.path.join(outdir, "hydrogenase_v7_report.pdf")
    plt.rcParams["font.family"] = "DejaVu Sans"
    with PdfPages(pdf_path) as pdf:
        fig = plt.figure(figsize=(W, H))
        fig.text(ML / W, 0.94, "[NiFe]-hydrogenase + H₂: v7 run", fontsize=20, weight="bold")
        fig.text(ML / W, 0.915, f"LAMMPS analysis report: {len(figs)} figures; run folder: {os.path.basename(os.path.abspath(rundir))}",
                 fontsize=10, color=INK2)
        y = 0.88
        y = page_text(fig, y, "Correction checks", checks or ["(none found)"], wrap=100)
        y = page_text(fig, y - 0.01, "Final results (mean +/- block SEM)", final_block or ["(see summaries)"],
                      wrap=100, size=8.4, family="DejaVu Sans Mono")
        fig.text(ML / W, y - 0.01, "Contents", fontsize=10.5, weight="bold", va="top")
        y -= 0.035
        for i, fn in enumerate(figs, 1):
            fig.text(ML / W, y, f"Fig. {i:2d}   {TITLES.get(fn, fn)}", fontsize=8.8, color=INK2, va="top")
            y -= 0.0165
        pdf.savefig(fig)
        plt.close(fig)

        for i, fn in enumerate(figs, 1):
            im = Image.open(os.path.join(outdir, fn)).convert("RGB")
            iw, ih = im.size
            fig = plt.figure(figsize=(W, H))
            fig.text(ML / W, 0.965, f"Fig. {i}. {TITLES.get(fn, fn)}", fontsize=14, weight="bold", va="top")
            w = W - 2 * ML
            h = w * ih / iw
            if h > 5.0:
                h = 5.0
                w = h * iw / ih
            top = 0.935
            ax = fig.add_axes([(W - w) / 2 / W, top - h / H, w / W, h / H])
            ax.imshow(im)
            ax.axis("off")
            y = top - h / H - 0.025
            y = page_text(fig, y, "What it shows", WHAT.get(fn, ""))
            kl = key_lines(summ, KEYS.get(fn, []), fn)
            if kl:
                y = page_text(fig, y, "Key numbers (from the summaries)", kl, size=8.6)
            if fn in interp:
                y = page_text(fig, y, "Interpretation", interp[fn])
            fig.text(1 - ML / W, 0.02, f"{i + 1}", fontsize=8, color=INK2, ha="right")
            pdf.savefig(fig, dpi=220)
            plt.close(fig)

        # appendix: full summaries and the input file
        blocks = [("Appendix A: full numerical summaries", summ)]
        if inp and os.path.exists(inp):
            blocks.append((f"Appendix B: input file ({os.path.basename(inp)})", open(inp).read().split("\n")))
        for title, lines in blocks:
            wrapped = []
            for l in lines:
                wrapped += textwrap.wrap(l, 110, subsequent_indent="    ") or [""]
            per = 78
            for k in range(0, len(wrapped), per):
                fig = plt.figure(figsize=(W, H))
                fig.text(ML / W, 0.965, title + ("" if k == 0 else " (cont.)"), fontsize=12, weight="bold", va="top")
                fig.text(ML / W, 0.935, "\n".join(wrapped[k:k + per]), fontsize=6.6, family="DejaVu Sans Mono",
                         va="top", linespacing=1.3, parse_math=False)
                pdf.savefig(fig)
                plt.close(fig)
    print("report:", pdf_path)
    return pdf_path


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("rundir"); ap.add_argument("outdir")
    ap.add_argument("--input", default=os.path.join(HERE, "next_run", "h2_hydrogenase_v7.in"))
    a = ap.parse_args()
    main(a.rundir, a.outdir, a.input)

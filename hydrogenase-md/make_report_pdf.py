#!/usr/bin/env python3
"""Build results/hydrogenase_v6_report.pdf: one A4 page per figure with an
English explanation (what it shows / result / interpretation / caveats)."""
import os
import textwrap

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, "results")
OUT = os.path.join(RES, "hydrogenase_v6_report.pdf")
plt.rcParams["font.family"] = "DejaVu Sans"
INK, INK2, WARN = "#0b0b0b", "#52514e", "#b2401a"

FIGS = [
("fig01_overview.png", "Production overview",
 [("What it shows", "The six quantities LAMMPS wrote on the fly (fix ave/time) every 0.1 ps during the 250 ps NVT production. Light lines are raw values, dark lines 5 ps running means."),
  ("Result", "T(H₂) fluctuates by about ±36 K around a mean of 305.5 K. On average 7.1 of the 58 H₂ sites are within 4.5 Å of the protein (range 2–20). The closest H₂ site to Ni falls from ~28 Å to ~8 Å within the first 50 ps, then fluctuates between ~6 and 25 Å. The MSD rises almost linearly to ~1000 Å². Rg stays between 24.81 and 25.05 Å. The RMSD proxy climbs to ~2.9 Å at ~110 ps and settles at ~2.4 Å."),
  ("Interpretation", "No quantity shows a runaway trend: the protein is stable and the H₂ thermostat works. The +5.5 K offset in T(H₂) is a degrees-of-freedom counting artefact (Fig. 3), not heating. The contact burst at ~110 ps and the closest approach to Ni at ~100 ps are single events, so 250 ps does not sample H₂ binding statistically."),
  ("Caveats", "All H₂ quantities refer to a ~3 Å rigid dumbbell, not H₂ (Fig. 8). The RMSD proxy uses no structural fit and overestimates the true RMSD (Fig. 6).")]),
("fig02_msd_diffusion.png", "H₂ mean-square displacement (single time origin)",
 [("What it shows", "MSD of the 58 H₂ sites from LAMMPS 'compute msd', measured from one time origin (the start of production). Left: per Cartesian axis. Right: total MSD on log–log axes; the grey band (20–150 ps) is the fit window."),
  ("Result", "D_x = 6.5, D_y = 4.0, D_z = 5.2 and D_total = 5.2 × 10⁻⁹ m²/s. The log–log slope is α = 0.83. Depending on the fit window, D varies between 5.2 and 7.6 × 10⁻⁹ m²/s."),
  ("Interpretation", "Neither the anisotropy nor the sub-diffusive slope is physical. With one time origin and only 29 molecules, a few fast or trapped molecules dominate the curve, which also explains the plateaus (for example in x after 160 ps). The multi-origin analysis in Fig. 12 supersedes this estimate (D = 8.0 × 10⁻⁹ m²/s, α = 0.96)."),
  ("Caveats", "The ballistic regime below ~0.5 ps is not resolved at 0.1 ps sampling; the dotted t² line is only a guide.")]),
("fig03_h2_temperature.png", "H₂ temperature: is the ensemble canonical?",
 [("What it shows", "Histogram of the instantaneous H₂ temperature compared with the canonical (Gamma) distribution for 145 degrees of freedom at 300 K (29 rigid linear molecules × 5), plus the autocorrelation of T(H₂)."),
  ("Result", "Mean 305.5 K, SD 35.6 K. The autocorrelation decays within ~0.2 ps (τ_int = 0.07 ps)."),
  ("Interpretation", "The shape and width are those of a canonical ensemble, so the rigid-body Nosé–Hoover thermostat samples correctly. The histogram sits ~2 % to the right of the curve because LAMMPS 'compute temp' subtracts 3 extra degrees of freedom by default, dividing the kinetic energy by 142 instead of 145. The observed SD (35.6 K) is exactly the 142-DOF prediction. After rescaling, T(H₂) = 299.2 ± 0.2 K. The v7 input fixes this with 'compute_modify extra/dof 0'."),
  ("Caveats", "None for thermostatting. The short negative dip near 0.2 ps is the fast response of the thermostat and molecular rotation.")]),
("fig04_contacts.png", "H₂–protein contacts",
 [("What it shows", "Number of H₂ sites (of 58) within 4.5 Å of any protein atom: time series, distribution, and autocorrelation."),
  ("Result", "Mean 7.1 sites (12 %), mode 6–7, range 2–20, with a burst to 17–20 at ~110 ps. The integrated memory time is ~10 ps, and the autocorrelation first crosses zero at ~25 ps."),
  ("Interpretation", "H₂ interacts with the protein surface weakly and transiently. About one molecule in seven touches the protein at any moment, and the contact population renews on a 10–25 ps scale, consistent with the per-molecule residence times in Fig. 14. The negative and positive lobes beyond 30 ps are finite-length noise (only ~10 independent windows in 250 ps), not a real oscillation."),
  ("Caveats", "This counts sites, not molecules, and the 4.5 Å cutoff includes protein hydrogens. With the dumbbell geometry the sites sit ~1.5 Å from the molecular centre instead of 0.37 Å, so contact counts may differ from those of real H₂.")]),
("fig05_active_site.png", "Approach of H₂ to the Ni–Fe active site",
 [("What it shows", "Distance from Ni (blue) and from the active-site Fe (orange) to the nearest H₂ site; 5 ps running means, with the dashed line showing the running minimum. The green line is the 6 Å pocket radius used for N_pocket. Right: histograms."),
  ("Result", "The mean closest distance is 17.6 Å to Ni and 19.6 Å to Fe. It is below 10 Å in 6.1 % (Ni) and 1.8 % (Fe) of samples. The closest approach is 5.65 Å, at 100.5 ps. The pocket was occupied in only 1 of 2500 samples."),
  ("Interpretation", "No H₂ reached the Ni–Fe site. The deep minima near 50, 100, 150 and 220 ps most likely come from the one molecule that was already inside the protein (mol 17, Fig. 13), which approaches the active-site cavity but does not enter it. The Fe curve runs ~2 Å above the Ni curve, which suggests the approach is from the Ni side (inference)."),
  ("Caveats", "A 3 Å dumbbell is bulkier than H₂ and may be excluded from narrow gas channels, so access to the active site is probably underestimated. 250 ps is far too short for entry statistics, which need nanoseconds or longer.")]),
("fig06_protein_stability.png", "Protein stability: Rg and RMSD",
 [("What it shows", "Left: protein radius of gyration. Right: the 'RMSD proxy' computed in the input (no superposition), with the heavy-atom RMSD after optimal (Kabsch) superposition at the final frame (orange dot)."),
  ("Result", "Rg = 24.93 ± 0.04 Å; it rises by ~0.1 Å over the first 50 ps and then stays flat. The RMSD proxy levels off at ~2.4 Å, while the superposed RMSD is 1.20 Å."),
  ("Interpretation", "The protein is compact and stable, and the 0.4 % change in Rg is normal thermal breathing. About half of the proxy value is rigid-body motion: the protein's centre of mass moved 0.93 Å and the molecule also rotated. Report the Kabsch RMSD (Fig. 10), not the proxy."),
  ("Caveats", "The RMSD covers all heavy atoms. The data file has no residue or atom names, so no backbone-only value can be computed; a backbone RMSD would be lower.")]),
("fig07_equilibration.png", "NPT equilibration (equil.lammpstrj)",
 [("What it shows", "The 25 ps NPT stage, in 10 frames: system density, protein Rg, heavy-atom RMSD relative to the first frame, and the distance of every H₂ site to Ni (boxes; orange = closest site)."),
  ("Result", "Density rises from 1.003 to 1.038 g/cm³ and is flat over the last three frames. The box volume shrinks by 3.4 %. Rg contracts slightly (24.87 → ~24.80 Å) and the RMSD reaches 0.97 Å. The median H₂–Ni distance falls from ~46 to ~42 Å."),
  ("Interpretation", "The box compressed as water filled the voids left by the builder, which is normal. A density of ~1.04 g/cm³ is plausible for such a protein-rich box (inference). The density plateau spans only three frames (5 ps), so equilibration is marginal; ≥100 ps of NPT is advisable. During this stage one H₂ (mol 17) moved from ~50 Å to ~28 Å from Ni, entering the protein."),
  ("Caveats", "Only 10 frames. The jump in the closest H₂ distance at 25 ps reflects one molecule leaving the vicinity of Ni.")]),
("fig08_final_config.png", "Final frame and the H₂ geometry check",
 [("What it shows", "Final frame. Left: each H₂ classified as buried (no water O within 3.5 Å and >40 protein atoms within 8 Å), at the surface (<4.5 Å from the protein) or in water. Middle: water density versus distance from the nearest protein atom. Right: H–H separation of all 29 molecules."),
  ("Result", "2 buried, 1 at the surface, 26 in water; the buried mol 17 sits 17 Å from Ni. Hydration water has a first-shell peak of 1.12 g/cm³ at 2–3 Å and ~0.9–1.0 g/cm³ beyond that. H–H separations are 2.08–3.32 Å (mean 3.04 Å) instead of 0.741 Å."),
  ("Interpretation", "The right panel is the key finding of the whole analysis. The maximum separation, 3.32 Å, equals the LJ minimum 2^(1/6)·σ for σ = 2.96 Å. With no bond and no intramolecular exclusion, the two sites repelled each other during energy minimization, before fix rigid/small existed, and the rigid fix then froze that geometry for the entire run. Every H₂ result in this run therefore describes a 3 Å dumbbell, not H₂. The structure of water next to the protein is normal."),
  ("Caveats", "Shell densities slightly below 1.0 partly reflect the Monte-Carlo estimate of shell volume, which includes small internal cavities.")]),
("fig09_snapshot.png", "Final frame, three projections",
 [("What it shows", "The final frame projected on three planes: protein heavy atoms (grey), H₂ sites coloured by class, and Ni and Fe (stars)."),
  ("Result", "The protein (extent ~67 × 72 × 75 Å) fills most of the 77 × 79 × 80 Å box. H₂ sits in thin water layers and near the box faces, while the Ni–Fe centre is deep in the protein interior."),
  ("Interpretation", "This is the visual evidence for the thin water shell: there is no bulk water region, and any H₂ near a box face is also close to the periodic image of the protein. Because the active site is buried, H₂ must cross the protein interior to reach it; in [NiFe] hydrogenases this happens through internal hydrophobic gas channels (Montet et al., Nat. Struct. Biol. 1997)."),
  ("Caveats", "Two-dimensional projections overlap, so judge buried and surface classes from Figs. 8 and 13.")]),
("fig10_protein_full_run.png", "Protein over NPT + production (60 frames)",
 [("What it shows", "Heavy-atom RMSD after Kabsch superposition on the production-start structure: whole protein (blue) and the active-site region with a local fit (orange; the 373 heavy atoms within 12 Å of Ni). Also shown: Rg, and the minimum distance between the protein and its own periodic image. NPT is shaded."),
  ("Result", "The RMSD reaches ~1.0 Å by 50 ps and drifts slowly to 1.2–1.3 Å (last 100 ps: 1.18 ± 0.07 Å). The active-site RMSD is 0.7–0.9 Å. Rg = 24.93 Å. The protein–image distance is 8–12 Å, with a minimum of 8.0 Å, and is below the 12 Å cutoff in 49 of 50 frames."),
  ("Interpretation", "The fold is preserved, and the active site is more rigid than the protein average. The slow RMSD drift means the structure has not fully plateaued after 250 ps. The image distance is a real artefact: protein atoms interact directly with their own periodic copy through LJ and real-space Coulomb forces. This can bias surface dynamics and H₂ access paths near the box faces."),
  ("Caveats", "Fix it by rebuilding with ≥12–15 Å of water on every side. The v7 input warns about this, but an input file cannot add water.")]),
("fig11_rmsf.png", "Per-atom flexibility (RMSF)",
 [("What it shows", "Root-mean-square fluctuation of each protein heavy atom during production, after superposition on the average structure. Right: RMSF against distance from Ni (grey points; blue = 4 Å bin means)."),
  ("Result", "Mean 0.62 Å, median 0.55 Å, 95th percentile 1.16 Å, with a few atoms reaching ~3 Å. RMSF stays at ~0.4–0.5 Å within 20 Å of Ni and rises steadily to ~1.3 Å at 40 Å."),
  ("Interpretation", "This is the classic pattern of a rigid core and a mobile surface: the Ni–Fe site and its surroundings are the most rigid part of the protein. The spikes in the left panel are flexible surface segments; a residue mapping is needed to name them."),
  ("Caveats", "50 frames over 250 ps capture only fast fluctuations, and RMSF grows with simulation length. The generic bonded constants at the metal centre could make that region artificially stiff (speculation).")]),
("fig12_msd_multiorigin.png", "H₂ diffusion from all time origins (final value)",
 [("What it shows", "MSD of each H₂ centre of mass computed over all time origins of the production trajectory (thin lines), the ensemble mean (thick line) with a linear fit over 10–100 ps, and the distribution of per-molecule D."),
  ("Result", "D = 8.0 × 10⁻⁹ m²/s (95 % bootstrap CI 6.3–10.0) and α = 0.96, i.e. normal diffusion. Per-molecule D ranges from 0.2 to 28 × 10⁻⁹ m²/s, median 8.2. Molecules that were rarely in contact with the protein give 7.6 and protein-associated molecules 8.7 × 10⁻⁹ m²/s, a difference that is not significant with this sample."),
  ("Interpretation", "This value replaces the single-origin estimate in Fig. 2. Experimentally, H₂ in water at 25 °C diffuses at ~4.8 × 10⁻⁹ m²/s (Ferrell & Himmelblau, J. Chem. Eng. Data 1967). A higher simulated value is expected because TIP3P water itself diffuses ~2–2.5 times too fast (Mark & Nilsson, J. Phys. Chem. A 2001). Even so, no quantitative comparison is meaningful here, because the simulated particle is a 3 Å dumbbell."),
  ("Caveats", "Frames are 5 ps apart. The slowest molecule (D ≈ 0.2) is most likely the trapped mol 17.")]),
("fig13_h2_per_molecule.png", "Every H₂ molecule over time",
 [("What it shows", "Left: centre-of-mass distance of every H₂ to Ni in each 5 ps frame (darker = closer), with molecules sorted by mean distance. Right: the state of each molecule in each frame — in water, in contact with the protein (≤4.5 Å), or buried."),
  ("Result", "Mol 17 is buried in every production frame, 9–20 Å from Ni (closest 8.7 Å); it entered the protein during NPT. Of the other 28 molecules, 21 touched the protein at least once, mostly in short episodes, and 3 were briefly classified as buried (single frames)."),
  ("Interpretation", "One spontaneous uptake into the protein interior happened before production, and the molecule then stayed inside for the full 250 ps. This suggests that the protein interior is a favourable environment for this H₂ model, in line with the known gas cavities (inference). Surface contacts of the other molecules are short and frequent."),
  ("Caveats", "A single event is anecdotal; it needs replica runs and longer sampling.")]),
("fig14_residence.png", "Residence time of H₂ at the protein surface",
 [("What it shows", "Left: lengths of uninterrupted contact episodes (molecule level, 5 ps sampling). Right: continuous residence correlation function C(t) for all molecules (blue) and excluding the trapped molecule (orange)."),
  ("Result", "67 episodes, median 10 ps; 48 % last only one frame (≤5 ps). One episode lasts 250 ps (mol 17). Without mol 17: τ ≈ 12 ps, mean 12.5 ps, longest 65 ps. The all-molecule curve levels off at ~0.2 because of mol 17."),
  ("Interpretation", "H₂ residence at the protein surface is ~10 ps or less, i.e. weak, non-specific adsorption, as expected for a small apolar gas with a small LJ well depth (inference). The true value is probably shorter, because contacts shorter than the 5 ps frame spacing are invisible. The 0.1 ps outputs of the v7 input (h2_residence_state.dump, h2_traj.lammpstrj) will resolve this."),
  ("Caveats", "Dumbbell geometry; one trapped molecule dominates any average that includes it.")]),
("fig15_rdf.png", "Radial distribution function H₂ → protein",
 [("What it shows", "g(r) between H₂ sites and protein atoms (types 1–14), averaged over 50 frames with the normalisation of LAMMPS 'compute rdf', and the running coordination number."),
  ("Result", "g(r) is zero below 2 Å and rises sharply at 2.2–2.6 Å, with only a weak shoulder near 3.8 Å. It then increases steadily to 0.45 at 12 Å. On average an H₂ site has 1.4 protein atoms within 4.5 Å and 63 within 12 Å."),
  ("Interpretation", "There is no distinct first adsorption shell, so on average there is no preferred binding distance or binding site on the protein surface. This again points to weak, non-specific contacts. The steady rise reflects the geometry of a large protein: the reference density is the box average, so g(r) does not approach 1 within 12 Å. The onset at ~2.2 Å comes from contacts with protein hydrogens."),
  ("Caveats", "This is an average over all protein atoms. Site-specific RDFs, for example for hydrophobic or channel-lining residues, would be more informative.")]),
("fig16_validation.png", "Validation of the analysis pipeline",
 [("What it shows", "N_contact and the closest H₂–Ni distance computed by the post-processing script from the production trajectory, plotted against the values LAMMPS wrote on the fly at the same 50 time steps."),
  ("Result", "Exact agreement for both quantities in all 50 frames (maximum difference 0.000 Å)."),
  ("Interpretation", "The analysis (atom selection, periodic minimum image, cutoffs) reproduces LAMMPS exactly. The derived quantities in Figs. 10–15 (per-molecule states, residence, multi-origin MSD, RDF) therefore rest on a verified basis."),
  ("Caveats", "This validates the analysis, not the physics of the model.")]),
]

SUMMARY = [
    ("T(H₂), corrected to 145 DOF", "299.2 ± 0.2 K (LAMMPS reported 305.5 K)"),
    ("H₂ molecules in contact with protein", "4.3 ± 0.5 of 29 (14.8 %)"),
    ("Closest H₂ site to Ni / Fe", "17.6 ± 0.8 / 19.6 ± 0.8 Å"),
    ("Active-site pocket occupancy (<6 Å)", "1 / 2500 samples"),
    ("D(H₂), all time origins", "8.0 × 10⁻⁹ m²/s (95 % CI 6.3–10.0)"),
    ("Surface residence time (transient H₂)", "τ ≈ 12 ps, median episode 10 ps"),
    ("H₂ trapped inside protein", "1 molecule, whole run (closest 8.7 Å to Ni)"),
    ("Protein Rg", "24.93 ± 0.01 Å"),
    ("Heavy-atom RMSD (Kabsch), last 100 ps", "1.18 ± 0.04 Å; active site 0.79 Å"),
    ("Mean RMSF (all / <12 Å of Ni)", "0.62 / 0.47 Å"),
    ("Ni–Fe distance", "2.59 ± 0.05 Å"),
    ("Protein–image minimum distance", "8.0 Å (below the 12 Å cutoff)"),
]

W, H = 8.27, 11.69
ML = 0.6
WRAP = 104


def text_block(fig, y, sections):
    for head, body in sections:
        fig.text(ML / W, y, head, fontsize=10.5, weight="bold", color=INK, va="top")
        y -= 0.022
        lines = textwrap.wrap(body, WRAP)
        fig.text(ML / W, y, "\n".join(lines), fontsize=9.2, color=INK, va="top", linespacing=1.45)
        y -= 0.0158 * len(lines) + 0.014
    return y


def main():
    with PdfPages(OUT) as pdf:
        # cover / summary
        fig = plt.figure(figsize=(W, H))
        fig.text(ML / W, 0.94, "[NiFe]-hydrogenase + H₂: v6-small pilot run", fontsize=19, weight="bold")
        fig.text(ML / W, 0.915, "LAMMPS analysis report: 16 figures, each with an explanation", fontsize=11.5, color=INK2)
        warn = ("Read first: in this run each H₂ is a rigid dumbbell with its two sites 2.1–3.3 Å apart "
                "instead of 0.741 Å (Fig. 8). All H₂ results (diffusion, contacts, active-site access, "
                "residence, RDF) describe that dumbbell, so they test the analysis pipeline, not H₂ physics. "
                "Protein, water and thermostat results are valid. Two further problems: a net charge of −7 e "
                "(all cofactor charges are zero) and a water shell so thin that the protein comes within 8 Å "
                "of its own periodic image. A corrected input (v7) fixes the H₂ geometry, charge, mixing "
                "rule and temperature bookkeeping.")
        fig.text(ML / W, 0.885, "\n".join(textwrap.wrap(warn, 98)), fontsize=9.6, color=WARN, va="top",
                 linespacing=1.45)
        y = 0.73
        fig.text(ML / W, y, "Final results (250 ps production; ± = block SEM, 5 × 50 ps)", fontsize=12, weight="bold")
        y -= 0.03
        for k, v in SUMMARY:
            fig.text(ML / W, y, k, fontsize=9.5, color=INK)
            fig.text(0.52, y, v, fontsize=9.5, color=INK)
            y -= 0.021
        y -= 0.02
        fig.text(ML / W, y, "Contents", fontsize=12, weight="bold")
        y -= 0.028
        for i, (_, title, _) in enumerate(FIGS, 1):
            fig.text(ML / W, y, f"Fig. {i:2d}   {title}", fontsize=9.3, color=INK2)
            y -= 0.0185
        pdf.savefig(fig)
        plt.close(fig)

        for i, (fn, title, sections) in enumerate(FIGS, 1):
            im = Image.open(os.path.join(RES, fn)).convert("RGB")
            iw, ih = im.size
            fig = plt.figure(figsize=(W, H))
            fig.text(ML / W, 0.965, f"Fig. {i}. {title}", fontsize=14, weight="bold", va="top")
            maxw, maxh = W - 2 * ML, 5.2
            w = maxw
            h = w * ih / iw
            if h > maxh:
                h = maxh
                w = h * iw / ih
            top = 0.935
            ax = fig.add_axes([(W - w) / 2 / W, top - h / H, w / W, h / H])
            ax.imshow(im)
            ax.axis("off")
            text_block(fig, top - h / H - 0.025, sections)
            fig.text(1 - ML / W, 0.02, f"{i + 1}", fontsize=8, color=INK2, ha="right")
            pdf.savefig(fig, dpi=220)
            plt.close(fig)
    print(OUT, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()

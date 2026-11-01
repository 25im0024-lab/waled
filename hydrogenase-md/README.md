# [NiFe]-hydrogenase + H2: analysis of the v6-small LAMMPS pilot run

Post-processing of `h2_hydrogenase_v6_small.in`: PDB 1H2R, 29 two-site rigid H2 molecules, TIP3P water shell, 47,849 atoms, 250 ps NVT production.

```bash
python3 analyze_hydrogenase.py <dir with the run outputs> results
```

```bash
python3 analyze_production.py <dir with the run outputs> <production.lammpstrj> results
```

The second script adds the production trajectory (50 frames, every 5 ps), writes `results/fig10…fig16*.png` and `results/summary_production.txt`, and supersedes the single-origin diffusion estimate below.

**Report:** `results/hydrogenase_v6_report.pdf` has all 16 figures, one per page, each with an explanation (built by `make_report_pdf.py`). **Next run:** `next_run/` contains the corrected v7 input and the H2 geometry repair tool.

## Final results (250 ps production, all files combined)

Uncertainties are block SEM over 5 blocks of 50 ps unless noted.

| Parameter | Value |
|---|---|
| T(H2), as reported by LAMMPS (142 DOF) | 305.5 ± 0.2 K |
| T(H2), corrected to 145 DOF | 299.2 ± 0.2 K |
| H2 sites in contact with protein (of 58) | 7.1 ± 0.7 |
| H2 molecules in contact (of 29) | 4.3 ± 0.5 (14.8 %) |
| Closest H2 site to Ni / Fe | 17.6 ± 0.8 / 19.6 ± 0.8 Å |
| Pocket occupancy (< 6 Å of Ni or Fe) | 1/2500 samples; 0/50 frames |
| D(H2), centre of mass, all time origins | 8.0 × 10⁻⁹ m²/s (95 % CI 6.3–10.0); α = 0.96 |
| Contact residence, transient molecules | τ_C ≈ 12 ps; median episode 10 ps (5 ps sampling) |
| H2 trapped inside the protein for the whole run | 1 (mol 17, entered during NPT, closest 8.7 Å to Ni) |
| Protein Rg | 24.93 ± 0.01 Å |
| Protein heavy-atom RMSD, Kabsch fit, last 100 ps | 1.18 ± 0.04 Å |
| Active-site RMSD (< 12 Å of Ni, local fit) | 0.79 Å |
| Mean RMSF of heavy atoms (all / < 12 Å of Ni) | 0.62 / 0.47 Å |
| Ni–Fe distance | 2.59 ± 0.05 Å (SD) |
| Protein–image minimum distance | 8.0 Å; below the 12 Å cutoff in 49/50 frames |
| RDF H2 → protein (types 1–14) | no distinct contact peak; g rises from 0.12 at 3 Å to 0.45 at 12 Å |

The trajectory analysis reproduces LAMMPS's on-the-fly N_contact and min-distance-to-Ni exactly in all 50 frames (fig16).

**Every H2 number above is for a ~3 Å rigid dumbbell, not H2** (see key finding 1). Treat them as a test of the analysis pipeline, not as results.

Inputs, matched by file-name suffix: `h2_msd_timeseries.dat`, `equil.lammpstrj` and `final_config.data`.
Outputs: `results/fig01…fig09*.png` and `results/summary.txt`, which holds every number quoted below.

## Figures

| File | Content |
|---|---|
| fig01_overview | All production time series: T(H2), contacts, closest H2 to Ni, MSD, Rg, RMSD proxy |
| fig02_msd_diffusion | Per-axis MSD, log–log MSD, D fits |
| fig03_h2_temperature | T(H2) histogram vs the canonical Γ distribution (145 DOF), autocorrelation |
| fig04_contacts | H2–protein contact count, its distribution and memory time |
| fig05_active_site | Closest H2 to Ni and Fe vs time, distributions, 6 Å pocket line |
| fig06_protein_stability | Rg; RMSD proxy vs a proper Kabsch heavy-atom RMSD |
| fig07_equilibration | NPT density, Rg, Kabsch RMSD, H2–Ni distances (equil.lammpstrj) |
| fig08_final_config | Position of each H2 in the final frame, hydration-shell water density, **H–H geometry check** |
| fig09_snapshot | Final frame projected onto three planes |
| fig10_protein_full_run | Kabsch RMSD (whole protein and active site), Rg, protein–image distance over NPT + production |
| fig11_rmsf | Per-atom RMSF, and RMSF vs distance from Ni |
| fig12_msd_multiorigin | All-origin COM MSD per molecule and ensemble; per-molecule D |
| fig13_h2_per_molecule | Heatmap of each H2's distance to Ni; water / contact / buried state map |
| fig14_residence | Contact episode lengths; residence correlation functions |
| fig15_rdf | H2 → protein g(r) and running coordination number |
| fig16_validation | Trajectory analysis vs LAMMPS on-the-fly values |

## Key findings

1. **Critical: the "H2" is not H2.** In every frame the two sites of each molecule sit 2.08–3.32 Å apart (mean 3.04 Å), not 0.741 Å, and the distance never changes. The largest value equals the LJ minimum 2^(1/6)·σ = 3.32 Å.
   - Likely cause (inferred, high confidence): the two H sites have no bond and no intramolecular exclusion, so during `minimize` they repelled each other. `fix rigid/small` was defined only afterwards and froze that geometry.
   - Consequence: every H2-dependent result in this run (diffusion, contacts, access to the pocket, RDF, residence) describes a ~3 Å dumbbell.
2. **Net charge −7 e.** All 33 cofactor atoms (Fe–S clusters, Ni–Fe site) have q = 0. PPPM therefore runs with a neutralising background.
3. **Periodic self-contact.** The protein comes within 10.7 Å of its own periodic image, which is less than the 12 Å cutoff.
4. Points that check out:
   - H2 thermostat: SD of T(H2) is 35.6 K against 35.2 K expected for 145 DOF.
   - Water temperature: 301.9 K.
   - Density: plateaus at 1.038 g/cm³.
   - Protein: Rg = 24.93 ± 0.04 Å; Kabsch heavy-atom RMSD from end of NPT to the final frame is 1.20 Å. The 2.38 Å "RMSD proxy" also includes 0.93 Å of centre-of-mass translation plus rotation.
5. Active site: an H2 site came within 6 Å of Ni in only 1 of 2,500 samples (closest approach 5.65 Å at 100.5 ps). No pocket occupancy was sampled.
6. Diffusion: D_total = 5.2 × 10⁻⁹ m²/s (20–150 ps fit), with α = 0.83. D ranges from 5.2 to 7.6 × 10⁻⁹ m²/s depending on the fit window. This is a single time origin pooled over 29 molecules, so it is qualitative at best.

## Fix before the next run

- Give each H2 a bond (r0 = 0.741 Å), or add `neigh_modify exclude molecule/intra h2`.
- Keep H2 fixed during minimization (`fix setforce` on h2, or exclude h2 from the minimization), then rebuild the run from the original data file.
- Neutralise the system (for example 7 Na+), and assign charges to the cofactors (Smith et al., JCTC 2012, doi:10.1021/ct300185u).
- Use a thicker water shell, so that the protein–image distance exceeds the cutoff plus a margin.
- For residence times and RDF, analyse `h2_residence_state.dump`, `h2_protein_rdf.dat` and `production.lammpstrj`. These files were not part of this analysis.

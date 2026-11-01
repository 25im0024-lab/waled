# [NiFe]-hydrogenase + H2: analysis of the v6-small LAMMPS pilot run

Post-processing of `h2_hydrogenase_v6_small.in`: PDB 1H2R, 29 two-site rigid H2 molecules, TIP3P water shell, 47,849 atoms, 250 ps NVT production.

```bash
python3 analyze_hydrogenase.py <dir with the run outputs> results
```

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

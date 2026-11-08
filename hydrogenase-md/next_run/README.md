# Next run: v7 input

Corrected version of `h2_hydrogenase_v6_small.in`. The header of the input lists every change. In short:

| # | v6 problem | v7 fix |
|---|---|---|
| 1 | H2 sites 2.1–3.3 Å apart (no bond or exclusion; minimization pushed them apart, then `fix rigid` froze them) | `neigh_modify exclude molecule/intra h2`; H2 frozen during minimization; the run stops if H–H ≠ 0.741 ± 0.01 Å |
| 2 | Default geometric LJ mixing with AMBER parameters | `pair_modify mix arithmetic` |
| 3 | Net charge −7 e; cofactor charges all 0 | Block for cofactor charges, then automatic Joung–Cheatham Na+/Cl− neutralization ≥ 6 Å from the protein; the run stops if \|q\| > 1e-3 e |
| 4 | T(H2) reported ~2 % high (142 instead of 145 DOF) | `compute_modify cTempH2 extra/dof 0` |
| 5 | Minimizer stopped after 1 iteration (`etol 1e-4`) | `etol 0`, stopping on ftol or `NMIN` |
| 6 | Coarse output for residence and diffusion analysis | H2 trajectory every 0.1 ps (unwrapped), Ni–Fe distance and H–H range in the time series, image flags, restart files |
| 7 | Protein 8–11 Å from its own periodic image | **Not fixable in the input.** The run prints a warning; rebuild with ≥ 12–15 Å of water |

## Usage

```bash
python3 fix_h2_geometry.py system_protein_h2_small.data system_v7.data
```

```bash
mpirun -np 8 lmp -in h2_hydrogenase_v7.in
```

To start from the equilibrated v6 state instead (protein and water already relaxed):

```bash
python3 fix_h2_geometry.py final_config.data system_v7.data
```

Override settings on the command line, for example `-var NPROD 1000000` (1 ns) or `-var DATAFILE other.data`.

## Tested

Run with LAMMPS 22 Jul 2025 on the repaired `final_config.data`, using short step counts:
- The geometry guard stops the run on the unrepaired file.
- 7 Na+ inserted and 11 waters removed; net charge 5 × 10⁻¹³ e.
- H–H = 0.741 Å after minimization and through NPT and production.
- All output files written.

Before running:
- Rebuild the metal sites, then set the cofactor charges. In the v6 data file all 14 metal-ligating Cys are protonated (HG atoms 0.97–2.0 Å from metals), the Fe CO/CN ligands lack their O/N atoms, and 4 isolated O atoms are typed as cofactor. Charges from Smith et al. 2012 cannot simply be pasted in.
- Check that the atom IDs used for Ni (12305) and Fe (12306) match your data file.

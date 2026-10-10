# Demonstration run

This folder holds one run of the 3D LAMMPS model. It is played back in UHS Pore Lab under "LAMMPS run (3D)": [open it](https://25im0024-lab.github.io/waled/uhs-md/?view=lammps).

**It shows what the model produces. It is not a publishable result:**
- small system (2,945 atoms, 3.0 × 3.2 × 7.1 nm)
- short run (0.1 ns equilibration + 0.4 ns production)
- one seed only

See the main README for the system size, run length and validation needed for a paper.

## Case
| Setting | Value |
|---|---|
| Rock | calcite (10-14), rigid; Xiao 2011 charges, Li 2021 LJ |
| Gas feed | 70 % H2, 30 % CO2 (cushion gas) |
| Conditions | 333.15 K, 10 MPa (gas loading from CoolProp) |
| Brine | SPC/E water + NaCl 1 mol/kg, 10 Å film on each wall |
| Bacteria | methanogenesis, 10 % of H2 converted (4 H2 + CO2 → CH4 + 2 H2O) |
| Run | 4 MPI ranks, about 8 ns/day |

Built and run with:
```bash
python3 build_system.py --cushion CO2 --x-cushion 0.3 --T 333.15 --P 10e6 --molality 1.0 \
    --bio methanogenesis --bio-conversion 0.10 --seed 2026 --out demo
cd demo && mpirun -np 4 lmp -in ../in.uhs.lmp -var neq 100000 -var nprod 400000
```

## Results (`results.json`, `figures/table_summary.md`)
| Quantity | Value |
|---|---|
| H2 mole fraction in brine | 1.07 × 10⁻³ (0.062 mol/L) |
| H2 liquid/gas concentration ratio | 0.032 |
| Pore-centre gas | 80 % H2, 18 % CO2, 1.5 % CH4 |
| D(H2) parallel to the walls | 9.3 ± 3.7 × 10⁻⁷ m²/s |
| Pore pressure Pzz | 9.4 MPa (instantaneous fluctuation ± 9.6 MPa) |

**Qualitative observations:**
- **CO2 at the interface:** CO2 accumulates at the brine–gas interface, while H2 fills the pore centre.
- **Water layering:** water forms ordered layers on calcite; the surface stays water-wet.
- **Confinement:** H2 moves freely parallel to the walls, while its MSD normal to the walls plateaus.

## Files
| File | Content |
|---|---|
| `demo-run.json` | Trajectory (41 frames), profiles, pressure and results packed for the 3D player (`make_viewer_data.py`) |
| `results.json`, `system.json` | Output of `analyze.py` and of the builder |
| `figures/` | `make_figures.py` output (PNG); the PDF and CSV versions are produced by the same command |

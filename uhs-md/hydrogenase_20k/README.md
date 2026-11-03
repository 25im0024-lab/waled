# [NiFe]-hydrogenase + brine + cushion gas: 20,000-atom LAMMPS model (v7)

| File | Purpose |
|---|---|
| `h2_hydrogenase_v7_brine_gas_20k.in` | LAMMPS input at **313.15 K and 10 MPa**: minimisation, restrained NVT warm-up, then 100 ps NPT equilibration and 250 ps NPT production, with gas/active-site analysis |
| `system_protein_brine_gas_20k.data` | 20,000-atom data file, net charge 0 |
| `build_20k.py` | Builds the data file from the v6 `system_protein_h2_small.data`. Gas loading is solved for `T_TARGET` and `P_TARGET` (needs numpy; uses CoolProp if installed, otherwise Peng–Robinson) |

## Composition

| Component | Count | Atoms | Model |
|---|---|---|---|
| [NiFe]-hydrogenase 1H2R + cofactors | 1 | 12,312 | v6, copied unchanged (Ni = 12305, Fe = 12306) |
| H2 | 29 | 58 | v6 2-site rigid |
| Water | 1,972 | 5,916 | TIP3P, SHAKE |
| Na+ / Cl- | 45 / 38 | 83 | Joung–Cheatham 2008, TIP3P set (1.07 mol/kg NaCl + 7 Na+ counter-ions) |
| N2 | 233 | 699 | TraPPE 3-site, rigid |
| CH4 | 233 | 233 | TraPPE-UA |
| CO2 | 233 | 699 | TraPPE 3-site, rigid |
| **Total** | | **20,000** | |

Starting box: 79.5 × 81.2 × 82.3 Å (same as v6). The barostat adjusts it during the NPT stages.

**Conditions: 313.15 K (40 °C) and 10 MPa.** The gas count is set from the mixture density at these conditions (CoolProp HEOS, Z = 0.880) in the free volume of the box. The barostat then holds 10 MPa (98.692 atm).

## Design limits

- **A brine film, not bulk solvent.** Fully solvating this 89 kDa enzyme needs about 35,000 water atoms, so a 20,000-atom cap leaves room only for a hydration film. At 10 MPa the gas alone needs 1,631 atoms. The kept water is therefore h = 0.40 g water per g protein, every water within 6.2 Å of a heavy atom. That is about one hydration layer, not more.
- **Pressure.** fix npt is given the full-system pressure via `fix_modify press`. Otherwise it would miss the kinetic energy of the rigid gas molecules.
- **If you change `TEMP`/`PRESS`,** rebuild the data file with matching `T_TARGET`/`P_TARGET`.

## Fixes relative to v6

1. **Spurious atom removed.** v6 atom 12341 is a type-20 "O" with no bonds, sitting 0.741 Å from cofactor O 12312. It was a build artifact.
2. **H–H bonds added for H2.** Each H2 now has an H–H bond (type 86). This excludes the intramolecular LJ pair, which in v6 added about 4.9e7 kcal/mol at step 0.
3. **`pair_modify mix arithmetic`** (Lorentz–Berthelot), which AMBER, TIP3P, Joung–Cheatham and TraPPE all assume. v6 used LAMMPS's default geometric mixing.
4. **`LIGFIX = 1` (default).** This bonds the three Fe-ligand O atoms (12310, 12311, 12312) to their C/S partners. They are unbonded in v6. Use `-var LIGFIX 0` to reproduce v6 behaviour.
5. **Minimisation runs before SHAKE, with `etol = 0`.** With SHAKE active, the v6 setup stopped the minimiser after about 10 iterations with large residual forces.
6. **Gas molecules are frozen during minimisation.** Their rigid geometry is exact from insertion.

## Run

```bash
mpirun -np 8 lmp -in h2_hydrogenase_v7_brine_gas_20k.in
```

Optional overrides: `-var TEMP 323 -var NPROD 500000 -var LIGFIX 0`.

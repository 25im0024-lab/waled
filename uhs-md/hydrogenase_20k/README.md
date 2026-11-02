# [NiFe]-hydrogenase + brine + cushion gas: 20,000-atom LAMMPS model (v7)

| File | Purpose |
|---|---|
| `h2_hydrogenase_v7_brine_gas_20k.in` | LAMMPS input: minimisation, restrained → unrestrained NVT equilibration, 250 ps NVT production with gas/active-site analysis |
| `system_protein_brine_gas_20k.data` | 20,000-atom data file, net charge 0 |
| `build_20k.py` | Builds the data file from the v6 `system_protein_h2_small.data` (needs only numpy) |

## Composition

| Component | Count | Atoms | Model |
|---|---|---|---|
| [NiFe]-hydrogenase 1H2R + cofactors | 1 | 12,312 | v6, copied unchanged (Ni = 12305, Fe = 12306) |
| H2 | 29 | 58 | v6 2-site rigid |
| Water | 2,278 | 6,834 | TIP3P, SHAKE |
| Na+ / Cl- | 51 / 44 | 95 | Joung–Cheatham 2008, TIP3P set (1.07 mol/kg NaCl + 7 Na+ counter-ions) |
| N2 | 100 | 300 | TraPPE 3-site, rigid |
| CH4 | 101 | 101 | TraPPE-UA |
| CO2 | 100 | 300 | TraPPE 3-site, rigid |
| **Total** | | **20,000** | |

Box: 79.5 × 81.2 × 82.3 Å (same as v6).

## Design limits

- **A brine film, not bulk solvent.** Fully solvating this 89 kDa enzyme needs about 35,000 water atoms, so a 20,000-atom cap leaves room only for a hydration film. The kept water amounts to h = 0.46 g water per g protein, with every water within 6.7 Å of a heavy atom. The rest of the box is gas phase.
- **NVT only.** The gas loading sets the pressure (about 5 MPa ideal-gas estimate at 300 K), and the run reports it rather than controlling it.

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

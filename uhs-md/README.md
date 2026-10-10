# UHS-MD: Molecular Dynamics of Hydrogen Storage in Carbonate Reservoirs (LAMMPS)

A ready-to-run model of how **H2** interacts with a **cushion gas** (CO2, CH4 or N2) inside a **calcite (10-14) slit nanopore**. The pore contains **brine / formation water**, and the effect of **bacteria** is represented through their metabolic products.

> **Before any publishable result:** the calcite Lennard-Jones parameters in [`ff/calcite.json`](ff/calcite.json) are placeholders, not a published set, and the file is marked `"verified": false`. `build_system.py` only runs if you either enter the published values and set the flag to `true`, or pass `--accept-unverified-calcite` (smoke tests only). Details are in the "Force field" section.

---

## 1. Simulated system

```
 z ↑
   |  calcite slab (periodic image)   ← facing pore wall
   |  brine film (NaCl + H2O)          ← water film on a water-wet wall
   |  H2 + cushion gas (+ biogenic CH4) ← gas phase in the pore centre
   |  brine film
   |  calcite (10-14) slab, rigid     ← z = 0
```

- **Calcite (10-14):** the most stable and most commonly exposed calcite cleavage plane. It is built from the R-3c crystal structure (Effenberger et al., 1981). The surface cell is 4.99 × 8.10 Å and the interlayer spacing is 3.035 Å. Geometry checks: Ca–O = 2.36 Å, and surface Ca is 5-coordinated against 6 in the bulk.
- **Periodic in all three directions:** the slab's periodic image closes the pore, so no wall potential or Ewald slab correction is needed.
- **Gas loading** comes from the mixture density at (T, P), computed with CoolProp (HEOS, falling back to Peng-Robinson).
- **Brine:** SPC/E water with NaCl at the requested molality. The water count uses pure-water density, and the ions take the sites of water molecules.

## 2. How bacteria are represented: what is and is not possible

**Basic fact:** a bacterial cell cannot be simulated with all-atom MD. A cell is about 1 µm across and its metabolism runs over hours to days. MD covers a box a few nanometres wide for nanoseconds, a gap of roughly 10–15 orders of magnitude in time.

The bacterial effect is therefore represented chemically, through its metabolic products, which is a defensible approach:

| Pathway | Reaction | Status here |
|---|---|---|
| Hydrogenotrophic methanogenesis | 4 H2 + CO2 → CH4 + 2 H2O | ✅ `--bio methanogenesis --bio-conversion f` |
| Sulfate reduction (SRB) | 4 H2 + SO4²⁻ + 2H⁺ → H2S + 4 H2O | ❌ not implemented: needs a validated H2S and SO4²⁻ model compatible with SPC/E |
| Homoacetogenesis | 4 H2 + 2 CO2 → CH3COOH + 2 H2O | ❌ not implemented: needs acetate parameters |
| Biofilm / EPS on the surface | changes wettability | ❌ needs a polysaccharide topology (CHARMM36 / GLYCAM via CHARMM-GUI) |

In the methanogenesis scenario, a fraction `f` of the H2 is removed. CO2 is taken from the cushion gas if present, and the produced CH4 and water are added. The drop in gas moles (5 → 1) lowers the pressure, which is the biogenic hydrogen loss seen in the field. If the cushion gas is not CO2, the carbon source is assumed to be HCO3⁻ from the carbonate and is not removed explicitly; this is recorded in `system.json`.

## 3. Force field (`real` units, Lorentz-Berthelot cross terms)

| Component | Model | Reference | Confidence |
|---|---|---|---|
| Water | SPC/E, rigid (SHAKE) | Berendsen, Grigera & Straatsma, *J. Phys. Chem.* 91 (1987) 6269 | high |
| Na⁺, Cl⁻ | Joung-Cheatham (SPC/E) | Joung & Cheatham, *J. Phys. Chem. B* 112 (2008) 9020 | high |
| H2 | single-site LJ, ε/k = 34.2 K, σ = 2.96 Å | Buch, *J. Chem. Phys.* 100 (1994) 7610 | high for the values; see model limits below |
| CH4 | TraPPE-UA | Martin & Siepmann, *J. Phys. Chem. B* 102 (1998) 2569 | high |
| CO2, N2 | TraPPE, 3-site, rigid | Potoff & Siepmann, *AIChE J.* 47 (2001) 1676 | high |
| Calcite | **placeholder** | Charges (Ca +2, C +1.123282, O −1.041094) recalled from memory as those of Xiao, Edwards & Gräter, *J. Phys. Chem. C* 115 (2011) 20067. **Not checked against the source.** The LJ values are generic CHARMM-like numbers, not Xiao's. | **low: must be verified** |

**Before production:** copy ε and σ (and the charges, if they differ) from the table in the original paper into `ff/calcite.json`, then set `"verified": true`. A common alternative is Raiteri et al., *J. Phys. Chem. C* 114 (2010) 5997, but it uses Buckingham terms and needs `pair_style hybrid/overlay`, which this template does not support as is.

## 4. Running

```bash
# Requirements
conda install -c conda-forge lammps   # needs the MOLECULE, KSPACE and RIGID packages
pip install numpy CoolProp matplotlib

cd uhs-md
# 1) Build: 30% CO2 cushion, 60 °C, 10 MPa, 1 mol/kg NaCl, 10% biogenic conversion
python3 build_system.py --cushion CO2 --x-cushion 0.3 --T 333.15 --P 10e6 \
        --molality 1.0 --bio methanogenesis --bio-conversion 0.10 --out runs/co2_bio

# 2) Run (default: 0.5 ns equilibration, then 2 ns production)
cd runs/co2_bio && mpirun -np 8 lmp -in ../../in.uhs.lmp && cd ../..

# 3) Analyse
python3 analyze.py runs/co2_bio

# Full scenario matrix: 3 gases × 3 salinities × (with/without bacteria)
NP=8 LMP=lmp ./run_matrix.sh
```

Main build options: `--pore` (pore width, Å), `--water-film` (brine thickness on each wall; 0 gives a dry pore), `--nx --ny --layers` (slab size) and `--seed`.

**Protocol in `in.uhs.lmp`:** energy minimisation, then 5 ps at 0.5 fs, then NVT (Nosé-Hoover) at 1 fs, then production. Details:
- Water is constrained with SHAKE.
- CO2 and N2 are rigid bodies (`rigid/nvt/small`).
- The calcite slab is frozen.
- Long-range Coulomb uses PPPM with 10⁻⁵ accuracy.

Smoke-test speed: about 4 ns/day on one core for a system of about 2,900 atoms.

## 5. Outputs and what they mean

| File / key in `results.json` | Physical meaning |
|---|---|
| `prof_*.dat`, `profiles.png` | Density profile of each species along z: water layering on calcite and gas accumulation at the interface |
| `x_H2_brine`, `K_H2_liq_over_gas` | H2 solubility in the brine and the liquid/gas partition coefficient. This is the dissolution loss of hydrogen; salinity acts through salting-out |
| `gas_centre_mole_fractions` | Gas composition in the pore centre, i.e. how far H2 mixes with the cushion gas. This sets the purity of recovered hydrogen |
| `H2_interface_enrichment` | H2 accumulation at the gas–brine interface relative to the free gas |
| `H2_within_5A_of_surface_per_nm2` | Direct H2 adsorption on calcite. Meaningful only for dry pores (`--water-film 0`) |
| `D_H2_lateral_m2_s` | Lateral H2 self-diffusion coefficient under confinement |
| `energy_h2.dat` | H2 interaction energy with calcite and with water |
| `rdf.dat` | RDFs of H2 with Ow, Oc, Ca, CH4 and C(CO2), and of Ow with Oc |
| `P_gas_Pzz_MPa` | Normal pressure in the gas region. **Compare it with the target pressure** |

## 6. Limitations (read before interpreting results)

1. **Pressure is not controlled directly.** The number of gas molecules is set from the free-gas density, but part of the gas dissolves or adsorbs, so the actual pressure falls. Check `P_gas_Pzz_MPa` after at least 1 ns, then adjust `--P` and rebuild until it matches. The gas region is small, so Pzz fluctuates strongly and needs long averaging.
2. **Calcite is rigid**, with no dissolution and no reactive chemistry: no pH, no CO2/HCO3⁻/CO3²⁻ equilibrium, no precipitation. Real CO2 dissolution acidifies the brine and dissolves carbonate; capturing that needs ReaxFF or geochemical models (e.g. PHREEQC), outside the scope of this model.
3. **H2 is single-site and classical:** quantum effects for H2 are small at 333 K but not zero, and this model has no quadrupole.
4. **Cross interactions** (e.g. H2–calcite, CO2–calcite) come from Lorentz-Berthelot and are not fitted to experimental data.
5. **Size and time:** the default systems are small (≈ 3,000 atoms) and production is 2 ns. For publication, enlarge `--nx --ny`, run longer, repeat with at least three different seeds and report the standard deviation.
6. **NaCl only.** Carbonate formation water is rich in Ca²⁺, Mg²⁺ and SO4²⁻; adding them needs SPC/E-compatible parameters.
7. **Expected LAMMPS warning:** `Neighbor exclusions used with KSpace` comes from excluding the frozen calcite–calcite pairs. It adds a constant energy offset and does not affect the fluid forces.

## 7. Suggested validation before using results

- **H2 solubility in water or brine:** compare `x_H2_brine` from a system without calcite and without cushion gas against Chabab et al., *Int. J. Hydrogen Energy* 45 (2020) 32206. Confidence in this reference is medium-to-high; check the volume and page numbers.
- **H2–water IFT:** Chow et al., *Fluid Phase Equilib.* 475 (2018) 37. Confidence: medium.
- **Gas density in the pore centre** against CoolProp at the measured pressure.
- **Calcite–water:** density of the first water layers against X-ray reflectivity data (Fenter et al.), as a qualitative check of the calcite parameters once entered.

## 8. Files

| File | Purpose |
|---|---|
| `build_system.py` | Builds `system.data`, `forcefield.lmp`, `system.lmp` and `system.json` |
| `ff/params.py` | Water, ion and gas parameters (documented) |
| `ff/calcite.json` | Calcite parameters (**need verification**) |
| `in.uhs.lmp` | LAMMPS input: minimisation, equilibration, production and output collection |
| `analyze.py` | Analysis; writes `results.json` and `profiles.png` |
| `run_matrix.sh` | Scenario matrix |
| `tests/test_build.py` | Build tests (charge neutrality, molecule integrity, overlaps, stoichiometry); run in CI |

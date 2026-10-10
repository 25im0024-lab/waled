/* UHS Pore Lab - physics engine.
 * 2D molecular dynamics of H2 + cushion gas + brine in a carbonate slit pore,
 * with hydrogenotrophic methanogens on the pore walls and an optional
 * injection / withdrawal cycle.
 *
 * Units: length A, time ps, mass g/mol, energy K (energy / kB).
 * Force F [K/A] gives acceleration a = 0.831446 * F / m  [A/ps^2].
 *
 * This is a 2D coarse-grained teaching model: every molecule is one
 * Lennard-Jones site and water is a liquid-forming LJ bead, not a real water
 * model. Results are qualitative trends; the LAMMPS model in this folder is
 * the quantitative tool.
 *
 * Works in the browser (window.UHS) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  const ACC = 0.831446;        // (K/A)/amu -> A/ps^2
  const NA = 6.02214076e23;
  const R = 8.314462618;

  // Single-site LJ parameters.
  //  H2  : Buch, J. Chem. Phys. 100 (1994) 7610
  //  CH4 : TraPPE-UA, Martin & Siepmann, J. Phys. Chem. B 102 (1998) 2569
  //  CO2, N2 : one-site LJ from gas viscosity (Svehla, NASA TR R-132, 1962,
  //        as tabulated in Poling, Prausnitz & O'Connell, Properties of Gases
  //        and Liquids)
  //  W   : coarse-grained liquid bead standing in for one water molecule
  //  S   : coarse-grained bead for one dissolved Na+Cl- pair
  const SPECIES = {
    H2:  { m: 2.016,  sig: 2.96,  eps: 34.2,  el: { H: 2 },          color: '#f4f7fb', label: 'H₂' },
    CH4: { m: 16.043, sig: 3.73,  eps: 148.0, el: { C: 1, H: 4 },    color: '#ffb627', label: 'CH₄' },
    CO2: { m: 44.01,  sig: 3.941, eps: 195.2, el: { C: 1, O: 2 },    color: '#ff5d5d', label: 'CO₂' },
    N2:  { m: 28.014, sig: 3.798, eps: 71.4,  el: { N: 2 },          color: '#b48cff', label: 'N₂' },
    W:   { m: 18.015, sig: 3.10,  eps: 740.0, el: { H: 2, O: 1 },    color: '#2f7fd8', label: 'H₂O' },
    S:   { m: 58.44,  sig: 3.60,  eps: 740.0, el: { Na: 1, Cl: 1 },  color: '#d9e3ec', label: 'NaCl' },
  };
  const NAMES = Object.keys(SPECIES);
  const GASES = ['H2', 'CH4', 'CO2', 'N2'];
  const IDX = {}; NAMES.forEach((n, i) => { IDX[n] = i; });
  const isGas = s => s <= 3;

  // Peng-Robinson critical constants (Tc K, Pc MPa, omega)
  const CRIT = {
    H2:  [33.19, 1.313, -0.216],
    CH4: [190.56, 4.599, 0.011],
    CO2: [304.13, 7.377, 0.224],
    N2:  [126.19, 3.396, 0.037],
  };

  /** Peng-Robinson mixture molar density [mol/m3] (vdW one-fluid, kij = 0). */
  function prDensity(T, Pa, comp) {
    let am = 0, bm = 0;
    const ks = Object.keys(comp).filter(k => comp[k] > 0);
    const a = {}, b = {};
    for (const k of ks) {
      const [Tc, PcM, w] = CRIT[k];
      const Pc = PcM * 1e6;
      const kap = 0.37464 + 1.54226 * w - 0.26992 * w * w;
      const al = Math.pow(1 + kap * (1 - Math.sqrt(T / Tc)), 2);
      a[k] = 0.45724 * R * R * Tc * Tc / Pc * al;
      b[k] = 0.07780 * R * Tc / Pc;
    }
    for (const i of ks) {
      bm += comp[i] * b[i];
      for (const j of ks) am += comp[i] * comp[j] * Math.sqrt(a[i] * a[j]);
    }
    const A = am * Pa / (R * R * T * T), B = bm * Pa / (R * T);
    // Z^3 + c2 Z^2 + c1 Z + c0 = 0
    const c2 = -(1 - B), c1 = A - 3 * B * B - 2 * B, c0 = -(A * B - B * B - B * B * B);
    const Z = largestCubicRoot(c2, c1, c0);
    return { rho: Pa / (Z * R * T), Z };
  }

  /** Peng-Robinson pressure [Pa] at molar density rho [mol/m3]. */
  function prPressure(T, rho, comp) {
    let am = 0, bm = 0;
    const ks = Object.keys(comp).filter(k => comp[k] > 0);
    const a = {}, b = {};
    for (const k of ks) {
      const [Tc, PcM, w] = CRIT[k];
      const Pc = PcM * 1e6;
      const kap = 0.37464 + 1.54226 * w - 0.26992 * w * w;
      a[k] = 0.45724 * R * R * Tc * Tc / Pc * Math.pow(1 + kap * (1 - Math.sqrt(T / Tc)), 2);
      b[k] = 0.07780 * R * Tc / Pc;
    }
    for (const i of ks) { bm += comp[i] * b[i]; for (const j of ks) am += comp[i] * comp[j] * Math.sqrt(a[i] * a[j]); }
    const v = 1 / rho;
    return R * T / (v - bm) - am / (v * v + 2 * bm * v - bm * bm);
  }

  function largestCubicRoot(c2, c1, c0) {
    // Newton from a large start converges to the largest real root
    let z = Math.max(1, -c2) + 1;
    for (let it = 0; it < 200; it++) {
      const f = ((z + c2) * z + c1) * z + c0;
      const d = (3 * z + 2 * c2) * z + c1;
      const dz = f / d;
      z -= dz;
      if (Math.abs(dz) < 1e-12) break;
    }
    return z;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DEFAULTS = {
    cushion: 'CO2', xCushion: 0.3,  // cushion-gas mole fraction in the feed
    T: 333.15, P_MPa: 10,
    molality: 1.0,                  // NaCl mol/kg
    film: 12,                       // brine film thickness on each wall, A
    pore: 80,                       // wall-to-wall distance, A
    Lx: 140,                        // periodic length, A
    wetting: 1100,                  // water-calcite well depth, K (higher = more water-wet)
    bio: true, microbes: 8,
    bioRate: 0.004,                 // H2 uptake probability per step for an H2 inside the capture radius
    carbonateCO2: true,             // CO2 from carbonate / HCO3- when no CO2 is captured
    dt: 0.002,                      // ps
    seed: 12345,
  };

  // cross-interaction corrections (1 - k_ij) applied to sqrt(eps_i eps_j)
  // gas-water k_ij: hydrophobic gases dissolve poorly. CO2 gets a smaller k
  // because its quadrupole (absent in a one-site model) binds it to water,
  // giving the observed order CO2 >> CH4 > N2 ~ H2.
  const K_GAS_WATER = { H2: 0.50, N2: 0.52, CH4: 0.47, CO2: 0.18 };
  const K_GAS_SALT = 0.75;   // dissolved salt excludes gas (salting-out)
  const K_WATER_SALT = -0.30; // hydration: salt binds water more strongly
  const RC = 10.0;           // pair cutoff, A
  const WALL_SIG = 3.0;      // calcite surface site size, A
  const WALL_GAS = 25.0;     // gas-wall depth = WALL_GAS * sqrt(eps_gas) K
  const W_RHO2 = 0.074;      // 2D liquid number density of W beads, 1/A^2
  const BIO_RC = 7.0;        // microbe capture radius, A

  function mix(i, j, wetting) {
    const a = SPECIES[NAMES[i]], b = SPECIES[NAMES[j]];
    let k = 0;
    const gi = isGas(i), gj = isGas(j);
    if (gi && NAMES[j] === 'W') k = K_GAS_WATER[NAMES[i]];
    else if (gj && NAMES[i] === 'W') k = K_GAS_WATER[NAMES[j]];
    else if ((gi && NAMES[j] === 'S') || (gj && NAMES[i] === 'S')) k = K_GAS_SALT;
    else if ((NAMES[i] === 'W' && NAMES[j] === 'S') || (NAMES[i] === 'S' && NAMES[j] === 'W')) k = K_WATER_SALT;
    return { eps: (1 - k) * Math.sqrt(a.eps * b.eps), sig: 0.5 * (a.sig + b.sig) };
  }

  function wallParams(s, wetting) {
    const sp = SPECIES[NAMES[s]];
    const eps = isGas(s) ? WALL_GAS * Math.sqrt(sp.eps) : wetting;
    return { eps, sig: 0.5 * (sp.sig + WALL_SIG) };
  }

  function createSim(userCfg) {
    const cfg = Object.assign({}, DEFAULTS, userCfg || {});
    const rnd = mulberry32(cfg.seed);
    const gauss = () => {
      let u = 0, v = 0;
      while (u === 0) u = rnd();
      v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const Lx = cfg.Lx, H = cfg.pore;
    const nsp = NAMES.length;

    // pair tables
    const E4 = new Float64Array(nsp * nsp), S2 = new Float64Array(nsp * nsp), ESH = new Float64Array(nsp * nsp);
    for (let i = 0; i < nsp; i++) for (let j = 0; j < nsp; j++) {
      const p = mix(i, j, cfg.wetting);
      E4[i * nsp + j] = 4 * p.eps;
      S2[i * nsp + j] = p.sig * p.sig;
      const sr6 = Math.pow(p.sig / RC, 6);
      ESH[i * nsp + j] = 4 * p.eps * (sr6 * sr6 - sr6);  // energy shift at RC
    }
    const WE = new Float64Array(nsp), WS = new Float64Array(nsp);
    for (let s = 0; s < nsp; s++) { const w = wallParams(s, cfg.wetting); WE[s] = w.eps; WS[s] = w.sig; }

    // particle storage (grown as needed)
    let cap = 2048, n = 0;
    let x = new Float64Array(cap), z = new Float64Array(cap), vx = new Float64Array(cap), vz = new Float64Array(cap);
    let fx = new Float64Array(cap), fz = new Float64Array(cap), xu = new Float64Array(cap), x0 = new Float64Array(cap);
    let sp = new Int8Array(cap), dis = new Uint8Array(cap);
    function grow() {
      cap *= 2;
      const g = (A, T) => { const B = new T(cap); B.set(A); return B; };
      x = g(x, Float64Array); z = g(z, Float64Array); vx = g(vx, Float64Array); vz = g(vz, Float64Array);
      fx = g(fx, Float64Array); fz = g(fz, Float64Array); xu = g(xu, Float64Array); x0 = g(x0, Float64Array);
      sp = g(sp, Int8Array); dis = g(dis, Uint8Array);
    }
    function vInit(s) { return Math.sqrt(cfg.T * ACC / SPECIES[NAMES[s]].m); }
    function add(s, px, pz) {
      if (n >= cap) grow();
      x[n] = ((px % Lx) + Lx) % Lx; z[n] = pz; xu[n] = x[n]; x0[n] = x[n];
      const v = vInit(s); vx[n] = v * gauss(); vz[n] = v * gauss();
      fx[n] = fz[n] = 0; sp[n] = s; dis[n] = 0;
      return n++;
    }
    function remove(i) {
      n--;
      if (i !== n) {
        x[i] = x[n]; z[i] = z[n]; vx[i] = vx[n]; vz[i] = vz[n]; fx[i] = fx[n]; fz[i] = fz[n];
        xu[i] = xu[n]; x0[i] = x0[n]; sp[i] = sp[n]; dis[i] = dis[n];
      }
    }

    // ---- cell list
    const ncx = Math.max(3, Math.floor(Lx / RC)), ncz = Math.max(3, Math.floor(H / RC));
    const csx = Lx / ncx, csz = H / ncz;
    let head = new Int32Array(ncx * ncz), next = new Int32Array(cap);
    function buildCells() {
      if (next.length < cap) next = new Int32Array(cap);
      head.fill(-1);
      for (let i = 0; i < n; i++) {
        const cx = Math.min(ncx - 1, Math.floor(x[i] / csx));
        const cz = Math.min(ncz - 1, Math.max(0, Math.floor(z[i] / csz)));
        const c = cz * ncx + cx;
        next[i] = head[c]; head[c] = i;
      }
    }
    function forEachNeighbor(i, rmax, fn) {
      const cx = Math.min(ncx - 1, Math.floor(x[i] / csx));
      const cz = Math.min(ncz - 1, Math.max(0, Math.floor(z[i] / csz)));
      const r2 = rmax * rmax;
      for (let dzc = -1; dzc <= 1; dzc++) {
        const kz = cz + dzc; if (kz < 0 || kz >= ncz) continue;
        for (let dxc = -1; dxc <= 1; dxc++) {
          const kx = (cx + dxc + ncx) % ncx;
          for (let j = head[kz * ncx + kx]; j >= 0; j = next[j]) {
            if (j === i) continue;
            let dx = x[j] - x[i]; dx -= Lx * Math.round(dx / Lx);
            const dz = z[j] - z[i];
            const d2 = dx * dx + dz * dz;
            if (d2 < r2) fn(j, dx, dz, d2);
          }
        }
      }
    }

    // ---- forces
    const st = { pe: 0, wallBottom: 0, wallTop: 0 };
    const WCUT = 15.0;
    function forces() {
      buildCells();
      fx.fill(0, 0, n); fz.fill(0, 0, n);
      let pe = 0, wb = 0, wt = 0;
      const rc2 = RC * RC;
      for (let c = 0; c < ncx * ncz; c++) {
        const cx = c % ncx, cz = (c / ncx) | 0;
        for (let i = head[c]; i >= 0; i = next[i]) {
          const si = sp[i] * nsp;
          // half shell: same cell j < i via list order, plus 4 forward neighbours
          for (let k = 0; k < 5; k++) {
            let kx, kz;
            if (k === 0) { kx = cx; kz = cz; }
            else if (k === 1) { kx = cx + 1; kz = cz; }
            else if (k === 2) { kx = cx - 1; kz = cz + 1; }
            else if (k === 3) { kx = cx; kz = cz + 1; }
            else { kx = cx + 1; kz = cz + 1; }
            if (kz >= ncz) continue;
            kx = (kx + ncx) % ncx;
            let j = k === 0 ? next[i] : head[kz * ncx + kx];
            for (; j >= 0; j = next[j]) {
              let dx = x[j] - x[i]; dx -= Lx * Math.round(dx / Lx);
              const dz = z[j] - z[i];
              let r2 = dx * dx + dz * dz;
              if (r2 >= rc2) continue;
              const t = si + sp[j];
              const s2 = S2[t];
              if (r2 < 0.36 * s2) r2 = 0.36 * s2;  // soft floor for start-up overlaps
              const sr2 = s2 / r2, sr6 = sr2 * sr2 * sr2;
              const e4 = E4[t];
              pe += e4 * (sr6 * sr6 - sr6) - ESH[t];
              const ff = e4 * (12 * sr6 * sr6 - 6 * sr6) / r2;
              fx[i] -= ff * dx; fz[i] -= ff * dz;
              fx[j] += ff * dx; fz[j] += ff * dz;
            }
          }
        }
      }
      // 10-4 walls at z = 0 and z = H (calcite surfaces), min -eps at z = sig
      for (let i = 0; i < n; i++) {
        const s = sp[i], e = WE[s], sg = WS[s];
        for (let w = 0; w < 2; w++) {
          let d = w === 0 ? z[i] : H - z[i];
          if (d > WCUT) continue;
          if (d < 0.55 * sg) d = 0.55 * sg;
          const q = sg / d, q4 = q * q * q * q, q10 = q4 * q4 * q * q;
          pe += (5 / 3) * e * (0.4 * q10 - q4);
          const f = (20 / 3) * e * (q10 - q4) / d;   // push away from the wall
          if (w === 0) { fz[i] += f; wb += f; } else { fz[i] -= f; wt += f; }
        }
      }
      st.pe = pe; st.wallBottom = wb; st.wallTop = wt;
    }

    // ---- microbes (fixed on both walls, inside the brine film)
    const microbes = [];
    const ledger = {
      H2_consumed: 0, CO2_gas_consumed: 0, CO2_carbonate: 0, CH4_produced: 0, H2O_produced: 0,
      pendingCH4: 0, pendingH2O: 0, injected: {}, withdrawn: {},
    };
    GASES.forEach(g => { ledger.injected[g] = 0; ledger.withdrawn[g] = 0; });

    // ---- build
    function build() {
      const film = Math.min(cfg.film, H / 2 - 8);
      const gasLo = film + 2, gasHi = H - film - 2;
      const comp = { H2: 1 - cfg.xCushion };
      if (cfg.xCushion > 0) comp[cfg.cushion] = cfg.xCushion;
      const eos = prDensity(cfg.T, cfg.P_MPa * 1e6, comp);
      // 3D number density -> 2D areal density, rho2 = rho3^(2/3)
      const rho3 = eos.rho * NA * 1e-30;
      const rho2 = Math.pow(rho3, 2 / 3);
      const nGas = Math.round(rho2 * Lx * (gasHi - gasLo));
      const counts = {};
      for (const k of Object.keys(comp)) counts[k] = Math.round(comp[k] * nGas);
      const nW = film > 0 ? Math.round(W_RHO2 * Lx * film * 2) : 0;
      const nS = Math.round(cfg.molality * 0.018015 * nW);

      const placed = [];
      function tryPlace(s, zlo, zhi, tries) {
        const sg = SPECIES[NAMES[s]].sig;
        for (let t = 0; t < (tries || 400); t++) {
          const px = rnd() * Lx, pz = zlo + rnd() * (zhi - zlo);
          let ok = true;
          for (const p of placed) {
            let dx = p[0] - px; dx -= Lx * Math.round(dx / Lx);
            const dz = p[1] - pz, m = 0.8 * 0.5 * (sg + p[2]);
            if (dx * dx + dz * dz < m * m) { ok = false; break; }
          }
          if (ok) { placed.push([px, pz, sg]); add(s, px, pz); return true; }
        }
        return false;
      }
      const filmSites = [];
      for (let i = 0; i < nW + nS; i++) filmSites.push(i < nS ? IDX.S : IDX.W);
      let half = 0;
      for (const s of filmSites) {
        const bottom = (half++ % 2) === 0;
        if (bottom) tryPlace(s, 1.8, film + 1.0); else tryPlace(s, H - film - 1.0, H - 1.8);
      }
      for (const k of Object.keys(counts))
        for (let i = 0; i < counts[k]; i++) tryPlace(IDX[k], gasLo + 1.5, gasHi - 1.5);

      if (cfg.bio && cfg.microbes > 0) {
        for (let m = 0; m < cfg.microbes; m++) {
          const top = m % 2 === 1;
          microbes.push({ x: (m + 0.5) * Lx / cfg.microbes, z: top ? H - 3.5 : 3.5, top, h2: 0, co2: 0, made: 0 });
        }
      }
      return { eos, rho2, counts, nW, nS, film, gasLo, gasHi };
    }

    function relax(steps) {
      for (let k = 0; k < steps; k++) {
        forces();
        for (let i = 0; i < n; i++) {
          let dx = 0.002 * fx[i], dz = 0.002 * fz[i];
          const d = Math.hypot(dx, dz);
          if (d > 0.08) { dx *= 0.08 / d; dz *= 0.08 / d; }
          x[i] = ((x[i] + dx) % Lx + Lx) % Lx; z[i] = Math.min(H - 0.5, Math.max(0.5, z[i] + dz));
          xu[i] = x[i]; x0[i] = x[i];
        }
      }
    }

    const info = build();
    relax(400);
    forces();

    let time = 0, stepCount = 0;
    let msdT0 = 0;
    const tauT = 0.2; // ps, Berendsen coupling

    function kinetic() {
      let k = 0;
      for (let i = 0; i < n; i++) k += SPECIES[NAMES[sp[i]]].m * (vx[i] * vx[i] + vz[i] * vz[i]);
      return 0.5 * k / ACC; // K
    }
    function temperature() { return n ? kinetic() / n : 0; } // 2D: KE = N kB T

    function stepOnce() {
      const dt = cfg.dt;
      for (let i = 0; i < n; i++) {
        const a = ACC / SPECIES[NAMES[sp[i]]].m;
        vx[i] += 0.5 * dt * a * fx[i]; vz[i] += 0.5 * dt * a * fz[i];
        const dx = vx[i] * dt;
        xu[i] += dx;
        x[i] = ((x[i] + dx) % Lx + Lx) % Lx;
        z[i] += vz[i] * dt;
        if (z[i] < 0.3) { z[i] = 0.3; vz[i] = Math.abs(vz[i]); }
        if (z[i] > H - 0.3) { z[i] = H - 0.3; vz[i] = -Math.abs(vz[i]); }
      }
      forces();
      for (let i = 0; i < n; i++) {
        const a = ACC / SPECIES[NAMES[sp[i]]].m;
        vx[i] += 0.5 * dt * a * fx[i]; vz[i] += 0.5 * dt * a * fz[i];
      }
      const Tn = temperature();
      if (Tn > 0) {
        let lam = Math.sqrt(1 + dt / tauT * (cfg.T / Tn - 1));
        lam = Math.min(1.1, Math.max(0.9, lam));
        for (let i = 0; i < n; i++) { vx[i] *= lam; vz[i] *= lam; }
      }
      time += dt; stepCount++;
      if (microbes.length) biology();
      if (cycle.mode !== 'off' && stepCount % cycle.every === 0) cycleStep();
      if (stepCount % 50 === 0) classify();
    }

    // ---- biology: 4 H2 + CO2 -> CH4 + 2 H2O at each microbe
    function nearestOfSpecies(m, s, r) {
      let best = -1, bd = r * r;
      for (let i = 0; i < n; i++) {
        if (sp[i] !== s) continue;
        let dx = x[i] - m.x; dx -= Lx * Math.round(dx / Lx);
        const dz = z[i] - m.z, d2 = dx * dx + dz * dz;
        if (d2 < bd) { bd = d2; best = i; }
      }
      return best;
    }
    function placeNear(m, s) {
      const sg = SPECIES[NAMES[s]].sig;
      for (let t = 0; t < 30; t++) {
        const px = m.x + (rnd() - 0.5) * 10;
        const pz = m.top ? m.z - 2 - rnd() * 6 : m.z + 2 + rnd() * 6;
        const pxw = ((px % Lx) + Lx) % Lx;
        let ok = true;
        for (let i = 0; i < n; i++) {
          let dx = x[i] - pxw; dx -= Lx * Math.round(dx / Lx);
          const dz = z[i] - pz, mm = 0.75 * 0.5 * (sg + SPECIES[NAMES[sp[i]]].sig);
          if (dx * dx + dz * dz < mm * mm) { ok = false; break; }
        }
        if (ok) { add(s, pxw, pz); return true; }
      }
      return false;
    }
    function biology() {
      for (const m of microbes) {
        if (m.h2 < 4) {
          const i = nearestOfSpecies(m, IDX.H2, BIO_RC);
          if (i >= 0 && rnd() < cfg.bioRate) { remove(i); m.h2++; ledger.H2_consumed++; }
        }
        if (m.h2 >= 4 && m.co2 < 1) {
          const j = nearestOfSpecies(m, IDX.CO2, BIO_RC);
          if (j >= 0 && rnd() < cfg.bioRate * 4) { remove(j); m.co2 = 1; ledger.CO2_gas_consumed++; }
          else if (cfg.carbonateCO2 && rnd() < cfg.bioRate) { m.co2 = 1; ledger.CO2_carbonate++; }
        }
        if (m.h2 >= 4 && m.co2 >= 1) {
          m.h2 -= 4; m.co2 = 0; m.made++;
          ledger.CH4_produced++; ledger.H2O_produced += 2;
          ledger.pendingCH4++; ledger.pendingH2O += 2;
        }
        if (ledger.pendingCH4 > 0 && placeNear(m, IDX.CH4)) ledger.pendingCH4--;
        if (ledger.pendingH2O > 0 && placeNear(m, IDX.W)) ledger.pendingH2O--;
      }
    }

    // ---- storage cycle: inject H2 / withdraw gas from the pore centre
    const cycle = { mode: 'off', every: 400 };
    function centreBand() { return [H / 2 - H / 6, H / 2 + H / 6]; }
    function cycleStep() {
      const [lo, hi] = centreBand();
      if (cycle.mode === 'inject') {
        for (let t = 0; t < 20; t++) {
          const px = rnd() * Lx, pz = lo + rnd() * (hi - lo);
          let ok = true;
          for (let i = 0; i < n; i++) {
            let dx = x[i] - px; dx -= Lx * Math.round(dx / Lx);
            const dz = z[i] - pz;
            if (dx * dx + dz * dz < 9) { ok = false; break; }
          }
          if (ok) { add(IDX.H2, px, pz); ledger.injected.H2++; break; }
        }
      } else if (cycle.mode === 'withdraw') {
        const cand = [];
        for (let i = 0; i < n; i++) if (isGas(sp[i]) && !dis[i] && z[i] > lo && z[i] < hi) cand.push(i);
        if (cand.length) {
          const i = cand[Math.floor(rnd() * cand.length)];
          ledger.withdrawn[NAMES[sp[i]]]++;
          remove(i);
        }
      }
    }

    // ---- dissolved / free classification by local liquid coordination
    function classify() {
      buildCells();
      for (let i = 0; i < n; i++) {
        if (!isGas(sp[i])) { dis[i] = 0; continue; }
        let c = 0;
        forEachNeighbor(i, 6.0, j => { if (sp[j] >= 4) c++; });
        dis[i] = c >= 5 ? 1 : 0;
      }
    }
    classify();

    // ---- observables
    function counts() {
      const c = {}; NAMES.forEach(k => { c[k] = 0; });
      for (let i = 0; i < n; i++) c[NAMES[sp[i]]]++;
      return c;
    }
    function stats() {
      const c = counts();
      let h2Free = 0, h2Dis = 0, gasCentre = 0, h2Centre = 0;
      const [lo, hi] = centreBand();
      for (let i = 0; i < n; i++) {
        if (sp[i] === IDX.H2) { if (dis[i]) h2Dis++; else h2Free++; }
        if (isGas(sp[i]) && !dis[i] && z[i] > lo && z[i] < hi) {
          gasCentre++; if (sp[i] === IDX.H2) h2Centre++;
        }
      }
      const D = lateralD(IDX.H2);
      const wd = ledger.withdrawn, wtot = GASES.reduce((s, g) => s + wd[g], 0);
      return {
        time, steps: stepCount, n, T: temperature(), counts: c,
        H2_free: h2Free, H2_dissolved: h2Dis,
        H2_purity_centre: gasCentre ? h2Centre / gasCentre : null,
        P_MPa: freeGasPressure(),
        D_H2_lateral: D,
        D_water_lateral: lateralD(IDX.W),
        produced_purity: wtot ? wd.H2 / wtot : null,
        ledger: JSON.parse(JSON.stringify(ledger)),
      };
    }
    /** Reservoir-equivalent pressure: free-gas areal density in the gas region,
     *  mapped back to 3D (rho3 = rho2^1.5) and passed through Peng-Robinson. */
    function freeGasPressure() {
      const comp = {}; let nf = 0;
      for (let i = 0; i < n; i++) if (isGas(sp[i]) && !dis[i]) { comp[NAMES[sp[i]]] = (comp[NAMES[sp[i]]] || 0) + 1; nf++; }
      if (!nf) return 0;
      for (const k in comp) comp[k] /= nf;
      const rho2 = nf / (Lx * (info.gasHi - info.gasLo));
      const rho3 = Math.pow(rho2, 1.5) / (NA * 1e-30);
      return prPressure(cfg.T, rho3, comp) / 1e6;
    }
    /** Lateral (x) self-diffusion since the last MSD reset, m^2/s (1 A^2/ps = 1e-8 m^2/s). */
    function lateralD(s) {
      let msd = 0, k = 0;
      for (let i = 0; i < n; i++) if (sp[i] === s) { const d = xu[i] - x0[i]; msd += d * d; k++; }
      const tw = time - msdT0;
      return k && tw > 1 ? (msd / k) / (2 * tw) * 1e-8 : null;
    }
    function resetMSD() { for (let i = 0; i < n; i++) x0[i] = xu[i]; msdT0 = time; }
    function profiles(nb) {
      nb = nb || 40;
      const out = {}; NAMES.forEach(k => { out[k] = new Float64Array(nb); });
      const w = H / nb, area = w * Lx;
      for (let i = 0; i < n; i++) {
        const b = Math.min(nb - 1, Math.floor(z[i] / w));
        out[NAMES[sp[i]]][b] += 1 / area;
      }
      return { dz: w, data: out };
    }
    /** Element inventory including microbe stores and external sources/sinks. */
    function elements() {
      const e = { H: 0, C: 0, O: 0, N: 0, Na: 0, Cl: 0 };
      for (let i = 0; i < n; i++) { const el = SPECIES[NAMES[sp[i]]].el; for (const k in el) e[k] += el[k]; }
      for (const m of microbes) { e.H += 2 * m.h2; e.C += m.co2; e.O += 2 * m.co2; }
      // products not yet placed
      e.C += ledger.pendingCH4; e.H += 4 * ledger.pendingCH4 + 2 * ledger.pendingH2O; e.O += ledger.pendingH2O;
      // carbonate CO2 entered from outside the fluid; withdrawn/injected gas crossed the boundary
      e.C -= ledger.CO2_carbonate; e.O -= 2 * ledger.CO2_carbonate;
      for (const g of GASES) {
        const el = SPECIES[g].el, net = ledger.withdrawn[g] - ledger.injected[g];
        for (const k in el) e[k] += el[k] * net;
      }
      return e;
    }

    return {
      cfg, info, Lx, H, microbes, cycle,
      step(k) { for (let i = 0; i < (k || 1); i++) stepOnce(); },
      stats, profiles, elements, resetMSD, temperature,
      particles() { return { n, x, z, sp, dis }; },
      setCycle(mode) { cycle.mode = mode; },
    };
  }

  const api = { createSim, prDensity, prPressure, SPECIES, NAMES, GASES, DEFAULTS, ACC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UHS = api;
})(typeof window !== 'undefined' ? window : this);

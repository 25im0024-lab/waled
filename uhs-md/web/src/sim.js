/* UHS Pore Lab - 3D physics engine.
 * Molecular dynamics of H2 + cushion gas + brine in a calcite slit pore,
 * with hydrogenotrophic methanogens on the pore walls and an optional
 * injection / withdrawal cycle. Periodic in x and y; calcite walls at
 * z = 0 and z = H.
 *
 * Units: length A, time ps, mass g/mol, energy K (energy / kB).
 * Force F [K/A] gives acceleration a = 0.831446 * F / m  [A/ps^2].
 *
 * Coarse-grained teaching model: each molecule is one Lennard-Jones site and
 * water is a liquid-forming LJ bead, not a real water model. Results are
 * qualitative trends; the LAMMPS model in this folder is the quantitative tool.
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
    W:   { m: 18.015, sig: 3.10,  eps: 420.0, el: { H: 2, O: 1 },    color: '#2f7fd8', label: 'H₂O' },
    S:   { m: 58.44,  sig: 3.60,  eps: 420.0, el: { Na: 1, Cl: 1 },  color: '#d9e3ec', label: 'NaCl' },
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

  function prMix(T, comp) {
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
    return { am, bm };
  }

  /** Peng-Robinson mixture molar density [mol/m3] (vdW one-fluid, kij = 0). */
  function prDensity(T, Pa, comp) {
    const { am, bm } = prMix(T, comp);
    const A = am * Pa / (R * R * T * T), B = bm * Pa / (R * T);
    const c2 = -(1 - B), c1 = A - 3 * B * B - 2 * B, c0 = -(A * B - B * B - B * B * B);
    let z = Math.max(1, -c2) + 1; // Newton from above -> largest real root
    for (let it = 0; it < 200; it++) {
      const f = ((z + c2) * z + c1) * z + c0, d = (3 * z + 2 * c2) * z + c1, dz = f / d;
      z -= dz; if (Math.abs(dz) < 1e-12) break;
    }
    return { rho: Pa / (z * R * T), Z: z };
  }

  /** Peng-Robinson pressure [Pa] at molar density rho [mol/m3]. */
  function prPressure(T, rho, comp) {
    const { am, bm } = prMix(T, comp);
    const v = 1 / rho;
    return R * T / (v - bm) - am / (v * v + 2 * bm * v - bm * bm);
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
    film: 10,                       // brine film thickness on each wall, A
    pore: 60,                       // wall-to-wall distance, A
    L: 40,                          // periodic box length in x and y, A
    wetting: 1000,                  // water-calcite well depth, K (higher = more water-wet)
    bio: true, microbes: 8,
    bioRate: 0.004,                 // H2 uptake probability per step for an H2 inside the capture radius
    carbonateCO2: true,             // CO2 from carbonate / HCO3- when no CO2 is captured
    dt: 0.002,                      // ps
    seed: 12345,
  };

  // cross-interaction corrections (1 - k_ij) applied to sqrt(eps_i eps_j).
  // Hydrophobic gases dissolve poorly; CO2 gets a smaller k because its
  // quadrupole (absent in a one-site model) binds it to water, giving the
  // observed order CO2 >> CH4 > N2 ~ H2.
  const K_GAS_WATER = { H2: 0.45, N2: 0.47, CH4: 0.42, CO2: 0.12 };
  const K_GAS_SALT = 0.75;    // dissolved salt excludes gas (salting-out)
  const K_WATER_SALT = -0.30; // hydration: salt binds water more strongly
  const RC = 8.5;             // pair cutoff, A
  const SKIN = 1.5;           // Verlet-list skin, A
  const WALL_SIG = 3.0;       // calcite surface site size, A
  const WALL_GAS = 25.0;      // gas-wall depth = WALL_GAS * sqrt(eps_gas) K
  const W_RHO = 0.0252;       // number density of liquid W beads, 1/A^3
  const BIO_RC = 7.0;         // microbe capture radius, A
  const DIS_N = 14;           // water/salt neighbours within 6 A that make a gas molecule "dissolved"

  function mix(i, j) {
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
      let u = 0;
      while (u === 0) u = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
    };
    const L = cfg.L, H = cfg.pore;
    const nsp = NAMES.length;
    const wrap = v => ((v % L) + L) % L;
    const mi = d => d - L * Math.round(d / L);

    // pair tables
    const E4 = new Float64Array(nsp * nsp), S2 = new Float64Array(nsp * nsp), ESH = new Float64Array(nsp * nsp);
    for (let i = 0; i < nsp; i++) for (let j = 0; j < nsp; j++) {
      const p = mix(i, j);
      E4[i * nsp + j] = 4 * p.eps;
      S2[i * nsp + j] = p.sig * p.sig;
      const sr6 = Math.pow(p.sig / RC, 6);
      ESH[i * nsp + j] = 4 * p.eps * (sr6 * sr6 - sr6);
    }
    const WE = new Float64Array(nsp), WS = new Float64Array(nsp);
    for (let s = 0; s < nsp; s++) { const w = wallParams(s, cfg.wetting); WE[s] = w.eps; WS[s] = w.sig; }

    // particle storage
    let cap = 4096, n = 0;
    let x, y, z, vx, vy, vz, fx, fy, fz, xu, yu, x0, y0, sp, dis;
    (function alloc() {
      x = new Float64Array(cap); y = new Float64Array(cap); z = new Float64Array(cap);
      vx = new Float64Array(cap); vy = new Float64Array(cap); vz = new Float64Array(cap);
      fx = new Float64Array(cap); fy = new Float64Array(cap); fz = new Float64Array(cap);
      xu = new Float64Array(cap); yu = new Float64Array(cap); x0 = new Float64Array(cap); y0 = new Float64Array(cap);
      sp = new Int8Array(cap); dis = new Uint8Array(cap);
    })();
    function grow() {
      cap *= 2;
      const g = (A, T) => { const B = new T(cap); B.set(A); return B; };
      x = g(x, Float64Array); y = g(y, Float64Array); z = g(z, Float64Array);
      vx = g(vx, Float64Array); vy = g(vy, Float64Array); vz = g(vz, Float64Array);
      fx = g(fx, Float64Array); fy = g(fy, Float64Array); fz = g(fz, Float64Array);
      xu = g(xu, Float64Array); yu = g(yu, Float64Array); x0 = g(x0, Float64Array); y0 = g(y0, Float64Array);
      sp = g(sp, Int8Array); dis = g(dis, Uint8Array);
    }
    function add(s, px, py, pz) {
      invalidateList();
      if (n >= cap) grow();
      x[n] = wrap(px); y[n] = wrap(py); z[n] = pz;
      xu[n] = x0[n] = x[n]; yu[n] = y0[n] = y[n];
      const v = Math.sqrt(cfg.T * ACC / SPECIES[NAMES[s]].m);
      vx[n] = v * gauss(); vy[n] = v * gauss(); vz[n] = v * gauss();
      fx[n] = fy[n] = fz[n] = 0; sp[n] = s; dis[n] = 0;
      return n++;
    }
    function remove(i) {
      invalidateList();
      n--;
      if (i !== n) {
        x[i] = x[n]; y[i] = y[n]; z[i] = z[n]; vx[i] = vx[n]; vy[i] = vy[n]; vz[i] = vz[n];
        fx[i] = fx[n]; fy[i] = fy[n]; fz[i] = fz[n]; xu[i] = xu[n]; yu[i] = yu[n]; x0[i] = x0[n]; y0[i] = y0[n];
        sp[i] = sp[n]; dis[i] = dis[n];
      }
    }

    // ---- cell list (periodic in x, y; open in z)
    const nc = Math.max(3, Math.floor(L / RC)), ncz = Math.max(3, Math.floor(H / RC));
    const cs = L / nc, csz = H / ncz;
    const head = new Int32Array(nc * nc * ncz);
    let next = new Int32Array(cap);
    const cellOf = i => {
      const cx = Math.min(nc - 1, Math.floor(x[i] / cs)), cy = Math.min(nc - 1, Math.floor(y[i] / cs));
      const cz = Math.min(ncz - 1, Math.max(0, Math.floor(z[i] / csz)));
      return [cx, cy, cz];
    };
    function buildCells() {
      if (next.length < cap) next = new Int32Array(cap);
      head.fill(-1);
      for (let i = 0; i < n; i++) {
        const [cx, cy, cz] = cellOf(i);
        const c = (cz * nc + cy) * nc + cx;
        next[i] = head[c]; head[c] = i;
      }
    }
    // 13 forward neighbour offsets for the half-shell sweep
    const HALF = [];
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dz > 0 || (dz === 0 && dy > 0) || (dz === 0 && dy === 0 && dx > 0)) HALF.push([dx, dy, dz]);
    }
    function forEachNeighbor(i, rmax, fn) {
      const [cx, cy, cz] = cellOf(i), r2 = rmax * rmax;
      for (let dz = -1; dz <= 1; dz++) {
        const kz = cz + dz; if (kz < 0 || kz >= ncz) continue;
        for (let dy = -1; dy <= 1; dy++) {
          const ky = (cy + dy + nc) % nc;
          for (let dx = -1; dx <= 1; dx++) {
            const kx = (cx + dx + nc) % nc;
            for (let j = head[(kz * nc + ky) * nc + kx]; j >= 0; j = next[j]) {
              if (j === i) continue;
              const ddx = mi(x[j] - x[i]), ddy = mi(y[j] - y[i]), ddz = z[j] - z[i];
              const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
              if (d2 < r2) fn(j, d2);
            }
          }
        }
      }
    }

    // ---- forces with a Verlet pair list (rebuilt when any atom moved > SKIN/2)
    const st = { pe: 0 };
    const WCUT = 14.0;
    const RL2 = (RC + SKIN) * (RC + SKIN), RC2 = RC * RC;
    let plist = new Int32Array(1 << 16), npairs = 0;
    let xl = new Float64Array(cap), yl = new Float64Array(cap), zl = new Float64Array(cap), listN = -1;
    function buildList() {
      buildCells();
      if (xl.length < cap) { xl = new Float64Array(cap); yl = new Float64Array(cap); zl = new Float64Array(cap); }
      npairs = 0;
      for (let cz = 0; cz < ncz; cz++) for (let cy = 0; cy < nc; cy++) for (let cx = 0; cx < nc; cx++) {
        const c = (cz * nc + cy) * nc + cx;
        for (let i = head[c]; i >= 0; i = next[i]) {
          for (let h = -1; h < HALF.length; h++) {
            let j;
            if (h < 0) j = next[i];
            else {
              const o = HALF[h], kz = cz + o[2]; if (kz < 0 || kz >= ncz) continue;
              j = head[(kz * nc + (cy + o[1] + nc) % nc) * nc + (cx + o[0] + nc) % nc];
            }
            for (; j >= 0; j = next[j]) {
              const dx = mi(x[j] - x[i]), dy = mi(y[j] - y[i]), dz = z[j] - z[i];
              if (dx * dx + dy * dy + dz * dz < RL2) {
                if (2 * npairs + 2 > plist.length) { const b = new Int32Array(plist.length * 2); b.set(plist); plist = b; }
                plist[2 * npairs] = i; plist[2 * npairs + 1] = j; npairs++;
              }
            }
          }
        }
      }
      for (let i = 0; i < n; i++) { xl[i] = xu[i]; yl[i] = yu[i]; zl[i] = z[i]; }
      listN = n;
    }
    function listStale() {
      if (listN !== n) return true;
      const lim = 0.25 * SKIN * SKIN;
      for (let i = 0; i < n; i++) {
        const dx = xu[i] - xl[i], dy = yu[i] - yl[i], dz = z[i] - zl[i];
        if (dx * dx + dy * dy + dz * dz > lim) return true;
      }
      return false;
    }
    function invalidateList() { listN = -1; }
    function forces() {
      if (listStale()) buildList();
      fx.fill(0, 0, n); fy.fill(0, 0, n); fz.fill(0, 0, n);
      let pe = 0;
      for (let p = 0; p < npairs; p++) {
        const i = plist[2 * p], j = plist[2 * p + 1];
        let dx = x[j] - x[i]; dx -= L * Math.round(dx / L);
        let dy = y[j] - y[i]; dy -= L * Math.round(dy / L);
        const dz = z[j] - z[i];
        let r2 = dx * dx + dy * dy + dz * dz;
        if (r2 >= RC2) continue;
        const t = sp[i] * nsp + sp[j], s2 = S2[t];
        if (r2 < 0.36 * s2) r2 = 0.36 * s2;  // soft floor for start-up overlaps
        const sr2 = s2 / r2, sr6 = sr2 * sr2 * sr2, e4 = E4[t];
        const ff = e4 * (12 * sr6 * sr6 - 6 * sr6) / r2;
        fx[i] -= ff * dx; fy[i] -= ff * dy; fz[i] -= ff * dz;
        fx[j] += ff * dx; fy[j] += ff * dy; fz[j] += ff * dz;
        pe += e4 * (sr6 * sr6 - sr6) - ESH[t];
      }
      // 9-3 walls (integrated LJ half-space), scaled so the well depth is eps
      const k93 = 1 / 1.0541;
      for (let i = 0; i < n; i++) {
        const s = sp[i], e = WE[s] * k93, sg = WS[s];
        for (let w = 0; w < 2; w++) {
          let d = w === 0 ? z[i] : H - z[i];
          if (d > WCUT) continue;
          if (d < 0.6 * sg) d = 0.6 * sg;
          const q = sg / d, q3 = q * q * q, q9 = q3 * q3 * q3;
          pe += e * ((2 / 15) * q9 - q3);
          const f = e * (1.2 * q9 - 3 * q3) / d;   // -dU/dd, pushes away from the wall when > 0
          if (w === 0) fz[i] += f; else fz[i] -= f;
        }
      }
      st.pe = pe;
    }

    // ---- microbes and bookkeeping
    const microbes = [];
    const ledger = {
      H2_consumed: 0, CO2_gas_consumed: 0, CO2_carbonate: 0, CH4_produced: 0, H2O_produced: 0,
      pendingCH4: 0, pendingH2O: 0, injected: {}, withdrawn: {},
    };
    GASES.forEach(g => { ledger.injected[g] = 0; ledger.withdrawn[g] = 0; });

    function overlapFree(px, py, pz, sg, factor) {
      for (let i = 0; i < n; i++) {
        const dx = mi(x[i] - px), dy = mi(y[i] - py), dz = z[i] - pz;
        const m = factor * 0.5 * (sg + SPECIES[NAMES[sp[i]]].sig);
        if (dx * dx + dy * dy + dz * dz < m * m) return false;
      }
      return true;
    }

    // ---- build
    function build() {
      const film = Math.min(cfg.film, H / 2 - 8);
      const gasLo = film + 2, gasHi = H - film - 2;
      const comp = { H2: 1 - cfg.xCushion };
      if (cfg.xCushion > 0) comp[cfg.cushion] = cfg.xCushion;
      const eos = prDensity(cfg.T, cfg.P_MPa * 1e6, comp);
      const rho3 = eos.rho * NA * 1e-30;
      const nGas = Math.round(rho3 * L * L * (gasHi - gasLo));
      const counts = {};
      for (const k of Object.keys(comp)) counts[k] = Math.round(comp[k] * nGas);
      const nW = film > 0 ? Math.round(W_RHO * L * L * film * 2) : 0;
      const nS = Math.round(cfg.molality * 0.018015 * nW);

      // brine on a jittered lattice in each film, gas placed randomly without overlap
      function lattice(zlo, zhi, count) {
        if (count <= 0) return [];
        const vol = L * L * (zhi - zlo), a = Math.cbrt(vol / count);
        const nx = Math.max(1, Math.round(L / a)), nz = Math.max(1, Math.ceil(count / (nx * nx)));
        const pts = [];
        for (let k = 0; k < nz; k++) for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++)
          pts.push([(i + 0.5) * L / nx, (j + 0.5) * L / nx, zlo + (k + 0.5) * (zhi - zlo) / nz]);
        for (let i = pts.length - 1; i > 0; i--) { const r = Math.floor(rnd() * (i + 1)); [pts[i], pts[r]] = [pts[r], pts[i]]; }
        return pts.slice(0, count);
      }
      const half = Math.ceil((nW + nS) / 2);
      const sites = lattice(1.6, film + 0.8, half).concat(lattice(H - film - 0.8, H - 1.6, nW + nS - half));
      const kinds = sites.map((_, i) => (i < nS ? IDX.S : IDX.W));
      for (let i = kinds.length - 1; i > 0; i--) { const r = Math.floor(rnd() * (i + 1)); [kinds[i], kinds[r]] = [kinds[r], kinds[i]]; }
      sites.forEach((p, i) => add(kinds[i], p[0], p[1], p[2]));
      for (const k of Object.keys(counts)) {
        const s = IDX[k], sg = SPECIES[k].sig;
        for (let c = 0; c < counts[k]; c++) {
          for (let t = 0; t < 400; t++) {
            const px = rnd() * L, py = rnd() * L, pz = gasLo + 1.5 + rnd() * (gasHi - gasLo - 3);
            if (overlapFree(px, py, pz, sg, 0.85)) { add(s, px, py, pz); break; }
          }
        }
      }
      if (cfg.bio && cfg.microbes > 0) {
        const per = Math.ceil(cfg.microbes / 2), g = Math.ceil(Math.sqrt(per));
        for (let m = 0; m < cfg.microbes; m++) {
          const top = m % 2 === 1, k = Math.floor(m / 2);
          microbes.push({ x: ((k % g) + 0.5) * L / g, y: (Math.floor(k / g) + 0.5) * L / g + (top ? L / (2 * g) : 0),
            z: top ? H - 3.5 : 3.5, top, h2: 0, co2: 0, made: 0 });
        }
      }
      return { eos, counts, nW, nS, film, gasLo, gasHi };
    }

    function relax(steps) {
      for (let k = 0; k < steps; k++) {
        forces();
        for (let i = 0; i < n; i++) {
          let dx = 0.002 * fx[i], dy = 0.002 * fy[i], dz = 0.002 * fz[i];
          const d = Math.hypot(dx, dy, dz);
          if (d > 0.08) { dx *= 0.08 / d; dy *= 0.08 / d; dz *= 0.08 / d; }
          x[i] = wrap(x[i] + dx); y[i] = wrap(y[i] + dy); z[i] = Math.min(H - 0.5, Math.max(0.5, z[i] + dz));
          xu[i] = x0[i] = x[i]; yu[i] = y0[i] = y[i];
        }
      }
    }

    const info = build();
    relax(300);
    forces();

    let time = 0, stepCount = 0, msdT0 = 0;
    const tauT = 0.2; // ps, Berendsen coupling

    function temperature() {
      if (!n) return 0;
      let k = 0;
      for (let i = 0; i < n; i++) k += SPECIES[NAMES[sp[i]]].m * (vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]);
      return k / ACC / (3 * n); // 3D: KE = 3/2 N kB T
    }

    function stepOnce() {
      const dt = cfg.dt;
      for (let i = 0; i < n; i++) {
        const a = 0.5 * dt * ACC / SPECIES[NAMES[sp[i]]].m;
        vx[i] += a * fx[i]; vy[i] += a * fy[i]; vz[i] += a * fz[i];
        const dx = vx[i] * dt, dy = vy[i] * dt;
        xu[i] += dx; yu[i] += dy;
        x[i] = wrap(x[i] + dx); y[i] = wrap(y[i] + dy); z[i] += vz[i] * dt;
        if (z[i] < 0.3) { z[i] = 0.3; vz[i] = Math.abs(vz[i]); }
        if (z[i] > H - 0.3) { z[i] = H - 0.3; vz[i] = -Math.abs(vz[i]); }
      }
      forces();
      for (let i = 0; i < n; i++) {
        const a = 0.5 * dt * ACC / SPECIES[NAMES[sp[i]]].m;
        vx[i] += a * fx[i]; vy[i] += a * fy[i]; vz[i] += a * fz[i];
      }
      const Tn = temperature();
      if (Tn > 0) {
        const lam = Math.min(1.1, Math.max(0.9, Math.sqrt(1 + dt / tauT * (cfg.T / Tn - 1))));
        for (let i = 0; i < n; i++) { vx[i] *= lam; vy[i] *= lam; vz[i] *= lam; }
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
        const dx = mi(x[i] - m.x), dy = mi(y[i] - m.y), dz = z[i] - m.z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bd) { bd = d2; best = i; }
      }
      return best;
    }
    function placeNear(m, s) {
      const sg = SPECIES[NAMES[s]].sig;
      for (let t = 0; t < 30; t++) {
        const px = m.x + (rnd() - 0.5) * 10, py = m.y + (rnd() - 0.5) * 10;
        const pz = m.top ? m.z - 2 - rnd() * 6 : m.z + 2 + rnd() * 6;
        if (overlapFree(wrap(px), wrap(py), pz, sg, 0.75)) { add(s, px, py, pz); return true; }
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
    const cycle = { mode: 'off', every: 300 };
    function centreBand() { return [H / 2 - H / 6, H / 2 + H / 6]; }
    function cycleStep() {
      const [lo, hi] = centreBand();
      if (cycle.mode === 'inject') {
        for (let t = 0; t < 20; t++) {
          const px = rnd() * L, py = rnd() * L, pz = lo + rnd() * (hi - lo);
          if (overlapFree(px, py, pz, SPECIES.H2.sig, 0.9)) { add(IDX.H2, px, py, pz); ledger.injected.H2++; break; }
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
        dis[i] = c >= DIS_N ? 1 : 0;
      }
    }
    classify();

    // ---- observables
    function counts() {
      const c = {}; NAMES.forEach(k => { c[k] = 0; });
      for (let i = 0; i < n; i++) c[NAMES[sp[i]]]++;
      return c;
    }
    function lateralD(s) {
      let msd = 0, k = 0;
      for (let i = 0; i < n; i++) if (sp[i] === s) { const dx = xu[i] - x0[i], dy = yu[i] - y0[i]; msd += dx * dx + dy * dy; k++; }
      const tw = time - msdT0;
      return k && tw > 1 ? (msd / k) / (4 * tw) * 1e-8 : null; // 2D lateral, m^2/s
    }
    /** Reservoir-equivalent pressure: free-gas density in the gas region through Peng-Robinson. */
    function freeGasPressure() {
      const comp = {}; let nf = 0;
      for (let i = 0; i < n; i++) if (isGas(sp[i]) && !dis[i]) { comp[NAMES[sp[i]]] = (comp[NAMES[sp[i]]] || 0) + 1; nf++; }
      if (!nf) return 0;
      for (const k in comp) comp[k] /= nf;
      const rho = nf / (L * L * (info.gasHi - info.gasLo)) / (NA * 1e-30);
      return prPressure(cfg.T, rho, comp) / 1e6;
    }
    function stats() {
      const c = counts();
      let h2Free = 0, h2Dis = 0, gasCentre = 0, h2Centre = 0;
      const [lo, hi] = centreBand();
      for (let i = 0; i < n; i++) {
        if (sp[i] === IDX.H2) { if (dis[i]) h2Dis++; else h2Free++; }
        if (isGas(sp[i]) && !dis[i] && z[i] > lo && z[i] < hi) { gasCentre++; if (sp[i] === IDX.H2) h2Centre++; }
      }
      const wd = ledger.withdrawn, wtot = GASES.reduce((s, g) => s + wd[g], 0);
      return {
        time, steps: stepCount, n, T: temperature(), counts: c,
        H2_free: h2Free, H2_dissolved: h2Dis,
        H2_purity_centre: gasCentre ? h2Centre / gasCentre : null,
        P_MPa: freeGasPressure(),
        D_H2_lateral: lateralD(IDX.H2),
        D_water_lateral: lateralD(IDX.W),
        produced_purity: wtot ? wd.H2 / wtot : null,
        ledger: JSON.parse(JSON.stringify(ledger)),
      };
    }
    function resetMSD() { for (let i = 0; i < n; i++) { x0[i] = xu[i]; y0[i] = yu[i]; } msdT0 = time; }
    function profiles(nb) {
      nb = nb || 40;
      const out = {}; NAMES.forEach(k => { out[k] = new Float64Array(nb); });
      const w = H / nb, vol = w * L * L;
      for (let i = 0; i < n; i++) out[NAMES[sp[i]]][Math.min(nb - 1, Math.floor(z[i] / w))] += 1 / vol;
      return { dz: w, data: out };
    }
    /** Element inventory including microbe stores and external sources/sinks. */
    function elements() {
      const e = { H: 0, C: 0, O: 0, N: 0, Na: 0, Cl: 0 };
      for (let i = 0; i < n; i++) { const el = SPECIES[NAMES[sp[i]]].el; for (const k in el) e[k] += el[k]; }
      for (const m of microbes) { e.H += 2 * m.h2; e.C += m.co2; e.O += 2 * m.co2; }
      e.C += ledger.pendingCH4; e.H += 4 * ledger.pendingCH4 + 2 * ledger.pendingH2O; e.O += ledger.pendingH2O;
      e.C -= ledger.CO2_carbonate; e.O -= 2 * ledger.CO2_carbonate;
      for (const g of GASES) {
        const el = SPECIES[g].el, net = ledger.withdrawn[g] - ledger.injected[g];
        for (const k in el) e[k] += el[k] * net;
      }
      return e;
    }

    return {
      cfg, info, L, H, microbes, cycle,
      step(k) { for (let i = 0; i < (k || 1); i++) stepOnce(); },
      stats, profiles, elements, resetMSD, temperature,
      particles() { return { n, x, y, z, sp, dis }; },
      setCycle(mode) { cycle.mode = mode; },
    };
  }

  const api = { createSim, prDensity, prPressure, SPECIES, NAMES, GASES, DEFAULTS, ACC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UHS = api;
})(typeof window !== 'undefined' ? window : this);

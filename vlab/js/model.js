/* Virtual Lab — science core (no DOM, no THREE). Loaded by index.html as a classic script
   (global VLabModel) and by the Node tests through module.exports.

   Two parts:
   1. Flame tests: emission lines, flame colours, cobalt-glass filter, carry-over on the wire loop.
   2. NaOA / KCl / guar gel: an ILLUSTRATIVE model that reproduces established trends
      (Cates scaling, salt screening, Arrhenius, hydrocarbon and oxidative breaking, Stokes/drag settling).
      Its reference numbers are placeholders, not measurements: the app labels every number it shows
      from here as illustrative, and uses the user's own FracGel Lab data when it exists. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.VLabModel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const R = 8.314462618;   // J/(mol·K)
  const G = 9.80665;       // m/s²
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  /* ------------------------------------------------------------------ colour */
  /* Visible wavelength → linear-ish RGB (0..1). Dan Bruton's approximation; good enough for display. */
  function wavelengthToRGB(nm) {
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; }
    else if (nm >= 645 && nm <= 780) { r = 1; }
    const f = nm < 380 || nm > 780 ? 0 : nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (780 - nm) / 80 : 1;
    return [r * f, g * f, b * f];
  }
  const hexToRGB = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const rgbToHex = c => '#' + c.map(v => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('');

  /* ------------------------------------------------------------------ flame tests */
  /* Lines in nm. kind 'atomic' = sharp atomic line (positions are textbook values, high confidence);
     kind 'band' = molecular emission band (MOH, CuCl…): position approximate, width w in nm (medium confidence).
     flame = colour the eye reports; bright = relative emission strength used when salts mix on the loop
     (Na is by far the most intense, which is why traces of Na mask other colours). */
  const SALTS = {
    LiCl:  { cation: 'Li', powder: '#f4f4f0', flame: '#ff2a4a', bright: 0.7,
      lines: [{ nm: 670.8, I: 1 }, { nm: 610.4, I: 0.12 }] },
    NaCl:  { cation: 'Na', powder: '#f7f7f4', flame: '#ffb000', bright: 3,
      lines: [{ nm: 589.0, I: 1 }, { nm: 589.6, I: 0.55 }] },
    KCl:   { cation: 'K', powder: '#f5f5f2', flame: '#c890ff', bright: 0.3,
      lines: [{ nm: 766.5, I: 1 }, { nm: 769.9, I: 0.7 }, { nm: 404.4, I: 0.35 }, { nm: 404.7, I: 0.2 }] },
    CaCl2: { cation: 'Ca', powder: '#f2f2ee', flame: '#ff6a1c', bright: 0.6,
      lines: [{ nm: 622, I: 1, kind: 'band', w: 10 }, { nm: 554, I: 0.55, kind: 'band', w: 8 }, { nm: 422.7, I: 0.25 }] },
    SrCl2: { cation: 'Sr', powder: '#f3f3ef', flame: '#ff1236', bright: 0.7,
      lines: [{ nm: 682, I: 1, kind: 'band', w: 12 }, { nm: 606, I: 0.7, kind: 'band', w: 8 }, { nm: 460.7, I: 0.3 }] },
    CuCl2: { cation: 'Cu', powder: '#3fb8a0', flame: '#2fd7b4', bright: 0.6,
      lines: [{ nm: 435, I: 0.9, kind: 'band', w: 22 }, { nm: 510.6, I: 0.6 }, { nm: 515.3, I: 0.5 }, { nm: 521.8, I: 0.7 }] },
    BaCl2: { cation: 'Ba', powder: '#f4f4f0', flame: '#a6ff5a', bright: 0.55,
      lines: [{ nm: 553.5, I: 1 }, { nm: 513, I: 0.7, kind: 'band', w: 8 }, { nm: 524, I: 0.6, kind: 'band', w: 8 }] },
  };

  /* Cobalt-blue glass: passes blue/violet and deep red, blocks the yellow Na D lines. Approximate curve. */
  function cobaltT(nm) {
    if (nm < 480) return 0.75;
    if (nm < 520) return 0.75 - 0.73 * (nm - 480) / 40;
    if (nm < 660) return 0.02;
    if (nm < 720) return 0.02 + 0.58 * (nm - 660) / 60;
    return 0.7;
  }

  /* Emission from what is on the loop. load = { NaCl: 1, KCl: 0.6, ... } (relative amounts).
     Returns the line list (scaled), the colour the eye sees, and the dominant cation. */
  function flameEmission(load, opts) {
    const cobalt = !!(opts && opts.cobalt);
    const lines = [];
    let rgb = [0, 0, 0], wsum = 0, best = null, bestW = 0;
    for (const [salt, amt] of Object.entries(load || {})) {
      const s = SALTS[salt]; if (!s || !(amt > 0)) continue;
      const w = amt * s.bright;
      for (const l of s.lines) lines.push({ salt, nm: l.nm, I: l.I * w * (cobalt ? cobaltT(l.nm) : 1), kind: l.kind || 'atomic', w: l.w || 0 });
      let c;
      if (cobalt) { // what passes the glass, from the lines themselves
        c = [0, 0, 0]; let tot = 0;
        for (const l of s.lines) { const t = cobaltT(l.nm) * l.I, lc = wavelengthToRGB(l.nm); c = c.map((v, i) => v + lc[i] * t); tot += l.I; }
        c = c.map(v => v / tot);
      } else c = hexToRGB(s.flame);
      const cw = cobalt ? w * 2.2 : w;
      rgb = rgb.map((v, i) => v + c[i] * cw); wsum += cw;
      if (w > bestW) { bestW = w; best = s.cation; }
    }
    if (!wsum) return { lines: [], color: null, strength: 0, dominant: null };
    const mx = Math.max(...lines.map(l => l.I), 1e-9);
    lines.forEach(l => { l.I /= mx; });
    const col = rgb.map(v => v / wsum);
    const strength = clamp(wsum / (cobalt ? 1.2 : 0.9), 0, 1);
    return { lines, color: rgbToHex(col.map(v => v / Math.max(...col, 1e-6))), strength, dominant: best };
  }

  /* Wire-loop state machine: dipping adds salt, heating burns it off slowly, HCl + flame cleans. */
  function newLoop() { return { load: {}, wet: false }; }
  function dipLoop(loop, salt, naTrace) {
    for (const k of Object.keys(loop.load)) loop.load[k] *= 0.7; // some old salt dissolves into the new dish
    loop.load[salt] = (loop.load[salt] || 0) + 1;
    if (naTrace) loop.load.NaCl = (loop.load.NaCl || 0) + 0.1; // real salts and fingers carry traces of Na
    loop.wet = false;
    return loop;
  }
  function dipHCl(loop) { for (const k of Object.keys(loop.load)) loop.load[k] *= 0.35; loop.wet = true; return loop; }
  function heatLoop(loop, dt) {
    const k = loop.wet ? 1.2 : 0.18; // chlorides formed by HCl are volatile: wet loop cleans fast
    for (const s of Object.keys(loop.load)) { loop.load[s] *= Math.exp(-k * dt); if (loop.load[s] < 0.01) delete loop.load[s]; }
    return loop;
  }
  const loopClean = loop => Object.values(loop.load).every(v => v < 0.03);

  /* ------------------------------------------------------------------ gel: properties of the liquid */
  const MW = { NaOA: 304.44, KCl: 74.55 };
  const CMC_NAOA_mM = 1.0;          // order of magnitude (~1 mM at 25 °C); exact value depends on pH, T, purity
  const toMM = (gPer100mL, mw) => gPer100mL * 10 / mw * 1000;

  /* Water viscosity, Vogel equation (Pa·s), T in °C. */
  const waterVisc = tC => 2.414e-5 * Math.pow(10, 247.8 / (tC + 273.15 - 140));

  // Illustrative reference values (placeholders, NOT data) at NaOA 8 g, KCl 1 g per 100 mL water, 25 °C.
  const REF = {
    naoa: 8, G0: 30, tau: 1.5,            // Pa, s
    EaWLM: 120e3,                          // J/mol, typical order for WLM relaxation (often 100–300 kJ/mol)
    EscLen: 60e3,                          // J/mol, used only for the drawn worm length L ~ exp(Esc/2RT)
    guarIV: 14, MHa: 0.73,                 // dL/g intrinsic viscosity, Mark–Houwink exponent
    EaGuar: 10e3,                          // J/mol on top of the solvent
    hydrTau: 600,                          // s, guar hydration time constant (grade-dependent)
    apsK80: 0.0231, EaAPS: 140e3,          // per (g/100 mL)·s at 80 °C; Ea of persulfate decomposition order
    hcTau: 240,                            // s, contact/mixing time for hydrocarbon uptake
  };

  /* Salt screening: worms need K⁺ to screen the oleate head groups; very high salt lowers the
     viscosity again (salt curve). The shape is generic; where the peak sits for NaOA/KCl is not known here.
     The surfactant's own Na⁺ counts with an assumed free fraction ALPHA (assumption, not a measured value). */
  const ALPHA = 0.1;
  function saltFactor(kclMM, naoaMM) {
    const f = s => { const x = s / 60; return x * x / (1 + x * x) * Math.exp(-s / 600); };
    const eff = (k, n) => Math.max(0, k) + ALPHA * Math.max(0, n);
    return f(eff(kclMM, naoaMM || 0)) / f(eff(toMM(1, MW.KCl), toMM(REF.naoa, MW.NaOA)));
  }
  /* exp(Ea/R·(1/T − 1/T0)): factor for a viscosity or relaxation time; its inverse scales a rate constant. */
  const arrh = (Ea, tC, t0 = 25) => Math.exp(Ea / R * (1 / (tC + 273.15) - 1 / (t0 + 273.15)));

  /* Gel state: { water (mL), naoa, kcl, guar (g per 100 mL water), T (°C), hydr (0..1), hcB (0..1),
     guarM (remaining fraction of guar molecular weight, 0..1) } */
  function wlmParams(st) {
    const c = st.naoa || 0;
    if (c <= 0 || toMM(c, MW.NaOA) < CMC_NAOA_mM) return { G0: 0, tau: 0, eta0: 0, fs: 0 };
    const fs = saltFactor(toMM(st.kcl || 0, MW.KCl), toMM(c, MW.NaOA));
    const b = clamp(st.hcB || 0, 0, 1);
    const G0 = REF.G0 * Math.pow(c / REF.naoa, 2.25) * clamp(fs, 0, 1.5) * Math.pow(1 - b, 2);
    const tau = REF.tau * Math.pow(c / REF.naoa, 1.25) * Math.pow(clamp(fs, 0, 1.5), 3) * arrh(REF.EaWLM, st.T ?? 25) * Math.pow(1 - b, 3);
    return { G0, tau, eta0: G0 * tau, fs };
  }

  /* Morris et al. (1981) master curve for random-coil polysaccharides: slope ~1.4 below c[η]≈4, ~3.3 above. */
  function etaSp(cEta) {
    if (cEta <= 0) return 0;
    return cEta < 4 ? 1.43 * Math.pow(cEta, 1.4) : 10 * Math.pow(cEta / 4, 3.3);
  }
  function guarParams(st) {
    const m = clamp(st.guarM ?? 1, 1e-4, 1);
    const cEta = (st.guar || 0) * clamp(st.hydr ?? 1, 0, 1) * REF.guarIV * Math.pow(m, REF.MHa);
    const mu = waterVisc(st.T ?? 25);
    const sp = etaSp(cEta) * arrh(REF.EaGuar, st.T ?? 25);
    const lam = 0.01 * Math.pow(Math.max(cEta, 0.01) / 4, 2.5);
    return { cEta, eta0: mu * sp, lam }; // eta0 = polymer contribution only (solvent excluded)
  }

  /* η(γ̇) of the mixture, Pa·s. WLM: η0/(1+τγ̇) (stress plateau ~G0); guar: Cross model; plus solvent.
     No synergy term: the model adds the two networks. Synergy is what the measurements decide. */
  function viscosity(st, rate) {
    const w = wlmParams(st), g = guarParams(st), mu = waterVisc(st.T ?? 25);
    const ew = w.eta0 / (1 + w.tau * rate);
    const eg = g.eta0 / (1 + Math.pow(g.lam * rate, 0.8));
    return mu + ew + eg;
  }

  /* G′, G″ for the oscillatory panel: WLM single Maxwell mode + guar as a short Maxwell mode + solvent. */
  function moduli(st, w) {
    const a = wlmParams(st), g = guarParams(st), mu = waterVisc(st.T ?? 25);
    const m = (G0, tau) => { const x = w * tau, d = 1 + x * x; return [G0 * x * x / d, G0 * x / d]; };
    const [p1, q1] = a.tau > 0 ? m(a.G0, a.tau) : [0, 0];
    const gG = g.lam > 0 ? g.eta0 / g.lam : 0;
    const [p2, q2] = gG > 0 ? m(gG, g.lam) : [0, 0];
    return { Gp: p1 + p2, Gpp: q1 + q2 + mu * w };
  }

  /* Time step for the processes that need time: guar hydration, hydrocarbon uptake, persulfate scission. */
  function stepGel(st, dt) {
    if ((st.guar || 0) > 0 && (st.water || 0) > 0) st.hydr = 1 - (1 - (st.hydr || 0)) * Math.exp(-dt / REF.hydrTau * (st.stir ? 1 : 0.35));
    if ((st.hc || 0) > 0 && (st.naoa || 0) > 0) {
      const target = clamp(st.hc / (0.5 * st.naoa), 0, 1);          // mL hydrocarbon per 100 mL
      st.hcB = target - (target - (st.hcB || 0)) * Math.exp(-dt / REF.hcTau * (st.stir ? 1 : 0.3));
    }
    if ((st.aps || 0) > 0 && (st.guar || 0) > 0) {
      const k = REF.apsK80 / arrh(REF.EaAPS, st.T ?? 25, 80) * st.aps; // rate rises with T
      st.guarM = (st.guarM ?? 1) * Math.exp(-k * dt);
    }
    return st;
  }

  /* Terminal velocity of a sphere (m/s) in a shear-thinning fluid: iterate γ̇ ≈ 2v/d, η(γ̇),
     Schiller–Naumann drag. Sign follows Δρ (negative = rises). */
  function settling(dmm, rhoP, rhoF, etaAt) {
    const d = dmm / 1000, dr = (rhoP - rhoF) * 1000, rf = rhoF * 1000;
    if (!dr) return { v: 0, Re: 0, eta: etaAt(1e-3) };
    let v = 1e-4, eta = etaAt(1e-3), Re = 0;
    for (let i = 0; i < 80; i++) {
      eta = etaAt(Math.max(2 * v / d, 1e-6));
      Re = rf * v * d / eta;
      const Cd = Re < 1000 ? 24 / Math.max(Re, 1e-12) * (1 + 0.15 * Math.pow(Re, 0.687)) : 0.44;
      const vn = Math.sqrt(4 * G * d * Math.abs(dr) / (3 * rf * Cd));
      v = Math.sqrt(v * vn);
    }
    return { v: Math.sign(dr) * v, Re, eta };
  }

  /* What the nano view should draw. Counts are for the schematic only. */
  function microState(st) {
    const out = { monomers: 0, spheres: 0, worms: 0, wormLen: 0, droplets: 0, guar: 0, guarLen: 0, guarPieces: 1, guarCoil: 1, phase: 'water' };
    const c = st.naoa || 0;
    if (c > 0) {
      const mm = toMM(c, MW.NaOA), fs = saltFactor(toMM(st.kcl || 0, MW.KCl), mm), b = clamp(st.hcB || 0, 0, 1);
      out.monomers = 14;
      if (mm >= CMC_NAOA_mM) {
        const len = clamp(fs, 0, 1.3) * Math.exp(REF.EscLen / 2 / R * (1 / ((st.T ?? 25) + 273.15) - 1 / 298.15)) * (1 - b);
        out.wormLen = Math.round(clamp(3 + 34 * len, 3, 44));
        const n = Math.round(6 + c * 1.6);
        if (out.wormLen <= 5) { out.spheres = n * 3; out.phase = 'spheres'; }
        else { out.worms = n; out.phase = out.wormLen > 18 ? 'entangled' : 'rods'; }
        if (b > 0.05) { out.droplets = Math.round(n * 2.5 * b); if (b > 0.7) { out.worms = 0; out.spheres = 0; out.phase = 'droplets'; } }
      } else out.phase = 'monomers';
    }
    if ((st.guar || 0) > 0) {
      const m = clamp(st.guarM ?? 1, 0, 1);
      out.guar = Math.round(3 + st.guar * 12);
      out.guarCoil = 1 - clamp(st.hydr || 0, 0, 1);
      out.guarPieces = m > 0.6 ? 1 : m > 0.25 ? 2 : m > 0.08 ? 4 : 7;
      out.guarLen = 40;
      if (out.phase === 'water') out.phase = 'guar';
    }
    return out;
  }

  /* Measured values from FracGel Lab (same origin: localStorage 'fracgel.v2', or an exported JSON). */
  function measuredFor(fg, naoa, guar) {
    if (!fg || !fg.samples) return null;
    const s = fg.samples[`${+naoa}|${+guar}`];
    if (!s) return null;
    const n = v => (v === '' || v === null || v === undefined || !Number.isFinite(+v)) ? null : +v;
    const mPa = v => v === null ? null : v / 1000; // FracGel stores η at 170 s⁻¹ in mPa·s and settling in mm/min
    const r = { G0: n(s.G0), tau: n(s.tauR), eta0: n(s.eta0), eta170: mPa(n(s.eta170_25)), eta170T: mPa(n(s.eta170_T)), testT: n(s.testT), settleMmMin: n(s.settle), demo: !!fg.demo };
    if (r.eta0 === null && r.G0 !== null && r.tau !== null) r.eta0 = r.G0 * r.tau;
    return (r.G0 !== null || r.eta0 !== null || r.eta170 !== null) ? r : null;
  }

  return {
    wavelengthToRGB, hexToRGB, rgbToHex, SALTS, cobaltT, flameEmission, newLoop, dipLoop, dipHCl, heatLoop, loopClean,
    MW, CMC_NAOA_mM, toMM, waterVisc, REF, saltFactor, wlmParams, etaSp, guarParams, viscosity, moduli, stepGel, settling, microState, measuredFor,
  };
});

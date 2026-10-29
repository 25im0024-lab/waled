#!/usr/bin/env python3
"""Procedural iced-coffee product commercial.
Ice cube -> coffee pours over it -> cube morphs into a glass full of iced coffee.
Usage:  python make_coffee_video.py                # full render -> iced_coffee.mp4
        python make_coffee_video.py --still 1 3.5  # dump PNG stills at those seconds
"""
import sys, os, subprocess, argparse
import numpy as np
from scipy.ndimage import gaussian_filter
from multiprocessing import Pool

W, H, FPS, DUR = 1920, 1080, 24, 11.0
CX = W // 2
YF = 800.0            # world-space floor line (object bottom)
YFS = 840             # screen-space floor line
CROPW = 440
X0, X1 = CX - CROPW, CX + CROPW
CW, CH = X1 - X0, YFS
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "iced_coffee.mp4")

# ---------------------------------------------------------------- helpers
def sstep(a, b, x):
    t = np.clip((np.asarray(x, np.float32) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def aa(d):
    return np.clip(0.5 - d, 0, 1)

def mk_noise(n, sig, seed):
    r = np.random.default_rng(seed).standard_normal((n, n)).astype(np.float32)
    g = gaussian_filter(r, sig, mode="wrap")
    g = (g - g.mean()) / g.std() * 0.22 + 0.5
    return np.clip(g, 0, 1).astype(np.float32)

N1, N2 = mk_noise(512, 16, 1), mk_noise(512, 5, 2)

def samp(tex, X, Y):
    n = tex.shape[0]
    return tex[Y.astype(np.int32) % n, X.astype(np.int32) % n]

def sd_round_box(px, py, hx, hy, r):
    qx = np.abs(px) - hx + r
    qy = np.abs(py) - hy + r
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r

def paint(P, A, c, a):
    a3 = a[..., None]
    P[:] = np.asarray(c, np.float32) * a3 + P * (1 - a3)
    A[:] = a + A * (1 - a)

def ease_out_back(x):
    c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2

PXg = np.broadcast_to(np.arange(X0, X1, dtype=np.float32)[None, :], (CH, CW)).copy()
PYg = np.broadcast_to(np.arange(CH, dtype=np.float32)[:, None], (CH, CW)).copy()

# ---------------------------------------------------------------- static background
def make_bg():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot((xx - CX) / 950, (yy - 560) / 620)
    glow = np.exp(-r ** 2 * 2.4)
    bg = np.array([0.028, 0.024, 0.024], np.float32) + np.array([0.21, 0.15, 0.115], np.float32) * glow[..., None] * 0.85
    floor = sstep(YFS - 140, YFS + 220, yy)[..., None]
    bg = bg + floor * np.array([0.020, 0.016, 0.014], np.float32)
    vig = 1 - 0.55 * np.clip(np.hypot((xx - CX) / 1250, (yy - 540) / 800), 0, 1) ** 2
    return (bg * vig[..., None]).astype(np.float32), vig.astype(np.float32)

BG, VIG = make_bg()
rb = np.random.default_rng(5)
BOKEH = [(rb.uniform(0, W), rb.uniform(60, 700), rb.uniform(18, 60), rb.uniform(0.03, 0.09),
          rb.uniform(-6, 6), rb.uniform(0, 6.28)) for _ in range(20)]

# ---------------------------------------------------------------- timeline
def zoom(t):
    if t < 5.2:  return 1.30 + 0.06 * t / 5.2
    if t < 7.2:  return 1.36 + (1.12 - 1.36) * float(sstep(0, 1, (t - 5.2) / 2.0))
    return 1.12 + 0.10 * (t - 7.2) / (DUR - 7.2)

def morph(t):  return float(sstep(0, 1, (t - 5.2) / 1.9))
def coat(t):   return float(sstep(0, 1, (t - 2.4) / 2.6)) ** 0.9
YIMP = YF - 326.0

# splash particles: (t0, ox, oy, angle, speed, size, life)
rs = np.random.default_rng(11)
SPL = []
for i in range(130):
    SPL.append((2.47 + i * 0.0172, CX + rs.uniform(-18, 18), YIMP, rs.uniform(-65, 65), rs.uniform(160, 520), rs.uniform(3, 7), 0.7))
ICES = [(-58, -6, 80, 18, 0.0, 6.35), (46, -30, 88, -12, 1.3, 6.55), (-8, -46, 76, 35, 2.2, 6.75),
        (74, 14, 70, 25, 0.7, 6.65), (-80, 26, 66, -20, 1.9, 6.45), (6, 38, 72, 10, 3.1, 6.50),
        (-60, 96, 78, -28, 0.4, 6.55), (52, 110, 80, 14, 2.6, 6.70), (-12, 150, 74, 30, 1.1, 6.60),
        (-70, 205, 70, 8, 2.9, 6.80), (60, 230, 76, -18, 1.6, 6.90), (0, 285, 72, 22, 0.2, 6.85)]
for (dx, dy, sz, ang, ph, ta) in ICES:
    for _ in range(9):
        SPL.append((ta + 0.42, CX + dx + rs.uniform(-30, 30), YF - 440 + 34, rs.uniform(-45, 45), rs.uniform(140, 330), rs.uniform(2.5, 4.5), 0.55))
rd = np.random.default_rng(3)
DROPS_ICE = [(CX + rd.uniform(-130, 130), YF - rd.uniform(30, 280), rd.uniform(3, 7), rd.uniform(0.2, 2.2)) for _ in range(16)]
DROPS_GLASS = [(CX + rd.uniform(-100, 100), YF - rd.uniform(60, 380), rd.uniform(2.5, 6.5), rd.uniform(7.0, 9.4), rd.uniform(0, 1)) for _ in range(46)]
BUBBLES = [(CX + rd.uniform(-85, 85), rd.uniform(0, 360), rd.uniform(2, 4.5), rd.uniform(25, 55)) for _ in range(14)]

def draw_disc(P, A, z, wx, wy, r, col, alpha, hl=0.7, ry_k=1.0):
    sx = CX + (wx - CX) * z - X0
    sy = YFS + (wy - YF) * z
    rr = max(r * z, 1.0)
    xa, xb = int(sx - rr - 3), int(sx + rr + 4)
    ya, yb = int(sy - rr * ry_k - 3), int(sy + rr * ry_k + 4)
    xa, ya = max(xa, 0), max(ya, 0)
    xb, yb = min(xb, CW), min(yb, CH)
    if xb <= xa or yb <= ya or alpha <= 0.003:
        return
    gx = np.arange(xa, xb, dtype=np.float32)[None, :]
    gy = np.arange(ya, yb, dtype=np.float32)[:, None]
    dxn = (gx - sx) / rr
    dyn = (gy - sy) / (rr * ry_k)
    rad = np.hypot(dxn, dyn)
    m = np.clip((1 - rad) * rr, 0, 1)
    Pv, Av = P[ya:yb, xa:xb], A[ya:yb, xa:xb]
    paint(Pv, Av, col, m * alpha)
    spot = np.exp(-(((dxn + 0.35) ** 2 + (dyn + 0.4) ** 2) / 0.07)) * m * hl * alpha
    paint(Pv, Av, (1, 0.97, 0.92), spot)

def draw_dewdrop(P, A, z, wx, wy, r, alpha):
    sx = CX + (wx - CX) * z - X0
    sy = YFS + (wy - YF) * z
    rr = max(r * z, 1.2)
    xa, xb = max(int(sx - rr - 3), 0), min(int(sx + rr + 4), CW)
    ya, yb = max(int(sy - rr * 1.5 - 3), 0), min(int(sy + rr * 1.5 + 4), CH)
    if xb <= xa or yb <= ya or alpha <= 0.003:
        return
    gx = np.arange(xa, xb, dtype=np.float32)[None, :]
    gy = np.arange(ya, yb, dtype=np.float32)[:, None]
    dxn, dyn = (gx - sx) / rr, (gy - sy) / (rr * 1.3)
    rad = np.hypot(dxn, dyn)
    m = np.clip((1 - rad) * rr, 0, 1)
    ring = np.exp(-((rad - 0.85) / 0.18) ** 2) * np.clip(dxn * 0.6 + dyn * 0.8 + 0.3, 0, 1)
    spot = np.exp(-(((dxn + 0.38) ** 2 + (dyn + 0.42) ** 2) / 0.06))
    Pv, Av = P[ya:yb, xa:xb], A[ya:yb, xa:xb]
    paint(Pv, Av, (0.9, 0.95, 1.0), m * 0.13 * alpha)
    paint(Pv, Av, (0.01, 0.01, 0.01), ring * m * 0.35 * alpha)
    paint(Pv, Av, (1, 1, 1), spot * m * 0.95 * alpha)

# ---------------------------------------------------------------- frame
def render(i):
    t = i / FPS
    z = zoom(t); m = morph(t); f = coat(t)
    wi = 1 - float(sstep(0.15, 0.85, m)); wg = float(sstep(0.3, 1.0, m))
    X = CX + (PXg - CX) / z
    Y = YF + (PYg - YFS) / z
    P = np.zeros((CH, CW, 3), np.float32); A = np.zeros((CH, CW), np.float32)
    frame = BG.copy()
    reg = frame[:YFS, X0:X1]

    # ---- floor: puddle, glow, contact shadow
    py_lo, py_hi = YFS - 40, min(H, YFS + 130)
    gx = np.arange(X0, X1, dtype=np.float32)[None, :]
    gy = np.arange(py_lo, py_hi, dtype=np.float32)[:, None]
    ap = float(sstep(0, 1, (t - 3.3) / 1.2)) * (1 - float(sstep(0, 1, (t - 5.4) / 1.0)))
    if ap > 0.01:
        rxp = z * (170 + 110 * float(sstep(0, 1, (t - 3.3) / 1.8)))
        ell = np.hypot((gx - CX) / rxp, (gy - (YFS + 14 * z)) / (rxp * 0.12))
        mk = np.clip((1 - ell) / 0.08, 0, 1) * ap
        sub = frame[py_lo:py_hi, X0:X1]
        sub[:] = sub * (1 - 0.88 * mk[..., None]) + np.array([0.06, 0.03, 0.017], np.float32) * 0.88 * mk[..., None]
        sub += (np.exp(-((gx - CX + 110) / 70) ** 2) * mk * 0.10)[..., None] * np.array([1, 0.7, 0.45], np.float32)
    if wg > 0.02:
        ell = np.hypot((gx - CX - 40) / (230 * z), (gy - (YFS + 16)) / (34 * z))
        gl = np.exp(-ell ** 2 * 1.6) * 0.30 * wg * float(sstep(0, 1, (t - 6.6) / 1.0))
        frame[py_lo:py_hi, X0:X1] += gl[..., None] * np.array([0.60, 0.29, 0.10], np.float32)
    hwb = (150 * (1 - m) + 112 * m + 22) * z
    ell = np.hypot((gx - CX) / hwb, (gy - (YFS + 6)) / (17 * z))
    sh = np.exp(-ell ** 2 * 1.6) * 0.80
    sub = frame[py_lo:py_hi, X0:X1]
    sub *= (1 - sh)[..., None]

    # ---- body signed distance (cube <-> glass)
    front = sd_round_box(X - CX, Y - (YF - 150), 150, 150, 22)
    hwt = 150 - 26 * np.clip(((YF - 300) - Y) / 58, 0, 1)
    topf_ = np.maximum(np.maximum(np.abs(X - CX) - hwt, (YF - 358) - Y), Y - (YF - 270))
    # soften corners of the top face
    topf_ = topf_ + 0.0
    dc = np.minimum(front, topf_)
    hwY = 112 + 38 * np.clip((YF - Y) / 440, 0, 1)
    adx = np.abs(X - CX)
    dxx = adx - (hwY - 20); dyy = Y - (YF - 20)
    dg = np.maximum(np.maximum(adx - hwY, (YF - 440) - Y), np.hypot(np.maximum(dxx, 0), np.maximum(dyy, 0)) - 20)
    d = (1 - m) * dc + m * dg
    Mi = aa(d * z)
    din = np.maximum(-d, 0)

    # ================= ICE / COFFEE-COATED CUBE =================
    if wi > 0.01:
        edge = np.exp(-din / 15)
        fr = samp(N1, X * 0.8 + 300, Y * 0.8 + 100)
        fr2 = samp(N2, X * 1.5, Y * 1.5)
        frost = np.clip((fr - 0.5) * 2.2, 0, 1)
        sheen = np.clip(1 - ((X - CX) + (Y - (YF - 170))) / 340, 0.15, 1.2)
        a_ice = np.clip(0.30 + 0.45 * edge + 0.22 * frost, 0, 0.95) * Mi * wi
        core = np.array([0.66, 0.84, 0.96], np.float32); rimc = np.array([0.93, 0.98, 1.0], np.float32)
        col = core * (1 - edge[..., None]) + rimc * edge[..., None]
        col = col * (0.72 + 0.38 * sheen[..., None]) + frost[..., None] * 0.10
        col = col * (1 + 0.20 * (Y < YF - 296))[..., None]
        paint(P, A, np.clip(col, 0, 1), a_ice)
        # face edge line + right-side shade
        line = np.exp(-((Y - (YF - 296)) / 1.6) ** 2) * (np.abs(X - CX) < 146) * 0.5
        paint(P, A, (1, 1, 1), line * Mi * wi)
        paint(P, A, (0.02, 0.03, 0.05), sstep(0, 150, X - CX) * 0.16 * (Y > YF - 296) * Mi * wi)
        # coffee coat
        if f > 0.001:
            top = YF - 358
            v = 0.5 * np.sin(0.045 * X + 0.7) + 0.3 * np.sin(0.083 * X + 2.1) + 0.2 * np.sin(0.151 * X + 4.0)
            dn = sstep(-0.35, 0.75, v)
            amp = 95 * float(sstep(0, 0.15, f)) * (1 - float(sstep(0.75, 1, f)))
            yb = (top - 14 + f * (YF - top + 120) + amp * (dn - 0.3)
                  + 85 * np.exp(-((X - CX) / 45) ** 2) * float(sstep(0, 0.08, f)) * (1 - float(sstep(0.6, 0.95, f))))
            Mc = aa((Y - yb) * z) * Mi
            cc = np.array([0.13, 0.06, 0.028], np.float32) + 0.11 * np.clip(1 - (X - (CX - 150)) / 300, 0, 1)[..., None] * np.array([1, 0.7, 0.5], np.float32)
            paint(P, A, cc, Mc * 0.90 * wi)
            rimb = np.exp(-np.abs(Y - yb) / 4.5) * Mi * (1 - float(sstep(0.9, 1, f)))
            paint(P, A, (0.62, 0.37, 0.17), rimb * 0.55 * wi)
            ph = (t * 0.12 + 0.15) % 1; c1 = -220 + 440 * ph; env = np.sin(np.pi * ph)
            u = (X - CX) - 0.65 * (Y - (YF - 170))
            spec = 0.55 * np.exp(-((u - c1) / 11) ** 2) + 0.35 * np.exp(-((u - (c1 + 30)) / 4) ** 2)
            paint(P, A, (1, 0.95, 0.88), spec * env * Mc * wi * 0.55)
        # rim light & ice specular
        rim_dir = np.clip(-((X - CX) + (Y - (YF - 170))) / 150 + 0.3, 0, 1)
        paint(P, A, (0.95, 0.99, 1.0), np.exp(-din / 2.4) * (0.75 * rim_dir + 0.15) * Mi * wi)
        ph = (t * 0.12 + 0.15) % 1; c1 = -220 + 440 * ph; env = np.sin(np.pi * ph)
        u = (X - CX) - 0.65 * (Y - (YF - 170))
        spec = 0.55 * np.exp(-((u - c1) / 11) ** 2) + 0.35 * np.exp(-((u - (c1 + 30)) / 4) ** 2)
        paint(P, A, (1, 1, 1), spec * env * (0.5 + 0.5 * edge) * Mi * wi * 0.65)
        for (wx, wy, r, ta) in DROPS_ICE:
            draw_dewdrop(P, A, z, wx, wy, r, float(sstep(0, 1, (t - ta) / 0.8)) * wi)

    # ================= GLASS =================
    if wg > 0.01:
        Mg = aa(d * z); Min = aa((d + 11) * z)
        lvl0 = YF - 440 + 34
        lvl = lvl0 + (4 * np.sin(5 * (t - 6.6)) * np.exp(-1.2 * (t - 6.6)) if t > 6.6 else 0)
        liq = Min * aa((lvl - Y) * z) * aa((Y - (YF - 26)) * z)
        g = np.clip((Y - lvl) / (YF - lvl), 0, 1)
        lc = np.array([0.34, 0.17, 0.08], np.float32) * (1 - g[..., None] ** 0.7) + np.array([0.085, 0.04, 0.02], np.float32) * g[..., None] ** 0.7
        wn = samp(N1, X * 1.2 + 70 * np.sin(t * 0.5) + t * 20, Y * 1.2 - t * 10 + 200)
        cream = np.clip((wn - 0.56) * 4, 0, 1) * np.exp(-(Y - lvl) / 90) * 0.38
        lc = lc + cream[..., None] * np.array([0.70, 0.50, 0.32], np.float32)
        lc = lc + (0.11 * np.exp(-((X - CX) / 90) ** 2) * (1 - g))[..., None] * np.array([1, 0.55, 0.2], np.float32)
        paint(P, A, lc, liq * 0.97 * wg)
        # surface ellipse
        hws = 112 + 38 * (440 - (lvl0 - (YF - 440))) / 440 - 11 if False else (112 + 38 * ((YF - lvl0) / 440) - 11)
        ell = np.sqrt(((X - CX) / hws) ** 2 + ((Y - lvl) / 17) ** 2)
        sm = np.clip((1 - ell) / 0.03, 0, 1) * Min
        sc = np.array([0.40, 0.20, 0.095], np.float32) * (0.85 + 0.45 * wn[..., None])
        paint(P, A, sc, sm * 0.95 * wg)
        paint(P, A, (0.95, 0.68, 0.42), np.exp(-((ell - 1) / 0.035) ** 2) * Min * 0.42 * wg)
        # glass base
        paint(P, A, (0.78, 0.88, 0.95), Min * aa(((YF - 26) - Y) * z) * 0.18 * wg)
        paint(P, A, (1, 1, 1), np.exp(-((Y - (YF - 26)) / 1.8) ** 2) * Min * 0.55 * wg)
        # ice cubes
        for (dx, dy, sz, ang, ph, ta) in ICES:
            e = float(np.clip((t - ta) / 0.5, 0, 1))
            if t < ta - 0.05:
                continue
            cxi = CX + dx
            cyi = lvl + dy + 5 * np.sin(1.4 * t + ph) * e - 300 * (1 - e) ** 2
            a = np.deg2rad(ang + 5 * np.sin(0.7 * t + ph) + 40 * (1 - e))
            R = sz * 0.8 + 8
            xa = max(int(CX + (cxi - R - CX) * z - X0), 0); xb = min(int(CX + (cxi + R - CX) * z - X0), CW)
            ya = max(int(YFS + (cyi - R - YF) * z), 0);    yb = min(int(YFS + (cyi + R - YF) * z), CH)
            if xb <= xa or yb <= ya:
                continue
            Xs, Ys = X[ya:yb, xa:xb], Y[ya:yb, xa:xb]
            ca, sa = np.cos(a), np.sin(a)
            xr = (Xs - cxi) * ca + (Ys - cyi) * sa
            yr = -(Xs - cxi) * sa + (Ys - cyi) * ca
            di = sd_round_box(xr, yr, sz / 2, sz / 2, sz * 0.16)
            hwi = 112 + 38 * np.clip((YF - np.maximum(Ys, YF - 440)) / 440, 0, 1)
            lat = aa((np.abs(Xs - CX) - (hwi - 12)) * z)
            mk = aa(di * z) * lat * float(np.clip(e * 3, 0, 1))
            dini = np.maximum(-di, 0)
            ed = np.exp(-dini / 7)
            subm = np.clip((Ys - lvl) / 6, 0, 1)[..., None]
            icol = np.array([0.88, 0.96, 1.0], np.float32) * (1 - subm) + np.array([0.62, 0.45, 0.32], np.float32) * subm
            Pv, Av = P[ya:yb, xa:xb], A[ya:yb, xa:xb]
            paint(Pv, Av, icol * (0.85 + 0.3 * ed[..., None]), np.clip(0.42 + 0.38 * ed, 0, 0.92) * mk * wg)
            paint(Pv, Av, (1, 1, 1), np.exp(-dini / 2) * np.clip(-(xr + yr) / sz * 2 + 0.3, 0, 1) * 0.75 * mk * wg)
            paint(Pv, Av, (1, 1, 1), (yr < -sz * 0.22) * 0.12 * mk * wg)
        # bubbles
        for (bx, by0, br, bs) in BUBBLES:
            by = YF - 40 - ((by0 + t * bs) % 330)
            draw_disc(P, A, z, bx + 3 * np.sin(t * 2 + by0), by, br, (0.85, 0.62, 0.40), 0.42 * wg * float(by > lvl + 8), 0.8)
        # wall, streaks, rim
        wall = np.clip(Mg - Min, 0, 1)
        paint(P, A, (0.88, 0.95, 1.0), wall * 0.20 * wg)
        paint(P, A, (0.9, 0.96, 1.0), Mg * 0.05 * wg)
        vf = sstep(YF - 440, YF - 410, Y) * (1 - sstep(YF - 60, YF - 30, Y))
        dxl = X - (CX - hwY); dxr = (CX + hwY) - X
        sl = np.exp(-((dxl - 22) / 5.5) ** 2) * 0.55 + np.exp(-((dxr - 17) / 3) ** 2) * 0.35
        paint(P, A, (1, 1, 1), sl * vf * Min * wg)
        ell2 = np.sqrt(((X - CX) / 150) ** 2 + ((Y - (YF - 440)) / 20) ** 2)
        ring = 0.75 * np.exp(-((ell2 - 1) / 0.025) ** 2) + 0.25 * np.exp(-((ell2 - 0.93) / 0.03) ** 2)
        paint(P, A, (1, 1, 1), ring * float(sstep(0.6, 1.0, m)) * wg)
        for (wx, wy, r, ta, sl_) in DROPS_GLASS:
            slide = 0 if sl_ < 0.7 else 40 * (t - ta) * 0.3 * float(t > ta + 0.6)
            draw_dewdrop(P, A, z, wx, min(wy + slide, YF - 40), r, float(sstep(0, 1, (t - ta) / 0.8)) * wg)

    # ================= STREAM =================
    if t >= 2.0:
        yfront = min(-80 + 2400 * (t - 2.0) ** 2, YIMP)
        ytail = -80 + 2400 * (t - 4.6) ** 2 if t > 4.6 else -1e4
        if ytail < YIMP:
            xs = CX + 4 * np.sin(Y * 0.021 + t * 9)
            hws_ = (28 + 4 * np.sin(Y * 0.033 - t * 14)) / 2 * (1 + 0.1 * np.clip((Y - YIMP + 120) / 120, 0, 1))
            mk = aa((np.abs(X - xs) - hws_) * z) * aa((Y - yfront) * z) * aa((ytail - Y) * z)
            u = np.clip((X - xs) / hws_, -1, 1)
            shade = np.clip(0.10 + 0.55 * (1 - u ** 2), 0, 1)[..., None]
            scol = np.array([0.10, 0.045, 0.02], np.float32) * (1 - shade) + np.array([0.62, 0.36, 0.17], np.float32) * shade
            paint(P, A, scol, mk * 0.97)
            paint(P, A, (1, 0.95, 0.88), np.exp(-((u + 0.45) / 0.12) ** 2) * 0.7 * mk)
            paint(P, A, (1, 0.9, 0.8), np.exp(-((u - 0.55) / 0.10) ** 2) * 0.25 * mk)

    # ================= PARTICLES =================
    for (t0, ox, oy, ang, spd, sz, life) in SPL:
        dt = t - t0
        if dt < 0 or dt > life:
            continue
        a = np.deg2rad(ang)
        px = ox + spd * np.sin(a) * dt
        py = oy - spd * np.cos(a) * dt + 0.5 * 2400 * dt * dt
        draw_disc(P, A, z, px, py, sz, (0.20, 0.10, 0.045), 1 - (dt / life) ** 2, 0.8)

    # ---- composite object onto frame
    reg[:] = reg * (1 - A[..., None]) + P
    # ---- floor reflection
    nrow = min(H - YFS, 260)
    Pr = P[::-1][:nrow]; Ar = A[::-1][:nrow]
    Pr = gaussian_filter(Pr, (3.5, 3.5, 0)); Ar = gaussian_filter(Ar, (3.5, 3.5))
    k = np.arange(nrow, dtype=np.float32)[:, None]
    fade = 0.40 * np.exp(-k / 85)
    rr_ = frame[YFS:YFS + nrow, X0:X1]
    rr_[:] = rr_ * (1 - (Ar * fade)[..., None]) + Pr * fade[..., None]

    # ---- bokeh, vignette, grain, fades
    for (bx, by, br, ba, bs, ph) in BOKEH:
        x = bx + bs * t * 4 + 30 * np.sin(t * 0.3 + ph); y = by + 14 * np.sin(t * 0.4 + ph)
        xa, xb = int(max(x - br - 2, 0)), int(min(x + br + 3, W)); ya, yb = int(max(y - br - 2, 0)), int(min(y + br + 3, H))
        if xb <= xa or yb <= ya: continue
        gx2 = np.arange(xa, xb, dtype=np.float32)[None, :]; gy2 = np.arange(ya, yb, dtype=np.float32)[:, None]
        rad = np.hypot(gx2 - x, gy2 - y) / br
        frame[ya:yb, xa:xb] += (np.clip((1 - rad) * 5, 0, 1) * ba * (0.6 + 0.4 * rad))[..., None] * np.array([1.0, 0.72, 0.45], np.float32)
    frame *= (0.55 + 0.45 * VIG)[..., None] ** 0.5
    frame += np.random.default_rng(i).standard_normal((H, W, 1)).astype(np.float32) * 0.010
    master = float(sstep(0, 0.9, t)) * (1 - float(sstep(DUR - 0.8, DUR, t)))
    frame = np.clip(frame, 0, 1) * master
    frame = frame ** (1 / 1.05)
    return (np.clip(frame, 0, 1) * 255 + 0.5).astype(np.uint8)

# ---------------------------------------------------------------- main
if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--still", nargs="*", type=float)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--audio", default=None)
    args = ap.parse_args()
    if args.still:
        from PIL import Image
        for s in args.still:
            p = os.path.join(os.path.dirname(OUT), f"still_{s:05.2f}.png")
            Image.fromarray(render(int(round(s * FPS)))).save(p); print(p)
        sys.exit()
    n = int(DUR * FPS)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if args.audio:
        cmd += ["-i", args.audio, "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", args.out]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(4) as pool:
        for k, fr in enumerate(pool.imap(render, range(n), chunksize=2)):
            ff.stdin.write(fr.tobytes())
            if k % 24 == 0: print(f"frame {k}/{n}", flush=True)
    ff.stdin.close(); ff.wait(); print("done", args.out)

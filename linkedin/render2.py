"""LinkedIn video renderer (1080x1350, 4:5) from 2x full-page screenshots.
Scene kinds: 'shot' (one image), 'states' ([[t, shot], ...] with crossfades), 'card' (title/end card).
Camera: 'focus' (box keys or [x0,y0,x1,y1] in page px) with a slow push-in, or 'pan' (top -> bottom of the focus at its width).
Highlights: 'hl' [{box, t0, t1, color}] drawn as animated rounded outlines on the page content.
Usage: python3 render2.py spec.json out.mp4"""
import json, sys, subprocess, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, SCALE = 1080, 1350, 30, 2
BG, BORDER = (4, 11, 21), (30, 79, 125)
CYAN, AMBER, RED, TEXT, MUTED = (54, 200, 255), (255, 182, 39), (255, 80, 80), (232, 242, 255), (143, 169, 198)
COLORS = {'cyan': CYAN, 'amber': AMBER, 'red': RED, 'green': (43, 214, 111)}
F = '/usr/share/fonts/opentype/inter/'
font = lambda w, s: ImageFont.truetype(F + {'b': 'Inter-Bold.otf', 's': 'Inter-SemiBold.otf', 'r': 'Inter-Regular.otf', 'm': 'Inter-Medium.otf'}[w], s)
PX, PY, PW, PH = 32, 214, 1016, 720
ASP = PW / PH
spec = json.load(open(sys.argv[1])); BOX = json.load(open(spec['boxes'])); DIR = spec['dir']
IM = {}
def img(name):
    if name not in IM: IM[name] = Image.open(f'{DIR}/{name}.png').convert('RGB')
    return IM[name]
def ref(b, shot):                              # a box: literal list, 'key' (in shot) or 'shot:key'
    if isinstance(b, list): return b
    s, k = b.split(':') if ':' in b else (shot, b)
    return BOX[s]['boxes'][k]
def union(bs): return [min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)]
def fit(b, page, pad=14):
    x0, y0, x1, y1 = b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad; w, h = x1 - x0, y1 - y0
    if w / h < ASP: w = h * ASP
    else: h = w / ASP
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if w > page[0]: w = page[0]; h = w / ASP
    if h > page[1]: h = page[1]; w = h * ASP
    x0 = min(max(cx - w / 2, 0), page[0] - w); y0 = min(max(cy - h / 2, 0), page[1] - h)
    return [x0, y0, x0 + w, y0 + h]
def grow(c, k, page):
    cx, cy, w, h = (c[0] + c[2]) / 2, (c[1] + c[3]) / 2, (c[2] - c[0]) * k, (c[3] - c[1]) * k
    if w > page[0]: w = page[0]; h = w / ASP
    x0 = min(max(cx - w / 2, 0), page[0] - w); y0 = min(max(cy - h / 2, 0), page[1] - h)
    return [x0, y0, x0 + w, y0 + h]
ease = lambda t: 0.5 - 0.5 * math.cos(math.pi * min(max(t, 0), 1))
def wrap(d, text, f, maxw):
    lines, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur] if cur else lines

# ---- static layers
BASE = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(BASE)
for y in range(420):
    a = (1 - y / 420) ** 2; d.line([(0, y), (W, y)], fill=tuple(int(BG[i] + a * ((11, 35, 64)[i] - BG[i])) for i in range(3)))
d.text((PX, 44), spec['kicker'].upper(), font=font('s', 24), fill=CYAN)
d.text((PX, 78), spec['title'], font=font('b', 64), fill=TEXT)
d.text((PX, 158), spec['subtitle'], font=font('r', 28), fill=MUTED)
d.rounded_rectangle([PX - 2, PY - 2, PX + PW + 1, PY + PH + 1], 18, outline=BORDER, width=2)
if spec.get('footer'): d.text((PX, H - 52), spec['footer'], font=font('m', 24), fill=MUTED)
MASK = Image.new('L', (PW, PH), 0); ImageDraw.Draw(MASK).rounded_rectangle([0, 0, PW - 1, PH - 1], 16, fill=255)

# ---- scenes
S = []
for s in spec['scenes']:
    s = dict(s); shot = s.get('shot') or (s['states'][0][1] if s.get('states') else None)
    s['states'] = s.get('states') or ([[0, shot]] if shot else [])
    if shot:
        page = BOX[shot]['page']; fb = union([ref(b, shot) for b in s.get('focus', [[0, 0, page[0], page[1]]])])
        if s.get('pan'):
            wv = fb[2] - fb[0] + 28; hv = wv / ASP
            s['c0'] = fit([fb[0], fb[1], fb[2], fb[1] + hv - 28], page); s['c1'] = fit([fb[0], fb[3] - hv + 28, fb[2], fb[3]], page)
        else:
            s['c1'] = fit(fb, page, s.get('pad', 14)); s['c0'] = grow(s['c1'], s.get('from', 1.1), page)
        s['hl'] = [dict(h, box=ref(h['box'], shot)) for h in s.get('hl', [])]
    S.append(s)
total = sum(s['dur'] for s in S); starts = []; t = 0
for s in S: starts.append(t); t += s['dur']

def caption(s):
    im = Image.new('RGBA', (W, 330), (0, 0, 0, 0)); d = ImageDraw.Draw(im); y = 0
    if s.get('step'): d.text((PX, y), s['step'], font=font('s', 24), fill=AMBER); y += 40
    f = font('s', s.get('size', 40))
    for line in wrap(d, s['text'], f, W - 2 * PX): d.text((PX, y), line, font=f, fill=TEXT); y += int(f.size * 1.28)
    if s.get('note'): d.text((PX, y + 8), s['note'], font=font('r', 26), fill=MUTED)
    return im
CAP = [caption(s) for s in S]

def crop(name, c):
    im = img(name); Wi, Hi = im.size; c = [max(0, c[0] * SCALE), max(0, c[1] * SCALE), min(Wi, c[2] * SCALE), min(Hi, c[3] * SCALE)]
    return im.resize((PW, PH), Image.BICUBIC, box=c, reducing_gap=2.0)
def card(s):
    if s['states']:
        bg = crop(s['states'][0][1], s['c1']).filter(ImageFilter.GaussianBlur(7)); bg = Image.blend(bg, Image.new('RGB', (PW, PH), BG), 0.74)
    else: bg = Image.new('RGB', (PW, PH), (7, 22, 40))
    d = ImageDraw.Draw(bg); y = PH / 2 - 32 * len(s['card'])
    for txt, sz, col in s['card']:
        f = font('b' if sz >= 50 else 's', sz); d.text(((PW - d.textlength(txt, font=f)) / 2, y), txt, font=f, fill=tuple(col)); y += sz * 1.45
    return bg
CARDS = {i: card(s) for i, s in enumerate(S) if s.get('card')}

def panel(i, t):
    s = S[i]
    if i in CARDS: return CARDS[i]
    k = ease(t / s['dur']); c = [a + (b - a) * k for a, b in zip(s['c0'], s['c1'])]
    st = s['states']; j = max(n for n in range(len(st)) if st[n][0] <= t + 1e-9)
    im = crop(st[j][1], c)
    if j > 0 and t - st[j][0] < 0.35: im = Image.blend(crop(st[j - 1][1], c), im, ease((t - st[j][0]) / 0.35))
    if s['hl']:
        im = im.convert('RGBA'); ov = Image.new('RGBA', (PW, PH), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
        sx, sy = PW / (c[2] - c[0]), PH / (c[3] - c[1])
        for h in s['hl']:
            if not (h['t0'] <= t <= h['t1']): continue
            a = min(ease((t - h['t0']) / 0.35), ease((h['t1'] - t) / 0.35)); col = COLORS.get(h.get('color', 'amber'))
            b = h['box']; pad = 6; r = [(b[0] - c[0]) * sx - pad, (b[1] - c[1]) * sy - pad, (b[2] - c[0]) * sx + pad, (b[3] - c[1]) * sy + pad]
            pulse = 0.5 + 0.5 * math.sin((t - h['t0']) * 5)
            d.rounded_rectangle(r, 10, fill=col + (int(28 * a),), outline=col + (int(255 * a),), width=4)
            d.rounded_rectangle([r[0] - 5, r[1] - 5, r[2] + 5, r[3] + 5], 14, outline=col + (int(90 * a * pulse),), width=3)
        im = Image.alpha_composite(im, ov).convert('RGB')
    return im

ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', sys.argv[2]], stdin=subprocess.PIPE)
N = int(round(total * FPS)); XF = 0.4
for n in range(N):
    T = n / FPS; i = max(j for j in range(len(S)) if starts[j] <= T + 1e-9); t = T - starts[i]
    fr = BASE.copy(); p = panel(i, t)
    if i > 0 and t < XF: p = Image.blend(panel(i - 1, S[i - 1]['dur']), p, ease(t / XF))
    fr.paste(p, (PX, PY), MASK)
    a = ease(t / 0.45); cap = CAP[i].copy(); cap.putalpha(cap.getchannel('A').point(lambda v: int(v * a)))
    fr.paste(cap, (0, PY + PH + 40 + int(18 * (1 - a))), cap)
    d = ImageDraw.Draw(fr); BY = H - 78 if spec.get('footer') else H - 44; d.rounded_rectangle([PX, BY, W - PX, BY + 6], 3, fill=(21, 56, 91))
    d.rounded_rectangle([PX, BY, PX + (W - 2 * PX) * (T / total), BY + 6], 3, fill=CYAN)
    if spec.get('fadeout') and T > total - spec['fadeout']: fr = Image.blend(fr, Image.new('RGB', (W, H), BG), ease((T - (total - spec['fadeout'])) / spec['fadeout']))
    ff.stdin.write(fr.tobytes())
ff.stdin.close(); ff.wait(); print('frames', N, 'seconds', round(total, 1))

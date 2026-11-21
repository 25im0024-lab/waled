"""Renders a 1080x1350 (4:5) LinkedIn video from tab screenshots: header, animated screen panel (slow zoom / pan),
burned-in captions (LinkedIn autoplays muted), progress bar. Usage: python3 render.py spec.json out.mp4"""
import json, sys, subprocess, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1350, 30
BG, PANEL_BORDER = (4, 11, 21), (30, 79, 125)
CYAN, AMBER, TEXT, MUTED = (54, 200, 255), (255, 182, 39), (232, 242, 255), (143, 169, 198)
F = '/usr/share/fonts/opentype/inter/'
font = lambda w, s: ImageFont.truetype(F + {'b': 'Inter-Bold.otf', 's': 'Inter-SemiBold.otf', 'r': 'Inter-Regular.otf', 'm': 'Inter-Medium.otf'}[w], s)
PX, PY, PW, PH = 32, 214, 1016, 720          # screen panel
spec = json.load(open(sys.argv[1])); boxes = json.load(open(spec.get('boxes', 'boxes.json'))) if spec.get('boxes', 'boxes.json') and __import__('os').path.exists(spec.get('boxes', 'boxes.json')) else {}
LIVE = json.load(open(spec['live'])) if spec.get('live') else {}
SCALE = 2                                    # screenshots are 2x

def wrap(d, text, f, maxw):
    lines, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur] if cur else lines

def bg_layer():
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    for y in range(0, 420):                  # soft glow behind header
        a = (1 - y / 420) ** 2
        d.line([(0, y), (W, y)], fill=tuple(int(BG[i] + a * ((11, 35, 64)[i] - BG[i])) for i in range(3)))
    d.text((PX, 44), spec['kicker'].upper(), font=font('s', 24), fill=CYAN)
    d.text((PX, 78), spec['title'], font=font('b', 64), fill=TEXT)
    d.text((PX, 158), spec['subtitle'], font=font('r', 28), fill=MUTED)
    d.rounded_rectangle([PX - 2, PY - 2, PX + PW + 1, PY + PH + 1], 18, outline=PANEL_BORDER, width=2)
    if spec.get('footer'): d.text((PX, H - 52), spec['footer'], font=font('m', 24), fill=MUTED)
    return im
BASE = bg_layer()
MASK = Image.new('L', (PW, PH), 0); ImageDraw.Draw(MASK).rounded_rectangle([0, 0, PW - 1, PH - 1], 16, fill=255)

def fit(box, page, pad=14, aspect=PW / PH):
    x0, y0, x1, y1 = box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad
    w, h = x1 - x0, y1 - y0
    if w / h < aspect: w2 = h * aspect; x0 -= (w2 - w) / 2; w = w2
    else: h2 = w / aspect; y0 -= (h2 - h) / 2; h = h2
    if w > page[0]: cx = x0 + w / 2; w = page[0]; h = w / aspect; x0 = cx - w / 2
    if h > page[1]: cx, cy = x0 + w / 2, y0 + h / 2; h = page[1]; w = h * aspect; x0, y0 = cx - w / 2, cy - h / 2
    x0 = min(max(x0, 0), page[0] - w); y0 = min(max(y0, 0), page[1] - h)
    return [x0, y0, x0 + w, y0 + h]
def union(bs): bs = [b for b in bs if b]; return [min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)]
def zoom(c, k, page):
    cx, cy, w, h = (c[0] + c[2]) / 2, (c[1] + c[3]) / 2, (c[2] - c[0]) * k, (c[3] - c[1]) * k
    w, h = min(w, page[0]), min(h, page[0] / (PW / PH))
    x0 = min(max(cx - w / 2, 0), page[0] - w); y0 = min(max(cy - h / 2, 0), page[1] - h)
    return [x0, y0, x0 + w, y0 + h]
def cl(c, im): W0, H0 = im.size; return [max(0, c[0]), max(0, c[1]), min(W0, c[2]), min(H0, c[3])]
ease = lambda t: 0.5 - 0.5 * math.cos(math.pi * min(max(t, 0), 1))

scenes, imgs = [], {}
for s in spec['scenes']:
    sc = dict(s)
    if s.get('live'):
        L = LIVE[s['live']]; page = L.get('page', [1600, 1000]); sc['scale'] = L.get('scale', SCALE)
        tgt = fit(s.get('box') or L['box'], page, pad=s.get('pad', 6)); sc['c1'] = tgt; sc['c0'] = zoom(tgt, s.get('from', 1.06), page)
        sc['frames'] = L['frames']; sc['cache'] = {}
    elif s.get('shot'):
        b = boxes[s['shot']]; page = b['page']
        sel = [s['box']] if s.get('box') else [b['boxes'][i] for i in s.get('use', range(len(b['boxes'])))]
        u = union(sel)
        if s.get('pan'):                      # tall region: pan from its top to its bottom at full width
            wv = u[2] - u[0] + 28; hv = wv / (PW / PH)
            sc['c0'] = fit([u[0], u[1], u[2], u[1] + hv - 28], page); sc['c1'] = fit([u[0], u[3] - hv + 28, u[2], u[3]], page)
        else:
            tgt = fit(u, page); sc['c1'] = tgt; sc['c0'] = zoom(tgt, s.get('from', 1.12), page)
        if s['shot'] not in imgs: imgs[s['shot']] = Image.open(f"shots/{s['shot']}.png").convert('RGB')
    scenes.append(sc)
total = sum(s['dur'] for s in scenes); starts = []; t = 0
for s in scenes: starts.append(t); t += s['dur']
XF = 0.4

def caption_img(s):
    im = Image.new('RGBA', (W, 320), (0, 0, 0, 0)); d = ImageDraw.Draw(im); y = 0
    if s.get('step'): d.text((PX, y), s['step'], font=font('s', 24), fill=AMBER); y += 40
    f = font('s', s.get('size', 42))
    for line in wrap(d, s['text'], f, W - 2 * PX):
        d.text((PX, y), line, font=f, fill=TEXT); y += int(f.size * 1.28)
    if s.get('note'): d.text((PX, y + 8), s['note'], font=font('r', 26), fill=MUTED)
    return im
CAPS = [caption_img(s) for s in scenes]

def card_img(s):                              # full-panel title/end card
    im = Image.new('RGB', (PW, PH), (7, 22, 40)); d = ImageDraw.Draw(im)
    if s.get('shot') or s.get('live'):
        src = imgs[s['shot']] if s.get('shot') else Image.open(s['frames'][min(len(s['frames']) - 1, 3)][0]).convert('RGB'); c = [v * s.get('scale', SCALE) for v in s['c1']]
        im = src.resize((PW, PH), Image.BICUBIC, box=cl(c, src)).filter(ImageFilter.GaussianBlur(6))
        im = Image.blend(im, Image.new('RGB', (PW, PH), (4, 11, 21)), 0.72); d = ImageDraw.Draw(im)
    y = PH / 2 - 30 * len(s['card'])
    for txt, sz, col in s['card']:
        f = font('b' if sz >= 50 else 's', sz); tw = d.textlength(txt, font=f)
        d.text(((PW - tw) / 2, y), txt, font=f, fill=tuple(col)); y += sz * 1.45
    return im
CARDS = {i: card_img(s) for i, s in enumerate(scenes) if s.get('card')}
for sc in scenes:
    if sc.get('frames') and not sc.get('card'): pass

def panel(i, t):
    s = scenes[i]
    if i in CARDS: return CARDS[i]
    k = ease(t / s['dur']); c = [(a + (b - a) * k) * s.get('scale', SCALE) for a, b in zip(s['c0'], s['c1'])]
    if s.get('frames'):
        fr = s['frames']; j = 0
        while j + 1 < len(fr) and fr[j + 1][1] <= t + s.get('offset', 0): j += 1
        if fr[j][0] not in s['cache']: s['cache'].clear(); s['cache'][fr[j][0]] = Image.open(fr[j][0]).convert('RGB')
        im = s['cache'][fr[j][0]]; return im.resize((PW, PH), Image.BICUBIC, box=cl(c, im), reducing_gap=2.0)
    im = imgs[s['shot']]; return im.resize((PW, PH), Image.BICUBIC, box=cl(c, im), reducing_gap=2.0)

ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', sys.argv[2]], stdin=subprocess.PIPE)
N = int(round(total * FPS))
for n in range(N):
    T = n / FPS; i = max(j for j in range(len(scenes)) if starts[j] <= T + 1e-9); t = T - starts[i]
    fr = BASE.copy(); p = panel(i, t)
    if i > 0 and t < XF: p = Image.blend(panel(i - 1, scenes[i - 1]['dur']), p, ease(t / XF))
    fr.paste(p, (PX, PY), MASK)
    a = ease(t / 0.45); cap = CAPS[i].copy(); cap.putalpha(cap.getchannel('A').point(lambda v: int(v * a)))
    fr.paste(cap, (0, PY + PH + 40 + int(18 * (1 - a))), cap)
    d = ImageDraw.Draw(fr); BY = H - 78 if spec.get('footer') else H - 44; d.rounded_rectangle([PX, BY, W - PX, BY + 6], 3, fill=(21, 56, 91))
    d.rounded_rectangle([PX, BY, PX + (W - 2 * PX) * (T / total), BY + 6], 3, fill=CYAN)
    if spec.get('fadeout') and T > total - spec['fadeout']: fr = Image.blend(fr, Image.new('RGB', (W, H), BG), ease((T - (total - spec['fadeout'])) / spec['fadeout']))
    ff.stdin.write(fr.tobytes())
ff.stdin.close(); ff.wait(); print('frames', N, 'seconds', round(total, 1))

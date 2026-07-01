"""Generate 4 placeholder jpgs for origin-zone page."""
from PIL import Image, ImageDraw
import math, os, random

random.seed(42)
OUT = os.path.join(os.path.dirname(__file__), '..', 'wxapp', 'miniprogram', 'assets', 'images', 'origin')
os.makedirs(OUT, exist_ok=True)

def add_noise(img, strength=6):
    for y in range(img.height):
        for x in range(img.width):
            r, g, b = img.getpixel((x, y))
            n = random.randint(-strength, strength)
            img.putpixel((x, y), (
                max(0, min(255, r + n)),
                max(0, min(255, g + n)),
                max(0, min(255, b + n)),
            ))
    return img

# ========== hero.jpg (750x340) — 绿色山地果园 ==========

w, h = 750, 340
hero = Image.new('RGB', (w, h))
stops = [
    (0.00, 24, 62, 28),
    (0.35, 47, 107, 47),
    (0.70, 94, 153, 73),
    (1.00, 66, 94, 44),
]
for y in range(h):
    t = y / max(h - 1, 1)
    r = g = b = 0
    for i in range(len(stops) - 1):
        p0, r0, g0, b0 = stops[i]
        p1, r1, g1, b1 = stops[i + 1]
        if p0 <= t <= p1:
            f = (t - p0) / max(p1 - p0, 0.001)
            r = int(r0 + (r1 - r0) * f)
            g = int(g0 + (g1 - g0) * f)
            b = int(b0 + (b1 - b0) * f)
            break
    else:
        r, g, b = stops[-1][1], stops[-1][2], stops[-1][3]
    for x in range(w):
        hero.putpixel((x, y), (r, g, b))

# Sky fade top
for y in range(int(h * 0.5)):
    fade = 1.0 - y / max(int(h * 0.5), 1)
    for x in range(w):
        orig = hero.getpixel((x, y))
        hero.putpixel((x, y), (
            int(orig[0] * (1 - fade) + 150 * fade),
            int(orig[1] * (1 - fade) + 190 * fade),
            int(orig[2] * (1 - fade) + 140 * fade),
        ))

# Sun glow
for y in range(30, 120):
    for x in range(550, 700):
        dx, dy = x - 620, y - 70
        dist = math.sqrt(dx * dx + dy * dy)
        if dist < 80:
            a = max(0, 1 - dist / 80) * 0.3
            orig = hero.getpixel((x, y))
            hero.putpixel((x, y), (
                int(orig[0] * (1 - a) + 255 * a),
                int(orig[1] * (1 - a) + 240 * a),
                int(orig[2] * (1 - a) + 180 * a),
            ))

# Mountain ridges
draw = ImageDraw.Draw(hero)
draw.polygon([(0, 180), (120, 90), (250, 160), (380, 100), (500, 170), (650, 85), (750, 140), (750, 200), (0, 200)],
             fill=(42, 85, 42, 220))
draw.polygon([(0, 340), (50, 240), (180, 270), (300, 200), (420, 250), (560, 180), (680, 230), (750, 200), (750, 340)],
             fill=(30, 72, 30, 240))

# Orchard tree rows
for row in range(5):
    yc = 225 + row * 22
    for col in range(8):
        x = 60 + col * 85 + (row % 2) * 42
        if x < 0 or x >= w or yc < 0 or yc >= h:
            continue
        rx, ry = 20, 14
        for dy in range(-ry, ry + 1):
            for dx in range(-rx, rx + 1):
                px, py = x + dx, yc + dy
                if 0 <= px < w and 0 <= py < h:
                    if dx * dx / (rx * rx) + dy * dy / (ry * ry) < 1:
                        shade = 0.7 + 0.3 * (1 - (dx * dx / (rx * rx) + dy * dy / (ry * ry)))
                        hero.putpixel((px, py), (
                            int(55 * shade), int(130 * shade), int(55 * shade)
                        ))
        for dy2 in range(6):
            px, py = x, yc + ry + dy2
            if 0 <= px < w and 0 <= py < h:
                hero.putpixel((px, py), (68, 55, 38))

hero = add_noise(hero, 4)
hero.save(os.path.join(OUT, 'hero.jpg'), quality=92)
print('ok hero.jpg')

# ========== photo-1/2/3.jpg (320x150) ==========

configs = [
    ('photo-1.jpg', 95, 'tree'),
    ('photo-2.jpg', 42, 'harvest'),
    ('photo-3.jpg', 28, 'basket'),
]

for fname, base_hue, theme in configs:
    pw, ph = 320, 150
    img = Image.new('RGB', (pw, ph))
    for y in range(ph):
        t = y / max(ph - 1, 1)
        r = int(60 + 20 * t + 30 * (1 - t))
        g = int(60 + base_hue * 0.7 * (1 - t) + 40 * t)
        b = int(30 + 20 * t)
        for x in range(pw):
            img.putpixel((x, y), (r, g, b))

    d = ImageDraw.Draw(img)

    if theme == 'tree':
        # Three fruit trees
        for tx in [80, 160, 240]:
            d.ellipse([tx - 18, 30, tx + 18, 68], fill=(52, 110, 44))
            d.ellipse([tx - 22, 44, tx + 22, 76], fill=(60, 125, 50))
            trunk_x = [tx - 3, tx + 3, tx + 3, tx - 3]
            trunk_y = [68, 68, 100, 100]
            d.polygon(list(zip(trunk_x, trunk_y)), fill=(72, 58, 40))
            # Fruit dots (deterministic, no seed reset)
            for f in range(4):
                fx = tx - 10 + (f * 7 + tx * 3) % 20
                fy = 48 + (f * 11 + tx) % 22
                d.ellipse([fx - 4, fy - 4, fx + 4, fy + 4], fill=(240, 140, 40))
        d.rectangle([(0, 100), (320, 150)], fill=(78, 62, 32))

    elif theme == 'harvest':
        # Basket + fruits
        d.ellipse([60, 55, 140, 130], fill=(180, 140, 80))
        d.rectangle([55, 90, 145, 108], fill=(160, 120, 60))
        for f in range(8):
            fx = 70 + ((f * 17 + 31) % 55)
            fy = 65 + ((f * 23 + 17) % 38)
            d.ellipse([fx - 4, fy - 4, fx + 4, fy + 4], fill=(230, 120, 40))
        # Person
        d.ellipse([225, 18, 265, 52], fill=(200, 170, 120))
        d.rectangle([238, 46, 252, 100], fill=(120, 140, 90))
        d.ellipse([195, 65, 245, 96], fill=(200, 170, 120))
        d.rectangle([(0, 130), (320, 150)], fill=(70, 55, 30))

    elif theme == 'basket':
        # Fruit basket close-up
        d.ellipse([30, 48, 150, 138], fill=(190, 145, 80))
        d.rectangle([25, 82, 155, 102], fill=(170, 125, 65))
        colors = [(240, 140, 40), (200, 60, 30), (250, 200, 80), (120, 180, 60)]
        for f in range(12):
            fx = 48 + ((f * 19 + 7) % 72)
            fy = 58 + ((f * 13 + 23) % 45)
            c = colors[f % 4]
            d.ellipse([fx - 5, fy - 5, fx + 5, fy + 5], fill=c)
        # Leaves right side
        for lx in range(170, 310, 28):
            d.ellipse([lx, 66, lx + 22, 94], fill=(60, 130, 50))
        d.rectangle([(0, 130), (320, 150)], fill=(80, 65, 40))

    img = add_noise(img, 3)
    img.save(os.path.join(OUT, fname), quality=88)
    print(f'ok {fname}')

print('all 4 placeholder images ready')

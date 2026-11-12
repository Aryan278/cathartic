#!/usr/bin/env python3
"""Draws the hero canopy's boughs: the leafy branches that grow in from the page edges.

Writes assets/img/canopy/<name>-far.svg and <name>-near.svg; the far set is blurrier, like shadows cast from
higher up. Each drawing puts the bough's base at its bottom centre (150, 400), where the page sits it just past
an edge, so the bough reaches in from outside.

What keeps them believable:
- Bare wood is only ever thick: a limb tapers into branches and twigs, and leaves grow on the thin parts.
- Foliage starts at the page edge: the first shoots leave the limb within its first tenth.
- Every bough branches, each fork thinner than its parent; side shoots leave at 30–55° and curve back along the
  limb, so the outline reaches inward.
- Limbs sag a little and their tips turn back up to the light. The page mirrors a bough (--f) so it sags
  downward on whichever edge it enters.
- Leaves follow their species: alternate simple leaves, neem's compound leaves along its twigs, mango's whorls
  at the twig tips. They shrink toward the tips, and no two share a size or an angle.

Run from the repository root:  python3 tools/canopy.py [out-dir]
"""
import math
import random
import sys
from pathlib import Path

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / 'assets' / 'img' / 'canopy'
INK = '#070807'
BASE = (150.0, 400.0)
HALF_W, HEIGHT = 150.0, 400.0  # the drawing stays within 0–300 × 0–400
VIEWBOX = '-30 -30 360 460'    # with room for the soft edge
BLUR = {'far': 3.2, 'near': 1.6}


def num(v):
    s = f'{v:.1f}'
    return '0' if s in ('0.0', '-0.0') else s[:-2] if s.endswith('.0') else s


def rad(deg):
    return math.radians(deg)


class Branch:
    """A tapering stem from p, heading in degrees (screen coordinates: -90 is up). It bends by `turn` degrees
    over its length (positive is clockwise), and from 60% on it curls back by `curl` degrees."""

    def __init__(self, p, heading, length, w0, w1, turn=0.0, curl=0.0):
        self.length = length
        steps = max(4, int(length / 9))
        head = lambda t: heading + turn * t - curl * max(0.0, (t - 0.6) / 0.4) ** 2  # noqa: E731
        self.pts, self.hds, self.ws = [], [], []
        x, y = p
        for i in range(steps + 1):
            t = i / steps
            self.pts.append((x, y))
            self.hds.append(head(t))
            self.ws.append(w0 + (w1 - w0) * t ** 0.8)
            hm = rad(head((i + 0.5) / steps))
            x += math.cos(hm) * length / steps
            y += math.sin(hm) * length / steps

    def at(self, t):
        f = min(max(t, 0.0), 1.0) * (len(self.pts) - 1)
        i = min(int(f), len(self.pts) - 2)
        u = f - i
        (x0, y0), (x1, y1) = self.pts[i], self.pts[i + 1]
        mix = lambda a, b: a + (b - a) * u  # noqa: E731
        return mix(x0, x1), mix(y0, y1), mix(self.hds[i], self.hds[i + 1]), mix(self.ws[i], self.ws[i + 1])

    def outline(self):
        left, right = [], []
        for (x, y), h, w in zip(self.pts, self.hds, self.ws):
            nx, ny = -math.sin(rad(h)), math.cos(rad(h))
            left.append((x + nx * w / 2, y + ny * w / 2))
            right.append((x - nx * w / 2, y - ny * w / 2))
        (tx, ty), th, tw = self.pts[-1], rad(self.hds[-1]), self.ws[-1]
        cap = (tx + math.cos(th) * tw, ty + math.sin(th) * tw)
        pts = lambda ps: ' L'.join(f'{num(x)} {num(y)}' for x, y in ps)  # noqa: E731
        return f'M{pts(left)} Q{num(cap[0])} {num(cap[1])} {num(right[-1][0])} {num(right[-1][1])} L{pts(reversed(right))}Z'


def leaf(x, y, ang, length, width, bend=0.0, slim=False):
    """An ovate leaf from its base, pointing at ang degrees; bend curves it, slim makes it lanceolate."""
    a = rad(ang)
    ca, sa = math.cos(a), math.sin(a)

    def P(u, v):
        v += bend * (u / length) ** 2 * length
        return f'{num(x + u * ca - v * sa)} {num(y + u * sa + v * ca)}'

    L, W = length, width
    k1, k2 = (0.3, 0.72) if slim else (0.22, 0.7)
    return f'M{P(0, 0)}C{P(L * k1, -W)} {P(L * k2, -W * 0.85)} {P(L, 0)}C{P(L * k2, W * 0.85)} {P(L * k1, W)} {P(0, 0)}Z'


def rod(x0, y0, x1, y1, w):
    """A short straight stalk (a petiole)."""
    a = math.atan2(y1 - y0, x1 - x0)
    nx, ny = -math.sin(a) * w / 2, math.cos(a) * w / 2
    return f'M{num(x0 + nx)} {num(y0 + ny)} L{num(x1 + nx)} {num(y1 + ny)} L{num(x1 - nx)} {num(y1 - ny)} L{num(x0 - nx)} {num(y0 - ny)}Z'


class Bough:
    def __init__(self, seed):
        self.rng = random.Random(seed)
        self.stems, self.leaves = [], []

    def stem(self, b):
        self.stems.append(b.outline())
        return b

    def limb(self, length, w0, w1, turn, curl):
        # the limb carries on past the page edge, so its cut end is never seen
        self.stems.append(rod(BASE[0], BASE[1] + 26, BASE[0], BASE[1], w0 + 0.6))
        return self.stem(Branch(BASE, -90 + self.rng.uniform(-5, 5), length, w0, w1, turn, curl))

    def leaves_along(self, br, t0, t1, spacing, size, spread=(42, 60), terminal=True):
        """Alternate simple leaves on short stalks from t0 to t1, shrinking toward the tip."""
        rng = self.rng
        count = max(1, round((t1 - t0) * br.length / spacing))
        side = rng.choice((-1, 1))
        for i in range(count):
            t = t0 + (t1 - t0) * (i + 0.5 + rng.uniform(-0.2, 0.2)) / count
            x, y, h, w = br.at(t)
            ang = h + side * rng.uniform(*spread)
            stalk = w / 2 + rng.uniform(2.5, 4.5)
            bx, by = x + math.cos(rad(ang)) * stalk, y + math.sin(rad(ang)) * stalk
            self.stems.append(rod(x, y, bx, by, 1.4))
            age = (t - t0) / max(1e-6, t1 - t0)
            L = size * (1 - 0.36 * age ** 1.4) * rng.uniform(0.88, 1.1)
            self.leaves.append(leaf(bx, by, ang + side * rng.uniform(-8, 6), L, L * rng.uniform(0.27, 0.33), side * rng.uniform(0.02, 0.08)))
            side = -side
        if terminal:
            x, y, h, _ = br.at(1.0)
            L = size * 0.66 * rng.uniform(0.9, 1.08)
            self.leaves.append(leaf(x, y, h + rng.uniform(-10, 10), L, L * 0.3, rng.uniform(-0.05, 0.05)))

    def shoot(self, p, heading, length, w0, side, size, twigs=0, t0=0.16):
        """A side branch with alternate leaves, curving back along its parent, with optional twigs of its own."""
        rng = self.rng
        b = self.stem(Branch(p, heading, length, w0, 1.1, turn=-side * rng.uniform(12, 22), curl=rng.uniform(-4, 6)))
        s2 = -side
        for k in range(twigs):
            t = rng.uniform(0.3, 0.46) if k == 0 else rng.uniform(0.56, 0.7)
            x, y, h, w = b.at(t)
            self.shoot((x, y), h + s2 * rng.uniform(30, 46), (1 - t) * length * rng.uniform(0.46, 0.6) + 18, w * 0.66, s2, size * 0.88, 0, 0.12)
            s2 = -s2
        self.leaves_along(b, t0, 0.97, rng.uniform(19, 23), size)
        return b

    def compound(self, x, y, ang, rachis, leaflet, pairs, side):
        """A neem leaf: a slim stalk with paired, sickle-curved leaflets and one at its tip."""
        rng = self.rng
        r = self.stem(Branch((x, y), ang, rachis, 1.9, 0.7, turn=-side * rng.uniform(4, 14)))
        for i in range(pairs):
            t = 0.16 + 0.78 * i / max(1, pairs - 1)
            px, py, h, _ = r.at(t)
            L = leaflet * (1 - 0.32 * abs(t - 0.45) / 0.55) * rng.uniform(0.9, 1.08)
            for s in (-1, 1):
                self.leaves.append(leaf(px, py, h + s * rng.uniform(52, 66), L, L * 0.19, -s * rng.uniform(0.08, 0.14), slim=True))
        tx, ty, th, _ = r.at(1.0)
        self.leaves.append(leaf(tx, ty, th + rng.uniform(-8, 8), leaflet * 0.86, leaflet * 0.17, 0, slim=True))
        return r

    def whorl(self, br, size, droop=True):
        """Mango leaves crowded along the last stretch of a twig on short stalks, hanging in a loose bunch toward
        the lower side (+x)."""
        rng = self.rng
        offs = [-38, 46, -16, 70, 8, 94, 28] + ([118] if droop else [])
        for i, o in enumerate(offs):
            t = 0.8 + 0.2 * i / len(offs)
            x, y, h, w = br.at(t)
            ang = h + o + rng.uniform(-8, 8)
            stalk = w / 2 + rng.uniform(4, 8)
            bx, by = x + math.cos(rad(ang)) * stalk, y + math.sin(rad(ang)) * stalk
            self.stems.append(rod(x, y, bx, by, 1.5))
            L = size * (1 - abs(o - 30) / 320) * rng.uniform(0.86, 1.08)
            self.leaves.append(leaf(bx, by, ang, L, L * rng.uniform(0.15, 0.18), rng.uniform(0.04, 0.12), slim=True))

    def fit(self):
        """Scale (about the base) so the drawing stays inside its box."""
        nums = [float(v) for d in self.stems + self.leaves for v in d.replace('M', ' ').replace('L', ' ').replace('C', ' ').replace('Q', ' ').replace('Z', ' ').split()]
        xs, ys = nums[0::2], nums[1::2]
        reach_x = max(abs(x - BASE[0]) for x in xs)
        reach_y = max(BASE[1] - y for y in ys)
        return min(1.0, HALF_W / reach_x, HEIGHT / reach_y)

    def svg(self, blur):
        s = self.fit()
        body = f'<path d="{"".join(self.stems)}"/><path d="{"".join(self.leaves)}"/>'
        if s < 0.999:
            body = f'<g transform="translate(150 400) scale({s:.3f}) translate(-150 -400)">{body}</g>'
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VIEWBOX}">'
                f'<filter id="f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="{blur}"/></filter>'
                f'<g fill="{INK}" filter="url(#f)">{body}</g></svg>\n')


def twig(seed):
    """Alternate simple leaves: one long arching limb with short shoots sweeping forward along it, from the edge
    out, the upper ones longer (they reach for the light) and all shrinking toward the tip."""
    b = Bough(seed)
    rng = b.rng
    limb = b.limb(rng.uniform(352, 384), 7.4, 1.5, turn=rng.uniform(20, 30), curl=rng.uniform(14, 22))
    side = rng.choice((-1, 1))
    for i, t in enumerate((0.05, 0.16, 0.28, 0.41, 0.54, 0.67, 0.79)):
        t += rng.uniform(-0.02, 0.02)
        x, y, h, w = limb.at(t)
        reach = 1.22 if side < 0 else 0.72  # local -x is the upper side once the page places the bough
        length = (112 - 92 * t) * reach * rng.uniform(0.9, 1.1)
        b.shoot((x, y), h + side * rng.uniform(28, 40), length, w * 0.58, side, rng.uniform(38, 44), twigs=1 if i < 2 and side < 0 else 0)
        side = -side
    b.leaves_along(limb, 0.6, 0.97, 21, 42)
    return b


def neem(seed):
    """Neem: compound leaves alternate along the limb and a side branch, and fan out at the tip."""
    b = Bough(seed)
    rng = b.rng
    limb = b.limb(rng.uniform(318, 348), 6.6, 1.6, turn=rng.uniform(8, 16), curl=rng.uniform(8, 14))
    side = rng.choice((-1, 1))
    for t in (0.07, 0.2, 0.47, 0.62, 0.76):
        x, y, h, _ = limb.at(t + rng.uniform(-0.02, 0.02))
        b.compound(x, y, h + side * rng.uniform(38, 52), rng.uniform(80, 100) * (1 - 0.25 * t), rng.uniform(24, 30), rng.randint(5, 7), side)
        side = -side
    t = rng.uniform(0.3, 0.36)
    x, y, h, w = limb.at(t)
    br = b.stem(Branch((x, y), h + side * rng.uniform(30, 40), rng.uniform(130, 158), w * 0.6, 1.2, turn=-side * rng.uniform(8, 14)))
    s2 = -side
    for tt in (0.3, 0.62):
        x, y, h, _ = br.at(tt)
        b.compound(x, y, h + s2 * rng.uniform(36, 48), rng.uniform(70, 86), rng.uniform(22, 27), rng.randint(5, 6), s2)
        s2 = -s2
    x, y, h, _ = br.at(1.0)
    for da in (-26, 22):
        b.compound(x, y, h + da + rng.uniform(-6, 6), rng.uniform(64, 78), rng.uniform(21, 25), 5, 1 if da > 0 else -1)
    x, y, h, _ = limb.at(1.0)
    for da in (-34, 0, 30):
        b.compound(x, y, h + da + rng.uniform(-6, 6), rng.uniform(70, 86), rng.uniform(23, 27), rng.randint(5, 6), 1 if da > 0 else -1)
    return b


def mango(seed):
    """Mango: branches end in rosettes of long leaves; a short twig at the edge has its own."""
    b = Bough(seed)
    rng = b.rng
    limb = b.limb(rng.uniform(300, 330), 7.0, 2.4, turn=rng.uniform(6, 12), curl=rng.uniform(4, 9))
    side = rng.choice((-1, 1))
    for i, (t, ln) in enumerate(((0.08, 74), (0.3, 150), (0.52, 122), (0.71, 90))):
        x, y, h, w = limb.at(t + rng.uniform(-0.02, 0.02))
        br = b.stem(Branch((x, y), h + side * rng.uniform(28, 44), ln * rng.uniform(0.9, 1.1), w * 0.62, 2.0, turn=-side * rng.uniform(8, 16)))
        b.whorl(br, rng.uniform(66, 78) * (0.8 if i == 0 else 1))
        if ln > 110 and rng.random() < 0.7:
            x, y, h, w = br.at(rng.uniform(0.42, 0.55))
            b.whorl(b.stem(Branch((x, y), h - side * rng.uniform(30, 42), rng.uniform(60, 76), w * 0.7, 1.8, turn=side * 8)), rng.uniform(54, 62), droop=False)
        side = -side
    b.whorl(limb, rng.uniform(78, 88))
    return b


def fork(seed):
    """A thick limb that forks into two leafy branches, with a small shoot at the edge."""
    b = Bough(seed)
    rng = b.rng
    trunk = b.limb(rng.uniform(140, 165), 7.6, 4.4, turn=rng.uniform(-6, 6), curl=0)
    x, y, h, w = trunk.at(1.0)
    for a in (-rng.uniform(22, 32), rng.uniform(20, 30)):
        s = 1 if a > 0 else -1
        b.shoot((x, y), h + a, rng.uniform(205, 238), w * 0.74, s, rng.uniform(42, 46), twigs=1, t0=0.14)
    x, y, h, w = trunk.at(rng.uniform(0.1, 0.16))
    s = rng.choice((-1, 1))
    b.shoot((x, y), h + s * rng.uniform(36, 48), rng.uniform(62, 80), w * 0.5, s, 38, 0, t0=0.12)
    return b


VARIANTS = {
    'twig1': (twig, 11), 'twig2': (twig, 23), 'twig3': (twig, 37),
    'neem1': (neem, 5), 'neem2': (neem, 19),
    'mango1': (mango, 7), 'mango2': (mango, 31),
    'fork1': (fork, 3), 'fork2': (fork, 29),
}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (make, seed) in VARIANTS.items():
        for depth, blur in BLUR.items():
            (OUT / f'{name}-{depth}.svg').write_text(make(seed).svg(blur))
    print(f'wrote {len(VARIANTS) * len(BLUR)} drawings to {OUT}')

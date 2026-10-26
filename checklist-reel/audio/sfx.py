# /// script
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Soft paper/pencil sound effects for the checklist reel, placed from hits.json (seconds).
    uv run checklist-reel/audio/sfx.py
"""
import json
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
DIR = Path(__file__).resolve().parent
DUR = 32.5
rng = np.random.default_rng(7)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def env(n, a, d):
    t = np.arange(n) / SR
    return (1 - np.exp(-t / a)) * np.exp(-t / d)


def pencil(length=0.7):
    # light scribble: band-passed noise with a wobbling amplitude
    n = int(length * SR)
    t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 2500, 7000)
    wob = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 7.5 * t + rng.uniform(0, 3)))
    fade = np.minimum(1, t / 0.04) * np.minimum(1, (length - t) / 0.12)
    return x * wob * fade * 0.25


def check():
    # two quick strokes: short down, longer up
    a = bp(rng.standard_normal(int(0.07 * SR)), 1800, 6500) * env(int(0.07 * SR), 0.004, 0.03)
    b = bp(rng.standard_normal(int(0.2 * SR)), 2200, 8000) * env(int(0.2 * SR), 0.01, 0.07)
    out = np.zeros(int(0.32 * SR))
    out[:len(a)] += a
    s = int(0.08 * SR)
    out[s:s + len(b)] += b * 1.2
    return out


def pop(f=880):
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    fr = f * (1 + 0.6 * np.exp(-t / 0.01))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.001, 0.04) * 0.6


def slap():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 140 * t) * env(n, 0.002, 0.05)
    paper = bp(rng.standard_normal(n), 800, 5000) * env(n, 0.001, 0.035)
    return body * 0.7 + paper * 0.9


def whoosh(length=0.6, lo=400, hi=3000):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    step = 2400
    for i in range(0, n, step):
        c = lo + (hi - lo) * (i / n)
        seg = bp(x[max(0, i - 400):i + step], c * 0.7, min(c * 1.4, 20000))[-min(step, n - i):]
        out[i:i + len(seg)] = seg
    return out * np.sin(np.pi * t / length) ** 2 * 0.5


def flip():
    # page turn: a rustle sweep plus a soft flap at the end
    w = whoosh(0.55, 600, 4500)
    out = np.zeros(int(0.75 * SR))
    out[:len(w)] += w * 1.3
    f = slap() * 0.4
    s = int(0.5 * SR)
    out[s:s + len(f)] += f[:len(out) - s]
    return out


GAIN = {"pencil": 0.5, "check": 0.85, "pop": 0.35, "slap": 0.8, "whoosh": 0.3, "flip": 0.9}
hits = json.loads((DIR / "hits.json").read_text())
mix = np.zeros((2, int(DUR * SR)))
pops = iter([660, 740, 880, 990, 1110, 1320, 990, 880, 1180, 880])
for label, t, kind in hits:
    x = {"pencil": lambda: pencil(0.75), "check": check, "pop": lambda: pop(next(pops, 880)), "slap": slap, "whoosh": whoosh, "flip": flip}[kind]()
    s = int(t * SR)
    pan = 0.15 if kind in ("check", "pencil") else 0.0
    mix[0, s:s + len(x)] += x[:mix.shape[1] - s] * GAIN[kind] * (1 - pan)
    mix[1, s:s + len(x)] += x[:mix.shape[1] - s] * GAIN[kind] * (1 + pan)
mix *= 0.5 / (np.abs(mix).max() + 1e-9)
sf.write(DIR / "sfx.wav", mix.T, SR, subtype="PCM_24")
print("sfx.wav", len(hits), "hits")

# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Score for the Merkaz Dialog "קבוצת חברים" reel: playful, warm, never sad. 96 bpm, D major, 15 bars = 37.5 s.

    MOTION_REEL_SKILL=<skill> uv run social-skills-reel/audio/score.py

Sections follow the shot list (bars):
  0-3   intro      pad + electric piano, no drums (logo + headline)
  3-22  main A     soft kick, shaker, bass, EP comping (home -> trainings -> register -> calendar -> reminder -> meeting)
  22-34 main B     + clap and a marimba motif (content library, sharing content)
  34-36 end        resolve chord rings out under the end card
Writes audio/music.wav (48 kHz stereo, peak -3 dBFS) and beats.json (grid measured on the drum stem).
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.environ["MOTION_REEL_SKILL"], "scripts"))
import dsp  # noqa: E402
from dsp import SR, Bus, bass_note, clap, crash, hat, hz, keys, kick, measure_beats, pad_chord, \
    reverb, sidechain, sub_drop, filt, tvec, riser  # noqa: E402

FILM = Path(__file__).resolve().parent.parent
DUR = 37.5
BPM = 96.0
BEAT = 60 / BPM
BARS = 15
N_BEATS = BARS * 4
INTRO, B_START, END = 3, 5, 13   # bars

dsp.seed(9611)

# Dmaj9 - Bm7(add11) - Gmaj7 - A6sus  (I vi IV V, voiced soft and open)
LOOP = [
    (["D3", "A3", "C#4", "E4", "F#4"], "D2", ["F#4", "A4", "D5", "E5"]),
    (["B2", "F#3", "A3", "D4", "E4"], "B1", ["D4", "F#4", "A4", "B4"]),
    (["G2", "D3", "F#3", "B3", "E4"], "G1", ["D4", "G4", "B4", "D5"]),
    (["A2", "E3", "G3", "B3", "D4"], "A1", ["C#4", "E4", "A4", "B4"]),
]
# marimba motif per 2 bars (beat offsets, note), pentatonic D
MOTIF = [
    [(0, "F#5"), (0.5, "A5"), (1, "B5"), (2, "A5"), (2.5, "F#5"), (3.5, "E5")],
    [(0, "D5"), (0.75, "E5"), (1.5, "F#5"), (2.5, "A5"), (3, "F#5")],
]


def marimba(note, length=0.9):
    n = int(length * SR)
    t = tvec(n)
    f = hz(note)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.32)
         + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.05)
         + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.018))
    return x * (1 - np.exp(-t / 0.0015))


def shaker():
    n = int(0.09 * SR)
    t = tvec(n)
    x = filt(dsp.rng.standard_normal(n), "bandpass", [4500, 11000])
    return x * (1 - np.exp(-t / 0.006)) * np.exp(-t / 0.025)


drums, bass, music, motif = (Bus(DUR, BPM) for _ in range(4))
kicks = []
for bar in range(BARS):
    chord, broot, top = LOOP[bar % 4]
    b0 = bar * 4
    main = INTRO <= bar < END
    full = B_START <= bar < END
    L = 4 * BEAT + 0.2
    if bar < END:
        # electric piano comping: chord on 1, a softer re-strike on the "and" of 2
        music.add(keys(chord[1:], L), b0, 0.42 if main else 0.62)
        music.add(keys(top, 2 * BEAT), b0 + 1.5, 0.14 if main else 0.18)
        music.add(pad_chord(chord, L, 900 if not full else 1300, attack=0.35, release=0.6, voices=4, detune=0.08), b0, 0.16 if main else 0.3)
    if main:
        for k in (0, 2):
            drums.add(kick(soft=True), b0 + k, 0.85)
            kicks.append((b0 + k) * BEAT)
        if bar % 2 == 1:
            drums.add(kick(soft=True), b0 + 3.5, 0.45)
            kicks.append((b0 + 3.5) * BEAT)
        for e in range(8):
            drums.add(shaker(), b0 + e * 0.5, 0.16 if e % 2 else 0.1, pan=0.25)
        if full:
            for k in (1, 3):
                drums.add(clap(tight=True), b0 + k, 0.22, pan=-0.05)
            drums.add(hat(open_=True), b0 + 3.5, 0.05, pan=0.3)
        # bass: root, pickup, fifth, octave
        r = dsp.midi(broot)
        fifth = dsp.note_name(r + 7)
        octave = dsp.note_name(r + 12)
        for off, nt, ln, g in ((0, broot, 1.4, 0.55), (1.5, broot, 0.45, 0.35), (2, fifth, 1.4, 0.45), (3.5, octave, 0.45, 0.3)):
            bass.add(bass_note(nt, ln * BEAT, 520), b0 + off, g)
    if full or bar < INTRO:
        for off, nt in MOTIF[(bar - (B_START if full else 0)) % 2]:
            motif.add(marimba(nt), b0 + off, 0.2 if full else 0.13, pan=0.15 if off % 1 else -0.1)
    if bar < INTRO:
        # a sparkle arpeggio over the logo
        for j, nt in enumerate(top):
            motif.add(marimba(dsp.note_name(dsp.midi(nt) + 12), 0.7), b0 + 2 + j * 0.5, 0.12, pan=0.3 - 0.2 * j)
        if bar == INTRO - 1:
            for e in range(8):
                drums.add(shaker(), b0 + e * 0.5, 0.05 + 0.012 * e, pan=0.25)

# lift into the main section (bar 3) and into section B (bar 22)
music.add(riser(1.6) * 0.5, INTRO * 4 - 1.6 / BEAT, 0.18)
drums.add(sub_drop(1.0, 70, 32), INTRO * 4, 0.35)
music.add(crash(1.2)[::-1] * 0.6, B_START * 4 - 1.2 / BEAT, 0.12)
drums.add(crash(1.8), B_START * 4, 0.08)
# the end: Dmaj9 rings out, soft crash
final = ["D3", "A3", "C#4", "E4", "F#4", "A4"]
music.add(keys(final, 5.5), END * 4, 0.7)
music.add(pad_chord(final, 5.5, (1800, 700), attack=0.02, release=1.5, voices=4, detune=0.08), END * 4, 0.2)
motif.add(marimba("D6", 1.4), END * 4, 0.16)
motif.add(marimba("A5", 1.4), END * 4 + 0.5, 0.1)
drums.add(kick(soft=True), END * 4, 0.7)
drums.add(crash(2.4), END * 4, 0.07)

N = drums.n
duck = sidechain(kicks, drums.x.shape[1], 0.22, 0.12)
mix = drums.x * 0.9 + bass.x + reverb(music.x, 0.3) * duck + reverb(motif.x, 0.4)
mix = mix[:, :N]
fade = int(1.2 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
mix *= 10 ** (-3 / 20) / (np.abs(mix).max() + 1e-9)

# grid: measured on the drum stem plus a guide click (not in the mix) through the drumless intro/end
guide = Bus(DUR, BPM)
for b in range(N_BEATS):
    guide.add(kick(), b, 0.8)
grid_src = (drums.x + guide.x)[:, :N].mean(axis=0)
grid = measure_beats(grid_src.astype(np.float32), SR, BPM, n_beats=N_BEATS + 1)
grid["beats"] = [b for b in grid["beats"] if b < DUR + 0.5]
grid["downbeats"] = grid["beats"][::4]
grid["sections"] = [{"name": "intro", "beat": 0}, {"name": "main", "beat": INTRO * 4},
                    {"name": "main_b", "beat": B_START * 4}, {"name": "end", "beat": END * 4}]
mono = mix.mean(axis=0)
bar_s = grid["period"] * 4
grid["bar_energy"] = [round(float(np.sqrt(np.mean(mono[int((grid["offset"] + i * bar_s) * SR):int((grid["offset"] + (i + 1) * bar_s) * SR)] ** 2) + 1e-12)), 4)
                      for i in range(BARS)]
grid["duration"] = DUR
grid["source"] = "score.py: D major 96 bpm playful marimba/EP bed, 15 bars, grid measured on drum stem + guide click"
sf.write(FILM / "audio" / "music.wav", mix.T, SR, subtype="PCM_24")
(FILM / "beats.json").write_text(json.dumps(grid, indent=1))
print(grid["source"])
print(f"grid: {grid['bpm']} bpm, offset {grid['offset'] * 1000:.1f} ms, {len(grid['beats'])} beats, "
      f"fit {grid['fit_inliers']} inliers, rms {grid['fit_residual_ms']} ms")

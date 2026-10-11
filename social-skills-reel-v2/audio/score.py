# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Score v2 for the Merkaz Dialog "קבוצת חברים" reel: a children's-storybook bed. Acoustic, warm, playful,
never sad. Ukulele strums, glockenspiel melody, pizzicato-style plucked bass, shaker and woodblock.
No electronic drums, no electric piano. 96 bpm, D major, 15 bars = 37.5 s.

    MOTION_REEL_SKILL=<skill> python3 social-skills-reel-v2/audio/score.py

Sections follow the shot list (beats, 0.625 s each):
  0-7    yard        bright strummed ukulele, glockenspiel hook, shaker + woodblock
  7-12   close-up    percussion drops out; soft ukulele arpeggio and single glock notes (curious)
  12-14  window      a rising glockenspiel sparkle into the room
  14-24  room        warm: pad, plucked bass, gentle strum, the hook again softer
  24-52  info        light groove under the pills / cards / facilitator / registration
  52-60  end         the hook once more, then D major rings out under the logo
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.environ["MOTION_REEL_SKILL"], "scripts"))
import dsp  # noqa: E402
from dsp import SR, Bus, hz, kick, ks_pluck, measure_beats, pad_chord, reverb, filt, tvec  # noqa: E402

FILM = Path(__file__).resolve().parent.parent
DUR = 37.5
BPM = 96.0
BEAT = 60 / BPM
N_BEATS = 60
dsp.seed(2611)

CH = {
    "D": ["D4", "F#4", "A4", "D5"], "G": ["D4", "G4", "B4", "D5"], "A": ["C#4", "E4", "A4", "E5"],
    "Bm": ["D4", "F#4", "B4", "D5"], "Em": ["E4", "G4", "B4", "E5"], "A7": ["C#4", "E4", "G4", "A4"],
}
ROOT = {"D": "D2", "G": "G2", "A": "A2", "Bm": "B2", "Em": "E2", "A7": "A2"}


def uke(chord, down=True, length=0.85, bright=0.55):
    notes = CH[chord] if down else CH[chord][::-1]
    n = int((length + 0.06) * SR)
    out = np.zeros(n)
    for i, nt in enumerate(notes):
        x = ks_pluck(hz(nt), length, bright, 0.0)
        s = int(i * 0.011 * SR)
        out[s:s + len(x)] += x * (0.8 if not down else 1.0)
    return out / 3


def glock(note, length=1.2):
    n = int(length * SR)
    t = tvec(n)
    f = hz(note)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.55)
         + 0.42 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.16)
         + 0.16 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.05))
    return x * (1 - np.exp(-t / 0.0008))


def pizz(note, length=0.6):
    x = ks_pluck(hz(note), length, 0.18, 0.0)
    return filt(x, "lowpass", 900) * 1.4


def shaker():
    n = int(0.09 * SR)
    t = tvec(n)
    x = filt(dsp.rng.standard_normal(n), "bandpass", [4500, 11000])
    return x * (1 - np.exp(-t / 0.006)) * np.exp(-t / 0.025)


def woodblock(f=1250):
    n = int(0.12 * SR)
    t = tvec(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.022) + 0.3 * np.sin(2 * np.pi * f * 2.3 * t) * np.exp(-t / 0.01)
    return x * (1 - np.exp(-t / 0.0005))


strum, mel, bass, perc, pad = (Bus(DUR, BPM) for _ in range(5))

# strum pattern over one bar of eighths: D . D U . U D U
PATTERN = [(0, True, 1.0), (1, True, 0.7), (1.5, False, 0.55), (2.5, False, 0.6), (3, True, 0.8), (3.5, False, 0.55)]
# glockenspiel hook (2 bars), D major pentatonic, bouncy
HOOK = [(0, "A5"), (0.5, "B5"), (1, "D6"), (2, "B5"), (2.5, "A5"), (3, "F#5"),
        (4, "E5"), (4.5, "F#5"), (5, "A5"), (6, "F#5"), (7, "D5")]


def bar_strum(b0, chord, gain=1.0, pattern=PATTERN, bright=0.55):
    for off, down, g in pattern:
        strum.add(uke(chord, down, bright=bright), b0 + off, 0.5 * g * gain, pan=-0.15)


# ---- yard (beats 0-7): bright and bustling
for b0, ch in ((0, "D"), (4, "G")):
    bar_strum(b0, ch, 1.0 if b0 else 0.85)
    for e in range(8):
        perc.add(shaker(), b0 + e * 0.5, 0.13 if e % 2 else 0.08, pan=0.3)
    perc.add(woodblock(), b0 + 1, 0.1, pan=-0.3)
    perc.add(woodblock(1050), b0 + 3, 0.09, pan=-0.3)
    bass.add(pizz(ROOT[ch]), b0, 0.5)
    bass.add(pizz(dsp.note_name(dsp.midi(ROOT[ch]) + 7)), b0 + 2, 0.38)
for off, nt in HOOK[:6]:
    mel.add(glock(nt), off, 0.2, pan=0.2)
for off, nt in HOOK[6:9]:
    mel.add(glock(nt), off, 0.18, pan=0.2)

# ---- close-up (beats 7-12): percussion drops out, a soft arpeggio, curious single notes
for b0, ch in ((7, "Bm"), (9.5, "G")):
    for j, nt in enumerate(CH[ch] + CH[ch][1:3][::-1]):
        strum.add(ks_pluck(hz(nt), 1.2, 0.4, 0.0) / 3, b0 + j * 0.42, 0.42, pan=-0.2 + 0.08 * j)
    bass.add(pizz(ROOT[ch], 1.4), b0, 0.32)
for off, nt in ((8, "F#5"), (8.75, "A5"), (10.5, "B5"), (11.25, "D6")):
    mel.add(glock(nt, 1.6), off, 0.15, pan=0.25)
pad.add(pad_chord(["D3", "F#3", "B3", "D4"], 5 * BEAT, 700, attack=0.8, release=1.0, voices=3, detune=0.06), 7, 0.13)

# ---- window (beats 12-14): a rising sparkle
for j, nt in enumerate(["D5", "E5", "F#5", "A5", "B5", "D6", "E6", "F#6"]):
    mel.add(glock(nt, 0.9), 12 + j * 0.25, 0.08 + 0.015 * j, pan=-0.4 + 0.1 * j)

# ---- room (beats 14-24): warm and welcoming
ROOM = [(14, "D"), (18, "A"), (22, "Bm")]
for b0, ch in ROOM:
    bar_strum(b0, ch, 0.7, bright=0.45)
    bass.add(pizz(ROOT[ch]), b0, 0.45)
    bass.add(pizz(dsp.note_name(dsp.midi(ROOT[ch]) + 7)), b0 + 2, 0.32)
    pad.add(pad_chord([dsp.note_name(dsp.midi(n) - 12) for n in CH[ch][:3]], 4 * BEAT + 0.3, 900, attack=0.3, release=0.6, voices=3, detune=0.06), b0, 0.12)
for off, nt in HOOK:
    mel.add(glock(nt), 14 + off, 0.15, pan=0.2)
for e in range(16):
    perc.add(shaker(), 16 + e * 0.5, 0.06 if e % 2 else 0.035, pan=0.3)

# ---- info (beats 24-52): light groove, I-IV-vi-V
PROG = ["G", "D", "Em", "A", "G", "D", "Bm", "A"]
for i, ch in enumerate(PROG[:7]):
    b0 = 24 + i * 4
    bar_strum(b0, ch, 0.75, bright=0.5)
    bass.add(pizz(ROOT[ch]), b0, 0.45)
    bass.add(pizz(ROOT[ch]), b0 + 1.5, 0.25)
    bass.add(pizz(dsp.note_name(dsp.midi(ROOT[ch]) + 7)), b0 + 2, 0.32)
    for e in range(8):
        perc.add(shaker(), b0 + e * 0.5, 0.11 if e % 2 else 0.06, pan=0.3)
    perc.add(woodblock(), b0 + 1, 0.07, pan=-0.3)
    perc.add(woodblock(1050), b0 + 3, 0.06, pan=-0.3)
    if i in (2, 3, 6):
        for off, nt in HOOK[(i % 2) * 6:(i % 2) * 6 + 5]:
            mel.add(glock(nt), b0 + off % 4, 0.12, pan=0.2)

# ---- end (beats 52-60): the hook once more, then D rings out
bar_strum(52, "A7", 0.6, pattern=[(0, True, 1.0), (2, True, 0.7)])
for off, nt in HOOK[:6]:
    mel.add(glock(nt), 52 + off, 0.14, pan=0.2)
strum.add(uke("D", True, 3.2, 0.5), 56, 0.6)
bass.add(pizz("D2", 2.5), 56, 0.5)
pad.add(pad_chord(["D3", "A3", "D4", "F#4"], 3.6, (1600, 600), attack=0.05, release=1.6, voices=4, detune=0.07), 56, 0.15)
mel.add(glock("D6", 2.4), 56, 0.18)
mel.add(glock("A6", 2.4), 56.5, 0.1)

N = strum.n
mix = reverb(strum.x, 0.22) + reverb(mel.x, 0.38) + bass.x * 0.9 + perc.x + reverb(pad.x, 0.35)
mix = mix[:, :N]
fade = int(1.2 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
mix *= 10 ** (-3 / 20) / (np.abs(mix).max() + 1e-9)

guide = Bus(DUR, BPM)
for b in range(N_BEATS):
    guide.add(kick(), b, 0.8)
grid = measure_beats(guide.x[:, :N].mean(axis=0).astype(np.float32), SR, BPM, n_beats=N_BEATS + 1)
grid["beats"] = [b for b in grid["beats"] if b < DUR + 0.5]
grid["downbeats"] = grid["beats"][::4]
grid["sections"] = [{"name": "yard", "beat": 0}, {"name": "closeup", "beat": 7}, {"name": "window", "beat": 12},
                    {"name": "room", "beat": 14}, {"name": "info", "beat": 24}, {"name": "end", "beat": 52}]
grid["duration"] = DUR
grid["source"] = "score.py v2: storybook ukulele/glockenspiel bed, D major 96 bpm, grid from guide click"
sf.write(FILM / "audio" / "music.wav", mix.T, SR, subtype="PCM_24")
(FILM / "beats.json").write_text(json.dumps(grid, indent=1))
print(grid["source"], f"| {grid['bpm']} bpm, offset {grid['offset'] * 1000:.1f} ms")

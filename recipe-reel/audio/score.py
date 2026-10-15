# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Score for the "מתכון לחברות" reel (based on the v2 storybook palette): a children's-storybook bed. Acoustic, warm, playful,
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
from dsp import SR, Bus, hz, kick, clap, hat, crash, riser, sub_drop, bass_note, ks_pluck, measure_beats, pad_chord, reverb, filt, tvec  # noqa: E402

FILM = Path(__file__).resolve().parent.parent
DUR = 55.0
BPM = 96.0
BEAT = 60 / BPM
N_BEATS = 88
dsp.seed(5309)

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
drums = Bus(DUR, BPM)
HOOK = [(0, "A5"), (0.5, "B5"), (1, "D6"), (2, "B5"), (2.5, "A5"), (3, "F#5"),
        (4, "E5"), (4.5, "F#5"), (5, "A5"), (6, "F#5"), (7, "D5")]
PROG = ["D", "G", "Bm", "A", "D", "G", "Em", "A7"]
kicks = []
# a playful kitchen groove: pizzicato bass + ukulele from the start, soft drums join at bar 4 (10 s, the first pour)
for i in range(18):
    b0 = i * 4
    if b0 >= 72:
        break
    ch = PROG[i % 8]
    light = i < 4
    for e in range(8):
        strum.add(uke(ch, e % 2 == 0, bright=0.5), b0 + e * 0.5, (0.26 if light else 0.34) * (1.0 if e % 2 == 0 else 0.7), pan=-0.15)
    r = ROOT[ch]
    fifth = dsp.note_name(dsp.midi(r) + 7)
    for off, nt, g in ((0, r, 0.45), (1, fifth, 0.3), (2, r, 0.4), (3, fifth, 0.3)):
        bass.add(pizz(nt, 0.5), b0 + off, g)
    if not light:
        for k in (0, 2):
            drums.add(kick(soft=True), b0 + k, 0.7); kicks.append((b0 + k) * BEAT)
        for k in (1, 3):
            drums.add(clap(tight=True), b0 + k, 0.16, pan=-0.05)
        for e in range(8):
            perc.add(shaker(), b0 + e * 0.5, 0.07 if e % 2 else 0.04, pan=0.3)
        perc.add(woodblock(), b0 + 1.5, 0.05, pan=-0.3)
for base in (16, 48):
    for off, nt in HOOK:
        mel.add(glock(nt), base + off, 0.07, pan=0.2)
# 46 s = beat 73.6: the end card. A lift, then the hook once more and D rings out
for off, nt in HOOK[:6]:
    mel.add(glock(nt), 74 + off, 0.08, pan=0.2)
strum.add(uke("D", True, 3.0, 0.5), 84, 0.6)
bass.add(pizz("D2", 2.5), 84, 0.5)
pad.add(pad_chord(["D3", "A3", "D4", "F#4"], 2.4, (1600, 600), attack=0.03, release=1.2, voices=4, detune=0.07), 84, 0.14)
mel.add(glock("D6", 2.0), 84, 0.09)

from dsp import sidechain
duck = sidechain(kicks, strum.x.shape[1], 0.15, 0.12)
N = strum.n
mix = reverb(strum.x, 0.25) * duck + reverb(mel.x, 0.25) + bass.x * 0.9 * duck + perc.x + drums.x * 0.8 + reverb(pad.x, 0.35)
mix = mix[:, :N]
fade = int(1.0 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
mix *= 10 ** (-3 / 20) / (np.abs(mix).max() + 1e-9)
sf.write(FILM / "audio" / "music.wav", mix.T, SR, subtype="PCM_24")
print("recipe score written")

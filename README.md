# Making Movies (Claude)

Reusable engine behind the Merkaz Dialog trainings explainer video — a 90-second,
code-rendered (not hand-animated) product demo, synthesized score included, delivered
as MP4 in both 16:9 and 9:16.

The film is a **pure function of time**: `window.seek(t)` renders any frame on demand with
no CSS transitions, no `requestAnimationFrame`, no randomness beyond a seeded PRNG. That's
what makes a frame-exact, motion-blurred render pipeline possible.

This repo is the **template**, not a one-off. To make a new video for a different system
or with new content, swap the content in `dialog-trainings/src/film.js` and re-run the
pipeline below — the engine (spring physics, beat-grid timing, RTL Hebrew typesetting,
render pipeline, scoring) carries over unchanged.

## Requirements

- Node.js, with `npm install` run once in this directory
- Python 3.10+ with `uv` (for the score: `pip install uv` or see https://docs.astral.sh/uv/)
- Playwright's Chromium — pre-installed in a Claude Code cloud session at
  `/opt/pw-browsers/chromium`; elsewhere run `npx playwright install chromium`
- `ffmpeg` on PATH
- The `motion-reel` Claude Code skill/plugin installed (provides `dsp.py`, `beats.py`,
  `sfx.mjs`, `mix.mjs`, `scaffold.mjs`, `reference.mjs`). `env.sh` expects to find it at
  the path baked in there — update that path if the plugin moves.

## Layout

```
dialog-trainings/
  src/film.js        the content + storyboard + timing (edit this for a new video)
  src/film.css        matching stylesheet (real-UI colors/layout live here)
  lib/motion.js        the pure-function-of-time rendering harness (generic, don't touch)
  audio/score.py        synthesizes the score (bpm/key/structure per project)
  assets/                pre-extracted emoji SVGs + pre-blurred shadow PNG (perf hacks)
  fonts/                 subsetted Rubik (Hebrew + Latin)
  build.mjs              bundles everything into one self-contained index.html
  film.json              {title, duration, formats, poster}
  docs/shotlist.md        the approved shot list (beats -> scenes -> captions)
  docs/critique.md        issues found and fixed during the two critique rounds
render-pipe.mjs      frame-exact renderer: CDP screenshots -> 4x sub-frame motion blur -> ffmpeg (h264/aac)
cmp.mjs              regression check: screenshots two builds at the same timestamps and diffs them
sheet.sh / sheet9.sh contact-sheet helpers for visual QA (landscape / portrait grids)
env.sh               exports $S = path to the installed motion-reel skill
```

## Making a new video from this template

1. **Gather the new content** — screenshots of the real UI, exact copy/Hebrew text, the
   storyline (which screens, in what order), logo, and any corrections the client gives
   in chat (those override any written spec, same as this project).
2. **Edit `dialog-trainings/src/film.js`**: the `PEOPLE`/`C`/`ITEMS` data tables, the
   `stage.innerHTML` markup builders, and the `plan()`/`CAM` keyframes for the new
   storyboard. Reuse `GEO`/`PORTRAIT` if you want both 16:9 and 9:16 from one file.
   Reuse the spring/beat-grid/windowing helpers as-is.
3. **Edit `dialog-trainings/src/film.css`** to match the new product's real colors and
   layout (sample hex values directly from screenshots — don't invent a palette).
4. **Write a new score** in `dialog-trainings/audio/score.py` (duration, bpm, key,
   section structure) if the old one doesn't fit the new length/mood, then:
   ```
   source env.sh
   MOTION_REEL_SKILL=$S uv run dialog-trainings/audio/score.py
   ```
   This writes `dialog-trainings/audio/music.wav` and `beats.json`.
5. **SFX + mix** using the motion-reel skill's own scripts (`sfx.mjs` builds a hit list
   from the film's `hits()`, `mix.mjs` masters to -14 LUFS / -1 dBTP and muxes).
6. **Build** the self-contained HTML:
   ```
   node dialog-trainings/build.mjs
   ```
7. **Preview** by opening `dialog-trainings/index.html?preview=1` in a browser — scrubs
   with a timeline. Add `?format=9x16` for the portrait cut.
8. **Critique pass**: pull contact sheets at representative timestamps (`sheet.sh` /
   `sheet9.sh`) and fix framing/timing issues before committing to a full render — it's
   much cheaper than re-rendering.
9. **Render**:
   ```
   node render-pipe.mjs dialog-trainings --workers 2 --format 16x9
   node render-pipe.mjs dialog-trainings --workers 2 --format 9x16
   ```
   Full 90s renders take ~20-30 min each depending on worker count.
10. **Verify**: ffprobe the output (codec/resolution/fps/duration), pull frames from the
    *encoded* file (not the live preview) at a few timestamps and eyeball them.

If you reuse the exact same film.js for a second format, `cmp.mjs` can confirm a code
change didn't regress the original format — screenshot both builds at identical
timestamps and byte-diff.

## Hard-won lessons (see docs/critique.md for the full log)

- Give every layered window/menu/modal an explicit `z-index` — a positioned ancestor with
  no z-index creates no stacking context, so later DOM order alone won't save you.
- Frame RTL Hebrew headings with named, hand-tuned camera keyframes, not generic
  per-element padding — tight auto-framing clips descenders/ascenders at the crop edge.
- Replace `filter: blur()` with a pre-blurred PNG (shadows) or a `radial-gradient` (glows)
  — measured ~100ms/frame saved.
- Use CDP `Page.captureScreenshot({format:'png', optimizeForSpeed:true})`, not
  `page.screenshot()` — faster per frame.
- `mix()`-style color interpolation must return the same format its callers expect
  (hex vs `rgb()`) — a silent mismatch shows up as black UI elements.
- Noto Color Emoji's SVG-in-OT woff2, subsetted with pyftsubset, trips Chromium's OTS
  parser ("glyf: zero-length table"). Extract the needed glyphs as standalone inline SVG
  from the font's `SVG ` table instead.

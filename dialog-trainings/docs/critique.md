# Critique log

## Round 1 (stills across the cut)
| hook | read | motion | variety | brand | sync | min |
|  7   |  5   |   7    |    8    |   7   |  7   |  5  |

Worst three:
1. [beats 46-60] calendar window invisible: pages had z-index 2 inside a browser with no stacking context, so they painted over the window (and over the side menu and modal). Fix: z-index 1 on #browser, explicit z on layers. Done.
2. [beats 14-36] camera crops cut Hebrew headings at the frame edge (hero title, header, section title). Fix: page shots at s 1.12 (whole width), content shots at s 1.25 with the app header kept out of frame, card shots framed on the card row with the title inside. Done.
3. [beats 16.7, 94.5] page changes cross-dissolved two pages into each other. Fix: shared app header, fade-through (old out in 0.22 beat, new in with 22 px rise), instant switch for browser tabs. Done.

Also fixed: colour mix returned rgb() into a hex parser (black buttons), emoji (Noto SVG-in-OT, unsupported in Chrome) replaced with inline SVG glyphs, flex whitespace swallowed the space before "CBT", AI overlay had no positioned parent.

## Round 2
| hook | read | motion | variety | brand | sync | min |
|  8   |  8   |   8    |    8    |   8   |  8   |  8  |

Worst three:
1. [beats 46.6-47.1] calendar window opened empty for 0.3 s. Rows now stagger from 46.8. Done.
2. [beats 127-131] caption 8 (two lines) covered the bottom of the finished article. Caption now ends at 131.4 and the page scrolls so the whole article sits in frame. Done.
3. [render] blur filters cost ~100 ms a frame. Shadows now a pre-blurred image, hero blobs radial gradients. Done.

Sync: 67/83 hits within 20 ms of an onset (misses are peak-anchored whooshes), median 2 ms. Mix -14.1 LUFS, -1.3 dBTP.

## Round 3 (final render)
See delivery notes.

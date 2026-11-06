# Jargon mobile interface redesign — verification

## Change
The new game-first presentation replaces the visually heavy layout while retaining the pre-rendered board fallback and the same gameplay engine. The design has a compact dark-blue top bar, player scores, readable original bonus squares, simplified uniform wood tiles, seven-tile rack and controls. Two themes: Sophisticated (default) and Playful (painted toy blocks).

No ads, analytics, trackers, remote fonts or external JavaScript were added. The redesign is inlined into `index.html` so the standalone file still works without external assets.

## Tests actually performed
Ran headless Chromium via Python Playwright with installed system Chromium on November 5, 2026. The test HTML was loaded using Playwright `set_content()` because `file://` navigation was blocked in the execution environment.

| Check | 375×812 | 390×844 |
|---|---|---|
| Full 15×15 board (225 squares) | PASS | PASS |
| Seven rack tiles | PASS | PASS |
| Tap rack letter then center square | PASS | PASS |
| Change to Playful theme | PASS | PASS |
| No JavaScript exceptions | PASS | PASS |
| No horizontal scroll | PASS | PASS |
| Primary controls in initial viewport | PASS (bottom 667px) | PASS (bottom 684px) |

JavaScript-disabled test: PASS — static 225-square board and explanatory warning remain visible.

To reproduce:
```bash
python -m pip install playwright
python -m playwright install chromium
python tests/mobile_smoke.py
```

These are Chromium responsive emulation checks, **not verified iPhone Safari tests**. The in-app attachment viewer may still refuse to run JavaScript; the fallback cannot make a locked-down preview interactive.

## Scope limitations
- The underlying game is still the local hot-seat alpha with limited starter word list.
- Browser tests do not demonstrate complete rules correctness, actual iPhone Safari rendering, or two-device multiplayer.
- The current architecture is monolithic; follow-up work should split engine, dictionary and UI modules with CI.
- The look is an iteration, pending actual device testing and user acceptance.
- Lovable was not used for this iteration; its connected profile lookup failed, and spending credits was unnecessary for the focused CSS/interaction work.

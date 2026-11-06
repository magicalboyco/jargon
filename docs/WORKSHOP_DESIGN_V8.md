# Jargon Workshop — visual system v8

## Design direction
Original, welcoming wooden alphabet blocks paired with the information hierarchy of a polished word game. This borrows broad qualities of vintage educational toys—not any protected brand, artwork or exact competitor layout. The Sophisticated and Playful themes share exactly the same engine, board, dictionary, scoring and save state.

## Changed
- Replaced historically layered CSS with one roughly 19.5 KB grouped stylesheet and a single `:root` design-token declaration; source is `src/styles.css` and `tools/build.py` rebuilds the standalone offline `index.html`.
- Warm paper background, muted chalkboard-teal masthead, inset wood and birch faces, painted enamel block rims, legible premium-square colors, clearer rack ledge, softer grid divisions and reduced visual clutter.
- Sophisticated: calmer cream-centered wooden squares. Playful: strong painted primary borders, wooden sides and stronger depth.
- Mobile portrait remains board-first. On short, wide screens the rack and controls sit beside the board so play remains visible.
- 46px primary control buttons and accessible focus indications; all 225 board squares cannot be 44px each at smartphone width, so the existing keyboard grid is retained.
- Tile snap animates gently only when reduced motion is not requested. No haptics added: the Vibration API has inconsistent mobile support, including iOS.
- No external scripts, font downloads, images or analytics requests added. Texture uses simple gradients rather than per-tile turbulence (deliberately avoiding a heavy filter on 225 cells).
- Preserved full local Classic/Block Flip rules, blank-letter dialog, keyboard arrows, local saves and export/import from the preceding PR.

## Fonts and licenses
The heavy serif currently comes from a device font stack with a subtle text stroke. This cannot guarantee identical Cooper-like lettering on all platforms; an appropriate self-hosted font and license notice remain required before final branding. No third-party font CDN request is made.

## Browser verification
Ran headless Chromium/Playwright after rebuilding `index.html`; **not** a physical iPhone or VoiceOver test.

- 320×720, 375×812, 390×844, 768×1024, 1024×768: 225 cells, seven tiles, square board, both themes, 44px+ primary button heights, no horizontal scrolling, primary controls visible in initial viewport.
- Reduced-motion testing: staged tile placement has no CSS animation.
- Previous regression suite: keyboard navigation, blank selection/cancellation, draft/flip persistence, complete valid **AT** word submission and JavaScript-disabled fallback.
- Computed bonus-label contrast ratios for nominal CSS colors: DL ~6.47:1, TL ~6.22:1, DW ~5.68:1, TW ~5.25:1 and center ~5.31:1. These are targeted pairwise checks, not a complete WCAG or screen-reader audit.

## Not tested or delivered
Physical iPhone Safari and file-preview execution; full production dictionary; server-backed multiplayer or guest identity; stringent imported-save validation; full contrast/keyboard/screen-reader testing; consistent licensed display font; end-to-end privacy audit; deployed website.

## Reproduce
```bash
python tools/build.py
python -m pip install playwright
python -m playwright install chromium
python tests/regression.py
python tests/workshop_visual.py
```

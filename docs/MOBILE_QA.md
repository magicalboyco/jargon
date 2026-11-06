# Mobile board smoke test (2026-11-05)

## What changed

- The 15×15 board is pre-rendered as static HTML so the screen never displays an empty brown rectangle when an attachment preview refuses to execute JavaScript.
- If JavaScript is unavailable, a visible warning explains that gameplay requires opening the file in a full browser/hosted webpage.
- An uncaught JavaScript error displays a visible error message.
- Added viewport safe-area CSS for mobile Safari, retaining the board-first layout.

## Tests run

Playwright with headless Chromium on the current HTML, using mobile viewport and touch emulation:

| Scenario | Result |
|---|---|
| 375×812 mobile | PASS: 225 board cells, 7 rack tiles, no page JavaScript errors |
| 390×844 mobile | PASS: 225 board cells, 7 rack tiles, no page JavaScript errors |
| No horizontal scrolling | PASS at both viewport sizes |
| Entire board, rack and primary controls within viewport height | PASS at both viewport sizes |
| Theme toggle | PASS at both viewport sizes; board remains intact |
| JavaScript disabled | PASS: 225-cell static board and visible explanatory warning |

The browser loaded HTML in Playwright using `page.set_content()`, because the local `file://` URL was restricted by the sandbox. This test does **not** verify iOS Safari or the iPhone attachment viewer. It also does not establish that the game engine is production ready.

## How to reproduce

Run an HTTP server from repository root (e.g. `python3 -m http.server 8000`), open `http://localhost:8000` in a full browser, and inspect at 375×812 and 390×844 using developer responsive mode. Select a rack tile and then a board square. Toggle the theme. For an actual device, serve the game over HTTPS and test in Safari; avoid the in-app document preview.

## Remaining defects and next steps

1. The current alpha is a monolithic HTML file and needs modularization.
2. Test through hosted HTTPS on a real iPhone before signing off mobile Safari.
3. Validate the full ENABLE dictionary and word rules.
4. Build secured online multiplayer and verify privacy properties.
5. Improve visual polish and test with representative midgame boards, accessibility, and user feedback.

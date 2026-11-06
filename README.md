# Jargon — privacy-first word-game alpha

**Not a commercial release.** This repository provides a local, single-device word-game alpha with Classic and experimental Block Flip modes, plus separate Playful and Sophisticated themes. It is not online multiplayer and does not have the complete production dictionary.

## Play and build

`index.html` is a complete standalone build with inlined CSS/JavaScript, so no external runtime scripts, fonts, ad networks or tracking calls are required. Open it as a real browser page, ideally over HTTPS; an iPhone's attachment/document preview may display HTML while refusing to run JavaScript.

The maintainable source lives in `src/`:

- `engine.js` — game rules, move validation and scoring; independent of the DOM and network
- `dictionary.js` — **incomplete starter dictionary**, versioned as an alpha
- `ui.js` — browser rendering, controls, storage and accessibility
- `styles.css` — theme and layout rules; CSS overrides have been deduplicated and root variables consolidated
- `shell.html` — document structure and static no-JavaScript board fallback

`tools/build.py` concatenates local sources into `index.html`. No install, server or third-party build package is needed to run the builder:

```bash
python tools/build.py
```

The checked-in compiled `index.html` must match the generated output. Make changes to **source files first**, then run the builder and commit both source and built output.

## Tests

Install Playwright and its Chromium browser, then run:

```bash
python -m pip install playwright
python -m playwright install chromium
python tests/regression.py
```

If using a preinstalled system Chromium, set `CHROME_PATH=/usr/bin/chromium` for this command. CI runs the same checks and verifies that the generated HTML was committed.

The suite exercises 320–768px screens, roving keyboard focus, native modal-free blank selection/cancellation, staging/re-initialization, Block Flip consistency, a valid submitted word and no-JavaScript fallback. **The persistence reinitialization test uses a deterministic browser-storage shim because this test environment blocks page navigation; it is not a real Safari or HTTPS reload test.**

## Accessibility and privacy

- Board arrow keys, Home and End use a single roving tab stop, rather than 225 individual Tab presses.
- Blank letters use an accessible in-page dialog; cancel or Escape leaves no hidden selection.
- Player-selected staged tiles are saved with the rack and validated on rehydration; legacy local saves remain supported.
- Core action controls have a 44px minimum height. Board cells are necessarily smaller on phone screens; the board still needs a complete assistive-technology audit, including grid row semantics, screen reader operation and contrast verification.
- No analytics SDKs, advertising, calls to hosted fonts, or network activity are introduced by this alpha.
- Local game JSON export may contain hidden tile identities, opponent rack and bag state; never publish exported saves indiscriminately. Import handling needs additional untrusted-data security checks before release.

## Not yet finished

Full dictionary, secure guest identities, Cloudflare multiplayer, real-device Safari testing, complete accessibility/contrast evaluation, automated production hosting and long-term offline distribution. Read `docs/TECHNICAL_AUDIT_V7.md` for a precise audit of this cleanup.
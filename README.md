# Jargon

A privacy-first, turn-based word game. **Alpha — not production ready.**

## Play

The complete, self-contained, browser-playable alpha is in [`index.html`](./index.html). No external scripts, advertising pixels, analytics, or accounts are used by this demo. Two people take turns on one device.

**Important on iPhone:** The iOS document/attachment preview may block JavaScript and browser storage. If the board is blank, the file viewer cannot execute the game. The project needs a real HTTPS host; opening the file in Safari (rather than its attachment preview) may help, but this is not a verified iOS deployment. A browser's private/file contexts may also block saving. The JavaScript now guards unavailable localStorage and renders without persistent storage where scripts are permitted.

## Game UI direction

The mobile game screen is **board-first**: compact header, both players' scores, a full 15×15 board with legible bonus squares, seven-tile rack, and controls immediately below. Jargon has two visual themes: Sophisticated (flatter, uniform wooden tiles) and Playful (colored wooden blocks). The screenshot references are inspiration for information hierarchy, not proprietary artwork to duplicate.

## Current scope

- Local hot-seat two-player alpha, move validation and score calculation.
- 15×15 grid, rack, passes, tile swaps, blanks and premium squares.
- Limited starter dictionary **not** the complete ENABLE list.
- Local save/export/reset when browser storage and download APIs permit.
- Server code is not deployed; online multiplayer, authentication, complete dictionary, solo AI, rankings, notifications and tournaments are **not yet available**.
- Automated game-engine tests passed locally (15 tests), but the redesigned interface **has not yet passed a real iPhone visual/interaction test**.

## Development priorities

1. Test mobile usability and script execution in hosted Safari/Chrome.
2. Push modular source, engine tests, and Cloudflare Worker code into GitHub and enable automated tests.
3. Integrate a versioned public-domain word list; audit rules and scoring.
4. Implement and independently verify private multiplayer, guest identity, export/deletion and abuse protections.
5. Test and publish the privacy policy before a production release.

## Hosting

This is a public GitHub repository, **not an already-deployed game**. A repository root `index.html` is in place for static hosting. GitHub Pages can be configured under the repository's **Settings → Pages** to deploy from `main` / root. Do not announce a hosted URL until the deployment succeeds.

Privacy note: a web host may produce network and security logs; absence of embedded analytics does not imply the hosting provider processes no request data.

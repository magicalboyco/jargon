# Jargon painted-block brand finish — visual review

## What was implemented

- A six-block JARGON wordmark using hand-painted-style red, yellow, green, and blue borders, inset cream faces, faux wood edges and heavyweight serif letters.
- A calmer Sophisticated gameplay theme: precisely uniform natural-wood tiles, shallow recessed ivory faces, delicate wood grain, warm score cards, and restrained board bonuses.
- A substantially more dimensional Playful theme: colored enamel-like borders, warm wood sides, inset ivory faces, stronger letter contrast, and gentle depth.
- Coordinated updates to board surround, score strip, rack platform, and gameplay buttons.
- No external dependencies, remote fonts, trackers, requests, or changes to gameplay rules.

## Typography and licensing caveat

The UI references Cooper Black's rounded, heavy display personality, but **does not bundle Cooper Black or Fraunces**. It relies on available device display-serif fallbacks plus carefully tuned text strokes. The logo and tile letters therefore vary somewhat by platform. This is intentional until an approved, properly self-hosted/licensed font solution is implemented and its distribution rights are confirmed. No third-party Google Fonts request is made.

## Browser checks performed on this exact revision

Headless Chromium via installed Playwright and system Chromium, using `page.set_content()` with responsive mobile viewports:

| Check | 375×812 | 390×844 |
|---|---|---|
| 15×15 grid / 225 cells | PASS | PASS |
| Seven rack tiles | PASS | PASS |
| No page JavaScript exceptions | PASS | PASS |
| Rack tap and center-square placement | PASS | PASS |
| Theme switch to Playful | PASS | PASS |
| No horizontal page scroll | PASS | PASS |
| Board remains visible | PASS | PASS |
| Primary controls inside initial screen | PASS (bottom 681px) | PASS (bottom 698px) |

JavaScript disabled: PASS — 225-cell static board and a readable warning.

Screenshots were generated for both viewport sizes and both themes, but are **not included as repository image binaries** in this PR due to the available connector's text-only file write interface.

## Acceptance limits and remaining work

- This is a design pass to the **local two-player alpha**, not a functional multiplayer release.
- Real iOS Safari and in-app attachment viewer behavior **have not been tested**.
- The screenshot tests confirm layout, not visual acceptance by the product owner.
- The existing starter dictionary is incomplete; the game engine still needs a full rule/dictionary audit.
- Font rendering is currently platform dependent. For a consistent production brand, evaluate permitted self-hosted OFL options such as Fraunces with a preserved license notice. Do not add a third-party font CDN.
- Screenshots are local test artifacts; no hosted public deployment has been verified.

## Reproduction

Use the repository's `tests/mobile_smoke.py` (added by the preceding mobile UX PR) to run Chromium smoke checks. The brand-finish changes do not alter engine logic.

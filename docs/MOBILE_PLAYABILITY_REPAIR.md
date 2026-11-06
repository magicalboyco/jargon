# Jargon mobile playability repair

## User-reported failure
The November 5 screenshot showed the game inside an iPhone's HTML attachment/document preview. The static board painted, but there were **no rack tiles**, no functional gameplay, and the square borders were harsh. An iPad-like viewport also expanded the board so far that the controls fell below the visible screen.

## Changes
- Clear **Preview only** overlay, visible without JavaScript and hidden after successful interactive initialization. This avoids an apparently working but inactive board.
- Softer board tray, low-contrast recessed cells, fewer harsh border strokes, more restrained premium colors.
- Compact grid and rack, with controls within the initial viewport at 375x812, 390x844, 768x1024 and 1024x1536.
- Tablet breakpoint constrains the game width based on available viewport height, not just width; no unrelated services, ads, tracking or fonts added.
- Preserves local Classic and Block Flip engines and two visual themes.

## Automated evidence
Browser rendering via local Playwright `page.set_content()` and headless system Chromium:
- PASS 375x812, 390x844, 768x1024, 1024x1536: 225 cells, 7 rack blocks, JS initialization, no horizontal scroll, controls within viewport, rack-to-board placement.
- PASS headless Chromium deterministic word **AT**: both tiles placed, score increases, committed tiles visible.
- PASS JavaScript-disabled: static 225-cell board and a prominent overlay explaining the preview is not playable.
- **Not verified**: physical iPhone/iPad Safari; native attachment viewer execution; persistent game saves after a real HTTPS navigation. Attempts to run a local HTTP navigation were blocked by the test sandbox; no hosted-game check was completed.

Run: `python -m pip install playwright && python -m playwright install chromium && python tests/preview_and_layout.py`.

## Critical limitation and next action
The attachment itself cannot be made playable when the host document preview prohibits JavaScript. The correct solution is to **host Jargon as a website**, and open the resulting HTTPS address in Safari. The static preview overlay prevents confusing an inert preview with the real game.

The present repo's `main` still lacks several dependent draft-PR features. This branch is based on `feature/block-flip-player-first`, which includes the earlier design branches; merge/retarget PRs in order.

Recommended staging: configure GitHub Pages for the reviewed static build or a dedicated test branch, test its exact HTTPS URL on a real iPhone, and capture actual device screenshots before declaring the issue fixed.

## Remaining product work
Production dictionary, actual online multiplayer, strict save-import validation, accessibility audit, iOS Safari verification, offline packaging and self-hostable longevity plan.

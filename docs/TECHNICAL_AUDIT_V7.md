# Jargon technical audit response — v7

## Verified improvements

1. **Source organization:** separated engine, dictionary, UI, CSS and static HTML shell; `tools/build.py` creates a standalone, offline-compatible `index.html`. These are bundled source fragments, **not separately loaded ES modules**; this preserves attachment compatibility and network independence.
2. **CSS maintainability:** removed **493 redundant declarations** with identical selectors and media contexts, preserving original rule order; merged five base `:root` blocks into one consolidated 34-variable block. Style selectors still need fuller design-system consolidation and design review.
3. **Blank tile cancellation:** replaced native `prompt()` with a labeled in-app dialog and A–Z select. Cancel, Escape and submit have explicit state transitions and tests.
4. **Keyboard grid:** one roving board-cell tab stop, arrow keys and Home/End. Focus survives board updates. Full ARIA grid semantics and assistive technology verification remain unfinished.
5. **Save-state integrity:** stage and flip states now serialize together using a versioned `{version:2,game,draft}` envelope and validate staged coordinates, IDs, ownership and uniqueness before restoration. Previous legacy unwrapped saves migrate. This prevents lost staged placements on reload. It does **not** establish the audit's claim that tile duplication previously happened; existing code kept staged tiles in the rack.
6. **Touch controls:** primary action buttons have a minimum 44px height; 320px portrait rendering is regression-tested. Dense 15×15 board squares cannot individually reach 44px on a phone without zoom/pan.

## Technical accuracy corrections

- The audit conflates **44×44 CSS px** with WCAG AA. WCAG 2.2 AA (2.5.8) is 24×24 with spacing and other exceptions; 44×44 is enhanced AAA criterion 2.5.5. We target 44px for major controls but must evaluate board accessibility holistically.
- The starter dictionary currently uses a small `Set` constructed on load. Without performance measurements, claiming this causes an impactful UI stall is speculative; the production lexicon will need benchmarking and versioning.
- A real native iOS file preview is not a viable runtime environment if it disables JavaScript. Always test in a hosted browser, ideally Safari over HTTPS.

## Tests executed

Headless Chromium (Playwright) on 320×720, 375×812, 390×844 and 768×1024:
- 225 board squares, seven rack tiles, no JS errors or horizontal overflow.
- One board tab stop; arrow/Home focus navigation.
- Blank cancel clears selection; blank letter choice is staged and rehydrated.
- Stage, recall, Block Flip and next document initialization preserve tile identity without duplicate IDs.
- Complete opening move AT is accepted and scored; committed tiles remain visible.
- JavaScript-disabled static board and warning remain.

**Limitation:** browser sandbox forbids HTTP/data navigation. Persistence tests reinitialize the HTML document using a controlled `window.name` localStorage shim. No physical iPhone Safari or live HTTPS test was conducted. Visual screenshots from Chromium do not replace real-device approval.

## Next engineering gates

- Migrate to independently testable ESM or TypeScript modules with a real production bundler, while keeping a standalone offline output.
- Integrate and license/version a complete dictionary; test rules, cross-words and adversarial saves systematically.
- Full screen-reader/keyboard/contrast/touch target audit and fix remaining grid semantics.
- Secure online guest identity, private rack transport, authoritative server rules, retention/export/deletion.
- Validate and sanitize imported game JSON with a strict schema and size/time limits before exposing production imports.
- Self-host a legally usable brand typeface rather than relying on device-local Cooper Black / Georgia fallback.
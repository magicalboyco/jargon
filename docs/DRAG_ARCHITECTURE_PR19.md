# PR19: Pointer drag and directional cursor architecture

- Browser Pointer Events only. Capture the primary pointer on the origin tile; a 9 CSS px threshold separates tap from drag.
- At activation, show one floating tile portal; update its CSS transform at most once per animation frame rather than changing layout coordinates on every pointer event.
- Hit-test with `document.elementFromPoint`, excluding occupied squares. Only change hover highlighting when the square changes.
- Cleanup is mandatory on `pointerup`, `pointercancel`, `lostpointercapture`, and `window.blur`. Remove transient window listeners and visual nodes, cancel pending animation frames, release capture when held.
- `touch-action` must be declared before the pointer starts; setting it after `pointerdown` does **not** change Safari's active gesture. Restrict it to tiles and retain pinch zoom elsewhere. Browser touch cancellation must be tested physically.
- Cursor first tap sets horizontal, second tap on the same empty cell toggles vertical. SVG arrow uses a decorative, aria-hidden inline icon; accessible square label communicates direction.
- Rack tap with an active cursor stages exactly at its location and advances along the selected axis, skipping locked board squares and staged tiles. Drag remains free-placement with no cursor requirement.
- Keep all game rules, dictionary checks, crosswords, and scoring in `src/engine.js` unchanged.
- `navigator.vibrate(5)` is progressive enhancement only. iPhone Safari does not reliably support `navigator.vibrate`; do not promise physical haptics there.
- Unit/Playwright checks verify vertical AT through center DW = 4, TEN with BE and AN crosses = 7, unchanged official scores before submission, and cancellation cleanup. These browser tests do not constitute physical iPhone QA.
- Remaining scope: rack drag-to-reorder and drag-back precision recall, plus physical iOS/Android QA. Block Flip second-finger gestures should be a separate accessibility-tested experiment.

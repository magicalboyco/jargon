# Jargon Workshop — tactile feel PR13

## Purpose
Turn the existing game into a more convincingly physical toy without adding tracking, network dependencies, per-cell filter pipelines, or changes to the score/dictionary engine.

## Materials
- The game board is a **carved birch tray**: layered warm-wood gradients, deep inside-lip shadow, recessed cream cells, quiet contrasting bonus squares.
- Both Sophisticated and Playful have realistic wood thickness and polished ivory letter faces. Playful retains stronger painted enamel edge colors; the board stays neutral.
- Shaders are lightweight CSS gradients and inset shadows, not animated SVG turbulence applied to 225 squares. Only interaction-specific tiles animate.
- The existing self-hosted SIL-OFL-licensed Fraunces display font and full pinned ENABLE2K dictionary remain intact.

## Kinetic interaction
- Place a new tile: one **kinetic-drop** squash-and-spring, only on that placement, never replayed on unrelated renders.
- Flip in Block Flip mode: one perspective Y-axis rotation with alternate face revealed; scoring still follows the engine, no post-submit flipping.
- Shuffle: unbiased Fisher–Yates order plus staggered physical lift animation.
- Successful word: ephemeral +points badge above the move with score pulse, followed by handoff after ~690ms; the **next player's rack stays hidden** throughout the flourish.
- Reduced motion: disables decorative animations, and changes handoff to immediate.
- Haptics: opt-in and **off by default**, local-only preference; hidden entirely when navigator.vibrate is unavailable. Tiny pulses for pick/drop/flip/shuffle/success/error if supported; reduced-motion mode suppresses pulses. Safari on iPhone may not support vibration; gameplay never depends on it.
- Existing visual alerts and accessible status messages remain primary feedback, so no animation or vibration is necessary to understand the result.

## Verification
Run:
```
python tools/build.py
python -m pip install playwright
python -m playwright install chromium
python tests/regression.py
python tests/workshop_visual.py
python tests/dictionary_smoke.py
python tests/typography_smoke.py
python tests/kinetic_workshop.py
```
The last test covers 320x720, 375x812, 390x844, 768x1024, 1024x768, both themes, no horizontal overflow, 44px+ controls, one-shot animation classes, optional vibration, actual scoring, privacy-safe handoff, and reduced-motion behavior.

## Real-device and deployment limits
These are **Chromium browser-emulated** tests only. Physical iPhone Safari, Android Chrome vibration, VoiceOver, performance on low-end phones, and hosted HTTPS persistence need real-world verification. An HTML attachment/document viewer may continue blocking JavaScript.

GitHub Pages currently serves the branch chosen in repository Settings > Pages. This PR does not automatically reconfigure the public Pages deployment. To review this PR's actual JavaScript on iPhone, a repository administrator must switch the Pages source to `design/kinetic-workshop-pr13` (root) after CI passes, or use another approved staging host. No production deployment is claimed.

## Dependencies and acceptance
This is a stacked draft PR based on PR #12, which itself depends on prior reviews. Do not merge directly to main, and do not call it public-launch ready. Before accepting the materials, review both theme screenshots and test on a physical device.

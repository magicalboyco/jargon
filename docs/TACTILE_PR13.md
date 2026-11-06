# Jargon PR13 — tactile polish and optional haptics

This is a deliberately scoped visual and interaction improvement to the local alpha, based on PR #12.

## Material system
- Warm carved birch tray with subtle inner lip shadow, recessed empty cells and lower-contrast bonus spaces.
- Lacquered painted wood-block rims and inset ivory faces in Playful mode; refined wood finish preserved in Sophisticated.
- Lightweight gradients and layered CSS shadows instead of per-cell SVG filter turbulence.

## Interaction effects
- A newly staged tile briefly squashes and springs into its cell. Effects are triggered by a particular placement; they do **not** replay every time the whole board redraws.
- Flipping an eligible Block Flip rack tile triggers a 3D-feel face turn and the correct new letter/point face.
- Shuffling uses unbiased Fisher–Yates (instead of Array.sort(random)) and shows a staggered rack wave.
- After a successful scoring move, a decorative +score cue appears over the last placed square once the between-turn dialog closes.
- The score cue is aria-hidden because the existing live-region move confirmation already announces the result.
- Tactile vibration is **off by default**, opt-in in the Rules dialog, guarded by support checks, and disabled when reduced motion is requested. This is not available in iOS Safari; animations remain the core cross-platform feedback.
- All controls, Block Flip rules, the pinned ENABLE2K word list, the offline self-hosted Fraunces font and local game saves remain functional.

## What was verified
The real CI runner executes `tests/tactile_smoke.py`, prior gameplay regression, visual and dictionary tests. Checks include 320/375/390/768 CSS-pixel widths, staging a tile, shuffling, flip state, JS-blocked fallback and reduced-motion behavior. No claims about device Safari/haptics are made.

## Hosted preview
The project has previously had a successful GitHub Pages deployment of branch `design/workshop-tactile-v8`. That is **not** this PR13 build. Pages publishing source cannot be changed with the current GitHub connector; an owner can choose `design/pr13-tactile-motion` in **Settings → Pages → Build and deployment** after CI review. This will be publicly viewable; use only sample games. The application needs real HTTPS Safari tests before a user-facing release.

## Still not commercial-grade
Secure multiplayer, full save-import schema validation, complete privacy/security review, genuine physical iPhone/Android performance checks, VoiceOver and contrast audits remain release blockers.

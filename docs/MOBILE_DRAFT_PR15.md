# PR15 — mobile ergonomics and draft feedback

Built on PR #14 without changing the scoring rules, distribution, or on-device privacy architecture.

## Behavior
- The 15×15 board and seven-tile rack use `touch-action: pinch-zoom` to avoid inadvertent swipe scrolling while preserving pinch zoom. Other document areas retain ordinary scrolling. No gesture handler calls `preventDefault()` globally.
- A second tap on the same rack tile within 400ms can place it automatically. On a fresh board the first tile is placed on the center square. An existing *horizontal staged word* can extend rightward, then leftward. The feature refuses to guess where to play on an established board with no draft. Native blank-tile selection remains available.
- The normal one-tap select + tap-square flow is unchanged. There is no requirement to use double-tap, so keyboard and assistive technology players retain access to all moves.
- The preview runs the **existing pure `play()` rules engine** with a fixed RNG for simulated bag refill. It uses the game’s pinned dictionary version, validates connectivity and all cross-words, and computes actual bonuses and bingo points. The official state and scoring are unchanged until Play Word is pressed.
- Incomplete or invalid drafts show a short reason. The user can adjust tiles rather than submit first.

## Limitations
- This is a conservative helper, **not a full AI placement solver**. It does not auto-place on a board that already has words and no draft; future improvements should use an explicit placement direction UI.
- Touch behavior still requires physical Safari, VoiceOver and Android validation. The board squares on narrow phones cannot individually reach 44px; the accessible roving focus implementation remains required.
- Dynamic preview invokes the full rules engine on each rerender. Measure actual device latency before shipping publicly; the board is 15×15 and the dictionary lookup is in memory.

## Tests
`python tests/mobile_draft_smoke.py`: browser-emulated sizes 320/375/390/768, true versus simulated score, valid/invalid dictionaries, deterministic repeated taps, no unauthorized auto-placement, no premature score change. CI rechecks all earlier offline, accessible and responsive behaviors.

## Hosted preview
PR15 is a stacked draft, not a publicly deployed or merged release. To verify physical iPhone behavior, an authorized repository owner can switch the Pages publishing branch to `feature/pr15-mobile-draft-feedback` under Settings → Pages after CI passes. Be aware GitHub Pages staging is public and will replace the existing Pages preview. Do not treat the static hosting as secure multiplayer infrastructure.

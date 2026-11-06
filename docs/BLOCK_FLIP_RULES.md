# Jargon Block Flip — Experimental Rules (alpha 2)

**Status:** prototype. Subject to playtesting and balance changes. This document applies to the `blocks` ruleset, not Classic.

## Aim
Build legal connected words on the same 15×15 board, using seven tiles per turn. The game uses Jargon's existing original bonus grid and +40 seven-tile bonus. The current **starter** dictionary is incomplete; it is *not* the final published dictionary.

## Flip rules
- Each of the 104 physical blocks has a primary letter and point value. Most also have a fixed alternate letter printed on the other face.
- A player may flip any eligible nonblank tile **free of charge** in the rack, before placing it. You can recall a staged tile and flip it before resubmitting.
- A flip changes exactly **one letter** into exactly **one letter**. **X → S**, not "EX": multi-letter blocks would break ordinary placement and crossing logic.
- The alternate face is worth `max(1, floor(primary value / 2))` points. Blanks remain blank and worth zero.
- Selected/placed flipped tiles have a visible rotation cue and reduced number, but the word validation logic uses the alternate letter.
- Once a word is committed, the submitted face and value are locked. Existing board tiles cannot flip.
- When you swap a tile, its flipped state is reset as it returns to the tile bag.
- **Endgame rack deductions use primary point values** even for a currently flipped rack tile. This avoids a free last-moment score reduction by flipping a losing rack.
- Both players must agree on the same ruleset at game creation. The local prototype offers a selector that starts a **new game** after confirmation; it never converts an in-progress Classic game.

## 104-tile distribution
| Primary | Count | Base | Flipped score | Alternate |
|---|---:|---:|---:|---|
| Blank | 2 | 0 | 0 | None |
| E | 13 | 1 | 1 | A |
| A | 9 | 1 | 1 | E |
| I | 8 | 1 | 1 | O |
| O | 8 | 1 | 1 | U |
| T | 7 | 1 | 1 | D |
| R | 6 | 1 | 1 | S |
| S | 5 | 1 | 1 | Z |
| D | 5 | 2 | 1 | T |
| N | 5 | 2 | 1 | M |
| L | 4 | 2 | 1 | R |
| U | 4 | 2 | 1 | I |
| H | 4 | 3 | 1 | W |
| G | 3 | 3 | 1 | K |
| Y | 2 | 3 | 1 | I |
| B | 2 | 4 | 2 | P |
| C | 2 | 4 | 2 | K |
| F | 2 | 4 | 2 | V |
| M | 2 | 4 | 2 | N |
| P | 2 | 4 | 2 | B |
| W | 2 | 4 | 2 | H |
| V | 2 | 5 | 2 | F |
| K | 1 | 5 | 2 | C |
| X | 1 | 8 | 4 | S |
| J | 1 | 10 | 5 | G |
| Q | 1 | 10 | 5 | U |
| Z | 1 | 10 | 5 | S |

**Total: 104 blocks.** The two blank blocks have no alternate face.

## Open questions before v1
- Flipping 1-point vowels carries no actual point cost because the minimum is 1; this may substantially increase the number of playable moves. Run balance tests against Classic before releasing ranked Block Flip games.
- Alternate pairs are asymmetric (e.g. R → S, but S → Z), by design. Confirm players understand this.
- Determine whether unrestricted flipping should remain free or get a per-turn/per-game allowance; test both against actual players.
- Clarify whether sound/animation should occur (opt-in and reduced motion respected).
- Complete rigorous dictionary, cross-word scoring, tile conservation, concurrency and saved-state validation tests.

## Current implementation scope
Local hot-seat prototype in `index.html`; offline and no external trackers. Online multiplayer, server-side anti-cheat, a versioned full dictionary, and a solo opponent are **not shipped**. The same theme switch applies to Classic and Block Flip; the theme does not affect rules.

## Reproducible development
```bash
python -m pip install playwright
python -m playwright install chromium
python tests/block_flip_smoke.py
```

# Familiar controls, private by default

Jargon should feel immediately approachable to people who have played Words With Friends or other crossword-tile games, without copying proprietary art, accounts, board data, or network APIs.

## Control contract

- Drag a rack tile to an unoccupied board square.
- Drag an unsubmitted tile between legal empty squares or back to the rack.
- Drag tiles within the rack to reorder them; shuffle remains available.
- Tap a square, then a tile to place it; tap the same square again to switch Across/Down.
- **Keyboard:** focus a board square, then type a letter. Jargon uses an available matching rack tile, falling back to a blank and opening the existing picker preselected to the typed letter. It never conjures a letter the player does not hold.
- Arrow keys, Home and End navigate board squares. Existing rack keyboard reordering remains supported.
- Only submitted moves update scores and locked game state. Invalid drops leave the draft unchanged.

## Privacy and compatibility boundaries

- No new network calls, analytics, cookies, fingerprinting, cloud services or external libraries.
- Native browser Pointer Events and local game state remain the foundation.
- Switching *habits* from Words With Friends should be easy. Importing a live Words With Friends match or friend list is **not** provided or claimed: that would require authorized access and an independently supported import format.
- Test in hosted iPhone Safari, Android Chrome and desktop keyboard navigation before merging. No claim of physical-device verification has been made.

## Additional QA checks

1. Typing a letter at a focused empty square selects one matching unused rack tile by stable ID.
2. Typing a letter that only an unused blank can represent opens the accessible picker with that letter selected.
3. Typing a letter not held in the rack does not change the board or score.
4. Typing while a square is occupied, swapping is active, the game is finished or a dialog is open must not alter the game.
5. Drag cancellation, invalid targets, tile recalls and rack reorders do not mutate a submitted turn.
6. Check 320, 375, 390 and 768-pixel layouts and iOS Safari gesture behavior.

The new keyboard handler is deliberately contained in `src/ui.js` and routes placement through the existing `placeSelected` function; rules and scores remain owned by the game engine.

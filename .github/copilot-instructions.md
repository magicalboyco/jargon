# Jargon — GitHub Copilot repository instructions

## Product mission
Jargon is an original, privacy-first, turn-based word game for phones, tablets and desktops. The product should deliver a professional, fast, accessible word-game experience with familiar crossword-game affordances, without copying another game's branding, artwork, proprietary interface or code. No advertisements, behavioral tracking, data mining, contact uploads, pay-to-win features or compulsory email/social login.

## Current repository state
- `index.html` is an early self-contained hot-seat alpha, NOT production code and NOT a satisfactory UI benchmark.
- The prior build appeared as a large empty brown board in an iPhone document preview; this may be related to JavaScript restrictions in the preview. Do not assume the layout works on real iPhones until verified in hosted Safari.
- A compact, board-first redesign has been attempted, but has not undergone a real-device acceptance test.
- The current word list is an incomplete starter set. Multiplayer, AI, notifications, leaderboards and tournaments are not released or live.
- Never present scaffolded features as finished or claim tests/deployments that you did not run.

## Visual direction and hard usability requirements
- Two themes using one shared gameplay engine and identical state:
  1. **Sophisticated (default during games):** uniform, near-flat natural-wood square tiles, subtle low-contrast wood grain, Cooper Black-inspired thick rounded serif letterforms, small legible point values, clear premium-square markings. Avoid licensing violations: use a properly licensed font or original glyphs.
  2. **Playful:** dimensional nostalgic toy-style wooden alphabet blocks, painted red/yellow/green/blue borders, rounded wood edges, same readable friendly letters.
- On a typical 375–430 CSS-pixel iPhone width in portrait, the complete 15×15 board must be visible without horizontal scrolling and the seven-tile rack and primary controls should be immediately reachable. Do not force the player to scroll past marketing copy to play. Use compact, meaningful headers.
- The game UI hierarchy is: player scores/turn status, move status, dominant full 15×15 board, seven tile rack, primary action(s), secondary actions. Make the board immediately visible.
- Prioritize precise square grid alignment, consistent tile dimensions, legible text at small sizes, safe-area insets, touch targets, keyboard interaction, screen-reader labels, zoom, contrast and reduced motion.
- Use visual references to inform information hierarchy only; do not duplicate Words With Friends/Zynga styling, trade dress, logos or exact premium-square layout.
- Do not over-design with giant cards, oversized headings, huge padding, gradients or decorative marketing text on the game screen.
- Provide screenshots at 375×812 and 390×844 as evidence for every major mobile layout change. Use real browser rendering (Playwright/WebKit where available). If browser test isn't possible, explicitly report that limitation.

## Game rules and engine
- Independent, deterministic TypeScript rules package; 15×15 board; seven-tile rack; original premium-square layout, original documented tile distribution and scores.
- First word crosses center; later words connect orthogonally; horizontal or vertical placements only. Validate contiguous placement, all new cross words, tile ownership, blanks, word list and turn ownership.
- Apply letter and word bonuses ONLY to newly placed tiles; correctly multiply cross words, award published seven-tile bonus (initial proposal 40), handle swaps, passes, resigns and documented terminal conditions.
- Server is authoritative about all moves, rack contents, tile bag, randomness, scores, and game endings. Never trust user-supplied scores.
- Pin a public-domain word list (ENABLE is proposed), publish provenance and dictionary version; do not rely on remote advertising-backed dictionary APIs.
- Test edge cases rigorously: perpendicular crossings, intersecting bonuses, blanks, running out of tiles, swap restrictions, scoreless turns, invalid moves, and deterministic game replay.

## Privacy/security engineering
- Secure guest-first identity (nonpublic random ID plus protected credentials), optional recovery, pseudonymous display names.
- Unpredictable, expiring, revocable invite tokens; a game ID or shared link must not provide unrestricted private-state access. Restrict every API response to the authenticated player's permitted state.
- Opponent rack, bag order, private credentials and invite secrets never exposed in browser, response payload, logs, analytics or URLs unnecessarily.
- Use cryptographic randomness for production tile shuffling; validate inputs; enforce authorization and abuse rate limits; apply idempotency keys / state versions to prevent duplicate turns.
- Avoid third-party trackers, external fonts/scripts calling unknown hosts, advertising SDKs, session replay and analytics without explicit written design approval.
- Give players export and deletion features, define retention clearly, and disclose that infrastructure/security logs or provider backups may have different retention.
- Do not claim 'zero data collection': essential match data and host network processing are unavoidable for online play.
- Explicitly review Cloudflare Workers logging defaults and Durable Object recovery/retention settings before deployment.
- Push notifications opt-in only and revocable; rankings/tournaments opt-in with a separate privacy assessment.

## Target architecture
- Prefer TypeScript, React/Vite or comparable maintainable setup with separated packages for engine, UI and dictionary, and a Cloudflare Workers API.
- One SQLite-backed Cloudflare Durable Object per match when online play is implemented, maintaining authenticated player-specific views and durable turns.
- The local/offline mode should work independently of cloud API and should not break while refactoring.
- Add dependency lockfiles, format/lint/typecheck, unit/integration/e2e tests and CI. Avoid unnecessary frameworks, services and costs.
- NEVER commit secrets; avoid unrelated repositories or destructive migration without authorization.

## Priority order and pull-request discipline
1. **P0 mobile usability:** hosted, visible, legible 15×15 board; immediate rack, controls and safe-area support. Fix any blank board; detect failed JS and show a useful error rather than blank canvas.
2. **P0 modular engine and tests:** extract from monolithic HTML without changing game behavior; establish deterministic scoring and move validation; improve dictionary.
3. **P0 privacy/identity architecture:** document data inventory, guest identity, security constraints, export/deletion, logging and retention.
4. **P0 authenticated private multiplayer:** secure invites, separate rack views, robust retries and reconnection, two-device end-to-end tests.
5. **P0 release quality:** accessibility, mobile verification, plain-language rules/privacy documentation, CI, deployed HTTPS preview.
6. **P1:** fair solo computer opponent and opt-in notifications.
7. **P2:** optional pseudonymous rankings and tournaments.

Work in reviewable focused branches and pull requests; do NOT merge straight into main without review. In every PR explain changes, test commands run and actual results, what was visually verified, potential privacy implications, known limitations, and screenshots or reproducible test steps. If a feature cannot be completed fully, clearly label it incomplete rather than simulating functionality. Prefer fixing fundamentals before adding features.

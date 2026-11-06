# Jargon — Player-First Charter
**Draft, 2026-11-05 · product commitments, not a claim that every feature exists yet**

## Purpose
Jargon is a game people can enjoy, share, and keep playing without surrendering their privacy. Its value comes from the words, the strategy, and the people—not player profiles sold to advertisers or compulsive spending loops.

## Our nonnegotiable principles
1. **Fun before extraction.** No advertising SDKs, behavioral profiling, selling personal data, gambling-style purchases, paid scoring advantages, compulsory streaks, or manipulative countdowns.
2. **Private by default.** The offline game needs no real name, email, address book, or identity account. Online play must use pseudonymous guest identity and restrict private racks, move logs and invitations to authorized participants. Necessary hosting/network/security processing must be disclosed accurately.
3. **Fair rules, published openly.** A versioned dictionary, point distributions, scoring, premium squares, modes, and changes are documented. Every paid or cosmetic feature leaves competitive rules unchanged.
4. **Keep playing if the service stops.** Offline local games should remain playable without Jargon servers; offer downloadable standalone builds and save export/import. Plan eventual **sunset support**, including a well-documented offline fallback and, if feasible, self-hostable online play, instead of deliberately disabling purchased functionality. Do not promise that an unsupported browser or device will last forever.
5. **Own your memories and saves.** Players can inspect/export their local saved games in an open documented format and delete their local data. Online games will require account-aware export, deletion and retention with appropriate rights of other participants.
6. **Respect creators.** Credit licensed assets and word lists; use appropriately licensed fonts and artwork; favor maintainable work over opaque dependence on locked-down services. Avoid copied brands or protected trade dress.
7. **Accessible by design.** Controls should work by tap and keyboard, not require precision dragging or color perception, and honor reduced motion and screen readers.
8. **Transparent costs.** If hosting requires revenue, favor a one-time supporter purchase or voluntary cosmetics; never monetize vulnerability or play pressure.
9. **No false claims.** An offline alpha is not online multiplayer; a headless Chromium pass is not a real iPhone Safari pass. Publish real tests, limitations and security findings.

## Architectural requirements flowing from the charter
- Preserve a pure game engine independent of the network, UI, storage and hosting platform.
- Export/import JSON with schema versioning and migration; treat imported data as untrusted.
- No external analytics/fonts/scripts by default; self-host licensed assets with attribution.
- Hosting logs and provider backups require separately documented retention.
- End-of-life policy and tested offline continuity must be part of the release plan.
- No compulsory online connection for local/solo play.
- Use cryptographic randomness, signed authorization, and server-enforced rules in multiplayer.
- Every optional privacy-impacting feature (push, rankings, tournaments, chat) receives a dedicated data inventory and opt-in design review.

## Implemented in the local alpha as of this branch
- Local hot-seat game with no external network dependencies.
- Export and basic import of JSON saves, and user-initiated local reset.
- Classic and experimental Block Flip rulesets with two independent art themes.
- No third-party tracking or advertising scripts in the standalone HTML.

## Still required before public promises
- Full/versioned word list and production dictionary licensing.
- Independent security review and robust validation of save imports.
- Durable private asynchronous multiplayer and authenticated access control.
- Real-device Safari/accessibility tests.
- Automated build of offline releases and a written sunset plan.
- Transparent online deletion/retention and privacy policy.
- Solo offline opponent and documented data migration.

## Evidence informing the mission
The games industry's scale and labor instability are reasons to hold Jargon to these commitments—not marketing claims that Jargon can single-handedly solve the sector.

- Newzoo (June 18, 2026): **$201.6 billion** global games revenue in 2025, updated actuals: https://newzoo.com/articles/global-games-market-2025
- GDC State of the Game Industry 2026: **28%** of surveyed respondents reported being laid off in the previous 2 years, **33%** of U.S. respondents. These percentages describe *survey respondents*, not all developers worldwide: https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/
- Stop Killing Games ECI had roughly **1.29 million validated signatures** as reported January 25, 2026: https://www.pcgamer.com/gaming-industry/final-count-for-stop-killing-games-petition-verifies-1-3-million-of-its-1-4-million-signatures-well-above-the-minimum-to-be-formally-considered-by-eu-politicians/

Avoid unsourced marketing statistics about game delistings, publisher acquisition closure rates or the percentage of online games that become unplayable.

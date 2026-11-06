# Jargon word list — offline ENABLE2K

The game includes a **pinned public-domain ENABLE2K** word list, derived from the historical Enhanced North American Benchmark LExicon release.

## Exact provenance
- Source: [Kromey/boggle-solver enable2k.txt](https://github.com/Kromey/boggle-solver/blob/master/enable2k.txt) (original source fork of ENABLE2K).
- Upstream repository revision: `59f0c70c05cf39fb9e0ebbe38a5a461799ec6cdd`.
- Upstream Git blob (Git SHA-1): `fca301f2bb51f7146f6008876cd9bb85ef1b5426`.
- SHA-256 of raw upstream plain text bytes: `544987e4af4be6c27269eca6d36e7041e3ef931b1bd4fcadb3945aed4e1a8b90`.
- Normalization: match `^[a-z]{2,15}$`, uppercase, no duplicates. 169,266 accepted entries.
- Version in game state: `enable2k-59f0c70-2to15-v1`.
- Data is front-coded in 26 alphabetical ASCII shards in `src/enable/` totaling approximately 715 KB, embedded at build time in the standalone `index.html`.
- Legacy pre-existing local games using `starter-demo-1` still use their original starter dictionary. New matches use ENABLE2K and pin this version.

This word list does **not** automatically accept all contemporary slang, proper names, or online word-game tournament vocabulary. Some familiar two-letter words (including QI/ZA) are not in this exact ENABLE2K snapshot. Jargon will publish a word policy and may add further dictionary versions for new games, but should never silently change accepted words midgame.

ENABLE was released into the public domain for games; original release statement is reproduced in LibreOffice's licensing bundle: https://api.libreoffice.org/share/readme/LICENSE.html .

No browser-side word lookup contacts outside services. Word validation and move scoring happen on-device in this local alpha.

## Build and checks
`python tools/build.py` bundles the pinned local dictionary shards. `python tests/dictionary_smoke.py` verifies completeness, word acceptance, compatibility, and startup time in Chromium.

## Known limits
Dictionary initialization is synchronous and measured at startup; check real low-end mobile hardware before public release. The online server rules validator is a separate pending milestone. A licensed definitions dataset is not included.

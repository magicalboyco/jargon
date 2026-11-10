# Jargon private online matches — service work in progress

This is the first implementation slice for real **two-device, asynchronous, guest-invited matches**. It does not claim the Jargon browser game has an online mode yet.

## Architecture

- **Cloudflare Worker:** Accepts narrowly scoped match API requests. No analytics libraries, external accounts or contact uploads.
- **One SQLite-backed Durable Object per match:** Owns the authoritative game state and serializes all moves for that match.
- **Shared Jargon engine and dictionary:** `python online/build.py` bundles the *same* `src/engine.js`, local ENABLE2K shards and version-pinned dictionary used by the offline game. Client-submitted scores or board snapshots are never trusted.
- **Private per-player keys:** The host and guest receive separate cryptographically random keys. Only their SHA-256 digests are saved in the match record. The server returns `viewFor(game,player)`, which contains that player's rack, not the opponent's.
- **Optimistic versioning and idempotency:** A move must supply the current match version and a unique request ID. Stale turns are rejected; retrying a successful request ID does not replay the move.
- **Deletion and expiry:** The host can delete a match. Inactive matches expire after 30 days and use a Durable Object alarm for cleanup. Platform backups and infrastructure logs still need a transparent retention-policy review.

## HTTP contract (v1)

- `GET /v1/health`: read-only readiness.
- `POST /v1/matches` with `{mode,name}`: creates a match, returns `matchId`, `hostKey`, and `guestKey`. **Disabled unless MATCH_CREATION_ENABLED=true.**
- `POST /v1/matches/:id/join` with guest Bearer token and `{name}`: join or reconnect.
- `GET /v1/matches/:id` with either Bearer token: get a redacted view of the latest authoritative state.
- `POST /v1/matches/:id/moves` with Bearer token and `{version,requestId,move}`: submits a legal engine move.
- `DELETE /v1/matches/:id` with host Bearer token: delete match.

An invitation UI should send the guest key in the URL **fragment** rather than a query parameter, then move it into device-local storage. A player key should be supplied via `Authorization: Bearer`, not in the request URL.

## Run checks

```bash
python online/build.py
node --check online/dist/worker.mjs
node tests/online_protocol.test.cjs
```

The protocol test uses a mock Durable Object/engine to exercise token authorization, rack secrecy, version conflicts, duplicate submissions, turn order and deletion. Existing engine tests verify word rules separately. **Real Cloudflare integration and physical two-device play have not been tested.**

## Production gates before enabling invitations

1. Deploy the Worker and SQLite Durable Object in a dedicated staging environment; verify provisioning and account permissions.
2. Install endpoint rate limiting / abuse protection, particularly for public match creation; keep `MATCH_CREATION_ENABLED` off until then.
3. Implement a Jargon front-end for remote matches using the redacted view (do not expose or copy the full `state.racks` object).
4. Test two independent browsers: create, join, play, pass, swap, reconnect, blank tiles, Block Flip, crosswords, stale-turn rejection and deletion.
5. Test real-device Safari and Android and compare every scoring action with the offline game engine. Review Cloudflare's logs, storage retention and abuse safeguards before final privacy claims.
6. Add optional notifications only with an explicit user opt-in and a separately reviewed privacy design.

This draft intentionally does **not** alter existing local or computer play, and is not a deployed online multiplayer service.

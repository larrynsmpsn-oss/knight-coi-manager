# Knight COI Manager Phase 2 Plan

## Goal
Move from a seeded local MVP to a pilot-ready system with:
- real mailbox/provider ingestion
- Postgres-backed runtime persistence
- harder edges around deployment and operations

## Immediate sequence
1. **Runtime config**
   - centralize DB + import-path env settings
   - stop relying on implicit demo defaults everywhere
2. **Postgres runtime path**
   - add a real repository adapter behind the current boundary
   - start with read-side repository methods and expand to writes
   - first write target: imported inbound messages + attachments
   - route provider-normalized imports into that repository path
   - use the seed-export path as bootstrap/migration support
3. **Mailbox/provider ingestion**
   - add file/import directories and import workers around Apple Mail / Gmail / Exchange exports
   - support one-file and directory-based provider import flows
   - track already-imported files so batch ingestion can resume safely
   - persist imported messages instead of only hydrating demo state
4. **Pilot hardening**
   - deployment notes
   - env examples
   - logging/error handling expectations
   - safer import/review operator flow

## Phase 2 guiding principle
Keep reusing the current business logic and browser workflow where possible.
Do not restart from scratch just because the storage layer changes.

## First concrete steps completed
- Added `src/lib/runtime-config.js` for DB + ingestion env settings
- Wired the server to the centralized runtime config
- Added `.env.example` for phase-2 setup
- Added tests for runtime config defaults and overrides

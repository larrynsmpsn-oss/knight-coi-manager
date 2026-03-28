# Knight COI Manager Tasks

## Now
- [x] Keep reusable intake/matching/reminder logic green with tests
- [x] Add a demo API surface for overview, entities, certificates, inbox, and review queue
- [x] Capture current status in Markdown for workspace/Obsidian backup

## Next
- [x] Add review decision service layer (`accept`, `assign entity`, `reject`, `supersede`)
- [x] Add tests for review decisions changing certificate/reminder state
- [x] Add persistence adapter boundaries so the demo state can move from seed data to database-backed storage later
- [x] Expose lightweight action endpoints on top of the review decision service layer
- [x] Define minimal certificate validity rules for MVP acceptance
- [x] Add CSV/entity roster import path for Knight tenant/vendor onboarding
- [x] Wire roster import into the demo API / persisted workflow
- [x] Surface validity checks/warnings in the demo API/UI
- [x] Add a simple browser UI on top of the API/actions
- [x] Add persisted inbox import beyond the seeded demo data
- [x] Add a browser-side inbox import panel
- [x] Make validity output more operator-friendly in the UI/data surface
- [ ] Swap the file/in-memory repository for a Postgres-backed implementation
- [x] Add first-pass Postgres repository read layer behind the current data shape
- [x] Add first-pass Postgres write path for imported inbound messages + attachments
- [x] Add a service layer that routes provider-shaped imports into the Postgres repository path
- [x] Add a concrete Postgres bootstrap path (migration + seed export docs)
- [ ] Add mailbox sync + persistent intake storage beyond manual/seeded import
- [ ] Improve UI polish around review resolution history / validity explanations
- [ ] Add a lightweight path to ingest real provider mailbox data (Apple Mail / Exchange / Gmail)
- [x] Centralize phase-2 runtime config for DB + ingestion settings
- [x] Add provider-shaped mailbox JSON import on top of existing mailbox adapters
- [x] Add a lightweight Apple Mail export CLI for local mailbox JSON capture
- [x] Add a lightweight Apple Mail import-to-demo CLI bridge
- [x] Add a generic provider-file import CLI for Gmail / Exchange / Apple Mail JSON
- [x] Tighten the Postgres seed export so it maps closer to the current schema

## Later
- [ ] Swap seeded demo endpoints to real Postgres-backed queries
- [ ] Add mailbox sync jobs for Exchange/Gmail/Apple Mail connectors
- [ ] Add outbound reminder send logging and template variants
- [ ] Add a simple browser UI on top of the API endpoints

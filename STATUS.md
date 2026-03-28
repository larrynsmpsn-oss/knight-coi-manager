# Knight COI Manager Status

## Current MVP state
- Core intake logic is working against seeded Knight demo data.
- Matching, duplicate/renewal detection, reminder scheduling, mailbox normalization, review queue generation, review decision handling, repository persistence, explicit certificate-validity rules, CSV roster import, persisted inbox message import, provider-specific mailbox JSON import, Apple Mail JSON export/import bridge, generic provider-file import CLI support, schema-shaped Postgres seed export, and a thin browser UI are covered by unit tests and live demo checks.
- Local demo server exposes inspectable JSON endpoints for overview, entities, certificates, inbox, review queue, roster import, review history, inbox import, and provider-message import.
- Review outcomes can be exercised through browser controls and action endpoints for accept matched certificate, manually assign + accept, reject intake, reset demo state, import roster CSVs, append imported inbox messages, and normalize provider-style mailbox payloads into the store.
- Demo review decisions, roster changes, and imported inbox messages persist across server restarts by default via `data/demo/demo-store-state.json`.
- Acceptance logic exposes both machine-friendly issue codes and operator-friendly display labels/summaries.
- The browser demo includes review controls, roster import, inbox JSON import, provider-mode import selection, reset, review history, and scan-friendly queue/history summary badges so the MVP can be tested interactively without living only in curl.

## Practical design decisions made
- Keep the near-term MVP server-side and seeded rather than jumping straight into a full UI framework.
- Treat the current web surface as an admin/demo shell around reusable business logic.
- Expose data as simple JSON endpoints first so a future Next.js or other frontend can plug into stable shapes.
- Keep review queue separate from intake processing results, but derived from the same intake pipeline.
- Put a repository boundary under the demo so Postgres can be swapped in later without rewriting intake/review business logic.
- Add manual/imported inbox entry before live mailbox sync so the intake pipeline can be exercised incrementally.
- Reuse mailbox adapters for provider-import so Apple Mail / Gmail / Exchange-shaped JSON can feed the same store without bespoke one-off paths.
- Use a lightweight Apple Mail export/import bridge on macOS as the first step toward real local mailbox intake.
- Keep a simple operator runbook (`REAL_MAIL_IMPORT.md`) so the mailbox bridges are usable without reading source code.

## What was verified
- `npm test` passes (46 tests).
- `npm run demo` passes.
- `npm run export:postgres-seed -- data/demo/knight-demo-seed.sql` writes a runnable demo-state SQL export.
- Action endpoints were exercised locally against a live demo server.
- Demo state persists across restart and can be reset cleanly.
- CSV roster import creates new entities, updates existing ones by normalized name, and reports row-level errors for unknown property/entity-type values.
- A live POST to `/api/roster/import` with `data/demo/knight-sample-roster.csv` updated Aurora and created River City Janitorial as expected.
- The browser demo renders review actions, a roster-import panel, an inbox-import panel, and a reset control.
- Persisted inbox import appends a new message and flows it through the same intake processing path used by seeded sample messages.
- Provider-specific mailbox payloads now normalize through the store before intake; tests cover Gmail-shaped input end-to-end.
- The browser UI now lets an operator choose normalized vs provider-shaped inbox import and select Gmail / Apple Mail / Exchange directly from the page.
- The Postgres export now emits more schema-shaped demo seed SQL with deterministic UUIDs, mailbox rows, attachment rows, and review queue item exports instead of the earlier rough placeholder structure.
- `npm run export:apple-mail-json -- --limit 1 /tmp/knight-apple-mail-export.json` now runs cleanly on this Mac and wrote an empty array for that requested slice.
- The Apple Mail export search was widened from inbox-only to the full account message set; a targeted `--subject COI --limit 5` smoke run still returned no matching messages on this machine.
- The generic provider-file import CLI was verified end-to-end against `data/demo/gmail-sample-message.json`: it imported into the running demo, extracted `Apex Mechanical Services`, and matched it to the correct entity.
- A sender-filtered Apple Mail export smoke check (`--subject COI --sender broker.com --limit 5`) also ran cleanly and returned no matching messages on this machine.

## Latest Progress (March 27, 2026 - Early Afternoon)
- ✅ **Postgres repository write methods completed**
  - Added `replaceCertificates()`, `replaceEntities()`, `saveReviewOverride()`, `reset()`, `exportState()`
  - Transaction support for bulk operations (BEGIN/COMMIT/ROLLBACK)
  - Created `src/lib/postgres-repository-write.js` with production-ready write methods
  - Integrated into main `src/lib/postgres-repository.js`
- ✅ **Server auto-detection**
  - Added `src/lib/db.js` for Postgres connection pooling
  - Server now auto-detects DATABASE_URL and switches between Postgres/JSON file storage
  - Seamless fallback when no Postgres configured
- ✅ **Setup documentation**
  - Created `POSTGRES_SETUP.md` with quickstart guide
  - Added `pg` dependency to package.json
- ✅ **Postgres integration fully tested and working**
  - Installed `pg` module (already present)
  - Created `knight_coi` database and loaded schema
  - Loaded demo seed data
  - Fixed repository method signature mismatches between JSON file and Postgres implementations
  - Fixed sync wrapper to handle dual-signature methods (backward compatibility)
  - Fixed roster import to generate proper UUIDs instead of string slugs
  - Verified all 53 tests pass
  - Verified all API endpoints work with Postgres backend
  - Successfully imported roster CSV with Postgres writes

**Key fixes:**
- Updated JSON file repository to accept optional `clientId` parameter for compatibility with Postgres signatures
- Updated sync wrapper to handle both old `(data)` and new `(clientId, data)` signatures
- Fixed `roster-import.js` to generate deterministic UUIDs using MD5 hashes instead of string slugs

## Latest Progress (March 27, 2026 - Evening)
- ✅ **Real COI email ingestion tested end-to-end**
  - Fixed Apple Mail export to access INBOX mailboxes (not just account-level messages)
  - Successfully exported real email from `larrynsmpsn@gmail.com`
  - Imported real COI: "Green Hills Construction LLC - AI Cert for TR Domain, LLC"
  - Intake pipeline extracted all key fields correctly:
    - Insured: Green Hills Construction LLC
    - Certificate Holder: TR Domain, LLC
    - Expiration: 03/28/2026
    - Policy details and coverage amounts
  - Entity matching worked perfectly (1.0 score) after adding Green Hills to roster
  - Review queue correctly flagged unmatched entity before roster import

**Verified end-to-end:**
1. Real email → Apple Mail export
2. Provider normalization → Intake processing
3. Certificate field extraction (ACORD-style data)
4. Entity matching logic
5. Review queue generation for unmatched entities
6. Roster import → Postgres write
7. Re-processing with matched entity

## Latest Progress (March 27, 2026 - Late Evening)
- ✅ **User documentation suite created**
  - Created professional HTML versions of all guides in `docs/` folder
  - `docs/index.html` - landing page with navigation
  - `docs/quick-start.html` - 30-min first session checklist
  - `docs/user-guide.html` - complete operator manual with table of contents
  - All guides styled to match Knight COI Manager dark theme
  - Print-friendly versions available
  - Responsive design for mobile/tablet/desktop
  - Markdown versions also available (`USER_GUIDE.md`, `QUICK_START.md`)

## Latest Progress (March 27, 2026 - Final)
- ✅ **Basic Authentication implemented**
  - Added Basic Auth middleware to server
  - Environment variable configuration (`BASIC_AUTH_ENABLED`, `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD`)
  - Disabled by default for local development
  - Enabled for production deployment
  - Default credentials: `admin` / `KnightCOI2026!Secure` (to be changed before sharing)
  
- ✅ **Deployment documentation created**
  - `DEPLOY.md` - Complete Railway deployment guide (15-minute setup)
  - `HANDOFF.md` - Deployment handoff with credentials, checklist, and success criteria
  - Instructions for custom domain setup (`coi.inatetechnologies.com`)
  - Troubleshooting guide and cost breakdown

## Ready for Production Pilot

**Status:** ✅ **READY TO DEPLOY**

All components complete for Inatetechnologies COI Manager pilot:
- ✅ Full application with Postgres persistence
- ✅ Real COI ingestion tested
- ✅ Professional documentation suite
- ✅ Basic Auth security
- ✅ Deployment guide for Railway
- ✅ User guides for Meredith's team

**Next action:** Follow `DEPLOY.md` to deploy to Railway

## Next Steps After Deployment
1. Deploy to Railway (15 minutes)
2. Change default password
3. First session with Meredith using `docs/quick-start.html`
4. Import real tenant/vendor roster
5. Process live COI workflow
6. Collect feedback for iteration

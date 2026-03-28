# Knight COI Manager MVP Handoff

## Current call
The **seeded, tested local MVP is complete enough to demo and iterate on**.

It is not yet a production deployment, but it is beyond a vague prototype. It now has a coherent operator workflow, persisted demo state, import paths, review actions, history, preview flows, and a bridge toward Postgres.

## What the MVP currently does
- Processes seeded/sample inbound COI-like messages
- Extracts key certificate fields from attachments
- Matches insured names to known entities
- Detects duplicate / renewal relationships
- Schedules reminder dates
- Creates a review queue for unmatched/problem items
- Supports review actions:
  - accept matched
  - manually assign + accept
  - reject
- Separates open review queue from resolved review history
- Supports CSV roster preview + import
- Supports inbox JSON import and provider-shaped mailbox payload import
- Persists demo state locally across restarts
- Exports demo state to Postgres seed SQL

## Operator surfaces available
### Browser demo
- Review queue actions
- Review history
- Validity summaries / warnings
- Roster preview
- Roster import
- Inbox message import
- Reset demo state

### API endpoints
- `/api/demo`
- `/api/overview`
- `/api/entities`
- `/api/certificates`
- `/api/review-queue`
- `/api/review-history`
- `/api/inbox`
- review action POST routes
- roster preview/import POST routes
- inbox/provider import POST routes

## Validation level
- Unit/integration-style tests are green
- Current passing count at time of handoff: **43 tests**
- Key live checks were performed against the local demo server

## What is explicitly *not* done yet
- Real mailbox sync from Apple Mail / Exchange / Gmail
- Real Postgres-backed runtime repository
- Authentication / multi-user permissions
- Production-grade audit logging / background jobs
- Real PDF OCR/document pipeline beyond the current text-driven demo path
- Deployment packaging

## Best next moves from here
### If staying in MVP/demo mode
- polish operator UX around validity explanations and resolution history
- add import history / confirmation screens
- add sample scenarios and fixture sets

### If moving toward production-ish pilot mode
- replace the file/demo repository with Postgres-backed storage
- connect real inbox/provider ingestion
- persist review decisions and reminders as first-class records
- add basic auth and audit trail

## Recommendation
Treat the current build as **MVP v1 complete for local demo/testing**.

The next phase is not “finish the MVP from scratch.”
It is **move from seeded local MVP to pilot-ready persistence + ingestion**.

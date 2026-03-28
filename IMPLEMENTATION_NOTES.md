# Implementation Notes

## What is implemented so far

Initial executable logic now exists for:
- reminder schedule generation
- future reminder cancellation when replacement certs arrive
- basic entity name normalization
- first-pass entity name matching score
- duplicate vs renewal vs new certificate detection
- mock certificate text field extraction
- ACORD-style parsing for coverage lines, carrier summary, and additional-insured hints
- seed demo entities for early UI/demo work
- mock certificate extraction from message/attachment text
- inbound attachment triage (likely COI vs not)
- mailbox adapter boundaries for Apple Mail, Gmail, and Exchange normalization
- first-pass intake processing that produces:
  - extracted fields
  - entity match suggestion
  - renewal/duplicate/new classification
  - review routing reason
  - reminder schedule for accepted items
- review queue item generation + queue summary helpers for unresolved intake
- seeded Knight demo dataset and runnable local demo CLI

## Why this matters
These are the first reusable business-logic pieces behind the app. They can be used by:
- intake pipeline
- review queue suggestions
- reminder job scheduler
- certificate replacement logic

## Immediate next coding steps
1. Scaffold a lightweight admin UI or JSON endpoint layer for:
   - entities
   - certificates
   - review queue
2. Add mailbox-provider adapter boundaries so Apple Mail / Gmail / Exchange ingestion can plug in cleanly later
3. Add a persistence layer (likely Postgres) plus seed import path
4. Expand tests around:
   - low-confidence partial matches
   - duplicate suppression
   - reminder cancellation after accepted renewals

## Testing approach
Current tests are lightweight Node tests so the business logic can be exercised without a full app framework.

Commands:

```bash
npm test
npm run demo
```

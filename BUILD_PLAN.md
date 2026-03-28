# Build Plan

## Current Status
- Product direction defined
- Multi-client architecture chosen
- Two-module initial model chosen: tenant + vendor
- Initial schema drafted
- First-pass executable business logic added for reminders and entity/certificate matching
- Mock extraction + intake classification layer added
- ACORD-style extraction heuristics added for coverage lines, carrier summary, and additional-insured hints
- Mailbox adapter boundaries added for Apple Mail, Gmail, and Exchange normalization
- Review queue item builder + summary helpers added for unresolved intake
- Seeded Knight demo dataset and runnable CLI demo added
- Lightweight unit tests added with Node's built-in test runner

## Next Build Steps

### Phase 1: App scaffold
- Next.js app
- Postgres connection
- auth placeholder
- basic routes

### Phase 2: Admin foundations
- clients
- properties
- entities
- certificates list
- review queue

### Phase 3: Intake pipeline
- mailbox connector abstraction
- message ingestion
- attachment storage
- extraction pipeline
- matching service

### Phase 4: Reminder engine
- job scheduler
- interval generation (60/30/7/1)
- cancellation on replacement cert
- outbound logging

### Phase 5: Review UX
- uncertain match resolution
- duplicate handling
- manual entity assignment
- accept / reject / supersede actions

## Route Map (draft)
- /clients
- /clients/[clientId]
- /clients/[clientId]/entities
- /clients/[clientId]/certificates
- /clients/[clientId]/review
- /clients/[clientId]/reminders
- /clients/[clientId]/settings

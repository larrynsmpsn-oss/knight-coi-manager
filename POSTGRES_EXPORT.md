# Postgres Seed Export

A practical bridge toward a real Postgres-backed repository now exists.

## Generate SQL to stdout

```bash
npm run export:postgres-seed
```

## Write SQL to a file

```bash
npm run export:postgres-seed -- data/demo/knight-demo-seed.sql
```

## What it exports
- client
- demo mailbox row
- entity types
- properties
- entities
- inbound messages
- attachments
- certificates
- review queue item overrides (exported into `review_queue_items`)

## Current intent
This is not the final Postgres adapter yet. It is a migration/bootstrapping aid so the current demo state can be expressed as SQL and loaded into a real database workflow next.
or demo rows and splitting message attachments into their own table inserts instead of leaving them embedded in one message blob.

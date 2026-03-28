# Knight COI Manager — Next Steps

This file is the short, opinionated handoff for the next build slice.

## Best next 3 moves

### 1) Real mailbox capture with useful certificate text
Highest leverage remaining gap.

Goal:
- get at least one real COI-like message from Apple Mail or another provider into the demo with enough attachment text to exercise the intake path against real data

Why this matters:
- the intake engine, UI, and provider bridges all exist
- the biggest unknown left is real-world mailbox/attachment shape, not demo plumbing

Start here:
```bash
npm run export:apple-mail-json -- --subject COI --sender broker.com --limit 10 tmp/apple-mail-coi.json
npm run import:apple-mail-demo -- --subject COI --sender broker.com --limit 5 --dry-run
```

If no matches:
- widen subject/sender filters
- use saved provider JSON fixtures or real exported JSON files
- note what real content is still missing (attachment text vs just filenames)

### 2) Postgres-backed repository swap
Second-highest leverage.

Goal:
- replace the current file/in-memory repository with a real Postgres-backed implementation behind the same store boundary

Why this matters:
- demo behavior is now rich enough that persistence is the main architectural gap to a more credible MVP
- schema + seed export already exist

Start here:
- review `schema.sql`
- review `POSTGRES_EXPORT.md`
- use `data/demo/knight-demo-seed.sql` as the bridge seed

### 3) UI/operator polish around review resolution history
Good third step after real data or Postgres.

Goal:
- make the review workflow feel fast and obvious to an operator

Best targets:
- clearer resolution history context
- stronger validity explanations / recommended actions
- import success/failure summaries that feel less raw

## Current supporting docs
- `STATUS.md`
- `TASKS.md`
- `LOCAL_DEMO.md`
- `REAL_MAIL_IMPORT.md`
- `POSTGRES_EXPORT.md`

## Current confidence
- The project is not “done,” but it is now well past raw prototype stage.
- The most meaningful remaining unknowns are real mailbox data shape and durable persistence.

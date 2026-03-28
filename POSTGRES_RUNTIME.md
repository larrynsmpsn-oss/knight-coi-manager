# Postgres Runtime Bootstrap

## Current phase-2 status
A concrete bootstrap path now exists for loading the current demo state into Postgres:

1. Apply the schema migration:

```bash
psql "$DATABASE_URL" -f postgres/migrations/001_demo_runtime.sql
```

2. Generate demo seed SQL:

```bash
npm run export:postgres-seed -- data/demo/knight-demo-seed.sql
```

3. Load the generated seed:

```bash
psql "$DATABASE_URL" -f data/demo/knight-demo-seed.sql
```

## Important note
This is a **bootstrap/migration bridge** for the current phase-2 work.
It is not yet the final runtime repository adapter.

The next step is to replace the file/demo repository with a real Postgres-backed implementation that reads/writes these tables directly.

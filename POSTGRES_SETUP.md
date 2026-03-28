# Postgres Setup

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
```bash
# Create database
createdb knight_coi

# Apply schema
psql knight_coi < schema.sql

# Load demo seed (optional)
npm run export:postgres-seed -- data/demo/knight-demo-seed.sql
psql knight_coi < data/demo/knight-demo-seed.sql
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env and set:
DATABASE_URL=postgres://user:password@localhost:5432/knight_coi
```

### 4. Run Server
```bash
npm run dev
```

Server will auto-detect DATABASE_URL and use Postgres repository.
If no DATABASE_URL, it falls back to JSON file storage.

## Verify It's Working

Server startup should show:
```
Using Postgres repository (DATABASE_URL is set)
```

Test with:
```bash
curl http://localhost:3030/api/overview
```

## Switch Back to File Storage

Just remove/comment out DATABASE_URL in .env:
```bash
# DATABASE_URL=postgres://user:password@localhost:5432/knight_coi
```

Server will show:
```
Using JSON file repository (no DATABASE_URL)
```

## Current Status

✅ Postgres repository with full write support
✅ Transaction safety on bulk operations
✅ Auto-detection based on DATABASE_URL
✅ Seamless fallback to JSON file storage
🔨 Next: Test against live Postgres, verify all endpoints work

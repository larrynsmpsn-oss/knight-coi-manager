# Local Demo

## CLI demo

```bash
npm run demo
```

## Browser demo

```bash
npm run dev
```

Then open:

- <http://localhost:3030>
- <http://localhost:3030/api/demo>
- <http://localhost:3030/api/overview>
- <http://localhost:3030/api/review-queue>

## Demo action endpoints
Use POST requests to simulate review decisions and roster import against the persisted demo store:

```bash
curl -X POST 'http://localhost:3030/api/review/accept?messageId=msg-1&attachmentId=att-1'
curl -X POST 'http://localhost:3030/api/review/assign?messageId=msg-2&attachmentId=att-2&entityId=entity-aurora'
curl -X POST 'http://localhost:3030/api/review/reject?messageId=msg-2&attachmentId=att-2&reason=wrong_attachment'
curl -X POST --data-binary @roster.csv 'http://localhost:3030/api/roster/preview'
curl -X POST --data-binary @roster.csv 'http://localhost:3030/api/roster/import'
```

These now persist demo state to `data/demo/demo-store-state.json` by default, so review decisions and roster imports survive a server restart.

The browser demo page also now includes operator controls for reset, roster import, and review queue actions so the MVP is not purely CLI/API-driven.

To reset the demo back to seed data:

```bash
curl -X POST 'http://localhost:3030/api/demo/reset'
```

## Sample roster import data
A starter sample CSV lives at:

- `data/demo/knight-sample-roster.csv`

You can POST it into the running demo server like this:

```bash
curl -X POST \
  -H 'Content-Type: text/csv' \
  --data-binary @data/demo/knight-sample-roster.csv \
  'http://localhost:3030/api/roster/import'
```

The endpoint updates persisted demo state, so imported entities remain after restart unless you reset the demo.

## Browser UI notes
The root page now includes:

- review action buttons for open queue items
- manual entity assignment dropdowns
- validity status / blocking / warning summaries
- roster CSV import textarea + submit action
- inbox message JSON import textarea + submit action
- resolved review history table
- queue/history summary badges for fast scanning
- demo reset control

Inbox message import is now available both by API and from the browser UI.
Provider-shaped mailbox JSON can also be posted into `/api/inbox/import-provider?provider=apple-mail|gmail|exchange` and will be normalized through the mailbox adapters before intake. The browser UI now exposes this choice directly via an import-mode selector.

A lightweight Apple Mail export CLI is also available (it searches the full Apple Mail account message set, not just inboxes):

Sample provider payloads are included under `data/demo/`:

- `gmail-sample-message.json`
- `exchange-sample-message.json`
- `apple-mail-sample-message.json`

```bash
npm run export:apple-mail-json -- --limit 5 tmp/apple-mail.json
npm run export:apple-mail-json -- --subject COI --sender broker.com --limit 10 tmp/apple-mail-coi.json
npm run import:apple-mail-demo -- --subject COI --sender broker.com --limit 5 --server http://localhost:3030
npm run import:apple-mail-demo -- --subject COI --sender broker.com --limit 5 --dry-run
npm run import:provider-demo -- --provider gmail path/to/gmail-message.json
npm run import:provider-demo -- --provider gmail data/demo/gmail-sample-message.json --dry-run
```

For a concise mailbox-ingestion runbook, see `REAL_MAIL_IMPORT.md`.

## Purpose
This is a lightweight local demo surface for the seeded Knight Real Estate sample data. It is not the final UI, but it makes the current business logic visible in a browser and now supports stateful review-action testing, roster onboarding, and manual inbox-intake testing.

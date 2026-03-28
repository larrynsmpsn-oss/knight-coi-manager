# Real / Saved Mail Import Runbook

This project now has a few practical ways to push mailbox-like data into the Knight COI demo before full mailbox sync exists.

## 1) Import a saved provider JSON file into the running demo

Use this when you already have a Gmail / Exchange / Apple Mail-shaped message payload saved on disk.

```bash
npm run import:provider-demo -- --provider gmail path/to/gmail-message.json
npm run import:provider-demo -- --provider exchange path/to/exchange-message.json
npm run import:provider-demo -- --provider apple-mail path/to/apple-mail-message.json
```

Included sample fixtures:

- `data/demo/gmail-sample-message.json`
- `data/demo/exchange-sample-message.json`
- `data/demo/apple-mail-sample-message.json`

Example:

```bash
npm run dev
npm run import:provider-demo -- --provider gmail data/demo/gmail-sample-message.json
```

## 2) Export recent Apple Mail messages to provider-shaped JSON

Use this on macOS to pull message metadata out of the local Mail app.

```bash
npm run export:apple-mail-json -- --limit 5 tmp/apple-mail.json
npm run export:apple-mail-json -- --subject COI --sender broker.com --limit 10 tmp/apple-mail-coi.json
```

Notes:

- Search now scans the full Apple Mail account message set, not only inboxes.
- Filters are currently simple contains-matches on subject and sender text.
- Empty output (`[]`) means the command ran, but no messages matched that query.

## 3) Export from Apple Mail and push straight into the demo

Use `--dry-run` first if you want to preview which messages would be imported.

```bash
npm run dev
npm run import:apple-mail-demo -- --subject COI --sender broker.com --limit 5 --server http://localhost:3030
```

## Current limitation

The Apple Mail bridge currently exports message metadata plus attachment filenames/content types. It does **not** yet perform full attachment text extraction directly from Mail. For richer certificate intake, the best current paths are:

- provider JSON with extracted attachment text already included, or
- sample/demo fixture messages under `data/demo/`

## Next likely improvement

Add a richer Apple Mail extraction path that can attach more usable certificate text to exported messages so the live local-mail bridge becomes more than metadata-only.

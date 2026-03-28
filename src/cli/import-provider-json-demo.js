#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let provider = 'gmail';
let serverUrl = 'http://localhost:3030';
let filePath = null;
let dryRun = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--provider') {
    provider = args[index + 1] || provider;
    index += 1;
    continue;
  }
  if (arg === '--server') {
    serverUrl = args[index + 1] || serverUrl;
    index += 1;
    continue;
  }
  if (arg === '--dry-run') {
    dryRun = true;
    continue;
  }
  if (!arg.startsWith('--') && !filePath) {
    filePath = arg;
  }
}

if (!filePath) {
  console.error('Usage: npm run import:provider-demo -- --provider gmail path/to/message.json');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
const messages = Array.isArray(parsed) ? parsed : [parsed];

if (dryRun) {
  console.log(JSON.stringify({
    provider,
    file: absolutePath,
    count: messages.length,
    ids: messages.map((message) => message.id || message.messageId || null),
    subjects: messages.map((message) => message.subject || null),
  }, null, 2));
  process.exit(0);
}

let imported = 0;
for (const message of messages) {
  const response = await fetch(`${serverUrl}/api/inbox/import-provider?provider=${encodeURIComponent(provider)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `Failed importing message from ${absolutePath}`);
  }
  imported += 1;
  console.log(`Imported ${payload.message.id}`);
}

console.log(`Imported ${imported} ${provider} message(s) from ${absolutePath} into ${serverUrl}`);

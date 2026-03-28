#!/usr/bin/env node
import { fetchAppleMailMessages } from '../lib/apple-mail-export.js';

const args = process.argv.slice(2);
let subjectContains = '';
let senderContains = '';
let limit = 5;
let serverUrl = 'http://localhost:3030';

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--subject') {
    subjectContains = args[index + 1] || '';
    index += 1;
    continue;
  }
  if (arg === '--limit') {
    limit = Number(args[index + 1] || 5);
    index += 1;
    continue;
  }
  if (arg === '--server') {
    serverUrl = args[index + 1] || serverUrl;
    index += 1;
  }
}

const messages = fetchAppleMailMessages({ subjectContains, senderContains, limit });
console.log(`Fetched ${messages.length} Apple Mail messages`);

if (dryRun) {
  console.log(JSON.stringify({
    count: messages.length,
    ids: messages.map((message) => message.id),
    subjects: messages.map((message) => message.subject),
  }, null, 2));
  process.exit(0);
}

let imported = 0;
for (const message of messages) {
  const response = await fetch(`${serverUrl}/api/inbox/import-provider?provider=apple-mail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `Failed importing ${message.id}`);
  }
  imported += 1;
  console.log(`Imported ${message.id}`);
}

console.log(`Imported ${imported} Apple Mail messages into ${serverUrl}`);
sage.id}`);
}

console.log(`Imported ${imported} Apple Mail messages into ${serverUrl}`);

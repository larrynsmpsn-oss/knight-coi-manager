#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fetchAppleMailMessages } from '../lib/apple-mail-export.js';

const args = process.argv.slice(2);
let outputPath = null;
let subjectContains = '';
let senderContains = '';
let limit = 10;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--subject') {
    subjectContains = args[index + 1] || '';
    index += 1;
    continue;
  }
  if (arg === '--sender') {
    senderContains = args[index + 1] || '';
    index += 1;
    continue;
  }
  if (arg === '--limit') {
    limit = Number(args[index + 1] || 10);
    index += 1;
    continue;
  }
  if (!arg.startsWith('--') && !outputPath) {
    outputPath = arg;
  }
}

const messages = fetchAppleMailMessages({ subjectContains, senderContains, limit });
const json = JSON.stringify(messages, null, 2);

if (outputPath) {
  const absolutePath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, json + '\n');
  console.log(`Wrote ${messages.length} Apple Mail messages to ${absolutePath}`);
} else {
  process.stdout.write(json + '\n');
}

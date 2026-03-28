#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadRuntimeConfig } from '../lib/runtime-config.js';

const args = process.argv.slice(2);
let provider = 'gmail';
let serverUrl = 'http://localhost:3030';
let dryRun = false;
let force = false;
let stateFileArg = null;
let directoryArg = null;

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
  if (arg === '--force') {
    force = true;
    continue;
  }
  if (arg === '--state-file') {
    stateFileArg = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (!arg.startsWith('--') && !directoryArg) {
    directoryArg = arg;
  }
}

const runtimeConfig = loadRuntimeConfig(process.env);
const providerDirs = {
  gmail: runtimeConfig.ingestion.gmailImportDir,
  exchange: runtimeConfig.ingestion.exchangeImportDir,
  'apple-mail': runtimeConfig.ingestion.appleMailExportDir,
};

const directoryPath = path.resolve(directoryArg || providerDirs[provider] || runtimeConfig.ingestion.providerImportDir);
const stateFilePath = path.resolve(stateFileArg || path.join(runtimeConfig.ingestion.providerImportDir, `${provider}-import-state.json`));
if (!fs.existsSync(directoryPath)) {
  console.error(`Directory not found: ${directoryPath}`);
  process.exit(1);
}

function isLikelyMessagePayload(value) {
  const messages = Array.isArray(value) ? value : [value];
  return messages.some((message) => {
    if (!message || typeof message !== 'object') return false;
    return Boolean(
      message.subject ||
      message.fromEmail ||
      message.from ||
      message.sender ||
      message.preview ||
      message.snippet ||
      message.attachments
    );
  });
}

const importState = fs.existsSync(stateFilePath)
  ? JSON.parse(fs.readFileSync(stateFilePath, 'utf8'))
  : { importedFiles: {} };

const files = fs.readdirSync(directoryPath)
  .filter((name) => name.endsWith('.json'))
  .map((name) => path.join(directoryPath, name))
  .filter((filePath) => {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return isLikelyMessagePayload(parsed);
    } catch {
      return false;
    }
  })
  .filter((filePath) => force || !importState.importedFiles[filePath])
  .sort();

if (!files.length) {
  console.log(`No JSON files found in ${directoryPath}`);
  process.exit(0);
}

if (dryRun) {
  console.log(JSON.stringify({
    provider,
    directory: directoryPath,
    stateFile: stateFilePath,
    files,
    count: files.length,
    force,
  }, null, 2));
  process.exit(0);
}

let imported = 0;
for (const filePath of files) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const messages = Array.isArray(parsed) ? parsed : [parsed];

  for (const message of messages) {
    const response = await fetch(`${serverUrl}/api/inbox/import-provider?provider=${encodeURIComponent(provider)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) {
      throw new Error(payload.error || `Failed importing ${provider} message from ${filePath}`);
    }
    imported += 1;
    console.log(`Imported ${payload.message.id} from ${path.basename(filePath)}`);
  }

  importState.importedFiles[filePath] = {
    importedAt: new Date().toISOString(),
    messageCount: messages.length,
    provider,
  };
}

fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
fs.writeFileSync(stateFilePath, JSON.stringify(importState, null, 2));

console.log(`Imported ${imported} ${provider} message(s) from ${directoryPath} into ${serverUrl}`);
console.log(`Updated import state: ${stateFilePath}`);

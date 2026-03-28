import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntimeConfig } from '../src/lib/runtime-config.js';

test('loadRuntimeConfig returns sensible defaults for phase 2 runtime settings', () => {
  const config = loadRuntimeConfig({});

  assert.deepEqual(config, {
    nodeEnv: 'development',
    port: 3030,
    dataDir: 'data',
    demoStatePath: 'data/demo/demo-store-state.json',
    postgres: {
      databaseUrl: null,
      schema: 'public',
      ssl: false,
    },
    ingestion: {
      providerImportDir: 'data/imports/providers',
      mailboxSyncEnabled: false,
      appleMailExportDir: 'data/imports/apple-mail',
      gmailImportDir: 'data/imports/gmail',
      exchangeImportDir: 'data/imports/exchange',
    },
  });
});

test('loadRuntimeConfig reads database and provider ingestion overrides from env', () => {
  const config = loadRuntimeConfig({
    NODE_ENV: 'production',
    PORT: '4040',
    KNIGHT_COI_DATA_DIR: '/srv/knight/data',
    DEMO_STATE_PATH: '/srv/knight/demo.json',
    DATABASE_URL: 'postgres://knight:secret@localhost:5432/knight_coi',
    KNIGHT_COI_PG_SCHEMA: 'knight',
    DATABASE_SSL: 'true',
    KNIGHT_COI_PROVIDER_IMPORT_DIR: '/srv/knight/imports/providers',
    KNIGHT_COI_MAILBOX_SYNC_ENABLED: '1',
    KNIGHT_COI_APPLE_MAIL_EXPORT_DIR: '/srv/knight/imports/apple-mail',
    KNIGHT_COI_GMAIL_IMPORT_DIR: '/srv/knight/imports/gmail',
    KNIGHT_COI_EXCHANGE_IMPORT_DIR: '/srv/knight/imports/exchange',
  });

  assert.equal(config.nodeEnv, 'production');
  assert.equal(config.port, 4040);
  assert.equal(config.dataDir, '/srv/knight/data');
  assert.equal(config.demoStatePath, '/srv/knight/demo.json');
  assert.equal(config.postgres.databaseUrl, 'postgres://knight:secret@localhost:5432/knight_coi');
  assert.equal(config.postgres.schema, 'knight');
  assert.equal(config.postgres.ssl, true);
  assert.equal(config.ingestion.providerImportDir, '/srv/knight/imports/providers');
  assert.equal(config.ingestion.mailboxSyncEnabled, true);
  assert.equal(config.ingestion.appleMailExportDir, '/srv/knight/imports/apple-mail');
  assert.equal(config.ingestion.gmailImportDir, '/srv/knight/imports/gmail');
  assert.equal(config.ingestion.exchangeImportDir, '/srv/knight/imports/exchange');
});

function normalizeOptional(value) {
  const text = String(value || '').trim();
  return text ? text : null;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const text = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(text);
}

export function loadRuntimeConfig(env = process.env) {
  return {
    nodeEnv: env.NODE_ENV || 'development',
    port: Number(env.PORT || 3030),
    dataDir: env.KNIGHT_COI_DATA_DIR || 'data',
    demoStatePath: env.DEMO_STATE_PATH || 'data/demo/demo-store-state.json',
    postgres: {
      databaseUrl: normalizeOptional(env.DATABASE_URL),
      schema: env.KNIGHT_COI_PG_SCHEMA || 'public',
      ssl: normalizeBoolean(env.DATABASE_SSL, false),
    },
    ingestion: {
      providerImportDir: env.KNIGHT_COI_PROVIDER_IMPORT_DIR || 'data/imports/providers',
      mailboxSyncEnabled: normalizeBoolean(env.KNIGHT_COI_MAILBOX_SYNC_ENABLED, false),
      appleMailExportDir: env.KNIGHT_COI_APPLE_MAIL_EXPORT_DIR || 'data/imports/apple-mail',
      gmailImportDir: env.KNIGHT_COI_GMAIL_IMPORT_DIR || 'data/imports/gmail',
      exchangeImportDir: env.KNIGHT_COI_EXCHANGE_IMPORT_DIR || 'data/imports/exchange',
    },
  };
}

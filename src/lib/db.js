// Database connection helper
import pg from 'pg';

const { Pool } = pg;

/**
 * Create a Postgres connection pool from runtime config.
 * @param {object} config - Postgres config with databaseUrl, ssl, schema
 * @returns {Pool|null} - pg.Pool instance or null if no DATABASE_URL
 */
export function createPool(config) {
  if (!config || !config.databaseUrl) {
    return null;
  }

  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });

  // Verify connection on startup
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  return pool;
}

/**
 * Create a simple db client wrapper for repository use.
 * @param {Pool} pool - pg.Pool instance
 * @returns {object} - { query } interface
 */
export function createDbClient(pool) {
  return {
    async query(sql, params) {
      return pool.query(sql, params);
    },
  };
}

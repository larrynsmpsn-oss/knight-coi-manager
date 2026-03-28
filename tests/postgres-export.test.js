import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnightDemoData } from '../src/lib/seed-data.js';
import { buildPostgresSeedSql } from '../src/lib/postgres-export.js';

test('buildPostgresSeedSql emits a transaction with inserts for seeded demo state', () => {
  const demo = buildKnightDemoData();
  const sql = buildPostgresSeedSql({
    client: demo.client,
    entityTypes: demo.entityTypes,
    properties: demo.properties,
    entities: demo.entities,
    certificates: demo.certificates,
    sampleMessages: demo.sampleMessages,
    reviewOverrides: {
      'msg-2:att-2': {
        status: 'closed',
        resolution: 'accepted',
      },
    },
  });

  assert.equal(sql.startsWith('BEGIN;'), true);
  assert.equal(sql.endsWith('COMMIT;'), true);
  assert.equal(sql.includes('INSERT INTO clients'), true);
  assert.equal(sql.includes("INSERT INTO entities"), true);
  assert.equal(sql.includes("INSERT INTO certificates"), true);
  assert.equal(sql.includes("INSERT INTO inbound_messages"), true);
  assert.equal(sql.includes("INSERT INTO attachments"), true);
  assert.equal(sql.includes("INSERT INTO mailboxes"), true);
  assert.equal(sql.includes("INSERT INTO review_queue_items"), true);
  assert.equal(sql.includes('Knight Real Estate'), true);
  assert.equal(sql.includes('Aurora Wealth Partners'), true);
  assert.equal(sql.includes('msg-2:att-2'), true);
  assert.equal(sql.includes('client_id'), true);
});

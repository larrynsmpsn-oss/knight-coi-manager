import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoState } from '../src/lib/demo-state.js';

test('buildDemoState exposes overview, entity, and review queue data for the demo API', () => {
  const state = buildDemoState();

  assert.equal(state.client.name, 'Knight Real Estate');
  assert.equal(state.stats.entities, 3);
  assert.equal(state.stats.certificates, 2);
  assert.equal(state.stats.messages, 2);
  assert.equal(state.stats.attachmentsProcessed, 2);
  assert.equal(state.stats.likelyCertificates, 2);
  assert.equal(state.stats.needsReview, 1);
  assert.equal(state.stats.renewalsDetected, 1);
  assert.equal(state.stats.validityBlocked, 1);
  assert.equal(state.stats.validityWarnings, 2);

  assert.equal(state.entities.length, 3);
  assert.equal(state.entities[0].name, 'Apex Mechanical Services');
  assert.equal(state.entities[0].activeCertificate?.id, 'cert-apex-2026');

  assert.equal(state.reviewQueue.length, 1);
  assert.equal(state.reviewQueue[0].reason, 'no_entity_match');
  assert.deepEqual(state.reviewSummary, {
    total: 1,
    byReason: {
      no_entity_match: 1,
    },
    byPriority: {
      high: 1,
    },
  });

  const renewal = state.processedAttachments.find((item) => item.relationship === 'renewal');
  assert.equal(renewal?.matchedEntityName, 'Lone Star Therapy, LLC');
  assert.equal(renewal?.expirationDate, '12/31/2026');
});

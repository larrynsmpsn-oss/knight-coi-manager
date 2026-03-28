import test from 'node:test';
import assert from 'node:assert/strict';
import { processInboundMessage } from '../src/lib/intake.js';
import { buildKnightDemoData } from '../src/lib/seed-data.js';

const demo = buildKnightDemoData();

test('processInboundMessage marks a same-policy later-expiration cert as a renewal', () => {
  const result = processInboundMessage({
    message: demo.sampleMessages[0],
    entities: demo.entities,
    existingCertificates: demo.certificates,
  })[0];

  assert.equal(result.likelyCertificate, true);
  assert.equal(result.match.entity?.id, 'entity-lone-star');
  assert.equal(result.relationship, 'renewal');
  assert.equal(result.needsReview, false);
  assert.equal(result.reminderSchedule.length, 4);
});

test('processInboundMessage routes unknown insureds to review', () => {
  const result = processInboundMessage({
    message: demo.sampleMessages[1],
    entities: demo.entities,
    existingCertificates: demo.certificates,
  })[0];

  assert.equal(result.likelyCertificate, true);
  assert.equal(result.match.entity, null);
  assert.equal(result.needsReview, true);
  assert.equal(result.reviewReason, 'no_entity_match');
  assert.deepEqual(result.reminderSchedule, []);
});

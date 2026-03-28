import test from 'node:test';
import assert from 'node:assert/strict';
import { processInboundMessage } from '../src/lib/intake.js';
import { buildKnightDemoData } from '../src/lib/seed-data.js';
import { buildReviewQueueItems, summarizeReviewQueue } from '../src/lib/review-queue.js';

test('buildReviewQueueItems turns review-needed intake results into queue items', () => {
  const demo = buildKnightDemoData();
  const message = demo.sampleMessages[1];

  const intakeResults = processInboundMessage({
    message,
    entities: demo.entities,
    existingCertificates: demo.certificates,
  });

  const queueItems = buildReviewQueueItems({
    clientId: demo.client.id,
    message,
    intakeResults,
  });

  assert.equal(queueItems.length, 1);
  assert.deepEqual(queueItems[0], {
    id: 'msg-2:att-2',
    clientId: 'client-knight',
    inboundMessageId: 'msg-2',
    attachmentId: 'att-2',
    certificateId: null,
    itemType: 'entity_match_review',
    status: 'open',
    priority: 'high',
    suggestedEntityId: null,
    reason: 'no_entity_match',
    details: {
      messageSubject: 'Certificate attached',
      fromEmail: 'hello@unknownbroker.com',
      filename: 'certificate.pdf',
      insuredName: 'Summit Wellness Group',
      matchScore: 0,
      relationship: 'new',
      likelyCertificate: true,
    },
  });
});

test('summarizeReviewQueue counts items by reason and priority', () => {
  const summary = summarizeReviewQueue([
    { reason: 'no_entity_match', priority: 'high' },
    { reason: 'no_entity_match', priority: 'high' },
    { reason: 'low_confidence_match', priority: 'medium' },
  ]);

  assert.deepEqual(summary, {
    total: 3,
    byReason: {
      no_entity_match: 2,
      low_confidence_match: 1,
    },
    byPriority: {
      high: 2,
      medium: 1,
    },
  });
});

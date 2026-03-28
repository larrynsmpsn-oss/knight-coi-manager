import test from 'node:test';
import assert from 'node:assert/strict';
import { processInboundMessage } from '../src/lib/intake.js';
import { buildKnightDemoData } from '../src/lib/seed-data.js';
import { buildReviewQueueItems } from '../src/lib/review-queue.js';
import { acceptReviewedCertificate, rejectReviewQueueItem } from '../src/lib/review-actions.js';

test('acceptReviewedCertificate creates a new active certificate and cancels future reminders on the superseded cert', () => {
  const demo = buildKnightDemoData();
  const message = demo.sampleMessages[0];
  const intakeResult = processInboundMessage({
    message,
    entities: demo.entities,
    existingCertificates: demo.certificates,
  })[0];

  const existingReminderEvents = [
    {
      id: 'rem-old-60',
      clientId: demo.client.id,
      entityId: 'entity-lone-star',
      certificateId: 'cert-lone-star-2025',
      scheduledFor: '2026-11-01',
      sentAt: null,
      canceledAt: null,
      deliveryStatus: 'scheduled',
    },
    {
      id: 'rem-old-7',
      clientId: demo.client.id,
      entityId: 'entity-lone-star',
      certificateId: 'cert-lone-star-2025',
      scheduledFor: '2026-12-24',
      sentAt: null,
      canceledAt: null,
      deliveryStatus: 'scheduled',
    },
  ];

  const result = acceptReviewedCertificate({
    clientId: demo.client.id,
    message,
    intakeResult,
    entities: demo.entities,
    existingCertificates: demo.certificates,
    existingReminderEvents,
  });

  assert.equal(result.entity.id, 'entity-lone-star');
  assert.equal(result.certificate.entityId, 'entity-lone-star');
  assert.equal(result.certificate.isActive, true);
  assert.equal(result.certificate.supersedesCertificateId, 'cert-lone-star-2025');
  assert.equal(result.certificate.expirationDate, '2026-12-31');

  const oldCertificate = result.updatedCertificates.find((item) => item.id === 'cert-lone-star-2025');
  assert.equal(oldCertificate?.isActive, false);
  assert.equal(oldCertificate?.supersededByCertificateId, result.certificate.id);

  assert.equal(result.newReminderEvents.length, 4);
  assert.equal(result.newReminderEvents[0].scheduledFor, '2026-11-01');
  assert.equal(result.newReminderEvents[3].scheduledFor, '2026-12-30');

  const canceledPriorEvents = result.updatedReminderEvents.filter((item) => item.certificateId === 'cert-lone-star-2025');
  assert.equal(canceledPriorEvents.every((item) => item.deliveryStatus === 'canceled'), true);
  assert.equal(canceledPriorEvents.every((item) => Boolean(item.canceledAt)), true);
});

test('acceptReviewedCertificate can manually assign an unmatched intake item to an entity and resolve its review item', () => {
  const demo = buildKnightDemoData();
  const message = demo.sampleMessages[1];
  const intakeResult = processInboundMessage({
    message,
    entities: demo.entities,
    existingCertificates: demo.certificates,
  })[0];
  const reviewItem = buildReviewQueueItems({
    clientId: demo.client.id,
    message,
    intakeResults: [intakeResult],
  })[0];

  const result = acceptReviewedCertificate({
    clientId: demo.client.id,
    message,
    intakeResult,
    entities: demo.entities,
    existingCertificates: demo.certificates,
    reviewItem,
    entityId: 'entity-aurora',
  });

  assert.equal(result.entity.id, 'entity-aurora');
  assert.equal(result.certificate.entityId, 'entity-aurora');
  assert.equal(result.certificate.reviewStatus, 'accepted');
  assert.equal(result.resolvedReviewItem?.status, 'resolved');
  assert.equal(result.resolvedReviewItem?.suggestedEntityId, 'entity-aurora');
  assert.equal(result.resolvedReviewItem?.certificateId, result.certificate.id);
  assert.equal(result.newReminderEvents.length, 4);
});

test('rejectReviewQueueItem marks a review item rejected with a reason', () => {
  const reviewItem = {
    id: 'msg-9:att-2',
    status: 'open',
    reason: 'non_certificate_attachment',
  };

  const rejected = rejectReviewQueueItem({
    reviewItem,
    reason: 'broker_note_only',
    resolvedAt: '2026-03-24T09:30:00Z',
  });

  assert.deepEqual(rejected, {
    id: 'msg-9:att-2',
    status: 'rejected',
    reason: 'non_certificate_attachment',
    resolvedAt: '2026-03-24T09:30:00.000Z',
    resolution: 'rejected_attachment',
    rejectionReason: 'broker_note_only',
  });
});

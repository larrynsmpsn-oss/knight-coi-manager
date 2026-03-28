import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnightDemoData } from '../src/lib/seed-data.js';
import { processInboundMessage } from '../src/lib/intake.js';
import { buildReviewQueueItems } from '../src/lib/review-queue.js';
import {
  acceptMatchedCertificate,
  assignEntityAndAccept,
  rejectIntakeResult,
  validateCertificateForAcceptance,
} from '../src/lib/review-decisions.js';
import { buildReminderSchedule } from '../src/lib/reminders.js';

function buildCertificatesWithReminders(certificates) {
  return certificates.map((certificate) => ({
    ...certificate,
    reminderEvents: [
      ...buildReminderSchedule({ expirationDate: certificate.expirationDate }).map((event) => ({
        ...event,
        status: 'scheduled',
      })),
      ...(certificate.id === 'cert-lone-star-2025'
        ? [
            {
              offsetDays: 0,
              sendOn: '2026-10-21',
              expiresOn: '2025-12-31',
              status: 'scheduled',
            },
          ]
        : []),
    ],
  }));
}

test('acceptMatchedCertificate creates a renewal, supersedes the prior certificate, and cancels future reminders', () => {
  const demo = buildKnightDemoData();
  const existingCertificates = buildCertificatesWithReminders(demo.certificates);
  const message = demo.sampleMessages[0];
  const intakeResult = processInboundMessage({
    message,
    entities: demo.entities,
    existingCertificates,
  })[0];

  const result = acceptMatchedCertificate({
    client: demo.client,
    clientId: demo.client.id,
    message,
    intakeResult,
    existingCertificates,
  });

  assert.equal(result.acceptedCertificate.entityId, 'entity-lone-star');
  assert.equal(result.acceptedCertificate.relationship, 'renewal');
  assert.equal(result.acceptedCertificate.supersedesCertificateId, 'cert-lone-star-2025');
  assert.equal(result.acceptedCertificate.expirationDate, '2026-12-31');
  assert.equal(result.acceptedCertificate.reminderEvents.length, 4);

  const superseded = result.certificates.find((certificate) => certificate.id === 'cert-lone-star-2025');
  assert.equal(superseded.isActive, false);
  assert.equal(superseded.status, 'superseded');
  assert.equal(superseded.supersededByCertificateId, 'cert-att-1');
  const carriedForwardReminder = superseded.reminderEvents.find((event) => event.sendOn === '2026-10-21');
  assert.equal(carriedForwardReminder.canceled, true);

  const accepted = result.certificates.find((certificate) => certificate.id === 'cert-att-1');
  assert.equal(accepted.isActive, true);
});

test('assignEntityAndAccept lets review resolve an unmatched certificate to a chosen entity', () => {
  const demo = buildKnightDemoData();
  const existingCertificates = buildCertificatesWithReminders(demo.certificates);
  const message = demo.sampleMessages[1];
  const intakeResult = processInboundMessage({
    message,
    entities: demo.entities,
    existingCertificates,
  })[0];

  const reviewQueueItem = buildReviewQueueItems({
    clientId: demo.client.id,
    message,
    intakeResults: [intakeResult],
  })[0];

  const result = assignEntityAndAccept({
    client: demo.client,
    entity: demo.entities.find((entity) => entity.id === 'entity-aurora'),
    clientId: demo.client.id,
    entityId: 'entity-aurora',
    message,
    intakeResult,
    existingCertificates,
    reviewQueueItem,
  });

  assert.equal(result.acceptedCertificate.entityId, 'entity-aurora');
  assert.equal(result.acceptedCertificate.relationship, 'new');
  assert.equal(result.reviewQueueItem.status, 'closed');
  assert.equal(result.reviewQueueItem.resolution, 'accepted');
  assert.equal(result.reviewQueueItem.resolutionNotes, 'Entity assigned manually during review.');
});

test('rejectIntakeResult closes the review item without creating a certificate', () => {
  const reviewQueueItem = {
    id: 'review-1',
    status: 'open',
  };

  const result = rejectIntakeResult({
    reviewQueueItem,
    reason: 'broker_sent_wrong_document',
  });

  assert.equal(result.acceptedCertificate, null);
  assert.equal(result.certificates, null);
  assert.equal(result.reviewQueueItem.status, 'closed');
  assert.equal(result.reviewQueueItem.resolution, 'rejected');
  assert.equal(result.reviewQueueItem.resolutionNotes, 'broker_sent_wrong_document');
});

test('validateCertificateForAcceptance returns actionable issues for incomplete intake', () => {
  const validation = validateCertificateForAcceptance({
    entityId: null,
    intakeResult: {
      likelyCertificate: false,
      extracted: {
        insuredName: null,
        expirationDate: null,
      },
    },
  });

  assert.deepEqual(validation, {
    valid: false,
    issues: [
      'attachment_not_certificate',
      'missing_entity',
      'missing_insured_name',
      'missing_expiration_date',
      'missing_policy_evidence',
    ],
    warnings: [
      'missing_certificate_holder',
      'missing_effective_date',
      'missing_coverage_lines',
      'additional_insured_not_mentioned',
    ],
  });
});

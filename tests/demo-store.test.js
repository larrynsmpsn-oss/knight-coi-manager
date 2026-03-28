import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoStore } from '../src/lib/demo-store.js';

test('createDemoStore exposes derived snapshot stats from the seeded repository', () => {
  const store = createDemoStore();
  const snapshot = store.snapshot();

  assert.equal(snapshot.client.name, 'Knight Real Estate');
  assert.equal(snapshot.stats.certificates, 2);
  assert.equal(snapshot.stats.needsReview, 1);
  assert.equal(snapshot.stats.resolvedReviewItems, 0);
  assert.equal(snapshot.stats.validityBlocked, 1);
  assert.equal(snapshot.stats.validityWarnings, 2);
  assert.equal(snapshot.openReviewQueue.length, 1);
  assert.equal(snapshot.resolvedReviewQueue.length, 0);
  assert.deepEqual(snapshot.reviewHistorySummary, {
    total: 0,
    byResolution: {},
  });

  const unmatched = snapshot.processedAttachments.find((item) => item.attachmentId === 'att-2');
  assert.deepEqual(unmatched.validity.blockingIssues, ['missing_entity']);
  assert.equal(unmatched.validity.warnings.includes('missing_carrier_summary'), true);
});

test('assignEntity resolves an open review item and adds a certificate', () => {
  const store = createDemoStore();

  const result = store.assignEntity({
    messageId: 'msg-2',
    attachmentId: 'att-2',
    entityId: 'entity-aurora',
  });

  assert.equal(result.decision.action, 'accept');
  assert.equal(result.certificate.entityId, 'entity-aurora');
  assert.equal(result.snapshot.stats.certificates, 3);
  assert.equal(result.snapshot.stats.needsReview, 0);
  assert.equal(result.snapshot.stats.resolvedReviewItems, 1);

  const reviewItem = result.snapshot.reviewQueue.find((item) => item.attachmentId === 'att-2');
  assert.equal(reviewItem.status, 'closed');
  assert.equal(reviewItem.resolution, 'accepted');
});

test('reject resolves an open review item without adding a certificate', () => {
  const store = createDemoStore();

  const result = store.reject({
    messageId: 'msg-2',
    attachmentId: 'att-2',
    reason: 'wrong_attachment',
  });

  assert.equal(result.decision.action, 'reject');
  assert.equal(result.snapshot.stats.certificates, 2);
  assert.equal(result.snapshot.stats.needsReview, 0);
  assert.equal(result.snapshot.stats.resolvedReviewItems, 1);

  const reviewItem = result.snapshot.reviewQueue.find((item) => item.attachmentId === 'att-2');
  assert.equal(reviewItem.status, 'closed');
  assert.equal(reviewItem.resolution, 'rejected');
});

test('previewRoster summarizes import changes without mutating repository state', () => {
  const store = createDemoStore();

  const preview = store.previewRoster({
    csvText: [
      'name,entity_type,property_code,primary_email,external_id',
      'Aurora Wealth Partners,tenant,WESTGATE,certs@aurorawealth.com,',
      'River City Janitorial,vendor,,dispatch@rivercityjanitorial.com,V-100',
    ].join('\n'),
  });

  assert.equal(preview.summary.created, 1);
  assert.equal(preview.summary.updated, 1);
  assert.equal(preview.changes.some((item) => item.type === 'created' && item.name === 'River City Janitorial'), true);
  assert.equal(preview.changes.some((item) => item.type === 'updated' && item.name === 'Aurora Wealth Partners'), true);
  assert.equal(store.snapshot().entities.length, 3);
});

test('importRoster updates the persisted entity list used by the demo snapshot', () => {
  const store = createDemoStore();

  const result = store.importRoster({
    csvText: [
      'name,entity_type,property_code,primary_email,external_id',
      'Aurora Wealth Partners,tenant,WESTGATE,certs@aurorawealth.com,',
      'River City Janitorial,vendor,,dispatch@rivercityjanitorial.com,V-100',
    ].join('\n'),
  });

  assert.equal(result.summary.created, 1);
  assert.equal(result.summary.updated, 1);
  assert.equal(result.snapshot.entities.length, 4);

  const aurora = result.snapshot.entities.find((item) => item.id === 'entity-aurora');
  assert.equal(aurora.primaryEmail, 'certs@aurorawealth.com');

  const riverCity = result.snapshot.entities.find((item) => item.externalId === 'V-100');
  assert.equal(riverCity.name, 'River City Janitorial');
});

test('importRoster updates entity state through the demo store repository boundary', () => {
  const store = createDemoStore();
  const csvText = [
    'name,entity_type,property_code,primary_email,external_id',
    'Aurora Wealth Partners,tenant,WESTGATE,certs@aurorawealth.com,',
    'River City Janitorial,vendor,,dispatch@rivercityjanitorial.com,V-100',
  ].join('\n');

  const result = store.importRoster({ csvText });

  assert.deepEqual(result.summary, {
    totalRows: 2,
    created: 1,
    updated: 1,
    skipped: 0,
    errors: [],
  });
  assert.equal(result.snapshot.stats.entities, 4);

  const aurora = result.snapshot.entities.find((entity) => entity.id === 'entity-aurora');
  assert.equal(aurora.primaryEmail, 'certs@aurorawealth.com');

  const riverCity = result.snapshot.entities.find((entity) => entity.externalId === 'V-100');
  assert.equal(riverCity.name, 'River City Janitorial');
});

test('importInboxMessage appends a persisted message that flows through intake processing', () => {
  const store = createDemoStore();

  const result = store.importInboxMessage({
    message: {
      fromEmail: 'broker@newcoverage.com',
      subject: 'COI for River City Janitorial',
      bodyText: 'Attached is the certificate.',
      attachments: [
        {
          filename: 'RiverCity-COI.pdf',
          contentType: 'application/pdf',
          text: [
            'CERTIFICATE OF LIABILITY INSURANCE',
            'INSURED: River City Janitorial',
            'CERTIFICATE HOLDER: Knight Real Estate',
            'POLICY NUMBER: RCJ-101',
            'EXPIRATION DATE: 12/31/2026',
          ].join('\n'),
        },
      ],
    },
  });

  assert.equal(result.snapshot.stats.messages, 3);
  const importedMessage = result.snapshot.inbox.find((message) => message.id === result.message.id);
  assert.equal(importedMessage.subject, 'COI for River City Janitorial');
  assert.equal(importedMessage.results[0].extracted.insuredName, 'River City Janitorial');
});

test('importProviderMessage normalizes provider-specific mailbox JSON before intake', () => {
  const store = createDemoStore();

  const result = store.importProviderMessage({
    provider: 'gmail',
    message: {
      id: 'gmail-77',
      threadId: 'thread-77',
      from: 'Coverage Desk <desk@example.com>',
      subject: 'Updated Apex certificate',
      snippet: 'Attached is the updated Apex COI.',
      internalDate: '2026-03-24T10:00:00Z',
      attachments: [
        {
          filename: 'apex-coi.pdf',
          contentType: 'application/pdf',
          text: 'CERTIFICATE OF LIABILITY INSURANCE\nINSURED: Apex Mechanical Services\nCERTIFICATE HOLDER: Knight Real Estate\nPOLICY NUMBER: APEX-77\nEXPIRATION DATE: 09/30/2027',
        },
      ],
    },
  });

  assert.equal(result.provider, 'gmail');
  assert.equal(result.snapshot.stats.messages, 3);
  const importedMessage = result.snapshot.inbox.find((message) => message.id === 'gmail-77');
  assert.equal(importedMessage.fromEmail, 'desk@example.com');
  assert.equal(importedMessage.results[0].match.entity?.id, 'entity-apex');
});

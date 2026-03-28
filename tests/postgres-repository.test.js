import test from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresRepository } from '../src/lib/postgres-repository.js';

function createFakeDb(sequence) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      return sequence.shift() || { rows: [] };
    },
  };
}

test('createPostgresRepository reads client-scoped entities and certificates with app-shaped field names', async () => {
  const db = createFakeDb([
    {
      rows: [
        {
          id: 'entity-1',
          clientId: 'client-1',
          entityTypeId: 'tenant',
          propertyId: 'prop-1',
          externalId: 'EXT-1',
          name: 'Aurora Wealth Partners',
          normalizedName: 'aurora wealth partners',
          status: 'active',
          primaryEmail: 'office@aurorawealth.com',
          alternateEmails: ['ops@aurorawealth.com'],
          metadataJson: { notes: 'tenant' },
        },
      ],
    },
    {
      rows: [
        {
          id: 'cert-1',
          clientId: 'client-1',
          entityId: 'entity-1',
          sourceEmailId: 'msg-1',
          sourceAttachmentId: 'att-1',
          status: 'accepted',
          reviewStatus: 'accepted',
          confidenceScore: 0.95,
          insuredName: 'Aurora Wealth Partners',
          certificateHolder: 'Knight Real Estate',
          producerName: 'Broker Team',
          carrierSummary: 'Carrier A',
          policySummary: [],
          effectiveDate: '2026-01-01',
          expirationDate: '2026-12-31',
          receivedDate: '2026-01-15',
          isActive: true,
          supersedesCertificateId: null,
          parsedJson: { relationship: 'new' },
        },
      ],
    },
  ]);

  const repo = createPostgresRepository(db);
  const entities = await repo.getEntities('client-1');
  const certificates = await repo.getCertificates('client-1');

  assert.equal(entities[0].name, 'Aurora Wealth Partners');
  assert.equal(entities[0].primaryEmail, 'office@aurorawealth.com');
  assert.equal(certificates[0].insuredName, 'Aurora Wealth Partners');
  assert.equal(certificates[0].reviewStatus, 'accepted');
  assert.equal(db.calls.length, 2);
  assert.deepEqual(db.calls.map((call) => call.params), [['client-1'], ['client-1']]);
});

test('createPostgresRepository folds resolved review queue rows into review override map', async () => {
  const db = createFakeDb([
    {
      rows: [
        {
          id: 'review-row-1',
          payload: {
            reviewItemId: 'msg-2:att-2',
            status: 'closed',
            resolution: 'accepted',
          },
        },
      ],
    },
  ]);

  const repo = createPostgresRepository(db);
  const overrides = await repo.getReviewOverrides('client-1');

  assert.deepEqual(overrides, {
    'msg-2:att-2': {
      reviewItemId: 'msg-2:att-2',
      status: 'closed',
      resolution: 'accepted',
    },
  });
});

test('createPostgresRepository can append an imported message plus attachments', async () => {
  const db = createFakeDb([
    { rows: [] },
    { rows: [] },
    { rows: [] },
  ]);

  const repo = createPostgresRepository(db);
  const inboundMessageId = await repo.appendImportedMessage({
    clientId: 'client-1',
    mailboxId: 'mailbox-1',
    message: {
      id: 'gmail-sample-1',
      fromEmail: 'broker@example.com',
      fromName: 'Broker',
      subject: 'Updated Apex certificate',
      bodyText: 'Attached is the updated COI.',
      receivedAt: '2026-03-25T08:00:00Z',
      attachments: [
        {
          id: 'att-1',
          filename: 'Apex-COI.pdf',
          contentType: 'application/pdf',
          text: 'CERTIFICATE OF LIABILITY INSURANCE',
        },
        {
          id: 'att-2',
          filename: 'notes.txt',
          contentType: 'text/plain',
          text: 'broker notes',
        },
      ],
    },
  });

  assert.equal(typeof inboundMessageId, 'string');
  assert.equal(db.calls.length, 3);
  assert.equal(db.calls[0].sql.includes('insert into inbound_messages'), true);
  assert.equal(db.calls[1].sql.includes('insert into attachments'), true);
  assert.equal(db.calls[2].sql.includes('insert into attachments'), true);
  assert.equal(db.calls[1].params[8], true);
  assert.equal(db.calls[2].params[8], false);
});

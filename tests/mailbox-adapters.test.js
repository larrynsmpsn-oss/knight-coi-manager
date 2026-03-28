import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAppleMailMessage,
  normalizeExchangeMessage,
  normalizeGmailMessage,
  normalizeMailboxMessage,
} from '../src/lib/mailbox-adapters.js';

test('normalizeAppleMailMessage maps Apple Mail fields into intake shape', () => {
  const normalized = normalizeAppleMailMessage({
    messageId: 'apple-1',
    sender: 'Broker Team <certs@broker.com>',
    subject: 'Updated COI',
    content: 'Please see attached.',
    dateReceived: '2026-03-24T07:55:00Z',
    attachments: [
      {
        name: 'coi.pdf',
        mimeType: 'application/pdf',
        size: 12345,
        extractedText: 'CERTIFICATE OF LIABILITY INSURANCE',
      },
    ],
  });

  assert.deepEqual(normalized, {
    id: 'apple-1',
    provider: 'apple-mail',
    providerMessageId: 'apple-1',
    threadKey: null,
    fromEmail: 'certs@broker.com',
    fromName: 'Broker Team',
    subject: 'Updated COI',
    bodyText: 'Please see attached.',
    receivedAt: '2026-03-24T07:55:00Z',
    attachments: [
      {
        id: 'apple-mail-apple-1-1-att-coi.pdf',
        filename: 'coi.pdf',
        contentType: 'application/pdf',
        byteSize: 12345,
        text: 'CERTIFICATE OF LIABILITY INSURANCE',
      },
    ],
  });
});

test('normalizeGmailMessage maps Gmail fields into intake shape', () => {
  const normalized = normalizeGmailMessage({
    id: 'gmail-1',
    threadId: 'thread-99',
    from: 'Knight Broker <renewals@carrier.com>',
    subject: 'Certificate attached',
    snippet: 'Attached is the updated COI for Apex.',
    internalDate: '2026-03-24T08:00:00Z',
    attachments: [
      {
        id: 'gmail-att-1',
        filename: 'apex-coi.pdf',
        contentType: 'application/pdf',
        text: 'INSURED: Apex Mechanical Services',
      },
    ],
  });

  assert.equal(normalized.provider, 'gmail');
  assert.equal(normalized.threadKey, 'thread-99');
  assert.equal(normalized.fromEmail, 'renewals@carrier.com');
  assert.equal(normalized.fromName, 'Knight Broker');
  assert.equal(normalized.attachments[0].id, 'gmail-att-1');
  assert.equal(normalized.attachments[0].filename, 'apex-coi.pdf');
});

test('normalizeExchangeMessage maps Exchange preview/date fields into intake shape', () => {
  const normalized = normalizeExchangeMessage({
    id: 'ews-1',
    conversationId: 'conv-1',
    from: 'Coverage Desk <desk@example.com>',
    subject: 'Renewal packet',
    preview: 'COI and policy summary attached.',
    dateTimeReceived: '2026-03-24T08:01:00Z',
    attachments: [],
  });

  assert.equal(normalized.provider, 'exchange');
  assert.equal(normalized.threadKey, 'conv-1');
  assert.equal(normalized.bodyText, 'COI and policy summary attached.');
  assert.equal(normalized.receivedAt, '2026-03-24T08:01:00Z');
});

test('normalizeMailboxMessage falls back for unknown providers', () => {
  const normalized = normalizeMailboxMessage('imap-custom', {
    id: 'custom-1',
    fromEmail: 'test@example.com',
    subject: 'Hello',
  });

  assert.equal(normalized.provider, 'imap-custom');
  assert.equal(normalized.fromEmail, 'test@example.com');
  assert.equal(normalized.subject, 'Hello');
});

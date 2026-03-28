import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAppleMailExportScript, parseAppleMailExport, parseAppleMailTabExport } from '../src/lib/apple-mail-export.js';

test('buildAppleMailExportScript embeds subject/sender filters and limit', () => {
  const script = buildAppleMailExportScript({
    subjectContains: 'COI',
    senderContains: 'broker.com',
    limit: 5,
  });

  assert.equal(script.includes('set maxCount to 5'), true);
  assert.equal(script.includes('set subjectFilter to "COI"'), true);
  assert.equal(script.includes('set senderFilter to "broker.com"'), true);
  assert.equal(script.includes('tell application "Mail"'), true);
});

test('parseAppleMailExport normalizes raw Apple Mail export JSON', () => {
  const messages = parseAppleMailExport(JSON.stringify([
    {
      messageId: 'apple-77',
      sender: 'Broker Team <certs@broker.com>',
      subject: 'Updated COI',
      content: 'Attached is the certificate.',
      dateReceived: '2026-03-24T12:00:00Z',
      attachments: [
        {
          name: 'coi.pdf',
          mimeType: 'application/pdf',
        },
      ],
    },
  ]));

  assert.equal(messages.length, 1);
  assert.equal(messages[0].provider, 'apple-mail');
  assert.equal(messages[0].fromEmail, 'certs@broker.com');
  assert.equal(messages[0].attachments[0].filename, 'coi.pdf');
});

test('parseAppleMailTabExport normalizes tab-delimited Apple Mail export lines', () => {
  const messages = parseAppleMailTabExport(
    'apple-88\tBroker Team <certs@broker.com>\tUpdated COI\tAttached is the certificate.\t2026-03-24T12:00:00Z\tcoi.pdf::application/pdf||readme.txt::text/plain'
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, 'apple-88');
  assert.equal(messages[0].attachments.length, 2);
  assert.equal(messages[0].attachments[0].filename, 'coi.pdf');
});

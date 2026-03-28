import test from 'node:test';
import assert from 'node:assert/strict';
import { importProviderMessagesToPostgres } from '../src/lib/postgres-ingestion.js';

function createFakeRepository() {
  const appended = [];
  return {
    appended,
    async getClientBySlug(slug) {
      if (slug === 'knight-real-estate') {
        return { id: 'client-1', slug };
      }
      return null;
    },
    async appendImportedMessage({ clientId, mailboxId, message }) {
      appended.push({ clientId, mailboxId, message });
      return `imported-${appended.length}`;
    },
  };
}

test('importProviderMessagesToPostgres normalizes provider messages and appends them through the repository', async () => {
  const repository = createFakeRepository();

  const result = await importProviderMessagesToPostgres({
    repository,
    clientSlug: 'knight-real-estate',
    mailboxId: 'mailbox-1',
    provider: 'gmail',
    messages: {
      id: 'gmail-sample-1',
      subject: 'Updated Apex certificate',
      snippet: 'Attached is the updated COI.',
      internalDate: '1760000000000',
      from: 'Broker Team <broker@example.com>',
      attachments: [
        {
          filename: 'Apex-COI.pdf',
          mimeType: 'application/pdf',
          text: 'CERTIFICATE OF LIABILITY INSURANCE',
        },
      ],
    },
  });

  assert.equal(result.imported, 1);
  assert.deepEqual(result.inboundMessageIds, ['imported-1']);
  assert.equal(repository.appended.length, 1);
  assert.equal(repository.appended[0].clientId, 'client-1');
  assert.equal(repository.appended[0].mailboxId, 'mailbox-1');
  assert.equal(repository.appended[0].message.subject, 'Updated Apex certificate');
  assert.equal(repository.appended[0].message.fromEmail, 'broker@example.com');
});

test('importProviderMessagesToPostgres throws when the client slug cannot be resolved', async () => {
  const repository = createFakeRepository();

  await assert.rejects(
    () => importProviderMessagesToPostgres({
      repository,
      clientSlug: 'missing-client',
      mailboxId: 'mailbox-1',
      provider: 'gmail',
      messages: [],
    }),
    /Client not found/
  );
});

import { normalizeMailboxMessage } from './mailbox-adapters.js';

export async function importProviderMessagesToPostgres({
  repository,
  clientSlug,
  mailboxId,
  provider,
  messages,
}) {
  if (!repository || typeof repository.getClientBySlug !== 'function' || typeof repository.appendImportedMessage !== 'function') {
    throw new Error('Repository must support getClientBySlug and appendImportedMessage');
  }
  if (!clientSlug) {
    throw new Error('clientSlug is required');
  }
  if (!mailboxId) {
    throw new Error('mailboxId is required');
  }

  const client = await repository.getClientBySlug(clientSlug);
  if (!client) {
    throw new Error(`Client not found for slug: ${clientSlug}`);
  }

  const inputMessages = Array.isArray(messages) ? messages : [messages];
  const importedMessageIds = [];

  for (const message of inputMessages) {
    const normalized = normalizeMailboxMessage(provider, message);
    const inboundMessageId = await repository.appendImportedMessage({
      clientId: client.id,
      mailboxId,
      message: normalized,
    });
    importedMessageIds.push(inboundMessageId);
  }

  return {
    client,
    provider,
    imported: importedMessageIds.length,
    inboundMessageIds: importedMessageIds,
  };
}

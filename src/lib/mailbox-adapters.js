function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeEmailAddress(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] || raw).trim().toLowerCase();
}

function splitDisplayNameAndEmail(value) {
  if (!value) return { name: null, email: null };
  const raw = String(value).trim();
  const match = raw.match(/^(.*?)(?:\s*<([^>]+)>)?$/);
  const name = match?.[1]?.replace(/^"|"$/g, '').trim() || null;
  const email = normalizeEmailAddress(match?.[2] || raw);

  if (email === raw.toLowerCase()) {
    return { name: null, email };
  }

  return {
    name: name && name !== email ? name : null,
    email,
  };
}

function normalizeAttachment(attachment = {}, prefix) {
  const text = attachment.text ?? attachment.extractedText ?? attachment.bodyText ?? '';
  const filename = attachment.filename || attachment.name || 'attachment';

  return {
    id: attachment.id || `${prefix}-att-${filename}`,
    filename,
    contentType: attachment.contentType || attachment.mimeType || null,
    byteSize: attachment.byteSize || attachment.size || null,
    text: typeof text === 'string' ? text : '',
  };
}

function normalizeCommonMessage(message = {}, provider) {
  const sender = splitDisplayNameAndEmail(message.from || message.sender || message.fromEmail || message.senderEmail);

  return {
    id: message.id || message.messageId || `${provider}-message`,
    provider,
    providerMessageId: message.messageId || message.id || null,
    threadKey: message.threadId || message.conversationId || null,
    fromEmail: sender.email,
    fromName: message.fromName || sender.name,
    subject: message.subject || '',
    bodyText: message.bodyText || message.textBody || message.preview || '',
    receivedAt: message.receivedAt || message.dateReceived || message.internalDate || message.date || null,
    attachments: toArray(message.attachments).map((attachment, index) =>
      normalizeAttachment(attachment, `${provider}-${message.id || message.messageId || 'msg'}-${index + 1}`)
    ),
  };
}

export function normalizeAppleMailMessage(message = {}) {
  return normalizeCommonMessage(
    {
      ...message,
      id: message.id || message.messageId,
      from: message.sender,
      bodyText: message.bodyText || message.content,
      receivedAt: message.dateReceived || message.receivedAt,
    },
    'apple-mail'
  );
}

export function normalizeGmailMessage(message = {}) {
  return normalizeCommonMessage(
    {
      ...message,
      from: message.from,
      bodyText: message.snippet || message.bodyText,
      receivedAt: message.internalDate || message.receivedAt,
    },
    'gmail'
  );
}

export function normalizeExchangeMessage(message = {}) {
  return normalizeCommonMessage(
    {
      ...message,
      from: message.from,
      bodyText: message.bodyText || message.preview,
      receivedAt: message.dateTimeReceived || message.receivedAt,
    },
    'exchange'
  );
}

export function normalizeMailboxMessage(provider, message = {}) {
  switch (provider) {
    case 'apple-mail':
      return normalizeAppleMailMessage(message);
    case 'gmail':
      return normalizeGmailMessage(message);
    case 'exchange':
      return normalizeExchangeMessage(message);
    default:
      return normalizeCommonMessage(message, provider || 'unknown');
  }
}

import { processInboundMessage } from './intake.js';
import { buildReviewQueueItems, summarizeReviewQueue } from './review-queue.js';
import { createInMemoryRepository } from './repository.js';
import {
  acceptMatchedCertificate,
  assignEntityAndAccept,
  rejectIntakeResult,
} from './review-decisions.js';
import { evaluateCertificateValidity } from './certificate-validity.js';
import { importEntityRoster } from './roster-import.js';
import { normalizeMailboxMessage } from './mailbox-adapters.js';

function sortByName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''));
}

function sortByDateDesc(a, b) {
  return String(b.expirationDate || '').localeCompare(String(a.expirationDate || ''));
}

function applyReviewOverride(reviewItem, overridesById) {
  const override = overridesById[reviewItem.id];
  return override ? { ...reviewItem, ...override } : reviewItem;
}

function buildValidity({ client, result, entityId = null }) {
  return evaluateCertificateValidity({
    entityId,
    intakeResult: result,
    rules: {
      expectedCertificateHolder: client.name,
      warnIfCertificateHolderMismatch: true,
      requireLikelyCertificate: true,
      requireEntityId: true,
      requireInsuredName: true,
      requireExpirationDate: true,
      requireCertificateHolder: true,
      requirePolicyNumber: true,
      warnOnMissingEffectiveDate: true,
      warnOnMissingProducer: true,
      warnOnMissingCarrierSummary: true,
      warnOnNoCoverages: true,
    },
  });
}

function buildSnapshot(repository) {
  const client = repository.getClient();
  const entityTypes = repository.getEntityTypes();
  const properties = repository.getProperties();
  const entitiesInput = repository.getEntities();
  const certificates = repository.getCertificates();
  const messages = repository.getMessages();
  const reviewOverrides = repository.getReviewOverrides();

  const processedMessages = messages.map((message) => {
    const intakeResults = processInboundMessage({
      message,
      entities: entitiesInput,
      existingCertificates: certificates,
    }).map((result) => ({
      ...result,
      validity: buildValidity({
        client,
        result,
        entityId: result.match?.entity?.id || null,
      }),
    }));

    const reviewItems = buildReviewQueueItems({
      clientId: client.id,
      message,
      intakeResults,
    })
      .map((item) => {
        const matchingResult = intakeResults.find((result) => result.attachmentId === item.attachmentId);
        return matchingResult
          ? {
              ...item,
              validity: matchingResult.validity,
            }
          : item;
      })
      .map((item) => applyReviewOverride(item, reviewOverrides));

    return {
      ...message,
      intakeResults,
      reviewItems,
    };
  });

  const processedAttachments = processedMessages.flatMap((message) =>
    message.intakeResults.map((result) => ({
      messageId: message.id,
      messageSubject: message.subject,
      receivedAt: message.receivedAt,
      fromEmail: message.fromEmail,
      attachmentId: result.attachmentId,
      filename: result.filename,
      insuredName: result.extracted.insuredName,
      certificateHolder: result.extracted.certificateHolder,
      matchedEntityId: result.match.entity?.id || null,
      matchedEntityName: result.match.entity?.name || null,
      matchScore: result.match.score,
      relationship: result.relationship,
      likelyCertificate: result.likelyCertificate,
      needsReview: result.needsReview,
      reviewReason: result.reviewReason,
      expirationDate: result.extracted.expirationDate || null,
      reminderSchedule: result.reminderSchedule,
      extracted: result.extracted,
      validity: result.validity,
    }))
  );

  const reviewQueue = processedMessages.flatMap((message) => message.reviewItems);
  const openReviewQueue = reviewQueue.filter((item) => item.status === 'open');
  const resolvedReviewQueue = reviewQueue.filter((item) => item.status !== 'open');

  const activeCertificateByEntityId = new Map();
  for (const certificate of [...certificates].sort(sortByDateDesc)) {
    if (!activeCertificateByEntityId.has(certificate.entityId) && certificate.isActive !== false) {
      activeCertificateByEntityId.set(certificate.entityId, certificate);
    }
  }

  const entities = [...entitiesInput]
    .sort(sortByName)
    .map((entity) => ({
      ...entity,
      activeCertificate: activeCertificateByEntityId.get(entity.id) || null,
    }));

  const reviewHistorySummary = resolvedReviewQueue.reduce(
    (summary, item) => {
      const resolution = item.resolution || 'resolved';
      summary.total += 1;
      summary.byResolution[resolution] = (summary.byResolution[resolution] || 0) + 1;
      return summary;
    },
    {
      total: 0,
      byResolution: {},
    }
  );

  const stats = {
    entities: entities.length,
    certificates: certificates.length,
    messages: messages.length,
    attachmentsProcessed: processedAttachments.length,
    likelyCertificates: processedAttachments.filter((item) => item.likelyCertificate).length,
    needsReview: openReviewQueue.length,
    renewalsDetected: processedAttachments.filter((item) => item.relationship === 'renewal').length,
    resolvedReviewItems: resolvedReviewQueue.length,
    validityBlocked: processedAttachments.filter((item) => !item.validity?.valid).length,
    validityWarnings: processedAttachments.filter((item) => (item.validity?.warnings || []).length > 0).length,
  };

  return {
    client,
    entityTypes,
    properties,
    entities,
    certificates: [...certificates].sort(sortByDateDesc),
    inbox: processedMessages.map(({ intakeResults, reviewItems, ...message }) => ({
      ...message,
      attachmentCount: (message.attachments || []).length,
      results: intakeResults,
      reviewItems,
    })),
    processedAttachments,
    reviewQueue,
    openReviewQueue,
    resolvedReviewQueue,
    reviewSummary: summarizeReviewQueue(openReviewQueue),
    reviewHistorySummary,
    stats,
  };
}

function generateMessageId(existingMessages = []) {
  let counter = existingMessages.length + 1;
  let candidate = `msg-import-${counter}`;
  const existingIds = new Set(existingMessages.map((message) => message.id));

  while (existingIds.has(candidate)) {
    counter += 1;
    candidate = `msg-import-${counter}`;
  }

  return candidate;
}

function normalizeImportedMessage(message, existingMessages = []) {
  if (!message || typeof message !== 'object') {
    throw new Error('message payload must be an object');
  }

  if (!Array.isArray(message.attachments) || message.attachments.length === 0) {
    throw new Error('message.attachments must be a non-empty array');
  }

  const id = message.id || generateMessageId(existingMessages);
  return {
    id,
    fromEmail: message.fromEmail || 'imported@example.com',
    fromName: message.fromName || 'Imported Message',
    subject: message.subject || `Imported message ${id}`,
    bodyText: message.bodyText || '',
    receivedAt: message.receivedAt || new Date().toISOString(),
    attachments: message.attachments.map((attachment, index) => ({
      id: attachment.id || `${id}-att-${index + 1}`,
      filename: attachment.filename || `attachment-${index + 1}.txt`,
      contentType: attachment.contentType || 'text/plain',
      text: attachment.text || '',
    })),
  };
}

function findMessageAndResult(snapshot, { messageId, attachmentId }) {
  const message = snapshot.inbox.find((item) => item.id === messageId);
  if (!message) {
    throw new Error(`Unknown message: ${messageId}`);
  }

  const intakeResult = (message.results || []).find((item) => item.attachmentId === attachmentId);
  if (!intakeResult) {
    throw new Error(`Unknown attachment on message ${messageId}: ${attachmentId}`);
  }

  const reviewQueueItem = (message.reviewItems || []).find((item) => item.attachmentId === attachmentId) || null;

  return { message, intakeResult, reviewQueueItem };
}

function summarizeRosterPreview({ beforeEntities, afterEntities, summary }) {
  const beforeById = new Map(beforeEntities.map((entity) => [entity.id, entity]));
  const afterById = new Map(afterEntities.map((entity) => [entity.id, entity]));

  const created = afterEntities
    .filter((entity) => !beforeById.has(entity.id))
    .map((entity) => ({
      type: 'created',
      id: entity.id,
      name: entity.name,
      entityTypeId: entity.entityTypeId,
      propertyId: entity.propertyId,
      primaryEmail: entity.primaryEmail || null,
    }));

  const updated = afterEntities
    .filter((entity) => beforeById.has(entity.id))
    .filter((entity) => JSON.stringify(beforeById.get(entity.id)) !== JSON.stringify(entity))
    .map((entity) => ({
      type: 'updated',
      id: entity.id,
      name: entity.name,
      before: beforeById.get(entity.id),
      after: entity,
    }));

  return {
    summary,
    changes: [...created, ...updated],
  };
}

export function createDemoStore(repository = createInMemoryRepository()) {
  return {
    repository,
    snapshot() {
      return buildSnapshot(repository);
    },
    acceptMatched({ messageId, attachmentId }) {
      const snapshot = buildSnapshot(repository);
      const { message, intakeResult, reviewQueueItem } = findMessageAndResult(snapshot, {
        messageId,
        attachmentId,
      });

      const result = acceptMatchedCertificate({
        client: snapshot.client,
        clientId: snapshot.client.id,
        message,
        intakeResult,
        existingCertificates: snapshot.certificates,
        reviewQueueItem,
      });

      repository.replaceCertificates(snapshot.client.id, result.certificates);
      if (result.reviewQueueItem) {
        repository.saveReviewOverride(snapshot.client.id, result.reviewQueueItem.id, result.reviewQueueItem);
      }

      return {
        decision: result.decision,
        certificate: result.acceptedCertificate,
        snapshot: buildSnapshot(repository),
      };
    },
    assignEntity({ messageId, attachmentId, entityId }) {
      const snapshot = buildSnapshot(repository);
      const { message, intakeResult, reviewQueueItem } = findMessageAndResult(snapshot, {
        messageId,
        attachmentId,
      });

      const entity = snapshot.entities.find((item) => item.id === entityId) || null;

      const result = assignEntityAndAccept({
        client: snapshot.client,
        entity,
        clientId: snapshot.client.id,
        entityId,
        message,
        intakeResult,
        existingCertificates: snapshot.certificates,
        reviewQueueItem,
      });

      repository.replaceCertificates(snapshot.client.id, result.certificates);
      if (result.reviewQueueItem) {
        repository.saveReviewOverride(snapshot.client.id, result.reviewQueueItem.id, result.reviewQueueItem);
      }

      return {
        decision: result.decision,
        certificate: result.acceptedCertificate,
        snapshot: buildSnapshot(repository),
      };
    },
    reject({ messageId, attachmentId, reason }) {
      const snapshot = buildSnapshot(repository);
      const { reviewQueueItem } = findMessageAndResult(snapshot, {
        messageId,
        attachmentId,
      });

      const result = rejectIntakeResult({ reviewQueueItem, reason });
      if (result.reviewQueueItem) {
        repository.saveReviewOverride(snapshot.client.id, result.reviewQueueItem.id, result.reviewQueueItem);
      }

      return {
        decision: result.decision,
        snapshot: buildSnapshot(repository),
      };
    },
    previewRoster({ csvText, defaultEntityTypeKey = 'tenant' }) {
      const snapshot = buildSnapshot(repository);
      const result = importEntityRoster({
        clientId: snapshot.client.id,
        csvText,
        entityTypes: snapshot.entityTypes,
        properties: snapshot.properties,
        existingEntities: snapshot.entities,
        defaultEntityTypeKey,
      });

      return summarizeRosterPreview({
        beforeEntities: snapshot.entities,
        afterEntities: result.entities,
        summary: result.summary,
      });
    },
    importRoster({ csvText, defaultEntityTypeKey = 'tenant' }) {
      const snapshot = buildSnapshot(repository);
      const result = importEntityRoster({
        clientId: snapshot.client.id,
        csvText,
        entityTypes: snapshot.entityTypes,
        properties: snapshot.properties,
        existingEntities: snapshot.entities,
        defaultEntityTypeKey,
      });

      repository.replaceEntities(snapshot.client.id, result.entities);

      return {
        summary: result.summary,
        snapshot: buildSnapshot(repository),
      };
    },
    importInboxMessage({ message }) {
      const snapshot = buildSnapshot(repository);
      const existingMessages = repository.getMessages();
      const normalizedMessage = normalizeImportedMessage(message, existingMessages);
      repository.replaceMessages(snapshot.client.id, [...existingMessages, normalizedMessage]);

      return {
        message: normalizedMessage,
        snapshot: buildSnapshot(repository),
      };
    },
    importProviderMessage({ provider, message }) {
      const snapshot = buildSnapshot(repository);
      const existingMessages = repository.getMessages();
      const providerNormalized = normalizeMailboxMessage(provider, message);
      const normalizedMessage = normalizeImportedMessage(providerNormalized, existingMessages);
      repository.replaceMessages(snapshot.client.id, [...existingMessages, normalizedMessage]);

      return {
        provider,
        message: normalizedMessage,
        snapshot: buildSnapshot(repository),
      };
    },
  };
}

import { detectCertificateRelationship } from './matching.js';
import { buildReminderSchedule, cancelFutureReminders } from './reminders.js';
import { evaluateCertificateValidity } from './validity.js';

function normalizeDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const slash = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, mm, dd, yy] = slash;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function sortByExpirationDesc(a, b) {
  return String(b.expirationDate || '').localeCompare(String(a.expirationDate || ''));
}

function cloneCertificate(certificate) {
  return {
    ...certificate,
    reminderEvents: (certificate.reminderEvents || []).map((event) => ({ ...event })),
  };
}

export function validateCertificateForAcceptance({ client = null, entity = null, intakeResult, entityId = null }) {
  const resolvedEntity = entity || (entityId ? { id: entityId } : null);
  const validity = evaluateCertificateValidity({
    client,
    entity: resolvedEntity,
    intakeResult,
  });

  return {
    valid: validity.valid,
    issues: validity.blockingIssues,
    warnings: validity.warnings,
  };
}

function buildAcceptedCertificate({
  clientId,
  entityId,
  message,
  intakeResult,
  activeCertificate,
}) {
  const expirationDate = normalizeDate(intakeResult.extracted?.expirationDate);
  const effectiveDate = normalizeDate(intakeResult.extracted?.effectiveDate);
  const policyNumber = intakeResult.extracted?.policyNumbers?.[0] || intakeResult.extracted?.policyNumber || null;

  const relationship = activeCertificate
    ? detectCertificateRelationship({
        newCertificate: {
          policyNumber,
          expirationDate,
        },
        existingCertificate: {
          policyNumber: activeCertificate.policyNumber,
          expirationDate: activeCertificate.expirationDate,
        },
      })
    : 'new';

  const shouldSupersede = activeCertificate && relationship !== 'new';
  const reminderEvents = buildReminderSchedule({ expirationDate }).map((event) => ({
    ...event,
    status: 'scheduled',
    deliveryStatus: 'pending',
  }));

  return {
    id: `cert-${intakeResult.attachmentId}`,
    clientId,
    entityId,
    sourceEmailId: message.id || null,
    sourceAttachmentId: intakeResult.attachmentId || null,
    insuredName: intakeResult.extracted?.insuredName || null,
    certificateHolder: intakeResult.extracted?.certificateHolder || null,
    producerName: intakeResult.extracted?.producerName || null,
    carrierSummary: intakeResult.extracted?.carrierSummary || null,
    policySummary: intakeResult.extracted?.coverages || [],
    policyNumber,
    effectiveDate,
    expirationDate,
    receivedDate: normalizeDate(message.receivedAt) || normalizeDate(new Date().toISOString()),
    confidenceScore: intakeResult.match?.score ?? intakeResult.extracted?.confidence ?? 0,
    status: 'active',
    needsReview: false,
    supersedesCertificateId: shouldSupersede ? activeCertificate.id : null,
    relationship,
    reminderEvents,
  };
}

function closeReviewItem(reviewQueueItem, resolution, notes = null) {
  if (!reviewQueueItem) return null;

  return {
    ...reviewQueueItem,
    status: 'closed',
    resolution,
    resolutionNotes: notes,
  };
}

function applyAcceptedCertificate({
  client,
  entity,
  clientId,
  entityId,
  message,
  intakeResult,
  existingCertificates = [],
  reviewQueueItem = null,
  notes = null,
}) {
  const validation = validateCertificateForAcceptance({ client, entity, intakeResult, entityId });
  if (!validation.valid) {
    throw new Error(`Certificate cannot be accepted: ${validation.issues.join(', ')}`);
  }

  const clonedCertificates = existingCertificates.map(cloneCertificate);
  const entityCertificates = clonedCertificates
    .filter((certificate) => certificate.entityId === entityId)
    .sort(sortByExpirationDesc);

  const comparisonCertificate = entityCertificates[0] || null;
  const acceptedCertificate = buildAcceptedCertificate({
    clientId,
    entityId,
    message,
    intakeResult,
    activeCertificate: comparisonCertificate,
  });

  acceptedCertificate.validity = {
    blockingIssues: validation.issues,
    warnings: validation.warnings,
  };

  const updatedCertificates = clonedCertificates.map((certificate) => {
    if (certificate.id !== acceptedCertificate.supersedesCertificateId) return certificate;

    return {
      ...certificate,
      isActive: false,
      status: 'superseded',
      supersededByCertificateId: acceptedCertificate.id,
      reminderEvents: cancelFutureReminders(
        certificate.reminderEvents || [],
        acceptedCertificate.receivedDate
      ).map((event) => ({
        ...event,
        status: event.canceled ? 'canceled' : event.status || 'scheduled',
      })),
    };
  });

  updatedCertificates.push({
    ...acceptedCertificate,
    isActive: true,
  });

  return {
    acceptedCertificate,
    certificates: updatedCertificates,
    reviewQueueItem: closeReviewItem(reviewQueueItem, 'accepted', notes),
    decision: {
      action: 'accept',
      entityId,
      certificateId: acceptedCertificate.id,
      supersededCertificateId: acceptedCertificate.supersedesCertificateId,
      relationship: acceptedCertificate.relationship,
    },
  };
}

export function acceptMatchedCertificate({
  client = null,
  clientId,
  message,
  intakeResult,
  existingCertificates = [],
  reviewQueueItem = null,
}) {
  const entity = intakeResult?.match?.entity || null;
  const entityId = entity?.id || null;

  return applyAcceptedCertificate({
    client,
    entity,
    clientId,
    entityId,
    message,
    intakeResult,
    existingCertificates,
    reviewQueueItem,
  });
}

export function assignEntityAndAccept({
  client = null,
  entity = null,
  clientId,
  entityId,
  message,
  intakeResult,
  existingCertificates = [],
  reviewQueueItem = null,
}) {
  return applyAcceptedCertificate({
    client,
    entity,
    clientId,
    entityId,
    message,
    intakeResult,
    existingCertificates,
    reviewQueueItem,
    notes: 'Entity assigned manually during review.',
  });
}

export function rejectIntakeResult({ reviewQueueItem = null, reason = 'not_a_valid_certificate' }) {
  return {
    acceptedCertificate: null,
    certificates: null,
    reviewQueueItem: closeReviewItem(reviewQueueItem, 'rejected', reason),
    decision: {
      action: 'reject',
      reason,
    },
  };
}

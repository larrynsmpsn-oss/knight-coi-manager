import { buildReminderSchedule, cancelFutureReminders } from './reminders.js';

function normalizeDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, mm, dd, yy] = slash;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function isoTimestamp(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function resolveEntity({ intakeResult, entityId, entities = [] }) {
  if (entityId) {
    return entities.find((entity) => entity.id === entityId) || null;
  }
  return intakeResult?.match?.entity || null;
}

function buildCertificateId({ attachmentId, entityId, receivedAt }) {
  const receivedDate = normalizeDate(receivedAt) || 'pending';
  return `cert:${entityId}:${attachmentId || 'attachment'}:${receivedDate}`;
}

function buildReminderEvents({ clientId, entity, certificate, reminderSchedule = [] }) {
  const emailTo = [entity.primaryEmail, ...(entity.alternateEmails || [])].filter(Boolean);

  return reminderSchedule.map((reminder) => ({
    id: `reminder:${certificate.id}:${reminder.offsetDays}`,
    clientId,
    entityId: entity.id,
    certificateId: certificate.id,
    reminderType: `expiring_${reminder.offsetDays}_days`,
    scheduledFor: reminder.sendOn,
    sentAt: null,
    canceledAt: null,
    deliveryStatus: 'scheduled',
    emailTo,
    templateKey: 'certificate_expiration_reminder',
    metadata: {
      offsetDays: reminder.offsetDays,
      expiresOn: reminder.expiresOn,
    },
  }));
}

function cancelSupersededReminderEvents({ existingReminderEvents = [], priorCertificateId, replacementReceivedAt }) {
  if (!priorCertificateId) return existingReminderEvents;

  const replacementDate = normalizeDate(replacementReceivedAt);
  if (!replacementDate) return existingReminderEvents;

  const priorEvents = existingReminderEvents.filter((event) => event.certificateId === priorCertificateId);
  const cancellationPlan = cancelFutureReminders(
    priorEvents.map((event) => ({ sendOn: normalizeDate(event.scheduledFor) || event.scheduledFor })),
    replacementDate
  );
  const cancelMap = new Map(cancellationPlan.map((item) => [item.sendOn, item.canceled]));

  return existingReminderEvents.map((event) => {
    if (event.certificateId !== priorCertificateId) return event;

    const normalizedScheduledFor = normalizeDate(event.scheduledFor) || event.scheduledFor;
    if (!cancelMap.get(normalizedScheduledFor)) return event;

    return {
      ...event,
      canceledAt: isoTimestamp(replacementReceivedAt),
      deliveryStatus: event.sentAt ? event.deliveryStatus : 'canceled',
    };
  });
}

export function acceptReviewedCertificate({
  clientId,
  message,
  intakeResult,
  entities = [],
  existingCertificates = [],
  existingReminderEvents = [],
  reviewItem = null,
  entityId = null,
}) {
  const entity = resolveEntity({ intakeResult, entityId, entities });
  if (!entity) {
    throw new Error('Cannot accept certificate without a resolved entity');
  }

  const receivedAt = message?.receivedAt || new Date().toISOString();
  const receivedDate = normalizeDate(receivedAt);
  const effectiveDate = normalizeDate(intakeResult?.extracted?.effectiveDate);
  const expirationDate = normalizeDate(intakeResult?.extracted?.expirationDate);

  const priorActiveCertificate = [...existingCertificates]
    .filter((certificate) => certificate.entityId === entity.id)
    .sort((a, b) => String(b.expirationDate || '').localeCompare(String(a.expirationDate || '')))[0] || null;

  const relationship =
    intakeResult?.relationship === 'duplicate' || intakeResult?.relationship === 'renewal'
      ? intakeResult.relationship
      : 'new';

  const certificate = {
    id: buildCertificateId({
      attachmentId: intakeResult?.attachmentId,
      entityId: entity.id,
      receivedAt,
    }),
    clientId,
    entityId: entity.id,
    inboundMessageId: message?.id || null,
    attachmentId: intakeResult?.attachmentId || null,
    status: 'accepted',
    reviewStatus: 'accepted',
    confidenceScore: intakeResult?.match?.score ?? intakeResult?.extracted?.confidence ?? 0,
    insuredName: intakeResult?.extracted?.insuredName || entity.name,
    certificateHolder: intakeResult?.extracted?.certificateHolder || null,
    producerName: intakeResult?.extracted?.producerName || null,
    carrierSummary: intakeResult?.extracted?.carrierSummary || null,
    policySummary: intakeResult?.extracted?.coverages || [],
    policyNumber: intakeResult?.extracted?.policyNumber || intakeResult?.extracted?.policyNumbers?.[0] || null,
    effectiveDate,
    expirationDate,
    receivedDate,
    isActive: true,
    supersedesCertificateId: relationship === 'renewal' ? priorActiveCertificate?.id || null : null,
    parsed: intakeResult?.extracted || {},
  };

  const updatedCertificates = existingCertificates.map((existingCertificate) => {
    if (existingCertificate.entityId !== entity.id) {
      return existingCertificate;
    }

    if (
      (relationship === 'renewal' || relationship === 'duplicate') &&
      existingCertificate.id === priorActiveCertificate?.id
    ) {
      return {
        ...existingCertificate,
        isActive: false,
        supersededByCertificateId: certificate.id,
      };
    }

    return existingCertificate;
  });

  updatedCertificates.push(certificate);

  const reminderSchedule = expirationDate
    ? buildReminderSchedule({ expirationDate })
    : [];
  const newReminderEvents = buildReminderEvents({
    clientId,
    entity,
    certificate,
    reminderSchedule,
  });

  const updatedReminderEvents = cancelSupersededReminderEvents({
    existingReminderEvents,
    priorCertificateId: certificate.supersedesCertificateId,
    replacementReceivedAt: receivedAt,
  });
  updatedReminderEvents.push(...newReminderEvents);

  const resolvedReviewItem = reviewItem
    ? {
        ...reviewItem,
        status: 'resolved',
        certificateId: certificate.id,
        suggestedEntityId: entity.id,
        resolvedAt: isoTimestamp(receivedAt),
        resolution: relationship === 'duplicate' ? 'accepted_duplicate' : 'accepted_certificate',
      }
    : null;

  return {
    entity,
    certificate,
    updatedCertificates,
    newReminderEvents,
    updatedReminderEvents,
    resolvedReviewItem,
  };
}

export function rejectReviewQueueItem({ reviewItem, reason = 'not_a_valid_certificate', resolvedAt = new Date().toISOString() }) {
  if (!reviewItem) {
    throw new Error('Review item is required');
  }

  return {
    ...reviewItem,
    status: 'rejected',
    resolvedAt: isoTimestamp(resolvedAt),
    resolution: 'rejected_attachment',
    rejectionReason: reason,
  };
}

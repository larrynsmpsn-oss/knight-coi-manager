function reasonToPriority(reason) {
  switch (reason) {
    case 'non_certificate_attachment':
      return 'low';
    case 'low_confidence_match':
      return 'medium';
    case 'missing_insured_name':
    case 'no_entity_match':
      return 'high';
    default:
      return 'medium';
  }
}

function reasonToItemType(reason) {
  switch (reason) {
    case 'missing_insured_name':
      return 'extraction_issue';
    case 'no_entity_match':
    case 'low_confidence_match':
      return 'entity_match_review';
    case 'non_certificate_attachment':
      return 'attachment_triage';
    default:
      return 'manual_review';
  }
}

export function buildReviewQueueItem({
  clientId,
  message,
  intakeResult,
}) {
  if (!intakeResult?.needsReview) return null;

  const reason = intakeResult.reviewReason || 'manual_review';

  return {
    id: `${message.id || 'message'}:${intakeResult.attachmentId || intakeResult.filename || 'attachment'}`,
    clientId,
    inboundMessageId: message.id || null,
    attachmentId: intakeResult.attachmentId || null,
    certificateId: null,
    itemType: reasonToItemType(reason),
    status: 'open',
    priority: reasonToPriority(reason),
    suggestedEntityId: intakeResult.match?.entity?.id || null,
    reason,
    details: {
      messageSubject: message.subject || '',
      fromEmail: message.fromEmail || null,
      filename: intakeResult.filename || null,
      insuredName: intakeResult.extracted?.insuredName || null,
      matchScore: intakeResult.match?.score ?? 0,
      relationship: intakeResult.relationship || 'new',
      likelyCertificate: Boolean(intakeResult.likelyCertificate),
    },
  };
}

export function buildReviewQueueItems({ clientId, message, intakeResults = [] }) {
  return intakeResults
    .map((intakeResult) => buildReviewQueueItem({ clientId, message, intakeResult }))
    .filter(Boolean);
}

export function summarizeReviewQueue(items = []) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      summary.byReason[item.reason] = (summary.byReason[item.reason] || 0) + 1;
      summary.byPriority[item.priority] = (summary.byPriority[item.priority] || 0) + 1;
      return summary;
    },
    {
      total: 0,
      byReason: {},
      byPriority: {},
    }
  );
}

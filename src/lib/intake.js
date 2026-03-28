import {
  detectCertificateRelationship,
  findBestEntityMatch,
} from './matching.js';
import {
  extractCertificateFields,
  isLikelyCertificateAttachment,
} from './extraction.js';
import { buildReminderSchedule } from './reminders.js';

function summarizeReviewReason({ attachment, extracted, matchResult }) {
  if (!isLikelyCertificateAttachment(attachment)) return 'non_certificate_attachment';
  if (!extracted.insuredName) return 'missing_insured_name';
  if (!matchResult.entity) return 'no_entity_match';
  if (matchResult.score < 0.75) return 'low_confidence_match';
  return null;
}

export function processInboundMessage({ message, entities = [], existingCertificates = [] }) {
  const attachments = message.attachments || [];

  return attachments.map((attachment) => {
    const likelyCertificate = isLikelyCertificateAttachment(attachment);
    const extracted = extractCertificateFields(attachment, message);
    const matchResult = extracted.insuredName
      ? findBestEntityMatch(extracted.insuredName, entities)
      : { entity: null, score: 0 };

    const entityCertificates = existingCertificates.filter(
      (certificate) => certificate.entityId && certificate.entityId === matchResult.entity?.id
    );

    const activeCertificate = [...entityCertificates]
      .sort((a, b) => String(b.expirationDate || '').localeCompare(String(a.expirationDate || '')))
      .find(Boolean);

    const reviewReason = summarizeReviewReason({ attachment, extracted, matchResult });

    const relationship =
      likelyCertificate && activeCertificate
        ? detectCertificateRelationship({
            newCertificate: {
              policyNumber: extracted.policyNumbers[0],
              expirationDate: extracted.expirationDate,
            },
            existingCertificate: {
              policyNumber: activeCertificate.policyNumber,
              expirationDate: activeCertificate.expirationDate,
            },
          })
        : 'new';

    return {
      attachmentId: attachment.id,
      filename: attachment.filename,
      likelyCertificate,
      extracted,
      match: matchResult,
      relationship,
      reviewReason,
      needsReview: Boolean(reviewReason),
      reminderSchedule:
        extracted.expirationDate && matchResult.entity && !reviewReason
          ? buildReminderSchedule({ expirationDate: extracted.expirationDate })
          : [],
    };
  });
}

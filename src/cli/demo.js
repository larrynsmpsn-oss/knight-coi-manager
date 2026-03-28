import { processInboundMessage } from '../lib/intake.js';
import { buildKnightDemoData } from '../lib/seed-data.js';

function summarize(result) {
  return {
    filename: result.filename,
    insuredName: result.extracted.insuredName,
    matchedEntity: result.match.entity?.name || null,
    matchScore: result.match.score,
    relationship: result.relationship,
    needsReview: result.needsReview,
    reviewReason: result.reviewReason,
    reminderSchedule: result.reminderSchedule,
  };
}

const demo = buildKnightDemoData();
const outputs = demo.sampleMessages.flatMap((message) =>
  processInboundMessage({
    message,
    entities: demo.entities,
    existingCertificates: demo.certificates,
  }).map(summarize)
);

console.log(JSON.stringify({
  client: demo.client,
  processed: outputs,
}, null, 2));

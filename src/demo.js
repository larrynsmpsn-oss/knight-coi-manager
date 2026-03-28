import { processInboundMessage } from './lib/intake.js';
import { buildKnightDemoData } from './lib/seed-data.js';
import { buildReviewQueueItems, summarizeReviewQueue } from './lib/review-queue.js';

const demo = buildKnightDemoData();

console.log(`# Knight COI Manager demo`);
console.log(`Client: ${demo.client.name}`);
console.log(`Entities: ${demo.entities.length}`);
console.log(`Certificates on file: ${demo.certificates.length}`);
console.log('');

const allQueueItems = [];

for (const message of demo.sampleMessages) {
  console.log(`Message: ${message.subject}`);
  const results = processInboundMessage({
    message,
    entities: demo.entities,
    existingCertificates: demo.certificates,
  });

  const queueItems = buildReviewQueueItems({
    clientId: demo.client.id,
    message,
    intakeResults: results,
  });
  allQueueItems.push(...queueItems);

  for (const result of results) {
    console.log(`  Attachment: ${result.filename}`);
    console.log(`  Likely certificate: ${result.likelyCertificate}`);
    console.log(`  Insured: ${result.extracted.insuredName || 'unknown'}`);
    console.log(`  Match: ${result.match.entity?.name || 'none'} (${result.match.score.toFixed(2)})`);
    console.log(`  Relationship: ${result.relationship}`);
    console.log(`  Needs review: ${result.needsReview}`);
    if (result.reviewReason) {
      console.log(`  Review reason: ${result.reviewReason}`);
    }
    if (result.extracted.carrierSummary) {
      console.log(`  Carriers: ${result.extracted.carrierSummary}`);
    }
    if (result.extracted.coverages?.length) {
      console.log(`  Coverages: ${result.extracted.coverages.map((x) => x.label).join(', ')}`);
    }
    if (result.reminderSchedule.length) {
      console.log(`  Reminder dates: ${result.reminderSchedule.map((x) => x.sendOn).join(', ')}`);
    }
    console.log('');
  }
}

const queueSummary = summarizeReviewQueue(allQueueItems);
console.log('Review queue summary:', JSON.stringify(queueSummary, null, 2));

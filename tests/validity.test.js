import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCertificateValidity } from '../src/lib/validity.js';
import { buildKnightDemoData } from '../src/lib/seed-data.js';
import { processInboundMessage } from '../src/lib/intake.js';

const demo = buildKnightDemoData();

test('evaluateCertificateValidity accepts the seeded Lone Star renewal with only non-blocking warnings', () => {
  const intakeResult = processInboundMessage({
    message: demo.sampleMessages[0],
    entities: demo.entities,
    existingCertificates: demo.certificates,
  })[0];

  const validity = evaluateCertificateValidity({
    client: demo.client,
    entity: demo.entities[0],
    intakeResult,
  });

  assert.equal(validity.valid, true);
  assert.deepEqual(validity.blockingIssues, []);
  assert.ok(validity.warnings.includes('missing_coverage_lines'));
});

test('evaluateCertificateValidity blocks mismatched holder and inverted dates', () => {
  const validity = evaluateCertificateValidity({
    client: demo.client,
    entity: demo.entities[0],
    intakeResult: {
      likelyCertificate: true,
      extracted: {
        insuredName: 'Lone Star Therapy, LLC',
        certificateHolder: 'Another Landlord LLC',
        policyNumber: 'GL-1001',
        policyNumbers: ['GL-1001'],
        effectiveDate: '12/31/2026',
        expirationDate: '01/01/2026',
        coverages: [],
        additionalInsured: { mentioned: false },
      },
    },
  });

  assert.equal(validity.valid, false);
  assert.deepEqual(validity.blockingIssues, [
    'certificate_holder_mismatch',
    'expiration_before_effective',
  ]);
});

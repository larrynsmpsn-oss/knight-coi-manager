import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCertificateValidity, summarizeValidityForDisplay } from '../src/lib/certificate-validity.js';

test('evaluateCertificateValidity returns valid with non-blocking warnings for a usable MVP certificate', () => {
  const result = evaluateCertificateValidity({
    entityId: 'entity-lone-star',
    intakeResult: {
      likelyCertificate: true,
      extracted: {
        insuredName: 'Lone Star Therapy, LLC',
        certificateHolder: 'Knight Real Estate',
        policyNumber: 'GL-1001',
        effectiveDate: '01/01/2026',
        expirationDate: '12/31/2026',
        producerName: 'Hill Country Insurance',
        carrierSummary: null,
        coverages: [],
      },
    },
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.blockingIssues, []);
  assert.deepEqual(result.warnings, ['missing_carrier_summary', 'missing_coverage_lines']);
  assert.deepEqual(result.normalized, {
    insuredName: 'Lone Star Therapy, LLC',
    certificateHolder: 'Knight Real Estate',
    policyNumber: 'GL-1001',
    producerName: 'Hill Country Insurance',
    effectiveDate: '2026-01-01',
    expirationDate: '2026-12-31',
    coverageCount: 0,
  });
  assert.deepEqual(result.display, {
    status: 'acceptable_for_mvp',
    statusLabel: 'Acceptable for MVP',
    blockingLabels: [],
    warningLabels: ['Missing Carrier Summary', 'Missing Coverage Lines'],
    blockingSummary: 'None',
    warningSummary: 'Missing Carrier Summary, Missing Coverage Lines',
  });
});

test('evaluateCertificateValidity returns blocking issues for an incomplete intake result', () => {
  const result = evaluateCertificateValidity({
    entityId: null,
    intakeResult: {
      likelyCertificate: false,
      extracted: {
        insuredName: null,
        certificateHolder: null,
        policyNumber: null,
        effectiveDate: null,
        expirationDate: null,
        producerName: null,
        carrierSummary: null,
        coverages: [],
      },
    },
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.blockingIssues, [
    'attachment_not_certificate',
    'missing_entity',
    'missing_insured_name',
    'missing_expiration_date',
    'missing_certificate_holder',
    'missing_policy_number',
  ]);
  assert.deepEqual(result.warnings, [
    'missing_effective_date',
    'missing_producer_name',
    'missing_carrier_summary',
    'missing_coverage_lines',
  ]);
  assert.deepEqual(result.normalized, {
    insuredName: null,
    certificateHolder: null,
    policyNumber: null,
    producerName: null,
    effectiveDate: null,
    expirationDate: null,
    coverageCount: 0,
  });
  assert.deepEqual(result.display, {
    status: 'blocked',
    statusLabel: 'Blocked',
    blockingLabels: [
      'Attachment Not Certificate',
      'Missing Entity',
      'Missing Insured Name',
      'Missing Expiration Date',
      'Missing Certificate Holder',
      'Missing Policy Number',
    ],
    warningLabels: [
      'Missing Effective Date',
      'Missing Producer Name',
      'Missing Carrier Summary',
      'Missing Coverage Lines',
    ],
    blockingSummary: 'Attachment Not Certificate, Missing Entity, Missing Insured Name, Missing Expiration Date, Missing Certificate Holder, Missing Policy Number',
    warningSummary: 'Missing Effective Date, Missing Producer Name, Missing Carrier Summary, Missing Coverage Lines',
  });
});

test('evaluateCertificateValidity warns when certificate holder does not match the expected holder', () => {
  const result = evaluateCertificateValidity({
    entityId: 'entity-apex',
    rules: {
      expectedCertificateHolder: 'Knight Real Estate',
      warnIfCertificateHolderMismatch: true,
      requireLikelyCertificate: true,
      requireEntityId: true,
      requireInsuredName: true,
      requireExpirationDate: true,
      requireCertificateHolder: true,
      requirePolicyNumber: true,
      warnOnMissingEffectiveDate: false,
      warnOnMissingProducer: false,
      warnOnMissingCarrierSummary: false,
      warnOnNoCoverages: false,
    },
    intakeResult: {
      likelyCertificate: true,
      extracted: {
        insuredName: 'Apex Mechanical Services',
        certificateHolder: 'Some Other Owner',
        policyNumber: 'APEX-77',
        expirationDate: '09/30/2026',
      },
    },
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.blockingIssues, []);
  assert.deepEqual(result.warnings, ['certificate_holder_mismatch']);
});

test('summarizeValidityForDisplay converts issue codes into operator-friendly labels', () => {
  const summary = summarizeValidityForDisplay({
    valid: false,
    blockingIssues: ['missing_entity'],
    warnings: ['certificate_holder_mismatch', 'missing_coverage_lines'],
  });

  assert.deepEqual(summary, {
    status: 'blocked',
    statusLabel: 'Blocked',
    blockingLabels: ['Missing Entity'],
    warningLabels: ['Certificate Holder Mismatch', 'Missing Coverage Lines'],
    blockingSummary: 'Missing Entity',
    warningSummary: 'Certificate Holder Mismatch, Missing Coverage Lines',
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCertificateFields } from '../src/lib/extraction.js';

test('extractCertificateFields pulls key COI-like fields from raw text', () => {
  const rawText = `
    INSURED: Acme Properties LLC
    CERTIFICATE HOLDER: Knight Real Estate
    POLICY NUMBER: GL-12345
    EFFECTIVE DATE: 01/01/2026
    EXPIRATION DATE: 01/01/2027
  `;

  const fields = extractCertificateFields(rawText);

  assert.deepEqual(fields, {
    insuredName: 'Acme Properties LLC',
    certificateHolder: 'Knight Real Estate',
    producerName: null,
    policyNumber: 'GL-12345',
    policyNumbers: ['GL-12345'],
    effectiveDate: '01/01/2026',
    expirationDate: '01/01/2027',
    carrierSummary: null,
    carrierNames: [],
    coverages: [],
    additionalInsured: {
      mentioned: false,
      status: 'unknown',
    },
    confidence: 4 / 6,
  });
});

test('extractCertificateFields parses ACORD-style coverage lines and additional insured hints', () => {
  const rawText = `
    CERTIFICATE OF LIABILITY INSURANCE
    INSURED: Apex Mechanical Services
    CERTIFICATE HOLDER: Knight Real Estate
    PRODUCER: Hill Country Insurance
    ADDITIONAL INSURED: YES
    INSR A Travelers Property Casualty COMMERCIAL GENERAL LIABILITY GL-77881 01/01/2026 01/01/2027
    INSR B Travelers Property Casualty AUTOMOBILE LIABILITY AUTO-204 01/01/2026 01/01/2027
    INSR C Texas Mutual WORKERS COMPENSATION WC-9921 01/01/2026 01/01/2027
  `;

  const fields = extractCertificateFields(rawText);

  assert.equal(fields.insuredName, 'Apex Mechanical Services');
  assert.equal(fields.certificateHolder, 'Knight Real Estate');
  assert.equal(fields.producerName, 'Hill Country Insurance');
  assert.equal(fields.policyNumber, 'GL-77881');
  assert.deepEqual(fields.policyNumbers, ['GL-77881', 'AUTO-204', 'WC-9921']);
  assert.equal(fields.effectiveDate, '01/01/2026');
  assert.equal(fields.expirationDate, '01/01/2027');
  assert.equal(fields.carrierSummary, 'Travelers Property Casualty; Texas Mutual');
  assert.deepEqual(fields.carrierNames, ['Travelers Property Casualty', 'Texas Mutual']);
  assert.deepEqual(
    fields.coverages.map((coverage) => ({
      type: coverage.type,
      carrierName: coverage.carrierName,
      policyNumber: coverage.policyNumber,
    })),
    [
      {
        type: 'general_liability',
        carrierName: 'Travelers Property Casualty',
        policyNumber: 'GL-77881',
      },
      {
        type: 'auto_liability',
        carrierName: 'Travelers Property Casualty',
        policyNumber: 'AUTO-204',
      },
      {
        type: 'workers_comp',
        carrierName: 'Texas Mutual',
        policyNumber: 'WC-9921',
      },
    ]
  );
  assert.deepEqual(fields.additionalInsured, {
    mentioned: true,
    status: 'yes',
  });
  assert.equal(fields.confidence, 1);
});

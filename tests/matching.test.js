import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEntityName,
  scoreEntityMatch,
  detectCertificateRelationship,
} from '../src/lib/matching.js';

test('normalizeEntityName strips common business suffixes and punctuation', () => {
  assert.equal(normalizeEntityName('Acme Properties, LLC'), 'acme');
});

test('scoreEntityMatch returns a high score for close partial matches', () => {
  const score = scoreEntityMatch('Riversouth Retail Tenant', 'Riversouth Tenant');
  assert.equal(score > 0.5, true);
});

test('detectCertificateRelationship identifies duplicates and renewals', () => {
  assert.equal(
    detectCertificateRelationship({
      newCertificate: { policyNumber: 'ABC123', expirationDate: '2027-01-01' },
      existingCertificate: { policyNumber: 'ABC123', expirationDate: '2026-01-01' },
    }),
    'renewal'
  );

  assert.equal(
    detectCertificateRelationship({
      newCertificate: { policyNumber: 'ABC123', expirationDate: '2026-01-01' },
      existingCertificate: { policyNumber: 'ABC123', expirationDate: '2026-01-01' },
    }),
    'duplicate'
  );
});

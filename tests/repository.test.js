import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createJsonFileRepository } from '../src/lib/repository.js';

test('createJsonFileRepository persists certificate and review override changes across instances', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knight-coi-repo-'));
  const filePath = path.join(tempDir, 'demo-store.json');

  const repo1 = createJsonFileRepository({ filePath });
  const certificates = repo1.getCertificates();
  certificates.push({
    id: 'cert-temp',
    entityId: 'entity-aurora',
    expirationDate: '2027-01-01',
    isActive: true,
  });
  repo1.replaceCertificates(certificates);
  repo1.saveReviewOverride('msg-2:att-2', {
    id: 'msg-2:att-2',
    status: 'closed',
    resolution: 'accepted',
  });

  const repo2 = createJsonFileRepository({ filePath });
  assert.equal(repo2.getCertificates().some((item) => item.id === 'cert-temp'), true);
  assert.deepEqual(repo2.getReviewOverrides()['msg-2:att-2'], {
    id: 'msg-2:att-2',
    status: 'closed',
    resolution: 'accepted',
  });
});

test('createJsonFileRepository reset restores seeded demo state', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knight-coi-repo-'));
  const filePath = path.join(tempDir, 'demo-store.json');

  const repo = createJsonFileRepository({ filePath });
  repo.replaceCertificates([{ id: 'cert-only' }]);
  repo.saveReviewOverride('review-1', { status: 'closed' });

  const resetState = repo.reset();

  assert.equal(resetState.certificates.length, 2);
  assert.deepEqual(resetState.reviewOverrides, {});
});

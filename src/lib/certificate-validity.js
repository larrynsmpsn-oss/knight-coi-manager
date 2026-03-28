function normalizeDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const slash = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, mm, dd, yy] = slash;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function includesLoose(haystack, needle) {
  const left = normalizeText(haystack).toLowerCase();
  const right = normalizeText(needle).toLowerCase();
  return Boolean(left && right && left.includes(right));
}

export const DEFAULT_MVP_RULES = {
  requireLikelyCertificate: true,
  requireEntityId: true,
  requireInsuredName: true,
  requireExpirationDate: true,
  requireCertificateHolder: true,
  requirePolicyNumber: true,
  warnOnMissingEffectiveDate: true,
  warnOnMissingProducer: true,
  warnOnMissingCarrierSummary: true,
  warnOnNoCoverages: true,
  expectedCertificateHolder: null,
  warnIfCertificateHolderMismatch: true,
};

function prettifyIssue(issue) {
  return String(issue || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function summarizeValidityForDisplay(validity = {}) {
  const blockingIssues = validity.blockingIssues || [];
  const warnings = validity.warnings || [];
  return {
    status: validity.valid ? 'acceptable_for_mvp' : 'blocked',
    statusLabel: validity.valid ? 'Acceptable for MVP' : 'Blocked',
    blockingLabels: blockingIssues.map(prettifyIssue),
    warningLabels: warnings.map(prettifyIssue),
    blockingSummary: blockingIssues.length ? blockingIssues.map(prettifyIssue).join(', ') : 'None',
    warningSummary: warnings.length ? warnings.map(prettifyIssue).join(', ') : 'None',
  };
}

export function evaluateCertificateValidity({
  intakeResult,
  entityId = null,
  rules = DEFAULT_MVP_RULES,
}) {
  const blockingIssues = [];
  const warnings = [];
  const extracted = intakeResult?.extracted || {};

  const expirationDate = normalizeDate(extracted.expirationDate);
  const effectiveDate = normalizeDate(extracted.effectiveDate);
  const certificateHolder = normalizeText(extracted.certificateHolder);
  const producerName = normalizeText(extracted.producerName);
  const policyNumber = normalizeText(extracted.policyNumber || extracted.policyNumbers?.[0]);
  const carrierSummary = normalizeText(extracted.carrierSummary);
  const insuredName = normalizeText(extracted.insuredName);
  const coverageCount = Array.isArray(extracted.coverages) ? extracted.coverages.length : 0;

  if (rules.requireLikelyCertificate && !intakeResult?.likelyCertificate) {
    blockingIssues.push('attachment_not_certificate');
  }
  if (rules.requireEntityId && !entityId) {
    blockingIssues.push('missing_entity');
  }
  if (rules.requireInsuredName && !insuredName) {
    blockingIssues.push('missing_insured_name');
  }
  if (rules.requireExpirationDate && !expirationDate) {
    blockingIssues.push('missing_expiration_date');
  }
  if (rules.requireCertificateHolder && !certificateHolder) {
    blockingIssues.push('missing_certificate_holder');
  }
  if (rules.requirePolicyNumber && !policyNumber) {
    blockingIssues.push('missing_policy_number');
  }

  if (rules.warnOnMissingEffectiveDate && !effectiveDate) {
    warnings.push('missing_effective_date');
  }
  if (rules.warnOnMissingProducer && !producerName) {
    warnings.push('missing_producer_name');
  }
  if (rules.warnOnMissingCarrierSummary && !carrierSummary) {
    warnings.push('missing_carrier_summary');
  }
  if (rules.warnOnNoCoverages && coverageCount === 0) {
    warnings.push('missing_coverage_lines');
  }
  if (
    rules.warnIfCertificateHolderMismatch &&
    rules.expectedCertificateHolder &&
    certificateHolder &&
    !includesLoose(certificateHolder, rules.expectedCertificateHolder)
  ) {
    warnings.push('certificate_holder_mismatch');
  }

  const result = {
    valid: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    normalized: {
      insuredName: insuredName || null,
      certificateHolder: certificateHolder || null,
      policyNumber: policyNumber || null,
      producerName: producerName || null,
      effectiveDate,
      expirationDate,
      coverageCount,
    },
  };

  return {
    ...result,
    display: summarizeValidityForDisplay(result),
  };
}

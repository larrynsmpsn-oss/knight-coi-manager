function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function holderMatchesClient(certificateHolder, clientName) {
  const holder = normalizeText(certificateHolder);
  const client = normalizeText(clientName);

  if (!holder || !client) return false;
  return holder.includes(client) || client.includes(holder);
}

export function evaluateCertificateValidity({ client = null, entity = null, intakeResult = null }) {
  const extracted = intakeResult?.extracted || {};
  const effectiveDate = normalizeDate(extracted.effectiveDate);
  const expirationDate = normalizeDate(extracted.expirationDate);
  const blockingIssues = [];
  const warnings = [];

  if (!intakeResult?.likelyCertificate) blockingIssues.push('attachment_not_certificate');
  if (!entity?.id) blockingIssues.push('missing_entity');
  if (!extracted.insuredName) blockingIssues.push('missing_insured_name');
  if (!expirationDate) blockingIssues.push('missing_expiration_date');

  const hasCoverageEvidence = Boolean(extracted.policyNumber || extracted.policyNumbers?.length || extracted.coverages?.length);
  if (!hasCoverageEvidence) blockingIssues.push('missing_policy_evidence');

  if (!extracted.certificateHolder) {
    warnings.push('missing_certificate_holder');
  } else if (client?.name && !holderMatchesClient(extracted.certificateHolder, client.name)) {
    blockingIssues.push('certificate_holder_mismatch');
  }

  if (!effectiveDate) {
    warnings.push('missing_effective_date');
  }

  if (effectiveDate && expirationDate && expirationDate < effectiveDate) {
    blockingIssues.push('expiration_before_effective');
  }

  if (!extracted.coverages?.length) {
    warnings.push('missing_coverage_lines');
  }

  if (!extracted.additionalInsured?.mentioned) {
    warnings.push('additional_insured_not_mentioned');
  }

  return {
    valid: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    normalizedDates: {
      effectiveDate,
      expirationDate,
    },
  };
}

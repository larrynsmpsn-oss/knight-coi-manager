function findField(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function getRawText(input) {
  if (typeof input === 'string') return input;
  if (input?.text) return String(input.text);
  if (input?.bodyText) return String(input.bodyText);
  return '';
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function parseCoverageLine(line) {
  const normalized = normalizeWhitespace(line);
  const upper = normalized.toUpperCase();

  const coverageMatchers = [
    {
      type: 'general_liability',
      label: 'Commercial General Liability',
      pattern: /COMMERCIAL GENERAL LIABILITY|GENERAL LIABILITY/,
    },
    {
      type: 'auto_liability',
      label: 'Automobile Liability',
      pattern: /AUTOMOBILE LIABILITY|AUTO LIABILITY/,
    },
    {
      type: 'umbrella',
      label: 'Umbrella Liability',
      pattern: /UMBRELLA LIAB|UMBRELLA LIABILITY/,
    },
    {
      type: 'workers_comp',
      label: 'Workers Compensation',
      pattern: /WORKERS COMPENSATION/,
    },
    {
      type: 'employers_liability',
      label: 'Employers Liability',
      pattern: /EMPLOYERS LIABILITY/,
    },
  ];

  const matchedCoverage = coverageMatchers.find((item) => item.pattern.test(upper));
  if (!matchedCoverage) return null;

  const companyMatch = normalized.match(/(?:INSR\s+[A-F]\s+)?([A-Z][A-Za-z0-9&.,'()\-\/ ]+?)\s+(?:COMMERCIAL GENERAL LIABILITY|GENERAL LIABILITY|AUTOMOBILE LIABILITY|AUTO LIABILITY|UMBRELLA LIAB|UMBRELLA LIABILITY|WORKERS COMPENSATION|EMPLOYERS LIABILITY)/i);
  const dateMatches = [...normalized.matchAll(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g)].map((match) => match[1]);
  const policyMatch = normalized.match(/(?:COMMERCIAL GENERAL LIABILITY|GENERAL LIABILITY|AUTOMOBILE LIABILITY|AUTO LIABILITY|UMBRELLA LIAB|UMBRELLA LIABILITY|WORKERS COMPENSATION|EMPLOYERS LIABILITY)\s+([A-Z0-9][A-Z0-9\-\/]{2,})\b/i);
  const effectiveMatch = dateMatches[0] || null;
  const expirationMatch = dateMatches[1] || null;

  return {
    type: matchedCoverage.type,
    label: matchedCoverage.label,
    carrierName: companyMatch?.[1]?.trim() || null,
    policyNumber: policyMatch?.[1] || null,
    effectiveDate: effectiveMatch,
    expirationDate: expirationMatch,
    rawLine: normalized,
  };
}

function parseCoverageSummary(text) {
  const lines = normalizeWhitespace(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const coverages = [];
  const carriers = new Set();

  for (const line of lines) {
    const parsed = parseCoverageLine(line);
    if (!parsed) continue;
    coverages.push(parsed);
    if (parsed.carrierName) carriers.add(parsed.carrierName);
  }

  return {
    coverages,
    carrierNames: [...carriers],
    carrierSummary: [...carriers].join('; ') || null,
  };
}

function detectAdditionalInsured(text) {
  const normalized = normalizeWhitespace(text);
  return /additional insured/i.test(normalized)
    ? {
        mentioned: true,
        status: /additional insured\s*:\s*yes|addi\w* insd\s*yes|ai\s*waived\s*[:\-]?\s*yes/i.test(normalized)
          ? 'yes'
          : /additional insured\s*:\s*no|addi\w* insd\s*no/i.test(normalized)
            ? 'no'
            : 'mentioned',
      }
    : {
        mentioned: false,
        status: 'unknown',
      };
}

export function isLikelyCertificateAttachment(attachment = {}) {
  const filename = String(attachment.filename || '').toLowerCase();
  const contentType = String(attachment.contentType || '').toLowerCase();
  const text = getRawText(attachment).toLowerCase();

  const filenameLooksRight = /coi|certificate/.test(filename);
  const typeLooksRight = /pdf|image/.test(contentType);
  const textLooksRight = /certificate of liability insurance|insured:|certificate holder:/.test(text);

  return filenameLooksRight || (typeLooksRight && textLooksRight);
}

export function extractCertificateFields(input) {
  const text = getRawText(input);
  const coverageSummary = parseCoverageSummary(text);
  const additionalInsured = detectAdditionalInsured(text);

  const insuredName = findField(text, [
    /INSURED\s*:?\s*([^\n]+)/i,
    /NAMED INSURED\s*:?\s*([^\n]+)/i,
  ]);

  const certificateHolder = findField(text, [
    /CERTIFICATE HOLDER\s*:?\s*([^\n]+)/i,
  ]);

  const producerName = findField(text, [
    /PRODUCER\s*:?\s*([^\n]+)/i,
  ]);

  const policyNumber = findField(text, [
    /POLICY NUMBER\s*:?\s*([^\n]+)/i,
    /POLICY #\s*:?\s*([^\n]+)/i,
  ]) || coverageSummary.coverages.find((coverage) => coverage.policyNumber)?.policyNumber || null;

  const effectiveDate = findField(text, [
    /EFFECTIVE DATE\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
  ]) || coverageSummary.coverages.find((coverage) => coverage.effectiveDate)?.effectiveDate || null;

  const expirationDate = findField(text, [
    /EXPIRATION DATE\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
  ]) || coverageSummary.coverages.find((coverage) => coverage.expirationDate)?.expirationDate || null;

  const policyNumbers = [
    ...new Set(
      [policyNumber, ...coverageSummary.coverages.map((coverage) => coverage.policyNumber)].filter(Boolean)
    ),
  ];

  const confidenceSignals = [
    insuredName,
    certificateHolder,
    policyNumber,
    expirationDate,
    coverageSummary.coverages.length ? 'coverage' : null,
    additionalInsured.mentioned ? 'additional_insured' : null,
  ].filter(Boolean).length;

  return {
    insuredName,
    certificateHolder,
    producerName,
    policyNumber,
    policyNumbers,
    effectiveDate,
    expirationDate,
    carrierSummary: coverageSummary.carrierSummary,
    carrierNames: coverageSummary.carrierNames,
    coverages: coverageSummary.coverages,
    additionalInsured,
    confidence: confidenceSignals / 6,
  };
}

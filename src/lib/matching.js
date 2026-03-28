function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(llc|inc|ltd|lp|llp|corp|corporation|company|co|properties|property|services)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, mm, dd, yy] = slash;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function normalizeEntityName(name) {
  return normalizeToken(name);
}

export function scoreEntityMatch(inputName, candidateName) {
  const input = normalizeEntityName(inputName);
  const candidate = normalizeEntityName(candidateName);

  if (!input || !candidate) return 0;
  if (input === candidate) return 1;
  if (candidate.includes(input) || input.includes(candidate)) return 0.92;

  const inputTokens = new Set(input.split(' ').filter(Boolean));
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean));
  const overlap = [...inputTokens].filter((token) => candidateTokens.has(token)).length;
  const union = new Set([...inputTokens, ...candidateTokens]).size;

  return union === 0 ? 0 : overlap / union;
}

export function findBestEntityMatch(inputName, entities = []) {
  let best = { entity: null, score: 0 };

  for (const entity of entities) {
    const score = scoreEntityMatch(inputName, entity.name);
    if (score > best.score) {
      best = { entity, score };
    }
  }

  return best;
}

export function detectCertificateRelationship({ newCertificate, existingCertificate }) {
  const samePolicy =
    newCertificate?.policyNumber &&
    existingCertificate?.policyNumber &&
    newCertificate.policyNumber === existingCertificate.policyNumber;

  const newExp = normalizeDate(newCertificate?.expirationDate);
  const existingExp = normalizeDate(existingCertificate?.expirationDate);
  const sameExpiration = newExp && existingExp && newExp === existingExp;

  if (samePolicy && sameExpiration) return 'duplicate';
  if (samePolicy && newExp && existingExp && newExp > existingExp) return 'renewal';
  return 'new';
}

import crypto from 'node:crypto';
import { normalizeEntityName } from './matching.js';

function deterministicUuid(input) {
  const hex = crypto.createHash('md5').update(String(input)).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = { __row: index + 2 };

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] || '';
    });

    return row;
  });
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function splitEmails(value) {
  return String(value || '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveEntityTypeId(row, entityTypes, defaultEntityTypeKey = 'tenant') {
  const requested = String(row.entity_type || row.type || defaultEntityTypeKey || '')
    .toLowerCase()
    .trim();

  const match = entityTypes.find((entityType) => entityType.key === requested);
  return match?.id || null;
}

function resolvePropertyId(row, properties = []) {
  const requested = String(row.property_code || row.property || row.property_name || '')
    .toLowerCase()
    .trim();

  if (!requested) return null;

  const match = properties.find((property) => {
    const code = String(property.code || '').toLowerCase();
    const name = String(property.name || '').toLowerCase();
    return requested === code || requested === name;
  });

  return match?.id || null;
}

function buildEntityRecord({ clientId, entityId, row, entityTypeId, propertyId, existingEntity = null }) {
  const primaryEmail = row.primary_email || row.contact_email || row.email || existingEntity?.primaryEmail || null;
  const alternateEmails = [
    ...new Set([
      ...(existingEntity?.alternateEmails || []),
      ...splitEmails(row.alternate_emails || row.additional_emails || ''),
    ]),
  ];

  return {
    id: entityId,
    clientId,
    entityTypeId,
    propertyId,
    externalId: row.external_id || existingEntity?.externalId || null,
    name: row.name,
    normalizedName: normalizeEntityName(row.name),
    primaryEmail,
    alternateEmails,
    status: row.status || existingEntity?.status || 'active',
    notes: row.notes || existingEntity?.notes || null,
  };
}

export function importEntityRoster({
  clientId,
  csvText,
  entityTypes = [],
  properties = [],
  existingEntities = [],
  defaultEntityTypeKey = 'tenant',
}) {
  const rows = parseCsv(csvText);
  const updatedEntities = [...existingEntities];
  const summary = {
    totalRows: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of rows) {
    const name = String(row.name || '').trim();
    if (!name) {
      summary.skipped += 1;
      summary.errors.push({ row: row.__row, error: 'missing_name' });
      continue;
    }

    const entityTypeId = resolveEntityTypeId(row, entityTypes, defaultEntityTypeKey);
    if (!entityTypeId) {
      summary.skipped += 1;
      summary.errors.push({ row: row.__row, error: 'unknown_entity_type', value: row.entity_type || row.type || '' });
      continue;
    }

    const propertyRequest = row.property_code || row.property || row.property_name || '';
    const propertyId = resolvePropertyId(row, properties);
    if (propertyRequest && !propertyId) {
      summary.skipped += 1;
      summary.errors.push({ row: row.__row, error: 'unknown_property', value: propertyRequest });
      continue;
    }

    const normalizedName = normalizeEntityName(name);
    const existingIndex = updatedEntities.findIndex((entity) =>
      (row.external_id && entity.externalId && row.external_id === entity.externalId) ||
      (normalizedName && normalizeEntityName(entity.name) === normalizedName)
    );

    const existingEntity = existingIndex >= 0 ? updatedEntities[existingIndex] : null;
    const entityId = existingEntity?.id || deterministicUuid(`${clientId}:entity:${normalizedName}`);
    const record = buildEntityRecord({
      clientId,
      entityId,
      row: { ...row, name },
      entityTypeId,
      propertyId,
      existingEntity,
    });

    if (existingEntity) {
      updatedEntities[existingIndex] = record;
      summary.updated += 1;
    } else {
      updatedEntities.push(record);
      summary.created += 1;
    }
  }

  return {
    entities: updatedEntities,
    summary,
  };
}

export { parseCsv };

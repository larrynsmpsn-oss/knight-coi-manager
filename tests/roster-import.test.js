import test from 'node:test';
import assert from 'node:assert/strict';
import { importEntityRoster, parseCsv } from '../src/lib/roster-import.js';
import { buildKnightDemoData } from '../src/lib/seed-data.js';

const demo = buildKnightDemoData();

test('parseCsv handles quoted commas and preserves row numbers', () => {
  const rows = parseCsv([
    'name,entity_type,property,notes',
    '"Aurora Wealth Partners",tenant,"Westgate Office Center","prefers, emailed reminders"',
  ].join('\n'));

  assert.deepEqual(rows, [
    {
      __row: 2,
      name: 'Aurora Wealth Partners',
      entity_type: 'tenant',
      property: 'Westgate Office Center',
      notes: 'prefers, emailed reminders',
    },
  ]);
});

test('importEntityRoster creates new entities and updates existing matches by normalized name', () => {
  const csvText = [
    'name,entity_type,property_code,primary_email,alternate_emails,external_id',
    'Aurora Wealth Partners,tenant,WESTGATE,certs@aurorawealth.com,"ops@aurorawealth.com;broker@aurorawealth.com",',
    'River City Janitorial,vendor,,dispatch@rivercityjanitorial.com,,V-100',
  ].join('\n');

  const result = importEntityRoster({
    clientId: demo.client.id,
    csvText,
    entityTypes: demo.entityTypes,
    properties: demo.properties,
    existingEntities: demo.entities,
  });

  assert.equal(result.summary.created, 1);
  assert.equal(result.summary.updated, 1);
  assert.equal(result.summary.skipped, 0);

  const aurora = result.entities.find((entity) => entity.id === 'entity-aurora');
  assert.equal(aurora.propertyId, 'property-westgate');
  assert.equal(aurora.primaryEmail, 'certs@aurorawealth.com');
  assert.deepEqual(aurora.alternateEmails.sort(), ['broker@aurorawealth.com', 'ops@aurorawealth.com']);

  const riverCity = result.entities.find((entity) => entity.externalId === 'V-100');
  assert.equal(riverCity.entityTypeId, 'entity-type-vendor');
  assert.equal(riverCity.primaryEmail, 'dispatch@rivercityjanitorial.com');
});

test('importEntityRoster reports unknown entity types and properties without mutating entities', () => {
  const csvText = [
    'name,entity_type,property_code',
    'Bad Type Co,contractor,RIVERSOUTH',
    'Bad Property Co,tenant,UNKNOWN',
  ].join('\n');

  const result = importEntityRoster({
    clientId: demo.client.id,
    csvText,
    entityTypes: demo.entityTypes,
    properties: demo.properties,
    existingEntities: demo.entities,
  });

  assert.equal(result.summary.created, 0);
  assert.equal(result.summary.updated, 0);
  assert.equal(result.summary.skipped, 2);
  assert.deepEqual(result.summary.errors, [
    { row: 2, error: 'unknown_entity_type', value: 'contractor' },
    { row: 3, error: 'unknown_property', value: 'UNKNOWN' },
  ]);
  assert.equal(result.entities.length, demo.entities.length);
});

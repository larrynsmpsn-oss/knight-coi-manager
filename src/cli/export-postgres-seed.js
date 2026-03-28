import fs from 'node:fs';
import path from 'node:path';
import { buildKnightDemoData } from '../lib/seed-data.js';
import { buildPostgresSeedSql } from '../lib/postgres-export.js';

const outputArg = process.argv[2] || null;
const demo = buildKnightDemoData();
const sql = buildPostgresSeedSql({
  client: demo.client,
  entityTypes: demo.entityTypes,
  properties: demo.properties,
  entities: demo.entities,
  certificates: demo.certificates,
  sampleMessages: demo.sampleMessages,
  reviewOverrides: {},
});

if (outputArg) {
  const outputPath = path.resolve(outputArg);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, sql);
  console.log(`Wrote Postgres seed SQL to ${outputPath}`);
} else {
  process.stdout.write(sql);
}

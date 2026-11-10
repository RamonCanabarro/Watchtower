import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import pg from 'pg';

mkdirSync('.temp', { recursive: true });
const logPath = join('.temp', 'integration-validation.log');
writeFileSync(logPath, 'Starting isolated integration test\n');
function report(text) { process.stdout.write(text); appendFileSync(logPath, text); }

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const require = createRequire(import.meta.url);
const databaseName = `watchtower_mvp_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL);
url.pathname = `/${databaseName}`;
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
await admin.connect();
let created = false;
try {
  // The name is generated here from a fixed prefix and UUID, never from user input.
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  const commands = [
    [join(dirname(require.resolve('prisma/package.json')), 'build', 'index.js'), 'migrate', 'deploy', '--config', 'prisma7.config.ts'],
    [join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'), 'run', '--config', 'vitest.config.integration.ts'],
  ];
  for (const command of commands) {
    const result = spawnSync(process.execPath, command, {
      env: { ...process.env, DATABASE_URL: url.href }, stdio: ['inherit', 'pipe', 'pipe'], encoding: 'utf8',
    });
    report((result.stdout ?? '') + (result.stderr ?? ''));
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Integration command failed with status ${result.status}`);
  }
  report('WATCHTOWER_INTEGRATION_OK\n');
} finally {
  try {
    if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  } finally { await admin.end(); }
}

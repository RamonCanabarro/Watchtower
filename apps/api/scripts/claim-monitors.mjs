import 'dotenv/config';
import pg from 'pg';
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@'))
  throw new Error('Use pnpm --filter api monitors:claim seu-email');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  const user = await client.query('SELECT id FROM "User" WHERE email = $1', [
    email,
  ]);
  if (!user.rows[0])
    throw new Error(
      'Crie a conta na interface antes de atribuir os monitores.',
    );
  const result = await client.query(
    'UPDATE "Monitor" SET "userId" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" IS NULL',
    [user.rows[0].id],
  );
  await client.query('COMMIT');
  console.log(
    `${result.rowCount} monitores antigos atribuídos à conta informada.`,
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}

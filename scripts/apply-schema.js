const { Client } = require('pg');
const { readFileSync } = require('fs');
const { join } = require('path');
const { config } = require('dotenv');

config();

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error(
      'Set SUPABASE_DB_PASSWORD in .env (Supabase → Project Settings → Database → Database password)',
    );
    process.exit(1);
  }

  const projectRef = 'alqrpjoglptmblfakoia';
  const region = process.env.SUPABASE_DB_REGION || 'ap-northeast-1';
  const client = new Client({
    host: `aws-0-${region}.pooler.supabase.com`,
    port: 6543,
    user: `postgres.${projectRef}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  const sql = readFileSync(join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  await client.connect();
  console.log('Connected to Supabase Postgres');
  await client.query(sql);
  console.log('Schema applied successfully');
  await client.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

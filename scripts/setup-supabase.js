/**
 * One-shot Supabase setup for BackendSEO.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL="https://xxxx.supabase.co"
 *   $env:SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..."
 *   $env:SUPABASE_DB_PASSWORD="your-db-password"
 *   $env:ADMIN_EMAIL="admin@backendseo.com"
 *   $env:ADMIN_PASSWORD="AdminSeo@2026!"
 *   node scripts/setup-supabase.js
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v.replace(/\/$/, '');
}

async function main() {
  const url = required('SUPABASE_URL');
  const publishable = required('SUPABASE_PUBLISHABLE_KEY');
  const secret = required('SUPABASE_SECRET_KEY');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@backendseo.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSeo@2026!';

  const jwks = `${url}/auth/v1/.well-known/jwks.json`;

  // 1) Verify API reachable
  console.log('Checking Supabase URL…');
  const health = await fetch(`${url}/auth/v1/health`, {
    headers: { apikey: publishable, 'User-Agent': 'backendseo-setup/1.0' },
  }).catch((e) => ({ ok: false, statusText: e.message }));
  if (!health.ok && health.status !== 200) {
    console.error('Supabase not reachable:', health.status || health.statusText);
    process.exit(1);
  }
  console.log('Supabase reachable.');

  // 2) Write root .env
  const rootEnv = `SUPABASE_URL=${url}
SUPABASE_PUBLISHABLE_KEY=${publishable}
SUPABASE_SECRET_KEY=${secret}
SUPABASE_JWKS_URL=${jwks}
PORT=3000
UPLOAD_DEST=./uploads
CORS_ORIGINS=http://localhost:5173,https://backendseo-admin.vercel.app
`;
  fs.writeFileSync(path.join(process.cwd(), '.env'), rootEnv);
  console.log('Wrote .env');

  // 3) Write admin .env
  const adminEnv = `VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=${url}
VITE_SUPABASE_PUBLISHABLE_KEY=${publishable}
`;
  fs.writeFileSync(path.join(process.cwd(), 'admin', '.env'), adminEnv);
  console.log('Wrote admin/.env');

  // 4) Apply schema if DB password provided
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (dbPassword) {
    const { Client } = require('pg');
    const ref = new URL(url).hostname.split('.')[0];
    const region = process.env.SUPABASE_DB_REGION || 'ap-northeast-1';
    const client = new Client({
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 6543,
      user: `postgres.${ref}`,
      password: dbPassword,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    });
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'supabase', 'schema.sql'),
      'utf8',
    );
    console.log('Applying schema via pooler…');
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('Schema applied.');
  } else {
    console.log(
      'Skipped schema (set SUPABASE_DB_PASSWORD to auto-apply). Run supabase/schema.sql in SQL Editor.',
    );
  }

  // 5) Create admin auth user
  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log('Creating auth user…');
  const { data, error } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });
  if (error) {
    if (String(error.message).toLowerCase().includes('already')) {
      const list = await admin.auth.admin.listUsers({ perPage: 200 });
      const existing = (list.data?.users || []).find((u) => u.email === adminEmail);
      if (existing) {
        await admin.auth.admin.updateUserById(existing.id, {
          password: adminPassword,
          email_confirm: true,
        });
        console.log('Admin password reset for existing user.');
      } else {
        console.error(error.message);
      }
    } else {
      console.error('Auth user error:', error.message);
    }
  } else {
    console.log('Admin user created:', data.user.id);
  }

  console.log('\n=== DONE ===');
  console.log('Login email   :', adminEmail);
  console.log('Login password:', adminPassword);
  console.log('JWKS          :', jwks);
  console.log('\nNext:');
  console.log('1) Run schema in SQL Editor if not applied');
  console.log('2) Update Render + Vercel env with new keys');
  console.log('3) Resume Render API service');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

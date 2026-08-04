import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Applies schema via Supabase SQL using the Database REST is not available
 * with project keys alone. This script verifies API connectivity and prints
 * next steps if tables are missing.
 */
async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY required');
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.from('authors').select('id').limit(1);
  if (!error) {
    console.log('Supabase connected. Blog tables already exist.');
    return;
  }

  console.error('Tables missing or inaccessible:', error.message);
  console.log('\nOpen Supabase SQL Editor and run:');
  console.log(join(process.cwd(), 'supabase', 'schema.sql'));
  console.log('\n--- schema preview ---');
  console.log(
    readFileSync(join(process.cwd(), 'supabase', 'schema.sql'), 'utf8').slice(
      0,
      400,
    ),
    '...',
  );
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

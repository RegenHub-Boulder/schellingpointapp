import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const { Client } = pg;

const projectRef = 'ixnbhztqrxodrlgdiaav';

// Connection options to try
const connectionOptions = [
  // Pooler with service role key as password (Session mode, port 5432)
  {
    name: 'Pooler Session Mode',
    connectionString: `postgresql://postgres.${projectRef}:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  },
  // Pooler with service role key as password (Transaction mode, port 6543)
  {
    name: 'Pooler Transaction Mode',
    connectionString: `postgresql://postgres.${projectRef}:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  }
];

async function testConnection(config) {
  const client = new Client({
    connectionString: config.connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });
  
  try {
    await client.connect();
    await client.query('SELECT 1');
    return { success: true, client };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runMigrations() {
  console.log('Testing database connections...\n');
  
  let connectedClient = null;
  
  for (const opt of connectionOptions) {
    console.log(`Trying: ${opt.name}...`);
    const result = await testConnection(opt);
    
    if (result.success) {
      console.log(`  Connected!\n`);
      connectedClient = result.client;
      break;
    } else {
      console.log(`  Failed: ${result.error}\n`);
    }
  }
  
  if (!connectedClient) {
    console.error('Could not connect to database with any method.');
    console.error('');
    console.error('Please provide DATABASE_URL from Supabase Dashboard:');
    console.error(`1. Go to: https://supabase.com/dashboard/project/${projectRef}/settings/database`);
    console.error('2. Copy the "Connection string" (Session or Transaction mode)');
    console.error('3. Run: DATABASE_URL="<string>" node run-migrations.mjs');
    process.exit(1);
  }
  
  try {
    const migrationsDir = '/workspace/project/supabase/migrations';
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`Running ${files.length} migration files:\n`);
    
    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');
      
      console.log(`Running: ${file}...`);
      
      try {
        await connectedClient.query(sql);
        console.log(`  Completed`);
      } catch (err) {
        if (err.message.includes('already exists') || 
            err.message.includes('duplicate') ||
            err.code === '42P07' ||  // relation already exists
            err.code === '42710') {  // object already exists
          console.log(`  Skipped (already exists)`);
        } else {
          console.error(`  Error: ${err.message}`);
        }
      }
    }
    
    // Verify tables
    console.log('\n--- Verification ---\n');
    const result = await connectedClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Tables created in public schema:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } finally {
    await connectedClient.end();
    console.log('\nDone.');
  }
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

runMigrations().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

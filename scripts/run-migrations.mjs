#!/usr/bin/env node
/**
 * Run Supabase migrations using direct database connection
 * Usage: node scripts/run-migrations.mjs
 */
import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const { Client } = pg;

// Load env vars from .env.local
const envPath = join(projectRoot, '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    let value = match[2].trim();
    // Remove quotes if present
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    env[match[1].trim()] = value;
  }
}

const projectRef = 'ixnbhztqrxodrlgdiaav';
const dbPassword = env.SUPABASE_DB_PW;

if (!dbPassword) {
  console.error('SUPABASE_DB_PW not found in .env.local');
  process.exit(1);
}

// Connection options to try - using IPv4 for direct connection
const connectionOptions = [
  {
    name: 'Direct host (IPv4 forced)',
    connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
    family: 4
  },
  {
    name: 'Pooler with project user',
    connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
    family: 0
  },
  {
    name: 'Direct postgres user',
    connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    family: 0
  }
];

async function findWorkingConnection() {
  for (const opt of connectionOptions) {
    console.log(`Trying: ${opt.name}...`);
    const config = {
      connectionString: opt.connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000
    };
    // Force IPv4 if specified
    if (opt.family === 4) {
      const url = new URL(opt.connectionString);
      config.host = url.hostname;
      config.port = parseInt(url.port) || 5432;
      config.user = url.username;
      config.password = decodeURIComponent(url.password);
      config.database = url.pathname.slice(1);
      delete config.connectionString;
      // Resolve to IPv4
      const dns = await import('dns');
      try {
        const addresses = await dns.promises.resolve4(url.hostname);
        if (addresses.length > 0) {
          config.host = addresses[0];
          console.log(`  Resolved to IPv4: ${config.host}`);
        }
      } catch (e) {
        console.log(`  DNS resolution failed: ${e.message}`);
      }
    }
    const testClient = new Client(config);
    try {
      await testClient.connect();
      await testClient.query('SELECT 1');
      await testClient.end();
      console.log(`  ✓ Success!\n`);
      return { connectionString: opt.connectionString, family: opt.family };
    } catch (err) {
      console.log(`  ✗ ${err.message}`);
    }
  }
  return null;
}

async function runMigrations() {
  console.log('Finding working database connection...\n');

  const connectionString = await findWorkingConnection();

  if (!connectionString) {
    console.error('\nCould not connect with any method. Please check credentials.');
    process.exit(1);
  }

  console.log('Running migrations...\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000
  });

  try {
    await client.connect();

    const migrationsDir = join(projectRoot, 'supabase', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files:\n`);

    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');

      console.log(`Running: ${file}...`);

      try {
        await client.query(sql);
        console.log(`  ✓ Completed`);
      } catch (err) {
        if (err.message.includes('already exists') ||
            err.message.includes('duplicate') ||
            err.code === '42P07' ||  // relation already exists
            err.code === '42710') {  // object already exists
          console.log(`  ⊘ Skipped (already exists)`);
        } else {
          console.error(`  ✗ Error: ${err.message}`);
        }
      }
    }

    // Verify tables
    console.log('\n--- Verification ---\n');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Tables in public schema:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Count
    console.log(`\nTotal: ${result.rows.length} tables`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

runMigrations();

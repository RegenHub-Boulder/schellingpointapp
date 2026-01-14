#!/usr/bin/env node
/**
 * Run Supabase migrations using the Supabase Management API
 * This uses the service role key to execute SQL via the API
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load env vars from .env.local
const envPath = join(projectRoot, '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    let value = match[2].trim();
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    env[match[1].trim()] = value;
  }
}

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function runMigrations() {
  console.log('Checking if tables already exist...\n');

  // Try to query the users table
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (!error) {
    console.log('Tables already exist! Checking what we have...\n');
  } else if (error.code === '42P01') {
    console.log('Tables do not exist yet.');
    console.log('\n⚠ Cannot run migrations via Supabase JS client.');
    console.log('The Supabase JS client does not support raw SQL execution.');
    console.log('\nPlease run the migrations manually:');
    console.log('1. Go to https://supabase.com/dashboard/project/ixnbhztqrxodrlgdiaav/sql');
    console.log('2. Copy the contents of supabase/.temp/combined_migrations.sql');
    console.log('3. Paste and run in the SQL Editor');
  } else {
    console.log('Error:', error.message, error.code);
  }
}

runMigrations();

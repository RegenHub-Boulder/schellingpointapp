import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const projectRef = 'ixnbhztqrxodrlgdiaav';

async function main() {
  const migrationsDir = '/workspace/project/supabase/migrations';
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('=== SUPABASE MIGRATION RUNNER ===\n');
  console.log(`Project: ${projectRef}`);
  console.log(`Migrations: ${files.length} files\n`);

  // Generate combined SQL for manual execution
  const combinedSql = [];
  
  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf-8');
    
    combinedSql.push(`-- =============================================`);
    combinedSql.push(`-- Migration: ${file}`);
    combinedSql.push(`-- =============================================`);
    combinedSql.push(sql);
    combinedSql.push('');
  }

  // Write combined SQL to a file
  const outputPath = '/workspace/project/supabase/.temp/combined_migrations.sql';
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, combinedSql.join('\n'));
  
  console.log(`Combined SQL written to: ${outputPath}`);
  console.log('');
  console.log('To run the migrations:');
  console.log(`1. Open: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log('2. Paste the contents of the combined_migrations.sql file');
  console.log('3. Click "Run" to execute');
  console.log('');
  console.log('Or provide DATABASE_URL from Supabase Dashboard:');
  console.log(`   Go to: https://supabase.com/dashboard/project/${projectRef}/settings/database`);
  console.log('   Copy "Connection string" and run:');
  console.log(`   DATABASE_URL="<connection-string>" node run-migrations.mjs`);
}

main().catch(console.error);

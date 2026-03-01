/**
 * Migration script: Add created_by to spells & is_admin to profiles.
 * 
 * Run this ONCE via:  node migrate-admin.js
 * 
 * Requires SUPABASE_SERVICE_KEY env variable (Settings → API → service_role key).
 * 
 * If you prefer, you can run the SQL directly in Supabase SQL Editor instead:
 *
 * -- 1. Add created_by column to spells
 * ALTER TABLE spells ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
 *
 * -- 2. Add is_admin to profiles
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
 *
 * -- 3. Update RLS policies on spells
 * -- Drop old policies
 * DROP POLICY IF EXISTS "Allow public read spells" ON spells;
 * DROP POLICY IF EXISTS "Allow authenticated insert spells" ON spells;
 * DROP POLICY IF EXISTS "Allow authenticated update spells" ON spells;
 * DROP POLICY IF EXISTS "Allow authenticated delete spells" ON spells;
 *
 * -- SELECT: base spells (created_by IS NULL) visible to everyone,
 * --         user-created spells visible to owner + admins
 * CREATE POLICY "spells_select_policy" ON spells FOR SELECT USING (
 *   created_by IS NULL
 *   OR created_by = auth.uid()
 *   OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
 * );
 *
 * -- INSERT: authenticated users, set created_by to their id
 * CREATE POLICY "spells_insert_policy" ON spells FOR INSERT TO authenticated
 *   WITH CHECK (true);
 *
 * -- UPDATE: owner or admin
 * CREATE POLICY "spells_update_policy" ON spells FOR UPDATE TO authenticated USING (
 *   created_by = auth.uid()
 *   OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
 * );
 *
 * -- DELETE: owner or admin
 * CREATE POLICY "spells_delete_policy" ON spells FOR DELETE TO authenticated USING (
 *   created_by = auth.uid()
 *   OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
 * );
 *
 * -- 4. Set yourself as admin (replace YOUR_USER_ID):
 * -- UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_ID';
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecdrspsbtwddlxnbymkj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
    console.error('❌ Set SUPABASE_SERVICE_KEY env variable first!');
    console.error('   $env:SUPABASE_SERVICE_KEY = "your-service-role-key"');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const MIGRATION_SQL = `
-- 1. Add created_by column to spells
ALTER TABLE spells ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 2. Add is_admin to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 3. Drop old policies on spells
DROP POLICY IF EXISTS "Allow public read spells" ON spells;
DROP POLICY IF EXISTS "Allow authenticated insert spells" ON spells;
DROP POLICY IF EXISTS "Allow authenticated update spells" ON spells;
DROP POLICY IF EXISTS "Allow authenticated delete spells" ON spells;

-- 4. New RLS policies
CREATE POLICY "spells_select_policy" ON spells FOR SELECT USING (
  created_by IS NULL
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "spells_insert_policy" ON spells FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "spells_update_policy" ON spells FOR UPDATE TO authenticated USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "spells_delete_policy" ON spells FOR DELETE TO authenticated USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
`;

async function runMigration() {
    console.log('🔧 Running admin migration...');
    
    // Execute raw SQL via rpc
    const { error } = await supabase.rpc('exec_sql', { sql: MIGRATION_SQL });
    
    if (error) {
        console.log('⚠️  rpc exec_sql not available, run the SQL manually in Supabase SQL Editor.');
        console.log('');
        console.log('Copy the SQL from the top of this file and paste it into:');
        console.log('https://supabase.com/dashboard/project/ecdrspsbtwddlxnbymkj/sql/new');
        console.log('');
        console.log('SQL to run:');
        console.log(MIGRATION_SQL);
        return;
    }
    
    console.log('✅ Migration complete!');
    console.log('');
    console.log('Now set yourself as admin by running in SQL Editor:');
    console.log("UPDATE profiles SET is_admin = true WHERE username = 'YOUR_USERNAME';");
}

runMigration().catch(console.error);

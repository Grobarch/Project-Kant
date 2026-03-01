-- Fix RLS for spells so users can delete/edit only their own spells,
-- while admins can manage all and everyone can read spells.
-- Run in Supabase SQL Editor.

BEGIN;

-- Ensure created_by exists for ownership checks
ALTER TABLE spells
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Optional: auto-fill created_by for new authenticated inserts
ALTER TABLE spells
ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE spells ENABLE ROW LEVEL SECURITY;

-- Drop known/legacy policies if present
DROP POLICY IF EXISTS "Anyone can view spells" ON spells;
DROP POLICY IF EXISTS "Authenticated users can insert spells" ON spells;
DROP POLICY IF EXISTS "Users can manage own spells" ON spells;
DROP POLICY IF EXISTS "Admins can manage all spells" ON spells;
DROP POLICY IF EXISTS "Users can delete own spells" ON spells;
DROP POLICY IF EXISTS "Users can update own spells" ON spells;
DROP POLICY IF EXISTS "Users can insert own spells" ON spells;

-- Read access for all (including anon) so app can display spells before login
CREATE POLICY "Anyone can view spells"
    ON spells
    FOR SELECT
    USING (true);

-- Insert: authenticated users can add spells only as themselves; admins also allowed
CREATE POLICY "Users can insert own spells"
    ON spells
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.is_admin = true
        )
    );

-- Update: owners or admins
CREATE POLICY "Users can update own spells"
    ON spells
    FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.is_admin = true
        )
    )
    WITH CHECK (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.is_admin = true
        )
    );

-- Delete: owners or admins
CREATE POLICY "Users can delete own spells"
    ON spells
    FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.is_admin = true
        )
    );

COMMIT;

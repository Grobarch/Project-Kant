-- Fix RLS policy for known_spells updates (including sort_order)
-- Run this in Supabase SQL Editor

-- Make script idempotent by dropping both historical/current names
DROP POLICY IF EXISTS "Users can update their own known_spells" ON known_spells;
DROP POLICY IF EXISTS "Users can manage their own known_spells" ON known_spells;

-- Recreate a single policy that covers SELECT/INSERT/UPDATE/DELETE
-- Access is allowed only when the row belongs to a character owned by current user
CREATE POLICY "Users can manage their own known_spells"
    ON known_spells
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM characters
            WHERE characters.id = known_spells.character_id
              AND characters.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM characters
            WHERE characters.id = known_spells.character_id
              AND characters.user_id = auth.uid()
        )
    );

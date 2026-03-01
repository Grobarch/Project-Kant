-- Fix RLS policies for spellbook_spells table
-- The old policies checked user_id directly, but now ownership goes through:
-- spellbook_spells -> spellbooks -> characters -> user_id
-- Run this in Supabase SQL Editor

-- First, drop old policies that reference user_id directly
DROP POLICY IF EXISTS "Users can view spells in their spellbooks" ON spellbook_spells;
DROP POLICY IF EXISTS "Users can add spells to their spellbooks" ON spellbook_spells;
DROP POLICY IF EXISTS "Users can remove spells from their spellbooks" ON spellbook_spells;

-- Create new policies that check ownership through the character chain
CREATE POLICY "Users can view spells in their spellbooks"
    ON spellbook_spells FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM spellbooks
            JOIN characters ON characters.id = spellbooks.character_id
            WHERE spellbooks.id = spellbook_spells.spellbook_id
            AND characters.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add spells to their spellbooks"
    ON spellbook_spells FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM spellbooks
            JOIN characters ON characters.id = spellbooks.character_id
            WHERE spellbooks.id = spellbook_spells.spellbook_id
            AND characters.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove spells from their spellbooks"
    ON spellbook_spells FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM spellbooks
            JOIN characters ON characters.id = spellbooks.character_id
            WHERE spellbooks.id = spellbook_spells.spellbook_id
            AND characters.user_id = auth.uid()
        )
    );

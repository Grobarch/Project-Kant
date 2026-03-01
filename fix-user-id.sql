-- Quick fix for user_id NOT NULL constraint
-- Run this in Supabase SQL Editor if you already ran the previous migration

-- Make user_id nullable in known_spells
ALTER TABLE known_spells ALTER COLUMN user_id DROP NOT NULL;

-- Make user_id nullable in spellbooks
ALTER TABLE spellbooks ALTER COLUMN user_id DROP NOT NULL;

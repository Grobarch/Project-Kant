-- Add status column to spellbook_spells table
-- Status can be 'present' (spell is in the book) or 'missing' (confirmed not in the book)
-- Run this in Supabase SQL Editor

-- Add status column with default 'present' so existing entries are treated as present
ALTER TABLE spellbook_spells 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'present';

-- Add check constraint to ensure valid status values
ALTER TABLE spellbook_spells
ADD CONSTRAINT spellbook_spells_status_check 
CHECK (status IN ('present', 'missing'));

-- Update existing rows (they should all be 'present')
UPDATE spellbook_spells SET status = 'present' WHERE status IS NULL;

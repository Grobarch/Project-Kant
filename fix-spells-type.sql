-- Normalize spell type from legacy 'sztuka' to canonical 'sztuczka'
-- Run this in Supabase SQL Editor

BEGIN;

-- 1) Drop old constraint if exists
ALTER TABLE spells
DROP CONSTRAINT IF EXISTS spells_type_check;

-- 2) Normalize existing values (case-insensitive)
UPDATE spells
SET type = 'sztuczka'
WHERE lower(type) IN ('sztuka', 'sztuczka');

-- 3) Recreate constraint with canonical values
ALTER TABLE spells
ADD CONSTRAINT spells_type_check
CHECK (type IN ('kant', 'sztuczka'));

COMMIT;

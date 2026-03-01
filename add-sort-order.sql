-- Add sort_order column to known_spells for drag & drop reordering
ALTER TABLE known_spells ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set initial sort_order based on existing created_at order
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY character_id ORDER BY created_at ASC) as rn
    FROM known_spells
)
UPDATE known_spells
SET sort_order = numbered.rn
FROM numbered
WHERE known_spells.id = numbered.id;

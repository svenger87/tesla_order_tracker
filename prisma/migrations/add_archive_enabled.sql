-- Add archiveEnabled field to Settings table
-- SQLite uses INTEGER for booleans (1 = true, 0 = false)
ALTER TABLE Settings ADD COLUMN archiveEnabled INTEGER DEFAULT 1;

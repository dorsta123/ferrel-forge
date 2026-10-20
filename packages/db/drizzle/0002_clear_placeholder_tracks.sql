-- The phase 1 tracks table only held a demo row ("Midnight Forge (demo)").
-- The phase 3 schema adds required columns that row can't satisfy, so clear it first.
DELETE FROM "tracks";

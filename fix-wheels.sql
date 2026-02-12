-- Fix wheel labels in test database
UPDATE "Option" SET label = '18"' WHERE type = 'wheels' AND value = '18';
UPDATE "Option" SET label = '19"' WHERE type = 'wheels' AND value = '19';
UPDATE "Option" SET label = '20"' WHERE type = 'wheels' AND value = '20';
UPDATE "Option" SET label = '21"' WHERE type = 'wheels' AND value = '21';

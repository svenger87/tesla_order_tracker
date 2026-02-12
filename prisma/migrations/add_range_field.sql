-- Add range field to Order table
-- Values: "Maximale Reichweite", "Standard", or NULL (for Performance models)
ALTER TABLE "Order" ADD COLUMN "range" TEXT;

-- Set all existing non-Performance entries to "Maximale Reichweite"
UPDATE "Order" SET "range" = 'Maximale Reichweite' WHERE "model" IS NULL OR "model" != 'Performance';

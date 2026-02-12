-- Migration: Add OptionConstraint table for dynamic form constraints
-- This table stores rules like "Model 3 Hinterradantrieb can only have 18" wheels"

-- CreateTable OptionConstraint
CREATE TABLE IF NOT EXISTS "OptionConstraint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceValue" TEXT NOT NULL,
    "vehicleType" TEXT,
    "targetType" TEXT NOT NULL,
    "constraintType" TEXT NOT NULL,
    "values" TEXT NOT NULL,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "OptionConstraint_source_target_key"
    ON "OptionConstraint"("sourceType", "sourceValue", "vehicleType", "targetType");
CREATE INDEX IF NOT EXISTS "OptionConstraint_source_idx"
    ON "OptionConstraint"("sourceType", "sourceValue", "vehicleType", "isActive");
CREATE INDEX IF NOT EXISTS "OptionConstraint_vehicle_idx"
    ON "OptionConstraint"("vehicleType", "isActive");

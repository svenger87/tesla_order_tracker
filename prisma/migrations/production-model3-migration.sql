-- Production Migration: Add Model 3 Support
-- Run this against the production Turso database BEFORE deploying the new code
--
-- Usage:
--   turso db shell tff-order-stats < prisma/migrations/production-model3-migration.sql
--
-- Or run each statement individually via turso db shell

-- ============================================
-- STEP 1: Add vehicleType column to Order table
-- ============================================
-- Existing orders will automatically get 'Model Y' as the default value
ALTER TABLE "Order" ADD COLUMN "vehicleType" TEXT NOT NULL DEFAULT 'Model Y';

-- Add index for vehicleType filtering
CREATE INDEX IF NOT EXISTS "Order_vehicleType_idx" ON "Order"("vehicleType");


-- ============================================
-- STEP 2: Add vehicleType column to Option table
-- ============================================
-- NULL means the option applies to all vehicle types
-- 'Model Y' or 'Model 3' means vehicle-specific option
ALTER TABLE "Option" ADD COLUMN "vehicleType" TEXT;

-- Update existing index to include vehicleType
DROP INDEX IF EXISTS "Option_type_isActive_sortOrder_idx";
CREATE INDEX IF NOT EXISTS "Option_type_vehicleType_isActive_sortOrder_idx" ON "Option"("type", "vehicleType", "isActive", "sortOrder");

-- Update unique constraint to include vehicleType
-- This allows same value for different vehicle types (e.g., 'performance' for both Model Y and Model 3)
DROP INDEX IF EXISTS "Option_type_value_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Option_type_value_vehicleType_key" ON "Option"("type", "value", "vehicleType");


-- ============================================
-- STEP 3: Seed Vehicle-Specific Options
-- ============================================

-- Model Y Trims
INSERT INTO Option (id, type, value, label, vehicleType, sortOrder, isActive, createdAt, updatedAt) VALUES
(lower(hex(randomblob(16))), 'model', 'standard', 'Standard', 'Model Y', 1, 1, datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'model', 'premium', 'Premium', 'Model Y', 2, 1, datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'model', 'performance', 'Performance', 'Model Y', 3, 1, datetime('now'), datetime('now'));

-- Model Y Wheels
INSERT INTO Option (id, type, value, label, vehicleType, sortOrder, isActive, createdAt, updatedAt) VALUES
(lower(hex(randomblob(16))), 'wheels', '18', '18"', 'Model Y', 1, 1, datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'wheels', '19', '19"', 'Model Y', 2, 1, datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'wheels', '20', '20"', 'Model Y', 3, 1, datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'wheels', '21', '21"', 'Model Y', 4, 1, datetime('now'), datetime('now'));

-- Model 3 Trims
INSERT INTO Option (id, type, value, label, vehicleType, sortOrder, isActive, createdAt, updatedAt) VALUES
(lower(hex(randomblob(16))), 'model', 'hinterradantrieb', 'Hinterradantrieb', 'Model 3', 1, 1, datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'model', 'premium_lr_rwd', 'Premium Maximale Reichweite RWD', 'Model 3', 2, 1, datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'model', 'premium_lr_awd', 'Premium Maximale Reichweite AWD', 'Model 3', 3, 1, datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'model', 'performance', 'Performance', 'Model 3', 4, 1, datetime('now'), datetime('now'));

-- Model 3 Wheels
INSERT INTO Option (id, type, value, label, vehicleType, sortOrder, isActive, createdAt, updatedAt) VALUES
(lower(hex(randomblob(16))), 'wheels', '18', '18"', 'Model 3', 1, 1, datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'wheels', '19', '19"', 'Model 3', 2, 1, datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'wheels', '20', '20"', 'Model 3', 3, 1, datetime('now'), datetime('now'));


-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check Order table has vehicleType column
-- SELECT vehicleType, COUNT(*) FROM "Order" GROUP BY vehicleType;

-- Check Option table has Model 3 options
-- SELECT type, value, label, vehicleType FROM Option WHERE vehicleType = 'Model 3' ORDER BY type, sortOrder;

-- Check all Model Y orders are set correctly
-- SELECT COUNT(*) FROM "Order" WHERE vehicleType = 'Model Y';

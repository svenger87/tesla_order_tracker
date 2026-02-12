# Model 3 Support - Production Deployment Guide

## Overview

This document outlines the steps to deploy Model 3 support to production.

## Pre-Deployment Checklist

- [ ] All tests pass on preview deployment
- [ ] Model 3 order creation works correctly
- [ ] Model Y orders still work correctly
- [ ] Statistics filtering by vehicle type works
- [ ] Admin options management works for both vehicle types

## Deployment Steps

### Step 1: Run Database Migration (BEFORE deploying code)

The migration must run BEFORE the new code is deployed to avoid runtime errors.

```bash
# Connect to production Turso database
turso db shell tff-order-stats

# Run migration script (copy-paste each section or run file)
# Option A: Run entire file
turso db shell tff-order-stats < prisma/migrations/production-model3-migration.sql

# Option B: Run statements individually via shell
```

**Migration script location:** `prisma/migrations/production-model3-migration.sql`

**What the migration does:**
1. Adds `vehicleType` column to `Order` table (default: 'Model Y')
2. Adds `vehicleType` column to `Option` table (nullable)
3. Updates indexes for vehicle type filtering
4. Seeds Model 3 trim and wheel options

### Step 2: Verify Migration

```sql
-- Check Order vehicleType column exists and all orders have 'Model Y'
SELECT vehicleType, COUNT(*) FROM "Order" GROUP BY vehicleType;

-- Check Model 3 options were seeded
SELECT type, value, label, vehicleType FROM Option WHERE vehicleType = 'Model 3' ORDER BY type, sortOrder;

-- Expected output: 4 model options + 4 wheel options for Model 3
```

### Step 3: Merge Feature Branch

```bash
git checkout master
git merge feature/model-3-support
git push origin master
```

Vercel will auto-deploy to production.

### Step 4: Post-Deployment Verification

1. **Main page:** Verify existing Model Y orders display correctly
2. **New order:** Create a Model 3 order, verify constraints work
3. **Statistics:** Toggle between Model Y and Model 3, verify charts filter
4. **Admin options:** Verify Model 3 trims and wheels appear in admin

## Rollback Plan

If issues occur after deployment:

### Code Rollback
```bash
git revert HEAD
git push origin master
```

### Database Rollback (if needed)
```sql
-- Remove vehicleType from Order (data loss for new Model 3 orders!)
-- Only do this if no Model 3 orders were created
ALTER TABLE "Order" DROP COLUMN "vehicleType";

-- Remove Model 3 options
DELETE FROM Option WHERE vehicleType = 'Model 3';

-- Remove vehicleType from Option
ALTER TABLE "Option" DROP COLUMN "vehicleType";

-- Restore original indexes
DROP INDEX IF EXISTS "Order_vehicleType_idx";
DROP INDEX IF EXISTS "Option_type_vehicleType_isActive_sortOrder_idx";
DROP INDEX IF EXISTS "Option_type_value_vehicleType_key";
CREATE INDEX IF NOT EXISTS "Option_type_isActive_sortOrder_idx" ON "Option"("type", "isActive", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "Option_type_value_key" ON "Option"("type", "value");
```

## Data Compatibility

| Scenario | Behavior |
|----------|----------|
| Existing orders | Automatically assigned `vehicleType='Model Y'` via default |
| Existing options | `vehicleType=NULL` means applies to all vehicles |
| New Model Y orders | Explicitly set `vehicleType='Model Y'` |
| New Model 3 orders | Explicitly set `vehicleType='Model 3'` |
| API without vehicleType | Defaults to 'Model Y' for backwards compatibility |

## Timeline

1. **Now:** Test thoroughly on preview deployment
2. **When ready:** Run migration on production database
3. **After migration:** Merge and deploy code
4. **After deploy:** Verify everything works

-- Fix editCode: Make nullable and clear auto-generated codes
-- Run this on Turso production database
-- SQLite requires recreating the table to change column constraints

-- Step 1: Create new table with nullable editCode
CREATE TABLE "Order_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "editCode" TEXT,
    "name" TEXT NOT NULL,
    "orderDate" TEXT,
    "country" TEXT,
    "model" TEXT,
    "drive" TEXT,
    "color" TEXT,
    "interior" TEXT,
    "wheels" TEXT,
    "towHitch" TEXT,
    "autopilot" TEXT,
    "deliveryWindow" TEXT,
    "deliveryLocation" TEXT,
    "vin" TEXT,
    "vinReceivedDate" TEXT,
    "papersReceivedDate" TEXT,
    "productionDate" TEXT,
    "typeApproval" TEXT,
    "typeVariant" TEXT,
    "deliveryDate" TEXT,
    "orderToProduction" INTEGER,
    "orderToVin" INTEGER,
    "orderToDelivery" INTEGER,
    "orderToPapers" INTEGER,
    "papersToDelivery" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data WITHOUT editCode (set to NULL for all)
INSERT INTO "Order_new" (
    "id", "editCode", "name", "orderDate", "country", "model", "drive", "color",
    "interior", "wheels", "towHitch", "autopilot", "deliveryWindow", "deliveryLocation",
    "vin", "vinReceivedDate", "papersReceivedDate", "productionDate", "typeApproval",
    "typeVariant", "deliveryDate", "orderToProduction", "orderToVin", "orderToDelivery",
    "orderToPapers", "papersToDelivery", "createdAt", "updatedAt"
)
SELECT
    "id", NULL, "name", "orderDate", "country", "model", "drive", "color",
    "interior", "wheels", "towHitch", "autopilot", "deliveryWindow", "deliveryLocation",
    "vin", "vinReceivedDate", "papersReceivedDate", "productionDate", "typeApproval",
    "typeVariant", "deliveryDate", "orderToProduction", "orderToVin", "orderToDelivery",
    "orderToPapers", "papersToDelivery", "createdAt", "updatedAt"
FROM "Order";

-- Step 3: Drop old table
DROP TABLE "Order";

-- Step 4: Rename new table
ALTER TABLE "Order_new" RENAME TO "Order";

-- Step 5: Recreate indexes
CREATE UNIQUE INDEX "Order_editCode_key" ON "Order"("editCode");
CREATE UNIQUE INDEX "unique_name_orderDate" ON "Order"("name", "orderDate");

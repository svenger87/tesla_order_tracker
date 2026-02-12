-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "metadata" TEXT,
    "vehicleType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "editCode" TEXT,
    "name" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'Model Y',
    "orderDate" TEXT,
    "country" TEXT,
    "model" TEXT,
    "range" TEXT,
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
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("autopilot", "color", "country", "createdAt", "deliveryDate", "deliveryLocation", "deliveryWindow", "drive", "editCode", "id", "interior", "model", "name", "orderDate", "orderToDelivery", "orderToPapers", "orderToProduction", "orderToVin", "papersReceivedDate", "papersToDelivery", "productionDate", "towHitch", "typeApproval", "typeVariant", "updatedAt", "vin", "vinReceivedDate", "wheels") SELECT "autopilot", "color", "country", "createdAt", "deliveryDate", "deliveryLocation", "deliveryWindow", "drive", "editCode", "id", "interior", "model", "name", "orderDate", "orderToDelivery", "orderToPapers", "orderToProduction", "orderToVin", "papersReceivedDate", "papersToDelivery", "productionDate", "towHitch", "typeApproval", "typeVariant", "updatedAt", "vin", "vinReceivedDate", "wheels" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_editCode_key" ON "Order"("editCode");
CREATE INDEX "Order_archived_idx" ON "Order"("archived");
CREATE INDEX "Order_vehicleType_idx" ON "Order"("vehicleType");
CREATE UNIQUE INDEX "Order_name_orderDate_key" ON "Order"("name", "orderDate");
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "showDonation" BOOLEAN NOT NULL DEFAULT true,
    "donationUrl" TEXT NOT NULL DEFAULT 'https://buymeacoffee.com',
    "donationText" TEXT NOT NULL DEFAULT 'Projekt unterstützen',
    "lastSyncTime" DATETIME,
    "lastSyncCount" INTEGER,
    "archiveEnabled" BOOLEAN NOT NULL DEFAULT true,
    "archiveThreshold" INTEGER NOT NULL DEFAULT 180,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("donationText", "donationUrl", "id", "showDonation", "updatedAt") SELECT "donationText", "donationUrl", "id", "showDonation", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Option_type_vehicleType_isActive_sortOrder_idx" ON "Option"("type", "vehicleType", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Option_type_value_vehicleType_key" ON "Option"("type", "value", "vehicleType");

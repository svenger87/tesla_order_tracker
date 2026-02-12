-- AlterTable
ALTER TABLE "Order" ADD COLUMN "resetCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "resetCodeExpires" DATETIME;

-- CreateTable
CREATE TABLE "OptionConstraint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceValue" TEXT NOT NULL,
    "vehicleType" TEXT,
    "targetType" TEXT NOT NULL,
    "constraintType" TEXT NOT NULL,
    "values" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "OptionConstraint_sourceType_sourceValue_vehicleType_isActive_idx" ON "OptionConstraint"("sourceType", "sourceValue", "vehicleType", "isActive");

-- CreateIndex
CREATE INDEX "OptionConstraint_vehicleType_isActive_idx" ON "OptionConstraint"("vehicleType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OptionConstraint_sourceType_sourceValue_vehicleType_targetType_key" ON "OptionConstraint"("sourceType", "sourceValue", "vehicleType", "targetType");

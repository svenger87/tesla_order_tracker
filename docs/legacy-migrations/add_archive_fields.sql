-- Add archive fields to Order table
ALTER TABLE "Order" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "archivedAt" DATETIME;

-- Add archive threshold setting to Settings table
ALTER TABLE "Settings" ADD COLUMN "archiveThreshold" INTEGER NOT NULL DEFAULT 180;

-- Create index for archived orders
CREATE INDEX "Order_archived_idx" ON "Order"("archived");

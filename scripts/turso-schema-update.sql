-- Add lastSyncTime and lastSyncCount columns to Settings
ALTER TABLE Settings ADD COLUMN lastSyncTime TEXT;
ALTER TABLE Settings ADD COLUMN lastSyncCount INTEGER;

-- Add unique constraint on Order (name, orderDate)
CREATE UNIQUE INDEX IF NOT EXISTS unique_name_orderDate ON "Order" (name, orderDate);

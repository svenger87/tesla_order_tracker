-- Add Options table for admin-manageable dropdown options
-- Run this on Turso production database

CREATE TABLE IF NOT EXISTS "Option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "metadata" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint on type + value
CREATE UNIQUE INDEX IF NOT EXISTS "Option_type_value_key" ON "Option"("type", "value");

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS "Option_type_isActive_sortOrder_idx" ON "Option"("type", "isActive", "sortOrder");

-- Seed default options (optional - can be added via admin UI instead)

-- Countries
INSERT OR IGNORE INTO "Option" ("id", "type", "value", "label", "metadata", "sortOrder") VALUES
('opt_country_de', 'country', 'de', 'Deutschland', '{"flag":"🇩🇪"}', 1),
('opt_country_at', 'country', 'at', 'Österreich', '{"flag":"🇦🇹"}', 2),
('opt_country_ch', 'country', 'ch', 'Schweiz', '{"flag":"🇨🇭"}', 3),
('opt_country_nl', 'country', 'nl', 'Niederlande', '{"flag":"🇳🇱"}', 4),
('opt_country_be', 'country', 'be', 'Belgien', '{"flag":"🇧🇪"}', 5),
('opt_country_fr', 'country', 'fr', 'Frankreich', '{"flag":"🇫🇷"}', 6),
('opt_country_it', 'country', 'it', 'Italien', '{"flag":"🇮🇹"}', 7),
('opt_country_es', 'country', 'es', 'Spanien', '{"flag":"🇪🇸"}', 8),
('opt_country_pt', 'country', 'pt', 'Portugal', '{"flag":"🇵🇹"}', 9),
('opt_country_pl', 'country', 'pl', 'Polen', '{"flag":"🇵🇱"}', 10),
('opt_country_uk', 'country', 'uk', 'UK', '{"flag":"🇬🇧"}', 11);

-- Models
INSERT OR IGNORE INTO "Option" ("id", "type", "value", "label", "sortOrder") VALUES
('opt_model_standard', 'model', 'standard', 'Standard', 1),
('opt_model_premium', 'model', 'premium', 'Premium', 2),
('opt_model_performance', 'model', 'performance', 'Performance', 3);

-- Drives
INSERT OR IGNORE INTO "Option" ("id", "type", "value", "label", "sortOrder") VALUES
('opt_drive_rwd', 'drive', 'rwd', 'RWD', 1),
('opt_drive_awd', 'drive', 'awd', 'AWD', 2);

-- Colors (current 2025)
INSERT OR IGNORE INTO "Option" ("id", "type", "value", "label", "metadata", "sortOrder") VALUES
('opt_color_pearl_white', 'color', 'pearl_white', 'Pearl White', '{"hex":"#FFFFFF","border":true}', 1),
('opt_color_diamond_black', 'color', 'diamond_black', 'Diamond Black', '{"hex":"#1A1A1A","border":false}', 2),
('opt_color_stealth_grey', 'color', 'stealth_grey', 'Stealth Grey', '{"hex":"#4A4A4A","border":false}', 3),
('opt_color_quicksilver', 'color', 'quicksilver', 'Quicksilver', '{"hex":"#C0C0C0","border":true}', 4),
('opt_color_ultra_red', 'color', 'ultra_red', 'Ultra Red', '{"hex":"#C41E3A","border":false}', 5),
('opt_color_marine_blue', 'color', 'marine_blue', 'Marine Blue', '{"hex":"#1E3A5F","border":false}', 6);

-- Legacy colors (discontinued but appear in historical orders)
INSERT OR IGNORE INTO "Option" ("id", "type", "value", "label", "metadata", "sortOrder", "isActive") VALUES
('opt_color_midnight_silver', 'color', 'midnight_silver', 'Midnight Silver Metallic', '{"hex":"#71797E","border":false}', 10, 0),
('opt_color_solid_black', 'color', 'solid_black', 'Solid Black', '{"hex":"#000000","border":false}', 11, 0),
('opt_color_deep_blue', 'color', 'deep_blue', 'Deep Blue Metallic', '{"hex":"#1C3A5F","border":false}', 12, 0),
('opt_color_red_multi', 'color', 'red_multi', 'Red Multi-Coat', '{"hex":"#A52125","border":false}', 13, 0),
('opt_color_midnight_cherry', 'color', 'midnight_cherry', 'Midnight Cherry Red', '{"hex":"#5C0029","border":false}', 14, 0),
('opt_color_silver_metallic', 'color', 'silver_metallic', 'Silver Metallic', '{"hex":"#A8A9AD","border":true}', 15, 0);

-- Interiors
INSERT OR IGNORE INTO "Option" ("id", "type", "value", "label", "sortOrder") VALUES
('opt_interior_black', 'interior', 'black', 'Schwarz', 1),
('opt_interior_white', 'interior', 'white', 'Weiß', 2);

-- Wheels
INSERT OR IGNORE INTO "Option" ("id", "type", "value", "label", "sortOrder") VALUES
('opt_wheels_18', 'wheels', '18', '18"', 1),
('opt_wheels_19', 'wheels', '19', '19"', 2),
('opt_wheels_20', 'wheels', '20', '20"', 3),
('opt_wheels_21', 'wheels', '21', '21"', 4);

-- Autopilot
INSERT OR IGNORE INTO "Option" ("id", "type", "value", "label", "sortOrder") VALUES
('opt_autopilot_none', 'autopilot', 'none', 'Kein', 1),
('opt_autopilot_ap', 'autopilot', 'ap', 'AP', 2),
('opt_autopilot_eap', 'autopilot', 'eap', 'EAP', 3),
('opt_autopilot_fsd', 'autopilot', 'fsd', 'FSD', 4),
('opt_autopilot_fsd_transfer', 'autopilot', 'fsd_transfer', 'FSD Transfer', 5);

-- Tow Hitch
INSERT OR IGNORE INTO "Option" ("id", "type", "value", "label", "sortOrder") VALUES
('opt_towhitch_ja', 'towHitch', 'ja', 'Ja', 1),
('opt_towhitch_nein', 'towHitch', 'nein', 'Nein', 2);

#!/bin/bash
# Migrate data from Turso SQL dump to local SQLite database
# Usage: ./scripts/migrate-from-turso.sh [dump-file] [target-db]
#
# Prerequisites: sqlite3 CLI must be installed
# This script:
# 1. Creates the schema via Prisma
# 2. Imports data from the Turso SQL dump
# 3. Enables WAL mode for better concurrent read performance

set -euo pipefail

DUMP_FILE="${1:-turso_dump.sql}"
TARGET_DB="${2:-data/prod.db}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Error: Dump file '$DUMP_FILE' not found"
  echo "Export from Turso first: turso db shell tesla-tracker .dump > turso_dump.sql"
  exit 1
fi

echo "Creating target directory..."
mkdir -p "$(dirname "$TARGET_DB")"

if [ -f "$TARGET_DB" ]; then
  echo "Warning: $TARGET_DB already exists. Backing up..."
  cp "$TARGET_DB" "${TARGET_DB}.backup.$(date +%s)"
fi

echo "Creating schema via Prisma..."
DATABASE_URL="file:$(pwd)/$TARGET_DB" npx prisma db push --skip-generate --accept-data-loss

echo "Importing data from $DUMP_FILE..."
# Extract only INSERT statements from the dump (schema already created by Prisma)
grep '^INSERT' "$DUMP_FILE" | sqlite3 "$TARGET_DB"

echo "Enabling WAL mode..."
sqlite3 "$TARGET_DB" "PRAGMA journal_mode=WAL;"

echo ""
echo "Database stats:"
sqlite3 "$TARGET_DB" "SELECT 'Orders: ' || COUNT(*) FROM \"Order\";"
sqlite3 "$TARGET_DB" "SELECT 'Options: ' || COUNT(*) FROM \"Option\";"
sqlite3 "$TARGET_DB" "SELECT 'Constraints: ' || COUNT(*) FROM \"OptionConstraint\";"
sqlite3 "$TARGET_DB" "SELECT 'Admins: ' || COUNT(*) FROM \"Admin\";"

echo ""
echo "Migration complete! Database at: $TARGET_DB"
echo "Set DATABASE_URL=file:$(pwd)/$TARGET_DB in your .env"

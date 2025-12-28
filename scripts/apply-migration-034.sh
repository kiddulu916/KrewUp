#!/bin/bash

# Apply migration 034: Create notifications table
# Run this script to apply the notifications table migration to your Supabase database

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  echo "Please set it to your Supabase database connection string"
  echo "Example: export DATABASE_URL='postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres'"
  exit 1
fi

echo "Applying migration 034: Create notifications table..."
psql "$DATABASE_URL" -f supabase/migrations/034_create_notifications_table.sql

if [ $? -eq 0 ]; then
  echo "✓ Migration 034 applied successfully"
else
  echo "✗ Migration 034 failed"
  exit 1
fi

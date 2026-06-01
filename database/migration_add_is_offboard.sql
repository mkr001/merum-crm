-- Migration: add is_offboard flag to clients
-- Run this against your Supabase database if schema.sql has already been applied.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_offboard BOOLEAN DEFAULT FALSE;

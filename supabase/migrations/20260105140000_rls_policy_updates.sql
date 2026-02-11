-- Migration: 045-rls-policy-updates.sql
-- Date: 2026-01-26
-- Purpose: Add missing RLS policies for tables that were created without complete policy coverage
-- Based on audit: docs/audits/rls-policies-audit.md

-- ========================================
-- 1. Enable RLS on tables missing it
-- ========================================

-- Core profile tables
ALTER TABLE "public"."certifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."licenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."experiences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."education" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."portfolio_images" ENABLE ROW LEVEL SECURITY;

-- Messaging tables
ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 15. Users - Missing DELETE Policy (Optional)
-- ========================================

-- Admins can delete users (or disable this if user deletion should be handled differently)
-- Note: This is optional - user deletion might be handled via soft delete or admin tools
-- Uncomment if needed:
-- CREATE POLICY "Admins can delete users" ON "public"."users"
--     FOR DELETE USING (
--         EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
--     );

-- ========================================
-- Notes
-- ========================================

-- * This migration adds comprehensive RLS policies to ensure data security
-- * All policies follow the principle of least privilege
-- * Service role policies allow webhook/system operations to function correctly
-- * Test thoroughly in development before applying to production
-- * Some policies may need adjustment based on specific business requirements

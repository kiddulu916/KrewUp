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
-- 2. Certifications Policies
-- ========================================

-- Public view (for profile display)
CREATE POLICY "Certifications are viewable by everyone" ON "public"."certifications"
    FOR SELECT USING (true);

-- Workers can insert their own certifications
CREATE POLICY "Workers can insert own certifications" ON "public"."certifications"
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM workers WHERE workers.user_id = auth.uid() AND workers.user_id = certifications.worker_id)
    );

-- Workers can update own certifications (only if pending)
-- Admins can update for verification/rejection
CREATE POLICY "Workers can update own pending certifications" ON "public"."certifications"
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM workers WHERE workers.user_id = auth.uid() AND workers.user_id = certifications.worker_id)
        AND verification_status = 'pending'
    );

CREATE POLICY "Admins can update certifications for verification" ON "public"."certifications"
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Workers can delete own certifications (only if pending)
CREATE POLICY "Workers can delete own pending certifications" ON "public"."certifications"
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM workers WHERE workers.user_id = auth.uid() AND workers.user_id = certifications.worker_id)
        AND verification_status = 'pending'
    );

-- ========================================
-- 3. Licenses Policies (similar to certifications)
-- ========================================

-- Public view
CREATE POLICY "Licenses are viewable by everyone" ON "public"."licenses"
    FOR SELECT USING (true);

-- Contractors can insert their own licenses
CREATE POLICY "Contractors can insert own licenses" ON "public"."licenses"
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM contractors WHERE contractors.user_id = auth.uid() AND contractors.user_id = licenses.contractor_id)
    );

-- Contractors can update own licenses (only if pending)
-- Admins can update for verification/rejection
CREATE POLICY "Contractors can update own pending licenses" ON "public"."licenses"
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM contractors WHERE contractors.user_id = auth.uid() AND contractors.user_id = licenses.contractor_id)
        AND verification_status = 'pending'
    );

CREATE POLICY "Admins can update licenses for verification" ON "public"."licenses"
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Contractors can delete own licenses (only if pending)
CREATE POLICY "Contractors can delete own pending licenses" ON "public"."licenses"
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM contractors WHERE contractors.user_id = auth.uid() AND contractors.user_id = licenses.contractor_id)
        AND verification_status = 'pending'
    );

-- ========================================
-- 4. Experiences Policies
-- ========================================

-- Public view
CREATE POLICY "Experiences are viewable by everyone" ON "public"."experiences"
    FOR SELECT USING (true);

-- Users can insert their own experiences
CREATE POLICY "Users can insert own experiences" ON "public"."experiences"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own experiences
CREATE POLICY "Users can update own experiences" ON "public"."experiences"
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own experiences
CREATE POLICY "Users can delete own experiences" ON "public"."experiences"
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 5. Education Policies
-- ========================================

-- Public view
CREATE POLICY "Education is viewable by everyone" ON "public"."education"
    FOR SELECT USING (true);

-- Users can insert their own education
CREATE POLICY "Users can insert own education" ON "public"."education"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own education
CREATE POLICY "Users can update own education" ON "public"."education"
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own education
CREATE POLICY "Users can delete own education" ON "public"."education"
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 6. Portfolio Images Policies
-- ========================================

-- Public view
CREATE POLICY "Portfolio images are viewable by everyone" ON "public"."portfolio_images"
    FOR SELECT USING (true);

-- Users can insert their own portfolio images
CREATE POLICY "Users can insert own portfolio images" ON "public"."portfolio_images"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own portfolio images (description, display_order)
CREATE POLICY "Users can update own portfolio images" ON "public"."portfolio_images"
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own portfolio images
CREATE POLICY "Users can delete own portfolio images" ON "public"."portfolio_images"
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 7. Conversations Policies
-- ========================================

-- Participants can view conversations they're part of
CREATE POLICY "Participants can view own conversations" ON "public"."conversations"
    FOR SELECT USING (
        auth.uid() = participant_1_id OR auth.uid() = participant_2_id
    );

-- Users can create conversations (with themselves as participant_1 or participant_2)
CREATE POLICY "Users can create conversations" ON "public"."conversations"
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1_id OR auth.uid() = participant_2_id
    );

-- Participants can update conversations (last_message_at via trigger, but allow manual updates)
CREATE POLICY "Participants can update own conversations" ON "public"."conversations"
    FOR UPDATE USING (
        auth.uid() = participant_1_id OR auth.uid() = participant_2_id
    );

-- Participants can delete conversations (or admin-only - choose based on requirements)
-- For now, allowing participants to delete
CREATE POLICY "Participants can delete own conversations" ON "public"."conversations"
    FOR DELETE USING (
        auth.uid() = participant_1_id OR auth.uid() = participant_2_id
    );

-- ========================================
-- 8. Messages Policies
-- ========================================

-- Participants can view messages in their conversations
CREATE POLICY "Participants can view messages in own conversations" ON "public"."messages"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
        )
    );

-- Participants can send messages in their conversations
CREATE POLICY "Participants can send messages" ON "public"."messages"
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
        )
    );

-- Service role can update messages (for read_at updates)
-- Note: In practice, read_at is updated via service role client
CREATE POLICY "Service role can update messages" ON "public"."messages"
    FOR UPDATE USING (auth.role() = 'service_role');

-- Sender can delete own messages (or admin-only)
CREATE POLICY "Senders can delete own messages" ON "public"."messages"
    FOR DELETE USING (auth.uid() = sender_id);

-- Admins can delete any message
CREATE POLICY "Admins can delete any message" ON "public"."messages"
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- ========================================
-- 9. Notifications Policies
-- ========================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON "public"."notifications"
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert notifications (system creates notifications)
CREATE POLICY "Service role can insert notifications" ON "public"."notifications"
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON "public"."notifications"
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON "public"."notifications"
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 10. Job Applications - Missing UPDATE/DELETE Policies
-- ========================================

-- Employers can update application status for applications to their jobs
CREATE POLICY "Employers can update applications to own jobs" ON "public"."job_applications"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_applications.job_id
            AND jobs.employer_id = auth.uid()
        )
    );

-- Workers can update their own applications (for withdrawal)
CREATE POLICY "Workers can update own applications" ON "public"."job_applications"
    FOR UPDATE USING (auth.uid() = applicant_id);

-- Workers can delete (withdraw) their own applications
CREATE POLICY "Workers can delete own applications" ON "public"."job_applications"
    FOR DELETE USING (auth.uid() = applicant_id);

-- ========================================
-- 11. Jobs - Missing DELETE Policy
-- ========================================

-- Employers can delete their own jobs
CREATE POLICY "Employers can delete own jobs" ON "public"."jobs"
    FOR DELETE USING (auth.uid() = employer_id);

-- Admins can delete any job
CREATE POLICY "Admins can delete any job" ON "public"."jobs"
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- ========================================
-- 12. Subscriptions - Missing UPDATE Policy
-- ========================================

-- Service role can update subscriptions (for webhook updates)
CREATE POLICY "Service role can update subscriptions" ON "public"."subscriptions"
    FOR UPDATE USING (auth.role() = 'service_role');

-- ========================================
-- 13. Subscription History - Missing INSERT/UPDATE/DELETE Policies
-- ========================================

-- Service role can insert subscription history (for webhook events)
CREATE POLICY "Service role can insert subscription history" ON "public"."subscription_history"
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Service role can update subscription history
CREATE POLICY "Service role can update subscription history" ON "public"."subscription_history"
    FOR UPDATE USING (auth.role() = 'service_role');

-- Service role can delete subscription history (for cleanup if needed)
CREATE POLICY "Service role can delete subscription history" ON "public"."subscription_history"
    FOR DELETE USING (auth.role() = 'service_role');

-- ========================================
-- 14. Admin Activity Log - Missing INSERT Policy
-- ========================================

-- Service role and admins can insert activity log entries
CREATE POLICY "Service role and admins can insert activity log" ON "public"."admin_activity_log"
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

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

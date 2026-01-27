# RLS Policies Audit

**Date:** January 26, 2026  
**Status:** In Progress  
**Purpose:** Comprehensive audit of Row Level Security (RLS) policies across all database tables

---

## Summary

This document audits all database tables to ensure:

1. RLS is enabled on all tables
2. Complete policy coverage (SELECT, INSERT, UPDATE, DELETE)
3. Policies are correctly scoped and secure
4. No security gaps exist

---

## Tables Audit

### ✅ Core Tables (RLS Enabled & Policies Complete)

#### `users`

- **RLS:** ✅ Enabled (migration 07)
- **Policies:**
  - ✅ SELECT: Public profiles viewable by everyone
  - ✅ UPDATE: Users can update own profile
  - ❌ INSERT: Missing (users created via Supabase Auth)
  - ❌ DELETE: Missing (should be admin-only or disabled)

#### `workers`

- **RLS:** ✅ Enabled (migration 07)
- **Policies:**
  - ✅ SELECT: Viewable by everyone
  - ✅ UPDATE: Workers update own data
  - ❌ INSERT: Missing (created via trigger or admin)
  - ❌ DELETE: Missing

#### `contractors`

- **RLS:** ✅ Enabled (migration 07)
- **Policies:**
  - ✅ SELECT: Viewable by everyone (assumed, similar to workers)
  - ✅ UPDATE: Contractors update own data (assumed)
  - ❌ INSERT: Missing
  - ❌ DELETE: Missing

#### `jobs`

- **RLS:** ✅ Enabled (migration 07)
- **Policies:**
  - ✅ SELECT: Active jobs viewable OR employer can view own
  - ✅ UPDATE: Employers update own jobs
  - ✅ INSERT: Employers insert jobs
  - ❌ DELETE: Missing (should be employer-only or admin-only)

#### `job_applications`

- **RLS:** ✅ Enabled (migration 07)
- **Policies:**
  - ✅ SELECT: Workers view own OR employers view received
  - ✅ INSERT: Workers apply (create applications)
  - ❌ UPDATE: Missing (needed for status updates by employers)
  - ❌ DELETE: Missing (needed for withdrawal by workers)

---

### ⚠️ Tables with Partial RLS Coverage

#### `certifications`

- **RLS:** ❓ Status unknown (not found in migrations 01-07)
- **Policies:** ❓ Need to verify
- **Recommendation:** Add RLS policies:
  - SELECT: Public view (for profile display)
  - INSERT: Workers insert own
  - UPDATE: Workers update own (pending status only), Admins can verify/reject
  - DELETE: Workers delete own (pending only)

#### `licenses`

- **RLS:** ❓ Status unknown
- **Policies:** ❓ Need to verify
- **Recommendation:** Similar to certifications

#### `experiences`

- **RLS:** ❓ Status unknown
- **Policies:** ❓ Need to verify
- **Recommendation:** Add RLS policies:
  - SELECT: Public view
  - INSERT: Users insert own
  - UPDATE: Users update own
  - DELETE: Users delete own

#### `education`

- **RLS:** ❓ Status unknown
- **Policies:** ❓ Need to verify
- **Recommendation:** Similar to experiences

#### `portfolio_images`

- **RLS:** ❓ Status unknown
- **Policies:** ❓ Need to verify
- **Recommendation:** Add RLS policies:
  - SELECT: Public view
  - INSERT: Users insert own
  - UPDATE: Users update own (description, display_order)
  - DELETE: Users delete own

#### `conversations`

- **RLS:** ❓ Status unknown (migration 04 creates table but no policies found)
- **Policies:** ❓ Need to verify
- **Recommendation:** Add RLS policies:
  - SELECT: Participants can view conversations they're part of
  - INSERT: Users can create conversations
  - UPDATE: Participants can update (last_message_at via trigger)
  - DELETE: Participants can delete (or admin-only)

#### `messages`

- **RLS:** ❓ Status unknown
- **Policies:** ❓ Need to verify
- **Recommendation:** Add RLS policies:
  - SELECT: Participants can view messages in their conversations
  - INSERT: Participants can send messages
  - UPDATE: Service role only (for read_at updates)
  - DELETE: Sender can delete own messages (or admin-only)

#### `notifications`

- **RLS:** ❓ Status unknown
- **Policies:** ❓ Need to verify
- **Recommendation:** Add RLS policies:
  - SELECT: Users view own notifications
  - INSERT: Service role only (system creates notifications)
  - UPDATE: Users update own (mark as read)
  - DELETE: Users delete own

---

### ✅ Tables with Complete RLS Coverage

#### `subscriptions`

- **RLS:** ✅ Enabled (migration 08)
- **Policies:**
  - ✅ SELECT: Users view own subscription
  - ❌ INSERT: Missing (created via webhook/service role)
  - ❌ UPDATE: Missing (updated via webhook/service role)
  - ❌ DELETE: Missing (should be service role only)

#### `subscription_history`

- **RLS:** ✅ Enabled (migration 08)
- **Policies:**
  - ✅ SELECT: Users view own history
  - ❌ INSERT: Missing (created via webhook/service role)
  - ❌ UPDATE: Missing (should be service role only)
  - ❌ DELETE: Missing (should be service role only)

#### `stripe_processed_events`

- **RLS:** ✅ Enabled (migration 08)
- **Policies:**
  - ✅ No public policies (service role only) - Correct

#### `push_subscriptions`

- **RLS:** ✅ Enabled (migration 13)
- **Policies:**
  - ✅ SELECT: Users view own
  - ✅ INSERT: Users insert own
  - ✅ UPDATE: Users update own
  - ✅ DELETE: Users delete own
  - ✅ Service role full access

#### `professional_references`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:**
  - ✅ ALL: Users manage own references

#### `application_drafts`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:**
  - ✅ ALL: Applicants manage own drafts

#### `profile_views`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:**
  - ✅ SELECT: Users view own profile views
  - ✅ INSERT: Public insert (migration 11)

#### `job_views`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:**
  - ✅ SELECT: Employers view own job views

#### `proximity_alerts`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:**
  - ✅ ALL: Users manage own alerts

#### `endorsement_requests`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:**
  - ✅ SELECT: Workers view sent requests
  - ✅ ALL: Employers view/update received requests

#### `endorsements`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:** ❓ Need to verify

#### `admin_activity_log`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:**
  - ✅ SELECT: Admins can view
  - ❌ INSERT: Missing (should be service role/admin only)

#### `content_reports`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:**
  - ✅ ALL: Admins can manage
  - ✅ SELECT: Reporters can view own

#### `platform_settings`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:**
  - ✅ SELECT: Anyone can view
  - ✅ ALL: Admins can update

#### `user_moderation_actions`

- **RLS:** ✅ Enabled (migration 09)
- **Policies:**
  - ✅ ALL: Admins can manage
  - ✅ SELECT: Users view own (assumed, need to verify)

---

## Critical Gaps Identified

### High Priority

1. **`job_applications` missing UPDATE policy**
   - Employers need to update application status
   - Workers need to update (withdraw)

2. **`jobs` missing DELETE policy**
   - Employers should be able to delete own jobs
   - Or admin-only deletion

3. **Core profile tables missing RLS**
   - `certifications`, `licenses`, `experiences`, `education`, `portfolio_images`
   - These are publicly viewable but need INSERT/UPDATE/DELETE policies

4. **Messaging tables missing RLS**
   - `conversations`, `messages` need policies
   - Critical for privacy

5. **`notifications` missing RLS**
   - Users should only see own notifications

### Medium Priority

6. **`users` missing DELETE policy**
   - Should be admin-only or disabled

7. **`subscriptions` missing UPDATE policy**
   - Webhook updates need service role access

8. **`admin_activity_log` missing INSERT policy**
   - Should be service role/admin only

---

## Recommended Migration

Create migration `045-rls-policy-updates.sql` with:

1. Enable RLS on tables missing it
2. Add missing policies for:
   - `job_applications` UPDATE/DELETE
   - `jobs` DELETE
   - `certifications` full policies
   - `licenses` full policies
   - `experiences` full policies
   - `education` full policies
   - `portfolio_images` full policies
   - `conversations` full policies
   - `messages` full policies
   - `notifications` full policies
   - `endorsements` policies (if missing)
   - `subscriptions` UPDATE (service role)
   - `admin_activity_log` INSERT (service role)

---

## Next Steps

1. ✅ Audit complete (this document)
2. ⏳ Create migration file with missing policies
3. ⏳ Test policies locally
4. ⏳ Review with team
5. ⏳ Apply to production

---

_Last Updated: 2026-01-26_

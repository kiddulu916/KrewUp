# KrewUp Email & Database Setup Guide

## Overview

This guide covers:

1. Setting up Resend for **sending** emails (noreply@krewup.net)
2. Setting up email **forwarding** for support@krewup.net
3. DNS configuration
4. Pending database migrations

---

## Part 1: Resend Setup (Sending Emails)

Resend is used for **outbound** emails only (notifications, feedback confirmations, etc.).

### Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email address

### Step 2: Add Your Domain

1. In Resend dashboard, go to **Domains** → **Add Domain**
2. Enter: `krewup.net` (the root domain, not a subdomain)
3. Resend will provide DNS records to add

### Step 3: Add DNS Records in Vercel

Go to your Vercel project → **Settings** → **Domains** → **krewup.net** → **DNS Records**

Add these records (Resend will show you the exact values):

| Type | Name               | Value                                   | TTL  |
| ---- | ------------------ | --------------------------------------- | ---- |
| TXT  | @                  | `v=spf1 include:resend.com ~all`        | 3600 |
| TXT  | resend.\_domainkey | `(Resend provides this DKIM key)`       | 3600 |
| MX   | send               | `feedback-smtp.us-east-1.amazonses.com` | 3600 |
| TXT  | send               | `v=spf1 include:amazonses.com ~all`     | 3600 |

**Note:** The exact records will be shown in your Resend dashboard after adding the domain.

### Step 4: Verify Domain in Resend

1. After adding DNS records, click **Verify** in Resend
2. DNS propagation can take up to 48 hours (usually faster)
3. Once verified, you'll see a green checkmark

### Step 5: Get API Key

1. In Resend, go to **API Keys** → **Create API Key**
2. Name it: `krewup-production`
3. Select permissions: **Sending access** → **Full access**
4. Copy the key (you won't see it again)

### Step 6: Configure Environment Variables

In Vercel dashboard → **Settings** → **Environment Variables**, add:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@krewup.net
```

Or in `.env.local` for local development:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@krewup.net
```

---

## Part 2: Support Email Setup (Receiving Emails)

Resend does NOT handle incoming emails. For `support@krewup.net` to receive emails and forward to `cor.hilsen@gmail.com`, use one of these options:

### Option A: ImprovMX (Free, Recommended)

ImprovMX provides free email forwarding for custom domains.

1. Go to [improvmx.com](https://improvmx.com)
2. Sign up and add domain: `krewup.net`
3. Add forwarding rule:
   - **Alias:** `support`
   - **Forward to:** `cor.hilsen@gmail.com`
4. Add these DNS records in Vercel:

| Type | Name | Value                                  | Priority |
| ---- | ---- | -------------------------------------- | -------- |
| MX   | @    | `mx1.improvmx.com`                     | 10       |
| MX   | @    | `mx2.improvmx.com`                     | 20       |
| TXT  | @    | `v=spf1 include:spf.improvmx.com ~all` | -        |

**Note:** You may need to merge SPF records if you already have one for Resend:

```
v=spf1 include:resend.com include:spf.improvmx.com ~all
```

### Option B: Forward Email (Open Source)

[forwardemail.net](https://forwardemail.net) - Similar to ImprovMX, free tier available.

### Option C: Google Workspace (Paid)

If you want full email accounts (not just forwarding):

1. Sign up for Google Workspace ($6/month)
2. Add your domain
3. Follow their MX record setup
4. Create support@krewup.net mailbox

### Option D: Zoho Mail (Free Tier)

1. Sign up at [zoho.com/mail](https://www.zoho.com/mail/)
2. Add domain and verify
3. Create support@krewup.net account
4. Set up forwarding to personal email

---

## Part 3: Complete DNS Configuration Summary

Here's what your final DNS records should look like in Vercel:

```
# For Resend (sending emails)
TXT   @                    v=spf1 include:resend.com include:spf.improvmx.com ~all
TXT   resend._domainkey    (DKIM key from Resend)

# For ImprovMX (receiving/forwarding emails)
MX    @                    mx1.improvmx.com    10
MX    @                    mx2.improvmx.com    20

# For Vercel (if not already there)
A     @                    76.76.21.21
CNAME www                  cname.vercel-dns.com
```

---

## Part 4: Pending Database Migrations

### Migration to Apply

The following migration was created but needs to be applied to your Supabase database:

**File:** `supabase/migrations/14-job-experience-field.sql`

```sql
-- Add years_experience_required field to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS years_experience_required integer DEFAULT NULL;

COMMENT ON COLUMN jobs.years_experience_required IS
  'Minimum years of experience required for this job. NULL means no requirement.';

CREATE INDEX IF NOT EXISTS idx_jobs_years_experience ON jobs(years_experience_required)
WHERE years_experience_required IS NOT NULL;
```

### How to Apply

#### Option 1: Supabase Dashboard (Recommended for Production)

1. Go to [supabase.com](https://supabase.com) → Your Project → **SQL Editor**
2. Paste the SQL above
3. Click **Run**

#### Option 2: Supabase CLI

```bash
# If you have Supabase CLI linked to your project
npx supabase db push

# Or apply a specific migration
npx supabase migration up
```

#### Option 3: Direct Connection

```bash
# Connect via psql (get connection string from Supabase dashboard)
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Then run the SQL
```

### Verify Migration Applied

Run this query in Supabase SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name = 'years_experience_required';
```

If it returns a row, the migration was successful.

---

## Part 5: Environment Variables Checklist

Make sure these are set in Vercel (Settings → Environment Variables):

| Variable                       | Value                       | Required               |
| ------------------------------ | --------------------------- | ---------------------- |
| `RESEND_API_KEY`               | `re_xxxxxxxxxxxx`           | Yes                    |
| `RESEND_FROM_EMAIL`            | `noreply@krewup.net`        | Yes                    |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | (generate with web-push)    | For push notifications |
| `VAPID_PRIVATE_KEY`            | (generate with web-push)    | For push notifications |
| `VAPID_SUBJECT`                | `mailto:support@krewup.net` | For push notifications |

### Generate VAPID Keys (if needed)

```bash
npx web-push generate-vapid-keys
```

---

## Troubleshooting

### Emails Not Sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify domain is verified in Resend dashboard
3. Check Vercel function logs for errors

### Emails Going to Spam

1. Ensure SPF record is correct
2. Ensure DKIM is set up (resend.\_domainkey TXT record)
3. Use a proper "from" name: `KrewUp <noreply@krewup.net>`

### Support Emails Not Forwarding

1. Verify MX records are pointing to your forwarding service
2. Check forwarding rules in ImprovMX/your service
3. Check spam folder in destination inbox

### DNS Records Not Propagating

1. Use [dnschecker.org](https://dnschecker.org) to check propagation
2. Wait up to 48 hours (usually much faster)
3. Clear local DNS cache: `sudo dscacheutil -flushcache` (Mac)

---

## Quick Reference

| Service  | Purpose                | Dashboard                                                |
| -------- | ---------------------- | -------------------------------------------------------- |
| Resend   | Send emails            | [resend.com/emails](https://resend.com/emails)           |
| ImprovMX | Receive/forward emails | [improvmx.com](https://improvmx.com)                     |
| Vercel   | DNS & Hosting          | [vercel.com/dashboard](https://vercel.com/dashboard)     |
| Supabase | Database               | [supabase.com/dashboard](https://supabase.com/dashboard) |

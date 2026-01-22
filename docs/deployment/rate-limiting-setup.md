# Rate Limiting Setup Guide

This guide covers the deployment and configuration of KrewUp's distributed rate limiting system powered by Upstash Redis.

## 📋 Overview

KrewUp uses **distributed rate limiting** to protect against brute force attacks and API abuse. The system:

- **Production**: Uses Upstash Redis (required) for distributed rate limiting across serverless instances
- **Development**: Falls back to in-memory store for local development
- **Monitoring**: Integrates with Sentry for real-time alerting on misconfigurations and rate limit violations

## 🚨 Critical Security Note

**Redis is REQUIRED for production deployments.** Without Redis:
- Rate limits are not shared across serverless function instances
- Attackers can bypass limits by hitting different instances
- Authentication endpoints become vulnerable to brute force attacks

The application will **throw an error** and **alert Sentry** if deployed to production without Redis configuration.

## 🔧 Prerequisites

Before deploying, ensure you have:

1. **Upstash Account**: Sign up at [https://upstash.com](https://upstash.com)
2. **Vercel Account**: For production deployment (or your preferred hosting platform)
3. **Sentry Account**: For monitoring and alerting

## 📦 Step 1: Create Upstash Redis Database

### 1.1 Sign Up / Log In to Upstash

Visit [https://console.upstash.com](https://console.upstash.com) and log in to your account.

### 1.2 Create a New Redis Database

1. Click **"Create Database"**
2. Configure your database:
   - **Name**: `krewup-rate-limiting` (or your preferred name)
   - **Type**: Select **Regional** for better latency
   - **Region**: Choose the region closest to your Vercel deployment
     - US East (N. Virginia) - `us-east-1` if deploying to Vercel US East
     - EU West (Ireland) - `eu-west-1` if deploying to Vercel EU
   - **TLS**: Enable for secure connections (recommended)
   - **Eviction**: Select **No Eviction** (rate limiting manages its own expiration)

3. Click **"Create"**

### 1.3 Get Your Credentials

After creation, you'll see your database details page:

1. Locate the **REST API** section (not Redis SDK)
2. Copy the following credentials:
   - **UPSTASH_REDIS_REST_URL**: `https://your-region.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: `AXXXXXxxxxxxxxxxxxxxxxxxxxxxx`

⚠️ **Keep these credentials secure!** Never commit them to version control.

## 🔐 Step 2: Configure Environment Variables

### 2.1 Vercel Configuration

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `UPSTASH_REDIS_REST_URL` | Your Redis REST URL | Production, Preview |
| `UPSTASH_REDIS_REST_TOKEN` | Your Redis REST token | Production, Preview |

**Important**:
- Select **Production** and **Preview** environments for both variables
- You can optionally add them to **Development** if you want to test with real Redis locally

### 2.2 Local Development (Optional)

For local testing with Redis, create a `.env.local` file in your project root:

```bash
# Upstash Redis (optional for local development)
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXXxxxxxxxxxxxxxxxxxxxxxxx
```

**Note**: Redis is **optional** for local development. The system will automatically fall back to an in-memory store and log a warning.

### 2.3 Environment Detection

The rate limiting system detects production environments using:
- `NODE_ENV === 'production'` OR
- `VERCEL_ENV === 'production'`

When in production, Redis is **required**. When in development, the in-memory fallback is allowed.

## ✅ Step 3: Verify Configuration

### 3.1 Pre-Deployment Verification

Before deploying, verify your environment variables are set:

```bash
# In Vercel dashboard or CLI
vercel env ls
```

Ensure you see:
- ✅ `UPSTASH_REDIS_REST_URL` (Production, Preview)
- ✅ `UPSTASH_REDIS_REST_TOKEN` (Production, Preview)

### 3.2 Post-Deployment Verification

After deploying to production, verify rate limiting is working:

#### Test 1: Basic Rate Limiting

1. Navigate to your production URL login page
2. Attempt to login with invalid credentials **6 times** in quick succession
3. Expected result: After the 5th attempt, you should see:
   ```
   Too many attempts. Please try again in X seconds.
   ```

#### Test 2: Check Sentry Logs

1. Open your Sentry dashboard
2. Navigate to **Issues** or **Performance**
3. Look for rate limiting events with tags:
   - `rateLimiter: upstash` (confirms Redis is being used)
   - `action: auth:signIn` (or other action types)

✅ If you see `rateLimiter: upstash` → Redis is working correctly
❌ If you see `rateLimiter: memory` → Redis is NOT configured (production should fail)

#### Test 3: Verify No Errors in Logs

Check your Vercel deployment logs:

```bash
vercel logs [deployment-url]
```

You should **NOT** see any errors like:
```
Redis rate limiting is not configured in production
```

If you see this error, check:
1. Environment variables are set in Vercel
2. Variable names match exactly: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Values are correct (no extra spaces or quotes)

## 📊 Step 4: Monitoring & Alerts

### 4.1 Sentry Integration

Rate limiting automatically logs to Sentry:

**Fatal Alerts** (Production Misconfiguration):
- **When**: Redis is not configured in production
- **Level**: `fatal`
- **Tags**: `component: rate-limiter`, `rateLimiter: validation`

**Warning Alerts** (Rate Limits Exceeded):
- **When**: User/IP exceeds rate limit
- **Level**: `warning`
- **Tags**: `action: [action-type]`, `rateLimiter: upstash|memory`

### 4.2 Set Up Sentry Alerts

Configure Sentry to notify your team when rate limiting issues occur:

1. Go to **Sentry** → **Alerts** → **Create Alert**
2. Create two alert rules:

**Alert 1: Production Misconfiguration**
- **Condition**: Issue state changes to "unresolved" for issues with tag `rateLimiter:validation`
- **Action**: Send notification to Slack/email
- **Priority**: Critical (P0)

**Alert 2: High Rate Limit Violations**
- **Condition**: Number of events with tag `rateLimiter:upstash` and level `warning` > 100 in 5 minutes
- **Action**: Send notification to Slack/email
- **Priority**: Medium (P2)

### 4.3 Upstash Monitoring

Monitor your Redis usage in Upstash dashboard:

1. Go to **Upstash Console** → **Databases** → Select your database
2. Monitor:
   - **Request Count**: Number of rate limit checks
   - **Bandwidth**: Data transfer (should be minimal)
   - **Latency**: Response time (should be <50ms for regional)

## 🔄 Rate Limit Configurations

Current rate limits (defined in `lib/security/rate-limit.ts`):

| Action Type | Limit | Window | Use Case |
|-------------|-------|--------|----------|
| **auth** | 5 requests | 60 seconds | Login attempts (brute force protection) |
| **authSignup** | 3 requests | 60 seconds | Signup attempts per IP |
| **message** | 30 requests | 60 seconds | Direct messages |
| **upload** | 10 requests | 60 seconds | File/image uploads |
| **search** | 60 requests | 60 seconds | Search queries |
| **adminAction** | 20 requests | 60 seconds | Admin dashboard actions |

### Customizing Rate Limits

To modify rate limits, edit `lib/security/rate-limit.ts`:

```typescript
export const RATE_LIMITS = {
  auth: { limit: 5, windowSeconds: 60 }, // Adjust these values
  // ... other limits
} as const;
```

**Note**: Changes require redeployment to take effect.

## 🐛 Troubleshooting

### Issue 1: "Redis rate limiting is not configured in production" Error

**Symptoms**:
- Application fails to start in production
- Fatal error in Sentry logs

**Solution**:
1. Verify environment variables are set in Vercel:
   ```bash
   vercel env pull
   cat .env.local | grep UPSTASH
   ```
2. Check variable names are exactly: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Ensure variables are enabled for **Production** environment
4. Redeploy the application

### Issue 2: Rate Limiting Not Working (Users Can Exceed Limits)

**Symptoms**:
- Users can make more requests than configured limit
- Sentry shows `rateLimiter: memory` instead of `rateLimiter: upstash`

**Solution**:
1. Check Sentry logs for `rateLimiter` tag value
2. If showing `memory`:
   - Redis is falling back to in-memory store
   - Verify environment variables are correct
   - Check Upstash database is active (not paused)
3. Test Redis connection manually:
   ```bash
   curl https://your-upstash-url.upstash.io/ping \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   Expected response: `{"result":"PONG"}`

### Issue 3: High Latency on Rate-Limited Endpoints

**Symptoms**:
- Slow response times on login, signup, or other protected endpoints
- Upstash dashboard shows high latency (>100ms)

**Solution**:
1. Verify your Upstash region matches your Vercel deployment region
2. Consider upgrading Upstash plan for better performance
3. Check Upstash status page: [https://status.upstash.com](https://status.upstash.com)
4. Review Sentry performance monitoring for bottlenecks

### Issue 4: "Too Many Attempts" Error for Legitimate Users

**Symptoms**:
- Users report being rate-limited during normal usage
- False positives in rate limiting

**Solution**:
1. Review rate limit configurations (may be too strict)
2. Check if multiple users share the same IP (corporate networks)
3. Consider implementing user-based rate limiting for authenticated actions:
   ```typescript
   // Use user ID instead of IP for authenticated actions
   const userRateLimiter = createUserRateLimiter(user.id);
   await userRateLimiter('message:send', RATE_LIMITS.message);
   ```
4. Adjust rate limits in `lib/security/rate-limit.ts` if needed

### Issue 5: Development Mode Shows Redis Warnings

**Symptoms**:
- Console warning: "Redis not configured. Falling back to in-memory store."

**Solution**:
- This is **expected behavior** in development without Redis configured
- The warning is informational and can be ignored locally
- To suppress: Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.local`

## 📚 Additional Resources

### Documentation Links
- **Upstash Redis**: [https://upstash.com/docs/redis](https://upstash.com/docs/redis)
- **Upstash Ratelimit SDK**: [https://upstash.com/docs/redis/sdks/ratelimit-ts/overview](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- **Vercel Environment Variables**: [https://vercel.com/docs/projects/environment-variables](https://vercel.com/docs/projects/environment-variables)
- **Sentry Error Monitoring**: [https://docs.sentry.io/platforms/javascript/guides/nextjs/](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

### Code References
- **Rate Limiting Implementation**: `lib/security/rate-limit.ts`
- **Usage Examples**: Search codebase for `checkRateLimit` or `rateLimit` calls
- **Sentry Configuration**: `sentry.server.config.ts`, `sentry.client.config.ts`

### Support

If you encounter issues not covered in this guide:

1. Check Sentry logs for detailed error messages
2. Review Vercel deployment logs
3. Verify Upstash database status and configuration
4. Consult the [Upstash community](https://github.com/upstash/upstash-redis/discussions)

## ✅ Deployment Checklist

Use this checklist before deploying to production:

- [ ] **Upstash Redis database created** and active
- [ ] **Environment variables set** in Vercel:
  - [ ] `UPSTASH_REDIS_REST_URL`
  - [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] **Variables enabled** for Production and Preview environments
- [ ] **Sentry alerts configured** for rate limiting issues
- [ ] **Test deployment** to Preview environment first
- [ ] **Post-deployment verification** completed:
  - [ ] Rate limiting works (test with 6 login attempts)
  - [ ] Sentry shows `rateLimiter: upstash` tag
  - [ ] No errors in deployment logs
- [ ] **Team notified** of new rate limiting system
- [ ] **Documentation updated** if rate limits were customized

---

**Last Updated**: January 2026
**Maintained By**: KrewUp Engineering Team

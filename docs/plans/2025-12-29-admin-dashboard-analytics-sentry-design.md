# Admin Dashboard Enhancement: Analytics & Sentry Integration

**Date:** 2025-12-29
**Status:** Approved Design
**Drivers:** Visibility gap + Scaling operations

## Overview

Enhance the admin dashboard with comprehensive analytics and improved Sentry integration to address critical visibility gaps and enable operational scaling. Current dashboard provides basic metrics but lacks insights into user behavior, business performance, and operational efficiency.

## Primary Goals

1. **Visibility:** Understand user churn, conversion rates, and error patterns by user segment
2. **Operational Efficiency:** Scale admin operations with better workload management and predictive insights
3. **Data-Driven Decisions:** Enable informed decisions across growth, product, and revenue
4. **Proactive Monitoring:** Enhanced Sentry integration with custom context and alerting

## Current State

**Existing Capabilities:**
- Basic dashboard metrics (total users, active jobs, pending certifications, pro subscribers)
- Simple analytics (user growth chart, engagement totals)
- Sentry monitoring (error tracking, system health, error rate charts)
- User/certification/moderation management pages

**Gaps:**
- No retention, conversion funnel, or cohort analysis
- No operational workload trends or predictive metrics
- No user segmentation or filtering capabilities
- Limited Sentry context (no user role, subscription status tags)
- No alerting system for critical issues
- Static metrics without trend indicators or comparisons

## Design Approach

**Implementation Model:**
- Interactive real-time dashboard with flexible filtering
- Date range selection and time period comparisons
- User segmentation (role, subscription, location)
- Drill-down capabilities
- Skip automated reports for now

**Phased Rollout:**
Four phases over 8 weeks, prioritized by impact vs effort.

---

## Phase 1: Foundation & Quick Wins (Weeks 1-2)

**Goal:** Address most painful visibility gaps with minimal infrastructure work.

### Core Infrastructure

**Date Range Picker Component:**
- Presets: Last 7/30/90 days, custom range
- Comparison mode: Compare to previous period
- Reusable across all analytics pages

**Segmentation Filter Component:**
- Filter by: User role (worker/employer), subscription status (free/pro), location, employer_type
- Multi-select support
- Applied consistently across metrics

**Analytics Query Helpers:**
- Shared utilities for applying date/segment filters
- Consistent data fetching patterns
- Cache-aware with 5-15 min revalidation

### Critical Metrics Dashboard

**New Page:** `/admin/analytics/overview`

**User Activity Metrics:**
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- Trend indicators (↑5% vs previous period)
- Activity definition: Login, job post, application, message, profile update

**Conversion Funnel:**
- Stage 1: Signup
- Stage 2: Profile Complete (all required fields filled)
- Stage 3: First Action (job post OR job application)
- Show conversion rate at each stage
- Highlight biggest drop-off point
- Segment by user role

**Subscription Metrics:**
- Free vs Pro user counts with trends
- Conversion rate (Free → Pro)
- MRR (Monthly Recurring Revenue) trend chart
- Churn rate (Pro → Free or canceled)

**Operational Load Metrics:**
- Pending certifications: Count + 7-day trend chart
- Average time-to-review (certifications)
- Moderation queue backlog: Count + trend
- Average resolution time (moderation)

### Enhanced Sentry Integration

**User Context Enhancement:**
```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  role: user.role,                    // NEW
  subscription_status: user.subscription_status,  // NEW
  location: user.location,            // NEW
  employer_type: user.employer_type,  // NEW
});
```

**Feature Tags:**
```typescript
Sentry.setTags({
  page: '/dashboard/jobs',            // NEW
  feature: 'job-posting',             // NEW
  action: 'create-job',               // NEW
});
```

**Monitoring Dashboard Updates:**
- Group errors by user role
- Group errors by subscription tier
- Filter issues by custom tags
- Show patterns: "80% of errors from free users in CA"

### Deliverables
- Date range picker component
- Segment filter component
- Analytics overview page with 4 metric categories
- Enhanced Sentry context in auth middleware
- Updated monitoring dashboard with role/subscription filtering

---

## Phase 2: Deep Insights & User Behavior (Weeks 3-4)

**Goal:** Understand user patterns, retention, and product-market fit indicators.

### Retention Analytics

**Cohort Analysis:**
- Group users by signup week
- Track % who return after 1, 7, 14, 30 days
- Visualize as cohort table (rows = signup week, columns = days since signup)
- Segment by user role and subscription tier

**Retention Curves:**
- Line chart showing retention over time
- Compare: Workers vs Employers
- Compare: Free vs Pro users
- Industry benchmarks overlay (if available)

**Churn Analysis:**
- Identify inactivity threshold (e.g., 30 days no login)
- Calculate churn rate by cohort
- Pattern detection: "Users who don't complete profile within 3 days have 80% churn"
- Early warning indicators

### User Journey Analytics

**Time-to-Value Metrics:**

*Workers:*
1. Signup → Profile Complete
2. Profile Complete → First Application
3. First Application → First Interview Request
4. Track median time at each stage

*Employers:*
1. Signup → First Job Posted
2. First Job Posted → First Application Received
3. First Application → First Hire (if tracking)
4. Track median time at each stage

**Feature Adoption:**
- Certifications uploaded: % of users, trend over time
- Messages sent: Active messengers, message volume
- Pro features used: Which features drive engagement?
- Search usage: Search-to-action conversion

**Geographic Insights:**
- User distribution map (by state/city)
- Job posting density heatmap
- Certification verification rates by state
- Top locations by activity

### Business Intelligence

**Subscription Analytics:**

*Conversion Funnel:*
- Free signup → Pro trial started → Paid Pro subscriber
- Drop-off rates at each stage
- Identify optimization opportunities

*Upgrade Triggers:*
- Correlate actions with upgrades
- Example: "Users who post 3+ jobs convert at 45% vs 8% baseline"
- Identify power user behaviors
- A/B test pro feature visibility

*Lifetime Value (LTV):*
- Estimated LTV by user segment
- Retention × ARPU (Average Revenue Per User)
- Cohort-based LTV trends

**Job Market Health:**
- Jobs posted vs applications received ratio
  - Healthy marketplace: 5-10 applications per job
  - Track trend over time
- Average time-to-fill per job
- Application acceptance rate
- Top trades by activity (posting + applications)
- Top locations by marketplace balance

### Implementation Details

**Database:**
- Optional: `analytics_events` table for custom event tracking
  - Columns: id, user_id, event_type, event_data (jsonb), created_at
  - Indexed on: user_id, event_type, created_at
- Alternative: Query existing tables (jobs, job_applications, messages, profiles)

**Queries:**
- Cohort analysis: Complex SQL with date math and window functions
- Consider materialized views for expensive queries
- Refresh strategy: Daily aggregation for cohorts

**Charts:**
- Cohort table: Custom component or heatmap
- Retention curves: Line chart (Recharts)
- Geographic map: Simple state-level choropleth or list view
- Funnel visualization: Custom SVG or library

### Deliverables
- Retention analytics page with cohort analysis
- User journey dashboard with time-to-value metrics
- Geographic insights visualization
- Subscription intelligence dashboard
- Job market health metrics

---

## Phase 3: Operational Efficiency & Alerts (Weeks 5-6)

**Goal:** Scale admin operations with better tools, automation, and proactive monitoring.

### Enhanced Admin Workload Dashboard

**Queue Health Metrics:**

*Certification Verification:*
- Average wait time (submission → review)
- SLA compliance: % reviewed within 24h, 48h
- Reviewer performance leaderboard (reviews/day, avg time)
- Rejection rate trends
- Re-submission patterns

*Moderation:*
- Response time by severity level
- Escalation rate (dismissed → actioned)
- Resolution patterns (action types distribution)
- Repeat offenders tracking

*Support Metrics:*
- User-reported issues from Sentry feedback
- Common error patterns affecting users
- Issue resolution time

**Predictive Workload:**
- "Based on current trends, expect 47 certification submissions this week"
- Calculation: 7-day moving average × growth rate
- Peak activity heatmap: Day of week × hour of day
- Helps with admin staffing/scheduling

**Admin Activity Log:**

*New Table:* `admin_activity_logs`
```sql
CREATE TABLE admin_activity_logs (
  id UUID PRIMARY KEY,
  admin_user_id UUID REFERENCES profiles(id),
  action_type TEXT, -- 'certification_approved', 'user_suspended', etc.
  target_id UUID, -- ID of affected resource
  target_type TEXT, -- 'certification', 'user', 'content_report'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

*Features:*
- Track: Certification approvals/rejections, moderation actions, user suspensions/bans
- Audit trail for compliance
- Performance metrics per admin
- Review history for quality assurance

### Smart Alerting System

**New Table:** `dashboard_alerts`
```sql
CREATE TABLE dashboard_alerts (
  id UUID PRIMARY KEY,
  alert_type TEXT,
  severity TEXT, -- 'info', 'warning', 'critical'
  title TEXT,
  message TEXT,
  link TEXT, -- Deep link to relevant page
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Threshold Alerts:**

*Error Rate Spike:*
- Trigger: >50% increase vs 7-day average
- Severity: Warning (50-100%), Critical (>100%)
- Action: Link to monitoring dashboard filtered by time range

*New Critical Errors:*
- Trigger: New error affecting >10 users
- Severity: Critical
- Action: Link to Sentry issue permalink

*Certification Queue Backlog:*
- Trigger: >100 pending for >48 hours
- Severity: Warning
- Action: Link to certifications page with pending filter

*Subscription Churn Spike:*
- Trigger: >20% week-over-week increase
- Severity: Warning
- Action: Link to subscription analytics

*System Degradation:*
- Trigger: Sentry health status = critical
- Severity: Critical
- Action: Link to monitoring dashboard

**Dashboard Notifications Panel:**
- Real-time alert feed in admin layout header
- Badge count of unacknowledged alerts
- Dismissible notifications with acknowledge tracking
- Filter by severity
- Archive old alerts (auto-archive after 7 days acknowledged)

### Performance Monitoring Integration

**Enable Sentry Performance SDK:**

*Configuration:* `sentry.client.config.ts`
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ["localhost", /^https:\/\/krewup\.com/],
    }),
  ],
});
```

**Track Critical Endpoints:**
- API routes: Job creation, application submission, message sending
- Database queries: Profile fetch, job search, certification verification
- Page loads: Dashboard, job listings, profile pages

**Performance Dashboard:**

*Metrics:*
- P50/P95/P99 response times per endpoint
- Slowest queries (identify N+1 queries)
- Slowest pages
- Trends over time

*Alerts:*
- Endpoint response time >2s (P95)
- Database query >1s
- Page load >3s (P95)

### Deliverables
- Admin workload dashboard with queue health metrics
- Predictive workload forecasting
- Admin activity logging system
- Smart alerting infrastructure
- Dashboard notifications panel
- Sentry performance monitoring setup
- Performance metrics dashboard

---

## Phase 4: Advanced Features & Polish (Weeks 7-8)

**Goal:** Add power-user features and polish the experience.

### Advanced Filtering & Exploration

**Segment Builder:**
- UI for creating custom segments
- Example: "Pro users in CA who posted 5+ jobs in last 30 days"
- Save segments for reuse
- Share segments with team
- Segment preview: Count users matching criteria

**Multi-dimensional Filtering:**
- Apply multiple filters simultaneously
- Date range + User role + Subscription + Location
- Filter persistence in URL query params
- Clear all filters button

**Comparison Mode:**
- Side-by-side metric comparison
- Examples:
  - Workers vs Employers
  - Free vs Pro
  - CA vs TX
  - This month vs last month
- Visual diff highlighting

**Drill-down Capabilities:**
- Click any metric to see underlying data
- Example: Click "234 DAU" → Modal/page with list of 234 active users
- Show: User details, actions taken today, last activity
- Export user list to CSV

### Data Export & Sharing

**Export to CSV:**
- Any chart or table exportable
- Include filters in export metadata
- Filename: `krewup-analytics-{metric}-{date}.csv`

**Shareable Dashboard Links:**
- Generate read-only links with filters applied
- Use case: Share with investors/stakeholders
- Expire links after 30 days (optional)
- Track link views (optional)

**Chart Embeds:**
- Generate embed codes for charts
- Use case: Include in presentations, external docs
- Static snapshot or live-updating iframe

### Enhanced Visualizations

**Time Period Comparisons:**
- "This week vs last week"
- "This month vs last month"
- "This quarter vs same quarter last year"
- Show absolute difference + percentage change

**Trend Indicators:**
- Every metric shows:
  - Current value
  - Change % vs comparison period
  - Direction: ↑ (increase) or ↓ (decrease)
  - Color coding: Green (positive), Red (negative), Gray (neutral)
- Context-aware: Revenue ↑ = green, Churn ↑ = red

**Interactive Charts:**
- Hover: Show detailed tooltip with exact values
- Click: Apply filter based on clicked element
- Zoom: Pinch/drag to zoom date ranges
- Legend toggle: Hide/show series

**Dashboard Layouts:**
- Drag-and-drop widget arrangement
- Save preferred layouts per admin user
- Pre-built layouts: "Executive View", "Operations View", "Growth View"
- Reset to default option

### Additional Sentry Enhancements

**User Feedback Loop:**
- Enable Sentry User Feedback widget
- When user hits error: Optional feedback form
- Integrates with Sentry issue tracker
- Show user feedback in monitoring dashboard

**Release Tracking:**
- Tag errors with git commit SHA or version
- Configuration in `sentry.properties`
- Show error rates per release
- Identify which deployment introduced regression

**Custom Metrics in Sentry:**
- Track business metrics alongside errors
- Examples:
  - Certification verification rate
  - Application success rate
  - Job posting success rate
- Alert on metric degradation

**Enhanced Breadcrumbs:**
- Track user's path before error
- Pages visited (already tracked)
- Actions taken: "Clicked 'Post Job' button" → "Filled job form" → "Submitted form" → ERROR
- Custom breadcrumbs in key user flows

### Deliverables
- Segment builder UI
- Multi-dimensional filtering system
- Comparison mode UI
- Drill-down modals/pages
- CSV export functionality
- Shareable links system
- Enhanced chart interactions
- Customizable dashboard layouts
- Sentry user feedback integration
- Release tracking setup
- Custom Sentry metrics
- Enhanced breadcrumb tracking

---

## Technical Architecture

### Database Layer

**New Tables:**

1. `analytics_events` (optional - can query existing tables instead)
2. `admin_activity_logs` (required for audit trail)
3. `dashboard_alerts` (required for alerting system)
4. `saved_segments` (optional - for Phase 4 segment builder)
5. `dashboard_layouts` (optional - for Phase 4 custom layouts)

**Indexes:**
- `profiles(created_at, role, subscription_status)`
- `jobs(created_at, status, user_id)`
- `job_applications(created_at, status, user_id)`
- `certifications(created_at, verification_status)`
- `content_reports(created_at, status)`

**Materialized Views (for expensive queries):**
```sql
CREATE MATERIALIZED VIEW user_activity_daily AS
SELECT
  user_id,
  DATE(created_at) as activity_date,
  COUNT(*) as action_count
FROM (
  SELECT user_id, created_at FROM jobs
  UNION ALL
  SELECT user_id, created_at FROM job_applications
  UNION ALL
  SELECT user_id, created_at FROM messages
) activities
GROUP BY user_id, DATE(created_at);

-- Refresh daily via cron
REFRESH MATERIALIZED VIEW user_activity_daily;
```

### API Layer

**Expand:** `features/admin/actions/analytics-actions.ts`

**New Server Actions:**
- `getActiveUsers(dateRange, segment)` - DAU/WAU/MAU
- `getConversionFunnel(dateRange, segment)` - Signup → Profile → Action
- `getSubscriptionMetrics(dateRange)` - Free/Pro, MRR, churn
- `getOperationalLoad(dateRange)` - Queue metrics
- `getRetentionData(dateRange, segment)` - Cohort analysis
- `getCohortAnalysis(dateRange)` - Retention by signup week
- `getUserJourneyMetrics(dateRange, segment)` - Time-to-value
- `getGeographicInsights(dateRange)` - User/job distribution
- `getSubscriptionIntelligence(dateRange)` - LTV, upgrade triggers
- `getJobMarketHealth(dateRange)` - Supply/demand balance
- `getQueueHealthMetrics(dateRange)` - Admin workload
- `getAlerts()` - Active dashboard alerts
- `acknowledgeAlert(alertId)` - Mark alert as seen
- `createAlert(alertData)` - Programmatic alert creation

**Caching Strategy:**
- High-frequency metrics (DAU, alerts): 5 min revalidation
- Medium-frequency (retention, cohorts): 15 min revalidation
- Low-frequency (LTV, geographic): 1 hour revalidation
- Use Next.js `cache` and `revalidate` options

### UI Layer

**New Shared Components:**
- `<DateRangePicker>` - Date selection with presets
- `<SegmentFilter>` - User segmentation multi-select
- `<MetricCard>` - Metric display with trend indicator
- `<TrendChart>` - Line chart with comparison mode
- `<FunnelChart>` - Conversion funnel visualization
- `<CohortTable>` - Retention cohort heatmap
- `<AlertBanner>` - Notification display
- `<ExportButton>` - CSV export trigger
- `<ComparisonView>` - Side-by-side metrics

**Chart Library:**
- **Recharts** (recommended): Lightweight, React-native, good docs
- Alternative: Chart.js with react-chartjs-2

**Layout Updates:**
- Add `<AlertsPanel>` to admin layout header
- Persist alert count badge
- Responsive design for mobile admin access

### Sentry Integration

**Client-side Setup:** `sentry.client.config.ts`
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Feedback({
      colorScheme: 'light',
      showBranding: false,
    }),
  ],
});
```

**Auth Middleware:** Add context
```typescript
// middleware.ts or auth callback
if (user) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
    subscription_status: user.subscription_status,
    location: user.location,
    employer_type: user.employer_type,
  });

  Sentry.setTags({
    user_role: user.role,
    subscription_tier: user.subscription_status,
  });
}
```

**Feature Tags:** Add in relevant handlers
```typescript
// Before action
Sentry.setTag('feature', 'job-posting');
Sentry.setTag('action', 'create-job');

// After success
Sentry.addBreadcrumb({
  message: 'Job created successfully',
  level: 'info',
  data: { jobId: job.id },
});
```

**Performance Monitoring:**
- Auto-instrumenting: Page loads, API routes
- Custom transactions: Long-running operations
- Database query tracking: Add integration

**Release Tracking:**
```bash
# In CI/CD pipeline
sentry-cli releases new $RELEASE_VERSION
sentry-cli releases set-commits $RELEASE_VERSION --auto
sentry-cli releases finalize $RELEASE_VERSION
```

---

## Success Metrics

**Phase 1 Success:**
- Admin can see DAU/WAU/MAU trends
- Conversion funnel identifies drop-off points
- Operational queue trends show capacity needs
- Sentry errors grouped by user role/subscription

**Phase 2 Success:**
- Understand retention by cohort and user type
- Identify time-to-value bottlenecks
- Know which actions predict subscription upgrades
- See geographic concentration and gaps

**Phase 3 Success:**
- Predict certification queue volume 48h ahead
- Alerts notify of critical issues within 5 minutes
- Admin activity fully audited
- Slow API endpoints identified and optimized

**Phase 4 Success:**
- Custom segments saved and reused
- Stakeholder reports exported weekly
- Dashboard customized per admin role
- Release deployments tracked for error regressions

---

## Implementation Order Rationale

**Why Phase 1 First:**
- Addresses most painful visibility gaps immediately
- Low infrastructure overhead (mostly queries + UI)
- Sentry enhancement is quick win with high impact
- Validates analytics framework before building complex features

**Why Phase 2 Second:**
- Requires Phase 1's date/segment filtering infrastructure
- Retention/cohort queries complex, benefit from Phase 1 patterns
- User journey tracking needs established metrics baseline
- Business intelligence informs Phase 3 alerting thresholds

**Why Phase 3 Third:**
- Operational efficiency needs analytics context from Phase 1-2
- Alerting thresholds informed by Phase 2 baseline metrics
- Admin activity logs benefit from existing usage patterns
- Performance monitoring needs traffic to show meaningful data

**Why Phase 4 Last:**
- Polish features, not critical blockers
- Segment builder needs Phase 1-3 metrics to be useful
- Export/sharing valuable but not urgent
- Advanced visualizations enhance existing dashboards

---

## Risks & Mitigations

**Risk:** Complex queries slow down dashboard
- **Mitigation:** Use materialized views, aggressive caching, pagination

**Risk:** Sentry costs increase with performance monitoring
- **Mitigation:** 10% trace sample rate, monitor quota, upgrade plan if needed

**Risk:** Alert fatigue from too many notifications
- **Mitigation:** Conservative thresholds initially, tune based on feedback

**Risk:** Data inconsistencies between metrics
- **Mitigation:** Shared query helpers, consistent filter application, unit tests

**Risk:** Privacy concerns with detailed user tracking
- **Mitigation:** Aggregate data where possible, secure admin access, comply with privacy policies

**Risk:** Scope creep during implementation
- **Mitigation:** Strict phase boundaries, defer nice-to-haves to Phase 4

---

## Next Steps

1. **Review and approve this design**
2. **Create implementation plan** with detailed tasks per phase
3. **Set up development environment** (git worktree for isolated work)
4. **Begin Phase 1 implementation**
5. **Iterate based on feedback** after each phase

---

## Appendix: Metrics Definitions

**Active User:**
- Performed any action: Login, job post, application, message, profile update, search
- Measured daily (DAU), weekly (WAU), monthly (MAU)

**Churn:**
- User inactive for >30 days (configurable threshold)
- Subscription canceled or downgraded

**Conversion:**
- Signup → Profile Complete: All required fields filled
- Profile Complete → First Action: Job post OR job application submitted
- Free → Pro: Active Pro subscription (trial or paid)

**Time-to-Value:**
- Median time from signup to first meaningful action
- Workers: First application submitted
- Employers: First job posted

**Retention:**
- % of users from a cohort who return after N days
- Measured at 1, 7, 14, 30 days

**MRR (Monthly Recurring Revenue):**
- Sum of all active Pro subscriptions × monthly price
- Excludes one-time charges

**LTV (Lifetime Value):**
- Estimated total revenue from a user over their lifetime
- Calculation: Avg. subscription length × ARPU

**Queue SLA:**
- Certification verification: 80% reviewed within 24h, 95% within 48h
- Content moderation: 90% reviewed within 12h for high-severity

---

**End of Design Document**

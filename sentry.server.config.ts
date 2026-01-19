// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sanitizeUserId, sanitizeEmail, sanitizeMetadata } from "@/lib/utils/logger";

const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "https://ad6e07c9bc730e345b8354905beba907@o4509613448757248.ingest.us.sentry.io/4510613324365824",
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1,
  // Set sampling rate for profiling - this is evaluated only once per SDK.init call
  profileSessionSampleRate: 1.0,
  // Trace lifecycle automatically enables profiling during active traces
  profileLifecycle: 'trace',

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // * Disable sending user PII (Personally Identifiable Information)
  // * We sanitize user data manually in beforeSend hook for GDPR/CCPA compliance
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  beforeSend(event) {
    try {
      // * Sanitize user context if present
      if (event.user) {
        if (event.user.id) {
          event.user.id = sanitizeUserId(event.user.id as string);
        }
        if (event.user.email) {
          event.user.email = sanitizeEmail(event.user.email);
        }
        // Remove other potentially sensitive user fields
        delete event.user.username;
        delete event.user.ip_address;
      }

      // * Sanitize extra context data
      if (event.extra && typeof event.extra === 'object') {
        event.extra = sanitizeMetadata(event.extra as Record<string, unknown>);
      }

      // * Sanitize contexts (may contain user data)
      if (event.contexts) {
        for (const [key, context] of Object.entries(event.contexts)) {
          if (context && typeof context === 'object') {
            event.contexts[key] = sanitizeMetadata(context as Record<string, unknown>);
          }
        }
      }

      // * Sanitize breadcrumbs (may contain user IDs in data)
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data && typeof breadcrumb.data === 'object') {
            return {
              ...breadcrumb,
              data: sanitizeMetadata(breadcrumb.data as Record<string, unknown>),
            };
          }
          return breadcrumb;
        });
      }
    } catch (error) {
      // ! Silently fail if sanitization fails - better to send event than drop it
      console.warn('Failed to sanitize Sentry event:', error);
    }

    return event;
  },
});

Sentry.startSpan({
  name: "My Span",
}, () => {
  // The code executed here will be profiled
});

Sentry.metrics.count('user_action', 1);
Sentry.metrics.distribution('api_response_time', 150);

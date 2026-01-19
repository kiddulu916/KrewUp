import * as Sentry from '@sentry/nextjs';
import { sanitizeUserId, sanitizeEmail, sanitizeMetadata } from '@/lib/utils/logger';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // * Disable sending user PII (Personally Identifiable Information)
  // * We sanitize user data manually in beforeSend hook for GDPR/CCPA compliance
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  beforeSend(event, hint) {
    try {
      // * Add user context from Supabase auth
      if (typeof window !== 'undefined') {
        try {
          // * Dynamically find the Supabase auth token key (format: sb-{projectId}-auth-token)
          const supabaseAuthKey = Object.keys(localStorage).find((key) =>
            key.match(/^sb-[a-z0-9]+-auth-token$/)
          );

          if (supabaseAuthKey) {
            const authData = localStorage.getItem(supabaseAuthKey);
            if (authData) {
              const parsed = JSON.parse(authData);
              if (parsed?.user) {
                event.user = {
                  id: parsed.user.id,
                  email: parsed.user.email,
                };
              }
            }
          }
        } catch (error) {
          // ! Silently fail if we can't get user context
          console.warn('Failed to add user context to Sentry event:', error);
        }
      }

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

Sentry.metrics.count('user_action', 1);
Sentry.metrics.distribution('api_response_time', 150);

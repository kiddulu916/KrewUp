# Push Notifications Setup

This guide explains how to configure Web Push notifications for KrewUp.

## Overview

KrewUp uses the Web Push API to send push notifications to users. This requires:
1. VAPID keys for authentication
2. Service worker for handling notifications
3. User permission to receive notifications

## Generating VAPID Keys

You need to generate VAPID (Voluntary Application Server Identification) keys once per project.

### Using web-push CLI

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

This will output something like:
```
=======================================
Public Key:
BHCqJkPL...

Private Key:
5N8gJh3K...
=======================================
```

## Environment Variables

Add these to your `.env.local` and Vercel environment variables:

```bash
# VAPID Public Key (safe to expose to client)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BHCqJkPL...

# VAPID Private Key (server-only, keep secret!)
VAPID_PRIVATE_KEY=5N8gJh3K...

# Contact email for push service
VAPID_SUBJECT=mailto:support@krewup.net
```

## Files Created

The following files implement push notifications:

### Server-side
- `features/notifications/actions/push-subscription-actions.ts` - Server actions for managing subscriptions and sending notifications
- `supabase/migrations/13-push_subscriptions.sql` - Database table for storing push subscriptions

### Client-side
- `public/sw.js` - Service worker for handling push events
- `features/notifications/hooks/use-push-notifications.ts` - React hook for subscribing/unsubscribing
- `features/notifications/components/push-notification-toggle.tsx` - UI component for enabling notifications

## Database Schema

```sql
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## Usage

### Enabling Push Notifications (Client)

```tsx
import { PushNotificationToggle } from '@/features/notifications/components/push-notification-toggle';

function SettingsPage() {
  return (
    <div>
      <h2>Notification Settings</h2>
      <PushNotificationToggle />
    </div>
  );
}
```

### Using the Hook Directly

```tsx
import { usePushNotifications } from '@/features/notifications/hooks/use-push-notifications';

function Component() {
  const { subscribe, unsubscribe, isSubscribed, permission } = usePushNotifications();

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      console.log('Push notifications enabled!');
    }
  };

  return (
    <button onClick={handleEnable} disabled={isSubscribed}>
      {isSubscribed ? 'Notifications Enabled' : 'Enable Notifications'}
    </button>
  );
}
```

### Sending Push Notifications (Server)

```typescript
import { sendPushNotification } from '@/features/notifications/actions/push-subscription-actions';

// In a server action, API route, or cron job
await sendPushNotification(userId, {
  title: 'New Job Match!',
  body: 'A new electrician job was posted near you',
  url: '/dashboard/jobs/123',
  tag: 'job-match',
});
```

## Integration Points

Push notifications should be sent when:

1. **Proximity Alerts** - New jobs matching user's criteria
   - Location: `app/api/cron/check-proximity-alerts/route.ts`

2. **New Messages** - When receiving a direct message
   - Location: `features/messaging/actions/message-actions.ts`

3. **Application Status Changes** - When job application status changes
   - Location: `features/applications/actions/application-actions.ts`

4. **New Applications** (Employers) - When someone applies to a job
   - Location: `features/applications/actions/application-actions.ts`

5. **Profile Views** (Pro Workers) - When profile is viewed
   - Location: `features/subscriptions/actions/profile-views-actions.ts`

## Testing

### Local Testing

1. Run `npm run dev`
2. Open browser DevTools > Application > Service Workers
3. Verify `sw.js` is registered
4. Enable notifications in the app
5. Use the "Push" button in DevTools to send test notifications

### Using Supabase Edge Functions

For production, you can create a Supabase Edge Function to send notifications:

```typescript
// supabase/functions/send-push/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as webpush from 'npm:web-push';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

serve(async (req) => {
  // Handle push notification logic
});
```

## Browser Support

Web Push is supported in:
- Chrome 50+
- Firefox 44+
- Edge 17+
- Safari 16+ (macOS Ventura and iOS 16.4+)

Not supported in:
- Internet Explorer
- Older Safari versions

## Troubleshooting

### "Push notifications not supported"
- User is on an unsupported browser
- Site is not served over HTTPS (required except localhost)

### "Notifications blocked"
- User has blocked notifications for the site
- They need to update browser settings to allow notifications

### Notifications not appearing
- Check service worker is registered in DevTools
- Verify VAPID keys are configured correctly
- Check browser notification settings
- Ensure user has granted permission

### Subscriptions expiring
- The service worker handles re-subscription automatically
- Expired subscriptions are cleaned up when sending fails

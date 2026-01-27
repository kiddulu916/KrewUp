import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { logger, sanitizeUserId } from '@/lib/utils/logger';

// Create Supabase admin client for webhook (server-side, bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// * Webhook processing timeout (30 seconds)
const WEBHOOK_TIMEOUT_MS = 30000;

/**
 * Log webhook event for auditing
 */
async function logWebhookEvent(
  eventId: string,
  eventType: string,
  status: 'received' | 'processed' | 'failed' | 'timeout',
  metadata?: Record<string, unknown>
) {
  try {
    await supabaseAdmin.from('webhook_logs').insert({
      event_id: eventId,
      event_type: eventType,
      status,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // ! Don't fail webhook if logging fails, just log to structured logger
    logger.error('Failed to log webhook event', {
      eventId,
      eventType,
      status,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Stripe webhook handler
 * 
 * * Security features:
 * - Signature verification (Stripe signature)
 * - Idempotency check (prevents duplicate processing)
 * - Timeout handling (30 second limit)
 * - Audit logging (logs all webhook events)
 * - Error reporting to Sentry
 * 
 * Note: This route is not functional in static export builds (mobile).
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let eventId = 'unknown';
  let eventType = 'unknown';

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  // ! Security: Reject requests without signature
  if (!signature) {
    Sentry.captureMessage('Stripe webhook received without signature', {
      level: 'warning',
      extra: { ip: headersList.get('x-forwarded-for') },
    });
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    eventId = event.id;
    eventType = event.type;
  } catch (err) {
    // ! Security: Log signature verification failures (potential attack)
    Sentry.captureException(err, {
      tags: { webhook: 'stripe', error_type: 'signature_verification' },
      extra: {
        ip: headersList.get('x-forwarded-for'),
        userAgent: headersList.get('user-agent'),
      },
    });
    logger.error('Webhook signature verification failed', {
      error: err instanceof Error ? err.message : String(err),
      ip: headersList.get('x-forwarded-for') || 'unknown',
      userAgent: headersList.get('user-agent') || 'unknown',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // * Log webhook received
  await logWebhookEvent(eventId, eventType, 'received');

  // Idempotency check: Return 200 if event already processed
  const { data: existingEvent } = await supabaseAdmin
    .from('stripe_processed_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();

  if (existingEvent) {
    logger.info('Event already processed, skipping', { eventId: event.id, eventType: event.type });
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (!userId) {
          logger.error('No user_id in session metadata', {
            sessionId: session.id,
            customerId: session.customer as string,
          });
          return NextResponse.json({ error: 'Missing user_id in session metadata' }, { status: 500 });
        }

        // Get subscription details
        const subscriptionId = session.subscription as string;
        const subscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;

        // Determine plan_type based on price ID
        let planType: 'monthly' | 'annual';
        if (priceId === process.env.STRIPE_PRICE_ID_PRO_MONTHLY) {
          planType = 'monthly';
        } else if (priceId === process.env.STRIPE_PRICE_ID_PRO_ANNUAL) {
          planType = 'annual';
        } else {
          logger.error('Unknown price ID', {
            priceId,
            subscriptionId,
            userId: sanitizeUserId(userId),
          });
          return NextResponse.json({ error: 'Unknown price ID' }, { status: 500 });
        }

        // Safely convert Unix timestamps (seconds) to ISO strings
        // In Stripe v20, current_period_start/end are on SubscriptionItem, not Subscription
        const subscriptionItem = subscription.items.data[0];
        const periodStart = subscriptionItem?.current_period_start
          ? new Date(subscriptionItem.current_period_start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = subscriptionItem?.current_period_end
          ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days

        const { error } = await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          status: 'active',
          plan_type: planType,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        });

        if (error) {
          logger.error('Database error upserting subscription', {
            userId: sanitizeUserId(userId),
            subscriptionId,
            error: error.message,
          });
          return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
        }

        // Track in history
        await supabaseAdmin.from('subscription_history').insert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          event_type: 'subscription_created',
          status: 'active',
          plan_type: planType,
          metadata: {
            checkout_session_id: session.id,
          },
        });

        // Update profiles.subscription_status to 'pro' and activate profile boost
        const { data: profile } = await supabaseAdmin
          .from('users')
          .select('role, is_lifetime_pro')
          .eq('id', userId)
          .single();

        // Protect lifetime Pro users - they already have Pro access
        if (profile?.is_lifetime_pro) {
          logger.info('User has lifetime Pro - skipping subscription_status update', {
            userId: sanitizeUserId(userId),
          });
        } else {
          // Update subscription status on users table
          const { error: profileError } = await supabaseAdmin
            .from('users')
            .update({ subscription_status: 'pro' })
            .eq('id', userId);

          if (profileError) {
            logger.error('Database error updating profile subscription status', {
              userId: sanitizeUserId(userId),
              error: profileError.message,
            });
            // Don't fail the webhook for this, just log the error
          }

          // Set profile boost on workers table (only for workers)
          // * Profile boost is continuous for the entire Pro subscription duration
          if (profile?.role === 'worker') {
            const { error: workerError } = await supabaseAdmin
              .from('workers')
              .update({
                is_profile_boosted: true,
                boost_expires_at: null, // * No expiration - boost lasts entire subscription
              })
              .eq('user_id', userId);

            if (workerError) {
              logger.error('Database error updating worker boost', {
                userId: sanitizeUserId(userId),
                error: workerError.message,
              });
            }
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: existingSubscription, error: fetchError } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (fetchError || !existingSubscription) {
          logger.error('No subscription found for customer', {
            customerId,
            subscriptionId: subscription.id,
            error: fetchError?.message || 'Subscription not found',
          });
          return NextResponse.json({ error: 'Subscription not found' }, { status: 500 });
        }

        const priceId = subscription.items.data[0]?.price.id;

        // Determine plan_type based on price ID
        let planType: 'monthly' | 'annual';
        if (priceId === process.env.STRIPE_PRICE_ID_PRO_MONTHLY) {
          planType = 'monthly';
        } else if (priceId === process.env.STRIPE_PRICE_ID_PRO_ANNUAL) {
          planType = 'annual';
        } else {
          logger.error('Unknown price ID', {
            priceId,
            subscriptionId: subscription.id,
            customerId,
          });
          return NextResponse.json({ error: 'Unknown price ID' }, { status: 500 });
        }

        // Safely convert Unix timestamps (seconds) to ISO strings
        // In Stripe v20, current_period_start/end are on SubscriptionItem, not Subscription
        const subscriptionItem2 = subscription.items.data[0];
        const periodStart = subscriptionItem2?.current_period_start
          ? new Date(subscriptionItem2.current_period_start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = subscriptionItem2?.current_period_end
          ? new Date(subscriptionItem2.current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Map Stripe subscription status to our database status
        const dbStatus = subscription.status === 'active' ? 'active' : 
                        subscription.status === 'past_due' ? 'past_due' :
                        subscription.status === 'canceled' ? 'canceled' :
                        subscription.status === 'unpaid' ? 'past_due' : 'active';

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            status: dbStatus,
            plan_type: planType,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          })
          .eq('user_id', existingSubscription.user_id);

        if (updateError) {
          logger.error('Database error updating subscription', {
            userId: sanitizeUserId(existingSubscription.user_id),
            subscriptionId: subscription.id,
            error: updateError.message,
          });
          return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
        }

        // Track in history
        await supabaseAdmin.from('subscription_history').insert({
          user_id: existingSubscription.user_id,
          stripe_subscription_id: subscription.id,
          event_type: 'subscription_updated',
          status: subscription.status,
          plan_type: planType,
          metadata: {
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
        });

        // Ensure profile boost is active if subscription is active (for workers)
        // * Profile boost is continuous - no expiration while subscription active
        if (subscription.status === 'active') {
          const { data: profile } = await supabaseAdmin
            .from('users')
            .select('role, is_lifetime_pro')
            .eq('id', existingSubscription.user_id)
            .single();

          // Protect lifetime Pro users - don't modify their status
          if (profile?.is_lifetime_pro) {
            logger.info('User has lifetime Pro - skipping subscription renewal updates', {
              userId: sanitizeUserId(existingSubscription.user_id),
            });
          } else if (profile?.role === 'worker') {
            // Update workers table - ensure boost is active (continuous while subscribed)
            await supabaseAdmin
              .from('workers')
              .update({
                is_profile_boosted: true,
                boost_expires_at: null, // * No expiration - boost lasts entire subscription
              })
              .eq('user_id', existingSubscription.user_id);
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: existingSubscription, error: fetchError } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (fetchError || !existingSubscription) {
          logger.error('No subscription found for customer', {
            customerId,
            subscriptionId: subscription.id,
            error: fetchError?.message || 'Subscription not found',
          });
          return NextResponse.json({ error: 'Subscription not found' }, { status: 500 });
        }

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
          })
          .eq('user_id', existingSubscription.user_id);

        if (updateError) {
          logger.error('Database error updating subscription', {
            userId: sanitizeUserId(existingSubscription.user_id),
            subscriptionId: subscription.id,
            error: updateError.message,
          });
          return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
        }

        // Track in history
        await supabaseAdmin.from('subscription_history').insert({
          user_id: existingSubscription.user_id,
          stripe_subscription_id: subscription.id,
          event_type: 'subscription_canceled',
          status: 'canceled',
          metadata: {
            deleted_at: new Date().toISOString(),
          },
        });

        // Update profiles.subscription_status back to 'free' and remove profile boost
        // BUT protect lifetime Pro users - they keep Pro access even after canceling
        const { data: profile } = await supabaseAdmin
          .from('users')
          .select('is_lifetime_pro')
          .eq('id', existingSubscription.user_id)
          .single();

        if (profile?.is_lifetime_pro) {
          logger.info('User has lifetime Pro - keeping Pro access despite cancellation', {
            userId: sanitizeUserId(existingSubscription.user_id),
          });
        } else {
          // Update subscription status on users table
          const { error: profileError } = await supabaseAdmin
            .from('users')
            .update({ subscription_status: 'free' })
            .eq('id', existingSubscription.user_id);

          if (profileError) {
            logger.error('Database error updating profile subscription status', {
              userId: sanitizeUserId(existingSubscription.user_id),
              error: profileError.message,
            });
            // Don't fail the webhook for this, just log the error
          }

          // Remove profile boost on workers table
          const { error: workerError } = await supabaseAdmin
            .from('workers')
            .update({
              is_profile_boosted: false,
              boost_expires_at: null,
            })
            .eq('user_id', existingSubscription.user_id);

          if (workerError) {
            logger.error('Database error removing worker boost', {
              userId: sanitizeUserId(existingSubscription.user_id),
              error: workerError.message,
            });
          }
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: existingSubscription, error: fetchError } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (fetchError || !existingSubscription) {
          logger.error('No subscription found for customer', {
            customerId,
            invoiceId: invoice.id,
            error: fetchError?.message || 'Subscription not found',
          });
          return NextResponse.json({ error: 'Subscription not found' }, { status: 500 });
        }

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('user_id', existingSubscription.user_id);

        if (updateError) {
          logger.error('Database error updating subscription', {
            userId: sanitizeUserId(existingSubscription.user_id),
            invoiceId: invoice.id,
            error: updateError.message,
          });
          return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
        }

        // Track in history
        // In Stripe v20, subscription is accessed via parent.subscription_details
        const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
        const invoiceSubscriptionId = typeof invoiceSubscription === 'string'
          ? invoiceSubscription
          : invoiceSubscription?.id || null;

        if (invoiceSubscriptionId) {
          await supabaseAdmin.from('subscription_history').insert({
            user_id: existingSubscription.user_id,
            stripe_subscription_id: invoiceSubscriptionId,
            event_type: 'payment_failed',
            status: 'past_due',
            metadata: {
              invoice_id: invoice.id,
              amount_due: invoice.amount_due / 100,
            },
          });
        }

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // In Stripe v20, subscription is accessed via parent.subscription_details
        const invoiceSubscription2 = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof invoiceSubscription2 === 'string'
          ? invoiceSubscription2
          : invoiceSubscription2?.id || null;

        // Skip if not a subscription payment (e.g. one-off invoice)
        if (!subscriptionId) break;

        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, plan_type')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (existingSubscription) {
          await supabaseAdmin.from('subscription_history').insert({
            user_id: existingSubscription.user_id,
            stripe_subscription_id: subscriptionId,
            event_type: 'payment_succeeded',
            status: 'active',
            plan_type: existingSubscription.plan_type,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            metadata: {
              invoice_id: invoice.id,
              billing_reason: invoice.billing_reason,
            },
          });
        }
        break;
      }

      default:
        logger.info('Unhandled event type', { eventType: event.type, eventId: event.id });
    }

    // Mark event as processed for idempotency
    await supabaseAdmin
      .from('stripe_processed_events')
      .insert({
        id: event.id,
        type: event.type,
      });

    // * Check for timeout
    const processingTime = Date.now() - startTime;
    if (processingTime > WEBHOOK_TIMEOUT_MS) {
      Sentry.captureMessage('Stripe webhook processing exceeded timeout', {
        level: 'warning',
        tags: { webhook: 'stripe', event_type: eventType },
        extra: { eventId, processingTimeMs: processingTime },
      });
      await logWebhookEvent(eventId, eventType, 'timeout', { processingTimeMs: processingTime });
    } else {
      await logWebhookEvent(eventId, eventType, 'processed', { processingTimeMs: processingTime });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // ! Log error to Sentry with full context
    Sentry.captureException(err, {
      tags: { webhook: 'stripe', event_type: eventType },
      extra: {
        eventId,
        processingTimeMs: Date.now() - startTime,
      },
    });
    logger.error('Webhook handler error', {
      eventId,
      eventType,
      processingTimeMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
    });

    // * Log failed webhook
    await logWebhookEvent(eventId, eventType, 'failed', { error: String(err) });
    
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * Ad Configuration
 *
 * Central configuration for ad monetization.
 * Set NEXT_PUBLIC_ADS_ENABLED=true and real AdSense values in .env.local to enable ads.
 *
 * Inventory value policy (Google AdSense): Ads are only placed on content-focused pages
 * (feed, job list, profile view). Do not place ads on dead-end or no-content screens
 * (e.g. Thank You, Login, Exit, Error). Do not use on auto-generated content without
 * manual review. See: https://support.google.com/adsense/answer/9274019
 */

import type { AdConfig, AdPlacement } from './types';

/** Placeholder client ID; treat as not configured so scripts are not loaded. */
const ADSENSE_PLACEHOLDER_CLIENT = 'ca-pub-XXXXXXX';

function rawClientId(): string {
  return (process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '').trim();
}

/** True when a real AdSense publisher ID is set (format ca-pub-NNNNNNNNNNNNNNNNN). */
export function isAdSenseClientIdConfigured(): boolean {
  const id = rawClientId();
  if (!id) return false;
  if (id === ADSENSE_PLACEHOLDER_CLIENT) return false;
  return /^ca-pub-\d{16}$/.test(id);
}

// Default ad configuration
export const adConfig: AdConfig = {
  provider: (process.env.NEXT_PUBLIC_AD_PROVIDER as AdConfig['provider']) || 'adsense',
  enabled: process.env.NEXT_PUBLIC_ADS_ENABLED === 'true',

  // Google AdSense: use real ca-pub-XXXXXXXXXXXXXXXX from AdSense console
  adsenseClientId: isAdSenseClientIdConfigured() ? rawClientId() : '',
  adsenseSlots: {
    'job-feed-banner': process.env.NEXT_PUBLIC_ADSENSE_SLOT_JOB_BANNER || '',
    'job-feed-in-feed': process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_FEED || '',
    'profile-sidebar': process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || '',
    'search-results': process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH || '',
    'messages-sidebar': process.env.NEXT_PUBLIC_ADSENSE_SLOT_MESSAGES || '',
    'dashboard-footer': process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER || '',
  },

  // Show in-feed ad every 5 items
  inFeedFrequency: 5,

  // Block certain ad categories (gambling, adult, etc.)
  blockedCategories: [
    'adult',
    'gambling',
    'alcohol',
    'tobacco',
    'weapons',
    'politics',
  ],
};

/**
 * Check if ads should be shown for a user
 * Pro users don't see ads, free users do
 */
export function shouldShowAds(subscriptionStatus?: string, isLifetimePro?: boolean): boolean {
  // Ads disabled globally
  if (!adConfig.enabled) return false;
  
  // Pro users don't see ads
  if (subscriptionStatus === 'pro' || isLifetimePro) return false;
  
  return true;
}

/** Slot placeholder; treated as not configured. */
const ADSENSE_PLACEHOLDER_SLOT = 'XXXXXXX';

/**
 * Get ad slot ID for a placement. Returns undefined when AdSense is not configured
 * or the slot is unset/placeholder.
 */
export function getAdSlotId(placement: AdPlacement): string | undefined {
  if (adConfig.provider !== 'adsense') return undefined;
  const slot = adConfig.adsenseSlots?.[placement]?.trim();
  if (!slot || slot === ADSENSE_PLACEHOLDER_SLOT) return undefined;
  return slot;
}


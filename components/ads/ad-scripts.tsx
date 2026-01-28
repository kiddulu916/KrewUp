'use client';

import { adConfig, isAdSenseClientIdConfigured } from '@/lib/ads/config';
import { getConsentStatus } from '@/lib/ads/consent';
import { useEffect } from 'react';

/**
 * AdScripts Component
 *
 * Updates Google Consent Mode when consent is known. Consent default and AdSense
 * script are loaded in the root layout (beforeInteractive). Included once in the layout.
 */
export function AdScripts() {
  useEffect(() => {
    if (!adConfig.enabled || adConfig.provider !== 'adsense') return;
    if (!isAdSenseClientIdConfigured() || !adConfig.adsenseClientId) return;

    const consent = getConsentStatus();
    const granted = consent?.personalized ?? false;
    const gtag = typeof window !== 'undefined' ? (window as { gtag?: (cmd: string, arg: string, opts: Record<string, string>) => void }).gtag : undefined;
    if (gtag) {
      gtag('consent', 'update', {
        ad_storage: granted ? 'granted' : 'denied',
        ad_user_data: granted ? 'granted' : 'denied',
        ad_personalization: granted ? 'granted' : 'denied',
        analytics_storage: granted ? 'granted' : 'denied',
      });
    }
  }, []);

  return null;
}


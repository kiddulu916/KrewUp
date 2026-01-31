'use client';

import { useEffect, useRef } from 'react';
import { updateProfileLocation } from '@/features/profiles/actions/profile-actions';
import { useCsrfToken } from '@/components/providers/csrf-provider';

/**
 * Component that captures user's location on first dashboard visit
 * Only runs once after onboarding completion
 */
export function InitialLocationCapture() {
  const hasRequestedRef = useRef(false);
  const csrfToken = useCsrfToken();

  useEffect(() => {
    // Only run once
    if (hasRequestedRef.current) return;

    // Check if we've already captured initial location
    const locationCaptured = localStorage.getItem('initial_location_captured');
    if (locationCaptured) return;

    // Request location permission
    if ('geolocation' in navigator) {
      hasRequestedRef.current = true;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Update profile with location
            const result = await updateProfileLocation({
              coords: {
                lat: latitude,
                lng: longitude,
              },
              location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              csrfToken: csrfToken || '',
            });

            if (result.success) {
              // Mark as captured so we don't ask again
              localStorage.setItem('initial_location_captured', 'true');
            }
          } catch {
            // Silent fail - location capture is non-critical
          }
        },
        () => {
          // User denied or error occurred
          // Still mark as captured so we don't keep asking
          localStorage.setItem('initial_location_captured', 'true');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, [csrfToken]);

  // This component doesn't render anything
  return null;
}

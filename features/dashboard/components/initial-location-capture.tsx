'use client';

import { useEffect, useRef } from 'react';
import { updateProfileLocation } from '@/features/profiles/actions/profile-actions';
import { useCsrfToken } from '@/components/providers/csrf-provider';

const COORD_PATTERN = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;

function looksLikeCoordinates(location: string | null | undefined): boolean {
  if (!location) return false;
  return COORD_PATTERN.test(location.trim());
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
    return data.results[0].formatted_address;
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

type InitialLocationCaptureProps = {
  currentLocation?: string | null;
};

/**
 * Component that captures user's location on first dashboard visit.
 * Also re-geocodes existing coordinate-formatted locations to human-readable addresses.
 */
export function InitialLocationCapture({ currentLocation }: InitialLocationCaptureProps) {
  const hasRequestedRef = useRef(false);
  const csrfToken = useCsrfToken();

  useEffect(() => {
    if (hasRequestedRef.current) return;

    const locationCaptured = localStorage.getItem('initial_location_captured');
    const needsGeocode = !locationCaptured || looksLikeCoordinates(currentLocation);
    if (!needsGeocode) return;

    if (!('geolocation' in navigator)) return;

    hasRequestedRef.current = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const address = await reverseGeocode(latitude, longitude);
          const result = await updateProfileLocation({
            coords: { lat: latitude, lng: longitude },
            location: address,
            csrfToken: csrfToken || '',
          });
          if (result.success) {
            localStorage.setItem('initial_location_captured', 'true');
          }
        } catch {
          // Silent fail - location capture is non-critical
        }
      },
      () => {
        localStorage.setItem('initial_location_captured', 'true');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [csrfToken, currentLocation]);

  return null;
}

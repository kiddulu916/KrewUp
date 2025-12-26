'use client';

import { useTrackProfileView } from '../hooks/use-track-profile-view';

type ProfileViewTrackerProps = {
  profileId: string;
};

/**
 * Client component wrapper for tracking profile views
 * Use this in server components to enable view tracking
 */
export function ProfileViewTracker({ profileId }: ProfileViewTrackerProps) {
  useTrackProfileView(profileId);
  return null; // This component doesn't render anything
}

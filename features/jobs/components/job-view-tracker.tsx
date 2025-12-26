'use client';

import { useTrackJobView } from '../hooks/use-track-job-view';

type JobViewTrackerProps = {
  jobId: string;
};

/**
 * Client component wrapper for tracking job views
 * Use this in server components to enable view tracking
 */
export function JobViewTracker({ jobId }: JobViewTrackerProps) {
  useTrackJobView(jobId);
  return null; // This component doesn't render anything
}

// features/jobs/hooks/use-track-job-view.ts
'use client';

import { useEffect, useRef } from 'react';
import { trackJobView } from '../actions/job-analytics-actions';

/**
 * Generate a unique session ID for view tracking
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get or create session ID from sessionStorage
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('job_view_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('job_view_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Hook to automatically track job views with session deduplication
 * Call this in job detail pages to record when someone views a job
 *
 * @param jobId - The ID of the job being viewed
 * @param enabled - Whether to track the view (default: true)
 */
export function useTrackJobView(jobId: string | null | undefined, enabled = true) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!jobId || !enabled || hasTracked.current) {
      return;
    }

    const sessionId = getSessionId();
    if (!sessionId) return;

    // Track the view
    trackJobView(jobId, sessionId).catch((error) => {
      console.error('Failed to track job view:', error);
    });

    // Mark as tracked to prevent duplicate tracking
    hasTracked.current = true;
  }, [jobId, enabled]);
}

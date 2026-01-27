'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';

/**
 * Auto-Save Indicator Component
 *
 * Displays the current save status and last saved time.
 * Shows different states: saving, saved, error with retry.
 */

type Props = {
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  onRetry?: () => void;
  onManualSave?: () => void;
};

export function AutoSaveIndicator({ isSaving, lastSaved, saveError, onRetry, onManualSave }: Props) {
  // Error state
  if (saveError) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-red-600 mt-2"
        role="alert"
        aria-live="assertive"
      >
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <span>Save failed: {saveError}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-red-700 hover:text-red-800 underline"
            aria-label="Retry saving"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    );
  }

  // Saving state
  if (isSaving) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-gray-600 mt-2"
        role="status"
        aria-live="polite"
      >
        <Loader2
          className="h-4 w-4 motion-safe:animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span>Saving...</span>
      </div>
    );
  }

  // Saved state
  if (lastSaved) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-gray-500 mt-2"
        role="status"
        aria-live="polite"
      >
        <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
        <span>
          Saved{' '}
          {formatDistanceToNow(lastSaved, {
            addSuffix: true,
          })}
        </span>
        {onManualSave && (
          <button
            onClick={onManualSave}
            className="text-gray-600 hover:text-gray-800 underline ml-2"
            aria-label="Save now"
          >
            Save now
          </button>
        )}
      </div>
    );
  }

  // Initial state (not saved yet)
  if (onManualSave) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
        <button
          onClick={onManualSave}
          className="text-gray-600 hover:text-gray-800 underline"
          aria-label="Save progress"
        >
          Save progress
        </button>
      </div>
    );
  }

  return null;
}

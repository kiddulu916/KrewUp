import { useState, useCallback } from 'react';
import { useToast } from '@/components/providers/toast-provider';

/**
 * Options for configuring the async action hook
 */
type UseAsyncActionOptions<TResult = unknown> = {
  /**
   * Whether to show toast notifications automatically
   * @default false
   */
  showToast?: boolean;
  /**
   * Success message to show in toast (only if showToast is true)
   */
  successMessage?: string;
  /**
   * Error message prefix for toast (only if showToast is true)
   * @default 'Failed'
   */
  errorMessagePrefix?: string;
  /**
   * Callback executed on successful action
   */
  onSuccess?: (result: TResult) => void | Promise<void>;
  /**
   * Callback executed on error
   */
  onError?: (error: Error | string) => void | Promise<void>;
  /**
   * Whether to reset error state when action starts
   * @default true
   */
  resetErrorOnStart?: boolean;
  /**
   * Custom error handler that returns a user-friendly error message
   */
  formatError?: (error: unknown) => string;
};

/**
 * Result type for actions that return { success: boolean, error?: string, data?: T }
 */
type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Hook for managing async actions with loading, error, and success states
 *
 * Handles common patterns:
 * - Loading state management
 * - Error handling with try/catch/finally
 * - Optional toast notifications
 * - Success/error callbacks
 * - Support for both async functions and server actions
 *
 * @example
 * ```tsx
 * const { execute, isLoading, error } = useAsyncAction({
 *   showToast: true,
 *   successMessage: 'Profile updated successfully',
 *   onSuccess: () => router.push('/dashboard'),
 * });
 *
 * const handleSubmit = async () => {
 *   await execute(async () => {
 *     return await updateProfile(formData);
 *   });
 * };
 * ```
 *
 * @example With server action
 * ```tsx
 * const { execute, isLoading, error } = useAsyncAction({
 *   showToast: true,
 *   onSuccess: (result) => {
 *     if (result.success) {
 *       router.push('/dashboard');
 *     }
 *   },
 * });
 *
 * const handleSubmit = async () => {
 *   await execute(async () => {
 *     return await signIn(email, password);
 *   });
 * };
 * ```
 */
export function useAsyncAction<TResult = unknown>(
  options: UseAsyncActionOptions<TResult> = {}
) {
  const {
    showToast = false,
    successMessage,
    errorMessagePrefix = 'Failed',
    onSuccess,
    onError,
    resetErrorOnStart = true,
    formatError,
  } = options;

  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Format error message from various error types
   */
  const getErrorMessage = useCallback(
    (err: unknown): string => {
      if (formatError) {
        return formatError(err);
      }

      if (typeof err === 'string') {
        return err;
      }

      if (err instanceof Error) {
        return err.message;
      }

      if (
        typeof err === 'object' &&
        err !== null &&
        'error' in err &&
        typeof (err as any).error === 'string'
      ) {
        return (err as any).error;
      }

      return `${errorMessagePrefix}: An unexpected error occurred`;
    },
    [formatError, errorMessagePrefix]
  );

  /**
   * Execute an async action with automatic loading and error handling
   *
   * @param action - Async function to execute
   * @returns Promise that resolves with the action result
   */
  const execute = useCallback(
    async <TActionResult = TResult>(
      action: () => Promise<TActionResult | ActionResult<TActionResult>>
    ): Promise<TActionResult | ActionResult<TActionResult> | undefined> => {
      // Reset error state if configured
      if (resetErrorOnStart) {
        setError(null);
      }
      setSuccess(false);
      setIsLoading(true);

      try {
        const result = await action();

        // Handle server action pattern: { success: boolean, error?: string, data?: T }
        if (
          result &&
          typeof result === 'object' &&
          'success' in result &&
          typeof (result as ActionResult).success === 'boolean'
        ) {
          const actionResult = result as ActionResult<TActionResult>;

          if (actionResult.success) {
            setSuccess(true);
            setError(null);

            if (showToast && successMessage) {
              toast.success(successMessage);
            }

            // Call onSuccess with the data if available, otherwise the full result
            if (onSuccess) {
              await onSuccess(
                (actionResult.data ?? actionResult) as unknown as TResult
              );
            }

            return result;
          } else {
            // Server action returned success: false
            const errorMsg =
              actionResult.error || `${errorMessagePrefix}: Unknown error`;
            setError(errorMsg);
            setSuccess(false);

            if (showToast) {
              toast.error(errorMsg);
            }

            if (onError) {
              await onError(errorMsg);
            }

            return result;
          }
        }

        // Handle regular async function (no server action pattern)
        setSuccess(true);
        setError(null);

        if (showToast && successMessage) {
          toast.success(successMessage);
        }

        if (onSuccess) {
          await onSuccess(result as unknown as TResult);
        }

        return result;
      } catch (err: unknown) {
        // Handle Next.js redirect errors (expected behavior)
        if (
          err instanceof Error &&
          (err.message.includes('NEXT_REDIRECT') ||
            (err as any).digest?.startsWith('NEXT_REDIRECT'))
        ) {
          // Re-throw redirect errors - they're expected and handled by Next.js
          throw err;
        }

        const errorMsg = getErrorMessage(err);
        setError(errorMsg);
        setSuccess(false);

        if (showToast) {
          toast.error(errorMsg);
        }

        if (onError) {
          await onError(err instanceof Error ? err : new Error(errorMsg));
        }

        // Return undefined on error to indicate failure
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [
      resetErrorOnStart,
      showToast,
      successMessage,
      errorMessagePrefix,
      toast,
      onSuccess,
      onError,
      getErrorMessage,
    ]
  );

  /**
   * Reset all state (loading, error, success)
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  /**
   * Clear only the error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    success,
    reset,
    clearError,
  };
}

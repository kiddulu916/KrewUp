'use client';

/**
 * Accessible form error components
 *
 * These components use role="alert" and aria-live to announce
 * validation errors to screen reader users.
 */

interface FormErrorProps {
  id: string;
  message?: string;
}

/**
 * Individual form field error message
 *
 * Announces error to screen readers when it appears.
 */
export function FormError({ id, message }: FormErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      aria-live="assertive"
      className="mt-1.5 text-sm text-red-600"
    >
      {message}
    </p>
  );
}

interface FormErrorSummaryProps {
  errors: Record<string, { message?: string }>;
  className?: string;
}

/**
 * Form error summary component
 *
 * Displays all form errors in a summary list at the top of the form.
 * Each error links to its corresponding field.
 */
export function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
  const errorList = Object.entries(errors).filter(([, v]) => v?.message);

  if (errorList.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`bg-red-50 border border-red-200 rounded-lg p-4 mb-4 ${className || ''}`}
    >
      <h3 className="text-red-800 font-medium mb-2">
        Please fix the following errors:
      </h3>
      <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
        {errorList.map(([field, error]) => (
          <li key={field}>
            <a href={`#${field}`} className="underline hover:no-underline">
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { TextareaHTMLAttributes, forwardRef, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  showCharCount?: boolean;
}

/**
 * Textarea Component
 *
 * A multi-line text input component with label, error states, and optional character counter.
 *
 * @example
 * ```tsx
 * <Textarea
 *   label="Message"
 *   placeholder="Type your message..."
 *   rows={3}
 *   maxLength={500}
 *   showCharCount
 * />
 * ```
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, showCharCount, maxLength, value, defaultValue, onChange, ...props }, ref) => {
    // * For controlled components (value prop), compute charCount from value
    // * For uncontrolled components (defaultValue only), track in state via onChange
    const isControlled = value !== undefined;
    const [uncontrolledCharCount, setUncontrolledCharCount] = useState(() => {
      const initialValue = defaultValue ?? '';
      return String(initialValue).length;
    });

    // * Compute character count: use value for controlled, state for uncontrolled
    const charCount = useMemo(() => {
      if (isControlled) {
        return String(value ?? '').length;
      }
      return uncontrolledCharCount;
    }, [isControlled, value, uncontrolledCharCount]);

    // * Handle character count on change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) {
        setUncontrolledCharCount(e.target.value.length);
      }
      onChange?.(e);
    };

    const isNearLimit = maxLength && charCount > maxLength * 0.9;
    const isAtLimit = maxLength && charCount >= maxLength;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          onChange={handleChange}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-none',
            error && 'border-red-300 focus:ring-red-500',
            className
          )}
          {...props}
        />
        <div className="flex justify-between items-start mt-1.5">
          <div className="flex-1">
            {helperText && !error && (
              <p className="text-sm text-gray-500">{helperText}</p>
            )}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
          {(showCharCount || maxLength) && (
            <p
              className={cn(
                'text-sm ml-2 shrink-0',
                isAtLimit ? 'text-red-600 font-medium' : isNearLimit ? 'text-orange-600' : 'text-gray-400'
              )}
            >
              {charCount}{maxLength && `/${maxLength}`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

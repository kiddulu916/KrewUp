import { cn } from '@/lib/utils';
import { AvatarSkeleton } from './avatar';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
  xl: 'h-16 w-16 border-4',
};

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={cn(
          'motion-safe:animate-spin motion-reduce:animate-none rounded-full border-krewup-blue border-t-transparent',
          sizeClasses[size],
          className
        )}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && <p className="text-sm text-gray-600">{label}</p>}
    </div>
  );
}

/**
 * Full-page loading spinner
 */
export function PageLoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="xl" label={label || 'Loading...'} />
    </div>
  );
}

/**
 * Inline loading spinner (for buttons, small spaces)
 */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-4 w-4 motion-safe:animate-spin motion-reduce:animate-none rounded-full border-2 border-white border-t-transparent',
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

interface ListItemSkeletonProps {
  /** Whether to include a circular avatar skeleton at the start of the row. */
  showAvatar?: boolean;
  /** Number of text lines to render for each list item. */
  lines?: number;
  /** Additional classes applied to the outer wrapper for a single item. */
  className?: string;
}

/**
 * ListItemSkeleton
 *
 * A flexible skeleton row for list-based UIs (jobs, applications, notifications).
 * Combines an optional avatar circle with one or more text lines to mimic real list items.
 */
export function ListItemSkeleton({
  showAvatar = true,
  lines = 2,
  className,
}: ListItemSkeletonProps) {
  const lineWidths = ['w-3/4', 'w-1/2', 'w-full'];

  return (
    <div className={cn('flex items-center gap-4 py-3 motion-safe:animate-pulse motion-reduce:animate-none', className)}>
      {showAvatar && <AvatarSkeleton size="sm" />}
      <div className="flex-1 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          // * Uses index as key because items are static, non-interactive placeholders
          // eslint-disable-next-line react/no-array-index-key
          <div
            key={index}
            className={cn('h-3 rounded bg-gray-200', lineWidths[index] ?? 'w-full')}
          />
        ))}
      </div>
    </div>
  );
}

interface ListSkeletonProps {
  /** Number of skeleton rows to render. */
  count?: number;
  /** Whether each row includes an avatar skeleton. */
  showAvatar?: boolean;
  /** Additional classes applied to the list container. */
  className?: string;
  /** Additional classes applied to each list item. */
  itemClassName?: string;
}

/**
 * ListSkeleton
 *
 * A convenience component that renders multiple `ListItemSkeleton` rows
 * for list views where data is loading.
 */
export function ListSkeleton({
  count = 5,
  showAvatar = true,
  className,
  itemClassName,
}: ListSkeletonProps) {
  return (
    <div className={cn('divide-y divide-gray-100', className)}>
      {Array.from({ length: count }).map((_, index) => (
        // * Uses index as key because items are static, non-interactive placeholders
        // eslint-disable-next-line react/no-array-index-key
        <ListItemSkeleton
          key={index}
          showAvatar={showAvatar}
          className={itemClassName}
        />
      ))}
    </div>
  );
}

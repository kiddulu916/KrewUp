'use client';

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { cn } from '@/lib/utils';

type PullToRefreshProps = {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  disabled?: boolean;
};

/**
 * Pull-to-refresh wrapper component for mobile lists
 *
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={async () => await refetch()}>
 *   <JobList jobs={jobs} />
 * </PullToRefresh>
 * ```
 */
export function PullToRefresh({
  children,
  onRefresh,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const { isRefreshing, pullDistance, isPulling, containerRef } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  const showIndicator = isPulling || isRefreshing;
  const indicatorProgress = Math.min(pullDistance / 80, 1);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex justify-center transition-opacity duration-200 z-10',
          showIndicator ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: Math.max(0, pullDistance - 40),
          transform: `translateY(${showIndicator ? 0 : -20}px)`,
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200',
            isRefreshing && 'animate-pulse'
          )}
          style={{
            opacity: indicatorProgress,
            transform: `scale(${0.5 + indicatorProgress * 0.5}) rotate(${indicatorProgress * 180}deg)`,
          }}
        >
          <Loader2
            className={cn(
              'w-5 h-5 text-krewup-blue',
              isRefreshing && 'animate-spin'
            )}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        style={{
          transform: showIndicator ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

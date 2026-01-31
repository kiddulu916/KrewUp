import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
}

/**
 * Card Component
 *
 * A container component for grouping related content.
 *
 * @example
 * ```tsx
 * <Card variant="elevated">
 *   <CardHeader>
 *     <CardTitle>Profile</CardTitle>
 *     <CardDescription>Manage your profile information</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     Content goes here
 *   </CardContent>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-gray-200 shadow-md hover:shadow-xl transition-shadow duration-300',
      elevated: 'bg-white shadow-xl hover:shadow-2xl transition-shadow duration-300',
      outlined: 'bg-white border-2 border-krewup-light-blue shadow-lg hover:shadow-xl transition-all duration-300 hover:border-krewup-blue',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-xl', variants[variant], className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-bold leading-none tracking-tight bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent', className)}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-gray-500', className)} {...props} />
));

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);

CardFooter.displayName = 'CardFooter';

export interface CardSkeletonProps {
  /** Number of skeleton text lines to render inside the card. */
  lines?: number;
  /** Additional classes applied to the outer `Card` wrapper. */
  className?: string;
}

/**
 * CardSkeleton
 *
 * A reusable skeleton state for card-based layouts.
 * Uses the same base `Card` component to ensure consistent padding,
 * border radius, and elevation, while showing animated placeholder lines.
 */
export function CardSkeleton({ lines = 3, className }: CardSkeletonProps) {
  const lineWidths = ['w-3/4', 'w-1/2', 'w-full', 'w-5/6'];

  return (
    <Card className={cn('p-6', className)}>
      <div className="space-y-3 motion-safe:animate-pulse motion-reduce:animate-none">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            // * Uses index as key because items are static, non-interactive placeholders
            key={index}
            className={cn(
              'h-4 rounded bg-gray-200',
              lineWidths[index] ?? 'w-full'
            )}
          />
        ))}
      </div>
    </Card>
  );
}

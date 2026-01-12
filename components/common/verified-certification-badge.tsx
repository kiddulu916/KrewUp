'use client';

import { CheckCircle2, ShieldCheck } from 'lucide-react';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
};

/**
 * Verified certification badge - shows a prominent green badge with shield icon
 * Only displayed for certifications that have been verified by admin
 */
export function VerifiedCertificationBadge({ size = 'md', showIcon = true, className = '' }: Props) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <ShieldCheck className={iconSizes[size]} />}
      <span>Verified</span>
    </span>
  );
}

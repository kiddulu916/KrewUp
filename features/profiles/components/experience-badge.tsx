// features/profiles/components/experience-badge.tsx
'use client';

interface ExperienceBadgeProps {
  years: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function ExperienceBadge({ years, size = 'md', showIcon = true }: ExperienceBadgeProps) {
  if (years === 0) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Color based on experience level
  const getColorClass = () => {
    if (years < 2) return 'bg-gray-100 text-gray-700 border-gray-300';
    if (years < 5) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (years < 10) return 'bg-purple-100 text-purple-700 border-purple-300';
    return 'bg-amber-100 text-amber-700 border-amber-300';
  };

  const getLabel = () => {
    if (years === 1) return '1 year experience';
    return `${years} years experience`;
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border
        font-medium
        ${sizeClasses[size]}
        ${getColorClass()}
      `}
    >
      {showIcon && (
        <svg
          className={iconSizeClasses[size]}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      )}
      {getLabel()}
    </span>
  );
}

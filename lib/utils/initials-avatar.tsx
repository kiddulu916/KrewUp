/**
 * Extract initials from a name (first letter of first and last name)
 * @param name - Full name (e.g., "John Doe")
 * @returns Initials (e.g., "JD")
 */
export function getInitials(name: string): string {
  if (!name || name.trim().length === 0) return '?';

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate deterministic background color based on user ID
 * @param userId - User UUID
 * @returns Tailwind CSS color class
 */
export function getAvatarColor(userId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-teal-500',
  ];

  // Simple hash function to get deterministic color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Props for InitialsAvatar component
 */
type InitialsAvatarProps = {
  name: string;
  userId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

/**
 * Initials-based avatar component (fallback when no profile picture)
 */
export function InitialsAvatar({ name, userId, size = 'md', className = '' }: InitialsAvatarProps) {
  const initials = getInitials(name);
  const colorClass = getAvatarColor(userId);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-32 h-32 text-4xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
    >
      {initials}
    </div>
  );
}

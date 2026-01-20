'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  isWorker: boolean;
  isPro: boolean;
}

export function BottomNav({ isWorker, isPro }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // * Exact match for root dashboard paths
    if (href === '/dashboard/feed') {
      return pathname === '/dashboard' || pathname === '/dashboard/feed';
    }
    // * For other paths, check if current path starts with the href
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden safe-area-bottom"
      aria-label="Dashboard primary navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        <BottomNavLink
          href="/dashboard/feed"
          icon="📰"
          label="Feed"
          active={isActive('/dashboard/feed')}
        />

        <BottomNavLink
          href="/dashboard/jobs"
          icon="💼"
          label={isWorker ? 'Jobs' : 'Job Posts'}
          active={isActive('/dashboard/jobs')}
        />

        <BottomNavLink
          href="/dashboard/messages"
          icon="💬"
          label="Messages"
          active={isActive('/dashboard/messages')}
        />

        <BottomNavLink
          href="/dashboard/notifications"
          icon="🔔"
          label="Alerts"
          active={isActive('/dashboard/notifications')}
        />

        <BottomNavLink
          href="/dashboard/profile"
          icon={isPro ? '⭐' : '👤'}
          label="Profile"
          active={isActive('/dashboard/profile')}
        />
      </div>
    </nav>
  );
}

function BottomNavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center min-w-[60px] px-2 py-1.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krewup-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
        active
          ? 'text-krewup-blue bg-blue-50 font-semibold scale-105'
          : 'text-gray-600 hover:text-krewup-blue hover:bg-blue-50'
      }`}
    >
      <span className={`text-2xl mb-0.5 ${active ? 'scale-110' : ''}`}>
        {icon}
      </span>
      <span className="text-[10px] font-medium truncate max-w-full">{label}</span>
    </Link>
  );
}

'use client';

/**
 * Skip Link Component
 *
 * Provides keyboard users a way to skip directly to main content.
 * Hidden until focused, then appears prominently for screen reader
 * and keyboard users.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-krewup-blue focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}

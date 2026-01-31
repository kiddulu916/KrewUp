import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { ensureCsrfCookie } from '@/lib/security/csrf';

/**
 * Next.js Middleware
 *
 * This middleware runs on every request and:
 * 1. Refreshes Supabase auth sessions automatically
 * 2. Ensures users stay authenticated across page navigations
 * 3. Ensures CSRF cookie exists for security
 *
 * You can add custom logic here for:
 * - Protected routes (redirect to login if not authenticated)
 * - Role-based access control
 * - Custom redirects based on subscription status
 */
export async function middleware(request: NextRequest) {
  try {
    const response = await updateSession(request);
    return ensureCsrfCookie(request, response);
  } catch {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
}

/**
 * Middleware matcher configuration
 *
 * This runs on all routes except:
 * - Next.js internal routes (_next/static, _next/image)
 * - Static files (images, fonts, etc.)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, fonts, and other static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

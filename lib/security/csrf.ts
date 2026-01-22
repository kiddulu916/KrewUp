import { cookies } from 'next/headers';
import crypto from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE_NAME = 'ku_csrf_secret';
const CSRF_TOKEN_PURPOSE = 'krewup-csrf-token';

// * Encodes a buffer to URL-safe base64 without padding
function toBase64Url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

// * Derives a CSRF token from a per-session secret using HMAC
function deriveTokenFromSecret(secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(CSRF_TOKEN_PURPOSE);
  return toBase64Url(hmac.digest());
}

/**
 * * Ensures a CSRF cookie exists in the response (for use in middleware only).
 * * This function can modify cookies because it's called from middleware.
 */
export function ensureCsrfCookie(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const existingSecret = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!existingSecret) {
    const randomBytes = crypto.randomBytes(32);
    const secret = randomBytes.toString('hex');

    response.cookies.set(CSRF_COOKIE_NAME, secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  return response;
}

/**
 * * Returns an existing CSRF token from cookies.
 * * Note: This function only reads cookies (does not set them).
 * * Cookies must be set in middleware using ensureCsrfCookie().
 * * 
 * * If the cookie doesn't exist (which shouldn't happen if middleware ran),
 * * this will throw an error to prevent security issues.
 */
export async function getOrCreateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const secret = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!secret) {
    // * This should never happen if middleware is working correctly.
    // * Throw an error to make the issue visible rather than silently failing.
    throw new Error(
      'CSRF secret cookie not found. Middleware may not have run correctly.'
    );
  }

  return deriveTokenFromSecret(secret);
}

/**
 * * Validates a provided CSRF token against the secret stored in cookies.
 */
export async function validateCsrfToken(
  providedToken: string | null | undefined,
): Promise<{ ok: boolean; error?: string }> {
  if (!providedToken) {
    return { ok: false, error: 'Missing CSRF token' };
  }

  const cookieStore = await cookies();
  const secret = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!secret) {
    return { ok: false, error: 'Missing CSRF secret' };
  }

  const expectedToken = deriveTokenFromSecret(secret);

  const providedBuffer = Buffer.from(providedToken);
  const expectedBuffer = Buffer.from(expectedToken);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { ok: false, error: 'Invalid CSRF token' };
  }

  return { ok: true };
}

/**
 * * Helper to assert a valid CSRF token at the start of sensitive server actions.
 */
export async function assertValidCsrfToken(
  token: string | null | undefined,
): Promise<{ ok: boolean; error?: string }> {
  return validateCsrfToken(token);
}


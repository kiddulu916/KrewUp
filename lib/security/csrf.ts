import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE_NAME = 'ku_csrf_secret';
const CSRF_TOKEN_PURPOSE = 'krewup-csrf-token';

// * Encodes a Uint8Array to URL-safe base64 without padding
function toBase64Url(input: Uint8Array): string {
  // * Convert Uint8Array to base64 string
  // * Use chunking to avoid spread operator limitations with large arrays
  let binary = '';
  for (let i = 0; i < input.length; i++) {
    binary += String.fromCharCode(input[i]);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

// * Constant-time comparison to prevent timing attacks
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// * Derives a CSRF token from a per-session secret using HMAC
async function deriveTokenFromSecret(secret: string): Promise<string> {
  // * Convert secret string to Uint8Array for Web Crypto API
  const secretKey = new TextEncoder().encode(secret);
  const purposeBytes = new TextEncoder().encode(CSRF_TOKEN_PURPOSE);

  // * Import key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // * Sign the purpose string
  const signature = await crypto.subtle.sign('HMAC', key, purposeBytes);

  return toBase64Url(new Uint8Array(signature));
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
    // * Generate 32 random bytes using Web Crypto API
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    
    // * Convert to hex string for cookie storage
    const secret = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

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

  return await deriveTokenFromSecret(secret);
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

  const expectedToken = await deriveTokenFromSecret(secret);

  // * Decode base64url strings to Uint8Array for comparison
  // * Base64url uses - and _ instead of + and /, and no padding
  function base64UrlDecode(input: string): Uint8Array {
    // * Replace base64url characters back to base64
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    // * Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    // * Decode base64 to binary string
    const binary = atob(base64);
    // * Convert binary string to Uint8Array
    return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)));
  }

  try {
    const providedBytes = base64UrlDecode(providedToken);
    const expectedBytes = base64UrlDecode(expectedToken);

    if (!timingSafeEqual(providedBytes, expectedBytes)) {
      return { ok: false, error: 'Invalid CSRF token' };
    }

    return { ok: true };
  } catch {
    // * If decoding fails, token is invalid
    return { ok: false, error: 'Invalid CSRF token format' };
  }
}

/**
 * * Helper to assert a valid CSRF token at the start of sensitive server actions.
 */
export async function assertValidCsrfToken(
  token: string | null | undefined,
): Promise<{ ok: boolean; error?: string }> {
  return validateCsrfToken(token);
}


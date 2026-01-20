import { cookies } from 'next/headers';
import crypto from 'crypto';

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
 * * Returns an existing CSRF token or creates a new per-session secret + token.
 */
export async function getOrCreateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let secret = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!secret) {
    const randomBytes = crypto.randomBytes(32);
    secret = randomBytes.toString('hex');

    cookieStore.set(CSRF_COOKIE_NAME, secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
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


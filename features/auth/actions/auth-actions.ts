'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { rateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { logger } from '@/lib/utils/logger';

const SUPPORT_EMAIL = 'support@krewup.net';

export type AuthResult = {
  success: boolean;
  error?: string;
  /** OAuth URL for client-side navigation (Google sign-in) */
  url?: string;
  /** Path for client-side redirect after signup */
  redirectTo?: string;
};

/**
 * Sign in with email and password
 * 
 * ! Rate limited: 5 attempts per minute per IP
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  // * Rate limiting - prevent brute force attacks
  const rateLimitResult = await rateLimit('auth:signIn', RATE_LIMITS.auth);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient(await cookies());

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Check moderation status using service role (bypasses RLS)
  if (data.user) {
    const serviceSupabase = await createServiceClient(await cookies());
    const { data: actions } = await serviceSupabase
      .from('user_moderation_actions')
      .select('action_type, expires_at, reason, created_at')
      .eq('user_id', data.user.id)
      .in('action_type', ['ban', 'suspension', 'warning'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (actions && actions.length > 0) {
      // Check for permanent ban (ban exists means user is banned)
      const latestBan = actions.find((a) => a.action_type === 'ban');

      const isBanned = !!latestBan;

      if (isBanned) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: `Your account has been permanently banned.\n\nReason: ${latestBan.reason}\n\nIf you believe this is a mistake, please contact ${SUPPORT_EMAIL} to appeal.`,
        };
      }

      // Check for active suspension
      const activeSuspension = actions.find(
        (a) =>
          a.action_type === 'suspension' &&
          a.expires_at &&
          new Date(a.expires_at) > new Date()
      );

      if (activeSuspension) {
        const expiresDate = new Date(activeSuspension.expires_at).toLocaleString();
        await supabase.auth.signOut();
        return {
          success: false,
          error: `Your account has been temporarily suspended until ${expiresDate}.\n\nReason: ${activeSuspension.reason}\n\nIf you believe this is a mistake, please contact ${SUPPORT_EMAIL} to appeal.`,
        };
      }
    }
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard/feed');
}

/**
 * Sign up with email and password
 *
 * ! Rate limited: 3 signups per minute per IP
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  console.log('[signUp] Starting signup for:', email);

  // * Rate limiting - prevent mass account creation
  const rateLimitResult = await rateLimit('auth:signUp', RATE_LIMITS.authSignup);
  if (rateLimitResult) {
    console.log('[signUp] Rate limited');
    return rateLimitResult;
  }

  const supabase = await createClient(await cookies());

  // Check if email already exists in profiles
  // Note: Supabase auth.signUp() may not always prevent duplicates if email confirmation is disabled
  const { data: existingProfile } = await supabase
    .from('users')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existingProfile) {
    console.log('[signUp] Email already exists');
    return {
      success: false,
      error: 'An account with this email already exists. Please sign in instead.'
    };
  }

  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0] || 'New';
  const lastName = nameParts.slice(1).join(' ') || 'User';

  console.log('[signUp] Calling supabase.auth.signUp...');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    logger.error('signUp Supabase error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: error.message };
  }

  console.log('[signUp] Signup response - user:', data.user?.id, 'session:', !!data.session);

  // If email confirmation is disabled, user is immediately logged in.
  // Return redirectTo so the client navigates; server redirect from
  // client-invoked actions is not always applied to the document.
  if (data.user && data.session) {
    console.log('[signUp] Email confirmation disabled, redirecting to onboarding');
    revalidatePath('/', 'layout');
    return { success: true, redirectTo: '/onboarding' };
  }

  console.log('[signUp] Email confirmation required, showing check email screen');
  return { success: true };
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  console.log('[signInWithGoogle] Starting Google OAuth flow');
  console.log('[signInWithGoogle] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

  const supabase = await createClient(await cookies());

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  console.log('[signInWithGoogle] OAuth response - data:', JSON.stringify(data));
  console.log('[signInWithGoogle] OAuth response - error:', error ? JSON.stringify(error) : 'none');

  if (error) {
    logger.error('signInWithGoogle OAuth error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: error.message };
  }

  // * Return URL so the client can navigate; redirect() in server actions
  // invoked from onClick does not reliably move the browser to external URLs
  if (data.url) {
    console.log('[signInWithGoogle] Returning OAuth URL:', data.url);
    return { success: true, url: data.url };
  }

  console.warn('[signInWithGoogle] No URL in OAuth response');
  return { success: true };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient(await cookies());

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Request password reset
 * 
 * ! Rate limited: 5 attempts per minute per IP
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  // * Rate limiting - prevent email enumeration and spam
  const rateLimitResult = await rateLimit('auth:resetPassword', RATE_LIMITS.auth);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient(await cookies());

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = await createClient(await cookies());

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

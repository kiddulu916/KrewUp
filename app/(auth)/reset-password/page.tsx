import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';

export const metadata = {
  title: 'Reset Password - KrewUp',
  description: 'Set a new password for your KrewUp account',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (!code) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Invalid reset link</h1>
        <p className="text-sm text-gray-600">
          This password reset link is invalid or has expired.
        </p>
        <a
          href="/forgot-password"
          className="inline-block text-sm font-medium text-krewup-blue hover:underline"
        >
          Request a new reset link
        </a>
      </div>
    );
  }

  // Exchange the code for a session
  const supabase = await createClient(await cookies());
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Reset link expired</h1>
        <p className="text-sm text-gray-600">
          This password reset link has expired or has already been used.
        </p>
        <a
          href="/forgot-password"
          className="inline-block text-sm font-medium text-krewup-blue hover:underline"
        >
          Request a new reset link
        </a>
      </div>
    );
  }

  return <ResetPasswordForm />;
}

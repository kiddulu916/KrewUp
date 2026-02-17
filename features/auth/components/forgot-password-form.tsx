'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { resetPassword } from '../actions/auth-actions';
import { useAsyncAction } from '@/hooks/use-async-action';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const { execute, isLoading, error } = useAsyncAction({
    showToast: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await execute(async () => {
      const result = await resetPassword(email);
      if (!result.success) {
        throw new Error(result.error || 'Failed to send reset link');
      }
      setEmailSent(true);
      return result;
    });
  }

  if (emailSent) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Check your email</h1>
          <p className="mt-2 text-sm text-gray-600">
            We sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="mt-1 text-sm text-gray-500">
            If you don&apos;t see it, check your spam folder.
          </p>
        </div>

        <a
          href="/login"
          className="block text-center text-sm font-medium text-krewup-blue hover:underline"
        >
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600">
        Remember your password?{' '}
        <a href="/login" className="font-medium text-krewup-blue hover:underline">
          Back to login
        </a>
      </p>
    </div>
  );
}

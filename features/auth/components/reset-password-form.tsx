'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { updatePassword, signOut } from '../actions/auth-actions';
import { useAsyncAction } from '@/hooks/use-async-action';
import {
  validatePassword,
  calculatePasswordStrength,
  getPasswordStrengthLabel,
} from '../services/auth-service';

const STRENGTH_COLORS = {
  weak: 'bg-red-500',
  fair: 'bg-orange-500',
  good: 'bg-yellow-500',
  strong: 'bg-green-500',
} as const;

const STRENGTH_WIDTHS = {
  weak: 'w-1/4',
  fair: 'w-2/4',
  good: 'w-3/4',
  strong: 'w-full',
} as const;

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { execute, isLoading, error } = useAsyncAction({
    showToast: false,
  });

  const strength = calculatePasswordStrength(password);
  const strengthLabel = getPasswordStrengthLabel(strength);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    // Client-side validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setValidationError(passwordValidation.error || 'Invalid password');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    await execute(async () => {
      const result = await updatePassword(password);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update password');
      }
      // Sign out so user logs in with new password
      await signOut();
      return result;
    });
  }

  const displayError = validationError || error;

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Set new password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter your new password below
        </p>
      </div>

      {displayError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{displayError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="New password"
            type="password"
            placeholder="Enter your new password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setValidationError(null);
            }}
            required
            disabled={isLoading}
          />
          {password && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-1.5 rounded-full transition-all ${STRENGTH_COLORS[strengthLabel]} ${STRENGTH_WIDTHS[strengthLabel]}`}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Password strength: <span className="font-medium">{strengthLabel}</span>
              </p>
            </div>
          )}
        </div>

        <Input
          label="Confirm password"
          type="password"
          placeholder="Confirm your new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setValidationError(null);
          }}
          required
          disabled={isLoading}
        />

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Reset password
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600">
        <a href="/login" className="font-medium text-krewup-blue hover:underline">
          Back to login
        </a>
      </p>
    </div>
  );
}

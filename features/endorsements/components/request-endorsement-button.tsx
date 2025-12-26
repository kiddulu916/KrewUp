// features/endorsements/components/request-endorsement-button.tsx
'use client';

import { useState } from 'react';
import { requestEndorsement } from '../actions/endorsement-actions';
import { Button } from '@/components/ui/button';
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';
import { useRouter } from 'next/navigation';

interface RequestEndorsementButtonProps {
  experienceId: string;
  onSuccess?: () => void;
}

export function RequestEndorsementButton({
  experienceId,
  onSuccess,
}: RequestEndorsementButtonProps) {
  const router = useRouter();
  const isPro = useIsPro();
  const [isOpen, setIsOpen] = useState(false);
  const [employerEmail, setEmployerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Free user - redirect to pricing
  if (!isPro) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => router.push('/pricing')}
      >
        Request Endorsement (Pro)
      </Button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await requestEndorsement(experienceId, employerEmail);

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to send request');
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setIsOpen(false);
      setSuccess(false);
      setEmployerEmail('');
      onSuccess?.();
    }, 2000);
  };

  if (!isOpen) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
      >
        Request Endorsement
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-4 mt-2 bg-gray-50">
      {success ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-2 bg-green-100 rounded-full">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-green-800">Endorsement request sent!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Employer Email
            </label>
            <input
              type="email"
              value={employerEmail}
              onChange={(e) => setEmployerEmail(e.target.value)}
              placeholder="employer@company.com"
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              The employer must have a KrewUp account
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !employerEmail}
            >
              {isLoading ? 'Sending...' : 'Send Request'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setError('');
                setEmployerEmail('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

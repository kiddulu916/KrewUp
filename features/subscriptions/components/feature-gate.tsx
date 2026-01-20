// features/subscriptions/components/feature-gate.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useSubscription } from '../hooks/use-subscription';
import { Card, CardSkeleton } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProBadge } from './pro-badge';

interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ReactNode;
}

export function FeatureGate({ children, feature, fallback }: FeatureGateProps) {
  const router = useRouter();
  const { data, isLoading, error } = useSubscription();

  // Show loading skeleton while checking subscription status
  if (isLoading) {
    return <CardSkeleton />;
  }

  // Handle error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">
          Unable to verify subscription status. Please try again.
        </p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  // Check if user is Pro (prefer profile status, fallback to subscription table)
  const isPro = data?.profileSubscriptionStatus === 'pro' ||
    (data?.subscription?.status === 'active' && data?.subscription?.stripe_subscription_id !== '');

  if (isPro) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="p-6 text-center">
      <div className="flex justify-center mb-4">
        <ProBadge />
      </div>
      <h3 className="text-xl font-bold mb-2">Pro Feature</h3>
      <p className="text-gray-600 mb-4">
        Upgrade to KrewUp Pro to access {feature}.
      </p>
      <Button onClick={() => router.push('/pricing')}>
        Upgrade to Pro
      </Button>
    </Card>
  );
}

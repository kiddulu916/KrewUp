// features/jobs/components/job-analytics-dashboard.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJobAnalytics } from '../actions/job-analytics-actions';
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface JobAnalyticsDashboardProps {
  jobId: string;
  jobTitle: string;
}

export function JobAnalyticsDashboard({ jobId, jobTitle }: JobAnalyticsDashboardProps) {
  const router = useRouter();
  const isPro = useIsPro();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');

  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['job-analytics', jobId, dateRange],
    queryFn: async () => {
      const result = await getJobAnalytics(jobId, dateRange);
      if (!result.success) throw new Error(result.error);
      return result.analytics;
    },
    enabled: isPro,
    refetchInterval: 60000, // Refetch every minute
  });

  // Free user - show upgrade prompt
  if (!isPro) {
    return (
      <Card className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-blue-100 rounded-full">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Job Analytics</h3>
        <p className="text-gray-600 mb-4">
          Upgrade to Pro to see detailed analytics for this job posting including views, unique visitors, and conversion rates.
        </p>
        <Button onClick={() => router.push('/pricing')}>
          Upgrade to Pro - $15/month
        </Button>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">
          Unable to load analytics. Please try again.
        </p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  const analytics = analyticsData!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Job Analytics</h2>
            <p className="text-gray-600">{jobTitle}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={dateRange === 'week' ? 'default' : 'outline'}
              onClick={() => setDateRange('week')}
            >
              7 Days
            </Button>
            <Button
              size="sm"
              variant={dateRange === 'month' ? 'default' : 'outline'}
              onClick={() => setDateRange('month')}
            >
              30 Days
            </Button>
            <Button
              size="sm"
              variant={dateRange === 'all' ? 'default' : 'outline'}
              onClick={() => setDateRange('all')}
            >
              All Time
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Views"
            value={analytics.totalViews}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
            color="blue"
          />
          <StatCard
            label="Unique Visitors"
            value={analytics.uniqueViews}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            color="green"
          />
          <StatCard
            label="Applications"
            value={analytics.applicationCount}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            color="purple"
          />
          <StatCard
            label="Conversion Rate"
            value={`${analytics.conversionRate}%`}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            color="orange"
          />
        </div>
      </Card>

      {/* Views Over Time Chart */}
      {analytics.viewsByDate.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Views Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.viewsByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Total Views"
              />
              <Line
                type="monotone"
                dataKey="uniqueViews"
                stroke="#10b981"
                strokeWidth={2}
                name="Unique Visitors"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* No data state */}
      {analytics.viewsByDate.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-gray-600">
            No views yet for this time period. Check back soon!
          </p>
        </Card>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

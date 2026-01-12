'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProfileAnalytics } from '../actions/profile-analytics-actions';
import { useIsPro } from '../hooks/use-subscription';
import { useRouter } from 'next/navigation';
import { TrendingUp, Users, Eye, Building } from 'lucide-react';

// Dynamically import Recharts to reduce bundle size
const LineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false }
);
const Line = dynamic(
  () => import('recharts').then((mod) => mod.Line),
  { ssr: false }
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

type DateRange = '7' | '30' | 'all';

/**
 * Profile Views Analytics Chart for Pro Workers
 * Shows profile views over time with metrics
 */
export function ProfileViewsChart() {
  const router = useRouter();
  const isPro = useIsPro();
  const [dateRange, setDateRange] = useState<DateRange>('30');

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile-analytics', dateRange],
    queryFn: async () => {
      const result = await getProfileAnalytics(dateRange);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: isPro,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Non-Pro users get an upgrade prompt
  if (!isPro) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Eye className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Profile Analytics</h3>
          <p className="text-gray-600 mb-4">
            See who's viewing your profile and track your visibility over time.
          </p>
          <Button onClick={() => router.push('/pricing')}>
            Upgrade to Pro
          </Button>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">Failed to load analytics</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </Card>
    );
  }

  // Format date for chart labels
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Views"
          value={data.totalViews}
          icon={<Eye className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Unique Viewers"
          value={data.uniqueViewers}
          icon={<Users className="h-5 w-5" />}
          color="green"
        />
        <MetricCard
          title="Avg Daily Views"
          value={Math.round(data.totalViews / (dateRange === '7' ? 7 : dateRange === '30' ? 30 : data.viewsByDate.length || 1))}
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
        />
        <MetricCard
          title="Top Viewer Type"
          value={data.topViewerTypes[0]?.type || 'N/A'}
          icon={<Building className="h-5 w-5" />}
          color="orange"
          isText
        />
      </div>

      {/* Chart Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Profile Views Over Time</h3>
          <div className="flex gap-2">
            {(['7', '30', 'all'] as DateRange[]).map((range) => (
              <Button
                key={range}
                size="sm"
                variant={dateRange === range ? 'primary' : 'outline'}
                onClick={() => setDateRange(range)}
              >
                {range === '7' ? '7 days' : range === '30' ? '30 days' : 'All time'}
              </Button>
            ))}
          </div>
        </div>

        {data.viewsByDate.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No views data available for this period
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.viewsByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  formatter={(value: number) => [value, 'Views']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Viewer Types Breakdown */}
      {data.topViewerTypes.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Viewer Types</h3>
          <div className="space-y-3">
            {data.topViewerTypes.map((type, index) => (
              <div key={type.type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <span className="font-medium capitalize">{type.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(type.count / data.totalViews) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {type.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color,
  isText = false,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
  isText?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <p className={`font-bold ${isText ? 'text-lg capitalize' : 'text-2xl'}`}>
        {value}
      </p>
    </Card>
  );
}

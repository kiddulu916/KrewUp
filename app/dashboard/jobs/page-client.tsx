'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { JobCard } from '@/features/jobs/components/job-card';
import { JobFilters } from '@/features/jobs/components/job-filters';
import { useJobs } from '@/features/jobs/hooks/use-jobs';
import { useAutoUserLocation } from '@/hooks/use-user-location';
import { sortJobsByDistance } from '@/features/jobs/utils/distance';
import { InFeedAd, shouldShowInFeedAd } from '@/components/ads';
import { ListSkeleton, Button } from '@/components/ui';

type Job = {
  id: string;
  title: string;
  trades: string[];
  sub_trades?: string[] | null;
  job_type: string;
  location: string;
  coords?: { lat: number; lng: number } | string | null;
  pay_rate: string;
  employer_name: string;
  required_certs?: string[];
  created_at: string;
  status: string;
};

type JobsPageClientProps = {
  initialJobs: Job[];
  subscriptionStatus?: string;
  isLifetimePro?: boolean;
};

export function JobsPageClient({ initialJobs, subscriptionStatus, isLifetimePro }: JobsPageClientProps) {
  const { location: userCoords } = useAutoUserLocation();
  const [filters, setFilters] = useState({
    trade: '',
    subTrade: '',
    jobType: '',
    maxDistance: '',
    minPay: ''
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const hasActiveFilters =
    filters.trade ||
    filters.subTrade ||
    filters.jobType ||
    filters.maxDistance ||
    filters.minPay;

  const { data: jobs, isLoading } = useJobs({
    trade: filters.trade || undefined,
    subTrade: filters.subTrade || undefined,
    jobType: filters.jobType || undefined,
    minPay: filters.minPay ? parseInt(filters.minPay, 10) : undefined,
  });

  const displayJobs: Job[] = (jobs as Job[]) || initialJobs;
  
  // 1. Sort by distance first (this also adds distance property to each job)
  let processedJobs = sortJobsByDistance(displayJobs, userCoords) as (Job & { distance?: number | null })[];

  // 2. Apply client-side distance filter if specified
  if (filters.maxDistance && userCoords) {
    const maxDist = parseFloat(filters.maxDistance);
    processedJobs = processedJobs.filter(job => {
      const distance = job.distance;
      return distance !== null && distance !== undefined && distance <= maxDist;
    });
  }

  const sortedJobs = processedJobs;

  return (
    <div className="space-y-4">
      {/* Mobile Filter Toggle (hidden when sidebar is visible) */}
      <div className="md:hidden">
        <Button
          variant="outline"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full flex items-center justify-center gap-2"
        >
          {showMobileFilters ? (
            <>
              <X className="h-4 w-4" aria-hidden="true" />
              Hide Filters
            </>
          ) : (
            <>
              <Filter className="h-4 w-4" aria-hidden="true" />
              {hasActiveFilters ? 'Filters Active' : 'Show Filters'}
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-krewup-blue text-white rounded-full">
                  {[filters.trade, filters.subTrade, filters.jobType, filters.maxDistance, filters.minPay].filter(Boolean).length}
                </span>
              )}
            </>
          )}
        </Button>

        {/* Mobile Filters Drawer */}
        {showMobileFilters && (
          <div className="mt-4">
            <JobFilters
              filters={filters}
              onFilterChange={setFilters}
              hasLocation={!!userCoords}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Desktop Filters Sidebar */}
        <div className="hidden md:block md:col-span-1 lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <JobFilters
              filters={filters}
              onFilterChange={setFilters}
              hasLocation={!!userCoords}
            />
          </div>
        </div>

        {/* Jobs List */}
        <div className="md:col-span-2 lg:col-span-3 space-y-3">
        {isLoading ? (
          <ListSkeleton
            count={6}
            showAvatar={false}
            className="mt-2"
            itemClassName="py-4"
          />
        ) : sortedJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-6">
              <span className="text-5xl">{hasActiveFilters ? '🔍' : '💼'}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {hasActiveFilters ? 'No jobs match your filters' : 'No jobs available'}
            </h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search criteria to see more results'
                : 'There are no jobs posted in your area yet. Check back soon!'}
            </p>

            {/* Show active filters */}
            {hasActiveFilters && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Active filters:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {filters.trade && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Trade: {filters.trade}
                    </span>
                  )}
                  {filters.subTrade && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Specialty: {filters.subTrade}
                    </span>
                  )}
                  {filters.jobType && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Type: {filters.jobType}
                    </span>
                  )}
                  {filters.maxDistance && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Within {filters.maxDistance} miles
                    </span>
                  )}
                  {filters.minPay && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Min ${filters.minPay}/hr
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Suggested actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={() => setFilters({ trade: '', subTrade: '', jobType: '', maxDistance: '', minPay: '' })}
                >
                  Clear All Filters
                </Button>
              )}
              {filters.maxDistance && userCoords && (
                <Button
                  variant="outline"
                  onClick={() => setFilters({ ...filters, maxDistance: '' })}
                >
                  Remove Distance Limit
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {sortedJobs.length} job{sortedJobs.length !== 1 ? 's' : ''}
                {filters.trade && ` in ${filters.trade}`}
              </p>
              {userCoords && (
                <p className="text-sm text-gray-500">Sorted by distance from your location</p>
              )}
            </div>

            {sortedJobs.map((job, index) => (
              <div key={job.id}>
                <JobCard job={job} userCoords={userCoords} />
                {/* Show in-feed ad every N jobs (for free users) */}
                {shouldShowInFeedAd(index, sortedJobs.length) && (
                  <InFeedAd
                    subscriptionStatus={subscriptionStatus}
                    isLifetimePro={isLifetimePro}
                    className="my-3"
                  />
                )}
              </div>
            ))}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

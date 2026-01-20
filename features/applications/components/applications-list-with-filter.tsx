'use client';

import { useState } from 'react';
import { CertificationFilter } from './certification-filter';
import { getFilteredApplications } from '../actions/certification-filter-actions';
import { ApplicationCard } from './application-card';
import { CardSkeleton, ListSkeleton } from '@/components/ui';

type Application = {
  id: string;
  status: string;
  cover_letter?: string | null;
  created_at: string;
  applicant: {
    id: string;
    first_name: string;
    last_name: string;
    trade: string;
    sub_trade?: string | null;
    location: string;
    bio?: string | null;
    is_profile_boosted?: boolean;
    boost_expires_at?: string | null;
  };
};

type ApplicationsListWithFilterProps = {
  jobId: string;
  initialApplications: Application[];
};

export function ApplicationsListWithFilter({
  jobId,
  initialApplications,
}: ApplicationsListWithFilterProps) {
  const [filteredApplications, setFilteredApplications] = useState<Application[] | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);

  // Handle certification filter changes
  const handleFilterChange = async (certifications: string[], verifiedOnly: boolean) => {
    setIsFiltering(true);
    try {
      const result = await getFilteredApplications(jobId, {
        certificationNames: certifications,
        verifiedOnly,
      });

      if (result.success && result.data) {
        setFilteredApplications(result.data as Application[]);
      }
    } catch (error) {
      console.error('Error filtering applications:', error);
    } finally {
      setIsFiltering(false);
    }
  };

  // Use filtered applications if available, otherwise use initial applications
  const applicationsToShow = filteredApplications || initialApplications;

  // Sort: boosted first, then by created_at
  const sortedApplications = [...applicationsToShow].sort((a, b) => {
    const aIsBoosted =
      a.applicant.is_profile_boosted &&
      a.applicant.boost_expires_at &&
      new Date(a.applicant.boost_expires_at) > new Date();
    const bIsBoosted =
      b.applicant.is_profile_boosted &&
      b.applicant.boost_expires_at &&
      new Date(b.applicant.boost_expires_at) > new Date();

    if (aIsBoosted && !bIsBoosted) return -1;
    if (!aIsBoosted && bIsBoosted) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Certification Filter */}
      <CertificationFilter
        onFilterChange={handleFilterChange}
      />

      {/* Loading state */}
      {isFiltering && (
        <div className="space-y-4">
          <CardSkeleton lines={2} />
          <ListSkeleton count={3} showAvatar={true} />
        </div>
      )}

      {/* Applications List */}
      {sortedApplications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {filteredApplications ? 'No applications match your filters' : 'No applications yet'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {filteredApplications
              ? 'Try adjusting your filter criteria'
              : 'Check back later for worker applications'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedApplications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  );
}

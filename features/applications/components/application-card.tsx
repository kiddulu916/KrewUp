'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageButton } from '@/features/messaging/components/message-button';
import { getFullName, getInitials } from '@/lib/utils';

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

type ApplicationCardProps = {
  application: Application;
};

function ApplicationCardComponent({ application }: ApplicationCardProps) {
  const { applicant, status, cover_letter, created_at } = application;

  const isBoosted =
    applicant.is_profile_boosted &&
    applicant.boost_expires_at &&
    new Date(applicant.boost_expires_at) > new Date();

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-krewup-blue hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange text-white font-bold text-lg shadow-lg">
              {getInitials(applicant)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-gray-900">{getFullName(applicant)}</h4>
                {isBoosted && (
                  <Badge
                    variant="warning"
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none"
                  >
                    ⭐ Boosted
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {applicant.trade}
                {applicant.sub_trade && ` - ${applicant.sub_trade}`}
              </p>
            </div>
          </div>

          <div className="ml-15 space-y-2">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Location:</span> {applicant.location}
            </p>
            {applicant.bio && (
              <p className="text-sm text-gray-600 italic">{applicant.bio}</p>
            )}
            {cover_letter && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-1">Cover Letter:</p>
                <p className="text-sm text-gray-700">{cover_letter}</p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Applied on {new Date(created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="ml-4 flex flex-col gap-2 items-end">
          <Badge
            variant={
              status === 'pending'
                ? 'warning'
                : status === 'hired'
                ? 'success'
                : status === 'rejected'
                ? 'danger'
                : 'info'
            }
            className="capitalize"
          >
            {status}
          </Badge>
          <MessageButton
            recipientId={applicant.id}
            recipientName={getFullName(applicant)}
            variant="secondary"
          />
        </div>
      </div>
    </div>
  );
}

// * Memoized to prevent re-renders when parent state changes but application props are unchanged
export const ApplicationCard = React.memo(ApplicationCardComponent, (prevProps, nextProps) => {
  const prev = prevProps.application;
  const next = nextProps.application;

  return (
    prev.id === next.id &&
    prev.status === next.status &&
    prev.cover_letter === next.cover_letter &&
    prev.created_at === next.created_at &&
    prev.applicant.id === next.applicant.id &&
    prev.applicant.first_name === next.applicant.first_name &&
    prev.applicant.last_name === next.applicant.last_name &&
    prev.applicant.trade === next.applicant.trade &&
    prev.applicant.sub_trade === next.applicant.sub_trade &&
    prev.applicant.location === next.applicant.location &&
    prev.applicant.bio === next.applicant.bio &&
    prev.applicant.is_profile_boosted === next.applicant.is_profile_boosted &&
    prev.applicant.boost_expires_at === next.applicant.boost_expires_at
  );
});

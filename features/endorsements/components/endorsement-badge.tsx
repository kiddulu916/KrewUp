// features/endorsements/components/endorsement-badge.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { getExperienceEndorsements } from '../actions/endorsement-actions';

interface EndorsementBadgeProps {
  experienceId: string;
  showDetails?: boolean;
}

export function EndorsementBadge({ experienceId, showDetails = false }: EndorsementBadgeProps) {
  const { data: result } = useQuery({
    queryKey: ['endorsements', experienceId],
    queryFn: async () => {
      const res = await getExperienceEndorsements(experienceId);
      if (!res.success) throw new Error(res.error);
      return res.endorsements || [];
    },
  });

  const endorsements = result || [];
  const count = endorsements.length;

  if (count === 0) return null;

  return (
    <div className="space-y-2">
      {/* Badge */}
      <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Endorsed by {count} {count === 1 ? 'employer' : 'employers'}
      </div>

      {/* Details */}
      {showDetails && endorsements.length > 0 && (
        <div className="space-y-3 mt-3">
          {endorsements.map((endorsement) => (
            <div key={endorsement.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Endorsed by {endorsement.endorsed_by_name}
                    {endorsement.endorsed_by_company && (
                      <span className="text-gray-600"> ({endorsement.endorsed_by_company})</span>
                    )}
                  </p>
                  {endorsement.recommendation_text && (
                    <p className="mt-1 text-sm text-gray-700 italic">
                      "{endorsement.recommendation_text}"
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(endorsement.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

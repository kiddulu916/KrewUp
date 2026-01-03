'use client';

import { useReferences } from '../../hooks/use-references';
import { Loader2, UserCheck, Mail, Building2 } from 'lucide-react';

type ReferencesTabProps = {
  userId: string;
};

export function ReferencesTab({ userId }: ReferencesTabProps) {
  const { data: references, isLoading, error } = useReferences(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-krewup-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load references</p>
      </div>
    );
  }

  if (!references || references.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
        <UserCheck className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600">No references added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {references.map((reference) => (
        <div
          key={reference.id}
          className="rounded-lg border border-gray-200 bg-white p-6"
        >
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-light-blue">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {reference.name}
              </h3>
              <p className="mt-1 text-lg text-gray-700">{reference.relationship}</p>

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                {reference.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span>{reference.company}</span>
                  </div>
                )}
                {(reference.email || reference.phone) && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="italic text-gray-500">Contact information available upon request</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

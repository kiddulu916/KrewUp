'use client';

import { UserCheck } from 'lucide-react';

type ReferencesTabProps = {
  userId: string;
};

export function ReferencesTab({ userId }: ReferencesTabProps) {
  // References feature not yet implemented
  // This is a placeholder component

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
      <UserCheck className="h-12 w-12 text-gray-400" />
      <p className="mt-2 text-gray-600">References feature coming soon</p>
      <p className="mt-1 text-sm text-gray-500">
        Professional references will be displayed here
      </p>
    </div>
  );
}

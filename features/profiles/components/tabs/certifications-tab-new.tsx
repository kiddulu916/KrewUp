'use client';

import { useCredentials } from '../../hooks/use-credentials';
import { CredentialItemNew } from '../credential-item-new';
import { Loader2, Award } from 'lucide-react';

type CertificationsTabNewProps = {
  userId: string;
  isOwner?: boolean;
};

export function CertificationsTabNew({ userId, isOwner = false }: CertificationsTabNewProps) {
  const { data: credentials, isLoading, error } = useCredentials(userId, 'certification');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 motion-safe:animate-spin motion-reduce:animate-none text-krewup-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load certifications</p>
      </div>
    );
  }

  if (!credentials || credentials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
        <Award className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600">No certifications added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {credentials.map((credential) => (
        <CredentialItemNew
          key={credential.id}
          credential={credential}
          isOwner={isOwner}
        />
      ))}
    </div>
  );
}

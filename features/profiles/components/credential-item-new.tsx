'use client';

import { useState } from 'react';
import { Button, Badge, ConfirmDialog } from '@/components/ui';
import { VerificationBadge } from '@/components/common';
import { deleteCredential } from '../actions/credential-actions';
import { useToast } from '@/components/providers/toast-provider';
import { useRouter } from 'next/navigation';
import { format, isPast, parseISO } from 'date-fns';
import { Award, FileText, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import type { Credential } from '../types';

type CredentialItemProps = {
  credential: Credential;
  isOwner?: boolean;
  onEdit?: (credential: Credential) => void;
  onCorrectedPhotoClick?: (credential: Credential) => void;
};

/**
 * Get display name for the credential
 * For certifications: show certification_name
 * For licenses: show classification
 */
function getDisplayName(credential: Credential): string {
  if (credential.credential_type === 'certification') {
    return credential.certification_name || 'Untitled Certification';
  }
  return credential.classification || 'Untitled License';
}

/**
 * Get display number for the credential
 * For certifications: show credential_id
 * For licenses: show license_number
 */
function getDisplayNumber(credential: Credential): string | null {
  if (credential.credential_type === 'certification') {
    return credential.credential_id || null;
  }
  return credential.license_number || null;
}

/**
 * Mask credential number to show only last 4 characters
 */
function maskNumber(number: string): string {
  if (number.length <= 4) {
    return number;
  }
  return `****${number.slice(-4)}`;
}

/**
 * Check if a credential is expired
 */
function isExpired(expirationDate: string | null | undefined): boolean {
  if (!expirationDate) return false;
  try {
    return isPast(parseISO(expirationDate));
  } catch {
    return false;
  }
}

/**
 * Check if the image URL is a PDF
 */
function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
}

/**
 * Get the status badge variant based on verification status and expiration
 */
function getStatusBadge(
  credential: Credential
): { variant: 'warning' | 'success' | 'danger' | 'default'; text: string } | null {
  if (isExpired(credential.expiration_date)) {
    return { variant: 'default', text: 'Expired' };
  }
  return null; // Let VerificationBadge handle pending/verified/rejected
}

export function CredentialItemNew({
  credential,
  isOwner = false,
  onEdit,
  onCorrectedPhotoClick,
}: CredentialItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const displayName = getDisplayName(credential);
  const displayNumber = getDisplayNumber(credential);
  const expired = isExpired(credential.expiration_date);
  const statusBadge = getStatusBadge(credential);
  const isPdfFile = isPdf(credential.image_url);

  // Get holder name (prefer holder_name, fallback to licensee_name for licenses)
  const holderName = credential.holder_name || credential.licensee_name;

  // Get issuer (issuing_organization for certs, issuing_state for licenses)
  const issuer =
    credential.credential_type === 'certification'
      ? credential.issuing_organization
      : credential.issuing_state;

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteCredential(credential.id);

      if (result.success) {
        toast.success(
          `${credential.credential_type === 'certification' ? 'Certification' : 'License'} deleted successfully`
        );
        setShowDeleteConfirm(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete credential');
        setIsDeleting(false);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      setIsDeleting(false);
    }
  };

  const handleCorrectedPhotoClick = () => {
    if (onCorrectedPhotoClick) {
      onCorrectedPhotoClick(credential);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-gray-200 p-4 hover:border-krewup-blue transition-colors bg-white">
        <div className="flex items-start gap-4">
          {/* Left side: Icon, name, and details */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Award icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 shrink-0">
              <Award className="h-5 w-5 text-krewup-blue" />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              {/* Name and verification badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg text-gray-900 truncate">
                  {displayName}
                </h3>
                {!expired && (
                  <VerificationBadge
                    status={credential.verification_status}
                    size="sm"
                  />
                )}
                {statusBadge && (
                  <Badge variant={statusBadge.variant} className="text-xs">
                    {statusBadge.text}
                  </Badge>
                )}
              </div>

              {/* Holder name */}
              {holderName && (
                <p className="text-sm text-gray-600 mt-1">
                  Holder: {holderName}
                </p>
              )}

              {/* Issuer */}
              {issuer && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {credential.credential_type === 'certification'
                    ? `Issued by: ${issuer}`
                    : `State: ${issuer}`}
                </p>
              )}

              {/* Credential number (masked) */}
              {displayNumber && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {credential.credential_type === 'certification' ? 'ID' : 'License #'}:{' '}
                  {maskNumber(displayNumber)}
                </p>
              )}

              {/* Dates */}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-gray-500">
                {credential.issue_date && (
                  <span>Issued: {format(parseISO(credential.issue_date), 'MMM d, yyyy')}</span>
                )}
                {credential.expiration_date && (
                  <span className={expired ? 'text-red-600 font-medium' : ''}>
                    {expired ? 'Expired' : 'Expires'}:{' '}
                    {format(parseISO(credential.expiration_date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Photo thumbnail or PDF icon */}
          <div className="shrink-0">
            {isPdfFile ? (
              <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
            ) : (
              <div className="w-16 h-16 relative rounded-lg overflow-hidden border border-gray-200">
                <Image
                  src={credential.image_url}
                  alt={`${displayName} credential`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            )}
          </div>
        </div>

        {/* Rejection reason box (owner only) */}
        {isOwner &&
          credential.verification_status === 'rejected' &&
          credential.rejection_reason && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Rejection Reason:</p>
                  <p className="text-sm text-red-800 mt-1">{credential.rejection_reason}</p>
                  <Button
                    onClick={handleCorrectedPhotoClick}
                    variant="outline"
                    size="sm"
                    className="mt-3 text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Submit Corrected Photo
                  </Button>
                </div>
              </div>
            </div>
          )}

        {/* Expired prompt (owner only) */}
        {isOwner && expired && credential.verification_status !== 'rejected' && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  This{' '}
                  {credential.credential_type === 'certification' ? 'certification' : 'license'}{' '}
                  has expired. Consider uploading an updated version.
                </p>
                {onEdit && (
                  <Button
                    onClick={() => onEdit(credential)}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Update Credential
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit/Delete buttons (owner only) */}
        {isOwner && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
            {onEdit && (
              <Button
                onClick={() => onEdit(credential)}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="danger"
              size="sm"
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={`Delete ${credential.credential_type === 'certification' ? 'Certification' : 'License'}`}
        message={`Are you sure you want to delete "${displayName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Checkbox } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { CredentialPhotoUpload } from './credential-photo-upload';
import { uploadCredentialPhoto, createCredential } from '../actions/credential-actions';
import { useAsyncAction } from '@/hooks/use-async-action';

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

/**
 * CertificationFormNew Component
 *
 * A form for workers to upload certifications with photo-first approach.
 * The photo is required; metadata fields are optional but help with faster verification.
 *
 * Flow:
 * 1. User selects photo (required)
 * 2. User optionally fills metadata fields
 * 3. On submit: upload photo first, then create credential with credential_type='certification'
 * 4. On success: call onSuccess or navigate to /dashboard/profile?tab=certifications
 */
export function CertificationFormNew({ onSuccess, onCancel }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    holder_name: '',
    certification_name: '',
    issuing_organization: '',
    credential_id: '',
    issue_date: '',
    expiration_date: '',
    no_expiration: false,
  });

  const { execute, isLoading, error } = useAsyncAction({
    showToast: true,
    successMessage:
      'Certification submitted for verification! You\'ll be notified when it\'s reviewed (usually within 24-48 hours).',
    errorMessagePrefix: 'Failed to add certification',
  });

  const handlePhotoChange = (file: File | null, previewUrl: string | null) => {
    setPhotoFile(file);
    setPhotoPreviewUrl(previewUrl);
    setUploadError(null);
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Clear expiration_date when no_expiration is checked
      ...(field === 'no_expiration' && value ? { expiration_date: '' } : {}),
    }));
  };

  const handleSubmit = async () => {
    // Validate photo is selected
    if (!photoFile) {
      setUploadError('Please upload a photo of your certification');
      return;
    }

    await execute(async () => {
      // Step 1: Upload photo
      setIsUploading(true);
      const uploadResult = await uploadCredentialPhoto(photoFile);
      setIsUploading(false);

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Failed to upload photo');
      }

      const imageUrl = uploadResult.data.url;

      // Step 2: Create credential
      const result = await createCredential({
        credential_type: 'certification',
        image_url: imageUrl,
        holder_name: formData.holder_name || undefined,
        certification_name: formData.certification_name || undefined,
        issuing_organization: formData.issuing_organization || undefined,
        credential_id: formData.credential_id || undefined,
        issue_date: formData.issue_date || undefined,
        expiration_date: formData.no_expiration ? undefined : formData.expiration_date || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add certification');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/profile?tab=certifications');
        router.refresh();
      }

      return result;
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/dashboard/profile?tab=certifications');
    }
  };

  const displayError = uploadError || error;
  const isSubmitting = isLoading || isUploading;

  return (
    <div className="space-y-6">
      {/* Photo Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Certification Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a clear photo or scan of your certification document. This is required for verification.
          </p>
          <CredentialPhotoUpload
            value={photoPreviewUrl}
            onChange={handlePhotoChange}
            disabled={isSubmitting}
            error={uploadError || undefined}
          />
        </CardContent>
      </Card>

      {/* Optional Fields Section */}
      <Card>
        <CardHeader>
          <CardTitle>Certification Details (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Providing these details helps speed up the verification process.
          </p>

          <Input
            label="Name on Certificate"
            type="text"
            value={formData.holder_name}
            onChange={handleInputChange('holder_name')}
            placeholder="e.g., John Smith"
            maxLength={100}
            disabled={isSubmitting}
          />

          <Input
            label="Certification Name"
            type="text"
            value={formData.certification_name}
            onChange={handleInputChange('certification_name')}
            placeholder="e.g., OSHA 10-Hour Construction Safety"
            maxLength={200}
            disabled={isSubmitting}
          />

          <Input
            label="Issuing Organization"
            type="text"
            value={formData.issuing_organization}
            onChange={handleInputChange('issuing_organization')}
            placeholder="e.g., OSHA, Red Cross, NCCER"
            maxLength={200}
            disabled={isSubmitting}
          />

          <Input
            label="Credential ID / Certificate Number"
            type="text"
            value={formData.credential_id}
            onChange={handleInputChange('credential_id')}
            placeholder="e.g., 123456789"
            maxLength={100}
            disabled={isSubmitting}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Issue Date"
              type="date"
              value={formData.issue_date}
              onChange={handleInputChange('issue_date')}
              disabled={isSubmitting}
            />

            <div className="space-y-2">
              <Input
                label="Expiration Date"
                type="date"
                value={formData.expiration_date}
                onChange={handleInputChange('expiration_date')}
                min={formData.issue_date || undefined}
                disabled={isSubmitting || formData.no_expiration}
              />
            </div>
          </div>

          <Checkbox
            label="This certification does not expire"
            checked={formData.no_expiration}
            onChange={handleInputChange('no_expiration')}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {displayError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{displayError}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          <strong>Verification Process:</strong> All certifications are reviewed by our team
          within 24-48 hours. You&apos;ll receive a notification once your certification is verified.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="w-full"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          className="w-full"
        >
          {isUploading ? 'Uploading photo...' : isLoading ? 'Submitting...' : 'Submit Certification'}
        </Button>
      </div>
    </div>
  );
}

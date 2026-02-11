'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { CredentialPhotoUpload } from './credential-photo-upload';
import { uploadCredentialPhoto, createCredential } from '../actions/credential-actions';
import { useAsyncAction } from '@/hooks/use-async-action';
import { US_STATES } from '@/lib/constants/licenses';

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

/**
 * LicenseForm Component
 *
 * A form for contractors to upload licenses with photo-first approach.
 * The photo is required; metadata fields are optional but help with faster verification.
 *
 * Flow:
 * 1. User selects photo (required)
 * 2. User optionally fills metadata fields
 * 3. On submit: upload photo first, then create credential with credential_type='license'
 * 4. On success: call onSuccess or navigate to /dashboard/profile?tab=licenses
 */
export function LicenseForm({ onSuccess, onCancel }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    licensee_name: '',
    license_number: '',
    classification: '',
    issuing_state: '',
    issue_date: '',
    expiration_date: '',
  });

  const { execute, isLoading, error } = useAsyncAction({
    showToast: true,
    successMessage:
      'License submitted for verification! You\'ll be notified when it\'s reviewed (usually within 24-48 hours).',
    errorMessagePrefix: 'Failed to add license',
  });

  const handlePhotoChange = (file: File | null, previewUrl: string | null) => {
    setPhotoFile(file);
    setPhotoPreviewUrl(previewUrl);
    setUploadError(null);
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSelectChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    // Validate photo is selected
    if (!photoFile) {
      setUploadError('Please upload a photo of your license');
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
        credential_type: 'license',
        image_url: imageUrl,
        licensee_name: formData.licensee_name || undefined,
        license_number: formData.license_number || undefined,
        classification: formData.classification || undefined,
        issuing_state: formData.issuing_state || undefined,
        issue_date: formData.issue_date || undefined,
        expiration_date: formData.expiration_date || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add license');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/profile?tab=licenses');
        router.refresh();
      }

      return result;
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/dashboard/profile?tab=licenses');
    }
  };

  const displayError = uploadError || error;
  const isSubmitting = isLoading || isUploading;

  return (
    <div className="space-y-6">
      {/* Photo Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>License Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a clear photo or scan of your contractor license. This is required for verification.
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
          <CardTitle>License Details (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Providing these details helps speed up the verification process.
          </p>

          <Input
            label="Name on License"
            type="text"
            value={formData.licensee_name}
            onChange={handleInputChange('licensee_name')}
            placeholder="e.g., John Smith"
            maxLength={100}
            disabled={isSubmitting}
          />

          <Input
            label="License Number"
            type="text"
            value={formData.license_number}
            onChange={handleInputChange('license_number')}
            placeholder="e.g., 12345678"
            maxLength={100}
            disabled={isSubmitting}
          />

          <Input
            label="Classification"
            type="text"
            value={formData.classification}
            onChange={handleInputChange('classification')}
            placeholder="e.g., General Contractor, Electrical, Plumbing"
            maxLength={200}
            disabled={isSubmitting}
          />

          <Select
            label="Issuing State"
            value={formData.issuing_state}
            onChange={handleSelectChange('issuing_state')}
            options={[
              { value: '', label: 'Select a state' },
              ...US_STATES.map((state) => ({ value: state.value, label: state.label })),
            ]}
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

            <Input
              label="Expiration Date"
              type="date"
              value={formData.expiration_date}
              onChange={handleInputChange('expiration_date')}
              min={formData.issue_date || undefined}
              disabled={isSubmitting}
            />
          </div>
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
          <strong>Verification Process:</strong> All licenses are reviewed by our team
          within 24-48 hours. You&apos;ll receive a notification once your license is verified.
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
          {isUploading ? 'Uploading photo...' : isLoading ? 'Submitting...' : 'Submit License'}
        </Button>
      </div>
    </div>
  );
}

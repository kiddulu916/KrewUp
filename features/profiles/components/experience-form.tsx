'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Textarea, Card, CardContent, CardHeader, CardTitle, Checkbox } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { addExperience, updateExperience } from '../actions/experience-actions';
import { experienceSchema, type ExperienceSchema } from '../utils/validation';
import { EXPERIENCE_FIELD_LABELS, type ExperienceLabels } from '../constants/experience-labels';
import { ExperiencePhotoManager } from './experience-photo-manager';
import { ExperiencePhotoStager } from './experience-photo-stager';
import { uploadExperiencePhoto } from '../actions/experience-photo-actions';
import { hasProAccess } from '@/lib/utils/subscription';
import type { Profile } from '@/lib/types/profile.types';

type Props = {
  labels?: ExperienceLabels;
  existingExperience?: {
    id: string;
    job_title: string;
    company: string;
    start_date: string;
    end_date?: string | null;
    is_current?: boolean;
    description?: string | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
  profile?: Profile;
  showPhotoUpload?: boolean;
};

export function ExperienceForm({ labels, existingExperience, onSuccess, onCancel, profile, showPhotoUpload }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [stagedPhotos, setStagedPhotos] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const fieldLabels = labels || EXPERIENCE_FIELD_LABELS.worker;
  const isEditing = !!existingExperience;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExperienceSchema>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      job_title: existingExperience?.job_title || '',
      company_name: existingExperience?.company || '',
      start_date: existingExperience?.start_date || '',
      end_date: existingExperience?.end_date || '',
      is_current: existingExperience?.is_current || false,
      description: existingExperience?.description || '',
    },
  });

  const isCurrent = useWatch({ control, name: 'is_current', defaultValue: false });
  const watchStartDate = useWatch({ control, name: 'start_date', defaultValue: '' });
  const watchDescription = useWatch({ control, name: 'description', defaultValue: '' });

  const onSubmit = async (data: ExperienceSchema) => {
    setError(null);
    setUploadProgress(null);

    try {
      const payload = {
        job_title: data.job_title,
        company: data.company_name,
        start_date: data.start_date,
        end_date: data.is_current ? null : data.end_date,
        is_current: data.is_current,
        description: data.description || undefined,
      };

      const result = isEditing
        ? await updateExperience(existingExperience.id, payload)
        : await addExperience(payload);

      if (!result.success) {
        const errorMsg = result.error || `Failed to ${isEditing ? 'update' : 'add'} work experience`;
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Upload staged photos for new experiences
      if (!isEditing && stagedPhotos.length > 0 && result.data) {
        const experienceId = Array.isArray(result.data) ? result.data[0].id : result.data.id;
        let uploaded = 0;
        let failed = 0;

        for (let i = 0; i < stagedPhotos.length; i++) {
          setUploadProgress(`Uploading photos (${i + 1}/${stagedPhotos.length})...`);
          const formData = new FormData();
          formData.append('file', stagedPhotos[i]);

          const uploadResult = await uploadExperiencePhoto(formData, experienceId);
          if (uploadResult.success) {
            uploaded++;
          } else {
            failed++;
          }
        }

        setUploadProgress(null);

        if (failed > 0 && uploaded > 0) {
          toast.warning(`${fieldLabels.tabTitle} added. ${uploaded} of ${stagedPhotos.length} photos uploaded. Add the rest from the edit page.`);
        } else if (failed > 0 && uploaded === 0) {
          toast.warning(`${fieldLabels.tabTitle} added but photos failed to upload. Try again from the edit page.`);
        } else {
          toast.success(`${fieldLabels.tabTitle} added with ${uploaded} photo${uploaded !== 1 ? 's' : ''} successfully!`);
        }
      } else {
        toast.success(`${fieldLabels.tabTitle} ${isEditing ? 'updated' : 'added'} successfully!`);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/profile?tab=experience');
        router.refresh();
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'add'} work experience`;
      setError(errorMsg);
      toast.error(errorMsg);
      setUploadProgress(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit' : 'Add'} {fieldLabels.tabTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              label={fieldLabels.jobTitle}
              {...register('job_title')}
              placeholder="e.g., Senior Carpenter"
              required
              maxLength={100}
              error={errors.job_title?.message}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Input
              label={fieldLabels.company}
              {...register('company_name')}
              placeholder="e.g., ABC Construction"
              required
              maxLength={100}
              error={errors.company_name?.message}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Start Date"
                type="date"
                {...register('start_date')}
                required
                error={errors.start_date?.message}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Input
                label="End Date"
                type="date"
                {...register('end_date')}
                disabled={isSubmitting || isCurrent}
                error={errors.end_date?.message}
                min={watchStartDate}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_current"
              {...register('is_current')}
              onChange={(e) => {
                register('is_current').onChange(e);
                if (e.target.checked) setValue('end_date', '');
              }}
              className="h-4 w-4 rounded border-gray-300 text-krewup-blue focus:ring-krewup-blue"
              disabled={isSubmitting}
            />
            <label htmlFor="is_current" className="text-sm font-medium text-gray-700">
              {fieldLabels.isCurrent}
            </label>
          </div>

          <div>
            <Textarea
              label={fieldLabels.description}
              {...register('description')}
              placeholder="Describe your responsibilities and achievements..."
              rows={4}
              maxLength={500}
              error={errors.description?.message}
              disabled={isSubmitting}
              helperText={`${(watchDescription || '').length}/500 characters`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Photos - Edit mode: use ExperiencePhotoManager (server upload) */}
      {showPhotoUpload && existingExperience && profile && (
        <Card>
          <CardHeader>
            <CardTitle>Project Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <ExperiencePhotoManager
              experienceId={existingExperience.id}
              profile={profile}
            />
          </CardContent>
        </Card>
      )}

      {/* Project Photos - Create mode: use ExperiencePhotoStager (local staging) */}
      {showPhotoUpload && !existingExperience && profile && (
        <ExperiencePhotoStager
          onPhotosChange={setStagedPhotos}
          isPro={hasProAccess(profile)}
          disabled={isSubmitting}
        />
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || (() => router.push('/dashboard/profile'))}
          className="w-full"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="w-full"
        >
          {isSubmitting
            ? (uploadProgress || (isEditing ? 'Updating...' : 'Adding...'))
            : (isEditing ? 'Update' : 'Add') + ' ' + fieldLabels.tabTitle}
        </Button>
      </div>
    </form>
  );
}

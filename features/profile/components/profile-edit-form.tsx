'use client';

import { useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { LocationAutocomplete } from '@/components/common';
import { TRADES, TRADE_SUBCATEGORIES, EMPLOYER_TYPES } from '@/lib/constants';
import { updateProfile } from '@/features/profiles/actions/profile-actions';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/providers/toast-provider';
import { ProfileAvatarUpload } from '@/features/profiles/components/profile-avatar-upload';
import { uploadProfilePicture } from '@/features/profiles/actions/profile-picture-actions';
import { profileSchema, type ProfileSchema } from '@/features/profiles/utils/validation';
import { useCsrfToken } from '@/components/providers/csrf-provider';
import type { ProfileWithWorkerData } from '@/lib/types/profile.types';

type Props = {
  profile: ProfileWithWorkerData;
  formRef?: RefObject<HTMLFormElement | null>;
};

export function ProfileEditForm({ profile, formRef }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<File | null>(null);
  const csrfToken = useCsrfToken();
  const toast = useToast();

  // User type detection
  const isWorker = profile.role === 'worker';
  const isEmployer = profile.role === 'employer';
  const isHomeowner = isEmployer && profile.employer_type === 'homeowner';
  const showCompanyFields = isEmployer && !isHomeowner;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name || '',
      email: profile.email || '',
      trade: profile.trade || '',
      sub_trade: profile.sub_trade || '',
      location: profile.location || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      employer_type: profile.employer_type || '',
      company_name: profile.company_name || '',
    },
  });

  // * React Hook Form's watch() function cannot be memoized by React Compiler
  // * This is a known limitation and safe to disable
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchTrade = watch('trade');

  async function onSubmit(data: ProfileSchema) {
    setError('');

    try {
      // Check if email has changed
      const emailChanged = data.email !== profile.email;

      if (emailChanged) {
        const supabase = createClient();
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email,
        });

        if (emailError) {
          toast.error('Failed to update email: ' + emailError.message);
          return;
        }

        toast.info('Verification email sent to ' + data.email);
      }

      // Upload profile picture first if selected
      let profileImageUrl = profile.profile_image_url;
      if (selectedProfilePicture) {
        const uploadResult = await uploadProfilePicture(selectedProfilePicture);
        if (!uploadResult.success) {
          setError(uploadResult.error || 'Failed to upload profile picture');
          return;
        }
        profileImageUrl = uploadResult.url;
      }

      // Update other profile fields (email stays unchanged until verified)
      const { email: _email, ...profileData } = data;
      const result = await updateProfile({
        ...profileData,
        profile_image_url: profileImageUrl,
        employer_type: profileData.employer_type as 'contractor' | 'recruiter' | undefined,
        csrfToken: csrfToken || '',
      });

      if (!result.success) {
        setError(result.error || 'Failed to update profile');
      }
      // If successful, user will be redirected by the action
    } catch (err) {
      setError('An unexpected error occurred');
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Top section: Avatar (left) + stacked fields (right) */}
      <div className="flex flex-col sm:flex-row gap-6">
        <ProfileAvatarUpload
          currentImageUrl={profile.profile_image_url}
          userName={profile.name}
          userId={profile.id}
          onImageSelected={(file) => setSelectedProfilePicture(file)}
          disabled={isSubmitting}
        />

        <div className="flex-1 space-y-4">
          <Input
            label="Full Name"
            type="text"
            {...register('name')}
            required
            disabled={isSubmitting}
            error={errors.name?.message}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="(555)123-4567"
            {...register('phone')}
            disabled={isSubmitting}
            error={errors.phone?.message}
          />

          <Input
            label="Email"
            type="email"
            {...register('email')}
            disabled={isSubmitting}
            error={errors.email?.message}
            helperText="Changing your email requires verification via the new address"
          />
        </div>
      </div>

      {/* Company fields - only for contractors/developers/recruiters */}
      {showCompanyFields && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Input
            label="Company Name"
            type="text"
            {...register('company_name')}
            disabled={isSubmitting}
            error={errors.company_name?.message}
          />

          <Select
            label="Employer Type"
            options={EMPLOYER_TYPES.filter((type) => type !== 'homeowner').map((type) => ({
              value: type,
              label: type.charAt(0).toUpperCase() + type.slice(1)
            }))}
            {...register('employer_type')}
            required
            disabled={isSubmitting}
            error={errors.employer_type?.message}
          />
        </div>
      )}

      {/* Trade/Sub-Trade/Location - 3-column grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Controller
          control={control}
          name="trade"
          render={({ field }) => (
            <Select
              {...field}
              label="Trade"
              options={TRADES.map((trade) => ({ value: trade, label: trade }))}
              required
              disabled={isSubmitting}
              error={errors.trade?.message}
              onChange={(e) => {
                field.onChange(e.target.value);
                setValue('sub_trade', '');
              }}
            />
          )}
        />

        <Select
          label="Specialty (Optional)"
          options={
            watchTrade && TRADE_SUBCATEGORIES[watchTrade]
              ? TRADE_SUBCATEGORIES[watchTrade].map((subTrade) => ({
                  value: subTrade,
                  label: subTrade,
                }))
              : []
          }
          {...register('sub_trade')}
          disabled={isSubmitting || !watchTrade || !TRADE_SUBCATEGORIES[watchTrade]}
          error={errors.sub_trade?.message}
        />

        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <LocationAutocomplete
              label="Location"
              placeholder="City, State"
              value={field.value}
              onChange={(data) => {
                field.onChange(data.address);
                setValue('coords', data.coords);
              }}
              helperText="Your location helps match you with nearby opportunities"
              required
              disabled={isSubmitting}
              error={errors.location?.message}
            />
          )}
        />
      </div>

      <div>
        <Textarea
          label="Bio"
          className="flex min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Tell employers about your experience and skills..."
          {...register('bio')}
          disabled={isSubmitting}
          error={errors.bio?.message}
          helperText="Briefly describe your experience, skills, and what you're looking for"
          maxLength={500}
          showCharCount
        />
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}

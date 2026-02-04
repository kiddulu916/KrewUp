# Profile Edit Page Expansion - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the profile edit page with a full-featured Basic Info tab and make the Experience section available to all user types (except homeowners).

**Architecture:** Modify existing components (`profile-edit-tabs.tsx`, `profile-edit-form.tsx`) to add conditional field visibility based on user type. Create a constants file for dynamic experience labels. Update experience components and actions to support all non-homeowner user types.

**Tech Stack:** React, TypeScript, react-hook-form, Zod, Tailwind CSS, Supabase

---

## Task 1: Create Experience Labels Constants

**Files:**

- Create: `features/profiles/constants/experience-labels.ts`

**Step 1: Create the constants file**

```typescript
// features/profiles/constants/experience-labels.ts

export type UserType =
  | "worker"
  | "contractor"
  | "developer"
  | "recruiter"
  | "homeowner";

export type ExperienceLabels = {
  jobTitle: string;
  company: string;
  description: string;
  isCurrent: string;
  tabTitle: string;
  addButton: string;
  emptyState: string;
};

export const EXPERIENCE_FIELD_LABELS: Record<
  Exclude<UserType, "homeowner">,
  ExperienceLabels
> = {
  worker: {
    jobTitle: "Job Title",
    company: "Company",
    description: "Description",
    isCurrent: "I currently work here",
    tabTitle: "Work Experience",
    addButton: "Add Experience",
    emptyState: "No experiences added yet",
  },
  contractor: {
    jobTitle: "Project Name",
    company: "Client",
    description: "Project Details",
    isCurrent: "Ongoing project",
    tabTitle: "Projects",
    addButton: "Add Project",
    emptyState: "No projects added yet",
  },
  developer: {
    jobTitle: "Project Name",
    company: "Company",
    description: "Project Details",
    isCurrent: "Ongoing project",
    tabTitle: "Projects",
    addButton: "Add Project",
    emptyState: "No projects added yet",
  },
  recruiter: {
    jobTitle: "Role",
    company: "Agency",
    description: "Specialization",
    isCurrent: "I currently work here",
    tabTitle: "Experience",
    addButton: "Add Experience",
    emptyState: "No experiences added yet",
  },
};

/**
 * Get experience labels for a user based on their role and employer_type
 */
export function getExperienceLabels(
  role: "worker" | "employer",
  employerType?: "contractor" | "developer" | "recruiter" | "homeowner" | null,
): ExperienceLabels | null {
  if (role === "worker") {
    return EXPERIENCE_FIELD_LABELS.worker;
  }

  if (role === "employer") {
    // Homeowners don't have experience section
    if (employerType === "homeowner" || !employerType) {
      return null;
    }
    return EXPERIENCE_FIELD_LABELS[employerType];
  }

  return null;
}

/**
 * Check if a user type can have experiences
 */
export function canHaveExperiences(
  role: "worker" | "employer",
  employerType?: "contractor" | "developer" | "recruiter" | "homeowner" | null,
): boolean {
  if (role === "worker") return true;
  if (role === "employer" && employerType && employerType !== "homeowner")
    return true;
  return false;
}
```

**Step 2: Verify the file was created**

Run: `cat features/profiles/constants/experience-labels.ts | head -20`

**Step 3: Commit**

```bash
git add features/profiles/constants/experience-labels.ts
git commit -m "feat(profiles): add experience labels constants for dynamic field labels"
```

---

## Task 2: Update Profile Edit Form Layout

**Files:**

- Modify: `features/profile/components/profile-edit-form.tsx`

**Step 1: Update the form with new 2-column layout**

The form needs to be restructured with:

- Top section: Avatar (left) + stacked fields (right)
- Conditional fields based on user type
- 3-column grid for trade/sub_trade/location

Replace the entire form component:

```typescript
// features/profile/components/profile-edit-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { LocationAutocomplete } from '@/components/common';
import { TRADES, TRADE_SUBCATEGORIES, EMPLOYER_TYPES } from '@/lib/constants';
import { updateProfile } from '@/features/profiles/actions/profile-actions';
import { ProfileAvatarUpload } from '@/features/profiles/components/profile-avatar-upload';
import { uploadProfilePicture } from '@/features/profiles/actions/profile-picture-actions';
import { profileSchema, type ProfileSchema } from '@/features/profiles/utils/validation';
import { useCsrfToken } from '@/components/providers/csrf-provider';
import type { ProfileWithWorkerData } from '@/lib/types/profile.types';

type Props = {
  profile: ProfileWithWorkerData;
};

export function ProfileEditForm({ profile }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<File | null>(null);
  const csrfToken = useCsrfToken();

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
      trade: profile.trade || '',
      sub_trade: profile.sub_trade || '',
      location: profile.location || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      employer_type: profile.employer_type || '',
      company_name: profile.company_name || '',
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchTrade = watch('trade');

  async function onSubmit(data: ProfileSchema) {
    setError('');

    try {
      let profileImageUrl = profile.profile_image_url;
      if (selectedProfilePicture) {
        const uploadResult = await uploadProfilePicture(selectedProfilePicture);
        if (!uploadResult.success) {
          setError(uploadResult.error || 'Failed to upload profile picture');
          return;
        }
        profileImageUrl = uploadResult.url;
      }

      const result = await updateProfile({
        ...data,
        profile_image_url: profileImageUrl,
        employer_type: data.employer_type as 'contractor' | 'recruiter' | 'developer' | 'homeowner' | undefined,
        csrfToken: csrfToken || '',
      });

      if (!result.success) {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Top Section: Avatar + Basic Fields */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Left: Avatar */}
        <div className="flex-shrink-0">
          <ProfileAvatarUpload
            currentImageUrl={profile.profile_image_url}
            userName={profile.name}
            userId={profile.id}
            onImageSelected={(file) => setSelectedProfilePicture(file)}
            disabled={isSubmitting}
            size="lg"
          />
        </div>

        {/* Right: Stacked Fields */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            type="text"
            {...register('name')}
            required
            disabled={isSubmitting}
            error={errors.name?.message}
          />

          {showCompanyFields && (
            <Input
              label="Company Name"
              type="text"
              {...register('company_name')}
              placeholder="Your company or business name"
              disabled={isSubmitting}
              error={errors.company_name?.message}
            />
          )}

          {showCompanyFields && (
            <Select
              label="Employer Type"
              options={EMPLOYER_TYPES.filter(t => t !== 'homeowner').map((type) => ({
                value: type,
                label: type.charAt(0).toUpperCase() + type.slice(1)
              }))}
              {...register('employer_type')}
              required
              disabled={isSubmitting}
              error={errors.employer_type?.message}
            />
          )}

          <Input
            label="Phone Number"
            type="tel"
            placeholder="(555)123-4567"
            {...register('phone')}
            disabled={isSubmitting}
            error={errors.phone?.message}
          />
        </div>
      </div>

      {/* Middle Section: Trade, Sub-Trade, Location (3-column grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Controller
          control={control}
          name="trade"
          render={({ field }) => (
            <Select
              {...field}
              label="Primary Trade"
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
          label="Sub-Trade"
          options={
            watchTrade && TRADE_SUBCATEGORIES[watchTrade]
              ? TRADE_SUBCATEGORIES[watchTrade].map((subTrade) => ({
                  value: subTrade,
                  label: subTrade,
                }))
              : []
          }
          {...register('sub_trade')}
          disabled={isSubmitting || !watchTrade}
          error={errors.sub_trade?.message}
          placeholder={watchTrade ? 'Select specialty...' : 'Select trade first'}
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
              required
              disabled={isSubmitting}
              error={errors.location?.message}
            />
          )}
        />
      </div>

      {/* Bio Section */}
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

      {/* Action Buttons */}
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
```

**Step 2: Verify syntax**

Run: `npx tsc --noEmit features/profile/components/profile-edit-form.tsx`

**Step 3: Commit**

```bash
git add features/profile/components/profile-edit-form.tsx
git commit -m "feat(profile): update edit form with 2-column layout and conditional fields"
```

---

## Task 3: Update Profile Edit Tabs with Conditional Visibility

**Files:**

- Modify: `features/profile/components/profile-edit-tabs.tsx`

**Step 1: Update tabs component with conditional tab visibility and Tools Owned section**

```typescript
// features/profile/components/profile-edit-tabs.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProfileWithWorkerData } from '@/lib/types/profile.types';
import { LazyPortfolioManager } from '@/features/portfolio/components/lazy-portfolio';
import { ToolsSelector } from '@/features/profile/components/tools-selector';
import { ProfileEditForm } from '@/features/profile/components/profile-edit-form';
import { ExperienceList } from '@/features/profiles/components/experience-list';
import { updateToolsOwned } from '@/features/profiles/actions/profile-actions';
import { useToast } from '@/components/providers/toast-provider';
import { Briefcase, Image as ImageIcon, Award, User } from 'lucide-react';
import { useCsrfToken } from '@/components/providers/csrf-provider';
import { canHaveExperiences, getExperienceLabels } from '@/features/profiles/constants/experience-labels';

export interface ProfileEditTabsProps {
  profile: ProfileWithWorkerData;
  experiences?: Array<{
    id: string;
    job_title: string;
    company: string;
    start_date: string;
    end_date?: string | null;
    description?: string | null;
  }>;
}

type TabId = 'basic' | 'portfolio' | 'experience' | 'certifications';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function ProfileEditTabs({ profile, experiences = [] }: ProfileEditTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isSavingTools, setIsSavingTools] = useState(false);
  const csrfToken = useCsrfToken();

  const isWorker = profile.role === 'worker';
  const showExperienceTab = canHaveExperiences(profile.role, profile.employer_type);
  const experienceLabels = getExperienceLabels(profile.role, profile.employer_type);

  // Build tabs array based on user type
  const tabs: Tab[] = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
    ...(showExperienceTab ? [{ id: 'experience' as TabId, label: experienceLabels?.tabTitle || 'Experience', icon: Briefcase }] : []),
    { id: 'certifications', label: 'Certifications', icon: Award },
  ];

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabId;
    if (tabParam && tabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, tabs]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleToolsChange = async (hasTools: boolean, toolsOwned: string[]) => {
    setIsSavingTools(true);
    try {
      const result = await updateToolsOwned(hasTools, toolsOwned, csrfToken || '');
      if (result.success) {
        toast.success('Tools updated successfully');
      } else {
        toast.error(result.error || 'Failed to update tools');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSavingTools(false);
    }
  };

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Profile editing tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'border-krewup-blue text-krewup-blue'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${tab.label} tab`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
              <p className="mt-1 text-sm text-gray-600">
                Update your profile information.
              </p>
            </div>

            {/* Profile Edit Form */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <ProfileEditForm profile={profile} />
            </div>

            {/* Tools Selector - Workers only */}
            {isWorker && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Tools Owned</h3>
                <ToolsSelector
                  hasTools={profile.has_tools || false}
                  toolsOwned={profile.tools_owned || []}
                  primaryTrade={profile.trade || undefined}
                  onChange={handleToolsChange}
                />
                {isSavingTools && (
                  <p className="mt-4 text-sm text-gray-500">Saving tools...</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
              <p className="mt-1 text-sm text-gray-600">
                Upload and manage your work photos. Free users can upload up to 5 photos, Pro users have unlimited uploads.
              </p>
            </div>

            <LazyPortfolioManager profile={profile} />
          </div>
        )}

        {activeTab === 'experience' && showExperienceTab && experienceLabels && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{experienceLabels.tabTitle}</h2>
              <p className="mt-1 text-sm text-gray-600">
                Add and manage your {experienceLabels.tabTitle.toLowerCase()}.
              </p>
            </div>

            <ExperienceList
              experiences={experiences}
              labels={experienceLabels}
              isEditMode={true}
              userRole={profile.role}
              employerType={profile.employer_type}
            />
          </div>
        )}

        {activeTab === 'certifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Certifications</h2>
              <p className="mt-1 text-sm text-gray-600">
                Upload your licenses and certifications for verification.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
              <Award className="h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">Certification upload coming soon</p>
              <p className="mt-1 text-sm text-gray-500">
                You&apos;ll be able to upload and manage your certifications here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify syntax**

Run: `npx tsc --noEmit features/profile/components/profile-edit-tabs.tsx`

**Step 3: Commit**

```bash
git add features/profile/components/profile-edit-tabs.tsx
git commit -m "feat(profile): add conditional tab visibility and tools owned section"
```

---

## Task 4: Create Experience List Component

**Files:**

- Create: `features/profiles/components/experience-list.tsx`

**Step 1: Create the ExperienceList component with edit/delete and pending delete functionality**

```typescript
// features/profiles/components/experience-list.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ConfirmDialog } from '@/components/ui';
import { Plus, Pencil, Trash2, Undo2 } from 'lucide-react';
import { deleteExperience } from '../actions/experience-actions';
import { useToast } from '@/components/providers/toast-provider';
import type { ExperienceLabels } from '../constants/experience-labels';

type Experience = {
  id: string;
  job_title: string;
  company: string;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
};

type Props = {
  experiences: Experience[];
  labels: ExperienceLabels;
  isEditMode: boolean;
  userRole: 'worker' | 'employer';
  employerType?: 'contractor' | 'developer' | 'recruiter' | 'homeowner' | null;
};

export function ExperienceList({ experiences, labels, isEditMode, userRole, employerType }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddClick = () => {
    router.push('/dashboard/profile/experience');
  };

  const handleEditClick = (id: string) => {
    router.push(`/dashboard/profile/experience/${id}`);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    // Add to pending deletes (soft delete UI)
    setPendingDeletes(prev => new Set(prev).add(confirmDelete));
    setConfirmDelete(null);
    toast.success('Experience marked for deletion. Click "Undo" to restore.');
  };

  const handleUndo = (id: string) => {
    setPendingDeletes(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success('Experience restored.');
  };

  const handleSaveChanges = async () => {
    if (pendingDeletes.size === 0) return;

    setIsDeleting(true);
    const errors: string[] = [];

    for (const id of pendingDeletes) {
      const result = await deleteExperience(id);
      if (!result.success) {
        errors.push(result.error || 'Failed to delete experience');
      }
    }

    setIsDeleting(false);

    if (errors.length > 0) {
      toast.error(`Some deletions failed: ${errors.join(', ')}`);
    } else {
      toast.success('Changes saved successfully.');
      setPendingDeletes(new Set());
      router.refresh();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const visibleExperiences = experiences.filter(exp => !pendingDeletes.has(exp.id));
  const deletedExperiences = experiences.filter(exp => pendingDeletes.has(exp.id));

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {visibleExperiences.length} {visibleExperiences.length === 1 ? 'entry' : 'entries'}
        </span>
        {isEditMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddClick}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {labels.addButton}
          </Button>
        )}
      </div>

      {/* Experience List */}
      {visibleExperiences.length === 0 && deletedExperiences.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
          <p className="text-gray-600">{labels.emptyState}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Experiences */}
          {visibleExperiences.map((exp) => (
            <div
              key={exp.id}
              className="rounded-lg border border-gray-200 bg-white p-4 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{exp.job_title}</h3>
                  <p className="text-sm text-gray-600">{exp.company}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : 'Present'}
                  </p>
                  {exp.description && (
                    <p className="mt-2 text-sm text-gray-700 line-clamp-2">{exp.description}</p>
                  )}
                </div>
                {isEditMode && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(exp.id)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(exp.id)}
                      aria-label="Delete"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Pending Delete Experiences */}
          {deletedExperiences.map((exp) => (
            <div
              key={exp.id}
              className="rounded-lg border border-gray-200 bg-gray-100 p-4 opacity-60"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-500 line-through">{exp.job_title}</h3>
                  <p className="text-sm text-gray-400 line-through">{exp.company}</p>
                  <p className="text-xs text-red-500 mt-1">Pending deletion</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUndo(exp.id)}
                  className="flex items-center gap-1"
                >
                  <Undo2 className="h-4 w-4" />
                  Undo
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Changes Button (when there are pending deletes) */}
      {pendingDeletes.size > 0 && (
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            variant="primary"
            onClick={handleSaveChanges}
            isLoading={isDeleting}
          >
            Save Changes ({pendingDeletes.size} deletion{pendingDeletes.size > 1 ? 's' : ''})
          </Button>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Experience"
        message="Are you sure you want to delete this experience? You can undo this action before saving changes."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
```

**Step 2: Verify syntax**

Run: `npx tsc --noEmit features/profiles/components/experience-list.tsx`

**Step 3: Commit**

```bash
git add features/profiles/components/experience-list.tsx
git commit -m "feat(profiles): add ExperienceList component with pending delete functionality"
```

---

## Task 5: Update Experience Form with Dynamic Labels

**Files:**

- Modify: `features/profiles/components/experience-form.tsx`

**Step 1: Update form to accept labels prop and use dynamic field labels**

```typescript
// features/profiles/components/experience-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Textarea, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { addExperience, updateExperience } from '../actions/experience-actions';
import { experienceSchema, type ExperienceSchema } from '../utils/validation';
import type { ExperienceLabels } from '../constants/experience-labels';
import { EXPERIENCE_FIELD_LABELS } from '../constants/experience-labels';

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
};

export function ExperienceForm({ labels, existingExperience, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  // Default to worker labels if not provided
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
        const errorMsg = result.error || `Failed to ${isEditing ? 'update' : 'add'} experience`;
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      toast.success(`Experience ${isEditing ? 'updated' : 'added'} successfully!`);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/profile?tab=experience');
        router.refresh();
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'add'} experience`;
      setError(errorMsg);
      toast.error(errorMsg);
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
              placeholder={`e.g., ${fieldLabels.jobTitle === 'Job Title' ? 'Senior Carpenter' : fieldLabels.jobTitle === 'Project Name' ? 'Downtown Office Complex' : 'Senior Recruiter'}`}
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
              placeholder={`e.g., ${fieldLabels.company === 'Company' ? 'ABC Construction' : fieldLabels.company === 'Client' ? 'Smith Development Corp' : 'ABC Staffing Agency'}`}
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
              placeholder={`Describe your ${fieldLabels.description.toLowerCase()}...`}
              rows={4}
              maxLength={500}
              error={errors.description?.message}
              disabled={isSubmitting}
              helperText={`${(watchDescription || '').length}/500 characters`}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || (() => router.push('/dashboard/profile?tab=experience'))}
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
          {isSubmitting ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update' : 'Add')} {fieldLabels.tabTitle.replace(/s$/, '')}
        </Button>
      </div>
    </form>
  );
}
```

**Step 2: Verify syntax**

Run: `npx tsc --noEmit features/profiles/components/experience-form.tsx`

**Step 3: Commit**

```bash
git add features/profiles/components/experience-form.tsx
git commit -m "feat(profiles): update ExperienceForm with dynamic labels and edit support"
```

---

## Task 6: Add updateExperience Action

**Files:**

- Modify: `features/profiles/actions/experience-actions.ts`

**Step 1: Add the updateExperience function to support editing**

Add after the `addExperience` function:

```typescript
/**
 * Update existing work experience
 */
export async function updateExperience(
  experienceId: string,
  data: ExperienceData,
): Promise<ExperienceResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate required fields
  if (!data.job_title || data.job_title.trim().length === 0) {
    return { success: false, error: "Job title is required" };
  }

  if (!data.company || data.company.trim().length === 0) {
    return { success: false, error: "Company name is required" };
  }

  if (!data.start_date) {
    return { success: false, error: "Start date is required" };
  }

  // Validate dates
  if (!data.is_current && !data.end_date) {
    return {
      success: false,
      error: "End date is required if not current position",
    };
  }

  if (data.end_date && new Date(data.end_date) < new Date(data.start_date)) {
    return { success: false, error: "End date cannot be before start date" };
  }

  // Update experience (only if owned by user)
  const { data: experience, error: updateError } = await supabase
    .from("experiences")
    .update({
      job_title: data.job_title.trim(),
      company: data.company.trim(),
      start_date: data.start_date,
      end_date: data.is_current ? null : data.end_date || null,
      is_current: data.is_current || false,
      description: data.description?.trim() || null,
    })
    .eq("id", experienceId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    logger.error("Update experience error", {
      experienceId,
      errorCode: updateError.code,
      errorMessage: updateError.message,
    });
    return { success: false, error: "Failed to update work experience" };
  }

  revalidatePath("/dashboard/profile");

  return { success: true, data: experience };
}

/**
 * Get a single experience by ID
 */
export async function getExperienceById(
  experienceId: string,
): Promise<ExperienceResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("id", experienceId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    logger.error("Get experience by ID error", {
      experienceId,
      errorMessage: error.message,
    });
    return { success: false, error: "Failed to get work experience" };
  }

  return { success: true, data };
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit features/profiles/actions/experience-actions.ts`

**Step 3: Commit**

```bash
git add features/profiles/actions/experience-actions.ts
git commit -m "feat(profiles): add updateExperience and getExperienceById actions"
```

---

## Task 7: Update Experience Page for All User Types

**Files:**

- Modify: `app/dashboard/profile/experience/page.tsx`

**Step 1: Remove worker-only restriction and pass dynamic labels**

```typescript
// app/dashboard/profile/experience/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ExperienceForm } from '@/features/profiles/components/experience-form';
import { getExperienceLabels, canHaveExperiences } from '@/features/profiles/constants/experience-labels';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Add Experience - KrewUp',
  description: 'Add experience to your profile',
};

export default async function AddExperiencePage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, employer_type')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/dashboard/profile');
  }

  // Check if this user type can have experiences
  const canHaveExp = canHaveExperiences(profile.role, profile.employer_type);
  if (!canHaveExp) {
    redirect('/dashboard/profile');
  }

  const labels = getExperienceLabels(profile.role, profile.employer_type);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">
          Add {labels?.tabTitle || 'Experience'}
        </h1>
        <p className="mt-2 text-gray-600">
          {profile.role === 'worker'
            ? 'Showcase your work history and skills'
            : profile.employer_type === 'recruiter'
              ? 'Add your recruiting experience'
              : 'Add your projects and client work'}
        </p>
      </div>

      <ExperienceForm labels={labels || undefined} />
    </div>
  );
}
```

**Step 2: Verify syntax**

Run: `npx tsc --noEmit app/dashboard/profile/experience/page.tsx`

**Step 3: Commit**

```bash
git add app/dashboard/profile/experience/page.tsx
git commit -m "feat(profile): update experience page for all user types"
```

---

## Task 8: Create Edit Experience Page

**Files:**

- Create: `app/dashboard/profile/experience/[id]/page.tsx`

**Step 1: Create the edit experience page**

```typescript
// app/dashboard/profile/experience/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ExperienceForm } from '@/features/profiles/components/experience-form';
import { getExperienceLabels, canHaveExperiences } from '@/features/profiles/constants/experience-labels';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Edit Experience - KrewUp',
  description: 'Edit your experience',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditExperiencePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, employer_type')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/dashboard/profile');
  }

  // Check if this user type can have experiences
  const canHaveExp = canHaveExperiences(profile.role, profile.employer_type);
  if (!canHaveExp) {
    redirect('/dashboard/profile');
  }

  // Fetch the experience
  const { data: experience, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !experience) {
    notFound();
  }

  const labels = getExperienceLabels(profile.role, profile.employer_type);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">
          Edit {labels?.tabTitle || 'Experience'}
        </h1>
        <p className="mt-2 text-gray-600">
          Update your {labels?.tabTitle?.toLowerCase() || 'experience'} details
        </p>
      </div>

      <ExperienceForm
        labels={labels || undefined}
        existingExperience={experience}
      />
    </div>
  );
}
```

**Step 2: Verify syntax**

Run: `npx tsc --noEmit app/dashboard/profile/experience/[id]/page.tsx`

**Step 3: Commit**

```bash
git add app/dashboard/profile/experience/[id]/page.tsx
git commit -m "feat(profile): add edit experience page"
```

---

## Task 9: Update Profile Edit Page to Pass Experiences

**Files:**

- Modify: `app/dashboard/profile/edit/page.tsx`

**Step 1: Fetch and pass experiences to ProfileEditTabs**

First, read the current file to understand its structure, then update it to fetch experiences.

The page should:

1. Fetch the user's experiences from the database
2. Pass them to the ProfileEditTabs component

```typescript
// Add to the existing page.tsx after fetching profile data:

// Fetch user's experiences
const { data: experiences } = await supabase
  .from('experiences')
  .select('id, job_title, company, start_date, end_date, description')
  .eq('user_id', user.id)
  .order('start_date', { ascending: false });

// Then pass to component:
<ProfileEditTabs profile={profile} experiences={experiences || []} />
```

**Step 2: Verify the page compiles**

Run: `npx tsc --noEmit app/dashboard/profile/edit/page.tsx`

**Step 3: Commit**

```bash
git add app/dashboard/profile/edit/page.tsx
git commit -m "feat(profile): fetch and pass experiences to edit tabs"
```

---

## Task 10: Run Type Check and Lint

**Step 1: Run TypeScript type check**

Run: `npm run type-check`
Expected: No errors

**Step 2: Run ESLint**

Run: `npm run lint`
Expected: No errors or warnings

**Step 3: Fix any issues that arise**

If there are type errors or lint issues, fix them before proceeding.

---

## Task 11: Run Tests

**Step 1: Run unit tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run E2E tests for profile**

Run: `npx playwright test e2e/profile.spec.ts`
Expected: All tests pass

---

## Task 12: Final Verification and Commit

**Step 1: Test manually in browser**

1. Log in as a worker - verify Basic Info tab shows all fields + Tools Owned
2. Log in as a contractor - verify Basic Info shows Company Name and Employer Type, Experience tab uses "Project Name" / "Client" labels
3. Log in as a homeowner - verify no Experience tab visible, no Tools Owned
4. Test adding, editing, and deleting experiences
5. Test the pending delete + undo functionality

**Step 2: Create final commit if needed**

```bash
git add -A
git commit -m "feat(profile): complete profile edit expansion

- Add full Basic Info tab with conditional field visibility
- Add Experience section for workers, contractors, developers, recruiters
- Dynamic field labels based on user type
- Pending delete with undo functionality
- Edit experience support"
```

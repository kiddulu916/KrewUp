'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProfileWithWorkerData } from '@/lib/types/profile.types';
import { LazyPortfolioManager } from '@/features/portfolio/components/lazy-portfolio';
import { ToolsSelector } from '@/features/profile/components/tools-selector';
import { ProfileEditForm } from './profile-edit-form';
import { ExperienceList } from '@/features/profiles/components/experience-list';
import { canHaveExperiences, getExperienceLabels } from '@/features/profiles/constants/experience-labels';
import { updateToolsOwned } from '@/features/profiles/actions/profile-actions';
import { useToast } from '@/components/providers/toast-provider';
import { Briefcase, Image as ImageIcon, Award, User, Shield } from 'lucide-react';
import { CertificationFormNew } from '@/features/profiles/components/certification-form-new';
import { LicenseForm } from '@/features/profiles/components/license-form';
import { CertificationsTabNew } from '@/features/profiles/components/tabs/certifications-tab-new';
import { LicensesTab } from '@/features/profiles/components/tabs/licenses-tab';
import { useCsrfToken } from '@/components/providers/csrf-provider';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog';

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

type TabId = 'basic' | 'portfolio' | 'experience' | 'certifications' | 'licenses';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function ProfileEditTabs({ profile, experiences = [] }: ProfileEditTabsProps) {
  // User type detection
  const isWorker = profile.role === 'worker';
  const isEmployer = profile.role === 'employer';
  const isContractor = isEmployer && profile.employer_type === 'contractor';
  const showExperienceTab = canHaveExperiences(profile.role, profile.employer_type);
  const experienceLabels = getExperienceLabels(profile.role, profile.employer_type);

  // Portfolio tab is only shown for workers (employers use project photos instead)
  const showPortfolioTab = !isEmployer;
  // Only workers see certifications tab
  const showCertificationsTab = isWorker;
  // Only contractors see licenses tab
  const showLicensesTab = isContractor;

  // Build tabs array conditionally (memoized for useEffect dependency)
  const tabs: Tab[] = useMemo(() => [
    { id: 'basic', label: 'Basic Info', icon: User },
    ...(showPortfolioTab ? [{ id: 'portfolio' as TabId, label: 'Portfolio', icon: ImageIcon }] : []),
    ...(showExperienceTab ? [{ id: 'experience' as TabId, label: experienceLabels?.tabTitle || 'Experience', icon: Briefcase }] : []),
    ...(showCertificationsTab ? [{ id: 'certifications' as TabId, label: 'Certifications', icon: Award }] : []),
    ...(showLicensesTab ? [{ id: 'licenses' as TabId, label: 'Licenses', icon: Shield }] : []),
  ], [showPortfolioTab, showExperienceTab, showCertificationsTab, showLicensesTab, experienceLabels?.tabTitle]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isSavingTools, setIsSavingTools] = useState(false);
  const csrfToken = useCsrfToken();

  // Unsaved changes guard
  const formRef = useRef<HTMLFormElement>(null);
  const { checkDirty, resetDirty } = useUnsavedChanges(formRef);
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Sync activeTab with URL on mount and URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabId;
    if (tabParam && tabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, tabs]);

  const handleTabChange = (tabId: TabId) => {
    // Check for unsaved changes before switching tabs
    const hasDirtyChanges = checkDirty();
    if (hasDirtyChanges) {
      setPendingTab(tabId);
      setShowUnsavedDialog(true);
      return;
    }

    // No unsaved changes, proceed with tab switch
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleStay = () => {
    setShowUnsavedDialog(false);
    setPendingTab(null);
  };

  const handleLeave = () => {
    setShowUnsavedDialog(false);
    resetDirty();
    if (pendingTab) {
      setActiveTab(pendingTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', pendingTab);
      router.push(`?${params.toString()}`, { scroll: false });
    }
    setPendingTab(null);
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
                Update your profile information{isWorker ? ' and select the tools you own' : ''}.
              </p>
            </div>

            {/* Profile Edit Form */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <ProfileEditForm profile={profile} formRef={formRef} />
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
                Add and manage your {isWorker ? 'work history' : 'projects and experience'}.
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

        {activeTab === 'certifications' && showCertificationsTab && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Certifications</h2>
              <p className="mt-1 text-sm text-gray-600">
                Upload your certifications for verification.
              </p>
            </div>

            {/* Existing certifications */}
            <CertificationsTabNew userId={profile.id} isOwner={true} />

            {/* Add new certification */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Certification</h3>
              <CertificationFormNew />
            </div>
          </div>
        )}

        {activeTab === 'licenses' && showLicensesTab && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Licenses</h2>
              <p className="mt-1 text-sm text-gray-600">
                Upload your contractor licenses for verification.
              </p>
            </div>

            {/* Existing licenses */}
            <LicensesTab userId={profile.id} isOwner={true} />

            {/* Add new license */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New License</h3>
              <LicenseForm />
            </div>
          </div>
        )}
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onStay={handleStay}
        onLeave={handleLeave}
      />
    </div>
  );
}

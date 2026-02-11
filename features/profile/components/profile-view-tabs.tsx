'use client';

import { useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Avatar } from '@/components/ui';
import { CertificationItem } from '@/features/profiles/components/certification-item';
import { ExperienceItem } from '@/features/profiles/components/experience-item';
import { EducationItem } from '@/features/profiles/components/education-item';
import { ProfileViewsList } from '@/features/subscriptions/components/profile-views-list';
import { LicensePreviewCard } from '@/components/common';
import { PortfolioGallery } from '@/features/portfolio/components/portfolio-gallery';
import { canHaveExperiences, getExperienceLabels } from '@/features/profiles/constants/experience-labels';
import { LicensesTab } from '@/features/profiles/components/tabs/licenses-tab';
import { Briefcase, Image as ImageIcon, Award, User, GraduationCap, Eye, Shield } from 'lucide-react';
import type { ExperiencePhoto } from '@/features/profiles/types';

type TabId = 'basic' | 'portfolio' | 'experience' | 'certifications' | 'licenses' | 'education';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'developer' | 'homeowner' | 'recruiter' | null;
  location: string;
  bio?: string | null;
  profile_image_url?: string | null;
  subscription_status: 'free' | 'pro';
  trade?: string | null;
  sub_trade?: string | null;
  company_name?: string | null;
}

interface CertificationData {
  id: string;
  credential_category: 'certification';
  certification_type: string;
  certification_number?: string | null;
  issued_by: string;
  expires_at?: string | null;
  is_verified: boolean;
  verification_status?: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
}

interface ExperienceData {
  id: string;
  job_title: string;
  company: string;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
}

interface EducationData {
  id: string;
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

// License data matches what LicensePreviewCard expects
interface LicenseData {
  id: string;
  certification_type: string;
  certification_number?: string | null;
  issued_by?: string | null;
  issuing_state?: string | null;
  issue_date?: string | null;
  expires_at?: string | null;
  image_url: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
}

export interface ProfileViewTabsProps {
  profile: ProfileData;
  certifications: CertificationData[];
  workExperience: ExperienceData[];
  experiencePhotosMap: Record<string, ExperiencePhoto[]>;
  education: EducationData[];
  contractorLicense: LicenseData | null;
}

export function ProfileViewTabs({
  profile,
  certifications,
  workExperience,
  experiencePhotosMap,
  education,
  contractorLicense,
}: ProfileViewTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // User type detection
  const isWorker = profile.role === 'worker';
  const isEmployer = profile.role === 'employer';
  const isContractor = isEmployer && profile.employer_type === 'contractor';
  const showExperienceTab = canHaveExperiences(profile.role, profile.employer_type);
  const experienceLabels = getExperienceLabels(profile.role, profile.employer_type);

  // Determine if this is a projects tab (contractors/developers show photos)
  const isProjectsTab = isEmployer &&
    (profile.employer_type === 'contractor' || profile.employer_type === 'developer');

  // Portfolio tab is only shown for workers
  const showPortfolioTab = isWorker;
  // Education tab is only for workers
  const showEducationTab = isWorker;
  // Certifications tab is only for workers
  const showCertificationsTab = isWorker;
  // Licenses tab is only for contractors
  const showLicensesTab = isContractor;

  // Build tabs array conditionally
  const tabs: Tab[] = useMemo(() => [
    { id: 'basic', label: 'Overview', icon: User },
    ...(showPortfolioTab ? [{ id: 'portfolio' as TabId, label: 'Portfolio', icon: ImageIcon }] : []),
    ...(showExperienceTab ? [{ id: 'experience' as TabId, label: experienceLabels?.tabTitle || 'Experience', icon: Briefcase }] : []),
    ...(showCertificationsTab ? [{ id: 'certifications' as TabId, label: 'Certifications', icon: Award }] : []),
    ...(showLicensesTab ? [{ id: 'licenses' as TabId, label: 'Licenses', icon: Shield }] : []),
    ...(showEducationTab ? [{ id: 'education' as TabId, label: 'Education', icon: GraduationCap }] : []),
  ], [showPortfolioTab, showExperienceTab, showCertificationsTab, showLicensesTab, showEducationTab, experienceLabels?.tabTitle]);

  // Get active tab from URL, defaulting to 'basic'
  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab = tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : 'basic';

  const handleTabChange = (tabId: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Profile tabs">
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
        {/* Basic Info / Overview Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                {profile.subscription_status === 'pro' && <Badge variant="pro">Pro Member</Badge>}
              </div>

              <div className="flex items-start gap-6">
                {/* Profile Picture */}
                <Avatar
                  src={profile.profile_image_url}
                  name={profile.name}
                  userId={profile.id}
                  size="xl"
                  className="border-4 border-gray-200"
                />

                {/* Info Grid */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="mt-1 text-base text-gray-900">{profile.name}</p>
                  </div>
                  {isEmployer && profile.company_name && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Company Name</p>
                      <p className="mt-1 text-base text-gray-900">{profile.company_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1 text-base text-gray-900">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Role</p>
                    <p className="mt-1 text-base text-gray-900 capitalize">{profile.role}</p>
                  </div>
                  {profile.employer_type && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Employer Type</p>
                      <p className="mt-1 text-base text-gray-900 capitalize">{profile.employer_type}</p>
                    </div>
                  )}
                  {profile.trade && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Trade</p>
                      <p className="mt-1 text-base text-gray-900">{profile.trade}</p>
                    </div>
                  )}
                  {profile.sub_trade && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Specialty</p>
                      <p className="mt-1 text-base text-gray-900">{profile.sub_trade}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="mt-1 text-base text-gray-900">{profile.location}</p>
                  </div>
                  {profile.phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="mt-1 text-base text-gray-900">{profile.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {profile.bio && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-500">Bio</p>
                  <p className="mt-2 text-base text-gray-700">{profile.bio}</p>
                </div>
              )}
            </div>

            {/* Contractor License - Contractors Only */}
            {isContractor && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contractor License</h3>
                <LicensePreviewCard license={contractorLicense} />
              </div>
            )}

            {/* Who Viewed My Profile - Workers Only */}
            {isWorker && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Who Viewed My Profile</h3>
                </div>
                <ProfileViewsList />
              </div>
            )}
          </div>
        )}

        {/* Portfolio Tab - Workers Only */}
        {activeTab === 'portfolio' && showPortfolioTab && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Portfolio</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Showcase your work to potential employers
                </p>
              </div>
              <Link href="/dashboard/profile/edit?tab=portfolio">
                <Button variant="outline" size="sm">
                  Manage Portfolio
                </Button>
              </Link>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <PortfolioGallery userId={profile.id} />
            </div>
          </div>
        )}

        {/* Experience Tab */}
        {activeTab === 'experience' && showExperienceTab && experienceLabels && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{experienceLabels.tabTitle}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {isWorker ? 'Your work history and achievements' : 'Your projects and experience'}
                </p>
              </div>
              <Link href="/dashboard/profile/experience">
                <Button variant="outline" size="sm">
                  Add {experienceLabels.tabTitle}
                </Button>
              </Link>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              {workExperience && workExperience.length > 0 ? (
                <div className="space-y-4">
                  {workExperience.map((exp) => (
                    <ExperienceItem
                      key={exp.id}
                      exp={exp}
                      labels={experienceLabels}
                      photos={experiencePhotosMap[exp.id]}
                      showPhotos={isProjectsTab}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p>No {experienceLabels.tabTitle.toLowerCase()} added yet</p>
                  <p className="text-sm mt-1">
                    Add your {experienceLabels.tabTitle.toLowerCase()} to showcase your background
                  </p>
                  <Link href="/dashboard/profile/experience" className="mt-4 inline-block">
                    <Button variant="primary" size="sm">
                      Add {experienceLabels.tabTitle}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Certifications Tab - Workers Only */}
        {activeTab === 'certifications' && showCertificationsTab && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Certifications</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Your licenses and certifications
                </p>
              </div>
              <Link href="/dashboard/profile/certifications">
                <Button variant="outline" size="sm">
                  Add Certification
                </Button>
              </Link>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              {certifications.length > 0 ? (
                <div className="space-y-3">
                  {certifications.map((cert) => (
                    <CertificationItem key={cert.id} cert={cert} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p>No certifications added yet</p>
                  <p className="text-sm mt-1">
                    Add certifications to stand out to employers
                  </p>
                  <Link href="/dashboard/profile/certifications" className="mt-4 inline-block">
                    <Button variant="primary" size="sm">
                      Add Certification
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Licenses Tab - Contractors Only */}
        {activeTab === 'licenses' && showLicensesTab && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Licenses</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Your contractor licenses
                </p>
              </div>
              <Link href="/dashboard/profile/licenses">
                <Button variant="outline" size="sm">
                  Add License
                </Button>
              </Link>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <LicensesTab userId={profile.id} isOwner={false} />
            </div>
          </div>
        )}

        {/* Education Tab - Workers Only */}
        {activeTab === 'education' && showEducationTab && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Education</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Your educational background
                </p>
              </div>
              <Link href="/dashboard/profile/education">
                <Button variant="outline" size="sm">
                  Add Education
                </Button>
              </Link>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              {education && education.length > 0 ? (
                <div className="space-y-3">
                  {education.map((edu) => (
                    <EducationItem key={edu.id} education={edu} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <GraduationCap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p>No education added yet</p>
                  <p className="text-sm mt-1">
                    Add your education to enhance your profile
                  </p>
                  <Link href="/dashboard/profile/education" className="mt-4 inline-block">
                    <Button variant="primary" size="sm">
                      Add Education
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

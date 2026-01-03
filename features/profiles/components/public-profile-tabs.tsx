'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AboutTab } from './tabs/about-tab';
import { PortfolioTab } from './tabs/portfolio-tab';
import { ExperienceTab } from './tabs/experience-tab';
import { EducationTab } from './tabs/education-tab';
import { CertificationsTab } from './tabs/certifications-tab';
import { ReferencesTab } from './tabs/references-tab';

type TabId = 'about' | 'portfolio' | 'experience' | 'education' | 'certifications' | 'references';

type Tab = {
  id: TabId;
  label: string;
};

const TABS: Tab[] = [
  { id: 'about', label: 'About' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'references', label: 'References' },
];

type PublicProfileTabsProps = {
  userId: string;
};

export function PublicProfileTabs({ userId }: PublicProfileTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial tab from URL query param, default to 'about'
  const tabParam = searchParams.get('tab') as TabId | null;
  const initialTab = tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'about';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Sync tab state with URL
  useEffect(() => {
    const currentTab = searchParams.get('tab') as TabId | null;
    if (currentTab && TABS.some(t => t.id === currentTab) && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);

    // Update URL with new tab
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'about':
        return <AboutTab userId={userId} />;
      case 'portfolio':
        return <PortfolioTab userId={userId} />;
      case 'experience':
        return <ExperienceTab userId={userId} />;
      case 'education':
        return <EducationTab userId={userId} />;
      case 'certifications':
        return <CertificationsTab userId={userId} />;
      case 'references':
        return <ReferencesTab userId={userId} />;
      default:
        return <AboutTab userId={userId} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Profile tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-krewup-blue text-krewup-blue'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
}

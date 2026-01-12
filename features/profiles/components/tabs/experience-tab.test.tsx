import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExperienceTab } from './experience-tab';

// Mock the useWorkExperience hook
vi.mock('../../hooks/use-work-experience', () => ({
  useWorkExperience: vi.fn(),
}));

import { useWorkExperience } from '../../hooks/use-work-experience';

describe('ExperienceTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    vi.mocked(useWorkExperience).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    render(<ExperienceTab userId="user-123" />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(useWorkExperience).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any);

    render(<ExperienceTab userId="user-123" />);

    expect(screen.getByText(/failed to load work experience/i)).toBeInTheDocument();
  });

  it('should show empty state when no experience', () => {
    vi.mocked(useWorkExperience).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<ExperienceTab userId="user-123" />);

    expect(screen.getByText(/no work experience added yet/i)).toBeInTheDocument();
  });

  it('should render job title', () => {
    vi.mocked(useWorkExperience).mockReturnValue({
      data: [{
        id: 'exp-1',
        job_title: 'Journeyman Electrician',
        company: 'ABC Electric',
        start_date: '2022-01-01',
        is_current: true,
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ExperienceTab userId="user-123" />);

    expect(screen.getByText('Journeyman Electrician')).toBeInTheDocument();
  });

  it('should render company name', () => {
    vi.mocked(useWorkExperience).mockReturnValue({
      data: [{
        id: 'exp-1',
        job_title: 'Electrician',
        company: 'XYZ Contractors',
        start_date: '2022-01-01',
        is_current: true,
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ExperienceTab userId="user-123" />);

    expect(screen.getByText('XYZ Contractors')).toBeInTheDocument();
  });

  it('should render current badge for current position', () => {
    vi.mocked(useWorkExperience).mockReturnValue({
      data: [{
        id: 'exp-1',
        job_title: 'Electrician',
        company: 'ABC Electric',
        start_date: '2022-01-01',
        is_current: true,
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ExperienceTab userId="user-123" />);

    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText(/present/i)).toBeInTheDocument();
  });

  it('should render date range for past position', () => {
    vi.mocked(useWorkExperience).mockReturnValue({
      data: [{
        id: 'exp-1',
        job_title: 'Apprentice',
        company: 'Training Co',
        start_date: '2019-06-15',
        end_date: '2021-12-15',
        is_current: false,
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ExperienceTab userId="user-123" />);

    // Check that dates are rendered (format varies by timezone)
    expect(screen.getByText(/2019/)).toBeInTheDocument();
    expect(screen.getByText(/2021/)).toBeInTheDocument();
  });

  it('should render description', () => {
    vi.mocked(useWorkExperience).mockReturnValue({
      data: [{
        id: 'exp-1',
        job_title: 'Electrician',
        company: 'ABC Electric',
        start_date: '2022-01-01',
        is_current: true,
        description: 'Responsible for commercial electrical installations and maintenance.',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ExperienceTab userId="user-123" />);

    expect(screen.getByText(/responsible for commercial electrical/i)).toBeInTheDocument();
  });

  it('should render multiple experience entries', () => {
    vi.mocked(useWorkExperience).mockReturnValue({
      data: [
        { id: 'exp-1', job_title: 'Senior Electrician', company: 'Company A', start_date: '2022-01-01', is_current: true },
        { id: 'exp-2', job_title: 'Junior Electrician', company: 'Company B', start_date: '2019-01-01', end_date: '2021-12-31', is_current: false },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<ExperienceTab userId="user-123" />);

    expect(screen.getByText('Company A')).toBeInTheDocument();
    expect(screen.getByText('Company B')).toBeInTheDocument();
  });

  it('should show N/A when end_date is missing for non-current job', () => {
    vi.mocked(useWorkExperience).mockReturnValue({
      data: [{
        id: 'exp-1',
        job_title: 'Electrician',
        company: 'Old Company',
        start_date: '2019-01-01',
        end_date: null,
        is_current: false,
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ExperienceTab userId="user-123" />);

    expect(screen.getByText(/n\/a/i)).toBeInTheDocument();
  });
});

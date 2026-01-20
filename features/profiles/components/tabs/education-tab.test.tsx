import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EducationTab } from './education-tab';

// Mock the useEducation hook
vi.mock('../../hooks/use-education', () => ({
  useEducation: vi.fn(),
}));

import { useEducation } from '../../hooks/use-education';

describe('EducationTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    vi.mocked(useEducation).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    render(<EducationTab userId="user-123" />);

    expect(document.querySelector('[class*="animate-spin"]')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(useEducation).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any);

    render(<EducationTab userId="user-123" />);

    expect(screen.getByText(/failed to load education information/i)).toBeInTheDocument();
  });

  it('should show empty state when no education', () => {
    vi.mocked(useEducation).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<EducationTab userId="user-123" />);

    expect(screen.getByText(/no education history added yet/i)).toBeInTheDocument();
  });

  it('should render degree', () => {
    vi.mocked(useEducation).mockReturnValue({
      data: [{
        id: 'edu-1',
        degree: 'Associate',
        institution: 'Community College',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<EducationTab userId="user-123" />);

    expect(screen.getByText('Associate')).toBeInTheDocument();
  });

  it('should render field of study', () => {
    vi.mocked(useEducation).mockReturnValue({
      data: [{
        id: 'edu-1',
        degree: 'Associate',
        field_of_study: 'Electrical Technology',
        institution: 'Community College',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<EducationTab userId="user-123" />);

    expect(screen.getByText('Electrical Technology')).toBeInTheDocument();
  });

  it('should render institution', () => {
    vi.mocked(useEducation).mockReturnValue({
      data: [{
        id: 'edu-1',
        degree: 'Associate',
        institution: 'Illinois Community College',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<EducationTab userId="user-123" />);

    expect(screen.getByText('Illinois Community College')).toBeInTheDocument();
  });

  it('should render graduation year', () => {
    vi.mocked(useEducation).mockReturnValue({
      data: [{
        id: 'edu-1',
        degree: 'Associate',
        institution: 'Community College',
        end_date: '2020-05-15',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<EducationTab userId="user-123" />);

    expect(screen.getByText(/graduated 2020/i)).toBeInTheDocument();
  });

  it('should render default degree text when no degree', () => {
    vi.mocked(useEducation).mockReturnValue({
      data: [{
        id: 'edu-1',
        degree: null,
        institution: 'Trade School',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<EducationTab userId="user-123" />);

    expect(screen.getByText('Degree')).toBeInTheDocument();
  });

  it('should render multiple education entries', () => {
    vi.mocked(useEducation).mockReturnValue({
      data: [
        { id: 'edu-1', degree: 'Associate', institution: 'College A' },
        { id: 'edu-2', degree: 'Certificate', institution: 'Trade School B' },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<EducationTab userId="user-123" />);

    expect(screen.getByText('College A')).toBeInTheDocument();
    expect(screen.getByText('Trade School B')).toBeInTheDocument();
  });
});

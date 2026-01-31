import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutTab } from './about-tab';

// Mock the usePublicProfile hook
vi.mock('../../hooks/use-public-profile', () => ({
  usePublicProfile: vi.fn(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { usePublicProfile } from '../../hooks/use-public-profile';

describe('AboutTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    // Loading spinner should be present
    expect(document.querySelector('[class*="animate-spin"]')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText(/failed to load profile information/i)).toBeInTheDocument();
  });

  it('should show not found state when no profile', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText(/profile not found/i)).toBeInTheDocument();
  });

  it('should render profile name', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should render pro badge for pro users', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        subscription_status: 'pro',
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('should render trade and sub_trade', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        trade: 'Electrician',
        sub_trade: 'Commercial',
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText('Electrician - Commercial')).toBeInTheDocument();
  });

  it('should render location', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        location: 'Chicago, IL',
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText('Chicago, IL')).toBeInTheDocument();
  });

  it('should render years of experience', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        years_of_experience: 5,
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText('5 years')).toBeInTheDocument();
  });

  it('should render singular year for 1 year experience', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        years_of_experience: 1,
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText('1 year')).toBeInTheDocument();
  });

  it('should render bio section', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        bio: 'Experienced electrician with 10+ years in commercial work.',
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Experienced electrician with 10+ years in commercial work.')).toBeInTheDocument();
  });

  it('should render skills', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        skills: ['Wiring', 'Troubleshooting', 'Panel Installation'],
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Wiring')).toBeInTheDocument();
    expect(screen.getByText('Troubleshooting')).toBeInTheDocument();
    expect(screen.getByText('Panel Installation')).toBeInTheDocument();
  });

  it('should render tools owned when has_tools is true', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        has_tools: true,
        tools_owned: ['Multimeter', 'Drill', 'Wire Strippers'],
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText('Tools Owned')).toBeInTheDocument();
    expect(screen.getByText('Multimeter')).toBeInTheDocument();
    expect(screen.getByText('Drill')).toBeInTheDocument();
  });

  it('should render profile image when available', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        profile_image_url: 'https://example.com/photo.jpg',
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    const img = screen.getByAltText('John Doe');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('should render initials when no profile image', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        profile_image_url: null,
        created_at: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<AboutTab userId="user-123" />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});

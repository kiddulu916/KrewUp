import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CertificationsTab } from './certifications-tab';

// Mock the useCertifications hook
vi.mock('../../hooks/use-certifications', () => ({
  useCertifications: vi.fn(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { useCertifications } from '../../hooks/use-certifications';

describe('CertificationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(document.querySelector('[class*="animate-spin"]')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(screen.getByText(/failed to load certifications/i)).toBeInTheDocument();
  });

  it('should show empty state when no certifications', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(screen.getByText(/no certifications added yet/i)).toBeInTheDocument();
  });

  it('should render certification type', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'Electrical License',
        credential_category: 'license',
        verification_status: 'verified',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(screen.getByText('Electrical License')).toBeInTheDocument();
  });

  it('should render verified badge', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'Electrical License',
        credential_category: 'license',
        verification_status: 'verified',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('should render pending badge', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'OSHA 30',
        credential_category: 'certification',
        verification_status: 'pending',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should render rejected badge', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'Invalid Cert',
        credential_category: 'certification',
        verification_status: 'rejected',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('should render issuing organization', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'Electrical License',
        credential_category: 'license',
        verification_status: 'verified',
        issuing_organization: 'State of Illinois',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(screen.getByText(/state of illinois/i)).toBeInTheDocument();
  });

  it('should mask credential ID showing only last 4 characters', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'Electrical License',
        credential_category: 'license',
        verification_status: 'verified',
        credential_id: 'LICENSE12345678',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(screen.getByText(/\*\*\*\*5678/)).toBeInTheDocument();
  });

  it('should render issue date', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'Electrical License',
        credential_category: 'license',
        verification_status: 'verified',
        issue_date: '2023-01-15',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    // Check that issue date label and year are present
    expect(screen.getByText(/issued:/i)).toBeInTheDocument();
    expect(screen.getByText(/2023/)).toBeInTheDocument();
  });

  it('should render expiration date', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'Electrical License',
        credential_category: 'license',
        verification_status: 'verified',
        expiration_date: '2025-01-15',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    // Check that expiration date label and year are present
    expect(screen.getByText(/expires:/i)).toBeInTheDocument();
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it('should render certificate image when available', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'Electrical License',
        credential_category: 'license',
        verification_status: 'verified',
        image_url: 'https://example.com/cert.jpg',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    const img = screen.getByAltText(/electrical license certificate/i);
    expect(img).toHaveAttribute('src', 'https://example.com/cert.jpg');
  });

  it('should render License badge for license type', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'Electrical License',
        credential_category: 'license',
        verification_status: 'verified',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(screen.getByText('License')).toBeInTheDocument();
  });

  it('should render Certification badge for certification type', () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [{
        id: 'cert-1',
        certification_type: 'OSHA 30',
        credential_category: 'certification',
        verification_status: 'pending',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<CertificationsTab userId="user-123" />);

    expect(screen.getByText('Certification')).toBeInTheDocument();
  });
});

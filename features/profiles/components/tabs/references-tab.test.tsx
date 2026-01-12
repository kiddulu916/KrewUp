import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReferencesTab } from './references-tab';

// Mock the useReferences hook
vi.mock('../../hooks/use-references', () => ({
  useReferences: vi.fn(),
}));

import { useReferences } from '../../hooks/use-references';

describe('ReferencesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    vi.mocked(useReferences).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    render(<ReferencesTab userId="user-123" />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(useReferences).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any);

    render(<ReferencesTab userId="user-123" />);

    expect(screen.getByText(/failed to load references/i)).toBeInTheDocument();
  });

  it('should show empty state when no references', () => {
    vi.mocked(useReferences).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<ReferencesTab userId="user-123" />);

    expect(screen.getByText(/no references added yet/i)).toBeInTheDocument();
  });

  it('should render reference name', () => {
    vi.mocked(useReferences).mockReturnValue({
      data: [{
        id: 'ref-1',
        name: 'John Smith',
        relationship: 'Former Supervisor',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ReferencesTab userId="user-123" />);

    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('should render relationship', () => {
    vi.mocked(useReferences).mockReturnValue({
      data: [{
        id: 'ref-1',
        name: 'John Smith',
        relationship: 'Former Supervisor',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ReferencesTab userId="user-123" />);

    expect(screen.getByText('Former Supervisor')).toBeInTheDocument();
  });

  it('should render company name', () => {
    vi.mocked(useReferences).mockReturnValue({
      data: [{
        id: 'ref-1',
        name: 'John Smith',
        relationship: 'Former Supervisor',
        company: 'ABC Electric',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ReferencesTab userId="user-123" />);

    expect(screen.getByText('ABC Electric')).toBeInTheDocument();
  });

  it('should show contact available message when email exists', () => {
    vi.mocked(useReferences).mockReturnValue({
      data: [{
        id: 'ref-1',
        name: 'John Smith',
        relationship: 'Former Supervisor',
        email: 'john@example.com',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ReferencesTab userId="user-123" />);

    expect(screen.getByText(/contact information available upon request/i)).toBeInTheDocument();
  });

  it('should show contact available message when phone exists', () => {
    vi.mocked(useReferences).mockReturnValue({
      data: [{
        id: 'ref-1',
        name: 'John Smith',
        relationship: 'Former Supervisor',
        phone: '555-1234',
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ReferencesTab userId="user-123" />);

    expect(screen.getByText(/contact information available upon request/i)).toBeInTheDocument();
  });

  it('should not show contact message when no email or phone', () => {
    vi.mocked(useReferences).mockReturnValue({
      data: [{
        id: 'ref-1',
        name: 'John Smith',
        relationship: 'Former Supervisor',
        email: null,
        phone: null,
      }],
      isLoading: false,
      error: null,
    } as any);

    render(<ReferencesTab userId="user-123" />);

    expect(screen.queryByText(/contact information available/i)).not.toBeInTheDocument();
  });

  it('should render multiple references', () => {
    vi.mocked(useReferences).mockReturnValue({
      data: [
        { id: 'ref-1', name: 'John Smith', relationship: 'Supervisor' },
        { id: 'ref-2', name: 'Jane Doe', relationship: 'Coworker' },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<ReferencesTab userId="user-123" />);

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});

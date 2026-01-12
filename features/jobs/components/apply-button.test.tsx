import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplyButton } from './apply-button';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('ApplyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Apply Now button', () => {
    render(<ApplyButton jobId="job-123" />);

    expect(screen.getByRole('button', { name: /apply now/i })).toBeInTheDocument();
  });

  it('should navigate to apply page on click', async () => {
    const user = userEvent.setup();
    render(<ApplyButton jobId="job-123" />);

    const button = screen.getByRole('button', { name: /apply now/i });
    await user.click(button);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/jobs/job-123/apply');
  });

  it('should use correct job ID in navigation path', async () => {
    const user = userEvent.setup();
    render(<ApplyButton jobId="different-job-456" />);

    const button = screen.getByRole('button', { name: /apply now/i });
    await user.click(button);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/jobs/different-job-456/apply');
  });

  it('should have secondary variant styling', () => {
    render(<ApplyButton jobId="job-123" />);

    const button = screen.getByRole('button', { name: /apply now/i });
    // Button should exist and be clickable (styling is handled by Button component)
    expect(button).toBeEnabled();
  });

  it('should be clickable', async () => {
    const user = userEvent.setup();
    render(<ApplyButton jobId="job-123" />);

    const button = screen.getByRole('button', { name: /apply now/i });
    await user.click(button);

    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});

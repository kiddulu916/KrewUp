import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutoSaveIndicator } from './auto-save-indicator';

describe('AutoSaveIndicator Component', () => {
  beforeEach(() => {
    // Mock Date.now for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-10T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Saving State', () => {
    it('should show "Saving..." text when isSaving is true', () => {
      render(<AutoSaveIndicator isSaving={true} lastSaved={null} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should show saving indicator even if lastSaved exists', () => {
      const lastSaved = new Date('2025-01-10T11:55:00');
      render(<AutoSaveIndicator isSaving={true} lastSaved={lastSaved} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      // Should only show "Saving..." text, not the "Saved X ago" text
      expect(screen.queryByText(/Saved.*ago/i)).not.toBeInTheDocument();
    });

    it('should have a spinning animation icon when saving', () => {
      const { container } = render(<AutoSaveIndicator isSaving={true} lastSaved={null} />);

      const spinningIcon = container.querySelector('.animate-spin');
      expect(spinningIcon).toBeInTheDocument();
    });
  });

  describe('Saved State', () => {
    it('should show time elapsed for recent save', () => {
      const lastSaved = new Date('2025-01-10T11:59:30'); // 30 seconds ago
      render(<AutoSaveIndicator isSaving={false} lastSaved={lastSaved} />);

      // date-fns formatDistanceToNow may show "less than a minute ago" or similar
      expect(screen.getByText(/Saved/i)).toBeInTheDocument();
    });

    it('should show "Saved 5 minutes ago" for 5-minute-old save', () => {
      const lastSaved = new Date('2025-01-10T11:55:00'); // 5 minutes ago
      render(<AutoSaveIndicator isSaving={false} lastSaved={lastSaved} />);

      expect(screen.getByText(/Saved.*5 minutes ago/i)).toBeInTheDocument();
    });

    it('should show "Saved about 1 hour ago" for 1-hour-old save', () => {
      const lastSaved = new Date('2025-01-10T11:00:00'); // 1 hour ago
      render(<AutoSaveIndicator isSaving={false} lastSaved={lastSaved} />);

      expect(screen.getByText(/Saved.*about 1 hour ago/i)).toBeInTheDocument();
    });

    it('should have a checkmark icon when saved', () => {
      const lastSaved = new Date('2025-01-10T11:55:00');
      const { container } = render(<AutoSaveIndicator isSaving={false} lastSaved={lastSaved} />);

      const checkIcon = container.querySelector('.text-green-600');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  describe('No Save State', () => {
    it('should return null when not saving and no lastSaved', () => {
      const { container } = render(<AutoSaveIndicator isSaving={false} lastSaved={null} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Time Formatting', () => {
    it('should handle 2 minutes ago', () => {
      const lastSaved = new Date('2025-01-10T11:58:00'); // 2 minutes ago
      render(<AutoSaveIndicator isSaving={false} lastSaved={lastSaved} />);

      expect(screen.getByText(/Saved.*2 minutes ago/i)).toBeInTheDocument();
    });

    it('should handle 30 minutes ago', () => {
      const lastSaved = new Date('2025-01-10T11:30:00'); // 30 minutes ago
      render(<AutoSaveIndicator isSaving={false} lastSaved={lastSaved} />);

      expect(screen.getByText(/Saved.*30 minutes ago/i)).toBeInTheDocument();
    });
  });
});

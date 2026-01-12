import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoostBadge } from './boost-badge';

describe('BoostBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-12T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isActive prop', () => {
    it('should render when isActive is true', () => {
      render(<BoostBadge isActive={true} />);

      expect(screen.getByText('Boosted')).toBeInTheDocument();
    });

    it('should not render when isActive is false', () => {
      render(<BoostBadge isActive={false} />);

      expect(screen.queryByText('Boosted')).not.toBeInTheDocument();
    });

    it('should prioritize isActive over expiresAt', () => {
      // isActive=false should hide badge even if expiresAt is in the future
      render(<BoostBadge isActive={false} expiresAt="2025-12-31T00:00:00Z" />);

      expect(screen.queryByText('Boosted')).not.toBeInTheDocument();
    });

    it('should show badge when isActive=true regardless of expiresAt', () => {
      // isActive=true should show badge even if expiresAt is in the past
      render(<BoostBadge isActive={true} expiresAt="2020-01-01T00:00:00Z" />);

      expect(screen.getByText('Boosted')).toBeInTheDocument();
    });
  });

  describe('expiresAt fallback (backwards compatibility)', () => {
    it('should render when expiresAt is in the future and isActive not provided', () => {
      render(<BoostBadge expiresAt="2025-12-31T00:00:00Z" />);

      expect(screen.getByText('Boosted')).toBeInTheDocument();
    });

    it('should not render when expiresAt is in the past and isActive not provided', () => {
      render(<BoostBadge expiresAt="2024-01-01T00:00:00Z" />);

      expect(screen.queryByText('Boosted')).not.toBeInTheDocument();
    });

    it('should not render when expiresAt is null', () => {
      render(<BoostBadge expiresAt={null} />);

      expect(screen.queryByText('Boosted')).not.toBeInTheDocument();
    });

    it('should not render when no props provided', () => {
      render(<BoostBadge />);

      expect(screen.queryByText('Boosted')).not.toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should render with small size', () => {
      render(<BoostBadge isActive={true} size="sm" />);

      const badge = screen.getByText('Boosted');
      expect(badge).toHaveClass('text-xs');
    });

    it('should render with medium size by default', () => {
      render(<BoostBadge isActive={true} />);

      const badge = screen.getByText('Boosted');
      expect(badge).toHaveClass('text-sm');
    });

    it('should render with large size', () => {
      render(<BoostBadge isActive={true} size="lg" />);

      const badge = screen.getByText('Boosted');
      expect(badge).toHaveClass('text-base');
    });
  });

  describe('visual elements', () => {
    it('should render star icon', () => {
      render(<BoostBadge isActive={true} />);

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have gradient background', () => {
      render(<BoostBadge isActive={true} />);

      const badge = screen.getByText('Boosted');
      expect(badge).toHaveClass('bg-gradient-to-r');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProBadge } from './pro-badge';

describe('ProBadge', () => {
  it('should render PRO text', () => {
    render(<ProBadge />);

    expect(screen.getByText('PRO')).toBeInTheDocument();
  });

  it('should render as a badge component', () => {
    render(<ProBadge />);

    // The Badge component renders with default variant
    const badge = screen.getByText('PRO');
    expect(badge).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<ProBadge className="custom-class" />);

    const badge = screen.getByText('PRO');
    expect(badge).toHaveClass('custom-class');
  });

  it('should render without className', () => {
    render(<ProBadge />);

    const badge = screen.getByText('PRO');
    expect(badge).toBeInTheDocument();
  });
});

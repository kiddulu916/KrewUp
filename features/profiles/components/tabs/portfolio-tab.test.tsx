import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioTab } from './portfolio-tab';

// Mock the usePortfolioImages hook
vi.mock('../../hooks/use-portfolio-images', () => ({
  usePortfolioImages: vi.fn(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { usePortfolioImages } from '../../hooks/use-portfolio-images';

describe('PortfolioTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    vi.mocked(usePortfolioImages).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    render(<PortfolioTab userId="user-123" />);

    expect(document.querySelector('[class*="animate-spin"]')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(usePortfolioImages).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any);

    render(<PortfolioTab userId="user-123" />);

    expect(screen.getByText(/failed to load portfolio images/i)).toBeInTheDocument();
  });

  it('should show empty state when no images', () => {
    vi.mocked(usePortfolioImages).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<PortfolioTab userId="user-123" />);

    expect(screen.getByText(/no portfolio images yet/i)).toBeInTheDocument();
  });

  it('should render image count for single image', () => {
    vi.mocked(usePortfolioImages).mockReturnValue({
      data: [{ id: 'img-1', image_url: 'https://example.com/1.jpg', display_order: 0 }],
      isLoading: false,
      error: null,
    } as any);

    render(<PortfolioTab userId="user-123" />);

    expect(screen.getByText('1 image')).toBeInTheDocument();
  });

  it('should render image count for multiple images', () => {
    vi.mocked(usePortfolioImages).mockReturnValue({
      data: [
        { id: 'img-1', image_url: 'https://example.com/1.jpg', display_order: 0 },
        { id: 'img-2', image_url: 'https://example.com/2.jpg', display_order: 1 },
        { id: 'img-3', image_url: 'https://example.com/3.jpg', display_order: 2 },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<PortfolioTab userId="user-123" />);

    expect(screen.getByText('3 images')).toBeInTheDocument();
  });

  it('should render portfolio images', () => {
    vi.mocked(usePortfolioImages).mockReturnValue({
      data: [
        { id: 'img-1', image_url: 'https://example.com/work1.jpg', display_order: 0 },
        { id: 'img-2', image_url: 'https://example.com/work2.jpg', display_order: 1 },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<PortfolioTab userId="user-123" />);

    expect(screen.getByAltText('Portfolio image 1')).toHaveAttribute('src', 'https://example.com/work1.jpg');
    expect(screen.getByAltText('Portfolio image 2')).toHaveAttribute('src', 'https://example.com/work2.jpg');
  });

  it('should render images in grid layout', () => {
    vi.mocked(usePortfolioImages).mockReturnValue({
      data: [
        { id: 'img-1', image_url: 'https://example.com/1.jpg', display_order: 0 },
      ],
      isLoading: false,
      error: null,
    } as any);

    const { container } = render(<PortfolioTab userId="user-123" />);

    expect(container.querySelector('.grid')).toBeInTheDocument();
  });
});

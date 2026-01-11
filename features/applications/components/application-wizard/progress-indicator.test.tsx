import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressIndicator } from './progress-indicator';

describe('ProgressIndicator Component', () => {
  describe('Step Display', () => {
    it('should display current step and total steps', () => {
      render(<ProgressIndicator currentStep={3} totalSteps={8} />);

      expect(screen.getByText('Step 3 of 8')).toBeInTheDocument();
    });

    it('should display step 1 of 8', () => {
      render(<ProgressIndicator currentStep={1} totalSteps={8} />);

      expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    });

    it('should display step 8 of 8 on final step', () => {
      render(<ProgressIndicator currentStep={8} totalSteps={8} />);

      expect(screen.getByText('Step 8 of 8')).toBeInTheDocument();
    });

    it('should handle custom total steps', () => {
      render(<ProgressIndicator currentStep={3} totalSteps={5} />);

      expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
    });
  });

  describe('Percentage Calculation', () => {
    it('should show 13% at step 1 of 8', () => {
      render(<ProgressIndicator currentStep={1} totalSteps={8} />);

      expect(screen.getByText('13% Complete')).toBeInTheDocument();
    });

    it('should show 50% at step 4 of 8', () => {
      render(<ProgressIndicator currentStep={4} totalSteps={8} />);

      expect(screen.getByText('50% Complete')).toBeInTheDocument();
    });

    it('should show 100% at step 8 of 8', () => {
      render(<ProgressIndicator currentStep={8} totalSteps={8} />);

      expect(screen.getByText('100% Complete')).toBeInTheDocument();
    });

    it('should round percentages correctly', () => {
      render(<ProgressIndicator currentStep={3} totalSteps={8} />);

      // 3/8 = 0.375 = 37.5% -> rounds to 38%
      expect(screen.getByText('38% Complete')).toBeInTheDocument();
    });

    it('should handle step 5 of 8 (62.5% -> 63%)', () => {
      render(<ProgressIndicator currentStep={5} totalSteps={8} />);

      expect(screen.getByText('63% Complete')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render a progress bar container', () => {
      const { container } = render(<ProgressIndicator currentStep={4} totalSteps={8} />);

      const progressBar = container.querySelector('.bg-gray-200');
      expect(progressBar).toBeInTheDocument();
    });

    it('should have progress bar with correct width at 50%', () => {
      const { container } = render(<ProgressIndicator currentStep={4} totalSteps={8} />);

      const progressFill = container.querySelector('.bg-krewup-blue');
      expect(progressFill).toHaveStyle({ width: '50%' });
    });

    it('should have progress bar with correct width at 100%', () => {
      const { container } = render(<ProgressIndicator currentStep={8} totalSteps={8} />);

      const progressFill = container.querySelector('.bg-krewup-blue');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('should have progress bar with correct width at step 1', () => {
      const { container } = render(<ProgressIndicator currentStep={1} totalSteps={8} />);

      const progressFill = container.querySelector('.bg-krewup-blue');
      expect(progressFill).toHaveStyle({ width: '12.5%' });
    });
  });

  describe('Custom Step Counts', () => {
    it('should work with 9 total steps (screening questions)', () => {
      render(<ProgressIndicator currentStep={5} totalSteps={9} />);

      expect(screen.getByText('Step 5 of 9')).toBeInTheDocument();
      // 5/9 = 55.55% -> rounds to 56%
      expect(screen.getByText('56% Complete')).toBeInTheDocument();
    });

    it('should work with fewer steps', () => {
      render(<ProgressIndicator currentStep={2} totalSteps={3} />);

      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
      // 2/3 = 66.67% -> rounds to 67%
      expect(screen.getByText('67% Complete')).toBeInTheDocument();
    });
  });
});

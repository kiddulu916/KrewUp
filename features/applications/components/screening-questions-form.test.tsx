import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

import { ScreeningQuestionsForm } from './screening-questions-form';

describe('ScreeningQuestionsForm Component', () => {
  const mockOnChange = vi.fn();

  const baseQuestions = [
    { question: 'Do you have experience with commercial roofing?', required: true },
    { question: 'Are you comfortable working at heights?', required: true },
    { question: 'Any additional comments?', required: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the component with questions', () => {
      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Screening Questions')).toBeInTheDocument();
    });

    it('should render the instruction text', () => {
      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Please answer the following questions/i)).toBeInTheDocument();
      expect(screen.getByText(/Questions marked with \* are required/i)).toBeInTheDocument();
    });

    it('should render all questions', () => {
      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Do you have experience with commercial roofing/i)).toBeInTheDocument();
      expect(screen.getByText(/Are you comfortable working at heights/i)).toBeInTheDocument();
      expect(screen.getByText(/Any additional comments/i)).toBeInTheDocument();
    });

    it('should render question numbers', () => {
      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/1\./)).toBeInTheDocument();
      expect(screen.getByText(/2\./)).toBeInTheDocument();
      expect(screen.getByText(/3\./)).toBeInTheDocument();
    });

    it('should render a textarea for each question', () => {
      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
        />
      );

      const textareas = screen.getAllByPlaceholderText(/Type your answer here/i);
      expect(textareas).toHaveLength(3);
    });
  });

  describe('Empty Questions', () => {
    it('should return null when questions array is empty', () => {
      const { container } = render(
        <ScreeningQuestionsForm
          questions={[]}
          value={{}}
          onChange={mockOnChange}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should return null when questions is undefined', () => {
      const { container } = render(
        <ScreeningQuestionsForm
          questions={undefined as any}
          value={{}}
          onChange={mockOnChange}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Required Indicator', () => {
    it('should show asterisk for required questions', () => {
      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
        />
      );

      // The first two questions are required and should have asterisks
      const asterisks = screen.getAllByText('*');
      expect(asterisks.length).toBeGreaterThanOrEqual(2);
    });

    it('should NOT show asterisk for optional questions', () => {
      const optionalOnlyQuestions = [
        { question: 'Optional question', required: false },
      ];

      render(
        <ScreeningQuestionsForm
          questions={optionalOnlyQuestions}
          value={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('Answer Input', () => {
    it('should display existing answer values', () => {
      const existingAnswers = {
        '0': 'Yes, 5 years experience',
        '1': 'Yes, very comfortable',
      };

      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={existingAnswers}
          onChange={mockOnChange}
        />
      );

      const textareas = screen.getAllByPlaceholderText(/Type your answer here/i);
      expect(textareas[0]).toHaveValue('Yes, 5 years experience');
      expect(textareas[1]).toHaveValue('Yes, very comfortable');
      expect(textareas[2]).toHaveValue('');
    });

    it('should call onChange when user types an answer', () => {
      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
        />
      );

      const textareas = screen.getAllByPlaceholderText(/Type your answer here/i);
      fireEvent.change(textareas[0], { target: { value: 'My answer' } });

      expect(mockOnChange).toHaveBeenCalledWith({ '0': 'My answer' });
    });

    it('should preserve other answers when updating one', () => {
      const existingAnswers = {
        '0': 'Existing answer',
        '1': 'Another answer',
      };

      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={existingAnswers}
          onChange={mockOnChange}
        />
      );

      const textareas = screen.getAllByPlaceholderText(/Type your answer here/i);
      fireEvent.change(textareas[2], { target: { value: 'New answer' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        '0': 'Existing answer',
        '1': 'Another answer',
        '2': 'New answer',
      });
    });
  });

  describe('Error Display', () => {
    it('should show error message for questions with errors', () => {
      const errors = {
        '0': 'This field is required',
      };

      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
          errors={errors}
        />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styling to textarea with errors', () => {
      const errors = {
        '0': 'This field is required',
      };

      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
          errors={errors}
        />
      );

      const textareas = screen.getAllByPlaceholderText(/Type your answer here/i);
      expect(textareas[0]).toHaveClass('border-red-500');
    });

    it('should NOT show error for questions without errors', () => {
      const errors = {
        '0': 'This field is required',
      };

      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
          errors={errors}
        />
      );

      const textareas = screen.getAllByPlaceholderText(/Type your answer here/i);
      // Second and third questions should not have error class
      expect(textareas[1]).not.toHaveClass('border-red-500');
      expect(textareas[2]).not.toHaveClass('border-red-500');
    });

    it('should show multiple error messages', () => {
      const errors = {
        '0': 'Answer 1 is required',
        '1': 'Answer 2 is required',
      };

      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
          errors={errors}
        />
      );

      expect(screen.getByText('Answer 1 is required')).toBeInTheDocument();
      expect(screen.getByText('Answer 2 is required')).toBeInTheDocument();
    });
  });

  describe('Single Question', () => {
    it('should render correctly with a single question', () => {
      const singleQuestion = [
        { question: 'Are you available immediately?', required: true },
      ];

      render(
        <ScreeningQuestionsForm
          questions={singleQuestion}
          value={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Are you available immediately/i)).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText(/Type your answer here/i)).toHaveLength(1);
    });
  });

  describe('Long Questions', () => {
    it('should handle long question text', () => {
      const longQuestion = [
        {
          question: 'This is a very long screening question that the employer has written to get detailed information about the candidate\'s background, experience, and qualifications for this specific position.',
          required: true,
        },
      ];

      render(
        <ScreeningQuestionsForm
          questions={longQuestion}
          value={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/This is a very long screening question/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have associated labels for textareas', () => {
      render(
        <ScreeningQuestionsForm
          questions={baseQuestions}
          value={{}}
          onChange={mockOnChange}
        />
      );

      // Each textarea should be inside a label
      const labels = screen.getAllByText(/\d+\./);
      expect(labels.length).toBe(3);
    });
  });
});

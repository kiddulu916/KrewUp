import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies BEFORE importing the component
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/features/subscriptions/hooks/use-subscription', () => ({
  useIsPro: vi.fn(() => true),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, size, variant, className, type }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-size={size}
      data-variant={variant}
      className={className}
      type={type || 'button'}
    >
      {children}
    </button>
  ),
}));

import { CustomQuestionsBuilder } from './custom-questions-builder';
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';

const mockUseIsPro = useIsPro as ReturnType<typeof vi.fn>;

describe('CustomQuestionsBuilder Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsPro.mockReturnValue(true);
  });

  describe('Pro User - Initial Render', () => {
    it('should render the component title', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} />);

      expect(screen.getByText('Custom Screening Questions')).toBeInTheDocument();
    });

    it('should render add question button', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} />);

      expect(screen.getByRole('button', { name: /\+ Add Question/i })).toBeInTheDocument();
    });

    it('should show empty state when no questions', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} />);

      expect(screen.getByText('No screening questions yet')).toBeInTheDocument();
      expect(screen.getByText(/Click "Add Question" to create your first question/i)).toBeInTheDocument();
    });

    it('should show max questions info', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} maxQuestions={5} />);

      expect(screen.getByText(/Add up to 5 questions/i)).toBeInTheDocument();
    });
  });

  describe('Free User - Upgrade Prompt', () => {
    beforeEach(() => {
      mockUseIsPro.mockReturnValue(false);
    });

    it('should show Pro Feature label for free users', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} />);

      expect(screen.getByText('Pro Feature')).toBeInTheDocument();
    });

    it('should show upgrade description for free users', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} />);

      expect(screen.getByText(/Add custom screening questions to pre-qualify candidates/i)).toBeInTheDocument();
    });

    it('should show upgrade button for free users', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} />);

      expect(screen.getByRole('button', { name: /Upgrade to Pro/i })).toBeInTheDocument();
    });

    it('should navigate to pricing when upgrade is clicked', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} />);

      const upgradeButton = screen.getByRole('button', { name: /Upgrade to Pro/i });
      fireEvent.click(upgradeButton);

      expect(mockPush).toHaveBeenCalledWith('/pricing');
    });

    it('should NOT show add question button for free users', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} />);

      expect(screen.queryByRole('button', { name: /\+ Add Question/i })).not.toBeInTheDocument();
    });
  });

  describe('Adding Questions', () => {
    it('should call onChange with new question when add is clicked', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Question/i });
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith([{ question: '', required: false }]);
    });

    it('should disable add button when max questions reached', () => {
      const questions = [
        { question: 'Q1', required: false },
        { question: 'Q2', required: false },
        { question: 'Q3', required: false },
        { question: 'Q4', required: false },
        { question: 'Q5', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} maxQuestions={5} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Question/i });
      expect(addButton).toBeDisabled();
    });

    it('should show remaining questions count', () => {
      const questions = [
        { question: 'Q1', required: false },
        { question: 'Q2', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} maxQuestions={5} />);

      expect(screen.getByText(/3 more questions available/i)).toBeInTheDocument();
    });

    it('should show singular when 1 question remaining', () => {
      const questions = [
        { question: 'Q1', required: false },
        { question: 'Q2', required: false },
        { question: 'Q3', required: false },
        { question: 'Q4', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} maxQuestions={5} />);

      expect(screen.getByText(/1 more question available/i)).toBeInTheDocument();
    });
  });

  describe('Question Display', () => {
    it('should display existing questions', () => {
      const questions = [
        { question: 'Do you have roofing experience?', required: false },
        { question: 'Are you certified?', required: true },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      expect(screen.getByText('Do you have roofing experience?')).toBeInTheDocument();
      expect(screen.getByText('Are you certified?')).toBeInTheDocument();
    });

    it('should show question numbers', () => {
      const questions = [
        { question: 'Q1', required: false },
        { question: 'Q2', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      expect(screen.getByText('Question 1')).toBeInTheDocument();
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });

    it('should show Required badge for required questions', () => {
      const questions = [
        { question: 'Required question', required: true },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      expect(screen.getByText('Required')).toBeInTheDocument();
    });

    it('should NOT show Required badge for optional questions', () => {
      const questions = [
        { question: 'Optional question', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      expect(screen.queryByText('Required')).not.toBeInTheDocument();
    });
  });

  describe('Question Editing', () => {
    it('should enter edit mode when edit button is clicked', () => {
      const questions = [
        { question: 'Existing question', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      // Click the edit button (the pencil icon button)
      const editButton = screen.getByTitle('Edit');
      fireEvent.click(editButton);

      // Should now show a textarea
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should update question text when typing', () => {
      const questions = [
        { question: '', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      // Trigger edit mode
      const editButton = screen.getByTitle('Edit');
      fireEvent.click(editButton);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New question text' } });

      expect(mockOnChange).toHaveBeenCalledWith([{ question: 'New question text', required: false }]);
    });

    it('should toggle required checkbox', () => {
      const questions = [
        { question: '', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      // Trigger edit mode
      const editButton = screen.getByTitle('Edit');
      fireEvent.click(editButton);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith([{ question: '', required: true }]);
    });

    it('should disable Done button when question is empty', () => {
      const questions = [
        { question: '', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      // Trigger edit mode
      const editButton = screen.getByTitle('Edit');
      fireEvent.click(editButton);

      const doneButton = screen.getByRole('button', { name: /Done/i });
      expect(doneButton).toBeDisabled();
    });

    it('should enable Done button when question has text', () => {
      const questions = [
        { question: 'Valid question', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      // Trigger edit mode
      const editButton = screen.getByTitle('Edit');
      fireEvent.click(editButton);

      const doneButton = screen.getByRole('button', { name: /Done/i });
      expect(doneButton).not.toBeDisabled();
    });
  });

  describe('Removing Questions', () => {
    it('should call onChange without the question when Remove is clicked', () => {
      const questions = [
        { question: 'Question to remove', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      // Trigger edit mode
      const editButton = screen.getByTitle('Edit');
      fireEvent.click(editButton);

      const removeButton = screen.getByRole('button', { name: /Remove/i });
      fireEvent.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Reordering Questions', () => {
    it('should move question up when up button is clicked', () => {
      const questions = [
        { question: 'First', required: false },
        { question: 'Second', required: true },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      // Click the move up button on the second question (index 1)
      const upButtons = screen.getAllByTitle('Move up');
      fireEvent.click(upButtons[1]);

      expect(mockOnChange).toHaveBeenCalledWith([
        { question: 'Second', required: true },
        { question: 'First', required: false },
      ]);
    });

    it('should move question down when down button is clicked', () => {
      const questions = [
        { question: 'First', required: false },
        { question: 'Second', required: true },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      // Click the move down button on the first question
      const downButtons = screen.getAllByTitle('Move down');
      fireEvent.click(downButtons[0]);

      expect(mockOnChange).toHaveBeenCalledWith([
        { question: 'Second', required: true },
        { question: 'First', required: false },
      ]);
    });

    it('should disable up button for first question', () => {
      const questions = [
        { question: 'First', required: false },
        { question: 'Second', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      const upButtons = screen.getAllByTitle('Move up');
      expect(upButtons[0]).toBeDisabled();
    });

    it('should disable down button for last question', () => {
      const questions = [
        { question: 'First', required: false },
        { question: 'Second', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} />);

      const downButtons = screen.getAllByTitle('Move down');
      expect(downButtons[1]).toBeDisabled();
    });
  });

  describe('Custom maxQuestions', () => {
    it('should respect custom maxQuestions value', () => {
      const questions = [
        { question: 'Q1', required: false },
        { question: 'Q2', required: false },
        { question: 'Q3', required: false },
      ];

      render(<CustomQuestionsBuilder value={questions} onChange={mockOnChange} maxQuestions={3} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Question/i });
      expect(addButton).toBeDisabled();
    });

    it('should show correct description for custom maxQuestions', () => {
      render(<CustomQuestionsBuilder value={[]} onChange={mockOnChange} maxQuestions={10} />);

      expect(screen.getByText(/Add up to 10 questions/i)).toBeInTheDocument();
    });
  });
});

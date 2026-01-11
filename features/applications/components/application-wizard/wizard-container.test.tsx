import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies BEFORE importing the component
const mockPush = vi.fn();
const mockNextStep = vi.fn();
const mockPrevStep = vi.fn();
const mockTrigger = vi.fn();
const mockGetValues = vi.fn();
const mockFormState = { isDirty: false };
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/components/providers/toast-provider', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('../../hooks/use-application-wizard', () => ({
  useApplicationWizard: vi.fn(() => ({
    currentStep: 1,
    form: {
      trigger: mockTrigger,
      getValues: mockGetValues,
      formState: mockFormState,
    },
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    resumeUrl: undefined,
    setResumeUrl: vi.fn(),
    coverLetterUrl: undefined,
    setCoverLetterUrl: vi.fn(),
    extractedText: undefined,
    setExtractedText: vi.fn(),
    nextStep: mockNextStep,
    prevStep: mockPrevStep,
  })),
}));

vi.mock('../../actions/application-actions', () => ({
  submitApplication: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('./progress-indicator', () => ({
  ProgressIndicator: ({ currentStep, totalSteps }: any) => (
    <div data-testid="progress-indicator">
      Step {currentStep} of {totalSteps}
    </div>
  ),
}));

vi.mock('./auto-save-indicator', () => ({
  AutoSaveIndicator: ({ isSaving, lastSaved }: any) => (
    <div data-testid="auto-save-indicator" data-saving={isSaving}>
      {isSaving ? 'Saving...' : lastSaved ? 'Saved' : 'Not saved'}
    </div>
  ),
}));

vi.mock('./step-1-documents', () => ({
  Step1Documents: () => <div data-testid="step-1">Step 1: Documents</div>,
}));

vi.mock('./step-2-personal-info', () => ({
  Step2PersonalInfo: () => <div data-testid="step-2">Step 2: Personal Info</div>,
}));

vi.mock('./step-3-contact', () => ({
  Step3Contact: () => <div data-testid="step-3">Step 3: Contact</div>,
}));

vi.mock('./step-4-work-auth', () => ({
  Step4WorkAuth: () => <div data-testid="step-4">Step 4: Work Auth</div>,
}));

vi.mock('./step-5-work-history', () => ({
  Step5WorkHistory: () => <div data-testid="step-5">Step 5: Work History</div>,
}));

vi.mock('./step-6-education', () => ({
  Step6Education: () => <div data-testid="step-6">Step 6: Education</div>,
}));

vi.mock('./step-7-skills', () => ({
  Step7Skills: () => <div data-testid="step-7">Step 7: Skills</div>,
}));

vi.mock('./step-8-references', () => ({
  Step8References: () => <div data-testid="step-8">Step 8: References</div>,
}));

vi.mock('./step-screening-questions', () => ({
  StepScreeningQuestions: () => <div data-testid="step-screening">Screening Questions</div>,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, type, variant, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type || 'button'}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
  LoadingSpinner: ({ className }: any) => (
    <div data-testid="loading-spinner" className={className}>Loading...</div>
  ),
}));

import { ApplicationWizardContainer } from './wizard-container';
import { useApplicationWizard } from '../../hooks/use-application-wizard';
import { submitApplication } from '../../actions/application-actions';

const mockUseApplicationWizard = useApplicationWizard as ReturnType<typeof vi.fn>;
const mockSubmitApplication = submitApplication as ReturnType<typeof vi.fn>;

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('ApplicationWizardContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrigger.mockResolvedValue(true);
    mockGetValues.mockReturnValue({
      fullName: 'John Doe',
      phoneNumber: '555-1234',
    });
    mockSubmitApplication.mockResolvedValue({ success: true });
    mockUseApplicationWizard.mockReturnValue({
      currentStep: 1,
      form: {
        trigger: mockTrigger,
        getValues: mockGetValues,
        formState: mockFormState,
      },
      isLoading: false,
      isSaving: false,
      lastSaved: null,
      resumeUrl: undefined,
      setResumeUrl: vi.fn(),
      coverLetterUrl: undefined,
      setCoverLetterUrl: vi.fn(),
      extractedText: undefined,
      setExtractedText: vi.fn(),
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
    });
  });

  describe('Initial Render', () => {
    it('should render the wizard container with job title', () => {
      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Senior Electrician" />
      );

      expect(screen.getByText('Apply for Senior Electrician')).toBeInTheDocument();
    });

    it('should render progress indicator', () => {
      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();
    });

    it('should render auto-save indicator', () => {
      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      expect(screen.getByTestId('auto-save-indicator')).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    });

    it('should show step 1 of 8 text', () => {
      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      // Step text appears in both progress indicator and navigation
      const stepTexts = screen.getAllByText(/Step 1 of 8/i);
      expect(stepTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 1,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: true,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading your draft...')).toBeInTheDocument();
    });
  });

  describe('Step Content', () => {
    it('should render Step 1 when currentStep is 1', () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 1,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      expect(screen.getByTestId('step-1')).toBeInTheDocument();
    });

    it('should render Step 2 when currentStep is 2', () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 2,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      expect(screen.getByTestId('step-2')).toBeInTheDocument();
    });

    it('should render Step 8 when currentStep is 8', () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 8,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      expect(screen.getByTestId('step-8')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call nextStep when Next button is clicked', () => {
      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      const nextButton = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextButton);

      expect(mockNextStep).toHaveBeenCalled();
    });

    it('should call prevStep when Back button is clicked', () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 3,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      const backButton = screen.getByRole('button', { name: /Back/i });
      fireEvent.click(backButton);

      expect(mockPrevStep).toHaveBeenCalled();
    });

    it('should disable Back button on step 1', () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 1,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      const backButton = screen.getByRole('button', { name: /Back/i });
      expect(backButton).toBeDisabled();
    });
  });

  describe('Final Step', () => {
    it('should show Submit button on final step', () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 8,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      expect(screen.getByRole('button', { name: /Submit Application/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Next$/i })).not.toBeInTheDocument();
    });

    it('should show "Ready to submit?" text on final step', () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 8,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      expect(screen.getByText('Ready to submit?')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call submitApplication on submit', async () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 8,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: 'https://example.com/resume.pdf',
        setResumeUrl: vi.fn(),
        coverLetterUrl: 'https://example.com/cover.pdf',
        setCoverLetterUrl: vi.fn(),
        extractedText: 'Resume text',
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      const submitButton = screen.getByRole('button', { name: /Submit Application/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockTrigger).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockSubmitApplication).toHaveBeenCalledWith(
          'job-123',
          expect.any(Object),
          'https://example.com/resume.pdf',
          'https://example.com/cover.pdf',
          'Resume text'
        );
      });
    });

    it('should show success toast and redirect on successful submission', async () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 8,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });
      mockSubmitApplication.mockResolvedValue({ success: true });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      const submitButton = screen.getByRole('button', { name: /Submit Application/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Application submitted successfully!');
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/applications?submitted=true');
      });
    });

    it('should show error toast on validation failure', async () => {
      mockTrigger.mockResolvedValue(false);
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 8,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      const submitButton = screen.getByRole('button', { name: /Submit Application/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Please complete all required fields before submitting');
      });
    });

    it('should show error toast on submission failure', async () => {
      mockSubmitApplication.mockResolvedValue({ success: false, error: 'Server error' });
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 8,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      const submitButton = screen.getByRole('button', { name: /Submit Application/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Server error');
      });
    });
  });

  describe('Saving State', () => {
    it('should show saving state in auto-save indicator', () => {
      mockUseApplicationWizard.mockReturnValue({
        currentStep: 1,
        form: { trigger: mockTrigger, getValues: mockGetValues, formState: mockFormState },
        isLoading: false,
        isSaving: true,
        lastSaved: null,
        resumeUrl: undefined,
        setResumeUrl: vi.fn(),
        coverLetterUrl: undefined,
        setCoverLetterUrl: vi.fn(),
        extractedText: undefined,
        setExtractedText: vi.fn(),
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
      });

      renderWithProviders(
        <ApplicationWizardContainer jobId="job-123" jobTitle="Test Job" />
      );

      const indicator = screen.getByTestId('auto-save-indicator');
      expect(indicator).toHaveAttribute('data-saving', 'true');
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });
});

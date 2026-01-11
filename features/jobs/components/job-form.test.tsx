import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock dependencies BEFORE importing the component
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, type, variant, onClick, isLoading, disabled, ...props }: any) => (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled || isLoading}
      data-variant={variant}
      data-loading={isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ label, value, onChange, required, disabled, helperText, ...props }: any) => (
    <div>
      <label>
        {label}
        {required && <span>*</span>}
      </label>
      <input
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
        {...props}
      />
      {helperText && <span>{helperText}</span>}
    </div>
  ),
  Select: ({ label, value, onChange, options, required, disabled }: any) => (
    <div>
      <label>
        {label}
        {required && <span>*</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock('@/components/common/location-autocomplete', () => ({
  LocationAutocomplete: ({ label, value, onChange, placeholder, required }: any) => (
    <div data-testid="location-autocomplete">
      <label>{label}</label>
      <input
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange({ address: e.target.value, coords: null })}
        aria-label={label}
        required={required}
      />
    </div>
  ),
}));

vi.mock('./custom-questions-builder', () => ({
  CustomQuestionsBuilder: ({ value, onChange }: any) => (
    <div data-testid="custom-questions-builder">
      <button
        type="button"
        onClick={() => onChange([...value, { question: 'New Question', required: false }])}
      >
        Add Question
      </button>
      <span>Questions: {value.length}</span>
    </div>
  ),
}));

vi.mock('@/lib/constants', () => ({
  TRADES: ['Electricians', 'Plumbers', 'HVAC'],
  TRADE_SUBCATEGORIES: {
    Electricians: ['Inside Wireman (Commercial)', 'Residential Wireman'],
    Plumbers: ['Service Plumber', 'New Construction'],
    HVAC: ['Installation', 'Service'],
  },
  JOB_TYPES: ['Full-Time', 'Part-Time', 'Temporary', 'Contract', '1099'],
}));

vi.mock('@/lib/constants/certifications', () => ({
  CERTIFICATION_CATEGORIES: {
    Safety: ['OSHA 10', 'OSHA 30'],
    Electrical: ['Licensed Electrician', 'Master Electrician'],
  },
  TRADE_TO_CERT_CATEGORY: {
    Electricians: 'Electrical',
    Plumbers: 'Plumbing',
    HVAC: 'HVAC',
  },
}));

const mockCreateJob = vi.fn();
vi.mock('../actions/job-actions', () => ({
  createJob: (...args: any[]) => mockCreateJob(...args),
}));

import { JobForm } from './job-form';

describe('JobForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateJob.mockResolvedValue({ success: true });
  });

  describe('Initial Render', () => {
    it('should render the form with empty fields', () => {
      render(<JobForm />);

      expect(screen.getByLabelText(/Job Title/i)).toHaveValue('');
      expect(screen.getByLabelText(/Job Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Location/i)).toHaveValue('');
    });

    it('should render the Post Job button', () => {
      render(<JobForm />);
      expect(screen.getByRole('button', { name: /Post Job/i })).toBeInTheDocument();
    });

    it('should render the Cancel button', () => {
      render(<JobForm />);
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should render trades needed section', () => {
      render(<JobForm />);
      expect(screen.getByText(/Trades Needed/i)).toBeInTheDocument();
    });

    it('should render job description textarea', () => {
      render(<JobForm />);
      expect(screen.getByPlaceholderText(/Describe the job responsibilities/i)).toBeInTheDocument();
    });

    it('should render required certifications section', () => {
      render(<JobForm />);
      expect(screen.getByText(/Required Certifications/i)).toBeInTheDocument();
    });

    it('should render screening questions section', () => {
      render(<JobForm />);
      expect(screen.getByText(/Screening Questions/i)).toBeInTheDocument();
    });

    it('should show prompt to select job type for pay rate options', () => {
      render(<JobForm />);
      expect(screen.getByText(/Select a job type above to configure pay rate options/i)).toBeInTheDocument();
    });
  });

  describe('Title Field', () => {
    it('should update title field on input', () => {
      render(<JobForm />);
      const titleInput = screen.getByLabelText(/Job Title/i);

      fireEvent.change(titleInput, { target: { value: 'Senior Electrician Needed' } });

      expect(titleInput).toHaveValue('Senior Electrician Needed');
    });
  });

  describe('Trade Selection', () => {
    it('should render initial trade dropdown', () => {
      render(<JobForm />);
      expect(screen.getByLabelText(/Trade 1/i)).toBeInTheDocument();
    });

    it('should update trade dropdown when trade is selected', () => {
      render(<JobForm />);
      const tradeSelect = screen.getByLabelText(/Trade 1/i);

      fireEvent.change(tradeSelect, { target: { value: 'Electricians' } });

      expect(tradeSelect).toHaveValue('Electricians');
    });

    it('should show subtrade options after selecting a trade', () => {
      render(<JobForm />);
      const tradeSelect = screen.getByLabelText(/Trade 1/i);

      fireEvent.change(tradeSelect, { target: { value: 'Electricians' } });

      // Should show + Specialty button
      expect(screen.getByRole('button', { name: /\+ Specialty/i })).toBeInTheDocument();
    });

    it('should add new trade selection when + Trade is clicked', () => {
      render(<JobForm />);

      const addTradeButton = screen.getByRole('button', { name: /\+ Trade/i });
      fireEvent.click(addTradeButton);

      // Should now have Trade 2
      expect(screen.getByLabelText(/Trade 2/i)).toBeInTheDocument();
    });

    it('should remove trade selection when × is clicked', () => {
      render(<JobForm />);

      // Add second trade
      const addTradeButton = screen.getByRole('button', { name: /\+ Trade/i });
      fireEvent.click(addTradeButton);

      // Remove the second trade
      const removeButtons = screen.getAllByRole('button', { name: /×/i });
      fireEvent.click(removeButtons[0]);

      // Should no longer have Trade 2
      expect(screen.queryByLabelText(/Trade 2/i)).not.toBeInTheDocument();
    });
  });

  describe('Job Type Selection', () => {
    it('should show hourly rate fields for Full-Time jobs', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);

      fireEvent.change(jobTypeSelect, { target: { value: 'Full-Time' } });

      expect(screen.getByLabelText(/Hourly Rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Pay Period/i)).toBeInTheDocument();
    });

    it('should show hourly rate fields for Part-Time jobs', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);

      fireEvent.change(jobTypeSelect, { target: { value: 'Part-Time' } });

      expect(screen.getByLabelText(/Hourly Rate/i)).toBeInTheDocument();
    });

    it('should show hourly rate fields for Temporary jobs', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);

      fireEvent.change(jobTypeSelect, { target: { value: 'Temporary' } });

      expect(screen.getByLabelText(/Hourly Rate/i)).toBeInTheDocument();
    });

    it('should show contract amount fields for Contract jobs', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);

      fireEvent.change(jobTypeSelect, { target: { value: 'Contract' } });

      expect(screen.getByLabelText(/Contract\/Job Amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Payment Type/i)).toBeInTheDocument();
    });

    it('should show contract amount fields for 1099 jobs', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);

      fireEvent.change(jobTypeSelect, { target: { value: '1099' } });

      expect(screen.getByLabelText(/Contract\/Job Amount/i)).toBeInTheDocument();
    });

    it('should show contract duration for Temporary jobs', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);

      fireEvent.change(jobTypeSelect, { target: { value: 'Temporary' } });

      expect(screen.getByLabelText(/Contract Duration/i)).toBeInTheDocument();
    });

    it('should show contract duration for Contract jobs', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);

      fireEvent.change(jobTypeSelect, { target: { value: 'Contract' } });

      expect(screen.getByLabelText(/Contract Duration/i)).toBeInTheDocument();
    });
  });

  describe('Pay Rate Configuration', () => {
    it('should update hourly rate when input changes', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);
      fireEvent.change(jobTypeSelect, { target: { value: 'Full-Time' } });

      const hourlyInput = screen.getByLabelText(/Hourly Rate/i);
      fireEvent.change(hourlyInput, { target: { value: '35' } });

      expect(hourlyInput).toHaveValue(35);
    });

    it('should update pay period when selection changes', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);
      fireEvent.change(jobTypeSelect, { target: { value: 'Full-Time' } });

      const payPeriodSelect = screen.getByLabelText(/Pay Period/i);
      fireEvent.change(payPeriodSelect, { target: { value: 'bi-weekly' } });

      expect(payPeriodSelect).toHaveValue('bi-weekly');
    });

    it('should update contract amount when input changes', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);
      fireEvent.change(jobTypeSelect, { target: { value: 'Contract' } });

      const contractInput = screen.getByLabelText(/Contract\/Job Amount/i);
      fireEvent.change(contractInput, { target: { value: '5000' } });

      expect(contractInput).toHaveValue(5000);
    });

    it('should update payment type when selection changes', () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);
      fireEvent.change(jobTypeSelect, { target: { value: 'Contract' } });

      const paymentTypeSelect = screen.getByLabelText(/Payment Type/i);
      fireEvent.change(paymentTypeSelect, { target: { value: 'Per Job' } });

      expect(paymentTypeSelect).toHaveValue('Per Job');
    });

    it('should display formatted pay rate for hourly jobs', async () => {
      render(<JobForm />);
      const jobTypeSelect = screen.getByLabelText(/Job Type/i);
      fireEvent.change(jobTypeSelect, { target: { value: 'Full-Time' } });

      const hourlyInput = screen.getByLabelText(/Hourly Rate/i);
      fireEvent.change(hourlyInput, { target: { value: '35' } });

      await waitFor(() => {
        expect(screen.getByText(/\$35\/hr \(weekly\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Location Autocomplete', () => {
    it('should render location autocomplete component', () => {
      render(<JobForm />);
      expect(screen.getByTestId('location-autocomplete')).toBeInTheDocument();
    });

    it('should update location when input changes', () => {
      render(<JobForm />);
      const locationInput = screen.getByLabelText(/Location/i);

      fireEvent.change(locationInput, { target: { value: 'Austin, TX' } });

      expect(locationInput).toHaveValue('Austin, TX');
    });
  });

  describe('Job Description', () => {
    it('should update description when textarea changes', () => {
      render(<JobForm />);
      const descriptionInput = screen.getByPlaceholderText(/Describe the job responsibilities/i);

      fireEvent.change(descriptionInput, { target: { value: 'Looking for an experienced electrician' } });

      expect(descriptionInput).toHaveValue('Looking for an experienced electrician');
    });
  });

  describe('Certification Selection', () => {
    it('should show Safety category by default', () => {
      render(<JobForm />);
      expect(screen.getByText('Safety')).toBeInTheDocument();
    });

    it('should show certification checkboxes when category is expanded', () => {
      render(<JobForm />);

      // Safety is expanded by default
      expect(screen.getByText('OSHA 10')).toBeInTheDocument();
      expect(screen.getByText('OSHA 30')).toBeInTheDocument();
    });

    it('should toggle certification selection', () => {
      render(<JobForm />);

      const oshaCheckbox = screen.getByRole('checkbox', { name: /OSHA 10/i });
      fireEvent.click(oshaCheckbox);

      expect(oshaCheckbox).toBeChecked();
    });

    it('should show selected certifications count', () => {
      render(<JobForm />);

      const oshaCheckbox = screen.getByRole('checkbox', { name: /OSHA 10/i });
      fireEvent.click(oshaCheckbox);

      // Component shows "1 certification selected" - number is in a <strong> tag
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText(/certification selected/i)).toBeInTheDocument();
    });

    it('should toggle category expansion', () => {
      render(<JobForm />);

      // Click on Safety to collapse
      const safetyButton = screen.getByRole('button', { name: /Safety/i });
      fireEvent.click(safetyButton);

      // OSHA 10 should no longer be visible
      expect(screen.queryByText('OSHA 10')).not.toBeInTheDocument();
    });
  });

  describe('Custom Questions', () => {
    it('should render custom questions builder', () => {
      render(<JobForm />);
      expect(screen.getByTestId('custom-questions-builder')).toBeInTheDocument();
    });

    it('should show questions count', () => {
      render(<JobForm />);
      expect(screen.getByText('Questions: 0')).toBeInTheDocument();
    });

    it('should add question when button clicked', () => {
      render(<JobForm />);

      const addButton = screen.getByRole('button', { name: /Add Question/i });
      fireEvent.click(addButton);

      expect(screen.getByText('Questions: 1')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should show error when no trade is selected', async () => {
      render(<JobForm />);

      // Fill all required fields except trade
      fireEvent.change(screen.getByLabelText(/Job Title/i), {
        target: { value: 'Test Job' },
      });
      fireEvent.change(screen.getByLabelText(/Job Type/i), {
        target: { value: 'Full-Time' },
      });
      fireEvent.change(screen.getByLabelText(/Location/i), {
        target: { value: 'Austin, TX' },
      });
      fireEvent.change(screen.getByLabelText(/Hourly Rate/i), {
        target: { value: '35' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Describe the job responsibilities/i), {
        target: { value: 'Job description here' },
      });

      // Submit form - the component checks for trades in handleSubmit
      const form = screen.getByRole('button', { name: /Post Job/i }).closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Please select at least one trade/i)).toBeInTheDocument();
      });
    });

    it('should call createJob with correct data when form is valid', async () => {
      render(<JobForm />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Job Title/i), {
        target: { value: 'Electrician Needed' },
      });
      fireEvent.change(screen.getByLabelText(/Trade 1/i), {
        target: { value: 'Electricians' },
      });
      fireEvent.change(screen.getByLabelText(/Job Type/i), {
        target: { value: 'Full-Time' },
      });
      fireEvent.change(screen.getByLabelText(/Location/i), {
        target: { value: 'Austin, TX' },
      });
      fireEvent.change(screen.getByLabelText(/Hourly Rate/i), {
        target: { value: '35' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Describe the job responsibilities/i), {
        target: { value: 'Job description here' },
      });

      const submitButton = screen.getByRole('button', { name: /Post Job/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateJob).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Electrician Needed',
            job_type: 'Full-Time',
            location: 'Austin, TX',
            description: 'Job description here',
          })
        );
      });
    });

    it('should show loading state during submission', async () => {
      mockCreateJob.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<JobForm />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Job Title/i), {
        target: { value: 'Electrician Needed' },
      });
      fireEvent.change(screen.getByLabelText(/Trade 1/i), {
        target: { value: 'Electricians' },
      });
      fireEvent.change(screen.getByLabelText(/Job Type/i), {
        target: { value: 'Full-Time' },
      });
      fireEvent.change(screen.getByLabelText(/Location/i), {
        target: { value: 'Austin, TX' },
      });
      fireEvent.change(screen.getByLabelText(/Hourly Rate/i), {
        target: { value: '35' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Describe the job responsibilities/i), {
        target: { value: 'Job description here' },
      });

      const submitButton = screen.getByRole('button', { name: /Post Job/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toHaveAttribute('data-loading', 'true');
      });
    });

    it('should show error message when submission fails', async () => {
      mockCreateJob.mockResolvedValue({
        success: false,
        error: 'Failed to create job',
      });

      render(<JobForm />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Job Title/i), {
        target: { value: 'Electrician Needed' },
      });
      fireEvent.change(screen.getByLabelText(/Trade 1/i), {
        target: { value: 'Electricians' },
      });
      fireEvent.change(screen.getByLabelText(/Job Type/i), {
        target: { value: 'Full-Time' },
      });
      fireEvent.change(screen.getByLabelText(/Location/i), {
        target: { value: 'Austin, TX' },
      });
      fireEvent.change(screen.getByLabelText(/Hourly Rate/i), {
        target: { value: '35' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Describe the job responsibilities/i), {
        target: { value: 'Job description here' },
      });

      const submitButton = screen.getByRole('button', { name: /Post Job/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create job/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      mockCreateJob.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<JobForm />);

      // Fill all required fields
      fireEvent.change(screen.getByLabelText(/Job Title/i), {
        target: { value: 'Electrician Needed' },
      });
      fireEvent.change(screen.getByLabelText(/Trade 1/i), {
        target: { value: 'Electricians' },
      });
      fireEvent.change(screen.getByLabelText(/Job Type/i), {
        target: { value: 'Full-Time' },
      });
      fireEvent.change(screen.getByLabelText(/Location/i), {
        target: { value: 'Austin, TX' },
      });
      fireEvent.change(screen.getByLabelText(/Hourly Rate/i), {
        target: { value: '35' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Describe the job responsibilities/i), {
        target: { value: 'Job description here' },
      });

      // Submit the form
      const form = screen.getByRole('button', { name: /Post Job/i }).closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        // The Button shows Loading... text when isLoading is true
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Button', () => {
    it('should call history.back when cancel is clicked', () => {
      const mockBack = vi.fn();
      vi.spyOn(window.history, 'back').mockImplementation(mockBack);

      render(<JobForm />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });
});

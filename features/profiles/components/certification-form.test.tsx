import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock dependencies BEFORE importing the component
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockAddCertification = vi.fn();
const mockUploadCertificationPhoto = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
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

vi.mock('../actions/certification-actions', () => ({
  addCertification: (...args: any[]) => mockAddCertification(...args),
  uploadCertificationPhoto: (...args: any[]) => mockUploadCertificationPhoto(...args),
}));

vi.mock('@/lib/constants', () => ({
  ALL_CERTIFICATIONS: ['OSHA 10', 'OSHA 30', 'First Aid/CPR'],
  CERTIFICATION_CATEGORIES: {
    'Safety': ['OSHA 10', 'OSHA 30'],
    'Health': ['First Aid/CPR'],
  },
  ALL_LICENSES: ['General Contractor', 'Electrical Contractor'],
  LICENSE_CATEGORIES: {
    'General': ['General Contractor'],
    'Specialty': ['Electrical Contractor'],
  },
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, type, variant, isLoading, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      type={type || 'button'}
      data-variant={variant}
      data-loading={isLoading}
      className={className}
    >
      {children}
    </button>
  ),
  Input: ({ id, type, value, onChange, placeholder, disabled, maxLength, required, min }: any) => (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      required={required}
      min={min}
      aria-label={id}
    />
  ),
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: any) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}));

import { CertificationForm } from './certification-form';

describe('CertificationForm Component', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddCertification.mockResolvedValue({ success: true });
    mockUploadCertificationPhoto.mockResolvedValue({
      success: true,
      data: { url: 'https://example.com/photo.jpg' },
    });
  });

  describe('Worker Certification Form', () => {
    it('should render certification form with title', () => {
      render(<CertificationForm />);

      expect(screen.getByTestId('card-title')).toHaveTextContent('Certification Details');
    });

    it('should show Certification Type label for workers', () => {
      render(<CertificationForm role="worker" />);

      expect(screen.getByLabelText(/Certification Type/i)).toBeInTheDocument();
    });

    it('should show Certification Number field', () => {
      render(<CertificationForm />);

      expect(screen.getByLabelText(/certification_number/i)).toBeInTheDocument();
    });

    it('should show Issuing Organization field', () => {
      render(<CertificationForm />);

      expect(screen.getByLabelText(/issued_by/i)).toBeInTheDocument();
    });

    it('should show Issue Date field', () => {
      render(<CertificationForm />);

      expect(screen.getByLabelText(/issue_date/i)).toBeInTheDocument();
    });

    it('should show Expiration Date field', () => {
      render(<CertificationForm />);

      expect(screen.getByLabelText(/expires_at/i)).toBeInTheDocument();
    });

    it('should show Add Certification button', () => {
      render(<CertificationForm />);

      expect(screen.getByRole('button', { name: /Add Certification/i })).toBeInTheDocument();
    });

    it('should show Cancel button that navigates to profile', () => {
      render(<CertificationForm />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/profile');
    });
  });

  describe('Contractor License Form', () => {
    it('should show License Details title for contractors', () => {
      render(<CertificationForm role="employer" employerType="contractor" />);

      expect(screen.getByTestId('card-title')).toHaveTextContent('License Details');
    });

    it('should show License Type label for contractors', () => {
      render(<CertificationForm role="employer" employerType="contractor" />);

      expect(screen.getByLabelText(/License Type/i)).toBeInTheDocument();
    });

    it('should show Add License button for contractors', () => {
      render(<CertificationForm role="employer" employerType="contractor" />);

      expect(screen.getByRole('button', { name: /Add License/i })).toBeInTheDocument();
    });
  });

  describe('Certification Type Selection', () => {
    it('should have a dropdown for selecting certification type', () => {
      render(<CertificationForm />);

      const select = screen.getByLabelText(/Certification Type/i);
      expect(select.tagName).toBe('SELECT');
    });

    it('should show all certification options', () => {
      render(<CertificationForm />);

      const select = screen.getByLabelText(/Certification Type/i);
      expect(select).toContainHTML('OSHA 10');
      expect(select).toContainHTML('OSHA 30');
      expect(select).toContainHTML('First Aid/CPR');
    });

    it('should have an "Other" option for custom certification', () => {
      render(<CertificationForm />);

      const select = screen.getByLabelText(/Certification Type/i);
      expect(select).toContainHTML('Other (specify below)');
    });

    it('should show custom certification input when "custom" is selected', () => {
      render(<CertificationForm />);

      const select = screen.getByLabelText(/Certification Type/i);
      fireEvent.change(select, { target: { value: 'custom' } });

      expect(screen.getByLabelText(/customCertification/i)).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('should show category dropdown when multiple categories exist', () => {
      render(<CertificationForm />);

      const categorySelect = screen.getByLabelText(/Category/i);
      expect(categorySelect).toBeInTheDocument();
    });

    it('should filter certification options by category', () => {
      render(<CertificationForm />);

      const categorySelect = screen.getByLabelText(/Category/i);
      fireEvent.change(categorySelect, { target: { value: 'Safety' } });

      const typeSelect = screen.getByLabelText(/Certification Type/i);
      expect(typeSelect).toContainHTML('OSHA 10');
      expect(typeSelect).toContainHTML('OSHA 30');
    });
  });

  describe('Form Validation', () => {
    it('should show error when certification type is not selected', async () => {
      render(<CertificationForm />);

      const submitButton = screen.getByRole('button', { name: /Add Certification/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select or enter a certification type/i)).toBeInTheDocument();
      });
    });

    it('should show error when certification number is missing', async () => {
      render(<CertificationForm />);

      const typeSelect = screen.getByLabelText(/Certification Type/i);
      fireEvent.change(typeSelect, { target: { value: 'OSHA 10' } });

      const submitButton = screen.getByRole('button', { name: /Add Certification/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Certification number is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when issuing organization is missing', async () => {
      render(<CertificationForm />);

      const typeSelect = screen.getByLabelText(/Certification Type/i);
      fireEvent.change(typeSelect, { target: { value: 'OSHA 10' } });

      const numberInput = screen.getByLabelText(/certification_number/i);
      fireEvent.change(numberInput, { target: { value: '12345' } });

      const submitButton = screen.getByRole('button', { name: /Add Certification/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Issuing organization is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when photo is missing', async () => {
      render(<CertificationForm />);

      const typeSelect = screen.getByLabelText(/Certification Type/i);
      fireEvent.change(typeSelect, { target: { value: 'OSHA 10' } });

      const numberInput = screen.getByLabelText(/certification_number/i);
      fireEvent.change(numberInput, { target: { value: '12345' } });

      const orgInput = screen.getByLabelText(/issued_by/i);
      fireEvent.change(orgInput, { target: { value: 'OSHA' } });

      const submitButton = screen.getByRole('button', { name: /Add Certification/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Certification photo is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Photo Upload', () => {
    it('should show upload area', () => {
      render(<CertificationForm />);

      expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
    });

    it('should accept image files', () => {
      render(<CertificationForm />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.accept).toContain('image/jpeg');
      expect(input.accept).toContain('image/png');
      expect(input.accept).toContain('application/pdf');
    });
  });

  describe('Form Submission', () => {
    it('should call onSuccess callback on successful submission', async () => {
      // Create a mock file for testing
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      render(<CertificationForm onSuccess={mockOnSuccess} />);

      // Fill required fields
      const typeSelect = screen.getByLabelText(/Certification Type/i);
      fireEvent.change(typeSelect, { target: { value: 'OSHA 10' } });

      const numberInput = screen.getByLabelText(/certification_number/i);
      fireEvent.change(numberInput, { target: { value: '12345' } });

      const orgInput = screen.getByLabelText(/issued_by/i);
      fireEvent.change(orgInput, { target: { value: 'OSHA' } });

      // Simulate file upload
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      fireEvent.change(fileInput);

      const submitButton = screen.getByRole('button', { name: /Add Certification/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUploadCertificationPhoto).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockAddCertification).toHaveBeenCalledWith(expect.objectContaining({
          certification_type: 'OSHA 10',
          certification_number: '12345',
          issued_by: 'OSHA',
        }));
      });

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should show error toast on upload failure', async () => {
      mockUploadCertificationPhoto.mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      render(<CertificationForm />);

      const typeSelect = screen.getByLabelText(/Certification Type/i);
      fireEvent.change(typeSelect, { target: { value: 'OSHA 10' } });

      const numberInput = screen.getByLabelText(/certification_number/i);
      fireEvent.change(numberInput, { target: { value: '12345' } });

      const orgInput = screen.getByLabelText(/issued_by/i);
      fireEvent.change(orgInput, { target: { value: 'OSHA' } });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', { value: [file] });
      fireEvent.change(fileInput);

      const submitButton = screen.getByRole('button', { name: /Add Certification/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Upload failed');
      });
    });

    it('should show error toast on submission failure', async () => {
      mockAddCertification.mockResolvedValue({
        success: false,
        error: 'Server error',
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      render(<CertificationForm />);

      const typeSelect = screen.getByLabelText(/Certification Type/i);
      fireEvent.change(typeSelect, { target: { value: 'OSHA 10' } });

      const numberInput = screen.getByLabelText(/certification_number/i);
      fireEvent.change(numberInput, { target: { value: '12345' } });

      const orgInput = screen.getByLabelText(/issued_by/i);
      fireEvent.change(orgInput, { target: { value: 'OSHA' } });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', { value: [file] });
      fireEvent.change(fileInput);

      const submitButton = screen.getByRole('button', { name: /Add Certification/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Server error');
      });
    });
  });

  describe('Cancel Handling', () => {
    it('should call onCancel when provided and Cancel is clicked', () => {
      render(<CertificationForm onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should redirect to profile when no onCancel provided', () => {
      render(<CertificationForm />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/profile');
    });
  });

  describe('Verification Info', () => {
    it('should show verification process info', () => {
      render(<CertificationForm />);

      expect(screen.getByText(/Verification Process/i)).toBeInTheDocument();
      expect(screen.getByText(/24-48 hours/i)).toBeInTheDocument();
    });
  });
});

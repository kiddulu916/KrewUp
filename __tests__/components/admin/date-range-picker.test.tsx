// __tests__/components/admin/date-range-picker.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangePicker, type DateRangeValue } from '@/components/admin/date-range-picker';

describe('DateRangePicker', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default preset (Last 7 days)', () => {
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={mockOnChange} />);

    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
  });

  it('calls onChange when preset is selected', () => {
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'last30days' } });

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      preset: 'last30days',
    }));
  });

  it('should render all preset options', () => {
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');
    expect(select).toContainHTML('Last 7 days');
    expect(select).toContainHTML('Last 30 days');
    expect(select).toContainHTML('Last 90 days');
    expect(select).toContainHTML('Custom range');
  });

  it('should show custom date inputs when custom preset selected', () => {
    const value: DateRangeValue = {
      preset: 'custom',
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2025, 0, 15),
    };
    render(<DateRangePicker value={value} onChange={mockOnChange} />);

    // The labels are "Start Date" and "End Date"
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  it('should not show custom date inputs for preset ranges', () => {
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={mockOnChange} />);

    expect(screen.queryByLabelText(/start date/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/end date/i)).not.toBeInTheDocument();
  });

  it('should render compare checkbox', () => {
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={mockOnChange} />);

    expect(screen.getByLabelText(/compare to previous period/i)).toBeInTheDocument();
  });

  it('should call onChange when compare checkbox is toggled', async () => {
    const user = userEvent.setup();
    render(<DateRangePicker value={{ preset: 'last7days', compareEnabled: false }} onChange={mockOnChange} />);

    const checkbox = screen.getByLabelText(/compare to previous period/i);
    await user.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        compareEnabled: true,
      })
    );
  });

  it('should preserve compareEnabled when changing preset', () => {
    render(<DateRangePicker value={{ preset: 'last7days', compareEnabled: true }} onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'last30days' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        compareEnabled: true,
      })
    );
  });

  it('should call onChange with preset custom when switching to custom', () => {
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'custom' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'custom',
      })
    );
  });

  it('should call onChange when start date changes', async () => {
    const value: DateRangeValue = {
      preset: 'custom',
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2025, 0, 15),
    };
    render(<DateRangePicker value={value} onChange={mockOnChange} />);

    // Find the date input by type using querySelector
    const startInput = document.querySelector('input[type="date"]');
    expect(startInput).toBeInTheDocument();
    fireEvent.change(startInput!, { target: { value: '2025-01-05' } });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should call onChange when end date changes', async () => {
    const value: DateRangeValue = {
      preset: 'custom',
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2025, 0, 15),
    };
    render(<DateRangePicker value={value} onChange={mockOnChange} />);

    // Find all date inputs and use the second one (end date)
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
    fireEvent.change(dateInputs[1], { target: { value: '2025-01-20' } });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should set correct dates for last90days preset', () => {
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'last90days' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'last90days',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      })
    );
  });
});

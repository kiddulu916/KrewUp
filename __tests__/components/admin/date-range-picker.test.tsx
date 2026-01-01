// __tests__/components/admin/date-range-picker.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker } from '@/components/admin/date-range-picker';

describe('DateRangePicker', () => {
  it('renders with default preset (Last 7 days)', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={onChange} />);

    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
  });

  it('calls onChange when preset is selected', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ preset: 'last7days' }} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'last30days' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      preset: 'last30days',
    }));
  });
});

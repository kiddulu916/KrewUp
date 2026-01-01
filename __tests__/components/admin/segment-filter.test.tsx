import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentFilter } from '@/components/admin/segment-filter';

describe('SegmentFilter', () => {
  it('renders all filter options', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{}} onChange={onChange} />);

    expect(screen.getByText('User Role')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it('calls onChange when role filter is selected', () => {
    const onChange = vi.fn();
    render(<SegmentFilter value={{}} onChange={onChange} />);

    const roleSelect = screen.getByLabelText('User Role');
    fireEvent.change(roleSelect, { target: { value: 'worker' } });

    expect(onChange).toHaveBeenCalledWith({ role: 'worker' });
  });
});

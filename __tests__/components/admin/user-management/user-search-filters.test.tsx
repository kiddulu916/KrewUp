import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserSearchFilters } from '@/components/admin/user-management/user-search-filters';

describe('UserSearchFilters Component', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    roleFilter: 'all',
    onRoleFilterChange: vi.fn(),
    subscriptionFilter: 'all',
    onSubscriptionFilterChange: vi.fn(),
    totalUsers: 100,
    filteredUsersCount: 100,
  };

  it('should render with default props', () => {
    render(<UserSearchFilters {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search by name or email...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Roles')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Subscriptions')).toBeInTheDocument();
  });

  it('should display user count correctly', () => {
    render(<UserSearchFilters {...defaultProps} />);

    expect(screen.getByText('Showing 100 of 100 users')).toBeInTheDocument();
  });

  it('should display filtered user count when filters are applied', () => {
    render(<UserSearchFilters {...defaultProps} filteredUsersCount={25} />);

    expect(screen.getByText('Showing 25 of 100 users')).toBeInTheDocument();
  });

  it('should render search input with correct value', () => {
    render(<UserSearchFilters {...defaultProps} searchQuery="test query" />);

    const input = screen.getByPlaceholderText('Search by name or email...') as HTMLInputElement;
    expect(input.value).toBe('test query');
  });

  it('should call onSearchChange when typing in search input', async () => {
    const handleSearchChange = vi.fn();
    const user = userEvent.setup();
    render(<UserSearchFilters {...defaultProps} onSearchChange={handleSearchChange} />);

    const input = screen.getByPlaceholderText('Search by name or email...');
    await user.type(input, 'john');

    expect(handleSearchChange).toHaveBeenCalled();
    expect(handleSearchChange).toHaveBeenCalledWith('j');
    expect(handleSearchChange).toHaveBeenCalledWith('o');
  });

  it('should render role filter with correct value', () => {
    render(<UserSearchFilters {...defaultProps} roleFilter="worker" />);

    const select = screen.getByDisplayValue('Workers') as HTMLSelectElement;
    expect(select.value).toBe('worker');
  });

  it('should render all role filter options', () => {
    const { container } = render(<UserSearchFilters {...defaultProps} />);

    const roleSelect = container.querySelectorAll('select')[0];
    const options = roleSelect.querySelectorAll('option');

    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('All Roles');
    expect(options[0]).toHaveValue('all');
    expect(options[1]).toHaveTextContent('Workers');
    expect(options[1]).toHaveValue('worker');
    expect(options[2]).toHaveTextContent('Employers');
    expect(options[2]).toHaveValue('employer');
  });

  it('should call onRoleFilterChange when role filter changes', async () => {
    const handleRoleFilterChange = vi.fn();
    const user = userEvent.setup();
    render(<UserSearchFilters {...defaultProps} onRoleFilterChange={handleRoleFilterChange} />);

    const roleSelect = screen.getByDisplayValue('All Roles');
    await user.selectOptions(roleSelect, 'worker');

    expect(handleRoleFilterChange).toHaveBeenCalledWith('worker');
  });

  it('should render subscription filter with correct value', () => {
    render(<UserSearchFilters {...defaultProps} subscriptionFilter="pro" />);

    const select = screen.getByDisplayValue('Pro') as HTMLSelectElement;
    expect(select.value).toBe('pro');
  });

  it('should render all subscription filter options', () => {
    const { container } = render(<UserSearchFilters {...defaultProps} />);

    const subscriptionSelect = container.querySelectorAll('select')[1];
    const options = subscriptionSelect.querySelectorAll('option');

    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('All Subscriptions');
    expect(options[0]).toHaveValue('all');
    expect(options[1]).toHaveTextContent('Free');
    expect(options[1]).toHaveValue('free');
    expect(options[2]).toHaveTextContent('Pro');
    expect(options[2]).toHaveValue('pro');
  });

  it('should call onSubscriptionFilterChange when subscription filter changes', async () => {
    const handleSubscriptionFilterChange = vi.fn();
    const user = userEvent.setup();
    render(<UserSearchFilters {...defaultProps} onSubscriptionFilterChange={handleSubscriptionFilterChange} />);

    const subscriptionSelect = screen.getByDisplayValue('All Subscriptions');
    await user.selectOptions(subscriptionSelect, 'pro');

    expect(handleSubscriptionFilterChange).toHaveBeenCalledWith('pro');
  });

  it('should render with all filters applied', () => {
    render(
      <UserSearchFilters
        searchQuery="test user"
        onSearchChange={vi.fn()}
        roleFilter="employer"
        onRoleFilterChange={vi.fn()}
        subscriptionFilter="free"
        onSubscriptionFilterChange={vi.fn()}
        totalUsers={100}
        filteredUsersCount={15}
      />
    );

    const input = screen.getByPlaceholderText('Search by name or email...') as HTMLInputElement;
    expect(input.value).toBe('test user');
    expect(screen.getByDisplayValue('Employers')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Free')).toBeInTheDocument();
    expect(screen.getByText('Showing 15 of 100 users')).toBeInTheDocument();
  });

  it('should render search input with correct type attribute', () => {
    render(<UserSearchFilters {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search by name or email...');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('should handle zero filtered users', () => {
    render(<UserSearchFilters {...defaultProps} filteredUsersCount={0} />);

    expect(screen.getByText('Showing 0 of 100 users')).toBeInTheDocument();
  });

  it('should handle zero total users', () => {
    render(<UserSearchFilters {...defaultProps} totalUsers={0} filteredUsersCount={0} />);

    expect(screen.getByText('Showing 0 of 0 users')).toBeInTheDocument();
  });

  it('should apply correct styling to selects', () => {
    const { container } = render(<UserSearchFilters {...defaultProps} />);

    const selects = container.querySelectorAll('select');
    selects.forEach((select) => {
      expect(select).toHaveClass('h-10');
      expect(select).toHaveClass('rounded-lg');
      expect(select).toHaveClass('border');
      expect(select).toHaveClass('border-gray-300');
      expect(select).toHaveClass('focus:ring-krewup-blue');
    });
  });

  it('should render within a Card component', () => {
    const { container } = render(<UserSearchFilters {...defaultProps} />);

    const card = container.querySelector('.rounded-xl');
    expect(card).toBeInTheDocument();
  });

  it('should have responsive grid layout', () => {
    const { container } = render(<UserSearchFilters {...defaultProps} />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('md:grid-cols-4');
    expect(grid).toHaveClass('gap-4');
  });

  it('should update search input value on controlled change', () => {
    const { rerender } = render(<UserSearchFilters {...defaultProps} searchQuery="" />);

    let input = screen.getByPlaceholderText('Search by name or email...') as HTMLInputElement;
    expect(input.value).toBe('');

    rerender(<UserSearchFilters {...defaultProps} searchQuery="new value" />);

    input = screen.getByPlaceholderText('Search by name or email...') as HTMLInputElement;
    expect(input.value).toBe('new value');
  });

  it('should update role filter on controlled change', () => {
    const { rerender } = render(<UserSearchFilters {...defaultProps} roleFilter="all" />);

    expect(screen.getByDisplayValue('All Roles')).toBeInTheDocument();

    rerender(<UserSearchFilters {...defaultProps} roleFilter="worker" />);

    expect(screen.getByDisplayValue('Workers')).toBeInTheDocument();
  });

  it('should update subscription filter on controlled change', () => {
    const { rerender } = render(<UserSearchFilters {...defaultProps} subscriptionFilter="all" />);

    expect(screen.getByDisplayValue('All Subscriptions')).toBeInTheDocument();

    rerender(<UserSearchFilters {...defaultProps} subscriptionFilter="pro" />);

    expect(screen.getByDisplayValue('Pro')).toBeInTheDocument();
  });

  it('should display correct text formatting for user count', () => {
    render(<UserSearchFilters {...defaultProps} />);

    const userCount = screen.getByText('Showing 100 of 100 users');
    expect(userCount).toHaveClass('text-sm');
    expect(userCount).toHaveClass('text-gray-500');
    expect(userCount).toHaveClass('mt-4');
  });

  it('should call handlers independently', async () => {
    const handleSearchChange = vi.fn();
    const handleRoleChange = vi.fn();
    const handleSubscriptionChange = vi.fn();
    const user = userEvent.setup();

    render(
      <UserSearchFilters
        searchQuery=""
        onSearchChange={handleSearchChange}
        roleFilter="all"
        onRoleFilterChange={handleRoleChange}
        subscriptionFilter="all"
        onSubscriptionFilterChange={handleSubscriptionChange}
        totalUsers={100}
        filteredUsersCount={100}
      />
    );

    // Test search independently
    const input = screen.getByPlaceholderText('Search by name or email...');
    await user.type(input, 'a');
    expect(handleSearchChange).toHaveBeenCalled();
    expect(handleRoleChange).not.toHaveBeenCalled();
    expect(handleSubscriptionChange).not.toHaveBeenCalled();

    // Reset mocks
    vi.clearAllMocks();

    // Test role filter independently
    const roleSelect = screen.getByDisplayValue('All Roles');
    await user.selectOptions(roleSelect, 'worker');
    expect(handleRoleChange).toHaveBeenCalled();
    expect(handleSearchChange).not.toHaveBeenCalled();
    expect(handleSubscriptionChange).not.toHaveBeenCalled();

    // Reset mocks
    vi.clearAllMocks();

    // Test subscription filter independently
    const subscriptionSelect = screen.getByDisplayValue('All Subscriptions');
    await user.selectOptions(subscriptionSelect, 'pro');
    expect(handleSubscriptionChange).toHaveBeenCalled();
    expect(handleSearchChange).not.toHaveBeenCalled();
    expect(handleRoleChange).not.toHaveBeenCalled();
  });
});

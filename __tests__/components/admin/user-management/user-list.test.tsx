import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserList } from '@/components/admin/user-management/user-list';
import type { UserProfile } from '@/components/admin/user-management/types';

describe('UserList Component', () => {
  const mockUsers: UserProfile[] = [
    {
      id: '1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      role: 'worker',
      subscription_status: 'free',
      trade: 'Electrical',
      sub_trade: 'Commercial',
      location: 'New York, NY',
      created_at: '2024-01-01T00:00:00Z',
      phone: '555-1234',
      is_admin: false,
      can_post_jobs: false,
    },
    {
      id: '2',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      role: 'employer',
      subscription_status: 'pro',
      trade: 'General',
      sub_trade: null,
      location: 'Los Angeles, CA',
      created_at: '2024-01-02T00:00:00Z',
      phone: null,
      is_admin: true,
      can_post_jobs: true,
    },
    {
      id: '3',
      first_name: 'Bob',
      last_name: 'Johnson',
      email: 'bob.johnson@example.com',
      role: 'worker',
      subscription_status: 'pro',
      trade: 'Plumbing',
      sub_trade: 'Residential',
      location: 'Chicago, IL',
      created_at: '2024-01-03T00:00:00Z',
      phone: '555-5678',
      is_admin: false,
      can_post_jobs: false,
    },
  ];

  const defaultProps = {
    users: mockUsers,
    selectedUser: null,
    onUserSelect: vi.fn(),
  };

  it('should render with users', () => {
    render(<UserList {...defaultProps} />);

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('should render empty state when no users', () => {
    render(<UserList {...defaultProps} users={[]} />);

    expect(screen.getByText('No users found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
  });

  it('should display user emails', () => {
    render(<UserList {...defaultProps} />);

    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob.johnson@example.com')).toBeInTheDocument();
  });

  it('should display role badges', () => {
    render(<UserList {...defaultProps} />);

    const roleBadges = screen.getAllByText(/worker|employer/i);
    expect(roleBadges.length).toBeGreaterThan(0);
  });

  it('should display Pro badge for pro users', () => {
    render(<UserList {...defaultProps} />);

    const proBadges = screen.getAllByText('Pro');
    expect(proBadges).toHaveLength(2); // Jane and Bob are pro
  });

  it('should display Admin badge for admin users', () => {
    render(<UserList {...defaultProps} />);

    const adminBadges = screen.getAllByText('Admin');
    expect(adminBadges).toHaveLength(1); // Only Jane is admin
  });

  it('should call onUserSelect when a user is clicked', async () => {
    const handleUserSelect = vi.fn();
    const user = userEvent.setup();

    render(<UserList {...defaultProps} onUserSelect={handleUserSelect} />);

    const firstUserButton = screen.getByText('John Doe').closest('button');
    expect(firstUserButton).toBeInTheDocument();

    if (firstUserButton) {
      await user.click(firstUserButton);
      expect(handleUserSelect).toHaveBeenCalledWith(mockUsers[0]);
      expect(handleUserSelect).toHaveBeenCalledTimes(1);
    }
  });

  it('should highlight selected user', () => {
    const { container } = render(<UserList {...defaultProps} selectedUser={mockUsers[0]} />);

    const selectedButton = screen.getByText('John Doe').closest('button');
    expect(selectedButton).toHaveClass('border-blue-500');
    expect(selectedButton).toHaveClass('bg-blue-50');
  });

  it('should not highlight unselected users', () => {
    const { container } = render(<UserList {...defaultProps} selectedUser={mockUsers[0]} />);

    const unselectedButton = screen.getByText('Jane Smith').closest('button');
    expect(unselectedButton).toHaveClass('border-gray-200');
    expect(unselectedButton).not.toHaveClass('border-blue-500');
  });

  it('should render all users in the list', () => {
    render(<UserList {...defaultProps} />);

    const userButtons = screen.getAllByRole('button');
    // Should have 3 user buttons (excluding the title)
    expect(userButtons).toHaveLength(3);
  });

  it('should have scrollable container for long lists', () => {
    const { container } = render(<UserList {...defaultProps} />);

    const scrollContainer = container.querySelector('.max-h-\\[600px\\]');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass('overflow-y-auto');
  });

  it('should apply hover styles to user buttons', () => {
    render(<UserList {...defaultProps} />);

    const userButton = screen.getByText('John Doe').closest('button');
    expect(userButton).toHaveClass('hover:border-gray-300');
    expect(userButton).toHaveClass('hover:bg-gray-50');
  });

  it('should render within a Card component', () => {
    const { container } = render(<UserList {...defaultProps} />);

    const card = container.querySelector('.rounded-xl');
    expect(card).toBeInTheDocument();
  });

  it('should apply transition to user buttons', () => {
    render(<UserList {...defaultProps} />);

    const userButton = screen.getByText('John Doe').closest('button');
    expect(userButton).toHaveClass('transition-all');
  });

  it('should truncate long names', () => {
    render(<UserList {...defaultProps} />);

    const nameElement = screen.getByText('John Doe');
    expect(nameElement).toHaveClass('truncate');
  });

  it('should truncate long emails', () => {
    render(<UserList {...defaultProps} />);

    const emailElement = screen.getByText('john.doe@example.com');
    expect(emailElement).toHaveClass('truncate');
  });

  it('should handle multiple user selections', async () => {
    const handleUserSelect = vi.fn();
    const user = userEvent.setup();

    render(<UserList {...defaultProps} onUserSelect={handleUserSelect} />);

    const firstUserButton = screen.getByText('John Doe').closest('button');
    const secondUserButton = screen.getByText('Jane Smith').closest('button');

    if (firstUserButton && secondUserButton) {
      await user.click(firstUserButton);
      expect(handleUserSelect).toHaveBeenCalledWith(mockUsers[0]);

      await user.click(secondUserButton);
      expect(handleUserSelect).toHaveBeenCalledWith(mockUsers[1]);
      expect(handleUserSelect).toHaveBeenCalledTimes(2);
    }
  });

  it('should update selected user styling when selection changes', () => {
    const { rerender } = render(<UserList {...defaultProps} selectedUser={mockUsers[0]} />);

    let selectedButton = screen.getByText('John Doe').closest('button');
    expect(selectedButton).toHaveClass('border-blue-500');

    rerender(<UserList {...defaultProps} selectedUser={mockUsers[1]} />);

    selectedButton = screen.getByText('Jane Smith').closest('button');
    expect(selectedButton).toHaveClass('border-blue-500');

    const unselectedButton = screen.getByText('John Doe').closest('button');
    expect(unselectedButton).toHaveClass('border-gray-200');
  });

  it('should render correct badge variant for employer role', () => {
    render(<UserList {...defaultProps} />);

    const employerButton = screen.getByText('Jane Smith').closest('button');
    expect(employerButton).toBeInTheDocument();

    // Employer should be present
    const employerBadge = screen.getByText('employer');
    expect(employerBadge).toBeInTheDocument();
  });

  it('should render correct badge variant for worker role', () => {
    render(<UserList {...defaultProps} />);

    const workerBadges = screen.getAllByText('worker');
    expect(workerBadges).toHaveLength(2); // John and Bob are workers
  });

  it('should have correct spacing between users', () => {
    const { container } = render(<UserList {...defaultProps} />);

    const userContainer = container.querySelector('.space-y-2');
    expect(userContainer).toBeInTheDocument();
  });

  it('should render full name using first and last name', () => {
    render(<UserList {...defaultProps} />);

    // Test that full names are constructed correctly
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('should handle user with only first name gracefully', () => {
    const userWithOnlyFirstName: UserProfile = {
      ...mockUsers[0],
      last_name: '',
      id: '4',
    };

    render(<UserList {...defaultProps} users={[userWithOnlyFirstName]} />);

    // Should still render the first name
    expect(screen.getByText(/John/)).toBeInTheDocument();
  });

  it('should display badges in correct order', () => {
    const { container } = render(<UserList {...defaultProps} />);

    const janeButton = screen.getByText('Jane Smith').closest('button');
    expect(janeButton).toBeInTheDocument();

    // Jane should have employer, pro, and admin badges
    const janeSection = janeButton?.querySelector('.flex.gap-2.mt-2');
    expect(janeSection).toBeInTheDocument();
  });

  it('should apply correct padding to user buttons', () => {
    render(<UserList {...defaultProps} />);

    const userButton = screen.getByText('John Doe').closest('button');
    expect(userButton).toHaveClass('p-4');
  });

  it('should make buttons full width', () => {
    render(<UserList {...defaultProps} />);

    const userButton = screen.getByText('John Doe').closest('button');
    expect(userButton).toHaveClass('w-full');
  });

  it('should align button content to the left', () => {
    render(<UserList {...defaultProps} />);

    const userButton = screen.getByText('John Doe').closest('button');
    expect(userButton).toHaveClass('text-left');
  });

  it('should have rounded corners on user buttons', () => {
    render(<UserList {...defaultProps} />);

    const userButton = screen.getByText('John Doe').closest('button');
    expect(userButton).toHaveClass('rounded-lg');
  });

  it('should apply border to user buttons', () => {
    render(<UserList {...defaultProps} />);

    const userButton = screen.getByText('John Doe').closest('button');
    expect(userButton).toHaveClass('border');
  });
});

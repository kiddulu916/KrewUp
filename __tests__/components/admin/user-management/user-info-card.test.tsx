import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserInfoCard } from '@/components/admin/user-management/user-info-card';
import type { UserProfile, ModerationStatus } from '@/components/admin/user-management/types';

describe('UserInfoCard Component', () => {
  const mockUser: UserProfile = {
    id: '123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    role: 'worker',
    subscription_status: 'pro',
    trade: 'Electrician',
    sub_trade: 'Commercial',
    location: 'New York, NY',
    created_at: '2024-01-15T10:00:00Z',
    phone: '555-1234',
    is_admin: false,
    can_post_jobs: true,
  };

  const mockModerationStatus: ModerationStatus = {
    isBanned: false,
    isSuspended: false,
  };

  it('should render user information correctly', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('should display user role', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('worker')).toBeInTheDocument();
  });

  it('should display subscription status', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('pro')).toBeInTheDocument();
  });

  it('should display trade information', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Trade')).toBeInTheDocument();
    expect(screen.getByText('Electrician')).toBeInTheDocument();
  });

  it('should display location', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
  });

  it('should display phone number when present', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('555-1234')).toBeInTheDocument();
  });

  it('should display "N/A" when phone is null', () => {
    const userWithoutPhone = { ...mockUser, phone: null };
    render(<UserInfoCard user={userWithoutPhone} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('should format and display join date', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Joined')).toBeInTheDocument();
    const formattedDate = new Date('2024-01-15T10:00:00Z').toLocaleDateString();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });

  it('should display can_post_jobs status as Yes', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Can Post Jobs')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('should display can_post_jobs status as No', () => {
    const userCannotPost = { ...mockUser, can_post_jobs: false };
    render(<UserInfoCard user={userCannotPost} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Can Post Jobs')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('should display admin status as Yes', () => {
    const adminUser = { ...mockUser, is_admin: true };
    render(<UserInfoCard user={adminUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
    const yesElements = screen.getAllByText('Yes');
    expect(yesElements.length).toBeGreaterThan(0);
  });

  it('should display admin status as No', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('should not display badges when user is not banned or suspended', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.queryByText('BANNED')).not.toBeInTheDocument();
    expect(screen.queryByText('SUSPENDED')).not.toBeInTheDocument();
  });

  it('should display BANNED badge when user is banned', () => {
    const bannedStatus: ModerationStatus = {
      isBanned: true,
      isSuspended: false,
    };
    render(<UserInfoCard user={mockUser} moderationStatus={bannedStatus} />);

    expect(screen.getByText('BANNED')).toBeInTheDocument();
  });

  it('should display SUSPENDED badge when user is suspended', () => {
    const suspendedStatus: ModerationStatus = {
      isBanned: false,
      isSuspended: true,
    };
    render(<UserInfoCard user={mockUser} moderationStatus={suspendedStatus} />);

    expect(screen.getByText('SUSPENDED')).toBeInTheDocument();
  });

  it('should display both BANNED and SUSPENDED badges when applicable', () => {
    const bothStatus: ModerationStatus = {
      isBanned: true,
      isSuspended: true,
    };
    render(<UserInfoCard user={mockUser} moderationStatus={bothStatus} />);

    expect(screen.getByText('BANNED')).toBeInTheDocument();
    expect(screen.getByText('SUSPENDED')).toBeInTheDocument();
  });

  it('should handle null moderation status', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={null} />);

    expect(screen.queryByText('BANNED')).not.toBeInTheDocument();
    expect(screen.queryByText('SUSPENDED')).not.toBeInTheDocument();
  });

  it('should render user with only first name', () => {
    const userNoLastName = { ...mockUser, last_name: '' };
    render(<UserInfoCard user={userNoLastName} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('should display employer role correctly', () => {
    const employerUser = { ...mockUser, role: 'employer' };
    render(<UserInfoCard user={employerUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('employer')).toBeInTheDocument();
  });

  it('should display free subscription status', () => {
    const freeUser = { ...mockUser, subscription_status: 'free' };
    render(<UserInfoCard user={freeUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('free')).toBeInTheDocument();
  });

  it('should render within a Card component', () => {
    const { container } = render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    const card = container.querySelector('.rounded-xl');
    expect(card).toBeInTheDocument();
  });

  it('should have grid layout for user details', () => {
    const { container } = render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-2');
    expect(grid).toHaveClass('gap-4');
  });

  it('should apply correct text styling to email', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    const email = screen.getByText('john.doe@example.com');
    expect(email).toHaveClass('text-sm');
    expect(email).toHaveClass('text-gray-600');
    expect(email).toHaveClass('mt-1');
  });

  it('should render all field labels', () => {
    render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Trade')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
    expect(screen.getByText('Can Post Jobs')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should apply capitalize class to role', () => {
    const { container } = render(<UserInfoCard user={mockUser} moderationStatus={mockModerationStatus} />);

    const roleValue = container.querySelector('.capitalize');
    expect(roleValue).toHaveTextContent('worker');
  });

  it('should handle different date formats correctly', () => {
    const userWithDifferentDate = { ...mockUser, created_at: '2023-12-25T15:30:00Z' };
    render(<UserInfoCard user={userWithDifferentDate} moderationStatus={mockModerationStatus} />);

    const formattedDate = new Date('2023-12-25T15:30:00Z').toLocaleDateString();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });

  it('should display both admin flags correctly when both are true', () => {
    const fullAccessUser = { ...mockUser, is_admin: true, can_post_jobs: true };
    render(<UserInfoCard user={fullAccessUser} moderationStatus={mockModerationStatus} />);

    const yesElements = screen.getAllByText('Yes');
    expect(yesElements.length).toBe(2);
  });

  it('should display both admin flags correctly when both are false', () => {
    const restrictedUser = { ...mockUser, is_admin: false, can_post_jobs: false };
    render(<UserInfoCard user={restrictedUser} moderationStatus={mockModerationStatus} />);

    const noElements = screen.getAllByText('No');
    expect(noElements.length).toBe(2);
  });
});

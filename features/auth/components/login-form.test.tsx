import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';
import { ToastProvider } from '@/components/providers/toast-provider';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock auth actions
vi.mock('../actions/auth-actions', () => ({
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

import { signIn, signInWithGoogle } from '../actions/auth-actions';

// Helper to render with ToastProvider
const renderWithToast = (component: React.ReactElement) => {
  return render(<ToastProvider>{component}</ToastProvider>);
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render email and password fields', () => {
    renderWithToast(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should render sign in button', () => {
    renderWithToast(<LoginForm />);

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render Google sign in button', () => {
    renderWithToast(<LoginForm />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('should render forgot password link', () => {
    renderWithToast(<LoginForm />);

    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('should render signup link', () => {
    renderWithToast(<LoginForm />);

    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should update email field on input', async () => {
    const user = userEvent.setup();
    renderWithToast(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should update password field on input', async () => {
    const user = userEvent.setup();
    renderWithToast(<LoginForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'password123');

    expect(passwordInput).toHaveValue('password123');
  });

  it('should call signIn with email and password on submit', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue({ success: true });

    renderWithToast(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should show error message when signIn fails', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue({ success: false, error: 'Invalid credentials' });

    renderWithToast(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should show default error message when signIn fails without message', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue({ success: false });

    renderWithToast(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to sign in/i)).toBeInTheDocument();
    });
  });

  it('should call signInWithGoogle on Google button click', async () => {
    const user = userEvent.setup();
    vi.mocked(signInWithGoogle).mockResolvedValue(undefined as any);

    renderWithToast(<LoginForm />);

    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalled();
    });
  });

  it('should disable inputs during loading', async () => {
    const user = userEvent.setup();
    // Create a promise that doesn't resolve immediately
    let resolveSignIn: (value: { success: boolean }) => void;
    vi.mocked(signIn).mockImplementation(
      () => new Promise((resolve) => { resolveSignIn = resolve; })
    );

    renderWithToast(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Check that inputs are disabled while loading
    await waitFor(() => {
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    // Resolve the promise
    resolveSignIn!({ success: true });
  });

  it('should show remember me checkbox', () => {
    renderWithToast(<LoginForm />);

    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
  });

  it('should handle Google sign in error', async () => {
    const user = userEvent.setup();
    vi.mocked(signInWithGoogle).mockRejectedValue(new Error('Google auth failed'));

    renderWithToast(<LoginForm />);

    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/google auth failed/i)).toBeInTheDocument();
    });
  });
});

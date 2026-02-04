import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/features/auth/components/login-form';
import { ToastProvider } from '@/components/providers/toast-provider';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

const mockSignIn = vi.fn();
const mockSignInWithGoogle = vi.fn();

vi.mock('@/features/auth/actions/auth-actions', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
}));

// Helper to render with ToastProvider
const renderWithToast = (component: React.ReactElement) => {
  return render(<ToastProvider>{component}</ToastProvider>);
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form with all elements', () => {
      renderWithToast(<LoginForm />);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your KrewUp account')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    });

    it('should render remember me checkbox', () => {
      renderWithToast(<LoginForm />);

      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
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
      await user.type(passwordInput, 'mypassword123');

      expect(passwordInput).toHaveValue('mypassword123');
    });
  });

  describe('Form Submission', () => {
    it('should call signIn with email and password on submit', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValueOnce({ success: true });

      renderWithToast(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      // Create a promise that we control
      let resolveSignIn: (value: { success: boolean }) => void;
      mockSignIn.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      renderWithToast(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Inputs should be disabled during loading
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();

      // Resolve the promise
      resolveSignIn!({ success: true });
    });

    it('should display error message when sign in fails', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValueOnce({
        success: false,
        error: 'Invalid login credentials',
      });

      renderWithToast(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
      });
    });

    it('should show default error message when no error provided', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValueOnce({
        success: false,
        error: undefined,
      });

      renderWithToast(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to sign in')).toBeInTheDocument();
      });
    });

    it('should clear error message when form is resubmitted', async () => {
      const user = userEvent.setup();
      mockSignIn
        .mockResolvedValueOnce({ success: false, error: 'First error' })
        .mockResolvedValueOnce({ success: true });

      renderWithToast(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First submission - error
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second submission - clears error
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Google Sign In', () => {
    it('should call signInWithGoogle when Google button clicked', async () => {
      const user = userEvent.setup();
      mockSignInWithGoogle.mockResolvedValueOnce({ success: true });

      renderWithToast(<LoginForm />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it('should handle redirect response gracefully', async () => {
      const user = userEvent.setup();
      // When OAuth redirect is successful, signInWithGoogle returns URL
      // Test that the component handles this without showing errors
      mockSignInWithGoogle.mockResolvedValueOnce({
        success: true,
        url: 'https://accounts.google.com/oauth',
      });

      // Mock window.location.href assignment using Object.defineProperty
      const hrefSetter = vi.fn();
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
      Object.defineProperty(window, 'location', {
        value: { href: '', assign: vi.fn(), replace: vi.fn() },
        writable: true,
      });

      renderWithToast(<LoginForm />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });

      // Should not show any error messages
      expect(screen.queryByText(/failed to sign in/i)).not.toBeInTheDocument();

      // Restore window.location
      if (originalDescriptor) {
        Object.defineProperty(window, 'location', originalDescriptor);
      }
    });

    it('should display error for non-redirect Google errors', async () => {
      const user = userEvent.setup();
      // When OAuth fails, signInWithGoogle returns error result
      mockSignInWithGoogle.mockResolvedValueOnce({
        success: false,
        error: 'OAuth provider unavailable',
      });

      renderWithToast(<LoginForm />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('OAuth provider unavailable')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Links', () => {
    it('should have forgot password link', () => {
      renderWithToast(<LoginForm />);

      const forgotLink = screen.getByText(/forgot password/i);
      expect(forgotLink).toHaveAttribute('href', '/auth/forgot-password');
    });

    it('should have sign up link', () => {
      renderWithToast(<LoginForm />);

      const signUpLink = screen.getByText(/sign up/i);
      expect(signUpLink).toHaveAttribute('href', '/signup');
    });
  });
});

import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

export const metadata = {
  title: 'Forgot Password - KrewUp',
  description: 'Reset your KrewUp account password',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}

import { SignupForm } from '@/features/auth/components/signup-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Sign Up - KrewUp',
  description: 'Create your KrewUp account',
};

export default async function SignupPage() {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard/feed');
  }

  return <SignupForm />;
}

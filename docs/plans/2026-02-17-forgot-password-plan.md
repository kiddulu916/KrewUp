# Forgot Password Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add forgot-password and reset-password UI pages, consolidate auth pages under a shared layout.

**Architecture:** Create a shared `(auth)` layout with centered-card styling. Move login/signup into it, add forgot-password and reset-password pages. Fix the `resetPassword` action redirect URL and update middleware auth route detection.

**Tech Stack:** Next.js App Router, Supabase Auth, TypeScript, Tailwind CSS

---

### Task 1: Create Shared Auth Layout

**Files:**

- Create: `app/(auth)/layout.tsx`

**Step 1: Create the shared auth layout**

Create `app/(auth)/layout.tsx` that extracts the centered-card-on-gray-background pattern from the current login/signup pages:

```tsx
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `app/(auth)/layout.tsx`

**Step 3: Commit**

```bash
git add app/\(auth\)/layout.tsx
git commit -m "feat(auth): add shared auth layout with centered card styling"
```

---

### Task 2: Move Login Page Into (auth) Layout Group

**Files:**

- Move: `app/login/page.tsx` → `app/(auth)/login/page.tsx`
- Modify: Remove the wrapper div since the layout handles it now

**Step 1: Create the new login page**

Create `app/(auth)/login/page.tsx`:

```tsx
import { LoginForm } from "@/features/auth/components/login-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const metadata = {
  title: "Login - KrewUp",
  description: "Sign in to your KrewUp account",
};

export default async function LoginPage() {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard/feed");
  }

  return <LoginForm />;
}
```

Note: The wrapper `<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">` is removed because the `(auth)` layout now provides it.

**Step 2: Delete the old login page**

Delete `app/login/page.tsx`.

**Step 3: Verify the URL still works**

The URL `/login` is unchanged because `(auth)` is a route group (parentheses = no URL segment). Run:

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No type errors.

**Step 4: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git rm app/login/page.tsx
git commit -m "refactor(auth): move login page into (auth) layout group"
```

---

### Task 3: Move Signup Page Into (auth) Layout Group

**Files:**

- Move: `app/signup/page.tsx` → `app/(auth)/signup/page.tsx`
- Modify: Remove the wrapper div since the layout handles it now

**Step 1: Create the new signup page**

Create `app/(auth)/signup/page.tsx`:

```tsx
import { SignupForm } from "@/features/auth/components/signup-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const metadata = {
  title: "Sign Up - KrewUp",
  description: "Create your KrewUp account",
};

export default async function SignupPage() {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard/feed");
  }

  return <SignupForm />;
}
```

**Step 2: Delete the old signup page**

Delete `app/signup/page.tsx`.

**Step 3: Verify**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No type errors.

**Step 4: Commit**

```bash
git add app/\(auth\)/signup/page.tsx
git rm app/signup/page.tsx
git commit -m "refactor(auth): move signup page into (auth) layout group"
```

---

### Task 4: Fix Login Form Link and resetPassword Redirect

**Files:**

- Modify: `features/auth/components/login-form.tsx:132-134` (forgot password link)
- Modify: `features/auth/actions/auth-actions.ts:233` (redirectTo URL)

**Step 1: Update the forgot password link in login form**

In `features/auth/components/login-form.tsx`, change the href from `/auth/forgot-password` to `/forgot-password`:

```tsx
// OLD:
<a href="/auth/forgot-password" className="text-sm text-krewup-blue hover:underline">

// NEW:
<a href="/forgot-password" className="text-sm text-krewup-blue hover:underline">
```

**Step 2: Fix the resetPassword action redirect URL**

In `features/auth/actions/auth-actions.ts`, change the `redirectTo` in `resetPassword()` to use the full origin URL and the correct path `/reset-password` (not `/auth/reset-password`):

```typescript
// OLD (line 233):
redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,

// NEW:
redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
```

**Step 3: Verify**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No type errors.

**Step 4: Commit**

```bash
git add features/auth/components/login-form.tsx features/auth/actions/auth-actions.ts
git commit -m "fix(auth): update forgot-password link and reset redirect URL"
```

---

### Task 5: Update Middleware Auth Route Detection

**Files:**

- Modify: `lib/supabase/middleware.ts:157-158`

**Step 1: Add forgot-password to auth route check**

In `lib/supabase/middleware.ts`, update the `isAuthRoute` check to include `/forgot-password`. Do NOT include `/reset-password` because users arrive there with a session from the email link.

```typescript
// OLD (lines 157-158):
const isAuthRoute =
  request.nextUrl.pathname === "/login" ||
  request.nextUrl.pathname === "/signup";

// NEW:
const isAuthRoute =
  request.nextUrl.pathname === "/login" ||
  request.nextUrl.pathname === "/signup" ||
  request.nextUrl.pathname === "/forgot-password";
```

**Step 2: Verify**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add lib/supabase/middleware.ts
git commit -m "fix(auth): add forgot-password to middleware auth route detection"
```

---

### Task 6: Create ForgotPasswordForm Component

**Files:**

- Create: `features/auth/components/forgot-password-form.tsx`

**Step 1: Create the component**

Create `features/auth/components/forgot-password-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { resetPassword } from "../actions/auth-actions";
import { useAsyncAction } from "@/hooks/use-async-action";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const { execute, isLoading, error } = useAsyncAction({
    showToast: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await execute(async () => {
      const result = await resetPassword(email);
      if (!result.success) {
        throw new Error(result.error || "Failed to send reset link");
      }
      setEmailSent(true);
      return result;
    });
  }

  if (emailSent) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Check your email</h1>
          <p className="mt-2 text-sm text-gray-600">
            We sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="mt-1 text-sm text-gray-500">
            If you don&apos;t see it, check your spam folder.
          </p>
        </div>

        <a
          href="/login"
          className="block text-center text-sm font-medium text-krewup-blue hover:underline"
        >
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isLoading}
        >
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600">
        Remember your password?{" "}
        <a
          href="/login"
          className="font-medium text-krewup-blue hover:underline"
        >
          Back to login
        </a>
      </p>
    </div>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add features/auth/components/forgot-password-form.tsx
git commit -m "feat(auth): add ForgotPasswordForm component"
```

---

### Task 7: Create Forgot Password Page

**Files:**

- Create: `app/(auth)/forgot-password/page.tsx`

**Step 1: Create the page**

Create `app/(auth)/forgot-password/page.tsx`:

```tsx
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata = {
  title: "Forgot Password - KrewUp",
  description: "Reset your KrewUp account password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
```

Note: No auth check needed here — the middleware already redirects authenticated users away from `/forgot-password` (added in Task 5).

**Step 2: Verify**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add app/\(auth\)/forgot-password/page.tsx
git commit -m "feat(auth): add forgot-password page"
```

---

### Task 8: Create ResetPasswordForm Component

**Files:**

- Create: `features/auth/components/reset-password-form.tsx`

**Step 1: Create the component**

Create `features/auth/components/reset-password-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { updatePassword, signOut } from "../actions/auth-actions";
import { useAsyncAction } from "@/hooks/use-async-action";
import {
  validatePassword,
  calculatePasswordStrength,
  getPasswordStrengthLabel,
} from "../services/auth-service";

const STRENGTH_COLORS = {
  weak: "bg-red-500",
  fair: "bg-orange-500",
  good: "bg-yellow-500",
  strong: "bg-green-500",
} as const;

const STRENGTH_WIDTHS = {
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
} as const;

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const { execute, isLoading, error } = useAsyncAction({
    showToast: false,
  });

  const strength = calculatePasswordStrength(password);
  const strengthLabel = getPasswordStrengthLabel(strength);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    // Client-side validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setValidationError(passwordValidation.error || "Invalid password");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    await execute(async () => {
      const result = await updatePassword(password);
      if (!result.success) {
        throw new Error(result.error || "Failed to update password");
      }
      // Sign out so user logs in with new password
      await signOut();
      return result;
    });
  }

  const displayError = validationError || error;

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Set new password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter your new password below
        </p>
      </div>

      {displayError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{displayError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="New password"
            type="password"
            placeholder="Enter your new password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setValidationError(null);
            }}
            required
            disabled={isLoading}
          />
          {password && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-1.5 rounded-full transition-all ${STRENGTH_COLORS[strengthLabel]} ${STRENGTH_WIDTHS[strengthLabel]}`}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Password strength:{" "}
                <span className="font-medium">{strengthLabel}</span>
              </p>
            </div>
          )}
        </div>

        <Input
          label="Confirm password"
          type="password"
          placeholder="Confirm your new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setValidationError(null);
          }}
          required
          disabled={isLoading}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isLoading}
        >
          Reset password
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600">
        <a
          href="/login"
          className="font-medium text-krewup-blue hover:underline"
        >
          Back to login
        </a>
      </p>
    </div>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add features/auth/components/reset-password-form.tsx
git commit -m "feat(auth): add ResetPasswordForm component with strength indicator"
```

---

### Task 9: Create Reset Password Page

**Files:**

- Create: `app/(auth)/reset-password/page.tsx`

**Step 1: Create the page**

This is a Server Component that:

1. Extracts the `code` from URL search params
2. Exchanges the code for a session using Supabase
3. If successful, renders the `ResetPasswordForm`
4. If failed, shows an error with a link to request a new reset

Create `app/(auth)/reset-password/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata = {
  title: "Reset Password - KrewUp",
  description: "Set a new password for your KrewUp account",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (!code) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Invalid reset link</h1>
        <p className="text-sm text-gray-600">
          This password reset link is invalid or has expired.
        </p>
        <a
          href="/forgot-password"
          className="inline-block text-sm font-medium text-krewup-blue hover:underline"
        >
          Request a new reset link
        </a>
      </div>
    );
  }

  // Exchange the code for a session
  const supabase = await createClient(await cookies());
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Reset link expired</h1>
        <p className="text-sm text-gray-600">
          This password reset link has expired or has already been used.
        </p>
        <a
          href="/forgot-password"
          className="inline-block text-sm font-medium text-krewup-blue hover:underline"
        >
          Request a new reset link
        </a>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
```

**Important:** In Next.js 16, `searchParams` is a `Promise` and must be awaited. The `code` parameter is provided by Supabase when the user clicks the email reset link.

**Step 2: Verify the full build compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add app/\(auth\)/reset-password/page.tsx
git commit -m "feat(auth): add reset-password page with code exchange"
```

---

### Task 10: Final Verification

**Step 1: Run full type check**

```bash
npx tsc --noEmit --pretty
```

Expected: No errors.

**Step 2: Run ESLint**

```bash
npm run lint
```

Expected: No new warnings or errors.

**Step 3: Run production build**

```bash
npm run build
```

Expected: Build succeeds. The new pages should appear in the build output under `/(auth)/login`, `/(auth)/signup`, `/(auth)/forgot-password`, `/(auth)/reset-password`.

**Step 4: Verify no old pages remain**

Check that `app/login/page.tsx` and `app/signup/page.tsx` no longer exist:

```bash
ls app/login/page.tsx app/signup/page.tsx 2>&1
```

Expected: "No such file or directory" for both.

**Step 5: Commit any remaining fixes**

If any issues were found and fixed, commit them:

```bash
git add -A
git commit -m "fix(auth): address build issues from forgot-password feature"
```

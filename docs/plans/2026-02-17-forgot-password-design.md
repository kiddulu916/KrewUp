# Forgot Password Feature Design

**Date:** 2026-02-17
**Status:** Approved

## Summary

Add forgot-password and reset-password UI pages. The backend server actions (`resetPassword`, `updatePassword`) already exist — this is purely a frontend task plus a small fix to the redirect URL.

## Architecture

### Shared Auth Layout

Create `app/(auth)/layout.tsx` with a centered-card-on-gray-background pattern. Move login and signup pages into this layout group. Add forgot-password and reset-password pages.

URLs are unchanged since `(auth)` is a route group (parentheses = no URL segment).

### File Structure

```
app/(auth)/
├── layout.tsx                    # NEW: shared centered-card layout
├── login/page.tsx                # MOVED from app/login/
├── signup/page.tsx               # MOVED from app/signup/
├── forgot-password/page.tsx      # NEW
└── reset-password/page.tsx       # NEW

features/auth/components/
├── forgot-password-form.tsx      # NEW
└── reset-password-form.tsx       # NEW
```

## Page Flows

### Forgot Password (`/forgot-password`)

1. Heading: "Reset your password" / subtitle: "Enter your email and we'll send you a reset link"
2. Email input field
3. "Send reset link" button with loading state
4. On success: show confirmation ("Check your email for a reset link") with "Back to login" link
5. "Back to login" link at bottom
6. Rate-limited by existing `resetPassword()` action

### Reset Password (`/reset-password`)

1. Supabase redirects here after user clicks email link (with `code` query param)
2. Server Component extracts `code`, calls `exchangeCodeForSession(code)` to establish recovery session
3. If no code or exchange fails: show error with "Request a new link" CTA linking to `/forgot-password`
4. If code valid: render `ResetPasswordForm`
5. Form: New password + Confirm password inputs, password strength indicator
6. On submit: `updatePassword()` → `signOut()` → redirect to `/login`

## Implementation Details

### Shared Auth Layout (`app/(auth)/layout.tsx`)

- Gray background (`bg-gray-50`), flex-center, card wrapper
- Extract pattern from current login/signup pages
- Children rendered inside the card

### Moving Login/Signup

- Move `app/login/page.tsx` → `app/(auth)/login/page.tsx` (remove card/background wrapper)
- Move `app/signup/page.tsx` → `app/(auth)/signup/page.tsx` (same)

### Fix `resetPassword()` Action

- Change `redirectTo` from `'/auth/reset-password'` to use `headers().get('origin') + '/reset-password'`
- Supabase needs a full URL to send in the email

### ForgotPasswordForm Component

- Client component using `useAsyncAction` (same pattern as login/signup)
- Calls existing `resetPassword(email)` action
- Two states: form view → success view

### ResetPasswordForm Component

- Client component with new password + confirm password fields
- Password strength bar using `calculatePasswordStrength()` from auth-service
- Calls `updatePassword(newPassword)` → `signOut()` → `router.push('/login')`

### Password Validation

Reuses existing `validatePassword()` from `features/auth/services/auth-service.ts`:

- Min 8 chars, uppercase, lowercase, number required

### Error Handling

- Invalid/expired reset code: friendly error with "Request a new link" link
- Rate limit hit: error message from existing rate limiter
- Password too weak: inline validation before submit

## Existing Code Reused

- `features/auth/actions/auth-actions.ts` — `resetPassword()`, `updatePassword()`, `signOut()`
- `features/auth/services/auth-service.ts` — `validatePassword()`, `calculatePasswordStrength()`, `getPasswordStrengthLabel()`
- `features/auth/hooks/use-auth.ts` — `useAsyncAction` pattern from login/signup forms

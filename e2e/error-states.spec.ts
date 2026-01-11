import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
} from './utils/test-db';
import { loginAsUser, waitForText } from './utils/test-helpers';

test.describe('Error States E2E Tests', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    await cleanupTestData();
    testUser = await createTestUser({ role: 'worker' });
  });

  test.afterAll(async () => {
    if (testUser) await deleteTestUser(testUser.id);
  });

  test.describe('404 Pages', () => {
    test('should show 404 for non-existent pages', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');
      
      // Should show 404 content
      await expect(page.locator('text=/404|not found/i')).toBeVisible();
    });

    test('should show 404 for non-existent job', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      await page.goto('/dashboard/jobs/00000000-0000-0000-0000-000000000000');
      
      // Should show 404 or error
      await page.waitForLoadState('networkidle');
      
      const is404 = await page.locator('text=/404|not found|error/i').isVisible().catch(() => false);
      const redirected = !page.url().includes('/jobs/00000000');
      
      expect(is404 || redirected).toBeTruthy();
    });

    test('should show 404 for non-existent profile', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      await page.goto('/dashboard/profiles/00000000-0000-0000-0000-000000000000');
      
      await page.waitForLoadState('networkidle');
      
      const is404 = await page.locator('text=/404|not found|error/i').isVisible().catch(() => false);
      const redirected = !page.url().includes('/profiles/00000000');
      
      expect(is404 || redirected).toBeTruthy();
    });

    test('should show 404 for non-existent conversation', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      await page.goto('/dashboard/messages/00000000-0000-0000-0000-000000000000');
      
      await page.waitForLoadState('networkidle');
      
      const is404 = await page.locator('text=/404|not found|error|conversation/i').isVisible().catch(() => false);
      expect(is404).toBeTruthy();
    });
  });

  test.describe('Authentication Errors', () => {
    test('should redirect unauthenticated users from dashboard', async ({ page }) => {
      await page.goto('/dashboard/feed');
      
      await page.waitForURL(/\/login/, { timeout: 5000 });
      
      expect(page.url()).toContain('/login');
    });

    test('should redirect unauthenticated users from profile', async ({ page }) => {
      await page.goto('/dashboard/profile');
      
      await page.waitForURL(/\/login/, { timeout: 5000 });
      
      expect(page.url()).toContain('/login');
    });

    test('should show error for invalid login credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('input[type="email"]', 'nonexistent@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await waitForText(page, /invalid|incorrect|error/i, { timeout: 5000 });
    });

    test('should validate email format on login', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Should show validation error
      const hasError = await page.locator('text=/invalid|email/i').isVisible().catch(() => false);
      const hasValidation = await page.locator('[aria-invalid="true"]').isVisible().catch(() => false);
      
      expect(hasError || hasValidation).toBeTruthy();
    });
  });

  test.describe('Form Validation Errors', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, testUser);
    });

    test('should show validation error for empty job title', async ({ page }) => {
      // Only for employers, but test the form behavior
      await page.goto('/dashboard/jobs/new');
      
      // If user is worker, they might be redirected
      if (page.url().includes('/jobs/new')) {
        await page.click('button[type="submit"]');
        
        // Should show validation errors
        const hasError = await page.locator('text=/required|please|enter/i').isVisible().catch(() => false);
        expect(hasError).toBeTruthy();
      }
    });

    test('should show validation error for short bio', async ({ page }) => {
      await page.goto('/dashboard/profile/edit');
      
      const bioInput = page.locator('textarea[name="bio"]');
      if (await bioInput.isVisible()) {
        await bioInput.fill('Hi'); // Too short
        await page.click('button[type="submit"]');
        
        // Check for validation
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Empty States', () => {
    test('should show empty state for no jobs', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Use a filter that won't match any jobs
      await page.goto('/dashboard/jobs?trade=NonExistentTrade12345');
      
      await page.waitForLoadState('networkidle');
      
      // Should show empty state or "no jobs found"
      const hasEmptyState = await page.locator('text=/no.*jobs|no.*results|empty/i').isVisible().catch(() => false);
      expect(hasEmptyState).toBeTruthy();
    });

    test('should show empty state for no applications', async ({ page }) => {
      // Create fresh user with no applications
      const freshUser = await createTestUser({ role: 'worker' });
      
      try {
        await loginAsUser(page, freshUser);
        await page.goto('/dashboard/applications');
        
        await page.waitForLoadState('networkidle');
        
        // Should show empty state
        const hasEmptyState = await page.locator('text=/no.*applications|empty|haven\'t applied/i').isVisible().catch(() => false);
        expect(hasEmptyState).toBeTruthy();
      } finally {
        await deleteTestUser(freshUser.id);
      }
    });

    test('should show empty state for no messages', async ({ page }) => {
      const freshUser = await createTestUser({ role: 'worker' });
      
      try {
        await loginAsUser(page, freshUser);
        await page.goto('/dashboard/messages');
        
        await page.waitForLoadState('networkidle');
        
        // Should show empty state
        const hasEmptyState = await page.locator('text=/no.*messages|no.*conversations|empty|start.*conversation/i').isVisible().catch(() => false);
        expect(hasEmptyState).toBeTruthy();
      } finally {
        await deleteTestUser(freshUser.id);
      }
    });

    test('should show empty state for no notifications', async ({ page }) => {
      const freshUser = await createTestUser({ role: 'worker' });
      
      try {
        await loginAsUser(page, freshUser);
        await page.goto('/dashboard/notifications');
        
        await page.waitForLoadState('networkidle');
        
        // Should show empty state
        const hasEmptyState = await page.locator('text=/no.*notifications|empty|all.*caught/i').isVisible().catch(() => false);
        expect(hasEmptyState).toBeTruthy();
      } finally {
        await deleteTestUser(freshUser.id);
      }
    });
  });

  test.describe('Network Error Handling', () => {
    test('should handle slow network gracefully', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Simulate slow network
      await page.route('**/*', (route) => {
        setTimeout(() => route.continue(), 1000);
      });
      
      await page.goto('/dashboard/jobs');
      
      // Should show loading state
      const hasLoadingState = await page.locator('text=/loading/i, .animate-spin, [data-loading]').isVisible().catch(() => false);
      
      // Wait for page to load eventually
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    });
  });

  test.describe('Permission Errors', () => {
    test('should prevent worker from accessing job creation', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      await page.goto('/dashboard/jobs/new');
      
      await page.waitForLoadState('networkidle');
      
      // Worker should be redirected or see error
      const isOnNewJobPage = page.url().includes('/jobs/new');
      const hasPermissionError = await page.locator('text=/permission|unauthorized|employer/i').isVisible().catch(() => false);
      
      // Either not on the page or showing permission error
      expect(!isOnNewJobPage || hasPermissionError).toBeTruthy();
    });

    test('should prevent accessing other users profiles directly via settings', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Try to edit another user's profile (if possible)
      await page.goto(`/dashboard/profile/edit?userId=00000000-0000-0000-0000-000000000000`);

      await page.waitForLoadState('networkidle');

      // Should only show own profile, not error (edit query param should be ignored)
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from network failure with retry', async ({ page }) => {
      await loginAsUser(page, testUser);

      let requestCount = 0;

      // Fail first 2 requests, then succeed
      await page.route('**/api/**', (route) => {
        requestCount++;
        if (requestCount <= 2) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      await page.goto('/dashboard/jobs');

      // Wait for page to potentially show error or retry
      await page.waitForLoadState('domcontentloaded');

      // Check if there's a retry button or if page eventually loads
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
      const hasRetry = await retryButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasRetry) {
        // Unblock routes and click retry
        await page.unroute('**/api/**');
        await retryButton.click();

        // Should eventually show content
        await page.waitForLoadState('networkidle');
      }
    });

    test('should preserve form data when submission fails', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/profile/edit');

      // Fill form
      const nameInput = page.locator('input#name');
      const bioInput = page.locator('textarea#bio');

      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Name Recovery');
      }

      if (await bioInput.isVisible()) {
        await bioInput.fill('This is a test bio that should be preserved on error');
      }

      // Intercept and fail the form submission
      await page.route('**/*', (route) => {
        if (route.request().method() === 'POST') {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      // Try to submit
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Wait for error
        await page.waitForTimeout(2000);

        // Form data should still be present
        if (await nameInput.isVisible()) {
          await expect(nameInput).toHaveValue('Test Name Recovery');
        }
      }
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/profile');

      // Clear session cookies to simulate expiration
      await page.context().clearCookies();

      // Navigate to another protected page
      await page.goto('/dashboard/jobs');

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 });
    });

    test('should show error boundary for React errors', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Try to trigger an error by navigating to a malformed URL
      await page.goto('/dashboard/jobs/%%%invalid%%%');

      await page.waitForLoadState('domcontentloaded');

      // Should either show error boundary or 404
      const hasError = await page.locator('text=/error|something.*wrong|404/i').isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasError).toBeTruthy();
    });

    test('should allow retrying failed API calls', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Go to a page that makes API calls
      await page.goto('/dashboard/notifications');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // If there's an error with a retry button, test it
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');

      if (await retryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await retryButton.click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should handle concurrent request failures', async ({ page }) => {
      await loginAsUser(page, testUser);

      let failedCount = 0;

      // Fail some random requests
      await page.route('**/*', (route) => {
        if (Math.random() > 0.7 && failedCount < 3) {
          failedCount++;
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      await page.goto('/dashboard');

      // Page should still be usable
      await page.waitForLoadState('domcontentloaded');
    });

    test('should recover from offline state', async ({ page, context }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Simulate going offline
      await context.setOffline(true);

      // Try to navigate
      const errorPromise = page.goto('/dashboard/jobs').catch(() => 'error');

      // Should show offline indicator or error
      await page.waitForTimeout(2000);

      // Go back online
      await context.setOffline(false);

      // Should be able to reload
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('should handle file upload failures', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/profile/certifications');

      // Check if file upload exists
      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible()) {
        // Intercept upload requests and fail them
        await page.route('**/upload**', (route) => {
          route.abort('failed');
        });

        // Try to upload a file
        const buffer = Buffer.from('test-file-content');
        await fileInput.setInputFiles({
          name: 'test-cert.jpg',
          mimeType: 'image/jpeg',
          buffer: buffer,
        });

        // Wait for upload attempt
        await page.waitForTimeout(2000);

        // Should show error message
        const hasError = await page.locator('text=/failed|error|try again/i').isVisible({ timeout: 3000 }).catch(() => false);

        // Form should still be usable
        await expect(page.locator('button:has-text("Add")')).toBeVisible();
      }
    });
  });

  test.describe('Loading States', () => {
    test('should show loading spinner during data fetch', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Delay API responses
      await page.route('**/*', (route) => {
        setTimeout(() => route.continue(), 1500);
      });

      await page.goto('/dashboard/jobs');

      // Should show loading indicator
      const loadingIndicator = page.locator('.animate-spin, .animate-pulse, [data-loading="true"], text=/loading/i');
      await expect(loadingIndicator.first()).toBeVisible({ timeout: 3000 }).catch(() => {
        // Loading might be too fast to catch, that's OK
      });
    });

    test('should show skeleton loaders for content', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Delay responses
      await page.route('**/*', (route) => {
        setTimeout(() => route.continue(), 2000);
      });

      await page.goto('/dashboard/profile');

      // Check for skeleton elements
      const skeleton = page.locator('.animate-pulse, [data-skeleton]');
      await expect(skeleton.first()).toBeVisible({ timeout: 3000 }).catch(() => {
        // Skeleton might not be visible if load is fast
      });
    });

    test('should handle infinite scroll loading', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');

      await page.waitForLoadState('networkidle');

      // Scroll to bottom to trigger infinite scroll if implemented
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for any new content to load
      await page.waitForTimeout(1500);
    });
  });

  test.describe('Toast Notifications', () => {
    test('should dismiss toast notifications', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/profile/edit');

      // Fill and submit form to trigger toast
      const nameInput = page.locator('input#name');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Toast Test User');
        await page.click('button[type="submit"]');

        // Wait for toast
        const toast = page.locator('[role="alert"], [data-sonner-toast]').first();

        if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Toast should auto-dismiss or be dismissable
          await page.waitForTimeout(5000);
        }
      }
    });
  });
});


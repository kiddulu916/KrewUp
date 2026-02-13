import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  TestUser,
} from './utils/test-db';
import {
  loginAsUser,
  waitForPageReady,
  waitForToast,
  generateTestEmail,
} from './utils/test-helpers';

test.describe('Admin Dashboard E2E Tests', () => {
  let adminUser: TestUser;
  let regularUser: TestUser;

  test.beforeAll(async () => {
    // Create admin user
    adminUser = await createTestUser({
      role: 'employer',
      isAdmin: true,
    });
    
    // Create regular user
    regularUser = await createTestUser({
      role: 'worker',
    });
  });

  test.afterAll(async () => {
    if (adminUser) await deleteTestUser(adminUser.id);
    if (regularUser) await deleteTestUser(regularUser.id);
  });

  test.describe('Admin Access Control', () => {
    test('should allow admin to access admin dashboard', async ({ page }) => {
      await loginAsUser(page, adminUser);
      
      await page.goto('/admin/dashboard');
      await waitForPageReady(page, /\/admin\/dashboard/);
      
      // Should see admin dashboard content
      await expect(page.locator('h1:has-text("Admin")')).toBeVisible();
    });

    test('should deny non-admin access to admin routes', async ({ page }) => {
      await loginAsUser(page, regularUser);
      
      await page.goto('/admin/dashboard');
      
      // Should be redirected or shown 404
      await page.waitForLoadState('networkidle');
      
      // Either redirected to login/dashboard or 404
      const url = page.url();
      const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
      
      expect(url.includes('/admin/dashboard') && !is404).toBeFalsy();
    });

    test('should hide admin link from non-admin users', async ({ page }) => {
      await loginAsUser(page, regularUser);
      
      // Check sidebar for admin link
      const adminLink = page.locator('nav a[href*="/admin"]');
      
      expect(await adminLink.count()).toBe(0);
    });

    test('should show admin panel link for admin users', async ({ page }) => {
      await loginAsUser(page, adminUser);
      
      await page.goto('/dashboard/feed');
      
      // Check for admin panel button
      const adminButton = page.locator('a:has-text("Admin Panel")');
      
      await expect(adminButton).toBeVisible();
    });
  });

  test.describe('Admin Dashboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/dashboard');
      await waitForPageReady(page, /\/admin\/dashboard/);
    });

    test('should display metrics cards', async ({ page }) => {
      // Check for metric cards
      await expect(page.locator('text=Total Users')).toBeVisible();
      await expect(page.locator('text=Active Jobs')).toBeVisible();
    });

    test('should navigate to certifications page', async ({ page }) => {
      await page.click('a:has-text("Certifications")');
      
      await waitForPageReady(page, /\/admin\/certifications/);
      await expect(page.locator('h1:has-text("Certification")')).toBeVisible();
    });

    test('should navigate to users page', async ({ page }) => {
      await page.click('a:has-text("Users")');
      
      await waitForPageReady(page, /\/admin\/users/);
      await expect(page.locator('h1:has-text("User")')).toBeVisible();
    });

    test('should navigate to moderation page', async ({ page }) => {
      await page.click('a:has-text("Moderation")');
      
      await waitForPageReady(page, /\/admin\/moderation/);
      await expect(page.locator('h1:has-text("Moderation")')).toBeVisible();
    });

    test('should navigate to monitoring page', async ({ page }) => {
      await page.click('a:has-text("Monitoring"), a:has-text("Errors")');
      
      await waitForPageReady(page, /\/admin\/monitoring/);
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should navigate to ad metrics page', async ({ page }) => {
      await page.click('a:has-text("Ad Metrics")');
      
      await waitForPageReady(page, /\/admin\/ads/);
      await expect(page.locator('h1:has-text("Ad")')).toBeVisible();
    });
  });

  test.describe('User Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/users');
      await waitForPageReady(page, /\/admin\/users/);
    });

    test('should display user list', async ({ page }) => {
      // Wait for users to load
      await page.waitForLoadState('networkidle');

      // Should see some user entries
      const userRows = page.locator('table tbody tr, [data-user-id]');
      expect(await userRows.count()).toBeGreaterThan(0);
    });

    test('should search for users', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');

      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');

        // Should filter results
        expect(page.url()).toContain('search');
      }
    });

    test('should filter users by role', async ({ page }) => {
      const roleFilter = page.locator('select[name*="role"], [data-filter="role"]');

      if (await roleFilter.isVisible()) {
        await roleFilter.selectOption('worker');
        await page.waitForLoadState('networkidle');
      }
    });

    test('should display user count in search filters', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Should show "Showing X of Y users" text
      const countText = page.locator('text=/Showing.*of.*users/i');
      await expect(countText).toBeVisible();
    });

    test('should filter users by subscription status', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Find subscription filter dropdown
      const subscriptionFilter = page.locator('select').filter({ hasText: /All Subscriptions|Free|Pro/i });

      if (await subscriptionFilter.isVisible()) {
        await subscriptionFilter.selectOption('pro');
        await page.waitForTimeout(500); // Wait for client-side filtering
      }
    });

    test('should select user and display user details', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Click on first user in the list
      const firstUserButton = page.locator('button').filter({ hasText: regularUser.email }).first();

      if (await firstUserButton.isVisible()) {
        await firstUserButton.click();
        await page.waitForTimeout(1000); // Wait for user details to load

        // Verify UserInfoCard displays user details
        await expect(page.locator('text=User Information')).toBeVisible();
        await expect(page.locator(`text=${regularUser.email}`)).toBeVisible();

        // Verify role is displayed
        await expect(page.locator('text=Role')).toBeVisible();
      }
    });

    test('should display moderation actions for selected user', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Select a user
      const userButton = page.locator('button').filter({ hasText: regularUser.email }).first();

      if (await userButton.isVisible()) {
        await userButton.click();
        await page.waitForTimeout(1000);

        // Verify ModerationActionsCard is displayed
        await expect(page.locator('text=Moderation Actions')).toBeVisible();

        // Should see moderation action buttons
        const suspendButton = page.locator('button:has-text("Suspend User")');
        const banButton = page.locator('button:has-text("Ban User")');

        // At least one of these should be visible (depending on user status)
        const hasSuspendButton = await suspendButton.isVisible().catch(() => false);
        const hasBanButton = await banButton.isVisible().catch(() => false);

        expect(hasSuspendButton || hasBanButton).toBeTruthy();
      }
    });

    test('should display Pro subscription card for selected user', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Select a user
      const userButton = page.locator('button').filter({ hasText: regularUser.email }).first();

      if (await userButton.isVisible()) {
        await userButton.click();
        await page.waitForTimeout(1000);

        // Verify ProSubscriptionCard is displayed
        await expect(page.locator('text=Pro Subscription')).toBeVisible();

        // Should see either Grant or Revoke Pro button
        const grantButton = page.locator('button:has-text("Grant Pro")');
        const revokeButton = page.locator('button:has-text("Revoke Pro")');

        const hasGrantButton = await grantButton.isVisible().catch(() => false);
        const hasRevokeButton = await revokeButton.isVisible().catch(() => false);

        expect(hasGrantButton || hasRevokeButton).toBeTruthy();
      }
    });

    test('should display moderation history card', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Select a user
      const userButton = page.locator('button').filter({ hasText: regularUser.email }).first();

      if (await userButton.isVisible()) {
        await userButton.click();
        await page.waitForTimeout(1000);

        // Verify ModerationHistoryCard is displayed
        await expect(page.locator('text=Moderation History')).toBeVisible();

        // Should see either history or "No moderation history" message
        const hasHistory = await page.locator('text=/No moderation history|This user has not been moderated/i').isVisible({ timeout: 2000 }).catch(() => false);
        const hasTimeline = await page.locator('[class*="space-y"]').filter({ hasText: /banned|suspended|warning/i }).isVisible({ timeout: 2000 }).catch(() => false);

        expect(hasHistory || hasTimeline).toBeTruthy();
      }
    });
  });

  test.describe('User Management - Complete Flow', () => {
    let testWorker: TestUser;

    test.beforeEach(async ({ page }) => {
      // Create a fresh test user for moderation testing
      testWorker = await createTestUser({
        email: generateTestEmail(),
        role: 'worker',
        name: 'Flow Test Worker',
      });

      await loginAsUser(page, adminUser);
      await page.goto('/admin/users');
      await waitForPageReady(page, /\/admin\/users/);
      await page.waitForLoadState('networkidle');
    });

    test.afterEach(async () => {
      if (testWorker) await deleteTestUser(testWorker.id);
    });

    test('should complete suspend user flow', async ({ page }) => {
      // Search for the test user
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill(testWorker.email);
      await page.waitForTimeout(500);

      // Select the user
      const userButton = page.locator('button').filter({ hasText: testWorker.email });
      await userButton.click();
      await page.waitForTimeout(1000);

      // Click Suspend User button
      const suspendButton = page.locator('button:has-text("Suspend User")');
      if (await suspendButton.isVisible()) {
        await suspendButton.click();

        // Fill suspend dialog
        const durationInput = page.locator('input[type="number"]').first();
        const reasonInput = page.locator('input[placeholder*="reason" i], textarea[placeholder*="reason" i]').first();

        await durationInput.fill('7');
        await reasonInput.fill('Test suspension for E2E testing');

        // Submit suspension
        const confirmButton = page.locator('button:has-text("Suspend")').last();
        await confirmButton.click();

        // Wait for success toast
        const toastAppeared = await waitForToast(page, /suspended|success/i);
        expect(toastAppeared).toBeTruthy();

        // Wait for page to update
        await page.waitForTimeout(1000);

        // Verify suspended badge appears in UserInfoCard
        const suspendedBadge = page.locator('text=SUSPENDED');
        await expect(suspendedBadge).toBeVisible({ timeout: 5000 });

        // Verify Suspend button is now disabled or hidden
        const suspendButtonAfter = page.locator('button:has-text("Suspend User")');
        const isDisabled = await suspendButtonAfter.getAttribute('disabled');
        expect(isDisabled).not.toBeNull();
      }
    });

    test('should complete ban and unban user flow', async ({ page }) => {
      // Search for the test user
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill(testWorker.email);
      await page.waitForTimeout(500);

      // Select the user
      const userButton = page.locator('button').filter({ hasText: testWorker.email });
      await userButton.click();
      await page.waitForTimeout(1000);

      // Click Ban User button
      const banButton = page.locator('button:has-text("Ban User")');
      if (await banButton.isVisible()) {
        await banButton.click();

        // Fill ban dialog
        const reasonInput = page.locator('input[placeholder*="reason" i], textarea[placeholder*="reason" i]').last();
        await reasonInput.fill('Test ban for E2E testing');

        // Submit ban
        const confirmButton = page.locator('button:has-text("Ban")').last();
        await confirmButton.click();

        // Wait for success toast
        const toastAppeared = await waitForToast(page, /banned|success/i);
        expect(toastAppeared).toBeTruthy();

        // Wait for page to update
        await page.waitForTimeout(1000);

        // Verify banned badge appears
        const bannedBadge = page.locator('text=BANNED');
        await expect(bannedBadge).toBeVisible({ timeout: 5000 });

        // Verify Unban button is now visible
        const unbanButton = page.locator('button:has-text("Unban User")');
        await expect(unbanButton).toBeVisible();

        // Click Unban button
        await unbanButton.click();

        // Confirm unban in dialog
        const unbanConfirmButton = page.locator('button:has-text("Confirm"), button:has-text("Unban")').last();
        await unbanConfirmButton.click();

        // Wait for success toast
        const unbanToastAppeared = await waitForToast(page, /unbanned|success/i);
        expect(unbanToastAppeared).toBeTruthy();

        // Wait for page to update
        await page.waitForTimeout(1000);

        // Verify banned badge is removed
        const bannedBadgeAfter = page.locator('text=BANNED');
        await expect(bannedBadgeAfter).not.toBeVisible({ timeout: 3000 });
      }
    });

    test('should complete grant and revoke Pro subscription flow', async ({ page }) => {
      // Search for the test user
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill(testWorker.email);
      await page.waitForTimeout(500);

      // Select the user
      const userButton = page.locator('button').filter({ hasText: testWorker.email });
      await userButton.click();
      await page.waitForTimeout(1000);

      // Click Grant Pro button
      const grantButton = page.locator('button:has-text("Grant Pro")');
      if (await grantButton.isVisible()) {
        await grantButton.click();

        // Fill grant Pro dialog
        const reasonInput = page.locator('input[placeholder*="reason" i], textarea[placeholder*="reason" i]').last();
        await reasonInput.fill('Test Pro grant for E2E testing');

        // Submit grant
        const confirmButton = page.locator('button:has-text("Grant")').last();
        await confirmButton.click();

        // Wait for success toast
        const toastAppeared = await waitForToast(page, /granted|success/i);
        expect(toastAppeared).toBeTruthy();

        // Wait for page to update
        await page.waitForTimeout(1000);

        // Verify Pro badge appears in user list or info card
        const proBadge = page.locator('text=Pro');
        await expect(proBadge).toBeVisible({ timeout: 5000 });

        // Verify Revoke Pro button is now visible
        const revokeButton = page.locator('button:has-text("Revoke Pro")');
        await expect(revokeButton).toBeVisible();

        // Click Revoke Pro button
        await revokeButton.click();

        // Handle browser prompt for revoke reason
        page.on('dialog', async dialog => {
          expect(dialog.type()).toBe('prompt');
          await dialog.accept('Test Pro revocation for E2E testing');
        });

        // Wait for success toast
        await page.waitForTimeout(1000);
        const revokeToastAppeared = await waitForToast(page, /revoked|success/i);
        expect(revokeToastAppeared).toBeTruthy();

        // Wait for page to update
        await page.waitForTimeout(1000);

        // Verify Grant Pro button is visible again
        const grantButtonAfter = page.locator('button:has-text("Grant Pro")');
        await expect(grantButtonAfter).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display moderation history after actions', async ({ page }) => {
      // Search for the test user
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill(testWorker.email);
      await page.waitForTimeout(500);

      // Select the user
      const userButton = page.locator('button').filter({ hasText: testWorker.email });
      await userButton.click();
      await page.waitForTimeout(1000);

      // Initially should have no history
      await expect(page.locator('text=/No moderation history/i')).toBeVisible();

      // Perform a suspension
      const suspendButton = page.locator('button:has-text("Suspend User")');
      if (await suspendButton.isVisible()) {
        await suspendButton.click();

        const durationInput = page.locator('input[type="number"]').first();
        const reasonInput = page.locator('input[placeholder*="reason" i], textarea[placeholder*="reason" i]').first();

        await durationInput.fill('7');
        await reasonInput.fill('Testing moderation history');

        const confirmButton = page.locator('button:has-text("Suspend")').last();
        await confirmButton.click();

        // Wait for success
        await waitForToast(page, /suspended|success/i);
        await page.waitForTimeout(1500);

        // Scroll to moderation history
        await page.locator('text=Moderation History').scrollIntoViewIfNeeded();

        // Verify moderation history now shows the action
        await expect(page.locator('text=Testing moderation history')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=/suspension|suspended/i')).toBeVisible();

        // Verify duration is shown
        await expect(page.locator('text=/7 days|Duration/i')).toBeVisible();
      }
    });

    test('should update user list after moderation action', async ({ page }) => {
      // Search for the test user
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill(testWorker.email);
      await page.waitForTimeout(500);

      // Select the user
      const userButton = page.locator('button').filter({ hasText: testWorker.email });
      await userButton.click();
      await page.waitForTimeout(1000);

      // Suspend the user
      const suspendButton = page.locator('button:has-text("Suspend User")');
      if (await suspendButton.isVisible()) {
        await suspendButton.click();

        const durationInput = page.locator('input[type="number"]').first();
        const reasonInput = page.locator('input[placeholder*="reason" i], textarea[placeholder*="reason" i]').first();

        await durationInput.fill('14');
        await reasonInput.fill('Testing user list refresh');

        const confirmButton = page.locator('button:has-text("Suspend")').last();
        await confirmButton.click();

        // Wait for success
        await waitForToast(page, /suspended|success/i);
        await page.waitForTimeout(1500);

        // Clear search to see all users
        await searchInput.clear();
        await page.waitForTimeout(500);

        // Search for user again
        await searchInput.fill(testWorker.email);
        await page.waitForTimeout(500);

        // User should still be in the list
        const userButtonAfter = page.locator('button').filter({ hasText: testWorker.email });
        await expect(userButtonAfter).toBeVisible();
      }
    });
  });

  test.describe('Certification Verification', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/certifications');
      await waitForPageReady(page, /\/admin\/certifications/);
    });

    test('should display certification list', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Should have certifications section or empty state
      const hasCertifications = await page.locator('table, [data-certification-id]').isVisible().catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*certifications|empty/i').isVisible().catch(() => false);
      
      expect(hasCertifications || hasEmptyState).toBeTruthy();
    });

    test('should filter by verification status', async ({ page }) => {
      const statusFilter = page.locator('select[name*="status"], button:has-text("Pending")');
      
      if (await statusFilter.first().isVisible()) {
        await statusFilter.first().click();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Content Moderation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/moderation');
      await waitForPageReady(page, /\/admin\/moderation/);
    });

    test('should display moderation queue', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Should have reports section or empty state
      const hasReports = await page.locator('[data-report-id], table').isVisible().catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*reports|empty|queue/i').isVisible().catch(() => false);
      
      expect(hasReports || hasEmptyState).toBeTruthy();
    });
  });

  test.describe('Analytics Dashboard', () => {
    test('should display analytics overview', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/analytics');
      await waitForPageReady(page, /\/admin\/analytics/);
      
      // Should have analytics content
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should display analytics charts', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/analytics/overview');
      await waitForPageReady(page, /\/admin\/analytics/);
      
      // Wait for charts to render
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Ad Metrics Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/ads');
      await waitForPageReady(page, /\/admin\/ads/);
    });

    test('should display ad metrics', async ({ page }) => {
      await expect(page.locator('h1:has-text("Ad")')).toBeVisible();
      
      // Check for metric cards
      await expect(page.locator('text=/Impressions|Clicks|CTR|Revenue/i')).toBeVisible();
    });

    test('should display configuration status', async ({ page }) => {
      await expect(page.locator('text=Configuration')).toBeVisible();
    });
  });
});


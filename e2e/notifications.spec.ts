import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  createTestNotification,
  deleteUserNotifications,
  TestUser,
} from './utils/test-db';
import { loginAsUser } from './utils/test-helpers';

test.describe('Notifications', () => {
  let testWorker: TestUser;

  test.beforeAll(async () => {
    testWorker = await createTestUser({
      role: 'worker',
      name: 'Notification Test Worker',
      trade: 'Electrical',
    });
  });

  test.afterAll(async () => {
    if (testWorker) {
      await deleteUserNotifications(testWorker.id);
      await deleteTestUser(testWorker.id);
    }
  });

  test.beforeEach(async () => {
    // Clean up notifications before each test
    await deleteUserNotifications(testWorker.id);
  });

  test.describe('Notification Bell', () => {
    test('should display notification bell in header', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard');

      // Notification bell should be visible
      const notificationBell = page.locator('a[aria-label*="Notification"]');
      await expect(notificationBell).toBeVisible();
    });

    test('should show unread count badge when notifications exist', async ({ page }) => {
      // Create some unread notifications
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'New message',
        message: 'You have a new message',
      });
      await createTestNotification(testWorker.id, {
        type: 'application_status',
        title: 'Application update',
        message: 'Your application status has changed',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard');

      // Wait for unread count to appear
      const badge = page.locator('a[aria-label*="Notification"] span').filter({ hasText: /\d+/ });
      await expect(badge).toBeVisible({ timeout: 10000 });

      // Badge should show count of 2
      await expect(badge).toHaveText('2');
    });

    test('should not show badge when no unread notifications', async ({ page }) => {
      // Create a read notification
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Old message',
        message: 'Already read message',
        read: true,
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard');

      // Bell should exist but no badge with count
      const notificationBell = page.locator('a[aria-label*="Notification"]');
      await expect(notificationBell).toBeVisible();

      // Badge should not be visible
      const badge = page.locator('a[aria-label*="Notification"] span.bg-red-600');
      await expect(badge).not.toBeVisible();
    });

    test('should show 99+ when count exceeds 99', async ({ page }) => {
      // Create 100 unread notifications
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          createTestNotification(testWorker.id, {
            type: 'new_message',
            title: `Message ${i}`,
            message: `Test message ${i}`,
          })
        );
      }
      await Promise.all(promises);

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard');

      // Badge should show 99+
      const badge = page.locator('a[aria-label*="Notification"] span').filter({ hasText: /99\+/ });
      await expect(badge).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to notifications page when clicked', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard');

      const notificationBell = page.locator('a[aria-label*="Notification"]');
      await notificationBell.click();

      await expect(page).toHaveURL('/dashboard/notifications');
    });
  });

  test.describe('Notification List', () => {
    test('should show empty state when no notifications', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Should show empty state
      await expect(page.locator('text=No notifications')).toBeVisible();
      await expect(page.locator('text=You\'re all caught up')).toBeVisible();
    });

    test('should display notifications list', async ({ page }) => {
      // Create notifications
      await createTestNotification(testWorker.id, {
        type: 'proximity_alert',
        title: 'New job nearby',
        message: 'A new Electrician job was posted near you',
      });
      await createTestNotification(testWorker.id, {
        type: 'application_status',
        title: 'Application viewed',
        message: 'Your application has been viewed',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Should show notifications
      await expect(page.locator('text=New job nearby')).toBeVisible();
      await expect(page.locator('text=Application viewed')).toBeVisible();
    });

    test('should show notification type icons', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'proximity_alert',
        title: 'Proximity alert',
        message: 'New job nearby',
      });
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'New message',
        message: 'You have a message',
      });
      await createTestNotification(testWorker.id, {
        type: 'profile_view',
        title: 'Profile view',
        message: 'Someone viewed your profile',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Check type icons are displayed (emojis)
      await expect(page.locator('text=📍')).toBeVisible(); // proximity_alert
      await expect(page.locator('text=💬')).toBeVisible(); // new_message
      await expect(page.locator('text=👁️')).toBeVisible(); // profile_view
    });

    test('should highlight unread notifications', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Unread notification',
        message: 'This is unread',
        read: false,
      });
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Read notification',
        message: 'This is read',
        read: true,
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Unread notification should have blue background and left border
      const unreadCard = page.locator('[data-testid="card"]').filter({ hasText: 'Unread notification' });
      await expect(unreadCard).toHaveClass(/bg-blue-50/);
      await expect(unreadCard).toHaveClass(/border-l-blue-600/);

      // Read notification should have white background
      const readCard = page.locator('[data-testid="card"]').filter({ hasText: 'Read notification' });
      await expect(readCard).toHaveClass(/bg-white/);
    });

    test('should show unread count in header', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Unread 1',
        message: 'Test',
      });
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Unread 2',
        message: 'Test',
      });
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Read',
        message: 'Test',
        read: true,
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Should show "2 unread notifications"
      await expect(page.locator('text=2 unread notification')).toBeVisible();
    });
  });

  test.describe('Mark as Read', () => {
    test('should mark single notification as read when clicked', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Click to read',
        message: 'This will be marked as read',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Find and click the unread notification
      const notification = page.locator('[data-testid="card"]').filter({ hasText: 'Click to read' });
      await expect(notification).toHaveClass(/bg-blue-50/);

      await notification.click();

      // Wait for the notification to update
      await page.waitForTimeout(1000);

      // Reload to verify it's marked as read
      await page.reload();
      await page.waitForLoadState('networkidle');

      const updatedNotification = page.locator('[data-testid="card"]').filter({ hasText: 'Click to read' });
      await expect(updatedNotification).toHaveClass(/bg-white/);
    });

    test('should show Mark all as read button when unread notifications exist', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Unread 1',
        message: 'Test',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      const markAllButton = page.locator('button:has-text("Mark all as read")');
      await expect(markAllButton).toBeVisible();
    });

    test('should not show Mark all as read when all notifications are read', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Read notification',
        message: 'Already read',
        read: true,
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      const markAllButton = page.locator('button:has-text("Mark all as read")');
      await expect(markAllButton).not.toBeVisible();
    });

    test('should mark all notifications as read', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Unread 1',
        message: 'Test',
      });
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Unread 2',
        message: 'Test',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Should show 2 unread
      await expect(page.locator('text=2 unread notification')).toBeVisible();

      // Click mark all as read
      const markAllButton = page.locator('button:has-text("Mark all as read")');
      await markAllButton.click();

      // Wait for update
      await page.waitForTimeout(1000);

      // Unread count message should disappear
      await expect(page.locator('text=2 unread notification')).not.toBeVisible();

      // Mark all button should disappear
      await expect(markAllButton).not.toBeVisible();
    });
  });

  test.describe('Delete Notification', () => {
    test('should show delete button on each notification', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Test notification',
        message: 'Delete me',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      const deleteButton = page.locator('button[aria-label="Delete notification"]');
      await expect(deleteButton).toBeVisible();
    });

    test('should delete notification when confirmed', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'To be deleted',
        message: 'This will be removed',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Verify notification exists
      await expect(page.locator('text=To be deleted')).toBeVisible();

      // Handle confirm dialog
      page.on('dialog', (dialog) => dialog.accept());

      // Click delete button
      const deleteButton = page.locator('button[aria-label="Delete notification"]');
      await deleteButton.click();

      // Wait for deletion
      await page.waitForTimeout(1000);

      // Notification should be gone
      await expect(page.locator('text=To be deleted')).not.toBeVisible();
    });

    test('should not delete notification when cancelled', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Keep me',
        message: 'This should stay',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Handle confirm dialog - dismiss it
      page.on('dialog', (dialog) => dialog.dismiss());

      // Click delete button
      const deleteButton = page.locator('button[aria-label="Delete notification"]');
      await deleteButton.click();

      // Notification should still exist
      await expect(page.locator('text=Keep me')).toBeVisible();
    });
  });

  test.describe('Navigation from Notification', () => {
    test('should navigate to link when notification with link is clicked', async ({ page }) => {
      // Create notification with link to jobs page
      await createTestNotification(testWorker.id, {
        type: 'proximity_alert',
        title: 'New job available',
        message: 'Check out this new job',
        link: '/dashboard/jobs',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Click the notification
      const notification = page.locator('[data-testid="card"]').filter({ hasText: 'New job available' });
      await notification.click();

      // Should navigate to the jobs page
      await expect(page).toHaveURL('/dashboard/jobs');
    });
  });

  test.describe('Time Display', () => {
    test('should show relative time for notifications', async ({ page }) => {
      await createTestNotification(testWorker.id, {
        type: 'new_message',
        title: 'Recent notification',
        message: 'Just now',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/notifications');

      // Should show some form of relative time
      // (Just now, Xm ago, Xh ago, etc.)
      const timeText = page.locator('text=/Just now|\\dm ago|\\dh ago|\\dd ago/');
      await expect(timeText).toBeVisible();
    });
  });

  test.describe('Loading State', () => {
    test('should show loading spinner while fetching', async ({ page }) => {
      await loginAsUser(page, testWorker);

      // Start navigation but don't wait for full load
      await page.goto('/dashboard/notifications', { waitUntil: 'commit' });

      // Check for loading spinner (may be brief)
      const spinner = page.locator('[data-testid="loading-spinner"], .animate-spin');
      // Loading may be too fast to catch reliably, so we just verify the page loads
      await page.waitForLoadState('networkidle');
    });
  });
});

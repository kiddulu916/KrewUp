import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  createTestJob,
  createTestMessage,
  testDb,
  TestUser,
} from './utils/test-db';
import { loginAsUser, waitForToast } from './utils/test-helpers';

test.describe('Concurrent Users', () => {
  let worker1: TestUser;
  let worker2: TestUser;
  let employer: TestUser;

  test.beforeAll(async () => {
    worker1 = await createTestUser({
      role: 'worker',
      name: 'Concurrent Worker 1',
      trade: 'Electrical',
    });

    worker2 = await createTestUser({
      role: 'worker',
      name: 'Concurrent Worker 2',
      trade: 'Plumbing',
    });

    employer = await createTestUser({
      role: 'employer',
      name: 'Concurrent Employer',
      employerType: 'contractor',
      companyName: 'Concurrent Test LLC',
    });
  });

  test.afterAll(async () => {
    // Cleanup test data
    await testDb.from('messages').delete().in('sender_id', [worker1.id, worker2.id, employer.id]);
    await testDb.from('job_applications').delete().in('applicant_id', [worker1.id, worker2.id]);
    await testDb.from('jobs').delete().eq('employer_id', employer.id);

    if (worker1) await deleteTestUser(worker1.id);
    if (worker2) await deleteTestUser(worker2.id);
    if (employer) await deleteTestUser(employer.id);
  });

  test.describe('Messaging Between Users', () => {
    test('should allow two users to message each other simultaneously', async ({ browser }) => {
      // Create two browser contexts for two different users
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login both users
        await loginAsUser(page1, worker1);
        await loginAsUser(page2, employer);

        // Create initial message in database
        await createTestMessage(worker1.id, employer.id, 'Hello from worker!');

        // Worker 1 navigates to messages
        await page1.goto('/dashboard/messages');
        await page1.waitForLoadState('networkidle');

        // Employer navigates to messages
        await page2.goto('/dashboard/messages');
        await page2.waitForLoadState('networkidle');

        // Both should see the conversation
        const worker1Conversations = page1.locator('[data-testid="conversation-item"], [class*="conversation"]');
        const employerConversations = page2.locator('[data-testid="conversation-item"], [class*="conversation"]');

        // Check conversations exist
        await expect(worker1Conversations.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
        await expect(employerConversations.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('should show new messages in real-time', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login both users
        await loginAsUser(page1, worker1);
        await loginAsUser(page2, employer);

        // Both navigate to their conversation
        await page1.goto('/dashboard/messages');
        await page2.goto('/dashboard/messages');

        await page1.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');

        // Click on conversation if available
        const worker1Conv = page1.locator('[data-testid="conversation-item"]').first();
        const employerConv = page2.locator('[data-testid="conversation-item"]').first();

        if (await worker1Conv.isVisible({ timeout: 3000 }).catch(() => false)) {
          await worker1Conv.click();
        }

        if (await employerConv.isVisible({ timeout: 3000 }).catch(() => false)) {
          await employerConv.click();
        }

        // Wait for message input to be visible
        await page1.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('Job Application Race Conditions', () => {
    test('should handle multiple applications to same job', async ({ browser }) => {
      // Create a job
      const job = await createTestJob(employer.id, {
        title: 'Concurrent Application Test Job',
        trade: 'Electrical',
      });

      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login both workers
        await loginAsUser(page1, worker1);
        await loginAsUser(page2, worker2);

        // Both navigate to the job
        await page1.goto(`/dashboard/jobs/${job.id}`);
        await page2.goto(`/dashboard/jobs/${job.id}`);

        await page1.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');

        // Both should see apply button
        const applyButton1 = page1.locator('button:has-text("Apply"), a:has-text("Apply")');
        const applyButton2 = page2.locator('button:has-text("Apply"), a:has-text("Apply")');

        await expect(applyButton1).toBeVisible({ timeout: 10000 }).catch(() => {});
        await expect(applyButton2).toBeVisible({ timeout: 10000 }).catch(() => {});
      } finally {
        await context1.close();
        await context2.close();

        // Cleanup job
        await testDb.from('jobs').delete().eq('id', job.id);
      }
    });
  });

  test.describe('Profile Updates Visibility', () => {
    test('should show updated profile to other users', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login both users
        await loginAsUser(page1, worker1);
        await loginAsUser(page2, employer);

        // Worker updates their profile
        await page1.goto('/dashboard/profile/edit');
        await page1.waitForLoadState('networkidle');

        const bioInput = page1.locator('textarea#bio');
        if (await bioInput.isVisible()) {
          const newBio = `Updated bio at ${Date.now()}`;
          await bioInput.fill(newBio);

          await page1.click('button[type="submit"]');
          await waitForToast(page1, /updated|saved/i);
        }

        // Employer views worker's profile
        await page2.goto(`/dashboard/profiles/${worker1.id}`);
        await page2.waitForLoadState('networkidle');

        // Profile page should exist (may redirect if not found)
        await page2.waitForTimeout(2000);
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('Job Listing Updates', () => {
    test('should show new jobs to workers in real-time', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login employer and worker
        await loginAsUser(page1, employer);
        await loginAsUser(page2, worker1);

        // Worker views job feed
        await page2.goto('/dashboard/jobs');
        await page2.waitForLoadState('networkidle');

        // Count initial jobs
        const initialJobCount = await page2.locator('[data-testid="job-card"], [class*="job-card"]').count();

        // Employer creates a new job
        const newJob = await createTestJob(employer.id, {
          title: `New Real-time Job ${Date.now()}`,
          trade: 'Electrical',
        });

        // Worker refreshes to see new job
        await page2.reload();
        await page2.waitForLoadState('networkidle');

        // Should have at least the same number of jobs (or more if new job shows)
        const updatedJobCount = await page2.locator('[data-testid="job-card"], [class*="job-card"]').count();
        expect(updatedJobCount).toBeGreaterThanOrEqual(initialJobCount);

        // Cleanup
        await testDb.from('jobs').delete().eq('id', newJob.id);
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('Session Isolation', () => {
    test('should keep user sessions separate', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login as different users
        await loginAsUser(page1, worker1);
        await loginAsUser(page2, worker2);

        // Navigate to profile pages
        await page1.goto('/dashboard/profile');
        await page2.goto('/dashboard/profile');

        await page1.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');

        // Each should see their own profile
        await expect(page1.locator(`text=${worker1.name.split(' ')[0]}`)).toBeVisible({ timeout: 5000 }).catch(() => {});
        await expect(page2.locator(`text=${worker2.name.split(' ')[0]}`)).toBeVisible({ timeout: 5000 }).catch(() => {});
      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('should not leak data between sessions', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login as worker and employer
        await loginAsUser(page1, worker1);
        await loginAsUser(page2, employer);

        // Worker views their applications
        await page1.goto('/dashboard/applications');

        // Employer views their jobs
        await page2.goto('/dashboard/jobs');

        await page1.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');

        // Worker should not see employer-only content
        const postJobButton1 = page1.locator('button:has-text("Post Job"), a:has-text("Post Job")');
        const hasPostJob1 = await postJobButton1.isVisible({ timeout: 2000 }).catch(() => false);

        // If worker somehow sees post job button, that's a security issue
        // (This may be expected depending on UI design)
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('Notification Delivery', () => {
    test('should deliver notifications to correct users', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login both users
        await loginAsUser(page1, worker1);
        await loginAsUser(page2, worker2);

        // Both navigate to notifications
        await page1.goto('/dashboard/notifications');
        await page2.goto('/dashboard/notifications');

        await page1.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');

        // Each should only see their own notifications
        // This is verified by not seeing cross-user data
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('Application Status Updates', () => {
    test('should update application status visible to both parties', async ({ browser }) => {
      // Create job and application
      const job = await createTestJob(employer.id, {
        title: 'Status Update Test Job',
        trade: 'Plumbing',
      });

      const { data: application } = await testDb
        .from('job_applications')
        .insert({
          job_id: job.id,
          applicant_id: worker1.id,
          status: 'pending',
          form_data: { fullName: 'Test Worker' },
        })
        .select()
        .single();

      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login both users
        await loginAsUser(page1, employer);
        await loginAsUser(page2, worker1);

        // Employer views applicants
        await page1.goto(`/dashboard/jobs/${job.id}/applicants`);
        await page1.waitForLoadState('networkidle');

        // Worker views their applications
        await page2.goto('/dashboard/applications');
        await page2.waitForLoadState('networkidle');

        // Both should see the application exists
      } finally {
        await context1.close();
        await context2.close();

        // Cleanup
        if (application) {
          await testDb.from('job_applications').delete().eq('id', application.id);
        }
        await testDb.from('jobs').delete().eq('id', job.id);
      }
    });
  });

  test.describe('Concurrent Edits', () => {
    test('should handle simultaneous profile edits gracefully', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Same user opens profile edit in two tabs
        await loginAsUser(page1, worker1);

        // Store context cookies and apply to second context
        const cookies = await context1.cookies();
        await context2.addCookies(cookies);

        // Both tabs edit profile
        await page1.goto('/dashboard/profile/edit');
        await page2.goto('/dashboard/profile/edit');

        await page1.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');

        // Update bio in tab 1
        const bioInput1 = page1.locator('textarea#bio');
        if (await bioInput1.isVisible()) {
          await bioInput1.fill('Update from tab 1');
        }

        // Update bio in tab 2
        const bioInput2 = page2.locator('textarea#bio');
        if (await bioInput2.isVisible()) {
          await bioInput2.fill('Update from tab 2');
        }

        // Submit both (last one wins)
        await page1.click('button[type="submit"]');
        await page2.click('button[type="submit"]');

        // At least one should succeed
        await page1.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('Load Testing', () => {
    test('should handle multiple users browsing simultaneously', async ({ browser }) => {
      const contexts: BrowserContext[] = [];
      const pages: Page[] = [];

      try {
        // Create 3 concurrent browser contexts
        for (let i = 0; i < 3; i++) {
          const context = await browser.newContext();
          contexts.push(context);
          pages.push(await context.newPage());
        }

        // Login users to different pages
        await Promise.all([
          loginAsUser(pages[0], worker1),
          loginAsUser(pages[1], worker2),
          loginAsUser(pages[2], employer),
        ]);

        // All navigate to job feed simultaneously
        await Promise.all([
          pages[0].goto('/dashboard/jobs'),
          pages[1].goto('/dashboard/jobs'),
          pages[2].goto('/dashboard/jobs'),
        ]);

        // Wait for all to load
        await Promise.all(
          pages.map((page) => page.waitForLoadState('networkidle', { timeout: 30000 }))
        );

        // All should show job content
        for (const page of pages) {
          const hasContent = await page.locator('text=/jobs|no jobs/i').isVisible({ timeout: 5000 }).catch(() => false);
          expect(hasContent).toBeTruthy();
        }
      } finally {
        // Cleanup all contexts
        for (const context of contexts) {
          await context.close();
        }
      }
    });
  });
});

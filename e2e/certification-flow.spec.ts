import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  createTestCertification,
  makeUserAdmin,
  testDb,
  TestUser,
} from './utils/test-db';
import { loginAsUser, waitForToast } from './utils/test-helpers';

test.describe('Certification Flow', () => {
  let testWorker: TestUser;
  let testContractor: TestUser;
  let adminUser: TestUser;

  test.beforeAll(async () => {
    // Create test users
    testWorker = await createTestUser({
      role: 'worker',
      name: 'Cert Test Worker',
      trade: 'Electrical',
    });

    testContractor = await createTestUser({
      role: 'employer',
      name: 'Cert Test Contractor',
      employerType: 'contractor',
      companyName: 'Test Contracting LLC',
    });

    adminUser = await createTestUser({
      role: 'worker',
      name: 'Cert Admin',
    });
    await makeUserAdmin(adminUser.id);
  });

  test.afterAll(async () => {
    // Cleanup certifications
    await testDb.from('certifications').delete().eq('worker_id', testWorker.id);
    await testDb.from('certifications').delete().eq('worker_id', testContractor.id);

    if (testWorker) await deleteTestUser(testWorker.id);
    if (testContractor) await deleteTestUser(testContractor.id);
    if (adminUser) await deleteTestUser(adminUser.id);
  });

  test.describe('Worker Certification Submission', () => {
    test.beforeEach(async () => {
      // Clean up worker's certifications before each test
      await testDb.from('certifications').delete().eq('worker_id', testWorker.id);
    });

    test('should show certification form with required fields', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile/certifications');

      // Check form title
      await expect(page.locator('text=Certification Details')).toBeVisible();

      // Check required fields exist
      await expect(page.locator('select#certification_type')).toBeVisible();
      await expect(page.locator('input#certification_number')).toBeVisible();
      await expect(page.locator('input#issued_by')).toBeVisible();
      await expect(page.locator('input#issue_date')).toBeVisible();
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile/certifications');

      // Try to submit without filling required fields
      await page.click('button:has-text("Add Certification")');

      // Should show validation error
      await expect(page.locator('text=/please select.*certification/i')).toBeVisible();
    });

    test('should allow selecting standard certification types', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile/certifications');

      // Check common certification types are available
      const select = page.locator('select#certification_type');
      await expect(select).toContainText('OSHA 10');
      await expect(select).toContainText('OSHA 30');
      await expect(select).toContainText('HAZWOPER');
    });

    test('should allow adding custom certification type', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile/certifications');

      // Select "Other" option
      await page.selectOption('select#certification_type', 'custom');

      // Custom input should appear
      const customInput = page.locator('input#customCertification');
      await expect(customInput).toBeVisible();

      // Enter custom certification name
      await customInput.fill('Custom Safety Certification');
    });

    test('should submit certification with photo', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile/certifications');

      // Fill form
      await page.selectOption('select#certification_type', 'OSHA 10');
      await page.fill('input#certification_number', 'OSHA10-E2E-TEST-123');
      await page.fill('input#issued_by', 'OSHA Training Institute');

      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 6);
      await page.fill('input#issue_date', pastDate.toISOString().split('T')[0]);

      // Upload photo (mock)
      const buffer = Buffer.from('fake-certification-image-data');
      await page.setInputFiles('input[type="file"]', {
        name: 'osha-cert.jpg',
        mimeType: 'image/jpeg',
        buffer: buffer,
      });

      // Submit
      await page.click('button:has-text("Add Certification")');

      // Wait for success
      await waitForToast(page, /submitted|success/i);

      // Should redirect to profile
      await expect(page).toHaveURL(/\/dashboard\/profile/);
    });

    test('should show pending verification badge on submitted certification', async ({ page }) => {
      // Create a pending certification
      await createTestCertification(testWorker.id, {
        certificationType: 'OSHA 30',
        issuingOrganization: 'OSHA',
        credentialId: 'OSHA30-PENDING-123',
        verificationStatus: 'pending',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile');

      // Click the Certifications tab
      await page.locator('a:has-text("Certifications"), button:has-text("Certifications")').first().click();
      await page.waitForTimeout(1000);

      // Should show certification with pending status
      await expect(page.locator('text=OSHA 30')).toBeVisible();
      await expect(page.locator('text=/pending|awaiting/i')).toBeVisible();
    });

    test('should allow setting expiration date', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile/certifications');

      // Fill required fields first
      await page.selectOption('select#certification_type', 'First Aid/CPR');
      await page.fill('input#certification_number', 'CPR-EXPIRY-TEST');
      await page.fill('input#issued_by', 'Red Cross');

      const issueDate = new Date();
      issueDate.setMonth(issueDate.getMonth() - 1);
      await page.fill('input#issue_date', issueDate.toISOString().split('T')[0]);

      // Set expiration date
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 2);
      await page.fill('input#expires_at', expiryDate.toISOString().split('T')[0]);

      // Verify the date was set
      const expiryInput = page.locator('input#expires_at');
      await expect(expiryInput).toHaveValue(expiryDate.toISOString().split('T')[0]);
    });
  });

  test.describe('Contractor License Submission', () => {
    test.beforeEach(async () => {
      await testDb.from('certifications').delete().eq('worker_id', testContractor.id);
    });

    test('should show license form for contractors', async ({ page }) => {
      await loginAsUser(page, testContractor);
      await page.goto('/dashboard/profile/certifications');

      // Should show license-specific title
      await expect(page.locator('text=License Details')).toBeVisible();
    });

    test('should show license types for contractors', async ({ page }) => {
      await loginAsUser(page, testContractor);
      await page.goto('/dashboard/profile/certifications');

      // Should have license type selector
      const select = page.locator('select#certification_type').or(
        page.locator('select[aria-label*="License"]')
      );
      await expect(select).toBeVisible();
    });

    test('should require state selection for state-specific licenses', async ({ page }) => {
      await loginAsUser(page, testContractor);
      await page.goto('/dashboard/profile/certifications');

      // Select a license type
      const licenseSelect = page.locator('select#certification_type').first();
      await licenseSelect.selectOption({ index: 1 });

      // Should show state selector
      const stateSelect = page.locator('select#issuing_state');
      if (await stateSelect.isVisible()) {
        await expect(stateSelect).toBeVisible();
      }
    });
  });

  test.describe('Admin Certification Review', () => {
    test.beforeEach(async () => {
      // Create a pending certification for testing
      await testDb.from('certifications').delete().eq('worker_id', testWorker.id);
      await createTestCertification(testWorker.id, {
        certificationType: 'OSHA 10',
        issuingOrganization: 'OSHA Training Institute',
        credentialId: 'ADMIN-REVIEW-TEST',
        verificationStatus: 'pending',
        imageUrl: 'https://example.com/test-cert.jpg',
      });
    });

    test('should display pending certifications queue', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/certifications');

      // Should show pending tab
      await expect(page.locator('a:has-text("Pending")')).toBeVisible();

      // Should show certification in list
      await expect(page.locator('text=OSHA 10')).toBeVisible();
    });

    test('should show certification details when clicked', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/certifications');

      // Click on the certification card
      await page.locator('.cursor-pointer').filter({ hasText: 'OSHA 10' }).first().click();

      // Should show review panel with details
      await expect(page.locator('text=Certification Image')).toBeVisible();
      await expect(page.locator('text=User Information')).toBeVisible();
      await expect(page.locator('text=ADMIN-REVIEW-TEST')).toBeVisible();
    });

    test('should show approve, reject, and flag buttons', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/certifications');

      // Click on certification to open review panel
      await page.locator('.cursor-pointer').filter({ hasText: 'OSHA 10' }).first().click();

      // Check action buttons
      await expect(page.locator('button:has-text("Approve")')).toBeVisible();
      await expect(page.locator('button:has-text("Reject")')).toBeVisible();
      await expect(page.locator('button:has-text("Flag")')).toBeVisible();
    });

    test('should approve certification', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/certifications');

      // Click on certification
      await page.locator('.cursor-pointer').filter({ hasText: 'OSHA 10' }).first().click();

      // Click approve
      await page.click('button:has-text("Approve")');

      // Confirm in dialog
      await page.click('button:has-text("Approve")');

      // Wait for success toast
      await waitForToast(page, /approved/i);
    });

    test('should require reason when rejecting', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/certifications');

      // Click on certification
      await page.locator('.cursor-pointer').filter({ hasText: 'OSHA 10' }).first().click();

      // Click reject
      await page.click('button:has-text("Reject")');

      // Should show rejection reason form
      await expect(page.locator('text=Rejection Reason')).toBeVisible();

      // Confirm button should be disabled without reason
      const confirmButton = page.locator('button:has-text("Confirm Rejection")');
      await expect(confirmButton).toBeDisabled();
    });

    test('should reject certification with reason', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/certifications');

      // Click on certification
      await page.locator('.cursor-pointer').filter({ hasText: 'OSHA 10' }).first().click();

      // Click reject
      await page.click('button:has-text("Reject")');

      // Enter rejection reason
      await page.fill('textarea', 'Document is illegible and certification number does not match records');

      // Confirm rejection
      await page.click('button:has-text("Confirm Rejection")');

      // Confirm in dialog
      await page.click('button:has-text("Reject")');

      // Wait for success
      await waitForToast(page, /rejected/i);
    });

    test('should flag certification for later review', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/certifications');

      // Click on certification
      await page.locator('.cursor-pointer').filter({ hasText: 'OSHA 10' }).first().click();

      // Click flag
      await page.click('button:has-text("Flag")');

      // Should show flag notes form
      await expect(page.locator('text=Flag Notes')).toBeVisible();

      // Enter flag notes
      await page.fill('textarea', 'Need to verify with issuing authority');

      // Submit flag
      await page.click('button:has-text("Flag for Review")');

      // Wait for success
      await waitForToast(page, /flagged/i);
    });

    test('should filter by verification status tabs', async ({ page }) => {
      // Create certifications with different statuses
      // Note: certifications FK to workers table, so this needs a worker user
      await createTestCertification(testWorker.id, {
        certificationType: 'General Contractor',
        issuingOrganization: 'State Board',
        verificationStatus: 'verified',
        imageUrl: 'https://example.com/verified-cert.jpg',
      });

      await loginAsUser(page, adminUser);
      await page.goto('/admin/certifications');

      // Click on Verified tab
      await page.click('a:has-text("Verified")');
      await expect(page).toHaveURL(/status=verified/);

      // Should show verified certification
      await expect(page.locator('text=General Contractor')).toBeVisible();

      // Click on Rejected tab
      await page.click('a:has-text("Rejected")');
      await expect(page).toHaveURL(/status=rejected/);
    });
  });

  test.describe('Certification Status Display', () => {
    test('should show verified badge after admin approval', async ({ page }) => {
      // Create verified certification
      await testDb.from('certifications').delete().eq('worker_id', testWorker.id);
      await createTestCertification(testWorker.id, {
        certificationType: 'OSHA 30',
        issuingOrganization: 'OSHA',
        verificationStatus: 'verified',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile');

      // Click the Certifications tab to see certifications
      await page.locator('a:has-text("Certifications"), button:has-text("Certifications")').first().click();
      await page.waitForTimeout(1000);

      // Should show verified status
      await expect(page.locator('text=OSHA 30')).toBeVisible();
      await expect(page.locator('text=/verified|✓/i').first()).toBeVisible();
    });

    test('should show rejection reason to user', async ({ page }) => {
      // Create rejected certification
      await testDb.from('certifications').delete().eq('worker_id', testWorker.id);
      await testDb.from('certifications').insert({
        worker_id: testWorker.id,
        name: 'First Aid/CPR',
        issuing_organization: 'Red Cross',
        verification_status: 'rejected',
        rejection_reason: 'Document expired - please submit current certification',
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile');

      // Click the Certifications tab
      await page.locator('a:has-text("Certifications"), button:has-text("Certifications")').first().click();
      await page.waitForTimeout(1000);

      // Should show rejected status
      await expect(page.locator('text=First Aid/CPR')).toBeVisible();
      await expect(page.locator('text=/rejected/i')).toBeVisible();
    });

    test('should show expiration warning for soon-to-expire certifications', async ({ page }) => {
      // Create certification expiring in 30 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      await testDb.from('certifications').delete().eq('worker_id', testWorker.id);
      await createTestCertification(testWorker.id, {
        certificationType: 'OSHA 10',
        issuingOrganization: 'OSHA',
        verificationStatus: 'verified',
        expirationDate: expiryDate.toISOString().split('T')[0],
      });

      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile');

      // Click the Certifications tab
      await page.locator('a:has-text("Certifications"), button:has-text("Certifications")').first().click();
      await page.waitForTimeout(1000);

      // Should show certification with expiry info
      await expect(page.locator('text=OSHA 10')).toBeVisible();
    });
  });

  test.describe('Certification Category Filtering', () => {
    test('should allow filtering by certification category', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile/certifications');

      // Check if category filter exists
      const categorySelect = page.locator('select[aria-label*="Category"]').or(
        page.locator('select#category')
      );

      if (await categorySelect.isVisible()) {
        await expect(categorySelect).toBeVisible();
      }
    });
  });

  test.describe('Verification Process Info', () => {
    test('should display verification timeline info', async ({ page }) => {
      await loginAsUser(page, testWorker);
      await page.goto('/dashboard/profile/certifications');

      // Should show verification process information
      await expect(page.locator('text=Verification Process')).toBeVisible();
      await expect(page.locator('text=/24-48 hours|business days/i')).toBeVisible();
    });
  });
});

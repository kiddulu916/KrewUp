import { test, expect } from '@playwright/test';

test.describe('Landing Page Mobile Responsiveness - iPhone 13 Pro', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 13 Pro dimensions
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('Navigation is responsive on mobile', async ({ page }) => {
    // Check navigation bar exists and is visible
    const nav = page.locator('nav[aria-label="Main site navigation"]');
    await expect(nav).toBeVisible();

    // Check logo is visible
    const logo = page.locator('nav img[alt="KrewUp"]');
    await expect(logo).toBeVisible();

    // Check that navigation doesn't cause horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 390;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // Allow 5px tolerance
  });

  test('Hero section is readable and CTA buttons are accessible', async ({ page }) => {
    // Check hero heading is visible
    const heading = page.locator('h1').filter({ hasText: 'Where Skilled Workers Meet Great Jobs' });
    await expect(heading).toBeVisible();

    // Check hero description is visible
    const description = page.locator('text=The premier platform connecting trade professionals with employers');
    await expect(description).toBeVisible();

    // Check CTA buttons are visible and accessible
    const ctaButtons = page.locator('section').first().locator('a >> button');
    const ctaCount = await ctaButtons.count();
    expect(ctaCount).toBeGreaterThanOrEqual(1);

    // Verify first CTA button is visible and has proper touch target size
    const firstCta = ctaButtons.first();
    await expect(firstCta).toBeVisible();

    const buttonBox = await firstCta.boundingBox();
    if (buttonBox) {
      // Touch targets should be at least 44x44 pixels per accessibility guidelines
      expect(buttonBox.height).toBeGreaterThanOrEqual(44);
      expect(buttonBox.width).toBeGreaterThanOrEqual(100); // CTAs should be wide enough
    }
  });

  test('All sections render correctly without overflow', async ({ page }) => {
    // Check no horizontal scroll on the page
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // Check all major sections are present and visible
    const sections = [
      'Where Skilled Workers Meet Great Jobs', // Hero
      'Everything You Need to Succeed', // Features
      'How It Works', // Process
      'Trusted by Trade Professionals', // Testimonials
      'Simple, Transparent Pricing', // Pricing
      'Ready to Build Your Future', // CTA
    ];

    for (const sectionText of sections) {
      const section = page.locator(`text=${sectionText}`);
      await expect(section).toBeVisible({ timeout: 5000 });
    }
  });

  test('Features section displays correctly', async ({ page }) => {
    // Scroll to features section
    await page.locator('text=Everything You Need to Succeed').scrollIntoViewIfNeeded();

    // Check that all 6 features are rendered
    const features = [
      'Location-Based Matching',
      'Verified Credentials',
      'Direct Messaging',
      'Portfolio Showcase',
      'Career Growth',
      'Instant Alerts',
    ];

    for (const feature of features) {
      const featureCard = page.locator(`text=${feature}`);
      await expect(featureCard).toBeVisible();
    }
  });

  test('Pricing section is readable on mobile', async ({ page }) => {
    // Scroll to pricing section
    await page.locator('text=Simple, Transparent Pricing').scrollIntoViewIfNeeded();

    // Check both pricing cards are visible
    await expect(page.locator('text=Free >> visible=true').first()).toBeVisible();
    await expect(page.locator('text=Pro >> visible=true').first()).toBeVisible();

    // Check pricing is readable
    await expect(page.locator('text=$0')).toBeVisible();
    await expect(page.locator('text=$29')).toBeVisible();

    // Check CTA buttons in pricing cards
    const pricingButtons = page.locator('section:has-text("Simple, Transparent Pricing") button');
    const buttonCount = await pricingButtons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(2);
  });

  test('Testimonials render correctly', async ({ page }) => {
    // Scroll to testimonials
    await page.locator('text=Trusted by Trade Professionals').scrollIntoViewIfNeeded();

    // Check at least one testimonial is visible (on mobile they might stack)
    const testimonials = page.locator('.text-slate-700:has-text("KrewUp")');
    await expect(testimonials.first()).toBeVisible();
  });

  test('Touch targets are appropriately sized', async ({ page }) => {
    // Check navigation buttons
    const navButtons = page.locator('nav button, nav a:has(button)');
    const navButtonCount = await navButtons.count();

    for (let i = 0; i < Math.min(navButtonCount, 3); i++) {
      const button = navButtons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Minimum touch target size: 44x44 pixels (WCAG AAA)
          expect(box.height).toBeGreaterThanOrEqual(40); // Allow small tolerance
        }
      }
    }

    // Check hero CTA buttons
    const heroCtas = page.locator('section').first().locator('button');
    const heroCtaCount = await heroCtas.count();

    for (let i = 0; i < heroCtaCount; i++) {
      const button = heroCtas.nth(i);
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('No horizontal scroll throughout the page', async ({ page }) => {
    // Get all sections and check for overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // Allow 2px tolerance for rounding

    // Scroll through the page and check at different positions
    await page.evaluate(() => window.scrollTo(0, 500));
    let hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow).toBe(false);

    await page.evaluate(() => window.scrollTo(0, 1500));
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow).toBe(false);

    await page.evaluate(() => window.scrollTo(0, 3000));
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow).toBe(false);
  });

  test('Stats section displays correctly', async ({ page }) => {
    // Check stats are visible
    const stats = ['10K+', '5K+', '1K+', '95%'];

    for (const stat of stats) {
      await expect(page.locator(`text=${stat}`)).toBeVisible();
    }
  });

  test('Footer is accessible and readable', async ({ page }) => {
    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded();

    // Check footer sections
    await expect(page.locator('footer text=Platform')).toBeVisible();
    await expect(page.locator('footer text=Legal')).toBeVisible();
    await expect(page.locator('footer text=Contact')).toBeVisible();

    // Check footer links are tappable
    const footerLinks = page.locator('footer a');
    const firstLink = footerLinks.first();
    const box = await firstLink.boundingBox();
    if (box) {
      // Footer links should have adequate touch targets
      expect(box.height).toBeGreaterThanOrEqual(30);
    }
  });
});

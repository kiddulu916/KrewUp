/**
 * Test endpoint for verifying Sentry PII sanitization
 *
 * This endpoint triggers various logging scenarios to verify that:
 * 1. User IDs are hashed before being sent to Sentry
 * 2. Emails are hashed (local part) but domain preserved
 * 3. beforeSend hooks properly sanitize all data
 * 4. sendDefaultPii: false prevents automatic PII collection
 *
 * USAGE:
 * 1. Start dev server: npm run dev
 * 2. Visit: http://localhost:3000/api/test-sentry-sanitization
 * 3. Check Sentry dashboard for events with sanitized data
 *
 * EXPECTED SENTRY OUTPUT:
 * - User IDs should appear as "hash:abc123..." (12 char hash prefix)
 * - Emails should appear as "hash:def456...@example.com"
 * - No plain text UUIDs or full emails should be visible
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { logger, sanitizeUserId, sanitizeEmail } from '@/lib/utils/logger';

export async function GET() {
  try {
    // Test user data (simulated - not real PII)
    const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Example UUID
    const testEmail = 'testuser@example.com';
    const testCustomerId = 'cus_test123456789';

    // === Test 1: Logger with automatic sanitization ===
    logger.info('Test 1: Logger with metadata sanitization', {
      userId: testUserId,
      email: testEmail,
      customerId: testCustomerId,
      action: 'test_sanitization',
    });

    // === Test 2: Manual sanitization in log message ===
    logger.info('Test 2: Manual sanitization', {
      sanitizedUserId: sanitizeUserId(testUserId),
      sanitizedEmail: sanitizeEmail(testEmail),
      action: 'manual_sanitization_test',
    });

    // === Test 3: Sentry user context (should be sanitized by beforeSend) ===
    Sentry.setUser({
      id: testUserId,
      email: testEmail,
    });

    // === Test 4: Capture exception with user context ===
    try {
      throw new Error('Test error for Sentry sanitization verification');
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          userId: testUserId,
          email: testEmail,
          customerId: testCustomerId,
          testType: 'sanitization_verification',
        },
      });
    }

    // === Test 5: Breadcrumb with user data ===
    Sentry.addBreadcrumb({
      category: 'test',
      message: 'User action test',
      level: 'info',
      data: {
        userId: testUserId,
        email: testEmail,
        action: 'test_breadcrumb',
      },
    });

    // === Test 6: Nested metadata sanitization ===
    logger.error('Test 6: Nested metadata', {
      user: {
        id: testUserId,
        email: testEmail,
        profile: {
          userId: testUserId,
        },
      },
      subscription: {
        customerId: testCustomerId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Sentry sanitization tests triggered',
      instructions: [
        '✅ Test events have been sent to Sentry',
        '',
        '📋 VERIFICATION STEPS:',
        '1. Open Sentry dashboard: https://sentry.io/',
        '2. Go to Issues or Events',
        '3. Find events from the last few minutes',
        '4. Check the following:',
        '',
        '✓ User IDs should appear as: hash:abc123... (NOT raw UUIDs)',
        '✓ Emails should appear as: hash:def456...@example.com',
        '✓ Customer IDs should appear as: hash:xyz789...',
        '✓ All metadata fields with "userId", "email", "customerId" should be hashed',
        '✓ No plain text: 550e8400-e29b-41d4-a716-446655440000',
        '✓ No plain text: testuser@example.com',
        '✓ No plain text: cus_test123456789',
        '',
        '⚠️  If you see plain text values, the sanitization is NOT working!',
      ],
      testData: {
        originalUserId: testUserId,
        originalEmail: testEmail,
        originalCustomerId: testCustomerId,
        expectedSanitizedUserId: sanitizeUserId(testUserId),
        expectedSanitizedEmail: sanitizeEmail(testEmail),
        expectedSanitizedCustomerId: sanitizeUserId(testCustomerId),
      },
    }, { status: 200 });

  } catch (error) {
    // Capture any errors during testing
    Sentry.captureException(error);

    return NextResponse.json({
      success: false,
      error: 'Failed to run sanitization tests',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

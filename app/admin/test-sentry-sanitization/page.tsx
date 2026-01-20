'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { logger, sanitizeUserId } from '@/lib/utils/logger';

export default function TestSentrySanitizationPage() {
  const [testUserId] = useState('test-user-uuid-12345');
  const [testEmail] = useState('testuser@example.com');
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testLoggerWithUserId = () => {
    // This should appear in Sentry with a HASHED user ID
    logger.info('Test: Logger with user context', {
      userId: sanitizeUserId(testUserId),
      action: 'test_action',
      timestamp: new Date().toISOString(),
    });
    addResult(`✅ Sent logger.info with sanitized userId: ${sanitizeUserId(testUserId)}`);
  };

  const testSentryError = () => {
    // This should capture an error with user context sanitized by beforeSend hook
    Sentry.withScope((scope) => {
      scope.setUser({
        id: testUserId, // Will be sanitized by beforeSend hook
        email: testEmail, // Will be sanitized by beforeSend hook
      });
      scope.setContext('test_context', {
        userId: testUserId, // Will be sanitized by beforeSend hook
        customerId: 'stripe-customer-123', // Will be sanitized by beforeSend hook
        action: 'manual_test',
      });
      Sentry.captureException(new Error('Test error for sanitization verification'));
    });
    addResult('✅ Sent test error to Sentry with user context (will be sanitized by beforeSend)');
  };

  const testLoggerError = () => {
    // This should appear in Sentry with sanitized data
    logger.error('Test: Error with sensitive data', {
      userId: testUserId, // Will be sanitized by sanitizeMetadata
      email: testEmail, // Will be sanitized by sanitizeMetadata
      customerId: 'cus_test123', // Will be sanitized by sanitizeMetadata
      errorMessage: 'This is a test error',
    });
    addResult('✅ Sent logger.error with sensitive data (will be sanitized automatically)');
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Sentry Sanitization Verification</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">ℹ️ Test Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click the test buttons below to send events to Sentry</li>
          <li>Open your Sentry dashboard at <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">sentry.io</a></li>
          <li>Navigate to Issues or Events to see the captured data</li>
          <li>Verify the following sanitization is working:</li>
          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
            <li>User IDs should be hashed (format: <code className="bg-gray-100 px-1">hash:abc123...</code>)</li>
            <li>Emails should have hashed local part (format: <code className="bg-gray-100 px-1">hash:abc123...@example.com</code>)</li>
            <li>Customer IDs should be hashed (format: <code className="bg-gray-100 px-1">hash:abc123...</code>)</li>
            <li>No plain-text user IDs or emails should appear</li>
          </ul>
        </ol>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">Test Data</h2>
        <div className="space-y-2 text-sm font-mono">
          <div>
            <span className="font-bold">User ID:</span> {testUserId}
          </div>
          <div>
            <span className="font-bold">Email:</span> {testEmail}
          </div>
          <div>
            <span className="font-bold">Sanitized User ID:</span> <span className="text-green-600">{sanitizeUserId(testUserId)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <h2 className="text-xl font-semibold">Test Actions</h2>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={testLoggerWithUserId}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Test 1: Logger with User Context
          </button>

          <button
            onClick={testSentryError}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Test 2: Sentry Error with User Context
          </button>

          <button
            onClick={testLoggerError}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Test 3: Logger Error with Sensitive Data
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Test Results</h2>
          {results.length > 0 && (
            <button
              onClick={clearResults}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No tests run yet. Click a test button above.</p>
        ) : (
          <ul className="space-y-2 text-sm font-mono">
            {results.map((result, index) => (
              <li key={index} className="text-gray-700">{result}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold mb-3">⚠️ What to Check in Sentry</h2>
        <div className="space-y-3 text-sm">
          <div>
            <strong className="block mb-1">✅ GOOD - Sanitized Data:</strong>
            <code className="block bg-white p-2 rounded border">
              user.id: "hash:e3b0c44298fc"<br/>
              email: "hash:a1b2c3d4e5f6@example.com"<br/>
              userId: "hash:e3b0c44298fc"
            </code>
          </div>
          <div>
            <strong className="block mb-1">❌ BAD - Plain Text (should NOT appear):</strong>
            <code className="block bg-white p-2 rounded border">
              user.id: "test-user-uuid-12345"<br/>
              email: "testuser@example.com"<br/>
              userId: "test-user-uuid-12345"
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

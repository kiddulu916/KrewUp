'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui';

export function ContractorVerificationBanner() {
  return (
    <Card className="border-yellow-300 bg-yellow-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <span className="text-4xl">⏳</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-yellow-900 mb-3">
              Contractor License Pending Verification
            </h3>
            <div className="space-y-2 text-sm text-yellow-800">
              <p>
                <strong>Your contractor license is currently being reviewed by our team.</strong>
              </p>
              <p>
                You'll be able to post jobs once your license is verified, which usually takes
                <strong> 24-48 hours</strong>.
              </p>
              <p>
                We'll send you an email notification as soon as verification is complete.
                Thank you for your patience!
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-yellow-300">
              <p className="text-xs text-yellow-700">
                <strong>Need help?</strong> Contact support if you haven't heard back within 48 hours.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

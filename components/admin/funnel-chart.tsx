'use client';

import React from 'react';
import type { ConversionFunnelStage } from '@/features/admin/actions/analytics-actions';

type Props = {
  stages: ConversionFunnelStage[];
};

export function FunnelChart({ stages }: Props) {
  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <div key={stage.stage} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">{stage.stage}</h4>
              <p className="text-sm text-gray-600">
                {stage.count} users ({stage.percentage.toFixed(1)}%)
              </p>
            </div>
            {stage.dropOffRate !== null && (
              <div className="text-right">
                <p className="text-sm text-red-600 font-medium">
                  {stage.dropOffRate.toFixed(1)}% drop-off
                </p>
              </div>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8">
            <div
              className="bg-blue-600 h-8 rounded-full flex items-center justify-end px-3 text-white text-sm font-medium"
              style={{ width: `${stage.percentage}%` }}
            >
              {stage.percentage > 10 ? `${stage.percentage.toFixed(0)}%` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

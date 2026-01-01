'use client';

import React from 'react';

export type DateRangePreset = 'last7days' | 'last30days' | 'last90days' | 'custom';

export type DateRangeValue = {
  preset: DateRangePreset;
  startDate?: Date;
  endDate?: Date;
  compareEnabled?: boolean;
};

type Props = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
};

const PRESET_LABELS: Record<DateRangePreset, string> = {
  last7days: 'Last 7 days',
  last30days: 'Last 30 days',
  last90days: 'Last 90 days',
  custom: 'Custom range',
};

export function DateRangePicker({ value, onChange }: Props) {
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as DateRangePreset;
    const today = new Date();
    const startDate = new Date();

    switch (preset) {
      case 'last7days':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'last30days':
        startDate.setDate(today.getDate() - 30);
        break;
      case 'last90days':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'custom':
        // Keep current dates
        onChange({ ...value, preset });
        return;
    }

    onChange({
      preset,
      startDate,
      endDate: today,
      compareEnabled: value.compareEnabled,
    });
  };

  return (
    <div className="flex gap-4 items-center">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date Range
        </label>
        <select
          value={value.preset}
          onChange={handlePresetChange}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Object.entries(PRESET_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {value.preset === 'custom' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={value.startDate?.toISOString().split('T')[0] || ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  startDate: new Date(e.target.value),
                })
              }
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={value.endDate?.toISOString().split('T')[0] || ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  endDate: new Date(e.target.value),
                })
              }
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      <div className="flex items-center mt-6">
        <input
          type="checkbox"
          id="compare-enabled"
          checked={value.compareEnabled || false}
          onChange={(e) =>
            onChange({ ...value, compareEnabled: e.target.checked })
          }
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="compare-enabled"
          className="ml-2 text-sm text-gray-700"
        >
          Compare to previous period
        </label>
      </div>
    </div>
  );
}

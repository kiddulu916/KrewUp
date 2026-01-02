'use client';

import React from 'react';

type Props = {
  value: number;
  isPositive?: boolean; // Undefined means neutral
};

export function TrendIndicator({ value, isPositive }: Props) {
  const isNeutral = isPositive === undefined;
  const color = isNeutral
    ? 'text-gray-600'
    : isPositive
    ? 'text-green-600'
    : 'text-red-600';

  const arrow = isNeutral ? '' : isPositive ? '↑' : '↓';

  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
}
